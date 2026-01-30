import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPermission extends Document {
  permissionId: mongoose.Types.ObjectId;
  permissionCode: string;
  moduleName: string;
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSchema = new Schema<IPermission>(
  {
    permissionCode: { type: String, required: true, unique: true, uppercase: true },
    moduleName: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: 'permissions',
  }
);

PermissionSchema.virtual('permissionId').get(function (this: IPermission) {
  return this._id;
});

PermissionSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.permissionId = ret._id;
    delete (ret as any)._id;
    delete (ret as any).__v;
    return ret;
  },
});


PermissionSchema.index({ moduleName: 1 });

export const Permission: Model<IPermission> = mongoose.model<IPermission>('Permission', PermissionSchema);
