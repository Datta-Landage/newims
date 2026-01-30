import { Hono } from 'hono';
import { InventoryStock } from '../models';
import { authMiddleware, branchMiddleware } from '../middlewares';
import { Variables } from '../types';

import { InventoryController } from '../controllers/inventory.controller';

import { ModuleKey } from '../constants/modules';
import { authorizeModule } from '../middlewares/auth-module.middleware';

const inventoryRoutes = new Hono<{ Variables: Variables }>();

inventoryRoutes.use('*', authMiddleware, branchMiddleware);

inventoryRoutes.get('/', authorizeModule(ModuleKey.INVENTORY_MASTER), InventoryController.list);
inventoryRoutes.post('/adjust', authorizeModule(ModuleKey.INVENTORY_MASTER), InventoryController.adjust);

export default inventoryRoutes;
