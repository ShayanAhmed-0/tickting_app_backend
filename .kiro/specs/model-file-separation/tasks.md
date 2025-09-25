# Implementation Plan

- [x] 1. Create shared utilities infrastructure

  - Create `src/models/common/` directory structure
  - Extract and convert commonOptions to TypeScript
  - Define shared types and enums used across models
  - _Requirements: 4.1, 4.2, 3.2_

- [x] 2. Create core business entity models

  - [x] 2.1 Implement User model with TypeScript interfaces

    - Convert User schema to TypeScript with proper typing
    - Add IUser interface extending Document
    - Include all authentication providers and role enums
    - Preserve all existing indexes and validation rules
    - _Requirements: 1.1, 1.2, 3.1, 3.2, 5.2_

  - [x] 2.2 Implement Profile model with user relationship

    - Convert Profile schema to TypeScript
    - Add IProfile interface with proper field types
    - Maintain one-to-one relationship with User model
    - Include address and preference nested objects
    - _Requirements: 1.1, 1.2, 3.1, 3.2, 5.2_

  - [x] 2.3 Implement Office model for sales locations

    - Convert Office schema to TypeScript
    - Add IOffice interface with location and contact fields
    - Preserve timezone and currency configurations
    - _Requirements: 1.1, 1.2, 3.1, 3.2, 5.2_

- [x] 3. Create transportation and logistics models

  - [x] 3.1 Implement Bus model with seat layout system

    - Convert Bus schema to TypeScript with complex seat layout
    - Add IBus interface with nested seat configuration types
    - Preserve seat layout arrays and amenities
    - Maintain unique constraints on registration numbers
    - _Requirements: 1.1, 1.2, 3.1, 3.2, 5.2_

  - [x] 3.2 Implement Stop model with geolocation support

    - Convert Stop schema to TypeScript
    - Add IStop interface with GeoJSON point typing
    - Preserve 2dsphere index for location queries
    - _Requirements: 1.1, 1.2, 3.1, 3.2, 5.2_

  - [x] 3.3 Implement Route model with pricing configuration

    - Convert Route schema to TypeScript
    - Add IRoute interface with pricing policy nested objects
    - Maintain origin/destination relationships to Stop model
    - Preserve compound indexes for route queries
    - _Requirements: 1.1, 1.2, 3.1, 3.2, 5.2_

- [x] 4. Create scheduling and booking models

  - [x] 4.1 Implement Trip model with seat availability tracking

    - Convert Trip schema to TypeScript with complex seat snapshot
    - Add ITrip interface with seat status arrays
    - Preserve compound indexes for route and date queries
    - Maintain relationships to Route, Bus, and User models
    - _Requirements: 1.1, 1.2, 3.1, 3.2, 5.2_

  - [x] 4.2 Implement SeatHold model with TTL functionality

    - Convert SeatHold schema to TypeScript
    - Add ISeatHold interface with expiration handling
    - Preserve TTL index configuration for automatic cleanup
    - _Requirements: 1.1, 1.2, 3.1, 3.2, 5.2_

  - [x] 4.3 Implement Booking model with passenger management

    - Convert Booking schema to TypeScript
    - Add IBooking interface with passenger array typing
    - Preserve unique booking reference constraints
    - Maintain payment and refund nested object structures
    - _Requirements: 1.1, 1.2, 3.1, 3.2, 5.2_

- [x] 5. Create ticketing and payment models

  - [x] 5.1 Implement Ticket model with QR code support

    - Convert Ticket schema to TypeScript
    - Add ITicket interface with QR payload and validation fields
    - Preserve unique ticket reference constraints
    - _Requirements: 1.1, 1.2, 3.1, 3.2, 5.2_

  - [x] 5.2 Implement PaymentTransaction model for audit trail

    - Convert PaymentTransaction schema to TypeScript
    - Add IPaymentTransaction interface with gateway response typing
    - Preserve transaction ID indexing
    - _Requirements: 1.1, 1.2, 3.1, 3.2, 5.2_

- [x] 6. Create operational and system models

  - [x] 6.1 Implement Maintenance model for bus tracking

    - Convert Maintenance schema to TypeScript
    - Add IMaintenance interface with attachment URL arrays
    - _Requirements: 1.1, 1.2, 3.1, 3.2, 5.2_

  - [x] 6.2 Implement AuditLog model for compliance tracking

    - Convert AuditLog schema to TypeScript
    - Add IAuditLog interface with flexible meta field typing
    - Preserve compound indexes for actor and timestamp queries

    - _Requirements: 1.1, 1.2, 3.1, 3.2, 5.2_

  - [x] 6.3 Implement Notification model for messaging system

    - Convert Notification schema to TypeScript
    - Add INotification interface with delivery status tracking
    - _Requirements: 1.1, 1.2, 3.1, 3.2, 5.2_

- [x] 7. Create barrel export index file

  - Create new `src/models/index.ts` file that exports all models
  - Ensure backward compatibility with existing import syntax
  - Export models object with same structure as original file
  - _Requirements: 2.1, 2.2, 5.1_

- [x] 8. Update existing model references and cleanup

  - Remove or rename the original monolithic models file
  - Verify all existing imports continue to work without changes
  - Test that all model functionality works identically to before
  - _Requirements: 5.1, 5.2, 5.3_
