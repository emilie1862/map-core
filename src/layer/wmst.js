

import jQuery from "jquery";
import Q from "q";
import { TileLayer, tileLayer, TimeDimension, timeDimension } from 'leaflet';

import {Config} from 'geoplatform.client';


var WMST = TimeDimension.Layer.WMS.extend({

    //override default parser to query all Layers (whether queryable or not)
    _parseTimeDimensionFromCapabilities: function(xml) {
        var layers = xml.querySelectorAll('Layer');
        var layerName = this._baseLayer.wmsParams.layers;
        var layer = null;
        var times = null;

        layers.forEach(function(current) {
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
    _getTimesFromLayerCapabilities: function(layer) {
        var times = null;
        var dimensions = layer.querySelectorAll("Dimension[name='time']");
        if (dimensions && dimensions.length && dimensions[0].textContent.length) {
            times = dimensions[0].textContent.trim();
        }
        if(!times || !times.length) {
            var extents = layer.querySelectorAll("Extent[name='time']");
            if (extents && extents.length && extents[0].textContent.length) {
                times = extents[0].textContent.trim();
            }
        }
        if(times && ~times.indexOf("current")) {
            times = times.replace('current', new Date().toISOString());
        }
        return times;
    }

});




function wmst(gpLayer) {

    let service = gpLayer.services[0];
    let url = service.href;

    let opts = {
        layers: gpLayer.layerName,
        transparent: true,
        format: "image/png",
        wmvId: gpLayer.layerId
    };
    if(Config.leafletPane)
        opts.pane = Config.leafletPane;

    let leafletLayer = new TileLayer.CustomWMS( url, opts );

    let proxyUrl = Config.ualUrl + '/api/services/' +
        service.id + '/proxy/capabilities';

    let tdOpts = {};

    if(gpLayer.temporal) {

        let d1 = gpLayer.temporal.startDate ?
            new Date(gpLayer.temporal.startDate) : new Date();
        let d2 = gpLayer.temporal.endDate ?
            new Date(gpLayer.temporal.endDate) : new Date();

        tdOpts.times = d1.toISOString() + '/' + d2.toISOString() + '/P1D';
    }

    return new WMST(leafletLayer, {
        timeDimension: timeDimension(tdOpts),
        proxy: proxyUrl
    });
}


TileLayer.WMST = WMST;
tileLayer.wmst = wmst;

export {
    WMST as default,
    WMST,
    wmst
};