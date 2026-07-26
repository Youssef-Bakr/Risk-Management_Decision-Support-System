// =========================================================================
// GOOGLE EARTH ENGINE (GEE) - 1000-METER ENVIRONMENTAL RUNOFF ANALYSIS PIPELINE
// =========================================================================

// 1. SET SATELLITE BASEMAP AS SYSTEM DEFAULT
Map.setOptions('SATELLITE');

// FORCE THE NATIVE ON-SCREEN METRIC MAP SCALE CONTROL (Bottom Right Corner)
Map.setControlVisibility({scaleControl: true});


// 2. CONSTRUCT RIGID SIDE PANEL INTERFACE
var sidePanel = ui.Panel({
  style: {
    width: '320px',
    padding: '15px',
    backgroundColor: '#1C1C1C', // Dark slate theme for readability over sat layers
    border: '1px solid #444444'
  }
});

// Main Panel Typography Elements
var panelTitle = ui.Label({
  value: 'MAGMA UAE NORM FACILITY AUDIT',
  style: {fontWeight: 'bold', fontSize: '16px', color: '#FFFFFF', margin: '0 0 5px 0'}
});
var panelSubtitle = ui.Label({
  value: '1000m Environmental Impact Analysis Layer Ledger',
  style: {fontSize: '11px', color: '#AAAAAA', margin: '0 0 20px 0'}
});
sidePanel.add(panelTitle).add(panelSubtitle);

// Functional row component generator for layer descriptions
var addLayerDescription = function(layerName, colorCode, descriptionText) {
  var container = ui.Panel({style: {backgroundColor: '#262626', padding: '8px', margin: '6px 0', borderRadius: '4px'}});
  
  var headerRow = ui.Panel({
    layout: ui.Panel.Layout.flow('horizontal'), 
    style: {backgroundColor: '#262626'} 
  });
  
  var colorIndicator = ui.Label({style: {backgroundColor: colorCode, padding: '6px', border: '1px solid #FFF'}});
  var titleLabel = ui.Label({value: layerName, style: {fontWeight: 'bold', fontSize: '12px', color: '#FFF', margin: '0 0 0 8px'}});
  
  headerRow.add(colorIndicator).add(titleLabel);
  
  var descLabel = ui.Label({
    value: descriptionText, 
    style: {fontSize: '11px', color: '#CCCCCC', margin: '6px 0 0 0', whiteSpace: 'normal'}
  });
  
  container.add(headerRow).add(descLabel);
  sidePanel.add(container);
};

// Populate the side panel documentation matrix
addLayerDescription('Buffered Study Zone (1000m)', '#D32F2F', 
  'Extended 1000-meter safety boundary used to monitor external surface runoff, soil chemistry alterations, and potential operational transport pathways.');

addLayerDescription('Original Base Footprint', '#00E5FF', 
  'The precise physical infrastructure boundary of the Magma NORM plant containing the descaling bays, processing yards, and staging assets.');

addLayerDescription('Bare Soil Index (BSI)', '#FFA500', 
  'Sentinel-2 surface substrate mapping. Highlights soil surface disturbances, crust modifications, or liquid residual disposal inside the buffer zone.');

addLayerDescription('Thermal Footprint (ST_B10)', '#E64A19', 
  'Landsat-9 surface heat emissions. Isolates high-energy processing signatures or engine deployment hotspots across the desert substrate.');

// Attach completed layout directly to the left panel node anchor
ui.root.insert(0, sidePanel);


// 3. CONSTRUCT COMPACT ON-SCREEN NORTH ARROW INDICATOR
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


// 4. GENERATE EXPERIMENTAL GEOMETRIES WITH 1000M BUFFER
var basePolygon = ee.Geometry.Polygon([
  [
    [52.768495, 24.080375], // Vertex 1 (Southwest)
    [52.771284, 24.081021], // Vertex 2 (Southeast)
    [52.770469, 24.083989], // Vertex 3 (Northeast)
    [52.767680, 24.083401], // Vertex 4 (Northwest)
    [52.768495, 24.080375]  // Complete polygon loop closure
  ]
]);

// Apply requested 1000-meter strict outer spatial buffer
var facilityPolygon = basePolygon.buffer(1000); 

// Center map view on the 1000m field boundaries (adjusted zoom to fit the larger footprint)
Map.centerObject(facilityPolygon, 14);

// Add visual vector limits on screen
Map.addLayer(facilityPolygon, {color: 'red', fillColor: '00000000'}, 'Buffered Study Zone (1000m)');
Map.addLayer(basePolygon, {color: 'cyan', fillColor: '00000000'}, 'Original Base Footprint');


// 5. EXTRACT RADIOMETRIC IMAGERY PIPELINES
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
Map.addLayer(bsi.clip(facilityPolygon), bsiVis, 'Bare Soil Index (BSI)');

var landsat9 = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
  .filterBounds(facilityPolygon)
  .filterDate('2026-01-01', '2026-07-14')
  .median();

var thermal = landsat9.select('ST_B10'); 
var thermalVis = {min: 295, max: 325, palette: ['blue', 'green', 'yellow', 'red']};
Map.addLayer(thermal.clip(facilityPolygon), thermalVis, 'Thermal Footprint (ST_B10)', false);


// 6. COMPUTE SPATIAL METRICS TO SYSTEM LOG CONSOLE
var bsiStats = bsi.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: facilityPolygon,
  scale: 10,
  maxPixels: 1e9
});

print('--- SYSTEM INVENTORY TELEMETRY ---');
print('Base Plant Footprint (Sq Meters):', basePolygon.area());
print('Total Buffer Evaluation Area (Sq Meters):', facilityPolygon.area());
print('Mean 1000m Study Zone Bare Soil Value:', bsiStats.get('BSI'));

