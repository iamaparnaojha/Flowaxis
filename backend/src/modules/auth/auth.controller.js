'use strict';

const authService = require('./auth.service');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const env = require('../../config/env');

// Aparna: Controllers are thin — they parse req/res, call the service,
// then format the response. Zero business logic lives here.

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

const register = asyncHandler(async (req, res) => {
  const newUser = await authService.register(req.body);
  return ApiResponse.created(res, { user: newUser }, 'Account created. Please log in.');
});

const login = asyncHandler(async (req, res) => {
  const { user, freshAccessToken, freshRefreshToken } = await authService.login(req.body);

  res.cookie('refreshToken', freshRefreshToken, REFRESH_COOKIE_OPTIONS);

  return ApiResponse.success(res, {
    accessToken: freshAccessToken,
    user,
  }, 'Login successful');
});

const refresh = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken;

  const { freshAccessToken, freshRefreshToken } = await authService.refresh(incomingRefreshToken);

  res.cookie('refreshToken', freshRefreshToken, REFRESH_COOKIE_OPTIONS);

  return ApiResponse.success(res, { accessToken: freshAccessToken }, 'Token refreshed');
});

const logout = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken;
  await authService.logout(req.caller.id, incomingRefreshToken);

  res.clearCookie('refreshToken', {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
  });

  return ApiResponse.success(res, null, 'Logged out successfully');
});

module.exports = { register, login, refresh, logout };
