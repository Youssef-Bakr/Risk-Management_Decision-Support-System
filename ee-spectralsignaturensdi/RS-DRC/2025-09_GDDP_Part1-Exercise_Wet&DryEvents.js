/*

=====================================================================================================================================
ARSET Training: Assessing Extreme Weather Statistics using NASA Earth eXchange Global Daily Downscaled Projections (NEX-GDDP-CMIP6)
Dates: September 10 – 17, 2025
Training Page: https://www.earthdata.nasa.gov/learn/trainings/assessing-extreme-weather-statistics-using-nasa-earth-exchange-global-daily
Demonstration: Access NEX-GDDP-CMIP6 data and examine long-term changes in surface air temperatures and precipitation
Parameters used: precipitation for a region of interest
Authors: Amita Mehta & Sean McCartney
-------------------------------------------
Script: GDDP_Part1-Exercise_Wet&DryEvents
-------------------------------------------
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
 - The list of models and parameters are provided in GEE data description, 'Bands' and 'Image Properties'
 - The model outputs are available for two of the four "Tier 1" greenhouse gas emissions scenarios known as Shared Socioeconomic Pathways (SSP): SSP245 & SSP585 
 - SSP245: is the 'middle pathway of future greenhouse emission'projecting radiative forcing of 4.5 Watts/m2 by 2100.
 - SSP585: with an additional radiative forcing of 8.5 W/m² by the year 2100, this scenario represents the upper boundary of the range of scenarios.
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ 
  This exercise focuses on the following steps:
                      -	Select a model from GDDP model ensemble 
                      -	Select SSP scenario 
                      -	Select parameter(s): precipitation 
                      -	Collect daily data for 2020 to 2100
                      -	Clip the global data to the area of interest defined in variable myaoi
                      - Form seasonal image collection for each year
                      - For Extreme dry and wet precipitation:
                        Calculate 10th and 90th percentile values of daily precipitation for summer (JJA) from 2020-2100 data
                        Compare each daily image of daily precipitation with the 10th and 90th percentile values
                        Count as extreme wet event when the daily precipitation is higher than 90th percentile value
                        Count as extreme dry event when the daily precipitation is lower than 10th percentile value
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

 Note: 
 Imports (i.e., feature collections) at the top of the script include the Food and Agriculture Organization (FAO; United Nations) Global Administrative Unit Layers (GAUL) collection 
 FAO/GAUL will be used to select the country or an area of interest within the country
 A variable "country" is defined for FAO/GAUL for a country-level feature (level0) AND
 "subreg" is defined that resolves features of states within countries (level1)
=======================================================================================================

  Definitions of Variables:
  ============================

 AOI: Area of Interest - specify a country from the GAUL collection 
 myaoi: area of interest (a region within the country from GAUL)
 dataset: Image collection (IC) of global GDDP data for a selected Global Climate Model and a climate projection scenario 
          Daily data from January 2020 to December 2021
 PR: IC of Global precipitation from GDDP models (model variable name 'pr' in Kg/m2/s)) 
 PR_reg: IC of PR clipped to 'myaoi'
 ms2mmy: Precipitation unit conversion factor from Kg/m2/s to mm/day      ***
*/

//=========================================================================================================
//                              START GDDP ANALYSIS
//
// myaoi: Nebraska, United States of America (USA)
//=========================================================================================================

//++++++++++++++++++++++++++++++++++++++++++++++++++++
// Assign the country/area of interest as myaoi
//++++++++++++++++++++++++++++++++++++++++++++++++++++

// Define a variable "AOI" that holds the GAUL Level 1 dataset                              
var AOI = ee.FeatureCollection('FAO/GAUL/2015/level1');   
// Define a variable "myaoi" to select the area of interest (i.e., Nebraska, USA)                 
var myaoi = AOI
  .filter(ee.Filter.eq('ADM0_NAME', 'United States of America'))
  .filter(ee.Filter.eq('ADM1_NAME', 'Nebraska'));
// Center the map on myaoi
 Map.centerObject(myaoi, 6);
// Add the selected geography as a layer to the map window below, specifying the color and name
 Map.addLayer(myaoi, {color: 'blue'}, 'myaoi');

/*
====================================================================================================================================
*****************************************    Alternatively   *******************************************
Upload your own area of interest (AOI) by uploading its shapefile via the 'Assets' tab in the upper left corner. Select 'NEW' => 'Shape files'
and upload the four relevant files of your shapefile (.dbf, .prj, .shp, .shx). Once uploaded, refresh the assets and import your shapefile from 
the asset tab into this script by clicking the arrow symbol. Define a new variable for the imported asset to 'AOI' (Area of Interest).
====================================================================================================================================

Filter the GDDP data by dates, CMIP6 model, and scenario (i.e., SSP)
 
Here we select the model "NASA GISS" and scenario "SSP245" for this exercise. 
To select another model and/or scenario, refer to 'Image Properties' in the NEX-GDDP data information

Select dates from 2020-01-01 to 2101-01-01
Define variable "dataset" to hold the image collection of daily "GDDP-CMIP6" data for each year 
*/

 var dataset = ee.ImageCollection('NASA/GDDP-CMIP6')
                  .filter(ee.Filter.date('2020-01-01', '2101-01-01'))
                  .filter(ee.Filter.eq('model', 'GISS-E2-1-G'))
                  .filter(ee.Filter.eq('scenario','ssp245'));

// Use print statements for the first 90 elements in this image collection to the console tab on the right
 print('dataset'); 
 print(dataset.limit(90));

////+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                                   Extreme Precipitation
////+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

///=========================================================================================================
// Summer season time series of daily images for 2020-2100
// Summer months: June, July, August (JJA or jja)
// For summer season select the parameter 'pr'
// Clip the global dataset to your area of interest (myaoi) defined above
//========================================================================================================

// define a variable "PR" that selects daily precipitation (i.e.,pr) from the variable "dataset" defined above
 var PR = dataset.select('pr');                                   
// define a variable "PR_reg" that maps a function to clip daily precipitation (i.e.,pr) to myaoi (i.e., Nebraska, USA)
 var PR_reg = PR.map(function(img){return img.clip(myaoi)});       
 
// define a variable "startYear" and assign it the date "2020"
 var startYear = 2020;
// define a variable "endYear" and assign it the date "2100"
 var endYear = 2100; 

// define a variable "years" to hold an argument creating a list of years from startYear (2020) to endYear (2100) in equally-spaced increments  
 var years = ee.List.sequence(startYear, endYear);

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                                       Extreme Wet and Dry Summer Precipitation 
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

// Collect daily precipitation and make JJA image collection 

 var PRjjaImageList = ee.List( // define a variable "PRjjaImageList" to store the list of processed images
  years.iterate(function(year, list) { // iterates through a collection of images from 2020 to 2100
    year = ee.Number(year); // current year being processed in the iteration
    list = ee.List(list); // accumulator that builds up results from previous iterations

// Define a variable "junStart" to hold June 1 as the start date
  var junStart = ee.Date.fromYMD(year, 6, 1);
// Define a variable "augLast" to hold August 31 as the last date
  var augLast = ee.Date.fromYMD(year, 8, 31);
// Define a variable "end" to create end date (September 1) by advancing August 31 by 1 day
  var end = ee.Date(augLast).advance(1, 'day');
  
// Filter JJA images (precipitation data) and label with year. "PRseasonImages" holds daily images for each summer season
  var PRseasonImages = PR_reg.filterDate(junStart, end) // only include images between the dates specified (i.e., JJA)
    .map(function(img) { // map the function over each image that passes the date filter
      return img.set('JJA_year', year); // adds a new property called 'JJA_year' and sets this property to the value of the year variable
    });
// converts the PRseasonImages collection to a list and gets the number of images in the collection
    return list.cat(PRseasonImages.toList(PRseasonImages.size())); // concatenates (joins) the existing list with the new list of season images
  }, ee.List([]))  // // ee.List([]) is the initial empty list that starts the accumulation process
);

// Convert the year list into an ImageCollection
  var PRjjaCollection = ee.ImageCollection(PRjjaImageList);
// Use print statements for the size of the image collection and first 90 elements in this image collection to the console tab on the right
 print('JJA image count:');
 print(PRjjaCollection.size());
 print(PRjjaCollection.limit(90));

// From the summer season time series from 2020-2100, find the 10th percentile and 90th percentile precipitation values 
// The percentile values are stored in a default band named 'pr_p10' & 'pr_p90'
 var PR90perc = PRjjaCollection.reduce(ee.Reducer.percentile([90]));
 var PR10perc = PRjjaCollection.reduce(ee.Reducer.percentile([10]));
 
// For plotting convert rain to mm/day from mm/s (multiply 3660 seconds x 24 hours [seconds/day])
// mms2mmd is an array defined with constant value (3600*24) seconds in an a day
   var mms2mmd = ee.Image.constant(3600*24);  
   
   var PR90percD = PR90perc.multiply(mms2mmd);     // PR90percD holds precipitation values in mm/day
   var PR10percD = PR10perc.multiply(mms2mmd);     // PR10percD holds precipitation values in mm/day
   
// Define a variable "PRVis" to store min/max values and symbology for myaoi
 var PRVis = { 
  min: 5,
  max: 15,
  palette: ['blue', 'purple', 'cyan', 'green', 'yellow', 'red'],
};

// Add the image as a layer to the map window below, specifying the symbology and layer name 
 Map.addLayer(
  PR90percD, PRVis,
    '90th Percentile Value Precipitation (mm/day) - 2020-2100');
// Add the image as a layer to the map window below, specifying the symbology and layer name 
 Map.addLayer(
  PR10percD, PRVis,
    '10th Percentile Value Precipitation (mm/day) - 2020-2100');

//=============================================================================================
// Calculate frequency of extreme rain events per season for each year
// We define extreme wet event as daily rain value exceeding 90th percentile value
// Extreme precipitation event:
// - PR90 collects band pr_90p 
// - PRseasonImage compares each image in PRjjaCollection for each year with PR90 
// - PRBinaryImages are set to 1 at grid points where rain exceeds PR90
//=============================================================================================

// define a variable "PR90" to hold the selected band for the 90th percentile of precipitation data from jjaCollection 
 var PR90 = PR90perc.select('pr_p90');
// define a variable "PRseasonalhighCounts" to hold the result of applying the provided function to each element in the years collection
 var PRseasonalhighCounts = years.map(function(year) {
 year = ee.Number(year); // ensures the year value is treated as an Earth Engine Number object

// define a variable "PRseasonImages" applying a filter to the "PRdjfCollection" keeping only images where the 'DJF_year' property equals the current year value
  var PRseasonImages = PRjjaCollection.filter(ee.Filter.eq('JJA_year', year));

// For each image, create an image so that the grid value is 1 if > PR90, else 0
  var PRbinaryImages = PRseasonImages.map(function(img) { // define a variable "PRbinaryImages" applying the function to each image in the seasonImages collection
    var high = img.gt(PR90); // pixel-wise comparison between each image and the PR90 threshold (Pixels = 1 [true] where precipitation > PR90, Pixels = 0 (false) where precipitation ≤ PR90)
    return high.set('system:time_start', img.get('system:time_start')); // preserves the original image's timestamp metadata
  });

// highCount holds sum of extreme wet days for each summer season 
  var highCount = ee.ImageCollection(PRbinaryImages).sum(); // Converts the binary images to an ImageCollection - each pixel value becomes the total count of extreme rainy days at that location
  highCount = highCount.set('JJA_year', year); // adds metadata identifying which summer year this count represents
  highCount = highCount.set('system:time_start', ee.Date.fromYMD(year, 1, 1)); // sets a standardized timestamp (January 1st of the year)
  return highCount; // returns the final count image back to the mapping function
 });  

// define a variable "PRhighFrequency" to convert the mapped results from the function above into an ImageCollection containing one extreme rainy days image for each year processed 
  var PRhighFrequency = ee.ImageCollection(PRseasonalhighCounts);

// Use print statements to return the number of images in the collection to the Console on the right
 print('High rain frequency maps:');
 print(PRhighFrequency.size());
   
// Define a variable "PRCnt" to store min/max values and symbology for myaoi
 var PRCnt = { 
  min: 0,
  max: 20,
  palette: ['blue', 'purple', 'cyan', 'green', 'yellow', 'red'],
};

// Add the first image in the image collection as a layer to the map window below, specifying the symbology and layer name 
 Map.addLayer(PRhighFrequency.first(), PRCnt, 'Extreme Wet Count for JJA 2020');

//=============================================================================================
// Calculate frequency of extreme dry events per season for each year
// We define extreme dry rain event as daily rain value below 10th percentile value
// extreme precipitation event:
// - PR10 collects band pr_10p 
// - PRseasonImage compares each image in PRjjaCollection for each year with PR10 
// - PRBinaryImages are set to 1 at gridpoints where rain is lower than PR10
//=============================================================================================

// define a variable "PR10" to hold the selected band for the 10th percentile of precipitation data from JJA Collection 
 var PR10 = PR10perc.select('pr_p10');

// define a variable "LPRseasonalCounts" to hold the result of applying the provided function to each element in the years collection
 var LPRseasonalCounts = years.map(function(year) {
 year = ee.Number(year); // ensures the year value is treated as an Earth Engine Number object

// define a variable "LPRseasonImages" applying a filter to the "PRdjfCollection" keeping only images where the 'JJA_year' property equals the current year value
  var LPRseasonImages = PRjjaCollection.filter(ee.Filter.eq('JJA_year', year));

// For each image, create an image so that the grid value is 1 if < PR10, else 0
  var LPRbinaryImages = LPRseasonImages.map(function(img) { // define a variable "LPRbinaryImages" applying the function to each image in the seasonImages collection
    var low = img.lt(PR10); // pixel-wise comparison between each image and the PR10 threshold (Pixels = 1 [true] where precipitation < PR10, Pixels = 0 (false) where precipitation ≥ PR10)
    return low.set('system:time_start', img.get('system:time_start')); // preserves the original image's timestamp metadata
  });

// lowCount holds sum of extreme dry days for each summer season 
  var lowCount = ee.ImageCollection(LPRbinaryImages).sum(); // converts the binary images to an ImageCollection - each pixel value becomes the total count of extreme dry days at that location
  lowCount = lowCount.set('JJA_year', year); // adds metadata identifying which summer year this count represents
  lowCount = lowCount.set('system:time_start', ee.Date.fromYMD(year, 1, 1)); // sets a standardized timestamp (January 1st of the year)
  return lowCount; // returns the final count image back to the mapping function
 });  

// define a variable "PRlowFrequency" to convert the mapped results from the function above into an ImageCollection containing one extreme dry days image for each year processed 
  var PRlowFrequency = ee.ImageCollection(LPRseasonalCounts);

// Use print statements to return the number of images in the collection to the Console on the right
 print('Low rain frequency maps:');
 print(PRlowFrequency.size());
 
 var PRCntDry = { 
  min: 30,
  max: 40,
  palette: ['blue', 'purple', 'cyan', 'green', 'yellow', 'red'],
};


// Add the first image in the image collection as a layer to the map window below, specifying the symbology and layer name 
 Map.addLayer(PRlowFrequency.first(), PRCntDry, 'Extreme Dry Count for JJA 2020');

//===============================================================================================================
//                                        Plot Time series:
// Make time series of extreme wet & dry rain events for myaoi and fit a trend line to this timeseries
// In the following, scale is the grid size of the data in meters (GDDP has 25 km grid resolution = 25000 meters)
// First wet event frequency and then dry event frequency time series are plotted
//===============================================================================================================
               
 var TimeSeries = ui.Chart.image.seriesByRegion({ // define a variable "TimeSeries" creating an interactive time series chart across different regions
    imageCollection: PRhighFrequency, // uses the multi-year extreme high precipitation frequency data
    regions: myaoi, // analyzes specific geographic regions (Area of Interest)
    reducer: ee.Reducer.mean(), // calculates average extreme high precipitation frequency within each region
    scale: 25000, // uses 25km pixel resolution for computation
    seriesProperty: 'ADM1_NAME' // creates separate lines for each administrative region
   })
    .setOptions({
    title: 'Frequency of Days with Higher than 90 Percentile Daily PR', // sets the title of the chart
    vAxis: {title: 'Frequency', maxValue: 20.0, minValue: 0.0}, // sets title for Y-axis and min/max values
    hAxis: {title: 'Year', format: 'yyyy', gridlines: {count: 25}}, // sets title and format for X-axis
    
     trendlines: {
     0: {
      color: 'red', // adds a red linear trend line
      visibleInLegend: true, // appears in legend
      labelInLegend: 'Linear trend', // sets label in legend
      lineWidth: 2, // sets line width for trend line
      opacity: 0.6, // sets opacity for trend line
    }
  }
  });

// define a variable "WTimeSeries" to set the chart type as a line chart.
    var WTimeSeries = TimeSeries.setChartType('LineChart');
// Plot Timeseries (plotted under Console tab to the right)      
    print(WTimeSeries);
//===================================================================================================
                
 var TimeSeries = ui.Chart.image.seriesByRegion({ // define a variable "TimeSeries" creating an interactive time series chart across different regions
    imageCollection: PRlowFrequency, // uses the multi-year extreme low precipitation frequency data
    regions: myaoi, // analyzes specific geographic regions (Area of Interest)
    reducer: ee.Reducer.mean(), // calculates average extreme low precipitation frequency within each region
    scale: 25000, // uses 25km pixel resolution for computation
    seriesProperty: 'ADM1_NAME' // creates separate lines for each administrative region
   })
    .setOptions({ 
    title: 'Frequency of Days with Lower than 10 Percentile Daily PR', // sets the title of the chart
    vAxis: {title: 'Frequency', maxValue: 75.0, minValue: 50.0}, // sets title for Y-axis and min/max values
    hAxis: {title: 'Year', format: 'yyyy', gridlines: {count: 25}}, // sets title and format for X-axis
    
     trendlines: {
     0: {
      color: 'red', // adds a red linear trend line
      visibleInLegend: true, // appears in legend
      labelInLegend: 'Linear trend', // sets label in legend
      lineWidth: 2, // sets line width for trend line
      opacity: 0.6, // sets opacity for trend line
    }
  }
  });

// define a variable "DTimeSeries" to set the chart type as a line chart.
    var DTimeSeries = TimeSeries.setChartType('LineChart');
// Plot Timeseries (plotted under Console tab to the right)      
    print(DTimeSeries);
