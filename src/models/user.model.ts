import mongoose, { Schema, Document, Model } from 'mongoose';
import { ModuleKey } from '../constants/modules';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface IUserBranch {
  branchId: mongoose.Types.ObjectId;
  roleId: mongoose.Types.ObjectId;
  // Overrides: If empty, uses Role's modules. If set, replaces them.
  modules?: ModuleKey[];
}

export interface IUser extends Document {
  userId: mongoose.Types.ObjectId;
  displayId: string;
  tenantId: string;
  branchId?: mongoose.Types.ObjectId | null; // Default/Active Branch
  roleId: mongoose.Types.ObjectId; // Default/Active Role
  branches: IUserBranch[]; // Multi-branch access
  name: string;
  email: string;
  passwordHash: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    tenantId: { type: String, ref: 'Tenant', required: true },
    displayId: { type: String, required: true, unique: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    branches: [
      {
        branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
        roleId: { type: Schema.Types.ObjectId, ref: 'Role' },
        modules: {
          type: [String],
          enum: Object.values(ModuleKey)
        },
      },
    ],
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    status: { type: String, enum: Object.values(UserStatus), default: UserStatus.ACTIVE },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

UserSchema.virtual('userId').get(function (this: IUser) {
  return this._id;
});

UserSchema.virtual('roleCode').get(function (this: any) {
  return this.roleId?.roleCode;
});

UserSchema.virtual('roleName').get(function (this: any) {
  return this.roleId?.roleName;
});

UserSchema.virtual('isSystemRole').get(function (this: any) {
  return this.roleId?.isSystemRole;
});

UserSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.userId = ret._id;
    delete (ret as any)._id;
    delete (ret as any).__v;
    delete (ret as any).passwordHash;
    return ret;
  },
});

UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });
UserSchema.index({ tenantId: 1, displayId: 1 }, { unique: true });
UserSchema.index({ tenantId: 1, status: 1 });
UserSchema.index({ tenantId: 1, branchId: 1 });
UserSchema.index({ tenantId: 1, roleId: 1 });

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
