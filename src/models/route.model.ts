import mongoose, { Schema, model, Document } from 'mongoose';
import { commonOptions } from './common/options';
import { DaysEnums, ObjectId } from './common/types';

// Interface definition
export interface IRoute extends Document {
  // code: string;
  name: string;
  origin: ObjectId;
  destination: ObjectId;
  bus: ObjectId;
  dayTime:{
    day: DaysEnums,
    time: Date
  }[]
  intermediateStops: ObjectId[];
  // baseDurationMinutes?: number;
  // baseDistanceKm?: number;
  // defaultPrice: number;
  // currency: string;
  isActive: boolean;
  // pricingPolicy?: PricingPolicy;
  createdAt: Date;
  updatedAt: Date;
}

// Schema definition
const RouteSchema = new Schema<IRoute>({
  name: { type: String, required: true },
  origin: { type: Schema.Types.ObjectId, ref: 'Destination', required: true },
  destination: { type: Schema.Types.ObjectId, ref: 'Destination', required: true },
  intermediateStops: [{ type: Schema.Types.ObjectId, ref: 'Destination' }],
  bus: { type: Schema.Types.ObjectId, ref: 'Bus', required: true },
  isActive: { type: Boolean, default: true },
  dayTime: {
    type: [new Schema({
      day: {
        type: String,
        enum: Object.values(DaysEnums),
        required: true
      },
      time: {
        type: Date,
        required: true
      }
    }, { _id: false })],
    default: []
  },
  // code: { type: String, required: true, index: true }, // e.g. 'MX-CHIH-UAQ'
  // baseDurationMinutes: Number,
  // baseDistanceKm: Number,
  // defaultPrice: { type: Number, required: true }, // base fare in route currency
  // currency: { type: String, default: 'MXN' },
  // demand-based dynamic pricing config
  // pricingPolicy: {
  //   surgeEnabled: { type: Boolean, default: false },
  //   peakHours: [{ start: String, end: String }], // e.g. '17:00'
  //   priceMultiplier: { type: Number, default: 1.0 }
  // }
  // analytics fields can be computed nightly via batch jobs
}, commonOptions);

// Indexes
RouteSchema.index({ origin: 1, destination: 1 });

// Model export
const Route = model<IRoute>('Route', RouteSchema);
export default Route;