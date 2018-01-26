
/**
 *
 */
(function(jQuery, Q, L/*eaflet*/, GeoPlatform) {

    "use strict";


    class Listener {

        constructor() {
            //listeners to be unregistered upon destroy
            this._listeners = {};
        }

        on (type, listener) {
            if(!this._listeners[type])
                this._listeners[type] = [];
            this._listeners[type].push(listener);
        }

        off (type, listener) {
            if(!type) this._listeners = {};
            if(!this._listeners[type]) return;
            if(!listener) this._listeners[type] = [];
            else {
                var idx = this._listeners[type].indexOf(listener);
                if(idx >= 0)
                    this._listeners[type].splice(idx, 1);
            }
        }

        notify(type) {
            if(!this._listeners[type]) return;
            var args = Array.prototype.slice.call(arguments, 1);
            this._listeners[type].each(function(l) { l.apply(null, args); });
        }

    }



    class MapInstance extends Listener {

        constructor() {
            super();

            //generate random key (see factory below)
            this._key = Math.ceil(Math.random()*9999);

            //registry id of current map if available
            this._mapId = null,

            //definition of map (ie, from server)
            this._mapDef = this.initializeMapDefinition(),

            //primary map instance (ie, leaflet)
            this._mapInstance = null,

            //default map extent (if map doesn't have one for being saved)
            this._defaultExtent = null,

            //current base layer object and leaflet instance
            this._baseLayerDef = null,
            this._baseLayer = null,

            //set definitions of layer states (including layer info) on map
            this._layerStates = [],

            //map layer def ids with leaflet instances
            this._layerCache = {},

            //errors generated by layers loading
            this._layerErrors= [],

            //layer used to store features on map
            this._featureLayer = null,
            this._featureLayerVisible = true,

            //set of registered map tools
            this._tools = [],


            //state management
            this.state = { dirty: false };

            this._geoJsonLayerOpts = {
                style: function(feature) {
                    if(feature.properties.style)
                        return feature.properties.style;
                },
                onEachFeature: function(feature, layer) {

                    var style = { weight: 2, color: '#03f', opacity: 0.9, radius: 4, fillColor: '#03f', fillOpacity: 0.5 };
                    if(~feature.geometry.type.indexOf('Point')) {
                        style.fillOpacity = 0.9;
                    }

                    var props = feature.properties = feature.properties || {};
                    feature.properties.id = Math.floor(Math.random()*999999);
                    feature.properties.label = props.label || props.title || props.name || "Untitled " + feature.geometry.type + " Feature";
                    feature.properties.description = props.description || props.desc || "This feature needs a description!";
                    feature.properties.style = props.style || style;

                    layer.bindTooltip(props.label);
                    /*
                    toggle: setLabelNoHide(bool)
                    it may only exist on markers!
                    */
                },
                pointToLayer: function (feature, latlng) {

                    var style = feature.properties.style || {};
                    style.radius = style.radius || 4;
                    style.weight = style.weight || 2;
                    style.color = style.color || '#03f';
                    style.opacity = style.opacity || 0.9;
                    style.fillOpacity = style.opacity;
                    style.fillColor = style.color;

                    return L.circleMarker(latlng, style);
                }
            };

        }


        getKey () {
            return this._key;
        }


        //-----------------
        getLayerStateIndex (layerId) {
            return this._layerStates.indexOfObj(layerId, (id, state) => state.layer.id === id );
        }

        getLayerState (layerId) {
            let index = this.getLayerStateIndex(layerId);
            return index >= 0 ? _layerStates[index] : null;
        }
        //-----------------


        initializeMapDefinition() {
            return {
                type: "Map",
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
        getMapResourceContent(metadata) {

            metadata = metadata || {};

            //map layers
            metadata.layers = this._layerStates.slice(0);
            // ... UAL should support accepting just an id here, so we'll do just that
            metadata.baseLayer = this._baseLayerDef;

            metadata.annotations = this._featureLayer ?
                { title: "Map Features", geoJSON: this._featureLayer.toGeoJSON() } : null;

            //geographic extent
            let extent = this._mapInstance.getBounds();
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
        getDrawControlToolbar() {
            if(!this._mapInstance.drawControl) return null;
            var toolbars = this._mapInstance.drawControl._toolbars;
            var toolbar = null;
            for(var key in toolbars) {
                if(toolbars.hasOwnProperty(key)) {
                    if(toolbars[key]._modes) {
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
        handleLayerError(error) {
            var layer = error.target;
            for(var id in this._layerCache) {
                if(this._layerCache[id] === layer) {
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
        processLayerError(error, id) {

            var finder = function(l){return l.id === id;};

            if(!this._layerErrors.find(finder)) {

                // console.log("Logging error for layer "  + id);
                var obj = {
                    id: id,
                    message: "Layer failed to completely load. " +
                        "It may be inaccessible or misconfigured."
                };
                this._layerErrors.push(obj);

                var url = error.tile.src;
                var params = {id:id};
                url.substring(url.indexOf("?")+1, url.length).split('&').each(function(param) {
                    var p = param.split('=');
                    params[p[0]] = p[1];
                });

                // LayerService.validate(params, {}, function(res) {
                //     //no error here, maybe service is flaky...
                // }, function(res) {
                //     // console.log("Updating error for " + id + " with message");
                //     var def = _layerStates.find(finder);
                //     obj.message = "Layer '" + def.label + "' failed to completely load. " +
                //             "It may be inaccessible or misconfigured. Reported cause: " + res.data;
                //     notify('wmv:error', obj);
                //
                // });

            }
        }

        /*
         * method for adding feature layers to the map
         * when these layers may be layer groups.
         * finds leaf node layers and adds them to the
         * map's feature group
         */
        addFeatureLayer(layer) {
            if(!layer.feature && layer instanceof L.LayerGroup) {
                layer.eachLayer(addFeatureLayer);
            } else {
                this._featureLayer.addLayer(layer);
            }
        }


        //toggle visibility of parent feature layer
        setFeatureLayerVisibility(layer, visibility) {
            if(!layer) return;

            if(layer.getLayers) {
                layer.getLayers().each( (child) => {
                    setFeatureLayerVisibility(child, visibility);
                });

            } else {
                let container = layer._container || layer._path;
                if(container)
                    container.style.display = visibility ? '' : 'none';
            }
        }


        /* -- State Management of internal model -- */

        touch (event) {
            this.state.dirty = true;
            if(event) {
                if(arguments.length > 1) {
                    this.notify.apply(this, Array.prototype.slice.call(arguments));
                } else
                    this.notify(event);
                // console.log("Dirtying map for " + event);
            }
            // else console.log("Dirtying map");
        }
        clean() {
            // console.log("Cleaning map");
            this.state.dirty = false;
        }
        /* --------------------------------------- */




        /* ==============================================
            Map manipulation operations
           ============================================== */

        setMap (map) {
            this._mapInstance = map;
        }

        /**
         * @return {L.Map} map instance
         */
        getMap () { return this._mapInstance; }

        /** @return {object} definition of map */
        getMapDefinition () { return this._mapDef; }

        /** @return {string} identifier of map */
        getMapId () { return this._mapId; }

        /**
         * Focuses the map on the specified lat/lng coordinate
         * @param lat number
         * @param lng number
         * @param zoom number (optional)
         */
        setView (lat, lng, zoom) {
            let z = zoom;
            if(typeof(z) === 'undefined')
                z = this._mapInstance.getZoom();
            this._mapInstance.setView([lat,lng], z);
            this.touch('map:view:changed');
        }

        /**
         * Retrieve the current center of the map
         * @return [lat,lng]
         */
        getView () {
            var latLng = this._mapInstance.getCenter();
            return [latLng.lat, latLng.lng];
        }

        /**
         * @return integer current zoom level of the map
         */
        getZoom () {
            return this._mapInstance.getZoom();
        }

        /**
         * Zoom to the map's default extent
         * If the map is saved, this will be the saved viewport
         * otherwise, it will be CONUS
         */
        zoomToDefault () {
            if(this._defaultExtent) {
                this._mapInstance.fitBounds([
                    [this._defaultExtent.miny, this._defaultExtent.minx],
                    [this._defaultExtent.maxy, this._defaultExtent.maxx]
                ]);
            } else {
                this._mapInstance.setView([38, -96], 5);
            }
            this.touch('map:view:changed');
        }


        /* ==============================================
            Layer operations
           ============================================== */


        /**
         * @param layer Leaflet Layer instance or object definition
         */
        setBaseLayer (layer) {

            let promise = (layer !== null && typeof(layer) !== 'undefined') ?
                Q.resolve(layer) : BaseLayerFactory.get();

            promise.then( layer => {

                let leafletLayer = L.GeoPlatform.LayerFactory(layer);
                if(!leafletLayer) return;

                this._mapInstance.addLayer(leafletLayer);
                leafletLayer.setZIndex(0);  //set at bottom

                let oldBaseLayer = this._baseLayer;
                if(oldBaseLayer) {
                    this._mapInstance.removeLayer(oldBaseLayer);
                }

                //remember new base layer
                this._baseLayer = leafletLayer;
                this._baseLayerDef = layer;
                this.touch('baselayer:changed', layer);

            })
            .catch(e => {
                console.log(`MapInstance.setBaseLayer() - Error getting base layer for map : ${e.message}`);
            });
        }

        /**
         * @return array of base layers definitions that can be used
         */
        // getBaseLayerOptions () {
        //     return this._baseLayerOptions;
        // },

        getBaseLayer () { return this._baseLayerDef; }

        /**
         * @return {array[object]} list of layer states containing layer information
         */
        getLayers () { return this._layerStates; }

        getLayerErrors () { return this._layerErrors; }

        clearLayerErrors () {
            this._layerErrors = [];
            this.notify('layer:error');
        }

        clearOverlays () {
            for(var i=this._layerStates.length-1; i>=0; --i) {
                var state = this._layerStates[i];
                var layerInstance = this._layerCache[state.layer.id];
                if(layerInstance) {
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
        addLayers (layers) {

            layers.each( (obj,index) => {

                let layer = null, state = null;

                if(obj.id) {            //is a layer
                    layer = obj;
                } else if(obj.layer) {  //is layer state
                    layer = obj.layer;  // containing a layer
                    state = obj;
                }

                if(!layer) return;  //layer info is missing, skip it

                //DT-442 prevent adding layer that already exists on map
                if(this._layerCache[layer.id]) return;

                if(!state)
                    state = { opacity: 1, visibility: true, layer: JSON.parse(JSON.stringify(layer)) };

                var leafletLayer = L.GeoPlatform.LayerFactory(layer);
                if(leafletLayer) {

                    //listen for layer errors so we can inform the user
                    // that a layer hasn't been loaded in a useful way
                    leafletLayer.on('tileerror', this.handleLayerError);

                    let z = layers.length - index;
                    state.zIndex = z;
                    // console.log("Setting z of " + z + " on " + layer.label);

                    this._layerCache[layer.id] = leafletLayer;
                    this._mapInstance.addLayer(leafletLayer);
                    if(leafletLayer.setZIndex)
                        leafletLayer.setZIndex(z);
                    this._layerStates.push(state);            //put it in at top of list

                    // if layer is initially "off" or...
                    // if layer is initially not 100% opaque
                    if(!state.visibility || state.opacity < 1) {
                        // initialize layer visibility and opacity async, or else
                        // some of the layers won't get properly initialized
                        setTimeout( (layer, state) => {
                            this.setLayerVisibility(layer, state.visibility);
                            this.setLayerOpacity(layer, state.opacity);
                            //TODO notify of change
                        }, 500, leafletLayer, state);
                    }
                }
            });

            this.touch('layers:changed');
        }

        /**
         * @param {integer} from - position of layer being moved
         * @param {integer} to - desired position to move layer to
         */
        moveLayer (from, to) {

            if(isNaN(from)) return;

            //end of list
            if(isNaN(to)) to = this._layerStates.length-1;

            let copy = this._layerStates.splice(from, 1)[0];    //grab layer being moved
            this._layerStates.splice(to, 0, copy);

            for(let z=1, i=this._layerStates.length-1; i>=0; --i,++z) {
                let layerState = this._layerStates[i];
                let layerInstance = this._layerCache[ layerState.layer.id ];
                if(layerInstance) {
                    layerInstance.setZIndex(z);
                    layerState.zIndex = z;
                }
            }

            this.touch('layers:changed', this.getLayers());
        }

        /**
         *
         */
        removeLayer (id) {

            var layerInstance = this._layerCache[id];
            if(layerInstance) {

                //remove layer from tracked defs array
                let index = this.getLayerStateIndex(id);
                this._layerStates.splice(index, 1);

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
        toggleLayerVisibility (id) {
            var layerInstance = this._layerCache[id];
            if(layerInstance) {
                let state = this.getLayerState(id);
                state.visibility = !state.visibility;

                if(layerInstance._currentImage) {
                    //ESRI Image Service layers have an IMG element
                    // that gets modified and replaced every map event (zoom/pan)
                    // so we can't just toggle classes like on other layers.
                    //Instead, we need to use the ESRI setOpacity method to toggle
                    // but need to update layer state as well.
                    layerInstance.setOpacity(state.visibility ? 1 : 0);
                    state.opacity = layerInstance.getOpacity();
                    return;
                }

                this.setLayerVisibility(layerInstance, state.visibility);
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
        setLayerVisibility (layerInstance, visible) {

            if(layerInstance.setVisibility) {
                //using custom method provided in src/layer/module.js
                layerInstance.setVisibility(visible);

            } else if(layerInstance._container) {
                //otherwise, using jquery on dom directly
                let el = jQuery(layerInstance._container);
                if(visible) el.removeClass("invisible");
                else el.addClass('invisible');

            }

            this.touch('map:layer:changed');
        }

        /**
         *
         */
        updateLayerOpacity (id, opacity) {

            var layerInstance = this._layerCache[id];

            //if layer id is for base layer...
            if(!layerInstance && this._baseLayerDef.id === id) {
                layerInstance = this._baseLayer;
            }

            //adjust rendered leaflet layer
            opacity = this.setLayerOpacity(layerInstance, opacity);

            // if overlay layer, update state value
            let state = this.getLayerState(id);
            if(state) state.opacity = opacity;

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
        setLayerOpacity (layerInstance, opacity) {
            if(layerInstance && layerInstance.setOpacity) {
                if(opacity > 1.0) opacity = opacity / 100.0;
                layerInstance.setOpacity(opacity);
                this.touch('map:layer:changed');
            }
            return opacity;
        }

        /**
         * @param {Object} GeoPlatform Layer instance
         * @return {L.Layer} Leaflet layer instance representing that layer or null
         */
        getLeafletLayerFor (gpLayer) {
            if(!gpLayer) return null;
            let leafletLayer = this._layerCache[gpLayer.id];
            return leafletLayer || null;
        }

        /**
         *
         */
        toggleGetFeatureInfo (layerId) {
            var layerInstance = this._layerCache[layerId];
            if(layerInstance) {
                if(typeof(layerInstance.enableGetFeatureInfo) !== 'undefined') {
                    if(layerInstance.isGetFeatureInfoEnabled()) {
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
        getFeatures () {
            if(this._featureLayer) {
                return this._featureLayer.toGeoJSON().features;
            }
            return [];
        }

        /**
         * @param json geojson object or array of geojson objects
         */
        addFeatures (json) {

            if(!json) return;

            if(typeof(json.push) !== 'undefined') {
                //array of features
                for(var i=0; i<json.length; ++i)
                    this.addFeature(json[i], false);
                this.touch('features:changed');

            } else if(json.features) {
                this.addFeatures(json.features);

            } else { //single feature
                this.addFeature(json, true);
            }

        }

        /**
         * @param json geojson object
         */
        addFeature (json, fireEvent) {
            // var type = json.type;
            // var coordinates = json.coordinates;

            if(!this._featureLayer) {

                // _featureLayer = L.geoJson([], _geoJsonLayerOpts).addTo(_mapInstance);
                this._featureLayer = L.featureGroup().addTo(this._mapInstance);

            }

            // _featureLayer.addData(json);
            var opts = jQuery.extend({}, this._geoJsonLayerOpts);
            L.geoJson(json, opts).eachLayer((l)=>this.addFeatureLayer(l));

            if(typeof(fireEvent) === 'undefined' || fireEvent === true)
                this.touch('features:changed');
            else this.touch();

            // console.log(JSON.stringify(_featureLayer.toGeoJSON()));

        }

        /**
         * @param featureJson object defining a GeoJSON feature
         */
        updateFeature (featureJson) {
            var layer = this.getFeatureLayer(featureJson.properties.id);
            if(layer) {

                layer.feature = featureJson;

                //update style
                layer.setStyle(featureJson.properties.style);

                //rebind label in case that changed
                var label = featureJson.properties.label ||
                    "Untitled " + featureJson.geometry.type + " Feature";
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
        replaceFeature (featureJson) {
            //find existing layer for this feature
            var layer = this.getFeatureLayer(featureJson.properties.id);
            if(layer) {

                //remove existing
                this._featureLayer.removeLayer(layer);

                //add replacement
                L.geoJson(featureJson, this._geoJsonLayerOpts)
                    .eachLayer((l)=>this.addFeatureLayer(l));

                this.touch("map:feature:changed");
            }
        }

        /**
         * @param featureId identifier of feature to focus the map on
         */
        focusFeature (featureId) {
            var layer = this.getFeatureLayer(featureId);
            if(layer) {
                var extent = layer.getBounds();
                this._mapInstance.fitBounds(extent);
            }
        }

        /**
         * @param
         */
        removeFeature (featureId) {
            var layer = this.getFeatureLayer(featureId);
            if(layer && this._featureLayer) {
                this._featureLayer.removeLayer(layer);
                this.touch('features:changed');
            }
        }

        /**
         *
         */
        removeFeatures () {
            if(this._featureLayer) {
                this._featureLayer.clearLayers();
                this.touch("features:changed");
            }
        }

        /**
         *
         */
        getFeatureLayer (featureId) {
            if(!this._featureLayer) return null;

            var features = this._featureLayer.getLayers();
            for(var i=0; i<features.length; ++i) {
                if(features[i].feature.properties.id === featureId) {
                    return features[i];
                }
            }
            return null;
        }

        toggleFeaturesLayer () {
            if(!this._featureLayer) return false;    //ignore if not rendered yet

            this._featureLayerVisible = !this._featureLayerVisible;
            this.setFeatureLayerVisibility(this._featureLayer, this._featureLayerVisible);
            return this._featureLayerVisible;
        }

        /**
         * @param {L.Feature} feature - Leaflet feature instance
         * @param {boolean} visibility - flag
         */
        setFeatureVisibility (feature, visibility) {
            this.setFeatureLayerVisibility(feature, visibility);
        }

        getFeaturesLayerVisibility () {
            return this._featureLayerVisible;
        }


        /* ==============================================
           Map lifecycle operations
           ============================================== */

        /**
         * @param metadata object containing metadata properties for map
         */
        saveMap (metadata) {

            var content = this.getMapResourceContent(metadata);

            var d = Q.defer();

            //ensure the two name properties line up
            if(content.title && content.title !== content.label) {
                content.label = content.title;
            }

            // console.log("Updating: " + JSON.stringify(map));
            GeoPlatform.MapService.save(content)
            .then( result => {

                //track new map's info so we can update it with next save
                if(!this._mapId)
                    this._mapId = result.id;

                this._mapDef = result;
                this._defaultExtent = result.extent;
                this.clean();
                d.resolve(result);
            })
            .catch( error => { d.reject( error); });

            return d.promise;
        }

        /**
         * Retrieve a map's descriptor from the registry
         * @param {string} mapId identifier of map
         * @return {Promise} resolving the map object
         */
        fetchMap (mapId) {
            //Having to send cache busting parameter to avoid CORS header cache
            // not sending correct Origin value
            return GeoPlatform.MapService.get(mapId);
        }

        /**
         * Retrieve a map's descriptor and load it as the
         * current map managed by this service
         * @param {string} mapId identifier of map
         * @return {Promise} resolving the map object
         */
        loadMap (mapId) {

            return this.fetchMap(mapId).then(map => {

                if(!map) {
                    throw new Error("The requested map came back null");

                } else if(typeof(map) === 'string') {
                    throw new Error("The requested map came back as a string");

                } else if(map.message) {
                    throw new Error("There was an error loading the requested map: " + map.message);
                }


                //loading a map by its ID, so we need to increment it's view count
                if('development' !== GeoPlatform.env) {

                    setTimeout( (map) => {
                        //update view count
                        let views = map.statistics ? (map.statistics.numViews||0) : 0;
                        let patch = [ { op: 'replace', path: '/statistics/numViews', value: views+1 } ];
                        GeoPlatform.MapService.patch(map.id, patch)
                        .then( updated => { map.statistics = updated.statistics; })
                        .catch( e => { console.log("Error updating view count for map: " + e); });
                    }, 1000, map);

                }

                //load the map into the viewer
                this.loadMapFromObj(map);

                return map;
            })
            .catch( err => {
                let e = new Error("MapInstance.loadMap() - " +
                    "The requested map could not be loaded because " + err.message);
                return Q.reject(e);
            });
        }

        /**
         * Load a map from its descriptor as the current
         * map managed by this service
         * @param map object
         */
        loadMapFromObj (map) {

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
            if(map.extent.minx < -180.0) map.extent.minx = -179.0;
            if(map.extent.maxx > 180.0) map.extent.maxx = 179.0;
            if(map.extent.miny < -90.0) map.extent.miny = -89.0;
            if(map.extent.maxy > 90.0) map.extent.maxy = 89.0;

            //set extent from loaded map
            this._defaultExtent = map.extent;
            var extent = map.extent;

            //remove existing layers
            this._mapInstance.eachLayer((l) => {
                this._mapInstance.removeLayer(l);
            });
            this._layerCache = {};
            this._layerStates = [];

            //set new base layer
            this.setBaseLayer(map.baseLayer);

            //add layers from loaded map
            this.addLayers(map.layers);

            //add features
            if(map.annotations && map.annotations.geoJSON) {
                let fc = map.annotations.geoJSON;
                if(fc.features)
                    this.addFeatures(fc.features);
                else
                    this.addFeatures([fc]);
            }

            this._mapInstance.fitBounds([
                [extent.miny, extent.minx],
                [extent.maxy, extent.maxx]
            ]);

            this.clean();
            this.notify('map:loaded', map);

        }


        /**
         *
         */
        destroyMap () {
            this._mapInstance = null;
            this._layerCache = null;
            this._layerStates = null;
            this._featureLayer = null;
        }

        /**
         * Used to take an existing map that is already persisted on the
         * server and unlink it here in the client so that it will be saved
         * as a completely new map when MapService.saveMap(...) is next called
         */
        setAsNewMap (mapToUse) {
            this._mapId = null;
            this._mapDef = mapToUse || this.initializeMapDefinition();
        }


        /* ==============================================
            Tool operations
           ============================================== */

        registerTool (id, tool) {
            this._tools[id] = tool;
        }

        unregisterTool (id) {
            this._tools[id] = null;
        }

        enableTool (id, finish) {
            if(!this._tools[id]) return false;
            this._tools[id].activate(function() {
                this.notify('tool:disabled', id);
            });
            this.notify('tool:enabled', id);
        }


        /* ----------- MISC ------------ */

        //https://github.com/gsklee/ngStorage
        cacheMap () {

            if(state.dirty) {
                var map = this.getMapResourceContent();
                //use exploded layer info
                map.layers = this._layerStates.slice(0);
                // $sessionStorage.map = map;
            }
        }

        restoreMap () {
            // if($sessionStorage.map) {
            //     console.log("Restoring cached map");
            //     let map = $sessionStorage.map;
            //     // console.log(JSON.stringify(map));
            //     $sessionStorage.map = null;
            //     this.loadMapFromObj(map);
            // }
        }
        /* ---------------------------- */
    }

    L.GeoPlatform.MapFactory = function(key) {
        this.keys = this.keys || {};
        if(key && this.keys[key]) return this.keys[key];
        let instance = new MapInstance();
        this.keys[instance._key] = instance;
        return instance;
    };

})(jQuery, Q, L/*eaflet*/, GeoPlatform);
