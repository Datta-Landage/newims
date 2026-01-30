import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { VendorController } from '../controllers';
import { createVendorSchema, updateVendorSchema } from '../validators';
import { authMiddleware } from '../middlewares';
import { Variables } from '../types';

import { ModuleKey } from '../constants/modules';
import { authorizeModule } from '../middlewares/auth-module.middleware';

const vendorRoutes = new Hono<{ Variables: Variables }>();

vendorRoutes.use('*', authMiddleware);

vendorRoutes.post(
    '/',
    authorizeModule(ModuleKey.VENDOR_MANAGEMENT),
    zValidator('json', createVendorSchema),
    VendorController.create
);

vendorRoutes.get(
    '/',
    authorizeModule(ModuleKey.VENDOR_MANAGEMENT),
    VendorController.list
);

vendorRoutes.get(
    '/:id',
    authorizeModule(ModuleKey.VENDOR_MANAGEMENT),
    VendorController.get
);

vendorRoutes.patch(
    '/:id',
    authorizeModule(ModuleKey.VENDOR_MANAGEMENT),
    zValidator('json', updateVendorSchema),
    VendorController.update
);

vendorRoutes.delete(
    '/:id',
    authorizeModule(ModuleKey.VENDOR_MANAGEMENT),
    VendorController.delete
);

export default vendorRoutes;
