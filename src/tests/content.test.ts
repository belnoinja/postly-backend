import request from 'supertest';
import app from '../index';
import { generateAccessToken } from '../utils/jwt';

describe('Content API', () => {
  it('should reject idea > 500 characters', async () => {
    const token = generateAccessToken({ userId: 'test_user_id' });
    const longIdea = 'a'.repeat(501);

    const res = await request(app)
      .post('/api/content/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        idea: longIdea,
        post_type: 'announcement',
        platforms: ['twitter'],
        tone: 'professional',
        language: 'en',
        model: 'openai'
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
