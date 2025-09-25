import mongoose, { Schema, model, Document } from 'mongoose';
import { commonOptions } from './common/options';
import { ObjectId, TicketStatus } from './common/types';

// Interface definition
export interface ITicket extends Document {
  booking: ObjectId;
  passengerIndex: number;
  ticketRef: string;
  qrPayload: string;
  qrHash?: string;
  issuedAt: Date;
  validFrom?: Date;
  validUntil?: Date;
  status: TicketStatus;
  checkedInBy?: ObjectId;
  checkedInAt?: Date;
  meta?: any;
  createdAt: Date;
  updatedAt: Date;
}

// Schema definition
const TicketSchema = new Schema<ITicket>({
  booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  passengerIndex: { type: Number, required: true },
  ticketRef: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  qrPayload: { type: String, required: true }, // encrypted payload or signed token
  qrHash: { type: String, index: true },
  issuedAt: { type: Date, default: Date.now },
  validFrom: Date,
  validUntil: Date,
  status: { 
    type: String, 
    enum: Object.values(TicketStatus), 
    default: TicketStatus.ACTIVE, 
    index: true 
  },
  checkedInBy: { type: Schema.Types.ObjectId, ref: 'User' }, // driver or staff who scanned
  checkedInAt: Date,
  meta: Schema.Types.Mixed
}, commonOptions);

// Indexes
// TicketSchema.index({ ticketRef: 1 }, { unique: true });

// Model export
const Ticket = model<ITicket>('Ticket', TicketSchema);
export default Ticket;