# ðŸ—ï¸ Real-time Architecture Overview

## System Architecture Diagram

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                         FRONTEND (React)                            â”‚
â”‚                                                                     â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                      â”‚
â”‚  â”‚  User    â”‚    â”‚  Shop    â”‚    â”‚  Rider   â”‚                      â”‚
â”‚  â”‚  App     â”‚    â”‚  Owner   â”‚    â”‚  App     â”‚                      â”‚
â”‚  â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜                      â”‚
â”‚       â”‚               â”‚               â”‚                             â”‚
â”‚       â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                             â”‚
â”‚                           â”‚                                         â”‚
â”‚                  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”                                â”‚
â”‚                  â”‚  socket.js      â”‚                                â”‚
â”‚                  â”‚  (Client SDK)   â”‚                                â”‚
â”‚                  â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”˜                                â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                            â”‚ WebSocket Connection
                            â”‚ (Port 3000)
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                         BACKEND (Node.js/Express)                   â”‚
â”‚                                                                     â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚                    Socket.io Server                          â”‚  â”‚
â”‚  â”‚                                                              â”‚  â”‚
â”‚  â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”      â”‚  â”‚
â”‚  â”‚  â”‚ User Room    â”‚  â”‚ Shop Room    â”‚  â”‚ Rider Room   â”‚      â”‚  â”‚
â”‚  â”‚  â”‚ userIdâ†’sock  â”‚  â”‚ shopIdâ†’sock  â”‚  â”‚ riderIdâ†’sock â”‚      â”‚  â”‚
â”‚  â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜      â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”‚                           â”‚                                        â”‚
â”‚              â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                          â”‚
â”‚              â”‚                         â”‚                          â”‚
â”‚       â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”          â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”                    â”‚
â”‚       â”‚ Controllers â”‚          â”‚ BullMQ      â”‚                    â”‚
â”‚       â”‚             â”‚          â”‚ Queues      â”‚                    â”‚
â”‚       â”‚ â€¢ order     â”‚          â”‚             â”‚                    â”‚
â”‚       â”‚ â€¢ delivery  â”‚          â”‚ â€¢ broadcast â”‚                    â”‚
â”‚       â”‚ â€¢ shop      â”‚          â”‚ â€¢ retry     â”‚                    â”‚
â”‚       â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜          â”‚ â€¢ alerts    â”‚                    â”‚
â”‚                                â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜                    â”‚
â”‚                                       â”‚                            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                        â”‚
                              â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                              â”‚   Redis Server    â”‚
                              â”‚   (Port 6379)     â”‚
                              â”‚                   â”‚
                              â”‚ â€¢ Queue Storage   â”‚
                              â”‚ â€¢ Pub/Sub         â”‚
                              â”‚ â€¢ Job Data        â”‚
                              â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## Data Flow: Order Placement to Delivery

### Phase 1: Order Created

```
User (Browser) 
   â”‚
   â”œâ”€[HTTP POST]â”€â†’ /api/order/create
   â”‚                 â”‚
   â”‚                 â”œâ”€[Transaction]â”€â†’ Create Order + ShopOrders
   â”‚                 â”‚
   â”‚                 â””â”€[Socket.emit]â”€â†’ emitToShop("order:new")
   â”‚                                    â”‚
   Shop (Browser) â†â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
   (Receives instant notification)
```

### Phase 2: Delivery Broadcast

```
Order Controller
   â”‚
   â”œâ”€[Create]â”€â†’ DeliveryAssignment
   â”‚
   â””â”€[Enqueue]â”€â†’ BullMQ: delivery-broadcast queue
                  â”‚
                  â”‚ [Job added to Redis]
                  â–¼
              Delivery Worker
                  â”‚
                  â”œâ”€[Query]â”€â†’ Find riders within 10km
                  â”‚           (GeoJSON location lookup)
                  â”‚
                  â””â”€[Broadcast]â”€â†’ emitToAllRiders("delivery:new")
                                  â”‚
                     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                     â”‚            â”‚            â”‚
                  Rider A       Rider B     Rider C
                  (Browser)     (Browser)   (Browser)
```

### Phase 3: Rider Accepts

```
Rider A (Browser)
   â”‚
   â”œâ”€[HTTP POST]â”€â†’ /api/delivery/accept
   â”‚                 â”‚
   â”‚                 â”œâ”€[Update]â”€â†’ Assignment status = "accepted"
   â”‚                 â”‚
   â”‚                 â”œâ”€[Emit]â”€â†’ emitToRider(other riders, "delivery:taken")
   â”‚                 â”‚           â”‚
   â”‚                 â”‚           â””â”€â†’ Rider B, C notified
   â”‚                 â”‚
   â”‚                 â””â”€[Emit]â”€â†’ emitToShop(shop, "delivery:riderAssigned")
   â”‚                             â”‚
   Shop (Browser) â†â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
   (Sees rider name and details)
```

### Phase 4: Order Delivered

```
Rider (at customer location)
   â”‚
   â”œâ”€[HTTP POST]â”€â†’ /api/delivery/mark-delivered
   â”‚                 â”‚
   â”‚                 â”œâ”€[Update]â”€â†’ Assignment status = "delivered"
   â”‚                 â”‚
   â”‚                 â”œâ”€[Update]â”€â†’ Rider isAvailable = true
   â”‚                 â”‚
   â”‚                 â””â”€[Emit]â”€â†’ emitToUser(customer, "delivery:delivered")
   â”‚                             â”‚
   Customer (Browser) â†â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
   (Order marked as delivered)
```

---

## Component Breakdown

### 1. Socket.io Layer

**Purpose:** Real-time bidirectional communication  
**File:** `backend/socket.js`

**Key Features:**
- Maps users/shops/riders to socket connections
- Provides targeted emission functions
- Handles connection/disconnection events
- Supports broadcasting to multiple recipients

**Example Usage:**
```javascript
// Backend controller
import { emitToShop } from './socket.js';

emitToShop(shopId, "order:new", {
  orderId: "abc123",
  items: [...],
  total: 500
});
```

### 2. BullMQ Queue Layer

**Purpose:** Background job processing with retries  
**Files:** `backend/queue.js`, `backend/workers/deliveryWorker.js`

**Three Queues:**

#### A. delivery-broadcast
- **Purpose:** Find riders for pending deliveries
- **Trigger:** New order placed
- **Logic:** Find riders within 10km, broadcast to all
- **Retry:** Up to 5 attempts with exponential backoff

#### B. delivery-retry
- **Purpose:** Retry undelivered orders
- **Trigger:** Delivery marked as "undelivered"
- **Delay:** 5 minutes before retry
- **Logic:** Re-broadcast to find new rider

#### C. admin-alerts
- **Purpose:** Notify admins of critical events
- **Trigger:** No riders found, max retries reached
- **Logic:** Log alert for monitoring

**Example Usage:**
```javascript
// Backend controller
import { enqueueBroadcast } from './queue.js';

await enqueueBroadcast(assignmentId, 1);
// Worker will process asynchronously
```

### 3. Redis Data Store

**Purpose:** In-memory data store for queues and pub/sub  
**Configuration:** `localhost:6379`

**What's Stored:**
- Queue job data (pending, active, completed)
- Socket connection mappings (temporary)
- Pub/sub channel subscriptions

**Data Structure:**
```
bull:delivery-broadcast:wait      â†’ List of pending jobs
bull:delivery-broadcast:active    â†’ Currently processing
bull:delivery-broadcast:completed â†’ Recently completed
bull:delivery-retry:wait          â†’ Delayed retry jobs
```

---

## Event Reference Matrix

| Event | Direction | From | To | Payload | Purpose |
|-------|-----------|------|----|---------|---------|
| `user:join` | Clientâ†’Server | User | Socket | userId | Join user room |
| `shop:join` | Clientâ†’Server | Shop | Socket | shopId | Join shop room |
| `rider:join` | Clientâ†’Server | Rider | Socket | riderId | Join rider room |
| `order:new` | Serverâ†’Client | Socket | Shop | Order details | New order notification |
| `delivery:new` | Serverâ†’Client | Socket | Riders | Assignment details | Delivery opportunity |
| `delivery:taken` | Serverâ†’Client | Socket | Riders | { assignmentId, message } | Opportunity taken |
| `delivery:riderAssigned` | Serverâ†’Client | Socket | Shop | { riderName } | Rider assigned |
| `delivery:delivered` | Serverâ†’Client | Socket | User | { message } | Order delivered |

---

## Geographic Location Flow

```
Shop Location (MongoDB)
   â”‚
   â”œâ”€ GeoJSON: { type: "Point", coordinates: [lng, lat] }
   â”‚
   â””â”€â–º Stored in shop.location field

Rider Location (MongoDB)
   â”‚
   â”œâ”€ GeoJSON: { type: "Point", coordinates: [lng, lat] }
   â”‚
   â””â”€â–º Updated when rider toggles availability

Broadcast Query (Worker)
   â”‚
   â”œâ”€ Shop location: [lngâ‚, latâ‚]
   â”‚
   â”œâ”€ Query: Find riders where
   â”‚   distance(rider.location, shop.location) â‰¤ 10km
   â”‚
   â””â”€â–º Returns array of nearby riders
```

**MongoDB Query:**
```javascript
DeliveryPartner.find({
  role: "delivery-partner",
  isAvailable: true,
  location: {
    $near: {
      $geometry: { 
        type: "Point", 
        coordinates: [shopLng, shopLat] 
      },
      $maxDistance: 10000 // 10km
    }
  }
})
```

---

## Failure Scenarios & Recovery

### Scenario 1: No Riders Available

```
Broadcast Job (attempt 1)
   â”‚
   â”œâ”€ Query: Find riders within 10km
   â”‚  Result: 0 riders found
   â”‚
   â”œâ”€ Action: Delay 30 seconds
   â”‚
   â””â”€â–º Retry (attempt 2)
       â”‚
       â”œâ”€ Still 0 riders
       â”‚
       â””â”€â–º Retry (attempt 3, 4, 5...)
           â”‚
           â””â”€â–º Max attempts reached
               â”‚
               â””â”€â–º Enqueue admin alert
                   â”‚
                   â””â”€â–º Admin notified manually
```

### Scenario 2: Rider Disconnects Mid-Delivery

```
Rider accepts delivery
   â”‚
   â”œâ”€ Socket disconnects unexpectedly
   â”‚
   â”œâ”€ Assignment status remains "assigned"
   â”‚
   â”œâ”€ Timeout detection (TODO: implement)
   â”‚
   â””â”€â–º After 15 minutes, mark as "undelivered"
       â”‚
       â””â”€â–º Enqueue retry
           â”‚
           â””â”€â–º Broadcast to other riders
```

### Scenario 3: Redis Restarts

```
Redis stops
   â”‚
   â”œâ”€ BullMQ queues temporarily unavailable
   â”‚
   â”œâ”€ New broadcasts fail to enqueue
   â”‚
   â”œâ”€ Socket.io continues working (no queues needed)
   â”‚
   â””â”€â–º Redis restarts
       â”‚
       â”œâ”€ Queues restored (persistent storage)
       â”‚
       â””â”€â–º Workers resume processing
```

---

## Performance Characteristics

### Socket.io

- **Connections per server:** ~10,000 concurrent
- **Message latency:** < 50ms (local network)
- **Memory per connection:** ~1KB
- **Reconnection time:** 1-5 seconds

### BullMQ

- **Job processing time:** 100ms - 2s per job
- **Queue capacity:** Unlimited (Redis-backed)
- **Concurrency:** Configurable (default: 1)
- **Retry delay:** 30s - 32min (exponential)

### Redis

- **Read/write latency:** < 1ms
- **Throughput:** 100K+ ops/sec
- **Memory usage:** Depends on queue size
- **Persistence:** RDB snapshots + AOF log

---

## Scaling Strategies

### Horizontal Scaling (Multiple Servers)

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Server 1 â”‚     â”‚ Server 2 â”‚     â”‚ Server 3 â”‚
â”‚ Socket   â”‚     â”‚ Socket   â”‚     â”‚ Socket   â”‚
â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜
     â”‚                â”‚                â”‚
     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                      â”‚
             â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”
             â”‚   Redis Cluster â”‚
             â”‚  (Shared State) â”‚
             â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Requirements:**
- Redis adapter for Socket.io (already configured)
- Shared Redis instance for BullMQ (already configured)
- Load balancer in front of servers

### Vertical Scaling (Single Powerful Server)

- Increase Node.js worker threads
- Increase BullMQ concurrency
- Add more RAM for Redis
- Use faster CPU for geo-queries

---

## Monitoring Points

### Socket.io Metrics

- Total connected clients
- Clients by room (users/shops/riders)
- Messages sent/received per second
- Connection/disconnection rate
- Reconnection rate

### BullMQ Metrics

- Jobs waiting/active/completed/failed
- Average processing time
- Retry rate
- Queue depth over time

### Redis Metrics

- Memory usage
- Operations per second
- Keyspace hits/misses
- Connected clients

---

## Security Considerations

### Current Implementation

âœ… JWT authentication required for API calls  
âœ… Socket connections inherit auth from HTTP  
âœ… Room joining validates user identity  
âœ… Events only sent to authorized recipients  

### TODO for Production

âš ï¸ Add socket handshake JWT validation  
âš ï¸ Implement rate limiting per socket  
âš ï¸ Add event payload validation  
âš ï¸ Log all socket events for auditing  
âš ï¸ Add timeout for slow/misbehaving clients  

---

This architecture provides a robust, scalable foundation for real-time features in your food delivery app! ðŸš€

