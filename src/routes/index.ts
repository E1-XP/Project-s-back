import { Router, Request, Response } from 'express';
const router = Router({ mergeParams: true });

import authRoutes from './auth';
import drawRoutes from './draw';

router.get('/', (req: Request, res: Response) =>
    res.status(200).json({ message: 'welcome to project-s' }));

router.use('/auth', authRoutes);

router.use('/rooms/:roomid/drawing', drawRoutes);

export default router;

