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
    const countDownDate = new Date("2026-04-18T08:00:00").getTime();
    
    const timer = setInterval(() => {
        const now = new Date().getTime();
        
        let allFinished = true; // assume all finished until proven otherwise
        const timers = document.querySelectorAll('.countdown-timer');
        
        timers.forEach(t => {
            let targetTime = countDownDate;
            const customDate = t.getAttribute('data-date');
            if (customDate) {
                targetTime = new Date(customDate).getTime();
            }
            
            const distance = targetTime - now;

            if (distance < 0) {
                t.innerHTML = "<h3 style='font-size:0.9rem; color:#fff;'>Acara Sedang Berlangsung / Selesai</h3>";
            } else {
                allFinished = false; // at least one is still ticking
                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                const elDays = t.querySelector('.days');
                const elHours = t.querySelector('.hours');
                const elMinutes = t.querySelector('.minutes');
                const elSeconds = t.querySelector('.seconds');
                
                if (elDays) elDays.innerText = days < 10 ? "0" + days : days;
                if (elHours) elHours.innerText = hours < 10 ? "0" + hours : hours;
                if (elMinutes) elMinutes.innerText = minutes < 10 ? "0" + minutes : minutes;
                if (elSeconds) elSeconds.innerText = seconds < 10 ? "0" + seconds : seconds;
            }
        });
        
        // Stop the main interval if everything on the page is finished
        if (timers.length > 0 && allFinished) {
            clearInterval(timer);
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

    // Fungsi menghitung dan menampilkan jumlah kehadiran
    function updateAttendeeCount(wishesData) {
        let hadir = 0;
        let tidak = 0;
        wishesData.forEach(w => {
            if (w.attendance === "Hadir") hadir++;
            else tidak++;
        });
        const elHadir = document.getElementById('count-hadir');
        const elTidak = document.getElementById('count-tidak-hadir');
        if (elHadir) elHadir.innerText = hadir;
        if (elTidak) elTidak.innerText = tidak;
    }

    // Fungsi memuat data
    async function loadWishes() {
        wishesContainer.innerHTML = ''; // Bersihkan teks loading

        try {
            // Coba ambil dari Server Node.js / API jika dijalankan di server
            const response = await fetch('/api/wishes');
            if (response.ok) {
                const wishes = await response.json();
                updateAttendeeCount(wishes);
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
            updateAttendeeCount(localWishes);
            
            if (localWishes.length === 0) {
                // Tampilkan data dummy jika masih kosong sama sekali di LocalStorage
                let dummy = [{
                    name: "Budi & Keluarga",
                    attendance: "Hadir",
                    message: "Selamat menempuh hidup baru Ilham dan Silva! Semoga samawa."
                }];
                updateAttendeeCount(dummy);
                addToUI(dummy[0]);
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
            
            // Re-fetch hitungan baru untuk konsistensi
            const resData = await fetch('/api/wishes');
            if (resData.ok) {
                const updatedWishes = await resData.json();
                updateAttendeeCount(updatedWishes);
            }
        } catch (err) {
            // Jika tidak ada server, simpan sementara ke file JSON local storage browser
            const localWishes = JSON.parse(localStorage.getItem('wishes') || '[]');
            localWishes.push(newWish);
            localStorage.setItem('wishes', JSON.stringify(localWishes));
            updateAttendeeCount(localWishes); // Update count di localStorage fallback
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

