'use strict';

const Project = require('./project.model');
const { STATUS_TRANSITIONS } = require('./project.model');
const { cache } = require('../../config/redis');
const ApiError = require('../../utils/ApiError');

// ─── Cache Key Builders ───────────────────────────────────────────────────────
const cacheKeys = {
  userProjects: (userId) => `projects:user:${userId}`,
  projectDetail: (projectId) => `project:${projectId}`,
};

// ─── Access Helpers ───────────────────────────────────────────────────────────

/**
 * Returns the member entry for callerId within a project, or null if not a member.
 * Checks owner separately since owner may not always be in members array.
 */
const resolveUserId = (userRef) => {
  if (!userRef) return null;
  if (typeof userRef === 'string') return userRef;
  if (userRef._id) return userRef._id.toString();
  if (typeof userRef.toString === 'function') return userRef.toString();
  return null;
};

const getCallerMembership = (project, callerId) => {
  const ownerId = resolveUserId(project.owner);
  if (ownerId === callerId) {
    return { role: 'owner' };
  }
  return project.members.find((m) => resolveUserId(m.user) === callerId) ?? null;
};

const assertMembership = (project, callerId) => {
  const membership = getCallerMembership(project, callerId);
  if (!membership) throw ApiError.forbidden('You are not a member of this project');
  return membership;
};

const assertOwnerOrAdmin = (project, callerId, callerRole) => {
  const isOwner = project.owner.toString() === callerId;
  const isAdmin = callerRole === 'admin';
  if (!isOwner && !isAdmin) throw ApiError.forbidden('Only the project owner or an admin can do this');
};

// ─── Service ──────────────────────────────────────────────────────────────────

const createProject = async (callerId, payload) => {
  const project = await Project.create({
    ...payload,
    owner: callerId,
    members: [{ user: callerId, role: 'owner' }],
  });

  // Invalidate the caller's project list cache
  await cache.del(cacheKeys.userProjects(callerId));

  return project.populate('owner', 'name email');
};

const getMyProjects = async (callerId) => {
  const cacheKey = cacheKeys.userProjects(callerId);
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const projects = await Project.find({
    $or: [{ owner: callerId }, { 'members.user': callerId }],
  })
    .populate('owner', 'name email')
    .sort({ updatedAt: -1 });

  await cache.set(cacheKey, projects);
  return projects;
};

const getProjectById = async (projectId, callerId) => {
  const cacheKey = cacheKeys.projectDetail(projectId);
  let project = await cache.get(cacheKey);

  if (!project) {
    project = await Project.findById(projectId)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    if (!project) throw ApiError.notFound('Project');
    await cache.set(cacheKey, project);
  }

  // Aparna: Access check happens after cache retrieval — membership is validated
  // per-request regardless of whether the data came from cache or DB.
  assertMembership(project, callerId);
  return project;
};

const updateProject = async (projectId, callerId, callerRole, payload) => {
  const project = await Project.findById(projectId);
  if (!project) throw ApiError.notFound('Project');

  const membership = assertMembership(project, callerId);

  // Aparna: Viewers can read but not write — editors and owners can update
  if (membership.role === 'viewer' && callerRole !== 'admin') {
    throw ApiError.forbidden('Viewers cannot edit project details');
  }

  const updated = await Project.findByIdAndUpdate(
    projectId,
    { $set: payload },
    { new: true, runValidators: true }
  ).populate('owner', 'name email').populate('members.user', 'name email');

  await cache.del(cacheKeys.projectDetail(projectId), cacheKeys.userProjects(callerId));
  return updated;
};

const deleteProject = async (projectId, callerId, callerRole) => {
  const project = await Project.findById(projectId);
  if (!project) throw ApiError.notFound('Project');

  assertOwnerOrAdmin(project, callerId, callerRole);

  await project.deleteOne();

  // Invalidate all cached views of this project
  await cache.del(
    cacheKeys.projectDetail(projectId),
    cacheKeys.userProjects(callerId)
  );
};

const transitionProjectStatus = async (projectId, callerId, callerRole, newStatus) => {
  const project = await Project.findById(projectId);
  if (!project) throw ApiError.notFound('Project');

  const membership = assertMembership(project, callerId);
  if (membership.role === 'viewer' && callerRole !== 'admin') {
    throw ApiError.forbidden('Viewers cannot change project status');
  }

  const allowedNextStatuses = STATUS_TRANSITIONS[project.status];
  if (!allowedNextStatuses.includes(newStatus)) {
    throw ApiError.badRequest(
      `Cannot transition from "${project.status}" to "${newStatus}". ` +
      `Allowed: [${allowedNextStatuses.join(', ') || 'none — terminal state'}]`
    );
  }

  project.status = newStatus;
  await project.save();

  await cache.del(cacheKeys.projectDetail(projectId), cacheKeys.userProjects(callerId));
  return project;
};

const addMember = async (projectId, callerId, { email, role }) => {
  const project = await Project.findById(projectId);
  if (!project) throw ApiError.notFound('Project');

  assertOwnerOrAdmin(project, callerId, 'user'); // Aparna: Only owner can manage members — no admin bypass here

  const User = require('../users/user.model');
  const user = await User.findOne({ email });
  if (!user) throw ApiError.notFound('User not found with that email');
  const userId = user._id.toString();

  if (project.owner.toString() === userId) {
    throw ApiError.conflict('Project owner is already a member');
  }

  const alreadyMember = project.members.some((m) => m.user.toString() === userId);
  if (alreadyMember) throw ApiError.conflict('User is already a project member');

  project.members.push({ user: userId, role });
  await project.save();

  await cache.del(cacheKeys.projectDetail(projectId));
  return project.populate('members.user', 'name email');
};

const removeMember = async (projectId, callerId, targetUserId) => {
  const project = await Project.findById(projectId);
  if (!project) throw ApiError.notFound('Project');

  assertOwnerOrAdmin(project, callerId, 'user');

  if (project.owner.toString() === targetUserId) {
    throw ApiError.badRequest('Cannot remove the project owner');
  }

  const memberIndex = project.members.findIndex((m) => m.user.toString() === targetUserId);
  if (memberIndex === -1) throw ApiError.notFound('Member');

  project.members.splice(memberIndex, 1);
  await project.save();

  await cache.del(cacheKeys.projectDetail(projectId));
  return project;
};

module.exports = {
  createProject,
  getMyProjects,
  getProjectById,
  updateProject,
  deleteProject,
  transitionProjectStatus,
  addMember,
  removeMember,
};
