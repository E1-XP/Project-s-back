import { Router } from 'express';
const router = Router({ mergeParams: true });

import { UserController } from '../controllers/user';
const user = new UserController();

router.get('/drawings', user.getDrawings);

router.post('/drawings', user.createDrawing);

export default router;
