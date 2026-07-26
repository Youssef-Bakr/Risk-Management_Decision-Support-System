//----------------------------------------------------------------------------------------
//Egypt_Vegetation_Area/2026-04-07_v01_Egypt-Vegetation-Area_Y_DRC_UNCCD
//Youssef Mohamed Bakr _ +201121121000 _ (www.linkedin.com/in/youssef-bakr)
//----------------------------------------------------------------------------------------
//NDVI (MODIS/061/MOD13Q1)
/*
MOD13Q1.061 Terra Vegetation Indices 16-Day Global 250m
MODIS/061/MOD13Q1
Dataset Availability:2000–2026
Dataset Provider:NASA LP DAAC at the USGS EROS Center
*/
// ----------------------------------------------------------------------------------------
Map.addLayer(Egypt, {}, 'Egypt');
//Locate center and zoom level
Map.centerObject(Egypt,6);
//Map.setOptions('HYBRID');
// ----------------------------------------------------------------------------------------
var area_Egypt = Egypt.geometry().area();
var area_Egypt_SqKm = ee.Number(area_Egypt).divide(1e6).round();
print ('Total Area  (m²)', area_Egypt);
print ('Total Area  (Km²)', area_Egypt_SqKm);
print ('Total Area (Feddan)', area_Egypt_SqKm.multiply(238));
// ----------------------------------------------------------------------------------------
var dataset = ee.ImageCollection('MODIS/061/MOD13Q1')
                  .filter(ee.Filter.date('2024-01-01', '2026-04-06'))
// ----------------------------------------------------------------------------------------                  
var ndvi = dataset.select('NDVI');
// ----------------------------------------------------------------------------------------
var ndviVis = {
  min: 0.0,
  max: 8000.0,
  palette: [
    'FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718', '74A901',
    '66A000', '529400', '3E8601', '207401', '056201', '004C00', '023B01',
    '012E01', '011D01', '011301'
  ],
};
// ----------------------------------------------------------------------------------------
Map.addLayer(ndvi.median().clip(Egypt), ndviVis, 'NDVI (MODIS/061/MOD13Q1)');
// ----------------------------------------------------------------------------------------
var area_pxa = ndvi.median().gt(3000).multiply(ee.Image.pixelArea())
                    .reduceRegion(ee.Reducer.sum(),Egypt,250,null,null,false,1e13)
                    ;
print ('area_pxa',area_pxa);
var NDVI_gt3000_area = area_pxa.get('NDVI');
print ('NDVI_gt3000_area',NDVI_gt3000_area);
var NDVI_gt3000_area_m2 = ee.Number(NDVI_gt3000_area);
var NDVI_gt3000_area_Km2 = NDVI_gt3000_area_m2.divide(1e6);
var NDVI_gt3000_area_Feddan = NDVI_gt3000_area_Km2.multiply(238);
print ('VegetationArea using ee.Image.pixelArea (km²)', NDVI_gt3000_area_Km2);
print ('VegetationArea by Feddan', NDVI_gt3000_area_Feddan);
// ----------------------------------------------------------------------------------------
//  Create a panel to hold widgets.
// ----------------------------------------------------------------------------------------
var panel = ui.Panel();
panel.style().set('width', '600px');
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
                        {value: ' MOD13Q1.061 Terra Vegetation Indices 16-Day Global 250m \n  MODIS/061/MOD13Q1 \n  Dataset Availability:2000–2026 \n   Dataset Provider:NASA LP DAAC at the USGS EROS Center ',style: {fontSize: '10px', fontWeight: 'bold'},}
                      );    
panel.widgets().set(1, Label01);
// ----------------------------------------------------------------------------------------
var Label02 = ui.Label('------------------------------------------------------------------------');
panel.widgets().set(2, Label02);
// ----------------------------------------------------------------------------------------
var Label03 = ui.Label(
                        {value:  ' Egypt ' ,style: {fontSize: '30px', fontWeight: 'bold'},}
                      );  
   
panel.widgets().set(3, Label03);
// ----------------------------------------------------------------------------------------
var Label04 = ui.Label('------------------------------------------------------------------------');
panel.widgets().set(4, Label04);
// ----------------------------------------------------------------------------------------
var Label05 = ui.Label(
                        {value: ' Date: (2025-01-01 >>> 2026-04-06)' ,style: {fontSize: '20px', fontWeight: 'bold'},}
                      );  
   
panel.widgets().set(5, Label05);
// ----------------------------------------------------------------------------------------

var Label06 = ui.Label(
                        {value: ' Calculating Vegetation Area (km²), Please Wait' ,style: {fontSize: '20px', fontWeight: 'bold'},}
                      );  
   
panel.widgets().set(6, Label06);
NDVI_gt3000_area_Km2.evaluate(function(val){
                                                 Label06.setValue('Vegetation Area  (km²):   ' + val.toFixed(1))});
// ----------------------------------------------------------------------------------------
var Label07 = ui.Label(
                        {value: ' Calculating Vegetation Area (Feddan), Please Wait' ,style: {fontSize: '20px', fontWeight: 'bold'},}
                      );  
panel.widgets().set(7, Label07);

NDVI_gt3000_area_Feddan.evaluate(function(val){
                                                 Label07.setValue('Vegetation Area (Feddan): ' + val.toFixed(1))});
// ----------------------------------------------------------------------------------------
var Label08 = ui.Label('------------------------------------------------------------------------');
panel.widgets().set(8, Label08);
// ----------------------------------------------------------------------------------------
var Label09 = ui.Label('(DRC)(MoA) _ (Egypt_Vegetation_Area/2026-04-07_v01_Egypt-Vegetation-Area_Y_DRC_UNCCD)', {whiteSpace: 'pre'});
panel.widgets().set(9, Label09);
// ----------------------------------------------------------------------------------------
var Label10 = ui.Label('------------------------------------------------------------------------');
panel.widgets().set(10, Label10);
// ----------------------------------------------------------------------------------------
