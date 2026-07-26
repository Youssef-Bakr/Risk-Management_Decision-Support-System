

////----------------------------------------------------------------------------------------
//Youssef Mohamed Bakr _ +201121121000 _ (www.linkedin.com/in/youssef-bakr)
//https://github.com/Youssef-Bakr
//----------------------------------------------------------------------------------------
/*
Landsat Collection 2 Tier 1 Level 2 8-Day NDVI Composite
FAO GAUL: Global Administrative Unit Layers 2015, First-Level Administrative Units
*/
//----------------------------------------------------------------------------------------
Map.addLayer(Egypt, {},'Egypt');
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
           .filterDate('2025-01-01', '2025-12-31')
           .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
           .median(); // Create a composite

// 4. Clip the image to the filtered FeatureCollection
var clippedS2 = s2.clipToCollection(roi);

// 5. Visualize
Map.centerObject(roi, 10);
Map.addLayer(roi, {color: 'red'}, 'Cairo Boundary', false);
Map.addLayer(clippedS2, {bands: ['B4', 'B3', 'B2'], min: 0, max: 2000}, 'Clipped Sentinel-2');



// ----------------------------------------------------------------------------------------
//  Create a panel to hold widgets.
// ----------------------------------------------------------------------------------------
var panel = ui.Panel();
panel.style().set('width', '350px');
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
                        {value: 'Change Detection (CD) of Normalized Difference Vegetation Index (NDVI)' ,style: {fontSize: '20px', fontWeight: 'bold'},}
                      );

panel.widgets().set(1, Label01);
// ----------------------------------------------------------------------------------------
var Label02 = ui.Label('NDVI-2025 subtract NDVI-2017', {whiteSpace: 'pre'});
panel.widgets().set(2, Label02);
// ----------------------------------------------------------------------------------------
var Label03 = ui.Label('{min: -0.5, max: 0.5, palette: [red, white, green]}', {whiteSpace: 'pre'});
panel.widgets().set(3, Label03);
// ----------------------------------------------------------------------------------------
var Label04 = ui.Label('DRC Remote Sensing & GIS Unit\nhttps://github.com/Youssef-Bakr/DRC_UNCCD_GEE', {whiteSpace: 'pre'});
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
/*
var dataset = ee.FeatureCollection('WM/geoLab/geoBoundaries/600/ADM1');


var styleParams = {
  fillColor: 'b5ffb4',
  color: '00909F',
  width: 1.0,
};

dataset = dataset.style(styleParams);

Map.addLayer(dataset, {}, 'ADM1 Boundaries');


//---------------------------------------------------------------------------------------
// A digital elevation model.
var dem = ee.Image('NASA/NASADEM_HGT/001');
var demVis = {bands: 'elevation', min: 0, max: 1500};

// Clip the DEM by a polygon geometry.
var geomPoly = ee.Geometry.BBox(-121.55, 39.01, -120.57, 39.38);
var demClip = dem.clip(geomPoly);
print('Clipped image retains metadata and band names', demClip);
Map.setCenter(-121.12, 38.13, 8);
Map.addLayer(demClip, demVis, 'Polygon clip');
Map.addLayer(geomPoly, {color: 'green'}, 'Polygon geometry', false);

// Clip the DEM by a line geometry.
var geomLine = ee.Geometry.LinearRing(
    [[-121.19, 38.10], [-120.53, 38.54], [-120.22, 37.83], [-121.19, 38.10]]);
Map.addLayer(dem.clip(geomLine), demVis, 'Line clip');
Map.addLayer(geomLine, {color: 'orange'}, 'Line geometry', false);

// Images have geometry; clip the dem image by the geometry of an S2 image.
var s2Img = ee.Image('COPERNICUS/S2_SR/20210109T185751_20210109T185931_T10SEG');
var geomS2Img = s2Img.geometry();
Map.addLayer(dem.clip(geomS2Img), demVis, 'Image geometry clip');
Map.addLayer(geomS2Img, {color: 'blue'}, 'Image geometry', false);

// Don't use ee.Image.clip prior to ee.Image.regionReduction, the "geometry"
// parameter handles it more efficiently.
var zonalMax = dem.select('elevation').reduceRegion({
  reducer: ee.Reducer.max(),
  geometry: geomPoly
});
print('Max elevation (m)', zonalMax.get('elevation'));

// Don't use ee.Image.clip to clip an image by a FeatureCollection, use
// ee.Image.clipToCollection(collection).
var watersheds = ee.FeatureCollection('USGS/WBD/2017/HUC10')
    .filterBounds(ee.Geometry.Point(-122.754, 38.606).buffer(2e4));
Map.addLayer(dem.clipToCollection(watersheds), demVis, 'Watersheds clip');
Map.addLayer(watersheds, {color: 'red'}, 'Watersheds', false);

//-----------------------------------------------------------------




//  Load the FAO GAUL Level 1 dataset
var gaulLevel1 = ee.FeatureCollection('FAO/GAUL/2015/level1');

//  Filter for Egypt
//var egypt = gaulLevel1.filter(ee.Filter.eq('ADM0_NAME', 'Egypt'));

//  Filter for New Valley Governorate
var Matruh = gaulLevel1.filter(ee.Filter.eq('ADM1_NAME', 'Matruh'));

// Visualize on map
//Map.centerObject(Matruh, 7);


Map.addLayer(Matruh, {},'Matruh Governorate');

// Print to console to verify features
print(Matruh);
//---------------------------------------------------------------------
var roi = Matruh
print (roi)



*/

