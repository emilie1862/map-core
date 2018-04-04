
import {
    Control, control,
    Map,
    setOptions,
    DomUtil, DomEvent,
    layerGroup,
    polyline, CircleMarker, divIcon, marker
} from 'leaflet';


var measureControl = Control.extend({
    options: {
        position: 'topleft'
    },

    onAdd: function (map) {
        var className = 'leaflet-control-zoom leaflet-bar leaflet-control',
            container = DomUtil.create('div', className);

        this._createButton('&#8674;', 'Measure', 'leaflet-control-measure leaflet-bar-part leaflet-bar-part-top-and-bottom', container, this._toggleMeasure, this);

        return container;
    },

    _createButton: function (html, title, className, container, fn, context) {
        var link = DomUtil.create('a', className, container);
        link.innerHTML = html;
        link.href = '#';
        link.title = title;

        DomEvent
            .on(link, 'click', DomEvent.stopPropagation)
            .on(link, 'click', DomEvent.preventDefault)
            .on(link, 'click', fn, context)
            .on(link, 'dblclick', DomEvent.stopPropagation);

        return link;
    },

    _toggleMeasure: function () {
        this._measuring = !this._measuring;

        if(this._measuring) {
            DomUtil.addClass(this._container, 'leaflet-control-measure-on');
            this._startMeasuring();
        } else {
            DomUtil.removeClass(this._container, 'leaflet-control-measure-on');
            this._stopMeasuring();
        }
    },

    _startMeasuring: function() {
        this._oldCursor = this._map._container.style.cursor;
        this._map._container.style.cursor = 'crosshair';

        this._doubleClickZoom = this._map.doubleClickZoom.enabled();
        this._map.doubleClickZoom.disable();

        DomEvent
            .on(this._map, 'mousemove', this._mouseMove, this)
            .on(this._map, 'click', this._mouseClick, this)
            .on(this._map, 'dblclick', this._finishPath, this)
            .on(document, 'keydown', this._onKeyDown, this);

        if(!this._layerPaint) {
            this._layerPaint = layerGroup().addTo(this._map);
        }

        if(!this._points) {
            this._points = [];
        }
    },

    _stopMeasuring: function() {
        this._map._container.style.cursor = this._oldCursor;

        DomEvent
            .off(document, 'keydown', this._onKeyDown, this)
            .off(this._map, 'mousemove', this._mouseMove, this)
            .off(this._map, 'click', this._mouseClick, this)
            .off(this._map, 'dblclick', this._mouseClick, this);

        if(this._doubleClickZoom) {
            this._map.doubleClickZoom.enable();
        }

        if(this._layerPaint) {
            this._layerPaint.clearLayers();
        }

        this._restartPath();
    },

    _mouseMove: function(e) {
        if(!e.latlng || !this._lastPoint) {
            return;
        }

        if(!this._layerPaintPathTemp) {
            this._layerPaintPathTemp = polyline([this._lastPoint, e.latlng], {
                color: 'black',
                weight: 1.5,
                clickable: false,
                dashArray: '6,3'
            }).addTo(this._layerPaint);
        } else {
            this._layerPaintPathTemp.spliceLatLngs(0, 2, this._lastPoint, e.latlng);
        }

        if(this._tooltip) {
            if(!this._distance) {
                this._distance = 0;
            }

            this._updateTooltipPosition(e.latlng);

            var distance = e.latlng.distanceTo(this._lastPoint);
            this._updateTooltipDistance(this._distance + distance, distance);
        }
    },

    _mouseClick: function(e) {
        // Skip if no coordinates
        if(!e.latlng) {
            return;
        }

        // If we have a tooltip, update the distance and create a new tooltip, leaving the old one exactly where it is (i.e. where the user has clicked)
        if(this._lastPoint && this._tooltip) {
            if(!this._distance) {
                this._distance = 0;
            }

            this._updateTooltipPosition(e.latlng);

            var distance = e.latlng.distanceTo(this._lastPoint);
            this._updateTooltipDistance(this._distance + distance, distance);

            this._distance += distance;
        }
        this._createTooltip(e.latlng);


        // If this is already the second click, add the location to the fix path (create one first if we don't have one)
        if(this._lastPoint && !this._layerPaintPath) {
            this._layerPaintPath = polyline([this._lastPoint], {
                color: 'black',
                weight: 2,
                clickable: false
            }).addTo(this._layerPaint);
        }

        if(this._layerPaintPath) {
            this._layerPaintPath.addLatLng(e.latlng);
        }

        // Upate the end marker to the current location
        if(this._lastCircle) {
            this._layerPaint.removeLayer(this._lastCircle);
        }

        this._lastCircle = new CircleMarker(e.latlng, {
            color: 'black',
            opacity: 1,
            weight: 1,
            fill: true,
            fillOpacity: 1,
            radius:2,
            clickable: this._lastCircle ? true : false
        }).addTo(this._layerPaint);

        this._lastCircle.on('click', function() { this._finishPath(); }, this);

        // Save current location as last location
        this._lastPoint = e.latlng;
    },

    _finishPath: function() {
        // Remove the last end marker as well as the last (moving tooltip)
        if(this._lastCircle) {
            this._layerPaint.removeLayer(this._lastCircle);
        }
        if(this._tooltip) {
            this._layerPaint.removeLayer(this._tooltip);
        }
        if(this._layerPaint && this._layerPaintPathTemp) {
            this._layerPaint.removeLayer(this._layerPaintPathTemp);
        }

        // Reset everything
        this._restartPath();
    },

    _restartPath: function() {
        this._distance = 0;
        this._tooltip = undefined;
        this._lastCircle = undefined;
        this._lastPoint = undefined;
        this._layerPaintPath = undefined;
        this._layerPaintPathTemp = undefined;
    },

    _createTooltip: function(position) {
        var icon = divIcon({
            className: 'leaflet-measure-tooltip',
            iconAnchor: [-5, -5]
        });
        this._tooltip = marker(position, {
            icon: icon,
            clickable: false
        }).addTo(this._layerPaint);
    },

    _updateTooltipPosition: function(position) {
        this._tooltip.setLatLng(position);
    },

    _updateTooltipDistance: function(total, difference) {
        var totalRound = this._round(total),
            differenceRound = this._round(difference);

        var text = '<div class="leaflet-measure-tooltip-total">' + totalRound + ' nm</div>';
        if(differenceRound > 0 && totalRound != differenceRound) {
            text += '<div class="leaflet-measure-tooltip-difference">(+' + differenceRound + ' nm)</div>';
        }

        this._tooltip._icon.innerHTML = text;
    },

    _round: function(val) {
        return Math.round((val / 1852) * 10) / 10;
    },

    _onKeyDown: function (e) {
        if(e.keyCode == 27) {
            // If not in path exit measuring mode, else just finish path
            if(!this._lastPoint) {
                this._toggleMeasure();
            } else {
                this._finishPath();
            }
        }
    }
});

Control.Measure = measureControl;
control.measure = function (options) {
    return new Control.Measure(options);
};

Map.mergeOptions({
    measureControl: false
});

Map.addInitHook(function () {
    if (this.options.measureControl) {
        this.measureControl = new measureControl();
        this.addControl(this.measureControl);
    }
});


export default measureControl;
