# Zaika Food Delivery App

Zaika is a multi-role food delivery platform with three user personas:

- Customer (`user`)
- Shop owner (`owner`)
- Delivery partner (`deliveryPartner`)

This repository contains a full-stack implementation with real-time order tracking, delivery assignment orchestration, online/COD payments, and role-based dashboards.

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Quick Start for New Developers](#quick-start-for-new-developers)
- [Environment Variables](#environment-variables)
- [Pages and Modules](#pages-and-modules)
- [Features and Functionalities](#features-and-functionalities)
- [User Flows](#user-flows)
- [API and Integration Reference](#api-and-integration-reference)
- [Realtime and Queue Behavior](#realtime-and-queue-behavior)
- [Data Model Snapshot](#data-model-snapshot)
- [Testing](#testing)
- [Edge Cases and Limitations](#edge-cases-and-limitations)
- [Troubleshooting](#troubleshooting)
- [Future Scope](#future-scope)
- [Documentation Map](#documentation-map)

## Project Overview

Zaika supports the complete food ordering lifecycle:

1. Customer discovers shops/items based on city/location.
2. Customer adds items (with variants/add-ons) to cart.
3. Customer checks out with COD or online payment.
4. Shop owner processes each shop-specific order.
5. Once marked `Ready`, delivery assignment is broadcast in rounds.
6. Delivery partner accepts assignment and updates delivery status.
7. Customer and owner receive live socket updates.
8. Wallet accounting is processed after successful delivery.

## Tech Stack

### Frontend

- React 19 + Vite 7
- Redux Toolkit
- React Router
- Tailwind CSS
- Socket.IO client
- Leaflet (maps)

### Backend

- Node.js (ESM)
- Express 5
- Mongoose
- Socket.IO
- BullMQ + ioredis
- Zod validation
- Multer + Cloudinary

### Data Stores and Integrations

- MongoDB
- Redis
- Razorpay
- Geoapify
- Gmail SMTP (OTP flow)

## Repository Structure

```text
.
|-- backend/
|   |-- app.js
|   |-- server.js
|   |-- routes/
|   |-- controllers/
|   |-- services/
|   |-- models/
|   |-- workers/
|   `-- tests/
|-- frontend/
|   |-- src/
|   |   |-- pages/
|   |   |-- components/
|   |   |-- hooks/
|   |   `-- redux/
|   `-- vite.config.js
`-- README.md
```

## Quick Start for New Developers

### 1. Prerequisites

- Node.js + npm
- MongoDB (Atlas or local)
- Redis (local service or Docker)
- Cloudinary account (for image upload)
- Geoapify API key
- Gmail App Password (for OTP email)
- Razorpay keys (only for online payment flow)

### 2. Clone and install

```bash
git clone <your-repo-url>
cd Zaika-Food-Delivery-App-main

cd backend
npm install

cd ../frontend
npm install
```

### 3. Configure environment files

```bash
# from repo root
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Update values in both files before running.

### 4. Start Redis

If using Docker:

```bash
docker run -d --name redis-zaika -p 6380:6379 redis:7-alpine
```

### 5. Start backend and frontend

Terminal 1:

```bash
cd backend
npm run dev
```

Terminal 2:

```bash
cd frontend
npm run dev
```

### 6. First-run sanity check

- Register accounts for all roles (`user`, `owner`, `deliveryPartner`).
- As owner: create shop and add items.
- As user: place order.
- As owner: move status to `Ready`.
- As delivery partner: accept and deliver.
- Confirm updates on customer tracking screen.

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NODE_ENV` | No | `development` | Runtime mode |
| `PORT` | No | `5000` | Backend port |
| `MONGODB_URL` | Yes | - | MongoDB connection string |
| `JWT_SECRET` | Yes | - | JWT signing secret |
| `CLIENT_URL` | No | `http://localhost:5173` | CORS frontend origin |
| `FRONTEND_URL` | No | `CLIENT_URL` fallback | Socket CORS origin |
| `REDIS_URL` | No | - | Full Redis connection string (`redis://` or `rediss://`) for managed Redis |
| `REDIS_HOST` | No | `127.0.0.1` | Redis host (used when `REDIS_URL` is not set) |
| `REDIS_PORT` | No | `6380` | Redis port (used when `REDIS_URL` is not set) |
| `REDIS_PASSWORD` | No | - | Redis password (optional for host/port mode, fallback if URL has no password) |
| `REDIS_TLS` | No | `false` | Force TLS for host/port mode (`true` for managed Redis endpoints) |
| `ENABLE_DELIVERY_WORKER` | No | `true` | Enable BullMQ workers |
| `DELIVERY_BROADCAST_CONCURRENCY` | No | `10` | Worker concurrency |
| `ORDER_STOCK_HOLD_MINUTES` | No | `15` | Stock hold window for online orders |
| `CLOUD_NAME` | Yes | - | Cloudinary cloud name |
| `CLOUD_APIKEY` | Yes | - | Cloudinary API key |
| `CLOUD_SECRET` | Yes | - | Cloudinary API secret |
| `GEOAPIKEY` | Yes | - | Geoapify key |
| `EMAIL` | Yes | - | SMTP sender email |
| `APP_PASSWORD` | Yes | - | Gmail app password |
| `STAFF_ONBOARDING_CODE` | No | - | Protected owner/delivery onboarding |
| `RAZORPAY_KEY_ID` | For online pay | - | Razorpay key |
| `RAZORPAY_KEY_SECRET` | For online pay | - | Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | For webhooks | - | Razorpay webhook verification |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `VITE_API_URL` | Recommended | empty string | API base URL (empty uses Vite `/api` proxy) |
| `VITE_SOCKET_URL` | Recommended | `http://localhost:5000` | Socket server URL |
| `VITE_GEOAPIKEY` | Yes | - | Geoapify key |

Important port note:

- Backend default is `5000`.
- Vite proxy target and socket fallback are `5000` if not overridden.
- Set `VITE_API_URL` and `VITE_SOCKET_URL` explicitly to avoid mismatch.

## Pages and Modules

### Frontend Routes (from `src/App.jsx`)

- `/`
- `/signup`
- `/signin`
- `/forgotpassword`
- `/profile`
- `/cart`
- `/checkout`
- `/payment`
- `/my-orders`
- `/rate-order`
- `/track-order/:orderId`
- `/shop/:shopId/menu`
- `/owner/create-shop`
- `/owner/add-item`
- `/owner/edit-item/:itemId`
- `/owner/menu-list`
- `/owner/view-item/:itemId`
- `/owner/payments`

### Backend Module Breakdown

- Bootstrap:
  - `backend/app.js`: middleware + route wiring
  - `backend/server.js`: HTTP server, DB connect, socket init, worker start, cron cleanup
- Route groups:
  - `auth`, `user`, `geo`, `shop`, `item`, `order`, `rating`, `delivery`
- Services:
  - `order.service.js`: canonical pricing, stock reservation, order creation
  - `wallet.service.js`: wallet credits and period summaries
- Realtime and queue:
  - `socket.js`: auth, room joins, emits
  - `queue.js`: Redis + BullMQ queue setup
  - `workers/deliveryWorker.js`: broadcast rounds + admin alerts
- Core models:
  - `User`, `Shop`, `Item`, `Order`, `ShopOrder`, `DeliveryAssignment`, `Rating`, `ShopWallet`, `DeliveryWallet`

## Features and Functionalities

Each feature follows: name, description, how it works, inputs/outputs, dependencies, and edge cases.

### 1. Authentication and Session Management

- Feature name: Signup/Signin/Signout/Forgot password
- Description: Cookie-based JWT auth with OTP-based password reset flow.
- How it works:
  1. Client sends signup/signin payload.
  2. Backend validates payload via Zod.
  3. JWT cookie (`token`) is set.
  4. Protected routes use `isAuth` middleware.
  5. Forgot password sequence is `send-otp -> verify-otp -> reset-password`.
- Inputs:
  - Signup: `fullName`, `email`, `password`, `mobile`, optional `role`
  - Signin: `email`, `password`
  - Reset flow: `email`, `otp`, `newPassword`
- Outputs:
  - User session cookie and user payload
  - Success/error messages
- Dependencies:
  - `JWT_SECRET`, `EMAIL`, `APP_PASSWORD`, rate limiters
- Edge cases:
  - Duplicate email/mobile
  - OTP expiry and attempt blocking
  - Inactive account login blocked

### 2. Role-Based Access and Dashboards

- Feature name: Multi-role access control
- Description: Different UI and actions for `user`, `owner`, and `deliveryPartner`.
- How it works:
  1. Frontend loads current user.
  2. Role-specific dashboard is rendered.
  3. Backend verifies token and ownership for protected actions.
- Inputs:
  - Authenticated session, user role
- Outputs:
  - Role-specific page and API access
- Dependencies:
  - Redux user state, `isAuth` middleware, owner checks in controllers
- Edge cases:
  - Unauthorized route access returns `401/403`
  - Owner without shop is redirected to shop creation flow

### 3. Location and City-Based Discovery

- Feature name: Geo-aware discovery
- Description: Shop and item discovery based on GPS/IP city resolution.
- How it works:
  1. Frontend requests geolocation.
  2. Geoapify reverse geocode resolves city/address.
  3. Shop/item APIs fetch city-based listings.
  4. Filters apply cuisine/rating/open-now criteria.
- Inputs:
  - `latitude`, `longitude`, city filters
- Outputs:
  - `shopsInMyCity`, `itemsInMyCity`
- Dependencies:
  - `VITE_GEOAPIKEY`, `GEOAPIKEY`, Geoapify, map slice
- Edge cases:
  - Location permission denied
  - API fallback to approximate location
  - Empty city results

### 4. Shop and Menu Management (Owner)

- Feature name: Shop/item CRUD
- Description: Owners can create/edit shop profile and manage item catalog.
- How it works:
  1. Owner creates/edits shop (`/api/shop`, `/api/shop/:shopId`).
  2. Owner adds/edits/deletes/toggles items (`/api/item/*`).
  3. Public menu endpoints expose active items; owner endpoint includes unavailable items.
- Inputs:
  - Shop payload: name, address, city, state, coordinates, image
  - Item payload: name, price, discount, category, foodType, variants, addons, prepTime, image
- Outputs:
  - Persisted shop/item documents
- Dependencies:
  - Cloudinary, Multer, Shop and Item models
- Edge cases:
  - Discount price cannot exceed price
  - Soft-delete item keeps historical integrity
  - Shop delete blocked when active orders exist

### 5. Cart and Canonical Pricing

- Feature name: Multi-shop cart engine
- Description: Deterministic cart model with server-authoritative pricing.
- How it works:
  1. Cart stores grouped shops and item snapshots.
  2. Item IDs include variant/add-on context to prevent collisions.
  3. Totals are recalculated centrally in `cartPricing.js`.
  4. Backend recomputes price from DB (frontend price is not trusted).
- Inputs:
  - Item quantity, selected variant, selected add-ons
- Outputs:
  - Canonical cart totals and normalized lines
- Dependencies:
  - Redux `cartSlice`, `cartPricing.js`, `order.service.js`
- Edge cases:
  - Legacy cart schema migration
  - Variant-required items without variant selection are rejected by backend

### 6. Checkout, Quote, and Idempotent Order Creation

- Feature name: Checkout and order creation
- Description: Server quote + idempotency-protected order creation with stock reservation.
- How it works:
  1. User selects address and cart.
  2. Frontend requests `/api/order/quote`.
  3. Frontend creates order via COD or online flow.
  4. Backend groups items by shop, reserves stock, creates `Order` and `ShopOrder` documents.
- Inputs:
  - `cartItems`, `deliveryAddress`, `paymentMethod`, `idempotencyKey`
- Outputs:
  - Order IDs, quote summary, payment initialization payload
- Dependencies:
  - Mongo transactions, order service, item stock state
- Edge cases:
  - Duplicate idempotency returns existing order
  - Insufficient stock fails request
  - Invalid address data blocks checkout

### 7. Online Payment Lifecycle (Razorpay)

- Feature name: Razorpay integration
- Description: Supports create-order, verify-payment, webhook handling, and retry.
- How it works:
  1. Frontend creates Razorpay order from backend.
  2. Razorpay checkout opens in browser.
  3. Frontend verifies payment with backend signature check.
  4. Webhook updates payment state asynchronously.
  5. Failed online payment can be retried.
- Inputs:
  - `appOrderId`, Razorpay IDs/signature
- Outputs:
  - Updated payment status (`Pending`, `Paid`, `Failed`, `Refunded`)
- Dependencies:
  - Razorpay keys/secrets, webhook secret
- Edge cases:
  - Signature mismatch sets failed state
  - Retry only for unpaid online orders
  - Stock hold timeout paths for unpaid online orders

### 8. Realtime Updates (Socket.IO)

- Feature name: Live order/delivery events
- Description: Role-scoped socket rooms stream status changes in near real-time.
- How it works:
  1. Socket authenticates by cookie token.
  2. Client joins role room (`user`, `shop`, `deliveryPartner`).
  3. Backend emits scoped status events.
  4. Frontend updates UI and/or re-fetches affected data.
- Inputs:
  - `join`, `leave`, location update events
- Outputs:
  - Real-time UI updates for customer, owner, delivery partner
- Dependencies:
  - Socket.IO server/client, JWT, Redis adapter
- Edge cases:
  - Unauthorized room joins blocked
  - Polling fallback when socket offline

### 9. Delivery Broadcast and Assignment (BullMQ + Redis)

- Feature name: Multi-round rider discovery
- Description: Delivery assignment is broadcast in rounds with retry and radius expansion.
- How it works:
  1. Owner marks `ShopOrder` as `Ready`.
  2. Assignment is created and job enqueued.
  3. Worker broadcasts to eligible delivery partners in rounds.
  4. Acceptance is atomic and race-safe.
  5. Assignment moves through picked -> delivered lifecycle.
- Inputs:
  - Assignment ID, rider location/acceptance, delivery status updates
- Outputs:
  - `DeliveryAssignment` state, notifications, wallet credits
- Dependencies:
  - Redis, BullMQ workers, geospatial indexes
- Edge cases:
  - Broadcast expiry and no-rider fallback alert
  - Atomic conflict when another rider accepted first
  - Worker disabled when Redis unavailable

### 10. Ratings and Reputation

- Feature name: Post-order ratings
- Description: Users can rate only purchased items; item/shop aggregate ratings are recalculated.
- How it works:
  1. Backend verifies purchase by linking user orders and shop orders.
  2. Creates/updates rating document.
  3. Recomputes item and shop averages.
- Inputs:
  - `itemId`, `shopId`, `rating`, optional `review`
- Outputs:
  - Updated averages and rating list
- Dependencies:
  - Rating, Order, ShopOrder, Item, Shop models
- Edge cases:
  - Non-purchased item rating blocked
  - Rating range constrained (1-5)

### 11. Earnings and Wallet Accounting

- Feature name: Owner and rider earnings
- Description: On delivery completion, wallet transactions are credited idempotently.
- How it works:
  1. `mark-delivered` runs in transaction.
  2. Credits shop and delivery wallets with unique transaction IDs.
  3. Prevents duplicate credit using idempotent transaction checks.
  4. Earnings APIs return today/month summaries.
- Inputs:
  - Delivered assignment and shopOrder financial fields
- Outputs:
  - Wallet balances, transaction history, aggregated earnings
- Dependencies:
  - `wallet.service.js`, wallet models, delivery/order controllers
- Edge cases:
  - Duplicate transaction protection
  - Already-processed earnings do not double-credit

## User Flows

### Customer Flow

1. Signup/signin.
2. Location/city detection.
3. Browse shops/items and add to cart.
4. Select address and get server quote.
5. Place COD or online order.
6. Track order timeline in real-time.
7. Rate delivered items.

### Shop Owner Flow

1. Signup/signin as owner.
2. Create and configure shop.
3. Add and manage menu items.
4. Receive and process shop orders.
5. Move status: `Pending -> Accepted -> Preparing -> Ready`.
6. Re-broadcast if needed.
7. View earnings summaries.

### Delivery Partner Flow

1. Signup/signin as delivery partner.
2. Toggle online availability.
3. Receive nearby assignments.
4. Accept assignment.
5. Mark picked and delivered.
6. Track earnings and delivery count.

## API and Integration Reference

### Auth (`/api/auth`)

- `POST /signup`
- `POST /onboard-signup`
- `POST /signin`
- `POST /signout`
- `POST /forgotPassword/send-otp`
- `POST /forgotPassword/verify-otp`
- `POST /forgotPassword/reset-password`

### User (`/api/user`)

- `GET /current`
- `PATCH /update-profile`
- `PATCH /update-location`
- `POST /addresses`
- `GET /addresses`
- `DELETE /addresses/:id`

### Geo (`/api/geo`)

- `GET /get-city`

### Shop (`/api/shop`)

- `POST /`
- `PUT /:shopId`
- `GET /me`
- `GET /city/:city`
- `GET /:id`
- `PATCH /:id/open`
- `PATCH /:id/delivery`
- `DELETE /:id`
- `GET /earnings/today`
- `GET /earnings/month`

### Item (`/api/item`)

- `POST /add-item`
- `PUT /edit-item/:itemId`
- `DELETE /delete/:itemId`
- `PATCH /toggle-availability/:itemId`
- `GET /my-items`
- `GET /get-item/:itemId`
- `GET /by-city/:city`
- `GET /shop-items/:shopId`
- `GET /menu/:shopId`

### Order (`/api/order`)

- `POST /quote`
- `POST /create`
- `POST /create-razorpay-order`
- `POST /verify-payment`
- `POST /payment-failed`
- `POST /:orderId/retry-payment`
- `POST /razorpay-webhook`
- `POST /cancel/:orderId`
- `GET /my-orders`
- `GET /owner-orders`
- `GET /:orderId`
- `PATCH /update-status`
- `PATCH /rebroadcast`
- `PATCH /rebroadcast/:shopOrderId`

### Delivery (`/api/delivery`)

- `PATCH /toggle-availability`
- `PATCH /location`
- `GET /available-assignments`
- `GET /my-assignments`
- `POST /accept-assignment`
- `POST /accept`
- `PATCH /mark-picked`
- `PATCH /mark-delivered`
- `PATCH /cancel`
- `GET /status/:orderId`
- `GET /earnings`
- `GET /earnings/today`
- `GET /earnings/month`

### Rating (`/api/rating`)

- `POST /add`
- `GET /item/:itemId`
- `GET /shop/:shopId`

## Realtime and Queue Behavior

### Socket client events

- `join` with `{ type, id }`
- `leave` with `{ type, id }`
- `deliveryPartner:locationUpdate` with `{ latitude, longitude }`

### Socket server events (examples)

- `order:statusUpdate`
- `shopOrder:statusUpdate`
- `shopOrder:cancelled`
- `delivery:new`
- `delivery:taken`
- `delivery:assigned`
- `delivery:outForDelivery`
- `delivery:delivered`
- `delivery:deliveryPartnerAssigned`

### BullMQ queues

- `delivery-broadcast`
- `admin-alerts`

Broadcast uses up to 3 rounds with increasing candidate radius and retries.

## Data Model Snapshot

- `Order`: parent order, payment state, aggregate totals, idempotency key.
- `ShopOrder`: per-shop split of an order with independent status lifecycle.
- `DeliveryAssignment`: broadcast state + assigned rider + pickup/dropoff geodata.
- `User`: role, address book, auth fields, optional geolocation.
- `ShopWallet` and `DeliveryWallet`: idempotent transaction ledgers.

## Testing

### Backend tests

```bash
cd backend
npm test
```

Current suite includes integration checks in `backend/tests/order.integration.test.js`.

### Realtime helper script

```bash
cd backend
npm run test:realtime
```

Note:

- `test-realtime.js` currently assumes Redis on `localhost:6379`.
- Main runtime defaults Redis to `6380` unless overridden.

## Edge Cases and Limitations

- Port mismatch can still occur when custom backend/frontend env values do not match.
- If Redis is unavailable, API can still start but delivery worker/broadcast features will not run.
- Public signup UI allows selecting `owner` and `deliveryPartner` directly; onboarding code route exists separately.
- Refund behavior currently stores deterministic metadata and state updates; full payment gateway refund automation is not fully implemented.
- Some legacy notes/scripts in repository may reference older event names/ports.
- Unused legacy page `frontend/src/pages/Owner/index.jsx` exists and is not part of active route tree.

## Troubleshooting

### Backend starts but no delivery assignments happen

- Ensure Redis is reachable using `REDIS_URL` (managed Redis) or `REDIS_HOST`/`REDIS_PORT`.
- Check backend logs for worker startup messages.

### Frontend cannot reach API

- Set both `VITE_API_URL` and `VITE_SOCKET_URL` explicitly.
- Confirm backend `PORT` and frontend env match.

### OTP emails not sending

- Verify `EMAIL` and `APP_PASSWORD`.
- Ensure app password is generated from Gmail account security settings.

### Razorpay checkout not opening

- Check keys in backend env.
- Disable strict ad-block/privacy extensions for checkout script loading.

## Future Scope

- Stronger production onboarding and role provisioning policy.
- Full automated refund and reconciliation jobs.
- Keep all docs/scripts/env examples aligned when defaults change.
- Expanded test coverage (unit + integration + e2e).
- Admin/ops dashboard for queue health, alerts, and metrics.

## Documentation Map

- Root docs: `README.md` (this file, canonical)
- Backend startup shortcuts: `backend/QUICKSTART.md`
- Backend architecture notes: `backend/ARCHITECTURE.md`
- Realtime setup notes: `backend/REALTIME_SETUP.md`
- Frontend notes: `frontend/README.md`





Primary entry files reviewed:
server.js, app.js, socket.js, queue.js, workers/deliveryWorker.js.

1. Architecture Breakdown

Backend is layered as routes -> controllers -> services -> models, with middleware and utilities.
Express app and middleware wiring live in app.js (line 19).
HTTP server + Socket.IO + DB connect + worker bootstrap are in server.js (line 53).
Queue producer code is in queue.js (line 113), queue consumers in deliveryWorker.js (line 271).
Mongo models are normalized around Order + ShopOrder + DeliveryAssignment.
Request flow:

Client hits Express route in /api/* from app.js (line 32).
Middleware handles auth/cookies/cors/rate-limit.
Controller executes business rules.
Services perform pricing/transactions/wallet logic.
Models persist to MongoDB.
For delivery-ready events, controller enqueues BullMQ jobs.
Worker processes jobs, finds riders, emits socket events.
Socket layer delivers role-targeted realtime events.
Hourly cron in server.js (line 17) performs consistency cleanup.
2. Core Components Analysis

Express API:

Route groups: auth, user, geo, shop, item, order, rating, delivery.
Good modular split, but no centralized error middleware.
CORS allows one origin string only, not multi-origin list.
Authentication (JWT + cookies):

Token issued on signup/signin and stored in httpOnly cookie in auth.controller.js (line 38).
isAuth validates cookie or bearer token in isAuth.js (line 8).
Major security issue: normal signup still accepts owner and deliveryPartner role directly in auth.controller.js (line 27), bypassing onboarding-code intent.
MongoDB usage:

Strong schema coverage with indices, geo fields, and normalized ShopOrder.
Transactions used in key financial paths (good), especially delivery completion.
Order model contains large legacy commented blocks that should be cleaned for maintainability.
Redis usage:

Used by BullMQ and Socket.IO adapter.
Connection parsing supports REDIS_URL and host/port modes with optional TLS.
Health check is raw TCP only, not auth/TLS-verified ping.
BullMQ queues and workers:

Queues: delivery-broadcast, admin-alerts.
Worker performs round-based broadcast with escalating radius.
admin-alert worker is effectively a no-op (async () => {}), so alerts are not truly processed.
Socket.IO realtime flow:

JWT-authenticated socket handshake.
Room model for user/shop/deliveryPartner.
Redis adapter enabled for multi-instance pub/sub.
Worker depends on in-memory socket map for connected rider IDs, which couples worker logic to API instance memory.
File uploads (Multer + Cloudinary):

Multer writes temporary files to ./public, Cloudinary upload helper then deletes temp file.
Good MIME + size limits.
Risk: controllers assume Cloudinary upload success in some places and may dereference null.
External services:

Razorpay: order creation + signature verification implemented.
Razorpay webhook verifies signature but does not update order state yet.
Email (Nodemailer Gmail) used for OTP.
Geoapify reverse geocode used in user city lookup.
3. Redis Usage Deep Dive

Where Redis is used:

BullMQ queue/storage in queue.js (line 65).
BullMQ workers in deliveryWorker.js (line 271).
Socket.IO adapter pub/sub in socket.js (line 140).
How BullMQ interacts with Redis:

Queue adds deterministic job IDs (assignmentId:attempt) to prevent duplicate round jobs.
Worker consumes with configurable concurrency.
Uses shared ioredis connection for queues/workers.
How Socket.IO uses Redis adapter:

Creates pub/sub clients from same Redis options and registers createAdapter(pubClient, subClient).
Enables cross-instance event propagation.
Production structure assessment:

Good base: URL/TLS/password support exists.
Gaps:
TCP-only health check can give false confidence.
No robust connection lifecycle shutdown.
Worker connectivity assumptions tied to local in-memory socket map reduce correctness across separate worker process or multi-instance topology.
4. Worker System

Is worker inside server or separate?

Inside same process. startDeliveryWorker() is called from server.js (line 61).
Is this safe for production?

Safe for low scale/single instance.
Risky for horizontal scaling because every web instance also runs workers and cron.
Should it be split?

Yes for production.
Split into separate worker service/process, but first remove worker’s dependency on local socket maps (getConnectedDeliveryPartnerIds) and rely on DB/state-only criteria.
5. Environment Variables (All Used)

Used in code:

APP_PASSWORD, CLIENT_URL, CLOUD_APIKEY, CLOUD_NAME, CLOUD_SECRET, DELIVERY_BROADCAST_CONCURRENCY, EMAIL, ENABLE_DELIVERY_WORKER, FRONTEND_URL, GEOAPIKEY, JWT_SECRET, MONGODB_URL, NODE_ENV, PORT, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_VERIFY_BYPASS, RAZORPAY_WEBHOOK_SECRET, REDIS_HOST, REDIS_PASSWORD, REDIS_PORT, REDIS_TLS, REDIS_URL, STAFF_ONBOARDING_CODE.
Required for baseline app:

MONGODB_URL, JWT_SECRET.
CLIENT_URL or FRONTEND_URL strongly recommended in production.
Redis variables are effectively required for full realtime/queue behavior.
Feature-conditional:

Cloudinary: CLOUD_NAME, CLOUD_APIKEY, CLOUD_SECRET.
OTP mail: EMAIL, APP_PASSWORD.
Geo: GEOAPIKEY.
Onboarding: STAFF_ONBOARDING_CODE.
Razorpay: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET.
RAZORPAY_VERIFY_BYPASS should be disabled in production.
Optional/tuning:

PORT, NODE_ENV, ENABLE_DELIVERY_WORKER, DELIVERY_BROADCAST_CONCURRENCY.
Redis connection shape: either REDIS_URL or host/port/password/tls set.
Important note:

ORDER_STOCK_HOLD_MINUTES exists in .env.example (line 13) but is not used in runtime code.
6. Deployment Readiness Check

What will break or behave incorrectly as-is:

Owner cancel path can fail to persist shopOrder.status = Cancelled for COD/unpaid orders because save is skipped when refund short-circuits in order.controller.js (line 404).
Public signup allows privileged roles directly (owner, deliveryPartner) in auth.controller.js (line 27).
Webhook verifies signature but does not update order/payment state in webhook.routes.js (line 24).
Package scripts reference missing files: tests/realtime/migration scripts in package.json (line 12).
Upload controllers can crash if Cloudinary returns null (null dereference risk in user/item/shop controllers).
CORS origin mismatch risk: app prefers CLIENT_URL first, socket prefers FRONTEND_URL first.
Render deployment changes needed:

Separate Web service and Worker service.
Ensure only worker service runs BullMQ consumers and cron (or gate cron by env).
Set exact production frontend origin envs and keep HTTP + socket origin aligned.
Use persistent logs/monitoring for queue failures.
Upstash Redis changes needed:

Use REDIS_URL=rediss://... as primary.
Improve health check from raw TCP to authenticated Redis ping.
Verify connection limits for socket adapter + queue + workers.
MongoDB Atlas changes needed:

Set MONGODB_URL Atlas URI and network allowlist.
Ensure required indexes build cleanly on first startup.
Keep replica-set capable cluster for transactions (Atlas supports this).
7. Risk & Issues

Scalability:

Worker + cron in web process leads duplicate processing when scaled horizontally.
Wallet transaction arrays in single wallet docs grow unbounded (document bloat risk over time).
getOwnerOrders does per-order geospatial count query (N+1 heavy).
Performance:

Synchronous fs.unlinkSync in request path.
Broad cron scan every hour over assignments.
Multiple large commented legacy blocks increase maintenance and audit difficulty.
Security:

Privilege escalation via signup role.
RAZORPAY_VERIFY_BYPASS flag present; if enabled in prod, payment signature checks can be bypassed.
No Helmet/security hardening middleware.
OTP stored plaintext in DB.
Memory leaks / infinite loops:

No obvious infinite loop found.
Socket maps are cleaned on disconnecting; acceptable.
Temp file leak possible when multer writes file but downstream validation fails before Cloudinary cleanup.
Incorrect async/consistency handling:

acceptDeliveryAssignment does not wrap all dependent updates in one transaction, so partial state inconsistency is possible under race/failure.
Server starts listening before DB connect completes.
Silent catch {} blocks in image replacement paths swallow errors.
8. Required Changes for Production (No Code Implemented Yet)

Redis config fixes:

Replace TCP health check with authenticated Redis ping.
Standardize on REDIS_URL for managed Redis and keep TLS handling explicit.
Add graceful Redis client shutdown on SIGTERM/SIGINT.
Worker separation:

Move BullMQ workers to a dedicated worker process/service.
Gate cron so it runs in one place only.
Remove worker dependency on local socket memory for candidate logic.
Socket fixes:

Unify CORS origin precedence between HTTP and Socket.IO.
Add socket event rate limiting / payload validation.
Close adapter Redis clients explicitly on shutdown.
CORS/cookie issues:

Keep one canonical frontend origin variable or explicit allowlist.
Ensure frontend uses credentials: true everywhere with cookie auth.
Verify production sameSite=None + HTTPS end-to-end behavior.
File upload issues:

Add null-check guards after Cloudinary upload returns.
Ensure temp-file cleanup on validation failures after multer.
Consider memory storage/streamed upload to avoid disk dependency.
