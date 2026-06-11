'use strict';

/**
 * Seed script — creates demo admin, demo user, and a sample project.
 * Run with: npm run seed
 * Safe to re-run — idempotent via upsert.
 */

require('../config/env'); // Validate env before anything else
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../modules/users/user.model');
const Project = require('../modules/projects/project.model');
const Task = require('../modules/tasks/task.model');

const seedData = {
  admin: {
    name: 'Aparna Ojha',
    email: 'admin@flowaxis.dev',
    password: 'Admin@flowaxis1',
    role: 'admin',
  },
  user: {
    name: 'Demo User',
    email: 'demo@flowaxis.dev',
    password: 'Demo@flowaxis1',
    role: 'user',
  },
};

const seed = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('✅ Connected to MongoDB for seeding');

    // Upsert admin
    let admin = await User.findOne({ email: seedData.admin.email }).select('+passwordHash');
    if (!admin) {
      admin = await User.create({
        name: seedData.admin.name,
        email: seedData.admin.email,
        passwordHash: seedData.admin.password,
        role: 'admin',
      });
      console.log(`✅ Admin created: ${admin.email}`);
    } else {
      console.log(`⚡ Admin already exists: ${admin.email}`);
    }

    // Upsert demo user
    let demoUser = await User.findOne({ email: seedData.user.email }).select('+passwordHash');
    if (!demoUser) {
      demoUser = await User.create({
        name: seedData.user.name,
        email: seedData.user.email,
        passwordHash: seedData.user.password,
        role: 'user',
      });
      console.log(`✅ Demo user created: ${demoUser.email}`);
    } else {
      console.log(`⚡ Demo user already exists: ${demoUser.email}`);
    }

    // Seed a sample project owned by admin
    const existingProject = await Project.findOne({ name: 'FlowAxis Platform', owner: admin._id });
    if (!existingProject) {
      const sampleProject = await Project.create({
        name: 'FlowAxis Platform',
        description: 'Internal platform for tracking product development.',
        status: 'active',
        owner: admin._id,
        members: [
          { user: admin._id, role: 'owner' },
          { user: demoUser._id, role: 'editor' },
        ],
        tags: ['platform', 'internal'],
      });

      // Seed two tasks
      await Task.insertMany([
        {
          title: 'Set up CI/CD pipeline',
          description: 'Configure GitHub Actions for automated tests and deployment.',
          project: sampleProject._id,
          reporter: admin._id,
          assignee: demoUser._id,
          status: 'in_progress',
          priority: 'high',
        },
        {
          title: 'Write API documentation',
          description: 'Complete OpenAPI 3.0 spec for all endpoints.',
          project: sampleProject._id,
          reporter: admin._id,
          assignee: admin._id,
          status: 'todo',
          priority: 'medium',
        },
      ]);

      console.log(`✅ Sample project and tasks created: "${sampleProject.name}"`);
    } else {
      console.log('⚡ Sample project already exists');
    }

    console.log('\n🎉 Seed complete!\n');
    console.log('  Admin login  →  admin@flowaxis.dev  /  Admin@flowaxis1');
    console.log('  User login   →  demo@flowaxis.dev   /  Demo@flowaxis1\n');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

seed();
