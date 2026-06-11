'use strict';

const { Router } = require('express');
const controller = require('./task.controller');
const validate = require('../../middleware/validate');
const {
  createTaskSchema,
  updateTaskSchema,
  transitionTaskStatusSchema,
  taskParamsSchema,
  projectParamSchema,
} = require('./task.schema');

// Aparna: mergeParams=true is required to access :projectId from the parent router
const router = Router({ mergeParams: true });

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Task management within a project
 */

/**
 * @swagger
 * /projects/{projectId}/tasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Create a task in a project
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               assignee: { type: string }
 *               priority: { type: string, enum: [low, medium, high, critical] }
 *               dueDate: { type: string, format: date-time }
 *     responses:
 *       201: { description: Task created }
 */
router.post('/', validate({ params: projectParamSchema, body: createTaskSchema }), controller.createTask);

/**
 * @swagger
 * /projects/{projectId}/tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: List tasks for a project (cached, filterable)
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [todo, in_progress, in_review, done, cancelled] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [low, medium, high, critical] }
 *     responses:
 *       200: { description: Task list }
 */
router.get('/', validate({ params: projectParamSchema }), controller.getProjectTasks);

/**
 * @swagger
 * /projects/{projectId}/tasks/{taskId}:
 *   get:
 *     tags: [Tasks]
 *     summary: Get a single task
 *     responses:
 *       200: { description: Task detail }
 *       404: { description: Task not found }
 */
router.get('/:taskId', validate({ params: taskParamsSchema }), controller.getTaskById);

/**
 * @swagger
 * /projects/{projectId}/tasks/{taskId}:
 *   patch:
 *     tags: [Tasks]
 *     summary: Update task details (assignee or project owner)
 *     responses:
 *       200: { description: Updated task }
 */
router.patch(
  '/:taskId',
  validate({ params: taskParamsSchema, body: updateTaskSchema }),
  controller.updateTask
);

/**
 * @swagger
 * /projects/{projectId}/tasks/{taskId}/status:
 *   patch:
 *     tags: [Tasks]
 *     summary: Transition task status (state machine enforced)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [todo, in_progress, in_review, done, cancelled]
 *     responses:
 *       200: { description: Status updated }
 *       400: { description: Invalid transition }
 */
router.patch(
  '/:taskId/status',
  validate({ params: taskParamsSchema, body: transitionTaskStatusSchema }),
  controller.transitionTaskStatus
);

/**
 * @swagger
 * /projects/{projectId}/tasks/{taskId}:
 *   delete:
 *     tags: [Tasks]
 *     summary: Delete a task (project owner or admin)
 *     responses:
 *       204: { description: Deleted }
 */
router.delete('/:taskId', validate({ params: taskParamsSchema }), controller.deleteTask);

module.exports = router;
