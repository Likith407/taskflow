const CryptoJS = require('crypto-js');

const getEncryptionKey = () => {
  const key = process.env.PAYLOAD_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error('PAYLOAD_ENCRYPTION_KEY must be at least 32 characters');
  }
  return key;
};

/**
 * Encrypt a string value using AES-256
 */
const encrypt = (plaintext) => {
  if (plaintext === null || plaintext === undefined) return plaintext;
  const key = getEncryptionKey();
  const encrypted = CryptoJS.AES.encrypt(String(plaintext), key).toString();
  return encrypted;
};

/**
 * Decrypt an AES-256 encrypted string
 */
const decrypt = (ciphertext) => {
  if (ciphertext === null || ciphertext === undefined) return ciphertext;
  const key = getEncryptionKey();
  const bytes = CryptoJS.AES.decrypt(ciphertext, key);
  return bytes.toString(CryptoJS.enc.Utf8);
};

/**
 * Encrypt specified fields in an object (shallow)
 */
const encryptFields = (obj, fields) => {
  if (!obj || typeof obj !== 'object') return obj;
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] !== undefined && result[field] !== null) {
      result[field] = encrypt(result[field]);
    }
  }
  return result;
};

/**
 * Decrypt specified fields in an object (shallow)
 */
const decryptFields = (obj, fields) => {
  if (!obj || typeof obj !== 'object') return obj;
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] !== undefined && result[field] !== null) {
      result[field] = decrypt(result[field]);
    }
  }
  return result;
};

module.exports = { encrypt, decrypt, encryptFields, decryptFields };
