//core
var http = require('http');
var fs = require('fs');
//npm
var static = require('node-static');
var director = require('director');
var jsdom = require('jsdom');

// hold parsed bids data in this object
var raspberrys = [];

// static file server
var file = new(static.Server)('./public');

//
// define a routing table.
var router = new director.http.Router({
	'/bids': { 
		get: function (route) {
			console.log('client requesting info');
			this.res.writeHead(200, { 'Content-Type': 'application/json' });
			this.res.end(JSON.stringify(raspberrys));
		}
	 },
	'/': {
		get: function(route) { 
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
	Object.keys(raspberrys).forEach(function(id) {
		console.log(raspberrys[id].label + ' has ' + raspberrys[id].bids.length + ' bids.');
	});
	console.log('fetching fresh auction data..');

	raspberrys = [];

	var auctionIds = [180786734741, 180786751081, 180786864217, 180786865158, 180786865908, 180786866596, 180786867221, 180786868894, 180786868461, 180786867900];
	auctionIds.forEach(function (id) {
		jsdom.env("http://offer.ebay.co.uk/ws/eBayISAPI.dll?ViewBids&showauto=true&item=" + id, [
		  //'http://code.jquery.com/jquery-1.5.min.js'
		],
		function(errors, window) {
			if(errors) {
				console.warn(errors);
				return;
			}
			var boardInfo = {
				highest: 0,
				name: 'Board #xx',
				auctionId: id,
				ebayLink: 'http://www.ebay.co.uk/itm/ws/eBayISAPI.dll?ViewItem&item=' + id,
				bids: []
			};

			// extract boardName
			var boardName = window.document.getElementsByClassName('itemTitle');
			boardName = boardName[0].innerHTML;
			var m =  boardName.match(/ - #([0-9]+) /);
			boardInfo.name = "Board #" + m[1];

			// extract relevant rows
			var rows = window.document.getElementsByClassName('tabHeadDesign');
			rows = rows[0].parentNode.children;
			rows = Array.prototype.slice.call(rows, 1, rows.length-3);
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
					var bidDate = new Date(Date.parse(bidDay + ' ' + bidTime));

					bid[0] = (bidDate.valueOf()-1325369337000)/4545780;
					boardInfo.bids.push(bid);
				}
			}
			raspberrys.push(boardInfo);
		});
	});
}

setInterval(fetchAuctionData, 1000 * 60 * 3);
fetchAuctionData();

var port = 8080;
server.listen(port, function() {
	console.log('http listening on port ' + port);
});