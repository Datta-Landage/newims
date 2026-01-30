import { Hono } from 'hono';
import authRoutes from './auth.routes';
import poRoutes from './purchase-order.routes';
import grnRoutes from './grn.routes';
import indentRoutes from './indent.routes';
import inventoryRoutes from './inventory.routes';
import userRoutes from './user.routes';
import vendorRoutes from './vendor.routes';
import auditLogRoutes from './audit-log.routes';
import itemRoutes from './item.routes';
import categoryRoutes from './category.routes';
import branchRoutes from './branch.routes';
import workAreaRoutes from './work-area.routes';
import { roleRoutes } from './role.routes';
import dashboardRoutes from './dashboard.routes';
import profileRoutes from './profile.routes';
import reportRoutes from './report.routes';
import rtvRoutes from './rtv.routes';
import soRoutes from './special-order.routes';
import { errorHandler } from '../middlewares/error.middleware';

const api = new Hono();

api.route('/auth', authRoutes);
api.route('/purchase-orders', poRoutes);
api.route('/grn', grnRoutes);
api.route('/indents', indentRoutes);
api.route('/inventory', inventoryRoutes);
api.route('/audit-logs', auditLogRoutes);
api.route('/branches', branchRoutes);
api.route('/users', userRoutes);
api.route('/vendors', vendorRoutes);
api.route('/items', itemRoutes);
api.route('/categories', categoryRoutes);
api.route('/work-areas', workAreaRoutes);
api.route('/roles', roleRoutes);
api.route('/dashboard', dashboardRoutes);
api.route('/profile', profileRoutes);
api.route('/reports', reportRoutes);
api.route('/rtv', rtvRoutes);
api.route('/special-orders', soRoutes);

api.onError(errorHandler);

export default api;
