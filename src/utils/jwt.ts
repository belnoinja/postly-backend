import jwt from 'jsonwebtoken';

interface TokenPayload {
  userId: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  const secret = process.env.ACCESS_TOKEN_SECRET || 'access_secret';
  return jwt.sign(payload, secret, { expiresIn: '15m' });
}

export function generateRefreshToken(payload: TokenPayload): string {
  const secret = process.env.REFRESH_TOKEN_SECRET || 'refresh_secret';
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): TokenPayload {
  const secret = process.env.ACCESS_TOKEN_SECRET || 'access_secret';
  return jwt.verify(token, secret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  const secret = process.env.REFRESH_TOKEN_SECRET || 'refresh_secret';
  return jwt.verify(token, secret) as TokenPayload;
}
