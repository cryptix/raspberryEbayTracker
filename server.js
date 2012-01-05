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
//
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
	},
	'/code.tar': {
		get: function(route) { 
			file.serveFile('code.tar', 200, {}, this.req, this.res);
		 }
		
	}
});

//
// setup a server and when there is a request, dispatch the
// route that was requestd in the request object.
//
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
		console.log(pies[id].label + ' has ' + pies[id]['data'].length + 'bids.');
	});
	console.log('fetching new auction data..');
	
	
	var auctionIds = [180786734741, 180786751081, 180786864217, 180786865158, 180786865908, 180786866596, 180786867221, 180786868894, 180786868461, 180786867900];

	pies = [];
	auctionIds.forEach(function (id) {
		jsdom.env("http://offer.ebay.co.uk/ws/eBayISAPI.dll?ViewBids&_trksid=p4340.l2565&rt=nc&item=" + id, [
		  //'http://code.jquery.com/jquery-1.5.min.js'
		],
		function(errors, window) {
			if(errors) {
				console.warn(errors);
				return;
			}
			var els = window.document.getElementsByClassName('contentValueFont');
			var bids = [];
			var bid = [];
			var j = 0;
			for (var i = els.length - 1; i >= 0; i--) {
				if (typeof els[i] !== 'undefined') {
					// ammount
					if (els[i].children.length === 1 && els[i].children[0].tagName === 'SPAN') {
						bid[0] = j++;
						//bid[1] = parseInt(els[i].children[0].innerHTML.substr(1).replace(',',''));
					}
					// time
					if (els[i].children.length === 1 && els[i].children[0].tagName === 'DIV') {
						// ugliest date parsing i wrote yet.
						// even worse because the ploting lib cant take that big x values
						// day: 31-Dec-11
						// timestr: 22:17:48 GMT
						var bidTime = els[i].children[0].children[1].innerHTML;
						var bidDay = els[i].children[0].children[0].innerHTML;
						//var bidDate = new Date()
						/*
						var bidTime = els[i].children[0].children[1].innerHTML.split(' ')[0].split(':');
						var bidDay = els[i].children[0].children[0].innerHTML.split('-');
						
						var bidDate = new Date(
							2000 + parseInt(bidDay[2]),
							bidDay[1] === "Jan" ? 0 : 11,
							bidDay[0],
							parseInt(bidTime[0])+1,
							bidTime[1],
							bidTime[2]
						);
						
						console.log('time: %j', bidTime);
						console.log('day: %j', bidDay);
						console.log('date: ' + bidDate.toGMTString());
						*/
						
						//bid[1] = Date.parse(bidDay + ' ' + bidTime)	;
						bid[1] = j++;
					}
					if(Object.keys(bid).length === 2) {
						bids.push(bid);
						bid = [];
					}
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

server.listen(8080, function() {
	console.log('http listening');
});