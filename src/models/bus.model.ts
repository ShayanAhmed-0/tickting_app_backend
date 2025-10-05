import mongoose, { Schema, model, Document } from "mongoose";
import { commonOptions } from "./common/options";
import { DaysEnums, GeoLocation, GeoLocationType, ObjectId, SeatLayout, SeatLayoutType, SeatStatus, SeatType } from "./common/types";

// Interface definition
export interface IBus extends Document {
  description?: string;
  serialNumber: string;
  code: string;
  plateNumber?: string;
  make?: string;
  busModel?: string;
  year?: number;
  capacity: number;
  currentLocation?: GeoLocation | undefined;
  seatLayout: SeatLayout;
  amenities: string[];
  lastMaintenanceAt?: Date;
  nextMaintenanceDue?: Date;
  isActive: boolean;
  office?: ObjectId;
  driver?: ObjectId;
  departureDay?: DaysEnums[];
  departureTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Schema definition
const BusSchema = new Schema<IBus>(
  {
    code:{
      type:String,
      required:true,
      index:true,
      unique:true,
    },
    description: {type:String, default:null},
    serialNumber: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    plateNumber: {type:String, default:null},
    make: {type:String, default:null},
    busModel: {type:String, default:null},
    year: {type:Number, default:null},
    capacity: { type: Number, default:null },
    currentLocation: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
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
          status:{
            type: String,
            enum: SeatStatus,
            default: SeatStatus.AVAILABLE,
          },
          isAvailable: { type: Boolean, default: true },
          userId: { type: Schema.Types.ObjectId, ref: "User", default:null },
          // you can store geometry for mapping seat positions in UI
          meta: Schema.Types.Mixed,
        },
      ],
    },
    amenities: [{type:String, default:null}], // e.g. ['wifi','restroom','usb']
    lastMaintenanceAt: {type:Date, default:null},
    nextMaintenanceDue: {type:Date, default:null},
    isActive: { type: Boolean, default: true },
    office: { type: Schema.Types.ObjectId, ref: "Office", default:null }, // assigned home office or depot
    driver: { type: Schema.Types.ObjectId, ref: "User", default:null }, // driver user id
    departureDay: [{type:String, enum: DaysEnums, default:null}],
    departureTime: {type:Date, default:null},
  },
  commonOptions
);

// Indexes
// BusSchema.index({ registrationNumber: 1 }, { unique: true });
// Note: 2dsphere index will be created manually for documents that have currentLocation


// Model export
const BusModel = model<IBus>("Bus", BusSchema);
export default BusModel;
