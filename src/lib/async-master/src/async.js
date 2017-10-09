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
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd                   ? define([], factory) :
                                                                   global.async = factory();
})(this, function(undefined) {

    var THEN = 1;
    var CATCH = 2;
    var FINALLY = 3;
    
    var ALL = 4;
    var ANY = 5;
    var ALL_SETTLED = 6;


    function _setSuccessor(type, f, promise) {
        var innerDeferred = new Deferred(f, type);
        promise.successorDeferred.push(innerDeferred);
        innerDeferred.exec(promise.status, promise.value);

        return innerDeferred.promise;
    }

    function _setResponse(responsesArray, response, promisesArray, promise) {
        for (var i=0; i<promisesArray.length; i++) {
            if (promisesArray[i] == promise) {
                responsesArray[i] = response;
            }
        }
    }

    function _getThen(type) {
        switch (type) {
            case ALL:
                return allThen;
            case ANY:
                return anyThen;
            case ALL_SETTLED:
                return allSettled;
        }
    }

    function _getCatch(type) {
        switch (type) {
            case ALL:
                return allCatch;
            case ANY:
                return anyCatch;
            case ALL_SETTLED:
                return allSettled;
        }
    }

    function allThen(promise, result) {
        _setResponse(this.responses, result, this.promisesArray, promise);

        for (var i=0; i<this.promisesArray.length; i++) {
            if (this.promisesArray[i].status != 1) {
                return;
            }
        }
        this.resolve(this.responses);
    }

    function allCatch(promise, error) {
        for (var i=0; i<this.promisesArray.length; i++) {
            if (this.promisesArray[i] != promise && this.promisesArray[i].status == 2) {
                return;
            }
        }
        this.reject(error);
    }

    function anyThen(promise, result) {
        for (var i=0; i<this.promisesArray.length; i++) {
            if (this.promisesArray[i] != promise && this.promisesArray[i].status == 1) {
                return;
            }
        }
        this.resolve(result);
    }

    function anyCatch(promise, error) {
        _setResponse(this.responses, error, this.promisesArray, promise);

        for (var i=0; i<this.promisesArray.length; i++) {
            if (this.promisesArray[i] != promise && this.promisesArray[i].status != 2) {
                return;
            }
        }
        this.reject(this.responses);
    }

    function allSettled(promise, response) {
        _setResponse(this.responses, response, this.promisesArray, promise);

        for (var i=0; i<this.promisesArray.length; i++) {
            if (this.promisesArray[i].status != 1 && this.promisesArray[i].status != 2) {
                return;
            }
        }
        this.resolve(this.responses);
    }


    function Promise() {
        this.status = undefined; // 0: running - 1: resolved - 2: rejected
        this.value = undefined;
        this.successorDeferred = [];
    }

    Promise.prototype.then = function (f) {
        return _setSuccessor(THEN, f, this);
    };

    Promise.prototype.catch = function (f) {
        return _setSuccessor(CATCH, f, this);
    };

    Promise.prototype.finally = function (f) {
        _setSuccessor(FINALLY, f, this);
    };


    function Deferred(f, type) {
        this.promise = new Promise();

        if (f) {
            this.f = function (value) {
                try {
                    var res = f(value);
                    if (res && res instanceof Promise) {
                        res.then((function (response) {
                            this.resolve(response);
                        }).bind(this)).catch((function (error) {
                            this.reject(error);
                        }).bind(this));
                    } else {
                        this.resolve(res);
                    }
                } catch (error) {
                    this.reject(error);
                }
            };
        }

        if (type) {
            this.type = type;
        }
    }

    Deferred.prototype.resolve = function (result) {
        this.promise.status = 1;
        this.promise.value = result;

        for (var i=0; i<this.promise.successorDeferred.length; i++) {
            this.promise.successorDeferred[i].exec(this.promise.status, result);
        }
    };

    Deferred.prototype.reject = function (error) {
        this.promise.status = 2;
        this.promise.value = error;
        
        for (var i=0; i<this.promise.successorDeferred.length; i++) {
            this.promise.successorDeferred[i].exec(this.promise.status, error);
        }
    };

    Deferred.prototype.exec = function (previousStatus, response) {
        if ((previousStatus == 1 && this.type == THEN) || (previousStatus == 2 && this.type == CATCH) || ((previousStatus == 1 || previousStatus == 2) && this.type == FINALLY)) {
            this.promise.status = 0;
            this.f(response);
        } else if (previousStatus == 1 || previousStatus == 2) {
            for (var i=0; i<this.promise.successorDeferred.length; i++) {
                this.promise.successorDeferred[i].exec(previousStatus, response);
            }
        }
    };


    function Aggregate(promisesArray, type) {
        Deferred.call(this);

        this.promisesArray = promisesArray;
        this.responses = [];

        promisesArray.forEach((function(promise) {
            promise
                .then((_getThen(type)).bind(this, promise))
                .catch((_getCatch(type)).bind(this, promise));
        }).bind(this));
    }

    Aggregate.prototype = Object.create(Deferred.prototype);

    Aggregate.prototype.constructor = Aggregate;


    return {
        defer:      function()              { return new Deferred(); },
        all:        function(promisesArray) { return new Aggregate(promisesArray, ALL).promise; },
        any:        function(promisesArray) { return new Aggregate(promisesArray, ANY).promise; },
        allSettled: function(promisesArray) { return new Aggregate(promisesArray, ALL_SETTLED).promise; }
    };
});