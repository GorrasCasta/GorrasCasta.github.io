const V="gc-v50", FOTOS="gc-fotos";
const CORE=["./","index.html","css/catalogo.css?v=50","js/datos.js?v=50","js/catalogo.js?v=50","datos/ajustes.json","datos/gorras.json","datos/estado.json","og.jpg","manifest.json","icon-192.png","icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!==FOTOS).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
// Primero la red (siempre lo más nuevo) y, si no hay internet, lo guardado
const red=(r,key)=>fetch(r.url,{cache:"no-cache"}).then(res=>{ if(res.ok){const c=res.clone();caches.open(V).then(x=>x.put(key||r,c));} return res; }).catch(()=>caches.match(key||r).then(h=>h||caches.match(key||r,{ignoreSearch:true})));
self.addEventListener("fetch",e=>{
  const r=e.request; if(r.method!=="GET") return;
  const u=new URL(r.url);
  if(u.origin!==location.origin){ return; }
  const p=u.pathname;
  if(/\/a-[a-z0-9]+\.html$/.test(p)||p.includes("/datos-prueba/")) return;   // panel y datos de prueba: siempre directo a la red
  if(r.mode==="navigate"){
    if(p.endsWith("/")||p.endsWith("index.html")){ e.respondWith(red(r,"index.html")); return; }
    const name=p.split("/").pop();
    e.respondWith(fetch(u.href,{cache:"no-cache"}).then(res=>{ if(res.ok){const c=res.clone();caches.open(V).then(x=>x.put(name,c));} return res; }).catch(()=>caches.match(name).then(h=>h||caches.match("index.html"))));
    return;
  }
  if(p.includes("/datos/")||p.includes("/js/")||p.includes("/css/")){ e.respondWith(red(r)); return; }
  e.respondWith(caches.match(r).then(hit=>hit||fetch(u.href,{cache:"no-cache"}).then(res=>{ if(res.ok||res.type==="opaque"){const c=res.clone();caches.open(V).then(x=>x.put(r,c));} return res; })));
});
