
// Define the region of interest (ROI) using the polygon coordinates
var polygon = Egypt

var addNDVIBands = function(image) {
  var NDVI = image.addBands(image.normalizedDifference(['B8', 'B4']));
  var NDWI = NDVI.addBands(NDVI.normalizedDifference(['B3', 'B8']));
  return NDWI.addBands(NDWI.metadata('system:time_start'));
};

// Load imageries
var img = ee.ImageCollection('COPERNICUS/S2_SR')
.filterDate('2026-03-01', '2026-03-30')
.filterBounds(polygon) // Filter the image collection based on the ROI
.filter(ee.Filter.lte('CLOUDY_PIXEL_PERCENTAGE', 10))
.map(addNDVIBands);
var img_ndvi = ee.ImageCollection(img).select("nd");
var ndvi = img_ndvi.mean();
print(ndvi);

// Compute standard deviation (SD) as texture of the NDVI.
var SD_Kernel = ndvi.reduceNeighborhood({
  reducer: ee.Reducer.stdDev(),
  kernel: ee.Kernel.circle(3),
});

// Set the CRS of the image to Web Mercator.
var SD_Kernel_WGS84 = SD_Kernel.reproject({
  crs: 'EPSG:3857', // Web Mercator
  scale: 30
});

// Export the image to Google Drive as a TIFF file.
var exportParams = {
  image: SD_Kernel_WGS84,
  description: 'SD_Kernel_NDVI',
  scale: 30,
  region: polygon // Export the image only for the ROI
};

Export.image.toDrive(exportParams);

// Display the results.
var vizParams = {'bands': 'B4, B3, B2', 'min': 0, 'max': 3000};
Map.addLayer(img.min().clip(polygon), vizParams, "Sentinel 2 Egypt");
Map.addLayer(ndvi.clip(polygon), {min: -1, max: 1, palette: ['00FF00', '000000']}, 'NDVI');
Map.addLayer(SD_Kernel_WGS84.clip(polygon), {min: 0, max: 0.3}, 'SD Kernel NDVI');
Map.centerObject(polygon, 12);
