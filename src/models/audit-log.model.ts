import mongoose, { Schema, model, Document } from 'mongoose';
import { commonOptions } from './common/options';
import { ObjectId } from './common/types';

// Interface definition
export interface IAuditLog extends Document {
  actor?: ObjectId;
  action: string;
  targetType?: string;
  targetId?: ObjectId;
  ipAddress?: string;
  userAgent?: string;
  meta?: any;
  createdAt: Date;
  updatedAt: Date;
}

// Schema definition
const AuditLogSchema = new Schema<IAuditLog>({
  actor: { type: Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true }, // e.g. 'create_booking', 'refund_processed'
  targetType: String,
  targetId: Schema.Types.ObjectId,
  ipAddress: String,
  userAgent: String,
  meta: Schema.Types.Mixed
}, commonOptions);

// Indexes
AuditLogSchema.index({ actor: 1, createdAt: -1 });

// Model export
const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);
export default AuditLog;