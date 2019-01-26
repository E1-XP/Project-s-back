import { container } from "./../container";
import { Request, Response } from "express-serve-static-core";
import {
  getRouteInfo,
  controller,
  interfaces,
  httpGet
} from "inversify-express-utils";

import { AuthController } from "./auth";
import { DrawingController } from "./drawing";
import { RoomController } from "./room";
import { UserController } from "./user";

@controller("/")
class EntryController implements interfaces.Controller {
  @httpGet("/")
  handleEntry(req: Request, res: Response) {
    res.json({
      message: "welcome to project-s backend",
      routes: getRouteInfo(container)
    });
  }
}

export {
  EntryController,
  AuthController,
  DrawingController,
  RoomController,
  UserController
};
