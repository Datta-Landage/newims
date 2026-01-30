import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGRN extends Document {
  grnId: mongoose.Types.ObjectId;
  displayId: string;
  tenantId: string;
  branchId: mongoose.Types.ObjectId;
  poId?: mongoose.Types.ObjectId | null;
  soId?: mongoose.Types.ObjectId | null;
  vendorInvoiceNo: string;
  vendorInvoiceDate: Date;
  goodsReceivedDate: Date;
  workAreaId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
  items?: any[]; // Virtual
}

const GRNSchema = new Schema<IGRN>(
  {
    tenantId: { type: String, ref: 'Tenant', required: true },
    displayId: { type: String, required: true, unique: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    poId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', default: null },
    soId: { type: Schema.Types.ObjectId, ref: 'SpecialOrder', default: null },
    vendorInvoiceNo: { type: String, required: true },
    vendorInvoiceDate: { type: Date, required: true },
    goodsReceivedDate: { type: Date, default: Date.now },
    workAreaId: { type: Schema.Types.ObjectId, ref: 'WorkArea', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    totalAmount: { type: Number, min: 0, default: 0 },
  },
  {
    timestamps: true,
    collection: 'grns',
  }
);

// Validate that either poId OR soId is provided, but not both/neither
GRNSchema.pre('validate', async function () {
  if (this.poId && this.soId) {
    throw new Error('Cannot link both Purchase Order and Special Order to a single GRN.');
  } else if (!this.poId && !this.soId) {
    throw new Error('GRN must be linked to either a Purchase Order or a Special Order.');
  }
});

GRNSchema.virtual('grnId').get(function (this: IGRN) {
  return this._id;
});

GRNSchema.virtual('items', {
  ref: 'GRNItem',
  localField: '_id',
  foreignField: 'grnId',
});

GRNSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.grnId = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

GRNSchema.set('toObject', { virtuals: true });

GRNSchema.index({ tenantId: 1, branchId: 1 });
GRNSchema.index({ tenantId: 1, displayId: 1 }, { unique: true });
GRNSchema.index({ tenantId: 1, poId: 1 });
GRNSchema.index({ tenantId: 1, soId: 1 });
GRNSchema.index({ tenantId: 1, goodsReceivedDate: -1 });
GRNSchema.index({ tenantId: 1, workAreaId: 1 });

export const GRN: Model<IGRN> = mongoose.model<IGRN>('GRN', GRNSchema);
