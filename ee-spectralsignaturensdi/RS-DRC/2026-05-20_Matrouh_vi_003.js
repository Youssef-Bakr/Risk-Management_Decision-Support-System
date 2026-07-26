


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
Map.centerObject(T, 8);

Map.addLayer(Matruh, {},'Matruh Governorate');

// Print to console to verify features
print(Matruh);
//---------------------------------------------------------------------
var roi = Matruh

// ----------------------------------------------------------------------------------------

// ----------------------------------------------------------------------------------------
//  NDVI 2020
// ----------------------------------------------------------------------------------------
var dataset_2020 = ee.ImageCollection('NASA/ECOSTRESS/L2T_STARS/V2')
                  .filter(ee.Filter.date('2020-01-01', '2020-12-31'));
var NDVI_2020 = dataset_2020.select('NDVI').mean();

var vis = {
  min: -1.0,
  max: 1.0,
  palette: ['00008B', 'A9A9A9', 'CD853F', 'FFFF00', '90EE90', '006400'],
};


Map.addLayer(NDVI_2020, vis, 'NDVI - 2020');

// ----------------------------------------------------------------------------------------
//  NDVI 2021
// ----------------------------------------------------------------------------------------
var dataset_2021 = ee.ImageCollection('NASA/ECOSTRESS/L2T_STARS/V2')
                  .filter(ee.Filter.date('2021-01-01', '2021-12-31'));
var NDVI_2021 = dataset_2021.select('NDVI').mean();

var vis = {
  min: -1.0,
  max: 1.0,
  palette: ['00008B', 'A9A9A9', 'CD853F', 'FFFF00', '90EE90', '006400'],
};


Map.addLayer(NDVI_2021, vis, 'NDVI - 2021');

// ----------------------------------------------------------------------------------------
//  NDVI 2022
// ----------------------------------------------------------------------------------------
var dataset_2022 = ee.ImageCollection('NASA/ECOSTRESS/L2T_STARS/V2')
                  .filter(ee.Filter.date('2022-01-01', '2022-12-31'));
var NDVI_2022 = dataset_2022.select('NDVI').mean();

var vis = {
  min: -1.0,
  max: 1.0,
  palette: ['00008B', 'A9A9A9', 'CD853F', 'FFFF00', '90EE90', '006400'],
};


Map.addLayer(NDVI_2022, vis, 'NDVI - 2022');
// ----------------------------------------------------------------------------------------
//  NDVI 2023
// ----------------------------------------------------------------------------------------
var dataset_2023 = ee.ImageCollection('NASA/ECOSTRESS/L2T_STARS/V2')
                  .filter(ee.Filter.date('2023-01-01', '2023-12-31'));
var NDVI_2023 = dataset_2023.select('NDVI').mean();

var vis = {
  min: -1.0,
  max: 1.0,
  palette: ['00008B', 'A9A9A9', 'CD853F', 'FFFF00', '90EE90', '006400'],
};


Map.addLayer(NDVI_2023, vis, 'NDVI - 2023');
// ----------------------------------------------------------------------------------------
//  NDVI 2024
// ----------------------------------------------------------------------------------------
var dataset_2024 = ee.ImageCollection('NASA/ECOSTRESS/L2T_STARS/V2')
                  .filter(ee.Filter.date('2024-01-01', '2024-12-31'));
var NDVI_2024 = dataset_2024.select('NDVI').mean();

var vis = {
  min: -1.0,
  max: 1.0,
  palette: ['00008B', 'A9A9A9', 'CD853F', 'FFFF00', '90EE90', '006400'],
};

Map.addLayer(NDVI_2024, vis, 'NDVI - 2024');
// ----------------------------------------------------------------------------------------
//  NDVI 2025
// ----------------------------------------------------------------------------------------
var dataset_2025 = ee.ImageCollection('NASA/ECOSTRESS/L2T_STARS/V2')
                  .filter(ee.Filter.date('2025-01-01', '2025-12-31'));
var NDVI_2025 = dataset_2025.select('NDVI').mean();

var vis = {
  min: -1.0,
  max: 1.0,
  palette: ['00008B', 'A9A9A9', 'CD853F', 'FFFF00', '90EE90', '006400'],
};

Map.addLayer(NDVI_2025, vis, 'NDVI - 2025');
// ----------------------------------------------------------------------------------------

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


