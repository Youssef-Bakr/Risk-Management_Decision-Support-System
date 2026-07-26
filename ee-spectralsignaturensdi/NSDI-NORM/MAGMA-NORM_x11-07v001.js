// =========================================================================
//Youssef Mohamed Bakr
//+201121121000
//Youssef.Bakr@drc.gov.eg
//Youssef.Bakr@faps.cu.edu.eg
// =========================================================================

// =========================================================================
//2026-07-11_NORM-MAGMA-UAE_v01
/* ========================================================================================
 * SECURITY-CLASSIFIED / SAFETY ENGINEERING WORKSPACE
 * ASSET: ADNOC CENTRALIZED NORM TREATMENT & DISPOSAL FACILITY (AL RUWAIS, UAE)
 * SPECIFIC GEOMETRIES: Landfill Perimeter Boundary & Containment Cells 1, 2, 3, and 4
 * TARGET COORDINATES: [52.769692825414495, 24.081562392352257] | Plus Code: 3QMC+J5H
 * OPERATIONAL OBSERVATION WINDOW: 2020-01-01 to 2026-07-10 (REAL-TIME UPDATE)
 * DOCUMENTATION FRAMEWORK: QRA / HAZID / FANR-IAEA Safety Compliance Protocol
 * DEVELOPER: Youssef Bakr
 * ========================================================================================
 */

// --- 1. GEOSPATIAL PRIMING & RISK CONTAINMENT BUFFER ---
var siteCenter = ee.Geometry.Point([52.769692825414495, 24.081562392352257]);
var facilityImpactZone = siteCenter.buffer(20000); // 20km Zone of Exposure (ZoE)
var startDate = ee.Date('2020-01-01');
var endDate = ee.Date('2026-07-11'); 

// Set map alignment and force standard default view to Satellite
Map.setCenter(52.769692825414495, 24.081562392352257, 13);
Map.setOptions('SATELLITE'); 
Map.addLayer(siteCenter, {color: '#d63031'}, 'Target: NORM Facility [2020 - 10 Jul 2026]', true);

// Unified temporal aggregation sequences to encompass extended 2026 horizon
var months = ee.List.sequence(1, 12);
var years = ee.List.sequence(2020, 2026); 

// --- 2. HAZARD VECTOR INGESTION & SENSOR PROCESSING SPECS ---

// HV-1: Thermal Degradation Vector (MODIS Land Surface Temp)
var modisLST = ee.ImageCollection('MODIS/061/MOD11A1').filterBounds(siteCenter).filterDate(startDate, endDate)
  .map(function(img) { 
    return img.select('LST_Day_1km').multiply(0.02).subtract(273.15)
      .rename('HV_Thermal_LST_C').copyProperties(img, ['system:time_start']); 
  });

// HV-2: Hydrological Inundation Vector (NASA GPM IMERG Core Precipitation - mm/hr)
var imergRain = ee.ImageCollection("NASA/GPM_L3/IMERG_V06").filterBounds(siteCenter).filterDate(startDate, endDate)
  .select(['precipitationCal'], ['HV_Hydrological_Rate_mm_hr']); 

// HV-3: Atmospheric Transport & Dispersion Vector (ECMWF ERA5 Daily Reanalysis)
var era5WindField = ee.ImageCollection('ECMWF/ERA5/DAILY').filterBounds(siteCenter).filterDate(startDate, endDate)
  .map(function(img) {
    var u = img.select('u_component_of_wind_10m').rename('U_Vector');
    var v = img.select('v_component_of_wind_10m').rename('V_Vector');
    var speed = u.pow(2).add(v.pow(2)).sqrt().rename('Wind_Speed_ms');
    var pi = ee.Number(Math.PI);
    var dir = u.atan2(v).multiply(180).divide(pi).add(180).mod(360).rename('Wind_Direction_Deg');
    return img.addBands([speed, dir, u, v]).copyProperties(img, ['system:time_start']);
  });

// HV-4: Thermal Runaway & Exothermic Fire Vector (NASA FIRMS Active Fire Analytics)
var firmsThermalAnomalies = ee.ImageCollection('FIRMS').filterBounds(siteCenter).filterDate(startDate, endDate)
  .map(function(img) { 
    return img.select(['T21', 'confidence']).rename(['HV_Incinerator_Temp_K', 'HV_Fire_Confidence_Pct'])
      .copyProperties(img, ['system:time_start']); 
  });

// ISR-1 & ISR-2: Optical & Radar Reconnaissance
var s2TacticalOptical = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(facilityImpactZone).filterDate(startDate, endDate)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10));

var s1TacticalRadar = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterBounds(siteCenter).filterDate(startDate, endDate)
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'));

// --- 3. CLIMATE RISK ANALYSIS: TOPOGRAPHIC VULNERABILITY & SEA LEVEL RISE ---
var srtmDem = ee.Image('USGS/SRTMGL1_003').clip(facilityImpactZone);
var criticalInundationThreshold = 3.5; 
var coastalInundationExposureZone = srtmDem.lte(criticalInundationThreshold)
  .updateMask(srtmDem.lte(criticalInundationThreshold))
  .rename('SLR_Inundation_Vulnerability');

// --- 4. SAFE MONTHLY TEMPORAL AGGREGATION PATTERN ---
function executeSafetyAggregation(collection, bandTarget, processingType) {
  return ee.ImageCollection(years.map(function(y) {
    return months.map(function(m) {
      var windowStart = ee.Date.fromYMD(y, m, 1);
      var windowEnd = windowStart.advance(1, 'month');
      var targetedSubset = collection.filterDate(windowStart, windowEnd).select(bandTarget);
      
      var calculatedMetrics;
      if (processingType === 'sum') calculatedMetrics = targetedSubset.sum();
      else if (processingType === 'max') calculatedMetrics = targetedSubset.max();
      else calculatedMetrics = targetedSubset.mean();

      var failsafeBlankCanvas = ee.Image.constant(0).mask(0).rename(bandTarget);
      var operationalOutput = ee.Algorithms.If(targetedSubset.size().gt(0), calculatedMetrics, failsafeBlankCanvas);
      
      return ee.Image(operationalOutput).set('system:time_start', windowStart.millis());
    });
  }).flatten());
}

var seriesLST = executeSafetyAggregation(modisLST, 'HV_Thermal_LST_C', 'mean');
var seriesPrecipMax = executeSafetyAggregation(imergRain, 'HV_Hydrological_Rate_mm_hr', 'max');
var seriesWindDir = executeSafetyAggregation(era5WindField, 'Wind_Direction_Deg', 'mean');
var seriesWindV = executeSafetyAggregation(era5WindField, 'V_Vector', 'mean');
var seriesFireT21 = executeSafetyAggregation(firmsThermalAnomalies, 'HV_Incinerator_Temp_K', 'max');
var seriesFireConf = executeSafetyAggregation(firmsThermalAnomalies, 'HV_Fire_Confidence_Pct', 'max');
var seriesSAR_VV = executeSafetyAggregation(s1TacticalRadar, 'VV', 'mean');
var seriesSAR_VH = executeSafetyAggregation(s1TacticalRadar, 'VH', 'mean');

// --- 5. VISUAL RECONNAISSANCE OVERLAYS ---
Map.addLayer(coastalInundationExposureZone, {palette: ['#0984e3'], opacity: 0.75}, '1. SLR Inundation (<=3.5m) [2020-2026]', true);
Map.addLayer(imergRain.select('HV_Hydrological_Rate_mm_hr').max().clip(facilityImpactZone), {min: 0, max: 12, palette: ['#ffffff', '#74b9ff', '#0984e3', '#6c5ce7']}, '2. Max Precip. (mm/hr)', false);
Map.addLayer(s1TacticalRadar.sort('system:time_start', false).first().clip(facilityImpactZone), {bands: ['VV', 'VH', 'VV'], min: -22, max: -3}, '3. SAR ISR (Latest)', true);

// --- 6. SAFETY ENGINEERING CONTROL DASHBOARD INTERFACE ---
var dashboardPanel = ui.Panel({style: {width: '650px', padding: '20px', backgroundColor: '#ffffff', border: '1px solid #d63031'}});

// Header & Professional Info
dashboardPanel.add(ui.Label('Safety Analysis Report | NORM MAGMA UAE', {fontWeight: 'bold', fontSize: '20px', color: '#2d3436'}));
dashboardPanel.add(ui.Label('Prepared by: Youssef Bakr', {fontWeight: 'bold', fontSize: '13px', color: '#2d3436'}));
dashboardPanel.add(ui.Label('LinkedIn: www.linkedin.com/in/youssef-bakr', {fontSize: '12px', color: '#0984e3'}, 'https://www.linkedin.com/in/youssef-bakr'));
dashboardPanel.add(ui.Label('MAGMA UAE Official Portal', {fontSize: '12px', fontWeight: 'bold', color: '#c0392b'}, 'https://www.magmauae.com/norm'));
dashboardPanel.add(ui.Label('___________________________________________________', {color: '#b2bec3'}));

// About NORM Section
var aboutPanel = ui.Panel({style: {padding: '10px', backgroundColor: '#fdf1f1', border: '1px solid #fab1a0'}});
aboutPanel.add(ui.Label('ABOUT NORM FACILITY', {fontWeight: 'bold', fontSize: '12px', color: '#d63031'}));
aboutPanel.add(ui.Label('Designed to safely manage, treat, and responsibly dispose of NORM generated during exploration and production activities by ADNOC Operating Companies (OPCOs), the NORM plant is the first facility in the world to combine all Naturally Occurring Radioactive Materials’ treatment units and disposal in one facility.', {fontSize: '11px'}));
aboutPanel.add(ui.Label('With a capacity of 6.5 KTA, this facility incorporates a high-pressure water descaling system, incineration processes, and encapsulation of ashes to ensure the proper treatment and disposal of NORM waste.', {fontSize: '11px'}));
aboutPanel.add(ui.Label('NORM has implemented automated systems that help eliminate the need for manual handling of potentially hazardous materials, significantly reducing the radiation exposure risk of workers in operation.', {fontSize: '11px'}));
aboutPanel.add(ui.Label('This facility has been established in compliance with the ‘Federal Authority for Nuclear Regulation’ (FANR) following the International Atomic Energy Agency (IAEA), "Radiation Protection and the Management of Radioactive Waste in the Oil and Gas Industry".', {fontSize: '11px'}));
dashboardPanel.add(aboutPanel);
dashboardPanel.add(ui.Label(' ', {fontSize: '8px'}));

function generateSafetyCriticalChart(dataset, assetBand, reportTitle, horizontalLabel, verticalLabel, colorHex, renderType, baseYLimit, riskDossierText, dataSourceText) {
  var analyticalChart = ui.Chart.image.series({
    imageCollection: dataset.select(assetBand), region: siteCenter, reducer: ee.Reducer.mean(), scale: 1000
  }).setOptions({
    title: reportTitle,
    vAxis: { title: verticalLabel, viewWindow: {min: baseYLimit}, titleTextStyle: {bold: true, fontSize: 12}, textStyle: {fontSize: 11} },
    hAxis: { title: horizontalLabel, format: 'MMM yyyy', gridlines: {count: 8}, titleTextStyle: {bold: true, fontSize: 12}, textStyle: {fontSize: 11} },
    series: {0: {color: colorHex, lineWidth: 2, pointSize: 3.5}},
    legend: {position: 'none'}, backgroundColor: '#ffffff', chartArea: {width: '82%', height: '65%'} 
  });

  if (renderType === 'bar') analyticalChart.setChartType('ColumnChart');
  if (renderType === 'scatter') analyticalChart.setChartType('ScatterChart');

  var safetyTarpBox = ui.Panel({style: {padding: '12px', margin: '0 0 25px 0', border: '1px solid #d63031', backgroundColor: '#fdf1f1'}});
  safetyTarpBox.add(ui.Label('HAZARD DATA BRIEF & CONTROL PROTOCOLS (TARP):', {fontSize: '11px', fontWeight: 'bold', color: '#d63031', margin: '0 0 4px 0'}));
  safetyTarpBox.add(ui.Label(riskDossierText, {fontSize: '11px', color: '#2d3436', margin: '0'}));
  safetyTarpBox.add(ui.Label('Data Source & Methodology: ' + dataSourceText, {fontSize: '10px', color: '#636e72', fontStyle: 'italic', margin: '8px 0 0 0'}));

  dashboardPanel.add(analyticalChart).add(safetyTarpBox);
}

// Chart Generations with Methodology & Data Source references
generateSafetyCriticalChart(seriesPrecipMax, 'HV_Hydrological_Rate_mm_hr', 
  'CHART 1. HYDROLOGICAL HAZARD: Flash Inundation Peak', 
  'Date [Month & Year]', 'Precipitation Peak [mm/hr]', '#0984e3', 'bar', 0, 
  "CRITICAL LIMIT: 8.0 mm/hr. Prevents hydro-scour and radioactive leachate releases from Cells 1-4. The site typically averages <10 mm per year, predominantly between December and May[cite: 1].",
  "NASA GPM IMERG V06. Methodology: Max monthly spatial aggregation over facility footprint.");

generateSafetyCriticalChart(seriesWindDir, 'Wind_Direction_Deg', 
  'CHART 2. ATMOSPHERIC VECTOR: Dispersion Angle', 
  'Date [Month & Year]', 'Origin Heading [Degrees 0-360°]', '#6c5ce7', 'scatter', 0, 
  "Dominant clustering near ~315° indicates Shamal weather conditions. Historical site data shows winds are predominantly from the north-west[cite: 1].",
  "ECMWF ERA5 Daily Reanalysis. Methodology: Mean daily U & V vector trigonometric conversion.");

generateSafetyCriticalChart(seriesLST, 'HV_Thermal_LST_C', 
  'CHART 3. THERMAL LOADING: Structural Surface Heat Degradation', 
  'Date [Month & Year]', 'Land Surface Temp [°Celsius]', '#e17055', 'line', null, 
  "Average monthly temperatures vary from 18°C in winter to 35°C in summer, but surface structural heat can exceed 45°C causing HDPE embrittlement.",
  "MODIS/061/MOD11A1 (LST_Day_1km). Methodology: Kelvin to Celsius conversion, monthly mean over 20km buffer.");

generateSafetyCriticalChart(seriesSAR_VV, 'VV', 
  'CHART 4. GEOTECHNICAL MONITORING: VV Radar Backscatter', 
  'Date [Month & Year]', 'VV Radar Backscatter [dB]', '#2d3436', 'line', -25, 
  "Tracks surface roughness and slope stability. The landfill walls are designed for slopes 2H:1V[cite: 4].",
  "COPERNICUS/S1_GRD (Sentinel-1 Active Microwave). Methodology: Mean VV backscatter tracking slope integrity.");

ui.root.insert(0, dashboardPanel);

// --- 7. AUTOMATED QUANTITATIVE RISK ASSESSMENT (QRA) CONSOLE REPORT ---
print('======================================================================================');
print('                OFFICIAL QUANTITATIVE RISK ASSESSMENT & SAFETY DOSSIER                ');
print('                FACILITY: CENTRALIZED NORM TREATMENT PLANT (AL RUWAIS)                ');
print('                DEVELOPER: Youssef Bakr | MAGMA UAE                                   ');
print('======================================================================================');
print(' ');
print('1. CLIMATE RISK & VULNERABILITY MODEL');
print('--------------------------------------------------------------------------------------');
print('- HAZARD IDENTIFICATION: Coastal inundation caused by compounding sea level rise and storm surges.');
print('- SITE BASELINE: The site is situated ~5 km from the shoreline of the Arabian Gulf[cite: 1]. Average monthly temperatures vary from 18°C to 35°C[cite: 1].');
print(' ');
print('2. HYDROLOGICAL FLOOD RISK PROFILE');
print('--------------------------------------------------------------------------------------');
print('- LOCAL CLIMATE: Rainfall is scarce, averaging less than 10 mm per year, but sudden storm events can produce significant run-off[cite: 1].');
print('- LANDFILL BASE: Designed with a double liner system[cite: 4]. The basal layers maintain a 2% slope for drainage to prevent hydrostatic pressure build-up[cite: 4].');
print(' ');
print('3. ATMOSPHERIC PLUME DISPERSION DYNAMICS');
print('--------------------------------------------------------------------------------------');
print('- METEOROLOGY: Dominant wind direction is from the north-west (Shamal winds)[cite: 1]. Airborne particulate dispersion must be modeled along this southeast trajectory.');
print(' ');
print('4. GEOTECHNICAL & STRUCTURAL INTEGRITY');
print('--------------------------------------------------------------------------------------');
print('- CELL DESIGN: Landfill walls are preliminarily designed for slopes of 2H:1V[cite: 4].');
print('- DRAINAGE SYSTEMS: Incorporates a Leachate Drainage, Collection and Removal System (LDCRS) and a Leakage Detection System (LDS)[cite: 4].');
print('======================================================================================');
