//----------------------------------------------------------------------------------------
//(Youssef Mohamed Bakr)
//(+201121121000)
//(www.linkedin.com/in/youssef-bakr)
//(https://github.com/Youssef-Bakr)
//----------------------------------------------------------------------------------------
/*
2026-05-20_RS_Matruh_RS-Unit_DRC_ECOSTRESS_NDVI_70M_YB


*/
//----------------------------------------------------------------------------------------
Map.setCenter(25.537065682489956,29.195801441914515, 12)

var dataset = ee.FeatureCollection('FAO/GAUL/2015/level1');

var styleParams = {
  fillColor: 'b5ffb4',
  color: '00909F',
  width: 1.0,
};

dataset = dataset.style(styleParams);

Map.addLayer(dataset, {}, 'First Level Administrative Units _ FAO GAUL');

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
                        {value: 'Normalized Difference Vegetation Index (NDVI)' ,style: {fontSize: '20px', fontWeight: 'bold'},}
                      );

panel.widgets().set(1, Label01);
// ----------------------------------------------------------------------------------------
var Label02 = ui.Label('-------------------------------------------------\nNASA/ECOSTRESS/L2T_STARS/V2\n(70m spatial resolution)\nNDVI\n-------------------------------------------------', {whiteSpace: 'pre'});
panel.widgets().set(2, Label02);
// ----------------------------------------------------------------------------------------
var Label03 = ui.Label('NDVI Pixel Val.\n\nmin: -1.0\nmax: 1.0\n-------------------------------------------------\n\nPalette:\n\n(Dark Blue)\n(Dark Gray)\n(earthy golden-brown)\n(Yellow)\n(Light Green)\n(Dark Green)', {whiteSpace: 'pre'});
panel.widgets().set(3, Label03);
// ----------------------------------------------------------------------------------------
var Label04 = ui.Label('-------------------------------------------------\nhttps://github.com/Youssef-Bakr\nwww.linkedin.com/in/youssef-bakr', {whiteSpace: 'pre'});
panel.widgets().set(4, Label04);
// ----------------------------------------------------------------------------------------


/////////////////////////////////////////////////////////////////////////
/*

ECOSTRESS Tiled Ancillary NDVI and Albedo L2 Global 70 m V002

NASA/ECOSTRESS/L2T_STARS/V2

Dataset Availability: 2018 >>> 2026
Dataset Producer:  Land Processes Distributed Active Archive Center
Earth Engine Snippet: ee.ImageCollection("NASA/ECOSTRESS/L2T_STARS/V2") 
Cadence: 1 Day
Tags: albedo land ndvi plant-productivity ecostress
Description
DOIs
The ECOSTRESS Tiled Ancillary NDVI and Albedo (ECO_L2T_STARS) V002 dataset provides Normalized Difference Vegetation Index (NDVI) and albedo data at a 70m spatial resolution. This ancillary product, essential for understanding plant water needs and stress, is created through a data fusion process that combines Visible Infrared Imaging Radiometer Suite (VIIRS) and Harmonized Landsat Sentinel (HLS) data. The fusion is performed using the STARS algorithm, a Bayesian timeseries methodology, to align the data with daytime ECOSTRESS overpasses. This product is only generated for corresponding ECOSTRESS Land Surface Temperature and Emissivity tiles.

Bands

Pixel size: 70 meters (all bands)

Name	Pixel Size	Description

NDVI	70 meters	
Normalized Difference Vegetation Index (NDVI)

NDVI-UQ	70 meters	
Normalized Difference Vegetation Index (NDVI) uncertainty.

albedo	70 meters	
Albedo

albedo-UQ	70 meters	
Albedo uncertainty.

*/
/////////////////////////////////////////////////////////////////////////

