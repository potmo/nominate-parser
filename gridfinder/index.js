var fs = require('fs');
var PCA = require('ml-pca');
var Canvas = require('canvas');
var convexHull = require("quick-hull-2d");
var Image = Canvas.Image;

var coordinatesData = fs.readFileSync('./coordinates.json');
var coordinates = JSON.parse(coordinatesData);



var padding = {
	x: 300,
	y: 300
}

var canvas = new Canvas(1084 + padding.x, 616 + padding.y);
var context = canvas.getContext('2d');

var font = new Canvas.Font('Roboto', __dirname + '/../votes/Roboto-Light.ttf')
font.addFace(__dirname + '/../votes/Roboto-Light.ttf', 'light')
context.addFont(font)
context.font = '10px Roboto'
context.textAlign = "left";

coordinates = coordinates.map((coordinate) => {
	return {
		x: coordinate.x + padding.x / 2,
		y: coordinate.y + padding.y / 2
	};
});

var circleRadius = 7;

coordinates.forEach((coordinate, i) => {
	context.beginPath();
	context.arc(coordinate.x, coordinate.y, circleRadius, 0, 2 * Math.PI);
	context.stroke();
	context.fillText('' + i, coordinate.x + circleRadius, coordinate.y);
});

coordinates = coordinates.reduce((pre, curr)=>{
	pre.push({x:curr.x, y: curr.y-circleRadius});
	pre.push({x:curr.x+circleRadius, y: curr.y});
	pre.push({x:curr.x, y: curr.y+circleRadius});
	pre.push({x:curr.x-circleRadius, y: curr.y});
	return pre;
}, []);

// Calculate the principal components

var grid = coordinates.map((coordinate) => {
	return [coordinate.x, coordinate.y];
});

var pca = new PCA(grid);
console.log(pca.getEigenvalues());
var vectors = pca.getEigenvectors();

context.beginPath();
context.moveTo(canvas.width / 2, canvas.height / 2);
context.lineTo(canvas.width / 2 + vectors[0][0] * 300, canvas.height / 2 + vectors[0][1] * 300);
context.stroke();

context.beginPath();
context.moveTo(canvas.width / 2, canvas.height / 2);
context.lineTo(canvas.width / 2 + vectors[1][0] * 300, canvas.height / 2 + vectors[1][1] * 300);
context.stroke();

// calculate the convex hull
var hull = convexHull(grid).map((pair) => {
	return {
		x: pair[0],
		y: pair[1]
	};
});

context.strokeStyle = 'rgba(0,0,255,1.0)';
context.beginPath();
hull.reduce((prev, curr) => {
	context.moveTo(prev.x, prev.y);
	context.lineTo(curr.x, curr.y);
	return curr;
});
context.lineTo(hull[0].x, hull[0].y);
context.stroke();


// draw minimum bounding rectangle

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


hull.reduce(function(previous, current) {

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

	hull.forEach(function(vertex) {
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

	//context.strokeStyle = 'rgba(0,0,0,0.5)';
	//context.beginPath();
	//context.moveTo(topLeft.x, topLeft.y);
	//context.lineTo(topRight.x, topRight.y);
	//context.moveTo(topRight.x, topRight.y);
	//context.lineTo(bottomRight.x, bottomRight.y);
	//context.moveTo(bottomRight.x, bottomRight.y);
	//context.lineTo(bottomLeft.x, bottomLeft.y);
	//context.moveTo(bottomLeft.x, bottomLeft.y);
	//context.lineTo(topLeft.x, topLeft.y);
	//context.stroke();

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

context.strokeStyle = 'rgba(255,0,0,1.0)';
context.beginPath();
context.moveTo(minTopLeft.x, minTopLeft.y);
context.lineTo(minTopRight.x, minTopRight.y);
context.moveTo(minTopRight.x, minTopRight.y);
context.lineTo(minBottomRight.x, minBottomRight.y);
context.moveTo(minBottomRight.x, minBottomRight.y);
context.lineTo(minBottomLeft.x, minBottomLeft.y);
context.moveTo(minBottomLeft.x, minBottomLeft.y);
context.lineTo(minTopLeft.x, minTopLeft.y);
context.stroke();

// retio should be 1.76051779935 or 0.56801470588

console.log('ratio:', bestWidth / bestHeight);

var out = fs.createWriteStream('debug.png');
var stream = canvas.pngStream();

stream.on('data', function(chunk) {
	out.write(chunk);
});

stream.on('end', function() {
	console.log('done');
});



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