'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('../../config/env');

const refreshTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true },
    issuedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Never returned in queries unless explicitly requested
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    refreshTokens: {
      type: [refreshTokenSchema],
      select: false,
      default: [],
    },
  },
  { timestamps: true }
);

// Aparna: Hash on pre-save so we never accidentally store plaintext.
// isModified guard prevents double-hashing on subsequent saves.
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, env.BCRYPT_ROUNDS);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Strip sensitive fields from any JSON serialization
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.refreshTokens;
  return obj;
};

// Index on email is already enforced by unique:true
// Adding explicit role index for admin queries
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
