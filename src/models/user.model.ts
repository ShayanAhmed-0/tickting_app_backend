import mongoose, { Schema, model, Document } from 'mongoose';
import { commonOptions } from './common/options';
import { ObjectId, UserRole, AuthProviderInfo } from './common/types';

// Interface definition
export interface IUser extends Document {
  email?: string;
  phone?: string;
  password?: string;
  role: UserRole;
  authProviders: AuthProviderInfo[];
  profile?: ObjectId;
  office?: ObjectId;
  isActive: boolean;
  bioMetricEnabled: boolean;
  isVerified: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Schema definition
const UserSchema = new Schema<IUser>({
  email: { 
    type: String, 
    lowercase: true, 
    trim: true, 
    index: true, 
    sparse: true, 
    unique: true
  },
  phone: { 
    type: String, 
    trim: true, 
    uniqu: true,
    index: true, 
    sparse: true 
  },
  password: { type: String },
  role: { 
    type: String, 
    required: true, 
    enum: Object.values(UserRole), 
    default: UserRole.CUSTOMER, 
  },
  authProviders: [{
    provider: { 
      type: String, 
      enum: ['local', 'google', 'facebook', 'apple', 'phone'] 
    },
    providerId: { type: String },
    meta: { type: Schema.Types.Mixed }
  }],
  profile: { type: Schema.Types.ObjectId, ref: 'Profile' },
  office: { type: Schema.Types.ObjectId, ref: 'Office' }, // optional - which sales office/cashier belongs to
  isActive: { type: Boolean, default: true },
  bioMetricEnabled: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false }
}, commonOptions);

// Indexes
// UserSchema.index({ email: 1 }, { unique: true, sparse: true });
// UserSchema.index({ phone: 1 }, { unique: true, sparse: true });

// Model export
const User = model<IUser>('User', UserSchema);
export default User;