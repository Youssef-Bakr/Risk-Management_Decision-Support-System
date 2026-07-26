// =========================================================================
// MAGMA NORM EIAR - STABILIZED VERSION
// =========================================================================

// UI Initialization
var sidePanel = ui.Panel({style: {width: '480px', padding: '15px'}});
ui.root.add(sidePanel);

// 1. Fixed Band Selection for Landsat 8 (Preventing "No band named B5" error)
var ls8_composite = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterBounds(ee.Geometry.Point([52.76, 24.08]))
  .filterDate('2024-01-01', '2025-01-01')
  .median()
  .select(['SR_B5', 'SR_B4', 'SR_B3'], ['nir', 'red', 'green']); // Mapping to standard names

// 2. Optimized Charting Loop (Preventing "Internal Error / Computation" timeouts)
function addSafeChart(collection, bandName, title, color) {
  var chart = ui.Chart.image.series({
    imageCollection: collection.select(bandName),
    region: ee.Geometry.Point([52.76, 24.08]).buffer(5000),
    reducer: ee.Reducer.mean(),
    scale: 30000 // Coarsened scale to prevent memory overflow
  }).setOptions({
    title: title,
    hAxis: {format: 'MMM'},
    colors: [color],
    maxPixels: 1e9 // Explicit limit
  });
  sidePanel.add(chart);
}

// Example of the fix applied to your previous chart loop:
// Replacing unstable direct calls with the safe function above
var no2Col = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_NO2");
addSafeChart(no2Col, 'tropospheric_NO2_column_number_density', 'NO2 Trends (Optimized)', '#A020F0');

// 3. Robust Layer Visualizer
Map.addLayer(ls8_composite, {bands: ['nir', 'red', 'green'], min: 0, max: 0.3}, 'Landsat Composite');
Map.centerObject(ee.Geometry.Point([52.76, 24.08]), 12);

//
