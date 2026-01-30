import mongoose, { Schema, Document } from 'mongoose';

export interface ICounter extends Document<string> {
    _id: string; // The sequence name (e.g., 'PO', 'ITEM')
    seq: number;
}

const CounterSchema = new Schema<ICounter>({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

export const Counter = mongoose.model<ICounter>('Counter', CounterSchema);
