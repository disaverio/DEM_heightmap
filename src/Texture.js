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
    if (typeof define === 'function' && define.amd) define(['threejs'], factory);
    else {
        global.DH = global.DH || {};
        global.DH.Texture = factory(global.THREE);
    }
})(this, function (THREE) {

    function Texture() {}

    Texture.prototype.combineTextures = function (imagesArray) {

        var maxCanvasSize = 8 * 1024;

        var imagesForEdge = Math.sqrt(imagesArray.length);
        var textureSize = imagesArray[0].height;
        var canvasSize = textureSize * imagesForEdge;

        var scaleFactor = 1;
        if (canvasSize > maxCanvasSize) {
            scaleFactor = maxCanvasSize / canvasSize;
            canvasSize = maxCanvasSize;
        }

        var canvas = document.createElement('canvas');
        canvas.width  = canvasSize;
        canvas.height = canvasSize;

        var context = canvas.getContext('2d');
        var texture = new THREE.Texture(canvas) ;

        for (var i = 0; i < imagesForEdge; i++) {
            for (var j = 0; j < imagesForEdge; j++) {
                var image = imagesArray[i * imagesForEdge + j];
                context.drawImage(image, j * textureSize * scaleFactor, i * textureSize * scaleFactor, textureSize * scaleFactor, textureSize * scaleFactor);
            }
        }

        texture.needsUpdate = true;

        return texture;
    };

    return Texture;
});