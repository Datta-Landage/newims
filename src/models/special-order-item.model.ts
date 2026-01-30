import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISpecialOrderItem extends Document {
  soItemId: mongoose.Types.ObjectId;
  soId: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  quantity: number;
  unitCost: number;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

const SpecialOrderItemSchema = new Schema<ISpecialOrderItem>(
  {
    soId: { type: Schema.Types.ObjectId, ref: 'SpecialOrder', required: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
    quantity: { type: Number, required: true, min: 0.01 },
    unitCost: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
  },
  {
    timestamps: true,
    collection: 'special_order_items',
  }
);

SpecialOrderItemSchema.virtual('soItemId').get(function (this: ISpecialOrderItem) {
  return this._id;
});

SpecialOrderItemSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.soItemId = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

SpecialOrderItemSchema.index({ soId: 1, itemId: 1 });
SpecialOrderItemSchema.index({ soId: 1 });
SpecialOrderItemSchema.index({ itemId: 1 });

export const SpecialOrderItem: Model<ISpecialOrderItem> = mongoose.model<ISpecialOrderItem>('SpecialOrderItem', SpecialOrderItemSchema);
