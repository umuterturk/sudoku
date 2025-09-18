# Firebase Permissions Fix

## Issue
You're getting the error: `FirebaseError: Missing or insufficient permissions` when trying to create a game room.

## Root Cause
The code was using the collection name `multiplayerGames` but the Firebase security rules are configured for `gameRooms` collection.

## Solution Applied
✅ **Fixed**: Updated the collection name in `src/config/firebase.prod.js` from `multiplayerGames` to `gameRooms` to match the security rules.

## Next Steps - Set Up Firebase Security Rules

You need to configure the Firestore security rules in your Firebase Console:

### 1. Go to Firebase Console
1. Visit [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Select your project: `sudoku-f2615`

### 2. Navigate to Firestore Rules
1. Click "Firestore Database" in the left sidebar
2. Click on the "Rules" tab

### 3. Update Security Rules
Replace the existing rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to game rooms
    match /gameRooms/{roomId} {
      allow read, write: if true; // For development - allows all access
    }
  }
}
```

### 4. Publish Rules
1. Click "Publish" button
2. Confirm the changes

## Alternative: Test Mode (Quick Fix)
If you want a quick fix for development:

1. In Firestore Database → Rules
2. Make sure you're in "Test mode" (allows read/write for 30 days)
3. If not in test mode, you can temporarily switch to it

## Production Security Rules (For Later)
When you're ready for production, use these more secure rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /gameRooms/{roomId} {
      // Allow read/write access with time-based restrictions
      allow read, write: if request.time < timestamp.date(2025, 12, 31);
    }
  }
}
```

## Test the Fix
After updating the security rules:

1. Refresh your browser
2. Try creating a game room again
3. The error should be resolved

## Verification
You should see:
- ✅ No "Missing or insufficient permissions" errors
- ✅ Game rooms being created in Firestore Console
- ✅ Real-time updates working between players

## Need Help?
If you still get permission errors:
1. Check that you're using the correct Firebase project
2. Verify the security rules are published
3. Make sure you're logged into the correct Google account in Firebase Console



