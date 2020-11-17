# nominate-parser

This is some tools to semi-automaticallty read voting records from the swedish parliament. 

## Usage

### Starting
Start the server by `cd marker` and `./run.sh`
It will start a deamon that watches the files you need

### Editing votes
Open the browser and go to e.g. `http://localhost:3000/pageeditor/12232`.
Adjust the grid over the page so that it aligns with the numbers and press `save` above the image. If it works a new image should appear below showing the OCR-read result.
Then compare the results on the printed paper with the OCR-read results.

#### How to align
>TODO: Write this

#### How to check correctness
>TODO: Write this

### Editing members
This is useful to change the name of a member but it doesn't seem to be properly implemented.
Open the browser and go to e.g. `http://localhost:3000/membereditor`

### Editing seating
Seatings can be edited by navigating to

`http://localhost:3000/seatings/:pageid/:chamber`

where `:chamber` can be `first|second|one` and `pageid` refers to the internal pageid.

## Data layout

### `chambers.json`
Chambers contains, for each chamber (`first`, `second` and `one`), a list of chamber configurations. The configuration contains a layout of the parties and of the seatings. Parties and seatings are zero indexed and referring to the `square`.

### `seatings.json`
Seatings contains a list where the index corresponds to the `chambers` `seat_layout`

### `members.json` 
Members contains a straight array of all members. This is used from other datasets to referr to a person. The members dataset can be used between chambers and years.

### `parties.json`
Parties contains a list of parties that occur in the dataset and their abbreviations.

### `index.json`
Index contains a list of all scanned files

### `books.json`
Books contains data of the scanend books as they are stored in the library. It also contains year and number of pages as well as on what page the first record is (since the cover is also sometimes scanned).

### `documents/*.json`
Document contains the parsed data for a page in a book.
It contains the vote per `square`.
To figure out who voted you need to first look up the `chambers` to figure out the seating configuration. Then from the seating configuration look up the `seatings` to figure out who was seated at that time and then look up the `members` to figure out what the name of that person is.

## Fixes for problems when working

### Prepared PNG image is corrupt
If a prepped image is not working you can first check with `pngcheck`

`brew install pngcheck`

`pngcheck -tcv xxx/nominate/voteringar/prepared_png/1961_1_ak_4_Voteringsprotokoll_049.png`

and then call `http://localhost:3000/prepared/:pageid` to reprepare it (binarize etc.)

## Mandates
> TOD: write this

## Records 

### How they are made
>TODO: Write this

#### Types of records and when they change
>TODO: Write this

### How I got them
>TODO: Write this

### Reading the records

>TODO: Implement this

### Dates and titles

>TODO: implement this

### Members
Members are sourced from `https://sv.wikipedia.org/wiki/Kategori:Listor_%C3%B6ver_ledam%C3%B6ter_av_Sveriges_riksdags_andra_kammare`

#### Non-unique names
Sometimes there are members with the same name. For example in the second chamber of 1965 there is a _Rune Johansson_ from both Koronobergs and Östergötlands constituency.

### Seatings
Members are seated by constituency with the largest constituency on the front row starting from the left (seen from the seatings). The person with most votes sits first and then in decending order.
e.g. in 1965 Stockholms stad is biggest and most votes in stockholms stad is Tager Erlander so he sits at the first chair. Second in Bertil Ohlin and so on.
Between years the seatings changes for some, to me currently, unkown reason. Two persons might swap places for example.

>TODO: When people swap places in the beginning of the year. They seating also changes party so that has to be fixed. Hence the `chambers.json -> .party_layout` is wrong after a new year.

#### Replacement members
If one member is replaced their name is corrected in the records with a pencil. Since the seat is allocated to a constituency and party is is possible to deduce the member without extensive research from their surname since the set surname, constituency, party is usually unique.

#### Party changes and "wilds"
Sometimes members leave their original party and joins a new one mid elected period. Since the seat is allocated to a specific party only the original party affiliation is recorded. I have currently not changed party affiliation mid-election period but insted elected to record the vote as the party the member was elected to.

There is a list here that could be useful:
https://sv.wikipedia.org/wiki/Partil%C3%B6s

### Errors
In some cases the dot is the record is missing for one or several votes. It is sometimes possible to deduce the actual vote from the total in the record assuming that is correct. Sometimes there are multiple missing votes and just using the total is not enough. I have in those cases chosen the most probable vote using the fact that party members usually vote as their fellow party members.

> TODO: Change party affiliations mid election?

### First Chamber

The first chamber protocols are nicer than the second chamber since it contains destinctive names. There are no seat numbering on the protocols so I have just numbered them from 1 to 150 from top left (plus the row of 151 and 152 that is the first and second vice speakers seats).
The first chamber also (at least after 1957) always have a summation of the votes so that it is easy to double check against.

### 1957-1957
Since both the seats in the upper left and the seats in the lower right is empty it makes the automatic grid detection detect a rotated rectangle in a lot of the cases making the scanning more tedious. 

#### Parties
_Socialdemokraterna (s)_ got 79 seats
_Högerpartiet (h)_ got 13 seats 
_Folkpartiet (f)_ got 30 seats 
_Centerpartiet (c)_ got 25 seats
_Sveriges kommunistiska parti (k)_ got 3 seats

Erik Boheman (f) from Göteborgs stad is speaker and have no vote.

#### Voting records
Seats 1, 2, 24 is empty. I'm guessing since that is the Speaker, 1st vice speaker and 2nd vice speaker that usually sits there. The two vice speakers are seated at seat 151 and 152.

#### Members

#### Errors

### 1958-1958


#### Parties
_Socialdemokraterna (s)_ got 79 seats
_Högerpartiet (h)_ got 16 seats 
_Folkpartiet (f)_ got 29 seats 
_Centerpartiet (c)_ got 24 seats
_Sveriges kommunistiska parti (k)_ got 3 seats

Erik Boheman (f) from Göteborgs stad is speaker and have no vote.
Total members are increased to 151 meaning that seat 153 gets occupied.
Göteborgs stad gets one more seat.

#### Voting records
Seats 1, 2, 24 is empty. I'm guessing since that is the Speaker, 1st vice speaker and 2nd vice speaker that usually sits there. The two vice speakers are seated at seat 151 and 152.

#### Members
Gunnar Svärd (h), changes from Göteborgs stad to Jönköpings län.
Bo Seigbahn (s) is representing s, but will later represent h.


#### Errors
|Page       | Seat      | Note                  |
|---        |---        |---                    |
|7157-7163       | 21-40        | Missing vote |
|7287| all | photography failed so no votes registered |


### 1959-1960

#### Parties
_Socialdemokraterna (s)_ got 79 seats
_Högerpartiet (h)_ got 16 seats 
_Folkpartiet (f)_ got 32 seats 
_Centerpartiet (c)_ got 22 seats
_Sveriges kommunistiska parti (k)_ got 2 seats

#### Voting records
Seats 1, 2, 42 is empty. The speaker is Gunnar Sundelin (f) from Örebro. Ivar Johansson (c) from Östergötland becomes the 2nd vice speaker. On page 7562 it is confirmed by the notes on the protocol that it it the vice speakers voting from seat 151 and 152.

#### Members


#### Errors
|Page       | Seat      | Note                  |
|---        |---        |---                    |
|7496       | all       | technichal error with photographing the record so all votes are missing |


## Second Chamber
### 1957-1958 (spring)

https://sv.wikipedia.org/wiki/Resultat_i_andrakammarvalet_1958


#### Parties
_Socialdemokraterna (s)_ got 106 seats
_Högerpartiet (h)_ got 42 seats 
_Folkpartiet (f)_ got 58 seats 
_Centerpartiet (c)_ got 19 seats
_Sveriges kommunistiska parti (k)_ got 6 seats

#### Voting records
The records does not contain any summation so it is hard to double check thew count. It also doesn't contain any party abbrevation so it becomes hard to figure out whos on what chair.

#### Members
1957 starts of by beeing one person short. There is only 230 of the 231 members in the record. It seems that there should be one social democrat since there is one short of filling their mandate of 106 (maybe the speaker that was s and did not have any vote). It might have something to do with the empty seats at 51 and 155.
There also seems to be one person too many for Värmland.

Seat 51 and 155 is empty. Im guessing that those seats are the first and second vice speakers Martin Skoglund and Oscar Malmborg.

Seat 92 and 96 are both members of Kristianstad and both called Nilsson (Jöns (h)/Arvid(f)). I'm guessing the second are are Arvid and the first Jöns. It seems to work with how they vote.

Seat 120 and 122 are both members of Halldn and both called Bengtsson (Ingemund (s) and Tore (s)) and both are from the same party so it is impossible to figure out whos who without seating lists.

Seat 138 and 140 are seated by two Johansson (Olof (f)/Carl (s)) from Bohuslän

Seat 137 and 141 are seated by two Svensson (Waldemar (f)/Evert(s)) from Bohuslän. They seem to sit in that order according to how they vote.

Seat 200 and 201 are seated by two Nilsson (Henning(k)/Gerhard (h)) from Gävleborg. They seem to sit in that order according to how they vote.

Seat 207, 208, 209 are seated by three Andersson (Alf(s) / Oscar (f) / John (f)) from Västernorrland. Alf most probably sit on 207 but the other two, being both f, are impossible to figure out without a seating list. (It might be that Oscar should replace John on seat 209 due to that Oscar leaves 1958 in the autumn and that would make everyone keep their seat).

#### Errors
|Page       | Seat      | Note                  |
|---        |---        |---                    |
|6703       | 180        | Missing vote |



### 1958 (autumn)-1960

https://sv.wikipedia.org/wiki/Lista_%C3%B6ver_ledam%C3%B6ter_av_Sveriges_riksdags_andra_kammare_1958%E2%80%931960

https://sv.wikipedia.org/wiki/Andrakammarvalet_i_Sverige_1958

This election was an extra election. It ended up with the socialist block (s+k) having 116 seats and opposition 115 but since the speaker was a social democrat and did not have any vote it ended up being 115 to 115.

#### Parties
_Socialdemokraterna (s)_ got 111 seats
_Högerpartiet (h)_ got 45 seats 
_Folkpartiet (f)_ got 38 seats 
_Centerpartiet (c)_ got 32 seats
_Sveriges kommunistiska parti (k)_ got 5 seats

#### Members

There are only 230 members counted (but should be 231). One socialdemocrat missing (that might be the speaker who is social democrat and not allowed to vote. It should be Patrik Svensson at this time from Älvsborg norra). Once again Älvsborgs Norra has one too many members.

Seat 113 and 115 is both occupied by a Hansson (Nils g (c)/ Stig(c)) from Malmöhus and both are from the same party. It is impossible to know who is who without a seating list.

Seat 120 adn 121 both has a Bengtsson (Ingemund (s)/Tore(s)) from Halland and both are the same party. It is impossible to know who is who without a seating list.

In 1958 the seat layout changes slightly from missing seat 163 to missing seat 143 in the chamber layout.

In the middle of 1958 (page 7308) seat 143 disappears and 163 comes back. I'm not sure why that is, if it is a typo or something else strange. 

In the very end of 1960 (page 8531) they again switch seats. Seat 52 gets empty and seat 143 becomes seated and reappear again while seat 155 disappears. 

#### Errors
|Page       | Seat      | Note                  |
|---        |---        |---                    |
|7251       | 10        | Missing vote |
|7084       | All       | The page is a handwritten record with only parties. I havent bothered to manually type it in. |
|7087, 7096       | 78        | missing vote |
|7090, 7091 | 53, 78    | missing vote |
|7097 | 32    | missing vote |
|7113, 7115, 7116 | 36    | missing vote |
|7338| 20,50, 80, 100,120,191,201,211 | missing vote (probably all absent and the rightmost column is missing) |
|7344| 50 | vote missing |
|7348| 100 | vote missing |
|7600, 7601, 7602| all | vote is a handwritten record|
|7644| 161, 221 | vote missing |
|8375, 8377| all | vote is handwritten record |
|8479, 8480,8481,8482| all | vote has not been photographed due to technical errors. (8482 contains a nice note on why it didn't work)|
|8485, 8486, 8487, 8488| 33 | missing vote |
|8549| 40 | missing vote |


### 1961-1964

https://sv.wikipedia.org/wiki/Lista_%C3%B6ver_ledam%C3%B6ter_av_Sveriges_riksdags_andra_kammare_1961%E2%80%931964

https://sv.wikipedia.org/wiki/Andrakammarvalet_i_Sverige_1960

#### Parties
_Socialdemokraterna (s)_ got 114 seats
_Folkpartiet (f)_ got 40 seats 
_Högerpartiet (h)_ got 39 seats 
_Centerpartiet (c)_ got 34 seats
_Sveriges kommunistiska parti (k)_ got 5 seats

There was a total of 232 seats (one more than last period)

#### Voting records
There is no total count written on the records so it is hard to know if my count corresponds to the official count. 

#### Members
The first book of 1961 doesn't show party affiliation in the records so it is a bit hard to figure out whos who.
A few question marks remain.

Seat 52 is empty. Seat 31 and 32 is missing.

Seat 114 and 116 is occupied by two c-members from Malmöhus both called Hansson (Nils G/Stig).

Seat 146 and 147 is occupied by two s-members from Älvsborg Norra both called Andersson (Sven/Ruth).

Seat 120 and 121 is occupied by two s-members from Halland both called Bengtsson (Ingemund/Tore).

Seat 164 and 168 is occupied by two s-members from Värmland both called Andersson (Arvid / Karl-Gustaf)

Seat 52 is empty in much of the first book of '61. It is a s-seat for Östergötland that is later held by Fridolf Thapper. There are no votes on that seat in the firsst part of 1961 (until april 26) so it's possible it unoccupied. I have counted it as unoccupied. Edit: Fridolf Thapper is the speaker from 1960 (17 Jul '60 when Patrik Svensson dies) to 1968.

> TODO: Make sure the member on seat 52 does not occupy that seat until Thapper appears. i.e. must be a way to set seat as unoccupied. (this should be fixed by setting `member_id` to `null` but there should maybe be a way to set that via the UI?)

Seat 71 had Torsten Bengtsson (c) voted in for Jönköping but he was also elected to the first chamber so Arne Magnusson replaces him.

Seat 224 Ragnhild Sandström (f) was elected for Västerbotten but died before the first of 1961 Riksdag and was replaced by Sigvard Larsson.

>TODO: Check in the other records 

#### Errors

Since there is no way to figure out the official result of the vote when votes are missing there is not much to do. 

Here are some missing

|Page       | Seat      | Note                  |
|---        |---        |---                    |
|8551-8705  | 52        | Missing name and vote |
|8562       | 193       | Missing vote          |
|8706       | 1,2,3     | Sear Hagberg, Erlander and Ohlins votes are obscured by a paper note saying that "First time the Sepaker gets to vote". Unsure why since there is 15 more votes for no.                        |
|9022       | 121       | No marked vote. All other s vote refrain so I set Bengtsson as that too        |
|9834,9835       | 226       | Missing vote. Counted total is printed on paper so it is possible to deduce the vote          |
|10565       | 55       | Missing vote. Counted total is printed on paper so it is possible to deduce the vote          |
|10821       | 20,32,52,62       | Missing vote. Counted total is printed on paper so it is possible to deduce the vote          |
|10827       | 20,32,52       | Missing vote. Counted total is printed on paper so it is possible to deduce the vote          |
|10930,10932,10933,10935,10937,10941,10942,10943,10945       | 56       | Missing vote. Counted total is printed on paper so it is possible to deduce the vote          |
|11054       | 102,122,142,222       | Missing vote. Counted total is printed on paper so it is possible to deduce the vote          |


### 1965-1968

https://sv.wikipedia.org/wiki/Lista_%C3%B6ver_ledam%C3%B6ter_av_Sveriges_riksdags_andra_kammare_1965%E2%80%931968

https://sv.wikipedia.org/wiki/Andrakammarvalet_i_Sverige_1964


#### Parties

_Socialdemokraterna (s)_ got 113 seats
_Folkpartiet (f)_ got 42 seats 
_Högerpartiet (h)_ got 32 seats 
_Centerpartiet (c)_ got 33 seats
_Sveriges kommunistiska parti (k)_ got 8 seats

_Medborgerlig Samling (MbS)_ was a coalition between Folkpartiet (f), Högerpartiet (h) and Centerpartiet (c) in Fyrstadskretsens constituency holder 3 seats.

_Mellanpartierna (mlp)_ was a coalition between Centerpartiet (c) and Folkpartiet (f) in Kalmar and Gotlans constituencies holding 2 seats.

There was a total of 233 seats (one more than last period)

#### Members

>TODO: Fill out members and also thier party. Fill out replacements


#### Errors

>TODO: This can be somewhat automated by checking the OCRed result with the final result.

_Stat.utskottets utlåtande nr.148, Second Chamber, Nov 17 1965, Book 6a-4 (id: 11754)_. The sum of votes for _yes_ is supposed to be `149` but is `148`. This is probably due to Tore Nilsson (h, seat 225) does not have a vote on the sheet but seems to be included voting _yes_ in the total. I have also counted is vote as _yes_ even if there is no record since the other Höger-party members also voted _yes_.

Same thing happens in _Bev.utskottets bet.nr 39 Mom.A, Second Chamber, Nov 17 1965, Book 6a-4 (id: 11756)_ again and I again counted the vote as a _yes_ vote.

_Bev.utskottets bet.nr 39 Mom.B, Second Chaimber, Nov 17 1965, Book 6a-4 (id: 11754)_ there are missing two votes. One vote should be _yes_ and one should be _no_ according to the recorded sum. I have recorded it as Tore Nilsson (h, seat 225) votes _yes_ as all other Höger members and Gunnel Olsson (s, seat 25) votes _no_ as all other Socialdemokrats.

_II lagutskottets utl.nr 63 Kontravot, Nov 17 1965, Book 6a-4 (id: 11761)_ two _yes_ votes has not been recorded. Axel Jansson (k, seat 22) and Tore Nilsson (h, seat 225) is not recorded. I record both as _yes_.

_II lagutskottets utl.nr 63 Huvudvot, Nov 17 1965, Book 6a-4 (id: 11762)_ Tore Nilsson (h, seat 225) was recorded by me as _yes_.

_(id: 11763)_, (seat, 22), _yes_

_(id: 11764)_, (seat, 22), _yes_

_(id: 11765)_, (seat, 22), _yes_, (seat, 225), _yes_

_(id: 11766)_, (seat, 25), _no_, (seat, 225), _yes_

_(id: 11767)_, (seat, 25), _no_, (seat, 225), _yes_

_(id: 11768)_, (seat, 22), _yes_

_(id: 11769)_, (seat, 25), _no_, (seat, 225), _yes_
