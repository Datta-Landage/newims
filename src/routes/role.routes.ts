import { Hono } from 'hono';
import { RoleController } from '../controllers/role.controller';
import { authMiddleware } from '../middlewares';
import { authorizeModule } from '../middlewares/auth-module.middleware';
import { ModuleKey } from '../constants/modules';

const roleRoutes = new Hono();

roleRoutes.use('*', authMiddleware);

roleRoutes.get('/', authorizeModule(ModuleKey.USERS), RoleController.list);
roleRoutes.get('/:id', authorizeModule(ModuleKey.USERS), RoleController.get);
roleRoutes.put('/:id/modules', authorizeModule(ModuleKey.USERS), RoleController.updateModules);

export { roleRoutes };
