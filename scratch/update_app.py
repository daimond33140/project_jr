# Update app.js to implement Google-Maps-style Leaflet dual comparison, 
# section 02 regional map, starfield Three.js, and province modal inspector

with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update DOMContentLoaded to call initDualMapComparison()
old_init = """  initCharts();
  renderGeoMap();
  renderTable(RAW_DATA.provinces);
  setupEventListeners();
  updateStorytellingModal(0);"""

new_init = """  initCharts();
  initDualMapComparison();
  renderGeoMap();
  renderTable(RAW_DATA.provinces);
  setupEventListeners();
  updateStorytellingModal(0);"""

if old_init in content:
    content = content.replace(old_init, new_init, 1)
    print("Replaced DOMContentLoaded init")
else:
    print("Could not find old_init")

# 2. Replace renderGeoMap() implementation with Leaflet GeoJSON
old_render_geo = """// ==========================================
// 2. GEOGRAPHICAL THAILAND MAP VISUALIZATION
// ==========================================
function renderGeoMap() {
  const bubblesLayer = document.getElementById("province-bubbles-layer");
  const rankingList = document.getElementById("region-ranking-list");
  if (!bubblesLayer || !rankingList) return;

  bubblesLayer.innerHTML = "";
  rankingList.innerHTML = "";

  // Render ranking cards
  RAW_DATA.regions.forEach(reg => {
    const card = document.createElement("div");
    card.className = `region-rank-item ${currentFilter.region === reg.id ? "active" : ""}`;
    card.setAttribute("data-region", reg.id);
    card.innerHTML = `
      <div class="rank-item-header">
        <span>${reg.name}</span>
        <span class="rank-sales">${(reg.revenue_all / 1e9).toFixed(0)}B</span>
      </div>
      <div class="rank-item-stats">
        <span>${reg.provinces_count} จังหวัด</span>
        <span class="rank-growth">แชร์ ${reg.share}</span>
      </div>
    `;
    card.addEventListener("click", () => {
      selectRegion(reg.id);
    });
    rankingList.appendChild(card);
  });

  // Render top province bubbles on SVG
  RAW_DATA.provinces.slice(0, 25).forEach(prov => {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", prov.x);
    circle.setAttribute("cy", prov.y);
    circle.setAttribute("r", prov.r);
    circle.setAttribute("class", "map-province-bubble");
    circle.setAttribute("data-region", prov.region_id);
    circle.setAttribute("data-province", prov.name);

    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = `${prov.name} (${prov.region_name})\\nรายได้รวม: ${formatCurrency(prov.revenue_all)}\\nต่างชาติ: ${prov.foreign_share}%\\nอัตราเข้าพัก: ${prov.occupancy_rate}%`;
    circle.appendChild(title);

    circle.addEventListener("click", () => {
      selectRegion(prov.region_id);
    });

    bubblesLayer.appendChild(circle);

    // Label for Top Hubs
    if (prov.r >= 14) {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", prov.x);
      text.setAttribute("y", prov.y + 4);
      text.setAttribute("class", "map-province-label");
      text.textContent = prov.name.replace("มหานคร", "");
      bubblesLayer.appendChild(text);
    }
  });

  // Attach click listener to SVG regions
  document.querySelectorAll(".region-shape").forEach(path => {
    path.addEventListener("click", (e) => {
      const regId = e.currentTarget.getAttribute("data-region");
      selectRegion(regId);
    });
  });
}"""

new_render_geo = """// ==========================================
// 2. GEOGRAPHICAL THAILAND MAP VISUALIZATION (GOOGLE MAPS / LEAFLET STYLE)
// ==========================================
let regionLeafletMap = null;
let regionGeoLayer = null;

function renderGeoMap() {
  const mapContainer = document.getElementById("thailand-region-leaflet");
  const rankingList = document.getElementById("region-ranking-list");
  if (!mapContainer || !rankingList) return;

  rankingList.innerHTML = "";

  // Render ranking cards
  RAW_DATA.regions.forEach(reg => {
    const card = document.createElement("div");
    card.className = `region-rank-item ${currentFilter.region === reg.id ? "active" : ""}`;
    card.setAttribute("data-region", reg.id);
    card.innerHTML = `
      <div class="rank-item-header">
        <span>${reg.name}</span>
        <span class="rank-sales">${(reg.revenue_all / 1e9).toFixed(0)}B</span>
      </div>
      <div class="rank-item-stats">
        <span>${reg.provinces_count} จังหวัด</span>
        <span class="rank-growth">แชร์ ${reg.share}</span>
      </div>
    `;
    card.addEventListener("click", () => {
      selectRegion(reg.id);
    });
    rankingList.appendChild(card);
  });

  if (typeof L === "undefined") return;

  if (!regionLeafletMap) {
    regionLeafletMap = L.map('thailand-region-leaflet', {
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
    }).addTo(regionLeafletMap);
  }

  const regionColors = {
    "central": "#00f0ff",
    "south": "#38bdf8",
    "east_northeast": "#f59e0b",
    "north": "#a855f7",
    "east": "#10b981"
  };

  const geoData = window.THAILAND_GEOJSON;
  if (!geoData) return;

  if (regionGeoLayer) {
    regionLeafletMap.removeLayer(regionGeoLayer);
  }

  regionGeoLayer = L.geoJSON(geoData, {
    style: function(feature) {
      const regId = feature.properties.region_id;
      const isSelected = currentFilter.region === "all" || currentFilter.region === regId;
      const baseColor = regionColors[regId] || "#00f0ff";
      return {
        fillColor: baseColor,
        fillOpacity: isSelected ? 0.65 : 0.12,
        color: isSelected ? baseColor : "#334155",
        weight: isSelected ? 1.5 : 0.8,
        dashArray: ""
      };
    },
    onEachFeature: function(feature, layer) {
      const thName = feature.properties.th_name || feature.properties.name;
      const regName = feature.properties.region_name || "";
      const provInfo = RAW_DATA.provinces.find(p => p.name === thName) || {};

      layer.bindTooltip(`
        <div style="font-weight:700; color:#00f0ff; margin-bottom:2px;">${thName}</div>
        <div style="font-size:0.75rem; color:#94a3b8;">${regName}</div>
        <div style="font-size:0.75rem; color:#f8fafc; margin-top:3px;">รายได้รวม: <strong>${formatCurrency(provInfo.revenue_all || 0)}</strong></div>
        <div style="font-size:0.72rem; color:#38bdf8;">นักท่องเที่ยว: ${formatNumber(provInfo.no_tourist_all || 0)} คน</div>
      `, {
        className: 'thailand-map-tooltip',
        sticky: true,
        direction: 'top'
      });

      layer.on({
        mouseover: function(e) {
          const l = e.target;
          l.setStyle({
            weight: 3.5,
            color: "#ffffff",
            fillOpacity: 0.9
          });
          l.bringToFront();
        },
        mouseout: function(e) {
          regionGeoLayer.resetStyle(e.target);
        },
        click: function() {
          openProvinceDetailModal(thName);
        }
      });
    }
  }).addTo(regionLeafletMap);

  setTimeout(() => {
    regionLeafletMap.invalidateSize();
  }, 100);
}"""

if old_render_geo in content:
    content = content.replace(old_render_geo, new_render_geo, 1)
    print("Replaced renderGeoMap")
else:
    print("Could not find old_render_geo")

with open("app.js", "w", encoding="utf-8") as f:
    f.write(content)
