import mongoose, { Schema, Document, Model } from 'mongoose';

export enum ProcurementStatus {
  PENDING = 'PENDING',
  IN_PO = 'IN_PO',
  PROCURED = 'PROCURED',
}

export interface IIndentItem extends Document {
  indentItemId: mongoose.Types.ObjectId;
  indentId: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  requestedQty: number;
  approvedQty: number; // Qty approved by manager
  poQty: number;       // Qty added to POs
  issuedQty: number;
  pendingQty: number;
  procurementStatus: ProcurementStatus;
  createdAt: Date;
  updatedAt: Date;
}

const IndentItemSchema = new Schema<IIndentItem>(
  {
    indentId: { type: Schema.Types.ObjectId, ref: 'Indent', required: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
    requestedQty: { type: Number, required: true, min: 0.01 },
    approvedQty: { type: Number, default: 0 },
    poQty: { type: Number, default: 0 },
    issuedQty: { type: Number, min: 0, default: 0 },
    pendingQty: { type: Number, min: 0 },
    procurementStatus: { type: String, enum: Object.values(ProcurementStatus), default: ProcurementStatus.PENDING },
  },
  {
    timestamps: true,
    collection: 'indent_items',
  }
);

// Auto-calculate pendingQty (Issuance) and initialize approvedQty
IndentItemSchema.pre('save', function (this: any) {
  const doc = this as IIndentItem;
  if (doc.isNew && !doc.approvedQty) {
    doc.approvedQty = doc.requestedQty; // Default to requested if not specified
  }
  doc.pendingQty = Math.max(0, doc.requestedQty - (doc.issuedQty || 0));
});

IndentItemSchema.virtual('pendingPoQty').get(function (this: IIndentItem) {
  const approved = (this.approvedQty !== undefined && this.approvedQty !== null) ? this.approvedQty : this.requestedQty;
  return Math.max(0, (approved || 0) - (this.poQty || 0));
});

IndentItemSchema.virtual('indentItemId').get(function (this: IIndentItem) {
  return this._id;
});

IndentItemSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.indentItemId = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

IndentItemSchema.index({ indentId: 1, itemId: 1 });
IndentItemSchema.index({ indentId: 1 });
IndentItemSchema.index({ itemId: 1 });

export const IndentItem: Model<IIndentItem> = mongoose.model<IIndentItem>('IndentItem', IndentItemSchema);
