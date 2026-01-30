import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IIssue extends Document {
  issueId: mongoose.Types.ObjectId;
  tenantId: string;
  branchId: mongoose.Types.ObjectId;
  indentId: mongoose.Types.ObjectId;
  issuedBy: mongoose.Types.ObjectId;
  type: 'APPROVAL' | 'ISSUANCE';
  items?: {
    indentItemId: mongoose.Types.ObjectId;
    itemId: mongoose.Types.ObjectId;
    quantity: number;
  }[];
  remarks?: string;
  issueDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const IssueSchema = new Schema<IIssue>(
  {
    tenantId: { type: String, ref: 'Tenant', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    indentId: { type: Schema.Types.ObjectId, ref: 'Indent', required: true },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['APPROVAL', 'ISSUANCE'], default: 'APPROVAL' },
    items: [{
      indentItemId: { type: Schema.Types.ObjectId, ref: 'IndentItem' },
      itemId: { type: Schema.Types.ObjectId, ref: 'Item' },
      quantity: { type: Number, required: true }
    }],
    remarks: { type: String },
    issueDate: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'issues',
  }
);

IssueSchema.virtual('issueId').get(function (this: IIssue) {
  return this._id;
});

IssueSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.issueId = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

IssueSchema.index({ tenantId: 1, branchId: 1 });
IssueSchema.index({ tenantId: 1, indentId: 1 });
IssueSchema.index({ tenantId: 1, issueDate: -1 });
IssueSchema.index({ tenantId: 1, issuedBy: 1 });

export const Issue: Model<IIssue> = mongoose.model<IIssue>('Issue', IssueSchema);
