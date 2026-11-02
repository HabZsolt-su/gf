# 💖 Anniversary Memory Gallery

A romantic, mobile-friendly web application for couples to capture, share, and cherish their anniversary memories together in real-time. Built with HTML, CSS, JavaScript, and **Firebase Firestore** for direct cloud storage and live multi-device synchronization without needing Firebase Storage.

---

## 📱 Features

- **Strict 2-Column Grid:** Clean pairs of 2 images side-by-side (`grid-template-columns: repeat(2, 1fr)`).
- **Soft Romantic Design:** Pastel pink background (`#ffe4e6`), soft white cards (`.photo-card`, `.memory-card`) with rounded corners (`16px`), subtle shadow, and date/caption underneath.
- **Prominent 'Add Photo' Button:** Fixed at the bottom of the screen with iOS safe area support.
- **Direct Phone Camera Roll Integration:** Native `<input type="file" id="imageInput" accept="image/*">` opens the phone camera roll or camera.
- **Direct Firestore Sync:** Stores pictures directly to the `photos` collection in Cloud Firestore using fast base64 encoding (with smart size compression to never exceed Firestore's 1MB limit).
- **Real-Time Listener:** `db.collection('photos').orderBy('createdAt', 'desc').onSnapshot(...)` ensures photos appear simultaneously across multiple phones without refreshing.
- **Fullscreen Lightbox:** Tap any photo to expand it into full screen.

---

## 🔥 Firebase Firestore Setup

In [Firebase Console](https://console.firebase.google.com/project/anni2-e4bf2/firestore/rules):
1. Go to **Build** -> **Firestore Database**.
2. Click **Rules** and set:
```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /photos/{document=**} {
      allow read, write: if true;
    }
  }
}
```
3. Click **Publish**.

---

## 🚀 Quick Local Run

```powershell
python -m http.server 8000
```
Open `http://localhost:8000` on any device or browser tab to test!
