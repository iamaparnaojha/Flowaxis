'use strict';

const { Router } = require('express');
const controller = require('./project.controller');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const {
  createProjectSchema,
  updateProjectSchema,
  transitionStatusSchema,
  addMemberSchema,
  projectParamsSchema,
  memberParamsSchema,
} = require('./project.schema');

// Aparna: Tasks are mounted here as a sub-router so they inherit the projectId param
const taskRouter = require('../tasks/task.routes');

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Project management with member roles and status transitions
 */

/**
 * @swagger
 * /projects:
 *   post:
 *     tags: [Projects]
 *     summary: Create a new project
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               tags: { type: array, items: { type: string } }
 *               dueDate: { type: string, format: date-time }
 *     responses:
 *       201: { description: Project created }
 */
router.post('/', validate({ body: createProjectSchema }), controller.createProject);

/**
 * @swagger
 * /projects:
 *   get:
 *     tags: [Projects]
 *     summary: List all projects the caller owns or is a member of
 *     responses:
 *       200: { description: Project list (Redis-cached) }
 */
router.get('/', controller.getMyProjects);

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     tags: [Projects]
 *     summary: Get a project by ID (members only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Project detail }
 *       403: { description: Not a member }
 *       404: { description: Not found }
 */
router.get('/:id', validate({ params: projectParamsSchema }), controller.getProjectById);

/**
 * @swagger
 * /projects/{id}:
 *   patch:
 *     tags: [Projects]
 *     summary: Update project details (editor or owner)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Updated project }
 */
router.patch(
  '/:id',
  validate({ params: projectParamsSchema, body: updateProjectSchema }),
  controller.updateProject
);

/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     tags: [Projects]
 *     summary: Delete a project (owner or admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted }
 */
router.delete('/:id', validate({ params: projectParamsSchema }), controller.deleteProject);

/**
 * @swagger
 * /projects/{id}/status:
 *   patch:
 *     tags: [Projects]
 *     summary: Transition project status (state machine enforced)
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
 *                 enum: [planning, active, on_hold, completed]
 *     responses:
 *       200: { description: Status updated }
 *       400: { description: Invalid transition }
 */
router.patch(
  '/:id/status',
  validate({ params: projectParamsSchema, body: transitionStatusSchema }),
  controller.transitionStatus
);

/**
 * @swagger
 * /projects/{id}/members:
 *   post:
 *     tags: [Projects]
 *     summary: Add a member to the project (owner only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: string }
 *               role: { type: string, enum: [editor, viewer] }
 *     responses:
 *       200: { description: Member added }
 */
router.post(
  '/:id/members',
  validate({ params: projectParamsSchema, body: addMemberSchema }),
  controller.addMember
);

/**
 * @swagger
 * /projects/{id}/members/{userId}:
 *   delete:
 *     tags: [Projects]
 *     summary: Remove a member from the project (owner only)
 *     responses:
 *       204: { description: Member removed }
 */
router.delete(
  '/:id/members/:userId',
  validate({ params: memberParamsSchema }),
  controller.removeMember
);

// Mount task routes under /:id/tasks
router.use('/:projectId/tasks', taskRouter);

module.exports = router;
