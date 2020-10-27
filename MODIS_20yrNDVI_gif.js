// Author:  Mitchell Lazarz
// Created in javascript using Google Earth Engine
// Creation Date:  26 October 2020
// Description:  This code uses NDVI from the Modis satellite to create a .gif displaying the 20 year median NDVI over a 1-year period for Mexico in Google Earth Engine.


// NDVI band is selected from MODIS Terra Vegetation Indicies 16-day Global 1km dataset
var col = ee.ImageCollection('MODIS/006/MOD13A2').select('NDVI');

// The country, Mexico, is defined as a mask to clip the NDVI data by.
var mask = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017')
  .filter(ee.Filter.eq('country_co', 'MX'));

// The regional bounds of animation frame is defined using a geometry import.
var region = 
        ee.Geometry.Polygon(
        [[[-118.14470155891713, 32.99216615144257],
          [-118.14470155891713, 14.181417744820045],
          [-85.97673280891713, 14.181417744820045],
          [-85.97673280891713, 32.99216615144257]]], null, false);; 

// A function is created to create a list of the day of year (doy) of each image in the 20 year image collection.
col = col.map(function(img) {
  var doy = ee.Date(img.get('system:time_start')).getRelative('day', 'year');
  return img.set('doy', doy);
});

// A one year period is defined.
var distinctDOY = col.filterDate('2019-01-01', '2020-01-01');

// A filter is defined that identifies which images from the complete collection share the same DOY from the distinct DOY collection.
var filter = ee.Filter.equals({leftField: 'doy', rightField: 'doy'});

// A join is defined which saves all doy matches into a property called 'doy_matches'.
var join = ee.Join.saveAll('doy_matches');

// The join is applied which puts all images in the original collection into an image collection list that orders images by distict doy.
var joinCol = ee.ImageCollection(join.apply(distinctDOY, col, filter));

// A function is called that calculates median NDVI values across pixels in matching doy image collections.
var comp = joinCol.map(function(img) {
  var doyCol = ee.ImageCollection.fromImages(
    img.get('doy_matches')
  );
  return doyCol.reduce(ee.Reducer.median());
});

// Visualization parameters, min and max values and color palette, are defined for display.
var visParams = {
  min: 0.0,
  max: 9000.0,
  palette: [
    'FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718', '74A901',
    '66A000', '529400', '3E8601', '207401', '056201', '004C00', '023B01',
    '012E01', '011D01', '011301'
  ],
};

// Each the median NDVI image for each doy is mapped using the visualization parameters and clipped to the previously defined mask.
var rgbVis = comp.map(function(img) {
  return img.visualize(visParams).clip(mask);
});

// The GIF parameters are defined.  The earlier defined region as the extent, 600 pixel dimension as the larger side of the gif, the coordinate reference system, and frames per second.   
var gifParams = {
  'region': region,
  'dimensions': 600,
  'crs': 'EPSG:3857',
  'framesPerSecond': 10
};

// The .gif URL is printed to the console.
print(rgbVis.getVideoThumbURL(gifParams));
