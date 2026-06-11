'use strict';

const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const User = require('../users/user.model');
const ApiError = require('../../utils/ApiError');

// ─── Token Helpers ────────────────────────────────────────────────────────────

const signAccessToken = (userId, role) =>
  jwt.sign({ sub: userId, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });

const signRefreshToken = (userId) =>
  jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });

const getRefreshExpiryDate = () => {
  const days = parseInt(env.JWT_REFRESH_EXPIRES_IN, 10) || 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

// ─── Service ──────────────────────────────────────────────────────────────────

const register = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw ApiError.conflict('An account with this email already exists');
  }

  // Aparna: Assign passwordHash directly — the pre-save hook will hash it.
  // Never hash manually before passing to the model.
  const freshUser = await User.create({ name, email, passwordHash: password });
  return freshUser;
};

const login = async ({ email, password }) => {
  // +passwordHash to opt back into the select:false field
  const user = await User.findOne({ email }).select('+passwordHash +refreshTokens');
  if (!user) {
    // Aparna: Return the same error for wrong email and wrong password —
    // user enumeration via timing differences is a real attack vector.
    throw ApiError.unauthorized('Invalid email or password');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const freshAccessToken = signAccessToken(user._id, user.role);
  const freshRefreshToken = signRefreshToken(user._id);

  // Append new refresh token — old ones stay valid until they expire or logout
  user.refreshTokens.push({
    token: freshRefreshToken,
    expiresAt: getRefreshExpiryDate(),
  });
  await user.save();

  return { user, freshAccessToken, freshRefreshToken };
};

const refresh = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    throw ApiError.unauthorized('Refresh token missing');
  }

  let decoded;
  try {
    decoded = jwt.verify(incomingRefreshToken, env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findById(decoded.sub).select('+refreshTokens');
  if (!user) {
    throw ApiError.unauthorized('User no longer exists');
  }

  const tokenIndex = user.refreshTokens.findIndex(
    (entry) => entry.token === incomingRefreshToken
  );

  if (tokenIndex === -1) {
    // Aparna: Token not found — possible reuse after logout. Revoke all tokens
    // for this user as a security response to potential token theft.
    user.refreshTokens = [];
    await user.save();
    throw ApiError.unauthorized('Refresh token reuse detected — all sessions revoked');
  }

  // Rotate: remove old token, issue fresh pair
  user.refreshTokens.splice(tokenIndex, 1);

  const freshAccessToken = signAccessToken(user._id, user.role);
  const freshRefreshToken = signRefreshToken(user._id);

  user.refreshTokens.push({
    token: freshRefreshToken,
    expiresAt: getRefreshExpiryDate(),
  });

  await user.save();

  return { user, freshAccessToken, freshRefreshToken };
};

const logout = async (userId, refreshToken) => {
  if (!refreshToken) return; // Already logged out — idempotent

  const user = await User.findById(userId).select('+refreshTokens');
  if (!user) return;

  // Remove only the token used in this session — other devices stay logged in
  user.refreshTokens = user.refreshTokens.filter(
    (entry) => entry.token !== refreshToken
  );
  await user.save();
};

module.exports = { register, login, refresh, logout };
