
(function (root, factory) {
    if(typeof define === "function" && define.amd) {
        // Now we're wrapping the factory and assigning the return
        // value to the root (window) and returning it as well to
        // the AMD loader.
        define(["jquery", "L"/*eaflet*/, "GeoPlatform"],
            function(jQuery, L, GeoPlatform) {
                return (root.featurePopupTemplate = factory(jQuery, L, GeoPlatform));
            });
    } else if(typeof module === "object" && module.exports) {
        // I've not encountered a need for this yet, since I haven't
        // run into a scenario where plain modules depend on CommonJS
        // *and* I happen to be loading in a CJS browser environment
        // but I'm including it for the sake of being thorough
        module.exports = (
            root.featurePopupTemplate = factory(
                require("jquery"),
                require('L'),
                require('GeoPlatform')
            )
        );
    } else {
        GeoPlatform.featurePopupTemplate = factory(jQuery, L/*eaflet*/, GeoPlatform);
    }
}(this||window, function(jQuery, L/*eaflet*/, GeoPlatform) {


    if(!L) {
        throw new Error("Missing Leaflet");
    }
    if(!L.GeoPlatform) {
        throw new Error("Missing GeoPlatform extensions to Leaflet");
    }


    L.GeoPlatform.featurePopupTemplate = function (feature) {

        let props = Object.keys(feature.properties);

        const pFn = function(list, names) {
            if(!list || !list.find) return null;
            let match = list.find( name => {
                let lc = name.toLowerCase();
                return names.indexOf(lc)>=0;
            });
            return match;
        };

        let titleProp = pFn(props, ['title','name','label']);
        let title = titleProp ? feature.properties[titleProp] : "Untitled";

        let descProp = pFn(props, ['description', 'summary', 'descript']);
        let description = descProp ? feature.properties[descProp] : "No description provided";

        let result = '<div class="feature-popup">' +
            '<h5>' + title + '</h5>' +
            '<p>' + description + '</p>';

        if(feature.properties.modified) {
            let modified = new Date(feature.properties.modified);
            result += '<div><span class="label">Updated</span><span class="value">' +
                modified.toDateString() + '</span></div>';
        }

        if(feature.properties['cap:effective']) {
            let date = new Date(feature.properties['cap:effective']);
            result += '<div>' +
                '<span class="label">Effective</span>' +
                '<span class="value">' +
                date.toDateString() + ' ' + date.toTimeString() +
                '</span>' +
                '</div>';
        }
        if(feature.properties['cap:expires']) {
            let date = new Date(feature.properties['cap:expires']);
            result += '<div>' +
                '<span class="label">Expires</span>' +
                '<span class="value">' +
                date.toDateString() + ' ' + date.toTimeString() +
                '</span>' +
                '</div>';
        }

        let linkProp = pFn(props, ['landingpage','link','website']);
        if(linkProp) {
            result += '<br>';
            result += '<a href="' + feature.properties[linkProp] + '" target="_blank">link</a>';
        }

        result += '<hr>';

        for(let prop in feature.properties) {
            if(titleProp === prop || descProp === prop ||
                linkProp === prop || 'modified' === prop)
                continue;
            let value = feature.properties[prop];
            if(typeof(value) === 'object') {
                for(let p in value) {
                    result += '<div>' +
                        '<span class="label">' + prop + '.' + p + '</span>' +
                        '<span class="value">' + value[p] + '</span>' +
                        '</div>';
                }
            } else {
                result += '<div>' +
                    '<span class="label">' + prop + '</span>' +
                    '<span class="value">' + value + '</span>' +
                    '</div>';
            }
        }
        result += '</div>';
        return result;
    };

    return L.GeoPlatform.featurePopupTemplate;

}));
