import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGRNItem extends Document {
  grnItemId: mongoose.Types.ObjectId;
  grnId: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  receivedQty: number;
  unitCost: number;
  taxAmount: number;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const GRNItemSchema = new Schema<IGRNItem>(
  {
    grnId: { type: Schema.Types.ObjectId, ref: 'GRN', required: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
    receivedQty: { type: Number, required: true, min: 0.01 },
    unitCost: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
  },
  {
    timestamps: true,
    collection: 'grn_items',
  }
);

GRNItemSchema.virtual('grnItemId').get(function (this: IGRNItem) {
  return this._id;
});

GRNItemSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.grnItemId = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

GRNItemSchema.index({ grnId: 1, itemId: 1 });
GRNItemSchema.index({ grnId: 1 });
GRNItemSchema.index({ itemId: 1 });

export const GRNItem: Model<IGRNItem> = mongoose.model<IGRNItem>('GRNItem', GRNItemSchema);
