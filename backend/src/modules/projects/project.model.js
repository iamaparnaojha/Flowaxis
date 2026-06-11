'use strict';

const mongoose = require('mongoose');

const VALID_STATUSES = ['planning', 'active', 'on_hold', 'completed'];

// Aparna: Inline enum for status transitions — enforced at both schema and service level.
// Schema catches persistence bugs; service enforces business transition rules.
const STATUS_TRANSITIONS = {
  planning: ['active', 'on_hold'],
  active: ['on_hold', 'completed'],
  on_hold: ['active', 'completed'],
  completed: [], // Terminal state — no transitions out
};

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'editor', 'viewer'],
      default: 'viewer',
    },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [150, 'Project name cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: VALID_STATUSES,
      default: 'planning',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: {
      type: [memberSchema],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    dueDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index: find all projects a user owns or is a member of efficiently
projectSchema.index({ owner: 1, status: 1 });
projectSchema.index({ 'members.user': 1 });

module.exports = mongoose.model('Project', projectSchema);
module.exports.STATUS_TRANSITIONS = STATUS_TRANSITIONS;
module.exports.VALID_STATUSES = VALID_STATUSES;
