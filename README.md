# 💖 Anniversary Memory Gallery

A romantic, mobile-friendly web application for couples to capture, share, and cherish their anniversary memories together in real-time. Built with pure HTML, CSS, JavaScript, and Firebase for cloud storage and live multi-device synchronization.

---

## 📱 Features

- **Strict 2-Column Grid:** Clean pairs of 2 images side-by-side, perfectly balanced on any phone screen.
- **Romantic Aesthetic:** Soft pastel pink background (`#ffe4e6`), soft white cards with rounded corners (`16px`), elegant drop shadows, and subtle floating ambient hearts.
- **Date & Caption Area:** Clear date display and heartfelt captions under each picture.
- **Fullscreen Lightbox:** Tap any photo to expand into an immersive, high-resolution view.
- **Prominent 'Add Photo' Button:** Fixed at the bottom of the screen with iOS/Android safe area inset support.
- **Direct Phone Camera Roll Integration:** Tapping 'Add Photo' immediately triggers the phone's native photo library or camera.
- **Client-Side Image Optimization:** Automatically downscales heavy 15MB+ phone camera captures to lightweight, high-quality images before uploading, ensuring fast uploads on mobile networks.
- **Live Multi-Device Cloud Sync:** Powered by **Firebase Storage** & **Firebase Realtime Database**. When one partner uploads a memory on their phone, it instantly pops up on the other partner's phone in real-time without refreshing the page!
- **Instant Demo Mode:** Works immediately out-of-the-box with sample memories and cross-tab local sync even before adding Firebase keys.

---

## 🚀 Quick Start (Testing Locally)

You can serve this app using any lightweight local static server:

```powershell
# Using Python
python -m http.server 8000

# Or using Node.js npx serve
npx serve .
```

Open `http://localhost:8000` in your mobile browser or desktop browser.

---

## 🔥 Setting up Firebase (2-3 Minutes)

To enable live synchronization across multiple mobile phones:

### 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and give it a name (e.g., `our-anniversary-gallery`).
3. Under **Project Overview**, click the **Web icon (`</>`)** to add a web application.
4. Copy the `firebaseConfig` object.

### 2. Connected Firebase Project: `anni2-e4bf2`
Your project credentials have already been configured directly into [index.html](file:///c:/Users/Zsolt/Documents/anni2/index.html) and [js/firebase-config.js](file:///c:/Users/Zsolt/Documents/anni2/js/firebase-config.js).

### 3. Ensure Database & Storage Rules are Enabled in Firebase Console

#### Option A: Firebase Realtime Database
In [Firebase Console](https://console.firebase.google.com/project/anni2-e4bf2/database):
1. Click **Build** -> **Realtime Database** (create one if not yet created).
2. Go to the **Rules** tab and paste:
```json
{
  "rules": {
    "memories": {
      ".read": true,
      ".write": true
    }
  }
}
```
3. Click **Publish**.

#### Option B: Cloud Firestore (Supported as well!)
In [Firebase Console](https://console.firebase.google.com/project/anni2-e4bf2/firestore):
1. Under **Rules**, set:
```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /memories/{document=**} {
      allow read, write: if true;
    }
  }
}
```
2. Click **Publish**.

### 4. Enable Firebase Storage Rules
In [Firebase Console](https://console.firebase.google.com/project/anni2-e4bf2/storage):
1. Click **Build** -> **Storage** -> **Rules**.
2. Paste:
```text
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /memories/{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```
3. Click **Publish**.

---

## 📲 How to Test Real-time Multi-Device Sync

1. Deploy the site to any free static host (e.g., GitHub Pages, Vercel, Netlify, or Firebase Hosting).
2. Open the URL on **Partner Phone 1** and **Partner Phone 2**.
3. On Phone 1, tap **Add Photo**, choose a picture from your camera roll, type a sweet love note, and hit **Save Memory**.
4. **Watch Phone 2:** The newly uploaded photo smoothly pops into the 2-column grid at the top automatically with zero refresh required!

