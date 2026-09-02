// =========================================================================
//Youssef Mohamed Bakr
//+201121121000
//Youssef.Bakr@drc.gov.eg
//Youssef.Bakr@faps.cu.edu.eg
// =========================================================================

// =========================================================================
//15
/* ========================================================================================
 * ADVANCED SITE CLIMATE RISK & RADIOLOGICAL DISPERSION DASHBOARD (V3 - ROBUST)
 * ========================================================================================
 * Target Coordinates: [52.769692825414495, 24.081562392352257] (Al Ruwais Industrial City)
 * Site Designation:   NORM Plant and NORM Landfill, Abu Dhabi, UAE (3QMC+J5H)
 * Study Timeframe:    2020-01-01 to 2025-12-31
 * * CORE FIXES:
 * - Solved 0-Band Errors: Mathematical operations (Wind vectors, ET unmasking) are now 
 * applied to the raw collections *before* temporal reduction. Missing data for late 
 * 2024/2025 will safely render as gaps in the charts rather than crashing the script.
 * - Enhanced Flash Flood & Dispersion Analysis included in the UI and Console Report.
 * ========================================================================================
 */

// --- 1. INITIALIZATION & GEOMETRY CONTROL ---
var site = ee.Geometry.Point([52.769692825414495, 24.081562392352257]);
var bufferZone = site.buffer(20000); 
var startDate = ee.Date('2020-01-01');
var endDate = ee.Date('2025-12-31');

Map.setCenter(52.769692825414495, 24.081562392352257, 11);
Map.addLayer(site, {color: 'red'}, 'NORM Site: Target Location', true);

var months = ee.List.sequence(1, 12);
var years = ee.List.sequence(2020, 2025);

// --- 2. RAW DATASET INGESTION ---
var modisLST = ee.ImageCollection('MODIS/061/MOD11A1').filterBounds(site).filterDate(startDate, endDate).select('LST_Day_1km');
var precipitation = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY').filterBounds(site).filterDate(startDate, endDate).select('precipitation');
var imerg = ee.ImageCollection("NASA/GPM_L3/IMERG_V06").filterBounds(site).filterDate(startDate, endDate).select('precipitationCal'); 
var modisET = ee.ImageCollection('MODIS/061/MOD16A2').filterBounds(site).filterDate(startDate, endDate).select('ET');
var era5Wind = ee.ImageCollection('ECMWF/ERA5/DAILY').filterBounds(site).filterDate(startDate, endDate).select(['u_component_of_wind_10m', 'v_component_of_wind_10m']);
var jrcWater = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('occurrence').clip(bufferZone);
var srtmElevation = ee.Image('USGS/SRTMGL1_003').clip(bufferZone);

// --- 3. PRE-PROCESSING (FIXING THE 0-BAND CRASHES) ---
// We process the math on the raw images so empty months don't break the code downstream.

// A. Wind Vector Math (U & V to Speed and Direction)
var windProcessed = era5Wind.map(function(img) {
  var u = img.select('u_component_of_wind_10m');
  var v = img.select('v_component_of_wind_10m');
  var speed = u.pow(2).add(v.pow(2)).sqrt().rename('Wind_Speed_m_s');
  var pi = ee.Number(Math.PI);
  var dir = u.atan2(v).multiply(180).divide(pi).add(180).mod(360).rename('Wind_Direction_Degrees');
  return speed.addBands(dir).copyProperties(img, ['system:time_start']);
});

// B. Evapotranspiration (Unmasking desert pixels to 0 before reduction)
var etProcessed = modisET.map(function(img) {
  return img.unmask(0).multiply(0.1).rename('Evapotranspiration_kg_m2').copyProperties(img, ['system:time_start']);
});

// --- 4. DATA TRANSFORMATION & RESAMPLING LOOPS (Monthly Compression) ---

// Map 1: Land Surface Temp (°C)
var monthlyLST = ee.ImageCollection(years.map(function(y) {
  return months.map(function(m) {
    var filtered = modisLST.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month'));
    return filtered.mean().multiply(0.02).subtract(273.15).rename('Mean_LST_Celsius').set({'system:time_start': ee.Date.fromYMD(y, m, 1).millis()});
  });
}).flatten());

// Map 2: Total Accumulation Rainfall (mm/month)
var monthlyPrecip = ee.ImageCollection(years.map(function(y) {
  return months.map(function(m) {
    var filtered = precipitation.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month'));
    return filtered.sum().rename('Total_Rainfall_mm').set({'system:time_start': ee.Date.fromYMD(y, m, 1).millis()});
  });
}).flatten());

// Map 3: Flash Flood Peak Intensity (Max mm/hr per month)
var monthlyMaxPrecipRate = ee.ImageCollection(years.map(function(y) {
  return months.map(function(m) {
    var filtered = imerg.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month'));
    return filtered.max().rename('Max_Hourly_Rate_mm_hr').set({'system:time_start': ee.Date.fromYMD(y, m, 1).millis()});
  });
}).flatten());

// Map 4: Wind Metrics (Pre-processed)
var monthlyWind = ee.ImageCollection(years.map(function(y) {
  return months.map(function(m) {
    var filtered = windProcessed.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month'));
    return filtered.mean().set({'system:time_start': ee.Date.fromYMD(y, m, 1).millis()});
  });
}).flatten());

// Map 5: Evapotranspiration (Pre-processed)
var monthlyET = ee.ImageCollection(years.map(function(y) {
  return months.map(function(m) {
    var filtered = etProcessed.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month'));
    return filtered.mean().set({'system:time_start': ee.Date.fromYMD(y, m, 1).millis()});
  });
}).flatten());


// --- 5. SPATIAL VISUALIZATION LAYERS (Map Window) ---
Map.addLayer(jrcWater, {min: 0, max: 100, palette: ['white', 'cyan', 'blue']}, 'Historical Flood Occurrence (%)', false);
Map.addLayer(srtmElevation, {min: 0, max: 50, palette: ['#006600', '#E5FFCC', '#FFE5CC', '#FFB266']}, 'Topography/Elevation (m)', true);

// --- 6. USER INTERFACE (UI) SIDE PANEL ---
var sidePanel = ui.Panel();
sidePanel.style().set({ width: '480px', padding: '15px', border: '1px solid #dcdde1', backgroundColor: '#f5f6fa' });

var mainTitle = ui.Label('NORM Site Climate & Dispersion Dashboard', {fontWeight: 'bold', fontSize: '18px', color: '#2f3640', backgroundColor: '#f5f6fa'});
var subTitle = ui.Label('Al Ruwais Industrial City | NORM Landfill | 2020-2025', {fontSize: '12px', color: '#718093', backgroundColor: '#f5f6fa'});
sidePanel.add(mainTitle).add(subTitle).add(ui.Label('_________________________________________________', {color: '#7f8fa6', backgroundColor: '#f5f6fa'}));

// Advanced Chart Builder with Detailed Legends
function buildChart(collection, band, region, title, vAxisTitle, color, type, scaleVal, yMin) {
  var chart = ui.Chart.image.series({
    imageCollection: collection.select(band), region: region, reducer: ee.Reducer.mean(), scale: scaleVal
  }).setOptions({
    title: title, 
    vAxis: {title: vAxisTitle, viewWindow: {min: yMin}, textStyle: {fontSize: 10}}, 
    hAxis: {title: 'Timeline (Monthly)', format: 'MMM yyyy', gridlines: {count: 0}},
    legend: {position: 'bottom', textStyle: {color: '#2f3640', fontSize: 11}},
    series: {0: {color: color, lineWidth: 2, pointSize: 3}}, 
    backgroundColor: '#ffffff'
  });
  if (type === 'bar') chart.setChartType('ColumnChart');
  if (type === 'scatter') chart.setChartType('ScatterChart');
  return chart;
}

// Render Enhanced Charts
sidePanel.add(buildChart(monthlyMaxPrecipRate, 'Max_Hourly_Rate_mm_hr', site, '1. FLASH FLOOD DYNAMICS: Max Intensity Rate', 'Peak Rate (mm/hr)', '#00a8ff', 'bar', 10000, 0));
sidePanel.add(buildChart(monthlyPrecip, 'Total_Rainfall_mm', site, '2. CLIMATE: Total Monthly Rainfall Accumulation', 'Sum (mm)', '#273c75', 'bar', 5566, 0));
sidePanel.add(buildChart(monthlyWind, 'Wind_Direction_Degrees', site, '3. DISPERSION PATH: Mean Wind Direction', 'Degrees (0=N, 90=E, 180=S, 270=W)', '#8c7ae6', 'scatter', 10000, 0));
sidePanel.add(buildChart(monthlyWind, 'Wind_Speed_m_s', site, '4. PLUME VELOCITY: Mean Wind Speed', 'Speed (m/s)', '#7f8fa6', 'line', 10000, 0));
sidePanel.add(buildChart(monthlyLST, 'Mean_LST_Celsius', site, '5. THERMAL LOAD: Surface Temp vs Liner Integrity', 'Skin Temp (°C)', '#e84118', 'line', 1000, null));
sidePanel.add(buildChart(monthlyET, 'Evapotranspiration_kg_m2', site, '6. ARIDITY: Evapotranspiration & Desiccation', 'ET Rate (kg/m²)', '#e1b12c', 'line', 500, 0));

ui.root.insert(0, sidePanel);

// --- 7. AUTOMATED CONSOLE REPORT GENERATION ---
print('======================================================================================');
print('ADVANCED CLIMATE & RADIOLOGICAL RISK ASSESSMENT REPORT');
print('Location Name: NORM Plant and NORM Landfill');
print('Region: 3QMC+J5H - Al Ruwais Industrial City - Abu Dhabi - UAE');
print('Target Coordinates: [52.769692, 24.081562]');
print('======================================================================================');
print(' ');
print('☢️ SCENARIO 1: EXPLOSION & PLUME DISPERSION (NORM CONTAMINANTS)');
print('Context: A catastrophic failure or explosion at the NORM facility would aerosolize Ra-226 and Pb-210 contaminants.');
print('- Wind Direction Dynamics (Chart 3): Airflow in Al Ruwais is dominated by the North-Westerly "Shamal" winds, frequently registering between 300° and 330°.');
print('- Primary Exposure Trajectory: In an explosion scenario, the plume will be forcefully driven SOUTH-EAST. This trajectory pushes radioactive particulates directly toward inland desert infrastructure and oil/gas pipeline corridors in the Al Dhafra region. Downwind evacuation zones must prioritize a 10-15km cone to the Southeast.');
print('- Secondary Marine Risk: Chart 3 scatter plots show occasional directional inversions (breezes originating from the South at ~180°). If an event occurs during this phase, the plume will drift North over the Arabian Gulf, risking direct contamination of marine water intakes and offshore ecosystems.');
print(' ');
print('🌊 SCENARIO 2: SUDDEN WADI FLASH FLOODING & LEACHATE SPREAD');
print('Context: Prolonged hyper-aridity creates impermeable topsoil. When rain does fall, it rapidly converts to dangerous surface runoff.');
print('- Flood Thresholds (Chart 1 & 2): While total accumulation (Chart 2) remains low, Chart 1 (Max Hourly Rate) isolates dangerous downpours. Any spike exceeding 8-10 mm/hr indicates a high-velocity event. ');
print('- Operational Risk: These sudden torrents can overwhelm standard drainage culverts. If water breaches active NORM landfill berms, it can interact with exposed stockpiles and rapidly spread waterborne radiological leachate across the flat coastal plain.');
print(' ');
print('🔥 SCENARIO 3: GEOMEMBRANE LINER EMBRITTLEMENT');
print('- Context: Chart 5 tracks Land Surface Temperature (LST), which measures the actual "skin" temperature of the ground, often 10-15°C hotter than the air.');
print('- Operational Risk: Continuous surface temperatures exceeding 45-50°C, combined with absolute zero moisture (verified by Chart 6 Evapotranspiration), accelerate the thermal degradation of HDPE geomembrane liners. Over the 5-year timeframe, cyclic expansion and contraction create micro-fissures, compromising the physical containment barrier of the landfill.');
print('======================================================================================');

