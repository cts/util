/**
 * Adapted from Medium's kew, and re-released under the BSD License.
 * Medium's kew was originally released under the Apache License, but our understanding is that
 * Apache allows re-licensing of derivative work. We opt to relicense as BSD.
 */

/**
 * An object representing a "promise" for a future value
 *
 * @param {?function(T, ?)=} onSuccess a function to handle successful
 *     resolution of this promise
 * @param {?function(!Error, ?)=} onFail a function to handle failed
 *     resolution of this promise
 * @constructor
 * @template T
 */
Promise.Impl = function(onSuccess, onFail) {
  this.promise = this;
  this._isPromise = true;
  this._successFn = onSuccess;
  this._failFn = onFail;
  this._scope = this;
  this._boundArgs = null;
  this._hasContext = false;
  this._nextContext = undefined;
  this._currentContext = undefined;
};

/**
 * Keep track of the number of promises that are rejected along side
 * the number of rejected promises we call _failFn on so we can look
 * for leaked rejections.
 */
Promise.PromiseStats = function() {
  this.errorsEmitted = 0;
  this.errorsHandled = 0;
};

Promise.stats = new Promise.PromiseStats();

Promise.Impl.prototype._handleError = function () {
  if (!this._errorHandled) {
    Promise.stats.errorsHandled++;
    this._errorHandled = true;
  }
};

/**
 * Specify that the current promise should have a specified context
 * @param  {*} context context
 * @private
 */
Promise.Impl.prototype._useContext = function (context) {
  this._nextContext = this._currentContext = context;
  this._hasContext = true;
  return this;
};

Promise.Impl.prototype.clearContext = function () {
  this._hasContext = false;
  this._nextContext = undefined;
  return this;
};

/**
 * Set the context for all promise handlers to follow
 *
 * NOTE(dpup): This should be considered deprecated.  It does not do what most
 * people would expect.  The context will be passed as a second argument to all
 * subsequent callbacks.
 *
 * @param {*} context An arbitrary context
 */
Promise.Impl.prototype.setContext = function (context) {
  this._nextContext = context;
  this._hasContext = true;
  return this;
};

/**
 * Get the context for a promise
 * @return {*} the context set by setContext
 */
Promise.Impl.prototype.getContext = function () {
  return this._nextContext;
};

/**
 * Resolve this promise with a specified value
 *
 * @param {*=} data
 */
Promise.Impl.prototype.resolve = function (data) {
  if (this._error || this._hasData) throw new Error("Unable to resolve or reject the same promise twice");

  var i;
  if (data && Promise.isPromise(data)) {
    this._child = data;
    if (this._promises) {
      for (i = 0; i < this._promises.length; i += 1) {
        data._chainPromise(this._promises[i]);
      }
      delete this._promises;
    }

    if (this._onComplete) {
      for (i = 0; i < this._onComplete.length; i+= 1) {
        data.fin(this._onComplete[i]);
      }
      delete this._onComplete;
    }
  } else if (data && Promise.isPromiseLike(data)) {
    data.then(
      function(data) { this.resolve(data) }.bind(this),
      function(err) { this.reject(err) }.bind(this)
    );
  } else {
    this._hasData = true;
    this._data = data;

    if (this._onComplete) {
      for (i = 0; i < this._onComplete.length; i++) {
        this._onComplete[i]();
      }
    }

    if (this._promises) {
      for (i = 0; i < this._promises.length; i += 1) {
        this._promises[i]._withInput(data);
      }
      delete this._promises;
    }
  }
};

/**
 * Reject this promise with an error
 *
 * @param {!Error} e
 */
Promise.Impl.prototype.reject = function (e) {
  if (this._error || this._hasData) throw new Error("Unable to resolve or reject the same promise twice");

  var i;
  this._error = e;
  Promise.stats.errorsEmitted++;

  if (this._ended) {
    this._handleError();
    if (window.setImmediate) {
      window.setImmediate(function onPromiseThrow() {
        throw e;
      });
    } else {
      window.setTimeout(function onPromiseThrow() {
        throw e;
      });
    }
  }

  if (this._onComplete) {
    for (i = 0; i < this._onComplete.length; i++) {
      this._onComplete[i]();
    }
  }

  if (this._promises) {
    this._handleError();
    for (i = 0; i < this._promises.length; i += 1) {
      this._promises[i]._withError(e);
    }
    delete this._promises;
  }
};

/**
 * Provide a callback to be called whenever this promise successfully
 * resolves. Allows for an optional second callback to handle the failure
 * case.
 *
 * @param {?function(this:void, T, ?): RESULT|undefined} onSuccess
 * @param {?function(this:void, !Error, ?): RESULT=} onFail
 * @return {!Promise.<RESULT>} returns a new promise with the output of the onSuccess or
 *     onFail handler
 * @template RESULT
 */
Promise.Impl.prototype.then = function (onSuccess, onFail) {
  var promise = new Promise.Impl(onSuccess, onFail);
  if (this._nextContext) promise._useContext(this._nextContext);

  if (this._child) this._child._chainPromise(promise);
  else this._chainPromise(promise);

  return promise;
};

/**
 * Provide a callback to be called whenever this promise successfully
 * resolves. The callback will be executed in the context of the provided scope.
 *
 * @param {function(this:SCOPE, T, ?): RESULT} onSuccess
 * @param {SCOPE} scope Object whose context callback will be executed in.
 * @param {...*} var_args Additional arguments to be passed to the promise callback.
 * @return {!Promise.<RESULT>} returns a new promise with the output of the onSuccess
 * @template SCOPE, RESULT
 */
Promise.Impl.prototype.thenBound = function (onSuccess, scope, var_args) {
  var promise = new Promise(onSuccess);
  if (this._nextContext) promise._useContext(this._nextContext);

  promise._scope = scope;
  if (arguments.length > 2) {
    promise._boundArgs = Array.prototype.slice.call(arguments, 2);
  }

  // Chaining must happen after setting args and scope since it may fire callback.
  if (this._child) this._child._chainPromise(promise);
  else this._chainPromise(promise);

  return promise;
};

/**
 * Provide a callback to be called whenever this promise is rejected
 *
 * @param {function(this:void, !Error, ?)} onFail
 * @return {!Promise.<T>} returns a new promise with the output of the onFail handler
 */
Promise.Impl.prototype.fail = function (onFail) {
  return this.then(null, onFail);
};

/**
 * Provide a callback to be called whenever this promise is rejected.
 * The callback will be executed in the context of the provided scope.
 *
 * @param {function(this:SCOPE, Error, ?)} onFail
 * @param {SCOPE} scope Object whose context callback will be executed in.
 * @param {...?} var_args
 * @return {!Promise.<T>} returns a new promise with the output of the onSuccess
 * @template SCOPE
 */
Promise.Impl.prototype.failBound = function (onFail, scope, var_args) {
  var promise = new Promise(null, onFail);
  if (this._nextContext) promise._useContext(this._nextContext);

  promise._scope = scope;
  if (arguments.length > 2) {
    promise._boundArgs = Array.prototype.slice.call(arguments, 2);
  }

  // Chaining must happen after setting args and scope since it may fire callback.
  if (this._child) this._child._chainPromise(promise);
  else this._chainPromise(promise);

  return promise;
};

/**
 * Provide a callback to be called whenever this promise is either resolved
 * or rejected.
 *
 * @param {function()} onComplete
 * @return {!Promise.<T>} returns the current promise
 */
Promise.Impl.prototype.fin = function (onComplete) {
  if (this._hasData || this._error) {
    onComplete();
    return this;
  }

  if (this._child) {
    this._child.fin(onComplete);
  } else {
    if (!this._onComplete) this._onComplete = [onComplete];
    else this._onComplete.push(onComplete);
  }

  return this;
};

/**
 * Mark this promise as "ended". If the promise is rejected, this will throw an
 * error in whatever scope it happens to be in
 *
 * @return {!Promise.<T>} returns the current promise
 * @deprecated Prefer done(), because it's consistent with Q.
 */
Promise.Impl.prototype.end = function () {
  this._end();
  return this;
};


/**
 * Mark this promise as "ended".
 * @private
 */
Promise.Impl.prototype._end = function () {
  if (this._error) {
    this._handleError();
    throw this._error;
  }
  this._ended = true;
  return this;
};

/**
 * Close the promise. Any errors after this completes will be thrown to the global handler.
 *
 * @param {?function(this:void, T, ?)=} onSuccess a function to handle successful
 *     resolution of this promise
 * @param {?function(this:void, !Error, ?)=} onFailure a function to handle failed
 *     resolution of this promise
 * @return {void}
 */
Promise.Impl.prototype.done = function (onSuccess, onFailure) {
  var self = this;
  if (onSuccess || onFailure) {
    self = self.then(onSuccess, onFailure);
  }
  self._end();
};

/**
 * Return a new promise that behaves the same as the current promise except
 * that it will be rejected if the current promise does not get fulfilled
 * after a certain amount of time.
 *
 * @param {number} timeoutMs The timeout threshold in msec
 * @param {string=} timeoutMsg error message
 * @return {!Promise.<T>} a new promise with timeout
 */
 Promise.Impl.prototype.timeout = function (timeoutMs, timeoutMsg) {
  var deferred = new Promise.Impl();
  var isTimeout = false;

  var timeout = setTimeout(function() {
    deferred.reject(new Error(timeoutMsg || 'Promise timeout after ' + timeoutMs + ' ms.'));
    isTimeout = true;
  }, timeoutMs)

  this.then(function (data) {
    if (!isTimeout) {
      clearTimeout(timeout);
      deferred.resolve(data);
    }
  },
  function (err) {
    if (!isTimeout) {
      clearTimeout(timeout);
      deferred.reject(err);
    }
  })

  return deferred.promise;
};

/**
 * Attempt to resolve this promise with the specified input
 *
 * @param {*} data the input
 */
Promise.Impl.prototype._withInput = function (data) {
  if (this._successFn) {
    try {
      this.resolve(this._call(this._successFn, [data, this._currentContext]));
    } catch (e) {
      console.log(e);
      this.reject(e);
    }
  } else this.resolve(data);

  // context is no longer needed
  delete this._currentContext;
};

/**
 * Attempt to reject this promise with the specified error
 *
 * @param {!Error} e
 * @private
 */
Promise.Impl.prototype._withError = function (e) {
  if (this._failFn) {
    try {
      this.resolve(this._call(this._failFn, [e, this._currentContext]));
    } catch (thrown) {
      console.log(e);
      this.reject(thrown);
    }
  } else this.reject(e);

  // context is no longer needed
  delete this._currentContext;
};

/**
 * Calls a function in the correct scope, and includes bound arguments.
 * @param {Function} fn
 * @param {Array} args
 * @return {*}
 * @private
 */
Promise.Impl.prototype._call = function (fn, args) {
  if (this._boundArgs) {
    args = this._boundArgs.concat(args);
  }
  return fn.apply(this._scope, args);
};

/**
 * Chain a promise to the current promise
 *
 * @param {!Promise} promise the promise to chain
 * @private
 */
Promise.Impl.prototype._chainPromise = function (promise) {
  var i;
  if (this._hasContext) promise._useContext(this._nextContext);

  if (this._child) {
    this._child._chainPromise(promise);
  } else if (this._hasData) {
    promise._withInput(this._data);
  } else if (this._error) {
    // We can't rely on _withError() because it's called on the chained promises
    // and we need to use the source's _errorHandled state
    this._handleError();
    promise._withError(this._error);
  } else if (!this._promises) {
    this._promises = [promise];
  } else {
    this._promises.push(promise);
  }
};

/**
 * Package Level Functions
 */

/**
 * Utility function used for creating a node-style resolver
 * for deferreds
 *
 * @param {!Promise} deferred a promise that looks like a deferred
 * @param {Error=} err an optional error
 * @param {*=} data optional data
 */
Promise.resolver = function(deferred, err, data) {
  if (err) deferred.reject(err);
  else deferred.resolve(data);
};

/**
 * Creates a node-style resolver for a deferred by wrapping
 * resolver()
 *
 * @return {function(?Error, *)} node-style callback
 */
Promise.Impl.prototype.makeNodeResolver = function () {
  return Promise.resolver.bind(null, this);
};

/**
 * Return true iff the given object is a promise of this library.
 *
 * Because kew's API is slightly different than other promise libraries,
 * it's important that we have a test for its promise type. If you want
 * to test for a more general A+ promise, you should do a cap test for
 * the features you want.
 *
 * @param {*} obj The object to test
 * @return {boolean} Whether the object is a promise
 */
Promise.isPromise = function(obj) {
  return !!obj._isPromise;
};

/**
 * Return true iff the given object is a promise-like object, e.g. appears to
 * implement Promises/A+ specification
 *
 * @param {*} obj The object to test
 * @return {boolean} Whether the object is a promise-like object
 */
Promise.isPromiseLike = function(obj) {
  return typeof obj === 'object' && typeof obj.then === 'function';
};

/**
 * Static function which creates and resolves a promise immediately
 *
 * @param {T} data data to resolve the promise with
 * @return {!Promise.<T>}
 * @template T
 */
Promise.resolve = function(data) {
  var promise = new Promise.Impl();
  promise.resolve(data);
  return promise;
};

/**
 * Static function which creates and rejects a promise immediately
 *
 * @param {!Error} e error to reject the promise with
 * @return {!Promise}
 */
Promise.reject = function(e) {
  var promise = new Promise.Impl();
  promise.reject(e);
  return promise;
};

/**
 * Replace an element in an array with a new value. Used by .all() to
 * call from .then()
 *
 * @param {!Array} arr
 * @param {number} idx
 * @param {*} val
 * @return {*} the val that's being injected into the array
 */
Promise.replaceEl = function(arr, idx, val) {
  arr[idx] = val;
  return val;
};

/**
 * Replace an element in an array as it is resolved with its value.
 * Used by .allSettled().
 *
 * @param {!Array} arr
 * @param {number} idx
 * @param {*} value The value from a resolved promise.
 * @return {*} the data that's being passed in
 */
Promise.replaceElFulfilled = function(arr, idx, value) {
  arr[idx] = {
    state: 'fulfilled',
    value: value
  };
  return value;
};

/**
 * Replace an element in an array as it is rejected with the reason.
 * Used by .allSettled().
 *
 * @param {!Array} arr
 * @param {number} idx
 * @param {*} reason The reason why the original promise is rejected
 * @return {*} the data that's being passed in
 */
Promise.replaceElRejected = function(arr, idx, reason) {
  arr[idx] = {
    state: 'rejected',
    reason: reason
  };
  return reason;
};

/**
 * Takes in an array of promises or literals and returns a promise which returns
 * an array of values when all have resolved. If any fail, the promise fails.
 *
 * @param {!Array.<!Promise>} promises
 * @return {!Promise.<!Array>}
 */
Promise.all = function(promises) {
  if (arguments.length != 1 || !Array.isArray(promises)) {
    promises = Array.prototype.slice.call(arguments, 0);
  }
  if (!promises.length) return Promise.resolve([]);

  var outputs = [];
  var finished = false;
  var promise = new Promise.Impl();
  var counter = promises.length;

  for (var i = 0; i < promises.length; i += 1) {
    if (!promises[i] || !Promise.isPromiseLike(promises[i])) {
      outputs[i] = promises[i];
      counter -= 1;
    } else {
      promises[i].then(Promise.replaceEl.bind(null, outputs, i))
      .then(function decrementAllCounter() {
        counter--;
        if (!finished && counter === 0) {
          finished = true;
          promise.resolve(outputs);
        }
      }, function onAllError(e) {
        if (!finished) {
          finished = true;
          promise.reject(e);
        }
      });
    }
  }

  if (counter === 0 && !finished) {
    finished = true;
    promise.resolve(outputs);
  }

  return promise;
};

/**
 * Takes in an array of promises or values and returns a promise that is
 * fulfilled with an array of state objects when all have resolved or
 * rejected. If a promise is resolved, its corresponding state object is
 * {state: 'fulfilled', value: Object}; whereas if a promise is rejected, its
 * corresponding state object is {state: 'rejected', reason: Object}.
 *
 * @param {!Array} promises or values
 * @return {!Promise.<!Array>} Promise fulfilled with state objects for each input
 */
Promise.allSettled = function(promises) {
  if (!Array.isArray(promises)) {
    throw Error('The input to "allSettled()" should be an array of Promise or values');
  }
  if (!promises.length) return Promise.resolve([]);

  var outputs = [];
  var promise = new Promise.Impl();
  var counter = promises.length;

  for (var i = 0; i < promises.length; i += 1) {
    if (!promises[i] || !Promise.isPromiseLike(promises[i])) {
      Promise.replaceElFulfilled(outputs, i, promises[i]);
      if ((--counter) === 0) promise.resolve(outputs);
    } else {
      promises[i]
        .then(Promise.replaceElFulfilled.bind(null, outputs, i), Promise.replaceElRejected.bind(null, outputs, i))
        .then(function () {
          if ((--counter) === 0) promise.resolve(outputs);
        });
    }
  }

  return promise;
};

/**
 * Create a new Promise which looks like a deferred
 *
 * @return {!Promise}
 */
Promise.defer = function() {
  return new Promise.Impl();
};

/**
 * Return a promise which will wait a specified number of ms to resolve
 *
 * @param {*} delayMsOrVal A delay (in ms) if this takes one argument, or ther
 *     return value if it takes two.
 * @param {number=} opt_delayMs
 * @return {!Promise}
 */
Promise.delay = function(delayMsOrVal, opt_delayMs) {
  var returnVal = undefined;
  var delayMs = delayMsOrVal;
  if (typeof opt_delayMs != 'undefined') {
    delayMs = opt_delayMs;
    returnVal = delayMsOrVal;
  }

  if (typeof delayMs != 'number') {
    throw new Error('Bad delay value ' + delayMs);
  }

  var defer = new Promise.Impl()
  setTimeout(function onDelay() {
    defer.resolve(returnVal);
  }, delayMs);
  return defer;
};

/**
 * Returns a promise that has the same result as `this`, but fulfilled
 * after at least ms milliseconds
 * @param {number} ms
 */
Promise.Impl.prototype.delay = function (ms) {
  return this.then(function (val) {
    return Promise.delay(val, ms);
  })
};

/**
 * Return a promise which will evaluate the function fn in a future turn with
 * the provided args
 *
 * @param {function(...)} fn
 * @param {...*} var_args a variable number of arguments
 * @return {!Promise}
 */
Promise.fcall = function(fn, var_args) {
  var rootArgs = Array.prototype.slice.call(arguments, 1);
  var defer = new Promise.Impl();
  if (window.setImmediate) {
    window.setImmediate(function onNextTick() {
      try {
        defer.resolve(fn.apply(undefined, rootArgs));
      } catch (e) {
        console.log(e);
        defer.reject(e);
      }
    });
  } else {
    window.setTimeout(function onNextTick() {
      try {
        defer.resolve(fn.apply(undefined, rootArgs));
      } catch (e) {
        console.log(e);
        defer.reject(e);
      }
    });
  }
  return defer;
};

/**
 * Returns a promise that will be invoked with the result of a node style
 * callback. All args to fn should be given except for the final callback arg
 *
 * @param {function(...)} fn
 * @param {...*} var_args a variable number of arguments
 * @return {!Promise}
 */
Promise.nfcall = function(fn, var_args) {
  // Insert an undefined argument for scope and let bindPromise() do the work.
  var args = Array.prototype.slice.call(arguments, 0);
  args.splice(1, 0, undefined);
  return Promise.bindPromise.apply(undefined, args)();
};


/**
 * Binds a function to a scope with an optional number of curried arguments. Attaches
 * a node style callback as the last argument and returns a promise
 *
 * @param {function(...)} fn
 * @param {Object} scope
 * @param {...*} var_args a variable number of arguments
 * @return {function(...)}: !Promise}
 */
Promise.bindPromise = function(fn, scope, var_args) {
  var rootArgs = Array.prototype.slice.call(arguments, 2);
  return function onBoundPromise(var_args) {
    var defer = new Promise.Impl();
    try {
      fn.apply(scope, rootArgs.concat(Array.prototype.slice.call(arguments, 0), defer.makeNodeResolver()));
    } catch (e) {
      console.log(e);
      defer.reject(e);
    }
    return defer;
  }
};

module.exports = Promise;
