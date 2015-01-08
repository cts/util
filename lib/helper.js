var _ = require('components/underscore'); // An odd one.
var $ = require('component/jquery');

module.exports = {
  truthyOrFalsy: function(val) {
    if (typeof val == 'undefined') {
      return false;
    } else if (typeof val == 'boolean') {
      return val;
    } else if (typeof val == 'object') {
      return true;
    } else if (typeof val == 'string') {
      var v = val.trim().toLowerCase();
      if ((v == '') || (v == '0') || (v == 'false') || (v == 'no')) {
        return false;
      } else {
        return true;
      }
    } else if (typeof val == 'number') {
      return (val != 0);
    } else {
      return false;
    }
  },

  rejectUnless: function(rejectIfUnder, unlessUnder) {
    return function(relation) {
      var node1 = relation.node1;
      var node2 = relation.node2;
      if ((node1.kind == 'abstract') && (node1.value == "NeN")) {
        return true;
      }
      if ((node2.kind == 'abstract') && (node2.value == "NeN")) {
        return true;
      }
      var node1Inside = false;
      var node2Inside = false;
      
      if (typeof rejectIfUnder == 'undefined') {
        // They didn't specify, so anything fits.
        node1Inside = true;
        node2Inside = true;
      } else {
        if ((rejectIfUnder == null) || node1.equals(rejectIfUnder) || node1.isDescendantOf(rejectIfUnder)) {
          node1Inside = true;
        }
        if ((rejectIfUnder == null) || node2.equals(rejectIfUnder) || node2.isDescendantOf(rejectIfUnder)) {
          node2Inside = true;
        }
      }

      if (node1Inside) {
        if ((unlessUnder != null) &&
            (node1.equals(unlessUnder) || node1.isDescendantOf(unlessUnder))) {
          return true;
        } else {
          return false;
        }
      }
      if (node2Inside) {
        if ((unlessUnder != null) &&
            (node2.equals(unlessUnder) || node2.isDescendantOf(unlessUnder))) {
          return true;
        } else {
          return false;
        }
      }
      return true;
    }
  },

  arrDelete: function(arr, from, to) {
    var rest = arr.slice((to || from) + 1 || arr.length);
    arr.length = from < 0 ? arr.length + from : from;
    return arr.push.apply(arr, rest);
  },

  deepClone: function(obj) {
    var func, isArr;
    if (!_.isObject(obj) || _.isFunction(obj)) {
      return obj;
    }
    if (_.isDate(obj)) {
      return new Date(obj.getTime());
    }
    if (_.isRegExp(obj)) {
      return new RegExp(obj.source, obj.toString().replace(/.*\//, ""));
    }
    isArr = _.isArray(obj || _.isArguments(obj));
    func = function(memo, value, key) {
      if (isArr) {
        memo.push(module.exports.deepClone(value));
      } else {
        memo[key] = module.exports.deepClone(value);
      }
      return memo;
    };
    return _.reduce(obj, func, isArr ? [] : {});
  },

  /*
   * Like Underscore's extend but recurses.
   */
  deepExtend: function(destination, source) {
    for (var property in source) {
      if (source[property] && source[property].constructor &&
       source[property].constructor === Object) {
        destination[property] = destination[property] || {};
        arguments.callee(destination[property], source[property]);
      } else {
        destination[property] = source[property];
      }
    }
    return destination;
  },

  buildOptions: function(defaults, overrides) {
    var ret = module.exports.deepExtend({}, defaults);
    module.exports.deepExtend(ret, overrides);
    return ret;
  },

  createJqueryNode: function(node) {
    // A Node contains multiple DOM Nodes
    var n = null;
    if (typeof node == 'object') {
      if (! _.isUndefined(node.jquery)) {
        n = node;
      } else if (node instanceof Array) {
        n = node[0];
      } else if (node instanceof Element) {
        n = $(node);
      } else {
        n = null;
      }
    } else if (typeof node == 'string') {
      n = $(node);
    } else {
      n = null;
    }

    return n;
  },

    /**
   * Args:
   *   $fromNode (optional) - Constrains search to this node.
   *
   * Returns:
   *   Array of Objects:
   *    {
   *      type:     link or inline
   *      content:  the CTS content, if inline
   *      url:      the URL, if a link
   *      args:     any other args
   *    }
   *
   */
  getTreesheetLinks: function($fromNode) {
    var ret = [];

    var find = function(sel) {
      return $(sel);
    };
    if (typeof $fromNode != 'undefined') {
      find = function(sel) {
        var s1 = $fromNode.find(sel);
        if ($fromNode.is(sel)) {
          s1 = s1.add($fromNode);
        }
        return s1;
      }
    }

    _.each(find('style[type="text/cts"]'), function(elem) {
      var block = {
        type: 'block',
        format: 'string',
        content: $(elem).html()
      };
      ret.push(block);
    }, this);

    _.each(find('style[type="json/cts"]'), function(elem) {
      var block = {
        type: 'block',
        format: 'json',
        content: $(elem).html()
      };
      ret.push(block);
    }, this);
    // TODO(eob): see if this causes it to get the smae element three times...
    // XXX !important

    _.each(find('link[rel="treesheet"],link[type="txt/cts"],link[type="json/cts"]'), function(elem) {
      var e = $(elem);
      var type = e.attr('type');
      var format = 'string';
      if (type == 'json/cts') {
        format = 'json';
      }
      var block = {
        type: 'link',
        url: $(elem).attr('href'),
        format: format
      };
      ret.push(block);
    }, this);

    _.each(find('link[type="cloudstitch/gsheet"]'), function(elem) {
      var e = $(elem);
      var kind = 'gsheet';
      var name = null;
      var url = e.attr('href');

      if (url) {
        var opts = {
          'read': 'public',
          'write': 'public'
        };

        if (e.attr('name')) {
          name = e.attr('name');
        } else {
          var parts = url.split('/');
          if (parts.length > 0) {
            name = parts[parts.length - 1];
          }
        }

        var appkey = e.attr('appkey');
        if (appkey) {
          opts['appkey'] = e.attr('appkey');
        }

        if (name) {
          opts['name'] = name;
        }
        var json = {
          trees: [[kind, name, url, opts]]
        };
        var block = {
          type: 'block',
          format: 'json',
          content: json
        };
        ret.push(block); 
      }
    }, this);

    _.each(find('link[type="cts/gsheet"]'), function(elem) {
      var e = $(elem);
      var kind = 'gsheet';
      var name = e.attr('name');
      var url = null;
      var opts = {
        'read': 'public',
        'write': 'public'
      };
      if (e.attr('href')) {
        url = e.attr('href');
      }
      if (e.attr('read')) {
        opts['read'] = e.attr('read');
      }
      if (e.attr('write')) {
        opts['write'] = e.attr('write');
      }
      if (e.attr('key')) {
        opts['key'] = e.attr('key');
      }
      if (name) {
        opts['name'] = name;
      }
      var json = {
        trees: [[kind, name, url, opts]]
      };
      var block = {
        type: 'block',
        format: 'json',
        content: json
      };
      ret.push(block);
    }, this);

    return ret;
  },

  addCss: function(url, callback) {
    var link = document.createElement('link')
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('type', 'text/css');
    link.setAttribute('href', url);
    if (typeof callback == 'function') {
      link.onreadystatechange = link.onload = function() {
        var state = link.readyState;
        if (!callback.done && (!state || /loaded|complete/.test(state))) {
            callback.done = true;
            callback();
        }
      };
    }
    document.getElementsByTagName('head')[0].appendChild(link);
  },

  themeUrls: function(themeRef, subthemeRef) {
    // theme urls take the form TYPE/INSTANCE/PAGE
    // TODO(eob): create more flexible ecosystem

    var parts = themeRef.split("/");
    var kind = null;
    var name = null;
    var page = null;

    if (parts.length == 2) {
      kind = parts[0];
      name = parts[1];
    }

    if (parts.length == 3) {
      kind = parts[0];
      name = parts[1];
      page = parts[2];
    }

    if ((typeof subthemeRef != 'undefined') && (subthemeRef !== null)) {
      page = subthemeRef;
    }
    var base = CTS.Constants.mockupBase;
    if (page == null) {
      page = 'index';
    }

    return [
      (base + kind + "/" + page + ".cts"),
      (base + kind + "/" + name + "/" + page + ".cts")
    ];
  },

  getUrlParameter: function(param, url) {
    if (typeof url == 'undefined') {
      url = window.location.search;
    }
    var p = param.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + p + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(url)
    if (results == null) {
      return null;
    } else {
      return decodeURIComponent(results[1].replace(/\+/g, " "));
    }
  }, 

  shouldAutoload: function() {
    // Don't autoload if there is a ?autoload=false
    if (typeof document == 'undefined') {
      return false;
    }
    if (module.exports.getUrlParameter('autoload') == 'false') {
      return false;
    }
    if ((typeof window.ctsAutoload != 'undefined') && (window.ctsAutoload === false)) {
      return false;
    }
    if (document.body != null) {
      if (typeof document.body.dataset != 'undefined') {
        if (typeof document.body.dataset.ctsautoload != 'undefined') {
          if (document.body.dataset.ctsautoload == 'false') {
            return false;
          }
        }
      }
    }
    return true;
  },

  hideDocumentBody: function() {
    var css = 'body { display: none; }';
    var head = document.getElementsByTagName('head')[0];
    var style = document.createElement('style');
    style.type = 'text/css';
    if (style.styleSheet){
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }
    head.appendChild(style);
  },

  showDocumentBody: function($e) {
    $('body').show();
  }  

};