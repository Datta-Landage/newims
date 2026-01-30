import mongoose, { Schema, Document, Model } from 'mongoose';

export enum WorkAreaStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface IWorkArea extends Document {
  workAreaId: mongoose.Types.ObjectId;
  displayId: string;
  tenantId: string;
  branchIds: mongoose.Types.ObjectId[];
  name: string;
  type?: string;
  status: WorkAreaStatus;
  createdAt: Date;
  updatedAt: Date;
}

const WorkAreaSchema = new Schema<IWorkArea>(
  {
    tenantId: { type: String, ref: 'Tenant', required: true },
    displayId: { type: String, required: true, unique: true },
    branchIds: [{ type: Schema.Types.ObjectId, ref: 'Branch', required: true }],
    name: { type: String, required: true },
    type: { type: String, required: false },
    status: { type: String, enum: Object.values(WorkAreaStatus), default: WorkAreaStatus.ACTIVE },
  },
  {
    timestamps: true,
    collection: 'work_areas',
  }
);

WorkAreaSchema.virtual('workAreaId').get(function (this: IWorkArea) {
  return this._id;
});

WorkAreaSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.workAreaId = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

WorkAreaSchema.index({ tenantId: 1, status: 1 });
WorkAreaSchema.index({ tenantId: 1, displayId: 1 }, { unique: true });
WorkAreaSchema.index({ tenantId: 1, name: 1 });

export const WorkArea: Model<IWorkArea> = mongoose.model<IWorkArea>('WorkArea', WorkAreaSchema);
