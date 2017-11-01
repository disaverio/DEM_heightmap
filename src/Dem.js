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
    if (typeof define === 'function' && define.amd) define(['async', 'utils'], factory);
    else {
        global.DH = global.DH || {};
        global.DH.Dem = factory(global.DH.async, global.DH.utils);
    }
})(this, function (async, utils) {

    function _getMachineEndianness() {

        // from https://stackoverflow.com/questions/7869752/javascript-typed-arrays-and-endianness

        var arrayBuffer = new ArrayBuffer(2);
        var uint8Array = new Uint8Array(arrayBuffer);
        var uint16array = new Uint16Array(arrayBuffer);

        uint8Array[0] = 0xAA;
        uint8Array[1] = 0xBB;

        if(uint16array[0] === 0xBBAA) return "little";
        if(uint16array[0] === 0xAABB) return "big";
        else throw new Error("Something crazy just happened");
    }

    function _getDemFilesInfo(coords) {

        var topLat, leftLon, botLat, rightLon;

        if (coords.lat && coords.lon) {
            topLat = Math.floor(coords.lat) + 1;
            leftLon = Math.floor(coords.lon);
            botLat = Math.floor(coords.lat);
            rightLon = Math.floor(coords.lon) + 1;
        } else if (coords.topLat && coords.botLat && coords.leftLon && coords.rightLon) {
            topLat = coords.topLat % 1 == 0 ? coords.topLat : Math.ceil(coords.topLat);
            leftLon = Math.floor(coords.leftLon);
            botLat = Math.floor(coords.botLat);
            rightLon = coords.rightLon % 1 == 0 ? coords.rightLon : Math.ceil(coords.rightLon);
        }

        var demCoords = [];
        for (var i=topLat-1; i>=botLat; i--) { // dem files are ordered from left to right and then from top to bottom
            for (var j=leftLon; j<rightLon; j++) {
                demCoords.push({ lat: i, lon: j });
            }
        }

        demCoords = demCoords.map(function(coord) {
            return {
                NS: coord.lat < 0 ? 's' : 'n',
                WE: coord.lon < 0 ? 'w' : 'e',
                LAT: ('0' + Math.abs(coord.lat)).slice(-2),
                LON: ('00' + Math.abs(coord.lon)).slice(-3)
            }
        });

        var demFiles = demCoords.map((function(coord) {
            return getDemFilename.call(this, coord);
        }).bind(this));

        return {
            listToLoad: demFiles,
            hSquares: rightLon - leftLon,
            vSquares: topLat - botLat,
            limits: {
                minLat: botLat,
                minLon: leftLon,
                maxLat: topLat,
                maxLon: rightLon
            },
            requestedArea: {
                tl: { lat: coords.topLat, lon: coords.leftLon },
                tr: { lat: coords.topLat, lon: coords.rightLon },
                bl: { lat: coords.botLat, lon: coords.leftLon },
                br: { lat: coords.botLat, lon: coords.rightLon }
            },
            overlap: this.configuration[this.demType].overlap
        };

        function getDemFilename(coord) {

            var filename = utils.replace(this.configuration[this.demType].filename, coord);

            if (this.configuration[this.demType].uppercaseName) {
                filename = filename.toUpperCase();
            }

            return this.configuration[this.demType].folder + filename + this.configuration[this.demType].format;
        }
    }

    function Dem(demType, demConfiguration) {
        this.demType = demType || 'hgt';
        this.configuration = demConfiguration;
    }

    Dem.prototype.load = function(demList) {

        var promises = [];
        var self = this;

        demList.forEach(function(file) {

            var deferred = async.defer();

            var httpReq = new XMLHttpRequest();
            httpReq.open('GET', file, true);
            httpReq.responseType = 'arraybuffer';
            httpReq.onload = (function(deferred, file) {
                return function (event) {
                    deferred.resolve(getInt16Array.call(self, this.response, file));
                };
            })(deferred, file);
            httpReq.send();

            promises.push(deferred.promise);
        });

        return async.all(promises);

        function getInt16Array(arraybuffer, file) {

            var int16array;

            var hasOverflowValues = false;
            var overflowedFirstIndex = -1;
            if (_getMachineEndianness() != this.configuration[this.demType].endianness) {

                var convertedArraybuffer = new Uint8Array(arraybuffer);

                var arrayBuffer = new ArrayBuffer(arraybuffer.byteLength);
                var int8Array = new Uint8Array(arrayBuffer);
                int16array = new Uint16Array(arrayBuffer);

                for (var i=0; i<convertedArraybuffer.length; i+=2) {
                    int8Array[i] = convertedArraybuffer[i+1];
                    int8Array[i+1] = convertedArraybuffer[i];

                    if (int16array[i/2] < 0) {
                        hasOverflowValues = true;
                        overflowedFirstIndex = i/2;
                    }
                }
            } else {
                int16array = new Int16Array(arraybuffer);

                for (var j=0; j<int16array.length; j++) {
                    if (int16array[j] < 0) {
                        hasOverflowValues = true;
                        overflowedFirstIndex = j;
                        break;
                    }
                }
            }

            if (hasOverflowValues) {
                console.warn("WARNING!! OVERFLOWED VALUES IN " + file);
                console.warn("    First overflowed value at position: " + overflowedFirstIndex);
            }

            return int16array;
        }
    };

    Dem.prototype.normalizeDem = function(dem, conf) {
        /*
         * normalize dem map to a desired NxM dimension
         */

        conf = conf || {};

        var outputColumns, outputLines;

        if (conf.multipleOf) {
            var hSegments = dem.columns - 1;
            var hSegmentsDesired = hSegments + ((conf.multipleOf - (hSegments % conf.multipleOf)) %  conf.multipleOf);

            var vSegments = dem.lines - 1;
            var vSegmentsDesired = vSegments + ((conf.multipleOf - (vSegments % conf.multipleOf)) %  conf.multipleOf);

            outputColumns = hSegmentsDesired + 1;
            outputLines = vSegmentsDesired + 1;
        } else if (conf.outputLines && conf.outputColumns) {
            outputColumns = conf.outputColumns;
            outputLines = conf.outputLines;
        } else {
            outputColumns = dem.columns;
            outputLines = dem.lines;
        }


        return {
            dem: normalize(dem.requestedPortion, dem.columns, dem.lines, outputColumns, outputLines),
            lines: outputLines,
            columns: outputColumns
        };

        function normalize(demMap, hPoints, vPoints, hPointsDesired, vPointsDesired) {

            if (hPoints == hPointsDesired && vPoints == vPointsDesired) {
                return demMap;
            }

            // relative to original length
            var hSegmentRelativeLength = (hPoints - 1) / (hPointsDesired - 1);
            var vSegmentRelativeLength = (vPoints - 1) / (vPointsDesired - 1);

            var normalizedDem = new Int16Array(hPointsDesired * vPointsDesired);

            var idx=0;

            for(var i=0; i<vPointsDesired; i++) {

                // point distance from top border, relative to original length of segment
                var relativeDistanceFromFirstRow = i * vSegmentRelativeLength;

                for(var j=0; j<hPointsDesired; j++) {

                    // point distance from left border, relative to original length of segment
                    var relativeDistanceFromFirstColumn = j * hSegmentRelativeLength;

                    var hPreviousPoint = Math.floor(relativeDistanceFromFirstColumn);
                    var hNextPoint = Math.ceil(relativeDistanceFromFirstColumn);
                    var vPreviousPoint = Math.floor(relativeDistanceFromFirstRow);
                    var vNextPoint = Math.ceil(relativeDistanceFromFirstRow);

                    var x = relativeDistanceFromFirstColumn % 1;
                    var y = relativeDistanceFromFirstRow % 1;

                    var a = demMap[vPreviousPoint*hPoints + hPreviousPoint];
                    var b = demMap[vPreviousPoint*hPoints + hNextPoint];
                    var c = demMap[vNextPoint*hPoints + hPreviousPoint];
                    var d = demMap[vNextPoint*hPoints + hNextPoint];

                    normalizedDem[idx++] = x * y * (-a + b - c + d) + y * (-a + c) + x * (-a + b) + a;
                }
            }

            return normalizedDem;
        }
    };

    Dem.prototype.getDemPortion = function(demMap, demMapLines, demMapColumns, demMapLimits, requestedArea) {

        var maxLat = requestedArea.tl.lat;
        var minLon = requestedArea.tl.lon;
        var minLat = requestedArea.br.lat;
        var maxLon = requestedArea.br.lon;

        var maxLatPerc = (demMapLimits.maxLat - maxLat) / (demMapLimits.maxLat - demMapLimits.minLat);
        var minLatPerc = (demMapLimits.maxLat - minLat) / (demMapLimits.maxLat - demMapLimits.minLat);
        var minLonPerc = (minLon - demMapLimits.minLon) / (demMapLimits.maxLon - demMapLimits.minLon);
        var maxLonPerc = (maxLon - demMapLimits.minLon) / (demMapLimits.maxLon - demMapLimits.minLon);

        var startLine = Math.round(demMapLines * maxLatPerc);
        var endLine = Math.round(demMapLines * minLatPerc);
        var startColumn = Math.round(demMapColumns * minLonPerc);
        var endColumn = Math.round(demMapColumns * maxLonPerc);

        var requestedPortion = new Int16Array((endLine - startLine) * (endColumn - startColumn));

        var idx = 0;
        for (var i=startLine; i<endLine; i++) {
            for (var j=startColumn; j<endColumn; j++) {
                requestedPortion[idx++] = demMap[i*demMapColumns+j];
            }
        }

        return {
            requestedPortion: requestedPortion,
            lines: endLine - startLine,
            columns: endColumn - startColumn
        };
    };

    Dem.prototype.concatDems = function(hSquares, vSquares, demFiles, overlap) {

        var demSize = Math.sqrt(demFiles[0].length);
        var demLength = demFiles[0].length;

        var concatenatedDemLength;
        if (overlap) {
            concatenatedDemLength = demLength * demFiles.length - (hSquares - 1) * vSquares * demSize - (vSquares - 1) * hSquares * demSize;
        } else {
            concatenatedDemLength = demLength * demFiles.length;
        }

        var concatenatedDem = new Int16Array(concatenatedDemLength);

        var idx = 0;
        for (var i=0; i< vSquares; i++) {
            for (var line=0; line<demSize; line++) {
                if (overlap && line == 0 && i != 0) continue;
                for (var j = 0; j < hSquares; j++) {
                    for (var element=0; element<demSize; element++) {
                        if (overlap && element == 0 && j != 0) continue;
                        concatenatedDem[idx++] = demFiles[i*hSquares+j][line*demSize+element];
                    }
                }
            }
        }


        var linesDiff = overlap ? vSquares - 1 : 0;
        var columnsDiff = overlap ? hSquares - 1 : 0;

        return {
            concatenatedDem: concatenatedDem,
            lines: demSize * vSquares - linesDiff,
            columns: demSize * hSquares - columnsDiff
        };
    };

    Dem.prototype.getDem = function(coords, conf) {

        if (!(coords.lat && coords.lon) && !(coords.topLat && coords.botLat && coords.leftLon && coords.rightLon)) {
            throw new Error("Invalid input.");
        }

        var deferred = async.defer();
        var demsInfo = _getDemFilesInfo.call(this, coords);

        this.load(demsInfo.listToLoad)
            .then((function(demList) {
                var concatDemResponse = this.concatDems(demsInfo.hSquares, demsInfo.vSquares, demList, demsInfo.overlap);
                var demPortion = this.getDemPortion(concatDemResponse.concatenatedDem, concatDemResponse.lines, concatDemResponse.columns, demsInfo.limits, demsInfo.requestedArea);
                var normalizedDem = this.normalizeDem(demPortion, conf);
                deferred.resolve(normalizedDem);
            }).bind(this));

        return deferred.promise;
    };

    return Dem;
});