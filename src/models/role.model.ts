import mongoose, { Schema, Document, Model } from 'mongoose';
import { ModuleKey } from '../constants/modules';

export interface IRole extends Document {
  roleId: mongoose.Types.ObjectId;
  roleName: string;
  roleCode: string; // e.g. SA, BM, PE, SM, IR
  modules: ModuleKey[];
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    roleName: { type: String, required: true, unique: true },
    roleCode: { type: String, required: true, unique: true },
    modules: {
      type: [String],
      enum: Object.values(ModuleKey),
      default: []
    },
    isSystemRole: { type: Boolean, default: false }
  },
  {
    timestamps: true,
    collection: 'roles',
  }
);

RoleSchema.virtual('roleId').get(function (this: IRole) {
  return this._id;
});

RoleSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.roleId = ret._id;
    delete (ret as any)._id;
    delete (ret as any).__v;
    return ret;
  },
});

export const Role: Model<IRole> = mongoose.model<IRole>('Role', RoleSchema);

