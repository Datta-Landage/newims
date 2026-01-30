import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
    action: string;
    entity: string;
    entityId?: mongoose.Types.ObjectId; // Optional, as some actions might not be tied to a specific entity ID immediately or are global
    performedBy: mongoose.Types.ObjectId;
    details?: any;
    timestamp: Date;
    tenantId: string;
    branchId?: mongoose.Types.ObjectId;
}

const AuditLogSchema = new Schema<IAuditLog>(
    {
        action: { type: String, required: true }, // e.g., 'CREATE_USER', 'UPDATE_PO', 'DELETE_ITEM'
        entity: { type: String, required: true }, // e.g., 'User', 'PurchaseOrder', 'Item'
        entityId: { type: Schema.Types.ObjectId },
        performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        details: { type: Schema.Types.Mixed }, // JSON payload of changes or minimal info
        timestamp: { type: Date, default: Date.now },
        tenantId: { type: String, ref: 'Tenant', required: true },
        branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    },
    {
        timestamps: { createdAt: 'timestamp', updatedAt: false }, // Only need creation time
        collection: 'audit_logs',
    }
);

AuditLogSchema.index({ tenantId: 1, timestamp: -1 });
AuditLogSchema.index({ performedBy: 1, timestamp: -1 });
AuditLogSchema.index({ entity: 1, entityId: 1 });

export const AuditLog: Model<IAuditLog> = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
