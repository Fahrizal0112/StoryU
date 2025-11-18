# Website Kenang-kenangan ❤️

Website romantic untuk menyimpan kenangan bersama pacar dengan foto dari Google Drive.

## ✨ Fitur

- 📸 Gallery foto dari Google Drive
- 💕 Desain romantic dan responsive
- 🖼️ Modal view untuk foto full size
- ⚡ Lazy loading untuk performa optimal
- 📱 Mobile-friendly
- 🔄 Load more untuk foto tambahan

## 🚀 Cara Setup

### 1. Setup Google Drive

#### Opsi A: Menggunakan Google Drive API (Recommended)

1. **Buat folder di Google Drive** untuk menyimpan foto
2. **Bagikan folder**:
   - Klik kanan folder > "Share" atau "Bagikan"
   - Klik "Change to anyone with the link"
   - Pastikan set ke "Viewer" atau "Pembaca"
   - Copy link folder
3. **Ambil Folder ID** dari URL:
   - URL: `https://drive.google.com/drive/folders/1ABC123xyz`
   - Folder ID: `1ABC123xyz`

4. **Dapatkan Google API Key**:
   - Buka [Google Cloud Console](https://console.cloud.google.com/)
   - Buat project baru atau pilih existing project
   - Enable **Google Drive API**
   - Buat credentials > API Key
   - Copy API Key

5. **Edit file `app.js`**:
```javascript
const CONFIG = {
    FOLDER_ID: 'YOUR_FOLDER_ID_HERE',  // Paste Folder ID
    API_KEY: 'YOUR_API_KEY_HERE',       // Paste API Key
    INITIAL_LOAD: 12,
    LOAD_MORE_COUNT: 6
};
```

#### Opsi B: Menggunakan JSON Manual (Alternatif)

Jika tidak mau pakai API Key:

1. Upload foto ke Google Drive folder (tetap harus public)
2. Untuk setiap foto, klik kanan > "Get link" > Copy link
3. Extract photo ID dari link: `https://drive.google.com/file/d/PHOTO_ID_HERE/view`
4. Edit file `photos.json`:

```json
{
  "photos": [
    {
      "id": "1",
      "name": "Kenangan Pertama",
      "url": "https://drive.google.com/uc?export=view&id=PHOTO_ID_1"
    },
    {
      "id": "2",
      "name": "Kenangan Kedua",
      "url": "https://drive.google.com/uc?export=view&id=PHOTO_ID_2"
    }
  ]
}
```

5. Edit `app.js`, ganti di bagian `DOMContentLoaded`:

```javascript
window.addEventListener('DOMContentLoaded', () => {
    loadPhotosFromJSON();  // Ganti loadPhotos() dengan ini
    setupEventListeners();
});
```

### 2. Test Lokal

1. Buka `index.html` di browser
2. Atau gunakan Live Server di VS Code
3. Pastikan foto muncul dengan benar

### 3. Deploy ke Vercel

#### A. Via GitHub (Recommended)

1. **Push ke GitHub**:
```bash
git init
git add .
git commit -m "Initial commit - website kenangan"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git push -u origin main
```

2. **Deploy di Vercel**:
   - Buka [vercel.com](https://vercel.com)
   - Sign in dengan GitHub
   - Click "New Project"
   - Import repository Anda
   - Click "Deploy"
   - Tunggu sampai selesai
   - Copy URL website Anda!

#### B. Via Vercel CLI

1. **Install Vercel CLI**:
```bash
npm install -g vercel
```

2. **Login dan Deploy**:
```bash
vercel login
vercel
```

3. Ikuti prompt dan website akan di-deploy!

#### C. Via Drag & Drop

1. Buka [vercel.com/new](https://vercel.com/new)
2. Drag & drop folder project Anda
3. Click "Deploy"
4. Selesai!

## 📝 Cara Menambah Foto Baru

### Metode 1: Google Drive API
1. Upload foto baru ke folder Google Drive
2. Buka website + `?admin=true` (contoh: `https://yoursite.vercel.app?admin=true`)
3. Click tombol "🔄 Refresh Gallery"
4. Foto baru akan muncul otomatis!

### Metode 2: JSON Manual
1. Upload foto ke Google Drive
2. Get link dan extract photo ID
3. Edit `photos.json`, tambahkan entry baru
4. Commit dan push ke GitHub
5. Vercel akan auto-deploy update

## 🎨 Customisasi

### Ganti Warna
Edit `style.css` di bagian `:root`:
```css
:root {
    --primary-color: #ff6b9d;      /* Warna utama */
    --secondary-color: #ffc2d1;    /* Warna sekunder */
    --accent-color: #c44569;       /* Warna aksen */
}
```

### Ganti Text
Edit `index.html`:
- Title: `<title>Our Memories ❤️</title>`
- Heading: `<h1 class="main-title">Our Love Story ❤️</h1>`
- Deskripsi: Edit di section `intro-content`

### Tambah Musik Background (Opsional)
Tambahkan di `index.html` sebelum `</body>`:
```html
<audio autoplay loop>
    <source src="your-music.mp3" type="audio/mpeg">
</audio>
```

## 🔒 Privacy & Security

- Jangan share API Key ke public repository
- Gunakan environment variables untuk production:
  1. Di Vercel dashboard > Settings > Environment Variables
  2. Add: `GOOGLE_API_KEY` dan `FOLDER_ID`
  3. Update `app.js` untuk baca dari env variables

## ⚡ Tips

1. **Optimasi Foto**: Compress foto sebelum upload (gunakan TinyPNG.com)
2. **Nama File**: Gunakan nama yang berurutan (001.jpg, 002.jpg) untuk sorting
3. **Admin Mode**: Tambahkan `?admin=true` di URL untuk akses admin panel
4. **Custom Domain**: Di Vercel dashboard > Settings > Domains untuk custom domain

## 🐛 Troubleshooting

**Foto tidak muncul?**
- Cek folder Google Drive sudah public
- Cek Folder ID dan API Key sudah benar
- Buka Developer Console (F12) untuk lihat error

**Deploy gagal?**
- Pastikan semua file sudah di-commit
- Cek file `vercel.json` ada dan valid
- Cek Vercel deployment logs

**Load lama?**
- Compress foto
- Kurangi `INITIAL_LOAD` di `app.js`
- Enable lazy loading sudah aktif

## 💝 Selamat!

Website kenangan Anda siap! Semoga pacar Anda suka! ❤️

---

Made with 💕 for your special someone
