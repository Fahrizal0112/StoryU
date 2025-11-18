# Setup GCS Bucket untuk Upload & Download

## Step 1: Install Google Cloud CLI
```bash
# Download dari: https://cloud.google.com/sdk/docs/install
# Atau pakai Cloud Shell di console.cloud.google.com
```

## Step 2: Login & Set Project
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

## Step 3: Buat Bucket (kalau belum ada)
```bash
gsutil mb -c STANDARD -l us-east1 gs://devsync_buckets
```

## Step 4: Set Public Access (READ)
```bash
# Buat bucket publicly readable
gsutil iam ch allUsers:objectViewer gs://devsync_buckets
```

## Step 5: Set CORS Configuration
Buat file `cors.json`:
```json
[
  {
    "origin": ["http://localhost:8000", "https://your-domain.vercel.app"],
    "method": ["GET", "HEAD", "POST", "PUT"],
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
    "maxAgeSeconds": 3600
  }
]
```

Apply CORS:
```bash
gsutil cors set cors.json gs://devsync_buckets
```

## Step 6: TEMPORARY - Enable Public Write (HANYA UNTUK TESTING!)
⚠️ **BAHAYA**: Ini membuat bucket bisa diupload siapa saja!

```bash
# Grant public write access (TEMPORARY!)
gsutil iam ch allUsers:objectCreator gs://devsync_buckets
```

## Step 7: Test Upload dari Browser
Buka http://localhost:8000 dan coba upload foto.

---

## PRODUCTION SETUP (Setelah testing berhasil)

### Remove Public Write Access:
```bash
gsutil iam ch -d allUsers:objectCreator gs://devsync_buckets
```

### Setup Signed URLs dengan Service Account:
1. Create Service Account di GCP Console
2. Grant role: "Storage Object Admin"
3. Download JSON key
4. Implement backend (Node.js/Python/Go) untuk generate signed URLs
5. Deploy backend ke Vercel/Cloud Functions
6. Update app.js untuk request signed URL dari backend

---

## Verify Setup
```bash
# Check IAM permissions
gsutil iam get gs://devsync_buckets

# Check CORS
gsutil cors get gs://devsync_buckets

# List files
gsutil ls gs://devsync_buckets/photos/
```

## Cost Estimate
- Storage: $0.02/GB/month
- Bandwidth keluar: $0.12/GB
- API Requests: Hampir gratis
- **Total untuk personal use: ~$1-2/month**
