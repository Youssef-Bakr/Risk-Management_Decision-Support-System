// =========================================================================
// GOOGLE EARTH ENGINE (GEE) - MAGMA NORM Environmental Impact Assessment Report
// Comprehensive Multi-Sensor Environmental Analysis
// =========================================================================

// 1. SYSTEM INITIALIZATION & GEOMETRY
Map.setOptions('SATELLITE');
Map.setControlVisibility({scaleControl: true});
Map.style().set('cursor', 'hand');

// Core Facility Geometry (Abu Dhabi Region)
var basePolygon = ee.Geometry.Polygon([
  [
    [52.768495, 24.080375], [52.771284, 24.081021], 
    [52.770469, 24.083989], [52.767680, 24.083401], 
    [52.768495, 24.080375]
  ]
]);

var facilityPolygon = basePolygon.centroid().buffer(1500); // Standard EIAR Buffer
var emergencyBuffer = basePolygon.centroid().buffer(5000); // 5km Emergency Impact Zone
Map.centerObject(facilityPolygon, 13);

// Dates for recent footprint analysis
var recentStart = '2024-01-01';
var recentEnd = '2025-01-01';

// Year baseline for climate proxies 
var baselineStart = '2023-01-01';
var baselineEnd = '2024-01-01';
var baselineYear = 2023;

// =========================================================================
// 2. DATA PROCESSING & SCIENTIFIC DATASETS
// =========================================================================

// A. Soil & Moisture (Sentinel-2)
function maskS2clouds(image) {
  var qa = image.select('QA60');
  return image.updateMask(qa.bitwiseAnd(1<<10).eq(0).and(qa.bitwiseAnd(1<<11).eq(0)))
              .divide(10000).copyProperties(image, ["system:time_start"]);
}
var s2Col = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(facilityPolygon).filterDate(recentStart, recentEnd).map(maskS2clouds);
var s2Indices = s2Col.map(function(img) {
  var bsi = img.expression('((swir1 + red) - (nir + blue)) / ((swir1 + red) + (nir + blue))', {'swir1': img.select('B11'), 'red': img.select('B4'), 'nir': img.select('B8'), 'blue': img.select('B2')}).rename('BSI');
  var ndmi = img.normalizedDifference(['B8', 'B11']).rename('NDMI'); 
  return img.addBands([bsi, ndmi]);
});
var medianIndices = s2Indices.median().clip(emergencyBuffer);

// B. Thermal Footprint (Landsat 9)
var l9Thermal = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2').filterBounds(facilityPolygon).filterDate(recentStart, recentEnd).median()
  .select('ST_B10').multiply(0.00341802).add(149.0).clip(emergencyBuffer); 

// C. Topography, Sea Level Rise & Flash Floods (SRTM DEM)
var srtm = ee.Image('USGS/SRTMGL1_003').clip(emergencyBuffer);
var seaLevelRiseRisk = srtm.lte(2).selfMask(); 
var slope = ee.Terrain.slope(srtm);
var flashFloodRisk = slope.gte(5).and(srtm.lte(50)).selfMask(); 

// D. Atmosphere, GHG, Dust & Aerosols (Sentinel-5P raw collections)
var s5p_no2_raw = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_NO2").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('tropospheric_NO2_column_number_density');
var s5p_aer_raw = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_AER_AI").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('absorbing_aerosol_index');
var s5p_so2_raw = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_SO2").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('SO2_column_number_density'); 

// F. Wind Dynamics (NOAA CFSV2 6-Hourly)
var windCol = ee.ImageCollection("NOAA/CFSV2/FOR6H").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd);
var windMean = windCol.mean();
var windSpeed = windMean.expression('sqrt(u**2 + v**2)', {
  u: windMean.select('u-component_of_wind_height_above_ground'), 
  v: windMean.select('v-component_of_wind_height_above_ground')
}).clip(emergencyBuffer);

// G. Water Footprint & Groundwater (MODIS ET & GRACE)
var modisET_raw = ee.ImageCollection("MODIS/061/MOD16A2").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('ET');
var etMean = modisET_raw.mean().clip(emergencyBuffer);
var graceGW = ee.ImageCollection("NASA/GRACE/MASS_GRIDS/LAND").filterBounds(emergencyBuffer).filterDate('2020-01-01', '2023-01-01').select('lwe_thickness').mean().clip(emergencyBuffer); 

// H. Active Fires (FIRMS)
var fires = ee.ImageCollection("FIRMS").filterBounds(emergencyBuffer).filterDate(recentStart, recentEnd).select('T21').max().clip(emergencyBuffer);


// =========================================================================
// 3. CHART AGGREGATION FIX (Safe Unmasking for Desert Environments)
// =========================================================================

// Helper function to guarantee charting data exists, even in masked deserts
function createSafeMonthly(collection, bandName, year) {
  var months = ee.List.sequence(1, 12);
  return ee.ImageCollection.fromImages(
    months.map(function(m) {
      var start = ee.Date.fromYMD(year, m, 1);
      var end = start.advance(1, 'month');
      var col = collection.filterDate(start, end);
      
      // If collection is empty for a month, or pixel is masked, force it to 0
      var img = ee.Image(ee.Algorithms.If(
        col.size().eq(0),
        ee.Image.constant(0).rename(bandName),
        col.mean()
      ));
      
      return img.unmask(0).set('system:time_start', start.millis());
    })
  );
}

var monthlyNO2 = createSafeMonthly(s5p_no2_raw, 'tropospheric_NO2_column_number_density', baselineYear);
var monthlyAER = createSafeMonthly(s5p_aer_raw, 'absorbing_aerosol_index', baselineYear);
var monthlyET = createSafeMonthly(modisET_raw, 'ET', baselineYear);


// =========================================================================
// 4. VISUALIZATION PARAMETERS
// =========================================================================
var pal = {
  ghg: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red'],
  dust: ['white', 'yellow', 'orange', 'red', 'darkred'],
  water: ['red', 'orange', 'yellow', 'green', 'blue'],
  wind: ['white', 'lightblue', 'blue', 'darkblue'],
  gw: ['darkred', 'red', 'white', 'blue', 'darkblue']
};

// =========================================================================
// 5. USER INTERFACE (SIDE PANEL & CHARTS)
// =========================================================================
var sidePanel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical', true), 
  style: {width: '450px', padding: '15px', backgroundColor: '#FFFFFF', border: '1px solid #CCCCCC'}
});

sidePanel.add(ui.Label('MAGMA NORM EIAR', {fontWeight: 'bold', fontSize: '20px', color: '#333333'}));
sidePanel.add(ui.Label('Environmental Impact Assessment Report', {fontSize: '13px', color: '#666666', margin: '0 0 10px 0'}));
sidePanel.add(ui.Label('Integrates Sentinel, Landsat, MODIS, NOAA CFSV2, & NASA GRACE data.', {fontSize: '11px', color: '#888', margin: '0 0 15px 0'}));

var layerTogglePanel = ui.Panel({style: {backgroundColor: '#FFFFFF', margin: '10px 0', border: '1px solid #EEE', padding: '10px'}});
layerTogglePanel.add(ui.Label('Spatial Data Layers & Proxies', {color: '#333333', fontWeight: 'bold'}));

var createToggle = function(name, image, vis, showDefault, description) {
  var layer = ui.Map.Layer(image, vis, name, showDefault);
  Map.layers().add(layer);
  var checkbox = ui.Checkbox({label: name, value: showDefault, style: {color: '#333333', fontWeight: '500'}});
  checkbox.onChange(function(checked) { layer.setShown(checked); });
  layerTogglePanel.add(checkbox);
  layerTogglePanel.add(ui.Label(description, {fontSize: '10px', color: '#666666', margin: '0 0 8px 25px'}));
};

// Map Layers (Rasters)
createToggle('1. Sea Level Rise Vulnerability', seaLevelRiseRisk, {palette: ['#00008B']}, false, 'DEM proxy for coastal inundation (<2m elev).');
createToggle('2 & 4. Carbon/GHG Footprint (NO2)', s5p_no2_raw.mean().clip(emergencyBuffer), {min: 0, max: 0.0001, palette: pal.ghg}, false, 'Tropospheric NO2 as proxy for fossil fuel/industrial GHG emissions.');
createToggle('3. Water Footprint (Evapotranspiration)', etMean.unmask(0), {min: 0, max: 200, palette: pal.water}, false, 'Surface water usage and loss (kg/m²/8day). Zero in true desert.');
createToggle('5. Wind Speed & Direction', windSpeed, {min: 0, max: 15, palette: pal.wind}, false, 'Daily surface wind velocity (m/s) defining emergency plume trajectory.');
createToggle('6 & 7. Dust & Sandstorms (Aerosol Index)', s5p_aer_raw.mean().clip(emergencyBuffer), {min: -1, max: 2, palette: pal.dust}, false, 'UV Absorbing Aerosol Index tracking desert dust and PM storms.');
createToggle('8 & 11. Atmos Chemistry / Cloud Seeding (SO2)', s5p_so2_raw.mean().clip(emergencyBuffer), {min: 0, max: 0.0005, palette: pal.ghg}, false, 'Sulfur Dioxide tracking atmospheric chemical injection and residual aerosols.');
createToggle('9. Digital Elevation Model (DEM)', srtm, {min: 0, max: 50, palette: ['#333', '#888', '#DDD', '#FFF']}, false, 'Topographic baseline (m).');
createToggle('10. Flash Flood Risk Paths', flashFloodRisk, {palette: ['#00FFFF']}, false, 'Steep slope to lowland topographic wetness transitions.');
createToggle('12. Active Fires / Thermal Anomalies', fires, {min: 300, max: 400, palette: ['red', 'yellow', 'white']}, false, 'Max thermal signatures indicating combustion/flaring.');
createToggle('13. Groundwater Storage Anomaly', graceGW, {min: -10, max: 10, palette: pal.gw}, false, 'Liquid Water Equivalent (LWE) tracking aquifer depletion/pollution stress.');
createToggle('14. Soil Disturbance (BSI)', medianIndices.select('BSI'), {min: -0.2, max: 0.4, palette: ['#0000FF', '#FFFF00', '#FFA500', '#FF0000']}, true, 'Sentinel-2 Bare Soil Index for land footprint tracking.');

sidePanel.add(layerTogglePanel);

// Charts
var chartPanel = ui.Panel({style: {backgroundColor: '#F8F9FA', padding: '10px', border: '1px solid #E0E0E0', margin: '10px 0'}});
chartPanel.add(ui.Label('Monthly Regional Baseline Metrics (2023)', {fontWeight: 'bold', color: '#333'}));

var no2Chart = ui.Chart.image.series({
  imageCollection: monthlyNO2, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 2000
}).setOptions({
  title: 'GHG / Carbon Footprint Proxy (NO2)',
  vAxis: {title: 'mol/m²', textStyle: {color: '#333'}, titleTextStyle: {fontSize: 10}},
  hAxis: {format: 'MMM', gridlines: {count: 12}}, colors: ['#A020F0'], legend: {position: 'none'},
  chartArea: {backgroundColor: '#FFF'}, backgroundColor: '#F8F9FA'
});
chartPanel.add(no2Chart);

var dustChart = ui.Chart.image.series({
  imageCollection: monthlyAER, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 2000
}).setOptions({
  title: 'Atmospheric Dust & Aerosol (AER_AI)',
  vAxis: {title: 'Index Value', textStyle: {color: '#333'}, titleTextStyle: {fontSize: 10}},
  hAxis: {format: 'MMM', gridlines: {count: 12}}, colors: ['#D2691E'], legend: {position: 'none'},
  chartArea: {backgroundColor: '#FFF'}, backgroundColor: '#F8F9FA'
});
chartPanel.add(dustChart);

var etChart = ui.Chart.image.series({
  imageCollection: monthlyET, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 1000
}).setOptions({
  title: 'Facility Regional Water Footprint (ET)',
  vAxis: {title: 'Evapotranspiration (kg/m²)', textStyle: {color: '#333'}, titleTextStyle: {fontSize: 10}},
  hAxis: {format: 'MMM', gridlines: {count: 12}}, colors: ['#1E90FF'], legend: {position: 'none'},
  chartArea: {backgroundColor: '#FFF'}, backgroundColor: '#F8F9FA'
});
chartPanel.add(etChart);

sidePanel.add(chartPanel);
ui.root.insert(0, sidePanel);

// =========================================================================
// 6. DRAW FINAL GEOMETRY LAYERS (Added only once, on top)
// =========================================================================
Map.addLayer(emergencyBuffer, {color: 'orange', fillColor: 'FFA50044'}, '5km Emergency Impact Zone', true);
Map.addLayer(facilityPolygon, {color: 'white', fillColor: '00000000'}, '1500m Buffer Limit', true);
Map.addLayer(basePolygon, {color: 'red', fillColor: 'FF000088'}, 'MAGMA NORM Site', true);
