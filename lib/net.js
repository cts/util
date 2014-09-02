var Log = require('./log');
var Promise = require('./promise');
var _ = require('components/underscore'); // An odd one.
var $ = require('component/jquery');

module.exports = {
  loadJavascript: function(url, onload) {
    var s = document.createElement('script');
    var proto = '';
    if ((typeof window != 'undefined') &&
        (typeof window.location != 'undefined') &&
        (window.location.protocol == 'file:')) {
      proto = 'http:';
    }
    s.setAttribute('src', proto + url);
    s.setAttribute('type', 'text/javascript');
    if (typeof onload == 'function') {
      s.onload = onload;
    }
    document.getElementsByTagName('head')[0].appendChild(s);
  },

  getUrlBase: function(url) {
    var temp = document.createElement('a');
    temp.href = url;

    var base = temp.protocol + "//" + temp.hostname;
    if (temp.port) {
      base += ":" + temp.port;
    }
    return base;
  },

  getUrlBaseAndPath: function(url) {
    var temp = document.createElement('a');
    temp.href = url;

    var base = temp.protocol + "//" + temp.hostname;
    if (temp.port) {
      base += ":" + temp.port;
    }
    var parts = temp.pathname.split("/");
    if (parts.length > 0) {
      parts.pop(); // The filename
    }
    var newPath = parts.join("/");
    if (newPath.length == 0) {
      newPath = "/";
    }
    base += newPath;
    return base;
  },

  rewriteRelativeLinks: function(jqNode, sourceUrl) {
    var base = exports.getUrlBase(sourceUrl);
    var basePath = exports.getUrlBaseAndPath(sourceUrl);
    var pat = /^https?:\/\//i;
    var fixElemAttr = function(elem, attr) {
      var a = elem.attr(attr);
      if ((typeof a != 'undefined') &&
          (a !== null) &&
          (a.length > 0)) {
        if (! pat.test(a)) {
          if (a[0] == "/") {
            a = base + a;
          } else {
            a = basePath + "/" + a;
          }
          elem.attr(attr, a);
        }
      }
    };
    var fixElem = function(elem) {
      if (elem.is('img')) {
        fixElemAttr(elem, 'src');
      } else if (elem.is('a')) {
        fixElemAttr(elem, 'href');
      } else {
        // Do nothing
      }
      _.each(elem.children(), function(c) {
        fixElem($(c));
      }, this);
    }
    fixElem(jqNode);
  },

  fixRelativeUrl: function(url, loadedFrom) {
    if ((url === null) || (typeof url == "undefined")) {
      return null;
    }
    if (typeof loadedFrom == 'undefined') {
      return url;
    } else {
      if ((url.indexOf("relative(") == 0) && (url[url.length - 1] == ")")) {
        var fragment = url.substring(9, url.length - 1);
        var prefix = loadedFrom.split("/");
        prefix.pop();
        if (prefix.length > 0) {
          prefix = prefix.join("/");
          url = prefix + "/" + fragment; 
        } else {
          url = fragment;
        }
        return url;
      } else {
        return url;
      }
    }
  },

  fetchString: function(params) {
    var deferred = Promise.defer();
    var xhr = $.ajax({
      url: params.url,
      dataType: 'text',
      beforeSend: function(xhr, settings) {
        _.each(params, function(value, key, list) {
          xhr[key] = value;
        }, this);
      }
    });
    xhr.done(function(data, textStatus, jqXhr) {
      deferred.resolve(data, textStatus, jqXhr);
    });
    xhr.fail(function(jqXhr, textStatus, errorThrown) {
      Log.Error("Couldn't fetch string at:", params.url);
      deferred.reject(jqXhr, textStatus, errorThrown);
    });
    return deferred.promise;
  },

  fetchTree: function(spec, callback, context) {
    if ((spec.url == null) && (spec.name == 'body')) {
      callback.call(context, null, $('body'));
    } else {
      Log.Fatal("FETCH TREE NOT IMPLEMENTED");
      callback.call(context, "Not Implemented");
    }
  }
};

