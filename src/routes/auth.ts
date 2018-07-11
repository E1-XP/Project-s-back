import { Router } from 'express';
const router = Router({ mergeParams: true });

import { AuthController } from '../controllers/auth';

const auth = new AuthController();

router.post('/signup', auth.signup);

router.post('/login', auth.login);

router.post('/sessionauth', auth.sessionAuth);

router.post('/logout', auth.logout);

export default router;
