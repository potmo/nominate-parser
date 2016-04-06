'use strict';

var fs = require('fs');

var voters = {};

fs.readdir('./votering-201314', function(err, files){
	for (var i in files){
		var file = './votering-201314/' + files[i];
		readFile(file);
	}
});

function readFile(file){
	fs.readFile(file, 'utf-8', function(err, string) {
		if (err) {
			return console.error(err);
		}

		var input = string;
		var output = "";
		for (var i=0; i<input.length; i++) {
			if (input.charCodeAt(i) <= 300) {
				output += input.charAt(i);
			}else{
				// skip BOM and stuff
			}
		}

		readDone(output);
	});
}

function readDone(json) {
	var data = JSON.parse(json);
	parseDone(data);
}

function parseDone(data) {

	var voter,
		voter_id,
		voter_name,
		voter_party,
		votes,
		vote,
		yes = 0,
		no = 0,
		missing = 0,
		refraining = 0,
		yay_sayers = [],
		nay_sayers = [];

	votes = data.dokvotering.votering;

	for (var i in votes) {

		vote = votes[i];

		// Do not include other votes than sakfrågan
		if ( vote.avser != 'sakfrågan') continue;

		voter_id = vote.intressent_id;
		voter_name = vote.namn;
		voter_party = vote.parti;

		voter = getVoter(voter_id, voter_name, voter_party);

		if (isYes(vote)) {
			yes++;
			yay_sayers.push(voter);
		} else if (isNo(vote)) {
			no++;
			nay_sayers.push(voter);
		} else if (isMissing(vote)) {
			missing++;
		} else if (isRefraining(vote)) {
			refraining++;
		} else {
			throw vote.rost;
		}
	}

	console.log('Total %s, Yes %s, No %s, Missing %s, Refraining %s', yes + no + missing + refraining, yes, no, missing, refraining);
}

function getVoter(id, name, party){
	if (! (id in voters)){
		console.log(id + ' added ' + name + ' ('+party+')');
		voters[id] = {};
	}

	return voters[id];
}

function isYes(vote) {
	return vote.rost.toLowerCase() === 'ja';
}

function isNo(vote) {
	return vote.rost.toLowerCase() === 'nej';
}

function isMissing(vote) {
	return vote.rost.toLowerCase() === 'frånvarande';
}

function isRefraining(vote) {
	return vote.rost.toLowerCase() === 'avstår';
}