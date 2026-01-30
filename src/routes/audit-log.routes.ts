import { Hono } from 'hono';
import { AuditLogController } from '../controllers';
import { authMiddleware } from '../middlewares';
import { Variables } from '../types';

import { ModuleKey } from '../constants/modules';
import { authorizeModule } from '../middlewares/auth-module.middleware';

const auditLogRoutes = new Hono<{ Variables: Variables }>();

auditLogRoutes.use('*', authMiddleware);

// List Logs
auditLogRoutes.get(
    '/',
    authorizeModule(ModuleKey.SYSTEM_LOGS),
    AuditLogController.list
);

export default auditLogRoutes;
