import { Request, Response } from 'express';
import * as authService from '../services/auth';
import { AuthenticatedRequest } from '../middleware/auth';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
      return;
    }
    const result = await authService.register(email, password, name);
    res.status(201).json({ data: result, error: null });
  } catch (error: any) {
    if (error.message === 'USER_EXISTS') {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'Email already registered' } });
    } else {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Registration failed' } });
    }
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Missing credentials' } });
      return;
    }
    const tokens = await authService.login(email, password);
    res.status(200).json({ data: tokens, error: null });
  } catch (error: any) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Missing refresh_token' } });
      return;
    }
    const tokens = await authService.refresh(refresh_token);
    res.status(200).json({ data: tokens, error: null });
  } catch (error: any) {
    res.status(401).json({ error: 'TOKEN_INVALID' });
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    await authService.logout(req.user.userId);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Logout failed' } });
  }
};

export const me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const user = await authService.getUser(req.user.userId);
    if (!user) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }
    res.status(200).json({ data: user, error: null });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get user' } });
  }
};
