// =========================================================================
//Youssef Mohamed Bakr
//+201121121000
//Youssef.Bakr@drc.gov.eg
//Youssef.Bakr@faps.cu.edu.eg
// =========================================================================

// =========================================================================

var point = ee.Geometry.Point([52.77, 24.08]); 

// Load ERA5-Land Hourly dataset and select a specific date/time
var era5 = ee.ImageCollection('ECMWF/ERA5_LAND/HOURLY')
                  .filterDate('2026-05-15T12:00:00', '2026-05-15T13:00:00')
                  .first();

// Select required bands (convert K to °C)
var T_air = era5.select('temperature_2m').subtract(273.15);
var T_dew = era5.select('dewpoint_temperature_2m').subtract(273.15);

// 1. Calculate Dew Point
var dewPoint_C = T_dew; // Already in Celsius

// 2. Calculate Absolute Humidity (in g/m^3)
var abs_humidity = T_dew.expression(
  '2.1674 * ((6.112 * exp((17.67 * Td) / (243.5 + Td))) * 100) / (T_air + 273.15)', 
  {
    'Td': T_dew,
    'T_air': T_air
  }
).rename('absolute_humidity');

// Sample the values at your location
var samplePoint = abs_humidity.addBands(dewPoint_C.rename('dew_point_c'))
                              .reduceRegion({
                                reducer: ee.Reducer.first(),
                                geometry: point,
                                scale: 11132
                              });

print('Calculated Environmental Data:', samplePoint);



// =========================================================================




// 1. Load the country boundary for Egypt
/*var egypt = ee.FeatureCollection("USDOS/LSIB_SIMPLE/2017")
              .filter(ee.Filter.eq('country_na', 'Egypt'));*/

// Center the map view over Egypt
Map.centerObject(point, 12);

// 2. Load ERA5-Land Hourly data for a specific summer date
var era5 = ee.ImageCollection('ECMWF/ERA5_LAND/HOURLY')
                  .filterDate('2026-05-15T12:00:00', '2026-05-15T13:00:00')
                  .first()
                  //.clip(egypt); // Clip data strictly to Egypt's borders

// 3. Extract and convert temperatures to Celsius
var T_air = era5.select('temperature_2m').subtract(273.15);
var T_dew = era5.select('dewpoint_temperature_2m').subtract(273.15).rename('dew_point_c');

// 4. Calculate Absolute Humidity (g/m³) using Tetens formula
var abs_humidity = T_dew.expression(
  '2.1674 * ((6.112 * exp((17.67 * Td) / (243.5 + Td))) * 100) / (T_air + 273.15)', 
  {
    'Td': T_dew,
    'T_air': T_air
  }
).rename('absolute_humidity');

// 5. Define visualization palettes
var dewPointVis = {
  min: -5.0, // Low dew point (dry air over desert)
  max: 20.0, // High dew point (humid air near Nile/Mediterranean)
  palette: ['#f7fcb9', '#addd8e', '#31a354', '#006837'] // Yellow-Green to Dark Green
};

var absHumidVis = {
  min: 2.0,   // Low absolute humidity (grams of water per m³)
  max: 18.0,  // High absolute humidity
  palette: ['#f7fbff', '#9ecae1', '#4292c6', '#084594'] // Light Blue to Deep Navy Blue
};

// 6. Display layers on the Interactive Map
Map.addLayer(T_dew, dewPointVis, 'Dew Point Temperature (°C)');
Map.addLayer(abs_humidity, absHumidVis, 'Absolute Humidity (g/m³)');

// Add a dark background style to make the meteorological features pop out
Map.setOptions('SATELLITE');

// =========================================================================

// =========================================================================
// 1. COMBINE THE CALCULATED BANDS
// =========================================================================
// Stack the calculated bands together into a single multi-band image
var exportImage = T_dew.addBands(abs_humidity);

// =========================================================================
// 2. EXPORT MAPS AS GEOTIFF (.tif)
// =========================================================================
/*
Export.image.toDrive({
  image: exportImage,
  description: 'Egypt_Meteorological_Data_2026',
  folder: 'GEE_Exports', // Name of folder inside your Google Drive
  fileNamePrefix: 'egypt_dewpoint_abshumidity_2026',
  region: egypt.geometry(), // Use geometry bounds to avoid boundary errors
  scale: 11132,             // Native spatial resolution of ERA5-Land (~11km)
  maxPixels: 1e9,
  fileFormat: 'GeoTIFF'
});

// =========================================================================
// 3. EXPORT STATISTICAL DATA AS A TABLE (.csv)
// =========================================================================
// Sample pixels over Egypt as a structural table to get clean tabular data
var pixelSampleTable = exportImage.sample({
  region: egypt.geometry(),
  scale: 25000, // Slightly larger scale to stay within CSV memory limits
  numPixels: 5000, // Extracts up to 5,000 spatial data rows across Egypt
  geometries: true // Includes Latitude/Longitude coordinates for each row
});

Export.table.toDrive({
  collection: pixelSampleTable,
  description: 'Egypt_Meteorological_Table_2026',
  folder: 'GEE_Exports',
  fileNamePrefix: 'egypt_dewpoint_abshumidity_table',
  fileFormat: 'CSV'
});
*/
