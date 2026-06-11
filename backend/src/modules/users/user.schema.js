'use strict';

const { z } = require('zod');
const mongoose = require('mongoose');

const objectId = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), { message: 'Invalid ID format' });

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
});

module.exports = { updateProfileSchema, objectId };
