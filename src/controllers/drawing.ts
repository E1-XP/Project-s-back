import db from '../models';

export interface PointsGroup {
    name: string;
    room: number;
    arrayGroup: number;
    x: number;
    y: number;
    fill: string;
    weight: number;
}

export interface DrawingController {

}

export class DrawingController implements DrawingController {
    getRoomDrawingPoints = async (roomId: string) => {
        const RoomDrawingPoints = await db.models.DrawingPoints
            .findAll({ where: { roomId } });

        return RoomDrawingPoints;
    }

    savePointsGroup = async (data: PointsGroup[]) => {

        console.log('RECEIVED DATA:', data);
        await db.models.DrawingPoints.bulkCreate(data);
    }

    resetDrawing = async (roomId: string) => {
        await db.models.DrawingPoints.destroy({ where: { roomId } });
    }
}
