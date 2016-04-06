var fs = require('graceful-fs'),
    path = require('path');

var dir = path.resolve('../voteringar/png');
var books = {};
fs.readdir(dir, (err, files) => {
	if (err) throw err;

	var index = files
	.filter((file) => {
		return path.extname(file) === '.png';
	})
	.map((file) => {

		var baseName = path.basename(file, '.png');
		var book = getBook(books, baseName);

		var output =
		{
			name: baseName,
			image: file,
			status: 'created',
			book: book.hashkey
		};

		var filecontent = JSON.stringify(output, null, 2);
		var outputFileName = baseName + '.json';
		var outputFile = path.resolve(path.join('../marker/db/documents', outputFileName));
		fs.writeFile(outputFile, filecontent, (err) => {
			if (err) throw err;
		});

		return baseName;
	});

	var outputFile = path.resolve(path.join('../marker/db', 'index.json'));
	var filecontent = JSON.stringify(index, null, 2);
	fs.writeFile(outputFile, filecontent, (err) => {
		if (err) throw err;
	});

	var outputFile = path.resolve(path.join('../marker/db', 'books.json'));
	var filecontent = JSON.stringify(books, null, 2)
	fs.writeFile(outputFile, filecontent, (err) => {
		if (err) throw err;
	});

});



// The format is `YYYY[-YY]_N[_abc]_[sessiontype_]ak_N_Voteringsprotokoll_NNN`
// so craziest is 1923-24_1_a_lagtima_ak_1_Voteringsprotokoll_001
// special format for urtima_ak and lagtima_ak

// sessiontype 'urtima' | 'lagtima' | 'default'
// start_year YYYY
// end_year YYYY
// type 'grid_record' | 'comissioner' | 'handwritten_record' | 'unknown'
// book the book number if many same year
// book_letter the letter on the book if they are devided into many
// first_record_on the page the first vote records appears on
// last_record_on the page the last vote records appears on
// total_pages the number of total pages
// book_number_type is the number that I haven't decrypted yet
function getBook(books, baseName){
	var regexp = /([0-9]{4})-?([0-9]{2})?_([0-9])_?([a-z])?_?(lagtima|urtima)?_(ak|fk)_([0-9])_Voteringsprotokoll_([0-9]{3})/;
	console.log(baseName);
	var results = regexp.exec(baseName);
	console.log(results);

	var start_year = parseInt(results[1]);
	var end_year = parseInt('19' + (results[2] | results[1].substring(2,4)));
	var book = parseInt(results[3]);
	var book_letter = results[4] || 'a';
	var sessiontype = results[5] || 'default';
	var house;
	if (results[6] == 'ak') {
		house = 'second';
	} else if (results[6] == 'fk') {
		house = 'first';
	} else {
		throw new Error(results[6] + ' is not a house');
	}
	var type = 'unknown';
	var book_number_type = parseInt(results[7]);
	var page = parseInt(results[8]);

	var hashkey = start_year + '-' + end_year + '_' + house + '_' + book + '_' + book_letter + '_' + sessiontype + '_' + book_number_type;

	var book;
	if (books[hashkey]){
		book = books[hashkey];
	} else {
		book = {
			hashkey: hashkey,
			start_year: start_year,
			end_year: end_year,
			book: book,
			book_letter: book_letter,
			sessiontype: sessiontype,
			house: house,
			type: type,
			book_number_type: book_number_type,
			first_record_on: 1,
			last_record_on: 1,
			total_pages: 0
		}
	}

	if (book.total_pages < page) {
		book.total_pages = page;
	}

	if (book.first_record_on > page) {
		book.first_record_on = page;
	}

	if (book.last_record_on < page) {
		book.last_record_on = page;
	}

	books[hashkey] = book;
	return book;
}