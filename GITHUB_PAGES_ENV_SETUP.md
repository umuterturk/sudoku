# 🚀 GitHub Pages Environment Variables Setup

## 🔐 Option 1: GitHub Secrets (RECOMMENDED)

This is the most secure approach - your Firebase keys will be encrypted and only accessible during the build process.

### Step 1: Add Secrets to Your Repository

1. **Go to your GitHub repository**
2. **Click Settings** (in the repository, not your profile)
3. **Navigate to Secrets and variables** → **Actions**
4. **Click "New repository secret"** for each of these:

| Secret Name | Value |
|-------------|-------|
| `VITE_FIREBASE_API_KEY` | `AIzaSyB8TxrYh0alzV8uoiaYTQnWFTqypC4SahY` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `sudoku-f2615.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `sudoku-f2615` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `sudoku-f2615.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `1046582433040` |
| `VITE_FIREBASE_APP_ID` | `1:1046582433040:web:866655fea53a7a49548195` |
| `VITE_FIREBASE_MEASUREMENT_ID` | `G-8X5QDMKREM` |

### Step 2: Deploy

✅ **GitHub Actions workflow already updated!** 

Just push your changes and GitHub Actions will automatically use the secrets during build.

```bash
git add .
git commit -m "Add environment variable support for GitHub Pages"
git push origin main
```

---

## 🔧 Option 2: Build-time Configuration (Alternative)

If you prefer not to use GitHub Secrets, you can create a configuration that's set at build time.

### Create a config file that can be overridden:

✅ **Already created**: `src/config/firebase.prod.js`

Your `firebaseConfig.js` now has a fallback system:
- **First priority**: Environment variables (from GitHub Secrets)
- **Fallback**: Production config file (if env vars aren't available)

---

## 🧪 Testing Your Setup

### Local Testing
```bash
# Test with environment variables
npm run dev

# Test without environment variables (should use fallback)
# Remove .env.local temporarily and run:
npm run dev
```

### Production Testing
```bash
# Test production build locally
npm run build
npm run preview
```

---

## ✅ Quick Setup Summary

**For the fastest setup** (recommended):

1. **Add GitHub Secrets** (7 secrets total):
   - Go to your repo → Settings → Secrets and variables → Actions
   - Add each `VITE_FIREBASE_*` secret with your Firebase values

2. **Push your changes**:
   ```bash
   git add .
   git commit -m "Add GitHub Pages environment variable support"
   git push origin main
   ```

3. **Done!** GitHub Actions will build with your secrets

---

## 🔍 Troubleshooting

### Check if environment variables are working:
Add this temporary debug line to your `firebaseConfig.js`:
```javascript
console.log('Firebase config source:', import.meta.env.VITE_FIREBASE_API_KEY ? 'Environment' : 'Fallback');
```

### Common issues:
- **Secret names must match exactly** (including `VITE_` prefix)
- **Secrets are case-sensitive**
- **Re-run the GitHub Action** after adding secrets
- **Check the Actions tab** in your GitHub repo for build logs

---

## 🛡️ Security Notes

- ✅ **GitHub Secrets are encrypted** and only visible during build
- ✅ **Fallback config is in source code** but Firebase API keys are meant to be public
- ✅ **Real security comes from Firebase rules** (which we updated earlier)
- ⚠️ **Firebase API keys are not like traditional API keys** - they identify your project but don't grant access without proper rules

The most important security is your **Firebase Security Rules** - that's what actually protects your data!

