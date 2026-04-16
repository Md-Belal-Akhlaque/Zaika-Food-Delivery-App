# âš¡ Quick Commands Reference

## ðŸ³ Docker Redis Management

### Start Redis (if stopped)
```bash
docker start redis-7
```

### Stop Redis
```bash
docker stop redis-7
```

### Check Status
```bash
docker ps | grep redis-7
```

### Test Connection
```bash
docker exec -it redis-7 redis-cli ping
# Output: PONG
```

### View Version
```bash
docker exec -it redis-7 redis-cli info server | findstr redis_version
# Output: redis_version:7.4.8
```

### View Logs
```bash
docker logs redis-7
```

### Remove and Recreate (if needed)
```bash
docker rm -f redis-7
docker run -d -p 6380:6379 --name redis-7 redis:7-alpine
```

---

## ðŸ’€ Kill Node.js Processes

### Kill ALL Node Processes
```powershell
# PowerShell (Administrator recommended)
taskkill /F /IM node.exe
```

### Kill Specific Process by PID
```powershell
taskkill /PID 1234 /F
# Replace 1234 with actual PID
```

### Find What's Using Port 3000
```bash
netstat -ano | findstr :3000
# Last column = PID
```

### Find What's Using Port 6380
```bash
netstat -ano | findstr :6380
```

---

## ðŸš€ Start Application

### Backend
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

### Frontend
```bash
cd frontend
npm run dev
```

**Expected output:**
```
VITE ready in xxx ms
âžœ  Local:   http://localhost:5173/
```

---

## ðŸ§ª Test Everything

### Test Redis Connection
```bash
docker exec -it redis-7 redis-cli ping
# PONG = âœ…
```

### Test Backend
```bash
cd backend
npm run test:realtime
```

### Check Backend Logs
Look for these lines:
```
âœ… Socket.io initialized
ðŸš€ Starting BullMQ delivery worker...
âœ… BullMQ delivery worker started successfully
```

### Check Browser Console (Frontend)
Look for:
```
âœ… Socket connected: [socketId]
```

---

## ðŸ” Troubleshooting

### "Port 6380 already in use"
```bash
# Find what's using it
netstat -ano | findstr :6380

# Kill the process
taskkill /PID <number> /F
```

### "Cannot connect to Redis"
```bash
# Check if container is running
docker ps | grep redis-7

# If not, start it
docker start redis-7

# Test connection
docker exec -it redis-7 redis-cli ping
```

### "Port 3000 already in use"
```bash
# Find the process
netstat -ano | findstr :3000

# Kill all Node processes
taskkill /F /IM node.exe

# Or kill specific PID
taskkill /PID <number> /F
```

### "BullMQ jobs not processing"
```bash
# Check Redis is running
docker exec -it redis-7 redis-cli ping

# Restart backend
# Ctrl+C, then npm run dev
```

---

## ðŸ“Š Current Configuration

| Service | Port | Status |
|---------|------|--------|
| Backend | 3000 | HTTP |
| Frontend | 5173 | Vite |
| Redis (Docker) | 6380 â†’ 6379 | Running |
| MongoDB | Atlas | Cloud |

### Environment Variables

**backend/.env:**
```env
REDIS_HOST=127.0.0.1
REDIS_PORT=6380
PORT=3000
```

**frontend/.env:**
```env
VITE_SOCKET_URL=http://localhost:3000
```

---

## ðŸŽ¯ Daily Workflow

### Morning (Start Fresh)
```bash
# 1. Start Redis
docker start redis-7

# 2. Verify
docker exec -it redis-7 redis-cli ping

# 3. Start backend
cd backend
npm run dev

# 4. In new terminal, start frontend
cd ../frontend
npm run dev
```

### Evening (Shut Down)
```bash
# 1. Stop backend (Ctrl+C)
# 2. Stop frontend (Ctrl+C)

# Optional: Stop Redis to save resources
docker stop redis-7
```

### Or Keep Redis Running
Redis in Docker uses minimal resources when idle, so you can leave it running!

---

## ðŸ†˜ Emergency Reset

If everything is broken:

```bash
# 1. Stop all Node processes
taskkill /F /IM node.exe

# 2. Stop Redis
docker stop redis-7

# 3. Remove Redis container
docker rm -f redis-7

# 4. Recreate Redis
docker run -d -p 6380:6379 --name redis-7 redis:7-alpine

# 5. Verify
docker exec -it redis-7 redis-cli ping

# 6. Start backend
cd backend
npm run dev
```

---

## âœ… Success Indicators

You know everything is working when:

**Backend Terminal:**
```
âœ… Socket.io initialized
ðŸš€ Starting BullMQ delivery worker...
âœ… BullMQ delivery worker started successfully
Server running on port 3000
```

**Docker:**
```bash
$ docker ps | grep redis-7
CONTAINER ID   IMAGE          STATUS
abc123def456   redis:7-alpine Up 2 minutes
```

**Redis Test:**
```bash
$ docker exec -it redis-7 redis-cli ping
PONG
```

**No errors about:**
- âŒ Redis version
- âŒ Cannot connect to Redis  
- âŒ Port already in use
- âŒ Queue is not a constructor

---

**Save this file for quick reference!** ðŸ“–

