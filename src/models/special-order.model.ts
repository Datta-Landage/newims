import mongoose, { Schema, Document, Model } from 'mongoose';

export enum SpecialOrderStatus {
  OPEN = 'OPEN',
  APPROVED = 'APPROVED',
  CLOSED = 'CLOSED',
}

export interface ISpecialOrder extends Document {
  soId: mongoose.Types.ObjectId;
  tenantId: string;
  branchId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId | null;
  soDate: Date;
  deliveryDate?: Date | null;
  status: SpecialOrderStatus;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const SpecialOrderSchema = new Schema<ISpecialOrder>(
  {
    tenantId: { type: String, ref: 'Tenant', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    soDate: { type: Date, default: Date.now },
    deliveryDate: { type: Date, default: null },
    status: { type: String, enum: Object.values(SpecialOrderStatus), default: SpecialOrderStatus.OPEN },
    totalAmount: { type: Number, min: 0, default: 0 },
  },
  {
    timestamps: true,
    collection: 'special_orders',
  }
);

SpecialOrderSchema.virtual('soId').get(function (this: ISpecialOrder) {
  return this._id;
});

SpecialOrderSchema.virtual('items', {
  ref: 'SpecialOrderItem',
  localField: '_id',
  foreignField: 'soId'
});

SpecialOrderSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.soId = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

SpecialOrderSchema.index({ tenantId: 1, branchId: 1, status: 1 });
SpecialOrderSchema.index({ tenantId: 1, vendorId: 1 });
SpecialOrderSchema.index({ tenantId: 1, soDate: -1 });
SpecialOrderSchema.index({ tenantId: 1, createdBy: 1 });

export const SpecialOrder: Model<ISpecialOrder> = mongoose.model<ISpecialOrder>('SpecialOrder', SpecialOrderSchema);
