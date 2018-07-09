import { Router, Request, Response } from 'express';
const router = Router({ mergeParams: true });

import authRoutes from './auth';

router.get('/', (req: Request, res: Response) =>
    res.status(200).json({ message: 'welcome to project-s' }));

router.use('/auth', authRoutes);

export default router;

