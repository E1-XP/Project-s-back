import { inject } from 'inversify';
import { controller, interfaces, httpPost } from 'inversify-express-utils';
import { container } from './../container';
import { TYPES } from './../container/types';

import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';

import db from '../models';

import { IValidateUserService } from './../services/validateUser';
import { ITokenService } from '../services/tokenService';
import { IErrorMiddleware } from './../middleware/error';

const { catchAsyncHTTP } = container.get<IErrorMiddleware>(
  TYPES.ErrorMiddleware,
);

@controller('/auth')
export class AuthController implements interfaces.Controller {
  constructor(
    @inject(TYPES.ValidateUserService)
    private validateUser: IValidateUserService,
    @inject(TYPES.TokenService) private tokenService: ITokenService,
  ) {}

  @httpPost('/login')
  @catchAsyncHTTP
  async login(req: Request, res: Response, next: NextFunction) {
    const { email, password } = req.body;

    if (!this.validateUser.run(req.body)) {
      return res.status(401).json({ message: 'invalid data provided' });
    }

    const user = await db.models.User.findOne({ where: { email } });
    if (!user) {
      return res
        .status(401)
        .json({ message: 'user/password combination not found' });
    }
    if (bcrypt.compareSync(password, user.password)) {
      const { id } = user;

      const accessToken = this.tokenService.createAccessToken(id!);
      const refreshToken = await this.tokenService.createRefreshToken(id!);

      res.cookie('accesstoken', accessToken, { httpOnly: true });
      res.cookie('refreshtoken', refreshToken, { httpOnly: true });

      res.status(200).json({ message: 'success', id });
    } else {
      return res
        .status(401)
        .json({ message: 'user/password combination not found' });
    }
  }

  @httpPost('/signup')
  @catchAsyncHTTP
  async signup(req: Request, res: Response) {
    if (!this.validateUser.run(req.body)) {
      return res.status(401).json({ message: 'invalid data provided' });
    }

    const possibleDuplicate = await db.models.User.findOne({
      where: { email: req.body.email },
    });

    if (possibleDuplicate) {
      return res
        .status(409)
        .json({ message: 'user with same email already exist' });
    }

    const user = await db.models.User.create(req.body);
    const { email, username, id } = user;

    await this.tokenService.createRefreshTokenCounter(id!);

    const accessToken = this.tokenService.createAccessToken(id!);
    const refreshToken = await this.tokenService.createRefreshToken(id!);

    res.cookie('accesstoken', accessToken, { httpOnly: true });
    res.cookie('refreshtoken', refreshToken, { httpOnly: true });

    res.status(200).json({ email, username, id });
  }

  @httpPost('/emailcheck')
  @catchAsyncHTTP
  async emailCheck(req: Request, res: Response) {
    const possibleDuplicate = await db.models.User.findOne({
      where: { email: req.body.email },
    });

    if (possibleDuplicate) {
      return res
        .status(409)
        .json({ message: 'user with same email already exist' });
    }

    res.status(200).json({ message: 'success' });
  }

  @httpPost('/pagerefresh', TYPES.AuthMiddleware)
  @catchAsyncHTTP
  async handlePageRefresh(req: Request, res: Response) {
    // job done by middleware
    const { userId } = res.locals;

    const user = await db.models.User.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(401).json({ message: 'invalid data provided' });
    }

    const { email, username, id } = user;

    res.status(200).json({ email, username, id });
  }

  @httpPost('/logout')
  logout(req: Request, res: Response) {
    res.clearCookie('accesstoken');
    res.clearCookie('refreshtoken');

    res.status(200).json({ message: 'success' });
  }
}
