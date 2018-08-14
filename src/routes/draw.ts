import { Router } from 'express';
const router = Router({ mergeParams: true });

import { DrawingController } from '../controllers/drawing';
const drawing = new DrawingController();

router.post('/save', drawing.saveAsJPEG);

export default router;
