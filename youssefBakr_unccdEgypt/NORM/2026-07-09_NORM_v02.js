// =========================================================================
//Youssef Mohamed Bakr
//+201121121000
//Youssef.Bakr@drc.gov.eg
//Youssef.Bakr@faps.cu.edu.eg
// =========================================================================

// =========================================================================

/**
 * ========================================================================================
 * ADVANCED HIGH-PERFORMANCE SITE CLIMATE RISK ASSESSMENT DASHBOARD
 * ========================================================================================
 * Target Coordinates: [52.769692825414495, 24.081562392352257] (Coastal UAE Region)
 * Study Timeframe:    2020-01-01 to 2025-12-31
 * 
 * FIX IMPLEMENTED: 
 * Implemented temporal monthly aggregation to resolve the "5000 elements" abort threshold.
 * 
 * NEW STREAM INCLUDED:
 * Sea Surface Temperature (SST) via NASA JPL MUR high-resolution marine sensing.
 * ========================================================================================
 */

// --- 1. INITIALIZATION & GEOMETRY CONTROL ---
var site = ee.Geometry.Point([52.769692825414495, 24.081562392352257]);
var bufferZone = site.buffer(20000); // 20km contextual assessment buffer
var startDate = ee.Date('2020-01-01');
var endDate = ee.Date('2025-12-31');

Map.setCenter(52.769692825414495, 24.081562392352257, 11);
Map.addLayer(site, {color: 'red'}, 'Target Asset Site');

// --- 2. TEMPORAL COMPRESSION ENGINE (Fixes the >5000 element error) ---
var months = ee.List.sequence(1, 12);
var years = ee.List.sequence(2020, 2025);

// --- 3. RAW DATASET INGESTION ---
var modisLST = ee.ImageCollection('MODIS/061/MOD11A1').filterBounds(site).filterDate(startDate, endDate).select('LST_Day_1km');
var s5pAerosol = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_AER_AI').filterBounds(site).filterDate(startDate, endDate).select('absorbing_aerosol_index');
var precipitation = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY').filterBounds(site).filterDate(startDate, endDate).select('precipitation');
var modisNDVI = ee.ImageCollection('MODIS/061/MOD13A1').filterBounds(site).filterDate(startDate, endDate).select('NDVI');
var jrcWater = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('occurrence').clip(bufferZone);

// NEW DATA STREAM: NASA JPL Multi-scale Ultra-high Resolution Sea Surface Temperature
var nasaSST = ee.ImageCollection('JPL/MUR/v4.1').filterBounds(site).filterDate(startDate, endDate).select('analysed_sst');

// --- 4. DATA TRANSFORMATION & RESAMPLING LOOPS ---

// Convert LST Kelvin to Celsius & generate Monthly Averages
var lstCelsiusClean = modisLST.map(function(img) {
  return img.multiply(0.02).subtract(273.15).rename('LST_Celsius').copyProperties(img, ['system:time_start']);
});

var monthlyLST = ee.ImageCollection(years.map(function(y) {
  return months.map(function(m) {
    var filtered = lstCelsiusClean.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month'));
    return filtered.mean().set({
      'system:time_start': ee.Date.fromYMD(y, m, 1).millis(),
      'month': m, 'year': y
    });
  });
}).flatten());

// Monthly Aerosol / Dust Index
var monthlyAerosol = ee.ImageCollection(years.map(function(y) {
  return months.map(function(m) {
    var filtered = s5pAerosol.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month'));
    return filtered.mean().rename('Dust_Index').set({
      'system:time_start': ee.Date.fromYMD(y, m, 1).millis()
    });
  });
}).flatten());

// Monthly Cumulative Precipitation
var monthlyPrecip = ee.ImageCollection(years.map(function(y) {
  return months.map(function(m) {
    var filtered = precipitation.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month'));
    return filtered.sum().rename('Monthly_Rainfall').set({
      'system:time_start': ee.Date.fromYMD(y, m, 1).millis()
    });
  });
}).flatten());

// Monthly NDVI (Scaled)
var scaledNDVI = modisNDVI.map(function(img) {
  return img.multiply(0.0001).rename('NDVI').copyProperties(img, ['system:time_start']);
});
var monthlyNDVI = ee.ImageCollection(years.map(function(y) {
  return months.map(function(m) {
    var filtered = scaledNDVI.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month'));
    return filtered.mean().rename('NDVI').set({
      'system:time_start': ee.Date.fromYMD(y, m, 1).millis()
    });
  });
}).flatten());

// NEW: Monthly Sea Surface Temperature (Kelvin to Celsius translation)
var sstCelsiusClean = nasaSST.map(function(img) {
  return img.subtract(273.15).rename('SST_Celsius').copyProperties(img, ['system:time_start']);
});
var monthlySST = ee.ImageCollection(years.map(function(y) {
  return months.map(function(m) {
    var filtered = sstCelsiusClean.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month'));
    return filtered.mean().rename('SST_Celsius').set({
      'system:time_start': ee.Date.fromYMD(y, m, 1).millis()
    });
  });
}).flatten());

// --- 5. VISUAL CONTEXT LAYERS ---
Map.addLayer(lstCelsiusClean.max().clip(bufferZone), {min: 35, max: 58, palette: ['blue', 'yellow', 'orange', 'red']}, 'Peak Historical LST (Celsius)', false);
Map.addLayer(sstCelsiusClean.max().clip(bufferZone), {min: 20, max: 36, palette: ['blue', 'green', 'yellow', 'red']}, 'Peak Sea Surface Temp (SST)', false);
Map.addLayer(jrcWater, {min: 0, max: 100, palette: ['white', 'cyan', 'blue']}, 'Historical Flood/Surface Water Occurrence (%)', true);

// --- 6. USER INTERFACE (UI) SIDE PANEL ENGINEERING ---
var sidePanel = ui.Panel();
sidePanel.style().set({
  width: '440px',
  padding: '14px',
  border: '2px solid #34495e'
});

// Headers
var mainTitle = ui.Label('Site Climate Risk Dashboard', {fontWeight: 'bold', fontSize: '22px', color: '#2c3e50'});
var subTitle = ui.Label('Coordinates: 52.7697° E, 24.0816° N | Spatial Time-Series Assessment', {fontSize: '11px', color: '#95a5a6'});
sidePanel.add(mainTitle).add(subTitle);
sidePanel.add(ui.Label('________________________________________________', {color: '#bdc3c7', margin: '0 0 10px 0'}));

// Chart 1: Mean Monthly Land Surface Heat (Fixed)
var chart1 = ui.Chart.image.series({
  imageCollection: monthlyLST,
  region: site,
  reducer: ee.Reducer.mean(),
  scale: 1000
}).setOptions({
  title: 'Monthly Mean Land Surface Temperature (°C)',
  vAxis: {title: 'LST (°C)', viewWindow: {min: 15, max: 55}},
  hAxis: {gridlines: {count: 0}},
  series: {0: {color: '#e74c3c', lineWidth: 2, pointSize: 2}}
});
sidePanel.add(chart1);

// NEW Chart 2: Coastal Sea Surface Temperature (SST Vector)
var chart2 = ui.Chart.image.series({
  imageCollection: monthlySST,
  region: site.buffer(5000), // Buffered into the adjacent marine boundary zone
  reducer: ee.Reducer.mean(),
  scale: 1000
}).setOptions({
  title: 'Coastal Sea Surface Temperature Trend (°C)',
  vAxis: {title: 'SST (°C)', viewWindow: {min: 18, max: 36}},
  hAxis: {gridlines: {count: 0}},
  series: {0: {color: '#1abc9c', lineWidth: 2, pointSize: 2}}
});
sidePanel.add(chart2);

// Chart 3: Aerosol Dust Index (Fixed)
var chart3 = ui.Chart.image.series({
  imageCollection: monthlyAerosol,
  region: site,
  reducer: ee.Reducer.mean(),
  scale: 3500
}).setOptions({
  title: 'Atmospheric Dust Index (Sentinel-5P AAI)',
  vAxis: {title: 'Aerosol Index Intensity'},
  hAxis: {gridlines: {count: 0}},
  series: {0: {color: '#f39c12', lineWidth: 1.5, pointSize: 1}}
});
sidePanel.add(chart3);

// Chart 4: Cumulative Monthly Rainfall (Fixed)
var chart4 = ui.Chart.image.series({
  imageCollection: monthlyPrecip,
  region: site,
  reducer: ee.Reducer.mean(),
  scale: 5566
}).setOptions({
  title: 'Total Monthly Precipitation Accumulation',
  vAxis: {title: 'Rainfall (mm/month)'},
  hAxis: {gridlines: {count: 0}},
  series: {0: {color: '#3498db', type: 'bars'}}
}).setChartType('ColumnChart');
sidePanel.add(chart4);

// Chart 5: Desertification NDVI (Fixed)
var chart5 = ui.Chart.image.series({
  imageCollection: monthlyNDVI,
  region: site,
  reducer: ee.Reducer.mean(),
  scale: 500
}).setOptions({
  title: 'Vegetation Status / Desertification Index',
  vAxis: {title: 'NDVI Value', viewWindow: {min: 0.0, max: 0.25}},
  hAxis: {gridlines: {count: 0}},
  series: {0: {color: '#27ae60', lineWidth: 1.5}}
});
sidePanel.add(chart5);

// Mount the side panel to the main screen UI root
ui.root.insert(0, sidePanel);

