# Notification Center System

## Overview
Comprehensive notification system with dropdown center, alert monitoring, and customizable settings.

## Features Implemented

### 1. Notification Center Dropdown
**Location**: Header (replaces static bell icon)
**File**: `frontend/src/components/notifications/NotificationCenter.jsx`

**Features**:
- Dropdown accessible from header bell icon
- Unread count badge (red circle with number)
- Recent notifications with icons, timestamps, and action buttons
- Mark as read/unread functionality
- Delete individual notifications
- Bulk actions: Mark all as read, Delete all
- Category filtering (all, unread, profit, validator, price, liquidation, bundle)
- Settings panel with toggles
- Auto-close on outside click

### 2. Notification Categories
Each notification has a category with unique icon:
- **Profit** (💰): Profit threshold alerts
- **Validator** (🔷): Validator performance alerts
- **Price** (📈): Token price alerts
- **Liquidation** (⚡): Liquidation opportunity alerts
- **Bundle** (📦): Bundle execution alerts
- **System** (🔔): System notifications

### 3. Notification Settings
**Accessible**: Via settings icon in notification dropdown

**Options**:
- **Sound Notifications**: Play sound for new notifications
- **Browser Notifications**: Show browser push notifications
- **Show Badge Count**: Display unread count on bell icon
- **Test Notification**: Send test notification to verify settings

### 4. Alert Monitoring Service
**File**: `frontend/src/services/alertMonitor.js`

**Functionality**:
- Monitors MEV opportunities in real-time
- Checks opportunities against active alerts
- Triggers notifications when alert conditions are met
- Supports profit and liquidation alert types
- Plays sound and shows browser notifications

**Integration**: Automatically checks alerts when new opportunities arrive via WebSocket

### 5. Storage & Persistence
**LocalStorage Keys**:
- `mev_notifications`: Array of notifications (max 100)
- `mev_notification_settings`: User notification preferences
- `mev_alerts`: User-configured alerts

**Notification Object Structure**:
```javascript
{
  id: number,
  timestamp: number,
  read: boolean,
  category: string,
  title: string,
  message: string,
  action: string (optional)
}
```

### 6. Real-Time Updates
- Storage event listener updates notification count in real-time
- Notifications triggered by AlertMonitor appear instantly
- WebSocket integration checks alerts on new opportunities

## User Flow

### Creating Alerts
1. Navigate to Alerts page
2. Click "Create Alert"
3. Configure alert type and conditions
4. Enable alert with toggle switch

### Receiving Notifications
1. When alert condition is met, notification appears
2. Bell icon shows unread count badge
3. Sound plays (if enabled)
4. Browser notification shows (if enabled and permitted)

### Managing Notifications
1. Click bell icon to open dropdown
2. Filter by category or unread status
3. Mark individual notifications as read/unread
4. Delete individual or all notifications
5. Access settings to customize behavior

## Browser Notification Permission
First time enabling browser notifications:
1. Toggle "Browser Notifications" in settings
2. Browser prompts for permission
3. Click "Allow" to enable
4. Test with "Send Test Notification" button

## Integration Points

### Layout Component
**File**: `frontend/src/components/Layout.jsx`
- Imported NotificationCenter
- Replaced static bell button with NotificationCenter component

### MEV Hook
**File**: `frontend/src/hooks/useMEV.js`
- Imported AlertMonitor
- Calls `AlertMonitor.checkAlerts()` on new opportunities

### Alerts Page
**File**: `frontend/src/pages/alerts/AlertsPage.jsx`
- Creates and manages alert configurations
- Alerts stored in localStorage
- Used by AlertMonitor to trigger notifications

## Testing

### Test Notification
1. Open notification dropdown
2. Click settings icon
3. Click "Send Test Notification"
4. Verify notification appears with sound/browser notification

### Test Alert Flow
1. Create profit alert with low threshold (e.g., 0.001 SOL)
2. Wait for new opportunities to arrive
3. Notification should trigger when condition is met
4. Check notification dropdown for new notification

## Technical Details

### Sound Implementation
- Base64-encoded WAV audio
- Plays inline without external files
- Respects user sound settings

### Browser Notifications
- Uses Web Notifications API
- Requires user permission
- Falls back gracefully if denied

### Performance
- Max 100 notifications stored
- Efficient filtering and rendering
- Minimal re-renders with proper state management

## Future Enhancements
- Email notifications
- Push notification service integration
- Notification grouping by time/category
- Quiet hours configuration
- Notification history export
- Custom notification sounds
