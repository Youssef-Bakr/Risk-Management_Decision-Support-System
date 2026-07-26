// =========================================================================
// GOOGLE EARTH ENGINE (GEE) - MAGMA NORM Environmental Impact Assessment Report DASHBOARD
// =========================================================================

// 1. SYSTEM INITIALIZATION & GEOMETRY
Map.setOptions('SATELLITE');
Map.setControlVisibility({scaleControl: true});
Map.style().set('cursor', 'hand');

var basePolygon = ee.Geometry.Polygon([
  [
    [52.768495, 24.080375], [52.771284, 24.081021], 
    [52.770469, 24.083989], [52.767680, 24.083401], 
    [52.768495, 24.080375]
  ]
]);

// Create a perfect 1500-meter circular buffer from the centroid of the facility
var facilityPolygon = basePolygon.centroid().buffer(1500); 
Map.centerObject(facilityPolygon, 14);

// 2. CURRENT Environmental Impact Assessment Report DATA (SENTINEL-2 & LANDSAT 9)
var startDate = '2025-01-01';
var endDate = '2026-07-14';

function maskS2clouds(image) {
  var qa = image.select('QA60');
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0).and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  return image.updateMask(mask).divide(10000).copyProperties(image, ["system:time_start"]);
}

var s2Col = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(facilityPolygon)
  .filterDate(startDate, endDate)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
  .map(maskS2clouds);

var calculateIndices = function(img) {
  var bsi = img.expression('((swir1 + red) - (nir + blue)) / ((swir1 + red) + (nir + blue))', {
      'swir1': img.select('B11'), 'red': img.select('B4'),
      'nir': img.select('B8'), 'blue': img.select('B2')
    }).rename('BSI');
  var ndmi = img.normalizedDifference(['B8', 'B11']).rename('NDMI'); 
  return img.addBands([bsi, ndmi]);
};

var s2WithIndices = s2Col.map(calculateIndices);
var medianIndices = s2WithIndices.median().clip(facilityPolygon);

var l9Thermal = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
  .filterBounds(facilityPolygon).filterDate(startDate, endDate).median()
  .select('ST_B10').multiply(0.00341802).add(149.0).clip(facilityPolygon); // Kelvin

// 3. CLIMATE PROJECTION DATA (NASA CMIP6 - SSP585 2030-2050)
var cmip6 = ee.ImageCollection("NASA/GDDP-CMIP6")
  .filterBounds(facilityPolygon)
  .filter(ee.Filter.eq('model', 'ACCESS-CM2'))
  .filter(ee.Filter.eq('scenario', 'ssp585')) // High-emission scenario
  .filterDate('2030-01-01', '2051-01-01');

// Convert Kelvin to Celsius, and kg/m2/s to mm/day
var formatClimate = function(img) {
  var tasmax = img.select('tasmax').subtract(273.15).rename('Max_Temp_C');
  var pr = img.select('pr').multiply(86400).rename('Precip_mm_day');
  return img.addBands([tasmax, pr]).select(['Max_Temp_C', 'Precip_mm_day']);
};

var cmip6Formatted = cmip6.map(formatClimate);
var cmip6Mean = cmip6Formatted.mean().clip(facilityPolygon.buffer(5000)); // Buffered for macro-visibility

// Aggregate Daily Climate Data to Yearly Means for Charting Efficiency
var years = ee.List.sequence(2030, 2050);
var yearlyClimate = ee.ImageCollection.fromImages(
  years.map(function(y) {
    return cmip6Formatted
      .filter(ee.Filter.calendarRange(y, y, 'year'))
      .mean()
      .set('system:time_start', ee.Date.fromYMD(y, 1, 1).millis());
  })
);

// 4. VISUALIZATION PARAMETERS
var visParams = {
  bsi: {min: -0.2, max: 0.4, palette: ['#0000FF', '#FFFF00', '#FFA500', '#FF0000']},
  ndmi: {min: -0.3, max: 0.3, palette: ['red', 'orange', 'yellow', 'cyan', 'blue']},
  thermal: {min: 295, max: 325, palette: ['blue', 'green', 'yellow', 'red']},
  projTemp: {min: 30, max: 45, palette: ['#ffffcc', '#fd8d3c', '#e31a1c', '#800026']},
  projPrecip: {min: 0, max: 2, palette: ['#f7fbff', '#6baed6', '#08519c']}
};

// Updated Geometry Layers (Red outline with Semi-transparent Red Fill for the Core)
Map.addLayer(facilityPolygon, {color: 'white', fillColor: '00000000'}, '1500m Buffer Limit', true);
Map.addLayer(basePolygon, {color: 'red', fillColor: 'FF000088'}, 'MAGMA NORM', true);

// 5. MAIN USER INTERFACE (SIDE PANEL - LIGHT THEME)
var sidePanel = ui.Panel({
  style: {width: '420px', padding: '15px', backgroundColor: '#FFFFFF', border: '1px solid #CCCCCC'}
});

var title = ui.Label('MAGMA NORM EIAR', {fontWeight: 'bold', fontSize: '18px', color: '#333333', backgroundColor: '#FFFFFF'});
var subtitle = ui.Label('Environmental Impact Assessment Report', {fontSize: '12px', color: '#666666', margin: '0 0 10px 0', backgroundColor: '#FFFFFF'});
sidePanel.add(title).add(subtitle);

// --- DEVELOPER INFO PANEL ---
var devPanel = ui.Panel({style: {backgroundColor: '#F8F9FA', padding: '10px', margin: '0 0 15px 0', borderRadius: '4px', border: '1px solid #E0E0E0'}});
devPanel.add(ui.Label('Lead EIAR Developer', {fontWeight: 'bold', fontSize: '13px', color: '#007BFF', backgroundColor: '#F8F9FA', margin: '0 0 5px 0'}));
devPanel.add(ui.Label('👤 Youssef Mohamed Bakr', {color: '#333333', fontSize: '12px', backgroundColor: '#F8F9FA', margin: '2px 0'}));
devPanel.add(ui.Label('🔗 LinkedIn Profile', {color: '#0056b3', fontSize: '12px', backgroundColor: '#F8F9FA', margin: '2px 0'}, 'https://www.linkedin.com/in/youssef-bakr'));
devPanel.add(ui.Label('📞 +20 112 112 1000', {color: '#333333', fontSize: '12px', backgroundColor: '#F8F9FA', margin: '2px 0'}));
sidePanel.add(devPanel);

// --- LAYER TOGGLES ---
var layerTogglePanel = ui.Panel({style: {backgroundColor: '#FFFFFF', margin: '10px 0'}});
var toggleHeader = ui.Label('Spatial Data Layers', {color: '#333333', fontWeight: 'bold', backgroundColor: '#FFFFFF'});
layerTogglePanel.add(toggleHeader);

var createToggle = function(name, image, vis, showDefault, description) {
  var layer = ui.Map.Layer(image, vis, name, showDefault);
  Map.layers().add(layer);
  var checkbox = ui.Checkbox({label: name, value: showDefault, style: {color: '#333333', backgroundColor: '#FFFFFF', fontWeight: 'bold'}, onChange: function(checked) { layer.setShown(checked); }});
  var desc = ui.Label(description, {fontSize: '11px', color: '#666666', margin: '0 0 10px 25px', backgroundColor: '#FFFFFF'});
  layerTogglePanel.add(checkbox).add(desc);
};

createToggle('Bare Soil Index (BSI)', medianIndices.select('BSI'), visParams.bsi, true, 'Current substrate modifications and crust disturbances.');
createToggle('Surface Moisture (NDMI)', medianIndices.select('NDMI'), visParams.ndmi, false, 'Tracks liquid residual runoff or pooling.');
createToggle('Thermal Footprint (Landsat 9)', l9Thermal, visParams.thermal, false, 'Current high-energy processing signatures.');
createToggle('2030-2050 Projected Max Temp', cmip6Mean.select('Max_Temp_C'), visParams.projTemp, false, 'CMIP6 Macro-climate projection for regional heatstress (°C).');
createToggle('2030-2050 Projected Precip', cmip6Mean.select('Precip_mm_day'), visParams.projPrecip, false, 'CMIP6 Macro-climate projection for daily rain (mm/day).');
sidePanel.add(layerTogglePanel);

// --- PERMANENT REGIONAL CHARTS PANEL ---
var chartPanel = ui.Panel({style: {backgroundColor: '#FFFFFF', padding: '10px', margin: '15px 0', border: '1px solid #E0E0E0'}});
chartPanel.add(ui.Label('Regional Analytics (1500m Buffer Zone)', {fontWeight: 'bold', color: '#333333', backgroundColor: '#FFFFFF', margin: '0 0 10px 0'}));

// 1. Generate BSI Chart (Region Mean)
var bsiChart = ui.Chart.image.series({
  imageCollection: s2WithIndices.select('BSI'), 
  region: facilityPolygon, 
  reducer: ee.Reducer.mean(), 
  scale: 30 
}).setOptions({
  title: 'Current BSI (Regional Soil Disturbance)',
  vAxis: {textStyle: {color: '#333333'}, titleTextStyle: {color: '#333333'}},
  hAxis: {textStyle: {color: '#333333'}},
  chartArea: {backgroundColor: '#FFFFFF'}, backgroundColor: '#FFFFFF',
  colors: ['#FFA500'], legend: {position: 'none'}, titleStyle: {color: '#333333', fontSize: 11}
});

// 2. Generate NDMI Chart (Region Mean)
var ndmiChart = ui.Chart.image.series({
  imageCollection: s2WithIndices.select('NDMI'), 
  region: facilityPolygon, 
  reducer: ee.Reducer.mean(), 
  scale: 30
}).setOptions({
  title: 'Current NDMI (Regional Surface Moisture)',
  vAxis: {textStyle: {color: '#333333'}, titleTextStyle: {color: '#333333'}},
  hAxis: {textStyle: {color: '#333333'}},
  chartArea: {backgroundColor: '#FFFFFF'}, backgroundColor: '#FFFFFF',
  colors: ['#00BFFF'], legend: {position: 'none'}, titleStyle: {color: '#333333', fontSize: 11}
});

// 3. Generate Localized Climate Projection Chart (Region Mean)
var projChart = ui.Chart.image.series({
  imageCollection: yearlyClimate, 
  region: facilityPolygon,
  reducer: ee.Reducer.mean(),
  scale: 25000, 
  xProperty: 'system:time_start'
}).setOptions({
  title: 'SSP585 Projections (2030-2050): Temp vs. Precip',
  vAxes: {
    0: {title: 'Max Temp (°C)', textStyle: {color: '#333333'}, titleTextStyle: {color: '#333333'}},
    1: {title: 'Precip (mm/day)', textStyle: {color: '#333333'}, titleTextStyle: {color: '#333333'}}
  },
  series: {
    0: {targetAxisIndex: 0, color: '#e31a1c', lineWidth: 2, pointSize: 3}, 
    1: {targetAxisIndex: 1, color: '#2b8cbe', lineWidth: 2, pointSize: 3}  
  },
  hAxis: {textStyle: {color: '#333333'}, format: 'yyyy'},
  chartArea: {backgroundColor: '#FFFFFF'},
  backgroundColor: '#FFFFFF',
  titleStyle: {color: '#333333', fontSize: 11},
  legend: {textStyle: {color: '#333333'}, position: 'bottom'}
});

chartPanel.add(bsiChart).add(ndmiChart).add(projChart);
sidePanel.add(chartPanel);

ui.root.insert(0, sidePanel);
