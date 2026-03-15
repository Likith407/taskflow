const {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
} = require('../utils/jwt');

const {
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
} = require('../utils/encryption');

// ─────────────────────────────────────────────────────────────────────────────
// JWT Utils
// ─────────────────────────────────────────────────────────────────────────────
describe('JWT utilities', () => {
  const userId = '64f3a1b2c5e6d7e8f9a0b1c2';

  describe('generateAccessToken / verifyAccessToken', () => {
    it('generates a valid access token that can be verified', () => {
      const token = generateAccessToken(userId);
      expect(typeof token).toBe('string');

      const decoded = verifyAccessToken(token);
      expect(decoded.sub).toBe(userId);
      expect(decoded.type).toBe('access');
    });

    it('throws on tampered access token', () => {
      const token = generateAccessToken(userId);
      const tampered = token.slice(0, -5) + 'XXXXX';
      expect(() => verifyAccessToken(tampered)).toThrow();
    });

    it('throws when verifying a refresh token as an access token', () => {
      const refreshToken = generateRefreshToken(userId);
      // refresh token is signed with a different secret — should fail
      expect(() => verifyAccessToken(refreshToken)).toThrow();
    });
  });

  describe('generateRefreshToken / verifyRefreshToken', () => {
    it('generates a valid refresh token that can be verified', () => {
      const token = generateRefreshToken(userId);
      const decoded = verifyRefreshToken(token);

      expect(decoded.sub).toBe(userId);
      expect(decoded.type).toBe('refresh');
    });

    it('throws on tampered refresh token', () => {
      const token = generateRefreshToken(userId);
      const tampered = token.slice(0, -5) + 'YYYYY';
      expect(() => verifyRefreshToken(tampered)).toThrow();
    });
  });

  describe('cookie options', () => {
    it('access token cookie is HttpOnly', () => {
      const opts = getAccessTokenCookieOptions();
      expect(opts.httpOnly).toBe(true);
    });

    it('refresh token cookie is HttpOnly', () => {
      const opts = getRefreshTokenCookieOptions();
      expect(opts.httpOnly).toBe(true);
    });

    it('access token cookie is NOT secure in test/development env', () => {
      // NODE_ENV=test — secure should be false
      const opts = getAccessTokenCookieOptions();
      expect(opts.secure).toBe(false);
    });

    it('access token maxAge is 15 minutes', () => {
      const opts = getAccessTokenCookieOptions();
      expect(opts.maxAge).toBe(15 * 60 * 1000);
    });

    it('refresh token maxAge is 30 days', () => {
      const opts = getRefreshTokenCookieOptions();
      expect(opts.maxAge).toBe(30 * 24 * 60 * 60 * 1000);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Encryption Utils
// ─────────────────────────────────────────────────────────────────────────────
describe('Encryption utilities', () => {
  describe('encrypt / decrypt', () => {
    it('encrypts a string to a non-plaintext ciphertext', () => {
      const plaintext = 'sensitive data';
      const ciphertext = encrypt(plaintext);

      expect(ciphertext).not.toBe(plaintext);
      expect(typeof ciphertext).toBe('string');
      expect(ciphertext.length).toBeGreaterThan(0);
    });

    it('decrypts ciphertext back to the original plaintext', () => {
      const plaintext = 'hello world 12345';
      const ciphertext = encrypt(plaintext);
      const decrypted = decrypt(ciphertext);

      expect(decrypted).toBe(plaintext);
    });

    it('produces different ciphertext on each encryption call (random IV)', () => {
      const plaintext = 'same input';
      const c1 = encrypt(plaintext);
      const c2 = encrypt(plaintext);

      // AES with random IV — ciphertexts should differ
      expect(c1).not.toBe(c2);
      // But both decrypt to the same value
      expect(decrypt(c1)).toBe(plaintext);
      expect(decrypt(c2)).toBe(plaintext);
    });

    it('returns null/undefined unchanged', () => {
      expect(encrypt(null)).toBeNull();
      expect(encrypt(undefined)).toBeUndefined();
      expect(decrypt(null)).toBeNull();
      expect(decrypt(undefined)).toBeUndefined();
    });

    it('handles numeric values by converting to string', () => {
      const result = encrypt(42);
      expect(decrypt(result)).toBe('42');
    });
  });

  describe('encryptFields / decryptFields', () => {
    it('encrypts specified fields in an object', () => {
      const obj = { name: 'Jane', email: 'jane@example.com', age: 30 };
      const encrypted = encryptFields(obj, ['email']);

      expect(encrypted.name).toBe('Jane'); // untouched
      expect(encrypted.age).toBe(30);      // untouched
      expect(encrypted.email).not.toBe('jane@example.com'); // encrypted
    });

    it('decrypts specified fields back to original values', () => {
      const obj = { name: 'Jane', email: 'jane@example.com' };
      const encrypted = encryptFields(obj, ['email']);
      const decrypted = decryptFields(encrypted, ['email']);

      expect(decrypted.email).toBe('jane@example.com');
      expect(decrypted.name).toBe('Jane');
    });

    it('skips null/undefined fields gracefully', () => {
      const obj = { title: null, body: undefined };
      expect(() => encryptFields(obj, ['title', 'body'])).not.toThrow();
    });

    it('returns non-object inputs unchanged', () => {
      expect(encryptFields(null, ['x'])).toBeNull();
      expect(encryptFields(undefined, ['x'])).toBeUndefined();
    });

    it('does not mutate the original object', () => {
      const original = { secret: 'my-secret' };
      const encrypted = encryptFields(original, ['secret']);

      expect(original.secret).toBe('my-secret'); // unchanged
      expect(encrypted.secret).not.toBe('my-secret'); // new object
    });
  });
});
