# ðŸ”„ Upgrade Redis to Version 5+ (Required for BullMQ v5)

## âš ï¸ Current Issue

```
Error: Redis version needs to be greater or equal than 5.0.0
Current: 3.0.504
```

Your Redis version (3.0.504) is too old for BullMQ v5.x which requires Redis 5.0+.

---

## âœ… Solution Options

### **Option 1: Install Memurai (Recommended for Windows)**

Memurai is a Redis-compatible server built specifically for Windows.

#### Step 1: Download Memurai Developer Edition

1. Go to: https://www.memurai.com/download
2. Click "Download Memurai Developer"
3. Run the installer (`Memurai-Installer-x64.exe`)
4. Follow installation wizard:
   - Accept license agreement
   - Choose default port: `6379`
   - Install as Windows Service: âœ… Yes
   - Complete installation

#### Step 2: Stop Old Redis

```powershell
# Open PowerShell as Administrator
net stop Redis
sc delete Redis
```

#### Step 3: Verify Memurai

```bash
# Open new Command Prompt
memurai-cli ping
# Should return: PONG
```

#### Step 4: Update Backend .env (if needed)

Memurai uses the same defaults, so no changes needed:
```env
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

#### Step 5: Restart Backend

```bash
cd backend
npm run dev
```

**Expected output:**
```
âœ… Socket.io initialized
ðŸš€ Starting BullMQ delivery worker...
âœ… BullMQ delivery worker started successfully
Server running on port 3000
```

---

### **Option 2: Use Docker Desktop (If Available)**

#### Step 1: Install Docker Desktop

1. Download: https://www.docker.com/products/docker-desktop/
2. Run installer
3. Follow setup wizard
4. Restart computer if prompted

#### Step 2: Run Redis in Docker

```bash
# Stop old Redis
net stop Redis

# Run Redis 7.x in container
docker run -d -p 6379:6379 --name redis-7 redis:7-alpine

# Verify
docker exec -it redis-7 redis-cli ping
# Output: PONG
```

#### Step 3: Start Backend

```bash
cd backend
npm run dev
```

**To stop Redis later:**
```bash
docker stop redis-7
docker rm redis-7
```

---

### **Option 3: Downgrade BullMQ (Temporary Workaround)**

If you can't upgrade Redis right now, use an older BullMQ version.

#### Step 1: Uninstall Current BullMQ

```bash
cd backend
npm uninstall bullmq
```

#### Step 2: Install BullMQ v4 (works with Redis 3.x)

```bash
npm install bullmq@4.10.4
```

#### Step 3: Update Import Syntax (v4 uses different exports)

In `backend/queue.js`, change:
```javascript
// BullMQ v4 syntax
import Queue from "bullmq";
import Worker from "bullmq";

const deliveryBroadcastQueue = new Queue("delivery-broadcast", { connection });
```

In `backend/workers/deliveryWorker.js`, change:
```javascript
// BullMQ v4 syntax
import Worker from "bullmq";
```

#### Step 4: Start Backend

```bash
npm run dev
```

âš ï¸ **Warning:** This is a temporary solution. BullMQ v4 lacks some v5 features.

---

### **Option 4: Use WSL2 (Windows Subsystem for Linux)**

#### Step 1: Install WSL2

```powershell
# PowerShell as Administrator
wsl --install
# Restart computer when prompted
```

#### Step 2: Install Redis in WSL2

```bash
# In WSL terminal (Ubuntu)
sudo apt-get update
sudo apt-get install redis-server=6.*
```

#### Step 3: Configure Network Access

Edit Redis config:
```bash
sudo nano /etc/redis/redis.conf
```

Change:
```
bind 127.0.0.1 ::1
```
To:
```
bind 0.0.0.0
```

#### Step 4: Start Redis

```bash
sudo service redis-server start
```

#### Step 5: Update Backend .env

```env
REDIS_HOST=localhost  # or WSL IP address
REDIS_PORT=6379
```

---

## ðŸ” Verification Steps

After upgrading, verify everything works:

### 1. Check Redis Version

```bash
redis-cli info server | grep redis_version
# Should show: redis_version:5.x.x or higher
```

### 2. Test Connection

```bash
redis-cli ping
# Output: PONG
```

### 3. Run Backend Tests

```bash
cd backend
npm run test:realtime
```

**Expected output:**
```
ðŸ§ª Testing Real-time Features Setup

ðŸ“Œ Test 1: Redis Connection
âœ… Redis connected successfully
âœ… Redis read/write successful

ðŸ“Œ Test 2: BullMQ Queue Setup
âœ… BullMQ job created successfully
âœ… Found 1 waiting job(s)

âœ… All tests passed!
```

### 4. Start Backend

```bash
npm run dev
```

**Look for:**
```
âœ… Socket.io initialized
ðŸš€ Starting BullMQ delivery worker...
âœ… BullMQ delivery worker started successfully
Server running on port 3000
```

**No Redis version errors!** âœ…

---

## ðŸ“Š Comparison of Options

| Option | Difficulty | Cost | Performance | Recommendation |
|--------|-----------|------|-------------|----------------|
| **Memurai** | Easy | Free (Dev) | Excellent | â­â­â­â­â­ Best for Windows |
| **Docker** | Medium | Free | Very Good | â­â­â­â­ If already installed |
| **Downgrade BullMQ** | Easy | Free | Good | â­â­ Temporary only |
| **WSL2** | Hard | Free | Excellent | â­â­â­ If comfortable with Linux |

---

## ðŸŽ¯ Recommended Path

**For most Windows users:** Install **Memurai**

1. It's designed for Windows
2. Free for development
3. Redis 5+ compatible
4. Easy installation
5. Works as Windows service
6. No configuration changes needed

**Quick start:**
```bash
# 1. Download from https://www.memurai.com/download
# 2. Run installer
# 3. Stop old Redis: net stop Redis
# 4. Verify: memurai-cli ping
# 5. Start backend: npm run dev
```

---

## â“ Troubleshooting

### "Memurai CLI not found"

Add to PATH manually:
```bash
# Add to System Environment Variables â†’ Path
C:\Program Files\Memurai\
```

### "Port 6379 already in use"

```bash
# Find what's using port 6379
netstat -ano | findstr :6379

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F
```

### "BullMQ still complaining about version"

Clear node_modules and reinstall:
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### "Old Redis service won't uninstall"

```powershell
# PowerShell as Administrator
sc delete Redis

# Or use Services app
services.msc
# Find "Redis" service â†’ Right-click â†’ Properties
# Set Startup type to "Disabled"
```

---

## ðŸ“ž Still Having Issues?

If none of these solutions work:

1. **Check exact error message** - Copy it exactly
2. **Verify Redis is running** - `redis-cli ping` or `memurai-cli ping`
3. **Check backend logs** - Look for connection details
4. **Test with simple script:**

```javascript
// test-redis.js
import { createClient } from 'redis';

const client = createClient();
client.on('error', err => console.error('Redis Error:', err));

await client.connect();
console.log('Connected to Redis');
console.log('Version:', await client.info('server'));
await client.quit();
```

Run it:
```bash
node test-redis.js
```

---

## âœ… Success Criteria

You'll know it's working when:

- âœ… No "Redis version needs to be >= 5.0.0" errors
- âœ… Backend starts without crashes
- âœ… BullMQ worker starts successfully
- âœ… Socket.io initializes
- âœ… Real-time features work in the app

---

**Need help?** Share your specific error message and which option you're trying! ðŸš€

