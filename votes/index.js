  'use strict';

  var convexHull = require("quick-hull-2d");
  var { createCanvas, registerFont, Canvas, Image } = require('canvas');
  registerFont(__dirname + '/Roboto-Light.ttf', { family: 'Roboto' })
  var fs = require('fs');
  var async = require('async');

  var outputConter = 0;

  var exports = module.exports = {};

  exports.prepareImage = function(imagePath, outputImagePath, callback) {

    var imageData = loadImage(imagePath);

    imageData = scaleImage(imageData, 0.8);

    var closedImage = closing(imageData);

    var histogram = getHistogram(closedImage);
    var threshold = otsu(histogram, closedImage.width * closedImage.height);

    var binarizedImage = binarize(closedImage, threshold);

    writeImageDataToFile(binarizedImage, outputImagePath, (err) => {
      if (err) return callback(err, null);
      callback(null);
    });
  }

  exports.getVotesFromPreparedImage = function(preparedImagePath, rawImagePath, outputImagePath, page, labels, callback) {

    var imageData = loadImage(rawImagePath);
    imageData = scaleImage(imageData, 0.8);
    imageData = warpImage(imageData, page);

    var preparedImageData = loadImage(preparedImagePath);
    preparedImageData = warpImage(preparedImageData, page);

    var squares = getGridSquares(preparedImageData.width, preparedImageData.height);
    var voteSquares = findVotes(preparedImageData, squares)

    var gridImage = drawGridSquares(imageData, voteSquares, labels);

    var votes = countVotes(squares);

    writeImageDataToFile(gridImage, outputImagePath, (err) => {
      if (err) return callback(err, null);
      callback(null, votes);
    });
  }


  exports.getVotes = function(imagePath, outputImagePath, page, callback) {

    var imageData = loadImage(imagePath);

    //printOutputImage(imageData, 'original.png');

    imageData = scaleImage(imageData, 0.8);
    //printOutputImage(imageData, 'scaled.png');

    imageData = warpImage(imageData, page);
    //printOutputImage(imageData, 'warped.png');

    var closedImage = closing(imageData);
    //printOutputImage(closedImage, 'closed.png');

    var histogram = getHistogram(closedImage);
    var threshold = otsu(histogram, closedImage.width * closedImage.height);

    var binarizedImage = binarize(closedImage, threshold);
    //printOutputImage(binarizedImage, 'binarized.png');

    var squares = getGridSquares(imageData.width, imageData.height);
    var voteSquares = findVotes(binarizedImage, squares)
    //var gridBinarizedImage = drawGridSquares(binarizedImage, voteSquares);
    //printOutputImage(gridBinarizedImage, 'grid-binarized.png');
    var gridImage = drawGridSquares(imageData, voteSquares, null);
    //printOutputImage(gridImage, 'grid.png');

    var votes = countVotes(squares);

    writeImageDataToFile(gridImage, outputImagePath, (err) => {
      if (err) return callback(err, null);
      callback(null, votes);
    });
  }

  
  exports.detectCoordinatesRectangle = function(original, imagePath, callback) {
    var originalImageData = scaleImage(loadImage(original), 0.8);
    var imageData = loadImage(imagePath);
    //printOutputImage(imageData, 'original.png');

/*
    console.log('closing');
    var closedImage = closing(imageData);
    //printOutputImage(closedImage, 'closed.png');

    console.log('histogram');
    var histogram = getHistogram(closedImage);
    console.log('otsu threshold');
    var threshold = otsu(histogram, closedImage.width * closedImage.height);
    var highThreshold = Math.min(0xFF, Math.floor(threshold * 1.2));
    console.log('morph binarize');
    var morphologicalBinarizedImage = morphologicalBinarize(closedImage, threshold, highThreshold);
    //printOutputImage(morphologicalBinarizedImage, 'morphbinarized.png');

    */

    var morphologicalBinarizedImage = clearTopOfImage(imageData);

    console.log('label groups');
    var labeledGroups = labelConnectedComponents(morphologicalBinarizedImage);

    //var connectedComponentsImage = drawConnectedComponent(morphologicalBinarizedImage, labeledGroups);
    //printOutputImage(connectedComponentsImage, 'connected-components.png');

    console.log('remove groups touching border');
    var noBorderTouchingLabeledGroups = removeGroupsTouchingImageBorder(morphologicalBinarizedImage, labeledGroups);
    //var connectedComponentsImageNoBorder = drawConnectedComponent(morphologicalBinarizedImage, noBorderTouchingLabeledGroups);
    //printOutputImage(connectedComponentsImageNoBorder, 'connected-components-no-border.png');

    console.log('filter circles');
    var onlyProbableCirclesTouchingLabeledGroups = removeGroupsNotResemblingCircles(noBorderTouchingLabeledGroups);
    //var connectedComponentsImageOnlyCircles = drawConnectedComponent(morphologicalBinarizedImage, onlyProbableCirclesTouchingLabeledGroups);
    //printOutputImage(connectedComponentsImageOnlyCircles, 'connected-components-no-border-only-circles.png');

    if (onlyProbableCirclesTouchingLabeledGroups.length <= 0) {
      return callback('Could not find any circles', null);
    }

    console.log('center of circles');
    var centerOfComponents = getCenterOfGroups(onlyProbableCirclesTouchingLabeledGroups);
    //var connectedComponentsCenterImage = drawCenters(connectedComponentsImageOnlyCircles, centerOfComponents);
    //printOutputImage(connectedComponentsCenterImage, 'connected-components-no-border-centers.png');

    console.log('expand circles');
    var expandedCenterOfComponents = expandCentresOfComponents(centerOfComponents);

    console.log('compute hull');
    var hull = convexHull(expandedCenterOfComponents);
    //var hullImage = drawHull(connectedComponentsCenterImage, hull);
    //printOutputImage(hullImage, 'connected-components-no-border-centers-hull.png');

    var hullPolygon = hull.map(a => {return {x: a[0], y: a[1]}})
    //var minimumBoxImage = drawMinimumBoundingBoxSteps(hullImage, hullPolygon);
    //printOutputImage(minimumBoxImage, 'connected-components-no-border-centers-hull-minbox.png');

    console.log('compute minimum rectangle');
    var minimumBoundingRectangle = getMinimumBoundingRectangle(hullPolygon);
    minimumBoundingRectangle = scaleMinimumBoundingRectangle(minimumBoundingRectangle, imageData);
    //var minimumBoundingRectangleImage = drawMinimumBoundingRectangle(connectedComponentsCenterImage, minimumBoundingRectangle);
    //printOutputImage(minimumBoundingRectangleImage, 'connected-components-no-border-centers-hull-min-rectangle.png');

    //var minimumBoundingRectangleOnOriginalImage = drawMinimumBoundingRectangle(originalImageData, minimumBoundingRectangle);
    //printOutputImage(minimumBoundingRectangleOnOriginalImage, 'min-image-on-original.png');

    callback(null, minimumBoundingRectangle);
  }

  exports.someExperiments = function() {
      var imageData = loadImage(__dirname + '/proto5.png');
      var descriptor = loadDescriptor(__dirname + '/proto5.json');

      printOutputImage(imageData, 'original.png');

      //imageData = scaleImage(imageData, 0.8);
      //printOutputImage(imageData, 'scaled.png');

      //imageData = warpImage(imageData, descriptor);
      //printOutputImage(imageData, 'warped.png');

      var closedImage = closing(imageData);
      printOutputImage(closedImage, 'closed.png');

      var histogram = getHistogram(closedImage);
      var threshold = otsu(histogram, closedImage.width * closedImage.height);

      //var binarizedImage = binarize(closedImage, threshold);
      //printOutputImage(binarizedImage, 'binarized.png');

      //var squares = getGridSquares(imageData.width, imageData.height);
      //var voteSquares = findVotes(binarizedImage, squares)
      //var gridBinarizedImage = drawGridSquares(binarizedImage, voteSquares, null);
      //printOutputImage(gridBinarizedImage, 'grid-binarized.png');
      //var gridImage = drawGridSquares(imageData, voteSquares, null);
      //printOutputImage(gridImage, 'grid.png');
      //var votes = countVotes(squares);

      //var imageData = crop(imageData, 0.15, 0, 0.25, 0);
      //printOutputImage(imageData, 'cropped.png');

      var highThreshold = Math.min(0xFF, Math.floor(threshold * 1.2));
      var morphologicalBinarizedImage = morphologicalBinarize(closedImage, threshold, highThreshold);
      printOutputImage(morphologicalBinarizedImage, 'morphbinarized.png');

/*
      var erodedImage = erode(imageData);
      printOutputImage(erodedImage, 'eroded.png');

      var dilatedImage = dilate(imageData);
      printOutputImage(dilatedImage, 'dilated.png');

      var dilatedThreshold = otsu(getHistogram(dilatedImage), dilatedImage.width * dilatedImage.height);
      var dilatedBinarizedImage = binarize(dilatedImage, dilatedThreshold);
      printOutputImage(dilatedBinarizedImage, 'dilated-binarized.png');

      var erodedThreshold = otsu(getHistogram(erodedImage), erodedImage.width * erodedImage.height);
      var erodedBinarizedImage = binarize(erodedImage, erodedThreshold);
      printOutputImage(erodedBinarizedImage, 'eroded-binarized.png');

      var histogramClosed = getHistogram(closedImage);
      var closedThreshold = otsu(histogramClosed, closedImage.width * closedImage.height);
      var closedHighThreshold = Math.min(0xFF, Math.floor(closedThreshold * 1.2));


      var closedMorphologicalBinarizedImage = morphologicalBinarize(closedImage, closedThreshold, closedHighThreshold);
      printOutputImage(closedMorphologicalBinarizedImage, 'closed-morphbinarized.png');

      var closedBinarizedImage = binarize(closedImage, closedThreshold);
      printOutputImage(closedBinarizedImage, 'closed-binarized.png');
      // OLD

      var dividedImage = divide(imageData, closedImage);
      printOutputImage(dividedImage, 'divided.png');
      */

      //TODO: Somehow detect all circles and remove the non circles. This can be done with a circlular hough transform
      // the one below is a line hough transform
      var binarizedHoughTransformedImage = houghTransform(morphologicalBinarizedImage);
      printOutputImage(binarizedHoughTransformedImage, 'morph-binarized-hough.png');

      var labeledGroups = labelConnectedComponents(morphologicalBinarizedImage);

      var connectedComponentsImage = drawConnectedComponent(morphologicalBinarizedImage, labeledGroups);
      printOutputImage(connectedComponentsImage, 'connected-components.png');

      var noBorderTouchingLabeledGroups = removeGroupsTouchingImageBorder(morphologicalBinarizedImage, labeledGroups);
      var connectedComponentsImageNoBorder = drawConnectedComponent(morphologicalBinarizedImage, noBorderTouchingLabeledGroups);
      printOutputImage(connectedComponentsImageNoBorder, 'connected-components-no-border.png');

      var onlyProbableCirclesTouchingLabeledGroups = removeGroupsNotResemblingCircles(noBorderTouchingLabeledGroups);
      var connectedComponentsImageOnlyCircles = drawConnectedComponent(morphologicalBinarizedImage, onlyProbableCirclesTouchingLabeledGroups);
      printOutputImage(connectedComponentsImageOnlyCircles, 'connected-components-no-border-only-circles.png');

      var centerOfComponents = getCenterOfGroups(onlyProbableCirclesTouchingLabeledGroups);
      var connectedComponentsCenterImage = drawCenters(connectedComponentsImageOnlyCircles, centerOfComponents);
      printOutputImage(connectedComponentsCenterImage, 'connected-components-no-border-centers.png');

      var expandedCenterOfComponents = expandCentresOfComponents(centerOfComponents);

      var hull = convexHull(expandedCenterOfComponents);
      var hullImage = drawHull(connectedComponentsCenterImage, hull);
      printOutputImage(hullImage, 'connected-components-no-border-centers-hull.png');

      var hullPolygon = hull.map(a => {return {x: a[0], y: a[1]}})
      var minimumBoxImage = drawMinimumBoundingBoxSteps(hullImage, hullPolygon);
      printOutputImage(minimumBoxImage, 'connected-components-no-border-centers-hull-minbox.png');

      var minimumBoundingRectangle = getMinimumBoundingRectangle(hullPolygon);
      var minimumBoundingRectangleImage = drawMinimumBoundingRectangle(connectedComponentsCenterImage, minimumBoundingRectangle);
      printOutputImage(minimumBoundingRectangleImage, 'connected-components-no-border-centers-hull-min-rectangle.png');

      var minimumBoundingRectangleOnOriginalImage = drawMinimumBoundingRectangle(imageData, minimumBoundingRectangle);
      printOutputImage(minimumBoundingRectangleOnOriginalImage, 'min-image-on-original.png');




/*
      var hulls = getGroupsByConvexHullsArea(noBorderTouchingLabeledGroups);
      var largestHull = getLargestHull(hulls);
      var hullImage = drawLargestHull(largestHull, morphologicalBinarizedImage);
      printOutputImage(hullImage, 'hull.png');

      var minimumBoxImage = drawMinimumBoundingBox(hullImage, largestHull.polygon);
      printOutputImage(minimumBoxImage, 'minimumbox.png');


      // sobel
      var verticalSobelKernel = [];
      verticalSobelKernel.push(1, 2, 1);
      verticalSobelKernel.push(0, 0, 0);
      verticalSobelKernel.push(-1, -2, -1);

      var horisontalSobelKernel = [];
      horisontalSobelKernel.push(1, 0, -1);
      horisontalSobelKernel.push(2, 0, -2);
      horisontalSobelKernel.push(1, 0, -1);


      var verticalLines = applyConvolutionFilter(dividedImage, verticalSobelKernel);
      verticalLines = negateImage(verticalLines);
      printOutputImage(verticalLines, 'divided-vertical-convolution.png');

      verticalLines = morphologicalBinarize(verticalLines, threshold, highThreshold);
      printOutputImage(verticalLines, 'divided-vertical.png');

      var horisontalLines = applyConvolutionFilter(dividedImage, horisontalSobelKernel);
      horisontalLines = negateImage(horisontalLines);
      printOutputImage(horisontalLines, 'divided-horizontal-convolution.png');

      var closedHorizontal = morphologicalBinarize(horisontalLines, closedThreshold, closedHighThreshold);
      printOutputImage(closedHorizontal, 'divided-horizontal-convolution-closed.png');

      horisontalLines = morphologicalBinarize(horisontalLines, threshold, highThreshold);
      printOutputImage(horisontalLines, 'divided-horizontal.png');

      var andedImage = andImage(horisontalLines, verticalLines);
      printOutputImage(andedImage, 'divided-horizontal-vertical-anded.png');

      var closedHistorgramImage = printHistogram(closedImage, histogramClosed);
      printOutputImage(closedHistorgramImage, 'closed-histogram.png');

      var dividedHistogramImage = printHistogram(dividedImage, histogram);
      printOutputImage(dividedHistogramImage, 'divided-histogram.png');

      var horizontalHoughTransformedImage = houghTransform(horisontalLines);
      printOutputImage(horizontalHoughTransformedImage, 'divided-horizontal-hough.png');

      var verticalHoughTransformedImage = houghTransform(verticalLines);
      printOutputImage(verticalHoughTransformedImage, 'divided-vertical-hough.png');

      var binarizedHoughTransformedImage = houghTransform(binarizedImage);
      printOutputImage(binarizedHoughTransformedImage, 'binarized-hough.png');
      */

  }




  //http://vase.essex.ac.uk/software/HoughTransform/HoughTransform.java.html
  function houghTransform(imageData) {

    var width = imageData.width;
    var height = imageData.height;

    // How many discrete values of theta shall we check?
    var maxTheta = 180;

    // Calculate the maximum height the hough array needs to have
    var houghHeight = Math.floor(Math.sqrt(2) * Math.max(height, width) / 2);

    // Double the height of the hough array to cope with negative r values
    var doubleHeight = 2 * houghHeight;

     // Create the hough array[maxTheta][doubleHeight]
    var houghArray = Array(maxTheta).fillUsing(function(){
      return Array(doubleHeight).fillUsing(0);
    });

    // Find edge points and vote in array
    var centerX = width / 2;
    var centerY = height / 2;

    for (var x = 0; x < width; x++){
      for (var y = 0; y < height; y++){
        if (getBlueChannelPixel(imageData, x, y) > 128) {
          continue;
        }

        // Go through each value of theta
        for (var t = 0; t < maxTheta; t++) {

          var tRad = t * Math.PI / 180.0;

          //Work out the r values for each theta step
          var r = Math.floor(((x - centerX) * Math.cos(tRad)) + ((y - centerY) * Math.sin(tRad)));
          // this copes with negative values of r
          r += houghHeight;
          if (r < 0 || r >= doubleHeight){
            console.log('out of bounds', r);
            continue;
          }

          if (isNaN(houghArray[t][r])) throw "not a number " + t + " " + r

          // Increment the hough array
          houghArray[t][r]++;
          //console.log(houghArray[t][r]);
        }

      }
    }


    // rescale and print
    var max = 0;
    for (var x = 0; x < maxTheta; x++){
      for (var y = 0; y < doubleHeight; y++){
          max = Math.max(max, houghArray[x][y]);
      }
    }

    var outputImageData = getEmptyImage(maxTheta, doubleHeight, 0xFF000000);

    // rescale and print
    for (var x = 0; x < maxTheta; x++){
      for (var y = 0; y < doubleHeight; y++){
          var color = Math.floor(houghArray[x][y] / max * 256);
          setGrayscale(outputImageData, x, y, color);
      }
    }

    var neighbourhoodSize = 15;
    var lines = [];
    var threshold = 100;
    var thetaStep = Math.PI / maxTheta;

    // Search for local peaks above threshold to draw
    for (var t = 0; t < maxTheta; t++) {
      loop:
      for (var r = neighbourhoodSize; r < doubleHeight - neighbourhoodSize; r++) {
        // Only consider points above threshold
        if (houghArray[t][r] > threshold) {

          var peak = houghArray[t][r];

          // Check that this peak is indeed the local maxima
          for (var dx = -neighbourhoodSize; dx <= neighbourhoodSize; dx++) {
            for (var dy = -neighbourhoodSize; dy <= neighbourhoodSize; dy++) {
              var dt = t + dx;
              var dr = r + dy;
              if (dt < 0){
                dt = dt + maxTheta;
              }
              else if (dt >= maxTheta){
                dt = dt - maxTheta;
              }
              if (houghArray[dt][dr] > peak) {
                // found a bigger point nearby, skip
                continue loop;
              }
            }
          }

          // calculate the true value of theta
          var theta = t * thetaStep;

          // add the line to the vector
          lines.push({theta:theta, r: r, peak: peak});

        }
      }
    }

    var outputImageData2 = cloneImage(imageData);

    lines.sort(function(a, b){
      return b.peak - a.peak;
    });

    for (var l = 0; l < Math.min(lines.length, 100); l++){
      // Draw edges in output array
      var theta = lines[l].theta;
      var r = lines[l].r;
      var tsin = Math.sin(theta);
      var tcos = Math.cos(theta);

      if (theta < Math.PI * 0.25 || theta > Math.PI * 0.75) {
        // Draw vertical-ish lines
        for (var y = 0; y < height; y++) {
          var x = Math.floor((((r - houghHeight) - ((y - centerY) * tsin)) / tcos) + centerX);
          if (x < width && x >= 0) {
            setPixel(outputImageData2, x, y, 0xFFFF0000);
          }
        }
      } else {
        // Draw horizontal-sh lines
        for (var x = 0; x < width; x++) {
          var y = Math.floor((((r - houghHeight) - ((x - centerX) * tcos)) / tsin) + centerY);
          if (y < height && y >= 0) {
            setPixel(outputImageData2, x, y, 0xFF00FF00);
          }
        }
      }
    }


    return outputImageData2;

  }


  function houghTransform2(imageData) {

    var drawingWidth = imageData.width;
    var drawingHeight = imageData.height;

    var numAngleCells = 360;
    var rhoMax = Math.sqrt(drawingWidth * drawingWidth + drawingHeight * drawingHeight);
    var accum = new Array(numAngleCells);

    var max = 0;
    var biggestRho = 0;

    for (var i = 0; i < drawingWidth; i++){
      for (var j = 0; j < drawingHeight; j++){

        if (getBlueChannelPixel(imageData, i, j) > 128) {
          continue;
        }

        var rho;
        var theta = 0;
        var thetaIndex = 0;
        x = i - drawingWidth / 2;
        y = j - drawingHeight / 2;
        for (; thetaIndex < numAngleCells; theta += Math.PI / numAngleCells, thetaIndex++) {
          rho = rhoMax + x * Math.cos(theta) + y * Math.sin(theta);
          rho >>= 1;
          if (accum[thetaIndex] == undefined) accum[thetaIndex] = [];
          if (accum[thetaIndex][rho] == undefined) {
            accum[thetaIndex][rho] = 1;
          } else {
            accum[thetaIndex][rho]++;
          }

          max = Math.max(max, accum[thetaIndex][rho]);
          biggestRho = Math.max(biggestRho, rho);
          //HSctx.fillRect(thetaIndex, rho, 1, 1);
        }
      }
    }

    var outputImageData = getEmptyImage(numAngleCells, biggestRho, 0xFF000000);

    // rescale and print
    for (var x = 0; x < accum.length; x++){
      for (var y = 0; y < (accum[x] || []).length; y++){
          var color = (accum[x][y] || 0) / max * 256;
          setGrayscale(outputImageData, x, y, color);
      }
    }

    return outputImageData;
  }



  function andImage(imageData1, imageData2) {
      var outputImageData = getEmptyImage(imageData1.width, imageData1.height, 0xFFFFFFFF);
      for (var x = 0; x < imageData1.width; x++) {
          for (var y = 0; y < imageData1.height; y++) {
              var color1 = getBlueChannelPixel(imageData1, x, y);
              var color2 = getBlueChannelPixel(imageData2, x, y);

              var outColor;
              if (color1 == 0x00 && color2 == 0x00) {
                  outColor = 0x00;
              } else {
                  outColor = 0xFF;
              }

              setGrayscale(outputImageData, x, y, outColor);
          }
      }
      return outputImageData;
  }

  function divide(imageData1, imageData2) {
      var outputImageData = getEmptyImage(imageData1.width, imageData1.height, 0xFFFFFFFF);
      for (var x = 0; x < imageData1.width; x++) {
          for (var y = 0; y < imageData1.height; y++) {
              var color1 = getBlueChannelPixel(imageData1, x, y);
              var color2 = getBlueChannelPixel(imageData2, x, y);
              var outColor = (color1 / color2) * 255 & 0x000000FF;
              setGrayscale(outputImageData, x, y, outColor);
          }
      }
      return outputImageData;
  }

  function negativeDiff(imageData1, imageData2) {
      for (var x = 0; x < imageData1.width; x++) {
          for (var y = 0; y < imageData1.height; y++) {
              var color1 = getBlueChannelPixel(imageData1, x, y);
              var color2 = getBlueChannelPixel(imageData2, x, y);
              var outColor = Math.floor(255 - (color2 - color1));
              setGrayscale(imageData, x, y, outColor);
          }
      }
  }

  function getClosingKerner(){
    var n = null;
    var closingKernel = [];
    closingKernel.push([n, 1, 1, 1, n]);
    closingKernel.push([1, 1, 1, 1, 1]);
    closingKernel.push([1, 1, 1, 1, 1]);
    closingKernel.push([1, 1, 1, 1, 1]);
    closingKernel.push([n, 1, 1, 1, n]);
    return closingKernel;
  }

  function closing(imageData) {
    var kernel = getClosingKerner();
    var dilatedImage = dilate(imageData, kernel);
    var erodedImage = erode(dilatedImage, kernel);
    return erodedImage;
  }

  function opening(imageData) {
    var kernel = getClosingKerner();
    var erodedImage = erode(imageData, kernel);
    dilatedImage = dilate(erodedImage, kernel);
    return dilatedImage;
  }


  function erode(imageData) {
    var kernel = getClosingKerner();
    var outputImageData = getEmptyImage(imageData.width, imageData.height, 0xFFFFFFFF);
    var padding = Math.floor(kernel.length / 2);

    for (var x = padding; x < imageData.width - padding; x++) {
        for (var y = padding; y < imageData.height - padding; y++) {

            var topColor = 255;

            for (var kx = 0; kx < kernel.length; kx++) {
                for (var ky = 0; ky < kernel[kx].length; ky++) {

                    if (kernel[kx][ky] === null) {
                        continue;
                    }

                    var sampleX = x - padding + kx;
                    var sampleY = y - padding + ky;

                    var sampledColor = getBlueChannelPixel(imageData, sampleX, sampleY);

                    if (sampledColor < topColor) {
                        topColor = sampledColor;
                    }
                    //TODO: add kernel
                }
            }

            setGrayscale(outputImageData, x, y, topColor);

        }
    }
    return outputImageData;
  }

  function dilate(imageData) {
    var kernel = getClosingKerner();
    var outputImageData = getEmptyImage(imageData.width, imageData.height, 0xFFFFFFFF);
    var padding = Math.floor(kernel.length / 2);

    for (var x = padding; x < imageData.width - padding; x++) {
        for (var y = padding; y < imageData.height - padding; y++) {

            var topColor = 0;

            for (var kx = 0; kx < kernel.length; kx++) {
                for (var ky = 0; ky < kernel[kx].length; ky++) {

                    if (kernel[kx][ky] === null) {
                        continue;
                    }

                    var sampleX = x - padding + kx;
                    var sampleY = y - padding + ky;

                    var sampledColor = getBlueChannelPixel(imageData, sampleX, sampleY);

                    if (sampledColor > topColor) {
                        topColor = sampledColor;
                    }
                    //TODO: add kernel
                }
            }

            setGrayscale(outputImageData, x, y, topColor);

        }
    }
    return outputImageData;
  }

  function crop(imageData, removeOfTop, removeOfRight, removeOfBottom, removeOfLeft) {
      var left = imageData.width * removeOfLeft;
      var right = imageData.width * removeOfRight;
      var top = imageData.height * removeOfTop;
      var bottom = imageData.height * removeOfBottom;

      var width = imageData.width - left - right;
      var height = imageData.height - top - bottom;
      var outputImageData = getEmptyImage(width, height, 0xFFFFFFFF);

      for ( var x = 0; x < width; x++){
          for ( var y = 0; y < height; y++){
              var color = getPixel(imageData, left + x, top + y);
              setPixel(outputImageData, x, y, color);
          }
      }

      return outputImageData;

  }

  function labelConnectedComponents(imageData) {

      var black = 0x00;
      var white = 0xFF;

      var linktree = [0];

      var currentLabel = 0;

      // setup labels matrix
      var labels = [];
      for (var x = 0; x < imageData.width; x++) {
          labels.push([]);
          for (var y = 0; y < imageData.height; y++) {
              labels[x].push(0);
          }
      }


      // first pass
      for (var y = 0; y < imageData.height; y++) {
          for (var x = 0; x < imageData.width; x++) {


              var color = getBlueChannelPixel(imageData, x, y);

              if (color !== white) {

                  var neighbours = [
                      [-1, 0],
                      [-1, -1],
                      [0, -1],
                      [+1, -1],
                  ].map(function(delta) {
                      return {
                          x: x + delta[0],
                          y: y + delta[1]
                      };
                  }).filter(function(neighbour) {
                      return (neighbour.x >= 0) && (neighbour.x < imageData.width);
                  }).filter(function(neighbour) {
                      return (neighbour.y >= 0) && (neighbour.y < imageData.height);
                  }).filter(function(neighbour) {
                      return getBlueChannelPixel(imageData, neighbour.x, neighbour.y) === color;
                  }).map(function(neighbour) {
                      return {
                          x: neighbour.x,
                          y: neighbour.y,
                          label: labels[neighbour.x][neighbour.y]
                      };
                  });

                  if (neighbours.length === 0) {
                      currentLabel++;
                      linktree.push(currentLabel);
                      labels[x][y] = currentLabel;

                  } else {
                      var neighbourLabels = neighbours.map(function(neighbour) {
                          return neighbour.label;
                      }).map(function(label) {
                          if (!label) throw new Error();
                          while (label !== linktree[label]) {
                              label = linktree[label];
                          }
                          return label;
                      });

                      var minLabel = neighbourLabels.reduce(function(last, current) {
                          return Math.min(last, current);
                      });

                      labels[x][y] = minLabel;

                      neighbourLabels.forEach(function(label) {
                          if (label !== minLabel) {
                              linktree[label] = minLabel;
                          }
                      });
                  }
              }
          }
      }

      //linktree second pass
      for (var x = 0; x < imageData.width; x++) {
          for (var y = 0; y < imageData.height; y++) {

              var group = labels[x][y];
              while (group !== linktree[group]) {
                  group = linktree[group];
              }

              labels[x][y] = group;
          }
      }



      var pixelsInLabel = [];

      for (var x = 0; x < labels.length; x++) {
          for (var y = 0; y < labels[x].length; y++) {
              if (!pixelsInLabel[labels[x][y]]) {
                  pixelsInLabel[labels[x][y]] = [];
              }

              if (labels[x][y] === 0) continue;

              pixelsInLabel[labels[x][y]].push({
                  x: x,
                  y: y
              });
          }
      }





      return pixelsInLabel;

  }

  function removeGroupsTouchingImageBorder(imageData, labeledGroups){
      var width = imageData.width;
      var height = imageData.height;
      var border = 2
      var output = labeledGroups.filter(function(group){
          for (var i = 0; i < group.length; i++) {
              var pixel = group[i];
              if (pixel.x >= width - border || pixel.x <= border || pixel.y >= height - border || pixel.y <= border) {
                  return false;
              }
          }
          return true;
      });

      return output;
  }

  function removeGroupsNotResemblingCircles(labeledGroups) {
    var maxArea = Math.round(14 * 14 * Math.PI)
    var minArea = Math.round(6 * 6 * Math.PI)
    var goodSized = labeledGroups.filter(function(group){
        return group.length < maxArea && group.length > minArea;
    });

    var output = goodSized.filter((group)=> {

      let best = group.reduce( (best, pixel) => {
        best.minx = Math.min(best.minx, pixel.x);
        best.miny = Math.min(best.miny, pixel.y);
        best.maxx = Math.max(best.maxx, pixel.x);
        best.maxy = Math.max(best.maxy, pixel.y);
        return best;
      }, {minx: Number.MAX_VALUE, miny: Number.MAX_VALUE, maxx: Number.MIN_VALUE, maxy: Number.MIN_VALUE});

      var width = best.maxx - best.minx;
      var height = best.maxy - best.miny;

      var ratio = width / height;

      return ratio > 0.7 && ratio < 1.3;

    });

    console.log(`cleaning up from ${labeledGroups.length}, ${goodSized.length}, ${output.length}`)

    return output;
  }

  function clearTopOfImage(imageData) {
    var canvas = createCanvas(imageData.width, imageData.height);
      var context = canvas.getContext('2d');
      context.putImageData(imageData, 0, 0);
      context.fillStyle = 'rgba(255,255,255,1.0)';
    
      context.beginPath();
      context.rect(0, 0, imageData.width, imageData.height * 0.20)
      context.fill();

      return context.getImageData(0, 0, imageData.width, imageData.height);
  }

  function drawConnectedComponent(imageData, labeledGroups){

      var outputImageData = getEmptyImage(imageData.width, imageData.height, 0xFFFFFFFF);

      //print the different groups
      var colors = [0xFFFF0000, 0xFF00FF00, 0xFF0000FF, 0xFFFF00FF, 0xFFFFFF00, 0xFF00FFFF, 0xFFCC0000, 0xFF00CC00, 0xFF0000CC, 0xFFCC00CC, 0xFFCCCC00, 0xFF00CCCC];
      var c = 0;
      var col = 0;
      labeledGroups.forEach(function(group, index) {
          c = (c + 1) % colors.length;
          col = (col + 1) % 255;

          for (var i = 0; i < group.length; i++) {
              setPixel(outputImageData, group[i].x, group[i].y, colors[c]);
          }
      });

      return outputImageData;
  }

  function drawCenters(imageData, centers){

      var canvas = createCanvas(imageData.width, imageData.height);
      var context = canvas.getContext('2d');
      context.putImageData(imageData, 0, 0);
      context.fillStyle = 'rgba(0,0,0,1.0)';
    
      centers.forEach(function(center, index) {
        context.beginPath();
        context.arc(center[0], center[1], 10, 0, 2 * Math.PI);
        context.stroke();
      });

      return context.getImageData(0, 0, imageData.width, imageData.height);
  }

    function drawHull(imageData, hull){

      var canvas = createCanvas(imageData.width, imageData.height);
      var context = canvas.getContext('2d');
      context.putImageData(imageData, 0, 0);
      context.strokeStyle = 'rgba(0,0,255,1.0)';
    
      var closedHull = hull.concat([hull[0]]);

      context.beginPath();
      for (var i = 0; i < closedHull.length -1; i++) {
        context.moveTo(closedHull[i][0], closedHull[i][1]);
        context.lineTo(closedHull[i+1][0], closedHull[i+1][1])
      }
      context.stroke();


      return context.getImageData(0, 0, imageData.width, imageData.height);
  }

  function getCenterOfGroups(labeledGroups) {
    var centers = labeledGroups.filter(group => group.length > 0).map((group)=> {
      var points = group.map(function(pixel) {
        return [pixel.x, pixel.y];
      });
      var avgX = points.reduce((l, v)=> l + v[0], 0) / points.length;
      var avgY = points.reduce((l, v)=> l + v[1], 0) / points.length;

      return [avgX, avgY];
    });

    return centers;

  }

  function expandCentresOfComponents(centers) {
    var rad = 12
    return centers.flatMap((center) => {
      return [
        [center[0] - rad, center[1]],
        [center[0], center[1] - rad],
        [center[0] + rad, center[1]],
        [center[0], center[1] + rad],
      ]
    })
  }

  function getGroupsByConvexHullsArea(labeledGroups) {
      // find the areas of the convex hulls of the groups

      var hulls = labeledGroups.map(function(group) {
        
          // just convert to array pixel instead since the algo needs it
          var points = group.map(function(pixel) {
              return [pixel.x, pixel.y];
          });

          var hull = convexHull(points);

          hull = hull.map(function(pair) {
              return {
                  x: pair[0],
                  y: pair[1]
              };
          });

          // make sure to close the polygon
          hull.push(hull[0]);
          var polygonArea = calculatePolygonArea(hull);

          return {
              area: polygonArea,
              polygon: hull,
              pixels: group
          };
      });



      hulls.sort(function(a, b) {
          return b.area - a.area;
      });

      return hulls;
  }

  function getLargestHull(hulls) {
      return hulls[0];
  }

  function drawLargestHull(largestGroupHull, imageData) {
      var outputImageData = getEmptyImage(imageData.width, imageData.height, 0xFFFFFFFF);

      largestGroupHull.pixels.forEach(function(pixel) {
          setPixel(outputImageData, pixel.x, pixel.y, 0xFF000000);
      });

      largestGroupHull.polygon.reduce(function(last, current) {
          drawLine(outputImageData, last.x, last.y, current.x, current.y, 0xFFFF0000);
          return current;
      });

      return outputImageData;
  }

  function getMinimumBoundingRectangle(polygon) {

      var minArea = Number.MAX_VALUE;

      var minTopLeft = 0;
      var minTopRight = 0;
      var minBottomLeft = 0;
      var minBottomRight = 0;

      var minMinX = 0;
      var minMaxX = 0;
      var minMinY = 0;
      var minMaxY = 0;

      var bestUnit;
      var bestWidth;
      var bestHeight;
      var bestRegpoint;


      polygon.reduce(function(previous, current) {

          // loop all the vertices and calculate the maximum and minimum of all
          // other indices in the current vertices local coordinate system
          var first = previous;
          var second = current;

          var direction = subtract(second, first);
          var unit = normalize(direction);
          var unitPerp = perpendicular(unit);

          var minX = 0;
          var maxX = 0;
          var minY = 0;
          var maxY = 0;

          polygon.forEach(function(vertex) {
              var test = subtract(vertex, first);
              var dotResult = dot(unit, test);
              var perpDotResult = dot(unitPerp, test);
              minX = Math.min(minX, dotResult);
              maxX = Math.max(maxX, dotResult);
              minY = Math.min(minY, perpDotResult);
              maxY = Math.max(maxY, perpDotResult);
          });

          var left = scale(unit, minX);
          var right = scale(unit, maxX);
          var up = scale(unitPerp, minY);
          var down = scale(unitPerp, maxY);

          var topLeft = add(add(first, left), up);
          var topRight = add(add(first, right), up);
          var bottomLeft = add(add(first, down), left);
          var bottomRight = add(add(first, down), right);

          var area = Math.abs(minX - maxX) * Math.abs(minY - maxY);

          if (area < minArea) {
              minArea = area;

              minTopLeft = topLeft;
              minTopRight = topRight;
              minBottomLeft = bottomLeft;
              minBottomRight = bottomRight;

              minMinX = minX;
              minMaxX = maxX;
              minMinY = minY;
              minMaxY = maxY;

              bestUnit = unit;
              bestWidth = Math.round(Math.abs(minX - maxX));
              bestHeight = Math.round(Math.abs(minY - maxY));
              bestRegpoint = add(add(first, left), up);

          }

          return current;

      });

      return {topLeft: minTopLeft, topRight: minTopRight, bottomLeft: minBottomLeft, bottomRight: minBottomRight};
  }

  function scaleMinimumBoundingRectangle(rectangle, imageData) {

    var {topLeft, topRight, bottomRight, bottomLeft} = rectangle;

    var points = [topLeft, topRight, bottomRight, bottomLeft].map(c => { 
      return {x: c.x / imageData.width, y: c.y / imageData.height}
    })
    .map( p => new Coordinate(p.x, p.y));

    // find the vertex closest to origo
    var best = points.reduce((best, current, i)=>{
      var dist = current.distTo(new Coordinate(0,0));
      if (dist < best.dist) {
        best.dist = dist;
        best.index = i;
      }
      return best;
    },
      {index: 0, dist: Number.MAX_VALUE}
    );

    // rotate so that top left is index 0
    return [
      points[(0 + best.index) % 4], 
      points[(3 + best.index) % 4],
      points[(2 + best.index) % 4], 
      points[(1 + best.index) % 4]
    ];
  }

   function drawMinimumBoundingRectangle(imageData, rectangle){

      var canvas = createCanvas(imageData.width, imageData.height);
      var context = canvas.getContext('2d');
      context.putImageData(imageData, 0, 0);
      context.strokeStyle = 'rgba(0,255,0,1.0)';
    
      
      context.beginPath();
      
      context.moveTo(rectangle[0].x * imageData.width, rectangle[0].y * imageData.height);
      context.lineTo(rectangle[1].x * imageData.width, rectangle[1].y * imageData.height);
      context.lineTo(rectangle[2].x * imageData.width, rectangle[2].y * imageData.height);
      context.lineTo(rectangle[3].x * imageData.width, rectangle[3].y * imageData.height);
      context.lineTo(rectangle[0].x * imageData.width, rectangle[0].y * imageData.height);

      context.arc(rectangle[0].x * imageData.width, rectangle[0].y * imageData.height, 10, 0, 2 * Math.PI);
      
      context.stroke();
      
      context.font = '9px Roboto'
      context.textAlign = "left";
      context.fillStyle = 'rgba(255,0,0,1.0)';
      context.fillText('0', rectangle[0].x * imageData.width, rectangle[0].y * imageData.height);
      context.fillText('1', rectangle[1].x * imageData.width, rectangle[1].y * imageData.height);
      context.fillText('2', rectangle[2].x * imageData.width, rectangle[2].y * imageData.height);
      context.fillText('3', rectangle[3].x * imageData.width, rectangle[3].y * imageData.height);

      return context.getImageData(0, 0, imageData.width, imageData.height);
  }

  function drawMinimumBoundingBoxSteps(imageData, polygon) {

      var outputImageData = cloneImage(imageData);


      var minArea = 999999999999999;

      var minTopLeft = 0;
      var minTopRight = 0;
      var minBottomLeft = 0;
      var minBottomRight = 0;

      var minMinX = 0;
      var minMaxX = 0;
      var minMinY = 0;
      var minMaxY = 0;

      var bestUnit;
      var bestWidth;
      var bestHeight;
      var bestRegpoint;


      polygon.reduce(function(previous, current) {

          // loop all the vertices and calculate the maximum and minimum of all
          // other indices in the current vertices local coordinate system
          var first = previous;
          var second = current;

          var direction = subtract(second, first);
          var unit = normalize(direction);
          var unitPerp = perpendicular(unit);

          var minX = 0;
          var maxX = 0;
          var minY = 0;
          var maxY = 0;

          polygon.forEach(function(vertex) {
              var test = subtract(vertex, first);
              var dotResult = dot(unit, test);
              var perpDotResult = dot(unitPerp, test);
              minX = Math.min(minX, dotResult);
              maxX = Math.max(maxX, dotResult);
              minY = Math.min(minY, perpDotResult);
              maxY = Math.max(maxY, perpDotResult);
          });

          var left = scale(unit, minX);
          var right = scale(unit, maxX);
          var up = scale(unitPerp, minY);
          var down = scale(unitPerp, maxY);

          var topLeft = add(add(first, left), up);
          var topRight = add(add(first, right), up);
          var bottomLeft = add(add(first, down), left);
          var bottomRight = add(add(first, down), right);


          drawLine(outputImageData, topLeft.x, topLeft.y, topRight.x, topRight.y, 0xFFCCCCCC);
          drawLine(outputImageData, topRight.x, topRight.y, bottomRight.x, bottomRight.y, 0xFFCCCCCC);
          drawLine(outputImageData, bottomRight.x, bottomRight.y, bottomLeft.x, bottomLeft.y, 0xFFCCCCCC);
          drawLine(outputImageData, bottomLeft.x, bottomLeft.y, topLeft.x, topLeft.y, 0xFFCCCCCC);

          var area = Math.abs(minX - maxX) * Math.abs(minY - maxY);

          if (area < minArea) {
              minArea = area;

              console.log('new min area %j', minArea);

              minTopLeft = topLeft;
              minTopRight = topRight;
              minBottomLeft = bottomLeft;
              minBottomRight = bottomRight;

              minMinX = minX;
              minMaxX = maxX;
              minMinY = minY;
              minMaxY = maxY;

              bestUnit = unit;
              bestWidth = Math.round(Math.abs(minX - maxX));
              bestHeight = Math.round(Math.abs(minY - maxY));
              bestRegpoint = add(add(first, left), up);

          }

          return current;

      });


      console.log('now draw the thing: ', minTopLeft, minTopRight, minBottomLeft, minBottomRight);


      drawLine(outputImageData, minTopLeft.x, minTopLeft.y, minTopRight.x, minTopRight.y, 0xFFFF0000);
      drawLine(outputImageData, minTopRight.x, minTopRight.y, minBottomRight.x, minBottomRight.y, 0xFFFF0000);
      drawLine(outputImageData, minBottomRight.x, minBottomRight.y, minBottomLeft.x, minBottomLeft.y, 0xFFFF0000);
      drawLine(outputImageData, minBottomLeft.x, minBottomLeft.y, minTopLeft.x, minTopLeft.y, 0xFFFF0000);


      console.log('found best %j %j %j %j', bestUnit, bestWidth, bestHeight, bestRegpoint);

/*
      var xBins = new Array(bestWidth);
      var yBins = new Array(bestHeight);

      for (var i = 0; i < bestHeight; i++) {
          for (var j = 0; j < bestWidth; j++) {
              var dir = add(scale(bestUnit, j), scale(perpendicular(bestUnit), i));
              var x = Math.round(bestRegpoint.x + dir.x);
              var y = Math.round(bestRegpoint.y + dir.y);

              var sampledColor = getPixel(imageData, x, y);
              if (sampledColor == 0xFF000000) {
                  if (!xBins[j]) xBins[j] = 0;
                  if (!yBins[i]) yBins[i] = 0;
                  xBins[j] ++;
                  yBins[i] ++;
              }


              //setPixel(outputImageData, x, y, 0xFFFF0000);
          }
      }
      */

      // draw the grid
      /*
      var gridWidth = 16;
      var gridHeight = 20;
      for (var i = 0; i < gridWidth; i++) {
          var from = add(bestRegpoint, scale(bestUnit, bestWidth / gridWidth * i));
          var to = add(from, scale(perpendicular(bestUnit), bestHeight));
          drawLine(outputImageData, from.x, from.y, to.x, to.y, 0xFF000000);
      }

      for (var j = 0; j < gridHeight; j++) {
          var from = add(bestRegpoint, scale(perpendicular(bestUnit), bestHeight / gridHeight * j));
          var to = add(from, scale(bestUnit, bestWidth));
          drawLine(outputImageData, from.x, from.y, to.x, to.y, 0xFF000000);
      }
      */

      // draw sweep histogram

      //for (var i = 0; i < xBins.length; i++) {
      //    for (var j = 0; j < xBins[i]; j++) {
      //        setPixel(outputImageData, bestRegpoint.x + i, j, 0xFFFFCCCC);
      //    }
      //}

      //for (var i = 0; i < yBins.length; i++) {
      //    for (var j = 0; j < yBins[i]; j++) {
      //        setPixel(outputImageData, j, bestRegpoint.y + i - bestHeight, 0xFFCCCCFF);
      //    }
      //}


      //calculate mean
      /*
          var xSum = xBins.reduce(function(previous, current, index) {
              return previous + current;
          });

          var xMean = xSum / xBins.length;

          drawLine(outputImageData, 0, Math.floor(xMean), imageData.width, Math.floor(xMean), 0xFF00FF00);


          var ySum = yBins.reduce(function(previous, current, index) {
              return previous + current;
          });

          var yMean = ySum / yBins.length;

          drawLine(outputImageData, Math.floor(yMean), 0, Math.floor(yMean), imageData.height, 0xFF00FF00);
      */




      return outputImageData;

  }

  function normalize(vector) {
      var l = length(vector);
      var x = vector.x / l;
      var y = vector.y / l;
      return {
          x: x,
          y: y
      };
  }

  function length(vector) {
      return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  }

  function dot(vector1, vector2) {
      return vector1.x * vector2.x + vector1.y * vector2.y;
  }

  function subtract(vector1, vector2) {
      var x = vector1.x - vector2.x;
      var y = vector1.y - vector2.y;
      return {
          x: x,
          y: y
      };
  }

  function add(vector1, vector2) {
      var x = vector1.x + vector2.x;
      var y = vector1.y + vector2.y;
      return {
          x: x,
          y: y
      };
  }

  function scale(vector, scalar) {
      var x = vector.x * scalar;
      var y = vector.y * scalar;

      return {
          x: x,
          y: y
      };
  }

  function perpendicular(vector) {
      var x = vector.y;
      var y = vector.x * -1;
      return {
          x: x,
          y: y
      };
  }

  /**
   * Takes an arrray of points where each point is an array [x,y]
   * the start and end points must be equal
   *
   * http://geomalgorithms.com/a01-_area.html#2D%20Polygons
   *
   **/
  function calculatePolygonArea(points) {

      var l = points.length
      var area = 0

      for (var i = 1; i < l - 1; i++) {
          area += points[i].x * (points[i + 1].y - points[i - 1].y);
      }

      return Math.abs(area) / 2
  }

  function unionArrays(a, b) {
      var out = a.slice(0);
      for (var i = 0; i < b.length; i++) {
          if (a.indexOf(b[i]) < 0) {
              a.push(b[i]);
          }
      }
      return a;

  }

  function otsu(histogram, totalPixels) {

      var sum = 0;
      var totals = 0;
      for (var i = 0; i < 256; i++) {
          sum += i * histogram[i];
          totals += histogram[i];
      }



      var sumB = 0;
      var weightBackground = 0;
      var weightForeground = 0;
      var meanBackground;
      var meanForeground;
      var max = 0.0;
      var between = 0.0;
      var threshold1 = 0.0;
      var threshold2 = 0.0;
      for (var i = 0; i < 256; i++) {

          // weight background
          weightBackground += histogram[i];
          if (weightBackground === 0) {
              continue;
          }
          //weight foreground
          weightForeground = totalPixels - weightBackground;
          if (weightForeground === 0) {
              break;
          }
          sumB += i * histogram[i];

          // mean background
          meanBackground = sumB / weightBackground;
          // mean foreground
          meanForeground = (sum - sumB) / weightForeground;

          //calculate between class variance
          between = weightBackground * weightForeground * Math.pow(meanBackground - meanForeground, 2);

          // check if a new maximum was found
          if (between >= max) {
              threshold1 = i;
              if (between > max) {
                  threshold2 = i;
              }
              max = between;
          }
      }

      return (threshold1 + threshold2) / 2.0;
  }

  function morphologicalBinarize(imageData, threshold, lowerThreshold) {

      var outputImageData = getEmptyImage(imageData.width, imageData.height, 0xFFFFFFFF);

      for (var x = 0; x < imageData.width; x++) {
          for (var y = 0; y < imageData.height; y++) {

              var neightbourBelowThreshold = [
                  [-1, -1],
                  [0, -1],
                  [1, -1],
                  [1, 0],
                  [1, 1],
                  [0, 1],
                  [-1, 1],
                  [-1, 0]
              ].map(function(delta) {
                  return {
                      x: x + delta[0],
                      y: y + delta[1]
                  };
              }).filter(function(neighbour) {
                  return (neighbour.x >= 0) && (neighbour.x < imageData.width);
              }).filter(function(neighbour) {
                  return (neighbour.y >= 0) && (neighbour.y < imageData.height);
              }).some(function(neighbour) {
                  var neighbourColor = getBlueChannelPixel(imageData, neighbour.x, neighbour.y);
                  return neighbourColor <= threshold;
              });

              var color = getBlueChannelPixel(imageData, x, y);

              if (neightbourBelowThreshold && color <= lowerThreshold) {
                  color = 0xFF000000;
              } else if (color <= threshold) {
                  color = 0xFF000000;
              } else {
                  color = 0xFFFFFFFF;
              }

              setPixel(outputImageData, x, y, color);
          }
      }

      return outputImageData;
  }

  function binarize(imageData, threshold) {

      var outputImageData = getEmptyImage(imageData.width, imageData.height, 0xFFFFFFFF);

      for (var x = 0; x < imageData.width; x++) {
          for (var y = 0; y < imageData.height; y++) {

              var color = getBlueChannelPixel(imageData, x, y);

              if (color > threshold) {
                  color = 0xFFFFFFFF;
              } else {
                  color = 0xFF000000;
              }

              setPixel(outputImageData, x, y, color);
          }
      }

      return outputImageData;
  }


  function findLongestGroup(amplitude) {

      // reduce jitter with a sliding envelope
      var averaged = [];
      var envelope = [];
      var envelopeSize = 17;
      for (var i = 0; i < amplitude.length; i++) {
          envelope.push(amplitude[i]);
          if (envelope.length > envelopeSize) {
              envelope.shift();
          }

          var sorted = envelope.slice(0);
          sorted.sort();

          var middleValue = Math.floor(sorted.length / 2);
          averaged.push(sorted[middleValue]);
      }

      // find the distinct groups
      var groups = [
          []
      ];
      var last = averaged[0];
      for (var i = 0; i < averaged.length; i++) {
          var current = averaged[i];

          if (Math.abs(last - current) > 2) {
              console.log('new group', last - current, last, current, i);
              groups.push([]);
          }
          groups[groups.length - 1].push({
              x: i,
              y: current
          });
          last = current;
      }

      // find the group that is the longest. We will guess that that is the one we want
      var longestGroup = null;
      for (var i in groups) {
          if (!longestGroup || groups[i].length > longestGroup.length) {
              longestGroup = groups[i];
          }

      }
      return longestGroup;

  }

  function findBottomPixels(imageData, minBlack, maxBlack) {
      var color,
          output;
      // skip finding the bottom black stuff just move up 100
      //TODO: Make sure we find the actual y value to start with
      output = [];
      for (var x = 0; x < imageData.width; x++) {
          for (var y = imageData.height - 100; y >= 0; y--) {
              color = getBlueChannelPixel(imageData, x, y);

              if (color >= minBlack && color <= maxBlack) {
                  output.push(y);
                  break;
              }
          }
      }
      return output;
  }

  function findTopPixels(imageData, minBlack, maxBlack) {
      var color,
          output;
      // skip finding the bottom black stuff just move up 100
      //TODO: Make sure we find the actual y value to start with
      output = [];
      for (var x = 0; x < imageData.width; x++) {
          for (var y = 230; y < imageData.height; y++) {
              color = getBlueChannelPixel(imageData, x, y);

              if (color >= minBlack && color <= maxBlack) {
                  setPixel(imageData, x, y, 0xFFFF0000);
                  output.push(y);
                  break;
              }
          }
      }
      return output;
  }

  function printHistogram(imageData, histogram) {

    var output = cloneImage(imageData);

    var tot = output.width * output.height * 1.0;

    var max = 0;

    for (var i = 0; i < histogram.length; i++) {
      max = Math.max(max, histogram[i]);
    }

    for (var i = 0; i < 255; i++) {
      var strength = Math.round( histogram[i] / max * 300 );
      console.log(histogram[i], strength);
      var out = '0x' + i.toString(16) + ':';
      setPixel(output, i, 0, 0xFF0000FF);
      setPixel(output, i, 1, 0xFF0000FF);
      setPixel(output, i, 2, 0xFF0000FF);
      for (var j = 0; j < strength; j++) {
        setPixel(output, i, j + 3, 0xFFFF0000);
        out += '#';
      }
      //console.log(out);
    }

    return output;

  }

  function getHistogram(imageData) {
    var histogram = new Array(256); // create array with length 255

    // fill it with zero
    for (var i = 0; i < 256; i++) {
      histogram[i] = 0;
    }

    for (var y = imageData.height; y >= 0; y--) {
      for (var x = imageData.width; x >= 0; x--) {
        var color = getBlueChannelPixel(imageData, x, y);
        histogram[color]++;
      }
    }

    return histogram;
  }

  function negateImage(imageData) {

      var outputImageData = getEmptyImage(imageData.width, imageData.height, 0xFFFFFFFF);

      var l = imageData.data.length;

      for (var i = 0; i < l;) {
          outputImageData.data[i] = 0xFF - imageData.data[i];
          i++;
          outputImageData.data[i] = 0xFF - imageData.data[i];
          i++;
          outputImageData.data[i] = 0xFF - imageData.data[i];
          i++;
          //imageData.data[i] = a;
          i++;
      }

      return outputImageData;
  }

  function fillImage(imageData, argb) {
      var r = (argb & 0x00ff0000) >>> 16;
      var g = (argb & 0x0000ff00) >>> 8;
      var b = (argb & 0x000000ff);
      var a = (argb & 0xff000000) >>> 24;

      var l = imageData.data.length;

      for (var i = 0; i < l;) {
          imageData.data[i++] = r;
          imageData.data[i++] = g;
          imageData.data[i++] = b;
          imageData.data[i++] = a;
      }
  }

  function drawLine(imageData, x0, y0, x1, y1, color) {
      x0 = Math.round(x0);
      y0 = Math.round(y0);
      x1 = Math.round(x1);
      y1 = Math.round(y1);
      var dx = Math.abs(x1 - x0);
      var dy = Math.abs(y1 - y0);
      var sx = (x0 < x1) ? 1 : -1;
      var sy = (y0 < y1) ? 1 : -1;
      var err = dx - dy;

      while (true) {
          setPixel(imageData, x0, y0, color);

          if ((x0 == x1) && (y0 == y1)) break;
          var e2 = 2 * err;
          if (e2 > -dy) {
              err -= dy;
              x0 += sx;
          }
          if (e2 < dx) {
              err += dx;
              y0 += sy;
          }
      }
  }


  function setPixel(imageData, x, y, argb) {

      var i = getIndexFromCoordinate(imageData, x, y);

      imageData.data[i + 0] = (argb & 0x00ff0000) >>> 16;
      imageData.data[i + 1] = (argb & 0x0000ff00) >>> 8;
      imageData.data[i + 2] = (argb & 0x000000ff);
      imageData.data[i + 3] = (argb & 0xff000000) >>> 24;

  }

  function getPixel(imageData, x, y) {
      var i = getIndexFromCoordinate(imageData, x, y);
      //return ARGB color
      return ((imageData.data[i + 3] << 24) | (imageData.data[i + 0] << 16) | (imageData.data[i + 1] << 8) | imageData.data[i + 2]) >>> 0;
  }

  function getBlueChannelPixel(imageData, x, y) {
      var i = getIndexFromCoordinate(imageData, x, y);
      return imageData.data[i + 2] >>> 0;
  }

  function setGrayscale(imageData, x, y, b) {
      var i = getIndexFromCoordinate(imageData, x, y);

      imageData.data[i + 0] = b >>> 0 & 0xff;
      imageData.data[i + 1] = b >>> 0 & 0xff;
      imageData.data[i + 2] = b >>> 0 & 0xff;
      //imageData.data[i + 3] = b >>> 0 & 0xff;
  }

  function getIndexFromCoordinate(imageData, x, y) {
      x = Math.floor(x);
      y = Math.floor(y);
      return (imageData.width * y + x) * 4;

  }

  function loadImage(path) {
      var canvas,
          context,
          img,
          fileBuffer = fs.readFileSync(path);

      console.log(`load image ${path}`)

      img = new Image();

      img.onerror = (mess) => { console.err("error:", mess) }
      img.onloaded = (mess) => { console.log("loaded:", mess) }

      img.src = fileBuffer;

      canvas = createCanvas(img.width, img.height);
      context = canvas.getContext('2d');

      context.drawImage(img, 0, 0, img.width, img.height);

      return context.getImageData(0, 0, canvas.width, canvas.height);
  }

  function loadDescriptor(path) {
      var fileBuffer = fs.readFileSync(path);
      return JSON.parse(fileBuffer);
  }

  function printOutputImage(imageData, filename) {
      var fullPath = __dirname + '/output/' + outputConter + "_" + filename;
      writeImageDataToFile(imageData, fullPath, (err)=>{
        console.log('saved %s', filename);
      });
      outputConter = outputConter + 1;
  }

  function writeImageDataToFile(imageData, fullPath, callback) {
      var canvas,
          context;

      canvas = createCanvas(imageData.width, imageData.height);
      context = canvas.getContext('2d');

      context.putImageData(imageData, 0, 0);

      var out = fs.createWriteStream(fullPath);
      var stream = canvas.pngStream();

      console.log('printing %s %s', outputConter, fullPath);

      stream.on('data', function(chunk) {
          out.write(chunk);
      });

      stream.on('end', function() {
          callback(null);
      });
  }

  function getEmptyImage(width, height, color) {
      width = Math.floor(width);
      height = Math.floor(height);

      var canvas,
          context;

      canvas = createCanvas(width, height);
      context = canvas.getContext('2d');

      var imageData = context.createImageData(width, height);

      for (var x = 0; x < width; x++) {
          for (var y = 0; y < height; y++) {
              setPixel(imageData, x, y, color);
          }
      }

      return imageData;
  }

  function cloneImage(image) {

    var canvas,
        context;

    canvas = createCanvas(image.width, image.height);
    context = canvas.getContext('2d');

    var imageData = context.createImageData(image.width, image.height);

    for (var x = 0; x < image.width; x++) {
      for (var y = 0; y < image.height; y++) {
        var color = getPixel(image, x, y);
        setPixel(imageData, x, y, color);
      }
    }

    return imageData;
  }

  function scaleImage(image, scale) {
    var fromImg = new Image();
    var fromCanvas = createCanvas(image.width, image.height);
    var fromContext = fromCanvas.getContext('2d');
    fromContext.putImageData(image, 0, 0);
    fromImg.src = fromCanvas.toBuffer();

    var newWidth = Math.floor(image.width * scale);
    var newHeight = Math.floor(image.height * scale);

    var canvas = createCanvas(newWidth, newHeight);
    var context = canvas.getContext('2d');
    //context.putImageData(image, 0, 0, 0, 0, newWidth, newHeight);
    context.drawImage(fromImg, 0, 0, newWidth, newHeight);
    var resultImageData = context.getImageData(0, 0, newWidth, newHeight);

    return resultImageData;
  }

  function drawGridSquares(imageData, squares, labels) {
    labels = labels || [];
    var image = new Image();
    var canvas = createCanvas(imageData.width, imageData.height);
    var context = canvas.getContext('2d');
    context.putImageData(imageData, 0, 0);

    
    context.font = '9px Roboto'
    context.textAlign = "right";

    context.fillStyle = 'rgba(255,0,0,1.0)';

    var types = ['yes','no','refrain','absent'];
    var typeAbbr = {
      yes: 'y',
      no: 'n',
      refrain: 'r',
      absent: 'a',
      missing: 'm'
    };

    squares.forEach((square, i) => {
        let label = labels[i] || 'N/A';
        context.strokeStyle = 'rgba(255,0,0,1.0)';
        var voteOffset = types.indexOf(square.vote);
        if (voteOffset !== -1){
          var middle = square.upperLeft.plus(coord(square.width/4 * voteOffset, 0)).plus(coord(square.width/8, square.height / 2));
          context.beginPath();
          context.arc(middle.x, middle.y, square.height/2, 0, 2 * Math.PI);
          context.stroke();
        }else{
          context.fillStyle = 'rgba(255,0,0,0.3)';
          context.beginPath();
          context.moveTo(square.upperLeft.x, square.upperLeft.y);
          context.lineTo(square.upperRight.x, square.upperRight.y);
          context.lineTo(square.lowerRight.x, square.lowerRight.y);
          context.lineTo(square.lowerLeft.x, square.lowerLeft.y);
          context.fill();
        }

        context.beginPath();
        context.moveTo(square.upperLeft.x, square.upperLeft.y);
        context.lineTo(square.upperRight.x, square.upperRight.y);
        context.lineTo(square.lowerRight.x, square.lowerRight.y);
        context.lineTo(square.lowerLeft.x, square.lowerLeft.y);
        context.lineTo(square.upperLeft.x, square.upperLeft.y);
        context.stroke();

        context.textAlign = "right";
        context.fillStyle = 'rgba(255,0,0,1.0)';
        context.fillText(typeAbbr[square.vote] +'\t'+square.id, square.upperRight.x - 5, square.upperRight.y + 20);

        context.textAlign = "left";
        context.fillStyle = 'rgba(0,0,255,1.0)';
        context.fillText(label, square.upperLeft.x + 5, square.upperLeft.y + 10);

        context.strokeStyle = 'rgba(255,0,0,0.2)';
        context.beginPath();
        [0.25, 0.50, 0.75].forEach((percent)=>{
          var u = square.upperLeft.plus(coord(square.width,0).scale(percent));
          var d = square.lowerLeft.plus(coord(square.width,0).scale(percent));
          context.moveTo(u.x, u.y);
          context.lineTo(d.x, d.y);
        });
        context.stroke();
    });

    return context.getImageData(0, 0, imageData.width, imageData.height);
  }

  function findVotes(imageData, squares) {
    return squares.map((square)=>{
      var blackPixels = [0,0,0,0];
      var totalPixels = 0;
      for (var i = 0; i < 4; i++) {
        for (var x = square.upperLeft.x + i * square.width / 4; x < square.upperLeft.x + (i + 1) * square.width / 4; x++){
          for (var y = square.upperLeft.y; y < square.upperLeft.y + square.height; y++) {
            if (getBlueChannelPixel(imageData, x, y) == 0){
              blackPixels[i]++;
            }
            totalPixels++;
          }
        }
      }

      var threshold = totalPixels / 4 / 5;
      if (blackPixels[0] > threshold){
        square.vote = 'yes';
      } else if (blackPixels[1] > threshold){
        square.vote = 'no';
      } else if (blackPixels[2] > threshold){
        square.vote = 'refrain';
      } else if (blackPixels[3] > threshold){
        square.vote = 'absent';
      }
      return square;
    });
  }

  function countVotes(squares) {
    var totalVotes = squares.reduce((votes, square) => {
      votes[square.vote]++;
      return votes;
    }, {yes: 0, no: 0, refrain: 0, absent: 0, missing: 0});

    var squareResults = squares.map((square) => {
      return {id: square.id, vote: square.vote};
    });

    return {total: totalVotes, squares: squareResults};
  }

  function getGridSquares(gridWidth, gridHeight){
    //TODO: this only applies to the second chamber
    var rows = 24;
    var horizontalLines = rows + 2;
    var columns = 10;
    var verticalLines = columns + 2 + 2;

    var middleColumnRatio = 1.0 / 30.0;
    var columnRatios = new Array(columns).fillUsing(0.0);
    columnRatios = columnRatios.map((_) => {
      return 1.0 / columns - middleColumnRatio / columns;
    });
    columnRatios[columns / 2] = middleColumnRatio;
    columnRatios = columnRatios.map((ratio)=>{
      return ratio * gridWidth;
    });

    var columnPositions = [0];
    columnRatios.reduce( (position, width)=> {
      var newPosition = position + width;
      columnPositions.push(newPosition);
      return newPosition;
    }, 0);
    columnPositions.push(gridWidth);

    var lastRowExtraRatio = 1/100;
    var rowRatios = new Array(rows).fillUsing(0);
    rowRatios = rowRatios.map( ()=> {
      return 1/24 - lastRowExtraRatio / 24;
    });
    rowRatios[rowRatios.length-1] += lastRowExtraRatio / 24 + lastRowExtraRatio;
    rowRatios = rowRatios.map((ratio)=>{
      return ratio * gridHeight;
    });

    var rowPositions = [0];
    rowRatios.reduce( (position, height)=> {
      var newPosition = position + height;
      rowPositions.push(newPosition);
      return newPosition;
    }, 0);

    var positions = columnPositions.map( (column) => {
      return rowPositions.map( (row) => {
        return new Coordinate(column, row);
      });
    });

    var squares = [];
    for (var j = 0; j < positions[0].length - 1; j++) {
      for (var i = 0; i < positions.length - 1; i++) {
        var square = {
          upperLeft: positions[i][j],
          upperRight: positions[i+1][j],
          lowerRight: positions[i+1][j+1],
          lowerLeft: positions[i][j+1],
          width: positions[i+1][j].x - positions[i][j].x,
          height: positions[i][j+1].y - positions[i][j].y,
          id: i + positions.length * j,
          vote: 'missing'
        }
        squares.push(square);
      }
    }

    // remove the squares in the middle line
    squares = squares.filter((square)=> {
      if ((square.id - 5) % 12 === 0) return false;
      return true;
    });

    squares = squares.map((square, index)=>{
      square.id = index;
      return square;
    });

    return squares;
  }

  function warpImage(imageData, descriptor) {

    var screenCoordinates = descriptor.coordinates.map( (coordinate)=> {
      return new Coordinate(coordinate.x * imageData.width, coordinate.y * imageData.height);
    });

    var topLeft = screenCoordinates[0];
    var topRight = screenCoordinates[1];
    var bottomRight = screenCoordinates[2];
    var bottomLeft = screenCoordinates[3];

    var topDist = topLeft.distTo(topRight);
    var bottomDist = bottomLeft.distTo(bottomRight);
    var leftDist = topLeft.distTo(bottomLeft);
    var rightDist = topRight.distTo(bottomRight);

    var outWidth = Math.floor((topDist + bottomDist) / 2);
    var outHeight = Math.floor((leftDist + rightDist) / 2);

    var outputImageData = getEmptyImage(outWidth, outHeight, 0xFFFFFFFF);

    var topVector = topRight.minus(topLeft).divide(topDist);
    var bottomVector = bottomRight.minus(bottomLeft).divide(bottomDist);

    for( var x = 0; x < outWidth; x++) {
      for( var y = 0; y < outHeight; y++) {

        var xScale = x / outWidth;
        var yScale = y / outHeight;

        var topSamplePos = topLeft.plus(topVector.scale(xScale).scale(topDist));
        var bottomSamplePos = bottomLeft.plus(bottomVector.scale(xScale).scale(bottomDist));
        var verticalDist = topSamplePos.distTo(bottomSamplePos);
        var verticalVector = bottomSamplePos.minus(topSamplePos).divide(verticalDist);
        var samplePos = topSamplePos.plus(verticalVector.scale(yScale).scale(verticalDist)).floor();

        //TODO: biqubic sampling
        var color = getPixel(imageData, samplePos.x, samplePos.y);
        setPixel(outputImageData, x, y, color);

      }
    }

    return outputImageData;
  }

  class Coordinate {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }

    distTo(b){
      return Math.sqrt(Math.pow(b.x - this.x, 2) + Math.pow(b.y - this.y, 2));
    }

    minus(b) {
      return new Coordinate(this.x - b.x, this.y - b.y);
    }

    plus(b) {
      return new Coordinate(this.x + b.x, this.y + b.y);
    }

    scale(scale) {
      return new Coordinate(this.x * scale, this.y * scale);
    }

    divide(denominator) {
      return new Coordinate(this.x / denominator, this.y / denominator);
    }

    floor() {
     return new Coordinate(Math.floor(this.x), Math.floor(this.y));
    }
  }

  function coord(x,y){
    return new Coordinate(x,y);
  }


  function applyConvolutionFilter(imageData, weights) {

      var outputImageData = getEmptyImage(imageData.width, imageData.height, 0xFFFFFFFF);

      var side = Math.round(Math.sqrt(weights.length));
      var halfSide = Math.floor(side / 2);
      var src = imageData.data;
      var sw = imageData.width;
      var sh = imageData.height;
      // pad output by the convolution matrix
      var w = sw;
      var h = sh;

      var dst = outputImageData.data;
      // go through the destination image pixels

      for (var y = 0; y < h; y++) {
          for (var x = 0; x < w; x++) {
              var sy = y;
              var sx = x;
              var dstOff = (y * w + x) * 4;
              // calculate the weighed sum of the source image pixels that
              // fall under the convolution matrix
              var r = 0,
                  g = 0,
                  b = 0,
                  a = 0;
              for (var cy = 0; cy < side; cy++) {
                  for (var cx = 0; cx < side; cx++) {
                      var scy = sy + cy - halfSide;
                      var scx = sx + cx - halfSide;
                      if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
                          var srcOff = (scy * sw + scx) * 4;
                          var wt = weights[cy * side + cx];
                          r += src[srcOff] * wt;
                          g += src[srcOff + 1] * wt;
                          b += src[srcOff + 2] * wt;
                          a += src[srcOff + 3] * wt;
                      }
                  }
              }
              dst[dstOff] = b;
              dst[dstOff + 1] = b;
              dst[dstOff + 2] = b;
              dst[dstOff + 3] = 0xFF;
          }
      }
      return outputImageData;
  };

  function makeArrayOf(value, length) {
    var arr = [], i = length;
    while (i--) {
      arr[i] = value;
    }
    return arr;
  }


  Array.prototype.fillUsing = function(what){
    for (var i = 0; i < this.length; i++){
      if (typeof what === "function") {
        this[i] = what(i);
      } else {
        this[i] = what;
      }
    }
    return this;
  }

