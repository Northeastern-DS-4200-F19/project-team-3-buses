

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
      .text("Total Time Across All Stops");  
 
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

var presentDay = new Date();
var presentTime =  presentDay.toLocaleString('en-US', { hour: 'numeric', hour12: true })

  
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
	console.log(invertPoint((x1+x0)/2))
	//update between stops plot
  }
  
    d3.selectAll('.brush>.handle').remove();
    d3.selectAll('.brush>.overlay').remove();
	d3.selectAll('.overlay').style('pointer-events', 'none');

svg.on("click",function(){
	var coords = d3.mouse(this);
	console.log(coords)
	xcoord = coords[0]-margin.left;

lineChartGroup.select('.brush').call(lineBrush.move, [xcoord-lineXScale.step()/2, xcoord+lineXScale.step()/2]).call(lineBrushEnded);})


 }
}

JD_stuff()

function TT_stuff(){

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