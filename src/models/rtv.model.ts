import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRTV extends Document {
  rtvId: mongoose.Types.ObjectId;
  displayId: string;
  rtvNumber: string;
  cnNumber?: string;
  tenantId: string;
  branchId: mongoose.Types.ObjectId;
  grnId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  items: {
    itemId: mongoose.Types.ObjectId;
    returnedQty: number;
    unitCost: number;
    reason?: string;
  }[];
  totalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  isUsed?: boolean;
  usedInPoId?: mongoose.Types.ObjectId | null;
  processedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RTVSchema = new Schema<IRTV>(
  {
    rtvNumber: { type: String, required: true, unique: true },
    cnNumber: { type: String },
    tenantId: { type: String, ref: 'Tenant', required: true },
    displayId: { type: String, required: true, unique: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    grnId: { type: Schema.Types.ObjectId, ref: 'GRN', required: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    items: [{
      itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
      returnedQty: { type: Number, required: true, min: 0.01 },
      unitCost: { type: Number, required: true, min: 0 },
      reason: { type: String },
    }],
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'APPROVED' },
    isUsed: { type: Boolean, default: false },
    usedInPoId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', default: null },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    collection: 'rtvs',
  }
);

RTVSchema.virtual('rtvId').get(function (this: IRTV) {
  return this._id;
});

RTVSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.rtvId = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

RTVSchema.index({ tenantId: 1, branchId: 1 });
RTVSchema.index({ tenantId: 1, displayId: 1 }, { unique: true });
RTVSchema.index({ tenantId: 1, vendorId: 1 });
RTVSchema.index({ tenantId: 1, rtvNumber: 1 });
RTVSchema.index({ tenantId: 1, createdAt: -1 });

export const RTV: Model<IRTV> = mongoose.model<IRTV>('RTV', RTVSchema);
