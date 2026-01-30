import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRolePermission extends Document {
  rolePermissionId: mongoose.Types.ObjectId;
  roleId: mongoose.Types.ObjectId;
  permissionId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RolePermissionSchema = new Schema<IRolePermission>(
  {
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    permissionId: { type: Schema.Types.ObjectId, ref: 'Permission', required: true },
  },
  {
    timestamps: true,
    collection: 'role_permissions',
  }
);

RolePermissionSchema.virtual('rolePermissionId').get(function (this: IRolePermission) {
  return this._id;
});

RolePermissionSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.rolePermissionId = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

RolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true });
RolePermissionSchema.index({ roleId: 1 });
RolePermissionSchema.index({ permissionId: 1 });

export const RolePermission: Model<IRolePermission> = mongoose.model<IRolePermission>('RolePermission', RolePermissionSchema);
