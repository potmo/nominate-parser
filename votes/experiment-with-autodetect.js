'use strict';

var { detectCoordinatesRectangle } = require('./index.js');
var async = require('async');


var from = 2;
var to = 2;
var id = from;
async.whilst((cb)=>{ 
      cb(null, id <= to);
    }, 
   (cb)=>{
   	console.log(`do ${id}`)
 	var original = '../voteringar/png/1962_1_ak_4_Voteringsprotokoll_' + `${id}`.padStart(3,'0') + '.png';
	var binarized = '../voteringar/prepared_png/1962_1_ak_4_Voteringsprotokoll_' + `${id}`.padStart(3,'0') + '.png';
	detectCoordinatesRectangle(original, binarized, (err)=>{
		console.log(`done ${id}`)
		id++;
		cb(err);
	});	   
   },
   (err, val) => {
   	console.log('done')
   });