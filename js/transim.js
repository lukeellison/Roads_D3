////////////////////////////////////////
// Transim
// Author: Luke Ellison
// Date: 1/6/2015
////////////////////////////////////////
var width = 1000,
	height = 600,
	//Set params to define simulation
	showNodes = false,
	showAllRoads = false; 
	showJuncts = showAllRoads && false; //Only if showAllRoads
	time_const = 100;

var scrn = d3.select(".screen")
				.attr("viewBox","0 0 " + width + " " + height);
var road_group = scrn.append("g").attr("class", "road_group");

var x = d3.scale.linear() //Function for scaling x data to chart size
    .range([0, width]);
var y = d3.scale.linear() //Function for scaling x data to chart size
    .range([height, 0]);

var lineGen = d3.svg.line().interpolate("linear") //function for drawing the line based off built in function
  .x(function(d) {
    return x(+d["@attributes"].lon);
  })
  .y(function(d) {
    return y(+d["@attributes"].lat);
  });


var active_roads = [];
var active_nodes = [];
var valid_roads = ["motorway","trunk","primary","secondary","tertiary","unclassified","residential","service","motorway_link","trunk_link","primary_link","secondary_link","tertiary_link"]
//var valid_roads = ["motorway","trunk","primary","secondary","tertiary","motorway_link","trunk_link","primary_link","secondary_link","tertiary_link"]

d3.xml("map_data/map.osm", "application/xml", function(error, data) {
	if (error) { return console.warn(error); }

	//Extract raw data
	var xml = d3.select(data);
	var json = xmlToJson(data).osm;
	
	//Set bounding lat and long
	var bounds = xml.select("bounds")
	var maxlat = bounds.attr("maxlat");
	var maxlon = bounds.attr("maxlon");
	var minlat = bounds.attr("minlat");
	var minlon = bounds.attr("minlon");

	//Set domains of scale functions
    x.domain([minlon, maxlon]); 
    y.domain([minlat, maxlat]);

    //Find and sort nodes
	var nodes = json.node;
  	nodes.sort(function(a, b){ // Sort by id
    	return parseInt(a["@attributes"].id)-parseInt(b["@attributes"].id);
  	});

  	//Show nodes as small circles if params allow
  	if(showNodes) 
		scrn.append("g").selectAll("circle").data(nodes)
			.enter().append("circle")
				.attr("cx", function(d,i){ 
					var node = nodes[i];
					var lon = +node["@attributes"].lon;
					return x(lon); 
				})
				.attr("cy", function(d,i){ 
					var node = nodes[i];
					var lat = +node["@attributes"].lat;
					return y(lat);
				})
				.attr("r", 1)
				.attr("fill", "red");

	//Calculate which ways are roads
	var ways = json.way;
	var roads =  []
	ways.forEach(function(way){
		if(way.tag != undefined){
			if(way.tag.constructor === Array)
				way.tag.forEach(function(tag){
					if((tag["@attributes"].k === "highway") && (valid_roads.indexOf(tag["@attributes"].v) > -1)) roads.push(way);
				});
			else
				if((way["@attributes"].k === "highway") && (valid_roads.indexOf(way["@attributes"].v) > -1)) roads.push(way);
		}
	})

	//Calculate neighbouring nodes
	var bisect = d3.bisector(function(d){ return +d.ref }).left;
	var neighbouring_nodes = [];
	roads.forEach(function(road){
		var prevRef = null;
		road.nd.forEach(function(node){
			var ref = node["@attributes"].ref;
			addNeighbour(ref, prevRef);
			addNeighbour(prevRef, ref);
			prevRef = ref;
		});
	})

	function addNeighbour(ref, prevRef){
		var index = bSearchIndex(neighbouring_nodes,ref);
		if(index > -1){
			if(prevRef != null){
				if(neighbouring_nodes[index].neighbours.indexOf(prevRef) == -1)
					neighbouring_nodes[index].neighbours.push(prevRef);
			} 
		}
		else{
			index = bisect(neighbouring_nodes, ref);
			obj ={
				"ref" : ref,
				"neighbours": []
			};
			if(prevRef != null) obj.neighbours.push(prevRef);
			var removed = neighbouring_nodes.splice(index, 0, obj);
		}
	}

	//draw out nodes from entered node
	if(!showAllRoads){
		var user_road = prompt("Enter node id to render first", "21662725");
		render(user_road);
	}

	//Create junctions array and draw all roads if chosen
	var refs = [];
	var junctions = [];
	if(showAllRoads)
		scrn.selectAll("path").data(roads)
			.enter().append("path")
				.attr("class", "line")
				.attr("d", function(d,i){
					var way = [];
					d.nd.forEach(function(node){
						var ref = node["@attributes"].ref;
						if(bSearchExists(refs,ref)){
							var index = bisect(junctions, ref);
							var removed = junctions.splice(index, 0, ref);
						}
						var index = bisect(refs, ref);
						var removed = refs.splice(index, 0, ref);
						way.push(bSearchNodes(nodes, ref));
					})
					return lineGen(way);
				});

  	if(showJuncts) //Show junctions if chosen
		scrn.append("g").selectAll("circle").data(junctions)
			.enter().append("circle")
				.attr("cx", function(d,i){ 
					var node = bSearchNodes(nodes,d);
					var lon = +node["@attributes"].lon;
					return x(lon); 
				})
				.attr("cy", function(d,i){ 
					var node = bSearchNodes(nodes,d);
					var lat = +node["@attributes"].lat;
					return y(lat);
				})
				.attr("r", 3)
				.attr("fill", "green");

	//render function draws on all roads neighbouring that node recurively
	function render(node){
		if(node === null){
			console.warn("no node defined");
			return;
		}
		var bisect = d3.bisector(function(d){ return +d }).left;
		var index = bSearchIndex(neighbouring_nodes,node);
		if(bSearchExists(active_nodes, node)) return;
		else{
			var i = bisect(active_nodes,+node)
			var removed = active_nodes.splice(i, 0, node);
		}
		if(index < 0){
			alert("node does not exist");
			return;
		}
		road_group = road_group.append("g");
		
		var neighbours = neighbouring_nodes[index].neighbours;
		neighbours.forEach(function(n,i){
			if(bSearchExists(active_nodes,n)) neighbours.splice(i,1);
		});
		
		var path = road_group.selectAll("path").data(neighbours)
			.enter().append("path")
			.attr("class","line")
			.attr("d", function(d,i){
				var way = [];
				way.push(bSearchNodes(nodes, d));
				way.push(bSearchNodes(nodes, neighbouring_nodes[index].ref));
				return lineGen(way);
			})
			.attr("stroke", "white");

		path.attr("stroke", "blue")
			.attr("stroke-dasharray", function(d,i){
				var totalLength = path[0][i].getTotalLength();
				return totalLength + " " + totalLength;
			})
			.attr("stroke-dashoffset", function(d,i){return -path[0][i].getTotalLength()})
				.transition()
				.duration(function(d,i){return path[0][i].getTotalLength()*time_const})
				.ease("linear")
				.attr("stroke-dashoffset", 0)
					.each("end", function(d){ render(d); });
	}

	function oldrender(){
		var path = road_group.selectAll("path").data(active_roads)
			.enter().append("path")
			.attr("class","line")
			.attr("d", function(d,i){
				var way = [];
				d.nd.forEach(function(node){
					var ref = node["@attributes"].ref;
					way.push(bSearchNodes(nodes, ref));
				})
				return lineGen(way);
			})
			.attr("stroke", "white");

		var totalLength = path.node().getTotalLength();
		path.attr("stroke", "blue")
			.attr("stroke-dasharray", totalLength + " " + totalLength)
			.attr("stroke-dashoffset", totalLength)
				.transition()
				.duration(3000)
				.ease("linear")
				.attr("stroke-dashoffset", 0);
	}
});


function bSearchIndex(arr, ref){
	if(arr.length == 0) return -1;
	var index = parseInt(arr.length/2);
	if (arr[index] === undefined) console.warn("error at index " + index + " with ref " + ref);
	var value = arr[index].ref;
	var found = -1;
	if(value == ref){
		return index;
	} 
	else if(+value > +ref){
		found = bSearchIndex(arr.slice(0,index), ref);
	} 
	else if(+value < +ref){
		var i = bSearchIndex(arr.slice(index+1), ref);
		if(i > -1) found = i + index + 1;
		else found = -1;
	}
	else{
		return -1;
	}
	return found;
}	

function bSearchExists(arr, ref){
	if(arr.length == 0) return false;
	var index = parseInt(arr.length/2);
	if (arr[index] === undefined) console.warn("error at index " + index + " with ref " + ref);
	var value = arr[index];
	var found = false;
	if(value == ref){
		return true;
	} 
	else if(+value > +ref){
		found = bSearchExists(arr.slice(0,index), ref);
	} 
	else if(+value < +ref){
		found = bSearchExists(arr.slice(index+1), ref);
	}
	else{
		return false;
	}
	return found;
}	


function bSearchNodes(nodes, ref){
	if(nodes.length == 0) return null;
	var index = parseInt(nodes.length/2);
	if (nodes[index] === undefined) console.warn("error at index " + index + " with ref " + ref);
	var id = nodes[index]["@attributes"].id;
	var node = null;
	if(id == ref){
		return nodes[index];
	} 
	else if(+id > +ref){
		node = bSearchNodes(nodes.slice(0,index), ref);
	} 
	else if(+id < +ref){
		node = bSearchNodes(nodes.slice(index+1), ref);
	}
	else{
		console.warn("reference " + ref + "not found in array");
		return null;
	}
	return node;
}

// Changes XML to JSON
function xmlToJson(xml) {
	
	// Create the return object
	var obj = {};

	if (xml.nodeType == 1) { // element
		// do attributes
		if (xml.attributes.length > 0) {
		obj["@attributes"] = {};
			for (var j = 0; j < xml.attributes.length; j++) {
				var attribute = xml.attributes.item(j);
				obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
			}
		}
	} else if (xml.nodeType == 3) { // text
		obj = xml.nodeValue;
	}

	// do children
	if (xml.hasChildNodes()) {
		for(var i = 0; i < xml.childNodes.length; i++) {
			var item = xml.childNodes.item(i);
			var nodeName = item.nodeName;
			if (typeof(obj[nodeName]) == "undefined") {
				obj[nodeName] = xmlToJson(item);
			} else {
				if (typeof(obj[nodeName].push) == "undefined") {
					var old = obj[nodeName];
					obj[nodeName] = [];
					obj[nodeName].push(old);
				}
				obj[nodeName].push(xmlToJson(item));
			}
		}
	}
	return obj;
};