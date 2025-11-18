// ==========================================
// GOOGLE APPS SCRIPT - FIXED VERSION
// ==========================================
// Copy-paste script ini ke script.google.com
// Ganti script lama Anda dengan ini

function doPost(e) {
  try {
    // Parse request - support both JSON and FormData
    let action, fileName, fileData, contentType;
    
    if (e.postData && e.postData.type === 'multipart/form-data') {
      // FormData from browser
      action = e.parameter.action;
      fileName = e.parameter.fileName;
      fileData = e.parameter.fileData;
      contentType = e.parameter.contentType;
    } else if (e.postData && e.postData.contents) {
      // JSON format
      const data = JSON.parse(e.postData.contents);
      action = data.action;
      fileName = data.fileName;
      fileData = data.fileData;
      contentType = data.contentType;
    } else {
      throw new Error('Invalid request format');
    }
    
    if (action === 'uploadToGCS') {
      return uploadToGCS(fileName, fileData, contentType);
    }
    
    // Fallback: Upload to Google Drive
    const FOLDER_ID = '1E3RWMKJReThOjNy-oVGRUpjiDPAWVEw8';
    const folder = DriveApp.getFolderById(FOLDER_ID);
    
    const finalName = fileName || 'photo_' + new Date().getTime() + '.jpg';
    
    // Decode base64
    const base64Data = fileData.split(',')[1];
    const fileBlob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      contentType,
      finalName
    );
    
    // Save to Google Drive
    const file = folder.createFile(fileBlob);
    
    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        fileId: file.getId(),
        fileName: finalName
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

// Upload to GCS via Apps Script
function uploadToGCS(fileName, fileData, contentType) {
  const BUCKET_NAME = 'devsync_buckets';
  
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const finalName = `photos/${timestamp}_${cleanName}`;
    
    // Decode base64 (remove data:image/xxx;base64, prefix)
    const base64Data = fileData.split(',')[1];
    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      contentType,
      finalName
    );
    
    // Upload to GCS using UrlFetchApp (simple approach without signed URLs)
    const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET_NAME}/o?uploadType=media&name=${encodeURIComponent(finalName)}`;
    
    const response = UrlFetchApp.fetch(uploadUrl, {
      method: 'POST',
      contentType: contentType,
      payload: blob.getBytes(),
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${finalName}`;
      
      return ContentService.createTextOutput(
        JSON.stringify({
          success: true,
          fileName: finalName,
          url: publicUrl,
          message: 'Upload berhasil!'
        })
      ).setMimeType(ContentService.MimeType.JSON);
    } else {
      throw new Error(`GCS upload failed: ${response.getContentText()}`);
    }
    
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: error.toString()
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // Handle different actions
  const action = e.parameter.action;
  
  if (action === 'listPhotos') {
    return listPhotosFromGCS();
  } else if (action === 'getSignedUrl') {
    const fileName = e.parameter.fileName;
    const contentType = e.parameter.contentType;
    return getSignedUploadUrl(fileName, contentType);
  }
  
  // Default: Load from Google Drive (backward compatibility)
  const FOLDER_ID = '1E3RWMKJReThOjNy-oVGRUpjiDPAWVEw8';
  
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const photos = [];
    
    // Ambil semua file gambar (JPEG, PNG, JPG, GIF)
    const imageTypes = [MimeType.JPEG, MimeType.PNG, MimeType.GIF];
    
    imageTypes.forEach(function(mimeType) {
      const files = folder.getFilesByType(mimeType);
      while (files.hasNext()) {
        const file = files.next();
        photos.push({
          id: file.getId(),
          name: file.getName(),
          url: 'https://drive.google.com/uc?export=view&id=' + file.getId(),
          thumbnail: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w400',
          date: file.getDateCreated().getTime()
        });
      }
    });
    
    // Sort by date (newest first)
    photos.sort(function(a, b) {
      return b.date - a.date;
    });
    
    // Return as JSON
    return ContentService.createTextOutput(
      JSON.stringify({ 
        photos: photos, 
        count: photos.length,
        success: true 
      })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ 
        error: error.toString(),
        success: false 
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// List photos from GCS bucket (simple public URL approach)
function listPhotosFromGCS() {
  const BUCKET_NAME = 'devsync_buckets';
  const FOLDER_PATH = 'photos/';
  
  try {
    // For now, return empty array - GCS photos will be loaded directly from public URLs
    // This is a placeholder that returns the bucket info
    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        bucket: BUCKET_NAME,
        folder: FOLDER_PATH,
        baseUrl: `https://storage.googleapis.com/${BUCKET_NAME}/${FOLDER_PATH}`,
        photos: [],
        message: 'Use direct GCS URLs to access photos'
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

// Generate signed upload URL (placeholder - implement with service account)
function getSignedUploadUrl(fileName, contentType) {
  // TODO: Implement proper signed URL generation with service account
  return ContentService.createTextOutput(
    JSON.stringify({
      success: false,
      error: 'Signed URL generation not implemented yet'
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// CARA DEPLOY:
// ==========================================
// 1. Copy script ini
// 2. Buka script.google.com
// 3. Ganti semua kode dengan script ini
// 4. Klik "Deploy" > "Manage deployments"
// 5. Klik icon edit (pencil) pada deployment yang ada
// 6. Ubah "Version" ke "New version"
// 7. Pastikan:
//    - Execute as: Me (email@gmail.com)
//    - Who has access: Anyone
// 8. Klik "Deploy"
// 9. Copy URL yang baru (atau tetap gunakan yang lama)
// 10. Paste ke app.js bagian SCRIPT_URL
