import { Response } from 'express';
import { TwitterApi } from 'twitter-api-v2';
import prisma from '../db/client';
import { encrypt } from '../utils/encryption';
import { AuthenticatedRequest } from '../middleware/auth';

const CLIENT_ID = process.env.TWITTER_CLIENT_ID || 'mock_client_id';
const CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET || 'mock_client_secret';
const CALLBACK_URL = process.env.TWITTER_CALLBACK_URL || 'http://localhost:3000/api/oauth/twitter/callback';

export const twitterLogin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const client = new TwitterApi({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET });
    
    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(CALLBACK_URL, { scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] });
    
    res.status(200).json({ data: { url, codeVerifier, state }, error: null });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'OAUTH_ERROR', message: error.message } });
  }
};

export const twitterCallback = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { state, code, codeVerifier } = req.body;
    const userId = req.user!.userId;

    if (!state || !code || !codeVerifier) {
       res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing parameters' } });
       return;
    }

    const client = new TwitterApi({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET });
    const { client: loggedClient, accessToken, refreshToken, expiresIn } = await client.loginWithOAuth2({ code, codeVerifier, redirectUri: CALLBACK_URL });

    const me = await loggedClient.v2.me();

    const encryptedToken = encrypt(accessToken);

    const existingAccount = await prisma.socialAccount.findFirst({
      where: { userId, platform: 'twitter' }
    });

    if (existingAccount) {
      await prisma.socialAccount.update({
        where: { id: existingAccount.id },
        data: {
          accessTokenEnc: encryptedToken,
          handle: me.data.username
        }
      });
    } else {
      await prisma.socialAccount.create({
        data: {
          userId,
          platform: 'twitter',
          accessTokenEnc: encryptedToken,
          handle: me.data.username
        }
      });
    }

    res.status(200).json({ data: { success: true, username: me.data.username }, error: null });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'OAUTH_ERROR', message: error.message } });
  }
};
