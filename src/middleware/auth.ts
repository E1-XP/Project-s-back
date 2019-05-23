import { injectable, inject } from 'inversify';
import { BaseMiddleware } from 'inversify-express-utils';
import { TYPES } from './../container/types';

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { ITokenService } from '../services/tokenService';
import { TokenPayload, RefreshTokenPayload } from './../services/tokenService';

export interface IAuthMiddleware {
  handler(req: Request, res: Response, next: NextFunction): void;
}

@injectable()
export class AuthMiddleware extends BaseMiddleware implements IAuthMiddleware {
  @inject(TYPES.TokenService) private tokenService!: ITokenService;

  async handler(req: Request, res: Response, next: NextFunction) {
    try {
      const accessToken = req.cookies.accesstoken;

      if (!accessToken) {
        res.status(401).json({ message: 'Please log in first' });
      }

      const payload = jwt.verify(
        accessToken,
        process.env.SECRET_KEY!,
      ) as TokenPayload;

      res.locals.userId = payload.userId;
      next();
    } catch (err) {
      console.log(err);

      const isTokenIssued = await this.issueNewAccessToken(req, res);
      if (isTokenIssued) return next();

      res.status(401).json({ message: 'Please log in first' });
    }
  }

  private async issueNewAccessToken(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies.refreshtoken;
      if (!refreshToken) return false;

      const refreshPayload = jwt.verify(
        refreshToken,
        process.env.SECRET_KEY!,
      ) as RefreshTokenPayload;

      const { userId, count } = refreshPayload;
      res.locals.userId = userId;

      const tokenCount = await this.tokenService.getRefreshTokenCount(userId);
      if (count !== tokenCount) return false;

      const accessToken = this.tokenService.createAccessToken(userId);
      res.cookie('accesstoken', accessToken, { httpOnly: true });

      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  }
}
