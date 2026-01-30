import { Hono } from 'hono';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middlewares';

const dashboardRoutes = new Hono();

dashboardRoutes.use('*', authMiddleware);

dashboardRoutes.get('/stats', DashboardController.getStats);

export default dashboardRoutes;
