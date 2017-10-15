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

define(['threejs', 'OrbitControls', 'Dem', 'GoogleTexture', 'Texture', 'async', 'utils'], function (THREE, OrbitControls, Dem, GoogleTexture, Texture, async, utils) {

    function onMouseMove(mouse, renderer, camera, mapInfo, raycaster, event) {

        mouse.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
        mouse.y = - ( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        var intersect = raycaster.intersectObject(mapInfo.mesh);

        if (intersect.length > 0) {
            console.log((intersect[0].point.y / mapInfo.scaleFactor + mapInfo.minMax.min.value));
        }
    }

    var setElevations = function(demMap, lines, columns, geometry, min, max, scaleFactor, percentElevation) {

        var completed = true;

        percentElevation = percentElevation || 1;

        var color = new THREE.Color(0, 1, 0);

        for (var i = 0; i < lines; i++) {
            for (var j = 0; j < columns; j++) {

                var height = demMap[i * columns + j] * scaleFactor;
                var transposedVal = height - min * scaleFactor; // move to ground

                var increment = transposedVal * percentElevation; // for animation
                var currentVal = geometry.attributes.position.array[(columns * i + j) * 3 + 2];
                var newVal = currentVal + increment;

                if (transposedVal == 0 || newVal / transposedVal > 0.99) {
                    newVal = transposedVal;
                } else {
                    completed = false;
                }

                if (geometry.attributes.color) {
                    geometry.attributes.color.array[(columns * i + j) * 3] = color.r * (newVal / (max - min) * 20 + 0.2);
                    geometry.attributes.color.array[(columns * i + j) * 3 + 1] = color.g * (newVal / (max - min) * 20 + 0.2);
                    geometry.attributes.color.array[(columns * i + j) * 3 + 2] = color.b * (newVal / (max - min) * 20 + 0.2);
                }

                geometry.attributes.position.array[(columns * i + j) * 3 + 2] = newVal; // <-- for PlaneBufferGeometry
                // geometry.vertices[i*lines+j].setZ(height-min); // <-- for PlaneGeometry
            }
        }

        geometry.attributes.position.needsUpdate = true;

        return completed;
    };

    function renderMap(type, scene, texture, dem, scaleFactor, latExtension) {

        scaleFactor = getScaleFactor(scaleFactor);

        var geometryWidth = (dem.columns - 1);
        var geometryHeight = (dem.lines - 1);

        var geometry = getGeometry(geometryWidth, geometryHeight);

        var minMax = getMinMax();

        setElevations = setElevations.bind(null, dem.dem, dem.lines, dem.columns, geometry, minMax.min.value, minMax.min.value, scaleFactor);

        var mesh = setMesh();

        return {
            mesh: mesh,
            minMax: minMax,
            scaleFactor: scaleFactor
        };

        function getGeometry(geometryWidth, geometryHeight) {

            return type == 'points' ? getPointsGeometry() : getPlaneGeometry();

            function getPlaneGeometry() {
                return new THREE.PlaneBufferGeometry(1, 1, geometryWidth, geometryHeight);
            }

            function getPointsGeometry() {

                var color = new THREE.Color(1, 0, 0);
                var numPoints = dem.columns * dem.lines;

                var positions = new Float32Array(numPoints * 3);
                var colors = new Float32Array(numPoints * 3);

                var idx = 0;

                for( var i = 0; i < dem.lines; i++ ) {
                    for( var j = 0; j < dem.columns; j++ ) {

                        var u = 1- i / dem.lines;
                        var v =  j / dem.columns;
                        var x = u - 0.5;
                        var z = v - 0.5;

                        positions[3 * idx] = z;
                        positions[3 * idx + 1] = x;
                        positions[3 * idx + 2] = 0;

                        colors[3 * idx] = color.r;
                        colors[3 * idx + 1] = color.g;
                        colors[3 * idx + 2] = color.b;

                        idx++;
                    }
                }

                var geometry = new THREE.BufferGeometry();

                geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
                geometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
                geometry.computeBoundingBox();

                return geometry;
            }
        }

        function getScaleFactor(scaleFactor) {

            var EQUATOR_LENGTH = 40075036; // meters (elevation data are in meters)
            var sceneLength = (EQUATOR_LENGTH / 360) * latExtension; // meters

            return (1/sceneLength) * scaleFactor;
        }

        function getMinMax() {

            var min = Number.MAX_SAFE_INTEGER;
            var max = Number.MIN_SAFE_INTEGER;
            var minLine = -1;
            var minColumn = -1;
            var maxLine = -1;
            var maxColumn = -1;

            for (var i = 0; i < dem.lines; i++) {
                for (var j = 0; j < dem.columns; j++) {

                    var height = dem.dem[i * dem.columns + j];

                    if (height > 0 && height < min) { // check height > 0 to control overflowed values
                        min = height;
                        minLine = i;
                        minColumn = j;
                    }

                    if (height > max) {
                        max = height;
                        maxLine = i;
                        maxColumn = j;
                    }
                }
            }

            return {
                min: {
                    value: min,
                    line: minLine,
                    column: minColumn
                },
                max: {
                    value: max,
                    line: maxLine,
                    column: maxColumn
                }
            };
        }

        function setMesh() {

            var mesh;

            switch (type) {
                case 'texture':
                    mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture }));
                    break;
                case 'grid':
                    mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true }));
                    break;
                case 'points':
                    mesh = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.005, vertexColors: THREE.VertexColors }));
                    break;
            }

            mesh.rotateX(Math.PI / -2);
            mesh.rotateZ(Math.PI / 2);
            mesh.position.x =  1/2;
            mesh.position.z = 1/2;

            scene.add(mesh);

            return mesh;
        }
    }

    function createScene(document) {

        var windowWidth  = utils.getWidth(document);
        var windowHeight = utils.getHeight(document);

        var scene = new THREE.Scene();

        var axes = new THREE.AxisHelper();
        scene.add(axes);

        var camera = new THREE.PerspectiveCamera(45, windowWidth / windowHeight, 0.1, 1000);
        camera.position.set(1.4, 1/2, 1.4);

        var renderer = new THREE.WebGLRenderer();
        renderer.setSize(windowWidth-20, windowHeight-20);

        scene.add(new THREE.AmbientLight(0x8C8C8C));

        var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        directionalLight.intensity = 1;
        directionalLight.rotation.set(0, 0, 0);
        scene.add(directionalLight);

        var controls = new THREE.OrbitControls(camera);

        var container = document.getElementById('container').appendChild(renderer.domElement);

        return {
            scene: scene,
            renderer: renderer,
            controls: controls,
            camera: camera,
            container: container
        }
    }

    function App(document, googleApiKey, demType) {
        this.document = document;
        this.dem = new Dem(demType);
        this.gTexture = new GoogleTexture(googleApiKey);
        this.texture = new Texture();
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
        params.textureType = params.textureType || "satellite";
        params.withAnimation = params.withAnimation != false;
        params.type = params.type || 'texture';

        var latLon = {
            lat: lat,
            lon: lon
        };

        var sceneVertices = this.gTexture.getTextureVerticesCoords(latLon, params.zoom, params.size);
        var coordsLimits = {
            topLat: sceneVertices.tl.lat,
            botLat: sceneVertices.br.lat,
            leftLon: sceneVertices.tl.lon,
            rightLon: sceneVertices.br.lon
        };

        var allPromises = [];

        allPromises.push(this.dem.getDem(coordsLimits));

        if (params.type == 'texture') {
            allPromises.push(this.gTexture.load(latLon, params.zoom, params.size, params.detailsLevel, params.textureType));
        }

        var scene = createScene(this.document);

        async.all(allPromises)
            .then((function(response) {

                var texture = response[1] ? this.texture.combineTextures(response[1]) : undefined;
                var mapInfo = renderMap(params.type, scene.scene, texture, response[0], params.scaleFactor, coordsLimits.topLat - coordsLimits.botLat);

                scene.container.addEventListener('mousemove', onMouseMove.bind(null, new THREE.Vector2(), scene.renderer, scene.camera, mapInfo, new THREE.Raycaster()), false);

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
            }).bind(this))
            .catch(console.log);
    };

    return App;
});