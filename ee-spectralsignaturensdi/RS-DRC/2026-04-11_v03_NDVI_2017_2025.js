//
//----------------------------------------------------------------------------------------
//
//Youssef Mohamed Bakr _ +201121121000 _ (www.linkedin.com/in/youssef-bakr)
//https://github.com/Youssef-Bakr/DRC_UNCCD_GEE
//
//----------------------------------------------------------------------------------------
/*

*/
//----------------------------------------------------------------------------------------
//ee.FeatureCollection('FAO/GAUL/2015/level0')
//  .filter('ADM0_NAME == "Egypt"').first().geometry();
var roi = Egypt
//_________________________________________________________________________
var NDVI_L8_2025 = ee.ImageCollection('LANDSAT/COMPOSITES/C02/T1_L2_8DAY_NDVI')
    .filterDate('2025-01-01', '2025-12-31')
    .filterBounds(roi)
    .median()
//_________________________________________________________________________
//_________________________________________________________________________
var NDVI_L8_2017 = ee.ImageCollection('LANDSAT/COMPOSITES/C02/T1_L2_8DAY_NDVI')
    .filterDate('2017-01-01', '2017-12-31')
    .filterBounds(roi)
    .median()
 
//_________________________________________________________________________

//__________________________________
var NDVI_sub_2025_2017 = NDVI_L8_2025.subtract(NDVI_L8_2017);
//_________________________________________________________________________    

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



Map.addLayer(NDVI_sub_2025_2017.clip(roi), dndviParams, 'NDVI-2025 subtract NDVI-2017');

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




