# Firebase CORS and Security Setup

## ⚠️ Important: Firebase Console Configuration Required

To fix the `NS_BINDING_ABORTED` error in production, you **MUST** configure Firebase settings in the Firebase Console.

## 1. Firebase CORS Configuration

### Add Authorized Domains
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `sudoku-f2615`
3. Navigate to **Project Settings** → **General**
4. Scroll down to **Authorized domains**
5. Add these domains:
   - `umuterturk.github.io`
   - `localhost` (for development)

### Web App Configuration
1. In **Project Settings** → **General** → **Your apps**
2. Find your web app configuration
3. Ensure the domains match your deployment URLs

## 2. Firestore Security Rules

### Deploy Security Rules
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize project: `firebase init firestore`
4. Deploy rules: `firebase deploy --only firestore:rules`

Or manually copy the rules from `firestore.rules` to the Firebase Console:

1. Go to Firebase Console → **Firestore Database**
2. Click **Rules** tab
3. Replace existing rules with content from `firestore.rules`
4. Click **Publish**

## 3. Common Issues and Solutions

### NS_BINDING_ABORTED Error
This error occurs when:
- ❌ Missing authorized domains in Firebase Console
- ❌ Incorrect CORS configuration
- ❌ Missing or restrictive Firestore security rules
- ❌ Multiple real-time listeners causing connection conflicts

### Solutions Applied:
- ✅ Added proper CORS handling in Vite config
- ✅ Implemented connection cleanup to prevent listener accumulation
- ✅ Added Firebase config validation with fallbacks
- ✅ Created permissive Firestore security rules
- ✅ Improved error handling for specific Firebase error codes

### Production Deployment Checklist:
- [ ] Authorized domains configured in Firebase Console
- [ ] Firestore security rules deployed
- [ ] Environment variables set in GitHub Secrets
- [ ] CORS headers properly configured
- [ ] Connection cleanup implemented

## 4. Testing

### Local Testing:
```bash
# Start development server
npm run dev

# Test multiplayer in two browser tabs
# Check browser console for Firebase connection logs
```

### Production Testing:
1. Deploy to GitHub Pages: `git push origin main`
2. Test multiplayer functionality
3. Monitor browser console for connection errors
4. Check Firebase Console logs for any security rule violations

## 5. Monitoring

### Firebase Console Monitoring:
1. **Firestore** → **Usage** tab: Monitor read/write operations
2. **Authentication** → **Settings**: Check authorized domains
3. **Project Settings** → **General**: Verify app configuration

### Browser Console Logs:
- Look for `🔥 Firebase config loaded` message
- Monitor connection logs: `🧹 Cleaned up connection for room`
- Check for error patterns: `❌ Permission denied` or `🔄 Retrying connection`

## 6. Security Considerations

The current security rules allow unrestricted access for rapid development. For production, consider:

```javascript
// More restrictive rules example
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /gameRooms/{roomId} {
      // Only allow access to rooms created in last 24 hours
      allow read, write: if request.time < resource.data.createdAt + duration.value(24, 'h');
    }
  }
}
```

## 7. Troubleshooting

If issues persist:
1. Check Firebase Console logs
2. Verify authorized domains include both `umuterturk.github.io` and any subdomain paths
3. Ensure Firestore security rules are published
4. Test with a fresh browser session (clear cache/cookies)
5. Monitor network tab for failed Firebase requests
