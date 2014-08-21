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
  }
};