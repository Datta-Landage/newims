import mongoose, { Schema, Document, Model } from 'mongoose';

export enum BranchStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface IBranch extends Document {
  branchId: mongoose.Types.ObjectId;
  displayId: string;
  tenantId: string;
  branchName: string;
  location: string;
  status: BranchStatus;
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema = new Schema<IBranch>(
  {
    tenantId: { type: String, ref: 'Tenant', required: true, index: true },
    displayId: { type: String, required: true, unique: true },
    branchName: { type: String, required: true },
    location: { type: String, required: true },
    status: { type: String, enum: Object.values(BranchStatus), default: BranchStatus.ACTIVE },
  },
  {
    timestamps: true,
    collection: 'branches',
  }
);
//todo
BranchSchema.virtual('branchId').get(function (this: IBranch) {
  return this._id;
});

BranchSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.branchId = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

BranchSchema.index({ tenantId: 1, status: 1 });
BranchSchema.index({ tenantId: 1, displayId: 1 }, { unique: true });
BranchSchema.index({ tenantId: 1, branchName: 1 }, { unique: true });

export const Branch: Model<IBranch> = mongoose.model<IBranch>('Branch', BranchSchema);
