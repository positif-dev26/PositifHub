/**
 * POSITIF HRD — server Gaji, Kinerja, Jobdesk & data karyawan (Google Apps Script, spreadsheet "Positif HRD")
 * ---------------------------------------------------------------------------------------------
 * Terpisah dari server Positif POS supaya data gaji & karyawan tidak tercampur dengan data toko.
 *
 * LOGIN IKUT POSITIF POS: aplikasi mengirim tiket login POS; server ini menanyakan ke server POS (whoami)
 * siapa pemiliknya dan izinnya (kinerja_input / kinerja_cek / kinerja_gaji). Hasil diingat 10 menit.
 * PRODUKSI tetap di server POS: setor potong & setoran jahit yang disetujui dipindahkan lewat jembatan
 * Kinerja.gs v3 di server POS (aksi hrdJobs / hrdMove / hrdPotong / hrdInfo), memakai tiket pengguna itu.
 *
 * Pasang: tempel file ini di Extensions > Apps Script spreadsheet "Positif HRD", jalankan setup() sekali,
 * lalu Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 * Setiap kode diubah: Deploy > Manage deployments > Edit > Version: New.
 *
 * v9 (unit jahit): daftar setor memisah barang Jahit per unit (butuh Kinerja.gs v4 di server POS).
 *     Setoran mencatat src = unit pemilik jatah; dari jatah unit lain diberi tanda luar (tetap butuh persetujuan).
 *     Persetujuan memindahkan barang dari jatah src saja. Workshop dengan potongProd (bawaan: Kedawung):
 *     hasil potong dicatat dari menu Produksi, setor potong di sini ditolak. Aksi 'rekap' = rekap unit jahit & pemotong.
 */
const HRD_V = 9;
const KJ_V = 3; /* versi kontrak dengan kinerja.html */
const POS_API = 'https://script.google.com/macros/s/AKfycbwUEqf4lS9mn3Gdyo3vpDmTl3u9gxQzIEIf83dJMeopMDDQpHu_-pcG9puoPFHfMOOBkA/exec';

/* ======================= WEB APP ======================= */
function doGet(e) {
  /* halaman Peraturan Kerja (publik, tanpa data pribadi) membaca isi terbaru dari sini */
  if (e && e.parameter && e.parameter.doc === 'peraturan') {
    let out;
    try { const d = kjDocGet_(), so = kjSopGet_(); d.sop = {divisi: so.divisi, sop: so.sop, tj: so.tj.map(function (t) { return {nama: t.nama, divisi: t.divisi, kerja: t.kerja}; })}; out = {ok: true, data: d}; } catch (err) { out = {ok: false, error: String(err.message || err)}; }
    return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput('Positif HRD API aktif (v' + HRD_V + ').');
}
function doPost(e) {
  let out;
  try {
    const b = JSON.parse(e.postData.contents);
    if (b.fn !== 'kinerja') throw new Error('Fungsi tidak dikenal');
    const u = auth_(String(b.tok || ''));
    /* v7: menu Kinerja per workshop; workshop dikirim di setiap permintaan */
    REQ.ws = String(((b.a || [])[1] || {}).ws || '').slice(0, 40);
    out = {ok: true, data: kinerja_(b.a || [], u)};
  } catch (err) {
    out = {ok: false, error: String((err && err.message) || err)};
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/** Jalankan SEKALI dari editor: membuat lembar data, memberi izin akses ke luar (server POS), mengecek sambungan. */
function setup() {
  Object.keys(KJ_SH).forEach(function (k) { kjSheet_(k); });
  const def = ss_().getSheetByName('Sheet1');
  if (def && def.getLastRow() === 0 && ss_().getSheets().length > 1) ss_().deleteSheet(def);
  salt_();
  const r = UrlFetchApp.fetch(POS_API, {method: 'post', contentType: 'text/plain', muteHttpExceptions: true, followRedirects: true,
    payload: JSON.stringify({fn: 'whoami', tok: '00000000000000000000000000000000'})});
  Logger.log('Sambungan ke server POS: kode ' + r.getResponseCode() + ' · ' + r.getContentText().slice(0, 120));
  Logger.log('Kalau jawabannya berisi "AUTH", sambungan sudah benar (tiket palsu memang ditolak).');
}

/* ======================= AKSES (tanya server POS) ======================= */
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function pos_(body) {
  let r, j;
  try {
    r = UrlFetchApp.fetch(POS_API, {method: 'post', contentType: 'text/plain', muteHttpExceptions: true, followRedirects: true, payload: JSON.stringify(body)});
  } catch (e) { throw new Error('Server HRD tidak bisa menghubungi server POS: ' + e.message); }
  try { j = JSON.parse(r.getContentText()); } catch (e) { throw new Error('Server POS tidak menjawab dengan benar (kode ' + r.getResponseCode() + ').'); }
  if (!j.ok) {
    const m = String(j.error || 'Gagal');
    if (/AUTH/.test(m)) throw new Error('AUTH Sesi Positif POS berakhir. Masuk lagi di Positif POS.');
    throw new Error(m);
  }
  return j.data;
}
/* panggil jembatan Kinerja.gs di server POS dengan tiket pengguna yang sama */
function posK_(u, act, p) { return pos_({fn: 'kinerja', tok: u.tok, a: [act, p || {}]}); }
function auth_(tok) {
  if (!/^[a-f0-9]{32,80}$/.test(tok)) throw new Error('AUTH Masuk dulu ke Positif POS.');
  const c = CacheService.getScriptCache(), ck = 'hu_' + tok;
  const ada = c.get(ck);
  if (ada) { try { const o = JSON.parse(ada); o.tok = tok; return o; } catch (e) { } }
  const d = pos_({fn: 'whoami', tok: tok}) || {};
  const u = {user: String(d.user || ''), name: String(d.name || d.user || ''), role: String(d.role || ''), perm: Array.isArray(d.perm) ? d.perm : []};
  if (!u.user) throw new Error('AUTH Masuk dulu ke Positif POS.');
  c.put(ck, JSON.stringify(u), 600);
  u.tok = tok;
  return u;
}
function has_(u, k) { return u.role === 'owner' || u.role === 'admin' || u.perm.indexOf(k) >= 0; }
/* ---------------- v7: peran Positif POS & hak akses Kinerja ---------------- */
var REQ = {ws: ''};
function peran_(u) { const r = String(u.role || '').toLowerCase(); return r === 'owner' || r === 'admin' || r === 'supervisor' ? r : 'staf'; }
/* Owner: akun berperan owner, atau admin bila belum ada akun owner (sama seperti Positif POS) */
function owner_(u) { return peran_(u) === 'owner' || (peran_(u) === 'admin' && !kjAdaOwner_()); }
/* Positif POS: admin bertindak sebagai Owner bila belum ada akun Owner. Server HRD mencatat akun Owner saat pertama kali membuka Kinerja. */
function kjAdaOwner_() { return PropertiesService.getScriptProperties().getProperty('adaOwner') === '1'; }
/* isi awal tabel hak akses; Owner selalu boleh. Gaji, aturan gaji, akses, peraturan/SOP: dikunci hanya Owner. */
const KJ_AKSES_DEF = {
  jobdesk: {admin: true, supervisor: true, staf: true},
  periksa: {admin: true, supervisor: true, staf: false},
  beri: {admin: true, supervisor: true, staf: false},
  lembar: {admin: true, supervisor: true, staf: false},
  karyawan: {admin: true, supervisor: false, staf: false}
};
const KJ_AKSES_L = {jobdesk: 'Jobdesk: mengisi', periksa: 'Hasil kerja: lihat & periksa, setujui setoran', beri: 'Hasil kerja: beri tugas tambahan', lembar: 'Lembar kerja orang lain', karyawan: 'Atur: data karyawan (tanpa upah)'};
function boleh_(u, a, cfg) {
  if (owner_(u)) return true;
  const A = (cfg || kjCfg_()).akses || KJ_AKSES_DEF, x = A[a] || KJ_AKSES_DEF[a] || {};
  return !!x[peran_(u)];
}
function butuh_(u, a) { if (!boleh_(u, a)) throw new Error('Akses ditolak: peran ' + peran_(u) + ' tidak diizinkan (' + (KJ_AKSES_L[a] || a) + '). Hubungi Owner.'); }
function hanyaOwner_(u) { if (!owner_(u)) throw new Error('Akses ditolak: hanya Owner.'); }
function need_(u, k) { if (!has_(u, k)) throw new Error('Akses ditolak: akun Anda tidak punya izin "' + k + '".'); }
/* daftar workshop (+ akun POS untuk Owner) dari server POS, diingat 5 menit */
function posInfo_(u) {
  const c = CacheService.getScriptCache(), ck = 'hi_' + (has_(u, 'kinerja_gaji') ? 'g' : 'x');
  const ada = c.get(ck);
  if (ada) { try { return JSON.parse(ada); } catch (e) { } }
  const d = posK_(u, 'hrdInfo', {});
  d.gudang = d.gudang || [];
  try { c.put(ck, JSON.stringify(d), 300); } catch (e) { }
  return d;
}

/* ---------- PIN karyawan (hash dengan garam milik server HRD) ---------- */
function salt_() {
  const p = PropertiesService.getScriptProperties();
  let s = p.getProperty('salt');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('salt', s); }
  return s;
}
function hash_(user, pin) {
  const d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt_() + ':' + user + ':' + pin, Utilities.Charset.UTF_8);
  return 'h1:' + d.map(function (b) { b = b < 0 ? b + 256 : b; return (b < 16 ? '0' : '') + b.toString(16); }).join('');
}

const KJ_SH = {
  kar: ['KJ Karyawan', ['id', 'cid', 'nama', 'bagian', 'kerja', 'hasil', 'satuan', 'area', 'upah', 'target', 'jobdesk', 'cek', 'pinh', 'on', 'urut', 'gud', 'unit', 'posisi', 'sistem']],
  /* v8: scan ceklok asli per minggu per workshop + koreksi */
  ck: ['KJ Ceklok', ['id', 'raw', 'kor', 'file', 'periode', 'by', 'at']],
  akt: ['KJ Aktivitas', ['id', 'tgl', 'kid', 'jenis', 'data', 'status', 'oleh', 'dev', 'cekBy', 'cekAt']],
  gaji: ['KJ Gaji', ['id', 'status', 'data', 'by', 'at', 'okBy', 'okAt']],
  doc: ['KJ Dokumen', ['id', 'isi', 'jobs', 'meta', 'by', 'at']]
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
  /* v2: nilai Baik/Cukup/Kurang (Peraturan Kerja Bab 4) */
  hasilB: 100, hasilC: 75, mutuB: 1, mutuC: 3, jobB: 90, jobC: 70, ujiMulai: '', ujiMinggu: 4, targetUnit: {},
  grade: {A: 9, B: 7, C: 5},
  /* v7 */
  hariKerja: [1, 2, 3, 4, 5, 6], jamMasuk: '08:00', jamPulang: '16:00', istirahat: '12:00-13:00', upahDef: 0, targetDef: 0, ws: {}, akses: null,
  /* v8: sistem upah & uang makan per workshop */
  sistemUpah: 'jam', tarif: {}, tarifDef: 0, makanMode: 'lama', makanJam: 6.5, makanRp: 7500, tunjOn: true, korAjuan: false,
  /* v9: true = hasil potong dicatat dari menu Produksi (setor potong ditolak); null = bawaan (workshop bernama Kedawung) */
  potongProd: null
};
const KJ_KERJA = ['jahit', 'potong', 'hasil', 'qc'];
const KJ_KEG = ['Menunggu bahan', 'Bantu packing', 'Bantu bagian lain', 'Belanja', 'Mesin / alat bermasalah', 'Bersih-bersih', 'Lainnya'];
const KJ_ALASAN = ['Jahitan lepas', 'Jahitan miring', 'Kotor / noda', 'Sablon rusak', 'Ukuran salah', 'Bahan cacat', 'Lainnya'];

function kinerja_(a, u) {
  const act = String(a[0] || ''), p = a[1] || {};
  if (act === 'ping') return {v: KJ_V};
  if (peran_(u) === 'owner' && !kjAdaOwner_()) PropertiesService.getScriptProperties().setProperty('adaOwner', '1');
  const anyK = ['kinerja_input', 'kinerja_cek', 'kinerja_gaji'].some(function (k) { return has_(u, k); }) || peran_(u) === 'supervisor';
  if (!anyK) throw new Error('Akses ditolak: akun Anda tidak punya izin Gaji & Kinerja.');
  switch (act) {
    case 'load': kjMigrasiV8_(); return kjLoad_(p, u);
    case 'jobs': return kjJobsAll_(u);
    case 'docGet': return kjDocGet_();
    case 'docSave': return kjDocSave_(p, u);
    case 'sopSave': return kjSopSave_(p, u);
    case 'beri': return kjBeri_(p, u);
    case 'pin': butuh_(u, 'jobdesk'); kjKarWs_(kjAuthK_(p), u); return {ok: 1};
    case 'setor': return kjSetor_(p, u);
    case 'catat': return kjCatat_(p, u);
    case 'cek': return kjCek_(p, u);
    case 'putus': return kjPutus_(p, u);
    case 'minus': return kjMinus_(p, u);
    case 'hapusAkt': return kjHapusAkt_(p, u);
    case 'karSave': return kjKarSave_(p, u);
    case 'cfgSave': return kjCfgSave_(p, u);
    case 'gajiSave': return kjGajiSave_(p, u);
    case 'gajiGet': hanyaOwner_(u); return kjGajiGet_(String(p.week || ''));
    case 'gajiTotal': hanyaOwner_(u); return kjGajiTotal_(String(p.week || ''));
    case 'ckGet': return kjCkGet_(p, u);
    case 'ckSave': return kjCkSave_(p, u);
    case 'ckKor': return kjCkKor_(p, u);
    case 'ckPutus': return kjCkPutus_(p, u);
    case 'migrasi': return kjMigrasi_(u);
    case 'rekap': return kjRekap_(p, u);
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
/* v7: aturan gaji & nilai disimpan per workshop (cfg.ws[gudang]); yang belum diisi memakai aturan umum lama */
const KJ_WS_KEYS = ['poin', 'poinDef', 'makan', 'batas', 'penuh', 'setengah', 'jumBatas', 'jumPenuh', 'jumSetengah', 'hadir', 'kerja', 'hasilTangga', 'mutuTangga',
  'telatMaks', 'cekMin', 'hasilB', 'hasilC', 'mutuB', 'mutuC', 'jobB', 'jobC', 'ujiMulai', 'ujiMinggu', 'targetUnit', 'grade', 'hariKerja', 'jamMasuk', 'jamPulang', 'istirahat', 'upahDef', 'targetDef',
  'sistemUpah', 'tarif', 'tarifDef', 'makanMode', 'makanJam', 'makanRp', 'tunjOn', 'korAjuan', 'potongProd'];
/* v9: di workshop ini hasil potong dicatat dari menu Produksi? */
function potongProd_(u, ws) {
  if (!ws) return false;
  const c = kjCfg_(ws);
  if (c.potongProd === true || c.potongProd === false) return c.potongProd;
  const g = (posInfo_(u).gudang || []).filter(function (x) { return String(x.id) === String(ws); })[0];
  return /kedawung/i.test(String(g ? g.name : ''));
}
function kjCfgRaw_() {
  const c = kjJ_(PropertiesService.getScriptProperties().getProperty('KJ_CFG'), {});
  const o = JSON.parse(JSON.stringify(KJ_CFG_DEF));
  Object.keys(c).forEach(function (k) { o[k] = c[k]; });
  return o;
}
function kjCfg_(ws) {
  const o = kjCfgRaw_(), w = ws != null ? ws : REQ.ws, x = w && o.ws && o.ws[w];
  if (x) KJ_WS_KEYS.forEach(function (k) { if (x[k] !== undefined) o[k] = x[k]; });
  o.wsAktif = w || '';
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
  if (n >= 5) throw new Error('PIN salah terlalu sering. Coba lagi 10 menit lagi atau minta supervisor mereset PIN.');
  if (!k.pinh) throw new Error('PIN ' + k.nama + ' belum dibuat. Minta Owner membuatnya di menu Atur.');
  if (hash_('kj:' + k.id, pin) !== String(k.pinh)) { c.put(ck, String(n + 1), 600); throw new Error('PIN salah.'); }
  c.remove(ck);
  return k;
}

/* ---------------- gudang ---------------- */
/* gudang akun yang login: dari Atur > Gudang per akun; belum diatur -> Owner semua gudang, akun lain gudang bawaan */
/* v7: Owner & Admin bebas memilih workshop lewat menu (tanpa pilihan = semua);
   Supervisor & Staf terkunci di workshop akunnya, dan harus sudah diatur Owner */
function kjGud_(u, cfg) {
  const m = cfg.akun || {}, k = String(u.user || '').toLowerCase(), map = m[k] ? String(m[k]) : '', R = peran_(u);
  if (R === 'owner' || R === 'admin' || owner_(u)) return REQ.ws || '';
  if (!map) throw new Error('WS_BELUM Akun "' + u.user + '" belum diberi workshop. Minta Owner mengaturnya di Kinerja → Atur → Workshop per akun.');
  if (REQ.ws && REQ.ws !== map) throw new Error('WS_LAIN:' + map);
  return map;
}
/* karyawan yang diproses harus dari workshop yang sedang dibuka */
function kjKarWs_(k, u) { const cfg = kjCfg_(), g = kjGud_(u, cfg); if (g && kjKarGud_(k, cfg) !== g) throw new Error(k.nama + ' bukan karyawan workshop ini.'); return k; }
function kjKarGud_(k, cfg) { return String(k.gud || cfg.loc || ''); }
/* jumlah setoran jahit yang belum selesai disetujui, per "tahap|gudang|varian" */
function kjPend_(rows) {
  const o = {};
  rows.forEach(function (x) {
    if (x.jenis !== 'setor' || (x.status !== 'tunggu' && x.status !== 'proses')) return;
    const d = kjJ_(x.data, {}), t = String(d.tahap || 'jahit'), key = t + '|' + String(d.loc || '') + '|' + String(d.vid) + (t === 'jahit' ? '|' + String(d.src || '') : '');
    o[key] = (o[key] || 0) + (+d.q || 0);
  });
  return o;
}

/* ---------------- baca data ---------------- */
function kjKarOut_(k, gaji) {
  return {id: String(k.id), cid: String(k.cid || ''), nama: k.nama, bagian: k.bagian, kerja: String(k.kerja || '').split(',').filter(Boolean),
    hasil: k.hasil || '', satuan: k.satuan || 'pcs', area: k.area || '', upah: gaji ? (+k.upah || 0) : undefined,
    target: +k.target || 0, jobdesk: k.jobdesk || '', cek: kjJ_(k.cek, []), pin: !!k.pinh, urut: +k.urut || 0,
    gud: String(k.gud || ''), unit: String(k.unit || ''), posisi: String(k.posisi || ''), sistem: String(k.sistem || ''), on: String(k.on) !== '0'};
}
function kjLoad_(p, u) {
  const cfg = kjCfg_(), gaji = owner_(u), cek = boleh_(u, 'periksa', cfg);
  const gud = kjGud_(u, cfg), info = posInfo_(u);
  const kar = kjRows_('kar').filter(function (k) { return String(k.on) !== '0' && (!gud || kjKarGud_(k, cfg) === gud); }).map(function (k) {
    return kjKarOut_(k, gaji);
  }).sort(function (a, b) { return a.urut - b.urut || String(a.nama).localeCompare(String(b.nama)); });
  const ks = {};
  kar.forEach(function (k) { ks[k.id] = 1; });
  const from = String(p.from || ''), all = kjRows_('akt', 8000);
  const akt = all.filter(function (x) {
    if (gud && !ks[String(x.kid)]) return false;
    if (x.jenis === 'setor' && (x.status === 'tunggu' || x.status === 'proses')) return true;
    if (x.jenis === 'beri' && x.status === 'aktif') return true;
    return !from || String(x.tgl) >= from;
  }).map(function (x) { return {id: x.id, tgl: x.tgl, kid: String(x.kid), jenis: x.jenis, d: kjJ_(x.data, {}), st: x.status, oleh: x.oleh, cekBy: x.cekBy, cekAt: x.cekAt}; });
  /* v3: p.lite = daftar barang produksi diambil terpisah (aksi 'jobs') supaya membuka menu lebih cepat */
  const jobs = p.lite ? {list: null, noLoc: null} : posK_(u, 'hrdJobs', {gud: gud, pend: kjPend_(all), v: 4});
  /* aturan uang (upah, tunjangan, uang makan) hanya untuk Owner */
  const cf = JSON.parse(JSON.stringify(cfg));
  if (!gaji) { ['makan', 'hadir', 'kerja', 'upahDef', 'ws', 'akun', 'tarif', 'tarifDef', 'makanRp'].forEach(function (k) { delete cf[k]; }); }
  const out = {v: KJ_V, hrd: HRD_V, cfg: cf, kar: kar, akt: akt, jobs: jobs.list, keg: KJ_KEG, alasan: KJ_ALASAN, sop: kjSopGet_(),
    potongProd: potongProd_(u, gud || REQ.ws),
    me: {cek: cek, gaji: gaji, input: boleh_(u, 'jobdesk', cfg), beri: boleh_(u, 'beri', cfg), lembar: boleh_(u, 'lembar', cfg), karyawan: boleh_(u, 'karyawan', cfg),
      peran: owner_(u) ? 'owner' : peran_(u), gud: gud, ws: REQ.ws, user: String(u.user || ''), name: String(u.name || '')},
    gudang: info.gudang, aksesDef: KJ_AKSES_DEF, aksesL: KJ_AKSES_L};
  if (gaji) out.akses = cfg.akses || KJ_AKSES_DEF;
  if (cek && jobs.noLoc != null) out.noLoc = jobs.noLoc;
  if (gaji) out.gaji = kjRows_('gaji').filter(function (g) { const i = String(g.id); return i.indexOf('|') < 0 || !REQ.ws || i.split('|')[1] === REQ.ws; })
    .map(function (g) { const i = String(g.id); return {id: i.split('|')[0], status: g.status, by: g.by, at: g.at, okBy: g.okBy, okAt: g.okAt, lama: i.indexOf('|') < 0 && !!REQ.ws}; });
  if (gaji || boleh_(u, 'karyawan', cfg)) { out.akun = (info.akun || []); }
  if (gaji) { out.pindah = !PropertiesService.getScriptProperties().getProperty('migrasi'); out.cfgAkun = kjCfgRaw_().akun || {}; }
  return out;
}
function kjPoin_(cfg, cat) {
  const k = String(cat || '').toLowerCase().trim();
  return cfg.poin[k] != null ? +cfg.poin[k] : (+cfg.poinDef || 1);
}

/* barang di tahap Cutting & Jahit untuk layar setor (dipanggil terpisah dari 'load') */
function kjJobsAll_(u) {
  const cfg = kjCfg_(), gud = kjGud_(u, cfg);
  const j = posK_(u, 'hrdJobs', {gud: gud, pend: kjPend_(kjRows_('akt', 8000)), v: 4});
  return {list: j.list, noLoc: boleh_(u, 'periksa', cfg) ? j.noLoc : null, potongProd: potongProd_(u, gud || REQ.ws)};
}

/* ---------------- setor jahit / potong ----------------
   jahit : dicatat "tunggu" atas nama unit; barang pindah Jahit -> Finishing saat supervisor menyetujui (kjSetorOk_)
   potong: (v5) juga ditampung "tunggu"; barang pindah Cutting -> Jahit saat supervisor menyetujui */
function kjSetor_(p, u) {
  butuh_(u, 'jobdesk');
  const k = kjKarWs_(kjAuthK_(p), u), st = String(p.tahap || '');
  const need = st === 'jahit' ? 'jahit' : st === 'cutting' ? 'potong' : '';
  if (!need) throw new Error('Tahap tidak valid.');
  if (k.kerja.indexOf(need) < 0) throw new Error(k.nama + ' bukan bagian ' + (need === 'jahit' ? 'jahit' : 'potong') + '.');
  const cfg = kjCfg_(), gud = kjGud_(u, cfg), kg = kjKarGud_(k, cfg);
  if (gud && kg !== gud) throw new Error(k.nama + ' bukan karyawan workshop ini.');
  if (st === 'cutting' && potongProd_(u, kg || gud)) throw new Error('Di workshop ini hasil potong dicatat dari menu Produksi saat barang dipindah ke Cutting. Setor potong tidak dipakai.');
  const unit = String(k.unit || '').trim() || k.nama;
  const want = {};
  (p.items || []).forEach(function (it) {
    const q = Math.floor(+it.q || 0), loc = String(it.loc || '');
    if (q <= 0) return;
    if (gud && loc !== gud) throw new Error('Barang ini bukan dari workshop akun ini. Muat ulang halaman.');
    if (kg && loc !== kg) throw new Error(k.nama + ' hanya bisa setor barang di workshopnya sendiri.');
    /* v9: jahit dipisah per jatah unit (src); aplikasi lama tanpa src = jatah unit sendiri dulu (ditentukan di bawah) */
    const src = st === 'jahit' ? (it.src === undefined || it.src === null ? null : String(it.src).slice(0, 60)) : '';
    const key = loc + '|' + String(it.vid) + (st === 'jahit' ? '|' + (src === null ? '\u0000' : src) : '');
    want[key] = (want[key] || 0) + q;
  });
  if (!Object.keys(want).length) throw new Error('Isi jumlah yang disetor.');
  const sep = function (key) { const a = key.split('|'); return {loc: a[0], vid: a[1], src: a.length > 2 ? a.slice(2).join('|') : ''}; };

  const jobs = posK_(u, 'hrdJobs', {gud: gud, pend: {}, v: 4}).list.filter(function (j) { return j.st === st; });
  /* aplikasi lama (tanpa src): ambil dari jatah unit sendiri bila cukup, kalau tidak dari barang belum dibagi */
  Object.keys(want).forEach(function (key) {
    const x = sep(key);
    if (x.src !== '\u0000') return;
    const own = jobs.filter(function (y) { return y.loc === x.loc && y.vid === x.vid && String(y.pj || '') === unit; })[0];
    const nk = x.loc + '|' + x.vid + '|' + (own && own.qty >= want[key] ? unit : '');
    want[nk] = (want[nk] || 0) + want[key];
    delete want[key];
  });
  return kjLock_(function () {
    const pend = kjPend_(kjRows_('akt', 8000)), now = new Date().toISOString(), log = [];
    Object.keys(want).forEach(function (key) {
      const x = sep(key), j = jobs.filter(function (y) { return y.loc === x.loc && y.vid === x.vid && (st !== 'jahit' || String(y.pj || '') === x.src); })[0] || {qty: 0, name: '', cat: ''};
      const sisa = j.qty - (pend[st + '|' + key] || 0);
      if (want[key] > sisa) throw new Error('Setor ' + (j.name || 'barang') + ' melebihi yang ada di ' + (st === 'jahit' ? (x.src ? 'jatah ' + x.src : 'Jahit (belum dibagi)') : 'Cutting') + ' (sisa ' + Math.max(0, sisa) + ' pcs, sudah dikurangi setoran yang menunggu). Muat ulang halaman.');
      const dt = {tahap: st, vid: x.vid, nama: j.name, q: want[key], cat: j.cat || '', poin: kjPoin_(cfg, j.cat), loc: x.loc, unit: st === 'jahit' ? unit : k.nama};
      if (st === 'jahit') { dt.src = x.src; if (x.src && x.src !== unit) dt.luar = 1; }
      log.push({id: kjId_(), tgl: now, kid: k.id, jenis: 'setor', data: dt, status: 'tunggu', oleh: k.nama, dev: u.user});
    });
    kjAppend_('akt', log);
    return {ok: 1, n: log.length, tunggu: 1};
  });
}

/* Supervisor menyetujui satu setoran jahit: kunci dulu (status "proses"), minta server POS memindahkan
   barang Jahit -> Finishing, lalu tandai "ok". q = jumlah hasil cek fisik (kosong = sesuai setoran). */
function kjSetorOk_(id, ok, q, note, u, cfg, gud) {
  const now = new Date().toISOString();
  let c = null;
  kjUpdAkt_([id], function (o) {
    if (o.jenis !== 'setor') return false;
    if (o.status !== 'tunggu') throw new Error('Setoran ini sudah diproses (' + o.status + '). Muat ulang halaman.');
    if (gud && String(o.data.loc || '') !== gud) throw new Error('Setoran ini bukan dari workshop Anda.');
    o.cekBy = u.name; o.cekAt = now;
    if (!ok) { o.status = 'tolak'; o.data.tolak = note || 'ditolak supervisor'; return; }
    o.status = 'proses';
    c = JSON.parse(JSON.stringify(o));
  });
  if (!ok) return {};
  const d = c.data, want = q != null ? q : (+d.q || 0);
  const back = function () { kjUpdAkt_([id], function (o) { o.status = 'tunggu'; o.cekBy = ''; o.cekAt = ''; }); };
  if (q != null && q > (+d.q || 0)) { back(); throw new Error('Jumlah disetujui tidak boleh melebihi yang disetor (' + d.q + ' pcs).'); }
  let r;
  if (d.tahap === 'cutting') {
    try {
      const pr = posK_(u, 'hrdPotong', {nama: c.oleh, items: [{loc: d.loc || '', vid: d.vid, q: want}]});
      r = {moved: +((pr.items || [])[0] || {}).moved || 0, err: ''};
    } catch (e) { back(); throw e; }
  } else try {
    r = posK_(u, 'hrdMove', {loc: d.loc || '', vid: d.vid, q: want, unit: d.unit || c.oleh, src: d.src === undefined ? null : String(d.src || ''),
      note: 'Setor ' + (d.unit || c.oleh) + ' via HRD, disetujui ' + u.name + (q != null && q !== +d.q ? ' (koreksi ' + d.q + ' → ' + q + ' pcs)' : '')});
  } catch (e) { back(); throw e; }
  const moved = +r.moved || 0, err = r.err || '';
  if (!moved) {
    back();
    if (err) throw new Error(err);
    throw new Error(d.nama + ' sudah tidak ada di tahap ' + (d.tahap === 'cutting' ? 'Cutting' : 'Jahit') + ' workshop ini. Tolak setoran ini, atau cek menu Produksi.');
  }
  kjUpdAkt_([id], function (o) {
    o.status = 'ok'; o.cekBy = u.name; o.cekAt = now;
    if (moved !== +o.data.q) { o.data.qAsli = o.data.q; o.data.q = moved; }
    if (moved < want) o.data.catatan = 'Hanya ' + moved + ' dari ' + want + ' pcs yang dipindah' + (err ? ': ' + err : ' (sisanya sudah tidak ada di Jahit)');
  });
  return {msg: moved < want ? d.nama + ': hanya ' + moved + ' dari ' + want + ' pcs yang dipindah ke ' + (d.tahap === 'cutting' ? 'Jahit' : 'Finishing') + '.' : ''};
}

/* ---------------- pindah data sekali dari server POS (Owner) ---------------- */
function kjMigrasi_(u) {
  hanyaOwner_(u);
  const P = PropertiesService.getScriptProperties();
  if (P.getProperty('migrasi')) throw new Error('Data sudah pernah dipindahkan.');
  const d = posK_(u, 'hrdExport', {});
  return kjLock_(function () {
    const ada = {};
    kjRows_('kar').forEach(function (k) { ada[String(k.id)] = 1; });
    const baru = (d.kar || []).filter(function (k) { return k.id && !ada[String(k.id)]; }).map(function (k) { k.pinh = ''; return k; });
    kjAppend_('kar', baru);
    const c = d.cfg || {};
    P.setProperty('KJ_CFG', JSON.stringify(c));
    P.setProperty('migrasi', new Date().toISOString());
    return {ok: 1, kar: baru.length};
  });
}

/* ---------------- catatan lain dari HP area ---------------- */
function kjCatat_(p, u) {
  butuh_(u, 'jobdesk');
  const k = kjKarWs_(kjAuthK_(p), u), j = String(p.jenis || ''), now = new Date().toISOString();
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
    const it = String(p.item || '').slice(0, 160); if (!it) throw new Error('Tugas kosong.');
    const day = now.slice(0, 10);
    const sudah = kjRows_('akt', 3000).some(function (x) { return String(x.kid) === k.id && x.jenis === 'tugas' && x.status !== 'tolak' && x.status !== 'batal' && kjJ_(x.data, {}).item === it && kjDay_(x.tgl) === kjDay_(now); });
    if (sudah) return {ok: 1, dup: 1};
    d = {item: it};
    st = 'tunggu';
  } else if (j === 'kegiatan') {
    const lb = String(p.label || '').slice(0, 60); if (!lb) throw new Error('Pilih kegiatan.');
    d = {label: lb, ket: String(p.ket || '').slice(0, 120)};
    /* v6: pekerjaan lain bisa diberi jumlah, mis. Unboxing 4 paket */
    const q = Math.round((+p.q || 0) * 100) / 100;
    if (q > 0) { d.q = q; d.sat = String(p.sat || '').slice(0, 12); }
    if (p.grup) d.grup = String(p.grup).slice(0, 20);
    st = 'tunggu';
  } else if (j === 'kerja') {
    d = kjKerjaCek_(p, k, now);
    if (d.dup) return {ok: 1, dup: 1, oleh: d.oleh};
    st = 'tunggu';
  } else throw new Error('Jenis catatan tidak dikenal.');
  const id = kjId_();
  kjLock_(function () { kjAppend_('akt', [{id: id, tgl: now, kid: k.id, jenis: j, data: d, status: st, oleh: k.nama, dev: u.user}]); });
  /* tugas tambahan yang sudah dikerjakan tidak terbawa lagi */
  if (j === 'kerja' && d.src === 'beri') try { kjUpdAkt_([d.ref], function (o) { if (o.jenis !== 'beri') return false; o.status = 'selesai'; }); } catch (e) {}
  return {ok: 1, a: {id: id, tgl: now, kid: k.id, jenis: j, d: d, st: st, oleh: k.nama}};
}
/* ---------------- v6: SOP & tanggung jawab ----------------
   Disimpan sebagai satu baris 'sop' di sheet KJ Dokumen (kolom isi = JSON). */
const SOP_DEF = {"divisi": ["Produksi", "Finishing & QC", "Gudang & Bahan", "Pengiriman & Belanja", "Admin / Toko online", "Umum"], "tj": [{"id": "tj1", "nama": "Pengelola stok bahan baku", "divisi": "Gudang & Bahan", "orang": [], "kerja": [{"id": "tj1a", "nama": "Terima & tata barang datang", "kapan": "terjadi", "sop": "SOP-GB-01", "baik": ""}, {"id": "tj1b", "nama": "Layani pengambilan bahan", "kapan": "terjadi", "sop": "SOP-GB-02", "baik": ""}, {"id": "tj1c", "nama": "Hitung stok bergilir", "kapan": "harian", "sop": "SOP-GB-03", "baik": ""}, {"id": "tj1d", "nama": "Cek & lapor stok menipis", "kapan": "harian", "sop": "", "baik": "Request order dibuat untuk bahan yang di bawah minimum"}, {"id": "tj1e", "nama": "Rapikan rak bahan", "kapan": "mingguan", "sop": "", "baik": "Rak rapi, label terbaca, tidak ada bahan di lantai", "hari": 6}]}, {"id": "tj2", "nama": "Pengelola gudang barang jadi", "divisi": "Gudang & Bahan", "orang": [], "kerja": [{"id": "tj2a", "nama": "Masukkan barang jadi ke rak", "kapan": "harian", "sop": "", "baik": "Barang jadi hari itu sudah di rak sesuai kode"}, {"id": "tj2b", "nama": "Ambilkan barang untuk packing", "kapan": "terjadi", "sop": "", "baik": ""}, {"id": "tj2c", "nama": "Hitung stok barang jadi bergilir", "kapan": "harian", "sop": "SOP-GB-03", "baik": ""}, {"id": "tj2d", "nama": "Rapikan rak barang jadi", "kapan": "mingguan", "sop": "", "baik": "", "hari": 6}]}, {"id": "tj3", "nama": "Pengiriman, belanja & vendor", "divisi": "Pengiriman & Belanja", "orang": [], "kerja": [{"id": "tj3a", "nama": "Kirim paket hari ini", "kapan": "harian", "sop": "SOP-PB-01", "baik": ""}, {"id": "tj3b", "nama": "Belanja sesuai daftar", "kapan": "terjadi", "sop": "", "baik": "Barang sesuai daftar, nota lengkap"}, {"id": "tj3c", "nama": "Ambil barang ke vendor", "kapan": "terjadi", "sop": "", "baik": "Barang dicek di tempat vendor sebelum dibawa pulang"}, {"id": "tj3d", "nama": "Serahkan nota ke admin", "kapan": "terjadi", "sop": "", "baik": "Nota diserahkan di hari yang sama"}]}, {"id": "tj4", "nama": "Kebersihan & K3 area", "divisi": "Umum", "orang": [], "kerja": [{"id": "tj4a", "nama": "Bersihkan area kerja bersama", "kapan": "harian", "sop": "", "baik": "Lantai dan meja bersama bersih sebelum pulang"}, {"id": "tj4b", "nama": "Buang sampah & sisa kain", "kapan": "harian", "sop": "", "baik": ""}, {"id": "tj4c", "nama": "Cek kotak P3K, kabel & alat pemadam", "kapan": "mingguan", "sop": "", "baik": "Isi P3K lengkap, tidak ada kabel terkelupas", "hari": 6}]}, {"id": "tj5", "nama": "Perawatan mesin", "divisi": "Produksi", "orang": [], "kerja": [{"id": "tj5a", "nama": "Cek & minyaki mesin", "kapan": "mingguan", "sop": "", "baik": "Semua mesin dicek dan diminyaki", "hari": 6}, {"id": "tj5b", "nama": "Catat & lapor mesin rusak", "kapan": "terjadi", "sop": "", "baik": ""}, {"id": "tj5c", "nama": "Atur jadwal servis", "kapan": "terjadi", "sop": "", "baik": ""}]}], "sop": [{"kode": "SOP-GB-01", "judul": "Terima & tata barang datang", "divisi": "Gudang & Bahan", "versi": 1, "tgl": "2026-11-26", "langkah": ["Cocokkan barang dengan daftar order: nama bahan, warna, jumlah, dan toko/vendor pengirim.", "Buka paket di meja terima, bukan di lantai. Pakai cutter hati-hati supaya bahan tidak tergores.", "Cek kondisi: cacat, basah, kotor, salah warna atau ukuran. Pisahkan yang bermasalah dan beri tanda.", "Hitung jumlah yang diterima dengan satuan yang sama seperti di sistem (roll, kg, pcs, cone).", "Beri label tanggal datang, lalu tata di rak sesuai kode. Barang lama di depan, barang baru di belakang (FIFO).", "Konfirmasi di aplikasi Stok Bahan Baku: Sampai gudang → Unboxing → Masuk rak, dengan jumlah yang diterima.", "Lipat kardus dan buang plastik. Area terima kosong kembali."], "cek": [{"label": "Jumlah diterima", "jenis": "pilihan", "opsi": ["Sesuai order", "Kurang", "Lebih"]}, {"label": "Kondisi barang", "jenis": "pilihan", "opsi": ["Baik", "Ada cacat"]}, {"label": "Keterangan", "jenis": "teks"}], "baik": "Selesai di hari barang datang, jumlah tercatat di sistem, rak rapi, area terima bersih."}, {"kode": "SOP-GB-02", "judul": "Pengambilan bahan (barang keluar)", "divisi": "Gudang & Bahan", "versi": 1, "tgl": "2026-11-26", "langkah": ["Bahan hanya diambil oleh penanggung jawab stok, atau dengan sepengetahuannya.", "Tanyakan untuk order atau pekerjaan apa, dan berapa jumlahnya.", "Ambil bahan yang paling lama dulu (FIFO).", "Hitung atau timbang sebelum diserahkan, lalu catat pengambilan di aplikasi Stok Bahan Baku saat itu juga (nama pengambil dan jumlah).", "Sisa bahan yang dikembalikan dicatat sebagai pengembalian.", "Bila stok setelah diambil sudah di bawah batas minimum, buat request order di aplikasi."], "cek": [{"label": "Bahan & jumlah", "jenis": "teks"}, {"label": "Dicatat di aplikasi", "jenis": "pilihan", "opsi": ["Sudah", "Belum"]}], "baik": "Setiap bahan keluar tercatat di hari yang sama; tidak ada pengambilan tanpa catatan."}, {"kode": "SOP-GB-03", "judul": "Hitung stok bergilir", "divisi": "Gudang & Bahan", "versi": 1, "tgl": "2026-11-26", "langkah": ["Pilih 5–10 barang hari ini: yang baru datang, ditambah yang paling lama belum dihitung.", "Hitung fisik dulu, tanpa melihat angka di sistem.", "Bandingkan dengan angka di aplikasi.", "Bila berbeda, hitung ulang sekali. Bila tetap berbeda, catat selisihnya. Jangan mengubah stok sendiri.", "Rapikan rak barang yang sudah dihitung."], "cek": [{"label": "Barang dihitung", "jenis": "angka"}, {"label": "Barang yang selisih", "jenis": "angka"}, {"label": "Rincian selisih", "jenis": "teks"}], "baik": "Dikerjakan setiap hari, selisih dilaporkan ke Owner, tidak ada perubahan stok tanpa persetujuan."}, {"kode": "SOP-PR-01", "judul": "Setor hasil jahit", "divisi": "Produksi", "versi": 1, "tgl": "2026-11-26", "langkah": ["Setor setiap hari sebelum pulang, hanya barang yang benar-benar sudah selesai dijahit.", "Cek ukuran dan jahitan dulu. Yang belum rapi jangan disetor.", "Kumpulkan hasil per order di rak setor, beri kertas nama unit.", "Buka menu Jobdesk di HP workshop, pilih nama, masukkan PIN pribadi.", "Isi jumlah per barang sesuai hitungan fisik, lalu tekan Setor.", "Serahkan barang ke supervisor untuk dihitung dan disetujui."], "cek": [], "baik": "Disetor sebelum pulang, jumlah cocok saat dihitung supervisor, reject unit 0–1 pcs seminggu."}, {"kode": "SOP-PR-02", "judul": "Potong kain", "divisi": "Produksi", "versi": 1, "tgl": "2026-11-26", "langkah": ["Ambil order sesuai urutan prioritas di Lembar Kerja Produksi.", "Cek bahan: jenis, warna, dan arah serat sesuai order. Ambil bahan lewat penanggung jawab stok.", "Gelar kain rata tanpa ditarik. Tinggi tumpukan sesuai batas aman mesin.", "Pasang pola sesuai ukuran. Hemat bahan: pola besar dulu, sisa untuk pola kecil.", "Potong, lalu ikat per ukuran dan beri label order, ukuran, dan jumlah.", "Kumpulkan sisa kain yang masih bisa dipakai di tempat sisa, lalu setor hasil potong lewat HP."], "cek": [], "baik": "Ukuran sesuai pola, jumlah sesuai order, label lengkap, sisa kain terkumpul."}, {"kode": "SOP-PR-03", "judul": "Press DTF", "divisi": "Produksi", "versi": 1, "tgl": "2026-11-26", "langkah": ["Nyalakan mesin press. Atur suhu, tekanan, dan waktu sesuai jenis film dan kaos [isi standar].", "Cek desain, ukuran, dan posisi sesuai order sebelum mulai.", "Bersihkan permukaan kaos dari bulu dan debu, lalu pre-press beberapa detik.", "Tempel film tepat posisi (ukur dari kerah), press, lalu kupas sesuai jenis film (panas atau dingin).", "Cek hasil: tidak mengelupas, tidak miring, tidak gosong. Yang gagal dicatat sebagai reject.", "Matikan mesin setelah selesai dan rapikan sisa film."], "cek": [], "baik": "Posisi dan ukuran sesuai, tidak mengelupas saat dicek tarik, reject dicatat."}, {"kode": "SOP-FQ-01", "judul": "Packing & QC", "divisi": "Finishing & QC", "versi": 1, "tgl": "2026-11-26", "langkah": ["Cek setiap pcs: jahitan, sablon, noda, dan ukuran sesuai label.", "Yang lolos: lipat sesuai standar, masukkan plastik, beri label ukuran.", "Yang tidak lolos: catat reject di HP (alasan dan unit asal jahitan), taruh di rak reject.", "Hitung jumlah per order dan cocokkan dengan pesanan sebelum dikemas.", "Kemas per order dan tempel label nama pemesan."], "cek": [], "baik": "Tidak ada barang cacat lolos ke pelanggan, jumlah per order cocok, reject tercatat dengan unit asalnya."}, {"kode": "SOP-PB-01", "judul": "Kirim paket", "divisi": "Pengiriman & Belanja", "versi": 1, "tgl": "2026-11-26", "langkah": ["Cek daftar paket yang harus dikirim hari ini dan batas waktu kirim marketplace.", "Cocokkan isi paket dengan pesanan (produk, ukuran, jumlah) sebelum ditutup.", "Kemas rapi dan aman. Tempel resi di sisi atas, pastikan barcode terbaca.", "Kelompokkan paket per ekspedisi dan hitung jumlahnya.", "Antar ke ekspedisi sebelum jam tutup, minta bukti serah terima atau scan.", "Laporkan jumlah paket terkirim dan yang tertunda ke admin."], "cek": [{"label": "Paket dikirim", "jenis": "angka"}, {"label": "Paket tertunda", "jenis": "angka"}, {"label": "Keterangan", "jenis": "teks"}], "baik": "Semua paket hari itu terkirim sebelum batas waktu, bukti serah terima ada."}], "lain": [["Terima barang datang", "paket", "Gudang"], ["Unboxing", "paket", "Gudang"], ["Tata bahan ke rak stok", "item", "Gudang"], ["Masukkan barang jadi ke rak", "pcs", "Gudang"], ["Ambil / antar bahan ke bagian lain", "", "Gudang"], ["Hitung stok", "item", "Gudang"], ["Potong DTF", "lembar", "Produksi"], ["Press / sablon", "pcs", "Produksi"], ["Bantu potong kain", "pcs", "Produksi"], ["Sortir ukuran", "pcs", "Produksi"], ["Pasang label / hangtag", "pcs", "Produksi"], ["Lipat & packing", "pcs", "Produksi"], ["Bantu QC", "pcs", "Produksi"], ["Siapkan paket & resi", "paket", "Pengiriman"], ["Antar paket ke ekspedisi", "paket", "Pengiriman"], ["Belanja", "", "Pengiriman"], ["Ambil barang ke vendor", "", "Pengiriman"], ["Bersih-bersih area", "", "Umum"], ["Servis / perbaiki mesin", "", "Umum"], ["Menunggu bahan", "", "Kendala"], ["Mesin / alat rusak", "", "Kendala"], ["Listrik mati", "", "Kendala"]]};
function kjSopGet_() {
  const r = kjRows_('doc').filter(function (x) { return String(x.id) === 'sop'; })[0];
  if (!r) { const d = JSON.parse(JSON.stringify(SOP_DEF)); d.bawaan = true; return d; }
  const d = kjJ_(r.isi, null) || JSON.parse(JSON.stringify(SOP_DEF));
  d.by = r.by; d.at = r.at; return d;
}
function kjSopSave_(p, u) {
  hanyaOwner_(u);
  const S = function (v, n) { return String(v == null ? '' : v).trim().slice(0, n); };
  const lama = kjSopGet_(), lm = {};
  (lama.sop || []).forEach(function (x) { lm[x.kode] = x; });
  const today = kjDay_(new Date().toISOString()), kar = {};
  kjRows_('kar').forEach(function (k) { kar[String(k.id)] = 1; });
  const divisi = (p.divisi || []).map(function (x) { return S(x, 40); }).filter(Boolean).slice(0, 20);
  const sop = (p.sop || []).slice(0, 80).map(function (x) {
    const o = {kode: S(x.kode, 20).toUpperCase(), judul: S(x.judul, 80), divisi: S(x.divisi, 40),
      langkah: (x.langkah || []).map(function (l) { return S(l, 400); }).filter(Boolean).slice(0, 30),
      cek: (x.cek || []).slice(0, 5).map(function (c) { const t = ['angka', 'pilihan', 'teks'].indexOf(c.jenis) >= 0 ? c.jenis : 'teks';
        const o2 = {label: S(c.label, 40), jenis: t}; if (t === 'pilihan') o2.opsi = (c.opsi || []).map(function (v) { return S(v, 30); }).filter(Boolean).slice(0, 6); return o2; }).filter(function (c) { return c.label; }),
      baik: S(x.baik, 300)};
    if (!o.kode || !o.judul) throw new Error('Setiap SOP perlu kode dan judul.');
    /* versi naik bila isi berubah */
    const l = lm[o.kode], isi = JSON.stringify([o.judul, o.langkah, o.cek, o.baik]);
    if (!l) { o.versi = 1; o.tgl = today; }
    else if (JSON.stringify([l.judul, l.langkah, l.cek, l.baik]) !== isi) { o.versi = (+l.versi || 1) + 1; o.tgl = today; }
    else { o.versi = +l.versi || 1; o.tgl = l.tgl || today; }
    return o;
  });
  const kodes = {}; sop.forEach(function (x) { if (kodes[x.kode]) throw new Error('Kode SOP ' + x.kode + ' dipakai dua kali.'); kodes[x.kode] = 1; });
  const tj = (p.tj || []).slice(0, 40).map(function (t, i) {
    const o = {id: S(t.id, 20) || ('tj' + Date.now().toString(36) + i), nama: S(t.nama, 60), divisi: S(t.divisi, 40),
      orang: (t.orang || []).map(String).filter(function (id) { return kar[id]; }).slice(0, 10),
      kerja: (t.kerja || []).slice(0, 20).map(function (k, j) {
        const kp = ['harian', 'mingguan', 'terjadi'].indexOf(k.kapan) >= 0 ? k.kapan : 'harian';
        const o2 = {id: S(k.id, 24) || ('kj' + Date.now().toString(36) + i + '_' + j), nama: S(k.nama, 80), kapan: kp, sop: S(k.sop, 20).toUpperCase(), baik: S(k.baik, 200)};
        if (kp === 'mingguan') o2.hari = Math.min(6, Math.max(0, Math.floor(+k.hari >= 0 ? +k.hari : 6)));
        if (o2.sop && !kodes[o2.sop]) o2.sop = '';
        return o2;
      }).filter(function (k) { return k.nama; })};
    if (!o.nama) throw new Error('Nama tanggung jawab kosong.');
    return o;
  });
  const lain = (p.lain || []).slice(0, 60).map(function (r) { return [S(r[0], 60), S(r[1], 12), S(r[2], 20) || 'Umum']; }).filter(function (r) { return r[0]; });
  const d = {divisi: divisi.length ? divisi : SOP_DEF.divisi, tj: tj, sop: sop, lain: lain};
  const at = new Date().toISOString();
  kjLock_(function () {
    const sh = kjSheet_('doc'), r = kjRows_('doc').filter(function (x) { return String(x.id) === 'sop'; })[0];
    const o = {id: 'sop', isi: JSON.stringify(d), jobs: '', meta: '', by: u.name, at: at};
    if (r) { const row = kjRow_('doc', o); sh.getRange(r._r, 1, 1, row.length).setValues([row]); } else kjAppend_('doc', [o]);
  });
  d.by = u.name; d.at = at;
  return {ok: 1, sop: d};
}
/* awal minggu kerja (Sabtu) untuk tanggal lokal */
function kjSabtu_(day) { const t = new Date(day + 'T00:00:00Z'); return new Date(t.getTime() - ((t.getUTCDay() + 1) % 7) * 864e5).toISOString().slice(0, 10); }
/* pekerjaan dari tanggung jawab (src tj) atau tugas tambahan (src beri) */
function kjKerjaCek_(p, k, now) {
  const src = String(p.src || ''), day = kjDay_(now), so = kjSopGet_(), L = kjRows_('akt', 4000);
  const cek = {};
  Object.keys(p.cek || {}).slice(0, 5).forEach(function (x) { cek[String(x).slice(0, 40)] = String(p.cek[x]).slice(0, 300); });
  let d;
  const aktif = function (x) { return x.jenis === 'kerja' && x.status !== 'tolak' && x.status !== 'batal'; };
  if (src === 'tj') {
    const t = (so.tj || []).filter(function (x) { return x.id === String(p.tj); })[0];
    if (!t) throw new Error('Tanggung jawab tidak ditemukan. Muat ulang halaman.');
    if (t.orang.indexOf(k.id) < 0) throw new Error(k.nama + ' bukan penanggung jawab ' + t.nama + '.');
    const w = (t.kerja || []).filter(function (x) { return x.id === String(p.ref); })[0];
    if (!w) throw new Error('Pekerjaan tidak ditemukan. Muat ulang halaman.');
    if (w.kapan !== 'terjadi') {
      const sb = kjSabtu_(day);
      const ada = L.filter(function (x) { if (!aktif(x)) return false; const o = kjJ_(x.data, {}); if (o.src !== 'tj' || o.ref !== w.id) return false;
        const xd = kjDay_(x.tgl); return w.kapan === 'harian' ? xd === day : kjSabtu_(xd) === sb; })[0];
      if (ada) return {dup: 1, oleh: ada.oleh};
    }
    d = {src: 'tj', tj: t.id, ref: w.id, item: w.nama, tjNama: t.nama, kapan: w.kapan};
    if (w.sop) d.sop = w.sop;
  } else if (src === 'beri') {
    const b = L.filter(function (x) { return String(x.id) === String(p.ref) && x.jenis === 'beri'; })[0];
    if (!b || b.status !== 'aktif') throw new Error('Tugas tambahan sudah tidak berlaku. Muat ulang halaman.');
    if (String(b.kid) !== k.id) throw new Error('Tugas ini untuk orang lain.');
    const ada = L.filter(function (x) { return aktif(x) && kjJ_(x.data, {}).ref === String(b.id); })[0];
    if (ada) return {dup: 1, oleh: ada.oleh};
    const bd = kjJ_(b.data, {});
    d = {src: 'beri', ref: String(b.id), item: bd.item, dari: b.oleh};
    if (bd.sop) d.sop = bd.sop;
  } else throw new Error('Jenis pekerjaan tidak dikenal.');
  if (d.sop) { const x = (so.sop || []).filter(function (y) { return y.kode === d.sop; })[0]; if (x) d.versi = x.versi; }
  d.cek = cek; d.ket = String(p.ket || '').slice(0, 200);
  return d;
}
/* tugas tambahan dari Owner atau supervisor (hanya karyawan di workshopnya; supervisor lain hanya oleh Owner) */
function kjBeri_(p, u) {
  butuh_(u, 'beri');
  const cfg = kjCfg_(), gud = kjGud_(u, cfg), owner = owner_(u);
  const k = kjRows_('kar').filter(function (x) { return String(x.id) === String(p.kid) && String(x.on) !== '0'; })[0];
  if (!k) throw new Error('Karyawan tidak ditemukan.');
  if (gud && kjKarGud_(k, cfg) !== gud) throw new Error(k.nama + ' bukan karyawan workshop Anda.');
  if (!owner && /supervisor/i.test(String(k.posisi || ''))) throw new Error('Tugas untuk supervisor hanya diberikan Owner.');
  const it = String(p.item || '').trim().slice(0, 160); if (!it) throw new Error('Tulis tugasnya.');
  const tg = /^\d{4}-\d{2}-\d{2}$/.test(String(p.tgl || '')) ? String(p.tgl) : kjDay_(new Date().toISOString());
  const so = kjSopGet_(), sop = String(p.sop || '').toUpperCase();
  const d = {item: it, tgl: tg};
  if (sop && (so.sop || []).some(function (x) { return x.kode === sop; })) d.sop = sop;
  const id = kjId_(), now = new Date().toISOString();
  kjLock_(function () { kjAppend_('akt', [{id: id, tgl: now, kid: String(k.id), jenis: 'beri', data: d, status: 'aktif', oleh: u.name, dev: u.user}]); });
  return {ok: 1, a: {id: id, tgl: now, kid: String(k.id), jenis: 'beri', d: d, st: 'aktif', oleh: u.name}};
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
function kjCekOk_(u) { butuh_(u, 'periksa'); }
function kjCek_(p, u) {
  kjCekOk_(u);
  const ok = !!p.ok, now = new Date().toISOString(), note = String(p.note || '').slice(0, 120);
  const ids = (p.ids || []).map(String), cfg = kjCfg_(), gud = kjGud_(u, cfg);
  if (!ids.length) throw new Error('Pilih data dulu.');
  const one = ids.length === 1 && p.q != null && p.q !== '';
  if (one && !(Math.floor(+p.q) === +p.q && +p.q >= 0)) throw new Error('Jumlah tidak valid.');
  const jenis = {}, kidOf = {}, KM = {}, owner = owner_(u);
  kjRows_('akt', 8000).forEach(function (x) { jenis[String(x.id)] = x.jenis; kidOf[String(x.id)] = String(x.kid); });
  kjRows_('kar').forEach(function (k) { KM[String(k.id)] = k; });
  /* laporan supervisor workshop hanya diperiksa Owner */
  if (!owner) ids.forEach(function (i) { const k = KM[kidOf[i]] || {}; if (/supervisor/i.test(String(k.posisi || ''))) throw new Error('Laporan ' + k.nama + ' (supervisor) hanya diperiksa Owner.'); });
  const PERIKSA = ['hasil', 'tugas', 'kegiatan', 'kerja'];
  const sIds = ids.filter(function (i) { return jenis[i] === 'setor'; }), hIds = ids.filter(function (i) { return PERIKSA.indexOf(jenis[i]) >= 0; });
  if (!sIds.length && !hIds.length) throw new Error('Data tidak ditemukan. Muat ulang halaman.');
  const out = {ok: 1, n: 0, msg: []};
  const balik = [];
  if (hIds.length) {
    out.n += kjUpdAkt_(hIds, function (o) {
      if (PERIKSA.indexOf(o.jenis) < 0) return false;
      if (gud && kjKarGud_(KM[String(o.kid)] || {}, cfg) !== gud) throw new Error('Laporan ini bukan dari workshop Anda.');
      o.status = ok ? 'ok' : 'tolak'; o.cekBy = u.name; o.cekAt = now;
      if (!ok) o.data.tolak = note || 'ditolak pemeriksa';
      if (!ok && o.jenis === 'kerja' && o.data.src === 'beri') balik.push(o.data.ref);
      if (ok && one && o.jenis === 'hasil') { o.data.qAsli = o.data.q; o.data.q = +p.q; }
    }).n;
  }
  /* pekerjaan dari tugas tambahan ditolak: tugasnya muncul lagi di HP */
  if (balik.length) try { kjUpdAkt_(balik, function (o) { if (o.jenis !== 'beri') return false; o.status = 'aktif'; }); } catch (e) {}
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
  butuh_(u, 'karyawan');
  const own = owner_(u), cfg = kjCfg_();
  /* karyawan baru otomatis masuk workshop menu yang sedang dibuka */
  const gud = String(p.gud || REQ.ws || '').slice(0, 40);
  if (gud && !posInfo_(u).gudang.some(function (g) { return String(g.id) === gud; })) throw new Error('Workshop tidak dikenal.');
  return kjLock_(function () {
    const L = kjRows_('kar'), id = String(p.id || '') || kjId_(), old = L.filter(function (x) { return String(x.id) === id; })[0] || {};
    if (old.id && REQ.ws && kjKarGud_(old, cfg) !== REQ.ws && !own) throw new Error(old.nama + ' bukan karyawan workshop ini.');
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
    const cek = (p.cek || []).map(function (x) { return String(x).trim().slice(0, 160); }).filter(Boolean).slice(0, 10);
    const row = {id: id, cid: String(p.cid || '').trim().slice(0, 10), nama: nama, bagian: String(p.bagian || '').slice(0, 60), kerja: kerja.join(','),
      hasil: String(p.hasil || '').slice(0, 40), satuan: String(p.satuan || 'pcs').slice(0, 15), area: String(p.area || '').slice(0, 30),
      /* upah hanya diubah Owner; karyawan baru memakai upah bawaan workshop */
      upah: own ? Math.max(0, +p.upah || 0) : (old.id ? (+old.upah || 0) : (+cfg.upahDef || 0)), target: Math.max(0, +p.target || 0), jobdesk: String(p.jobdesk || '').slice(0, 2000), cek: cek,
      pinh: pinh, on: p.on === false ? '0' : '1', urut: +p.urut || +old.urut || 0,
      gud: gud, unit: String(p.unit || '').trim().slice(0, 40), posisi: String(p.posisi || '').trim().slice(0, 60),
      /* sistem upah (kosong = ikut workshop) hanya diubah Owner */
      sistem: own ? (['jam', 'borongan'].indexOf(String(p.sistem || '')) >= 0 ? String(p.sistem) : '') : String(old.sistem || '')};
    kjPut_('kar', row);
    return {ok: 1, id: id, kar: kjKarOut_(row, own)};
  });
}
function kjCfgSave_(p, u) {
  hanyaOwner_(u);
  const c = kjCfgRaw_();
  if (p.akun !== undefined) {
    const a = {}, ada = {};
    posInfo_(u).gudang.forEach(function (g) { ada[String(g.id)] = 1; });
    Object.keys(p.akun || {}).forEach(function (k) { const v = String(p.akun[k] || ''); if (v && ada[v]) a[String(k).toLowerCase().slice(0, 40)] = v; });
    p.akun = a;
  }
  if (p.akses !== undefined) {
    const a = {};
    Object.keys(KJ_AKSES_DEF).forEach(function (k) { const x = (p.akses || {})[k] || {}; a[k] = {admin: !!x.admin, supervisor: !!x.supervisor, staf: !!x.staf}; });
    c.akses = a;
  }
  const ws = REQ.ws;
  Object.keys(KJ_CFG_DEF).forEach(function (k) {
    if (p[k] === undefined || k === 'akses' || k === 'ws') return;
    /* aturan gaji/nilai masuk ke workshop yang sedang dibuka */
    if (ws && KJ_WS_KEYS.indexOf(k) >= 0) { c.ws = c.ws || {}; c.ws[ws] = c.ws[ws] || {}; c.ws[ws][k] = p[k]; }
    else c[k] = p[k];
  });
  if (p.hariKerja !== undefined) {
    const h = (p.hariKerja || []).map(Number).filter(function (d) { return d >= 0 && d <= 6; });
    if (!h.length) throw new Error('Pilih minimal satu hari kerja.');
    if (ws) c.ws[ws].hariKerja = h; else c.hariKerja = h;
  }
  PropertiesService.getScriptProperties().setProperty('KJ_CFG', JSON.stringify(c));
  return {ok: 1, cfg: kjCfg_()};
}
/* v7: gaji disimpan per minggu per workshop (id = minggu|workshop). Data lama (id = minggu) tetap terbaca. */
function kjGajiId_(w) { return REQ.ws ? w + '|' + REQ.ws : w; }
function kjGajiGet_(w, persis) {
  const L = kjRows_('gaji'), id = kjGajiId_(w);
  let g = L.filter(function (x) { return String(x.id) === id; })[0], lama = false;
  if (!g && !persis && id !== w) { g = L.filter(function (x) { return String(x.id) === w; })[0]; lama = !!g; }
  return g ? {id: w, status: g.status, data: kjJ_(g.data, {}), by: g.by, at: g.at, okBy: g.okBy, okAt: g.okAt, lama: lama} : null;
}
/* ringkasan semua workshop untuk Owner */
function kjGajiTotal_(w) {
  return kjRows_('gaji').filter(function (x) { return String(x.id).split('|')[0] === w; }).map(function (x) {
    const d = kjJ_(x.data, {}), id = String(x.id);
    return {ws: id.indexOf('|') >= 0 ? id.split('|')[1] : '', status: x.status, total: +d.total || 0, n: +d.n || 0};
  });
}
function kjGajiSave_(p, u) {
  hanyaOwner_(u);
  const w = String(p.week || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(w)) throw new Error('Minggu tidak valid.');
  return kjLock_(function () {
    const old = kjGajiGet_(w, true), now = new Date().toISOString(), st = String(p.status || 'draf'), id = kjGajiId_(w);
    if (old && old.status === 'final' && st !== 'buka') throw new Error('Gaji minggu ini sudah disetujui dan dikunci. Buka kunci dulu.');
    if (st === 'buka') {
      if (!old) throw new Error('Belum ada data.');
      kjPut_('gaji', {id: id, status: 'draf', data: old.data, by: old.by, at: old.at, okBy: '', okAt: ''});
      return {ok: 1};
    }
    const data = p.data || {};
    if (JSON.stringify(data).length > 45000) throw new Error('Data terlalu besar.');
    kjPut_('gaji', {id: id, status: st === 'final' ? 'final' : 'draf', data: data, by: u.name, at: now,
      okBy: st === 'final' ? u.name : '', okAt: st === 'final' ? now : ''});
    return {ok: 1};
  });
}

/* sekali jalan: aturan awal Workshop Kedawung (g1) sesuai keputusan Owner — hanya mengisi yang belum diatur */
function kjMigrasiV8_() {
  const P = PropertiesService.getScriptProperties();
  if (P.getProperty('KJ_MIG_V8')) return;
  kjLock_(function () {
    if (P.getProperty('KJ_MIG_V8')) return;
    const c = kjCfgRaw_(); c.ws = c.ws || {}; const g = c.ws.g1 = c.ws.g1 || {};
    const D = {hariKerja: [6, 0, 1, 2, 3, 4], sistemUpah: 'borongan', makanMode: 'jam', makanJam: 6.5, makanRp: 7500, tunjOn: false, korAjuan: true};
    Object.keys(D).forEach(function (k) { if (g[k] === undefined) g[k] = D[k]; });
    P.setProperty('KJ_CFG', JSON.stringify(c)); P.setProperty('KJ_MIG_V8', '1');
  });
}
/* ======================= CEKLOK (v8) =======================
   raw = scan asli dari mesin {kid: {tanggal: ['08:01','12:00',...]}} — tidak pernah diubah
   kor = koreksi {kid: {tanggal: {m, i1, i2, p, status, why, by, at, st: 'ok'|'ajuan'|'tolak', ajuBy}}} */
function kjCkWeek_(w) { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(w || ''))) throw new Error('Minggu tidak valid.'); if (!REQ.ws) throw new Error('Buka dari menu Kinerja workshop.'); return String(w) + '|' + REQ.ws; }
function kjCkRow_(id) { const g = kjRows_('ck').filter(function (x) { return String(x.id) === id; })[0]; return g ? {raw: kjJ_(g.raw, {}), kor: kjJ_(g.kor, {}), file: g.file, periode: g.periode, by: g.by, at: g.at} : null; }
function kjCkTerkunci_(w) { const g = kjGajiGet_(w, true); if (g && g.status === 'final') throw new Error('Gaji minggu ini sudah disetujui dan dikunci. Buka kunci dulu.'); }
function kjCkGet_(p, u) {
  if (!owner_(u)) butuh_(u, 'periksa');
  kjGud_(u, kjCfg_());
  return kjCkRow_(kjCkWeek_(p.week)) || {raw: {}, kor: {}};
}
function kjCkSave_(p, u) {
  hanyaOwner_(u);
  const id = kjCkWeek_(p.week);
  kjCkTerkunci_(String(p.week));
  const raw = {};
  Object.keys(p.raw || {}).slice(0, 200).forEach(function (kid) {
    const o = {};
    Object.keys(p.raw[kid] || {}).slice(0, 7).forEach(function (d) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
      o[d] = (p.raw[kid][d] || []).map(String).filter(function (t) { return /^\d{1,2}:\d{2}$/.test(t); }).slice(0, 8);
    });
    raw[String(kid).slice(0, 40)] = o;
  });
  return kjLock_(function () {
    const old = kjCkRow_(id) || {kor: {}}, now = new Date().toISOString();
    const row = {id: id, raw: raw, kor: old.kor || {}, file: String(p.file || '').slice(0, 120), periode: String(p.periode || '').slice(0, 120), by: u.name, at: now};
    if (JSON.stringify(row).length > 48000) throw new Error('Data ceklok terlalu besar.');
    kjPut_('ck', row);
    return {raw: row.raw, kor: row.kor, file: row.file, periode: row.periode, by: row.by, at: now};
  });
}
function kjCkKor_(p, u) {
  const own = owner_(u), cfg = kjCfg_();
  if (!own) { butuh_(u, 'periksa'); if (!cfg.korAjuan) throw new Error('Koreksi ceklok workshop ini hanya oleh Owner.'); }
  const id = kjCkWeek_(p.week), day = String(p.day || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Tanggal tidak valid.');
  kjCkTerkunci_(String(p.week));
  const k = kjKarWs_(kjKar_(p.kid), u);
  if (!own && /supervisor/i.test(String(k.posisi || ''))) throw new Error('Koreksi ceklok supervisor hanya oleh Owner.');
  const why = String(p.why || '').trim().slice(0, 160); if (!why) throw new Error('Tulis alasan koreksi.');
  const T = function (v) { v = String(v || '').trim(); if (!v) return ''; if (!/^\d{1,2}:\d{2}$/.test(v)) throw new Error('Format jam harus JJ:MM.'); return v.length === 4 ? '0' + v : v; };
  const st = ['hadir', 'izin', 'sakit', 'alpa', 'libur'].indexOf(String(p.status || 'hadir')) >= 0 ? String(p.status || 'hadir') : 'hadir';
  const kr = {m: T(p.m), i1: T(p.i1), i2: T(p.i2), p: T(p.p), status: st, why: why, at: new Date().toISOString()};
  if (st === 'hadir' && (!kr.m || !kr.p)) throw new Error('Isi jam masuk dan jam pulang.');
  if (own) { kr.st = 'ok'; kr.by = u.name; } else { kr.st = 'ajuan'; kr.ajuBy = u.name; }
  return kjLock_(function () {
    const row = kjCkRow_(id) || {raw: {}, kor: {}, file: '', periode: ''};
    row.kor = row.kor || {}; row.kor[k.id] = row.kor[k.id] || {};
    const lama = row.kor[k.id][day];
    if (own && lama && lama.st === 'ajuan') kr.ajuBy = lama.ajuBy;
    row.kor[k.id][day] = kr;
    kjPut_('ck', {id: id, raw: row.raw, kor: row.kor, file: row.file, periode: row.periode, by: row.by || u.name, at: row.at || kr.at});
    return {kor: row.kor};
  });
}
function kjCkPutus_(p, u) {
  hanyaOwner_(u);
  const id = kjCkWeek_(p.week), day = String(p.day || ''), kid = String(p.kid || '');
  kjCkTerkunci_(String(p.week));
  return kjLock_(function () {
    const row = kjCkRow_(id); const kr = row && row.kor[kid] && row.kor[kid][day];
    if (!kr || kr.st !== 'ajuan') throw new Error('Ajuan koreksi tidak ditemukan.');
    if (p.ok) { kr.st = 'ok'; kr.by = u.name; } else { kr.st = 'tolak'; kr.by = u.name; kr.tolak = String(p.note || '').slice(0, 160); }
    kr.putusAt = new Date().toISOString();
    kjPut_('ck', {id: id, raw: row.raw, kor: row.kor, file: row.file, periode: row.periode, by: row.by, at: row.at});
    return {kor: row.kor};
  });
}

/* ======================= PENGHANGAT (v3) ======================= */
/** Dipanggil pemicu waktu tiap 5 menit supaya server tidak "dingin" (panggilan pertama jadi lambat). */
function keepWarm() { kjCfg_(); kjRows_('kar'); try { UrlFetchApp.fetch(POS_API, {muteHttpExceptions: true}); } catch (e) { } }
/** JALANKAN SEKALI dari editor: pasang pemicu penghangat tiap 5 menit. */
function pasangPenghangat() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'keepWarm') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('keepWarm').timeBased().everyMinutes(5).create();
  Logger.log('Penghangat terpasang (tiap 5 menit).');
}

/* ======================= PERATURAN KERJA & JOBDESK (v4) =======================
   Owner (kinerja_gaji) mengubah isi peraturan (markdown) dan daftar jobdesk dari menu Peraturan.
   Halaman peraturan-kerja.html dan menu Peraturan membaca isi terbaru; kosong = isi bawaan di bawah. */
const DOC_META_DEF = {nomor: 'PK/POSITIF/2026/01', status: 'draf', versi: '2026-11-25', berlaku: ''};
const DOC_MD_DEF = "## Bab 1 — Ketentuan umum\n\nPeraturan ini berlaku untuk semua karyawan produksi Positif Clothing di Workshop Rejosari dan Workshop Kedawung, mulai tanggal ditandatangani.\n\n| Istilah | Arti |\n| --- | --- |\n| Owner | Pemilik usaha Positif Clothing. Menetapkan upah, menyetujui gaji mingguan, menerbitkan surat peringatan. |\n| Supervisor workshop | Penanggung jawab harian satu workshop. Rejosari: DESI. Kedawung: ERNA. |\n| Unit | Kelompok yang hasilnya dihitung bersama. Contoh: Tim Jahit Rejosari, YULI, SUGIATUN & ANIK. |\n| Setoran hasil | Jumlah barang jadi yang dilaporkan karyawan lewat HP workshop dengan PIN pribadi. |\n| Poin | Bobot hasil per barang: kaos polos 1, kolor 1, jersey 1,5, jersey krah 2. |\n| Jobdesk | Daftar tugas harian dan mingguan sesuai posisi (Lampiran A). |\n| Minggu kerja | Sabtu sampai Jumat. Upah dibayar hari Sabtu berikutnya. |\n\nSemua catatan kerja (ceklok, setoran, jobdesk, teguran) disimpan di aplikasi Positif HRD dan bisa dilihat karyawan untuk dirinya sendiri.\n\n## Bab 2 — Jam kerja & kehadiran\n\nKaryawan bekerja 6 hari seminggu, paling lama 7 jam kerja sehari dan 40 jam seminggu, sesuai batas PP 35/2021.\n\n| Hari | Jam masuk | Istirahat | Jam pulang |\n| --- | --- | --- | --- |\n| Sabtu–Kamis | [isi] | [isi] | [isi] |\n| Jumat | [isi] | [isi] (salat Jumat) | [isi] |\n| Libur mingguan | [isi] | — | — |\n\n1. **Ceklok wajib** saat datang dan pulang di mesin workshop masing-masing. Lupa ceklok dilaporkan ke supervisor hari itu juga.\n2. **Telat** = ceklok masuk lewat dari batas toleransi [isi, saat ini 08.15]. Telat lebih dari [isi] kali seminggu menghapus tunjangan kehadiran minggu itu.\n3. **Izin** diajukan ke supervisor paling lambat sehari sebelumnya, kecuali darurat (kabari sebelum jam masuk).\n4. **Sakit** dikabarkan sebelum jam masuk. Sakit lebih dari [isi] hari berturut-turut melampirkan surat dokter.\n5. **Tidak masuk tanpa kabar** dicatat sebagai mangkir dan masuk catatan disiplin (Bab 5).\n6. **Lembur** hanya atas permintaan supervisor atau Owner dan persetujuan karyawan, paling lama 4 jam sehari dan 18 jam seminggu, dan dibayar sesuai aturan upah lembur.\n\n## Bab 3 — Upah & tunjangan\n\nUpah dibayar setiap Sabtu untuk minggu kerja Sabtu–Jumat sebelumnya, dengan slip gaji untuk tiap karyawan. Upah terdiri dari 3 bagian:\n\n| Bagian | Dasar hitung | Bisa berkurang karena kinerja? |\n| --- | --- | --- |\n| Upah pokok | Upah per jam [isi per orang] × jam kerja dari ceklok | Tidak |\n| Tunjangan kehadiran | Jumlah hari masuk tepat waktu seminggu. Nilai awal: 6 hari Rp25.000, 5 hari Rp18.000, 4 hari Rp10.000 [isi/ubah] | Ya, telat & mangkir |\n| Tunjangan kinerja | Nilai minggu itu (Bab 4). Nilai awal: A Rp20.000, B Rp12.000, C dan D Rp0 [isi/ubah] | Ya, hasil & jobdesk |\n\n1. Uang makan [isi, nilai awal Rp15.000 per hari masuk].\n2. **Upah pokok tidak dipotong karena kinerja.** Kinerja yang kurang hanya membuat tunjangan kecil atau nol.\n3. Barang rusak karena **kesengajaan atau kelalaian berat** bisa diganti rugi, hanya setelah dibicarakan dan disetujui tertulis oleh karyawan, maksimal [isi] per minggu.\n4. Owner menyetujui dan mengunci gaji di aplikasi sebelum dibayar. Keberatan atas slip disampaikan paling lambat [isi] hari setelah gajian.\n\n## Bab 4 — Penilaian kinerja\n\nSetiap minggu karyawan mendapat nilai **A, B, C, atau D** dari 3 hal: hasil kerja, mutu, dan jobdesk. Nilai ini menentukan tunjangan kinerja.\n\n### Cara mencatat\n\n1. **Hasil kerja** disetor lewat HP workshop dengan PIN pribadi. Penjahit dan pemotong menyetor jumlah barang; posisi lain menyetor hasil sesuai satuannya (lembar stiker, paket, dsb.).\n2. **Setoran jahit dicek supervisor** sebelum dihitung. Setoran yang tidak sesuai fisik dikoreksi atau ditolak.\n3. **Jobdesk** dicentang karyawan saat selesai, lalu supervisor memberi nilai **Baik / Cukup / Kurang**. Supervisor cukup menandai yang bermasalah; sisanya dianggap Baik.\n4. **Reject** dicatat tim packing (QC) beserta penyebab dan unit asal jahitannya.\n\n### Cara menilai\n\n| Unsur | Baik | Cukup | Kurang |\n| --- | --- | --- | --- |\n| Hasil (poin unit dibanding target mingguan) | ≥ 100% | 75–99% | < 75% |\n| Mutu (reject dari unitnya seminggu) | 0–1 pcs | 2–3 pcs | > 3 pcs |\n| Jobdesk (nilai supervisor) | Mayoritas Baik | Ada Cukup | Ada Kurang |\n\n- **A** = ketiga unsur Baik. **B** = paling banyak 1 unsur Cukup. **C** = 2 unsur Cukup atau 1 Kurang. **D** = lebih dari itu.\n- **Poin unit dibagi ke anggota sesuai jam kerja dari ceklok.** Anggota yang sering absen otomatis mendapat bagian lebih kecil.\n- Target mingguan per unit ditetapkan Owner setelah 4 minggu data terkumpul.\n- **Masa uji 4 minggu pertama:** nilai sudah dihitung dan ditunjukkan, tapi tunjangan kinerja dibayar penuh. Mulai minggu ke-5 nilai berlaku untuk tunjangan.\n- Hambatan di luar kendali karyawan (bahan telat, mesin rusak, listrik padam) dicatat supervisor sebagai kegiatan dan tidak menurunkan nilai.\n\n## Bab 5 — Tata tertib & disiplin\n\nPelanggaran ditangani bertahap: teguran lisan, lalu Surat Peringatan (SP) 1, 2, dan 3, masing-masing berlaku 6 bulan.\n\n### Kewajiban karyawan\n\n- Datang tepat waktu, ceklok, dan menyetor hasil dengan PIN sendiri.\n- Menjaga mesin, alat, bahan, dan kebersihan area kerja.\n- Melaporkan barang rusak, reject, atau bahan kurang ke supervisor hari itu juga.\n- Menjaga kerahasiaan desain dan data pesanan pelanggan.\n\n### Larangan\n\n- Memakai PIN atau ceklok atas nama orang lain.\n- Menyetor jumlah yang tidak sesuai barang jadi.\n- Membawa pulang bahan, barang jadi, atau alat tanpa izin.\n- Merokok di area bahan dan mesin; bermain HP berlebihan saat jam kerja [isi batasan].\n- Datang dalam pengaruh alkohol atau obat terlarang; berkelahi di tempat kerja.\n\n### Tahapan sanksi\n\n| Tahap | Kapan diberikan | Diberikan oleh |\n| --- | --- | --- |\n| Teguran lisan | Pelanggaran ringan pertama (telat, lupa ceklok, area kotor). Dicatat di aplikasi. | Supervisor |\n| SP 1 | 3 teguran lisan dalam 1 bulan, atau pelanggaran sedang (setoran tidak sesuai, mangkir). | Owner |\n| SP 2 | Pelanggaran lagi saat SP 1 masih berlaku. | Owner |\n| SP 3 (terakhir) | Pelanggaran lagi saat SP 2 masih berlaku. Pelanggaran berikutnya bisa berujung pemutusan hubungan kerja sesuai aturan. | Owner |\n\nPelanggaran berat (mencuri, memalsukan PIN atau ceklok, berkelahi) langsung dibicarakan dengan Owner dan bisa langsung diberi SP 3. Setiap SP dibicarakan langsung dengan karyawan, dan karyawan berhak menyampaikan penjelasan.\n\n## Bab 6 — Penutup & persetujuan\n\nPeraturan ini berlaku sejak ditandatangani dan ditinjau ulang paling lambat setiap 2 tahun, atau lebih cepat bila ada perubahan cara kerja. Perubahan diumumkan dan ditandatangani ulang. Hal yang belum diatur diputuskan Owner setelah mendengar supervisor dan karyawan yang bersangkutan.\n\nSetiap karyawan menandatangani lembar persetujuan yang menyatakan sudah membaca, memahami, dan menyetujui peraturan ini, termasuk cara penilaian dan tunjangan di Bab 3 dan Bab 4. Lembar persetujuan disimpan Owner.\n";
const DOC_JOBS_DEF = [["Penjahit", "Menjahit sesuai urutan prioritas di Lembar Kerja Produksi", "Harian", "Mengerjakan dari prioritas teratas, tidak lompat order"], ["Penjahit", "Setor hasil jahit lewat HP dengan PIN", "Harian", "Disetor sebelum pulang, jumlah sesuai fisik"], ["Penjahit", "Cek ukuran & jahitan sebelum diserahkan", "Harian", "Reject unitnya 0–1 pcs seminggu"], ["Penjahit", "Bersihkan mesin & sisa benang, rapikan meja", "Harian", "Meja bersih saat pulang"], ["Penjahit", "Lapor mesin bermasalah", "Saat terjadi", "Dilaporkan hari itu, dicatat di aplikasi"], ["Penjahit", "Minyaki & servis ringan mesin", "Mingguan", "Dikerjakan tiap [isi hari]"], ["Pemotong", "Potong bahan sesuai prioritas Lembar Kerja Produksi", "Harian", "Sesuai prioritas & ukuran pola"], ["Pemotong", "Setor hasil potong lewat HP", "Harian", "Disetor sebelum pulang, jumlah sesuai"], ["Pemotong", "Hemat bahan & kumpulkan sisa kain", "Harian", "Sisa kain terkumpul di tempatnya"], ["Pemotong", "Buka paket & tata bahan datang", "Saat bahan datang", "Bahan tercatat di Stok Bahan Baku hari itu"], ["Pemotong", "Belanja bahan & kebutuhan sesuai daftar (khusus pemotong + belanja)", "Sesuai daftar", "Barang & nota lengkap, diserahkan hari itu"], ["Pemotong", "Asah/cek alat potong, rapikan rak pola", "Mingguan", "Alat siap pakai, pola tertata"], ["Press sablon DTF", "Press sablon sesuai antrian pesanan", "Harian", "Tidak ada salah desain/posisi"], ["Press sablon DTF", "Urus kaos reject: pilah perbaiki / afkir / jual", "Harian", "Rak reject tidak menumpuk lebih dari [isi] hari"], ["Press sablon DTF", "Bersihkan mesin press & meja", "Harian", "Bersih saat pulang"], ["Press sablon DTF", "Cek stok film & bubuk DTF", "Mingguan", "Stok dilaporkan sebelum habis"], ["Packing & QC", "Cek mutu setiap barang sebelum dikemas", "Harian", "Reject dicatat beserta penyebab & unit asal"], ["Packing & QC", "Packing & tempel resi sesuai pesanan", "Harian", "Tidak ada salah kirim/salah ukuran"], ["Packing & QC", "Cari & siapkan gambar DTF pesanan (bagi yang ditugasi)", "Harian", "File siap sebelum jadwal cetak"], ["Packing & QC", "Packing jersey custom & cocokkan daftar nama/nomor", "Harian", "Sesuai daftar pemesan"], ["Packing & QC", "Rapikan area packing & stok plastik", "Mingguan", "Stok kemasan dilaporkan sebelum habis"], ["Cetak & packing stiker", "Cetak & potong stiker sesuai pesanan", "Harian", "Tidak ada salah desain/ukuran"], ["Cetak & packing stiker", "Packing stiker & setor jumlah lembar", "Harian", "Disetor sebelum pulang"], ["Cetak & packing stiker", "Cek tinta, kertas, & perawatan printer", "Mingguan", "Stok dilaporkan sebelum habis"], ["Supervisor workshop", "Bagikan Lembar Kerja Produksi pagi", "Harian", "Dibagikan sebelum jam [isi]"], ["Supervisor workshop", "Setujui setoran jahit & cek hasil", "Harian", "Disetujui paling lambat sore hari yang sama"], ["Supervisor workshop", "Pindahkan order di aplikasi Produksi", "Harian", "Tahap di aplikasi sesuai barang fisik"], ["Supervisor workshop", "Catat teguran, hambatan, & izin karyawan", "Harian", "Dicatat hari itu"], ["Supervisor workshop", "Input jersey keluar-masuk & atur jadwal (Rejosari)", "Harian", "Data jersey sesuai fisik"], ["Supervisor workshop", "Rekap mingguan & cek ceklok sebelum gajian", "Mingguan", "Selesai Sabtu sebelum jam [isi]"], ["Semua posisi", "Kebersihan area kerja bersama (bergilir)", "Mingguan", "Jadwal giliran dibuat supervisor"]];
function kjDocGet_() {
  const r = kjRows_('doc').filter(function (x) { return String(x.id) === 'peraturan'; })[0];
  if (!r) return {md: DOC_MD_DEF, jobs: DOC_JOBS_DEF, meta: DOC_META_DEF, by: '', at: '', bawaan: true};
  return {md: String(r.isi || ''), jobs: kjJ_(r.jobs, []), meta: kjJ_(r.meta, DOC_META_DEF), by: r.by, at: r.at};
}
function kjDocSave_(p, u) {
  hanyaOwner_(u);
  const md = String(p.md || '');
  if (!md.trim()) throw new Error('Isi peraturan kosong.');
  if (md.length > 45000) throw new Error('Isi peraturan terlalu panjang (maks. 45.000 huruf).');
  const jobs = (Array.isArray(p.jobs) ? p.jobs : []).slice(0, 200).map(function (r) {
    return [String(r[0] || '').trim().slice(0, 60), String(r[1] || '').trim().slice(0, 160), String(r[2] || 'Harian').trim().slice(0, 30), String(r[3] || '').trim().slice(0, 160)];
  }).filter(function (r) { return r[0] && r[1]; });
  if (JSON.stringify(jobs).length > 45000) throw new Error('Daftar jobdesk terlalu panjang.');
  const m = p.meta || {};
  const meta = {nomor: String(m.nomor || '').slice(0, 40), status: m.status === 'berlaku' ? 'berlaku' : 'draf',
    versi: new Date().toISOString().slice(0, 10), berlaku: /^\d{4}-\d{2}-\d{2}$/.test(String(m.berlaku || '')) ? String(m.berlaku) : '', setor: {}};
  /* v5: jenis setoran per posisi (jahit / potong / hasil / qc / kosong) */
  Object.keys(m.setor || {}).slice(0, 60).forEach(function (k) { const v = String(m.setor[k] || ''); if (['jahit', 'potong', 'hasil', 'qc', ''].indexOf(v) >= 0) meta.setor[String(k).slice(0, 60)] = v; });
  const now = new Date().toISOString();
  kjLock_(function () { kjPut_('doc', {id: 'peraturan', isi: md, jobs: jobs, meta: meta, by: u.name, at: now}); });
  return {ok: 1, doc: {md: md, jobs: jobs, meta: meta, by: u.name, at: now}};
}

/* ======================= REKAP UNIT JAHIT & PEMOTONG (v9) =======================
   p = {from, to} (ISO, periode [from, to)). Owner & pemeriksa. Data Produksi dari server POS (hrdRekap, Kinerja.gs v4),
   setoran & reject dari lembar KJ Aktivitas. Unit = kolom Unit karyawan (kosong = nama). */
function kjRekap_(p, u) {
  butuh_(u, 'periksa');
  const cfg = kjCfg_(), gud = kjGud_(u, cfg), from = String(p.from || ''), to = String(p.to || '');
  if (!/^\d{4}-\d{2}-\d{2}/.test(from) || !/^\d{4}-\d{2}-\d{2}/.test(to) || from >= to) throw new Error('Periode tidak valid.');
  const r = posK_(u, 'hrdRekap', {gud: gud, from: from, to: to});
  const KM = {}, KL = kjRows_('kar');
  KL.forEach(function (k) { KM[String(k.id)] = k; });
  const unitOf = function (k) { return String(k.unit || '').trim() || String(k.nama || ''); };
  const S = {}, RJ = {};
  kjRows_('akt', 8000).forEach(function (x) {
    const t = String(x.tgl || '');
    if (t < from || t >= to) return;
    const d = kjJ_(x.data, {}), k = KM[String(x.kid)] || {};
    if (gud && kjKarGud_(k, cfg) !== gud) return;
    if (x.jenis === 'setor' && String(d.tahap || 'jahit') === 'jahit') {
      const un = String(d.unit || x.oleh || ''), o = S[un] = S[un] || {ok: 0, tunggu: 0, tolak: 0, luar: 0};
      const q = +d.q || 0;
      if (x.status === 'ok') { o.ok += q; if (d.luar) o.luar += q; }
      else if (x.status === 'tunggu' || x.status === 'proses') o.tunggu += q;
      else if (x.status === 'tolak') o.tolak += q;
    } else if (x.jenis === 'reject' && x.status !== 'batal') {
      const tk = KM[String(d.target || '')], un = tk ? unitOf(tk) : '(asal tidak diketahui)';
      RJ[un] = (RJ[un] || 0) + (+d.q || 0);
    }
  });
  const ang = {};
  KL.forEach(function (k) {
    if (String(k.on) === '0' || (gud && kjKarGud_(k, cfg) !== gud) || !/penjahit/i.test(String(k.posisi || ''))) return;
    (ang[unitOf(k)] = ang[unitOf(k)] || []).push(String(k.nama));
  });
  return {from: from, to: to, gud: gud, jahit: r.jahit || {}, potong: r.potong || {}, setor: S, reject: RJ, anggota: ang};
}
