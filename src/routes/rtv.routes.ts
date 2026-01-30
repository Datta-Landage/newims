import { Hono } from 'hono';
import { RTVController } from '../controllers/rtv.controller';
import { authMiddleware, branchMiddleware } from '../middlewares';
import { Variables } from '../types';

import { ModuleKey } from '../constants/modules';
import { authorizeModule } from '../middlewares/auth-module.middleware';

const rtvRoutes = new Hono<{ Variables: Variables }>();

rtvRoutes.use('*', authMiddleware, branchMiddleware);

rtvRoutes.post('/', authorizeModule(ModuleKey.GRN_RTV), RTVController.create);
rtvRoutes.get('/', authorizeModule(ModuleKey.GRN_RTV), RTVController.list);
rtvRoutes.get('/:id', authorizeModule(ModuleKey.GRN_RTV), RTVController.getById);
rtvRoutes.patch('/:id', authorizeModule(ModuleKey.GRN_RTV), RTVController.update);

export default rtvRoutes;
