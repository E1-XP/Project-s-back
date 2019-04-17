import fs from "fs";
import path from "path";
import { Request, Response } from "express-serve-static-core";
import { controller, httpPost } from "inversify-express-utils";

import { container } from "./../container";
import { TYPES } from "./../container/types";

export interface IDrawingController {
  saveAsJPEG: (req: Request, res: Response) => void;
}

@controller(
  "/drawings/:drawingId",
  container.get<any>(TYPES.Middlewares).authRequired
)
export class DrawingController implements IDrawingController {
  @httpPost("/save")
  saveAsJPEG(req: Request, res: Response) {
    const { drawingId } = req.query;
    const { image } = req.body;

    const dirPath = path.join(__dirname, `../../public/images`);

    image.replace(/^data:image\/\w+;base64,/, "");
    const data = image.slice(image.indexOf(",") + 1).replace(/\s/g, "+");
    const buff = Buffer.from(data, "base64");

    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);

    fs.writeFileSync(`${dirPath}/${drawingId}.jpg`, buff);

    console.log("file saved");
    res.status(200).json({ message: "success" });
  }
}
