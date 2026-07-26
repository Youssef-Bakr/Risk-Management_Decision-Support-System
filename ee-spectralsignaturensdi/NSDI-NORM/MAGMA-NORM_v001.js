// =========================================================================
// GOOGLE EARTH ENGINE (GEE) - MAGMA UAE NORM FACILITY EXACT BOUNDARY
// =========================================================================

// 1. DEFINE THE EXACT FACILITY BOUNDARY POLYGON
// Precisely encloses the Magma NORM processing & containment facilities at Ruwais
var facilityPolygon = ee.Geometry.Polygon([
  [
    [52.76865, 24.07842], // Southwest Corner
    [52.77295, 24.07842], // Southeast Corner
    [52.77295, 24.08215], // Northeast Corner
    [52.76865, 24.08215], // Northwest Corner
    [52.76865, 24.07842]  // Close polygon
  ]
]);

// Center the interactive map tightly over the exact facility footprint
Map.centerObject(facilityPolygon, 16);
Map.addLayer(facilityPolygon, {color: 'red', fillColor: '00000000'}, 'Magma UAE Exact Boundary');

// Establish a 2-kilometer buffer zone for environmental impact runoff analysis
var studyArea = facilityPolygon.buffer(2000); 
Map.addLayer(studyArea, {color: 'yellow', fillColor: '00000000'}, '2km Environmental Impact Buffer', false);


// 2. SOIL CORROSION & HYDROCARBON DISTURBANCE (Sentinel-2 BSI)
// Bare Soil Index detects any sludge-induced chemical soil anomalies or spillages.
var s2Image = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(studyArea)
  .filterDate('2026-01-01', '2026-07-14')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 5))
  .median();

var bsi = s2Image.expression(
  '((swir1 + red) - (nir + blue)) / ((swir1 + red) + (nir + blue))', {
    'swir1': s2Image.select('B11'),
    'red': s2Image.select('B4'),
    'nir': s2Image.select('B8'),
    'blue': s2Image.select('B2')
}).rename('BSI');

var bsiVis = {min: 0.0, max: 0.35, palette: ['blue', 'yellow', 'orange', 'red']};
Map.addLayer(bsi.clip(studyArea), bsiVis, 'Bare Soil Index (Soil Disturbance)');


// 3. THERMAL EMISSIONS MONITORING (Landsat 9 T1_L2)
// Identifies operational heat footprints from descaling machinery or waste treatment.
var landsat9 = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
  .filterBounds(studyArea)
  .filterDate('2026-01-01', '2026-07-14')
  .median();

var thermal = landsat9.select('ST_B10'); 
var thermalVis = {min: 295, max: 325, palette: ['blue', 'green', 'yellow', 'red']};
Map.addLayer(thermal.clip(studyArea), thermalVis, 'Thermal Operational Footprint');


// 4. TOPOGRAPHICAL RUNOFF PATHWAYS (NASADEM Elevation)
// Helps track potential gravity-fed flows of liquid waste across the arid terrain.
var dem = ee.Image('NASA/NASADEM_HGT/001').select('elevation');
var demVis = {min: 0, max: 35, palette: ['teal', 'yellow', 'brown']};
Map.addLayer(dem.clip(studyArea), demVis, 'Elevation Map (Runoff Modeling)');


// 5. AUTOMATED STATISTICAL EXTRACTION
// Calculates the mean baseline Bare Soil Index directly within the exact boundary.
var stats = bsi.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: facilityPolygon,
  scale: 10,
  maxPixels: 1e9
});

print('--- MAGMA NORM FACILITY ENVIRONMENTAL STATS ---');
print('Exact Facility Area (Sq Meters):', facilityPolygon.area());
print('Mean Surface Soil Alteration (BSI):', stats.get('BSI'));

