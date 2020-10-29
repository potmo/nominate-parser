'use strict';

var fs = require('fs');
var path = require('path');

function getUniqueConstituencies(callback) {
	getMembers((err, members) => {
		if (err) return callback(err, null);


		let constituencies = members.map(a => a.constituency)
			                          .flatMap(a => a)
                                .unique();

    callback(null, constituencies);

	})
}


function getLocalMembersPath() {
  var relativePath = path.join('../voteringar/db/members.json');
  var fullPath = path.resolve(relativePath);
  return fullPath;
}

function getMembers(callback){
  var file = getLocalMembersPath();
  fs.readFile(file, (err, data) => {
    if (err) return callback(err, null);
    var json = JSON.parse(data);
    callback(null, json);
  });
}

Array.prototype.unique = function() {
 var o = {}, a = [], i, e;
 for (i = 0; e = this[i]; i++) {o[e] = 1};
 for (e in o) {a.push (e)};
 return a;
}


getUniqueConstituencies((err,constituencies) => console.log(constituencies));