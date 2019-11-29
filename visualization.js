

function barchart() {

  //Set time formats
  let formatTime = d3.timeFormat("%-I %p")
  let parseAll = d3.timeParse("%I:00 %p")
  let parseSingle = d3.timeParse("%I %p")

  // Load data first
  Promise.all([
    d3.csv('data/RoundTripData.csv', function (d) {
      return {
        time: formatTime(parseAll(d.AdjustedDateTime)),
        buslane: +d.BusLaneRoundTripMinutes,
        lowtraffic: +d.LowTrafficRoundTripMinutes,
        current: +d.CurrentRoundTripMinutes
      };
    }),
    d3.csv('data/DelayBetweenStops.csv', function (d) {
      return {
        Stop1: d.stop1_name,
        Stop2: d.stop2_name,
        time: formatTime(parseAll(d.AdjustedHour)),
        buslane: +d.MinMedianTime,
        lowtraffic: +d.CompromiseRunTime,
        current: +d.MedianRunTime,
        sort: Number(d.Sort),
        direction: d.Direction
      };
    })]).then(function (files) {

      data = files[0];
      data2 = files[1].filter(function (d) { return d.direction == "Northbound"; });

      // Set bounds	
      let width = 1000;
      let height = 225;
      let margin = {
        top: 50,
        bottom: 50,
        left: 40,
        right: 50
      };

	  //Set colors
      let color = d3.scaleOrdinal().range([d3.rgb(183, 220, 255), d3.rgb(104, 150, 255), d3.rgb(28, 15, 212)]);

      let svg = d3.select('#main-svg');

      // Start group	
      let lineChartGroup = svg
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      // X Scale
      let lineXScale = d3.scalePoint()
        .domain(data.map(function (d) {
          return d.time;
        }))
        .range([0, width - margin.left - margin.right]);

      // Y Scale
      let lineYScale = d3.scaleLinear()
        .domain([0, d3.max(data, function (d) { return Math.max(d.buslane, d.current, d.lowtraffic); }) + 10])
        .range([height - margin.bottom - margin.top, 0]);

      // X Axis
      let lineXAxis = d3.axisBottom(lineXScale);
      lineChartGroup.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + (height - margin.bottom - margin.top) + ')')
        .call(lineXAxis);

      // X Axis Label
      lineChartGroup.append("text")
        .attr("transform", "translate(" + (width / 2 - margin.left) + " ," + (height - margin.bottom - margin.top / 3) + ")")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Hour of Day")
        .attr("pointer-events", "none");

      // Y Axis
      let lineYAxis = d3.axisLeft(lineYScale);
      lineChartGroup.append('g')
        .attr('class', 'y axis')
        .attr('transform', 'translate(0, 0)')
        .call(lineYAxis);


      // Y Axis Label
      lineChartGroup.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (height / 2) + margin.bottom)
        .attr("dy", "1em")
        .style("font-size", "12px")
        .style("text-anchor", "middle")
        .text("Total Travel Time (min)")
        .attr("pointer-events", "none");


      // Title
      lineChartGroup.append("text")
        .attr("x", (width / 2) - margin.left)
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Total Travel Times Between All Route 1 Bus Stops (Dudley -> Harvard)")
        .attr("pointer-events", "none");

      // Make Lines
      let busLaneLine = d3.line()
        .x(function (d) { return lineXScale(d.time); })
        .y(function (d) { return lineYScale(d.buslane); })

      let currentTimeLine = d3.line()
        .x(function (d) { return lineXScale(d.time); })
        .y(function (d) { return lineYScale(d.current); })

      let lowTrafficLine = d3.line()
        .x(function (d) { return lineXScale(d.time); })
        .y(function (d) { return lineYScale(d.lowtraffic); })

      // Add Lines
      lineChartGroup.append('path')
        .attr('d', busLaneLine(data))
        .attr('class', 'busLaneCSS');
      lineChartGroup.append('path')
        .attr('d', currentTimeLine(data))
        .attr('class', 'currentTimeCSS');
      lineChartGroup.append('path')
        .attr('d', lowTrafficLine(data))
        .attr('class', 'lowTrafficCSS');


      // Get Default Hour
      let presentDay = new Date();
      let presentTime = presentDay.toLocaleString('en-US', { hour: 'numeric', hour12: true })
      if (Number(presentTime.split(" ")[0]) > 1 && Number(presentTime.split(" ")[0]) < 5 && presentTime.split(" ")[1] == "AM") {
        presentTime = "5 AM"
      }

	
	  //Make whole line chart area clickable
      lineChartGroup.append('g').append('rect')
        .attr("x", -lineXScale.step() / 2)
        .attr("y", 0)
        .attr("width", width - margin.left - margin.right + lineXScale.step())
        .attr("height", height - margin.top - margin.bottom)
        .attr("fill", "grey")
        .attr("opacity", 0);


      // Set up Brush
      let lineBrush = d3.brushX()
        .extent([[-lineXScale.step() / 2, 0], [width - margin.left - margin.right + lineXScale.step() / 2, height - margin.bottom - margin.top / 2]])
        .on('end', lineBrushEnded);

      lineChartGroup.append('g')
        .attr("class", "brush")
        .style("opacity", ".5")
        .attr("brushnum", 1)
        .call(lineBrush)
        .call(lineBrush.move, [
          lineXScale(presentTime) - lineXScale.step() / 2,
          lineXScale(presentTime) + lineXScale.step() / 2
        ]);


	  //Set up initial time and initial bar graph
      let filtered_data2 = data2.filter(function (d) { return d.Stop2 != ""; });
      let max = d3.max(filtered_data2, function (d) { return Math.max(d.buslane, d.lowtraffic, d.current); });


      linechart(max, data2.filter(function (d) { return d.time == formatTime(parseSingle(presentTime)); }), formatTime(parseSingle(presentTime)), 0, 0);

	
	  //Click to move brush
      lineChartGroup.on("mousedown", function () {
        let coords = d3.mouse(this);
        xcoord = coords[0];
        lineChartGroup.select('.brush').call(lineBrush.move, [xcoord - lineXScale.step() / 2, xcoord + lineXScale.step() / 2]).call(lineBrushEnded);
      })

	  //Helper function for brush snapping
      function invertPoint(selection) {
        let xPos = selection;
        if (selection == width - margin.right - margin.left) {
          return "1 AM"
        }
        let domain = lineXScale.domain();
        let range = lineXScale.range();
        let rangePoints = d3.range(range[0], range[1], lineXScale.step())
        let yPos = domain[d3.bisectRight(rangePoints, xPos) - 1];
        return yPos;
      }

	  //Brush ends and redraws bar chart
      function lineBrushEnded() {
        const selection = d3.event.selection;
        if (!d3.event.sourceEvent || !selection) return;
        const range = lineXScale.domain().map(lineXScale), dx = lineXScale.step() / 2;
        const x0 = range[d3.bisectRight(range, selection[0])] - dx;
        const x1 = range[d3.bisectRight(range, selection[1]) - 1] + dx;
        d3.select(this).transition().call(d3.event.target.move, x1 > x0 ? [x0, x1] : null);
        d3.select("#BSH-svg").html(null);
        time = formatTime(parseSingle(invertPoint((x1 + x0) / 2)))

        linechart(max, data2.filter(function (d) { return d.time == time; }), time)
      }
	  
	  //Lock brush size
      svg.selectAll('.brush>.handle').remove();
      svg.selectAll('.brush>.overlay').remove();
      lineChartGroup.selectAll('.overlay').style('pointer-events', 'click');



      // Set up Legend

      let legend = lineChartGroup.selectAll('.legend')
        .data(["Normal Traffic", "Low Traffic", "Added Bus-Only Lane"])
        .enter()
        .append('g')
        .attr('class', 'legend')
        .attr("transform", function (d, i) {
          return "translate(" + (width / 2 - margin.left - 10 - Math.abs((125) * (i - 1) * (i - 2)) - Math.abs((i) * (122) * (i - 2)) - Math.abs((i) * (i - 1) * (10))) + ",0)";
        }).attr("pointer-events", "none");

      legend.append('rect')
        .attr('x', function (d, i) { return (i * 10) + margin.left; })
        .attr('y', -15)
        .attr('width', 10)
        .attr('height', 10)
        .style('fill', color).attr("pointer-events", "none");


      legend.append('text')
        .attr('x', function (d, i) { return (i * 10) + margin.left + 15; })
        .attr('y', -5)
        .text(function (d) { return d; }).attr("pointer-events", "none");


    })
};

function linechart(max, data, time) {


  //Set Bounds
  let svg = d3.select("#BSH-svg"),
    margin = { top: 50, right: 20, bottom: 100, left: 40 },
    width = 1000 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom,
    margin2 = {
      top: 0,
      bottom: 50,
      left: 40,
      right: 0
    },
    width2 = 1000,
    height2 = 100,

  //Set svg and have ability to reset highlight
  g = svg.append("g").attr("transform", "translate(" + (margin.left) + "," + margin.top + ")").on('mousedown', function () { circles.classed("selectedPoint", false).attr("fill", "white") });

  //Get tick labels ready
  tickData = data.map(function (d) { return d.Stop1 });


  //X Scale spacing the groups
  let x0 = d3.scaleBand()
    .rangeRound([(margin.left - 22), width])
    .paddingInner(0.1);


  //X Scale for spacing each group's bar
  let x1 = d3.scaleBand()
    .padding(0.05);

  //Y Scale
  let y = d3.scaleLinear()
    .rangeRound([height, 0]);

  //Color Scale
  let z = d3.scaleOrdinal()
    .range(["#b7dcff", "#6896eb", "#1c0fd4"]);

  //Grouping variables
  let keys = ["current", "lowtraffic", "buslane"];

  //Setting domains
  x0.domain(data.map(function (d) { return d.sort; }));
  x1.domain(keys).rangeRound([0, x0.bandwidth()]);
  y.domain([0, max]).nice();

  //X Axis
  g.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(-19," + (height) + ")")
    .call(d3.axisBottom(x0).tickSizeOuter(0).tickFormat(function (d, i) { return tickData[i]; }))
    .selectAll("text")
    .attr("y", 0)
    .attr("x", 15)
    .attr("dy", ".35em")
    .attr("transform", "rotate(45)")
    .style("text-anchor", "start")
    .attr("pointer-events", "none");

  //Y Axis
  g.append("g")
    .attr("class", "y axis")
    .call(d3.axisLeft(y).ticks(null, "s"))
    .append("text")
    .attr("x", 2)
    .attr("y", y(y.ticks().pop()) + 1)
    .attr("dy", "0.32em")
    .attr("fill", "#000")
    .style("font-size", "12px")
    .attr("text-anchor", "start")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left - 3)
    .attr("x", 0 - (height) / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Travel Time (sec)")
    .attr("pointer-events", "none");

  //Bars
  g.append("g")
    .selectAll("g")
    .data(data)
    .enter().append("g")
    .attr("class", "bar")
    .attr("transform", function (d) { return "translate(" + x0(d.sort) + ",0)"; })
    .selectAll("rect")
    .data(function (d) { return keys.map(function (key) { return { key: key, value: d[key] }; }); })
    .enter().append("rect")
    .attr("pointer-events", "none")
    .attr("x", function (d) { return x1(d.key); })
    .attr("y", function (d) { return y(0); })
    .attr("width", x1.bandwidth())
    .attr("height", function (d) { return height - y(0); })
    .attr("fill", function (d) { return z(d.key); });

  //Bar Animations
  g.selectAll("rect")
    .transition()
    .delay(function (d) { return Math.random() * 500; })
    .duration(500)
    .attr("y", function (d) { return y(d.value); })
    .attr("height", function (d) { return height - y(d.value); });


  // Title
  g.append("text")
    .attr("x", (width / 2) - margin.left / 4)
    .attr("y", 0 - (11 / 20) * margin.top)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Travel Times Between Route 1 Bus Stops at " + time + " (Dudley -> Harvard)");


  // Set up Legend

  let color = d3.scaleOrdinal().range([d3.rgb(183, 220, 255), d3.rgb(104, 150, 255), d3.rgb(28, 15, 212)]);


  let legend = svg.selectAll('.legend')
    .data(["Normal Traffic", "Low Traffic", "Added Bus-Only Lane"])
    .enter()
    .append('g')
    .attr('class', 'legend')
    .attr("transform", function (d, i) {
      return "translate(" + (width / 2 + margin.left / 2 - Math.abs((125) * (i - 1) * (i - 2)) - Math.abs((i) * (122) * (i - 2)) - Math.abs((i) * (i - 1) * (10))) + "," + (-margin.top / 6) + ")";
    });

  legend.append('rect')
    .attr('x', function (d, i) { return (i * 10) + margin.left; })
    .attr('y', margin.top - 10)
    .attr('width', 10)
    .attr('height', 10)
    .style('fill', color);

  legend.append('text')
    .attr('x', function (d, i) { return (i * 10) + margin.left + 15; })
    .attr('y', margin.top)
    .text(function (d) { return d; });

 //Create stop selector
 
 //Set up scale
  x = d3.scalePoint()
    .domain(d3.range(0, 25, 1))
    .range([margin2.left + x0.bandwidth() / 2, width2 - margin2.left + x0.bandwidth() / 2 + 6])
    .padding(0.5);

//Set up brush
  let brush = d3.brushX()
    .extent([[margin2.left, margin.top], [width2 - margin2.left+margin2.right, height + margin.top + 3]])
    .on("start brush end", brushed)
    .on("end", brushEnd);

//Set up line between stops
  let line = svg.append("g")
    .append("line")
    .style("stroke", "black")
    .attr("x1", margin2.left + x.step() / 2)
    .attr("y1", margin.top + height)
    .attr("x2", width2 - margin2.left - margin2.right - x.step() / 2)
    .attr("y2", margin.top + height)
    .attr("stroke-width", 4);


  function brushed() {
    let selection = d3.event.selection;
	
    if (d3.event.selection === null) return;
    const [a0, a1] = d3.event.selection;

    circles.classed("selectedPoint", d =>
      a0 <= x(d) - x.step() / 2 && x(d) - x.step() / 2 <= a1
    );

    //Update map
    brushedStops = d3.set(svg.selectAll(".selectedPoint").data());
    dispatcher.call("selectionUpdatedBar", this, svg.selectAll(".selectedPoint").data());
	
    //Update sum text
    makeSumText(svg.selectAll(".selectedPoint").data());
  }

  function brushEnd() {
    // We don't want infinite recursion
    if (d3.event.sourceEvent.type != "end") {
      d3.select(this).call(brush.move, null);
    }
  }

  g.append("text").attr("id", "sum_title")
  g.append("text").attr("id", "current_sum")
  g.append("text").attr("id", "lowtraffic_sum")
  g.append("text").attr("id", "buslane_sum")


//Make text showing time sums between stops

  function makeSumText(data_slice) {
    let selected_stops = data.filter(function (d) { return data_slice.includes(d.sort) && data_slice.includes(d.sort + 1) });
    let current_sum = Math.round(100 * d3.sum(selected_stops, function (d) { return d.current }) / 60) / 100;
    let lowtraffic_sum = Math.round(100 * d3.sum(selected_stops, function (d) { return d.lowtraffic }) / 60) / 100;
    let buslane_sum = Math.round(100 * d3.sum(selected_stops, function (d) { return d.buslane }) / 60) / 100;

    if (data_slice.length < 2) {
      current_sum = 0;
      lowtraffic_sum = 0;
      buslane_sum = 0;
    }
	
	
    if (data_slice.length == 25) {
      	title_text = "Sum of Times Between All Stops: ";
    }
    else {
		title_text = "Sum of Times Between Selected Stops: ";
	}
		
    d3.select("#sum_title")
	  .attr("x", width / 4)
	  .attr("y", margin.top)
	  .attr("text-anchor", "middle")
	  .style("font-size", "16px")
	  .text(title_text).attr("pointer-events", "none");
    

    d3.select("#current_sum")
      .attr("x", width / 4)
      .attr("y", margin.top + 16)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Normal Traffic: " + current_sum + " mins").attr("pointer-events", "none")
      .attr("font-weight", "bold")
      .attr("stroke", "black")
      .attr("stroke-width", ".2px")
      .attr("fill", "#b7dcff");

    d3.select("#lowtraffic_sum")
      .attr("x", width / 4)
      .attr("y", margin.top + 32)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Low Traffic: " + lowtraffic_sum + " mins").attr("pointer-events", "none")
      .attr("font-weight", "bold")
      .attr("fill", "#6896eb");

    d3.select("#buslane_sum")
      .attr("x", width / 4)
      .attr("y", margin.top + 48)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Added Bus-Only Lane: " + buslane_sum + " mins").attr("pointer-events", "none")
      .attr("font-weight", "bold")
      .attr("fill", "#1c0fd4");
  }

  //Make circles for each stop, and give them mouseover functionality. Updates the map as well.
  let circles = svg.append("g")
    .selectAll("circle")
    .data(x.domain())
    .enter()
    .append("circle")
    .attr("cx", d => x(d) - x.step() / 2)
    .attr("cy", margin.top + height)
    .attr("r", x.step() / 5)
    .attr("fill", "white")
    .attr("stroke", "black")
    .attr("sort", d => x.domain()[d])
    .on('mouseover', function () {
      d3.select(this).classed("mouseover", true);
      let x = d3.select(this).data();
      d3.select("[id='" + x + "']").classed("mouseover", true);
	  d3.select("[id=nameDisplay]").text(tickData[x]).attr("opacity", 100);
	  
	  coords = [0,0]
	  coords[0] = d3.select("[id='" + x + "']").attr("cx");
	  coords[1] = d3.select("[id='" + x + "']").attr("cy");
	  name = d3.select("[id='" + x + "']").attr("name");
	  
	  console.log(x)
	  if (x < 15){
	    nameBoxLoc = coords[0]-170
	  }
	  else{
		nameBoxLoc = coords[0]-40
	  }
		
	  d3.select("#nameBox").attr("opacity", 100).attr("x", nameBoxLoc).attr("y", coords[1]-30).raise();		
      d3.select("#nameDisplay").text(name).attr("opacity", 100).attr("x", nameBoxLoc+105 ).attr("y", coords[1]-15).raise();
	  
    })
    .on('mouseout', function (d) {
      d3.select(this).classed("mouseover", false);
      let x = d3.select(this).data();
      d3.select("[id='" + x + "']").classed("mouseover", false);
	  d3.select("#nameDisplay").attr("opacity", 0);
	  d3.select("#nameBox").attr("opacity", 0);
    });


  svg.append("g")
    .attr("font-family", "let(--sans-serif)")
    .attr("text-anchor", "middle")
    .attr("transform", "translate(" + (x.step() / 2) + ","+(height / 2)+")")
    .selectAll("text")
    .data(x.domain());


  svg.append("g")
    .attr("stroke", "none")
    .style("opacity", ".5")
    .call(brush).lower();

  
  //Update map
  circles.classed("selectedPoint", d =>
    brushedStops.values().map(Number).includes(d)
  );

  //Update sum text
  makeSumText(svg.selectAll(".selectedPoint").data());
 
  //Get map updates
  dispatcher.on("selectionUpdatedMap", function (selected_ids) {
    circles.classed("selectedPoint", d =>
      selected_ids.includes(d)
    )
    makeSumText(selected_ids)
  })
}

function routemap() {


  //Set bounds
  let width = 600;
  let height = 600;

  //Create map
  let mymap = L.map('mapid', {
    center: [42.3514, -71.0969],
	zoomSnap: .01,
    zoom: 13.6,
    zoomControl: false,
	scrollWheelZoom: false
  });

  //Set initial map
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(mymap);

  mymap.touchZoom.disable();
  mymap.doubleClickZoom.disable();
  mymap.scrollWheelZoom.disable();
  mymap.dragging.disable();

  let svg = d3.select(mymap.getPanes().overlayPane).append("svg").attr("width", width).attr("height", height);

  //Import data
  d3.json("data/outboundStops.json").then(function (d) {

	//Convert between screen locations and latitude/longitude
    function mapPointX(d) {
      d.LatLng = new L.LatLng(d.latitude, d.longitude)
      let x = mymap.latLngToLayerPoint(d.LatLng).x;
      return x;
    };

    function mapPointY(d) {
      d.LatLng = new L.LatLng(d.latitude, d.longitude)
      let y = mymap.latLngToLayerPoint(d.LatLng).y;
      return y;
    };

	//Create brush
    let mapBrush = d3.brush()
      .extent([[0, 0], [width, height]]).on("start brush", brushed)
      .on("end", brushEnd);

    svg.append("g").call(mapBrush);

	//Highlighting and updating points
    function brushed() {
	  if (d3.event.selection === null) return;
      let selected = d3.event.selection;
      graphPoints.classed("selectedPoint", function (d) {
        if (isBrushed(selected, mapPointX(d), mapPointY(d))) {
          if (!brushedStops.has(this.id)) {
            brushedStops.add(this.id);
            d3.select(this).attr("selectedPoint", "true");
          }
        }

        if (!isBrushed(selected, mapPointX(d), mapPointY(d))) {
          if (brushedStops.has(this.id)) {
            brushedStops.remove(this.id);
            d3.select(this).attr("selectedPoint", "false");

          }
        }
        return isBrushed(selected, mapPointX(d), mapPointY(d))
      }
      )
	  //Update bar chart
      dispatcher.call("selectionUpdatedMap", this, brushedStops.values().map(Number));
    }

    function isBrushed(area, x, y) {
      return area[0][0] <= x && area[1][0] >= x && area[0][1] <= y && area[1][1] >= y;
    }

    function brushEnd() {
      // We don't want infinite recursion
      if (d3.event.sourceEvent.type != "end") {
        d3.select(this).call(mapBrush.move, null);
      }
    }

	//Create line between stops
    let line = d3.line()
      .x(function (d) { return mapPointX(d); })
      .y(function (d) { return mapPointY(d); })
      .curve(d3.curveCardinal.tension(.5));

    svg.append("path")
      .data([d])
      .attr("d", line)
      .attr("class", "line");

	//Create details on demand box
    let nameBox = svg.append('rect')
	  .attr("id", "nameBox")
      //.attr('x', 80)
     // .attr('y', 525)
      .attr('width', 210)
      .attr('height', 20)
      .attr('stroke', 'black')
      .attr('fill', '#b7dcff')
	  .attr("opacity", 0)
	  .attr("pointer-events", "none");

    let nameDisplay = svg.append('text')
	  .attr("id","nameDisplay")
     // .attr('x', 185)
     // .attr('y', 540)
      .style("text-anchor", "middle")
      .style("font-size", 12)
	  .attr("pointer-events", "none");

    //Make circles for each stop, and give them mouseover functionality. Updates the bar chart as well.
    let graphPoints = svg.selectAll("circle")
      .data(d)
      .enter()
      .append("circle")
      .attr("id", d => d.id)
      .attr("name", d => d.name)
      .attr("r", 5)
      .attr("cx", mapPointX)
      .attr("cy", mapPointY)
      .attr("fill", "white")
      .attr("stroke", "black")
      .on('mouseover', function () {
        d3.select(this).classed("mouseover", true)
        let ID = d3.select(this).data().map(d => d.id);
		
		coords = [0,0];
		coords[0] = d3.select(this).attr("cx");
		coords[1] = d3.select(this).attr("cy");
		
		if (ID < 15){
			nameBoxLoc = coords[0]-170
		}
		else{
			nameBoxLoc = coords[0]-40
		}
		
		nameBox.attr("opacity", 100).attr("x", nameBoxLoc).attr("y", coords[1]-30).raise();		
        nameDisplay.text(d3.select(this).data().map(d => d.name)).attr("opacity", 100).attr("x", nameBoxLoc+105 ).attr("y", coords[1]-15).raise();
		
        d3.selectAll("[sort='" + ID + "']").classed("mouseover", true);
      })
      .on('mouseout', function (d) {
        d3.select(this).classed("mouseover", false)
        let ID = d3.select(this).data().map(d => d.id);
        d3.selectAll("[sort='" + ID + "']").classed("mouseover", false);
        nameDisplay.attr("opacity", 0);
		nameBox.attr("opacity", 0);

      })
      .on('mousedown', function () { graphPoints.classed("selectedPoint", false).attr("fill", "white") })
      .raise();

	//Update bar chart
    dispatcher.on("selectionUpdatedBar", function (selected_ids) {
      graphPoints.classed("selectedPoint", d =>
        selected_ids.includes(parseInt(d.id, 10))
      )
    })


  })
}

//Create line/bar charts
barchart();

//Create map
routemap()

//Global variables for brushing/linking
var brushedStops = d3.set();
var dispatcher = d3.dispatch("selectionUpdatedMap", "selectionUpdatedBar");
