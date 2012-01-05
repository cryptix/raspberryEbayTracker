//core
var http = require('http');
var fs = require('fs');
//npm
var static = require('node-static');
var director = require('director');
var jsdom = require('jsdom');

// hold parsed bids data in this object
var pies = [];	

// static file server
var file = new(static.Server)('./public');

//
// define a routing table.
var router = new director.http.Router({
	'/bids': { 
		get: function (route) {
			this.res.writeHead(200, { 'Content-Type': 'application/json' })
  			this.res.end(JSON.stringify(pies));
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
      res.writeHead(404);
      res.end('404 - sorry');
    }
  });
});

//
// inital get bid data
function fetchAuctionData() {
	Object.keys(pies).forEach(function(id) {
		console.log(pies[id].label + ' has ' + pies[id]['data'].length + ' bids.');
	});
	console.log('fetching new auction data..');

	pies = [];

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
			var rows = window.document.getElementsByClassName('tabHeadDesign');
			rows = rows[0].parentNode.children;
			rows = Array.prototype.slice.call(rows, 1, rows.length-3);
			var bids = [];
			for (var i = rows.length - 1; i >= 0; i--) {
				if (typeof rows[i] !== 'undefined') {
					var bid = [];
					// ammount
					bid[1] = parseInt(rows[i].children[2].children[0].innerHTML.substr(1).replace(',',''));

					// time
					// ugliest date parsing i wrote yet.
					// even worse because the ploting lib cant take that big x values
					// day: 31-Dec-11
					// timestr: 22:17:48 GMT
					var bidTime = rows[i].children[3].children[0].children[1].innerHTML;
					var bidDay  = rows[i].children[3].children[0].children[0].innerHTML;
					var bidDate = new Date(Date.parse(bidDay + ' ' + bidTime));

					/*
					console.log('date: ' + rows[i].children[3].children[0].children[1].innerHTML);
					console.log('time: %j', bidTime);
					console.log('day: %j', bidDay);
					console.log('date: ' + bidDate.toGMTString());
					*/
					bid[0] = (bidDate.valueOf()-1325369337000)/4545780;
					bids.push(bid);
				}
			}
			pies.push({ 
				label: id,
				data: bids
			});
		});
	});

}
setInterval(fetchAuctionData, 1000 * 60 * 3);
fetchAuctionData();

var port = 8080;
server.listen(port, function() {
	console.log('http listening on port ' + port);
});