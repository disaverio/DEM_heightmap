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

requirejs.config({
    baseUrl: ".",
    paths: {
        domReady:           'bower_components/domReady/domReady',
        threejs:            'bower_components/three.js/build/three.min',
        async:              'src/lib/async-master/src/async',
        GoogleCoords:       'src/GoogleCoords',
        utils:              'src/utils',
        params:             'src/params',
        Dem:                'src/Dem',
        GoogleTexture:      'src/GoogleTexture',
        Texture:            'src/Texture',
        App:                'src/App',
        OrbitControls:      'bower_components/three.js/examples/js/controls/OrbitControls',
        threejsExport:      'src/threejs-export'
    },
    shim: {
        OrbitControls: ['threejsExport']
    },
    deps: ['src/start']
});