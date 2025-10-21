import mongoose, { Schema, model, Document } from "mongoose";
import { commonOptions } from "./common/options";
import {
  ObjectId,
  Gender,
  Language,
  Address,
  EmergencyContact,
  TravelPreferences,
  Documents,
} from "./common/types";
import { IAuth } from "./auth.model";
import { IOffice } from "./office.model";

// Interface definition
export interface IProfile extends Document {
  auth: ObjectId | IAuth;
  firstName: string;
  secondName: string;
  lastName: string;
  dob?: Date;
  gender: Gender;
  pictureUrl?: string;
  address?: Address;
  phoneNumber?: string;
  emergencyContact?: string;
  preferredLanguage: Language;
  documents: Documents;
  travelPreferences?: TravelPreferences;
  refundAmount?: number;
  office?: ObjectId | IOffice;
  createdAt: Date;
  updatedAt: Date;
}

// Schema definition
const ProfileSchema = new Schema<IProfile>(
  {
    auth: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
      unique: true,
    },
    refundAmount: { type: Number, default: 0 },
    firstName: { type: String, required: true },
    secondName: { type: String },
    lastName: { type: String },
    dob: { type: Date },
    gender: {
      type: String, 
      enum: Object.values(Gender),
      default: Gender.PREFER_NOT_SAY,
    },
    pictureUrl: { type: String, default: null },
    address: {
      streetAddress: { type: String, default: null },
      city: { type: String, default: null },
      state: { type: String, default: null },
      postalCode: { type: String, default: null },
    },
    documents: {
      documentCode: { type: String, default: null },
      documentNumber: { type: String, default: null },
      documentIssuingCountry: { type: String, default: null },
      driverLicenseId: { type: String, default: null },
    },
    phoneNumber: { type: String, default: null },
    emergencyContact: { type: String, default: null },
    preferredLanguage: {
      type: String,
      enum: Object.values(Language),
      default: Language.EN,
    },
    travelPreferences: {
      seatPreference: {
        type: String,
        enum: ["window", "aisle", "front", "back", "none"],
        default: "none",
      },
    },
    office: {
      type: Schema.Types.ObjectId,
      ref: "Office",
      default: null,
    },
  },
  commonOptions
);

// Model export
const Profile = model<IProfile>("Profile", ProfileSchema);
export default Profile;
