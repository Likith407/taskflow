const request = require('supertest');
const {
  connectTestDB,
  clearTestDB,
  disconnectTestDB,
  registerAndLogin,
  createTask,
  app,
} = require('./helpers');

beforeAll(async () => { await connectTestDB(); });
afterEach(async () => { await clearTestDB(); });
afterAll(async () => { await disconnectTestDB(); });

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tasks
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/tasks', () => {
  it('creates a task and returns 201 with task data', async () => {
    const { agent } = await registerAndLogin();
    const res = await agent.post('/api/tasks').send({
      title: 'Build the API',
      description: 'Write controllers and routes',
      status: 'todo',
      priority: 'high',
      tags: ['backend', 'api'],
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      title: 'Build the API',
      status: 'todo',
      priority: 'high',
    });
    expect(res.body.data._id).toBeDefined();
    expect(res.body.data.owner).toBeDefined();
  });

  it('defaults status to "todo" and priority to "medium" when omitted', async () => {
    const { agent } = await registerAndLogin();
    const res = await agent.post('/api/tasks').send({ title: 'Minimal task' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('todo');
    expect(res.body.data.priority).toBe('medium');
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'Sneaky task' });
    expect(res.status).toBe(401);
  });

  it('returns 422 when title is missing', async () => {
    const { agent } = await registerAndLogin();
    const res = await agent.post('/api/tasks').send({ description: 'No title here' });

    expect(res.status).toBe(422);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'title' })])
    );
  });

  it('returns 422 when title is shorter than 3 chars', async () => {
    const { agent } = await registerAndLogin();
    const res = await agent.post('/api/tasks').send({ title: 'AB' });
    expect(res.status).toBe(422);
  });

  it('returns 422 when status is invalid', async () => {
    const { agent } = await registerAndLogin();
    const res = await agent.post('/api/tasks').send({ title: 'My Task', status: 'flying' });
    expect(res.status).toBe(422);
  });

  it('returns 422 when priority is invalid', async () => {
    const { agent } = await registerAndLogin();
    const res = await agent.post('/api/tasks').send({ title: 'My Task', priority: 'extreme' });
    expect(res.status).toBe(422);
  });

  it('assigns the task to the authenticated user', async () => {
    const { agent, user } = await registerAndLogin();
    const res = await createTask(agent);

    expect(res.body.data.owner).toBe(user.id);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tasks
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/tasks', () => {
  it('returns a paginated list of the user\'s tasks', async () => {
    const { agent } = await registerAndLogin();
    await createTask(agent, { title: 'Task One' });
    await createTask(agent, { title: 'Task Two' });
    await createTask(agent, { title: 'Task Three' });

    const res = await agent.get('/api/tasks');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.meta).toMatchObject({ total: 3, page: 1 });
  });

  it('respects the limit and page query params', async () => {
    const { agent } = await registerAndLogin();
    for (let i = 1; i <= 5; i++) {
      await createTask(agent, { title: `Task ${i}` });
    }

    const res = await agent.get('/api/tasks?page=2&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ page: 2, limit: 2, total: 5, totalPages: 3 });
  });

  it('filters tasks by status', async () => {
    const { agent } = await registerAndLogin();
    await createTask(agent, { title: 'Todo task', status: 'todo' });
    await createTask(agent, { title: 'Done task', status: 'completed' });

    const res = await agent.get('/api/tasks?status=completed');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('completed');
  });

  it('filters tasks by priority', async () => {
    const { agent } = await registerAndLogin();
    await createTask(agent, { title: 'Urgent task', priority: 'urgent' });
    await createTask(agent, { title: 'Low task', priority: 'low' });

    const res = await agent.get('/api/tasks?priority=urgent');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].priority).toBe('urgent');
  });

  it('does NOT return tasks belonging to another user', async () => {
    const { agent: agentA } = await registerAndLogin({ email: 'a@test.com' });
    const { agent: agentB } = await registerAndLogin({ email: 'b@test.com' });

    await createTask(agentA, { title: 'User A task' });

    const res = await agentB.get('/api/tasks');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(401);
  });

  it('returns 422 for invalid status filter', async () => {
    const { agent } = await registerAndLogin();
    const res = await agent.get('/api/tasks?status=invalid');
    expect(res.status).toBe(422);
  });

  it('returns hasNextPage=true when more pages exist', async () => {
    const { agent } = await registerAndLogin();
    for (let i = 1; i <= 5; i++) await createTask(agent, { title: `Task ${i}` });

    const res = await agent.get('/api/tasks?limit=2&page=1');
    expect(res.body.meta.hasNextPage).toBe(true);
    expect(res.body.meta.hasPrevPage).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tasks/:id
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/tasks/:id', () => {
  it('returns a single task by ID', async () => {
    const { agent } = await registerAndLogin();
    const created = await createTask(agent, { title: 'Specific Task' });
    const taskId = created.body.data._id;

    const res = await agent.get(`/api/tasks/${taskId}`);

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(taskId);
    expect(res.body.data.title).toBe('Specific Task');
  });

  it('returns 404 for a non-existent task ID', async () => {
    const { agent } = await registerAndLogin();
    const fakeId = '64f3a1b2c5e6d7e8f9a0b1c2';

    const res = await agent.get(`/api/tasks/${fakeId}`);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('TASK_NOT_FOUND');
  });

  it('returns 404 when trying to access another user\'s task', async () => {
    const { agent: agentA } = await registerAndLogin({ email: 'a@test.com' });
    const { agent: agentB } = await registerAndLogin({ email: 'b@test.com' });

    const created = await createTask(agentA, { title: 'Private task' });
    const taskId = created.body.data._id;

    const res = await agentB.get(`/api/tasks/${taskId}`);
    expect(res.status).toBe(404); // Not 403 — don't reveal existence
  });

  it('returns 400 for a malformed task ID', async () => {
    const { agent } = await registerAndLogin();
    const res = await agent.get('/api/tasks/not-a-valid-id');
    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/tasks/:id
// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/tasks/:id', () => {
  it('updates allowed fields and returns the updated task', async () => {
    const { agent } = await registerAndLogin();
    const created = await createTask(agent, { title: 'Old title' });
    const taskId = created.body.data._id;

    const res = await agent.patch(`/api/tasks/${taskId}`).send({
      title: 'New title',
      status: 'in_progress',
      priority: 'high',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('New title');
    expect(res.body.data.status).toBe('in_progress');
    expect(res.body.data.priority).toBe('high');
  });

  it('auto-sets completedAt when status changes to "completed"', async () => {
    const { agent } = await registerAndLogin();
    const created = await createTask(agent);
    const taskId = created.body.data._id;

    const res = await agent
      .patch(`/api/tasks/${taskId}`)
      .send({ status: 'completed' });

    expect(res.status).toBe(200);
    expect(res.body.data.completedAt).not.toBeNull();
  });

  it('clears completedAt when status changes away from "completed"', async () => {
    const { agent } = await registerAndLogin();
    const created = await createTask(agent, { status: 'completed' });
    const taskId = created.body.data._id;

    const res = await agent
      .patch(`/api/tasks/${taskId}`)
      .send({ status: 'in_progress' });

    expect(res.status).toBe(200);
    expect(res.body.data.completedAt).toBeNull();
  });

  it('returns 400 when no valid fields are sent', async () => {
    const { agent } = await registerAndLogin();
    const created = await createTask(agent);
    const taskId = created.body.data._id;

    const res = await agent.patch(`/api/tasks/${taskId}`).send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('NO_UPDATES');
  });

  it('returns 404 when updating another user\'s task', async () => {
    const { agent: agentA } = await registerAndLogin({ email: 'a@test.com' });
    const { agent: agentB } = await registerAndLogin({ email: 'b@test.com' });

    const created = await createTask(agentA);
    const taskId = created.body.data._id;

    const res = await agentB
      .patch(`/api/tasks/${taskId}`)
      .send({ title: 'Hijacked title' });

    expect(res.status).toBe(404);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .patch('/api/tasks/64f3a1b2c5e6d7e8f9a0b1c2')
      .send({ title: 'Hacked' });

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/tasks/:id
// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/tasks/:id', () => {
  it('deletes an owned task and returns 200', async () => {
    const { agent } = await registerAndLogin();
    const created = await createTask(agent, { title: 'Delete me' });
    const taskId = created.body.data._id;

    const res = await agent.delete(`/api/tasks/${taskId}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);

    // Confirm it's gone
    const getRes = await agent.get(`/api/tasks/${taskId}`);
    expect(getRes.status).toBe(404);
  });

  it('returns 404 when deleting a non-existent task', async () => {
    const { agent } = await registerAndLogin();
    const fakeId = '64f3a1b2c5e6d7e8f9a0b1c2';

    const res = await agent.delete(`/api/tasks/${fakeId}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 when deleting another user\'s task', async () => {
    const { agent: agentA } = await registerAndLogin({ email: 'a@test.com' });
    const { agent: agentB } = await registerAndLogin({ email: 'b@test.com' });

    const created = await createTask(agentA);
    const taskId = created.body.data._id;

    const res = await agentB.delete(`/api/tasks/${taskId}`);
    expect(res.status).toBe(404);

    // Confirm task still exists for its owner
    const getRes = await agentA.get(`/api/tasks/${taskId}`);
    expect(getRes.status).toBe(200);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).delete('/api/tasks/64f3a1b2c5e6d7e8f9a0b1c2');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tasks/stats
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/tasks/stats', () => {
  it('returns correct counts per status', async () => {
    const { agent } = await registerAndLogin();
    await createTask(agent, { title: 'T1', status: 'todo' });
    await createTask(agent, { title: 'T2', status: 'todo' });
    await createTask(agent, { title: 'T3', status: 'in_progress' });
    await createTask(agent, { title: 'T4', status: 'completed' });

    const res = await agent.get('/api/tasks/stats');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      todo: 2,
      in_progress: 1,
      completed: 1,
      archived: 0,
      total: 4,
    });
  });

  it('returns all zeros when user has no tasks', async () => {
    const { agent } = await registerAndLogin();
    const res = await agent.get('/api/tasks/stats');

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);
  });

  it('only counts the current user\'s tasks', async () => {
    const { agent: agentA } = await registerAndLogin({ email: 'a@test.com' });
    const { agent: agentB } = await registerAndLogin({ email: 'b@test.com' });

    await createTask(agentA, { title: 'A task 1' });
    await createTask(agentA, { title: 'A task 2' });

    const res = await agentB.get('/api/tasks/stats');
    expect(res.body.data.total).toBe(0);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/tasks/stats');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 404 handler
// ─────────────────────────────────────────────────────────────────────────────
describe('404 handler', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});
