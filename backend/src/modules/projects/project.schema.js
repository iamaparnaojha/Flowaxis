'use strict';

const { z } = require('zod');
const mongoose = require('mongoose');
const { VALID_STATUSES } = require('./project.model');

const objectId = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), { message: 'Invalid ID format' });

const createProjectSchema = z.object({
  name: z.string().trim().min(2, 'Project name too short').max(150),
  description: z.string().trim().max(1000).optional().default(''),
  tags: z.array(z.string().trim().max(30)).max(10).optional().default([]),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
});

const updateProjectSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  description: z.string().trim().max(1000).optional(),
  tags: z.array(z.string().trim().max(30)).max(10).optional(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
});

const transitionStatusSchema = z.object({
  status: z.enum(VALID_STATUSES, { errorMap: () => ({ message: `Status must be one of: ${VALID_STATUSES.join(', ')}` }) }),
});

const addMemberSchema = z.object({
  userId: objectId,
  role: z.enum(['editor', 'viewer']).default('viewer'),
});

const projectParamsSchema = z.object({
  id: objectId,
});

const memberParamsSchema = z.object({
  id: objectId,
  userId: objectId,
});

module.exports = {
  createProjectSchema,
  updateProjectSchema,
  transitionStatusSchema,
  addMemberSchema,
  projectParamsSchema,
  memberParamsSchema,
  objectId,
};
