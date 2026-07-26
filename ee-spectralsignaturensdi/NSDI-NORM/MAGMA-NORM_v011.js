// =========================================================================
// GOOGLE EARTH ENGINE (GEE) - 107-METER BUFFER & INTERACTIVE BSI LEGEND
// =========================================================================

// 1. FORCE THE DEFAULT MAP VIEW TO HIGH-RESOLUTION SATELLITE IMAGERY
Map.setOptions('SATELLITE');


// 2. CREATE A CUSTOM VISUAL NORTH ARROW INDICATOR PANEL
var northArrowPanel = ui.Label({
  value: '▲ N',
  style: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#D32F2F',           
    backgroundColor: '#FFFFFF',  
    padding: '6px 10px',
    border: '1px solid #333333',
    borderRadius: '4px',
    position: 'bottom-left'      
  }
});
Map.add(northArrowPanel);


// 3. ADD DYNAMIC MAP SCALE CONTROL TO THE USER INTERFACE
Map.setControlVisibility({scaleControl: true});


// 4. BUILD THE COLOR-RAMP LEGEND FOR THE BARE SOIL INDEX (BSI)
var legendPanel = ui.Panel({
  style: {
    position: 'bottom-right',
    padding: '10px 15px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    border: '1px solid #999999',
    borderRadius: '4px',
    width: '180px'
  }
});

var legendTitle = ui.Label({
  value: 'Bare Soil Index (BSI)',
  style: {fontWeight: 'bold', fontSize: '14px', margin: '0 0 8px 0'}
});
legendPanel.add(legendTitle);

// Create the discrete color ramp bar graphic
var makeColorBar = function(color) {
  return ui.Label({
    style: {
      backgroundColor: color,
      padding: '10px',
      margin: '0',
      width: '100%'
    }
  });
};

var palette = ['blue', 'yellow', 'orange', 'red'];
var labels = ['0.0 (Low Impact)', '0.12', '0.23', '0.35+ (High Disturbance)'];

// Loop sequentially to assemble the user interface color rows
for (var i = 0; i < palette.length; i++) {
  var row = ui.Panel({
    layout: ui.Panel.Layout.flow('horizontal'),
    style: {margin: '4px 0'}
  });
  
  var colorBox = ui.Label({
    style: {
      backgroundColor: palette[i],
      padding: '8px',
      border: '1px solid #555'
    }
  });
  
  var labelText = ui.Label({
    value: labels[i],
    style: {margin: '0 0 0 10px', fontSize: '12px'}
  });
  
  row.add(colorBox);
  row.add(labelText);
  legendPanel.add(row);
}
Map.add(legendPanel);


// 5. DEFINE BASE FACILITY POLYGON VIA YOUR EXACT 4 VERTICES
var basePolygon = ee.Geometry.Polygon([
  [
    [52.768495, 24.080375], // Vertex 1 (Southwest)
    [52.771284, 24.081021], // Vertex 2 (Southeast)
    [52.770469, 24.083989], // Vertex 3 (Northeast)
    [52.767680, 24.083401], // Vertex 4 (Northwest)
    [52.768495, 24.080375]  // Repeat Vertex 1 to close the loop
  ]
]);

// Apply a total 107-meter outer buffer (7m previous + 100m added)
var facilityPolygon = basePolygon.buffer(107); 

// Center the map display on the buffered footprint bounds (Zoom level 16 for context)
Map.centerObject(facilityPolygon, 16);

// Add layers to the interactive map interface
Map.addLayer(facilityPolygon, {color: 'red', fillColor: '00000000'}, 'Buffered Study Zone (107m)');
Map.addLayer(basePolygon, {color: 'cyan', fillColor: '00000000'}, 'Original Base Footprint');


// 6. INTERNAL SURFACE VARIATION ANALYSIS (Sentinel-2 BSI)
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

var bsiVis = {min: 0.0, max: 0.35, palette: palette};
Map.addLayer(bsi.clip(facilityPolygon), bsiVis, 'On-Site Surface Substrate Signature');


// 7. TARGETED INTERNAL THERMAL SIGNATURE (Landsat 9 Thermal)
var landsat9 = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
  .filterBounds(facilityPolygon)
  .filterDate('2026-01-01', '2026-07-14')
  .median();

var thermal = landsat9.select('ST_B10'); 
var thermalVis = {min: 295, max: 325, palette: ['blue', 'green', 'yellow', 'red']};
Map.addLayer(thermal.clip(facilityPolygon), thermalVis, 'Targeted On-Site Thermal Footprint', false);


// 8. PRECISE STATISTICAL EXTRACTION FOR AUDITING
var bsiStats = bsi.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: facilityPolygon,
  scale: 10,
  maxPixels: 1e9
});

print('--- ENVIRONMENTAL METRICS FROM 107M BUFFERED ZONE ---');
print('Base Area Extent (Sq Meters):', basePolygon.area());
print('Total Buffered Evaluation Area (Sq Meters):', facilityPolygon.area());
print('Mean Zone Bare Soil Index (BSI Average):', bsiStats.get('BSI'));

