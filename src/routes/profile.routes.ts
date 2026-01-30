import { Hono } from 'hono';
import { ProfileController } from '../controllers/profile.controller';
import { authMiddleware } from '../middlewares';

const profileRoutes = new Hono();

profileRoutes.use('*', authMiddleware);

profileRoutes.get('/me', ProfileController.getMe);
profileRoutes.put('/change-password', ProfileController.changePassword);

export default profileRoutes;
