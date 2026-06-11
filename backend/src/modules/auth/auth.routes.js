'use strict';

const { Router } = require('express');
const controller = require('./auth.controller');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const { authRateLimiter } = require('../../middleware/rateLimiter');
const { registerSchema, loginSchema } = require('./auth.schema');

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User registration and session management
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user account
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: Aparna Ojha }
 *               email: { type: string, format: email, example: aparna@flowaxis.dev }
 *               password: { type: string, example: Secure@123 }
 *     responses:
 *       201: { description: Account created }
 *       400: { description: Validation failed }
 *       409: { description: Email already in use }
 */
router.post('/register', authRateLimiter, validate({ body: registerSchema }), controller.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and receive access token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200: { description: Access token returned, refresh token set as httpOnly cookie }
 *       401: { description: Invalid credentials }
 */
router.post('/login', authRateLimiter, validate({ body: loginSchema }), controller.login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate refresh token and get new access token
 *     security: []
 *     description: Requires a valid `refreshToken` httpOnly cookie set during login.
 *     responses:
 *       200: { description: New access token issued }
 *       401: { description: Invalid or missing refresh token }
 */
router.post('/refresh', controller.refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout and revoke refresh token for this session
 *     responses:
 *       200: { description: Logged out }
 *       401: { description: Not authenticated }
 */
router.post('/logout', authenticate, controller.logout);

module.exports = router;
