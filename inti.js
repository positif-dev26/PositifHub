/* Positif POS — inti bersama: login, server, sinkron, simpan di perangkat, menu utama, akun.
   Dipakai index.html dan produksi.html. Ubah di sini = berlaku di semua halaman. */
/* ---------- HALAMAN: setiap menu besar punya file HTML sendiri ----------
   Halaman mengisi PAGE_TABS (menu yang ada di file itu) dan PAGE_HOME sebelum memuat inti.js.
   Pindah ke menu di file lain = buka file itu; data langsung tampil dari simpanan perangkat. */
const PAGE_TABS=window.PAGE_TABS||['beranda'];
const PAGE_HOME=window.PAGE_HOME||'beranda';
/* menu yang punya file HTML sendiri */
const PAGE_OF={beranda:'index.html',kasir:'kasir.html',riwayat:'penjualan.html',laporan:'penjualan.html',produk:'produk.html',stok:'produk.html',produksi:'produksi.html',pengguna:'pengaturan.html',peran:'pengaturan.html',cadangan:'pengaturan.html'};
/* aplikasi terpisah (punya server sendiri) */
const EXT={bahan:'stok-bahan-baku-v9.html',pesanan:'pesanan-custom.html',rekap:'rekap-order-custom.html',kinerja:'kinerja.html'};
let LEAVING=false,LEAVE_T=null,LEAVE_TXT='';
/* nama menu untuk tulisan "Membuka ..." di samping status sinkron */
const PG_NAME={beranda:'Beranda',kasir:'Kasir',riwayat:'Penjualan',laporan:'Penjualan',produk:'Produk',stok:'Produk',bahan:'Stok bahan baku',produksi:'Produksi',pesanan:'Pesanan custom',rekap:'Rekap order',kinerja:'Gaji & kinerja',pengguna:'Pengaturan',peran:'Pengaturan',cadangan:'Pengaturan'};
function pgInfo(t){const e=$('sync');if(!e)return;if(!LEAVE_TXT)LEAVE_TXT=e.textContent;e.textContent=t;e.className='muted'}
/* lepas kunci "sedang pindah halaman": dipakai saat halaman tampil lagi dari tombol Kembali, atau perpindahan tidak terjadi */
function leaveReset(){LEAVING=false;clearTimeout(LEAVE_T);const e=$('sync');if(e&&LEAVE_TXT){e.textContent=LEAVE_TXT;e.className='muted'}LEAVE_TXT='';document.documentElement.style.cursor=''}
async function goPage(t){if(LEAVING)return;LEAVING=true;
 const nm=PG_NAME[t]||'halaman';document.documentElement.style.cursor='progress';
 /* tunggu kiriman yang sedang jalan selesai dulu, supaya perubahan tidak terkirim dua kali */
 const t0=Date.now();if(typeof flushing!=='undefined'&&flushing)pgInfo('Menyimpan perubahan dulu, lalu membuka '+nm+'...');
 while(typeof flushing!=='undefined'&&flushing&&Date.now()-t0<8000)await new Promise(r=>setTimeout(r,80));
 pgInfo('Membuka '+nm+'...');
 try{await Promise.race([snapNow(),new Promise(r=>setTimeout(r,1200))])}catch(e){}
 clearTimeout(LEAVE_T);LEAVE_T=setTimeout(leaveReset,8000);
 location.href=EXT[t]||((PAGE_OF[t]||'index.html')+'#'+t)}
addEventListener('pageshow',e=>{if(e.persisted)leaveReset()});
addEventListener('pagehide',()=>{try{snapNow()}catch(e){}});
const K='positif_pos_v1',LOGO='data:image/png;base64,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';
let _i=1,_n=0;const nid=()=>Date.now()*1000+(_n++%1000);
const mk=(c,s,st)=>({id:_i++,color:c,size:s,barcode:'',img:null,stock:st,price:0});
const seed=()=>{_i=1;return{v:2,seq:100,log:[],low:10,sales:[],orders:[],products:[
{id:1,name:'Kaos Polos Cotton 30s',cat:'Kaos',price:65000,variants:['Hitam','Putih'].flatMap(c=>['M','L','XL'].map(s=>mk(c,s,20)))},
{id:2,name:'Jersey Futsal Printing',cat:'Jersey',price:120000,variants:['M','L','XL'].map(s=>mk('',s,15))},
{id:3,name:'Kemeja Kerja PDH',cat:'Kemeja',price:145000,variants:[mk('','',15)]},
{id:4,name:'Jasa Sablon DTF (per titik)',cat:'Jasa',price:25000,variants:[mk('','',9999)]},
{id:5,name:'Nama + Nomor Punggung',cat:'Jasa',price:20000,variants:[mk('','',9999)]}]}};
function migrate(o){if(!o||!o.products)return null;if(o.v===2)return o;const g={};
 o.products.forEach(p=>{const m=p.name.match(/^(.*) - (\S+)$/),b=m?m[1]:p.name,k=b+'|'+p.cat;
 (g[k]=g[k]||{id:p.id,name:b,cat:p.cat,price:p.price,variants:[]}).variants.push({id:p.id,color:'',size:m?m[2]:'',barcode:p.barcode||'',img:p.img||null,stock:p.stock,price:p.price})});
 o.products=Object.values(g);o.v=2;return o}
let S=emptyS();


const $=id=>document.getElementById(id);
const _vd=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value'),nf=n=>Number(n||0).toLocaleString('id-ID'),fd=v=>{v=String(v==null?'':v).replace(/\D/g,'');return v?Number(v).toLocaleString('id-ID'):''};
function numInit(e){if(e._n)return;e._n=1;Object.defineProperty(e,'value',{get(){return _vd.get.call(this).replace(/\./g,'')},set(v){_vd.set.call(this,fd(v))},configurable:true});_vd.set.call(e,fd(_vd.get.call(e)));
 e.addEventListener('input',()=>{const a=_vd.get.call(e),f=fd(a);if(f===a)return;const d=a.slice(0,e.selectionStart).replace(/\D/g,'').length;_vd.set.call(e,f);let i=0,c=0;while(i<f.length&&c<d){if(/\d/.test(f[i]))c++;i++}e.setSelectionRange(i,i)},true)}
new MutationObserver(m=>m.forEach(r=>r.addedNodes.forEach(n=>{if(n.nodeType!==1)return;if(n.matches('input[data-n]'))numInit(n);n.querySelectorAll('input[data-n]').forEach(numInit)}))).observe(document.documentElement,{childList:true,subtree:true});
document.querySelectorAll('input[data-n]').forEach(numInit);
const rp=n=>'Rp'+Number(n||0).toLocaleString('id-ID');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const vl=v=>[v.color,v.size].filter(Boolean).join(' / ')||'Standar';
const vp=(p,v)=>v.price||p.price;
const bcv=v=>v.barcode||String(v.id);
const cn=(p,v)=>p.name+(p.variants.length>1?' ('+vl(v)+')':'');
const allV=()=>S.products.flatMap(p=>p.variants.map(v=>({p,v})));
const findV=id=>allV().find(x=>x.v.id===id);
const isJ=v=>v.stock>=9999;
const stt=v=>isJ(v)?'Jasa':v.stock<1?'Habis':v.stock<=S.low?'Menipis':'Aman';
function logS(x,type,before,after,note){S.log.unshift({id:nid(),date:new Date().toISOString(),name:cn(x.p,x.v),type,before,after,note:note||''});if(S.log.length>1000)S.log.length=1000}

const ICO={home:'<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
receipt:'<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
shirt:'<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>',
box:'<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
layers:'<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
factory:'<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/>',
clipboard:'<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
grid:'<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
sticker:'<path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/>',
workflow:'<rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/>',
printer:'<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
check:'<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
ban:'<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
warehouse:'<path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="12" x="6" y="10"/>',
scissors:'<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>',
sparkles:'<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
history:'<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
sliders:'<path stroke="currentColor" d="M20 7h-9"/><path stroke="currentColor" d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
plus:'<path d="M5 12h14"/><path d="M12 5v14"/>',minus:'<path d="M5 12h14"/>',equal:'<path d="M5 9h14"/><path d="M5 15h14"/>',
refresh:'<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
barcode:'<path fill="currentColor" stroke="none" d="M3 4h2v16H3zM6 4h1v16H6zM8 4h3v16H8zM12 4h1v16h-1zM14 4h2v16h-2zM17 4h1v16h-1zM19 4h2v16h-2z"/>',
expand:'<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'};
const IC=n=>'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">'+(ICO[n]||'')+'</svg>';
const NI={beranda:'home',kasir:'receipt',produk:'box',stok:'box',bahan:'layers',produksi:'factory',pesanan:'clipboard',rekap:'rekap',kinerja:'users'};
Object.assign(ICO,{rekap:'<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="m9 14 2 2 4-4"/>',settings:'<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',shield:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',db:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>'});
Object.assign(ICO,{chart:'<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',filter:'<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',thumb:'<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',trash:'<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',key:'<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',copy:'<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',sheet:'<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/>'});
const tabs=[['beranda','POS'],['kasir','Kasir'],['produk','Produk'],['stok','Stok Produk'],['bahan','Stok Bahan Baku'],['produksi','Produksi'],['pesanan','Pesanan custom'],['riwayat','Riwayat'],['laporan','Laporan'],['cadangan','Cadangan data']];
/* aplikasi Hub: [nama, file, izin] — izin diatur di Pengaturan > Pengguna / Peran */
const HUBAPPS=[['Resi Print','resi_print.html','app_resi_print'],['Resi Video Packing','resi_video_packing.html','app_resi_video'],['Resi Pickup Kurir','resi_pickup-kurir.html','app_resi_pickup']];
const hubH=()=>(HUBAPPS.some(a=>can(a[2]))?`<span class="hub" onmouseenter="hubOpen(1)" onmouseleave="hubClose(1)"><button title="Positif Hub" aria-label="Positif Hub" onclick="location.href='PositifHub.html'">${IC('grid')}</button><button class="caret" id="hubcaret" aria-haspopup="true" aria-expanded="false" aria-label="Buka daftar app" onclick="hubToggle(event)">&#9662;</button></span>`:'')+(can('app_layout')?`<button class="stk nv" title="Layout Stiker" aria-label="Layout Stiker" onclick="location.href='LAYOUT_STIKER.html'">${IC('sticker')}</button>`:'');
let hubT=null;
function hubOpen(hov){
 if(hov&&!matchMedia('(hover:hover)').matches)return;
 clearTimeout(hubT);const m=$('hubmenu'),h=document.querySelector('.hub');if(!m||!h)return;
 const r=h.getBoundingClientRect();m.style.top=r.bottom+'px';m.style.left=Math.max(4,Math.min(r.left,innerWidth-m.offsetWidth-4))+'px';
 m.classList.add('on');$('hubcaret').setAttribute('aria-expanded','true');
 m.style.left=Math.max(4,Math.min(r.left,innerWidth-m.offsetWidth-4))+'px'}
function hubClose(hov){
 if(hov){clearTimeout(hubT);hubT=setTimeout(()=>hubClose(0),150);return}
 const m=$('hubmenu');if(m)m.classList.remove('on');const c=$('hubcaret');if(c)c.setAttribute('aria-expanded','false')}
function hubToggle(e){e.stopPropagation();const m=$('hubmenu');m&&m.classList.contains('on')?hubClose(0):hubOpen(0)}
document.addEventListener('click',e=>{if(!e.target.closest('.hub'))hubClose(0)});
document.addEventListener('keydown',e=>{if(e.key==='Escape')hubClose(0)});
addEventListener('resize',()=>hubClose(0));
addEventListener('resize',()=>{try{stk()}catch(e){}});
document.addEventListener('scroll',()=>hubClose(0),true);
const HID='Disembunyikan';
const TABS=['beranda','kasir','riwayat','laporan','produk','stok','bahan','pesanan','rekap','produksi','pengguna','peran','cadangan'];let tab=(l=>TABS.includes(l)?l:PAGE_HOME)(location.hash.slice(1)),cart=[],q='',cat=HID,pk=null;
const cats=()=>['Semua',...new Set(S.products.map(p=>p.cat))];
const today=d=>new Date(d).toDateString()===new Date().toDateString();
const fmt=d=>new Date(d).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'});
$('lg').src=LOGO;
let pend=null;
const SALES=[['riwayat','Riwayat penjualan'],['laporan','Laporan penjualan']];
const nb=(k,l)=>{const n=k==='produksi'?lowN():0;return `<button class="nv${k===tab?' on':''}" title="${l}" aria-label="${l}" onclick="tab='${k}';render()">${IC(NI[k])}${k==='beranda'?'':`<span class="nl">${l}</span>`}${n?'<span class="bgn">'+n+'</span>':''}</button>`};
const navH=()=>(can('kasir')?nb('kasir','Kasir'):'')
 +(SALES.some(s=>can(s[0]))?`<button class="nv${SALES.some(s=>s[0]===tab)?' on':''}" title="Penjualan" aria-label="Penjualan" onclick="go('${SALES.find(s=>can(s[0]))[0]}')">${IC('chart')}<span class="nl">Penjualan</span></button>`:'')
 +[['produk','Produk'],['bahan','Stok bahan baku'],['produksi','Produksi'],['pesanan','Pesanan custom'],['rekap','Rekap order'],['kinerja','Gaji & kinerja']].filter(t=>tabOk(t[0])).map(t=>nb(t[0],t[1])).join('')+hubH();
let ddT=null;
function ddOpen(hov){if(hov&&!matchMedia('(hover:hover)').matches)return;clearTimeout(ddT);const m=$('ddmenu'),b=document.querySelector('.dd');if(!m||!b)return;const r=b.getBoundingClientRect();m.style.top=r.bottom+'px';m.classList.add('on');m.style.left=Math.max(4,Math.min(r.left,innerWidth-m.offsetWidth-4))+'px'}
function ddClose(hov){if(hov){clearTimeout(ddT);ddT=setTimeout(()=>ddClose(0),150);return}const m=$('ddmenu');if(m)m.classList.remove('on')}
function ddToggle(e){e.stopPropagation();const m=$('ddmenu');m&&m.classList.contains('on')?ddClose(0):ddOpen(0)}
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;for(const[id,fn]of[['pm','closePm'],['hm','closeHm'],['pk','closePk'],['ed','edClose'],['modal','closeM']]){const m=$(id),f=window[fn];if(m&&f&&m.classList.contains('on')){f();e.stopImmediatePropagation();e.preventDefault();return}}},true);
function go(t){tab=t;ddClose(0);render()}
document.addEventListener('click',e=>{if(!e.target.closest('.dd'))ddClose(0)});
document.addEventListener('keydown',e=>{if(e.key==='Escape')ddClose(0)});
/* ===== menu dropdown: dibuat di <body> supaya tidak terpotong header/nav di HP ===== */
function mkMenu(id,html){let m=$(id);if(!m){m=document.createElement('div');m.id=id;m.className='hubmenu';m.setAttribute('role','menu');m.onmouseenter=()=>{clearTimeout(hubT);clearTimeout(ddT)};m.onmouseleave=()=>{hubClose(1);ddClose(1)};document.body.appendChild(m)}m.innerHTML=html;return m}
function placeMenu(m,a){const r=a.getBoundingClientRect();m.classList.add('on');m.style.top=(r.bottom+4)+'px';m.style.left=Math.max(6,Math.min(r.left,innerWidth-m.offsetWidth-6))+'px'}
function hubOpen(hov){if(hov&&!matchMedia('(hover:hover)').matches)return;clearTimeout(hubT);ddClose(0);const h=document.querySelector('.hub');if(!h)return;placeMenu(mkMenu('hubmenu',HUBAPPS.filter(a=>can(a[2])).map(a=>`<a role="menuitem" href="${a[1]}">${a[0]}</a>`).join('')),h);const c=$('hubcaret');if(c)c.setAttribute('aria-expanded','true')}
function ddOpen(hov){if(hov&&!matchMedia('(hover:hover)').matches)return;clearTimeout(ddT);hubClose(0);const b=document.querySelector('.dd');if(!b)return;placeMenu(mkMenu('ddmenu',SALES.filter(s=>can(s[0])).map(s=>`<a role="menuitem" href="#" class="${s[0]===tab?'cur':''}" onclick="go('${s[0]}');return false">${s[1]}</a>`).join('')),b)}
function ddClose(hov){if(hov){if(!matchMedia('(hover:hover)').matches)return;clearTimeout(ddT);ddT=setTimeout(()=>ddClose(0),150);return}const m=$('ddmenu');if(m)m.classList.remove('on')}
function hubClose(hov){if(hov){if(!matchMedia('(hover:hover)').matches)return;clearTimeout(hubT);hubT=setTimeout(()=>hubClose(0),150);return}const m=$('hubmenu');if(m)m.classList.remove('on');const c=$('hubcaret');if(c)c.setAttribute('aria-expanded','false')}

let _h0=1;addEventListener('popstate',()=>{const l=location.hash.slice(1);if(l==='stok'){tab='stok';render();return}if(TABS.includes(l)&&l!==tab){tab=l;render()}});
function render(){if(tab==='stok'){tab='produk';window.PSUB_REQ='stok'}if(ready&&!tabOk(tab))tab='beranda';if(!PAGE_TABS.includes(tab)){goPage(tab);return}$('view').classList.toggle('bahan',tab==='bahan'||(tab==='pesanan'&&pesananOn()));const hh='#'+tab;if(location.hash!==hh)try{history[_h0?'replaceState':'pushState'](null,'',hh)}catch(e){}_h0=0;
 if(!ready){
  $('nav').innerHTML=navH();$('view').classList.toggle('full',tab==='beranda');
  if(pend)pend();else vBeranda();
  return}
 $('nav').innerHTML=navH();
 $('view').classList.toggle('full',tab==='beranda');
 $('view').classList.toggle('fit',FIT.includes(tab));accInit();
 if(!['beranda','bahan','pesanan','rekap','pengguna','peran','cadangan'].includes(tab)&&!S.products.length&&!S.sales.length&&!S.orders.length&&!skipSetup){vSetup();return}
 if(!window._gp&&/[?&]gantipin=1/.test(location.search)){window._gp=1;setTimeout(chPin,300)}
 const vf=window[({beranda:'vBeranda',kasir:'vKasir',produk:'vProduk',stok:'vStok',bahan:'vBahan',produksi:'vProd',pengguna:'vPengaturan',peran:'vPengaturan',cadangan:'vPengaturan',pesanan:'vPesanan',riwayat:'vRiwayat',laporan:'vLaporan'})[tab]];if(vf)vf();stk();clkTick();
}
/* ---------- STOK BAHAN BAKU (aplikasi terpisah, dibuka di bawah menu) ---------- */
/* GANTI alamat ini bila file ada di repo/akun GitHub Pages lain, contoh:
   const BAHAN_URL='https://USERNAME.github.io/NAMA-REPO/stok-bahan-baku-v5.html'; */
const BAHAN_URL='stok-bahan-baku-v9.html';
/* ---------- PESANAN CUSTOM (aplikasi terpisah, dibuka di bawah menu) ----------
   PESANAN_FILE = nama file aplikasi yang diunggah ke repo GitHub yang sama dengan Positif POS.
   PESANAN_API  = link server Apps Script Pesanan Custom (berakhiran /exec), tempel di antara tanda kutip.
   Selama PESANAN_API masih kosong, menu Pesanan custom memakai tampilan lama. */
var PESANAN_FILE='pesanan-custom.html';
var PESANAN_API='https://script.google.com/macros/s/AKfycbw-FqOIohjsjl0z3xcYyAruy3oQ5oGbpXZGYp_pXlFPZ574kyfe78QNDsFY26uyM5dL/exec';
function pesananOn(){return /^https:\/\/script\.google\.com\/.+\/exec/.test(String(PESANAN_API).trim())}
function pesananSrc(){return PESANAN_FILE+'?embed=1&api='+encodeURIComponent(String(PESANAN_API).trim())+'&v='+Date.now()}
/* Setiap tombol dibuka / dimuat ulang, alamat diberi kode waktu baru sehingga browser
   selalu mengambil file TERBARU dari GitHub, bukan salinan lama (cache). */
const bahanSrc=()=>BAHAN_URL+(BAHAN_URL.includes('?')?'&':'?')+'v='+Date.now();
/* menu Stok bahan baku & Pesanan custom sekarang membuka file aplikasinya langsung (lihat EXT di atas) */
/* ---------- struk & perbesar foto (dipakai Kasir, Penjualan, Produk) ---------- */
let RCS=null,RW=100;try{RW=+localStorage.getItem("positif_rw")||100}catch(e){}
function setRW(v){RW=+v;try{localStorage.setItem("positif_rw",v)}catch(e){}}
function receipt(s){RCS=s;$("rw").value=RW;
 $('rc').innerHTML=`<img class="rlogo" src="${LOGO}" alt="Positif Clothing" style="display:block;width:70%;margin:0 auto 6px"><p style="text-align:center;margin:0" class="muted">${fmt(s.date)}<br>${s.id}</p><hr>`+
 s.items.map(i=>`<div>${esc(i.name)}</div><div class="row"><span>${nf(i.qty)} x ${rp(i.price)}</span><span>${rp(i.qty*i.price)}</span></div>`).join('')+
 `<hr><div class="row"><span>Subtotal</span><span>${rp(s.sub)}</span></div>${s.disc?`<div class="row"><span>Diskon</span><span>-${rp(s.disc)}</span></div>`:''}<div class="row"><b>Total</b><b>${rp(s.total)}</b></div><div class="row"><span>${s.pay}</span><span>${rp(s.paid)}</span></div>${s.paid>s.total?`<div class="row"><span>Kembali</span><span>${rp(s.paid-s.total)}</span></div>`:''}<hr><p style="text-align:center;margin:0">Terima kasih!</p>`;
 $('modal').classList.add('on');
}
function closeM(){$('modal').classList.remove('on')}
function printRc(){const s=RCS;if(!s)return;const w=RW,R=(a,b)=>`<div class="r"><span>${a}</span><span>${b}</span></div>`;
 const h=`<img src="${LOGO}"><div class="c">${fmt(s.date)}<br>${s.id}</div><hr>`+s.items.map(i=>`<div>${esc(i.name)}</div>`+R(nf(i.qty)+' x '+rp(i.price),rp(i.qty*i.price))).join('')+`<hr>`+R('Subtotal',rp(s.sub))+(s.disc?R('Diskon','-'+rp(s.disc)):'')+`<b>${R('Total',rp(s.total))}</b>`+R(s.pay,rp(s.paid))+(s.paid>s.total?R('Kembali',rp(s.paid-s.total)):'')+`<hr><div class="c">Terima kasih!</div>`;
 const f=document.createElement('iframe');f.style.cssText=`position:fixed;left:-9999px;top:0;width:${w}mm;height:10px;border:0`;
 f.srcdoc=`<!doctype html><html><head><meta charset="utf-8"><title>${s.id}</title><style>html,body{margin:0}body{width:${w}mm;box-sizing:border-box;padding:3mm 4mm 15mm;font:12px/1.4 ui-monospace,Menlo,monospace;color:#000;background:#fff}.r{display:flex;justify-content:space-between;gap:6px}hr{border:0;border-top:1px dashed #000;margin:5px 0}.c{text-align:center}img{display:block;width:70%;margin:0 auto 4px}</style></head><body>${h}</body></html>`;
 f.onload=()=>{const d=f.contentDocument,mm=Math.ceil(d.body.scrollHeight*25.4/96)+2,st=d.createElement('style');st.textContent=`@page{size:${w}mm ${mm}mm;margin:0}`;d.head.appendChild(st);f.contentWindow.focus();f.contentWindow.print();setTimeout(()=>f.remove(),60000)};document.body.appendChild(f)}
let ZL=[],ZI=0,CS='m';try{CS=localStorage.getItem('positif_cs')||'m'}catch(e){}if(!/^[smld]$/.test(CS))CS='m';document.documentElement.dataset.cs=CS;
const zb=(p,v)=>`<span class="zm" role="button" tabindex="0" aria-label="Perbesar foto" onclick="event.stopPropagation();zoomP(${p},${v})"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M11 8v6M8 11h6"/></svg></span>`;
function zoomP(p,v){ZL=allV().filter(x=>x.v.img).map(x=>({v:x.v.id}));ZI=Math.max(0,ZL.findIndex(a=>a.v===v));zShow();$('zm').classList.add('on')}
function zShow(){const a=ZL[ZI],x=a&&findV(a.v);if(!x){zClose();return}
 $('zmc').innerHTML=`<div class="zi"><img src="${x.v.img}" alt="${esc(cn(x.p,x.v))}" draggable="false"></div><div class="row"><div><b style="font-size:18px">${esc(x.p.name)}</b><div class="muted">${esc(vl(x.v))} · ${isJ(x.v)?'jasa':'stok '+nf(x.v.stock)} · <b>${rp(vp(x.p,x.v))}</b></div></div>${tab==='kasir'?`<button class="btn" id="zadd" ${x.v.stock<1?'disabled':''} onclick="zAdd(${x.v.id})">Tambah ke keranjang</button>`:''}</div><div class="row"><button class="btn sec" onclick="zNav(-1)">&lsaquo; Sebelumnya</button><span class="muted">${ZI+1} / ${ZL.length}</span><button class="btn sec" onclick="zNav(1)">Berikutnya &rsaquo;</button><button class="btn sec" onclick="zClose()">Tutup</button></div>`;zPan()}
function zPan(){const c=document.querySelector('.zi'),im=c&&c.firstElementChild;if(!im)return;let sx,sy,sl,st,mv=0,dn=0;
 im.onpointerdown=e=>{if(e.pointerType==='touch'||!im.classList.contains('z2'))return;dn=1;mv=0;sx=e.clientX;sy=e.clientY;sl=c.scrollLeft;st=c.scrollTop;im.setPointerCapture(e.pointerId);c.classList.add('dr');e.preventDefault()};
 im.onpointermove=e=>{if(!dn)return;const dx=e.clientX-sx,dy=e.clientY-sy;if(Math.abs(dx)+Math.abs(dy)>4)mv=1;c.scrollLeft=sl-dx;c.scrollTop=st-dy};
 im.onpointerup=im.onpointercancel=()=>{dn=0;c.classList.remove('dr')};
 im.onclick=()=>{if(mv){mv=0;return}
 if(!im.classList.contains('z2'))c.style.height=c.clientHeight+'px'; /* kunci tinggi bingkai: popup tetap seukuran semula */
 im.classList.toggle('z2');
 if(im.classList.contains('z2')){c.scrollLeft=(c.scrollWidth-c.clientWidth)/2;c.scrollTop=(c.scrollHeight-c.clientHeight)/2} /* zoom tepat di tengah foto */
 else{c.style.height='';c.scrollLeft=c.scrollTop=0}}}
function zAdd(id){if(typeof addV!=='function')return;addV(id);const c=cart.find(c=>c.id===id);$('zadd').textContent='Tambah lagi · di keranjang '+(c?c.qty:0)}
function zNav(d){ZI=(ZI+d+ZL.length)%ZL.length;zShow()}
function zClose(){$('zm').classList.remove('on')}
document.addEventListener('keydown',e=>{if(!$('zm').classList.contains('on'))return;if(e.key==='Escape'){zClose();e.stopImmediatePropagation();e.preventDefault()}else if(e.key==='ArrowLeft')zNav(-1);else if(e.key==='ArrowRight')zNav(1)},true);
/* ---------- jam, hari, tanggal di kanan atas ---------- */
const HRI=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'],BLN3=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
function clkTick(){const e=$('clk');if(!e)return;const d=new Date(),p=n=>String(n).padStart(2,'0'),v='<span class="cd">'+HRI[d.getDay()]+', '+d.getDate()+' '+BLN3[d.getMonth()]+' '+d.getFullYear()+' · </span><b>'+p(d.getHours())+':'+p(d.getMinutes())+'</b>';if(e.innerHTML!==v)e.innerHTML=v}
setInterval(clkTick,5000);document.addEventListener('DOMContentLoaded',clkTick);
/* ---------- pembantu bersama (dipindah dari menu Kasir, Stok, Produksi) ---------- */
function note(m,bad){const e=$('msg');if(e){e.textContent=m;e.className=bad?'bad':'ok'}}
const SI={Aman:'<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',Menipis:'<svg viewBox="0 0 24 24"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',Habis:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>'};
const sbadge=v=>{const s=stt(v);return `<span class="badge ${s==='Habis'?'bad':s==='Menipis'?'mid':'ok'}">${SI[s]||''}${s}</span>`};
const STG=['cetak','bahan','cutting','jahit','finishing','selesai'],SL={cetak:'Dicetak di vendor',batal:'Dibatalkan',bahan:'Rak bahan',cutting:'Cutting',jahit:'Jahit',finishing:'Finishing',selesai:'Masuk stok'},SBY={bahan:'Petugas rak bahan',cutting:'Nama tukang cutting',jahit:'Nama penjahit',finishing:'Petugas finishing',selesai:'Petugas QC'};
const lowN=()=>ready?allV().filter(x=>!isJ(x.v)&&x.v.stock<=S.low).length:0;
const RS=['cetak','bahan','cutting','jahit','finishing'],STL={cetak:'Cetak vendor',bahan:'Rak bahan',cutting:'Cutting',jahit:'Jahit',finishing:'Finishing',selesai:'Masuk stok'};
function toast(m,bad){let h=$('toasts');if(!h){h=document.createElement('div');h.id='toasts';document.body.appendChild(h)}const t=document.createElement('div');t.className='toast'+(bad?' bad':'');t.innerHTML='<span>'+(bad?'!':'&#10003;')+'</span>'+esc(m);h.appendChild(t);setTimeout(()=>t.classList.add('out'),bad?4500:2800);setTimeout(()=>t.remove(),bad?5000:3300)}
function stk(){const s=document.documentElement.style,h=document.querySelector('header'),t=document.querySelector('.ptabs'),b=document.querySelector('.sk1');s.setProperty('--hh',(h?h.offsetHeight:52)+'px');s.setProperty('--th','0px');s.setProperty('--bh',(b?b.offsetHeight:0)+'px');const k=document.querySelector('.sk2');s.setProperty('--kh',(k?k.offsetHeight:0)+'px')}
/* ---------- SINKRON (GOOGLE SHEETS VIA APPS SCRIPT) ---------- */
const NAMES=['products','variants','sales','orders','log','cfg','jobs','gudang'];
let ready=false,isAdm=false,skipSetup=false,R={},KO={},Q=Promise.resolve(),busyW=0,errF=false,errMsg='',dirty=false,tm=null,VER=-1,PIN='',ME='',SSURL='';
let DR=null,OUT=[],flushing=false,rt=null,rtN=0;try{OUT=JSON.parse(localStorage.getItem('positif_outbox')||'[]')||[]}catch(e){OUT=[]}
function outSave(){try{localStorage.setItem('positif_outbox',JSON.stringify(OUT))}catch(e){}}
/* ===== KOTAK PESAN BERTEMA: pengganti alert / confirm / prompt bawaan browser =====
   uiAlert(pesan) · uiConfirm(pesan, teksTombol, bahaya) · uiPrompt(pesan, isiAwal)  -> semuanya Promise */
function uiBox(o){return new Promise(res=>{const d=document.createElement('div');d.className='ubx';
 d.innerHTML='<div class="ubc" role="dialog" aria-modal="true">'+(o.title?'<h3 class="ubt"></h3>':'')+'<div class="ubm"></div>'+(o.input!=null?'<input class="ubi" autocomplete="off">':'')+'<div class="uba">'+(o.cancel===false?'':'<button class="btn sec" data-r="0"></button>')+'<button class="btn'+(o.danger?' dng':'')+'" data-r="1"></button></div></div>';
 if(o.title)d.querySelector('.ubt').textContent=o.title;const m=d.querySelector('.ubm');if(o.html)m.innerHTML=o.html;else m.textContent=o.msg||'';
 const inp=d.querySelector('.ubi');if(inp){inp.value=o.input;if(o.num)inp.inputMode='numeric';if(o.ph)inp.placeholder=o.ph}
 d.querySelector('[data-r="1"]').textContent=o.ok||'OK';const c=d.querySelector('[data-r="0"]');if(c)c.textContent=o.cancel||'Batal';
 const ae=document.activeElement;
 const f=v=>{removeEventListener('keydown',k,true);d.classList.add('out');setTimeout(()=>d.remove(),120);try{ae&&ae.focus&&ae.focus({preventScroll:true})}catch(e){}res(v)},
  yes=()=>f(inp?inp.value:true),no=()=>f(inp?null:o.cancel===false?true:false),
  k=e=>{if(!document.body.contains(d)||d!==[...document.querySelectorAll('.ubx:not(.out)')].pop())return;if(e.key==='Escape'){e.stopImmediatePropagation();e.preventDefault();no()}else if(e.key==='Enter'&&!(e.target&&e.target.dataset&&e.target.dataset.r==='0')){e.stopImmediatePropagation();e.preventDefault();yes()}};
 d.onclick=e=>{if(e.target===d){if(o.cancel!==false)no();return}const r=e.target.closest('[data-r]');if(r)r.dataset.r==='1'?yes():no()};
 addEventListener('keydown',k,true);document.body.appendChild(d);setTimeout(()=>{if(inp){inp.focus();inp.select()}else d.querySelector(o.danger&&c?'[data-r="0"]':'[data-r="1"]').focus()},30)})}
const uiAlert=(msg,title)=>uiBox({msg:String(msg==null?'':msg),title,cancel:false});
const uiConfirm=(msg,ok,danger)=>uiBox({msg,ok:ok||'Ya',danger});
const uiPrompt=(msg,def,o)=>uiBox(Object.assign({msg,input:def==null?'':String(def),ok:'Simpan'},o||{}));
window.alert=m=>{uiAlert(m)};
function askC(msg,ok){return uiConfirm(msg,ok||'Hapus',true)}
document.addEventListener('change',e=>{if(!e.target.closest||!e.target.closest('#edc'))return;const b=$('edsv'),p=S.products.find(x=>x.id===ed);if(b&&DR&&p)b.disabled=JSON.stringify(p)===DR.snap});
function pkSide(){const m=$('pk'),a=document.querySelector('aside.fl');m.style.right=(a&&innerWidth>=900?Math.max(0,innerWidth-a.getBoundingClientRect().left):0)+'px'}
function emptyS(){return{jobs:[],gudang:[],v:2,products:[],sales:[],orders:[],log:[],low:10}}
function invId(){const d=new Date(),p=n=>String(n).padStart(2,'0');return 'INV-'+String(d.getFullYear()).slice(2)+p(d.getMonth()+1)+p(d.getDate())+'-'+p(d.getHours())+p(d.getMinutes())+p(d.getSeconds())+'-'+Math.floor(Math.random()*90+10)}
function setSync(t,bad){const e=$('sync');if(e){if(t==='Tersinkron')t+=' · '+new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}).replace('.',':');e.textContent=t;e.className=bad?'bad':'muted'}}
/* >>> Tempel alamat server (URL Apps Script yang berakhiran /exec) di antara tanda kutip di bawah ini. Boleh dikosongkan: aplikasi akan memintanya saat pertama dibuka. <<< */
const API_URL='https://script.google.com/macros/s/AKfycbwUEqf4lS9mn3Gdyo3vpDmTl3u9gxQzIEIf83dJMeopMDDQpHu_-pcG9puoPFHfMOOBkA/exec';
let API=/^https:\/\//.test(API_URL)?API_URL:'';try{if(!API)API=localStorage.getItem('positif_api')||''}catch(e){}
let TOK='';
const NE=m=>{const x=new Error(m);x.net=1;return x};
async function api(fn,...a){
 let r;try{r=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(TOK?{fn,user:USR,tok:TOK,a}:{fn,user:USR,pin:PIN,a}),redirect:'follow'})}catch(e){throw NE('Tidak bisa menjangkau server. Periksa internet dan alamat server.')}
 let j;try{j=await r.json()}catch(e){throw NE('Balasan server tidak dikenali. Pastikan alamat server benar dan deployment sudah diperbarui.')}
 if(!j.ok)throw new Error(j.error||'Gagal');return j.data}
function mkKO(){KO={};NAMES.forEach(n=>(R[n]||[]).forEach(x=>{KO[n+'/'+x.id]=x.d}))}
function apply(r){NAMES.forEach(n=>{R[n]=((r.data||{})[n]||[]).map(x=>{const{id,...d}=x;return{id:String(id),d}})});(R.jobs||[]).forEach(x=>['items','hist','rejs'].forEach(k=>{if(typeof x.d[k]==='string'){try{x.d[k]=JSON.parse(x.d[k])}catch(e){}}}));VER=r.ver;mkKO()}
function rebuild(){
 const g=n=>R[n]||[],vs=g('variants').slice().sort((a,b)=>(a.d.ord||0)-(b.d.ord||0)),dsc=(a,b)=>a.date<b.date?1:a.date>b.date?-1:0;
 S.products=g('products').slice().sort((a,b)=>(b.d.ts||0)-(a.d.ts||0)).map(p=>({id:+p.id,name:p.d.name,cat:p.d.cat,price:+p.d.price||0,ts:p.d.ts,variants:vs.filter(v=>String(v.d.pid)===p.id).map(v=>({id:+v.id,color:String(v.d.color||''),size:String(v.d.size||''),barcode:String(v.d.barcode||''),img:v.d.img||null,stock:+v.d.stock||0,price:+v.d.price||0,ord:v.d.ord}))}));
 S.sales=g('sales').map(x=>({...x.d,id:x.id,items:Array.isArray(x.d.items)?x.d.items:[]})).sort(dsc);
 S.orders=g('orders').map(x=>({...x.d,id:+x.id})).sort(dsc);
 S.gudang=g('gudang').map(x=>({...x.d,id:x.id})).sort((a,b)=>(a.ord||0)-(b.ord||0));
 S.jobs=g('jobs').map(x=>{const pj=v=>{if(typeof v==='string'){try{v=JSON.parse(v)}catch(e){}}return Array.isArray(v)?v:[]};return{...x.d,id:x.id,items:pj(x.d.items),hist:pj(x.d.hist),rejs:pj(x.d.rejs)}}).sort(dsc);
 S.log=g('log').map(x=>({...x.d,id:x.id})).sort(dsc);
 const c=g('cfg')[0];S.low=c&&+c.d.low||10;S.lastBackup=c&&c.d.lastBackup||null;S.v=2}
function docsFromS(){
 const m={},base=Date.now();
 S.products.forEach((p,i)=>{if(p.ts==null)p.ts=base-i;
  p.variants.forEach((v,j)=>{if(v.ord==null)v.ord=base+j;m['variants/'+v.id]={pid:String(p.id),color:v.color,size:v.size,barcode:v.barcode||'',price:v.price||0,stock:v.stock,img:v.img||null,ord:v.ord}});
  m['products/'+p.id]={name:p.name,cat:p.cat,price:p.price,ts:p.ts}});
 S.sales.forEach(s=>{const{id,...r}=s;m['sales/'+id]=r});
 S.orders.forEach(o=>{const{id,...r}=o;m['orders/'+id]=r});
 S.log.forEach(e=>{const{id,...r}=e;m['log/'+id]=r});
 (S.jobs||[]).forEach(j=>{const{id,...r}=j;m['jobs/'+id]=r});
 (S.gudang||[]).forEach(j=>{const{id,...r}=j;m['gudang/'+id]=r});
 m['cfg/main']={low:S.low,lastBackup:S.lastBackup||null};
 return m}
const nz=x=>x==null?'':x;
const same=(a,b)=>{a=nz(a);b=nz(b);return typeof a==='object'||typeof b==='object'?JSON.stringify(a)===JSON.stringify(b):String(a)===String(b)};
function save(){if(DR)return;S.products.forEach(p=>p.variants.forEach(v=>{if(!v.barcode)v.barcode=String(v.id)}));
 if(!ready)return;
 const m=docsFromS(),ops=[];
 for(const p in m){const i=p.indexOf('/'),c=p.slice(0,i),id=p.slice(i+1),o=KO[p],d=m[p];
  if(!o)ops.push({t:'set',c,id,d});
  else{const ch={};for(const k in d)if(!same(d[k],o[k]))ch[k]=d[k];
   if(Object.keys(ch).length){if(c==='variants'&&'stock' in ch)ch._d=(+d.stock||0)-(+o.stock||0);ops.push({t:'update',c,id,d:ch})}}}
 for(const p in KO)if(!(p in m)){const i=p.indexOf('/');ops.push({t:'delete',c:p.slice(0,i),id:p.slice(i+1)})}
 ops.forEach(sanOp);for(let i=ops.length-1;i>=0;i--)if(!opOk(ops[i]))ops.splice(i,1);if(!ops.length)return;
 ops.forEach(o=>{const p=o.c+'/'+o.id;if(o.t==='delete')delete KO[p];else{const{_d,...dd}=o.d;KO[p]=o.t==='set'?o.d:{...KO[p],...dd}}});
 OUT.push(...ops);outSave();flush()}
function flush(){
 if(flushing||!OUT.length)return;
 flushing=true;busyW++;errF=false;errMsg='';setSync('Menyimpan...');
 Q=Q.then(async()=>{let net=false;
  while(OUT.length){const b=OUT.slice(0,20);
   try{const pv=VER,r=await api('applyOps',b);if(r.ver!==pv+1)OTH=true;VER=r.ver;OUT.splice(0,b.length);outSave()}
   catch(e){if(e.net){net=true;break}errF=true;errMsg=errMsg||e.message;OUT.splice(0,b.length);outSave()}}
  return net}).catch(()=>true)
 .then(async net=>{flushing=false;busyW--;
  if(net){outRetry();return}
  if(OUT.length){flush();return}
  rtN=0;if(busyW>0)return;
  if(errF)alert('Sebagian perubahan gagal disimpan: '+errMsg);
  if(errF||OTH||VER<0){OTH=false;try{await load(false)}catch(e){setSync('Gagal menyinkronkan',1);return}}
  snapSave();setSync(errF?'Ada perubahan yang gagal':'Tersinkron',errF)})}
function outRetry(){setSync('Offline · '+OUT.length+' perubahan menunggu',1);clearTimeout(rt);rt=setTimeout(flush,Math.min(30000,5000*Math.pow(2,rtN++)))}
function syncNow(){if(!ready)return;if(OUT.length){rtN=0;clearTimeout(rt);flush();return}if(busyW>0)return;syncCheck(true)}
addEventListener('online',()=>{rtN=0;clearTimeout(rt);flush()});
addEventListener('beforeunload',e=>{if(OUT.length&&!LEAVING){e.preventDefault();e.returnValue=''}});
async function load(first){
 const r=await api('getAll');
 if(!first&&(busyW>0||OUT.length||DR))return;
 ME=r.name;isAdm=r.role==='admin'||r.role==='owner';SSURL=r.ss;ACC(r);apply(r);META=metaOf(r);
 if(first&&!ready){ready=true;rebuild();render();startPoll();if(OUT.length)flush();else save()}else{rebuild();onData()}
 snapSave();setSync('Tersinkron')}
/* ---------- simpan data terakhir di perangkat (IndexedDB) supaya aplikasi langsung tampil ---------- */
let META=null,snapT=null,POLL=false;
const IDB={p:null,
 db(){return this.p||(this.p=new Promise((res,rej)=>{try{const q=indexedDB.open('positif-pos',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)}catch(e){rej(e)}}))},
 run(mode,f){return Promise.race([this.db().then(db=>new Promise(res=>{const t=db.transaction('kv',mode),st=t.objectStore('kv'),q=f(st);t.oncomplete=()=>res(q&&q.result);t.onerror=t.onabort=()=>res(null)})),new Promise(r=>setTimeout(()=>r(null),2000))]).catch(()=>null)},
 get(k){return this.run('readonly',st=>st.get(k))},set(k,v){return this.run('readwrite',st=>st.put(v,k))},del(k){return this.run('readwrite',st=>st.delete(k))}};
function metaOf(r){return{name:r.name,user:r.user,role:r.role,perm:r.perm,weak:r.weak,ss:r.ss,users:r.users,roles:r.roles}}
function snapData(){const d={};NAMES.forEach(n=>{d[n]=[]});for(const p in KO){const i=p.indexOf('/'),c=p.slice(0,i);if(d[c])d[c].push({id:p.slice(i+1),...KO[p]})}return d}
function snapNow(){clearTimeout(snapT);if(!ready||!META||!USR)return Promise.resolve();return IDB.set('snap:'+USR,{...META,users:USERS,roles:ROLEP,ver:VER,t:Date.now(),data:snapData()})}
function snapSave(){if(!ready||!META||!USR)return;clearTimeout(snapT);snapT=setTimeout(snapNow,400)}
function snapDel(u){return IDB.del('snap:'+(u||USR))}
/* tampilkan langsung dari cuplikan, lalu sinkron di belakang layar */
function fromSnap(r){ME=r.name;isAdm=r.role==='admin'||r.role==='owner';SSURL=r.ss;ACC(r);apply(r);META=metaOf(r);ready=true;rebuild();render();startPoll();if(OUT.length){OTH=true;flush()}}
/* ---------- sinkron pintar: hanya jenis data yang berubah ---------- */
let SYNCING=false;
async function syncCheck(manual){
 if(!ready||SYNCING)return;if(OUT.length){if(!flushing){rtN=0;clearTimeout(rt);flush()}return}if(busyW>0||DR)return;
 SYNCING=true;if(manual)setSync('Menyinkronkan...');
 try{let v;try{v=await api('getVer2')}catch(e){if(/AUTH/.test(e.message))throw e;v={ver:await api('getVersion'),old:1}}
  if(v.ver===VER){setSync('Tersinkron');return}
  if(v.old||VER<0||v.ver!==v.mk||VER<v.full){await load(false);return}
  const ns=Object.keys(v.cv||{}).filter(c=>v.cv[c]>VER&&NAMES.includes(c));
  if(!ns.length){await load(false);return}
  await loadPart(ns,v.ver)}
 catch(e){if(/AUTH/.test(e.message)){snapDel();logout(1)}else setSync(e.net?'Offline · data terakhir':'Koneksi bermasalah',1)}
 finally{SYNCING=false}}
async function loadPart(ns,want){
 const r=await api('getSome',ns);
 if(r.ver!==want){await load(false);return}
 if(busyW>0||OUT.length||DR)return;
 ns.forEach(k=>{R[k]=((r.data||{})[k]||[]).map(x=>{const{id,...d}=x;return{id:String(id),d}})});
 (R.jobs||[]).forEach(x=>['items','hist','rejs'].forEach(k=>{if(typeof x.d[k]==='string'){try{x.d[k]=JSON.parse(x.d[k])}catch(e){}}}));
 ns.forEach(k=>{Object.keys(KO).forEach(p=>{if(p.startsWith(k+'/'))delete KO[p]});(R[k]||[]).forEach(x=>{KO[k+'/'+x.id]=x.d})});
 VER=r.ver;rebuild();onData();snapSave();setSync('Tersinkron')}
function startPoll(){
 if(POLL)return;POLL=true;
 const chk=()=>{if(document.hidden||!ready)return;syncCheck(false)};
 setInterval(chk,10000);document.addEventListener('visibilitychange',chk);addEventListener('pageshow',e=>{if(e.persisted)chk()});addEventListener('focus',chk)}
function isBusy(){const a=document.activeElement;return !!a&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)}
function onData(){
 if(!ready)return;
 if(tab==='beranda'&&$('wp'))return;
 if(tab==='kasir'&&$('grid')){grid();lines();if(pk)renderPk();return}
 if(isBusy()){dirty=true;return}
 render()}
document.addEventListener('focusout',()=>{if(!dirty)return;clearTimeout(tm);tm=setTimeout(()=>{if(isBusy())return;dirty=false;render()},500)});
async function replaceAll(o){
 o.log=o.log||[];o.low=o.low||10;o.v=2;
 busyW++;setSync('Menyimpan...');
 try{await api('applyOps',['variants','products','sales','orders','log'].concat(o.jobs?['jobs']:[]).concat(o.gudang?['gudang']:[]).map(c=>({t:'wipe',c})))}catch(e){errF=true;alert('Gagal menghapus data lama: '+e.message)}
 KO={};OUT=[];outSave();S=o;busyW--;save();
 if(busyW===0){try{await load(false)}catch(e){}}
 render()}
async function resetAll(){if(!OWN())return toast('Hanya Owner yang bisa menghapus semua data.',1);if(await uiConfirm('Hapus SEMUA data di spreadsheet (produk, stok, transaksi, pesanan) untuk semua komputer? Tindakan ini tidak bisa dibatalkan.','Hapus semua',true))replaceAll(emptyS())}
function vSetup(){
 $('view').innerHTML=`<div class="card"><h2 style="margin:0 0 6px;font-size:26px">Selamat datang di Positif POS</h2><p class="muted" style="margin:0 0 12px">Spreadsheet masih kosong. ${isAdm?'Pilih cara memulai:':'Minta admin untuk mengisi data awal.'}</p>
 ${isAdm?`<div class="row" style="justify-content:flex-start;flex-wrap:wrap"><button class="btn sec" onclick="replaceAll(seed())">Isi dengan data contoh</button><label class="btn sec up">Impor dari berkas cadangan (.json)<input type="file" accept=".json,application/json" hidden onchange="impJ(this)"></label><button class="btn sec" onclick="skipSetup=true;render()">Mulai kosong</button></div>`:''}</div>`}
function vLogin(msg){pend=()=>vLoginUI(msg);if(tab==='beranda'&&!ready){render();return}vLoginUI(msg)}
function vLoginUI(msg){
 $('view').innerHTML=`<div class="card" style="max-width:380px;margin:40px auto"><h2 style="margin:0 0 6px;font-size:26px">Masuk ke Positif POS</h2><p class="muted" style="margin:0 0 10px">${API?'Masukkan PIN Anda.':'Isi alamat server satu kali, lalu masukkan PIN Anda.'}</p>${API?'':'<input id="url" autocomplete="off" placeholder="Alamat server (berakhiran /exec)" style="width:100%;margin-bottom:10px">'}<input id="pin" type="password" inputmode="numeric" autocomplete="off" placeholder="PIN" style="width:100%;margin-bottom:10px" onkeydown="if(event.key==='Enter')doLogin()"><button class="btn big" onclick="doLogin()">Masuk</button><p id="lm" class="bad" style="margin:10px 0 0">${esc(msg||'')}</p></div>`;
 const i=$('pin');if(i)i.focus()}
async function doLogin(){
 const p=$('pin').value.trim();if(!p)return;
 if(!API){const u=(($('url')||{}).value||'').trim();if(!/^https:\/\/script\.google\.com\/.+\/exec/.test(u)){$('lm').textContent='Isi alamat server yang benar (berakhiran /exec).';return}API=u;try{localStorage.setItem('positif_api',API)}catch(e){}}
 PIN=p;$('lm').className='muted';$('lm').textContent='Memeriksa...';setSync('Menghubungkan...');
 try{await load(true);try{localStorage.setItem('positif_pin',p)}catch(e){}}
 catch(e){PIN='';setSync('Belum masuk');const auth=/AUTH/.test(e.message);if(!auth&&!/^https:\/\//.test(API_URL)){API='';try{localStorage.removeItem('positif_api')}catch(x){}}vLogin(auth?'PIN salah atau akses dikunci sementara.':'Gagal terhubung: '+e.message)}}
function logout(){try{localStorage.removeItem('positif_pin')}catch(e){}location.reload()}
function boot(){
 let p='';try{p=localStorage.getItem('positif_pin')||''}catch(e){}
 setSync('Belum masuk');if(!p||!API){vLogin();return}
 PIN=p;pend=()=>{$('view').innerHTML='<p class="muted">Menghubungkan ke Google Sheets...</p>'};render();setSync('Menghubungkan...');
 load(true).catch(e=>{PIN='';setSync('Belum masuk');vLogin(/AUTH/.test(e.message)?'':'Gagal terhubung: '+e.message)})}
/* ---------- AKUN, RIWAYAT ORDER ---------- */
const FIT=['kasir','laporan','riwayat','produksi'];
function accInit(){const a=$('acc');if(!a)return;a.innerHTML=ready?'<button class="accb" id="accb" onclick="accToggle(event)" aria-haspopup="true" aria-expanded="false">'+esc(ME||'Akun')+' <span style="font-size:12px">&#9662;</span></button>':''}
function accFill(){const m=$('accm');if(!m)return;
 let h='<div style="padding:10px 14px 6px"><b>'+esc(ME)+'</b><div class="muted" style="font-size:13px">'+(isAdm?'Admin':'Kasir')+'</div></div><hr class="mhr"><a role="menuitem" href="#" onclick="logout();return false">Keluar</a>';
 if(isAdm)h+='<hr class="mhr"><div class="muted" style="padding:4px 14px;font-size:13px">Cadangan terakhir: '+(S.lastBackup?fmt(S.lastBackup):'belum pernah')+'</div>'+(SSURL?'<a role="menuitem" href="'+esc(SSURL)+'" target="_blank" rel="noopener">Buka spreadsheet</a>':'')+'<a role="menuitem" href="#" onclick="mkBackup();return false">Buat salinan cadangan</a><label class="mlab">Impor dari berkas .json<input type="file" accept=".json,application/json" hidden onchange="impJ(this);accClose()"></label><hr class="mhr"><a role="menuitem" class="mdanger" href="#" onclick="accClose();resetAll();return false">Hapus semua data</a><p id="bmsg" style="margin:4px 14px 8px;font-size:13px;max-width:260px"></p>';
 m.innerHTML=h}
function accPos(){const m=$('accm'),b=$('accb');if(!m||!b)return;const r=b.getBoundingClientRect();m.style.top=r.bottom+4+'px';m.style.left=Math.max(4,Math.min(r.right-m.offsetWidth,innerWidth-m.offsetWidth-4))+'px'}
function accOpen(){accFill();$('accm').classList.add('on');accPos();const b=$('accb');if(b)b.setAttribute('aria-expanded','true')}
function accClose(){const m=$('accm');if(m)m.classList.remove('on');const b=$('accb');if(b)b.setAttribute('aria-expanded','false')}
function accToggle(e){e.stopPropagation();$('accm').classList.contains('on')?accClose():accOpen()}
document.addEventListener('click',e=>{if(!e.target.closest('#accm'))accClose()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){accClose();if($('hm').classList.contains('on'))closeHm()}});
addEventListener('resize',accClose);
function closeHm(){$('hm').classList.remove('on')}
function bmsg(t,bad){const e=$('bmsg');if(e){e.textContent=t;e.className=bad?'bad':'ok'}else if(bad)alert(t)}
async function mkBackup(){bmsg('Membuat salinan...');try{const r=await api('backupCopy');S.lastBackup=new Date().toISOString();save();accFill();if(tab==='cadangan')vPengaturan();bmsg('Salinan dibuat di Google Drive: '+r.name,0)}catch(e){bmsg('Gagal membuat salinan: '+e.message,1)}}
function impJ(inp){const f=inp.files[0];inp.value='';if(!f)return;if(!OWN())return toast('Hanya Owner yang bisa mengimpor data.',1);const r=new FileReader();
 r.onload=async()=>{let o=null;try{o=migrate(JSON.parse(r.result));if(!o||!Array.isArray(o.products)||!Array.isArray(o.sales)||!Array.isArray(o.orders))throw 0}catch(e){bmsg('Berkas bukan cadangan Positif POS yang valid.',1);return}
  if(!(await uiConfirm('Ganti semua data di spreadsheet (semua komputer) dengan isi cadangan? Data saat ini akan hilang.','Ganti data',true)))return;
  cart=[];replaceAll(o).then(()=>alert('Data berhasil diimpor.'))};
 r.readAsText(f)}
document.addEventListener('keydown',e=>{
 if($('pk').classList.contains('on')){if(e.key==='Escape')closePk();return}
 if(tab!=='kasir'||$('modal').classList.contains('on')||e.ctrlKey||e.metaKey||e.altKey)return;
 const t=document.activeElement&&document.activeElement.tagName;if(t==='INPUT'||t==='SELECT'||t==='TEXTAREA')return;
 const i=$('q');if(i)i.focus()});
window.addEventListener('focus',()=>{if(tab==='kasir'&&!pk&&!$('modal').classList.contains('on')){const i=$('q');if(i)i.focus()}});
/* ===== AKSES PENGGUNA: login username + PIN, tingkat Admin / Supervisor / Staf ===== */
const ALLP=['kasir','riwayat','laporan','void','produk_edit','harga_edit','stok_ubah','pesanan','prod_lihat','prod_buat','prod_cetak','prod_bahan','prod_cutting','prod_jahit','prod_finishing','gudang','hapus','backup','pengaturan','rekap_kedawung','rekap_wonodadi','app_resi_print','app_resi_video','app_resi_pickup','app_layout','bahan_order','kinerja_input','kinerja_cek','kinerja_gaji'];
const PL={kasir:'Kasir (jual)',riwayat:'Riwayat penjualan',laporan:'Laporan penjualan',void:'Ubah/batalkan transaksi',produk_edit:'Ubah produk',harga_edit:'Ubah harga',stok_ubah:'Ubah stok',pesanan:'Pesanan custom',prod_lihat:'Lihat produksi',prod_buat:'Kelola order produksi',prod_cetak:'Proses: Cetak',prod_bahan:'Proses: Rak bahan',prod_cutting:'Proses: Cutting',prod_jahit:'Proses: Jahit',prod_finishing:'Proses: Finishing',gudang:'Data gudang',hapus:'Hapus data',backup:'Cadangan',pengaturan:'Pengaturan',rekap_kedawung:'Rekap order: Admin Kedawung',rekap_wonodadi:'Rekap order: Admin Wonodadi',app_resi_print:'App Resi Print',app_resi_video:'App Resi Video Packing',app_resi_pickup:'App Resi Pickup Kurir',app_layout:'App Layout Stiker',bahan_order:'Stok bahan: kelola order',kinerja_input:'Kinerja: HP area (setor hasil)',kinerja_cek:'Kinerja: kepala gudang (cek)',kinerja_gaji:'Kinerja: gaji & atur (Owner)'};
const RL={owner:'Owner',admin:'Admin',supervisor:'Supervisor',staf:'Staf'};
let USR='',ROLE='',PERM=[],USERS=[],ROLEP=null,WEAK=false,WARNED=false;
const can=k=>ROLE==='owner'||ROLE==='admin'||PERM.includes(k);
/* Owner: 1 akun di atas Admin. Selama server belum punya peran Owner (belum ada akun Owner), Admin bertindak sebagai Owner. */
const OWN=()=>ROLE==='owner'||(ROLE==='admin'&&!USERS.some(x=>x.r==='owner'));
const TP={kasir:['kasir'],riwayat:['riwayat'],laporan:['laporan'],produk:['produk_edit','harga_edit','stok_ubah','kasir'],stok:['stok_ubah','kasir'],bahan:['stok_ubah'],produksi:['prod_lihat','prod_buat'],pesanan:[]};
const tabOk=t=>t==='beranda'||(t==='bahan'&&!!ROLE)||(t==='pesanan'&&(ROLE==='admin'||ROLE==='supervisor'))||((t==='pengguna'||t==='peran')&&isAdm)||(t==='cadangan'&&(isAdm||can('backup')))||(t==='rekap'&&(can('rekap_kedawung')||can('rekap_wonodadi')))||(t==='kinerja'&&(can('kinerja_input')||can('kinerja_cek')||can('kinerja_gaji')))||(TP[t]||[]).some(can);
function pTabOk(k){if(k==='cetak')return can('prod_buat');if(k==='gudang')return can('prod_lihat')||can('gudang');if(k==='petugas')return isAdm||can('prod_buat');return can('prod_lihat')}
function ACC(r){USR=r.user||USR;ROLE=r.role||'admin';PERM=Array.isArray(r.perm)?r.perm:ALLP.concat(['pengguna']);USERS=r.users||[];ROLEP=r.roles||ROLEP;WEAK=!!r.weak;
 try{localStorage.setItem('positif_me',JSON.stringify({u:USR,name:r.name||ME,role:ROLE,perm:PERM,ss:r.ss||''}))}catch(e){}
 if(WEAK&&!WARNED){WARNED=true;setTimeout(()=>toast('PIN admin masih 123456. Segera ganti lewat menu akun > Ganti PIN.',1),900)}}
function applyU(r){if(r&&r.users)USERS=r.users;if(r&&r.roles)ROLEP=r.roles}
/* cek izin satu perubahan data di sisi client (server tetap memeriksa ulang) */
/* buang field normalisasi otomatis (barcode, ts, ord) bila pengguna tidak boleh ubah produk, supaya perubahan stok tetap lolos */
function sanOp(o){if(isAdm||can('produk_edit')||o.t!=='update'||!o.d||(o.c!=='variants'&&o.c!=='products'))return;['barcode','ts','ord'].forEach(k=>{delete o.d[k]})}
function opOk(o){if(isAdm)return true;const c=o.c,t=o.t,d=o.d||{};if(t==='update'&&!Object.keys(d).length)return false;
 if(t==='wipe')return false;
 if(t==='delete')return can(({sales:'void',orders:'pesanan',products:'hapus',variants:'produk_edit',jobs:'hapus',gudang:'gudang',log:'hapus'})[c]||'~');
 if(c==='sales')return t==='set'?can('kasir'):can('void');
 if(c==='products'||c==='variants'){if(t==='set')return can('produk_edit');
  return Object.keys(d).every(k=>k==='price'?can('harga_edit'):k==='_d'?(d._d<0?(can('kasir')||can('stok_ubah')):(can('stok_ubah')||can('void'))):k==='stock'?(d._d!==undefined||can('stok_ubah')):can('produk_edit'))}
 if(c==='log')return t==='set'&&['kasir','stok_ubah','produk_edit','void','prod_buat'].some(can);
 if(c==='jobs')return can('prod_buat');if(c==='gudang')return can('gudang');if(c==='orders')return can('pesanan');
 if(c==='cfg'){const k=Object.keys(d);return k.length&&k.every(x=>x==='lastBackup')?can('backup'):can('pengaturan')}
 return false}
/* ---------- masuk / keluar ---------- */
function getCred(){let v='';try{v=localStorage.getItem('positif_cred')||sessionStorage.getItem('positif_cred')||''}catch(e){}try{const o=JSON.parse(v);return o&&o.u&&(o.t||o.p)?o:null}catch(e){return null}}
/* kredensial yang disimpan: tiket sesi {u,t}. PIN hanya disimpan kalau server masih versi lama. */
function putCred(u,p,rem){try{localStorage.removeItem('positif_pin');localStorage.setItem('positif_user',u);const v=JSON.stringify(TOK?{u,t:TOK}:{u,p});if(rem){localStorage.setItem('positif_cred',v);sessionStorage.removeItem('positif_cred')}else{sessionStorage.setItem('positif_cred',v);localStorage.removeItem('positif_cred')}}catch(e){}}
function vLoginUI(msg){let u0=window.LU||'';try{u0=u0||localStorage.getItem('positif_user')||''}catch(e){}
 $('view').innerHTML=`<div class="lgn"><form class="lgc" onsubmit="doLogin();return false"><img class="lgl" src="${LOGO}" alt="Positif">${API?'':'<input id="url" autocomplete="off" placeholder="Alamat server (berakhiran /exec)">'}<input id="usr" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="Nama pengguna" value="${esc(u0)}"><input id="pin" type="password" inputmode="numeric" autocomplete="current-password" placeholder="PIN"><button class="btn big" type="submit">Masuk</button><p id="lm" class="bad">${esc(msg||'')}</p></form></div>`;
 const i=$(u0?'pin':'usr');if(i)i.focus()}
async function doLogin(){
 const u=$('usr').value.trim().toLowerCase(),p=$('pin').value.trim(),rem=true;if(!u||!p){$('lm').textContent='Isi nama pengguna dan PIN.';return}
 if(!API){const x=(($('url')||{}).value||'').trim();if(!/^https:\/\/script\.google\.com\/.+\/exec/.test(x)){$('lm').textContent='Isi alamat server yang benar (berakhiran /exec).';return}API=x;try{localStorage.setItem('positif_api',API)}catch(e){}}
 window.LU=u;USR=u;PIN=p;TOK='';$('lm').className='muted';$('lm').textContent='Memeriksa...';setSync('Menghubungkan...');
 try{await getTok();await load(true);putCred(u,p,rem);PIN=TOK?'':PIN}
 catch(e){PIN='';setSync('Belum masuk');const auth=/AUTH/.test(e.message);if(!auth&&!/^https:\/\//.test(API_URL)){API='';try{localStorage.removeItem('positif_api')}catch(x){}}vLogin(auth?(/terkunci/.test(e.message)?e.message.replace(/^AUTH\s*/,''):'Username atau PIN salah.'):'Gagal terhubung: '+e.message)}}
/* minta tiket sesi; kalau server masih versi lama, tetap memakai PIN seperti sebelumnya */
async function getTok(){try{const r=await api('login');if(r&&r.tok)TOK=r.tok}catch(e){if(/AUTH|terkunci/.test(e.message))throw e}}
async function logout(keepSnap){const t=TOK,u=USR;try{localStorage.removeItem('positif_me');localStorage.removeItem('positif_pin');localStorage.removeItem('positif_cred');sessionStorage.removeItem('positif_cred')}catch(e){}
 if(!keepSnap&&u)await snapDel(u);if(t){try{await Promise.race([api('logout'),new Promise(r=>setTimeout(r,1500))])}catch(e){}}location.reload()}
async function boot(){
 const c=getCred();try{localStorage.removeItem('positif_pin')}catch(e){}
 setSync('Belum masuk');if(!c||!API){vLogin();return}
 USR=c.u;TOK=c.t||'';PIN=c.t?'':(c.p||'');
 const snap=await IDB.get('snap:'+USR);
 if(snap&&snap.data&&snap.user===USR){
  try{fromSnap(snap);setSync('Menyinkronkan...');
   if(!TOK&&PIN){try{await getTok();if(TOK){putCred(USR,'',!!localStorage.getItem('positif_cred'));PIN=''}}catch(e){}}
   syncCheck(true);return}catch(e){ready=false;R={};KO={}}}
 pend=()=>{$('view').innerHTML='<p class="muted">Menghubungkan ke Google Sheets...</p>'};render();setSync('Menghubungkan...');
 try{if(!TOK&&PIN){try{await getTok();if(TOK){putCred(USR,'',!!localStorage.getItem('positif_cred'));PIN=''}}catch(e){}}await load(true)}
 catch(e){PIN='';TOK='';setSync('Belum masuk');vLogin(/AUTH/.test(e.message)?(/terkunci/.test(e.message)?e.message.replace(/^AUTH\s*/,''):'Sesi berakhir. Masuk lagi.'):'Gagal terhubung: '+e.message)}}
function chPin(){const d=document.createElement('div');d.className='modal on';d.style.zIndex=50;
 d.innerHTML='<div class="card" style="width:min(380px,92vw)"><h2 style="margin:0 0 10px">Ganti PIN</h2><input id="cp0" type="password" inputmode="numeric" autocomplete="current-password" placeholder="PIN lama" style="width:100%;margin-bottom:8px"><input id="cp1" type="password" inputmode="numeric" autocomplete="new-password" placeholder="PIN baru (4-10 angka)" style="width:100%;margin-bottom:8px"><input id="cp2" type="password" inputmode="numeric" autocomplete="new-password" placeholder="Ulangi PIN baru" style="width:100%"><p id="cpm" class="bad" style="margin:8px 0 0"></p><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px"><button class="btn sec" id="cpx">Batal</button><button class="btn" id="cpo">Simpan</button></div></div>';
 document.body.appendChild(d);const g=i=>d.querySelector('#'+i),cl=()=>d.remove();g('cp0').focus();g('cpx').onclick=cl;
 g('cpo').onclick=async()=>{const o=g('cp0').value.trim(),n=g('cp1').value.trim(),m=g('cp2').value.trim(),e=g('cpm');
  if(!/^\d{4,10}$/.test(n)){e.textContent='PIN baru harus 4-10 angka.';return}if(n!==m){e.textContent='Ulangan PIN baru tidak sama.';return}
  try{await api('changePin',o,n);if(!TOK){PIN=n;const c=getCred();if(c)putCred(c.u,n,!!localStorage.getItem('positif_cred'))}WEAK=false;cl();toast('PIN diganti.');accFill()}catch(x){e.textContent=x.message}}}
function accFill(){const m=$('accm');if(!m)return;
 const I=(ic,l,fn,cls)=>'<button class="acci'+(cls?' '+cls:'')+'" onclick="'+fn+'">'+IC(ic)+'<span>'+l+'</span></button>';
 m.innerHTML='<div class="acch"><b>'+esc(ME)+'</b><span>'+(RL[ROLE]||'')+' · @'+esc(USR)+'</span></div>'
 +(WEAK?'<div class="accw">PIN masih bawaan (123456). Segera ganti.</div>':'')
 +I('key','Ganti PIN','accClose();chPin()')
 +((isAdm||can('backup'))?I('settings','Pengaturan',"accClose();go('"+(isAdm?'pengguna':'cadangan')+"')"):'')
 +(can('backup')&&SSURL?'<a class="acci" href="'+esc(SSURL)+'" target="_blank" rel="noopener" onclick="accClose()">'+IC('sheet')+'<span>Buka Google Sheet</span></a>':'')
 +'<hr class="mhr">'+I('logout','Keluar','logout()','dg')}
/* ---------- petugas = pengguna ---------- */
const uAct=st=>USERS.filter(u=>u.on&&(!st||(u.p||[]).includes('prod_'+st)));
const pjName=s=>{const x=USERS.find(u=>u.on&&(u.pj||[]).includes(s));return x?x.n:''};
const pdl=st=>'<datalist id="pdl">'+uAct(st).map(p=>'<option value="'+esc(p.n)+'">').join('')+'</datalist>';
function pOk(by,st){if(!USERS.length)return true;const b=String(by).trim().toLowerCase(),x=USERS.find(u=>u.on&&(u.u===b||u.n.trim().toLowerCase()===b));
 if(!x){toast('Petugas "'+by+'" tidak terdaftar. Pilih dari daftar pengguna.',1);return false}
 if(!(x.p||[]).includes('prod_'+st)){toast(x.n+' tidak punya akses ke tahap '+STL[st]+'.',1);return false}return true}
async function uCall(fn,...a){try{applyU(await api(fn,...a));return true}catch(e){toast(e.message,1);return false}finally{uRef()}}
const uLock=x=>x&&x.r==='owner'&&ROLE!=='owner';
function uPatch(un,p){const x=USERS.find(y=>y.u===un);if(!x)return;if(uLock(x)){toast('Akun Owner hanya bisa diubah oleh Owner.',1);return uRef()}if(p.role==='owner'&&ROLE!=='owner'&&USERS.some(y=>y.r==='owner')){toast('Owner hanya boleh 1 akun.',1);return uRef()}const o=Object.assign({u:x.u,n:x.n,role:x.r,on:x.on,izin:x.iz||[]},p);
 if(p.role&&p.role!==x.r)o.izin=[];if(!String(o.n).trim()){toast('Nama wajib diisi.',1);return uRef()}return uCall('userSave',o)}
function togIz(un,k){const x=USERS.find(y=>y.u===un);if(!x||x.r==='admin'||x.r==='owner')return;const base=(ROLEP&&ROLEP[x.r])||[],E=new Set(x.p||[]);E.has(k)?E.delete(k):E.add(k);
 const iz=[];ALLP.forEach(q=>{if(E.has(q)&&!base.includes(q))iz.push('+'+q);if(!E.has(q)&&base.includes(q))iz.push('-'+q)});return uPatch(un,{izin:iz})}
async function uPin(un){const x=USERS.find(y=>y.u===un);if(!x)return;if(uLock(x)&&x.u!==USR)return toast('PIN Owner hanya bisa diganti oleh Owner.',1);const p=await uiPrompt('PIN baru untuk '+x.n+' (4-10 angka)','',{num:1});if(p===null)return;
 if(!/^\d{4,10}$/.test(p.trim())){toast('PIN harus 4-10 angka.',1);return}uCall('userSave',{u:x.u,n:x.n,role:x.r,on:x.on,izin:x.iz||[],pin:p.trim()}).then(ok=>ok&&toast('PIN '+x.n+' diperbarui.'))}
async function uDel(un){const x=USERS.find(y=>y.u===un);if(x&&x.r==='owner')return toast('Akun Owner tidak bisa dihapus.',1);if(!x||!(await askC('Hapus pengguna '+x.n+' (@'+x.u+')? Ia tidak bisa masuk lagi.','Hapus')))return;uCall('userDelete',un)}
function addU(){const u=$('nu').value.trim().toLowerCase(),n=$('nn').value.trim(),p=$('np').value.trim(),r=$('nr').value;
 if(!u||!n||!p)return toast('Isi username, nama, dan PIN.',1);uCall('userSave',{u,n,pin:p,role:r,on:true,izin:[]})}
function togR(r,k){const b=((ROLEP&&ROLEP[r])||[]).slice(),i=b.indexOf(k);i<0?b.push(k):b.splice(i,1);uCall('roleSave',r,b)}
function setPJ(s,un){uCall('setPJ',s,un)}
/* izin dikelompokkan supaya mudah dibaca */
const PGRP=[['Penjualan & stok',['kasir','riwayat','laporan','void','produk_edit','harga_edit','stok_ubah','hapus']],['Produksi',['prod_lihat','prod_buat','prod_cetak','prod_bahan','prod_cutting','prod_jahit','prod_finishing','gudang']],['Rekap order',['rekap_kedawung','rekap_wonodadi']],['Stok bahan baku',['bahan_order']],['Gaji & kinerja',['kinerja_input','kinerja_cek','kinerja_gaji']],['Aplikasi Hub',['app_resi_print','app_resi_video','app_resi_pickup','app_layout']],['Sistem',['backup','pengaturan']]];
const chipG=(has,fn)=>PGRP.map(([g,ks])=>'<div class="pgl">'+g+'</div><div class="chs">'+ks.map(k=>'<button class="chp'+(has(k)?' on':'')+'" onclick="'+fn(k)+'">'+PL[k]+'</button>').join('')+'</div>').join('');
function usersHtml(part){let h='';
 if(isAdm){
  if(part!=='r')h+='<div class="card"><h2 style="margin:0 0 6px">Pengguna</h2><p class="muted" style="margin:0 0 10px">Setiap karyawan punya username dan PIN sendiri. Akun yang sama dipakai untuk masuk ke aplikasi dan sebagai petugas / penanggung jawab produksi.</p><div class="ptl">'
  +USERS.map(x=>{const me=x.u===USR,adm=x.r==='admin'||x.r==='owner',lk=me||uLock(x)||x.r==='owner',rls=(ROLE==='owner'&&!USERS.some(y=>y.r==='owner'&&y.u!==x.u)?['owner']:[]).concat(['admin','supervisor','staf']).concat(x.r==='owner'&&ROLE!=='owner'?['owner']:[]);
   const chips=adm?'<span class="muted" style="font-size:13px">'+RL[x.r]+' punya semua akses.</span>':chipG(k=>(x.p||[]).includes(k),k=>'togIz(\''+x.u+'\',\''+k+'\')');
   return '<div class="pt"><div class="pth"><input value="'+esc(x.n)+'"'+(uLock(x)?' disabled':'')+' onchange="uPatch(\''+x.u+'\',{n:this.value})"><select aria-label="Tingkat"'+(lk?' disabled':'')+' onchange="uPatch(\''+x.u+'\',{role:this.value})">'+rls.map(r=>'<option value="'+r+'"'+(x.r===r?' selected':'')+'>'+RL[r]+'</option>').join('')+'</select><button class="chp'+(x.on?' on':'')+'"'+(lk?' disabled':'')+' onclick="uPatch(\''+x.u+'\',{on:'+(!x.on)+'})">'+(x.on?'Aktif':'Nonaktif')+'</button><button class="ib" title="Atur PIN baru" aria-label="Atur PIN baru" onclick="uPin(\''+x.u+'\')">'+IC('key')+'</button>'+(lk?'':'<button class="ib" title="Hapus" aria-label="Hapus" onclick="uDel(\''+x.u+'\')">'+IC('trash')+'</button>')+'</div><div class="muted" style="font-size:13px;margin:6px 0 0">@'+esc(x.u)+((x.pj||[]).length?' · PJ: '+x.pj.map(s=>STL[s]).join(', '):'')+'</div><div class="muted" style="font-size:13px;margin:8px 0 4px">Akses</div><div class="pgw">'+chips+'</div></div>'}).join('')+'</div>'
  +'<div class="form" style="margin-top:12px;flex-wrap:wrap"><input id="nu" placeholder="Username (huruf kecil)" autocapitalize="none" autocomplete="off"><input id="nn" placeholder="Nama lengkap" autocomplete="off"><input id="np" placeholder="PIN (4-10 angka)" inputmode="numeric" autocomplete="off"><select id="nr" aria-label="Tingkat">'+['staf','supervisor','admin'].map(r=>'<option value="'+r+'">'+RL[r]+'</option>').join('')+'</select><button class="btn" onclick="addU()">Tambah pengguna</button></div></div>';
  if(part!=='u')h+='<div class="card"><h2 style="margin:0 0 6px">Akses per tingkat</h2><p class="muted" style="margin:0 0 10px">Pengaturan dasar tiap tingkat. Pengguna tertentu bisa diberi tambahan atau pengurangan akses di daftar di atas.</p>'
  +['supervisor','staf'].map(r=>'<div class="muted" style="font-size:13px;margin:10px 0 4px"><b>'+RL[r]+'</b></div><div class="pgw">'+chipG(k=>((ROLEP&&ROLEP[r])||[]).includes(k),k=>'togR(\''+r+'\',\''+k+'\')')+'</div>').join('')+'</div>'}
 return h}
function pjHtml(){const dis=(isAdm||can('prod_buat'))?'':' disabled';
return '<div class="card"><h2 style="margin:0 0 6px">Penanggung jawab per divisi</h2><div class="pjg">'+RS.map(s=>{const o=uAct(s),cur=USERS.find(u=>u.on&&(u.pj||[]).includes(s));return'<label><span>'+STL[s]+'</span><select'+dis+' onchange="setPJ(\''+s+'\',this.value)"><option value="">- belum ditentukan -</option>'+o.map(p=>'<option value="'+p.u+'"'+(cur&&cur.u===p.u?' selected':'')+'>'+esc(p.n)+'</option>').join('')+'</select></label>'}).join('')+'</div><p class="muted" style="margin:8px 0 0">Pilihan berisi pengguna aktif yang punya akses ke tahap tersebut.</p></div>';
}
function petugasView(){if(tab!=='produksi'||pst!=='petugas'||!$('pbody'))return;
 $('pbody').innerHTML='<div class="pfh"><div><h1 class="pt">Penanggung jawab</h1><p class="muted">Pilih siapa yang bertanggung jawab di tiap divisi. Nama diambil dari akun pengguna yang sama dengan login.</p></div></div>'+pjHtml()}
/* tampilan Pengaturan (Pengguna · Peran · Cadangan) ada di pengaturan.html */
const uRef=()=>{if(tab==='pengguna'||tab==='peran')vPengaturan();else petugasView()};

/* ---------- sinkronisasi ringan ---------- */
let OTH=false;
/* Setelah pindah tahap produksi: muat hanya order, varian, dan riwayat stok. Kalau ada perubahan lain dari perangkat lain, muat penuh. */
async function loadSmart(pv,n){
 if(n<=0||pv<0){await load(false);return}
 const ns=['jobs','variants','log'],r=await api('getSome',ns);
 if(r.ver!==pv+n){await load(false);return}
 if(busyW>0||OUT.length||DR)return;
 const keep={products:S.products,sales:S.sales,orders:S.orders,gudang:S.gudang,low:S.low,lastBackup:S.lastBackup};
 ns.forEach(k=>{R[k]=((r.data||{})[k]||[]).map(x=>{const{id,...d}=x;return{id:String(id),d}})});
 (R.jobs||[]).forEach(x=>['items','hist','rejs'].forEach(k=>{if(typeof x.d[k]==='string'){try{x.d[k]=JSON.parse(x.d[k])}catch(e){}}}));
 ns.forEach(k=>{Object.keys(KO).forEach(p=>{if(p.startsWith(k+'/'))delete KO[p]});(R[k]||[]).forEach(x=>{KO[k+'/'+x.id]=x.d})});
 VER=r.ver;rebuild();Object.assign(S,keep);
 const vs={};(R.variants||[]).forEach(x=>{vs[x.id]=x.d});
 S.products.forEach(p=>p.variants.forEach(v=>{const d=vs[String(v.id)];if(d)v.stock=+d.stock||0}));
 onData();setSync('Tersinkron')}
