import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { AuthController } from '../controllers';
import { loginSchema, refreshTokenSchema } from '../validators';

const authRoutes = new Hono();

authRoutes.post('/login', zValidator('json', loginSchema), AuthController.login);
// Refresh token can come from body or cookie, so we handle validation in controller
authRoutes.post('/refresh', AuthController.refreshToken);
authRoutes.post('/logout', AuthController.logout);

export default authRoutes;
