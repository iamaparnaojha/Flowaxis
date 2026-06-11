'use strict';

const projectService = require('./project.service');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const createProject = asyncHandler(async (req, res) => {
  const project = await projectService.createProject(req.caller.id, req.body);
  return ApiResponse.created(res, { project }, 'Project created');
});

const getMyProjects = asyncHandler(async (req, res) => {
  const projects = await projectService.getMyProjects(req.caller.id);
  return ApiResponse.success(res, { projects, count: projects.length });
});

const getProjectById = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectById(req.params.id, req.caller.id);
  return ApiResponse.success(res, { project });
});

const updateProject = asyncHandler(async (req, res) => {
  const project = await projectService.updateProject(
    req.params.id,
    req.caller.id,
    req.caller.role,
    req.body
  );
  return ApiResponse.success(res, { project }, 'Project updated');
});

const deleteProject = asyncHandler(async (req, res) => {
  await projectService.deleteProject(req.params.id, req.caller.id, req.caller.role);
  return ApiResponse.noContent(res);
});

const transitionStatus = asyncHandler(async (req, res) => {
  const project = await projectService.transitionProjectStatus(
    req.params.id,
    req.caller.id,
    req.caller.role,
    req.body.status
  );
  return ApiResponse.success(res, { project }, `Status changed to "${project.status}"`);
});

const addMember = asyncHandler(async (req, res) => {
  const project = await projectService.addMember(req.params.id, req.caller.id, req.body);
  return ApiResponse.success(res, { project }, 'Member added');
});

const removeMember = asyncHandler(async (req, res) => {
  await projectService.removeMember(req.params.id, req.caller.id, req.params.userId);
  return ApiResponse.noContent(res);
});

module.exports = {
  createProject,
  getMyProjects,
  getProjectById,
  updateProject,
  deleteProject,
  transitionStatus,
  addMember,
  removeMember,
};
