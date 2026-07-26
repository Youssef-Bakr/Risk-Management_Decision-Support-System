

//Imports: Food and Agriculture Organization (FAO; United Nations) Global Administrative Unit Layers (GAUL) collection 
/*
=====================================================================================================================================
ARSET Training: Assessing Extreme Weather Statistics using NASA Earth eXchange Global Daily Downscaled Projections (NEX-GDDP-CMIP6)
Dates: September 10 – 17, 2025
Training Page: https://www.earthdata.nasa.gov/learn/trainings/assessing-extreme-weather-statistics-using-nasa-earth-exchange-global-daily
Demonstration: Access NEX-GDDP-CMIP6 data and examine long-term changes in surface air temperatures and precipitation
Parameters used: near-surface air temperature and precipitation for a region of interest
Authors: Amita Mehta & Sean McCartney
--------------------------------------------------
Script: GDDP_Part-1-Exercise_Annual_Tmp&PR
--------------------------------------------------
This code is free and open. 
By using this code you agree to cite the following reference in any publications derived from them:
NASA Applied Remote Sensing Training (ARSET) program
=======================================================================================================
                                               DISCLAIMER
Every effort is made to ensure the code is free of errors but there is no warranty for the maps 
and their features are either spatially or temporally accurate or fit for a particular use. 
This code is provided without any warranty of any kind whatsoever, either express or implied.
=======================================================================================================   
 
Note:
 - This code provides hands-on exercise in selecting NEX-GDDP data for a state or country of interest.
 - GEE image collection for NEX-GDDP-CMIP6 (Coupled Model Intercomparison Project Phase 6): 
 - ee.ImageCollection('NASA/GDDP-CMIP6')
 - The data include outputs from various CMIP6 models. For each model several parameters are available
 - The list of models and parameters are provided in Google Earth Engine (GEE) data description, 'Bands' and 'Image Properties'
 - The model outputs are available for two of the four "Tier 1" greenhouse gas emissions scenarios known as Shared Socioeconomic Pathways (SSP): SSP245 & SSP585 
 - SSP245: is the 'middle pathway' of future greenhouse emission'projecting radiative forcing of 4.5 Watts/m2 by 2100.
 - SSP585: with an additional radiative forcing of 8.5 W/m² by the year 2100, this scenario represents the upper boundary of the range of scenarios.
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ 
  This exercise focuses on the following steps:
                      -	Select a model from GDDP model ensemble 
                      -	Select SSP scenario 
                      -	Select parameter(s): Temperature and precipitation 
                      -	Collect daily data for 2020, 2050, 2100 
                      -	Clip the global data to the area of interest (AOI) defined as variable AOI
                      -	Find annual mean of near-surface Temperature and precipitation for 2020, 2050, 2100 for the AOI
                      -	Map the parameters and also differences between 2020 and 2050, 2020 and 2100.
                      -	Examine annual trends of near-surface temperature 
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ 

Note: 
Imports (i.e., feature collections) at the top of the script include the Food and Agriculture Organization (FAO; United Nations) Global Administrative Unit Layers (GAUL) collection 
FAO/GAUL will be used to select the country or an area of interest within the country
A variable "country" is defined for FAO/GAUL for a country-level feature (level0) AND
"subreg" is defined that resolves features of states within countries (level1)

=======================================================================================================

Definitions of Variables:

 AOI: Specify a feature (e.g., country or state) from the GAUL collection 
 myaoi: Area of interest (a region within the country from GAUL)
 dataset: Image collection (IC) of global GDDP data for a selected Global Climate Model and a climate projection scenario (daily data from January 2020 to December 2021)
 AirT: IC of global near-surface temperature from GDDP models (model variable name 'tas' in Kelvin) 
 AirT_reg: IC of AirT clipped to 'myaoi'
 Tyy: IC of AirT_Reg (raster maps) for a particular year for 'myaoi'
 Tyyyy: AirT_reg averaged for myaoi (a mean map for year yyyy (yyyy = 2020, 2050, and 2100)
 Tdif_2050m2020: Difference between annual mean surface temperatures from 2050 and 2020
 Tdif_2021m2020: Difference between annual mean surface temperatures from 2100 and 2020
 
 PR: IC of global precipitation from GDDP models (model variable name 'pr' in Kg/m2/s)
 PR_reg: IC of PR clipped to 'myaoi'
 PRyy: IC of PR_reg for a particular year for 'myaoi' 
 s2yy: Precipitation unit conversion factor from Kg/m2/s to mm/day
 PRyyyy: PR_reg averaged for 'myaoi' (a mean map for year yyyy [yyyy= 2020, 2050, and 2100])
 PRdif_2050m2020 : Difference between annual mean precipitation from 2050 and 2020
 PRdif_2021m2020 : Difference between annual mean precipitation from 2100 and 2020
 
 ylst: List of number of years (2020 to 2100 = 81 years)
 listdates: List of years starting from 2020 (list will record year as 2020-01-01, 2021-01-01, ----> 2101-01-01)
 Tannual: IC of annual average AirT  
 Pannual: IC of annual average PR
 PRannual: IC of scaled precipitation from mm/sec to mm/day 
 TimeSeries: Annual mean, area-averaged (over 'myaoi') temperatures for 81 years
 PRTimeseries: Annual mean, area-averaged (over 'myaoi') precipitation for 81 years
*/

//=========================================================================================================
//                                        START GDDP ANALYSIS
//
// myaoi: Nebraska, United States of America (USA)
//=========================================================================================================

//++++++++++++++++++++++++++++++++++++++++++++++++++++
// Assign the country/area of interest as myaoi
//++++++++++++++++++++++++++++++++++++++++++++++++++++

// Define a variable "AOI" that holds the GAUL Level 1 FeatureCollection
var AOI = ee.FeatureCollection('FAO/GAUL/2015/level1');   
// Define a variable "myaoi" to select the area of interest (e.g., Nebraska, USA)
var myaoi = AOI
  .filter(ee.Filter.eq('ADM0_NAME', 'United States of America'))
  .filter(ee.Filter.eq('ADM1_NAME', 'Nebraska'));
// Center the map on myaoi
 Map.centerObject(myaoi, 6);
// Add the selected geography as a layer to the map window below, specifying the symbology and name
 Map.addLayer(myaoi, {color: 'blue'}, 'myaoi');

/*
=============================================================================================================================================
*****************************************    Alternatively   *******************************************
Upload your own area of interest (AOI) by uploading its shapefile via the 'Assets' tab in the upper left corner. Select 'NEW' => 'Shape files'
and upload the four relevant files of your shapefile (.dbf, .prj, .shp, .shx). Once uploaded, refresh the assets and import your shapefile from 
the asset tab into this script by clicking the arrow symbol. Define a new variable for the imported asset to 'AOI' (Area of Interest).
=============================================================================================================================================
*/

// Define variable "dataset" to hold the image collection of daily "GDDP-CMIP6" data for each year 
var dataset = ee.ImageCollection('NASA/GDDP-CMIP6')
                  .filter(ee.Filter.date('2020-01-01', '2101-01-01')) // filter dates from 2020-01-01 to 2101-01-01
                  .filter(ee.Filter.eq('model', 'GISS-E2-1-G')) // select the model "GISS-E2-1-G" (to select another model refer to 'Image Properties' in the NEX-GDDP data information)
                  .filter(ee.Filter.eq('scenario','ssp245')); // select the scenario "SSP245" for this exercise

// Use print statements for the first 90 elements in this image collection to the console tab on the right
 print('dataset');
 print(dataset.limit(90)); 

//=======================================================================================================
//                             Surface Temperature Maps for 2020, 2050, 2100
//=======================================================================================================

// Define a variable "AirT" to select the parameter 'tas' for daily near-surface temperature (Kelvin) from the image collection
 var AirT = dataset.select('tas'); 
// Define a variable "AirT_reg" to clip the global image collection to the area of interest defined above
 var AirT_reg = AirT.map(function(img){return img.clip(myaoi)});
// Define a variable "constant" to convert temperatures from Kelvin to Celsius by subtracting 273.15
 var constant = 273.15;   
// Subtract the constant from each image so all images are in Celsius
AirT_reg = AirT_reg.map(function(image) {
  return image.subtract(constant)
              .copyProperties(image, image.propertyNames());
});

// Print statements for the first 90 elements in the image collection for daily near-surface temperature
 print('AirT_reg');
 print(AirT_reg.limit(90));   

// Calculate annual mean image from daily data
// Check annual mean temperature for 2020, 2050, 2100

 var year = 2020;                                 // define a variable "year" and assign it the date "2020"
 var startDate = ee.Date.fromYMD(year, 1, 1);     // define a variable "startDate" to be day 1 of 2020
 var endDate = startDate.advance(1, 'year');      // define a variable "endDate" for the last day of 2020
 var Tyy = AirT_reg                               // Tyy collects daily images for 2020 from the beginning to end of year
     .filter(ee.Filter.date(startDate, endDate));
 var T2020 = Tyy.reduce(ee.Reducer.mean());        // define a variable "T2020" and calculate the mean annual temperature for 2020

// The following print statements check dates, image collection, and mean, and prints them to the Console tab
 print(startDate);
 print(endDate);
 print('Tyy');
 print(Tyy);
 print('Tavg');
 print(T2020);
 print(' tas 2020-------------');

// Find annual mean temperature for 2050 -- same steps as in lines 133-138 only year is set to 2050 instead of 2020

 var year = 2050;                                 // define a variable "year" and assign it the date "2050"
 var startDate = ee.Date.fromYMD(year, 1, 1);     // define a variable "startDate" to be day 1 of 2050
 var endDate = startDate.advance(1, 'year');      // define a variable "endDate" for the last day of 2050
 var Tyy = AirT_reg                               // Tyy collects daily images for 2050 from the beginning to end of year
  .filter(ee.Filter.date(startDate, endDate));
 var T2050 = Tyy.reduce(ee.Reducer.mean());       // define a variable "T2050" and calculate the mean annual temperature for 2050

// The following print statements check dates, image collection, and mean, and print them to the Console tab
 print('Tyy');
 print(Tyy);
 print('Tavg');
 print(T2050);
 print(' tas 2050-------------');

// Find annual mean temperature for 2100 -- same steps as in lines 133-138, only year is set to 2100 instead of 2020

 var year = 2100;                                 // define a variable "year" and assign it the date "2100"
 var startDate = ee.Date.fromYMD(year, 1, 1);     // define a variable "startDate" to be day 1 of 2100
 var endDate = startDate.advance(1, 'year');      // define a variable "endDate" for the last day of 2100
 var Tyy = AirT_reg                               // Tyy collects daily images for 2100 from the beginning to end of year
  .filter(ee.Filter.date(startDate, endDate));
 var T2100 = Tyy.reduce(ee.Reducer.mean());       // define a variable "T2100" and calculate the mean annual temperature for 2100

// The following print statements check dates, image collection, and mean, and print them to the Console tab
 print('Tyy');
 print(Tyy);
 print('Tavg');
 print(T2100);
 print(' tas 2100-------------');

//=======================================================================================================
//                             Surface Temperature differences (30-year and 80-year from 2020)
//=======================================================================================================

// Calculate temperature differences between T2050 & T2020 and between T2100 & T2020

 var Tdif_2050m2020 = T2050.subtract(T2020); // Define variable Tdif_2050m2020 to hold the temperature difference map      
 var Tdif_2100m2020 = T2100.subtract(T2020); // Define variable Tdif_2100m2020 to hold the temperature difference map 

// Define visualization parameters for annual mean temperatures
var AirTemperatureVis = { 
  min: 5,
  max: 15,
  palette: ['blue', 'purple', 'cyan', 'green', 'yellow', 'red'],
};

// Define visualization parameters for annual mean temperatures differences
var AirTdifVis = {
  min: -0.5,
  max: 4.0,
  palette: ['blue', 'purple', 'cyan', 'green', 'yellow', 'red'],
};

// Add map layers of annual mean Temperature (T2020, T2050, T2100) and differences (Tdif_2050m2020 and Tdif_2100m2020) to the map window
Map.addLayer(
   T2020, AirTemperatureVis,
    'Air Temperature (C) - 2020');

 Map.addLayer(
   T2050, AirTemperatureVis,
    'Air Temperature (C) - 2050');

Map.addLayer(
  T2100, AirTemperatureVis,
    'Air Temperature (C) - 2100');

Map.addLayer(
  Tdif_2050m2020, AirTdifVis,
    'Tdif 2050-2020 (C)');
//
Map.addLayer(
  Tdif_2100m2020, AirTdifVis,
    'Tdif 2100-2020 (C)');

//=======================================================================================================
//                             Precipitation Maps for 2020, 2050, 2100
//=======================================================================================================

// Repeat the above analysis for precipitation
// Start with the image collection 'dataset' for daily data for GISS model and scenario SSP245, years 2020 to 2021 

// Select parameter: 'pr' for daily precipitation rate
// Note: the 'pr' units are kg/m2/s which is equivalent to mm/s per m2

// Define a variable "PR" and use variable "dataset" defined above to select daily precipitation 
 var PR = dataset.select('pr'); 

// Define a variable "PR_reg" and clip the global dataset to myaoi variable defined above (i.e., Nebraska, USA)
 var PR_reg = PR.map(function(img){return img.clip(myaoi)});
 
// Print statements for the first 90 elements in the image collection for daily precipitation
 print('PR_reg');
 print(PR_reg.limit(90));

// Make annual mean image from daily data
// Check annual mean rain rate (mm/s) for 2020, 2050, 2100
// Based on the rain rate in mm/s convert annual rain to mm/day (3600 seconds * 24 hours [seconds/hour * hours/day])
// s2yy is an array defined with constant value (3600 * 24) seconds in an a day

 var s2yy = ee.Image.constant(3600*24);  

//========================================================================================

// Find mean precipitation rates
// Multiple the mean rain rate by s2yy (mm/day)

// Calculate Annual Mean Precipitation Rate for 2020
 var year = 2020;                               // define a variable "year" and assign it the date "2020"                        
 var startDate = ee.Date.fromYMD(year, 1, 1);   // define a variable "startDate" to be day 1 of 2020
 var endDate = startDate.advance(1, 'year');    // define a variable "endDate" for the last day of 2020
 var PRyy = PR_reg                              // PRyy collects daily images for 2020 from the beginning to end of year 
  .filter(ee.Filter.date(startDate, endDate));
 var PR2020 = PRyy.reduce(ee.Reducer.mean()).multiply(s2yy); // define a variable "PR2020" and calculate the mean annual precipitation for 2020

// The following print statements check dates, image collection, and mean, and prints them to the Console tab
 print(startDate);
 print(endDate);
 print('PRyy');
 print(PRyy);
 print('PRavg');
 print(PR2020);
 print(' pr 2020-------------');

// Calculate Annual Mean Precipitation Rate for 2050
 var year = 2050;                               // define a variable "year" and assign it the date "2050"  
 var startDate = ee.Date.fromYMD(year, 1, 1);   // define a variable "startDate" to be day 1 of 2050
 var endDate = startDate.advance(1, 'year');    // define a variable "endDate" for the last day of 2050
 var PRyy = PR_reg                              // PRyy collects daily images for 2050 from the beginning to end of year 
  .filter(ee.Filter.date(startDate, endDate));
 var PR2050 = PRyy.reduce(ee.Reducer.mean()).multiply(s2yy); // define a variable "PR2050" and calculate the mean annual precipitation for 2050

// The following print statements check dates, image collection, and mean, and prints them to the Console tab
 print(startDate);
 print(endDate);
 print('PRyy');
 print(PRyy);
 print('PRavg');
 print(PR2050);
 print(' pr 2050-------------');

// Calculate Annual Mean Precipitation Rate for 2100 
 var year = 2100;                               // define a variable "year" and assign it the date "2100"
 var startDate = ee.Date.fromYMD(year, 1, 1);   // define a variable "startDate" to be day 1 of 2100
 var endDate = startDate.advance(1, 'year');    // define a variable "endDate" for the last day of 2100
 var PRyy = PR_reg                              // PRyy collects daily images for 2100 from the beginning to end of year 
  .filter(ee.Filter.date(startDate, endDate));
 var PR2100 = PRyy.reduce(ee.Reducer.mean()).multiply(s2yy);  // define a variable "PR2100" and calculate the mean annual precipitation for 2100 

// The following print statements check dates, image collection, and mean, and prints them to the Console tab
 print(startDate);
 print(endDate);
 print('PRyy');
 print(PRyy);
 print('PRavg');
 print(PR2100);
 print(' pr 2020-------------');

//=======================================================================================================
//                             Precipitation differences (30-year and 80-year from 2020)
//=======================================================================================================

// Next calculate differences in annual precipitation (PR2050-PR2020) and (PR2100-PR2020)

 var PRdif_2050m2020 = PR2050.subtract(PR2020); // Define variable PRdif_2050m2020 to hold the precipitation difference map          
 var PRdif_2100m2020 = PR2100.subtract(PR2020); // Define variable PRdif_2100m2020 to hold the precipitation difference map 

// Define visualization parameters for annual mean precipitation rate
var parVis = { 
  min: 0.5,
  max: 3.0,
  palette: ['blue', 'purple', 'cyan', 'green', 'yellow', 'red'],
};

// Define visualization parameters for annual mean precipitation rate differences
var difVis = {
  min: -1.5,
  max: 1.0,
  palette: ['000055','0000ff', '00cccc','00ff00','aaaaaa','aacc00','ffff00','ff0000','cc0000'
  ],  
};

// Add map layers of annual mean PR (PR2020, PR2050, PR2100) and differences (PRdif_2050m2020 and PRdif_2100m2020) to the map window
Map.addLayer(
  PR2020, parVis,
    'Precipitation (mm/day) - 2020');
    
Map.addLayer(
  PR2050, parVis,
    'Precipitation (mm/day) - 2050');
    
Map.addLayer(
  PR2100, parVis,
    'Precipitation (mm/day) - 2100');
    
Map.addLayer(
  PRdif_2050m2020, difVis,
    'PRdif 2050-2020 (mm/yday)');

Map.addLayer(
  PRdif_2100m2020, difVis,
    'PRdif 2100-2020 (mm/day)');

//=======================================================================================================
//                   Time Series and Linear Trends of Temperature and Precipitation (2020-2100)
//=======================================================================================================
// Steps for both Surface Air Temperature and Precipitation time series
//  - Calculates annual mean for myaoi for 2020 to 2100 (81 years)
//  - Calculates area-averaged quantity for the 81 years and makes a time series
//  - Plots the time series
//  - Fits a trend line and plot
//=======================================================================================================
 
// List of years for calculating annual means from startdate to enddate
  var startdate = ee.Date.fromYMD(2020,01,01); // define a variable "startDate" to serve as the reference starting point for January 1, 2020
  var ylist = ee.List.sequence(0, 80);         // define a variable "ylist" to list sequential years from 2020 to 2100
  var listdates = ylist.map(function(year){    // define a variable "listdates" to map over each number in ylist
  return startdate.advance(year, 'year')});    // advances the "startdate" by that many years

// Use print statements to list the dates in the Console tab
 print('years');
 print(listdates);
 
// From the image collection (IC) 'AirT' calculate annual mean
  var Tannual = ee.ImageCollection.fromImages(listdates.map(function(sum_year){ // define a variable "Tannual" to create a new ImageCollection mapped over each date in "listdates"
  var filterCol = AirT.filterDate(ee.Date(sum_year), ee.Date(sum_year).advance(1, 'year')); // define a variable "filterCol" to capture all daily data within each calendar year
    return filterCol.mean().setMulti({ // Returns the pixel-wise average across all images in that year adding metadata properties to the resulting image
    Date: ee.Date(sum_year), 'system:time_start': ee.Date(sum_year).millis() // stores the year as a Date property and sets the timestamp in milliseconds
    }); 
 }));
 Tannual = Tannual.map(function(image) { // applies a function to each image in the Tannual ImageCollection
  return image.subtract(constant) // subtracts "constant" variable defined above (i.e., Kelvin 273.15) from every pixel in the image
              .copyProperties(image, image.propertyNames()); // copies all metadata properties from the original image to the new image
});

// print first 90 elements to the console and check the dates.
   print('Tannual');
   print(Tannual.limit(90));    

//========================================================================================================================
//                                              Plot Time series:
// Make time series of area-averaged (averaged over myaoi) annual mean temperature (Tannual) and fit a trend line to this timeseries
// In the following, scale is the grid size of the data in meters (GDDP has 25 km grid resolution = 25000 meters)
// First wet event frequency and then dry event frequency time series are plotted
//========================================================================================================================
              
 var TimeSeries = ui.Chart.image.seriesByRegion({ // define a variable "TimeSeries" creating an interactive time series chart across different regions
    imageCollection: Tannual, // uses the multi-year annual mean temperature data from the image collection "Tannual"
    regions: myaoi, // analyzes specific geographic region (Area of Interest)
    reducer: ee.Reducer.mean(), // calculates average temperature within each region
    scale: 25000, // uses 25km pixel resolution for computation
    seriesProperty: 'ADM1_NAME' // creates separate lines for each administrative region
  })
    .setOptions({
    title: 'Annual Mean Surface Air Temperatures(K)', // sets the title of the chart
    vAxis: {title: 'C', maxValue: 15, minValue: 8}, // sets title for Y-axis and min/max values
    hAxis: {title: 'Year', format: 'yyyy', gridlines: {count: 25}}, // sets title and format for X-axis
    visibleInLegend: true, // appears in legend
    labelInLegend: 'Tair', // sets label in legend
    
     trendlines: {
     0: {
      color: 'red', // adds a red linear trend line
      visibleInLegend: true, // appears in legend
      labelInLegend: 'Linear trend', // sets label for trend line
      lineWidth: 2, // sets line width for trend line
      opacity: 0.6, // sets opacity for trend line
    }
  }
  });

// define a variable "TimeSeries" to set the chart type as a line chart.
  var TimeSeries = TimeSeries.setChartType('LineChart');
// Plot Timeseries (plotted under Console tab to the right)     
  print(TimeSeries);

//==========================================================================================================

// From the IC 'PR' calculate annual mean 
  var Pannual = ee.ImageCollection.fromImages(listdates.map(function(sum_year){ // define a variable "Pannual" to create a new ImageCollection mapped over each date in "listdates"
  var filterCol = PR.filterDate(ee.Date(sum_year), ee.Date(sum_year).advance(1, 'year')); // define a variable "filterCol" to capture all daily data within each calendar year
      return filterCol.mean().setMulti({ // Returns the pixel-wise average across all images in that year adding metadata properties to the resulting image
      Date: ee.Date(sum_year), 'system:time_start': ee.Date(sum_year).millis() // stores the year as a Date property and sets the timestamp in milliseconds
  }); 
 }));
//
// Scale each annual image in Pannual by s2yy to convert the precipitation from mm/sec to mm/day

  var PRannual = Pannual.map(function(image) { // define a variable "PRannual" to apply a function to each image in the Pannual ImageCollection
  return image.multiply(s2yy) // multiplies "s2yy" variable defined above (seconds/day) from every pixel in the image
              .copyProperties(image, image.propertyNames()); // copies all metadata properties from the original image to the new image
});

// print first 90 elements to the console and check the dates.
  print('PRannual');
  print(PRannual.limit(90));

//========================================================================================================================
//                                              Plot Time series:
// Make time series of area-averaged (averaged over myaoi) precipitation (PRannual) and fit a trend line to this timeseries
// In the following, scale is the grid size of the data in meters (GDDP has 25 km grid resolution = 25000 meters)
// First wet event frequency and then dry event frequency time series are plotted
//========================================================================================================================

//              
 var TimeSeries = ui.Chart.image.seriesByRegion({ // define a variable "TimeSeries" creating an interactive time series chart across different regions
    imageCollection: PRannual, // uses the multi-year annual mean temperature data from the image collection "PRannual"
    regions: myaoi, // analyzes specific geographic region (Area of Interest)
    reducer: ee.Reducer.mean(), // calculates average temperature within each region
    scale: 25000, // uses 25km pixel resolution for computation
    seriesProperty: 'ADM1_NAME' // creates separate lines for each administrative region
  })
    .setOptions({
    title: 'Annual Mean Precipitation (mm/day)', // sets the title of the chart
    vAxis: {title: 'mm/day', maxValue: 3.0, minValue: 1.0}, // sets title for Y-axis and min/max values
    hAxis: {title: 'Year', format: 'yyyy', gridlines: {count: 25}}, // sets title and format for X-axis
    
     trendlines: {
     0: {
      color: 'red', // adds a red linear trend line
      visibleInLegend: true, // appears in legend
      labelInLegend: 'Linear trend', // sets label for trend line
      lineWidth: 2, // sets line width for trend line
      opacity: 0.6, // sets opacity for trend line
    }
  }
  });

// define a variable "PRTTimeSeries" to set the chart type as a line chart.
    var PRTimeSeries = TimeSeries.setChartType('LineChart');
// Plot PRTTimeseries (plotted under Console tab to the right) 
    print(PRTimeSeries);

/*
//=======================================================================================
// Example of exporting an image to Google Drive
// For example T2050 is exported to the Drive
//=======================================================================================
 Note:
 - The following lines show how to prepare the data for export, you will need to uncomment the code block below to execute
 - Once the images/data are prepared, click on the 'Tasks' tab on the right
 - You will see the image ready to be exported.
 - Click on 'RUN', this will open a window with a number of options
 - For scale specify '25000' as this is the native resolution of GDDP-CMIP6 data
 - Scroll down to select the image format (GeoTIFF would allow further analysis in GIS)
 - Submit the task -- a message will appear showing the approximate time it would take to export the image. The task window will show when the data export is complete.
*/

/*
   Export.image.toDrive({
   image: T2050,
   description: 'T2050_NEX-GDDP-GISS',
   crs: 'EPSG:4326',
// crsTransform: projection.transform,
   region: myaoi
});
*/
