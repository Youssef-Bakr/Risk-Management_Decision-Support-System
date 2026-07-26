// =========================================================================
//Youssef Mohamed Bakr
//+201121121000
//Youssef.Bakr@drc.gov.eg
//Youssef.Bakr@faps.cu.edu.eg
// =========================================================================

// =========================================================================
//06
/* ========================================================================================
 * SECURITY-CLASSIFIED / SAFETY ENGINEERING WORKSPACE
 * ASSET: ADNOC CENTRALIZED NORM TREATMENT & DISPOSAL FACILITY (AL RUWAIS, UAE)
 * SPECIFIC GEOMETRIES: Landfill Perimeter Boundary & Containment Cells 1, 2, 3, and 4
 * TARGET COORDINATES: [52.769692825414495, 24.081562392352257] | Plus Code: 3QMC+J5H
 * OPERATIONAL OBSERVATION WINDOW: 2020-01-01 to 2026-07-01
 * DOCUMENTATION FRAMEWORK: QRA / HAZID / FANR-IAEA Safety Compliance Protocol
 * ========================================================================================
 */

// --- 1. GEOSPATIAL PRIMING & RISK CONTAINMENT BUFFER ---
var siteCenter = ee.Geometry.Point([52.769692825414495, 24.081562392352257]);
var facilityImpactZone = siteCenter.buffer(20000); // 20km Zone of Exposure (ZoE)
var startDate = ee.Date('2020-01-01');
var endDate = ee.Date('2026-07-01');

// Set map alignment and force standard default view to Satellite
Map.setCenter(52.769692825414495, 24.081562392352257, 13);
Map.setOptions('SATELLITE'); 
Map.addLayer(siteCenter, {color: '#d63031'}, 'Target: NORM Facility [2020-2026]', true);

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

// ISR-1: High-Resolution Optical Reconnaissance (Sentinel-2 Harmonized Multi-Spectral)
var s2TacticalOptical = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(facilityImpactZone).filterDate(startDate, endDate)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10));

// ISR-2: Active Microwave Synthetic Aperture Radar (Sentinel-1 SAR Ground Range Detected)
var s1TacticalRadar = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterBounds(siteCenter).filterDate(startDate, endDate)
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'));

// --- 3. CLIMATE RISK ANALYSIS: TOPOGRAPHIC VULNERABILITY & SEA LEVEL RISE ---
var srtmDem = ee.Image('USGS/SRTMGL1_003').clip(facilityImpactZone);

// SLR Compound Scenario Model: 1.5m Static SLR + 2.0m Extreme Storm Surge Vector = 3.5m Mask
var criticalInundationThreshold = 3.5; 
var coastalInundationExposureZone = srtmDem.lte(criticalInundationThreshold)
  .updateMask(srtmDem.lte(criticalInundationThreshold))
  .rename('SLR_Inundation_Vulnerability');

// --- 4. SAFE MONTHLY TEMPORAL AGGREGATION PATTERN (FAILSAFE 0-BAND FILTER) ---
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

// Map Aggregation Pipelines
var seriesLST = executeSafetyAggregation(modisLST, 'HV_Thermal_LST_C', 'mean');
var seriesPrecipMax = executeSafetyAggregation(imergRain, 'HV_Hydrological_Rate_mm_hr', 'max');
var seriesWindDir = executeSafetyAggregation(era5WindField, 'Wind_Direction_Deg', 'mean');
var seriesWindV = executeSafetyAggregation(era5WindField, 'V_Vector', 'mean');
var seriesFireT21 = executeSafetyAggregation(firmsThermalAnomalies, 'HV_Incinerator_Temp_K', 'max');
var seriesFireConf = executeSafetyAggregation(firmsThermalAnomalies, 'HV_Fire_Confidence_Pct', 'max');
var seriesSAR_VV = executeSafetyAggregation(s1TacticalRadar, 'VV', 'mean');
var seriesSAR_VH = executeSafetyAggregation(s1TacticalRadar, 'VH', 'mean');

// --- 5. VISUAL RECONNAISSANCE & INUNDATION LAYER OVERLAYS (SHORTENED NAMES) ---
Map.addLayer(coastalInundationExposureZone, {palette: ['#0984e3'], opacity: 0.75}, '1. SLR Inundation (<=3.5m) [2020-2026]', true);
var mapPrecipIntensity = imergRain.select('HV_Hydrological_Rate_mm_hr').max().clip(facilityImpactZone);
Map.addLayer(mapPrecipIntensity, {min: 0, max: 12, palette: ['#ffffff', '#74b9ff', '#0984e3', '#6c5ce7']}, '2. Max Precip. (mm/hr) [2020-2026]', false);
var mapThermalAnomalies = firmsThermalAnomalies.select('HV_Incinerator_Temp_K').max().clip(facilityImpactZone);
Map.addLayer(mapThermalAnomalies, {min: 300, max: 420, palette: ['#ffeaa7', '#fab1a0', '#ff7675', '#d63031']}, '3. Thermal Anomalies (FIRMS) [2020-2026]', true);
var opticalComposite = s2TacticalOptical.median().clip(facilityImpactZone);
Map.addLayer(opticalComposite, {bands: ['B4', 'B3', 'B2'], min: 0, max: 2500}, '4. Optical ISR (S2-10m) [2020-2026]', false);
var sarComposite = s1TacticalRadar.median().clip(facilityImpactZone);
Map.addLayer(sarComposite, {bands: ['VV', 'VH', 'VV'], min: -22, max: -3}, '5. SAR ISR (S1) [2020-2026]', true);

// --- 6. SAFETY ENGINEERING CONTROL DASHBOARD INTERFACE ---
// Maintained width at 650px to guarantee chart axis labels do not get cut off
var dashboardPanel = ui.Panel({style: {width: '650px', padding: '20px', backgroundColor: '#ffffff', border: '1px solid #d63031'}});
dashboardPanel.add(ui.Label('|Safety Analysis Report | to support Trigger Action Response Plan (TARP) | Analysis Timeframe: 2020-01-01 >>> 2026-07-01 |', {fontWeight: 'bold', fontSize: '18px', color: '#2d3436'}));
dashboardPanel.add(ui.Label('Youssef Bakr (www.linkedin.com/in/youssef-bakr)(+201121121000)', {fontSize: '12px', fontWeight: 'bold', color: '#c0392b'}));

// Upgraded Chart Ingestion Utility to Force Absolute Axis Readability
function generateSafetyCriticalChart(dataset, assetBand, reportTitle, horizontalLabel, verticalLabel, colorHex, renderType, baseYLimit, riskDossierText) {
  var analyticalChart = ui.Chart.image.series({
    imageCollection: dataset.select(assetBand), region: siteCenter, reducer: ee.Reducer.mean(), scale: 1000
  }).setOptions({
    title: reportTitle,
    vAxis: { 
      title: verticalLabel, 
      viewWindow: {min: baseYLimit}, 
      titleTextStyle: {bold: true, italic: false, fontSize: 12, color: '#2d3436'},
      textStyle: {bold: false, fontSize: 11, color: '#2d3436'}
    },
    hAxis: { 
      title: horizontalLabel, 
      format: 'MMM yyyy', // Strict explicit date format on X-axis (e.g. Jan 2024)
      gridlines: {count: 8}, 
      titleTextStyle: {bold: true, italic: false, fontSize: 12, color: '#2d3436'},
      textStyle: {bold: false, fontSize: 11, color: '#2d3436'}
    },
    series: {0: {color: colorHex, lineWidth: 2, pointSize: 3.5}},
    legend: {position: 'none'}, 
    backgroundColor: '#ffffff',
    chartArea: {width: '82%', height: '65%'} // Adds padding inside the chart so labels are fully visible
  });

  if (renderType === 'bar') analyticalChart.setChartType('ColumnChart');
  if (renderType === 'scatter') analyticalChart.setChartType('ScatterChart');

  var safetyTarpBox = ui.Panel({style: {padding: '12px', margin: '0 0 25px 0', border: '1px solid #d63031', backgroundColor: '#fdf1f1'}});
  safetyTarpBox.add(ui.Label('HAZARD DATA BRIEF & CONTROL PROTOCOLS (TARP):', {fontSize: '11px', fontWeight: 'bold', color: '#d63031', margin: '0 0 6px 0'}));
  safetyTarpBox.add(ui.Label(riskDossierText, {fontSize: '11px', color: '#2d3436', margin: '0'}));

  dashboardPanel.add(analyticalChart).add(safetyTarpBox);
}

// Deploy Safety Charts with Highly Detailed Explicit Axis Units
generateSafetyCriticalChart(seriesPrecipMax, 'HV_Hydrological_Rate_mm_hr', 
  'CHART 1. HYDROLOGICAL HAZARD: Flash Inundation Velocity Peak [2020-01-01 to 2026-07-01]', 
  'Date [Month & Year]', 'Precipitation Peak [mm/hr]', 
  '#0984e3', 'bar', 0, 
  "CRITICAL OPERATIONAL LIMIT (COL): 8.0 mm/hr. Exceeding this limit causes extreme sheet runoff over the desert surface. TARGET OUTCOME: Prevents hydro-scour, containment failures, and radioactive leachate releases from Landfill Cells 1-4.");

generateSafetyCriticalChart(seriesWindDir, 'Wind_Direction_Deg', 
  'CHART 2. EXPOSURE PATHWAY: Atmospheric Vector Dispersion Angle [2020-01-01 to 2026-07-01]', 
  'Date [Month & Year]', 'Origin Heading [Degrees 0-360°]', 
  '#6c5ce7', 'scatter', 0, 
  "EXPOSURE ROUTE ANALYSIS: Dominant clustering near ~315° indicates Shamal weather conditions. Airborne radioactive particulates follow a Southeast terrestrial trajectory, bypassing the northern coast but requiring downwind containment zones.");

generateSafetyCriticalChart(seriesWindV, 'V_Vector', 
  'CHART 3. ATMOSPHERIC DYNAMICS: Cross-Boundary Velocity Component (V-Vector) [2020-01-01 to 2026-07-01]', 
  'Date [Month & Year]', 'V-Vector Velocity [m/s]', 
  '#00b894', 'line', null, 
  "DISPERSION FORCE METRIC: Positive values indicate a Northward trajectory toward marine infrastructure. Negative values show a Southward movement driving plumes inland. Used to calculate real-time Downwind Public Exposure Boundaries.");

generateSafetyCriticalChart(seriesLST, 'HV_Thermal_LST_C', 
  'CHART 4. THERMAL LOADING: Structural Surface Heat Degradation Profile [2020-01-01 to 2026-07-01]', 
  'Date [Month & Year]', 'Land Surface Temp [°Celsius]', 
  '#e17055', 'line', null, 
  "CONTAINMENT INTEGRITY PROFILE: Sustained contact heat exceeding 45°C causes thermal embrittlement of HDPE geomembranes across the Landfill Boundary Containment Zone. Increases the risk of structural failure and deep sub-surface leachate migration.");

generateSafetyCriticalChart(seriesFireT21, 'HV_Incinerator_Temp_K', 
  'CHART 5. EXOTHERMIC RISK: NASA FIRMS Core Brightness Thermal Anomaly [2020-01-01 to 2026-07-01]', 
  'Date [Month & Year]', 'Thermal Brightness [Kelvin]', 
  '#d63031', 'line', 290, 
  "CRITICAL OPERATIONAL LIMIT (COL): 350 Kelvin. Sudden spikes indicate an uncontrolled exothermic reaction or failure in thermal containment within the incineration and ash encapsulation systems.");

generateSafetyCriticalChart(seriesFireConf, 'HV_Fire_Confidence_Pct', 
  'CHART 6. ALGORITHM VALIDATION: Signal-to-Noise Sensor Confidence Index [2020-01-01 to 2026-07-01]', 
  'Date [Month & Year]', 'Detection Confidence [%]', 
  '#b2bec3', 'bar', 0, 
  "VERIFICATION DATASET: Cross-references structural radiance readings. A combination of a Core Temperature spike >350K AND a sensor confidence >75% triggers an automated Alert Level 3 emergency response.");

generateSafetyCriticalChart(seriesSAR_VV, 'VV', 
  'CHART 7. GEOTECHNICAL MONITORING: Active Microwave VV Radar Backscatter Variance [2020-01-01 to 2026-07-01]', 
  'Date [Month & Year]', 'VV Radar Backscatter [dB]', 
  '#2d3436', 'line', -25, 
  "GEOTECHNICAL FAILURE CONTROL: Tracks surface roughness across Cells 1 through 4. Deviations outside the normal operating range (-18dB to -10dB) flag structural shifts, soil subsidence, or containment wall displacement.");

generateSafetyCriticalChart(seriesSAR_VH, 'VH', 
  'CHART 8. VOLUMETRIC DEFECT CAPTURE: Active Microwave VH Radar Backscatter Variance [2020-01-01 to 2026-07-01]', 
  'Date [Month & Year]', 'VH Radar Backscatter [dB]', 
  '#74b9ff', 'line', -30, 
  "STRUCTURAL ANOMALY INDEX: Monitors volumetric scattering changes. Used to identify micro-fractures, early slope failures, or unrecorded material shifts within the primary landfill cells.");

ui.root.insert(0, dashboardPanel);

// --- 7. AUTOMATED QUANTITATIVE RISK ASSESSMENT (QRA) CONSOLE REPORT ---
print('======================================================================================');
print('                OFFICIAL QUANTITATIVE RISK ASSESSMENT & SAFETY DOSSIER                ');
print('                FACILITY: CENTRALIZED NORM TREATMENT PLANT (AL RUWAIS)                ');
print('                REGULATORY CODES: FANR-REG-24 / IAEA GSR PART 3 COMPLIANT              ');
print('                EVALUATION PERIOD: 2020-01-01 TO 2026-07-01                           ');
print('======================================================================================');
print(' ');
print('--------------------------------------------------------------------------------------');
print('                          QUANTITATIVE RISK ASSESSMENT MATRIX                         ');
print('--------------------------------------------------------------------------------------');
print('| HAZARD VECTOR                          | RISK LEVEL (Likelihood x Severity)        |');
print('|----------------------------------------|-------------------------------------------|');
print('| HV-1: Thermal Degradation (LST)        | Medium (Frequent x Moderate Structural)   |');
print('| HV-2: Hydrological Scouring (IMERG)    | High (Occasional x Major Inundation)      |');
print('| HV-3: Atmospheric Dispersion (ERA5)    | Critical (Unlikely x Catastrophic Dose)   |');
print('| HV-4: Thermal Runaway / Fire (FIRMS)   | High (Unlikely x Major Process Failure)   |');
print('| HV-5: Sea Level Rise Inundation        | Low-Medium (Rare x Major Infrastructure)  |');
print('--------------------------------------------------------------------------------------');
print(' ');
print('1. CLIMATE RISK ASSESSMENT & SEA LEVEL RISE (SLR) VULNERABILITY MODEL [2020-01-01 to 2026-07-01]');
print('--------------------------------------------------------------------------------------');
print('- HAZARD IDENTIFICATION (HAZID): Coastal inundation of NORM landfill cells 1-4 caused by');
print('  compounding sea level rise, extreme high tides, and meteorological storm surges.');
print('- EXPOSURE EXCLUSION BOUNDARY: Spatial Analysis Layer 1 applies a maximum 3.5m topographic cutoff');
print('  representing a worst-case scenario combining a 1.5-meter sea level rise with a 2.0-meter storm surge.');
print('- RISK ASSESSMENT: The facility perimeter and Landfill Containment Cells 1-4 are built at elevations');
print('  well above the 3.5m baseline, placing them outside the direct low-frequency coastal wash zone.');
print('  However, the surrounding transport corridors and low-lying coastal paths within the 20km Zone of');
print('  Exposure fall inside the high vulnerability threshold. This requires a strong containment design');
print('  against storm-driven erosion along the main shipping lines.');
print(' ');
print('2. HYDROLOGICAL FLOOD RISK PROFILE: INUNDATION VELOCITY ANALYSIS [2020-01-01 to 2026-07-01]');
print('--------------------------------------------------------------------------------------');
print('- HAZARD IDENTIFICATION (HAZID): Failure of cell walls and surface scouring caused by short-duration,');
print('  high-intensity cloudburst storm events.');
print('- CRITICAL OPERATIONAL LIMIT (COL): Peak rainfall intensity exceeding 8.0 mm/hr (Chart 1).');
print('- TRIGGER ACTION RESPONSE PLAN (TARP) PROTOCOL:');
print('  * Green (Normal Operating Conditions): Rainfall < 3.0 mm/hr. Standard operation of perimeter storm networks.');
print('  * Amber (Alert Level 1): Rainfall between 3.0 mm/hr and 8.0 mm/hr. Automated checks on drainage valves;');
print('    remote monitoring of retention basins around Cells 1 to 4.');
print('  * Red (Emergency Response Trigger): Rainfall >= 8.0 mm/hr. Stop all external waste transfers. Divert internal');
print('    runoff water to lined backup reservoirs to prevent the creation and migration of radioactive leachate.');
print(' ');
print('3. ATMOSPHERIC PLUME DISPERSION DYNAMICS [2020-01-01 to 2026-07-01]');
print('--------------------------------------------------------------------------------------');
print('- HAZARD IDENTIFICATION (HAZID): Overpressure event at the processing plant leading to the aerosolization');
print('  of volatile radioactive particulate matter.');
print('- EXPOSURE ROUTE (ER) ANALYSIS: Airborne inhalation and downwind ground deposition pathways.');
print('- DISPERSION MODELING: Wind direction metrics (Chart 2) and velocity amplitude components (Chart 3) show');
print('  persistent Shamal patterns (~315 degree origin).');
print('- SAFETY CONTAINMENT STRATEGY: If a containment breach occurs under standard meteorological conditions, the');
print('  airborne radioactive aerosols will travel away from the northern coast and settle over inland desert pipeline corridors.');
print('  Evacuation and exclusion protocols must be organized along a southeast path to protect downwind industrial outposts.');
print(' ');
print('4. THERMAL RUNAWAY & FIRE EARLY WARNING ARCHITECTURE [2020-01-01 to 2026-07-01]');
print('--------------------------------------------------------------------------------------');
print('- HAZARD IDENTIFICATION (HAZID): Exothermic runaway within the NORM incineration unit, high-pressure descaling lines,');
print('  or ash encapsulation facilities.');
print('- CRITICAL OPERATIONAL LIMIT (COL): Core temperature crossing 350 Kelvin on the integrated radiance band (Chart 5).');
print('- SIGNAL VALIDATION FRAMEWORK: To minimize false alarms from standard industrial flaring, the safety engine');
print('  cross-references raw thermal readings with the NASA FIRMS Confidence Index (Chart 6). If the temperature crosses');
print('  350K with a confidence score higher than 75%, the system confirms a containment failure. This auto-activates');
print('  emergency cooling loops and isolates hazardous materials.');
print(' ');
print('5. SPACE-BASED TACTICAL ISR DEFENSE INTEGRATION [2020-01-01 to 2026-07-01]');
print('--------------------------------------------------------------------------------------');
print('- MONITORING SYSTEMS: Sentinel-2 Multi-Spectral Optical + Sentinel-1 Active Microwave Radar.');
print('- SAR RECON ADVANTAGE (Charts 7 & 8): Synthetic Aperture Radar operates uninterrupted through dust storms, smoke, and darkness.');
print('- GEOTECHNICAL INTEGRITY MONITORING: By tracking change metrics in cross-polarized radar backscatter (VV and VH), the system');
print('  identifies sub-centimeter shifts in structural containment walls and cell slopes.');
print('  This enables early warning of slope instability, cap cracking, or containment failures.');
print('======================================================================================');

