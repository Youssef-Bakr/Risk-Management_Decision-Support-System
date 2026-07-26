// =========================================================================
// GOOGLE EARTH ENGINE (GEE) - MAGMA UAE NORM FACILITY SINGLE-SITE ANALYSIS
// =========================================================================

// 1. DEFINE EXCLUSIVELY THE FACILITY PERIMETER
// Exact boundary coordinates enclosing the Magma NORM processing site
var facilityPolygon = ee.Geometry.Polygon([
  [
    [52.76865, 24.07842], // Southwest Corner
    [52.77295, 24.07842], // Southeast Corner
    [52.77295, 24.08215], // Northeast Corner
    [52.76865, 24.08215], // Northwest Corner
    [52.76865, 24.07842]  // Close polygon
  ]
]);

// Center map view on the facility with high zoom
Map.centerObject(facilityPolygon, 17);
Map.addLayer(facilityPolygon, {color: 'red', fillColor: '00000000'}, 'Magma UAE Site Boundary');


// 2. INTERNAL SOIL AND REACTION ALTERATION INDEX (Sentinel-2 BSI)
// Bare Soil Index focused only inside the facility lines to identify 
// chemical alterations, surface waste deposits, or structural changes.
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
// Clip strictly to the polygon boundary lines
Map.addLayer(bsi.clip(facilityPolygon), bsiVis, 'On-Site Soil Index');


// 3. TARGETED THERMAL OPERATIONAL SIGNATURE (Landsat 9 Thermal)
// Isolated surface temperatures to assess internal processing machinery heat outputs.
var landsat9 = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
  .filterBounds(facilityPolygon)
  .filterDate('2026-01-01', '2026-07-14')
  .median();

var thermal = landsat9.select('ST_B10'); 
var thermalVis = {min: 295, max: 325, palette: ['blue', 'green', 'yellow', 'red']};
// Clip strictly to the polygon boundary lines
Map.addLayer(thermal.clip(facilityPolygon), thermalVis, 'On-Site Thermal Footprint');


// 4. ON-SITE SLOPE AND SLOPE DIRECTIONS (NASADEM Elevation)
// Models internal terrain gradients to determine slope within the plant area.
var dem = ee.Image('NASA/NASADEM_HGT/001').select('elevation');
var slope = ee.Terrain.slope(dem);

var slopeVis = {min: 0, max: 5, palette: ['white', 'grey', 'black']};
// Clip strictly to the polygon boundary lines
Map.addLayer(slope.clip(facilityPolygon), slopeVis, 'Internal Site Slope');


// 5. DIRECT EXCLUSIVE ON-SITE METRICS CALCULATOR
// Computes exact surface and physical variables restricted to the boundary.
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

print('--- MAGMA NORM FACILITY ISOLATED AUDIT ---');
print('Facility Area Extent (Sq Meters):', facilityPolygon.area());
print('Mean On-Site Soil Index (BSI):', bsiStats.get('BSI'));
print('Maximum Surface Thermal Signature (Kelvin):', maxTempStats.get('ST_B10'));

