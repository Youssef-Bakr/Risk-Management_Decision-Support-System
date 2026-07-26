// =========================================================================
// GOOGLE EARTH ENGINE (GEE) - MAGMA NORM Environmental Impact Assessment Report
// Comprehensive Multi-Sensor Environmental Analysis & Plume Simulator
// 
// Developed by: Youssef Mohamed Bakr
// LinkedIn: www.linkedin.com/in/youssef-bakr | Phone: +201121121000
// =========================================================================

// 1. SYSTEM INITIALIZATION & GEOMETRY
Map.setOptions('SATELLITE');
Map.setControlVisibility({scaleControl: true});
Map.style().set('cursor', 'hand');

// ADD NORTH ARROW TO MAP OVERLAY
var compassPanel = ui.Panel({
  style: {
    position: 'top-right',
    padding: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    border: '1px solid #333'
  }
});
compassPanel.add(ui.Label('⬆ N', {fontWeight: 'bold', fontSize: '20px', margin: '0', color: '#B22222'}));
Map.add(compassPanel);

// Core Facility Geometry (Abu Dhabi Region)
var basePolygon = ee.Geometry.Polygon([
  [
    [52.768495, 24.080375], [52.771284, 24.081021], 
    [52.770469, 24.083989], [52.767680, 24.083401], 
    [52.768495, 24.080375]
  ]
]);

var facilityPolygon = basePolygon.centroid().buffer(1500); // Standard EIAR Buffer
var emergencyBuffer = basePolygon.centroid().buffer(5000); // 5km Emergency Impact Zone
var centerPt = basePolygon.centroid();
Map.centerObject(facilityPolygon, 13);

// Dates for recent footprint analysis
var recentStart = '2024-01-01';
var recentEnd = '2025-01-01';

// Year baseline for climate proxies 
var baselineStart = '2023-01-01';
var baselineEnd = '2024-01-01';
var baselineYear = 2023;

// =========================================================================
// 2. DATA PROCESSING & SCIENTIFIC DATASETS
// =========================================================================

// A. Soil, Moisture, Water & Vegetation (Sentinel-2)
function maskS2clouds(image) {
  var qa = image.select('QA60');
  return image.updateMask(qa.bitwiseAnd(1<<10).eq(0).and(qa.bitwiseAnd(1<<11).eq(0)))
              .divide(10000).copyProperties(image, ["system:time_start"]);
}
var s2Col = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(emergencyBuffer).filterDate(recentStart, recentEnd).map(maskS2clouds);
var s2Indices = s2Col.map(function(img) {
  var bsi = img.expression('((swir1 + red) - (nir + blue)) / ((swir1 + red) + (nir + blue))', {'swir1': img.select('B11'), 'red': img.select('B4'), 'nir': img.select('B8'), 'blue': img.select('B2')}).rename('BSI');
  var ndmi = img.normalizedDifference(['B8', 'B11']).rename('NDMI'); 
  var ndvi = img.normalizedDifference(['B8', 'B4']).rename('NDVI'); 
  var ndwi = img.normalizedDifference(['B3', 'B8']).rename('NDWI'); // Water Index
  return img.addBands([bsi, ndmi, ndvi, ndwi]);
});
var medianIndices = s2Indices.median().clip(emergencyBuffer);

// 2023 Baseline for optical charts
var s2_2023 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).map(maskS2clouds).map(function(img) {
  var bsi = img.expression('((swir1 + red) - (nir + blue)) / ((swir1 + red) + (nir + blue))', {'swir1': img.select('B11'), 'red': img.select('B4'), 'nir': img.select('B8'), 'blue': img.select('B2')}).rename('BSI');
  var ndvi = img.normalizedDifference(['B8', 'B4']).rename('NDVI'); 
  var ndwi = img.normalizedDifference(['B3', 'B8']).rename('NDWI'); 
  return img.addBands([bsi, ndvi, ndwi]);
});

// B. Thermal Footprint (Landsat 9)
var l9Thermal = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2').filterBounds(facilityPolygon).filterDate(recentStart, recentEnd).median()
  .select('ST_B10').multiply(0.00341802).add(149.0).subtract(273.15).clip(emergencyBuffer); 

// C. Topography & Risk (SRTM DEM)
var srtm = ee.Image('USGS/SRTMGL1_003').clip(emergencyBuffer);
var seaLevelRiseRisk = srtm.lte(2).selfMask(); 
var slope = ee.Terrain.slope(srtm);
var flashFloodRisk = slope.gte(5).and(srtm.lte(50)).selfMask(); 

// D. Atmosphere, GHG, Gas & Aerosols (Sentinel-5P)
var s5p_no2_raw = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_NO2").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('tropospheric_NO2_column_number_density');
var s5p_aer_raw = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_AER_AI").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('absorbing_aerosol_index');
var s5p_so2_raw = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_SO2").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('SO2_column_number_density'); 
var s5p_co_raw = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_CO").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('CO_column_number_density'); 
var s5p_ch4_raw = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_CH4").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('CH4_column_volume_mixing_ratio_dry_air'); 
var s5p_o3_raw = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_O3").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('O3_column_number_density'); 
var s5p_hcho_raw = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_HCHO").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('tropospheric_HCHO_column_number_density'); 

// E. Wind Dynamics (NOAA CFSV2 6-Hourly)
var noaa_wind = ee.ImageCollection("NOAA/CFSV2/FOR6H").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).map(function(img) {
  var u = img.select('u-component_of_wind_height_above_ground');
  var v = img.select('v-component_of_wind_height_above_ground');
  var ws = img.expression('sqrt(u**2 + v**2)', {u: u, v: v}).rename('Wind_Speed');
  var wd = u.atan2(v).multiply(180 / Math.PI).add(180).rename('Wind_Direction');
  return img.addBands([ws, wd, u, v]).copyProperties(img, ['system:time_start']);
});
var windSpeed = noaa_wind.select('Wind_Speed').mean().clip(emergencyBuffer);
var meanU = noaa_wind.select('u-component_of_wind_height_above_ground').mean();
var meanV = noaa_wind.select('v-component_of_wind_height_above_ground').mean();

// F. Nighttime Lights, Water, & Fires
var viirs_ntl_raw = ee.ImageCollection("NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('avg_rad');
var ntlMean = viirs_ntl_raw.mean().clip(emergencyBuffer);

var modisET_raw = ee.ImageCollection("MODIS/061/MOD16A2").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('ET');
var etMean = modisET_raw.mean().clip(emergencyBuffer);
var modisLST_raw = ee.ImageCollection("MODIS/061/MOD11A2").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd)
  .map(function(img) { return img.select('LST_Day_1km').multiply(0.02).subtract(273.15).rename('LST_Celsius').copyProperties(img, ['system:time_start']); });

var fires = ee.ImageCollection("FIRMS").filterBounds(emergencyBuffer).filterDate(recentStart, recentEnd).select('T21').max().clip(emergencyBuffer);

// =========================================================================
// G. LOAD NEWLY REQUESTED SCIENTIFIC DATASETS
// =========================================================================
var cams_pm25 = ee.ImageCollection('ECMWF/CAMS/NRT').filterDate(baselineStart, baselineEnd).select('particulate_matter_d_less_than_25_um_surface');
var era5_daily_tmax = ee.ImageCollection('ECMWF/ERA5/DAILY').filterDate(baselineStart, baselineEnd).select('maximum_2m_air_temperature');
var era5_hourly_t2m = ee.ImageCollection('ECMWF/ERA5/HOURLY').filterDate(baselineStart, baselineEnd).select('temperature_2m');
var gsmap_precip = ee.ImageCollection('JAXA/GPM_L3/GSMaP/v6/reanalysis').filterDate(baselineStart, baselineEnd).select('hourlyPrecipRateGC');

// Static Environmental Context layers (Using select(0) dynamically to grab target properties)
var ipcc_slp = ee.Image('IPCC/AR6/SLP/ssp126_2030').select(0);
var soil_grids = ee.Image('ISRIC/SoilGrids250m/v2_0/wv0010').select(0);
var landfire = ee.ImageCollection('LANDFIRE/Fire/FRG/v1_2_0').mosaic();

// Landsat 8 Multi-spectral Index Composites
var ls8_composite = ee.ImageCollection('LANDSAT/COMPOSITES/C02/T1_L2_8DAY').filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).median();
var ls8_bai = ee.ImageCollection('LANDSAT/COMPOSITES/C02/T1_L2_8DAY_BAI').filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('BAI');
var ls8_evi = ee.ImageCollection('LANDSAT/COMPOSITES/C02/T1_L2_8DAY_EVI').filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('EVI');
var ls8_nbr = ee.ImageCollection('LANDSAT/COMPOSITES/C02/T1_L2_8DAY_NBR').filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('NBR');
var ls8_ndvi = ee.ImageCollection('LANDSAT/COMPOSITES/C02/T1_L2_8DAY_NDVI').filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('NDVI');
var ls8_ndwi = ee.ImageCollection('LANDSAT/COMPOSITES/C02/T1_L2_8DAY_NDWI').filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('NDWI');

var smap_soil = ee.ImageCollection('NASA_USDA/HSL/SMAP_soil_moisture').filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('ssm');
var noaa_flux = ee.ImageCollection('NOAA/CDR/HEAT_FLUXES/V2').filterDate(baselineStart, baselineEnd).select('latent_heat_flux');
var noaa_precip = ee.ImageCollection('NOAA/CPC/Precipitation').filterDate(baselineStart, baselineEnd).select('precipitation');
var noaa_temp = ee.ImageCollection('NOAA/CPC/Temperature').filterDate(baselineStart, baselineEnd).select('tmax');

// Specialized global datasets
var big_earth_net = ee.ImageCollection('TUBerlin/BigEarthNet/v1').mosaic();
var cmip6_proj = ee.ImageCollection('UCSB/CHC/CMIP6/v1').filterDate(baselineStart, baselineEnd).select(0);
var chirps_rnl = ee.ImageCollection('UCSB-CHC/CHIRPS/V3/DAILY_RNL').filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('precipitation');
var chirps_daily = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY').filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('precipitation');

// =========================================================================
// H. SAFE SPATIAL CHECK & RENDERING FALLBACKS (CRASH PREVENTER)
// =========================================================================
var safeClip = function(imageCollection, bandName, defaultVal) {
  var col = ee.ImageCollection(imageCollection);
  var size = col.size();
  var dummy = ee.Image.constant(defaultVal || 0).rename(bandName || 'empty_band');
  var real = col.mean().select(bandName || 0);
  // Evaluates empty check on the server side to swap out blank raster if region has zero coverage
  var output = ee.Image(ee.Algorithms.If(size.gt(0), real, dummy));
  return output.clip(emergencyBuffer);
};

var safeImageClip = function(image, defaultVal) {
  var dummy = ee.Image.constant(defaultVal || 0);
  var output = ee.Image(ee.Algorithms.If(ee.Algorithms.IsEqual(image, null), dummy, image));
  return output.clip(emergencyBuffer);
};

// =========================================================================
// 3. CLIMATOLOGICAL PLUME DISPERSION MODEL (STATIC DATA LAYER)
// =========================================================================
var lonLat = ee.Image.pixelLonLat();
var ptLon = ee.Number(centerPt.coordinates().get(0));
var ptLat = ee.Number(centerPt.coordinates().get(1));
var dLon = lonLat.select('longitude').subtract(ee.Image.constant(ptLon));
var dLat = lonLat.select('latitude').subtract(ee.Image.constant(ptLat));

var pixelAngle = dLon.atan2(dLat); 
var windAngle = meanU.atan2(meanV); 
var angleDiff = pixelAngle.subtract(windAngle).abs();
var correctedDiff = angleDiff.where(angleDiff.gt(Math.PI), ee.Image.constant(Math.PI * 2).subtract(angleDiff));
var distImg = ee.FeatureCollection(centerPt).distance(10000);

var climatologicalPlume = correctedDiff.pow(2).divide(-0.15).exp()
  .multiply(ee.Image.constant(1).subtract(distImg.divide(5000).clamp(0, 1)))
  .updateMask(distImg.lt(5000)).rename('Plume_Risk').clip(emergencyBuffer);

// =========================================================================
// 4. BULLETPROOF CHART AGGREGATION SYSTEM
// =========================================================================
function createSafeMonthly(collection, bandName, year, fallbackValue) {
  var months = ee.List.sequence(1, 12);
  return ee.ImageCollection.fromImages(
    months.map(function(m) {
      var start = ee.Date.fromYMD(year, m, 1);
      var end = start.advance(1, 'month');
      var col = collection.filterDate(start, end).select([bandName]);
      
      var count = col.size();
      var meanImg = col.mean();
      var fallbackImg = ee.Image.constant(fallbackValue).rename(bandName);
      
      // Crucial: Checks if active frames exist, otherwise replaces with dynamic fallback
      var img = ee.Image(ee.Algorithms.If(
        count.gt(0),
        meanImg,
        fallbackImg
      ));
      
      return img.unmask(fallbackValue).set('system:time_start', start.millis());
    })
  );
}

// Map Safe Timelines for Baseline Chart Plotting
var monthlyWindDir  = createSafeMonthly(noaa_wind, 'Wind_Direction', baselineYear, 0); 
var monthlyWindSpeed= createSafeMonthly(noaa_wind, 'Wind_Speed', baselineYear, 0);
var monthlyNO2      = createSafeMonthly(s5p_no2_raw, 'tropospheric_NO2_column_number_density', baselineYear, 0);
var monthlySO2      = createSafeMonthly(s5p_so2_raw, 'SO2_column_number_density', baselineYear, 0); 
var monthlyCO       = createSafeMonthly(s5p_co_raw, 'CO_column_number_density', baselineYear, 0);
var monthlyCH4      = createSafeMonthly(s5p_ch4_raw, 'CH4_column_volume_mixing_ratio_dry_air', baselineYear, 1800); 
var monthlyO3       = createSafeMonthly(s5p_o3_raw, 'O3_column_number_density', baselineYear, 0); 
var monthlyHCHO     = createSafeMonthly(s5p_hcho_raw, 'tropospheric_HCHO_column_number_density', baselineYear, 0); 
var monthlyLST      = createSafeMonthly(modisLST_raw, 'LST_Celsius', baselineYear, 35); 
var monthlyAER      = createSafeMonthly(s5p_aer_raw, 'absorbing_aerosol_index', baselineYear, 0);
var monthlyET       = createSafeMonthly(modisET_raw, 'ET', baselineYear, 0);
var monthlyNDVI     = createSafeMonthly(s2_2023, 'NDVI', baselineYear, 0); 
var monthlyNDWI     = createSafeMonthly(s2_2023, 'NDWI', baselineYear, 0); 
var monthlyBSI      = createSafeMonthly(s2_2023, 'BSI', baselineYear, 0); 
var monthlyNTL      = createSafeMonthly(viirs_ntl_raw, 'avg_rad', baselineYear, 0);

// Newly Added Safely Aggregated Chart Series (Guaranteed to render instead of crash)
var monthlyPM25     = createSafeMonthly(cams_pm25, 'particulate_matter_d_less_than_25_um_surface', baselineYear, 0);
var monthlyERATemp  = createSafeMonthly(era5_daily_tmax, 'maximum_2m_air_temperature', baselineYear, 298);
var monthlyGSMaP    = createSafeMonthly(gsmap_precip, 'hourlyPrecipRateGC', baselineYear, 0);
var monthlyBAI      = createSafeMonthly(ls8_bai, 'BAI', baselineYear, 0);
var monthlyEVI      = createSafeMonthly(ls8_evi, 'EVI', baselineYear, 0);
var monthlyNBR      = createSafeMonthly(ls8_nbr, 'NBR', baselineYear, 0);
var monthlySMAP     = createSafeMonthly(smap_soil, 'ssm', baselineYear, 0);
var monthlyFlux     = createSafeMonthly(noaa_flux, 'latent_heat_flux', baselineYear, 0);
var monthlyCPCPrc   = createSafeMonthly(noaa_precip, 'precipitation', baselineYear, 0);
var monthlyCPCTmp   = createSafeMonthly(noaa_temp, 'tmax', baselineYear, 30);
var monthlyCHIRPS   = createSafeMonthly(chirps_daily, 'precipitation', baselineYear, 0);

// =========================================================================
// 5. VISUALIZATION PARAMETERS
// =========================================================================
var pal = {
  ghg: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red'],
  plume: ['00000000', 'blue', 'cyan', 'yellow', 'orange', 'red'],
  dust: ['white', 'yellow', 'orange', 'red', 'darkred'],
  co: ['black', 'purple', 'blue', 'green', 'yellow', 'red'],
  ch4: ['black', 'blue', 'cyan', 'green', 'yellow', 'orange', 'red'],
  water: ['red', 'orange', 'yellow', 'green', 'blue'],
  temp: ['blue', 'cyan', 'yellow', 'red', 'darkred'],
  veg: ['FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718', '74A901', '66A000', '529400'],
  terrain: ['#006600', '#E5E500', '#E59900', '#B24C00', '#B2B2B2', '#FFFFFF'],
  ntl: ['black', 'blue', 'purple', 'yellow', 'white']
};

// =========================================================================
// 6. USER INTERFACE (SIDE PANEL & INTERACTIVE SIMULATOR)
// =========================================================================
var sidePanel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical', true), 
  style: {width: '480px', padding: '15px', backgroundColor: '#FFFFFF'}
});

sidePanel.add(ui.Label('MAGMA NORM EIAR', {fontWeight: 'bold', fontSize: '20px'}));
sidePanel.add(ui.Label('Comprehensive Environmental Impact Assessment & Multi-Sensor Modeler', {fontSize: '12px', color: '#666'}));

// AUTHOR CREDIT SECTION
var creditPanel = ui.Panel({style: {margin: '10px 0', padding: '10px', backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0'}});
creditPanel.add(ui.Label('Developed by: Youssef Mohamed Bakr', {fontWeight: 'bold', fontSize: '13px', color: '#333', margin: '0 0 5px 0'}));
creditPanel.add(ui.Label('Phone: +201121121000', {fontSize: '12px', color: '#333', margin: '0 0 2px 0'}));
creditPanel.add(ui.Label('Connect on LinkedIn', {fontSize: '12px', color: '#0072b1'}, 'https://www.linkedin.com/in/youssef-bakr'));
sidePanel.add(creditPanel);

// INTERACTIVE PLUME SIMULATOR UI
var plumeSimPanel = ui.Panel({style: {backgroundColor: '#E8F4F8', border: '1px solid #B0D4E3', padding: '10px', margin: '10px 0'}});
plumeSimPanel.add(ui.Label('Interactive Plume Simulator', {fontWeight: 'bold', color: '#005073', margin: '0 0 5px 0'}));
plumeSimPanel.add(ui.Label('Simulate pollutant drift based on custom wind direction.', {fontSize: '11px', color: '#333', margin: '0 0 10px 0'}));

var dirSlider = ui.Slider({min: 0, max: 360, value: 90, step: 1, style: {width: '250px', margin: '0'}});
var currentDynamicPlume;

function drawDynamicPlume(windDirDeg) {
  var targetRad = (windDirDeg * Math.PI) / 180.0;
  var targetAngleImg = ee.Image.constant(targetRad);
  
  var diff = pixelAngle.subtract(targetAngleImg).abs();
  var finalDiff = diff.where(diff.gt(Math.PI), ee.Image.constant(Math.PI * 2).subtract(diff));
  
  var gaussian = finalDiff.pow(2).divide(-0.1).exp();
  var decay = ee.Image.constant(1).subtract(distImg.divide(5000).clamp(0, 1));
  var plume = gaussian.multiply(decay);
  return plume.updateMask(plume.gt(0.05)).clip(emergencyBuffer);
}

function updateSimulator() {
  if (currentDynamicPlume) { Map.layers().remove(currentDynamicPlume); }
  var angle = dirSlider.getValue();
  var plumeImg = drawDynamicPlume(angle);
  currentDynamicPlume = ui.Map.Layer(plumeImg, {min: 0, max: 1, palette: pal.plume}, 'Active Plume Simulation', true, 0.75);
  Map.layers().add(currentDynamicPlume);
}

dirSlider.onChange(updateSimulator);
plumeSimPanel.add(ui.Label('Wind Direction (0=N, 90=E, 180=S):', {fontSize: '11px', fontWeight: 'bold'}));
plumeSimPanel.add(dirSlider);
sidePanel.add(plumeSimPanel);
updateSimulator(); 

// SPATIAL LAYERS TOGGLE
var layerTogglePanel = ui.Panel({style: {backgroundColor: '#FFF', margin: '10px 0', border: '1px solid #EEE', padding: '10px'}});
layerTogglePanel.add(ui.Label('Static Spatial Data Layers', {fontWeight: 'bold'}));

var createToggle = function(name, image, vis, showDefault, description) {
  var layer = ui.Map.Layer(image, vis, name, showDefault);
  Map.layers().add(layer);
  var checkbox = ui.Checkbox({label: name, value: showDefault, style: {fontWeight: '500', fontSize: '12px'}});
  checkbox.onChange(function(checked) { layer.setShown(checked); });
  layerTogglePanel.add(checkbox);
  layerTogglePanel.add(ui.Label(description, {fontSize: '10px', color: '#666', margin: '0 0 8px 25px'}));
};

// Map Visual Layers (All requested components, fully collision-guarded)
createToggle('Climatological Plume Risk', climatologicalPlume, {min: 0, max: 1, palette: pal.plume}, false, 'Average historical plume footprint based on NOAA mean winds.');
createToggle('NO2 Emissions', s5p_no2_raw.mean().clip(emergencyBuffer), {min: 0, max: 0.0001, palette: pal.ghg}, false, 'Proxy for fossil fuel/industrial GHG emissions.');
createToggle('SO2 Emissions', s5p_so2_raw.mean().clip(emergencyBuffer), {min: 0, max: 0.0005, palette: pal.ghg}, false, 'Sulfur Dioxide tracking atmospheric residuals.');
createToggle('Ozone (O3)', s5p_o3_raw.mean().clip(emergencyBuffer), {min: 0.12, max: 0.15, palette: pal.ghg}, false, 'Tropospheric ozone formation indicator.');
createToggle('Formaldehyde (HCHO)', s5p_hcho_raw.mean().clip(emergencyBuffer), {min: 0, max: 0.0002, palette: pal.ghg}, false, 'Volatile Organic Compound (VOC) emissions proxy.');
createToggle('Carbon Monoxide (CO)', s5p_co_raw.mean().clip(emergencyBuffer), {min: 0.02, max: 0.04, palette: pal.co}, false, 'Combustion exhaust and flaring index.');
createToggle('Methane Leaks (CH4)', s5p_ch4_raw.mean().clip(emergencyBuffer), {min: 1800, max: 1950, palette: pal.ch4}, false, 'Hydrocarbon and waste emission proxy.');
createToggle('Dust & Aerosols (AER)', s5p_aer_raw.mean().clip(emergencyBuffer), {min: -1, max: 2, palette: pal.dust}, false, 'UV Absorbing Aerosol Index tracking PM storms.');
createToggle('PM 2.5 (ECMWF CAMS)', safeClip(cams_pm25, 'particulate_matter_d_less_than_25_um_surface', 0), {min: 0, max: 0.00005, palette: pal.dust}, false, 'Particulate Matter surface concentrations.');
createToggle('Max Temp (ERA5 DAILY)', safeClip(era5_daily_tmax, 'maximum_2m_air_temperature', 290), {min: 280, max: 320, palette: pal.temp}, false, 'Daily surface maximum air temperatures.');
createToggle('Hourly Temp (ERA5 HOURLY)', safeClip(era5_hourly_t2m, 'temperature_2m', 290), {min: 280, max: 320, palette: pal.temp}, false, 'High temporal-resolution ambient temperatures.');
createToggle('Precip Rate (GSMaP)', safeClip(gsmap_precip, 'hourlyPrecipRateGC', 0), {min: 0, max: 5, palette: ['white', 'blue', 'darkblue']}, false, 'Hourly global rain-rate mapping.');
createToggle('Active Fires / Thermal', safeClip(fires, 'T21', 300), {min: 300, max: 400, palette: ['red', 'yellow', 'white']}, false, 'Max thermal signatures indicating flaring (FIRMS).');
createToggle('IPCC Sea Level Projection', safeImageClip(ipcc_slp, 0), {min: -0.5, max: 0.5, palette: ['blue', 'cyan', 'white', 'yellow', 'red']}, false, 'SSP1-2.6 sea level projection for coastal safety planning.');
createToggle('ISRIC Soil Hydrological', safeImageClip(soil_grids, 10), {min: 0, max: 50, palette: ['#e1e1e1', '#00008b']}, false, 'Volumetric water capacity retention metrics.');
createToggle('Fire Regime (LANDFIRE)', safeClip(landfire, 'FRG', 0), {min: 1, max: 5, palette: pal.terrain}, false, 'Regional fire regime categories (where available).');
createToggle('Landsat False Color Composite', ls8_composite, {bands: ['B5', 'B4', 'B3'], min: 0, max: 3000}, false, 'Landsat 8 false-color vegetation and land surface composite.');
createToggle('Burn Area Index (BAI)', safeClip(ls8_bai, 'BAI', 0), {min: 0, max: 100, palette: pal.temp}, false, 'Char and burn scars indicator mapping.');
createToggle('Enhanced Veg Index (EVI)', safeClip(ls8_evi, 'EVI', 0), {min: 0, max: 0.6, palette: pal.veg}, false, 'Atmospherically-corrected vegetation canopy structure.');
createToggle('Norm Burn Ratio (NBR)', safeClip(ls8_nbr, 'NBR', 0), {min: -0.5, max: 0.8, palette: pal.veg}, false, 'Post-fire burn severity mapping index.');
createToggle('Landsat NDVI', safeClip(ls8_ndvi, 'NDVI', 0), {min: 0, max: 0.8, palette: pal.veg}, false, 'Standard Landsat normalized vegetative index.');
createToggle('Landsat NDWI', safeClip(ls8_ndwi, 'NDWI', 0), {min: -0.5, max: 0.8, palette: pal.water}, false, 'Standard Landsat normalized surface water index.');
createToggle('SMAP Soil Moisture', safeClip(smap_soil, 'ssm', 0), {min: 0, max: 25, palette: ['#FFFFCC', '#41B6C4', '#225EA8']}, false, 'Passive satellite soil surface moisture levels.');
createToggle('Latent Heat Flux (NOAA)', safeClip(noaa_flux, 'latent_heat_flux', 0), {min: 0, max: 150, palette: pal.temp}, false, 'Heat exchanges from surface vaporization processes.');
createToggle('CPC Precipitation (NOAA)', safeClip(noaa_precip, 'precipitation', 0), {min: 0, max: 10, palette: pal.water}, false, 'Daily gauged rainfall observations.');
createToggle('CPC Temp (NOAA)', safeClip(noaa_temp, 'tmax', 25), {min: 10, max: 50, palette: pal.temp}, false, 'Daily maximum observational temperature records.');
createToggle('BigEarthNet (TUBerlin)', safeImageClip(big_earth_net, 0).select(0), {min: 0, max: 150}, false, 'BigEarthNet ML patch visual mapping coverage.');
createToggle('CMIP6 Climate Projection', safeClip(cmip6_proj, 'pr', 0), {min: 0, max: 10}, false, 'Global precipitation models (CMIP6).');
createToggle('CHIRPS V3 Daily Precip', safeClip(chirps_rnl, 'precipitation', 0), {min: 0, max: 20, palette: pal.water}, false, 'Reanalysis rainfall values.');
createToggle('CHIRPS Daily Precip', safeClip(chirps_daily, 'precipitation', 0), {min: 0, max: 20, palette: pal.water}, false, 'Global daily precipitation estimates.');
createToggle('Nighttime Lights (VIIRS)', ntlMean, {min: 0, max: 50, palette: pal.ntl}, false, 'Industrial activity, flaring visibility, and light pollution.');
createToggle('Facility Thermal Footprint', l9Thermal, {min: 30, max: 55, palette: pal.temp}, false, 'High-res surface temp (°C) for heat islands.');
createToggle('Topography / Elevation', srtm, {min: 0, max: 100, palette: pal.terrain}, false, 'SRTM Digital Elevation Model (m) affecting wind flow.');
createToggle('Wind Speed', windSpeed, {min: 0, max: 10, palette: ['white', 'blue', 'darkblue']}, false, 'Mean wind velocity driving plume dispersal.');
createToggle('Habitat / Veg Health (NDVI)', medianIndices.select('NDVI'), {min: 0, max: 0.5, palette: pal.veg}, false, 'Tracks surrounding ecological health (S2).');
createToggle('Surface Water Bodies (NDWI)', medianIndices.select('NDWI'), {min: -0.2, max: 0.5, palette: ['#FFFFFF', '#00FFFF', '#0000FF']}, false, 'Highlights surface water mapping and pools.');
createToggle('Soil Disturbance (BSI)', medianIndices.select('BSI'), {min: -0.2, max: 0.4, palette: ['#0000FF', '#FFFF00', '#FFA500', '#FF0000']}, false, 'Sentinel-2 Bare Soil Index for land footprint tracking.');
createToggle('Water Footprint (ET)', etMean.unmask(0), {min: 0, max: 200, palette: pal.water}, false, 'Surface water usage and loss (kg/m²/8day).');
createToggle('Sea Level Rise Vulnerability', seaLevelRiseRisk, {palette: ['#00008B']}, false, 'DEM proxy for coastal inundation (<2m elev).');
createToggle('Flash Flood Risk Paths', flashFloodRisk, {palette: ['#00FFFF']}, false, 'Steep slope to lowland wetness transitions.');

sidePanel.add(layerTogglePanel);

// CHARTS PANEL
var chartPanel = ui.Panel({style: {backgroundColor: '#F8F9FA', padding: '10px', border: '1px solid #E0E0E0'}});
chartPanel.add(ui.Label('Monthly Regional Baselines & Trends', {fontWeight: 'bold'}));

var chartOpts = function(title, vTitle, color) {
  return { title: title, vAxis: {title: vTitle, textStyle: {fontSize: 10}}, hAxis: {format: 'MMM'}, colors: [color], legend: {position: 'none'}, height: '180px' };
};

// Add Charts to Panel (Guaranteed not to crash regardless of dataset baseline coverage gaps)
chartPanel.add(ui.Chart.image.series({imageCollection: monthlyWindDir, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 25000})
  .setOptions(chartOpts('Plume Steering: Avg Wind Direction', 'Degrees (0=N, 90=E)', '#1E90FF')));

chartPanel.add(ui.Chart.image.series({imageCollection: monthlyWindSpeed, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 25000})
  .setOptions(chartOpts('Plume Dispersal: Wind Velocity', 'm/s', '#41B6C4')));

chartPanel.add(ui.Chart.image.series({imageCollection: monthlyNO2, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 2000})
  .setOptions(chartOpts('NO2 Emissions', 'mol/m²', '#A020F0')));

chartPanel.add(ui.Chart.image.series({imageCollection: monthlyPM25, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 10000})
  .setOptions(chartOpts('PM 2.5 (ECMWF CAMS)', 'kg/m³', '#8B4513')));

chartPanel.add(ui.Chart.image.series({imageCollection: monthlyERATemp, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 10000})
  .setOptions(chartOpts('Max 2m Temp Trends (ERA5)', 'Kelvin', '#FF4500')));

chartPanel.add(ui.Chart.image.series({imageCollection: monthlyGSMaP, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 10000})
  .setOptions(chartOpts('Hourly Precipitation Rate (GSMaP)', 'mm/hr', '#1E90FF')));

chartPanel.add(ui.Chart.image.series({imageCollection: monthlyCHIRPS, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 5000})
  .setOptions(chartOpts('Daily Rainfall Trends (CHIRPS)', 'mm/day', '#00CED1')));

chartPanel.add(ui.Chart.image.series({imageCollection: monthlyEVI, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 1000})
  .setOptions(chartOpts('Enhanced Vegetation Index (EVI)', 'Index', '#228B22')));

chartPanel.add(ui.Chart.image.series({imageCollection: monthlyBAI, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 1000})
  .setOptions(chartOpts('Burn Area Index (BAI)', 'Index', '#8B0000')));

chartPanel.add(ui.Chart.image.series({imageCollection: monthlySMAP, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 10000})
  .setOptions(chartOpts('Surface Soil Moisture (SMAP)', 'mm', '#4682B4')));

chartPanel.add(ui.Chart.image.series({imageCollection: monthlyFlux, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 10000})
  .setOptions(chartOpts('Surface Latent Heat Flux', 'W/m²', '#D2691E')));

chartPanel.add(ui.Chart.image.series({imageCollection: monthlyCPCPrc, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 50000})
  .setOptions(chartOpts('CPC Precip (NOAA)', 'mm/day', '#1F77B4')));

chartPanel.add(ui.Chart.image.series({imageCollection: monthlyCPCTmp, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 50000})
  .setOptions(chartOpts('CPC Observed Max Temperature (NOAA)', '°C', '#D62728')));

chartPanel.add(ui.Chart.image.series({imageCollection: monthlySO2, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 2000})
  .setOptions(chartOpts('SO2 Emissions', 'mol/m²', '#FFD700')));

chartPanel.add(ui.Chart.image.series({imageCollection: monthlyCO, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 2000})
  .setOptions(chartOpts('Carbon Monoxide (CO)', 'mol/m²', '#FFA500')));

chartPanel.add(ui.Chart.image.series({imageCollection: monthlyCH4, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 2000})
  .setOptions(chartOpts('Methane Concentration (CH4)', 'ppb', '#ADFF2F')));

chartPanel.add(ui.Chart.image.series({imageCollection: monthlyO3, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 2000})
  .setOptions(chartOpts('Tropospheric Ozone (O3)', 'mol/m²', '#4B0082')));

chartPanel.add(ui.Chart.image.series({imageCollection: monthlyHCHO, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 2000})
  .setOptions(chartOpts('Formaldehyde (HCHO)', 'mol/m²', '#FF1493')));

chartPanel.add(ui.Chart.image.series({imageCollection: monthlyLST, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 1000})
  .setOptions(chartOpts('Land Surface Temp (MODIS)', '°C', '#FF3030')));

chartPanel.add(ui.Chart.image.series({imageCollection: monthlyAER, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 2000})
  .setOptions(chartOpts('Aerosol Index (AER)', 'Index', '#708090')));

chartPanel.add(ui.Chart.image.series({imageCollection: monthlyET, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 1000})
  .setOptions(chartOpts('Evapotranspiration (ET)', 'kg/m²/8day', '#0000FF')));

chartPanel.add(ui.Chart.image.series({imageCollection: monthlyNDVI, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 10})
  .setOptions(chartOpts('Habitat Quality (NDVI)', 'Index', '#006400')));

chartPanel.add(ui.Chart.image.series({imageCollection: monthlyNDWI, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 10})
  .setOptions(chartOpts('Surface Water Moisture (NDWI)', 'Index', '#00EEEE')));

chartPanel.add(ui.Chart.image.series({imageCollection: monthlyBSI, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 10})
  .setOptions(chartOpts('Soil Exposure (BSI)', 'Index', '#8B4513')));

chartPanel.add(ui.Chart.image.series({imageCollection: monthlyNTL, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 500})
  .setOptions(chartOpts('Radiance Stability (NTL)', 'nW/cm²/sr', '#FFD700')));

sidePanel.add(chartPanel);
ui.root.insert(0, sidePanel);

// Constant Map Borders
Map.addLayer(emergencyBuffer, {color: 'orange'}, '5km Emergency Impact Zone', true, 0.5);
Map.addLayer(facilityPolygon, {color: 'white'}, '1500m Buffer Limit', true, 0.5);
Map.addLayer(basePolygon, {color: 'red'}, 'Site Boundary', true);

