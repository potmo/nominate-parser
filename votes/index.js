  'use strict';

  var convexHull = require("quick-hull-2d");

  var Canvas = require('canvas'),
      Image = Canvas.Image,
      fs = require('fs');

  var outputConter = 0;

  function main() {
      var imageData = loadImage();

      var n = null;
      var closingKernel = [];
      closingKernel.push([n, 1, 1, 1, n]);
      closingKernel.push([1, 1, 1, 1, 1]);
      closingKernel.push([1, 1, 1, 1, 1]);
      closingKernel.push([1, 1, 1, 1, 1]);
      closingKernel.push([n, 1, 1, 1, n]);

      printOutputImage(imageData, 'original.png');

      imageData = scaleImage(imageData, 0.8);

      printOutputImage(imageData, 'scaled.png');

      var croppedImageData = crop(imageData, 0.15, 0, 0.25, 0);
      printOutputImage(croppedImageData, 'cropped.png');

      var closedImage = closing(croppedImageData, closingKernel);
      printOutputImage(closedImage, 'closed.png');

      var erodedImage = erode(croppedImageData, closingKernel);
      printOutputImage(erodedImage, 'eroded.png');

      var dilatedImage = dilate(croppedImageData, closingKernel);
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

      var dividedImage = divide(croppedImageData, closedImage);
      printOutputImage(dividedImage, 'divided.png');

      var histogram = getHistogram(dividedImage);
      var threshold = otsu(histogram, dividedImage.width * dividedImage.height);
      var highThreshold = Math.min(0xFF, Math.floor(threshold * 1.2));

      console.log('threshold %j, %j', threshold, highThreshold)

      var morphologicalBinarizedImage = morphologicalBinarize(dividedImage, threshold, highThreshold);
      printOutputImage(morphologicalBinarizedImage, 'morphbinarized.png');

      var binarizedImage = binarize(dividedImage, threshold);
      printOutputImage(binarizedImage, 'binarized.png');

      var labeledGroups = labelConnectedComponents(morphologicalBinarizedImage);

      var connectedComponentsImage = drawConnectedComponent(morphologicalBinarizedImage, labeledGroups);
      printOutputImage(connectedComponentsImage, 'connected-components.png');

      var noBorderTouchingLabeledGroups = removeGroupsTouchingImageBorder(morphologicalBinarizedImage, labeledGroups);

      var connectedComponentsImageNoBorder = drawConnectedComponent(morphologicalBinarizedImage, noBorderTouchingLabeledGroups);
      printOutputImage(connectedComponentsImageNoBorder, 'connected-components-no-border.png');

      var hulls = getGroupsByConvexHullsArea(noBorderTouchingLabeledGroups);
      var largestHull = getLargestHull(hulls);
      var hullImage = drawLargestHull(largestHull, morphologicalBinarizedImage);
      printOutputImage(hullImage, 'hull.png');

      //var minimumBoxImage = drawMinimumBoundingBox(hullImage, largestHull.polygon);
      //printOutputImage(minimumBoxImage, 'minimumbox.png');


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


  function closing(imageData, kernel) {
      var dilatedImage = dilate(imageData, kernel);
      var erodedImage = erode(dilatedImage, kernel);
      return erodedImage;
  }

  function opening(imageData, kernel) {
      var erodedImage = erode(imageData, kernel);
      dilatedImage = dilate(erodedImage, kernel);
      return dilatedImage;
  }


  function erode(imageData, kernel) {
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

  function dilate(imageData, kernel) {
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

      var output = labeledGroups.filter(function(group){
          for (var i = 0; i < group.length; i++) {
              var pixel = group[i];
              if (pixel.x >= width || pixel.x <= 0 || pixel.y >= height || pixel.y <= 0) {
                  return false;
              }
          }
          return true;
      });

      return output;
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

  function drawMinimumBoundingBox(imageData, polygon) {

      var outputImageData = getEmptyImage(imageData.width, imageData.height, 0xFFFFFFFF);

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

      // draw the grid
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

  function loadImage() {
      var canvas,
          context,
          img,
          fileBuffer = fs.readFileSync(__dirname + '/proto2.png');

      img = new Image;

      img.src = fileBuffer;

      canvas = new Canvas(img.width, img.height);
      context = canvas.getContext('2d');

      context.drawImage(img, 0, 0, img.width, img.height);

      return context.getImageData(0, 0, canvas.width, canvas.height);
  }

  function printOutputImage(imageData, filename) {

      var canvas,
          context;

      canvas = new Canvas(imageData.width, imageData.height);
      context = canvas.getContext('2d');

      context.putImageData(imageData, 0, 0);

      var out = fs.createWriteStream(__dirname + '/output/' + outputConter + "_" + filename);
      var stream = canvas.pngStream();

      console.log('printing %s %s', outputConter, filename);

      outputConter = outputConter + 1;

      stream.on('data', function(chunk) {
          out.write(chunk);
      });

      stream.on('end', function() {
          console.log('saved %s', filename);
      });
  }

  function getEmptyImage(width, height, color) {
      width = Math.floor(width);
      height = Math.floor(height);

      var canvas,
          context;

      canvas = new Canvas(width, height);
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

    canvas = new Canvas(image.width, image.height);
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
    var fromImg = new Image;
    var fromCanvas = new Canvas(image.width, image.height);
    var fromContext = fromCanvas.getContext('2d');
    fromContext.putImageData(image, 0, 0);
    fromImg.src = fromCanvas.toBuffer();

    var newWidth = Math.floor(image.width * scale);
    var newHeight = Math.floor(image.height * scale);

    console.log('incoming', image.width, image.height);
    console.log('from', fromImg.width, fromImg.height);
    console.log('new', newWidth, newHeight);

    var canvas = new Canvas(newWidth, newHeight);
    var context = canvas.getContext('2d');
    //context.putImageData(image, 0, 0, 0, 0, newWidth, newHeight);
    context.drawImage(fromImg, 0, 0, newWidth, newHeight);
    var resultImageData = context.getImageData(0, 0, newWidth, newHeight);

    console.log('result', resultImageData.width, resultImageData.height);

    return resultImageData;
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


  main();

