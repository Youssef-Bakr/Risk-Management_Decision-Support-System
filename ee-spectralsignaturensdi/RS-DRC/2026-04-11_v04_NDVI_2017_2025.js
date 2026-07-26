//----------------------------------------------------------------------------------------
//Youssef Mohamed Bakr _ +201121121000 _ (www.linkedin.com/in/youssef-bakr)
//https://github.com/Youssef-Bakr/DRC_UNCCD_GEE
//----------------------------------------------------------------------------------------
/*
Landsat Collection 2 Tier 1 Level 2 8-Day NDVI Composite
FAO GAUL: Global Administrative Unit Layers 2015, First-Level Administrative Units
*/
//----------------------------------------------------------------------------------------
//ee.FeatureCollection('FAO/GAUL/2015/level0')
//  .filter('ADM0_NAME == "Egypt"').first().geometry();



// 1. Load the FAO GAUL Level 1 dataset
var gaulLevel1 = ee.FeatureCollection('FAO/GAUL/2015/level1');

// 2. Filter for Egypt
var egypt = gaulLevel1.filter(ee.Filter.eq('ADM0_NAME', 'Egypt'));

// 3. Filter for New Valley Governorate
// Note: Ensure exact spelling as per GAUL dataset, usually 'New Valley'
var newValley = egypt.filter(ee.Filter.eq('ADM1_NAME', 'New Valley'));

// Visualize on map
Map.centerObject(newValley, 6);
Map.addLayer(newValley, {color: 'blue'}, 'New Valley Governorate');

// Print to console to verify features
print(newValley);
//---------------------------------------------------------------------
var roi = newValley

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

Map.centerObject(roi,6);




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

/*
Landsat Collection 2 Tier 1 Level 2 8-Day NDVI Composite
Dataset Availability
1984 >>> 2026
Earth Engine Snippet
ee.ImageCollection("LANDSAT/COMPOSITES/C02/T1_L2_8DAY_NDVI")
Cadence
8 Days
Dataset Producer
Google

Bands

Pixel size: 30 meters (all bands)

Name	Min	Max	Pixel Size	Description
NDVI	-1*	1*	30 meters	
Normalized Difference Vegetation Index

* estimated min or max value

These Landsat Collection 2 Tier 1 Level 2 composites are made from Tier 1 Level 2 orthorectified scenes.

The Normalized Difference Vegetation Index is generated from the Near-IR and Red bands of each scene as (NIR - Red) / (NIR + Red), and ranges in value from -1.0 to 1.0.

These composites are created from all the scenes in each 8-day period beginning from the first day of the year and continuing to the 360th day of the year. The last composite of the year, beginning on day 361, will overlap the first composite of the following year by 3 days. All the images from each 8-day period are included in the composite, with the most recent pixel as the composite value.

Notes:

The code used to create the composites can be seen here.

Only daytime images with WRS_ROW < 122 are included.

For Landsat 7 , images after 2017-01-01 are excluded due to orbital drift.

For Landsat 8, images before 2013-05-01 are excluded due to pointing issues.

Caution: These composites are computed on the fly and count towards the requesting project's EECU usage.

*/
/////////////////////////////////////////////////////////////////////////
/*
FAO GAUL: Global Administrative Unit Layers 2015, First-Level Administrative Units

Dataset Producer
FAO UN
Earth Engine Snippet
FeatureCollection
ee.FeatureCollection("FAO/GAUL/2015/level1") 
*/
/////////////////////////////////////////////////////////////////////////


