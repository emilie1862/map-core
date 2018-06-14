/* This software has been approved for release by the U.S. Department of the Interior. Although the software has been subjected to rigorous review, the DOI reserves the right to update the software as needed pursuant to further analysis and review. No warranty, expressed or implied, is made by the DOI or the U.S. Government as to the functionality of the software and related material nor shall the fact of release constitute any such warranty. Furthermore, the software is released on condition that neither the DOI nor the U.S. Government shall be held liable for any damages resulting from its authorized or unauthorized use. */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('leaflet'), require('q'), require('geoplatform.client'), require('jquery')) :
    typeof define === 'function' && define.amd ? define(['leaflet', 'q', 'geoplatform.client', 'jquery'], factory) :
    (global.GeoPlatformMapCore = factory(global.L,global.Q,global.GeoPlatformClient,global.jQuery));
}(this, (function (L$1,Q,GeoPlatformClient,jQuery) { 'use strict';

    Q = Q && Q.hasOwnProperty('default') ? Q['default'] : Q;
    var GeoPlatformClient__default = 'default' in GeoPlatformClient ? GeoPlatformClient['default'] : GeoPlatformClient;
    jQuery = jQuery && jQuery.hasOwnProperty('default') ? jQuery['default'] : jQuery;

    var loadingControl = L$1.Control.extend({
        options: {
            position: 'topleft',
            separate: false,
            zoomControl: null,
            spinjs: false,
            spin: {
                lines: 7,
                length: 3,
                width: 3,
                radius: 5,
                rotate: 13,
                top: "83%"
            }
        },

        initialize: function initialize(options) {
            L$1.setOptions(this, options);
            this._dataLoaders = {};

            // Try to set the zoom control this control is attached to from the
            // options
            if (this.options.zoomControl !== null) {
                this.zoomControl = this.options.zoomControl;
            }
        },

        onAdd: function onAdd(map) {
            if (this.options.spinjs && typeof Spinner !== 'function') {
                return console.error("Leaflet.loading cannot load because you didn't load spin.js (http://fgnass.github.io/spin.js/), even though you set it in options.");
            }
            this._addLayerListeners(map);
            this._addMapListeners(map);

            // Try to set the zoom control this control is attached to from the map
            // the control is being added to
            if (!this.options.separate && !this.zoomControl) {
                if (map.zoomControl) {
                    this.zoomControl = map.zoomControl;
                } else if (map.zoomsliderControl) {
                    this.zoomControl = map.zoomsliderControl;
                }
            }

            // Create the loading indicator
            var classes = 'leaflet-control-loading';
            var container;
            if (this.zoomControl && !this.options.separate) {
                // If there is a zoom control, hook into the bottom of it
                container = this.zoomControl._container;
                // These classes are no longer used as of Leaflet 0.6
                classes += ' leaflet-bar-part-bottom leaflet-bar-part last';
            } else {
                // Otherwise, create a container for the indicator
                container = L$1.DomUtil.create('div', 'leaflet-control-zoom leaflet-bar');
            }
            this._indicator = L$1.DomUtil.create('a', classes, container);
            if (this.options.spinjs) {
                this._spinner = new Spinner(this.options.spin).spin();
                this._indicator.appendChild(this._spinner.el);
            }
            return container;
        },

        onRemove: function onRemove(map) {
            this._removeLayerListeners(map);
            this._removeMapListeners(map);
        },

        removeFrom: function removeFrom(map) {
            if (this.zoomControl && !this.options.separate) {
                // Override Control.removeFrom() to avoid clobbering the entire
                // _container, which is the same as zoomControl's
                this._container.removeChild(this._indicator);
                this._map = null;
                this.onRemove(map);
                return this;
            } else {
                // If this control is separate from the zoomControl, call the
                // parent method so we don't leave behind an empty container
                return L$1.Control.prototype.removeFrom.call(this, map);
            }
        },

        addLoader: function addLoader(id) {
            this._dataLoaders[id] = true;
            this.updateIndicator();
        },

        removeLoader: function removeLoader(id) {
            delete this._dataLoaders[id];
            this.updateIndicator();
        },

        updateIndicator: function updateIndicator() {
            if (this.isLoading()) {
                this._showIndicator();
            } else {
                this._hideIndicator();
            }
        },

        isLoading: function isLoading() {
            return this._countLoaders() > 0;
        },

        _countLoaders: function _countLoaders() {
            var size = 0,
                key;
            for (key in this._dataLoaders) {
                if (this._dataLoaders.hasOwnProperty(key)) size++;
            }
            return size;
        },

        _showIndicator: function _showIndicator() {
            // Show loading indicator
            L$1.DomUtil.addClass(this._indicator, 'is-loading');

            // If zoomControl exists, make the zoom-out button not last
            if (!this.options.separate) {
                if (this.zoomControl instanceof L$1.Control.Zoom) {
                    L$1.DomUtil.removeClass(this.zoomControl._zoomOutButton, 'leaflet-bar-part-bottom');
                } else if (typeof L$1.Control.Zoomslider === 'function' && this.zoomControl instanceof L$1.Control.Zoomslider) {
                    L$1.DomUtil.removeClass(this.zoomControl._ui.zoomOut, 'leaflet-bar-part-bottom');
                }
            }
        },

        _hideIndicator: function _hideIndicator() {
            // Hide loading indicator
            L$1.DomUtil.removeClass(this._indicator, 'is-loading');

            // If zoomControl exists, make the zoom-out button last
            if (!this.options.separate) {
                if (this.zoomControl instanceof L$1.Control.Zoom) {
                    L$1.DomUtil.addClass(this.zoomControl._zoomOutButton, 'leaflet-bar-part-bottom');
                } else if (typeof L$1.Control.Zoomslider === 'function' && this.zoomControl instanceof L$1.Control.Zoomslider) {
                    L$1.DomUtil.addClass(this.zoomControl._ui.zoomOut, 'leaflet-bar-part-bottom');
                }
            }
        },

        _handleLoading: function _handleLoading(e) {
            this.addLoader(this.getEventId(e));
        },

        _handleLoad: function _handleLoad(e) {
            this.removeLoader(this.getEventId(e));
        },

        getEventId: function getEventId(e) {
            if (e.id) {
                return e.id;
            } else if (e.layer) {
                return e.layer._leaflet_id;
            }
            return e.target._leaflet_id;
        },

        _layerAdd: function _layerAdd(e) {
            if (!e.layer || !e.layer.on) return;
            try {
                e.layer.on({
                    loading: this._handleLoading,
                    load: this._handleLoad
                }, this);
            } catch (exception) {
                console.warn('L.Control.Loading: Tried and failed to add ' + ' event handlers to layer', e.layer);
                console.warn('L.Control.Loading: Full details', exception);
            }
        },

        _addLayerListeners: function _addLayerListeners(map) {
            // Add listeners for begin and end of load to any layers already on the
            // map
            map.eachLayer(function (layer) {
                if (!layer.on) return;
                layer.on({
                    loading: this._handleLoading,
                    load: this._handleLoad
                }, this);
            }, this);

            // When a layer is added to the map, add listeners for begin and end
            // of load
            map.on('layeradd', this._layerAdd, this);
        },

        _removeLayerListeners: function _removeLayerListeners(map) {
            // Remove listeners for begin and end of load from all layers
            map.eachLayer(function (layer) {
                if (!layer.off) return;
                layer.off({
                    loading: this._handleLoading,
                    load: this._handleLoad
                }, this);
            }, this);

            // Remove layeradd listener from map
            map.off('layeradd', this._layerAdd, this);
        },

        _addMapListeners: function _addMapListeners(map) {
            // Add listeners to the map for (custom) dataloading and dataload
            // events, eg, for AJAX calls that affect the map but will not be
            // reflected in the above layer events.
            map.on({
                dataloading: this._handleLoading,
                dataload: this._handleLoad,
                layerremove: this._handleLoad
            }, this);
        },

        _removeMapListeners: function _removeMapListeners(map) {
            map.off({
                dataloading: this._handleLoading,
                dataload: this._handleLoad,
                layerremove: this._handleLoad
            }, this);
        }
    });

    L$1.Control.Loading = loadingControl;
    L$1.Control.loading = function (options) {
        return new L$1.Control.Loading(options);
    };
    L$1.Map.addInitHook(function () {
        if (this.options.loadingControl) {
            this.loadingControl = new loadingControl();
            this.addControl(this.loadingControl);
        }
    });

    var measureControl = L$1.Control.extend({
        options: {
            position: 'topleft'
        },

        onAdd: function onAdd(map) {
            var className = 'leaflet-control-zoom leaflet-bar leaflet-control',
                container = L$1.DomUtil.create('div', className);

            this._createButton('&#8674;', 'Measure', 'leaflet-control-measure leaflet-bar-part leaflet-bar-part-top-and-bottom', container, this._toggleMeasure, this);

            return container;
        },

        _createButton: function _createButton(html, title, className, container, fn, context) {
            var link = L$1.DomUtil.create('a', className, container);
            link.innerHTML = html;
            link.href = '#';
            link.title = title;

            L$1.DomEvent.on(link, 'click', L$1.DomEvent.stopPropagation).on(link, 'click', L$1.DomEvent.preventDefault).on(link, 'click', fn, context).on(link, 'dblclick', L$1.DomEvent.stopPropagation);

            return link;
        },

        _toggleMeasure: function _toggleMeasure() {
            this._measuring = !this._measuring;

            if (this._measuring) {
                L$1.DomUtil.addClass(this._container, 'leaflet-control-measure-on');
                this._startMeasuring();
            } else {
                L$1.DomUtil.removeClass(this._container, 'leaflet-control-measure-on');
                this._stopMeasuring();
            }
        },

        _startMeasuring: function _startMeasuring() {
            this._oldCursor = this._map._container.style.cursor;
            this._map._container.style.cursor = 'crosshair';

            this._doubleClickZoom = this._map.doubleClickZoom.enabled();
            this._map.doubleClickZoom.disable();

            L$1.DomEvent.on(this._map, 'mousemove', this._mouseMove, this).on(this._map, 'click', this._mouseClick, this).on(this._map, 'dblclick', this._finishPath, this).on(document, 'keydown', this._onKeyDown, this);

            if (!this._layerPaint) {
                this._layerPaint = L$1.layerGroup().addTo(this._map);
            }

            if (!this._points) {
                this._points = [];
            }
        },

        _stopMeasuring: function _stopMeasuring() {
            this._map._container.style.cursor = this._oldCursor;

            L$1.DomEvent.off(document, 'keydown', this._onKeyDown, this).off(this._map, 'mousemove', this._mouseMove, this).off(this._map, 'click', this._mouseClick, this).off(this._map, 'dblclick', this._mouseClick, this);

            if (this._doubleClickZoom) {
                this._map.doubleClickZoom.enable();
            }

            if (this._layerPaint) {
                this._layerPaint.clearLayers();
            }

            this._restartPath();
        },

        _mouseMove: function _mouseMove(e) {
            if (!e.latlng || !this._lastPoint) {
                return;
            }

            if (!this._layerPaintPathTemp) {
                this._layerPaintPathTemp = L$1.polyline([this._lastPoint, e.latlng], {
                    color: 'black',
                    weight: 1.5,
                    clickable: false,
                    dashArray: '6,3'
                }).addTo(this._layerPaint);
            } else {
                this._layerPaintPathTemp.spliceLatLngs(0, 2, this._lastPoint, e.latlng);
            }

            if (this._tooltip) {
                if (!this._distance) {
                    this._distance = 0;
                }

                this._updateTooltipPosition(e.latlng);

                var distance = e.latlng.distanceTo(this._lastPoint);
                this._updateTooltipDistance(this._distance + distance, distance);
            }
        },

        _mouseClick: function _mouseClick(e) {
            // Skip if no coordinates
            if (!e.latlng) {
                return;
            }

            // If we have a tooltip, update the distance and create a new tooltip, leaving the old one exactly where it is (i.e. where the user has clicked)
            if (this._lastPoint && this._tooltip) {
                if (!this._distance) {
                    this._distance = 0;
                }

                this._updateTooltipPosition(e.latlng);

                var distance = e.latlng.distanceTo(this._lastPoint);
                this._updateTooltipDistance(this._distance + distance, distance);

                this._distance += distance;
            }
            this._createTooltip(e.latlng);

            // If this is already the second click, add the location to the fix path (create one first if we don't have one)
            if (this._lastPoint && !this._layerPaintPath) {
                this._layerPaintPath = L$1.polyline([this._lastPoint], {
                    color: 'black',
                    weight: 2,
                    clickable: false
                }).addTo(this._layerPaint);
            }

            if (this._layerPaintPath) {
                this._layerPaintPath.addLatLng(e.latlng);
            }

            // Upate the end marker to the current location
            if (this._lastCircle) {
                this._layerPaint.removeLayer(this._lastCircle);
            }

            this._lastCircle = new L$1.CircleMarker(e.latlng, {
                color: 'black',
                opacity: 1,
                weight: 1,
                fill: true,
                fillOpacity: 1,
                radius: 2,
                clickable: this._lastCircle ? true : false
            }).addTo(this._layerPaint);

            this._lastCircle.on('click', function () {
                this._finishPath();
            }, this);

            // Save current location as last location
            this._lastPoint = e.latlng;
        },

        _finishPath: function _finishPath() {
            // Remove the last end marker as well as the last (moving tooltip)
            if (this._lastCircle) {
                this._layerPaint.removeLayer(this._lastCircle);
            }
            if (this._tooltip) {
                this._layerPaint.removeLayer(this._tooltip);
            }
            if (this._layerPaint && this._layerPaintPathTemp) {
                this._layerPaint.removeLayer(this._layerPaintPathTemp);
            }

            // Reset everything
            this._restartPath();
        },

        _restartPath: function _restartPath() {
            this._distance = 0;
            this._tooltip = undefined;
            this._lastCircle = undefined;
            this._lastPoint = undefined;
            this._layerPaintPath = undefined;
            this._layerPaintPathTemp = undefined;
        },

        _createTooltip: function _createTooltip(position) {
            var icon = L$1.divIcon({
                className: 'leaflet-measure-tooltip',
                iconAnchor: [-5, -5]
            });
            this._tooltip = L$1.marker(position, {
                icon: icon,
                clickable: false
            }).addTo(this._layerPaint);
        },

        _updateTooltipPosition: function _updateTooltipPosition(position) {
            this._tooltip.setLatLng(position);
        },

        _updateTooltipDistance: function _updateTooltipDistance(total, difference) {
            var totalRound = this._round(total),
                differenceRound = this._round(difference);

            var text = '<div class="leaflet-measure-tooltip-total">' + totalRound + ' nm</div>';
            if (differenceRound > 0 && totalRound != differenceRound) {
                text += '<div class="leaflet-measure-tooltip-difference">(+' + differenceRound + ' nm)</div>';
            }

            this._tooltip._icon.innerHTML = text;
        },

        _round: function _round(val) {
            return Math.round(val / 1852 * 10) / 10;
        },

        _onKeyDown: function _onKeyDown(e) {
            if (e.keyCode == 27) {
                // If not in path exit measuring mode, else just finish path
                if (!this._lastPoint) {
                    this._toggleMeasure();
                } else {
                    this._finishPath();
                }
            }
        }
    });

    L$1.Control.Measure = measureControl;
    L$1.control.measure = function (options) {
        return new L$1.Control.Measure(options);
    };

    L$1.Map.mergeOptions({
        measureControl: false
    });

    L$1.Map.addInitHook(function () {
        if (this.options.measureControl) {
            this.measureControl = new measureControl();
            this.addControl(this.measureControl);
        }
    });

    var positionControl = L$1.Control.extend({
      options: {
        position: 'bottomleft',
        separator: ' : ',
        emptyString: 'Unavailable',
        lngFirst: false,
        numDigits: 6,
        lngFormatter: undefined,
        latFormatter: undefined,
        prefix: ""
      },

      onAdd: function onAdd(map) {
        this._container = L$1.DomUtil.create('div', 'leaflet-control-mouseposition');
        L$1.DomEvent.disableClickPropagation(this._container);
        map.on('mousemove', this._onMouseMove, this);
        this._container.innerHTML = this.options.emptyString;
        return this._container;
      },

      onRemove: function onRemove(map) {
        map.off('mousemove', this._onMouseMove);
      },

      _onMouseMove: function _onMouseMove(e) {
        var lng = this.options.lngFormatter ? this.options.lngFormatter(e.latlng.lng) : L$1.Util.formatNum(e.latlng.lng, this.options.numDigits);
        var lat = this.options.latFormatter ? this.options.latFormatter(e.latlng.lat) : L$1.Util.formatNum(e.latlng.lat, this.options.numDigits);
        var value = this.options.lngFirst ? lng + this.options.separator + lat : lat + this.options.separator + lng;
        var prefixAndValue = this.options.prefix + ' ' + value;
        this._container.innerHTML = prefixAndValue;
      }

    });

    L$1.Control.MousePosition = positionControl;
    L$1.control.mousePosition = function (options) {
      return new L$1.Control.MousePosition(options);
    };

    L$1.Map.mergeOptions({
      positionControl: false
    });

    L$1.Map.addInitHook(function () {
      if (this.options.positionControl) {
        this.positionControl = new positionControl();
        this.addControl(this.positionControl);
      }
    });

    var QueryFactory = GeoPlatformClient__default.QueryFactory;
    var LayerService = GeoPlatformClient__default.LayerService;
    var HttpClient = GeoPlatformClient__default.JQueryHttpClient;
    var Config = GeoPlatformClient__default.Config;

    /**
     * @param {LayerService} layerService - optional, GeoPlatform Layer service to use to fetch the layer
     * @return {Promise} resolving OpenStreet Map GeoPlatform Layer
     */
    var OSM = {

        /**
         * @param {Object} layer - GeoPlatform Layer object
         * @return {boolean} true if is an OSM layer
         */
        test: function test(layer) {
            return layer && layer.resourceTypes && layer.resourceTypes.length && ~layer.resourceTypes.indexOf("http://www.geoplatform.gov/ont/openlayer/OSMLayer");
        },

        get: function get(layerService) {
            var query = QueryFactory().fields('*').resourceTypes("http://www.geoplatform.gov/ont/openlayer/OSMLayer");
            if (!layerService) layerService = new LayerService(Config.ualUrl, new HttpClient());
            return layerService.search(query).then(function (response) {
                return response.results.length ? response.results[0] : null;
            }).catch(function (e) {
                return Q.reject(e);
            });
        }

    };

    var url = GeoPlatformClient__default.Config.ualUrl;
    var baseLayerId = GeoPlatformClient__default.Config.defaultBaseLayerId;
    var LayerService$1 = GeoPlatformClient__default.LayerService;
    var HttpClient$1 = GeoPlatformClient__default.JQueryHttpClient;

    /**
     * If a default base layer is defined using the 'defaultBaseLayer'
     * environment value, fetch it. Otherwise, fetch the OpenStreet Map layer.
     * @param {LayerService} layerService - GeoPlatform Layer service to use to fetch the layer
     * @return {Promise} resolving GeoPlatform Layer object
     */
    function DefaultBaseLayer (layerService) {
        if (!GeoPlatformClient__default.Config.defaultBaseLayerId) return OSM.get();

        if (!layerService) layerService = new LayerService$1(url, new HttpClient$1());
        return layerService.get(baseLayerId).catch(function (e) {
            return Q.resolve(OSM.get());
        });
    }

    var ItemService = GeoPlatformClient__default.ItemService;
    var HttpClient$2 = GeoPlatformClient__default.JQueryHttpClient;
    var QueryFactory$1 = GeoPlatformClient__default.QueryFactory;
    var Config$1 = GeoPlatformClient__default.Config;

    var ogcExpr = /OGC.+\(([A-Z\-]+)\)/;
    var esriExpr = /Esri REST ([A-Za-z]+) Service/;
    var keyFn = function keyFn(expr, str) {
        var m = expr.exec(str);
        return m && m.length ? m[1] : null;
    };

    var types = {

        ESRI_FEATURE_SERVER: {
            "id": "48980c5bad0c8d4666b393874eb5279a",
            "uri": "http://www.geoplatform.gov/spec/esri-feature-rest",
            "type": "dct:Standard",
            "description": "Esri ArcGIS Feature Server REST API",
            "label": "Esri REST Feature Service"
        },

        ESRI_IMAGE_SERVER: {
            "id": "bcdf764e52064c84323f3f1baea7e245",
            "uri": "http://www.geoplatform.gov/spec/esri-image-rest",
            "type": "dct:Standard",
            "description": "Esri ArcGIS Image Server REST API",
            "label": "Esri REST Image Service"
        },

        ESRI_MAP_SERVER: {
            "id": "370cf6ca5d91c07b63329b8384fe76c7",
            "uri": "http://www.geoplatform.gov/spec/esri-map-rest",
            "type": "dct:Standard",
            "description": "Esri ArcGIS Map Server REST API",
            "label": "Esri REST Map Service"
        },

        ESRI_TILE_SERVER: {
            "id": "c75570ff2523b1a1631afe7ddac27beb",
            "uri": "http://www.geoplatform.gov/spec/esri-tile-rest",
            "type": "dct:Standard",
            "description": "Esri ArcGIS Tile Server REST API",
            "label": "Esri REST Tile Service"
        },

        KML: {
            "id": "c0b39ca2049ba2184472ff27408ffd7e",
            "uri": "http://opengis.net/spec/kml",
            "type": "dct:Standard",
            "description": "OGC Keyhole Markup Language (KML)",
            "label": "OGC Keyhole Markup Language (KML)"
        },

        CSW: {
            "id": "60de6a422475493b7901ae453d6f4562",
            "uri": "http://opengis.net/spec/csw",
            "type": "dct:Standard",
            "description": "OGC Web Catalog Service (CSW)",
            "label": "OGC Web Catalog Service (CSW)"
        },

        WCS: {
            "id": "a7e5a2d81a83d4eae9bf9138f24d0a32",
            "uri": "http://opengis.net/spec/wcs",
            "type": "dct:Standard",
            "description": "OGC Web Coverage Service (WCS)",
            "label": "OGC Web Coverage Service (WCS)"
        },

        WFS: {
            "id": "e70e43ed52f83634285a09e959734bff",
            "uri": "http://opengis.net/spec/wfs",
            "type": "dct:Standard",
            "description": "OGC Web Feature Service (WFS)",
            "label": "OGC Web Feature Service (WFS)"
        },

        WMS: {
            "id": "abed5a00c536fb2d7019092c37ed634c",
            "uri": "http://opengis.net/spec/wms",
            "type": "dct:Standard",
            "description": "OGC Web Map Service (WMS)",
            "label": "OGC Web Map Service (WMS)"
        },

        WMTS: {
            "id": "757858ae77cf8c602b39294c27632dd7",
            "uri": "http://opengis.net/spec/wmts",
            "type": "dct:Standard",
            "description": "OGC Web Map Tile Service (WMTS)",
            "label": "OGC Web Map Tile Service (WMTS)"
        },

        WMST: {
            "id": "faae5bff49b1144d500380cbc055c1e5",
            "uri": "http://www.geoplatform.gov/spec/ogc-wms-t",
            "type": "dct:Standard",
            "description": "OGC WMS support for temporal according to OGC Best Practice guidance",
            "label": "OGC WMS-T Service"
        },

        FEED: {
            "id": "8edc61870e534a1f23dc967753da3b72",
            "uri": "http://www.geoplatform.gov/spec/feed",
            "type": "dct:Standard",
            "description": "GeoPlatform GeoJSON Feed Service converts an Atom/RSS feed (including GeoRSS and CAP extensions) to GeoJSON",
            "label": "GeoPlatform GeoJSON Feed Service"
        },

        //
        //method to allow refreshing list later
        refresh: updateList
    };

    function updateList() {

        var url = Config$1.ualUrl;
        if (!url) {
            console.log("WARN : ServiceTypes - no GeoPlatform API URL configured, unable to load service types");
        } else {

            var query = QueryFactory$1().types('dct:Standard').resourceTypes('ServiceType').pageSize(50);

            new ItemService(url, new HttpClient$2()).search(query).then(function (data) {

                for (var i = 0; i < data.results.length; ++i) {

                    var type = data.results[i],
                        key = null,
                        label = type.label;

                    if (~label.indexOf("WMS-T")) {
                        key = 'WMST';
                        type.supported = true;
                    } else if (~label.indexOf('OGC')) {
                        key = keyFn(ogcExpr, label);
                        type.supported = 'WMS' === key || 'WMTS' === key;
                    } else if (~label.indexOf('Esri')) {
                        key = keyFn(esriExpr, label);
                        type.supported = true;
                        key = 'ESRI_' + key.toUpperCase() + '_SERVER';
                    } else if (~label.indexOf("Feed")) {
                        key = "FEED";
                        type.supported = true;
                    } else {
                        key = label;
                    }

                    types[key] = type;
                }
                // console.log(types);
            }).catch(function (error) {
                console.log("Error loading supported service types: " + error.message);
            });
        }
    }

    /* esri-leaflet - v2.1.2 - Thu Jan 04 2018 16:42:08 GMT-0800 (PST)
     * Copyright (c) 2018 Environmental Systems Research Institute, Inc.
     * Apache-2.0 */
    (function (global, factory) {
    	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('leaflet')) :
    	typeof define === 'function' && define.amd ? define(['exports', 'leaflet'], factory) :
    	(factory((global.L = global.L || {}, global.L.esri = global.L.esri || {}),global.L));
    }(undefined, function (exports,L$1$$1) {
    	var L$1__default = 'default' in L$1$$1 ? L$1$$1['default'] : L$1$$1;

    	var version = "2.1.2";

    	var cors = ((window.XMLHttpRequest && 'withCredentials' in new window.XMLHttpRequest()));
    	var pointerEvents = document.documentElement.style.pointerEvents === '';

    	var Support = {
    	  cors: cors,
    	  pointerEvents: pointerEvents
    	};

    	var options = {
    	  attributionWidthOffset: 55
    	};

    	var callbacks = 0;

    	function serialize (params) {
    	  var data = '';

    	  params.f = params.f || 'json';

    	  for (var key in params) {
    	    if (params.hasOwnProperty(key)) {
    	      var param = params[key];
    	      var type = Object.prototype.toString.call(param);
    	      var value;

    	      if (data.length) {
    	        data += '&';
    	      }

    	      if (type === '[object Array]') {
    	        value = (Object.prototype.toString.call(param[0]) === '[object Object]') ? JSON.stringify(param) : param.join(',');
    	      } else if (type === '[object Object]') {
    	        value = JSON.stringify(param);
    	      } else if (type === '[object Date]') {
    	        value = param.valueOf();
    	      } else {
    	        value = param;
    	      }

    	      data += encodeURIComponent(key) + '=' + encodeURIComponent(value);
    	    }
    	  }

    	  return data;
    	}

    	function createRequest (callback, context) {
    	  var httpRequest = new window.XMLHttpRequest();

    	  httpRequest.onerror = function (e) {
    	    httpRequest.onreadystatechange = L$1$$1.Util.falseFn;

    	    callback.call(context, {
    	      error: {
    	        code: 500,
    	        message: 'XMLHttpRequest error'
    	      }
    	    }, null);
    	  };

    	  httpRequest.onreadystatechange = function () {
    	    var response;
    	    var error;

    	    if (httpRequest.readyState === 4) {
    	      try {
    	        response = JSON.parse(httpRequest.responseText);
    	      } catch (e) {
    	        response = null;
    	        error = {
    	          code: 500,
    	          message: 'Could not parse response as JSON. This could also be caused by a CORS or XMLHttpRequest error.'
    	        };
    	      }

    	      if (!error && response.error) {
    	        error = response.error;
    	        response = null;
    	      }

    	      httpRequest.onerror = L$1$$1.Util.falseFn;

    	      callback.call(context, error, response);
    	    }
    	  };

    	  httpRequest.ontimeout = function () {
    	    this.onerror();
    	  };

    	  return httpRequest;
    	}

    	function xmlHttpPost (url, params, callback, context) {
    	  var httpRequest = createRequest(callback, context);
    	  httpRequest.open('POST', url);

    	  if (typeof context !== 'undefined' && context !== null) {
    	    if (typeof context.options !== 'undefined') {
    	      httpRequest.timeout = context.options.timeout;
    	    }
    	  }
    	  httpRequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    	  httpRequest.send(serialize(params));

    	  return httpRequest;
    	}

    	function xmlHttpGet (url, params, callback, context) {
    	  var httpRequest = createRequest(callback, context);
    	  httpRequest.open('GET', url + '?' + serialize(params), true);

    	  if (typeof context !== 'undefined' && context !== null) {
    	    if (typeof context.options !== 'undefined') {
    	      httpRequest.timeout = context.options.timeout;
    	    }
    	  }
    	  httpRequest.send(null);

    	  return httpRequest;
    	}

    	// AJAX handlers for CORS (modern browsers) or JSONP (older browsers)
    	function request (url, params, callback, context) {
    	  var paramString = serialize(params);
    	  var httpRequest = createRequest(callback, context);
    	  var requestLength = (url + '?' + paramString).length;

    	  // ie10/11 require the request be opened before a timeout is applied
    	  if (requestLength <= 2000 && Support.cors) {
    	    httpRequest.open('GET', url + '?' + paramString);
    	  } else if (requestLength > 2000 && Support.cors) {
    	    httpRequest.open('POST', url);
    	    httpRequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    	  }

    	  if (typeof context !== 'undefined' && context !== null) {
    	    if (typeof context.options !== 'undefined') {
    	      httpRequest.timeout = context.options.timeout;
    	    }
    	  }

    	  // request is less than 2000 characters and the browser supports CORS, make GET request with XMLHttpRequest
    	  if (requestLength <= 2000 && Support.cors) {
    	    httpRequest.send(null);

    	  // request is more than 2000 characters and the browser supports CORS, make POST request with XMLHttpRequest
    	  } else if (requestLength > 2000 && Support.cors) {
    	    httpRequest.send(paramString);

    	  // request is less  than 2000 characters and the browser does not support CORS, make a JSONP request
    	  } else if (requestLength <= 2000 && !Support.cors) {
    	    return jsonp(url, params, callback, context);

    	  // request is longer then 2000 characters and the browser does not support CORS, log a warning
    	  } else {
    	    warn('a request to ' + url + ' was longer then 2000 characters and this browser cannot make a cross-domain post request. Please use a proxy http://esri.github.io/esri-leaflet/api-reference/request.html');
    	    return;
    	  }

    	  return httpRequest;
    	}

    	function jsonp (url, params, callback, context) {
    	  window._EsriLeafletCallbacks = window._EsriLeafletCallbacks || {};
    	  var callbackId = 'c' + callbacks;
    	  params.callback = 'window._EsriLeafletCallbacks.' + callbackId;

    	  window._EsriLeafletCallbacks[callbackId] = function (response) {
    	    if (window._EsriLeafletCallbacks[callbackId] !== true) {
    	      var error;
    	      var responseType = Object.prototype.toString.call(response);

    	      if (!(responseType === '[object Object]' || responseType === '[object Array]')) {
    	        error = {
    	          error: {
    	            code: 500,
    	            message: 'Expected array or object as JSONP response'
    	          }
    	        };
    	        response = null;
    	      }

    	      if (!error && response.error) {
    	        error = response;
    	        response = null;
    	      }

    	      callback.call(context, error, response);
    	      window._EsriLeafletCallbacks[callbackId] = true;
    	    }
    	  };

    	  var script = L$1$$1.DomUtil.create('script', null, document.body);
    	  script.type = 'text/javascript';
    	  script.src = url + '?' + serialize(params);
    	  script.id = callbackId;
    	  L$1$$1.DomUtil.addClass(script, 'esri-leaflet-jsonp');

    	  callbacks++;

    	  return {
    	    id: callbackId,
    	    url: script.src,
    	    abort: function () {
    	      window._EsriLeafletCallbacks._callback[callbackId]({
    	        code: 0,
    	        message: 'Request aborted.'
    	      });
    	    }
    	  };
    	}

    	var get = ((Support.cors) ? xmlHttpGet : jsonp);
    	get.CORS = xmlHttpGet;
    	get.JSONP = jsonp;

    	// export the Request object to call the different handlers for debugging
    	var Request = {
    	  request: request,
    	  get: get,
    	  post: xmlHttpPost
    	};

    	/*
    	 * Copyright 2017 Esri
    	 *
    	 * Licensed under the Apache License, Version 2.0 (the "License");
    	 * you may not use this file except in compliance with the License.
    	 * You may obtain a copy of the License at
    	 *
    	 *     http://www.apache.org/licenses/LICENSE-2.0
    	 *
    	 * Unless required by applicable law or agreed to in writing, software
    	 * distributed under the License is distributed on an "AS IS" BASIS,
    	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    	 * See the License for the specific language governing permissions and
    	 * limitations under the License.
    	 */

    	// checks if 2 x,y points are equal
    	function pointsEqual (a, b) {
    	  for (var i = 0; i < a.length; i++) {
    	    if (a[i] !== b[i]) {
    	      return false;
    	    }
    	  }
    	  return true;
    	}

    	// checks if the first and last points of a ring are equal and closes the ring
    	function closeRing (coordinates) {
    	  if (!pointsEqual(coordinates[0], coordinates[coordinates.length - 1])) {
    	    coordinates.push(coordinates[0]);
    	  }
    	  return coordinates;
    	}

    	// determine if polygon ring coordinates are clockwise. clockwise signifies outer ring, counter-clockwise an inner ring
    	// or hole. this logic was found at http://stackoverflow.com/questions/1165647/how-to-determine-if-a-list-of-polygon-
    	// points-are-in-clockwise-order
    	function ringIsClockwise (ringToTest) {
    	  var total = 0;
    	  var i = 0;
    	  var rLength = ringToTest.length;
    	  var pt1 = ringToTest[i];
    	  var pt2;
    	  for (i; i < rLength - 1; i++) {
    	    pt2 = ringToTest[i + 1];
    	    total += (pt2[0] - pt1[0]) * (pt2[1] + pt1[1]);
    	    pt1 = pt2;
    	  }
    	  return (total >= 0);
    	}

    	// ported from terraformer.js https://github.com/Esri/Terraformer/blob/master/terraformer.js#L504-L519
    	function vertexIntersectsVertex (a1, a2, b1, b2) {
    	  var uaT = ((b2[0] - b1[0]) * (a1[1] - b1[1])) - ((b2[1] - b1[1]) * (a1[0] - b1[0]));
    	  var ubT = ((a2[0] - a1[0]) * (a1[1] - b1[1])) - ((a2[1] - a1[1]) * (a1[0] - b1[0]));
    	  var uB = ((b2[1] - b1[1]) * (a2[0] - a1[0])) - ((b2[0] - b1[0]) * (a2[1] - a1[1]));

    	  if (uB !== 0) {
    	    var ua = uaT / uB;
    	    var ub = ubT / uB;

    	    if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    	      return true;
    	    }
    	  }

    	  return false;
    	}

    	// ported from terraformer.js https://github.com/Esri/Terraformer/blob/master/terraformer.js#L521-L531
    	function arrayIntersectsArray (a, b) {
    	  for (var i = 0; i < a.length - 1; i++) {
    	    for (var j = 0; j < b.length - 1; j++) {
    	      if (vertexIntersectsVertex(a[i], a[i + 1], b[j], b[j + 1])) {
    	        return true;
    	      }
    	    }
    	  }

    	  return false;
    	}

    	// ported from terraformer.js https://github.com/Esri/Terraformer/blob/master/terraformer.js#L470-L480
    	function coordinatesContainPoint (coordinates, point) {
    	  var contains = false;
    	  for (var i = -1, l = coordinates.length, j = l - 1; ++i < l; j = i) {
    	    if (((coordinates[i][1] <= point[1] && point[1] < coordinates[j][1]) ||
    	         (coordinates[j][1] <= point[1] && point[1] < coordinates[i][1])) &&
    	        (point[0] < (((coordinates[j][0] - coordinates[i][0]) * (point[1] - coordinates[i][1])) / (coordinates[j][1] - coordinates[i][1])) + coordinates[i][0])) {
    	      contains = !contains;
    	    }
    	  }
    	  return contains;
    	}

    	// ported from terraformer-arcgis-parser.js https://github.com/Esri/terraformer-arcgis-parser/blob/master/terraformer-arcgis-parser.js#L106-L113
    	function coordinatesContainCoordinates (outer, inner) {
    	  var intersects = arrayIntersectsArray(outer, inner);
    	  var contains = coordinatesContainPoint(outer, inner[0]);
    	  if (!intersects && contains) {
    	    return true;
    	  }
    	  return false;
    	}

    	// do any polygons in this array contain any other polygons in this array?
    	// used for checking for holes in arcgis rings
    	// ported from terraformer-arcgis-parser.js https://github.com/Esri/terraformer-arcgis-parser/blob/master/terraformer-arcgis-parser.js#L117-L172
    	function convertRingsToGeoJSON (rings) {
    	  var outerRings = [];
    	  var holes = [];
    	  var x; // iterator
    	  var outerRing; // current outer ring being evaluated
    	  var hole; // current hole being evaluated

    	  // for each ring
    	  for (var r = 0; r < rings.length; r++) {
    	    var ring = closeRing(rings[r].slice(0));
    	    if (ring.length < 4) {
    	      continue;
    	    }
    	    // is this ring an outer ring? is it clockwise?
    	    if (ringIsClockwise(ring)) {
    	      var polygon = [ ring ];
    	      outerRings.push(polygon); // push to outer rings
    	    } else {
    	      holes.push(ring); // counterclockwise push to holes
    	    }
    	  }

    	  var uncontainedHoles = [];

    	  // while there are holes left...
    	  while (holes.length) {
    	    // pop a hole off out stack
    	    hole = holes.pop();

    	    // loop over all outer rings and see if they contain our hole.
    	    var contained = false;
    	    for (x = outerRings.length - 1; x >= 0; x--) {
    	      outerRing = outerRings[x][0];
    	      if (coordinatesContainCoordinates(outerRing, hole)) {
    	        // the hole is contained push it into our polygon
    	        outerRings[x].push(hole);
    	        contained = true;
    	        break;
    	      }
    	    }

    	    // ring is not contained in any outer ring
    	    // sometimes this happens https://github.com/Esri/esri-leaflet/issues/320
    	    if (!contained) {
    	      uncontainedHoles.push(hole);
    	    }
    	  }

    	  // if we couldn't match any holes using contains we can try intersects...
    	  while (uncontainedHoles.length) {
    	    // pop a hole off out stack
    	    hole = uncontainedHoles.pop();

    	    // loop over all outer rings and see if any intersect our hole.
    	    var intersects = false;

    	    for (x = outerRings.length - 1; x >= 0; x--) {
    	      outerRing = outerRings[x][0];
    	      if (arrayIntersectsArray(outerRing, hole)) {
    	        // the hole is contained push it into our polygon
    	        outerRings[x].push(hole);
    	        intersects = true;
    	        break;
    	      }
    	    }

    	    if (!intersects) {
    	      outerRings.push([hole.reverse()]);
    	    }
    	  }

    	  if (outerRings.length === 1) {
    	    return {
    	      type: 'Polygon',
    	      coordinates: outerRings[0]
    	    };
    	  } else {
    	    return {
    	      type: 'MultiPolygon',
    	      coordinates: outerRings
    	    };
    	  }
    	}

    	// This function ensures that rings are oriented in the right directions
    	// outer rings are clockwise, holes are counterclockwise
    	// used for converting GeoJSON Polygons to ArcGIS Polygons
    	function orientRings (poly) {
    	  var output = [];
    	  var polygon = poly.slice(0);
    	  var outerRing = closeRing(polygon.shift().slice(0));
    	  if (outerRing.length >= 4) {
    	    if (!ringIsClockwise(outerRing)) {
    	      outerRing.reverse();
    	    }

    	    output.push(outerRing);

    	    for (var i = 0; i < polygon.length; i++) {
    	      var hole = closeRing(polygon[i].slice(0));
    	      if (hole.length >= 4) {
    	        if (ringIsClockwise(hole)) {
    	          hole.reverse();
    	        }
    	        output.push(hole);
    	      }
    	    }
    	  }

    	  return output;
    	}

    	// This function flattens holes in multipolygons to one array of polygons
    	// used for converting GeoJSON Polygons to ArcGIS Polygons
    	function flattenMultiPolygonRings (rings) {
    	  var output = [];
    	  for (var i = 0; i < rings.length; i++) {
    	    var polygon = orientRings(rings[i]);
    	    for (var x = polygon.length - 1; x >= 0; x--) {
    	      var ring = polygon[x].slice(0);
    	      output.push(ring);
    	    }
    	  }
    	  return output;
    	}

    	// shallow object clone for feature properties and attributes
    	// from http://jsperf.com/cloning-an-object/2
    	function shallowClone (obj) {
    	  var target = {};
    	  for (var i in obj) {
    	    if (obj.hasOwnProperty(i)) {
    	      target[i] = obj[i];
    	    }
    	  }
    	  return target;
    	}

    	function arcgisToGeoJSON$1 (arcgis, idAttribute) {
    	  var geojson = {};

    	  if (typeof arcgis.x === 'number' && typeof arcgis.y === 'number') {
    	    geojson.type = 'Point';
    	    geojson.coordinates = [arcgis.x, arcgis.y];
    	    if (typeof arcgis.z === 'number') {
    	      geojson.coordinates.push(arcgis.z);
    	    }
    	  }

    	  if (arcgis.points) {
    	    geojson.type = 'MultiPoint';
    	    geojson.coordinates = arcgis.points.slice(0);
    	  }

    	  if (arcgis.paths) {
    	    if (arcgis.paths.length === 1) {
    	      geojson.type = 'LineString';
    	      geojson.coordinates = arcgis.paths[0].slice(0);
    	    } else {
    	      geojson.type = 'MultiLineString';
    	      geojson.coordinates = arcgis.paths.slice(0);
    	    }
    	  }

    	  if (arcgis.rings) {
    	    geojson = convertRingsToGeoJSON(arcgis.rings.slice(0));
    	  }

    	  if (arcgis.geometry || arcgis.attributes) {
    	    geojson.type = 'Feature';
    	    geojson.geometry = (arcgis.geometry) ? arcgisToGeoJSON$1(arcgis.geometry) : null;
    	    geojson.properties = (arcgis.attributes) ? shallowClone(arcgis.attributes) : null;
    	    if (arcgis.attributes) {
    	      geojson.id = arcgis.attributes[idAttribute] || arcgis.attributes.OBJECTID || arcgis.attributes.FID;
    	    }
    	  }

    	  // if no valid geometry was encountered
    	  if (JSON.stringify(geojson.geometry) === JSON.stringify({})) {
    	    geojson.geometry = null;
    	  }

    	  return geojson;
    	}

    	function geojsonToArcGIS$1 (geojson, idAttribute) {
    	  idAttribute = idAttribute || 'OBJECTID';
    	  var spatialReference = { wkid: 4326 };
    	  var result = {};
    	  var i;

    	  switch (geojson.type) {
    	    case 'Point':
    	      result.x = geojson.coordinates[0];
    	      result.y = geojson.coordinates[1];
    	      result.spatialReference = spatialReference;
    	      break;
    	    case 'MultiPoint':
    	      result.points = geojson.coordinates.slice(0);
    	      result.spatialReference = spatialReference;
    	      break;
    	    case 'LineString':
    	      result.paths = [geojson.coordinates.slice(0)];
    	      result.spatialReference = spatialReference;
    	      break;
    	    case 'MultiLineString':
    	      result.paths = geojson.coordinates.slice(0);
    	      result.spatialReference = spatialReference;
    	      break;
    	    case 'Polygon':
    	      result.rings = orientRings(geojson.coordinates.slice(0));
    	      result.spatialReference = spatialReference;
    	      break;
    	    case 'MultiPolygon':
    	      result.rings = flattenMultiPolygonRings(geojson.coordinates.slice(0));
    	      result.spatialReference = spatialReference;
    	      break;
    	    case 'Feature':
    	      if (geojson.geometry) {
    	        result.geometry = geojsonToArcGIS$1(geojson.geometry, idAttribute);
    	      }
    	      result.attributes = (geojson.properties) ? shallowClone(geojson.properties) : {};
    	      if (geojson.id) {
    	        result.attributes[idAttribute] = geojson.id;
    	      }
    	      break;
    	    case 'FeatureCollection':
    	      result = [];
    	      for (i = 0; i < geojson.features.length; i++) {
    	        result.push(geojsonToArcGIS$1(geojson.features[i], idAttribute));
    	      }
    	      break;
    	    case 'GeometryCollection':
    	      result = [];
    	      for (i = 0; i < geojson.geometries.length; i++) {
    	        result.push(geojsonToArcGIS$1(geojson.geometries[i], idAttribute));
    	      }
    	      break;
    	  }

    	  return result;
    	}

    	function geojsonToArcGIS (geojson, idAttr) {
    	  return geojsonToArcGIS$1(geojson, idAttr);
    	}

    	function arcgisToGeoJSON (arcgis, idAttr) {
    	  return arcgisToGeoJSON$1(arcgis, idAttr);
    	}

    	// convert an extent (ArcGIS) to LatLngBounds (Leaflet)
    	function extentToBounds (extent) {
    	  // "NaN" coordinates from ArcGIS Server indicate a null geometry
    	  if (extent.xmin !== 'NaN' && extent.ymin !== 'NaN' && extent.xmax !== 'NaN' && extent.ymax !== 'NaN') {
    	    var sw = L$1$$1.latLng(extent.ymin, extent.xmin);
    	    var ne = L$1$$1.latLng(extent.ymax, extent.xmax);
    	    return L$1$$1.latLngBounds(sw, ne);
    	  } else {
    	    return null;
    	  }
    	}

    	// convert an LatLngBounds (Leaflet) to extent (ArcGIS)
    	function boundsToExtent (bounds) {
    	  bounds = L$1$$1.latLngBounds(bounds);
    	  return {
    	    'xmin': bounds.getSouthWest().lng,
    	    'ymin': bounds.getSouthWest().lat,
    	    'xmax': bounds.getNorthEast().lng,
    	    'ymax': bounds.getNorthEast().lat,
    	    'spatialReference': {
    	      'wkid': 4326
    	    }
    	  };
    	}

    	var knownFieldNames = /^(OBJECTID|FID|OID|ID)$/i;

    	// Attempts to find the ID Field from response
    	function _findIdAttributeFromResponse (response) {
    	  var result;

    	  if (response.objectIdFieldName) {
    	    // Find Id Field directly
    	    result = response.objectIdFieldName;
    	  } else if (response.fields) {
    	    // Find ID Field based on field type
    	    for (var j = 0; j <= response.fields.length - 1; j++) {
    	      if (response.fields[j].type === 'esriFieldTypeOID') {
    	        result = response.fields[j].name;
    	        break;
    	      }
    	    }
    	    if (!result) {
    	      // If no field was marked as being the esriFieldTypeOID try well known field names
    	      for (j = 0; j <= response.fields.length - 1; j++) {
    	        if (response.fields[j].name.match(knownFieldNames)) {
    	          result = response.fields[j].name;
    	          break;
    	        }
    	      }
    	    }
    	  }
    	  return result;
    	}

    	// This is the 'last' resort, find the Id field from the specified feature
    	function _findIdAttributeFromFeature (feature) {
    	  for (var key in feature.attributes) {
    	    if (key.match(knownFieldNames)) {
    	      return key;
    	    }
    	  }
    	}

    	function responseToFeatureCollection (response, idAttribute) {
    	  var objectIdField;
    	  var features = response.features || response.results;
    	  var count = features.length;

    	  if (idAttribute) {
    	    objectIdField = idAttribute;
    	  } else {
    	    objectIdField = _findIdAttributeFromResponse(response);
    	  }

    	  var featureCollection = {
    	    type: 'FeatureCollection',
    	    features: []
    	  };

    	  if (count) {
    	    for (var i = features.length - 1; i >= 0; i--) {
    	      var feature = arcgisToGeoJSON(features[i], objectIdField || _findIdAttributeFromFeature(features[i]));
    	      featureCollection.features.push(feature);
    	    }
    	  }

    	  return featureCollection;
    	}

    	  // trim url whitespace and add a trailing slash if needed
    	function cleanUrl (url) {
    	  // trim leading and trailing spaces, but not spaces inside the url
    	  url = L$1$$1.Util.trim(url);

    	  // add a trailing slash to the url if the user omitted it
    	  if (url[url.length - 1] !== '/') {
    	    url += '/';
    	  }

    	  return url;
    	}

    	/* Extract url params if any and store them in requestParams attribute.
    	   Return the options params updated */
    	function getUrlParams (options) {
    	  if (options.url.indexOf('?') !== -1) {
    	    options.requestParams = options.requestParams || {};
    	    var queryString = options.url.substring(options.url.indexOf('?') + 1);
    	    options.url = options.url.split('?')[0];
    	    options.requestParams = JSON.parse('{"' + decodeURI(queryString).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}');
    	  }
    	  options.url = cleanUrl(options.url.split('?')[0]);
    	  return options;
    	}

    	function isArcgisOnline (url) {
    	  /* hosted feature services support geojson as an output format
    	  utility.arcgis.com services are proxied from a variety of ArcGIS Server vintages, and may not */
    	  return (/^(?!.*utility\.arcgis\.com).*\.arcgis\.com.*FeatureServer/i).test(url);
    	}

    	function geojsonTypeToArcGIS (geoJsonType) {
    	  var arcgisGeometryType;
    	  switch (geoJsonType) {
    	    case 'Point':
    	      arcgisGeometryType = 'esriGeometryPoint';
    	      break;
    	    case 'MultiPoint':
    	      arcgisGeometryType = 'esriGeometryMultipoint';
    	      break;
    	    case 'LineString':
    	      arcgisGeometryType = 'esriGeometryPolyline';
    	      break;
    	    case 'MultiLineString':
    	      arcgisGeometryType = 'esriGeometryPolyline';
    	      break;
    	    case 'Polygon':
    	      arcgisGeometryType = 'esriGeometryPolygon';
    	      break;
    	    case 'MultiPolygon':
    	      arcgisGeometryType = 'esriGeometryPolygon';
    	      break;
    	  }

    	  return arcgisGeometryType;
    	}

    	function warn () {
    	  if (console && console.warn) {
    	    console.warn.apply(console, arguments);
    	  }
    	}

    	function calcAttributionWidth (map) {
    	  // either crop at 55px or user defined buffer
    	  return (map.getSize().x - options.attributionWidthOffset) + 'px';
    	}

    	function setEsriAttribution (map) {
    	  if (map.attributionControl && !map.attributionControl._esriAttributionAdded) {
    	    map.attributionControl.setPrefix('<a href="http://leafletjs.com" title="A JS library for interactive maps">Leaflet</a> | Powered by <a href="https://www.esri.com">Esri</a>');

    	    var hoverAttributionStyle = document.createElement('style');
    	    hoverAttributionStyle.type = 'text/css';
    	    hoverAttributionStyle.innerHTML = '.esri-truncated-attribution:hover {' +
    	      'white-space: normal;' +
    	    '}';

    	    document.getElementsByTagName('head')[0].appendChild(hoverAttributionStyle);
    	    L$1$$1.DomUtil.addClass(map.attributionControl._container, 'esri-truncated-attribution:hover');

    	    // define a new css class in JS to trim attribution into a single line
    	    var attributionStyle = document.createElement('style');
    	    attributionStyle.type = 'text/css';
    	    attributionStyle.innerHTML = '.esri-truncated-attribution {' +
    	      'vertical-align: -3px;' +
    	      'white-space: nowrap;' +
    	      'overflow: hidden;' +
    	      'text-overflow: ellipsis;' +
    	      'display: inline-block;' +
    	      'transition: 0s white-space;' +
    	      'transition-delay: 1s;' +
    	      'max-width: ' + calcAttributionWidth(map) + ';' +
    	    '}';

    	    document.getElementsByTagName('head')[0].appendChild(attributionStyle);
    	    L$1$$1.DomUtil.addClass(map.attributionControl._container, 'esri-truncated-attribution');

    	    // update the width used to truncate when the map itself is resized
    	    map.on('resize', function (e) {
    	      map.attributionControl._container.style.maxWidth = calcAttributionWidth(e.target);
    	    });

    	    // remove injected scripts and style tags
    	    map.on('unload', function () {
    	      hoverAttributionStyle.parentNode.removeChild(hoverAttributionStyle);
    	      attributionStyle.parentNode.removeChild(attributionStyle);
    	      var nodeList = document.querySelectorAll('.esri-leaflet-jsonp');
    	      for (var i = 0; i < nodeList.length; i++) {
    	        nodeList.item(i).parentNode.removeChild(nodeList.item(i));
    	      }
    	    });

    	    map.attributionControl._esriAttributionAdded = true;
    	  }
    	}

    	function _setGeometry (geometry) {
    	  var params = {
    	    geometry: null,
    	    geometryType: null
    	  };

    	  // convert bounds to extent and finish
    	  if (geometry instanceof L$1$$1.LatLngBounds) {
    	    // set geometry + geometryType
    	    params.geometry = boundsToExtent(geometry);
    	    params.geometryType = 'esriGeometryEnvelope';
    	    return params;
    	  }

    	  // convert L.Marker > L.LatLng
    	  if (geometry.getLatLng) {
    	    geometry = geometry.getLatLng();
    	  }

    	  // convert L.LatLng to a geojson point and continue;
    	  if (geometry instanceof L$1$$1.LatLng) {
    	    geometry = {
    	      type: 'Point',
    	      coordinates: [geometry.lng, geometry.lat]
    	    };
    	  }

    	  // handle L.GeoJSON, pull out the first geometry
    	  if (geometry instanceof L$1$$1.GeoJSON) {
    	    // reassign geometry to the GeoJSON value  (we are assuming that only one feature is present)
    	    geometry = geometry.getLayers()[0].feature.geometry;
    	    params.geometry = geojsonToArcGIS(geometry);
    	    params.geometryType = geojsonTypeToArcGIS(geometry.type);
    	  }

    	  // Handle L.Polyline and L.Polygon
    	  if (geometry.toGeoJSON) {
    	    geometry = geometry.toGeoJSON();
    	  }

    	  // handle GeoJSON feature by pulling out the geometry
    	  if (geometry.type === 'Feature') {
    	    // get the geometry of the geojson feature
    	    geometry = geometry.geometry;
    	  }

    	  // confirm that our GeoJSON is a point, line or polygon
    	  if (geometry.type === 'Point' || geometry.type === 'LineString' || geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
    	    params.geometry = geojsonToArcGIS(geometry);
    	    params.geometryType = geojsonTypeToArcGIS(geometry.type);
    	    return params;
    	  }

    	  // warn the user if we havn't found an appropriate object
    	  warn('invalid geometry passed to spatial query. Should be L.LatLng, L.LatLngBounds, L.Marker or a GeoJSON Point, Line, Polygon or MultiPolygon object');

    	  return;
    	}

    	function _getAttributionData (url, map) {
    	  jsonp(url, {}, L$1$$1.Util.bind(function (error, attributions) {
    	    if (error) { return; }
    	    map._esriAttributions = [];
    	    for (var c = 0; c < attributions.contributors.length; c++) {
    	      var contributor = attributions.contributors[c];

    	      for (var i = 0; i < contributor.coverageAreas.length; i++) {
    	        var coverageArea = contributor.coverageAreas[i];
    	        var southWest = L$1$$1.latLng(coverageArea.bbox[0], coverageArea.bbox[1]);
    	        var northEast = L$1$$1.latLng(coverageArea.bbox[2], coverageArea.bbox[3]);
    	        map._esriAttributions.push({
    	          attribution: contributor.attribution,
    	          score: coverageArea.score,
    	          bounds: L$1$$1.latLngBounds(southWest, northEast),
    	          minZoom: coverageArea.zoomMin,
    	          maxZoom: coverageArea.zoomMax
    	        });
    	      }
    	    }

    	    map._esriAttributions.sort(function (a, b) {
    	      return b.score - a.score;
    	    });

    	    // pass the same argument as the map's 'moveend' event
    	    var obj = { target: map };
    	    _updateMapAttribution(obj);
    	  }, this));
    	}

    	function _updateMapAttribution (evt) {
    	  var map = evt.target;
    	  var oldAttributions = map._esriAttributions;

    	  if (map && map.attributionControl && oldAttributions) {
    	    var newAttributions = '';
    	    var bounds = map.getBounds();
    	    var wrappedBounds = L$1$$1.latLngBounds(
    	      bounds.getSouthWest().wrap(),
    	      bounds.getNorthEast().wrap()
    	    );
    	    var zoom = map.getZoom();

    	    for (var i = 0; i < oldAttributions.length; i++) {
    	      var attribution = oldAttributions[i];
    	      var text = attribution.attribution;

    	      if (!newAttributions.match(text) && attribution.bounds.intersects(wrappedBounds) && zoom >= attribution.minZoom && zoom <= attribution.maxZoom) {
    	        newAttributions += (', ' + text);
    	      }
    	    }

    	    newAttributions = newAttributions.substr(2);
    	    var attributionElement = map.attributionControl._container.querySelector('.esri-dynamic-attribution');

    	    attributionElement.innerHTML = newAttributions;
    	    attributionElement.style.maxWidth = calcAttributionWidth(map);

    	    map.fire('attributionupdated', {
    	      attribution: newAttributions
    	    });
    	  }
    	}

    	var EsriUtil = {
    	  warn: warn,
    	  cleanUrl: cleanUrl,
    	  getUrlParams: getUrlParams,
    	  isArcgisOnline: isArcgisOnline,
    	  geojsonTypeToArcGIS: geojsonTypeToArcGIS,
    	  responseToFeatureCollection: responseToFeatureCollection,
    	  geojsonToArcGIS: geojsonToArcGIS,
    	  arcgisToGeoJSON: arcgisToGeoJSON,
    	  boundsToExtent: boundsToExtent,
    	  extentToBounds: extentToBounds,
    	  calcAttributionWidth: calcAttributionWidth,
    	  setEsriAttribution: setEsriAttribution,
    	  _setGeometry: _setGeometry,
    	  _getAttributionData: _getAttributionData,
    	  _updateMapAttribution: _updateMapAttribution,
    	  _findIdAttributeFromFeature: _findIdAttributeFromFeature,
    	  _findIdAttributeFromResponse: _findIdAttributeFromResponse
    	};

    	var Task = L$1$$1.Class.extend({

    	  options: {
    	    proxy: false,
    	    useCors: cors
    	  },

    	  // Generate a method for each methodName:paramName in the setters for this task.
    	  generateSetter: function (param, context) {
    	    return L$1$$1.Util.bind(function (value) {
    	      this.params[param] = value;
    	      return this;
    	    }, context);
    	  },

    	  initialize: function (endpoint) {
    	    // endpoint can be either a url (and options) for an ArcGIS Rest Service or an instance of EsriLeaflet.Service
    	    if (endpoint.request && endpoint.options) {
    	      this._service = endpoint;
    	      L$1$$1.Util.setOptions(this, endpoint.options);
    	    } else {
    	      L$1$$1.Util.setOptions(this, endpoint);
    	      this.options.url = cleanUrl(endpoint.url);
    	    }

    	    // clone default params into this object
    	    this.params = L$1$$1.Util.extend({}, this.params || {});

    	    // generate setter methods based on the setters object implimented a child class
    	    if (this.setters) {
    	      for (var setter in this.setters) {
    	        var param = this.setters[setter];
    	        this[setter] = this.generateSetter(param, this);
    	      }
    	    }
    	  },

    	  token: function (token) {
    	    if (this._service) {
    	      this._service.authenticate(token);
    	    } else {
    	      this.params.token = token;
    	    }
    	    return this;
    	  },

    	  // ArcGIS Server Find/Identify 10.5+
    	  format: function (boolean) {
    	    // use double negative to expose a more intuitive positive method name
    	    this.params.returnUnformattedValues = !boolean;
    	    return this;
    	  },

    	  request: function (callback, context) {
    	    if (this.options.requestParams) {
    	      L.extend(this.params, this.options.requestParams);
    	    }
    	    if (this._service) {
    	      return this._service.request(this.path, this.params, callback, context);
    	    }

    	    return this._request('request', this.path, this.params, callback, context);
    	  },

    	  _request: function (method, path, params, callback, context) {
    	    var url = (this.options.proxy) ? this.options.proxy + '?' + this.options.url + path : this.options.url + path;

    	    if ((method === 'get' || method === 'request') && !this.options.useCors) {
    	      return Request.get.JSONP(url, params, callback, context);
    	    }

    	    return Request[method](url, params, callback, context);
    	  }
    	});

    	function task (options) {
    	  options = getUrlParams(options);
    	  return new Task(options);
    	}

    	var Query = Task.extend({
    	  setters: {
    	    'offset': 'resultOffset',
    	    'limit': 'resultRecordCount',
    	    'fields': 'outFields',
    	    'precision': 'geometryPrecision',
    	    'featureIds': 'objectIds',
    	    'returnGeometry': 'returnGeometry',
    	    'returnM': 'returnM',
    	    'transform': 'datumTransformation',
    	    'token': 'token'
    	  },

    	  path: 'query',

    	  params: {
    	    returnGeometry: true,
    	    where: '1=1',
    	    outSr: 4326,
    	    outFields: '*'
    	  },

    	  // Returns a feature if its shape is wholly contained within the search geometry. Valid for all shape type combinations.
    	  within: function (geometry) {
    	    this._setGeometryParams(geometry);
    	    this.params.spatialRel = 'esriSpatialRelContains'; // to the REST api this reads geometry **contains** layer
    	    return this;
    	  },

    	  // Returns a feature if any spatial relationship is found. Applies to all shape type combinations.
    	  intersects: function (geometry) {
    	    this._setGeometryParams(geometry);
    	    this.params.spatialRel = 'esriSpatialRelIntersects';
    	    return this;
    	  },

    	  // Returns a feature if its shape wholly contains the search geometry. Valid for all shape type combinations.
    	  contains: function (geometry) {
    	    this._setGeometryParams(geometry);
    	    this.params.spatialRel = 'esriSpatialRelWithin'; // to the REST api this reads geometry **within** layer
    	    return this;
    	  },

    	  // Returns a feature if the intersection of the interiors of the two shapes is not empty and has a lower dimension than the maximum dimension of the two shapes. Two lines that share an endpoint in common do not cross. Valid for Line/Line, Line/Area, Multi-point/Area, and Multi-point/Line shape type combinations.
    	  crosses: function (geometry) {
    	    this._setGeometryParams(geometry);
    	    this.params.spatialRel = 'esriSpatialRelCrosses';
    	    return this;
    	  },

    	  // Returns a feature if the two shapes share a common boundary. However, the intersection of the interiors of the two shapes must be empty. In the Point/Line case, the point may touch an endpoint only of the line. Applies to all combinations except Point/Point.
    	  touches: function (geometry) {
    	    this._setGeometryParams(geometry);
    	    this.params.spatialRel = 'esriSpatialRelTouches';
    	    return this;
    	  },

    	  // Returns a feature if the intersection of the two shapes results in an object of the same dimension, but different from both of the shapes. Applies to Area/Area, Line/Line, and Multi-point/Multi-point shape type combinations.
    	  overlaps: function (geometry) {
    	    this._setGeometryParams(geometry);
    	    this.params.spatialRel = 'esriSpatialRelOverlaps';
    	    return this;
    	  },

    	  // Returns a feature if the envelope of the two shapes intersects.
    	  bboxIntersects: function (geometry) {
    	    this._setGeometryParams(geometry);
    	    this.params.spatialRel = 'esriSpatialRelEnvelopeIntersects';
    	    return this;
    	  },

    	  // if someone can help decipher the ArcObjects explanation and translate to plain speak, we should mention this method in the doc
    	  indexIntersects: function (geometry) {
    	    this._setGeometryParams(geometry);
    	    this.params.spatialRel = 'esriSpatialRelIndexIntersects'; // Returns a feature if the envelope of the query geometry intersects the index entry for the target geometry
    	    return this;
    	  },

    	  // only valid for Feature Services running on ArcGIS Server 10.3+ or ArcGIS Online
    	  nearby: function (latlng, radius) {
    	    latlng = L$1$$1.latLng(latlng);
    	    this.params.geometry = [latlng.lng, latlng.lat];
    	    this.params.geometryType = 'esriGeometryPoint';
    	    this.params.spatialRel = 'esriSpatialRelIntersects';
    	    this.params.units = 'esriSRUnit_Meter';
    	    this.params.distance = radius;
    	    this.params.inSr = 4326;
    	    return this;
    	  },

    	  where: function (string) {
    	    // instead of converting double-quotes to single quotes, pass as is, and provide a more informative message if a 400 is encountered
    	    this.params.where = string;
    	    return this;
    	  },

    	  between: function (start, end) {
    	    this.params.time = [start.valueOf(), end.valueOf()];
    	    return this;
    	  },

    	  simplify: function (map, factor) {
    	    var mapWidth = Math.abs(map.getBounds().getWest() - map.getBounds().getEast());
    	    this.params.maxAllowableOffset = (mapWidth / map.getSize().y) * factor;
    	    return this;
    	  },

    	  orderBy: function (fieldName, order) {
    	    order = order || 'ASC';
    	    this.params.orderByFields = (this.params.orderByFields) ? this.params.orderByFields + ',' : '';
    	    this.params.orderByFields += ([fieldName, order]).join(' ');
    	    return this;
    	  },

    	  run: function (callback, context) {
    	    this._cleanParams();

    	    // services hosted on ArcGIS Online and ArcGIS Server 10.3.1+ support requesting geojson directly
    	    if (this.options.isModern || isArcgisOnline(this.options.url)) {
    	      this.params.f = 'geojson';

    	      return this.request(function (error, response) {
    	        this._trapSQLerrors(error);
    	        callback.call(context, error, response, response);
    	      }, this);

    	    // otherwise convert it in the callback then pass it on
    	    } else {
    	      return this.request(function (error, response) {
    	        this._trapSQLerrors(error);
    	        callback.call(context, error, (response && responseToFeatureCollection(response)), response);
    	      }, this);
    	    }
    	  },

    	  count: function (callback, context) {
    	    this._cleanParams();
    	    this.params.returnCountOnly = true;
    	    return this.request(function (error, response) {
    	      callback.call(this, error, (response && response.count), response);
    	    }, context);
    	  },

    	  ids: function (callback, context) {
    	    this._cleanParams();
    	    this.params.returnIdsOnly = true;
    	    return this.request(function (error, response) {
    	      callback.call(this, error, (response && response.objectIds), response);
    	    }, context);
    	  },

    	  // only valid for Feature Services running on ArcGIS Server 10.3+ or ArcGIS Online
    	  bounds: function (callback, context) {
    	    this._cleanParams();
    	    this.params.returnExtentOnly = true;
    	    return this.request(function (error, response) {
    	      if (response && response.extent && extentToBounds(response.extent)) {
    	        callback.call(context, error, extentToBounds(response.extent), response);
    	      } else {
    	        error = {
    	          message: 'Invalid Bounds'
    	        };
    	        callback.call(context, error, null, response);
    	      }
    	    }, context);
    	  },

    	  distinct: function () {
    	    // geometry must be omitted for queries requesting distinct values
    	    this.params.returnGeometry = false;
    	    this.params.returnDistinctValues = true;
    	    return this;
    	  },

    	  // only valid for image services
    	  pixelSize: function (rawPoint) {
    	    var castPoint = L$1$$1.point(rawPoint);
    	    this.params.pixelSize = [castPoint.x, castPoint.y];
    	    return this;
    	  },

    	  // only valid for map services
    	  layer: function (layer) {
    	    this.path = layer + '/query';
    	    return this;
    	  },

    	  _trapSQLerrors: function (error) {
    	    if (error) {
    	      if (error.code === '400') {
    	        warn('one common syntax error in query requests is encasing string values in double quotes instead of single quotes');
    	      }
    	    }
    	  },

    	  _cleanParams: function () {
    	    delete this.params.returnIdsOnly;
    	    delete this.params.returnExtentOnly;
    	    delete this.params.returnCountOnly;
    	  },

    	  _setGeometryParams: function (geometry) {
    	    this.params.inSr = 4326;
    	    var converted = _setGeometry(geometry);
    	    this.params.geometry = converted.geometry;
    	    this.params.geometryType = converted.geometryType;
    	  }

    	});

    	function query (options) {
    	  return new Query(options);
    	}

    	var Find = Task.extend({
    	  setters: {
    	    // method name > param name
    	    'contains': 'contains',
    	    'text': 'searchText',
    	    'fields': 'searchFields', // denote an array or single string
    	    'spatialReference': 'sr',
    	    'sr': 'sr',
    	    'layers': 'layers',
    	    'returnGeometry': 'returnGeometry',
    	    'maxAllowableOffset': 'maxAllowableOffset',
    	    'precision': 'geometryPrecision',
    	    'dynamicLayers': 'dynamicLayers',
    	    'returnZ': 'returnZ',
    	    'returnM': 'returnM',
    	    'gdbVersion': 'gdbVersion',
    	    // skipped implementing this (for now) because the REST service implementation isnt consistent between operations
    	    // 'transform': 'datumTransformations',
    	    'token': 'token'
    	  },

    	  path: 'find',

    	  params: {
    	    sr: 4326,
    	    contains: true,
    	    returnGeometry: true,
    	    returnZ: true,
    	    returnM: false
    	  },

    	  layerDefs: function (id, where) {
    	    this.params.layerDefs = (this.params.layerDefs) ? this.params.layerDefs + ';' : '';
    	    this.params.layerDefs += ([id, where]).join(':');
    	    return this;
    	  },

    	  simplify: function (map, factor) {
    	    var mapWidth = Math.abs(map.getBounds().getWest() - map.getBounds().getEast());
    	    this.params.maxAllowableOffset = (mapWidth / map.getSize().y) * factor;
    	    return this;
    	  },

    	  run: function (callback, context) {
    	    return this.request(function (error, response) {
    	      callback.call(context, error, (response && responseToFeatureCollection(response)), response);
    	    }, context);
    	  }
    	});

    	function find (options) {
    	  return new Find(options);
    	}

    	var Identify = Task.extend({
    	  path: 'identify',

    	  between: function (start, end) {
    	    this.params.time = [start.valueOf(), end.valueOf()];
    	    return this;
    	  }
    	});

    	function identify (options) {
    	  return new Identify(options);
    	}

    	var IdentifyFeatures = Identify.extend({
    	  setters: {
    	    'layers': 'layers',
    	    'precision': 'geometryPrecision',
    	    'tolerance': 'tolerance',
    	    // skipped implementing this (for now) because the REST service implementation isnt consistent between operations.
    	    // 'transform': 'datumTransformations'
    	    'returnGeometry': 'returnGeometry'
    	  },

    	  params: {
    	    sr: 4326,
    	    layers: 'all',
    	    tolerance: 3,
    	    returnGeometry: true
    	  },

    	  on: function (map) {
    	    var extent = boundsToExtent(map.getBounds());
    	    var size = map.getSize();
    	    this.params.imageDisplay = [size.x, size.y, 96];
    	    this.params.mapExtent = [extent.xmin, extent.ymin, extent.xmax, extent.ymax];
    	    return this;
    	  },

    	  at: function (geometry) {
    	    // cast lat, long pairs in raw array form manually
    	    if (geometry.length === 2) {
    	      geometry = L$1$$1.latLng(geometry);
    	    }
    	    this._setGeometryParams(geometry);
    	    return this;
    	  },

    	  layerDef: function (id, where) {
    	    this.params.layerDefs = (this.params.layerDefs) ? this.params.layerDefs + ';' : '';
    	    this.params.layerDefs += ([id, where]).join(':');
    	    return this;
    	  },

    	  simplify: function (map, factor) {
    	    var mapWidth = Math.abs(map.getBounds().getWest() - map.getBounds().getEast());
    	    this.params.maxAllowableOffset = (mapWidth / map.getSize().y) * factor;
    	    return this;
    	  },

    	  run: function (callback, context) {
    	    return this.request(function (error, response) {
    	      // immediately invoke with an error
    	      if (error) {
    	        callback.call(context, error, undefined, response);
    	        return;

    	      // ok no error lets just assume we have features...
    	      } else {
    	        var featureCollection = responseToFeatureCollection(response);
    	        response.results = response.results.reverse();
    	        for (var i = 0; i < featureCollection.features.length; i++) {
    	          var feature = featureCollection.features[i];
    	          feature.layerId = response.results[i].layerId;
    	        }
    	        callback.call(context, undefined, featureCollection, response);
    	      }
    	    });
    	  },

    	  _setGeometryParams: function (geometry) {
    	    var converted = _setGeometry(geometry);
    	    this.params.geometry = converted.geometry;
    	    this.params.geometryType = converted.geometryType;
    	  }
    	});

    	function identifyFeatures (options) {
    	  return new IdentifyFeatures(options);
    	}

    	var IdentifyImage = Identify.extend({
    	  setters: {
    	    'setMosaicRule': 'mosaicRule',
    	    'setRenderingRule': 'renderingRule',
    	    'setPixelSize': 'pixelSize',
    	    'returnCatalogItems': 'returnCatalogItems',
    	    'returnGeometry': 'returnGeometry'
    	  },

    	  params: {
    	    returnGeometry: false
    	  },

    	  at: function (latlng) {
    	    latlng = L$1$$1.latLng(latlng);
    	    this.params.geometry = JSON.stringify({
    	      x: latlng.lng,
    	      y: latlng.lat,
    	      spatialReference: {
    	        wkid: 4326
    	      }
    	    });
    	    this.params.geometryType = 'esriGeometryPoint';
    	    return this;
    	  },

    	  getMosaicRule: function () {
    	    return this.params.mosaicRule;
    	  },

    	  getRenderingRule: function () {
    	    return this.params.renderingRule;
    	  },

    	  getPixelSize: function () {
    	    return this.params.pixelSize;
    	  },

    	  run: function (callback, context) {
    	    return this.request(function (error, response) {
    	      callback.call(context, error, (response && this._responseToGeoJSON(response)), response);
    	    }, this);
    	  },

    	  // get pixel data and return as geoJSON point
    	  // populate catalog items (if any)
    	  // merging in any catalogItemVisibilities as a propery of each feature
    	  _responseToGeoJSON: function (response) {
    	    var location = response.location;
    	    var catalogItems = response.catalogItems;
    	    var catalogItemVisibilities = response.catalogItemVisibilities;
    	    var geoJSON = {
    	      'pixel': {
    	        'type': 'Feature',
    	        'geometry': {
    	          'type': 'Point',
    	          'coordinates': [location.x, location.y]
    	        },
    	        'crs': {
    	          'type': 'EPSG',
    	          'properties': {
    	            'code': location.spatialReference.wkid
    	          }
    	        },
    	        'properties': {
    	          'OBJECTID': response.objectId,
    	          'name': response.name,
    	          'value': response.value
    	        },
    	        'id': response.objectId
    	      }
    	    };

    	    if (response.properties && response.properties.Values) {
    	      geoJSON.pixel.properties.values = response.properties.Values;
    	    }

    	    if (catalogItems && catalogItems.features) {
    	      geoJSON.catalogItems = responseToFeatureCollection(catalogItems);
    	      if (catalogItemVisibilities && catalogItemVisibilities.length === geoJSON.catalogItems.features.length) {
    	        for (var i = catalogItemVisibilities.length - 1; i >= 0; i--) {
    	          geoJSON.catalogItems.features[i].properties.catalogItemVisibility = catalogItemVisibilities[i];
    	        }
    	      }
    	    }
    	    return geoJSON;
    	  }

    	});

    	function identifyImage (params) {
    	  return new IdentifyImage(params);
    	}

    	var Service = L$1$$1.Evented.extend({

    	  options: {
    	    proxy: false,
    	    useCors: cors,
    	    timeout: 0
    	  },

    	  initialize: function (options) {
    	    options = options || {};
    	    this._requestQueue = [];
    	    this._authenticating = false;
    	    L$1$$1.Util.setOptions(this, options);
    	    this.options.url = cleanUrl(this.options.url);
    	  },

    	  get: function (path, params, callback, context) {
    	    return this._request('get', path, params, callback, context);
    	  },

    	  post: function (path, params, callback, context) {
    	    return this._request('post', path, params, callback, context);
    	  },

    	  request: function (path, params, callback, context) {
    	    return this._request('request', path, params, callback, context);
    	  },

    	  metadata: function (callback, context) {
    	    return this._request('get', '', {}, callback, context);
    	  },

    	  authenticate: function (token) {
    	    this._authenticating = false;
    	    this.options.token = token;
    	    this._runQueue();
    	    return this;
    	  },

    	  getTimeout: function () {
    	    return this.options.timeout;
    	  },

    	  setTimeout: function (timeout) {
    	    this.options.timeout = timeout;
    	  },

    	  _request: function (method, path, params, callback, context) {
    	    this.fire('requeststart', {
    	      url: this.options.url + path,
    	      params: params,
    	      method: method
    	    }, true);

    	    var wrappedCallback = this._createServiceCallback(method, path, params, callback, context);

    	    if (this.options.token) {
    	      params.token = this.options.token;
    	    }
    	    if (this.options.requestParams) {
    	      L.extend(params, this.options.requestParams);
    	    }
    	    if (this._authenticating) {
    	      this._requestQueue.push([method, path, params, callback, context]);
    	      return;
    	    } else {
    	      var url = (this.options.proxy) ? this.options.proxy + '?' + this.options.url + path : this.options.url + path;

    	      if ((method === 'get' || method === 'request') && !this.options.useCors) {
    	        return Request.get.JSONP(url, params, wrappedCallback, context);
    	      } else {
    	        return Request[method](url, params, wrappedCallback, context);
    	      }
    	    }
    	  },

    	  _createServiceCallback: function (method, path, params, callback, context) {
    	    return L$1$$1.Util.bind(function (error, response) {
    	      if (error && (error.code === 499 || error.code === 498)) {
    	        this._authenticating = true;

    	        this._requestQueue.push([method, path, params, callback, context]);

    	        // fire an event for users to handle and re-authenticate
    	        this.fire('authenticationrequired', {
    	          authenticate: L$1$$1.Util.bind(this.authenticate, this)
    	        }, true);

    	        // if the user has access to a callback they can handle the auth error
    	        error.authenticate = L$1$$1.Util.bind(this.authenticate, this);
    	      }

    	      callback.call(context, error, response);

    	      if (error) {
    	        this.fire('requesterror', {
    	          url: this.options.url + path,
    	          params: params,
    	          message: error.message,
    	          code: error.code,
    	          method: method
    	        }, true);
    	      } else {
    	        this.fire('requestsuccess', {
    	          url: this.options.url + path,
    	          params: params,
    	          response: response,
    	          method: method
    	        }, true);
    	      }

    	      this.fire('requestend', {
    	        url: this.options.url + path,
    	        params: params,
    	        method: method
    	      }, true);
    	    }, this);
    	  },

    	  _runQueue: function () {
    	    for (var i = this._requestQueue.length - 1; i >= 0; i--) {
    	      var request = this._requestQueue[i];
    	      var method = request.shift();
    	      this[method].apply(this, request);
    	    }
    	    this._requestQueue = [];
    	  }
    	});

    	function service (options) {
    	  options = getUrlParams(options);
    	  return new Service(options);
    	}

    	var MapService = Service.extend({

    	  identify: function () {
    	    return identifyFeatures(this);
    	  },

    	  find: function () {
    	    return find(this);
    	  },

    	  query: function () {
    	    return query(this);
    	  }

    	});

    	function mapService (options) {
    	  return new MapService(options);
    	}

    	var ImageService = Service.extend({

    	  query: function () {
    	    return query(this);
    	  },

    	  identify: function () {
    	    return identifyImage(this);
    	  }
    	});

    	function imageService (options) {
    	  return new ImageService(options);
    	}

    	var FeatureLayerService = Service.extend({

    	  options: {
    	    idAttribute: 'OBJECTID'
    	  },

    	  query: function () {
    	    return query(this);
    	  },

    	  addFeature: function (feature, callback, context) {
    	    delete feature.id;

    	    feature = geojsonToArcGIS(feature);

    	    return this.post('addFeatures', {
    	      features: [feature]
    	    }, function (error, response) {
    	      var result = (response && response.addResults) ? response.addResults[0] : undefined;
    	      if (callback) {
    	        callback.call(context, error || response.addResults[0].error, result);
    	      }
    	    }, context);
    	  },

    	  updateFeature: function (feature, callback, context) {
    	    feature = geojsonToArcGIS(feature, this.options.idAttribute);

    	    return this.post('updateFeatures', {
    	      features: [feature]
    	    }, function (error, response) {
    	      var result = (response && response.updateResults) ? response.updateResults[0] : undefined;
    	      if (callback) {
    	        callback.call(context, error || response.updateResults[0].error, result);
    	      }
    	    }, context);
    	  },

    	  deleteFeature: function (id, callback, context) {
    	    return this.post('deleteFeatures', {
    	      objectIds: id
    	    }, function (error, response) {
    	      var result = (response && response.deleteResults) ? response.deleteResults[0] : undefined;
    	      if (callback) {
    	        callback.call(context, error || response.deleteResults[0].error, result);
    	      }
    	    }, context);
    	  },

    	  deleteFeatures: function (ids, callback, context) {
    	    return this.post('deleteFeatures', {
    	      objectIds: ids
    	    }, function (error, response) {
    	      // pass back the entire array
    	      var result = (response && response.deleteResults) ? response.deleteResults : undefined;
    	      if (callback) {
    	        callback.call(context, error || response.deleteResults[0].error, result);
    	      }
    	    }, context);
    	  }
    	});

    	function featureLayerService (options) {
    	  return new FeatureLayerService(options);
    	}

    	var tileProtocol = (window.location.protocol !== 'https:') ? 'http:' : 'https:';

    	var BasemapLayer = L$1$$1.TileLayer.extend({
    	  statics: {
    	    TILES: {
    	      Streets: {
    	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    	        options: {
    	          minZoom: 1,
    	          maxZoom: 19,
    	          subdomains: ['server', 'services'],
    	          attribution: 'USGS, NOAA',
    	          attributionUrl: 'https://static.arcgis.com/attribution/World_Street_Map'
    	        }
    	      },
    	      Topographic: {
    	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    	        options: {
    	          minZoom: 1,
    	          maxZoom: 19,
    	          subdomains: ['server', 'services'],
    	          attribution: 'USGS, NOAA',
    	          attributionUrl: 'https://static.arcgis.com/attribution/World_Topo_Map'
    	        }
    	      },
    	      Oceans: {
    	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
    	        options: {
    	          minZoom: 1,
    	          maxZoom: 16,
    	          subdomains: ['server', 'services'],
    	          attribution: 'USGS, NOAA',
    	          attributionUrl: 'https://static.arcgis.com/attribution/Ocean_Basemap'
    	        }
    	      },
    	      OceansLabels: {
    	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}',
    	        options: {
    	          minZoom: 1,
    	          maxZoom: 16,
    	          subdomains: ['server', 'services'],
    	          pane: (pointerEvents) ? 'esri-labels' : 'tilePane'
    	        }
    	      },
    	      NationalGeographic: {
    	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}',
    	        options: {
    	          minZoom: 1,
    	          maxZoom: 16,
    	          subdomains: ['server', 'services'],
    	          attribution: 'National Geographic, DeLorme, HERE, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, increment P Corp.'
    	        }
    	      },
    	      DarkGray: {
    	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    	        options: {
    	          minZoom: 1,
    	          maxZoom: 16,
    	          subdomains: ['server', 'services'],
    	          attribution: 'HERE, DeLorme, MapmyIndia, &copy; OpenStreetMap contributors'
    	        }
    	      },
    	      DarkGrayLabels: {
    	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    	        options: {
    	          minZoom: 1,
    	          maxZoom: 16,
    	          subdomains: ['server', 'services'],
    	          pane: (pointerEvents) ? 'esri-labels' : 'tilePane',
    	          attribution: ''

    	        }
    	      },
    	      Gray: {
    	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    	        options: {
    	          minZoom: 1,
    	          maxZoom: 16,
    	          subdomains: ['server', 'services'],
    	          attribution: 'HERE, DeLorme, MapmyIndia, &copy; OpenStreetMap contributors'
    	        }
    	      },
    	      GrayLabels: {
    	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    	        options: {
    	          minZoom: 1,
    	          maxZoom: 16,
    	          subdomains: ['server', 'services'],
    	          pane: (pointerEvents) ? 'esri-labels' : 'tilePane',
    	          attribution: ''
    	        }
    	      },
    	      Imagery: {
    	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    	        options: {
    	          minZoom: 1,
    	          maxZoom: 19,
    	          subdomains: ['server', 'services'],
    	          attribution: 'DigitalGlobe, GeoEye, i-cubed, USDA, USGS, AEX, Getmapping, Aerogrid, IGN, IGP, swisstopo, and the GIS User Community'
    	        }
    	      },
    	      ImageryLabels: {
    	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    	        options: {
    	          minZoom: 1,
    	          maxZoom: 19,
    	          subdomains: ['server', 'services'],
    	          pane: (pointerEvents) ? 'esri-labels' : 'tilePane',
    	          attribution: ''
    	        }
    	      },
    	      ImageryTransportation: {
    	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
    	        options: {
    	          minZoom: 1,
    	          maxZoom: 19,
    	          subdomains: ['server', 'services'],
    	          pane: (pointerEvents) ? 'esri-labels' : 'tilePane'
    	        }
    	      },
    	      ShadedRelief: {
    	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
    	        options: {
    	          minZoom: 1,
    	          maxZoom: 13,
    	          subdomains: ['server', 'services'],
    	          attribution: 'USGS'
    	        }
    	      },
    	      ShadedReliefLabels: {
    	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places_Alternate/MapServer/tile/{z}/{y}/{x}',
    	        options: {
    	          minZoom: 1,
    	          maxZoom: 12,
    	          subdomains: ['server', 'services'],
    	          pane: (pointerEvents) ? 'esri-labels' : 'tilePane',
    	          attribution: ''
    	        }
    	      },
    	      Terrain: {
    	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
    	        options: {
    	          minZoom: 1,
    	          maxZoom: 13,
    	          subdomains: ['server', 'services'],
    	          attribution: 'USGS, NOAA'
    	        }
    	      },
    	      TerrainLabels: {
    	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/Reference/World_Reference_Overlay/MapServer/tile/{z}/{y}/{x}',
    	        options: {
    	          minZoom: 1,
    	          maxZoom: 13,
    	          subdomains: ['server', 'services'],
    	          pane: (pointerEvents) ? 'esri-labels' : 'tilePane',
    	          attribution: ''
    	        }
    	      },
    	      USATopo: {
    	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/tile/{z}/{y}/{x}',
    	        options: {
    	          minZoom: 1,
    	          maxZoom: 15,
    	          subdomains: ['server', 'services'],
    	          attribution: 'USGS, National Geographic Society, i-cubed'
    	        }
    	      }
    	    }
    	  },

    	  initialize: function (key, options) {
    	    var config;

    	    // set the config variable with the appropriate config object
    	    if (typeof key === 'object' && key.urlTemplate && key.options) {
    	      config = key;
    	    } else if (typeof key === 'string' && BasemapLayer.TILES[key]) {
    	      config = BasemapLayer.TILES[key];
    	    } else {
    	      throw new Error('L.esri.BasemapLayer: Invalid parameter. Use one of "Streets", "Topographic", "Oceans", "OceansLabels", "NationalGeographic", "Gray", "GrayLabels", "DarkGray", "DarkGrayLabels", "Imagery", "ImageryLabels", "ImageryTransportation", "ShadedRelief", "ShadedReliefLabels", "Terrain", "TerrainLabels" or "USATopo"');
    	    }

    	    // merge passed options into the config options
    	    var tileOptions = L$1$$1.Util.extend(config.options, options);

    	    L$1$$1.Util.setOptions(this, tileOptions);

    	    if (this.options.token) {
    	      config.urlTemplate += ('?token=' + this.options.token);
    	    }

    	    // call the initialize method on L.TileLayer to set everything up
    	    L$1$$1.TileLayer.prototype.initialize.call(this, config.urlTemplate, tileOptions);
    	  },

    	  onAdd: function (map) {
    	    // include 'Powered by Esri' in map attribution
    	    setEsriAttribution(map);

    	    if (this.options.pane === 'esri-labels') {
    	      this._initPane();
    	    }
    	    // some basemaps can supply dynamic attribution
    	    if (this.options.attributionUrl) {
    	      _getAttributionData(this.options.attributionUrl, map);
    	    }

    	    map.on('moveend', _updateMapAttribution);

    	    L$1$$1.TileLayer.prototype.onAdd.call(this, map);
    	  },

    	  onRemove: function (map) {
    	    map.off('moveend', _updateMapAttribution);
    	    L$1$$1.TileLayer.prototype.onRemove.call(this, map);
    	  },

    	  _initPane: function () {
    	    if (!this._map.getPane(this.options.pane)) {
    	      var pane = this._map.createPane(this.options.pane);
    	      pane.style.pointerEvents = 'none';
    	      pane.style.zIndex = 500;
    	    }
    	  },

    	  getAttribution: function () {
    	    if (this.options.attribution) {
    	      var attribution = '<span class="esri-dynamic-attribution">' + this.options.attribution + '</span>';
    	    }
    	    return attribution;
    	  }
    	});

    	function basemapLayer (key, options) {
    	  return new BasemapLayer(key, options);
    	}

    	var TiledMapLayer = L$1$$1.TileLayer.extend({
    	  options: {
    	    zoomOffsetAllowance: 0.1,
    	    errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEABAMAAACuXLVVAAAAA1BMVEUzNDVszlHHAAAAAXRSTlMAQObYZgAAAAlwSFlzAAAAAAAAAAAB6mUWpAAAADZJREFUeJztwQEBAAAAgiD/r25IQAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7waBAAABw08RwAAAAABJRU5ErkJggg=='
    	  },

    	  statics: {
    	    MercatorZoomLevels: {
    	      '0': 156543.03392799999,
    	      '1': 78271.516963999893,
    	      '2': 39135.758482000099,
    	      '3': 19567.879240999901,
    	      '4': 9783.9396204999593,
    	      '5': 4891.9698102499797,
    	      '6': 2445.9849051249898,
    	      '7': 1222.9924525624899,
    	      '8': 611.49622628138002,
    	      '9': 305.74811314055802,
    	      '10': 152.874056570411,
    	      '11': 76.437028285073197,
    	      '12': 38.218514142536598,
    	      '13': 19.109257071268299,
    	      '14': 9.5546285356341496,
    	      '15': 4.7773142679493699,
    	      '16': 2.38865713397468,
    	      '17': 1.1943285668550501,
    	      '18': 0.59716428355981699,
    	      '19': 0.29858214164761698,
    	      '20': 0.14929107082381,
    	      '21': 0.07464553541191,
    	      '22': 0.0373227677059525,
    	      '23': 0.0186613838529763
    	    }
    	  },

    	  initialize: function (options) {
    	    options = L$1$$1.Util.setOptions(this, options);

    	    // set the urls
    	    options = getUrlParams(options);
    	    this.tileUrl = options.url + 'tile/{z}/{y}/{x}' + (options.requestParams && Object.keys(options.requestParams).length > 0 ? L$1$$1.Util.getParamString(options.requestParams) : '');
    	    // Remove subdomain in url
    	    // https://github.com/Esri/esri-leaflet/issues/991
    	    if (options.url.indexOf('{s}') !== -1 && options.subdomains) {
    	      options.url = options.url.replace('{s}', options.subdomains[0]);
    	    }
    	    this.service = mapService(options);
    	    this.service.addEventParent(this);

    	    var arcgisonline = new RegExp(/tiles.arcgis(online)?\.com/g);
    	    if (arcgisonline.test(options.url)) {
    	      this.tileUrl = this.tileUrl.replace('://tiles', '://tiles{s}');
    	      options.subdomains = ['1', '2', '3', '4'];
    	    }

    	    if (this.options.token) {
    	      this.tileUrl += ('?token=' + this.options.token);
    	    }

    	    // init layer by calling TileLayers initialize method
    	    L$1$$1.TileLayer.prototype.initialize.call(this, this.tileUrl, options);
    	  },

    	  getTileUrl: function (tilePoint) {
    	    var zoom = this._getZoomForUrl();

    	    return L$1$$1.Util.template(this.tileUrl, L$1$$1.Util.extend({
    	      s: this._getSubdomain(tilePoint),
    	      x: tilePoint.x,
    	      y: tilePoint.y,
    	      // try lod map first, then just default to zoom level
    	      z: (this._lodMap && this._lodMap[zoom]) ? this._lodMap[zoom] : zoom
    	    }, this.options));
    	  },

    	  createTile: function (coords, done) {
    	    var tile = document.createElement('img');

    	    L.DomEvent.on(tile, 'load', L.bind(this._tileOnLoad, this, done, tile));
    	    L.DomEvent.on(tile, 'error', L.bind(this._tileOnError, this, done, tile));

    	    if (this.options.crossOrigin) {
    	      tile.crossOrigin = '';
    	    }

    	    /*
    	     Alt tag is set to empty string to keep screen readers from reading URL and for compliance reasons
    	     http://www.w3.org/TR/WCAG20-TECHS/H67
    	    */
    	    tile.alt = '';

    	    // if there is no lod map or an lod map with a proper zoom load the tile
    	    // otherwise wait for the lod map to become available
    	    if (!this._lodMap || (this._lodMap && this._lodMap[this._getZoomForUrl()])) {
    	      tile.src = this.getTileUrl(coords);
    	    } else {
    	      this.once('lodmap', function () {
    	        tile.src = this.getTileUrl(coords);
    	      }, this);
    	    }

    	    return tile;
    	  },

    	  onAdd: function (map) {
    	    // include 'Powered by Esri' in map attribution
    	    setEsriAttribution(map);

    	    if (!this._lodMap) {
    	      this.metadata(function (error, metadata) {
    	        if (!error && metadata.spatialReference) {
    	          var sr = metadata.spatialReference.latestWkid || metadata.spatialReference.wkid;
    	          if (!this.options.attribution && map.attributionControl && metadata.copyrightText) {
    	            this.options.attribution = metadata.copyrightText;
    	            map.attributionControl.addAttribution(this.getAttribution());
    	          }
    	          if (map.options.crs === L.CRS.EPSG3857 && (sr === 102100 || sr === 3857)) {
    	            this._lodMap = {};
    	            // create the zoom level data
    	            var arcgisLODs = metadata.tileInfo.lods;
    	            var correctResolutions = TiledMapLayer.MercatorZoomLevels;

    	            for (var i = 0; i < arcgisLODs.length; i++) {
    	              var arcgisLOD = arcgisLODs[i];
    	              for (var ci in correctResolutions) {
    	                var correctRes = correctResolutions[ci];

    	                if (this._withinPercentage(arcgisLOD.resolution, correctRes, this.options.zoomOffsetAllowance)) {
    	                  this._lodMap[ci] = arcgisLOD.level;
    	                  break;
    	                }
    	              }
    	            }

    	            this.fire('lodmap');
    	          } else {
    	            if (!proj4) {
    	              warn('L.esri.TiledMapLayer is using a non-mercator spatial reference. Support may be available through Proj4Leaflet http://esri.github.io/esri-leaflet/examples/non-mercator-projection.html');
    	            }
    	          }
    	        }
    	      }, this);
    	    }

    	    L$1$$1.TileLayer.prototype.onAdd.call(this, map);
    	  },

    	  metadata: function (callback, context) {
    	    this.service.metadata(callback, context);
    	    return this;
    	  },

    	  identify: function () {
    	    return this.service.identify();
    	  },

    	  find: function () {
    	    return this.service.find();
    	  },

    	  query: function () {
    	    return this.service.query();
    	  },

    	  authenticate: function (token) {
    	    var tokenQs = '?token=' + token;
    	    this.tileUrl = (this.options.token) ? this.tileUrl.replace(/\?token=(.+)/g, tokenQs) : this.tileUrl + tokenQs;
    	    this.options.token = token;
    	    this.service.authenticate(token);
    	    return this;
    	  },

    	  _withinPercentage: function (a, b, percentage) {
    	    var diff = Math.abs((a / b) - 1);
    	    return diff < percentage;
    	  }
    	});

    	function tiledMapLayer (url, options) {
    	  return new TiledMapLayer(url, options);
    	}

    	var Overlay = L$1$$1.ImageOverlay.extend({
    	  onAdd: function (map) {
    	    this._topLeft = map.getPixelBounds().min;
    	    L$1$$1.ImageOverlay.prototype.onAdd.call(this, map);
    	  },
    	  _reset: function () {
    	    if (this._map.options.crs === L$1$$1.CRS.EPSG3857) {
    	      L$1$$1.ImageOverlay.prototype._reset.call(this);
    	    } else {
    	      L$1$$1.DomUtil.setPosition(this._image, this._topLeft.subtract(this._map.getPixelOrigin()));
    	    }
    	  }
    	});

    	var RasterLayer = L$1$$1.Layer.extend({
    	  options: {
    	    opacity: 1,
    	    position: 'front',
    	    f: 'image',
    	    useCors: cors,
    	    attribution: null,
    	    interactive: false,
    	    alt: ''
    	  },

    	  onAdd: function (map) {
    	    // include 'Powered by Esri' in map attribution
    	    setEsriAttribution(map);

    	    this._update = L$1$$1.Util.throttle(this._update, this.options.updateInterval, this);

    	    map.on('moveend', this._update, this);

    	    // if we had an image loaded and it matches the
    	    // current bounds show the image otherwise remove it
    	    if (this._currentImage && this._currentImage._bounds.equals(this._map.getBounds())) {
    	      map.addLayer(this._currentImage);
    	    } else if (this._currentImage) {
    	      this._map.removeLayer(this._currentImage);
    	      this._currentImage = null;
    	    }

    	    this._update();

    	    if (this._popup) {
    	      this._map.on('click', this._getPopupData, this);
    	      this._map.on('dblclick', this._resetPopupState, this);
    	    }

    	    // add copyright text listed in service metadata
    	    this.metadata(function (err, metadata) {
    	      if (!err && !this.options.attribution && map.attributionControl && metadata.copyrightText) {
    	        this.options.attribution = metadata.copyrightText;
    	        map.attributionControl.addAttribution(this.getAttribution());
    	      }
    	    }, this);
    	  },

    	  onRemove: function (map) {
    	    if (this._currentImage) {
    	      this._map.removeLayer(this._currentImage);
    	    }

    	    if (this._popup) {
    	      this._map.off('click', this._getPopupData, this);
    	      this._map.off('dblclick', this._resetPopupState, this);
    	    }

    	    this._map.off('moveend', this._update, this);
    	  },

    	  bindPopup: function (fn, popupOptions) {
    	    this._shouldRenderPopup = false;
    	    this._lastClick = false;
    	    this._popup = L$1$$1.popup(popupOptions);
    	    this._popupFunction = fn;
    	    if (this._map) {
    	      this._map.on('click', this._getPopupData, this);
    	      this._map.on('dblclick', this._resetPopupState, this);
    	    }
    	    return this;
    	  },

    	  unbindPopup: function () {
    	    if (this._map) {
    	      this._map.closePopup(this._popup);
    	      this._map.off('click', this._getPopupData, this);
    	      this._map.off('dblclick', this._resetPopupState, this);
    	    }
    	    this._popup = false;
    	    return this;
    	  },

    	  bringToFront: function () {
    	    this.options.position = 'front';
    	    if (this._currentImage) {
    	      this._currentImage.bringToFront();
    	    }
    	    return this;
    	  },

    	  bringToBack: function () {
    	    this.options.position = 'back';
    	    if (this._currentImage) {
    	      this._currentImage.bringToBack();
    	    }
    	    return this;
    	  },

    	  getAttribution: function () {
    	    return this.options.attribution;
    	  },

    	  getOpacity: function () {
    	    return this.options.opacity;
    	  },

    	  setOpacity: function (opacity) {
    	    this.options.opacity = opacity;
    	    if (this._currentImage) {
    	      this._currentImage.setOpacity(opacity);
    	    }
    	    return this;
    	  },

    	  getTimeRange: function () {
    	    return [this.options.from, this.options.to];
    	  },

    	  setTimeRange: function (from, to) {
    	    this.options.from = from;
    	    this.options.to = to;
    	    this._update();
    	    return this;
    	  },

    	  metadata: function (callback, context) {
    	    this.service.metadata(callback, context);
    	    return this;
    	  },

    	  authenticate: function (token) {
    	    this.service.authenticate(token);
    	    return this;
    	  },

    	  redraw: function () {
    	    this._update();
    	  },

    	  _renderImage: function (url, bounds, contentType) {
    	    if (this._map) {
    	      // if no output directory has been specified for a service, MIME data will be returned
    	      if (contentType) {
    	        url = 'data:' + contentType + ';base64,' + url;
    	      }
    	      // create a new image overlay and add it to the map
    	      // to start loading the image
    	      // opacity is 0 while the image is loading
    	      var image = new Overlay(url, bounds, {
    	        opacity: 0,
    	        crossOrigin: this.options.useCors,
    	        alt: this.options.alt,
    	        pane: this.options.pane || this.getPane(),
    	        interactive: this.options.interactive
    	      }).addTo(this._map);

    	      var onOverlayError = function () {
    	        this._map.removeLayer(image);
    	        this.fire('error');
    	        image.off('load', onOverlayLoad, this);
    	      };

    	      var onOverlayLoad = function (e) {
    	        image.off('error', onOverlayLoad, this);
    	        if (this._map) {
    	          var newImage = e.target;
    	          var oldImage = this._currentImage;

    	          // if the bounds of this image matches the bounds that
    	          // _renderImage was called with and we have a map with the same bounds
    	          // hide the old image if there is one and set the opacity
    	          // of the new image otherwise remove the new image
    	          if (newImage._bounds.equals(bounds) && newImage._bounds.equals(this._map.getBounds())) {
    	            this._currentImage = newImage;

    	            if (this.options.position === 'front') {
    	              this.bringToFront();
    	            } else {
    	              this.bringToBack();
    	            }

    	            if (this._map && this._currentImage._map) {
    	              this._currentImage.setOpacity(this.options.opacity);
    	            } else {
    	              this._currentImage._map.removeLayer(this._currentImage);
    	            }

    	            if (oldImage && this._map) {
    	              this._map.removeLayer(oldImage);
    	            }

    	            if (oldImage && oldImage._map) {
    	              oldImage._map.removeLayer(oldImage);
    	            }
    	          } else {
    	            this._map.removeLayer(newImage);
    	          }
    	        }

    	        this.fire('load', {
    	          bounds: bounds
    	        });
    	      };

    	      // If loading the image fails
    	      image.once('error', onOverlayError, this);

    	      // once the image loads
    	      image.once('load', onOverlayLoad, this);

    	      this.fire('loading', {
    	        bounds: bounds
    	      });
    	    }
    	  },

    	  _update: function () {
    	    if (!this._map) {
    	      return;
    	    }

    	    var zoom = this._map.getZoom();
    	    var bounds = this._map.getBounds();

    	    if (this._animatingZoom) {
    	      return;
    	    }

    	    if (this._map._panTransition && this._map._panTransition._inProgress) {
    	      return;
    	    }

    	    if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
    	      if (this._currentImage) {
    	        this._currentImage._map.removeLayer(this._currentImage);
    	        this._currentImage = null;
    	      }
    	      return;
    	    }

    	    var params = this._buildExportParams();
    	    L.extend(params, this.options.requestParams);

    	    if (params) {
    	      this._requestExport(params, bounds);
    	    } else if (this._currentImage) {
    	      this._currentImage._map.removeLayer(this._currentImage);
    	      this._currentImage = null;
    	    }
    	  },

    	  _renderPopup: function (latlng, error, results, response) {
    	    latlng = L$1$$1.latLng(latlng);
    	    if (this._shouldRenderPopup && this._lastClick.equals(latlng)) {
    	      // add the popup to the map where the mouse was clicked at
    	      var content = this._popupFunction(error, results, response);
    	      if (content) {
    	        this._popup.setLatLng(latlng).setContent(content).openOn(this._map);
    	      }
    	    }
    	  },

    	  _resetPopupState: function (e) {
    	    this._shouldRenderPopup = false;
    	    this._lastClick = e.latlng;
    	  },

    	  _calculateBbox: function () {
    	    var pixelBounds = this._map.getPixelBounds();

    	    var sw = this._map.unproject(pixelBounds.getBottomLeft());
    	    var ne = this._map.unproject(pixelBounds.getTopRight());

    	    var neProjected = this._map.options.crs.project(ne);
    	    var swProjected = this._map.options.crs.project(sw);

    	    // this ensures ne/sw are switched in polar maps where north/top bottom/south is inverted
    	    var boundsProjected = L$1$$1.bounds(neProjected, swProjected);

    	    return [boundsProjected.getBottomLeft().x, boundsProjected.getBottomLeft().y, boundsProjected.getTopRight().x, boundsProjected.getTopRight().y].join(',');
    	  },

    	  _calculateImageSize: function () {
    	    // ensure that we don't ask ArcGIS Server for a taller image than we have actual map displaying within the div
    	    var bounds = this._map.getPixelBounds();
    	    var size = this._map.getSize();

    	    var sw = this._map.unproject(bounds.getBottomLeft());
    	    var ne = this._map.unproject(bounds.getTopRight());

    	    var top = this._map.latLngToLayerPoint(ne).y;
    	    var bottom = this._map.latLngToLayerPoint(sw).y;

    	    if (top > 0 || bottom < size.y) {
    	      size.y = bottom - top;
    	    }

    	    return size.x + ',' + size.y;
    	  }
    	});

    	var ImageMapLayer = RasterLayer.extend({

    	  options: {
    	    updateInterval: 150,
    	    format: 'jpgpng',
    	    transparent: true,
    	    f: 'image'
    	  },

    	  query: function () {
    	    return this.service.query();
    	  },

    	  identify: function () {
    	    return this.service.identify();
    	  },

    	  initialize: function (options) {
    	    options = getUrlParams(options);
    	    this.service = imageService(options);
    	    this.service.addEventParent(this);

    	    L$1$$1.Util.setOptions(this, options);
    	  },

    	  setPixelType: function (pixelType) {
    	    this.options.pixelType = pixelType;
    	    this._update();
    	    return this;
    	  },

    	  getPixelType: function () {
    	    return this.options.pixelType;
    	  },

    	  setBandIds: function (bandIds) {
    	    if (L$1$$1.Util.isArray(bandIds)) {
    	      this.options.bandIds = bandIds.join(',');
    	    } else {
    	      this.options.bandIds = bandIds.toString();
    	    }
    	    this._update();
    	    return this;
    	  },

    	  getBandIds: function () {
    	    return this.options.bandIds;
    	  },

    	  setNoData: function (noData, noDataInterpretation) {
    	    if (L$1$$1.Util.isArray(noData)) {
    	      this.options.noData = noData.join(',');
    	    } else {
    	      this.options.noData = noData.toString();
    	    }
    	    if (noDataInterpretation) {
    	      this.options.noDataInterpretation = noDataInterpretation;
    	    }
    	    this._update();
    	    return this;
    	  },

    	  getNoData: function () {
    	    return this.options.noData;
    	  },

    	  getNoDataInterpretation: function () {
    	    return this.options.noDataInterpretation;
    	  },

    	  setRenderingRule: function (renderingRule) {
    	    this.options.renderingRule = renderingRule;
    	    this._update();
    	  },

    	  getRenderingRule: function () {
    	    return this.options.renderingRule;
    	  },

    	  setMosaicRule: function (mosaicRule) {
    	    this.options.mosaicRule = mosaicRule;
    	    this._update();
    	  },

    	  getMosaicRule: function () {
    	    return this.options.mosaicRule;
    	  },

    	  _getPopupData: function (e) {
    	    var callback = L$1$$1.Util.bind(function (error, results, response) {
    	      if (error) { return; } // we really can't do anything here but authenticate or requesterror will fire
    	      setTimeout(L$1$$1.Util.bind(function () {
    	        this._renderPopup(e.latlng, error, results, response);
    	      }, this), 300);
    	    }, this);

    	    var identifyRequest = this.identify().at(e.latlng);

    	    // set mosaic rule for identify task if it is set for layer
    	    if (this.options.mosaicRule) {
    	      identifyRequest.setMosaicRule(this.options.mosaicRule);
    	      // @TODO: force return catalog items too?
    	    }

    	    // @TODO: set rendering rule? Not sure,
    	    // sometimes you want raw pixel values
    	    // if (this.options.renderingRule) {
    	    //   identifyRequest.setRenderingRule(this.options.renderingRule);
    	    // }

    	    identifyRequest.run(callback);

    	    // set the flags to show the popup
    	    this._shouldRenderPopup = true;
    	    this._lastClick = e.latlng;
    	  },

    	  _buildExportParams: function () {
    	    var sr = parseInt(this._map.options.crs.code.split(':')[1], 10);

    	    var params = {
    	      bbox: this._calculateBbox(),
    	      size: this._calculateImageSize(),
    	      format: this.options.format,
    	      transparent: this.options.transparent,
    	      bboxSR: sr,
    	      imageSR: sr
    	    };

    	    if (this.options.from && this.options.to) {
    	      params.time = this.options.from.valueOf() + ',' + this.options.to.valueOf();
    	    }

    	    if (this.options.pixelType) {
    	      params.pixelType = this.options.pixelType;
    	    }

    	    if (this.options.interpolation) {
    	      params.interpolation = this.options.interpolation;
    	    }

    	    if (this.options.compressionQuality) {
    	      params.compressionQuality = this.options.compressionQuality;
    	    }

    	    if (this.options.bandIds) {
    	      params.bandIds = this.options.bandIds;
    	    }

    	    // 0 is falsy *and* a valid input parameter
    	    if (this.options.noData === 0 || this.options.noData) {
    	      params.noData = this.options.noData;
    	    }

    	    if (this.options.noDataInterpretation) {
    	      params.noDataInterpretation = this.options.noDataInterpretation;
    	    }

    	    if (this.service.options.token) {
    	      params.token = this.service.options.token;
    	    }

    	    if (this.options.renderingRule) {
    	      params.renderingRule = JSON.stringify(this.options.renderingRule);
    	    }

    	    if (this.options.mosaicRule) {
    	      params.mosaicRule = JSON.stringify(this.options.mosaicRule);
    	    }

    	    return params;
    	  },

    	  _requestExport: function (params, bounds) {
    	    if (this.options.f === 'json') {
    	      this.service.request('exportImage', params, function (error, response) {
    	        if (error) { return; } // we really can't do anything here but authenticate or requesterror will fire
    	        if (this.options.token) {
    	          response.href += ('?token=' + this.options.token);
    	        }
    	        this._renderImage(response.href, bounds);
    	      }, this);
    	    } else {
    	      params.f = 'image';
    	      this._renderImage(this.options.url + 'exportImage' + L$1$$1.Util.getParamString(params), bounds);
    	    }
    	  }
    	});

    	function imageMapLayer (url, options) {
    	  return new ImageMapLayer(url, options);
    	}

    	var DynamicMapLayer = RasterLayer.extend({

    	  options: {
    	    updateInterval: 150,
    	    layers: false,
    	    layerDefs: false,
    	    timeOptions: false,
    	    format: 'png24',
    	    transparent: true,
    	    f: 'json'
    	  },

    	  initialize: function (options) {
    	    options = getUrlParams(options);
    	    this.service = mapService(options);
    	    this.service.addEventParent(this);

    	    if ((options.proxy || options.token) && options.f !== 'json') {
    	      options.f = 'json';
    	    }

    	    L$1$$1.Util.setOptions(this, options);
    	  },

    	  getDynamicLayers: function () {
    	    return this.options.dynamicLayers;
    	  },

    	  setDynamicLayers: function (dynamicLayers) {
    	    this.options.dynamicLayers = dynamicLayers;
    	    this._update();
    	    return this;
    	  },

    	  getLayers: function () {
    	    return this.options.layers;
    	  },

    	  setLayers: function (layers) {
    	    this.options.layers = layers;
    	    this._update();
    	    return this;
    	  },

    	  getLayerDefs: function () {
    	    return this.options.layerDefs;
    	  },

    	  setLayerDefs: function (layerDefs) {
    	    this.options.layerDefs = layerDefs;
    	    this._update();
    	    return this;
    	  },

    	  getTimeOptions: function () {
    	    return this.options.timeOptions;
    	  },

    	  setTimeOptions: function (timeOptions) {
    	    this.options.timeOptions = timeOptions;
    	    this._update();
    	    return this;
    	  },

    	  query: function () {
    	    return this.service.query();
    	  },

    	  identify: function () {
    	    return this.service.identify();
    	  },

    	  find: function () {
    	    return this.service.find();
    	  },

    	  _getPopupData: function (e) {
    	    var callback = L$1$$1.Util.bind(function (error, featureCollection, response) {
    	      if (error) { return; } // we really can't do anything here but authenticate or requesterror will fire
    	      setTimeout(L$1$$1.Util.bind(function () {
    	        this._renderPopup(e.latlng, error, featureCollection, response);
    	      }, this), 300);
    	    }, this);

    	    var identifyRequest;
    	    if (this.options.popup) {
    	      identifyRequest = this.options.popup.on(this._map).at(e.latlng);
    	    } else {
    	      identifyRequest = this.identify().on(this._map).at(e.latlng);
    	    }

    	    // remove extraneous vertices from response features if it has not already been done
    	    identifyRequest.params.maxAllowableOffset ? true : identifyRequest.simplify(this._map, 0.5);

    	    if (!(this.options.popup && this.options.popup.params && this.options.popup.params.layers)) {
    	      if (this.options.layers) {
    	        identifyRequest.layers('visible:' + this.options.layers.join(','));
    	      } else {
    	        identifyRequest.layers('visible');
    	      }
    	    }

    	    // if present, pass layer ids and sql filters through to the identify task
    	    if (this.options.layerDefs && typeof this.options.layerDefs !== 'string' && !identifyRequest.params.layerDefs) {
    	      for (var id in this.options.layerDefs) {
    	        if (this.options.layerDefs.hasOwnProperty(id)) {
    	          identifyRequest.layerDef(id, this.options.layerDefs[id]);
    	        }
    	      }
    	    }

    	    identifyRequest.run(callback);

    	    // set the flags to show the popup
    	    this._shouldRenderPopup = true;
    	    this._lastClick = e.latlng;
    	  },

    	  _buildExportParams: function () {
    	    var sr = parseInt(this._map.options.crs.code.split(':')[1], 10);

    	    var params = {
    	      bbox: this._calculateBbox(),
    	      size: this._calculateImageSize(),
    	      dpi: 96,
    	      format: this.options.format,
    	      transparent: this.options.transparent,
    	      bboxSR: sr,
    	      imageSR: sr
    	    };

    	    if (this.options.dynamicLayers) {
    	      params.dynamicLayers = this.options.dynamicLayers;
    	    }

    	    if (this.options.layers) {
    	      if (this.options.layers.length === 0) {
    	        return;
    	      } else {
    	        params.layers = 'show:' + this.options.layers.join(',');
    	      }
    	    }

    	    if (this.options.layerDefs) {
    	      params.layerDefs = typeof this.options.layerDefs === 'string' ? this.options.layerDefs : JSON.stringify(this.options.layerDefs);
    	    }

    	    if (this.options.timeOptions) {
    	      params.timeOptions = JSON.stringify(this.options.timeOptions);
    	    }

    	    if (this.options.from && this.options.to) {
    	      params.time = this.options.from.valueOf() + ',' + this.options.to.valueOf();
    	    }

    	    if (this.service.options.token) {
    	      params.token = this.service.options.token;
    	    }

    	    if (this.options.proxy) {
    	      params.proxy = this.options.proxy;
    	    }

    	    // use a timestamp to bust server cache
    	    if (this.options.disableCache) {
    	      params._ts = Date.now();
    	    }

    	    return params;
    	  },

    	  _requestExport: function (params, bounds) {
    	    if (this.options.f === 'json') {
    	      this.service.request('export', params, function (error, response) {
    	        if (error) { return; } // we really can't do anything here but authenticate or requesterror will fire

    	        if (this.options.token) {
    	          response.href += ('?token=' + this.options.token);
    	        }
    	        if (this.options.proxy) {
    	          response.href = this.options.proxy + '?' + response.href;
    	        }
    	        if (response.href) {
    	          this._renderImage(response.href, bounds);
    	        } else {
    	          this._renderImage(response.imageData, bounds, response.contentType);
    	        }
    	      }, this);
    	    } else {
    	      params.f = 'image';
    	      this._renderImage(this.options.url + 'export' + L$1$$1.Util.getParamString(params), bounds);
    	    }
    	  }
    	});

    	function dynamicMapLayer (url, options) {
    	  return new DynamicMapLayer(url, options);
    	}

    	var VirtualGrid = L$1__default.Layer.extend({

    	  options: {
    	    cellSize: 512,
    	    updateInterval: 150
    	  },

    	  initialize: function (options) {
    	    options = L$1__default.setOptions(this, options);
    	    this._zooming = false;
    	  },

    	  onAdd: function (map) {
    	    this._map = map;
    	    this._update = L$1__default.Util.throttle(this._update, this.options.updateInterval, this);
    	    this._reset();
    	    this._update();
    	  },

    	  onRemove: function () {
    	    this._map.removeEventListener(this.getEvents(), this);
    	    this._removeCells();
    	  },

    	  getEvents: function () {
    	    var events = {
    	      moveend: this._update,
    	      zoomstart: this._zoomstart,
    	      zoomend: this._reset
    	    };

    	    return events;
    	  },

    	  addTo: function (map) {
    	    map.addLayer(this);
    	    return this;
    	  },

    	  removeFrom: function (map) {
    	    map.removeLayer(this);
    	    return this;
    	  },

    	  _zoomstart: function () {
    	    this._zooming = true;
    	  },

    	  _reset: function () {
    	    this._removeCells();

    	    this._cells = {};
    	    this._activeCells = {};
    	    this._cellsToLoad = 0;
    	    this._cellsTotal = 0;
    	    this._cellNumBounds = this._getCellNumBounds();

    	    this._resetWrap();
    	    this._zooming = false;
    	  },

    	  _resetWrap: function () {
    	    var map = this._map;
    	    var crs = map.options.crs;

    	    if (crs.infinite) { return; }

    	    var cellSize = this._getCellSize();

    	    if (crs.wrapLng) {
    	      this._wrapLng = [
    	        Math.floor(map.project([0, crs.wrapLng[0]]).x / cellSize),
    	        Math.ceil(map.project([0, crs.wrapLng[1]]).x / cellSize)
    	      ];
    	    }

    	    if (crs.wrapLat) {
    	      this._wrapLat = [
    	        Math.floor(map.project([crs.wrapLat[0], 0]).y / cellSize),
    	        Math.ceil(map.project([crs.wrapLat[1], 0]).y / cellSize)
    	      ];
    	    }
    	  },

    	  _getCellSize: function () {
    	    return this.options.cellSize;
    	  },

    	  _update: function () {
    	    if (!this._map) {
    	      return;
    	    }

    	    var bounds = this._map.getPixelBounds();
    	    var cellSize = this._getCellSize();

    	    // cell coordinates range for the current view
    	    var cellBounds = L$1__default.bounds(
    	      bounds.min.divideBy(cellSize).floor(),
    	      bounds.max.divideBy(cellSize).floor());

    	    this._removeOtherCells(cellBounds);
    	    this._addCells(cellBounds);

    	    this.fire('cellsupdated');
    	  },

    	  _addCells: function (bounds) {
    	    var queue = [];
    	    var center = bounds.getCenter();
    	    var zoom = this._map.getZoom();

    	    var j, i, coords;
    	    // create a queue of coordinates to load cells from
    	    for (j = bounds.min.y; j <= bounds.max.y; j++) {
    	      for (i = bounds.min.x; i <= bounds.max.x; i++) {
    	        coords = L$1__default.point(i, j);
    	        coords.z = zoom;

    	        if (this._isValidCell(coords)) {
    	          queue.push(coords);
    	        }
    	      }
    	    }

    	    var cellsToLoad = queue.length;

    	    if (cellsToLoad === 0) { return; }

    	    this._cellsToLoad += cellsToLoad;
    	    this._cellsTotal += cellsToLoad;

    	    // sort cell queue to load cells in order of their distance to center
    	    queue.sort(function (a, b) {
    	      return a.distanceTo(center) - b.distanceTo(center);
    	    });

    	    for (i = 0; i < cellsToLoad; i++) {
    	      this._addCell(queue[i]);
    	    }
    	  },

    	  _isValidCell: function (coords) {
    	    var crs = this._map.options.crs;

    	    if (!crs.infinite) {
    	      // don't load cell if it's out of bounds and not wrapped
    	      var bounds = this._cellNumBounds;
    	      if (
    	        (!crs.wrapLng && (coords.x < bounds.min.x || coords.x > bounds.max.x)) ||
    	        (!crs.wrapLat && (coords.y < bounds.min.y || coords.y > bounds.max.y))
    	      ) {
    	        return false;
    	      }
    	    }

    	    if (!this.options.bounds) {
    	      return true;
    	    }

    	    // don't load cell if it doesn't intersect the bounds in options
    	    var cellBounds = this._cellCoordsToBounds(coords);
    	    return L$1__default.latLngBounds(this.options.bounds).intersects(cellBounds);
    	  },

    	  // converts cell coordinates to its geographical bounds
    	  _cellCoordsToBounds: function (coords) {
    	    var map = this._map;
    	    var cellSize = this.options.cellSize;
    	    var nwPoint = coords.multiplyBy(cellSize);
    	    var sePoint = nwPoint.add([cellSize, cellSize]);
    	    var nw = map.wrapLatLng(map.unproject(nwPoint, coords.z));
    	    var se = map.wrapLatLng(map.unproject(sePoint, coords.z));

    	    return L$1__default.latLngBounds(nw, se);
    	  },

    	  // converts cell coordinates to key for the cell cache
    	  _cellCoordsToKey: function (coords) {
    	    return coords.x + ':' + coords.y;
    	  },

    	  // converts cell cache key to coordiantes
    	  _keyToCellCoords: function (key) {
    	    var kArr = key.split(':');
    	    var x = parseInt(kArr[0], 10);
    	    var y = parseInt(kArr[1], 10);

    	    return L$1__default.point(x, y);
    	  },

    	  // remove any present cells that are off the specified bounds
    	  _removeOtherCells: function (bounds) {
    	    for (var key in this._cells) {
    	      if (!bounds.contains(this._keyToCellCoords(key))) {
    	        this._removeCell(key);
    	      }
    	    }
    	  },

    	  _removeCell: function (key) {
    	    var cell = this._activeCells[key];

    	    if (cell) {
    	      delete this._activeCells[key];

    	      if (this.cellLeave) {
    	        this.cellLeave(cell.bounds, cell.coords);
    	      }

    	      this.fire('cellleave', {
    	        bounds: cell.bounds,
    	        coords: cell.coords
    	      });
    	    }
    	  },

    	  _removeCells: function () {
    	    for (var key in this._cells) {
    	      var bounds = this._cells[key].bounds;
    	      var coords = this._cells[key].coords;

    	      if (this.cellLeave) {
    	        this.cellLeave(bounds, coords);
    	      }

    	      this.fire('cellleave', {
    	        bounds: bounds,
    	        coords: coords
    	      });
    	    }
    	  },

    	  _addCell: function (coords) {
    	    // wrap cell coords if necessary (depending on CRS)
    	    this._wrapCoords(coords);

    	    // generate the cell key
    	    var key = this._cellCoordsToKey(coords);

    	    // get the cell from the cache
    	    var cell = this._cells[key];
    	    // if this cell should be shown as isnt active yet (enter)

    	    if (cell && !this._activeCells[key]) {
    	      if (this.cellEnter) {
    	        this.cellEnter(cell.bounds, coords);
    	      }

    	      this.fire('cellenter', {
    	        bounds: cell.bounds,
    	        coords: coords
    	      });

    	      this._activeCells[key] = cell;
    	    }

    	    // if we dont have this cell in the cache yet (create)
    	    if (!cell) {
    	      cell = {
    	        coords: coords,
    	        bounds: this._cellCoordsToBounds(coords)
    	      };

    	      this._cells[key] = cell;
    	      this._activeCells[key] = cell;

    	      if (this.createCell) {
    	        this.createCell(cell.bounds, coords);
    	      }

    	      this.fire('cellcreate', {
    	        bounds: cell.bounds,
    	        coords: coords
    	      });
    	    }
    	  },

    	  _wrapCoords: function (coords) {
    	    coords.x = this._wrapLng ? L$1__default.Util.wrapNum(coords.x, this._wrapLng) : coords.x;
    	    coords.y = this._wrapLat ? L$1__default.Util.wrapNum(coords.y, this._wrapLat) : coords.y;
    	  },

    	  // get the global cell coordinates range for the current zoom
    	  _getCellNumBounds: function () {
    	    var bounds = this._map.getPixelWorldBounds();
    	    var size = this._getCellSize();

    	    return bounds ? L$1__default.bounds(
    	        bounds.min.divideBy(size).floor(),
    	        bounds.max.divideBy(size).ceil().subtract([1, 1])) : null;
    	  }
    	});

    	function BinarySearchIndex (values) {
    	  this.values = [].concat(values || []);
    	}

    	BinarySearchIndex.prototype.query = function (value) {
    	  var index = this.getIndex(value);
    	  return this.values[index];
    	};

    	BinarySearchIndex.prototype.getIndex = function getIndex (value) {
    	  if (this.dirty) {
    	    this.sort();
    	  }

    	  var minIndex = 0;
    	  var maxIndex = this.values.length - 1;
    	  var currentIndex;
    	  var currentElement;

    	  while (minIndex <= maxIndex) {
    	    currentIndex = (minIndex + maxIndex) / 2 | 0;
    	    currentElement = this.values[Math.round(currentIndex)];
    	    if (+currentElement.value < +value) {
    	      minIndex = currentIndex + 1;
    	    } else if (+currentElement.value > +value) {
    	      maxIndex = currentIndex - 1;
    	    } else {
    	      return currentIndex;
    	    }
    	  }

    	  return Math.abs(~maxIndex);
    	};

    	BinarySearchIndex.prototype.between = function between (start, end) {
    	  var startIndex = this.getIndex(start);
    	  var endIndex = this.getIndex(end);

    	  if (startIndex === 0 && endIndex === 0) {
    	    return [];
    	  }

    	  while (this.values[startIndex - 1] && this.values[startIndex - 1].value === start) {
    	    startIndex--;
    	  }

    	  while (this.values[endIndex + 1] && this.values[endIndex + 1].value === end) {
    	    endIndex++;
    	  }

    	  if (this.values[endIndex] && this.values[endIndex].value === end && this.values[endIndex + 1]) {
    	    endIndex++;
    	  }

    	  return this.values.slice(startIndex, endIndex);
    	};

    	BinarySearchIndex.prototype.insert = function insert (item) {
    	  this.values.splice(this.getIndex(item.value), 0, item);
    	  return this;
    	};

    	BinarySearchIndex.prototype.bulkAdd = function bulkAdd (items, sort) {
    	  this.values = this.values.concat([].concat(items || []));

    	  if (sort) {
    	    this.sort();
    	  } else {
    	    this.dirty = true;
    	  }

    	  return this;
    	};

    	BinarySearchIndex.prototype.sort = function sort () {
    	  this.values.sort(function (a, b) {
    	    return +b.value - +a.value;
    	  }).reverse();
    	  this.dirty = false;
    	  return this;
    	};

    	var FeatureManager = VirtualGrid.extend({
    	  /**
    	   * Options
    	   */

    	  options: {
    	    attribution: null,
    	    where: '1=1',
    	    fields: ['*'],
    	    from: false,
    	    to: false,
    	    timeField: false,
    	    timeFilterMode: 'server',
    	    simplifyFactor: 0,
    	    precision: 6
    	  },

    	  /**
    	   * Constructor
    	   */

    	  initialize: function (options) {
    	    VirtualGrid.prototype.initialize.call(this, options);

    	    options = getUrlParams(options);
    	    options = L$1$$1.Util.setOptions(this, options);

    	    this.service = featureLayerService(options);
    	    this.service.addEventParent(this);

    	    // use case insensitive regex to look for common fieldnames used for indexing
    	    if (this.options.fields[0] !== '*') {
    	      var oidCheck = false;
    	      for (var i = 0; i < this.options.fields.length; i++) {
    	        if (this.options.fields[i].match(/^(OBJECTID|FID|OID|ID)$/i)) {
    	          oidCheck = true;
    	        }
    	      }
    	      if (oidCheck === false) {
    	        warn('no known esriFieldTypeOID field detected in fields Array.  Please add an attribute field containing unique IDs to ensure the layer can be drawn correctly.');
    	      }
    	    }

    	    if (this.options.timeField.start && this.options.timeField.end) {
    	      this._startTimeIndex = new BinarySearchIndex();
    	      this._endTimeIndex = new BinarySearchIndex();
    	    } else if (this.options.timeField) {
    	      this._timeIndex = new BinarySearchIndex();
    	    }

    	    this._cache = {};
    	    this._currentSnapshot = []; // cache of what layers should be active
    	    this._activeRequests = 0;
    	  },

    	  /**
    	   * Layer Interface
    	   */

    	  onAdd: function (map) {
    	    // include 'Powered by Esri' in map attribution
    	    setEsriAttribution(map);

    	    this.service.metadata(function (err, metadata) {
    	      if (!err) {
    	        var supportedFormats = metadata.supportedQueryFormats;

    	        // Check if someone has requested that we don't use geoJSON, even if it's available
    	        var forceJsonFormat = false;
    	        if (this.service.options.isModern === false) {
    	          forceJsonFormat = true;
    	        }

    	        // Unless we've been told otherwise, check to see whether service can emit GeoJSON natively
    	        if (!forceJsonFormat && supportedFormats && supportedFormats.indexOf('geoJSON') !== -1) {
    	          this.service.options.isModern = true;
    	        }

    	        // add copyright text listed in service metadata
    	        if (!this.options.attribution && map.attributionControl && metadata.copyrightText) {
    	          this.options.attribution = metadata.copyrightText;
    	          map.attributionControl.addAttribution(this.getAttribution());
    	        }
    	      }
    	    }, this);

    	    map.on('zoomend', this._handleZoomChange, this);

    	    return VirtualGrid.prototype.onAdd.call(this, map);
    	  },

    	  onRemove: function (map) {
    	    map.off('zoomend', this._handleZoomChange, this);

    	    return VirtualGrid.prototype.onRemove.call(this, map);
    	  },

    	  getAttribution: function () {
    	    return this.options.attribution;
    	  },

    	  /**
    	   * Feature Management
    	   */

    	  createCell: function (bounds, coords) {
    	    // dont fetch features outside the scale range defined for the layer
    	    if (this._visibleZoom()) {
    	      this._requestFeatures(bounds, coords);
    	    }
    	  },

    	  _requestFeatures: function (bounds, coords, callback) {
    	    this._activeRequests++;

    	    // our first active request fires loading
    	    if (this._activeRequests === 1) {
    	      this.fire('loading', {
    	        bounds: bounds
    	      }, true);
    	    }

    	    return this._buildQuery(bounds).run(function (error, featureCollection, response) {
    	      if (response && response.exceededTransferLimit) {
    	        this.fire('drawlimitexceeded');
    	      }

    	      // no error, features
    	      if (!error && featureCollection && featureCollection.features.length) {
    	        // schedule adding features until the next animation frame
    	        L$1$$1.Util.requestAnimFrame(L$1$$1.Util.bind(function () {
    	          this._addFeatures(featureCollection.features, coords);
    	          this._postProcessFeatures(bounds);
    	        }, this));
    	      }

    	      // no error, no features
    	      if (!error && featureCollection && !featureCollection.features.length) {
    	        this._postProcessFeatures(bounds);
    	      }

    	      if (error) {
    	        this._postProcessFeatures(bounds);
    	      }

    	      if (callback) {
    	        callback.call(this, error, featureCollection);
    	      }
    	    }, this);
    	  },

    	  _postProcessFeatures: function (bounds) {
    	    // deincrement the request counter now that we have processed features
    	    this._activeRequests--;

    	    // if there are no more active requests fire a load event for this view
    	    if (this._activeRequests <= 0) {
    	      this.fire('load', {
    	        bounds: bounds
    	      });
    	    }
    	  },

    	  _cacheKey: function (coords) {
    	    return coords.z + ':' + coords.x + ':' + coords.y;
    	  },

    	  _addFeatures: function (features, coords) {
    	    var key = this._cacheKey(coords);
    	    this._cache[key] = this._cache[key] || [];

    	    for (var i = features.length - 1; i >= 0; i--) {
    	      var id = features[i].id;

    	      if (this._currentSnapshot.indexOf(id) === -1) {
    	        this._currentSnapshot.push(id);
    	      }
    	      if (this._cache[key].indexOf(id) === -1) {
    	        this._cache[key].push(id);
    	      }
    	    }

    	    if (this.options.timeField) {
    	      this._buildTimeIndexes(features);
    	    }

    	    this.createLayers(features);
    	  },

    	  _buildQuery: function (bounds) {
    	    var query = this.service.query()
    	      .intersects(bounds)
    	      .where(this.options.where)
    	      .fields(this.options.fields)
    	      .precision(this.options.precision);

    	    if (this.options.requestParams) {
    	      L.extend(query.params, this.options.requestParams);
    	    }

    	    if (this.options.simplifyFactor) {
    	      query.simplify(this._map, this.options.simplifyFactor);
    	    }

    	    if (this.options.timeFilterMode === 'server' && this.options.from && this.options.to) {
    	      query.between(this.options.from, this.options.to);
    	    }

    	    return query;
    	  },

    	  /**
    	   * Where Methods
    	   */

    	  setWhere: function (where, callback, context) {
    	    this.options.where = (where && where.length) ? where : '1=1';

    	    var oldSnapshot = [];
    	    var newSnapshot = [];
    	    var pendingRequests = 0;
    	    var requestError = null;
    	    var requestCallback = L$1$$1.Util.bind(function (error, featureCollection) {
    	      if (error) {
    	        requestError = error;
    	      }

    	      if (featureCollection) {
    	        for (var i = featureCollection.features.length - 1; i >= 0; i--) {
    	          newSnapshot.push(featureCollection.features[i].id);
    	        }
    	      }

    	      pendingRequests--;

    	      if (pendingRequests <= 0 && this._visibleZoom()) {
    	        this._currentSnapshot = newSnapshot;
    	        // schedule adding features for the next animation frame
    	        L$1$$1.Util.requestAnimFrame(L$1$$1.Util.bind(function () {
    	          this.removeLayers(oldSnapshot);
    	          this.addLayers(newSnapshot);
    	          if (callback) {
    	            callback.call(context, requestError);
    	          }
    	        }, this));
    	      }
    	    }, this);

    	    for (var i = this._currentSnapshot.length - 1; i >= 0; i--) {
    	      oldSnapshot.push(this._currentSnapshot[i]);
    	    }

    	    for (var key in this._activeCells) {
    	      pendingRequests++;
    	      var coords = this._keyToCellCoords(key);
    	      var bounds = this._cellCoordsToBounds(coords);
    	      this._requestFeatures(bounds, key, requestCallback);
    	    }

    	    return this;
    	  },

    	  getWhere: function () {
    	    return this.options.where;
    	  },

    	  /**
    	   * Time Range Methods
    	   */

    	  getTimeRange: function () {
    	    return [this.options.from, this.options.to];
    	  },

    	  setTimeRange: function (from, to, callback, context) {
    	    var oldFrom = this.options.from;
    	    var oldTo = this.options.to;
    	    var pendingRequests = 0;
    	    var requestError = null;
    	    var requestCallback = L$1$$1.Util.bind(function (error) {
    	      if (error) {
    	        requestError = error;
    	      }
    	      this._filterExistingFeatures(oldFrom, oldTo, from, to);

    	      pendingRequests--;

    	      if (callback && pendingRequests <= 0) {
    	        callback.call(context, requestError);
    	      }
    	    }, this);

    	    this.options.from = from;
    	    this.options.to = to;

    	    this._filterExistingFeatures(oldFrom, oldTo, from, to);

    	    if (this.options.timeFilterMode === 'server') {
    	      for (var key in this._activeCells) {
    	        pendingRequests++;
    	        var coords = this._keyToCellCoords(key);
    	        var bounds = this._cellCoordsToBounds(coords);
    	        this._requestFeatures(bounds, key, requestCallback);
    	      }
    	    }

    	    return this;
    	  },

    	  refresh: function () {
    	    for (var key in this._activeCells) {
    	      var coords = this._keyToCellCoords(key);
    	      var bounds = this._cellCoordsToBounds(coords);
    	      this._requestFeatures(bounds, key);
    	    }

    	    if (this.redraw) {
    	      this.once('load', function () {
    	        this.eachFeature(function (layer) {
    	          this._redraw(layer.feature.id);
    	        }, this);
    	      }, this);
    	    }
    	  },

    	  _filterExistingFeatures: function (oldFrom, oldTo, newFrom, newTo) {
    	    var layersToRemove = (oldFrom && oldTo) ? this._getFeaturesInTimeRange(oldFrom, oldTo) : this._currentSnapshot;
    	    var layersToAdd = this._getFeaturesInTimeRange(newFrom, newTo);

    	    if (layersToAdd.indexOf) {
    	      for (var i = 0; i < layersToAdd.length; i++) {
    	        var shouldRemoveLayer = layersToRemove.indexOf(layersToAdd[i]);
    	        if (shouldRemoveLayer >= 0) {
    	          layersToRemove.splice(shouldRemoveLayer, 1);
    	        }
    	      }
    	    }

    	    // schedule adding features until the next animation frame
    	    L$1$$1.Util.requestAnimFrame(L$1$$1.Util.bind(function () {
    	      this.removeLayers(layersToRemove);
    	      this.addLayers(layersToAdd);
    	    }, this));
    	  },

    	  _getFeaturesInTimeRange: function (start, end) {
    	    var ids = [];
    	    var search;

    	    if (this.options.timeField.start && this.options.timeField.end) {
    	      var startTimes = this._startTimeIndex.between(start, end);
    	      var endTimes = this._endTimeIndex.between(start, end);
    	      search = startTimes.concat(endTimes);
    	    } else {
    	      search = this._timeIndex.between(start, end);
    	    }

    	    for (var i = search.length - 1; i >= 0; i--) {
    	      ids.push(search[i].id);
    	    }

    	    return ids;
    	  },

    	  _buildTimeIndexes: function (geojson) {
    	    var i;
    	    var feature;
    	    if (this.options.timeField.start && this.options.timeField.end) {
    	      var startTimeEntries = [];
    	      var endTimeEntries = [];
    	      for (i = geojson.length - 1; i >= 0; i--) {
    	        feature = geojson[i];
    	        startTimeEntries.push({
    	          id: feature.id,
    	          value: new Date(feature.properties[this.options.timeField.start])
    	        });
    	        endTimeEntries.push({
    	          id: feature.id,
    	          value: new Date(feature.properties[this.options.timeField.end])
    	        });
    	      }
    	      this._startTimeIndex.bulkAdd(startTimeEntries);
    	      this._endTimeIndex.bulkAdd(endTimeEntries);
    	    } else {
    	      var timeEntries = [];
    	      for (i = geojson.length - 1; i >= 0; i--) {
    	        feature = geojson[i];
    	        timeEntries.push({
    	          id: feature.id,
    	          value: new Date(feature.properties[this.options.timeField])
    	        });
    	      }

    	      this._timeIndex.bulkAdd(timeEntries);
    	    }
    	  },

    	  _featureWithinTimeRange: function (feature) {
    	    if (!this.options.from || !this.options.to) {
    	      return true;
    	    }

    	    var from = +this.options.from.valueOf();
    	    var to = +this.options.to.valueOf();

    	    if (typeof this.options.timeField === 'string') {
    	      var date = +feature.properties[this.options.timeField];
    	      return (date >= from) && (date <= to);
    	    }

    	    if (this.options.timeField.start && this.options.timeField.end) {
    	      var startDate = +feature.properties[this.options.timeField.start];
    	      var endDate = +feature.properties[this.options.timeField.end];
    	      return ((startDate >= from) && (startDate <= to)) || ((endDate >= from) && (endDate <= to));
    	    }
    	  },

    	  _visibleZoom: function () {
    	    // check to see whether the current zoom level of the map is within the optional limit defined for the FeatureLayer
    	    if (!this._map) {
    	      return false;
    	    }
    	    var zoom = this._map.getZoom();
    	    if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
    	      return false;
    	    } else { return true; }
    	  },

    	  _handleZoomChange: function () {
    	    if (!this._visibleZoom()) {
    	      this.removeLayers(this._currentSnapshot);
    	      this._currentSnapshot = [];
    	    } else {
    	      /*
    	      for every cell in this._activeCells
    	        1. Get the cache key for the coords of the cell
    	        2. If this._cache[key] exists it will be an array of feature IDs.
    	        3. Call this.addLayers(this._cache[key]) to instruct the feature layer to add the layers back.
    	      */
    	      for (var i in this._activeCells) {
    	        var coords = this._activeCells[i].coords;
    	        var key = this._cacheKey(coords);
    	        if (this._cache[key]) {
    	          this.addLayers(this._cache[key]);
    	        }
    	      }
    	    }
    	  },

    	  /**
    	   * Service Methods
    	   */

    	  authenticate: function (token) {
    	    this.service.authenticate(token);
    	    return this;
    	  },

    	  metadata: function (callback, context) {
    	    this.service.metadata(callback, context);
    	    return this;
    	  },

    	  query: function () {
    	    return this.service.query();
    	  },

    	  _getMetadata: function (callback) {
    	    if (this._metadata) {
    	      var error;
    	      callback(error, this._metadata);
    	    } else {
    	      this.metadata(L$1$$1.Util.bind(function (error, response) {
    	        this._metadata = response;
    	        callback(error, this._metadata);
    	      }, this));
    	    }
    	  },

    	  addFeature: function (feature, callback, context) {
    	    this._getMetadata(L$1$$1.Util.bind(function (error, metadata) {
    	      if (error) {
    	        if (callback) { callback.call(this, error, null); }
    	        return;
    	      }

    	      this.service.addFeature(feature, L$1$$1.Util.bind(function (error, response) {
    	        if (!error) {
    	          // assign ID from result to appropriate objectid field from service metadata
    	          feature.properties[metadata.objectIdField] = response.objectId;

    	          // we also need to update the geojson id for createLayers() to function
    	          feature.id = response.objectId;
    	          this.createLayers([feature]);
    	        }

    	        if (callback) {
    	          callback.call(context, error, response);
    	        }
    	      }, this));
    	    }, this));
    	  },

    	  updateFeature: function (feature, callback, context) {
    	    this.service.updateFeature(feature, function (error, response) {
    	      if (!error) {
    	        this.removeLayers([feature.id], true);
    	        this.createLayers([feature]);
    	      }

    	      if (callback) {
    	        callback.call(context, error, response);
    	      }
    	    }, this);
    	  },

    	  deleteFeature: function (id, callback, context) {
    	    this.service.deleteFeature(id, function (error, response) {
    	      if (!error && response.objectId) {
    	        this.removeLayers([response.objectId], true);
    	      }
    	      if (callback) {
    	        callback.call(context, error, response);
    	      }
    	    }, this);
    	  },

    	  deleteFeatures: function (ids, callback, context) {
    	    return this.service.deleteFeatures(ids, function (error, response) {
    	      if (!error && response.length > 0) {
    	        for (var i = 0; i < response.length; i++) {
    	          this.removeLayers([response[i].objectId], true);
    	        }
    	      }
    	      if (callback) {
    	        callback.call(context, error, response);
    	      }
    	    }, this);
    	  }
    	});

    	var FeatureLayer = FeatureManager.extend({

    	  options: {
    	    cacheLayers: true
    	  },

    	  /**
    	   * Constructor
    	   */
    	  initialize: function (options) {
    	    FeatureManager.prototype.initialize.call(this, options);
    	    this._originalStyle = this.options.style;
    	    this._layers = {};
    	  },

    	  /**
    	   * Layer Interface
    	   */

    	  onRemove: function (map) {
    	    for (var i in this._layers) {
    	      map.removeLayer(this._layers[i]);
    	      // trigger the event when the entire featureLayer is removed from the map
    	      this.fire('removefeature', {
    	        feature: this._layers[i].feature,
    	        permanent: false
    	      }, true);
    	    }

    	    return FeatureManager.prototype.onRemove.call(this, map);
    	  },

    	  createNewLayer: function (geojson) {
    	    var layer = L$1$$1.GeoJSON.geometryToLayer(geojson, this.options);
    	    layer.defaultOptions = layer.options;
    	    return layer;
    	  },

    	  _updateLayer: function (layer, geojson) {
    	    // convert the geojson coordinates into a Leaflet LatLng array/nested arrays
    	    // pass it to setLatLngs to update layer geometries
    	    var latlngs = [];
    	    var coordsToLatLng = this.options.coordsToLatLng || L$1$$1.GeoJSON.coordsToLatLng;

    	    // copy new attributes, if present
    	    if (geojson.properties) {
    	      layer.feature.properties = geojson.properties;
    	    }

    	    switch (geojson.geometry.type) {
    	      case 'Point':
    	        latlngs = L$1$$1.GeoJSON.coordsToLatLng(geojson.geometry.coordinates);
    	        layer.setLatLng(latlngs);
    	        break;
    	      case 'LineString':
    	        latlngs = L$1$$1.GeoJSON.coordsToLatLngs(geojson.geometry.coordinates, 0, coordsToLatLng);
    	        layer.setLatLngs(latlngs);
    	        break;
    	      case 'MultiLineString':
    	        latlngs = L$1$$1.GeoJSON.coordsToLatLngs(geojson.geometry.coordinates, 1, coordsToLatLng);
    	        layer.setLatLngs(latlngs);
    	        break;
    	      case 'Polygon':
    	        latlngs = L$1$$1.GeoJSON.coordsToLatLngs(geojson.geometry.coordinates, 1, coordsToLatLng);
    	        layer.setLatLngs(latlngs);
    	        break;
    	      case 'MultiPolygon':
    	        latlngs = L$1$$1.GeoJSON.coordsToLatLngs(geojson.geometry.coordinates, 2, coordsToLatLng);
    	        layer.setLatLngs(latlngs);
    	        break;
    	    }
    	  },

    	  /**
    	   * Feature Management Methods
    	   */

    	  createLayers: function (features) {
    	    for (var i = features.length - 1; i >= 0; i--) {
    	      var geojson = features[i];

    	      var layer = this._layers[geojson.id];
    	      var newLayer;

    	      if (this._visibleZoom() && layer && !this._map.hasLayer(layer)) {
    	        this._map.addLayer(layer);
    	        this.fire('addfeature', {
    	          feature: layer.feature
    	        }, true);
    	      }

    	      // update geometry if necessary
    	      if (layer && this.options.simplifyFactor > 0 && (layer.setLatLngs || layer.setLatLng)) {
    	        this._updateLayer(layer, geojson);
    	      }

    	      if (!layer) {
    	        newLayer = this.createNewLayer(geojson);
    	        newLayer.feature = geojson;

    	        // bubble events from individual layers to the feature layer
    	        newLayer.addEventParent(this);

    	        if (this.options.onEachFeature) {
    	          this.options.onEachFeature(newLayer.feature, newLayer);
    	        }

    	        // cache the layer
    	        this._layers[newLayer.feature.id] = newLayer;

    	        // style the layer
    	        this.setFeatureStyle(newLayer.feature.id, this.options.style);

    	        this.fire('createfeature', {
    	          feature: newLayer.feature
    	        }, true);

    	        // add the layer if the current zoom level is inside the range defined for the layer, it is within the current time bounds or our layer is not time enabled
    	        if (this._visibleZoom() && (!this.options.timeField || (this.options.timeField && this._featureWithinTimeRange(geojson)))) {
    	          this._map.addLayer(newLayer);
    	        }
    	      }
    	    }
    	  },

    	  addLayers: function (ids) {
    	    for (var i = ids.length - 1; i >= 0; i--) {
    	      var layer = this._layers[ids[i]];
    	      if (layer) {
    	        this._map.addLayer(layer);
    	      }
    	    }
    	  },

    	  removeLayers: function (ids, permanent) {
    	    for (var i = ids.length - 1; i >= 0; i--) {
    	      var id = ids[i];
    	      var layer = this._layers[id];
    	      if (layer) {
    	        this.fire('removefeature', {
    	          feature: layer.feature,
    	          permanent: permanent
    	        }, true);
    	        this._map.removeLayer(layer);
    	      }
    	      if (layer && permanent) {
    	        delete this._layers[id];
    	      }
    	    }
    	  },

    	  cellEnter: function (bounds, coords) {
    	    if (this._visibleZoom() && !this._zooming && this._map) {
    	      L$1$$1.Util.requestAnimFrame(L$1$$1.Util.bind(function () {
    	        var cacheKey = this._cacheKey(coords);
    	        var cellKey = this._cellCoordsToKey(coords);
    	        var layers = this._cache[cacheKey];
    	        if (this._activeCells[cellKey] && layers) {
    	          this.addLayers(layers);
    	        }
    	      }, this));
    	    }
    	  },

    	  cellLeave: function (bounds, coords) {
    	    if (!this._zooming) {
    	      L$1$$1.Util.requestAnimFrame(L$1$$1.Util.bind(function () {
    	        if (this._map) {
    	          var cacheKey = this._cacheKey(coords);
    	          var cellKey = this._cellCoordsToKey(coords);
    	          var layers = this._cache[cacheKey];
    	          var mapBounds = this._map.getBounds();
    	          if (!this._activeCells[cellKey] && layers) {
    	            var removable = true;

    	            for (var i = 0; i < layers.length; i++) {
    	              var layer = this._layers[layers[i]];
    	              if (layer && layer.getBounds && mapBounds.intersects(layer.getBounds())) {
    	                removable = false;
    	              }
    	            }

    	            if (removable) {
    	              this.removeLayers(layers, !this.options.cacheLayers);
    	            }

    	            if (!this.options.cacheLayers && removable) {
    	              delete this._cache[cacheKey];
    	              delete this._cells[cellKey];
    	              delete this._activeCells[cellKey];
    	            }
    	          }
    	        }
    	      }, this));
    	    }
    	  },

    	  /**
    	   * Styling Methods
    	   */

    	  resetStyle: function () {
    	    this.options.style = this._originalStyle;
    	    this.eachFeature(function (layer) {
    	      this.resetFeatureStyle(layer.feature.id);
    	    }, this);
    	    return this;
    	  },

    	  setStyle: function (style) {
    	    this.options.style = style;
    	    this.eachFeature(function (layer) {
    	      this.setFeatureStyle(layer.feature.id, style);
    	    }, this);
    	    return this;
    	  },

    	  resetFeatureStyle: function (id) {
    	    var layer = this._layers[id];
    	    var style = this._originalStyle || L.Path.prototype.options;
    	    if (layer) {
    	      L$1$$1.Util.extend(layer.options, layer.defaultOptions);
    	      this.setFeatureStyle(id, style);
    	    }
    	    return this;
    	  },

    	  setFeatureStyle: function (id, style) {
    	    var layer = this._layers[id];
    	    if (typeof style === 'function') {
    	      style = style(layer.feature);
    	    }
    	    if (layer.setStyle) {
    	      layer.setStyle(style);
    	    }
    	    return this;
    	  },

    	  /**
    	   * Utility Methods
    	   */

    	  eachActiveFeature: function (fn, context) {
    	    // figure out (roughly) which layers are in view
    	    if (this._map) {
    	      var activeBounds = this._map.getBounds();
    	      for (var i in this._layers) {
    	        if (this._currentSnapshot.indexOf(this._layers[i].feature.id) !== -1) {
    	          // a simple point in poly test for point geometries
    	          if (typeof this._layers[i].getLatLng === 'function' && activeBounds.contains(this._layers[i].getLatLng())) {
    	            fn.call(context, this._layers[i]);
    	          } else if (typeof this._layers[i].getBounds === 'function' && activeBounds.intersects(this._layers[i].getBounds())) {
    	            // intersecting bounds check for polyline and polygon geometries
    	            fn.call(context, this._layers[i]);
    	          }
    	        }
    	      }
    	    }
    	    return this;
    	  },

    	  eachFeature: function (fn, context) {
    	    for (var i in this._layers) {
    	      fn.call(context, this._layers[i]);
    	    }
    	    return this;
    	  },

    	  getFeature: function (id) {
    	    return this._layers[id];
    	  },

    	  bringToBack: function () {
    	    this.eachFeature(function (layer) {
    	      if (layer.bringToBack) {
    	        layer.bringToBack();
    	      }
    	    });
    	  },

    	  bringToFront: function () {
    	    this.eachFeature(function (layer) {
    	      if (layer.bringToFront) {
    	        layer.bringToFront();
    	      }
    	    });
    	  },

    	  redraw: function (id) {
    	    if (id) {
    	      this._redraw(id);
    	    }
    	    return this;
    	  },

    	  _redraw: function (id) {
    	    var layer = this._layers[id];
    	    var geojson = layer.feature;

    	    // if this looks like a marker
    	    if (layer && layer.setIcon && this.options.pointToLayer) {
    	      // update custom symbology, if necessary
    	      if (this.options.pointToLayer) {
    	        var getIcon = this.options.pointToLayer(geojson, L$1$$1.latLng(geojson.geometry.coordinates[1], geojson.geometry.coordinates[0]));
    	        var updatedIcon = getIcon.options.icon;
    	        layer.setIcon(updatedIcon);
    	      }
    	    }

    	    // looks like a vector marker (circleMarker)
    	    if (layer && layer.setStyle && this.options.pointToLayer) {
    	      var getStyle = this.options.pointToLayer(geojson, L$1$$1.latLng(geojson.geometry.coordinates[1], geojson.geometry.coordinates[0]));
    	      var updatedStyle = getStyle.options;
    	      this.setFeatureStyle(geojson.id, updatedStyle);
    	    }

    	    // looks like a path (polygon/polyline)
    	    if (layer && layer.setStyle && this.options.style) {
    	      this.resetStyle(geojson.id);
    	    }
    	  }
    	});

    	function featureLayer (options) {
    	  return new FeatureLayer(options);
    	}

    	exports.VERSION = version;
    	exports.Support = Support;
    	exports.options = options;
    	exports.Util = EsriUtil;
    	exports.get = get;
    	exports.post = xmlHttpPost;
    	exports.request = request;
    	exports.Task = Task;
    	exports.task = task;
    	exports.Query = Query;
    	exports.query = query;
    	exports.Find = Find;
    	exports.find = find;
    	exports.Identify = Identify;
    	exports.identify = identify;
    	exports.IdentifyFeatures = IdentifyFeatures;
    	exports.identifyFeatures = identifyFeatures;
    	exports.IdentifyImage = IdentifyImage;
    	exports.identifyImage = identifyImage;
    	exports.Service = Service;
    	exports.service = service;
    	exports.MapService = MapService;
    	exports.mapService = mapService;
    	exports.ImageService = ImageService;
    	exports.imageService = imageService;
    	exports.FeatureLayerService = FeatureLayerService;
    	exports.featureLayerService = featureLayerService;
    	exports.BasemapLayer = BasemapLayer;
    	exports.basemapLayer = basemapLayer;
    	exports.TiledMapLayer = TiledMapLayer;
    	exports.tiledMapLayer = tiledMapLayer;
    	exports.RasterLayer = RasterLayer;
    	exports.ImageMapLayer = ImageMapLayer;
    	exports.imageMapLayer = imageMapLayer;
    	exports.DynamicMapLayer = DynamicMapLayer;
    	exports.dynamicMapLayer = dynamicMapLayer;
    	exports.FeatureManager = FeatureManager;
    	exports.FeatureLayer = FeatureLayer;
    	exports.featureLayer = featureLayer;

    }));

    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

    function featurePopupTemplate(feature) {

        var props = Object.keys(feature.properties);

        var pFn = function pFn(list, names) {
            if (!list || !list.find) return null;
            var match = list.find(function (name) {
                var lc = name.toLowerCase();
                return names.indexOf(lc) >= 0;
            });
            return match;
        };

        var titleProp = pFn(props, ['title', 'name', 'label']);
        var title = titleProp ? feature.properties[titleProp] : "Untitled";

        var descProp = pFn(props, ['description', 'summary', 'descript']);
        var description = descProp ? feature.properties[descProp] : "No description provided";

        var result = '<div class="feature-popup">' + '<h5>' + title + '</h5>' + '<p>' + description + '</p>';

        if (feature.properties.modified) {
            var modified = new Date(feature.properties.modified);
            result += '<div><span class="label">Updated</span><span class="value">' + modified.toDateString() + '</span></div>';
        }

        if (feature.properties['cap:effective']) {
            var date = new Date(feature.properties['cap:effective']);
            result += '<div>' + '<span class="label">Effective</span>' + '<span class="value">' + date.toDateString() + ' ' + date.toTimeString() + '</span>' + '</div>';
        }
        if (feature.properties['cap:expires']) {
            var _date = new Date(feature.properties['cap:expires']);
            result += '<div>' + '<span class="label">Expires</span>' + '<span class="value">' + _date.toDateString() + ' ' + _date.toTimeString() + '</span>' + '</div>';
        }

        var linkProp = pFn(props, ['landingpage', 'link', 'website']);
        if (linkProp) {
            result += '<br>';
            result += '<a href="' + feature.properties[linkProp] + '" target="_blank">link</a>';
        }

        result += '<hr>';

        for (var prop in feature.properties) {
            if (titleProp === prop || descProp === prop || linkProp === prop || 'modified' === prop) continue;
            var value = feature.properties[prop];
            if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
                for (var p in value) {
                    result += '<div>' + '<span class="label">' + prop + '.' + p + '</span>' + '<span class="value">' + value[p] + '</span>' + '</div>';
                }
            } else {
                result += '<div>' + '<span class="label">' + prop + '</span>' + '<span class="value">' + value + '</span>' + '</div>';
            }
        }
        result += '</div>';
        return result;
    }

    /**
     * Feature Layer
     * Provides custom style loading and point-ilization as well
     * as adding visibility and opacity manipulation methods
     * @extends L.esri.FeatureLayer
     */
    var FeatureLayer = undefined({

        _gpStyle: { color: "#00f", weight: 2, fillColor: '#00f', fillOpacity: 0.3 },

        /**
         * @param {object} feature - GeoJSON Point Feature
         * @param {L.LatLng} latlng
         * @return {L.Marker}
         */
        pointToLayerFn: function pointToLayerFn(feature, latlng) {

            // console.log("Feature: " + feature.id);

            var style = feature && feature.properties ? feature.properties.style : null;
            if (!style && typeof this.options.style === 'function') {
                // console.log("Using local style function");
                try {
                    style = this.options.style(feature);
                } catch (e) {
                    console.log("error using style function in ClusteredFeatureLayer: " + e.message);
                }
            }

            style = style || this.options.style || {};

            var marker = null;
            if (style.shape === 'image') {
                var width = style.width || 16;
                var height = style.height || 16;
                var icon = L$1.icon({
                    iconUrl: style.content, //base64 encoded string
                    iconSize: [width, height],
                    iconAnchor: [width * 0.5, height * 0.5],
                    popupAnchor: [0, -11]
                });
                var mopts = { icon: icon };
                if (GeoPlatformClient.Config.leafletPane) mopts.pane = GeoPlatformClient.Config.leafletPane;
                marker = L$1.marker(latlng, mopts);
            } else {
                style.radius = style.radius || style['stroke-width'] || 4;
                style.weight = style.weight || style['stroke-width'] || 2;
                style.color = style.color || style.stroke || '#03f';
                style.opacity = style.opacity || style['stroke-opacity'] || 0.9;
                style.fillOpacity = style.opacity || style['fill-opacity'] || 0.3;
                style.fillColor = style.color || style.fill;
                style.renderer = this.options.renderer; //important for pane!
                marker = L$1.circleMarker(latlng, style);
            }

            var popupTemplate = this.options.popupTemplate || featurePopupTemplate;
            marker.bindPopup(popupTemplate(feature));
            return marker;
        },

        /**
         * for all non-point features, bind a popup
         * @param {object} feature - GeoJSON feature
         * @param {L.Layer} layer - layer representing feature
         */
        eachFeatureFn: function eachFeatureFn(feature, layer) {
            if (!feature || !feature.geometry || feature.geometry.type === 'Point') {
                return;
            }
            layer.bindPopup(featurePopupTemplate(feature));
        },

        initialize: function initialize(options) {
            var _this = this;
            options = options || {};

            if (GeoPlatformClient.Config.leafletPane) options.pane = GeoPlatformClient.Config.leafletPane;

            var getGPStyle = function getGPStyle() {
                return _this._gpStyle;
            };
            options.style = options.style || getGPStyle();

            //in order to put features-based layers into same pane as tile layers,
            // must specify renderer and set desired pane on that
            var svgOpts = {};
            if (GeoPlatformClient.Config.leafletPane) svgOpts.pane = GeoPlatformClient.Config.leafletPane;
            var renderer = L$1.SVG && L$1.svg(svgOpts) || L$1.Canvas && L$1.canvas();
            options.renderer = renderer;

            options.pointToLayer = L$1.bind(this.pointToLayerFn, this);
            options.onEachFeature = L$1.bind(this.eachFeatureFn, this);

            // options.fields = ['FID', 'type', 'title', 'geometry'];

            FeatureLayer.prototype.initialize.call(this, options);

            this.on('load', function () {
                if (typeof this.options.zIndex !== 'undefined') this.setZIndex(this.options.zIndex);
            });
        },

        setZIndex: function setZIndex(index) {
            this.options.zIndex = index;
            for (var id in this._layers) {
                this._layers[id].setZIndex(index);
            }
        },

        toggleVisibility: function toggleVisibility() {
            for (var id in this._layers) {
                var layer = this._layers[id];
                if (layer.toggleVisibility) this._layers[id].toggleVisibility();
            }
        },

        setOpacity: function setOpacity(opacity) {
            for (var id in this._layers) {
                var layer = this._layers[id];
                if (layer.setOpacity) layer.setOpacity(opacity);
            }
        },

        loadStyle: function loadStyle(gpLayerId) {
            var _this2 = this;

            if (this.options.styleLoader) {
                this.options.styleLoader(gpLayerId).then(function (json) {

                    if (!json) return;

                    var style = null;

                    if (json && json.styles) {

                        var styleFn = L$1.Util.bind(function (feature) {

                            var property = this.property || this.field1;
                            var v = feature[property] || (feature.properties ? feature.properties[property] : null);
                            var style = null;
                            if (this.styles) {
                                var wrapper = this.styles.find(function (sw) {
                                    return sw.value === v;
                                });
                                if (wrapper) {
                                    style = wrapper.style;
                                    style.radius = style.radius || style['stroke-width'] || 4;
                                    style.weight = style.weight || style['stroke-width'] || 2;
                                    style.color = style.color || style.stroke || '#03f';
                                    style.opacity = style.opacity || style['stroke-opacity'] || 0.9;
                                    style.fillOpacity = style.opacity || style['fill-opacity'] || 0.3;
                                    style.fillColor = style.color || style.fill;
                                }
                            }
                            // console.log("Using style: " + JSON.stringify(style));
                            return style;
                        }, json);
                        _this2.options.style = styleFn;
                        _this2.setStyle(styleFn);
                        return;
                    } else if (json && typeof json.push !== 'undefined') {
                        //multiple styles returned
                        style = json[0]; //use first for now
                    } else if (json) {
                        style = json;
                    } else {
                        return; //unrecognizable style
                    }

                    if (style.shape) {
                        var obj = jQuery.extend({}, style);
                        obj.style = style;
                        _this2._gpStyle = style;

                        //setStyle on Cluster.FeatureLayer doesn't appear to work consistently for
                        // non-clustered features.
                        // this.setStyle(obj);
                        //So instead, we manually set it on all features of the layer (that aren't clustered)
                        for (var id in _this2._layers) {
                            _this2._layers[id].setStyle(obj);
                        }
                    }
                }).catch(function (e) {
                    console.log("Error fetching feature layer style");
                    console.log(e);
                });
            }
        }

    });

    var FeatureLayer$1 = undefined({

      statics: {
        EVENTS: 'click dblclick mouseover mouseout mousemove contextmenu popupopen popupclose',
        CLUSTEREVENTS: 'clusterclick clusterdblclick clustermouseover clustermouseout clustermousemove clustercontextmenu'
      },

      /**
       * Constructor
       */

      initialize: function initialize(options) {
        undefined(this, options);

        options = L$1.setOptions(this, options);

        this._layers = {};
        this._leafletIds = {};

        this.cluster = L$1.markerClusterGroup(options);
        this._key = 'c' + (Math.random() * 1e9).toString(36).replace('.', '_');

        this.cluster.addEventParent(this);
      },

      /**
       * Layer Interface
       */

      onAdd: function onAdd(map) {
        undefined(this, map);
        this._map.addLayer(this.cluster);

        // NOTE !!!!!!!
        // Using this type of layer requires map.maxZoom to be set during map creation!
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      },

      onRemove: function onRemove(map) {
        undefined(this, map);
        this._map.removeLayer(this.cluster);
      },

      /**
       * Feature Management Methods
       */

      createLayers: function createLayers(features) {
        var markers = [];

        for (var i = features.length - 1; i >= 0; i--) {
          var geojson = features[i];
          var layer = this._layers[geojson.id];

          if (!layer) {
            var newLayer = L$1.GeoJSON.geometryToLayer(geojson, this.options);
            newLayer.feature = L$1.GeoJSON.asFeature(geojson);
            newLayer.defaultOptions = newLayer.options;
            newLayer._leaflet_id = this._key + '_' + geojson.id;

            this.resetStyle(newLayer.feature.id);

            // cache the layer
            this._layers[newLayer.feature.id] = newLayer;

            this._leafletIds[newLayer._leaflet_id] = geojson.id;

            if (this.options.onEachFeature) {
              this.options.onEachFeature(newLayer.feature, newLayer);
            }

            this.fire('createfeature', {
              feature: newLayer.feature
            });

            // add the layer if it is within the time bounds or our layer is not time enabled
            if (!this.options.timeField || this.options.timeField && this._featureWithinTimeRange(geojson)) {
              markers.push(newLayer);
            }
          }
        }

        if (markers.length) {
          this.cluster.addLayers(markers);
        }
      },

      addLayers: function addLayers(ids) {
        var layersToAdd = [];
        for (var i = ids.length - 1; i >= 0; i--) {
          var layer = this._layers[ids[i]];
          this.fire('addfeature', {
            feature: layer.feature
          });
          layersToAdd.push(layer);
        }
        this.cluster.addLayers(layersToAdd);
      },

      removeLayers: function removeLayers(ids, permanent) {
        var layersToRemove = [];
        for (var i = ids.length - 1; i >= 0; i--) {
          var id = ids[i];
          var layer = this._layers[id];
          this.fire('removefeature', {
            feature: layer.feature,
            permanent: permanent
          });
          layersToRemove.push(layer);
          if (this._layers[id] && permanent) {
            delete this._layers[id];
          }
        }
        this.cluster.removeLayers(layersToRemove);
      },

      /**
       * Styling Methods
       */

      resetStyle: function resetStyle(id) {
        var layer = this._layers[id];

        if (layer) {
          layer.options = layer.defaultOptions;
          this.setFeatureStyle(layer.feature.id, this.options.style);
        }

        return this;
      },

      setStyle: function setStyle(style) {
        this.eachFeature(function (layer) {
          this.setFeatureStyle(layer.feature.id, style);
        }, this);
        return this;
      },

      setFeatureStyle: function setFeatureStyle(id, style) {
        var layer = this._layers[id];

        if (typeof style === 'function') {
          style = style(layer.feature);
        }
        if (layer.setStyle) {
          layer.setStyle(style);
        }
      },

      /**
       * Utility Methods
       */

      eachFeature: function eachFeature(fn, context) {
        for (var i in this._layers) {
          fn.call(context, this._layers[i]);
        }
        return this;
      },

      getFeature: function getFeature(id) {
        return this._layers[id];
      }
    });

    function featureLayer(options) {
      return new FeatureLayer$1(options);
    }

    /**
     * Fetches style information from GeoPlatform UAL
     * @param {string} id - identifier of layer to resolve style for
     */
    function featureStyleResolver(id) {
        var deferred = Q.defer();
        jQuery.ajax({
            url: GeoPlatformClient.Config.ualUrl + '/api/layers/' + id + '/style',
            dataType: 'json',
            success: function success(data) {
                deferred.resolve(data);
            },
            error: function error(xhr, status, message) {
                var em = 'FeatureStyleResolver() -\n               Error loading style information for layer ' + id + ' : ' + message;
                var error = new Error(em);
                deferred.reject(error);
            }
        });
        return deferred.promise;
    }

    /**
     * Clustered Feature Layer
     * Provides custom style loading and point-ilization as well
     * as adding visibility and opacity manipulation methods
     * @extends L.esri.ClusterFeatureLayer
     */
    var ClusteredFeatureLayer = FeatureLayer$1.extend({

        _gpStyle: { color: "#00f", weight: 2, fillColor: '#00f', fillOpacity: 0.3 },

        /**
         * @param {object} feature - GeoJSON Point Feature
         * @param {L.LatLng} latlng
         * @return {L.Marker}
         */
        pointToLayerFn: function pointToLayerFn(feature, latlng) {

            var style = feature && feature.properties ? feature.properties.style : null;
            if (!style && typeof this.options.style === 'function') {
                // console.log("Using local style function");
                try {
                    style = this.options.style(feature);
                } catch (e) {
                    console.log("error using style function in ClusteredFeatureLayer: " + e.message);
                }
            }

            style = style || this.options.style || {};
            style.radius = style['stroke-width'] || style.radius || 4;
            style.weight = style['stroke-width'] || style.weight || 2;
            style.color = style.stroke || style.color || '#03f';
            style.opacity = style['stroke-opacity'] || style.opacity || 0.9;
            style.fillOpacity = style['fill-opacity'] || style.opacity || 0.3;
            style.fillColor = style.fill || style.color || '#03f';
            style.renderer = this.options.renderer; //important for pane!

            var marker = null;
            if (style.shape === 'image') {
                var width = style.width || 16;
                var height = style.height || 16;
                var icon = L$1.icon({
                    iconUrl: style.content, //base64 encoded string
                    iconSize: [width, height],
                    iconAnchor: [width * 0.5, height * 0.5],
                    popupAnchor: [0, -11]
                });
                var mopts = { icon: icon };
                if (GeoPlatformClient.Config.leafletPane) mopts.pane = GeoPlatformClient.Config.leafletPane;
                marker = L$1.marker(latlng, mopts);
            } else {
                marker = L$1.circleMarker(latlng, style);
            }

            var popupTemplate = this.options.popupTemplate || featurePopupTemplate;
            marker.bindPopup(popupTemplate(feature));

            return marker;
        },

        /**
         * for all non-point features, bind a popup
         * @param {object} feature - GeoJSON feature
         * @param {L.Layer} layer - layer representing feature
         */
        eachFeatureFn: function eachFeatureFn(feature, layer) {
            if (!feature || !feature.geometry || feature.geometry.type === 'Point') {
                return;
            }
            layer.bindPopup(featurePopupTemplate(feature));
        },

        initialize: function initialize(options) {
            var _this = this;

            options = options || {};

            if (GeoPlatformClient.Config.leafletPane) options.pane = GeoPlatformClient.Config.leafletPane;

            options.pointToLayer = L$1.bind(this.pointToLayerFn, this);
            options.onEachFeature = L$1.bind(this.eachFeatureFn, this);
            // options.fields = ['FID', 'type', 'title', 'geometry'];

            //Increase from 1 to increase the distance away from the center that spiderfied markers are placed.
            // This needs to be increased to ensure all markers can be clicked
            // when spiderfied (some get stuck under the spider legs)
            options.spiderfyDistanceMultiplier = 2;

            var getGPStyle = function getGPStyle() {
                return _this._gpStyle;
            };
            options.style = options.style || getGPStyle;
            if (options.styleResolver) {
                this.styleResolver = options.styleResolver;
            }

            //in order to put features-based layers into same pane as tile layers,
            // must specify renderer and set desired pane on that
            var svgOpts = {};
            if (GeoPlatformClient.Config.leafletPane) svgOpts.pane = GeoPlatformClient.Config.leafletPane;
            var renderer = L$1.SVG && L$1.svg(svgOpts) || L$1.Canvas && L$1.canvas();
            options.renderer = renderer;

            FeatureLayer$1.prototype.initialize.call(this, options);

            this.on('load', function () {
                if (typeof this.options.zIndex !== 'undefined') this.setZIndex(this.options.zIndex);
            });
        },

        onAdd: function onAdd(map) {
            FeatureLayer$1.prototype.onAdd.call(this, map);

            if (this.options.layerId) {
                this.loadStyle(this.options.layerId);
            }
        },

        setZIndex: function setZIndex(index) {
            this.options.zIndex = index;
            for (var id in this._layers) {
                this._layers[id].setZIndex(index);
            }
        },

        toggleVisibility: function toggleVisibility() {

            //clustered features
            if (this.cluster && this.cluster._featureGroup && this.cluster._featureGroup._layers) {
                for (var id in this.cluster._featureGroup._layers) {
                    var layer = this.cluster._featureGroup._layers[id];
                    if (layer._icon) {
                        jQuery(layer._icon).toggleClass('invisible');
                    }
                }
            }

            //non-clustered features
            if (this._layers) {
                for (var _id in this._layers) {
                    this._layers[_id].toggleVisibility();
                }
            }
        },

        setVisibility: function setVisibility(bool) {

            //clustered features
            if (this.cluster && this.cluster._featureGroup && this.cluster._featureGroup._layers) {
                for (var id in this.cluster._featureGroup._layers) {
                    var layer = this.cluster._featureGroup._layers[id];
                    if (layer._icon) {
                        //probably is a more efficient way to do this,
                        // but this works currently.
                        // TODO look at using
                        //  markerCluster.refreshIconOptions({className:'invisible'});
                        var icon = jQuery(layer._icon);
                        if (bool) icon.removeClass('invisible');else icon.addClass('invisible');
                    }
                }
            }

            //non-clustered features
            if (this._layers) {
                for (var _id2 in this._layers) {
                    var _layer = this._layers[_id2];
                    if (_layer.setVisibility) _layer.setVisibility(bool);else if (_layer.setStyle) _layer.setStyle({ display: bool ? '' : 'none' });
                }
            }
        },

        setOpacity: function setOpacity(opacity) {

            //clustered features
            if (this.cluster && this.cluster._featureGroup && this.cluster._featureGroup._layers) {
                for (var id in this.cluster._featureGroup._layers) {
                    var layer = this.cluster._featureGroup._layers[id];
                    if (layer._icon) {
                        jQuery(layer._icon).css({ opacity: opacity });
                    }
                }
            }

            //non-clustered features
            if (this._layers) {
                for (var _id3 in this._layers) {
                    var _layer2 = this._layers[_id3];
                    if (_layer2.setOpacity) _layer2.setOpacity(opacity);
                }
            }
        },

        setStyle: function setStyle(style) {
            this.eachFeature(function (layer) {
                this.setFeatureStyle(layer.feature.id, style);
            }, this);
        },

        loadStyle: function loadStyle(gpLayerId) {
            var _this2 = this;

            if (this.options.styleLoader) {
                this.options.styleLoader(gpLayerId).then(function (json) {

                    if (!json) return;

                    var style = null;

                    if (json && json.styles) {

                        var styleFn = L$1.Util.bind(function (feature) {

                            var property = this.property || this.field1;
                            var v = feature[property] || (feature.properties ? feature.properties[property] : null);
                            var style = null;
                            if (this.styles) {
                                var wrapper = this.styles.find(function (sw) {
                                    return sw.value === v;
                                });
                                if (wrapper) {
                                    style = wrapper.style;
                                    style.radius = style['stroke-width'] || style.radius || 4;
                                    style.weight = style['stroke-width'] || style.weight || 2;
                                    style.color = style.stroke || style.color || '#03f';
                                    style.opacity = style['stroke-opacity'] || style.opacity || 0.9;
                                    style.fillOpacity = style['fill-opacity'] || style.opacity || 0.3;
                                    style.fillColor = style.fill || style.color || '#03f';
                                } else {
                                    console.log("No matching style for " + JSON.stringify(feature.properties));
                                }
                            }
                            // console.log("Using style: " + JSON.stringify(style));
                            return style;
                        }, json);
                        _this2.options.style = styleFn;
                        setTimeout(function (layer, style) {
                            layer.setStyle(style);
                        }, 1000, _this2, styleFn);
                        return;
                    } else if (json && typeof json.push !== 'undefined') {
                        //multiple styles returned
                        style = json[0]; //use first for now
                    } else if (json) {
                        style = json;
                    } else {
                        return; //unrecognizable style
                    }

                    if (style.shape) {
                        var obj = jQuery.extend({}, style);
                        obj.style = style;
                        _this2._gpStyle = style;

                        //setStyle on Cluster.FeatureLayer doesn't appear to work consistently for
                        // non-clustered features.
                        // this.setStyle(obj);
                        //So instead, we manually set it on all features of the layer (that aren't clustered)
                        for (var id in _this2._layers) {
                            _this2._layers[id].setStyle(obj);
                        }
                    }
                }).catch(function (e) {
                    console.log("Error fetching feature layer style");
                    console.log(e);
                });
            }
        }
    });

    function clusteredFeatures(layer) {

        var service = layer.services && layer.services.length ? layer.services[0] : null;
        if (!service) {
            var msg = "clusteredFeatures() -\n                  Cannot create leaflet layer for GP Layer:\n                  layer has no service";
            throw new Error(msg);
        }

        var url = service.href,
            format = layer.supportedFormats ? layer.supportedFormats[0] : null;

        var opts = {
            url: url + '/' + layer.layerName,
            styleLoader: featureStyleResolver,
            layerId: layer.id
        };
        if (GeoPlatformClient.Config.leafletPane) opts.pane = GeoPlatformClient.Config.leafletPane;
        return new ClusteredFeatureLayer(opts);
    }

    function geoJsonFeed(layer) {

        var service = layer.services && layer.services.length ? layer.services[0] : null;
        if (!service) {
            var msg = "geoJsonFeed() -\n                  Cannot create leaflet layer for GP Layer:\n                  layer has no service";
            throw new Error(msg);
        }

        var url = service.href,
            format = layer.supportedFormats ? layer.supportedFormats[0] : null;

        var layerUrl = url + (url[url.length - 1] === '/' ? '' : '/') + layer.id + '/FeatureServer/' + layer.layerName;

        var styleUrl = url.replace('feeds', 'styles') + (url[url.length - 1] === '/' ? '' : '/') + layer.id;

        var styleLoaderFactory = function styleLoaderFactory(url) {
            return function (layerId) {
                var deferred = Q.defer();
                jQuery.ajax(url, {
                    dataType: 'json',
                    success: function success(data) {
                        deferred.resolve(data);
                    },
                    error: function error(xhr, status, message) {
                        var em = "geoJsonFeed() -\n                        Error loading style information for layer " + layerId + " : " + message;
                        var error = new Error(em);
                        deferred.reject(error);
                    }
                });
                return deferred.promise; //uses jQuery promise
            };
        };

        var opts = {
            url: layerUrl,
            isModern: true, //force to use GeoJSON
            layerId: layer.id, //used by style loader
            styleLoader: styleLoaderFactory(styleUrl)
        };
        if (GeoPlatformClient.Config.leafletPane) opts.pane = GeoPlatformClient.Config.leafletPane;
        return new ClusteredFeatureLayer(opts);
    }

    var WMS = L$1.TileLayer.WMS.extend({

        enableGetFeatureInfo: function enableGetFeatureInfo() {
            this._map.on('click', this.getFeatureInfo, this);
            this._enabled = true;
        },

        disableGetFeatureInfo: function disableGetFeatureInfo() {
            this._map.off('click', this.getFeatureInfo, this);
            this._enabled = false;
        },

        isGetFeatureInfoEnabled: function isGetFeatureInfoEnabled() {
            return this._enabled;
        },

        onRemove: function onRemove(map) {

            //if GFI is enabled, disable it before removing
            if (this.isGetFeatureInfoEnabled()) this.disableGetFeatureInfo();

            // Triggered when the layer is removed from a map.
            //   Unregister a click listener, then do all the upstream WMS things
            L$1.TileLayer.WMS.prototype.onRemove.call(this, map);
        },

        getFeatureInfo: function getFeatureInfo(evt) {
            // Make an AJAX request to the server and hope for the best
            var url = this.getFeatureInfoUrl(evt.latlng),
                showResults = L$1.Util.bind(this.showGetFeatureInfo, this),
                parseGetFeatureInfo = this.parseGetFeatureInfo;
            jQuery.ajax({
                url: url,
                success: function success(data, status, xhr) {
                    // var err = typeof data === 'string' ? null : data;
                    if (typeof data !== 'string') data = parseGetFeatureInfo(data);
                    showResults(null, evt.latlng, data);
                },
                error: function error(xhr, status, _error) {
                    showResults(_error);
                }
            });
        },

        getFeatureInfoUrl: function getFeatureInfoUrl(latlng) {
            // Construct a GetFeatureInfo request URL given a point
            var point = this._map.latLngToContainerPoint(latlng, this._map.getZoom()),
                size = this._map.getSize(),
                params = {
                srs: 'EPSG:4326',
                bbox: this._map.getBounds().toBBoxString(),
                height: size.y,
                width: size.x,
                // layers: this.wmsParams.layers,
                // query_layers: this.wmsParams.layers,
                info_format: 'text/xml',
                x: point.x,
                y: point.y,
                i: point.x, //1.3.0
                j: point.y //1.3.0
            };

            // return this._url + Util.getParamString(params, this._url, true);
            var url = '/api/layers/' + this.wmsParams.wmvId + '/feature';
            return GeoPlatformClient.Config.ualUrl + url + L$1.Util.getParamString(params, url, true);
        },

        parseGetFeatureInfo: function parseGetFeatureInfo(content) {
            var fields = [];
            for (var field in content) {
                fields.push(['<div><strong>', field, ': </strong>', content[field], '</div>'].join(' '));
            }
            if (fields.length == 0) fields.push('<em>No data available</em>');
            return '<div>' + fields.join(' ') + '</div>';
        },

        showGetFeatureInfo: function showGetFeatureInfo(err, latlng, content) {
            if (err) {
                console.log(err);return;
            } // do nothing if there's an error

            // Otherwise show the content in a popup, or something.
            L$1.popup({ maxWidth: 800 }).setLatLng(latlng).setContent(content).openOn(this._map);
        }

    });

    function wms(layer) {

        var service = layer.services && layer.services.length ? layer.services[0] : null;
        if (!service) {
            var msg = "wms() -\n                  Cannot create leaflet layer for GP Layer:\n                  layer has no service";
            throw new Error(msg);
        }

        var url = service.href;
        var formats = layer.supportedFormats || [];
        var format = formats.length ? formats[0] : "image/png";

        var opts = {
            layers: layer.layerName,
            transparent: true,
            format: format,
            wmvId: layer.id
        };
        if (GeoPlatformClient.Config.leafletPane) opts.pane = GeoPlatformClient.Config.leafletPane;

        return new WMS(url, opts);
    }

    var WMST = L$1.TimeDimension.Layer.WMS.extend({

        //override default parser to query all Layers (whether queryable or not)
        _parseTimeDimensionFromCapabilities: function _parseTimeDimensionFromCapabilities(xml) {
            var layers = xml.querySelectorAll('Layer');
            var layerName = this._baseLayer.wmsParams.layers;
            var layer = null;
            var times = null;

            layers.forEach(function (current) {
                if (current.querySelector("Name").innerHTML === layerName) {
                    layer = current;
                }
            });
            if (layer) {
                times = this._getTimesFromLayerCapabilities(layer);
                if (!times) {
                    times = this._getTimesFromLayerCapabilities(layer.parentNode);
                }
            }

            return times;
        },

        //override default parser to fall back if Dimension is provided but has no values
        _getTimesFromLayerCapabilities: function _getTimesFromLayerCapabilities(layer) {
            var times = null;
            var dimensions = layer.querySelectorAll("Dimension[name='time']");
            if (dimensions && dimensions.length && dimensions[0].textContent.length) {
                times = dimensions[0].textContent.trim();
            }
            if (!times || !times.length) {
                var extents = layer.querySelectorAll("Extent[name='time']");
                if (extents && extents.length && extents[0].textContent.length) {
                    times = extents[0].textContent.trim();
                }
            }
            if (times && ~times.indexOf("current")) {
                times = times.replace('current', new Date().toISOString());
            }
            return times;
        }

    });

    function wmst(gpLayer) {

        var service = gpLayer.services[0];
        var url = service.href;

        var opts = {
            layers: gpLayer.layerName,
            transparent: true,
            format: "image/png",
            wmvId: gpLayer.layerId
        };
        if (GeoPlatformClient.Config.leafletPane) opts.pane = GeoPlatformClient.Config.leafletPane;

        var leafletLayer = new L$1.TileLayer.CustomWMS(url, opts);

        var proxyUrl = GeoPlatformClient.Config.ualUrl + '/api/services/' + service.id + '/proxy/capabilities';

        var tdOpts = {};

        if (gpLayer.temporal) {

            var d1 = gpLayer.temporal.startDate ? new Date(gpLayer.temporal.startDate) : new Date();
            var d2 = gpLayer.temporal.endDate ? new Date(gpLayer.temporal.endDate) : new Date();

            tdOpts.times = d1.toISOString() + '/' + d2.toISOString() + '/P1D';
        }

        return new WMST(leafletLayer, {
            timeDimension: L$1.timeDimension(tdOpts),
            proxy: proxyUrl
        });
    }

    L$1.TileLayer.WMST = WMST;
    L$1.tileLayer.wmst = wmst;

    if (typeof Object.assign != 'function') {
        // Must be writable: true, enumerable: false, configurable: true
        Object.defineProperty(Object, "assign", {
            value: function assign(target, varArgs) {

                if (target == null) {
                    // TypeError if undefined or null
                    throw new TypeError('Cannot convert undefined or null to object');
                }

                var to = Object(target);

                for (var index = 1; index < arguments.length; index++) {
                    var nextSource = arguments[index];

                    if (nextSource != null) {
                        // Skip over if undefined or null
                        for (var nextKey in nextSource) {
                            // Avoid bugs when hasOwnProperty is shadowed
                            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                                to[nextKey] = nextSource[nextKey];
                            }
                        }
                    }
                }
                return to;
            },
            writable: true,
            configurable: true
        });
    }

    var paramRe = /\{ *([\w_-]+) *\}/g;

    // @function template(str: String, data: Object): String
    // Simple templating facility, accepts a template string of the form `'Hello {a}, {b}'`
    // and a data object like `{a: 'foo', b: 'bar'}`, returns evaluated string
    // `('Hello foo, bar')`. You can also specify functions instead of strings for
    // data values — they will be evaluated passing `data` as an argument.
    function template(str, data) {
        return str.replace(paramRe, function (str, key) {
            var value = data[key];
            if (value === undefined) {
                value = data[key.toLowerCase()];
            }
            if (value === undefined) {
                throw new Error('No value provided for variable ' + str);
            } else if (typeof value === 'function') {
                value = value(data);
            }
            return value;
        });
    }

    /*
     * inspired by and uses code from https://github.com/mylen/leaflet.TileLayer.WMTS
     */
    var WMTS = L$1.TileLayer.extend({

        defaultWmtsParams: {

            service: 'WMTS',
            request: 'GetTile',
            version: '1.0.0',
            layers: '',
            styles: '',
            tileMatrixSet: '',
            format: 'image/png'
        },

        initialize: function initialize(url, options) {
            // (String, Object)
            this._url = url;
            var wmtsParams = L$1.extend({}, this.defaultWmtsParams);
            var tileSize = options.tileSize || this.options.tileSize;
            if (options.detectRetina && L$1.Browser.retina) {
                wmtsParams.width = wmtsParams.height = tileSize * 2;
            } else {
                wmtsParams.width = wmtsParams.height = tileSize;
            }
            for (var i in options) {
                // all keys that are not TileLayer options go to WMTS params
                if (!this.options.hasOwnProperty(i) && i != "matrixIds") {
                    wmtsParams[i] = options[i];
                }
            }
            this.wmtsParams = wmtsParams;
            this.matrixIds = options.matrixIds || this.getDefaultMatrix();
            L$1.setOptions(this, options);
        },

        onAdd: function onAdd(map) {
            this._crs = this.options.crs || map.options.crs;
            L$1.TileLayer.prototype.onAdd.call(this, map);
        },

        getTileUrl: function getTileUrl(coords) {
            // (Point, Number) -> String
            var tileSize = this.options.tileSize;
            var nwPoint = coords.multiplyBy(tileSize);
            nwPoint.x += 1;
            nwPoint.y -= 1;
            var sePoint = nwPoint.add(new L$1.Point(tileSize, tileSize));
            var zoom = this._tileZoom;
            var nw = this._crs.project(this._map.unproject(nwPoint, zoom));
            var se = this._crs.project(this._map.unproject(sePoint, zoom));
            var tilewidth = se.x - nw.x;
            //zoom = this._map.getZoom();
            var ident = this.matrixIds[zoom].identifier;
            var tileMatrix = this.wmtsParams.tileMatrixSet + ":" + ident;
            var X0 = this.matrixIds[zoom].topLeftCorner.lng;
            var Y0 = this.matrixIds[zoom].topLeftCorner.lat;
            var tilecol = Math.floor((nw.x - X0) / tilewidth);
            var tilerow = -Math.floor((nw.y - Y0) / tilewidth);

            var url = this._url;
            var isTileMatrixTemplated = url.indexOf('{TileMatrix}');
            var isTileRowTemplated = url.indexOf('{TileRow}');
            var isTileColTemplated = url.indexOf('{TileCol}');

            var o = Object.assign({ s: this._getSubdomain(coords) }, this.wmtsParams);
            if (isTileMatrixTemplated > 0) o.TileMatrix = ident;
            if (isTileRowTemplated > 0) o.TileRow = tilerow;
            if (isTileColTemplated > 0) o.TileCol = tilecol;
            for (var k in o) {
                o[k.toLowerCase()] = o[k];
            }
            // url = Util.template(url.toLowerCase(), o);
            url = template(url, o);

            var qsi = url.indexOf("?");
            if (qsi < 0 || isTileMatrixTemplated < qsi && isTileRowTemplated < qsi || isTileColTemplated < qsi) {
                //if the TM,TR,TC variables are templated but not as querystring parameters
                // (ie, no '?' present or those params are before the '?'),
                // then the URL must not be OGC WMTS, so no need for WMTS parameters

            } else {
                url = url + L$1.Util.getParamString(this.wmtsParams, url);
                if (isTileMatrixTemplated < 0) url += "&TileMatrix=" + ident; //tileMatrixSet
                if (isTileRowTemplated < 0) url += "&TileRow=" + tilerow;
                if (isTileColTemplated < 0) url += "&TileCol=" + tilecol;
            }

            return url;
        },

        setParams: function setParams(params, noRedraw) {
            L$1.extend(this.wmtsParams, params);
            if (!noRedraw) {
                this.redraw();
            }
            return this;
        },

        getDefaultMatrix: function getDefaultMatrix() {
            /**
             * the matrix3857 represents the projection
             * for in the IGN WMTS for the google coordinates.
             */
            var matrixIds3857 = new Array(22);
            for (var i = 0; i < 22; i++) {
                matrixIds3857[i] = {
                    identifier: "" + i,
                    topLeftCorner: new L$1.LatLng(20037508.3428, -20037508.3428)
                };
            }
            return matrixIds3857;
        }
    });

    function wmts(layer) {

        var url = layer.services && layer.services.length ? layer.services[0].href : null;

        var options = {
            layer: layer.layerName,
            style: 'default',
            tileMatrixSet: "default",
            format: "image/png"
        };
        if (GeoPlatformClient.Config.leafletPane) options.pane = GeoPlatformClient.Config.leafletPane;

        var distro = (layer.distributions || []).find(function (dist) {
            //ensure dist isn't 'null'
            return dist && dist.href && (dist.mediaType === 'image/png' || dist.mediaType === 'image/jpeg');
        });
        if (distro) {
            url = distro.href;
            options.format = distro.mediaType;

            var params = distro.parameters || [];
            params.each(function (param) {
                var value = param.defaultValue || param.values && param.values.length && param.values[0];
                if (value !== null && value !== undefined) {
                    url = url.replace('{' + param.name + '}', value);
                }
            });
        } else {
            throw new Error("WTMS Layer - layer " + layer.id + " has no distribution(s) usable to make WMTS requests");
        }

        if (!url) throw new Error("WTMS Layer - unable to determine WMTS URL for layer " + layer.id);

        return new WMTS(url, options);
    }

    L$1.TileLayer.WMTS = WMTS;
    L$1.tileLayer.wmts = wmts;

    var esriTileLayer = L$1.TileLayer.extend({

        defaultESRIParams: {
            layers: '', //=show:0,1,2
            transparent: true,
            format: 'png32',
            // srs:          '4326',
            // bboxsr:       '4326',
            // bbox:         null,
            // size:         '256,256',
            f: 'image'
            // imagesr:      '4326'
        },

        initialize: function initialize(url, options) {
            // (String, Object)

            if (url.indexOf("/export") < 0) {
                var qidx = url.indexOf("?");
                if (qidx > 0) {
                    url = url.substring(0, qidx) + '/export' + url.substring(qidx);
                } else {
                    url += '/export';
                }
            }
            this._url = url;

            var esriParams = L$1.extend({}, this.defaultESRIParams),
                tileSize = options.tileSize || this.options.tileSize;

            var dim = void 0;
            if (options.detectRetina && L$1.Browser.retina) {
                dim = esriParams.height = tileSize * 2;
            } else {
                dim = esriParams.height = tileSize;
            }
            esriParams.size = dim + ',' + dim;

            for (var i in options) {
                // all keys that are not TileLayer options go to WMS params
                if (!this.options.hasOwnProperty(i) && i !== 'crs') {
                    esriParams[i] = options[i];
                }
            }

            //layer ids
            // esriParams.layers = "show:" + esriParams.layers;

            this.esriParams = esriParams;

            L$1.setOptions(this, options);
        },

        onAdd: function onAdd(map) {
            this._crs = this.options.crs || map.options.crs;
            this.esriParams.srs = this.esriParams.imagesr = this.esriParams.bboxsr = this._crs.code;
            L$1.TileLayer.prototype.onAdd.call(this, map);
        },

        getTileUrl: function getTileUrl(tilePoint) {
            // (Point, Number) -> String

            var map = this._map,
                tileSize = this.options.tileSize,
                nwPoint = tilePoint.multiplyBy(tileSize),
                sePoint = nwPoint.add([tileSize, tileSize]),
                nw = this._crs.project(map.unproject(nwPoint, tilePoint.z)),
                se = this._crs.project(map.unproject(sePoint, tilePoint.z)),
                bbox = [nw.x, se.y, se.x, nw.y].join(','),
                url = L$1.Util.template(this._url, { s: this._getSubdomain(tilePoint) });

            var params = L$1.extend({}, this.esriParams);
            params.layers = "show:" + params.layers;

            //convert to esri-special SR for spherical mercator
            if (params.bboxsr === 'EPSG:3857') params.bboxsr = '102100';
            if (params.imagesr === 'EPSG:3857') params.imagesr = '102100';

            return url + L$1.Util.getParamString(params, url, true) + '&BBOX=' + bbox;
        },

        setParams: function setParams(params, noRedraw) {
            L$1.extend(this.esriParams, params);
            if (!noRedraw) {
                this.redraw();
            }
            return this;
        }
    });

    L$1.TileLayer.ESRI = esriTileLayer;
    L$1.tileLayer.esri = function (url, options) {
        return new L$1.TileLayer.ESRI(url, options);
    };

    /**
     * @param {Object} layer - GeoPlatform Layer
     * @return {L.TileLayer}
     */
    function OSMLayerFactory(layer) {

        return new L$1.TileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            minZoom: 1, maxZoom: 19,
            attribution: 'Map data (c) <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
        });
    }

    /**
     * @param {Object} layer - GeoPlatform Layer object
     * @return {L.Layer} Leaflet layer instance
     */
    var LayerFactory = function LayerFactory(layer) {

        if (!layer) {
            throw new Error("\n            L.GeoPlatform.LayerFactory() -\n            Invalid argument: must provide a layer object\n        ");
        }

        //OSM layers have no "services" so we have to treat them differently
        if (OSM.test(layer)) {
            return OSMLayerFactory();
        }

        if (!layer.services || !layer.services.length) {
            throw new Error("\n            L.GeoPlatform.LayerFactory() -\n            Cannot create Leaflet layer for GP Layer " + layer.id + ",\n            layer has no services defined!\n        ");
        }

        var service = layer.services[0],
            url = service.href,
            typeUri = service.serviceType ? service.serviceType.uri : null,
            srs = layer.supportedCRS ? layer.supportedCRS[0] : null,
            format = layer.supportedFormats ? layer.supportedFormats[0] : null,
            opts = {};

        if (typeUri === null) {
            console.log("LayerFactory() - Could not create Leaflet layer for " + "GeoPlatform Layer with Service of unspecified service type");
            return null;
        }

        if (types.ESRI_MAP_SERVER && types.ESRI_MAP_SERVER.uri === typeUri) {
            opts = {
                layers: layer.layerName,
                transparent: true,
                format: format || "png32"
            };
            if (srs) opts.srs = srs;
            if (GeoPlatformClient.Config.leafletPane) opts.pane = GeoPlatformClient.Config.leafletPane;
            return new esriTileLayer(url, opts);
        } else if (types.ESRI_FEATURE_SERVER && types.ESRI_FEATURE_SERVER.uri === typeUri) {
            return clusteredFeatures(layer);
        } else if (types.ESRI_TILE_SERVER && types.ESRI_TILE_SERVER.uri === typeUri) {
            opts = { url: url, useCors: true };
            if (GeoPlatformClient.Config.leafletPane) opts.pane = GeoPlatformClient.Config.leafletPane;
            return L$1.esri.tiledMapLayer(opts);
        } else if (types.ESRI_IMAGE_SERVER && types.ESRI_IMAGE_SERVER.uri === typeUri) {
            opts = { url: url, useCors: true };
            if (GeoPlatformClient.Config.leafletPane) opts.pane = GeoPlatformClient.Config.leafletPane;
            return L$1.esri.imageMapLayer(opts);
        } else if (types.FEED && types.FEED.uri === typeUri) {
            return geoJsonFeed(layer);
        } else if (types.WMS && types.WMS.uri === typeUri) {
            return wms(layer);
        } else if (types.WMST && types.WMST.uri === typeUri) {
            return wmst(layer);
        } else if (types.WMTS && types.WMTS.uri === typeUri) {
            return wmts(layer);
        } else {
            console.log("LayerFactory() - Could not create Leaflet layer for " + "GeoPlatform Layer with service type: " + typeUri);
            return null;
        }
    };

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    var ItemTypes = GeoPlatformClient__default.ItemTypes;
    var ServiceFactory = GeoPlatformClient__default.ServiceFactory;
    var HttpClient$3 = GeoPlatformClient__default.JQueryHttpClient;
    var Config$2 = GeoPlatformClient__default.Config;

    var Listener = function () {
        function Listener() {
            _classCallCheck(this, Listener);

            //listeners to be unregistered upon destroy
            this._listeners = {};
        }

        _createClass(Listener, [{
            key: "on",
            value: function on(type, listener) {
                if (!this._listeners[type]) this._listeners[type] = [];
                this._listeners[type].push(listener);
            }
        }, {
            key: "off",
            value: function off(type, listener) {
                if (!type) this._listeners = {};
                if (!this._listeners[type]) return;
                if (!listener) this._listeners[type] = [];else {
                    var idx = this._listeners[type].indexOf(listener);
                    if (idx >= 0) this._listeners[type].splice(idx, 1);
                }
            }
        }, {
            key: "notify",
            value: function notify(type) {
                if (!this._listeners[type]) return;
                var args = Array.prototype.slice.call(arguments, 1);
                this._listeners[type].each(function (l) {
                    l.apply(null, args);
                });
            }
        }]);

        return Listener;
    }();

    var MapInstance = function (_Listener) {
        _inherits(MapInstance, _Listener);

        function MapInstance(key) {
            _classCallCheck(this, MapInstance);

            var _this = _possibleConstructorReturn(this, (MapInstance.__proto__ || Object.getPrototypeOf(MapInstance)).call(this));

            _this.setHttpClient(new HttpClient$3());
            _this.setServiceFactory(ServiceFactory);

            //generate random key (see factory below)
            _this._key = key || Math.ceil(Math.random() * 9999);

            //registry id of current map if available
            _this._mapId = null, _this._mapDef = _this.initializeMapDefinition(), _this._mapInstance = null, _this._defaultExtent = null, _this._baseLayerDef = null, _this._baseLayer = null, _this._layerStates = [], _this._layerCache = {}, _this._layerErrors = [], _this._layerErrorHandler = function (e) {
                console.log("MapInstance.defaultLayerErrorHandler() - " + e.id + " : " + e.message);
            }, _this._featureLayer = null, _this._featureLayerVisible = true, _this._tools = [], _this.state = { dirty: false }; // jshint ignore:line


            _this._geoJsonLayerOpts = {
                style: function style(feature) {
                    if (feature.properties.style) return feature.properties.style;
                },
                onEachFeature: function onEachFeature(feature, layer) {

                    var style = { weight: 2, color: '#03f', opacity: 0.9, radius: 4, fillColor: '#03f', fillOpacity: 0.5 };
                    if (~feature.geometry.type.indexOf('Point')) {
                        style.fillOpacity = 0.9;
                    }

                    var props = feature.properties = feature.properties || {};
                    feature.properties.id = Math.floor(Math.random() * 999999);
                    feature.properties.label = props.label || props.title || props.name || "Untitled " + feature.geometry.type + " Feature";
                    feature.properties.description = props.description || props.desc || "This feature needs a description!";
                    feature.properties.style = props.style || style;

                    layer.bindTooltip(props.label);
                    /*
                    toggle: setLabelNoHide(bool)
                    it may only exist on markers!
                    */
                },
                pointToLayer: function pointToLayer(feature, latlng) {

                    var style = feature.properties.style || {};
                    style.radius = style.radius || 4;
                    style.weight = style.weight || 2;
                    style.color = style.color || '#03f';
                    style.opacity = style.opacity || 0.9;
                    style.fillOpacity = style.opacity;
                    style.fillColor = style.color;

                    if (!L) {
                        throw new Error("Leaflet is not available");
                    }
                    return L$1.circleMarker(latlng, style);
                }
            };

            return _this;
        }

        _createClass(MapInstance, [{
            key: "dispose",
            value: function dispose() {
                this.destroyMap();
                this.svcCache = null;
                this.serviceFactory = null;
                this.httpClient = null;
                this._key = null;
                this._mapId = null;
                this._mapDef = null;
                this._mapInstance = null;
                this._defaultExtent = null;
                this._baseLayerDef = null;
                this._baseLayer = null;
                this._layerStates = null;
                this._layerCache = null;
                this._layerErrors = null;
                this._featureLayer = null;
                this._featureLayerVisible = true;
                this._tools = null;
                this.state = null;
                this._geoJsonLayerOpts = null;
            }
        }, {
            key: "getKey",
            value: function getKey() {
                return this._key;
            }

            /**
             * Override default (JQuery-based) map service used by this instance
             * @param {ItemService} mapService - service to use to CRUD map objects
             * @deprecated use setServiceFactory instead
             */

        }, {
            key: "setService",
            value: function setService(mapService) {}
            // this.mapService = mapService;


            /**
             * @param {ServiceFactory} factory - GeoPlatform ServiceFactory to instantiate services for maps and layers
             */

        }, {
            key: "setServiceFactory",
            value: function setServiceFactory(factory) {
                this.svcCache = {}; //wipe out cached services
                this.serviceFactory = factory;
            }

            /**
             * @param {HttpClient} httpClient - HttpClient impl to use with the new factory
             */

        }, {
            key: "setHttpClient",
            value: function setHttpClient(httpClient) {
                this.svcCache = {}; //wipe out cached services
                this.httpClient = httpClient;
            }

            /**
             * @param {string} type - GeoPlatform Object model type to support ("Map", "Layer", etc)
             * @return {ItemService} item service implementation for the requested type
             */

        }, {
            key: "getService",
            value: function getService(type) {
                if (!this.svcCache[type]) this.svcCache[type] = this.serviceFactory(type, Config$2.ualUrl, this.httpClient);
                return this.svcCache[type];
            }

            /**
             * @param {Function} fn - callback when an error is encountered
             */

        }, {
            key: "setErrorHandler",
            value: function setErrorHandler(fn) {
                this._layerErrorHandler = fn;
            }

            //-----------------

        }, {
            key: "getLayerStateIndex",
            value: function getLayerStateIndex(layerId) {
                if (!layerId) return -1;
                for (var i = 0; i < this._layerStates.length; ++i) {
                    if (this._layerStates[i].layer && layerId === this._layerStates[i].layer.id) {
                        return i;
                    }
                }
                return -1;
                // return this._layerStates.indexOfObj(layerId, (id, state) => state.layer.id === id );
            }
        }, {
            key: "getLayerState",
            value: function getLayerState(layerId) {
                var index = this.getLayerStateIndex(layerId);
                return index >= 0 ? this._layerStates[index] : null;
            }
            //-----------------


        }, {
            key: "initializeMapDefinition",
            value: function initializeMapDefinition() {
                return {
                    type: ItemTypes.MAP,
                    title: "My New Map",
                    label: "My New Map",
                    description: "This map needs a description",
                    createdBy: null,
                    baseLayer: this._baseLayerDef,
                    layers: [],
                    keywords: [],
                    themes: [],
                    resourceTypes: ['http://www.geoplatform.gov/ont/openmap/GeoplatformMap']
                };
            }

            /**
             * @param metadata object
             * @return object definition of the current map suitable for sending to WMVR
             */

        }, {
            key: "getMapResourceContent",
            value: function getMapResourceContent(metadata) {

                metadata = metadata || {};

                //map layers
                metadata.layers = this._layerStates.slice(0);
                // ... UAL should support accepting just an id here, so we'll do just that
                metadata.baseLayer = this._baseLayerDef;

                metadata.annotations = this._featureLayer ? { title: "Map Features", geoJSON: this._featureLayer.toGeoJSON() } : null;

                //geographic extent
                var extent = this._mapInstance.getBounds();
                metadata.extent = {
                    minx: extent.getWest(),
                    miny: extent.getSouth(),
                    maxx: extent.getEast(),
                    maxy: extent.getNorth()
                };

                return metadata;
            }

            /**
             * @return Leaflet toolbar
             */

        }, {
            key: "getDrawControlToolbar",
            value: function getDrawControlToolbar() {
                if (!this._mapInstance.drawControl) return null;
                var toolbars = this._mapInstance.drawControl._toolbars;
                var toolbar = null;
                for (var key in toolbars) {
                    if (toolbars.hasOwnProperty(key)) {
                        if (toolbars[key]._modes) {
                            toolbar = toolbars[key];
                            break;
                        }
                    }
                }
                return toolbar;
            }

            /**
             * @param error Leaflet tile load error (.target is layer, .tile is image)
             */

        }, {
            key: "handleLayerError",
            value: function handleLayerError(error) {
                // console.log("MapInstance.handleLayerError() - " +
                //     "Layer's tile failed to load: " + error.tile.src);
                var layer = error.target;
                for (var id in this._layerCache) {
                    if (this._layerCache[id] === layer) {
                        this.processLayerError(error, id);
                        break;
                    }
                }
            }

            /**
             * Given a Leaflet tile load error and the responsible layer id,
             * Try to isolate the cause of the error using the proxy
             * and notify listeners that an error has occurred
             */

        }, {
            key: "processLayerError",
            value: function processLayerError(error, id) {
                var _this2 = this;

                var finder = function finder(l) {
                    return l.id === id;
                };

                if (!this._layerErrors.find(finder)) {

                    this.logLayerError(id, "Layer failed to completely load. " + "It may be inaccessible or misconfigured.");

                    var url = error.tile.src;
                    var params = { id: id };
                    url.substring(url.indexOf("?") + 1, url.length).split('&').each(function (param) {
                        var p = param.split('=');
                        params[p[0]] = p[1];
                    });

                    this.layerService.validate(id, params).catch(function (e) {
                        var def = _this2._layerStates.find(finder);
                        obj.message = "Layer '" + def.label + "' failed to completely load. " + "It may be inaccessible or misconfigured. Reported cause: " + e.message;
                        _this2.notify('layer:error', obj);
                    });
                }
            }

            /**
             * @param {string} layerId - identifier of layer generating the error
             * @param {string} errorMsg - message of the error
             */

        }, {
            key: "logLayerError",
            value: function logLayerError(layerId, errorMsg) {
                // console.log("MapInstance.logLayerError() - layer "  + id +
                //     " generated error '" + errorMsg + "'");
                var err = { id: layerId, message: errorMsg };
                this._layerErrors.push(err);
                if (this._layerErrorHandler) {
                    this._layerErrorHandler(err);
                }
            }

            /* -- State Management of internal model -- */

        }, {
            key: "touch",
            value: function touch(event) {
                this.state.dirty = true;
                if (event) {
                    if (arguments.length > 1) {
                        this.notify.apply(this, Array.prototype.slice.call(arguments));
                    } else this.notify(event);
                    // console.log("Dirtying map for " + event);
                }
                // else console.log("Dirtying map");
            }
        }, {
            key: "clean",
            value: function clean() {
                // console.log("Cleaning map");
                this.state.dirty = false;
            }
            /* --------------------------------------- */

            /* ==============================================
                Map manipulation operations
               ============================================== */

        }, {
            key: "setMap",
            value: function setMap(map) {
                this._mapInstance = map;
            }

            /**
             * @return {L.Map} map instance
             */

        }, {
            key: "getMap",
            value: function getMap() {
                return this._mapInstance;
            }

            /** @return {object} definition of map */

        }, {
            key: "getMapDefinition",
            value: function getMapDefinition() {
                return this._mapDef;
            }

            /** @return {string} identifier of map */

        }, {
            key: "getMapId",
            value: function getMapId() {
                return this._mapId;
            }

            /**
             * Focuses the map on the specified lat/lng coordinate
             * @param lat number
             * @param lng number
             * @param zoom number (optional)
             */

        }, {
            key: "setView",
            value: function setView(lat, lng, zoom) {
                var z = zoom;
                if (typeof z === 'undefined') z = this._mapInstance.getZoom();
                this._mapInstance.setView([lat, lng], z);
                this.touch('map:view:changed');
            }

            /**
             * Retrieve the current center of the map
             * @return [lat,lng]
             */

        }, {
            key: "getView",
            value: function getView() {
                var latLng = this._mapInstance.getCenter();
                return [latLng.lat, latLng.lng];
            }

            /**
             * @return integer current zoom level of the map
             */

        }, {
            key: "getZoom",
            value: function getZoom() {
                return this._mapInstance.getZoom();
            }

            /**
             * Zoom to the map's default extent
             * If the map is saved, this will be the saved viewport
             * otherwise, it will be CONUS
             */

        }, {
            key: "zoomToDefault",
            value: function zoomToDefault() {
                if (!this._mapInstance) return;
                if (this._defaultExtent) {
                    this._mapInstance.fitBounds([[this._defaultExtent.miny, this._defaultExtent.minx], [this._defaultExtent.maxy, this._defaultExtent.maxx]]);
                } else {
                    console.log("MapInstance.zoomToDefault() - No default extent specified");
                    this._mapInstance.setView([38, -96], 5);
                }
                try {
                    this.touch('map:view:changed');
                } catch (e) {}
            }

            /**
             * @param {Object} extent - either a GP extent object or Leaflet LatLngBounds object
             */

        }, {
            key: "setExtent",
            value: function setExtent(extent) {
                if (!extent) return;
                if (typeof extent.minx !== 'undefined' && typeof extent.miny !== 'undefined' && typeof extent.maxx !== 'undefined' && typeof extent.maxy !== 'undefined') {
                    //GP model extent
                    this._mapInstance.fitBounds([[extent.miny, extent.minx], [extent.maxy, extent.maxx]]);
                } else if (typeof extent.getWest !== 'undefined') {
                    //L.LatLngBounds
                    this._mapInstance.fitBounds(extent);
                } else {}
            }

            /* ==============================================
                Layer operations
               ============================================== */

            /**
             * @param layer Leaflet Layer instance or object definition
             */

        }, {
            key: "setBaseLayer",
            value: function setBaseLayer(layer) {
                var _this3 = this;

                var promise = null;
                if (!layer) {
                    promise = OSM.get();
                } else promise = Q.resolve(layer);

                promise.then(function (layer) {

                    var leafletLayer = LayerFactory(layer);
                    if (!leafletLayer) return;

                    _this3._mapInstance.addLayer(leafletLayer);
                    leafletLayer.setZIndex(0); //set at bottom

                    var oldBaseLayer = _this3._baseLayer;
                    if (oldBaseLayer) {
                        _this3._mapInstance.removeLayer(oldBaseLayer);
                    }

                    //remember new base layer
                    _this3._baseLayer = leafletLayer;
                    _this3._baseLayerDef = layer;

                    //will notify listeners
                    _this3.touch('baselayer:changed', layer, leafletLayer);
                    // this.notify('baselayer:changed', layer, leafletLayer);
                }).catch(function (e) {
                    console.log("MapInstance.setBaseLayer() - Error getting base layer for map : " + e.message);
                    _this3.logLayerError(layer.id, e.message);
                });
            }

            /**
             * @return array of base layers definitions that can be used
             */
            // getBaseLayerOptions () {
            //     return this._baseLayerOptions;
            // },

        }, {
            key: "getBaseLayer",
            value: function getBaseLayer() {
                return this._baseLayerDef;
            }

            /**
             * @return {array[object]} list of layer states containing layer information
             */

        }, {
            key: "getLayers",
            value: function getLayers() {
                return this._layerStates;
            }
        }, {
            key: "getLayerErrors",
            value: function getLayerErrors() {
                return this._layerErrors;
            }
        }, {
            key: "clearLayerErrors",
            value: function clearLayerErrors() {
                this._layerErrors = [];
                this.notify('layer:error');
            }
        }, {
            key: "clearOverlays",
            value: function clearOverlays() {
                for (var i = this._layerStates.length - 1; i >= 0; --i) {
                    var state = this._layerStates[i];
                    var layerInstance = this._layerCache[state.layer.id];
                    if (layerInstance) {
                        layerInstance.off("layer:error");
                        this._layerCache[state.layer.id] = null;
                        this._mapInstance.removeLayer(layerInstance);
                    }
                }
                this._layerStates = [];
                this.touch('layers:changed');

                //TODO stop listening for layer events
            }

            /**
             * @param {array[object]} layers - list of layers (NOTE: not wrapped by layer states, this method applies that)
             */

        }, {
            key: "addLayers",
            value: function addLayers(layers) {
                var _this4 = this;

                if (!layers) return;
                if (typeof layers.push === 'undefined') {
                    layers = [layers];
                }

                layers.each(function (obj, index) {

                    var layer = null,
                        state = null;

                    if (obj.id) {
                        //is a layer
                        layer = obj;
                    } else if (obj.layer) {
                        //is layer state
                        layer = obj.layer; // containing a layer
                        state = obj;
                    }

                    if (!layer) return; //layer info is missing, skip it

                    //DT-442 prevent adding layer that already exists on map
                    if (_this4._layerCache[layer.id]) return;

                    if (!state) {
                        state = {
                            opacity: 1,
                            visibility: true,
                            layer: JSON.parse(JSON.stringify(layer))
                        };
                    }

                    var z = layers.length - index;
                    state.zIndex = z;

                    _this4.addLayerWithState(layer, state);
                });

                this.touch('layers:changed');
            }

            /**
             * @param {Object} layer - GeoPlatform Layer instance
             * @param {Object} state - GeoPlatform Layer State
             */

        }, {
            key: "addLayerWithState",
            value: function addLayerWithState(layer, state) {
                var _this5 = this;

                var leafletLayer = null;
                try {
                    if (!layer || !state) throw new Error("Invalid argument, missing layer and or state");

                    leafletLayer = LayerFactory(layer);

                    if (!leafletLayer) throw new Error("Layer factory returned nothing");
                } catch (e) {
                    this.logLayerError(layer.id, 'MapInstance.addLayerWithState() - ' + 'Could not create Leaflet layer because ' + e.message);
                }

                if (!leafletLayer) return;

                //listen for layer errors so we can inform the user
                // that a layer hasn't been loaded in a useful way
                leafletLayer.on('tileerror', this.handleLayerError);

                this._layerCache[layer.id] = leafletLayer;
                this._mapInstance.addLayer(leafletLayer);

                if (!isNaN(state.zIndex) && leafletLayer.setZIndex) leafletLayer.setZIndex(state.zIndex);

                this._layerStates.push(state);

                this.notify('layer:added', layer, leafletLayer);

                // if layer is initially "off" or...
                // if layer is initially not 100% opaque
                if (!state.visibility || state.opacity < 1) {
                    // initialize layer visibility and opacity async, or else
                    // some of the layers won't get properly initialized
                    setTimeout(function (layer, state) {
                        _this5.setLayerVisibility(layer, state.visibility);
                        _this5.setLayerOpacity(layer, state.opacity);
                        //TODO notify of change
                    }, 500, leafletLayer, state);
                }
            }

            /**
             * @param {integer} from - position of layer being moved
             * @param {integer} to - desired position to move layer to
             */

        }, {
            key: "moveLayer",
            value: function moveLayer(from, to) {

                if (isNaN(from)) return;

                //end of list
                if (isNaN(to)) to = this._layerStates.length - 1;

                var copy = this._layerStates.splice(from, 1)[0]; //grab layer being moved
                this._layerStates.splice(to, 0, copy);

                for (var z = 1, i = this._layerStates.length - 1; i >= 0; --i, ++z) {
                    var layerState = this._layerStates[i];
                    var layerInstance = this._layerCache[layerState.layer.id];
                    if (layerInstance) {
                        layerInstance.setZIndex(z);
                        layerState.zIndex = z;
                    }
                }

                this.touch('layers:changed', this.getLayers());
            }

            /**
             *
             */

        }, {
            key: "removeLayer",
            value: function removeLayer(id) {

                var layerInstance = this._layerCache[id];
                if (layerInstance) {

                    //remove layer from tracked defs array
                    var index = this.getLayerStateIndex(id);
                    console.log("MapInstance.removeLayer(" + id + ")");
                    if (index >= 0 && index < this._layerStates.length) this._layerStates.splice(index, 1);

                    //stop listening for errors
                    layerInstance.off("layer:error");

                    //remove layer from map
                    this._mapInstance.removeLayer(layerInstance);

                    //remove layer from cache
                    this._layerCache[id] = null;
                }
                this.touch('layers:changed');
            }

            /**
             *
             */

        }, {
            key: "toggleLayerVisibility",
            value: function toggleLayerVisibility(id) {
                var layerInstance = this._layerCache[id];
                if (layerInstance) {
                    var _state = this.getLayerState(id);
                    _state.visibility = !_state.visibility;

                    if (layerInstance._currentImage) {
                        //ESRI Image Service layers have an IMG element
                        // that gets modified and replaced every map event (zoom/pan)
                        // so we can't just toggle classes like on other layers.
                        //Instead, we need to use the ESRI setOpacity method to toggle
                        // but need to update layer state as well.
                        layerInstance.setOpacity(_state.visibility ? 1 : 0);
                        _state.opacity = layerInstance.getOpacity();
                        return;
                    }

                    this.setLayerVisibility(layerInstance, _state.visibility);
                }
            }

            /**
             * Note: this does not update layer definition state. Use
             * MapInstance.toggleLayerVisibility to do that and adjust
             * rendered layer's visibility.
             *
             * @param {L.Layer} layerInstance - leaflet layer instance
             * @param {boolean} visible - flag indicating visibility of layer
             */

        }, {
            key: "setLayerVisibility",
            value: function setLayerVisibility(layerInstance, visible) {

                if (layerInstance.setVisibility) {
                    //using custom method provided in src/layer/module.js
                    layerInstance.setVisibility(visible);
                } else if (layerInstance._container) {
                    //otherwise, using jquery on dom directly
                    var el = jQuery(layerInstance._container);
                    // if(visible) el.removeClass("invisible");
                    // else el.addClass('invisible');
                    el.css({ 'display': visible ? '' : 'none' });
                }

                this.touch('map:layer:changed');
            }

            /**
             *
             */

        }, {
            key: "updateLayerOpacity",
            value: function updateLayerOpacity(id, opacity) {

                var layerInstance = this._layerCache[id];

                //if layer id is for base layer...
                if (!layerInstance && this._baseLayerDef.id === id) {
                    layerInstance = this._baseLayer;
                }

                //adjust rendered leaflet layer
                opacity = this.setLayerOpacity(layerInstance, opacity);

                // if overlay layer, update state value
                var state = this.getLayerState(id);
                if (state) state.opacity = opacity;
            }

            /**
             * Note: this method does not update the associated Layer Definition
             * state value for opacity. Use MapInstance.updateLayerOpacity() to
             * both update state and adjust rendered layer.
             *
             * @param {L.Layer} layerInstance - leaflet layer instance
             * @param {number} opacity - value between 0 and 1.0 or 0 and 100
             * @return {number} normalized opacity value between 0 and 1.0
             */

        }, {
            key: "setLayerOpacity",
            value: function setLayerOpacity(layerInstance, opacity) {
                if (layerInstance && layerInstance.setOpacity) {
                    if (opacity > 1.0) opacity = opacity / 100.0;
                    layerInstance.setOpacity(opacity);
                    this.touch('map:layer:changed');
                }
                return opacity;
            }

            /**
             * @param {Object} GeoPlatform Layer instance
             * @return {L.Layer} Leaflet layer instance representing that layer or null
             */

        }, {
            key: "getLeafletLayerFor",
            value: function getLeafletLayerFor(gpLayer) {
                if (!gpLayer) return null;
                var leafletLayer = this._layerCache[gpLayer.id];
                return leafletLayer || null;
            }

            /**
             *
             */

        }, {
            key: "toggleGetFeatureInfo",
            value: function toggleGetFeatureInfo(layerId) {
                var layerInstance = this._layerCache[layerId];
                if (layerInstance) {
                    if (typeof layerInstance.enableGetFeatureInfo !== 'undefined') {
                        if (layerInstance.isGetFeatureInfoEnabled()) {
                            layerInstance.disableGetFeatureInfo();
                            jQuery(_mapInstance._container).removeClass('selectable-cursor');
                        } else {
                            layerInstance.enableGetFeatureInfo();
                            jQuery(_mapInstance._container).addClass('selectable-cursor');
                        }
                    }
                }
            }

            /* ==============================================
               Feature operations
               ============================================== */

            /**
             * @return array of features on the map
             */

        }, {
            key: "getFeatures",
            value: function getFeatures() {
                if (this._featureLayer) {
                    return this._featureLayer.toGeoJSON().features;
                }
                return [];
            }

            /**
             * @param json geojson object or array of geojson objects
             */

        }, {
            key: "addFeatures",
            value: function addFeatures(json) {

                if (!json) return;

                if (typeof json.push !== 'undefined') {
                    //array of features
                    for (var i = 0; i < json.length; ++i) {
                        this.addFeature(json[i], false);
                    }this.touch('features:changed');
                } else if (json.features) {
                    this.addFeatures(json.features);
                } else {
                    //single feature
                    this.addFeature(json, true);
                }
            }

            /**
             * @param json geojson object
             */

        }, {
            key: "addFeature",
            value: function addFeature(json, fireEvent) {
                var _this6 = this;

                // var type = json.type;
                // var coordinates = json.coordinates;

                if (!L) {
                    throw new Error("Leaflet is not available");
                }

                if (!this._featureLayer) {

                    // _featureLayer = geoJson([], _geoJsonLayerOpts).addTo(_mapInstance);
                    this._featureLayer = L$1.featureGroup().addTo(this._mapInstance);
                }

                // _featureLayer.addData(json);
                var opts = jQuery.extend({}, this._geoJsonLayerOpts);
                L$1.geoJson(json, opts).eachLayer(function (l) {
                    return _this6.addFeatureLayer(l);
                });

                if (typeof fireEvent === 'undefined' || fireEvent === true) this.touch('features:changed');else this.touch();

                // console.log(JSON.stringify(_featureLayer.toGeoJSON()));
            }

            /**
             * @param featureJson object defining a GeoJSON feature
             */

        }, {
            key: "updateFeature",
            value: function updateFeature(featureJson) {
                var layer = this.getFeatureLayer(featureJson.properties.id);
                if (layer) {

                    layer.feature = featureJson;

                    //update style
                    layer.setStyle(featureJson.properties.style);

                    //rebind label in case that changed
                    var label = featureJson.properties.label || "Untitled " + featureJson.geometry.type + " Feature";
                    layer.bindTooltip(label);

                    // layer.redraw();
                    this.touch("map:feature:changed");
                }
            }

            /**
             * Replace an existing L.Path-based layer with one using
             * the supplied Feature GeoJSON object.  Removes the existing
             * layer and adds a new one created from the GeoJSON.
             *
             * @param featureJson object defining GeoJSON feature
             */

        }, {
            key: "replaceFeature",
            value: function replaceFeature(featureJson) {
                var _this7 = this;

                if (!L) {
                    throw new Error("Leaflet is not available");
                }

                //find existing layer for this feature
                var layer = this.getFeatureLayer(featureJson.properties.id);
                if (layer) {

                    //remove existing
                    this._featureLayer.removeLayer(layer);

                    //add replacement
                    L$1.geoJson(featureJson, this._geoJsonLayerOpts).eachLayer(function (l) {
                        return _this7.addFeatureLayer(l);
                    });

                    this.touch("map:feature:changed");
                }
            }

            /**
             * @param featureId identifier of feature to focus the map on
             */

        }, {
            key: "focusFeature",
            value: function focusFeature(featureId) {
                var layer = this.getFeatureLayer(featureId);
                if (layer) {
                    if (typeof layer.getBounds !== 'undefined') {
                        var extent = layer.getBounds();
                        this._mapInstance.fitBounds(extent);
                    } else if (typeof layer.getLatLng !== 'undefined') {
                        var latLng = layer.getLatLng();
                        this._mapInstance.panTo(latLng);
                    } else {
                        console.log("MapInstance.focusFeature() - Cannot focus feature because it has no bounds or lat/lng");
                    }
                } else {
                    console.log("MapInstance.focusFeature() - Cannot focus feature because it has no layer");
                }
            }

            /**
             * @param
             */

        }, {
            key: "removeFeature",
            value: function removeFeature(featureId) {
                var layer = this.getFeatureLayer(featureId);
                if (layer && this._featureLayer) {
                    this._featureLayer.removeLayer(layer);
                    this.touch('features:changed');
                }
            }

            /**
             *
             */

        }, {
            key: "removeFeatures",
            value: function removeFeatures() {
                if (this._featureLayer) {
                    this._featureLayer.clearLayers();
                    this.touch("features:changed");
                }
            }

            /**
             *
             */

        }, {
            key: "getFeatureLayer",
            value: function getFeatureLayer(featureId) {
                if (!this._featureLayer) return null;

                var features = this._featureLayer.getLayers();
                for (var i = 0; i < features.length; ++i) {
                    if (features[i].feature.properties.id === featureId) {
                        return features[i];
                    }
                }
                return null;
            }
        }, {
            key: "toggleFeaturesLayer",
            value: function toggleFeaturesLayer() {
                if (!this._featureLayer) return false; //ignore if not rendered yet

                this._featureLayerVisible = !this._featureLayerVisible;
                this.setFeatureLayerVisibility(this._featureLayer, this._featureLayerVisible);
                return this._featureLayerVisible;
            }

            /**
             * @param {L.Feature} feature - Leaflet feature instance
             * @param {boolean} visibility - flag
             */

        }, {
            key: "setFeatureVisibility",
            value: function setFeatureVisibility(feature, visibility) {
                this.setFeatureLayerVisibility(feature, visibility);
            }
        }, {
            key: "getFeaturesLayerVisibility",
            value: function getFeaturesLayerVisibility() {
                return this._featureLayerVisible;
            }

            /*
             * method for adding feature layers to the map
             * when these layers may be layer groups.
             * finds leaf node layers and adds them to the
             * map's feature group
             */

        }, {
            key: "addFeatureLayer",
            value: function addFeatureLayer(layer) {
                this._addFeatureLayer(layer);
                this.touch("features:changed");
            }

            /**
             * Internal method, use 'addFeatureLayer' instead
             * @param {Object} layer
             */

        }, {
            key: "_addFeatureLayer",
            value: function _addFeatureLayer(layer) {
                var _this8 = this;

                if (!L) {
                    throw new Error("Leaflet is not available");
                }
                if (!layer.feature && layer instanceof L$1.LayerGroup) {
                    layer.eachLayer(function (child) {
                        _this8._addFeatureLayer(child);
                    });
                } else {
                    this._featureLayer.addLayer(layer);
                }
            }

            //toggle visibility of parent feature layer

        }, {
            key: "setFeatureLayerVisibility",
            value: function setFeatureLayerVisibility(layer, visibility) {
                var _this9 = this;

                if (!layer) return;
                this._featureLayerVisible = visibility;

                if (layer.getLayers) {
                    layer.getLayers().each(function (child) {
                        _this9.setFeatureLayerVisibility(child, visibility);
                    });
                } else {
                    var container = layer._container || layer._path;
                    if (container) container.style.display = visibility ? '' : 'none';
                }
            }

            /* ==============================================
               Map lifecycle operations
               ============================================== */

            /**
             * @param {Object} metadata
             * @return {Promise} resolving persisted map
             */

        }, {
            key: "save",
            value: function save(metadata) {
                return this.saveMap(metadata);
            }

            /**
             * @param md object containing metadata properties for map
             */

        }, {
            key: "saveMap",
            value: function saveMap(md) {
                var _this10 = this;

                var metadata = md || {};

                //add GeoPlatformMap resource type if not already present
                var gpMapType = 'http://www.geoplatform.gov/ont/openmap/GeoplatformMap';
                metadata.resourceTypes = metadata.resourceTypes || [];
                if (metadata.resourceTypes.indexOf(gpMapType) < 0) metadata.resourceTypes.push(gpMapType);

                var content = this.getMapResourceContent(metadata);

                //ensure the two name properties line up
                if (content.title && content.title !== content.label) {
                    content.label = content.title;
                } else if (content.label && !content.title) {
                    content.title = content.label;
                }

                // console.log("Updating: " + JSON.stringify(map));
                return this.getService(ItemTypes.MAP).save(content).then(function (result) {

                    //track new map's info so we can update it with next save
                    if (!_this10._mapId) _this10._mapId = result.id;

                    _this10._mapDef = result;
                    _this10._defaultExtent = result.extent;
                    _this10.clean();
                    return result;
                }).catch(function (err) {
                    var e = new Error("MapInstance.saveMap() - " + "The requested map could not be saved because: " + err.message);
                    return Q.reject(e);
                });
            }

            /**
             * Retrieve a map's descriptor from the registry
             * @param {string} mapId identifier of map
             * @return {Promise} resolving the map object
             */

        }, {
            key: "fetchMap",
            value: function fetchMap(mapId) {
                //Having to send cache busting parameter to avoid CORS header cache
                // not sending correct Origin value
                return this.getService(ItemTypes.MAP).get(mapId);
            }

            /**
             * Retrieve a map's descriptor and load it as the
             * current map managed by this service
             * @param {string} mapId identifier of map
             * @return {Promise} resolving the map object
             */

        }, {
            key: "loadMap",
            value: function loadMap(mapId) {
                var _this11 = this;

                return this.fetchMap(mapId).then(function (map) {

                    if (!map) {
                        throw new Error("The requested map came back null");
                    } else if (typeof map === 'string') {
                        throw new Error("The requested map came back as a string");
                    } else if (map.message) {
                        throw new Error("There was an error loading the requested map: " + map.message);
                    }

                    //loading a map by its ID, so we need to increment it's view count
                    if ('development' !== Config$2.env) {

                        setTimeout(function (map) {
                            //update view count
                            var views = map.statistics ? map.statistics.numViews || 0 : 0;
                            var patch = [{ op: 'replace', path: '/statistics/numViews', value: views + 1 }];
                            _this11.getService(ItemTypes.MAP).patch(map.id, patch)
                            // this.mapService.patch(map.id, patch)
                            .then(function (updated) {
                                map.statistics = updated.statistics;
                            }).catch(function (e) {
                                console.log("Error updating view count for map: " + e);
                            });
                        }, 1000, map);
                    }

                    //load the map into the viewer
                    _this11.loadMapFromObj(map);

                    return map;
                }).catch(function (err) {
                    var e = new Error("MapInstance.loadMap() - " + "The requested map could not be loaded because " + err.message);
                    return Q.reject(e);
                });
            }

            /**
             * Load a map from its descriptor as the current
             * map managed by this service
             * @param map object
             */

        }, {
            key: "loadMapFromObj",
            value: function loadMapFromObj(map) {
                var _this12 = this;

                console.log("Loading Map Object");
                // console.log(map);

                this._mapId = map.id;
                this._mapDef = map;

                //ensure x,y is ordered correctly
                var t;
                t = Math.min(map.extent.minx, map.extent.maxx);
                map.extent.maxx = Math.max(map.extent.minx, map.extent.maxx);
                map.extent.minx = t;
                t = Math.min(map.extent.miny, map.extent.maxy);
                map.extent.maxy = Math.max(map.extent.miny, map.extent.maxy);
                map.extent.miny = t;

                //prevent out-of-bounds extents
                if (map.extent.minx < -180.0) map.extent.minx = -179.0;
                if (map.extent.maxx > 180.0) map.extent.maxx = 179.0;
                if (map.extent.miny < -90.0) map.extent.miny = -89.0;
                if (map.extent.maxy > 90.0) map.extent.maxy = 89.0;

                //set extent from loaded map
                this._defaultExtent = map.extent;
                var extent = map.extent;

                //remove existing layers
                this._mapInstance.eachLayer(function (l) {
                    _this12._mapInstance.removeLayer(l);
                });
                this._layerCache = {};
                this._layerStates = [];

                //set new base layer
                this.setBaseLayer(map.baseLayer);

                //add layers from loaded map
                this.addLayers(map.layers);

                //add features
                if (map.annotations && map.annotations.geoJSON) {
                    var fc = map.annotations.geoJSON;
                    if (fc.features) this.addFeatures(fc.features);else this.addFeatures([fc]);
                }

                this._mapInstance.fitBounds([[extent.miny, extent.minx], [extent.maxy, extent.maxx]]);

                this.clean();
                this.notify('map:loaded', map);
            }

            /**
             *
             */

        }, {
            key: "destroyMap",
            value: function destroyMap() {
                console.log("Destroying Map");
                this._mapInstance = null;
                this._layerCache = null;
                this._layerStates = null;
                this._featureLayer = null;
            }

            /**
             * Used to take an existing map that is already persisted on the
             * server and unlink it here in the client so that it will be saved
             * as a completely new map when mapService.saveMap(...) is next called
             */

        }, {
            key: "setAsNewMap",
            value: function setAsNewMap(mapToUse) {
                this._mapId = null;
                this._mapDef = mapToUse || this.initializeMapDefinition();
            }

            /* ==============================================
                Tool operations
               ============================================== */

        }, {
            key: "registerTool",
            value: function registerTool(id, tool) {
                this._tools[id] = tool;
            }
        }, {
            key: "unregisterTool",
            value: function unregisterTool(id) {
                this._tools[id] = null;
            }
        }, {
            key: "enableTool",
            value: function enableTool(id, finish) {
                if (!this._tools[id]) return false;
                this._tools[id].activate(function () {
                    this.notify('tool:disabled', id);
                });
                this.notify('tool:enabled', id);
            }

            /* ----------- MISC ------------ */

            //https://github.com/gsklee/ngStorage

        }, {
            key: "cacheMap",
            value: function cacheMap() {

                if (state.dirty) {
                    var map = this.getMapResourceContent();
                    //use exploded layer info
                    map.layers = this._layerStates.slice(0);
                    // $sessionStorage.map = map;
                }
            }
        }, {
            key: "restoreMap",
            value: function restoreMap() {}
            // if($sessionStorage.map) {
            //     console.log("Restoring cached map");
            //     let map = $sessionStorage.map;
            //     // console.log(JSON.stringify(map));
            //     $sessionStorage.map = null;
            //     this.loadMapFromObj(map);
            // }

            /* ---------------------------- */

        }]);

        return MapInstance;
    }(Listener);

    var cache = {};

    var MapFactory = {

        get: function get(key) {
            if (key && cache[key]) return cache[key];

            var instance = new MapInstance(key);
            cache[instance._key] = instance;
            return instance;
        },

        dispose: function dispose(key) {
            if (key) {
                cache[key].destroyMap();
                delete cache[key];
            } else {
                cache = null;
            }
        }
    };

    if (typeof Array.prototype.each === 'undefined') {
        Array.prototype.each = function (fn) {
            var arr = this,
                len = arr.length;
            for (var i = 0; i < len; ++i) {
                try {
                    fn(arr[i]);
                } catch (e) {}
            }
        };
    }

    var index = {
        LoadingControl: loadingControl,
        MeasureControl: measureControl,
        MousePositionControl: positionControl,
        DefaultBaseLayer: DefaultBaseLayer,
        LayerFactory: LayerFactory,
        OSMLayerFactory: OSMLayerFactory,
        ESRIClusterFeatureLayer: featureLayer,
        ClusteredFeatureLayer: ClusteredFeatureLayer,
        clusteredFeatures: clusteredFeatures,
        geoJsonFeed: geoJsonFeed,
        FeatureLayer: FeatureLayer,
        WMS: WMS,
        wms: wms,
        WMST: WMST,
        wmst: wmst,
        WMTS: WMTS,
        wmts: wmts,
        ESRITileLayer: esriTileLayer,
        OSM: OSM,
        MapInstance: MapInstance,
        MapFactory: MapFactory,
        ServiceTypes: types,
        PopupTemplate: featurePopupTemplate,
        StyleResolver: featureStyleResolver
    };

    return index;

})));
//# sourceMappingURL=geoplatform.mapcore.js.map
