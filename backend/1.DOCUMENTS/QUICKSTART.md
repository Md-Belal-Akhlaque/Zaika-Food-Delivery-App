# Backend Quick Start (Zaika)

This quick start is focused on running backend + realtime dependencies locally.

For full project documentation (frontend + backend + architecture), see [../README.md](../README.md).

## 1. Prerequisites

- Node.js and npm
- MongoDB connection string
- Redis
- Cloudinary account (for image upload flows)
- Geoapify key
- Gmail app password (OTP emails)
- Razorpay keys (only for online payment flow)

## 2. Install

```bash
cd backend
npm install
```

## 3. Environment Setup

Create `backend/.env` (you can copy from `backend/.env.example`) with at least:

```env
NODE_ENV=development
PORT=3000
MONGODB_URL=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173

REDIS_HOST=127.0.0.1
REDIS_PORT=6380

CLOUD_NAME=your_cloudinary_name
CLOUD_APIKEY=your_cloudinary_api_key
CLOUD_SECRET=your_cloudinary_api_secret

GEOAPIKEY=your_geoapify_key
EMAIL=your_gmail_address
APP_PASSWORD=your_gmail_app_password

STAFF_ONBOARDING_CODE=your_staff_code
```

Optional (online payments):

```env
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

Optional worker tuning:

```env
ENABLE_DELIVERY_WORKER=true
DELIVERY_BROADCAST_CONCURRENCY=10
ORDER_STOCK_HOLD_MINUTES=15
```

## 4. Start Redis

Example using Docker with app default port mapping (`6380 -> 6379`):

```bash
docker run -d --name redis-zaika -p 6380:6379 redis:7-alpine
```

## 5. Run Backend

```bash
npm run dev
```

Expected startup sequence includes:

- DB connection attempt
- Socket.IO initialization
- Delivery workers startup (if Redis is reachable and worker enabled)
- HTTP server listening on `PORT`

## 6. Smoke Test Endpoints

- `GET /api/user/current` (with auth cookie/token)
- `GET /api/shop/city/:city`
- `POST /api/order/quote`

## 7. Tests

```bash
npm test
```

Realtime script:

```bash
npm run test:realtime
```

Note:

- `test-realtime.js` currently assumes Redis on `localhost:6379`.
- Runtime app defaults to `REDIS_PORT=6380` unless overridden.

## 8. Common Pitfalls

- Missing `MONGODB_URL` or `JWT_SECRET` causes auth/data failures.
- Frontend/backend port mismatch if frontend defaults (`5000`) are not overridden.
- If Redis is down, API runs but delivery broadcasting and queue workers do not.
