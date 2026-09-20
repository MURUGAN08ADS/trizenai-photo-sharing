# TrizenAI Photo Sharing

TrizenAI is a role-based event photo-sharing application. Administrators create events, assign team members, review uploaded photos, and publish PIN-protected customer galleries. Team members upload photos only to events they are assigned to. Customers access published galleries without creating an account.

## Features

- JWT-based authentication with bcrypt password verification
- `ADMIN` and `TEAM_MEMBER` role-based access control
- Admin event creation and team-member assignment
- Team-member assigned-event dashboard
- Multiple image uploads with Multer memory storage
- JPEG, PNG, and WebP validation
- 10 MB per-file limit and 10-file request limit
- Cloudinary image storage and PostgreSQL photo metadata
- Duplicate photo prevention per event, uploader, filename, and size
- Admin event photo review
- Cross-event photo publishing protection
- One gallery per event
- Bcrypt-hashed gallery PINs
- Customer gallery access without authentication
- Login and gallery PIN rate limiting
- Restricted CORS configuration
- Jest and Supertest API tests

## Tech Stack

- Frontend: React 19, React Router, Vite, Tailwind CSS
- Backend: Node.js, Express
- Database: PostgreSQL with Prisma ORM
- Authentication: JWT and bcryptjs
- Image storage: Cloudinary
- Upload handling: Multer
- Testing: Jest and Supertest

## System Architecture

```text
React/Vite frontend
        |
        | JSON and multipart HTTP requests
        v
Express API
  |             |
  |             +--> Cloudinary image storage
  |
  +--> Prisma ORM --> PostgreSQL
```

The frontend is in `client/`. The API is in `server/`. Express mounts authentication, event, photo, and gallery behavior through the route modules in `server/src/routes/`. Prisma models and migrations are in `server/prisma/`.

## Database Schema

- `User`: account identity, password hash, and role.
- `Event`: event name, description, and administrator owner.
- `EventMember`: many-to-many assignment between team members and events, with a unique event/member pair.
- `Photo`: Cloudinary URL and upload metadata, linked to an event and uploader.
- `Gallery`: one gallery per event, with a unique public token, hashed PIN, and publication state.
- `GalleryPhoto`: join table connecting selected photos to a gallery.

The application intentionally keeps one `Gallery` per `Event`. Republishing an event replaces its selected gallery photos and updates the PIN.

## Authentication and RBAC Flow

1. A user submits credentials to `POST /api/auth/login`.
2. The server verifies the bcrypt password hash.
3. The server returns a JWT containing the user ID and role.
4. Protected requests send `Authorization: Bearer <token>`.
5. `authenticateToken` validates the JWT.
6. `authorizeRole` enforces the required server-side role.
7. Event membership is checked separately for team-member event operations.

Client-side role data is used only for navigation. Authorization is enforced by the API.

## Photo Upload Flow

1. A team member opens an assigned event.
2. The frontend sends files as multipart field `photos` with the `eventId` field.
3. Multer validates the MIME type, file size, and file count.
4. The API verifies the team member is assigned to the event.
5. Each file is uploaded to Cloudinary under `trizenai/events/<eventId>`.
6. The Cloudinary URL and metadata are saved in PostgreSQL.
7. The API returns a success response or a meaningful `4xx`/`502` error.
8. Team members can request only their own photos through `GET /api/photos/my-events/:eventId`.

Accepted MIME types are `image/jpeg`, `image/png`, and `image/webp`. The maximum is 10 MB per file and 10 files per request.

## Gallery and PIN Flow

1. An administrator selects photos from one event.
2. The administrator publishes the selection with a 4-6 digit PIN.
3. The server hashes the PIN with bcrypt and stores only the hash.
4. The server returns a public gallery token, never the PIN hash.
5. A customer submits the PIN to `POST /api/photos/:token/verify`.
6. The server checks that the token exists and the gallery is published.
7. The server compares the submitted PIN with bcrypt.
8. Published photos are returned without requiring a customer account.
9. Repeated PIN attempts are rate limited.

## API Endpoint Summary

### Authentication

- `POST /api/auth/register`: register a team member.
- `POST /api/auth/login`: authenticate and receive a JWT.
- `GET /api/auth/me`: return the authenticated user.
- `GET /api/auth/admin-only`: admin authorization check.
- `GET /api/auth/team-only`: team-member authorization check.

### Events

- `POST /api/events`: create an event. Admin only.
- `POST /api/events/:eventId/members`: assign a team member. Admin only.
- `GET /api/events`: list events with admin photo/member/gallery counts. Admin only.
- `GET /api/events/my-events`: list events assigned to the authenticated team member.

### Photos and Galleries

- `POST /api/photos/upload`: upload up to 10 images. Assigned team members only.
- `GET /api/photos/my-events/:eventId`: list the authenticated member's photos for an assigned event.
- `GET /api/photos/event/:eventId`: list all event photos. Admin only.
- `POST /api/photos/select`: select photos for an event gallery. Admin only.
- `POST /api/photos/publish`: publish an event gallery with a PIN. Admin only.
- `POST /api/photos/:token/verify`: verify a customer gallery PIN. No account required.

### Health

- `GET /api/health`: verify API and database connectivity when the server process is running.

## Environment Variables

Create `server/.env` locally. Never commit real values.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN="12h"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
CLIENT_URL="http://localhost:5173"
PORT="5000"
```

`CLIENT_URL` must contain the exact frontend origin allowed by CORS in the deployed environment.

## Local Setup

### Prerequisites

- Node.js 20 or newer
- PostgreSQL 14 or newer
- A Cloudinary account and image-upload credentials

### Install dependencies

```powershell
cd server
npm install

cd ..\client
npm install
```

### Configure the database and environment

1. Create a PostgreSQL database.
2. Add the connection string and service credentials to `server/.env`.
3. Keep secrets out of source control.

### Apply database migrations

```powershell
cd server
npx prisma generate
npx prisma migrate deploy
```

For local schema development, use a reviewed migration rather than changing production data directly:

```powershell
npx prisma migrate dev --name describe_change
```

## Run the Application

Start the backend in one terminal:

```powershell
cd server
npm run dev
```

The API listens on `http://localhost:5000` by default.

Start the frontend in another terminal:

```powershell
cd client
npm run dev
```

The frontend listens on `http://localhost:5173` by default.

## Testing

Run the complete backend suite:

```powershell
cd server
npm test
```

Run a production frontend build:

```powershell
cd client
npm run build
```

Run frontend linting:

```powershell
cd client
npm run lint
```

The API tests use the configured PostgreSQL database and test authentication, RBAC, event validation, membership checks, upload validation, cross-event publishing protection, gallery publication, PIN verification, unpublished galleries, unknown tokens, and rate limiting.

## Cloudinary Configuration

Configure the Cloudinary cloud name, API key, and API secret only in the server environment. The API uploads image bytes server-side and stores the returned secure URL in PostgreSQL. Do not expose Cloudinary secrets in the React application.

For production, configure upload limits and Cloudinary resource policies appropriate to the account, and monitor failed uploads and storage usage.

## Deployment

Deploy the three runtime dependencies independently or through a platform that supports Node.js services and managed PostgreSQL:

1. Provision a production PostgreSQL database.
2. Deploy the Express `server` directory as a Node.js service.
3. Set production `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, Cloudinary variables, `CLIENT_URL`, and `PORT`.
4. Run `npx prisma migrate deploy` during the backend release process.
5. Confirm `GET /api/health` succeeds.
6. Deploy the Vite `client` directory as a static site using `npm run build` and serve `client/dist`.
7. Configure the frontend API base URL for the deployed backend instead of localhost.
8. Set backend CORS to the exact deployed frontend origin.
9. Verify login, event assignment, image upload, database persistence, gallery PIN access, and customer gallery rendering in the deployed environment.

A reverse proxy or platform HTTPS endpoint should be used in production. JWT secrets, database credentials, and Cloudinary credentials must be supplied through the platform's secret manager or environment configuration.

## Known Limitations

- The frontend API base URL is currently configured for the local backend and should be externalized before production deployment.
- Uploads use in-memory buffering, so large concurrent uploads should be monitored and may require a streaming strategy at higher scale.
- There is no background retry or cleanup workflow for a partial multi-file upload if Cloudinary or the database fails mid-request.
- Customer gallery access is token-and-PIN based; token sharing is intentionally treated as access sharing.
- The current frontend has no automated browser end-to-end test suite.
- Rate limits use the default in-process limiter store and should use a shared store when running multiple backend instances.
