import { Types } from "mongoose";

export type ObjectId = Types.ObjectId;

// Common enums and types used across models
export enum UserRole {
  SUPER_ADMIN = "super_admin",
  MANAGER = "manager",
  CASHIER = "cashier",
  DRIVER = "driver",
  CUSTOMER = "customer",
}

export enum DaysEnums {
  MONDAY = "monday",
  TUESDAY = "tuesday",
  WEDNESDAY = "wednesday",
  THURSDAY = "thursday",
  FRIDAY = "friday",
  SATURDAY = "saturday",
  SUNDAY = "sunday",
}

export enum OtpTypes {
  registaration = "registaration",
  resend = "resend",
  forget = "forget",
}

export enum AuthProvider {
  LOCAL = "local",
  GOOGLE = "google",
  FACEBOOK = "facebook",
  APPLE = "apple",
  PHONE = "phone",
}

export enum DeviceType {
  IOS = "ios",
  ANDROID = "android",
  WEB = "web",
  POSTMAN = "postman",
  OTHER = "other",
}

export enum Gender {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other",
  PREFER_NOT_SAY = "prefer_not_say",
}

export enum Language {
  EN = "en",
  ES = "es",
}

export enum SeatPreference {
  WINDOW = "window",
  AISLE = "aisle",
  FRONT = "front",
  BACK = "back",
  NONE = "none",
}

export enum SeatLayoutType {
  STANDARD = "standard",
  CUSTOM = "custom",
}

export enum SeatType {
  REGULAR = "regular",
  PREMIUM = "premium",
  DISABLED = "disabled",
  DRIVER = "driver",
}

export enum TripStatus {
  SCHEDULED = "scheduled",
  BOARDING = "boarding",
  DEPARTED = "departed",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum BookingSource {
  MOBILE = "mobile",
  WEB = "web",
  CASHIER = "cashier",
}

export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
  REFUNDED = "refunded",
}

export enum BookingStatus {
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
  VOIDED = "voided",
  PENDING = "pending",
}

export enum RefundStatus {
  PENDING = "pending",
  PROCESSED = "processed",
  REJECTED = "rejected",
}

export enum TicketStatus {
  ACTIVE = "active",
  USED = "used",
  REVOKED = "revoked",
  EXPIRED = "expired",
}

export enum PaymentGateway {
  STRIPE = "stripe",
  PAYPAL = "paypal",
  SQUARE = "square",
  MANUAL_CASH = "manual_cash",
  OTHER = "other",
}

export enum TransactionStatus {
  INITIATED = "initiated",
  SUCCEEDED = "succeeded",
  FAILED = "failed",
  REFUNDED = "refunded",
}

export enum NotificationType {
  PUSH = "push",
  EMAIL = "email",
  SMS = "sms",
  INAPP = "inapp",
}

export enum DeliveryStatus {
  PENDING = "pending",
  SENT = "sent",
  DELIVERED = "delivered",
  FAILED = "failed",
  SEEN = "seen",
}

export enum GeoLocationType {
  POINT = "Point",
  LINE_STRING = "LineString",
  POLYGON = "Polygon",
}

// Common interface types
export interface Address {
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
}
export interface Documents {
  documentCode: string;
  documentNumber: string;
  documentIssuingCountry: string;
  driverLicenseId: string;
}

export interface EmergencyContact {
  name?: string;
  phone?: string;
  relation?: string;
}

export interface TravelPreferences {
  seatPreference: SeatPreference;
}

export interface AuthProviderInfo {
  provider: AuthProvider;
  providerId?: string;
  meta?: any;
}

export interface Seat {
  seatLabel?: string;
  seatIndex?: number;
  type: SeatType;
  isAvailable: boolean;
  meta?: any;
}

export interface SeatLayout {
  type: SeatLayoutType;
  seats: Seat[];
}

export interface GeoLocation {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

export interface PricingPolicy {
  surgeEnabled: boolean;
  peakHours: Array<{ start: string; end: string }>;
  priceMultiplier: number;
}

export interface SeatSnapshot {
  seatLabel?: string;
  seatIndex?: number;
  seatType?: string;
  isBooked: boolean;
  bookingId?: ObjectId;
}

export interface SeatHoldInfo {
  seatLabel?: string;
  seatIndex?: number;
}

export interface Passenger {
  firstName?: string;
  lastName?: string;
  idType?: string;
  idNumber?: string;
  dob?: Date;
  seatLabel?: string;
  seatIndex?: number;
  passengerRef?: string;
}

export interface RefundInfo {
  refundAmount?: number;
  refundTransactionId?: string;
  refundStatus?: RefundStatus;
}

export interface PricingOverride {
  class?: string;
  price?: number;
}
