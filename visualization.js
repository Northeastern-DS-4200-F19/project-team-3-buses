

function JD_stuff() {

  // Load data first
  var formatTime = d3.timeFormat("%-I %p")
  var parseAll = d3.timeParse("%I:00 %p")
  var parseSingle = d3.timeParse("%I %p")

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
      var width = 1000;
      var height = 225;
      var margin = {
        top: 50,
        bottom: 50,
        left: 40,
        right: 50
      };


      var color = d3.scaleOrdinal().range([d3.rgb(183, 220, 255), d3.rgb(104, 150, 255), d3.rgb(28, 15, 212)]);

      var svg = d3.select('#main-svg');

      // Start group	
      var lineChartGroup = svg
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      // X Scale
      var lineXScale = d3.scalePoint()
        .domain(data.map(function (d) {
          return d.time;
        }))
        .range([0, width - margin.left - margin.right]);

      // Y Scale
      var lineYScale = d3.scaleLinear()
        .domain([0, d3.max(data, function (d) { return Math.max(d.buslane, d.current, d.lowtraffic); }) + 10])
        .range([height - margin.bottom - margin.top, 0]);

      // X Axis
      var lineXAxis = d3.axisBottom(lineXScale);
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
      var lineYAxis = d3.axisLeft(lineYScale);
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
        .text("Total Travel Times Between All Outbound Route 1 Bus Stops")
        .attr("pointer-events", "none");



      // Make Lines
      var busLaneLine = d3.line()
        .x(function (d) { return lineXScale(d.time); })
        .y(function (d) { return lineYScale(d.buslane); })

      var currentTimeLine = d3.line()
        .x(function (d) { return lineXScale(d.time); })
        .y(function (d) { return lineYScale(d.current); })

      var lowTrafficLine = d3.line()
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
      var presentDay = new Date();
      var presentTime = presentDay.toLocaleString('en-US', { hour: 'numeric', hour12: true })
      if (Number(presentTime.split(" ")[0]) > 1 && Number(presentTime.split(" ")[0]) < 5 && presentTime.split(" ")[1] == "AM") {
        presentTime = "5 AM"
      }

      lineChartGroup.append('g').append('rect')
        .attr("x", -lineXScale.step() / 2)
        .attr("y", 0)
        .attr("width", width - margin.left - margin.right + lineXScale.step())
        .attr("height", height - margin.top - margin.bottom)
        .attr("fill", "grey")
        .attr("opacity", 0);


      // Set up Brush
      var lineBrush = d3.brushX()
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


      var filtered_data2 = data2.filter(function (d) { return d.Stop2 != ""; });
      var max = d3.max(filtered_data2, function (d) { return Math.max(d.buslane, d.lowtraffic, d.current); });


      AP_stuff(max, data2.filter(function (d) { return d.time == formatTime(parseSingle(presentTime)); }), formatTime(parseSingle(presentTime)), 0, 0);


      lineChartGroup.on("mousedown", function () {
        var coords = d3.mouse(this);
        xcoord = coords[0];
        lineChartGroup.select('.brush').call(lineBrush.move, [xcoord - lineXScale.step() / 2, xcoord + lineXScale.step() / 2]).call(lineBrushEnded);
      })


      function invertPoint(selection) {
        var xPos = selection;
        if (selection == width - margin.right - margin.left) {
          return "1 AM"
        }
        var domain = lineXScale.domain();
        var range = lineXScale.range();
        var rangePoints = d3.range(range[0], range[1], lineXScale.step())
        var yPos = domain[d3.bisectRight(rangePoints, xPos) - 1];
        return yPos;
      }

      function lineBrushEnded() {
        const selection = d3.event.selection;
        if (!d3.event.sourceEvent || !selection) return;
        const range = lineXScale.domain().map(lineXScale), dx = lineXScale.step() / 2;
        const x0 = range[d3.bisectRight(range, selection[0])] - dx;
        const x1 = range[d3.bisectRight(range, selection[1]) - 1] + dx;
        d3.select(this).transition().call(d3.event.target.move, x1 > x0 ? [x0, x1] : null);
        d3.select("#BSH-svg").html(null);
        time = formatTime(parseSingle(invertPoint((x1 + x0) / 2)))

        AP_stuff(max, data2.filter(function (d) { return d.time == time; }), time)
      }

      svg.selectAll('.brush>.handle').remove();
      svg.selectAll('.brush>.overlay').remove();
      lineChartGroup.selectAll('.overlay').style('pointer-events', 'click');



      // Set up Legend

      var legend = lineChartGroup.selectAll('.legend')
        .data(["Normal Traffic", "Low Traffic", "Added Bus-Only Lane"])
        .enter()
        .append('g')
        .attr('class', 'legend')
        .attr("transform", function (d, i) {
          return "translate(" + (width / 2 - margin.left - 10 - Math.abs((125) * (i - 1) * (i - 2)) - Math.abs((i) * (122) * (i - 2)) - Math.abs((i) * (i - 1) * (10))) + ",0)";
        });

      legend.append('rect')
        .attr('x', function (d, i) { return (i * 10) + margin.left; })
        .attr('y', -15)
        .attr('width', 10)
        .attr('height', 10)
        .style('fill', color);


      legend.append('text')
        .attr('x', function (d, i) { return (i * 10) + margin.left + 15; })
        .attr('y', -5)
        .text(function (d) { return d; });


    })
};

function AP_stuff(max, data, time) {



  var svg = d3.select("#BSH-svg"),
    margin = { top: 50, right: 20, bottom: 100, left: 40 },
    width = 1000 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom,
    margin2 = {
      top: 0,
      bottom: 50,
      left: 40,
      right: 0
    }
  width2 = 1000
  height2 = 100

  g = svg.append("g").attr("transform", "translate(" + (margin.left) + "," + margin.top + ")").on('mousedown', function () { circles.classed("selectedPoint", false).attr("fill", "white") });

  tickData = data.map(function (d) { return d.Stop1 });


  // The scale spacing the groups:
  var x0 = d3.scaleBand()
    .rangeRound([(margin.left - 22), width])
    .paddingInner(0.1);



  // The scale for spacing each group's bar:
  var x1 = d3.scaleBand()
    .padding(0.05);

  var y = d3.scaleLinear()
    .rangeRound([height, 0]);

  var z = d3.scaleOrdinal()
    .range(["#b7dcff", "#6896eb", "#1c0fd4"]);


  var keys = ["current", "lowtraffic", "buslane"];

  x0.domain(data.map(function (d) { return d.sort; }));
  x1.domain(keys).rangeRound([0, x0.bandwidth()]);
  y.domain([0, max]).nice();


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



  g.append("g")
    .attr("class", "y axis")
    .call(d3.axisLeft(y).ticks(null, "s"))
    .append("text")
    .attr("x", 2)
    .attr("y", y(y.ticks().pop()) + 1)
    .attr("dy", "0.32em")
    .attr("fill", "#000")
    //.attr("font-weight", "bold")
    .style("font-size", "12px")
    .attr("text-anchor", "start")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left - 3)
    .attr("x", 0 - (height) / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Travel Time (sec)")
    .attr("pointer-events", "none");

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

  g.selectAll("rect")
    .transition()
    .delay(function (d) { return Math.random() * 500; })
    //.delay(function (d) {return height - y(d.value);})
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
    .text("Travel Times Between Outbound Route 1 Bus Stops at " + time);


  // Set up Legend

  var color = d3.scaleOrdinal().range([d3.rgb(183, 220, 255), d3.rgb(104, 150, 255), d3.rgb(28, 15, 212)]);


  var legend = svg.selectAll('.legend')
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

  x = d3.scalePoint()
    .domain(d3.range(0, 25, 1))
    .range([margin2.left + x0.bandwidth() / 2, width2 - margin2.left + x0.bandwidth() / 2 + 6])
    .padding(0.5);

  var brush = d3.brushX()
    .extent([[margin2.left, margin.top], [width2 - margin2.left - margin2.right, height + margin.top + 3]])
    .on("start brush end", brushed)
    //.on("end.snap", brushended);
    .on("end", brushEnd);

  var line = svg.append("g")
    .append("line")
    .style("stroke", "black")
    .attr("x1", margin2.left + x.step() / 2)
    .attr("y1", margin.top + height)
    .attr("x2", width2 - margin2.left - margin2.right - x.step() / 2)
    .attr("y2", margin.top + height)
    .attr("stroke-width", 4);


  function brushed() {
    var selection = d3.event.selection;

    if (d3.event.selection === null) return;
    const [a0, a1] = d3.event.selection;
    console.log([a0, a1])

    // If within the bounds of the brush, select it
    circles.classed("selectedPoint", d =>
      a0 <= x(d) - x.step() / 2 && x(d) - x.step() / 2 <= a1
    );

    brushedStops = d3.set(svg.selectAll(".selectedPoint").data());

    dispatcher.call("selectionUpdatedBar", this, svg.selectAll(".selectedPoint").data());


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



  function makeSumText(data_slice) {
    var selected_stops = data.filter(function (d) { return data_slice.includes(d.sort) && data_slice.includes(d.sort + 1) });
    var current_sum = Math.round(100 * d3.sum(selected_stops, function (d) { return d.current }) / 60) / 100;
    var lowtraffic_sum = Math.round(100 * d3.sum(selected_stops, function (d) { return d.lowtraffic }) / 60) / 100;
    var buslane_sum = Math.round(100 * d3.sum(selected_stops, function (d) { return d.buslane }) / 60) / 100;

    if (data_slice.length < 2) {
      current_sum = 0;
      lowtraffic_sum = 0;
      buslane_sum = 0;
    }

    if (data_slice.length == 25) {
      d3.select("#sum_title")
        .attr("x", width / 4)
        .attr("y", margin.top)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text("Sum of Times Between All Outbound Stops: ").attr("pointer-events", "none");
    }
    else {
      d3.select("#sum_title")
        .attr("x", width / 4)
        .attr("y", margin.top)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text("Sum of Times Between Selected Outbound Stops: ").attr("pointer-events", "none");
    }

    d3.select("#current_sum")
      .attr("x", width / 4)
      .attr("y", margin.top + 16)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Current: " + current_sum + " mins").attr("pointer-events", "none")
      .attr("font-weight", "bold")
      .attr("stroke", "black")
      .attr("stroke-width", ".35px")
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
      .text("Bus Lane: " + buslane_sum + " mins").attr("pointer-events", "none")
      .attr("font-weight", "bold")
      .attr("fill", "#1c0fd4");
  }


  var circles = svg.append("g")
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
      var x = d3.select(this).data();
      d3.select("[id='" + x + "']").classed("mouseover", true);
    })
    .on('mouseout', function (d) {
      d3.select(this).classed("mouseover", false);
      var x = d3.select(this).data();
      d3.select("[id='" + x + "']").classed("mouseover", false);
    });

  console.log()

  svg.append("g")
    .attr("font-family", "var(--sans-serif)")
    .attr("text-anchor", "middle")
    .attr("transform", `translate(${x.step() / 2},${height / 2})`)
    .selectAll("text")
    .data(x.domain());


  svg.append("g")
    .attr("stroke", "none")
    .style("opacity", ".5")
    .call(brush).lower();


  console.log(brushedStops.values().map(Number))

  circles.classed("selectedPoint", d =>
    brushedStops.values().map(Number).includes(d)
  );

  makeSumText(svg.selectAll(".selectedPoint").data());

  dispatcher.on("selectionUpdatedMap", function (selected_ids) {
    circles.classed("selectedPoint", d =>
      selected_ids.includes(d)
    )
    makeSumText(selected_ids)
  })
}

function TT_stuff() {


  var width = 600;
  var height = 600;

  var mymap = L.map('mapid', {
    center: [42.3514, -71.0969],
    zoom: 13,
    zoomControl: false
  });

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

  var svg = d3.select(mymap.getPanes().overlayPane).append("svg").attr("width", width).attr("height", height);

  d3.json("data/outboundStops.json").then(function (d) {

    function mapPointX(d) {
      d.LatLng = new L.LatLng(d.latitude, d.longitude)
      var x = mymap.latLngToLayerPoint(d.LatLng).x;
      return x;
    };

    function mapPointY(d) {
      d.LatLng = new L.LatLng(d.latitude, d.longitude)
      var y = mymap.latLngToLayerPoint(d.LatLng).y;
      return y;
    };

    var mapBrush = d3.brush()
      .extent([[0, 0], [width, height]]).on("start brush", brushed)
      .on("end", brushEnd);

    svg.append("g").call(mapBrush);



    function brushed() {
      var selected = d3.event.selection;
      graphPoints.classed("selectedPoint", function (d) {
        if (isBrushed(selected, mapPointX(d), mapPointY(d))) {
          if (!brushedStops.has(this.id)) {
            brushedStops.add(this.id);
            d3.select(this).attr("selectedPoint", "true");
            //d3.select(this).attr("fill","orange");
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
      );
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

    var line = d3.line()
      .x(function (d) { return mapPointX(d); })
      .y(function (d) { return mapPointY(d); })
      .curve(d3.curveMonotoneX);

    svg.append("path")
      .data([d])
      .attr("d", line)
      .attr("class", "line");

    /*svg.append('rect')
      .attr('x', d3.event.pageX)
      .attr('y', d3.event.pageY)
      .attr('width', 175)
      .attr('height', 20)
      .attr('stroke', 'black')
      .attr('fill', '#b7dcff')*/

    svg.append('rect')
      .attr('x', 150)
      .attr('y', 525)
      .attr('width', 210)
      .attr('height', 20)
      .attr('stroke', 'black')
      .attr('fill', '#b7dcff')

    var nameDisplay = svg.append('text')
      .attr('x', 165)
      .attr('y', 540)
      .style("font-size", 12);

    var graphPoints = svg.selectAll("circle")
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
        var x = d3.select(this).data().map(d => d.id);
        console.log(x);
        nameDisplay.text(d3.select(this).data().map(d => d.name)).attr("opacity", 100);
        console.log(stopName)
        d3.selectAll("[sort='" + x + "']").classed("mouseover", true);
      })
      .on('mouseout', function (d) {
        d3.select(this).classed("mouseover", false)
        var x = d3.select(this).data().map(d => d.id);
        d3.selectAll("[sort='" + x + "']").classed("mouseover", false);
        nameDisplay.attr("opacity", 0);
      })
      .on('mousedown', function () { graphPoints.classed("selectedPoint", false).attr("fill", "white") })
      .raise();


    dispatcher.on("selectionUpdatedBar", function (selected_ids) {
      graphPoints.classed("selectedPoint", d =>
        selected_ids.includes(parseInt(d.id, 10))
      )
    })


  })
}


JD_stuff();

TT_stuff()
var brushedStops = d3.set();

var dispatcher = d3.dispatch("selectionUpdatedMap", "selectionUpdatedBar");
