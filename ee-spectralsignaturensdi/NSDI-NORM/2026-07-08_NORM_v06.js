// =========================================================================
//Youssef Mohamed Bakr
//+201121121000
//Youssef.Bakr@drc.gov.eg
//Youssef.Bakr@faps.cu.edu.eg
// =========================================================================


// =========================================================================

var point = ee.Geometry.Point([52.769692825414495, 24.081562392352257]); 

// =========================================================================


// 1. Define the Area of Interest (AOI) for Al Ruwais Industrial City
// Coordinates format: [Min Longitude, Min Latitude, Max Longitude, Max Latitude]
var ruwaisAOI = ee.Geometry.Rectangle([52.55, 24.05, 52.78, 24.18]);

// 2. Center the map display on the AOI (Zoom level 12 works well for this scale)
Map.centerObject(point, 18);

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
// CLIMATE RISK ASSESSMENT: HISTORICAL EXTREME HEAT TRENDS (MODIS LST)
// =========================================================================

// 1. Define Area of Interest (AOI) - Defaults to a region around New York City
// Feel free to draw your own polygon on the map or change these coordinates.


//Map.centerObject(point, 12);
//Map.addLayer(ruwaisAOI, {color: 'grey'}, 'Area of Interest', false);

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

/*
// =========================================================================
// CLIMATE ASSESSMENT: IPCC AR6 FUTURE SEA LEVEL RISE (SLR) INUNDATION
// =========================================================================


// 2. Load Topographic Elevation Model (NASADEM)
// Note: Global coastal mapping has a vertical error bias, but NASADEM is widely used.
var elevation = ee.Image('NASA/NASADEM_HGT/001').select('elevation').clip(ruwaisAOI);

// 3. Load IPCC AR6 Sea Level Projections Dataset (Medium Confidence)
// This collection provides future scenario models (SSPs) from 2020 to 2150.
var ipccCollection = ee.ImageCollection('projects/sat-io/open-datasets/IPCC_AR6_SLP')
  .filterBounds(ruwaisAOI);

// Scenario Selector Example: 
// SSP5-8.5 (High emission reference scenario) for the year 2100
var targetYear = 2100;
var scenario = 'ssp585'; // Options: ssp119, ssp126, ssp245, ssp370, ssp585

var slrProjection = ipccCollection
  .filter(ee.Filter.eq('scenario', scenario))
  .filter(ee.Filter.eq('year', targetYear))
  .select('total') // 'total' represents total sea level change relative to baseline (meters)
  .mean()          // Collapse any minor variation into a single baseline image
  .clip(ruwaisAOI);

// Reduce the local projected sea level rise to a single scalar value for calculation
// If regional details are highly complex, we pull the average rise over our AOI.
var localSLRRise = slrProjection.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: ruwaisAOI,
  scale: 1000,
  maxPixels: 1e9
}).get('total');

// Print out the expected SLR meter change in the console
print(ee.String('Projected SLR Rise (meters) by ').cat(ee.Number(targetYear).format()), localSLRRise);

// 4. Model Inundation (Simple Bathtub Model Approach)
// Step A: Isolate existing land (Elevation > 0)
var landMask = elevation.gt(0);

// Step B: Calculate land that falls BELOW the projected Sea Level Rise threshold
// Convert localSLRRise from server object to a number directly evaluated against the DEM
var futureInundation = elevation.lte(ee.Image.constant(localSLRRise))
  .and(landMask); // Only map what used to be dry land

// 5. Visualizations
Map.addLayer(elevation, {min: 0, max: 15, palette: ['#ece7f2', '#a6bddb', '#2b8cbe']}, 'Topography (Elevation)', false);

// Mask out non-flooded areas so only vulnerable/inundated zones display in red
var floodedVisualized = futureInundation.updateMask(futureInundation.eq(1));
Map.addLayer(floodedVisualized, {palette: ['#E74C3C']}, 'Projected 2100 Inundation (SSP5-8.5)');

// 6. UI Legend 
var legend = ui.Panel({style: {position: 'bottom-right', padding: '8px 15px'}});
legend.add(ui.Label({value: 'Climate Risk Risk Legend', style: {fontWeight: 'bold', fontSize: '14px', margin: '0 0 6px 0'}}));
legend.add(ui.Panel([
  ui.Panel({style: {backgroundColor: '#E74C3C', width: '30px', height: '15px', margin: '0 5px 0 0'}}),
  ui.Label({value: 'Inundated Land Zone', style: {fontSize: '13px'}})]
, ui.Panel.Layout.Flow('horizontal')));
Map.add(legend);

*/





// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
var collection = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_CH4')
  .select('CH4_column_volume_mixing_ratio_dry_air')
  .filterDate('2026-01-01', '2026-05-31');

var band_viz = {
  min: 1750,
  max: 1900,
  palette: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']
};

Map.addLayer(collection.mean(), band_viz, 'S5P CH4',false);

// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
var collection = ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_CO')
  .select('CO_column_number_density')
  .filterDate('2026-01-01', '2026-05-31');

var band_viz = {
  min: 0,
  max: 0.05,
  palette: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']
};

Map.addLayer(collection.mean(), band_viz, 'S5P CO',false);
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
var collection = ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_AER_AI')
  .select('absorbing_aerosol_index')
  .filterDate('2026-01-01', '2026-05-31');

var band_viz = {
  min: -1,
  max: 2.0,
  palette: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']
};

Map.addLayer(collection.mean(), band_viz, 'S5P Aerosol',false);
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------

var collection = ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_HCHO')
  .select('tropospheric_HCHO_column_number_density')
  .filterDate('2026-01-01', '2026-05-31');

var band_viz = {
  min: 0.0,
  max: 0.0003,
  palette: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']
};

Map.addLayer(collection.mean(), band_viz, 'S5P HCHO',false);

// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
var collection = ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_NO2')
  .select('NO2_column_number_density')
  .filterDate('2026-01-01', '2026-05-31');

var band_viz = {
  min: 0,
  max: 0.0002,
  palette: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']
};

Map.addLayer(collection.mean(), band_viz, 'S5P N02',false);
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
var imgVV = ee.ImageCollection('COPERNICUS/S1_GRD')
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
        .filter(ee.Filter.eq('instrumentMode', 'IW'))
        .select('VV')
        .map(function(image) {
          var edge = image.lt(-30.0);
          var maskedImage = image.mask().and(edge.not());
          return image.updateMask(maskedImage);
        });

var desc = imgVV.filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'));
var asc = imgVV.filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'));

var spring = ee.Filter.date('2025-03-01', '2025-04-20');
var lateSpring = ee.Filter.date('2025-04-21', '2025-06-10');
var summer = ee.Filter.date('2025-06-11', '2025-08-31');

var descChange = ee.Image.cat(
        desc.filter(spring).mean(),
        desc.filter(lateSpring).mean(),
        desc.filter(summer).mean());

var ascChange = ee.Image.cat(
        asc.filter(spring).mean(),
        asc.filter(lateSpring).mean(),
        asc.filter(summer).mean());


Map.addLayer(ascChange, {min: -25, max: 5}, 'Multi-T Mean ASC', false);
Map.addLayer(descChange, {min: -25, max: 5}, 'Multi-T Mean DESC', false);



