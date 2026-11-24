/* =====================================================================
   AKSES — penjaga aplikasi Hub (Resi Print, Resi Video Packing,
   Resi Pickup Kurir, Layout Stiker).
   Dipasang paling atas di <head>:
     <script src="akses.js" data-app="app_resi_print"></script>
   Membaca login Positif POS di perangkat ini. Kalau belum masuk atau akun
   tidak punya izin aplikasi tersebut, halaman tidak dimuat dan muncul pesan.
   Izin diatur di Positif POS > Pengaturan > Pengguna / Peran.
   ===================================================================== */
(function () {
  var s = document.currentScript, app = s && s.getAttribute('data-app'), cred = null, me = null;
  try { cred = JSON.parse(localStorage.getItem('positif_cred') || sessionStorage.getItem('positif_cred') || 'null'); } catch (e) { }
  try { me = JSON.parse(localStorage.getItem('positif_me') || 'null'); } catch (e) { }
  var masuk = !!(cred && cred.u && cred.t && me && me.u === cred.u);
  if (masuk && (me.role === 'admin' || me.role === 'owner' || (me.perm || []).indexOf(app) >= 0)) return;
  var pesan = masuk ? 'Akun <b>' + String(me.name || me.u).replace(/[<>&]/g, '') + '</b> tidak punya akses ke aplikasi ini. Minta Owner mengaturnya di Positif POS → Pengaturan.'
    : 'Masuk dulu ke Positif POS. Setelah itu aplikasi ini bisa dibuka.';
  try { window.stop(); } catch (e) { }
  var tampil = function () {
    document.documentElement.innerHTML = '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tidak ada akses</title>' +
      '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;box-sizing:border-box;background:#060606;color:#f4f4f2;font:16px Barlow,system-ui,sans-serif}' +
      '.k{width:min(380px,100%);text-align:center;padding:28px 24px;border-radius:22px;background:#0f0f0f;border:1.5px solid rgba(212,255,63,.5);box-shadow:0 0 44px -14px rgba(212,255,63,.55)}' +
      '.k img{width:70%;margin:0 auto 14px;display:block}.k p{margin:0 0 18px;color:#c9c9c4;line-height:1.5}.k b{color:#f4f4f2}' +
      '.k a{display:block;padding:12px;border-radius:12px;background:#d4ff3f;color:#0a0a0a;font-weight:700;text-decoration:none}</style></head>' +
      '<body><div class="k"><img src="logo-positif.png" alt="Positif"><p>' + pesan + '</p><a href="index.html">Kembali ke Positif POS</a></div></body>';
  };
  setTimeout(tampil, 0);
})();
