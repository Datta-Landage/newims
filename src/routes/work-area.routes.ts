import { Hono } from 'hono';
import { WorkAreaController } from '../controllers';
import { authMiddleware } from '../middlewares';

import { ModuleKey } from '../constants/modules';
import { authorizeModule } from '../middlewares/auth-module.middleware';

const workAreaRoutes = new Hono();

workAreaRoutes.use('*', authMiddleware);

workAreaRoutes.post(
    '/',
    authorizeModule(ModuleKey.WORK_AREAS),
    WorkAreaController.create
);

workAreaRoutes.get(
    '/',
    WorkAreaController.list
);

workAreaRoutes.get(
    '/:id',
    authorizeModule(ModuleKey.WORK_AREAS),
    WorkAreaController.getById
);

workAreaRoutes.patch(
    '/:id',
    authorizeModule(ModuleKey.WORK_AREAS),
    WorkAreaController.update
);

workAreaRoutes.delete(
    '/:id',
    authorizeModule(ModuleKey.WORK_AREAS),
    WorkAreaController.delete
);

export default workAreaRoutes;
