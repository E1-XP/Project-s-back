import { injectable } from "inversify";
export interface RequestBody {
  email: string;
  username: string;
  password: string;
}

export interface IValidateUserService {
  run: (data: RequestBody) => boolean;
}

@injectable()
export class ValidateUserService implements IValidateUserService {
  private emailRegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  private usernameRegExp = /^([a-zA-Z0-9_-]){2,32}$/;
  private passwordRegExp = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/;

  run(data: RequestBody) {
    return this.validate(data);
  }

  private validate(data: RequestBody) {
    const { email, username, password } = data;

    if (email && !new RegExp(this.emailRegExp).test(email)) {
      return false;
    }
    if (username && !new RegExp(this.usernameRegExp).test(username)) {
      return false;
    }
    if (password && !new RegExp(this.passwordRegExp).test(password)) {
      return false;
    }

    return true;
  }
}
