/**
 * Modul Gudang Produksi untuk Positif POS (file Produksi.gs, terpisah dari Code.gs)
 * - v14: Pemotong — saat pindah ke Cutting, extras.pt = {id, nama} (karyawan HRD) dicatat di riwayat (pt, ptid).
 *        Workshop Kedawung: Jahit → Finishing hanya lewat setor jahit yang disetujui di Kinerja (PROD_VIA_ = 'setor',
 *        diisi oleh Kinerja.gs), atau oleh Owner/Admin dengan alasan wajib (tercatat manual: 1).
 *        Riwayat pindah Jahit → Finishing dan Kembalikan dari Jahit mencatat unit asal (pj) untuk rekap unit jahit.
 * - v13: Penjahit — saat pindah Cutting → Jahit, aplikasi bisa mengirim extras.pj = {id, nama} (karyawan HRD).
 *        Disimpan di order tahap Jahit (kolom pj = nama, pjid = id karyawan) dan di riwayat (pj, pjid).
 * - v12: Lini Kaos (Rencana → Cutting → Jahit → Finishing, tanpa Cetak vendor & Rak bahan) + makloon:
 *        barang di makloon (lokasi "mk:...") wajib diterima ke gudang saat dipindah ke Finishing.
 * - v11: Tambah barang langsung ke tahap Rak bahan–Finishing (Owner & Admin) — id '__tambah__'; penyebab wajib,
 *        keterangan opsional. Edit pesanan: keterangan kini opsional (cukup pilih penyebab).
 * - v10: Laporan AI — '__lapsimpan__' (Owner/Admin) menyimpan laporan pagi Manajer AI ke lembar "Laporan AI",
 *        '__lap__' (Owner/Admin) membaca 14 laporan terakhir untuk Beranda Kantor AI.
 * - v9: Edit pesanan (Owner & Admin): koreksi produk/ukuran dan jumlah di tahap mana pun sebelum masuk stok,
 *       penyebab + alasan wajib, tercatat di riwayat (kind 'edit').
 * - v8: Owner bisa menghapus (membatalkan) seluruh pesanan di tahap mana pun sebelum masuk stok; riwayat tetap tersimpan.
 * - v7: Manajer Produksi (AI) — hitung prioritas Cutting & Jahit dari stok, laku per hari dan batas aman,
 *       lalu terbitkan Google Doc "Lembar Kerja Produksi" siap cetak setiap pagi (pemicu waktu jam 6–7).
 *       id khusus '__lk__' (lihat hasil + link dokumen) dan '__lkbuat__' (terbitkan ulang sekarang).
 *       Jalankan pasangJadwalLembarKerja() SEKALI dari editor Apps Script untuk memasang jadwal pagi.
 * - v6: tahap Rencana (order cetak belum dikonfirmasi vendor, kolom rc=1) + konfirmasi cetak & estimasi
 *       (tanggal cetak, lama cetak, estimasi kirim, lama kirim, estimasi sampai)
 * - Pindah tahap penuh atau sebagian (sisa tetap di tahap yang sama)
 * - Terima dari vendor sebagian + reject vendor
 * - Reject dengan alasan + tindak lanjut: buang, atau perbaiki (kembali ke tahap tertentu)
 * - Kembalikan ke tahap sebelumnya / batalkan perpindahan (alasan wajib)
 * - Batalkan order (masih di vendor) & hapus permanen lewat server, dengan pemeriksaan tahap
 * - Kirim barang antar gudang produksi (di tahap yang sama)
 * - Tahap terakhir: stok varian di POS bertambah secara atomik (dan berkurang bila dikembalikan)
 * - Arsip order selesai/batal lama ke sheet "jobs_arsip" + pencarian arsip
 * Semua aksi tetap lewat fungsi jobAdvance_ (tidak perlu mengubah Code.gs).
 * Pemeriksaan tahap mencegah klik ganda / dua perangkat memproses dua kali.
 */
const STG_ = ['cetak', 'bahan', 'cutting', 'jahit', 'finishing', 'selesai'];
const PROD_V = 14; // versi modul; dipakai aplikasi untuk memastikan server sudah diperbarui
var PROD_VIA_ = ''; /* diisi Kinerja.gs ('setor') saat memindahkan setoran jahit yang disetujui; tidak bisa diisi dari aplikasi */
/** gudang Kedawung? (nama di lembar Data Gudang) */
function isKdw_(loc) { if (!loc) return false; const g = rows_('gudang').filter(function (r) { return String(r.id) === String(loc); })[0]; return /kedawung/i.test(String(g ? g.name : loc)); }

function arr_(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string' && v) { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (e) {} }
  return [];
}
function bump_() {
  const v = ver_() + 1;
  PropertiesService.getScriptProperties().setProperty('ver', String(v));
  SpreadsheetApp.flush();
  return {ver: v};
}
function newId_() { return String(Date.now()) + String(Math.floor(Math.random() * 1e6)); }
function sum_(items) { return items.reduce(function (s, it) { return s + (+it.qty || 0); }, 0); }
function lastDate_(r) {
  const h = arr_(r.hist);
  for (let k = h.length - 1; k >= 0; k--) if (h[k] && h[k].date) return String(h[k].date);
  return String(r.date || '');
}
/** petugas harus pengguna aktif yang punya akses tahap ini; kosong = akun yang sedang login */
function petugas_(u, by, stage) {
  if (!by) return u.name;
  const bl = by.toLowerCase();
  const t = u.all.filter(function (x) { return x.on && (x.user === bl || x.name.toLowerCase() === bl); })[0];
  if (!t || perm_(t, u.roles).indexOf('prod_' + stage) < 0) throw new Error('Petugas "' + by + '" tidak punya akses tahap ' + stage + '.');
  return t.name;
}

/**
 * a = [id order, tahap yang dilihat pengguna, nama petugas, catatan/alasan, {idVarian: reject}, extras]
 * extras:
 *   {done: {idVarian: jumlahJadi}, loc: idGudang, reason: alasanReject, fix: {to: tahap}}  pindah tahap (+ reject)
 *     + pj: {id, nama}  (v13) penjahit/unit, hanya dipakai saat pindah Cutting → Jahit
 *     + pt: {id, nama}  (v14) pemotong, hanya dipakai saat pindah ke Cutting
 *   {mode: 'send', to: idGudangTujuan, send: {idVarian: jumlah}}                          kirim antar gudang
 *   {mode: 'back', back: {idVarian: jumlah}}                                               kembalikan ke tahap sebelumnya
 *   {mode: 'cancel'}                                                                        batalkan order (di vendor: izin prod_buat; tahap lain: khusus Owner)
 *   {mode: 'edit', from: idVarianLama, vid: idVarianBaru, name, qty, cause}             koreksi produk/ukuran/jumlah (Owner & Admin)
 *   {mode: 'del'}                                                                           hapus permanen
 * id khusus: '__ping__', '__arsip__' (cari arsip), '__arsipkan__' (pindahkan ke arsip),
 *   '__konfirm__' extras {ids:[idOrder], tc, lc, ek, lk, es}: konfirmasi sudah dicetak di vendor / ubah estimasi
 */
function jobAdvance_(a, u) {
  const id = String(a[0]);
  if (id === '__ping__') return {v: PROD_V};
  if (id === '__arsip__') return arsipCari_(a[5] || {}, u);
  if (id === '__arsipkan__') return arsipkan_(a[5] || {}, u);
  if (id === '__konfirm__') return konfirm_(a[5] || {}, u);
  if (id === '__lk__') { need_(u, 'prod_lihat'); return lkStatus_(false); }
  if (id === '__tambah__') return tambah_(a[5] || {}, u);
  if (id === '__lap__') return lapBaca_(a[5] || {}, u);
  if (id === '__lapsimpan__') return lapSimpan_(a[5] || {}, u);
  if (id === '__lkbuat__') { need_(u, 'prod_buat'); return lkStatus_(true); }
  const expect = String(a[1] || ''), by = String(a[2] || '').trim().slice(0, 60),
    note = String(a[3] || '').slice(0, 200), rej = a[4] || {}, ex = a[5] || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const j = rows_('jobs').filter(function (r) { return r.id === id; })[0];
    if (!j) throw new Error('Order tidak ditemukan');
    if (expect !== j.stage) throw new Error('Tahap order sudah berubah di perangkat lain. Muat ulang halaman.');
    const now = new Date().toISOString();
    const items = arr_(j.items), hist = arr_(j.hist), rejs = arr_(j.rejs);
    const mode = String(ex.mode || '');
    if (mode === 'cancel') return batal_(j, hist, note, u, now);
    if (mode === 'edit') return edit_(j, items, hist, ex, note, u, now);
    if (mode === 'del') return hapus_(j, u);
    if (mode === 'back') return mundur_(j, items, hist, ex, note, u, now);

    const kr = j.stage === 'cetak' && +j.rc === 1 && isKaos_(j); /* Rencana lini Kaos: langsung ke Cutting */
    if (j.stage === 'cetak' && +j.rc === 1 && !kr) throw new Error('Order ini masih Rencana. Konfirmasi dulu bahwa sudah dicetak di vendor (menu Vendor).');
    const i = STG_.indexOf(j.stage);
    if (i < 0 || i >= STG_.length - 1) throw new Error('Order ini sudah selesai');
    const pst = kr ? 'cutting' : j.stage;
    need_(u, 'prod_' + pst);
    const who = petugas_(u, by, pst);
    if (mode === 'send') return send_(j, items, hist, ex, who, note, now, u);

    const nx = kr ? 'cutting' : STG_[i + 1];
    let loc = j.stage === 'cetak' ? (String(ex.loc || '').slice(0, 40) || j.loc || '') : (j.loc || '');
    if (String(loc).indexOf('mk:') === 0) { /* dari makloon: wajib diterima ke gudang */
      const g = String(ex.loc || '').slice(0, 40);
      if (!g || g.indexOf('mk:') === 0) throw new Error('Pilih workshop penerima barang dari makloon.');
      loc = g;
    }
    const reason = String(ex.reason || '').slice(0, 80);
    const fixTo = ex.fix && ex.fix.to ? String(ex.fix.to) : '';
    if (fixTo && (STG_.indexOf(fixTo) < 0 || STG_.indexOf(fixTo) > i)) throw new Error('Tahap perbaikan tidak valid.');
    const base = hist.slice();
    /* v13: penjahit (karyawan HRD) untuk barang yang masuk tahap Jahit */
    const pjN = nx === 'jahit' && ex.pj ? String(ex.pj.nama || '').trim().slice(0, 60) : '',
      pjI = pjN ? String(ex.pj.id || '').slice(0, 40) : '',
      pjT = pjN ? 'Penjahit: ' + pjN + '. ' : '';
    /* v14: pemotong (karyawan HRD) untuk barang yang masuk tahap Cutting */
    const ptN = nx === 'cutting' && ex.pt ? String(ex.pt.nama || '').trim().slice(0, 60) : '',
      ptI = ptN ? String(ex.pt.id || '').slice(0, 40) : '';
    /* v14: Kedawung, Jahit -> Finishing: lewat setor yang disetujui, atau Owner/Admin dengan alasan */
    let manual = 0;
    if (j.stage === 'jahit' && nx === 'finishing' && PROD_VIA_ !== 'setor' && isKdw_(j.loc)) {
      const adaJadi = ex.done ? Object.keys(ex.done).some(function (k) { return +ex.done[k] > 0; }) : true;
      if (adaJadi) {
        if (!isAdm_(u)) throw new Error('Di Workshop Kedawung, barang Jahit pindah ke Finishing lewat setor jahit yang disetujui supervisor (menu Kinerja). Pemindahan manual khusus Owner/Admin.');
        if (!String(note).trim()) throw new Error('Pindah manual Jahit → Finishing di Kedawung wajib diberi alasan (isi catatan).');
        manual = 1;
      }
    }
    const xt = function (he) { if (pjN) { he.pj = pjN; he.pjid = pjI; } if (ptN) { he.pt = ptN; he.ptid = ptI; } if (j.stage === 'jahit' && j.pj) he.pjFrom = String(j.pj); if (manual) he.manual = 1; if (PROD_VIA_) he.via = PROD_VIA_; return he; };
    const done = ex.done || null, mv = [], rm = [], fx = [];
    let dsum = 0, rsum = 0;
    items.forEach(function (it) {
      const q = +it.qty || 0, r = Math.min(q, Math.max(0, Math.floor(+rej[it.vid] || 0))),
        d = done ? Math.min(q - r, Math.max(0, Math.floor(+done[it.vid] || 0))) : q - r;
      if (r > 0) {
        rsum += r;
        rejs.push({stage: j.stage, vid: it.vid, name: it.name, qty: r, date: now, by: who, u: u.user, note: note,
          reason: reason, act: fixTo ? 'perbaiki' : 'buang', to: fixTo});
        if (fixTo) fx.push({vid: it.vid, name: it.name, qty: r});
      }
      dsum += d;
      if (d > 0) mv.push({vid: it.vid, name: it.name, qty: d});
      if (q - r - d > 0) rm.push({vid: it.vid, name: it.name, qty: q - r - d});
    });
    if (done && dsum === 0 && rsum === 0) throw new Error('Isi jumlah yang sudah jadi atau reject.');
    if (rsum > 0 && !reason) throw new Error('Alasan reject wajib diisi.');

    const ops = [], vops = [], lops = [];
    let parts = +j.parts || 0;
    const rjTxt = rsum ? 'Reject ' + rsum + ' pcs' + (reason ? ' (' + reason + ')' : '') + (fixTo ? ', diperbaiki di ' + fixTo : ', dibuang') + '. ' : '';
    if (dsum === 0) {
      if (!rm.length) {
        hist.push({stage: 'selesai', date: now, by: who, u: u.user, note: 'Seluruh jumlah reject. ' + rjTxt + note});
        ops.push({t: 'update', c: 'jobs', id: id, d: {stage: 'selesai', hist: hist, items: items.map(function (it) { return {vid: it.vid, name: it.name, qty: 0}; }), rejs: rejs}});
      } else {
        hist.push({stage: j.stage, date: now, by: who, u: u.user, kind: 'bagi', note: rjTxt + note});
        ops.push({t: 'update', c: 'jobs', id: id, d: {items: rm, hist: hist, rejs: rejs}});
      }
    } else if (!rm.length) {
      hist.push(xt({stage: nx, date: now, by: who, u: u.user, q: dsum, note: pjT + rjTxt + note}));
      const ud = {stage: nx, loc: loc, hist: hist, items: mv, rejs: rejs};
      if (pjN) { ud.pj = pjN; ud.pjid = pjI; } else if (nx === 'jahit' && j.pj) { ud.pj = ''; ud.pjid = ''; } /* jangan bawa unit lama */
      ops.push({t: 'update', c: 'jobs', id: id, d: ud});
    } else {
      parts++;
      const nh = base.slice();
      nh.push(xt({stage: nx, date: now, by: who, u: u.user, q: dsum, note: pjT + note}));
      hist.push({stage: j.stage, date: now, by: who, u: u.user, kind: 'bagi', note: 'Dipecah: ' + dsum + ' pcs lanjut ke ' + nx + '. ' + pjT + rjTxt + note});
      ops.push({t: 'update', c: 'jobs', id: id, d: {items: rm, hist: hist, rejs: rejs}});
      const nd = {no: j.no + '-p' + parts, grp: j.grp || '', date: j.date, due: j.due || '', stage: nx, vendor: j.vendor || '', loc: loc, items: mv, hist: nh, rejs: [], parts: 0, lini: j.lini || ''};
      if (pjN) { nd.pj = pjN; nd.pjid = pjI; }
      ops.push({t: 'set', c: 'jobs', id: newId_(), d: nd});
    }
    if (fx.length) {
      parts++;
      const fh = base.slice();
      fh.push({stage: fixTo, date: now, by: who, u: u.user, q: sum_(fx), fix: 1, note: 'Perbaikan reject dari ' + j.stage + (reason ? ' (' + reason + ')' : '') + '. ' + note});
      ops.push({t: 'set', c: 'jobs', id: newId_(), d: {no: j.no + '-p' + parts, grp: j.grp || '', date: j.date, due: j.due || '', stage: fixTo, vendor: j.vendor || '', loc: fixTo === 'cetak' ? (j.loc || '') : loc, items: fx, hist: fh, rejs: [], parts: 0, rc: fixTo === 'cetak' ? 1 : ''}});
    }
    ops[0].d.parts = parts;
    if (nx === 'selesai' && dsum > 0) {
      const vr = {};
      rows_('variants').forEach(function (r) { vr[r.id] = r; });
      mv.forEach(function (it, k) {
        const v = vr[String(it.vid)];
        if (v) {
          const b = +v.stock || 0;
          vops.push({t: 'update', c: 'variants', id: String(it.vid), d: {_d: it.qty}});
          lops.push({t: 'set', c: 'log', id: String(Date.now() * 1000 + k),
            d: {date: now, name: it.name, type: 'Tambah', before: b, after: b + it.qty,
                note: 'Produksi selesai ' + j.no + (rsum ? ' (reject ' + rsum + ')' : '') + ' oleh ' + who}});
        }
      });
    }
    applyColl_('jobs', ops);
    if (vops.length) { applyColl_('variants', vops); applyColl_('log', lops); }
    return bump_();
  } finally {
    lock.releaseLock();
  }
}

/** Kirim sebagian atau seluruh barang ke gudang lain pada tahap yang sama. */
function send_(j, items, hist, ex, who, note, now, u) {
  const to = String(ex.to || '').slice(0, 40), from = j.loc || '', send = ex.send || {};
  if (!to) throw new Error('Gudang tujuan kosong');
  if (to === from) throw new Error('Barang sudah berada di ' + to);
  if (j.stage === 'cetak') throw new Error('Barang masih di vendor, belum bisa dikirim antar gudang');
  const mv = [], rm = [];
  items.forEach(function (it) {
    const q = +it.qty || 0, s = Math.min(q, Math.max(0, Math.floor(+send[it.vid] || 0)));
    if (s > 0) mv.push({vid: it.vid, name: it.name, qty: s});
    if (q - s > 0) rm.push({vid: it.vid, name: it.name, qty: q - s});
  });
  if (!mv.length) throw new Error('Jumlah kirim kosong');
  const ent = {stage: j.stage, date: now, by: who, u: u.user, kind: 'kirim', note: 'Kirim ' + sum_(mv) + ' pcs dari ' + from + ' ke ' + to + (note ? ' (' + note + ')' : '')};
  const nh = hist.slice();
  nh.push(ent);
  if (!rm.length) {
    applyColl_('jobs', [{t: 'update', c: 'jobs', id: j.id, d: {loc: to, hist: nh}}]);
  } else {
    const parts = (+j.parts || 0) + 1;
    applyColl_('jobs', [
      {t: 'update', c: 'jobs', id: j.id, d: {items: rm, hist: nh, parts: parts}},
      {t: 'set', c: 'jobs', id: newId_(), d: {no: j.no + '-p' + parts, grp: j.grp || '', date: j.date, due: j.due || '', stage: j.stage, vendor: j.vendor || '', loc: to, items: mv, hist: nh, rejs: [], parts: 0}}
    ]);
  }
  return bump_();
}

/** Kembalikan barang ke tahap sebelumnya (sebagian/semua). Dari "Masuk stok": hanya yang boleh hapus + ubah stok, stok POS dikurangi. */
function mundur_(j, items, hist, ex, note, u, now) {
  const i = STG_.indexOf(j.stage);
  if (i <= 0) throw new Error('Barang masih di vendor, tidak bisa dikembalikan lagi.');
  if (!String(note).trim()) throw new Error('Alasan wajib diisi.');
  const selesai = j.stage === 'selesai';
  if (selesai) { need_(u, 'hapus'); need_(u, 'stok_ubah'); } else need_(u, 'prod_' + j.stage);
  const kb = j.stage === 'cutting' && isKaos_(j), to = kb ? 'cetak' : STG_[i - 1], back = ex.back || null, mv = [], rm = [];
  items.forEach(function (it) {
    const q = +it.qty || 0, b = back ? Math.min(q, Math.max(0, Math.floor(+back[it.vid] || 0))) : q;
    if (b > 0) mv.push({vid: it.vid, name: it.name, qty: b});
    if (q - b > 0) rm.push({vid: it.vid, name: it.name, qty: q - b});
  });
  if (!mv.length) throw new Error('Jumlah yang dikembalikan kosong.');
  const vops = [], lops = [];
  if (selesai) {
    const vr = {};
    rows_('variants').forEach(function (r) { vr[r.id] = r; });
    mv.forEach(function (it, k) {
      const v = vr[String(it.vid)];
      if (!v) return;
      const b = +v.stock || 0;
      if (b < it.qty) throw new Error('Stok ' + it.name + ' tinggal ' + b + ', tidak cukup untuk ditarik ' + it.qty + ' pcs.');
      vops.push({t: 'update', c: 'variants', id: String(it.vid), d: {_d: -it.qty}});
      lops.push({t: 'set', c: 'log', id: String(Date.now() * 1000 + k),
        d: {date: now, name: it.name, type: 'Kurang', before: b, after: b - it.qty,
            note: 'Produksi ' + j.no + ' dikembalikan ke finishing oleh ' + u.name + ': ' + note}});
    });
  }
  const ent = {stage: to, date: now, by: u.name, u: u.user, back: 1, from: j.stage, q: sum_(mv), note: 'Dikembalikan dari ' + j.stage + ': ' + note};
  if (j.stage === 'jahit' && j.pj) ent.pjFrom = String(j.pj); /* v14: rekap unit jahit */
  const ops = [];
  if (!rm.length) {
    hist.push(ent);
    ops.push({t: 'update', c: 'jobs', id: j.id, d: kb ? {stage: to, items: mv, hist: hist, rc: 1, lini: 'kaos'} : {stage: to, items: mv, hist: hist}});
  } else {
    const parts = (+j.parts || 0) + 1, nh = hist.slice();
    nh.push(ent);
    hist.push({stage: j.stage, date: now, by: u.name, u: u.user, kind: 'bagi', note: 'Dipecah: ' + sum_(mv) + ' pcs dikembalikan ke ' + to + '. ' + note});
    ops.push({t: 'update', c: 'jobs', id: j.id, d: {items: rm, hist: hist, parts: parts}});
    ops.push({t: 'set', c: 'jobs', id: newId_(), d: Object.assign({no: j.no + '-p' + parts, grp: j.grp || '', date: j.date, due: j.due || '', stage: to, vendor: j.vendor || '', loc: j.loc || '', items: mv, hist: nh, rejs: [], parts: 0}, kb ? {rc: 1, lini: 'kaos'} : {})});
  }
  applyColl_('jobs', ops);
  if (vops.length) { applyColl_('variants', vops); applyColl_('log', lops); }
  return bump_();
}

/** Batalkan order (tetap tersimpan di riwayat sebagai Dibatalkan).
 *  Masih di vendor: butuh izin prod_buat. Tahap lain (rak bahan s.d. finishing): khusus Owner (hapus lunak). */
function batal_(j, hist, note, u, now) {
  if (j.stage === 'selesai' || j.stage === 'batal') throw new Error('Order ini sudah ' + j.stage + '.');
  if (j.stage === 'cetak') need_(u, 'prod_buat');
  else if (!isOwner_(u)) throw new Error('Hanya Owner yang bisa menghapus pesanan yang sudah masuk produksi. Gunakan "Kembalikan".');
  hist.push({stage: 'batal', date: now, by: u.name, u: u.user, from: j.stage, note: (j.stage === 'cetak' ? 'Order dibatalkan' : 'Pesanan dihapus Owner dari tahap ' + j.stage) + (note ? ': ' + note : '')});
  applyColl_('jobs', [{t: 'update', c: 'jobs', id: j.id, d: {stage: 'batal', hist: hist}}]);
  return bump_();
}

/** Koreksi isi pesanan: ganti produk/ukuran dan/atau jumlah (sebelum masuk stok). Khusus Owner & Admin. */
function edit_(j, items, hist, ex, note, u, now) {
  if (!isAdm_(u)) throw new Error('Hanya Owner dan Admin yang bisa mengedit pesanan.');
  if (STG_.indexOf(j.stage) < 0 || j.stage === 'selesai') throw new Error('Pesanan yang sudah masuk stok tidak bisa diedit di sini. Koreksi lewat stok produk.');
  const cause = String(ex.cause || '').trim().slice(0, 40), why = String(note || '').trim();
  if (!cause) throw new Error('Penyebab koreksi wajib dipilih.');
  const from = String(ex.from || ''), to = String(ex.vid || ''), qty = Math.floor(+ex.qty);
  if (!(qty >= 0) || qty > 100000) throw new Error('Jumlah tidak valid.');
  const old = items.filter(function (it) { return String(it.vid) === from; })[0];
  if (!old) throw new Error('Barang ini sudah berubah di perangkat lain. Muat ulang halaman.');
  const vr = rows_('variants').filter(function (r) { return String(r.id) === to; })[0];
  if (!vr) throw new Error('Varian tujuan tidak ditemukan.');
  const name = String(ex.name || old.name).slice(0, 120), oq = +old.qty || 0;
  if (to === from && qty === oq) throw new Error('Tidak ada yang berubah.');
  const merge = to !== from && items.some(function (it) { return String(it.vid) === to; });
  let out = items.map(function (it) {
    const v = String(it.vid), q = +it.qty || 0;
    if (v === from) return merge ? null : {vid: isNaN(+to) ? to : +to, name: name, qty: qty};
    if (merge && v === to) return {vid: it.vid, name: it.name, qty: q + qty};
    return {vid: it.vid, name: it.name, qty: q};
  }).filter(Boolean);
  out = out.filter(function (it) { return it.qty > 0; });
  const txt = 'Koreksi: ' + old.name + ' ' + oq + ' pcs → ' + (to === from ? '' : name + ' ') + qty + ' pcs. Penyebab: ' + cause + '.' + (why ? ' ' + why : '');
  hist.push({stage: j.stage, date: now, by: u.name, u: u.user, kind: 'edit', from: from, to: to, q0: oq, q: qty, cause: cause, note: txt});
  const d = {items: out.length ? out : items.map(function (it) { return {vid: it.vid, name: it.name, qty: 0}; }), hist: hist};
  if (!out.length) { d.stage = 'batal'; hist.push({stage: 'batal', date: now, by: u.name, u: u.user, from: j.stage, note: 'Jumlah dikoreksi menjadi 0.'}); }
  applyColl_('jobs', [{t: 'update', c: 'jobs', id: j.id, d: d}]);
  return bump_();
}

/** Hapus permanen (riwayat ikut hilang). Order yang sudah masuk stok tidak bisa dihapus. */
function hapus_(j, u) {
  need_(u, 'hapus');
  if (j.stage === 'selesai') throw new Error('Order yang sudah masuk stok tidak bisa dihapus. Gunakan "Kembalikan".');
  applyColl_('jobs', [{t: 'delete', c: 'jobs', id: j.id}]);
  return bump_();
}

/* ======================= KONFIRMASI CETAK VENDOR (v6) ======================= */
/** Tandai order Rencana sudah dicetak di vendor (atau ubah estimasinya). Order lalu tampil di tahap Cetak vendor. */
function konfirm_(ex, u) {
  need_(u, 'prod_cetak');
  const ids = (Array.isArray(ex.ids) ? ex.ids : []).map(String).filter(Boolean).slice(0, 300);
  if (!ids.length) throw new Error('Pilih order yang sudah dicetak.');
  const dt = function (v) { v = String(v || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ''; };
  const hr = function (v) { return Math.max(0, Math.min(365, Math.floor(+v || 0))); };
  const tc = dt(ex.tc), ek = dt(ex.ek), es = dt(ex.es), lc = hr(ex.lc), lk = hr(ex.lk);
  if (!tc) throw new Error('Tanggal cetak wajib diisi.');
  if ((ek && ek < tc) || (es && ek && es < ek)) throw new Error('Urutan tanggal tidak masuk akal (cetak → kirim → sampai).');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const all = {}, now = new Date().toISOString(), ops = [];
    rows_('jobs').forEach(function (r) { all[r.id] = r; });
    ids.forEach(function (id) {
      const j = all[id];
      if (!j) throw new Error('Order tidak ditemukan. Muat ulang halaman.');
      if (j.stage !== 'cetak') throw new Error('Order ' + (j.no || id) + ' sudah tidak di vendor. Muat ulang halaman.');
      const hist = arr_(j.hist);
      hist.push({stage: 'cetak', date: now, by: u.name, u: u.user, kind: 'konfirm',
        note: (+j.rc === 1 ? 'Dikonfirmasi sudah dicetak' : 'Estimasi diubah') + ' · cetak ' + tc + (ek ? ' · kirim ' + ek : '') + (es ? ' · sampai ' + es : '')});
      ops.push({t: 'update', c: 'jobs', id: id, d: {rc: '', vtc: tc, vlc: lc, vek: ek, vlk: lk, ves: es, vby: u.name, vat: now, hist: hist}});
    });
    applyColl_('jobs', ops);
    return bump_();
  } finally {
    lock.releaseLock();
  }
}

/* ======================= ARSIP ======================= */
function arsipSheet_() {
  const ss = (typeof ss_ === 'function') ? ss_() : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Spreadsheet untuk arsip tidak ditemukan.');
  let sh = ss.getSheetByName('jobs_arsip');
  if (!sh) {
    sh = ss.insertSheet('jobs_arsip');
    sh.getRange(1, 1, 1, 6).setValues([['id', 'selesai', 'no', 'vendor', 'tahap', 'data']]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}
/** Pindahkan order Selesai/Batal yang lebih lama dari N bulan ke sheet jobs_arsip, supaya sinkron tetap ringan. */
function arsipkan_(ex, u) {
  need_(u, 'hapus');
  const bln = Math.max(1, Math.floor(+ex.bulan || 3));
  const batas = new Date(Date.now() - bln * 30 * 864e5).toISOString();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const old = rows_('jobs').filter(function (r) {
      return (r.stage === 'selesai' || r.stage === 'batal') && lastDate_(r) && lastDate_(r) < batas;
    });
    if (!old.length) return {n: 0, ver: ver_()};
    const sh = arsipSheet_();
    const rows = old.map(function (r) {
      const o = {};
      Object.keys(r).forEach(function (k) { o[k] = r[k]; });
      return [String(r.id), lastDate_(r), String(r.no || ''), String(r.vendor || ''), String(r.stage), JSON.stringify(o)];
    });
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, 6).setNumberFormat('@').setValues(rows);
    applyColl_('jobs', old.map(function (r) { return {t: 'delete', c: 'jobs', id: String(r.id)}; }));
    const b = bump_();
    b.n = old.length;
    return b;
  } finally {
    lock.releaseLock();
  }
}
/** Cari di arsip: {q, from, to, vendor} → maksimal 300 baris, terbaru dulu. */
function arsipCari_(ex, u) {
  need_(u, 'prod_lihat');
  const ss = (typeof ss_ === 'function') ? ss_() : SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss && ss.getSheetByName('jobs_arsip');
  if (!sh || sh.getLastRow() < 2) return {rows: []};
  const q = String(ex.q || '').toLowerCase(), from = String(ex.from || ''), to = String(ex.to || ''), vd = String(ex.vendor || '');
  const v = sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues();
  const out = [];
  for (let k = v.length - 1; k >= 0 && out.length < 300; k--) {
    const r = v[k], tgl = String(r[1]).slice(0, 10);
    if (from && tgl < from) continue;
    if (to && tgl > to) continue;
    if (vd && String(r[3]) !== vd) continue;
    if (q && String(r[5]).toLowerCase().indexOf(q) < 0) continue;
    try { out.push(JSON.parse(String(r[5]))); } catch (e) {}
  }
  return {rows: out};
}
/* ======================= MANAJER PRODUKSI (v7) =======================
   Tim Cutting mengerjakan isi RAK BAHAN, tim Jahit mengerjakan isi RAK CUTTING.
   Per varian:
     laku/hari   = jumlah terjual lewat kasir 30 hari terakhir / 30
     batas aman  = Target varian (kolom Target di menu Cetak) bila diisi,
                   kalau kosong = laku/hari × hari stok aman (Pengaturan produksi, bawaan 14), minimal batas menipis
     stok efektif= stok gudang + jumlah yang sudah lewat tahap ini (segera masuk stok)
     kekurangan  = batas aman − stok efektif
     kerjakan    = kekurangan dibulatkan ke atas per lusin, maksimal isi rak
   Prioritas: SEGERA  = stok efektif < batas menipis, atau cukup ≤ 3 hari
              PRIORITAS = masih di bawah batas aman
              NORMAL  = sudah aman (boleh dikerjakan setelah yang lain)
   Urutan: prioritas → paling cepat habis → paling lama di rak. */
const LK_RS_ = ['cetak', 'bahan', 'cutting', 'jahit', 'finishing'];
function obj_(v) { if (v && typeof v === 'object') return v; if (typeof v === 'string' && v) { try { const o = JSON.parse(v); return o && typeof o === 'object' ? o : {}; } catch (e) {} } return {}; }
function lkLastH_(j) { const h = arr_(j.hist); for (let k = h.length - 1; k >= 0; k--) if (h[k] && !h[k].kind) return h[k]; return h[0] || {date: j.date}; }
function lkDz_(n) { n = Math.max(0, Math.round(n)); const d = Math.floor(n / 12), r = n % 12; return (d ? d + ' lusin' : '') + (d && r ? ' ' : '') + ((r || !d) ? r + ' pcs' : ''); }
function lkSplit_(n) { const m = String(n).match(/^(.*\S)\s*\(([^()]*)\)\s*$/); return m ? {b: m[1], s: m[2]} : {b: String(n), s: ''}; }

function lkData_() {
  const jobs = rows_('jobs'), cfgJ = jobs.filter(function (r) { return String(r.id) === 'pcfg'; })[0] || {};
  const tgt = obj_(cfgJ.tgt), aman = Math.max(1, Math.floor(+cfgJ.aman || 14)), lim = obj_(cfgJ.lim);
  const cfg = rows_('cfg').filter(function (r) { return String(r.id) === 'main'; })[0] || {};
  const low = Math.max(1, +cfg.low || 10);
  const stock = {};
  rows_('variants').forEach(function (v) { stock[String(v.id)] = +v.stock || 0; });
  const d30 = Date.now() - 30 * 864e5, sold = {};
  rows_('sales').forEach(function (s) {
    const t = new Date(s.date).getTime();
    if (!(t > d30)) return;
    arr_(s.items).forEach(function (c) { const k = String(c.id); sold[k] = (sold[k] || 0) + (+c.qty || 0); });
  });
  const act = jobs.filter(function (j) {
    return String(j.id) !== 'pcfg' && LK_RS_.indexOf(String(j.stage)) >= 0 && !(String(j.stage) === 'cetak' && +j.rc === 1);
  });
  function team(src) {
    const down = LK_RS_.slice(LK_RS_.indexOf(src) + 1), dn = {}, m = {};
    act.forEach(function (j) {
      const items = arr_(j.items);
      if (down.indexOf(String(j.stage)) >= 0) items.forEach(function (i) { const k = String(i.vid); dn[k] = (dn[k] || 0) + (+i.qty || 0); });
      if (String(j.stage) !== src) return;
      const dt = String(lkLastH_(j).date || j.date || '');
      items.forEach(function (i) {
        const q = +i.qty || 0; if (q <= 0) return;
        const k = String(i.vid), o = m[k] = m[k] || {vid: k, name: String(i.name || ''), qty: 0, date: dt, nos: {}};
        o.qty += q; if (dt && dt < o.date) o.date = dt;
        o.nos[String(j.no || '').replace(/(-p\d+)+$/, '').replace(/^PRD-/, '')] = 1;
      });
    });
    const lm = +lim[src] || ({bahan: 3, cutting: 2})[src] || 99;
    return Object.keys(m).map(function (k) {
      const o = m[k], st = stock[k] || 0, pr = dn[k] || 0, ef = st + pr, daily = (sold[k] || 0) / 30;
      const own = tgt[k], safe = own !== undefined && own !== null && own !== '' ? Math.max(0, +own) : Math.max(low, Math.ceil(daily * aman));
      const hari = daily > 0 ? ef / daily : (ef < low ? 0 : 9999);
      const pri = (ef < low || hari <= 3) ? 1 : ef < safe ? 2 : 3;
      let need = Math.max(0, safe - ef);
      if (pri === 1 && need === 0) need = Math.ceil(daily * 7) || o.qty;
      const kerja = pri < 3 ? Math.min(o.qty, Math.ceil(need / 12) * 12) : 0;
      const age = o.date ? Math.floor((Date.now() - new Date(o.date).getTime()) / 864e5) : 0;
      const n = lkSplit_(o.name);
      return {vid: k, produk: n.b, ukuran: n.s || 'Standar', nos: Object.keys(o.nos).join(', '), rak: o.qty, kerja: kerja,
        stok: st, proses: pr, aman: safe, daily: Math.round(daily * 10) / 10, hari: hari >= 9999 ? null : Math.floor(hari),
        age: age, late: age >= lm, pri: pri};
    }).sort(function (a, b) {
      return a.pri - b.pri || (a.hari === null ? 9999 : a.hari) - (b.hari === null ? 9999 : b.hari) || b.age - a.age;
    });
  }
  return {at: new Date().toISOString(), low: low, aman: aman, cut: team('bahan'), jahit: team('cutting')};
}

function lkSum_(L) {
  return {produk: L.length, segera: L.filter(function (r) { return r.pri === 1; }).length,
    prioritas: L.filter(function (r) { return r.pri === 2; }).length,
    kerja: L.reduce(function (a, r) { return a + r.kerja; }, 0), rak: L.reduce(function (a, r) { return a + r.rak; }, 0)};
}

/** Terbitkan / perbarui Google Doc lembar kerja. Dipanggil pemicu waktu setiap pagi. */
function lembarKerjaPagi() {
  const D = lkData_(), P = PropertiesService.getScriptProperties();
  const tz = Session.getScriptTimeZone() || 'Asia/Jakarta';
  let doc = null;
  const id = P.getProperty('lk_doc');
  if (id) { try { doc = DocumentApp.openById(id); } catch (e) { doc = null; } }
  if (!doc) { doc = DocumentApp.create('Lembar Kerja Produksi Harian - Positif'); P.setProperty('lk_doc', doc.getId()); }
  const body = doc.getBody();
  body.clear();
  body.setPageWidth(842).setPageHeight(595).setMarginTop(24).setMarginBottom(24).setMarginLeft(24).setMarginRight(24);
  const tgl = Utilities.formatDate(new Date(), tz, 'EEEE, d MMMM yyyy'), jam = Utilities.formatDate(new Date(), tz, 'HH:mm');
  const PN = ['', 'SEGERA', 'PRIORITAS', 'NORMAL'];
  const head = ['No', 'Prioritas', 'Produk / No. order', 'Ukuran', 'Di rak', 'Kerjakan dulu', 'Stok', 'Batas aman', 'Laku/hari', 'Cukup', 'Lama di rak', 'Selesai (pcs)', 'Paraf'];
  const W = [24, 62, 160, 62, 56, 72, 40, 50, 46, 44, 46, 50, 82];
  function section(L, team, src, first) {
    const S = lkSum_(L);
    const h = first ? body.getParagraphs()[0] : body.appendParagraph('');
    h.setText('LEMBAR KERJA ' + team.toUpperCase());
    h.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    h.editAsText().setFontSize(18).setBold(true);
    body.appendParagraph(tgl + ' · data per ' + jam + ' WIB · PJ ' + team + ': ______________').editAsText().setFontSize(9).setBold(false);
    const sm = S.produk
      ? 'Isi ' + (src === 'bahan' ? 'rak bahan' : 'rak cutting') + ': ' + S.produk + ' produk (' + lkDz_(S.rak) + '). Kerjakan dulu ' + lkDz_(S.kerja) + ' (' + S.segera + ' SEGERA, ' + S.prioritas + ' PRIORITAS) supaya stok kembali ke batas aman. Kerjakan berurutan dari nomor 1.'
      : 'Rak kosong — tidak ada pekerjaan ' + team.toLowerCase() + ' saat ini.';
    body.appendParagraph(sm).editAsText().setFontSize(10.5).setBold(false);
    if (!L.length) return;
    const rows = [head].concat(L.map(function (r, i) {
      return [String(i + 1), PN[r.pri], r.produk + (r.nos ? '\n' + r.nos : ''), r.ukuran, lkDz_(r.rak), r.kerja ? lkDz_(r.kerja) : '–',
        String(r.stok) + (r.proses ? ' (+' + r.proses + ')' : ''), String(r.aman), r.daily ? String(r.daily).replace('.', ',') : '–',
        r.hari === null ? '–' : r.hari + ' hr', r.age + ' hr' + (r.late ? ' !' : ''), '', ''];
    }));
    const t = body.appendTable(rows);
    t.setBorderWidth(0.5);
    for (let c = 0; c < W.length; c++) t.setColumnWidth(c, W[c]);
    for (let r = 0; r < t.getNumRows(); r++) {
      const row = t.getRow(r);
      for (let c = 0; c < row.getNumCells(); c++) {
        const cell = row.getCell(c);
        cell.setPaddingTop(2).setPaddingBottom(2).setPaddingLeft(3).setPaddingRight(3);
        const tx = cell.editAsText(); tx.setFontSize(r === 0 ? 8 : 9).setBold(r === 0 || c === 1 || c === 5);
        if (r === 0) { cell.setBackgroundColor('#000000'); tx.setForegroundColor('#ffffff'); }
        else if (L[r - 1].pri === 1) cell.setBackgroundColor('#e6e6e6');
      }
    }
    body.appendParagraph('Stok (+n) = stok gudang ditambah jumlah yang sudah lewat tahap ini. Batas aman = Target varian di menu Cetak, atau laku/hari × ' + D.aman +
      ' hari (minimal ' + D.low + ' pcs). Cukup = perkiraan hari sampai stok habis. ! = lewat batas hari di rak.').editAsText().setFontSize(8).setBold(false);
    body.appendParagraph('Dibuat oleh: ______________        Diterima tim ' + team + ': ______________        Dicek sore: ______________').editAsText().setFontSize(9);
  }
  section(D.cut, 'Cutting', 'bahan', true);
  body.appendPageBreak();
  section(D.jahit, 'Jahit', 'cutting', false);
  doc.saveAndClose();
  const at = new Date().toISOString();
  P.setProperty('lk_at', at);
  P.setProperty('lk_sum', JSON.stringify({cut: lkSum_(D.cut), jahit: lkSum_(D.jahit)}));
  return {url: 'https://docs.google.com/document/d/' + P.getProperty('lk_doc') + '/edit', at: at};
}

/** Hasil Manajer Produksi untuk aplikasi (Desa AI & menu Produksi). buat=true: terbitkan ulang dokumen dulu. */
function lkStatus_(buat) {
  const P = PropertiesService.getScriptProperties();
  if (buat) lembarKerjaPagi();
  const D = lkData_(), id = P.getProperty('lk_doc');
  return {v: PROD_V, at: D.at, low: D.low, aman: D.aman,
    cut: {sum: lkSum_(D.cut), top: D.cut.slice(0, 8)}, jahit: {sum: lkSum_(D.jahit), top: D.jahit.slice(0, 8)},
    doc: id ? {url: 'https://docs.google.com/document/d/' + id + '/edit', at: P.getProperty('lk_at') || ''} : null,
    jadwal: ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'lembarKerjaPagi'; })};
}

/** JALANKAN SEKALI dari editor Apps Script: pasang jadwal setiap hari jam 6–7 pagi (zona waktu proyek), lalu terbitkan dokumen pertama. */
function pasangJadwalLembarKerja() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'lembarKerjaPagi') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('lembarKerjaPagi').timeBased().everyDays(1).atHour(6).create();
  const r = lembarKerjaPagi();
  Logger.log('Jadwal terpasang. Dokumen: ' + r.url);
  return r;
}

/* ======================= LAPORAN AI (v10) =======================
   Lembar "Laporan AI": Waktu | Karyawan | Judul | Ringkasan | Data (JSON) | Oleh
   Diisi oleh tugas terjadwal "Laporan pagi Positif" (lewat aplikasi, akun Owner/Admin). Dibaca Beranda Kantor AI. */
const LAP_HDR_ = ['Waktu', 'Karyawan', 'Judul', 'Ringkasan', 'Data (JSON)', 'Oleh'];
function lapSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName('Laporan AI');
  if (!sh) {
    sh = ss.insertSheet('Laporan AI');
    sh.getRange(1, 1, 1, LAP_HDR_.length).setValues([LAP_HDR_]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange(1, 1, sh.getMaxRows(), LAP_HDR_.length).setNumberFormat('@');
  }
  return sh;
}
function lapSimpan_(ex, u) {
  if (!isAdm_(u)) throw new Error('Hanya Owner dan Admin yang bisa menyimpan laporan AI.');
  const kar = String(ex.karyawan || 'lap').slice(0, 20), judul = String(ex.judul || '').slice(0, 120), isi = String(ex.ringkasan || '').slice(0, 4000);
  if (!isi) throw new Error('Ringkasan laporan kosong.');
  let data = '';
  try { data = ex.data ? JSON.stringify(ex.data).slice(0, 20000) : ''; } catch (e) {}
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = lapSheet_();
    sh.getRange(sh.getLastRow() + 1, 1, 1, LAP_HDR_.length).setValues([[new Date().toISOString(), kar, judul, isi, data, u.name]]);
    return {ok: true};
  } finally { lock.releaseLock(); }
}
function lapBaca_(ex, u) {
  if (!isAdm_(u)) throw new Error('Hanya Owner dan Admin yang bisa melihat laporan AI.');
  const sh = ss_().getSheetByName('Laporan AI');
  if (!sh || sh.getLastRow() < 2) return {rows: []};
  const n = Math.max(1, Math.min(60, Math.floor(+ex.n || 14))), lr = sh.getLastRow(), st = Math.max(2, lr - n + 1);
  const v = sh.getRange(st, 1, lr - st + 1, LAP_HDR_.length).getValues(), out = [];
  for (let k = v.length - 1; k >= 0; k--) {
    const r = v[k];
    if (ex.karyawan && String(r[1]) !== String(ex.karyawan)) continue;
    let d = null;
    try { d = r[4] ? JSON.parse(String(r[4])) : null; } catch (e) {}
    out.push({at: r[0] instanceof Date ? r[0].toISOString() : String(r[0]), karyawan: String(r[1]), judul: String(r[2]), ringkasan: String(r[3]), data: d, by: String(r[5])});
  }
  return {rows: out};
}

/* ======================= TAMBAH BARANG LANGSUNG KE TAHAP (v11) =======================
   Untuk barang yang fisiknya ada di rak tapi belum tercatat (mis. temuan audit). Khusus Owner & Admin.
   ex = {stage, loc, cause, items:[{vid, qty}]} ; a[3] (note) = keterangan opsional. */
const TAMBAH_ST_ = ['bahan', 'cutting', 'jahit', 'finishing'];
function tambah_(ex, u) {
  if (!isAdm_(u)) throw new Error('Hanya Owner dan Admin yang bisa menambah barang ke tahap produksi.');
  const stage = String(ex.stage || ''), loc = String(ex.loc || '').slice(0, 40), cause = String(ex.cause || '').trim().slice(0, 40), note = String(ex.note || '').trim().slice(0, 200);
  if (TAMBAH_ST_.indexOf(stage) < 0) throw new Error('Tambah barang hanya untuk tahap Rak bahan sampai Finishing.');
  if (!cause) throw new Error('Pilih penyebabnya.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const vr = {}, pr = {};
    rows_('products').forEach(function (p) { pr[String(p.id)] = p; });
    rows_('variants').forEach(function (v) { vr[String(v.id)] = v; });
    const items = [];
    (Array.isArray(ex.items) ? ex.items : []).slice(0, 60).forEach(function (it) {
      const v = vr[String(it.vid)], q = Math.floor(+it.qty);
      if (!v || !(q > 0) || q > 100000) return;
      const p = pr[String(v.pid)] || {}, sub = [v.color, v.size].filter(function (x) { return x && String(x).trim(); }).join(' ');
      const name = String(it.name || (String(p.name || 'Produk') + (sub ? ' (' + sub + ')' : ''))).slice(0, 120);
      const same = items.filter(function (x) { return String(x.vid) === String(v.id); })[0];
      if (same) same.qty += q; else items.push({vid: isNaN(+v.id) ? String(v.id) : +v.id, name: name, qty: q});
    });
    if (!items.length) throw new Error('Isi jumlah minimal satu ukuran.');
    const now = new Date().toISOString(), d = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyMMdd');
    const no = 'TMB-' + d + '-' + String(Math.floor(Math.random() * 9000) + 1000);
    const hist = [{stage: stage, date: now, by: u.name, u: u.user, q: sum_(items), add: 1, cause: cause,
      note: 'Ditambah langsung ke ' + stage + ' · ' + cause + (note ? ': ' + note : '')}];
    applyColl_('jobs', [{t: 'set', c: 'jobs', id: newId_(), d: {no: no, grp: no, date: now, due: '', stage: stage, vendor: '', loc: loc, items: items, hist: hist, rejs: [], parts: 0}}]);
    return bump_();
  } finally { lock.releaseLock(); }
}

/* ======================= LINI KAOS (v12) =======================
   Order lini Kaos ditandai lini='kaos' saat dibuat (menu Buat rencana potong). Order lama dikenali dari
   kategori produk: diatur di pengaturan produksi (kolom lini), bawaan kategori diawali "Jersey" = jersey, lainnya = kaos. */
function isKaos_(j) {
  if (String(j.lini || '') === 'kaos') return true;
  if (String(j.lini || '') === 'jersey') return false;
  try {
    const cfg = rows_('jobs').filter(function (r) { return String(r.id) === 'pcfg'; })[0] || {}, map = obj_(cfg.lini);
    const pr = {}, vr = {};
    rows_('products').forEach(function (p) { pr[String(p.id)] = p; });
    rows_('variants').forEach(function (v) { vr[String(v.id)] = v; });
    const its = arr_(j.items);
    return its.length > 0 && its.every(function (it) { const v = vr[String(it.vid)], p = v && pr[String(v.pid)]; return p && (map[p.cat] || (/^\s*jersey/i.test(String(p.cat || '')) ? 'jersey' : 'kaos')) === 'kaos'; });
  } catch (e) { return false; }
}