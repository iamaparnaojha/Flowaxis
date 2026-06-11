'use strict';

const { z } = require('zod');
const mongoose = require('mongoose');
const { TASK_STATUSES, TASK_PRIORITIES } = require('./task.model');

const objectId = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), { message: 'Invalid ID format' });

const createTaskSchema = z.object({
  title: z.string().trim().min(2, 'Title too short').max(200),
  description: z.string().trim().max(2000).optional().default(''),
  assignee: objectId.optional().nullable(),
  priority: z.enum(TASK_PRIORITIES).default('medium'),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
});

const updateTaskSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  assignee: objectId.optional().nullable(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
});

const transitionTaskStatusSchema = z.object({
  status: z.enum(TASK_STATUSES, {
    errorMap: () => ({ message: `Status must be one of: ${TASK_STATUSES.join(', ')}` }),
  }),
});

const taskParamsSchema = z.object({
  projectId: objectId,
  taskId: objectId,
});

const projectParamSchema = z.object({
  projectId: objectId,
});

module.exports = {
  createTaskSchema,
  updateTaskSchema,
  transitionTaskStatusSchema,
  taskParamsSchema,
  projectParamSchema,
};
