const request = require('supertest');
const {
  connectTestDB,
  clearTestDB,
  disconnectTestDB,
  registerAndLogin,
  app,
} = require('./helpers');

beforeAll(async () => { await connectTestDB(); });
afterEach(async () => { await clearTestDB(); });
afterAll(async () => { await disconnectTestDB(); });

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  const validUser = {
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: 'SecurePass1',
  };

  it('registers a new user and returns 201 with user data + token', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toMatchObject({
      name: 'Jane Smith',
      email: 'jane@example.com',
    });
    expect(res.body.data.accessToken).toBeDefined();
    // Password must never be returned
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('sets HTTP-only accessToken and refreshToken cookies', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieStr = cookies.join('; ');
    expect(cookieStr).toMatch(/accessToken/);
    expect(cookieStr).toMatch(/refreshToken/);
    expect(cookieStr).toMatch(/HttpOnly/i);
  });

  it('returns 409 when email is already registered', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app).post('/api/auth/register').send(validUser);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_TAKEN');
  });

  it('returns 422 when name is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'x@x.com', password: 'TestPass1' });

    expect(res.status).toBe(422);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'name' })])
    );
  });

  it('returns 422 when email is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'not-an-email', password: 'TestPass1' });

    expect(res.status).toBe(422);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'email' })])
    );
  });

  it('returns 422 when password is too weak (no uppercase)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'x@x.com', password: 'weakpass1' });

    expect(res.status).toBe(422);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'password' })])
    );
  });

  it('returns 422 when password is shorter than 8 chars', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'x@x.com', password: 'Ab1' });

    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Jane Smith',
      email: 'jane@example.com',
      password: 'SecurePass1',
    });
  });

  it('logs in with correct credentials and returns 200 + token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jane@example.com', password: 'SecurePass1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe('jane@example.com');
  });

  it('sets fresh HTTP-only cookies on login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jane@example.com', password: 'SecurePass1' });

    const cookieStr = res.headers['set-cookie']?.join('; ') ?? '';
    expect(cookieStr).toMatch(/accessToken/);
    expect(cookieStr).toMatch(/HttpOnly/i);
  });

  it('returns 401 with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jane@example.com', password: 'WrongPass1' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 with unregistered email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'SecurePass1' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 422 when email field is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'SecurePass1' });

    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/auth/me', () => {
  it('returns the current user for an authenticated request', async () => {
    const { agent } = await registerAndLogin();
    const res = await agent.get('/api/auth/me');

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ email: 'test@example.com' });
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_REQUIRED');
  });

  it('returns 401 when Authorization header has an invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer totally.invalid.token');

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/logout', () => {
  it('logs out successfully and clears cookies', async () => {
    const { agent } = await registerAndLogin();
    const res = await agent.post('/api/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/logged out/i);

    // After logout, /me should return 401
    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(401);
  });

  it('returns 401 if not authenticated', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/refresh', () => {
  it('returns a new access token using the refresh token cookie', async () => {
    const { agent } = await registerAndLogin();
    const res = await agent.post('/api/auth/refresh');

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('returns 401 when no refresh token cookie is present', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('REFRESH_TOKEN_MISSING');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /health
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('returns 200 with healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });
});
