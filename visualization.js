

function JD_stuff()
{
	
// Load data first

d3.csv('data/RoundTripData.csv', function(d) {
  return {
    time: d.AdjustedDateTime,
    buslane: +d.BusLaneRoundTripMinutes,
	lowtraffic: +d.LowTrafficRoundTripMinutes,
	current: +d.CurrentRoundTripMinutes
  };
}).then(lineChart);


function lineChart(data){
    
// Set bounds	
var width  = 800;
var height = 300;
var margin = {
  top: 50,
  bottom: 50,
  left: 50,
  right: 50
};

var color = d3.scaleOrdinal().range([d3.rgb(183,220,255),d3.rgb(104,150,255),d3.rgb(28,15,212)]);

var svg = d3.select('#vis-svg');

// Start group	
var lineChartGroup = svg
	.append('g')
    .attr('transform','translate(' + margin.left +',' + margin.top + ')');


// X Scale
var lineXScale = d3.scalePoint()
    .domain(data.map(function(d){
		return d.time;
		}))
    .range([0,width-margin.left-margin.right]);

// Y Scale
var lineYScale = d3.scaleLinear()
    .domain([0, d3.max(data, function(d) { return Math.max(d.buslane, d.current, d.lowtraffic); })+10])
    .range([height - margin.bottom - margin.top, 0]);

// X Axis
var lineXAxis = d3.axisBottom(lineXScale);
lineChartGroup.append('g')
  .attr('class', 'x axis')
  .attr('transform', 'translate(0,'+ (height - margin.bottom - margin.top) + ')')
  .call(lineXAxis);
 
// X Axis Label
lineChartGroup.append("text")             
      .attr("transform","translate(" + (width/2-margin.left) + " ," + (height-margin.top-margin.bottom/5) + ")")
      .style("text-anchor", "middle")
      .text("Hour of Day");
  
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
      .attr("x",0 - (height / 2)+margin.bottom)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Total Time Across All Stops (min)");  
 
 
// Title
lineChartGroup.append("text")
        .attr("x", (width / 2-margin.left))             
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")  
        .style("font-size", "16px") 
        .style("text-decoration", "underline")  
        .text("Total Time Between All Route 1 Bus Stops");
 
 
 
// Make Lines
var busLaneLine = d3.line()
  .x(function(d){return lineXScale(d.time);})    
  .y(function(d){return lineYScale(d.buslane);})
  
var currentTimeLine = d3.line()
  .x(function(d){return lineXScale(d.time);})    
  .y(function(d){return lineYScale(d.current);})
  
var lowTrafficLine = d3.line()
  .x(function(d){return lineXScale(d.time);})    
  .y(function(d){return lineYScale(d.lowtraffic);})
  
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
var presentTime =  presentDay.toLocaleString('en-US', { hour: 'numeric', hour12: true })


lineChartGroup.append('g').append('rect')
.attr("x", -lineXScale.step()/2)
.attr("y",0)
.attr("width", width-margin.left-margin.right+lineXScale.step())
.attr("height",height-margin.top-margin.bottom)
.attr("fill", "grey")
.attr("opacity", 0);


// Set up Brush
var lineBrush = d3.brushX()
    .extent([[-lineXScale.step() / 2,0], [width-margin.left-margin.right+lineXScale.step() / 2, height-margin.bottom-margin.top/2]])
    .on('end', lineBrushEnded);
	

lineChartGroup.append('g')
	.attr("class","brush")
	.call(lineBrush)
	.call(lineBrush.move,[
        lineXScale(presentTime)-lineXScale.step()/2,
        lineXScale(presentTime)+lineXScale.step()/2
      ]);

//AP_stuff(presentTime)



lineChartGroup.on("mousedown",function(){
	var coords = d3.mouse(this);
	xcoord = coords[0];
	lineChartGroup.select('.brush').call(lineBrush.move, [xcoord-lineXScale.step()/2, xcoord+lineXScale.step()/2]).call(lineBrushEnded);})


function invertPoint(selection) {
    var xPos = selection;
	if (selection == width-margin.right-margin.left){
		return "1 AM"
	}
    var domain = lineXScale.domain(); 
    var range = lineXScale.range();
    var rangePoints = d3.range(range[0], range[1], lineXScale.step())
    var yPos = domain[d3.bisectRight(rangePoints, xPos) -1];
    return yPos;
}

  function lineBrushEnded() {
    const selection = d3.event.selection;
    if (!d3.event.sourceEvent || !selection) return;
    const range = lineXScale.domain().map(lineXScale), dx = lineXScale.step()/2;
    const x0 = range[d3.bisectRight(range, selection[0])] - dx;
    const x1 = range[d3.bisectRight(range, selection[1]) - 1] + dx;
    d3.select(this).transition().call(d3.event.target.move, x1 > x0 ? [x0, x1] : null);
	//var formatTime = d3.timeFormat("%I%p")
	//console.log(formatTime(invertPoint((x1+x0)/2)))
	//AP_stuff(invertPoint((x1+x0)/2))
	//update "between stops" plot
  }
  
    d3.selectAll('.brush>.handle').remove();
    d3.selectAll('.brush>.overlay').remove();
	d3.selectAll('.overlay').style('pointer-events', 'none');



// Set up Legend

  var legend = svg.selectAll('.legend')
      .data(["Current", "Low Traffic", "Bus Lane"])
      .enter()
	  .append('g')
      .attr('class', 'legend')
	  .attr("transform", function(d, i) {
      return "translate(" + (width/2+margin.left/5-Math.abs((100)*(i-1)*(i-2))-Math.abs((i)*(122)*(i-2))-Math.abs((i)*(i-1)*(10))) + ",0)";
    });
    
  legend.append('rect')
      .attr('x', function(d, i){ return (i *  10)+margin.left;})
      .attr('y', margin.top-15)
      .attr('width', 10)
      .attr('height', 10)
      .style('fill', color);
      
      
  legend.append('text')
      .attr('x', function(d, i){ return (i *  10)+margin.left+15;})
      .attr('y', margin.top-5)
      .text(function(d){ return d; });

 }
}

JD_stuff()

function AP_stuff(){
var svg = d3.select("svg"),
        margin = {top: 350, right: 20, bottom: 30, left: 40},
        width = 1000 - margin.left - margin.right,
        height = 600 - margin.top - margin.bottom,
        g = svg.append("g").attr("transform", "translate(" + (margin.left) + "," + margin.top + ")");

    // The scale spacing the groups:
    var x0 = d3.scaleBand()
        .rangeRound([(margin.left-22), width])
        .paddingInner(0.1);

	var x2 = d3.scaleBand()
        .rangeRound([0, width])
        .paddingInner(0.1);

    // The scale for spacing each group's bar:
    var x1 = d3.scaleBand()
        .padding(0.05);

    var y = d3.scaleLinear()
        .rangeRound([height, 0]);

    var z = d3.scaleOrdinal()
        .range(["#b7dcff", "#6896eb", "#1c0fd4"]);

	 var formatTime = d3.timeFormat("%I %p")
	 var parseAll = d3.timeParse("%I:00 %p")
	// var parseSingle = d3.timeParse("%I %p")
	
	// console.log(formatTime(parseSingle("5 AM")))
	// console.log(formatTime(parseSingle(time)))

		var data = d3.csv('data/DelayBetweenStops.csv', function(d) {
		return {
		Stop1: d.stop1_name,
		Stop2: d.stop2_name,
		time: formatTime(parseAll(d.AdjustedHour)),
		buslane: +d.MinMedianTime,
		lowtraffic: +d.CompromiseRunTime,
		current: +d.MedianRunTime
		};
		}).then(function(data){


		//data = data.filter(function(d){return d.time == formatTime(parseSingle(time))});
		data = data.filter(function(d){return d.time == "05 AM"});


        var keys = ["current","lowtraffic","buslane"];

        x0.domain(data.map(function(d) { return d.Stop1; }));
        x1.domain(keys).rangeRound([0, x0.bandwidth()]);
        y.domain([0, d3.max(data, function(d) { return d3.max(keys, function(key) { return d[key]; }); })]).nice();

        g.append("g")
            .selectAll("g")
            .data(data)
            .enter().append("g")
            .attr("class","bar")
            .attr("transform", function(d) { return "translate(" + x0(d.Stop1) + ",0)"; })
            .selectAll("rect")
            .data(function(d) { return keys.map(function(key) { return {key: key, value: d[key]}; }); })
            .enter().append("rect")
            .attr("x", function(d) { return x1(d.key); })
            .attr("y", function(d) { return y(d.value); })
            .attr("width", x1.bandwidth())
            .attr("height", function(d) { return height - y(d.value); })
            .attr("fill", function(d) { return z(d.key); });

        g.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(-19," + (height) + ")")
            .call(d3.axisBottom(x0).tickSizeOuter(0))
			.selectAll("text")
			.attr("y", 0)
			.attr("x", -10)
			.attr("dy", ".35em")
			.attr("transform", "rotate(-90)")
			.style("text-anchor", "end");



        g.append("g")
            .attr("class", "y axis")
            .call(d3.axisLeft(y).ticks(null, "s"))
            .append("text")
            .attr("x", 2)
            .attr("y", y(y.ticks().pop()) + 0.5)
            .attr("dy", "0.32em")
            .attr("fill", "#000")
            .attr("font-weight", "bold")
            .attr("text-anchor", "start")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x",0 - (height / 2)+margin.bottom)
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Delay Between Stops (In Seconds)");

		// Title
		g.append("text")
        .attr("x", (width / 2-margin.left))             
        .attr("y", 0 - (margin.top / 10))
        .attr("text-anchor", "middle")  
        .style("font-size", "16px") 
        .style("text-decoration", "underline")  
        .text("Time Between All Route 1 Bus Stops at 5:00 AM");


        var legend = g.append("g")
            .attr("font-family", "sans-serif")
            .attr("font-size", 10)
            .attr("text-anchor", "end")
            .selectAll("g")
            .data(keys.slice().reverse())
            .enter().append("g")
            .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

        legend.append("rect")
            .attr("x", width - 17)
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", z)
            .attr("stroke", z)
            .attr("stroke-width",2)
            .on("click",function(d) { update(d) });

        legend.append("text")
            .attr("x", width - 24)
            .attr("y", 9.5)
            .attr("dy", "0.32em")
            .text(function(d) { return d; });
			
			
})};
				  

AP_stuff()

function stop_selector() {
	
var margin = {
  top: 800,
  bottom: 50,
  left: 40,
  right: 5
};
	
var width = 1000
var height = 70

x = d3.scalePoint()
    .domain(d3.range(0,24,1))
    .range([margin.left, width-margin.left-margin.right])
	.padding(0.5);

var svg = d3.select('#vis-svg');

var brush = d3.brushX()
	.extent([[margin.left,margin.top],[width-margin.left-margin.right, height+margin.top]])
    .on("start brush end", brushed)
    .on("end.snap", brushended);

var line = svg.append("g")
    .append("line")
    .style("stroke", "black")
    .attr("x1", margin.left+x.step()/2)
    .attr("y1", margin.top+height/2)
    .attr("x2", width-margin.left-margin.right-x.step()/2)
    .attr("y2", margin.top+height/2)
    .attr("stroke-width", 4);
  
var circles = svg.append("g")
	.selectAll("circle")
    .data(x.domain())
	.enter()
    .append("circle")
    .attr("cx", d => x(d))
    .attr("cy", margin.top+height/2)
    .attr("r", x.step()/5)
	.attr("fill","white")
    .attr("stroke", "black")
	.attr('brushed', 'false')
	.on('mouseover', function () {
		d3.select(this).attr("fill","orange");})
    .on('mouseout', function (d) {
		var brushed = d3.select(this).attr("brushed");
		if(brushed == "true"){d3.select(this).attr("fill","orange");}
		else{d3.select(this).attr("fill","white");}});

  
  
svg.append("g")
    .attr("font-family", "var(--sans-serif)")
    .attr("text-anchor", "middle")
    .attr("transform", `translate(${x.bandwidth() / 2},${height / 2})`)
    .selectAll("text")
    .data(x.domain());
    //.join("text")
    //.attr("x", d => x(d))
    //.attr("dy", "0.35em")
    //.text(d => d);;

svg.append("g")
   .call(brush)
   .lower();

function brushed() {
    var selection = d3.event.selection;
    if (selection) {
      var range = x.domain().map(x);
      var i0 = d3.bisectRight(range, selection[0]);
      var i1 = d3.bisectRight(range, selection[1]);
      circles.attr("fill", (d, i) => i0 <= i && i < i1 ? "orange" : "white");
	  circles.attr("brushed", (d, i) => i0 <= i && i < i1 ? "true" : "false");
      svg.property("value", x.domain().slice(i0, i1)).dispatch("input");
    } else {
      circles.attr("fill", "white");
	  circles.attr("brushed", "false");
      svg.property("value", []).dispatch("input");
    }
	console.log(x.domain().slice(i0,i1));
  }

function brushended() {
    var selection = d3.event.selection;
    if (!d3.event.sourceEvent || !selection) return;
    var range = x.domain().map(x), dx = x.step() / 2;
    var x0 = range[d3.bisectRight(range, selection[0])] - dx;
    var x1 = range[d3.bisectRight(range, selection[1]) - 1] + dx;
    d3.select(this).transition().call(brush.move, x1 > x0 ? [x0, x1] : null);
  }
  
}

stop_selector()

function TT_stuff(){

// Points on the map will be put on a D3 SVG very soon

var width = 600;
var height = 400;

var svg = d3.select("#mapid").append("svg").attr("width", width).attr("height", height);

var mymap = L.map('mapid', {
    center: [42.3601, -71.0589],
    zoom: 13
});

L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
}).addTo(mymap);

L.circle([42.329544, -71.083982], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 10
}).addTo(mymap);

L.circle([42.330957, -71.082754], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 10
}).addTo(mymap);


L.circle([42.332324, -71.081252], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 10
}).addTo(mymap);

L.circle([42.332016, -71.079576], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 10
}).addTo(mymap);

L.circle([42.331591, -71.076237], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 10
}).addTo(mymap);

L.circle([42.333825, -71.073541], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 10
}).addTo(mymap);

L.circle([42.334948,-71.074931], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 10
}).addTo(mymap);

L.circle([42.336621,-71.076956], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 10
}).addTo(mymap);

L.circle([42.339459,-71.080362], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 10
}).addTo(mymap);

L.circle([42.340606,-71.081617], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 10
}).addTo(mymap);

L.circle([42.34157,-71.083092], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 10
}).addTo(mymap);

L.circle([42.342303,-71.084121], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 10
}).addTo(mymap);

L.circle([42.345331,-71.086739], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 10
}).addTo(mymap);

L.circle([42.348005,-71.088033], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 10
}).addTo(mymap);

L.circle([42.350773,-71.089334], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 10
}).addTo(mymap);

L.circle([42.359183,-71.093543], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 10
}).addTo(mymap);

L.circle([42.360758,-71.095722], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 10
}).addTo(mymap);

L.circle([42.362988,-71.099486], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 10
}).addTo(mymap);

L.circle([42.365291,-71.103404], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 10
}).addTo(mymap);

L.circle([42.366837,-71.106017], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 10
}).addTo(mymap);


L.circle([42.36839,-71.108618], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 10
}).addTo(mymap);

L.circle([42.369265,-71.110773], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 10
}).addTo(mymap);

L.circle([42.37027,-71.112998], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 10
}).addTo(mymap);

L.circle([42.372099,-71.115371], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 10
}).addTo(mymap);

L.circle([42.373259,-71.118124], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 10
}).addTo(mymap);

L.circle([42.375131,71.118511], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 10
}).addTo(mymap);

 L.circle([,], {
     color: 'red',
     fillColor: '#f03',
    fillOpacity: 0.5,
     radius: 10
 }).addTo(mymap);
}

TT_stuff()

		






