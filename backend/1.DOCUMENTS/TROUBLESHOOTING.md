# ðŸ”§ Troubleshooting Guide

## Common Errors & Solutions

---

### âŒ Error: "Queue is not a constructor"

**Error Message:**
```
TypeError: Queue is not a constructor
    at file:///.../backend/queue.js:12:39
```

**Cause:**  
BullMQ v5.x changed from default export to named exports.

**Solution:**
```javascript
// âŒ WRONG (old BullMQ v4 syntax)
import Queue from "bullmq";

// âœ… CORRECT (BullMQ v5 syntax)
import { Queue, Worker } from "bullmq";
```

**Files to check:**
- `backend/queue.js` - Line 1
- `backend/workers/deliveryWorker.js` - Line 1

---

### âŒ Error: "Cannot connect to Redis"

**Error Message:**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Cause:**  
Redis server is not running.

**Solution:**

**Windows:**
```bash
# Start Redis service
net start Redis

# Or run manually
redis-server
```

**Verify Redis is running:**
```bash
redis-cli ping
# Should return: PONG
```

**Install Redis (if not installed):**
```bash
# Using Chocolatey
choco install redis-64
```

See `REDIS_INSTALL.md` for detailed instructions.

---

### âŒ Error: "Cannot find module 'socket.io-client'"

**Error Message:**
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'socket.io-client'
```

**Cause:**  
Socket.io client not installed in frontend.

**Solution:**
```bash
cd frontend
npm install socket.io-client
```

---

### âŒ Error: "Socket connection failed"

**Error Message:**
```
WebSocket connection to 'ws://localhost:3000' failed
```

**Possible Causes & Solutions:**

1. **Backend not running**
   ```bash
   cd backend
   npm run dev
   ```

2. **Wrong port in frontend .env**
   ```env
   VITE_SOCKET_URL=http://localhost:3000
   ```

3. **Firewall blocking**
   - Allow port 3000 in Windows Firewall

4. **CORS issue**
   Check `backend/socket.js`:
   ```javascript
   cors: {
     origin: process.env.FRONTEND_URL || "http://localhost:5173",
     credentials: true
   }
   ```

---

### âŒ Error: "No riders found"

**Error Message:**
```
âš ï¸ No riders found near assignment abc123
```

**Causes:**

1. **No riders logged in** - Riders must be online and available
2. **Riders too far** - Must be within 10km of shop
3. **Missing location** - Rider location must be set in database
4. **Not marked available** - Rider status must be `isAvailable: true`

**Solutions:**

1. Login as rider and set status to "Available"
2. Ensure rider location coordinates are set
3. Check MongoDB query in `workers/deliveryWorker.js`

**Debug:**
```javascript
// In deliveryWorker.js, add logging:
console.log('Shop location:', shopLocation);
console.log('Found riders:', nearbyRiders.length);
```

---

### âŒ Error: "Jobs stuck in queue"

**Symptoms:**
- Orders created but no broadcasts
- Backend logs show no processing

**Causes:**

1. **Worker not started** - Check server.js imports
2. **Redis connection lost** - Restart Redis
3. **Worker crashed** - Check console for errors

**Solutions:**

1. **Check worker is running:**
   ```bash
   # Look for this in backend logs:
   âœ… BullMQ delivery worker started successfully
   ```

2. **Restart everything:**
   ```bash
   # Stop backend (Ctrl+C)
   # Stop Redis
   net stop Redis
   
   # Start Redis
   net start Redis
   
   # Start backend
   npm run dev
   ```

3. **Clear stuck jobs (development only!):**
   ```bash
   redis-cli FLUSHALL
   ```

---

### âŒ Error: "savedAddresses.map is not a function"

**Error Message:**
```
TypeError: savedAddresses.map is not a function
```

**Cause:**  
Redux state not an array.

**Solution:**  
Already fixed in:
- `frontend/src/redux/userSlice.js` - Line 28
- `frontend/src/pages/CheckOut.jsx` - Selector updated

If it reappears, check:
```javascript
// In userSlice.js
setSavedAddresses: (state, action) => {
  state.savedAddresses = Array.isArray(action.payload) 
    ? action.payload 
    : [];
};
```

---

### âŒ Error: "emitToShop is not defined"

**Error Message:**
```
ReferenceError: emitToShop is not defined
```

**Cause:**  
Socket import commented out or missing.

**Solution:**
```javascript
// In order.controller.js or delivery.controller.js
import { emitToShop, emitToUser, emitToRider } from "../socket.js";
```

---

### âŒ Error: "ownerId vs owner field mismatch"

**Error Message:**
```
Cast to ObjectId failed because value "undefined"
```

**Cause:**  
Using wrong field name when creating shop.

**Solution:**
```javascript
// âŒ WRONG
await Shop.create({ ownerId: userId });

// âœ… CORRECT
await Shop.create({ owner: userId });
```

Fixed in `shop.controller.js` line 35.

---

### âŒ Error: "Address validation failed"

**Error Message:**
```
ValidationError: Address validation failed: label is required
```

**Cause:**  
Missing required address fields.

**Solution:**
Ensure address object has:
```javascript
{
  label: "Home",        // Required
  address: "123 Main St", // Required
  pincode: "123456",     // Required (6 digits)
  location: {            // Optional
    lat: 40.7128,
    lon: -74.0060
  },
  extraDetails: "Apt 4B" // Optional
}
```

---

### âŒ Error: "Backend proxy error"

**Error Message:**
```
[vite] http proxy error: /api/...
AggregateError [ECONNREFUSED]
```

**Causes:**

1. Backend not running
2. Wrong port in Vite config
3. Backend crashed

**Solutions:**

1. **Start backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Check Vite proxy config** (`frontend/vite.config.js`):
   ```javascript
   server: {
     proxy: {
       '/api': 'http://localhost:3000'
     }
   }
   ```

3. **Check backend .env:**
   ```
   PORT = 3000
   ```

---

### âŒ Error: "MongoDB connection failed"

**Error Message:**
```
MongooseServerSelectionError: connect ECONNREFUSED
```

**Causes:**

1. MongoDB Atlas network access not configured
2. Wrong connection string
3. Internet connection issues

**Solutions:**

1. **Check MongoDB Atlas:**
   - Go to atlas.mongodb.com
   - Network Access â†’ Add IP Address â†’ Allow 0.0.0.0/0

2. **Verify connection string:**
   ```env
   MONGODB_URL=mongodb+srv://user:pass@cluster/db
   ```

3. **Test connection:**
   ```bash
   cd backend
   node -e "import('./config/db.js').then(db => db.default())"
   ```

---

## ðŸ†˜ Still Having Issues?

### Debug Checklist

- [ ] Redis running? (`redis-cli ping`)
- [ ] MongoDB connected? (Check backend logs)
- [ ] Backend running on port 3000?
- [ ] Frontend running on port 5173?
- [ ] All dependencies installed? (`npm install`)
- [ ] Correct Node.js version? (v25.2.0)
- [ ] Environment variables set? (`.env` files)

### Useful Debug Commands

```bash
# Check what's listening on ports
netstat -ano | findstr :3000
netstat -ano | findstr :6379
netstat -ano | findstr :5173

# Kill process on port (Windows)
taskkill /PID <PID> /F

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Getting Help

1. **Check logs carefully** - Error messages usually indicate the problem
2. **Search the transcript** - Similar issues may have been solved before
3. **Review recent changes** - What changed before the error appeared?
4. **Test components individually:**
   - Redis: `redis-cli ping`
   - MongoDB: Check Atlas dashboard
   - Socket.io: Browser console logs
   - BullMQ: `npm run test:realtime`

---

## ðŸ“ž Emergency Contacts

If all else fails:

1. **Stop everything** (Ctrl+C all terminals)
2. **Restart Redis**: `net stop Redis && net start Redis`
3. **Restart backend**: `npm run dev`
4. **Restart frontend**: `npm run dev`
5. **Run tests**: `npm run test:realtime`

Sometimes a fresh start clears transient issues! ðŸ”„

