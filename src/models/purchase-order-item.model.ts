import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPurchaseOrderItem extends Document {
  poItemId: mongoose.Types.ObjectId;
  poId: mongoose.Types.ObjectId;
  indentLinks?: {
    indentItemId: mongoose.Types.ObjectId;
    quantity: number;
  }[];
  itemId?: mongoose.Types.ObjectId | null;
  name: string;
  quantity: number;
  unitCost: number;
  taxRate: number;
  totalPrice: number;
  tempItemData?: {
    category: mongoose.Types.ObjectId;
    uom: string;
    code: string;
    description?: string;
    saveToMaster?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseOrderItemSchema = new Schema<IPurchaseOrderItem>(
  {
    poId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
    indentLinks: [{
      indentItemId: { type: Schema.Types.ObjectId, ref: 'IndentItem', required: true },
      quantity: { type: Number, required: true }
    }],
    itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: false, default: null },
    name: { type: String, required: true }, // Snapshot or ad-hoc item name
    quantity: { type: Number, required: true, min: 0.01 },
    unitCost: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0, min: 0, max: 100 },
    totalPrice: { type: Number, required: true, min: 0 },
    tempItemData: {
      category: { type: Schema.Types.ObjectId, ref: 'Category' },
      uom: String,
      code: String,
      description: String,
      saveToMaster: { type: Boolean, default: false }
    }
  },
  {
    timestamps: true,
    collection: 'purchase_order_items',
  }
);

PurchaseOrderItemSchema.virtual('poItemId').get(function (this: IPurchaseOrderItem) {
  return this._id;
});

PurchaseOrderItemSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.poItemId = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

PurchaseOrderItemSchema.index({ poId: 1, itemId: 1 });
PurchaseOrderItemSchema.index({ poId: 1 });
PurchaseOrderItemSchema.index({ indentItemId: 1 });
PurchaseOrderItemSchema.index({ itemId: 1 });

export const PurchaseOrderItem: Model<IPurchaseOrderItem> = mongoose.model<IPurchaseOrderItem>('PurchaseOrderItem', PurchaseOrderItemSchema);
