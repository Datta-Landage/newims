import { Hono } from 'hono';
import { SpecialOrderController } from '../controllers/special-order.controller';
import { authMiddleware, branchMiddleware } from '../middlewares';
import { Variables } from '../types';

import { ModuleKey } from '../constants/modules';
import { authorizeModule } from '../middlewares/auth-module.middleware';

const soRoutes = new Hono<{ Variables: Variables }>();

soRoutes.use('*', authMiddleware, branchMiddleware);

soRoutes.post('/', authorizeModule(ModuleKey.CREATE_PO), SpecialOrderController.create);
soRoutes.get('/', authorizeModule(ModuleKey.PURCHASE_ORDERS), SpecialOrderController.list);
soRoutes.patch('/:id/approve', authorizeModule(ModuleKey.PURCHASE_ORDERS), SpecialOrderController.approve);
soRoutes.patch('/:id/close', authorizeModule(ModuleKey.PURCHASE_ORDERS), SpecialOrderController.close);

export default soRoutes;
