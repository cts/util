/* CTS Fn Library
 *
 * This library is a slightly modified version of Underscore.js, which has the following license:
 *
 * Copyright (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions: 
 * 
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software. 
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 *
 */

var Fn = {
  breaker: {},

  each: function(obj, iterator, context) {
    if (obj == null) return;
    if (Array.prototype.forEach && obj.forEach === Array.prototype.forEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === CTS.Fn.breaker) return;
      }
    } else {
      for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === CTS.Fn.breaker) return;
        }
      }
    }
  },

  extend: function(obj) {
    CTS.Fn.each(Array.prototype.slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  }
};

Fn.extend(Fn, {

  arrDelete: function(arr, from, to) {
    var rest = arr.slice((to || from) + 1 || arr.length);
    arr.length = from < 0 ? arr.length + from : from;
    return arr.push.apply(arr, rest);
  },

  any: function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (Array.prototype.some && obj.some === Array.prototype.some) return obj.some(iterator, context);
    Fn.each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return Fn.breaker;
    });
    return !!result;
  },

  every: function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (Array.prototype.every && obj.every === Array.prototype.every) return obj.every(iterator, context);
    Fn.each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return Fn.breaker;
    });
    return !!result;
  },
  map: function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (Array.prototype.map && obj.map === Array.prototype.map) return obj.map(iterator, context);
    Fn.each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  },


  buildOptions: function(defaults, overrides) {
    var ret = Fn.deepExtend({}, defaults);
    Fn.deepExtend(ret, overrides);
    return ret;
  },

  isObject: function(obj) {
    return obj === Object(obj);
  },

  isUndefined: function(obj) {
    return obj === void 0;
  },

  isNull: function(obj) {
    return obj === null;
  },

  has: function(obj, key) {
    return hasOwnProperty.call(obj, key);
  },

  contains: function(obj, target) {
    if (obj == null) return false;
    if (Array.prototype.indexOf && obj.indexOf === Array.prototype.indexOf) return obj.indexOf(target) != -1;
    return Fn.any(obj, function(value) {
      return value === target;
    });
  },

  once: function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  },

  uniqueId: function(prefix) {
    var id = ++Fn.idCounter + '';
    return prefix ? prefix + id : id;
  },

  union: function() {
    return Fn.uniq(Array.prototype.concat.apply(Array.prototype, arguments));
  },

  unique: function(array, isSorted, iterator, context) {
    if (Fn.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? Fn.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    Fn.each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !Fn.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  },

  without: function(array) {
    return Fn.difference(array, Array.prototype.slice.call(arguments, 1));
  },

  difference: function(array) {
    var rest = Array.prototype.concat.apply(Array.prorotype, Array.prototype.slice.call(arguments, 1));
    return Fn.filter(array, function(value){ return !Fn.contains(rest, value); });
  },

  filter: function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (Array.prototype.filter && obj.filter === Array.prototype.filter) return obj.filter(iterator, context);
    Fn.each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  },

  flattenWithOutput: function(input, shallow, output) {
    Fn.each(input, function(value) {
      if (Fn.isArray(value)) {
        shallow ? push.apply(output, value) : flattenWithOutput(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  },

  flatten: function(array, shallow) {
    return flattenWithOutput(array, shallow, []);
  },

  zip: function() {
    var args = Array.prototype.slice.call(arguments);
    var length = Fn.max(Fn.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = Fn.pluck(args, "" + i);
    }
    return results;
  },

  max:function(obj, iterator, context) {
    if (!iterator && Fn.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    Fn.each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  },

  pluck: function(obj, key) {
    return Fn.map(obj, function(value){ return value[key]; });
  },



});

Fn.isArray = Array.isArray || function(obj) {
  return toString.call(obj) == '[object Array]';
};

Fn.keys = Object.keys || function(obj) {
  if (obj !== Object(obj)) throw new TypeError('Invalid object');
  var keys = [];
  for (var key in obj) if (Fn.has(obj, key)) keys[keys.length] = key;
  return keys;
};

Fn.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
  Fn['is' + name] = function(obj) {
    return toString.call(obj) == '[object ' + name + ']';
  };
});

if (typeof (/./) !== 'function') {
  Fn.isFunction = function(obj) {
    return typeof obj === 'function';
  };
};

Fn.idCounter = 0;

module.exports = Fn;
