import fs from "fs";
import path from "path";
import { Request, Response } from "express-serve-static-core";
import { controller, httpPost } from "inversify-express-utils";

import { container } from "./../container";
import { TYPES } from "./../container/types";

import db from "../models";

import { DrawingPoint, DrawingPointsInstance } from "../models/drawingpoints";

export interface IDrawingController {
  getRoomDrawingPoints: (v: number) => Promise<DrawingPointsInstance[]>;
  getRoomDrawingPointsGroup: (
    user: number,
    drawing: number,
    group: number
  ) => Promise<DrawingPoint[]>;
  savePointsBulk: (data: DrawingPoint[]) => Promise<any>;
  replaceDrawingPointsGroup: (group: DrawingPoint[]) => Promise<any>;
  saveAsJPEG: (req: Request, res: Response) => void;
  resetDrawing: (v: number) => Promise<any>;
}

@controller(
  "/rooms/:roomid/drawing",
  container.get<any>(TYPES.Middlewares).authRequired
)
export class DrawingController implements IDrawingController {
  async getRoomDrawingPoints(drawingId: number) {
    const RoomDrawingPoints = await db.models.DrawingPoints.findAll({
      where: { drawingId }
    });

    return RoomDrawingPoints;
  }

  async getRoomDrawingPointsGroup(
    userId: number,
    drawingId: number,
    group: number
  ) {
    const pointsGroup = await db.models.DrawingPoints.findAll({
      where: { userId, drawingId, group }
    });

    return pointsGroup;
  }

  async savePointsBulk(data: DrawingPoint[]) {
    await db.models.DrawingPoints.bulkCreate(data);
  }

  async replaceDrawingPointsGroup(correctGroup: DrawingPoint[]) {
    const idArr = correctGroup.map(p => p.id);

    await db.models.DrawingPoints.destroy({ where: { id: { $in: idArr } } });
    await db.models.DrawingPoints.bulkCreate(correctGroup);
  }

  @httpPost("/save")
  saveAsJPEG(req: Request, res: Response) {
    const { image, drawingId } = req.body;

    const dirPath = path.join(__dirname, `../../public/images`);

    image.replace(/^data:image\/\w+;base64,/, "");
    const data = image.slice(image.indexOf(",") + 1).replace(/\s/g, "+");
    const buff = Buffer.from(data, "base64");

    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);

    fs.writeFileSync(`${dirPath}/${drawingId}.jpg`, buff);

    console.log("file saved");
    res.status(200).json({ message: "success" });
  }

  async resetDrawing(drawingId: number) {
    await db.models.DrawingPoints.destroy({ where: { drawingId } });
  }
}
