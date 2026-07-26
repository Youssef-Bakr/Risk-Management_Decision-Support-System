
//2026-04-18_v03_Egypt_NDVI_UNCCD-Baseline_2000-2015_PeriodII_2016-2023_New-Valley
//----------------------------------------------------------------------------------------
//Youssef Mohamed Bakr _ +201121121000 _ (www.linkedin.com/in/youssef-bakr)
//https://github.com/Youssef-Bakr/DRC_UNCCD_GEE
//----------------------------------------------------------------------------------------
/*
Landsat Collection 2 Tier 1 Level 2 8-Day NDVI Composite
FAO GAUL: Global Administrative Unit Layers 2015, First-Level Administrative Units
*/
//----------------------------------------------------------------------------------------
Map.addLayer(Egypt, {},'Egypt');
//----------------------------------------------------------------------------------------
//  Load the FAO GAUL Level 1 dataset
var gaulLevel1 = ee.FeatureCollection('FAO/GAUL/2015/level1');

//  Filter for Egypt
var egypt = gaulLevel1.filter(ee.Filter.eq('ADM0_NAME', 'Egypt'));

//  Filter for New Valley Governorate
var newValley = egypt.filter(ee.Filter.eq('ADM1_NAME', 'New Valley'));

// Visualize on map
//Map.centerObject(newValley, 7);
var point = T;
Map.centerObject(T, 10);

Map.addLayer(newValley, {},'New Valley Governorate');

// Print to console to verify features
print(newValley);
//---------------------------------------------------------------------
var roi = newValley



//_________________________________________________________________________
var NDVI_L8_Baseline = ee.ImageCollection('LANDSAT/COMPOSITES/C02/T1_L2_8DAY_NDVI')
    .filterDate('2000-01-01', '2015-12-31')
    .filterBounds(roi)
    .median()

var NDVI_L8_PeriodII = ee.ImageCollection('LANDSAT/COMPOSITES/C02/T1_L2_8DAY_NDVI')
    .filterDate('2016-01-01', '2023-12-31')
    .filterBounds(roi)
    .median()
 


var NDVI_EgyptReport2026 = NDVI_L8_PeriodII.subtract(NDVI_L8_Baseline);
   

//Visualizing the difference between two NDVI images
Map.addLayer(NDVI_EgyptReport2026.clip(roi), {min: -0.5, max: 0.5, palette: ['red', 'white', 'green']}, 'UNCCD 2026 Report = Period 2 - Baseline');



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
var Label02 = ui.Label('-------------------------------------------------\nUNCCD 2026 Report = Period 2 - Baseline\nBaseline = (2000-01-01 >>> 2015-12-31)\nPeriod 2 = (2016-01-01 >>> 2023-12-31)', {whiteSpace: 'pre'});
panel.widgets().set(2, Label02);
// ----------------------------------------------------------------------------------------
var Label03 = ui.Label('{min: -0.5, max: 0.5, palette: [red, white, green]}', {whiteSpace: 'pre'});
panel.widgets().set(3, Label03);
// ----------------------------------------------------------------------------------------
var Label04 = ui.Label('-------------------------------------------------\nhttps://github.com/Youssef-Bakr\nwww.linkedin.com/in/youssef-bakr', {whiteSpace: 'pre'});
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


