/* =====================================================================
   POSBAR — menu atas Positif POS untuk aplikasi terpisah
   (Stok Bahan Baku, Rekap Order Custom). Memakai login Positif POS yang
   sudah tersimpan di perangkat, jadi tidak perlu login lagi.
   Pasang di <head>:  <script src="posbar.js"></script>
   Lalu di awal script aplikasi:  POSBAR.mount({active:'bahan'})
   Kalau menu POS berubah, samakan daftar MENU di bawah dengan inti.js (navH).
   ===================================================================== */
(function () {
  var POS_API = 'https://script.google.com/macros/s/AKfycbwUEqf4lS9mn3Gdyo3vpDmTl3u9gxQzIEIf83dJMeopMDDQpHu_-pcG9puoPFHfMOOBkA/exec';
  var LOGO = 'logo-positif.png';
  var ICO = {
    receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
    chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    factory: '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/>',
    clipboard: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
    rekap: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="m9 14 2 2 4-4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    sticker: '<path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>'
  };
  var ic = function (n) { return '<svg class="pb-ico" viewBox="0 0 24 24" aria-hidden="true">' + (ICO[n] || '') + '</svg>'; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  function cred() {
    var v = ''; try { v = localStorage.getItem('positif_cred') || sessionStorage.getItem('positif_cred') || ''; } catch (e) { }
    try { var o = JSON.parse(v); return o && o.u && o.t ? { u: o.u, t: o.t } : null; } catch (e) { return null; }
  }
  function me() {
    var c = cred(); if (!c) return null;
    try { var m = JSON.parse(localStorage.getItem('positif_me') || 'null'); if (m && m.u === c.u) return m; } catch (e) { }
    return { u: c.u, name: c.u, role: '', perm: [] };
  }
  function can(k) { var m = me(); return !!m && (m.role === 'admin' || (m.perm || []).indexOf(k) >= 0); }
  function any(a) { for (var i = 0; i < a.length; i++) if (can(a[i])) return true; return false; }

  /* menu utama: [kunci, ikon, label, file, boleh dibuka?] — samakan dengan inti.js */
  function MENU() {
    var jual = can('riwayat') ? 'penjualan.html#riwayat' : 'penjualan.html#laporan';
    return [
      ['kasir', 'receipt', 'Kasir', 'kasir.html', can('kasir')],
      ['penjualan', 'chart', 'Penjualan', jual, any(['riwayat', 'laporan'])],
      ['produk', 'box', 'Produk', 'produk.html', any(['produk_edit', 'harga_edit', 'stok_ubah', 'kasir'])],
      ['bahan', 'layers', 'Stok bahan baku', 'stok-bahan-baku-v9.html', !!me()],
      ['produksi', 'factory', 'Produksi', 'produksi.html', any(['prod_lihat', 'prod_buat'])],
      ['pesanan', 'clipboard', 'Pesanan custom', 'pesanan-custom.html', !!me() && (me().role === 'admin' || me().role === 'supervisor')],
      ['rekap', 'rekap', 'Rekap order', 'rekap-order-custom.html', any(['rekap_kedawung', 'rekap_wonodadi'])],
      ['kinerja', 'users', 'Gaji & kinerja', 'kinerja.html', any(['kinerja_input', 'kinerja_cek', 'kinerja_gaji'])]
    ];
  }
  var HUB = [['Resi Print', 'resi_print.html', 'app_resi_print'], ['Resi Video Packing', 'resi_video_packing.html', 'app_resi_video'], ['Resi Pickup Kurir', 'resi_pickup-kurir.html', 'app_resi_pickup']];

  var CSS = '' +
    '.pbar{position:sticky;top:0;z-index:60;display:flex;align-items:center;gap:10px;padding:8px 16px;min-height:60px;box-sizing:border-box;background:rgba(10,10,10,.92);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border-bottom:1px solid rgba(255,255,255,.08);color:#f4f4f2;font:15px/1.4 Barlow,system-ui,sans-serif}' +
    '.pbar *{box-sizing:border-box}' +
    '.pbar .pb-logo{display:block;flex:none;line-height:0}.pbar .pb-logo img{height:34px;display:block}' +
    '.pbar .pb-nav{display:flex;align-items:center;gap:6px;overflow-x:auto;scrollbar-width:none;margin-left:clamp(8px,3vw,48px);flex:1;min-width:0}.pbar .pb-nav::-webkit-scrollbar{display:none}' +
    '.pbar .pb-nv{display:inline-flex;align-items:center;gap:8px;padding:9px 12px;border-radius:12px;border:1px solid transparent;background:none;color:#8f8f8a;font:600 15px Barlow,sans-serif;text-decoration:none;white-space:nowrap;cursor:pointer;flex:none}' +
    '.pbar .pb-nv:hover{color:#f4f4f2;background:rgba(255,255,255,.07)}' +
    '.pbar .pb-nv .pb-nl{display:none}.pbar .pb-nv.on{background:#d4ff3f;color:#0a0a0a;box-shadow:0 0 24px -6px rgba(212,255,63,.7)}.pbar .pb-nv.on .pb-nl{display:inline}' +
    '.pbar .pb-hub{border:1px solid rgba(255,255,255,.12)}' +
    '.pbar .pb-ico{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none;display:block}' +
    '.pbar .pb-tools{display:flex;align-items:center;gap:8px;flex:none}' +
    '.pbar .pb-clk{margin-left:auto;font-size:13px;color:#8f8f8a;white-space:nowrap;font-variant-numeric:tabular-nums;flex:none}.pbar .pb-clk b{color:#f4f4f2;font-size:14px}' +
    '.pbar .pb-acc{flex:none;border:1px solid rgba(212,255,63,.35);background:#060606;color:#f4f4f2;font:600 14px Barlow,sans-serif;padding:6px 12px;border-radius:10px;cursor:pointer;white-space:nowrap}.pbar .pb-acc:hover{border-color:#d4ff3f}' +
    '.pb-menu{position:fixed;z-index:200;min-width:220px;padding:6px;background:#111;color:#f4f4f2;border:1px solid rgba(212,255,63,.5);border-radius:14px;box-shadow:0 0 30px -10px rgba(212,255,63,.5),0 20px 50px rgba(0,0,0,.6);display:none;font:15px Barlow,system-ui,sans-serif}' +
    '.pb-menu.on{display:block}.pb-menu .pb-h{padding:8px 10px 10px;border-bottom:1px solid rgba(255,255,255,.1);margin-bottom:4px}.pb-menu .pb-h b{display:block;font-size:16px}.pb-menu .pb-h span{font-size:13px;color:#8f8f8a}' +
    '.pb-menu a{display:flex;align-items:center;gap:12px;padding:10px;border-radius:10px;color:#f4f4f2;text-decoration:none;font-weight:600;cursor:pointer}.pb-menu a:hover{background:rgba(212,255,63,.1)}' +
    '.pb-menu a .pb-ico{width:19px;height:19px;fill:none;stroke:#d4ff3f;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.pb-menu a.dg,.pb-menu a.dg .pb-ico{color:#ff8a8a;stroke:#ff8a8a}' +
    '.pb-menu hr{border:0;border-top:1px solid rgba(255,255,255,.1);margin:4px 2px}' +
    '.pb-block{position:fixed;inset:0;z-index:300;display:grid;place-items:center;padding:20px;background:#060606;color:#f4f4f2;font:16px Barlow,system-ui,sans-serif}' +
    '.pb-block div{width:min(380px,100%);text-align:center;padding:28px 24px;border-radius:22px;background:#0f0f0f;border:1.5px solid rgba(212,255,63,.5);box-shadow:0 0 44px -14px rgba(212,255,63,.55)}' +
    '.pb-block img{width:70%;margin:0 auto 14px;display:block}.pb-block p{margin:0 0 18px;color:#c9c9c4}' +
    '.pb-block a{display:block;padding:12px;border-radius:12px;background:#d4ff3f;color:#0a0a0a;font-weight:700;text-decoration:none}' +
    '@media(max-width:860px){.pbar{flex-wrap:wrap;gap:6px 10px;padding:6px 10px}.pbar .pb-logo img{height:28px}.pbar .pb-nav{order:3;flex:1 0 100%;margin-left:0}.pbar .pb-clk .pb-cd{display:none}.pbar .pb-nv{padding:8px 11px}}';

  var HR = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'], BL = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function tick() {
    var e = document.getElementById('pbclk'); if (!e) return;
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    var v = '<span class="pb-cd">' + HR[d.getDay()] + ', ' + d.getDate() + ' ' + BL[d.getMonth()] + ' ' + d.getFullYear() + ' · </span><b>' + p(d.getHours()) + ':' + p(d.getMinutes()) + '</b>';
    if (e.innerHTML !== v) e.innerHTML = v;
  }
  function style() { if (document.getElementById('pbcss')) return; var s = document.createElement('style'); s.id = 'pbcss'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s); }

  var menuEl = null;
  function closeMenu() { if (menuEl) menuEl.classList.remove('on'); }
  function openMenu(anchor, html, right) {
    if (!menuEl) { menuEl = document.createElement('div'); menuEl.className = 'pb-menu'; document.body.appendChild(menuEl); }
    menuEl.innerHTML = html; menuEl.classList.add('on');
    var r = anchor.getBoundingClientRect(); menuEl.style.top = (r.bottom + 6) + 'px';
    var x = right ? r.right - menuEl.offsetWidth : r.left;
    menuEl.style.left = Math.max(6, Math.min(x, innerWidth - menuEl.offsetWidth - 6)) + 'px';
  }
  document.addEventListener('click', function (e) { if (!e.target.closest || (!e.target.closest('.pb-menu') && !e.target.closest('[data-pbm]'))) closeMenu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  addEventListener('resize', closeMenu);

  function logout() {
    var c = cred();
    if (c) { try { fetch(POS_API, { method: 'POST', body: JSON.stringify({ fn: 'logout', tok: c.t }) }).catch(function () { }); } catch (e) { } }
    try {
      localStorage.removeItem('positif_cred'); sessionStorage.removeItem('positif_cred'); localStorage.removeItem('positif_me');
      if (c) { var q = indexedDB.open('positif-pos', 1); q.onsuccess = function () { try { q.result.transaction('kv', 'readwrite').objectStore('kv').delete('snap:' + c.u); } catch (e) { } }; }
    } catch (e) { }
    setTimeout(function () { location.href = 'index.html'; }, 250);
  }

  function html(active) {
    var nav = MENU().filter(function (m) { return m[4]; }).map(function (m) {
      return '<a class="pb-nv' + (m[0] === active ? ' on' : '') + '" href="' + m[3] + '" title="' + m[2] + '" aria-label="' + m[2] + '">' + ic(m[1]) + '<span class="pb-nl">' + m[2] + '</span></a>';
    }).join('');
    if (HUB.some(function (h) { return can(h[2]); })) nav += '<button class="pb-nv pb-hub" data-pbm="hub" title="Aplikasi lain" aria-label="Aplikasi lain">' + ic('grid') + '</button>';
    if (can('app_layout')) nav += '<a class="pb-nv" href="LAYOUT_STIKER.html" title="Layout Stiker" aria-label="Layout Stiker">' + ic('sticker') + '</a>';
    var m = me();
    return '<a class="pb-logo" href="index.html#beranda" title="Beranda"><img src="' + LOGO + '" alt="Positif"></a>' +
      '<nav class="pb-nav">' + nav + '</nav><span class="pb-clk" id="pbclk"></span><span class="pb-tools"></span>' +
      (m ? '<button class="pb-acc" data-pbm="acc">' + esc(m.name) + ' <span style="font-size:12px">&#9662;</span></button>' : '');
  }

  var POSBAR = {
    cred: cred, me: me, can: can, logout: logout,
    /* pasang menu atas. o.active = kunci menu yang menyala, o.replace = elemen yang diganti (opsional), o.tools = elemen yang dipindah ke kanan */
    mount: function (o) {
      o = o || {}; style();
      var bar = document.createElement('div'); bar.className = 'pbar noprint'; if (o.id) bar.id = o.id;
      bar.innerHTML = html(o.active);
      var old = o.replace && (typeof o.replace === 'string' ? document.querySelector(o.replace) : o.replace);
      var tools = (o.tools || []).map(function (t) { return typeof t === 'string' ? document.querySelector(t) : t; });
      if (old) old.parentNode.replaceChild(bar, old); else document.body.insertBefore(bar, document.body.firstChild);
      var tl = bar.querySelector('.pb-tools');
      tools.forEach(function (el) { if (el) tl.appendChild(el); });
      bar.addEventListener('click', function (e) {
        var b = e.target.closest('[data-pbm]'); if (!b) return; e.stopPropagation();
        if (menuEl && menuEl.classList.contains('on') && menuEl.dataset.k === b.dataset.pbm) { closeMenu(); return; }
        if (b.dataset.pbm === 'hub') openMenu(b, HUB.filter(function (h) { return can(h[2]); }).map(function (h) { return '<a href="' + h[1] + '">' + h[0] + '</a>'; }).join(''));
        else {
          var m = me(), RL = { admin: 'Admin', supervisor: 'Supervisor', staf: 'Staf' };
          openMenu(b, '<div class="pb-h"><b>' + esc(m.name) + '</b><span>' + (RL[m.role] || '') + ' · @' + esc(m.u) + '</span></div>' +
            '<a href="index.html?gantipin=1">' + ic('key') + 'Ganti PIN</a>' +
            (m.role === 'admin' || can('backup') ? '<a href="pengaturan.html">' + ic('settings') + 'Pengaturan</a>' : '') +
            '<hr><a class="dg" data-pbx="1">' + ic('logout') + 'Keluar</a>', true);
          menuEl.querySelector('[data-pbx]').onclick = logout;
        }
        menuEl.dataset.k = b.dataset.pbm;
      });
      var setH = function () { document.documentElement.style.setProperty('--pbh', bar.offsetHeight + 'px'); };
      setH(); try { new ResizeObserver(setH).observe(bar); } catch (e) { addEventListener('resize', setH); }
      tick(); setInterval(tick, 5000);
      return bar;
    },
    /* tampilkan layar "masuk dulu" bila belum login di Positif POS */
    block: function (msg) {
      style();
      var show = function () {
        var d = document.createElement('div'); d.className = 'pb-block';
        d.innerHTML = '<div><img src="' + LOGO + '" alt="Positif"><p>' + esc(msg || 'Masuk dulu ke Positif POS. Setelah itu aplikasi ini terbuka otomatis.') + '</p><a href="index.html">Buka Positif POS</a></div>';
        document.body.appendChild(d);
      };
      if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
    }
  };
  window.POSBAR = POSBAR;
})();
