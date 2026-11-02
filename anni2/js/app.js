/**
 * Anniversary Memory Gallery - Main Application
 * Multi-device live cloud synchronization with Firebase
 */

// Import Firebase SDK modules from official Google CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getDatabase, 
  ref as dbRef, 
  push, 
  onValue, 
  onChildAdded, 
  query, 
  orderByChild 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { 
  getStorage, 
  ref as storageRef, 
  uploadBytesResumable, 
  getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// DOM Elements
const galleryGrid = document.getElementById("galleryGrid");
const emptyState = document.getElementById("emptyState");
const memoryCounter = document.getElementById("memoryCounter");
const statusPill = document.getElementById("statusPill");
const statusText = document.getElementById("statusText");
const setupBanner = document.getElementById("setupBanner");
const addPhotoBtn = document.getElementById("addPhotoBtn");
const photoFileInput = document.getElementById("photoFileInput");
const uploadModal = document.getElementById("uploadModal");
const closeUploadModal = document.getElementById("closeUploadModal");
const cancelUploadBtn = document.getElementById("cancelUploadBtn");
const changePhotoBtn = document.getElementById("changePhotoBtn");
const imagePreview = document.getElementById("imagePreview");
const uploadForm = document.getElementById("uploadForm");
const captionInput = document.getElementById("captionInput");
const dateInput = document.getElementById("dateInput");
const progressWrap = document.getElementById("progressWrap");
const progressBarFill = document.getElementById("progressBarFill");
const progressLabel = document.getElementById("progressLabel");
const submitUploadBtn = document.getElementById("submitUploadBtn");

// Lightbox Elements
const lightboxModal = document.getElementById("lightboxModal");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxDate = document.getElementById("lightboxDate");
const lightboxCaption = document.getElementById("lightboxCaption");
const lightboxClose = document.getElementById("lightboxClose");

// Config Modal Elements
const configModal = document.getElementById("configModal");
const configBtn = document.getElementById("configBtn");
const openConfigBtn = document.getElementById("openConfigBtn");
const closeConfigModal = document.getElementById("closeConfigModal");
const configForm = document.getElementById("configForm");
const configJsonInput = document.getElementById("configJsonInput");
const resetDemoBtn = document.getElementById("resetDemoBtn");

// Application State
let firebaseApp = null;
let firebaseDb = null;
let firebaseStorage = null;
let isFirebaseActive = false;
let currentSelectedFile = null;
const displayedMemoryIds = new Set();
let memoryCount = 0;

// Local BroadcastChannel for instant multi-tab sync when in Demo mode
const localChannel = ("BroadcastChannel" in window) ? new BroadcastChannel("anniversary_gallery_sync") : null;

// Initial romantic sample memories for demonstration
const SAMPLE_MEMORIES = [
  {
    id: "sample-1",
    imageUrl: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=800&q=80",
    caption: "Where our forever began. Love you to the moon and back! 🌙✨",
    date: "2023-06-15",
    timestamp: 1686830400000
  },
  {
    id: "sample-2",
    imageUrl: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=800&q=80",
    caption: "Sunset strolls and holding your hand 🌅",
    date: "2023-09-20",
    timestamp: 1695211200000
  },
  {
    id: "sample-3",
    imageUrl: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=800&q=80",
    caption: "Cozy coffee mornings with my favorite smile ☕❤️",
    date: "2023-11-12",
    timestamp: 1699790400000
  },
  {
    id: "sample-4",
    imageUrl: "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=800&q=80",
    caption: "Picnic under the golden leaves 🍂",
    date: "2024-02-14",
    timestamp: 1707912000000
  }
];

/* ==========================================================================
   INITIALIZATION & CONFIGURATION
   ========================================================================== */

function getActiveFirebaseConfig() {
  // Check localStorage first (user customized via settings dialog)
  const saved = localStorage.getItem("custom_firebase_config");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (isValidConfig(parsed)) return parsed;
    } catch (e) {
      console.warn("Invalid saved config in localStorage", e);
    }
  }

  // Fallback to window.DEFAULT_FIREBASE_CONFIG from firebase-config.js
  if (window.DEFAULT_FIREBASE_CONFIG && isValidConfig(window.DEFAULT_FIREBASE_CONFIG)) {
    return window.DEFAULT_FIREBASE_CONFIG;
  }

  return null;
}

function isValidConfig(cfg) {
  return cfg && 
    cfg.apiKey && 
    cfg.apiKey !== "YOUR_API_KEY" && 
    cfg.projectId && 
    cfg.projectId !== "YOUR_PROJECT_ID";
}

async function initApplication() {
  createAmbientHearts();
  setDefaultDatePicker();
  setupEventListeners();

  const config = getActiveFirebaseConfig();

  if (config) {
    try {
      firebaseApp = initializeApp(config);
      firebaseDb = getDatabase(firebaseApp);
      firebaseStorage = getStorage(firebaseApp);
      isFirebaseActive = true;

      setConnectionStatus("connected", "Live Cloud Synced");
      setupBanner.style.display = "none";
      
      initFirebaseListeners();
    } catch (err) {
      console.error("Firebase initialization failed:", err);
      setConnectionStatus("demo", "Demo Mode (Firebase error)");
      setupBanner.style.display = "flex";
      initDemoMode();
    }
  } else {
    // Demo Mode
    setConnectionStatus("demo", "Demo Mode (Local Sync)");
    setupBanner.style.display = "flex";
    initDemoMode();
  }
}

function setConnectionStatus(type, label) {
  statusPill.className = `status-pill ${type}`;
  statusText.textContent = label;
}

function setDefaultDatePicker() {
  const today = new Date().toISOString().split("T")[0];
  dateInput.value = today;
  dateInput.max = today;
}

/* ==========================================================================
   FIREBASE REAL-TIME LISTENERS
   ========================================================================== */

function initFirebaseListeners() {
  // Clear skeleton loaders
  galleryGrid.innerHTML = "";

  const memoriesQuery = query(dbRef(firebaseDb, "memories"), orderByChild("timestamp"));

  // Real-time listener: triggers whenever a new picture is added from any phone!
  onChildAdded(memoriesQuery, (snapshot) => {
    const memory = snapshot.val();
    if (!memory) return;
    const key = snapshot.key;

    if (!displayedMemoryIds.has(key)) {
      renderMemoryCard({ id: key, ...memory }, true);
    }
  }, (error) => {
    console.error("Firebase Realtime listener error:", error);
    showToast("⚠️ Could not sync memories. Check database rules.");
  });

  // Check if collection is empty
  onValue(dbRef(firebaseDb, "memories"), (snapshot) => {
    if (!snapshot.exists()) {
      galleryGrid.innerHTML = "";
      emptyState.style.display = "block";
      updateCounter(0);
    } else {
      emptyState.style.display = "none";
    }
  });
}

/* ==========================================================================
   DEMO MODE (Local Storage + BroadcastChannel for Multi-Device/Tab Preview)
   ========================================================================== */

function initDemoMode() {
  galleryGrid.innerHTML = "";

  // Load from localStorage or initial sample
  const stored = localStorage.getItem("demo_memories");
  let memories = stored ? JSON.parse(stored) : [...SAMPLE_MEMORIES];

  // Sort descending (newest first)
  memories.sort((a, b) => b.timestamp - a.timestamp);

  memories.forEach((mem) => {
    renderMemoryCard(mem, false);
  });

  if (memories.length === 0) {
    emptyState.style.display = "block";
  }

  // Listen to cross-tab broadcast events for live local testing
  if (localChannel) {
    localChannel.onmessage = (event) => {
      if (event.data && event.data.type === "NEW_MEMORY") {
        const mem = event.data.payload;
        if (!displayedMemoryIds.has(mem.id)) {
          renderMemoryCard(mem, true);
          showToast("💕 A new memory was just uploaded!");
        }
      }
    };
  }
}

/* ==========================================================================
   CARD RENDERING (STRICT 2-COLUMN GRID)
   ========================================================================== */

function renderMemoryCard(memory, isNew = false) {
  displayedMemoryIds.add(memory.id);
  emptyState.style.display = "none";

  const card = document.createElement("article");
  card.className = `memory-card ${isNew ? "newly-added" : ""}`;
  card.dataset.id = memory.id;

  // Format date nicely (e.g., Nov 2, 2024 or November 2024)
  const formattedDate = formatDisplayDate(memory.date || memory.createdAt);
  const captionText = memory.caption ? escapeHtml(memory.caption) : "";

  card.innerHTML = `
    <div class="card-media">
      <img src="${memory.imageUrl}" alt="${captionText || 'Anniversary memory'}" loading="lazy">
      <div class="card-heart-tag" aria-hidden="true">❤️</div>
    </div>
    <div class="card-caption-area">
      <time class="card-date">
        <span>📅</span> ${formattedDate}
      </time>
      <p class="card-caption ${!captionText ? 'empty' : ''}">
        ${captionText || 'A lovely memory together...'}
      </p>
    </div>
  `;

  // Image smooth fade-in once loaded
  const imgElement = card.querySelector("img");
  imgElement.onload = () => imgElement.classList.add("loaded");
  // In case already cached:
  if (imgElement.complete) imgElement.classList.add("loaded");

  // Tap card to open in Lightbox modal
  card.addEventListener("click", () => {
    openLightbox(memory.imageUrl, formattedDate, memory.caption);
  });

  // Always prepend to maintain strict 2-column grid with newest photos first
  if (galleryGrid.firstChild) {
    galleryGrid.insertBefore(card, galleryGrid.firstChild);
  } else {
    galleryGrid.appendChild(card);
  }

  memoryCount++;
  updateCounter(memoryCount);

  if (isNew) {
    // Scroll smoothly to top so the couple sees the newly added picture
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function updateCounter(count) {
  if (count === 1) {
    memoryCounter.textContent = "1 cherished memory together";
  } else {
    memoryCounter.textContent = `${count} cherished memories together`;
  }
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return "Special Moment";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    }
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch (e) {
    return dateStr;
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/* ==========================================================================
   IMAGE SELECTION & UPLOAD HANDLERS
   ========================================================================== */

function setupEventListeners() {
  // 'Add Photo' button triggers native file picker (camera roll / camera)
  addPhotoBtn.addEventListener("click", () => {
    photoFileInput.value = ""; // reset
    photoFileInput.click();
  });

  // File chosen from camera roll
  photoFileInput.addEventListener("change", handleFileChosen);

  // Change photo button inside sheet
  changePhotoBtn.addEventListener("click", () => {
    photoFileInput.click();
  });

  // Modal dismiss buttons
  closeUploadModal.addEventListener("click", closeUploadSheet);
  cancelUploadBtn.addEventListener("click", closeUploadSheet);
  uploadModal.addEventListener("click", (e) => {
    if (e.target === uploadModal) closeUploadSheet();
  });

  // Upload Form Submission
  uploadForm.addEventListener("submit", handleUploadSubmit);

  // Lightbox Close
  lightboxClose.addEventListener("click", closeLightbox);
  lightboxModal.addEventListener("click", (e) => {
    if (e.target === lightboxModal) closeLightbox();
  });

  // Config Modal
  configBtn.addEventListener("click", openConfigDialog);
  if (openConfigBtn) openConfigBtn.addEventListener("click", openConfigDialog);
  closeConfigModal.addEventListener("click", closeConfigDialog);
  configModal.addEventListener("click", (e) => {
    if (e.target === configModal) closeConfigDialog();
  });
  configForm.addEventListener("submit", handleConfigSubmit);
  resetDemoBtn.addEventListener("click", handleResetDemo);

  // Keyboard accessibility
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeLightbox();
      closeUploadSheet();
      closeConfigDialog();
    }
  });
}

function handleFileChosen(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("⚠️ Please select an image file.");
    return;
  }

  currentSelectedFile = file;

  // Show preview
  const reader = new FileReader();
  reader.onload = (event) => {
    imagePreview.src = event.target.result;
    openUploadSheet();
  };
  reader.readAsDataURL(file);
}

function openUploadSheet() {
  uploadModal.classList.add("open");
  uploadModal.setAttribute("aria-hidden", "false");
  progressWrap.style.display = "none";
  progressBarFill.style.width = "0%";
  submitUploadBtn.disabled = false;
  submitUploadBtn.innerHTML = `<span>Save Memory</span> ❤️`;
  
  // Auto-focus caption on desktop; keep natural on mobile
  if (window.innerWidth > 600) {
    captionInput.focus();
  }
}

function closeUploadSheet() {
  uploadModal.classList.remove("open");
  uploadModal.setAttribute("aria-hidden", "true");
  captionInput.value = "";
  setDefaultDatePicker();
  currentSelectedFile = null;
}

/* ==========================================================================
   IMAGE COMPRESSION & CLOUD UPLOAD
   ========================================================================== */

/**
 * Compresses phone camera photos on-the-fly using an HTML5 Canvas.
 * Ensures quick mobile uploads, saves bandwidth, and retains beautiful sharpness.
 */
async function compressImage(file, maxWidth = 1600, quality = 0.85) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          resolve(blob || file);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      resolve(file); // Fallback to raw file if compression fails
    };
  });
}

async function handleUploadSubmit(e) {
  e.preventDefault();
  if (!currentSelectedFile) {
    showToast("⚠️ Please select a photo first.");
    return;
  }

  const caption = captionInput.value.trim();
  const date = dateInput.value || new Date().toISOString().split("T")[0];
  const timestamp = Date.now();

  submitUploadBtn.disabled = true;
  progressWrap.style.display = "block";
  progressBarFill.style.width = "15%";
  progressLabel.textContent = "Optimizing image for quick upload... 💫";

  try {
    // 1. Optimize image client-side
    const optimizedBlob = await compressImage(currentSelectedFile);
    progressBarFill.style.width = "35%";
    progressLabel.textContent = "Uploading to cloud... ☁️";

    if (isFirebaseActive && firebaseStorage && firebaseDb) {
      // 2. Upload to Firebase Storage
      const cleanFileName = currentSelectedFile.name.replace(/[^a-zA-Z0-9.]/g, "_");
      const storagePath = `memories/${timestamp}_${cleanFileName}`;
      const fileStorageRef = storageRef(firebaseStorage, storagePath);

      const uploadTask = uploadBytesResumable(fileStorageRef, optimizedBlob, {
        contentType: "image/jpeg"
      });

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 60) + 35;
          progressBarFill.style.width = `${progress}%`;
          progressLabel.textContent = `Uploading memory... ${progress}%`;
        },
        (error) => {
          console.error("Firebase Storage Upload Error:", error);
          showToast("❌ Upload failed. Check Firebase Storage rules.");
          submitUploadBtn.disabled = false;
        },
        async () => {
          // 3. Get Download URL
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          progressBarFill.style.width = "95%";
          progressLabel.textContent = "Saving to your gallery... ❤️";

          // 4. Save metadata to Firebase Realtime Database
          await push(dbRef(firebaseDb, "memories"), {
            imageUrl: downloadUrl,
            caption: caption,
            date: date,
            timestamp: timestamp,
            createdAt: new Date().toISOString()
          });

          progressBarFill.style.width = "100%";
          showToast("✨ Memory saved forever!");
          closeUploadSheet();
        }
      );
    } else {
      // DEMO MODE: Convert to base64 DataURL and save locally
      progressBarFill.style.width = "75%";
      progressLabel.textContent = "Saving locally... ❤️";

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const newMemory = {
          id: "local-" + timestamp,
          imageUrl: dataUrl,
          caption: caption,
          date: date,
          timestamp: timestamp,
          createdAt: new Date().toISOString()
        };

        // Save to localStorage
        const stored = localStorage.getItem("demo_memories");
        const memories = stored ? JSON.parse(stored) : [...SAMPLE_MEMORIES];
        memories.unshift(newMemory);
        localStorage.setItem("demo_memories", JSON.stringify(memories));

        // Render immediately
        renderMemoryCard(newMemory, true);

        // Broadcast to other open tabs/windows in real-time
        if (localChannel) {
          localChannel.postMessage({
            type: "NEW_MEMORY",
            payload: newMemory
          });
        }

        progressBarFill.style.width = "100%";
        showToast("✨ Memory added in Demo Mode!");
        closeUploadSheet();
      };
      reader.readAsDataURL(optimizedBlob);
    }
  } catch (err) {
    console.error("Upload error:", err);
    showToast("❌ An error occurred during upload.");
    submitUploadBtn.disabled = false;
  }
}

/* ==========================================================================
   LIGHTBOX VIEWER
   ========================================================================== */

function openLightbox(imageUrl, dateStr, caption) {
  lightboxImg.src = imageUrl;
  lightboxDate.textContent = dateStr;
  lightboxCaption.textContent = caption || "No caption added.";
  lightboxModal.classList.add("open");
  lightboxModal.setAttribute("aria-hidden", "false");
}

function closeLightbox() {
  lightboxModal.classList.remove("open");
  lightboxModal.setAttribute("aria-hidden", "true");
}

/* ==========================================================================
   CONFIG DIALOG & SETTINGS
   ========================================================================== */

function openConfigDialog() {
  const current = localStorage.getItem("custom_firebase_config");
  if (current) {
    try {
      configJsonInput.value = JSON.stringify(JSON.parse(current), null, 2);
    } catch (e) {
      configJsonInput.value = current;
    }
  } else if (window.DEFAULT_FIREBASE_CONFIG) {
    configJsonInput.value = JSON.stringify(window.DEFAULT_FIREBASE_CONFIG, null, 2);
  }
  configModal.classList.add("open");
  configModal.setAttribute("aria-hidden", "false");
}

function closeConfigDialog() {
  configModal.classList.remove("open");
  configModal.setAttribute("aria-hidden", "true");
}

function handleConfigSubmit(e) {
  e.preventDefault();
  const rawText = configJsonInput.value.trim();

  try {
    let parsed;
    // Allow JS object without strict JSON quotes if pasted from Firebase docs
    if (rawText.startsWith("{") && rawText.endsWith("}")) {
      try {
        parsed = JSON.parse(rawText);
      } catch (jsonErr) {
        // Fallback eval for JavaScript object syntax (e.g., apiKey: "...")
        parsed = new Function("return " + rawText)();
      }
    } else {
      throw new Error("Invalid format. Please paste a valid JSON or config object.");
    }

    if (!isValidConfig(parsed)) {
      throw new Error("Please replace placeholder keys with your real Firebase credentials.");
    }

    localStorage.setItem("custom_firebase_config", JSON.stringify(parsed));
    showToast("✅ Firebase config saved! Reloading...");
    setTimeout(() => {
      window.location.reload();
    }, 800);
  } catch (err) {
    alert("Configuration Error: " + err.message);
  }
}

function handleResetDemo() {
  localStorage.removeItem("custom_firebase_config");
  showToast("Switched back to Demo Mode.");
  setTimeout(() => {
    window.location.reload();
  }, 600);
}

/* ==========================================================================
   TOAST HELPER
   ========================================================================== */

let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById("toastNotification");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

/* ==========================================================================
   ROMANTIC FLOATING HEARTS
   ========================================================================== */

function createAmbientHearts() {
  const container = document.getElementById("ambientHearts");
  if (!container) return;

  const heartIcons = ["❤️", "💖", "💕", "🌸", "✨"];
  const count = 14;

  for (let i = 0; i < count; i++) {
    const heart = document.createElement("span");
    heart.className = "floating-heart";
    heart.textContent = heartIcons[Math.floor(Math.random() * heartIcons.length)];
    heart.style.left = `${Math.random() * 95}%`;
    heart.style.fontSize = `${12 + Math.random() * 16}px`;
    heart.style.animationDuration = `${8 + Math.random() * 10}s`;
    heart.style.animationDelay = `${Math.random() * 8}s`;
    container.appendChild(heart);
  }
}

// Start app on DOMContentLoaded
document.addEventListener("DOMContentLoaded", initApplication);

