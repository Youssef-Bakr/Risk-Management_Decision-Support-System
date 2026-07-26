
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
var Matruh = egypt.filter(ee.Filter.eq('ADM1_NAME', 'Matruh'));

// Visualize on map
//Map.centerObject(newValley, 7);
var point = T;
Map.centerObject(T, 10);

Map.addLayer(Matruh, {},'Matruh Governorate');

// Print to console to verify features
print(Matruh);
//---------------------------------------------------------------------
var roi = Matruh



//_________________________________________________________________________
var NDVI_L8_Baseline = ee.ImageCollection('LANDSAT/COMPOSITES/C02/T1_L2_32DAY_NDVI')
    .filterDate('2000-01-01', '2015-12-31')
    .filterBounds(roi)
    .median()

print (NDVI_L8_Baseline)

var NDVI_L8_PeriodII = ee.ImageCollection('LANDSAT/COMPOSITES/C02/T1_L2_32DAY_NDVI')
    .filterDate('2016-01-01', '2023-12-31')
    .filterBounds(roi)
    .median()
 
 print (NDVI_L8_PeriodII)


var NDVI_EgyptReport2026 = NDVI_L8_PeriodII.subtract(NDVI_L8_Baseline);
   
print (NDVI_EgyptReport2026)
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


