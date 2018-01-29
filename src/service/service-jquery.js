


(function (root, factory) {
    if(typeof define === "function" && define.amd) {
        // Now we're wrapping the factory and assigning the return
        // value to the root (window) and returning it as well to
        // the AMD loader.
        define(["jquery", "q", "GeoPlatform", "JQueryItemService"],
            function(jQuery, Q, GeoPlatform, JQueryItemService) {
                return (root.JQueryServiceService = factory(jQuery, Q, GeoPlatform, JQueryItemService));
            });
    } else if(typeof module === "object" && module.exports) {
        // I've not encountered a need for this yet, since I haven't
        // run into a scenario where plain modules depend on CommonJS
        // *and* I happen to be loading in a CJS browser environment
        // but I'm including it for the sake of being thorough
        module.exports = (
            root.JQueryServiceService = factory(
                require("jquery"),
                require('q'),
                require('GeoPlatform'),
                require('JQueryItemService')
            )
        );
    } else {
        GeoPlatform.JQueryServiceService = factory(jQuery, Q, GeoPlatform, GeoPlatform.JQueryItemService);
    }
}(this||window, function(jQuery, Q, GeoPlatform, JQueryItemService) {

// ( function(jQuery, Q, L/*eaflet*/, GeoPlatform) {

    'use strict';

    /**
     * GeoPlatform Service service
     * service for working with the GeoPlatform API to
     * retrieve and manipulate service objects.
     *
     * @see GeoPlatform.JQueryItemService
     */

    class JQueryServiceService extends JQueryItemService {

        constructor() {
            super();
            this.baseUrl = GeoPlatform.ualUrl + '/api/services';
        }


        /**
         * Fetch metadata from the specified GeoPlatform Service's
         * web-accessible implementation using either GetCapabilities
         * or ESRI documentInfo.
         * @param {Object} service - GeoPlatform Service object
         * @return {Promise} resolving service metadata
         */
        about( service ) {

            if(!service) {
                let err = new Error("Must provide service to get metadata about");
                return Q.reject(err);
            }

            let d = Q.defer();
            let opts = {
                method: "POST",
                url: this.baseUrl + '/about',
                dataType: 'json',
                data: service,
                processData: false,
                contentType: 'application/json',
                success: function(data) { d.resolve(data); },
                error: function(xhr, status, message) {
                    let m = `GeoPlatform.ServiceService.about() -
                        Error describing service: ${message}`;
                    let err = new Error(m);
                    d.reject(err);
                }
            };
            jQuery.ajax(opts);
            return d.promise;
        }

    }

    return JQueryServiceService;

}));
