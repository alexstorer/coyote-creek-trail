(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const h = (tag, attrs = {}, html = "") => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (html) el.innerHTML = html;
    return el;
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const fmtM = v => "$" + (v >= 100 ? Math.round(v) : v.toFixed(1)) + "M";
  const ext = `target="_blank" rel="noopener"`;
  const MONS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmtD = d => {
    const p = d.split("-");
    if (p.length === 1) return p[0];
    if (p.length === 2) return `${MONS[+p[1] - 1]} ${p[0]}`;
    return `${MONS[+p[1] - 1]} ${+p[2]}, ${p[0]}`;
  };
  const decYear = d => { const [y, m = 6, day = 15] = d.split("-").map(Number); return y + (m - 1) / 12 + (day - 1) / 365; };

  const STATUS = {
    "Open Paved":   { key: "open",    label: "Open (paved)",          cls: "st-open" },
    "Open Interim": { key: "interim", label: "Open (interim gravel)", cls: "st-interim" },
    "Design":       { key: "design",  label: "In design",             cls: "st-design" },
    "Planned":      { key: "planned", label: "Planned gap",           cls: "st-planned" },
  };
  const statusColor = s => css("--" + STATUS[s].key);

  /* ---------- Theme ---------- */
  const isDark = () => {
    const t = document.documentElement.dataset.theme;
    return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  };
  const themeListeners = [];
  $("#themeToggle").addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("cct-theme", next); } catch (e) {}
    themeListeners.forEach(f => f());
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => themeListeners.forEach(f => f()));

  /* ---------- Tooltip & lightbox ---------- */
  const tip = $("#tooltip");
  const showTip = (e, html) => { tip.innerHTML = html; tip.hidden = false; moveTip(e); };
  const moveTip = e => {
    const x = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8);
    const y = e.clientY + 16 + tip.offsetHeight > innerHeight ? e.clientY - tip.offsetHeight - 12 : e.clientY + 16;
    tip.style.left = x + "px"; tip.style.top = y + "px";
  };
  const hideTip = () => { tip.hidden = true; };
  const lb = $("#lightbox");
  const openLightbox = (src, alt, capHTML) => { $("#lbImg").src = src; $("#lbImg").alt = alt; $("#lbCap").innerHTML = capHTML; lb.hidden = false; };
  lb.addEventListener("click", e => { if (e.target === lb || e.target.classList.contains("lb-close")) lb.hidden = true; });
  document.addEventListener("keydown", e => { if (e.key === "Escape") lb.hidden = true; });

  /* ---------- Data prep ---------- */
  const feats = REACHES.features;
  const byId = {};
  feats.forEach(f => { (byId[f.properties.id] ||= []).push(f); });
  const reachMi = id => Math.max(...(byId[id] || []).map(f => f.properties.mi), 0);
  const gapMi = GAPS.reduce((a, g) => a + g.mi, 0);
  const builtProjects = PROJECTS.filter(p => p.mi);
  const spent = PROJECTS.reduce((a, p) => a + p.cost, 0);
  const perMileOf = p => p.cost / p.mi;
  const lowPM = perMileOf(PROJECTS[2]);
  const highPM = perMileOf(PROJECTS[3]);
  const avgPM = builtProjects.reduce((a, p) => a + p.cost, 0) / builtProjects.reduce((a, p) => a + p.mi, 0);
  const SINGLETON_PERM = 7.7;
  const estimate = pm => gapMi * pm + SINGLETON_PERM;

  // Linear positions along the mainline (miles from the north end)
  const PARENT = { COY15A: "COY15", "COY15-1": "COY15", COY11A: "COY11", COY08A: "COY08", COY19B: "COY19A", COY21B: "COY21A", COY20B: "COY20A", COY13B: "COY13", "COY07.2": "COY08" };
  const pos = {}; let acc = 0;
  MAINLINE.forEach(id => { const m = reachMi(id); pos[id] = [acc, acc + m]; acc += m; });
  const mainTotal = acc;
  const posOf = id => pos[id] || pos[PARENT[id]];
  const ends = id => {
    if (REACH_ENDS[id]) return REACH_ENDS[id];
    const f = (byId[id] || [])[0]; if (!f) return [id, id];
    const parts = f.properties.name.split(/ To /i);
    return parts.length === 2 ? parts.map(s => s.replace(/^E\/B\s+|^W\/B\s+/g, "").trim()) : [f.properties.name, f.properties.name];
  };
  const extentLabel = ids => {
    const sorted = ids.filter(posOf).sort((a, b) => posOf(a)[0] - posOf(b)[0]);
    if (!sorted.length) return "";
    const a = ends(sorted[0])[0], b = ends(sorted[sorted.length - 1])[1];
    return a === b ? a : `${a} → ${b}`;
  };
  const extentMi = ids => ids.reduce((s, id) => s + reachMi(id), 0);
  const GAP_L = () => pos["COY05.1"][0] / mainTotal * 100, GAP_W = () => (pos["COY07.1"][1] - pos["COY05.1"][0]) / mainTotal * 100;
  const locatorHTML = ids => {
    if (!ids) return `<span class="loc"><span class="loc-track"></span><span class="loc-label muted">Whole corridor / not location-specific</span></span>`;
    const ps = ids.map(posOf).filter(Boolean);
    const lo = Math.min(...ps.map(p => p[0])), hi = Math.max(...ps.map(p => p[1]));
    const l = lo / mainTotal * 100, w = Math.max(1.2, (hi - lo) / mainTotal * 100);
    return `<span class="loc"><span class="loc-track"><span class="loc-gap" style="left:${GAP_L()}%;width:${GAP_W()}%"></span><span class="loc-hl" style="left:${l}%;width:${w}%"></span></span><span class="loc-label">${esc(extentLabel(ids))}</span></span>`;
  };

  const PHOTO_BY_F = Object.fromEntries(PHOTOS.map(p => [p.f, p]));
  const SCH_BY_K = Object.fromEntries(SCHEMATICS.map(s => [s.k, s]));
  const fp = (f, w) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f)}?width=${w}`;
  const photoCap = p => `${esc(p.c)} · Photo: ${esc(p.a)}, ${esc(p.l)} · <a href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent(p.f.replace(/ /g, "_"))}" ${ext}>Wikimedia Commons ↗</a>`;
  const openPhoto = p => openLightbox(fp(p.f, 1600), p.c, photoCap(p));
  const schImg = (s, thumb) => `img/schematics/${s.k}${thumb ? "_thumb" : ""}.jpg`;
  const openSch = s => openLightbox(schImg(s), s.t, `${esc(s.t)} · ${esc(s.d)} · <a href="${s.src}" ${ext}>Source document ↗</a>`);
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-sch]"); if (b) { e.preventDefault(); openSch(SCH_BY_K[b.dataset.sch]); }
    const ph = e.target.closest("[data-photo]"); if (ph) { e.preventDefault(); openPhoto(PHOTO_BY_F[ph.dataset.photo]); }
  });

  /* ---------- Hero ---------- */
  const stats = [
    ["~21 mi", "continuous trail from William Street Park south to Anderson Dam"],
    [gapMi.toFixed(1) + " mi", "of mainline gaps left in north San José (Montague to William St)"],
    [fmtM(spent), "spent on five City trail projects completed 2021–2025"],
    [`${fmtM(estimate(lowPM)).replace(".0", "")}–${fmtM(estimate(highPM))}`, "our rough estimate to close the gaps (no official figure exists)"],
  ];
  $("#stats").innerHTML = stats.map(([n, l]) => `<div class="stat"><span class="stat-num">${n}</span><span class="stat-label">${l}</span></div>`).join("");

  const strip = $("#strip");
  MAINLINE.forEach(id => {
    const f = (byId[id] || [])[0]; if (!f) return;
    const p = f.properties, mi = reachMi(id);
    const d = h("div", { class: STATUS[p.status].cls, tabindex: "0", "aria-label": `${p.name}, ${STATUS[p.status].label}, ${mi} miles` });
    d.style.flex = `${mi} 0 0`;
    d.addEventListener("mousemove", e => showTip(e, `<b>${esc(p.name)}</b>${STATUS[p.status].label} · ${mi.toFixed(2)} mi`));
    d.addEventListener("mouseleave", hideTip);
    d.addEventListener("click", () => { document.getElementById("map").scrollIntoView(); focusReach(id); });
    strip.appendChild(d);
  });
  $("#stripLegend").innerHTML = Object.values(STATUS).map(s => `<span><i class="sw ${s.cls}"></i>${s.label}</span>`).join("") +
    `<span style="opacity:.7">${mainTotal.toFixed(1)} mainline miles mapped</span>`;

  /* ---------- Shared map helpers ---------- */
  const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/";
  const ATTR = 'Basemap &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors · Trails: City of San José Open Data';
  const maps = [];
  const ATTR_SHORT = '&copy; Esri, &copy; OpenStreetMap · Trails: City of San José';
  function makeMap(elId, opts = {}, short = false) {
    const m = L.map(elId, { scrollWheelZoom: false, zoomSnap: 0.25, ...opts });
    if (short) m.attributionControl.setPrefix(false);
    const st = { m, tiles: null, labels: null };
    st.setTiles = () => {
      if (st.tiles) m.removeLayer(st.tiles);
      if (st.labels) m.removeLayer(st.labels);
      const v = isDark() ? "World_Dark_Gray" : "World_Light_Gray";
      st.tiles = L.tileLayer(`${ESRI}${v}_Base/MapServer/tile/{z}/{y}/{x}`, { attribution: short ? ATTR_SHORT : ATTR, maxZoom: 16 }).addTo(m);
      st.labels = L.tileLayer(`${ESRI}${v}_Reference/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 16, pane: "shadowPane" }).addTo(m);
    };
    st.setTiles();
    m.on("focus", () => m.scrollWheelZoom.enable());
    m.on("blur", () => m.scrollWheelZoom.disable());
    maps.push(st);
    return m;
  }
  themeListeners.push(() => maps.forEach(s => s.setTiles()));
  const styleFor = (status, hl) => {
    const base = { color: statusColor(status), weight: hl ? 8 : 4.5, opacity: 1, lineCap: "round", lineJoin: "round", dashArray: null };
    if (status === "Open Interim") base.dashArray = "10 7";
    if (status === "Design") base.dashArray = "8 8";
    if (status === "Planned") { base.dashArray = "1 9"; base.weight = hl ? 9 : 6; }
    return base;
  };
  const featsFor = ids => feats.filter(f => ids.includes(f.properties.id));
  const boundsFor = ids => L.geoJSON({ type: "FeatureCollection", features: featsFor(ids) }).getBounds();
  const allBounds = L.geoJSON(REACHES).getBounds();
  const pinSvg = `<svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z"/></svg>`;

  /* ---------- Main map ---------- */
  const map = makeMap("leaflet");
  const activeStatus = new Set(Object.keys(STATUS));
  const layerById = {};
  let highlighted = null;

  const schFor = id => SCHEMATICS.filter(s => s.r.length <= 4 && (s.r.includes(id) || s.r.includes(PARENT[id])));
  const popupHTML = p => {
    const s = STATUS[p.status], note = REACH_NOTES[p.id] || REACH_NOTES[p.id.replace("-D", "")];
    const owner = { PRNS: "City Parks (PRNS)", SCVWD: "Valley Water", SCC: "Santa Clara County Parks", DOT: "City DOT", PRIVATE: "Private land", NEIGHCITY: "City of Milpitas" }[p.owner] || "";
    return `<div class="pop"><span class="tag" style="background:${statusColor(p.status)}">${s.label}</span>
      <h4>${esc(p.name)}</h4>
      <div class="meta">${p.id && p.id !== "PARKWAY" ? esc(p.id) + " · " : ""}${p.mi.toFixed(2)} mi${owner ? " · " + esc(owner) : ""}${p.opened ? " · opened " + p.opened : ""}</div>
      ${note ? `<p>${esc(note.text)}</p>${note.src ? `<p><a href="${note.src}" ${ext}>Source ↗</a></p>` : ""}` : ""}
      ${schFor(p.id).map(x => `<button class="pop-sch" data-sch="${x.k}"><img src="${schImg(x, true)}" alt=""><span>Plan sheet<small>${esc(x.t)}</small></span></button>`).join("")}</div>`;
  };

  const trailLayer = L.geoJSON(REACHES, {
    style: f => styleFor(f.properties.status),
    onEachFeature: (f, layer) => {
      (layerById[f.properties.id] ||= []).push(layer);
      layer.bindPopup(() => popupHTML(f.properties), { maxWidth: 300 });
      layer.on("mouseover", () => layer.setStyle({ weight: styleFor(f.properties.status).weight + 3 }));
      layer.on("mouseout", () => { if (highlighted !== f.properties.id) layer.setStyle(styleFor(f.properties.status)); });
    },
  }).addTo(map);
  map.fitBounds(allBounds, { padding: [20, 20] });

  const lmLayer = L.layerGroup().addTo(map);
  const lmMarkers = LANDMARKS.map(l => ({
    key: !!l.key,
    m: L.marker(l.ll, { icon: L.divIcon({ className: "", html: '<div class="lm-icon"></div>', iconSize: [12, 12], iconAnchor: [6, 6] }), keyboard: false, interactive: false })
      .bindTooltip(l.name, { permanent: true, direction: "right", className: "lm-label", offset: [6, 0] }),
  }));
  const lmToggle = () => { const z = map.getZoom(); lmMarkers.forEach(({ m, key }) => (key || z >= 13) ? lmLayer.addLayer(m) : lmLayer.removeLayer(m)); };
  map.on("zoomend", lmToggle); lmToggle();

  const photoLayer = L.layerGroup().addTo(map);
  const photoMarker = {};
  PHOTOS.filter(p => p.ll).forEach(p => {
    const m = L.marker(p.ll, {
      icon: L.divIcon({ className: "", html: `<div class="ph-pin"><img src="${fp(p.f, 120)}" alt="" loading="lazy"></div>`, iconSize: [38, 38], iconAnchor: [19, 19] }),
      riseOnHover: true, title: p.c,
    }).bindPopup(`<div class="pop pop-photo"><button class="pop-img" data-photo="${esc(p.f)}"><img src="${fp(p.f, 640)}" alt="${esc(p.c)}"></button>
      <h4>${esc(p.c)}</h4><div class="meta">${esc(p.a)} · ${esc(p.l)} · ${p.y}${p.approx ? " · location approximate" : ""}</div></div>`, { maxWidth: 300, minWidth: 260 });
    m.addTo(photoLayer); photoMarker[p.f] = m;
  });
  const schLayer = L.layerGroup().addTo(map);
  SCHEMATICS.filter(s => s.r.length <= 4).forEach(s => {
    const c = boundsFor(s.r).getCenter();
    L.marker(c, { icon: L.divIcon({ className: "", html: `<div class="sch-pin"><img src="${schImg(s, true)}" alt=""></div>`, iconSize: [32, 40], iconAnchor: [-6, 20] }), riseOnHover: true, title: s.t })
      .bindPopup(`<div class="pop"><button class="pop-img" data-sch="${s.k}"><img src="${schImg(s, true)}" alt="${esc(s.t)}"></button><h4>${esc(s.t)}</h4><div class="meta">${esc(s.d)}</div><p><a href="${s.src}" ${ext}>Source document ↗</a></p></div>`, { maxWidth: 280 })
      .addTo(schLayer);
  });

  const restyleAll = () => {
    trailLayer.eachLayer(l => {
      const p = l.feature.properties;
      if (!activeStatus.has(p.status)) { l.setStyle({ opacity: 0 }); return; }
      l.setStyle(styleFor(p.status, highlighted === p.id));
    });
  };
  function focusReach(id) {
    highlighted = id; restyleAll();
    const layers = layerById[id]; if (!layers) return;
    map.fitBounds(L.featureGroup(layers).getBounds(), { padding: [60, 60], maxZoom: 16 });
    layers[0].bringToFront(); layers[0].openPopup();
    $$(".reach-list li").forEach(li => li.classList.toggle("active", li.dataset.id === id));
    const li = $(`.reach-list li[data-id="${CSS.escape(id)}"]`);
    if (li) li.scrollIntoView({ block: "nearest" });
  }
  const showPhotoOnMap = f => {
    document.getElementById("map").scrollIntoView({ behavior: "smooth" });
    const m = photoMarker[f]; if (!m) return;
    if (!map.hasLayer(photoLayer)) photoLayer.addTo(map);
    setTimeout(() => { map.setView(m.getLatLng(), 15); m.openPopup(); }, 500);
  };

  Object.entries(STATUS).forEach(([st, s]) => {
    const b = h("button", { class: "chip", "aria-pressed": "true" }, `<span class="dot ${s.cls}"></span>${s.label}`);
    b.addEventListener("click", () => {
      const on = b.getAttribute("aria-pressed") === "true";
      b.setAttribute("aria-pressed", String(!on));
      on ? activeStatus.delete(st) : activeStatus.add(st);
      restyleAll(); renderReachList();
    });
    $("#mapFilters").appendChild(b);
  });
  [["Photos", photoLayer, "ph-dot"], ["Plan sheets", schLayer, "sch-dot"]].forEach(([n, layer, cls]) => {
    const b = h("button", { class: "chip", "aria-pressed": "true" }, `<span class="dot ${cls}"></span>${n}`);
    b.addEventListener("click", () => {
      const on = b.getAttribute("aria-pressed") === "true";
      b.setAttribute("aria-pressed", String(!on));
      on ? map.removeLayer(layer) : layer.addTo(map);
    });
    $("#layerFilters").appendChild(b);
  });

  function renderReachList() {
    const list = $("#reachList"); list.innerHTML = "";
    const ids = [...MAINLINE, ...Object.keys(byId).filter(id => !MAINLINE.includes(id) && byId[id][0].properties.mi > 0.1)];
    ids.forEach(id => {
      const f = (byId[id] || [])[0]; if (!f) return;
      const p = f.properties; if (!activeStatus.has(p.status)) return;
      const li = h("li", { "data-id": id, tabindex: "0" },
        `<span class="bar ${STATUS[p.status].cls}"></span><span><span class="nm">${esc(p.name)}</span><span class="st">${STATUS[p.status].label}${p.opened ? " · " + p.opened : ""}</span></span><span class="mi">${reachMi(id).toFixed(2)} mi</span>`);
      if (id === highlighted) li.classList.add("active");
      li.addEventListener("click", () => focusReach(id));
      li.addEventListener("keydown", e => { if (e.key === "Enter") focusReach(id); });
      list.appendChild(li);
    });
  }
  renderReachList();

  /* ---------- Timeline: sticky overview + time-machine map ---------- */
  const CATS = {
    build: { label: "Construction & openings", color: "--open" },
    fund:  { label: "Funding & costs",         color: "--planned" },
    plan:  { label: "Plans & policy",          color: "--design" },
    flood: { label: "Flood & Valley Water",    color: "--flood" },
    camp:  { label: "Encampments & safety",    color: "--muted" },
  };
  const events = TIMELINE.map(e => ({ ...e, g: EVENT_GEO[e.d] || {}, yr: decYear(e.d) })).sort((a, b) => a.yr - b.yr);
  const activeCats = new Set(Object.keys(CATS));
  const T0 = 1989, T1 = 2036;
  const pctOf = y => (y - T0) / (T1 - T0) * 100;

  Object.entries(CATS).forEach(([k, c]) => {
    const b = h("button", { class: "chip", "aria-pressed": "true" }, `<span class="dot" style="background:var(${c.color})"></span>${c.label}`);
    b.addEventListener("click", () => {
      const on = b.getAttribute("aria-pressed") === "true";
      b.setAttribute("aria-pressed", String(!on));
      on ? activeCats.delete(k) : activeCats.add(k);
      renderTimeline();
    });
    $("#tlFilters").appendChild(b);
  });

  const tlMap = makeMap("tlMap", { zoomControl: false }, true);
  const builtBy = (id, y) => BUILT[id] && BUILT[id].y <= y;
  const tlStyle = (p, y) => {
    if (p.status === "Planned" || p.status === "Design") return { color: css("--planned"), weight: 3.5, opacity: .6, dashArray: "1 7", lineCap: "round" };
    if (builtBy(p.id, y)) return { ...styleFor(p.status), weight: 4.5 };
    return { color: css("--muted"), weight: 2.5, opacity: .5, dashArray: "3 6", lineCap: "round" };
  };
  const tlHalo = L.layerGroup().addTo(tlMap);
  const tlTrail = L.geoJSON(REACHES, { style: f => tlStyle(f.properties, T0), interactive: false }).addTo(tlMap);
  const tlPoint = L.layerGroup().addTo(tlMap);
  tlMap.fitBounds(allBounds, { padding: [20, 20] });
  let curEvent = null;
  const openMiles = y => feats.filter(f => f.properties.status.startsWith("Open") && builtBy(f.properties.id, y)).reduce((s, f) => s + f.properties.mi, 0);

  function showEventOnMap(e) {
    const y = Math.min(e.yr, 2026.9);
    tlTrail.eachLayer(l => l.setStyle(tlStyle(l.feature.properties, y)));
    tlHalo.clearLayers(); tlPoint.clearLayers();
    const ids = e.g.r || [];
    if (ids.length) L.geoJSON({ type: "FeatureCollection", features: featsFor(ids) }, { style: { color: css("--accent"), weight: 14, opacity: .3, lineCap: "round" }, interactive: false }).addTo(tlHalo);
    if (e.g.pt) L.marker(e.g.pt, { icon: L.divIcon({ className: "", html: '<div class="pulse"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), interactive: false }).addTo(tlPoint);
    let b = ids.length ? boundsFor(ids) : null;
    if (e.g.pt) b = b ? b.extend(e.g.pt) : L.latLng(e.g.pt).toBounds(900);
    if (!b) b = allBounds;
    tlMap.flyToBounds(b, { padding: [36, 36], maxZoom: 15, duration: 0.9 });
    $("#tlMapTitle").textContent = e.future ? `Expected: ${fmtD(e.d)}` : `Trail as of ${fmtD(e.d)}`;
    const where = ids.length ? extentLabel(ids) : "";
    $("#tlMapSub").textContent = `${openMiles(y).toFixed(1)} mi open${where ? " · " + where : ""}${y < 2021 ? " · early opening years approximate" : ""}`;
    $("#tlNowDate").textContent = fmtD(e.d);
  }

  let io;
  function setActive(i, li) {
    if (curEvent === i) return;
    curEvent = i;
    $$("#tlList li").forEach(x => x.classList.toggle("active", x === li));
    $$("#tlOverview .ev").forEach(x => x.classList.toggle("active", +x.dataset.i === i));
    $("#tlCursor").style.left = pctOf(events[i].yr) + "%";
    showEventOnMap(events[i]);
  }
  function renderTimeline() {
    const list = $("#tlList"), ov = $("#tlOverview");
    list.innerHTML = ""; $$("#tlOverview .ev, #tlOverview .tick").forEach(x => x.remove());
    for (let y = 1990; y <= 2035; y += 5) {
      const t = h("span", { class: "tick" }, String(y)); t.style.left = pctOf(y) + "%"; ov.appendChild(t);
    }
    if (io) io.disconnect();
    io = new IntersectionObserver(entries => {
      const vis = entries.filter(en => en.isIntersecting);
      if (vis.length) setActive(+vis[0].target.dataset.i, vis[0].target);
    }, { rootMargin: "-45% 0px -50% 0px" });
    const rows = {};
    curEvent = null;
    events.forEach((e, i) => {
      if (!activeCats.has(e.cat)) return;
      const c = CATS[e.cat];
      const li = h("li", { id: "ev" + i, "data-i": i, class: e.future ? "future" : "" });
      li.style.setProperty("--c", `var(${c.color})`);
      const ph = (e.g.ph || []).map(f => PHOTO_BY_F[f]).filter(Boolean);
      const sch = e.g.sch ? SCH_BY_K[e.g.sch] : null;
      const where = e.g.r ? extentLabel(e.g.r) : (e.g.pt ? "Senter Rd trestle area" : "");
      const media = ph.map(p => `<button class="tl-ph" data-photo="${esc(p.f)}" title="${esc(p.c)}"><img loading="lazy" src="${fp(p.f, 400)}" alt="${esc(p.c)}"><span>${esc(p.c)}<small>${esc(p.a)} · ${esc(p.l)}</small></span></button>`).join("") +
        (sch ? `<button class="tl-ph tl-sch" data-sch="${sch.k}" title="${esc(sch.t)}"><img loading="lazy" src="${schImg(sch, true)}" alt="${esc(sch.t)}"><span>Plan sheet<small>${esc(sch.d)}</small></span></button>` : "");
      li.innerHTML = `<div class="card tl-card"><div class="tl-date">${fmtD(e.d)}${e.future ? " · expected" : ""}<span class="tl-cat">${c.label}</span></div>
        <h3>${esc(e.t)}</h3><p>${esc(e.x)}</p>
        ${where ? `<div class="tl-where">${pinSvg}${esc(where)}</div>` : ""}
        ${media ? `<div class="tl-media">${media}</div>` : ""}
        <div class="srcs">${e.s.map(([n, u]) => `<a href="${u}" ${ext}>${esc(n)}</a>`).join("")}</div></div>`;
      li.addEventListener("click", ev => { if (!ev.target.closest("a,button")) { curEvent = null; setActive(i, li); } });
      list.appendChild(li); io.observe(li);
      const pct = pctOf(e.yr), bucket = Math.round(pct * 1.4);
      const row = rows[bucket] = (rows[bucket] || 0) + 1;
      const dot = h("button", { class: "ev" + (e.future ? " future" : ""), "data-i": i, "aria-label": `${fmtD(e.d)}: ${e.t}` });
      dot.style.left = pct + "%"; dot.style.bottom = (8 + (row - 1) * 11) + "px";
      dot.style.setProperty("--c", `var(${c.color})`);
      dot.addEventListener("mousemove", ev => showTip(ev, `<b>${esc(e.t)}</b>${fmtD(e.d)}`));
      dot.addEventListener("mouseleave", hideTip);
      dot.addEventListener("click", () => {
        const top = li.getBoundingClientRect().top + scrollY - innerHeight * 0.45 + 20;
        scrollTo({ top, behavior: "smooth" });
      });
      ov.appendChild(dot);
    });
    const first = list.querySelector("li"); if (first) setActive(+first.dataset.i, first);
  }
  renderTimeline();

  const syncSticky = () => {
    document.documentElement.style.setProperty("--top-h", $(".topbar").offsetHeight + "px");
    document.documentElement.style.setProperty("--tl-h", $("#tlSticky").offsetHeight + "px");
    maps.forEach(s => s.m.invalidateSize());
  };
  addEventListener("resize", syncSticky); syncSticky();

  /* ---------- Cost charts ---------- */
  function barChart(el, rows, max, fmt) {
    el.innerHTML = "";
    rows.forEach(r => {
      const row = h("div", { class: "brow" }, `<div class="lab">${esc(r.label)}<small>${esc(r.sub || "")}</small></div><div class="btrack"><div class="bfill" style="width:0"></div><span class="bval">${fmt(r.v)}</span></div>`);
      row.addEventListener("mousemove", e => showTip(e, r.tip));
      row.addEventListener("mouseleave", hideTip);
      el.appendChild(row);
      requestAnimationFrame(() => requestAnimationFrame(() => { row.querySelector(".bfill").style.width = `max(3px, calc((100% - 72px) * ${(r.v / max).toFixed(4)}))`; }));
    });
  }
  function renderCharts() {
    const byCost = PROJECTS.slice().sort((a, b) => b.cost - a.cost);
    barChart($("#costBars"), byCost.map(p => ({
      label: p.name, sub: `${p.year}${p.mi ? " · " + p.mi + " mi" : " · bridge"}`, v: p.cost,
      tip: `<b>${esc(p.name)}</b>Total $${p.cost.toFixed(2)}M${p.contract ? ` · contract $${p.contract.toFixed(2)}M` : ""}<br>${esc(p.funding)}`,
    })), Math.max(...byCost.map(p => p.cost)), v => "$" + v.toFixed(1) + "M");
    const byPM = builtProjects.slice().sort((a, b) => perMileOf(b) - perMileOf(a));
    barChart($("#perMileBars"), byPM.map(p => ({
      label: p.name, sub: `${p.mi} mi`, v: perMileOf(p),
      tip: `<b>${esc(p.name)}</b>$${p.cost.toFixed(2)}M ÷ ${p.mi} mi${p.note ? "<br>" + esc(p.note) : ""}`,
    })), Math.max(...byPM.map(perMileOf)), v => "$" + v.toFixed(1) + "M");
  }
  renderCharts();

  $("#projTable").innerHTML = `<thead><tr><th>Project</th><th class="num">Opened</th><th class="num">Miles</th><th class="num">Contract</th><th class="num">Total cost</th><th class="num">$/mile</th><th>Funding</th><th>Source</th></tr></thead><tbody>` +
    PROJECTS.map(p => `<tr><td>${esc(p.name)} <span class="muted">${p.id}</span></td><td class="num">${p.year}</td><td class="num">${p.mi ?? "–"}</td><td class="num">${p.contract ? "$" + p.contract.toFixed(2) + "M" : "–"}</td><td class="num">$${p.cost.toFixed(2)}M</td><td class="num">${p.mi ? "$" + perMileOf(p).toFixed(1) + "M" : "–"}</td><td>${esc(p.funding)}</td><td><a href="${p.src}" ${ext}>Memo ↗</a></td></tr>`).join("") +
    `<tr><td><strong>Total</strong></td><td></td><td class="num">${builtProjects.reduce((a, p) => a + p.mi, 0).toFixed(2)}</td><td></td><td class="num"><strong>$${spent.toFixed(2)}M</strong></td><td class="num">$${avgPM.toFixed(1)}M</td><td colspan="2"></td></tr></tbody>`;

  /* ---------- Estimator ---------- */
  const slider = $("#perMile");
  const presets = [["Creek-bank (Phelan–Tully)", lowPM], ["Average of recent projects", avgPM], ["Bridge-heavy (Mabury–Empire)", highPM]];
  presets.forEach(([n, v]) => {
    const b = h("button", { class: "chip", "aria-pressed": "false" }, `${n} · $${v.toFixed(1)}M/mi`);
    b.addEventListener("click", () => { slider.value = v.toFixed(1); updateEst(); });
    $("#presets").appendChild(b);
  });
  function renderGapTable() {
    const pm = +slider.value;
    $("#gapTable").innerHTML = `<thead><tr><th>Gap (north → south)</th><th class="num">Miles</th><th>Status &amp; notes</th><th class="num">Est. cost</th></tr></thead><tbody>` +
      GAPS.map(g => `<tr><td><span class="gname"><span class="pill" style="background:${statusColor(g.status)}">${g.status}</span>${esc(g.name)}</span></td><td class="num">${g.mi.toFixed(2)}</td><td>${esc(g.hard)}</td><td class="num">$${(g.mi * pm).toFixed(1)}M</td></tr>`).join("") +
      `<tr><td>Permanent Singleton bridge</td><td class="num">–</td><td>210-ft span above 100-yr flood (2019 est.)</td><td class="num">$${SINGLETON_PERM.toFixed(1)}M</td></tr>` +
      `<tr><td><strong>Total</strong></td><td class="num"><strong>${gapMi.toFixed(2)}</strong></td><td></td><td class="num"><strong>$${estimate(pm).toFixed(1)}M</strong></td></tr></tbody>`;
  }
  function updateEst() {
    const pm = +slider.value;
    $("#perMileVal").textContent = `$${pm.toFixed(1)}M`;
    $("#estNum").textContent = fmtM(estimate(pm));
    $("#estSub").textContent = `${gapMi.toFixed(1)} mi × $${pm.toFixed(1)}M + Singleton bridge`;
    $$("#presets .chip").forEach((b, i) => b.setAttribute("aria-pressed", String(Math.abs(presets[i][1] - pm) < 0.06)));
    renderGapTable();
  }
  slider.addEventListener("input", updateEst);
  slider.value = avgPM.toFixed(1);
  updateEst();

  /* ---------- Documents: locator map ---------- */
  const docMap = makeMap("docMap", { zoomControl: false }, true);
  const docStyle = p => ({ ...styleFor(p.status), weight: 3, opacity: .45 });
  const docBase = L.geoJSON(REACHES, { style: f => docStyle(f.properties), interactive: false }).addTo(docMap);
  const docHl = L.layerGroup().addTo(docMap);
  docMap.fitBounds(allBounds, { padding: [16, 16] });
  let docTimer, docSel = null, docCur = undefined;
  const docShow = (ids, title) => {
    clearTimeout(docTimer);
    docTimer = setTimeout(() => {
      if (docCur === title) return;
      docCur = title;
      docHl.clearLayers();
      const cap = $("#docMapCap");
      if (!ids) {
        cap.innerHTML = title ? `<strong>${esc(title)}</strong><span>Whole corridor / not location-specific</span>` : `<strong>Hover over a document</strong><span>to see the stretch of trail it covers</span>`;
        docMap.flyToBounds(allBounds, { padding: [16, 16], duration: 0.6 });
        return;
      }
      const fc = { type: "FeatureCollection", features: featsFor(ids) };
      L.geoJSON(fc, { style: { color: css("--accent"), weight: 13, opacity: .3, lineCap: "round" }, interactive: false }).addTo(docHl);
      L.geoJSON(fc, { style: f => ({ ...styleFor(f.properties.status), weight: 5 }), interactive: false }).addTo(docHl);
      cap.innerHTML = `<strong>${esc(title)}</strong><span>${esc(extentLabel(ids))} · ${extentMi(ids).toFixed(1)} mi</span>`;
      docMap.flyToBounds(boundsFor(ids), { padding: [30, 30], maxZoom: 15, duration: 0.6 });
    }, 140);
  };
  const bindDoc = (el, ids, title) => {
    el.addEventListener("mouseenter", () => docShow(ids, title));
    el.addEventListener("focusin", () => docShow(ids, title));
    el.addEventListener("mouseleave", () => { if (docSel) docShow(docSel.ids, docSel.title); });
  };

  SCHEMATICS.forEach(s => {
    const card = h("div", { class: "card sch-card" },
      `<button class="sch-img" data-sch="${s.k}" aria-label="Enlarge ${esc(s.t)}"><img loading="lazy" src="${schImg(s, true)}" alt="${esc(s.t)}"></button>
       <div class="sch-body"><strong>${esc(s.t)}</strong><span class="muted small">${esc(s.d)}</span>${locatorHTML(s.r)}
       <span class="sch-actions"><button class="link-btn" data-show>${pinSvg} Show on map</button><a href="${s.src}" ${ext}>Source PDF ↗</a></span></div>`);
    bindDoc(card, s.r, s.t);
    card.querySelector("[data-show]").addEventListener("click", () => { docSel = { ids: s.r, title: s.t }; docShow(s.r, s.t); });
    $("#schGrid").appendChild(card);
  });

  const pdfIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>`;
  DOCS.forEach(g => {
    const grp = h("div", { class: "card doc-group" }, `<h3>${esc(g.g)} <span class="count">${g.items.length}</span></h3><ul></ul>`);
    g.items.forEach(([t, u]) => {
      const ids = DOC_GEO[t] === undefined ? null : DOC_GEO[t];
      const li = h("li", {}, `<a href="${u}" ${ext}>${pdfIcon}<span class="doc-t"><span>${esc(t)}</span>${locatorHTML(ids)}</span></a>`);
      bindDoc(li, ids, t);
      grp.querySelector("ul").appendChild(li);
    });
    $("#docGrid").appendChild(grp);
  });
  $("#mapLinks").innerHTML = MAPS.map(m => `<a class="card link-card" href="${m.u}" ${ext}><span class="tag">${esc(m.tag)}</span><strong>${esc(m.t)}</strong><span class="d">${esc(m.d)}</span></a>`).join("");

  themeListeners.push(() => {
    restyleAll(); renderReachList(); renderCharts(); renderGapTable();
    docBase.eachLayer(l => l.setStyle(docStyle(l.feature.properties)));
    if (curEvent != null) { const i = curEvent; curEvent = null; setActive(i, $(`#tlList li[data-i="${i}"]`)); }
  });

  /* ---------- News ---------- */
  const news = NEWS.slice().sort((a, b) => b[0].localeCompare(a[0]));
  function renderNews(q = "") {
    q = q.trim().toLowerCase();
    const hits = news.filter(n => !q || n.join(" ").toLowerCase().includes(q));
    $("#newsList").innerHTML = hits.map(([d, o, t, u, s]) => `<li><a class="card" href="${u}" ${ext}><span class="meta"><span class="outlet">${esc(o)}</span><span>${fmtD(d)}</span></span><strong>${esc(t)}</strong><span class="sum">${esc(s)}</span></a></li>`).join("");
    $("#newsCount").textContent = `${hits.length} of ${news.length} articles`;
  }
  $("#newsSearch").addEventListener("input", e => renderNews(e.target.value));
  renderNews();

  /* ---------- Photos (north → south) ---------- */
  const gal = $("#gallery");
  PHOTOS.slice().sort((a, b) => (b.ll ? b.ll[0] : -90) - (a.ll ? a.ll[0] : -90)).forEach(p => {
    const fig = h("figure", { tabindex: "0" }, `<img loading="lazy" src="${fp(p.f, 640)}" alt="${esc(p.c)}"><figcaption>${esc(p.c)}<small>${esc(p.a)} · ${esc(p.l)}</small></figcaption>${p.ll ? `<button class="gal-pin" title="Show on map" aria-label="Show ${esc(p.c)} on map">${pinSvg}Map</button>` : ""}`);
    fig.addEventListener("click", e => { if (e.target.closest(".gal-pin")) showPhotoOnMap(p.f); else openPhoto(p); });
    fig.addEventListener("keydown", e => { if (e.key === "Enter") openPhoto(p); });
    gal.appendChild(fig);
  });
})();
