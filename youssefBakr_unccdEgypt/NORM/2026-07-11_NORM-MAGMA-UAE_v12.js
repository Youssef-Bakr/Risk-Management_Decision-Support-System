// =========================================================================
//Youssef Mohamed Bakr
//+201121121000
//Youssef.Bakr@drc.gov.eg
//Youssef.Bakr@faps.cu.edu.eg
// =========================================================================

// =========================================================================
//2026-07-11_NORM-MAGMA-UAE_v12
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

Map.setCenter(52.769692825414495, 24.081562392352257, 12);
Map.setOptions('SATELLITE'); 

// Target facility pin (SET TO ACTIVE)
Map.addLayer(siteCenter, {color: '#d63031'}, 'Target: NORM Facility', true);

var months = ee.List.sequence(1, 12);
var years = ee.List.sequence(2020, 2026); 

// --- 2. HAZARD VECTOR & SENSOR PROCESSING SPECS ---
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

var s5pCH4 = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_CH4').filterBounds(siteCenter).filterDate(startDate, endDate)
  .select(['CH4_column_volume_mixing_ratio_dry_air'], ['CH4_Mixing_Ratio_ppb']);

var s5pCO = ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_CO').filterBounds(siteCenter).filterDate(startDate, endDate)
  .select(['CO_column_number_density'], ['CO_Density_mol_m2']);

var s5pAER = ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_AER_AI').filterBounds(siteCenter).filterDate(startDate, endDate)
  .select(['absorbing_aerosol_index'], ['Aerosol_Index']);

var smapSoilMoisture = ee.ImageCollection('NASA_USDA/HSL/SMAP10KM_soil_moisture').filterBounds(siteCenter).filterDate(startDate, endDate)
  .select(['ssm'], ['Surface_Soil_Moisture_mm']);

var firmsThermal = ee.ImageCollection('FIRMS').filterBounds(siteCenter).filterDate(startDate, endDate)
  .select(['T21'], ['HV_Fire_Temp_K']);

var modisLST = ee.ImageCollection('MODIS/061/MOD11A1').filterBounds(siteCenter).filterDate(startDate, endDate)
  .map(function(img) { return img.select('LST_Day_1km').multiply(0.02).subtract(273.15).rename('HV_Thermal_LST_C').copyProperties(img, ['system:time_start']); });

// NEW: Static Datasets (Topography, Land Cover, Population)
var srtmDEM = ee.Image('USGS/SRTMGL1_003').clip(facilityImpactZone);
var terrainSlope = ee.Terrain.slope(srtmDEM);
var popDensity = ee.ImageCollection("WorldPop/GP/100m/pop").filterBounds(siteCenter).mean().clip(facilityImpactZone);
var landCover = ee.ImageCollection("ESA/WorldCover/v200").first().clip(facilityImpactZone);

// --- 3. DYNAMIC TIME-SERIES LAYER INJECTION (ALL SET TO ACTIVE) ---
var optVis = {bands: ['B4', 'B3', 'B2'], min: 0, max: 3000};
var sarVis = {bands: ['VV', 'VH', 'VV'], min: [-25, -30, -25], max: [0, -5, 0]};

function addDynamicDatedLayers(collection, layerPrefix, visParams, showVisible) {
  var dateList = collection.aggregate_array('system:time_start').map(function(d) {
    return ee.Date(d).format('YYYY-MM-dd');
  });
  var idList = collection.aggregate_array('system:index');
  
  ee.Dictionary({dates: dateList, ids: idList}).evaluate(function(res) {
    if (!res.dates || res.dates.length === 0) return;
    for (var i = 0; i < res.dates.length; i++) {
      var img = collection.filter(ee.Filter.eq('system:index', res.ids[i])).first().clip(facilityImpactZone);
      var layerName = res.dates[i] + ' | ' + layerPrefix;
      // FORCED TO ACTIVE
      Map.addLayer(img, visParams, layerName, true);
    }
  });
}

var s2_OctNov24 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(facilityImpactZone).filterDate('2024-10-25', '2024-11-06').filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));
var s1_OctNov24 = ee.ImageCollection('COPERNICUS/S1_GRD').filterBounds(siteCenter).filterDate('2024-10-25', '2024-11-06')
  .filter(ee.Filter.eq('instrumentMode', 'IW')).filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV')).filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'));

var s2_Jul26 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(facilityImpactZone).filterDate('2026-07-01', '2026-07-12').filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));
var s1_Jul26 = ee.ImageCollection('COPERNICUS/S1_GRD').filterBounds(siteCenter).filterDate('2026-07-01', '2026-07-12')
  .filter(ee.Filter.eq('instrumentMode', 'IW')).filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV')).filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'));

// Adding tactical layers to the map (All explicitly set to ACTIVE / true)
addDynamicDatedLayers(s2_OctNov24, 'S2 Optical', optVis, true);
addDynamicDatedLayers(s1_OctNov24, 'S1 SAR RGB', sarVis, true);
addDynamicDatedLayers(s2_Jul26, 'S2 Optical', optVis, true);
addDynamicDatedLayers(s1_Jul26, 'S1 SAR RGB', sarVis, true);

// --- 4. ANALYTICAL BASELINE LAYERS (ALL SET TO ACTIVE / TRUE) ---
// Topography & Exposure Layers Added
Map.addLayer(landCover, {bands: ['Map']}, 'ESA WorldCover 10m (Land Use)', true);
Map.addLayer(popDensity, {min: 0, max: 50, palette: ['#2d3436', '#0984e3', '#f39c12', '#d63031']}, 'WorldPop Density (Exposure Zone)', true);
Map.addLayer(srtmDEM, {min: 0, max: 150, palette: ['#006600', '#E5FFCC', '#FFE5CC', '#FFB266', '#FF8000']}, 'SRTM DEM Topography [Elevation]', true);
Map.addLayer(terrainSlope, {min: 0, max: 15, palette: ['#ffffff', '#f1c40f', '#e67e22', '#c0392b']}, 'SRTM Terrain Slope [Runoff Potential]', true);

Map.addLayer(chirpsRain.max().clip(facilityImpactZone), {min: 0, max: 50, palette: ['#ffffff', '#00e5ff', '#00838f', '#01579b']}, 'Chart 1: Max Precipitation Baseline', true);
Map.addLayer(s5pAER.mean().clip(facilityImpactZone), {min: -1, max: 2.0, palette: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']}, 'Chart 2: Mean Dust/Aerosol Baseline', true);
Map.addLayer(smapSoilMoisture.mean().clip(facilityImpactZone), {min: 0, max: 25, palette: ['#d63031', '#f1c40f', '#27ae60', '#0984e3']}, 'Chart 3: Mean Soil Moisture Baseline', true);
Map.addLayer(modisLST.mean().clip(facilityImpactZone), {min: 25, max: 55, palette: ['#0984e3', '#f1c40f', '#e67e22', '#d63031']}, 'Chart 4: Land Surface Temp (LST)', true);
Map.addLayer(s5pCO.mean().clip(facilityImpactZone), {min: 0.02, max: 0.04, palette: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']}, 'Chart 5: Carbon Monoxide (CO)', true);
Map.addLayer(firmsThermal.max().clip(facilityImpactZone), {min: 300, max: 500, palette: ['black', 'red', 'orange', 'yellow']}, 'Chart 6: Max Historical Fire Temp', true);

// --- 5. SAFE MONTHLY TEMPORAL AGGREGATION PATTERN FOR CHARTS ---
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
var seriesAER       = executeSafetyAggregation(s5pAER, 'Aerosol_Index', 'max');
var seriesSM        = executeSafetyAggregation(smapSoilMoisture, 'Surface_Soil_Moisture_mm', 'mean');
var seriesLST       = executeSafetyAggregation(modisLST, 'HV_Thermal_LST_C', 'mean');
var seriesCO        = executeSafetyAggregation(s5pCO, 'CO_Density_mol_m2', 'mean');
var seriesFire      = executeSafetyAggregation(firmsThermal, 'HV_Fire_Temp_K', 'max');

// --- 6. SAFETY ENGINEERING CONTROL DASHBOARD INTERFACE ---
var dashboardPanel = ui.Panel({style: {width: '680px', padding: '20px', backgroundColor: '#ffffff', border: '1px solid #d63031'}});

dashboardPanel.add(ui.Label('Safety Analysis Report | NORM MAGMA UAE', {fontWeight: 'bold', fontSize: '20px', color: '#2d3436'}));
dashboardPanel.add(ui.Label('Prepared by: Youssef Bakr', {fontWeight: 'bold', fontSize: '13px', color: '#2d3436'}));

var contactPanel = ui.Panel({layout: ui.Panel.Layout.Flow('horizontal'), style: {backgroundColor: '#ffffff', margin: '0 0 5px 0'}});
contactPanel.add(ui.Label('LinkedIn Profile', {fontSize: '12px', color: '#0984e3', margin: '0 10px 0 0'}, 'https://www.linkedin.com/in/youssef-bakr'));
contactPanel.add(ui.Label('| Phone: +201121121000', {fontSize: '12px', color: '#2d3436', margin: '0'}));
dashboardPanel.add(contactPanel);

dashboardPanel.add(ui.Label('MAGMA UAE Official Portal', {fontSize: '12px', fontWeight: 'bold', color: '#c0392b'}, 'https://www.magmauae.com/norm'));
dashboardPanel.add(ui.Label('___________________________________________________', {color: '#b2bec3'}));

// STATIC TOPOGRAPHY & DEMOGRAPHIC ANALYSIS MODULE
var topoPanel = ui.Panel({style: {padding: '12px', margin: '15px 0 20px 0', border: '1px solid #0984e3', backgroundColor: '#eef2f5'}});
topoPanel.add(ui.Label('GEOSPATIAL SITE ASSESSMENT: Topography & Demographics', {fontSize: '12px', fontWeight: 'bold', color: '#0984e3', margin: '0 0 8px 0'}));
topoPanel.add(ui.Label('• TOPOGRAPHY (SRTM DEM): The facility sits in a relatively flat, low-lying coastal desert zone. Low slope gradients indicate high susceptibility to water pooling during extreme precipitation events. Stormwater trenching must account for zero-gravity natural drainage.', {fontSize: '11px', color: '#2d3436', margin: '0 0 6px 0'}));
topoPanel.add(ui.Label('• POPULATION EXPOSURE (WorldPop): Analyzes the 20km QRA buffer zone. High population density vectors downwind necessitate stringent airborne particulate control to meet FANR safety protocols.', {fontSize: '11px', color: '#2d3436', margin: '0'}));
dashboardPanel.add(topoPanel);

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
  'CHART 1. HYDROLOGICAL: Precipitation Peaks', 'Max Precipitation [mm]', '#0984e3', 'bar', 
  "Monitors storm-water runoff to prevent radioactive leachate leakage.", "UCSB-CHG/CHIRPS/DAILY.");

generateSafetyCriticalChart(seriesAER, 'Aerosol_Index', 
  'CHART 2. PARTICULATES: Dust & Sand Storm Events', 'UV Aerosol Index', '#d35400', 'bar', 
  "High peaks correlate with Shamal-driven sandstorms that can clog HVAC systems.", "COPERNICUS/S5P/NRTI/L3_AER_AI.");

generateSafetyCriticalChart(seriesSM, 'Surface_Soil_Moisture_mm', 
  'CHART 3. GEOTECHNICAL: Surface Soil Moisture', 'Soil Moisture [mm]', '#27ae60', 'line', 
  "Tracks terrain aridity. Low soil moisture exacerbates dust storm severity.", "NASA_USDA/HSL/SMAP10KM_soil_moisture.");

generateSafetyCriticalChart(seriesLST, 'HV_Thermal_LST_C', 
  'CHART 4. CLIMATOLOGY: Land Surface Temperature', 'Temperature [Celsius]', '#e67e22', 'line', 
  "Monitors extreme ground thermal loads affecting concrete structural integrity and volatile chemical storage.", "MODIS/061/MOD11A1.");

generateSafetyCriticalChart(seriesCO, 'CO_Density_mol_m2', 
  'CHART 5. EMISSIONS: Carbon Monoxide (CO)', 'CO Density [mol/m^2]', '#8e44ad', 'line', 
  "Monitors incomplete combustion markers from facility incinerators or heavy vehicular logistics.", "COPERNICUS/S5P/NRTI/L3_CO.");

generateSafetyCriticalChart(seriesFire, 'HV_Fire_Temp_K', 
  'CHART 6. THERMAL ANOMALIES: Active Fire History', 'Max Temperature [K]', '#c0392b', 'bar', 
  "Tracks historical thermal anomalies indicating potential uncontrolled fire hazards.", "FIRMS.");

ui.root.insert(0, dashboardPanel);

// --- 7. AUTOMATED CONSOLE LOGGING ---
print('======================================================================================');
print('                OFFICIAL QUANTITATIVE RISK ASSESSMENT & SAFETY DOSSIER                ');
print('                FACILITY: CENTRALIZED NORM TREATMENT PLANT (AL RUWAIS)                ');
print('======================================================================================');
print('- VISIBILITY OVERRIDE: All layer rendering flags have been forced to ACTIVE (true). Warning: Concurrent loading of high-density time-series data may induce local browser memory limits.');
print('- TOPOGRAPHY INTEGRATION: SRTM Digital Elevation Model (USGS/SRTMGL1_003) and Terrain Slope derivatives have been added to evaluate stormwater runoff physics.');
print('- EXPANDED ANALYSIS: Added ESA WorldCover (Land Use), WorldPop (Population Exposure), MODIS Land Surface Temperature (LST), and Sentinel-5P Carbon Monoxide (CO) tracking for robust safety compliance.');
print('======================================================================================');
