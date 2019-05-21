import { Container } from 'inversify';
import { TYPES } from './types';

import { Middlewares } from './../middleware';
import {
  ValidateUserService,
  IValidateUserService,
} from './../services/validateUser';

export const container = new Container();

container
  .bind(TYPES.Middlewares)
  .to(Middlewares)
  .inSingletonScope();

container
  .bind<IValidateUserService>(TYPES.ValidateUserService)
  .to(ValidateUserService)
  .inSingletonScope();
