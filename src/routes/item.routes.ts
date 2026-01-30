import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { ItemController } from '../controllers';
import { createItemSchema, updateItemSchema } from '../validators';
import { authMiddleware } from '../middlewares';
import { Variables } from '../types';

import { ModuleKey } from '../constants/modules';
import { authorizeModule } from '../middlewares/auth-module.middleware';

const itemRoutes = new Hono<{ Variables: Variables }>();

itemRoutes.use('*', authMiddleware);

itemRoutes.post(
    '/',
    authorizeModule(ModuleKey.INVENTORY_MASTER),
    zValidator('json', createItemSchema),
    ItemController.create
);

itemRoutes.get(
    '/',
    authorizeModule(ModuleKey.INVENTORY_MASTER),
    ItemController.list
);

itemRoutes.get(
    '/:id',
    authorizeModule(ModuleKey.INVENTORY_MASTER),
    ItemController.get
);

itemRoutes.patch(
    '/:id',
    authorizeModule(ModuleKey.INVENTORY_MASTER),
    zValidator('json', updateItemSchema),
    ItemController.update
);

itemRoutes.delete(
    '/:id',
    authorizeModule(ModuleKey.INVENTORY_MASTER),
    ItemController.delete
);

export default itemRoutes;
