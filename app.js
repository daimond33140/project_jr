// ==========================================
// APP LOGIC & VISUALIZATION ENGINE (REAL MOTS TOURISM DATASET)
// สำหรับวิชา 01418325 ข้อมูลจินตทัศน์ (Data Visualization)
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
    title.textContent = `${prov.name} (${prov.region_name})\nรายได้รวม: ${formatCurrency(prov.revenue_all)}\nต่างชาติ: ${prov.foreign_share}%\nอัตราเข้าพัก: ${prov.occupancy_rate}%`;
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

  // Replay Presentation Intro
  document.getElementById("btn-replay-intro")?.addEventListener("click", () => {
    replayPresentationIntro();
  });
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
// 8. 3D THREE.JS WEBGL BACKGROUND (INSPIRED BY ZAJNO)
// ==========================================
function initThreeJSBackground() {
  const canvas = document.getElementById("webgl-3d-bg");
  if (!canvas || typeof THREE === "undefined") return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, -9, 24);

  const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // 3D Terrain Wave Plane
  const geom = new THREE.PlaneGeometry(75, 50, 52, 40);

  // Wireframe Mesh
  const wireMaterial = new THREE.MeshBasicMaterial({
    color: 0x0284c7,
    wireframe: true,
    transparent: true,
    opacity: 0.14
  });
  const wireMesh = new THREE.Mesh(geom, wireMaterial);
  wireMesh.rotation.x = -Math.PI / 2.5;
  wireMesh.position.y = -6;
  scene.add(wireMesh);

  // Particle Vertices (Points)
  const pointsMaterial = new THREE.PointsMaterial({
    color: 0x38bdf8,
    size: 0.18,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
  });
  const pointsMesh = new THREE.Points(geom, pointsMaterial);
  pointsMesh.rotation.x = -Math.PI / 2.5;
  pointsMesh.position.y = -6;
  scene.add(pointsMesh);

  // Floating 3D Geometric Accents
  const icoGeom = new THREE.IcosahedronGeometry(3.6, 1);
  const icoMat = new THREE.MeshBasicMaterial({
    color: 0x818cf8,
    wireframe: true,
    transparent: true,
    opacity: 0.22
  });
  const icosahedron = new THREE.Mesh(icoGeom, icoMat);
  icosahedron.position.set(24, 6, -8);
  scene.add(icosahedron);

  const octaGeom = new THREE.OctahedronGeometry(2.4, 0);
  const octaMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.28
  });
  const octahedron = new THREE.Mesh(octaGeom, octaMat);
  octahedron.position.set(-22, -2, -6);
  scene.add(octahedron);

  // Mouse Parallax coordinates
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  window.addEventListener("mousemove", (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  // Window Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    resizeAllCharts();
  });

  // Animation Loop
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    // Undulate wave vertices dynamically
    const p = geom.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i);
      const v = p.getY(i);
      const wave1 = Math.sin(u * 0.18 + elapsedTime * 1.1) * Math.cos(v * 0.22 + elapsedTime * 0.85) * 2.2;
      const wave2 = Math.sin(u * 0.07 + v * 0.09 + elapsedTime * 1.4) * 1.1;
      p.setZ(i, wave1 + wave2);
    }
    p.needsUpdate = true;

    // Rotate geometric shapes
    icosahedron.rotation.x = elapsedTime * 0.18;
    icosahedron.rotation.y = elapsedTime * 0.25;
    octahedron.rotation.y = -elapsedTime * 0.22;
    octahedron.rotation.z = elapsedTime * 0.14;

    // Smooth camera mouse parallax
    targetX += (mouseX * 3.5 - targetX) * 0.04;
    targetY += (mouseY * 2.2 - targetY) * 0.04;

    camera.position.x = targetX;
    camera.position.y = -9 + targetY;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  animate();
}

// ==========================================
// 9. PRELOADER & STREAMING BAR (HEXSYNCTH PRESENTATION)
// ==========================================
let preloaderTimer = null;

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
    { pct: 100, msg: "SYSTEM READY // HEXSYNCTH PRESENTATION ONLINE" }
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

      // Auto dismiss after 800ms or on click
      const autoDismiss = setTimeout(() => {
        finishPreloader();
      }, 850);

      if (enterBtn) {
        enterBtn.onclick = () => {
          clearTimeout(autoDismiss);
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
    }, 900);
  }
}

function replayPresentationIntro() {
  runPreloader();
}

// ==========================================
// 10. 3D CARD PERSPECTIVE TILT & DYNAMIC GLARE
// ==========================================
function init3DCardTilt() {
  const tiltCards = document.querySelectorAll("[data-tilt], .kpi-card, .chart-card, .stat-summary-card, .table-card");

  tiltCards.forEach(card => {
    // Ensure glare overlay exists
    if (!card.querySelector(".card-glare")) {
      const glare = document.createElement("div");
      glare.className = "card-glare";
      card.appendChild(glare);
    }

    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Restrict tilt angle to 5.5 degrees for elegant subtle perspective
      const rotX = -((y - centerY) / centerY) * 5.5;
      const rotY = ((x - centerX) / centerX) * 5.5;

      card.style.transform = `perspective(1100px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateZ(8px)`;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg) translateZ(0px)";
    });
  });
}

// ==========================================
// 11. CUSTOM MAGNETIC CURSOR ENGINE
// ==========================================
function initCustomCursor() {
  const dot = document.getElementById("custom-cursor-dot");
  const ring = document.getElementById("custom-cursor-ring");
  if (!dot || !ring) return;

  let mouseX = -100;
  let mouseY = -100;
  let ringX = -100;
  let ringY = -100;

  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
  });

  function renderCursor() {
    ringX += (mouseX - ringX) * 0.16;
    ringY += (mouseY - ringY) * 0.16;
    ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
    requestAnimationFrame(renderCursor);
  }
  requestAnimationFrame(renderCursor);

  // Magnetic hover states on buttons, links, cards, filters
  const hoverTargets = "button, a, select, input, .kpi-card, .btn, .map-region-btn, tr, .topic-tag, .btn-replay-intro, .btn-intro-replay";
  document.addEventListener("mouseover", (e) => {
    if (e.target.closest(hoverTargets)) {
      ring.classList.add("active");
    }
  });

  document.addEventListener("mouseout", (e) => {
    if (e.target.closest(hoverTargets)) {
      ring.classList.remove("active");
    }
  });
}

// ==========================================
// 12. CHART RESIZE UTILITY
// ==========================================
function resizeAllCharts() {
  trendChartInstance?.resize();
  categoryChartInstance?.resize();
  rfmChartInstance?.resize();
  fulfillmentChartInstance?.resize();
}

