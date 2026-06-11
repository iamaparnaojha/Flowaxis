'use strict';

const userService = require('./user.service');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const getMe = asyncHandler(async (req, res) => {
  const user = await userService.getMyProfile(req.caller.id);
  return ApiResponse.success(res, { user });
});

const updateMe = asyncHandler(async (req, res) => {
  const updatedUser = await userService.updateMyProfile(req.caller.id, req.body);
  return ApiResponse.success(res, { user: updatedUser }, 'Profile updated');
});

const listUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const result = await userService.listAllUsers({ page, limit });
  return ApiResponse.success(res, result);
});

const deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.params.id, req.caller.id);
  return ApiResponse.noContent(res);
});

module.exports = { getMe, updateMe, listUsers, deleteUser };
