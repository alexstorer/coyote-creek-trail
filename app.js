(() => {
  const $ = (s, el = document) => el.querySelector(s);
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

  const STATUS = {
    "Open Paved":   { key: "open",    label: "Open (paved)",        cls: "st-open" },
    "Open Interim": { key: "interim", label: "Open (interim gravel)", cls: "st-interim" },
    "Design":       { key: "design",  label: "In design",           cls: "st-design" },
    "Planned":      { key: "planned", label: "Planned gap",         cls: "st-planned" },
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

  /* ---------- Tooltip ---------- */
  const tip = $("#tooltip");
  const showTip = (e, html) => { tip.innerHTML = html; tip.hidden = false; moveTip(e); };
  const moveTip = e => {
    const x = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8);
    const y = e.clientY + 16 + tip.offsetHeight > innerHeight ? e.clientY - tip.offsetHeight - 12 : e.clientY + 16;
    tip.style.left = x + "px"; tip.style.top = y + "px";
  };
  const hideTip = () => { tip.hidden = true; };

  /* ---------- Data prep ---------- */
  const feats = REACHES.features;
  const byId = {};
  feats.forEach(f => { (byId[f.properties.id] ||= []).push(f); });
  const reachMi = id => Math.max(...(byId[id] || []).map(f => f.properties.mi), 0);
  const gapMi = GAPS.reduce((a, g) => a + g.mi, 0);
  const builtProjects = PROJECTS.filter(p => p.mi);
  const spent = PROJECTS.reduce((a, p) => a + p.cost, 0);
  const perMileOf = p => p.cost / p.mi;
  const lowPM = perMileOf(PROJECTS[2]);           // Phelan–Tully, creek bank
  const highPM = perMileOf(PROJECTS[3]);          // Mabury–Empire, bridge + undercrossing
  const avgPM = builtProjects.reduce((a, p) => a + p.cost, 0) / builtProjects.reduce((a, p) => a + p.mi, 0);
  const SINGLETON_PERM = 7.7;
  const estimate = pm => gapMi * pm + SINGLETON_PERM;

  /* ---------- Hero stats ---------- */
  const stats = [
    ["~21 mi", "continuous trail from William Street Park south to Anderson Dam"],
    [gapMi.toFixed(1) + " mi", "of mainline gaps left in north San José (Montague to William St)"],
    [fmtM(spent), "spent on five City trail projects completed 2021–2025"],
    [`${fmtM(estimate(lowPM)).replace(".0", "")}–${fmtM(estimate(highPM))}`, "our rough estimate to close the gaps (no official figure exists)"],
  ];
  $("#stats").innerHTML = stats.map(([n, l]) => `<div class="stat"><span class="stat-num">${n}</span><span class="stat-label">${l}</span></div>`).join("");

  /* ---------- Strip diagram ---------- */
  const strip = $("#strip");
  const mainTotal = MAINLINE.reduce((a, id) => a + reachMi(id), 0);
  MAINLINE.forEach(id => {
    const f = (byId[id] || [])[0]; if (!f) return;
    const p = f.properties, mi = reachMi(id);
    const d = h("div", { class: STATUS[p.status].cls, tabindex: "0", "aria-label": `${p.name}, ${STATUS[p.status].label}, ${mi} miles` });
    d.style.flex = `${mi} 0 0`;
    d.addEventListener("mousemove", e => showTip(e, `<b>${esc(p.name)}</b>${STATUS[p.status].label} · ${mi.toFixed(2)} mi`));
    d.addEventListener("mouseleave", hideTip);
    d.addEventListener("click", () => { focusReach(id); document.getElementById("map").scrollIntoView(); });
    strip.appendChild(d);
  });
  const legendHTML = Object.values(STATUS).map(s => `<span><i class="sw ${s.cls}"></i>${s.label}</span>`).join("");
  $("#stripLegend").innerHTML = legendHTML + `<span class="muted" style="color:inherit;opacity:.7">${mainTotal.toFixed(1)} mainline miles mapped</span>`;

  /* ---------- Map ---------- */
  const map = L.map("leaflet", { scrollWheelZoom: false, zoomControl: true }).setView([37.31, -121.84], 11);
  let tiles;
  const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/";
  let labels;
  const setTiles = () => {
    if (tiles) map.removeLayer(tiles);
    if (labels) map.removeLayer(labels);
    const v = isDark() ? "World_Dark_Gray" : "World_Light_Gray";
    tiles = L.tileLayer(`${ESRI}${v}_Base/MapServer/tile/{z}/{y}/{x}`, {
      attribution: 'Basemap &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors · Trails: City of San José Open Data',
      maxZoom: 16,
    }).addTo(map);
    labels = L.tileLayer(`${ESRI}${v}_Reference/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 16, pane: "shadowPane" }).addTo(map);
  };
  setTiles();
  map.on("focus", () => map.scrollWheelZoom.enable());
  map.on("blur", () => map.scrollWheelZoom.disable());

  const styleFor = (status, hl) => {
    const base = { color: statusColor(status), weight: hl ? 8 : 4.5, opacity: 1, lineCap: "round", lineJoin: "round" };
    if (status === "Open Interim") base.dashArray = "10 7";
    if (status === "Design") base.dashArray = "8 8";
    if (status === "Planned") { base.dashArray = "1 9"; base.weight = hl ? 9 : 6; }
    return base;
  };
  const activeStatus = new Set(Object.keys(STATUS));
  const layerById = {};
  let highlighted = null;

  const popupHTML = p => {
    const s = STATUS[p.status], note = REACH_NOTES[p.id] || REACH_NOTES[p.id.replace("-D", "")];
    const owner = { PRNS: "City Parks (PRNS)", SCVWD: "Valley Water", SCC: "Santa Clara County Parks", DOT: "City DOT", PRIVATE: "Private", NEIGHCITY: "Neighboring city" }[p.owner] || p.owner || "Not recorded";
    return `<div class="pop"><span class="tag" style="background:${statusColor(p.status)}">${s.label}</span>
      <h4>${esc(p.name)}</h4>
      <div class="meta">${p.id && p.id !== "PARKWAY" ? esc(p.id) + " · " : ""}${p.mi.toFixed(2)} mi · ${esc(owner)}${p.opened ? " · opened " + p.opened : ""}</div>
      ${note ? `<p>${esc(note.text)}</p>${note.src ? `<p><a href="${note.src}" ${ext}>Source ↗</a></p>` : ""}` : ""}</div>`;
  };

  const trailLayer = L.geoJSON(REACHES, {
    style: f => styleFor(f.properties.status),
    filter: () => true,
    onEachFeature: (f, layer) => {
      (layerById[f.properties.id] ||= []).push(layer);
      layer.bindPopup(() => popupHTML(f.properties), { maxWidth: 300 });
      layer.on("mouseover", () => layer.setStyle({ weight: styleFor(f.properties.status).weight + 3 }));
      layer.on("mouseout", () => { if (highlighted !== f.properties.id) layer.setStyle(styleFor(f.properties.status)); });
    },
  }).addTo(map);
  map.fitBounds(trailLayer.getBounds(), { padding: [20, 20] });

  // Landmarks
  const lmLayer = L.layerGroup().addTo(map);
  const lmMarkers = [];
  LANDMARKS.forEach(l => {
    const m = L.marker(l.ll, { icon: L.divIcon({ className: "", html: '<div class="lm-icon"></div>', iconSize: [12, 12], iconAnchor: [6, 6] }), keyboard: false })
      .bindTooltip(l.name, { permanent: true, direction: "right", className: "lm-label", offset: [6, 0] });
    lmMarkers.push({ m, key: !!l.key });
  });
  const lmToggle = () => {
    const z = map.getZoom();
    lmMarkers.forEach(({ m, key }) => { const show = key || z >= 13; show ? lmLayer.addLayer(m) : lmLayer.removeLayer(m); });
  };
  map.on("zoomend", lmToggle); lmToggle();

  const restyleAll = () => {
    trailLayer.eachLayer(l => {
      const p = l.feature.properties;
      if (!activeStatus.has(p.status)) { l.setStyle({ opacity: 0 }); return; }
      l.setStyle(styleFor(p.status, highlighted === p.id));
    });
  };
  themeListeners.push(() => { setTiles(); restyleAll(); renderReachList(); renderCharts(); renderGapTable(); });

  function focusReach(id) {
    highlighted = id; restyleAll();
    const layers = layerById[id]; if (!layers) return;
    const g = L.featureGroup(layers);
    map.fitBounds(g.getBounds(), { padding: [60, 60], maxZoom: 16 });
    layers[0].bringToFront(); layers[0].openPopup();
    document.querySelectorAll(".reach-list li").forEach(li => li.classList.toggle("active", li.dataset.id === id));
    const li = document.querySelector(`.reach-list li[data-id="${CSS.escape(id)}"]`);
    if (li) li.scrollIntoView({ block: "nearest" });
  }

  // Filters
  const mf = $("#mapFilters");
  Object.entries(STATUS).forEach(([st, s]) => {
    const b = h("button", { class: "chip", "aria-pressed": "true" }, `<span class="dot ${s.cls}"></span>${s.label}`);
    b.addEventListener("click", () => {
      const on = b.getAttribute("aria-pressed") === "true";
      b.setAttribute("aria-pressed", String(!on));
      on ? activeStatus.delete(st) : activeStatus.add(st);
      restyleAll(); renderReachList();
    });
    mf.appendChild(b);
  });

  // Reach list (mainline order first, then other features)
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

  /* ---------- Timeline ---------- */
  const CATS = {
    build: { label: "Construction & openings", color: "--open" },
    fund:  { label: "Funding & costs",         color: "--planned" },
    plan:  { label: "Plans & policy",          color: "--design" },
    flood: { label: "Flood & Valley Water",    color: "--flood" },
    camp:  { label: "Encampments & safety",    color: "--muted" },
  };
  const parseD = d => { const [y, m = 6, day = 15] = d.split("-").map(Number); return new Date(y, m - 1, day); };
  const fmtD = d => {
    const p = d.split("-");
    const mons = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    if (p.length === 1) return p[0];
    if (p.length === 2) return `${mons[+p[1] - 1]} ${p[0]}`;
    return `${mons[+p[1] - 1]} ${+p[2]}, ${p[0]}`;
  };
  const events = TIMELINE.slice().sort((a, b) => parseD(a.d) - parseD(b.d));
  const activeCats = new Set(Object.keys(CATS));
  const tf = $("#tlFilters");
  Object.entries(CATS).forEach(([k, c]) => {
    const b = h("button", { class: "chip", "aria-pressed": "true" }, `<span class="dot" style="background:var(${c.color})"></span>${c.label}`);
    b.addEventListener("click", () => {
      const on = b.getAttribute("aria-pressed") === "true";
      b.setAttribute("aria-pressed", String(!on));
      on ? activeCats.delete(k) : activeCats.add(k);
      renderTimeline();
    });
    tf.appendChild(b);
  });

  function renderTimeline() {
    const list = $("#tlList"), ov = $("#tlOverview");
    list.innerHTML = ""; ov.innerHTML = "";
    const t0 = new Date(1990, 0, 1), t1 = new Date(2036, 0, 1), span = t1 - t0;
    for (let y = 1990; y <= 2035; y += 5) {
      const t = h("span", { class: "tick" }, String(y));
      t.style.left = ((new Date(y, 0, 1) - t0) / span * 100) + "%"; ov.appendChild(t);
    }
    const rowsUsed = {};
    events.forEach((e, i) => {
      if (!activeCats.has(e.cat)) return;
      const c = CATS[e.cat];
      const li = h("li", { id: "ev" + i, class: e.future ? "future" : "" });
      li.style.setProperty("--c", `var(${c.color})`);
      li.innerHTML = `<div class="card tl-card"><div class="tl-date">${fmtD(e.d)}${e.future ? " · expected" : ""}<span class="tl-cat">${c.label}</span></div>
        <h3>${esc(e.t)}</h3><p>${esc(e.x)}</p>
        <div class="srcs">${e.s.map(([n, u]) => `<a href="${u}" ${ext}>${esc(n)}</a>`).join("")}</div></div>`;
      list.appendChild(li);
      // overview dot, stacked to avoid overlap
      const pct = (parseD(e.d) - t0) / span * 100;
      const bucket = Math.round(pct * 1.6);
      const row = rowsUsed[bucket] = (rowsUsed[bucket] || 0) + 1;
      const dot = h("span", { class: "ev" + (e.future ? " future" : "") });
      dot.style.left = pct + "%"; dot.style.bottom = (4 + (row - 1) * 11) + "px";
      dot.style.background = `var(${c.color})`;
      dot.addEventListener("mousemove", ev => showTip(ev, `<b>${esc(e.t)}</b>${fmtD(e.d)}`));
      dot.addEventListener("mouseleave", hideTip);
      dot.addEventListener("click", () => {
        li.scrollIntoView({ behavior: "smooth", block: "center" });
        li.classList.add("flash"); setTimeout(() => li.classList.remove("flash"), 1400);
      });
      ov.appendChild(dot);
    });
  }
  renderTimeline();

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
  const presets = [
    ["Creek-bank (Phelan–Tully)", lowPM],
    ["Average of recent projects", avgPM],
    ["Bridge-heavy (Mabury–Empire)", highPM],
  ];
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
    document.querySelectorAll("#presets .chip").forEach((b, i) => b.setAttribute("aria-pressed", String(Math.abs(presets[i][1] - pm) < 0.26)));
    renderGapTable();
  }
  slider.addEventListener("input", updateEst);
  slider.value = avgPM.toFixed(1);
  updateEst();

  /* ---------- Documents & map links ---------- */
  const pdfIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>`;
  $("#docGrid").innerHTML = DOCS.map(g => `<div class="card doc-group"><h3>${esc(g.g)} <span class="count">${g.items.length}</span></h3><ul>${g.items.map(([t, u]) => `<li><a href="${u}" ${ext}>${pdfIcon}<span>${esc(t)}</span></a></li>`).join("")}</ul></div>`).join("");
  $("#mapLinks").innerHTML = MAPS.map(m => `<a class="card link-card" href="${m.u}" ${ext}><span class="tag">${esc(m.tag)}</span><strong>${esc(m.t)}</strong><span class="d">${esc(m.d)}</span></a>`).join("");

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

  /* ---------- Photos ---------- */
  const fp = (f, w) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f)}?width=${w}`;
  const gal = $("#gallery"), lb = $("#lightbox");
  PHOTOS.forEach(p => {
    const fig = h("figure", { tabindex: "0" }, `<img loading="lazy" src="${fp(p.f, 640)}" alt="${esc(p.c)}"><figcaption>${esc(p.c)}<small>${esc(p.a)} · ${esc(p.l)}</small></figcaption>`);
    const open = () => {
      $("#lbImg").src = fp(p.f, 1600); $("#lbImg").alt = p.c;
      $("#lbCap").innerHTML = `${esc(p.c)} · Photo: ${esc(p.a)}, ${esc(p.l)} · <a href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent(p.f)}" ${ext}>Wikimedia Commons ↗</a>`;
      lb.hidden = false;
    };
    fig.addEventListener("click", open);
    fig.addEventListener("keydown", e => { if (e.key === "Enter") open(); });
    gal.appendChild(fig);
  });
  lb.addEventListener("click", e => { if (e.target === lb || e.target.classList.contains("lb-close")) lb.hidden = true; });
  document.addEventListener("keydown", e => { if (e.key === "Escape") lb.hidden = true; });
})();
