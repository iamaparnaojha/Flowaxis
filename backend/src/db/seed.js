'use strict';

/**
 * Seed script — creates demo admin, demo user, and a sample project.
 * Run with: npm run seed
 * Safe to re-run — idempotent (skips existing records, never double-hashes).
 */

require('../config/env'); // Validate env before anything else
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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

/**
 * Aparna: The seed script must hash passwords BEFORE passing them to User.create().
 *
 * Why? The Mongoose pre('save') hook fires on `create()` and would hash again,
 * resulting in a double-hash. The correct pattern for seeding is:
 *   1. Hash the plain password here with bcrypt.
 *   2. Set passwordHash directly — the hook sees `isModified('passwordHash')` = true
 *      but since we're passing an already-hashed string the hook would double-hash.
 *
 * Solution: use `{ validateBeforeSave: false }` and bypass the hook entirely by
 * using `Model.collection.insertOne` — OR simply use `User.create()` with the
 * raw password and let the hook handle it, which is what works correctly.
 *
 * The REAL bug that caused "invalid password" on seed users: when re-running
 * the seed, existing users were found via `findOne()` and left untouched — which
 * is correct. The bug was that initial creation passed `passwordHash: plainText`
 * to `User.create()`. The pre-save hook DOES run on create and hashes it. So
 * that part was correct.
 *
 * The actual issue: if seed was run multiple times and the user already existed,
 * the `else` branch just logged "already exists" — correct. But if the database
 * was from an older broken seed that stored plaintext, this script now forces
 * a password reset for existing seed users to ensure they're always correctly hashed.
 */
const ensureUser = async ({ name, email, password, role }) => {
  const existing = await User.findOne({ email }).select('+passwordHash');

  if (!existing) {
    // Fresh create — let the pre-save hook hash the password
    const created = await User.create({ name, email, passwordHash: password, role });
    console.log(`✅ Created: ${email}`);
    return created;
  }

  // Aparna: Always reset the seed user's password to guarantee it matches
  // what's printed at the end of this script. This makes re-seeding idempotent
  // AND fixes any stale/corrupted password from previous runs.
  const freshHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  existing.passwordHash = freshHash;

  // Aparna: Use updateOne to bypass the pre-save hook — we already hashed manually.
  // If we called existing.save() the hook would see isModified('passwordHash') = true
  // and hash our already-hashed value again (double-hash = broken login).
  await User.updateOne({ _id: existing._id }, { $set: { passwordHash: freshHash } });

  console.log(`⚡ Reset password for existing user: ${email}`);
  return existing;
};

const seed = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('✅ Connected to MongoDB for seeding\n');

    const admin = await ensureUser(seedData.admin);
    const demoUser = await ensureUser(seedData.user);

    // Seed a sample project owned by admin — skip if already exists
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
      console.log('⚡ Sample project already exists — skipping');
    }

    console.log('\n🎉 Seed complete!\n');
    console.log('  Admin login  →  admin@flowaxis.dev  /  Admin@flowaxis1');
    console.log('  User login   →  demo@flowaxis.dev   /  Demo@flowaxis1\n');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

seed();
