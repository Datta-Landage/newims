import mongoose, { Schema, Document, Model } from 'mongoose';

export enum ItemStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface IItem extends Document {
  itemId?: mongoose.Types.ObjectId;
  displayId: string;
  tenantId: string;
  categoryId: mongoose.Types.ObjectId;
  subCategoryId?: mongoose.Types.ObjectId;
  itemCode: string;
  itemName: string;
  hsnCode?: string | null;
  classification?: string;
  inventoryUom: string;
  unitCost: number;
  taxRate: number;
  yield?: number;
  weight?: number;
  leadTime?: number;
  packageDetails?: {
    name?: string;
    brand?: string;
    qty?: number;
    price?: number;
    parLevel?: number;
  }[];
  status: ItemStatus;
  description?: string;
  createdFrom?: string;
  sourceOrderId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ItemSchema = new Schema<IItem>(
  {
    tenantId: { type: String, ref: 'Tenant', required: true },
    displayId: { type: String, required: true, unique: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    subCategoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },

    classification: { type: String, default: null },
    itemCode: { type: String, required: true, uppercase: true },
    itemName: { type: String, required: true },
    hsnCode: { type: String, uppercase: true, default: null },
    inventoryUom: { type: String, required: true },
    unitCost: { type: Number, min: 0, default: 0 },
    taxRate: { type: Number, min: 0, max: 100, default: 0 },
    yield: { type: Number, default: 100 },
    weight: { type: Number, default: 0 },
    leadTime: { type: Number, default: 0 },
    packageDetails: [{
      name: String,
      brand: String,
      qty: Number,
      price: Number,
      parLevel: Number
    }],
    status: { type: String, enum: Object.values(ItemStatus), default: ItemStatus.ACTIVE },
    description: { type: String, default: "" },
    createdFrom: { type: String, default: null },
    sourceOrderId: { type: Schema.Types.ObjectId, default: null },
  },
  {
    timestamps: true,
    collection: 'items',
  }
);

ItemSchema.virtual('itemId').get(function (this: IItem) {
  return this._id;
});

ItemSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.itemId = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

ItemSchema.index({ tenantId: 1, itemCode: 1 }, { unique: true });
ItemSchema.index({ tenantId: 1, displayId: 1 }, { unique: true });
ItemSchema.index({ tenantId: 1, status: 1 });
ItemSchema.index({ tenantId: 1, categoryId: 1 });
ItemSchema.index({ tenantId: 1, subCategoryId: 1 });
ItemSchema.index({ tenantId: 1, itemName: 1 });

export const Item: Model<IItem> = mongoose.model<IItem>('Item', ItemSchema);
