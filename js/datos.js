/* Casta · capa de datos compartida por todas las páginas (catálogo, prueba, muestra sin precios, revendedores y pedido).
   Los productos y ajustes viven en datos/*.json (público) y datos-prueba/*.json (catálogo de prueba).
   El panel de administración edita datos-prueba/ y "Publicar" los copia a datos/. */
(function(){
  const MODO = window.CASTA_MODO === "prueba" ? "prueba" : "publico";
  const BASE = MODO === "prueba" ? "datos-prueba/" : "datos/";
  const getJSON = p => fetch(p, {cache:"no-cache"}).then(r => { if(!r.ok) throw new Error(p + " " + r.status); return r.json(); });
  const pad = n => String(n).padStart(3, "0");
  // Fin del día (hora de Sonora, UTC-7 sin horario de verano) de una fecha "AAAA-MM-DD"
  const finDia = f => { const [y,m,d] = String(f||"").split("-").map(Number); return y ? Date.UTC(y, m-1, d+1, 7, 0) : 0; };

  function normaliza(cat, p, i){
    const d = Object.assign({}, p);
    d.cat = cat.k;
    if(!d.c) d.c = cat.prefijo ? cat.prefijo + "-" + pad(i+1) : "#" + pad(i+1);
    d.num = parseInt(d.c.replace(/\D/g,""), 10);
    d.key = (cat.prefijo || "") + d.num;          // clave corta para links de pedido (gorras: solo número)
    d.f = d.f || {};
    return d;
  }

  async function cargar(){
    const [aj, est] = await Promise.all([
      getJSON(BASE + "ajustes.json"),
      getJSON("datos/estado.json").catch(() => ({}))
    ]);
    const cats = aj.categorias.filter(c => MODO === "prueba" || c.activa);
    const files = await Promise.all(cats.map(c => getJSON(BASE + (c.archivo || c.k + ".json")).catch(() => ({orden:[], productos:[]}))));
    const prods = [], byCode = {}, byKey = {};
    cats.forEach((c, j) => {
      const f = files[j] || {};
      c.orden = f.orden || [];
      c.prods = (f.productos || []).map((p, i) => normaliza(c, p, i));
      c.lin = {}; (c.lineas || []).forEach(l => c.lin[l.k] = l);
      c.prods.forEach(d => { prods.push(d); byCode[d.c] = d; byKey[d.key] = d; });
    });
    const pool = aj.pool || {};
    const promo = pool.promo || {};
    const promoOn = !!promo.activa && Date.now() < finDia(promo.hasta);
    return { aj, est, cats, prods, byCode, byKey, pool, promoOn, promoFin: finDia(promo.hasta), MODO };
  }

  // Precio de una pieza (sin promo ni mayoreo). Gorras New Era AA: precio del "pool".
  function precioBase(D, d, t){
    const c = D.cats.find(x => x.k === d.cat), l = c && c.lin[d.e];
    if(d.p && t && d.p[t]) return d.p[t];          // precio por variante (p. ej. perfume 100 ml)
    if(d.pr) return d.pr;                            // precio propio del producto
    if(l && l.pool) return D.pool.precio;
    return l ? (l.precio || 0) : 0;
  }
  const enPool = (D, d) => { const c = D.cats.find(x => x.k === d.cat), l = c && c.lin[d.e]; return !!(l && l.pool && !d.pr && !d.p); };

  /* Texto con el mismo formato que tenía el index.html viejo ("const DATA_ALL = …;"), para las páginas
     que lo leían así (modelos.html, r-hspd76.html, pedido.html). Solo gorras. */
  function legado(D){
    const g = D.cats.find(c => c.k === "gorras"); if(!g) return "";
    const all = g.prods.map(d => { const o = {id:d.id, n:d.n, l:d.l, f:d.f, e:d.e}; if(d.w) o.w = d.w; return o; });
    const oc = g.prods.filter(d => d.o).map(d => d.c);
    const ag = {}, st = {};
    g.prods.forEach(d => { if(d.x) ag[d.c] = d.x; if(d.s) st[d.c] = d.s; });
    const J = JSON.stringify;
    return ["const DATA_ALL = " + J(all) + ";", "const OCULTOS = " + J(oc) + ";", "const AGOTADOS = " + J(ag) + ";",
            "const STOCK_SIRM = " + J(st) + ";", "const ORDEN = " + J(g.orden) + ";", "const NUEVOS_DESDE = " + J(D.aj.nuevos_desde || 1e9) + ";"].join("\n");
  }

  // Pantalla "Estamos actualizando" (no aplica en el catálogo de prueba)
  // opt.neutro: sin nombre de la tienda (catálogo de revendedores); opt.wa: WhatsApp a mostrar ("" = sin botón)
  function mantenimiento(D, opt){
    opt = opt || {};
    if(MODO === "prueba" || !D.est || !D.est.mantenimiento) return false;
    const wa = opt.wa !== undefined ? opt.wa : ((D.aj.tienda && D.aj.tienda.whatsapp) || "526624248769");
    const nom = opt.neutro ? "" : ((D.aj.tienda && D.aj.tienda.nombre) || "Casta Caps");
    const el = document.createElement("div");
    el.id = "mant";
    el.style.cssText = "position:fixed;inset:0;z-index:999;background:#0d0d0d;color:#f3efe7;display:flex;align-items:center;justify-content:center;padding:24px;font-family:Archivo,system-ui,sans-serif;text-align:center";
    el.innerHTML = `<div style="max-width:420px"><div style="font-size:46px">🛠️</div>
      <div style="font-family:'Archivo Black',Impact,sans-serif;font-size:13px;letter-spacing:.2em;color:#ff7a1a;margin:10px 0">${nom.toUpperCase()}</div>
      <h1 style="font-family:'Archivo Black',Impact,sans-serif;text-transform:uppercase;font-size:30px;line-height:1">${opt.titulo||"Estamos actualizando el catálogo"}</h1>
      <p style="color:#9a958c;margin:14px 0 22px;font-size:15px;line-height:1.5"></p>
      <a ${wa?"":"hidden"} href="https://wa.me/${wa}" style="display:inline-block;background:#25D366;color:#06210f;font-weight:800;border-radius:999px;padding:12px 20px;text-decoration:none">💬 Escríbenos por WhatsApp</a>
      <div><button onclick="location.reload()" style="margin-top:16px;background:none;border:1px solid #2c2c2c;color:#9a958c;border-radius:12px;padding:10px 16px;font:inherit;cursor:pointer">Volver a intentar</button></div></div>`;
    el.querySelector("p").textContent = D.est.mensaje || "Vuelve en unos minutos.";
    document.body.appendChild(el);
    return true;
  }

  // Franja del catálogo de prueba
  function franjaPrueba(){
    if(MODO !== "prueba") return;
    const b = document.createElement("div");
    b.style.cssText = "position:sticky;top:0;z-index:100;background:repeating-linear-gradient(45deg,#ffcc00,#ffcc00 12px,#ffb300 12px,#ffb300 24px);color:#111;font:800 12px/1.2 Archivo,system-ui,sans-serif;letter-spacing:.08em;text-align:center;padding:7px 10px";
    b.textContent = "VERSIÓN DE PRUEBA · lo que ves aquí todavía NO está publicado";
    document.body.prepend(b);
  }

  // Llaves de almacenamiento separadas para el catálogo de prueba
  const K = k => MODO === "prueba" ? "prueba_" + k : k;

  window.CASTA = { MODO, BASE, cargar, legado, mantenimiento, franjaPrueba, precioBase, enPool, finDia, K };
})();
