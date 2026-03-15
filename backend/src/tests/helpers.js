const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');

let mongod;

/**
 * Start an in-memory MongoDB instance and connect Mongoose to it.
 * Call in beforeAll().
 */
const connectTestDB = async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
};

/**
 * Drop all collections between tests to ensure isolation.
 * Call in afterEach() or beforeEach().
 */
const clearTestDB = async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map((col) => col.deleteMany({}))
  );
};

/**
 * Disconnect Mongoose and stop the in-memory server.
 * Call in afterAll().
 */
const disconnectTestDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
};

/**
 * Register a user and return { agent, user, accessToken, cookies }
 * The agent has credentials (cookies) already set.
 */
const registerAndLogin = async (overrides = {}) => {
  const userData = {
    name: overrides.name || 'Test User',
    email: overrides.email || 'test@example.com',
    password: overrides.password || 'TestPass1',
  };

  const agent = request.agent(app); // agent persists cookies
  const res = await agent
    .post('/api/auth/register')
    .send(userData);

  return {
    agent,
    user: res.body.data?.user,
    accessToken: res.body.data?.accessToken,
    cookies: res.headers['set-cookie'],
    userData,
  };
};

/**
 * Create a task via the API (requires an authenticated agent).
 */
const createTask = async (agent, overrides = {}) => {
  const taskData = {
    title: overrides.title || 'Test Task',
    description: overrides.description || 'A test task description',
    status: overrides.status || 'todo',
    priority: overrides.priority || 'medium',
    ...overrides,
  };
  const res = await agent.post('/api/tasks').send(taskData);
  return res;
};

module.exports = {
  connectTestDB,
  clearTestDB,
  disconnectTestDB,
  registerAndLogin,
  createTask,
  app,
};
