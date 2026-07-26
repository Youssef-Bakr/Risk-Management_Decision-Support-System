//----------------------------------------------------------------------------------------
//Youssef Mohamed Bakr _ +201121121000 _ (www.linkedin.com/in/youssef-bakr)
//https://github.com/Youssef-Bakr
//----------------------------------------------------------------------------------------
//2026-05-21_RS_Matruh_RS-Unit_DRC _v07_Egypt_Matrouh_GEE-Data-Catalog
//----------------------------------------------------------------------------------------
Map.addLayer(Egypt, {},'Egypt',false);
Map.centerObject(Egypt, 5);
//----------------------------------------------------------------------------------------

// 1. Load the Global Administrative Unit Layers (GAUL) level 1
var admin1 = ee.FeatureCollection('FAO/GAUL/2015/level1');

// 2. Filter for the specific Admin-1 area (Replace Country and Region names)
// Example: Cairo Governorate in Egypt
var roi = admin1
  .filter(ee.Filter.eq('ADM0_NAME', 'Egypt'))
  .filter(ee.Filter.eq('ADM1_NAME', 'Matrouh'));

// 3. Load your satellite image (e.g., Sentinel-2 Surface Reflectance)
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
           .filterBounds(roi)
           .filterDate('2026-01-01', '2026-05-31')
           .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
           .median(); // Create a composite

// 4. Clip the image to the filtered FeatureCollection
var clippedS2 = s2.clipToCollection(roi);

// 5. Visualize
Map.centerObject(roi, 9);
Map.addLayer(roi, {}, 'Matrouh Boundary',false);
Map.addLayer(clippedS2, {bands: ['B4', 'B3', 'B2'], min: 0, max: 2000}, 'Sentinel-2 _ 2026-01-01 >>> 2026-05-31');
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
var lsNDVI = ee.ImageCollection('LANDSAT/COMPOSITES/C02/T1_L2_32DAY_NDVI')
                  .filterDate('2026-01-01', '2026-05-31');
var colorized = lsNDVI.select('NDVI');
//  Visualize
var colorizedVis = {
  min: 0,
  max: 1,
  palette: [
    'ffffff', 'ce7e45', 'df923d', 'f1b555', 'fcd163', '99b718', '74a901',
    '66a000', '529400', '3e8601', '207401', '056201', '004c00', '023b01',
    '012e01', '011d01', '011301'
  ],
};
Map.addLayer(lsNDVI, colorizedVis, 'Landsat NDVI _ 2026-01-01 >>> 2026-05-31',false);
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
var coll = ee.ImageCollection('FAO/WAPOR/2/L1_NPP_D');
var image = coll.first();
Map.addLayer(image, {min: 0, max: 5000}, 'WAPOR Dekadal Net Primary Production 2.0 _ 2009–2023',false);

// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
var coll = ee.ImageCollection('FAO/WAPOR/3/L1_AETI_D');
var image = coll.first();
Map.addLayer(image, {min: 0, max: 50},'WAPOR Actual Evapotranspiration and Interception 3.0 _ 2018-2026',false);
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
var coll = ee.ImageCollection('FAO/WAPOR/2/L1_RET_E');
var image = coll.first();
Map.addLayer(image, {min: 0, max: 100},'WAPOR Daily Reference Evapotranspiration 2.0 _ 2009-2023',false);
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
var dataset = ee.ImageCollection('NOAA/CDR/VIIRS/LAI_FAPAR/V1')
                  .filter(ee.Filter.date('2026-01-01', '2026-05-31'));
var leafAreaIndex = dataset.select('LAI');
var leafAreaIndexVis = {
  min: 0.0,
  max: 4000.0,
  palette: ['3b0200', '977705', 'ca9f06', 'ffca09', '006a03', '003b02'],
};

Map.addLayer(leafAreaIndex, leafAreaIndexVis, 'Leaf Area Index and Fraction of Absorbed Photosynthetically Active Radiation _ 2026-01-01 >>> 2026-05-31',false);
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------

var dataset=ee.ImageCollection('NASA/FLDAS/NOAH01/C/GL/M/V001')
              .filter(ee.Filter.date('2026-01-01', '2026-05-31'));
var layer = dataset.select('Evap_tavg');

var band_viz = {
  min: 0.0,
  max: 0.00005,
  opacity: 1.0,
  palette: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']
};

Map.addLayer(layer, band_viz, 'Average Evapotranspiration',false);
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// Get data generated from model hour 0 for January 1st, 2019.
var dataset = ee.ImageCollection('ECMWF/CAMS/NRT')
                  .filterDate('2026-01-01', '2026-05-20')
                  .filter('model_initialization_hour == 0');

// Select first and last forecast hours.
var hour00 = dataset.filter('model_forecast_hour == 0').first();
var hour21 = dataset.filter('model_forecast_hour == 21').first();

// Visualization parameters for specified aerosol band.
var visParams = {
  bands: ['total_aerosol_optical_depth_at_550nm_surface'],
  min: 0.0,
  max: 3.6,
  palette: [
    '5e4fa2', '3288bd', '66c2a5', 'abe0a4', 'e6f598', 'ffffbf',
    'fee08b', 'fdae61', 'f46d43', 'd53e4f', '9e0142'
  ]
};

// Display forecasts on the map.

Map.addLayer(hour00, visParams, 'Total Aerosal Optical Depth - H00', false, 0.8);
Map.addLayer(hour21, visParams, 'Total Aerosal Optical Depth - H21', false, 0.8);
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------

// ----------------------------------------------------------------------------------------
//  Create a panel to hold widgets.
// ----------------------------------------------------------------------------------------
var panel = ui.Panel();
panel.style().set('width', '250px');
// ----------------------------------------------------------------------------------------
// Create an intro panel with labels.
// ----------------------------------------------------------------------------------------
var intro = ui.Panel([]);
panel.add(intro);
// ----------------------------------------------------------------------------------------
// Add the panel to the ui.root.
// ----------------------------------------------------------------------------------------
ui.root.insert(0, panel);

// ----------------------------------------------------------------------------------------
// Labels
// ----------------------------------------------------------------------------------------
var Label01 = ui.Label(
                        {value: 'Egypt - (Matrouh)' ,style: {fontSize: '20px', fontWeight: 'bold'},}
                      );

panel.widgets().set(1, Label01);
// ----------------------------------------------------------------------------------------
var Label02 = ui.Label('\n\nEarth Engine Data Catalog', {whiteSpace: 'pre'});
panel.widgets().set(2, Label02);
// ----------------------------------------------------------------------------------------
var Label03 = ui.Label('www.linkedin.com/in/youssef-bakr', {whiteSpace: 'pre'});
panel.widgets().set(3, Label03);
// ----------------------------------------------------------------------------------------
var Label04 = ui.Label('https://github.com/Youssef-Bakr', {whiteSpace: 'pre'});
panel.widgets().set(4, Label04);
// ----------------------------------------------------------------------------------------

