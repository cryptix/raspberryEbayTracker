//core
var http = require('http');
var fs = require('fs');
//npm
var static = require('node-static');
var director = require('director');
var jsdom = require('jsdom');

// hold parsed bids data in this object
var auctionIds = {
	180786751081: {info: {}, bids: []},
	180786864217: {info: {}, bids: []},
	180786865158: {info: {}, bids: []},
	180786866596: {info: {}, bids: []},
	180786867221: {info: {}, bids: []},
	180786865908: {info: {}, bids: []},
	180786868894: {info: {}, bids: []},
	180786868461: {info: {}, bids: []},
	180786867900: {info: {}, bids: []},
	180786734741: {info: {}, bids: []}
};

// static file server
var file = new(static.Server)('./public');

//
// define a routing table.
var router = new director.http.Router({
	'/info': {
		// number of boards etc
		get: function () {
			console.log('client requesting bids');
			this.res.writeHead(200, { 'Content-Type': 'application/json' });
			var info = Object.keys(auctionIds).map(function(pi) { return auctionIds[pi].info; });
			this.res.end(JSON.stringify(info));
		}
	},
	'/bids': { 
		get: function () {
			console.log('client requesting info');
			this.res.writeHead(200, { 'Content-Type': 'application/json' });
			var bids = Object.keys(auctionIds).map(
				function(pi) {
					 return {
						 id: pi,
						 label: auctionIds[pi].info.name,
						 data: auctionIds[pi].bids
					};
				}
			);
			this.res.end(JSON.stringify(bids));
		}
	 },
	'/': {
		get: function() {
			file.serveFile('index.html', 200, {}, this.req, this.res);
		 }
	}
});

//
// setup a server and when there is a request, dispatch the
// route that was requestd in the request object.
var server = http.createServer(function (req, res) {
	router.dispatch(req, res, function (err) {
		if (err) {
			file.serve(req, res, function (e) {
				if (e && (e.status === 404)) { // If the file wasn't found
					//file.serveFile('/not-found.html', request, response);
					res.writeHead(200, { "Content-type": "text/plain" } );
					res.end('404 - sorry');
				}
			});
		}
	});
});

//
// inital get bid data
function fetchAuctionData() {
	console.log('fetching fresh auction data..');

	Object.keys(auctionIds).forEach(function (id) {
		//&showauto=true
		jsdom.env("http://offer.ebay.co.uk/ws/eBayISAPI.dll?ViewBids&item=" + id, [
		  //'http://code.jquery.com/jquery-1.5.min.js'
		],
		function(errors, window) {
			if(errors) {
				console.warn(errors);
				return;
			}

			var boardInfo = null;
			if ( Object.keys(auctionIds[id]['info']).length === 0 ) {
				auctionIds[id]['info'] = {
					highest: 0,
					completed: false,
					name: "Board #xx",
					auctionId: id,
					ebayLink: 'http://www.ebay.co.uk/itm/ws/eBayISAPI.dll?ViewItem&item=' + id,
				};
			}
			boardInfo = auctionIds[id]['info'];

			// extract boardName
			var itemTitle = window.document.getElementsByClassName('itemTitle');
			boardInfo['deadline'] = window.document.getElementsByClassName('titleValueFont')[2].innerHTML;
			if(itemTitle.length === 0) {
				// completed board.
				boardInfo['completed'] = true;
				itemTitle = window.document.getElementsByClassName('BHitemDesc');
			}
			itemTitle = itemTitle[0].innerHTML;
			var m =  itemTitle.match(/ - #([0-9]+) /);
			boardInfo['name'] = "Board #" + m[1];

			// extract relevant rows
			var rows = window.document.getElementsByClassName('tabHeadDesign');
			rows = rows[0].parentNode.children;
			rows = Array.prototype.slice.call(rows, 1, rows.length-3);
			console.log(boardInfo['name'] + ' has ' + rows.length + ' bids.');
			if(auctionIds[id].bids.length < rows.length) {
				// TODO: only get relevent rows
				auctionIds[id].bids = [];
				// iterate over them
				for (var i = rows.length - 1; i >= 0; i--) {
					if (typeof rows[i] !== 'undefined') {
						var bid = [];

						// ammount
						bid[1] = parseInt(rows[i].children[2].children[0].innerHTML.substr(1).replace(',',''));
						if(bid[1] > boardInfo.highest) {
							boardInfo.highest = bid[1];
						}

						// time
						// day: 31-Dec-11
						// timestr: 22:17:48 GMT
						var bidTime = rows[i].children[3].children[0].children[1].innerHTML;
						var bidDay  = rows[i].children[3].children[0].children[0].innerHTML;
						var bidDate = new Date(Date.parse(bidDay + ' ' + bidTime.slice(0,bidTime.length-4)));
						bid[0] = bidDate.valueOf();

						auctionIds[id].bids.push(bid);
					}
				}
			}
		});
	});
}

setInterval(fetchAuctionData, 1000 * 60 * 3);
fetchAuctionData();

var port = 8080;
server.listen(port, function() {
	console.log('http listening on port ' + port);
});