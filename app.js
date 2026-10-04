// ==========================================
// APP LOGIC & VISUALIZATION ENGINE (REAL MOTS TOURISM DATASET)
// THAILAND TOURISM INTELLIGENCE (2562 - 2566)
// ULTRA-CLEAN & DUAL THEME (LIGHT/DARK) READY
// ==========================================

let trendChartInstance = null;
let categoryChartInstance = null;
let rfmChartInstance = null;
let fulfillmentChartInstance = null;

let currentFilter = {
  year: "all",
  region: "all",
  tier: "all"
};

let currentStoryStep = 0;
let preloaderTimer = null;

// Formatters
const formatCurrency = (val) => {
  if (val >= 1e12) return "฿" + (val / 1e12).toFixed(2) + " ล้านล้าน";
  if (val >= 1e9) return "฿" + (val / 1e9).toFixed(1) + " พันล้าน";
  if (val >= 1e6) return "฿" + (val / 1e6).toFixed(1) + " ล้าน";
  return "฿" + Number(val).toLocaleString("th-TH");
};

const formatShortCurrency = (val) => {
  if (val >= 1e12) return (val / 1e12).toFixed(2) + "T";
  if (val >= 1e9) return (val / 1e9).toFixed(1) + "B";
  if (val >= 1e6) return (val / 1e6).toFixed(1) + "M";
  return Number(val).toLocaleString("th-TH");
};

const formatNumber = (val) => {
  if (val >= 1e6) return (val / 1e6).toFixed(1) + "M";
  return Number(val).toLocaleString("th-TH");
};

// Theme Detection
function isDarkMode() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

function getChartColors() {
  const dark = isDarkMode();
  return {
    textColor: dark ? "#94a3b8" : "#64748b",
    titleColor: dark ? "#f8fafc" : "#0f172a",
    splitLine: dark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)",
    axisLine: dark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.1)",
    tooltipBg: dark ? "#1e293b" : "#ffffff",
    tooltipBorder: dark ? "rgba(255, 255, 255, 0.15)" : "#e2e8f0",
    tooltipText: dark ? "#f8fafc" : "#0f172a",
    borderColor: dark ? "#111827" : "#ffffff"
  };
}

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  // Default to sleek dark presentation theme (Zajno style)
  const savedTheme = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeButtonUI(savedTheme);

  // Initialize 3D Presentation & Zajno Interaction Modules
  initThreeJSBackground();
  runPreloader();
  init3DCardTilt();
  initCustomCursor();

  initCharts();
  initDualMapComparison();
  renderGeoMap();
  renderTable(RAW_DATA.provinces);
  setupEventListeners();
  updateStorytellingModal(0);
});

function updateThemeButtonUI(theme) {
  const btn = document.getElementById("theme-toggle-btn");
  if (!btn) return;
  if (theme === "dark") {
    btn.innerHTML = `<i data-lucide="sun"></i><span id="theme-label">Light Mode</span>`;
  } else {
    btn.innerHTML = `<i data-lucide="moon"></i><span id="theme-label">Dark Mode</span>`;
  }
  lucide.createIcons();
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const newTheme = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  updateThemeButtonUI(newTheme);

  // Rebuild charts with theme palette
  trendChartInstance?.dispose();
  categoryChartInstance?.dispose();
  rfmChartInstance?.dispose();
  fulfillmentChartInstance?.dispose();

  trendChartInstance = null;
  categoryChartInstance = null;
  rfmChartInstance = null;
  fulfillmentChartInstance = null;

  initCharts();
}

// ==========================================
// 1. CHART INITIALIZATIONS (ECHARTS)
// ==========================================
function initCharts() {
  initTrendChart();
  initTopProvincesComparisonChart();
  initTierChart();
  initRegionDonutChart();

  // Responsive resize
  window.addEventListener("resize", () => {
    trendChartInstance?.resize();
    categoryChartInstance?.resize();
    rfmChartInstance?.resize();
    fulfillmentChartInstance?.resize();
  });
}

// 1.1 TRENDING & TIME-SERIES CHART
function initTrendChart(filteredTrends = null) {
  const chartDom = document.getElementById("trend-chart");
  if (!chartDom) return;
  if (!trendChartInstance) {
    trendChartInstance = echarts.init(chartDom);
  }

  const c = getChartColors();
  const trends = filteredTrends || RAW_DATA.monthlyTrends;
  const labels = trends.map(t => t.label);
  const thaiRevenues = trends.map(t => t.revenue_thai);
  const foreignRevenues = trends.map(t => t.revenue_foreign);
  const occupancies = trends.map(t => t.occupancy_rate);

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      borderWidth: 1,
      extraCssText: "box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px;",
      textStyle: { color: c.tooltipText, fontFamily: "Prompt" },
      formatter: function(params) {
        let idx = params[0].dataIndex;
        let t = trends[idx];
        let total = t.revenue_all;
        let res = `<div style="font-weight:600;margin-bottom:4px;color:${c.tooltipText}">${t.label} (วันที่ ${t.date})</div>`;
        if (t.event) {
          res += `<div style="font-size:11px;color:#d97706;margin-bottom:4px;">⚡ ${t.event}</div>`;
        }
        res += `<div style="font-size:12px;display:flex;justify-content:space-between;gap:12px;color:${c.tooltipText}">
          <span>รายได้รวม:</span><strong>${formatCurrency(total)}</strong>
        </div>`;
        params.forEach(item => {
          let val = item.seriesName === "อัตราการเข้าพัก (%)" 
            ? `${item.value}%` 
            : formatCurrency(item.value);
          res += `<div style="font-size:12px;display:flex;justify-content:space-between;gap:12px;color:${c.tooltipText}">
            <span>${item.marker} ${item.seriesName}:</span><strong>${val}</strong>
          </div>`;
        });
        return res;
      }
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "10%",
      top: "14%",
      containLabel: true
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: labels,
      axisLine: { lineStyle: { color: c.axisLine } },
      axisLabel: {
        color: c.textColor,
        fontFamily: "Prompt",
        fontSize: 10,
        interval: trends.length > 24 ? 2 : 0,
        rotate: trends.length > 24 ? 35 : 0
      }
    },
    yAxis: [
      {
        type: "value",
        name: "รายได้ (บาท)",
        nameTextStyle: { color: c.textColor, fontFamily: "Prompt", fontSize: 11 },
        splitLine: { lineStyle: { color: c.splitLine } },
        axisLabel: {
          color: c.textColor,
          formatter: (v) => `${(v / 1e9).toFixed(0)}B`
        }
      },
      {
        type: "value",
        name: "อัตราเข้าพัก (%)",
        max: 100,
        min: 0,
        nameTextStyle: { color: c.textColor, fontFamily: "Prompt", fontSize: 11 },
        splitLine: { show: false },
        axisLabel: {
          color: "#059669",
          formatter: (v) => `${v}%`
        }
      }
    ],
    series: [
      {
        name: "รายได้ชาวไทย",
        type: "line",
        smooth: true,
        data: thaiRevenues,
        itemStyle: { color: "#2563eb" },
        lineStyle: { width: 2.5 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(37, 99, 235, 0.25)" },
            { offset: 1, color: "rgba(37, 99, 235, 0.01)" }
          ])
        }
      },
      {
        name: "รายได้ชาวต่างชาติ",
        type: "line",
        smooth: true,
        data: foreignRevenues,
        itemStyle: { color: "#d97706" },
        lineStyle: { width: 2.5 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(217, 119, 6, 0.25)" },
            { offset: 1, color: "rgba(217, 119, 6, 0.01)" }
          ])
        },
        markPoint: {
          data: [
            { name: "ล็อกดาวน์", coord: ["เม.ย. 63", 260000000], value: "Lockdown", itemStyle: { color: "#e11d48" } },
            { name: "จุดสูงสุดปี 62", type: "max", itemStyle: { color: "#059669" } }
          ],
          label: { color: "#fff", fontFamily: "Prompt", fontSize: 9 }
        }
      },
      {
        name: "อัตราการเข้าพัก (%)",
        type: "line",
        yAxisIndex: 1,
        smooth: true,
        data: occupancies,
        lineStyle: { type: "dashed", width: 2, color: "#059669" },
        itemStyle: { color: "#059669" },
        showSymbol: false
      }
    ]
  };

  trendChartInstance.setOption(option);
}

// 1.2 COMPARISON CHART (TOP 10 PROVINCES STACKED)
function initTopProvincesComparisonChart(provincesList = null) {
  const chartDom = document.getElementById("category-chart");
  if (!chartDom) return;
  if (!categoryChartInstance) {
    categoryChartInstance = echarts.init(chartDom);
  }

  const c = getChartColors();
  const list = (provincesList || RAW_DATA.provinces).slice(0, 10).reverse();
  const names = list.map(p => p.name);
  const thaiData = list.map(p => (p.revenue_thai / 1e9).toFixed(1));
  const foreignData = list.map(p => (p.revenue_foreign / 1e9).toFixed(1));

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      borderWidth: 1,
      extraCssText: "box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px;",
      textStyle: { color: c.tooltipText, fontFamily: "Prompt" },
      formatter: function(params) {
        let pName = params[0].name;
        let prov = list.find(p => p.name === pName);
        return `<div style="font-weight:600;margin-bottom:4px;color:${c.tooltipText}">${pName} (${prov.region_name})</div>
          <div>รายได้รวม: <strong>${formatCurrency(prov.revenue_all)}</strong></div>
          <div style="color:#2563eb;">🇹🇭 ชาวไทย: <strong>${formatCurrency(prov.revenue_thai)}</strong></div>
          <div style="color:#d97706;">✈️ ต่างชาติ: <strong>${formatCurrency(prov.revenue_foreign)} (${prov.foreign_share}%)</strong></div>
          <div>อัตราเข้าพัก: <strong>${prov.occupancy_rate}%</strong></div>`;
      }
    },
    legend: {
      data: ["รายได้ชาวไทย", "รายได้ชาวต่างชาติ"],
      textStyle: { color: c.textColor, fontFamily: "Prompt", fontSize: 11 },
      top: "2%"
    },
    grid: {
      left: "3%",
      right: "6%",
      bottom: "5%",
      top: "14%",
      containLabel: true
    },
    xAxis: {
      type: "value",
      name: "พันล้านบาท",
      nameTextStyle: { color: c.textColor, fontFamily: "Prompt", fontSize: 10 },
      splitLine: { lineStyle: { color: c.splitLine } },
      axisLabel: { color: c.textColor }
    },
    yAxis: {
      type: "category",
      data: names,
      axisLine: { lineStyle: { color: c.axisLine } },
      axisLabel: { color: c.textColor, fontFamily: "Prompt", fontSize: 11 }
    },
    series: [
      {
        name: "รายได้ชาวไทย",
        type: "bar",
        stack: "total",
        data: thaiData,
        itemStyle: { color: "#2563eb" },
        barWidth: "50%"
      },
      {
        name: "รายได้ชาวต่างชาติ",
        type: "bar",
        stack: "total",
        data: foreignData,
        itemStyle: { color: "#d97706", borderRadius: [0, 4, 4, 0] },
        barWidth: "50%"
      }
    ]
  };

  categoryChartInstance.setOption(option);
}

// 1.3 CLASSIFICATION: TOURISM TIERS
function initTierChart() {
  const chartDom = document.getElementById("rfm-chart");
  if (!chartDom) return;
  if (!rfmChartInstance) {
    rfmChartInstance = echarts.init(chartDom);
  }

  const c = getChartColors();
  const tierSummary = {};
  RAW_DATA.provinces.forEach(p => {
    let t = p.tier;
    if (!tierSummary[t]) {
      tierSummary[t] = { revenue: 0, count: 0, tourists: 0 };
    }
    tierSummary[t].revenue += p.revenue_all;
    tierSummary[t].count += 1;
    tierSummary[t].tourists += p.no_tourist_all;
  });

  const tierColors = ["#2563eb", "#059669", "#d97706"];
  const tierData = Object.keys(tierSummary).map((k, idx) => ({
    name: k,
    value: tierSummary[k].revenue,
    count: tierSummary[k].count,
    tourists: tierSummary[k].tourists,
    itemStyle: { color: tierColors[idx % tierColors.length] }
  }));

  const option = {
    backgroundColor: "transparent",
    title: {
      text: "กลุ่มศักยภาพเมืองท่องเที่ยว (Tiers)",
      left: "center",
      top: "4%",
      textStyle: { color: c.titleColor, fontFamily: "Prompt", fontSize: 13, fontWeight: "600" }
    },
    tooltip: {
      trigger: "item",
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      borderWidth: 1,
      extraCssText: "box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px;",
      textStyle: { color: c.tooltipText, fontFamily: "Prompt" },
      formatter: function(params) {
        return `<div style="font-weight:600;color:${c.tooltipText}">${params.name}</div>
          <div>รายได้รวม: <strong>${formatCurrency(params.value)}</strong> (${params.percent}%)</div>
          <div>จำนวนจังหวัด: <strong>${params.data.count} จังหวัด</strong></div>
          <div>นักท่องเที่ยว: <strong>${formatNumber(params.data.tourists)} คน</strong></div>`;
      }
    },
    series: [
      {
        name: "กลุ่มเมือง",
        type: "pie",
        radius: ["32%", "68%"],
        center: ["50%", "58%"],
        roseType: "radius",
        itemStyle: {
          borderRadius: 6,
          borderColor: c.borderColor,
          borderWidth: 2
        },
        data: tierData,
        label: {
          color: c.textColor,
          fontFamily: "Prompt",
          fontSize: 10,
          formatter: "{b}"
        }
      }
    ]
  };

  rfmChartInstance.setOption(option);
}

// 1.4 REGIONAL DISTRIBUTION (DONUT CHART)
function initRegionDonutChart() {
  const chartDom = document.getElementById("fulfillment-chart");
  if (!chartDom) return;
  if (!fulfillmentChartInstance) {
    fulfillmentChartInstance = echarts.init(chartDom);
  }

  const c = getChartColors();
  const regionColors = {
    "ภาคกลาง": "#2563eb",
    "ภาคใต้": "#0284c7",
    "ภาคตะวันออก": "#7c3aed",
    "ภาคเหนือ": "#059669",
    "ภาคตะวันออกเฉียงเหนือ": "#d97706"
  };

  const option = {
    backgroundColor: "transparent",
    title: {
      text: "สัดส่วนรายได้ 5 ภูมิภาค",
      left: "center",
      top: "4%",
      textStyle: { color: c.titleColor, fontFamily: "Prompt", fontSize: 13, fontWeight: "600" }
    },
    tooltip: {
      trigger: "item",
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      borderWidth: 1,
      extraCssText: "box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px;",
      textStyle: { color: c.tooltipText, fontFamily: "Prompt" },
      formatter: "{b}: <strong>{d}%</strong> (${c} พันล้านบาท)"
    },
    series: [
      {
        name: "ภูมิภาค",
        type: "pie",
        radius: ["40%", "65%"],
        center: ["50%", "58%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 4,
          borderColor: c.borderColor,
          borderWidth: 2
        },
        label: {
          show: true,
          position: "outside",
          formatter: "{b}\n{d}%",
          color: c.textColor,
          fontSize: 9,
          fontFamily: "Prompt"
        },
        data: RAW_DATA.regions.map(r => ({
          name: r.name,
          value: (r.revenue_all / 1e9).toFixed(1),
          itemStyle: { color: regionColors[r.name] || "#2563eb" }
        }))
      }
    ]
  };

  fulfillmentChartInstance.setOption(option);
}

// ==========================================
// 2. GEOGRAPHICAL THAILAND MAP VISUALIZATION (GOOGLE MAPS / LEAFLET STYLE)
// ==========================================
let regionLeafletMap = null;
let regionGeoLayer = null;

async function renderGeoMap() {
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

  const geoData = await getThailandGeoJSON();
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
}

function selectRegion(regionId) {
  const selectElem = document.getElementById("region-filter");
  if (currentFilter.region === regionId) {
    currentFilter.region = "all";
    if (selectElem) selectElem.value = "all";
  } else {
    currentFilter.region = regionId;
    if (selectElem) selectElem.value = regionId;
  }
  applyFilters();
}

// ==========================================
// 3. FILTERING & INTERACTION LOGIC
// ==========================================
function applyFilters() {
  const { year, region, tier } = currentFilter;

  // Filter provinces list
  let filteredProvinces = RAW_DATA.provinces.filter(p => {
    if (region !== "all" && p.region_id !== region) return false;
    if (tier !== "all" && !p.tier.startsWith(tier)) return false;
    return true;
  });

  // Filter trends by year
  let filteredTrends = RAW_DATA.monthlyTrends.filter(t => {
    if (year !== "all" && t.year !== year) return false;
    return true;
  });

  // Calculate dynamic KPIs
  let totalRev = 0;
  let totalTourists = 0;
  let totalForeignRev = 0;
  let avgOccupancy = 0;

  if (year !== "all") {
    let yr = RAW_DATA.yearlySummary.find(y => y.year === year);
    if (yr) {
      totalRev = yr.revenue_all;
      totalTourists = yr.no_tourist_all;
      totalForeignRev = yr.revenue_foreign;
      avgOccupancy = yr.occupancy_rate;
    }
  } else {
    totalRev = filteredProvinces.reduce((acc, p) => acc + p.revenue_all, 0);
    totalTourists = filteredProvinces.reduce((acc, p) => acc + p.no_tourist_all, 0);
    totalForeignRev = filteredProvinces.reduce((acc, p) => acc + p.revenue_foreign, 0);
    avgOccupancy = (filteredProvinces.reduce((acc, p) => acc + p.occupancy_rate, 0) / (filteredProvinces.length || 1)).toFixed(1);
  }

  const spendPerHead = Math.round(totalRev / (totalTourists || 1));
  const foreignPct = ((totalForeignRev / (totalRev || 1)) * 100).toFixed(1);

  // Update KPI Cards
  document.getElementById("kpi-revenue").textContent = formatCurrency(totalRev);
  document.getElementById("kpi-tourists").textContent = formatNumber(totalTourists);
  document.getElementById("kpi-spend").textContent = formatCurrency(spendPerHead);
  document.getElementById("kpi-foreign-share").textContent = `${foreignPct}%`;
  document.getElementById("kpi-occupancy").textContent = `${avgOccupancy}%`;

  // Update label
  let yrLabel = year === "all" ? "2562-2566" : `ปี ${parseInt(year) + 543}`;
  let regLabel = region === "all" ? "ทั่วประเทศ" : (RAW_DATA.regions.find(r => r.id === region)?.name || region);
  document.getElementById("current-filter-label").textContent = `${yrLabel} • ${regLabel}`;

  // Update SVG highlight
  document.querySelectorAll(".region-shape").forEach(shape => {
    if (region === "all" || shape.getAttribute("data-region") === region) {
      shape.classList.toggle("active", region !== "all");
    } else {
      shape.classList.remove("active");
    }
  });

  document.querySelectorAll(".region-rank-item").forEach(item => {
    item.classList.toggle("active", item.getAttribute("data-region") === region);
  });

  // Re-render charts
  initTrendChart(filteredTrends);
  initTopProvincesComparisonChart(filteredProvinces);
  renderTable(filteredProvinces);
}

// ==========================================
// 4. DATA TABLE RENDERING (77 PROVINCES)
// ==========================================
function renderTable(provinces) {
  const tbody = document.getElementById("provinces-table-body");
  if (!tbody) return;

  if (provinces.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--text-muted);">ไม่พบข้อมูลตามเงื่อนไขที่ค้นหา</td></tr>`;
    return;
  }

  tbody.innerHTML = provinces.map((p, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${p.name}</strong> <span style="font-size:11px;color:var(--text-muted);">(${p.name_en})</span></td>
      <td><span class="table-tag ${p.region_id}">${p.region_name}</span></td>
      <td><span style="font-size:11px;color:var(--text-secondary);">${p.tier}</span></td>
      <td><strong>${formatCurrency(p.revenue_all)}</strong></td>
      <td><span style="color:${p.foreign_share > 50 ? '#d97706' : '#2563eb'};font-weight:600;">${p.foreign_share}%</span></td>
      <td>${formatNumber(p.no_tourist_all)}</td>
      <td>฿${p.spend_per_head.toLocaleString()}</td>
      <td><span style="color:#059669;font-weight:600;">${p.occupancy_rate}%</span></td>
      <td><strong>${p.share}</strong></td>
    </tr>
  `).join("");
}

// ==========================================
// 5. DATA STORYTELLING SYSTEM
// ==========================================
function updateStorytellingModal(stepIndex) {
  const slides = RAW_DATA.storytellingSlides;
  if (stepIndex < 0) stepIndex = 0;
  if (stepIndex >= slides.length) stepIndex = slides.length - 1;
  currentStoryStep = stepIndex;

  const slide = slides[stepIndex];

  document.getElementById("story-title").innerHTML = `${slide.icon} ${slide.title}`;
  document.getElementById("story-subtitle").textContent = slide.subtitle;
  document.getElementById("story-highlight-metric").textContent = slide.highlightMetric;
  document.getElementById("story-highlight-label").textContent = slide.highlightLabel;
  document.getElementById("story-narrative-text").innerHTML = slide.content;
  document.getElementById("story-rec-text").textContent = slide.recommendation;

  // Update Stepper Chips
  const stepper = document.getElementById("story-stepper");
  stepper.innerHTML = slides.map((s, idx) => `
    <div class="step-chip ${idx === stepIndex ? 'active' : ''}" data-step="${idx}">
      บทที่ ${idx + 1}
    </div>
  `).join("");

  stepper.querySelectorAll(".step-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      updateStorytellingModal(parseInt(chip.getAttribute("data-step")));
    });
  });

  // Update Footer buttons & indicator
  document.getElementById("story-page-indicator").textContent = `บทที่ ${stepIndex + 1} จาก ${slides.length}`;
  document.getElementById("story-prev-btn").disabled = stepIndex === 0;
  document.getElementById("story-next-btn").textContent = stepIndex === slides.length - 1 ? "เสร็จสิ้น" : "ถัดไป »";
}

// ==========================================
// 6. EVENT LISTENERS & MODALS
// ==========================================
function setupEventListeners() {
  // Theme Toggle Button
  document.getElementById("theme-toggle-btn")?.addEventListener("click", () => {
    toggleTheme();
  });

  // Year filter
  document.getElementById("year-filter")?.addEventListener("change", (e) => {
    currentFilter.year = e.target.value;
    applyFilters();
  });

  // Region filter
  document.getElementById("region-filter")?.addEventListener("change", (e) => {
    currentFilter.region = e.target.value;
    applyFilters();
  });

  // Tier filter
  document.getElementById("tier-filter")?.addEventListener("change", (e) => {
    currentFilter.tier = e.target.value;
    applyFilters();
  });

  // Reset Filters
  document.getElementById("reset-filter-btn")?.addEventListener("click", () => {
    currentFilter = { year: "all", region: "all", tier: "all" };
    document.getElementById("year-filter").value = "all";
    document.getElementById("region-filter").value = "all";
    document.getElementById("tier-filter").value = "all";
    document.getElementById("table-search-input").value = "";
    applyFilters();
  });

  // Search input
  document.getElementById("table-search-input")?.addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();
    const filtered = RAW_DATA.provinces.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.name_en.toLowerCase().includes(query) ||
      p.region_name.toLowerCase().includes(query)
    );
    renderTable(filtered);
  });

  // Storytelling Modal Toggle
  const storyModal = document.getElementById("storytelling-modal");
  document.getElementById("storytelling-btn")?.addEventListener("click", () => {
    storyModal.classList.add("show");
    updateStorytellingModal(0);
  });

  document.getElementById("story-close-btn")?.addEventListener("click", () => {
    storyModal.classList.remove("show");
  });

  document.getElementById("story-prev-btn")?.addEventListener("click", () => {
    if (currentStoryStep > 0) {
      updateStorytellingModal(currentStoryStep - 1);
    }
  });

  document.getElementById("story-next-btn")?.addEventListener("click", () => {
    if (currentStoryStep < RAW_DATA.storytellingSlides.length - 1) {
      updateStorytellingModal(currentStoryStep + 1);
    } else {
      storyModal.classList.remove("show");
    }
  });

  // Rubric Modal Toggle
  const rubricModal = document.getElementById("rubric-modal");
  document.getElementById("rubric-btn")?.addEventListener("click", () => {
    rubricModal.classList.add("show");
    if (window.lucide) window.lucide.createIcons();
  });
  document.getElementById("rubric-close-btn")?.addEventListener("click", () => {
    rubricModal.classList.remove("show");
  });
  document.getElementById("rubric-ok-btn")?.addEventListener("click", () => {
    rubricModal.classList.remove("show");
  });

  // Close modals on outside click
  [storyModal, rubricModal].forEach(modal => {
    modal?.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("show");
      }
    });
  });

  // Export CSV
  document.getElementById("export-btn")?.addEventListener("click", () => {
    exportToCsv();
  });

  // F12 Keyboard Shortcut: Data Storytelling
  window.addEventListener("keydown", (e) => {
    if (e.key === "F12" || e.keyCode === 123) {
      e.preventDefault();
      const modal = document.getElementById("storytelling-modal");
      if (modal) {
        if (modal.classList.contains("show")) {
          modal.classList.remove("show");
        } else {
          modal.classList.add("show");
          updateStorytellingModal(0);
          if (window.lucide) window.lucide.createIcons();
        }
      }
    }
  });

  // 144 FPS View Mode Switcher
  setupViewSwitcher();
}

// 7. CSV EXPORT UTILITY (REAL MOTS DATA)
function exportToCsv() {
  let csvContent = "\uFEFFลำดับ,จังหวัด(ไทย),Province(EN),ภูมิภาค,กลุ่มศักยภาพ(Tier),รายได้รวม(บาท),รายได้คนไทย(บาท),รายได้ต่างชาติ(บาท),สัดส่วนต่างชาติ(%),จำนวนนักท่องเที่ยว(คน),ค่าใช้จ่ายเฉลี่ย(บาท/คน),อัตราเข้าพัก(%),ส่วนแบ่งรายได้(%)\n";

  RAW_DATA.provinces.forEach((p, i) => {
    csvContent += `${i + 1},"${p.name}","${p.name_en}","${p.region_name}","${p.tier}",${p.revenue_all},${p.revenue_thai},${p.revenue_foreign},${p.foreign_share},${p.no_tourist_all},${p.spend_per_head},${p.occupancy_rate},"${p.share}"\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Thailand_Domestic_Tourism_MOTS_Report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==========================================
// 8. 3D THREE.JS WEBGL ENGINE (NASA EYES ON THE SOLAR SYSTEM // THAILAND)
// ==========================================
let focusThailandAnim = null;

function initThreeJSBackground() {
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

function runPreloader() {
  const preloader = document.getElementById("hex-preloader");
  const barFill = document.getElementById("stream-bar-fill");
  const percentVal = document.getElementById("stream-percent-val");
  const statusText = document.getElementById("stream-status-text");
  const actionsBox = document.getElementById("preloader-actions");
  const enterBtn = document.getElementById("btn-enter-presentation");

  if (!preloader || !barFill || !percentVal) return;

  // Reset state
  document.body.classList.add("loading-active");
  preloader.classList.remove("revealed", "preloader-hidden");
  if (actionsBox) actionsBox.classList.remove("ready");
  barFill.style.width = "0%";
  percentVal.textContent = "0%";

  const stages = [
    { pct: 15, msg: "INITIALIZING THREE.JS 3D WEBGL GRAPHICS..." },
    { pct: 35, msg: "STREAMING MOTS 30,800 TOURISM RECORDS (2562-2566)..." },
    { pct: 60, msg: "CALCULATING 50-MONTH PROVINCIAL TIER MATRICES..." },
    { pct: 85, msg: "CALIBRATING 5-REGION GEOGRAPHIC VISUALIZATIONS..." },
    { pct: 95, msg: "BUILDING INTERACTIVE DATA STORYTELLING PIPELINE..." },
    { pct: 100, msg: "SYSTEM READY // G10 GROUP PRESENTATION ONLINE" }
  ];

  let currentPercent = 0;
  if (preloaderTimer) clearInterval(preloaderTimer);

  preloaderTimer = setInterval(() => {
    // Variable step increment for natural streaming telemetry
    const step = Math.max(1, Math.floor(Math.random() * 4) + 1);
    currentPercent = Math.min(100, currentPercent + step);

    barFill.style.width = currentPercent + "%";
    percentVal.textContent = currentPercent + "%";

    for (let i = stages.length - 1; i >= 0; i--) {
      if (currentPercent >= stages[i].pct) {
        if (statusText) statusText.textContent = stages[i].msg;
        break;
      }
    }

    if (currentPercent >= 100) {
      clearInterval(preloaderTimer);
      if (actionsBox) actionsBox.classList.add("ready");
      if (window.lucide) window.lucide.createIcons();
      if (statusText) statusText.textContent = "DATA READY // กรุณากดยืนยันเพื่อเข้าสู่การนำเสนอ (CLICK ENTER TO PROCEED)";

      // Do NOT auto dismiss - wait for user click confirmation
      if (enterBtn) {
        enterBtn.onclick = () => {
          finishPreloader();
        };
      }
    }
  }, 26);

  function finishPreloader() {
    preloader.classList.add("revealed");
    setTimeout(() => {
      preloader.classList.add("preloader-hidden");
      document.body.classList.remove("loading-active");
      resizeAllCharts();
      invalidateAllLeafletMaps();
    }, 600);
  }
}

// ==========================================
// 10. 3D CARD PERSPECTIVE TILT & DYNAMIC GLARE
// ==========================================
function init3DCardTilt() {
  // 3D tilt and mouse glare disabled as requested:
  // Card hover is now a subtle smooth scale/zoom via CSS without tilt distortion.
}

function initCustomCursor() {
  // Cursor is rendered via native GPU-accelerated SVG in CSS for instant 144Hz+ response
}

// ==========================================
// 12. NASA RIGHT DOCK & HUD PANEL SWITCHER (144 FPS)
// ==========================================

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

async function getThailandGeoJSON() {
  if (window.THAILAND_GEOJSON && window.THAILAND_GEOJSON.features) {
    return window.THAILAND_GEOJSON;
  }
  try {
    const res = await fetch('thailand.json?v=20261004_v3');
    const data = await res.json();
    window.THAILAND_GEOJSON = data;
    return data;
  } catch (err) {
    console.error("Error loading GeoJSON:", err);
    return null;
  }
}

function invalidateAllLeafletMaps() {
  setTimeout(() => {
    if (compareMapA) {
      compareMapA.invalidateSize();
      compareMapA.fitBounds([[5.6, 97.3], [20.5, 105.7]], { padding: [10, 10] });
    }
    if (compareMapB) {
      compareMapB.invalidateSize();
      compareMapB.fitBounds([[5.6, 97.3], [20.5, 105.7]], { padding: [10, 10] });
    }
    if (regionLeafletMap) {
      regionLeafletMap.invalidateSize();
      regionLeafletMap.fitBounds([[5.6, 97.3], [20.5, 105.7]], { padding: [10, 10] });
    }
  }, 100);
}


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

  async function updateDualMaps() {
    const yearA = yearASel ? yearASel.value : "2019";
    const yearB = yearBSel ? yearBSel.value : "2022";
    const metric = metricSel ? metricSel.value : "revenue_all";

    updateNationalDiffTelemetry(yearA, yearB);
    await renderChoropleth(compareMapA, yearA, metric, "A");
    await renderChoropleth(compareMapB, yearB, metric, "B");
    invalidateAllLeafletMaps();
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

  async function renderChoropleth(mapInstance, year, metric, side) {
    const geoData = await getThailandGeoJSON();
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
        const yearThai = year === "2019" ? "2562" : year === "2020" ? "2563" : year === "2021" ? "2564" : year === "2022" ? "2565" : "2566";

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

function setupViewSwitcher() {
  const dockButtons = document.querySelectorAll(".dock-btn[data-view]");
  const hudContainer = document.getElementById("nasa-hud-panel-container");
  const hudTitle = document.getElementById("hud-panel-active-title");
  const hudCloseBtn = document.getElementById("hud-panel-close-btn");

  const secTrend = document.getElementById("sec-trend");
  const secGeo = document.getElementById("sec-geo");
  const secComp = document.getElementById("sec-comparison");
  const secTiers = document.getElementById("sec-tiers");
  const secTable = document.getElementById("sec-table");
  const secKpis = document.getElementById("sec-kpis");

  const allSections = [secTrend, secGeo, secComp, secTiers, secTable];

  function setActiveView(view) {
    dockButtons.forEach(b => {
      if (b.getAttribute("data-view") === view) {
        b.classList.add("active");
      } else {
        b.classList.remove("active");
      }
    });

    if (view === "orbit") {
      // 3D Full Orbit Mode: Minimize HUD panels for full-screen exploration
      if (hudContainer) hudContainer.classList.add("hud-collapsed");
      if (window.focusThailand) window.focusThailand();
      return;
    }

    // Open HUD panel drawer
    if (hudContainer) hudContainer.classList.remove("hud-collapsed");

    // Reset visibility & full-width
    allSections.forEach(s => {
      if (s) s.classList.remove("view-hidden", "view-full-width");
    });
    if (secKpis) secKpis.classList.remove("view-hidden");

    if (view === "dual-compare") {
      const secDual = document.getElementById("sec-dual-compare");
      secDual?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        compareMapA?.invalidateSize();
        compareMapB?.invalidateSize();
      }, 150);
      return;
    }

    if (view === "overview") {
      if (hudTitle) hudTitle.textContent = "ภาพรวมตัวชี้วัดเศรษฐกิจท่องเที่ยวไทย (Overview KPIs)";
      // Show all normally
    } else if (view === "trend") {
      if (hudTitle) hudTitle.textContent = "แนวโน้มรายได้การท่องเที่ยวรายเดือน 50 เดือน (CLO1: Time-Series Trends)";
      allSections.forEach(s => s?.classList.add("view-hidden"));
      secTrend?.classList.remove("view-hidden");
      secTrend?.classList.add("view-full-width");
    } else if (view === "geo") {
      if (hudTitle) hudTitle.textContent = "แผนที่สถิติการท่องเที่ยว 5 ภูมิภาค (CLO1: Geographical Visualization)";
      allSections.forEach(s => s?.classList.add("view-hidden"));
      secGeo?.classList.remove("view-hidden");
      secGeo?.classList.add("view-full-width");
      setTimeout(() => {
        regionLeafletMap?.invalidateSize();
      }, 150);
    } else if (view === "rank") {
      if (hudTitle) hudTitle.textContent = "เปรียบเทียบ 10 อันดับจังหวัด & การจัดกลุ่มเมือง (CLO1: Rankings & Tiers)";
      allSections.forEach(s => s?.classList.add("view-hidden"));
      secComp?.classList.remove("view-hidden");
      secTiers?.classList.remove("view-hidden");
    } else if (view === "table") {
      if (hudTitle) hudTitle.textContent = "ฐานข้อมูลสถิติการท่องเที่ยว 77 จังหวัด (PLO4/PLO5: Official MOTS Dataset)";
      allSections.forEach(s => s?.classList.add("view-hidden"));
      secTable?.classList.remove("view-hidden");
      secTable?.classList.add("view-full-width");
    }

    // Smooth scroll to top of panel container
    hudContainer?.scrollIntoView({ behavior: "smooth", block: "start" });

    // Instant chart resize
    setTimeout(() => {
      resizeAllCharts();
    }, 70);
  }

  // Right Dock button clicks
  dockButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const view = btn.getAttribute("data-view");
      setActiveView(view);
    });
  });

  // Minimize HUD to 3D Orbit
  hudCloseBtn?.addEventListener("click", () => {
    setActiveView("dual-compare");
  });

  // Telemetry HUD card buttons
  document.getElementById("btn-focus-thailand")?.addEventListener("click", () => {
    setActiveView("dual-compare");
    if (window.focusThailand) window.focusThailand();
  });

  document.getElementById("btn-open-overview")?.addEventListener("click", () => {
    setActiveView("overview");
  });

  // Toggle minimize/expand telemetry card
  document.getElementById("btn-toggle-telemetry")?.addEventListener("click", () => {
    const hudCard = document.getElementById("thailand-telemetry-hud");
    hudCard?.classList.toggle("collapsed");
  });

  // Left Dock Storytelling button
  document.getElementById("dock-btn-story")?.addEventListener("click", () => {
    const modal = document.getElementById("storytelling-modal");
    if (modal) {
      modal.classList.add("show");
      updateStorytellingModal(0);
      if (window.lucide) window.lucide.createIcons();
    }
  });

  // Default to 3D Orbit view so space globe is 100% visible and unblocked
  setActiveView("dual-compare");
}

// ==========================================
// 13. CHART RESIZE UTILITY
// ==========================================
function resizeAllCharts() {
  trendChartInstance?.resize();
  categoryChartInstance?.resize();
  rfmChartInstance?.resize();
  fulfillmentChartInstance?.resize();
}

window.addEventListener("load", () => {
  setTimeout(() => {
    if (typeof invalidateAllLeafletMaps === "function") {
      invalidateAllLeafletMaps();
    }
  }, 300);
});


