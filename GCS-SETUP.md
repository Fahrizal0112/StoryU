# Setup Google Cloud Storage untuk Upload Foto

## 🎯 Keuntungan GCS:

- ✅ **No CORS issues** - Direct upload dari browser
- ✅ **Fast & Scalable** - Infrastructure Google
- ✅ **Signed URLs** - Secure upload tanpa expose credentials
- ✅ **99.999999999% durability**
- ✅ **Free tier**: 5GB storage, 1GB network egress/bulan

## 📋 Setup Steps:

### 1. Buat Google Cloud Project

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Klik **Create Project** atau pilih project existing
3. Catat **Project ID** Anda

### 2. Enable Cloud Storage API

1. Di Cloud Console, buka **APIs & Services** > **Library**
2. Search "**Cloud Storage API**"
3. Klik **Enable**

### 3. Buat Storage Bucket

1. Buka **Cloud Storage** > **Buckets**
2. Klik **Create Bucket**
3. Bucket name: `memory-photos-bucket` (atau nama lain, harus unique global)
4. Location: Pilih region terdekat (e.g., `asia-southeast2` untuk Jakarta)
5. Storage class: **Standard**
6. Access control: **Fine-grained**
7. Public access: **Allow public access** (untuk view foto)
8. Klik **Create**

### 4. Setup CORS untuk Bucket

Buka **Cloud Shell** di Cloud Console (icon >_ di top bar), jalankan:

```bash
cat > cors.json <<EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors.json gs://memory-photos-bucket
```

Ganti `memory-photos-bucket` dengan nama bucket Anda.

### 5. Buat Service Account

1. Buka **IAM & Admin** > **Service Accounts**
2. Klik **Create Service Account**
3. Name: `photo-uploader`
4. Role: **Storage Object Admin**
5. Klik **Done**
6. Klik service account yang baru dibuat
7. Tab **Keys** > **Add Key** > **Create new key**
8. Type: **JSON**
9. Download file JSON (simpan aman!)

### 6. Update Google Apps Script

Buka [script.google.com](https://script.google.com), tambahkan fungsi baru:

```javascript
// Paste Service Account credentials di sini
const SERVICE_ACCOUNT = {
  "type": "service_account",
  "project_id": "YOUR_PROJECT_ID",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "photo-uploader@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
};

const BUCKET_NAME = 'memory-photos-bucket';

// Generate signed URL for upload
function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getSignedUrl') {
    return getSignedUploadUrl(e.parameter.filename, e.parameter.contentType);
  } else if (action === 'listPhotos') {
    return listPhotosFromGCS();
  }
  
  // Default: return error
  return ContentService.createTextOutput(
    JSON.stringify({ error: 'Invalid action' })
  ).setMimeType(ContentService.MimeType.JSON);
}

function getSignedUploadUrl(filename, contentType) {
  try {
    const objectName = 'photos/' + Date.now() + '_' + filename;
    const expiration = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    
    // Create signed URL using service account
    const url = `https://storage.googleapis.com/${BUCKET_NAME}/${objectName}`;
    
    const stringToSign = `PUT\n\n${contentType}\n${expiration}\n/${BUCKET_NAME}/${objectName}`;
    
    const signature = Utilities.computeRsaSha256Signature(
      stringToSign,
      SERVICE_ACCOUNT.private_key
    );
    
    const signedUrl = `${url}?GoogleAccessId=${SERVICE_ACCOUNT.client_email}&Expires=${expiration}&Signature=${encodeURIComponent(Utilities.base64Encode(signature))}`;
    
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${objectName}`;
    
    return ContentService.createTextOutput(
      JSON.stringify({
        signedUrl: signedUrl,
        publicUrl: publicUrl,
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

function listPhotosFromGCS() {
  try {
    // Get OAuth token
    const token = getGCSAccessToken();
    
    const response = UrlFetchApp.fetch(
      `https://storage.googleapis.com/storage/v1/b/${BUCKET_NAME}/o?prefix=photos/`,
      {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      }
    );
    
    const data = JSON.parse(response.getContentText());
    const photos = (data.items || []).map(item => ({
      id: item.id,
      name: item.name.split('/').pop(),
      url: `https://storage.googleapis.com/${BUCKET_NAME}/${item.name}`,
      thumbnail: `https://storage.googleapis.com/${BUCKET_NAME}/${item.name}`,
      date: new Date(item.timeCreated).getTime()
    }));
    
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

function getGCSAccessToken() {
  const jwt = createJWT();
  
  const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    payload: {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    }
  });
  
  const data = JSON.parse(response.getContentText());
  return data.access_token;
}

function createJWT() {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };
  
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: SERVICE_ACCOUNT.client_email,
    scope: 'https://www.googleapis.com/auth/devstorage.read_only',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  
  const encodedHeader = Utilities.base64EncodeWebSafe(JSON.stringify(header));
  const encodedClaim = Utilities.base64EncodeWebSafe(JSON.stringify(claim));
  const signatureInput = encodedHeader + '.' + encodedClaim;
  
  const signature = Utilities.computeRsaSha256Signature(signatureInput, SERVICE_ACCOUNT.private_key);
  const encodedSignature = Utilities.base64EncodeWebSafe(signature);
  
  return signatureInput + '.' + encodedSignature;
}
```

### 7. Deploy Script

1. **Save** script
2. **Deploy** > **New deployment**
3. Type: **Web app**
4. Execute as: **Me**
5. Who has access: **Anyone**
6. **Deploy**

### 8. Update Website

Di `app.js`, ubah:
```javascript
const CONFIG = {
    GCS_BUCKET: 'memory-photos-bucket', // Nama bucket Anda
    SCRIPT_URL: 'URL_APPS_SCRIPT_ANDA',
    // ...
};
```

### 9. Test Upload!

1. Buka website dengan `?storage=gcs` di URL
2. Upload foto
3. Done!

## 💰 Biaya:

**Free Tier:**
- 5GB storage: FREE
- 1GB egress: FREE
- Upload: FREE (unlimited)

**Setelah Free Tier:**
- Storage: ~$0.02/GB/bulan
- Egress: $0.12/GB

Untuk website foto pribadi = **GRATIS** (jarang exceed 5GB & 1GB egress)

## 🔒 Security:

- ✅ Service Account credentials aman di Apps Script
- ✅ Signed URLs expire dalam 1 jam
- ✅ CORS restricted to your domain (optional)
- ✅ No API keys exposed to client

## 🎉 Selesai!

Upload foto langsung dari website tanpa CORS issue!
