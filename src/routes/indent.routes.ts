import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { IndentController } from '../controllers';
import { createIndentSchema, issueIndentSchema } from '../validators';
import { authMiddleware, branchMiddleware } from '../middlewares';
import { Variables } from '../types';
import { ModuleKey } from '../constants/modules';
import { authorizeModule } from '../middlewares/auth-module.middleware';

const indentRoutes = new Hono<{ Variables: Variables }>();

indentRoutes.use('*', authMiddleware);

// Indent

// ...

// Indent
indentRoutes.post(
    '/',
    branchMiddleware,
    authorizeModule(ModuleKey.CREATE_INDENT),
    zValidator('json', createIndentSchema),
    IndentController.create
);

indentRoutes.get(
    '/:id',
    authorizeModule([ModuleKey.CREATE_INDENT, ModuleKey.APPROVE_INDENTS, ModuleKey.ISSUE_STOCK, ModuleKey.CREATE_PO, ModuleKey.PURCHASE_ORDERS]),
    IndentController.get
);

indentRoutes.get(
    '/',
    authorizeModule([ModuleKey.CREATE_INDENT, ModuleKey.APPROVE_INDENTS, ModuleKey.ISSUE_STOCK, ModuleKey.CREATE_PO, ModuleKey.PURCHASE_ORDERS]),
    IndentController.list
);

indentRoutes.get(
    '/procurement-pool',
    branchMiddleware,
    authorizeModule([ModuleKey.CREATE_PO, ModuleKey.PURCHASE_ORDERS]),
    IndentController.getProcurementPool
);

indentRoutes.patch(
    '/:id/approve',
    branchMiddleware,
    authorizeModule(ModuleKey.APPROVE_INDENTS),
    IndentController.approve
);

indentRoutes.patch(
    '/:id/reject',
    branchMiddleware,
    authorizeModule(ModuleKey.APPROVE_INDENTS),
    IndentController.reject
);

indentRoutes.patch(
    '/:id/cancel',
    branchMiddleware,
    authorizeModule([ModuleKey.CREATE_INDENT, ModuleKey.APPROVE_INDENTS]),
    IndentController.cancel
);

// Indent Item Management
indentRoutes.patch(
    '/items/:itemId',
    branchMiddleware,
    authorizeModule(ModuleKey.CREATE_INDENT),
    IndentController.updateItem
);

indentRoutes.delete(
    '/items/:itemId',
    branchMiddleware,
    authorizeModule(ModuleKey.CREATE_INDENT),
    IndentController.deleteItem
);

indentRoutes.post(
    '/:id/issue-stock',
    branchMiddleware,
    authorizeModule(ModuleKey.ISSUE_STOCK),
    IndentController.issueStock
);

export default indentRoutes;
