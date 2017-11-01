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
    if (typeof define === 'function' && define.amd) define(['threejs', 'OrbitControls', 'Dem', 'GoogleTexture', 'Texture', 'async', 'utils'], factory);
    else {
        global.DH = global.DH || {};
        global.DH.DemHeightmap = factory(global.DH.threejs, global.DH.OrbitControls, global.DH.Dem, global.DH.GoogleTexture, global.DH.Texture, global.DH.async, global.DH.utils);
    }
})(this, function (THREE, OrbitControls, Dem, GoogleTexture, Texture, async, utils) {

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

    function createScene(outputParams) {

        var document = window.document;

        var windowWidth = outputParams.width || utils.getWidth(document) - 20;
        var windowHeight = outputParams.height || utils.getHeight(document) - 20;

        var scene = new THREE.Scene();

        var axes = new THREE.AxisHelper();
        scene.add(axes);

        var camera = new THREE.PerspectiveCamera(45, windowWidth / windowHeight, 0.1, 1000);
        camera.position.set(1.4, 1/2, 1.4);

        var renderer = new THREE.WebGLRenderer();
        renderer.setSize(windowWidth, windowHeight);

        scene.add(new THREE.AmbientLight(0x8C8C8C));

        var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        directionalLight.intensity = 1;
        directionalLight.rotation.set(0, 0, 0);
        scene.add(directionalLight);

        var controls = new THREE.OrbitControls(camera);

        var container = document.getElementById(outputParams.htmlEl).appendChild(renderer.domElement);

        return {
            scene: scene,
            renderer: renderer,
            controls: controls,
            camera: camera,
            container: container
        }
    }

    function DemHeightmap(configuration) {

        // set default values
        configuration = configuration || {};
        configuration.demType = configuration.demType || 'hgt';
        this.renderConfig = configuration.render || {};
        this.renderConfig.zoom = this.renderConfig.zoom || 12;
        this.renderConfig.size = this.renderConfig.size || 512;
        this.renderConfig.scaleFactor = this.renderConfig.scaleFactor || 1;
        this.renderConfig.detailsLevel = this.renderConfig.detailsLevel || 0;
        this.renderConfig.textureType = this.renderConfig.textureType || 'satellite';
        this.renderConfig.withAnimation = this.renderConfig.withAnimation != false;
        this.renderConfig.type = this.renderConfig.type || 'texture';
        this.renderConfig.output = this.renderConfig.output || {};
        this.renderConfig.output.width = this.renderConfig.output.width || undefined;
        this.renderConfig.output.height = this.renderConfig.output.height || undefined;
        this.renderConfig.output.htmlEl = this.renderConfig.output.htmlEl || 'map-container';

        if (this.renderConfig.type == 'texture' && !configuration.googleApiKey) throw new Error("Missing Google API key");

        this.dem = new Dem(configuration.demType, configuration.dem);
        this.gTexture = new GoogleTexture(configuration.googleApiKey);
        this.texture = new Texture();
    }

    DemHeightmap.prototype.render = function(lat, lon, params) {

        var deferred = async.defer();

        params = params || {};

        params.zoom = params.zoom > 20 ? 20 :
                      params.zoom < 11 ? 11 :
                                         (params.zoom || this.renderConfig.zoom);
        params.size = params.size || this.renderConfig.size;
        params.scaleFactor = params.scaleFactor || this.renderConfig.scaleFactor;
        params.detailsLevel = params.detailsLevel > 4 ? 4 :
                              params.detailsLevel < 0 ? 0 :
                                                        (params.detailsLevel || this.renderConfig.detailsLevel);
        params.textureType = params.textureType || this.renderConfig.textureType;
        params.withAnimation = params.hasOwnProperty('withAnimation') ? params.withAnimation != false : this.renderConfig.withAnimation;
        params.type = params.type || this.renderConfig.type;

        var latLon = {
            lat: lat,
            lon: lon
        };

        try {
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

            var outputConfig = {
                width: (params.output || {}).width || this.renderConfig.output.width,
                height: (params.output || {}).height || this.renderConfig.output.height,
                htmlEl: (params.output || {}).htmlEl || this.renderConfig.output.htmlEl
            };
            var scene = createScene(outputConfig);

            async.all(allPromises)
                .then((function (response) {

                    var texture = response[1] ? this.texture.combineTextures(response[1]) : undefined;
                    var mapInfo = renderMap(params.type, scene.scene, texture, response[0], params.scaleFactor, coordsLimits.topLat - coordsLimits.botLat);

                    scene.container.addEventListener('mousemove', onMouseMove.bind(null, new THREE.Vector2(), scene.renderer, scene.camera, mapInfo, new THREE.Raycaster()), false);

                    var completed = false;
                    var increment;
                    if (params.withAnimation) increment = 0.05;
                    else increment = 1;
                    var incrementRescale = 0.95;
                    (function render() {
                        if (!completed) {
                            completed = setElevations(increment);
                            increment = increment * incrementRescale;
                        }
                        scene.controls.update();
                        requestAnimationFrame(render);
                        scene.renderer.render(scene.scene, scene.camera);
                    })();
                }).bind(this))
                .then(function() {
                    deferred.resolve();
                })
                .catch(function(error) {
                    deferred.reject(error);
                });
        } catch (error) {
            deferred.reject(error);
        }

        return deferred.promise;
    };

    return DemHeightmap;
});