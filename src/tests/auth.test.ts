import request from 'supertest';
import app from '../index';
import { generateAccessToken } from '../utils/jwt';

describe('Auth Middleware', () => {
  it('should return 401 if token is missing', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('TOKEN_MISSING');
  });

  it('should return 401 if token is invalid or expired', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid_token');
    
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('TOKEN_INVALID');
  });

  it('should allow access if token is valid', async () => {
    const token = generateAccessToken({ userId: 'test_user_id' });
    // This will return 404 because user is not in DB, but auth passes
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
