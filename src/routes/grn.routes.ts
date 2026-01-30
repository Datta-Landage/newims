import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { GRNController } from '../controllers';
import { createGRNSchema } from '../validators';
import { authMiddleware, branchMiddleware } from '../middlewares';
import { Variables } from '../types';

import { ModuleKey } from '../constants/modules';
import { authorizeModule } from '../middlewares/auth-module.middleware';

const grnRoutes = new Hono<{ Variables: Variables }>();

grnRoutes.use('*', authMiddleware);

grnRoutes.post(
    '/',
    branchMiddleware,
    authorizeModule(ModuleKey.GRN_RTV),
    zValidator('json', createGRNSchema),
    GRNController.create
);

grnRoutes.get(
    '/',
    authorizeModule(ModuleKey.GRN_RTV),
    GRNController.list
);

grnRoutes.get(
    '/:id',
    authorizeModule(ModuleKey.GRN_RTV),
    GRNController.getById
);

export default grnRoutes;
