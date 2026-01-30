import mongoose, { Schema, Document, Model } from 'mongoose';

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface ITenant extends Document<string> {
  tenantId: string;
  _id: string;
  tenantName: string;
  status: TenantStatus;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    _id: { type: String, required: true }, // Explicitly define _id as String
    tenantName: { type: String, required: true, unique: true },
    status: { type: String, enum: Object.values(TenantStatus), default: TenantStatus.ACTIVE },
  },
  {
    timestamps: true,
    collection: 'tenants',
    _id: false, // Disable auto ObjectId generation
  }
);

TenantSchema.virtual('tenantId').get(function (this: ITenant) {
  return this._id;
});

TenantSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.tenantId = ret._id;
    delete (ret as any)._id;
    delete (ret as any).__v;
    return ret;
  },
});

TenantSchema.index({ status: 1 });


export const Tenant: Model<ITenant> = mongoose.model<ITenant>('Tenant', TenantSchema);
