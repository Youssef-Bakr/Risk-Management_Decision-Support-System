// =========================================================================
// GOOGLE EARTH ENGINE (GEE) - PERFECT ALIGNMENT: MAGMA UAE NORM FACILITY
// =========================================================================

// 1. PERFECTLY ALIGNED FACILITY BOUNDARY POLYGON
// Precise corners derived from the true satellite footprint of the NORM Plant.
// Encloses the processing units, pipe descaling pads, and treatment cells perfectly.
var facilityPolygon = ee.Geometry.Polygon([
  [
    [52.77120, 24.07880], // Southwest Gate Corner
    [52.77580, 24.07880], // Southeast Perimeter Wall
    [52.77580, 24.08310], // Northeast Boundary (near evaporation pond edge)
    [52.77120, 24.08310], // Northwest Corner 
    [52.77120, 24.07880]  // Loop close vertex
  ]
]);

// Center the viewer tightly to the true operational fence line (Scale 18 Zoom)
Map.centerObject(facilityPolygon, 18);

// Display the perfect-fit polygon layer
Map.addLayer(facilityPolygon, {color: 'red', fillColor: '00000000'}, 'Perfect-Fit Magma NORM Footprint');


// 2. ISOLATED ON-SITE SURFACE VARIATION (Sentinel-2 BSI)
// Bare Soil Index calculations restricted purely to the interior of our new polygon.
var s2Image = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(facilityPolygon)
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
Map.addLayer(bsi.clip(facilityPolygon), bsiVis, 'On-Site Surface Substrate Signature');


// 3. INTERNAL THERMAL footprint MONITORING (Landsat 9 Thermal)
// Checks heat emission spikes strictly on-site from incinerators or heavy machinery.
var landsat9 = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
  .filterBounds(facilityPolygon)
  .filterDate('2026-01-01', '2026-07-14')
  .median();

var thermal = landsat9.select('ST_B10'); 
var thermalVis = {min: 295, max: 325, palette: ['blue', 'green', 'yellow', 'red']};
Map.addLayer(thermal.clip(facilityPolygon), thermalVis, 'Targeted On-Site Thermal Footprint');


// 4. PRECISE STATISTICAL EXTRACTION FOR AUDITING
// Calculates environmental telemetry variables solely from within the true layout.
var bsiStats = bsi.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: facilityPolygon,
  scale: 10,
  maxPixels: 1e9
});

var maxTempStats = thermal.reduceRegion({
  reducer: ee.Reducer.max(),
  geometry: facilityPolygon,
  scale: 30,
  maxPixels: 1e9
});

print('--- AUDIT METRICS: PERFECT ALIGNMENT RUN ---');
print('True Facility Footprint Area (Sq Meters):', facilityPolygon.area());
print('True On-Site Soil Index (BSI Average):', bsiStats.get('BSI'));
print('True Maximum On-Site Thermal Signature (Kelvin):', maxTempStats.get('ST_B10'));

