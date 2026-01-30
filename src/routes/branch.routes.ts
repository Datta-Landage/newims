import { Hono } from 'hono';
import { BranchController } from '../controllers';
import { authMiddleware } from '../middlewares';
import { zValidator } from '@hono/zod-validator';
import { updateBranchSchema } from '../validators';

import { ModuleKey } from '../constants/modules';
import { authorizeModule } from '../middlewares/auth-module.middleware';

const branchRoutes = new Hono();

branchRoutes.use('*', authMiddleware);

branchRoutes.get(
    '/',
    BranchController.list
);

branchRoutes.post(
    '/',
    authorizeModule(ModuleKey.BRANCHES),
    BranchController.create
);

branchRoutes.patch(
    '/:id',
    authorizeModule(ModuleKey.BRANCHES),
    zValidator('json', updateBranchSchema),
    BranchController.update
);

export default branchRoutes;
