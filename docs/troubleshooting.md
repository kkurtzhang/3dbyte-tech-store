# Troubleshooting Guide

This guide covers common issues and solutions when developing with the 3D Byte Tech Store.

## Table of Contents
- [Installation Issues](#installation-issues)
- [Development Server Issues](#development-server-issues)
- [Database Issues](#database-issues)
- [Build Issues](#build-issues)
- [Docker Issues](#docker-issues)
- [Performance Issues](#performance-issues)

## Installation Issues

### pnpm install fails

**Problem**: `pnpm install` exits with an error

**Solutions**:
1. **Clear pnpm cache**:
   ```bash
   pnpm store prune
   ```

2. **Remove node_modules and reinstall**:
   ```bash
   rm -rf node_modules
   pnpm install
   ```

3. **Check pnpm version**:
   ```bash
   pnpm --version  # Should be 8.0.0 or higher
   ```

4. **Use exact pnpm version**:
   ```bash
   npm install -g pnpm@8.15.4
   ```

### Permission denied errors

**Problem**: Permission errors when running scripts

**Solution**:
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Or run with explicit permissions
bash scripts/dev.sh
```

## Development Server Issues

### Port already in use

**Problem**: "Port 8000 is already in use" or similar

**Solutions**:
1. **Find and kill process**:
   ```bash
   # Find process using port 8000
   lsof -i :8000

   # Kill the process (replace PID with actual process ID)
   kill -9 PID
   ```

2. **Use different port**:
   ```bash
   # For storefront
   pnpm --filter @3dbyte-tech-store/storefront dev -p 3001
   ```

### Services not connecting

**Problem**: Frontend cannot connect to backend

**Solutions**:
1. **Check all services are running**:
   ```bash
   # Check each service
   curl http://localhost:9000/health  # Backend
   curl http://localhost:1337/health  # CMS
   curl http://localhost:8000        # Storefront
   ```

2. **Verify CORS configuration**:
   - Check `apps/backend/.env` for correct CORS settings
   - Ensure `CORS_ORIGIN` includes frontend URL

3. **Check environment variables**:
   ```bash
   # Verify frontend can reach backend
   curl http://localhost:9000/store/regions
   ```

### Hot reloading not working

**Problem**: Changes not reflecting in browser

**Solutions**:
1. **Clear Turborepo cache**:
   ```bash
   rm -rf .turbo
   pnpm run dev
   ```

2. **Check file watchers**:
   ```bash
   # Check file watcher limits
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

## Database Issues

### Cannot connect to PostgreSQL

**Problem**: Database connection errors

**Solutions**:
1. **Ensure PostgreSQL is running**:
   ```bash
   # macOS
   brew services start postgresql

   # Ubuntu
   sudo systemctl start postgresql
   ```

2. **Check database exists**:
   ```bash
   psql -U postgres -l
   ```

3. **Create database**:
   ```bash
   createdb -U postgres medusa
   createdb -U postgres cms
   ```

### Migration errors

**Problem**: Database migration failures

**Solutions**:
1. **Reset database (WARNING: This deletes all data)**:
   ```bash
   # For backend
   cd apps/backend
   pnpm run db:migrate:reset

   # For CMS
   cd apps/cms
   pnpm run strapi db:reset
   ```

2. **Check migration status**:
   ```bash
   cd apps/backend
   pnpm run db:migrate:status
   ```

### Redis connection issues

**Problem**: Redis connection errors

**Solutions**:
1. **Start Redis**:
   ```bash
   # macOS
   brew services start redis

   # Ubuntu
   sudo systemctl start redis
   ```

2. **Test connection**:
   ```bash
   redis-cli ping
   ```

3. **Run without Redis (development only)**:
   ```bash
   # Remove REDIS_URL from .env
   # Restart services
   ```

## Build Issues

### TypeScript errors

**Problem**: Type errors during build

**Solutions**:
1. **Check TypeScript configuration**:
   ```bash
   pnpm run type-check
   ```

2. **Build shared packages first**:
   ```bash
   pnpm --filter "@3dbyte-tech-store/shared-*" build
   ```

3. **Clear TypeScript cache**:
   ```bash
   find . -name "*.tsbuildinfo" -delete
   pnpm run build
   ```

### Out of memory errors

**Problem**: Build process crashes with memory error

**Solutions**:
1. **Increase Node.js memory limit**:
   ```bash
   export NODE_OPTIONS="--max-old-space-size=4096"
   pnpm run build
   ```

2. **Build services individually**:
   ```bash
   pnpm --filter @3dbyte-tech-store/backend build
   pnpm --filter @3dbyte-tech-store/cms build
   pnpm --filter @3dbyte-tech-store/storefront build
   ```

### Next.js build fails

**Problem**: Next.js build fails with cryptic error

**Solutions**:
1. **Check Next.js version**:
   ```bash
   pnpm --filter @3dbyte-tech-store/storefront list next
   ```

2. **Clean Next.js cache**:
   ```bash
   cd apps/storefront
   rm -rf .next
   pnpm run build
   ```

3. **Disable analytics during build**:
   ```bash
   echo "NEXT_PUBLIC_ANALYTICS_ID=" >> apps/storefront/.env.local
   ```

## Docker Issues

### Docker compose fails to start

**Problem**: `docker-compose up` fails

**Solutions**:
1. **Check Docker is running**:
   ```bash
   docker info
   ```

2. **Rebuild containers**:
   ```bash
   docker-compose -f docker/docker-compose.yml down
   docker-compose -f docker/docker-compose.yml build --no-cache
   docker-compose -f docker/docker-compose.yml up -d
   ```

3. **Check disk space**:
   ```bash
   docker system df
   docker system prune
   ```

### Container exits immediately

**Problem**: Docker containers start and exit

**Solutions**:
1. **Check container logs**:
   ```bash
   docker-compose -f docker/docker-compose.yml logs backend
   ```

2. **Run in interactive mode**:
   ```bash
   docker-compose -f docker/docker-compose.yml run backend bash
   ```

3. **Check health check**:
   ```bash
   docker inspect 3dbyte-backend | grep Health -A 10
   ```

## Performance Issues

### Slow development server

**Problem**: Hot reload takes too long

**Solutions**:
1. **Use Turborepo filtering**:
   ```bash
   # Only watch changed packages
   pnpm run dev --filter=...
   ```

2. **Exclude node_modules from file watcher**:
   ```bash
   echo "node_modules" > .watchmanconfig
   watchman watch-del-all
   ```

3. **Use SSD for development**:
   - Ensure project is on SSD storage
   - Consider RAM disk for node_modules

### Memory usage high

**Problem**: Development server uses too much RAM

**Solutions**:
1. **Limit workers**:
   ```bash
   export NODE_OPTIONS="--max-old-space-size=2048"
   ```

2. **Use lightweight database**:
   - Use SQLite for local development instead of PostgreSQL

3. **Restart services periodically**:
   ```bash
   pnpm run clean
   pnpm install
   pnpm run dev
   ```

### Build time too long

**Problem**: Production builds take too long

**Solutions**:
1. **Enable Turborepo caching**:
   ```bash
   # Ensure turbo.json has proper cache configuration
   # Use remote caching for teams
   ```

2. **Parallel builds**:
   ```bash
   # Already enabled by default with Turborepo
   pnpm run build:turbo
   ```

3. **Optimize Next.js builds**:
   ```bash
   # In apps/storefront/next.config.js
   module.exports = {
     experimental: {
       optimizeCss: true
     }
   }
   ```

## Getting Help

If you're still having issues:

1. **Check existing documentation**:
   - [Main README](../README.md)
   - [Project documentation](./)

2. **Search GitHub issues**:
   - Check if someone already reported the issue

3. **Create a new issue**:
   - Include error messages
   - Share your system information (OS, Node.js version)
   - Provide steps to reproduce

4. **Join the community**:
   - Discord: [Link to Discord]
   - GitHub Discussions: [Link to Discussions]

## Common Debugging Commands

```bash
# Check all services status
curl http://localhost:9000/health
curl http://localhost:1337/health
curl http://localhost:8000/api/health

# Check port usage
lsof -i :8000 -i :9000 -i :1337

# Check Docker containers
docker ps -a
docker-compose -f docker/docker-compose.yml ps

# Check package versions
pnpm --filter @3dbyte-tech-store/storefront list
pnpm --filter @3dbyte-tech-store/backend list
pnpm --filter @3dbyte-tech-store/cms list

# Clear caches
rm -rf .turbo
rm -rf node_modules/.cache
find . -name ".next" -type d -exec rm -rf {} +
```