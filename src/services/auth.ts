import bcrypt from 'bcrypt';
import prisma from '../db/client';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';

export async function register(email: string, password: string, name: string) {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('USER_EXISTS');
  }

  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
    },
  });

  return { id: user.id, email: user.email, name: user.name };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const access_token = generateAccessToken({ userId: user.id });
  const refresh_token = generateRefreshToken({ userId: user.id });

  // Store hashed refresh token in DB if needed, or rely on token expiry for simple cases.
  // The PRD says: "Refresh token: JWT, 7-day expiry, stored in DB (hashed), rotated on use"
  // For now, we will add an explicit Session or Token table or just update user for simplicity.
  // Wait, the PRD doesn't mention a refresh_tokens table, just that it's stored in DB (hashed).
  // Actually, I need to add refreshTokenHash to User schema. Let's do that in schema later.
  
  return { access_token, refresh_token };
}

export async function refresh(oldRefreshToken: string) {
  const payload = verifyRefreshToken(oldRefreshToken);
  
  // Here we would check if the hash matches the one in DB, and invalidate it.
  
  const access_token = generateAccessToken({ userId: payload.userId });
  const refresh_token = generateRefreshToken({ userId: payload.userId });
  
  // Save new refresh token hash to DB
  
  return { access_token, refresh_token };
}

export async function logout(userId: string) {
  // Invalidate refresh token in DB
}

export async function getUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      bio: true,
      defaultTone: true,
      defaultLanguage: true,
      createdAt: true,
    }
  });
  return user;
}
