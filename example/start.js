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

define(['DemHeightmap'], function (DemHeightmap) {
    requirejs(['domReady!'], function (document) {

        var configuration = {
            demType: 'hgt',
            googleApiKey: 'AIzaSyAMZGmhCYmv6gFZwFzhnTYxZWrjBCQ2jg4',
            dem: {
                bil: {
                    format: ".bil",
                    folder: "../dem_files/bil/",
                    filename: "{{NS}}{{LAT}}_{{WE}}{{LON}}_1arc_v3",
                    endianness: "little",
                    uppercaseName: false,
                    overlap: true
                },
                hgt: {
                    format: ".hgt",
                    folder: "../dem_files/hgt/",
                    filename: "{{NS}}{{LAT}}{{WE}}{{LON}}",
                    endianness: "big",
                    uppercaseName: true,
                    overlap: true
                }
            },
            render: {
                zoom: 13,
                detailsLevel: 3,
                textureType: "terrain",
                output: {
                    mapContainer: 'map-container',
                    showElevation: true,
                    elevationContainer: 'el-container',
                    elevationText: 'Elevation: '
                }
            }
        };

        var demHeightmap = new DemHeightmap(configuration);

        demHeightmap.render(45.976581, 7.658447)
            .then(function() {
                document.getElementsByClassName("loader-wrapper")[0].style.display = "none";
                document.getElementById("map-container").style.display = "block";
                document.getElementById("el-container").style.display = "block";
            })
            .catch(function(error) {
                console.log(error);
            });
    });
});