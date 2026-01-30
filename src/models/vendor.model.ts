import mongoose, { Schema, Document, Model } from 'mongoose';

export enum VendorStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface IVendor extends Document {
  vendorId: mongoose.Types.ObjectId;
  displayId: string;
  tenantId: string;
  vendorName: string;
  gstNo?: string | null;
  panNo?: string | null;
  contactDetails: {
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  categories: mongoose.Types.ObjectId[];
  status: VendorStatus;
  createdFrom?: string;
  sourceOrderId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VendorSchema = new Schema<IVendor>(
  {
    tenantId: { type: String, ref: 'Tenant', required: true, index: true },
    displayId: { type: String, required: true, unique: true },
    vendorName: { type: String, required: true },
    gstNo: { type: String, uppercase: true, default: null },
    panNo: { type: String, uppercase: true, default: null },
    contactDetails: {
      contactPerson: String,
      phone: String,
      email: { type: String, lowercase: true },
      address: String,
    },
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    status: { type: String, enum: Object.values(VendorStatus), default: VendorStatus.ACTIVE },
    createdFrom: { type: String, default: null },
    sourceOrderId: { type: Schema.Types.ObjectId, default: null },
  },
  {
    timestamps: true,
    collection: 'vendors',
  }
);

VendorSchema.virtual('vendorId').get(function (this: IVendor) {
  return this._id;
});

VendorSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.vendorId = ret._id;
    delete (ret as any)._id;
    delete (ret as any).__v;
    return ret;
  },
});

VendorSchema.index({ tenantId: 1, status: 1 });
VendorSchema.index({ tenantId: 1, displayId: 1 }, { unique: true });
VendorSchema.index({ tenantId: 1, vendorName: 1 });

export const Vendor: Model<IVendor> = mongoose.model<IVendor>('Vendor', VendorSchema);
