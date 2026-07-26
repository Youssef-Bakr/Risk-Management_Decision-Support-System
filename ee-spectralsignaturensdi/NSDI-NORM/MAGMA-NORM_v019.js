// =========================================================================
// GOOGLE EARTH ENGINE (GEE) - MAGMA NORM Environmental Impact Assessment Report
// Comprehensive Multi-Sensor Environmental Analysis & Plume Simulator
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
var centerPt = basePolygon.centroid();
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

// A. Soil, Moisture, & Vegetation (Sentinel-2)
function maskS2clouds(image) {
  var qa = image.select('QA60');
  return image.updateMask(qa.bitwiseAnd(1<<10).eq(0).and(qa.bitwiseAnd(1<<11).eq(0)))
              .divide(10000).copyProperties(image, ["system:time_start"]);
}
var s2Col = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(emergencyBuffer).filterDate(recentStart, recentEnd).map(maskS2clouds);
var s2Indices = s2Col.map(function(img) {
  var bsi = img.expression('((swir1 + red) - (nir + blue)) / ((swir1 + red) + (nir + blue))', {'swir1': img.select('B11'), 'red': img.select('B4'), 'nir': img.select('B8'), 'blue': img.select('B2')}).rename('BSI');
  var ndmi = img.normalizedDifference(['B8', 'B11']).rename('NDMI'); 
  var ndvi = img.normalizedDifference(['B8', 'B4']).rename('NDVI'); 
  return img.addBands([bsi, ndmi, ndvi]);
});
var medianIndices = s2Indices.median().clip(emergencyBuffer);

// B. Thermal Footprint (Landsat 9)
var l9Thermal = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2').filterBounds(facilityPolygon).filterDate(recentStart, recentEnd).median()
  .select('ST_B10').multiply(0.00341802).add(149.0).subtract(273.15).clip(emergencyBuffer); 

// C. Topography & Risk (SRTM DEM)
var srtm = ee.Image('USGS/SRTMGL1_003').clip(emergencyBuffer);
var seaLevelRiseRisk = srtm.lte(2).selfMask(); 
var slope = ee.Terrain.slope(srtm);
var flashFloodRisk = slope.gte(5).and(srtm.lte(50)).selfMask(); 

// D. Atmosphere, GHG, Gas & Aerosols (Sentinel-5P)
var s5p_no2_raw = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_NO2").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('tropospheric_NO2_column_number_density');
var s5p_aer_raw = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_AER_AI").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('absorbing_aerosol_index');
var s5p_so2_raw = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_SO2").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('SO2_column_number_density'); 
var s5p_co_raw = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_CO").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('CO_column_number_density'); 
var s5p_ch4_raw = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_CH4").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('CH4_column_volume_mixing_ratio_dry_air'); 

// E. Wind Dynamics (NOAA CFSV2 6-Hourly) & Wind Direction Extraction
var noaa_wind = ee.ImageCollection("NOAA/CFSV2/FOR6H").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).map(function(img) {
  var u = img.select('u-component_of_wind_height_above_ground');
  var v = img.select('v-component_of_wind_height_above_ground');
  
  var ws = img.expression('sqrt(u**2 + v**2)', {u: u, v: v}).rename('Wind_Speed');
  
  // Calculate Meteorological Wind Direction (Degrees, 0=North, 90=East)
  var wd = u.atan2(v).multiply(180 / Math.PI).add(180).rename('Wind_Direction');
  
  return img.addBands([ws, wd, u, v]).copyProperties(img, ['system:time_start']);
});
var windSpeed = noaa_wind.select('Wind_Speed').mean().clip(emergencyBuffer);
var meanU = noaa_wind.select('u-component_of_wind_height_above_ground').mean();
var meanV = noaa_wind.select('v-component_of_wind_height_above_ground').mean();

// F. Water & Surface Temp
var modisET_raw = ee.ImageCollection("MODIS/061/MOD16A2").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('ET');
var etMean = modisET_raw.mean().clip(emergencyBuffer);
var modisLST_raw = ee.ImageCollection("MODIS/061/MOD11A2").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd)
  .map(function(img) { return img.select('LST_Day_1km').multiply(0.02).subtract(273.15).rename('LST_Celsius').copyProperties(img, ['system:time_start']); });

var fires = ee.ImageCollection("FIRMS").filterBounds(emergencyBuffer).filterDate(recentStart, recentEnd).select('T21').max().clip(emergencyBuffer);

// =========================================================================
// 3. CLIMATOLOGICAL PLUME DISPERSION MODEL (STATIC DATA LAYER)
// =========================================================================
// Calculates the most likely plume footprint based on mean wind vectors
var lonLat = ee.Image.pixelLonLat();
var ptLon = ee.Number(centerPt.coordinates().get(0));
var ptLat = ee.Number(centerPt.coordinates().get(1));
var dLon = lonLat.select('longitude').subtract(ee.Image.constant(ptLon));
var dLat = lonLat.select('latitude').subtract(ee.Image.constant(ptLat));

// Calculate pixel angle from centroid and mean wind angle
var pixelAngle = dLon.atan2(dLat); 
var windAngle = meanU.atan2(meanV); 

// Difference in angle (handling wrap-around)
var angleDiff = pixelAngle.subtract(windAngle).abs();
var correctedDiff = angleDiff.where(angleDiff.gt(Math.PI), ee.Image.constant(Math.PI * 2).subtract(angleDiff));

// Plume Intensity formula (Gaussian angular spread + distance decay)
var distImg = lonLat.distance(centerPt);
var climatologicalPlume = correctedDiff.pow(2).divide(-0.15).exp()
  .multiply(ee.Image.constant(1).subtract(distImg.divide(5000).clamp(0, 1)))
  .updateMask(distImg.lt(5000)).rename('Plume_Risk').clip(emergencyBuffer);


// =========================================================================
// 4. CHART AGGREGATION FIX (Safe Unmasking)
// =========================================================================
function createSafeMonthly(collection, bandName, year, fallbackValue) {
  var months = ee.List.sequence(1, 12);
  return ee.ImageCollection.fromImages(
    months.map(function(m) {
      var start = ee.Date.fromYMD(year, m, 1);
      var end = start.advance(1, 'month');
      var col = collection.filterDate(start, end);
      var img = ee.Image(ee.Algorithms.If(col.size().eq(0), ee.Image.constant(fallbackValue).rename(bandName), col.mean()));
      return img.unmask(fallbackValue).set('system:time_start', start.millis());
    })
  );
}

var monthlyNO2 = createSafeMonthly(s5p_no2_raw, 'tropospheric_NO2_column_number_density', baselineYear, 0);
var monthlySO2 = createSafeMonthly(s5p_so2_raw, 'SO2_column_number_density', baselineYear, 0); 
var monthlyWindDir = createSafeMonthly(noaa_wind, 'Wind_Direction', baselineYear, 0); 

// =========================================================================
// 5. VISUALIZATION PARAMETERS
// =========================================================================
var pal = {
  ghg: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red'],
  plume: ['00000000', 'blue', 'cyan', 'yellow', 'orange', 'red'],
  dust: ['white', 'yellow', 'orange', 'red', 'darkred']
};

// =========================================================================
// 6. USER INTERFACE (SIDE PANEL & INTERACTIVE SIMULATOR)
// =========================================================================
var sidePanel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical', true), 
  style: {width: '450px', padding: '15px', backgroundColor: '#FFFFFF'}
});

sidePanel.add(ui.Label('MAGMA NORM EIAR', {fontWeight: 'bold', fontSize: '20px'}));
sidePanel.add(ui.Label('Comprehensive Environmental Impact Assessment & Plume Modeler', {fontSize: '12px', color: '#666'}));

// INTERACTIVE PLUME SIMULATOR UI
var plumeSimPanel = ui.Panel({style: {backgroundColor: '#E8F4F8', border: '1px solid #B0D4E3', padding: '10px', margin: '10px 0'}});
plumeSimPanel.add(ui.Label('Interactive Plume Simulator', {fontWeight: 'bold', color: '#005073', margin: '0 0 5px 0'}));
plumeSimPanel.add(ui.Label('Simulate pollutant drift based on custom wind direction.', {fontSize: '11px', color: '#333', margin: '0 0 10px 0'}));

var dirSlider = ui.Slider({min: 0, max: 360, value: 90, step: 1, style: {width: '250px', margin: '0'}});
var currentDynamicPlume;

// Plume Math Function for dynamic simulation
function drawDynamicPlume(windDirDeg) {
  var targetRad = (windDirDeg * Math.PI) / 180.0;
  var targetAngleImg = ee.Image.constant(targetRad);
  
  var diff = pixelAngle.subtract(targetAngleImg).abs();
  var finalDiff = diff.where(diff.gt(Math.PI), ee.Image.constant(Math.PI * 2).subtract(diff));
  
  var gaussian = finalDiff.pow(2).divide(-0.1).exp();
  var decay = ee.Image.constant(1).subtract(distImg.divide(5000).clamp(0, 1));
  var plume = gaussian.multiply(decay);
  return plume.updateMask(plume.gt(0.05)).clip(emergencyBuffer);
}

function updateSimulator() {
  if (currentDynamicPlume) { Map.layers().remove(currentDynamicPlume); }
  var angle = dirSlider.getValue();
  var plumeImg = drawDynamicPlume(angle);
  currentDynamicPlume = ui.Map.Layer(plumeImg, {min: 0, max: 1, palette: pal.plume}, 'Active Plume Simulation', true, 0.75);
  Map.layers().add(currentDynamicPlume);
}

dirSlider.onChange(updateSimulator);
plumeSimPanel.add(ui.Label('Wind Direction (0=N, 90=E, 180=S):', {fontSize: '11px', fontWeight: 'bold'}));
plumeSimPanel.add(dirSlider);
sidePanel.add(plumeSimPanel);
updateSimulator(); // Draw initial simulated plume

// SPATIAL LAYERS TOGGLE
var layerTogglePanel = ui.Panel({style: {backgroundColor: '#FFF', margin: '10px 0', border: '1px solid #EEE', padding: '10px'}});
layerTogglePanel.add(ui.Label('Static Spatial Data Layers', {fontWeight: 'bold'}));

var createToggle = function(name, image, vis, showDefault, description) {
  var layer = ui.Map.Layer(image, vis, name, showDefault);
  Map.layers().add(layer);
  var checkbox = ui.Checkbox({label: name, value: showDefault, style: {fontWeight: '500'}});
  checkbox.onChange(function(checked) { layer.setShown(checked); });
  layerTogglePanel.add(checkbox);
  layerTogglePanel.add(ui.Label(description, {fontSize: '10px', color: '#666', margin: '0 0 8px 25px'}));
};

createToggle('1. Climatological Plume Risk', climatologicalPlume, {min: 0, max: 1, palette: pal.plume}, false, 'Average historical plume footprint based on NOA mean winds.');
createToggle('NO2', s5p_no2_raw.mean().clip(emergencyBuffer), {min: 0, max: 0.0001, palette: pal.ghg}, false, 'Proxy for fossil fuel/industrial GHG emissions.');
createToggle('SO2', s5p_so2_raw.mean().clip(emergencyBuffer), {min: 0, max: 0.0005, palette: pal.ghg}, false, 'Sulfur Dioxide tracking atmospheric residuals.');
createToggle('4. Wind Speed', windSpeed, {min: 0, max: 10, palette: ['white', 'blue', 'darkblue']}, false, 'Mean wind velocity driving plume dispersal.');

sidePanel.add(layerTogglePanel);

// CHARTS PANEL
var chartPanel = ui.Panel({style: {backgroundColor: '#F8F9FA', padding: '10px', border: '1px solid #E0E0E0'}});
chartPanel.add(ui.Label('Monthly Plume Steering & Baselines', {fontWeight: 'bold'}));

var chartOpts = function(title, vTitle, color) {
  return { title: title, vAxis: {title: vTitle, textStyle: {fontSize: 10}}, hAxis: {format: 'MMM'}, colors: [color], legend: {position: 'none'} };
};

// Plume Steering Chart
chartPanel.add(ui.Chart.image.series({imageCollection: monthlyWindDir, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 25000})
  .setOptions(chartOpts('1. Plume Steering: Avg Wind Direction', 'Degrees (0=N, 90=E)', '#1E90FF')));

chartPanel.add(ui.Chart.image.series({imageCollection: monthlyNO2, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 2000})
  .setOptions(chartOpts('2. NO2 Emissions', 'mol/m²', '#A020F0')));

chartPanel.add(ui.Chart.image.series({imageCollection: monthlySO2, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 2000})
  .setOptions(chartOpts('3. SO2 Concentrations', 'mol/m²', '#8A2BE2')));

sidePanel.add(chartPanel);
ui.root.insert(0, sidePanel);

// Map Geometry Overlays (Added once)
Map.addLayer(emergencyBuffer, {color: 'orange'}, '5km Emergency Impact Zone', true);
Map.addLayer(facilityPolygon, {color: 'white'}, '1500m Buffer Limit', true);
Map.addLayer(basePolygon, {color: 'red'}, 'Site Boundary', true);
