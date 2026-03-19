document.addEventListener('DOMContentLoaded', () => {
    // 1. Ambil Nama Tamu dari URL Parameter (?to=Sajid)
    const urlParams = new URLSearchParams(window.location.search);
    const guestName = urlParams.get('to') || "Tamu Undangan";
    
    document.getElementById('guest-name').innerText = guestName;
    document.getElementById('left-guest-name').innerText = guestName;

    // 2. Event Buka Undangan & Putar Musik
    const btnOpen = document.getElementById('btn-open');
    const coverOverlay = document.getElementById('cover-overlay');
    const mainContent = document.getElementById('main-content');
    const btnAudio = document.getElementById('btn-audio');
    let isPlaying = false;

    btnOpen.addEventListener('click', () => {
        // Hilangkan overlay
        coverOverlay.classList.add('opened');
        
        // Tampilkan konten utama
        mainContent.classList.remove('hideme');

        // Putar audio dari YouTube API
        if (typeof isYtReady !== 'undefined' && isYtReady && ytPlayer && ytPlayer.playVideo) {
            ytPlayer.playVideo();
            isPlaying = true;
            btnAudio.style.display = 'flex'; // Tampilkan icon audio melayang
        } else {
            // Jika internet pengguna lambat / YT belum siap dirender, tampilkan tombolnya saja
            btnAudio.style.display = 'flex';
            setTimeout(() => {
                if (typeof isYtReady !== 'undefined' && isYtReady && ytPlayer && ytPlayer.playVideo) {
                    ytPlayer.playVideo();
                    isPlaying = true;
                    btnAudio.classList.add('playing');
                }
            }, 2500);
        }
        
        // Timeout opsional untuk clean up cover overlay dari DOM setelah transisi
        setTimeout(() => {
            coverOverlay.style.display = 'none';
        }, 1000);
    });

    // Toggle Audio Player
    btnAudio.addEventListener('click', () => {
        if (typeof isYtReady !== 'undefined' && isYtReady && ytPlayer) {
            if (isPlaying) {
                ytPlayer.pauseVideo();
                btnAudio.classList.remove('playing');
            } else {
                ytPlayer.playVideo();
                btnAudio.classList.add('playing');
            }
            isPlaying = !isPlaying;
        }
    });

    // 3. Countdown Timer (Sesuaikan dengan tanggal acara)
    // Format: YYYY-MM-DDTHH:MM:SS (Tahun-Bulan-Tanggal T Jam:Menit:Detik)
    // Contoh untuk 20 Desember 2025 jam 09:00 pagi -> "2025-12-20T09:00:00"
    const countDownDate = new Date("2025-12-20T09:00:00").getTime();

    const timer = setInterval(() => {
        const now = new Date().getTime();
        const distance = countDownDate - now;

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        document.getElementById("days").innerText = days < 10 ? "0" + days : days;
        document.getElementById("hours").innerText = hours < 10 ? "0" + hours : hours;
        document.getElementById("minutes").innerText = minutes < 10 ? "0" + minutes : minutes;
        document.getElementById("seconds").innerText = seconds < 10 ? "0" + seconds : seconds;

        // Teks ketika waktu sudah habis
        if (distance < 0) {
            clearInterval(timer);
            document.getElementById("countdown").innerHTML = "<h3>Acara Sedang Berlangsung / Selesai</h3>";
        }
    }, 1000);

    // 4. Salin Nomor Rekening (Copy to Clipboard)
    const btnCopies = document.querySelectorAll('.btn-copy');
    btnCopies.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tempInput = document.createElement('input');
            const dataToCopy = btn.getAttribute('data-clipboard');
            
            tempInput.value = dataToCopy;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);

            // Ganti text sementara
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Tersalin!';
            btn.style.backgroundColor = '#d4af37';
            btn.style.color = '#333';
            
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.backgroundColor = 'transparent';
                btn.style.color = 'var(--text-dark)';
            }, 2000);
        });
    });

    // 5. Handling Form Ucapan (Local Storage / API Fallback)
    const rsvpForm = document.getElementById('rsvp-form');
    const wishesContainer = document.getElementById('wishes-container');

    // Fungsi menampilkan isi JSON ke Layar
    function addToUI(wish) {
        let attendClass = wish.attendance === "Hadir" ? "hadir" : "tidak-hadir";
        const wishHtml = `
            <div class="wish-item">
                <h4>${wish.name.replace(/</g, "&lt;")}</h4>
                <span class="badge ${attendClass}">${wish.attendance}</span>
                <p>${wish.message.replace(/</g, "&lt;")}</p>
            </div>
        `;
        wishesContainer.insertAdjacentHTML('beforeend', wishHtml);
    }

    // Fungsi memuat data
    async function loadWishes() {
        wishesContainer.innerHTML = ''; // Bersihkan teks loading

        try {
            // Coba ambil dari Server Node.js / API jika dijalankan di server
            const response = await fetch('/api/wishes');
            if (response.ok) {
                const wishes = await response.json();
                if (wishes.length === 0) {
                    wishesContainer.innerHTML = '<p style="text-align: center; color: #888;">Belum ada ucapan.</p>';
                    return;
                }
                wishes.reverse().forEach(wish => addToUI(wish));
                return;
            }
            throw new Error("Server not found");
        } catch (error) {
            // Jika gagal (dibuka dari file:/// lokal tanpa server), gunakan Browser LocalStorage
            const localWishes = JSON.parse(localStorage.getItem('wishes') || '[]');
            
            if (localWishes.length === 0) {
                // Tampilkan data dummy jika masih kosong sama sekali di LocalStorage
                addToUI({
                    name: "Budi & Keluarga",
                    attendance: "Hadir",
                    message: "Selamat menempuh hidup baru Ilham dan Silva! Semoga samawa."
                });
            } else {
                localWishes.reverse().forEach(wish => addToUI(wish));
            }
        }
    }

    // Muat data langsung saat website pertama kali dibuka
    loadWishes();

    // Fungsi mengirim data ucapan baru
    rsvpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nameVal = document.getElementById('name').value;
        const msgVal = document.getElementById('wish').value;
        const btnVal = rsvpForm.querySelector('button');
        const attendVal = document.getElementById('attendance').value;
        
        const newWish = {
            name: nameVal,
            message: msgVal,
            attendance: attendVal
        };

        // Buat dummy masuk ke layar paling atas
        wishesContainer.insertAdjacentHTML('afterbegin', `
            <div class="wish-item" style="animation: fadeIn 0.5s;">
                <h4>${newWish.name.replace(/</g, "&lt;")}</h4>
                <span class="badge ${newWish.attendance === "Hadir" ? "hadir" : "tidak-hadir"}">${newWish.attendance}</span>
                <p>${newWish.message.replace(/</g, "&lt;")}</p>
            </div>
        `);

        try {
            // Coba simpan ke API (Simpan permanen ke wishes.json di server)
            const res = await fetch('/api/wishes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newWish)
            });
            if (!res.ok) throw new Error("API failed");
        } catch (err) {
            // Jika tidak ada server, simpan sementara ke file JSON local storage browser
            const localWishes = JSON.parse(localStorage.getItem('wishes') || '[]');
            localWishes.push(newWish);
            localStorage.setItem('wishes', JSON.stringify(localWishes));
        }
        
        // Reset forms 
        rsvpForm.reset();
        
        // Animasi Teks terkirim hijau
        btnVal.innerText = "Terkirim!";
        btnVal.style.backgroundColor = "#28a745";
        btnVal.style.color = "#fff";
        btnVal.style.borderColor = "#28a745";

        setTimeout(() => {
            btnVal.innerText = "Kirim Ucapan";
            btnVal.style.backgroundColor = "var(--primary)";
            btnVal.style.color = "var(--text-light)";
            btnVal.style.borderColor = "var(--accent)";
        }, 3000);
    });
});

