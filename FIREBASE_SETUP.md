# Firebase Setup Guide for Multiplayer Sudoku

## Step-by-Step Firebase Configuration

### 1. Create Firebase Project

1. **Go to Firebase Console**
   - Visit [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Sign in with your Google account

2. **Create New Project**
   - Click "Create a project" or "Add project"
   - Enter project name: `sudoku-multiplayer` (or any name you prefer)
   - Click "Continue"

3. **Configure Google Analytics** (Optional)
   - You can enable or disable Google Analytics
   - For this project, it's optional
   - Click "Create project"

### 2. Enable Firestore Database

1. **Navigate to Firestore**
   - In your project dashboard, click "Firestore Database" in the left sidebar
   - Click "Create database"

2. **Choose Security Rules**
   - Select "Start in test mode" (recommended for development)
   - This allows read/write access for 30 days
   - Click "Next"

3. **Select Location**
   - Choose a location closest to your users
   - For most users, `us-central1` or `europe-west1` works well
   - Click "Done"

### 3. Get Firebase Configuration

1. **Access Project Settings**
   - Click the gear icon (⚙️) next to "Project Overview"
   - Select "Project settings"

2. **Add Web App**
   - Scroll down to "Your apps" section
   - Click the web icon (</>) to add a web app
   - Enter app nickname: `Sudoku Multiplayer`
   - Click "Register app"

3. **Copy Configuration**
   - You'll see a configuration object like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyC...",
     authDomain: "sudoku-multiplayer-12345.firebaseapp.com",
     projectId: "sudoku-multiplayer-12345",
     storageBucket: "sudoku-multiplayer-12345.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef1234567890"
   };
   ```
   - Copy this entire configuration object

### 4. Update Your Code

1. **Open the configuration file**
   ```bash
   code src/utils/firebaseConfig.js
   ```

2. **Replace the demo configuration**
   - Replace the `firebaseConfig` object with your actual configuration
   - It should look like this:

   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyC...", // Your actual API key
     authDomain: "your-project-id.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project-id.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef1234567890"
   };
   ```

### 5. Test the Connection

1. **Start your development server**
   ```bash
   npm run dev
   ```

2. **Test multiplayer functionality**
   - Open the game in two browser tabs
   - Try creating a room and joining it
   - Check the browser console for any Firebase errors

### 6. Security Rules (Optional but Recommended)

For production, you should set up proper security rules:

1. **Go to Firestore Database → Rules**
2. **Replace the default rules with**:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Allow read/write access to game rooms
       match /gameRooms/{roomId} {
         allow read, write: if true; // For development
       }
     }
   }
   ```

3. **Click "Publish"**

## Troubleshooting

### Common Issues:

1. **"Firebase: No Firebase App '[DEFAULT]' has been created"**
   - Check that your configuration is correct
   - Ensure you're using the right project ID

2. **"Permission denied" errors**
   - Make sure Firestore is in test mode
   - Check your security rules

3. **"Project not found" errors**
   - Verify the project ID in your configuration
   - Make sure the project exists in Firebase Console

### Testing Steps:

1. **Check Browser Console**
   - Open Developer Tools (F12)
   - Look for Firebase connection messages
   - Any errors will be displayed here

2. **Test Room Creation**
   - Click "Challenge Friend" in the game
   - Check if a room is created in Firestore Console
   - Look for the `gameRooms` collection

3. **Test Real-time Updates**
   - Open two tabs with the same room
   - Make moves in one tab
   - Verify updates appear in the other tab

## Production Considerations

### Environment Variables (Recommended)

For production, store your Firebase config in environment variables:

1. **Create `.env.local` file**:
   ```env
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=your-app-id
   ```

2. **Update `firebaseConfig.js`**:
   ```javascript
   const firebaseConfig = {
     apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
     authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
     projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
     storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
     messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
     appId: import.meta.env.VITE_FIREBASE_APP_ID
   };
   ```

### Security Rules for Production

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /gameRooms/{roomId} {
      allow read, write: if request.time < timestamp.date(2024, 12, 31);
    }
  }
}
```

## Success Indicators

You'll know Firebase is working correctly when:

✅ No console errors about Firebase connection  
✅ "Challenge Friend" button creates a room  
✅ Room appears in Firestore Console  
✅ Invite links work between browser tabs  
✅ Real-time updates sync between players  
✅ Progress bars update in real-time  

## 🚨 IMPORTANT: Production CORS Setup

If you're deploying to production and experiencing `NS_BINDING_ABORTED` errors, see the detailed guide:

📖 **[FIREBASE_CORS_SETUP.md](./FIREBASE_CORS_SETUP.md)**

Quick fix checklist:
- [ ] Add authorized domains in Firebase Console
- [ ] Deploy Firestore security rules: `npm run firebase:deploy`
- [ ] Verify environment variables in GitHub Secrets
- [ ] Test with fresh browser session

## Need Help?

If you encounter issues:

1. Check the browser console for error messages
2. Verify your Firebase configuration matches exactly
3. Ensure Firestore is enabled and in test mode
4. Try refreshing both browser tabs
5. Check that your project ID is correct
6. **For production issues**: Follow [FIREBASE_CORS_SETUP.md](./FIREBASE_CORS_SETUP.md)

The multiplayer functionality should work immediately once Firebase is properly configured! 🎮
