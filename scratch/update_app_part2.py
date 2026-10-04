# Second part: Three.js clean starfield, Dual Map Leaflet Comparison, and Province Modal

with open("app.js", "r", encoding="utf-8") as f:
    code = f.read()

# Replace initThreeJSBackground()
three_start = code.find("function initThreeJSBackground() {")
three_end = code.find("function runPreloader() {", three_start)

if three_start != -1 and three_end != -1:
    old_three = code[three_start:three_end]
    new_three = """function initThreeJSBackground() {
  const canvas = document.getElementById("webgl-3d-bg");
  if (!canvas || typeof THREE === "undefined") return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 25);

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Starfield: Subtle, smooth twinkling cosmic particle background
  const starGeo = new THREE.BufferGeometry();
  const starCount = 350;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i += 3) {
    const r = 35 + Math.random() * 75;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    starPos[i] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPos[i + 2] = r * Math.cos(phi);
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));

  const starCanvas = document.createElement("canvas");
  starCanvas.width = 32;
  starCanvas.height = 32;
  const sCtx = starCanvas.getContext("2d");
  const sGrad = sCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
  sGrad.addColorStop(0, "rgba(255, 255, 255, 1)");
  sGrad.addColorStop(0.35, "rgba(0, 240, 255, 0.75)");
  sGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  sCtx.fillStyle = sGrad;
  sCtx.fillRect(0, 0, 32, 32);
  const starTex = new THREE.CanvasTexture(starCanvas);

  const starMat = new THREE.PointsMaterial({
    size: 2.0,
    map: starTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const starField = new THREE.Points(starGeo, starMat);
  scene.add(starField);

  // Subtle ambient light
  const ambientLight = new THREE.AmbientLight(0x0f172a, 1.2);
  scene.add(ambientLight);

  function animate() {
    requestAnimationFrame(animate);
    starField.rotation.y += 0.0003;
    starField.rotation.x += 0.00015;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });
}

"""
    code = code[:three_start] + new_three + code[three_end:]
    print("Replaced Three.js background with starfield")
else:
    print("Could not find initThreeJSBackground bounds")

# Replace init3DCardTilt()
tilt_start = code.find("function init3DCardTilt() {")
tilt_end = code.find("function initCustomCursor() {", tilt_start)

if tilt_start != -1 and tilt_end != -1:
    old_tilt = code[tilt_start:tilt_end]
    new_tilt = """function init3DCardTilt() {
  // 3D tilt and mouse glare disabled as requested:
  // Card hover is now a subtle smooth scale/zoom via CSS without tilt distortion.
}

"""
    code = code[:tilt_start] + new_tilt + code[tilt_end:]
    print("Replaced init3DCardTilt with clean handler")
else:
    print("Could not find init3DCardTilt bounds")

# Add Dual Map Comparison and Province Detail Modal
dual_map_code = """
// ==========================================
// 14. DUAL THAILAND MAP COMPARISON (GOOGLE MAPS / LEAFLET STYLE)
// ==========================================
let compareMapA = null;
let compareMapB = null;
let geoLayerA = null;
let geoLayerB = null;
let provinceLayersA = {};
let provinceLayersB = {};
let pmodalChartInstance = null;

function initDualMapComparison() {
  const containerA = document.getElementById("thailand-leaflet-a");
  const containerB = document.getElementById("thailand-leaflet-b");
  if (!containerA || !containerB || typeof L === "undefined") return;

  const yearASel = document.getElementById("compare-year-a");
  const yearBSel = document.getElementById("compare-year-b");
  const metricSel = document.getElementById("compare-metric-select");

  // Initialize Map A
  if (!compareMapA) {
    compareMapA = L.map('thailand-leaflet-a', {
      center: [13.2, 101.0],
      zoom: 6,
      minZoom: 5,
      maxZoom: 12,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(compareMapA);
  }

  // Initialize Map B
  if (!compareMapB) {
    compareMapB = L.map('thailand-leaflet-b', {
      center: [13.2, 101.0],
      zoom: 6,
      minZoom: 5,
      maxZoom: 12,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(compareMapB);
  }

  // Synchronized panning & zooming between Map A and Map B
  let isSyncing = false;
  compareMapA.on('move', () => {
    if (!isSyncing && compareMapB) {
      isSyncing = true;
      compareMapB.setView(compareMapA.getCenter(), compareMapA.getZoom(), { animate: false });
      isSyncing = false;
    }
  });

  compareMapB.on('move', () => {
    if (!isSyncing && compareMapA) {
      isSyncing = true;
      compareMapA.setView(compareMapB.getCenter(), compareMapB.getZoom(), { animate: false });
      isSyncing = false;
    }
  });

  function updateDualMaps() {
    const yearA = yearASel ? yearASel.value : "2019";
    const yearB = yearBSel ? yearBSel.value : "2022";
    const metric = metricSel ? metricSel.value : "revenue_all";

    updateNationalDiffTelemetry(yearA, yearB);
    renderChoropleth(compareMapA, yearA, metric, "A");
    renderChoropleth(compareMapB, yearB, metric, "B");
  }

  function getMetricColor(val, metric) {
    if (metric === "revenue_all") {
      if (val >= 40e9) return "#f59e0b"; // Gold / Amber
      if (val >= 10e9) return "#00f0ff"; // Vibrant Cyan
      if (val >= 3e9) return "#0284c7";  // Sky Blue
      if (val >= 1e9) return "#2563eb";  // Royal Blue
      return "#1e293b";                   // Dark Slate
    } else if (metric === "no_tourist_all") {
      if (val >= 4e6) return "#10b981";  // Emerald Green
      if (val >= 1.5e6) return "#14b8a6"; // Mint
      if (val >= 6e5) return "#0284c7";   // Sky Blue
      return "#1e293b";
    } else if (metric === "revenue_foreign") {
      if (val >= 20e9) return "#f43f5e"; // Rose Red
      if (val >= 4e9) return "#ec4899";  // Magenta
      if (val >= 5e8) return "#a855f7";  // Purple
      return "#1e293b";
    } else if (metric === "occupancy_rate") {
      if (val >= 65) return "#10b981";
      if (val >= 45) return "#00f0ff";
      if (val >= 25) return "#f59e0b";
      return "#ef4444";
    }
    return "#00f0ff";
  }

  function formatMetricVal(val, metric) {
    if (metric === "revenue_all" || metric === "revenue_foreign") {
      return formatCurrency(val || 0);
    } else if (metric === "no_tourist_all") {
      return formatNumber(val || 0) + " คน";
    } else if (metric === "occupancy_rate") {
      return (Number(val) || 0).toFixed(1) + "%";
    }
    return val;
  }

  function renderChoropleth(mapInstance, year, metric, side) {
    const geoData = window.THAILAND_GEOJSON;
    if (!geoData) return;

    if (side === "A" && geoLayerA) mapInstance.removeLayer(geoLayerA);
    if (side === "B" && geoLayerB) mapInstance.removeLayer(geoLayerB);

    const layerStore = side === "A" ? provinceLayersA : provinceLayersB;
    for (let k in layerStore) delete layerStore[k];

    const layer = L.geoJSON(geoData, {
      style: function(feature) {
        const thName = feature.properties.th_name || feature.properties.name;
        const pYear = RAW_DATA.yearlyProvinceData[thName]?.[year] || {};
        const val = pYear[metric] || 0;
        const fillColor = getMetricColor(val, metric);

        return {
          fillColor: fillColor,
          fillOpacity: 0.65,
          color: "rgba(0, 240, 255, 0.4)",
          weight: 1.2,
          dashArray: ""
        };
      },
      onEachFeature: function(feature, pLayer) {
        const thName = feature.properties.th_name || feature.properties.name;
        const regName = feature.properties.region_name || "";
        layerStore[thName] = pLayer;

        const pYear = RAW_DATA.yearlyProvinceData[thName]?.[year] || {};
        const val = pYear[metric] || 0;
        const yearThai = year === "2019" ? "2562" : year === "2020" ? "2563" : year === "2021" ? "2564" : year === "2562" ? "2565" : year === "2563" ? "2566" : year;

        pLayer.bindTooltip(`
          <div style="font-weight:700; color:#00f0ff;">${thName} (${regName})</div>
          <div style="font-size:0.75rem; color:#94a3b8;">ปี ${yearThai}</div>
          <div style="font-size:0.8rem; font-weight:700; color:#ffffff; margin-top:3px;">${formatMetricVal(val, metric)}</div>
        `, {
          className: 'thailand-map-tooltip',
          sticky: true,
          direction: 'top'
        });

        pLayer.on({
          mouseover: function() {
            highlightSynchronized(thName);
          },
          mouseout: function() {
            resetSynchronized();
          },
          click: function() {
            openProvinceDetailModal(thName);
          }
        });
      }
    }).addTo(mapInstance);

    if (side === "A") geoLayerA = layer;
    if (side === "B") geoLayerB = layer;

    setTimeout(() => {
      mapInstance.invalidateSize();
    }, 70);
  }

  function highlightSynchronized(thName) {
    const yearA = yearASel ? yearASel.value : "2019";
    const yearB = yearBSel ? yearBSel.value : "2022";
    const metric = metricSel ? metricSel.value : "revenue_all";

    const layerA = provinceLayersA[thName];
    const layerB = provinceLayersB[thName];

    if (layerA) {
      layerA.setStyle({ weight: 3.5, color: "#ffffff", fillOpacity: 0.95 });
      layerA.bringToFront();
    }
    if (layerB) {
      layerB.setStyle({ weight: 3.5, color: "#ffffff", fillOpacity: 0.95 });
      layerB.bringToFront();
    }

    // Update live comparison callout box
    const calloutName = document.getElementById("callout-province-name");
    const calloutGrid = document.getElementById("callout-grid");
    const calloutValA = document.getElementById("callout-val-a");
    const calloutValB = document.getElementById("callout-val-b");
    const calloutDiff = document.getElementById("callout-diff-badge");

    const dataA = RAW_DATA.yearlyProvinceData[thName]?.[yearA] || {};
    const dataB = RAW_DATA.yearlyProvinceData[thName]?.[yearB] || {};

    const valA = dataA[metric] || 0;
    const valB = dataB[metric] || 0;
    const diff = valB - valA;
    const pct = valA > 0 ? ((diff / valA) * 100).toFixed(1) : 0;

    const yAThai = yearA === "2019" ? "2562" : yearA === "2020" ? "2563" : yearA === "2021" ? "2564" : yearA === "2022" ? "2565" : "2566";
    const yBThai = yearB === "2019" ? "2562" : yearB === "2020" ? "2563" : yearB === "2021" ? "2564" : yearB === "2022" ? "2565" : "2566";

    if (calloutName) calloutName.textContent = `จังหวัด${thName}`;
    if (calloutValA) calloutValA.innerHTML = `ปี ${yAThai}: <strong>${formatMetricVal(valA, metric)}</strong>`;
    if (calloutValB) calloutValB.innerHTML = `ปี ${yBThai}: <strong>${formatMetricVal(valB, metric)}</strong>`;

    if (calloutDiff) {
      const isPositive = diff >= 0;
      calloutDiff.className = `callout-diff-badge ${isPositive ? "positive" : "negative"}`;
      calloutDiff.textContent = `${isPositive ? "+" : ""}${formatMetricVal(diff, metric)} (${isPositive ? "+" : ""}${pct}%)`;
    }

    if (calloutGrid) calloutGrid.style.display = "flex";
  }

  function resetSynchronized() {
    const yearA = yearASel ? yearASel.value : "2019";
    const yearB = yearBSel ? yearBSel.value : "2022";
    const metric = metricSel ? metricSel.value : "revenue_all";

    if (geoLayerA) geoLayerA.resetStyle();
    if (geoLayerB) geoLayerB.resetStyle();

    const calloutName = document.getElementById("callout-province-name");
    const calloutGrid = document.getElementById("callout-grid");
    if (calloutName) calloutName.textContent = "ชี้หรือคลิกที่จังหวัดใดก็ได้บนแผนที่เพื่อดูความต่างรายปี";
    if (calloutGrid) calloutGrid.style.display = "none";
  }

  function updateNationalDiffTelemetry(yearA, yearB) {
    const sumA = RAW_DATA.yearlySummary.find(s => s.year === yearA) || {};
    const sumB = RAW_DATA.yearlySummary.find(s => s.year === yearB) || {};

    const revDiff = (sumB.revenue_all || 0) - (sumA.revenue_all || 0);
    const revPct = sumA.revenue_all > 0 ? ((revDiff / sumA.revenue_all) * 100).toFixed(1) : 0;

    const tourDiff = (sumB.no_tourist_all || 0) - (sumA.no_tourist_all || 0);
    const tourPct = sumA.no_tourist_all > 0 ? ((tourDiff / sumA.no_tourist_all) * 100).toFixed(1) : 0;

    const occDiff = ((sumB.occupancy_rate || 0) - (sumA.occupancy_rate || 0)).toFixed(1);

    const fshareA = sumA.revenue_all > 0 ? ((sumA.revenue_foreign / sumA.revenue_all) * 100).toFixed(1) : 0;
    const fshareB = sumB.revenue_all > 0 ? ((sumB.revenue_foreign / sumB.revenue_all) * 100).toFixed(1) : 0;
    const fshareDiff = (fshareB - fshareA).toFixed(1);

    // Update Telemetry Elements
    const diffRevVal = document.getElementById("diff-rev-val");
    const diffRevPct = document.getElementById("diff-rev-pct");
    const diffRevSub = document.getElementById("diff-rev-sub");

    const diffTourVal = document.getElementById("diff-tour-val");
    const diffTourPct = document.getElementById("diff-tour-pct");
    const diffTourSub = document.getElementById("diff-tour-sub");

    const diffOccVal = document.getElementById("diff-occ-val");
    const diffOccPct = document.getElementById("diff-occ-pct");
    const diffOccSub = document.getElementById("diff-occ-sub");

    const diffFshareVal = document.getElementById("diff-fshare-val");
    const diffFsharePct = document.getElementById("diff-fshare-pct");
    const diffFshareSub = document.getElementById("diff-fshare-sub");

    if (diffRevVal) diffRevVal.textContent = (revDiff >= 0 ? "+" : "") + formatShortCurrency(revDiff);
    if (diffRevPct) {
      diffRevPct.textContent = `${revDiff >= 0 ? "+" : ""}${revPct}%`;
      diffRevPct.className = `diff-pct ${revDiff >= 0 ? "positive" : "negative"}`;
    }
    if (diffRevSub) diffRevSub.textContent = `ปี ${sumA.year_thai} (${formatShortCurrency(sumA.revenue_all)}) → ปี ${sumB.year_thai} (${formatShortCurrency(sumB.revenue_all)})`;

    if (diffTourVal) diffTourVal.textContent = (tourDiff >= 0 ? "+" : "") + formatNumber(tourDiff) + " คน";
    if (diffTourPct) {
      diffTourPct.textContent = `${tourDiff >= 0 ? "+" : ""}${tourPct}%`;
      diffTourPct.className = `diff-pct ${tourDiff >= 0 ? "positive" : "negative"}`;
    }
    if (diffTourSub) diffTourSub.textContent = `ปี ${sumA.year_thai} (${formatNumber(sumA.no_tourist_all)}) → ปี ${sumB.year_thai} (${formatNumber(sumB.no_tourist_all)} คน)`;

    if (diffOccVal) diffOccVal.textContent = `${occDiff >= 0 ? "+" : ""}${occDiff}%`;
    if (diffOccPct) {
      diffOccPct.textContent = occDiff >= 0 ? "ขยายตัว" : "หดตัว";
      diffOccPct.className = `diff-pct ${occDiff >= 0 ? "positive" : "negative"}`;
    }
    if (diffOccSub) diffOccSub.textContent = `ปี ${sumA.year_thai} (${sumA.occupancy_rate}%) → ปี ${sumB.year_thai} (${sumB.occupancy_rate}%)`;

    if (diffFshareVal) diffFshareVal.textContent = `${fshareDiff >= 0 ? "+" : ""}${fshareDiff}%`;
    if (diffFsharePct) {
      diffFsharePct.textContent = fshareDiff >= 0 ? "เพิ่มขึ้น" : "ลดลง";
      diffFsharePct.className = `diff-pct ${fshareDiff >= 0 ? "positive" : "negative"}`;
    }
    if (diffFshareSub) diffFshareSub.textContent = `ปี ${sumA.year_thai} (${fshareA}%) → ปี ${sumB.year_thai} (${fshareB}%)`;

    // Map Column Titles
    const mapAYearTitle = document.getElementById("map-a-year-title");
    const mapAStatPill = document.getElementById("map-a-stat-pill");
    const mapBYearTitle = document.getElementById("map-b-year-title");
    const mapBStatPill = document.getElementById("map-b-stat-pill");

    if (mapAYearTitle) mapAYearTitle.textContent = `ประเทศไทย ปี ${sumA.year_thai}`;
    if (mapAStatPill) mapAStatPill.textContent = `รวม: ${formatShortCurrency(sumA.revenue_all)}`;
    if (mapBYearTitle) mapBYearTitle.textContent = `ประเทศไทย ปี ${sumB.year_thai}`;
    if (mapBStatPill) mapBStatPill.textContent = `รวม: ${formatShortCurrency(sumB.revenue_all)}`;
  }

  yearASel?.addEventListener("change", updateDualMaps);
  yearBSel?.addEventListener("change", updateDualMaps);
  metricSel?.addEventListener("change", updateDualMaps);

  // Initial update
  updateDualMaps();
}

// ==========================================
// 15. PROVINCE DETAIL INSPECTION MODAL
// ==========================================
function openProvinceDetailModal(provinceName) {
  const modal = document.getElementById("province-detail-modal");
  if (!modal) return;

  const prov = RAW_DATA.provinces.find(p => p.name === provinceName) || {};
  const provYearly = RAW_DATA.yearlyProvinceData[provinceName] || {};

  const yearASel = document.getElementById("compare-year-a");
  const yearBSel = document.getElementById("compare-year-b");
  const yearA = yearASel ? yearASel.value : "2019";
  const yearB = yearBSel ? yearBSel.value : "2022";
  const yAThai = yearA === "2019" ? "2562" : yearA === "2020" ? "2563" : yearA === "2021" ? "2564" : yearA === "2022" ? "2565" : "2566";
  const yBThai = yearB === "2019" ? "2562" : yearB === "2020" ? "2563" : yearB === "2021" ? "2564" : yearB === "2022" ? "2565" : "2566";

  const pDataA = provYearly[yearA] || {};
  const pDataB = provYearly[yearB] || {};

  // Title & Subtitle
  const pTitle = document.getElementById("pmodal-title");
  const pSub = document.getElementById("pmodal-subtitle");
  if (pTitle) pTitle.textContent = `จังหวัด${provinceName} (${prov.name_en || provinceName})`;
  if (pSub) pSub.textContent = `${prov.region_name || "ภูมิภาค"} • ${prov.tier_name || prov.tier || "เมืองท่องเที่ยว"}`;

  // Comparison Banner
  const pYrALbl = document.getElementById("pmodal-yr-a-lbl");
  const pYrAVal = document.getElementById("pmodal-yr-a-val");
  const pYrBLbl = document.getElementById("pmodal-yr-b-lbl");
  const pYrBVal = document.getElementById("pmodal-yr-b-val");
  const pDiffBadge = document.getElementById("pmodal-diff-badge");

  if (pYrALbl) pYrALbl.textContent = `ปี ${yAThai}`;
  if (pYrAVal) pYrAVal.textContent = formatCurrency(pDataA.revenue_all || 0);
  if (pYrBLbl) pYrBLbl.textContent = `ปี ${yBThai}`;
  if (pYrBVal) pYrBVal.textContent = formatCurrency(pDataB.revenue_all || 0);

  const diffRev = (pDataB.revenue_all || 0) - (pDataA.revenue_all || 0);
  const diffPct = pDataA.revenue_all > 0 ? ((diffRev / pDataA.revenue_all) * 100).toFixed(1) : 0;

  if (pDiffBadge) {
    pDiffBadge.className = `pdiff-badge ${diffRev >= 0 ? "positive" : "negative"}`;
    pDiffBadge.textContent = `${diffRev >= 0 ? "+" : ""}${formatCurrency(diffRev)} (${diffRev >= 0 ? "+" : ""}${diffPct}%)`;
  }

  // 4 Provincial KPI Stat Cards
  const pRevAll = document.getElementById("pmodal-rev-all");
  const pRevShare = document.getElementById("pmodal-rev-share");
  const pFShare = document.getElementById("pmodal-foreign-share");
  const pTourists = document.getElementById("pmodal-tourists");
  const pSpend = document.getElementById("pmodal-spend");
  const pOcc = document.getElementById("pmodal-occupancy");

  if (pRevAll) pRevAll.textContent = formatCurrency(prov.revenue_all || 0);
  if (pRevShare) pRevShare.textContent = `ส่วนแบ่งรายได้ประเทศ ${(prov.revenue_share || 0).toFixed(2)}%`;
  if (pFShare) pFShare.textContent = `${(prov.foreign_share || 0).toFixed(1)}%`;
  if (pTourists) pTourists.textContent = formatNumber(prov.no_tourist_all || 0) + " คน";
  if (pSpend) pSpend.textContent = "฿" + Number(prov.spend_per_head || 0).toLocaleString() + " /คน";
  if (pOcc) pOcc.textContent = `อัตราเข้าพักเฉลี่ย ${(prov.occupancy_rate || 0).toFixed(1)}%`;

  // Render 5-Year Trend Chart
  renderProvince5YrChart(provinceName);

  modal.classList.add("show");
}

function renderProvince5YrChart(provinceName) {
  const chartDom = document.getElementById("province-5yr-chart");
  if (!chartDom) return;

  if (!pmodalChartInstance) {
    pmodalChartInstance = echarts.init(chartDom);
  }

  const provYearly = RAW_DATA.yearlyProvinceData[provinceName] || {};
  const years = ["2019", "2020", "2021", "2022", "2023"];
  const xLabels = ["ปี 2562", "ปี 2563", "ปี 2564", "ปี 2565", "ปี 2566"];

  const thaiRev = years.map(y => (provYearly[y]?.revenue_thai || 0) / 1e6);
  const foreignRev = years.map(y => (provYearly[y]?.revenue_foreign || 0) / 1e6);
  const occRates = years.map(y => provYearly[y]?.occupancy_rate || 0);

  const c = getChartColors();

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      borderWidth: 1,
      textStyle: { color: c.tooltipText },
      formatter: function(params) {
        let res = `<div style="font-weight:700; color:#00f0ff;">${params[0].name}</div>`;
        params.forEach(p => {
          if (p.seriesName === "อัตราเข้าพัก") {
            res += `<div style="color:${p.color};">${p.seriesName}: <strong>${p.value}%</strong></div>`;
          } else {
            res += `<div style="color:${p.color};">${p.seriesName}: <strong>฿${p.value.toFixed(1)} ล้าน</strong></div>`;
          }
        });
        return res;
      }
    },
    grid: {
      left: "4%",
      right: "5%",
      top: "15%",
      bottom: "10%",
      containLabel: true
    },
    legend: {
      data: ["รายได้คนไทย", "รายได้ต่างชาติ", "อัตราเข้าพัก"],
      textStyle: { color: c.textColor },
      top: "2%"
    },
    xAxis: {
      type: "category",
      data: xLabels,
      axisLabel: { color: c.textColor },
      axisLine: { lineStyle: { color: c.axisLine } }
    },
    yAxis: [
      {
        type: "value",
        name: "รายได้ (ล้านบาท)",
        nameTextStyle: { color: c.textColor },
        axisLabel: { color: c.textColor, formatter: "{value}M" },
        splitLine: { lineStyle: { color: c.splitLine } }
      },
      {
        type: "value",
        name: "อัตราเข้าพัก (%)",
        nameTextStyle: { color: c.textColor },
        min: 0,
        max: 100,
        axisLabel: { color: c.textColor, formatter: "{value}%" },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: "รายได้คนไทย",
        type: "bar",
        data: thaiRev,
        itemStyle: { color: "#38bdf8", borderRadius: [4, 4, 0, 0] }
      },
      {
        name: "รายได้ต่างชาติ",
        type: "bar",
        data: foreignRev,
        itemStyle: { color: "#f59e0b", borderRadius: [4, 4, 0, 0] }
      },
      {
        name: "อัตราเข้าพัก",
        type: "line",
        yAxisIndex: 1,
        data: occRates,
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        itemStyle: { color: "#00f0ff" },
        lineStyle: { width: 3, color: "#00f0ff" }
      }
    ]
  };

  pmodalChartInstance.setOption(option);
  setTimeout(() => {
    pmodalChartInstance.resize();
  }, 100);
}

// Modal Close Listeners
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("province-detail-modal");
  document.getElementById("pmodal-close-btn")?.addEventListener("click", () => {
    modal?.classList.remove("show");
  });
  document.getElementById("pmodal-close-bottom-btn")?.addEventListener("click", () => {
    modal?.classList.remove("show");
  });
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("show");
  });
});
"""

# Append Dual Map & Modal code before setupViewSwitcher()
switcher_idx = code.find("function setupViewSwitcher() {")
if switcher_idx != -1:
    code = code[:switcher_idx] + dual_map_code + "\n" + code[switcher_idx:]
    print("Injected dual map code before setupViewSwitcher")
else:
    code += "\n" + dual_map_code

# Update setupViewSwitcher to set dual-compare as default active view
code = code.replace('setActiveView("orbit");', 'setActiveView("dual-compare");')
print("Set default view to dual-compare")

# Save updated app.js
with open("app.js", "w", encoding="utf-8") as f:
    f.write(code)
print("app.js successfully updated!")
