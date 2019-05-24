import { Container } from 'inversify';
import { TYPES } from './types';

import { AuthMiddleware, IAuthMiddleware } from '../middleware/auth';
import { ErrorMiddleware, IErrorMiddleware } from '../middleware/error';
import {
  ValidateUserService,
  IValidateUserService,
} from './../services/validateUser';
import { ITokenService, TokenService } from '../services/tokenService';

export const container = new Container();

container
  .bind<IAuthMiddleware>(TYPES.AuthMiddleware)
  .to(AuthMiddleware)
  .inSingletonScope();

container
  .bind<IErrorMiddleware>(TYPES.ErrorMiddleware)
  .to(ErrorMiddleware)
  .inSingletonScope();

container
  .bind<IValidateUserService>(TYPES.ValidateUserService)
  .to(ValidateUserService)
  .inSingletonScope();

container
  .bind<ITokenService>(TYPES.TokenService)
  .to(TokenService)
  .inSingletonScope();
