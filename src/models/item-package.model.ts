import mongoose, { Schema, Document, Model } from 'mongoose';

export enum ItemPackageStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface IItemPackage extends Document {
  packageId: mongoose.Types.ObjectId;
  tenantId: string;
  itemId: mongoose.Types.ObjectId;
  packageName: string;
  brand?: string | null;
  quantity: number;
  price: number;
  parLevel: number;
  status: ItemPackageStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ItemPackageSchema = new Schema<IItemPackage>(
  {
    tenantId: { type: String, ref: 'Tenant', required: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
    packageName: { type: String, required: true },
    brand: { type: String, default: null },
    quantity: { type: Number, required: true, min: 0.01 },
    price: { type: Number, required: true, min: 0 },
    parLevel: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: Object.values(ItemPackageStatus), default: ItemPackageStatus.ACTIVE },
  },
  {
    timestamps: true,
    collection: 'item_packages',
  }
);

ItemPackageSchema.virtual('packageId').get(function (this: IItemPackage) {
  return this._id;
});

ItemPackageSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.packageId = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

ItemPackageSchema.index({ tenantId: 1, itemId: 1, status: 1 });
ItemPackageSchema.index({ tenantId: 1, itemId: 1 });

export const ItemPackage: Model<IItemPackage> = mongoose.model<IItemPackage>('ItemPackage', ItemPackageSchema);
