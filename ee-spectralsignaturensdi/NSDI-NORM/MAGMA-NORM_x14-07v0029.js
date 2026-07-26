// =========================================================================
// MAGMA NORM EIAR - ENHANCED INTERACTIVE VERSION
// =========================================================================

// --- 1. UI Initialization & Styling ---
// Added a softer background color and dedicated panels for organization
var sidePanel = ui.Panel({
  style: {width: '450px', padding: '20px', backgroundColor: '#f8f9fa'}
});
ui.root.add(sidePanel);

var title = ui.Label({
  value: 'MAGMA NORM EIAR Dashboard',
  style: {fontSize: '22px', fontWeight: 'bold', margin: '0 0 10px 0', color: '#2c3e50', backgroundColor: '#f8f9fa'}
});
var instructions = ui.Label({
  value: 'Click anywhere on the map to analyze NO2 trends for a 5km radius.',
  style: {fontSize: '13px', color: '#7f8c8d', margin: '0 0 20px 0', backgroundColor: '#f8f9fa'}
});
sidePanel.add(title).add(instructions);

// A container specifically for charts so we can clear/redraw them on map clicks
var chartPanel = ui.Panel({style: {backgroundColor: '#f8f9fa'}}); 
sidePanel.add(chartPanel);

// --- 2. Global Variables & Parameters ---
var startDate = '2023-01-01'; // Define a global analysis window
var endDate = '2024-01-01';
var defaultPoint = ee.Geometry.Point([52.76, 24.08]);

// --- 3. Data Processing & Map Setup ---

// CRITICAL FIX: Landsat 8 Collection 2 requires scale/offset factors for surface reflectance
function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  return image.addBands(opticalBands, null, true);
}

var ls8_composite = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterBounds(defaultPoint)
  .filterDate(startDate, endDate)
  .map(applyScaleFactors) // Apply the scaling so min:0, max:0.3 works
  .median()
  .select(['SR_B5', 'SR_B4', 'SR_B3'], ['nir', 'red', 'green']);

Map.centerObject(defaultPoint, 11);
Map.addLayer(ls8_composite, {bands: ['nir', 'red', 'green'], min: 0, max: 0.3}, 'Landsat 8 (CIR)');

// --- 4. Dynamic Charting Logic ---
function generateCharts(poi) {
  // Show a loading message
  chartPanel.clear(); 
  chartPanel.add(ui.Label('Extracting time-series data...', {color: '#e67e22', backgroundColor: '#f8f9fa'}));

  var bufferRegion = poi.buffer(5000);

  // CRITICAL FIX: Filter S5P by date and bounds to prevent memory overflows
  var no2Col = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_NO2")
    .filterBounds(bufferRegion)
    .filterDate(startDate, endDate);

  var chart = ui.Chart.image.series({
    imageCollection: no2Col.select('tropospheric_NO2_column_number_density'),
    region: bufferRegion,
    reducer: ee.Reducer.mean(),
    scale: 1113 // Adjusted from 30000 to native S5P scale to ensure valid data extraction
  }).setOptions({
    title: 'Tropospheric NO2 Trends',
    vAxis: {title: 'NO2 density (mol/m²)'},
    hAxis: {title: 'Date', format: 'MMM YYYY'},
    colors: ['#A020F0'],
    lineWidth: 2,
    pointSize: 3,
    chartArea: {backgroundColor: '#f8f9fa'}
  });

  // Replace loading message with the actual chart
  chartPanel.clear();
  chartPanel.add(chart);
  
  // Update the map marker to show the user exactly where they clicked
  var marker = ui.Map.Layer(poi, {color: 'red'}, 'Selected Location');
  Map.layers().set(1, marker); // Set at index 1 to sit on top of Landsat
}

// --- 5. Interactivity ---
// Run once on load using the default coordinates
generateCharts(defaultPoint);

// Change cursor to a crosshair to hint that the map is clickable
Map.style().set('cursor', 'crosshair');

// Trigger charting function whenever the user clicks the map
Map.onClick(function(coords) {
  var clickPoint = ee.Geometry.Point([coords.lon, coords.lat]);
  generateCharts(clickPoint);
});
