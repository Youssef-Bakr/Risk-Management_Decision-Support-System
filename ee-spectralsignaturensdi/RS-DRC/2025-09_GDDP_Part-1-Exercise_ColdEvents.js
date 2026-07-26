/*

=====================================================================================================================================
ARSET Training: Assessing Extreme Weather Statistics using NASA Earth eXchange Global Daily Downscaled Projections (NEX-GDDP-CMIP6)
Dates: September 10 – 17, 2025
Training Page: https://www.earthdata.nasa.gov/learn/trainings/assessing-extreme-weather-statistics-using-nasa-earth-exchange-global-daily
Demonstration: Access NEX-GDDP-CMIP6 data and examine long-term changes in surface air temperatures and precipitation
Parameters used: near-surface air temperature and precipitation for a region of interest
Authors: Amita Mehta and Sean McCartney
----------------------------------------
Script: GDDP_Part-1-Exercise_ColdEvents
----------------------------------------
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
                      -	Select parameter(s): daily minimum surface air temperature 
                      -	Collect daily data for 2020 to 2100
                      -	Clip the global data to the area of interest defined in variable myaoi
                      - Form seasonal image collection for each year
                      - For extreme cold temperature:
                        Calculate 10th percentile value of daily minimum temperatures for winter (December-January-February [DJF]) from 2020-2100 data
                        Compare each daily image of minimum temperature with the 10th percentile value
                        Count as extreme cold event when the minimum daily temperature is colder than the 10th percentile value
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
          Daily data from January 2020 to December 2100
 AirT: IC of Global near-surface temperature from GDDP models (model variable name 'tas' in Kelvin)) 
 AirT_reg: IC of AirT clipped to 'myaoi'
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
// Define a variable "myaoi" to select the area of interest (Nebraska, USA)                  
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
 
Here we select the model "NASA GISS" and the scenario "SSP245" for this exercise. 
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
//                                       Extreme Cold Winter Temperatures
////+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//=========================================================================================================
// Winter Season Time Series of Daily Images for 2020-2100
// Winter months: December, January, February (DJF or djf)
// For winter season select the parameter near-surface daily minimum temperatures 'tasmin'
// Clip the global dataset to your area of interest (myaoi) defined above
//========================================================================================================

// define a variable "AirT" that selects daily minimum temperature (i.e.,tasmin) from the variable "dataset" defined above
 var AirT = dataset.select('tasmin');                             
// define a variable "AirT_reg" that maps a function to clip daily minimum temperature (i.e.,tasmin) for myaoi (i.e., Nebraska, USA)
 var AirT_reg = AirT.map(function(img){return img.clip(myaoi)});  

// define a variable "startYear" and assign it the date "2020"
 var startYear = 2020;
// define a variable "endYear" and assign it the date "2100"
 var endYear = 2100; 

//======================================================================================
// Build a list of December, January, February (DJF) images using .iterate(), a method that applies an algorithm sequentially over an image collection
// For DJF, December of previous year is used with current year's January and February
// For 2020 only January and February are extracted
//======================================================================================

// define a variable "years" to hold an argument creating a list of years from startYear (2020) to endYear (2100) in equally-spaced increments  
 var years = ee.List.sequence(startYear, endYear);

 var djfImageList = ee.List( // define a variable "djfImageList" to store the list of processed images
  years.iterate(function(year, list) { // iterates through a collection of images from 2020 to 2100
    year = ee.Number(year); // current year being processed in the iteration
    list = ee.List(list); // accumulator that builds up results from previous iterations

// Select December of previous year
  var decStart = ee.Date.fromYMD(year.subtract(1), 12, 1);

// Check for leap year to add one more day to February
  var isLeapYear = year.mod(4).eq(0)
    .and(year.mod(100).neq(0).or(year.mod(400).eq(0)));

// Based on the leap year, select the last date of February
  var febLast = ee.Date.fromYMD(year, 2, 28);
  febLast = ee.Algorithms.If(isLeapYear, ee.Date.fromYMD(year, 2, 29), febLast);
  var end = ee.Date(febLast).advance(1, 'day');

// Filter DJF images (temperature data) and label with year. Variable "seasonImages" holds daily images for each winter season
  var seasonImages = AirT_reg.filterDate(decStart, end) // only include images between the dates specified (i.e., DJF)
    .map(function(img) { // map the function over each image that passes the date filter
      return img.set('DJF_year', year); // adds a new property called 'DJF_year' and sets this property to the value of the year variable
    });
// converts the seasonImages collection to a list and gets the number of images in the collection
    return list.cat(seasonImages.toList(seasonImages.size())); // concatenates (joins) the existing list with the new list of season images
  }, ee.List([]))  // ee.List([]) is the initial empty list that starts the accumulation process
);

// Convert the year list into an ImageCollection
  var djfCollection = ee.ImageCollection(djfImageList);
// Use print statements for the size and first 90 elements in this image collection to the console tab on the right
 print('DJF image count:');
 print(djfCollection.size());
 print(djfCollection.limit(90));

// From the winter season time series from 2020-2100, find the 10th percentile value
// The percentile values are stored in a default band named 'tasmin_p10'
 var T10perc = djfCollection.reduce(ee.Reducer.percentile([10]));
// Define a variable "constant" to convert temperatures from Kelvin to Celsius by subtracting 273.15
// Define a new variable "T10PercC" to hold the values converted to Celsius
 var constant = 273.15;   
// Subtract the constant from each image so all images are in Celsius
 var T10percC = T10perc.subtract(constant)
 
// Define a variable "AirTemperatureVis" to store min/max values and symbology for the 10th percentile value for myaoi
 var AirTemperatureVis = { 
  min: -20,
  max: -10,
  palette: ['blue', 'purple', 'cyan', 'green', 'yellow', 'red'],
};
// Add the image as a layer to the map window below, specifying the symbology and layer name 
 Map.addLayer(
  T10percC, AirTemperatureVis,
    '10th Percentile Value of Minimum Surface Air Temperature (C): 2020-2100');
    
//==============================================================================================================
// Calculate frequency of extreme cold days
// We define the days with minimum surface air temperature colder than the 10th percentile value as extreme cold events
// - T10 collects band tasmin_10p 
// - seasonImage compares each image in djfCollection for each year with T10 
// - BinaryImages are set to 1 at grid points where the temperature is colder than T10
//==============================================================================================================

// define a variable "T10" to hold the selected band for the 10th percentile of minimum temperature data from djfCollection
 var T10 = T10perc.select('tasmin_p10');

// define a variable "seasonalColdCounts" to hold the result of applying the provided function to each element in the years collection
 var seasonalColdCounts = years.map(function(year) {
 year = ee.Number(year); // ensures the year value is treated as an Earth Engine Number object

// define a variable "seasonImages" applying a filter to the "djfCollection" keeping only images where the 'DJF_year' property equals the current year value
  var seasonImages = djfCollection.filter(ee.Filter.eq('DJF_year', year));

// For each image, create an image so that the grid value is 1 if < T10, else 0
  var binaryImages = seasonImages.map(function(img) { // define a variable "binaryImages" applying the function to each image in the seasonImages collection
    var cold = img.lt(T10); // pixel-wise comparison between each image and the T10 threshold (Pixels = 1 [true] where temperature < T10, Pixels = 0 (false) where temperature ≥ T10)
    return cold.set('system:time_start', img.get('system:time_start')); // preserves the original image's timestamp metadata
  });

// coldCount holds Sum of 'extreme cold' days for each winter season 
  var coldCount = ee.ImageCollection(binaryImages).sum(); // Converts the binary images to an ImageCollection - each pixel value becomes the total count of cold days at that location
  coldCount = coldCount.set('DJF_year', year); // adds metadata identifying which winter year this count represents
  coldCount = coldCount.set('system:time_start', ee.Date.fromYMD(year, 1, 1)); // sets a standardized timestamp (January 1st of the year)
  return coldCount; // returns the final count image back to the mapping function
 });

// define a variable "coldFrequency" to convert the mapped results from the function above into an ImageCollection containing one cold count image for each year processed 
  var coldFrequency = ee.ImageCollection(seasonalColdCounts);

// Use print statements to return the number of images in the collection to the Console on the right
 print('Cold frequency maps:');
 print(coldFrequency.size());

// define a variable "freqVis" to store min/max values and symbology
 var freqVis = { 
  min: 0,
  max: 30,
  palette: ['blue', 'purple', 'cyan', 'green', 'yellow', 'red'],
};

// Add the first image in the image collection as a layer to the map window below, specifying the symbology and layer name 
 Map.addLayer(coldFrequency.first(), freqVis, 'Cold Days Count for DJF 2020');

//========================================================================================================
//                                        Plot Cold eventTime Series:
// Make time series of extreme cold events for myaoi (i.e., Nebraska, USA) and fit a trend line to this timeseries
// In the following, scale is the grid size of the data in meters (GDDP has 25 km grid resolution = 25000 meters)
//========================================================================================================
               
var TimeSeries = ui.Chart.image.seriesByRegion({ // define a variable "TimeSeries" creating an interactive time series chart across different regions
    imageCollection: coldFrequency, // uses the multi-year cold frequency data
    regions: myaoi, // analyzes specific geographic regions (Area of Interest)
    reducer: ee.Reducer.mean(), // calculates average cold day frequency within each region
    scale: 25000, // uses 25km pixel resolution for computation
    seriesProperty: 'ADM1_NAME' // creates separate lines for each administrative region
   })
    .setOptions({
    title: 'Frequency of Days with Colder than 10th Percentile Daily T', // sets the title of the chart
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

// define a variable "TimeSeries" to set the chart type as a line chart.
    var TimeSeries = TimeSeries.setChartType('LineChart');
// Plot Timeseries (plotted under Console tab to the right)  
    print(TimeSeries);

//=========================================================================
