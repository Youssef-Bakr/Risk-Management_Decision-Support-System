//----------------------------------------------------------------------------------------
//Youssef Mohamed Bakr _ +201121121000 _ (www.linkedin.com/in/youssef-bakr)
//https://github.com/Youssef-Bakr/DRC_UNCCD_GEE
//----------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//

var modisLandcover = ee.ImageCollection('MODIS/061/MCD12Q1')
  .filterDate('2024-01-01', '2024-12-31')
  .first()
  .select('LC_Type1')
  // Quick hack to get the labels to start at zero.
  .subtract(1);

// A palette to use for visualizing landcover images. You can get this
// from the properties of the collection.
var landcoverPalette = '05450a,086a10,54a708,78d203,009900,c6b044,dcd159,' +
  'dade48,fbff13,b6ff05,27ff87,c24f44,a5a5a5,ff6d4c,69fff8,f9ffa4,1c0dff';

// A set of visualization parameters using the landcover palette.
var landcoverVisualization = {
  palette: landcoverPalette,
  min: 0,
  max: 16,
  format: 'png'
};

// Center map over the region of interest and display the MODIS landcover image.
Map.centerObject(Egypt, 6);
Map.setOptions('HYBRID');
Map.addLayer(modisLandcover.clip(Egypt), landcoverVisualization, 'Egypt Land Cover (MODIS) 2024 (500 M)');



//-----------------------------------------------------------------------------------------------

/*
MCD12Q1.061 MODIS Land Cover Type Yearly Global 500m
Dataset Availability
2001 >> 2024
Dataset Producer
NASA LP DAAC at the USGS EROS Center
Earth Engine Snippet
ee.ImageCollection("MODIS/061/MCD12Q1") open_in_new
Cadence
1 Year
*/
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//
var ESA_LandCover = ee.ImageCollection('ESA/WorldCover/v100').first();

var visualization = {
  bands: ['Map'],
};

//Map.centerObject(ESA_LandCover);

Map.addLayer(ESA_LandCover.clip(Egypt), visualization, 'Egypt Land Cover (ESA) 2021 (10 M)');

//-----------------------------------------------------------------------------------------------
/*
ESA WorldCover 10m v100
ataset Availability
2020>>2021
Dataset Producer
ESA WorldCover Consortium
Earth Engine Snippet
ee.ImageCollection("ESA/WorldCover/v100") open_in_new
*/


//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
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
                        {value: 'Egypt Land Cover Classification' ,style: {fontSize: '20px', fontWeight: 'bold'},}
                      );

panel.widgets().set(1, Label01);
// ----------------------------------------------------------------------------------------
var Label02 = ui.Label('Egypt landcover (MODIS) 2024 (500 M):\nhttps://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MCD12Q1#bands', {whiteSpace: 'pre'});
panel.widgets().set(2, Label02);
// ----------------------------------------------------------------------------------------
var Label03 = ui.Label('Egypt landcover (ESA) 2021 (10 M)\nhttps://developers.google.com/earth-engine/datasets/catalog/ESA_WorldCover_v100#bands', {whiteSpace: 'pre'});
panel.widgets().set(3, Label03);
// ----------------------------------------------------------------------------------------
var Label04 = ui.Label('DRC Remote Sensing & GIS Unit\nhttps://github.com/Youssef-Bakr/DRC_UNCCD_GEE\nhttps://github.com/Youssef-Bakr\n+201121121000', {whiteSpace: 'pre'});
panel.widgets().set(4, Label04);
// ----------------------------------------------------------------------------------------

//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
/*
MCD12Q1.061 MODIS Land Cover Type Yearly Global 500m
Dataset Availability
2001 >> 2024
Dataset Producer
NASA LP DAAC at the USGS EROS Center
Earth Engine Snippet
ee.ImageCollection("MODIS/061/MCD12Q1") open_in_new
Cadence
1 Year
*/

/*
LC_Type1 Class Table

Value	Color	Description
1	#05450a	
Evergreen Needleleaf Forests: dominated by evergreen conifer trees (canopy >2m). Tree cover >60%.

2	#086a10	
Evergreen Broadleaf Forests: dominated by evergreen broadleaf and palmate trees (canopy >2m). Tree cover >60%.

3	#54a708	
Deciduous Needleleaf Forests: dominated by deciduous needleleaf (larch) trees (canopy >2m). Tree cover >60%.

4	#78d203	
Deciduous Broadleaf Forests: dominated by deciduous broadleaf trees (canopy >2m). Tree cover >60%.

5	#009900	
Mixed Forests: dominated by neither deciduous nor evergreen (40-60% of each) tree type (canopy >2m). Tree cover >60%.

6	#c6b044	
Closed Shrublands: dominated by woody perennials (1-2m height) >60% cover.

7	#dcd159	
Open Shrublands: dominated by woody perennials (1-2m height) 10-60% cover.

8	#dade48	
Woody Savannas: tree cover 30-60% (canopy >2m).

9	#fbff13	
Savannas: tree cover 10-30% (canopy >2m).

10	#b6ff05	
Grasslands: dominated by herbaceous annuals (<2m).

11	#27ff87	
Permanent Wetlands: permanently inundated lands with 30-60% water cover and >10% vegetated cover.

12	#c24f44	
cropland.

13	#a5a5a5	
Urban and Built-up Lands: at least 30% impervious surface area including building materials, asphalt and vehicles.

14	#ff6d4c	
Cropland/Natural Vegetation Mosaics: mosaics of small-scale cultivation 40-60% with natural tree, shrub, or herbaceous vegetation.

15	#69fff8	
Permanent Snow and Ice: at least 60% of area is covered by snow and ice for at least 10 months of the year.

16	#f9ffa4	
(sand, rock, soil) areas with less than 10% vegetation.

17	#1c0dff	
Water Bodies: at least 60% of area is covered by permanent water bodies.
*/

//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
/*
ESA WorldCover 10m v100
ataset Availability
2020>>2021
Dataset Producer
ESA WorldCover Consortium
Earth Engine Snippet
ee.ImageCollection("ESA/WorldCover/v100") open_in_new
*/
/*
Pixel size: 10 meters (all bands)

Name	Pixel Size	Description
Map	10 meters	
Landcover class

Map Class Table

Value	Color	Description
10	#006400	
Tree cover

20	#ffbb22	
Shrubland

30	#ffff4c	
Grassland

40	#f096ff	
Cropland

50	#fa0000	
Built-up

60	#b4b4b4	
Bare / sparse vegetation

70	#f0f0f0	
Snow and ice

80	#0064c8	
Permanent water bodies

90	#0096a0	
Herbaceous wetland

95	#00cf75	
Mangroves

100	#fae6a0	
Moss and lichen

*/
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
var myImage = ESA_LandCover
Export.image.toDrive({
  image: myImage,             // The image object to export
  description: 'LandCover_ESA_10M', // Name for the task
  scale: 10,                  // Resolution in meters
  region: Egypt,         // Geometry/AOI to clip to
  fileFormat: 'GeoTIFF',      // Default format
  maxPixels: 1e9              // Increase if the image is very large
});



//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
/*
Export.image.toDrive({
  image: myImage,             // The image object to export
  description: 'image_export', // Name for the task
  scale: 30,                  // Resolution in meters
  region: myGeometry,         // Geometry/AOI to clip to
  fileFormat: 'GeoTIFF',      // Default format
  maxPixels: 1e9              // Increase if the image is very large
});


Export.table.toDrive({
  collection: myFeatures,     // The FeatureCollection to export
  description: 'table_export',
  fileFormat: 'CSV'           // Options: 'CSV', 'SHP', 'GeoJSON', 'KML', 'KMZ'
});




Export.video.toDrive({
  collection: myCollection,    // Collection of images
  description: 'video_export',
  dimensions: 720,             // Resolution height/width
  framesPerSecond: 10,
  region: myGeometry
});
*/
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------
