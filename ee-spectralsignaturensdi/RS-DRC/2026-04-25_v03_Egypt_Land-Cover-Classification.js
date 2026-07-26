//----------------------------------------------------------------------------------------
//Youssef Mohamed Bakr
//+201121121000
//https://www.linkedin.com/in/youssef-bakr/
//https://github.com/Youssef-Bakr/
//----------------------------------------------------------------------------------------
//Remote Sensing Unit, DRC, MoA 
//Land-Cover_Classification/Egypt/2026-04-25_v03_Egypt_Land-Cover-Classification
//----------------------------------------------------------------------------------------
var modisLandcover = ee.ImageCollection('MODIS/061/MCD12Q1')
  .filterDate('2023-01-01', '2023-12-31')
  .first()
  .select('LC_Type1')
  // Quick hack to get the labels to start at zero.
  .subtract(1);
// A palette to use for visualizing landcover images. You can get this
// from the properties of the collection.
var landcoverPalette = '05450a,086a10,54a708,78d203,009900,c6b044,dcd159,' +
  'dade48,fbff13,b6ff05,27ff87,c24f44,a5a5a5,ff6d4c,69fff8,f9ffa4,1c0dff';
// A set of visualization parameters using the landcover palette.
var landcoverVisualization = {
  palette: landcoverPalette,
  min: 0,
  max: 16,
  format: 'png'
};
// Center map over the region of interest and display the MODIS landcover image.
Map.centerObject(Egypt, 6);
Map.setOptions('HYBRID');
Map.addLayer(modisLandcover.clip(Egypt), landcoverVisualization, 'Egypt Land Cover (MODIS) 2023 (500 M)');
//-----------------------------------------------------------------------------------------------
/*
MCD12Q1.061 MODIS Land Cover Type Yearly Global 500m
Dataset Availability: 2001 >> 2024
Dataset Producer: NASA LP DAAC at the USGS EROS Center
Earth Engine Snippet: ee.ImageCollection("MODIS/061/MCD12Q1") 
Cadence: 1 Year
*/
//-----------------------------------------------------------------------------------------------
var ESA_LandCover = ee.ImageCollection('ESA/WorldCover/v100').first();

var visualization = {
  bands: ['Map'],
};
Map.addLayer(ESA_LandCover.clip(Egypt), visualization, 'Egypt Land Cover (ESA) 2021 (10 M)');
//-----------------------------------------------------------------------------------------------
/*
ESA WorldCover 10m v100
Dataset Availability: 2020>>2021
Dataset Producer: ESA WorldCover Consortium
Earth Engine Snippet: ee.ImageCollection("ESA/WorldCover/v100") 
*/
//-----------------------------------------------------------------------------------------------
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
                        {value: 'Egypt Land Cover Classification' ,style: {fontSize: '20px', fontWeight: 'bold'},}
                      );

panel.widgets().set(1, Label01);
// ----------------------------------------------------------------------------------------
var Label02 = ui.Label('Egypt landcover (MODIS) 2023 (500 M):\nhttps://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MCD12Q1#bands', {whiteSpace: 'pre'});
panel.widgets().set(2, Label02);
// ----------------------------------------------------------------------------------------
var Label03 = ui.Label('Egypt landcover (ESA) 2021 (10 M)\nhttps://developers.google.com/earth-engine/datasets/catalog/ESA_WorldCover_v100#bands', {whiteSpace: 'pre'});
panel.widgets().set(3, Label03);
// ----------------------------------------------------------------------------------------
var Label04 = ui.Label('Egypt landcover (USGS Landsat 8) 2026 (30 M)\nUpSampled from (MODIS)(500 M) ', {whiteSpace: 'pre'});
panel.widgets().set(4, Label04);




var Label05 = ui.Label('Remote Sensing Unit, DRC, MoA \nhttps://www.linkedin.com/in/youssef-bakr\nhttps://github.com/Youssef-Bakr\n+201121121000', {whiteSpace: 'pre'});
panel.widgets().set(5, Label05);




//-------------------------------------------------------------------------------------------------------------------------
//----------------(https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MCD12Q1#bands)--------------------
//----------------(https://developers.google.com/earth-engine/datasets/catalog/ESA_WorldCover_v100#bands)------------------
//-------------------------------------------------------------------------------------------------------------------------
/*
MCD12Q1.061 MODIS Land Cover Type Yearly Global 500m
Dataset Availability: 2001 >> 2024
Dataset Producer: NASA LP DAAC at the USGS EROS Center
Earth Engine Snippet: ee.ImageCollection("MODIS/061/MCD12Q1") 
Cadence: 1 Year
*/
//-----------------------------------------------------------------------------------------------
/*
LC_Type1 Class Table

Value	Color	Description
1	#05450a	
Evergreen Needleleaf Forests: dominated by evergreen conifer trees (canopy >2m). Tree cover >60%.

2	#086a10	
Evergreen Broadleaf Forests: dominated by evergreen broadleaf and palmate trees (canopy >2m). Tree cover >60%.

3	#54a708	
Deciduous Needleleaf Forests: dominated by deciduous needleleaf (larch) trees (canopy >2m). Tree cover >60%.

4	#78d203	
Deciduous Broadleaf Forests: dominated by deciduous broadleaf trees (canopy >2m). Tree cover >60%.

5	#009900	
Mixed Forests: dominated by neither deciduous nor evergreen (40-60% of each) tree type (canopy >2m). Tree cover >60%.

6	#c6b044	
Closed Shrublands: dominated by woody perennials (1-2m height) >60% cover.

7	#dcd159	
Open Shrublands: dominated by woody perennials (1-2m height) 10-60% cover.

8	#dade48	
Woody Savannas: tree cover 30-60% (canopy >2m).

9	#fbff13	
Savannas: tree cover 10-30% (canopy >2m).

10	#b6ff05	
Grasslands: dominated by herbaceous annuals (<2m).

11	#27ff87	
Permanent Wetlands: permanently inundated lands with 30-60% water cover and >10% vegetated cover.

12	#c24f44	
cropland.

13	#a5a5a5	
Urban and Built-up Lands: at least 30% impervious surface area including building materials, asphalt and vehicles.

14	#ff6d4c	
Cropland/Natural Vegetation Mosaics: mosaics of small-scale cultivation 40-60% with natural tree, shrub, or herbaceous vegetation.

15	#69fff8	
Permanent Snow and Ice: at least 60% of area is covered by snow and ice for at least 10 months of the year.

16	#f9ffa4	
(sand, rock, soil) areas with less than 10% vegetation.

17	#1c0dff	
Water Bodies: at least 60% of area is covered by permanent water bodies.
*/
//-------------------------------------------------------------------------------------------------------------------------
//----------------(https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MCD12Q1#bands)--------------------
//----------------(https://developers.google.com/earth-engine/datasets/catalog/ESA_WorldCover_v100#bands)------------------
//-------------------------------------------------------------------------------------------------------------------------
/*
ESA WorldCover 10m v100
ataset Availability: 2020>>2021
Dataset Producer: ESA WorldCover Consortium
Earth Engine Snippet: ee.ImageCollection("ESA/WorldCover/v100")
*/
/*
Pixel size: 10 meters (all bands)

Name	Pixel Size	Description
Map	10 meters	
Landcover class

Map Class Table

Value	Color	Description
10	#006400	
Tree cover

20	#ffbb22	
Shrubland

30	#ffff4c	
Grassland

40	#f096ff	
Cropland

50	#fa0000	
Built-up

60	#b4b4b4	
Bare / sparse vegetation

70	#f0f0f0	
Snow and ice

80	#0064c8	
Permanent water bodies

90	#0096a0	
Herbaceous wetland

95	#00cf75	
Mangroves

100	#fae6a0	
Moss and lichen
*/
//-------------------------------------------------------------------------------------------------------------------------
//----------------(https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MCD12Q1#bands)--------------------
//----------------(https://developers.google.com/earth-engine/datasets/catalog/ESA_WorldCover_v100#bands)------------------
//-------------------------------------------------------------------------------------------------------------------------

/*
ai & Machine Learning
*/

// Upsample MODIS landcover classification (500m) to Landsat
// resolution (30m) using a supervised classifier.

var geometry = ee.Geometry.Polygon(
  [[[29.972731783841393, 31.609824974226175],
    [29.972731783841393, 30.110383818311096],
    [32.56550522134139, 30.110383818311096],
    [32.56550522134139, 31.609824974226175]]], null, false);
    
    
/*
Dataset Availability: 2001-01-01 >>> 2024-01-01
Dataset Producer
NASA LP DAAC at the USGS EROS Center
Earth Engine Snippet: ee.ImageCollection("MODIS/061/MCD12Q1") 
*/
// Use the MCD12 land-cover as training data.
// See the collection docs to get details on classification system.
var modisLandcover = ee.ImageCollection('MODIS/061/MCD12Q1')
  .filterDate('2023-01-01', '2023-12-31')
  .first()
  .select('LC_Type1')
  // Quick hack to get the labels to start at zero.
  .subtract(1);

// A palette to use for visualizing landcover images. You can get this
// from the properties of the collection.
var landcoverPalette = '05450a,086a10,54a708,78d203,009900,c6b044,dcd159,' +
  'dade48,fbff13,b6ff05,27ff87,c24f44,a5a5a5,ff6d4c,69fff8,f9ffa4,1c0dff';

// A set of visualization parameters using the landcover palette.
var landcoverVisualization = {
  palette: landcoverPalette,
  min: 0,
  max: 16,
  format: 'png'
};

// Center map over the region of interest and display the MODIS landcover image.
Map.centerObject(geometry, 11);
Map.addLayer(modisLandcover, landcoverVisualization, 'Egypt landcover (MODIS) 2023 (500 M) ');

// Load and filter Landsat data.
var l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1')
  .filterBounds(geometry)
  .filterDate('2026-01-01', '2026-04-01');

// Draw the Landsat composite, visualizing true color bands.
var landsatComposite = ee.Algorithms.Landsat.simpleComposite({
  collection: l8,
  asFloat: true
});
Map.addLayer(landsatComposite, {
  min: 0,
  max: 0.3,
  bands: ['B3', 'B2', 'B1']
}, 'Landsat8 composite');

// Make a training dataset by sampling the stacked images.
var training = modisLandcover.addBands(landsatComposite).sample({
  region: geometry,
  scale: 30,
  numPixels: 1000
});

// Train a classifier using the training data.
var classifier = ee.Classifier.smileCart().train({
  features: training,
  classProperty: 'LC_Type1',
});

// Apply the classifier to the original composite.
var upsampled = landsatComposite.classify(classifier);

// Draw the upsampled landcover image.
Map.addLayer(upsampled, landcoverVisualization, 'Upsampled landcover (Landsat 8) 2026 (30 M)');

// Show the training area.
Map.addLayer(geometry, {}, 'Machine Learning Training Region', false);
//-------------------------------------------------------------------------------------------------------------------------
/*
USGS Landsat 8 Collection 2 Tier 1 Raw Scenes
https://developers.google.com/earth-engine/datasets/catalog/landsat-8
Dataset Availability: 2013 >> 2026
Dataset Producer: USGS
Earth Engine Snippet: ee.ImageCollection("LANDSAT/LC08/C02/T1") 
Revisit Interval: 16 Days


Bands

Pixel size: varies

Name	Pixel Size	Wavelength	Description
B1	30 meters	0.43 - 0.45 μm	
Coastal aerosol

B2	30 meters	0.45 - 0.51 μm	
Blue

B3	30 meters	0.53 - 0.59 μm	
Green

B4	30 meters	0.64 - 0.67 μm	
Red

B5	30 meters	0.85 - 0.88 μm	
Near infrared

B6	30 meters	1.57 - 1.65 μm	
Shortwave infrared 1

B7	30 meters	2.11 - 2.29 μm	
Shortwave infrared 2

B8	15 meters	0.52 - 0.90 μm	
Band 8 Panchromatic

B9	30 meters	1.36 - 1.38 μm	
Cirrus

B10	30 meters	10.60 - 11.19 μm	
Thermal infrared 1, resampled from 100m to 30m

B11	30 meters	11.50 - 12.51 μm	
Thermal infrared 2, resampled from 100m to 30m

QA_PIXEL	30 meters	None	
Landsat Collection 2 OLI/TIRS QA Bitmask

Bitmask for QA_PIXEL

QA_RADSAT	30 meters	None	
Radiometric saturation QA

Bitmask for QA_RADSAT

SAA	30 meters	None	
Solar Azimuth Angle

SZA	30 meters	None	
Solar Zenith Angle

VAA	30 meters	None	
View Azimuth Angle

VZA	30 meters	None	
View Zenith Angle
https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC08_C02_T1#image-properties
*/
//-------------------------------------------------------------------------------------------------------------------------
/*
MCD12Q1.061 MODIS Land Cover Type Yearly Global 500m
MODIS/061/MCD12Q1
Dataset Availability: 2001-01-01 >>>> 2024-01-01
Dataset Producer: NASA LP DAAC at the USGS EROS Center
Earth Engine Snippet: ee.ImageCollection("MODIS/061/MCD12Q1") 
Cadence: 1 Year

Bands

Pixel size: 500 meters (all bands)

Name	Units	Min	Max	Pixel Size	Description
LC_Type1				500 meters	
Land Cover Type 1: Annual International Geosphere-Biosphere Programme (IGBP) classification

LC_Type2				500 meters	
Land Cover Type 2: Annual University of Maryland (UMD) classification

LC_Type3				500 meters	
Land Cover Type 3: Annual Leaf Area Index (LAI) classification

LC_Type4				500 meters	
Land Cover Type 4: Annual BIOME-Biogeochemical Cycles (BGC) classification

LC_Type5				500 meters	
Land Cover Type 5: Annual Plant Functional Types classification

LC_Prop1_Assessment	%	0	100	500 meters	
LCCS1 land cover layer confidence

LC_Prop2_Assessment	%	0	100	500 meters	
LCCS2 land use layer confidence

LC_Prop3_Assessment	%	0	100	500 meters	
LCCS3 surface hydrology layer confidence

LC_Prop1				500 meters	
FAO-Land Cover Classification System 1 (LCCS1) land cover layer

LC_Prop2				500 meters	
FAO-LCCS2 land use layer

LC_Prop3				500 meters	
FAO-LCCS3 surface hydrology layer

QC				500 meters	
Product quality flags

LW				500 meters	
Binary land (class 2) / water (class 1) mask derived from MOD44W





LC_Type1 Class Table

Value	Color	Description
1	#05450a	
Evergreen Needleleaf Forests: dominated by evergreen conifer trees (canopy >2m). Tree cover >60%.

2	#086a10	
Evergreen Broadleaf Forests: dominated by evergreen broadleaf and palmate trees (canopy >2m). Tree cover >60%.

3	#54a708	
Deciduous Needleleaf Forests: dominated by deciduous needleleaf (larch) trees (canopy >2m). Tree cover >60%.

4	#78d203	
Deciduous Broadleaf Forests: dominated by deciduous broadleaf trees (canopy >2m). Tree cover >60%.

5	#009900	
Mixed Forests: dominated by neither deciduous nor evergreen (40-60% of each) tree type (canopy >2m). Tree cover >60%.

6	#c6b044	
Closed Shrublands: dominated by woody perennials (1-2m height) >60% cover.

7	#dcd159	
Open Shrublands: dominated by woody perennials (1-2m height) 10-60% cover.

8	#dade48	
Woody Savannas: tree cover 30-60% (canopy >2m).

9	#fbff13	
Savannas: tree cover 10-30% (canopy >2m).

10	#b6ff05	
Grasslands: dominated by herbaceous annuals (<2m).

11	#27ff87	
Permanent Wetlands: permanently inundated lands with 30-60% water cover and >10% vegetated cover.

12	#c24f44	
cropland.

13	#a5a5a5	
Urban and Built-up Lands: at least 30% impervious surface area including building materials, asphalt and vehicles.

14	#ff6d4c	
Cropland/Natural Vegetation Mosaics: mosaics of small-scale cultivation 40-60% with natural tree, shrub, or herbaceous vegetation.

15	#69fff8	
Permanent Snow and Ice: at least 60% of area is covered by snow and ice for at least 10 months of the year.

16	#f9ffa4	
(sand, rock, soil) areas with less than 10% vegetation.

17	#1c0dff	
Water Bodies: at least 60% of area is covered by permanent water bodies.

LC_Type2 Class Table

Value	Color	Description
0	#1c0dff	
Water Bodies: at least 60% of area is covered by permanent water bodies.

1	#05450a	
Evergreen Needleleaf Forests: dominated by evergreen conifer trees (canopy >2m). Tree cover >60%.

2	#086a10	
Evergreen Broadleaf Forests: dominated by evergreen broadleaf and palmate trees (canopy >2m). Tree cover >60%.

3	#54a708	
Deciduous Needleleaf Forests: dominated by deciduous needleleaf (larch) trees (canopy >2m). Tree cover >60%.

4	#78d203	
Deciduous Broadleaf Forests: dominated by deciduous broadleaf trees (canopy >2m). Tree cover >60%.

5	#009900	
Mixed Forests: dominated by neither deciduous nor evergreen (40-60% of each) tree type (canopy >2m). Tree cover >60%.

6	#c6b044	
Closed Shrublands: dominated by woody perennials (1-2m height) >60% cover.

7	#dcd159	
Open Shrublands: dominated by woody perennials (1-2m height) 10-60% cover.

8	#dade48	
Woody Savannas: tree cover 30-60% (canopy >2m).

9	#fbff13	
Savannas: tree cover 10-30% (canopy >2m).

10	#b6ff05	
Grasslands: dominated by herbaceous annuals (<2m).

11	#27ff87	
Permanent Wetlands: permanently inundated lands with 30-60% water cover and >10% vegetated cover.

12	#c24f44	
cropland.

13	#a5a5a5	
Urban and Built-up Lands: at least 30% impervious surface area including building materials, asphalt and vehicles.

14	#ff6d4c	
Cropland/Natural Vegetation Mosaics: mosaics of small-scale cultivation 40-60% with natural tree, shrub, or herbaceous vegetation.

15	#f9ffa4	
Non-Vegetated Lands: at least 60% of area is non-vegetated barren (sand, rock, soil) or permanent snow and ice with less than 10% vegetation.

LC_Type3 Class Table

Value	Color	Description
0	#1c0dff	
Water Bodies: at least 60% of area is covered by permanent water bodies.

1	#b6ff05	
Grasslands: dominated by herbaceous annuals (<2m) including cereal croplands.

2	#dcd159	
Shrublands: shrub (1-2m) cover >10%.

3	#c24f44	
Broadleaf Croplands: bominated by herbaceous annuals (<2m) that are cultivated with broadleaf crops.

4	#fbff13	
Savannas: between 10-60% tree cover (>2m).

5	#086a10	
Evergreen Broadleaf Forests: dominated by evergreen broadleaf and palmate trees (canopy >2m). Tree cover >60%.

6	#78d203	
Deciduous Broadleaf Forests: dominated by deciduous broadleaf trees (canopy >2m). Tree cover >60%.

7	#05450a	
Evergreen Needleleaf Forests: dominated by evergreen conifer trees (canopy >2m). Tree cover >60%.

8	#54a708	
Deciduous Needleleaf Forests: dominated by deciduous needleleaf (larch) trees (canopy >2m). Tree cover >60%.

9	#f9ffa4	
Non-Vegetated Lands: at least 60% of area is non-vegetated barren (sand, rock, soil) or permanent snow and ice with less than 10% vegetation.

10	#a5a5a5	
Urban and Built-up Lands: at least 30% impervious surface area including building materials, asphalt and vehicles.

LC_Type4 Class Table

Value	Color	Description
0	#1c0dff	
Water Bodies: at least 60% of area is covered by permanent water bodies.

1	#05450a	
Evergreen Needleleaf Vegetation: dominated by evergreen conifer trees and shrubs (>1m). Woody vegetation cover >10%.

2	#086a10	
Evergreen Broadleaf Vegetation: dominated by evergreen broadleaf and palmate trees and shrubs (>1m). Woody vegetation cover

10%.

3	#54a708	
Deciduous Needleleaf Vegetation: dominated by deciduous needleleaf (larch) trees and shrubs (>1m). Woody vegetation cover

10%.

4	#78d203	
Deciduous Broadleaf Vegetation: dominated by deciduous broadleaf trees and shrubs (>1m). Woody vegetation cover >10%.

5	#009900	
Annual Broadleaf Vegetation: dominated by herbaceous annuals (<2m). At least 60% cultivated broadleaf crops.

6	#b6ff05	
Annual Grass Vegetation: dominated by herbaceous annuals (<2m) including cereal croplands.

7	#f9ffa4	
Non-Vegetated Lands: at least 60% of area is non-vegetated barren (sand, rock, soil) or permanent snow/ice with less than 10% vegetation.

8	#a5a5a5	
Urban and Built-up Lands: at least 30% impervious surface area including building materials, asphalt, and vehicles.

LC_Type5 Class Table

Value	Color	Description
0	#1c0dff	
Water Bodies: at least 60% of area is covered by permanent water bodies.

1	#05450a	
Evergreen Needleleaf Trees: dominated by evergreen conifer trees (>2m). Tree cover >10%.

2	#086a10	
Evergreen Broadleaf Trees: dominated by evergreen broadleaf and palmate trees (>2m). Tree cover >10%.

3	#54a708	
Deciduous Needleleaf Trees: dominated by deciduous needleleaf (larch) trees (>2m). Tree cover >10%.

4	#78d203	
Deciduous Broadleaf Trees: dominated by deciduous broadleaf trees (>2m). Tree cover >10%.

5	#dcd159	
Shrub: Shrub (1-2m) cover >10%.

6	#b6ff05	
not cultivated.

7	#dade48	
Cereal Croplands: dominated by herbaceous annuals (<2m). At least 60% cultivated cereal crops.

8	#c24f44	
Broadleaf Croplands: dominated by herbaceous annuals (<2m). At least 60% cultivated broadleaf crops.

9	#a5a5a5	
Urban and Built-up Lands: at least 30% impervious surface area including building materials, asphalt, and vehicles.

10	#69fff8	
Permanent Snow and Ice: at least 60% of area is covered by snow and ice for at least 10 months of the year.

11	#f9ffa4	
Non-Vegetated Lands: at least 60% of area is non-vegetated barren (sand, rock, soil) with less than 10% vegetation.

LC_Prop1 Class Table

Value	Color	Description
1	#f9ffa4	
(sand, rock, soil) or permanent snow/ice with less than 10% vegetation.

2	#69fff8	
Permanent Snow and Ice: at least 60% of area is covered by snow and ice for at least 10 months of the year.

3	#1c0dff	
Water Bodies: at least 60% of area is covered by permanent water bodies.

11	#05450a	
Evergreen Needleleaf Forests: dominated by evergreen conifer trees (>2m). Tree cover >60%.

12	#086a10	
Evergreen Broadleaf Forests: dominated by evergreen broadleaf and palmate trees (>2m). Tree cover >60%.

13	#54a708	
Deciduous Needleleaf Forests: dominated by deciduous needleleaf (larch) trees (>2m). Tree cover >60%.

14	#78d203	
Deciduous Broadleaf Forests: dominated by deciduous broadleaf trees (>2m). Tree cover >60%.

15	#005a00	
Mixed Broadleaf/Needleleaf Forests: co-dominated (40-60%) by broadleaf deciduous and evergreen needleleaf tree (>2m) types. Tree cover >60%.

16	#009900	
Mixed Broadleaf Evergreen/Deciduous Forests: co-dominated (40-60%) by broadleaf evergreen and deciduous tree (>2m) types. Tree cover >60%.

21	#006c00	
Open Forests: tree cover 30-60% (canopy >2m).

22	#00d000	
Sparse Forests: tree cover 10-30% (canopy >2m).

31	#b6ff05	
Dense Herbaceous: dominated by herbaceous annuals (<2m) at least 60% cover.

32	#98d604	
Sparse Herbaceous: dominated by herbaceous annuals (<2m) 10-60% cover.

41	#dcd159	
Dense Shrublands: dominated by woody perennials (1-2m)

60% cover.

42	#f1fb58	
Shrubland/Grassland Mosaics: dominated by woody perennials (1-2m) 10-60% cover with dense herbaceous annual understory.

43	#fbee65	
Sparse Shrublands: dominated by woody perennials (1-2m) 10-60% cover with minimal herbaceous understory.

LC_Prop2 Class Table

Value	Color	Description
1	#f9ffa4	
(sand, rock, soil) or permanent snow/ice with less than 10% vegetation.

2	#69fff8	
Permanent Snow and Ice: at least 60% of area is covered by snow and ice for at least 10 months of the year.

3	#1c0dff	
Water Bodies: at least 60% of area is covered by permanent water bodies.

9	#a5a5a5	
Urban and Built-up Lands: at least 30% of area is made up ofimpervious surfaces including building materials, asphalt, and vehicles.

10	#003f00	
Dense Forests: tree cover >60% (canopy >2m).

20	#006c00	
Open Forests: tree cover 10-60% (canopy >2m).

25	#e3ff77	
Forest/Cropland Mosaics: mosaics of small-scale cultivation 40-60% with >10% natural tree cover.

30	#b6ff05	
Natural Herbaceous: dominated by herbaceous annuals (<2m). At least 10% cover.

35	#93ce04	
Natural Herbaceous/Croplands Mosaics: mosaics of small-scale cultivation 40-60% with natural shrub or herbaceous vegetation.

36	#77a703	
Herbaceous Croplands: dominated by herbaceous annuals (<2m). At least 60% cover. Cultivated fraction >60%.

40	#dcd159	
Shrublands: shrub cover >60% (1-2m).

LC_Prop3 Class Table

Value	Color	Description
1	#f9ffa4	
(sand, rock, soil) or permanent snow/ice with less than 10% vegetation.

2	#69fff8	
Permanent Snow and Ice: at least 60% of area is covered by snow and ice for at least 10 months of the year.

3	#1c0dff	
Water Bodies: at least 60% of area is covered by permanent water bodies.

10	#003f00	
Dense Forests: tree cover >60% (canopy >2m).

20	#006c00	
Open Forests: tree cover 10-60% (canopy >2m).

27	#72834a	
Woody Wetlands: shrub and tree cover >10% (>1m). Permanently or seasonally inundated.

30	#b6ff05	
Grasslands: dominated by herbaceous annuals (<2m) >10% cover.

40	#c6b044	
Shrublands: shrub cover >60% (1-2m).

50	#3aba73	
Herbaceous Wetlands: dominated by herbaceous annuals (<2m) >10% cover. Permanently or seasonally inundated.

51	#1e9db3	
months of the year.

QC Class Table

Value	Color	Description
0	None	
Classified land: has a classification label and is land according to the water mask.

1	None	
Unclassified land: not classified because of missing data but land according to the water mask, labeled as barren.

2	None	
Classified water: has a classification label and is water according to the water mask.

3	None	
Unclassified water: not classified because of missing data but water according to the water mask.

4	None	
Classified sea ice: classified as snow/ice but water mask says it is water and less than 100m elevation, switched to water.

5	None	
Misclassified water: classified as water but water mask says it is land, switched to secondary label.

6	None	
Omitted snow/ice: land according to the water mask that was classified as something other than snow but with a maximum annual temperature below 1°C, relabeled as snow/ice.

7	None	
Misclassified snow/ice: land according to the water mask that was classified as snow but with a minimum annual temperature greater than 1°C, relabeled as barren.

8	None	
Backfilled label: missing label from stabilization, filled with the pre-stabilized result.

9	None	
Forest type changed: climate-based change to forest class.

LW Class Table

Value	Color	Description
1	#1c0dff	
Water

2	#f9ffa4	
Land,


https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MCD12Q1
*/
//-------------------------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------------------------
//----------------(https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MCD12Q1#bands)--------------------
//----------------(https://developers.google.com/earth-engine/datasets/catalog/ESA_WorldCover_v100#bands)------------------
//-------------------------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------------------------
//----------------(https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC08_C02_T1)------------------------
//----------------(https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MCD12Q1)--------------------------
//-------------------------------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------
//Youssef Mohamed Bakr
//+201121121000
//https://www.linkedin.com/in/youssef-bakr/
//https://github.com/Youssef-Bakr/
//----------------------------------------------------------------------------------------

