import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IInventoryStock extends Document {
  stockId: mongoose.Types.ObjectId;
  tenantId: string;
  itemId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  workAreaId: mongoose.Types.ObjectId;
  quantityInStock: number;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryStockSchema = new Schema<IInventoryStock>(
  {
    tenantId: { type: String, ref: 'Tenant', required: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    workAreaId: { type: Schema.Types.ObjectId, ref: 'WorkArea', required: true },
    quantityInStock: { type: Number, min: 0, default: 0 },
  },
  {
    timestamps: true,
    collection: 'inventory_stocks',
  }
);

InventoryStockSchema.virtual('stockId').get(function (this: IInventoryStock) {
  return this._id;
});

InventoryStockSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.stockId = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

InventoryStockSchema.index({ tenantId: 1, itemId: 1, branchId: 1, workAreaId: 1 }, { unique: true });
InventoryStockSchema.index({ tenantId: 1, branchId: 1, workAreaId: 1 });
InventoryStockSchema.index({ tenantId: 1, itemId: 1 });
InventoryStockSchema.index({ tenantId: 1, branchId: 1 });

export const InventoryStock: Model<IInventoryStock> = mongoose.model<IInventoryStock>('InventoryStock', InventoryStockSchema);
