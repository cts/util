
exports.GrabPageDependencies = function(jq, pageUrl) {
  var scripts = jq.find('head > script[src="*"]');
  var styles = jq.find('head > link[rel="stylesheet"]');
  var ret = [];
  scripts.each(function(idx, script) {
    var url = script.getAttribute('src');
    url = exports.MakeCtsUrl(url, pageUrl);
    ret.push('@js ' + url + ';');
  });
  styles.each(function(idx, style) {
    var url = script.getAttribute('href');
    url = exports.MakeCtsUrl(url, pageUrl);
    ret.push('@css ' + url + ';');
  });
  return ret;
};

exports.MakeCtsUrl = function(url, pageUrl) {
  // If absolute, return it.
  if ((url.substring(0,2) == "//") ||
      (url.substring(0, 7) == 'http://') ||
      (url.substring(0, 8) == 'https://')) {
    return url;
  } else {
    // Treat it as a relative URL.
    return 'relative(' + url + ')';
  }
};