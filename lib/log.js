/* 
 * To avoid processing costly things only not to log them, you can
 * say:
 * 
 *     if (CTS.LogLevel.Warn()) {
 *       var b = computeExpensiveThing;
 *       CTS.Log.Warn("b's value is", b);
 *     }
 *
 * This way we can keep some debugging code permanently in the codebasea
 * with minimal production overhead.
 *
 */

exports.LogLevel = {
  
  Level: 3,

  // 0: Fatal
  Fatal: function() {
    return exports.LogLevel.Level >= 0;
  },
   
  // 1: Error
  Error: function() {
    return exports.LogLevel.Level >= 1;
  },

  // 2: Warn
  Warn: function() {
    return exports.LogLevel.Level >= 2;
  },

  // 3: Info
  Info: function() {
    return exports.LogLevel.Level >= 3;
  },

  // 4: Debug 
  Debug: function() {
    return exports.LogLevel.Level >= 4;
  }
};

exports.Log = {
  _timers: {},

  Fatal: function(msg) {
    alert(msg);
    exports.Log._LogWithLevel("FATAL", exports.LogLevel.Fatal, 'error', arguments);
  },

  Error: function(message) {
    exports.Log._LogWithLevel("ERROR", exports.LogLevel.Error, 'error', arguments);
  },

  Warn: function(message) {
    exports.Log._LogWithLevel("WARN", exports.LogLevel.Warn, 'warn', arguments);
  },

  Debug: function(message) {
    exports.Log._LogWithLevel("DEBUG", exports.LogLevel.Debug, 'debug', arguments);
  },

  Info: function(message) {
    exports.Log._LogWithLevel("INFO", exports.LogLevel.Info, 'info', arguments);
  },

  Tick: function(timerName) {
    if (typeof exports.Log._timers[timerName] == 'object') {
      exports.Log.Error("Double tick on timer", timerName);
    }
    exports.Log._timers[timerName] = {
      start: Date.now(),
      name: timerName
    };
  },

  Tock: function(timerName) {
    var end = Date.now();
    if (typeof exports.Log._timers[timerName] == 'object') {
      exports.Log._timers[timerName]['finish'] = end;
      // TODO: Could log to remove server here.
      exports.Log.ReportTimer(exports.Log._timers[timerName]);
      exports.Log._timers[timerName] = null;
    } else {
      exports.Log.Error("Tock with no tick", timerName);
    }
  },

  ReportTimer: function(timer) {
    exports.Log.Info((timer.finish - timer.start), 'ms:', timer.name);
  },

  // To be considered private.
  _LogWithLevel: function(levelName, levelFn, consoleFn, args) {
    if (console && levelFn()) {
      var args = Array.prototype.slice.call(args);
      if (! console[consoleFn]) {
        consoleFn = 'log';
        args.unshift(levelName + ": ");
      }
      console[consoleFn].apply(console, args);
    }
  }
};
