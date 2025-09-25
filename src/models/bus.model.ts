import mongoose, { Schema, model, Document } from "mongoose";
import { commonOptions } from "./common/options";
import { ObjectId, SeatLayout, SeatLayoutType, SeatType } from "./common/types";

// Interface definition
export interface IBus extends Document {
  registrationNumber: string;
  plateNumber?: string;
  make?: string;
  busModel?: string;
  year?: number;
  capacity: number;
  seatLayout: SeatLayout;
  amenities: string[];
  lastMaintenanceAt?: Date;
  nextMaintenanceDue?: Date;
  isActive: boolean;
  office?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Schema definition
const BusSchema = new Schema<IBus>(
  {
    registrationNumber: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    plateNumber: String,
    make: String,
    busModel: String,
    year: Number,
    capacity: { type: Number, required: true },
    seatLayout: {
      type: {
        type: String,
        enum: Object.values(SeatLayoutType),
        default: SeatLayoutType.STANDARD,
      },
      // seats array stores seat id/label, type, position, priceModifiers
      seats: [
        {
          seatLabel: String, // e.g. "1A"
          seatIndex: Number,
          type: {
            type: String,
            enum: Object.values(SeatType),
            default: SeatType.REGULAR,
          },
          isAvailable: { type: Boolean, default: true },
          // you can store geometry for mapping seat positions in UI
          meta: Schema.Types.Mixed,
        },
      ],
    },
    amenities: [String], // e.g. ['wifi','restroom','usb']
    lastMaintenanceAt: Date,
    nextMaintenanceDue: Date,
    isActive: { type: Boolean, default: true },
    office: { type: Schema.Types.ObjectId, ref: "Office" }, // assigned home office or depot
  },
  commonOptions
);

// Indexes
// BusSchema.index({ registrationNumber: 1 }, { unique: true });

// Model export
const Bus = model<IBus>("Bus", BusSchema);
export default Bus;
