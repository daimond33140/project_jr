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
  camera.position.set(0, 0, 22);

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // 8.1 PROCEDURAL HIGH-RES NASA EARTH TEXTURE WITH THAILAND HIGHLIGHTED
  function createEarthTexture() {
    const texCanvas = document.createElement("canvas");
    texCanvas.width = 2048;
    texCanvas.height = 1024;
    const ctx = texCanvas.getContext("2d");

    // Deep Cosmic Ocean
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, 1024);
    oceanGrad.addColorStop(0, "#020716");
    oceanGrad.addColorStop(0.5, "#04112c");
    oceanGrad.addColorStop(1, "#020716");
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, 2048, 1024);

    // Subtle Bathymetric Depth Lines
    ctx.strokeStyle = "rgba(0, 180, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let y = 80; y < 1024; y += 75) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(512, y + 25, 1024, y - 25, 2048, y);
      ctx.stroke();
    }

    // Latitude & Longitude Graticule Lines (NASA HUD Grid)
    ctx.strokeStyle = "rgba(0, 240, 255, 0.07)";
    ctx.lineWidth = 1;
    for (let lon = 0; lon <= 2048; lon += 128) {
      ctx.beginPath();
      ctx.moveTo(lon, 0);
      ctx.lineTo(lon, 1024);
      ctx.stroke();
    }
    for (let lat = 0; lat <= 1024; lat += 128) {
      ctx.beginPath();
      ctx.moveTo(0, lat);
      ctx.lineTo(2048, lat);
      ctx.stroke();
    }

    // Equator & Prime Meridian Emphasis
    ctx.strokeStyle = "rgba(0, 240, 255, 0.15)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 512); // Equator
    ctx.lineTo(2048, 512);
    ctx.stroke();

    // Helper: Map Lat/Lon to Canvas X/Y
    // lon: -180 to +180 -> x: 0 to 2048
    // lat: +90 to -90 -> y: 0 to 1024
    function mapCoords(lon, lat) {
      return {
        x: ((lon + 180) / 360) * 2048,
        y: ((90 - lat) / 180) * 1024
      };
    }

    // World Continents (Stylized NASA Vector Landmasses)
    ctx.fillStyle = "#0c1f38";
    ctx.strokeStyle = "rgba(56, 189, 248, 0.28)";
    ctx.lineWidth = 1.5;

    function drawPoly(coords, fill = true) {
      if (coords.length < 3) return;
      ctx.beginPath();
      const p0 = mapCoords(coords[0][0], coords[0][1]);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < coords.length; i++) {
        const p = mapCoords(coords[i][0], coords[i][1]);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      if (fill) ctx.fill();
      ctx.stroke();
    }

    // Eurasia & Indochina Landmass
    drawPoly([
      [-10, 36], [0, 52], [30, 70], [80, 72], [140, 72], [170, 65],
      [140, 35], [120, 25], [110, 20], [105, 10], [100, 2], [95, 15],
      [80, 12], [70, 25], [60, 22], [50, 28], [40, 15], [35, 32],
      [25, 35], [15, 40], [0, 42], [-5, 36]
    ]);

    // Africa
    drawPoly([
      [-15, 30], [30, 32], [50, 12], [42, -10], [30, -32], [18, -34],
      [12, -15], [0, 5], [-15, 12], [-18, 20]
    ]);

    // Americas
    drawPoly([
      [-160, 70], [-100, 72], [-60, 60], [-75, 35], [-80, 25], [-100, 20],
      [-120, 35], [-130, 50], [-160, 60]
    ]);
    drawPoly([
      [-80, 10], [-50, 0], [-35, -5], [-40, -22], [-65, -55], [-75, -50],
      [-70, -20], [-80, 0]
    ]);

    // Australia
    drawPoly([
      [115, -20], [140, -12], [152, -25], [148, -38], [130, -38], [115, -34]
    ]);

    // ==========================================
    // THAILAND SPECIAL ILLUMINATION & TELEMETRY BEACON
    // Coordinates: Lat 5.6° - 20.5° N, Lon 97.3° - 105.7° E
    // ==========================================
    // Thailand High-Resolution Contour Polygon
    const thaiPolygon = [
      [99.8, 20.4], [100.5, 20.1], [101.2, 19.6], [101.0, 18.5], [101.8, 17.5],
      [102.8, 17.8], [104.5, 17.5], [105.5, 15.5], [105.2, 14.3], [103.0, 14.4],
      [102.5, 12.5], [101.8, 12.6], [100.9, 13.3], [100.5, 13.5], [100.0, 13.2],
      [99.9, 11.8], [99.2, 10.0], [100.2, 7.2], [101.2, 6.5], [102.1, 6.2],
      [101.0, 5.8], [100.1, 6.5], [99.5, 7.5], [98.5, 8.2], [98.6, 9.8],
      [99.0, 11.2], [99.2, 12.5], [98.8, 14.0], [98.2, 15.2], [97.5, 18.0],
      [98.5, 19.8], [99.8, 20.4]
    ];

    // Thailand Luminous Ambient Glow
    const thaiCenter = mapCoords(100.5, 14.5);
    const radGlow = ctx.createRadialGradient(thaiCenter.x, thaiCenter.y, 5, thaiCenter.x, thaiCenter.y, 65);
    radGlow.addColorStop(0, "rgba(0, 240, 255, 0.85)");
    radGlow.addColorStop(0.35, "rgba(16, 185, 129, 0.6)");
    radGlow.addColorStop(0.7, "rgba(0, 180, 255, 0.25)");
    radGlow.addColorStop(1, "rgba(0, 240, 255, 0)");
    ctx.fillStyle = radGlow;
    ctx.beginPath();
    ctx.arc(thaiCenter.x, thaiCenter.y, 65, 0, Math.PI * 2);
    ctx.fill();

    // Fill Thailand territory in vibrant emerald-cyan
    ctx.fillStyle = "rgba(0, 240, 255, 0.55)";
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 2.5;
    drawPoly(thaiPolygon, true);

    // Pulsing Radar Rings over Bangkok
    const bkk = mapCoords(100.5, 13.75);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bkk.x, bkk.y, 14, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(0, 240, 255, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bkk.x, bkk.y, 28, 0, Math.PI * 2);
    ctx.stroke();

    // Hotspot City Lights in Thailand
    const thaiCities = [
      { name: "BANGKOK", lon: 100.5, lat: 13.75, r: 4 },
      { name: "PHUKET", lon: 98.39, lat: 7.88, r: 3 },
      { name: "CHIANG MAI", lon: 98.98, lat: 18.79, r: 3 },
      { name: "PATTAYA", lon: 100.88, lat: 12.92, r: 2.5 },
      { name: "SAMUI", lon: 99.98, lat: 9.53, r: 2.5 }
    ];

    thaiCities.forEach(city => {
      const p = mapCoords(city.lon, city.lat);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, city.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(0, 240, 255, 0.9)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, city.r + 3, 0, Math.PI * 2);
      ctx.stroke();
    });

    const tex = new THREE.CanvasTexture(texCanvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  // 8.2 SCENE OBJECTS: EARTH GROUP
  const earthGroup = new THREE.Group();
  scene.add(earthGroup);

  const EARTH_RADIUS = 7.0;

  // Earth Globe Mesh
  const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
  const earthMat = new THREE.MeshPhongMaterial({
    map: createEarthTexture(),
    bumpScale: 0.05,
    specular: new THREE.Color(0x0284c7),
    shininess: 12
  });
  const earthMesh = new THREE.Mesh(earthGeo, earthMat);
  earthGroup.add(earthMesh);

  // Atmospheric Fresnel Rim Glow Sphere
  const atmoGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.035, 48, 48);
  const atmoMat = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.2);
        gl_FragColor = vec4(0.0, 0.94, 1.0, 1.0) * intensity * 1.4;
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true
  });
  const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
  earthGroup.add(atmoMesh);

  // Helper: Convert Lat/Lon to 3D Vector3 on Sphere
  function latLonToVec3(lat, lon, r) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -(r * Math.sin(phi) * Math.cos(theta)),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
  }

  // 8.3 THAILAND 3D BEACON & RADAR RINGS IN ORBIT
  const bkkVec = latLonToVec3(13.75, 100.5, EARTH_RADIUS);
  const bkkNorm = bkkVec.clone().normalize();

  // Vertical Laser Beacon shooting from Bangkok into orbit
  const beaconLength = 3.6;
  const beaconGeo = new THREE.CylinderGeometry(0.04, 0.12, beaconLength, 16);
  beaconGeo.translate(0, beaconLength / 2, 0);
  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.85
  });
  const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
  beaconMesh.position.copy(bkkVec);
  beaconMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bkkNorm);
  earthGroup.add(beaconMesh);

  // Concentric Radar Target Rings at Thailand
  const ringGeo1 = new THREE.RingGeometry(0.25, 0.32, 32);
  const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
  const ringMesh1 = new THREE.Mesh(ringGeo1, ringMat1);
  ringMesh1.position.copy(bkkVec.clone().add(bkkNorm.clone().multiplyScalar(0.08)));
  ringMesh1.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), bkkNorm);
  earthGroup.add(ringMesh1);

  const ringGeo2 = new THREE.RingGeometry(0.55, 0.62, 32);
  const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
  const ringMesh2 = new THREE.Mesh(ringGeo2, ringMat2);
  ringMesh2.position.copy(bkkVec.clone().add(bkkNorm.clone().multiplyScalar(0.12)));
  ringMesh2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), bkkNorm);
  earthGroup.add(ringMesh2);

  // Planetary Orbit Trajectory Rings (NASA Eyes Aesthetic)
  const orbitGroup = new THREE.Group();
  scene.add(orbitGroup);

  const orbitCurve1 = new THREE.EllipseCurve(0, 0, 11.5, 11.5, 0, 2 * Math.PI, false, 0);
  const orbitPts1 = orbitCurve1.getPoints(90);
  const orbitGeo1 = new THREE.BufferGeometry().setFromPoints(orbitPts1);
  const orbitMat1 = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.18 });
  const orbitLine1 = new THREE.Line(orbitGeo1, orbitMat1);
  orbitLine1.rotation.x = Math.PI / 2.8;
  orbitLine1.rotation.y = -Math.PI / 6;
  orbitGroup.add(orbitLine1);

  const orbitCurve2 = new THREE.EllipseCurve(0, 0, 14.8, 14.8, 0, 2 * Math.PI, false, 0);
  const orbitPts2 = orbitCurve2.getPoints(120);
  const orbitGeo2 = new THREE.BufferGeometry().setFromPoints(orbitPts2);
  const orbitMat2 = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.12 });
  const orbitLine2 = new THREE.Line(orbitGeo2, orbitMat2);
  orbitLine2.rotation.x = -Math.PI / 3.2;
  orbitLine2.rotation.y = Math.PI / 5;
  orbitGroup.add(orbitLine2);

  // 8.4 STARFIELD (SMOOTH ROUND STARS // NO SQUARE DOTS)
  const starGeo = new THREE.BufferGeometry();
  const starCount = 380;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i += 3) {
    const r = 80 + Math.random() * 80;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    starPos[i] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPos[i + 2] = r * Math.cos(phi);
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));

  // Soft circle sprite canvas for stars
  const starCanvas = document.createElement("canvas");
  starCanvas.width = 32;
  starCanvas.height = 32;
  const sCtx = starCanvas.getContext("2d");
  const sGrad = sCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
  sGrad.addColorStop(0, "rgba(255, 255, 255, 1)");
  sGrad.addColorStop(0.3, "rgba(147, 197, 253, 0.8)");
  sGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  sCtx.fillStyle = sGrad;
  sCtx.fillRect(0, 0, 32, 32);
  const starTex = new THREE.CanvasTexture(starCanvas);

  const starMat = new THREE.PointsMaterial({
    size: 1.8,
    map: starTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const starField = new THREE.Points(starGeo, starMat);
  scene.add(starField);

  // 8.5 LIGHTING (SUNLIGHT IN SPACE)
  const ambientLight = new THREE.AmbientLight(0x1e293b, 1.2);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffffff, 2.4);
  sunLight.position.set(25, 12, 20);
  scene.add(sunLight);

  // 8.6 INITIAL ORIENTATION: LOCK DIRECTLY ONTO THAILAND
  // Thailand coordinates: Lat 13.75° N, Lon 100.5° E
  const targetRotation = {
    x: 0.12,
    y: -Math.PI * 0.52
  };
  earthGroup.rotation.x = targetRotation.x;
  earthGroup.rotation.y = targetRotation.y;

  // 8.7 ORBIT CONTROLS (MOUSE DRAG TO ROTATE & WHEEL TO ZOOM)
  let isDragging = false;
  let previousMousePos = { x: 0, y: 0 };
  let cameraTargetZ = 22;
  let autoRotate = true;

  canvas.addEventListener("pointerdown", (e) => {
    isDragging = true;
    autoRotate = false;
    previousMousePos = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - previousMousePos.x;
    const deltaY = e.clientY - previousMousePos.y;

    targetRotation.y += deltaX * 0.005;
    targetRotation.x = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, targetRotation.x + deltaY * 0.005));

    previousMousePos = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener("pointerup", () => {
    isDragging = false;
  });

  window.addEventListener("wheel", (e) => {
    cameraTargetZ = Math.max(12, Math.min(32, cameraTargetZ + e.deltaY * 0.015));
  }, { passive: true });

  // Focus on Thailand function
  window.focusThailand = function() {
    targetRotation.x = 0.12;
    targetRotation.y = -Math.PI * 0.52;
    cameraTargetZ = 18;
    autoRotate = false;
  };

  // Window Resize
  let resizeTimeout = null;
  window.addEventListener("resize", () => {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      resizeAllCharts();
    }, 120);
  }, { passive: true });

  // 8.8 144 FPS RENDER LOOP
  let clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    // Gentle auto-idle drift when user is not dragging
    if (autoRotate && !isDragging) {
      targetRotation.y += 0.0012;
    }

    // Smooth inertia interpolation
    earthGroup.rotation.x += (targetRotation.x - earthGroup.rotation.x) * 0.08;
    earthGroup.rotation.y += (targetRotation.y - earthGroup.rotation.y) * 0.08;

    // Smooth camera zoom
    camera.position.z += (cameraTargetZ - camera.position.z) * 0.08;

    // Radar rings pulsating scale
    const pulse1 = 1 + Math.sin(time * 3.5) * 0.12;
    ringMesh1.scale.set(pulse1, pulse1, pulse1);
    const pulse2 = 1 + Math.cos(time * 3.0) * 0.15;
    ringMesh2.scale.set(pulse2, pulse2, pulse2);

    // Subtle starfield & orbital drift
    orbitGroup.rotation.z += 0.0004;
    starField.rotation.y += 0.0001;

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
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
    }, 900);
  }
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
// 11. NEON CURSOR INITIALIZER (HARDWARE-ACCELERATED)
// ==========================================
function initCustomCursor() {
  // Cursor is rendered via native GPU-accelerated SVG in CSS for instant 144Hz+ response
}

// ==========================================
// 12. NASA RIGHT DOCK & HUD PANEL SWITCHER (144 FPS)
// ==========================================
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
    setActiveView("orbit");
  });

  // Telemetry HUD card buttons
  document.getElementById("btn-focus-thailand")?.addEventListener("click", () => {
    setActiveView("orbit");
    if (window.focusThailand) window.focusThailand();
  });

  document.getElementById("btn-open-overview")?.addEventListener("click", () => {
    setActiveView("overview");
  });

  // Right Dock Storytelling button
  document.getElementById("dock-btn-story")?.addEventListener("click", () => {
    const modal = document.getElementById("storytelling-modal");
    if (modal) {
      modal.classList.add("show");
      updateStorytellingModal(0);
      if (window.lucide) window.lucide.createIcons();
    }
  });

  // Set default view to Overview on load
  setActiveView("overview");
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

