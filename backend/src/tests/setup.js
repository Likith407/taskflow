// This file runs before every test file via Jest "setupFiles"
// It sets all required environment variables so app.js / middleware never crash

process.env.NODE_ENV = 'test';
process.env.PORT = '5001';

// JWT — must be ≥ 32 chars
process.env.JWT_SECRET         = 'test-jwt-secret-that-is-long-enough-32c';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-long-enough-32chars';
process.env.JWT_EXPIRES_IN     = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '30d';

// Cookie signing
process.env.COOKIE_SECRET = 'test-cookie-secret-long-enough-here!';

// AES-256 key — exactly 32 chars
process.env.PAYLOAD_ENCRYPTION_KEY = 'test-aes-key-exactly-32-chars!!!';

// CORS
process.env.CORS_ORIGIN = 'http://localhost:3000';

// Rate limiting — set very high so tests never get throttled
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX       = '10000';
