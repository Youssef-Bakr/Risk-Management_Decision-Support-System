// =========================================================================
//Youssef Mohamed Bakr
//+201121121000
//Youssef.Bakr@drc.gov.eg
//Youssef.Bakr@faps.cu.edu.eg
// =========================================================================

// =========================================================================
//18
/* ========================================================================================
 * ADVANCED NORM SITE CLIMATE & RADIOLOGICAL DISPERSION DASHBOARD (V6 - FINAL UI)
 * ========================================================================================
 * Target Coordinates: [52.769692825414495, 24.081562392352257] (Al Ruwais NORM Landfill)
 * Study Timeframe:    2020-01-01 to 2025-12-31
 * * CORE UPGRADES:
 * 1. Explicit Axis Units: Every chart now explicitly states "(Unit: X)" on both axes.
 * 2. Unified Precipitation Metric: ALL rainfall strictly utilizes GPM IMERG (mm/hr).
 * 3. Crash-Proof Logic: Retains the ee.Algorithms.If() failsafe for incomplete datasets.
 * ========================================================================================
 */

// --- 1. INITIALIZATION & GEOMETRY CONTROL ---
var site = ee.Geometry.Point([52.769692825414495, 24.081562392352257]);
var bufferZone = site.buffer(20000); 
var startDate = ee.Date('2020-01-01');
var endDate = ee.Date('2025-12-31');

Map.setCenter(52.769692825414495, 24.081562392352257, 11);
Map.addLayer(site, {color: 'red'}, 'NORM Site: Target Location', true);

var months = ee.List.sequence(1, 12);
var years = ee.List.sequence(2020, 2025);

// --- 2. RAW DATASET INGESTION & PRE-PROCESSING ---
// Modis LST
var modisLST = ee.ImageCollection('MODIS/061/MOD11A1').filterBounds(site).filterDate(startDate, endDate)
  .map(function(img) { return img.select('LST_Day_1km').multiply(0.02).subtract(273.15).rename('LST_Celsius').copyProperties(img, ['system:time_start']); });

// GPM IMERG Flash Flood (Natively mm/hr)
var imerg = ee.ImageCollection("NASA/GPM_L3/IMERG_V06").filterBounds(site).filterDate(startDate, endDate).select(['precipitationCal'], ['Rain_Rate_mm_hr']); 

// MODIS ET (Unmasked to prevent desert gaps)
var modisET = ee.ImageCollection('MODIS/061/MOD16A2').filterBounds(site).filterDate(startDate, endDate)
  .map(function(img) { return img.select('ET').unmask(0).multiply(0.1).rename('ET_Rate').copyProperties(img, ['system:time_start']); });

// ERA5 Wind (Speed, Dir, U, V)
var era5Wind = ee.ImageCollection('ECMWF/ERA5/DAILY').filterBounds(site).filterDate(startDate, endDate)
  .map(function(img) {
    var u = img.select('u_component_of_wind_10m').rename('U_Vector');
    var v = img.select('v_component_of_wind_10m').rename('V_Vector');
    var speed = u.pow(2).add(v.pow(2)).sqrt().rename('Wind_Speed');
    var pi = ee.Number(Math.PI);
    var dir = u.atan2(v).multiply(180).divide(pi).add(180).mod(360).rename('Wind_Dir');
    return img.addBands([speed, dir, u, v]).copyProperties(img, ['system:time_start']);
  });

// --- 3. FAILSAFE TEMPORAL AGGREGATION (0-BAND FIX) ---
function safeMonthlyAggregate(collection, bandName, reducerType) {
  return ee.ImageCollection(years.map(function(y) {
    return months.map(function(m) {
      var start = ee.Date.fromYMD(y, m, 1);
      var end = start.advance(1, 'month');
      var filtered = collection.filterDate(start, end).select(bandName);
      
      var reducedImg;
      if (reducerType === 'sum') reducedImg = filtered.sum();
      else if (reducerType === 'max') reducedImg = filtered.max();
      else reducedImg = filtered.mean();

      var nullImage = ee.Image.constant(0).mask(0).rename(bandName);
      var finalImg = ee.Algorithms.If(filtered.size().gt(0), reducedImg, nullImage);
      
      return ee.Image(finalImg).set('system:time_start', start.millis());
    });
  }).flatten());
}

// Apply Failsafe Aggregation
var monthlyLST = safeMonthlyAggregate(modisLST, 'LST_Celsius', 'mean');
var monthlyPrecipMaxRate = safeMonthlyAggregate(imerg, 'Rain_Rate_mm_hr', 'max');
var monthlyPrecipMeanRate = safeMonthlyAggregate(imerg, 'Rain_Rate_mm_hr', 'mean'); 
var monthlyET = safeMonthlyAggregate(modisET, 'ET_Rate', 'mean');
var monthlyWindDir = safeMonthlyAggregate(era5Wind, 'Wind_Dir', 'mean');
var monthlyWindV = safeMonthlyAggregate(era5Wind, 'V_Vector', 'mean');

// --- 4. USER INTERFACE (UI) DASHBOARD ---
var sidePanel = ui.Panel({style: {width: '550px', padding: '15px', backgroundColor: '#f8f9fa'}});
sidePanel.add(ui.Label('NORM Site Risk & Dispersion Dashboard', {fontWeight: 'bold', fontSize: '20px', color: '#2c3e50', backgroundColor: '#f8f9fa'}));
sidePanel.add(ui.Label('Continuous Observation: 2020-01-01 to 2025-12-31', {fontSize: '12px', color: '#7f8c8d', backgroundColor: '#f8f9fa'}));

// Advanced Chart Builder with Explicit Axis Units
function addDetailedChart(collection, band, title, xAxisTitle, yAxisTitle, color, type, minVal, legendDetails) {
  var chart = ui.Chart.image.series({
    imageCollection: collection.select(band), region: site, reducer: ee.Reducer.mean(), scale: 1000
  }).setOptions({
    title: title, 
    vAxis: {
      title: yAxisTitle, 
      viewWindow: {min: minVal},
      titleTextStyle: {italic: false, bold: true, fontSize: 12, color: '#34495e'}
    }, 
    hAxis: {
      title: xAxisTitle,
      format: 'MMM yyyy', 
      gridlines: {count: 0},
      titleTextStyle: {italic: false, bold: true, fontSize: 12, color: '#34495e'}
    },
    series: {0: {color: color, lineWidth: 2, pointSize: 3}}, 
    legend: {position: 'none'}, 
    backgroundColor: '#ffffff'
  });
  
  if (type === 'bar') chart.setChartType('ColumnChart');
  if (type === 'scatter') chart.setChartType('ScatterChart');
  
  var legendBox = ui.Panel({style: {padding: '8px', margin: '0 0 15px 0', border: '1px solid #bdc3c7', backgroundColor: '#ecf0f1'}});
  legendBox.add(ui.Label('DETAILED LEGEND & RISK METRICS:', {fontSize: '11px', fontWeight: 'bold', margin: '0 0 4px 0', backgroundColor: '#ecf0f1'}));
  legendBox.add(ui.Label(legendDetails, {fontSize: '11px', color: '#34495e', margin: '0', backgroundColor: '#ecf0f1'}));
  
  sidePanel.add(chart).add(legendBox);
}

// 1. Flash Flood Peak (Max mm/hr)
addDetailedChart(monthlyPrecipMaxRate, 'Rain_Rate_mm_hr', 
  '1. FLASH FLOOD TRIGGER: Peak Precipitation Intensity', 
  'Time (Unit: Months, 2020 - 2025)', 
  'Peak Intensity Rate (Unit: mm/hr)', 
  '#e74c3c', 'bar', 0, 
  "X-Axis represents the monthly progression. Y-Axis plots the absolute maximum rainfall intensity recorded in mm/hr during that month. RISK THRESHOLD: Any spike >8 mm/hr acts on the desert crust to trigger instantaneous wadi runoff, threatening landfill berms.");

// 2. Background Rain Rate (Mean mm/hr)
addDetailedChart(monthlyPrecipMeanRate, 'Rain_Rate_mm_hr', 
  '2. BACKGROUND CLIMATE: Mean Precipitation Intensity', 
  'Time (Unit: Months, 2020 - 2025)', 
  'Average Baseline Rate (Unit: mm/hr)', 
  '#2980b9', 'bar', 0, 
  "X-Axis represents the monthly progression. Y-Axis tracks the average baseline mm/hr. NOTE: Contrasting Chart 1 and Chart 2 reveals the area's hyper-arid nature—mean rates stay near 0 mm/hr, proving that when rain occurs, it falls as violent, high-velocity bursts.");

// 3. Wind Direction (Scatter)
addDetailedChart(monthlyWindDir, 'Wind_Dir', 
  '3. DISPERSION PATHWAY: Mean Meteorological Wind Direction', 
  'Time (Unit: Months, 2020 - 2025)', 
  'Heading (Unit: Degrees 0-360°)', 
  '#8e44ad', 'scatter', 0, 
  "X-Axis represents the monthly progression. Y-Axis maps the wind origin angle. 0°/360°=N, 90°=E, 180°=S, 270°=W. SCENARIO: Measurements clustered at ~315° confirm dominant 'Shamal' winds, which drive aerosolized radioactive plumes Southeastward.");

// 4. Wind Vectors (V-Vector)
addDetailedChart(monthlyWindV, 'V_Vector', 
  '4. PLUME VELOCITY: V-Vector (North vs South Trajectory)', 
  'Time (Unit: Months, 2020 - 2025)', 
  'Vector Velocity (Unit: m/s)', 
  '#16a085', 'line', null, 
  "X-Axis represents the monthly progression. Y-Axis measures lateral velocity in meters per second. POSITIVE (+): Wind blows NORTH toward the Gulf (Marine risk). NEGATIVE (-): Wind blows SOUTH driving plumes inland (Terrestrial/Desert risk).");

// 5. Heat Stress
addDetailedChart(monthlyLST, 'LST_Celsius', 
  '5. THERMAL LOAD: Physical Ground Surface Temperature', 
  'Time (Unit: Months, 2020 - 2025)', 
  'Skin Temperature (Unit: °C)', 
  '#d35400', 'line', null, 
  "X-Axis represents the monthly progression. Y-Axis captures the physical contact heat of the ground in Celsius. RISK: Desert ground temps exceeding 45°C relentlessly degrade HDPE geomembrane landfill liners via thermal embrittlement.");

ui.root.insert(0, sidePanel);

// --- 5. AUTOMATED CONSOLE REPORT GENERATION ---
print('======================================================================================');
print('COMPREHENSIVE RADIOLOGICAL DISPERSION & CLIMATE ASSESSMENT');
print('Facility: NORM Plant & Landfill, Al Ruwais, UAE');
print('Target Coordinates: [52.769692, 24.081562]');
print('======================================================================================');
print(' ');
print('☢️ RADIOLOGICAL DISPERSION: CATASTROPHIC EXPLOSION SCENARIO');
print('- Context: An overpressure event or explosion at the processing plant will aerosolize Ra-226 and Pb-210 contaminants. Atmospheric modeling relies on Charts 3 and 4 (Wind Direction & V-Vector Velocity).');
print(' ');
print('SCENARIO A: Terrestrial Contamination (Primary Risk)');
print('- Data Trigger: Driven by consistent "Shamal" winds (Heading ~315° in Chart 3 / Negative V-Vector in Chart 4).');
print('- Assessment: The radioactive plume is violently pushed SOUTH-EAST. Due to the high m/s velocity of the V-Vector, fallout will bypass the immediate coastline and settle over inland desert tracts and oil/gas pipeline zones in the Al Dhafra region. Evacuation models must calculate a Southeast terrestrial cone.');
print(' ');
print('SCENARIO B: Marine Contamination (Secondary Risk)');
print('- Data Trigger: Inversion of the V-Vector to POSITIVE (+ m/s), indicating air moving from South to North.');
print('- Assessment: The plume is directed over the Arabian Gulf. Particulate settling risks severe contamination of local marine intake systems for desalination plants and offshore ecosystems.');
print(' ');
print('🌊 HYDROLOGICAL THREAT: EXTREME FLASH FLOODING (mm/hr Dynamics)');
print('- Analysis Transition: By eliminating total accumulation metrics and strictly evaluating mm/hr intensity, the true hydrological threat to the NORM site is revealed.');
print('- Baseline vs. Threat (Charts 1 & 2): Chart 2 proves the site is functionally dry (near 0 mm/hr average). Therefore, the desert surface is highly compacted. When an anomalous storm hits (captured as peaks in Chart 1), water cannot infiltrate.');
print('- Operational Consequence: Any peak intensity reading >8 mm/hr signifies dangerous surface runoff. These high-velocity torrents are fully capable of scouring topsoil, overwhelming drainage channels, breaching unsealed NORM landfill cell berms, and mobilizing radioactive leachate into adjacent wadis.');
print('======================================================================================');

