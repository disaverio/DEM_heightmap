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

define(['params'], function (params) {

    function GoogleCoords() {
        this.TILE_SIZE = 256;
    }

    GoogleCoords.prototype.getLatLon = function (worldCoords) {

        var a = Math.pow(Math.E, (2 * Math.PI - (4 * Math.PI * worldCoords.y) / this.TILE_SIZE));
        var siny = (a - 1) / (a + 1);

        return {
            lat: (180 * Math.asin(siny)) / Math.PI,
            lon: (worldCoords.x / this.TILE_SIZE - 0.5) * 360
        }
    };

    GoogleCoords.prototype.getWorldCoordinates = function (latLonCoords) {

        var siny = Math.sin(latLonCoords.lat * Math.PI / 180);

        return {
            x: this.TILE_SIZE * (0.5 + latLonCoords.lon / 360),
            y: this.TILE_SIZE * (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI))
        };
    };

    GoogleCoords.prototype.getPixelCoordinates = function (latLonCoords, zoom) {

        var worldCoords = this.getWorldCoordinates(latLonCoords);

        return {
            x: Math.floor(worldCoords.x * (1 << zoom)),
            y: Math.floor(worldCoords.y * (1 << zoom))
        };
    };

    GoogleCoords.prototype.getTileCoordinates = function (latLonCoords, zoom) {

        var pixelCoords = this.getPixelCoordinates(latLonCoords, zoom);

        return {
            x: Math.trunc(pixelCoords.x / this.TILE_SIZE),
            y: Math.trunc(pixelCoords.y / this.TILE_SIZE)
        };
    };

    GoogleCoords.prototype.getCoordsInTile = function (latLonCoords, zoom) {

        var pixelCoords = this.getPixelCoordinates(latLonCoords, zoom);

        return {
            x: pixelCoords.x % this.TILE_SIZE,
            y: pixelCoords.y % this.TILE_SIZE
        }
    };

    GoogleCoords.prototype.getTileVerticesInPixelCoords = function (tileCoords) {
        return {
            tl: { x: tileCoords.x * this.TILE_SIZE, y: tileCoords.y * this.TILE_SIZE },
            tr: { x: tileCoords.x * this.TILE_SIZE + this.TILE_SIZE, y: tileCoords.y * this.TILE_SIZE },
            bl: { x: tileCoords.x * this.TILE_SIZE, y: tileCoords.y * this.TILE_SIZE + this.TILE_SIZE },
            br: { x: tileCoords.x * this.TILE_SIZE + this.TILE_SIZE, y: tileCoords.y * this.TILE_SIZE + this.TILE_SIZE }
        }
    };

    GoogleCoords.prototype.getTileVerticesInWorldCoords = function (tileCoords, zoom) {

        var vCoords = this.getTileVerticesInPixelCoords(tileCoords);

        return {
            tl: {x: vCoords.tl.x / (1 << zoom), y: vCoords.tl.y / (1 << zoom)},
            tr: {x: vCoords.tr.x / (1 << zoom), y: vCoords.tr.y / (1 << zoom)},
            bl: {x: vCoords.bl.x / (1 << zoom), y: vCoords.bl.y / (1 << zoom)},
            br: {x: vCoords.br.x / (1 << zoom), y: vCoords.br.y / (1 << zoom)}
        }
    };

    GoogleCoords.prototype.getTileVerticesInLatLon = function (tileCoords, zoom) {

        var vCoords = this.getTileVerticesInWorldCoords(tileCoords, zoom);

        return {
            tl: this.getLatLon(vCoords.tl),
            tr: this.getLatLon(vCoords.tr),
            bl: this.getLatLon(vCoords.bl),
            br: this.getLatLon(vCoords.br)
        }
    };

    return GoogleCoords;
});