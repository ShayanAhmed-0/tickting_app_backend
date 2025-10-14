export const AUTH_CONSTANTS = {
  BOOKING_SUCCESS: "Booking successful",
  USER_ALREADY_EXISTS: "User already exists with this email",
  USER_AVATAR_REQUIRED: "User avatar is required",
  ACCOUNT_NOT_VERIFIED: "User already exists but account is not verified",
  VERIFICATION_CODE: "Verification Code",
  OTP_SENT: "Otp Sent to Registered Email",
  VERIFY_ACCOUNT: "Pleaes verify your account first",
  USER_NOT_FOUND: "User not found",
  PASSWORD_MISMATCH: "Password mismatch",
  NOT_VERIFIED: "Not Verified",
  INCOMPLETE_PROFILE: "Please complete your profile",
  LOGGED_IN: "User logged in Sucessfully",
  OTP_MISMATCH: "OTP Mismatch",
  OTP_EXPIRED: "OTP Expired",
  OTP_VERIFIED: "OTP Verified",
  INVALID_ROLE: "Invalid Role",
  PROFILE_CREATED: "Profile created successfully",
  INVALID_CURRENT_PASSWORD: "Invalid current password",
  SAME_PASSWORD: "Current password and new password cannot be the same",
  PASSWORD_CHANGED: "Password changed successfully",
  PROFILE_FETCHED: "Profile fetched successfully",
  CHALLENGE_CREATED: "Challenge created successfully",
  CHALLENGE_VERIFIED: "Challenge verified successfully",
  CHALLENGE_NOT_FOUND: "Challenge not found",
  CHALLENGE_VERIFICATION_FAILED: "Challenge verification failed",
  BIO_METRIC_NOT_ENABLED: "Bio metric not enabled",
  BIO_METRIC_VERIFIED: "Bio metric verified successfully",
  BIO_METRIC_VERIFICATION_FAILED: "Bio metric verification failed",
  DRIVER_LICENSE_ID_ALREADY_EXISTS: "Driver license id already exists",
  PROFILE_UPDATED: "Profile updated successfully",
};

export const MISC_CONSTANTS = {
  ALL_LOCS_FETCHED: "ALL list of contents fetched successfully",
  NAME_REQUIRED: "Name is required to create a service"
}
export const WEB_CONSTANTS = {
  CONTACT_FORM: "Contact Form",
  CONTACT_ADDED_SUCCESSFULLY: "Contact Added Successfully"
}

export const ADMIN_CONSTANTS = {
  OFFICE_CREATED: "Office created successfully",
  OFFICE_FETCHED: "Office fetched successfully",
  DRIVER_CREATED: "Driver created successfully",
  DRIVERS_FETCHED: "Drivers fetched successfully",
  BUS_CREATED: "Bus created successfully",
  BUS_UPDATED: "Bus updated successfully",
  BUS_DELETED: "Bus deleted successfully",
  BUS_FETCHED: "Bus fetched successfully",
  BUS_NOT_FOUND: "Bus not found",
  BUS_ALREADY_EXISTS: "Bus already exists",
  BUS_NOT_ACTIVE: "Bus is not active",
  BUS_NOT_IN_ACTIVE_TIME: "Bus is not in active time",
  BUS_NOT_IN_ACTIVE_DAY: "Bus is not in active day",
  DESTINATION_CREATED: "Destination created successfully",
  DESTINATIONS_FETCHED: "Destinations fetched successfully",
  ROUTE_CREATED: "Route created successfully",
  ROUTES_FETCHED: "Routes fetched successfully",
  ROUTE_FETCHED: "Route fetched successfully",
}

export const DRIVER_CONSTANTS = {
  TICKET_VERIFIED: "Ticket verified successfully",
  TICKET_NOT_FOUND: "Ticket not found",
  TICKET_NOT_VALID: "Ticket is not valid",
  TICKET_CONFIRMATION: "This ticket was alreday scanned once scanning it again will confirm your return ticket and will then mark the ticket as used",
  TICKET_ALREADY_USED: "Ticket already used",
  TICKET_NUMBER_REQUIRED: "Ticket number is required",
  BUS_NOT_ASSIGNED_TO_DRIVER: "This bus is not assigned to you",
  BAGGAGE_WEIGHT_REQUIRED: "Baggage weight is required and must be greater than 0",
  BAGGAGE_AMOUNT_REQUIRED: "Baggage amount is required and must be greater than 0",
  BAGGAGE_ALREADY_PURCHASED: "Extra baggage already purchased for this ticket",
  BAGGAGE_CANNOT_ADD_CANCELLED: "Cannot add baggage to a cancelled ticket",
  BAGGAGE_PAYMENT_INTENT_CREATED: "Payment intent created for extra baggage. Please complete the payment.",
  PASSENGERS_COUNT_FETCHED: "Passengers count fetched successfully",
}