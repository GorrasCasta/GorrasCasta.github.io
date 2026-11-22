/* Casta · motor del catálogo (index.html y prueba.html). Los datos vienen de datos/*.json vía js/datos.js.
   No edites precios ni productos aquí: se cambian desde el panel de administración. */
CASTA.cargar().then(D => {
CASTA.franjaPrueba();
if(CASTA.mantenimiento(D)) return;
const PRUEBA = D.MODO === "prueba";
const AJ = D.aj, TIENDA = AJ.tienda || {}, POOL = D.pool;
const WHATSAPP = TIENDA.whatsapp || "526624248769";
const NOMBRE = TIENDA.nombre || "Casta Caps";
const CIERRE = AJ.cierre || {dia:1, hora:12};   // cierre del pedido al proveedor (hora Sonora)
const PROMO_ON = D.promoOn;
const P1 = POOL.precio, PR = POOL.promo || {};
const PROMO = PROMO_ON ? {1:P1, 2:PR.p2, 3:PR.p3} : {1:P1, 2:2*P1, 3:3*P1};
const MAYOREO = [...(POOL.mayoreo||[])].filter(m=>m.min>1 && m.precio>0).sort((a,b)=>b.min-a.min);   // de mayor a menor
const M1 = MAYOREO.length ? MAYOREO[MAYOREO.length-1].min : 1e9;   // piezas mínimas para mayoreo
const CATS = D.cats.filter(c => c.prods.some(d => !d.o));
const CATK = {}; D.cats.forEach(c => CATK[c.k] = c);
const catOf = d => CATK[d.cat];
const OCULTOS = D.prods.filter(d => d.o).map(d => d.c);
const AGOTADOS = {}, STOCK_SIRM = {};
D.prods.forEach(d => { if(d.x) AGOTADOS[d.c] = d.x; if(d.s) STOCK_SIRM[d.c] = d.s; });
D.prods.forEach(d => { d.uid = d.cat === "gorras" ? d.id : d.cat + ":" + d.id; d.v = Array.isArray(d.v) ? d.v : null; });
const G = CATK.gorras || CATS[0] || {variante:{opciones:[]}, lineas:[]};
const TALLAS = (G.variante && G.variante.opciones) || [];
const CM = (G.variante && G.variante.extra) || {};
const VO = d => ((catOf(d) || {}).variante || {}).opciones || [];
const VNOM = d => ((catOf(d) || {}).variante || {}).nombre || "Talla";
const UTXT = d => ((catOf(d) || {}).variante || {}).unica || "Única";
const MULTI = CATS.length > 1;
const pzs = n => MULTI ? (n===1?"pieza":"piezas") : (n===1?"gorra":"gorras");
const $ = s => document.querySelector(s);
const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const fmt = n => "$" + n.toLocaleString("es-MX");
const store = { get(k,d){try{return JSON.parse(localStorage.getItem(CASTA.K(k)))??d}catch(e){return d}}, set(k,v){try{localStorage.setItem(CASTA.K(k),JSON.stringify(v))}catch(e){}} };

/* ---------- Código de vendedor (cambia cada lunes, hora de Sonora) ---------- */
const VALF = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const semana = (ms=Date.now()) => Math.floor((ms/864e5 - 7/24 - 4)/7);
const finSemana = w => new Date((w*7+4+6)*864e5).toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long",timeZone:"UTC"});
const limpiaCod = c => (c||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
const estadoCod = c => { c = limpiaCod(c); if(!c) return "vacio"; if(c.length!==5 || [...c].some(x=>!VALF.includes(x))) return "mal"; return c[0]===VALF[semana()%VALF.length] ? "ok" : "vencido"; };
let vend = store.get("vend", null);
if(vend && (vend.w!==semana() || estadoCod(vend.c)!=="ok")) { vend = null; store.set("vend", null); }
let vendAviso = "", pb = null;
try{ const b0 = new URLSearchParams(location.search).get("b"); if(b0){ pb = b0; try{ sessionStorage.setItem("gate","1"); }catch(e){} } }catch(e){}
try{
  const pv = new URLSearchParams(location.search).get("v");
  if(pv){ const e = estadoCod(pv);
    if(e==="ok"){ vend = {c:limpiaCod(pv), w:semana()}; store.set("vend", vend); vendAviso = "Código de vendedor "+vend.c+" aplicado ✓"; }
    else if(e==="vencido") vendAviso = "Ese código de vendedor ya no está vigente. Pide el de esta semana.";
    else vendAviso = "Código de vendedor no válido.";
    history.replaceState(null, "", location.pathname + location.hash);
  }
}catch(e){}

const DATA_ALL = D.prods;
const NUEVOS_DESDE = AJ.nuevos_desde || 1e9;   // gorras desde este número salen primero (ordenadas como se agregaron)
const num = d => d.num, esNuevo = d => !!d.nv || (d.cat==="gorras" && num(d) >= NUEVOS_DESDE);
const POS = {}; D.cats.forEach(c => (c.orden||[]).forEach((k,i)=>POS[k]=i+1));
const CPOS = {}; CATS.forEach((c,i)=>CPOS[c.k]=i);
const DATA = DATA_ALL.filter(d=>!d.o && CPOS[d.cat]!==undefined);
DATA.sort((a,b)=> (CPOS[a.cat]-CPOS[b.cat]) || ((POS[a.c]||9999)-(POS[b.c]||9999)) || (esNuevo(b)-esNuevo(a)) || (num(a)-num(b)));
DATA.forEach(d => { const a = AGOTADOS[d.c]; if(a){ const ts = a==="todas"?(d.v?[...d.v,"Única"]:Object.keys(d.f)):a; d.out = new Set(ts); } else d.out = new Set(); d.s = norm(d.c+" "+d.c.replace(/^\D+-?/,"")+" "+d.n+" "+d.id.replace(/-/g," ")+" "+(d.l||"")+" "+(catOf(d)||{}).n); });

/* ---------- Colecciones (por categoría: las fijas + las de datos/ajustes.json) ---------- */
const COLS_BASE = [
  {k:"todo", n:"Todo", t:()=>true},
  {k:"sirm", n:"Entrega inmediata SIRM", t:d=>!!STOCK_SIRM[d.c]},
  {k:"fav", n:"Favoritas ♥", t:d=>favs.has(d.uid)},
];
const colsDe = c => COLS_BASE;
let COLS = COLS_BASE;
const COLORS = [
  {k:"negra",c:"#111"},{k:"crema",c:"#efe6cf"},{k:"blanca",c:"#fff"},{k:"azul",c:"#2f5bd3"},{k:"roja",c:"#d4302b"},
  {k:"gris",c:"#8d8d8d"},{k:"cafe",c:"#6b4a2f"},{k:"camel",c:"#c9a46c"},{k:"verde",c:"#1f9a6e"},{k:"morada",c:"#7b3fb5"}
];

let cat = (CATS[0]||{}).k, estilo = "todos", size = store.get("talla", null), col = "todo", color = null, q = "";
try{ const c0 = new URLSearchParams(location.search).get("c"); if(c0 && CATS.some(c=>c.k===c0)) cat = c0; }catch(e){}
let favs = new Set(store.get("favs", []));
let bag = store.get("bolsa", []).filter(it => DATA_ALL.some(d=>d.uid===it.id));   // [{id,t,q}]
let list = [], cur = null, curT = null, curQ = 1;
const CC = () => CATK[cat] || G;

/* ---------- Puerta de talla (solo gorras) ---------- */
const PUERTA = !!(CATK.gorras && G.variante && G.variante.puerta && CPOS.gorras!==undefined);
function buildGate(){
  if(!PUERTA){ $("#gate").hidden = true; $("#pill").hidden = true; return; }
  const g = $("#gsizes"), GD = DATA.filter(d=>d.cat==="gorras"); g.innerHTML = "";
  TALLAS.forEach(t=>{
    const n = GD.filter(d=>has(d,t)).length;
    const b = document.createElement("button");
    b.innerHTML = `<b>${t}</b><span>${CM[t]||""} · ${n} modelos</span>`;
    b.onclick = ()=>{ setSize(t); $("#gate").hidden = true; };
    g.appendChild(b);
  });
  { const n = GD.filter(d=>has(d,UNI)).length;
    if(n){ const b = document.createElement("button");
      b.innerHTML = `<b style="font-size:17px">Ajustable</b><span>Snapback y curvas · ${n} modelos</span>`;
      b.onclick = ()=>{ setSize(UNI); $("#gate").hidden = true; };
      g.appendChild(b); } }
  $("#gall").onclick = ()=>{ setSize(null); $("#gate").hidden = true; };
  $("#pill").onclick = ()=>{ $("#gate").hidden = false; };
  let ses = false; try{ ses = sessionStorage.getItem("gate")==="1"; }catch(e){}
  $("#gate").hidden = ses;
  g.querySelectorAll("button").forEach((b,i)=>{ const t = i<TALLAS.length ? TALLAS[i] : UNI; if(store.get("visto",false) && size===t) b.classList.add("prev"); });
}
let setSize = function(t){ try{ sessionStorage.setItem("gate","1"); }catch(e){} size = t; store.set("talla", t); store.set("visto", true); $("#pill").textContent = "Talla: " + (t || "todas"); if(t && cat!=="gorras"){ cat = "gorras"; estilo = "todos"; col = "todo"; buildFilters(); } render(); }

/* ---------- Filtros ---------- */
const LIN = {}; D.cats.forEach(c => (c.lineas||[]).forEach(l => LIN[l.k] = l));
const GRP = {};   // grupo -> líneas (p. ej. newera -> 59FIFTY, 9FIFTY, 9FORTY)
D.cats.forEach(c => (c.lineas||[]).forEach(l => { if(l.grupo) (GRP[l.grupo] = GRP[l.grupo] || []).push(l.k); }));
const GINFO = {}; D.cats.forEach(c => (c.grupos||[]).forEach(g => GINFO[g.k] = g));
const NE = D.cats.flatMap(c => (c.lineas||[]).filter(l=>l.pool).map(l=>l.k));   // líneas con precio, promo y mayoreo de New Era AA
const grpDe = e => Object.keys(GRP).find(g => GRP[g].includes(e));
const enEstilo = d => d.cat===cat && (estilo==="todos" || (GRP[estilo] ? GRP[estilo].includes(d.e) : d.e===estilo));
const isPool = d => CASTA.enPool(D, d);
const isEE = d => !isPool(d) && !d.pr && !d.p && !!(LIN[d.e]||{}).mayoreoMas;          // Edición Especial: su precio, mayoreo = escalón New Era AA + extra
const isOrig = d => !!(LIN[d.e]||{}).original;
const esp = (d,t) => isPool(d) ? null : CASTA.precioBase(D, d, t);
const precioDe = (d,t) => isPool(d) ? P1 : CASTA.precioBase(D, d, t);   // precio fijo (sin promo ni mayoreo) o null si es New Era AA
const fmtP = n => n>0 ? fmt(n) : "Precio a consultar";
const yjunta = a => a.length<2 ? a.join("") : a.slice(0,-1).join(", ")+" y "+a[a.length-1];
const NETXT = yjunta(NE.map(e=>(LIN[e]||{}).n||e));
const ESPTXT = (()=>{ const by = {}; D.cats.filter(c=>CPOS[c.k]!==undefined).forEach(c=>(c.lineas||[]).forEach(l=>{ if(!l.pool && !l.mayoreoMas && !l.original && l.precio>0 && DATA.some(d=>d.e===l.k)) (by[l.precio]=by[l.precio]||[]).push(l.n||l.k); }));
  return Object.keys(by).sort((a,b)=>a-b).map(p=>yjunta(by[p])+" "+fmt(+p)+" c/u").join(", "); })();
const ESPN = yjunta(D.cats.filter(c=>CPOS[c.k]!==undefined).flatMap(c=>(c.lineas||[]).filter(l=>!l.pool && !l.mayoreoMas && !l.original && DATA.some(d=>d.e===l.k)).map(l=>l.n||l.k)));
const ELBL = k => { if(k==="todos") return ["Todas","Todo el catálogo"];
  if(GINFO[k]) return [GINFO[k].n, (GINFO[k].sub||"")+" · <b>"+fmt(P1)+"</b>"];
  const l = LIN[k]; if(!l) return [k.split(" ")[0], k.split(" ").slice(1).join(" ")];
  return [l.n||k, [l.sub, l.pool ? "" : (l.precio>0 ? "<b>"+fmt(l.precio)+"</b>" : "")].filter(Boolean).join(" · ")]; };
const corto = e => ELBL(e)[0];
const estilosDe = c => { const out = ["todos"]; (c.lineas||[]).forEach(l => { const k = l.grupo || l.k; if(!out.includes(k)) out.push(k); }); return out; };
const hayEn = (C,e) => DATA.some(d=>d.cat===C.k && (GRP[e]?GRP[e].includes(d.e):d.e===e)) || (PRUEBA && LIN[e]);
let filtrosUna = false;
function buildFilters(){
  const C = CC();
  const ct = $("#cats"); ct.innerHTML = ""; ct.hidden = !MULTI;
  CATS.forEach(c=>{ const b=document.createElement("button"); b.dataset.c=c.k;
    const n = DATA.filter(d=>d.cat===c.k).length; b.innerHTML = `${c.n}<small>${n} ${PRUEBA&&!c.activa?"· oculta en público":"modelos"}</small>`;
    b.onclick=()=>{ if(cat===c.k) return; cat=c.k; estilo="todos"; col="todo"; color=null; buildFilters(); render(); }; ct.appendChild(b); });
  const et = $("#estilos"); et.innerHTML = "";
  const ES = estilosDe(C).filter(e=>e==="todos"||hayEn(C,e));
  et.hidden = ES.length<=2;
  ES.forEach(e=>{
    const b=document.createElement("button"); b.dataset.e=e;
    const [a,c] = ELBL(e);
    b.innerHTML = `${a}<small>${c}</small>`;
    b.onclick=()=>{ estilo=e; render(); }; et.appendChild(b);
  });
  const sb = $("#subest"); sb.innerHTML = "";
  Object.keys(GRP).forEach(g=>{ if(!(C.lineas||[]).some(l=>l.grupo===g)) return;
    [[g,"Todas",ELBL(g)[0]],...GRP[g].map(e=>[e,...ELBL(e)])].forEach(([e,a,c])=>{
      const b=document.createElement("button"); b.dataset.e=e; b.dataset.g=g; b.innerHTML = `${a}<small>${c}</small>`;
      b.onclick=()=>{ estilo=e; render(); }; sb.appendChild(b);
    }); });
  COLS = colsDe(C);
  const r = $("#cols"); r.innerHTML = "";
  COLS.filter(c=>c.k!=="sirm"||DATA.some(d=>d.cat===C.k && STOCK_SIRM[d.c])).filter(c=>COLS_BASE.includes(c)||DATA.some(d=>d.cat===C.k&&c.t(d))).forEach(c=>{
    const b = document.createElement("button"); b.className="col"; b.dataset.k=c.k;
    b.onclick = ()=>{ col=c.k; if(c.k==="sirm") estilo="todos"; render(); };
    r.appendChild(b);
  });
  if(filtrosUna) return; filtrosUna = true;
  const d = $("#colors"); d.style.display = "none";
  [].forEach(c=>{
    const b = document.createElement("button"); b.className="dot";
    b.innerHTML = `<i style="background:${c.c}"></i>${c.k==="cafe"?"café":c.k}`;
    b.onclick = ()=>{ color = color===c.k?null:c.k; render(); };
    b.dataset.k=c.k; d.appendChild(b);
  });
  $("#q").addEventListener("input", e=>{ q = norm(e.target.value.trim()); render(); });
  $("#clear").onclick = ()=>{ estilo="todos"; col="todo"; color=null; q=""; $("#q").value=""; render(); };
}
const UNI = "Única";
const enSirmT = (d,t) => { const s = STOCK_SIRM[d.c]; return !!s && Array.isArray(s) && s.includes(t); };
const enSirm = (d,t) => { const s = STOCK_SIRM[d.c]; if(!s) return false; if(s==="todas"||s===UNI||!t) return true; return [].concat(s).includes(t); };
const ALLT = [...TALLAS, UNI];
const ALLD = d => [...VO(d), UNI];
const isUni = d => d.v ? d.v.length===0 : !!d.f[UNI];
const tiene = (d,t) => d.v ? d.v.includes(t) : (!!d.f[t] || enSirmT(d,t));
const has = (d,t) => isUni(d) ? (!t || t===UNI) && !d.out.has(UNI) : tiene(d,t) && !d.out.has(t);
const vars = d => isUni(d) ? [UNI] : VO(d).filter(t=>has(d,t));   // variantes disponibles
const vtxt = (d,t) => t===UNI ? UTXT(d) : (d.cat==="gorras" ? "T. "+t : t);
const sizeOn = () => !!size && cat==="gorras" && (estilo==="todos" || (GRP[estilo]||[estilo]).some(e=>(LIN[e]||{}).porVariante));
const base = () => DATA.filter(d=> enEstilo(d) && (sizeOn() ? has(d,size) : ALLD(d).some(t=>has(d,t))));
const stockAll = () => DATA.filter(d=> STOCK_SIRM[d.c] && enEstilo(d));
const stTallas = d => { const s = STOCK_SIRM[d.c]; return !s ? [] : Array.isArray(s) ? s : (isUni(d)?[UNI]:VO(d).filter(t=>tiene(d,t))); };
const sq = (d,t) => d.f[t] && !(d.w||[]).includes(t);
let WP = false; try{ WP = localStorage.getItem("wp")==="1"; }catch(e){}
const px = p => p && WP && !/^data:/.test(p) ? p.replace(/\.jpg$/,".webp") : p;
const th = p => p ? px(p.replace("img/","t/")) : p;
const foto = d => d.f[size] || d.f["*"] || d.f[ALLD(d).find(t=>d.f[t])] || Object.values(d.f)[0] || "og.jpg";
const fotoT = (d,t) => d.f[t] || foto(d);

/* ---------- Catálogo ---------- */
function render(){
  const words = q.split(/\s+/).filter(Boolean);
  const pool = col==="sirm" ? stockAll() : base();
  document.querySelectorAll(".col").forEach(b=>{
    const c = COLS.find(x=>x.k===b.dataset.k);
    b.setAttribute("aria-pressed", col===c.k);
    const bp = base(); b.innerHTML = c.k==="sirm" ? `${c.n}<span>${stockAll().length} modelos · ${stockAll().reduce((a,d)=>a+stTallas(d).length,0)} gorras</span>` : `${c.n}<span>${bp.filter(c.t).length} modelos</span>`;
  });
  document.querySelectorAll(".dot").forEach(b=>b.setAttribute("aria-pressed", color===b.dataset.k));
  const neOn = estilo==="newera" || NE.includes(estilo);
  document.querySelectorAll("#estilos button").forEach(b=>b.setAttribute("aria-pressed", b.dataset.e==="newera" ? neOn : estilo===b.dataset.e));
  $("#subest").hidden = !neOn;
  document.querySelectorAll("#subest button").forEach(b=>b.setAttribute("aria-pressed", estilo===b.dataset.e));
  const ct = (COLS.find(c=>c.k===col)||COLS[0]).t;
  list = pool.filter(d => ct(d) && (!color || d.id.includes(color)) && words.every(w=>d.s.includes(w)));
  $("#count").textContent = `${list.length} ${list.length===1?"modelo":"modelos"}` + (col==="sirm"?" en stock · todas las tallas":sizeOn()?` en talla ${size}`:"");
  $("#clear").hidden = (col==="todo" && !color && !q && estilo==="todos");
  const g = $("#grid"); g.innerHTML = "";
  if(!list.length){ const L0 = LIN[estilo]; g.innerHTML = `<div class="empty">${col==="fav"?"Aún no marcas favoritas. Toca ♡ en las gorras que te gusten.":L0&&!DATA.some(d=>d.e===estilo)?"Próximamente: "+(L0.n||estilo)+" "+fmt(L0.precio)+".":"No hay modelos con esos filtros."}</div>`; return; }
  shown = 0; drawMore();
}
let shown = 0;
const more = document.createElement("div"); more.style.cssText="grid-column:1/-1;height:1px";
const io = ("IntersectionObserver" in window) ? new IntersectionObserver(es=>{ if(es.some(e=>e.isIntersecting)) drawMore(); },{rootMargin:"800px"}) : null;
const szTxt = (d,ts) => { const st = stTallas(d), lst = st.map(t=>vtxt(d,t)).join(", ");
  if(col==="sirm") return `${d.c} · ⚡ ${lst}`;
  if(isUni(d)) return `${d.c} · ${st.length?"⚡ ":""}${UTXT(d)}`;
  if(sizeOn()) return `${d.c} · ${enSirm(d,size)?"⚡ ":""}T. ${size}`;
  return st.length ? `${d.c} · ⚡ ${lst}` : `${d.c} · ${ts.length} ${d.cat==="gorras"?"tallas":ts.length===1?"opción":"opciones"}`; };
function drawMore(){
  const g = $("#grid"); if(more.parentNode) more.remove();
  const frag = document.createDocumentFragment();
  list.slice(shown, shown+24).forEach(d=>{
    const ts = vars(d);
    const c = document.createElement("article"); c.className="card";
    c.innerHTML = `<div class="ph"><img loading="${shown<4?"eager":"lazy"}" decoding="async" src="${th(foto(d))}" alt="">${(col==="sirm"||enSirm(d,sizeOn()?size:null))?`<span class="now">⚡ Inmediata SIRM</span>`:""}</div>
      ${isOrig(d)?`<span class="tag orig">Original</span>`:d.l&&d.l!=="MLB"?`<span class="tag">${d.l}</span>`:""}
      <button class="fav" aria-label="Favorita" aria-pressed="${favs.has(d.uid)}">${favs.has(d.uid)?"♥":"♡"}</button>
      <div class="tx"><span class="etag${isOrig(d)?" og":isEE(d)?" ee":""}">${isPool(d)?"New Era AA · "+corto(d.e):isEE(d)?"Edición Especial · New Era AA":corto(d.e)+(isOrig(d)?" · Original":"")}</span><h3></h3><div class="pr">${fmtP(precioDe(d))}${isPool(d)&&PROMO_ON?`<small>2 × ${fmt(PROMO[2])}</small>`:""}</div><div class="row"><span class="sz">${szTxt(d,ts)}</span><button class="add">+ Agregar</button></div></div>`;
    c.querySelector("h3").textContent = d.n; c.querySelector("img").alt = d.n;
    c.querySelector(".ph").onclick = ()=>openPD(d);
    c.querySelector("h3").onclick = ()=>openPD(d);
    c.querySelector(".fav").onclick = e=>{ toggleFav(d.uid); const b=e.currentTarget; b.setAttribute("aria-pressed",favs.has(d.uid)); b.textContent=favs.has(d.uid)?"♥":"♡"; if(col==="fav") render(); };
    c.querySelector(".add").onclick = e=>{
      const st = stTallas(d); const tt = isUni(d)?UNI : col==="sirm" ? (st.length===1?st[0]:(st.includes(size)?size:null)) : (sizeOn() && has(d,size) ? size : (d.cat!=="gorras" && vars(d).length===1 ? vars(d)[0] : null));
      if(tt){ addBag(d.uid,tt,1); const b=e.currentTarget; b.textContent="✓ En bolsa"; b.classList.add("done"); setTimeout(()=>{b.textContent="+ Agregar";b.classList.remove("done")},1300); }
      else openPD(d);
    };
    frag.appendChild(c); shown++;
  });
  g.appendChild(frag);
  if(shown < list.length){ g.appendChild(more); if(io) io.observe(more); else setTimeout(drawMore,50); }
}
function toggleFav(id){ favs.has(id)?favs.delete(id):favs.add(id); store.set("favs",[...favs]); }

/* ---------- Hojas ---------- */
function openSheet(id){ $("#scrim").classList.add("on"); $(id).classList.add("on"); }
function closeAll(){ pimgTok++;  $("#scrim").classList.remove("on"); document.querySelectorAll(".sheet").forEach(s=>s.classList.remove("on")); }
$("#scrim").onclick = closeAll;
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=closeAll);
document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeAll(); });

function openPD(d){
  cur = d; curQ = 1;
  const st0 = stTallas(d), soloStock = col==="sirm" && !isUni(d);
  const ts = isUni(d) ? [UNI] : soloStock ? VO(d).filter(t=>st0.includes(t)) : vars(d);
  curT = isUni(d) ? UNI : soloStock ? (st0.includes(size) ? size : ts.length===1 ? ts[0] : null) : size && has(d,size) ? size : (ts.length===1?ts[0]:null);
  $("#plbl").textContent = soloStock ? VNOM(d)+" en stock (entrega inmediata)" : (VNOM(d)==="Talla"?"Tallas":"Opciones")+" disponibles";
  $("#pley").hidden = soloStock || isUni(d) || !st0.length;
  $("#pmas").hidden = !soloStock || vars(d).length<=ts.length;
  $("#pmas").onclick = ()=>{ col="todo"; render(); openPD(d); };
  $("#pname").textContent = d.n; $("#pcode").textContent = "Modelo "+d.c+" · "+(isPool(d)?"New Era AA "+d.e:isEE(d)?"Edición Especial · New Era AA":corto(d.e)+(isOrig(d)?" · Original":"")); $("#qv").textContent = 1;
  $("#pprecio").innerHTML = `<b>${fmtP(precioDe(d))}</b> c/u` + (isPool(d) ? (PROMO_ON?` · promo 2 × ${fmt(PROMO[2])} · 3 × ${fmt(PROMO[3])}`:"") + ` · mayoreo desde ${M1} pz` : isEE(d) ? ` · mayoreo desde ${M1} pz (cuenta junto con New Era AA)` : isOrig(d) ? " · sin promo · mayoreo: se cotiza directo por WhatsApp" : " · precio fijo, sin promo ni mayoreo");
  const z = $("#pszs"); z.innerHTML = "";
  ts.forEach(t=>{ const b=document.createElement("button"); b.textContent = (enSirm(d,t)?"⚡ ":"")+(t===UNI?(d.cat==="gorras"?"Única (ajustable)":UTXT(d)):t); b.setAttribute("aria-pressed",t===curT);
    b.onclick=()=>{ curT=t; z.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",x===b)); updPD(); }; z.appendChild(b); });
  const ss = STOCK_SIRM[d.c]; $("#psirm").hidden = !ss; if(ss) $("#psirmt").textContent = ss==="todas"||ss===UNI?(isUni(d)?"única":"todas sus tallas"):[].concat(ss).join(", ");
  updPD(); openSheet("#pd");
}
let pimgTok = 0;
function setPimg(){
  const tok = ++pimgTok, img = $("#pimg"), big = px(cur.f[curT] || foto(cur)), small = th(cur.f[curT] || foto(cur));
  img.style.opacity = 0; img.removeAttribute("src"); img.alt = cur.n;
  const show = src => { if(tok!==pimgTok) return; img.src = src; img.style.opacity = 1; };
  const s = new Image(); s.onload = ()=>{ if(!img.getAttribute("src")) show(small); }; s.src = small;
  const g = new Image(); g.onload = ()=>show(big); g.onerror = ()=>show(small); g.src = big;
}
function updPD(){ $("#pped").hidden = !!(curT && enSirm(cur,curT)); setPimg(); $("#padd").textContent = curT ? "Agregar a la bolsa" : (VNOM(cur)==="Talla"?"Elige una talla":"Elige una opción"); }
$("#qm").onclick = ()=>{ curQ=Math.max(1,curQ-1); $("#qv").textContent=curQ; };
$("#qp").onclick = ()=>{ curQ=Math.min(50,curQ+1); $("#qv").textContent=curQ; };
$("#padd").onclick = ()=>{ if(!curT){ toast(VNOM(cur)==="Talla"?"Primero elige una talla":"Primero elige una opción"); return; } addBag(cur.uid,curT,curQ); closeAll(); };

/* ---------- Bolsa ---------- */
const BYUID = {}; DATA_ALL.forEach(d=>BYUID[d.uid]=d);
const byId = id => BYUID[id];
function addBag(id,t,n){ const it = bag.find(x=>x.id===id&&x.t===t); it? it.q+=n : bag.push({id,t,q:n}); saveBag(); toast(t===UNI?"Agregada a la bolsa":`Agregada · ${VNOM(byId(id)).toLowerCase()} ${t}`); }
function saveBag(){ store.set("bolsa",bag); updBag(); }
const pieces = () => bag.reduce((a,b)=>a+b.q,0);
const piecesNE = () => bag.reduce((a,b)=>{ const d=byId(b.id); return a + (d && isPool(d) ? b.q : 0); },0);
const piecesEE = () => bag.reduce((a,b)=>{ const d=byId(b.id); return a + (d && isEE(d) ? b.q : 0); },0);
const tierDe = n => n>=M1 ? MAYOREO.find(m=>n>=m.min) : null;
const precioEE = (d,t,nTot) => { const tr = tierDe(nTot); return tr ? tr.precio + ((LIN[d.e]||{}).mayoreoMas||0) : esp(d,t); };
const espTotal = nTot => bag.reduce((a,b)=>{ const d=byId(b.id); return a + (d && !isPool(d) ? b.q*(isEE(d)?precioEE(d,b.t,nTot):esp(d,b.t)) : 0); },0);
function cotiza(){ const nN = piecesNE(), nT = nN + piecesEE(), ne = nN ? quote(nN, nT) : {total:0,may:false}, e = espTotal(nT); return {nN, nT, nE: pieces()-nN, ne, esp:e, total: ne.total + e, may: ne.may || nT>=M1}; }
function quote(n, nT){
  nT = nT || n;
  if(nT>=M1){ const tier = MAYOREO.find(m=>nT>=m.min); return {total:n*tier.precio, per:tier.precio, may:true}; }
  const tres = Math.floor(n/3), r = n%3; return {total: tres*PROMO[3] + (r?PROMO[r]:0), may:false};
}
let dealSel = 0;
function paintDeals(){
  const n = piecesNE();
  const k = dealSel || (n===0?0:(n%3===0?3:n%3));
  document.querySelectorAll('.deal').forEach(b=>b.classList.toggle('hot', +b.dataset.n===k));
  const need = k ? Math.max(0, k-(n%3===0&&n?3:n%3)) : 0;
  const txt = {1:`1 gorra por ${fmt(PROMO[1])}.`,2:`2 gorras por ${fmt(PROMO[2])}: ahorras ${fmt(2*PROMO[1]-PROMO[2])}.`,3:`3 gorras por ${fmt(PROMO[3])}: ahorras ${fmt(3*PROMO[1]-PROMO[3])}.`}[k];
  $('#dealhint').textContent = !k ? 'Toca una opción para ver cómo aplica.' : txt + (n===0 ? ' Agrega las gorras que quieras, el precio se aplica solo.' : need>0 ? ` Te falta${need>1?"n":""} ${need} para esta promo.` : ` Tu bolsa: ${n} ${n===1?'gorra':'gorras'} · ${fmt(quote(n).total)}${pieces()>n?" (sin contar Deportiva / Nuevo Imperio)":""}.`);
}
document.querySelectorAll('.deal').forEach(b=>b.onclick=()=>{ dealSel = +b.dataset.n; paintDeals(); });
function updBag(){
  dealSel = 0; if(typeof escHot==="function") escHot();
  const n = pieces();
  $("#bagn").textContent = n;
  $("#fbar").hidden = n===0;
  if(n){ const qt = cotiza(); $("#fbtxt").textContent = `${n} ${pzs(n)} · ${fmt(qt.total)}${qt.may?"*":""}`; }
  if($("#bag").classList.contains("on")) drawBag();
  paintDeals();
}
function drawBag(){
  const L = $("#lines"), S = $("#sumbox"); L.innerHTML = "";
  if(!bag.length){ L.innerHTML = `<p class="note" style="font-size:14px;padding:20px 0">Tu bolsa está vacía. Agrega productos desde el catálogo.</p>`; S.innerHTML=""; return; }
  bag.forEach((it,i)=>{
    const d = byId(it.id); const r = document.createElement("div"); r.className="line";
    r.innerHTML = `<img src="${th(fotoT(d,it.t))}" alt=""><div class="t"><b></b><span>${d.c} · ${esp(d,it.t)!=null?corto(d.e)+" · "+fmtP(esp(d,it.t)):d.e} · ${it.t===UNI?UTXT(d):VNOM(d)+" "+it.t} · ${enSirm(d,it.t)?"⚡ Inmediata SIRM":"📦 Sobre pedido"}</span></div>
      <div class="q"><button aria-label="Menos">−</button><b>${it.q}</b><button aria-label="Más">+</button></div>`;
    r.querySelector(".t b").textContent = d.n;
    const [m,p] = r.querySelectorAll(".q button");
    m.onclick = ()=>{ it.q--; if(it.q<1) bag.splice(i,1); saveBag(); drawBag(); };
    p.onclick = ()=>{ it.q++; saveBag(); drawBag(); };
    L.appendChild(r);
  });
  const n = pieces(), c = cotiza(), nN = c.nN, qt = c.ne, regular = nN*PROMO[1];
  let next = "", pct = 100;
  if(!nN){ next = ""; }
  else if(!PROMO_ON && nN<M1){ next = `Te faltan ${M1-nN} ${POOL.nombre} para precio de mayoreo.`; pct = nN/M1*100; }
  else if(nN<3){ next = `Agrega ${3-nN} ${POOL.nombre} más y pagas ${fmt(PROMO[3])} por 3.`; pct = nN/3*100; }
  else if(nN<M1){ next = `Te faltan ${M1-nN} ${POOL.nombre} para precio de mayoreo.`; pct = nN/M1*100; }
  else { const up = [...MAYOREO].reverse().find(m=>m.min>nN); if(up){ next = `Te faltan ${up.min-nN} para bajar a ${fmt(up.precio)} por pieza.`; pct = nN/up.min*100; } else next = "Tienes el mejor precio de mayoreo."; }
  const neRows = !nN ? "" : (c.nE?`<div class="r" style="font-weight:700"><span>${POOL.nombre} · ${nN} pz</span><span></span></div>`:"") +
    (qt.may?`<div class="r"><span>Mayoreo · ${fmt(qt.per)} c/u</span><span>${fmt(qt.total)}</span></div>`:`<div class="r"><span>Precio normal</span><span>${fmt(regular)}</span></div>`) +
    (!qt.may && regular>qt.total?`<div class="r save"><span>Ahorras con la promo</span><span>−${fmt(regular-qt.total)}</span></div>`:"");
  const eg = {}; bag.forEach(it=>{ const d=byId(it.id); if(d&&!isPool(d)){ const p=isEE(d)?precioEE(d,it.t,c.nT):esp(d,it.t), k=corto(d.e)+(isOrig(d)?" (Original)":"")+(d.p?" "+it.t:""); (eg[k]=eg[k]||{q:0,p}).q+=it.q; } });
  const espRows = Object.entries(eg).map(([k,g])=>`<div class="r"><span>${k} · ${g.q} pz × ${fmt(g.p)}</span><span>${fmt(g.q*g.p)}</span></div>`).join("");
  S.innerHTML = `<div class="sum">
    <div class="r"><span>Piezas</span><span>${n}</span></div>
    ${neRows}${espRows}
    <div class="r big"><span>Total${c.may?" estimado":""}</span><span>${fmt(c.total)}</span></div>
    ${nN?`<div class="meter"><i style="width:${Math.min(100,pct)}%"></i></div><div class="hint">${next}</div>`:""}
  </div>
  <div class="snap">📸 <b>Sin capturas:</b> tu mensaje lleva un link con las fotos, tallas y cantidades de tus ${MULTI?"productos":"gorras"}. Solo envíalo.</div>
  <p class="note">${ESPTXT&&bag.some(it=>{const d=byId(it.id); return d&&d.cat==="gorras"&&!isPool(d)&&!isEE(d)&&!isOrig(d);})?ESPTXT+": no entran en promo ni mayoreo. ":""}${bag.some(it=>{const d=byId(it.id); return d&&isOrig(d);})?"Mitchell & Ness (Original): sin promo; el mayoreo se cotiza directo por WhatsApp. ":""}${c.may?"El precio de mayoreo se confirma por WhatsApp. ":""}Pagas 50% para apartar y el resto contra entrega. Las ⚡ SIRM se entregan de inmediato; las demás se piden al proveedor el lunes y llegan de 4 a 7 días después.</p>
  <div class="vend"><label for="vcod">Código de vendedor (opcional)</label><input id="vcod" maxlength="7" autocomplete="off" autocapitalize="characters" placeholder="Ej. K7MPX" value="${vend?vend.c:""}"><div class="st" id="vst"></div></div>
  <a class="cta" id="send" href="#" target="_blank" rel="noopener">Enviar pedido por WhatsApp</a>
  <button class="cta alt" id="empty">Vaciar bolsa</button>
  <p class="note">Gorras Casta (Axel Michel Pineda Castañeda, San Ignacio Río Muerto, Sonora) usa tu nombre, WhatsApp y domicilio para confirmar, cobrar y entregar tu pedido. Si lo aceptas, también para mandarte modelos nuevos y promociones; puedes decir que no en cualquier momento escribiendo "No quiero promociones". No vendemos tus datos. Al enviar tu pedido aceptas los <a href="privacidad.html#terminos" target="_blank" style="color:var(--acc)">términos de venta</a>. Consulta el <a href="privacidad.html#privacidad" target="_blank" style="color:var(--acc)">aviso de privacidad completo</a> y cómo ejercer tus derechos ARCO.</p>`;
  const setSend = ()=>{ $("#send").href = "https://wa.me/"+WHATSAPP+"?text="+encodeURIComponent(msg()); };
  const vchk = ()=>{ const v = $("#vcod").value, e = estadoCod(v), st = $("#vst");
    st.className = "st " + (e==="ok"?"ok":e==="vacio"?"":"bad");
    st.textContent = {ok:"✓ Código válido hasta el "+finSemana(semana()), vacio:"Si un vendedor te atendió, escribe su código.", mal:"Revisa el código: son 5 letras o números.", vencido:"Este código no está vigente. Pide a tu vendedor el de esta semana."}[e];
    vend = e==="ok" ? {c:limpiaCod(v), w:semana()} : null; store.set("vend", vend); setSend(); };
  $("#vcod").oninput = vchk; vchk();
  $("#empty").onclick = ()=>{ bag=[]; saveBag(); drawBag(); };
}
const sKey = t => t===UNI ? "U" : t.replace(/[ \/]/g,"-");
function pedidoUrl(){
  const qt = cotiza();
  const its = bag.map(it=>{ const d = byId(it.id); return [d.key, sKey(it.t), it.q, enSirm(d,it.t)?1:0].join("."); }).join("~");
  return `https://gorrascasta.github.io/pedido.html?${PRUEBA?"x=1&":""}i=${its}&t=${qt.total}${qt.may?"&m=1":""}${vend && estadoCod(vend.c)==="ok" ? "&v="+vend.c : ""}&r=${Math.floor(Date.now()/1000).toString(36)}`;
}
function msg(){
  const n = pieces(), qt = cotiza();
  const ln = it => { const d = byId(it.id); return `• ${it.q} × ${d.c} ${d.n} · ${corto(d.e)} · ${it.t===UNI?UTXT(d).toLowerCase():VNOM(d).toLowerCase()+" "+it.t}`; };
  const ya = bag.filter(it=>enSirm(byId(it.id),it.t)), ped = bag.filter(it=>!enSirm(byId(it.id),it.t));
  let m = (PRUEBA?"🧪 PEDIDO DE PRUEBA (no es real)\n":"") + `Hola, quiero hacer este pedido en ${NOMBRE}:\n`;
  if(ya.length) m += `\n⚡ Entrega inmediata en SIRM:\n${ya.map(ln).join("\n")}\n`;
  if(ped.length) m += `\n📦 Sobre pedido (pedido del lunes, 4 a 7 días después):\n${ped.map(ln).join("\n")}\n`;
  m += `\nTotal: ${n} ${n===1?"pieza":"piezas"} · ${fmt(qt.total)}${qt.may?" (mayoreo, por confirmar)":""}`;
  m += `\nPago: aparto con 50% (${fmt(Math.round(qt.total/2))}) y el resto contra entrega.`;
  if(ya.length) m += `\nEntrega a domicilio en SIRM (después de las 3 pm). Mi dirección: `;
  if(vend && estadoCod(vend.c)==="ok") m += `\nCódigo de vendedor: ${vend.c}`;
  m += `\n\n📸 Mira mi pedido con fotos:\n${pedidoUrl()}`;
  m += ped.length ? `\n¿Me confirmas disponibilidad${ya.length?" de las de sobre pedido":""} y fecha de entrega?` : `\n¿Me confirmas la entrega?`;
  return m;
}
/* ---------- Abrir un pedido desde pedido.html (?b=num.talla.cant~...) ---------- */
if(pb){
  try{ history.replaceState(null, "", location.pathname + location.hash); }catch(e){}
  const out = [];
  pb.split("~").forEach(x=>{ const [n,k,q] = x.split("."); const d = D.byKey[n]; if(!d || d.o || !d.out) return;
    const t = k==="U" ? UNI : VO(d).find(z=>sKey(z)===k); if(!t || !has(d,t)) return;
    out.push({id:d.uid, t, q:Math.max(1,Math.min(99,+q||1))}); });
  if(out.length){ bag = out; saveBag(); drawBag(); openSheet("#bag"); }
}
$("#bagbtn").onclick = ()=>{ drawBag(); openSheet("#bag"); };
$("#fbar").onclick = ()=>{ drawBag(); openSheet("#bag"); };
/* ---------- WhatsApp visible ---------- */
document.querySelectorAll("[data-wa]").forEach(a=>{ a.href="https://wa.me/"+WHATSAPP+"?text="+encodeURIComponent(`Hola, vi el catálogo de ${NOMBRE} y tengo una pregunta.`); a.target="_blank"; a.rel="noopener"; });
const waFab=()=>{ const f=$("#wafab"); if(!f) return; const vis=[...document.querySelectorAll(".wa")].some(e=>{const r=e.getBoundingClientRect(); return r.bottom>0 && r.top<innerHeight;}); f.classList.toggle("off", vis); f.classList.toggle("up", !$("#fbar").hidden); };
addEventListener("scroll", waFab, {passive:true}); setInterval(waFab, 800); waFab();


let tt; function toast(t,ms=1400){ const e=$("#toast"); e.textContent=t; e.classList.add("on"); clearTimeout(tt); tt=setTimeout(()=>e.classList.remove("on"),ms); }

/* ---------- Escalera de ahorro y cierre del lunes ---------- */
const ESC = () => [{min:1, max:M1-1, precio:PROMO[1]}, ...[...MAYOREO].sort((a,b)=>a.min-b.min).map((m,i,arr)=>({min:m.min, max:arr[i+1]?arr[i+1].min-1:null, precio:m.precio}))];
const escPz = e => e.max ? `${e.min}–${e.max} pz` : `${e.min}+ pz`;
let escSel = -1;
function buildEsc(){
  const st = ESC(), base = PROMO[1];
  $("#noprom").innerHTML = `<div class="esct">Entre más llevas, <span style="color:var(--acc)">menos pagas</span></div><div class="escs">${POOL.nombre} · ${NETXT} · combina modelos y tallas</div>
    <div class="esc" id="esc">${st.map((e,i)=>`<button data-i="${i}"><span class="q">${escPz(e)}</span><span class="p">${fmt(e.precio)}</span>${e.precio*2<=base?`<span class="t">la mitad de precio</span>`:i?`<span class="t">−${fmt(base-e.precio)} c/u</span>`:`<span class="t" style="color:var(--mute)">c/u</span>`}</button>`).join("")}</div>
    <div class="eschint" id="eschint"></div>`;
  document.querySelectorAll("#esc button").forEach(b=>b.onclick=()=>{ escSel = +b.dataset.i; escHot(); });
  escHot();
}
function escHot(){
  const box = $("#esc"); if(!box) return;
  const st = ESC(), n = piecesNE(), base = PROMO[1];
  const cur = st.reduce((k,e,i)=> n>=e.min ? i : k, 0), k = escSel>=0 ? escSel : (n ? cur : -1);
  box.querySelectorAll("button").forEach((b,i)=>b.classList.toggle("hot", i===k));
  let h = "Toca un escalón para ver cuánto ahorras.";
  if(k>0){ const e = st[k], q = e.min; h = `${q} gorras: ${fmt(q*e.precio)} en vez de ${fmt(q*base)}. Ahorras ${fmt(q*(base-e.precio))}.`; }
  else if(k===0) h = `1 a ${M1-1} gorras a ${fmt(base)} c/u. Junta ${M1} y cada una baja a ${fmt(st[1].precio)}.`;
  if(escSel<0 && n){ const nx = st[cur+1]; h = `Llevas ${n} ${POOL.nombre}. ` + (nx ? `Te falta${nx.min-n>1?"n":""} ${nx.min-n} para bajar a ${fmt(nx.precio)} c/u.` : "Ya tienes el mejor precio."); }
  $("#eschint").textContent = h;
}
function paintCierre(){
  const off = 7*36e5, now = Date.now(), loc = new Date(now - off);   // hora Sonora (UTC-7, sin horario de verano)
  let d = new Date(Date.UTC(loc.getUTCFullYear(), loc.getUTCMonth(), loc.getUTCDate(), CIERRE.hora));
  d.setUTCDate(d.getUTCDate() + ((CIERRE.dia - d.getUTCDay() + 7) % 7));
  if(d.getTime() <= loc.getTime()) d.setUTCDate(d.getUTCDate() + 7);
  const ms = d.getTime() - loc.getTime(), dd = Math.floor(ms/864e5), hh = Math.floor(ms%864e5/36e5), mm = Math.floor(ms%36e5/6e4);
  const falta = `<span style="white-space:nowrap">` + (dd ? `${dd} ${dd===1?"día":"días"} ${hh} h` : hh ? `${hh} h ${mm} min` : `${mm} min`) + `</span>`;
  const hr = CIERRE.hora===12 ? "12:00 pm" : CIERRE.hora>12 ? (CIERRE.hora-12)+":00 pm" : CIERRE.hora+":00 am";
  $("#cierre").innerHTML = `🗓 Próximo pedido: <b>lunes ${hr}</b> · faltan <b>${falta}</b> · llega de 4 a 7 días`;
}

/* ---------- Textos de la página según datos/ajustes.json ---------- */
function pintaTextos(){
  const esc = s => String(s||"").replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const lema = String(TIENDA.lema||"").split(/\s*·\s*/);
  $("#brand").innerHTML = esc(NOMBRE) + `<small>${esc(lema[0]||"")}${lema.length>1?"<br>"+esc(lema.slice(1).join(" · ")):""}</small>`;
  const [t1,t2] = String(TIENDA.titular||"").split("|");
  if(t1) $("#tit").innerHTML = esc(t1) + (t2 ? `<br><em>${esc(t2)}</em>` : "");
  if(TIENDA.texto) $("#txt").textContent = TIENDA.texto;
  $("#kick").innerHTML = MULTI ? `<span id="nmod"></span> PRODUCTOS · ${CATS.map(c=>esc(c.n).toUpperCase()).join(" · ")}` : `${esc(POOL.nombre).toUpperCase()} · <span id="nmod"></span> MODELOS`;
  const asc = [...MAYOREO].reverse();
  const escTxt = (sep, cu) => asc.map((m,i)=>{ const nx = asc[i+1]; return (cu ? (nx ? `${m.min} a ${nx.min-1} pz` : `${m.min} pz o más`) : (i ? m.min : m.min+" pz")) + " " + fmt(m.precio) + (cu?" c/u":""); }).join(sep);
  const escRango = () => asc.map((m,i)=>{ const nx = asc[i+1]; return (nx ? `${m.min}–${nx.min-1}${i?"":" pz"}` : `${m.min} o más`) + " " + fmt(m.precio); }).join(" · ");
  const hay = MAYOREO.length && DATA.some(isPool);
  $("#chipmay").hidden = !hay; if(hay) $("#chipmay").innerHTML = `🔥 Mayoreo desde <em>${fmt(MAYOREO[0].precio)}</em> c/u`;
  $("#mayo").hidden = !DATA.some(isPool);
  $("#mayos").textContent = `${POOL.nombre}: ${escTxt(" · ", false)} c/u`;
  document.querySelectorAll(".deal").forEach(b => { const n = +b.dataset.n; b.querySelector(".p").textContent = fmt(PROMO[n]); });
  const fin = new Date(D.promoFin - 864e5).toLocaleDateString("es-MX",{day:"numeric",month:"long",timeZone:"UTC"});
  $("#promofine").textContent = `Aplica en ${NETXT}, puedes combinarlas.` + (MAYOREO.length ? ` Desde ${M1} piezas aplica precio de mayoreo: ${escRango()} c/u.` : "") + (PROMO_ON ? ` Promo válida hasta el ${fin}.` : "");
  $("#infomay").innerHTML = MAYOREO.length ? `Solo ${esc(POOL.nombre)} (${NETXT}), sumando cualquier modelo y talla: <b>${escTxt(" · ", true)}.</b> Se confirma por WhatsApp.` + (ESPN ? ` ${esc(ESPN)} no entran en mayoreo ni en promociones.` : "") : "Pregunta por WhatsApp.";
  if(PRUEBA) document.title = "🧪 PRUEBA · " + document.title;
}
pintaTextos();
buildGate(); buildFilters();
if(!PROMO_ON){ ["#deals","#dealhint","#promofine"].forEach(x=>$(x).style.display="none"); $("#noprom").hidden = false; buildEsc(); }
$("#espfine").innerHTML = ESPTXT ? ESPTXT.split(", ").map(x=>x.replace(/ (\$[\d,]+ c\/u)$/,": <b>$1</b>")).join(". ") + ". No entran en mayoreo ni en promociones." : "";
{ const le = Object.values(LIN).find(l=>l.mayoreoMas); if(le && (PRUEBA || DATA.some(d=>d.e===le.k))) $("#espfine").innerHTML = `<b>${le.n}: ${fmt(le.precio)} c/u</b>. En mayoreo se suma con New Era AA y cuesta ${fmt(le.mayoreoMas)} más por pieza en cada escalón. Sin promo 2×/3×. ` + $("#espfine").innerHTML; }
{ const lo = Object.values(LIN).find(l=>l.original); if(lo && (PRUEBA || DATA.some(d=>d.e===lo.k))) $("#espfine").innerHTML += ` <b>${lo.n} (Original): ${fmt(lo.precio)} c/u</b>. Sin promo; el mayoreo se cotiza directo por WhatsApp.`; }
paintCierre(); setInterval(paintCierre, 60000);
const irA = c => { col=c; estilo="todos"; render(); $("#cols").scrollIntoView({behavior:"smooth",block:"start"}); };
$("#chipsirm").hidden = !Object.keys(STOCK_SIRM).length;
document.querySelectorAll(".chip").forEach(b=>b.onclick=()=>{ const g=b.dataset.go;
  if(g==="sirm") irA("sirm");
  else if(g==="mayo"){ $("#mayo").open = true; $("#mayo").scrollIntoView({behavior:"smooth",block:"center"}); }
  else $("#infopago").scrollIntoView({behavior:"smooth",block:"center"}); });
$("#nmod").textContent = DATA.length;
if(PROMO_ON){ $("#mayot").textContent = "🔥 Promoción activa"; $("#mayos").textContent = "Toca para ver precios"; }
function buildStrip(){
  const nv = DATA.filter(esNuevo), st = $("#strip"); st.innerHTML = "";
  if(!nv.length){ st.hidden = true; $(".sech").hidden = true; return; }
  nv.slice(0,14).forEach(d=>{ const b=document.createElement("button"); b.className="mini";
    b.innerHTML = `<img loading="lazy" decoding="async" src="${th(foto(d))}" alt=""><i>NUEVO</i><b></b>`; b.querySelector("b").textContent = d.n;
    b.onclick = ()=>openPD(d); st.appendChild(b); });
  const m=document.createElement("button"); m.className="mini more"; m.innerHTML = `Ver las ${nv.length} →<span>modelos nuevos</span>`; m.onclick=()=>irA("nuevos"); st.appendChild(m);
  $("#vernew").textContent = `Ver las ${nv.length} →`; $("#vernew").onclick = ()=>irA("nuevos");
}
$("#pill").textContent = "Talla: " + (size || "todas");
const arranque = () => { $("#strip").hidden = true; $(".sech").hidden = true; render(); updBag(); };
(()=>{ const t = new Image(); let ok = false; const fin = v => { if(ok) return; ok = true; WP = v; try{ localStorage.setItem("wp", v?"1":"0"); }catch(e){} arranque(); };
  t.onload = ()=>fin(t.width===1); t.onerror = ()=>fin(false); setTimeout(()=>fin(WP), 400);
  t.src = "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA"; })();
if(vendAviso) setTimeout(()=>toast(vendAviso,3500), 400);

/* ---------- Sin internet ---------- */
const CN = "gc-fotos";   // caché de fotos para ver sin internet (sw.js no la borra)
const offList = () => { const s = new Set(); (size ? DATA.filter(d=>has(d,size)||has(d,UNI)) : DATA).forEach(d=>{ const f = foto(d); if(f) s.add(th(f)); if(size && d.f[size]) s.add(th(d.f[size])); }); return [...s]; };
function offLabel(){ const n = offList().length; $("#offs").textContent = (size?`Fotos de talla ${size} y ajustables`:"Todas las fotos")+` · ${n} fotos · aprox. ${Math.max(1,Math.round(n*0.025))} MB. Recomendado con Wi-Fi.`; }
async function saveOffline(){
  const b=$("#offbtn"), L=offList(); let ok=0; b.disabled=true;
  try{ const c = await caches.open(CN);
    for(let i=0;i<L.length;i+=6){ await Promise.all(L.slice(i,i+6).map(u=>c.match(u).then(h=>h||c.add(u)).then(()=>ok++).catch(()=>{}))); $("#offt").textContent=`Guardando… ${Math.round(Math.min(i+6,L.length)/L.length*100)}%`; }
    $("#offt").textContent = ok>=L.length ? "✓ Catálogo guardado. Ya lo puedes ver sin internet" : `Se guardaron ${ok} de ${L.length} fotos. Toca para reintentar`;
    toast("Listo, ya lo puedes ver sin internet");
  }catch(e){ $("#offt").textContent="No se pudo guardar en este navegador"; }
  b.disabled=false;
}
if("serviceWorker" in navigator && "caches" in window && (location.protocol==="https:"||location.hostname==="localhost")){
  try{ navigator.serviceWorker.register("sw.js").catch(()=>{}); }catch(e){}
  $("#offbtn").hidden=false; offLabel(); $("#offbtn").onclick=saveOffline;
  const _ss=setSize; setSize=function(t){ _ss(t); $("#offt").textContent="Guardar catálogo para verlo sin internet"; offLabel(); };
}
const net=()=>{ $("#offbar").hidden = navigator.onLine; };
addEventListener("online",net); addEventListener("offline",net); net();
}).catch(err => {
  const g = document.getElementById("grid"); console.error(err);
  if(g) g.innerHTML = '<div class="empty">No se pudo cargar el catálogo.<br><br><button onclick="location.reload()" style="color:#ff7a1a;font-weight:700">Reintentar</button></div>';
});
