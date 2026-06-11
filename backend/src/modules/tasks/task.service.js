'use strict';

const Task = require('./task.model');
const { TASK_STATUS_TRANSITIONS } = require('./task.model');
const Project = require('../projects/project.model');
const { cache } = require('../../config/redis');
const ApiError = require('../../utils/ApiError');

const cacheKeys = {
  projectTasks: (projectId) => `tasks:project:${projectId}`,
};

// ─── Access Guard ─────────────────────────────────────────────────────────────

const assertProjectMembership = async (projectId, callerId) => {
  const project = await Project.findById(projectId).lean();
  if (!project) throw ApiError.notFound('Project');

  const isOwner = project.owner.toString() === callerId;
  const isMember = project.members.some((m) => m.user.toString() === callerId);

  if (!isOwner && !isMember) {
    throw ApiError.forbidden('You are not a member of this project');
  }

  return project;
};

// ─── Service ──────────────────────────────────────────────────────────────────

const createTask = async (projectId, callerId, payload) => {
  await assertProjectMembership(projectId, callerId);

  const task = await Task.create({
    ...payload,
    project: projectId,
    reporter: callerId,
  });

  await cache.del(cacheKeys.projectTasks(projectId));

  return task.populate([
    { path: 'assignee', select: 'name email' },
    { path: 'reporter', select: 'name email' },
  ]);
};

const getProjectTasks = async (projectId, callerId, filters = {}) => {
  await assertProjectMembership(projectId, callerId);

  const cacheKey = cacheKeys.projectTasks(projectId);
  const cached = await cache.get(cacheKey);
  if (cached && !Object.keys(filters).length) return cached;

  const query = { project: projectId };
  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.assignee) query.assignee = filters.assignee;

  const tasks = await Task.find(query)
    .populate('assignee', 'name email')
    .populate('reporter', 'name email')
    .sort({ createdAt: -1 });

  // Aparna: Only cache unfiltered requests — filtered results are too specific
  // to be useful across callers and would bloat Redis unnecessarily.
  if (!Object.keys(filters).length) {
    await cache.set(cacheKey, tasks);
  }

  return tasks;
};

const getTaskById = async (projectId, taskId, callerId) => {
  await assertProjectMembership(projectId, callerId);

  const task = await Task.findOne({ _id: taskId, project: projectId })
    .populate('assignee', 'name email')
    .populate('reporter', 'name email');

  if (!task) throw ApiError.notFound('Task');
  return task;
};

const updateTask = async (projectId, taskId, callerId, callerRole, payload) => {
  const project = await assertProjectMembership(projectId, callerId);

  const task = await Task.findOne({ _id: taskId, project: projectId });
  if (!task) throw ApiError.notFound('Task');

  const isOwner = project.owner.toString() === callerId;
  const isAssignee = task.assignee?.toString() === callerId;
  const isAdmin = callerRole === 'admin';

  // Aparna: Only assignee, project owner, or admin can update task details
  if (!isOwner && !isAssignee && !isAdmin) {
    throw ApiError.forbidden('Only the assignee, project owner, or an admin can update this task');
  }

  Object.assign(task, payload);
  await task.save();

  await cache.del(cacheKeys.projectTasks(projectId));
  return task.populate([
    { path: 'assignee', select: 'name email' },
    { path: 'reporter', select: 'name email' },
  ]);
};

const transitionTaskStatus = async (projectId, taskId, callerId, callerRole, newStatus) => {
  const project = await assertProjectMembership(projectId, callerId);

  const task = await Task.findOne({ _id: taskId, project: projectId });
  if (!task) throw ApiError.notFound('Task');

  const allowedNext = TASK_STATUS_TRANSITIONS[task.status];
  if (!allowedNext.includes(newStatus)) {
    throw ApiError.badRequest(
      `Cannot transition task from "${task.status}" to "${newStatus}". ` +
      `Allowed: [${allowedNext.join(', ') || 'none — terminal state'}]`
    );
  }

  task.status = newStatus;
  await task.save();

  await cache.del(cacheKeys.projectTasks(projectId));
  return task;
};

const deleteTask = async (projectId, taskId, callerId, callerRole) => {
  const project = await assertProjectMembership(projectId, callerId);

  const task = await Task.findOne({ _id: taskId, project: projectId });
  if (!task) throw ApiError.notFound('Task');

  const isOwner = project.owner.toString() === callerId;
  const isAdmin = callerRole === 'admin';

  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden('Only the project owner or an admin can delete tasks');
  }

  await task.deleteOne();
  await cache.del(cacheKeys.projectTasks(projectId));
};

module.exports = {
  createTask,
  getProjectTasks,
  getTaskById,
  updateTask,
  transitionTaskStatus,
  deleteTask,
};
