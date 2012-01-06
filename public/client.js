$(function() {
	var plotOpts = {
		lines: { show: true },
		points: { show: true },
		legend: { noColumns: 5 },
		xaxis: { tickDecimals: 0, tickSize: 1 }
	};
	function updateData(data) {
		if(data.length == 0) {return;} // no data no plot
		// plot all data into a combined plot
		$.plot($('#combined > .bigBidPlot'), data.map(function(d) { return { data: d.bids, label: d.name };}), plotOpts);
		// fetch template
		var html = $('#singleBoard').html();
		var map = { // template settings
			"auctionId" : ['class', 'id'],
			"name": 'class',
			"highest": ['data-bind-highest'],
			"ebayLink": ['class', 'href']
		};
		$('#boards').empty(); // drop previous boards
		Object.keys(data).forEach(function(id) {
			var output = Plates.bind(html, data[id], map); // bind data to markup
			$('#boards').append(output);
			$.plot($('#' + data[id].auctionId + ' > .bidPlot'), [{data: data[id].bids, label: data[id].name}], plotOpts);
		});
	}
	function pullData() {
		$.ajax({
			url: '/bids',
			method: 'GET',
			dataType: 'json',
			success: updateData
		});
	}
	setInterval(pullData,1000*30);
	$('#update').click(pullData);
	pullData();
});
