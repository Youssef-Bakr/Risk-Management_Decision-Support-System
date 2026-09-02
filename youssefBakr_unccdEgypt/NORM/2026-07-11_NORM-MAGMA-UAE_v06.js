// =========================================================================
//Youssef Mohamed Bakr
//+201121121000
//Youssef.Bakr@drc.gov.eg
//Youssef.Bakr@faps.cu.edu.eg
// =========================================================================

// =========================================================================
//2026-07-11_NORM-MAGMA-UAE_v06
/* ========================================================================================
 * SECURITY-CLASSIFIED / SAFETY ENGINEERING WORKSPACE
 * ASSET: ADNOC CENTRALIZED NORM TREATMENT & DISPOSAL FACILITY (AL RUWAIS, UAE)
 * TARGET COORDINATES: [52.769692825414495, 24.081562392352257]
 * OPERATIONAL OBSERVATION WINDOW: 2020-01-01 to 2026-07-12 (REAL-TIME UPDATE)
 * DOCUMENTATION FRAMEWORK: QRA / HAZID / FANR-IAEA Safety Compliance Protocol
 * DEVELOPER: Youssef Bakr
 * ========================================================================================
 */

// --- 1. GEOSPATIAL PRIMING & RISK CONTAINMENT BUFFER ---
var siteCenter = ee.Geometry.Point([52.769692825414495, 24.081562392352257]);
var facilityImpactZone = siteCenter.buffer(20000); 
var startDate = ee.Date('2020-01-01');
var endDate = ee.Date('2026-07-12'); 

Map.setCenter(52.769692825414495, 24.081562392352257, 13);
Map.setOptions('SATELLITE'); 
Map.addLayer(siteCenter, {color: '#d63031'}, 'Target: NORM Facility', true);

var months = ee.List.sequence(1, 12);
var years = ee.List.sequence(2020, 2026); 

// --- 2. HAZARD VECTOR & SENSOR PROCESSING SPECS ---
var modisLST = ee.ImageCollection('MODIS/061/MOD11A1').filterBounds(siteCenter).filterDate(startDate, endDate)
  .map(function(img) { return img.select('LST_Day_1km').multiply(0.02).subtract(273.15).rename('HV_Thermal_LST_C').copyProperties(img, ['system:time_start']); });

var chirpsRain = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY").filterBounds(siteCenter).filterDate(startDate, endDate)
  .select(['precipitation'], ['HV_Hydrological_Rate_mm']); 

var era5WindField = ee.ImageCollection('ECMWF/ERA5/DAILY').filterBounds(siteCenter).filterDate(startDate, endDate)
  .map(function(img) {
    var u = img.select('u_component_of_wind_10m');
    var v = img.select('v_component_of_wind_10m');
    var speed = u.pow(2).add(v.pow(2)).sqrt().rename('Wind_Speed_ms');
    var dir = u.atan2(v).multiply(180).divide(Math.PI).add(180).mod(360).rename('Wind_Direction_Deg');
    return img.addBands([speed, dir]).copyProperties(img, ['system:time_start']);
  });

var s5pNO2 = ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_NO2').filterBounds(siteCenter).filterDate(startDate, endDate)
  .select(['tropospheric_NO2_column_number_density'], ['NO2_Density_mol_m2']);

var s5pCH4 = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_CH4').filterBounds(siteCenter).filterDate(startDate, endDate)
  .select(['CH4_column_volume_mixing_ratio_dry_air'], ['CH4_Mixing_Ratio_ppb']);

var s5pAER = ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_AER_AI').filterBounds(siteCenter).filterDate(startDate, endDate)
  .select(['absorbing_aerosol_index'], ['Aerosol_Index']);

var smapSoilMoisture = ee.ImageCollection('NASA_USDA/HSL/SMAP10KM_soil_moisture').filterBounds(siteCenter).filterDate(startDate, endDate)
  .select(['ssm'], ['Surface_Soil_Moisture_mm']);

// NEW: Active Fire Hazard History (FIRMS) for Charting
var firmsThermal = ee.ImageCollection('FIRMS').filterBounds(siteCenter).filterDate(startDate, endDate)
  .select(['T21'], ['HV_Fire_Temp_K']);

// --- 3. DYNAMIC TIME-SERIES LAYER INJECTION (OCT/NOV 2024 & JUL 2026) ---
var optVis = {bands: ['B4', 'B3', 'B2'], min: 0, max: 3000};
var sarVis = {bands: ['VV'], min: -25, max: 0};

// Function to automatically extract dates and add each image as a discrete map layer
function addDynamicDatedLayers(collection, layerPrefix, visParams, showVisible) {
  var dateList = collection.aggregate_array('system:time_start').map(function(d) {
    return ee.Date(d).format('YYYY-MM-dd');
  });
  var idList = collection.aggregate_array('system:index');
  
  ee.Dictionary({dates: dateList, ids: idList}).evaluate(function(res) {
    if (!res.dates || res.dates.length === 0) {
      print('Notice: No available acquisitions found for ' + layerPrefix);
      return;
    }
    for (var i = 0; i < res.dates.length; i++) {
      var img = collection.filter(ee.Filter.eq('system:index', res.ids[i])).first().clip(facilityImpactZone);
      var layerName = layerPrefix + ' | Acq: ' + res.dates[i];
      Map.addLayer(img, visParams, layerName, showVisible);
    }
  });
}

// Target Window 1: 25 Oct 2024 - 05 Nov 2024
var s2_OctNov24 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(facilityImpactZone).filterDate('2024-10-25', '2024-11-06').filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));
var s1_OctNov24 = ee.ImageCollection('COPERNICUS/S1_GRD').filterBounds(siteCenter).filterDate('2024-10-25', '2024-11-06').filter(ee.Filter.eq('instrumentMode', 'IW')).filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'));

// Target Window 2: July 2026 (01 Jul 2026 - Present)
var s2_Jul26 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(facilityImpactZone).filterDate('2026-07-01', '2026-07-12').filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));
var s1_Jul26 = ee.ImageCollection('COPERNICUS/S1_GRD').filterBounds(siteCenter).filterDate('2026-07-01', '2026-07-12').filter(ee.Filter.eq('instrumentMode', 'IW')).filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'));

// Execute Layer Automation (turning off visibility by default to prevent browser lag, except for July 2026 SAR)
addDynamicDatedLayers(s2_OctNov24, 'Optical (S2) Oct-Nov 2024', optVis, false);
addDynamicDatedLayers(s1_OctNov24, 'SAR (S1) Oct-Nov 2024', sarVis, false);
addDynamicDatedLayers(s2_Jul26, 'Optical (S2) July 2026', optVis, false);
addDynamicDatedLayers(s1_Jul26, 'SAR (S1) July 2026', sarVis, true);

// Add General Environment Baselines
Map.addLayer(s5pAER.mean().clip(facilityImpactZone), {min: -1, max: 2.0, palette: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']}, 'Dust/Aerosol Plume Baseline (S5P)', false);

// --- 4. SAFE MONTHLY TEMPORAL AGGREGATION PATTERN ---
function executeSafetyAggregation(collection, bandTarget, processingType) {
  return ee.ImageCollection(years.map(function(y) {
    return months.map(function(m) {
      var windowStart = ee.Date.fromYMD(y, m, 1);
      var windowEnd = windowStart.advance(1, 'month');
      var targetedSubset = collection.filterDate(windowStart, windowEnd).select(bandTarget);
      
      var calculatedMetrics = (processingType === 'max') ? targetedSubset.max() : targetedSubset.mean();
      var failsafeBlankCanvas = ee.Image.constant(0).mask(0).rename(bandTarget);
      var operationalOutput = ee.Algorithms.If(targetedSubset.size().gt(0), calculatedMetrics, failsafeBlankCanvas);
      
      return ee.Image(operationalOutput).set('system:time_start', windowStart.millis());
    });
  }).flatten());
}

var seriesPrecipMax = executeSafetyAggregation(chirpsRain, 'HV_Hydrological_Rate_mm', 'max');
var seriesWindDir   = executeSafetyAggregation(era5WindField, 'Wind_Direction_Deg', 'mean');
var seriesNO2       = executeSafetyAggregation(s5pNO2, 'NO2_Density_mol_m2', 'mean');
var seriesCH4       = executeSafetyAggregation(s5pCH4, 'CH4_Mixing_Ratio_ppb', 'mean');
var seriesAER       = executeSafetyAggregation(s5pAER, 'Aerosol_Index', 'max');
var seriesSM        = executeSafetyAggregation(smapSoilMoisture, 'Surface_Soil_Moisture_mm', 'mean');
var seriesFire      = executeSafetyAggregation(firmsThermal, 'HV_Fire_Temp_K', 'max');

// --- 5. SAFETY ENGINEERING CONTROL DASHBOARD INTERFACE ---
var dashboardPanel = ui.Panel({style: {width: '680px', padding: '20px', backgroundColor: '#ffffff', border: '1px solid #d63031'}});

dashboardPanel.add(ui.Label('Safety Analysis Report | NORM MAGMA UAE', {fontWeight: 'bold', fontSize: '20px', color: '#2d3436'}));
dashboardPanel.add(ui.Label('Prepared by: Youssef Bakr', {fontWeight: 'bold', fontSize: '13px', color: '#2d3436'}));

var contactPanel = ui.Panel({layout: ui.Panel.Layout.Flow('horizontal'), style: {backgroundColor: '#ffffff', margin: '0 0 5px 0'}});
contactPanel.add(ui.Label('LinkedIn Profile', {fontSize: '12px', color: '#0984e3', margin: '0 10px 0 0'}, 'https://www.linkedin.com/in/youssef-bakr'));
contactPanel.add(ui.Label('| Phone: +201121121000', {fontSize: '12px', color: '#2d3436', margin: '0'}));
dashboardPanel.add(contactPanel);

dashboardPanel.add(ui.Label('MAGMA UAE Official Portal', {fontSize: '12px', fontWeight: 'bold', color: '#c0392b'}, 'https://www.magmauae.com/norm'));
dashboardPanel.add(ui.Label('___________________________________________________', {color: '#b2bec3'}));

function generateSafetyCriticalChart(dataset, assetBand, reportTitle, verticalLabel, colorHex, renderType, riskDossierText, dataSourceText) {
  var analyticalChart = ui.Chart.image.series({
    imageCollection: dataset.select(assetBand), region: siteCenter, reducer: ee.Reducer.mean(), scale: 1000
  }).setOptions({
    title: reportTitle,
    vAxis: { title: verticalLabel, titleTextStyle: {bold: true, fontSize: 12}, textStyle: {fontSize: 11} },
    hAxis: { title: 'Date [Month & Year]', format: 'MMM yyyy', gridlines: {count: 8}, textStyle: {fontSize: 11} },
    series: {0: {color: colorHex, lineWidth: 2, pointSize: 3.5}},
    legend: {position: 'none'}, backgroundColor: '#ffffff', chartArea: {width: '82%', height: '65%'} 
  });

  if (renderType === 'bar') analyticalChart.setChartType('ColumnChart');
  else if (renderType === 'scatter') analyticalChart.setChartType('ScatterChart');

  var safetyTarpBox = ui.Panel({style: {padding: '12px', margin: '0 0 25px 0', border: '1px solid #d63031', backgroundColor: '#fdf1f1'}});
  safetyTarpBox.add(ui.Label('HAZARD DATA BRIEF:', {fontSize: '11px', fontWeight: 'bold', color: '#d63031', margin: '0 0 4px 0'}));
  safetyTarpBox.add(ui.Label(riskDossierText, {fontSize: '11px', color: '#2d3436', margin: '0'}));
  safetyTarpBox.add(ui.Label('Data Source & Methodology: ' + dataSourceText, {fontSize: '10px', color: '#636e72', fontStyle: 'italic', margin: '8px 0 0 0'}));

  dashboardPanel.add(analyticalChart).add(safetyTarpBox);
}

// Chart Generation Core
generateSafetyCriticalChart(seriesPrecipMax, 'HV_Hydrological_Rate_mm', 
  'CHART 1. HYDROLOGICAL HAZARD: Precipitation Peaks', 'Max Precipitation [mm]', '#0984e3', 'bar', 
  "Monitors storm-water runoff to prevent radioactive leachate leakage.", "UCSB-CHG/CHIRPS/DAILY.");

generateSafetyCriticalChart(seriesAER, 'Aerosol_Index', 
  'CHART 2. PARTICULATES: Dust & Sand Storm Events', 'UV Aerosol Index', '#d35400', 'bar', 
  "High peaks correlate with Shamal-driven sandstorms that can clog HVAC systems.", "COPERNICUS/S5P/NRTI/L3_AER_AI.");

generateSafetyCriticalChart(seriesSM, 'Surface_Soil_Moisture_mm', 
  'CHART 3. GEOTECHNICAL: Surface Soil Moisture', 'Soil Moisture [mm]', '#27ae60', 'line', 
  "Tracks terrain aridity. Low soil moisture exacerbates dust storm severity.", "NASA_USDA/HSL/SMAP10KM_soil_moisture.");

generateSafetyCriticalChart(seriesWindDir, 'Wind_Direction_Deg', 
  'CHART 4. METEOROLOGY: Plume Dispersion Trajectory', 'Wind Direction [Degrees]', '#6c5ce7', 'scatter', 
  "Maps Shamal wind patterns (North-West) vital for dispersion tracking.", "ECMWF/ERA5/DAILY.");

generateSafetyCriticalChart(seriesCH4, 'CH4_Mixing_Ratio_ppb', 
  'CHART 5. GREENHOUSE GASES: Methane (CH4) Emissions', 'CH4 Mixing Ratio [ppb]', '#f39c12', 'line', 
  "Monitors fugitive methane emissions from facility waste storage.", "COPERNICUS/S5P/OFFL/L3_CH4.");

// NEW CHART: Historical Active Fire
generateSafetyCriticalChart(seriesFire, 'HV_Fire_Temp_K', 
  'CHART 6. THERMAL ANOMALIES: Active Fire History', 'Max Temperature [K]', '#c0392b', 'bar', 
  "Tracks historical thermal anomalies indicating potential uncontrolled fire hazards, operational flare excursions, or abnormal incineration temperatures.", "FIRMS (Fire Information for Resource Management System).");

ui.root.insert(0, dashboardPanel);

// --- 6. AUTOMATED CONSOLE LOGGING ---
print('======================================================================================');
print('                OFFICIAL QUANTITATIVE RISK ASSESSMENT & SAFETY DOSSIER                ');
print('                FACILITY: CENTRALIZED NORM TREATMENT PLANT (AL RUWAIS)                ');
print('======================================================================================');
print('- DYNAMIC ISR IMAGERY LOADED: Optical (Sentinel-2) and SAR (Sentinel-1) layers for target periods (25 Oct - 05 Nov 2024 & July 2026) have been chronologically sorted, date-stamped, and injected into the map visualization array.');
print('- ACTIVE FIRE MONITORING: The static FIRMS map layer has been replaced with a continuous longitudinal historical chart (Chart 6) tracking peak thermal kelvin emissions across the facility timeline.');
print('======================================================================================');
