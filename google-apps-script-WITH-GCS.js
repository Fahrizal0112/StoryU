// ==========================================
// GOOGLE APPS SCRIPT - WITH GCS SUPPORT
// ==========================================
// Script ini support BOTH Google Drive & GCS

// ============ CONFIGURATION ============
const CONFIG = {
  FOLDER_ID: '1E3RWMKJReThOjNy-oVGRUpjiDPAWVEw8',
  GCS_BUCKET: 'devsync_buckets',
  
  // Service Account credentials (paste JSON dari GCP)
  // Cara dapat: GCP Console → IAM & Admin → Service Accounts → Create → Download JSON
  SERVICE_ACCOUNT: null // Set ke null untuk disable GCS, pakai Drive only
  
  // Contoh format (JANGAN SHARE KE PUBLIK!):
  /*
  SERVICE_ACCOUNT: {
    "type": "service_account",
    "project_id": "your-project-id",
    "private_key_id": "abc123...",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n",
    "client_email": "service-account@project-id.iam.gserviceaccount.com",
    "client_id": "123456789",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
  }
  */
};

// ============ POST HANDLER (UPLOAD) ============
function doPost(e) {
  try {
    // Parse request - support FormData
    let fileName, fileData, contentType;
    
    if (e.parameter) {
      fileName = e.parameter.fileName;
      fileData = e.parameter.fileData;
      contentType = e.parameter.contentType;
    } else {
      throw new Error('No data received');
    }
    
    // Upload to Google Drive (default & always works)
    const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
    
    const timestamp = Date.now();
    const cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const finalName = `${timestamp}_${cleanName}`;
    
    // Decode base64
    const base64Data = fileData.split(',')[1];
    const fileBlob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      contentType,
      finalName
    );
    
    // Save to Google Drive
    const file = folder.createFile(fileBlob);
    
    // Optional: Also upload to GCS if configured
    if (CONFIG.SERVICE_ACCOUNT) {
      try {
        uploadToGCS(finalName, fileBlob);
      } catch (gcsError) {
        Logger.log('GCS upload failed: ' + gcsError);
        // Continue anyway, Drive upload succeeded
      }
    }
    
    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        fileId: file.getId(),
        fileName: finalName,
        url: `https://drive.google.com/uc?export=view&id=${file.getId()}`
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

// ============ GET HANDLER (LIST PHOTOS) ============
function doGet(e) {
  try {
    const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
    const photos = [];
    
    // Ambil semua file gambar
    const imageTypes = [MimeType.JPEG, MimeType.PNG, MimeType.GIF];
    
    imageTypes.forEach(function(mimeType) {
      const files = folder.getFilesByType(mimeType);
      while (files.hasNext()) {
        const file = files.next();
        photos.push({
          id: file.getId(),
          name: file.getName(),
          thumbnailLink: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w400',
          webContentLink: 'https://drive.google.com/uc?export=view&id=' + file.getId(),
          date: file.getDateCreated().getTime()
        });
      }
    });
    
    // Sort by date (newest first)
    photos.sort(function(a, b) {
      return b.date - a.date;
    });
    
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

// ============ GCS UPLOAD (OPTIONAL) ============
function uploadToGCS(fileName, fileBlob) {
  if (!CONFIG.SERVICE_ACCOUNT) {
    throw new Error('Service account not configured');
  }
  
  const objectName = `photos/${fileName}`;
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${CONFIG.GCS_BUCKET}/o?uploadType=media&name=${encodeURIComponent(objectName)}`;
  
  // Get OAuth token
  const token = getGCSAccessToken();
  
  // Upload to GCS
  const response = UrlFetchApp.fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': fileBlob.getContentType()
    },
    payload: fileBlob.getBytes(),
    muteHttpExceptions: true
  });
  
  if (response.getResponseCode() !== 200) {
    throw new Error(`GCS upload failed: ${response.getContentText()}`);
  }
  
  return response;
}

// ============ GET GCS ACCESS TOKEN ============
function getGCSAccessToken() {
  if (!CONFIG.SERVICE_ACCOUNT) {
    throw new Error('Service account not configured');
  }
  
  const sa = CONFIG.SERVICE_ACCOUNT;
  const now = Math.floor(Date.now() / 1000);
  
  // Create JWT
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/devstorage.read_write',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  
  // Sign JWT
  const jwt = createJWT(claim, sa.private_key);
  
  // Exchange JWT for access token
  const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    contentType: 'application/x-www-form-urlencoded',
    payload: {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    }
  });
  
  const data = JSON.parse(response.getContentText());
  return data.access_token;
}

// ============ CREATE JWT ============
function createJWT(claim, privateKey) {
  // Header
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };
  
  const headerEncoded = Utilities.base64EncodeWebSafe(JSON.stringify(header));
  const claimEncoded = Utilities.base64EncodeWebSafe(JSON.stringify(claim));
  const signatureInput = headerEncoded + '.' + claimEncoded;
  
  // Sign with RSA-SHA256
  const signature = Utilities.computeRsaSha256Signature(signatureInput, privateKey);
  const signatureEncoded = Utilities.base64EncodeWebSafe(signature);
  
  return signatureInput + '.' + signatureEncoded;
}

// ==========================================
// CARA SETUP:
// ==========================================
// 1. Copy script ini ke script.google.com
// 2. UNTUK GOOGLE DRIVE ONLY (recommended untuk mulai):
//    - Biarkan SERVICE_ACCOUNT: null
//    - Deploy langsung
//    
// 3. UNTUK ENABLE GCS (optional, advanced):
//    a. Buka GCP Console (console.cloud.google.com)
//    b. IAM & Admin → Service Accounts
//    c. Create Service Account
//    d. Grant role: "Storage Object Admin"
//    e. Create Key → JSON → Download
//    f. Copy isi JSON file
//    g. Paste ke SERVICE_ACCOUNT di atas
//    h. Deploy ulang
//
// 4. Deploy → New deployment
// 5. Execute as: Me
// 6. Who has access: Anyone
// 7. Copy URL → paste ke app.js CONFIG.SCRIPT_URL
