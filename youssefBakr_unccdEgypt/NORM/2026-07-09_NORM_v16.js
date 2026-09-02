// =========================================================================
//Youssef Mohamed Bakr
//+201121121000
//Youssef.Bakr@drc.gov.eg
//Youssef.Bakr@faps.cu.edu.eg
// =========================================================================

// =========================================================================
//16

/* ========================================================================================
 * ADVANCED NORM SITE CLIMATE & RADIOLOGICAL DISPERSION DASHBOARD (V4 - CRASH-PROOF)
 * ========================================================================================
 * Target Coordinates: [52.769692825414495, 24.081562392352257] (Al Ruwais NORM Landfill)
 * Study Timeframe:    2020-01-01 to 2025-12-31
 * * CORE FIXES & ADDITIONS:
 * 1. 0-Band Crash Solved: Built a failsafe aggregation function using ee.Algorithms.If() 
 * to inject masked placeholders for missing future months. Charts will no longer crash.
 * 2. Detailed Legends: Added explicit UI labels under every chart detailing axes and limits.
 * 3. Flash Floods: Separated IMERG data into Max mm/hr vs Mean mm/hr.
 * 4. Plume Trajectory: Broke down Wind into Speed, Direction, U-Vector, and V-Vector.
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

// CHIRPS Total Rain
var precipitation = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY').filterBounds(site).filterDate(startDate, endDate).select(['precipitation'], ['Rain_mm']);

// GPM IMERG Flash Flood (mm/hr)
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

// --- 3. FAILSAFE TEMPORAL AGGREGATION (THE 0-BAND FIX) ---
// This function guarantees EVERY image returned has the correct band, even if data is missing.
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

      // Failsafe: If no images exist, create a masked null image with the exact band name
      var nullImage = ee.Image.constant(0).mask(0).rename(bandName);
      var finalImg = ee.Algorithms.If(filtered.size().gt(0), reducedImg, nullImage);
      
      return ee.Image(finalImg).set('system:time_start', start.millis());
    });
  }).flatten());
}

// Apply Failsafe Aggregation
var monthlyLST = safeMonthlyAggregate(modisLST, 'LST_Celsius', 'mean');
var monthlyPrecipTotal = safeMonthlyAggregate(precipitation, 'Rain_mm', 'sum');
var monthlyPrecipMaxRate = safeMonthlyAggregate(imerg, 'Rain_Rate_mm_hr', 'max');
var monthlyPrecipMeanRate = safeMonthlyAggregate(imerg, 'Rain_Rate_mm_hr', 'mean');
var monthlyET = safeMonthlyAggregate(modisET, 'ET_Rate', 'mean');
var monthlyWindSpeed = safeMonthlyAggregate(era5Wind, 'Wind_Speed', 'mean');
var monthlyWindDir = safeMonthlyAggregate(era5Wind, 'Wind_Dir', 'mean');
var monthlyWindU = safeMonthlyAggregate(era5Wind, 'U_Vector', 'mean'); // East(+)/West(-)
var monthlyWindV = safeMonthlyAggregate(era5Wind, 'V_Vector', 'mean'); // North(+)/South(-)

// --- 4. USER INTERFACE (UI) DASHBOARD ---
var sidePanel = ui.Panel({style: {width: '500px', padding: '15px', backgroundColor: '#f8f9fa'}});
sidePanel.add(ui.Label('NORM Site Risk & Dispersion Dashboard', {fontWeight: 'bold', fontSize: '20px', color: '#2c3e50', backgroundColor: '#f8f9fa'}));
sidePanel.add(ui.Label('Detailed Analysis: Floods, Wind Dispersion & Heat | 2020-2025', {fontSize: '12px', color: '#7f8c8d', backgroundColor: '#f8f9fa'}));

// Chart Builder with Custom Detailed Legends
function addDetailedChart(collection, band, title, yAxis, color, type, minVal, legendDetails) {
  var chart = ui.Chart.image.series({
    imageCollection: collection.select(band), region: site, reducer: ee.Reducer.mean(), scale: 1000
  }).setOptions({
    title: title, vAxis: {title: yAxis, viewWindow: {min: minVal}}, hAxis: {gridlines: {count: 0}},
    series: {0: {color: color, lineWidth: 2, pointSize: 3}}, legend: {position: 'none'}, backgroundColor: '#ffffff'
  });
  if (type === 'bar') chart.setChartType('ColumnChart');
  if (type === 'scatter') chart.setChartType('ScatterChart');
  
  var legendBox = ui.Panel({style: {padding: '8px', margin: '0 0 15px 0', border: '1px solid #bdc3c7', backgroundColor: '#ecf0f1'}});
  legendBox.add(ui.Label('DETAILED LEGEND & RISK METRICS:', {fontSize: '11px', fontWeight: 'bold', margin: '0 0 4px 0', backgroundColor: '#ecf0f1'}));
  legendBox.add(ui.Label(legendDetails, {fontSize: '11px', color: '#34495e', margin: '0', backgroundColor: '#ecf0f1'}));
  
  sidePanel.add(chart).add(legendBox);
}

// 1. Flash Flood Peak
addDetailedChart(monthlyPrecipMaxRate, 'Rain_Rate_mm_hr', '1. FLASH FLOOD PEAK: Max Hourly Rate', 'mm/hr', '#e74c3c', 'bar', 0, 
  "X-Axis: Month. Y-Axis: Maximum rainfall intensity in mm/hr recorded during that month. Data: NASA GPM IMERG. RISK THRESHOLD: >8 mm/hr indicates a high-velocity wadi flood event capable of breaching landfill berms and mobilizing NORM leachate.");

// 2. Flood Accumulation
addDetailedChart(monthlyPrecipTotal, 'Rain_mm', '2. RAINFALL ACCUMULATION: Total Monthly Sum', 'Total mm', '#2980b9', 'bar', 0, 
  "X-Axis: Month. Y-Axis: Total combined rainfall (mm). Data: CHIRPS. NOTE: Compares directly with Chart 1. High accumulation over a month causes pooling, whereas high mm/hr causes destructive flash runoff.");

// 3. Wind Direction (Scatter)
addDetailedChart(monthlyWindDir, 'Wind_Dir', '3. PLUME TRAJECTORY: Mean Wind Direction', 'Degrees (0-360)', '#8e44ad', 'scatter', 0, 
  "Y-Axis: Meteorological Degrees. 0°/360°=North, 90°=East, 180°=South, 270°=West. Data: ERA5. SCENARIO: A reading of ~315° indicates a North-West Shamal wind, which will drive an explosion plume South-East inland.");

// 4. Wind Vectors (U/V)
addDetailedChart(monthlyWindV, 'V_Vector', '4. DISPERSION DYNAMICS: V-Vector (North/South)', 'Velocity (m/s)', '#16a085', 'line', null, 
  "Y-Axis: V-Vector (m/s). Positive values = Wind blowing to the NORTH (Marine Risk). Negative values = Wind blowing to the SOUTH (Inland Desert Risk). Crucial for calculating exact contamination footprints.");

// 5. Heat Stress
addDetailedChart(monthlyLST, 'LST_Celsius', '5. THERMAL STRESS: Land Surface Temp', 'Celsius (°C)', '#d35400', 'line', null, 
  "Y-Axis: Skin temperature of the ground. RISK: Sustained temperatures >45°C accelerate geomembrane liner embrittlement, increasing the risk of structural containment failure at the landfill.");

ui.root.insert(0, sidePanel);

// --- 5. AUTOMATED CONSOLE REPORT GENERATION ---
print('======================================================================================');
print('COMPREHENSIVE RADIOLOGICAL DISPERSION & CLIMATE ASSESSMENT');
print('Facility: NORM Plant & Landfill, Al Ruwais, UAE');
print('======================================================================================');
print(' ');
print('☢️ CATASTROPHIC EXPLOSION & DISPERSION SCENARIOS (Paired NORM Contaminants)');
print('- Context: An explosion at the plant will loft fine particulate matter (Ra-226, Pb-210) into the lower troposphere. Dispersion is governed strictly by the U and V wind vectors (Charts 3 & 4).');
print(' ');
print('SCENARIO A: The "Shamal" Dispersion (Primary Risk)');
print('- Triggers when Chart 4 (V-Vector) is heavily NEGATIVE (blowing South) and Wind Direction is ~315°.');
print('- Consequence: The radioactive plume is forcefully pushed SOUTH-EAST. The primary contamination footprint will cover inland desert zones and intersecting oil/gas pipeline infrastructure. Evacuation protocols must focus entirely on the Southeast terrestrial quadrant. Gulf marine assets remain largely safe.');
print(' ');
print('SCENARIO B: Sea Breeze Inversion (Secondary Risk)');
print('- Triggers when Chart 4 (V-Vector) shifts POSITIVE (blowing North), usually during seasonal transitions.');
print('- Consequence: The plume is pushed strictly NORTH over the Arabian Gulf. Airborne Ra-226 risks settling into the water column, threatening regional desalination intakes and localized marine ecology exclusion zones.');
print(' ');
print('🌊 FLASH FLOOD RISK ASSESSMENT (mm/hr Dynamics)');
print('- Analysis: By utilizing NASA IMERG data (Chart 1), we isolate the MAXIMUM hourly downpour rate. In hyper-arid regions, total accumulation (Chart 2) is often low, masking the true flood risk.');
print('- The Threat: An intensity spike >8 mm/hr acting upon dry, impermeable crust generates immediate high-velocity surface runoff. If drainage culverts are blocked by wind-blown sand, this runoff will directly impact active landfill working faces, transporting radiological leachate beyond the facility perimeter.');
print('======================================================================================');

