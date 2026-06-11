'use strict';

const swaggerJsdoc = require('swagger-jsdoc');
const env = require('./env');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'FlowAxis API',
      version: '1.0.0',
      description:
        'Production-grade project & task management API by Aparna Ojha. ' +
        'Built with Node.js, Express, MongoDB, and Redis.',
      contact: {
        name: 'Aparna Ojha',
        url: 'https://github.com/iamaparnaojha',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}/api/v1`,
        description: 'Development',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token obtained from /auth/login. Expires in 30 minutes.',
        },
      },
      schemas: {
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Validation failed' },
            errors: { type: 'array', items: { type: 'object' } },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['user', 'admin'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Project: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            status: {
              type: 'string',
              enum: ['planning', 'active', 'on_hold', 'completed'],
            },
            owner: { $ref: '#/components/schemas/User' },
            members: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  user: { $ref: '#/components/schemas/User' },
                  role: { type: 'string', enum: ['owner', 'editor', 'viewer'] },
                },
              },
            },
            tags: { type: 'array', items: { type: 'string' } },
            dueDate: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Task: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            project: { type: 'string', description: 'Project ObjectId' },
            assignee: { $ref: '#/components/schemas/User' },
            reporter: { $ref: '#/components/schemas/User' },
            status: {
              type: 'string',
              enum: ['todo', 'in_progress', 'in_review', 'done', 'cancelled'],
            },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            dueDate: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  // Aparna: Glob picks up all route files so docs stay co-located with code
  apis: ['./src/modules/*/*.routes.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
