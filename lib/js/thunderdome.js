var Thunderdome = {
    data: '',
    mapConfig: '',
    tableConfig: '',
	geocoder: ''
};
//defaults
Thunderdome.mapConfig = Backbone.Model.extend({
    defaults: {
        mapAPI: 'Google',
        mapTiles: 'http://tile.stamen.com/toner/{z}/{x}/{y}.png', //CloudMade map tiles to use
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a>' + 'contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>,' + 'Imagery &copy; <a href="http://cloudmade.com">CloudMade</a>', //Text for map attribution
        //Start lat, lon and zoom level for map init
        startLat: 39.6, //appx center of country
        startLon: -94.3,
        startZoom: 5, //country level zoom
        mapDiv: 'map', //id of div where map will go
        showMarkers: true,
        showPolygons: false,
        //fields from JSON data we want to show in popups and modal window (for detail)
        //should correspond to placeholders in handlebars templates
        popupItems: '',
        popupTemplate: 'popupText', //id of handlebars template script
        showModal: false,
		geocode: false,
        modalDiv: 'modal', //id of div used by jquery dialog ui
        modalWidth: 300, //width of modal window
        modalHeight: 'auto', //height of modal window
        modalTitle: 'title',
        modalItems: '',
        modalTemplate: 'modalText', //id of handlebars template script
        //field from JSON data to use for marker key
        //should be unique; used to retrieve markers for callbacks
        markerKey: 'id',
        markerColors: function () {
            return 'lib/images/markers/pointer-orange.png';
        },
        defaultMarker: '../lib/images/markers/pointer-orange.png',
        shadowMarker: '../lib/images/markers/pointer-shadow.png',
        showTable: false //set to true to build a table based on data
    }
});
Thunderdome.tableConfig = Backbone.Model.extend({
    //IDs of divs where pieces will go
    defaults: {
        mainDiv: 'gridContainer',
        showSearch: false,
        showCategory: false,
        searchDiv: 'searchField',
        tableDiv: 'tableDiv',
        //table header config
        //'label' is what shows in that column head
        //'type' is the data type (used for sorting, etc.)
        tableHeader: [{
            'label': 'Name',
            'type': 'string'
        }, {
            'label': 'Type',
            'type': 'string'
        }],
        //fields from JSON data we want to show in table
        tableCols: '',
        numberFormatCols: [],
        dollarFormatCols: [],
        //table column we want search field to filter
        //should be name of the label in tableHeader above
        fieldToSearch: 'Name',
        categoryToFilter: 'Type',

        searchLabel: 'Search', //label text added to search field
        categoryLabel: 'Filter', //label text added to category dropdown
        searchCSSClass: 'searchFieldText', //css applied to search field text
        categoryCSSClass: '', //css applied to category dropdown text
        headerCSSClass: '', //css applied to header
        rowCSSClass: '', //css applied to rows,
        showMap: false //show map and connect clicks on table to it

    }
});


Thunderdome.makeMap = function () {
    var markers = []; //to hold marker objects so we can fire events on them later
    var polygons = []; //to hold polygon objects so we can fire events on them later
    var map, centerLatLng, oms, infoWindow, legendDiv;
    var markerColors = Thunderdome.mapConfig.get('markerColors');
    if (Thunderdome.mapConfig.has('popupTemplate')) {
        var source = $('#' + Thunderdome.mapConfig.get('popupTemplate')).html();
        var template = Handlebars.compile(source);
    }
    if (Thunderdome.mapConfig.has('mapLegendTemplate')) {
        var legendSource = $('#' + Thunderdome.mapConfig.get('mapLegendTemplate')).html();
        var legendTemplate = Handlebars.compile(legendSource);
        var legendText = legendTemplate({});

        legendDiv = document.createElement('div');
        legendDiv.className = Thunderdome.mapConfig.get('mapLegendClass');
        legendDiv.innerHTML = legendText;
    }

    if (Thunderdome.mapConfig.get('mapAPI') === 'Leaflet') {
        //OpenStreetMap config
        var cloudmadeUrl = Thunderdome.mapConfig.get('mapTiles');
        var cloudmadeAttribution = Thunderdome.mapConfig.get('attribution');
        var cloudmade = new L.TileLayer(cloudmadeUrl, {
            maxZoom: 18,
            attribution: cloudmadeAttribution
        });
        //Init the map in the #map div below, centering and setting the zoom
        map = new L.Map('map');
		//create the clustering object
        oms = new OverlappingMarkerSpiderfier(map, {
            keepSpiderfied: true
        });
		//add a listener to the clustering object to open markers
		oms.addListener('click', function (marker) {
			infoWindow.setContent(marker.desc);
			infoWindow.setLatLng(marker.getLatLng());
			map.openPopup(infoWindow);

		});

        centerLatLng = new L.LatLng(parseFloat(Thunderdome.mapConfig.get('startLat')),
        parseFloat(Thunderdome.mapConfig.get('startLon')));
        map.setView(centerLatLng, Thunderdome.mapConfig.get('startZoom')).addLayer(cloudmade);
        if (Thunderdome.mapConfig.has('mapLegendTemplate')) {
            var Legend = L.Control.extend({
                options: {
                    position: 'bottomright'
                },

                onAdd: function (map) {
                    return legendDiv;
                }
            });

            map.addControl(new Legend());
        }
        infoWindow = new L.Popup({
            offset: new L.point(-4, -10)
        });

    }
    else { //assume it's google
        var mapOptions = {
            zoom: Thunderdome.mapConfig.get('startZoom'),
            center: new google.maps.LatLng(parseFloat(Thunderdome.mapConfig.get('startLat')),
            parseFloat(Thunderdome.mapConfig.get('startLon'))),
            mapTypeId: google.maps.MapTypeId.ROADMAP
        }
        if (Thunderdome.mapConfig.has('gmapStyles')) {
            mapOptions.styles = Thunderdome.mapConfig.get('gmapStyles');
        }
        var map = new google.maps.Map(document.getElementById(Thunderdome.mapConfig.get('mapDiv')), mapOptions);
		//create clustering object
        oms = new OverlappingMarkerSpiderfier(map, {
            markersWontMove: true,
            markersWontHide: true,
            keepSpiderfied: true
        });
		//add a listener to the clustering object to open markers
		oms.addListener('click', function (marker) {
			infoWindow.setContent(marker.popupText);
			infoWindow.open(map, marker);
		});
        infoWindow = new google.maps.InfoWindow({
            content: ''
        });
        if (Thunderdome.mapConfig.has('mapLegendTemplate')) {
            legendDiv.index = 1;
            map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(legendDiv);
        }
    }
    //If we're showing markers, add them
    if (Thunderdome.mapConfig.get('showMarkers')) {
		addMarkers(map);
    }
    //If we're showing polygons, add them 
    if (Thunderdome.mapConfig.get('showPolygons')) {
        addPolygons(map);
    }

    //Cycle over each of the data points and add them 
    function addMarkers(map) {
		if(Thunderdome.mapConfig.get('geocode')) {
			Thunderdome.geocoder = new google.maps.Geocoder();
		}
        Thunderdome.data.each(function (item) {
            colorMarker = markerColors(item.get(Thunderdome.mapConfig.get('markerColorKey')));
            //show the default marker for any items where the differentiating value
            //isn't mapped to a marker image.
            if (typeof colorMarker == 'undefined' || colorMarker == '') {
                colorMarker = Thunderdome.mapConfig.get('defaultMarker');
            }
            var context = {};
            var popupItems = Thunderdome.mapConfig.get('popupItems');
            _.each(popupItems, function (popupItem) {
                context[popupItem] = item.get(popupItem);
            });
            var text = template(context);
            //construct and add markers if Leaflet
            if (Thunderdome.mapConfig.get('mapAPI') == 'Leaflet') {
                var ColorIcon = L.Icon.extend({
                    options: {
                        shadowUrl: Thunderdome.mapConfig.get('shadowMarker'),
                        iconSize: [16, 24],
                        shadowSize: [31, 24],
                        iconAnchor: [12, 22]
                    }
                });
                var myIcon = new ColorIcon({
                    iconUrl: colorMarker
                });
                var marker = new L.Marker([item.get('lat'), item.get('lon')], {
                    icon: myIcon
                });
                map.addLayer(marker);
                oms.addMarker(marker);
                marker.desc = text;
                //hold the markers in this array so we can retrieve them for later use
                //e.g., for clicks on a data table row
                markers[item.get(Thunderdome.mapConfig.get('markerKey'))] = marker;
            }
            //construct and add markers if Google
            else {
                var myIcon = new google.maps.MarkerImage(
                colorMarker,
                new google.maps.Size(16, 24),
                new google.maps.Point(0, 0),
                new google.maps.Point(12, 22));

                var shadow = new google.maps.MarkerImage(
                Thunderdome.mapConfig.get('shadowMarker'),
                new google.maps.Size(31, 24),
                new google.maps.Point(0, 0),
                new google.maps.Point(12, 22));
                var shape = {
                    coord: [1, 1, 1, 16, 16, 24, 24, 1],
                    type: 'poly'
                };
				if (Thunderdome.mapConfig.get('geocode')) {
					var geocodeAddress = Thunderdome.mapConfig.get('geocodeFunction')(item);
					var myLatLon = gGeocode(geocodeAddress);
				}
				else {
					var myLatLon = new google.maps.LatLng(item.get('lat'), item.get('lon'));
				}
                try {
                    var marker = new google.maps.Marker({
                        position: myLatLon,
                        map: map,
                        shadow: shadow,
                        icon: myIcon,
                        shape: shape,
                        zIndex: 1
                    });
                    marker.popupText = text;
                    //hold the markers in this array so we can retrieve them for later use
                    //e.g., for clicks on a data table row
                    markers[item.get(Thunderdome.mapConfig.get('markerKey'))] = marker;
                    oms.addMarker(marker);
		    markers[item.get(Thunderdome.mapConfig.get('markerKey'))] = marker;
                }
                catch (e) {
                    e; // maybe we'll do something with this error later ...
                };

                //hold the markers in this array so we can retrieve them for later use
                //e.g., for clicks on a data table row

            }

        });
    }
	//geocode function
	function gGeocode(address) {
		Thunderdome.geocoder.geocode( { 'address': address}, function(results, status) {
			if (status == google.maps.GeocoderStatus.OK) {
				return results[0].geometry.location;
			}
			else {
				return false;
			}
		});
	}

	
    //cycle over polygons and add them
    function addPolygons(map) {
        Thunderdome.data.each(function (item) {
            var context = {};
            var polygon;
            var popupItems = Thunderdome.mapConfig.get('popupItems');
            _.each(popupItems, function (popupItem) {
                if (_.indexOf(Thunderdome.mapConfig.get('dollarFormatCols'), popupItem) > -1) {
                    context[popupItem] = '$' + item.get(popupItem).formatNumber(2, '.', ',');
                }
                else if (_.indexOf(Thunderdome.mapConfig.get('numberFormatCols'), popupItem) > -1) {
                    if (typeof item.get(popupItem) == 'string') {
                        context[popupItem] = parseInt(item.get(popupItem)).formatNumber(0, '.', ',');

                    }
                    else {
                        context[popupItem] = item.get(popupItem).formatNumber(0, '.', ',');
                    }
                }
                else {
                    context[popupItem] = item.get(popupItem);
                }
            });
            var text = template(context);
            var options = Thunderdome.mapConfig.get('polygonOptions');
            var fillColor = Thunderdome.mapConfig.get('polygonColors')(item.get(Thunderdome.mapConfig.get('markerColorKey')));
            options.fillColor = fillColor;
            if (typeof item.get('geometry').geometry != 'undefined') {
                polygon = makePolygon(item.get('geometry').geometry.coordinates[0], options);
            }
            if (typeof item.get('geometry').geometries != 'undefined') {
                polygon = makePolygon(item.get('geometry').geometries, options, 'multi');

            }
            if (typeof polygon != 'undefined' && typeof text != 'undefined') {
                polygon.popupText = text;
                polygon.setMap(map);
                polygons[item.get(Thunderdome.mapConfig.get('markerKey'))] = polygon;
                google.maps.event.addListener(polygon, 'click', function (event) {
                    infoWindow.setContent(polygon.popupText);
                    if (typeof event == 'undefined') {
                        infoWindow.open(map, polygon);
                    }
                    else {
                        infoWindow.setPosition(event.latLng);
                        infoWindow.open(map);
                    }
                });

            }

        });
    }

    function makePolygon(coords, options, multi) {
        if (typeof multi == 'undefined') {
            var polygonPaths = [];
            _.each(coords, function (coord) {
                polygonPaths.push(new google.maps.LatLng(coord[1], coord[0]));
            });
            var bounds = new google.maps.LatLngBounds();
            options.paths = polygonPaths;
            for (i = 0; i < polygonPaths.length; i++) {
                bounds.extend(polygonPaths[i]);
            }
            options.position = bounds.getCenter();
        }
        else {
            var multiplePolygonPaths = [];
            var boundsPaths = [];
            _.each(coords, function (thisCoords) {
                var polygonPaths = [];
                _.each(thisCoords.coordinates[0], function (coord) {
                    polygonPaths.push(new google.maps.LatLng(coord[1], coord[0]));
                });
                var bounds = new google.maps.LatLngBounds();
                for (i = 0; i < polygonPaths.length; i++) {
                    bounds.extend(polygonPaths[i]);
                }
                options.position = bounds.getCenter();
                multiplePolygonPaths.push(polygonPaths);
            });
            options.paths = multiplePolygonPaths;
        }

        return new google.maps.Polygon(options);

    }

    return {
        getMap: map,
        getMarkers: markers,
        getOMS: oms,
        getInfoWindow: infoWindow,
        getPolygons: polygons
    }

};

Thunderdome.makeDataTable = function (theMap) {
    if (Thunderdome.tableConfig.has('showMap') && Thunderdome.tableConfig.get('showMap')) {
		var markers = theMap.getMarkers;
	//	console.log(markers);
		var polygons = theMap.getPolygons;
		var map = theMap.getMap;
		var oms = theMap.getOMS;
		var infoWindow = theMap.getInfoWindow;
	}
    //options for the datatable
    var options = [];
	options['allowHtml'] = true;
    options['sort'] = 'enable';
    options['page'] = 'enable';
    options['pageSize'] = 14;
    options['pagingSymbols'] = {
        prev: 'prev',
        next: 'next'
    };
    options['pagingButtonsConfiguration'] = 'auto';
    options['cssClassNames'] = {
        'tableCell': 'tableCell'
    }

    var table; //the datatable object
    var rows = []; //to hold datatable rows
    Thunderdome.data.each(function (item) {
        var row = {};
        var rowData = [];
        var tableCols = Thunderdome.tableConfig.get('tableCols');
        _.each(tableCols, function (tableCol) {
            if (Thunderdome.tableConfig.has('dollarFormatCols') && _.indexOf(Thunderdome.tableConfig.get('dollarFormatCols'), tableCol) > -1) {
                rowData.push({
                    v: item.get(tableCol),
                    f: '$' + item.get(tableCol).formatNumber(2, '.', ',')
                });
            }
            if (Thunderdome.tableConfig.has('dateFormatCols') && _.indexOf(Thunderdome.tableConfig.get('dateFormatCols'), tableCol) > -1) {
                rowData.push({
                    v: Date.parse(item.get(tableCol)),
                    f: item.get(tableCol)
                });
            }
            else {
                rowData.push({
                    v: item.get(tableCol)
                });
            }
        });
        row = {
            c: rowData
        };
        rows.push(row);
    });
    var data = {
        cols: Thunderdome.tableConfig.get('tableHeader'),
        rows: rows
    };
    //config for the search box at the top of the datatable

    var stringFilter;
    var categoryPicker;
    var filters = [];
    if (Thunderdome.tableConfig.get('showSearch')) {
        stringFilter = new google.visualization.ControlWrapper({
            'controlType': 'StringFilter',
            'containerId': Thunderdome.tableConfig.get('searchDiv'),
            'options': {
                'filterColumnLabel': Thunderdome.tableConfig.get('fieldToSearch'),
                'matchType': 'any',
                'ui': {
                    'label': Thunderdome.tableConfig.get('searchLabel'),
                    'cssClass': Thunderdome.tableConfig.get('searchCSSClass')
                }
            }


        });
        filters.push(stringFilter);
    }
    if (Thunderdome.tableConfig.get('showCategory')) {
        categoryPicker = new google.visualization.ControlWrapper({
            'controlType': 'CategoryFilter',
            'containerId': 'filterCategory',
            'options': {
                'filterColumnLabel': Thunderdome.tableConfig.get('categoryToFilter'),
                'ui': {
                    'labelStacking': 'horizontal',
                    'allowTyping': false,
                    'allowMultiple': false,
                    'caption': 'All',
                    'label': Thunderdome.tableConfig.get('categoryLabel'),
                    'cssClass': Thunderdome.tableConfig.get('categoryCSSClass')
                }
            }
        });
        filters.push(categoryPicker);
    }
    //init the databable using a wrapper so we can bind the search box
    table = new google.visualization.ChartWrapper({
        'chartType': 'Table',
        'containerId': Thunderdome.tableConfig.get('tableDiv'),
        'options': options
    });



    dashboard = new google.visualization.Dashboard(document.getElementById(Thunderdome.tableConfig.get('mainDiv'))).
    bind(filters, table).
    // Draw the table and the search box and put it in the #gridContainer div below
    draw(data);


    //add event listener to open up the marker popup when user clicks on a row
    if (Thunderdome.tableConfig.get('showMap')) {
        google.visualization.events.addListener(table, 'select', showInfoWindow);
    }

    function showInfoWindow() {
		var marker;
        var polygon;
        var sort = table.getChart().getSortInfo();
        var i = table.getChart().getSelection();
        //if the table's been sorted by the user, then the index of the record returned will be wrong.
        //sortedIndexes helps us get the proper one.
	//UPDATED: Goolge fixed this, so we just do it the normal way
/*        if (sort.column != -1) { //if sorted
            var rowWanted = sort.sortedIndexes[i[0].row];
            var rowWanted = i[0].row; //maybe google fixed the problem.
        }
        else { //get it the normal way.
*/            var rowWanted = i[0].row;
//        }
        var key = table.getDataTable().getValue(rowWanted, 0);
//		console.log(key);
        if (Thunderdome.mapConfig.get('showMarkers')) {
            marker = markers[key];
        }
        if (Thunderdome.mapConfig.get('showPolygons')) {
            polygon = polygons[key];
        }
        if (Thunderdome.mapConfig.get('mapAPI') === 'Leaflet') {
            marker.unbindPopup();
            infoWindow = new L.Popup();
            infoWindow.setContent(marker.desc);
            infoWindow.setLatLng(marker.getLatLng());
            map.openPopup(infoWindow);

        }
        else { //Assume it's google
            if (Thunderdome.mapConfig.get('showMarkers')) {
                google.maps.event.trigger(marker, 'click');
                infoWindow.setContent(marker.popupText);
                infoWindow.open(map, marker);
                map.panTo(marker.getPosition());
                //					map.setZoom(8);
            }
            if (Thunderdome.mapConfig.get('showPolygons')) {
                google.maps.event.trigger(polygon, 'click');

            }

        }
/*		
	var id = table.getDataTable().getFilteredRows([{column:0,value:2}]);
	var t = table.getDataTable().toDataTable();
	t.setCell(parseInt(id),5,100);
    dashboard = new google.visualization.Dashboard(document.getElementById(Thunderdome.tableConfig.get('mainDiv'))).
    bind(filters, table).
    // Draw the table and the search box and put it in the #gridContainer div below
    draw(t);
*/

	}
    return {
        getTable: table,
		getFilters: filters

    }

};
Thunderdome.showDetail = function (id) {
    var item = Thunderdome.data.find(function (item) {
        return item.get(Thunderdome.mapConfig.get('modalID')) === id;
    });
    var source = $('#' + Thunderdome.mapConfig.get('modalTemplate')).html();
    var template = Handlebars.compile(source);
    var context = {};
    var modalItems = Thunderdome.mapConfig.get('modalItems');
    _.each(modalItems, function (modalItem) {
        context[modalItem] = item.get(modalItem);
    });
    var text = template(context);
    var modalDiv = '#' + Thunderdome.mapConfig.get('modalDiv');
    jQuery(modalDiv)
        .dialog("option", {
        "title": Thunderdome.mapConfig.get('modalTitle')(item),
        width: Thunderdome.mapConfig.get('modalWidth'),
        height: Thunderdome.mapConfig.get('modalHeight')
    });
    jQuery(modalDiv).html(text).dialog('open');
};

/*
	Shamelessly stolen, err, borrowed from d3.js
	Will remove if we use that library. Renamed to avoid
	future clashes.
*/
function Thunderdome_dsv(delimiter, mimeType) {
    var reParse = new RegExp("\r\n|[" + delimiter + "\r\n]", "g"), // field separator regex
        reFormat = new RegExp("[\"" + delimiter + "\n]"),
        delimiterCode = delimiter.charCodeAt(0);

    function dsv(url, callback) {
        Thunderdome.text(url, mimeType, function (text) {
            callback(text && dsv.parse(text));
        });
    }

    dsv.parse = function (text) {
        var header;
        return dsv.parseRows(text, function (row, i) {
            if (i) {
                var o = {}, j = -1,
                    m = header.length;
                while (++j < m) o[header[j]] = row[j];
                return o;
            }
            else {
                header = row;
                return null;
            }
        });
    };

    dsv.parseRows = function (text, f) {
        var EOL = {}, // sentinel value for end-of-line
        EOF = {}, // sentinel value for end-of-file
        rows = [], // output rows
            n = 0, // the current line number
            t, // the current token
            eol; // is the current token followed by EOL?

        reParse.lastIndex = 0; // work-around bug in FF 3.6

        function token() {
            if (reParse.lastIndex >= text.length) return EOF; // special case: end of file
            if (eol) {
                eol = false;
                return EOL;
            } // special case: end of line

            // special case: quotes
            var j = reParse.lastIndex;
            if (text.charCodeAt(j) === 34) {
                var i = j;
                while (i++ < text.length) {
                    if (text.charCodeAt(i) === 34) {
                        if (text.charCodeAt(i + 1) !== 34) break;
                        i++;
                    }
                }
                reParse.lastIndex = i + 2;
                var c = text.charCodeAt(i + 1);
                if (c === 13) {
                    eol = true;
                    if (text.charCodeAt(i + 2) === 10) reParse.lastIndex++;
                }
                else if (c === 10) {
                    eol = true;
                }
                return text.substring(j + 1, i).replace(/""/g, "\"");
            }

            // common case
            var m = reParse.exec(text);
            if (m) {
                eol = m[0].charCodeAt(0) !== delimiterCode;
                return text.substring(j, m.index);
            }
            reParse.lastIndex = text.length;
            return text.substring(j);
        }

        while ((t = token()) !== EOF) {
            var a = [];
            while (t !== EOL && t !== EOF) {
                a.push(t);
                t = token();
            }
            if (f && !(a = f(a, n++))) continue;
            rows.push(a);
        }

        return rows;
    };

    dsv.format = function (rows) {
        return rows.map(formatRow).join("\n");
    };

    function formatRow(row) {
        return row.map(formatValue).join(delimiter);
    }

    function formatValue(text) {
        return reFormat.test(text) ? "\"" + text.replace(/\"/g, "\"\"") + "\"" : text;
    }

    return dsv;
}

Thunderdome.text = function (url, mime, callback) {
    function ready(req) {
        callback(req && req.responseText);
    }
    if (arguments.length < 3) {
        callback = mime;
        mime = null;
    }
    Thunderdome.xhr(url, mime, ready);
};
Thunderdome.xhr = function (url, mime, callback) {
    var req = new XMLHttpRequest;
    if (arguments.length < 3) callback = mime, mime = null;
    else if (mime && req.overrideMimeType) req.overrideMimeType(mime);
    req.open("GET", url, true);
    if (mime) req.setRequestHeader("Accept", mime);
    req.onreadystatechange = function () {
        if (req.readyState === 4) {
            var s = req.status;
            callback(!s && req.response || s >= 200 && s < 300 || s === 304 ? req : null);
        }
    };
    req.send(null);
};

Thunderdome.csv = Thunderdome_dsv(",", "text/csv");

//Utilities
Number.prototype.formatNumber = function (c, d, t) {
    var n = this,
        c = isNaN(c = Math.abs(c)) ? 2 : c,
        d = d == undefined ? "," : d,
        t = t == undefined ? "." : t,
        s = n < 0 ? "-" : "",
        i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "",
        j = (j = i.length) > 3 ? j % 3 : 0;
    return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};

String.prototype.formatTitleCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

Number.prototype.formatPercent = function(places,symbol) {
	if(typeof symbol == 'undefined') { symbol = '%'; }	
	if(typeof places == 'undefined') { places = 0; }
	return (this * 100).toFixed(places) + symbol

}
