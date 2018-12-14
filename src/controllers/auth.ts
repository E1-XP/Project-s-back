import { inject } from "inversify";
import { controller, interfaces, httpPost } from "inversify-express-utils";
import { TYPES } from "./../container/types";

import bcrypt from "bcrypt";
import { Request, Response } from "express-serve-static-core";

import db from "../models";

import { IValidateUserService } from "./../services/validateUser";

interface RequestWithSession extends Request {
  session?: any;
}

@controller("/auth")
export class AuthController implements interfaces.Controller {
  constructor(
    @inject(TYPES.ValidateUserService)
    private validateUser: IValidateUserService
  ) {}

  @httpPost("/login")
  async login(req: RequestWithSession, res: Response) {
    const { email, password } = req.body;
    console.log(req.body);

    // if (!this.validateUser.run(req.body)) {
    //   return res.status(401).json({ message: "invalid data provided" });
    // }

    try {
      const user: any = await db.models.User.findOne({ where: { email } });
      if (!user)
        return res
          .status(401)
          .json({ message: "user/password combination not found" });
      else {
        if (bcrypt.compareSync(password, user.password)) {
          req.session.user = user.id;

          const { email, username, id } = user;
          const userData = { email, username, id };

          res.status(200).json(userData);
        }
      }
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "internal server error" });
    }
  }

  @httpPost("/signup")
  async signup(req: RequestWithSession, res: Response): Promise<any> {
    console.log(req.body);

    //if (!this.validate(req.body)) return res.status(401).json({ 'message': 'invalid data provided' });

    try {
      const possibleDuplicate: any = await db.models.User.findOne({
        where: { email: req.body.email }
      });
      if (possibleDuplicate)
        res.status(409).json({ message: "user with same email already exist" });

      const user: any = await db.models.User.create(req.body);
      req.session.user = user.id;

      const { email, username, id } = user;
      const userData = { email, username, id };

      res.status(200).json(userData);
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "internal server error" });
    }
  }

  @httpPost("/logout")
  logout(req: RequestWithSession, res: Response) {
    if (req.session) req.session.reset();

    res.status(200).json({ message: "success" });
  }

  @httpPost("/sesionauth")
  async sessionAuth(req: RequestWithSession, res: Response) {
    if (req.session.user) {
      const userId = req.session.user;

      const user: any = await db.models.User.find({ where: { id: userId } });
      if (!user)
        return res
          .status(401)
          .json({ message: "user/password combination not found" });

      const { email, username, id } = user;
      const userData = { email, username, id };

      res.status(200).json(userData);
    } else
      res.status(401).json({ message: "user/password combination not found" });
  }
}
