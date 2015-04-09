window.onload = function() {
	// Create MapMarker object to hold Google Map marker and store information about the location
	var MapMarker = function(marker, name, vicinity){
		this.marker = marker;
		this.name = name;
		this.vicinity = vicinity;
	};

	// Overall viewmodel for this screen, along with initial state
	var ViewModel = function() {
		var self = this;
		self.toggleImage = ko.observable("images/arrow_down.png");
		self.placesList = ko.observableArray();
		self.searchResults = ko.observableArray();
		self.searchResults_isVisible = ko.observable(false);
		self.searchterm = ko.observable();

		var mapOptions = {
			center: {lat: 39.781121, lng: -89.649889},
			zoom: 13,
			disableDefaultUI: true
		};

		// Display Google map/send request for initial restaurant locations or show error message
		try {
			var map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);


			var pinColor = "fe7569";
	    	var pinImage = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|" + pinColor,
	        new google.maps.Size(21, 34),
	        new google.maps.Point(0,0),
	        new google.maps.Point(10, 34));

	    	var clickedPinColor = "930d01";
	        var clickedPinImage = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|" + clickedPinColor,
	        new google.maps.Size(21, 34),
	        new google.maps.Point(0,0),
	        new google.maps.Point(10, 34));

			var request = {
				location: {lat: 39.7811121, lng: -89.649889},
				radius: '5000',
				types: ['restaurant']
			};

			var infowindow = new google.maps.InfoWindow();

			var service = new google.maps.places.PlacesService(map);
			service.nearbySearch(request, nearbySearch_callback);

		} catch (e) {
			// Hide search box
			var cols = document.getElementsByClassName('search');
			for(var i=0; i<cols.length; i++){
				cols[i].style.display = 'none';
			}

			// Hide search results list
			cols = document.getElementsByClassName('search_results');
			for(i=0; i<cols.length; i++){
				cols[i].style.display = 'none';
			}

			// Show error message
			cols = document.getElementsByClassName('map_err');
			for(i=0; i<cols.length; i++){
				cols[i].style.display = 'block';
			}
		}

		// Callback function - PlacesService.nearbySearch
		// Passes search results to createMarker function
		function nearbySearch_callback(results, status){
			if (status == google.maps.places.PlacesServiceStatus.OK){
				for (var i = 0; i < results.length; i++){
					self.createMarker(results[i]);
				}
			}
		}

		// Takes a place as input and creates/displays marker on Google Map and adds 'click' listener
		self.createMarker = function(place){
			var marker = new google.maps.Marker({
				map: map,
				position: place.geometry.location,
				icon: pinImage
			});

			google.maps.event.addListener(marker, 'click', function(){
				self.resetMarkerIcons();
				marker.setIcon(clickedPinImage);
				self.getLocationInfo(marker, place);
			});

			self.placesList.push(new MapMarker(marker, place.name, place.vicinity));
			self.searchResults.push(new MapMarker(marker, place.name, place.vicinity));
		};	

		/**
		 * function to run on marker click event to pull/display location information from FourSquare
		 * Restaurant is found - Display data and link to credit FourSquare
		 * Restaurant not found -  Display content from original places result
		 * Error during request - Display content from original places result
		 */ 
		self.getLocationInfo = function (marker, place){
			var lat = place.geometry.location.lat();
			var lng = place.geometry.location.lng();

			$.ajax({
				url: 'https://api.foursquare.com/v2/venues/search?v=20150402&client_id=O3HOXE5ZEZ05NEMSCBSV0MQHIQQWN2IKMGTQFGEXY2AY1T0S&client_secret=RVEJ4YKJXVZ3I3KPLJWAXYMLAYRIIDJIOVEQHXXZZL2CW4RG&intent=match&limit=1&ll='+lat+','+lng+'&llAcc=500&query='+place.name,
				dataType: 'json',
				success: function(data){
					
					var content_string = "";

					if(data.response.venues[0]){
						content_string = '<img width="15" src="' + place.icon + '"/> ';
						content_string = content_string + data.response.venues[0].name;
						content_string = content_string + ' <a href="https://foursquare.com/v/' + data.response.venues[0].name + '/'+ data.response.venues[0].id + '?ref=O3HOXE5ZEZ05NEMSCBSV0MQHIQQWN2IKMGTQFGEXY2AY1T0S" target="_blank"><img width="15" src="images/foursquare-icon-16x16.png"></a><br/>';
						content_string = content_string + data.response.venues[0].location.address + '<br/>';
						content_string = content_string + data.response.venues[0].contact.formattedPhone + '<br/>';
						if (data.response.venues[0].hasMenu === true)
							content_string = content_string + '<a href="' + data.response.venues[0].menu.url + '" target="_blank">View Menu</a><br/>';
							
					} else {
						content_string = '<img width="15" src="' + place.icon + '"/> ' + place.name + '<br/>';
					}

					infowindow.setContent(content_string);
					infowindow.open(map, marker);
				},
				failure: function(){
					infowindow.setContent('<img width="15" src="' + place.icon + '"/> ' + place.name);
					infowindow.open(map, marker);
				},
				error: function(){
					infowindow.setContent('<img width="15" src="' + place.icon + '"/> ' + place.name);
					infowindow.open(map, marker);
				}
			});	
		};

		// function to search restaurant names and update map/results screen to show only matches
		self.searchMarkers = function(){
			var searchExpression = new RegExp(self.searchterm(), "gi");
			var searchResultsList = [];
			for (var i in self.placesList()){
				if (self.placesList()[i].name.match(searchExpression)){
					self.placesList()[i].marker.setMap(map);
					searchResultsList.push(self.placesList()[i]);
				} else {
					self.placesList()[i].marker.setMap(null);
				}
			}
			self.searchResults(searchResultsList);
		};

		// reset marker icons to default "not selected" pin image
		self.resetMarkerIcons = function(){
			for (var i in self.placesList()){
        if (self.placesList().hasOwnProperty(i)) {
					self.placesList()[i].marker.setIcon(pinImage);
        }
			}
		};

		// function to display/hide search results window and change arrow icon to match current display
		self.toggleResults = function(){
			if (self.searchResults_isVisible() === true){
				self.searchResults_isVisible(false);
				self.toggleImage("images/arrow_down.png");
			} else {
				self.searchResults_isVisible(true);
				self.toggleImage("images/arrow_up.png");
			}
		};

		// function to show infowindow and select marker when restaurant is selected in search result list
		self.selectSearchResult = function(marker){
			google.maps.event.trigger(marker.marker, 'click');
			map.setCenter(marker.marker.position);
			self.toggleResults();
		};
	};	

	ko.applyBindings(new ViewModel());

};