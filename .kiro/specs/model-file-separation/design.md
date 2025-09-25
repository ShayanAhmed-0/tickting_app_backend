# Design Document

## Overview

This design outlines the refactoring of a monolithic Mongoose models file into a well-organized, modular structure. The current JavaScript models file contains 14 different schemas in a single file, which will be split into individual TypeScript files following the existing project patterns. The refactoring will maintain backward compatibility while improving code organization, maintainability, and developer experience.

## Architecture

### Current State
- Single `models/index.js` file containing all 14 models
- JavaScript implementation with CommonJS exports
- All schemas, indexes, and model definitions in one file
- Shared `commonOptions` object defined inline

### Target State
- Individual TypeScript model files in `src/models/` directory
- Each model in its own `.model.ts` file
- Shared utilities extracted to separate files
- Updated index file that exports all models
- Consistent TypeScript patterns matching existing codebase

## Components and Interfaces

### File Structure
```
src/models/
├── common/
│   ├── options.ts          # Shared schema options
│   └── types.ts           # Common type definitions
├── user.model.ts          # User schema and model
├── profile.model.ts       # Profile schema and model
├── office.model.ts        # Office schema and model
├── bus.model.ts           # Bus schema and model
├── stop.model.ts          # Stop schema and model
├── route.model.ts         # Route schema and model
├── trip.model.ts          # Trip schema and model
├── seat-hold.model.ts     # SeatHold schema and model
├── booking.model.ts       # Booking schema and model
├── ticket.model.ts        # Ticket schema and model
├── payment-transaction.model.ts # PaymentTransaction schema and model
├── maintenance.model.ts   # Maintenance schema and model
├── audit-log.model.ts     # AuditLog schema and model
├── notification.model.ts  # Notification schema and model
└── index.ts              # Barrel export file
```

### Model File Structure
Each model file will follow this consistent pattern:
```typescript
import mongoose, { Schema, model, Document } from 'mongoose';
import { commonOptions } from './common/options';

// Interface definition
interface IModelName extends Document {
  // field definitions
}

// Schema definition
const ModelNameSchema = new Schema<IModelName>({
  // schema fields
}, commonOptions);

// Indexes
ModelNameSchema.index({ field: 1 });

// Model export
const ModelName = model<IModelName>('ModelName', ModelNameSchema);
export default ModelName;
```

### Shared Utilities

#### Common Options (`src/models/common/options.ts`)
```typescript
export const commonOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform(doc: any, ret: any) {
      delete ret.__v;
      if (ret.password) delete ret.password;
      return ret;
    }
  }
};
```

#### Type Definitions (`src/models/common/types.ts`)
```typescript
import { Types } from 'mongoose';

export type ObjectId = Types.ObjectId;

// Common enums and types used across models
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  MANAGER = 'manager',
  CASHIER = 'cashier',
  DRIVER = 'driver',
  CUSTOMER = 'customer'
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  APPLE = 'apple',
  PHONE = 'phone'
}

// Additional shared types...
```

## Data Models

### Model Interfaces
Each model will have a corresponding TypeScript interface that extends `Document`:

- `IUser` - User authentication and role information
- `IProfile` - Extended user profile information
- `IOffice` - Sales office/cashier location data
- `IBus` - Fleet vehicle information with seat layouts
- `IStop` - Bus stop/station information with geolocation
- `IRoute` - Logical routes between stops with pricing
- `ITrip` - Scheduled bus runs with seat availability
- `ISeatHold` - Temporary seat reservations with TTL
- `IBooking` - Customer bookings with passenger details
- `ITicket` - Generated tickets with QR codes
- `IPaymentTransaction` - Payment processing records
- `IMaintenance` - Bus maintenance tracking
- `IAuditLog` - System audit trail
- `INotification` - Push/email notification records

### Relationships
The models maintain the same relationships as the original:
- User → Profile (1:1)
- User → Office (many:1, optional)
- Trip → Route, Bus (many:1)
- Booking → Trip, User (many:1)
- Ticket → Booking (many:1)
- SeatHold → Trip, User (many:1)

## Error Handling

### Import/Export Errors
- Graceful handling of missing model files
- Clear error messages for circular dependencies
- Validation of model registration

### Schema Validation
- Maintain all existing schema validations
- Preserve custom validation functions
- Keep all existing indexes and constraints

## Testing Strategy

### Compatibility Testing
1. **Import Testing**: Verify all existing import statements continue to work
2. **Model Functionality**: Ensure all CRUD operations work identically
3. **Relationship Testing**: Validate all model relationships and population
4. **Index Testing**: Confirm all database indexes are properly created

### Migration Testing
1. **Before/After Comparison**: Compare model exports before and after refactoring
2. **Database Operations**: Test create, read, update, delete operations
3. **Query Performance**: Ensure no performance regression
4. **Schema Validation**: Verify all validation rules still apply

### Integration Testing
1. **Application Startup**: Ensure app starts without errors
2. **API Endpoints**: Test all endpoints that use the models
3. **Database Connections**: Verify proper model registration with Mongoose

## Implementation Approach

### Phase 1: Setup Infrastructure
- Create common utilities directory and files
- Extract shared options and types
- Set up TypeScript interfaces

### Phase 2: Model Migration
- Convert each model to individual TypeScript file
- Maintain exact schema definitions and indexes
- Add proper TypeScript typing

### Phase 3: Index File Update
- Create new barrel export index file
- Ensure backward compatibility
- Test all imports work correctly

### Phase 4: Cleanup
- Remove original monolithic file
- Update any direct file references
- Verify no broken imports remain

## Migration Considerations

### Backward Compatibility
- All existing import statements must continue to work
- Model behavior must remain identical
- No breaking changes to the public API

### File Naming Convention
- Use kebab-case for multi-word models (e.g., `seat-hold.model.ts`)
- Consistent `.model.ts` suffix
- Clear, descriptive names matching the schema names

### TypeScript Integration
- Follow existing project TypeScript patterns
- Use proper type definitions for all fields
- Maintain type safety throughout the refactoring