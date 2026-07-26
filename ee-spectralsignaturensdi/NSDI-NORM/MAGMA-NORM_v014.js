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

// Dates for recent analysis (Using 2024-2025/26 range for robust data availability)
var startDate = '2025-01-01';
var endDate = '2026-07-14';
var climateStart = '2030-01-01';
var climateEnd = '2051-01-01';

// =========================================================================
// 2. DATA PROCESSING & SCIENTIFIC DATASETS
// =========================================================================

// A. Soil & Moisture (Sentinel-2)
function maskS2clouds(image) {
  var qa = image.select('QA60');
  return image.updateMask(qa.bitwiseAnd(1<<10).eq(0).and(qa.bitwiseAnd(1<<11).eq(0)))
              .divide(10000).copyProperties(image, ["system:time_start"]);
}
var s2Col = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(facilityPolygon).filterDate(startDate, endDate).map(maskS2clouds);
var s2Indices = s2Col.map(function(img) {
  var bsi = img.expression('((swir1 + red) - (nir + blue)) / ((swir1 + red) + (nir + blue))', {'swir1': img.select('B11'), 'red': img.select('B4'), 'nir': img.select('B8'), 'blue': img.select('B2')}).rename('BSI');
  var ndmi = img.normalizedDifference(['B8', 'B11']).rename('NDMI'); 
  return img.addBands([bsi, ndmi]);
});
var medianIndices = s2Indices.median().clip(emergencyBuffer);

// B. Thermal Footprint (Landsat 9)
var l9Thermal = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2').filterBounds(facilityPolygon).filterDate(startDate, endDate).median()
  .select('ST_B10').multiply(0.00341802).add(149.0).clip(emergencyBuffer); // Kelvin

// C. Climate Projections (CMIP6 NASA)
var cmip6Mean = ee.ImageCollection("NASA/GDDP-CMIP6").filterBounds(facilityPolygon).filter(ee.Filter.eq('model', 'ACCESS-CM2')).filter(ee.Filter.eq('scenario', 'ssp585')).filterDate(climateStart, climateEnd).mean().clip(emergencyBuffer);
var tasmax = cmip6Mean.select('tasmax').subtract(273.15).rename('Max_Temp_C');
var precip = cmip6Mean.select('pr').multiply(86400).rename('Precip_mm_day');

// D. Topography, Sea Level Rise & Flash Floods (SRTM DEM & JRC)
// Ref: Farr et al., 2007 (NASA SRTM); Pekel et al., 2016 (JRC Water)
var srtm = ee.Image('USGS/SRTMGL1_003').clip(emergencyBuffer);
var seaLevelRiseRisk = srtm.lte(2).selfMask(); // Proxy: Areas <= 2m elevation vulnerable to SLR
var slope = ee.Terrain.slope(srtm);
var flashFloodRisk = slope.gte(5).and(srtm.lte(50)).selfMask(); // Proxy: Steep slopes leading to lowlands

// E. Atmosphere, GHG, Dust & Aerosols (Sentinel-5P)
// Ref: Veefkind et al., 2012 (TROPOMI); Stein Zweers et al., 2018 (Aerosol Index)
var s5p_no2 = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_NO2").filterBounds(emergencyBuffer).filterDate(startDate, endDate).select('tropospheric_NO2_column_number_density');
var s5p_aer = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_AER_AI").filterBounds(emergencyBuffer).filterDate(startDate, endDate).select('absorbing_aerosol_index');
var s5p_so2 = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_SO2").filterBounds(emergencyBuffer).filterDate(startDate, endDate).select('SO2_column_number_density'); // Proxy for atmospheric chemistry/cloud seeding residuals

// F. Wind Dynamics (ECMWF ERA5) - Wind Direction & Speed
// Ref: Hersbach et al., 2020 (ERA5)
var era5 = ee.ImageCollection("ECMWF/ERA5/DAILY").filterBounds(emergencyBuffer).filterDate('2025-01-01', '2026-01-01').mean();
var windSpeed = era5.expression('sqrt(u**2 + v**2)', {u: era5.select('u_component_of_wind_10m'), v: era5.select('v_component_of_wind_10m')}).clip(emergencyBuffer);

// G. Water Footprint & Groundwater (MODIS ET & GRACE)
// Ref: Mu et al., 2011 (MODIS ET); Landerer & Swenson, 2012 (GRACE Tellus)
var modisET = ee.ImageCollection("MODIS/061/MOD16A2").filterBounds(emergencyBuffer).filterDate('2023-01-01', '2025-01-01').select('ET_500m').mean().clip(emergencyBuffer);
var graceGW = ee.ImageCollection("NASA/GRACE/MASS_GRIDS/LAND").filterBounds(emergencyBuffer).filterDate('2020-01-01', '2023-01-01').select('lwe_thickness').mean().clip(emergencyBuffer); // Equivalent water thickness

// H. Active Fires (FIRMS)
// Ref: Davies et al., 2009 (NASA FIRMS)
var fires = ee.ImageCollection("FIRMS").filterBounds(emergencyBuffer).filterDate(startDate, endDate).select('T21').max().clip(emergencyBuffer);

// =========================================================================
// 3. VISUALIZATION PARAMETERS & LAYER SETUP
// =========================================================================
var pal = {
  ghg: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red'],
  dust: ['white', 'yellow', 'orange', 'red', 'darkred'],
  water: ['red', 'orange', 'yellow', 'green', 'blue'],
  wind: ['white', 'lightblue', 'blue', 'darkblue'],
  gw: ['darkred', 'red', 'white', 'blue', 'darkblue']
};

// Add Geometry Layers
Map.addLayer(emergencyBuffer, {color: 'orange', fillColor: 'FFA50044'}, '5km Emergency Impact Zone (Land/Air/GW)', true);
Map.addLayer(facilityPolygon, {color: 'white', fillColor: '00000000'}, '1500m Core Buffer', true);
Map.addLayer(basePolygon, {color: 'red', fillColor: 'FF000088'}, 'MAGMA NORM Site', true);

// =========================================================================
// 4. USER INTERFACE (SIDE PANEL)
// =========================================================================
var sidePanel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical', true), // Makes the panel scrollable
  style: {width: '450px', padding: '15px', backgroundColor: '#FFFFFF', border: '1px solid #CCCCCC'}
});

sidePanel.add(ui.Label('MAGMA NORM EIAR', {fontWeight: 'bold', fontSize: '20px', color: '#333333', backgroundColor: '#FFFFFF'}));
sidePanel.add(ui.Label('Environmental Impact Assessment Report', {fontSize: '13px', color: '#666666', margin: '0 0 10px 0', backgroundColor: '#FFFFFF'}));
sidePanel.add(ui.Label('Integrates Sentinel, Landsat, MODIS, ERA5, & NASA GRACE data for comprehensive environmental compliance auditing.', {fontSize: '11px', color: '#888', margin: '0 0 15px 0'}));

// Layer Toggles Container
var layerTogglePanel = ui.Panel({style: {backgroundColor: '#FFFFFF', margin: '10px 0', border: '1px solid #EEE', padding: '10px'}});
layerTogglePanel.add(ui.Label('Spatial Data Layers & Proxies', {color: '#333333', fontWeight: 'bold', backgroundColor: '#FFFFFF'}));

var createToggle = function(name, image, vis, showDefault, description) {
  var layer = ui.Map.Layer(image, vis, name, showDefault);
  Map.layers().add(layer);
  var checkbox = ui.Checkbox({label: name, value: showDefault, style: {color: '#333333', fontWeight: '500'}});
  checkbox.onChange(function(checked) { layer.setShown(checked); });
  layerTogglePanel.add(checkbox);
  layerTogglePanel.add(ui.Label(description, {fontSize: '10px', color: '#666666', margin: '0 0 8px 25px'}));
};

// Add Toggles (Set mostly to false to prevent map clutter; user activates as needed)
createToggle('1. Sea Level Rise Vulnerability', seaLevelRiseRisk, {palette: ['#00008B']}, false, 'DEM proxy for coastal inundation (<2m elev). Ref: NASA SRTM90.');
createToggle('2 & 4. Carbon/GHG Footprint (NO2)', s5p_no2.mean().clip(emergencyBuffer), {min: 0, max: 0.0001, palette: pal.ghg}, false, 'Tropospheric NO2 as proxy for fossil fuel/industrial GHG emissions. Ref: Sentinel-5P TROPOMI.');
createToggle('3. Water Footprint (Evapotranspiration)', modisET, {min: 0, max: 200, palette: pal.water}, false, 'Surface water usage and loss (kg/m²/8day). Ref: MOD16A2.');
createToggle('5. Wind Speed & Direction', windSpeed, {min: 2, max: 8, palette: pal.wind}, false, 'Daily surface wind velocity (m/s) defining emergency plume trajectory. Ref: ECMWF ERA5.');
createToggle('6 & 7. Dust & Sandstorms (Aerosol Index)', s5p_aer.mean().clip(emergencyBuffer), {min: -1, max: 2, palette: pal.dust}, false, 'UV Absorbing Aerosol Index tracking desert dust and PM storms. Ref: Sentinel-5P.');
createToggle('8 & 11. Atmos Chemistry / Cloud Seeding (SO2)', s5p_so2.mean().clip(emergencyBuffer), {min: 0, max: 0.0005, palette: pal.ghg}, false, 'Sulfur Dioxide tracking atmospheric chemical injection and residual aerosols. Ref: Sentinel-5P.');
createToggle('9. Digital Elevation Model (DEM)', srtm, {min: 0, max: 50, palette: ['#333', '#888', '#DDD', '#FFF']}, false, 'Topographic baseline (m). Ref: USGS SRTMGL1.');
createToggle('10. Flash Flood Risk Paths', flashFloodRisk, {palette: ['#00FFFF']}, false, 'Steep slope to lowland topographic wetness transitions. Ref: SRTM Derived.');
createToggle('12. Active Fires / Thermal Anomalies', fires, {min: 300, max: 400, palette: ['red', 'yellow', 'white']}, false, 'Max thermal signatures indicating combustion/flaring. Ref: NASA FIRMS.');
createToggle('13. Groundwater Storage Anomaly', graceGW, {min: -10, max: 10, palette: pal.gw}, false, 'Liquid Water Equivalent (LWE) tracking aquifer depletion/pollution stress. Ref: NASA GRACE.');
createToggle('14. Soil Disturbance (BSI)', medianIndices.select('BSI'), {min: -0.2, max: 0.4, palette: ['#0000FF', '#FFFF00', '#FFA500', '#FF0000']}, true, 'Sentinel-2 Bare Soil Index for land footprint tracking.');

sidePanel.add(layerTogglePanel);

// =========================================================================
// 5. REGIONAL ANALYTICS CHARTS (Scrollable Area)
// =========================================================================
var chartPanel = ui.Panel({style: {backgroundColor: '#F8F9FA', padding: '10px', border: '1px solid #E0E0E0', margin: '10px 0'}});
chartPanel.add(ui.Label('Environmental Time-Series Data', {fontWeight: 'bold', color: '#333', backgroundColor: '#F8F9FA'}));

// Chart 1: Air Quality (NO2 / Carbon Proxy)
var no2Chart = ui.Chart.image.series({
  imageCollection: s5p_no2, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 1000
}).setOptions({
  title: 'GHG / Carbon Footprint Proxy (S5P NO2)',
  vAxis: {title: 'mol/m²', textStyle: {color: '#333'}, titleTextStyle: {fontSize: 10}},
  hAxis: {format: 'MM-yyyy'}, colors: ['#A020F0'], legend: {position: 'none'},
  chartArea: {backgroundColor: '#FFF'}, backgroundColor: '#F8F9FA'
});
chartPanel.add(no2Chart);

// Chart 2: Dust and Sandstorms (Aerosol Index)
var dustChart = ui.Chart.image.series({
  imageCollection: s5p_aer, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 1000
}).setOptions({
  title: 'Atmospheric Dust & Sandstorm Events (AER_AI)',
  vAxis: {title: 'Index Value', textStyle: {color: '#333'}, titleTextStyle: {fontSize: 10}},
  hAxis: {format: 'MM-yyyy'}, colors: ['#D2691E'], legend: {position: 'none'},
  chartArea: {backgroundColor: '#FFF'}, backgroundColor: '#F8F9FA'
});
chartPanel.add(dustChart);

// Chart 3: Water Footprint / Evapotranspiration
var etCollection = ee.ImageCollection("MODIS/061/MOD16A2").filterBounds(emergencyBuffer).filterDate('2024-01-01', endDate).select('ET_500m');
var etChart = ui.Chart.image.series({
  imageCollection: etCollection, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 500
}).setOptions({
  title: 'Facility Regional Water Footprint (MODIS ET)',
  vAxis: {title: 'Evapotranspiration (kg/m²)', textStyle: {color: '#333'}, titleTextStyle: {fontSize: 10}},
  hAxis: {format: 'MM-yyyy'}, colors: ['#1E90FF'], legend: {position: 'none'},
  chartArea: {backgroundColor: '#FFF'}, backgroundColor: '#F8F9FA'
});
chartPanel.add(etChart);

sidePanel.add(chartPanel);
ui.root.insert(0, sidePanel);

// Ensure base geometry draws on top of all the newly generated raster layers
Map.layers().set(Map.layers().length(), ui.Map.Layer(emergencyBuffer, {color: 'orange', fillColor: 'FFA50044'}, '5km Emergency Impact Zone', true));
Map.layers().set(Map.layers().length(), ui.Map.Layer(facilityPolygon, {color: 'white', fillColor: '00000000'}, '1500m Buffer Limit', true));
Map.layers().set(Map.layers().length(), ui.Map.Layer(basePolygon, {color: 'red', fillColor: 'FF000088'}, 'MAGMA NORM', true));
