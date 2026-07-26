//2024-08_Drought-Monitoring_Part3-Exercise_v03_NEX-GDDP_Egypt
//=======================================================================================================
/*
                                     ARSET Training  
        Drought Monitoring, Prediction, and Projection using NASA Earth System Data
                                      30 July 2024
    Demonstration: Examine NASA Earth Exchange Global Daily Downscaled Projections (NEX-GDDP)
    Objective: Examine near-surface temperature and precipitation as drought indicators
    from GDDP for a region of interest
    
                                      Amita Mehta
=======================================================================================================
=======================================================================================================
 - This code provides hands-on exercise in selecting NEX-GDDP data for a country of interest.
 - GEE image collection for NEX-GDDP-CMIP6 (Coupled Model Intercomparison Project Phase 6): 
 - ee.ImageCollection('NASA/GDDP-CMIP6')
 - The data include outputs from various CMIP6 models. For each model several parameters are available
 - The list of models and parameters are provided in GEE data description, 'bands' and 'Image Properties'

 - The model outputs are available for two Shared Socioeconomic Pathways (SSP): SSP245 & SSP585 
 - SSP245: is the 'middle pathway of future greenhouse emission'  projecting radiative forcing of 
   4.5 Watts/m2 by 2100.
 - SSP585: with an additional radiative forcing of 8.5 W/m² by the year 2100, This scenario represents the upper boundary of the range of scenarios.
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++       
  In this demonstration we will:
                      -	Select a model from GDDP model ensemble 
                      -	Select SSP scenario 
                      -	Select parameter(s): Temperature and precipitation 
                      -	Collect daily data for 2020, 2050,  2100 
                      -	Clip the global data to the country of interest defined as variable AOI
                      -	Find annual mean of near-surface Temperature and precipitation for 2020, 2050, 2100 for the AOI
                      -	Map the parameters and also differences from 2020 to 2050 and 2020 to 2100.
                      -	Examine annual trends of near-surface temperature 
=======================================================================================================

Note:  Imports at the top include the Food and Agriculture Organization (FAO; United Nations) Global Administrative Unit Layers (GAUL) collection 
FAO/GAUL will be used to select the country of interest
To import type the following line in the script 
var gaul = ee.FeatureCollection('FAO/GAUL/2015/level2')
Click on the FeatureCollection name -->  Convert
A variable "country" is defined for FAO/GAUL for a country-level shapefile AND
"subreg" is defined that resolves shapefiles of states withing countries

=======================================================================================================

  Definitions of Variables:
  ============================

 AOI:  A string specifying the country OR region of interest
 myaoi: Country shapefile from GAUL  
 dataset: Image collection (IC) of global GDDP data for a selected Global Climate Model and a climate projection scenario 
          Daily data from January 2020 to December 2021
 AirT: IC of Global near-surface temperature from GDDP models (model variable name 'tas' in Kelvin))
 AirT_reg: IC of AirT clipped to 'myaoi'
 Tyy: IC of AirT_Reg (raster maps) for a particular year for 'myaoi'
 Tyyyy: AirT_reg Averaged for myaoi (a mean map for year yyyy (yyyy= 2020, 2050, and 2100)
 Tdif_2050m2020 : Difference between annual mean  surface temperatures form 2050 and 2020
 Tdif_2021m2020 : Difference between annual mean  surface temperatures form 2100 and 2020
 
 PR:  IC of Global precipitation from GDDP models (model variable name 'pr' in Kg/m2/s))
 PR_reg: IC of PR clipped to 'myaoi'
 PRyy: IC of PR_reg for a particular year for 'myaoi' 
 s2yy: Precipitation unit conversion factor from Kg/m2/s to mm/day
 PRyyyy: PR_reg Averaged  for 'myaoi' (a mean map for year yyyy (yyyy= 2020, 2050, and 2100)
 PRdif_2050m2020 : Difference between annual mean  precipitation from 2050 and  2020
 PRdif_2021m2020 : Difference between annual mean  precipitation form 2100 and 2020
 
 ylst: List of number of years (2020 to 2100 = 81 years)
 listdates: List of years starting from 2020
 - the list will record year as 2020-01-01, 2021-01-01,----> 2100-01-01
 Tannual: IC of Annual average Tair  
 TimeSeries: Annual mean, area-averaged (over 'myaoi') temperatures for the 81 years
 
=======================================================================================================
*/
//                              Start GDDP Analysis for Ethiopia
//=======================================================================================================
// 
//+++++++++++++++++++++++++++++++++++++++++++++
// Assign the country of your interest as AOI
// We chose Ethiopia as en example
//+++++++++++++++++++++++++++++++++++++++++++++
//
// Filter GAUL collection to AOI
// variable myaoi is the filtered image collection for the  AOI 
// Draw the 'AOI' country outline and subregion boundaries.
// 
 var  AOI = 'Egypt';
//    =================
//
 var  myaoi = countries.filter(ee.Filter.eq('ADM0_NAME', AOI));
 print ('myaoi', myaoi);
//
// Set the center of the map to the country and specify the zoom level, from 1 to 24 (1 = the entire planet; 24 = the smallest region possible)
//
 Map.centerObject(myaoi, 5);

// Add the GAUL shapefile of AOI to the map pane
//
 Map.addLayer(myaoi, ['green'], AOI, true);
//
////**********************************Alternatively:*******************************************
//
//Upload your own area of interest by uploading its shapefile via the 'Assets' tab in the upper left corner. Select 'NEW' => 'Shape files'
//and upload the four relevant files of your shapefile (.dbf, .prj, .shp, .shx). Once uploaded, refresh
//the assets and import your shapefile from the asset tab into this script by clicking the arrow symbol.
//define a new variable for the imported asset to 'AOI' (Area of Interest).
// 
//=======================================================================================================
//=======================================================================================================
//
// We first filter the GDDP data by dates, model, and parameters
// 
// Here we select model: NASA GISS and scenario: ssp245 for this exercise. 
// To select another model and/or scenario, read 'Image Properties' in the NEX-GDDP data information 
// Filter the data with the names of the model scenario and of interest instead of GISS and ssp245
//
// Select dates from 2020-01-01 to 2100-12-31
// variable 'dataset' will be the image collection of daily data for each year 
//
var dataset = ee.ImageCollection('NASA/GDDP-CMIP6')
                  .filter(ee.Filter.date('2020-01-01', '2101-01-01'))
                  .filter(ee.Filter.eq('model', 'GISS-E2-1-G'))
                  .filter(ee.Filter.eq('scenario','ssp245'));
//
// this will print first 120 elemnets of this image collection on the console to the right  ------------------>
//  
 print('dataset', dataset.limit(120)); 
//
//=======================================================================================================
//                             Surface Temperature Maps for 2020, 2050, 2021
//=======================================================================================================
//
// Now Select parameter: 'tas' for daily near-surface temeprature  
// Clip the global data to get data just for Ethiopia 
//
 var AirT = dataset.select('tas');  // global image collection with daily temperature
 var AirT_reg = AirT.map(function(img){return img.clip(myaoi)});  // daily image collection for Ethiopia
//
 print('AirT_reg',AirT_reg.limit(120));   // check first 120 elements
//
// Now make annual mean image from daily data
// We check annual mean temperature for 2020, 2050, 2100
// 
 var year = 2020;
 var startDate = ee.Date.fromYMD(year, 1, 1);     // startdate is day1 of 2020
 var endDate = startDate.advance(1, 'year');      // last day of 2020
 var Tyy = AirT_reg                               // Tyy collects daily images for 2020
     .filter(ee.Filter.date(startDate, endDate));
 var T2020 = Tyy.reduce(ee.Reducer.mean());        // T2020 is mean temperature for 2020
//
// The following print statements checks dates, image collection, and mean
//
 print(startDate);
 print(endDate);
 print('Tyy',Tyy);
 print('Tavg',T2020);
 print(' 2020-------------');
//
// Find annual mean temperature for 2050 -- same steps as in lines 145-150, only year is set to 2050 instead of 2020
//
 var year = 2050;
 var startDate = ee.Date.fromYMD(year, 1, 1);
 var endDate = startDate.advance(1, 'year');
 var Tyy = AirT_reg
  .filter(ee.Filter.date(startDate, endDate));
 var T2050 = Tyy.reduce(ee.Reducer.mean());
 print(startDate);
 print(endDate);
 print('Tyy',Tyy);
 print('Tavg',T2050);
 print(' 2050-------------');
//
// Find  annual mean temperature for 2100 -- same steps as in lines 145-150, only year is set to 2100 instead of 2020
//
 var year = 2100;
 var startDate = ee.Date.fromYMD(year, 1, 1);
 var endDate = startDate.advance(1, 'year');
 var Tyy = AirT_reg
  .filter(ee.Filter.date(startDate, endDate));
 var T2100 = Tyy.reduce(ee.Reducer.mean());
 print(startDate);
 print(endDate);
 print('Tyy',Tyy);
 print('Tavg',T2100);
 print(' 2100-------------');
//
//=======================================================================================================
//                             Surface Temperature differences (30-year and 80-year from 2020)
//=======================================================================================================
//
// Calculate temperature differences between T2050 & T2020 and  between T2100 & T2020
// Define variable Tdif_20150m2020 and dif_20150m2020 to hold the temperature difference maps
//
 var Tdif_2050m2020 = T2050.subtract(T2020);       
 var Tdif_2100m2020 = T2100.subtract(T2020); 
//
// Define visualization parameters for annual mean temperatures
//
var AirTemperatureVis = { 
  min: 275,
  max: 305,
  palette: ['blue', 'purple', 'cyan', 'green', 'yellow', 'red'],
};
//
// Define visualization parameters for annual mean temperatures differences
//
var AirTdifVis = {
  min: -0.7,
  max: 2.0,
  palette: ['blue', 'purple', 'cyan', 'green', 'yellow', 'red'],
};
//
// plot maps of annual mean Temperature (T2020, T2050, T2100) and differences (Tdif_2050m2020 and Tdif_2100m2020)
//
Map.addLayer(
   T2020, AirTemperatureVis,
    'Air Temperature (K) - 2020');
//
 Map.addLayer(
   T2050, AirTemperatureVis,
    'Air Temperature (K) - 2050');
//
Map.addLayer(
  T2100, AirTemperatureVis,
    'Air Temperature (K) - 2100');
//
Map.addLayer(
  Tdif_2050m2020, AirTdifVis,
    'Tdif 2050-2020 (K)');
//
Map.addLayer(
  Tdif_2100m2020, AirTdifVis,
    'Tdif 2100-2020 (K)');
//
//=======================================================================================================
//                             Precipitation  Maps for 2020, 2050, 2021
//=======================================================================================================
//
// Repeat the above analysis (steps 130 to 235) for precipitation
// Start with the image collection  'dataset' for daily data for GISS model and scenario rcp245, years 2020 to 2021 
// 
// Select parameter: 'pr' for daily precipitation rate
// Note: the 'pr' units are kg/m2/s which is equivalent to mm/s per m2
//
 var PR = dataset.select('pr');             // global image collection with daily precipitation
//
// Clip the global data to get data just for Ethiopia
//
 var PR_reg = PR.map(function(img){return img.clip(myaoi)});  // idaily mage collection for Ethiopia
 print('PR_reg',PR_reg.limit(120));   // check first 120 elements
//
// Now make annual mean image from daily data
// We check annual mean rain rate (mm/s) for 2020, 2050, 2100
// Based on the annual rain rate we find annual rain/year (multiply by 3660sx24h seconds/day)
// s2yy is an array defined with constant value (3600*24) seconds in an a day
//
   var s2yy = ee.Image.constant(3600*24);  
//
//========================================================================================
//
// Find mean rainrates
// Multiple the mean rainrate by s2yy (mm/day)
//
// Calculate Annual Mean Rainrate for 2020
//
 var year = 2020;
 var startDate = ee.Date.fromYMD(year, 1, 1);   // startdate is day1 of 2020
 var endDate = startDate.advance(1, 'year');    // last day of 2020
 var PRyy = PR_reg                              // Tyy collects daily images for 2020 
  .filter(ee.Filter.date(startDate, endDate));
 var PR2020 = PRyy.reduce(ee.Reducer.mean()).multiply(s2yy);
//
// The following print statements checks dates, image collection, and mean
//
 print(startDate);
 print(endDate);
 print('PRyy',PRyy);
 print('PRavg',PR2020);
 print(' 2020-------------');
//
// Calculate Annual Mean Rain rate for 2050
//
 var year = 2050;
 var startDate = ee.Date.fromYMD(year, 1, 1);
 var endDate = startDate.advance(1, 'year');
 var PRyy = PR_reg
  .filter(ee.Filter.date(startDate, endDate));
 var PR2050 = PRyy.reduce(ee.Reducer.mean()).multiply(s2yy);   
//
 print(startDate);
 print(endDate);
 print('PRyy',PRyy);
 print('PRavg',PR2050);
 print(' 2050-------------');
//
// Find annual mean rain rate for 2100 
//
 var year = 2100;
 var startDate = ee.Date.fromYMD(year, 1, 1);
 var endDate = startDate.advance(1, 'year');
 var PRyy = PR_reg
  .filter(ee.Filter.date(startDate, endDate));
 var PR2100 = PRyy.reduce(ee.Reducer.mean()).multiply(s2yy);   
//
 print(startDate);
 print(endDate);
 print('PRyy',PRyy);
 print('PRavg',PR2100);
 print(' 2100-------------');
//
//=======================================================================================================
//                             Precipitation  differences (30-year and 80-year from 2020)
//=======================================================================================================
//
// Next calculate differences in annual precipitation (PR2050-PR2020) and (PR2100-PR2020)
// 
 var PRdif_2050m2020 = PR2050.subtract(PR2020);          
 var PRdif_2100m2020 = PR2100.subtract(PR2020); 
//
// Define visualization parameters for annual mean precipitation rate
//
var parVis = { 
  min: 0.1,
  max: 5,
  palette: ['blue', 'purple', 'cyan', 'green', 'yellow', 'red'],
};
//
// Define visualization parameters for annual mean precipitation rate differences
//
var difVis = {
  min: -2,
  max: 2.0,
  palette: ['000055','0000ff', '00cccc','00ff00','aaaaaa','aacc00','ffff00','ff0000','cc0000'
  ],  
};

// plot maps of annula mean PR (PR2020, PR2050, PR2100) and differences (PRdif_2050m2020 and PRdif_2100m2020)
//
Map.addLayer(
  PR2100, parVis,
    'Precipitation (mm/day) - 2100');
    
Map.addLayer(
  PR2050, parVis,
    'Precipitation (mm/day) - 2050');
    
Map.addLayer(
  PR2020, parVis,
    'Precipitation (mm/day) - 2020');
    
Map.addLayer(
  PRdif_2050m2020, difVis,
    'PRdif 2050-2020 (mm/yday)');
//
Map.addLayer(
  PRdif_2100m2020, difVis,
    'PRdif 2100-2020 (mm/day)');
//
//=======================================================================================================
//                                     Temperature Trend (2020-2100)
//=======================================================================================================
// The following section:
// - Calculates annual mean of surface temperatures for the region AOI for 2020 to 2100 
// - Calculated area-mean surface temperatures for the 81 years and makes a time series
// - plots the time series
// 
// List of years for calculating means from startdate to enddate
//
  var startdate =  ee.Date.fromYMD(2020,01,01);
  var ylist = ee.List.sequence(0, 80);
  var listdates = ylist.map(function(year){ 
  return startdate.advance(year, 'year')});
//
 print('years',listdates);
 //
 // From the IC 'AirT' calculate annual mean 
 //
    var Tannual  = ee.ImageCollection.fromImages(listdates.map(function(sum_year){
    var filterCol = AirT.filterDate(ee.Date(sum_year), ee.Date(sum_year).advance(1, 'year'));
       return filterCol.mean().setMulti({
        Date: ee.Date(sum_year), 'system:time_start': ee.Date(sum_year).millis()
    }); 
 }));
   print('Tannual',Tannual.limit(120));    // print first 120 elements to the console and check the dates.
//
// Make time series of area-averaged (averaged over myaoi surface air temperature (Tannual) 
// in the following scale is the grid size of the data in meters (GDDP has 25 km grid resolution = 25000 meters)
//                  =====
//
var TimeSeries = ui.Chart.image.seriesByRegion({
    imageCollection: Tannual,
    regions: myaoi,
    reducer: ee.Reducer.mean(),
    scale: 25000,

  })
    .setOptions({
    title: 'Monthly Air Temperatures(K)',
    vAxis: {title: 'GISS T', maxValue: 301, minValue: 296},
    hAxis: {title: 'Year', format: 'yyyy', gridlines: {count: 25}},
    
  });

//
// Plot Timeseries (it will be plotted on the console window to the right)    ----------->
//
    var  TimeSeries = TimeSeries.setChartType('LineChart');
  
    print(TimeSeries);
//
//
//=======================================================================================
// Example of exporting an image to Google Drive
// For example T2050 is exported to the Drive
//=======================================================================================
// the following lines show how to prepare the data for export,
// Once the images/data are prepared, click on the 'Task' option in the right column -------->
// You will see the image ready to be exported.
// Click on 'RUN', this will open a window with a number of options
// Scroll down to select the image format (GeoTIFF would allow further analysis in GIS)
// Submit the task -- a message will appear showing approximate time it would take to export 
// the image. The task window will show when the data export is complete.
//
   Export.image.toDrive({
   image: T2050,
   description: 'T2050_NEX-GDDP-GISS',
   crs: 'EPSG:4326',
// crsTransform: projection.transform,
   region: myaoi
});
/*
======================================================================================================   
=======================================================================================================
                                       DISCLAIMER
Every effort is made to ensure the code is free of errors but there is no warranty for the maps 
and their features are either spatially or temporally accurate or fit for a particular use. This code is provided 
without any warranty of any kind whatsoever, either express or implied.
=======================================================================================================   
=======================================================================================================
*/

