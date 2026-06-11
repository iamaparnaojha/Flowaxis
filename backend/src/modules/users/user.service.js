'use strict';

const User = require('./user.model');
const ApiError = require('../../utils/ApiError');

const getMyProfile = async (callerId) => {
  const user = await User.findById(callerId);
  if (!user) throw ApiError.notFound('User');
  return user;
};

const updateMyProfile = async (callerId, updates) => {
  const allowedUpdates = {};
  if (updates.name !== undefined) allowedUpdates.name = updates.name;

  const updatedUser = await User.findByIdAndUpdate(
    callerId,
    { $set: allowedUpdates },
    { new: true, runValidators: true }
  );

  if (!updatedUser) throw ApiError.notFound('User');
  return updatedUser;
};

const listAllUsers = async ({ page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(),
  ]);

  return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
};

const deleteUser = async (targetUserId, callerId) => {
  if (targetUserId === callerId) {
    throw ApiError.badRequest('Admins cannot delete their own account via this endpoint');
  }

  const user = await User.findByIdAndDelete(targetUserId);
  if (!user) throw ApiError.notFound('User');
};

module.exports = { getMyProfile, updateMyProfile, listAllUsers, deleteUser };
