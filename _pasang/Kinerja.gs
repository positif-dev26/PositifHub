/**
 * Modul Gaji & Kinerja untuk Positif POS (file Kinerja.gs, satu project dengan Code.gs dan Produksi.gs) — versi 2
 *
 * v2 (Setoran jahit + persetujuan supervisor, per gudang):
 * - Setor JAHIT tidak langsung memindahkan barang: tercatat "tunggu" atas nama unit (mis. Tim Jahit Wonodadi).
 *   Supervisor gudang menyetujui (boleh ubah jumlah) -> barang baru pindah ke Finishing lewat jobAdvance_,
 *   sebagian bila hanya sebagian yang jadi (order dipecah otomatis oleh Produksi.gs). Tolak -> barang tetap di Jahit.
 * - Gudang per akun (Atur > Gudang per akun): HP / supervisor hanya melihat karyawan, barang, setoran gudangnya.
 *   Akun yang belum diatur memakai "gudang bawaan" (cfg.loc); Owner yang belum diatur melihat semua gudang.
 * - Karyawan punya kolom gudang (gud) dan unit. Order produksi tanpa gudang tidak tampil di HP yang dibatasi gudang.
 * - Setor POTONG tetap seperti v1 (langsung pindah ke Jahit).
 *
 * v3: JEMBATAN untuk server Positif HRD (spreadsheet terpisah). Data karyawan, setoran, jobdesk dan gaji
 *     kini disimpan server HRD. Server HRD memanggil aksi 'hrd*' di bawah dengan tiket login pengguna,
 *     jadi izin tetap diperiksa di sini. Aksi lama (load/setor/cek/...) tetap ada sebagai cadangan.
 *
 * - Karyawan gudang (bukan akun POS): nama, ID ceklok, bagian, jenis kerja, upah per jam, PIN 4 angka, target, jobdesk
 * - Setor hasil lewat HP area (akun POS khusus, mis. "HP Jahit"): karyawan pilih nama + PIN
 *     jahit / potong  -> barang langsung pindah tahap di menu Produksi atas nama karyawan (lewat jobAdvance_)
 *     hasil lain       -> dicatat, menunggu dicek kepala gudang (sablon, pilah, stiker, packing)
 * - Catat reject (QC oleh tim packing), centang tugas tetap, "sedang apa"
 * - Kepala gudang: cek hasil, putuskan rak reject, catatan disiplin
 * - Owner: rekap mingguan (Sabtu–Jumat) + gaji dari Excel ceklok, setujui & kunci
 *
 * v4 (unit jahit): hrdJobs {v:4} memisah barang Jahit per unit (kolom pj order, diisi menu Produksi);
 *     hrdMove {src} memindahkan dari jatah unit itu saja; hrdRekap = rekap unit jahit & pemotong per periode.
 *     Pindah lewat setoran ditandai PROD_VIA_ = 'setor' (Produksi.gs v14: Kedawung Jahit → Finishing hanya lewat setoran).
 *
 * Izin baru (tambahkan di PERMS Code.gs): kinerja_input, kinerja_cek, kinerja_gaji
 * Pintu masuk (tambahkan di switch api() Code.gs):  case 'kinerja': return kinerja_(a, u);
 * a = [aksi, data]
 */
const KJ_V = 4;
const KJ_SH = {
  kar: ['KJ Karyawan', ['id', 'cid', 'nama', 'bagian', 'kerja', 'hasil', 'satuan', 'area', 'upah', 'target', 'jobdesk', 'cek', 'pinh', 'on', 'urut', 'gud', 'unit']],
  akt: ['KJ Aktivitas', ['id', 'tgl', 'kid', 'jenis', 'data', 'status', 'oleh', 'dev', 'cekBy', 'cekAt']],
  gaji: ['KJ Gaji', ['id', 'status', 'data', 'by', 'at', 'okBy', 'okAt']]
};
const KJ_CFG_DEF = {
  loc: '',
  akun: {},
  poin: {'kaos polos': 1, 'kolor': 1, 'jersey': 1.5, 'jersey krah': 2},
  poinDef: 1,
  makan: 15000, batas: '08:15', penuh: 6, setengah: 5.5, jumBatas: '08:15', jumPenuh: 5.5, jumSetengah: 5,
  hadir: {6: 25000, 5: 18000, 4: 10000},
  kerja: {A: 20000, B: 12000, C: 0, D: 0},
  hasilTangga: [1, 0.9, 0.75, 0.5],
  mutuTangga: [1, 3, 5],
  telatMaks: 2, cekMin: 80,
  grade: {A: 9, B: 7, C: 5}
};
const KJ_KERJA = ['jahit', 'potong', 'hasil', 'qc'];
const KJ_KEG = ['Menunggu bahan', 'Bantu packing', 'Bantu bagian lain', 'Belanja', 'Mesin / alat bermasalah', 'Bersih-bersih', 'Lainnya'];
const KJ_ALASAN = ['Jahitan lepas', 'Jahitan miring', 'Kotor / noda', 'Sablon rusak', 'Ukuran salah', 'Bahan cacat', 'Lainnya'];

function kinerja_(a, u) {
  const act = String(a[0] || ''), p = a[1] || {};
  const anyK = ['kinerja_input', 'kinerja_cek', 'kinerja_gaji'].some(function (k) { return has_(u, k); });
  if (!anyK) throw new Error('Akses ditolak: akun Anda tidak punya izin Gaji & Kinerja.');
  switch (act) {
    case 'ping': return {v: KJ_V};
    case 'load': return kjLoad_(p, u);
    case 'pin': need_(u, 'kinerja_input'); kjAuthK_(p); return {ok: 1};
    case 'setor': return kjSetor_(p, u);
    case 'catat': return kjCatat_(p, u);
    case 'cek': return kjCek_(p, u);
    case 'putus': return kjPutus_(p, u);
    case 'minus': return kjMinus_(p, u);
    case 'hapusAkt': return kjHapusAkt_(p, u);
    case 'karSave': return kjKarSave_(p, u);
    case 'cfgSave': return kjCfgSave_(p, u);
    case 'gajiSave': return kjGajiSave_(p, u);
    case 'gajiGet': need_(u, 'kinerja_gaji'); return kjGajiGet_(String(p.week || ''));
    case 'hrdInfo': return kjHrdInfo_(u);
    case 'hrdJobs': return kjJobs_(String(p.gud || ''), p.pend || {}, +p.v || 0);
    case 'hrdRekap': return kjHrdRekap_(p, u);
    case 'hrdMove': return kjHrdMove_(p, u);
    case 'hrdPotong': return kjHrdPotong_(p, u);
    case 'hrdExport': need_(u, 'kinerja_gaji'); return kjHrdExport_();
    default: throw new Error('Aksi Kinerja tidak dikenal');
  }
}

/* ---------------- penyimpanan ---------------- */
function kjSheet_(k) {
  const def = KJ_SH[k], s = ss_();
  let sh = s.getSheetByName(def[0]);
  if (!sh) {
    sh = s.insertSheet(def[0]);
    sh.getRange(1, 1, 1, def[1].length).setValues([def[1]]).setFontWeight('bold');
    sh.getRange(1, 1, sh.getMaxRows(), def[1].length).setNumberFormat('@');
    sh.setFrozenRows(1);
  } else if (sh.getLastColumn() < def[1].length) {
    sh.getRange(1, 1, 1, def[1].length).setValues([def[1]]);
    sh.getRange(1, 1, sh.getMaxRows(), def[1].length).setNumberFormat('@');
  }
  return sh;
}
function kjRows_(k, tail) {
  const sh = kjSheet_(k), C = KJ_SH[k][1], lr = sh.getLastRow();
  if (lr < 2) return [];
  const st = tail ? Math.max(2, lr - tail + 1) : 2;
  return sh.getRange(st, 1, lr - st + 1, C.length).getValues().map(function (r, i) {
    const o = {_r: st + i};
    C.forEach(function (c, j) { let v = r[j]; if (v instanceof Date) v = v.toISOString(); o[c] = v; });
    return o;
  }).filter(function (o) { return o.id !== ''; });
}
function kjRow_(k, o) { return KJ_SH[k][1].map(function (c) { const v = o[c]; return v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : v); }); }
function kjAppend_(k, list) {
  if (!list.length) return;
  const sh = kjSheet_(k), C = KJ_SH[k][1];
  sh.getRange(sh.getLastRow() + 1, 1, list.length, C.length).setValues(list.map(function (o) { return kjRow_(k, o); }));
}
function kjPut_(k, o) {
  const sh = kjSheet_(k), C = KJ_SH[k][1], L = kjRows_(k), f = L.filter(function (x) { return String(x.id) === String(o.id); })[0];
  if (f) sh.getRange(f._r, 1, 1, C.length).setValues([kjRow_(k, o)]);
  else kjAppend_(k, [o]);
}
function kjJ_(v, d) { if (v && typeof v === 'object') return v; try { const x = JSON.parse(v); return x == null ? d : x; } catch (e) { return d; } }
function kjCfg_() {
  const s = PropertiesService.getScriptProperties().getProperty('KJ_CFG');
  const c = kjJ_(s, {});
  const o = JSON.parse(JSON.stringify(KJ_CFG_DEF));
  Object.keys(c).forEach(function (k) { o[k] = c[k]; });
  return o;
}
function kjLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function kjId_() { return 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function kjKar_(id) {
  const k = kjRows_('kar').filter(function (x) { return String(x.id) === String(id); })[0];
  if (!k || String(k.on) === '0') throw new Error('Karyawan tidak ditemukan atau tidak aktif.');
  k.kerja = String(k.kerja || '').split(',').filter(Boolean);
  return k;
}
/* PIN 4 angka. Salah 5x dalam 10 menit -> dikunci 10 menit (mencegah tebak PIN). */
function kjAuthK_(p) {
  const k = kjKar_(p.kid), pin = String(p.pin || '');
  const c = CacheService.getScriptCache(), ck = 'kjpin_' + k.id, n = +(c.get(ck) || 0);
  if (n >= 5) throw new Error('PIN salah terlalu sering. Coba lagi 10 menit lagi atau minta kepala gudang mereset PIN.');
  if (!k.pinh) throw new Error('PIN ' + k.nama + ' belum dibuat. Minta Owner membuatnya di menu Atur.');
  if (hash_('kj:' + k.id, pin) !== String(k.pinh)) { c.put(ck, String(n + 1), 600); throw new Error('PIN salah.'); }
  c.remove(ck);
  return k;
}

/* ---------------- gudang ---------------- */
/* gudang akun yang login: dari Atur > Gudang per akun; belum diatur -> Owner semua gudang, akun lain gudang bawaan */
function kjGud_(u, cfg) {
  const m = cfg.akun || {}, k = String(u.user || '').toLowerCase();
  if (m[k]) return String(m[k]);
  if (has_(u, 'kinerja_gaji')) return '';
  return String(cfg.loc || '');
}
function kjKarGud_(k, cfg) { return String(k.gud || cfg.loc || ''); }
/* jumlah setoran jahit yang belum selesai disetujui, per "tahap|gudang|varian" */
function kjPend_(rows) {
  const o = {};
  rows.forEach(function (x) {
    if (x.jenis !== 'setor' || (x.status !== 'tunggu' && x.status !== 'proses')) return;
    const d = kjJ_(x.data, {}), key = String(d.tahap || 'jahit') + '|' + String(d.loc || '') + '|' + String(d.vid);
    o[key] = (o[key] || 0) + (+d.q || 0);
  });
  return o;
}

/* ---------------- baca data ---------------- */
function kjLoad_(p, u) {
  const gaji = has_(u, 'kinerja_gaji'), cek = gaji || has_(u, 'kinerja_cek');
  const cfg = kjCfg_(), gud = kjGud_(u, cfg);
  const kar = kjRows_('kar').filter(function (k) { return String(k.on) !== '0' && (!gud || kjKarGud_(k, cfg) === gud); }).map(function (k) {
    return {id: String(k.id), cid: String(k.cid || ''), nama: k.nama, bagian: k.bagian, kerja: String(k.kerja || '').split(',').filter(Boolean),
      hasil: k.hasil || '', satuan: k.satuan || 'pcs', area: k.area || '', upah: gaji ? (+k.upah || 0) : undefined,
      target: +k.target || 0, jobdesk: k.jobdesk || '', cek: kjJ_(k.cek, []), pin: !!k.pinh, urut: +k.urut || 0,
      gud: String(k.gud || ''), unit: String(k.unit || '')};
  }).sort(function (a, b) { return a.urut - b.urut || String(a.nama).localeCompare(String(b.nama)); });
  const ks = {};
  kar.forEach(function (k) { ks[k.id] = 1; });
  const from = String(p.from || ''), all = kjRows_('akt', 8000);
  const akt = all.filter(function (x) {
    if (gud && !ks[String(x.kid)]) return false;
    if (x.jenis === 'setor' && (x.status === 'tunggu' || x.status === 'proses')) return true; /* antrean persetujuan selalu tampil */
    return !from || String(x.tgl) >= from;
  }).map(function (x) { return {id: x.id, tgl: x.tgl, kid: String(x.kid), jenis: x.jenis, d: kjJ_(x.data, {}), st: x.status, oleh: x.oleh, cekBy: x.cekBy}; });
  const jobs = kjJobs_(gud, kjPend_(all));
  const out = {v: KJ_V, cfg: cfg, kar: kar, akt: akt, jobs: jobs.list, keg: KJ_KEG, alasan: KJ_ALASAN,
    me: {cek: cek, gaji: gaji, input: has_(u, 'kinerja_input'), gud: gud, user: String(u.user || '')},
    gudang: rows_('gudang').map(function (g) { return {id: String(g.id), name: g.name}; })};
  if (cek) out.noLoc = jobs.noLoc;
  if (gaji) out.gaji = kjRows_('gaji').map(function (g) { return {id: String(g.id), status: g.status, by: g.by, at: g.at, okBy: g.okBy, okAt: g.okAt}; });
  if (gaji) out.akun = (u.all || []).filter(function (x) { return x.on; }).map(function (x) { return {user: String(x.user), name: String(x.name || x.user)}; });
  return out;
}
/* ringkasan barang di tahap Cutting & Jahit per gudang + varian (untuk layar setor).
   gud kosong = semua gudang. qty sudah dikurangi setoran yang masih menunggu persetujuan. */
function kjJobs_(gud, pend, ver) {
  const split = ver >= 4; /* v4: Jahit dipisah per unit (pj); kunci 'jahit|gudang|varian|unit' */
  const prod = {}, varn = {};
  rows_('products').forEach(function (r) { prod[r.id] = r; });
  rows_('variants').forEach(function (r) { varn[r.id] = r; });
  const g = {};
  let noLoc = 0;
  rows_('jobs').forEach(function (j) {
    if (j.stage !== 'cutting' && j.stage !== 'jahit') return;
    const loc = String(j.loc || '');
    if (!loc) noLoc++;
    if (gud && loc !== gud) return;
    arr_(j.items).forEach(function (it) {
      const q = +it.qty || 0; if (q <= 0) return;
      const pj = split && j.stage === 'jahit' ? String(j.pj || '') : null;
      const k = j.stage + '|' + loc + '|' + it.vid + (pj !== null ? '|' + pj : ''), v = varn[String(it.vid)] || {}, pr = prod[String(v.pid)] || {};
      const o = g[k] = g[k] || {st: j.stage, loc: loc, vid: String(it.vid), name: it.name, cat: pr.cat || '', qty: 0, due: '', tunggu: 0};
      if (pj !== null) o.pj = pj;
      o.qty += q;
      if (j.due && (!o.due || j.due < o.due)) o.due = j.due;
    });
  });
  const list = Object.keys(g).map(function (k) {
    const o = g[k];
    o.tunggu = Math.min(o.qty, pend[k] || 0);
    o.qty -= o.tunggu;
    return o;
  });
  return {list: list, noLoc: noLoc};
}
function kjPoin_(cfg, cat) {
  const k = String(cat || '').toLowerCase().trim();
  return cfg.poin[k] != null ? +cfg.poin[k] : (+cfg.poinDef || 1);
}

/* ---------------- setor jahit / potong ----------------
   jahit : dicatat "tunggu" atas nama unit; barang baru pindah saat supervisor menyetujui (kjSetorOk_)
   potong: seperti v1, barang langsung pindah ke Jahit atas nama karyawan */
function kjSetor_(p, u) {
  need_(u, 'kinerja_input');
  const k = kjAuthK_(p), st = String(p.tahap || '');
  const need = st === 'jahit' ? 'jahit' : st === 'cutting' ? 'potong' : '';
  if (!need) throw new Error('Tahap tidak valid.');
  if (k.kerja.indexOf(need) < 0) throw new Error(k.nama + ' bukan bagian ' + (need === 'jahit' ? 'jahit' : 'potong') + '.');
  const cfg = kjCfg_(), gud = kjGud_(u, cfg), kg = kjKarGud_(k, cfg);
  if (gud && kg !== gud) throw new Error(k.nama + ' bukan karyawan gudang ini.');
  const want = {};
  (p.items || []).forEach(function (it) {
    const q = Math.floor(+it.q || 0), loc = String(it.loc || '');
    if (q <= 0) return;
    if (gud && loc !== gud) throw new Error('Barang ini bukan dari gudang akun ini. Muat ulang halaman.');
    if (kg && loc !== kg) throw new Error(k.nama + ' hanya bisa setor barang di gudangnya sendiri.');
    const key = loc + '|' + String(it.vid);
    want[key] = (want[key] || 0) + q;
  });
  if (!Object.keys(want).length) throw new Error('Isi jumlah yang disetor.');
  const prod = {}, varn = {};
  rows_('products').forEach(function (r) { prod[r.id] = r; });
  rows_('variants').forEach(function (r) { varn[r.id] = r; });
  const sep = function (key) { const i = key.indexOf('|'); return {loc: key.slice(0, i), vid: key.slice(i + 1)}; };
  const isi = function (jobs, loc, vid) {
    let ada = 0, name = '';
    jobs.forEach(function (j) {
      if (String(j.loc || '') !== loc) return;
      arr_(j.items).forEach(function (it) { if (String(it.vid) === vid) { ada += +it.qty || 0; if (!name && (+it.qty || 0) > 0) name = it.name; } });
    });
    return {ada: ada, name: name};
  };

  if (st === 'jahit') {
    const unit = String(k.unit || '').trim() || k.nama;
    return kjLock_(function () {
      const pend = kjPend_(kjRows_('akt', 8000)), now = new Date().toISOString(), log = [];
      const jobs = rows_('jobs').filter(function (j) { return j.stage === 'jahit'; });
      Object.keys(want).forEach(function (key) {
        const x = sep(key), r = isi(jobs, x.loc, x.vid), sisa = r.ada - (pend['jahit|' + key] || 0);
        if (want[key] > sisa) throw new Error('Setor ' + (r.name || 'barang') + ' melebihi yang ada di Jahit (sisa ' + Math.max(0, sisa) + ' pcs, sudah dikurangi setoran yang menunggu). Muat ulang halaman.');
        const v = varn[x.vid] || {}, pr = prod[String(v.pid)] || {};
        log.push({id: kjId_(), tgl: now, kid: k.id, jenis: 'setor',
          data: {tahap: 'jahit', vid: x.vid, nama: r.name, q: want[key], cat: pr.cat || '', poin: kjPoin_(cfg, pr.cat), loc: x.loc, unit: unit},
          status: 'tunggu', oleh: k.nama, dev: u.user});
      });
      kjAppend_('akt', log);
      return {ok: 1, n: log.length, tunggu: 1};
    });
  }

  /* potong: order paling lama diproses dulu */
  const jobs = rows_('jobs').filter(function (j) { return j.stage === st; })
    .sort(function (a, b) { return String(a.date) < String(b.date) ? -1 : 1; });
  Object.keys(want).forEach(function (key) {
    const x = sep(key), r = isi(jobs, x.loc, x.vid);
    if (want[key] > r.ada) throw new Error('Jumlah setor melebihi barang di tahap ' + st + ' (ada ' + r.ada + ' pcs). Muat ulang halaman.');
  });
  const uAs = {};
  Object.keys(u).forEach(function (x) { uAs[x] = u[x]; });
  uAs.name = k.nama; /* tercatat di Produksi atas nama karyawan */
  const now = new Date().toISOString(), log = [];
  Object.keys(want).forEach(function (key) {
    const x = sep(key);
    let sisa = want[key], name = '';
    jobs.forEach(function (j) {
      if (sisa <= 0 || String(j.loc || '') !== x.loc) return;
      const it = arr_(j.items).filter(function (y) { return String(y.vid) === x.vid && (+y.qty || 0) > 0; })[0];
      if (!it) return;
      const take = Math.min(sisa, +it.qty);
      const done = {}; done[x.vid] = take;
      jobAdvance_([j.id, st, '', 'Setor via Gaji & Kinerja', {}, {done: done}], uAs);
      sisa -= take; name = it.name;
    });
    const v = varn[x.vid] || {}, pr = prod[String(v.pid)] || {}, poin = kjPoin_(cfg, pr.cat);
    log.push({id: kjId_(), tgl: now, kid: k.id, jenis: 'setor', data: {tahap: st, vid: x.vid, nama: name, q: want[key], cat: pr.cat || '', poin: poin, loc: x.loc}, status: 'ok', oleh: k.nama, dev: u.user});
  });
  kjLock_(function () { kjAppend_('akt', log); });
  return {ok: 1, n: log.length};
}

/* Supervisor menyetujui satu setoran jahit: kunci dulu (status "proses") supaya tidak diproses dua kali,
   pindahkan barang ke Finishing (deadline terdekat, lalu order terlama), lalu tandai "ok".
   q = jumlah yang benar menurut cek fisik (kosong = sesuai setoran). */
function kjSetorOk_(id, ok, q, note, u, cfg, gud) {
  const now = new Date().toISOString();
  let c = null;
  kjUpdAkt_([id], function (o) {
    if (o.jenis !== 'setor') return false;
    if (o.status !== 'tunggu') throw new Error('Setoran ini sudah diproses (' + o.status + '). Muat ulang halaman.');
    if (gud && String(o.data.loc || '') !== gud) throw new Error('Setoran ini bukan dari gudang Anda.');
    o.cekBy = u.name; o.cekAt = now;
    if (!ok) { o.status = 'tolak'; o.data.tolak = note || 'ditolak supervisor'; return; }
    o.status = 'proses';
    c = JSON.parse(JSON.stringify(o));
  });
  if (!ok) return {};
  const d = c.data, want = q != null ? q : (+d.q || 0);
  const back = function () { kjUpdAkt_([id], function (o) { o.status = 'tunggu'; o.cekBy = ''; o.cekAt = ''; }); };
  if (q != null && q > (+d.q || 0)) { back(); throw new Error('Jumlah disetujui tidak boleh melebihi yang disetor (' + d.q + ' pcs).'); }
  let moved = 0, err = null;
  try {
    const jobs = rows_('jobs').filter(function (j) {
      return j.stage === 'jahit' && String(j.loc || '') === String(d.loc || '') &&
        arr_(j.items).some(function (it) { return String(it.vid) === String(d.vid) && (+it.qty || 0) > 0; });
    }).sort(function (a, b) {
      const da = String(a.due || '9999'), db = String(b.due || '9999');
      return da < db ? -1 : da > db ? 1 : (String(a.date) < String(b.date) ? -1 : 1);
    });
    const uAs = {};
    Object.keys(u).forEach(function (x) { uAs[x] = u[x]; });
    uAs.name = String(d.unit || c.oleh || u.name).slice(0, 40); /* tercatat di Produksi atas nama unit */
    const ket = ('Setor ' + (d.unit || c.oleh) + ' via Gaji & Kinerja, disetujui ' + u.name + (q != null && q !== +d.q ? ' (koreksi ' + d.q + ' → ' + q + ' pcs)' : '')).slice(0, 200);
    let sisa = want;
    jobs.forEach(function (j) {
      if (sisa <= 0) return;
      const it = arr_(j.items).filter(function (x) { return String(x.vid) === String(d.vid) && (+x.qty || 0) > 0; })[0];
      if (!it) return;
      const take = Math.min(sisa, +it.qty), done = {};
      done[String(it.vid)] = take;
      PROD_VIA_ = 'setor';
      try { jobAdvance_([j.id, 'jahit', '', ket, {}, {done: done}], uAs); } finally { PROD_VIA_ = ''; }
      sisa -= take; moved += take;
    });
  } catch (e) { err = e; }
  if (!moved) {
    back();
    if (err) throw err;
    throw new Error(d.nama + ' sudah tidak ada di tahap Jahit gudang ini. Tolak setoran ini, atau cek menu Produksi.');
  }
  kjUpdAkt_([id], function (o) {
    o.status = 'ok'; o.cekBy = u.name; o.cekAt = now;
    if (moved !== +o.data.q) { o.data.qAsli = o.data.q; o.data.q = moved; }
    if (moved < want) o.data.catatan = 'Hanya ' + moved + ' dari ' + want + ' pcs yang dipindah' + (err ? ': ' + err.message : ' (sisanya sudah tidak ada di Jahit)');
  });
  return {msg: moved < want ? d.nama + ': hanya ' + moved + ' dari ' + want + ' pcs yang dipindah ke Finishing.' : ''};
}

/* ---------------- catatan lain dari HP area ---------------- */
function kjCatat_(p, u) {
  need_(u, 'kinerja_input');
  const k = kjAuthK_(p), j = String(p.jenis || ''), now = new Date().toISOString();
  let d, st = 'ok';
  if (j === 'hasil') {
    if (k.kerja.indexOf('hasil') < 0) throw new Error(k.nama + ' tidak mencatat hasil di sini.');
    const q = Math.round((+p.q || 0) * 100) / 100, rj = Math.max(0, Math.floor(+p.rj || 0));
    if (!(q > 0)) throw new Error('Isi jumlah hasil.');
    d = {label: k.hasil || 'Hasil', satuan: k.satuan || 'pcs', q: q, rj: rj, ket: String(p.ket || '').slice(0, 120)};
    st = 'tunggu';
  } else if (j === 'reject') {
    if (k.kerja.indexOf('qc') < 0) throw new Error(k.nama + ' bukan tim QC/packing.');
    const q = Math.floor(+p.q || 0); if (!(q > 0)) throw new Error('Isi jumlah reject.');
    const al = String(p.alasan || '').slice(0, 60); if (!al) throw new Error('Pilih alasan reject.');
    let tg = String(p.target || '');
    if (tg) { const t = kjKar_(tg); tg = t.id; }
    d = {q: q, produk: String(p.produk || '').slice(0, 80), target: tg, alasan: al, ket: String(p.ket || '').slice(0, 120)};
    st = 'rak';
  } else if (j === 'tugas') {
    const it = String(p.item || '').slice(0, 80); if (!it) throw new Error('Tugas kosong.');
    const day = now.slice(0, 10);
    const sudah = kjRows_('akt', 3000).some(function (x) { return String(x.kid) === k.id && x.jenis === 'tugas' && kjJ_(x.data, {}).item === it && kjDay_(x.tgl) === kjDay_(now); });
    if (sudah) return {ok: 1, dup: 1};
    d = {item: it};
  } else if (j === 'kegiatan') {
    const lb = String(p.label || '').slice(0, 40); if (!lb) throw new Error('Pilih kegiatan.');
    d = {label: lb, ket: String(p.ket || '').slice(0, 120)};
  } else throw new Error('Jenis catatan tidak dikenal.');
  kjLock_(function () { kjAppend_('akt', [{id: kjId_(), tgl: now, kid: k.id, jenis: j, data: d, status: st, oleh: k.nama, dev: u.user}]); });
  return {ok: 1};
}
/* tanggal lokal WIB (UTC+7) untuk "hari ini" */
function kjDay_(iso) { const t = new Date(iso); return isNaN(t) ? '' : new Date(t.getTime() + 7 * 3600e3).toISOString().slice(0, 10); }

/* ---------------- kepala gudang ---------------- */
function kjUpdAkt_(ids, fn) {
  return kjLock_(function () {
    const sh = kjSheet_('akt'), C = KJ_SH.akt[1], L = kjRows_('akt', 8000), set = {};
    ids.forEach(function (i) { set[String(i)] = 1; });
    let n = 0;
    L.forEach(function (x) {
      if (!set[String(x.id)]) return;
      const o = {}; C.forEach(function (c) { o[c] = x[c]; });
      o.data = kjJ_(x.data, {});
      if (fn(o) === false) return;
      sh.getRange(x._r, 1, 1, C.length).setValues([kjRow_('akt', o)]); n++;
    });
    if (!n) throw new Error('Data tidak ditemukan. Muat ulang halaman.');
    return {ok: 1, n: n};
  });
}
function kjCekOk_(u) { if (!has_(u, 'kinerja_cek') && !has_(u, 'kinerja_gaji')) throw new Error('Hanya kepala gudang atau Owner.'); }
function kjCek_(p, u) {
  kjCekOk_(u);
  const ok = !!p.ok, now = new Date().toISOString(), note = String(p.note || '').slice(0, 120);
  const ids = (p.ids || []).map(String), cfg = kjCfg_(), gud = kjGud_(u, cfg);
  if (!ids.length) throw new Error('Pilih data dulu.');
  const one = ids.length === 1 && p.q != null && p.q !== '';
  if (one && !(Math.floor(+p.q) === +p.q && +p.q >= 0)) throw new Error('Jumlah tidak valid.');
  const jenis = {};
  kjRows_('akt', 8000).forEach(function (x) { jenis[String(x.id)] = x.jenis; });
  const sIds = ids.filter(function (i) { return jenis[i] === 'setor'; }), hIds = ids.filter(function (i) { return jenis[i] === 'hasil'; });
  if (!sIds.length && !hIds.length) throw new Error('Data tidak ditemukan. Muat ulang halaman.');
  const out = {ok: 1, n: 0, msg: []};
  if (hIds.length) {
    const KM = {};
    kjRows_('kar').forEach(function (k) { KM[String(k.id)] = k; });
    out.n += kjUpdAkt_(hIds, function (o) {
      if (o.jenis !== 'hasil') return false;
      if (gud && kjKarGud_(KM[String(o.kid)] || {}, cfg) !== gud) throw new Error('Hasil ini bukan dari gudang Anda.');
      o.status = ok ? 'ok' : 'tolak'; o.cekBy = u.name; o.cekAt = now;
      if (!ok) o.data.tolak = note || 'ditolak kepala gudang';
      if (ok && one) { o.data.qAsli = o.data.q; o.data.q = +p.q; }
    }).n;
  }
  sIds.forEach(function (id) {
    if (ok && one && !(+p.q > 0)) throw new Error('Jumlah harus lebih dari 0. Gunakan Tolak bila tidak ada yang jadi.');
    const r = kjSetorOk_(id, ok, one ? +p.q : null, note, u, cfg, gud);
    out.n++;
    if (r.msg) out.msg.push(r.msg);
  });
  return out;
}
function kjPutus_(p, u) {
  kjCekOk_(u);
  const a = String(p.act || ''); if (['perbaiki', 'afkir', 'jual'].indexOf(a) < 0) throw new Error('Pilihan tidak valid.');
  const now = new Date().toISOString();
  return kjUpdAkt_(p.ids || [], function (o) {
    if (o.jenis !== 'reject') return false;
    o.status = 'putus'; o.data.putus = a; o.cekBy = u.name; o.cekAt = now;
  });
}
function kjMinus_(p, u) {
  kjCekOk_(u);
  const k = kjKar_(p.kid), note = String(p.note || '').slice(0, 120);
  if (!note) throw new Error('Tulis alasannya.');
  kjLock_(function () { kjAppend_('akt', [{id: kjId_(), tgl: new Date().toISOString(), kid: k.id, jenis: 'minus', data: {note: note}, status: 'ok', oleh: u.name, dev: u.user}]); });
  return {ok: 1};
}
function kjHapusAkt_(p, u) {
  kjCekOk_(u);
  const now = new Date().toISOString();
  return kjUpdAkt_([p.id], function (o) {
    if (o.jenis === 'setor' && o.status !== 'tunggu') throw new Error('Setoran yang sudah disetujui dibatalkan lewat menu Produksi (Kembalikan ke tahap sebelumnya).');
    o.status = 'batal'; o.cekBy = u.name; o.cekAt = now;
  });
}

/* ---------------- Owner: karyawan, pengaturan, gaji ---------------- */
function kjKarSave_(p, u) {
  need_(u, 'kinerja_gaji');
  return kjLock_(function () {
    const L = kjRows_('kar'), id = String(p.id || '') || kjId_(), old = L.filter(function (x) { return String(x.id) === id; })[0] || {};
    const nama = String(p.nama || '').trim().slice(0, 40);
    if (!nama) throw new Error('Nama wajib diisi.');
    if (L.some(function (x) { return String(x.id) !== id && String(x.on) !== '0' && String(x.nama).toLowerCase() === nama.toLowerCase(); })) throw new Error('Nama sudah dipakai.');
    const kerja = (p.kerja || []).map(String).filter(function (x) { return KJ_KERJA.indexOf(x) >= 0; });
    let pinh = old.pinh || '';
    if (p.pin != null && p.pin !== '') {
      if (!/^\d{4}$/.test(String(p.pin))) throw new Error('PIN harus 4 angka.');
      pinh = hash_('kj:' + id, String(p.pin));
      CacheService.getScriptCache().remove('kjpin_' + id);
    }
    const cek = (p.cek || []).map(function (x) { return String(x).trim().slice(0, 80); }).filter(Boolean).slice(0, 5);
    const gud = String(p.gud || '').slice(0, 40);
    if (gud && !rows_('gudang').some(function (g) { return String(g.id) === gud; })) throw new Error('Gudang tidak dikenal.');
    kjPut_('kar', {id: id, cid: String(p.cid || '').trim().slice(0, 10), nama: nama, bagian: String(p.bagian || '').slice(0, 60), kerja: kerja.join(','),
      hasil: String(p.hasil || '').slice(0, 40), satuan: String(p.satuan || 'pcs').slice(0, 15), area: String(p.area || '').slice(0, 30),
      upah: Math.max(0, +p.upah || 0), target: Math.max(0, +p.target || 0), jobdesk: String(p.jobdesk || '').slice(0, 1000), cek: cek,
      pinh: pinh, on: p.on === false ? '0' : '1', urut: +p.urut || +old.urut || 0,
      gud: gud, unit: String(p.unit || '').trim().slice(0, 40)});
    return {ok: 1, id: id};
  });
}
function kjCfgSave_(p, u) {
  need_(u, 'kinerja_gaji');
  const c = kjCfg_();
  if (p.akun !== undefined) {
    const a = {}, ada = {};
    rows_('gudang').forEach(function (g) { ada[String(g.id)] = 1; });
    Object.keys(p.akun || {}).forEach(function (k) { const v = String(p.akun[k] || ''); if (v && ada[v]) a[String(k).toLowerCase().slice(0, 40)] = v; });
    p.akun = a;
  }
  Object.keys(KJ_CFG_DEF).forEach(function (k) { if (p[k] !== undefined) c[k] = p[k]; });
  PropertiesService.getScriptProperties().setProperty('KJ_CFG', JSON.stringify(c));
  return {ok: 1, cfg: c};
}
function kjGajiGet_(w) {
  const g = kjRows_('gaji').filter(function (x) { return String(x.id) === w; })[0];
  return g ? {id: String(g.id), status: g.status, data: kjJ_(g.data, {}), by: g.by, at: g.at, okBy: g.okBy, okAt: g.okAt} : null;
}
function kjGajiSave_(p, u) {
  need_(u, 'kinerja_gaji');
  const w = String(p.week || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(w)) throw new Error('Minggu tidak valid.');
  return kjLock_(function () {
    const old = kjGajiGet_(w), now = new Date().toISOString(), st = String(p.status || 'draf');
    if (old && old.status === 'final' && st !== 'buka') throw new Error('Gaji minggu ini sudah disetujui dan dikunci. Buka kunci dulu.');
    if (st === 'buka') {
      if (!old) throw new Error('Belum ada data.');
      kjPut_('gaji', {id: w, status: 'draf', data: old.data, by: old.by, at: old.at, okBy: '', okAt: ''});
      return {ok: 1};
    }
    const data = p.data || {};
    if (JSON.stringify(data).length > 45000) throw new Error('Data terlalu besar.');
    kjPut_('gaji', {id: w, status: st === 'final' ? 'final' : 'draf', data: data, by: u.name, at: now,
      okBy: st === 'final' ? u.name : '', okAt: st === 'final' ? now : ''});
    return {ok: 1};
  });
}

/* ======================= JEMBATAN SERVER HRD (v3) ======================= */
/* daftar workshop + akun POS (akun hanya untuk pemegang kinerja_gaji) */
function kjHrdInfo_(u) {
  const out = {v: KJ_V, gudang: rows_('gudang').map(function (g) { return {id: String(g.id), name: g.name}; })};
  if (has_(u, 'kinerja_gaji')) out.akun = (u.all || []).filter(function (x) { return x.on; }).map(function (x) { return {user: String(x.user), name: String(x.name || x.user)}; });
  return out;
}
/* Pindahkan setoran jahit yang sudah disetujui di HRD: Jahit -> Finishing (deadline terdekat, lalu order terlama).
   p = {loc, vid, q, unit, note}. Dijalankan dengan akun supervisor yang menyetujui (butuh prod_jahit). */
function kjHrdMove_(p, u) {
  kjCekOk_(u);
  const loc = String(p.loc || ''), vid = String(p.vid || ''), want = Math.floor(+p.q || 0);
  if (!vid || !(want > 0)) throw new Error('Data setoran tidak valid.');
  /* v4: src = unit pemilik jatah ('' = belum dibagi); tidak dikirim = cara lama (semua order Jahit) */
  const src = p.src === undefined || p.src === null ? null : String(p.src);
  const jobs = rows_('jobs').filter(function (j) {
    return j.stage === 'jahit' && String(j.loc || '') === loc && (src === null || String(j.pj || '') === src) &&
      arr_(j.items).some(function (it) { return String(it.vid) === vid && (+it.qty || 0) > 0; });
  }).sort(function (a, b) {
    const da = String(a.due || '9999'), db = String(b.due || '9999');
    return da < db ? -1 : da > db ? 1 : (String(a.date) < String(b.date) ? -1 : 1);
  });
  const uAs = {};
  Object.keys(u).forEach(function (x) { uAs[x] = u[x]; });
  uAs.name = String(p.unit || u.name).slice(0, 40);
  const ket = String(p.note || ('Setor ' + (p.unit || '') + ' via HRD, disetujui ' + u.name)).slice(0, 200);
  let sisa = want, moved = 0, err = '';
  try {
    jobs.forEach(function (j) {
      if (sisa <= 0) return;
      const it = arr_(j.items).filter(function (x) { return String(x.vid) === vid && (+x.qty || 0) > 0; })[0];
      if (!it) return;
      const take = Math.min(sisa, +it.qty), done = {};
      done[String(it.vid)] = take;
      PROD_VIA_ = 'setor';
      try { jobAdvance_([j.id, 'jahit', '', ket, {}, {done: done}], uAs); } finally { PROD_VIA_ = ''; }
      sisa -= take; moved += take;
    });
  } catch (e) { err = String(e.message || e); }
  return {moved: moved, err: err};
}
/* Setor potong: pindah Cutting -> Jahit atas nama karyawan (setelah disetujui supervisor). p = {nama, items:[{loc, vid, q}]} */
function kjHrdPotong_(p, u) {
  /* v4: dipanggil saat supervisor menyetujui setoran potong (atau HP area versi lama) */
  if (!has_(u, 'kinerja_input')) kjCekOk_(u);
  const nama = String(p.nama || '').slice(0, 40) || u.name, out = [];
  const jobs = rows_('jobs').filter(function (j) { return j.stage === 'cutting'; })
    .sort(function (a, b) { return String(a.date) < String(b.date) ? -1 : 1; });
  (p.items || []).forEach(function (x) {
    const loc = String(x.loc || ''), vid = String(x.vid || ''), q = Math.floor(+x.q || 0);
    let ada = 0;
    jobs.forEach(function (j) { if (String(j.loc || '') === loc) arr_(j.items).forEach(function (it) { if (String(it.vid) === vid) ada += +it.qty || 0; }); });
    if (q > ada) throw new Error('Jumlah setor melebihi barang di tahap Cutting (ada ' + ada + ' pcs). Muat ulang halaman.');
  });
  const uAs = {};
  Object.keys(u).forEach(function (x) { uAs[x] = u[x]; });
  uAs.name = nama;
  (p.items || []).forEach(function (x) {
    const loc = String(x.loc || ''), vid = String(x.vid || '');
    let sisa = Math.floor(+x.q || 0), name = '', moved = 0;
    jobs.forEach(function (j) {
      if (sisa <= 0 || String(j.loc || '') !== loc) return;
      const it = arr_(j.items).filter(function (y) { return String(y.vid) === vid && (+y.qty || 0) > 0; })[0];
      if (!it) return;
      const take = Math.min(sisa, +it.qty), done = {};
      done[vid] = take;
      jobAdvance_([j.id, 'cutting', '', 'Setor via HRD', {}, {done: done}], uAs);
      sisa -= take; moved += take; name = it.name;
    });
    out.push({loc: loc, vid: vid, nama: name, moved: moved});
  });
  return {items: out};
}
/* Pindah data sekali ke server HRD: karyawan (tanpa PIN, karena kunci PIN milik server POS) + pengaturan */
function kjHrdExport_() {
  return {cfg: kjCfg_(), kar: kjRows_('kar').map(function (k) { const o = {}; KJ_SH.kar[1].forEach(function (c) { if (c !== 'pinh') o[c] = k[c]; }); return o; })};
}

/* v4: Rekap unit jahit & pemotong untuk periode [from, to) di satu gudang (kosong = semua). Sumber: riwayat order Produksi.
   beri = masuk Jahit atas nama unit; balik = dikembalikan dari Jahit; setor = pindah ke Finishing lewat setoran;
   manual = pindah ke Finishing manual (Owner/Admin); tangan = masih di Jahit atas nama unit (saat ini).
   Riwayat ikut tersalin saat order dipecah, jadi entri yang sama dihitung sekali (tanda waktu + isi). */
function kjHrdRekap_(p, u) {
  kjCekOk_(u);
  const gud = String(p.gud || ''), from = String(p.from || ''), to = String(p.to || '');
  const J = {}, P = {}, seen = {};
  const unit = function (n) { return J[n] = J[n] || {beri: 0, balik: 0, setor: 0, manual: 0, tangan: 0}; };
  const inR = function (d) { d = String(d || ''); return !!d && (!from || d >= from) && (!to || d < to); };
  rows_('jobs').forEach(function (j) {
    if (String(j.id) === 'pcfg' || j.stage === 'cfg') return;
    if (gud && String(j.loc || '') !== gud) return;
    if (j.stage === 'jahit' && j.pj) arr_(j.items).forEach(function (it) { unit(String(j.pj)).tangan += +it.qty || 0; });
    arr_(j.hist).forEach(function (h) {
      if (!h || !inR(h.date)) return;
      const q = +h.q || 0;
      if (!q) return;
      const sig = [String(j.grp || j.no || '').replace(/(-p\d+)+$/, ''), h.date, h.stage, h.pj || '', h.pjFrom || '', h.pt || '', q, h.back ? 1 : 0].join('|');
      if (seen[sig]) return;
      seen[sig] = 1;
      if (h.back) { if (h.from === 'jahit' && h.pjFrom) unit(String(h.pjFrom)).balik += q; return; }
      if (h.stage === 'jahit' && h.pj) unit(String(h.pj)).beri += q;
      else if (h.stage === 'finishing' && h.pjFrom) { if (h.manual) unit(String(h.pjFrom)).manual += q; else unit(String(h.pjFrom)).setor += q; }
      else if (h.stage === 'cutting' && h.pt) P[String(h.pt)] = (P[String(h.pt)] || 0) + q;
    });
  });
  return {v: KJ_V, jahit: J, potong: P};
}
