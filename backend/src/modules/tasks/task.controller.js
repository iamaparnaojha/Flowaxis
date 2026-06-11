'use strict';

const taskService = require('./task.service');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const createTask = asyncHandler(async (req, res) => {
  const task = await taskService.createTask(req.params.projectId, req.caller.id, req.body);
  return ApiResponse.created(res, { task }, 'Task created');
});

const getProjectTasks = asyncHandler(async (req, res) => {
  const { status, priority, assignee } = req.query;
  const filters = {};
  if (status) filters.status = status;
  if (priority) filters.priority = priority;
  if (assignee) filters.assignee = assignee;

  const tasks = await taskService.getProjectTasks(req.params.projectId, req.caller.id, filters);
  return ApiResponse.success(res, { tasks, count: tasks.length });
});

const getTaskById = asyncHandler(async (req, res) => {
  const task = await taskService.getTaskById(
    req.params.projectId,
    req.params.taskId,
    req.caller.id
  );
  return ApiResponse.success(res, { task });
});

const updateTask = asyncHandler(async (req, res) => {
  const task = await taskService.updateTask(
    req.params.projectId,
    req.params.taskId,
    req.caller.id,
    req.caller.role,
    req.body
  );
  return ApiResponse.success(res, { task }, 'Task updated');
});

const transitionTaskStatus = asyncHandler(async (req, res) => {
  const task = await taskService.transitionTaskStatus(
    req.params.projectId,
    req.params.taskId,
    req.caller.id,
    req.caller.role,
    req.body.status
  );
  return ApiResponse.success(res, { task }, `Task moved to "${task.status}"`);
});

const deleteTask = asyncHandler(async (req, res) => {
  await taskService.deleteTask(
    req.params.projectId,
    req.params.taskId,
    req.caller.id,
    req.caller.role
  );
  return ApiResponse.noContent(res);
});

module.exports = {
  createTask,
  getProjectTasks,
  getTaskById,
  updateTask,
  transitionTaskStatus,
  deleteTask,
};
