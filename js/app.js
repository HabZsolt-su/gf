/**
 * Anniversary Memory Gallery - Main Application
 * Multi-device live cloud synchronization with Firebase
 */

// Import Firebase SDK modules from official Google CDN
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getDatabase, 
  ref as dbRef, 
  push, 
  onValue, 
  onChildAdded, 
  query as dbQuery, 
  orderByChild 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query as fsQuery, 
  orderBy as fsOrderBy 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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
let firebaseFirestore = null;
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
  // Prefer window.DEFAULT_FIREBASE_CONFIG or window.firebaseConfig
  const directConfig = window.DEFAULT_FIREBASE_CONFIG || window.firebaseConfig;
  if (directConfig && isValidConfig(directConfig)) {
    return directConfig;
  }

  // Check localStorage (user customized via settings dialog)
  const saved = localStorage.getItem("custom_firebase_config");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (isValidConfig(parsed)) return parsed;
    } catch (e) {
      console.warn("Invalid saved config in localStorage", e);
    }
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
      // Reuse existing Firebase App if initialized in index.html
      firebaseApp = getApps().length > 0 ? getApp() : initializeApp(config);

      // Setup default database URL for Realtime Database if omitted
      if (!config.databaseURL && config.projectId) {
        config.databaseURL = `https://${config.projectId}-default-rtdb.firebaseio.com`;
      }

      // Initialize Storage
      try {
        firebaseStorage = getStorage(firebaseApp, config.storageBucket ? `gs://${config.storageBucket}` : undefined);
      } catch (storageErr) {
        firebaseStorage = getStorage(firebaseApp);
      }

      // Initialize Realtime Database
      try {
        firebaseDb = getDatabase(firebaseApp, config.databaseURL);
      } catch (dbErr) {
        console.warn("Realtime Database note:", dbErr.message);
      }

      // Initialize Cloud Firestore as companion/fallback
      try {
        firebaseFirestore = getFirestore(firebaseApp);
      } catch (fsErr) {
        console.warn("Firestore note:", fsErr.message);
      }

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

  let hasReceivedData = false;

  // 1. Realtime Database listener
  if (firebaseDb) {
    try {
      const memoriesQuery = dbQuery(dbRef(firebaseDb, "memories"), orderByChild("timestamp"));

      onChildAdded(memoriesQuery, (snapshot) => {
        hasReceivedData = true;
        const memory = snapshot.val();
        if (!memory) return;
        const key = snapshot.key;

        if (!displayedMemoryIds.has(key)) {
          renderMemoryCard({ id: key, ...memory }, true);
        }
      }, (error) => {
        console.warn("Firebase Realtime listener note:", error.message);
      });

      onValue(dbRef(firebaseDb, "memories"), (snapshot) => {
        if (!snapshot.exists() && displayedMemoryIds.size === 0) {
          galleryGrid.innerHTML = "";
          emptyState.style.display = "block";
          updateCounter(0);
        } else {
          emptyState.style.display = "none";
        }
      });
    } catch (rtdbErr) {
      console.warn("RTDB listener failed to attach:", rtdbErr);
    }
  }

  // 2. Cloud Firestore listener (supports both RTDB and Firestore!)
  if (firebaseFirestore) {
    try {
      const fsMemoriesQuery = fsQuery(collection(firebaseFirestore, "memories"), fsOrderBy("timestamp", "asc"));
      onSnapshot(fsMemoriesQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            hasReceivedData = true;
            const docData = change.doc.data();
            const docId = change.doc.id;
            if (!displayedMemoryIds.has(docId)) {
              renderMemoryCard({ id: docId, ...docData }, true);
            }
          }
        });

        if (snapshot.empty && displayedMemoryIds.size === 0) {
          emptyState.style.display = "block";
        } else {
          emptyState.style.display = "none";
        }
      }, (fsErr) => {
        console.warn("Firestore listener note:", fsErr.message);
      });
    } catch (fsSetupErr) {
      console.warn("Firestore setup note:", fsSetupErr);
    }
  }

  // If no memories after 3 seconds, show empty state
  setTimeout(() => {
    if (displayedMemoryIds.size === 0 && !hasReceivedData) {
      emptyState.style.display = "block";
      updateCounter(0);
    }
  }, 3000);
}

/* ==========================================================================
   DEMO MODE (Local Storage + BroadcastChannel for Multi-Device/Tab Preview)
   ========================================================================== */

function initDemoMode() {
  galleryGrid.innerHTML = "";

  const stored = localStorage.getItem("demo_memories");
  let memories = stored ? JSON.parse(stored) : [...SAMPLE_MEMORIES];

  memories.sort((a, b) => b.timestamp - a.timestamp);

  memories.forEach((mem) => {
    renderMemoryCard(mem, false);
  });

  if (memories.length === 0) {
    emptyState.style.display = "block";
  }

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
  if (displayedMemoryIds.has(memory.id)) return;
  displayedMemoryIds.add(memory.id);
  emptyState.style.display = "none";

  const card = document.createElement("article");
  card.className = `memory-card ${isNew ? "newly-added" : ""}`;
  card.dataset.id = memory.id;

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

  const imgElement = card.querySelector("img");
  imgElement.onload = () => imgElement.classList.add("loaded");
  if (imgElement.complete) imgElement.classList.add("loaded");

  card.addEventListener("click", () => {
    openLightbox(memory.imageUrl, formattedDate, memory.caption);
  });

  // Strict 2-column grid: Prepend newest to top
  if (galleryGrid.firstChild) {
    galleryGrid.insertBefore(card, galleryGrid.firstChild);
  } else {
    galleryGrid.appendChild(card);
  }

  memoryCount = displayedMemoryIds.size;
  updateCounter(memoryCount);

  if (isNew) {
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
  addPhotoBtn.addEventListener("click", () => {
    photoFileInput.value = "";
    photoFileInput.click();
  });

  photoFileInput.addEventListener("change", handleFileChosen);

  changePhotoBtn.addEventListener("click", () => {
    photoFileInput.click();
  });

  closeUploadModal.addEventListener("click", closeUploadSheet);
  cancelUploadBtn.addEventListener("click", closeUploadSheet);
  uploadModal.addEventListener("click", (e) => {
    if (e.target === uploadModal) closeUploadSheet();
  });

  uploadForm.addEventListener("submit", handleUploadSubmit);

  lightboxClose.addEventListener("click", closeLightbox);
  lightboxModal.addEventListener("click", (e) => {
    if (e.target === lightboxModal) closeLightbox();
  });

  configBtn.addEventListener("click", openConfigDialog);
  if (openConfigBtn) openConfigBtn.addEventListener("click", openConfigDialog);
  closeConfigModal.addEventListener("click", closeConfigDialog);
  configModal.addEventListener("click", (e) => {
    if (e.target === configModal) closeConfigDialog();
  });
  configForm.addEventListener("submit", handleConfigSubmit);
  resetDemoBtn.addEventListener("click", handleResetDemo);

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
      resolve(file);
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
    const optimizedBlob = await compressImage(currentSelectedFile);
    progressBarFill.style.width = "35%";
    progressLabel.textContent = "Uploading to cloud... ☁️";

    if (isFirebaseActive && firebaseStorage) {
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
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          progressBarFill.style.width = "95%";
          progressLabel.textContent = "Saving to your gallery... ❤️";

          const memoryRecord = {
            imageUrl: downloadUrl,
            caption: caption,
            date: date,
            timestamp: timestamp,
            createdAt: new Date().toISOString()
          };

          // Save to Realtime Database
          if (firebaseDb) {
            try {
              await push(dbRef(firebaseDb, "memories"), memoryRecord);
            } catch (rtdbErr) {
              console.warn("RTDB write note:", rtdbErr);
            }
          }

          // Also save to Firestore (ensures support regardless of which DB is active)
          if (firebaseFirestore) {
            try {
              await addDoc(collection(firebaseFirestore, "memories"), memoryRecord);
            } catch (fsErr) {
              console.warn("Firestore write note:", fsErr);
            }
          }

          progressBarFill.style.width = "100%";
          showToast("✨ Memory saved forever!");
          closeUploadSheet();
        }
      );
    } else {
      // Demo Mode fallback
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

        const stored = localStorage.getItem("demo_memories");
        const memories = stored ? JSON.parse(stored) : [...SAMPLE_MEMORIES];
        memories.unshift(newMemory);
        localStorage.setItem("demo_memories", JSON.stringify(memories));

        renderMemoryCard(newMemory, true);

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
  const current = getActiveFirebaseConfig();
  if (current) {
    configJsonInput.value = JSON.stringify(current, null, 2);
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
    if (rawText.startsWith("{") && rawText.endsWith("}")) {
      try {
        parsed = JSON.parse(rawText);
      } catch (jsonErr) {
        parsed = new Function("return " + rawText)();
      }
    } else {
      throw new Error("Invalid format. Please paste a valid JSON or config object.");
    }

    if (!isValidConfig(parsed)) {
      throw new Error("Please enter valid Firebase credentials.");
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
