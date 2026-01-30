import { Counter } from '../models/counter.model';

export const generateDisplayId = async (prefix: string): Promise<string> => {
    const ret = await Counter.findByIdAndUpdate(
        { _id: prefix },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );

    if (!ret) {
        throw new Error(`Failed to generate sequence for prefix: ${prefix}`);
    }

    return `${prefix}-${ret.seq.toString().padStart(6, '0')}`;
};
