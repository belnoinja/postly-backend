import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string): string {
  const secretKey = process.env.ENCRYPTION_SECRET;
  if (!secretKey || secretKey.length !== 32) {
    throw new Error('Invalid ENCRYPTION_SECRET length. Must be 32 characters.');
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(secretKey), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const secretKey = process.env.ENCRYPTION_SECRET;
  if (!secretKey || secretKey.length !== 32) {
    throw new Error('Invalid ENCRYPTION_SECRET length. Must be 32 characters.');
  }

  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(secretKey), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
