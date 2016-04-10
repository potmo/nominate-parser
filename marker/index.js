var express = require('express');
var app = express();
var fs = require('fs');
var path = require('path');
var bodyParser = require('body-parser');
var imageParser = require('../votes/index.js');

var documentIndex = [];

fs.readFile(path.resolve('../voteringar/db/index.json'), (err, data) => {
  if (err) throw err;
  documentIndex = JSON.parse(data);
});

app.use(bodyParser.json());
//app.use(express.json())
app.use(express.static('page'));
app.set('view engine', 'jade');
app.use(function(err, req, res, next) {
  console.error(err);
  res.status(500).send('Something broke!');
});

app.get('/pageeditor/:id', (req, res) => {
  var id = parseInt(req.params.id);
  console.log('get page', id);

  getPage(id, (err, page) => {
    if (err) return res.status(500).send(err);

    console.log('page book', page.book);

    getBook(page.book, (err, book)  => {
      if (err) return res.status(500).send(err);

      console.log('got it');

      res.render('index', {page: page, book: book});
    });
  });
});

app.get('/membereditor', (req, res)=> {
  res.render('members');
});

app.get('/parties', (req, res) => {
  var fullPath = getLocalPartiesPath();
  fs.readFile(fullPath, (err, data) => {
    if (err) return res.status(500).send(err);
    var json = JSON.parse(data);
    res.json(json);
  });
});

app.get('/image/:filename', (req, res) => {
  var filename = req.params.filename;
  var fullPath = getLocalImagePath(filename);
  console.log('GET image', fullPath);
  res.sendFile(fullPath);
});

app.get('/image/resolved/:filename', (req, res) => {
  var filename = req.params.filename;
  var fullPath = getLocalResolvedImagePath(filename);
  //TODO: Maybe show a nicer 404 for this
  console.log('GET image', fullPath);
  res.sendFile(fullPath);
});

app.get('/docs/:id', (req, res) => {
  var id = parseInt(req.params.id);
  getDocument(id, (err, json) => {
    if (err) return res.status(404).send(err);

    res.json(json);
  });
});

app.patch('/doc/:id/coordinates/:index', (req, res) => {
  var id = parseInt(req.params.id);
  var coordinateIndex = parseInt(req.params.index);

  console.log('update %s with coordinate %s to %j', id, coordinateIndex, req.body);
  getPage(id, (err, page) => {
    if (err) return res.status(500).send(err);
    page.coordinates[coordinateIndex] = req.body;
    savePage(page, (err) => {
      if (err) return res.status(500).send(err);
      res.status(200).send('OK');
    });
  });
});

app.post('/doc/:id/coordinates', (req, res) => {
  var id = parseInt(req.params.id);
  getPage(id, (err, page) => {
    if (err) return res.status(500).send(err);
    var imagePath = getLocalImagePath(page.image);
    var resolvedImagePath = getLocalResolvedImagePath(page.image);
    var coordinates = req.body;
    page.coordinates = coordinates;
    imageParser.getVotes(imagePath, resolvedImagePath, page, (err, votes)=> {
      if (err) return res.status(500).send(err);
      page.votes = votes;
      savePage(page, (err)=>{
        if (err) return res.status(500).send(err);
        res.status(200).send('OK');
      });
    });
  });
});

app.listen(3000, () => {
  console.log('Example app listening on port 3000!');
});

function getLocalImagePath(filename) {
  var relativePath = path.join('../voteringar/png/', filename);
  var fullPath = path.resolve(relativePath);
  return fullPath;
}

function getLocalPartiesPath() {
  var fullPath = path.resolve('../voteringar/db/parties.json');
  return fullPath;
}

function getLocalResolvedImagePath(filename) {
  var relativePath = path.join('../voteringar/resolved/', filename);
  var fullPath = path.resolve(relativePath);
  return fullPath;
}

function getFile(id, callback) {
  if (id < 0 || id >= documentIndex.length) return callback("file not found", null);
  id = parseInt(id);
  var name = documentIndex[id];
  if (!name) return callback('not found in document index: ' + id);
  var dir = path.resolve('../voteringar/db/documents/')
  var fullPath = path.join(dir, name + '.json' );
  callback(null, fullPath);
}

function savePage(page, callback) {

  getFile(page.id, (err, file) => {
    if (err) return callback(err);
    var json = JSON.stringify(page, null, 2);
    fs.writeFile(file, json, (err)=>{
      if (err) return callback(err);
      console.log('saved %s (%s) %j', page.id, file, page);
      callback(null);
    });
  });
}

function getPage(id, callback) {
  getDocument(id, (err, doc) => {
    if (err) return callback(err);

    var page = {};

    if (!doc['coordinates']) {
      page.coordinates = [{x:0.1, y:0.1},
                           {x:0.9, y:0.1},
                           {x:0.9, y:0.9},
                           {x:0.1, y:0.9}]
    }else{
      page.coordinates = doc.coordinates;
    }
    page.status = doc.status;
    page.id = id;
    page.name = doc.name;
    page.image = doc.image;
    page.book = doc.book;

    if (!doc['page']){
      var pageRegexp = /.*?Voteringsprotokoll_([0-9]{3})/
      var result = pageRegexp.exec(page.name);
      page.page = parseInt(result[1]);
    }else{
      page.page = doc.page;
    }

    //TODO: This is only for the second house
    if (!doc['votes']){
      page.votes = {
        squares: [],
        total: {
          yes: 0,
          no: 0,
          refrain: 0,
          absent: 0,
          missing: 233
        }
      };
    }else{
      page.votes = doc.votes;
    }
    callback(null, page);

  });
}

function getDocument(id, callback) {
  getFile(id, (err, file) => {
    if (err) return callback(err, null);

    fs.readFile(file, (err, data) => {
      if (err) return callback(err, null);

      var json = JSON.parse(data);
      callback(null, json);
    });
  });
}

function getBook(hashkey, callback) {
  fs.readFile(path.resolve('../voteringar/db/books.json'), (err, books) => {
    if (err) return callback(err, null);
    var books = JSON.parse(books);
    var book = books[hashkey];
    if (!book) return callback('No book found with hashkey: ' + hashkey, null);
    callback(null, book);
  });
}
