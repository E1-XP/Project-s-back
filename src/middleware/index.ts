import { injectable } from "inversify";
import {
  Request,
  Response,
  NextFunction,
  Errback
} from "express-serve-static-core";

import jwt, { VerifyCallback } from "jsonwebtoken";

@injectable()
export class Middlewares {
  authRequired(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies.token;

      jwt.verify(token, process.env.SECRET_KEY!, <VerifyCallback>(
        function(err, decoded: any) {
          if (err) console.log(err);
          if (decoded) {
            res.locals.userId = decoded.userId;
            next();
          } else {
            res.status(401).json({ message: "Please log in first" });
          }
        }
      ));
    } catch (err) {
      res.status(401).json({ message: "Please log in first" });
    }
  }
}
