# 💖 Anniversary Memory Gallery

A romantic, mobile-friendly web application for couples to capture, share, and cherish their anniversary memories together in real-time. Built with pure HTML, CSS, JavaScript, and **Firebase Firestore** for direct cloud storage and live multi-device synchronization.

---

## 📱 Features

- **Strict 2-Column Grid:** Clean pairs of 2 images side-by-side (`grid-template-columns: repeat(2, 1fr)`).
- **Soft Romantic Design:** Pastel pink background (`#ffe4e6`), soft white cards (`.photo-card`) with rounded corners (`16px`), subtle shadow, and romantic ambient hearts.
- **Prominent 'Add Photo' Button:** Fixed at the bottom of the screen with iOS/Android safe area support.
- **Direct Phone Camera Roll Integration:** Native `<input type="file" id="imageInput" accept="image/*">` opens the phone camera roll or camera.
- **Delete Pictures (Synced with Firestore):**
  - Tap the 🗑️ button on any picture card or inside the fullscreen viewer to delete the photo.
  - Deletes the document directly from Firestore: `db.collection('photos').doc(id).delete()`.
  - When one partner deletes a picture, it vanishes instantly on the other partner's phone in real-time!
- **Downloadable for Android Phone (PWA App):**
  - Fully installable Progressive Web App (PWA) with [manifest.json](file:///c:/Users/Zsolt/Documents/anni2/manifest.json), service worker [sw.js](file:///c:/Users/Zsolt/Documents/anni2/sw.js), and generated icons (`icon-192.png`, `icon-512.png`).
  - Displays a **📲 Install on Phone** button on Android browsers.
  - Or tap Chrome's three dots menu **(⋮) -> Install app** / **Add to Home screen** to install it as an app on your Android home screen!
- **Download Photo to Phone Gallery:**
  - Tap any photo to open it fullscreen in the Lightbox and tap **⬇️ Download Photo** to save it directly to your phone's photo gallery.
- **Real-Time Multi-Device Listener:** `db.collection('photos').orderBy('createdAt', 'desc').onSnapshot(...)` ensures pictures upload and delete simultaneously across both phones without refreshing.

---

## 📲 How to Install on Android

1. Open the gallery URL in Google Chrome (or Samsung Internet) on your Android phone.
2. Tap the green **📲 Install on Phone** pill in the header, OR:
3. Tap the browser menu **(⋮)** in the top-right corner.
4. Tap **Install app** (or **Add to Home screen**).
5. The Anniversary Gallery app icon will appear directly on your Android phone home screen!

---

## 🔥 Firebase Firestore Rules

In [Firebase Console](https://console.firebase.google.com/project/anni2-e4bf2/firestore/rules):
```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /photos/{document=**} {
      allow read, write, delete: if true;
    }
  }
}
```

---

## 🚀 Run Locally

```powershell
python -m http.server 8000
```
Open `http://localhost:8000` on your phone or browser to test!
