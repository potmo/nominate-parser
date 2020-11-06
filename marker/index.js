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
app.set('views', './views')
app.use(function(err, req, res, next) {
  console.error(err);
  res.status(500).send('Something broke!');
});


app.get('/pageeditor/:id', (req, res) => {
  var id = parseInt(req.params.id);
  console.log('get page', id);

  getAllDataFromId(id, (err, obj) => {
    if (err) return res.status(500).send(err);

    if (obj.chamber == null || obj.seatings == null) {
      obj.err = err
      return res.render('error', obj);
    } 


    res.render('index', obj);
  })
});

app.get('/membereditor', (req, res)=> {

  getMembers((err, members) => {
    if (err) return res.status(500).send(err);
    
    getConstituencies((err, constituencies) => {
      if (err) return res.status(500).send(err);

      getParties((err, parties) => {
        if (err) return res.status(500).send(err);
        res.render('members', {members, parties, constituencies});
      });
    });
  });
});

app.get('/seatings/:id/:chamber', (req, res)=> {

  var pageId = parseInt(req.params.id);
  var chamberName = req.params.chamber;
  console.log(`get seats for ${pageId} in chamber ${chamberName}`);

  getMembers((err, members) => {
    if (err) return res.status(500).send(err);

    getChamberForPageId(chamberName, pageId, (err, chamber) => {
      if (err) return res.status(500).send(err);
      
      getConstituencies((err, constituencies) => {
        if (err) return res.status(500).send(err);

        getParties((err, parties) => {
          if (err) return res.status(500).send(err);

          getSeatings((err, seatings)=>{
            if (err) return res.status(500).send(err);

            chamberSeatings = seatings[chamberName];

            res.render('seatings', {members, parties, constituencies, chamber, seatings: chamberSeatings, pageId, chamberName});
          });
        });
      });
    });
  });
});

app.get('/parties', (req, res) => {
  getParties((err, parties)=>{
    if (err) return res.status(500).send(err);
    res.json(parties);
  });
});

app.put('/seatings/:chamber/:square', (req, res) => {
  var chamberName = req.params.chamber;
  var square = parseInt(req.params.square);
  var member = parseInt(req.body.member_id);
  var pageId = parseInt(req.body.page);

  if (chamberName == null || square == null || member == null || pageId == null){
    return res.status(500).send('bad input');
  }
  getPage(pageId, (err, page) => {
    if (err) return res.status(500).send(err);
    
    getChamberForPage(page, (err, chamber)=>{
      if (err) return res.status(500).send(err);

      getSeatings((err, seatings)=>{
        if (err) return res.status(500).send(err);

        var seat = chamber.seat_layout[square];

        if (!seatings[chamberName][seat]){
          seatings[chamberName][seat] = [];
        }

        // remove previously seated at this position
        seatings[chamberName][seat] = seatings[chamberName][seat].filter((seating)=>{
          return seating.seated_at_page != pageId;
        });

        seatings[chamberName][seat].push({
          member_id: member,
          seated_at_page: pageId
        });

        saveSeatings(seatings, (err) => {
          if (err) return res.status(500).send(err);
          console.log('%j',seatings);
          res.status(200).send('OK');
        });

      });
    });
  });
});

app.get('/members', (req, res) => {
  getMembers((err, members) => { 
    if (err) return res.status(500).send(err);
    res.json(members);
  });
});

app.patch('/members/:id', (req, res) => {
  var memberId = req.params.id;
  var party = req.body.party;
  var constituency = req.body.constituency;

  getMembers((err, members) => { 
    if (err) return res.status(500).send(err);
  
    let member = members.filter(m => m.id == memberId)[0]

    if (!member) return res.status(500).send(`no member with id ${memberId}`);

    console.log(`member ${member.name} updates to ${party} and ${constituency}`);

    member.constituency = [constituency];
    member.party = [party];

    saveMembers(members, (err) => {
      if (err) return res.status(500).send(err);
      console.log('done');
      res.status(200).send('OK');  
    })
    
  });
});

app.put('/members', (req, res) => {
  
  var party = [req.body.party];
  var constituency = [req.body.constituency];
  var name = req.body.name;

  getMembers((err, members) => { 
    if (err) return res.status(500).send(err);
  
    var memberIds = members.map(m => m.id).sort((a,b)=>a-b).reverse()
    console.log(memberIds)

    var id = memberIds[0] + 1;

    var member = {
      name, 
      party, 
      constituency,
      id
    }

    console.log(`creating member ${member.name} (${member.id}) updates to ${member.party} and ${member.constituency}`);

    members.push(member);
    saveMembers(members, (err) => {
    if (err) return res.status(500).send(err);
      console.log('done');
      res.status(200).send('OK');  
    });
    
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
  async.whilst((cb)=>{ 
      console.log(`test ${id} >= ${to} (${id >= to})`); 
      cb(null, id >= to);
    }, // 12519
   (cb)=>{
    console.log(`get document ${id}`);
    getDocument(id, (err, doc) => {
      if (err) return cb('no doc: ' + id + ' '  + err);
      console.log('prepping', id);
      var imagePath = getLocalImagePath(doc.image);
      console.log(`loading ${imagePath}`);
      var preparedImagePath = getLocalPreparedImagePath(doc.image);

      console.log(`parsing ${imagePath}`);
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

app.post('/doc/:id/nullifyvotes', (req, res) => {
  var id = parseInt(req.params.id);

  console.log(`Nullifying votes for page ${id}`);

  getPage(id, (err, page) => {
    if (err) return res.status(500).send(err);
    page.votes = null
    savePage(page, (err) => {
      if (err) return res.status(500).send(err);
      res.status(200).send('OK');
    })
  });
});

app.get('/doc/clean', (req, res) => {
  
  console.log(`Cleaning up votes`);

  getSeatings( (err, seatings) => {
    if (err) return res.status(500).send(err);


    async.forEachOfSeries(documentIndex, (value, index, callback) => {
      getDocument(index, (err, doc) => {
        if (err) return callback(err);

        if (doc.id !== undefined && doc.id !== index) {
          console.log(`index missmatch. Document says ${doc.id} index says ${index} offset ${index - doc.id}`);

          var oldDocId = doc.id;
          doc.id = index;
          savePage(doc, (err) => {
            if (err) callback(err);
            
             seatings.second = seatings.second.map((seat, i) => {
              if (!seat) return;
              return seat.map((s) => {
                if (s.seated_at_page == oldDocId) {
                  console.log(`seat ${i} should change from ${oldDocId} to ${index}`);
                  s.seated_at_page = index;
                }
                return s;
              });
            });

            saveSeatings(seatings, (err) => {
              if (err) callback(err);
              callback(null);
            });
            // save newSeatings
          });
        } else {
          callback(null);
        }

      });
    }, (err)=> {
      if (err) {
        if (err) return res.status(500).send(err);
      } else {
        res.status(200).send('OK');
      }
    });
  });
  
});



app.post('/doc/:id/coordinates', (req, res) => {
  var id = parseInt(req.params.id);
  var coordinates = req.body;

  saveCoordinates(id, coordinates, (err)=> {
    if (err) return res.status(500).send(err);
    res.status(200).send('OK');
  });

});

app.listen(3000, () => {
  console.log('Example app listening on port 3000!');
});

function saveCoordinates(id, coordinates, callback) {

  getPage(id, (err, page) => {
    if (err) return callback(err, null)
    page.coordinates = coordinates;

    detectVotesAndSave(page, callback);

  });
}

function detectVotesAndSave(page, callback) {
  var imagePath = getLocalImagePath(page.image);
  var resolvedImagePath = getLocalResolvedImagePath(page.image);
  var preparedImagePath = getLocalPreparedImagePath(page.image);

  getAllDataForPage(page, (err, data) => {

    if (err) return callback(err, null);
    if (data.seatings == null) return callback(err, null);

    var labels = data.seatings.map((d) => {return d ? `${d.name}, ${d.party.join(',')}` : "[empty]"})

    imageParser.getVotesFromPreparedImage(preparedImagePath, imagePath, resolvedImagePath, page, labels, (err, votes)=> {
      if (err) return callback(err, null);
      page.votes = votes;
      savePage(page, (err)=>{
        if (err) return callback(err, null);
        callback(null, page);
      });
    });
  });
}

function getAllDataFromId(id, callback) {

  getPage(id, (err, page) => {
    if (err) return callback(err, null);

    getAllDataForPage(page, callback);
  });
}

function getAllDataForPage(page, callback) {
  getBook(page.book, (err, book)  => {
    if (err) return callback(err, null);

    getBookIndex((err, bookIndex)=>{
      if (err) return callback(err, null);

      getChamberForPage(page, (err, chamber)=>{
        if (err) return callback(null, {page: page, book: book, book_index: bookIndex, error: err});
      
        getMembersOnSeats(page.id, book.chamber, chamber, (err, seatings)=>{
          if (err) return callback(null, {page: page, book: book, book_index: bookIndex, error: err});

          var partyVotes = getVotesPerParty(page, seatings);

          return callback(null, {page: page, book: book, chamber: chamber, seatings: seatings, book_index: bookIndex, partyVotes})
        });
      });
    });
  });
}

function getVotesPerParty(page, seatings) {
  var parties = {}
  for (var squareId in page.votes.squares) {
    var square = page.votes.squares[squareId];
    if( seatings[square.id] ) {
      var party = seatings[square.id].party.join(',');
      if (!parties[party]) {
        parties[party] = {yes: 0, no: 0, refrain: 0, absent: 0, missing: 0};
      }
      parties[party][square.vote]++;
    }
  }
  return parties
}

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

function getLocalConstituenciesPath() {
  var relativePath = path.join('../voteringar/db/constituencies.json');
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
    getBook(page.book, (err, book)  => {
      return getChamberForPageId(book.chamber, page.id, callback);
    });
}

function getChamberForPageId(chamberName, pageId, callback) {
  var fullPath = getLocalChambersPath();
  fs.readFile(fullPath, (err, data) => {
    if (err) return callback(err, null);
    var chambers = JSON.parse(data);

    if (!chambers.chambers[chamberName]) return callback(`No chamber for with name ${chamberName} on page ${pageId}`, null);

    var matchingChambers = chambers.chambers[chamberName].filter((chamber)=>{
        //console.log(page.id, chamber.start_page, chamber.end_page);
        if (pageId >= chamber.start_page  &&  pageId <= chamber.end_page) {
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
}

function getMemberOnSeat(pageNum, chamberName, seatLayout, seat, callback) {
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
        //console.log("found not to member %s seated at %s", seatings[chamberName][seat][i].member_id, seatings[chamberName][seat][i].seated_at_page, pageNum)
        //console.log(`member ${seatings[chamberName][seat][i].member_id} does not appear to be seated at seat ${seat}. The seat is occupied at ${seatings[chamberName][seat][i].seated_at_page} but this is ${pageNum}`)
      }
    }

    if (seatedMemberId != null){
      return getMember(seatedMemberId, callback);
    }else{
      //return callback(`No member found on seat ${seat} on page ${pageNum}`, null);
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

function getMembersOnSeats(pageNum, chamberName, chamber, callback) {
  async.map(chamber.seat_layout, (seat, cb)=>{
    getMemberOnSeat(pageNum, chamberName, chamber.seat_layout, seat, cb);
  }, callback);
}

function getConstituencies(callback){
  var file = getLocalConstituenciesPath();
  fs.readFile(file, (err, data) => {
    if (err) return callback(err, null);
    var json = JSON.parse(data);
    callback(null, json);
  });
}

function getParties(callback){
  var file = getLocalPartiesPath();
  fs.readFile(file, (err, data) => {
    if (err) return callback(err, null);
    var json = JSON.parse(data);
    callback(null, json);
  });
}


function getMembers(callback){
  var file = getLocalMembersPath();
  fs.readFile(file, (err, data) => {
    if (err) return callback(err, null);
    var json = JSON.parse(data);
    callback(null, json);
  });
}


function getMember(id, callback){
  getMembers((err, members) => {

    if (err) return callback(err, null);

    var membersWithId = members.filter((member)=>{
      return member.id === id;
    });

    if (membersWithId.length == 0) {
      return callback('No member with id ' + id + ' found', null);
    }else if (membersWithId.length > 1){
      return callback('More than one member with id ' + id + ' found', null);
    }

    let member = membersWithId[membersWithId.length - 1];

    if (!member) {
      return callback('No member with id ' + id + ' found', null);
    }

    callback(null, member);

  });
}


function getBookIndex(callback) {
  fs.readFile(path.resolve('../voteringar/db/books.json'), (err, books) => {
    if (err) return callback(err);
    var books = JSON.parse(books);

    var page = 0;
    var index = Object.keys(books)
                      .map((book_hash)=>{
                        return books[book_hash];
                      })
                      .map((book)=>{
                        document_id = page;
                        page += book.total_pages;

                        return {
                          start_year: book.start_year,
                          end_year: book.end_year,
                          book: book.book,
                          book_letter: book.book_letter,
                          sessiontype: book.sessiontype,
                          chamber: book.chamber,
                          type: book.type,
                          book_number_type: book.book_number_type,
                          total_pages: book.total_pages,
                          start_document_id: document_id
                        };
                      });

    //console.log('index', index);
    callback(null, index);

  });
}


function savePage(page, callback) {

  getFile(page.id, (err, file) => {
    if (err) return callback(err);
    var json = JSON.stringify(page, null, 2);
    fs.writeFile(file, json, (err)=>{
      if (err) return callback(err);
      console.log('saved %s (%s)', page.id, file);
      callback(null);
    });
  });
}

function saveMembers(members, callback) {

  var file = getLocalMembersPath()
  var json = JSON.stringify(members, null, 2);
  fs.writeFile(file, json, (err)=>{
    if (err) return callback(err);
    console.log('saved members');
    callback(null);
  });  
}

function getPage(id, callback) {
  getDocument(id, (err, doc) => {
    if (err) return callback(err);

    var page = {};

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

    // try to detect coordinates and save them
    if (!doc['coordinates']) {
      
      console.log('page does not have coordinates. Try to detect them');
      var originalImagePath = getLocalImagePath(page.image);
      var preparedImagePath = getLocalPreparedImagePath(page.image);
      imageParser.detectCoordinatesRectangle(originalImagePath, preparedImagePath, (err, rectangle) => {
        if (err) {
          // fallback
          page.coordinates = [
            {x:0.016,y:0.2126514131897712},
            {x:0.981,y:0.22611036339165544},
            {x:0.974,y:0.9582772543741588},
            {x:0.013,y:0.9475100942126514}];
        } else if (rectangle) {
          console.log(`detected coordinates: ${rectangle}`);
          page.coordinates = rectangle;  
        }

        // if we have a chamber we can try to save this right away
        getChamberForPage(page, (err, chamber)=>{
          // if no chamber just return without saving
          if (err) return callback(null, page);

          detectVotesAndSave(page, callback);
        });        
      });
    
    } else {
      page.coordinates = doc.coordinates;
      callback(null, page);
    }

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
