// =========================================================================
// GOOGLE EARTH ENGINE (GEE) - MAGMA NORM Environmental Impact Assessment Report
// Comprehensive Multi-Sensor Environmental Analysis & Plume Simulator
// 
// Enhanced with Near Real-Time (NRT) Live Wind Velocity Physics, S1 SAR, 
// TerraClimate Drought Index, ESA WorldCover, Albedo, and Extended Analytics.
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
var facilityPolygon = basePolygon.centroid().buffer(1500); 
var emergencyBuffer = basePolygon.centroid().buffer(5000); 
var centerPt = basePolygon.centroid();
Map.centerObject(facilityPolygon, 13);

// Dynamic NRT Dates
var nrtNow = ee.Date(Date.now());
var nrt48h = nrtNow.advance(-48, 'hour'); 
var wind12h = nrtNow.advance(-12, 'hour');

var recentStart = '2024-01-01';
var recentEnd = '2025-01-01';
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
  var ndwi = img.normalizedDifference(['B3', 'B8']).rename('NDWI'); 
  return img.addBands([bsi, ndmi, ndvi, ndwi]);
});
var medianIndices = s2Indices.median().clip(emergencyBuffer);

var s2_2023 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).map(maskS2clouds).map(function(img) {
  var bsi = img.expression('((swir1 + red) - (nir + blue)) / ((swir1 + red) + (nir + blue))', {'swir1': img.select('B11'), 'red': img.select('B4'), 'nir': img.select('B8'), 'blue': img.select('B2')}).rename('BSI');
  var ndvi = img.normalizedDifference(['B8', 'B4']).rename('NDVI'); 
  var ndwi = img.normalizedDifference(['B3', 'B8']).rename('NDWI'); 
  return img.addBands([bsi, ndvi, ndwi]);
});

// B. Thermal Footprint & Topography
var l9Thermal = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2').filterBounds(facilityPolygon).filterDate(recentStart, recentEnd).median()
  .select('ST_B10').multiply(0.00341802).add(149.0).subtract(273.15).clip(emergencyBuffer); 
var srtm = ee.Image('USGS/SRTMGL1_003').clip(emergencyBuffer);
var seaLevelRiseRisk = srtm.lte(2).selfMask(); 
var slope = ee.Terrain.slope(srtm);
var flashFloodRisk = slope.gte(5).and(srtm.lte(50)).selfMask(); 

// C. Atmosphere - HISTORICAL OFFL
var s5p_no2_raw = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_NO2").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('tropospheric_NO2_column_number_density');
var s5p_aer_raw = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_AER_AI").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('absorbing_aerosol_index');
var s5p_so2_raw = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_SO2").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('SO2_column_number_density'); 
var s5p_co_raw = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_CO").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('CO_column_number_density'); 
var s5p_ch4_raw = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_CH4").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('CH4_column_volume_mixing_ratio_dry_air'); 
var s5p_o3_raw = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_O3").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('O3_column_number_density'); 
var s5p_hcho_raw = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_HCHO").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('tropospheric_HCHO_column_number_density'); 

// D. Atmosphere - NEAR REAL-TIME NRTI
var nrt_no2 = ee.ImageCollection("COPERNICUS/S5P/NRTI/L3_NO2").filterBounds(emergencyBuffer).filterDate(nrt48h, nrtNow).select('tropospheric_NO2_column_number_density');
var nrt_so2 = ee.ImageCollection("COPERNICUS/S5P/NRTI/L3_SO2").filterBounds(emergencyBuffer).filterDate(nrt48h, nrtNow).select('SO2_column_number_density');
var nrt_co  = ee.ImageCollection("COPERNICUS/S5P/NRTI/L3_CO").filterBounds(emergencyBuffer).filterDate(nrt48h, nrtNow).select('CO_column_number_density');
var nrt_aer = ee.ImageCollection("COPERNICUS/S5P/NRTI/L3_AER_AI").filterBounds(emergencyBuffer).filterDate(nrt48h, nrtNow).select('absorbing_aerosol_index');

// E. Historical Wind Dynamics
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

// F. LIVE NRT WIND DYNAMICS
var liveWindCol = ee.ImageCollection('NOAA/GFS025').filterDate(wind12h, nrtNow).select(['u_component_of_wind_10m_above_ground', 'v_component_of_wind_10m_above_ground']);
var liveWindImg = ee.Image(ee.Algorithms.If(liveWindCol.size().gt(0), liveWindCol.limit(1, 'system:time_start', false).first(), ee.Image.constant(0).rename(['u_component_of_wind_10m_above_ground', 'v_component_of_wind_10m_above_ground'])));
var liveU = liveWindImg.select(0);
var liveV = liveWindImg.select(1);
var liveWindDir = liveU.atan2(liveV).multiply(180 / Math.PI).add(180).rename('Live_Direction');
var liveWindSpeed = liveU.pow(2).add(liveV.pow(2)).sqrt().rename('Live_Speed'); 

// G. SCIENTIFIC DATASETS (Baseline)
var viirs_ntl_raw = ee.ImageCollection("NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('avg_rad');
var ntlMean = viirs_ntl_raw.mean().clip(emergencyBuffer);
var modisET_raw = ee.ImageCollection("MODIS/061/MOD16A2").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('ET');
var etMean = modisET_raw.mean().clip(emergencyBuffer);
var modisLST_raw = ee.ImageCollection("MODIS/061/MOD11A2").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd)
  .map(function(img) { return img.select('LST_Day_1km').multiply(0.02).subtract(273.15).rename('LST_Celsius').copyProperties(img, ['system:time_start']); });
var fires = ee.ImageCollection("FIRMS").filterBounds(emergencyBuffer).filterDate(recentStart, recentEnd).select('T21').max().clip(emergencyBuffer);
var cams_pm25 = ee.ImageCollection('ECMWF/CAMS/NRT').filterDate(baselineStart, baselineEnd).select('particulate_matter_d_less_than_25_um_surface');
var era5_daily_tmax = ee.ImageCollection('ECMWF/ERA5/DAILY').filterDate(baselineStart, baselineEnd).select('maximum_2m_air_temperature');
var era5_hourly_t2m = ee.ImageCollection('ECMWF/ERA5/HOURLY').filterDate(baselineStart, baselineEnd).select('temperature_2m');
var gsmap_precip = ee.ImageCollection('JAXA/GPM_L3/GSMaP/v6/reanalysis').filterDate(baselineStart, baselineEnd).select('hourlyPrecipRateGC');

// **NEW DATASETS**
var worldcover = ee.ImageCollection("ESA/WorldCover/v200").first().clip(emergencyBuffer);
var modis_albedo = ee.ImageCollection("MODIS/061/MCD43A3").filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('Albedo_WSA_shortwave');
var s1_sar = ee.ImageCollection('COPERNICUS/S1_GRD').filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('VV');
var s1_mean = s1_sar.mean().clip(emergencyBuffer);
var terra_climate = ee.ImageCollection('IDAHO_EPSCOR/TERRACLIMATE').filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('pdsi');

var ipcc_slp = ee.Image('IPCC/AR6/SLP/ssp126_2030').select(0);
var soil_grids = ee.Image('ISRIC/SoilGrids250m/v2_0/wv0010').select(0);
var landfire = ee.ImageCollection('LANDFIRE/Fire/FRG/v1_2_0').mosaic();
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
var big_earth_net = ee.ImageCollection('TUBerlin/BigEarthNet/v1').mosaic();
var cmip6_proj = ee.ImageCollection('UCSB/CHC/CMIP6/v1').filterDate(baselineStart, baselineEnd).select(0);
var chirps_rnl = ee.ImageCollection('UCSB-CHC/CHIRPS/V3/DAILY_RNL').filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('precipitation');
var chirps_daily = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY').filterBounds(emergencyBuffer).filterDate(baselineStart, baselineEnd).select('precipitation');

// H. SAFE SPATIAL CHECK
var safeClip = function(imageCollection, bandName, defaultVal) {
  var col = ee.ImageCollection(imageCollection);
  var size = col.size();
  var dummy = ee.Image.constant(defaultVal || 0).rename(bandName || 'empty_band');
  var real = col.mean().select(bandName || 0);
  var output = ee.Image(ee.Algorithms.If(size.gt(0), real, dummy));
  return output.clip(emergencyBuffer);
};
var safeImageClip = function(image, defaultVal) {
  var dummy = ee.Image.constant(defaultVal || 0);
  var output = ee.Image(ee.Algorithms.If(ee.Algorithms.IsEqual(image, null), dummy, image));
  return output.clip(emergencyBuffer);
};

// 3. CLIMATOLOGICAL PLUME DISPERSION MODEL
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

// 4. CHART AGGREGATION SYSTEM
function createSafeMonthly(collection, bandName, year, fallbackValue) {
  var months = ee.List.sequence(1, 12);
  return ee.ImageCollection.fromImages(months.map(function(m) {
    var start = ee.Date.fromYMD(year, m, 1);
    var end = start.advance(1, 'month');
    var col = collection.filterDate(start, end).select([bandName]);
    var count = col.size();
    var meanImg = col.mean();
    var fallbackImg = ee.Image.constant(fallbackValue).rename(bandName);
    var img = ee.Image(ee.Algorithms.If(count.gt(0), meanImg, fallbackImg));
    return img.unmask(fallbackValue).set('system:time_start', start.millis());
  }));
}

var monthlyWindDir  = createSafeMonthly(noaa_wind, 'Wind_Direction', baselineYear, 0); 
var monthlyWindSpeed= createSafeMonthly(noaa_wind, 'Wind_Speed', baselineYear, 0);
var monthlyNO2      = createSafeMonthly(s5p_no2_raw, 'tropospheric_NO2_column_number_density', baselineYear, 0);
var monthlySO2      = createSafeMonthly(s5p_so2_raw, 'SO2_column_number_density', baselineYear, 0); 
var monthlyCO       = createSafeMonthly(s5p_co_raw, 'CO_column_number_density', baselineYear, 0);
var monthlyCH4      = createSafeMonthly(s5p_ch4_raw, 'CH4_column_volume_mixing_ratio_dry_air', baselineYear, 1800); 
var monthlyLST      = createSafeMonthly(modisLST_raw, 'LST_Celsius', baselineYear, 35); 
var monthlyPM25     = createSafeMonthly(cams_pm25, 'particulate_matter_d_less_than_25_um_surface', baselineYear, 0);
var monthlyERATemp  = createSafeMonthly(era5_daily_tmax, 'maximum_2m_air_temperature', baselineYear, 298);
var monthlyGSMaP    = createSafeMonthly(gsmap_precip, 'hourlyPrecipRateGC', baselineYear, 0);
var monthlyBAI      = createSafeMonthly(ls8_bai, 'BAI', baselineYear, 0);
var monthlyEVI      = createSafeMonthly(ls8_evi, 'EVI', baselineYear, 0);
var monthlySMAP     = createSafeMonthly(smap_soil, 'ssm', baselineYear, 0);
var monthlyFlux     = createSafeMonthly(noaa_flux, 'latent_heat_flux', baselineYear, 0);
var monthlyCHIRPS   = createSafeMonthly(chirps_daily, 'precipitation', baselineYear, 0);
var monthlyS1       = createSafeMonthly(s1_sar, 'VV', baselineYear, -15);
var monthlyPDSI     = createSafeMonthly(terra_climate, 'pdsi', baselineYear, 0);

// 5. VISUALIZATION PARAMETERS
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
  ntl: ['black', 'blue', 'purple', 'yellow', 'white'],
  sar: ['black', 'darkgray', 'lightgray', 'white']
};

// 6. USER INTERFACE 
var sidePanel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical', true), 
  style: {width: '480px', padding: '15px', backgroundColor: '#FFFFFF'}
});

sidePanel.add(ui.Label('MAGMA NORM EIAR', {fontWeight: 'bold', fontSize: '20px'}));
sidePanel.add(ui.Label('Comprehensive Environmental Impact Assessment & Multi-Sensor Modeler', {fontSize: '12px', color: '#666'}));

var creditPanel = ui.Panel({style: {margin: '10px 0', padding: '10px', backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0'}});
creditPanel.add(ui.Label('Developed by: Youssef Mohamed Bakr', {fontWeight: 'bold', fontSize: '13px', color: '#333', margin: '0 0 5px 0'}));
sidePanel.add(creditPanel);

// INTERACTIVE NRT PLUME SIMULATOR UI
var plumeSimPanel = ui.Panel({style: {backgroundColor: '#E8F4F8', border: '1px solid #B0D4E3', padding: '10px', margin: '10px 0'}});
plumeSimPanel.add(ui.Label('NRT Dynamic Plume Simulator', {fontWeight: 'bold', color: '#005073', margin: '0 0 5px 0'}));
var liveStatusLabel = ui.Label('Fetching Real-Time Wind Vectors...', {fontSize: '11px', color: '#B22222', fontWeight: 'bold'});
plumeSimPanel.add(liveStatusLabel);
var dirSlider = ui.Slider({min: 0, max: 360, value: 90, step: 1, style: {width: '250px', margin: '0'}});
var currentDynamicPlume;

function drawDynamicPlume(windDirDeg) {
  var targetRad = (windDirDeg * Math.PI) / 180.0;
  var targetAngleImg = ee.Image.constant(targetRad);
  var diff = pixelAngle.subtract(targetAngleImg).abs();
  var finalDiff = diff.where(diff.gt(Math.PI), ee.Image.constant(Math.PI * 2).subtract(diff));
  var gaussian = finalDiff.pow(2).divide(-0.1).exp();
  var dynamicDistanceFactor = ee.Image.constant(3000).add(liveWindSpeed.multiply(600)); 
  var decay = ee.Image.constant(1).subtract(distImg.divide(dynamicDistanceFactor).clamp(0, 1));
  var plume = gaussian.multiply(decay);
  return plume.updateMask(plume.gt(0.05)).clip(emergencyBuffer);
}

function updateSimulator() {
  if (currentDynamicPlume) { Map.layers().remove(currentDynamicPlume); }
  var angle = dirSlider.getValue();
  var plumeImg = drawDynamicPlume(angle);
  currentDynamicPlume = ui.Map.Layer(plumeImg, {min: 0, max: 1, palette: pal.plume}, 'Active NRT Plume Simulation', true, 0.75);
  Map.layers().add(currentDynamicPlume);
}

dirSlider.onChange(updateSimulator);
plumeSimPanel.add(ui.Label('Wind Direction Override (0=N, 90=E, 180=S):', {fontSize: '11px', fontWeight: 'bold'}));
plumeSimPanel.add(dirSlider);
sidePanel.add(plumeSimPanel);
updateSimulator(); 

liveWindDir.addBands(liveWindSpeed).reduceRegion({reducer: ee.Reducer.mean(), geometry: centerPt, scale: 5000}).evaluate(function(result) {
  var dirKey = Object.keys(result)[0];
  var spdKey = Object.keys(result)[1];
  if (result[dirKey] !== undefined && result[dirKey] !== null) {
    var roundedDir = Math.round(result[dirKey]);
    var roundedSpd = (result[spdKey]).toFixed(1);
    dirSlider.setValue(roundedDir);
    liveStatusLabel.setValue('✅ Live Lock: Dir ' + roundedDir + '° | Spd ' + roundedSpd + ' m/s');
    liveStatusLabel.style().set('color', '#007328');
  } else {
    liveStatusLabel.setValue('⚠️ GFS Data delayed. Manual mode active.');
  }
});

// SPATIAL LAYERS TOGGLE
var layerTogglePanel = ui.Panel({style: {backgroundColor: '#FFF', margin: '10px 0', border: '1px solid #EEE', padding: '10px'}});
layerTogglePanel.add(ui.Label('Static & NRT Spatial Data Layers', {fontWeight: 'bold'}));

var createToggle = function(name, image, vis, showDefault, description) {
  var layer = ui.Map.Layer(image, vis, name, showDefault);
  Map.layers().add(layer);
  var checkbox = ui.Checkbox({label: name, value: showDefault, style: {fontWeight: '500', fontSize: '12px'}});
  checkbox.onChange(function(checked) { layer.setShown(checked); });
  layerTogglePanel.add(checkbox);
  layerTogglePanel.add(ui.Label(description, {fontSize: '10px', color: '#666', margin: '0 0 8px 25px'}));
};

// **MAP LAYERS ADDED HERE**
createToggle('ESA WorldCover (10m)', worldcover, {}, false, 'Global baseline land cover classification.');
createToggle('MODIS Broadband Albedo', safeClip(modis_albedo, 'Albedo_WSA_shortwave', 0), {min: 0, max: 1000, palette: ['black', 'blue', 'green', 'yellow', 'white']}, false, 'Surface reflectivity index.');
createToggle('Sentinel-1 SAR Base', s1_mean, {min: -25, max: 0, palette: pal.sar}, false, 'C-Band radar structural/terrain backscatter.');
createToggle('TerraClimate Drought (PDSI)', safeImageClip(terra_climate, 0), {min: -4, max: 4, palette: ['red', 'yellow', 'white', 'blue', 'darkblue']}, false, 'Palmer Drought Severity Index.');
createToggle('Climatological Plume Risk', climatologicalPlume, {min: 0, max: 1, palette: pal.plume}, false, 'Average historical plume footprint.');
createToggle('NO2 Emissions (NRT - 48hr)', nrt_no2.mean().clip(emergencyBuffer), {min: 0, max: 0.0001, palette: pal.ghg}, false, 'Fossil fuel emission proxy.');
createToggle('SO2 Emissions (NRT - 48hr)', nrt_so2.mean().clip(emergencyBuffer), {min: 0, max: 0.0005, palette: pal.ghg}, false, 'Sulfur Dioxide tracking.');
createToggle('Carbon Monoxide (NRT)', nrt_co.mean().clip(emergencyBuffer), {min: 0.02, max: 0.04, palette: pal.co}, false, 'Combustion exhaust index.');
createToggle('Facility Thermal Footprint', l9Thermal, {min: 30, max: 55, palette: pal.temp}, false, 'High-res surface temp (°C).');
createToggle('Landsat CIR Composite', ls8_composite, {bands: ['B5', 'B4', 'B3'], min: 0, max: 3000}, false, 'False-color vegetation composite.');
createToggle('SMAP Soil Moisture', safeClip(smap_soil, 'ssm', 0), {min: 0, max: 25, palette: ['#FFFFCC', '#41B6C4', '#225EA8']}, false, 'Passive satellite soil moisture.');

sidePanel.add(layerTogglePanel);

// **FIXED CHARTS PANEL**
var chartPanel = ui.Panel({style: {backgroundColor: '#F8F9FA', padding: '10px', border: '1px solid #E0E0E0'}});
chartPanel.add(ui.Label('Monthly Regional Baselines & Trends', {fontWeight: 'bold'}));

var chartOpts = function(title, vTitle, color) {
  return { title: title, vAxis: {title: vTitle, textStyle: {fontSize: 10}}, hAxis: {format: 'MMM'}, colors: [color], legend: {position: 'none'}, height: '180px' };
};

chartPanel.add(ui.Chart.image.series({imageCollection: monthlyNO2, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 2000}).setOptions(chartOpts('NO2 Emissions', 'mol/m²', '#A020F0')));
chartPanel.add(ui.Chart.image.series({imageCollection: monthlySO2, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 2000}).setOptions(chartOpts('SO2 Emissions', 'mol/m²', '#FF4500')));
chartPanel.add(ui.Chart.image.series({imageCollection: monthlyCO, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 2000}).setOptions(chartOpts('Carbon Monoxide (CO)', 'mol/m²', '#4B0082')));
chartPanel.add(ui.Chart.image.series({imageCollection: monthlyCH4, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 2000}).setOptions(chartOpts('Methane (CH4)', 'ppb', '#DAA520')));
chartPanel.add(ui.Chart.image.series({imageCollection: monthlyLST, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 1000}).setOptions(chartOpts('Land Surface Temp (MODIS)', 'Celsius', '#B22222')));
chartPanel.add(ui.Chart.image.series({imageCollection: monthlyPM25, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 10000}).setOptions(chartOpts('PM 2.5 (CAMS)', 'kg/m³', '#8B4513')));
chartPanel.add(ui.Chart.image.series({imageCollection: monthlyCHIRPS, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 5000}).setOptions(chartOpts('Daily Rainfall (CHIRPS)', 'mm/day', '#00CED1')));
chartPanel.add(ui.Chart.image.series({imageCollection: monthlyEVI, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 1000}).setOptions(chartOpts('Vegetation Index (EVI)', 'Index', '#228B22')));
chartPanel.add(ui.Chart.image.series({imageCollection: monthlyBAI, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 1000}).setOptions(chartOpts('Burn Area Index (BAI)', 'Index', '#DC143C')));
chartPanel.add(ui.Chart.image.series({imageCollection: monthlySMAP, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 9000}).setOptions(chartOpts('Soil Moisture (SMAP)', 'mm', '#4682B4')));
chartPanel.add(ui.Chart.image.series({imageCollection: monthlyFlux, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 10000}).setOptions(chartOpts('Latent Heat Flux', 'W/m²', '#FF8C00')));
chartPanel.add(ui.Chart.image.series({imageCollection: monthlyPDSI, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 5000}).setOptions(chartOpts('Drought Index (PDSI)', 'Index', '#808000')));
chartPanel.add(ui.Chart.image.series({imageCollection: monthlyS1, region: emergencyBuffer, reducer: ee.Reducer.mean(), scale: 100}).setOptions(chartOpts('Structural Backscatter (S1 SAR)', 'dB', '#708090')));

// **CRITICAL FIX: Actually add the chart panel and root panel**
sidePanel.add(chartPanel);
ui.root.insert(0, sidePanel);
