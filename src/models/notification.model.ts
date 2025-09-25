import mongoose, { Schema, model, Document } from 'mongoose';
import { commonOptions } from './common/options';
import { ObjectId, NotificationType, DeliveryStatus } from './common/types';

// Interface definition
export interface INotification extends Document {
  user?: ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  meta?: any;
  sentAt?: Date;
  deliveredAt?: Date;
  deliveryStatus: DeliveryStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Schema definition
const NotificationSchema = new Schema<INotification>({
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  type: { 
    type: String, 
    enum: Object.values(NotificationType), 
    required: true 
  },
  title: { type: String, required: true },
  body: { type: String, required: true },
  meta: Schema.Types.Mixed,
  sentAt: Date,
  deliveredAt: Date,
  deliveryStatus: { 
    type: String, 
    enum: Object.values(DeliveryStatus), 
    default: DeliveryStatus.PENDING 
  }
}, commonOptions);

// Model export
const Notification = model<INotification>('Notification', NotificationSchema);
export default Notification;