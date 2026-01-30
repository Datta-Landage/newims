import mongoose, { Schema, Document, Model } from 'mongoose';

export enum IndentStatus {
  OPEN = 'OPEN',
  APPROVED = 'APPROVED',
  CLOSED = 'CLOSED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  ISSUED = 'ISSUED',
  PARTIALLY_ISSUED = 'PARTIALLY_ISSUED',
}

export interface IIndent extends Document {
  indentId: mongoose.Types.ObjectId;
  displayId: string;
  tenantId: string;
  branchId: mongoose.Types.ObjectId;
  workAreaId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  indentDate: Date;
  requiredDate?: Date;
  remarks: string;
  entryType: string;
  status: IndentStatus;
  isPoRaised: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const IndentSchema = new Schema<IIndent>(
  {
    tenantId: { type: String, ref: 'Tenant', required: true },
    displayId: { type: String, required: true, unique: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    workAreaId: { type: Schema.Types.ObjectId, ref: 'WorkArea', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    indentDate: { type: Date, default: Date.now },
    requiredDate: { type: Date },
    remarks: { type: String, default: '' },
    entryType: { type: String, enum: ['OPEN', 'PACKAGE'], default: 'OPEN' },
    status: { type: String, enum: Object.values(IndentStatus), default: IndentStatus.OPEN },
    isPoRaised: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'indents',
  }
);

IndentSchema.virtual('indentId').get(function (this: IIndent) {
  return this._id;
});

IndentSchema.virtual('items', {
  ref: 'IndentItem',
  localField: '_id',
  foreignField: 'indentId'
});

IndentSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.indentId = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

IndentSchema.index({ tenantId: 1, branchId: 1, status: 1 });
IndentSchema.index({ tenantId: 1, displayId: 1 }, { unique: true });
IndentSchema.index({ tenantId: 1, workAreaId: 1 });
IndentSchema.index({ tenantId: 1, indentDate: -1 });
IndentSchema.index({ tenantId: 1, createdBy: 1 });

export const Indent: Model<IIndent> = mongoose.model<IIndent>('Indent', IndentSchema);
