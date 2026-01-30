import mongoose, { Schema, Document, Model } from 'mongoose';

export enum CategoryStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
}

export interface ICategory extends Document {
    categoryId: mongoose.Types.ObjectId;
    tenantId: string;
    branchId: mongoose.Types.ObjectId;
    name: string;
    status: CategoryStatus;
    createdAt: Date;
    updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
    {
        tenantId: { type: String, ref: 'Tenant', required: true, index: true },
        branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
        name: { type: String, required: true },
        status: { type: String, enum: Object.values(CategoryStatus), default: CategoryStatus.ACTIVE },
    },
    {
        timestamps: true,
        collection: 'categories',
    }
);

CategorySchema.virtual('categoryId').get(function (this: ICategory) {
    return this._id;
});

CategorySchema.set('toJSON', {
    virtuals: true,
    transform: function (doc, ret: any) {
        ret.categoryId = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});

CategorySchema.index({ tenantId: 1, branchId: 1, name: 1 }, { unique: true });

export const Category: Model<ICategory> = mongoose.model<ICategory>('Category', CategorySchema);
