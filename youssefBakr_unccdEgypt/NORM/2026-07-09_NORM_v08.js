// =========================================================================
//Youssef Mohamed Bakr
//+201121121000
//Youssef.Bakr@drc.gov.eg
//Youssef.Bakr@faps.cu.edu.eg
// =========================================================================

// =========================================================================


/* ========================================================================================
 * ADVANCED SITE CLIMATE RISK ASSESSMENT DASHBOARD (FINAL FULL VERSION)
 * ========================================================================================
 * Target Coordinates: [52.769692825414495, 24.081562392352257] (Al Ruwais Industrial City)
 * Site Designation:   NORM Plant and NORM Landfill, Abu Dhabi, UAE (3QMC+J5H)
 * Study Timeframe:    2020-01-01 to 2025-12-31
 * * FIXES & OPTIMIZATIONS INCLUDED:
 * 1. 5000-Element Limit Bypass: GEE charts crash when rendering >5000 images. Uses 
 * nested ee.Filter.calendarRange loops to compress daily imagery into monthly averages.
 * 2. Corrected Catalog Paths: Replaced NASA MUR with NOAA OISST v2.1 for Sea Surface Temp.
 * 3. Corrected Band Names: Updated MODIS Evapotranspiration band from 'ET_500m' to 'ET'.
 * 4. NEW LAYER ADDED (NORM Specific): Daily Wind Speed derived from ECMWF ERA5 data to 
 * track atmospheric dispersion risks for radioactive particulate matter.
 * ========================================================================================
 */

// --- 1. INITIALIZATION & GEOMETRY CONTROL ---
var site = ee.Geometry.Point([52.769692825414495, 24.081562392352257]);
var bufferZone = site.buffer(20000); // 20km contextual radius for spatial map layers
var startDate = ee.Date('2020-01-01');
var endDate = ee.Date('2025-12-31');

// Center map visually on the site
Map.setCenter(52.769692825414495, 24.081562392352257, 11);
Map.addLayer(site, {color: 'red'}, 'Target Asset Location (NORM Site)', true);

// --- 2. TEMPORAL COMPRESSION ARRAYS (For 5000-Element Fix) ---
// We create lists of years and months to iterate over for our temporal reductions.
var months = ee.List.sequence(1, 12);
var years = ee.List.sequence(2020, 2025);

// --- 3. RAW DATASET INGESTION ---
// Land Surface Temperature (MODIS)
var modisLST = ee.ImageCollection('MODIS/061/MOD11A1').filterBounds(site).filterDate(startDate, endDate).select('LST_Day_1km');
// Aerosol/Dust Index (Sentinel-5P)
var s5pAerosol = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_AER_AI').filterBounds(site).filterDate(startDate, endDate).select('absorbing_aerosol_index');
// Precipitation (CHIRPS)
var precipitation = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY').filterBounds(site).filterDate(startDate, endDate).select('precipitation');
// Vegetation/Desertification (MODIS)
var modisNDVI = ee.ImageCollection('MODIS/061/MOD13A1').filterBounds(site).filterDate(startDate, endDate).select('NDVI');
// Sea Surface Temperature (NOAA OISST - FIXED FROM NASA MUR)
var noaaSST = ee.ImageCollection('NOAA/CDR/OISST/V2_1').filterBounds(site).filterDate(startDate, endDate).select('sst');
// Surface Water/Flood Baseline (JRC)
var jrcWater = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('occurrence').clip(bufferZone);
// Evapotranspiration (MODIS - FIXED BAND NAME)
var modisET = ee.ImageCollection('MODIS/061/MOD16A2GF').filterBounds(site).filterDate(startDate, endDate).select('ET');
// Topography/Elevation (SRTM)
var srtmElevation = ee.Image('USGS/SRTMGL1_003').clip(bufferZone);
// Wind Vectors (ERA5 - NEW FOR NORM ASSESSMENT)
var era5Wind = ee.ImageCollection('ECMWF/ERA5/DAILY').filterBounds(site).filterDate(startDate, endDate).select(['u_component_of_wind_10m', 'v_component_of_wind_10m']);

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

// Map 2: Sea Surface Temp (Scale to Celsius for NOAA OISST)
var sstCelsiusClean = noaaSST.map(function(img) {
  // NOAA OISST is already in Celsius, just requires 0.01 scaling factor
  return img.multiply(0.01).rename('SST_Celsius').copyProperties(img, ['system:time_start']);
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

// Map 5: Evapotranspiration (Scaled)
var scaledET = modisET.map(function(img) { return img.multiply(0.1).rename('Evapotranspiration').copyProperties(img, ['system:time_start']); });
var monthlyET = ee.ImageCollection(years.map(function(y) {
  return months.map(function(m) {
    var filtered = scaledET.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month'));
    return filtered.mean().set({'system:time_start': ee.Date.fromYMD(y, m, 1).millis()});
  });
}).flatten());

// Map 6: Wind Speed Math (Magnitude of U and V vectors: sqrt(u^2 + v^2))
var windSpeed = era5Wind.map(function(img) {
  var ws = img.select('u_component_of_wind_10m').pow(2)
    .add(img.select('v_component_of_wind_10m').pow(2))
    .sqrt().rename('Wind_Speed_m_s');
  return ws.copyProperties(img, ['system:time_start']);
});
var monthlyWind = ee.ImageCollection(years.map(function(y) {
  return months.map(function(m) {
    var filtered = windSpeed.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month'));
    return filtered.mean().set({'system:time_start': ee.Date.fromYMD(y, m, 1).millis()});
  });
}).flatten());

// --- 5. SPATIAL VISUALIZATION LAYERS (Map Window) ---
Map.addLayer(lstCelsiusClean.max().clip(bufferZone), {min: 35, max: 60, palette: ['blue', 'yellow', 'orange', 'red']}, 'Peak Surface Heat (°C)', false);
Map.addLayer(sstCelsiusClean.max().clip(bufferZone), {min: 20, max: 36, palette: ['blue', 'green', 'yellow', 'red']}, 'Peak Sea Surface Temp (°C)', false);
Map.addLayer(jrcWater, {min: 0, max: 100, palette: ['white', 'cyan', 'blue']}, 'Historical Flood Occurrence (%)', false);
Map.addLayer(srtmElevation, {min: 0, max: 50, palette: ['#006600', '#E5FFCC', '#FFE5CC', '#FFB266']}, 'Topography/Elevation (m)', true);

// --- 6. USER INTERFACE (UI) SIDE PANEL ---
var sidePanel = ui.Panel();
sidePanel.style().set({ width: '450px', padding: '15px', border: '1px solid #dcdde1', backgroundColor: '#f5f6fa' });

var mainTitle = ui.Label('NORM Site Climate Risk Dashboard', {fontWeight: 'bold', fontSize: '20px', color: '#2f3640', backgroundColor: '#f5f6fa'});
var subTitle = ui.Label('Al Ruwais Industrial City | 2020-2025', {fontSize: '14px', color: '#718093', backgroundColor: '#f5f6fa'});
sidePanel.add(mainTitle).add(subTitle).add(ui.Label('_________________________________________________', {color: '#7f8fa6', backgroundColor: '#f5f6fa'}));

// Helper function to build uniform charts
function buildChart(collection, region, title, vAxisTitle, color, type, scaleVal) {
  var chart = ui.Chart.image.series({
    imageCollection: collection, region: region, reducer: ee.Reducer.mean(), scale: scaleVal
  }).setOptions({
    title: title, vAxis: {title: vAxisTitle}, hAxis: {gridlines: {count: 0}},
    series: {0: {color: color, lineWidth: 2, pointSize: 2}}, backgroundColor: '#ffffff'
  });
  if (type === 'bar') chart.setChartType('ColumnChart');
  return chart;
}

// Render Charts
sidePanel.add(buildChart(monthlyLST, site, '1. Mean Land Surface Temp (°C)', 'LST (°C)', '#e84118', 'line', 1000));
sidePanel.add(buildChart(monthlySST, site.buffer(5000), '2. Coastal Sea Surface Temp (°C)', 'SST (°C)', '#0097e6', 'line', 10000));
sidePanel.add(buildChart(monthlyWind, site, '3. Wind Speed (m/s) [Dispersion Risk]', 'm/s', '#7f8fa6', 'line', 10000));
sidePanel.add(buildChart(monthlyAerosol, site, '4. Dust/Aerosol Intensity (AAI)', 'Index Intensity', '#e1b12c', 'line', 3500));
sidePanel.add(buildChart(monthlyPrecip, site, '5. Precipitation Accumulation [Leaching Risk]', 'Rainfall (mm)', '#273c75', 'bar', 5566));
sidePanel.add(buildChart(monthlyET, site, '6. Evapotranspiration (kg/m²/8d) [Aridity]', 'ET Rate', '#8c7ae6', 'line', 500));

// Mount side panel
ui.root.insert(0, sidePanel);

// --- 7. AUTOMATED CONSOLE REPORT GENERATION ---
print('======================================================================================');
print('SITE-SPECIFIC CLIMATE RISK ASSESSMENT REPORT');
print('Location Name: NORM Plant and NORM Landfill');
print('Coordinates: Lat 24.0816° N, Lon 52.7697° E');
print('Region: 3QMC+J5H - Al Ruwais Industrial City - Abu Dhabi - UAE');
print('======================================================================================');
print('METHODOLOGY & CONTEXT:');
print('This assessment utilizes multi-sensor satellite Earth Observation data (Google Earth Engine) to evaluate environmental stress variables impacting the integrity of a Naturally Occurring Radioactive Material (NORM) management facility in a hyper-arid, coastal industrial zone.');
print(' ');
print('RISK FACTOR 1: RADIOLOGICAL DUST DISPERSION (Wind & Aerosols)');
print('- Data Sources: ECMWF ERA5 (Daily Wind at 10m) & Sentinel-5P TROPOMI (Aerosol Index).');
print('- Risk Profile: HIGH. Al Ruwais is susceptible to Shamal winds. High wind speeds correlate with heavy dust spikes, increasing the risk of airborne dispersion of contaminated particulates from unsealed active landfill working faces or processing stockpiles.');
print(' ');
print('RISK FACTOR 2: LANDFILL LINER DEGRADATION (Extreme Heat & Aridity)');
print('- Data Sources: MODIS LST (MOD11A1) & MODIS Evapotranspiration (MOD16A2GF).');
print('- Risk Profile: HIGH. Surface temperatures in hyper-arid sand environments can exceed air temperatures significantly (reaching 50°C+). Prolonged thermal loading combined with zero moisture (evident via negligible ET rates) accelerates the desiccation, embrittlement, and thermal cracking of HDPE geomembrane liners and clay capping layers.');
print(' ');
print('RISK FACTOR 3: LEACHING & COASTAL INUNDATION (Precipitation & Elevation)');
print('- Data Sources: CHIRPS Daily Rainfall, JRC Global Surface Water, USGS SRTM Elevation, NOAA OISST.');
print('- Risk Profile: MODERATE TO HIGH. While average rainfall is exceptionally low, the region experiences rare, intense flash-flood events. As a low-elevation coastal site, poor drainage of sudden storm water risks wadi pooling, threatening to infiltrate the NORM landfill cells and generate radioactive leachate. Furthermore, rising coastal Sea Surface Temperatures (SST) correlate with higher atmospheric moisture carrying capacity, potentially increasing the severity of these anomalous precipitation events over time.');
print('======================================================================================');

