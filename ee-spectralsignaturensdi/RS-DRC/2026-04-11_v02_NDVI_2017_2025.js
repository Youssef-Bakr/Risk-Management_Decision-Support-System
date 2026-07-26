
//----------------------------------------------------------------------------------------
//
//Youssef Mohamed Bakr _ +201121121000 _ (www.linkedin.com/in/youssef-bakr)
//https://github.com/Youssef-Bakr/DRC_UNCCD_GEE
//
//----------------------------------------------------------------------------------------
/*
Dataset Availability
2013 >> 2026
ee.ImageCollection("LANDSAT/LC08/C02/T1_L2") 
Revisit Interval
16 Days
30 meters 
*/
//----------------------------------------------------------------------------------------
//ee.FeatureCollection('FAO/GAUL/2015/level0')
//  .filter('ADM0_NAME == "Egypt"').first().geometry();
var roi = Egypt
//_________________________________________________________________________
var L8_2025 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate('2025-01-01', '2025-12-31')
    .filterBounds(roi)
    .map(applyScaleFactors)
    .median();
//_________________________________________________________________________
//_________________________________________________________________________
var L8_2017 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate('2017-01-01', '2017-12-31')
    .filterBounds(roi)
    .map(applyScaleFactors)
    .median();
//_________________________________________________________________________
// Compute the Normalized Difference Vegetation Index (NDVI).
var nir_2025 = L8_2025.select('SR_B5');
var red_2025 = L8_2025.select('SR_B4');
var ndvi_2025 = nir_2025.subtract(red_2025).divide(nir_2025.add(red_2025)).rename('NDVI_2025');
//__________________________________
//__________________________________
var nir_2017 = L8_2017.select('SR_B5');
var red_2017 = L8_2017.select('SR_B4');
var ndvi_2017 = nir_2017.subtract(red_2017).divide(nir_2017.add(red_2017)).rename('NDVI_2017');
//_________________________________________________________________________ 
//__________________________________
var NDVI_sub_2025_2017 = ndvi_2025.subtract(ndvi_2017);
//_________________________________________________________________________    
// Applies scaling factors.
function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
}
//_________________________________________________________________________
//_________________________________________________________________________
//_________________________________________________________________________
// Landsat 8 Collection 2 surface reflectance images of interest.
var L8col2_SR_2025 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterBounds(roi)
  .filterDate('2025-01-01', '2025-12-31')
  .map(prepSrL8)
  .select('SR.*')
  .median();
//_________________________________________________________________________  

//_________________________________________________________________________  
var L8col2_SR_2017 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterBounds(roi)
  .filterDate('2027-01-01', '2017-12-31')
  .map(prepSrL8)
  .select('SR.*')
  .median();
//_________________________________________________________________________
//_________________________________________________________________________  
// A function that scales and masks Landsat 8 (C2) surface reflectance images.
function prepSrL8(image) {
  // Develop masks for unwanted pixels (fill, cloud, cloud shadow).
  var qaMask = image.select('QA_PIXEL').bitwiseAnd(parseInt('11111', 2)).eq(0);
  var saturationMask = image.select('QA_RADSAT').eq(0);

  // Apply the scaling factors to the appropriate bands.
  var getFactorImg = function(factorNames) {
    var factorList = image.toDictionary().select(factorNames).values();
    return ee.Image.constant(factorList);
  };
  var scaleImg = getFactorImg([
    'REFLECTANCE_MULT_BAND_.|TEMPERATURE_MULT_BAND_ST_B10']);
  var offsetImg = getFactorImg([
    'REFLECTANCE_ADD_BAND_.|TEMPERATURE_ADD_BAND_ST_B10']);
  var scaled = image.select('SR_B.|ST_B10').multiply(scaleImg).add(offsetImg);

  // Replace original bands with scaled bands and apply masks.
  return image.addBands(scaled, null, true)
    .updateMask(qaMask).updateMask(saturationMask);
}
//_________________________________________________________________________
//_________________________________________________________________________
// Display the images. vis palette  vis parameters 
var visParams = {
  bands: ['SR_B6', 'SR_B5', 'SR_B3'],
  min: 0,
  max: 20000
};
//_____________________
var colorizedVis = {
  min: 0.0,
  max: 1.0,
  palette: [
    'FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718', '74A901',
    '66A000', '529400', '3E8601', '207401', '056201', '004C00', '023B01',
    '012E01', '011D01', '011301'
  ],
};
//_____________________
//var difference ndviParams
var dndviParams = {min: -1, max: 1, palette: ['red', 'yellow', 'green']};
//_____________________
// Display the cloud-free median composite.
var visParams = {
  bands: ['SR_B6', 'SR_B5', 'SR_B3'],
  min: 0,
  max: 0.4
};
//_____________________
var visualization = {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'],
  min: 0.0,
  max: 0.3,
};
//_____________________
var ndviParams = {min: -1, max: 1, palette: ['red', 'yellow', 'green']};
//_________________________________________________________________________
//Map.setCenter(30, 30, 7);
Map.centerObject(roi,6);
Map.addLayer(roi,{},'Egypt');


Map.addLayer(L8_2025.clip(roi), visualization, 'L8_2025 (LANDSAT/LC08/C02/T1_L2)True Color (432) ScaleFactors');
Map.addLayer(L8col2_SR_2025.clip(roi), visParams, '2025 (Egypt) (Landsat 8 Collection 2 surface reflectance) (Cloud-free mosaic)');
Map.addLayer(ndvi_2025.clip(roi), ndviParams, 'NDVI_2025');


Map.addLayer(L8_2017.clip(roi), visualization, 'L8_2017 (LANDSAT/LC08/C02/T1_L2)True Color (432) ScaleFactors');
Map.addLayer(L8col2_SR_2017.clip(roi), visParams, '2017 (Egypt) (Landsat 8 Collection 2 surface reflectance) (Cloud-free mosaic)');
Map.addLayer(ndvi_2017.clip(roi), ndviParams, 'NDVI_2017');

Map.addLayer(NDVI_sub_2025_2017.clip(roi), dndviParams, 'NDVI-2025 subtract NDVI-2017 (ndvi_2025.subtract(ndvi_2017))');

//_________________________________________________________________________
// ----------------------------------------------------------------------------------------
//  Create a panel to hold widgets.
// ----------------------------------------------------------------------------------------
var panel = ui.Panel();
panel.style().set('width', '600px');
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
                        {value: 'Egypt (Vegetation Index)' ,style: {fontSize: '20px', fontWeight: 'bold'},}
                      );

panel.widgets().set(1, Label01);
// ----------------------------------------------------------------------------------------
var Label02 = ui.Label('Landsat 8 Level 2, Collection 2, Tier 1 \n LANDSAT/LC08/C02/T1_L2 \n Dataset Availability:2013–2026 \n Dataset Provider:USGS \n', {whiteSpace: 'pre'});
panel.widgets().set(2, Label02);
// ----------------------------------------------------------------------------------------
var Label03 = ui.Label('Layers:\nNDVI-2025 subtract NDVI-2017\n{min: -1, max: 1, palette: [red, yellow, green]}', {whiteSpace: 'pre'});
panel.widgets().set(3, Label03);
// ----------------------------------------------------------------------------------------
var Label04 = ui.Label('DRC Remote Sensing & GIS Unit\n    https://github.com/Youssef-Bakr/DRC_UNCCD_GEE', {whiteSpace: 'pre'});
panel.widgets().set(4, Label04);
// ----------------------------------------------------------------------------------------




