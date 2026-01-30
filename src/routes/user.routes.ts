import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { UserController } from '../controllers';
import { createUserSchema, updateUserSchema } from '../validators';
import { ModuleKey } from '../constants/modules';
import { authorizeModule } from '../middlewares/auth-module.middleware';
import { authMiddleware } from '../middlewares';
import { Variables } from '../types';

const userRoutes = new Hono<{ Variables: Variables }>();

userRoutes.use('*', authMiddleware);

userRoutes.post(
    '/',
    authorizeModule(ModuleKey.USERS),
    zValidator('json', createUserSchema),
    UserController.create
);

userRoutes.get(
    '/',
    authorizeModule(ModuleKey.USERS),
    UserController.list
);

userRoutes.get(
    '/:id',
    authorizeModule(ModuleKey.USERS),
    UserController.get
);

userRoutes.patch(
    '/:id',
    authorizeModule(ModuleKey.USERS),
    zValidator('json', updateUserSchema),
    UserController.update
);

userRoutes.delete(
    '/:id',
    authorizeModule(ModuleKey.USERS),
    UserController.delete
);

export default userRoutes;
