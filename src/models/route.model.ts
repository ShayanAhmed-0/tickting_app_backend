import mongoose, { Schema, model, Document } from 'mongoose';
import { commonOptions } from './common/options';
import { ObjectId, PricingPolicy } from './common/types';

// Interface definition
export interface IRoute extends Document {
  code: string;
  name: string;
  origin: ObjectId;
  destination: ObjectId;
  intermediateStops: ObjectId[];
  baseDurationMinutes?: number;
  baseDistanceKm?: number;
  defaultPrice: number;
  currency: string;
  isActive: boolean;
  pricingPolicy?: PricingPolicy;
  createdAt: Date;
  updatedAt: Date;
}

// Schema definition
const RouteSchema = new Schema<IRoute>({
  code: { type: String, required: true, index: true }, // e.g. 'MX-CHIH-UAQ'
  name: { type: String, required: true },
  origin: { type: Schema.Types.ObjectId, ref: 'Stop', required: true },
  destination: { type: Schema.Types.ObjectId, ref: 'Stop', required: true },
  intermediateStops: [{ type: Schema.Types.ObjectId, ref: 'Stop' }],
  baseDurationMinutes: Number,
  baseDistanceKm: Number,
  defaultPrice: { type: Number, required: true }, // base fare in route currency
  currency: { type: String, default: 'MXN' },
  isActive: { type: Boolean, default: true },
  // demand-based dynamic pricing config
  pricingPolicy: {
    surgeEnabled: { type: Boolean, default: false },
    peakHours: [{ start: String, end: String }], // e.g. '17:00'
    priceMultiplier: { type: Number, default: 1.0 }
  }
  // analytics fields can be computed nightly via batch jobs
}, commonOptions);

// Indexes
RouteSchema.index({ origin: 1, destination: 1 });

// Model export
const Route = model<IRoute>('Route', RouteSchema);
export default Route;