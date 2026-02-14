# Authentication System Setup

This document describes the authentication system implementation for the AI CST Platform.

## Overview

The authentication system supports two types of users:

1. **Admin Users** - Clinicians and administrators who manage patients and view analytics
2. **Patient Users** - Patients who access the platform via custom access links

## Key Features

- Admin signup and login with email/password
- Patient access via custom links (no password required)
- User context stored in client-side localStorage (Zustand persist)
- No JWT tokens - just user ID and type passed to API requests

## Setup Instructions

### 1. Database Migration

Run the Prisma migration to add authentication fields:

```bash
cd server
npx prisma migrate dev --name add_admin_auth
```

This adds `email` and `password` fields to the `Admin` table.

### 2. Install Dependencies

Make sure the following packages are installed:

**Server:**
```bash
cd server
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

**Client:**
```bash
cd client
npm install zustand
```

### 3. Environment Variables

Make sure your server has the following environment variables configured:

```env
DATABASE_URL=your_postgresql_connection_string
PORT=3001
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

## Authentication Flow

### Admin Flow

1. **Sign Up**: Navigate to `/admin/auth/signup`
   - Enter name, email, password, and role
   - Password is hashed with bcrypt
   - Admin record created in database
   - User logged in automatically

2. **Login**: Navigate to `/admin/auth/login`
   - Enter email and password
   - Password verified against hash
   - User data stored in auth store
   - Redirected to `/admin/patients`

3. **Logout**: Click logout button in sidebar
   - Auth store cleared
   - Redirected to login page

### Patient Flow

1. **Create Patient**: Admin creates patient via `/admin/patients/new`
   - Patient record created
   - Access link generated: `/patient/access?id={patientId}`
   - Link displayed for copying/sharing

2. **Access**: Patient opens access link
   - System verifies patient ID exists
   - System verifies patient is active
   - PatientUser record created if needed
   - User data stored in auth store
   - Redirected to `/home`

## API Routes

### Admin Authentication

**POST** `/api/auth/admin/signup`
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "clinician" // or "administrator"
}
```

**POST** `/api/auth/admin/login`
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

### Patient Verification

**POST** `/api/auth/patient/verify`
```json
{
  "patientId": "clxxx..."
}
```

**GET** `/api/auth/patient/verify/:patientId`

## Auth Store

The auth store (`client/src/stores/authStore.ts`) maintains the following state:

```typescript
{
  userType: 'admin' | 'patient' | null,
  userId: string | null,
  admin: Admin | null,
  patient: PatientUser | null,
  participant: Participant | null,
  isAuthenticated: boolean
}
```

Actions:
- `loginAsAdmin(admin)` - Set admin user
- `loginAsPatient(patient, participant)` - Set patient user
- `logout()` - Clear all auth state

## Using Auth Context in Components

```typescript
import { useAuthStore } from '../stores/authStore';

function MyComponent() {
  const { userType, userId, admin, patient, participant, isAuthenticated } = useAuthStore();

  // Access user data
  if (userType === 'admin') {
    console.log('Admin:', admin.name);
  } else if (userType === 'patient') {
    console.log('Patient:', participant.name);
  }
}
```

## Sending Auth Context to API

When making API requests, include the user ID based on the user type:

```typescript
import { useAuthStore } from '../stores/authStore';

const { userId, userType } = useAuthStore();

// For admin-specific requests
fetch(`${API_URL}/api/endpoint`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    adminId: userId, // If admin
    // ... other data
  }),
});

// For patient-specific requests
fetch(`${API_URL}/api/endpoint`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    patientId: participant?.id, // If patient
    // ... other data
  }),
});
```

Or use the utility function:

```typescript
import { getAuthHeaders } from '../utils/authUtils';
import { useAuthStore } from '../stores/authStore';

const { userId, userType } = useAuthStore();

fetch(`${API_URL}/api/endpoint`, {
  method: 'POST',
  headers: getAuthHeaders(userId, userType),
  body: JSON.stringify({
    adminId: userId, // or patientId
    // ... other data
  }),
});
```

## Generating Patient Access Links

Use the utility functions in `client/src/utils/authUtils.ts`:

```typescript
import { generatePatientAccessLink, copyPatientAccessLink } from '../utils/authUtils';

// Generate link
const link = generatePatientAccessLink(patient.id);

// Copy to clipboard
await copyPatientAccessLink(patient.id);
```

## Security Notes

1. **No JWT tokens**: This system does not use JWT tokens. User context is stored client-side and user ID is passed in API requests.

2. **Admin passwords**: Passwords are hashed using bcrypt with 10 salt rounds.

3. **Patient access**: Patient access links contain the patient ID in plain text. Anyone with the link can access that patient's account. This is intentional for ease of use.

4. **HTTPS in production**: Always use HTTPS in production to protect credentials in transit.

5. **CORS**: Server is configured to accept requests from the client URL specified in environment variables.

## Future Enhancements

Consider implementing:
- Email verification for admin accounts
- Password reset functionality
- Session expiration
- Multi-factor authentication for admins
- Access link expiration for patients
- Activity logging
