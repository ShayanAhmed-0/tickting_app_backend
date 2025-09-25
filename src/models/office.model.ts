import mongoose, { Schema, model, Document } from 'mongoose';
import { commonOptions } from './common/options';

// Interface definition
export interface IOffice extends Document {
  name: string;
  code: string;
  address?: string;
  contactPhone?: string;
  timezone?: string;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Schema definition
const OfficeSchema = new Schema<IOffice>({
  name: { type: String, required: true },
  code: { type: String, required: true, index: true }, // e.g. 'MX-CITY-01'
  address: { type: String },
  contactPhone: String,
  timezone: String,
  currency: { type: String, default: 'MXN' },
  isActive: { type: Boolean, default: true }
}, commonOptions);

// Model export
const Office = model<IOffice>('Office', OfficeSchema);
export default Office;