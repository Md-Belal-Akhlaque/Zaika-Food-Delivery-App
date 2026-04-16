# Redis Installation Guide for Windows

## Option 1: Using Chocolatey Package Manager (Recommended)

1. **Install Chocolatey** (if not already installed):
   - Open PowerShell as Administrator
   - Run:
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
   ```

2. **Install Redis**:
   ```bash
   choco install redis-64
   ```

3. **Start Redis Service**:
   ```bash
   redis-server --service-start
   ```

4. **Verify Installation**:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

---

## Option 2: Manual Installation

1. **Download Redis**:
   - Go to: https://github.com/microsoftarchive/redis/releases
   - Download `Redis-x64-3.0.504.msi`
   - Run the installer

2. **Installation Options**:
   - Choose default port: `6379`
   - Check "Add Redis to PATH"
   - Install as Windows Service (recommended)

3. **Verify**:
   - Open Command Prompt
   - Run: `redis-cli ping`
   - Should return: `PONG`

---

## Option 3: Using Docker (Alternative)

If you have Docker installed:

```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

To stop:
```bash
docker stop redis && docker rm redis
```

---

## Testing Redis Connection

### Test 1: Basic Ping
```bash
redis-cli ping
# Output: PONG
```

### Test 2: Set and Get Value
```bash
redis-cli set test "hello"
redis-cli get test
# Output: hello
```

### Test 3: Check Redis Info
```bash
redis-cli info
# Shows server statistics, memory usage, etc.
```

---

## Common Issues

### Issue: "Failed to connect to Redis"
**Solution:**
- Check if Redis service is running: `redis-cli ping`
- Check firewall: Port 6379 must be open
- Verify host/port in `.env`: `REDIS_HOST=127.0.0.1`, `REDIS_PORT=6379`

### Issue: "Redis service failed to start"
**Solution:**
- Check logs: `C:\Program Files\Redis\redis.log`
- Ensure port 6379 is not in use by another application
- Try running as Administrator

### Issue: BullMQ jobs stuck in queue
**Solution:**
```bash
# Clear all queues (development only!)
redis-cli FLUSHALL

# Or clear specific queue
redis-cli DEL bull:delivery-broadcast:wait
```

---

## Redis GUI Tools (Optional)

For easier monitoring:

1. **RedisInsight** (Official)
   - Download: https://redis.com/redis-enterprise/redis-insight/
   
2. **Another Redis Desktop Manager**
   - GitHub: https://github.com/qishibo/AnotherRedisDesktopManager

3. **Redis Commander** (Web-based)
   ```bash
   npm install -g redis-commander
   redis-commander
   # Opens at http://localhost:8081
   ```

---

## Production Considerations

⚠️ **For production deployment:**

1. Use Redis Cloud or managed Redis (AWS ElastiCache, Azure Cache)
2. Enable Redis authentication with password
3. Use Redis Cluster for high availability
4. Configure persistence (RDB/AOF)
5. Set up monitoring and alerts
6. Implement proper backup strategy

---

## Quick Start Commands

```bash
# Start Redis (if installed as service)
net start Redis

# Stop Redis
net stop Redis

# Connect to Redis CLI
redis-cli

# Monitor commands in real-time
redis-cli MONITOR

# Check memory usage
redis-cli INFO memory

# Flush all data (DANGER! - deletes everything)
redis-cli FLUSHALL
```

---

**Note:** The application requires Redis to be running for BullMQ delivery broadcasts to work. Without Redis, orders will still be created but riders won't receive real-time delivery notifications.
