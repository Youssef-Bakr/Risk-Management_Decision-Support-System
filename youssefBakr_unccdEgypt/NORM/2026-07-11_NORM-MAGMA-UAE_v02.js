// =========================================================================
//Youssef Mohamed Bakr
//+201121121000
//Youssef.Bakr@drc.gov.eg
//Youssef.Bakr@faps.cu.edu.eg
// =========================================================================

// =========================================================================
//2026-07-11_NORM-MAGMA-UAE_v02
/* ========================================================================================
 * SECURITY-CLASSIFIED / SAFETY ENGINEERING WORKSPACE
 * ASSET: ADNOC CENTRALIZED NORM TREATMENT & DISPOSAL FACILITY (AL RUWAIS, UAE)
 * SPECIFIC GEOMETRIES: Landfill Perimeter Boundary & Containment Cells 1, 2, 3, and 4
 * TARGET COORDINATES: [52.769692825414495, 24.081562392352257] | Plus Code: 3QMC+J5H
 * OPERATIONAL OBSERVATION WINDOW: 2020-01-01 to 2026-07-11 (REAL-TIME UPDATE)
 * DOCUMENTATION FRAMEWORK: QRA / HAZID / FANR-IAEA Safety Compliance Protocol
 * DEVELOPER: Youssef Bakr
 * ========================================================================================
 */

// --- 1. GEOSPATIAL PRIMING & RISK CONTAINMENT BUFFER ---
var siteCenter = ee.Geometry.Point([52.769692825414495, 24.081562392352257]);
var facilityImpactZone = siteCenter.buffer(20000); // 20km Zone of Exposure (ZoE)
var startDate = ee.Date('2020-01-01');
var endDate = ee.Date('2026-07-11'); 

Map.setCenter(52.769692825414495, 24.081562392352257, 13);
Map.setOptions('SATELLITE'); 
Map.addLayer(siteCenter, {color: '#d63031'}, 'Target: NORM Facility [2020 - Jul 2026]', true);

var months = ee.List.sequence(1, 12);
var years = ee.List.sequence(2020, 2026); 

// --- 2. HAZARD VECTOR & SENSOR PROCESSING SPECS (WITH FIXES & NEW DATASETS) ---

// HV-1: Thermal Degradation Vector (MODIS LST)
var modisLST = ee.ImageCollection('MODIS/061/MOD11A1').filterBounds(siteCenter).filterDate(startDate, endDate)
  .map(function(img) { 
    return img.select('LST_Day_1km').multiply(0.02).subtract(273.15).rename('HV_Thermal_LST_C').copyProperties(img, ['system:time_start']); 
  });

// HV-2: Hydrological Inundation Vector [FIXED: Switched to CHIRPS Daily for robust rendering]
var chirpsRain = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY").filterBounds(siteCenter).filterDate(startDate, endDate)
  .select(['precipitation'], ['HV_Hydrological_Rate_mm']); 

// HV-3: Atmospheric Transport & Dispersion (ECMWF ERA5)
var era5WindField = ee.ImageCollection('ECMWF/ERA5/DAILY').filterBounds(siteCenter).filterDate(startDate, endDate)
  .map(function(img) {
    var u = img.select('u_component_of_wind_10m');
    var v = img.select('v_component_of_wind_10m');
    var speed = u.pow(2).add(v.pow(2)).sqrt().rename('Wind_Speed_ms');
    var dir = u.atan2(v).multiply(180).divide(Math.PI).add(180).mod(360).rename('Wind_Direction_Deg');
    return img.addBands([speed, dir]).copyProperties(img, ['system:time_start']);
  });

// HV-4: Atmospheric Chemistry - NO2 Emissions (Sentinel-5P)
var s5pNO2 = ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_NO2').filterBounds(siteCenter).filterDate(startDate, endDate)
  .select(['tropospheric_NO2_column_number_density'], ['NO2_Density_mol_m2']);

// HV-5: Atmospheric Chemistry - SO2 Emissions (Sentinel-5P)
var s5pSO2 = ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_SO2').filterBounds(siteCenter).filterDate(startDate, endDate)
  .select(['SO2_column_number_density'], ['SO2_Density_mol_m2']);

// HV-6: Water Vapor Monitoring (NCEP/NCAR Reanalysis)
var waterVaporNCEP = ee.ImageCollection('NCEP_RE/surface_wv').filterBounds(siteCenter).filterDate(startDate, endDate)
  .select(['pr_wtr'], ['Water_Vapor_kg_m2']);

// ISR-1 & ISR-2: Optical & Radar Reconnaissance
var s2TacticalOptical = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(facilityImpactZone).filterDate(startDate, endDate).filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10));
var s1TacticalRadar = ee.ImageCollection('COPERNICUS/S1_GRD').filterBounds(siteCenter).filterDate(startDate, endDate).filter(ee.Filter.eq('instrumentMode', 'IW')).filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'));

// --- 3. DYNAMIC ISR LAYER INJECTION WITH ACQUISITION DATES ---
// Evaluates the latest image date asynchronously and appends it to the map layer name
var latestS2 = s2TacticalOptical.sort('system:time_start', false).first();
latestS2.date().format('YYYY-MM-dd').evaluate(function(dateStr) {
  Map.addLayer(latestS2.clip(facilityImpactZone), {bands: ['B4', 'B3', 'B2'], min: 0, max: 3000}, '1. Optical ISR (Sentinel-2) | Acq: ' + dateStr, false);
});

var latestS1 = s1TacticalRadar.sort('system:time_start', false).first();
latestS1.date().format('YYYY-MM-dd').evaluate(function(dateStr) {
  Map.addLayer(latestS1.clip(facilityImpactZone), {bands: ['VV'], min: -25, max: 0}, '2. SAR Geotech (Sentinel-1) | Acq: ' + dateStr, true);
});

// Fixed Precipitation Layer
Map.addLayer(chirpsRain.max().clip(facilityImpactZone), {min: 0, max: 50, palette: ['#ffffff', '#00e5ff', '#00838f', '#01579b']}, '3. Max Precipitation (CHIRPS)', false);

// Atmospheric NO2 Plume Layer
var no2Vis = {min: 0, max: 0.0001, palette: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']};
Map.addLayer(s5pNO2.mean().clip(facilityImpactZone), no2Vis, '4. Mean NO2 Plume (Sentinel-5P)', false);

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
var seriesSO2       = executeSafetyAggregation(s5pSO2, 'SO2_Density_mol_m2', 'mean');
var seriesWV        = executeSafetyAggregation(waterVaporNCEP, 'Water_Vapor_kg_m2', 'mean');

// --- 5. SAFETY ENGINEERING CONTROL DASHBOARD INTERFACE ---
var dashboardPanel = ui.Panel({style: {width: '680px', padding: '20px', backgroundColor: '#ffffff', border: '1px solid #d63031'}});

dashboardPanel.add(ui.Label('Safety Analysis Report | NORM MAGMA UAE', {fontWeight: 'bold', fontSize: '20px', color: '#2d3436'}));
dashboardPanel.add(ui.Label('Prepared by: Youssef Bakr', {fontWeight: 'bold', fontSize: '13px', color: '#2d3436'}));
dashboardPanel.add(ui.Label('LinkedIn Profile', {fontSize: '12px', color: '#0984e3'}, 'https://www.linkedin.com/in/youssef-bakr'));
dashboardPanel.add(ui.Label('MAGMA UAE Official Portal', {fontSize: '12px', fontWeight: 'bold', color: '#c0392b'}, 'https://www.magmauae.com/norm'));
dashboardPanel.add(ui.Label('___________________________________________________', {color: '#b2bec3'}));

var aboutPanel = ui.Panel({style: {padding: '10px', backgroundColor: '#fdf1f1', border: '1px solid #fab1a0'}});
aboutPanel.add(ui.Label('ABOUT NORM FACILITY', {fontWeight: 'bold', fontSize: '12px', color: '#d63031'}));
aboutPanel.add(ui.Label('Designed to safely manage, treat, and responsibly dispose of NORM generated during exploration by ADNOC. Capacity: 6.5 KTA. Operations include high-pressure descaling, incineration, and ash encapsulation in compliance with FANR-IAEA.', {fontSize: '11px'}));
dashboardPanel.add(aboutPanel);

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

generateSafetyCriticalChart(seriesPrecipMax, 'HV_Hydrological_Rate_mm', 
  'CHART 1. HYDROLOGICAL HAZARD: Precipitation Peaks', 'Max Precipitation [mm]', '#0984e3', 'bar', 
  "Monitors storm-water runoff to prevent radioactive leachate leakage from the landfill's 2% basal slope drainage system.",
  "UCSB-CHG/CHIRPS/DAILY. Method: Maximum monthly spatial aggregation.");

generateSafetyCriticalChart(seriesWindDir, 'Wind_Direction_Deg', 
  'CHART 2. METEOROLOGY: Plume Dispersion Trajectory', 'Wind Direction [Degrees]', '#6c5ce7', 'scatter', 
  "Maps Shamal wind patterns (predominantly North-West) vital for calculating the dispersion footprint of incineration ash.",
  "ECMWF/ERA5/DAILY. Method: Trigonometric derivation of mean monthly U & V vectors.");

generateSafetyCriticalChart(seriesNO2, 'NO2_Density_mol_m2', 
  'CHART 3. ATMOSPHERIC CHEMISTRY: NO2 Emissions', 'NO2 Density [mol/m^2]', '#d63031', 'line', 
  "Monitors combustion byproducts from the facility's high-temperature incineration operations.",
  "COPERNICUS/S5P/NRTI/L3_NO2. Method: Monthly mean column number density calculation.");

generateSafetyCriticalChart(seriesSO2, 'SO2_Density_mol_m2', 
  'CHART 4. ATMOSPHERIC CHEMISTRY: SO2 Emissions', 'SO2 Density [mol/m^2]', '#e17055', 'line', 
  "Tracks sulfur dioxide outputs to ensure compliance with FANR-IAEA clean-air regulations during NORM processing.",
  "COPERNICUS/S5P/NRTI/L3_SO2. Method: Monthly mean column number density calculation.");

generateSafetyCriticalChart(seriesWV, 'Water_Vapor_kg_m2', 
  'CHART 5. CLIMATOLOGY: Atmospheric Water Vapor', 'Water Vapor [kg/m^2]', '#00b894', 'line', 
  "Tracks ambient humidity. High water vapor combined with NORM particulates can accelerate atmospheric acid formation and fallout.",
  "NCEP_RE/surface_wv. Method: Monthly mean surface water vapor pressure aggregation.");

ui.root.insert(0, dashboardPanel);

// --- 6. AUTOMATED CONSOLE LOGGING WITH REFERENCES ---
print('======================================================================================');
print('                OFFICIAL QUANTITATIVE RISK ASSESSMENT & SAFETY DOSSIER                ');
print('                FACILITY: CENTRALIZED NORM TREATMENT PLANT (AL RUWAIS)                ');
print('======================================================================================');
print('DATA CATALOG INTEGRATION & METHODOLOGY REFERENCE:');
print('1. Precipitation: UCSB-CHG/CHIRPS/DAILY (Replaced IMERG for enhanced local accuracy).');
print('2. Wind/Dispersion: ECMWF/ERA5/DAILY (U & V vectors to Degrees mapping).');
print('3. Atmospheric Chemistry: COPERNICUS/S5P/NRTI/L3_NO2 & L3_SO2 (Tropospheric Column Densities).');
print('   - Reference Tag: https://developers.google.com/earth-engine/datasets/tags/atmosphere');
print('4. Water Vapor: NCEP_RE/surface_wv (Surface pressure conversion to kg/m^2).');
print('   - Reference Tag: https://developers.google.com/earth-engine/datasets/tags/water-vapor');
print('5. Dynamic ISR Layers: Script automatically evaluates Sentinel-1 (SAR) & Sentinel-2 (Optical) collections to fetch and date-stamp the latest valid acquisition directly into the UI Map interface.');
print('======================================================================================');
