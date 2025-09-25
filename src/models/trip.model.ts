import mongoose, { Schema, model, Document } from 'mongoose';
import { commonOptions } from './common/options';
import { ObjectId, TripStatus, SeatSnapshot, PricingOverride } from './common/types';

// Interface definition
export interface ITrip extends Document {
  route: ObjectId;
  bus: ObjectId;
  driver?: ObjectId;
  departAt: Date;
  arriveAtEstimated?: Date;
  departureStop?: ObjectId;
  arrivalStop?: ObjectId;
  seatsSnapshot: SeatSnapshot[];
  capacity: number;
  availableSeatsCount: number;
  status: TripStatus;
  office?: ObjectId;
  pricingOverrides: PricingOverride[];
  meta?: any;
  createdAt: Date;
  updatedAt: Date;
}

// Schema definition
const TripSchema = new Schema<ITrip>({
  route: { type: Schema.Types.ObjectId, ref: 'Route', required: true, index: true },
  bus: { type: Schema.Types.ObjectId, ref: 'Bus', required: true },
  driver: { type: Schema.Types.ObjectId, ref: 'User' }, // driver user id
  departAt: { type: Date, required: true, index: true },
  arriveAtEstimated: { type: Date },
  departureStop: { type: Schema.Types.ObjectId, ref: 'Stop' },
  arrivalStop: { type: Schema.Types.ObjectId, ref: 'Stop' },
  seatsSnapshot: [{
    seatLabel: String,
    seatIndex: Number,
    seatType: String,
    isBooked: { type: Boolean, default: false },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', default: null }
  }],
  capacity: { type: Number, required: true },
  availableSeatsCount: { type: Number, required: true, index: true },
  status: { 
    type: String, 
    enum: Object.values(TripStatus), 
    default: TripStatus.SCHEDULED, 
    index: true 
  },
  office: { type: Schema.Types.ObjectId, ref: 'Office' }, // which office runs this trip
  pricingOverrides: [{ class: String, price: Number }], // seat-class specific pricing
  meta: Schema.Types.Mixed
}, commonOptions);

// Indexes
// compound index for queries like "find trips from A to B on date"
TripSchema.index({ route: 1, departAt: 1 });

// Model export
const Trip = model<ITrip>('Trip', TripSchema);
export default Trip;