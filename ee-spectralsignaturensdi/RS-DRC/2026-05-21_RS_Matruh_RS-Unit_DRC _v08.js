
//----------------------------------------------------------------------------------------
//Youssef Mohamed Bakr _ +201121121000 _ (www.linkedin.com/in/youssef-bakr)
//https://github.com/Youssef-Bakr
//----------------------------------------------------------------------------------------
//2026-05-21_RS_Matruh_RS-Unit_DRC _v08_Egypt_Matrouh_Oil
//----------------------------------------------------------------------------------------
Map.addLayer(Egypt, {},'Egypt',false);
var p = ee.Geometry.Point(27.32073300198371,31.206893304199085);
Map.centerObject(p, 20);
Map.setOptions('SATELLITE');
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
//Map.centerObject(roi, 9);
Map.addLayer(roi, {}, 'Matrouh Boundary',false);
Map.addLayer(clippedS2, {bands: ['B4', 'B3', 'B2'], min: 0, max: 2000}, 'Sentinel-2 _ 2026-01-01 >>> 2026-05-31',false);
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


//_________________________________________________________________________
var NDVI_L8_Baseline = ee.ImageCollection('LANDSAT/COMPOSITES/C02/T1_L2_8DAY_NDVI')
    .filterDate('2000-01-01', '2015-12-31')
    .filterBounds(roi)
    .median()
print (NDVI_L8_Baseline)
Map.addLayer(NDVI_L8_Baseline, colorizedVis, 'NDVI_L8_Baseline _ 2000-01-01 >>> 2015-12-31',false);

var NDVI_L8_P2 = ee.ImageCollection('LANDSAT/COMPOSITES/C02/T1_L2_8DAY_NDVI')
    .filterDate('2016-01-01', '2023-12-31')
    .filterBounds(roi)
    .median()
print(NDVI_L8_P2) 
Map.addLayer(NDVI_L8_P2, colorizedVis, 'NDVI_L8_P2 _ 2016-01-01 >>> 2023-12-31',false);

var NDVI_sub_P2_Baseline = NDVI_L8_P2.subtract(NDVI_L8_Baseline);
 print (NDVI_sub_P2_Baseline)

//Visualizing the difference between two NDVI images
Map.addLayer(NDVI_sub_P2_Baseline.clip(roi), {min: -0.5, max: 0.5, palette: ['red', 'white', 'green']}, 'NDVI Change: NDVI_L8_P2 subtract NDVI_L8_Baseline',false);



// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
var collection = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_CH4')
  .select('CH4_column_volume_mixing_ratio_dry_air')
  .filterDate('2026-01-01', '2026-05-31');

var band_viz = {
  min: 1750,
  max: 1900,
  palette: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']
};

Map.addLayer(collection.mean(), band_viz, 'S5P CH4',false);

// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
var collection = ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_CO')
  .select('CO_column_number_density')
  .filterDate('2026-01-01', '2026-05-31');

var band_viz = {
  min: 0,
  max: 0.05,
  palette: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']
};

Map.addLayer(collection.mean(), band_viz, 'S5P CO',false);
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
var collection = ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_AER_AI')
  .select('absorbing_aerosol_index')
  .filterDate('2026-01-01', '2026-05-31');

var band_viz = {
  min: -1,
  max: 2.0,
  palette: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']
};

Map.addLayer(collection.mean(), band_viz, 'S5P Aerosol',false);
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------

var collection = ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_HCHO')
  .select('tropospheric_HCHO_column_number_density')
  .filterDate('2026-01-01', '2026-05-31');

var band_viz = {
  min: 0.0,
  max: 0.0003,
  palette: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']
};

Map.addLayer(collection.mean(), band_viz, 'S5P HCHO',false);

// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
var collection = ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_NO2')
  .select('NO2_column_number_density')
  .filterDate('2026-01-01', '2026-05-31');

var band_viz = {
  min: 0,
  max: 0.0002,
  palette: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']
};

Map.addLayer(collection.mean(), band_viz, 'S5P N02',false);
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
var imgVV = ee.ImageCollection('COPERNICUS/S1_GRD')
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
        .filter(ee.Filter.eq('instrumentMode', 'IW'))
        .select('VV')
        .map(function(image) {
          var edge = image.lt(-30.0);
          var maskedImage = image.mask().and(edge.not());
          return image.updateMask(maskedImage);
        });

var desc = imgVV.filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'));
var asc = imgVV.filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'));

var spring = ee.Filter.date('2025-03-01', '2025-04-20');
var lateSpring = ee.Filter.date('2025-04-21', '2025-06-10');
var summer = ee.Filter.date('2025-06-11', '2025-08-31');

var descChange = ee.Image.cat(
        desc.filter(spring).mean(),
        desc.filter(lateSpring).mean(),
        desc.filter(summer).mean());

var ascChange = ee.Image.cat(
        asc.filter(spring).mean(),
        asc.filter(lateSpring).mean(),
        asc.filter(summer).mean());


Map.addLayer(ascChange, {min: -25, max: 5}, 'Multi-T Mean ASC', false);
Map.addLayer(descChange, {min: -25, max: 5}, 'Multi-T Mean DESC', false);


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
var Label02 = ui.Label('\n\nEarly Warning Systems\n\nAtmospheric Chemistry', {whiteSpace: 'pre'});
panel.widgets().set(2, Label02);
// ----------------------------------------------------------------------------------------
var Label03 = ui.Label('www.linkedin.com/in/youssef-bakr', {whiteSpace: 'pre'});
panel.widgets().set(3, Label03);
// ----------------------------------------------------------------------------------------
var Label04 = ui.Label('https://github.com/Youssef-Bakr', {whiteSpace: 'pre'});
panel.widgets().set(4, Label04);
// ----------------------------------------------------------------------------------------

