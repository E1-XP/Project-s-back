import { injectable } from "inversify";
import { Socket, Server } from "socket.io";

import { DrawingPoint, DrawingPointsInstance } from "./../models/drawingpoints";
import { RoomJoinData } from "./../services/socketRoom";

import db from "./../models";
import { redisDB } from "./../models/redis";

export interface RoomDrawResetData {
  userId: number;
  drawingId: number;
}

export interface ISocketDrawingService {
  roomId: string | null;
  onDraw: (point: DrawingPoint) => void;
  onMouseUp: (data: string) => void;
  onSendCorrectGroup: (data: string) => void;
  onDrawChange: (data: RoomJoinData) => void;
  onDrawReset: (data: RoomDrawResetData) => void;
  getRoomDrawingPoints(drawingId: number): Promise<DrawingPointsInstance[]>;
}

@injectable()
export class SocketDrawingService implements ISocketDrawingService {
  cachedPoints: DrawingPoint[] = [];
  roomId: string | null = null;

  constructor(private socket: Socket, private server: Server) {}

  onDraw(point: DrawingPoint) {
    if (!this.roomId) throw new Error("roomId not found");

    this.socket.broadcast.to(this.roomId).emit(`${this.roomId}/draw`, point);
    this.cachedPoints.push(point);
  }

  onMouseUp(data: string) {
    if (!this.roomId) throw new Error("roomId not found");

    if (this.isGroupSameLengthAndOrderCheck(data, this.cachedPoints)) {
      // perform check on other users
      this.socket.broadcast.emit(`${this.roomId}/drawgroupcheck`, data);
    } else {
      console.log("incorrect data");

      const groupInfo = data
        .split("|")
        .slice(0, 3)
        .map(Number);

      this.socket.emit(`${this.roomId}/resendcorrectdrawdata`, groupInfo);
      this.socket.once(
        `${this.roomId}/resendcorrectdrawdata`,
        async correctGroup => {
          if (!this.roomId) throw new Error("roomId not found");
          if (!correctGroup.length) return;

          await this.replaceDrawingPointsGroup(correctGroup);

          this.socket.broadcast
            .to(this.roomId)
            .emit(`${this.roomId}/sendcorrectgroup`, correctGroup);
        }
      );
    }

    this.savePointsBulk(this.cachedPoints);
    this.cachedPoints = [];
  }

  async onSendCorrectGroup(data: string) {
    const [userIdStr, drawingIdStr, groupStr, tstamps] = data.split("|");
    const test = tstamps.split(".").map(str => Number(str));

    const correctGroup = await this.getRoomDrawingPointsGroup(
      Number(userIdStr),
      Number(drawingIdStr),
      Number(groupStr)
    );

    if (correctGroup.length === test.length) {
      this.socket.emit(`${this.roomId}/sendcorrectgroup`, correctGroup);
    }
  }

  async onDrawChange(data: RoomJoinData) {
    const { roomId, drawingId } = data;

    const existingDrawingPoints = await this.getRoomDrawingPoints(drawingId);
    redisDB.set(`${roomId}/drawingid`, String(drawingId));

    this.socket.broadcast.to(roomId).emit(`${roomId}/draw/change`, drawingId);
    this.socket
      .to(roomId)
      .emit(`${roomId}/draw/getexisting`, existingDrawingPoints);
  }

  onDrawReset(data: RoomDrawResetData) {
    if (!this.roomId) throw new Error("roomId not found");

    const { drawingId, userId } = data;

    this.server.to(this.roomId).emit(`${this.roomId}/draw/reset`, userId);
    this.resetDrawing(drawingId);
  }

  private isGroupSameLengthAndOrderCheck(
    data: string,
    cachedPoints: DrawingPoint[]
  ) {
    const [userIdStr, drawingIdStr, groupStrStr, tstamps] = data.split("|");
    const test = tstamps.split(".").map(Number);

    if (!cachedPoints.length || cachedPoints.length !== test.length) {
      return false;
    }

    return test.every((tstamp, i) => tstamp === cachedPoints[i].date);
  }

  async getRoomDrawingPoints(drawingId: number) {
    const RoomDrawingPoints = await db.models.DrawingPoints.findAll({
      where: { drawingId }
    });

    return RoomDrawingPoints;
  }

  private async getRoomDrawingPointsGroup(
    userId: number,
    drawingId: number,
    group: number
  ) {
    const pointsGroup = await db.models.DrawingPoints.findAll({
      where: { userId, drawingId, group }
    });

    return pointsGroup;
  }

  private async replaceDrawingPointsGroup(correctGroup: DrawingPoint[]) {
    const idArr = correctGroup.map(p => p.id);

    await db.models.DrawingPoints.destroy({ where: { id: { $in: idArr } } });
    await db.models.DrawingPoints.bulkCreate(correctGroup);
  }

  private async savePointsBulk(data: DrawingPoint[]) {
    await db.models.DrawingPoints.bulkCreate(data);
  }

  private async resetDrawing(drawingId: number) {
    await db.models.DrawingPoints.destroy({ where: { drawingId } });
  }
}
