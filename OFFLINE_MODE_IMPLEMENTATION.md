# PWA Offline Mode Implementation

## Overview
This implementation adds comprehensive offline support to the Lunch Buddy PWA, allowing the app to load and display cached data when the user is offline.

## Changes Made

### 1. Service Worker Configuration (`ngsw-config.json`)
- **Added `dataGroups`**: Configured caching for LunchMoney API endpoints
  - Strategy: `freshness` (network first, cache fallback)
  - Cache duration: 1 hour
  - Timeout: 10 seconds
  - Max cache size: 100 responses
- **Added `navigationRequestStrategy`**: Set to `freshness` to ensure app loads offline using cached HTML/CSS/JS

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

- **Static Assets** (HTML/CSS/JS): Prefetched and cached on install
- **Images**: Lazy loaded and cached on first use
- **API Responses**: Network-first with cache fallback (1 hour max age)

## Testing Offline Mode

### Chrome DevTools
1. Open DevTools → Application tab → Service Workers
2. Check "Offline" checkbox
3. Reload the page

### Real Network Disconnection
1. Turn off WiFi/Ethernet
2. Open the app
3. Verify cached data loads and offline banner appears

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
