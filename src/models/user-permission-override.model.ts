import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserPermissionOverride extends Document {
  userPermissionOverrideId: mongoose.Types.ObjectId;
  tenantId: string;
  userId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  permissionCode: string;
  allowed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserPermissionOverrideSchema = new Schema<IUserPermissionOverride>(
  {
    tenantId: { type: String, ref: 'Tenant', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    // Use permissionCode (string) to avoid joins and because codes contain dots.
    permissionCode: { type: String, required: true },
    allowed: { type: Boolean, required: true },
  },
  {
    timestamps: true,
    collection: 'user_permission_overrides',
  }
);

UserPermissionOverrideSchema.virtual('userPermissionOverrideId').get(function (this: IUserPermissionOverride) {
  return this._id;
});

UserPermissionOverrideSchema.set('toJSON', {
  virtuals: true,
  transform: function (_doc, ret: any) {
    ret.userPermissionOverrideId = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// Fast lookups for RBAC checks and management
UserPermissionOverrideSchema.index(
  { tenantId: 1, userId: 1, branchId: 1, permissionCode: 1 },
  { unique: true }
);
UserPermissionOverrideSchema.index({ tenantId: 1, userId: 1, branchId: 1 });
UserPermissionOverrideSchema.index({ tenantId: 1, branchId: 1, permissionCode: 1 });

export const UserPermissionOverride: Model<IUserPermissionOverride> =
  mongoose.model<IUserPermissionOverride>('UserPermissionOverride', UserPermissionOverrideSchema);

