// =========================================================================
//Youssef Mohamed Bakr
//+201121121000
//Youssef.Bakr@drc.gov.eg
//Youssef.Bakr@faps.cu.edu.eg
// =========================================================================


// =========================================================================

/**
 * ========================================================================================
 * ADVANCED SITE CLIMATE RISK ASSESSMENT DASHBOARD (FINAL FULL VERSION)
 * ========================================================================================
 * Target Coordinates: [52.769692825414495, 24.081562392352257] (Coastal UAE Region)
 * Study Timeframe:    2020-01-01 to 2025-12-31
 * * ----------------------------------------------------------------------------------------
 * FIXES & OPTIMIZATIONS INCLUDED:
 * 1. 5000-Element Limit Bypass: GEE charts crash when rendering >5000 images (like daily
 * CHIRPS over 6 years). This script uses nested `ee.Filter.calendarRange` loops to 
 * compress daily imagery into optimized, lightweight monthly averages.
 * 2. Corrected Catalog Paths: Uses 'NASA/JPL/MUR/v41' to fix the missing asset error.
 * * ----------------------------------------------------------------------------------------
 * COMPREHENSIVE CLIMATE METRICS & DOCUMENTATION:
 * 1. Extreme Heat (MODIS LST - MOD11A1.061): Measures surface (skin) temperature. Tracks up to 
 * 15°C hotter than air temperature in hyper-arid sand/urban environments.
 * 2. Marine Heat / Sea Surface Temp (NASA JPL MUR v4.1): Tracks coastal warming, which 
 * influences localized extreme humidity events and marine ecosystem stress.
 * 3. Atmospheric Dust/Aerosols (Sentinel-5P TROPOMI): Measures UV Aerosol Index (AAI). Spikes
 * >2.0 correlate with severe Shamal sandstorms, impacting solar energy and HVAC systems.
 * 4. Precipitation Anomalies (CHIRPS Daily): Identifies multi-year drought trends and 
 * hyper-localized, high-intensity flash flood triggers.
 * 5. Desertification (MODIS NDVI - MOD13A1.061): Evaluates vegetation loss.
 * 6. NEW: Evapotranspiration (MODIS ET - MOD16A2GF.061): Measures total moisture loss from 
 * soil and plants. Critical for understanding compounding aridity and water stress.
 * 7. NEW: Topography/Elevation (USGS SRTM): Provides static elevation data to physically 
 * contextualize low-lying coastal sea-level rise and flood pooling risks.
 * 8. Surface Water Exposure (JRC Global Surface Water): 40-year historical baseline of water 
 * presence, revealing exact footprints of past coastal inundation or wadi flooding.
 * ========================================================================================
 */

// --- 1. INITIALIZATION & GEOMETRY CONTROL ---
var site = ee.Geometry.Point([52.769692825414495, 24.081562392352257]);
var bufferZone = site.buffer(20000); // 20km contextual radius for spatial map layers
var startDate = ee.Date('2020-01-01');
var endDate = ee.Date('2025-12-31');

// Center map visually on the site
Map.setCenter(52.769692825414495, 24.081562392352257, 11);
Map.addLayer(site, {color: 'red'}, 'Target Asset Location', true);

// --- 2. TEMPORAL COMPRESSION ARRAYS (For 5000-Element Fix) ---
var months = ee.List.sequence(1, 12);
var years = ee.List.sequence(2020, 2025);

// --- 3. RAW DATASET INGESTION ---
var modisLST = ee.ImageCollection('MODIS/061/MOD11A1').filterBounds(site).filterDate(startDate, endDate).select('LST_Day_1km');
var s5pAerosol = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_AER_AI').filterBounds(site).filterDate(startDate, endDate).select('absorbing_aerosol_index');
var precipitation = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY').filterBounds(site).filterDate(startDate, endDate).select('precipitation');
var modisNDVI = ee.ImageCollection('MODIS/061/MOD13A1').filterBounds(site).filterDate(startDate, endDate).select('NDVI');
var nasaSST = ee.ImageCollection('NASA/JPL/MUR/v41').filterBounds(site).filterDate(startDate, endDate).select('analysed_sst');
var jrcWater = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('occurrence').clip(bufferZone);

// NEW DATASETS: Evapotranspiration and Elevation
var modisET = ee.ImageCollection('MODIS/061/MOD16A2GF').filterBounds(site).filterDate(startDate, endDate).select('ET_500m');
var srtmElevation = ee.Image('USGS/SRTMGL1_003').clip(bufferZone);

// --- 4. DATA TRANSFORMATION & RESAMPLING LOOPS (Monthly Compression) ---

// Map 1: Land Surface Temp (Kelvin to Celsius)
var lstCelsiusClean = modisLST.map(function(img) {
  return img.multiply(0.02).subtract(273.15).rename('LST_Celsius').copyProperties(img, ['system:time_start']);
});
var monthlyLST = ee.ImageCollection(years.map(function(y) {
  return months.map(function(m) {
    var filtered = lstCelsiusClean.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month'));
    return filtered.mean().set({'system:time_start': ee.Date.fromYMD(y, m, 1).millis()});
  });
}).flatten());

// Map 2: Sea Surface Temp (Kelvin to Celsius)
var sstCelsiusClean = nasaSST.map(function(img) {
  return img.subtract(273.15).rename('SST_Celsius').copyProperties(img, ['system:time_start']);
});
var monthlySST = ee.ImageCollection(years.map(function(y) {
  return months.map(function(m) {
    var filtered = sstCelsiusClean.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month'));
    return filtered.mean().set({'system:time_start': ee.Date.fromYMD(y, m, 1).millis()});
  });
}).flatten());

// Map 3: Aerosol Index
var monthlyAerosol = ee.ImageCollection(years.map(function(y) {
  return months.map(function(m) {
    var filtered = s5pAerosol.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month'));
    return filtered.mean().rename('Dust_Index').set({'system:time_start': ee.Date.fromYMD(y, m, 1).millis()});
  });
}).flatten());

// Map 4: Precipitation (Summed Monthly)
var monthlyPrecip = ee.ImageCollection(years.map(function(y) {
  return months.map(function(m) {
    var filtered = precipitation.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month'));
    return filtered.sum().rename('Monthly_Rainfall').set({'system:time_start': ee.Date.fromYMD(y, m, 1).millis()});
  });
}).flatten());

// Map 5: NDVI (Scaled)
var scaledNDVI = modisNDVI.map(function(img) { return img.multiply(0.0001).rename('NDVI').copyProperties(img, ['system:time_start']); });
var monthlyNDVI = ee.ImageCollection(years.map(function(y) {
  return months.map(function(m) {
    var filtered = scaledNDVI.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month'));
    return filtered.mean().set({'system:time_start': ee.Date.fromYMD(y, m, 1).millis()});
  });
}).flatten());

// Map 6: Evapotranspiration (Scaled)
var scaledET = modisET.map(function(img) { return img.multiply(0.1).rename('Evapotranspiration').copyProperties(img, ['system:time_start']); });
var monthlyET = ee.ImageCollection(years.map(function(y) {
  return months.map(function(m) {
    var filtered = scaledET.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month'));
    return filtered.mean().set({'system:time_start': ee.Date.fromYMD(y, m, 1).millis()});
  });
}).flatten());

// --- 5. SPATIAL VISUALIZATION LAYERS (Map Window) ---
// Toggle layers on/off via the 'Layers' button in the top right of the map view.
Map.addLayer(lstCelsiusClean.max().clip(bufferZone), {min: 35, max: 60, palette: ['blue', 'yellow', 'orange', 'red']}, 'Peak Surface Heat (°C)', false);
Map.addLayer(sstCelsiusClean.max().clip(bufferZone), {min: 20, max: 36, palette: ['blue', 'green', 'yellow', 'red']}, 'Peak Sea Surface Temp (°C)', false);
Map.addLayer(jrcWater, {min: 0, max: 100, palette: ['white', 'cyan', 'blue']}, 'Historical Flood Occurrence (%)', false);
Map.addLayer(srtmElevation, {min: 0, max: 50, palette: ['#006600', '#E5FFCC', '#FFE5CC', '#FFB266']}, 'Topography/Elevation (m)', true);

// --- 6. USER INTERFACE (UI) SIDE PANEL ---
var sidePanel = ui.Panel();
sidePanel.style().set({ width: '450px', padding: '15px', border: '1px solid #dcdde1', backgroundColor: '#f5f6fa' });

var mainTitle = ui.Label('Comprehensive Site Climate Risk Dashboard', {fontWeight: 'bold', fontSize: '20px', color: '#2f3640', backgroundColor: '#f5f6fa'});
var subTitle = ui.Label('Lat: 24.0816° N, Lon: 52.7697° E | Temporal Range: 2020-2025', {fontSize: '12px', color: '#718093', backgroundColor: '#f5f6fa'});
sidePanel.add(mainTitle).add(subTitle).add(ui.Label('_________________________________________________', {color: '#7f8fa6', backgroundColor: '#f5f6fa'}));

// Helper function to build uniform charts
function buildChart(collection, region, title, vAxisTitle, color, type, scaleVal) {
  var chart = ui.Chart.image.series({
    imageCollection: collection, region: region, reducer: ee.Reducer.mean(), scale: scaleVal
  }).setOptions({
    title: title,
    vAxis: {title: vAxisTitle},
    hAxis: {gridlines: {count: 0}},
    series: {0: {color: color, lineWidth: 2, pointSize: 2}},
    backgroundColor: '#ffffff'
  });
  if (type === 'bar') chart.setChartType('ColumnChart');
  return chart;
}

// Render Charts
sidePanel.add(buildChart(monthlyLST, site, '1. Mean Monthly Land Surface Temp (°C)', 'LST (°C)', '#e84118', 'line', 1000));
sidePanel.add(buildChart(monthlySST, site.buffer(5000), '2. Coastal Sea Surface Temp Trend (°C)', 'SST (°C)', '#0097e6', 'line', 1000));
sidePanel.add(buildChart(monthlyAerosol, site, '3. Dust Storm/Aerosol Intensity (AAI)', 'Index Intensity', '#e1b12c', 'line', 3500));
sidePanel.add(buildChart(monthlyPrecip, site, '4. Total Monthly Precipitation Accumulation', 'Rainfall (mm)', '#273c75', 'bar', 5566));
sidePanel.add(buildChart(monthlyNDVI, site, '5. Vegetation Health / Desertification (NDVI)', 'NDVI Value', '#44bd32', 'line', 500));
sidePanel.add(buildChart(monthlyET, site, '6. Moisture Stress / Evapotranspiration (kg/m²/8d)', 'ET Rate', '#8c7ae6', 'line', 500));

// Mount side panel
ui.root.insert(0, sidePanel);

