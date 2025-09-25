import mongoose, { Schema, model, Document } from 'mongoose';
import { commonOptions } from './common/options';
import { GeoLocation } from './common/types';

// Interface definition
export interface IStop extends Document {
  name: string;
  code?: string;
  address?: string;
  location?: GeoLocation;
  city?: string;
  country?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Schema definition
const StopSchema = new Schema<IStop>({
  name: { type: String, required: true },
  code: String,
  address: String,
  location: {
    // GeoJSON point for mapping & geoqueries
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], index: '2dsphere' } // [lng, lat]
  },
  city: String,
  country: String,
  isActive: { type: Boolean, default: true }
}, commonOptions);

// Model export
const Stop = model<IStop>('Stop', StopSchema);
export default Stop;