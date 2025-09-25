import mongoose, { Schema, model, Document } from 'mongoose';
import { commonOptions } from './common/options';
import { ObjectId } from './common/types';

// Interface definition
export interface IMaintenance extends Document {
  bus: ObjectId;
  performedAt: Date;
  nextDueAt?: Date;
  performedBy?: ObjectId;
  notes?: string;
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Schema definition
const MaintenanceSchema = new Schema<IMaintenance>({
  bus: { type: Schema.Types.ObjectId, ref: 'Bus', required: true, index: true },
  performedAt: { type: Date, required: true },
  nextDueAt: Date,
  performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  notes: String,
  attachments: [String] // urls to reports
}, commonOptions);

// Model export
const Maintenance = model<IMaintenance>('Maintenance', MaintenanceSchema);
export default Maintenance;