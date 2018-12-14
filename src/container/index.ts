import { Container } from "inversify";
import { TYPES } from "./types";

import {
  ValidateUserService,
  IValidateUserService
} from "./../services/validateUser";

export const container = new Container();

container
  .bind<IValidateUserService>(TYPES.ValidateUserService)
  .to(ValidateUserService)
  .inSingletonScope();
