

////----------------------------------------------------------------------------------------
//Youssef Mohamed Bakr _ +201121121000 _ (www.linkedin.com/in/youssef-bakr)
//https://github.com/Youssef-Bakr
//----------------------------------------------------------------------------------------

//----------------------------------------------------------------------------------------
Map.addLayer(Egypt, {},'Egypt');
Map.centerObject(Egypt, 5);
//----------------------------------------------------------------------------------------

// 1. Load the Global Administrative Unit Layers (GAUL) level 1
var admin1 = ee.FeatureCollection('FAO/GAUL/2015/level1');

// 2. Filter for the specific Admin-1 area (Replace Country and Region names)
// Example: Cairo Governorate in Egypt
var roi = admin1
  .filter(ee.Filter.eq('ADM0_NAME', 'Egypt'))
  .filter(ee.Filter.eq('ADM1_NAME', 'Matrouh'));

// 3. Load your satellite image (e.g., Sentinel-2 Surface Reflectance)
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
           .filterBounds(roi)
           .filterDate('2026-05-01', '2026-05-31')
           .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
           .median(); // Create a composite

// 4. Clip the image to the filtered FeatureCollection
var clippedS2 = s2.clipToCollection(roi);

// 5. Visualize
Map.centerObject(roi, 10);
Map.addLayer(roi, {color: 'red'}, 'Matrouh Boundary', false);
Map.addLayer(clippedS2, {bands: ['B4', 'B3', 'B2'], min: 0, max: 2000}, 'Clipped Sentinel-2');



// ----------------------------------------------------------------------------------------
//  Create a panel to hold widgets.
// ----------------------------------------------------------------------------------------
var panel = ui.Panel();
panel.style().set('width', '250px');
// ----------------------------------------------------------------------------------------
// Create an intro panel with labels.
// ----------------------------------------------------------------------------------------
var intro = ui.Panel([]);
panel.add(intro);
// ----------------------------------------------------------------------------------------
// Add the panel to the ui.root.
// ----------------------------------------------------------------------------------------
ui.root.insert(0, panel);

// ----------------------------------------------------------------------------------------
// Labels
// ----------------------------------------------------------------------------------------
var Label01 = ui.Label(
                        {value: 'Egypt - (Matrouh)' ,style: {fontSize: '20px', fontWeight: 'bold'},}
                      );

panel.widgets().set(1, Label01);
// ----------------------------------------------------------------------------------------
var Label02 = ui.Label('DRC Remote Sensing Unit\n', {whiteSpace: 'pre'});
panel.widgets().set(2, Label02);
// ----------------------------------------------------------------------------------------
var Label03 = ui.Label('www.linkedin.com/in/youssef-bakr', {whiteSpace: 'pre'});
panel.widgets().set(3, Label03);
// ----------------------------------------------------------------------------------------
var Label04 = ui.Label('https://github.com/Youssef-Bakr', {whiteSpace: 'pre'});
panel.widgets().set(4, Label04);
// ----------------------------------------------------------------------------------------

