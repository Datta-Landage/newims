import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { CategoryController } from '../controllers';
import { createCategorySchema } from '../validators';
import { authMiddleware } from '../middlewares';

import { ModuleKey } from '../constants/modules';
import { authorizeModule } from '../middlewares/auth-module.middleware';

const categoryRoutes = new Hono();

categoryRoutes.use('*', authMiddleware);

categoryRoutes.post(
    '/',
    authorizeModule(ModuleKey.INVENTORY_MASTER),
    zValidator('json', createCategorySchema),
    CategoryController.create
);

categoryRoutes.get(
    '/',
    authorizeModule(ModuleKey.INVENTORY_MASTER),
    CategoryController.list
);

export default categoryRoutes;
