import { Router } from 'express';
const router = Router({ mergeParams: true });

import { RoomController } from '../controllers/room';
const room = new RoomController();

router.post('/checkpassword', room.checkPassword);

export default router;
