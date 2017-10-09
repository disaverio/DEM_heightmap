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

define(['threejs', 'OrbitControls', 'Dem', 'GoogleTexture', 'async', 'utils'], function (THREE, OrbitControls, Dem, GoogleTexture, async, utils) {

    var setElevations = function(demMap, lines, columns, texturesForSize, geometries, geometryWidth, geometryHeight, min, scaleFactor, incrementPercent) {

        var completed = true;

        incrementPercent = incrementPercent || 1;

        var geomVIndex = 0;
        var previousGeomVIndex = 0;
        var resetVIndex = false;
        var tileLineIndex = 0;
        for (var i = 0; i < lines; i++) {

            geomVIndex = Math.floor(i / geometryHeight);

            resetVIndex = false;
            if (previousGeomVIndex != geomVIndex) {
                resetVIndex = true;
                previousGeomVIndex = geomVIndex;
                geomVIndex--;
            }

            var geomHIndex = 0;
            var resetHIndex = false;
            var previousGeomHIndex = 0;
            var tileColumnIndex = 0;
            for (var j = 0; j < columns; j++) {

                geomHIndex = Math.floor(j / geometryWidth);

                resetHIndex = false;
                if (previousGeomHIndex != geomHIndex) {
                    resetHIndex = true;
                    previousGeomHIndex = geomHIndex;
                    geomHIndex--;
                }

                var height = demMap[i * columns + j] * scaleFactor;
                var transposedVal = height - min;
                var increment = transposedVal * incrementPercent;

                var currentVal = geometries[geomVIndex * texturesForSize + geomHIndex].attributes.position.array[((geometryWidth + 1) * tileLineIndex + tileColumnIndex) * 3 + 2];
                var newVal = currentVal + increment;

                if (transposedVal == 0 || newVal / transposedVal > 0.99) {
                    newVal = transposedVal;
                } else {
                    completed = false;
                }

                geometries[geomVIndex * texturesForSize + geomHIndex].attributes.position.array[((geometryWidth + 1) * tileLineIndex + tileColumnIndex) * 3 + 2] = newVal; // <-- for PlaneBufferGeometry
                // geometry.vertices[i*lines+j].setZ(height-min); // <-- for PlaneGeometry

                if (resetHIndex && j + 1 != columns) {
                    j--;
                    tileColumnIndex = 0;
                } else {
                    previousGeomHIndex = geomHIndex;
                    tileColumnIndex++;
                }
            }

            if (resetVIndex && i + 1 != lines) {
                i--;
                tileLineIndex = 0;
            } else {
                previousGeomVIndex = geomVIndex;
                tileLineIndex++;
            }
        }

        for(var i=0; i<geometries.length; i++) {
            geometries[i].attributes.position.needsUpdate = true;
        }

        return completed;

    };

    function createRender(scene, textures, dem, scaleFactor, sceneExtension, sceneDimension) {

        scaleFactor = getScaleFactor(scaleFactor);

        var texturesForSize = Math.sqrt(textures.length);

        var geometryDimension = sceneDimension / texturesForSize;
        var geometryWidth = (dem.columns - 1) / texturesForSize;
        var geometryHeight = (dem.lines - 1) / texturesForSize;

        var geometries = [];
        for (var i=0; i<textures.length; i++) {
            geometries.push(new THREE.PlaneBufferGeometry(geometryDimension, geometryDimension, geometryWidth, geometryHeight));
        }

        var min = Number.MAX_SAFE_INTEGER;
        for (var i = 0; i < dem.lines; i++) {
            for (var j = 0; j < dem.columns; j++) {
                var height = dem.dem[i * dem.columns + j] * scaleFactor;
                min = (height > 0 && height < min) ? height : min;
            }
        }

        setElevations = setElevations.bind(null, dem.dem, dem.lines, dem.columns, texturesForSize, geometries, geometryWidth, geometryHeight, min, scaleFactor);

        var planes = [];
        var idx = 0;
        textures.forEach(function(texture) {
            planes.push(new THREE.Mesh(geometries[idx], new THREE.MeshBasicMaterial({ map: texture })));
            idx++;
        });

        for (var i=0; i<texturesForSize; i++) {
            for (var j=0; j<texturesForSize; j++) {
                var plane = planes[i*texturesForSize + j];
                plane.rotateX(Math.PI / -2);
                plane.rotateZ(Math.PI / 2);
                plane.position.x =  geometryDimension / 2 + geometryDimension * i;
                plane.position.z = - geometryDimension / 2 + geometryDimension * (texturesForSize - j);
                scene.add(plane);
            }
        }


        function getScaleFactor(scaleFactor) {

            var EQUATOR_LENGTH = 40075036; // meters, (elevation data are in meters)
            var sceneLength = (EQUATOR_LENGTH / 360) * sceneExtension; // meters

            return (sceneDimension / sceneLength) * scaleFactor;
        }
    }

    function createScene(document, sceneDimension) {

        var windowWidth  = utils.getWidth(document);
        var windowHeight = utils.getHeight(document);

        var scene = new THREE.Scene();

        var axes = new THREE.AxisHelper(sceneDimension);
        scene.add(axes);

        var camera = new THREE.PerspectiveCamera(45, windowWidth / windowHeight, 0.1, 1000);
        camera.position.set(sceneDimension * 1.4, sceneDimension / 2, sceneDimension * 1.4 );

        var renderer = new THREE.WebGLRenderer();
        renderer.setSize(windowWidth-20, windowHeight-20);

        scene.add(new THREE.AmbientLight(0x8C8C8C));

        var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        directionalLight.intensity = 1;
        directionalLight.rotation.set(0, 0, 0);
        scene.add(directionalLight);

        var controls = new THREE.OrbitControls(camera);

        document.getElementById('container').appendChild(renderer.domElement);

        return {
            scene: scene,
            renderer: renderer,
            controls: controls,
            camera: camera
        }
    }

    function App(document, googleApiKey, demType) {
        this.document = document;
        this.dem = new Dem(demType);
        this.texture = new GoogleTexture(googleApiKey);
    }

    App.prototype.render = function(lat, lon, params) {

        params = params || {};

        params.zoom = params.zoom > 20 ? 20 :
                      params.zoom < 11 ? 11 :
                                         (params.zoom || 12);
        params.size = params.size || 512;
        params.scaleFactor = params.scaleFactor || 1;
        params.detailsLevel = params.detailsLevel > 4 ? 4 :
                              params.detailsLevel < 0 ? 0 :
                                                        (params.detailsLevel || 0);
        params.mapType = params.mapType || "satellite";
        params.withAnimation = params.withAnimation == true;

        var sceneDimension = 1 << params.detailsLevel;

        var latLon = {
            lat: lat,
            lon: lon
        };

        var textureVertices = this.texture.getTextureVerticesCoords(latLon, params.zoom, params.size);
        var coordsLimits = {
            topLat: textureVertices.tl.lat,
            botLat: textureVertices.br.lat,
            leftLon: textureVertices.tl.lon,
            rightLon: textureVertices.br.lon
        };

        var texturePromise = this.texture.load(latLon, params.zoom, params.size, params.detailsLevel, params.mapType);
        var demPromise = this.dem.getDem(coordsLimits, { multipleOf: 1 << params.detailsLevel });

        async.all([texturePromise, demPromise])
            .then((function(response) {
                createRender(scene.scene, response[0], response[1], params.scaleFactor, coordsLimits.topLat - coordsLimits.botLat, sceneDimension);
                var completed = false;
                var increment;
                if (params.withAnimation) increment = 0.05;
                else increment = 1;
                var portionIncrement = 0.95;
                (function render() {
                    if (!completed) {
                        completed = setElevations(increment);
                        increment = increment * portionIncrement;
                    }
                    scene.controls.update();
                    requestAnimationFrame(render);
                    scene.renderer.render(scene.scene, scene.camera);
                })();
            }).bind(this));


        var scene = createScene(this.document, sceneDimension);
    };

    return App;
});