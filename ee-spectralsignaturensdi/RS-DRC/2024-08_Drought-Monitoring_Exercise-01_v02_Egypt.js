//2024-08_Drought-Monitoring_v02 E
/* 
- The script was modified for use in the NASA ARSET online training: 
- Drought Monitoring, Prediction, and Projection using NASA Earth System Data
- https://appliedsciences.nasa.gov/get-involved/training/english/arset-drought-monitoring-prediction-and-projection-using-nasa-earth
- The script was adapted from the United Nations: Drought monitoring using the Standardized Precipitation Index (SPI)  
- https://www.un-spider.org/advisory-support/recommended-practices/recommended-practice-drought-monitoring-spi
*/

//=====================================================================================================
//                      DROUGHT MONITORING USING THE STANDARDIZED PRECIPITATION INDEX (SPI)
//=====================================================================================================
//The Standardized Precipitation Index (SPI) developed by McKee et al. (1993) describes the probability 
//of variation from the normal precipitation over multiple years of data, on a monthly (or multiple months) 
//time step. The SPI is calculated by taking the precipitation of the pixel i during timeframe j of year k
//minus the mean of pixel i during timeframe j over n years, 
//divided by standard deviation of pixel i during timeframe j over n years.
//Within this script, the monthly SPI will be calculated based on daily CHIRPS data (since 1981) which 
//will be summed up to monthly (or several months of) precipitation data. 
//As precipitation is usually not normaly distributed, a gamma probability function is commonly used,
//but is not supported in this script. The resulting SPI values can therefore just be used as an estimator.
//=====================================================================================================


//**************************************DISCLAIMER!****************************************************
//Please refer to the disclaimer at the end of the script! 
//*****************************************************************************************************


//=====================================================================================================
//                             SELECT YOUR OWN STUDY AREA   

// Use the polygon-tool in the top left corner of the map pane to draw the shape of your 
// study area. Single clicks add vertices, double-clicking completes the polygon.
//*************************************CAUTION!**********************************************
//Afterwards, go to the setting of the polygon (gear-symbol within your 'Geometry Imports'),
//rename the polygon to 'AOI' and change the 'Import as' drop down to 'FeatureCollection'.
// **CAREFUL**: Under 'Geometry Imports' (top left in map panel) uncheck the 
//              geometry box, so it does not block the view on the imagery later.

//**********************************Alternatively:*******************************************
//Upload your shapefile via the 'Assets' tab in the upper left corner. Select 'NEW' => 'Shape files'
//and upload the four relevant files of your shapefile (.dbf, .prj, .shp, .shx). Once uploaded, refresh
//the assets and import your shapefile from the asset tab into this script by clicking the arrow symbol.
//Rename the imported asset to 'AOI' (Area of Interest).


// Set the basemap to display as satellite.
Map.setOptions('SATELLITE');

// Define a variable "country" and filter the Food and Agriculture Organization (FAO; United Nations) 
// Global Administrative Unit Layers (GAUL) collection to Mexico 
var Egypt = countries.filter(ee.Filter.eq('ADM0_NAME', 'Egypt'));
print (Egypt);

var province = countries.filter(ee.Filter.eq('ADM1_NAME', 'Giza'));
print (province);

// Set the center of the map to your AOI and specify the zoom level, from 1 to 24 (1 = the entire planet; 24 = the smallest region possible)
Map.centerObject(province, 5);

// Add the GAUL shapefile of Zimbabwe to the map pane
Map.addLayer(Egypt, ['green'], 'Egypt', false);

// Add the GAUL shapefile of Midlands province to the map pane
Map.addLayer(province, ['red'], 'Giza', false);

//=====================================================================================================
//                                     SET TIME FRAME
//If you want to use another period of time than the whole time span of CHIRPS data, change the 
//code between ee.Date brackets (start_date & end_date) to the desired dates.
//Keep in mind, that a reduction of the time span will lead to a less accurate SPI calculation.

var firstImage = ee.Date(ee.List(CHIRPS.get('date_range')).get(0));
var latestImage = ee.Date("2024-04-01");

//=====================================================================================================
//                                     SET RESOLUTION
//CHIRPS datasets have a resolution of 0.05°. However, as GEE is using meters to define the resolution,
//you might have to recalculate the resolution for your AOI. A resolution of 0.05° corresponds to 
//approximately 5550 meters at the equator. Depending on the size of your AOI it might be useful to 
//decrease the resolution to a certain extent (eg. 10000). This shortens the processing time. However, 
//the defined resolution effects the statistic calculations (plotted charts) and the exported image, not the displayed image.

var resolution = 5550;

//=====================================================================================================
//                            SET TIME SCALE INFORMATION FOR SPI
//The SPI can be calculated based on different time scales. The scientific society usually recognizes 
//one month as the shortest timescale for the calculation of the SPI. Shorter timescales might underly
//random  fluctuations in precipitation. However, the SPI can also be calculated for longer timescales,
//like 6 months. The following settings will give you the possibility to set your own time
//frame for the calculation of the SPI.

//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!DISCLAIMER!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//The calculation works for the following quantity of months: 
//1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 24, 48
//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

var timestep = '2'; //Choose the number of months for the SPI. The default setting will calculate the SPI 
                    //for 1 month. Setting the timestep to '6' will calculate the SPI for 6 months.

//=====================================================================================================

//                                    INTERACTIVE CHART
//Show interactive chart when clicking on a pixel?
var showInteractiveChart = true; //set to "true" if you want to use the interactive chart. Otherwise set to "false"

//=====================================================================================================

//                                    START OF THE SCRIPT

//******************************************************************************************************************************
//MONTHLY SPI
var thresholdMonths = ee.Number(12);

  //Create a list with a lag of one month between each list entry. Started from latest image counting backwards
var timedif = (latestImage.difference(firstImage, 'month')).divide(ee.Number.parse(timestep));

  //Creates a simple list
var list = ee.List.sequence(0, timedif); 

  //Map the dates (beginning with the latest image) of the months ends over the list, counting backwards in time
var timeListDate = list.map(function(month){
  var zero = ee.Number(0); //Is needed to substract month
  var delta = (zero.subtract(month)).multiply(ee.Number.parse(timestep)); //results in a negative counting in the list (from latest image backwards) in the steps provided by the user
  var latestDate = latestImage.advance(1, 'day');//Advance one day to include the latest image (starts counting at 00:00 o'clock)
  return latestDate.advance(delta, 'month');//returns a list of dates counted from latest date backwards
});
print(timeListDate);
  
  //Sort list according to their dates
var sortedTimeList = timeListDate.sort();

  //Calculate summed CHIRPS. Just those images will be kept, whose timeframe corresponds to the user provided number of months
var PrecipitationSum = ee.ImageCollection.fromImages(timeListDate.map(function(monthly_sum){
  var startTime = ee.Date(monthly_sum).advance(ee.Number.parse(timestep).multiply(-1), 'month');
  var endTime = ee.Date(monthly_sum);
  var filteredCHIRPS = CHIRPS.filterDate(startTime, endTime);
  var clippedCHIRPS = filteredCHIRPS.map(function(clip){return clip.clip(Egypt)});
  var imageAmount = clippedCHIRPS.size();
  var summedCollection = clippedCHIRPS
    .sum()
    .set({
      'Used_Images': imageAmount,
      'Start_Date': ee.Date(filteredCHIRPS.first().get('system:time_start')),
      'End_Date': ee.Date(filteredCHIRPS.limit(1, 'system:time_end', false).first().get('system:time_end')),
      'system:time_start': filteredCHIRPS.first().get('system:time_start'), //Add start date to new image
      'system:time_end': filteredCHIRPS.limit(1, 'system:time_end', false).first().get('system:time_end') //Add end date to new image
    });
  var time = ee.Date(summedCollection.get('system:time_end')).difference(ee.Date(summedCollection.get('system:time_start')), 'month').round();
  var summedImage = summedCollection.set({
    'Observed_Months': time
  });
return ee.Algorithms.If(
  time.gte(ee.Number.parse(timestep)), 
  summedImage);
}));


  //Copy properties of CHIRPS collection to monthly collection
var summedChirpsCollection = ee.ImageCollection(PrecipitationSum.copyProperties(CHIRPS));


  //If the SPI should be calculated for more then 12 months, a different approach has to be used.
  //The following lines decide, which approach to use.
var SPI = ee.ImageCollection(ee.Algorithms.If(
  ee.Number.parse(timestep).gte(thresholdMonths), 
  SpiGreaterEqual12(), 
  SpiSmaller12()));

  //If the SPI should be calculated for less than 12 months, the DOY information has to be used
  //to find the correct images.
function SpiSmaller12 (){
    //Calculate Statistics
  var stats = summedChirpsCollection.map(function(toStats){
    var startDOY  = ee.Date(toStats.get('system:time_start')).getRelative('day', 'year');
    var endDOY = ee.Date(toStats.get('system:time_end')).getRelative('day', 'year');
    var collectionForStats = summedChirpsCollection
      .filter(ee.Filter.calendarRange(startDOY, endDOY, 'day_of_year'))
      .reduce(ee.Reducer.stdDev().combine(ee.Reducer.mean(), null, true));
    return toStats.addBands(collectionForStats);
  });
  
  
    //Calculate SPI
  var SPI1_11 = stats.map(function(toSPI){
    var bandForSPI = toSPI.select(['precipitation'], ['SPI']);
    var calc = toSPI.expression('(precipitation - mean) / stdDev',
    {
      precipitation: bandForSPI,
      mean: toSPI.select('precipitation_mean'),
      stdDev: toSPI.select('precipitation_stdDev')});
    return toSPI.addBands(calc);
  });
return SPI1_11;
}

  //If the SPI should be calculated for 12 or more months, the DOY information are not necessary.
  //However, from 12 months onwards, it is just possible to calculate the SPI for whole years.
  //Eg. for 24 or 48 months. Calculating an SPI-18 will not work within this script!
function SpiGreaterEqual12 (){
    //Calculate Statistics
  var stats = summedChirpsCollection.map(function(toStats){
    var collectionForStats = summedChirpsCollection
      .reduce(ee.Reducer.stdDev().combine(ee.Reducer.mean(), null, true));
    return toStats.addBands(collectionForStats);
  });
  
    //Calculate SPI
  var SPI12_n = stats.map(function(toSPI){
    var bandForSPI = toSPI.select(['precipitation'], ['SPI']);
    var calc = toSPI.expression('(precipitation - mean) / stdDev',
    {
      precipitation: bandForSPI,
      mean: toSPI.select('precipitation_mean'),
      stdDev: toSPI.select('precipitation_stdDev')});
    return toSPI.addBands(calc);
  });
return SPI12_n;
}


//************************************************************************************************************* 
//Add layers to map 
print('The observed time period for the SPI-'+timestep+' begins on ', firstImage.format('YYYY-MM-dd'),'and ends on ', latestImage.format('YYYY-MM-dd'));

// Define the visualization parameters for the SPI layer
var SPImonthlyVis = {"opacity":1,"bands":["SPI"],"min":-1,"max":0.2,"palette":['d53e4f','fc8d59','fee08b','ffffbf','e6f598','99d594','3288bd']};

Map.addLayer(SPI.limit(1, 'system:time_start', false), 
  SPImonthlyVis, 
  'SPI-'+timestep+' from '+ee.Date(SPI.limit(1, 'system:time_start', false).first().get('system:time_start')).format('YYYY-MM').getInfo());

//************************************************************************************************************* 
//Create a chart of SPIs over time
//Add labels to AOI feature collection. Labels will be used for the charts
var RoiWithLabels = AOI.map(function(addLabels){
  var labelNames = addLabels
    .set('labelSpiMonth','SPI-'+timestep)
    .set('labelMonthlyPrecip', timestep+' Month(s) Precipitation Sum');
  return labelNames;
});

//Plot monthly precipitation chart
var ChartMonthlyPrecipitation = ui.Chart.image.seriesByRegion(
  summedChirpsCollection, 
  RoiWithLabels, 
  ee.Reducer.mean(),
  'precipitation', 
  resolution, //Scale in meter
  'system:time_start', 
  'labelMonthlyPrecip' //label
  ).setOptions({
    title: timestep+' Month(s) Precipitation Time Series (based on CHIRPS)',
    vAxis: {title: 'Precipitation in mm'},
    hAxis: {title: 'Year'},
    //legend: {position: 'none'},
    });
    
print(timestep+' month(s) precipitation chart based on mean values within AOI:', ChartMonthlyPrecipitation);

//Plot SPI Chart
var spiChart = ui.Chart.image.seriesByRegion(
  SPI, 
  RoiWithLabels, 
  ee.Reducer.mean(),
  'SPI', 
  resolution, //Scale in meter
  'system:time_start', 
  'labelSpiMonth' //label
  ).setOptions({
    title:  'SPI-'+timestep+' Time Series (based on CHIRPS)',
    vAxis: {title: 'SPI'},
    hAxis: {title: 'Year'},
    //legend: {position: 'none'},
    });
    
print('SPI-'+timestep+' chart based on mean values within AOI:',spiChart);


//*************************************************************************************************
//Inspector Chart
// Create a panel to hold the chart.
if (showInteractiveChart === true){
  var inspectorPanel = ui.Panel({
    style:{
      width: '400px',
      position: 'bottom-right'
    }
  });
  Map.add(inspectorPanel);
  
  // Register a function to draw a chart when a user clicks on the map.
  Map.onClick(function(coords) {
  inspectorPanel.clear();
  var point = ee.FeatureCollection(ee.Geometry.Point(coords.lon, coords.lat)).map(function(addLabels){
    var labelNames = addLabels.set('labelSPI', 'SPI-'+timestep);
  return labelNames;
  });
  
    //Button to hide Panel once the chart is loaded
  var hideButton = ui.Button({
    label: 'X',
    onClick: function(){
      inspectorPanel.clear();
    },
    style:{
      color: 'black',
    }
  });
  inspectorPanel.add(hideButton);
  
    //Chart to display data history of clicked point
  var inspectorChart = ui.Chart.image.seriesByRegion(
  SPI, 
  point, 
  ee.Reducer.mean(),
  'SPI', 
  resolution, //Scale in meter
  'system:time_start', 
  'labelSPI' //label
  ).setOptions({
    title: 'SPI-'+timestep+' Time Series (based on CHIRPS)',
    vAxis: {title: 'SPI'},
    hAxis: {title: 'Year'},
    //legend: {position: 'none'},
    });
  inspectorChart.setOptions({title: 'SPI-'+timestep+' for requested pixel'});
  inspectorPanel.add(inspectorChart);
  });
}

//************************************************************************************************* 
//Create title
//Add Title
var title = ui.Label({
  value: 'Drought monitoring using SPI & VCI',
  style:{
  fontWeight: 'bold',
  fontSize: '18px'
  }});
title.style().set('position', 'top-center');
Map.add(title);

//************************************************************************************************* 
//Create legend

//Get Max and Min values from imports-section with one decimal 
var getMonthlyVisMax = Math.round(SPImonthlyVis.max*10)/10;
var getMonthlyVisMin = Math.round(SPImonthlyVis.min*10)/10;


var vizMonthly = {min: getMonthlyVisMin, max:getMonthlyVisMax, palette:SPImonthlyVis.palette};


//Add main panel which will contain smaller panels for each legend
    var mainPanel = ui.Panel({
      layout: ui.Panel.Layout.flow('horizontal'),
      style: {
        position: 'bottom-left',
        padding: '8px 15px'
      }
    });

//***********************************************************
//Add new panel for monthly SPI legend within the main Panel
        var monthlySpiLegend = ui.Panel({
          style: {
             //position: 'bottom-left',
             padding: '0 0'
           }
        });
        mainPanel.add(monthlySpiLegend);
          
         //Create a checkbox which will enable a toggle function to show the SPI legend
        var monthlySpiCheckbox = ui.Checkbox('Show SPI-'+timestep+' Legend', false);
          //Provide information what happens if the checkbox is checked or unchecked
        monthlySpiCheckbox.onChange(function(checked) {
          if (checked) { //if it is checked, fill the SPI legend panel with information
              //Create first line of legend title
              var monthlySpiLegendTitle = ui.Label({
                value: 'SPI-'+timestep,
                style: {
                  fontWeight: 'bold',
                  fontSize: '18px',
                  margin: '0 auto',
                  padding: '0 auto'
                  }
              });
              
               // Add the title to the panel
              monthlySpiLegend.add(monthlySpiLegendTitle);
              
              // create the legend image
              var monthlySpiLon = ee.Image.pixelLonLat().select('latitude');
              var monthlySpiGradient = monthlySpiLon.multiply((vizMonthly.max-vizMonthly.min)/100.0).add(vizMonthly.min);
              var monthlySpiLegendImage = monthlySpiGradient.visualize(vizMonthly);
              
              // create text on top of legend
              var monthlySpiPanelMax = ui.Panel({
                  widgets: [
                    ui.Label(vizMonthly['max'])
                  ],
                  style: {
                    padding: '0 auto',
                    margin: '0 auto',
                    position: 'bottom-center'
                  }
                });
              
              monthlySpiLegend.add(monthlySpiPanelMax);
                
              // create thumbnail from the image
              var monthlySpiThumbnail = ui.Thumbnail({
                image: monthlySpiLegendImage, 
                params: {bbox:'0,0,10,100', dimensions:'10x150'},  
                style: {
                    padding: '0 auto',
                    margin: '0 auto',
                    position: 'bottom-center'
                  }
              });
              
              // add the thumbnail to the legend
              monthlySpiLegend.add(monthlySpiThumbnail);
              
              // create text on top of legend
              var monthlySpiPanelMin = ui.Panel({
                  widgets: [
                    ui.Label(vizMonthly['min'])
                  ],
                  style: {
                    padding: '0 auto',
                    margin: '0 auto',
                    position: 'bottom-center'
                  }
                  });
              
              monthlySpiLegend.add(monthlySpiPanelMin);
        
        
          } else {
            monthlySpiLegend.clear();
          }
        });
        print(monthlySpiCheckbox);




Map.add(mainPanel);

//************************************************************************************************* 

print('List of dates for SPI-'+timestep,sortedTimeList);

print('CHIRPS collection with SPI-'+timestep+':',SPI);

// Uncomment the code below to export the SPI image to your Google Drive. Specify EPSG:4326 for the Coordinate Reference System (CRS)
/*
Export.image.toDrive({
  image: SPI.select('SPI').first(),
  description: 'SPI',
  scale: 5550,
  region: AOI,
  fileFormat: 'GeoTIFF',
});
*/




/*
- The script was modified for use in the NASA ARSET online training: 
- Drought Monitoring, Prediction, and Projection using NASA Earth System Data
- https://appliedsciences.nasa.gov/get-involved/training/english/arset-drought-monitoring-prediction-and-projection-using-nasa-earth
- The script was adapted from the UN-SPIDER Knowledge Portal: Agriculture Drought Monitoring and Hazard Assessment using Google Earth Engine  
- https://un-spider.org/advisory-support/recommended-practices/recommended-practice-agriculture-drought-monitoring

  ===========================================================================================
                      Agriculture Drought Monitoring and Hazard Assessment
                                 Vegetation Condition Index (VCI)
  ===========================================================================================
  Within this script MODIS data is used to calculate the Vegetation Condition Index (VCI)
  for a specific time and location. 
  The VCI is expressed as % and is an indicator of the status of vegetation cover as a function of NDVI 
  minima and maxima encountered for a given ecosystem over many years. It is a better indicator of water 
  stress condition than the NDVI. The deviation of the vegetation condition is an indicator 
  of the intensity of the impact of drought on vegetation growth.

  ===========================================================================================

  :::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
                                      RUN A DEMO (optional)

   If you would like to run an example, you can use the predefined geometry below as well as 
   the other predefined parameter settings. 
   The code will take you to Zimbabwe, looking at the drought situation in April 2024. 
*/

// Define a variable "geometry" and filter the FAO GAUL feature collection for the country Zimbabwe.
var geometry = countries.filter(ee.Filter.eq('ADM0_NAME', 'Egypt'));
// Use a print statement to print to the console tab.
print (geometry);


//******************************************************************************************* 
//                                        USER INPUT

// 1. Import the shapefile of your study area, or draw a polygon in the map window below.
//
// 2. At the top, change the name of the import or drawn polygon to AOI.

//    a) If a shapefile import is used, remove // symbols in next line:
// var geometry = AOI.geometry();

//    b) If a polygon was drawn in Google Earth Engine Map, remove // symbols in next line:
// var geometry = AOI;

// 3. Set variable for which month (format 'MM'), and year (format 'YYYY') you want to 
// calculate the index:

var month = '04';
var year = '2024';

/********************************************************************************************
  ---->>> DO NOT EDIT THE SCRIPT PAST THIS POINT! (unless you know what you are doing) <<<---
  ------------------>>> now hit the'RUN' at the top of the script! <<<-----------------------
  ----> The final product will be ready for download on the right (under Console) <----
  ******************************************************************************************/

// Transformations for dates
var monthn = +month; //numerical
var yearn = +year; //numerical
var monthn1 = monthn+1;
if (monthn1 == 13) {
  var monthn1 = 01;
}
var month1 = padLeadingZeros(monthn1,2);

// Zoom to AOI
Map.centerObject(geometry,5);

//Define a variable for the visualization palette
var vis =  ['d7191c', 'fdae61', 'ffffc0', 'a6d96a', '1a9641'];

// Selection of Specific Month for analysis
var imageFilter = ee.Filter.calendarRange(monthn,monthn,'month');

//Selection of historical datasets 
var startDate = ee.String('2000-').cat(month);
var endDate = ee.String((yearn-1).toString()).cat('-').cat(month1);
if (monthn1 == 1) {
  var endDate = ee.String((yearn).toString()).cat('-').cat(month1);
}

//Define a variable for the image collecton: Terra MODIS 16-day vegetation indices (250m) and filter by start/end dates
var collection = ee.ImageCollection('MODIS/061/MOD13Q1').filterDate(startDate, endDate).filter(imageFilter);

// Define a variable for a function that multiplies an image(s) by a scale factor
var factor_NDVI = function(image){
  return image.multiply(0.0001);
};

// Define a variable that selects the NDVI band from the MODIS 16-day image collection and map the function across the collection.
var ndvi = collection.select('NDVI').map(factor_NDVI);

// Define variables that derive the minimum and maximum NDVI values across the image collection at the pixel level.
var minNDVI = ndvi.min();
var maxNDVI = ndvi.max();

// Specific month time to see the drought like condition.
var imageStartDate = year.concat('-',month);
var imageEndDate = ee.String((yearn).toString()).cat('-').cat(month1);
if (monthn1 == 1) {
  var imageEndDate = ee.String((yearn+1).toString()).cat('-').cat(month1);
}

// Define a variable that filters the image collection from start/end dates for max NDVI at the pixel level
var image = ee.ImageCollection('MODIS/061/MOD13Q1').filterDate(imageStartDate, imageEndDate).filter(imageFilter).max();

// Define variables for differencing NDVI image(s), minima, and maxima encountered.
var imageNDVI = image.select('NDVI');
imageNDVI = factor_NDVI(imageNDVI);
var cal1 = imageNDVI.subtract(minNDVI);
var cal2 = maxNDVI.subtract(minNDVI);

//Calculation of Vegetation Condition Index (VCI) and clipping according to the AOI
var VCI = cal1.divide(cal2).multiply(100).clip(geometry);

// Add the VCI layer to the map pane assigning minimum and maximum values
// *** NOTE: YOU WILL NEED TO CHANGE THE PARAMETERS FOR MIN & MAX DEPENDING ON YOUR AOI. ***
Map.addLayer(VCI,{
  min: -5,
  max: 90,
  palette: vis}, 'VCI',false);

// Apply classification criteria for the drought index.
var image02 = ee.Image(VCI.lt(10).and(VCI.gte(-10))); // Extreme drought
var image04 = ee.Image(((VCI.gte(10)).and(VCI.lt(20))).multiply(2)); // Severe drought
var image06 = ((VCI.gte(20)).and(VCI.lt(30))).multiply(3); // Moderate drought
var image08 = ((VCI.gte(30)).and(VCI.lt(40))).multiply(4); // Mild drought
var image10 = (VCI.gte(40)).multiply(5); // No drought
var Drought_Index = (image02.add(image04).add(image06).add(image08).add(image10));
var Drought_Index = Drought_Index.float();

// Uncomment the block of code below to export to Google Drive.
/*
  Export.image.toDrive({
  image: Drought_Index,
  description: 'Drought_Index_VCI',
  fileNamePrefix: 'Drought_Index_VCI',
  region: geometry,
  scale: 250,
  crs: 'EPSG:4326',
  skipEmptyTiles: true
});
*/


// Add the Drought Index layer to the map pane, setting min/max values, palette, and layer name.
Map.addLayer(Drought_Index,{
  min: 1,
  max: 5,
  palette: vis}, 'Drought Index');


//////////////////////////////////////////////////////////////////////////////////
//Creation of Classification Legend 
///////////////////////////////////////////////////////////////////////////////

var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});

// Create and add the legend title.
var legendTitle = ui.Label({
  value: 'Drought Index (VCI)',
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 4px 0',
    padding: '0'
  }
});
legend.add(legendTitle);

// Creates and styles 1 row of the legend.
var makeRow = function(color, name) {
  // Create the label that is actually the colored box.
  var colorBox = ui.Label({
    style: {
      backgroundColor: '#' + color,
      // Use padding to give the box height and width.
      padding: '8px',
      margin: '0 0 4px 0'
    }
  });

  // Create the label filled with the description text.
  var description = ui.Label({
    value: name,
    style: {margin: '0 0 4px 6px'}
  });

  return ui.Panel({
    widgets: [colorBox, description],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
};
legend.add(makeRow('d7191c', 'Extreme'));//1
legend.add(makeRow('fdae61', 'Severe'));//2
legend.add(makeRow('ffffc0', 'Moderate'));//3
legend.add(makeRow('a6d96a', 'Mild'));//4
legend.add(makeRow('1a9641', 'No Drought'));//5

Map.add(legend);

// Function used for transforming dates to string and having leading 0, if necessary
function padLeadingZeros(num, size) {
  var s = num+"";
  while (s.length < size) s = "0" + s;
  return s;
}


//=====================================================================================================
//                                          DISCLAIMER

//Every effort is made to ensure this map is free of errors but there is no warrant the map or its 
//features are either spatially or temporally accurate or fit for a particular use. This map is provided 
//without any warranty of any kind whatsoever, either express or implied.

//When adjusting the visualisation parameters in the 'Layers' menu, the information within the legends
//will not change automatically. Import the new visualisation settings, delete the predefined  parameters
//from the 'Imports' section and rename your new parameters to the same name, that was used by 
//the default parameter.

//Precipitation is usually not normally distributed. Therefore, a gamma probability function is typically applied.
//Due to limitations within the GEE, this script does not apply a gamma function and assumes a normal distribution
//of the precipitation data. Hence, the resulting SPI values can just be used as an estimator.
//=====================================================================================================
