// =========================================================================
//Youssef Mohamed Bakr
//+201121121000
//Youssef.Bakr@drc.gov.eg
//Youssef.Bakr@faps.cu.edu.eg
// =========================================================================

// =========================================================================
//2026-07-11_NORM-MAGMA-UAE_v04

/* ========================================================================================
 * SECURITY-CLASSIFIED / SAFETY ENGINEERING WORKSPACE
 * ASSET: ADNOC CENTRALIZED NORM TREATMENT & DISPOSAL FACILITY (AL RUWAIS, UAE)
 * TARGET COORDINATES: [52.769692825414495, 24.081562392352257]
 * OPERATIONAL OBSERVATION WINDOW: 2020-01-01 to 2026-07-11 (REAL-TIME UPDATE)
 * DOCUMENTATION FRAMEWORK: QRA / HAZID / FANR-IAEA Safety Compliance Protocol
 * DEVELOPER: Youssef Bakr
 * ========================================================================================
 */

// --- 1. GEOSPATIAL PRIMING & RISK CONTAINMENT BUFFER ---
var siteCenter = ee.Geometry.Point([52.769692825414495, 24.081562392352257]);
var facilityImpactZone = siteCenter.buffer(20000); 
var startDate = ee.Date('2020-01-01');
var endDate = ee.Date('2026-07-11'); 

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

var s5pSO2 = ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_SO2').filterBounds(siteCenter).filterDate(startDate, endDate)
  .select(['SO2_column_number_density'], ['SO2_Density_mol_m2']);

var s5pCH4 = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_CH4').filterBounds(siteCenter).filterDate(startDate, endDate)
  .select(['CH4_column_volume_mixing_ratio_dry_air'], ['CH4_Mixing_Ratio_ppb']);

var s5pCO = ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_CO').filterBounds(siteCenter).filterDate(startDate, endDate)
  .select(['CO_column_number_density'], ['CO_Density_mol_m2']);

var waterVaporNCEP = ee.ImageCollection('NCEP_RE/surface_wv').filterBounds(siteCenter).filterDate(startDate, endDate)
  .select(['pr_wtr'], ['Water_Vapor_kg_m2']);

// 2026 Specific Imagery Filtered
var s2Optical2026 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(facilityImpactZone).filterDate('2026-01-01', endDate).filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10));

var s1Radar2026 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterBounds(siteCenter).filterDate('2026-01-01', endDate).filter(ee.Filter.eq('instrumentMode', 'IW')).filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'));

var firmsFireNov2024 = ee.ImageCollection('FIRMS').filterBounds(facilityImpactZone).filterDate('2024-11-01', '2024-11-02');

// --- 3. DYNAMIC LAYER INJECTION WITH ACQUISITION DATES ---
var latestS2_2026 = s2Optical2026.sort('system:time_start', false).first();
latestS2_2026.date().format('YYYY-MM-dd').evaluate(function(dateStr) {
  Map.addLayer(latestS2_2026.clip(facilityImpactZone), {bands: ['B4', 'B3', 'B2'], min: 0, max: 3000}, '1. 2026 Optical ISR (S2) | Acq: ' + dateStr, false);
});

var latestS1_2026 = s1Radar2026.sort('system:time_start', false).first();
latestS1_2026.date().format('YYYY-MM-dd').evaluate(function(dateStr) {
  Map.addLayer(latestS1_2026.clip(facilityImpactZone), {bands: ['VV'], min: -25, max: 0}, '2. 2026 SAR Geotech (S1) | Acq: ' + dateStr, true);
});

if (firmsFireNov2024.size().getInfo() > 0) {
  Map.addLayer(firmsFireNov2024.max().clip(facilityImpactZone), {bands: ['T21'], min: 300, max: 500, palette: ['red', 'orange', 'yellow']}, '3. Active Fire (FIRMS) | Acq: 2024-11-01', true);
} else {
  print('Notice: No active thermal anomalies detected on 1 Nov 2024 within the 20km Zone of Exposure.');
}

// Map Long-term composites
Map.addLayer(chirpsRain.max().clip(facilityImpactZone), {min: 0, max: 50, palette: ['#ffffff', '#00e5ff', '#00838f', '#01579b']}, '4. Max Precipitation (CHIRPS) | Acq: Jan 2020-Jul 2026', false);
Map.addLayer(s5pNO2.mean().clip(facilityImpactZone), {min: 0, max: 0.0001, palette: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']}, '5. Mean NO2 Plume (S5P) | Acq: Jan 2020-Jul 2026', false);
Map.addLayer(s5pCH4.mean().clip(facilityImpactZone), {min: 1750, max: 1900, palette: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']}, '6. Mean CH4 [Methane] Plume (S5P) | Acq: Jan 2020-Jul 2026', false);
Map.addLayer(s5pCO.mean().clip(facilityImpactZone), {min: 0, max: 0.05, palette: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']}, '7. Mean CO [Carbon Monoxide] Plume (S5P) | Acq: Jan 2020-Jul 2026', false);

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
var seriesCH4       = executeSafetyAggregation(s5pCH4, 'CH4_Mixing_Ratio_ppb', 'mean');
var seriesCO        = executeSafetyAggregation(s5pCO, 'CO_Density_mol_m2', 'mean');
var seriesWV        = executeSafetyAggregation(waterVaporNCEP, 'Water_Vapor_kg_m2', 'mean');

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

generateSafetyCriticalChart(seriesPrecipMax, 'HV_Hydrological_Rate_mm', 
  'CHART 1. HYDROLOGICAL HAZARD: Precipitation Peaks', 'Max Precipitation [mm]', '#0984e3', 'bar', 
  "Monitors storm-water runoff to prevent radioactive leachate leakage.",
  "UCSB-CHG/CHIRPS/DAILY.");

generateSafetyCriticalChart(seriesWindDir, 'Wind_Direction_Deg', 
  'CHART 2. METEOROLOGY: Plume Dispersion Trajectory', 'Wind Direction [Degrees]', '#6c5ce7', 'scatter', 
  "Maps Shamal wind patterns (North-West) vital for dispersion tracking.",
  "ECMWF/ERA5/DAILY.");

generateSafetyCriticalChart(seriesNO2, 'NO2_Density_mol_m2', 
  'CHART 3. ATMOSPHERIC CHEMISTRY: NO2 Emissions', 'NO2 Density [mol/m^2]', '#d63031', 'line', 
  "Monitors combustion byproducts from incineration operations.",
  "COPERNICUS/S5P/NRTI/L3_NO2.");

generateSafetyCriticalChart(seriesSO2, 'SO2_Density_mol_m2', 
  'CHART 4. ATMOSPHERIC CHEMISTRY: SO2 Emissions', 'SO2 Density [mol/m^2]', '#e17055', 'line', 
  "Tracks sulfur dioxide outputs to ensure compliance.",
  "COPERNICUS/S5P/NRTI/L3_SO2.");

generateSafetyCriticalChart(seriesCH4, 'CH4_Mixing_Ratio_ppb', 
  'CHART 5. GREENHOUSE GASES: Methane (CH4) Emissions', 'CH4 Mixing Ratio [ppb]', '#f39c12', 'line', 
  "Monitors fugitive methane emissions from facility waste storage or incomplete combustion processes.",
  "COPERNICUS/S5P/OFFL/L3_CH4.");

generateSafetyCriticalChart(seriesCO, 'CO_Density_mol_m2', 
  'CHART 6. GREENHOUSE GASES: Carbon Monoxide (CO)', 'CO Density [mol/m^2]', '#8e44ad', 'line', 
  "Tracks carbon monoxide as a proxy for greenhouse gas loading and incineration efficiency.",
  "COPERNICUS/S5P/NRTI/L3_CO.");

generateSafetyCriticalChart(seriesWV, 'Water_Vapor_kg_m2', 
  'CHART 7. CLIMATOLOGY: Atmospheric Water Vapor', 'Water Vapor [kg/m^2]', '#00b894', 'line', 
  "Tracks ambient humidity affecting particulate fallout.",
  "NCEP_RE/surface_wv.");

ui.root.insert(0, dashboardPanel);

// --- 6. AUTOMATED CONSOLE LOGGING WITH REFERENCES & GHG ANALYSIS ---
print('======================================================================================');
print('                OFFICIAL QUANTITATIVE RISK ASSESSMENT & SAFETY DOSSIER                ');
print('                FACILITY: CENTRALIZED NORM TREATMENT PLANT (AL RUWAIS)                ');
print('======================================================================================');
print(' ');
print('GREENHOUSE GAS (GHG) & METHANE EMISSIONS ANALYSIS:');
print('--------------------------------------------------------------------------------------');
print('- Methane (CH4) monitoring acts as an early warning metric for fugitive emissions originating from waste management anomalies. While NORM facilities focus on radiological hazards, co-mingled organic waste from oil and gas exploration can produce CH4 if trapped in anaerobic conditions.');
print('- Carbon Monoxide (CO) acts as a primary indicator of incineration efficiency. Elevated CO spikes correlate with sub-optimal burn temperatures in the NORM ash processing units, which simultaneously increases the risk of broader GHG releases.');
print('- The implementation of Sentinel-5P OFFL L3 CH4 ensures continuous auditing against national and FANR-IAEA environmental baselines.');
print(' ');
print('FLASH FLOODING & CLOUD SEEDING IMPACT ANALYSIS:');
print('--------------------------------------------------------------------------------------');
print('- Recent severe flash flooding events across the UAE (e.g., April 2024) have been widely attributed to the formation of mesoscale convective systems (MCS), driven by climate change and warmer atmospheric conditions holding more water vapor, rather than cloud seeding programs.');
print('- Meteorological experts confirm that cloud seeding aims to modify existing clouds by introducing particles for moisture to attach to, but it cannot create rain from nothing nor significantly modify massive storm systems.');
print('- RISK MITIGATION: The NORM facility flood risk strategy must account for long-term climate change dynamics driving heavier natural downpours, rather than anthropogenic cloud seeding effects.');
print('======================================================================================');
