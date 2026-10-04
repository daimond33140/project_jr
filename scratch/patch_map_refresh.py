with open("app.js", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add invalidateAllLeafletMaps and update finishPreloader
old_preloader = """  function finishPreloader() {
    preloader.classList.add("revealed");
    setTimeout(() => {
      preloader.classList.add("preloader-hidden");
      document.body.classList.remove("loading-active");
      resizeAllCharts();
    }, 900);
  }"""

new_preloader = """  function finishPreloader() {
    preloader.classList.add("revealed");
    setTimeout(() => {
      preloader.classList.add("preloader-hidden");
      document.body.classList.remove("loading-active");
      resizeAllCharts();
      invalidateAllLeafletMaps();
    }, 600);
  }"""

code = code.replace(old_preloader, new_preloader)

# 2. Add getThailandGeoJSON and invalidateAllLeafletMaps
geo_helper = """
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
"""

if "async function getThailandGeoJSON()" not in code:
    code = code.replace("let pmodalChartInstance = null;", "let pmodalChartInstance = null;\n" + geo_helper)

# 3. Update renderChoropleth in initDualMapComparison to use getThailandGeoJSON()
old_render_choropleth = """  function renderChoropleth(mapInstance, year, metric, side) {
    const geoData = window.THAILAND_GEOJSON;
    if (!geoData) return;"""

new_render_choropleth = """  async function renderChoropleth(mapInstance, year, metric, side) {
    const geoData = await getThailandGeoJSON();
    if (!geoData) return;"""

code = code.replace(old_render_choropleth, new_render_choropleth)

# 4. Fix yearThai typo
old_yr = 'const yearThai = year === "2019" ? "2562" : year === "2020" ? "2563" : year === "2021" ? "2564" : year === "2562" ? "2565" : year === "2563" ? "2566" : year;'
new_yr = 'const yearThai = year === "2019" ? "2562" : year === "2020" ? "2563" : year === "2021" ? "2564" : year === "2022" ? "2565" : "2566";'
code = code.replace(old_yr, new_yr)

# 5. In renderGeoMap, also use getThailandGeoJSON()
old_geo_layer = """  const geoData = window.THAILAND_GEOJSON;
  if (!geoData) return;"""

new_geo_layer = """  const geoData = await getThailandGeoJSON();
  if (!geoData) return;"""

code = code.replace("function renderGeoMap() {", "async function renderGeoMap() {")
code = code.replace(old_geo_layer, new_geo_layer)

# 6. Fit bounds in updateDualMaps and invalidateSize
old_update_dual = """    updateNationalDiffTelemetry(yearA, yearB);
    renderChoropleth(compareMapA, yearA, metric, "A");
    renderChoropleth(compareMapB, yearB, metric, "B");
  }"""

new_update_dual = """    updateNationalDiffTelemetry(yearA, yearB);
    await renderChoropleth(compareMapA, yearA, metric, "A");
    await renderChoropleth(compareMapB, yearB, metric, "B");
    invalidateAllLeafletMaps();
  }"""

code = code.replace(old_update_dual, new_update_dual)

with open("app.js", "w", encoding="utf-8") as f:
    f.write(code)

print("app.js successfully patched!")
