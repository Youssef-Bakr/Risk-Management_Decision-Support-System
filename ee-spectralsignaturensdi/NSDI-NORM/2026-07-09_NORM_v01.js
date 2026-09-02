// =========================================================================
//Youssef Mohamed Bakr
//+201121121000
//Youssef.Bakr@drc.gov.eg
//Youssef.Bakr@faps.cu.edu.eg
// =========================================================================


// =========================================================================

/**
 * ========================================================================================
 * INTEGRATED SITE CLIMATE RISK ASSESSMENT DASHBOARD
 * ========================================================================================
 * Target Coordinates: [52.769692825414495, 24.081562392352257] (Ruwais / Coastal UAE Region)
 * Study Timeframe:    2020-01-01 to 2025-12-31
 * * ----------------------------------------------------------------------------------------
 * DATA SOURCE DOCUMENTATION & METHODOLOGY VALIDATION
 * ----------------------------------------------------------------------------------------
 * 1. EXTREME HEAT: NASA MODIS Land Surface Temperature (MOD11A1.061)
 * - Spatial/Temporal: 1 km daily grid resolution.
 * - Physical Layer: Measures radiometric skin (surface) temperature via a split-window algorithm.
 * - Validation: Global error bounds validated within +/- 1.0°C against in-situ station networks.
 * Note: LST can track 10°C to 15°C higher than ambient air temperatures in hyper-arid zones.
 * * 2. DESERTIFICATION / VEGETATION: NASA MODIS NDVI (MOD13A1.061)
 * - Spatial/Temporal: 500 meter 16-day composite grid.
 * - Formula: (NIR - Red) / (NIR + Red). Captures photosynthetic active biomass presence.
 * - Validation: Ideal for long-term land degradation tracking. Hyper-arid baselines fall between 0.0 and 0.15.
 * * 3. ATMOSPHERIC DUST / AIR QUALITY: ESA Copernicus Sentinel-5P TROPOMI (AER_AI)
 * - Spatial/Temporal: 5.5 km x 3.5 km daily orbit resolution.
 * - Physical Layer: UV Absorbing Aerosol Index (AAI). Detects elevated light-absorbing mineral dust.
 * - Validation: Cross-compared with Middle Eastern ground sun photometer networks (AERONET). 
 * Index values > 2.0 reliably validate historical regional dust storms / Shamal events.
 * * 4. PRECIPITATION / DROUGHT: UCSB Climate Hazards Center CHIRPS Daily
 * - Spatial/Temporal: 0.05° (~5.5 km) daily grid.
 * - Validation: Merges satellite thermal infrared precipitation estimates with in-situ rain gauge station data.
 * * 5. SURFACE WATER EXPOSURE: European Commission JRC Global Surface Water (v1.4)
 * - Spatial/Temporal: 30 meter grid based on a 40-year Landsat baseline archive.
 * - Physical Layer: Occurrence band (% of time a pixel held open water over the historical timeline).
 * - Validation: Peer-reviewed validation shows a highly reliable water detection commission error under 1%.
 * ========================================================================================
 */

// --- 1. INITIALIZATION & GEOMETRY CONTROL ---
var site = ee.Geometry.Point([52.769692825414495, 24.081562392352257]);
var bufferZone = site.buffer(20000); // 20km contextual assessment buffer
var startDate = '2020-01-01';
var endDate = '2025-12-31';

Map.setCenter(52.769692825414495, 24.081562392352257, 11);
Map.addLayer(site, {color: 'red'}, 'Target Asset Site');

// --- 2. DATASET INGESTION & PROCESSING ---

// Heat Processing
var modisLST = ee.ImageCollection('MODIS/061/MOD11A1')
  .filterBounds(site).filterDate(startDate, endDate).select('LST_Day_1km');
var lstCelsius = modisLST.map(function(img) {
  return img.multiply(0.02).subtract(273.15).rename('LST_Celsius')
            .copyProperties(img, ['system:time_start']);
});
var maxLSTImage = lstCelsius.max().clip(bufferZone);

// Vegetation Processing
var modisNDVI = ee.ImageCollection('MODIS/061/MOD13A1')
  .filterBounds(site).filterDate(startDate, endDate).select('NDVI');
var scaledNDVI = modisNDVI.map(function(img) {
  return img.multiply(0.0001).rename('NDVI')
            .copyProperties(img, ['system:time_start']);
});
var maxNDVIImage = scaledNDVI.max().clip(bufferZone);

// Dust/Aerosol Processing
var s5pAerosol = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_AER_AI')
  .filterBounds(site).filterDate(startDate, endDate).select('absorbing_aerosol_index');
var maxAerosolImage = s5pAerosol.max().clip(bufferZone);

// Water & Rainfall Processing
var precipitation = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
  .filterBounds(site).filterDate(startDate, endDate).select('precipitation');
var jrcWater = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('occurrence').clip(bufferZone);

// --- 3. SPATIAL MAP VISUALIZATIONS ---
Map.addLayer(maxLSTImage, {min: 30, max: 60, palette: ['blue', 'yellow', 'orange', 'red']}, 'Max Land Surface Temp (°C)', false);
Map.addLayer(maxNDVIImage, {min: 0.0, max: 0.3, palette: ['white', 'yellow', 'green']}, 'Max Vegetation Index (NDVI)', false);
Map.addLayer(maxAerosolImage, {min: -0.5, max: 3.5, palette: ['black', 'blue', 'purple', 'orange', 'red']}, 'Peak Aerosol / Dust Loading Index', false);
Map.addLayer(jrcWater, {min: 0, max: 100, palette: ['white', 'blue']}, 'Historical Water Occurrence (%)', true);

// --- 4. BUILD THE UI SIDE PANEL PANEL DASHBOARD ---

// Create the parent panel container
var panel = ui.Panel();
panel.style().set({
  width: '420px',
  padding: '12px',
  border: '1px solid #ccc'
});

// Title & Subtitle Elements
var title = ui.Label('Climate Risk Assessment Dashboard', {fontWeight: 'bold', fontSize: '20px', color: '#2c3e50'});
var coordinatesLabel = ui.Label('Location: 52.7697° E, 24.0816° N (Ruwais Region, UAE)', {fontSize: '12px', color: '#7f8c8d'});
var introText = ui.Label('This panel summarizes localized climate risk vectors computed from historical satellite streams between 2020 and 2025.', {fontSize: '13px'});

panel.add(title);
panel.add(coordinatesLabel);
panel.add(introText);
panel.add(ui.Label('___________________________________________', {color: '#bdc3c7'}));

// Section: Time Series Trend Generation
var heatTitle = ui.Label('1. Extreme Surface Heat Profile', {fontWeight: 'bold', fontSize: '14px', margin: '10px 0 0 0'});
var heatChart = ui.Chart.image.series({
  imageCollection: lstCelsius,
  region: site,
  reducer: ee.Reducer.mean(),
  scale: 1000
}).setOptions({
  title: 'Land Surface Temp Trend at Coordinates',
  vAxis: {title: 'LST (°C)'},
  hAxis: {title: 'Timeline', gridlines: {count: 0}},
  series: {0: {color: 'crimson', lineWidth: 1, pointSize: 1}}
});
panel.add(heatTitle).add(heatChart);

var dustTitle = ui.Label('2. Sandstorm & Aerosol Spikes', {fontWeight: 'bold', fontSize: '14px', margin: '10px 0 0 0'});
var aerosolChart = ui.Chart.image.series({
  imageCollection: s5pAerosol,
  region: site,
  reducer: ee.Reducer.mean(),
  scale: 3500
}).setOptions({
  title: 'Atmospheric Dust Index Spikes (S5P AAI)',
  vAxis: {title: 'Aerosol Index Value'},
  hAxis: {title: 'Timeline', gridlines: {count: 0}},
  series: {0: {color: 'orange', lineWidth: 1, pointSize: 1}}
});
panel.add(dustTitle).add(aerosolChart);

var rainTitle = ui.Label('3. Precipitation Anomalies', {fontWeight: 'bold', fontSize: '14px', margin: '10px 0 0 0'});
var precipChart = ui.Chart.image.series({
  imageCollection: precipitation,
  region: site,
  reducer: ee.Reducer.sum(),
  scale: 5566
}).setOptions({
  title: 'Daily Rainfall Signals (Flash Flood/Drought)',
  vAxis: {title: 'Rainfall (mm/day)'},
  hAxis: {title: 'Timeline', gridlines: {count: 0}},
  series: {0: {color: 'blue', lineWidth: 1.5}}
});
panel.add(rainTitle).add(precipChart);

var ndviTitle = ui.Label('4. Desertification Baseline Tracker', {fontWeight: 'bold', fontSize: '14px', margin: '10px 0 0 0'});
var ndviChart = ui.Chart.image.series({
  imageCollection: scaledNDVI,
  region: site,
  reducer: ee.Reducer.mean(),
  scale: 500
}).setOptions({
  title: 'Vegetation Performance Indicator (NDVI Baseline)',
  vAxis: {title: 'NDVI Index Value'},
  hAxis: {title: 'Timeline', gridlines: {count: 0}},
  series: {0: {color: 'forestgreen', lineWidth: 1, pointSize: 1}}
});
panel.add(ndviTitle).add(ndviChart);

// Add everything cleanly to the UI root workspace
ui.root.insert(0, panel);
