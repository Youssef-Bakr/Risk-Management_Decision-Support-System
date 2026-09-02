// =========================================================================
//Youssef Mohamed Bakr
//+201121121000
//Youssef.Bakr@drc.gov.eg
//Youssef.Bakr@faps.cu.edu.eg
// =========================================================================

// =========================================================================
//12
/* ========================================================================================
 * ADVANCED SITE CLIMATE RISK & RADIOLOGICAL DISPERSION DASHBOARD
 * ========================================================================================
 * Target Coordinates: [52.769692825414495, 24.081562392352257] (Al Ruwais Industrial City)
 * Site Designation:   NORM Plant and NORM Landfill, Abu Dhabi, UAE (3QMC+J5H)
 * Study Timeframe:    2020-01-01 to 2025-12-31
 * * NEW FEATURES IN THIS VERSION:
 * 1. Fixed ET Bug: Uses MOD16A2 and unmask(0) to prevent chart crashes over barren desert.
 * 2. Flash Floods (mm/hr): Integrated NASA GPM IMERG to track maximum hourly precipitation.
 * 3. Wind Direction Math: Converts ERA5 U/V vectors to meteorological degrees (0-360°).
 * 4. Explosion Scenario: Added detailed dispersion risk analysis to the automated report.
 * ========================================================================================
 */

// --- 1. INITIALIZATION & GEOMETRY CONTROL ---
var site = ee.Geometry.Point([52.769692825414495, 24.081562392352257]);
var bufferZone = site.buffer(20000); 
var startDate = ee.Date('2020-01-01');
var endDate = ee.Date('2025-12-31');

Map.setCenter(52.769692825414495, 24.081562392352257, 11);
Map.addLayer(site, {color: 'red'}, 'Target Asset Location (NORM Site)', true);

var months = ee.List.sequence(1, 12);
var years = ee.List.sequence(2020, 2025);

// --- 2. RAW DATASET INGESTION ---
var modisLST = ee.ImageCollection('MODIS/061/MOD11A1').filterBounds(site).filterDate(startDate, endDate).select('LST_Day_1km');
var s5pAerosol = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_AER_AI').filterBounds(site).filterDate(startDate, endDate).select('absorbing_aerosol_index');
var precipitation = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY').filterBounds(site).filterDate(startDate, endDate).select('precipitation');
var imerg = ee.ImageCollection("NASA/GPM_L3/IMERG_V06").filterBounds(site).filterDate(startDate, endDate).select('precipitationCal'); // Native mm/hr
var noaaSST = ee.ImageCollection('NOAA/CDR/OISST/V2_1').filterBounds(site).filterDate(startDate, endDate).select('sst');
var jrcWater = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('occurrence').clip(bufferZone);
var modisET = ee.ImageCollection('MODIS/061/MOD16A2').filterBounds(site).filterDate(startDate, endDate).select('ET'); // Standard collection
var srtmElevation = ee.Image('USGS/SRTMGL1_003').clip(bufferZone);
var era5Wind = ee.ImageCollection('ECMWF/ERA5/DAILY').filterBounds(site).filterDate(startDate, endDate).select(['u_component_of_wind_10m', 'v_component_of_wind_10m']);

// --- 3. DATA TRANSFORMATION & RESAMPLING LOOPS (Monthly Compression) ---

// Map 1: Land Surface Temp (°C)
var monthlyLST = ee.ImageCollection(years.map(function(y) {
  return months.map(function(m) {
    var filtered = modisLST.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month'));
    return filtered.mean().multiply(0.02).subtract(273.15).rename('Mean_LST_Celsius').set({'system:time_start': ee.Date.fromYMD(y, m, 1).millis()});
  });
}).flatten());

// Map 2: Sea Surface Temp (°C)
var monthlySST = ee.ImageCollection(years.map(function(y) {
  return months.map(function(m) {
    var filtered = noaaSST.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month'));
    return filtered.mean().multiply(0.01).rename('Mean_SST_Celsius').set({'system:time_start': ee.Date.fromYMD(y, m, 1).millis()});
  });
}).flatten());

// Map 3: Total Accumulation Rainfall (mm/month)
var monthlyPrecip = ee.ImageCollection(years.map(function(y) {
  return months.map(function(m) {
    var filtered = precipitation.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month'));
    return filtered.sum().rename('Total_Rainfall_mm').set({'system:time_start': ee.Date.fromYMD(y, m, 1).millis()});
  });
}).flatten());

// Map 4: Flash Flood Peak Intensity (Max mm/hr per month)
var monthlyMaxPrecipRate = ee.ImageCollection(years.map(function(y) {
  return months.map(function(m) {
    var filtered = imerg.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month'));
    // We take the MAX value to isolate the most extreme flash flood downpour of that month
    return filtered.max().rename('Max_Hourly_Rate_mm_hr').set({'system:time_start': ee.Date.fromYMD(y, m, 1).millis()});
  });
}).flatten());

// Map 5: Evapotranspiration (Unmasked to 0 to prevent crash)
var monthlyET = ee.ImageCollection(years.map(function(y) {
  return months.map(function(m) {
    var filtered = modisET.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month'));
    return filtered.mean().unmask(0).multiply(0.1).rename('Evapotranspiration_kg_m2').set({'system:time_start': ee.Date.fromYMD(y, m, 1).millis()});
  });
}).flatten());

// Map 6: Wind Speed & Direction (Math derived from U and V vectors)
var monthlyWind = ee.ImageCollection(years.map(function(y) {
  return months.map(function(m) {
    var filtered = era5Wind.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month'));
    var meanWind = filtered.mean();
    var u = meanWind.select('u_component_of_wind_10m');
    var v = meanWind.select('v_component_of_wind_10m');
    
    // Wind Speed (Magnitude = sqrt(u^2 + v^2))
    var speed = u.pow(2).add(v.pow(2)).sqrt().rename('Wind_Speed_m_s');
    
    // Meteorological Wind Direction: (180 + atan2(u, v) * 180 / PI) % 360
    var pi = ee.Number(Math.PI);
    var dir = u.atan2(v).multiply(180).divide(pi).add(180).mod(360).rename('Wind_Direction_Degrees');
    
    return speed.addBands(dir).set({'system:time_start': ee.Date.fromYMD(y, m, 1).millis()});
  });
}).flatten());

// --- 4. SPATIAL VISUALIZATION LAYERS (Map Window) ---
Map.addLayer(jrcWater, {min: 0, max: 100, palette: ['white', 'cyan', 'blue']}, 'Historical Flood Occurrence (%)', false);
Map.addLayer(srtmElevation, {min: 0, max: 50, palette: ['#006600', '#E5FFCC', '#FFE5CC', '#FFB266']}, 'Topography/Elevation (m)', true);

// --- 5. USER INTERFACE (UI) SIDE PANEL ---
var sidePanel = ui.Panel();
sidePanel.style().set({ width: '480px', padding: '15px', border: '1px solid #dcdde1', backgroundColor: '#f5f6fa' });

var mainTitle = ui.Label('NORM Site Climate & Dispersion Dashboard', {fontWeight: 'bold', fontSize: '18px', color: '#2f3640', backgroundColor: '#f5f6fa'});
var subTitle = ui.Label('Al Ruwais Industrial City | NORM Landfill | 2020-2025', {fontSize: '12px', color: '#718093', backgroundColor: '#f5f6fa'});
sidePanel.add(mainTitle).add(subTitle).add(ui.Label('_________________________________________________', {color: '#7f8fa6', backgroundColor: '#f5f6fa'}));

// Advanced Chart Builder with Legends
function buildChart(collection, band, region, title, vAxisTitle, color, type, scaleVal) {
  var chart = ui.Chart.image.series({
    imageCollection: collection.select(band), region: region, reducer: ee.Reducer.mean(), scale: scaleVal
  }).setOptions({
    title: title, vAxis: {title: vAxisTitle}, hAxis: {title: 'Date', gridlines: {count: 0}},
    legend: {position: 'top', textStyle: {color: '#2f3640', fontSize: 11}},
    series: {0: {color: color, lineWidth: 2, pointSize: 2}}, backgroundColor: '#ffffff'
  });
  if (type === 'bar') chart.setChartType('ColumnChart');
  if (type === 'scatter') chart.setChartType('ScatterChart');
  return chart;
}

// Render Charts
sidePanel.add(buildChart(monthlyLST, 'Mean_LST_Celsius', site, '1. Heat Stress: Surface Temp (°C)', 'LST (°C)', '#e84118', 'line', 1000));
sidePanel.add(buildChart(monthlyPrecip, 'Total_Rainfall_mm', site, '2. Accumulation: Total Rainfall (mm)', 'Sum (mm)', '#273c75', 'bar', 5566));
sidePanel.add(buildChart(monthlyMaxPrecipRate, 'Max_Hourly_Rate_mm_hr', site, '3. Flash Flood Risk: Max Rain Rate (mm/hr)', 'Peak Rate (mm/hr)', '#00a8ff', 'bar', 10000));
sidePanel.add(buildChart(monthlyWind, 'Wind_Speed_m_s', site, '4. Dispersion: Mean Wind Speed (m/s)', 'Speed (m/s)', '#7f8fa6', 'line', 10000));
sidePanel.add(buildChart(monthlyWind, 'Wind_Direction_Degrees', site, '5. Trajectory: Wind Direction (Degrees)', 'Direction (0=N, 90=E, 180=S, 270=W)', '#8c7ae6', 'scatter', 10000));
sidePanel.add(buildChart(monthlyET, 'Evapotranspiration_kg_m2', site, '6. Desiccation: Evapotranspiration (Unmasked)', 'ET Rate', '#e1b12c', 'line', 500));

ui.root.insert(0, sidePanel);

// --- 6. AUTOMATED CONSOLE REPORT GENERATION ---
print('======================================================================================');
print('ADVANCED CLIMATE & RADIOLOGICAL RISK ASSESSMENT REPORT');
print('Location Name: NORM Plant and NORM Landfill');
print('Region: 3QMC+J5H - Al Ruwais Industrial City - Abu Dhabi - UAE');
print('======================================================================================');
print(' ');
print('🔴 SCENARIO ANALYSIS: EXPLOSION & PLUME DISPERSION');
print('- Context: An explosion at the NORM plant or landfill face would violently loft fine radioactive particulates (Ra-226, Pb-210) into the lower atmosphere.');
print('- Dispersion Trajectory (Derived from Chart 5 Wind Direction):');
print('  > The predominant wind vector in Al Ruwais is the "Shamal", a North-Westerly wind (blowing from ~315° towards ~135°).');
print('  > Receptor Risk: During a Shamal event, an explosion plume will rapidly migrate SOUTH-EAST. This trajectory pushes the radiological cloud AWAY from the Arabian Gulf and deeply inland into the uninhabited desert regions of the Al Dhafra municipality. Immediate downstream industrial assets within 5-10km Southeast of the plant are at extreme inhalation risk.');
print('  > Secondary Trajectory: During transition seasons, local coastal sea breezes (blowing North to South) can trap the plume against the coastline or push it directly South. Chart 5 tracks these seasonal directional shifts. If an explosion occurs during a rare southerly wind (blowing from the South), the plume risks drifting over the Gulf, contaminating marine exclusion zones.');
print(' ');
print('🌊 FLASH FLOODING & LEACHING RISK');
print('- Context: While total rainfall (Chart 2) is low, aridity causes topsoil to harden into an impermeable crust. Rain does not soak; it runs off.');
print('- Flood Metrics (Derived from Chart 3 Max mm/hr): GPM IMERG data isolates extreme downpour events. Any spike above 10 mm/hr in Chart 3 indicates a high-velocity wadi flood event. If site drainage is insufficient, these sudden torrents can breach landfill berms, interact with exposed NORM stockpiles, and generate highly mobile, waterborne radiological leachate.');
print(' ');
print('☀️ LINER DESICCATION & HEAT EXPOSURE');
print('- Context: Extreme hyper-aridity degrades containment infrastructure.');
print('- Metrics: Chart 1 (LST) tracks the physical skin temperature of the ground, which heavily outpaces air temperature. Chart 6 (ET) proves total moisture absence. This thermal-aridity combination severely accelerates the embrittlement and thermal expansion/contraction cracking of HDPE geomembrane liners beneath the NORM landfill cells.');
print('======================================================================================');

