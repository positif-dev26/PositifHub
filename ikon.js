/* =====================================================================
   IKON — semua ikon Positif POS memakai Google Material Symbols (Sharp).
   Ganti ikon: ubah nama di MAP di bawah (nama dari fonts.google.com/icons,
   huruf kecil, spasi jadi garis bawah, mis. "Check Circle" -> check_circle).
   Pakai di kode:  MS('alur')   atau langsung  MS('shopping_cart')
   Outline = default, terisi (filled) otomatis untuk menu aktif (lihat tema.css).
   ===================================================================== */
(function () {
  var MAP = {
    /* menu samping/bawah halaman Produksi */
    workflow: 'account_tree',   /* Alur */
    printer: 'print',           /* Cetak */
    factory: 'factory',         /* Vendor */
    check: 'check_circle',      /* Selesai */
    ban: 'cancel',              /* Reject / Batal */
    warehouse: 'warehouse',     /* Gudang */
    users: 'group',             /* Petugas */
    sliders: 'tune',            /* Atur */
    /* tahap produksi */
    layers: 'layers',           /* Rak bahan */
    scissors: 'content_cut',    /* Cutting */
    shirt: 'checkroom',         /* Jahit */
    sparkles: 'auto_awesome',   /* Finishing */
    /* aksi */
    pencil: 'edit',
    trash: 'delete',
    truck: 'local_shipping',
    undo: 'undo'
  };
  var LINK = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block';
  if (!document.querySelector('link[data-ms]')) {
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = LINK; l.setAttribute('data-ms', '1');
    (document.head || document.documentElement).appendChild(l);
  }
  window.MSMAP = MAP;
  window.MS = function (k) { return '<span class="ico ms" aria-hidden="true">' + (MAP[k] || k) + '</span>'; };
})();
