# Setup Google Apps Script untuk Load Foto Otomatis

## 🎯 Cara Kerja
Google Apps Script akan menjadi "backend" yang mengambil daftar foto dari folder Google Drive Anda, lalu website akan fetch data dari script ini.

## 📝 Langkah-langkah Setup (5 menit!)

### 1. Buat Google Apps Script

1. Buka: https://script.google.com/
2. Klik **"New Project"**
3. Hapus kode default, copy-paste kode di bawah ini:

```javascript
function doGet(e) {
  // Ganti dengan Folder ID Anda
  const FOLDER_ID = '1E3RWMKJReThOjNy-oVGRUpjiDPAWVEw8';
  
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const files = folder.getFilesByType(MimeType.JPEG);
    const photos = [];
    
    // Ambil semua file gambar
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
    
    // Ambil PNG juga
    const pngFiles = folder.getFilesByType(MimeType.PNG);
    while (pngFiles.hasNext()) {
      const file = pngFiles.next();
      photos.push({
        id: file.getId(),
        name: file.getName(),
        url: 'https://drive.google.com/uc?export=view&id=' + file.getId(),
        thumbnail: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w400',
        date: file.getDateCreated().getTime()
      });
    }
    
    // Sort by date (newest first)
    photos.sort((a, b) => b.date - a.date);
    
    // Return as JSON with CORS headers
    const output = ContentService.createTextOutput(
      JSON.stringify({ photos: photos, count: photos.length })
    );
    output.setMimeType(ContentService.MimeType.JSON);
    
    return output;
    
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. **Ganti FOLDER_ID** dengan ID folder Anda: `1E3RWMKJReThOjNy-oVGRUpjiDPAWVEw8`
5. Klik **"Save"** (ikon disk) - Beri nama: "Memory Gallery API"

### 2. Deploy Script

1. Klik **"Deploy"** > **"New deployment"**
2. Klik icon ⚙️ (gear) di samping "Select type"
3. Pilih **"Web app"**
4. Setting:
   - **Description**: Memory Gallery API
   - **Execute as**: Me (email Anda)
   - **Who has access**: **Anyone** ← PENTING!
5. Klik **"Deploy"**
6. Klik **"Authorize access"** > Pilih akun Google Anda
7. Klik **"Advanced"** > **"Go to Memory Gallery API (unsafe)"** > **"Allow"**
8. **COPY URL** yang muncul (seperti: `https://script.google.com/macros/s/AKfycby.../exec`)

### 3. Update Website

Buka file `app.js` dan ganti bagian CONFIG:

```javascript
const CONFIG = {
    // Paste URL Google Apps Script Anda di sini
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycby.../exec',
    
    INITIAL_LOAD: 12,
    LOAD_MORE_COUNT: 6
};
```

### 4. Test!

1. Buka `index.html` di browser
2. Foto akan muncul otomatis!
3. **Upload foto baru ke folder** Google Drive → Refresh halaman → Langsung muncul! ✨

## 🎉 Keuntungan Metode Ini:

✅ **Tidak perlu API Key**
✅ **Foto otomatis update** dari folder
✅ **Tidak perlu edit JSON manual**
✅ **100% gratis**
✅ **Tidak ada limit** (selama dalam quota Google Apps Script)
✅ **Bisa tambah foto kapan saja** tanpa edit kode

## 🔄 Cara Tambah Foto Baru:

1. Upload foto ke folder Google Drive
2. Refresh website
3. Done! 🎉

## 🐛 Troubleshooting:

**Script error "Permission denied"**
- Pastikan setting "Who has access" = **Anyone**

**Foto tidak muncul**
- Cek folder ID sudah benar
- Pastikan folder berisi file gambar (JPG/PNG)
- Cek Console (F12) untuk error

**Ingin update script**
- Edit kode di script.google.com
- Klik Deploy > Manage deployments > Edit > Deploy

## 💡 Tips:

- Beri nama foto dengan angka (001.jpg, 002.jpg) agar urut
- Compress foto sebelum upload untuk loading lebih cepat
- Script bisa di-customize untuk filter, sorting, dll
