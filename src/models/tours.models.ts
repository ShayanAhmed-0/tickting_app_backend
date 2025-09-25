// Los Mismos Tours Models - Separated from existing project models
// Use this file to import the tour-specific models to avoid conflicts

import User from './user.model';
import Profile from './profile.model';
import Office from './office.model';
import Bus from './bus.model';
import Stop from './stop.model';
import Route from './route.model';
import Trip from './trip.model';
import SeatHold from './seat-hold.model';
import Booking from './booking.model';
import Ticket from './ticket.model';
import PaymentTransaction from './payment-transaction.model';
import Maintenance from './maintenance.model';
import AuditLog from './audit-log.model';
import Notification from './notification.model';
import Device from './device.model';

// Export individual models with Tours prefix to avoid conflicts
export {
  User as ToursUser,
  Profile as ToursProfile,
  Office as ToursOffice,
  Bus as ToursBus,
  Stop as ToursStop,
  Route as ToursRoute,
  Trip as ToursTrip,
  SeatHold as ToursSeatHold,
  Booking as ToursBooking,
  Ticket as ToursTicket,
  PaymentTransaction as ToursPaymentTransaction,
  Maintenance as ToursMaintenance,
  AuditLog as ToursAuditLog,
  Notification as ToursNotification,
  Device as ToursDevice
};

// Export interfaces for TypeScript usage
export type { IUser as IToursUser } from './user.model';
export type { IProfile as IToursProfile } from './profile.model';
export type { IOffice as IToursOffice } from './office.model';
export type { IBus as IToursBus } from './bus.model';
export type { IStop as IToursStop } from './stop.model';
export type { IRoute as IToursRoute } from './route.model';
export type { ITrip as IToursTrip } from './trip.model';
export type { ISeatHold as IToursSeatHold } from './seat-hold.model';
export type { IBooking as IToursBooking } from './booking.model';
export type { ITicket as IToursTicket } from './ticket.model';
export type { IPaymentTransaction as IToursPaymentTransaction } from './payment-transaction.model';
export type { IMaintenance as IToursMaintenance } from './maintenance.model';
export type { IAuditLog as IToursAuditLog } from './audit-log.model';
export type { INotification as IToursNotification } from './notification.model';
export type { IDevice as IToursDevice } from './device.model';

// Export common types and enums
export * from './common/types';
export { commonOptions } from './common/options';

// Default export - models object for backward compatibility
const toursModels = {
  User,
  Profile,
  Office,
  Bus,
  Stop,
  Route,
  Trip,
  SeatHold,
  Booking,
  Ticket,
  PaymentTransaction,
  Maintenance,
  AuditLog,
  Notification,
  Device
};

export default toursModels;