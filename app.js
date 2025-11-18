// Konfigurasi GCS
const CONFIG = {
    // Google Cloud Storage bucket name
    GCS_BUCKET: 'devsync_buckets',
    GCS_FOLDER: 'photos/',
    
    // GCS API endpoint
    GCS_API: 'https://storage.googleapis.com/storage/v1',
    
    // Jumlah foto yang dimuat pertama kali
    INITIAL_LOAD: 12,
    
    // Jumlah foto yang dimuat saat klik "Load More"
    LOAD_MORE_COUNT: 6
};

let allPhotos = [];
let displayedPhotos = 0;
let isAdminMode = false;

// Load photos on page load
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    isAdminMode = urlParams.get('admin') === 'true';
    
    if (isAdminMode) {
        document.getElementById('adminPanel').style.display = 'block';
        document.getElementById('folderIdDisplay').textContent = CONFIG.GCS_BUCKET;
    }
    
    // Always use GCS
    loadPhotosFromGCS();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const refreshBtn = document.getElementById('refreshGallery');
    const modal = document.getElementById('photoModal');
    const modalClose = document.querySelector('.modal-close');
    
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMorePhotos);
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            displayedPhotos = 0;
            loadPhotosFromGCS();
        });
    }
    
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Load Photos dari Google Drive menggunakan Google Apps Script
async function loadPhotos() {
    const gallery = document.getElementById('photoGallery');
    gallery.innerHTML = '<div class="loading">Memuat foto...</div>';
    
    // Cek apakah Script URL sudah diset
    if (!CONFIG.SCRIPT_URL || CONFIG.SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
        gallery.innerHTML = `
            <div class="loading" style="color: #f39c12;">
                <p>⚠️ Google Apps Script belum di-setup</p>
            </div>
        `;
        return;
    }
    
    try {
        // Tambahkan timestamp untuk bypass cache dan rate limit
        const timestamp = new Date().getTime();
        const url = `${CONFIG.SCRIPT_URL}?t=${timestamp}`;
        
        // Fetch data dari Google Apps Script dengan timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        const response = await fetch(url, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Cek jika ada error dari script
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Load photos dari response
        allPhotos = data.photos || [];
        
        if (allPhotos.length === 0) {
            gallery.innerHTML = `
                <div class="loading" style="color: #f39c12;">
                    <p>📸 Belum ada foto</p>
                    <button onclick="window.open('https://drive.google.com/drive/folders/${CONFIG.FOLDER_ID}', '_blank')" 
                            style="margin-top: 15px; padding: 10px 20px; background: #4a90e2; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        📂 Buka Google Drive
                    </button>
                </div>
            `;
            return;
        }
        
        displayedPhotos = 0;
        displayPhotos(CONFIG.INITIAL_LOAD);
        
    } catch (error) {
        console.error('Error loading photos:', error);
        
        let errorMessage = 'Gagal memuat foto';
        if (error.name === 'AbortError') {
            errorMessage = 'Request timeout (server lama merespons)';
        } else if (error.message.includes('429')) {
            errorMessage = 'Terlalu banyak request. Tunggu 1 menit.';
        }
        
        gallery.innerHTML = `
            <div class="loading" style="color: #e74c3c;">
                <p>❌ ${errorMessage}</p>
                <button onclick="loadPhotos()" 
                        style="margin-top: 15px; padding: 10px 20px; background: #4a90e2; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    🔄 Coba Lagi
                </button>
            </div>
        `;
    }
}

// Display Photos
function displayPhotos(count) {
    const gallery = document.getElementById('photoGallery');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    
    if (displayedPhotos === 0) {
        gallery.innerHTML = '';
    }
    
    const photosToDisplay = allPhotos.slice(displayedPhotos, displayedPhotos + count);
    
    photosToDisplay.forEach((photo, index) => {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        photoItem.style.animationDelay = `${index * 0.1}s`;
        
        // Support both formats (from Google Apps Script, JSON, or GCS)
        const thumbnailUrl = photo.thumbnail || photo.thumbnailLink || photo.url || `https://drive.google.com/thumbnail?id=${photo.id}&sz=w400`;
        const fullUrl = photo.webContentLink || photo.url || photo.thumbnailLink;
        
        // Store file ID for modal
        const fileId = photo.id;
        
        photoItem.innerHTML = `
            <img src="${thumbnailUrl}" 
                 alt="${photo.name}" 
                 data-fileid="${fileId}"
                 data-name="${photo.name}"
                 data-fullurl="${fullUrl}"
                 loading="lazy">
        `;
        
        photoItem.addEventListener('click', function() {
            const imgElement = this.querySelector('img');
            const fileId = imgElement.dataset.fileid;
            const name = imgElement.dataset.name;
            const fullUrl = imgElement.dataset.fullurl;
            
            // Check if it's GCS or Google Drive
            if (fullUrl && fullUrl.includes('storage.googleapis.com')) {
                // GCS URL - use directly
                openModal(fullUrl, name);
            } else {
                // Google Drive - generate thumbnail URL
                openModal(`https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`, name);
            }
        });
        
        gallery.appendChild(photoItem);
    });
    
    displayedPhotos += photosToDisplay.length;
    
    // Show/hide Load More button
    if (displayedPhotos >= allPhotos.length) {
        loadMoreBtn.style.display = 'none';
    } else {
        loadMoreBtn.style.display = 'block';
    }
}

// Load More Photos
function loadMorePhotos() {
    displayPhotos(CONFIG.LOAD_MORE_COUNT);
}

// Open Modal
function openModal(imageUrl, caption) {
    const modal = document.getElementById('photoModal');
    const modalImg = document.getElementById('modalImage');
    const captionText = document.getElementById('caption');
    
    modal.style.display = 'block';
    
    // Extract file ID from URL and use thumbnail link yang lebih reliable
    let finalUrl = imageUrl;
    
    // Cek apakah URL dari Google Drive
    if (imageUrl.includes('drive.google.com')) {
        // Extract file ID
        let fileId = null;
        
        if (imageUrl.includes('/file/d/')) {
            fileId = imageUrl.split('/file/d/')[1].split('/')[0];
        } else if (imageUrl.includes('id=')) {
            fileId = imageUrl.split('id=')[1].split('&')[0];
        }
        
        if (fileId) {
            // Gunakan thumbnail link dengan size besar untuk modal
            // Format ini lebih reliable dan tidak kena CORS
            finalUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
        }
    }
    
    // Set image dengan loading state
    modalImg.style.opacity = '0.5';
    modalImg.src = finalUrl;
    
    // Show full opacity when loaded
    modalImg.onload = function() {
        modalImg.style.opacity = '1';
    };
    
    // Error fallback - try alternative URL
    modalImg.onerror = function() {
        console.log('Failed to load image, trying alternative URL...');
        if (imageUrl.includes('drive.google.com')) {
            const fileId = finalUrl.split('id=')[1]?.split('&')[0];
            if (fileId) {
                // Try uc?export=download as fallback
                modalImg.src = `https://drive.google.com/uc?export=download&id=${fileId}`;
            }
        }
    };
    
    captionText.innerHTML = caption;
}

// Alternative: Jika tidak ingin menggunakan API Key
// Anda bisa menggunakan metode alternatif dengan membuat file JSON manual
// yang berisi list foto-foto dari Google Drive

// Fungsi alternatif untuk load dari file JSON
async function loadPhotosFromJSON() {
    const gallery = document.getElementById('photoGallery');
    gallery.innerHTML = '<div class="loading">Memuat foto dari JSON... ❤️</div>';
    
    try {
        const response = await fetch('photos.json');
        const data = await response.json();
        
        // Convert JSON format to internal format
        allPhotos = (data.photos || []).map(photo => ({
            id: photo.id,
            name: photo.name,
            thumbnailLink: photo.url,
            webContentLink: photo.url
        }));
        
        if (allPhotos.length === 0) {
            gallery.innerHTML = '<div class="loading">Belum ada foto di photos.json. Tambahkan foto! 📸</div>';
            return;
        }
        
        displayedPhotos = 0;
        displayPhotos(CONFIG.INITIAL_LOAD);
    } catch (error) {
        console.error('Error loading photos from JSON:', error);
        gallery.innerHTML = `
            <div class="loading" style="color: #e74c3c;">
                <p>❌ Gagal memuat photos.json</p>
                <p style="font-size: 0.9rem; margin-top: 10px;">
                    Pastikan file <code>photos.json</code> ada dan formatnya benar.
                </p>
            </div>
        `;
    }
}

// Make function available globally for button onclick
window.loadPhotosFromJSON = loadPhotosFromJSON;

// ========================================
// UPLOAD FUNCTIONALITY
// ========================================

let selectedFiles = [];

// Open Upload Modal
function openUploadModal() {
    const modal = document.getElementById('uploadModal');
    modal.style.display = 'block';
    setupUploadHandlers();
}

// Close Upload Modal
function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    modal.style.display = 'none';
    resetUploadState();
}

// Setup Upload Handlers (Drag & Drop + File Input)
function setupUploadHandlers() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    // Click to upload
    uploadArea.onclick = () => fileInput.click();
    
    // Drag & Drop handlers
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        handleFiles(files);
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleFiles(files);
    });
}

// Compress Image
async function compressImage(file, maxSizeMB = 5) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Calculate new dimensions (max 1920px width)
                const maxWidth = 1920;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Start with quality 0.9 and reduce if needed
                let quality = 0.9;
                const targetSize = maxSizeMB * 1024 * 1024;
                
                const tryCompress = () => {
                    canvas.toBlob(
                        (blob) => {
                            if (blob.size <= targetSize || quality <= 0.1) {
                                // Success or reached minimum quality
                                const compressedFile = new File([blob], file.name, {
                                    type: 'image/jpeg',
                                    lastModified: Date.now()
                                });
                                console.log(`Compressed ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
                                resolve(compressedFile);
                            } else {
                                // Try lower quality
                                quality -= 0.1;
                                tryCompress();
                            }
                        },
                        'image/jpeg',
                        quality
                    );
                };
                
                tryCompress();
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

// Handle Selected Files
async function handleFiles(files) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const progressText = document.getElementById('uploadArea');
    
    for (let file of files) {
        // Check if file already selected
        if (selectedFiles.find(f => f.name === file.name)) {
            continue;
        }
        
        // Auto-compress if larger than 5MB
        if (file.size > maxSize) {
            progressText.innerHTML = `<p>🔄 Mengompress ${file.name}...</p>`;
            try {
                const compressedFile = await compressImage(file, 5);
                selectedFiles.push(compressedFile);
                console.log(`${file.name} berhasil dicompress`);
            } catch (error) {
                console.error('Compression error:', error);
                alert(`Gagal mengompress ${file.name}`);
            }
        } else {
            selectedFiles.push(file);
        }
    }
    
    if (selectedFiles.length > 0) {
        displayPreview();
    }
}

// Display Preview of Selected Files
function displayPreview() {
    const preview = document.getElementById('uploadPreview');
    const actions = document.getElementById('uploadActions');
    const uploadArea = document.getElementById('uploadArea');
    
    preview.innerHTML = '';
    preview.style.display = 'grid';
    actions.style.display = 'flex';
    uploadArea.style.display = 'none';
    
    selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `
                <img src="${e.target.result}" alt="${file.name}">
                <button class="preview-remove" onclick="removeFile(${index})">&times;</button>
            `;
            preview.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

// Remove File from Selection
function removeFile(index) {
    selectedFiles.splice(index, 1);
    if (selectedFiles.length === 0) {
        resetUploadState();
    } else {
        displayPreview();
    }
}

// Cancel Upload
function cancelUpload() {
    resetUploadState();
    closeUploadModal();
}

// Reset Upload State
function resetUploadState() {
    selectedFiles = [];
    document.getElementById('uploadPreview').style.display = 'none';
    document.getElementById('uploadActions').style.display = 'none';
    document.getElementById('uploadProgress').style.display = 'none';
    document.getElementById('uploadArea').style.display = 'block';
    document.getElementById('fileInput').value = '';
}

// Upload Photos to Google Cloud Storage
async function uploadPhotos() {
    if (selectedFiles.length === 0) return;
    
    const actions = document.getElementById('uploadActions');
    const progress = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    actions.style.display = 'none';
    progress.style.display = 'block';
    
    try {
        const totalFiles = selectedFiles.length;
        let uploadedCount = 0;
        let failedCount = 0;
        
        for (let file of selectedFiles) {
            try {
                // Generate unique filename
                const timestamp = Date.now();
                const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const fileName = `${timestamp}_${cleanName}`;
                const objectName = `${CONFIG.GCS_FOLDER}${fileName}`;
                
                // Upload directly to GCS public bucket
                const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${CONFIG.GCS_BUCKET}/o?uploadType=media&name=${encodeURIComponent(objectName)}`;
                
                const uploadResponse = await fetch(uploadUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': file.type
                    },
                    body: file
                });
                
                if (uploadResponse.ok) {
                    uploadedCount++;
                } else {
                    throw new Error(`Upload failed: ${uploadResponse.status}`);
                }
            } catch (fileError) {
                console.error(`Failed to upload ${file.name}:`, fileError);
                failedCount++;
            }
            
            const percent = ((uploadedCount + failedCount) / totalFiles) * 100;
            progressFill.style.width = percent + '%';
            progressText.textContent = `Upload ${uploadedCount}/${totalFiles}...`;
        }
        
        // Success
        if (failedCount === 0) {
            progressText.textContent = `✅ ${uploadedCount} foto berhasil diupload!`;
        } else {
            progressText.textContent = `⚠️ ${uploadedCount} berhasil, ${failedCount} gagal`;
        }
        
        setTimeout(() => {
            closeUploadModal();
            // Reload gallery from Google Drive
            displayedPhotos = 0;
            loadPhotos();
        }, 2000);
        
    } catch (error) {
        console.error('Upload error:', error);
        progressText.textContent = '❌ Upload gagal! ' + error.message;
        progressText.style.color = '#e74c3c';
    }
}

// Load Photos from Google Cloud Storage
async function loadPhotosFromGCS() {
    const gallery = document.getElementById('photoGallery');
    gallery.innerHTML = '<div class="loading">Memuat foto dari GCS...</div>';
    
    try {
        // GCS public bucket URL
        const baseUrl = `https://storage.googleapis.com/${CONFIG.GCS_BUCKET}/photos`;
        
        // Load the uploaded file from GCS
        // Since bucket is public, we can list objects via XML API
        const listUrl = `https://storage.googleapis.com/storage/v1/b/${CONFIG.GCS_BUCKET}/o?prefix=photos/`;
        
        const response = await fetch(listUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Convert GCS objects to photo format
        allPhotos = (data.items || []).map(item => ({
            id: item.name,
            name: item.name.split('/').pop(),
            thumbnailLink: `https://storage.googleapis.com/${CONFIG.GCS_BUCKET}/${item.name}`,
            webContentLink: `https://storage.googleapis.com/${CONFIG.GCS_BUCKET}/${item.name}`,
            date: new Date(item.timeCreated).getTime()
        }));
        
        // Sort by date (newest first)
        allPhotos.sort((a, b) => b.date - a.date);
        
        if (allPhotos.length === 0) {
            gallery.innerHTML = '<div class="loading" style="color: #f39c12;">📸 Belum ada foto. Upload foto pertama!</div>';
            return;
        }
        
        displayedPhotos = 0;
        displayPhotos(CONFIG.INITIAL_LOAD);
        
    } catch (error) {
        console.error('Error loading photos:', error);
        gallery.innerHTML = `
            <div class="loading" style="color: #e74c3c;">
                <p>❌ Gagal memuat foto: ${error.message}</p>
                <p style="font-size: 0.9rem; margin-top: 10px;">Pastikan bucket <code>${CONFIG.GCS_BUCKET}</code> sudah public</p>
                <button onclick="loadPhotosFromGCS()" 
                        style="margin-top: 15px; padding: 10px 20px; background: #4a90e2; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    🔄 Coba Lagi
                </button>
            </div>
        `;
    }
}

// Make functions globally available
window.openUploadModal = openUploadModal;
window.closeUploadModal = closeUploadModal;
window.removeFile = removeFile;
window.cancelUpload = cancelUpload;
window.uploadPhotos = uploadPhotos;

// Close modal when clicking outside
window.onclick = function(event) {
    const uploadModal = document.getElementById('uploadModal');
    if (event.target === uploadModal) {
        closeUploadModal();
    }
};
window.onclick = function(event) {
    const uploadModal = document.getElementById('uploadModal');
    if (event.target === uploadModal) {
        closeUploadModal();
    }
};
