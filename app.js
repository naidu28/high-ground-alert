(function() {

    L.Icon.Default.imagePath = '/node_modules/leaflet/dist/images';

    // The map
    var leaf = null;

    // The mudflow polygon
    var mudflow;

    // Geocoder to turn address into coords
    var geocoder = new google.maps.Geocoder();

    // For icon clicks and hovers
    var clicked, timeout;

    var markers = new L.FeatureGroup();
    function setPosition(position) {
        var coords = new L.LatLng(position.latitude, position.longitude);
        try {
            if (leaf) {
                // Remove previous markers
                leaf.removeLayer(markers);

                // Make new markers
                markers = new L.FeatureGroup();

                // Make and append the marker
                var marker = L.marker(coords);

                markers.addLayer(marker);
                leaf.addLayer(markers);
                leaf.setView(coords, leaf.getZoom());

                if (inADangerZone(position)) {
                    marker
                        .bindPopup('You are in a danger zone!')
                        .openPopup();
                } else {
                    marker
                        .bindPopup('You are safe.')
                        .openPopup();
                }
            }
        } catch(e) {
            console.warn(e);
        }
    }

    function inADangerZone(position) {
        var point = {"type":"Point","coordinates":[position.longitude, position.latitude]};
        var polygons = mudflow.features;
        for (var i = 0; i < polygons.length; i++) {
            console.log('checking polygon', i+1);
            if (gju.pointInPolygon(point, polygons[i].geometry)) {
                return true;
            }
        }
        return false;
    }

    var tiles = {
        standard        : 'http://{s}.tile.osm.org/{z}/{x}/{y}.png',
        humanitarian    : 'http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
        watercolor      : 'http://{s}.tile.stamen.com/watercolor/{z}/{x}/{y}.jpg',
        sketchy         : 'https://{s}.tiles.mapbox.com/v3/aj.Sketchy2/{z}/{x}/{y}.png',
        cartodb         : 'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
    };

    var Map = React.createClass({
        getInitialState: function() {
            return {
                tile: tiles.cartodb
            };
        },
        componentDidMount: function() {

            leaf = L.map('map').setView([1,1], 16);
            this.setState({
                map: leaf
            });

            leaf.locate({
                setView: true
            });

            L.tileLayer(this.state.tile, {
                attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(leaf);

            $.getJSON('/mudflow.json').then(function (json) {
                mudflow = json;

                L.geoJson(json, {
                    style: function (feature) {
                        return {
                            color: 'red' //colors[Math.floor(Math.random()*colors.length)]
                        };
                    },
                    onEachFeature: function (feature, layer) {
                        //layer.bindPopup('Hi, my ID is ' + feature.properties.id);
                    }
                }).addTo(leaf);
            });

        },
        render: function() {

            return (
                // Keep opened user selected
                <div id="map"></div>
            );
        }
    });

    function attachListenersToLayer(featureLayer) {
        featureLayer.on('mouseover', function(e){
            if (!clicked) {
                clearTimeout(timeout);
                e.layer.openPopup();
            }
        });
        featureLayer.on('mouseout', function (e) {
            if (!clicked) {
                //timeout = setTimeout(function() {
                e.layer.closePopup();
                //}, 500);
            }
        });
        featureLayer.on('click', function (e) {
            if (!clicked) {
                //clearTimeout(timeout);
                clicked = true;
                e.layer.openPopup();
            } else {
                clicked = false;
                e.layer.closePopup();
            }
        });
        featureLayer.on('popupclose', function(e) {
            clicked = false;
        });
    }

    var Search = React.createClass({
        getInitialState: function() {
            return {
                address: ''
            };
        },
        searchAddress: function(e) {
            e.preventDefault();
            if (!this.state.address || this.state.address.length < 3) return alert('Please enter a valid address!');


            geocoder.geocode({ 'address': this.state.address }, handleGeocode);

            function handleGeocode(results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    console.log(results);

                    var position = {
                        latitude: results[0].geometry.location.lat(),
                        longitude: results[0].geometry.location.lng()
                    };

                    setPosition(position);
                } else {
                    alert('Geocode was not successful for the following reason: ' + status);
                }
            }
        },
        detectLocation: function(e) {
            e.preventDefault();
            var watch = navigator.geolocation.watchPosition(success, failure);
            function success(position) {
                setPosition(position.coords);
                navigator.geolocation.clearWatch(watch);
            }
            function failure(error) {
                alert(error);
            }
        },
        updateAddress: function(e, val) {
            this.setState({ address: e.target.value });
        },
        render: function() {

            return (
                <form className="search" onSubmit={this.searchAddress}>
                    <input placeholder="Street Address" onChange={this.updateAddress} value={this.state.address} />
                    <button onClick={this.searchAddress}>Search</button>
                    <button onClick={this.detectLocation}>Detect</button>
                </form>
            );
        }
    });

    var Page = React.createClass({
        render: function() {

            return (
                <div>
                    <Map />
                    <Search />
                </div>
            );
        }
    });

    React.render(<Page />, document.getElementById('main'));

})();