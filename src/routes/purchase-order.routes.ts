import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { PurchaseOrderController } from '../controllers';
import { createPOSchema, approvePOSchema } from '../validators';
import { ModuleKey } from '../constants/modules';
import { authorizeModule } from '../middlewares/auth-module.middleware';
import { authMiddleware, branchMiddleware } from '../middlewares';
import { Variables } from '../types';

const poRoutes = new Hono<{ Variables: Variables }>();

// All routes require auth
poRoutes.use('*', authMiddleware);

poRoutes.post(
    '/',
    branchMiddleware,
    authorizeModule(ModuleKey.CREATE_PO),
    zValidator('json', createPOSchema),
    PurchaseOrderController.create
);

poRoutes.post(
    '/from-pool',
    branchMiddleware,
    authorizeModule(ModuleKey.CREATE_PO),
    // Validator omitted for now, controller validates
    PurchaseOrderController.createFromPool
);

// List POs
poRoutes.get(
    '/',
    branchMiddleware, // Allow filtering by branch
    authorizeModule(ModuleKey.PURCHASE_ORDERS),
    PurchaseOrderController.list
);

poRoutes.get(
    '/:id',
    branchMiddleware,
    authorizeModule(ModuleKey.PURCHASE_ORDERS),
    PurchaseOrderController.getById
);

poRoutes.patch(
    '/:id/approve',
    branchMiddleware,
    authorizeModule(ModuleKey.PURCHASE_ORDERS),
    zValidator('json', approvePOSchema),
    PurchaseOrderController.approve
);

poRoutes.patch(
    '/:id/revert',
    branchMiddleware,
    authorizeModule(ModuleKey.PURCHASE_ORDERS),
    PurchaseOrderController.revert
);

poRoutes.patch(
    '/:id/items/:itemId',
    branchMiddleware,
    authorizeModule(ModuleKey.PURCHASE_ORDERS),
    PurchaseOrderController.patchItemQuantity
);

poRoutes.patch(
    '/:id',
    branchMiddleware,
    authorizeModule(ModuleKey.PURCHASE_ORDERS),
    PurchaseOrderController.update
);

poRoutes.patch(
    '/:id/cancel',
    branchMiddleware,
    authorizeModule(ModuleKey.PURCHASE_ORDERS),
    PurchaseOrderController.cancel
);

poRoutes.delete(
    '/:id',
    branchMiddleware,
    authorizeModule(ModuleKey.PURCHASE_ORDERS),
    PurchaseOrderController.delete
);

export default poRoutes;
