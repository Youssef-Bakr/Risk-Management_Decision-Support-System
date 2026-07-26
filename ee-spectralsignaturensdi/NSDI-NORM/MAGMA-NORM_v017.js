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

// A. Soil, Moisture, & Vegetation (Sentinel-2)
function maskS2clouds(image) {
  var qa = image.select('QA60');
  return image.updateMask(qa.bitwiseAnd(1<<10).eq(0).and(qa.bitwiseAnd(1<<11).eq(0)))
              .divide(10000).copyProperties(image, ["system:time_start"]);
}
var s2Col = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(facilityPolygon).filterDate(recentStart, recentEnd).map(maskS2clouds);
var s2Indices = s2Col.map(function(img) {
  var bsi = img.expression('((swir1 + red) - (nir + blue)) / ((swir1 + red) + (nir + blue))', {'swir1': img.select('B11'), 'red': img.select('B4'), 'nir': img.select('B8'), 'blue': img.select('B2')}).rename('BSI');
  var ndmi = img.normalizedDifference(['B8', 'B11']).rename('NDMI'); 
  var ndvi = img.normalizedDifference(['B8', 'B4']).rename('NDVI'); // Added Vegetation Health
  return img.addBands([bsi, ndmi, ndvi]);
});
var medianIndices = s2Indices.median().clip(emergencyBuffer);

// B. Thermal Footprint (Landsat 9) - Converted to Celsius
var l9Thermal = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2').filterBounds(facilityPolygon).filterDate(recentStart, recentEnd).median()
  .select('ST_B10').multiply(0.00341802).add(149.0).subtract(273.15).clip(emergencyBuffer); 

// C. Topography, Sea Level Rise & Flash Floods (SRTM DEM)
var srtm = ee.Image('USGS/SRTMGL1_003').clip(emergencyBuffer);
var seaLevelRiseRisk = srtm.lte(2).selfMask(); 
var slope = ee.Terrain.slope(srtm);
var flashFloodRisk = slope.gte(5).and(srtm.lte(50)).selfMask(); 

// D. Atmosphere, GHG, Dust, Gas & Aerosols (Sentinel-5P raw collections)
var s5p_no2_raw = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_NO2").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('tropospheric_NO2_column_number_density');
var s5p_aer_raw = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_AER_AI").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('absorbing_aerosol_index');
var s5p_so2_raw = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_SO2").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('SO2_column_number_density'); 
var s5p_co_raw = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_CO").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('CO_column_number_density'); // Added CO
var s5p_ch4_raw = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_CH4").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('CH4_column_volume_mixing_ratio_dry_air'); // Added Methane

// E. Wind Dynamics (NOAA CFSV2 6-Hourly)
var windCol = ee.ImageCollection("NOAA/CFSV2/FOR6H").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd);
var windMean = windCol.mean();
var windSpeed = windMean.expression('sqrt(u**2 + v**2)', {
  u: windMean.select('u-component_of_wind_height_above_ground'), 
  v: windMean.select('v-component_of_wind_height_above_ground')
}).clip(emergencyBuffer);

// F. Water Footprint & Groundwater (MODIS ET & GRACE)
var modisET_raw = ee.ImageCollection("MODIS/061/MOD16A2").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('ET');
var etMean = modisET_raw.mean().clip(emergencyBuffer);
var graceGW = ee.ImageCollection("NASA/GRACE/MASS_GRIDS/LAND").filterBounds(emergencyBuffer).filterDate('2020-01-01', '2023-01-01').select('lwe_thickness').mean().clip(emergencyBuffer); 

// G. Regional Surface Temperature (MODIS LST) - Added for Thermal Charting
var modisLST_raw = ee.ImageCollection("MODIS/061/MOD11A2").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd)
  .map(function(img) {
    return img.select('LST_Day_1km').multiply(0.02).subtract(273.15) // Convert Kelvin to Celsius
      .rename('LST_Celsius').copyProperties(img, ['system:time_start']);
  });

// H. Active Fires (FIRMS)
var fires = ee.ImageCollection("FIRMS").filterBounds(emergencyBuffer).filterDate(recentStart, recentEnd).select('T21').max().clip(emergencyBuffer);


// =========================================================================
// 3. CHART AGGREGATION FIX (Safe Unmasking with Fallbacks)
// =========================================================================

function createSafeMonthly(collection, bandName, year, fallbackValue) {
  var months = ee.List.sequence(1, 12);
  return ee.ImageCollection.fromImages(
    months.map(function(m) {
      var start = ee.Date.fromYMD(year, m, 1);
      var end = start.advance(1, 'month');
      var col = collection.filterDate(start, end);
      
      var img = ee.Image(ee.Algorithms.If(
        col.size().eq(0),
        ee.Image.constant(fallbackValue).rename(bandName),
        col.mean()
      ));
      
      return img.unmask(fallbackValue).set('system:time_start', start.millis());
    })
  );
}

// Generate Monthly Collections
var monthlyNO2 = createSafeMonthly(s5p_no2_raw, 'tropospheric_NO2_column_number_density', baselineYear, 0);
var monthlyAER = createSafeMonthly(s5p_aer_raw, 'absorbing_aerosol_index', baselineYear, 0);
var monthlyET = createSafeMonthly(modisET_raw, 'ET', baselineYear, 0);
var monthlyCO = createSafeMonthly(s5p_co_raw, 'CO_column_number_density', baselineYear, 0);
var monthlyCH4 = createSafeMonthly(s5p_ch4_raw, 'CH4_column_volume_mixing_ratio_dry_air', baselineYear, 1800); // 1800 ppb standard baseline
var monthlyLST = createSafeMonthly(modisLST_raw, 'LST_Celsius', baselineYear, 35); // 35C baseline for desert


// =========================================================================
// 4. VISUALIZATION PARAMETERS
// =========================================================================
var pal = {
  ghg: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red'],
  co: ['black', 'purple', 'blue', 'green', 'yellow', 'red'],
  ch4: ['black', 'blue', 'cyan', 'green', 'yellow', 'orange', 'red'],
  dust: ['white', 'yellow', 'orange', 'red', 'darkred'],
  water: ['red', 'orange', 'yellow', 'green', 'blue'],
  wind: ['white', 'lightblue', 'blue', 'darkblue'],
  gw: ['darkred', 'red', 'white', 'blue', 'darkblue'],
  temp: ['blue', 'cyan', 'yellow', 'red', 'darkred'],
  veg: ['FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718', '74A901', '66A000', '529400']
};

// =========================================================================
// 5. USER INTERFACE (SIDE PANEL & CHARTS)
// =========================================================================
var sidePanel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical', true), 
  style: {width: '450px', padding: '15px', backgroundColor: '#FFFFFF', border: '1px solid #CCCCCC'}
});

sidePanel.add(ui.Label('MAGMA NORM EIAR', {fontWeight: 'bold', fontSize: '20px', color: '#333333'}));
sidePanel.add(ui.Label('Comprehensive Environmental Impact Assessment', {fontSize: '13px', color: '#666666', margin: '0 0 10px 0'}));

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
createToggle('2. Habitat / Veg Health (NDVI)', medianIndices.select('NDVI'), {min: 0, max: 0.5, palette: pal.veg}, false, 'Tracks surrounding ecological health (S2).');
createToggle('3. Carbon/GHG Footprint (NO2)', s5p_no2_raw.mean().clip(emergencyBuffer), {min: 0, max: 0.0001, palette: pal.ghg}, false, 'Proxy for fossil fuel/industrial GHG emissions.');
createToggle('4. Carbon Monoxide (CO)', s5p_co_raw.mean().clip(emergencyBuffer), {min: 0.02, max: 0.04, palette: pal.co}, false, 'Combustion exhaust and flaring index.');
createToggle('5. Methane Leaks (CH4)', s5p_ch4_raw.mean().clip(emergencyBuffer), {min: 1800, max: 1950, palette: pal.ch4}, false, 'Hydrocarbon and waste emission proxy.');
createToggle('6. Water Footprint (ET)', etMean.unmask(0), {min: 0, max: 200, palette: pal.water}, false, 'Surface water usage and loss (kg/m²/8day).');
createToggle('7. Facility Thermal Footprint', l9Thermal, {min: 30, max: 55, palette: pal.temp}, false, 'High-res surface temp (°C) for heat islands (Landsat 9).');
createToggle('8. Dust & Sandstorms (AER)', s5p_aer_raw.mean().clip(emergencyBuffer), {min: -1, max: 2, palette: pal.dust}, false, 'UV Absorbing Aerosol Index tracking PM storms.');
createToggle('9. Atmos Chemistry (SO2)', s5p_so2_raw.mean().clip(emergencyBuffer), {min: 0, max: 0.0005, palette: pal.ghg}, false, 'Sulfur Dioxide tracking atmospheric residual aerosols.');
createToggle('10. Wind Speed & Direction', windSpeed, {min: 0, max: 15, palette: pal.wind}, false, 'Daily surface wind velocity (m/s) (NOAA).');
createToggle('11. Flash Flood Risk Paths', flashFloodRisk, {palette: ['#00FFFF']}, false, 'Steep slope to lowland topographic wetness transitions.');
createToggle('12. Active Fires / Thermal', fires, {min: 300, max: 400, palette: ['red', 'yellow', 'white']}, false, 'Max thermal signatures indicating flaring (FIRMS).');
createToggle('13. Soil Disturbance (BSI)', medianIndices.select('BSI'), {min: -0.2, max: 0.4, palette: ['#0000FF', '#FFFF00', '#FFA500', '#FF0000']}, true, 'Sentinel-2 Bare Soil Index for land footprint tracking.');

sidePanel.add(layerTogglePanel);

// Charts Panel (Scrollable inside the side panel)
var chartPanel = ui.Panel({style: {backgroundColor: '#F8F9FA', padding: '10px', border: '1px solid #E0E0E0', margin: '10px 0'}});
chartPanel.add(ui.Label('Monthly Regional Baseline Metrics (2023)', {fontWeight: 'bold', color: '#333'}));

var chartOpts = function(title, vTitle, color) {
  return {
    title: title, vAxis: {title: vTitle, textStyle: {color: '#333'}, titleTextStyle: {fontSize: 10}},
    hAxis: {format: 'MMM', gridlines: {count: 12}}, colors: [color], legend: {position: 'none'},
    chartArea: {backgroundColor: '#FFF'}, backgroundColor: '#F8F9FA'
  };
};

chartPanel.add(ui.Chart.image.series({imageCollection: monthlyNO2, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 2000}).setOptions(chartOpts('Nitrogen Dioxide (NO2) Emissions', 'mol/m²', '#A020F0')));
chartPanel.add(ui.Chart.image.series({imageCollection: monthlyCO, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 2000}).setOptions(chartOpts('Carbon Monoxide (CO) Combustion', 'mol/m²', '#FF4500')));
chartPanel.add(ui.Chart.image.series({imageCollection: monthlyCH4, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 2000}).setOptions(chartOpts('Methane (CH4) Concentration', 'ppb', '#00CED1')));
chartPanel.add(ui.Chart.image.series({imageCollection: monthlyLST, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 1000}).setOptions(chartOpts('Land Surface Temp / Heat Island', 'Celsius (°C)', '#DC143C')));
chartPanel.add(ui.Chart.image.series({imageCollection: monthlyAER, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 2000}).setOptions(chartOpts('Atmospheric Dust & Aerosols', 'Index Value', '#D2691E')));
chartPanel.add(ui.Chart.image.series({imageCollection: monthlyET, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 1000}).setOptions(chartOpts('Regional Water Footprint (ET)', 'kg/m²', '#1E90FF')));

sidePanel.add(chartPanel);
ui.root.insert(0, sidePanel);

// =========================================================================
// 6. DRAW FINAL GEOMETRY LAYERS (Added only once, on top)
// =========================================================================
Map.addLayer(emergencyBuffer, {color: 'orange', fillColor: 'FFA50044'}, '5km Emergency Impact Zone', true);
Map.addLayer(facilityPolygon, {color: 'white', fillColor: '00000000'}, '1500m Buffer Limit', true);
Map.addLayer(basePolygon, {color: 'red', fillColor: 'FF000088'}, 'MAGMA NORM Site', true);
