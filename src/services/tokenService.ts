import { injectable } from 'inversify';
import jwt from 'jsonwebtoken';

import { redisDB } from './../models/redis';

export interface TokenPayload {
  userId: number;
}

export interface RefreshTokenPayload extends TokenPayload {
  count: number;
}

export interface ITokenService {
  createAccessToken: (userId: string | number) => string;
  createRefreshToken: (userId: string | number) => Promise<string>;
  createPayload: (userId: string | number) => TokenPayload;
  createRefreshTokenCounter: (userId: string | number) => Promise<number>;
  getRefreshTokenCount: (userId: string | number) => Promise<number>;
  invalidateRefreshToken: (userId: string | number) => Promise<number>;
}

@injectable()
export class TokenService implements ITokenService {
  createAccessToken(userId: string | number) {
    const payload = this.createPayload(userId);

    const accessToken = jwt.sign(payload, process.env.SECRET_KEY!, {
      expiresIn: process.env.JWT_EXPIRATION_PERIOD!,
    });

    return accessToken;
  }

  async createRefreshToken(userId: string | number) {
    const count = await this.getRefreshTokenCount(userId);
    const payload = this.createPayload(userId);
    const payloadWithCount = { ...payload, count };

    const refreshToken = jwt.sign(payloadWithCount, process.env.SECRET_KEY!, {
      expiresIn: process.env.JWT_REFRESH_EXPIRATION_PERIOD!,
    });

    return refreshToken;
  }

  createPayload(userId: string | number) {
    return { userId: +userId };
  }

  async getRefreshTokenCount(userId: string | number) {
    const tokenCount: any = await redisDB.get(`${userId}/tokencount`);

    if (tokenCount === undefined || false) {
      const count = await this.createRefreshTokenCounter(userId);
      return count;
    }

    return tokenCount;
  }

  async createRefreshTokenCounter(userId: string | number) {
    await redisDB.set(`${userId}/tokencount`, '0');
    return 0;
  }

  async invalidateRefreshToken(userId: string | number) {
    const tokenCount = await this.getIncrementedRefreshTokenCount(userId);
    return tokenCount;
  }

  private async getIncrementedRefreshTokenCount(userId: string | number) {
    await redisDB.incr(`${userId}/tokencount`);

    const tokenCount = await this.getRefreshTokenCount(userId);
    return tokenCount;
  }

  private enforceString(value: string | number) {
    return typeof value === 'string' ? value : `${value}`;
  }
}
