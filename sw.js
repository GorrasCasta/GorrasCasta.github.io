const V="gc-v76", FOTOS="gc-fotos";
const CORE=["./","index.html","css/catalogo.css?v=57","js/datos.js?v=57","js/catalogo.js?v=57","datos/ajustes.json","datos/gorras.json","datos/estado.json"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!==FOTOS).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
// Primero la red (siempre lo más nuevo) y, si no hay internet, lo guardado
const guarda=(key,res)=>{ if(res&&res.ok){const c=res.clone();caches.open(V).then(x=>x.put(key,c));} return res; };
const deCache=key=>caches.match(key).then(h=>h||caches.match(key,{ignoreSearch:true}));
// Archivos con versión: lo guardado primero (de cualquier versión); si no hay, red con 6 s de espera
const esperaRed=r=>new Promise((ok,no)=>{ const t=setTimeout(()=>no(new Error("lento")),6000); fetch(r).then(x=>{clearTimeout(t);ok(x)},e=>{clearTimeout(t);no(e)}); });
// Red primero, pero si la señal es lenta (más de 2.5 s) se muestra lo guardado y la red actualiza para la próxima vez
const red=(r,key)=>{ key=key||r;
  const net=fetch(r.url,{cache:"no-cache"}).then(res=>guarda(key,res));
  return new Promise(ok=>{ let listo=false;
    const t=setTimeout(()=>deCache(key).then(h=>{ if(h&&!listo){listo=true;ok(h);} }),2500);
    net.then(res=>{ if(!listo){listo=true;clearTimeout(t);ok(res);} })
       .catch(()=>deCache(key).then(h=>{ if(!listo){listo=true;clearTimeout(t);ok(h||Response.error());} }));
  }); };
// Archivos con versión (?v=): primero lo guardado (no cambian hasta que sube la versión)
const fijo=r=>caches.match(r).then(h=>h||esperaRed(r).then(res=>guarda(r,res)).catch(()=>caches.match(r,{ignoreSearch:true}).then(x=>x||Response.error())));
self.addEventListener("fetch",e=>{
  const r=e.request; if(r.method!=="GET") return;
  const u=new URL(r.url);
  if(u.origin!==location.origin){ return; }
  const p=u.pathname;
  if(/\/a-[a-z0-9]+\.html$/.test(p)||p.includes("/datos-prueba/")) return;   // panel y datos de prueba: siempre directo a la red
  if(r.mode==="navigate"){
    if(p==="/"||p==="/index.html"){ e.respondWith(red(r,"index.html")); return; }
    if(!p.endsWith(".html")) return;   // links cortos (/mayoreo, /catalogo): directo a la red, sin interceptar
    const name=p.split("/").pop();
    e.respondWith(fetch(u.href,{cache:"no-cache"}).then(res=>{ if(res.ok){const c=res.clone();caches.open(V).then(x=>x.put(name,c));} return res; }).catch(()=>caches.match(name).then(h=>h||caches.match("index.html"))));
    return;
  }
  if((p.includes("/js/")||p.includes("/css/"))&&u.searchParams.has("v")){ e.respondWith(fijo(r)); return; }
  if(p.includes("/datos/")||p.includes("/js/")||p.includes("/css/")){ e.respondWith(red(r)); return; }
  e.respondWith(caches.match(r).then(hit=>hit||fetch(u.href,{cache:"no-cache"}).then(res=>{ if(res.ok||res.type==="opaque"){const c=res.clone();caches.open(/\/(t|img)\//.test(p)?FOTOS:V).then(x=>x.put(r,c));} return res; })));
});
