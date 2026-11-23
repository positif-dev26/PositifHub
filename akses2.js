/* =====================================================================
   AKSES — penjaga aplikasi Hub (Resi Print, Resi Video Packing,
   Resi Pickup Kurir, Layout Stiker).
   Dipasang paling atas di <head>:
     <script src="akses.js" data-app="app_resi_print"></script>
   Membaca login sistem baru (akun.html) di perangkat ini. Kalau belum masuk atau akun
   tidak punya izin aplikasi tersebut, halaman tidak dimuat dan muncul pesan.
   Izin diatur di halaman Akun.
   ===================================================================== */
(function () {
  var s = document.currentScript, app = s && s.getAttribute('data-app'), cred = null, me = null;
  try { cred = localStorage.getItem('positif2_token') || null; } catch (e) { }
  try { me = JSON.parse(localStorage.getItem('positif2_me') || 'null'); } catch (e) { }
  var masuk = !!(cred && me && me.username);
  if (masuk && (me.role === 'admin' || (me.perms || me.perm || []).indexOf(app) >= 0)) { try { sessionStorage.removeItem('positif2_cek'); } catch (e) { } return; }
  var pesan = masuk ? 'Akun <b>' + String(me.name || me.username).replace(/[<>&]/g, '') + '</b> tidak punya akses ke aplikasi ini. Minta Owner mengaturnya di halaman Akun → Pengguna.'
    : 'Masuk dulu. Setelah itu aplikasi ini bisa dibuka.';
  /* izin di perangkat bisa usang: tanya server dulu sebelum menolak (sekali saja, anti-loop) */
  if (cred && !sessionStorage.getItem('positif2_cek')) {
    try { sessionStorage.setItem('positif2_cek', '1'); } catch (e) { }
    fetch('https://positif-api.positifmerch-blt.workers.dev/api/me', { headers: { Authorization: 'Bearer ' + cred } })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.ok && j.me) { localStorage.setItem('positif2_me', JSON.stringify(j.me)); location.reload(); } })
      .catch(function () { });
  }
  try { window.stop(); } catch (e) { }
  var tampil = function () {
    document.documentElement.innerHTML = '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tidak ada akses</title>' +
      '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;box-sizing:border-box;background:#060606;color:#f4f4f2;font:16px Barlow,system-ui,sans-serif}' +
      '.k{width:min(380px,100%);text-align:center;padding:28px 24px;border-radius:22px;background:#0f0f0f;border:1.5px solid rgba(212,255,63,.5);box-shadow:0 0 44px -14px rgba(212,255,63,.55)}' +
      '.k img{width:70%;margin:0 auto 14px;display:block}.k p{margin:0 0 18px;color:#c9c9c4;line-height:1.5}.k b{color:#f4f4f2}' +
      '.k a{display:block;padding:12px;border-radius:12px;background:#d4ff3f;color:#0a0a0a;font-weight:700;text-decoration:none}</style></head>' +
      '<body><div class="k"><img src="logo-positif.png" alt="Positif"><p>' + pesan + '</p><p style="font-size:12px;color:#777;margin:-8px 0 16px">akses2 v3 &middot; butuh: ' + app + ' &middot; peran: ' + (me ? String(me.role).replace(/[<>&]/g, '') : '-') + ' &middot; jumlah izin: ' + (me && me.perms ? me.perms.length : 0) + '</p><a href="akun.html">Ke halaman Masuk</a></div></body>';
  };
  setTimeout(tampil, 0);
})();
