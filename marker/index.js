var express = require('express');
var app = express();
var fs = require('fs');
var path = require('path');
var bodyParser = require('body-parser');
var imageParser = require('../votes/index.js');
var async = require('async');

var documentIndex = [];

fs.readFile(path.resolve('../voteringar/db/index.json'), (err, data) => {
  if (err) throw err;
  documentIndex = JSON.parse(data);

  //prep(0, 12519, (err)=>{
  // console.log('all done', err);
  //});
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

  //fori(0, 130).map((i)=>{
  //  getMemberOnSeat(i, 'first', 0, (err, member)=> {
  //      if (err || !member) {
  //        console.log( pad(i,3) + ' no one on seat ' + 0 + ' on page ' + i, err);
  //      }else{
  //        console.log( pad(i,3) + ' ' + member.name + '(' + member.id + ') on seat ' + 0 + ' on page ' + i);
  //      }
  //    });
  //});

  getPage(id, (err, page) => {
    if (err) return res.status(500).send(err);

    getBook(page.book, (err, book)  => {
      if (err) return res.status(500).send(err);

      getChamberForPage(page, (err, chamber)=>{
        if (err) return res.status(500).send(err);

        getMembersOnSeats(id, book.chamber, chamber.seats, (err, seatings)=>{
          if (err) return res.status(500).send(err);

          res.render('index', {page: page, book: book, chamber: chamber, seatings: seatings});
        });
      });
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

app.put('/seatings/:chamber/:seat', (req, res) => {
  var chamberName = req.params.chamber;
  var seat = parseInt(req.params.seat);
  var member = parseInt(req.body.member_id);
  var page = parseInt(req.body.page);

  if (chamberName == null || seat == null || member == null || page == null){
    return res.status(500).send('bad input');
  }

  getSeatings((err, seatings)=>{
    if (err) return res.status(500).send(err);

    if (!seatings[chamberName][seat]){
      seatings[chamberName][seat] = [];
    }

    // remove previously seated at this position
    seatings[chamberName][seat] = seatings[chamberName][seat].filter((seating)=>{
      return seating.seated_at_page != page;
    });

    seatings[chamberName][seat].push({
      member_id: member,
      seated_at_page: page
    });

    saveSeatings(seatings, (err) => {
      if (err) return res.status(500).send(err);
      console.log('%j',seatings);
      res.status(200).send('OK');
    });

  });
});

app.get('/members', (req, res) => {
  var fullPath = getLocalMembersPath();
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

app.get('/prepared/:id', (req, res) => {
  var id = parseInt(req.params.id);
  prep(id,id, (err)=>{
    if (err) return res.status(500).send(err);
    res.status(200).send('OK');
  });
});

function prep(from, to, callback){
  var id = from;
  console.log('start prepping');
  async.whilst(()=>{ return id >= to }, // 12519
               (cb)=>{
                getDocument(id, (err, doc) => {
                  if (err) return cb('no doc: ' + id + ' '  + err);
                  console.log('prepping', id);
                  var imagePath = getLocalImagePath(doc.image);
                  var preparedImagePath = getLocalPreparedImagePath(doc.image);

                  imageParser.prepareImage(imagePath, preparedImagePath, (err)=>{
                    id--;
                    if (err) return cb('can not prepare: ' + id + ' '  + err);
                    console.log('done with', id);
                    cb(null);
                  });
                });
               },
               callback);
};

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

app.patch('/doc/:id/votes/:square', (req, res) => {
  var id = parseInt(req.params.id);
  var square = parseInt(req.params.square);
  var validTypes = ['yes',
                    'no',
                    'refrain',
                    'absent',
                    'missing'];

  var value = req.body.value;

  if (validTypes.indexOf(value) == -1){
    return res.status(500).send('not a valid vote: ' + value);
  }

  getPage(id, (err, page) => {
    if (err) return res.status(500).send(err);

    var previousVote = page.votes.squares[square].vote;
    page.votes.squares[square].vote = value;
    page.votes.total[previousVote]--;
    page.votes.total[value]++;
    savePage(page, (err) => {
      if (err) return res.status(500).send(err);
      res.status(200).send('OK');
    })
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

    var preparedImagePath = getLocalPreparedImagePath(page.image);

    imageParser.getVotesFromPreparedImage(preparedImagePath, imagePath, resolvedImagePath, page, (err, votes)=> {
      if (err) return res.status(500).send(err);
      page.votes = votes;
      savePage(page, (err)=>{
        if (err) return res.status(500).send(err);
        res.status(200).send('OK');
      });
    });

    //imageParser.getVotes(imagePath, resolvedImagePath, page, (err, votes)=> {
    //  if (err) return res.status(500).send(err);
    //  page.votes = votes;
    //  savePage(page, (err)=>{
    //    if (err) return res.status(500).send(err);
    //    res.status(200).send('OK');
    //  });
    //});
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

function getLocalPreparedImagePath(filename) {
  var relativePath = path.join('../voteringar/prepared_png/', filename);
  var fullPath = path.resolve(relativePath);
  return fullPath;
}

function getLocalMembersPath() {
  var relativePath = path.join('../voteringar/db/members.json');
  var fullPath = path.resolve(relativePath);
  return fullPath;
}

function getLocalPartiesPath() {
  var fullPath = path.resolve('../voteringar/db/parties.json');
  return fullPath;
}

function getLocalChambersPath() {
  var fullPath = path.resolve('../voteringar/db/chambers.json');
  return fullPath;
}

function getLocalSeatingsPath() {
  var fullPath = path.resolve('../voteringar/db/seatings.json');
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

function getChamberForPage(page, callback) {
  var fullPath = getLocalChambersPath();
  fs.readFile(fullPath, (err, data) => {
    if (err) return callback(err, null);
    var chambers = JSON.parse(data);

    getBook(page.book, (err, book)  => {
      if (err) return callback(err, null);

      if (!chambers.chambers[book.chamber]) return callback('no chamber for ' + page, null);

      var matchingChambers = chambers.chambers[book.chamber].filter((chamber)=>{
        console.log(page.id, chamber.start_page, chamber.end_page);

        if (page.id >= chamber.start_page  &&  page.id <= chamber.end_page) {
          return true;
        }else{
          return false;
        }
      });

      if (matchingChambers.length == 1){
        callback(null, matchingChambers[0]);
      }else if(matchingChambers.length > 1){
        callback('more than one chamber maching: ' + matchingChambers.map(JSON.stringify).join(','), null);
      }else{
        callback('no chamber found', null);
      }

    });
  });
}

function getMemberOnSeat(pageNum, chamberName, seat, callback) {
  getSeatings((err, seatings)=>{
    if (err) return callback(err, null);

    if (!seatings[chamberName][seat]){
      seatings[chamberName][seat] = [];
    }

    seatings[chamberName][seat].sort((a,b) => {
      return a.seated_at_page - b.seated_at_page;
    });

    var seatedMemberId = null;
    for(var i = 0; i < seatings[chamberName][seat].length; i++) {
      if (pageNum >= seatings[chamberName][seat][i].seated_at_page) {
        //console.log("found member %s seated at %s", seatings[chamberName][seat][i].member_id, seatings[chamberName][seat][i].seated_at_page, pageNum)
        seatedMemberId = seatings[chamberName][seat][i].member_id;
      }else{
        console.log("found not to member %s seated at %s", seatings[chamberName][seat][i].member_id, seatings[chamberName][seat][i].seated_at_page, pageNum)
      }
    }

    if (seatedMemberId != null){
      return getMember(seatedMemberId, callback);
    }else{
      return callback(null, null);
    }
  });
}

function getSeatings(callback){
  var fileName = getLocalSeatingsPath();
  fs.readFile(fileName, (err, data)=>{
    if (err) return callback(err, null);
    var json = JSON.parse(data);
    callback(null, json);
  });
}

function saveSeatings(seatings, callback){
  var file = getLocalSeatingsPath();
  var json = JSON.stringify(seatings, null, 2);
  fs.writeFile(file, json, (err)=>{
    if (err) return callback(err);
    console.log('saved seatings');
    callback(null);
  });
}

function getMembersOnSeats(pageNum, chamberName, totalSeats, callback) {
  var seats = fori(0, totalSeats + 1);
  async.map(seats, (seat, cb)=>{
    getMemberOnSeat(pageNum, chamberName, seat, cb);
  }, callback);
}


function getMember(id, callback){
  var file = getLocalMembersPath();
  fs.readFile(file, (err, data) => {
    if (err) return callback(err, null);

    var json = JSON.parse(data);

    var membersWithId = json.filter((member)=>{
      return member.id === id;
    });

    if (membersWithId.length == 0) {
      return callback('No member with id ' + id + ' found', null);
    }else if (membersWithId.length > 1){
      return callback('More than one member with id ' + id + ' found', null);
    }

    callback(null, membersWithId[membersWithId.length - 1]);

  });
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

    //TODO: This is only for the second chamber
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

function fori(from, to){
  var array = new Array(to - from);
  for (var i = 0; i < array.length; i++){
    array[i] = from + i;
  }
  return array;
}


function pad(num, zeros){
  var num = '' + num;
  while(num.length < zeros){
    num = '0' + num;
  }
  return num;
}
