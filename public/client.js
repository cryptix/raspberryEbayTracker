$(function() {
	// plot options
	var plotOpts = {
		lines:  { show: true, steps: true },
		points: { show: true },
		legend: { noColumns: 5 },
		yaxis:  { tickSize: 200 },
		xaxis:  { mode: "time", tickLength: 5 },
		grid:   { markings: weekendAreas },
		selection: { mode: "x" }
	};
	var overviewOpts = {
		legend: {show: false },
		series: {
			lines: { show: true, lineWidth: 1 },
			shadowSize: 0
		},
		xaxis: { ticks: [], mode: "time" },
		yaxis: { ticks: [], min: 0, autoscaleMargin: 0.1 },
		selection: { mode: "x" }
	};


	// draw markings so plot doesnt freak out
	function weekendAreas(axes) {
		var markings = [];
		var d = new Date(axes.xaxis.min);
		// go to the first Saturday
		d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 1) % 7))
		d.setUTCSeconds(0);
		d.setUTCMinutes(0);
		d.setUTCHours(0);
		var i = d.getTime();
		do {
			// when we don't set yaxis, the rectangle automatically
			// extends to infinity upwards and downwards
			markings.push({ xaxis: { from: i, to: i + 1 * 24 * 60 * 60 * 1000 } });
			i += 7 * 24 * 60 * 60 * 1000;
		} while (i < axes.xaxis.max);

		return markings;
	}

	// pull bid data and update plots
	var plotData = [];
	function pullBids() {
		$.ajax({
			url: '/bids',
			method: 'GET',
			dataType: 'json',
			success: function updateBids(newdata) {
				if(newdata.length == 0) {return;} // no data no plot
				plotData = newdata;

				bigPlot = $.plot($('#bigPlot'), newdata, plotOpts);
				overview = $.plot($("#overview"), newdata, overviewOpts);

				newdata.forEach(function(d) {
					$.plot($('#' + d.id).find('.smallPlot'), [d], plotOpts);
				});
			 }
		});
	}

	// info template
	var html = $('#singleBoard').html();
	var map = { // template settings
		"auctionId" : ['class', 'id'],
		"name": 'class',
		"highest": ['data-bind-highest'],
		"deadline": ['data-bind-deadline'],
		"ebayLink": ['class', 'href']
	};

	// get initial info and build site
	$.ajax({
		url: '/info',
		method: 'GET',
		dataType: 'json',
		success: function(data) {
			data.forEach(function (d) {
				var output = Plates.bind(html, d, map);
				if(d['completed'] == true) {
					$('#completed').append(output);
				} else {
					$('#running').append(output);
				}
			});

			pullBids();
			setInterval(pullBids,1000*30);
		}
	});

	$('#update').click(pullBids);

	/* TODO: data selection
	$.each(datasets, function(key, val) {
		choiceContainer.append('<br/><input type="checkbox" name="' + key +
			'" checked="checked" id="id' + key + '">' +
			'<label for="id' + key + '">'
            + val.label + '</label>');
	});
	*/

	// plot all data into a combined plot and a small overview
	var bigPlot = $.plot($('#bigPlot'), plotData, plotOpts);
	var overview = $.plot($("#overview"), plotData, overviewOpts);

	// bind selection events for zooming
	$("#bigPlot").bind("plotselected", function (event, ranges) {
		// do the zooming
		bigPlot = $.plot($("#bigPlot"), plotData,
			$.extend(true, {}, plotOpts, {
				xaxis: { min: ranges.xaxis.from, max: ranges.xaxis.to }
			})
		);
		// don't fire event on the overview to prevent eternal loop
		overview.setSelection(ranges, true);
	});

	$("#overview").bind("plotselected", function (event, ranges) {
		bigPlot.setSelection(ranges);
	});
});