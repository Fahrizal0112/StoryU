# Upload Foto ke Google Drive dari Website

## 📌 Status Saat Ini
Website sekarang sudah bisa upload foto, TAPI:
- ✅ Upload bekerja (foto disimpan di **LocalStorage** browser)
- ⚠️ Foto hanya tersimpan di **browser lokal** (tidak sync ke Google Drive)
- ⚠️ Jika clear browser data, foto akan hilang

## 🎯 Untuk Upload Langsung ke Google Drive

Perlu modifikasi **Google Apps Script** untuk handle file upload.

### Langkah-langkah:

#### 1. Update Google Apps Script

Buka script.google.com, edit script Anda, tambahkan fungsi ini:

```javascript
function doPost(e) {
  try {
    const FOLDER_ID = '1E3RWMKJReThOjNy-oVGRUpjiDPAWVEw8';
    const folder = DriveApp.getFolderById(FOLDER_ID);
    
    // Parse uploaded file
    const fileData = JSON.parse(e.postData.contents);
    const fileName = fileData.name || 'photo_' + new Date().getTime() + '.jpg';
    const fileContent = Utilities.newBlob(
      Utilities.base64Decode(fileData.data.split(',')[1]),
      fileData.type,
      fileName
    );
    
    // Save to Google Drive
    const file = folder.createFile(fileContent);
    
    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        fileId: file.getId(),
        message: 'Upload berhasil!'
      })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: error.toString()
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// Existing doGet function tetap sama...
function doGet(e) {
  // ... (kode yang sudah ada)
}
```

#### 2. Re-deploy Script

1. Klik **Deploy** > **Manage deployments**
2. Klik icon ✏️ (edit)
3. Ubah **Version** ke "New version"
4. Klik **Deploy**
5. Copy URL baru (atau tetap gunakan URL lama)

#### 3. Update app.js

Di file `app.js`, ganti fungsi `uploadPhotos()`:

```javascript
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
        
        for (let file of selectedFiles) {
            // Convert file to base64
            const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
            
            // Upload to Google Drive via Apps Script
            const response = await fetch(CONFIG.SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({
                    name: file.name,
                    type: file.type,
                    data: base64
                })
            });
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error);
            }
            
            uploadedCount++;
            const percent = (uploadedCount / totalFiles) * 100;
            progressFill.style.width = percent + '%';
            progressText.textContent = `Uploading ${uploadedCount}/${totalFiles}...`;
        }
        
        // Success
        progressText.textContent = '✅ Upload berhasil ke Google Drive!';
        setTimeout(() => {
            closeUploadModal();
            loadPhotos(); // Reload from Google Drive
        }, 1500);
        
    } catch (error) {
        console.error('Upload error:', error);
        progressText.textContent = '❌ Upload gagal! ' + error.message;
        progressText.style.color = '#e74c3c';
    }
}
```

## 🔄 Alternatif: Tetap Pakai LocalStorage

Jika ingin simple (tidak perlu setup Apps Script lagi):

**Kelebihan:**
- Sudah berfungsi sekarang
- Tidak perlu konfigurasi tambahan
- Upload cepat

**Kekurangan:**
- Foto hanya di browser lokal
- Tidak bisa diakses dari device lain
- Hilang jika clear browser data

## 💡 Rekomendasi

**Untuk testing:** Pakai LocalStorage dulu (sudah aktif sekarang)

**Untuk production:** Setup Google Apps Script upload agar foto tersimpan permanen dan bisa diakses dari mana saja

## 🐛 Troubleshooting

**Upload tidak berfungsi:**
- Cek Console (F12) untuk error
- Pastikan file < 5MB
- Cek format file (JPG, PNG, GIF)

**Foto tidak muncul setelah upload:**
- Refresh halaman (Ctrl + F5)
- Cek LocalStorage: F12 > Application > Local Storage

**Ingin hapus foto local:**
```javascript
localStorage.removeItem('localPhotos');
```
Paste di Console (F12) dan Enter.
