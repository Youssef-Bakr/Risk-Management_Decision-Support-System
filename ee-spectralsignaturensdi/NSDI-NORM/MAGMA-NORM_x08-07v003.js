// =========================================================================
//Youssef Mohamed Bakr
//+201121121000
//Youssef.Bakr@drc.gov.eg
//Youssef.Bakr@faps.cu.edu.eg
// =========================================================================
// 1. Define the Area of Interest (AOI) for Al Ruwais Industrial City
// Coordinates format: [Min Longitude, Min Latitude, Max Longitude, Max Latitude]
var ruwaisAOI = ee.Geometry.Rectangle([52.55, 24.05, 52.78, 24.18]);

// 2. Center the map display on the AOI (Zoom level 12 works well for this scale)
Map.centerObject(ruwaisAOI, 12);

// 3. Add the AOI boundary to the map canvas for visual reference
Map.addLayer(ruwaisAOI, {color: 'red'}, 'Al Ruwais AOI Boundary');

// 4. (Optional) Quick verification: Load a recent cloud-free Sentinel-2 image 
var surfaceReflectance = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(ruwaisAOI)
  .filterDate('2026-01-01', '2026-06-30') // Adjust date range as needed
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 5))
  .median();

// Visualization parameters for True Color (B4, B3, B2)
var visParams = {
  bands: ['B4', 'B3', 'B2'],
  min: 0,
  max: 3000,
  gamma: 1.4
};

// Clip the image to the Ruwais boundary and add it to the map
Map.addLayer(surfaceReflectance.clip(ruwaisAOI), visParams, 'Ruwais Sentinel-2 Imagery');
// =========================================================================

var point = ee.Geometry.Point([52.769692825414495, 24.081562392352257]); 

// =========================================================================

// =========================================================================
// CLIMATE RISK ASSESSMENT: HISTORICAL EXTREME HEAT TRENDS (MODIS LST)
// =========================================================================

// 1. Define Area of Interest (AOI) - Defaults to a region around New York City
// Feel free to draw your own polygon on the map or change these coordinates.


Map.centerObject(ruwaisAOI, 10);
Map.addLayer(ruwaisAOI, {color: 'grey'}, 'Area of Interest', false);

// 2. Define Timeframes to compare long-term baseline shifts
var baselineStart = '2001-01-01';
var baselineEnd   = '2010-12-31';
var currentStart  = '2021-01-01';
var currentEnd    = '2025-12-31'; // Adjust up to the latest fully completed year

// 3. Load and Preprocess MODIS Land Surface Temperature (LST)
// We look at daytime LST during peak summer (June - August) to assess heat risk
var modisLST = ee.ImageCollection('MODIS/061/MOD11A1')
  .filterBounds(ruwaisAOI)
  .filter(ee.Filter.dayOfYear(152, 243)); // Day 152 to 243 roughly corresponds to June-August

// Function to convert LST from Kelvin to Celsius and select the Day band
var processLST = function(image) {
  var kelvin = image.select('LST_Day_1km');
  // MODIS scale factor is 0.02. Formula: (Kelvin * 0.02) - 273.15
  var celsius = kelvin.multiply(0.02).subtract(273.15).rename('LST_Celsius');
  return image.addBands(celsius).updateMask(kelvin.gt(0));
};

var processedCollection = modisLST.map(processLST);

// 4. Compute Climate Baseline vs. Current Period Mean
var baselineMean = processedCollection.filterDate(baselineStart, baselineEnd).select('LST_Celsius').mean().clip(ruwaisAOI);
var currentMean  = processedCollection.filterDate(currentStart, currentEnd).select('LST_Celsius').mean().clip(ruwaisAOI);

// Calculate the Heat Anomaly (Risk Indicator: regions warming up the fastest)
var heatAnomaly = currentMean.subtract(baselineMean);

// 5. Visualization Setup
var lstVis = {
  min: 20,
  max: 40,
  palette: ['blue', 'green', 'yellow', 'orange', 'red']
};

var anomalyVis = {
  min: -1,
  max: 3,
  palette: ['blue', 'white', 'orange', 'red']
};

// Add Layers to the Map Interactively
Map.addLayer(baselineMean, lstVis, 'Baseline Summer Mean LST (2001-2010)');
Map.addLayer(currentMean, lstVis, 'Recent Summer Mean LST (2021-2025)');
Map.addLayer(heatAnomaly, anomalyVis, 'Climate Risk: Heat Anomaly (Change over Time)');

// 6. Generate a Regional Trend Chart for Analysis
var chart = ui.Chart.image.series({
  imageCollection: processedCollection.select('LST_Celsius'),
  region: ruwaisAOI,
  reducer: ee.Reducer.mean(),
  scale: 1000,
  xProperty: 'system:time_start'
})
.setOptions({
  title: 'Historical Summer Land Surface Temperature Trend',
  vAxis: {title: 'Temperature (°C)'},
  hAxis: {title: 'Date'},
  trendlines: {0: {color: 'red', lineWidth: 2}}
});

print('Climate Risk Profile for Selected Region:');
print(chart);
