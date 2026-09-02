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


