/**
 * Anniversary Memory Gallery - Main Application
 * Multi-device live cloud synchronization with Firebase Firestore
 */

// DOM Elements
const galleryGrid = document.getElementById('galleryGrid');
const emptyState = document.getElementById('emptyState');
const memoryCounter = document.getElementById('memoryCounter');
const addPhotoBtn = document.getElementById('addPhotoBtn');
const fileInput = document.getElementById('imageInput');
const uploadModal = document.getElementById('uploadModal');
const closeUploadModal = document.getElementById('closeUploadModal');
const cancelUploadBtn = document.getElementById('cancelUploadBtn');
const changePhotoBtn = document.getElementById('changePhotoBtn');
const imagePreview = document.getElementById('imagePreview');
const uploadForm = document.getElementById('uploadForm');
const captionInput = document.getElementById('captionInput');
const progressWrap = document.getElementById('progressWrap');
const progressBarFill = document.getElementById('progressBarFill');
const progressLabel = document.getElementById('progressLabel');
const submitUploadBtn = document.getElementById('submitUploadBtn');

// Lightbox Elements
const lightboxModal = document.getElementById('lightboxModal');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxDate = document.getElementById('lightboxDate');
const lightboxCaption = document.getElementById('lightboxCaption');
const lightboxClose = document.getElementById('lightboxClose');

let selectedFile = null;

/* ==========================================================================
   UPLOAD FUNCTION (Firestore Base64 with smart size optimization)
   ========================================================================== */

/**
 * Optimizes large phone photos so they never exceed Firestore's 1MB limit.
 */
function compressImageForFirestore(file, maxWidth = 1200, quality = 0.82) {
  return new Promise((resolve) => {
    // If image is already smaller than 350KB, read directly
    if (file.size < 350 * 1024) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
      return;
    }

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

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const base64 = canvas.toDataURL('image/jpeg', quality);
      resolve(base64);
    };

    img.onerror = () => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    };
  });
}

/**
 * Upload image to Firestore collection 'photos'
 */
async function uploadImage() {
  const input = document.getElementById('imageInput');
  const file = selectedFile || (input && input.files && input.files[0]);
  if (!file) return alert('Please select a picture first!');

  const captionText = captionInput ? captionInput.value.trim() : '';

  if (submitUploadBtn) submitUploadBtn.disabled = true;
  if (progressWrap) progressWrap.style.display = 'block';
  if (progressBarFill) progressBarFill.style.width = '35%';
  if (progressLabel) progressLabel.textContent = 'Optimizing for instant sync... 💫';

  try {
    const base64Image = await compressImageForFirestore(file);
    if (!base64Image) throw new Error('Could not process image.');

    if (progressBarFill) progressBarFill.style.width = '70%';
    if (progressLabel) progressLabel.textContent = 'Saving directly to Firestore... ❤️';

    // Save directly to Firestore database collection 'photos'
    await db.collection('photos').add({
      image: base64Image,
      caption: captionText,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    if (input) input.value = '';
    selectedFile = null;
    if (progressBarFill) progressBarFill.style.width = '100%';

    showToast('Photo uploaded successfully! 💕');
    closeUploadSheet();
  } catch (error) {
    console.error('Error adding document: ', error);
    alert('Upload failed: ' + (error.message || 'Check console for details.'));
  } finally {
    if (submitUploadBtn) submitUploadBtn.disabled = false;
  }
}

// Make uploadImage, openLightbox & showToast globally available
window.uploadImage = uploadImage;
window.openLightbox = openLightbox;
window.showToast = showToast;

/* ==========================================================================
   UI & EVENT HANDLERS
   ========================================================================== */

function setupUI() {
  createAmbientHearts();

  // Floating 'Add Photo' button opens native camera roll
  if (addPhotoBtn && fileInput) {
    addPhotoBtn.addEventListener('click', () => {
      fileInput.value = '';
      fileInput.click();
    });
  }

  // When user selects a picture from camera roll
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Please select an image file!');
        return;
      }

      selectedFile = file;

      // Show preview in sheet
      const reader = new FileReader();
      reader.onload = (event) => {
        imagePreview.src = event.target.result;
        openUploadSheet();
      };
      reader.readAsDataURL(file);
    });
  }

  // Change photo button inside sheet
  if (changePhotoBtn && fileInput) {
    changePhotoBtn.addEventListener('click', () => {
      fileInput.click();
    });
  }

  // Modal dismiss buttons
  if (closeUploadModal) closeUploadModal.addEventListener('click', closeUploadSheet);
  if (cancelUploadBtn) cancelUploadBtn.addEventListener('click', closeUploadSheet);
  if (uploadModal) {
    uploadModal.addEventListener('click', (e) => {
      if (e.target === uploadModal) closeUploadSheet();
    });
  }

  // Upload Form Submit
  if (uploadForm) {
    uploadForm.addEventListener('submit', (e) => {
      e.preventDefault();
      uploadImage();
    });
  }

  // Lightbox Close
  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxModal) {
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) closeLightbox();
    });
  }

  // ESC key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLightbox();
      closeUploadSheet();
    }
  });
}

function openUploadSheet() {
  if (!uploadModal) return;
  uploadModal.classList.add('open');
  uploadModal.setAttribute('aria-hidden', 'false');
  if (progressWrap) progressWrap.style.display = 'none';
  if (progressBarFill) progressBarFill.style.width = '0%';
  if (submitUploadBtn) submitUploadBtn.disabled = false;
  if (captionInput && window.innerWidth > 600) {
    captionInput.focus();
  }
}

function closeUploadSheet() {
  if (!uploadModal) return;
  uploadModal.classList.remove('open');
  uploadModal.setAttribute('aria-hidden', 'true');
  if (captionInput) captionInput.value = '';
  selectedFile = null;
}

/* ==========================================================================
   LIGHTBOX MODAL & ACTIONS
   ========================================================================== */

let currentLightboxDocId = null;
let currentLightboxImageUrl = null;

function openLightbox(imageUrl, dateStr, caption, docId = null) {
  if (!lightboxModal) return;
  currentLightboxDocId = docId;
  currentLightboxImageUrl = imageUrl;
  lightboxImg.src = imageUrl;
  lightboxDate.textContent = dateStr;
  lightboxCaption.textContent = caption || 'A lovely memory together...';
  lightboxModal.classList.add('open');
  lightboxModal.setAttribute('aria-hidden', 'false');
}

function closeLightbox() {
  if (!lightboxModal) return;
  lightboxModal.classList.remove('open');
  lightboxModal.setAttribute('aria-hidden', 'true');
  currentLightboxDocId = null;
  currentLightboxImageUrl = null;
}

// Download & Delete in Lightbox
const lightboxDownloadBtn = document.getElementById('lightboxDownloadBtn');
if (lightboxDownloadBtn) {
  lightboxDownloadBtn.addEventListener('click', () => {
    if (!currentLightboxImageUrl) return;
    const a = document.createElement('a');
    a.href = currentLightboxImageUrl;
    a.download = `anniversary-memory-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Photo downloading to phone! 📱');
  });
}

const lightboxDeleteBtn = document.getElementById('lightboxDeleteBtn');
if (lightboxDeleteBtn) {
  lightboxDeleteBtn.addEventListener('click', () => {
    if (!currentLightboxDocId) return;
    const idToDelete = currentLightboxDocId;
    closeLightbox();
    if (typeof window.deletePhoto === 'function') {
      window.deletePhoto(idToDelete);
    }
  });
}

/* ==========================================================================
   HELPERS & AMBIENT HEARTS
   ========================================================================== */

function updateCounter(count) {
  if (!memoryCounter) return;
  if (count === 1) {
    memoryCounter.textContent = '1 cherished memory together';
  } else {
    memoryCounter.textContent = `${count} cherished memories together`;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

function createAmbientHearts() {
  const container = document.getElementById('ambientHearts');
  if (!container) return;

  const heartIcons = ['❤️', '💖', '💕', '🌸', '✨'];
  const count = 12;

  for (let i = 0; i < count; i++) {
    const heart = document.createElement('span');
    heart.className = 'floating-heart';
    heart.textContent = heartIcons[Math.floor(Math.random() * heartIcons.length)];
    heart.style.left = `${Math.random() * 95}%`;
    heart.style.fontSize = `${12 + Math.random() * 16}px`;
    heart.style.animationDuration = `${8 + Math.random() * 10}s`;
    heart.style.animationDelay = `${Math.random() * 8}s`;
    container.appendChild(heart);
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', setupUI);
