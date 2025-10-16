# PWA Offline Mode Implementation

## Overview
This implementation adds comprehensive offline support to the Lunch Buddy PWA, allowing the app to load and display cached data when the user is offline.

## Changes Made

### 1. Service Worker Configuration (`ngsw-config.json`)
- **Added `dataGroups`**: Configured caching for LunchMoney API endpoints
  - Strategy: `freshness` (network first, cache fallback)
  - Cache duration: 24 hours
  - Timeout: 10 seconds
  - Max cache size: 100 responses
- **Set `navigationRequestStrategy`**: Changed to `performance` (cache-first) to ensure app loads offline
  - This allows the app to load immediately from cache when offline
  - Updates are fetched in the background when online
- **Updated asset groups**: Ensured all static assets are prefetched and cached

### 2. Custom Service Worker (`public/custom-service-worker.js`)
- **Added install and activate events**: Proper service worker lifecycle management
- **Added fetch event handler**: Custom handling for API requests with offline support
  - Network-first strategy with 10-second timeout
  - Falls back to cache when network fails
  - Only intercepts LunchMoney API calls
  - Lets Angular service worker handle all other requests (HTML/CSS/JS/assets)
- **Cache management**: Automatic cleanup of old cache versions

### 3. Offline Detection Service (`src/app/core/services/offline.service.ts`)
- **New service** that tracks online/offline status using browser events
- Provides reactive signals for `isOnline` and `isOffline` status
- Auto-updates when network connectivity changes

### 4. Offline Indicator Component (`src/app/shared/components/offline-indicator.component.*`)
- **New component** that displays a banner when the user goes offline
- Styled with animated slide-down effect
- Supports dark mode
- Positioned at top of viewport with high z-index
- Accessible with ARIA attributes

### 5. App Component Updates
- Imported and added `OfflineIndicatorComponent` to the root app template
- Indicator is visible across all routes

## How It Works

### Online Mode
1. User requests data → Service worker tries network first
2. If successful → Returns fresh data and caches it
3. User sees latest data

### Offline Mode
1. User requests data → Service worker tries network (10s timeout)
2. Network fails → Service worker returns cached data
3. Offline banner appears at top of screen
4. User sees most recent cached data

### First Load Offline
1. If user installed PWA while online, static assets (HTML/CSS/JS) are already cached
2. App loads from cache
3. API calls return cached data if available
4. Offline banner appears

## Cache Strategy

- **Static Assets** (HTML/CSS/JS): **Cache-first** - Prefetched on install, served from cache for instant loads
- **Navigation Requests**: **Cache-first** (`performance` strategy) - App shell loads instantly from cache
- **Images**: Lazy loaded and cached on first use
- **API Responses**: **Network-first** with cache fallback (`freshness` strategy, 24 hour max age)
  - When online: Always fetch fresh data, update cache
  - When offline: Serve from cache (up to 24 hours old)
  - 10-second timeout on network requests before falling back to cache

## Testing Offline Mode

### Important: Service Worker Only Works in Production Build
The service worker is **disabled in development mode**. You must build and serve a production build to test offline functionality.

### Step 1: Build for Production
```bash
npm run build
```

### Step 2: Serve the Production Build
You can use any static server. For example, with `npx`:
```bash
npx http-server dist/lunch-buddy/browser -p 8080
```

Or install and use `serve`:
```bash
npm install -g serve
serve -s dist/lunch-buddy/browser -p 8080
```

### Step 3: Visit and Install Service Worker
1. Open http://localhost:8080 in Chrome
2. Use the app normally (login, view budget data)
3. Open DevTools → Application → Service Workers
4. Verify the service worker is registered and activated

### Step 4: Test Offline Loading

#### Method A: Chrome DevTools (Simulated Offline)
1. Keep DevTools open → Application tab → Service Workers
2. Check the "Offline" checkbox
3. **Close the tab completely**
4. Open a new tab and navigate to http://localhost:8080
5. The app should load from cache with the offline banner

#### Method B: Real Network Disconnection
1. Ensure you've visited the app at least once while online
2. Completely close all browser tabs for the app
3. Turn off WiFi/Ethernet
4. Open a new browser tab
5. Navigate to http://localhost:8080
6. The app should load from cache

### Step 5: Verify Cached Data
- Offline banner should appear at top
- App logo and UI should be visible
- Previously loaded budget data should display
- API calls return cached responses

### Troubleshooting

**Problem: "ERR_INTERNET_DISCONNECTED" when loading offline**
- Solution: Make sure you visited the app while online first
- The service worker needs to install and cache assets before offline mode works
- Check DevTools → Application → Cache Storage to verify files are cached

**Problem: Service worker not registering**
- Solution: Service workers only work on `localhost` or HTTPS
- Check the browser console for service worker errors
- Verify `app.config.ts` has service worker enabled in production

**Problem: Old cached data**
- Solution: Clear cache in DevTools → Application → Clear Storage
- Rebuild and reload while online to get fresh cache

## Benefits

✅ App loads instantly when offline  
✅ Users can view their most recent budget data  
✅ Clear visual indicator of offline status  
✅ Automatic cache updates when online  
✅ No more Chrome 504 errors  
✅ Better user experience during poor connectivity

## Future Enhancements

- [ ] Add "refresh" button in offline banner to manually retry
- [ ] Show timestamp of cached data
- [ ] Queue mutations for when connection returns
- [ ] IndexedDB for more robust data persistence
- [ ] Background sync for automatic data refresh
