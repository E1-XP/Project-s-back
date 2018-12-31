import { inject } from "inversify";
import { controller, interfaces, httpPost } from "inversify-express-utils";
import { container } from "./../container";
import { TYPES } from "./../container/types";

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Request, Response } from "express-serve-static-core";

import db from "../models";

import { IValidateUserService } from "./../services/validateUser";

@controller("/auth")
export class AuthController implements interfaces.Controller {
  constructor(
    @inject(TYPES.ValidateUserService)
    private validateUser: IValidateUserService
  ) {}

  @httpPost("/login")
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      console.log(req.body);

      if (!this.validateUser.run(req.body)) {
        return res.status(401).json({ message: "invalid data provided" });
      }

      const user = await db.models.User.findOne({ where: { email } });
      if (!user) {
        return res
          .status(401)
          .json({ message: "user/password combination not found" });
      } else {
        if (bcrypt.compareSync(password, user.password)) {
          const { id } = user;

          const payload = {
            userId: id,
            expires: Date.now() + parseInt(process.env.JWT_EXPIRATION_PERIOD!)
          };
          const token = jwt.sign(payload, process.env.SECRET_KEY!);

          res.cookie("token", token, { httpOnly: true });
          res.status(200).json({ message: "success", id });
        }
      }
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "internal server error" });
    }
  }

  @httpPost("/signup")
  async signup(req: Request, res: Response) {
    try {
      console.log(req.body);

      if (!this.validateUser.run(req.body)) {
        return res.status(401).json({ message: "invalid data provided" });
      }

      const possibleDuplicate = await db.models.User.findOne({
        where: { email: req.body.email }
      });

      if (possibleDuplicate) {
        return res
          .status(409)
          .json({ message: "user with same email already exist" });
      }

      const user = await db.models.User.create(req.body);
      const { email, username, id } = user;

      const payload = {
        userId: id,
        expires: Date.now() + parseInt(process.env.JWT_EXPIRATION_PERIOD!)
      };
      const token = jwt.sign(payload, process.env.SECRET_KEY!);

      res.cookie("token", token, { httpOnly: true });
      res.status(200).json({ email, username, id });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "internal server error" });
    }
  }

  @httpPost("/emailcheck")
  async emailCheck(req: Request, res: Response) {
    try {
      const possibleDuplicate = await db.models.User.findOne({
        where: { email: req.body.email }
      });

      if (possibleDuplicate) {
        return res
          .status(409)
          .json({ message: "user with same email already exist" });
      } else {
        res.status(200).json({ message: "success" });
      }
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "internal server error" });
    }
  }

  @httpPost("/pagerefresh", container.get<any>(TYPES.Middlewares).authRequired)
  async handlePageRefresh(req: Request, res: Response) {
    try {
      //job done by middleware
      const { userId } = res.locals;

      const user = await db.models.User.findOne({ where: { id: userId } });
      if (!user) {
        return res.status(401).json({ message: "invalid data provided" });
      }
      const { email, username, id } = user;

      res.status(200).json({ email, username, id });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "internal server error" });
    }
  }

  @httpPost("/logout")
  logout(req: Request, res: Response) {
    res.clearCookie("token");

    res.status(200).json({ message: "success" });
  }
}
