# Realtime Setup Guide (Socket.IO + BullMQ)

This document describes the current realtime implementation in the backend.

## Components

- Socket server: `backend/socket.js`
- Queue producer: `backend/queue.js`
- Delivery worker: `backend/workers/deliveryWorker.js`
- Trigger points:
  - Shop order status updates in `backend/controllers/order.controller.js`
  - Delivery partner actions in `backend/controllers/delivery.controller.js`

## Dependencies

- Redis (required for BullMQ and Socket.IO Redis adapter)
- JWT secret (socket auth)
- MongoDB geospatial indexes (`2dsphere`) for rider matching

## Required Environment Variables

```env
REDIS_HOST=127.0.0.1
REDIS_PORT=6380
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173

ENABLE_DELIVERY_WORKER=true
DELIVERY_BROADCAST_CONCURRENCY=10
```

## Socket Authentication and Room Model

Authentication:

- Socket middleware reads token from:
  - cookie `token`, or
  - `socket.handshake.auth.token`, or
  - `socket.handshake.query.token`
- Token is verified with `JWT_SECRET`.

Room strategy:

- User private room: `user:<userId>`
- Shop room: `shop:<shopId>`
- Delivery partner room: `deliveryPartner:<userId>`
- Generic delivery partner room: `deliveryPartner` (broadcast group)

Client joins rooms via:

- `join` event with `{ type, id }`
- `leave` event with `{ type, id }`

## Event Reference

Server -> Client (main events):

- `shopOrder:statusUpdate`
- `shopOrder:cancelled`
- `order:statusUpdate`
- `delivery:new`
- `delivery:taken`
- `delivery:deliveryPartnerAssigned`
- `delivery:assigned`
- `delivery:outForDelivery`
- `delivery:delivered`
- `order:locationUpdate`

Client -> Server (main events):

- `join`
- `leave`
- `deliveryPartner:locationUpdate`

## Delivery Broadcast Lifecycle

1. Owner sets `ShopOrder` status to `Ready`.
2. Backend creates `DeliveryAssignment`.
3. `enqueueBroadcast(assignmentId, 1)` adds BullMQ job (`delivery-broadcast`).
4. Worker processes round 1.
5. If not accepted, worker enqueues delayed next round.
6. Up to 3 rounds are attempted with expanding radius:
  - Round 1: near, small batch
  - Round 2: wider radius, larger batch
  - Round 3: largest radius batch
7. If no acceptance after rounds, assignment marked failed and alert queue is used.

## Acceptance and Assignment Safety

Acceptance endpoint:

- `POST /api/delivery/accept-assignment`

Atomic checks include:

- Assignment still `unassigned`
- Broadcast entry exists for rider
- Broadcast entry not expired
- Rider is active, available, and not busy
- Rider has no other active assignment

On success:

- Assignment becomes `assigned`
- Rider marked `isBusy=true`, `isAvailable=false`
- Other riders receive `delivery:taken`
- Shop receives assignment event
- Customer receives `delivery:assigned`

## Delivery Progress and Completion

Endpoints:

- `PATCH /api/delivery/mark-picked`
- `PATCH /api/delivery/mark-delivered`

Completion behavior:

- Assignment `picked -> delivered`
- `ShopOrder` marked delivered and earnings processed
- Delivery and shop wallets credited (idempotent transaction IDs)
- Rider availability restored
- Parent order status recalculated
- Customer notified via socket

## Start Procedure

1. Ensure Redis is running and reachable at configured host/port.
2. Start backend:

```bash
cd backend
npm run dev
```

3. Confirm logs show worker startup and socket initialization.

## Validation Checklist

- Delivery partner can connect socket and join delivery room.
- Owner can move order to `Ready`.
- Rider receives `delivery:new` in realtime.
- Rider acceptance updates owner/customer screens.
- Mark picked and delivered events are reflected in tracking flow.

## Troubleshooting

- No realtime events:
  - check socket auth token/cookie
  - check frontend socket URL points to backend
- No queue processing:
  - confirm Redis is up
  - confirm worker is enabled
- No riders matched:
  - verify rider has location
  - verify rider is active and available
  - verify geospatial indexes and coordinates are valid

