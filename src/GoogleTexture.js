/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2017 Andrea Di Saverio
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

"use strict";

(function(global, factory) {
    if (typeof define === 'function' && define.amd) define(['async', 'utils', 'GoogleCoords'], factory);
    else {
        global.DH = global.DH || {};
        global.DH.GoogleTexture = factory(global.async, global.DH.utils, global.DH.GoogleCoords);
    }
})(this, function (async, utils, GoogleCoords) {

    var MAP_SCALE = 2;

    function GoogleTexture(googleApiKey) {
        this.MAX_TEXTURE_SIZE = 512;
        this.API_KEY = googleApiKey;
        this.coords = new GoogleCoords();
    }

    GoogleTexture.prototype.URL = 'https://maps.googleapis.com/maps/api/staticmap?center={{LAT}},{{LON}}&zoom={{ZOOM}}&size={{SIZE}}x{{SIZE}}&scale=' + MAP_SCALE + '&maptype={{MAPTYPE}}&key={{API_KEY}}';

    GoogleTexture.prototype.getTextureVerticesInPixelCoords = function (centerLatLon, zoom, size) {

        var centerPixelCoords = this.coords.getPixelCoordinates(centerLatLon, zoom);
        
        return {
            tl: {x: centerPixelCoords.x - size / 2, y: centerPixelCoords.y - size / 2},
            tr: {x: centerPixelCoords.x + size / 2, y: centerPixelCoords.y - size / 2},
            bl: {x: centerPixelCoords.x - size / 2, y: centerPixelCoords.y + size / 2},
            br: {x: centerPixelCoords.x + size / 2, y: centerPixelCoords.y + size / 2}
        }
    };

    GoogleTexture.prototype.getTextureVerticesInWorldCoords = function (centerLatLon, zoom, size) {

        var verticesPixelCoords = this.getTextureVerticesInPixelCoords(centerLatLon, zoom, size);

        return {
            tl: {x: verticesPixelCoords.tl.x / (1 << zoom), y: verticesPixelCoords.tl.y / (1 << zoom)},
            tr: {x: verticesPixelCoords.tr.x / (1 << zoom), y: verticesPixelCoords.tr.y / (1 << zoom)},
            bl: {x: verticesPixelCoords.bl.x / (1 << zoom), y: verticesPixelCoords.bl.y / (1 << zoom)},
            br: {x: verticesPixelCoords.br.x / (1 << zoom), y: verticesPixelCoords.br.y / (1 << zoom)}
        }
    };

    GoogleTexture.prototype.getTextureVerticesCoords = function(centerLatLon, zoom, size) {

        var verticesWorldCoords = this.getTextureVerticesInWorldCoords(centerLatLon, zoom, size);

        return {
            tl: this.coords.getLatLon(verticesWorldCoords.tl),
            tr: this.coords.getLatLon(verticesWorldCoords.tr),
            bl: this.coords.getLatLon(verticesWorldCoords.bl),
            br: this.coords.getLatLon(verticesWorldCoords.br)
        }
    };

    GoogleTexture.prototype.load = function(centerLatLon, zoom, size, zoomIncrement, maptype) {

        var promises = [];

        getUrls.call(this).forEach(function(url) {
            var deferred = async.defer();

            var image = new Image();
            image.crossOrigin = true;
            image.src = url;
            image.onload = (function(deferred, image) {
                return function() {
                    deferred.resolve(image);
                };
            })(deferred, image);

            promises.push(deferred.promise);
        });

        return async.all(promises);

        function getUrls() {

            var targetZoom = zoom + (zoomIncrement || 0);

            return getCenters.call(this).map((function(latLon) {
                return utils.replace(this.URL, {
                    LAT: latLon.lat,
                    LON: latLon.lon,
                    ZOOM: targetZoom,
                    SIZE: size > this.MAX_TEXTURE_SIZE ? this.MAX_TEXTURE_SIZE : (size || this.MAX_TEXTURE_SIZE),
                    API_KEY: this.API_KEY,
                    MAPTYPE: maptype || "satellite"
                })
            }).bind(this));

            function getCenters() {

                var _this = this;

                return getCentersRec(centerLatLon, zoom);

                function getCentersRec(currentLatLon, currentZoom) {
                    if (currentZoom < targetZoom) {
                        var centers = [];
                        getFourCenters(currentLatLon, currentZoom).forEach(function(centerLatLon) {
                            centers = centers.concat(getCentersRec(centerLatLon, currentZoom+1));
                        });
                        return sortCenters(centers);
                    } else {
                        return [currentLatLon];
                    }
                }

                function getFourCenters(latLon, currentZoom) {
                    // var coords = coordsObj.getTextureVerticesInLatLon(coordsObj.getPixelCoordinates(latLon, currentZoom, size/2), currentZoom, size/2);
                    var coords = _this.getTextureVerticesCoords(latLon, currentZoom, size/2);
                    return [coords.tl, coords.tr, coords.bl, coords.br];
                }

                function sortCenters(centers) {

                    var len = centers.length;

                    if (len == 4) {
                        return centers;
                    } else {

                        var groupLength = Math.sqrt(len) / 2;

                        var lines = [];
                        for (var i=0; i<4; i++) {
                            lines.push(centers.slice(i * (len/4), (i+1) * (len/4)));
                        }

                        var mergedLines = [];
                        for (var i=0; i<lines.length; i+=2) {
                            mergedLines = mergedLines.concat(mergeLines(lines[i], lines[i+1], groupLength));
                        }

                        return mergedLines;
                    }

                    function mergeLines(firstLine, secondLine, groupLength) {

                        var steps = firstLine.length / groupLength;

                        var mergedLine = [];
                        for (var i=0; i<steps; i++) {
                            var firstPart = firstLine.slice(i*groupLength, (i+1)*groupLength);
                            var secondPart = secondLine.slice(i*groupLength, (i+1)*groupLength);
                            mergedLine = mergedLine.concat(firstPart);
                            mergedLine = mergedLine.concat(secondPart)
                        }
                        return mergedLine;
                    }
                }
            }
        }
    };

    return GoogleTexture;
});