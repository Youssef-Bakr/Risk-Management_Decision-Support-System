// =========================================================================
// GOOGLE EARTH ENGINE (GEE) - SATELLITE BASEMAP & NORTH INDICATOR VIEW
// =========================================================================

// 1. FORCE THE DEFAULT MAP VIEW TO HIGH-RESOLUTION SATELLITE IMAGERY
Map.setOptions('SATELLITE');


// 2. CREATE A CUSTOM VISUAL NORTH ARROW INDICATOR PANEL
var northArrowPanel = ui.Label({
  value: '▲ N',
  style: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#D32F2F',           // Dark red for visibility
    backgroundColor: '#FFFFFF',  // Clean white card background
    padding: '8px 12px',
    border: '2px solid #333333',
    borderRadius: '4px',
    position: 'bottom-left'      // Positioned securely in map overlay
  }
});

// Add the visual indicator overlay onto the map display interface
Map.add(northArrowPanel);


// 3. DEFINE BASE FACILITY POLYGON VIA YOUR EXACT 4 VERTICES
var basePolygon = ee.Geometry.Polygon([
  [
    [52.768495, 24.080375], // Vertex 1 (Southwest)
    [52.771284, 24.081021], // Vertex 2 (Southeast)
    [52.770469, 24.083989], // Vertex 3 (Northeast)
    [52.767680, 24.083401], // Vertex 4 (Northwest)
    [52.768495, 24.080375]  // Repeat Vertex 1 to close the loop
  ]
]);

// Apply a strict 1-meter outer buffer around the base footprint polygon
var facilityPolygon = basePolygon.buffer(1); 

// Center the map display on the buffered footprint bounds (Zoom level 18)
Map.centerObject(facilityPolygon, 18);

// Add layers to the interactive map interface
Map.addLayer(facilityPolygon, {color: 'red', fillColor: '00000000'}, 'Buffered Site Boundary (1m)');
Map.addLayer(basePolygon, {color: 'gray', fillColor: '00000000'}, 'Original Base Footprint', false);


// 4. INTERNAL SURFACE VARIATION ANALYSIS (Sentinel-2 BSI)
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


// 5. TARGETED INTERNAL THERMAL SIGNATURE (Landsat 9 Thermal)
var landsat9 = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
  .filterBounds(facilityPolygon)
  .filterDate('2026-01-01', '2026-07-14')
  .median();

var thermal = landsat9.select('ST_B10'); 
var thermalVis = {min: 295, max: 325, palette: ['blue', 'green', 'yellow', 'red']};
Map.addLayer(thermal.clip(facilityPolygon), thermalVis, 'Targeted On-Site Thermal Footprint');


// 6. PRECISE STATISTICAL EXTRACTION FOR AUDITING
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

print('--- ENVIRONMENTAL METRICS FROM SPECIFIED BUFFERED BOUNDS ---');
print('Base Area Extent (Sq Meters):', basePolygon.area());
print('Buffered Area Extent (Sq Meters):', facilityPolygon.area());
print('On-Site Bare Soil Index (BSI Average):', bsiStats.get('BSI'));
print('Maximum On-Site Thermal Signature (Kelvin):', maxTempStats.get('ST_B10'));

