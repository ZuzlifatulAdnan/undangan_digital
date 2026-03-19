const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const WISHES_FILE = path.join(__dirname, 'wishes.json');

// Mencegah error jika wishes.json belum ada
if (!fs.existsSync(WISHES_FILE)) {
    fs.writeFileSync(WISHES_FILE, JSON.stringify([]));
}

const server = http.createServer((req, res) => {
    // API GET: Ambil daftar ucapan dari file JSON
    if (req.method === 'GET' && req.url === '/api/wishes') {
        fs.readFile(WISHES_FILE, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error reading data file');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(data);
        });
        return;
    }

    // API POST: Simpan ucapan baru ke file JSON
    if (req.method === 'POST' && req.url === '/api/wishes') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const newWish = JSON.parse(body);
                fs.readFile(WISHES_FILE, 'utf8', (err, data) => {
                    let wishes = data ? JSON.parse(data) : [];
                    wishes.push(newWish);
                    
                    fs.writeFile(WISHES_FILE, JSON.stringify(wishes, null, 2), err => {
                        if (err) {
                            res.writeHead(500);
                            res.end('Error saving to file');
                            return;
                        }
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    });
                });
            } catch (e) {
                res.writeHead(400);
                res.end('Format JSON salah');
            }
        });
        return;
    }

    // Tampilkan / load index.html & asset lainnya (CSS/JS/Gambar)
    // Buang parameter URL jika ada (misal: ?to=Adnan) agar file tetap ditemukan
    const parsedUrl = req.url.split('?')[0];
    let filePath = path.join(__dirname, parsedUrl === '/' ? 'index.html' : parsedUrl);
    const extname = String(path.extname(filePath)).toLowerCase();
    
    // Konfigurasi tipe mime sesuai eksistensi gambar/css/js
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.jpeg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.mp3': 'audio/mpeg',
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code == 'ENOENT') {
                res.writeHead(404);
                res.end('TIDAK DITEMUKAN / 404');
            } else {
                res.writeHead(500);
                res.end('Error Sistem: ' + err.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });

});

server.listen(PORT, () => {
    console.log(`✅ Undangan Berjalan: Buka http://localhost:${PORT}/ di Browser Anda!`);
});
