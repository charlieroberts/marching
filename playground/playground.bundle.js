(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  CodeMirror.defineOption("fullScreen", false, function(cm, val, old) {
    if (old == CodeMirror.Init) old = false;
    if (!old == !val) return;
    if (val) setFullscreen(cm);
    else setNormal(cm);
  });

  function setFullscreen(cm) {
    var wrap = cm.getWrapperElement();
    cm.state.fullScreenRestore = {scrollTop: window.pageYOffset, scrollLeft: window.pageXOffset,
                                  width: wrap.style.width, height: wrap.style.height};
    wrap.style.width = "";
    wrap.style.height = "auto";
    wrap.className += " CodeMirror-fullscreen";
    document.documentElement.style.overflow = "hidden";
    cm.refresh();
  }

  function setNormal(cm) {
    var wrap = cm.getWrapperElement();
    wrap.className = wrap.className.replace(/\s*CodeMirror-fullscreen\b/, "");
    document.documentElement.style.overflow = "";
    var info = cm.state.fullScreenRestore;
    wrap.style.width = info.width; wrap.style.height = info.height;
    window.scrollTo(info.scrollLeft, info.scrollTop);
    cm.refresh();
  }
});

},{"../../lib/codemirror":8}],2:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  CodeMirror.defineExtension("addPanel", function(node, options) {
    options = options || {};

    if (!this.state.panels) initPanels(this);

    var info = this.state.panels;
    var wrapper = info.wrapper;
    var cmWrapper = this.getWrapperElement();

    if (options.after instanceof Panel && !options.after.cleared) {
      wrapper.insertBefore(node, options.before.node.nextSibling);
    } else if (options.before instanceof Panel && !options.before.cleared) {
      wrapper.insertBefore(node, options.before.node);
    } else if (options.replace instanceof Panel && !options.replace.cleared) {
      wrapper.insertBefore(node, options.replace.node);
      options.replace.clear();
    } else if (options.position == "bottom") {
      wrapper.appendChild(node);
    } else if (options.position == "before-bottom") {
      wrapper.insertBefore(node, cmWrapper.nextSibling);
    } else if (options.position == "after-top") {
      wrapper.insertBefore(node, cmWrapper);
    } else {
      wrapper.insertBefore(node, wrapper.firstChild);
    }

    var height = (options && options.height) || node.offsetHeight;
    this._setSize(null, info.heightLeft -= height);
    info.panels++;
    return new Panel(this, node, options, height);
  });

  function Panel(cm, node, options, height) {
    this.cm = cm;
    this.node = node;
    this.options = options;
    this.height = height;
    this.cleared = false;
  }

  Panel.prototype.clear = function() {
    if (this.cleared) return;
    this.cleared = true;
    var info = this.cm.state.panels;
    this.cm._setSize(null, info.heightLeft += this.height);
    info.wrapper.removeChild(this.node);
    if (--info.panels == 0) removePanels(this.cm);
  };

  Panel.prototype.changed = function(height) {
    var newHeight = height == null ? this.node.offsetHeight : height;
    var info = this.cm.state.panels;
    this.cm._setSize(null, info.height += (newHeight - this.height));
    this.height = newHeight;
  };

  function initPanels(cm) {
    var wrap = cm.getWrapperElement();
    var style = window.getComputedStyle ? window.getComputedStyle(wrap) : wrap.currentStyle;
    var height = parseInt(style.height);
    var info = cm.state.panels = {
      setHeight: wrap.style.height,
      heightLeft: height,
      panels: 0,
      wrapper: document.createElement("div")
    };
    wrap.parentNode.insertBefore(info.wrapper, wrap);
    var hasFocus = cm.hasFocus();
    info.wrapper.appendChild(wrap);
    if (hasFocus) cm.focus();

    cm._setSize = cm.setSize;
    if (height != null) cm.setSize = function(width, newHeight) {
      if (newHeight == null) return this._setSize(width, newHeight);
      info.setHeight = newHeight;
      if (typeof newHeight != "number") {
        var px = /^(\d+\.?\d*)px$/.exec(newHeight);
        if (px) {
          newHeight = Number(px[1]);
        } else {
          info.wrapper.style.height = newHeight;
          newHeight = info.wrapper.offsetHeight;
          info.wrapper.style.height = "";
        }
      }
      cm._setSize(width, info.heightLeft += (newHeight - height));
      height = newHeight;
    };
  }

  function removePanels(cm) {
    var info = cm.state.panels;
    cm.state.panels = null;

    var wrap = cm.getWrapperElement();
    info.wrapper.parentNode.replaceChild(wrap, info.wrapper);
    wrap.style.height = info.setHeight;
    cm.setSize = cm._setSize;
    cm.setSize();
  }
});

},{"../../lib/codemirror":8}],3:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  var defaults = {
    pairs: "()[]{}''\"\"",
    triples: "",
    explode: "[]{}"
  };

  var Pos = CodeMirror.Pos;

  CodeMirror.defineOption("autoCloseBrackets", false, function(cm, val, old) {
    if (old && old != CodeMirror.Init) {
      cm.removeKeyMap(keyMap);
      cm.state.closeBrackets = null;
    }
    if (val) {
      cm.state.closeBrackets = val;
      cm.addKeyMap(keyMap);
    }
  });

  function getOption(conf, name) {
    if (name == "pairs" && typeof conf == "string") return conf;
    if (typeof conf == "object" && conf[name] != null) return conf[name];
    return defaults[name];
  }

  var bind = defaults.pairs + "`";
  var keyMap = {Backspace: handleBackspace, Enter: handleEnter};
  for (var i = 0; i < bind.length; i++)
    keyMap["'" + bind.charAt(i) + "'"] = handler(bind.charAt(i));

  function handler(ch) {
    return function(cm) { return handleChar(cm, ch); };
  }

  function getConfig(cm) {
    var deflt = cm.state.closeBrackets;
    if (!deflt) return null;
    var mode = cm.getModeAt(cm.getCursor());
    return mode.closeBrackets || deflt;
  }

  function handleBackspace(cm) {
    var conf = getConfig(cm);
    if (!conf || cm.getOption("disableInput")) return CodeMirror.Pass;

    var pairs = getOption(conf, "pairs");
    var ranges = cm.listSelections();
    for (var i = 0; i < ranges.length; i++) {
      if (!ranges[i].empty()) return CodeMirror.Pass;
      var around = charsAround(cm, ranges[i].head);
      if (!around || pairs.indexOf(around) % 2 != 0) return CodeMirror.Pass;
    }
    for (var i = ranges.length - 1; i >= 0; i--) {
      var cur = ranges[i].head;
      cm.replaceRange("", Pos(cur.line, cur.ch - 1), Pos(cur.line, cur.ch + 1));
    }
  }

  function handleEnter(cm) {
    var conf = getConfig(cm);
    var explode = conf && getOption(conf, "explode");
    if (!explode || cm.getOption("disableInput")) return CodeMirror.Pass;

    var ranges = cm.listSelections();
    for (var i = 0; i < ranges.length; i++) {
      if (!ranges[i].empty()) return CodeMirror.Pass;
      var around = charsAround(cm, ranges[i].head);
      if (!around || explode.indexOf(around) % 2 != 0) return CodeMirror.Pass;
    }
    cm.operation(function() {
      cm.replaceSelection("\n\n", null);
      cm.execCommand("goCharLeft");
      ranges = cm.listSelections();
      for (var i = 0; i < ranges.length; i++) {
        var line = ranges[i].head.line;
        cm.indentLine(line, null, true);
        cm.indentLine(line + 1, null, true);
      }
    });
  }

  function handleChar(cm, ch) {
    var conf = getConfig(cm);
    if (!conf || cm.getOption("disableInput")) return CodeMirror.Pass;

    var pairs = getOption(conf, "pairs");
    var pos = pairs.indexOf(ch);
    if (pos == -1) return CodeMirror.Pass;
    var triples = getOption(conf, "triples");

    var identical = pairs.charAt(pos + 1) == ch;
    var ranges = cm.listSelections();
    var opening = pos % 2 == 0;

    var type, next;
    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i], cur = range.head, curType;
      var next = cm.getRange(cur, Pos(cur.line, cur.ch + 1));
      if (opening && !range.empty()) {
        curType = "surround";
      } else if ((identical || !opening) && next == ch) {
        if (triples.indexOf(ch) >= 0 && cm.getRange(cur, Pos(cur.line, cur.ch + 3)) == ch + ch + ch)
          curType = "skipThree";
        else
          curType = "skip";
      } else if (identical && cur.ch > 1 && triples.indexOf(ch) >= 0 &&
                 cm.getRange(Pos(cur.line, cur.ch - 2), cur) == ch + ch &&
                 (cur.ch <= 2 || cm.getRange(Pos(cur.line, cur.ch - 3), Pos(cur.line, cur.ch - 2)) != ch)) {
        curType = "addFour";
      } else if (identical) {
        if (!CodeMirror.isWordChar(next) && enteringString(cm, cur, ch)) curType = "both";
        else return CodeMirror.Pass;
      } else if (opening && (cm.getLine(cur.line).length == cur.ch ||
                             isClosingBracket(next, pairs) ||
                             /\s/.test(next))) {
        curType = "both";
      } else {
        return CodeMirror.Pass;
      }
      if (!type) type = curType;
      else if (type != curType) return CodeMirror.Pass;
    }

    var left = pos % 2 ? pairs.charAt(pos - 1) : ch;
    var right = pos % 2 ? ch : pairs.charAt(pos + 1);
    cm.operation(function() {
      if (type == "skip") {
        cm.execCommand("goCharRight");
      } else if (type == "skipThree") {
        for (var i = 0; i < 3; i++)
          cm.execCommand("goCharRight");
      } else if (type == "surround") {
        var sels = cm.getSelections();
        for (var i = 0; i < sels.length; i++)
          sels[i] = left + sels[i] + right;
        cm.replaceSelections(sels, "around");
      } else if (type == "both") {
        cm.replaceSelection(left + right, null);
        cm.triggerElectric(left + right);
        cm.execCommand("goCharLeft");
      } else if (type == "addFour") {
        cm.replaceSelection(left + left + left + left, "before");
        cm.execCommand("goCharRight");
      }
    });
  }

  function isClosingBracket(ch, pairs) {
    var pos = pairs.lastIndexOf(ch);
    return pos > -1 && pos % 2 == 1;
  }

  function charsAround(cm, pos) {
    var str = cm.getRange(Pos(pos.line, pos.ch - 1),
                          Pos(pos.line, pos.ch + 1));
    return str.length == 2 ? str : null;
  }

  // Project the token type that will exists after the given char is
  // typed, and use it to determine whether it would cause the start
  // of a string token.
  function enteringString(cm, pos, ch) {
    var line = cm.getLine(pos.line);
    var token = cm.getTokenAt(pos);
    if (/\bstring2?\b/.test(token.type)) return false;
    var stream = new CodeMirror.StringStream(line.slice(0, pos.ch) + ch + line.slice(pos.ch), 4);
    stream.pos = stream.start = token.start;
    for (;;) {
      var type1 = cm.getMode().token(stream, token.state);
      if (stream.pos >= pos.ch + 1) return /\bstring2?\b/.test(type1);
      stream.start = stream.pos;
    }
  }
});

},{"../../lib/codemirror":8}],4:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  var ie_lt8 = /MSIE \d/.test(navigator.userAgent) &&
    (document.documentMode == null || document.documentMode < 8);

  var Pos = CodeMirror.Pos;

  var matching = {"(": ")>", ")": "(<", "[": "]>", "]": "[<", "{": "}>", "}": "{<"};

  function findMatchingBracket(cm, where, strict, config) {
    var line = cm.getLineHandle(where.line), pos = where.ch - 1;
    var match = (pos >= 0 && matching[line.text.charAt(pos)]) || matching[line.text.charAt(++pos)];
    if (!match) return null;
    var dir = match.charAt(1) == ">" ? 1 : -1;
    if (strict && (dir > 0) != (pos == where.ch)) return null;
    var style = cm.getTokenTypeAt(Pos(where.line, pos + 1));

    var found = scanForBracket(cm, Pos(where.line, pos + (dir > 0 ? 1 : 0)), dir, style || null, config);
    if (found == null) return null;
    return {from: Pos(where.line, pos), to: found && found.pos,
            match: found && found.ch == match.charAt(0), forward: dir > 0};
  }

  // bracketRegex is used to specify which type of bracket to scan
  // should be a regexp, e.g. /[[\]]/
  //
  // Note: If "where" is on an open bracket, then this bracket is ignored.
  //
  // Returns false when no bracket was found, null when it reached
  // maxScanLines and gave up
  function scanForBracket(cm, where, dir, style, config) {
    var maxScanLen = (config && config.maxScanLineLength) || 10000;
    var maxScanLines = (config && config.maxScanLines) || 1000;

    var stack = [];
    var re = config && config.bracketRegex ? config.bracketRegex : /[(){}[\]]/;
    var lineEnd = dir > 0 ? Math.min(where.line + maxScanLines, cm.lastLine() + 1)
                          : Math.max(cm.firstLine() - 1, where.line - maxScanLines);
    for (var lineNo = where.line; lineNo != lineEnd; lineNo += dir) {
      var line = cm.getLine(lineNo);
      if (!line) continue;
      var pos = dir > 0 ? 0 : line.length - 1, end = dir > 0 ? line.length : -1;
      if (line.length > maxScanLen) continue;
      if (lineNo == where.line) pos = where.ch - (dir < 0 ? 1 : 0);
      for (; pos != end; pos += dir) {
        var ch = line.charAt(pos);
        if (re.test(ch) && (style === undefined || cm.getTokenTypeAt(Pos(lineNo, pos + 1)) == style)) {
          var match = matching[ch];
          if ((match.charAt(1) == ">") == (dir > 0)) stack.push(ch);
          else if (!stack.length) return {pos: Pos(lineNo, pos), ch: ch};
          else stack.pop();
        }
      }
    }
    return lineNo - dir == (dir > 0 ? cm.lastLine() : cm.firstLine()) ? false : null;
  }

  function matchBrackets(cm, autoclear, config) {
    // Disable brace matching in long lines, since it'll cause hugely slow updates
    var maxHighlightLen = cm.state.matchBrackets.maxHighlightLineLength || 1000;
    var marks = [], ranges = cm.listSelections();
    for (var i = 0; i < ranges.length; i++) {
      var match = ranges[i].empty() && findMatchingBracket(cm, ranges[i].head, false, config);
      if (match && cm.getLine(match.from.line).length <= maxHighlightLen) {
        var style = match.match ? "CodeMirror-matchingbracket" : "CodeMirror-nonmatchingbracket";
        marks.push(cm.markText(match.from, Pos(match.from.line, match.from.ch + 1), {className: style}));
        if (match.to && cm.getLine(match.to.line).length <= maxHighlightLen)
          marks.push(cm.markText(match.to, Pos(match.to.line, match.to.ch + 1), {className: style}));
      }
    }

    if (marks.length) {
      // Kludge to work around the IE bug from issue #1193, where text
      // input stops going to the textare whever this fires.
      if (ie_lt8 && cm.state.focused) cm.focus();

      var clear = function() {
        cm.operation(function() {
          for (var i = 0; i < marks.length; i++) marks[i].clear();
        });
      };
      if (autoclear) setTimeout(clear, 800);
      else return clear;
    }
  }

  var currentlyHighlighted = null;
  function doMatchBrackets(cm) {
    cm.operation(function() {
      if (currentlyHighlighted) {currentlyHighlighted(); currentlyHighlighted = null;}
      currentlyHighlighted = matchBrackets(cm, false, cm.state.matchBrackets);
    });
  }

  CodeMirror.defineOption("matchBrackets", false, function(cm, val, old) {
    if (old && old != CodeMirror.Init)
      cm.off("cursorActivity", doMatchBrackets);
    if (val) {
      cm.state.matchBrackets = typeof val == "object" ? val : {};
      cm.on("cursorActivity", doMatchBrackets);
    }
  });

  CodeMirror.defineExtension("matchBrackets", function() {matchBrackets(this, true);});
  CodeMirror.defineExtension("findMatchingBracket", function(pos, strict, config){
    return findMatchingBracket(this, pos, strict, config);
  });
  CodeMirror.defineExtension("scanForBracket", function(pos, dir, style, config){
    return scanForBracket(this, pos, dir, style, config);
  });
});

},{"../../lib/codemirror":8}],5:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  var Pos = CodeMirror.Pos;

  function forEach(arr, f) {
    for (var i = 0, e = arr.length; i < e; ++i) f(arr[i]);
  }

  function arrayContains(arr, item) {
    if (!Array.prototype.indexOf) {
      var i = arr.length;
      while (i--) {
        if (arr[i] === item) {
          return true;
        }
      }
      return false;
    }
    return arr.indexOf(item) != -1;
  }

  function scriptHint(editor, keywords, getToken, options) {
    // Find the token at the cursor
    var cur = editor.getCursor(), token = getToken(editor, cur);
    if (/\b(?:string|comment)\b/.test(token.type)) return;
    token.state = CodeMirror.innerMode(editor.getMode(), token.state).state;

    // If it's not a 'word-style' token, ignore the token.
    if (!/^[\w$_]*$/.test(token.string)) {
      token = {start: cur.ch, end: cur.ch, string: "", state: token.state,
               type: token.string == "." ? "property" : null};
    } else if (token.end > cur.ch) {
      token.end = cur.ch;
      token.string = token.string.slice(0, cur.ch - token.start);
    }

    var tprop = token;
    // If it is a property, find out what it is a property of.
    while (tprop.type == "property") {
      tprop = getToken(editor, Pos(cur.line, tprop.start));
      if (tprop.string != ".") return;
      tprop = getToken(editor, Pos(cur.line, tprop.start));
      if (!context) var context = [];
      context.push(tprop);
    }
    return {list: getCompletions(token, context, keywords, options),
            from: Pos(cur.line, token.start),
            to: Pos(cur.line, token.end)};
  }

  function javascriptHint(editor, options) {
    return scriptHint(editor, javascriptKeywords,
                      function (e, cur) {return e.getTokenAt(cur);},
                      options);
  };
  CodeMirror.registerHelper("hint", "javascript", javascriptHint);

  function getCoffeeScriptToken(editor, cur) {
  // This getToken, it is for coffeescript, imitates the behavior of
  // getTokenAt method in javascript.js, that is, returning "property"
  // type and treat "." as indepenent token.
    var token = editor.getTokenAt(cur);
    if (cur.ch == token.start + 1 && token.string.charAt(0) == '.') {
      token.end = token.start;
      token.string = '.';
      token.type = "property";
    }
    else if (/^\.[\w$_]*$/.test(token.string)) {
      token.type = "property";
      token.start++;
      token.string = token.string.replace(/\./, '');
    }
    return token;
  }

  function coffeescriptHint(editor, options) {
    return scriptHint(editor, coffeescriptKeywords, getCoffeeScriptToken, options);
  }
  CodeMirror.registerHelper("hint", "coffeescript", coffeescriptHint);

  var stringProps = ("charAt charCodeAt indexOf lastIndexOf substring substr slice trim trimLeft trimRight " +
                     "toUpperCase toLowerCase split concat match replace search").split(" ");
  var arrayProps = ("length concat join splice push pop shift unshift slice reverse sort indexOf " +
                    "lastIndexOf every some filter forEach map reduce reduceRight ").split(" ");
  var funcProps = "prototype apply call bind".split(" ");
  var javascriptKeywords = ("break case catch continue debugger default delete do else false finally for function " +
                  "if in instanceof new null return switch throw true try typeof var void while with").split(" ");
  var coffeescriptKeywords = ("and break catch class continue delete do else extends false finally for " +
                  "if in instanceof isnt new no not null of off on or return switch then throw true try typeof until void while with yes").split(" ");

  function getCompletions(token, context, keywords, options) {
    var found = [], start = token.string, global = options && options.globalScope || window;
    function maybeAdd(str) {
      if (str.lastIndexOf(start, 0) == 0 && !arrayContains(found, str)) found.push(str);
    }
    function gatherCompletions(obj) {
      if (typeof obj == "string") forEach(stringProps, maybeAdd);
      else if (obj instanceof Array) forEach(arrayProps, maybeAdd);
      else if (obj instanceof Function) forEach(funcProps, maybeAdd);
      for (var name in obj) maybeAdd(name);
    }

    if (context && context.length) {
      // If this is a property, see if it belongs to some object we can
      // find in the current environment.
      var obj = context.pop(), base;
      if (obj.type && obj.type.indexOf("variable") === 0) {
        if (options && options.additionalContext)
          base = options.additionalContext[obj.string];
        if (!options || options.useGlobalScope !== false)
          base = base || global[obj.string];
      } else if (obj.type == "string") {
        base = "";
      } else if (obj.type == "atom") {
        base = 1;
      } else if (obj.type == "function") {
        if (global.jQuery != null && (obj.string == '$' || obj.string == 'jQuery') &&
            (typeof global.jQuery == 'function'))
          base = global.jQuery();
        else if (global._ != null && (obj.string == '_') && (typeof global._ == 'function'))
          base = global._();
      }
      while (base != null && context.length)
        base = base[context.pop().string];
      if (base != null) gatherCompletions(base);
    } else {
      // If not, just look in the global object and any local scope
      // (reading into JS mode internals to get at the local and global variables)
      for (var v = token.state.localVars; v; v = v.next) maybeAdd(v.name);
      for (var v = token.state.globalVars; v; v = v.next) maybeAdd(v.name);
      if (!options || options.useGlobalScope !== false)
        gatherCompletions(global);
      forEach(keywords, maybeAdd);
    }
    return found;
  }
});

},{"../../lib/codemirror":8}],6:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  var HINT_ELEMENT_CLASS        = "CodeMirror-hint";
  var ACTIVE_HINT_ELEMENT_CLASS = "CodeMirror-hint-active";

  // This is the old interface, kept around for now to stay
  // backwards-compatible.
  CodeMirror.showHint = function(cm, getHints, options) {
    if (!getHints) return cm.showHint(options);
    if (options && options.async) getHints.async = true;
    var newOpts = {hint: getHints};
    if (options) for (var prop in options) newOpts[prop] = options[prop];
    return cm.showHint(newOpts);
  };

  CodeMirror.defineExtension("showHint", function(options) {
    // We want a single cursor position.
    if (this.listSelections().length > 1 || this.somethingSelected()) return;

    if (this.state.completionActive) this.state.completionActive.close();
    var completion = this.state.completionActive = new Completion(this, options);
    if (!completion.options.hint) return;

    CodeMirror.signal(this, "startCompletion", this);
    completion.update(true);
  });

  function Completion(cm, options) {
    this.cm = cm;
    this.options = this.buildOptions(options);
    this.widget = null;
    this.debounce = 0;
    this.tick = 0;
    this.startPos = this.cm.getCursor();
    this.startLen = this.cm.getLine(this.startPos.line).length;

    var self = this;
    cm.on("cursorActivity", this.activityFunc = function() { self.cursorActivity(); });
  }

  var requestAnimationFrame = window.requestAnimationFrame || function(fn) {
    return setTimeout(fn, 1000/60);
  };
  var cancelAnimationFrame = window.cancelAnimationFrame || clearTimeout;

  Completion.prototype = {
    close: function() {
      if (!this.active()) return;
      this.cm.state.completionActive = null;
      this.tick = null;
      this.cm.off("cursorActivity", this.activityFunc);

      if (this.widget && this.data) CodeMirror.signal(this.data, "close");
      if (this.widget) this.widget.close();
      CodeMirror.signal(this.cm, "endCompletion", this.cm);
    },

    active: function() {
      return this.cm.state.completionActive == this;
    },

    pick: function(data, i) {
      var completion = data.list[i];
      if (completion.hint) completion.hint(this.cm, data, completion);
      else this.cm.replaceRange(getText(completion), completion.from || data.from,
                                completion.to || data.to, "complete");
      CodeMirror.signal(data, "pick", completion);
      this.close();
    },

    cursorActivity: function() {
      if (this.debounce) {
        cancelAnimationFrame(this.debounce);
        this.debounce = 0;
      }

      var pos = this.cm.getCursor(), line = this.cm.getLine(pos.line);
      if (pos.line != this.startPos.line || line.length - pos.ch != this.startLen - this.startPos.ch ||
          pos.ch < this.startPos.ch || this.cm.somethingSelected() ||
          (pos.ch && this.options.closeCharacters.test(line.charAt(pos.ch - 1)))) {
        this.close();
      } else {
        var self = this;
        this.debounce = requestAnimationFrame(function() {self.update();});
        if (this.widget) this.widget.disable();
      }
    },

    update: function(first) {
      if (this.tick == null) return;
      if (!this.options.hint.async) {
        this.finishUpdate(this.options.hint(this.cm, this.options), first);
      } else {
        var myTick = ++this.tick, self = this;
        this.options.hint(this.cm, function(data) {
          if (self.tick == myTick) self.finishUpdate(data, first);
        }, this.options);
      }
    },

    finishUpdate: function(data, first) {
      if (this.data) CodeMirror.signal(this.data, "update");
      if (data && this.data && CodeMirror.cmpPos(data.from, this.data.from)) data = null;
      this.data = data;

      var picked = (this.widget && this.widget.picked) || (first && this.options.completeSingle);
      if (this.widget) this.widget.close();
      if (data && data.list.length) {
        if (picked && data.list.length == 1) {
          this.pick(data, 0);
        } else {
          this.widget = new Widget(this, data);
          CodeMirror.signal(data, "shown");
        }
      }
    },

    buildOptions: function(options) {
      var editor = this.cm.options.hintOptions;
      var out = {};
      for (var prop in defaultOptions) out[prop] = defaultOptions[prop];
      if (editor) for (var prop in editor)
        if (editor[prop] !== undefined) out[prop] = editor[prop];
      if (options) for (var prop in options)
        if (options[prop] !== undefined) out[prop] = options[prop];
      return out;
    }
  };

  function getText(completion) {
    if (typeof completion == "string") return completion;
    else return completion.text;
  }

  function buildKeyMap(completion, handle) {
    var baseMap = {
      Up: function() {handle.moveFocus(-1);},
      Down: function() {handle.moveFocus(1);},
      PageUp: function() {handle.moveFocus(-handle.menuSize() + 1, true);},
      PageDown: function() {handle.moveFocus(handle.menuSize() - 1, true);},
      Home: function() {handle.setFocus(0);},
      End: function() {handle.setFocus(handle.length - 1);},
      Enter: handle.pick,
      Tab: handle.pick,
      Esc: handle.close
    };
    var custom = completion.options.customKeys;
    var ourMap = custom ? {} : baseMap;
    function addBinding(key, val) {
      var bound;
      if (typeof val != "string")
        bound = function(cm) { return val(cm, handle); };
      // This mechanism is deprecated
      else if (baseMap.hasOwnProperty(val))
        bound = baseMap[val];
      else
        bound = val;
      ourMap[key] = bound;
    }
    if (custom)
      for (var key in custom) if (custom.hasOwnProperty(key))
        addBinding(key, custom[key]);
    var extra = completion.options.extraKeys;
    if (extra)
      for (var key in extra) if (extra.hasOwnProperty(key))
        addBinding(key, extra[key]);
    return ourMap;
  }

  function getHintElement(hintsElement, el) {
    while (el && el != hintsElement) {
      if (el.nodeName.toUpperCase() === "LI" && el.parentNode == hintsElement) return el;
      el = el.parentNode;
    }
  }

  function Widget(completion, data) {
    this.completion = completion;
    this.data = data;
    this.picked = false;
    var widget = this, cm = completion.cm;

    var hints = this.hints = document.createElement("ul");
    hints.className = "CodeMirror-hints";
    this.selectedHint = data.selectedHint || 0;

    var completions = data.list;
    for (var i = 0; i < completions.length; ++i) {
      var elt = hints.appendChild(document.createElement("li")), cur = completions[i];
      var className = HINT_ELEMENT_CLASS + (i != this.selectedHint ? "" : " " + ACTIVE_HINT_ELEMENT_CLASS);
      if (cur.className != null) className = cur.className + " " + className;
      elt.className = className;
      if (cur.render) cur.render(elt, data, cur);
      else elt.appendChild(document.createTextNode(cur.displayText || getText(cur)));
      elt.hintId = i;
    }

    var pos = cm.cursorCoords(completion.options.alignWithWord ? data.from : null);
    var left = pos.left, top = pos.bottom, below = true;
    hints.style.left = left + "px";
    hints.style.top = top + "px";
    // If we're at the edge of the screen, then we want the menu to appear on the left of the cursor.
    var winW = window.innerWidth || Math.max(document.body.offsetWidth, document.documentElement.offsetWidth);
    var winH = window.innerHeight || Math.max(document.body.offsetHeight, document.documentElement.offsetHeight);
    (completion.options.container || document.body).appendChild(hints);
    var box = hints.getBoundingClientRect(), overlapY = box.bottom - winH;
    if (overlapY > 0) {
      var height = box.bottom - box.top, curTop = pos.top - (pos.bottom - box.top);
      if (curTop - height > 0) { // Fits above cursor
        hints.style.top = (top = pos.top - height) + "px";
        below = false;
      } else if (height > winH) {
        hints.style.height = (winH - 5) + "px";
        hints.style.top = (top = pos.bottom - box.top) + "px";
        var cursor = cm.getCursor();
        if (data.from.ch != cursor.ch) {
          pos = cm.cursorCoords(cursor);
          hints.style.left = (left = pos.left) + "px";
          box = hints.getBoundingClientRect();
        }
      }
    }
    var overlapX = box.right - winW;
    if (overlapX > 0) {
      if (box.right - box.left > winW) {
        hints.style.width = (winW - 5) + "px";
        overlapX -= (box.right - box.left) - winW;
      }
      hints.style.left = (left = pos.left - overlapX) + "px";
    }

    cm.addKeyMap(this.keyMap = buildKeyMap(completion, {
      moveFocus: function(n, avoidWrap) { widget.changeActive(widget.selectedHint + n, avoidWrap); },
      setFocus: function(n) { widget.changeActive(n); },
      menuSize: function() { return widget.screenAmount(); },
      length: completions.length,
      close: function() { completion.close(); },
      pick: function() { widget.pick(); },
      data: data
    }));

    if (completion.options.closeOnUnfocus) {
      var closingOnBlur;
      cm.on("blur", this.onBlur = function() { closingOnBlur = setTimeout(function() { completion.close(); }, 100); });
      cm.on("focus", this.onFocus = function() { clearTimeout(closingOnBlur); });
    }

    var startScroll = cm.getScrollInfo();
    cm.on("scroll", this.onScroll = function() {
      var curScroll = cm.getScrollInfo(), editor = cm.getWrapperElement().getBoundingClientRect();
      var newTop = top + startScroll.top - curScroll.top;
      var point = newTop - (window.pageYOffset || (document.documentElement || document.body).scrollTop);
      if (!below) point += hints.offsetHeight;
      if (point <= editor.top || point >= editor.bottom) return completion.close();
      hints.style.top = newTop + "px";
      hints.style.left = (left + startScroll.left - curScroll.left) + "px";
    });

    CodeMirror.on(hints, "dblclick", function(e) {
      var t = getHintElement(hints, e.target || e.srcElement);
      if (t && t.hintId != null) {widget.changeActive(t.hintId); widget.pick();}
    });

    CodeMirror.on(hints, "click", function(e) {
      var t = getHintElement(hints, e.target || e.srcElement);
      if (t && t.hintId != null) {
        widget.changeActive(t.hintId);
        if (completion.options.completeOnSingleClick) widget.pick();
      }
    });

    CodeMirror.on(hints, "mousedown", function() {
      setTimeout(function(){cm.focus();}, 20);
    });

    CodeMirror.signal(data, "select", completions[0], hints.firstChild);
    return true;
  }

  Widget.prototype = {
    close: function() {
      if (this.completion.widget != this) return;
      this.completion.widget = null;
      this.hints.parentNode.removeChild(this.hints);
      this.completion.cm.removeKeyMap(this.keyMap);

      var cm = this.completion.cm;
      if (this.completion.options.closeOnUnfocus) {
        cm.off("blur", this.onBlur);
        cm.off("focus", this.onFocus);
      }
      cm.off("scroll", this.onScroll);
    },

    disable: function() {
      this.completion.cm.removeKeyMap(this.keyMap);
      var widget = this;
      this.keyMap = {Enter: function() { widget.picked = true; }};
      this.completion.cm.addKeyMap(this.keyMap);
    },

    pick: function() {
      this.completion.pick(this.data, this.selectedHint);
    },

    changeActive: function(i, avoidWrap) {
      if (i >= this.data.list.length)
        i = avoidWrap ? this.data.list.length - 1 : 0;
      else if (i < 0)
        i = avoidWrap ? 0  : this.data.list.length - 1;
      if (this.selectedHint == i) return;
      var node = this.hints.childNodes[this.selectedHint];
      node.className = node.className.replace(" " + ACTIVE_HINT_ELEMENT_CLASS, "");
      node = this.hints.childNodes[this.selectedHint = i];
      node.className += " " + ACTIVE_HINT_ELEMENT_CLASS;
      if (node.offsetTop < this.hints.scrollTop)
        this.hints.scrollTop = node.offsetTop - 3;
      else if (node.offsetTop + node.offsetHeight > this.hints.scrollTop + this.hints.clientHeight)
        this.hints.scrollTop = node.offsetTop + node.offsetHeight - this.hints.clientHeight + 3;
      CodeMirror.signal(this.data, "select", this.data.list[this.selectedHint], node);
    },

    screenAmount: function() {
      return Math.floor(this.hints.clientHeight / this.hints.firstChild.offsetHeight) || 1;
    }
  };

  CodeMirror.registerHelper("hint", "auto", function(cm, options) {
    var helpers = cm.getHelpers(cm.getCursor(), "hint"), words;
    if (helpers.length) {
      for (var i = 0; i < helpers.length; i++) {
        var cur = helpers[i](cm, options);
        if (cur && cur.list.length) return cur;
      }
    } else if (words = cm.getHelper(cm.getCursor(), "hintWords")) {
      if (words) return CodeMirror.hint.fromList(cm, {words: words});
    } else if (CodeMirror.hint.anyword) {
      return CodeMirror.hint.anyword(cm, options);
    }
  });

  CodeMirror.registerHelper("hint", "fromList", function(cm, options) {
    var cur = cm.getCursor(), token = cm.getTokenAt(cur);
    var to = CodeMirror.Pos(cur.line, token.end);
    if (token.string && /\w/.test(token.string[token.string.length - 1])) {
      var term = token.string, from = CodeMirror.Pos(cur.line, token.start);
    } else {
      var term = "", from = to;
    }
    var found = [];
    for (var i = 0; i < options.words.length; i++) {
      var word = options.words[i];
      if (word.slice(0, term.length) == term)
        found.push(word);
    }

    if (found.length) return {list: found, from: from, to: to};
  });

  CodeMirror.commands.autocomplete = CodeMirror.showHint;

  var defaultOptions = {
    hint: CodeMirror.hint.auto,
    completeSingle: true,
    alignWithWord: true,
    closeCharacters: /[\s()\[\]{};:>,]/,
    closeOnUnfocus: true,
    completeOnSingleClick: false,
    container: null,
    customKeys: null,
    extraKeys: null
  };

  CodeMirror.defineOption("hintOptions", null);
});

},{"../../lib/codemirror":8}],7:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

// Because sometimes you need to style the cursor's line.
//
// Adds an option 'styleActiveLine' which, when enabled, gives the
// active line's wrapping <div> the CSS class "CodeMirror-activeline",
// and gives its background <div> the class "CodeMirror-activeline-background".

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";
  var WRAP_CLASS = "CodeMirror-activeline";
  var BACK_CLASS = "CodeMirror-activeline-background";

  CodeMirror.defineOption("styleActiveLine", false, function(cm, val, old) {
    var prev = old && old != CodeMirror.Init;
    if (val && !prev) {
      cm.state.activeLines = [];
      updateActiveLines(cm, cm.listSelections());
      cm.on("beforeSelectionChange", selectionChange);
    } else if (!val && prev) {
      cm.off("beforeSelectionChange", selectionChange);
      clearActiveLines(cm);
      delete cm.state.activeLines;
    }
  });

  function clearActiveLines(cm) {
    for (var i = 0; i < cm.state.activeLines.length; i++) {
      cm.removeLineClass(cm.state.activeLines[i], "wrap", WRAP_CLASS);
      cm.removeLineClass(cm.state.activeLines[i], "background", BACK_CLASS);
    }
  }

  function sameArray(a, b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++)
      if (a[i] != b[i]) return false;
    return true;
  }

  function updateActiveLines(cm, ranges) {
    var active = [];
    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i];
      if (!range.empty()) continue;
      var line = cm.getLineHandleVisualStart(range.head.line);
      if (active[active.length - 1] != line) active.push(line);
    }
    if (sameArray(cm.state.activeLines, active)) return;
    cm.operation(function() {
      clearActiveLines(cm);
      for (var i = 0; i < active.length; i++) {
        cm.addLineClass(active[i], "wrap", WRAP_CLASS);
        cm.addLineClass(active[i], "background", BACK_CLASS);
      }
      cm.state.activeLines = active;
    });
  }

  function selectionChange(cm, sel) {
    updateActiveLines(cm, sel.ranges);
  }
});

},{"../../lib/codemirror":8}],8:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

// This is CodeMirror (http://codemirror.net), a code editor
// implemented in JavaScript on top of the browser's DOM.
//
// You can find some technical background for some of the code below
// at http://marijnhaverbeke.nl/blog/#cm-internals .

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    module.exports = mod();
  else if (typeof define == "function" && define.amd) // AMD
    return define([], mod);
  else // Plain browser env
    this.CodeMirror = mod();
})(function() {
  "use strict";

  // BROWSER SNIFFING

  // Kludges for bugs and behavior differences that can't be feature
  // detected are enabled based on userAgent etc sniffing.

  var gecko = /gecko\/\d/i.test(navigator.userAgent);
  var ie_upto10 = /MSIE \d/.test(navigator.userAgent);
  var ie_11up = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);
  var ie = ie_upto10 || ie_11up;
  var ie_version = ie && (ie_upto10 ? document.documentMode || 6 : ie_11up[1]);
  var webkit = /WebKit\//.test(navigator.userAgent);
  var qtwebkit = webkit && /Qt\/\d+\.\d+/.test(navigator.userAgent);
  var chrome = /Chrome\//.test(navigator.userAgent);
  var presto = /Opera\//.test(navigator.userAgent);
  var safari = /Apple Computer/.test(navigator.vendor);
  var mac_geMountainLion = /Mac OS X 1\d\D([8-9]|\d\d)\D/.test(navigator.userAgent);
  var phantom = /PhantomJS/.test(navigator.userAgent);

  var ios = /AppleWebKit/.test(navigator.userAgent) && /Mobile\/\w+/.test(navigator.userAgent);
  // This is woefully incomplete. Suggestions for alternative methods welcome.
  var mobile = ios || /Android|webOS|BlackBerry|Opera Mini|Opera Mobi|IEMobile/i.test(navigator.userAgent);
  var mac = ios || /Mac/.test(navigator.platform);
  var windows = /win/i.test(navigator.platform);

  var presto_version = presto && navigator.userAgent.match(/Version\/(\d*\.\d*)/);
  if (presto_version) presto_version = Number(presto_version[1]);
  if (presto_version && presto_version >= 15) { presto = false; webkit = true; }
  // Some browsers use the wrong event properties to signal cmd/ctrl on OS X
  var flipCtrlCmd = mac && (qtwebkit || presto && (presto_version == null || presto_version < 12.11));
  var captureRightClick = gecko || (ie && ie_version >= 9);

  // Optimize some code when these features are not used.
  var sawReadOnlySpans = false, sawCollapsedSpans = false;

  // EDITOR CONSTRUCTOR

  // A CodeMirror instance represents an editor. This is the object
  // that user code is usually dealing with.

  function CodeMirror(place, options) {
    if (!(this instanceof CodeMirror)) return new CodeMirror(place, options);

    this.options = options = options ? copyObj(options) : {};
    // Determine effective options based on given values and defaults.
    copyObj(defaults, options, false);
    setGuttersForLineNumbers(options);

    var doc = options.value;
    if (typeof doc == "string") doc = new Doc(doc, options.mode, null, options.lineSeparator);
    this.doc = doc;

    var input = new CodeMirror.inputStyles[options.inputStyle](this);
    var display = this.display = new Display(place, doc, input);
    display.wrapper.CodeMirror = this;
    updateGutters(this);
    themeChanged(this);
    if (options.lineWrapping)
      this.display.wrapper.className += " CodeMirror-wrap";
    if (options.autofocus && !mobile) display.input.focus();
    initScrollbars(this);

    this.state = {
      keyMaps: [],  // stores maps added by addKeyMap
      overlays: [], // highlighting overlays, as added by addOverlay
      modeGen: 0,   // bumped when mode/overlay changes, used to invalidate highlighting info
      overwrite: false,
      delayingBlurEvent: false,
      focused: false,
      suppressEdits: false, // used to disable editing during key handlers when in readOnly mode
      pasteIncoming: false, cutIncoming: false, // help recognize paste/cut edits in input.poll
      draggingText: false,
      highlight: new Delayed(), // stores highlight worker timeout
      keySeq: null,  // Unfinished key sequence
      specialChars: null
    };

    var cm = this;

    // Override magic textarea content restore that IE sometimes does
    // on our hidden textarea on reload
    if (ie && ie_version < 11) setTimeout(function() { cm.display.input.reset(true); }, 20);

    registerEventHandlers(this);
    ensureGlobalHandlers();

    startOperation(this);
    this.curOp.forceUpdate = true;
    attachDoc(this, doc);

    if ((options.autofocus && !mobile) || cm.hasFocus())
      setTimeout(bind(onFocus, this), 20);
    else
      onBlur(this);

    for (var opt in optionHandlers) if (optionHandlers.hasOwnProperty(opt))
      optionHandlers[opt](this, options[opt], Init);
    maybeUpdateLineNumberWidth(this);
    if (options.finishInit) options.finishInit(this);
    for (var i = 0; i < initHooks.length; ++i) initHooks[i](this);
    endOperation(this);
    // Suppress optimizelegibility in Webkit, since it breaks text
    // measuring on line wrapping boundaries.
    if (webkit && options.lineWrapping &&
        getComputedStyle(display.lineDiv).textRendering == "optimizelegibility")
      display.lineDiv.style.textRendering = "auto";
  }

  // DISPLAY CONSTRUCTOR

  // The display handles the DOM integration, both for input reading
  // and content drawing. It holds references to DOM nodes and
  // display-related state.

  function Display(place, doc, input) {
    var d = this;
    this.input = input;

    // Covers bottom-right square when both scrollbars are present.
    d.scrollbarFiller = elt("div", null, "CodeMirror-scrollbar-filler");
    d.scrollbarFiller.setAttribute("cm-not-content", "true");
    // Covers bottom of gutter when coverGutterNextToScrollbar is on
    // and h scrollbar is present.
    d.gutterFiller = elt("div", null, "CodeMirror-gutter-filler");
    d.gutterFiller.setAttribute("cm-not-content", "true");
    // Will contain the actual code, positioned to cover the viewport.
    d.lineDiv = elt("div", null, "CodeMirror-code");
    // Elements are added to these to represent selection and cursors.
    d.selectionDiv = elt("div", null, null, "position: relative; z-index: 1");
    d.cursorDiv = elt("div", null, "CodeMirror-cursors");
    // A visibility: hidden element used to find the size of things.
    d.measure = elt("div", null, "CodeMirror-measure");
    // When lines outside of the viewport are measured, they are drawn in this.
    d.lineMeasure = elt("div", null, "CodeMirror-measure");
    // Wraps everything that needs to exist inside the vertically-padded coordinate system
    d.lineSpace = elt("div", [d.measure, d.lineMeasure, d.selectionDiv, d.cursorDiv, d.lineDiv],
                      null, "position: relative; outline: none");
    // Moved around its parent to cover visible view.
    d.mover = elt("div", [elt("div", [d.lineSpace], "CodeMirror-lines")], null, "position: relative");
    // Set to the height of the document, allowing scrolling.
    d.sizer = elt("div", [d.mover], "CodeMirror-sizer");
    d.sizerWidth = null;
    // Behavior of elts with overflow: auto and padding is
    // inconsistent across browsers. This is used to ensure the
    // scrollable area is big enough.
    d.heightForcer = elt("div", null, null, "position: absolute; height: " + scrollerGap + "px; width: 1px;");
    // Will contain the gutters, if any.
    d.gutters = elt("div", null, "CodeMirror-gutters");
    d.lineGutter = null;
    // Actual scrollable element.
    d.scroller = elt("div", [d.sizer, d.heightForcer, d.gutters], "CodeMirror-scroll");
    d.scroller.setAttribute("tabIndex", "-1");
    // The element in which the editor lives.
    d.wrapper = elt("div", [d.scrollbarFiller, d.gutterFiller, d.scroller], "CodeMirror");

    // Work around IE7 z-index bug (not perfect, hence IE7 not really being supported)
    if (ie && ie_version < 8) { d.gutters.style.zIndex = -1; d.scroller.style.paddingRight = 0; }
    if (!webkit && !(gecko && mobile)) d.scroller.draggable = true;

    if (place) {
      if (place.appendChild) place.appendChild(d.wrapper);
      else place(d.wrapper);
    }

    // Current rendered range (may be bigger than the view window).
    d.viewFrom = d.viewTo = doc.first;
    d.reportedViewFrom = d.reportedViewTo = doc.first;
    // Information about the rendered lines.
    d.view = [];
    d.renderedView = null;
    // Holds info about a single rendered line when it was rendered
    // for measurement, while not in view.
    d.externalMeasured = null;
    // Empty space (in pixels) above the view
    d.viewOffset = 0;
    d.lastWrapHeight = d.lastWrapWidth = 0;
    d.updateLineNumbers = null;

    d.nativeBarWidth = d.barHeight = d.barWidth = 0;
    d.scrollbarsClipped = false;

    // Used to only resize the line number gutter when necessary (when
    // the amount of lines crosses a boundary that makes its width change)
    d.lineNumWidth = d.lineNumInnerWidth = d.lineNumChars = null;
    // Set to true when a non-horizontal-scrolling line widget is
    // added. As an optimization, line widget aligning is skipped when
    // this is false.
    d.alignWidgets = false;

    d.cachedCharWidth = d.cachedTextHeight = d.cachedPaddingH = null;

    // Tracks the maximum line length so that the horizontal scrollbar
    // can be kept static when scrolling.
    d.maxLine = null;
    d.maxLineLength = 0;
    d.maxLineChanged = false;

    // Used for measuring wheel scrolling granularity
    d.wheelDX = d.wheelDY = d.wheelStartX = d.wheelStartY = null;

    // True when shift is held down.
    d.shift = false;

    // Used to track whether anything happened since the context menu
    // was opened.
    d.selForContextMenu = null;

    d.activeTouch = null;

    input.init(d);
  }

  // STATE UPDATES

  // Used to get the editor into a consistent state again when options change.

  function loadMode(cm) {
    cm.doc.mode = CodeMirror.getMode(cm.options, cm.doc.modeOption);
    resetModeState(cm);
  }

  function resetModeState(cm) {
    cm.doc.iter(function(line) {
      if (line.stateAfter) line.stateAfter = null;
      if (line.styles) line.styles = null;
    });
    cm.doc.frontier = cm.doc.first;
    startWorker(cm, 100);
    cm.state.modeGen++;
    if (cm.curOp) regChange(cm);
  }

  function wrappingChanged(cm) {
    if (cm.options.lineWrapping) {
      addClass(cm.display.wrapper, "CodeMirror-wrap");
      cm.display.sizer.style.minWidth = "";
      cm.display.sizerWidth = null;
    } else {
      rmClass(cm.display.wrapper, "CodeMirror-wrap");
      findMaxLine(cm);
    }
    estimateLineHeights(cm);
    regChange(cm);
    clearCaches(cm);
    setTimeout(function(){updateScrollbars(cm);}, 100);
  }

  // Returns a function that estimates the height of a line, to use as
  // first approximation until the line becomes visible (and is thus
  // properly measurable).
  function estimateHeight(cm) {
    var th = textHeight(cm.display), wrapping = cm.options.lineWrapping;
    var perLine = wrapping && Math.max(5, cm.display.scroller.clientWidth / charWidth(cm.display) - 3);
    return function(line) {
      if (lineIsHidden(cm.doc, line)) return 0;

      var widgetsHeight = 0;
      if (line.widgets) for (var i = 0; i < line.widgets.length; i++) {
        if (line.widgets[i].height) widgetsHeight += line.widgets[i].height;
      }

      if (wrapping)
        return widgetsHeight + (Math.ceil(line.text.length / perLine) || 1) * th;
      else
        return widgetsHeight + th;
    };
  }

  function estimateLineHeights(cm) {
    var doc = cm.doc, est = estimateHeight(cm);
    doc.iter(function(line) {
      var estHeight = est(line);
      if (estHeight != line.height) updateLineHeight(line, estHeight);
    });
  }

  function themeChanged(cm) {
    cm.display.wrapper.className = cm.display.wrapper.className.replace(/\s*cm-s-\S+/g, "") +
      cm.options.theme.replace(/(^|\s)\s*/g, " cm-s-");
    clearCaches(cm);
  }

  function guttersChanged(cm) {
    updateGutters(cm);
    regChange(cm);
    setTimeout(function(){alignHorizontally(cm);}, 20);
  }

  // Rebuild the gutter elements, ensure the margin to the left of the
  // code matches their width.
  function updateGutters(cm) {
    var gutters = cm.display.gutters, specs = cm.options.gutters;
    removeChildren(gutters);
    for (var i = 0; i < specs.length; ++i) {
      var gutterClass = specs[i];
      var gElt = gutters.appendChild(elt("div", null, "CodeMirror-gutter " + gutterClass));
      if (gutterClass == "CodeMirror-linenumbers") {
        cm.display.lineGutter = gElt;
        gElt.style.width = (cm.display.lineNumWidth || 1) + "px";
      }
    }
    gutters.style.display = i ? "" : "none";
    updateGutterSpace(cm);
  }

  function updateGutterSpace(cm) {
    var width = cm.display.gutters.offsetWidth;
    cm.display.sizer.style.marginLeft = width + "px";
  }

  // Compute the character length of a line, taking into account
  // collapsed ranges (see markText) that might hide parts, and join
  // other lines onto it.
  function lineLength(line) {
    if (line.height == 0) return 0;
    var len = line.text.length, merged, cur = line;
    while (merged = collapsedSpanAtStart(cur)) {
      var found = merged.find(0, true);
      cur = found.from.line;
      len += found.from.ch - found.to.ch;
    }
    cur = line;
    while (merged = collapsedSpanAtEnd(cur)) {
      var found = merged.find(0, true);
      len -= cur.text.length - found.from.ch;
      cur = found.to.line;
      len += cur.text.length - found.to.ch;
    }
    return len;
  }

  // Find the longest line in the document.
  function findMaxLine(cm) {
    var d = cm.display, doc = cm.doc;
    d.maxLine = getLine(doc, doc.first);
    d.maxLineLength = lineLength(d.maxLine);
    d.maxLineChanged = true;
    doc.iter(function(line) {
      var len = lineLength(line);
      if (len > d.maxLineLength) {
        d.maxLineLength = len;
        d.maxLine = line;
      }
    });
  }

  // Make sure the gutters options contains the element
  // "CodeMirror-linenumbers" when the lineNumbers option is true.
  function setGuttersForLineNumbers(options) {
    var found = indexOf(options.gutters, "CodeMirror-linenumbers");
    if (found == -1 && options.lineNumbers) {
      options.gutters = options.gutters.concat(["CodeMirror-linenumbers"]);
    } else if (found > -1 && !options.lineNumbers) {
      options.gutters = options.gutters.slice(0);
      options.gutters.splice(found, 1);
    }
  }

  // SCROLLBARS

  // Prepare DOM reads needed to update the scrollbars. Done in one
  // shot to minimize update/measure roundtrips.
  function measureForScrollbars(cm) {
    var d = cm.display, gutterW = d.gutters.offsetWidth;
    var docH = Math.round(cm.doc.height + paddingVert(cm.display));
    return {
      clientHeight: d.scroller.clientHeight,
      viewHeight: d.wrapper.clientHeight,
      scrollWidth: d.scroller.scrollWidth, clientWidth: d.scroller.clientWidth,
      viewWidth: d.wrapper.clientWidth,
      barLeft: cm.options.fixedGutter ? gutterW : 0,
      docHeight: docH,
      scrollHeight: docH + scrollGap(cm) + d.barHeight,
      nativeBarWidth: d.nativeBarWidth,
      gutterWidth: gutterW
    };
  }

  function NativeScrollbars(place, scroll, cm) {
    this.cm = cm;
    var vert = this.vert = elt("div", [elt("div", null, null, "min-width: 1px")], "CodeMirror-vscrollbar");
    var horiz = this.horiz = elt("div", [elt("div", null, null, "height: 100%; min-height: 1px")], "CodeMirror-hscrollbar");
    place(vert); place(horiz);

    on(vert, "scroll", function() {
      if (vert.clientHeight) scroll(vert.scrollTop, "vertical");
    });
    on(horiz, "scroll", function() {
      if (horiz.clientWidth) scroll(horiz.scrollLeft, "horizontal");
    });

    this.checkedOverlay = false;
    // Need to set a minimum width to see the scrollbar on IE7 (but must not set it on IE8).
    if (ie && ie_version < 8) this.horiz.style.minHeight = this.vert.style.minWidth = "18px";
  }

  NativeScrollbars.prototype = copyObj({
    update: function(measure) {
      var needsH = measure.scrollWidth > measure.clientWidth + 1;
      var needsV = measure.scrollHeight > measure.clientHeight + 1;
      var sWidth = measure.nativeBarWidth;

      if (needsV) {
        this.vert.style.display = "block";
        this.vert.style.bottom = needsH ? sWidth + "px" : "0";
        var totalHeight = measure.viewHeight - (needsH ? sWidth : 0);
        // A bug in IE8 can cause this value to be negative, so guard it.
        this.vert.firstChild.style.height =
          Math.max(0, measure.scrollHeight - measure.clientHeight + totalHeight) + "px";
      } else {
        this.vert.style.display = "";
        this.vert.firstChild.style.height = "0";
      }

      if (needsH) {
        this.horiz.style.display = "block";
        this.horiz.style.right = needsV ? sWidth + "px" : "0";
        this.horiz.style.left = measure.barLeft + "px";
        var totalWidth = measure.viewWidth - measure.barLeft - (needsV ? sWidth : 0);
        this.horiz.firstChild.style.width =
          (measure.scrollWidth - measure.clientWidth + totalWidth) + "px";
      } else {
        this.horiz.style.display = "";
        this.horiz.firstChild.style.width = "0";
      }

      if (!this.checkedOverlay && measure.clientHeight > 0) {
        if (sWidth == 0) this.overlayHack();
        this.checkedOverlay = true;
      }

      return {right: needsV ? sWidth : 0, bottom: needsH ? sWidth : 0};
    },
    setScrollLeft: function(pos) {
      if (this.horiz.scrollLeft != pos) this.horiz.scrollLeft = pos;
    },
    setScrollTop: function(pos) {
      if (this.vert.scrollTop != pos) this.vert.scrollTop = pos;
    },
    overlayHack: function() {
      var w = mac && !mac_geMountainLion ? "12px" : "18px";
      this.horiz.style.minHeight = this.vert.style.minWidth = w;
      var self = this;
      var barMouseDown = function(e) {
        if (e_target(e) != self.vert && e_target(e) != self.horiz)
          operation(self.cm, onMouseDown)(e);
      };
      on(this.vert, "mousedown", barMouseDown);
      on(this.horiz, "mousedown", barMouseDown);
    },
    clear: function() {
      var parent = this.horiz.parentNode;
      parent.removeChild(this.horiz);
      parent.removeChild(this.vert);
    }
  }, NativeScrollbars.prototype);

  function NullScrollbars() {}

  NullScrollbars.prototype = copyObj({
    update: function() { return {bottom: 0, right: 0}; },
    setScrollLeft: function() {},
    setScrollTop: function() {},
    clear: function() {}
  }, NullScrollbars.prototype);

  CodeMirror.scrollbarModel = {"native": NativeScrollbars, "null": NullScrollbars};

  function initScrollbars(cm) {
    if (cm.display.scrollbars) {
      cm.display.scrollbars.clear();
      if (cm.display.scrollbars.addClass)
        rmClass(cm.display.wrapper, cm.display.scrollbars.addClass);
    }

    cm.display.scrollbars = new CodeMirror.scrollbarModel[cm.options.scrollbarStyle](function(node) {
      cm.display.wrapper.insertBefore(node, cm.display.scrollbarFiller);
      // Prevent clicks in the scrollbars from killing focus
      on(node, "mousedown", function() {
        if (cm.state.focused) setTimeout(function() { cm.display.input.focus(); }, 0);
      });
      node.setAttribute("cm-not-content", "true");
    }, function(pos, axis) {
      if (axis == "horizontal") setScrollLeft(cm, pos);
      else setScrollTop(cm, pos);
    }, cm);
    if (cm.display.scrollbars.addClass)
      addClass(cm.display.wrapper, cm.display.scrollbars.addClass);
  }

  function updateScrollbars(cm, measure) {
    if (!measure) measure = measureForScrollbars(cm);
    var startWidth = cm.display.barWidth, startHeight = cm.display.barHeight;
    updateScrollbarsInner(cm, measure);
    for (var i = 0; i < 4 && startWidth != cm.display.barWidth || startHeight != cm.display.barHeight; i++) {
      if (startWidth != cm.display.barWidth && cm.options.lineWrapping)
        updateHeightsInViewport(cm);
      updateScrollbarsInner(cm, measureForScrollbars(cm));
      startWidth = cm.display.barWidth; startHeight = cm.display.barHeight;
    }
  }

  // Re-synchronize the fake scrollbars with the actual size of the
  // content.
  function updateScrollbarsInner(cm, measure) {
    var d = cm.display;
    var sizes = d.scrollbars.update(measure);

    d.sizer.style.paddingRight = (d.barWidth = sizes.right) + "px";
    d.sizer.style.paddingBottom = (d.barHeight = sizes.bottom) + "px";

    if (sizes.right && sizes.bottom) {
      d.scrollbarFiller.style.display = "block";
      d.scrollbarFiller.style.height = sizes.bottom + "px";
      d.scrollbarFiller.style.width = sizes.right + "px";
    } else d.scrollbarFiller.style.display = "";
    if (sizes.bottom && cm.options.coverGutterNextToScrollbar && cm.options.fixedGutter) {
      d.gutterFiller.style.display = "block";
      d.gutterFiller.style.height = sizes.bottom + "px";
      d.gutterFiller.style.width = measure.gutterWidth + "px";
    } else d.gutterFiller.style.display = "";
  }

  // Compute the lines that are visible in a given viewport (defaults
  // the the current scroll position). viewport may contain top,
  // height, and ensure (see op.scrollToPos) properties.
  function visibleLines(display, doc, viewport) {
    var top = viewport && viewport.top != null ? Math.max(0, viewport.top) : display.scroller.scrollTop;
    top = Math.floor(top - paddingTop(display));
    var bottom = viewport && viewport.bottom != null ? viewport.bottom : top + display.wrapper.clientHeight;

    var from = lineAtHeight(doc, top), to = lineAtHeight(doc, bottom);
    // Ensure is a {from: {line, ch}, to: {line, ch}} object, and
    // forces those lines into the viewport (if possible).
    if (viewport && viewport.ensure) {
      var ensureFrom = viewport.ensure.from.line, ensureTo = viewport.ensure.to.line;
      if (ensureFrom < from) {
        from = ensureFrom;
        to = lineAtHeight(doc, heightAtLine(getLine(doc, ensureFrom)) + display.wrapper.clientHeight);
      } else if (Math.min(ensureTo, doc.lastLine()) >= to) {
        from = lineAtHeight(doc, heightAtLine(getLine(doc, ensureTo)) - display.wrapper.clientHeight);
        to = ensureTo;
      }
    }
    return {from: from, to: Math.max(to, from + 1)};
  }

  // LINE NUMBERS

  // Re-align line numbers and gutter marks to compensate for
  // horizontal scrolling.
  function alignHorizontally(cm) {
    var display = cm.display, view = display.view;
    if (!display.alignWidgets && (!display.gutters.firstChild || !cm.options.fixedGutter)) return;
    var comp = compensateForHScroll(display) - display.scroller.scrollLeft + cm.doc.scrollLeft;
    var gutterW = display.gutters.offsetWidth, left = comp + "px";
    for (var i = 0; i < view.length; i++) if (!view[i].hidden) {
      if (cm.options.fixedGutter && view[i].gutter)
        view[i].gutter.style.left = left;
      var align = view[i].alignable;
      if (align) for (var j = 0; j < align.length; j++)
        align[j].style.left = left;
    }
    if (cm.options.fixedGutter)
      display.gutters.style.left = (comp + gutterW) + "px";
  }

  // Used to ensure that the line number gutter is still the right
  // size for the current document size. Returns true when an update
  // is needed.
  function maybeUpdateLineNumberWidth(cm) {
    if (!cm.options.lineNumbers) return false;
    var doc = cm.doc, last = lineNumberFor(cm.options, doc.first + doc.size - 1), display = cm.display;
    if (last.length != display.lineNumChars) {
      var test = display.measure.appendChild(elt("div", [elt("div", last)],
                                                 "CodeMirror-linenumber CodeMirror-gutter-elt"));
      var innerW = test.firstChild.offsetWidth, padding = test.offsetWidth - innerW;
      display.lineGutter.style.width = "";
      display.lineNumInnerWidth = Math.max(innerW, display.lineGutter.offsetWidth - padding) + 1;
      display.lineNumWidth = display.lineNumInnerWidth + padding;
      display.lineNumChars = display.lineNumInnerWidth ? last.length : -1;
      display.lineGutter.style.width = display.lineNumWidth + "px";
      updateGutterSpace(cm);
      return true;
    }
    return false;
  }

  function lineNumberFor(options, i) {
    return String(options.lineNumberFormatter(i + options.firstLineNumber));
  }

  // Computes display.scroller.scrollLeft + display.gutters.offsetWidth,
  // but using getBoundingClientRect to get a sub-pixel-accurate
  // result.
  function compensateForHScroll(display) {
    return display.scroller.getBoundingClientRect().left - display.sizer.getBoundingClientRect().left;
  }

  // DISPLAY DRAWING

  function DisplayUpdate(cm, viewport, force) {
    var display = cm.display;

    this.viewport = viewport;
    // Store some values that we'll need later (but don't want to force a relayout for)
    this.visible = visibleLines(display, cm.doc, viewport);
    this.editorIsHidden = !display.wrapper.offsetWidth;
    this.wrapperHeight = display.wrapper.clientHeight;
    this.wrapperWidth = display.wrapper.clientWidth;
    this.oldDisplayWidth = displayWidth(cm);
    this.force = force;
    this.dims = getDimensions(cm);
    this.events = [];
  }

  DisplayUpdate.prototype.signal = function(emitter, type) {
    if (hasHandler(emitter, type))
      this.events.push(arguments);
  };
  DisplayUpdate.prototype.finish = function() {
    for (var i = 0; i < this.events.length; i++)
      signal.apply(null, this.events[i]);
  };

  function maybeClipScrollbars(cm) {
    var display = cm.display;
    if (!display.scrollbarsClipped && display.scroller.offsetWidth) {
      display.nativeBarWidth = display.scroller.offsetWidth - display.scroller.clientWidth;
      display.heightForcer.style.height = scrollGap(cm) + "px";
      display.sizer.style.marginBottom = -display.nativeBarWidth + "px";
      display.sizer.style.borderRightWidth = scrollGap(cm) + "px";
      display.scrollbarsClipped = true;
    }
  }

  // Does the actual updating of the line display. Bails out
  // (returning false) when there is nothing to be done and forced is
  // false.
  function updateDisplayIfNeeded(cm, update) {
    var display = cm.display, doc = cm.doc;

    if (update.editorIsHidden) {
      resetView(cm);
      return false;
    }

    // Bail out if the visible area is already rendered and nothing changed.
    if (!update.force &&
        update.visible.from >= display.viewFrom && update.visible.to <= display.viewTo &&
        (display.updateLineNumbers == null || display.updateLineNumbers >= display.viewTo) &&
        display.renderedView == display.view && countDirtyView(cm) == 0)
      return false;

    if (maybeUpdateLineNumberWidth(cm)) {
      resetView(cm);
      update.dims = getDimensions(cm);
    }

    // Compute a suitable new viewport (from & to)
    var end = doc.first + doc.size;
    var from = Math.max(update.visible.from - cm.options.viewportMargin, doc.first);
    var to = Math.min(end, update.visible.to + cm.options.viewportMargin);
    if (display.viewFrom < from && from - display.viewFrom < 20) from = Math.max(doc.first, display.viewFrom);
    if (display.viewTo > to && display.viewTo - to < 20) to = Math.min(end, display.viewTo);
    if (sawCollapsedSpans) {
      from = visualLineNo(cm.doc, from);
      to = visualLineEndNo(cm.doc, to);
    }

    var different = from != display.viewFrom || to != display.viewTo ||
      display.lastWrapHeight != update.wrapperHeight || display.lastWrapWidth != update.wrapperWidth;
    adjustView(cm, from, to);

    display.viewOffset = heightAtLine(getLine(cm.doc, display.viewFrom));
    // Position the mover div to align with the current scroll position
    cm.display.mover.style.top = display.viewOffset + "px";

    var toUpdate = countDirtyView(cm);
    if (!different && toUpdate == 0 && !update.force && display.renderedView == display.view &&
        (display.updateLineNumbers == null || display.updateLineNumbers >= display.viewTo))
      return false;

    // For big changes, we hide the enclosing element during the
    // update, since that speeds up the operations on most browsers.
    var focused = activeElt();
    if (toUpdate > 4) display.lineDiv.style.display = "none";
    patchDisplay(cm, display.updateLineNumbers, update.dims);
    if (toUpdate > 4) display.lineDiv.style.display = "";
    display.renderedView = display.view;
    // There might have been a widget with a focused element that got
    // hidden or updated, if so re-focus it.
    if (focused && activeElt() != focused && focused.offsetHeight) focused.focus();

    // Prevent selection and cursors from interfering with the scroll
    // width and height.
    removeChildren(display.cursorDiv);
    removeChildren(display.selectionDiv);
    display.gutters.style.height = display.sizer.style.minHeight = 0;

    if (different) {
      display.lastWrapHeight = update.wrapperHeight;
      display.lastWrapWidth = update.wrapperWidth;
      startWorker(cm, 400);
    }

    display.updateLineNumbers = null;

    return true;
  }

  function postUpdateDisplay(cm, update) {
    var viewport = update.viewport;
    for (var first = true;; first = false) {
      if (!first || !cm.options.lineWrapping || update.oldDisplayWidth == displayWidth(cm)) {
        // Clip forced viewport to actual scrollable area.
        if (viewport && viewport.top != null)
          viewport = {top: Math.min(cm.doc.height + paddingVert(cm.display) - displayHeight(cm), viewport.top)};
        // Updated line heights might result in the drawn area not
        // actually covering the viewport. Keep looping until it does.
        update.visible = visibleLines(cm.display, cm.doc, viewport);
        if (update.visible.from >= cm.display.viewFrom && update.visible.to <= cm.display.viewTo)
          break;
      }
      if (!updateDisplayIfNeeded(cm, update)) break;
      updateHeightsInViewport(cm);
      var barMeasure = measureForScrollbars(cm);
      updateSelection(cm);
      setDocumentHeight(cm, barMeasure);
      updateScrollbars(cm, barMeasure);
    }

    update.signal(cm, "update", cm);
    if (cm.display.viewFrom != cm.display.reportedViewFrom || cm.display.viewTo != cm.display.reportedViewTo) {
      update.signal(cm, "viewportChange", cm, cm.display.viewFrom, cm.display.viewTo);
      cm.display.reportedViewFrom = cm.display.viewFrom; cm.display.reportedViewTo = cm.display.viewTo;
    }
  }

  function updateDisplaySimple(cm, viewport) {
    var update = new DisplayUpdate(cm, viewport);
    if (updateDisplayIfNeeded(cm, update)) {
      updateHeightsInViewport(cm);
      postUpdateDisplay(cm, update);
      var barMeasure = measureForScrollbars(cm);
      updateSelection(cm);
      setDocumentHeight(cm, barMeasure);
      updateScrollbars(cm, barMeasure);
      update.finish();
    }
  }

  function setDocumentHeight(cm, measure) {
    cm.display.sizer.style.minHeight = measure.docHeight + "px";
    var total = measure.docHeight + cm.display.barHeight;
    cm.display.heightForcer.style.top = total + "px";
    cm.display.gutters.style.height = Math.max(total + scrollGap(cm), measure.clientHeight) + "px";
  }

  // Read the actual heights of the rendered lines, and update their
  // stored heights to match.
  function updateHeightsInViewport(cm) {
    var display = cm.display;
    var prevBottom = display.lineDiv.offsetTop;
    for (var i = 0; i < display.view.length; i++) {
      var cur = display.view[i], height;
      if (cur.hidden) continue;
      if (ie && ie_version < 8) {
        var bot = cur.node.offsetTop + cur.node.offsetHeight;
        height = bot - prevBottom;
        prevBottom = bot;
      } else {
        var box = cur.node.getBoundingClientRect();
        height = box.bottom - box.top;
      }
      var diff = cur.line.height - height;
      if (height < 2) height = textHeight(display);
      if (diff > .001 || diff < -.001) {
        updateLineHeight(cur.line, height);
        updateWidgetHeight(cur.line);
        if (cur.rest) for (var j = 0; j < cur.rest.length; j++)
          updateWidgetHeight(cur.rest[j]);
      }
    }
  }

  // Read and store the height of line widgets associated with the
  // given line.
  function updateWidgetHeight(line) {
    if (line.widgets) for (var i = 0; i < line.widgets.length; ++i)
      line.widgets[i].height = line.widgets[i].node.offsetHeight;
  }

  // Do a bulk-read of the DOM positions and sizes needed to draw the
  // view, so that we don't interleave reading and writing to the DOM.
  function getDimensions(cm) {
    var d = cm.display, left = {}, width = {};
    var gutterLeft = d.gutters.clientLeft;
    for (var n = d.gutters.firstChild, i = 0; n; n = n.nextSibling, ++i) {
      left[cm.options.gutters[i]] = n.offsetLeft + n.clientLeft + gutterLeft;
      width[cm.options.gutters[i]] = n.clientWidth;
    }
    return {fixedPos: compensateForHScroll(d),
            gutterTotalWidth: d.gutters.offsetWidth,
            gutterLeft: left,
            gutterWidth: width,
            wrapperWidth: d.wrapper.clientWidth};
  }

  // Sync the actual display DOM structure with display.view, removing
  // nodes for lines that are no longer in view, and creating the ones
  // that are not there yet, and updating the ones that are out of
  // date.
  function patchDisplay(cm, updateNumbersFrom, dims) {
    var display = cm.display, lineNumbers = cm.options.lineNumbers;
    var container = display.lineDiv, cur = container.firstChild;

    function rm(node) {
      var next = node.nextSibling;
      // Works around a throw-scroll bug in OS X Webkit
      if (webkit && mac && cm.display.currentWheelTarget == node)
        node.style.display = "none";
      else
        node.parentNode.removeChild(node);
      return next;
    }

    var view = display.view, lineN = display.viewFrom;
    // Loop over the elements in the view, syncing cur (the DOM nodes
    // in display.lineDiv) with the view as we go.
    for (var i = 0; i < view.length; i++) {
      var lineView = view[i];
      if (lineView.hidden) {
      } else if (!lineView.node || lineView.node.parentNode != container) { // Not drawn yet
        var node = buildLineElement(cm, lineView, lineN, dims);
        container.insertBefore(node, cur);
      } else { // Already drawn
        while (cur != lineView.node) cur = rm(cur);
        var updateNumber = lineNumbers && updateNumbersFrom != null &&
          updateNumbersFrom <= lineN && lineView.lineNumber;
        if (lineView.changes) {
          if (indexOf(lineView.changes, "gutter") > -1) updateNumber = false;
          updateLineForChanges(cm, lineView, lineN, dims);
        }
        if (updateNumber) {
          removeChildren(lineView.lineNumber);
          lineView.lineNumber.appendChild(document.createTextNode(lineNumberFor(cm.options, lineN)));
        }
        cur = lineView.node.nextSibling;
      }
      lineN += lineView.size;
    }
    while (cur) cur = rm(cur);
  }

  // When an aspect of a line changes, a string is added to
  // lineView.changes. This updates the relevant part of the line's
  // DOM structure.
  function updateLineForChanges(cm, lineView, lineN, dims) {
    for (var j = 0; j < lineView.changes.length; j++) {
      var type = lineView.changes[j];
      if (type == "text") updateLineText(cm, lineView);
      else if (type == "gutter") updateLineGutter(cm, lineView, lineN, dims);
      else if (type == "class") updateLineClasses(lineView);
      else if (type == "widget") updateLineWidgets(cm, lineView, dims);
    }
    lineView.changes = null;
  }

  // Lines with gutter elements, widgets or a background class need to
  // be wrapped, and have the extra elements added to the wrapper div
  function ensureLineWrapped(lineView) {
    if (lineView.node == lineView.text) {
      lineView.node = elt("div", null, null, "position: relative");
      if (lineView.text.parentNode)
        lineView.text.parentNode.replaceChild(lineView.node, lineView.text);
      lineView.node.appendChild(lineView.text);
      if (ie && ie_version < 8) lineView.node.style.zIndex = 2;
    }
    return lineView.node;
  }

  function updateLineBackground(lineView) {
    var cls = lineView.bgClass ? lineView.bgClass + " " + (lineView.line.bgClass || "") : lineView.line.bgClass;
    if (cls) cls += " CodeMirror-linebackground";
    if (lineView.background) {
      if (cls) lineView.background.className = cls;
      else { lineView.background.parentNode.removeChild(lineView.background); lineView.background = null; }
    } else if (cls) {
      var wrap = ensureLineWrapped(lineView);
      lineView.background = wrap.insertBefore(elt("div", null, cls), wrap.firstChild);
    }
  }

  // Wrapper around buildLineContent which will reuse the structure
  // in display.externalMeasured when possible.
  function getLineContent(cm, lineView) {
    var ext = cm.display.externalMeasured;
    if (ext && ext.line == lineView.line) {
      cm.display.externalMeasured = null;
      lineView.measure = ext.measure;
      return ext.built;
    }
    return buildLineContent(cm, lineView);
  }

  // Redraw the line's text. Interacts with the background and text
  // classes because the mode may output tokens that influence these
  // classes.
  function updateLineText(cm, lineView) {
    var cls = lineView.text.className;
    var built = getLineContent(cm, lineView);
    if (lineView.text == lineView.node) lineView.node = built.pre;
    lineView.text.parentNode.replaceChild(built.pre, lineView.text);
    lineView.text = built.pre;
    if (built.bgClass != lineView.bgClass || built.textClass != lineView.textClass) {
      lineView.bgClass = built.bgClass;
      lineView.textClass = built.textClass;
      updateLineClasses(lineView);
    } else if (cls) {
      lineView.text.className = cls;
    }
  }

  function updateLineClasses(lineView) {
    updateLineBackground(lineView);
    if (lineView.line.wrapClass)
      ensureLineWrapped(lineView).className = lineView.line.wrapClass;
    else if (lineView.node != lineView.text)
      lineView.node.className = "";
    var textClass = lineView.textClass ? lineView.textClass + " " + (lineView.line.textClass || "") : lineView.line.textClass;
    lineView.text.className = textClass || "";
  }

  function updateLineGutter(cm, lineView, lineN, dims) {
    if (lineView.gutter) {
      lineView.node.removeChild(lineView.gutter);
      lineView.gutter = null;
    }
    if (lineView.gutterBackground) {
      lineView.node.removeChild(lineView.gutterBackground);
      lineView.gutterBackground = null;
    }
    if (lineView.line.gutterClass) {
      var wrap = ensureLineWrapped(lineView);
      lineView.gutterBackground = elt("div", null, "CodeMirror-gutter-background " + lineView.line.gutterClass,
                                      "left: " + (cm.options.fixedGutter ? dims.fixedPos : -dims.gutterTotalWidth) +
                                      "px; width: " + dims.gutterTotalWidth + "px");
      wrap.insertBefore(lineView.gutterBackground, lineView.text);
    }
    var markers = lineView.line.gutterMarkers;
    if (cm.options.lineNumbers || markers) {
      var wrap = ensureLineWrapped(lineView);
      var gutterWrap = lineView.gutter = elt("div", null, "CodeMirror-gutter-wrapper", "left: " +
                                             (cm.options.fixedGutter ? dims.fixedPos : -dims.gutterTotalWidth) + "px");
      cm.display.input.setUneditable(gutterWrap);
      wrap.insertBefore(gutterWrap, lineView.text);
      if (lineView.line.gutterClass)
        gutterWrap.className += " " + lineView.line.gutterClass;
      if (cm.options.lineNumbers && (!markers || !markers["CodeMirror-linenumbers"]))
        lineView.lineNumber = gutterWrap.appendChild(
          elt("div", lineNumberFor(cm.options, lineN),
              "CodeMirror-linenumber CodeMirror-gutter-elt",
              "left: " + dims.gutterLeft["CodeMirror-linenumbers"] + "px; width: "
              + cm.display.lineNumInnerWidth + "px"));
      if (markers) for (var k = 0; k < cm.options.gutters.length; ++k) {
        var id = cm.options.gutters[k], found = markers.hasOwnProperty(id) && markers[id];
        if (found)
          gutterWrap.appendChild(elt("div", [found], "CodeMirror-gutter-elt", "left: " +
                                     dims.gutterLeft[id] + "px; width: " + dims.gutterWidth[id] + "px"));
      }
    }
  }

  function updateLineWidgets(cm, lineView, dims) {
    if (lineView.alignable) lineView.alignable = null;
    for (var node = lineView.node.firstChild, next; node; node = next) {
      var next = node.nextSibling;
      if (node.className == "CodeMirror-linewidget")
        lineView.node.removeChild(node);
    }
    insertLineWidgets(cm, lineView, dims);
  }

  // Build a line's DOM representation from scratch
  function buildLineElement(cm, lineView, lineN, dims) {
    var built = getLineContent(cm, lineView);
    lineView.text = lineView.node = built.pre;
    if (built.bgClass) lineView.bgClass = built.bgClass;
    if (built.textClass) lineView.textClass = built.textClass;

    updateLineClasses(lineView);
    updateLineGutter(cm, lineView, lineN, dims);
    insertLineWidgets(cm, lineView, dims);
    return lineView.node;
  }

  // A lineView may contain multiple logical lines (when merged by
  // collapsed spans). The widgets for all of them need to be drawn.
  function insertLineWidgets(cm, lineView, dims) {
    insertLineWidgetsFor(cm, lineView.line, lineView, dims, true);
    if (lineView.rest) for (var i = 0; i < lineView.rest.length; i++)
      insertLineWidgetsFor(cm, lineView.rest[i], lineView, dims, false);
  }

  function insertLineWidgetsFor(cm, line, lineView, dims, allowAbove) {
    if (!line.widgets) return;
    var wrap = ensureLineWrapped(lineView);
    for (var i = 0, ws = line.widgets; i < ws.length; ++i) {
      var widget = ws[i], node = elt("div", [widget.node], "CodeMirror-linewidget");
      if (!widget.handleMouseEvents) node.setAttribute("cm-ignore-events", "true");
      positionLineWidget(widget, node, lineView, dims);
      cm.display.input.setUneditable(node);
      if (allowAbove && widget.above)
        wrap.insertBefore(node, lineView.gutter || lineView.text);
      else
        wrap.appendChild(node);
      signalLater(widget, "redraw");
    }
  }

  function positionLineWidget(widget, node, lineView, dims) {
    if (widget.noHScroll) {
      (lineView.alignable || (lineView.alignable = [])).push(node);
      var width = dims.wrapperWidth;
      node.style.left = dims.fixedPos + "px";
      if (!widget.coverGutter) {
        width -= dims.gutterTotalWidth;
        node.style.paddingLeft = dims.gutterTotalWidth + "px";
      }
      node.style.width = width + "px";
    }
    if (widget.coverGutter) {
      node.style.zIndex = 5;
      node.style.position = "relative";
      if (!widget.noHScroll) node.style.marginLeft = -dims.gutterTotalWidth + "px";
    }
  }

  // POSITION OBJECT

  // A Pos instance represents a position within the text.
  var Pos = CodeMirror.Pos = function(line, ch) {
    if (!(this instanceof Pos)) return new Pos(line, ch);
    this.line = line; this.ch = ch;
  };

  // Compare two positions, return 0 if they are the same, a negative
  // number when a is less, and a positive number otherwise.
  var cmp = CodeMirror.cmpPos = function(a, b) { return a.line - b.line || a.ch - b.ch; };

  function copyPos(x) {return Pos(x.line, x.ch);}
  function maxPos(a, b) { return cmp(a, b) < 0 ? b : a; }
  function minPos(a, b) { return cmp(a, b) < 0 ? a : b; }

  // INPUT HANDLING

  function ensureFocus(cm) {
    if (!cm.state.focused) { cm.display.input.focus(); onFocus(cm); }
  }

  function isReadOnly(cm) {
    return cm.options.readOnly || cm.doc.cantEdit;
  }

  // This will be set to an array of strings when copying, so that,
  // when pasting, we know what kind of selections the copied text
  // was made out of.
  var lastCopied = null;

  function applyTextInput(cm, inserted, deleted, sel, origin) {
    var doc = cm.doc;
    cm.display.shift = false;
    if (!sel) sel = doc.sel;

    var paste = cm.state.pasteIncoming || origin == "paste";
    var textLines = doc.splitLines(inserted), multiPaste = null;
    // When pasing N lines into N selections, insert one line per selection
    if (paste && sel.ranges.length > 1) {
      if (lastCopied && lastCopied.join("\n") == inserted) {
        if (sel.ranges.length % lastCopied.length == 0) {
          multiPaste = [];
          for (var i = 0; i < lastCopied.length; i++)
            multiPaste.push(doc.splitLines(lastCopied[i]));
        }
      } else if (textLines.length == sel.ranges.length) {
        multiPaste = map(textLines, function(l) { return [l]; });
      }
    }

    // Normal behavior is to insert the new text into every selection
    for (var i = sel.ranges.length - 1; i >= 0; i--) {
      var range = sel.ranges[i];
      var from = range.from(), to = range.to();
      if (range.empty()) {
        if (deleted && deleted > 0) // Handle deletion
          from = Pos(from.line, from.ch - deleted);
        else if (cm.state.overwrite && !paste) // Handle overwrite
          to = Pos(to.line, Math.min(getLine(doc, to.line).text.length, to.ch + lst(textLines).length));
      }
      var updateInput = cm.curOp.updateInput;
      var changeEvent = {from: from, to: to, text: multiPaste ? multiPaste[i % multiPaste.length] : textLines,
                         origin: origin || (paste ? "paste" : cm.state.cutIncoming ? "cut" : "+input")};
      makeChange(cm.doc, changeEvent);
      signalLater(cm, "inputRead", cm, changeEvent);
    }
    if (inserted && !paste)
      triggerElectric(cm, inserted);

    ensureCursorVisible(cm);
    cm.curOp.updateInput = updateInput;
    cm.curOp.typing = true;
    cm.state.pasteIncoming = cm.state.cutIncoming = false;
  }

  function handlePaste(e, cm) {
    var pasted = e.clipboardData && e.clipboardData.getData("text/plain");
    if (pasted) {
      e.preventDefault();
      runInOp(cm, function() { applyTextInput(cm, pasted, 0, null, "paste"); });
      return true;
    }
  }

  function triggerElectric(cm, inserted) {
    // When an 'electric' character is inserted, immediately trigger a reindent
    if (!cm.options.electricChars || !cm.options.smartIndent) return;
    var sel = cm.doc.sel;

    for (var i = sel.ranges.length - 1; i >= 0; i--) {
      var range = sel.ranges[i];
      if (range.head.ch > 100 || (i && sel.ranges[i - 1].head.line == range.head.line)) continue;
      var mode = cm.getModeAt(range.head);
      var indented = false;
      if (mode.electricChars) {
        for (var j = 0; j < mode.electricChars.length; j++)
          if (inserted.indexOf(mode.electricChars.charAt(j)) > -1) {
            indented = indentLine(cm, range.head.line, "smart");
            break;
          }
      } else if (mode.electricInput) {
        if (mode.electricInput.test(getLine(cm.doc, range.head.line).text.slice(0, range.head.ch)))
          indented = indentLine(cm, range.head.line, "smart");
      }
      if (indented) signalLater(cm, "electricInput", cm, range.head.line);
    }
  }

  function copyableRanges(cm) {
    var text = [], ranges = [];
    for (var i = 0; i < cm.doc.sel.ranges.length; i++) {
      var line = cm.doc.sel.ranges[i].head.line;
      var lineRange = {anchor: Pos(line, 0), head: Pos(line + 1, 0)};
      ranges.push(lineRange);
      text.push(cm.getRange(lineRange.anchor, lineRange.head));
    }
    return {text: text, ranges: ranges};
  }

  function disableBrowserMagic(field) {
    field.setAttribute("autocorrect", "off");
    field.setAttribute("autocapitalize", "off");
    field.setAttribute("spellcheck", "false");
  }

  // TEXTAREA INPUT STYLE

  function TextareaInput(cm) {
    this.cm = cm;
    // See input.poll and input.reset
    this.prevInput = "";

    // Flag that indicates whether we expect input to appear real soon
    // now (after some event like 'keypress' or 'input') and are
    // polling intensively.
    this.pollingFast = false;
    // Self-resetting timeout for the poller
    this.polling = new Delayed();
    // Tracks when input.reset has punted to just putting a short
    // string into the textarea instead of the full selection.
    this.inaccurateSelection = false;
    // Used to work around IE issue with selection being forgotten when focus moves away from textarea
    this.hasSelection = false;
    this.composing = null;
  };

  function hiddenTextarea() {
    var te = elt("textarea", null, null, "position: absolute; padding: 0; width: 1px; height: 1em; outline: none");
    var div = elt("div", [te], null, "overflow: hidden; position: relative; width: 3px; height: 0px;");
    // The textarea is kept positioned near the cursor to prevent the
    // fact that it'll be scrolled into view on input from scrolling
    // our fake cursor out of view. On webkit, when wrap=off, paste is
    // very slow. So make the area wide instead.
    if (webkit) te.style.width = "1000px";
    else te.setAttribute("wrap", "off");
    // If border: 0; -- iOS fails to open keyboard (issue #1287)
    if (ios) te.style.border = "1px solid black";
    disableBrowserMagic(te);
    return div;
  }

  TextareaInput.prototype = copyObj({
    init: function(display) {
      var input = this, cm = this.cm;

      // Wraps and hides input textarea
      var div = this.wrapper = hiddenTextarea();
      // The semihidden textarea that is focused when the editor is
      // focused, and receives input.
      var te = this.textarea = div.firstChild;
      display.wrapper.insertBefore(div, display.wrapper.firstChild);

      // Needed to hide big blue blinking cursor on Mobile Safari (doesn't seem to work in iOS 8 anymore)
      if (ios) te.style.width = "0px";

      on(te, "input", function() {
        if (ie && ie_version >= 9 && input.hasSelection) input.hasSelection = null;
        input.poll();
      });

      on(te, "paste", function(e) {
        if (handlePaste(e, cm)) return true;

        cm.state.pasteIncoming = true;
        input.fastPoll();
      });

      function prepareCopyCut(e) {
        if (cm.somethingSelected()) {
          lastCopied = cm.getSelections();
          if (input.inaccurateSelection) {
            input.prevInput = "";
            input.inaccurateSelection = false;
            te.value = lastCopied.join("\n");
            selectInput(te);
          }
        } else if (!cm.options.lineWiseCopyCut) {
          return;
        } else {
          var ranges = copyableRanges(cm);
          lastCopied = ranges.text;
          if (e.type == "cut") {
            cm.setSelections(ranges.ranges, null, sel_dontScroll);
          } else {
            input.prevInput = "";
            te.value = ranges.text.join("\n");
            selectInput(te);
          }
        }
        if (e.type == "cut") cm.state.cutIncoming = true;
      }
      on(te, "cut", prepareCopyCut);
      on(te, "copy", prepareCopyCut);

      on(display.scroller, "paste", function(e) {
        if (eventInWidget(display, e)) return;
        cm.state.pasteIncoming = true;
        input.focus();
      });

      // Prevent normal selection in the editor (we handle our own)
      on(display.lineSpace, "selectstart", function(e) {
        if (!eventInWidget(display, e)) e_preventDefault(e);
      });

      on(te, "compositionstart", function() {
        var start = cm.getCursor("from");
        input.composing = {
          start: start,
          range: cm.markText(start, cm.getCursor("to"), {className: "CodeMirror-composing"})
        };
      });
      on(te, "compositionend", function() {
        if (input.composing) {
          input.poll();
          input.composing.range.clear();
          input.composing = null;
        }
      });
    },

    prepareSelection: function() {
      // Redraw the selection and/or cursor
      var cm = this.cm, display = cm.display, doc = cm.doc;
      var result = prepareSelection(cm);

      // Move the hidden textarea near the cursor to prevent scrolling artifacts
      if (cm.options.moveInputWithCursor) {
        var headPos = cursorCoords(cm, doc.sel.primary().head, "div");
        var wrapOff = display.wrapper.getBoundingClientRect(), lineOff = display.lineDiv.getBoundingClientRect();
        result.teTop = Math.max(0, Math.min(display.wrapper.clientHeight - 10,
                                            headPos.top + lineOff.top - wrapOff.top));
        result.teLeft = Math.max(0, Math.min(display.wrapper.clientWidth - 10,
                                             headPos.left + lineOff.left - wrapOff.left));
      }

      return result;
    },

    showSelection: function(drawn) {
      var cm = this.cm, display = cm.display;
      removeChildrenAndAdd(display.cursorDiv, drawn.cursors);
      removeChildrenAndAdd(display.selectionDiv, drawn.selection);
      if (drawn.teTop != null) {
        this.wrapper.style.top = drawn.teTop + "px";
        this.wrapper.style.left = drawn.teLeft + "px";
      }
    },

    // Reset the input to correspond to the selection (or to be empty,
    // when not typing and nothing is selected)
    reset: function(typing) {
      if (this.contextMenuPending) return;
      var minimal, selected, cm = this.cm, doc = cm.doc;
      if (cm.somethingSelected()) {
        this.prevInput = "";
        var range = doc.sel.primary();
        minimal = hasCopyEvent &&
          (range.to().line - range.from().line > 100 || (selected = cm.getSelection()).length > 1000);
        var content = minimal ? "-" : selected || cm.getSelection();
        this.textarea.value = content;
        if (cm.state.focused) selectInput(this.textarea);
        if (ie && ie_version >= 9) this.hasSelection = content;
      } else if (!typing) {
        this.prevInput = this.textarea.value = "";
        if (ie && ie_version >= 9) this.hasSelection = null;
      }
      this.inaccurateSelection = minimal;
    },

    getField: function() { return this.textarea; },

    supportsTouch: function() { return false; },

    focus: function() {
      if (this.cm.options.readOnly != "nocursor" && (!mobile || activeElt() != this.textarea)) {
        try { this.textarea.focus(); }
        catch (e) {} // IE8 will throw if the textarea is display: none or not in DOM
      }
    },

    blur: function() { this.textarea.blur(); },

    resetPosition: function() {
      this.wrapper.style.top = this.wrapper.style.left = 0;
    },

    receivedFocus: function() { this.slowPoll(); },

    // Poll for input changes, using the normal rate of polling. This
    // runs as long as the editor is focused.
    slowPoll: function() {
      var input = this;
      if (input.pollingFast) return;
      input.polling.set(this.cm.options.pollInterval, function() {
        input.poll();
        if (input.cm.state.focused) input.slowPoll();
      });
    },

    // When an event has just come in that is likely to add or change
    // something in the input textarea, we poll faster, to ensure that
    // the change appears on the screen quickly.
    fastPoll: function() {
      var missed = false, input = this;
      input.pollingFast = true;
      function p() {
        var changed = input.poll();
        if (!changed && !missed) {missed = true; input.polling.set(60, p);}
        else {input.pollingFast = false; input.slowPoll();}
      }
      input.polling.set(20, p);
    },

    // Read input from the textarea, and update the document to match.
    // When something is selected, it is present in the textarea, and
    // selected (unless it is huge, in which case a placeholder is
    // used). When nothing is selected, the cursor sits after previously
    // seen text (can be empty), which is stored in prevInput (we must
    // not reset the textarea when typing, because that breaks IME).
    poll: function() {
      var cm = this.cm, input = this.textarea, prevInput = this.prevInput;
      // Since this is called a *lot*, try to bail out as cheaply as
      // possible when it is clear that nothing happened. hasSelection
      // will be the case when there is a lot of text in the textarea,
      // in which case reading its value would be expensive.
      if (this.contextMenuPending || !cm.state.focused ||
          (hasSelection(input) && !prevInput && !this.composing) ||
          isReadOnly(cm) || cm.options.disableInput || cm.state.keySeq)
        return false;

      var text = input.value;
      // If nothing changed, bail.
      if (text == prevInput && !cm.somethingSelected()) return false;
      // Work around nonsensical selection resetting in IE9/10, and
      // inexplicable appearance of private area unicode characters on
      // some key combos in Mac (#2689).
      if (ie && ie_version >= 9 && this.hasSelection === text ||
          mac && /[\uf700-\uf7ff]/.test(text)) {
        cm.display.input.reset();
        return false;
      }

      if (cm.doc.sel == cm.display.selForContextMenu) {
        var first = text.charCodeAt(0);
        if (first == 0x200b && !prevInput) prevInput = "\u200b";
        if (first == 0x21da) { this.reset(); return this.cm.execCommand("undo"); }
      }
      // Find the part of the input that is actually new
      var same = 0, l = Math.min(prevInput.length, text.length);
      while (same < l && prevInput.charCodeAt(same) == text.charCodeAt(same)) ++same;

      var self = this;
      runInOp(cm, function() {
        applyTextInput(cm, text.slice(same), prevInput.length - same,
                       null, self.composing ? "*compose" : null);

        // Don't leave long text in the textarea, since it makes further polling slow
        if (text.length > 1000 || text.indexOf("\n") > -1) input.value = self.prevInput = "";
        else self.prevInput = text;

        if (self.composing) {
          self.composing.range.clear();
          self.composing.range = cm.markText(self.composing.start, cm.getCursor("to"),
                                             {className: "CodeMirror-composing"});
        }
      });
      return true;
    },

    ensurePolled: function() {
      if (this.pollingFast && this.poll()) this.pollingFast = false;
    },

    onKeyPress: function() {
      if (ie && ie_version >= 9) this.hasSelection = null;
      this.fastPoll();
    },

    onContextMenu: function(e) {
      var input = this, cm = input.cm, display = cm.display, te = input.textarea;
      var pos = posFromMouse(cm, e), scrollPos = display.scroller.scrollTop;
      if (!pos || presto) return; // Opera is difficult.

      // Reset the current text selection only if the click is done outside of the selection
      // and 'resetSelectionOnContextMenu' option is true.
      var reset = cm.options.resetSelectionOnContextMenu;
      if (reset && cm.doc.sel.contains(pos) == -1)
        operation(cm, setSelection)(cm.doc, simpleSelection(pos), sel_dontScroll);

      var oldCSS = te.style.cssText;
      input.wrapper.style.position = "absolute";
      te.style.cssText = "position: fixed; width: 30px; height: 30px; top: " + (e.clientY - 5) +
        "px; left: " + (e.clientX - 5) + "px; z-index: 1000; background: " +
        (ie ? "rgba(255, 255, 255, .05)" : "transparent") +
        "; outline: none; border-width: 0; outline: none; overflow: hidden; opacity: .05; filter: alpha(opacity=5);";
      if (webkit) var oldScrollY = window.scrollY; // Work around Chrome issue (#2712)
      display.input.focus();
      if (webkit) window.scrollTo(null, oldScrollY);
      display.input.reset();
      // Adds "Select all" to context menu in FF
      if (!cm.somethingSelected()) te.value = input.prevInput = " ";
      input.contextMenuPending = true;
      display.selForContextMenu = cm.doc.sel;
      clearTimeout(display.detectingSelectAll);

      // Select-all will be greyed out if there's nothing to select, so
      // this adds a zero-width space so that we can later check whether
      // it got selected.
      function prepareSelectAllHack() {
        if (te.selectionStart != null) {
          var selected = cm.somethingSelected();
          var extval = "\u200b" + (selected ? te.value : "");
          te.value = "\u21da"; // Used to catch context-menu undo
          te.value = extval;
          input.prevInput = selected ? "" : "\u200b";
          te.selectionStart = 1; te.selectionEnd = extval.length;
          // Re-set this, in case some other handler touched the
          // selection in the meantime.
          display.selForContextMenu = cm.doc.sel;
        }
      }
      function rehide() {
        input.contextMenuPending = false;
        input.wrapper.style.position = "relative";
        te.style.cssText = oldCSS;
        if (ie && ie_version < 9) display.scrollbars.setScrollTop(display.scroller.scrollTop = scrollPos);

        // Try to detect the user choosing select-all
        if (te.selectionStart != null) {
          if (!ie || (ie && ie_version < 9)) prepareSelectAllHack();
          var i = 0, poll = function() {
            if (display.selForContextMenu == cm.doc.sel && te.selectionStart == 0 &&
                te.selectionEnd > 0 && input.prevInput == "\u200b")
              operation(cm, commands.selectAll)(cm);
            else if (i++ < 10) display.detectingSelectAll = setTimeout(poll, 500);
            else display.input.reset();
          };
          display.detectingSelectAll = setTimeout(poll, 200);
        }
      }

      if (ie && ie_version >= 9) prepareSelectAllHack();
      if (captureRightClick) {
        e_stop(e);
        var mouseup = function() {
          off(window, "mouseup", mouseup);
          setTimeout(rehide, 20);
        };
        on(window, "mouseup", mouseup);
      } else {
        setTimeout(rehide, 50);
      }
    },

    setUneditable: nothing,

    needsContentAttribute: false
  }, TextareaInput.prototype);

  // CONTENTEDITABLE INPUT STYLE

  function ContentEditableInput(cm) {
    this.cm = cm;
    this.lastAnchorNode = this.lastAnchorOffset = this.lastFocusNode = this.lastFocusOffset = null;
    this.polling = new Delayed();
    this.gracePeriod = false;
  }

  ContentEditableInput.prototype = copyObj({
    init: function(display) {
      var input = this, cm = input.cm;
      var div = input.div = display.lineDiv;
      div.contentEditable = "true";
      disableBrowserMagic(div);

      on(div, "paste", function(e) { handlePaste(e, cm); })

      on(div, "compositionstart", function(e) {
        var data = e.data;
        input.composing = {sel: cm.doc.sel, data: data, startData: data};
        if (!data) return;
        var prim = cm.doc.sel.primary();
        var line = cm.getLine(prim.head.line);
        var found = line.indexOf(data, Math.max(0, prim.head.ch - data.length));
        if (found > -1 && found <= prim.head.ch)
          input.composing.sel = simpleSelection(Pos(prim.head.line, found),
                                                Pos(prim.head.line, found + data.length));
      });
      on(div, "compositionupdate", function(e) {
        input.composing.data = e.data;
      });
      on(div, "compositionend", function(e) {
        var ours = input.composing;
        if (!ours) return;
        if (e.data != ours.startData && !/\u200b/.test(e.data))
          ours.data = e.data;
        // Need a small delay to prevent other code (input event,
        // selection polling) from doing damage when fired right after
        // compositionend.
        setTimeout(function() {
          if (!ours.handled)
            input.applyComposition(ours);
          if (input.composing == ours)
            input.composing = null;
        }, 50);
      });

      on(div, "touchstart", function() {
        input.forceCompositionEnd();
      });

      on(div, "input", function() {
        if (input.composing) return;
        if (!input.pollContent())
          runInOp(input.cm, function() {regChange(cm);});
      });

      function onCopyCut(e) {
        if (cm.somethingSelected()) {
          lastCopied = cm.getSelections();
          if (e.type == "cut") cm.replaceSelection("", null, "cut");
        } else if (!cm.options.lineWiseCopyCut) {
          return;
        } else {
          var ranges = copyableRanges(cm);
          lastCopied = ranges.text;
          if (e.type == "cut") {
            cm.operation(function() {
              cm.setSelections(ranges.ranges, 0, sel_dontScroll);
              cm.replaceSelection("", null, "cut");
            });
          }
        }
        // iOS exposes the clipboard API, but seems to discard content inserted into it
        if (e.clipboardData && !ios) {
          e.preventDefault();
          e.clipboardData.clearData();
          e.clipboardData.setData("text/plain", lastCopied.join("\n"));
        } else {
          // Old-fashioned briefly-focus-a-textarea hack
          var kludge = hiddenTextarea(), te = kludge.firstChild;
          cm.display.lineSpace.insertBefore(kludge, cm.display.lineSpace.firstChild);
          te.value = lastCopied.join("\n");
          var hadFocus = document.activeElement;
          selectInput(te);
          setTimeout(function() {
            cm.display.lineSpace.removeChild(kludge);
            hadFocus.focus();
          }, 50);
        }
      }
      on(div, "copy", onCopyCut);
      on(div, "cut", onCopyCut);
    },

    prepareSelection: function() {
      var result = prepareSelection(this.cm, false);
      result.focus = this.cm.state.focused;
      return result;
    },

    showSelection: function(info) {
      if (!info || !this.cm.display.view.length) return;
      if (info.focus) this.showPrimarySelection();
      this.showMultipleSelections(info);
    },

    showPrimarySelection: function() {
      var sel = window.getSelection(), prim = this.cm.doc.sel.primary();
      var curAnchor = domToPos(this.cm, sel.anchorNode, sel.anchorOffset);
      var curFocus = domToPos(this.cm, sel.focusNode, sel.focusOffset);
      if (curAnchor && !curAnchor.bad && curFocus && !curFocus.bad &&
          cmp(minPos(curAnchor, curFocus), prim.from()) == 0 &&
          cmp(maxPos(curAnchor, curFocus), prim.to()) == 0)
        return;

      var start = posToDOM(this.cm, prim.from());
      var end = posToDOM(this.cm, prim.to());
      if (!start && !end) return;

      var view = this.cm.display.view;
      var old = sel.rangeCount && sel.getRangeAt(0);
      if (!start) {
        start = {node: view[0].measure.map[2], offset: 0};
      } else if (!end) { // FIXME dangerously hacky
        var measure = view[view.length - 1].measure;
        var map = measure.maps ? measure.maps[measure.maps.length - 1] : measure.map;
        end = {node: map[map.length - 1], offset: map[map.length - 2] - map[map.length - 3]};
      }

      try { var rng = range(start.node, start.offset, end.offset, end.node); }
      catch(e) {} // Our model of the DOM might be outdated, in which case the range we try to set can be impossible
      if (rng) {
        sel.removeAllRanges();
        sel.addRange(rng);
        if (old && sel.anchorNode == null) sel.addRange(old);
        else if (gecko) this.startGracePeriod();
      }
      this.rememberSelection();
    },

    startGracePeriod: function() {
      var input = this;
      clearTimeout(this.gracePeriod);
      this.gracePeriod = setTimeout(function() {
        input.gracePeriod = false;
        if (input.selectionChanged())
          input.cm.operation(function() { input.cm.curOp.selectionChanged = true; });
      }, 20);
    },

    showMultipleSelections: function(info) {
      removeChildrenAndAdd(this.cm.display.cursorDiv, info.cursors);
      removeChildrenAndAdd(this.cm.display.selectionDiv, info.selection);
    },

    rememberSelection: function() {
      var sel = window.getSelection();
      this.lastAnchorNode = sel.anchorNode; this.lastAnchorOffset = sel.anchorOffset;
      this.lastFocusNode = sel.focusNode; this.lastFocusOffset = sel.focusOffset;
    },

    selectionInEditor: function() {
      var sel = window.getSelection();
      if (!sel.rangeCount) return false;
      var node = sel.getRangeAt(0).commonAncestorContainer;
      return contains(this.div, node);
    },

    focus: function() {
      if (this.cm.options.readOnly != "nocursor") this.div.focus();
    },
    blur: function() { this.div.blur(); },
    getField: function() { return this.div; },

    supportsTouch: function() { return true; },

    receivedFocus: function() {
      var input = this;
      if (this.selectionInEditor())
        this.pollSelection();
      else
        runInOp(this.cm, function() { input.cm.curOp.selectionChanged = true; });

      function poll() {
        if (input.cm.state.focused) {
          input.pollSelection();
          input.polling.set(input.cm.options.pollInterval, poll);
        }
      }
      this.polling.set(this.cm.options.pollInterval, poll);
    },

    selectionChanged: function() {
      var sel = window.getSelection();
      return sel.anchorNode != this.lastAnchorNode || sel.anchorOffset != this.lastAnchorOffset ||
        sel.focusNode != this.lastFocusNode || sel.focusOffset != this.lastFocusOffset;
    },

    pollSelection: function() {
      if (!this.composing && !this.gracePeriod && this.selectionChanged()) {
        var sel = window.getSelection(), cm = this.cm;
        this.rememberSelection();
        var anchor = domToPos(cm, sel.anchorNode, sel.anchorOffset);
        var head = domToPos(cm, sel.focusNode, sel.focusOffset);
        if (anchor && head) runInOp(cm, function() {
          setSelection(cm.doc, simpleSelection(anchor, head), sel_dontScroll);
          if (anchor.bad || head.bad) cm.curOp.selectionChanged = true;
        });
      }
    },

    pollContent: function() {
      var cm = this.cm, display = cm.display, sel = cm.doc.sel.primary();
      var from = sel.from(), to = sel.to();
      if (from.line < display.viewFrom || to.line > display.viewTo - 1) return false;

      var fromIndex;
      if (from.line == display.viewFrom || (fromIndex = findViewIndex(cm, from.line)) == 0) {
        var fromLine = lineNo(display.view[0].line);
        var fromNode = display.view[0].node;
      } else {
        var fromLine = lineNo(display.view[fromIndex].line);
        var fromNode = display.view[fromIndex - 1].node.nextSibling;
      }
      var toIndex = findViewIndex(cm, to.line);
      if (toIndex == display.view.length - 1) {
        var toLine = display.viewTo - 1;
        var toNode = display.lineDiv.lastChild;
      } else {
        var toLine = lineNo(display.view[toIndex + 1].line) - 1;
        var toNode = display.view[toIndex + 1].node.previousSibling;
      }

      var newText = cm.doc.splitLines(domTextBetween(cm, fromNode, toNode, fromLine, toLine));
      var oldText = getBetween(cm.doc, Pos(fromLine, 0), Pos(toLine, getLine(cm.doc, toLine).text.length));
      while (newText.length > 1 && oldText.length > 1) {
        if (lst(newText) == lst(oldText)) { newText.pop(); oldText.pop(); toLine--; }
        else if (newText[0] == oldText[0]) { newText.shift(); oldText.shift(); fromLine++; }
        else break;
      }

      var cutFront = 0, cutEnd = 0;
      var newTop = newText[0], oldTop = oldText[0], maxCutFront = Math.min(newTop.length, oldTop.length);
      while (cutFront < maxCutFront && newTop.charCodeAt(cutFront) == oldTop.charCodeAt(cutFront))
        ++cutFront;
      var newBot = lst(newText), oldBot = lst(oldText);
      var maxCutEnd = Math.min(newBot.length - (newText.length == 1 ? cutFront : 0),
                               oldBot.length - (oldText.length == 1 ? cutFront : 0));
      while (cutEnd < maxCutEnd &&
             newBot.charCodeAt(newBot.length - cutEnd - 1) == oldBot.charCodeAt(oldBot.length - cutEnd - 1))
        ++cutEnd;

      newText[newText.length - 1] = newBot.slice(0, newBot.length - cutEnd);
      newText[0] = newText[0].slice(cutFront);

      var chFrom = Pos(fromLine, cutFront);
      var chTo = Pos(toLine, oldText.length ? lst(oldText).length - cutEnd : 0);
      if (newText.length > 1 || newText[0] || cmp(chFrom, chTo)) {
        replaceRange(cm.doc, newText, chFrom, chTo, "+input");
        return true;
      }
    },

    ensurePolled: function() {
      this.forceCompositionEnd();
    },
    reset: function() {
      this.forceCompositionEnd();
    },
    forceCompositionEnd: function() {
      if (!this.composing || this.composing.handled) return;
      this.applyComposition(this.composing);
      this.composing.handled = true;
      this.div.blur();
      this.div.focus();
    },
    applyComposition: function(composing) {
      if (composing.data && composing.data != composing.startData)
        operation(this.cm, applyTextInput)(this.cm, composing.data, 0, composing.sel);
    },

    setUneditable: function(node) {
      node.setAttribute("contenteditable", "false");
    },

    onKeyPress: function(e) {
      e.preventDefault();
      operation(this.cm, applyTextInput)(this.cm, String.fromCharCode(e.charCode == null ? e.keyCode : e.charCode), 0);
    },

    onContextMenu: nothing,
    resetPosition: nothing,

    needsContentAttribute: true
  }, ContentEditableInput.prototype);

  function posToDOM(cm, pos) {
    var view = findViewForLine(cm, pos.line);
    if (!view || view.hidden) return null;
    var line = getLine(cm.doc, pos.line);
    var info = mapFromLineView(view, line, pos.line);

    var order = getOrder(line), side = "left";
    if (order) {
      var partPos = getBidiPartAt(order, pos.ch);
      side = partPos % 2 ? "right" : "left";
    }
    var result = nodeAndOffsetInLineMap(info.map, pos.ch, side);
    result.offset = result.collapse == "right" ? result.end : result.start;
    return result;
  }

  function badPos(pos, bad) { if (bad) pos.bad = true; return pos; }

  function domToPos(cm, node, offset) {
    var lineNode;
    if (node == cm.display.lineDiv) {
      lineNode = cm.display.lineDiv.childNodes[offset];
      if (!lineNode) return badPos(cm.clipPos(Pos(cm.display.viewTo - 1)), true);
      node = null; offset = 0;
    } else {
      for (lineNode = node;; lineNode = lineNode.parentNode) {
        if (!lineNode || lineNode == cm.display.lineDiv) return null;
        if (lineNode.parentNode && lineNode.parentNode == cm.display.lineDiv) break;
      }
    }
    for (var i = 0; i < cm.display.view.length; i++) {
      var lineView = cm.display.view[i];
      if (lineView.node == lineNode)
        return locateNodeInLineView(lineView, node, offset);
    }
  }

  function locateNodeInLineView(lineView, node, offset) {
    var wrapper = lineView.text.firstChild, bad = false;
    if (!node || !contains(wrapper, node)) return badPos(Pos(lineNo(lineView.line), 0), true);
    if (node == wrapper) {
      bad = true;
      node = wrapper.childNodes[offset];
      offset = 0;
      if (!node) {
        var line = lineView.rest ? lst(lineView.rest) : lineView.line;
        return badPos(Pos(lineNo(line), line.text.length), bad);
      }
    }

    var textNode = node.nodeType == 3 ? node : null, topNode = node;
    if (!textNode && node.childNodes.length == 1 && node.firstChild.nodeType == 3) {
      textNode = node.firstChild;
      if (offset) offset = textNode.nodeValue.length;
    }
    while (topNode.parentNode != wrapper) topNode = topNode.parentNode;
    var measure = lineView.measure, maps = measure.maps;

    function find(textNode, topNode, offset) {
      for (var i = -1; i < (maps ? maps.length : 0); i++) {
        var map = i < 0 ? measure.map : maps[i];
        for (var j = 0; j < map.length; j += 3) {
          var curNode = map[j + 2];
          if (curNode == textNode || curNode == topNode) {
            var line = lineNo(i < 0 ? lineView.line : lineView.rest[i]);
            var ch = map[j] + offset;
            if (offset < 0 || curNode != textNode) ch = map[j + (offset ? 1 : 0)];
            return Pos(line, ch);
          }
        }
      }
    }
    var found = find(textNode, topNode, offset);
    if (found) return badPos(found, bad);

    // FIXME this is all really shaky. might handle the few cases it needs to handle, but likely to cause problems
    for (var after = topNode.nextSibling, dist = textNode ? textNode.nodeValue.length - offset : 0; after; after = after.nextSibling) {
      found = find(after, after.firstChild, 0);
      if (found)
        return badPos(Pos(found.line, found.ch - dist), bad);
      else
        dist += after.textContent.length;
    }
    for (var before = topNode.previousSibling, dist = offset; before; before = before.previousSibling) {
      found = find(before, before.firstChild, -1);
      if (found)
        return badPos(Pos(found.line, found.ch + dist), bad);
      else
        dist += after.textContent.length;
    }
  }

  function domTextBetween(cm, from, to, fromLine, toLine) {
    var text = "", closing = false, lineSep = cm.doc.lineSeparator();
    function recognizeMarker(id) { return function(marker) { return marker.id == id; }; }
    function walk(node) {
      if (node.nodeType == 1) {
        var cmText = node.getAttribute("cm-text");
        if (cmText != null) {
          if (cmText == "") cmText = node.textContent.replace(/\u200b/g, "");
          text += cmText;
          return;
        }
        var markerID = node.getAttribute("cm-marker"), range;
        if (markerID) {
          var found = cm.findMarks(Pos(fromLine, 0), Pos(toLine + 1, 0), recognizeMarker(+markerID));
          if (found.length && (range = found[0].find()))
            text += getBetween(cm.doc, range.from, range.to).join(lineSep);
          return;
        }
        if (node.getAttribute("contenteditable") == "false") return;
        for (var i = 0; i < node.childNodes.length; i++)
          walk(node.childNodes[i]);
        if (/^(pre|div|p)$/i.test(node.nodeName))
          closing = true;
      } else if (node.nodeType == 3) {
        var val = node.nodeValue;
        if (!val) return;
        if (closing) {
          text += lineSep;
          closing = false;
        }
        text += val;
      }
    }
    for (;;) {
      walk(from);
      if (from == to) break;
      from = from.nextSibling;
    }
    return text;
  }

  CodeMirror.inputStyles = {"textarea": TextareaInput, "contenteditable": ContentEditableInput};

  // SELECTION / CURSOR

  // Selection objects are immutable. A new one is created every time
  // the selection changes. A selection is one or more non-overlapping
  // (and non-touching) ranges, sorted, and an integer that indicates
  // which one is the primary selection (the one that's scrolled into
  // view, that getCursor returns, etc).
  function Selection(ranges, primIndex) {
    this.ranges = ranges;
    this.primIndex = primIndex;
  }

  Selection.prototype = {
    primary: function() { return this.ranges[this.primIndex]; },
    equals: function(other) {
      if (other == this) return true;
      if (other.primIndex != this.primIndex || other.ranges.length != this.ranges.length) return false;
      for (var i = 0; i < this.ranges.length; i++) {
        var here = this.ranges[i], there = other.ranges[i];
        if (cmp(here.anchor, there.anchor) != 0 || cmp(here.head, there.head) != 0) return false;
      }
      return true;
    },
    deepCopy: function() {
      for (var out = [], i = 0; i < this.ranges.length; i++)
        out[i] = new Range(copyPos(this.ranges[i].anchor), copyPos(this.ranges[i].head));
      return new Selection(out, this.primIndex);
    },
    somethingSelected: function() {
      for (var i = 0; i < this.ranges.length; i++)
        if (!this.ranges[i].empty()) return true;
      return false;
    },
    contains: function(pos, end) {
      if (!end) end = pos;
      for (var i = 0; i < this.ranges.length; i++) {
        var range = this.ranges[i];
        if (cmp(end, range.from()) >= 0 && cmp(pos, range.to()) <= 0)
          return i;
      }
      return -1;
    }
  };

  function Range(anchor, head) {
    this.anchor = anchor; this.head = head;
  }

  Range.prototype = {
    from: function() { return minPos(this.anchor, this.head); },
    to: function() { return maxPos(this.anchor, this.head); },
    empty: function() {
      return this.head.line == this.anchor.line && this.head.ch == this.anchor.ch;
    }
  };

  // Take an unsorted, potentially overlapping set of ranges, and
  // build a selection out of it. 'Consumes' ranges array (modifying
  // it).
  function normalizeSelection(ranges, primIndex) {
    var prim = ranges[primIndex];
    ranges.sort(function(a, b) { return cmp(a.from(), b.from()); });
    primIndex = indexOf(ranges, prim);
    for (var i = 1; i < ranges.length; i++) {
      var cur = ranges[i], prev = ranges[i - 1];
      if (cmp(prev.to(), cur.from()) >= 0) {
        var from = minPos(prev.from(), cur.from()), to = maxPos(prev.to(), cur.to());
        var inv = prev.empty() ? cur.from() == cur.head : prev.from() == prev.head;
        if (i <= primIndex) --primIndex;
        ranges.splice(--i, 2, new Range(inv ? to : from, inv ? from : to));
      }
    }
    return new Selection(ranges, primIndex);
  }

  function simpleSelection(anchor, head) {
    return new Selection([new Range(anchor, head || anchor)], 0);
  }

  // Most of the external API clips given positions to make sure they
  // actually exist within the document.
  function clipLine(doc, n) {return Math.max(doc.first, Math.min(n, doc.first + doc.size - 1));}
  function clipPos(doc, pos) {
    if (pos.line < doc.first) return Pos(doc.first, 0);
    var last = doc.first + doc.size - 1;
    if (pos.line > last) return Pos(last, getLine(doc, last).text.length);
    return clipToLen(pos, getLine(doc, pos.line).text.length);
  }
  function clipToLen(pos, linelen) {
    var ch = pos.ch;
    if (ch == null || ch > linelen) return Pos(pos.line, linelen);
    else if (ch < 0) return Pos(pos.line, 0);
    else return pos;
  }
  function isLine(doc, l) {return l >= doc.first && l < doc.first + doc.size;}
  function clipPosArray(doc, array) {
    for (var out = [], i = 0; i < array.length; i++) out[i] = clipPos(doc, array[i]);
    return out;
  }

  // SELECTION UPDATES

  // The 'scroll' parameter given to many of these indicated whether
  // the new cursor position should be scrolled into view after
  // modifying the selection.

  // If shift is held or the extend flag is set, extends a range to
  // include a given position (and optionally a second position).
  // Otherwise, simply returns the range between the given positions.
  // Used for cursor motion and such.
  function extendRange(doc, range, head, other) {
    if (doc.cm && doc.cm.display.shift || doc.extend) {
      var anchor = range.anchor;
      if (other) {
        var posBefore = cmp(head, anchor) < 0;
        if (posBefore != (cmp(other, anchor) < 0)) {
          anchor = head;
          head = other;
        } else if (posBefore != (cmp(head, other) < 0)) {
          head = other;
        }
      }
      return new Range(anchor, head);
    } else {
      return new Range(other || head, head);
    }
  }

  // Extend the primary selection range, discard the rest.
  function extendSelection(doc, head, other, options) {
    setSelection(doc, new Selection([extendRange(doc, doc.sel.primary(), head, other)], 0), options);
  }

  // Extend all selections (pos is an array of selections with length
  // equal the number of selections)
  function extendSelections(doc, heads, options) {
    for (var out = [], i = 0; i < doc.sel.ranges.length; i++)
      out[i] = extendRange(doc, doc.sel.ranges[i], heads[i], null);
    var newSel = normalizeSelection(out, doc.sel.primIndex);
    setSelection(doc, newSel, options);
  }

  // Updates a single range in the selection.
  function replaceOneSelection(doc, i, range, options) {
    var ranges = doc.sel.ranges.slice(0);
    ranges[i] = range;
    setSelection(doc, normalizeSelection(ranges, doc.sel.primIndex), options);
  }

  // Reset the selection to a single range.
  function setSimpleSelection(doc, anchor, head, options) {
    setSelection(doc, simpleSelection(anchor, head), options);
  }

  // Give beforeSelectionChange handlers a change to influence a
  // selection update.
  function filterSelectionChange(doc, sel) {
    var obj = {
      ranges: sel.ranges,
      update: function(ranges) {
        this.ranges = [];
        for (var i = 0; i < ranges.length; i++)
          this.ranges[i] = new Range(clipPos(doc, ranges[i].anchor),
                                     clipPos(doc, ranges[i].head));
      }
    };
    signal(doc, "beforeSelectionChange", doc, obj);
    if (doc.cm) signal(doc.cm, "beforeSelectionChange", doc.cm, obj);
    if (obj.ranges != sel.ranges) return normalizeSelection(obj.ranges, obj.ranges.length - 1);
    else return sel;
  }

  function setSelectionReplaceHistory(doc, sel, options) {
    var done = doc.history.done, last = lst(done);
    if (last && last.ranges) {
      done[done.length - 1] = sel;
      setSelectionNoUndo(doc, sel, options);
    } else {
      setSelection(doc, sel, options);
    }
  }

  // Set a new selection.
  function setSelection(doc, sel, options) {
    setSelectionNoUndo(doc, sel, options);
    addSelectionToHistory(doc, doc.sel, doc.cm ? doc.cm.curOp.id : NaN, options);
  }

  function setSelectionNoUndo(doc, sel, options) {
    if (hasHandler(doc, "beforeSelectionChange") || doc.cm && hasHandler(doc.cm, "beforeSelectionChange"))
      sel = filterSelectionChange(doc, sel);

    var bias = options && options.bias ||
      (cmp(sel.primary().head, doc.sel.primary().head) < 0 ? -1 : 1);
    setSelectionInner(doc, skipAtomicInSelection(doc, sel, bias, true));

    if (!(options && options.scroll === false) && doc.cm)
      ensureCursorVisible(doc.cm);
  }

  function setSelectionInner(doc, sel) {
    if (sel.equals(doc.sel)) return;

    doc.sel = sel;

    if (doc.cm) {
      doc.cm.curOp.updateInput = doc.cm.curOp.selectionChanged = true;
      signalCursorActivity(doc.cm);
    }
    signalLater(doc, "cursorActivity", doc);
  }

  // Verify that the selection does not partially select any atomic
  // marked ranges.
  function reCheckSelection(doc) {
    setSelectionInner(doc, skipAtomicInSelection(doc, doc.sel, null, false), sel_dontScroll);
  }

  // Return a selection that does not partially select any atomic
  // ranges.
  function skipAtomicInSelection(doc, sel, bias, mayClear) {
    var out;
    for (var i = 0; i < sel.ranges.length; i++) {
      var range = sel.ranges[i];
      var newAnchor = skipAtomic(doc, range.anchor, bias, mayClear);
      var newHead = skipAtomic(doc, range.head, bias, mayClear);
      if (out || newAnchor != range.anchor || newHead != range.head) {
        if (!out) out = sel.ranges.slice(0, i);
        out[i] = new Range(newAnchor, newHead);
      }
    }
    return out ? normalizeSelection(out, sel.primIndex) : sel;
  }

  // Ensure a given position is not inside an atomic range.
  function skipAtomic(doc, pos, bias, mayClear) {
    var flipped = false, curPos = pos;
    var dir = bias || 1;
    doc.cantEdit = false;
    search: for (;;) {
      var line = getLine(doc, curPos.line);
      if (line.markedSpans) {
        for (var i = 0; i < line.markedSpans.length; ++i) {
          var sp = line.markedSpans[i], m = sp.marker;
          if ((sp.from == null || (m.inclusiveLeft ? sp.from <= curPos.ch : sp.from < curPos.ch)) &&
              (sp.to == null || (m.inclusiveRight ? sp.to >= curPos.ch : sp.to > curPos.ch))) {
            if (mayClear) {
              signal(m, "beforeCursorEnter");
              if (m.explicitlyCleared) {
                if (!line.markedSpans) break;
                else {--i; continue;}
              }
            }
            if (!m.atomic) continue;
            var newPos = m.find(dir < 0 ? -1 : 1);
            if (cmp(newPos, curPos) == 0) {
              newPos.ch += dir;
              if (newPos.ch < 0) {
                if (newPos.line > doc.first) newPos = clipPos(doc, Pos(newPos.line - 1));
                else newPos = null;
              } else if (newPos.ch > line.text.length) {
                if (newPos.line < doc.first + doc.size - 1) newPos = Pos(newPos.line + 1, 0);
                else newPos = null;
              }
              if (!newPos) {
                if (flipped) {
                  // Driven in a corner -- no valid cursor position found at all
                  // -- try again *with* clearing, if we didn't already
                  if (!mayClear) return skipAtomic(doc, pos, bias, true);
                  // Otherwise, turn off editing until further notice, and return the start of the doc
                  doc.cantEdit = true;
                  return Pos(doc.first, 0);
                }
                flipped = true; newPos = pos; dir = -dir;
              }
            }
            curPos = newPos;
            continue search;
          }
        }
      }
      return curPos;
    }
  }

  // SELECTION DRAWING

  function updateSelection(cm) {
    cm.display.input.showSelection(cm.display.input.prepareSelection());
  }

  function prepareSelection(cm, primary) {
    var doc = cm.doc, result = {};
    var curFragment = result.cursors = document.createDocumentFragment();
    var selFragment = result.selection = document.createDocumentFragment();

    for (var i = 0; i < doc.sel.ranges.length; i++) {
      if (primary === false && i == doc.sel.primIndex) continue;
      var range = doc.sel.ranges[i];
      var collapsed = range.empty();
      if (collapsed || cm.options.showCursorWhenSelecting)
        drawSelectionCursor(cm, range, curFragment);
      if (!collapsed)
        drawSelectionRange(cm, range, selFragment);
    }
    return result;
  }

  // Draws a cursor for the given range
  function drawSelectionCursor(cm, range, output) {
    var pos = cursorCoords(cm, range.head, "div", null, null, !cm.options.singleCursorHeightPerLine);

    var cursor = output.appendChild(elt("div", "\u00a0", "CodeMirror-cursor"));
    cursor.style.left = pos.left + "px";
    cursor.style.top = pos.top + "px";
    cursor.style.height = Math.max(0, pos.bottom - pos.top) * cm.options.cursorHeight + "px";

    if (pos.other) {
      // Secondary cursor, shown when on a 'jump' in bi-directional text
      var otherCursor = output.appendChild(elt("div", "\u00a0", "CodeMirror-cursor CodeMirror-secondarycursor"));
      otherCursor.style.display = "";
      otherCursor.style.left = pos.other.left + "px";
      otherCursor.style.top = pos.other.top + "px";
      otherCursor.style.height = (pos.other.bottom - pos.other.top) * .85 + "px";
    }
  }

  // Draws the given range as a highlighted selection
  function drawSelectionRange(cm, range, output) {
    var display = cm.display, doc = cm.doc;
    var fragment = document.createDocumentFragment();
    var padding = paddingH(cm.display), leftSide = padding.left;
    var rightSide = Math.max(display.sizerWidth, displayWidth(cm) - display.sizer.offsetLeft) - padding.right;

    function add(left, top, width, bottom) {
      if (top < 0) top = 0;
      top = Math.round(top);
      bottom = Math.round(bottom);
      fragment.appendChild(elt("div", null, "CodeMirror-selected", "position: absolute; left: " + left +
                               "px; top: " + top + "px; width: " + (width == null ? rightSide - left : width) +
                               "px; height: " + (bottom - top) + "px"));
    }

    function drawForLine(line, fromArg, toArg) {
      var lineObj = getLine(doc, line);
      var lineLen = lineObj.text.length;
      var start, end;
      function coords(ch, bias) {
        return charCoords(cm, Pos(line, ch), "div", lineObj, bias);
      }

      iterateBidiSections(getOrder(lineObj), fromArg || 0, toArg == null ? lineLen : toArg, function(from, to, dir) {
        var leftPos = coords(from, "left"), rightPos, left, right;
        if (from == to) {
          rightPos = leftPos;
          left = right = leftPos.left;
        } else {
          rightPos = coords(to - 1, "right");
          if (dir == "rtl") { var tmp = leftPos; leftPos = rightPos; rightPos = tmp; }
          left = leftPos.left;
          right = rightPos.right;
        }
        if (fromArg == null && from == 0) left = leftSide;
        if (rightPos.top - leftPos.top > 3) { // Different lines, draw top part
          add(left, leftPos.top, null, leftPos.bottom);
          left = leftSide;
          if (leftPos.bottom < rightPos.top) add(left, leftPos.bottom, null, rightPos.top);
        }
        if (toArg == null && to == lineLen) right = rightSide;
        if (!start || leftPos.top < start.top || leftPos.top == start.top && leftPos.left < start.left)
          start = leftPos;
        if (!end || rightPos.bottom > end.bottom || rightPos.bottom == end.bottom && rightPos.right > end.right)
          end = rightPos;
        if (left < leftSide + 1) left = leftSide;
        add(left, rightPos.top, right - left, rightPos.bottom);
      });
      return {start: start, end: end};
    }

    var sFrom = range.from(), sTo = range.to();
    if (sFrom.line == sTo.line) {
      drawForLine(sFrom.line, sFrom.ch, sTo.ch);
    } else {
      var fromLine = getLine(doc, sFrom.line), toLine = getLine(doc, sTo.line);
      var singleVLine = visualLine(fromLine) == visualLine(toLine);
      var leftEnd = drawForLine(sFrom.line, sFrom.ch, singleVLine ? fromLine.text.length + 1 : null).end;
      var rightStart = drawForLine(sTo.line, singleVLine ? 0 : null, sTo.ch).start;
      if (singleVLine) {
        if (leftEnd.top < rightStart.top - 2) {
          add(leftEnd.right, leftEnd.top, null, leftEnd.bottom);
          add(leftSide, rightStart.top, rightStart.left, rightStart.bottom);
        } else {
          add(leftEnd.right, leftEnd.top, rightStart.left - leftEnd.right, leftEnd.bottom);
        }
      }
      if (leftEnd.bottom < rightStart.top)
        add(leftSide, leftEnd.bottom, null, rightStart.top);
    }

    output.appendChild(fragment);
  }

  // Cursor-blinking
  function restartBlink(cm) {
    if (!cm.state.focused) return;
    var display = cm.display;
    clearInterval(display.blinker);
    var on = true;
    display.cursorDiv.style.visibility = "";
    if (cm.options.cursorBlinkRate > 0)
      display.blinker = setInterval(function() {
        display.cursorDiv.style.visibility = (on = !on) ? "" : "hidden";
      }, cm.options.cursorBlinkRate);
    else if (cm.options.cursorBlinkRate < 0)
      display.cursorDiv.style.visibility = "hidden";
  }

  // HIGHLIGHT WORKER

  function startWorker(cm, time) {
    if (cm.doc.mode.startState && cm.doc.frontier < cm.display.viewTo)
      cm.state.highlight.set(time, bind(highlightWorker, cm));
  }

  function highlightWorker(cm) {
    var doc = cm.doc;
    if (doc.frontier < doc.first) doc.frontier = doc.first;
    if (doc.frontier >= cm.display.viewTo) return;
    var end = +new Date + cm.options.workTime;
    var state = copyState(doc.mode, getStateBefore(cm, doc.frontier));
    var changedLines = [];

    doc.iter(doc.frontier, Math.min(doc.first + doc.size, cm.display.viewTo + 500), function(line) {
      if (doc.frontier >= cm.display.viewFrom) { // Visible
        var oldStyles = line.styles;
        var highlighted = highlightLine(cm, line, state, true);
        line.styles = highlighted.styles;
        var oldCls = line.styleClasses, newCls = highlighted.classes;
        if (newCls) line.styleClasses = newCls;
        else if (oldCls) line.styleClasses = null;
        var ischange = !oldStyles || oldStyles.length != line.styles.length ||
          oldCls != newCls && (!oldCls || !newCls || oldCls.bgClass != newCls.bgClass || oldCls.textClass != newCls.textClass);
        for (var i = 0; !ischange && i < oldStyles.length; ++i) ischange = oldStyles[i] != line.styles[i];
        if (ischange) changedLines.push(doc.frontier);
        line.stateAfter = copyState(doc.mode, state);
      } else {
        processLine(cm, line.text, state);
        line.stateAfter = doc.frontier % 5 == 0 ? copyState(doc.mode, state) : null;
      }
      ++doc.frontier;
      if (+new Date > end) {
        startWorker(cm, cm.options.workDelay);
        return true;
      }
    });
    if (changedLines.length) runInOp(cm, function() {
      for (var i = 0; i < changedLines.length; i++)
        regLineChange(cm, changedLines[i], "text");
    });
  }

  // Finds the line to start with when starting a parse. Tries to
  // find a line with a stateAfter, so that it can start with a
  // valid state. If that fails, it returns the line with the
  // smallest indentation, which tends to need the least context to
  // parse correctly.
  function findStartLine(cm, n, precise) {
    var minindent, minline, doc = cm.doc;
    var lim = precise ? -1 : n - (cm.doc.mode.innerMode ? 1000 : 100);
    for (var search = n; search > lim; --search) {
      if (search <= doc.first) return doc.first;
      var line = getLine(doc, search - 1);
      if (line.stateAfter && (!precise || search <= doc.frontier)) return search;
      var indented = countColumn(line.text, null, cm.options.tabSize);
      if (minline == null || minindent > indented) {
        minline = search - 1;
        minindent = indented;
      }
    }
    return minline;
  }

  function getStateBefore(cm, n, precise) {
    var doc = cm.doc, display = cm.display;
    if (!doc.mode.startState) return true;
    var pos = findStartLine(cm, n, precise), state = pos > doc.first && getLine(doc, pos-1).stateAfter;
    if (!state) state = startState(doc.mode);
    else state = copyState(doc.mode, state);
    doc.iter(pos, n, function(line) {
      processLine(cm, line.text, state);
      var save = pos == n - 1 || pos % 5 == 0 || pos >= display.viewFrom && pos < display.viewTo;
      line.stateAfter = save ? copyState(doc.mode, state) : null;
      ++pos;
    });
    if (precise) doc.frontier = pos;
    return state;
  }

  // POSITION MEASUREMENT

  function paddingTop(display) {return display.lineSpace.offsetTop;}
  function paddingVert(display) {return display.mover.offsetHeight - display.lineSpace.offsetHeight;}
  function paddingH(display) {
    if (display.cachedPaddingH) return display.cachedPaddingH;
    var e = removeChildrenAndAdd(display.measure, elt("pre", "x"));
    var style = window.getComputedStyle ? window.getComputedStyle(e) : e.currentStyle;
    var data = {left: parseInt(style.paddingLeft), right: parseInt(style.paddingRight)};
    if (!isNaN(data.left) && !isNaN(data.right)) display.cachedPaddingH = data;
    return data;
  }

  function scrollGap(cm) { return scrollerGap - cm.display.nativeBarWidth; }
  function displayWidth(cm) {
    return cm.display.scroller.clientWidth - scrollGap(cm) - cm.display.barWidth;
  }
  function displayHeight(cm) {
    return cm.display.scroller.clientHeight - scrollGap(cm) - cm.display.barHeight;
  }

  // Ensure the lineView.wrapping.heights array is populated. This is
  // an array of bottom offsets for the lines that make up a drawn
  // line. When lineWrapping is on, there might be more than one
  // height.
  function ensureLineHeights(cm, lineView, rect) {
    var wrapping = cm.options.lineWrapping;
    var curWidth = wrapping && displayWidth(cm);
    if (!lineView.measure.heights || wrapping && lineView.measure.width != curWidth) {
      var heights = lineView.measure.heights = [];
      if (wrapping) {
        lineView.measure.width = curWidth;
        var rects = lineView.text.firstChild.getClientRects();
        for (var i = 0; i < rects.length - 1; i++) {
          var cur = rects[i], next = rects[i + 1];
          if (Math.abs(cur.bottom - next.bottom) > 2)
            heights.push((cur.bottom + next.top) / 2 - rect.top);
        }
      }
      heights.push(rect.bottom - rect.top);
    }
  }

  // Find a line map (mapping character offsets to text nodes) and a
  // measurement cache for the given line number. (A line view might
  // contain multiple lines when collapsed ranges are present.)
  function mapFromLineView(lineView, line, lineN) {
    if (lineView.line == line)
      return {map: lineView.measure.map, cache: lineView.measure.cache};
    for (var i = 0; i < lineView.rest.length; i++)
      if (lineView.rest[i] == line)
        return {map: lineView.measure.maps[i], cache: lineView.measure.caches[i]};
    for (var i = 0; i < lineView.rest.length; i++)
      if (lineNo(lineView.rest[i]) > lineN)
        return {map: lineView.measure.maps[i], cache: lineView.measure.caches[i], before: true};
  }

  // Render a line into the hidden node display.externalMeasured. Used
  // when measurement is needed for a line that's not in the viewport.
  function updateExternalMeasurement(cm, line) {
    line = visualLine(line);
    var lineN = lineNo(line);
    var view = cm.display.externalMeasured = new LineView(cm.doc, line, lineN);
    view.lineN = lineN;
    var built = view.built = buildLineContent(cm, view);
    view.text = built.pre;
    removeChildrenAndAdd(cm.display.lineMeasure, built.pre);
    return view;
  }

  // Get a {top, bottom, left, right} box (in line-local coordinates)
  // for a given character.
  function measureChar(cm, line, ch, bias) {
    return measureCharPrepared(cm, prepareMeasureForLine(cm, line), ch, bias);
  }

  // Find a line view that corresponds to the given line number.
  function findViewForLine(cm, lineN) {
    if (lineN >= cm.display.viewFrom && lineN < cm.display.viewTo)
      return cm.display.view[findViewIndex(cm, lineN)];
    var ext = cm.display.externalMeasured;
    if (ext && lineN >= ext.lineN && lineN < ext.lineN + ext.size)
      return ext;
  }

  // Measurement can be split in two steps, the set-up work that
  // applies to the whole line, and the measurement of the actual
  // character. Functions like coordsChar, that need to do a lot of
  // measurements in a row, can thus ensure that the set-up work is
  // only done once.
  function prepareMeasureForLine(cm, line) {
    var lineN = lineNo(line);
    var view = findViewForLine(cm, lineN);
    if (view && !view.text) {
      view = null;
    } else if (view && view.changes) {
      updateLineForChanges(cm, view, lineN, getDimensions(cm));
      cm.curOp.forceUpdate = true;
    }
    if (!view)
      view = updateExternalMeasurement(cm, line);

    var info = mapFromLineView(view, line, lineN);
    return {
      line: line, view: view, rect: null,
      map: info.map, cache: info.cache, before: info.before,
      hasHeights: false
    };
  }

  // Given a prepared measurement object, measures the position of an
  // actual character (or fetches it from the cache).
  function measureCharPrepared(cm, prepared, ch, bias, varHeight) {
    if (prepared.before) ch = -1;
    var key = ch + (bias || ""), found;
    if (prepared.cache.hasOwnProperty(key)) {
      found = prepared.cache[key];
    } else {
      if (!prepared.rect)
        prepared.rect = prepared.view.text.getBoundingClientRect();
      if (!prepared.hasHeights) {
        ensureLineHeights(cm, prepared.view, prepared.rect);
        prepared.hasHeights = true;
      }
      found = measureCharInner(cm, prepared, ch, bias);
      if (!found.bogus) prepared.cache[key] = found;
    }
    return {left: found.left, right: found.right,
            top: varHeight ? found.rtop : found.top,
            bottom: varHeight ? found.rbottom : found.bottom};
  }

  var nullRect = {left: 0, right: 0, top: 0, bottom: 0};

  function nodeAndOffsetInLineMap(map, ch, bias) {
    var node, start, end, collapse;
    // First, search the line map for the text node corresponding to,
    // or closest to, the target character.
    for (var i = 0; i < map.length; i += 3) {
      var mStart = map[i], mEnd = map[i + 1];
      if (ch < mStart) {
        start = 0; end = 1;
        collapse = "left";
      } else if (ch < mEnd) {
        start = ch - mStart;
        end = start + 1;
      } else if (i == map.length - 3 || ch == mEnd && map[i + 3] > ch) {
        end = mEnd - mStart;
        start = end - 1;
        if (ch >= mEnd) collapse = "right";
      }
      if (start != null) {
        node = map[i + 2];
        if (mStart == mEnd && bias == (node.insertLeft ? "left" : "right"))
          collapse = bias;
        if (bias == "left" && start == 0)
          while (i && map[i - 2] == map[i - 3] && map[i - 1].insertLeft) {
            node = map[(i -= 3) + 2];
            collapse = "left";
          }
        if (bias == "right" && start == mEnd - mStart)
          while (i < map.length - 3 && map[i + 3] == map[i + 4] && !map[i + 5].insertLeft) {
            node = map[(i += 3) + 2];
            collapse = "right";
          }
        break;
      }
    }
    return {node: node, start: start, end: end, collapse: collapse, coverStart: mStart, coverEnd: mEnd};
  }

  function measureCharInner(cm, prepared, ch, bias) {
    var place = nodeAndOffsetInLineMap(prepared.map, ch, bias);
    var node = place.node, start = place.start, end = place.end, collapse = place.collapse;

    var rect;
    if (node.nodeType == 3) { // If it is a text node, use a range to retrieve the coordinates.
      for (var i = 0; i < 4; i++) { // Retry a maximum of 4 times when nonsense rectangles are returned
        while (start && isExtendingChar(prepared.line.text.charAt(place.coverStart + start))) --start;
        while (place.coverStart + end < place.coverEnd && isExtendingChar(prepared.line.text.charAt(place.coverStart + end))) ++end;
        if (ie && ie_version < 9 && start == 0 && end == place.coverEnd - place.coverStart) {
          rect = node.parentNode.getBoundingClientRect();
        } else if (ie && cm.options.lineWrapping) {
          var rects = range(node, start, end).getClientRects();
          if (rects.length)
            rect = rects[bias == "right" ? rects.length - 1 : 0];
          else
            rect = nullRect;
        } else {
          rect = range(node, start, end).getBoundingClientRect() || nullRect;
        }
        if (rect.left || rect.right || start == 0) break;
        end = start;
        start = start - 1;
        collapse = "right";
      }
      if (ie && ie_version < 11) rect = maybeUpdateRectForZooming(cm.display.measure, rect);
    } else { // If it is a widget, simply get the box for the whole widget.
      if (start > 0) collapse = bias = "right";
      var rects;
      if (cm.options.lineWrapping && (rects = node.getClientRects()).length > 1)
        rect = rects[bias == "right" ? rects.length - 1 : 0];
      else
        rect = node.getBoundingClientRect();
    }
    if (ie && ie_version < 9 && !start && (!rect || !rect.left && !rect.right)) {
      var rSpan = node.parentNode.getClientRects()[0];
      if (rSpan)
        rect = {left: rSpan.left, right: rSpan.left + charWidth(cm.display), top: rSpan.top, bottom: rSpan.bottom};
      else
        rect = nullRect;
    }

    var rtop = rect.top - prepared.rect.top, rbot = rect.bottom - prepared.rect.top;
    var mid = (rtop + rbot) / 2;
    var heights = prepared.view.measure.heights;
    for (var i = 0; i < heights.length - 1; i++)
      if (mid < heights[i]) break;
    var top = i ? heights[i - 1] : 0, bot = heights[i];
    var result = {left: (collapse == "right" ? rect.right : rect.left) - prepared.rect.left,
                  right: (collapse == "left" ? rect.left : rect.right) - prepared.rect.left,
                  top: top, bottom: bot};
    if (!rect.left && !rect.right) result.bogus = true;
    if (!cm.options.singleCursorHeightPerLine) { result.rtop = rtop; result.rbottom = rbot; }

    return result;
  }

  // Work around problem with bounding client rects on ranges being
  // returned incorrectly when zoomed on IE10 and below.
  function maybeUpdateRectForZooming(measure, rect) {
    if (!window.screen || screen.logicalXDPI == null ||
        screen.logicalXDPI == screen.deviceXDPI || !hasBadZoomedRects(measure))
      return rect;
    var scaleX = screen.logicalXDPI / screen.deviceXDPI;
    var scaleY = screen.logicalYDPI / screen.deviceYDPI;
    return {left: rect.left * scaleX, right: rect.right * scaleX,
            top: rect.top * scaleY, bottom: rect.bottom * scaleY};
  }

  function clearLineMeasurementCacheFor(lineView) {
    if (lineView.measure) {
      lineView.measure.cache = {};
      lineView.measure.heights = null;
      if (lineView.rest) for (var i = 0; i < lineView.rest.length; i++)
        lineView.measure.caches[i] = {};
    }
  }

  function clearLineMeasurementCache(cm) {
    cm.display.externalMeasure = null;
    removeChildren(cm.display.lineMeasure);
    for (var i = 0; i < cm.display.view.length; i++)
      clearLineMeasurementCacheFor(cm.display.view[i]);
  }

  function clearCaches(cm) {
    clearLineMeasurementCache(cm);
    cm.display.cachedCharWidth = cm.display.cachedTextHeight = cm.display.cachedPaddingH = null;
    if (!cm.options.lineWrapping) cm.display.maxLineChanged = true;
    cm.display.lineNumChars = null;
  }

  function pageScrollX() { return window.pageXOffset || (document.documentElement || document.body).scrollLeft; }
  function pageScrollY() { return window.pageYOffset || (document.documentElement || document.body).scrollTop; }

  // Converts a {top, bottom, left, right} box from line-local
  // coordinates into another coordinate system. Context may be one of
  // "line", "div" (display.lineDiv), "local"/null (editor), "window",
  // or "page".
  function intoCoordSystem(cm, lineObj, rect, context) {
    if (lineObj.widgets) for (var i = 0; i < lineObj.widgets.length; ++i) if (lineObj.widgets[i].above) {
      var size = widgetHeight(lineObj.widgets[i]);
      rect.top += size; rect.bottom += size;
    }
    if (context == "line") return rect;
    if (!context) context = "local";
    var yOff = heightAtLine(lineObj);
    if (context == "local") yOff += paddingTop(cm.display);
    else yOff -= cm.display.viewOffset;
    if (context == "page" || context == "window") {
      var lOff = cm.display.lineSpace.getBoundingClientRect();
      yOff += lOff.top + (context == "window" ? 0 : pageScrollY());
      var xOff = lOff.left + (context == "window" ? 0 : pageScrollX());
      rect.left += xOff; rect.right += xOff;
    }
    rect.top += yOff; rect.bottom += yOff;
    return rect;
  }

  // Coverts a box from "div" coords to another coordinate system.
  // Context may be "window", "page", "div", or "local"/null.
  function fromCoordSystem(cm, coords, context) {
    if (context == "div") return coords;
    var left = coords.left, top = coords.top;
    // First move into "page" coordinate system
    if (context == "page") {
      left -= pageScrollX();
      top -= pageScrollY();
    } else if (context == "local" || !context) {
      var localBox = cm.display.sizer.getBoundingClientRect();
      left += localBox.left;
      top += localBox.top;
    }

    var lineSpaceBox = cm.display.lineSpace.getBoundingClientRect();
    return {left: left - lineSpaceBox.left, top: top - lineSpaceBox.top};
  }

  function charCoords(cm, pos, context, lineObj, bias) {
    if (!lineObj) lineObj = getLine(cm.doc, pos.line);
    return intoCoordSystem(cm, lineObj, measureChar(cm, lineObj, pos.ch, bias), context);
  }

  // Returns a box for a given cursor position, which may have an
  // 'other' property containing the position of the secondary cursor
  // on a bidi boundary.
  function cursorCoords(cm, pos, context, lineObj, preparedMeasure, varHeight) {
    lineObj = lineObj || getLine(cm.doc, pos.line);
    if (!preparedMeasure) preparedMeasure = prepareMeasureForLine(cm, lineObj);
    function get(ch, right) {
      var m = measureCharPrepared(cm, preparedMeasure, ch, right ? "right" : "left", varHeight);
      if (right) m.left = m.right; else m.right = m.left;
      return intoCoordSystem(cm, lineObj, m, context);
    }
    function getBidi(ch, partPos) {
      var part = order[partPos], right = part.level % 2;
      if (ch == bidiLeft(part) && partPos && part.level < order[partPos - 1].level) {
        part = order[--partPos];
        ch = bidiRight(part) - (part.level % 2 ? 0 : 1);
        right = true;
      } else if (ch == bidiRight(part) && partPos < order.length - 1 && part.level < order[partPos + 1].level) {
        part = order[++partPos];
        ch = bidiLeft(part) - part.level % 2;
        right = false;
      }
      if (right && ch == part.to && ch > part.from) return get(ch - 1);
      return get(ch, right);
    }
    var order = getOrder(lineObj), ch = pos.ch;
    if (!order) return get(ch);
    var partPos = getBidiPartAt(order, ch);
    var val = getBidi(ch, partPos);
    if (bidiOther != null) val.other = getBidi(ch, bidiOther);
    return val;
  }

  // Used to cheaply estimate the coordinates for a position. Used for
  // intermediate scroll updates.
  function estimateCoords(cm, pos) {
    var left = 0, pos = clipPos(cm.doc, pos);
    if (!cm.options.lineWrapping) left = charWidth(cm.display) * pos.ch;
    var lineObj = getLine(cm.doc, pos.line);
    var top = heightAtLine(lineObj) + paddingTop(cm.display);
    return {left: left, right: left, top: top, bottom: top + lineObj.height};
  }

  // Positions returned by coordsChar contain some extra information.
  // xRel is the relative x position of the input coordinates compared
  // to the found position (so xRel > 0 means the coordinates are to
  // the right of the character position, for example). When outside
  // is true, that means the coordinates lie outside the line's
  // vertical range.
  function PosWithInfo(line, ch, outside, xRel) {
    var pos = Pos(line, ch);
    pos.xRel = xRel;
    if (outside) pos.outside = true;
    return pos;
  }

  // Compute the character position closest to the given coordinates.
  // Input must be lineSpace-local ("div" coordinate system).
  function coordsChar(cm, x, y) {
    var doc = cm.doc;
    y += cm.display.viewOffset;
    if (y < 0) return PosWithInfo(doc.first, 0, true, -1);
    var lineN = lineAtHeight(doc, y), last = doc.first + doc.size - 1;
    if (lineN > last)
      return PosWithInfo(doc.first + doc.size - 1, getLine(doc, last).text.length, true, 1);
    if (x < 0) x = 0;

    var lineObj = getLine(doc, lineN);
    for (;;) {
      var found = coordsCharInner(cm, lineObj, lineN, x, y);
      var merged = collapsedSpanAtEnd(lineObj);
      var mergedPos = merged && merged.find(0, true);
      if (merged && (found.ch > mergedPos.from.ch || found.ch == mergedPos.from.ch && found.xRel > 0))
        lineN = lineNo(lineObj = mergedPos.to.line);
      else
        return found;
    }
  }

  function coordsCharInner(cm, lineObj, lineNo, x, y) {
    var innerOff = y - heightAtLine(lineObj);
    var wrongLine = false, adjust = 2 * cm.display.wrapper.clientWidth;
    var preparedMeasure = prepareMeasureForLine(cm, lineObj);

    function getX(ch) {
      var sp = cursorCoords(cm, Pos(lineNo, ch), "line", lineObj, preparedMeasure);
      wrongLine = true;
      if (innerOff > sp.bottom) return sp.left - adjust;
      else if (innerOff < sp.top) return sp.left + adjust;
      else wrongLine = false;
      return sp.left;
    }

    var bidi = getOrder(lineObj), dist = lineObj.text.length;
    var from = lineLeft(lineObj), to = lineRight(lineObj);
    var fromX = getX(from), fromOutside = wrongLine, toX = getX(to), toOutside = wrongLine;

    if (x > toX) return PosWithInfo(lineNo, to, toOutside, 1);
    // Do a binary search between these bounds.
    for (;;) {
      if (bidi ? to == from || to == moveVisually(lineObj, from, 1) : to - from <= 1) {
        var ch = x < fromX || x - fromX <= toX - x ? from : to;
        var xDiff = x - (ch == from ? fromX : toX);
        while (isExtendingChar(lineObj.text.charAt(ch))) ++ch;
        var pos = PosWithInfo(lineNo, ch, ch == from ? fromOutside : toOutside,
                              xDiff < -1 ? -1 : xDiff > 1 ? 1 : 0);
        return pos;
      }
      var step = Math.ceil(dist / 2), middle = from + step;
      if (bidi) {
        middle = from;
        for (var i = 0; i < step; ++i) middle = moveVisually(lineObj, middle, 1);
      }
      var middleX = getX(middle);
      if (middleX > x) {to = middle; toX = middleX; if (toOutside = wrongLine) toX += 1000; dist = step;}
      else {from = middle; fromX = middleX; fromOutside = wrongLine; dist -= step;}
    }
  }

  var measureText;
  // Compute the default text height.
  function textHeight(display) {
    if (display.cachedTextHeight != null) return display.cachedTextHeight;
    if (measureText == null) {
      measureText = elt("pre");
      // Measure a bunch of lines, for browsers that compute
      // fractional heights.
      for (var i = 0; i < 49; ++i) {
        measureText.appendChild(document.createTextNode("x"));
        measureText.appendChild(elt("br"));
      }
      measureText.appendChild(document.createTextNode("x"));
    }
    removeChildrenAndAdd(display.measure, measureText);
    var height = measureText.offsetHeight / 50;
    if (height > 3) display.cachedTextHeight = height;
    removeChildren(display.measure);
    return height || 1;
  }

  // Compute the default character width.
  function charWidth(display) {
    if (display.cachedCharWidth != null) return display.cachedCharWidth;
    var anchor = elt("span", "xxxxxxxxxx");
    var pre = elt("pre", [anchor]);
    removeChildrenAndAdd(display.measure, pre);
    var rect = anchor.getBoundingClientRect(), width = (rect.right - rect.left) / 10;
    if (width > 2) display.cachedCharWidth = width;
    return width || 10;
  }

  // OPERATIONS

  // Operations are used to wrap a series of changes to the editor
  // state in such a way that each change won't have to update the
  // cursor and display (which would be awkward, slow, and
  // error-prone). Instead, display updates are batched and then all
  // combined and executed at once.

  var operationGroup = null;

  var nextOpId = 0;
  // Start a new operation.
  function startOperation(cm) {
    cm.curOp = {
      cm: cm,
      viewChanged: false,      // Flag that indicates that lines might need to be redrawn
      startHeight: cm.doc.height, // Used to detect need to update scrollbar
      forceUpdate: false,      // Used to force a redraw
      updateInput: null,       // Whether to reset the input textarea
      typing: false,           // Whether this reset should be careful to leave existing text (for compositing)
      changeObjs: null,        // Accumulated changes, for firing change events
      cursorActivityHandlers: null, // Set of handlers to fire cursorActivity on
      cursorActivityCalled: 0, // Tracks which cursorActivity handlers have been called already
      selectionChanged: false, // Whether the selection needs to be redrawn
      updateMaxLine: false,    // Set when the widest line needs to be determined anew
      scrollLeft: null, scrollTop: null, // Intermediate scroll position, not pushed to DOM yet
      scrollToPos: null,       // Used to scroll to a specific position
      focus: false,
      id: ++nextOpId           // Unique ID
    };
    if (operationGroup) {
      operationGroup.ops.push(cm.curOp);
    } else {
      cm.curOp.ownsGroup = operationGroup = {
        ops: [cm.curOp],
        delayedCallbacks: []
      };
    }
  }

  function fireCallbacksForOps(group) {
    // Calls delayed callbacks and cursorActivity handlers until no
    // new ones appear
    var callbacks = group.delayedCallbacks, i = 0;
    do {
      for (; i < callbacks.length; i++)
        callbacks[i]();
      for (var j = 0; j < group.ops.length; j++) {
        var op = group.ops[j];
        if (op.cursorActivityHandlers)
          while (op.cursorActivityCalled < op.cursorActivityHandlers.length)
            op.cursorActivityHandlers[op.cursorActivityCalled++](op.cm);
      }
    } while (i < callbacks.length);
  }

  // Finish an operation, updating the display and signalling delayed events
  function endOperation(cm) {
    var op = cm.curOp, group = op.ownsGroup;
    if (!group) return;

    try { fireCallbacksForOps(group); }
    finally {
      operationGroup = null;
      for (var i = 0; i < group.ops.length; i++)
        group.ops[i].cm.curOp = null;
      endOperations(group);
    }
  }

  // The DOM updates done when an operation finishes are batched so
  // that the minimum number of relayouts are required.
  function endOperations(group) {
    var ops = group.ops;
    for (var i = 0; i < ops.length; i++) // Read DOM
      endOperation_R1(ops[i]);
    for (var i = 0; i < ops.length; i++) // Write DOM (maybe)
      endOperation_W1(ops[i]);
    for (var i = 0; i < ops.length; i++) // Read DOM
      endOperation_R2(ops[i]);
    for (var i = 0; i < ops.length; i++) // Write DOM (maybe)
      endOperation_W2(ops[i]);
    for (var i = 0; i < ops.length; i++) // Read DOM
      endOperation_finish(ops[i]);
  }

  function endOperation_R1(op) {
    var cm = op.cm, display = cm.display;
    maybeClipScrollbars(cm);
    if (op.updateMaxLine) findMaxLine(cm);

    op.mustUpdate = op.viewChanged || op.forceUpdate || op.scrollTop != null ||
      op.scrollToPos && (op.scrollToPos.from.line < display.viewFrom ||
                         op.scrollToPos.to.line >= display.viewTo) ||
      display.maxLineChanged && cm.options.lineWrapping;
    op.update = op.mustUpdate &&
      new DisplayUpdate(cm, op.mustUpdate && {top: op.scrollTop, ensure: op.scrollToPos}, op.forceUpdate);
  }

  function endOperation_W1(op) {
    op.updatedDisplay = op.mustUpdate && updateDisplayIfNeeded(op.cm, op.update);
  }

  function endOperation_R2(op) {
    var cm = op.cm, display = cm.display;
    if (op.updatedDisplay) updateHeightsInViewport(cm);

    op.barMeasure = measureForScrollbars(cm);

    // If the max line changed since it was last measured, measure it,
    // and ensure the document's width matches it.
    // updateDisplay_W2 will use these properties to do the actual resizing
    if (display.maxLineChanged && !cm.options.lineWrapping) {
      op.adjustWidthTo = measureChar(cm, display.maxLine, display.maxLine.text.length).left + 3;
      cm.display.sizerWidth = op.adjustWidthTo;
      op.barMeasure.scrollWidth =
        Math.max(display.scroller.clientWidth, display.sizer.offsetLeft + op.adjustWidthTo + scrollGap(cm) + cm.display.barWidth);
      op.maxScrollLeft = Math.max(0, display.sizer.offsetLeft + op.adjustWidthTo - displayWidth(cm));
    }

    if (op.updatedDisplay || op.selectionChanged)
      op.preparedSelection = display.input.prepareSelection();
  }

  function endOperation_W2(op) {
    var cm = op.cm;

    if (op.adjustWidthTo != null) {
      cm.display.sizer.style.minWidth = op.adjustWidthTo + "px";
      if (op.maxScrollLeft < cm.doc.scrollLeft)
        setScrollLeft(cm, Math.min(cm.display.scroller.scrollLeft, op.maxScrollLeft), true);
      cm.display.maxLineChanged = false;
    }

    if (op.preparedSelection)
      cm.display.input.showSelection(op.preparedSelection);
    if (op.updatedDisplay)
      setDocumentHeight(cm, op.barMeasure);
    if (op.updatedDisplay || op.startHeight != cm.doc.height)
      updateScrollbars(cm, op.barMeasure);

    if (op.selectionChanged) restartBlink(cm);

    if (cm.state.focused && op.updateInput)
      cm.display.input.reset(op.typing);
    if (op.focus && op.focus == activeElt()) ensureFocus(op.cm);
  }

  function endOperation_finish(op) {
    var cm = op.cm, display = cm.display, doc = cm.doc;

    if (op.updatedDisplay) postUpdateDisplay(cm, op.update);

    // Abort mouse wheel delta measurement, when scrolling explicitly
    if (display.wheelStartX != null && (op.scrollTop != null || op.scrollLeft != null || op.scrollToPos))
      display.wheelStartX = display.wheelStartY = null;

    // Propagate the scroll position to the actual DOM scroller
    if (op.scrollTop != null && (display.scroller.scrollTop != op.scrollTop || op.forceScroll)) {
      doc.scrollTop = Math.max(0, Math.min(display.scroller.scrollHeight - display.scroller.clientHeight, op.scrollTop));
      display.scrollbars.setScrollTop(doc.scrollTop);
      display.scroller.scrollTop = doc.scrollTop;
    }
    if (op.scrollLeft != null && (display.scroller.scrollLeft != op.scrollLeft || op.forceScroll)) {
      doc.scrollLeft = Math.max(0, Math.min(display.scroller.scrollWidth - displayWidth(cm), op.scrollLeft));
      display.scrollbars.setScrollLeft(doc.scrollLeft);
      display.scroller.scrollLeft = doc.scrollLeft;
      alignHorizontally(cm);
    }
    // If we need to scroll a specific position into view, do so.
    if (op.scrollToPos) {
      var coords = scrollPosIntoView(cm, clipPos(doc, op.scrollToPos.from),
                                     clipPos(doc, op.scrollToPos.to), op.scrollToPos.margin);
      if (op.scrollToPos.isCursor && cm.state.focused) maybeScrollWindow(cm, coords);
    }

    // Fire events for markers that are hidden/unidden by editing or
    // undoing
    var hidden = op.maybeHiddenMarkers, unhidden = op.maybeUnhiddenMarkers;
    if (hidden) for (var i = 0; i < hidden.length; ++i)
      if (!hidden[i].lines.length) signal(hidden[i], "hide");
    if (unhidden) for (var i = 0; i < unhidden.length; ++i)
      if (unhidden[i].lines.length) signal(unhidden[i], "unhide");

    if (display.wrapper.offsetHeight)
      doc.scrollTop = cm.display.scroller.scrollTop;

    // Fire change events, and delayed event handlers
    if (op.changeObjs)
      signal(cm, "changes", cm, op.changeObjs);
    if (op.update)
      op.update.finish();
  }

  // Run the given function in an operation
  function runInOp(cm, f) {
    if (cm.curOp) return f();
    startOperation(cm);
    try { return f(); }
    finally { endOperation(cm); }
  }
  // Wraps a function in an operation. Returns the wrapped function.
  function operation(cm, f) {
    return function() {
      if (cm.curOp) return f.apply(cm, arguments);
      startOperation(cm);
      try { return f.apply(cm, arguments); }
      finally { endOperation(cm); }
    };
  }
  // Used to add methods to editor and doc instances, wrapping them in
  // operations.
  function methodOp(f) {
    return function() {
      if (this.curOp) return f.apply(this, arguments);
      startOperation(this);
      try { return f.apply(this, arguments); }
      finally { endOperation(this); }
    };
  }
  function docMethodOp(f) {
    return function() {
      var cm = this.cm;
      if (!cm || cm.curOp) return f.apply(this, arguments);
      startOperation(cm);
      try { return f.apply(this, arguments); }
      finally { endOperation(cm); }
    };
  }

  // VIEW TRACKING

  // These objects are used to represent the visible (currently drawn)
  // part of the document. A LineView may correspond to multiple
  // logical lines, if those are connected by collapsed ranges.
  function LineView(doc, line, lineN) {
    // The starting line
    this.line = line;
    // Continuing lines, if any
    this.rest = visualLineContinued(line);
    // Number of logical lines in this visual line
    this.size = this.rest ? lineNo(lst(this.rest)) - lineN + 1 : 1;
    this.node = this.text = null;
    this.hidden = lineIsHidden(doc, line);
  }

  // Create a range of LineView objects for the given lines.
  function buildViewArray(cm, from, to) {
    var array = [], nextPos;
    for (var pos = from; pos < to; pos = nextPos) {
      var view = new LineView(cm.doc, getLine(cm.doc, pos), pos);
      nextPos = pos + view.size;
      array.push(view);
    }
    return array;
  }

  // Updates the display.view data structure for a given change to the
  // document. From and to are in pre-change coordinates. Lendiff is
  // the amount of lines added or subtracted by the change. This is
  // used for changes that span multiple lines, or change the way
  // lines are divided into visual lines. regLineChange (below)
  // registers single-line changes.
  function regChange(cm, from, to, lendiff) {
    if (from == null) from = cm.doc.first;
    if (to == null) to = cm.doc.first + cm.doc.size;
    if (!lendiff) lendiff = 0;

    var display = cm.display;
    if (lendiff && to < display.viewTo &&
        (display.updateLineNumbers == null || display.updateLineNumbers > from))
      display.updateLineNumbers = from;

    cm.curOp.viewChanged = true;

    if (from >= display.viewTo) { // Change after
      if (sawCollapsedSpans && visualLineNo(cm.doc, from) < display.viewTo)
        resetView(cm);
    } else if (to <= display.viewFrom) { // Change before
      if (sawCollapsedSpans && visualLineEndNo(cm.doc, to + lendiff) > display.viewFrom) {
        resetView(cm);
      } else {
        display.viewFrom += lendiff;
        display.viewTo += lendiff;
      }
    } else if (from <= display.viewFrom && to >= display.viewTo) { // Full overlap
      resetView(cm);
    } else if (from <= display.viewFrom) { // Top overlap
      var cut = viewCuttingPoint(cm, to, to + lendiff, 1);
      if (cut) {
        display.view = display.view.slice(cut.index);
        display.viewFrom = cut.lineN;
        display.viewTo += lendiff;
      } else {
        resetView(cm);
      }
    } else if (to >= display.viewTo) { // Bottom overlap
      var cut = viewCuttingPoint(cm, from, from, -1);
      if (cut) {
        display.view = display.view.slice(0, cut.index);
        display.viewTo = cut.lineN;
      } else {
        resetView(cm);
      }
    } else { // Gap in the middle
      var cutTop = viewCuttingPoint(cm, from, from, -1);
      var cutBot = viewCuttingPoint(cm, to, to + lendiff, 1);
      if (cutTop && cutBot) {
        display.view = display.view.slice(0, cutTop.index)
          .concat(buildViewArray(cm, cutTop.lineN, cutBot.lineN))
          .concat(display.view.slice(cutBot.index));
        display.viewTo += lendiff;
      } else {
        resetView(cm);
      }
    }

    var ext = display.externalMeasured;
    if (ext) {
      if (to < ext.lineN)
        ext.lineN += lendiff;
      else if (from < ext.lineN + ext.size)
        display.externalMeasured = null;
    }
  }

  // Register a change to a single line. Type must be one of "text",
  // "gutter", "class", "widget"
  function regLineChange(cm, line, type) {
    cm.curOp.viewChanged = true;
    var display = cm.display, ext = cm.display.externalMeasured;
    if (ext && line >= ext.lineN && line < ext.lineN + ext.size)
      display.externalMeasured = null;

    if (line < display.viewFrom || line >= display.viewTo) return;
    var lineView = display.view[findViewIndex(cm, line)];
    if (lineView.node == null) return;
    var arr = lineView.changes || (lineView.changes = []);
    if (indexOf(arr, type) == -1) arr.push(type);
  }

  // Clear the view.
  function resetView(cm) {
    cm.display.viewFrom = cm.display.viewTo = cm.doc.first;
    cm.display.view = [];
    cm.display.viewOffset = 0;
  }

  // Find the view element corresponding to a given line. Return null
  // when the line isn't visible.
  function findViewIndex(cm, n) {
    if (n >= cm.display.viewTo) return null;
    n -= cm.display.viewFrom;
    if (n < 0) return null;
    var view = cm.display.view;
    for (var i = 0; i < view.length; i++) {
      n -= view[i].size;
      if (n < 0) return i;
    }
  }

  function viewCuttingPoint(cm, oldN, newN, dir) {
    var index = findViewIndex(cm, oldN), diff, view = cm.display.view;
    if (!sawCollapsedSpans || newN == cm.doc.first + cm.doc.size)
      return {index: index, lineN: newN};
    for (var i = 0, n = cm.display.viewFrom; i < index; i++)
      n += view[i].size;
    if (n != oldN) {
      if (dir > 0) {
        if (index == view.length - 1) return null;
        diff = (n + view[index].size) - oldN;
        index++;
      } else {
        diff = n - oldN;
      }
      oldN += diff; newN += diff;
    }
    while (visualLineNo(cm.doc, newN) != newN) {
      if (index == (dir < 0 ? 0 : view.length - 1)) return null;
      newN += dir * view[index - (dir < 0 ? 1 : 0)].size;
      index += dir;
    }
    return {index: index, lineN: newN};
  }

  // Force the view to cover a given range, adding empty view element
  // or clipping off existing ones as needed.
  function adjustView(cm, from, to) {
    var display = cm.display, view = display.view;
    if (view.length == 0 || from >= display.viewTo || to <= display.viewFrom) {
      display.view = buildViewArray(cm, from, to);
      display.viewFrom = from;
    } else {
      if (display.viewFrom > from)
        display.view = buildViewArray(cm, from, display.viewFrom).concat(display.view);
      else if (display.viewFrom < from)
        display.view = display.view.slice(findViewIndex(cm, from));
      display.viewFrom = from;
      if (display.viewTo < to)
        display.view = display.view.concat(buildViewArray(cm, display.viewTo, to));
      else if (display.viewTo > to)
        display.view = display.view.slice(0, findViewIndex(cm, to));
    }
    display.viewTo = to;
  }

  // Count the number of lines in the view whose DOM representation is
  // out of date (or nonexistent).
  function countDirtyView(cm) {
    var view = cm.display.view, dirty = 0;
    for (var i = 0; i < view.length; i++) {
      var lineView = view[i];
      if (!lineView.hidden && (!lineView.node || lineView.changes)) ++dirty;
    }
    return dirty;
  }

  // EVENT HANDLERS

  // Attach the necessary event handlers when initializing the editor
  function registerEventHandlers(cm) {
    var d = cm.display;
    on(d.scroller, "mousedown", operation(cm, onMouseDown));
    // Older IE's will not fire a second mousedown for a double click
    if (ie && ie_version < 11)
      on(d.scroller, "dblclick", operation(cm, function(e) {
        if (signalDOMEvent(cm, e)) return;
        var pos = posFromMouse(cm, e);
        if (!pos || clickInGutter(cm, e) || eventInWidget(cm.display, e)) return;
        e_preventDefault(e);
        var word = cm.findWordAt(pos);
        extendSelection(cm.doc, word.anchor, word.head);
      }));
    else
      on(d.scroller, "dblclick", function(e) { signalDOMEvent(cm, e) || e_preventDefault(e); });
    // Some browsers fire contextmenu *after* opening the menu, at
    // which point we can't mess with it anymore. Context menu is
    // handled in onMouseDown for these browsers.
    if (!captureRightClick) on(d.scroller, "contextmenu", function(e) {onContextMenu(cm, e);});

    // Used to suppress mouse event handling when a touch happens
    var touchFinished, prevTouch = {end: 0};
    function finishTouch() {
      if (d.activeTouch) {
        touchFinished = setTimeout(function() {d.activeTouch = null;}, 1000);
        prevTouch = d.activeTouch;
        prevTouch.end = +new Date;
      }
    };
    function isMouseLikeTouchEvent(e) {
      if (e.touches.length != 1) return false;
      var touch = e.touches[0];
      return touch.radiusX <= 1 && touch.radiusY <= 1;
    }
    function farAway(touch, other) {
      if (other.left == null) return true;
      var dx = other.left - touch.left, dy = other.top - touch.top;
      return dx * dx + dy * dy > 20 * 20;
    }
    on(d.scroller, "touchstart", function(e) {
      if (!isMouseLikeTouchEvent(e)) {
        clearTimeout(touchFinished);
        var now = +new Date;
        d.activeTouch = {start: now, moved: false,
                         prev: now - prevTouch.end <= 300 ? prevTouch : null};
        if (e.touches.length == 1) {
          d.activeTouch.left = e.touches[0].pageX;
          d.activeTouch.top = e.touches[0].pageY;
        }
      }
    });
    on(d.scroller, "touchmove", function() {
      if (d.activeTouch) d.activeTouch.moved = true;
    });
    on(d.scroller, "touchend", function(e) {
      var touch = d.activeTouch;
      if (touch && !eventInWidget(d, e) && touch.left != null &&
          !touch.moved && new Date - touch.start < 300) {
        var pos = cm.coordsChar(d.activeTouch, "page"), range;
        if (!touch.prev || farAway(touch, touch.prev)) // Single tap
          range = new Range(pos, pos);
        else if (!touch.prev.prev || farAway(touch, touch.prev.prev)) // Double tap
          range = cm.findWordAt(pos);
        else // Triple tap
          range = new Range(Pos(pos.line, 0), clipPos(cm.doc, Pos(pos.line + 1, 0)));
        cm.setSelection(range.anchor, range.head);
        cm.focus();
        e_preventDefault(e);
      }
      finishTouch();
    });
    on(d.scroller, "touchcancel", finishTouch);

    // Sync scrolling between fake scrollbars and real scrollable
    // area, ensure viewport is updated when scrolling.
    on(d.scroller, "scroll", function() {
      if (d.scroller.clientHeight) {
        setScrollTop(cm, d.scroller.scrollTop);
        setScrollLeft(cm, d.scroller.scrollLeft, true);
        signal(cm, "scroll", cm);
      }
    });

    // Listen to wheel events in order to try and update the viewport on time.
    on(d.scroller, "mousewheel", function(e){onScrollWheel(cm, e);});
    on(d.scroller, "DOMMouseScroll", function(e){onScrollWheel(cm, e);});

    // Prevent wrapper from ever scrolling
    on(d.wrapper, "scroll", function() { d.wrapper.scrollTop = d.wrapper.scrollLeft = 0; });

    d.dragFunctions = {
      simple: function(e) {if (!signalDOMEvent(cm, e)) e_stop(e);},
      start: function(e){onDragStart(cm, e);},
      drop: operation(cm, onDrop)
    };

    var inp = d.input.getField();
    on(inp, "keyup", function(e) { onKeyUp.call(cm, e); });
    on(inp, "keydown", operation(cm, onKeyDown));
    on(inp, "keypress", operation(cm, onKeyPress));
    on(inp, "focus", bind(onFocus, cm));
    on(inp, "blur", bind(onBlur, cm));
  }

  function dragDropChanged(cm, value, old) {
    var wasOn = old && old != CodeMirror.Init;
    if (!value != !wasOn) {
      var funcs = cm.display.dragFunctions;
      var toggle = value ? on : off;
      toggle(cm.display.scroller, "dragstart", funcs.start);
      toggle(cm.display.scroller, "dragenter", funcs.simple);
      toggle(cm.display.scroller, "dragover", funcs.simple);
      toggle(cm.display.scroller, "drop", funcs.drop);
    }
  }

  // Called when the window resizes
  function onResize(cm) {
    var d = cm.display;
    if (d.lastWrapHeight == d.wrapper.clientHeight && d.lastWrapWidth == d.wrapper.clientWidth)
      return;
    // Might be a text scaling operation, clear size caches.
    d.cachedCharWidth = d.cachedTextHeight = d.cachedPaddingH = null;
    d.scrollbarsClipped = false;
    cm.setSize();
  }

  // MOUSE EVENTS

  // Return true when the given mouse event happened in a widget
  function eventInWidget(display, e) {
    for (var n = e_target(e); n != display.wrapper; n = n.parentNode) {
      if (!n || (n.nodeType == 1 && n.getAttribute("cm-ignore-events") == "true") ||
          (n.parentNode == display.sizer && n != display.mover))
        return true;
    }
  }

  // Given a mouse event, find the corresponding position. If liberal
  // is false, it checks whether a gutter or scrollbar was clicked,
  // and returns null if it was. forRect is used by rectangular
  // selections, and tries to estimate a character position even for
  // coordinates beyond the right of the text.
  function posFromMouse(cm, e, liberal, forRect) {
    var display = cm.display;
    if (!liberal && e_target(e).getAttribute("cm-not-content") == "true") return null;

    var x, y, space = display.lineSpace.getBoundingClientRect();
    // Fails unpredictably on IE[67] when mouse is dragged around quickly.
    try { x = e.clientX - space.left; y = e.clientY - space.top; }
    catch (e) { return null; }
    var coords = coordsChar(cm, x, y), line;
    if (forRect && coords.xRel == 1 && (line = getLine(cm.doc, coords.line).text).length == coords.ch) {
      var colDiff = countColumn(line, line.length, cm.options.tabSize) - line.length;
      coords = Pos(coords.line, Math.max(0, Math.round((x - paddingH(cm.display).left) / charWidth(cm.display)) - colDiff));
    }
    return coords;
  }

  // A mouse down can be a single click, double click, triple click,
  // start of selection drag, start of text drag, new cursor
  // (ctrl-click), rectangle drag (alt-drag), or xwin
  // middle-click-paste. Or it might be a click on something we should
  // not interfere with, such as a scrollbar or widget.
  function onMouseDown(e) {
    var cm = this, display = cm.display;
    if (display.activeTouch && display.input.supportsTouch() || signalDOMEvent(cm, e)) return;
    display.shift = e.shiftKey;

    if (eventInWidget(display, e)) {
      if (!webkit) {
        // Briefly turn off draggability, to allow widgets to do
        // normal dragging things.
        display.scroller.draggable = false;
        setTimeout(function(){display.scroller.draggable = true;}, 100);
      }
      return;
    }
    if (clickInGutter(cm, e)) return;
    var start = posFromMouse(cm, e);
    window.focus();

    switch (e_button(e)) {
    case 1:
      if (start)
        leftButtonDown(cm, e, start);
      else if (e_target(e) == display.scroller)
        e_preventDefault(e);
      break;
    case 2:
      if (webkit) cm.state.lastMiddleDown = +new Date;
      if (start) extendSelection(cm.doc, start);
      setTimeout(function() {display.input.focus();}, 20);
      e_preventDefault(e);
      break;
    case 3:
      if (captureRightClick) onContextMenu(cm, e);
      else delayBlurEvent(cm);
      break;
    }
  }

  var lastClick, lastDoubleClick;
  function leftButtonDown(cm, e, start) {
    if (ie) setTimeout(bind(ensureFocus, cm), 0);
    else cm.curOp.focus = activeElt();

    var now = +new Date, type;
    if (lastDoubleClick && lastDoubleClick.time > now - 400 && cmp(lastDoubleClick.pos, start) == 0) {
      type = "triple";
    } else if (lastClick && lastClick.time > now - 400 && cmp(lastClick.pos, start) == 0) {
      type = "double";
      lastDoubleClick = {time: now, pos: start};
    } else {
      type = "single";
      lastClick = {time: now, pos: start};
    }

    var sel = cm.doc.sel, modifier = mac ? e.metaKey : e.ctrlKey, contained;
    if (cm.options.dragDrop && dragAndDrop && !isReadOnly(cm) &&
        type == "single" && (contained = sel.contains(start)) > -1 &&
        (cmp((contained = sel.ranges[contained]).from(), start) < 0 || start.xRel > 0) &&
        (cmp(contained.to(), start) > 0 || start.xRel < 0))
      leftButtonStartDrag(cm, e, start, modifier);
    else
      leftButtonSelect(cm, e, start, type, modifier);
  }

  // Start a text drag. When it ends, see if any dragging actually
  // happen, and treat as a click if it didn't.
  function leftButtonStartDrag(cm, e, start, modifier) {
    var display = cm.display, startTime = +new Date;
    var dragEnd = operation(cm, function(e2) {
      if (webkit) display.scroller.draggable = false;
      cm.state.draggingText = false;
      off(document, "mouseup", dragEnd);
      off(display.scroller, "drop", dragEnd);
      if (Math.abs(e.clientX - e2.clientX) + Math.abs(e.clientY - e2.clientY) < 10) {
        e_preventDefault(e2);
        if (!modifier && +new Date - 200 < startTime)
          extendSelection(cm.doc, start);
        // Work around unexplainable focus problem in IE9 (#2127) and Chrome (#3081)
        if (webkit || ie && ie_version == 9)
          setTimeout(function() {document.body.focus(); display.input.focus();}, 20);
        else
          display.input.focus();
      }
    });
    // Let the drag handler handle this.
    if (webkit) display.scroller.draggable = true;
    cm.state.draggingText = dragEnd;
    // IE's approach to draggable
    if (display.scroller.dragDrop) display.scroller.dragDrop();
    on(document, "mouseup", dragEnd);
    on(display.scroller, "drop", dragEnd);
  }

  // Normal selection, as opposed to text dragging.
  function leftButtonSelect(cm, e, start, type, addNew) {
    var display = cm.display, doc = cm.doc;
    e_preventDefault(e);

    var ourRange, ourIndex, startSel = doc.sel, ranges = startSel.ranges;
    if (addNew && !e.shiftKey) {
      ourIndex = doc.sel.contains(start);
      if (ourIndex > -1)
        ourRange = ranges[ourIndex];
      else
        ourRange = new Range(start, start);
    } else {
      ourRange = doc.sel.primary();
      ourIndex = doc.sel.primIndex;
    }

    if (e.altKey) {
      type = "rect";
      if (!addNew) ourRange = new Range(start, start);
      start = posFromMouse(cm, e, true, true);
      ourIndex = -1;
    } else if (type == "double") {
      var word = cm.findWordAt(start);
      if (cm.display.shift || doc.extend)
        ourRange = extendRange(doc, ourRange, word.anchor, word.head);
      else
        ourRange = word;
    } else if (type == "triple") {
      var line = new Range(Pos(start.line, 0), clipPos(doc, Pos(start.line + 1, 0)));
      if (cm.display.shift || doc.extend)
        ourRange = extendRange(doc, ourRange, line.anchor, line.head);
      else
        ourRange = line;
    } else {
      ourRange = extendRange(doc, ourRange, start);
    }

    if (!addNew) {
      ourIndex = 0;
      setSelection(doc, new Selection([ourRange], 0), sel_mouse);
      startSel = doc.sel;
    } else if (ourIndex == -1) {
      ourIndex = ranges.length;
      setSelection(doc, normalizeSelection(ranges.concat([ourRange]), ourIndex),
                   {scroll: false, origin: "*mouse"});
    } else if (ranges.length > 1 && ranges[ourIndex].empty() && type == "single" && !e.shiftKey) {
      setSelection(doc, normalizeSelection(ranges.slice(0, ourIndex).concat(ranges.slice(ourIndex + 1)), 0));
      startSel = doc.sel;
    } else {
      replaceOneSelection(doc, ourIndex, ourRange, sel_mouse);
    }

    var lastPos = start;
    function extendTo(pos) {
      if (cmp(lastPos, pos) == 0) return;
      lastPos = pos;

      if (type == "rect") {
        var ranges = [], tabSize = cm.options.tabSize;
        var startCol = countColumn(getLine(doc, start.line).text, start.ch, tabSize);
        var posCol = countColumn(getLine(doc, pos.line).text, pos.ch, tabSize);
        var left = Math.min(startCol, posCol), right = Math.max(startCol, posCol);
        for (var line = Math.min(start.line, pos.line), end = Math.min(cm.lastLine(), Math.max(start.line, pos.line));
             line <= end; line++) {
          var text = getLine(doc, line).text, leftPos = findColumn(text, left, tabSize);
          if (left == right)
            ranges.push(new Range(Pos(line, leftPos), Pos(line, leftPos)));
          else if (text.length > leftPos)
            ranges.push(new Range(Pos(line, leftPos), Pos(line, findColumn(text, right, tabSize))));
        }
        if (!ranges.length) ranges.push(new Range(start, start));
        setSelection(doc, normalizeSelection(startSel.ranges.slice(0, ourIndex).concat(ranges), ourIndex),
                     {origin: "*mouse", scroll: false});
        cm.scrollIntoView(pos);
      } else {
        var oldRange = ourRange;
        var anchor = oldRange.anchor, head = pos;
        if (type != "single") {
          if (type == "double")
            var range = cm.findWordAt(pos);
          else
            var range = new Range(Pos(pos.line, 0), clipPos(doc, Pos(pos.line + 1, 0)));
          if (cmp(range.anchor, anchor) > 0) {
            head = range.head;
            anchor = minPos(oldRange.from(), range.anchor);
          } else {
            head = range.anchor;
            anchor = maxPos(oldRange.to(), range.head);
          }
        }
        var ranges = startSel.ranges.slice(0);
        ranges[ourIndex] = new Range(clipPos(doc, anchor), head);
        setSelection(doc, normalizeSelection(ranges, ourIndex), sel_mouse);
      }
    }

    var editorSize = display.wrapper.getBoundingClientRect();
    // Used to ensure timeout re-tries don't fire when another extend
    // happened in the meantime (clearTimeout isn't reliable -- at
    // least on Chrome, the timeouts still happen even when cleared,
    // if the clear happens after their scheduled firing time).
    var counter = 0;

    function extend(e) {
      var curCount = ++counter;
      var cur = posFromMouse(cm, e, true, type == "rect");
      if (!cur) return;
      if (cmp(cur, lastPos) != 0) {
        cm.curOp.focus = activeElt();
        extendTo(cur);
        var visible = visibleLines(display, doc);
        if (cur.line >= visible.to || cur.line < visible.from)
          setTimeout(operation(cm, function(){if (counter == curCount) extend(e);}), 150);
      } else {
        var outside = e.clientY < editorSize.top ? -20 : e.clientY > editorSize.bottom ? 20 : 0;
        if (outside) setTimeout(operation(cm, function() {
          if (counter != curCount) return;
          display.scroller.scrollTop += outside;
          extend(e);
        }), 50);
      }
    }

    function done(e) {
      counter = Infinity;
      e_preventDefault(e);
      display.input.focus();
      off(document, "mousemove", move);
      off(document, "mouseup", up);
      doc.history.lastSelOrigin = null;
    }

    var move = operation(cm, function(e) {
      if (!e_button(e)) done(e);
      else extend(e);
    });
    var up = operation(cm, done);
    on(document, "mousemove", move);
    on(document, "mouseup", up);
  }

  // Determines whether an event happened in the gutter, and fires the
  // handlers for the corresponding event.
  function gutterEvent(cm, e, type, prevent, signalfn) {
    try { var mX = e.clientX, mY = e.clientY; }
    catch(e) { return false; }
    if (mX >= Math.floor(cm.display.gutters.getBoundingClientRect().right)) return false;
    if (prevent) e_preventDefault(e);

    var display = cm.display;
    var lineBox = display.lineDiv.getBoundingClientRect();

    if (mY > lineBox.bottom || !hasHandler(cm, type)) return e_defaultPrevented(e);
    mY -= lineBox.top - display.viewOffset;

    for (var i = 0; i < cm.options.gutters.length; ++i) {
      var g = display.gutters.childNodes[i];
      if (g && g.getBoundingClientRect().right >= mX) {
        var line = lineAtHeight(cm.doc, mY);
        var gutter = cm.options.gutters[i];
        signalfn(cm, type, cm, line, gutter, e);
        return e_defaultPrevented(e);
      }
    }
  }

  function clickInGutter(cm, e) {
    return gutterEvent(cm, e, "gutterClick", true, signalLater);
  }

  // Kludge to work around strange IE behavior where it'll sometimes
  // re-fire a series of drag-related events right after the drop (#1551)
  var lastDrop = 0;

  function onDrop(e) {
    var cm = this;
    if (signalDOMEvent(cm, e) || eventInWidget(cm.display, e))
      return;
    e_preventDefault(e);
    if (ie) lastDrop = +new Date;
    var pos = posFromMouse(cm, e, true), files = e.dataTransfer.files;
    if (!pos || isReadOnly(cm)) return;
    // Might be a file drop, in which case we simply extract the text
    // and insert it.
    if (files && files.length && window.FileReader && window.File) {
      var n = files.length, text = Array(n), read = 0;
      var loadFile = function(file, i) {
        var reader = new FileReader;
        reader.onload = operation(cm, function() {
          text[i] = reader.result;
          if (++read == n) {
            pos = clipPos(cm.doc, pos);
            var change = {from: pos, to: pos,
                          text: cm.doc.splitLines(text.join(cm.doc.lineSeparator())),
                          origin: "paste"};
            makeChange(cm.doc, change);
            setSelectionReplaceHistory(cm.doc, simpleSelection(pos, changeEnd(change)));
          }
        });
        reader.readAsText(file);
      };
      for (var i = 0; i < n; ++i) loadFile(files[i], i);
    } else { // Normal drop
      // Don't do a replace if the drop happened inside of the selected text.
      if (cm.state.draggingText && cm.doc.sel.contains(pos) > -1) {
        cm.state.draggingText(e);
        // Ensure the editor is re-focused
        setTimeout(function() {cm.display.input.focus();}, 20);
        return;
      }
      try {
        var text = e.dataTransfer.getData("Text");
        if (text) {
          if (cm.state.draggingText && !(mac ? e.altKey : e.ctrlKey))
            var selected = cm.listSelections();
          setSelectionNoUndo(cm.doc, simpleSelection(pos, pos));
          if (selected) for (var i = 0; i < selected.length; ++i)
            replaceRange(cm.doc, "", selected[i].anchor, selected[i].head, "drag");
          cm.replaceSelection(text, "around", "paste");
          cm.display.input.focus();
        }
      }
      catch(e){}
    }
  }

  function onDragStart(cm, e) {
    if (ie && (!cm.state.draggingText || +new Date - lastDrop < 100)) { e_stop(e); return; }
    if (signalDOMEvent(cm, e) || eventInWidget(cm.display, e)) return;

    e.dataTransfer.setData("Text", cm.getSelection());

    // Use dummy image instead of default browsers image.
    // Recent Safari (~6.0.2) have a tendency to segfault when this happens, so we don't do it there.
    if (e.dataTransfer.setDragImage && !safari) {
      var img = elt("img", null, null, "position: fixed; left: 0; top: 0;");
      img.src = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
      if (presto) {
        img.width = img.height = 1;
        cm.display.wrapper.appendChild(img);
        // Force a relayout, or Opera won't use our image for some obscure reason
        img._top = img.offsetTop;
      }
      e.dataTransfer.setDragImage(img, 0, 0);
      if (presto) img.parentNode.removeChild(img);
    }
  }

  // SCROLL EVENTS

  // Sync the scrollable area and scrollbars, ensure the viewport
  // covers the visible area.
  function setScrollTop(cm, val) {
    if (Math.abs(cm.doc.scrollTop - val) < 2) return;
    cm.doc.scrollTop = val;
    if (!gecko) updateDisplaySimple(cm, {top: val});
    if (cm.display.scroller.scrollTop != val) cm.display.scroller.scrollTop = val;
    cm.display.scrollbars.setScrollTop(val);
    if (gecko) updateDisplaySimple(cm);
    startWorker(cm, 100);
  }
  // Sync scroller and scrollbar, ensure the gutter elements are
  // aligned.
  function setScrollLeft(cm, val, isScroller) {
    if (isScroller ? val == cm.doc.scrollLeft : Math.abs(cm.doc.scrollLeft - val) < 2) return;
    val = Math.min(val, cm.display.scroller.scrollWidth - cm.display.scroller.clientWidth);
    cm.doc.scrollLeft = val;
    alignHorizontally(cm);
    if (cm.display.scroller.scrollLeft != val) cm.display.scroller.scrollLeft = val;
    cm.display.scrollbars.setScrollLeft(val);
  }

  // Since the delta values reported on mouse wheel events are
  // unstandardized between browsers and even browser versions, and
  // generally horribly unpredictable, this code starts by measuring
  // the scroll effect that the first few mouse wheel events have,
  // and, from that, detects the way it can convert deltas to pixel
  // offsets afterwards.
  //
  // The reason we want to know the amount a wheel event will scroll
  // is that it gives us a chance to update the display before the
  // actual scrolling happens, reducing flickering.

  var wheelSamples = 0, wheelPixelsPerUnit = null;
  // Fill in a browser-detected starting value on browsers where we
  // know one. These don't have to be accurate -- the result of them
  // being wrong would just be a slight flicker on the first wheel
  // scroll (if it is large enough).
  if (ie) wheelPixelsPerUnit = -.53;
  else if (gecko) wheelPixelsPerUnit = 15;
  else if (chrome) wheelPixelsPerUnit = -.7;
  else if (safari) wheelPixelsPerUnit = -1/3;

  var wheelEventDelta = function(e) {
    var dx = e.wheelDeltaX, dy = e.wheelDeltaY;
    if (dx == null && e.detail && e.axis == e.HORIZONTAL_AXIS) dx = e.detail;
    if (dy == null && e.detail && e.axis == e.VERTICAL_AXIS) dy = e.detail;
    else if (dy == null) dy = e.wheelDelta;
    return {x: dx, y: dy};
  };
  CodeMirror.wheelEventPixels = function(e) {
    var delta = wheelEventDelta(e);
    delta.x *= wheelPixelsPerUnit;
    delta.y *= wheelPixelsPerUnit;
    return delta;
  };

  function onScrollWheel(cm, e) {
    var delta = wheelEventDelta(e), dx = delta.x, dy = delta.y;

    var display = cm.display, scroll = display.scroller;
    // Quit if there's nothing to scroll here
    if (!(dx && scroll.scrollWidth > scroll.clientWidth ||
          dy && scroll.scrollHeight > scroll.clientHeight)) return;

    // Webkit browsers on OS X abort momentum scrolls when the target
    // of the scroll event is removed from the scrollable element.
    // This hack (see related code in patchDisplay) makes sure the
    // element is kept around.
    if (dy && mac && webkit) {
      outer: for (var cur = e.target, view = display.view; cur != scroll; cur = cur.parentNode) {
        for (var i = 0; i < view.length; i++) {
          if (view[i].node == cur) {
            cm.display.currentWheelTarget = cur;
            break outer;
          }
        }
      }
    }

    // On some browsers, horizontal scrolling will cause redraws to
    // happen before the gutter has been realigned, causing it to
    // wriggle around in a most unseemly way. When we have an
    // estimated pixels/delta value, we just handle horizontal
    // scrolling entirely here. It'll be slightly off from native, but
    // better than glitching out.
    if (dx && !gecko && !presto && wheelPixelsPerUnit != null) {
      if (dy)
        setScrollTop(cm, Math.max(0, Math.min(scroll.scrollTop + dy * wheelPixelsPerUnit, scroll.scrollHeight - scroll.clientHeight)));
      setScrollLeft(cm, Math.max(0, Math.min(scroll.scrollLeft + dx * wheelPixelsPerUnit, scroll.scrollWidth - scroll.clientWidth)));
      e_preventDefault(e);
      display.wheelStartX = null; // Abort measurement, if in progress
      return;
    }

    // 'Project' the visible viewport to cover the area that is being
    // scrolled into view (if we know enough to estimate it).
    if (dy && wheelPixelsPerUnit != null) {
      var pixels = dy * wheelPixelsPerUnit;
      var top = cm.doc.scrollTop, bot = top + display.wrapper.clientHeight;
      if (pixels < 0) top = Math.max(0, top + pixels - 50);
      else bot = Math.min(cm.doc.height, bot + pixels + 50);
      updateDisplaySimple(cm, {top: top, bottom: bot});
    }

    if (wheelSamples < 20) {
      if (display.wheelStartX == null) {
        display.wheelStartX = scroll.scrollLeft; display.wheelStartY = scroll.scrollTop;
        display.wheelDX = dx; display.wheelDY = dy;
        setTimeout(function() {
          if (display.wheelStartX == null) return;
          var movedX = scroll.scrollLeft - display.wheelStartX;
          var movedY = scroll.scrollTop - display.wheelStartY;
          var sample = (movedY && display.wheelDY && movedY / display.wheelDY) ||
            (movedX && display.wheelDX && movedX / display.wheelDX);
          display.wheelStartX = display.wheelStartY = null;
          if (!sample) return;
          wheelPixelsPerUnit = (wheelPixelsPerUnit * wheelSamples + sample) / (wheelSamples + 1);
          ++wheelSamples;
        }, 200);
      } else {
        display.wheelDX += dx; display.wheelDY += dy;
      }
    }
  }

  // KEY EVENTS

  // Run a handler that was bound to a key.
  function doHandleBinding(cm, bound, dropShift) {
    if (typeof bound == "string") {
      bound = commands[bound];
      if (!bound) return false;
    }
    // Ensure previous input has been read, so that the handler sees a
    // consistent view of the document
    cm.display.input.ensurePolled();
    var prevShift = cm.display.shift, done = false;
    try {
      if (isReadOnly(cm)) cm.state.suppressEdits = true;
      if (dropShift) cm.display.shift = false;
      done = bound(cm) != Pass;
    } finally {
      cm.display.shift = prevShift;
      cm.state.suppressEdits = false;
    }
    return done;
  }

  function lookupKeyForEditor(cm, name, handle) {
    for (var i = 0; i < cm.state.keyMaps.length; i++) {
      var result = lookupKey(name, cm.state.keyMaps[i], handle, cm);
      if (result) return result;
    }
    return (cm.options.extraKeys && lookupKey(name, cm.options.extraKeys, handle, cm))
      || lookupKey(name, cm.options.keyMap, handle, cm);
  }

  var stopSeq = new Delayed;
  function dispatchKey(cm, name, e, handle) {
    var seq = cm.state.keySeq;
    if (seq) {
      if (isModifierKey(name)) return "handled";
      stopSeq.set(50, function() {
        if (cm.state.keySeq == seq) {
          cm.state.keySeq = null;
          cm.display.input.reset();
        }
      });
      name = seq + " " + name;
    }
    var result = lookupKeyForEditor(cm, name, handle);

    if (result == "multi")
      cm.state.keySeq = name;
    if (result == "handled")
      signalLater(cm, "keyHandled", cm, name, e);

    if (result == "handled" || result == "multi") {
      e_preventDefault(e);
      restartBlink(cm);
    }

    if (seq && !result && /\'$/.test(name)) {
      e_preventDefault(e);
      return true;
    }
    return !!result;
  }

  // Handle a key from the keydown event.
  function handleKeyBinding(cm, e) {
    var name = keyName(e, true);
    if (!name) return false;

    if (e.shiftKey && !cm.state.keySeq) {
      // First try to resolve full name (including 'Shift-'). Failing
      // that, see if there is a cursor-motion command (starting with
      // 'go') bound to the keyname without 'Shift-'.
      return dispatchKey(cm, "Shift-" + name, e, function(b) {return doHandleBinding(cm, b, true);})
          || dispatchKey(cm, name, e, function(b) {
               if (typeof b == "string" ? /^go[A-Z]/.test(b) : b.motion)
                 return doHandleBinding(cm, b);
             });
    } else {
      return dispatchKey(cm, name, e, function(b) { return doHandleBinding(cm, b); });
    }
  }

  // Handle a key from the keypress event
  function handleCharBinding(cm, e, ch) {
    return dispatchKey(cm, "'" + ch + "'", e,
                       function(b) { return doHandleBinding(cm, b, true); });
  }

  var lastStoppedKey = null;
  function onKeyDown(e) {
    var cm = this;
    cm.curOp.focus = activeElt();
    if (signalDOMEvent(cm, e)) return;
    // IE does strange things with escape.
    if (ie && ie_version < 11 && e.keyCode == 27) e.returnValue = false;
    var code = e.keyCode;
    cm.display.shift = code == 16 || e.shiftKey;
    var handled = handleKeyBinding(cm, e);
    if (presto) {
      lastStoppedKey = handled ? code : null;
      // Opera has no cut event... we try to at least catch the key combo
      if (!handled && code == 88 && !hasCopyEvent && (mac ? e.metaKey : e.ctrlKey))
        cm.replaceSelection("", null, "cut");
    }

    // Turn mouse into crosshair when Alt is held on Mac.
    if (code == 18 && !/\bCodeMirror-crosshair\b/.test(cm.display.lineDiv.className))
      showCrossHair(cm);
  }

  function showCrossHair(cm) {
    var lineDiv = cm.display.lineDiv;
    addClass(lineDiv, "CodeMirror-crosshair");

    function up(e) {
      if (e.keyCode == 18 || !e.altKey) {
        rmClass(lineDiv, "CodeMirror-crosshair");
        off(document, "keyup", up);
        off(document, "mouseover", up);
      }
    }
    on(document, "keyup", up);
    on(document, "mouseover", up);
  }

  function onKeyUp(e) {
    if (e.keyCode == 16) this.doc.sel.shift = false;
    signalDOMEvent(this, e);
  }

  function onKeyPress(e) {
    var cm = this;
    if (eventInWidget(cm.display, e) || signalDOMEvent(cm, e) || e.ctrlKey && !e.altKey || mac && e.metaKey) return;
    var keyCode = e.keyCode, charCode = e.charCode;
    if (presto && keyCode == lastStoppedKey) {lastStoppedKey = null; e_preventDefault(e); return;}
    if ((presto && (!e.which || e.which < 10)) && handleKeyBinding(cm, e)) return;
    var ch = String.fromCharCode(charCode == null ? keyCode : charCode);
    if (handleCharBinding(cm, e, ch)) return;
    cm.display.input.onKeyPress(e);
  }

  // FOCUS/BLUR EVENTS

  function delayBlurEvent(cm) {
    cm.state.delayingBlurEvent = true;
    setTimeout(function() {
      if (cm.state.delayingBlurEvent) {
        cm.state.delayingBlurEvent = false;
        onBlur(cm);
      }
    }, 100);
  }

  function onFocus(cm) {
    if (cm.state.delayingBlurEvent) cm.state.delayingBlurEvent = false;

    if (cm.options.readOnly == "nocursor") return;
    if (!cm.state.focused) {
      signal(cm, "focus", cm);
      cm.state.focused = true;
      addClass(cm.display.wrapper, "CodeMirror-focused");
      // This test prevents this from firing when a context
      // menu is closed (since the input reset would kill the
      // select-all detection hack)
      if (!cm.curOp && cm.display.selForContextMenu != cm.doc.sel) {
        cm.display.input.reset();
        if (webkit) setTimeout(function() { cm.display.input.reset(true); }, 20); // Issue #1730
      }
      cm.display.input.receivedFocus();
    }
    restartBlink(cm);
  }
  function onBlur(cm) {
    if (cm.state.delayingBlurEvent) return;

    if (cm.state.focused) {
      signal(cm, "blur", cm);
      cm.state.focused = false;
      rmClass(cm.display.wrapper, "CodeMirror-focused");
    }
    clearInterval(cm.display.blinker);
    setTimeout(function() {if (!cm.state.focused) cm.display.shift = false;}, 150);
  }

  // CONTEXT MENU HANDLING

  // To make the context menu work, we need to briefly unhide the
  // textarea (making it as unobtrusive as possible) to let the
  // right-click take effect on it.
  function onContextMenu(cm, e) {
    if (eventInWidget(cm.display, e) || contextMenuInGutter(cm, e)) return;
    cm.display.input.onContextMenu(e);
  }

  function contextMenuInGutter(cm, e) {
    if (!hasHandler(cm, "gutterContextMenu")) return false;
    return gutterEvent(cm, e, "gutterContextMenu", false, signal);
  }

  // UPDATING

  // Compute the position of the end of a change (its 'to' property
  // refers to the pre-change end).
  var changeEnd = CodeMirror.changeEnd = function(change) {
    if (!change.text) return change.to;
    return Pos(change.from.line + change.text.length - 1,
               lst(change.text).length + (change.text.length == 1 ? change.from.ch : 0));
  };

  // Adjust a position to refer to the post-change position of the
  // same text, or the end of the change if the change covers it.
  function adjustForChange(pos, change) {
    if (cmp(pos, change.from) < 0) return pos;
    if (cmp(pos, change.to) <= 0) return changeEnd(change);

    var line = pos.line + change.text.length - (change.to.line - change.from.line) - 1, ch = pos.ch;
    if (pos.line == change.to.line) ch += changeEnd(change).ch - change.to.ch;
    return Pos(line, ch);
  }

  function computeSelAfterChange(doc, change) {
    var out = [];
    for (var i = 0; i < doc.sel.ranges.length; i++) {
      var range = doc.sel.ranges[i];
      out.push(new Range(adjustForChange(range.anchor, change),
                         adjustForChange(range.head, change)));
    }
    return normalizeSelection(out, doc.sel.primIndex);
  }

  function offsetPos(pos, old, nw) {
    if (pos.line == old.line)
      return Pos(nw.line, pos.ch - old.ch + nw.ch);
    else
      return Pos(nw.line + (pos.line - old.line), pos.ch);
  }

  // Used by replaceSelections to allow moving the selection to the
  // start or around the replaced test. Hint may be "start" or "around".
  function computeReplacedSel(doc, changes, hint) {
    var out = [];
    var oldPrev = Pos(doc.first, 0), newPrev = oldPrev;
    for (var i = 0; i < changes.length; i++) {
      var change = changes[i];
      var from = offsetPos(change.from, oldPrev, newPrev);
      var to = offsetPos(changeEnd(change), oldPrev, newPrev);
      oldPrev = change.to;
      newPrev = to;
      if (hint == "around") {
        var range = doc.sel.ranges[i], inv = cmp(range.head, range.anchor) < 0;
        out[i] = new Range(inv ? to : from, inv ? from : to);
      } else {
        out[i] = new Range(from, from);
      }
    }
    return new Selection(out, doc.sel.primIndex);
  }

  // Allow "beforeChange" event handlers to influence a change
  function filterChange(doc, change, update) {
    var obj = {
      canceled: false,
      from: change.from,
      to: change.to,
      text: change.text,
      origin: change.origin,
      cancel: function() { this.canceled = true; }
    };
    if (update) obj.update = function(from, to, text, origin) {
      if (from) this.from = clipPos(doc, from);
      if (to) this.to = clipPos(doc, to);
      if (text) this.text = text;
      if (origin !== undefined) this.origin = origin;
    };
    signal(doc, "beforeChange", doc, obj);
    if (doc.cm) signal(doc.cm, "beforeChange", doc.cm, obj);

    if (obj.canceled) return null;
    return {from: obj.from, to: obj.to, text: obj.text, origin: obj.origin};
  }

  // Apply a change to a document, and add it to the document's
  // history, and propagating it to all linked documents.
  function makeChange(doc, change, ignoreReadOnly) {
    if (doc.cm) {
      if (!doc.cm.curOp) return operation(doc.cm, makeChange)(doc, change, ignoreReadOnly);
      if (doc.cm.state.suppressEdits) return;
    }

    if (hasHandler(doc, "beforeChange") || doc.cm && hasHandler(doc.cm, "beforeChange")) {
      change = filterChange(doc, change, true);
      if (!change) return;
    }

    // Possibly split or suppress the update based on the presence
    // of read-only spans in its range.
    var split = sawReadOnlySpans && !ignoreReadOnly && removeReadOnlyRanges(doc, change.from, change.to);
    if (split) {
      for (var i = split.length - 1; i >= 0; --i)
        makeChangeInner(doc, {from: split[i].from, to: split[i].to, text: i ? [""] : change.text});
    } else {
      makeChangeInner(doc, change);
    }
  }

  function makeChangeInner(doc, change) {
    if (change.text.length == 1 && change.text[0] == "" && cmp(change.from, change.to) == 0) return;
    var selAfter = computeSelAfterChange(doc, change);
    addChangeToHistory(doc, change, selAfter, doc.cm ? doc.cm.curOp.id : NaN);

    makeChangeSingleDoc(doc, change, selAfter, stretchSpansOverChange(doc, change));
    var rebased = [];

    linkedDocs(doc, function(doc, sharedHist) {
      if (!sharedHist && indexOf(rebased, doc.history) == -1) {
        rebaseHist(doc.history, change);
        rebased.push(doc.history);
      }
      makeChangeSingleDoc(doc, change, null, stretchSpansOverChange(doc, change));
    });
  }

  // Revert a change stored in a document's history.
  function makeChangeFromHistory(doc, type, allowSelectionOnly) {
    if (doc.cm && doc.cm.state.suppressEdits) return;

    var hist = doc.history, event, selAfter = doc.sel;
    var source = type == "undo" ? hist.done : hist.undone, dest = type == "undo" ? hist.undone : hist.done;

    // Verify that there is a useable event (so that ctrl-z won't
    // needlessly clear selection events)
    for (var i = 0; i < source.length; i++) {
      event = source[i];
      if (allowSelectionOnly ? event.ranges && !event.equals(doc.sel) : !event.ranges)
        break;
    }
    if (i == source.length) return;
    hist.lastOrigin = hist.lastSelOrigin = null;

    for (;;) {
      event = source.pop();
      if (event.ranges) {
        pushSelectionToHistory(event, dest);
        if (allowSelectionOnly && !event.equals(doc.sel)) {
          setSelection(doc, event, {clearRedo: false});
          return;
        }
        selAfter = event;
      }
      else break;
    }

    // Build up a reverse change object to add to the opposite history
    // stack (redo when undoing, and vice versa).
    var antiChanges = [];
    pushSelectionToHistory(selAfter, dest);
    dest.push({changes: antiChanges, generation: hist.generation});
    hist.generation = event.generation || ++hist.maxGeneration;

    var filter = hasHandler(doc, "beforeChange") || doc.cm && hasHandler(doc.cm, "beforeChange");

    for (var i = event.changes.length - 1; i >= 0; --i) {
      var change = event.changes[i];
      change.origin = type;
      if (filter && !filterChange(doc, change, false)) {
        source.length = 0;
        return;
      }

      antiChanges.push(historyChangeFromChange(doc, change));

      var after = i ? computeSelAfterChange(doc, change) : lst(source);
      makeChangeSingleDoc(doc, change, after, mergeOldSpans(doc, change));
      if (!i && doc.cm) doc.cm.scrollIntoView({from: change.from, to: changeEnd(change)});
      var rebased = [];

      // Propagate to the linked documents
      linkedDocs(doc, function(doc, sharedHist) {
        if (!sharedHist && indexOf(rebased, doc.history) == -1) {
          rebaseHist(doc.history, change);
          rebased.push(doc.history);
        }
        makeChangeSingleDoc(doc, change, null, mergeOldSpans(doc, change));
      });
    }
  }

  // Sub-views need their line numbers shifted when text is added
  // above or below them in the parent document.
  function shiftDoc(doc, distance) {
    if (distance == 0) return;
    doc.first += distance;
    doc.sel = new Selection(map(doc.sel.ranges, function(range) {
      return new Range(Pos(range.anchor.line + distance, range.anchor.ch),
                       Pos(range.head.line + distance, range.head.ch));
    }), doc.sel.primIndex);
    if (doc.cm) {
      regChange(doc.cm, doc.first, doc.first - distance, distance);
      for (var d = doc.cm.display, l = d.viewFrom; l < d.viewTo; l++)
        regLineChange(doc.cm, l, "gutter");
    }
  }

  // More lower-level change function, handling only a single document
  // (not linked ones).
  function makeChangeSingleDoc(doc, change, selAfter, spans) {
    if (doc.cm && !doc.cm.curOp)
      return operation(doc.cm, makeChangeSingleDoc)(doc, change, selAfter, spans);

    if (change.to.line < doc.first) {
      shiftDoc(doc, change.text.length - 1 - (change.to.line - change.from.line));
      return;
    }
    if (change.from.line > doc.lastLine()) return;

    // Clip the change to the size of this doc
    if (change.from.line < doc.first) {
      var shift = change.text.length - 1 - (doc.first - change.from.line);
      shiftDoc(doc, shift);
      change = {from: Pos(doc.first, 0), to: Pos(change.to.line + shift, change.to.ch),
                text: [lst(change.text)], origin: change.origin};
    }
    var last = doc.lastLine();
    if (change.to.line > last) {
      change = {from: change.from, to: Pos(last, getLine(doc, last).text.length),
                text: [change.text[0]], origin: change.origin};
    }

    change.removed = getBetween(doc, change.from, change.to);

    if (!selAfter) selAfter = computeSelAfterChange(doc, change);
    if (doc.cm) makeChangeSingleDocInEditor(doc.cm, change, spans);
    else updateDoc(doc, change, spans);
    setSelectionNoUndo(doc, selAfter, sel_dontScroll);
  }

  // Handle the interaction of a change to a document with the editor
  // that this document is part of.
  function makeChangeSingleDocInEditor(cm, change, spans) {
    var doc = cm.doc, display = cm.display, from = change.from, to = change.to;

    var recomputeMaxLength = false, checkWidthStart = from.line;
    if (!cm.options.lineWrapping) {
      checkWidthStart = lineNo(visualLine(getLine(doc, from.line)));
      doc.iter(checkWidthStart, to.line + 1, function(line) {
        if (line == display.maxLine) {
          recomputeMaxLength = true;
          return true;
        }
      });
    }

    if (doc.sel.contains(change.from, change.to) > -1)
      signalCursorActivity(cm);

    updateDoc(doc, change, spans, estimateHeight(cm));

    if (!cm.options.lineWrapping) {
      doc.iter(checkWidthStart, from.line + change.text.length, function(line) {
        var len = lineLength(line);
        if (len > display.maxLineLength) {
          display.maxLine = line;
          display.maxLineLength = len;
          display.maxLineChanged = true;
          recomputeMaxLength = false;
        }
      });
      if (recomputeMaxLength) cm.curOp.updateMaxLine = true;
    }

    // Adjust frontier, schedule worker
    doc.frontier = Math.min(doc.frontier, from.line);
    startWorker(cm, 400);

    var lendiff = change.text.length - (to.line - from.line) - 1;
    // Remember that these lines changed, for updating the display
    if (change.full)
      regChange(cm);
    else if (from.line == to.line && change.text.length == 1 && !isWholeLineUpdate(cm.doc, change))
      regLineChange(cm, from.line, "text");
    else
      regChange(cm, from.line, to.line + 1, lendiff);

    var changesHandler = hasHandler(cm, "changes"), changeHandler = hasHandler(cm, "change");
    if (changeHandler || changesHandler) {
      var obj = {
        from: from, to: to,
        text: change.text,
        removed: change.removed,
        origin: change.origin
      };
      if (changeHandler) signalLater(cm, "change", cm, obj);
      if (changesHandler) (cm.curOp.changeObjs || (cm.curOp.changeObjs = [])).push(obj);
    }
    cm.display.selForContextMenu = null;
  }

  function replaceRange(doc, code, from, to, origin) {
    if (!to) to = from;
    if (cmp(to, from) < 0) { var tmp = to; to = from; from = tmp; }
    if (typeof code == "string") code = doc.splitLines(code);
    makeChange(doc, {from: from, to: to, text: code, origin: origin});
  }

  // SCROLLING THINGS INTO VIEW

  // If an editor sits on the top or bottom of the window, partially
  // scrolled out of view, this ensures that the cursor is visible.
  function maybeScrollWindow(cm, coords) {
    if (signalDOMEvent(cm, "scrollCursorIntoView")) return;

    var display = cm.display, box = display.sizer.getBoundingClientRect(), doScroll = null;
    if (coords.top + box.top < 0) doScroll = true;
    else if (coords.bottom + box.top > (window.innerHeight || document.documentElement.clientHeight)) doScroll = false;
    if (doScroll != null && !phantom) {
      var scrollNode = elt("div", "\u200b", null, "position: absolute; top: " +
                           (coords.top - display.viewOffset - paddingTop(cm.display)) + "px; height: " +
                           (coords.bottom - coords.top + scrollGap(cm) + display.barHeight) + "px; left: " +
                           coords.left + "px; width: 2px;");
      cm.display.lineSpace.appendChild(scrollNode);
      scrollNode.scrollIntoView(doScroll);
      cm.display.lineSpace.removeChild(scrollNode);
    }
  }

  // Scroll a given position into view (immediately), verifying that
  // it actually became visible (as line heights are accurately
  // measured, the position of something may 'drift' during drawing).
  function scrollPosIntoView(cm, pos, end, margin) {
    if (margin == null) margin = 0;
    for (var limit = 0; limit < 5; limit++) {
      var changed = false, coords = cursorCoords(cm, pos);
      var endCoords = !end || end == pos ? coords : cursorCoords(cm, end);
      var scrollPos = calculateScrollPos(cm, Math.min(coords.left, endCoords.left),
                                         Math.min(coords.top, endCoords.top) - margin,
                                         Math.max(coords.left, endCoords.left),
                                         Math.max(coords.bottom, endCoords.bottom) + margin);
      var startTop = cm.doc.scrollTop, startLeft = cm.doc.scrollLeft;
      if (scrollPos.scrollTop != null) {
        setScrollTop(cm, scrollPos.scrollTop);
        if (Math.abs(cm.doc.scrollTop - startTop) > 1) changed = true;
      }
      if (scrollPos.scrollLeft != null) {
        setScrollLeft(cm, scrollPos.scrollLeft);
        if (Math.abs(cm.doc.scrollLeft - startLeft) > 1) changed = true;
      }
      if (!changed) break;
    }
    return coords;
  }

  // Scroll a given set of coordinates into view (immediately).
  function scrollIntoView(cm, x1, y1, x2, y2) {
    var scrollPos = calculateScrollPos(cm, x1, y1, x2, y2);
    if (scrollPos.scrollTop != null) setScrollTop(cm, scrollPos.scrollTop);
    if (scrollPos.scrollLeft != null) setScrollLeft(cm, scrollPos.scrollLeft);
  }

  // Calculate a new scroll position needed to scroll the given
  // rectangle into view. Returns an object with scrollTop and
  // scrollLeft properties. When these are undefined, the
  // vertical/horizontal position does not need to be adjusted.
  function calculateScrollPos(cm, x1, y1, x2, y2) {
    var display = cm.display, snapMargin = textHeight(cm.display);
    if (y1 < 0) y1 = 0;
    var screentop = cm.curOp && cm.curOp.scrollTop != null ? cm.curOp.scrollTop : display.scroller.scrollTop;
    var screen = displayHeight(cm), result = {};
    if (y2 - y1 > screen) y2 = y1 + screen;
    var docBottom = cm.doc.height + paddingVert(display);
    var atTop = y1 < snapMargin, atBottom = y2 > docBottom - snapMargin;
    if (y1 < screentop) {
      result.scrollTop = atTop ? 0 : y1;
    } else if (y2 > screentop + screen) {
      var newTop = Math.min(y1, (atBottom ? docBottom : y2) - screen);
      if (newTop != screentop) result.scrollTop = newTop;
    }

    var screenleft = cm.curOp && cm.curOp.scrollLeft != null ? cm.curOp.scrollLeft : display.scroller.scrollLeft;
    var screenw = displayWidth(cm) - (cm.options.fixedGutter ? display.gutters.offsetWidth : 0);
    var tooWide = x2 - x1 > screenw;
    if (tooWide) x2 = x1 + screenw;
    if (x1 < 10)
      result.scrollLeft = 0;
    else if (x1 < screenleft)
      result.scrollLeft = Math.max(0, x1 - (tooWide ? 0 : 10));
    else if (x2 > screenw + screenleft - 3)
      result.scrollLeft = x2 + (tooWide ? 0 : 10) - screenw;
    return result;
  }

  // Store a relative adjustment to the scroll position in the current
  // operation (to be applied when the operation finishes).
  function addToScrollPos(cm, left, top) {
    if (left != null || top != null) resolveScrollToPos(cm);
    if (left != null)
      cm.curOp.scrollLeft = (cm.curOp.scrollLeft == null ? cm.doc.scrollLeft : cm.curOp.scrollLeft) + left;
    if (top != null)
      cm.curOp.scrollTop = (cm.curOp.scrollTop == null ? cm.doc.scrollTop : cm.curOp.scrollTop) + top;
  }

  // Make sure that at the end of the operation the current cursor is
  // shown.
  function ensureCursorVisible(cm) {
    resolveScrollToPos(cm);
    var cur = cm.getCursor(), from = cur, to = cur;
    if (!cm.options.lineWrapping) {
      from = cur.ch ? Pos(cur.line, cur.ch - 1) : cur;
      to = Pos(cur.line, cur.ch + 1);
    }
    cm.curOp.scrollToPos = {from: from, to: to, margin: cm.options.cursorScrollMargin, isCursor: true};
  }

  // When an operation has its scrollToPos property set, and another
  // scroll action is applied before the end of the operation, this
  // 'simulates' scrolling that position into view in a cheap way, so
  // that the effect of intermediate scroll commands is not ignored.
  function resolveScrollToPos(cm) {
    var range = cm.curOp.scrollToPos;
    if (range) {
      cm.curOp.scrollToPos = null;
      var from = estimateCoords(cm, range.from), to = estimateCoords(cm, range.to);
      var sPos = calculateScrollPos(cm, Math.min(from.left, to.left),
                                    Math.min(from.top, to.top) - range.margin,
                                    Math.max(from.right, to.right),
                                    Math.max(from.bottom, to.bottom) + range.margin);
      cm.scrollTo(sPos.scrollLeft, sPos.scrollTop);
    }
  }

  // API UTILITIES

  // Indent the given line. The how parameter can be "smart",
  // "add"/null, "subtract", or "prev". When aggressive is false
  // (typically set to true for forced single-line indents), empty
  // lines are not indented, and places where the mode returns Pass
  // are left alone.
  function indentLine(cm, n, how, aggressive) {
    var doc = cm.doc, state;
    if (how == null) how = "add";
    if (how == "smart") {
      // Fall back to "prev" when the mode doesn't have an indentation
      // method.
      if (!doc.mode.indent) how = "prev";
      else state = getStateBefore(cm, n);
    }

    var tabSize = cm.options.tabSize;
    var line = getLine(doc, n), curSpace = countColumn(line.text, null, tabSize);
    if (line.stateAfter) line.stateAfter = null;
    var curSpaceString = line.text.match(/^\s*/)[0], indentation;
    if (!aggressive && !/\S/.test(line.text)) {
      indentation = 0;
      how = "not";
    } else if (how == "smart") {
      indentation = doc.mode.indent(state, line.text.slice(curSpaceString.length), line.text);
      if (indentation == Pass || indentation > 150) {
        if (!aggressive) return;
        how = "prev";
      }
    }
    if (how == "prev") {
      if (n > doc.first) indentation = countColumn(getLine(doc, n-1).text, null, tabSize);
      else indentation = 0;
    } else if (how == "add") {
      indentation = curSpace + cm.options.indentUnit;
    } else if (how == "subtract") {
      indentation = curSpace - cm.options.indentUnit;
    } else if (typeof how == "number") {
      indentation = curSpace + how;
    }
    indentation = Math.max(0, indentation);

    var indentString = "", pos = 0;
    if (cm.options.indentWithTabs)
      for (var i = Math.floor(indentation / tabSize); i; --i) {pos += tabSize; indentString += "\t";}
    if (pos < indentation) indentString += spaceStr(indentation - pos);

    if (indentString != curSpaceString) {
      replaceRange(doc, indentString, Pos(n, 0), Pos(n, curSpaceString.length), "+input");
      line.stateAfter = null;
      return true;
    } else {
      // Ensure that, if the cursor was in the whitespace at the start
      // of the line, it is moved to the end of that space.
      for (var i = 0; i < doc.sel.ranges.length; i++) {
        var range = doc.sel.ranges[i];
        if (range.head.line == n && range.head.ch < curSpaceString.length) {
          var pos = Pos(n, curSpaceString.length);
          replaceOneSelection(doc, i, new Range(pos, pos));
          break;
        }
      }
    }
  }

  // Utility for applying a change to a line by handle or number,
  // returning the number and optionally registering the line as
  // changed.
  function changeLine(doc, handle, changeType, op) {
    var no = handle, line = handle;
    if (typeof handle == "number") line = getLine(doc, clipLine(doc, handle));
    else no = lineNo(handle);
    if (no == null) return null;
    if (op(line, no) && doc.cm) regLineChange(doc.cm, no, changeType);
    return line;
  }

  // Helper for deleting text near the selection(s), used to implement
  // backspace, delete, and similar functionality.
  function deleteNearSelection(cm, compute) {
    var ranges = cm.doc.sel.ranges, kill = [];
    // Build up a set of ranges to kill first, merging overlapping
    // ranges.
    for (var i = 0; i < ranges.length; i++) {
      var toKill = compute(ranges[i]);
      while (kill.length && cmp(toKill.from, lst(kill).to) <= 0) {
        var replaced = kill.pop();
        if (cmp(replaced.from, toKill.from) < 0) {
          toKill.from = replaced.from;
          break;
        }
      }
      kill.push(toKill);
    }
    // Next, remove those actual ranges.
    runInOp(cm, function() {
      for (var i = kill.length - 1; i >= 0; i--)
        replaceRange(cm.doc, "", kill[i].from, kill[i].to, "+delete");
      ensureCursorVisible(cm);
    });
  }

  // Used for horizontal relative motion. Dir is -1 or 1 (left or
  // right), unit can be "char", "column" (like char, but doesn't
  // cross line boundaries), "word" (across next word), or "group" (to
  // the start of next group of word or non-word-non-whitespace
  // chars). The visually param controls whether, in right-to-left
  // text, direction 1 means to move towards the next index in the
  // string, or towards the character to the right of the current
  // position. The resulting position will have a hitSide=true
  // property if it reached the end of the document.
  function findPosH(doc, pos, dir, unit, visually) {
    var line = pos.line, ch = pos.ch, origDir = dir;
    var lineObj = getLine(doc, line);
    var possible = true;
    function findNextLine() {
      var l = line + dir;
      if (l < doc.first || l >= doc.first + doc.size) return (possible = false);
      line = l;
      return lineObj = getLine(doc, l);
    }
    function moveOnce(boundToLine) {
      var next = (visually ? moveVisually : moveLogically)(lineObj, ch, dir, true);
      if (next == null) {
        if (!boundToLine && findNextLine()) {
          if (visually) ch = (dir < 0 ? lineRight : lineLeft)(lineObj);
          else ch = dir < 0 ? lineObj.text.length : 0;
        } else return (possible = false);
      } else ch = next;
      return true;
    }

    if (unit == "char") moveOnce();
    else if (unit == "column") moveOnce(true);
    else if (unit == "word" || unit == "group") {
      var sawType = null, group = unit == "group";
      var helper = doc.cm && doc.cm.getHelper(pos, "wordChars");
      for (var first = true;; first = false) {
        if (dir < 0 && !moveOnce(!first)) break;
        var cur = lineObj.text.charAt(ch) || "\n";
        var type = isWordChar(cur, helper) ? "w"
          : group && cur == "\n" ? "n"
          : !group || /\s/.test(cur) ? null
          : "p";
        if (group && !first && !type) type = "s";
        if (sawType && sawType != type) {
          if (dir < 0) {dir = 1; moveOnce();}
          break;
        }

        if (type) sawType = type;
        if (dir > 0 && !moveOnce(!first)) break;
      }
    }
    var result = skipAtomic(doc, Pos(line, ch), origDir, true);
    if (!possible) result.hitSide = true;
    return result;
  }

  // For relative vertical movement. Dir may be -1 or 1. Unit can be
  // "page" or "line". The resulting position will have a hitSide=true
  // property if it reached the end of the document.
  function findPosV(cm, pos, dir, unit) {
    var doc = cm.doc, x = pos.left, y;
    if (unit == "page") {
      var pageSize = Math.min(cm.display.wrapper.clientHeight, window.innerHeight || document.documentElement.clientHeight);
      y = pos.top + dir * (pageSize - (dir < 0 ? 1.5 : .5) * textHeight(cm.display));
    } else if (unit == "line") {
      y = dir > 0 ? pos.bottom + 3 : pos.top - 3;
    }
    for (;;) {
      var target = coordsChar(cm, x, y);
      if (!target.outside) break;
      if (dir < 0 ? y <= 0 : y >= doc.height) { target.hitSide = true; break; }
      y += dir * 5;
    }
    return target;
  }

  // EDITOR METHODS

  // The publicly visible API. Note that methodOp(f) means
  // 'wrap f in an operation, performed on its `this` parameter'.

  // This is not the complete set of editor methods. Most of the
  // methods defined on the Doc type are also injected into
  // CodeMirror.prototype, for backwards compatibility and
  // convenience.

  CodeMirror.prototype = {
    constructor: CodeMirror,
    focus: function(){window.focus(); this.display.input.focus();},

    setOption: function(option, value) {
      var options = this.options, old = options[option];
      if (options[option] == value && option != "mode") return;
      options[option] = value;
      if (optionHandlers.hasOwnProperty(option))
        operation(this, optionHandlers[option])(this, value, old);
    },

    getOption: function(option) {return this.options[option];},
    getDoc: function() {return this.doc;},

    addKeyMap: function(map, bottom) {
      this.state.keyMaps[bottom ? "push" : "unshift"](getKeyMap(map));
    },
    removeKeyMap: function(map) {
      var maps = this.state.keyMaps;
      for (var i = 0; i < maps.length; ++i)
        if (maps[i] == map || maps[i].name == map) {
          maps.splice(i, 1);
          return true;
        }
    },

    addOverlay: methodOp(function(spec, options) {
      var mode = spec.token ? spec : CodeMirror.getMode(this.options, spec);
      if (mode.startState) throw new Error("Overlays may not be stateful.");
      this.state.overlays.push({mode: mode, modeSpec: spec, opaque: options && options.opaque});
      this.state.modeGen++;
      regChange(this);
    }),
    removeOverlay: methodOp(function(spec) {
      var overlays = this.state.overlays;
      for (var i = 0; i < overlays.length; ++i) {
        var cur = overlays[i].modeSpec;
        if (cur == spec || typeof spec == "string" && cur.name == spec) {
          overlays.splice(i, 1);
          this.state.modeGen++;
          regChange(this);
          return;
        }
      }
    }),

    indentLine: methodOp(function(n, dir, aggressive) {
      if (typeof dir != "string" && typeof dir != "number") {
        if (dir == null) dir = this.options.smartIndent ? "smart" : "prev";
        else dir = dir ? "add" : "subtract";
      }
      if (isLine(this.doc, n)) indentLine(this, n, dir, aggressive);
    }),
    indentSelection: methodOp(function(how) {
      var ranges = this.doc.sel.ranges, end = -1;
      for (var i = 0; i < ranges.length; i++) {
        var range = ranges[i];
        if (!range.empty()) {
          var from = range.from(), to = range.to();
          var start = Math.max(end, from.line);
          end = Math.min(this.lastLine(), to.line - (to.ch ? 0 : 1)) + 1;
          for (var j = start; j < end; ++j)
            indentLine(this, j, how);
          var newRanges = this.doc.sel.ranges;
          if (from.ch == 0 && ranges.length == newRanges.length && newRanges[i].from().ch > 0)
            replaceOneSelection(this.doc, i, new Range(from, newRanges[i].to()), sel_dontScroll);
        } else if (range.head.line > end) {
          indentLine(this, range.head.line, how, true);
          end = range.head.line;
          if (i == this.doc.sel.primIndex) ensureCursorVisible(this);
        }
      }
    }),

    // Fetch the parser token for a given character. Useful for hacks
    // that want to inspect the mode state (say, for completion).
    getTokenAt: function(pos, precise) {
      return takeToken(this, pos, precise);
    },

    getLineTokens: function(line, precise) {
      return takeToken(this, Pos(line), precise, true);
    },

    getTokenTypeAt: function(pos) {
      pos = clipPos(this.doc, pos);
      var styles = getLineStyles(this, getLine(this.doc, pos.line));
      var before = 0, after = (styles.length - 1) / 2, ch = pos.ch;
      var type;
      if (ch == 0) type = styles[2];
      else for (;;) {
        var mid = (before + after) >> 1;
        if ((mid ? styles[mid * 2 - 1] : 0) >= ch) after = mid;
        else if (styles[mid * 2 + 1] < ch) before = mid + 1;
        else { type = styles[mid * 2 + 2]; break; }
      }
      var cut = type ? type.indexOf("cm-overlay ") : -1;
      return cut < 0 ? type : cut == 0 ? null : type.slice(0, cut - 1);
    },

    getModeAt: function(pos) {
      var mode = this.doc.mode;
      if (!mode.innerMode) return mode;
      return CodeMirror.innerMode(mode, this.getTokenAt(pos).state).mode;
    },

    getHelper: function(pos, type) {
      return this.getHelpers(pos, type)[0];
    },

    getHelpers: function(pos, type) {
      var found = [];
      if (!helpers.hasOwnProperty(type)) return found;
      var help = helpers[type], mode = this.getModeAt(pos);
      if (typeof mode[type] == "string") {
        if (help[mode[type]]) found.push(help[mode[type]]);
      } else if (mode[type]) {
        for (var i = 0; i < mode[type].length; i++) {
          var val = help[mode[type][i]];
          if (val) found.push(val);
        }
      } else if (mode.helperType && help[mode.helperType]) {
        found.push(help[mode.helperType]);
      } else if (help[mode.name]) {
        found.push(help[mode.name]);
      }
      for (var i = 0; i < help._global.length; i++) {
        var cur = help._global[i];
        if (cur.pred(mode, this) && indexOf(found, cur.val) == -1)
          found.push(cur.val);
      }
      return found;
    },

    getStateAfter: function(line, precise) {
      var doc = this.doc;
      line = clipLine(doc, line == null ? doc.first + doc.size - 1: line);
      return getStateBefore(this, line + 1, precise);
    },

    cursorCoords: function(start, mode) {
      var pos, range = this.doc.sel.primary();
      if (start == null) pos = range.head;
      else if (typeof start == "object") pos = clipPos(this.doc, start);
      else pos = start ? range.from() : range.to();
      return cursorCoords(this, pos, mode || "page");
    },

    charCoords: function(pos, mode) {
      return charCoords(this, clipPos(this.doc, pos), mode || "page");
    },

    coordsChar: function(coords, mode) {
      coords = fromCoordSystem(this, coords, mode || "page");
      return coordsChar(this, coords.left, coords.top);
    },

    lineAtHeight: function(height, mode) {
      height = fromCoordSystem(this, {top: height, left: 0}, mode || "page").top;
      return lineAtHeight(this.doc, height + this.display.viewOffset);
    },
    heightAtLine: function(line, mode) {
      var end = false, lineObj;
      if (typeof line == "number") {
        var last = this.doc.first + this.doc.size - 1;
        if (line < this.doc.first) line = this.doc.first;
        else if (line > last) { line = last; end = true; }
        lineObj = getLine(this.doc, line);
      } else {
        lineObj = line;
      }
      return intoCoordSystem(this, lineObj, {top: 0, left: 0}, mode || "page").top +
        (end ? this.doc.height - heightAtLine(lineObj) : 0);
    },

    defaultTextHeight: function() { return textHeight(this.display); },
    defaultCharWidth: function() { return charWidth(this.display); },

    setGutterMarker: methodOp(function(line, gutterID, value) {
      return changeLine(this.doc, line, "gutter", function(line) {
        var markers = line.gutterMarkers || (line.gutterMarkers = {});
        markers[gutterID] = value;
        if (!value && isEmpty(markers)) line.gutterMarkers = null;
        return true;
      });
    }),

    clearGutter: methodOp(function(gutterID) {
      var cm = this, doc = cm.doc, i = doc.first;
      doc.iter(function(line) {
        if (line.gutterMarkers && line.gutterMarkers[gutterID]) {
          line.gutterMarkers[gutterID] = null;
          regLineChange(cm, i, "gutter");
          if (isEmpty(line.gutterMarkers)) line.gutterMarkers = null;
        }
        ++i;
      });
    }),

    lineInfo: function(line) {
      if (typeof line == "number") {
        if (!isLine(this.doc, line)) return null;
        var n = line;
        line = getLine(this.doc, line);
        if (!line) return null;
      } else {
        var n = lineNo(line);
        if (n == null) return null;
      }
      return {line: n, handle: line, text: line.text, gutterMarkers: line.gutterMarkers,
              textClass: line.textClass, bgClass: line.bgClass, wrapClass: line.wrapClass,
              widgets: line.widgets};
    },

    getViewport: function() { return {from: this.display.viewFrom, to: this.display.viewTo};},

    addWidget: function(pos, node, scroll, vert, horiz) {
      var display = this.display;
      pos = cursorCoords(this, clipPos(this.doc, pos));
      var top = pos.bottom, left = pos.left;
      node.style.position = "absolute";
      node.setAttribute("cm-ignore-events", "true");
      this.display.input.setUneditable(node);
      display.sizer.appendChild(node);
      if (vert == "over") {
        top = pos.top;
      } else if (vert == "above" || vert == "near") {
        var vspace = Math.max(display.wrapper.clientHeight, this.doc.height),
        hspace = Math.max(display.sizer.clientWidth, display.lineSpace.clientWidth);
        // Default to positioning above (if specified and possible); otherwise default to positioning below
        if ((vert == 'above' || pos.bottom + node.offsetHeight > vspace) && pos.top > node.offsetHeight)
          top = pos.top - node.offsetHeight;
        else if (pos.bottom + node.offsetHeight <= vspace)
          top = pos.bottom;
        if (left + node.offsetWidth > hspace)
          left = hspace - node.offsetWidth;
      }
      node.style.top = top + "px";
      node.style.left = node.style.right = "";
      if (horiz == "right") {
        left = display.sizer.clientWidth - node.offsetWidth;
        node.style.right = "0px";
      } else {
        if (horiz == "left") left = 0;
        else if (horiz == "middle") left = (display.sizer.clientWidth - node.offsetWidth) / 2;
        node.style.left = left + "px";
      }
      if (scroll)
        scrollIntoView(this, left, top, left + node.offsetWidth, top + node.offsetHeight);
    },

    triggerOnKeyDown: methodOp(onKeyDown),
    triggerOnKeyPress: methodOp(onKeyPress),
    triggerOnKeyUp: onKeyUp,

    execCommand: function(cmd) {
      if (commands.hasOwnProperty(cmd))
        return commands[cmd](this);
    },

    triggerElectric: methodOp(function(text) { triggerElectric(this, text); }),

    findPosH: function(from, amount, unit, visually) {
      var dir = 1;
      if (amount < 0) { dir = -1; amount = -amount; }
      for (var i = 0, cur = clipPos(this.doc, from); i < amount; ++i) {
        cur = findPosH(this.doc, cur, dir, unit, visually);
        if (cur.hitSide) break;
      }
      return cur;
    },

    moveH: methodOp(function(dir, unit) {
      var cm = this;
      cm.extendSelectionsBy(function(range) {
        if (cm.display.shift || cm.doc.extend || range.empty())
          return findPosH(cm.doc, range.head, dir, unit, cm.options.rtlMoveVisually);
        else
          return dir < 0 ? range.from() : range.to();
      }, sel_move);
    }),

    deleteH: methodOp(function(dir, unit) {
      var sel = this.doc.sel, doc = this.doc;
      if (sel.somethingSelected())
        doc.replaceSelection("", null, "+delete");
      else
        deleteNearSelection(this, function(range) {
          var other = findPosH(doc, range.head, dir, unit, false);
          return dir < 0 ? {from: other, to: range.head} : {from: range.head, to: other};
        });
    }),

    findPosV: function(from, amount, unit, goalColumn) {
      var dir = 1, x = goalColumn;
      if (amount < 0) { dir = -1; amount = -amount; }
      for (var i = 0, cur = clipPos(this.doc, from); i < amount; ++i) {
        var coords = cursorCoords(this, cur, "div");
        if (x == null) x = coords.left;
        else coords.left = x;
        cur = findPosV(this, coords, dir, unit);
        if (cur.hitSide) break;
      }
      return cur;
    },

    moveV: methodOp(function(dir, unit) {
      var cm = this, doc = this.doc, goals = [];
      var collapse = !cm.display.shift && !doc.extend && doc.sel.somethingSelected();
      doc.extendSelectionsBy(function(range) {
        if (collapse)
          return dir < 0 ? range.from() : range.to();
        var headPos = cursorCoords(cm, range.head, "div");
        if (range.goalColumn != null) headPos.left = range.goalColumn;
        goals.push(headPos.left);
        var pos = findPosV(cm, headPos, dir, unit);
        if (unit == "page" && range == doc.sel.primary())
          addToScrollPos(cm, null, charCoords(cm, pos, "div").top - headPos.top);
        return pos;
      }, sel_move);
      if (goals.length) for (var i = 0; i < doc.sel.ranges.length; i++)
        doc.sel.ranges[i].goalColumn = goals[i];
    }),

    // Find the word at the given position (as returned by coordsChar).
    findWordAt: function(pos) {
      var doc = this.doc, line = getLine(doc, pos.line).text;
      var start = pos.ch, end = pos.ch;
      if (line) {
        var helper = this.getHelper(pos, "wordChars");
        if ((pos.xRel < 0 || end == line.length) && start) --start; else ++end;
        var startChar = line.charAt(start);
        var check = isWordChar(startChar, helper)
          ? function(ch) { return isWordChar(ch, helper); }
          : /\s/.test(startChar) ? function(ch) {return /\s/.test(ch);}
          : function(ch) {return !/\s/.test(ch) && !isWordChar(ch);};
        while (start > 0 && check(line.charAt(start - 1))) --start;
        while (end < line.length && check(line.charAt(end))) ++end;
      }
      return new Range(Pos(pos.line, start), Pos(pos.line, end));
    },

    toggleOverwrite: function(value) {
      if (value != null && value == this.state.overwrite) return;
      if (this.state.overwrite = !this.state.overwrite)
        addClass(this.display.cursorDiv, "CodeMirror-overwrite");
      else
        rmClass(this.display.cursorDiv, "CodeMirror-overwrite");

      signal(this, "overwriteToggle", this, this.state.overwrite);
    },
    hasFocus: function() { return this.display.input.getField() == activeElt(); },

    scrollTo: methodOp(function(x, y) {
      if (x != null || y != null) resolveScrollToPos(this);
      if (x != null) this.curOp.scrollLeft = x;
      if (y != null) this.curOp.scrollTop = y;
    }),
    getScrollInfo: function() {
      var scroller = this.display.scroller;
      return {left: scroller.scrollLeft, top: scroller.scrollTop,
              height: scroller.scrollHeight - scrollGap(this) - this.display.barHeight,
              width: scroller.scrollWidth - scrollGap(this) - this.display.barWidth,
              clientHeight: displayHeight(this), clientWidth: displayWidth(this)};
    },

    scrollIntoView: methodOp(function(range, margin) {
      if (range == null) {
        range = {from: this.doc.sel.primary().head, to: null};
        if (margin == null) margin = this.options.cursorScrollMargin;
      } else if (typeof range == "number") {
        range = {from: Pos(range, 0), to: null};
      } else if (range.from == null) {
        range = {from: range, to: null};
      }
      if (!range.to) range.to = range.from;
      range.margin = margin || 0;

      if (range.from.line != null) {
        resolveScrollToPos(this);
        this.curOp.scrollToPos = range;
      } else {
        var sPos = calculateScrollPos(this, Math.min(range.from.left, range.to.left),
                                      Math.min(range.from.top, range.to.top) - range.margin,
                                      Math.max(range.from.right, range.to.right),
                                      Math.max(range.from.bottom, range.to.bottom) + range.margin);
        this.scrollTo(sPos.scrollLeft, sPos.scrollTop);
      }
    }),

    setSize: methodOp(function(width, height) {
      var cm = this;
      function interpret(val) {
        return typeof val == "number" || /^\d+$/.test(String(val)) ? val + "px" : val;
      }
      if (width != null) cm.display.wrapper.style.width = interpret(width);
      if (height != null) cm.display.wrapper.style.height = interpret(height);
      if (cm.options.lineWrapping) clearLineMeasurementCache(this);
      var lineNo = cm.display.viewFrom;
      cm.doc.iter(lineNo, cm.display.viewTo, function(line) {
        if (line.widgets) for (var i = 0; i < line.widgets.length; i++)
          if (line.widgets[i].noHScroll) { regLineChange(cm, lineNo, "widget"); break; }
        ++lineNo;
      });
      cm.curOp.forceUpdate = true;
      signal(cm, "refresh", this);
    }),

    operation: function(f){return runInOp(this, f);},

    refresh: methodOp(function() {
      var oldHeight = this.display.cachedTextHeight;
      regChange(this);
      this.curOp.forceUpdate = true;
      clearCaches(this);
      this.scrollTo(this.doc.scrollLeft, this.doc.scrollTop);
      updateGutterSpace(this);
      if (oldHeight == null || Math.abs(oldHeight - textHeight(this.display)) > .5)
        estimateLineHeights(this);
      signal(this, "refresh", this);
    }),

    swapDoc: methodOp(function(doc) {
      var old = this.doc;
      old.cm = null;
      attachDoc(this, doc);
      clearCaches(this);
      this.display.input.reset();
      this.scrollTo(doc.scrollLeft, doc.scrollTop);
      this.curOp.forceScroll = true;
      signalLater(this, "swapDoc", this, old);
      return old;
    }),

    getInputField: function(){return this.display.input.getField();},
    getWrapperElement: function(){return this.display.wrapper;},
    getScrollerElement: function(){return this.display.scroller;},
    getGutterElement: function(){return this.display.gutters;}
  };
  eventMixin(CodeMirror);

  // OPTION DEFAULTS

  // The default configuration options.
  var defaults = CodeMirror.defaults = {};
  // Functions to run when options are changed.
  var optionHandlers = CodeMirror.optionHandlers = {};

  function option(name, deflt, handle, notOnInit) {
    CodeMirror.defaults[name] = deflt;
    if (handle) optionHandlers[name] =
      notOnInit ? function(cm, val, old) {if (old != Init) handle(cm, val, old);} : handle;
  }

  // Passed to option handlers when there is no old value.
  var Init = CodeMirror.Init = {toString: function(){return "CodeMirror.Init";}};

  // These two are, on init, called from the constructor because they
  // have to be initialized before the editor can start at all.
  option("value", "", function(cm, val) {
    cm.setValue(val);
  }, true);
  option("mode", null, function(cm, val) {
    cm.doc.modeOption = val;
    loadMode(cm);
  }, true);

  option("indentUnit", 2, loadMode, true);
  option("indentWithTabs", false);
  option("smartIndent", true);
  option("tabSize", 4, function(cm) {
    resetModeState(cm);
    clearCaches(cm);
    regChange(cm);
  }, true);
  option("lineSeparator", null, function(cm, val) {
    cm.doc.lineSep = val;
    if (!val) return;
    var newBreaks = [], lineNo = cm.doc.first;
    cm.doc.iter(function(line) {
      for (var pos = 0;;) {
        var found = line.text.indexOf(val, pos);
        if (found == -1) break;
        pos = found + val.length;
        newBreaks.push(Pos(lineNo, found));
      }
      lineNo++;
    });
    for (var i = newBreaks.length - 1; i >= 0; i--)
      replaceRange(cm.doc, val, newBreaks[i], Pos(newBreaks[i].line, newBreaks[i].ch + val.length))
  });
  option("specialChars", /[\t\u0000-\u0019\u00ad\u200b-\u200f\u2028\u2029\ufeff]/g, function(cm, val, old) {
    cm.state.specialChars = new RegExp(val.source + (val.test("\t") ? "" : "|\t"), "g");
    if (old != CodeMirror.Init) cm.refresh();
  });
  option("specialCharPlaceholder", defaultSpecialCharPlaceholder, function(cm) {cm.refresh();}, true);
  option("electricChars", true);
  option("inputStyle", mobile ? "contenteditable" : "textarea", function() {
    throw new Error("inputStyle can not (yet) be changed in a running editor"); // FIXME
  }, true);
  option("rtlMoveVisually", !windows);
  option("wholeLineUpdateBefore", true);

  option("theme", "default", function(cm) {
    themeChanged(cm);
    guttersChanged(cm);
  }, true);
  option("keyMap", "default", function(cm, val, old) {
    var next = getKeyMap(val);
    var prev = old != CodeMirror.Init && getKeyMap(old);
    if (prev && prev.detach) prev.detach(cm, next);
    if (next.attach) next.attach(cm, prev || null);
  });
  option("extraKeys", null);

  option("lineWrapping", false, wrappingChanged, true);
  option("gutters", [], function(cm) {
    setGuttersForLineNumbers(cm.options);
    guttersChanged(cm);
  }, true);
  option("fixedGutter", true, function(cm, val) {
    cm.display.gutters.style.left = val ? compensateForHScroll(cm.display) + "px" : "0";
    cm.refresh();
  }, true);
  option("coverGutterNextToScrollbar", false, function(cm) {updateScrollbars(cm);}, true);
  option("scrollbarStyle", "native", function(cm) {
    initScrollbars(cm);
    updateScrollbars(cm);
    cm.display.scrollbars.setScrollTop(cm.doc.scrollTop);
    cm.display.scrollbars.setScrollLeft(cm.doc.scrollLeft);
  }, true);
  option("lineNumbers", false, function(cm) {
    setGuttersForLineNumbers(cm.options);
    guttersChanged(cm);
  }, true);
  option("firstLineNumber", 1, guttersChanged, true);
  option("lineNumberFormatter", function(integer) {return integer;}, guttersChanged, true);
  option("showCursorWhenSelecting", false, updateSelection, true);

  option("resetSelectionOnContextMenu", true);
  option("lineWiseCopyCut", true);

  option("readOnly", false, function(cm, val) {
    if (val == "nocursor") {
      onBlur(cm);
      cm.display.input.blur();
      cm.display.disabled = true;
    } else {
      cm.display.disabled = false;
      if (!val) cm.display.input.reset();
    }
  });
  option("disableInput", false, function(cm, val) {if (!val) cm.display.input.reset();}, true);
  option("dragDrop", true, dragDropChanged);

  option("cursorBlinkRate", 530);
  option("cursorScrollMargin", 0);
  option("cursorHeight", 1, updateSelection, true);
  option("singleCursorHeightPerLine", true, updateSelection, true);
  option("workTime", 100);
  option("workDelay", 100);
  option("flattenSpans", true, resetModeState, true);
  option("addModeClass", false, resetModeState, true);
  option("pollInterval", 100);
  option("undoDepth", 200, function(cm, val){cm.doc.history.undoDepth = val;});
  option("historyEventDelay", 1250);
  option("viewportMargin", 10, function(cm){cm.refresh();}, true);
  option("maxHighlightLength", 10000, resetModeState, true);
  option("moveInputWithCursor", true, function(cm, val) {
    if (!val) cm.display.input.resetPosition();
  });

  option("tabindex", null, function(cm, val) {
    cm.display.input.getField().tabIndex = val || "";
  });
  option("autofocus", null);

  // MODE DEFINITION AND QUERYING

  // Known modes, by name and by MIME
  var modes = CodeMirror.modes = {}, mimeModes = CodeMirror.mimeModes = {};

  // Extra arguments are stored as the mode's dependencies, which is
  // used by (legacy) mechanisms like loadmode.js to automatically
  // load a mode. (Preferred mechanism is the require/define calls.)
  CodeMirror.defineMode = function(name, mode) {
    if (!CodeMirror.defaults.mode && name != "null") CodeMirror.defaults.mode = name;
    if (arguments.length > 2)
      mode.dependencies = Array.prototype.slice.call(arguments, 2);
    modes[name] = mode;
  };

  CodeMirror.defineMIME = function(mime, spec) {
    mimeModes[mime] = spec;
  };

  // Given a MIME type, a {name, ...options} config object, or a name
  // string, return a mode config object.
  CodeMirror.resolveMode = function(spec) {
    if (typeof spec == "string" && mimeModes.hasOwnProperty(spec)) {
      spec = mimeModes[spec];
    } else if (spec && typeof spec.name == "string" && mimeModes.hasOwnProperty(spec.name)) {
      var found = mimeModes[spec.name];
      if (typeof found == "string") found = {name: found};
      spec = createObj(found, spec);
      spec.name = found.name;
    } else if (typeof spec == "string" && /^[\w\-]+\/[\w\-]+\+xml$/.test(spec)) {
      return CodeMirror.resolveMode("application/xml");
    }
    if (typeof spec == "string") return {name: spec};
    else return spec || {name: "null"};
  };

  // Given a mode spec (anything that resolveMode accepts), find and
  // initialize an actual mode object.
  CodeMirror.getMode = function(options, spec) {
    var spec = CodeMirror.resolveMode(spec);
    var mfactory = modes[spec.name];
    if (!mfactory) return CodeMirror.getMode(options, "text/plain");
    var modeObj = mfactory(options, spec);
    if (modeExtensions.hasOwnProperty(spec.name)) {
      var exts = modeExtensions[spec.name];
      for (var prop in exts) {
        if (!exts.hasOwnProperty(prop)) continue;
        if (modeObj.hasOwnProperty(prop)) modeObj["_" + prop] = modeObj[prop];
        modeObj[prop] = exts[prop];
      }
    }
    modeObj.name = spec.name;
    if (spec.helperType) modeObj.helperType = spec.helperType;
    if (spec.modeProps) for (var prop in spec.modeProps)
      modeObj[prop] = spec.modeProps[prop];

    return modeObj;
  };

  // Minimal default mode.
  CodeMirror.defineMode("null", function() {
    return {token: function(stream) {stream.skipToEnd();}};
  });
  CodeMirror.defineMIME("text/plain", "null");

  // This can be used to attach properties to mode objects from
  // outside the actual mode definition.
  var modeExtensions = CodeMirror.modeExtensions = {};
  CodeMirror.extendMode = function(mode, properties) {
    var exts = modeExtensions.hasOwnProperty(mode) ? modeExtensions[mode] : (modeExtensions[mode] = {});
    copyObj(properties, exts);
  };

  // EXTENSIONS

  CodeMirror.defineExtension = function(name, func) {
    CodeMirror.prototype[name] = func;
  };
  CodeMirror.defineDocExtension = function(name, func) {
    Doc.prototype[name] = func;
  };
  CodeMirror.defineOption = option;

  var initHooks = [];
  CodeMirror.defineInitHook = function(f) {initHooks.push(f);};

  var helpers = CodeMirror.helpers = {};
  CodeMirror.registerHelper = function(type, name, value) {
    if (!helpers.hasOwnProperty(type)) helpers[type] = CodeMirror[type] = {_global: []};
    helpers[type][name] = value;
  };
  CodeMirror.registerGlobalHelper = function(type, name, predicate, value) {
    CodeMirror.registerHelper(type, name, value);
    helpers[type]._global.push({pred: predicate, val: value});
  };

  // MODE STATE HANDLING

  // Utility functions for working with state. Exported because nested
  // modes need to do this for their inner modes.

  var copyState = CodeMirror.copyState = function(mode, state) {
    if (state === true) return state;
    if (mode.copyState) return mode.copyState(state);
    var nstate = {};
    for (var n in state) {
      var val = state[n];
      if (val instanceof Array) val = val.concat([]);
      nstate[n] = val;
    }
    return nstate;
  };

  var startState = CodeMirror.startState = function(mode, a1, a2) {
    return mode.startState ? mode.startState(a1, a2) : true;
  };

  // Given a mode and a state (for that mode), find the inner mode and
  // state at the position that the state refers to.
  CodeMirror.innerMode = function(mode, state) {
    while (mode.innerMode) {
      var info = mode.innerMode(state);
      if (!info || info.mode == mode) break;
      state = info.state;
      mode = info.mode;
    }
    return info || {mode: mode, state: state};
  };

  // STANDARD COMMANDS

  // Commands are parameter-less actions that can be performed on an
  // editor, mostly used for keybindings.
  var commands = CodeMirror.commands = {
    selectAll: function(cm) {cm.setSelection(Pos(cm.firstLine(), 0), Pos(cm.lastLine()), sel_dontScroll);},
    singleSelection: function(cm) {
      cm.setSelection(cm.getCursor("anchor"), cm.getCursor("head"), sel_dontScroll);
    },
    killLine: function(cm) {
      deleteNearSelection(cm, function(range) {
        if (range.empty()) {
          var len = getLine(cm.doc, range.head.line).text.length;
          if (range.head.ch == len && range.head.line < cm.lastLine())
            return {from: range.head, to: Pos(range.head.line + 1, 0)};
          else
            return {from: range.head, to: Pos(range.head.line, len)};
        } else {
          return {from: range.from(), to: range.to()};
        }
      });
    },
    deleteLine: function(cm) {
      deleteNearSelection(cm, function(range) {
        return {from: Pos(range.from().line, 0),
                to: clipPos(cm.doc, Pos(range.to().line + 1, 0))};
      });
    },
    delLineLeft: function(cm) {
      deleteNearSelection(cm, function(range) {
        return {from: Pos(range.from().line, 0), to: range.from()};
      });
    },
    delWrappedLineLeft: function(cm) {
      deleteNearSelection(cm, function(range) {
        var top = cm.charCoords(range.head, "div").top + 5;
        var leftPos = cm.coordsChar({left: 0, top: top}, "div");
        return {from: leftPos, to: range.from()};
      });
    },
    delWrappedLineRight: function(cm) {
      deleteNearSelection(cm, function(range) {
        var top = cm.charCoords(range.head, "div").top + 5;
        var rightPos = cm.coordsChar({left: cm.display.lineDiv.offsetWidth + 100, top: top}, "div");
        return {from: range.from(), to: rightPos };
      });
    },
    undo: function(cm) {cm.undo();},
    redo: function(cm) {cm.redo();},
    undoSelection: function(cm) {cm.undoSelection();},
    redoSelection: function(cm) {cm.redoSelection();},
    goDocStart: function(cm) {cm.extendSelection(Pos(cm.firstLine(), 0));},
    goDocEnd: function(cm) {cm.extendSelection(Pos(cm.lastLine()));},
    goLineStart: function(cm) {
      cm.extendSelectionsBy(function(range) { return lineStart(cm, range.head.line); },
                            {origin: "+move", bias: 1});
    },
    goLineStartSmart: function(cm) {
      cm.extendSelectionsBy(function(range) {
        return lineStartSmart(cm, range.head);
      }, {origin: "+move", bias: 1});
    },
    goLineEnd: function(cm) {
      cm.extendSelectionsBy(function(range) { return lineEnd(cm, range.head.line); },
                            {origin: "+move", bias: -1});
    },
    goLineRight: function(cm) {
      cm.extendSelectionsBy(function(range) {
        var top = cm.charCoords(range.head, "div").top + 5;
        return cm.coordsChar({left: cm.display.lineDiv.offsetWidth + 100, top: top}, "div");
      }, sel_move);
    },
    goLineLeft: function(cm) {
      cm.extendSelectionsBy(function(range) {
        var top = cm.charCoords(range.head, "div").top + 5;
        return cm.coordsChar({left: 0, top: top}, "div");
      }, sel_move);
    },
    goLineLeftSmart: function(cm) {
      cm.extendSelectionsBy(function(range) {
        var top = cm.charCoords(range.head, "div").top + 5;
        var pos = cm.coordsChar({left: 0, top: top}, "div");
        if (pos.ch < cm.getLine(pos.line).search(/\S/)) return lineStartSmart(cm, range.head);
        return pos;
      }, sel_move);
    },
    goLineUp: function(cm) {cm.moveV(-1, "line");},
    goLineDown: function(cm) {cm.moveV(1, "line");},
    goPageUp: function(cm) {cm.moveV(-1, "page");},
    goPageDown: function(cm) {cm.moveV(1, "page");},
    goCharLeft: function(cm) {cm.moveH(-1, "char");},
    goCharRight: function(cm) {cm.moveH(1, "char");},
    goColumnLeft: function(cm) {cm.moveH(-1, "column");},
    goColumnRight: function(cm) {cm.moveH(1, "column");},
    goWordLeft: function(cm) {cm.moveH(-1, "word");},
    goGroupRight: function(cm) {cm.moveH(1, "group");},
    goGroupLeft: function(cm) {cm.moveH(-1, "group");},
    goWordRight: function(cm) {cm.moveH(1, "word");},
    delCharBefore: function(cm) {cm.deleteH(-1, "char");},
    delCharAfter: function(cm) {cm.deleteH(1, "char");},
    delWordBefore: function(cm) {cm.deleteH(-1, "word");},
    delWordAfter: function(cm) {cm.deleteH(1, "word");},
    delGroupBefore: function(cm) {cm.deleteH(-1, "group");},
    delGroupAfter: function(cm) {cm.deleteH(1, "group");},
    indentAuto: function(cm) {cm.indentSelection("smart");},
    indentMore: function(cm) {cm.indentSelection("add");},
    indentLess: function(cm) {cm.indentSelection("subtract");},
    insertTab: function(cm) {cm.replaceSelection("\t");},
    insertSoftTab: function(cm) {
      var spaces = [], ranges = cm.listSelections(), tabSize = cm.options.tabSize;
      for (var i = 0; i < ranges.length; i++) {
        var pos = ranges[i].from();
        var col = countColumn(cm.getLine(pos.line), pos.ch, tabSize);
        spaces.push(new Array(tabSize - col % tabSize + 1).join(" "));
      }
      cm.replaceSelections(spaces);
    },
    defaultTab: function(cm) {
      if (cm.somethingSelected()) cm.indentSelection("add");
      else cm.execCommand("insertTab");
    },
    transposeChars: function(cm) {
      runInOp(cm, function() {
        var ranges = cm.listSelections(), newSel = [];
        for (var i = 0; i < ranges.length; i++) {
          var cur = ranges[i].head, line = getLine(cm.doc, cur.line).text;
          if (line) {
            if (cur.ch == line.length) cur = new Pos(cur.line, cur.ch - 1);
            if (cur.ch > 0) {
              cur = new Pos(cur.line, cur.ch + 1);
              cm.replaceRange(line.charAt(cur.ch - 1) + line.charAt(cur.ch - 2),
                              Pos(cur.line, cur.ch - 2), cur, "+transpose");
            } else if (cur.line > cm.doc.first) {
              var prev = getLine(cm.doc, cur.line - 1).text;
              if (prev)
                cm.replaceRange(line.charAt(0) + cm.doc.lineSeparator() +
                                prev.charAt(prev.length - 1),
                                Pos(cur.line - 1, prev.length - 1), Pos(cur.line, 1), "+transpose");
            }
          }
          newSel.push(new Range(cur, cur));
        }
        cm.setSelections(newSel);
      });
    },
    newlineAndIndent: function(cm) {
      runInOp(cm, function() {
        var len = cm.listSelections().length;
        for (var i = 0; i < len; i++) {
          var range = cm.listSelections()[i];
          cm.replaceRange(cm.doc.lineSeparator(), range.anchor, range.head, "+input");
          cm.indentLine(range.from().line + 1, null, true);
          ensureCursorVisible(cm);
        }
      });
    },
    toggleOverwrite: function(cm) {cm.toggleOverwrite();}
  };


  // STANDARD KEYMAPS

  var keyMap = CodeMirror.keyMap = {};

  keyMap.basic = {
    "Left": "goCharLeft", "Right": "goCharRight", "Up": "goLineUp", "Down": "goLineDown",
    "End": "goLineEnd", "Home": "goLineStartSmart", "PageUp": "goPageUp", "PageDown": "goPageDown",
    "Delete": "delCharAfter", "Backspace": "delCharBefore", "Shift-Backspace": "delCharBefore",
    "Tab": "defaultTab", "Shift-Tab": "indentAuto",
    "Enter": "newlineAndIndent", "Insert": "toggleOverwrite",
    "Esc": "singleSelection"
  };
  // Note that the save and find-related commands aren't defined by
  // default. User code or addons can define them. Unknown commands
  // are simply ignored.
  keyMap.pcDefault = {
    "Ctrl-A": "selectAll", "Ctrl-D": "deleteLine", "Ctrl-Z": "undo", "Shift-Ctrl-Z": "redo", "Ctrl-Y": "redo",
    "Ctrl-Home": "goDocStart", "Ctrl-End": "goDocEnd", "Ctrl-Up": "goLineUp", "Ctrl-Down": "goLineDown",
    "Ctrl-Left": "goGroupLeft", "Ctrl-Right": "goGroupRight", "Alt-Left": "goLineStart", "Alt-Right": "goLineEnd",
    "Ctrl-Backspace": "delGroupBefore", "Ctrl-Delete": "delGroupAfter", "Ctrl-S": "save", "Ctrl-F": "find",
    "Ctrl-G": "findNext", "Shift-Ctrl-G": "findPrev", "Shift-Ctrl-F": "replace", "Shift-Ctrl-R": "replaceAll",
    "Ctrl-[": "indentLess", "Ctrl-]": "indentMore",
    "Ctrl-U": "undoSelection", "Shift-Ctrl-U": "redoSelection", "Alt-U": "redoSelection",
    fallthrough: "basic"
  };
  // Very basic readline/emacs-style bindings, which are standard on Mac.
  keyMap.emacsy = {
    "Ctrl-F": "goCharRight", "Ctrl-B": "goCharLeft", "Ctrl-P": "goLineUp", "Ctrl-N": "goLineDown",
    "Alt-F": "goWordRight", "Alt-B": "goWordLeft", "Ctrl-A": "goLineStart", "Ctrl-E": "goLineEnd",
    "Ctrl-V": "goPageDown", "Shift-Ctrl-V": "goPageUp", "Ctrl-D": "delCharAfter", "Ctrl-H": "delCharBefore",
    "Alt-D": "delWordAfter", "Alt-Backspace": "delWordBefore", "Ctrl-K": "killLine", "Ctrl-T": "transposeChars"
  };
  keyMap.macDefault = {
    "Cmd-A": "selectAll", "Cmd-D": "deleteLine", "Cmd-Z": "undo", "Shift-Cmd-Z": "redo", "Cmd-Y": "redo",
    "Cmd-Home": "goDocStart", "Cmd-Up": "goDocStart", "Cmd-End": "goDocEnd", "Cmd-Down": "goDocEnd", "Alt-Left": "goGroupLeft",
    "Alt-Right": "goGroupRight", "Cmd-Left": "goLineLeft", "Cmd-Right": "goLineRight", "Alt-Backspace": "delGroupBefore",
    "Ctrl-Alt-Backspace": "delGroupAfter", "Alt-Delete": "delGroupAfter", "Cmd-S": "save", "Cmd-F": "find",
    "Cmd-G": "findNext", "Shift-Cmd-G": "findPrev", "Cmd-Alt-F": "replace", "Shift-Cmd-Alt-F": "replaceAll",
    "Cmd-[": "indentLess", "Cmd-]": "indentMore", "Cmd-Backspace": "delWrappedLineLeft", "Cmd-Delete": "delWrappedLineRight",
    "Cmd-U": "undoSelection", "Shift-Cmd-U": "redoSelection", "Ctrl-Up": "goDocStart", "Ctrl-Down": "goDocEnd",
    fallthrough: ["basic", "emacsy"]
  };
  keyMap["default"] = mac ? keyMap.macDefault : keyMap.pcDefault;

  // KEYMAP DISPATCH

  function normalizeKeyName(name) {
    var parts = name.split(/-(?!$)/), name = parts[parts.length - 1];
    var alt, ctrl, shift, cmd;
    for (var i = 0; i < parts.length - 1; i++) {
      var mod = parts[i];
      if (/^(cmd|meta|m)$/i.test(mod)) cmd = true;
      else if (/^a(lt)?$/i.test(mod)) alt = true;
      else if (/^(c|ctrl|control)$/i.test(mod)) ctrl = true;
      else if (/^s(hift)$/i.test(mod)) shift = true;
      else throw new Error("Unrecognized modifier name: " + mod);
    }
    if (alt) name = "Alt-" + name;
    if (ctrl) name = "Ctrl-" + name;
    if (cmd) name = "Cmd-" + name;
    if (shift) name = "Shift-" + name;
    return name;
  }

  // This is a kludge to keep keymaps mostly working as raw objects
  // (backwards compatibility) while at the same time support features
  // like normalization and multi-stroke key bindings. It compiles a
  // new normalized keymap, and then updates the old object to reflect
  // this.
  CodeMirror.normalizeKeyMap = function(keymap) {
    var copy = {};
    for (var keyname in keymap) if (keymap.hasOwnProperty(keyname)) {
      var value = keymap[keyname];
      if (/^(name|fallthrough|(de|at)tach)$/.test(keyname)) continue;
      if (value == "...") { delete keymap[keyname]; continue; }

      var keys = map(keyname.split(" "), normalizeKeyName);
      for (var i = 0; i < keys.length; i++) {
        var val, name;
        if (i == keys.length - 1) {
          name = keys.join(" ");
          val = value;
        } else {
          name = keys.slice(0, i + 1).join(" ");
          val = "...";
        }
        var prev = copy[name];
        if (!prev) copy[name] = val;
        else if (prev != val) throw new Error("Inconsistent bindings for " + name);
      }
      delete keymap[keyname];
    }
    for (var prop in copy) keymap[prop] = copy[prop];
    return keymap;
  };

  var lookupKey = CodeMirror.lookupKey = function(key, map, handle, context) {
    map = getKeyMap(map);
    var found = map.call ? map.call(key, context) : map[key];
    if (found === false) return "nothing";
    if (found === "...") return "multi";
    if (found != null && handle(found)) return "handled";

    if (map.fallthrough) {
      if (Object.prototype.toString.call(map.fallthrough) != "[object Array]")
        return lookupKey(key, map.fallthrough, handle, context);
      for (var i = 0; i < map.fallthrough.length; i++) {
        var result = lookupKey(key, map.fallthrough[i], handle, context);
        if (result) return result;
      }
    }
  };

  // Modifier key presses don't count as 'real' key presses for the
  // purpose of keymap fallthrough.
  var isModifierKey = CodeMirror.isModifierKey = function(value) {
    var name = typeof value == "string" ? value : keyNames[value.keyCode];
    return name == "Ctrl" || name == "Alt" || name == "Shift" || name == "Mod";
  };

  // Look up the name of a key as indicated by an event object.
  var keyName = CodeMirror.keyName = function(event, noShift) {
    if (presto && event.keyCode == 34 && event["char"]) return false;
    var base = keyNames[event.keyCode], name = base;
    if (name == null || event.altGraphKey) return false;
    if (event.altKey && base != "Alt") name = "Alt-" + name;
    if ((flipCtrlCmd ? event.metaKey : event.ctrlKey) && base != "Ctrl") name = "Ctrl-" + name;
    if ((flipCtrlCmd ? event.ctrlKey : event.metaKey) && base != "Cmd") name = "Cmd-" + name;
    if (!noShift && event.shiftKey && base != "Shift") name = "Shift-" + name;
    return name;
  };

  function getKeyMap(val) {
    return typeof val == "string" ? keyMap[val] : val;
  }

  // FROMTEXTAREA

  CodeMirror.fromTextArea = function(textarea, options) {
    options = options ? copyObj(options) : {};
    options.value = textarea.value;
    if (!options.tabindex && textarea.tabIndex)
      options.tabindex = textarea.tabIndex;
    if (!options.placeholder && textarea.placeholder)
      options.placeholder = textarea.placeholder;
    // Set autofocus to true if this textarea is focused, or if it has
    // autofocus and no other element is focused.
    if (options.autofocus == null) {
      var hasFocus = activeElt();
      options.autofocus = hasFocus == textarea ||
        textarea.getAttribute("autofocus") != null && hasFocus == document.body;
    }

    function save() {textarea.value = cm.getValue();}
    if (textarea.form) {
      on(textarea.form, "submit", save);
      // Deplorable hack to make the submit method do the right thing.
      if (!options.leaveSubmitMethodAlone) {
        var form = textarea.form, realSubmit = form.submit;
        try {
          var wrappedSubmit = form.submit = function() {
            save();
            form.submit = realSubmit;
            form.submit();
            form.submit = wrappedSubmit;
          };
        } catch(e) {}
      }
    }

    options.finishInit = function(cm) {
      cm.save = save;
      cm.getTextArea = function() { return textarea; };
      cm.toTextArea = function() {
        cm.toTextArea = isNaN; // Prevent this from being ran twice
        save();
        textarea.parentNode.removeChild(cm.getWrapperElement());
        textarea.style.display = "";
        if (textarea.form) {
          off(textarea.form, "submit", save);
          if (typeof textarea.form.submit == "function")
            textarea.form.submit = realSubmit;
        }
      };
    };

    textarea.style.display = "none";
    var cm = CodeMirror(function(node) {
      textarea.parentNode.insertBefore(node, textarea.nextSibling);
    }, options);
    return cm;
  };

  // STRING STREAM

  // Fed to the mode parsers, provides helper functions to make
  // parsers more succinct.

  var StringStream = CodeMirror.StringStream = function(string, tabSize) {
    this.pos = this.start = 0;
    this.string = string;
    this.tabSize = tabSize || 8;
    this.lastColumnPos = this.lastColumnValue = 0;
    this.lineStart = 0;
  };

  StringStream.prototype = {
    eol: function() {return this.pos >= this.string.length;},
    sol: function() {return this.pos == this.lineStart;},
    peek: function() {return this.string.charAt(this.pos) || undefined;},
    next: function() {
      if (this.pos < this.string.length)
        return this.string.charAt(this.pos++);
    },
    eat: function(match) {
      var ch = this.string.charAt(this.pos);
      if (typeof match == "string") var ok = ch == match;
      else var ok = ch && (match.test ? match.test(ch) : match(ch));
      if (ok) {++this.pos; return ch;}
    },
    eatWhile: function(match) {
      var start = this.pos;
      while (this.eat(match)){}
      return this.pos > start;
    },
    eatSpace: function() {
      var start = this.pos;
      while (/[\s\u00a0]/.test(this.string.charAt(this.pos))) ++this.pos;
      return this.pos > start;
    },
    skipToEnd: function() {this.pos = this.string.length;},
    skipTo: function(ch) {
      var found = this.string.indexOf(ch, this.pos);
      if (found > -1) {this.pos = found; return true;}
    },
    backUp: function(n) {this.pos -= n;},
    column: function() {
      if (this.lastColumnPos < this.start) {
        this.lastColumnValue = countColumn(this.string, this.start, this.tabSize, this.lastColumnPos, this.lastColumnValue);
        this.lastColumnPos = this.start;
      }
      return this.lastColumnValue - (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0);
    },
    indentation: function() {
      return countColumn(this.string, null, this.tabSize) -
        (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0);
    },
    match: function(pattern, consume, caseInsensitive) {
      if (typeof pattern == "string") {
        var cased = function(str) {return caseInsensitive ? str.toLowerCase() : str;};
        var substr = this.string.substr(this.pos, pattern.length);
        if (cased(substr) == cased(pattern)) {
          if (consume !== false) this.pos += pattern.length;
          return true;
        }
      } else {
        var match = this.string.slice(this.pos).match(pattern);
        if (match && match.index > 0) return null;
        if (match && consume !== false) this.pos += match[0].length;
        return match;
      }
    },
    current: function(){return this.string.slice(this.start, this.pos);},
    hideFirstChars: function(n, inner) {
      this.lineStart += n;
      try { return inner(); }
      finally { this.lineStart -= n; }
    }
  };

  // TEXTMARKERS

  // Created with markText and setBookmark methods. A TextMarker is a
  // handle that can be used to clear or find a marked position in the
  // document. Line objects hold arrays (markedSpans) containing
  // {from, to, marker} object pointing to such marker objects, and
  // indicating that such a marker is present on that line. Multiple
  // lines may point to the same marker when it spans across lines.
  // The spans will have null for their from/to properties when the
  // marker continues beyond the start/end of the line. Markers have
  // links back to the lines they currently touch.

  var nextMarkerId = 0;

  var TextMarker = CodeMirror.TextMarker = function(doc, type) {
    this.lines = [];
    this.type = type;
    this.doc = doc;
    this.id = ++nextMarkerId;
  };
  eventMixin(TextMarker);

  // Clear the marker.
  TextMarker.prototype.clear = function() {
    if (this.explicitlyCleared) return;
    var cm = this.doc.cm, withOp = cm && !cm.curOp;
    if (withOp) startOperation(cm);
    if (hasHandler(this, "clear")) {
      var found = this.find();
      if (found) signalLater(this, "clear", found.from, found.to);
    }
    var min = null, max = null;
    for (var i = 0; i < this.lines.length; ++i) {
      var line = this.lines[i];
      var span = getMarkedSpanFor(line.markedSpans, this);
      if (cm && !this.collapsed) regLineChange(cm, lineNo(line), "text");
      else if (cm) {
        if (span.to != null) max = lineNo(line);
        if (span.from != null) min = lineNo(line);
      }
      line.markedSpans = removeMarkedSpan(line.markedSpans, span);
      if (span.from == null && this.collapsed && !lineIsHidden(this.doc, line) && cm)
        updateLineHeight(line, textHeight(cm.display));
    }
    if (cm && this.collapsed && !cm.options.lineWrapping) for (var i = 0; i < this.lines.length; ++i) {
      var visual = visualLine(this.lines[i]), len = lineLength(visual);
      if (len > cm.display.maxLineLength) {
        cm.display.maxLine = visual;
        cm.display.maxLineLength = len;
        cm.display.maxLineChanged = true;
      }
    }

    if (min != null && cm && this.collapsed) regChange(cm, min, max + 1);
    this.lines.length = 0;
    this.explicitlyCleared = true;
    if (this.atomic && this.doc.cantEdit) {
      this.doc.cantEdit = false;
      if (cm) reCheckSelection(cm.doc);
    }
    if (cm) signalLater(cm, "markerCleared", cm, this);
    if (withOp) endOperation(cm);
    if (this.parent) this.parent.clear();
  };

  // Find the position of the marker in the document. Returns a {from,
  // to} object by default. Side can be passed to get a specific side
  // -- 0 (both), -1 (left), or 1 (right). When lineObj is true, the
  // Pos objects returned contain a line object, rather than a line
  // number (used to prevent looking up the same line twice).
  TextMarker.prototype.find = function(side, lineObj) {
    if (side == null && this.type == "bookmark") side = 1;
    var from, to;
    for (var i = 0; i < this.lines.length; ++i) {
      var line = this.lines[i];
      var span = getMarkedSpanFor(line.markedSpans, this);
      if (span.from != null) {
        from = Pos(lineObj ? line : lineNo(line), span.from);
        if (side == -1) return from;
      }
      if (span.to != null) {
        to = Pos(lineObj ? line : lineNo(line), span.to);
        if (side == 1) return to;
      }
    }
    return from && {from: from, to: to};
  };

  // Signals that the marker's widget changed, and surrounding layout
  // should be recomputed.
  TextMarker.prototype.changed = function() {
    var pos = this.find(-1, true), widget = this, cm = this.doc.cm;
    if (!pos || !cm) return;
    runInOp(cm, function() {
      var line = pos.line, lineN = lineNo(pos.line);
      var view = findViewForLine(cm, lineN);
      if (view) {
        clearLineMeasurementCacheFor(view);
        cm.curOp.selectionChanged = cm.curOp.forceUpdate = true;
      }
      cm.curOp.updateMaxLine = true;
      if (!lineIsHidden(widget.doc, line) && widget.height != null) {
        var oldHeight = widget.height;
        widget.height = null;
        var dHeight = widgetHeight(widget) - oldHeight;
        if (dHeight)
          updateLineHeight(line, line.height + dHeight);
      }
    });
  };

  TextMarker.prototype.attachLine = function(line) {
    if (!this.lines.length && this.doc.cm) {
      var op = this.doc.cm.curOp;
      if (!op.maybeHiddenMarkers || indexOf(op.maybeHiddenMarkers, this) == -1)
        (op.maybeUnhiddenMarkers || (op.maybeUnhiddenMarkers = [])).push(this);
    }
    this.lines.push(line);
  };
  TextMarker.prototype.detachLine = function(line) {
    this.lines.splice(indexOf(this.lines, line), 1);
    if (!this.lines.length && this.doc.cm) {
      var op = this.doc.cm.curOp;
      (op.maybeHiddenMarkers || (op.maybeHiddenMarkers = [])).push(this);
    }
  };

  // Collapsed markers have unique ids, in order to be able to order
  // them, which is needed for uniquely determining an outer marker
  // when they overlap (they may nest, but not partially overlap).
  var nextMarkerId = 0;

  // Create a marker, wire it up to the right lines, and
  function markText(doc, from, to, options, type) {
    // Shared markers (across linked documents) are handled separately
    // (markTextShared will call out to this again, once per
    // document).
    if (options && options.shared) return markTextShared(doc, from, to, options, type);
    // Ensure we are in an operation.
    if (doc.cm && !doc.cm.curOp) return operation(doc.cm, markText)(doc, from, to, options, type);

    var marker = new TextMarker(doc, type), diff = cmp(from, to);
    if (options) copyObj(options, marker, false);
    // Don't connect empty markers unless clearWhenEmpty is false
    if (diff > 0 || diff == 0 && marker.clearWhenEmpty !== false)
      return marker;
    if (marker.replacedWith) {
      // Showing up as a widget implies collapsed (widget replaces text)
      marker.collapsed = true;
      marker.widgetNode = elt("span", [marker.replacedWith], "CodeMirror-widget");
      if (!options.handleMouseEvents) marker.widgetNode.setAttribute("cm-ignore-events", "true");
      if (options.insertLeft) marker.widgetNode.insertLeft = true;
    }
    if (marker.collapsed) {
      if (conflictingCollapsedRange(doc, from.line, from, to, marker) ||
          from.line != to.line && conflictingCollapsedRange(doc, to.line, from, to, marker))
        throw new Error("Inserting collapsed marker partially overlapping an existing one");
      sawCollapsedSpans = true;
    }

    if (marker.addToHistory)
      addChangeToHistory(doc, {from: from, to: to, origin: "markText"}, doc.sel, NaN);

    var curLine = from.line, cm = doc.cm, updateMaxLine;
    doc.iter(curLine, to.line + 1, function(line) {
      if (cm && marker.collapsed && !cm.options.lineWrapping && visualLine(line) == cm.display.maxLine)
        updateMaxLine = true;
      if (marker.collapsed && curLine != from.line) updateLineHeight(line, 0);
      addMarkedSpan(line, new MarkedSpan(marker,
                                         curLine == from.line ? from.ch : null,
                                         curLine == to.line ? to.ch : null));
      ++curLine;
    });
    // lineIsHidden depends on the presence of the spans, so needs a second pass
    if (marker.collapsed) doc.iter(from.line, to.line + 1, function(line) {
      if (lineIsHidden(doc, line)) updateLineHeight(line, 0);
    });

    if (marker.clearOnEnter) on(marker, "beforeCursorEnter", function() { marker.clear(); });

    if (marker.readOnly) {
      sawReadOnlySpans = true;
      if (doc.history.done.length || doc.history.undone.length)
        doc.clearHistory();
    }
    if (marker.collapsed) {
      marker.id = ++nextMarkerId;
      marker.atomic = true;
    }
    if (cm) {
      // Sync editor state
      if (updateMaxLine) cm.curOp.updateMaxLine = true;
      if (marker.collapsed)
        regChange(cm, from.line, to.line + 1);
      else if (marker.className || marker.title || marker.startStyle || marker.endStyle || marker.css)
        for (var i = from.line; i <= to.line; i++) regLineChange(cm, i, "text");
      if (marker.atomic) reCheckSelection(cm.doc);
      signalLater(cm, "markerAdded", cm, marker);
    }
    return marker;
  }

  // SHARED TEXTMARKERS

  // A shared marker spans multiple linked documents. It is
  // implemented as a meta-marker-object controlling multiple normal
  // markers.
  var SharedTextMarker = CodeMirror.SharedTextMarker = function(markers, primary) {
    this.markers = markers;
    this.primary = primary;
    for (var i = 0; i < markers.length; ++i)
      markers[i].parent = this;
  };
  eventMixin(SharedTextMarker);

  SharedTextMarker.prototype.clear = function() {
    if (this.explicitlyCleared) return;
    this.explicitlyCleared = true;
    for (var i = 0; i < this.markers.length; ++i)
      this.markers[i].clear();
    signalLater(this, "clear");
  };
  SharedTextMarker.prototype.find = function(side, lineObj) {
    return this.primary.find(side, lineObj);
  };

  function markTextShared(doc, from, to, options, type) {
    options = copyObj(options);
    options.shared = false;
    var markers = [markText(doc, from, to, options, type)], primary = markers[0];
    var widget = options.widgetNode;
    linkedDocs(doc, function(doc) {
      if (widget) options.widgetNode = widget.cloneNode(true);
      markers.push(markText(doc, clipPos(doc, from), clipPos(doc, to), options, type));
      for (var i = 0; i < doc.linked.length; ++i)
        if (doc.linked[i].isParent) return;
      primary = lst(markers);
    });
    return new SharedTextMarker(markers, primary);
  }

  function findSharedMarkers(doc) {
    return doc.findMarks(Pos(doc.first, 0), doc.clipPos(Pos(doc.lastLine())),
                         function(m) { return m.parent; });
  }

  function copySharedMarkers(doc, markers) {
    for (var i = 0; i < markers.length; i++) {
      var marker = markers[i], pos = marker.find();
      var mFrom = doc.clipPos(pos.from), mTo = doc.clipPos(pos.to);
      if (cmp(mFrom, mTo)) {
        var subMark = markText(doc, mFrom, mTo, marker.primary, marker.primary.type);
        marker.markers.push(subMark);
        subMark.parent = marker;
      }
    }
  }

  function detachSharedMarkers(markers) {
    for (var i = 0; i < markers.length; i++) {
      var marker = markers[i], linked = [marker.primary.doc];;
      linkedDocs(marker.primary.doc, function(d) { linked.push(d); });
      for (var j = 0; j < marker.markers.length; j++) {
        var subMarker = marker.markers[j];
        if (indexOf(linked, subMarker.doc) == -1) {
          subMarker.parent = null;
          marker.markers.splice(j--, 1);
        }
      }
    }
  }

  // TEXTMARKER SPANS

  function MarkedSpan(marker, from, to) {
    this.marker = marker;
    this.from = from; this.to = to;
  }

  // Search an array of spans for a span matching the given marker.
  function getMarkedSpanFor(spans, marker) {
    if (spans) for (var i = 0; i < spans.length; ++i) {
      var span = spans[i];
      if (span.marker == marker) return span;
    }
  }
  // Remove a span from an array, returning undefined if no spans are
  // left (we don't store arrays for lines without spans).
  function removeMarkedSpan(spans, span) {
    for (var r, i = 0; i < spans.length; ++i)
      if (spans[i] != span) (r || (r = [])).push(spans[i]);
    return r;
  }
  // Add a span to a line.
  function addMarkedSpan(line, span) {
    line.markedSpans = line.markedSpans ? line.markedSpans.concat([span]) : [span];
    span.marker.attachLine(line);
  }

  // Used for the algorithm that adjusts markers for a change in the
  // document. These functions cut an array of spans at a given
  // character position, returning an array of remaining chunks (or
  // undefined if nothing remains).
  function markedSpansBefore(old, startCh, isInsert) {
    if (old) for (var i = 0, nw; i < old.length; ++i) {
      var span = old[i], marker = span.marker;
      var startsBefore = span.from == null || (marker.inclusiveLeft ? span.from <= startCh : span.from < startCh);
      if (startsBefore || span.from == startCh && marker.type == "bookmark" && (!isInsert || !span.marker.insertLeft)) {
        var endsAfter = span.to == null || (marker.inclusiveRight ? span.to >= startCh : span.to > startCh);
        (nw || (nw = [])).push(new MarkedSpan(marker, span.from, endsAfter ? null : span.to));
      }
    }
    return nw;
  }
  function markedSpansAfter(old, endCh, isInsert) {
    if (old) for (var i = 0, nw; i < old.length; ++i) {
      var span = old[i], marker = span.marker;
      var endsAfter = span.to == null || (marker.inclusiveRight ? span.to >= endCh : span.to > endCh);
      if (endsAfter || span.from == endCh && marker.type == "bookmark" && (!isInsert || span.marker.insertLeft)) {
        var startsBefore = span.from == null || (marker.inclusiveLeft ? span.from <= endCh : span.from < endCh);
        (nw || (nw = [])).push(new MarkedSpan(marker, startsBefore ? null : span.from - endCh,
                                              span.to == null ? null : span.to - endCh));
      }
    }
    return nw;
  }

  // Given a change object, compute the new set of marker spans that
  // cover the line in which the change took place. Removes spans
  // entirely within the change, reconnects spans belonging to the
  // same marker that appear on both sides of the change, and cuts off
  // spans partially within the change. Returns an array of span
  // arrays with one element for each line in (after) the change.
  function stretchSpansOverChange(doc, change) {
    if (change.full) return null;
    var oldFirst = isLine(doc, change.from.line) && getLine(doc, change.from.line).markedSpans;
    var oldLast = isLine(doc, change.to.line) && getLine(doc, change.to.line).markedSpans;
    if (!oldFirst && !oldLast) return null;

    var startCh = change.from.ch, endCh = change.to.ch, isInsert = cmp(change.from, change.to) == 0;
    // Get the spans that 'stick out' on both sides
    var first = markedSpansBefore(oldFirst, startCh, isInsert);
    var last = markedSpansAfter(oldLast, endCh, isInsert);

    // Next, merge those two ends
    var sameLine = change.text.length == 1, offset = lst(change.text).length + (sameLine ? startCh : 0);
    if (first) {
      // Fix up .to properties of first
      for (var i = 0; i < first.length; ++i) {
        var span = first[i];
        if (span.to == null) {
          var found = getMarkedSpanFor(last, span.marker);
          if (!found) span.to = startCh;
          else if (sameLine) span.to = found.to == null ? null : found.to + offset;
        }
      }
    }
    if (last) {
      // Fix up .from in last (or move them into first in case of sameLine)
      for (var i = 0; i < last.length; ++i) {
        var span = last[i];
        if (span.to != null) span.to += offset;
        if (span.from == null) {
          var found = getMarkedSpanFor(first, span.marker);
          if (!found) {
            span.from = offset;
            if (sameLine) (first || (first = [])).push(span);
          }
        } else {
          span.from += offset;
          if (sameLine) (first || (first = [])).push(span);
        }
      }
    }
    // Make sure we didn't create any zero-length spans
    if (first) first = clearEmptySpans(first);
    if (last && last != first) last = clearEmptySpans(last);

    var newMarkers = [first];
    if (!sameLine) {
      // Fill gap with whole-line-spans
      var gap = change.text.length - 2, gapMarkers;
      if (gap > 0 && first)
        for (var i = 0; i < first.length; ++i)
          if (first[i].to == null)
            (gapMarkers || (gapMarkers = [])).push(new MarkedSpan(first[i].marker, null, null));
      for (var i = 0; i < gap; ++i)
        newMarkers.push(gapMarkers);
      newMarkers.push(last);
    }
    return newMarkers;
  }

  // Remove spans that are empty and don't have a clearWhenEmpty
  // option of false.
  function clearEmptySpans(spans) {
    for (var i = 0; i < spans.length; ++i) {
      var span = spans[i];
      if (span.from != null && span.from == span.to && span.marker.clearWhenEmpty !== false)
        spans.splice(i--, 1);
    }
    if (!spans.length) return null;
    return spans;
  }

  // Used for un/re-doing changes from the history. Combines the
  // result of computing the existing spans with the set of spans that
  // existed in the history (so that deleting around a span and then
  // undoing brings back the span).
  function mergeOldSpans(doc, change) {
    var old = getOldSpans(doc, change);
    var stretched = stretchSpansOverChange(doc, change);
    if (!old) return stretched;
    if (!stretched) return old;

    for (var i = 0; i < old.length; ++i) {
      var oldCur = old[i], stretchCur = stretched[i];
      if (oldCur && stretchCur) {
        spans: for (var j = 0; j < stretchCur.length; ++j) {
          var span = stretchCur[j];
          for (var k = 0; k < oldCur.length; ++k)
            if (oldCur[k].marker == span.marker) continue spans;
          oldCur.push(span);
        }
      } else if (stretchCur) {
        old[i] = stretchCur;
      }
    }
    return old;
  }

  // Used to 'clip' out readOnly ranges when making a change.
  function removeReadOnlyRanges(doc, from, to) {
    var markers = null;
    doc.iter(from.line, to.line + 1, function(line) {
      if (line.markedSpans) for (var i = 0; i < line.markedSpans.length; ++i) {
        var mark = line.markedSpans[i].marker;
        if (mark.readOnly && (!markers || indexOf(markers, mark) == -1))
          (markers || (markers = [])).push(mark);
      }
    });
    if (!markers) return null;
    var parts = [{from: from, to: to}];
    for (var i = 0; i < markers.length; ++i) {
      var mk = markers[i], m = mk.find(0);
      for (var j = 0; j < parts.length; ++j) {
        var p = parts[j];
        if (cmp(p.to, m.from) < 0 || cmp(p.from, m.to) > 0) continue;
        var newParts = [j, 1], dfrom = cmp(p.from, m.from), dto = cmp(p.to, m.to);
        if (dfrom < 0 || !mk.inclusiveLeft && !dfrom)
          newParts.push({from: p.from, to: m.from});
        if (dto > 0 || !mk.inclusiveRight && !dto)
          newParts.push({from: m.to, to: p.to});
        parts.splice.apply(parts, newParts);
        j += newParts.length - 1;
      }
    }
    return parts;
  }

  // Connect or disconnect spans from a line.
  function detachMarkedSpans(line) {
    var spans = line.markedSpans;
    if (!spans) return;
    for (var i = 0; i < spans.length; ++i)
      spans[i].marker.detachLine(line);
    line.markedSpans = null;
  }
  function attachMarkedSpans(line, spans) {
    if (!spans) return;
    for (var i = 0; i < spans.length; ++i)
      spans[i].marker.attachLine(line);
    line.markedSpans = spans;
  }

  // Helpers used when computing which overlapping collapsed span
  // counts as the larger one.
  function extraLeft(marker) { return marker.inclusiveLeft ? -1 : 0; }
  function extraRight(marker) { return marker.inclusiveRight ? 1 : 0; }

  // Returns a number indicating which of two overlapping collapsed
  // spans is larger (and thus includes the other). Falls back to
  // comparing ids when the spans cover exactly the same range.
  function compareCollapsedMarkers(a, b) {
    var lenDiff = a.lines.length - b.lines.length;
    if (lenDiff != 0) return lenDiff;
    var aPos = a.find(), bPos = b.find();
    var fromCmp = cmp(aPos.from, bPos.from) || extraLeft(a) - extraLeft(b);
    if (fromCmp) return -fromCmp;
    var toCmp = cmp(aPos.to, bPos.to) || extraRight(a) - extraRight(b);
    if (toCmp) return toCmp;
    return b.id - a.id;
  }

  // Find out whether a line ends or starts in a collapsed span. If
  // so, return the marker for that span.
  function collapsedSpanAtSide(line, start) {
    var sps = sawCollapsedSpans && line.markedSpans, found;
    if (sps) for (var sp, i = 0; i < sps.length; ++i) {
      sp = sps[i];
      if (sp.marker.collapsed && (start ? sp.from : sp.to) == null &&
          (!found || compareCollapsedMarkers(found, sp.marker) < 0))
        found = sp.marker;
    }
    return found;
  }
  function collapsedSpanAtStart(line) { return collapsedSpanAtSide(line, true); }
  function collapsedSpanAtEnd(line) { return collapsedSpanAtSide(line, false); }

  // Test whether there exists a collapsed span that partially
  // overlaps (covers the start or end, but not both) of a new span.
  // Such overlap is not allowed.
  function conflictingCollapsedRange(doc, lineNo, from, to, marker) {
    var line = getLine(doc, lineNo);
    var sps = sawCollapsedSpans && line.markedSpans;
    if (sps) for (var i = 0; i < sps.length; ++i) {
      var sp = sps[i];
      if (!sp.marker.collapsed) continue;
      var found = sp.marker.find(0);
      var fromCmp = cmp(found.from, from) || extraLeft(sp.marker) - extraLeft(marker);
      var toCmp = cmp(found.to, to) || extraRight(sp.marker) - extraRight(marker);
      if (fromCmp >= 0 && toCmp <= 0 || fromCmp <= 0 && toCmp >= 0) continue;
      if (fromCmp <= 0 && (cmp(found.to, from) > 0 || (sp.marker.inclusiveRight && marker.inclusiveLeft)) ||
          fromCmp >= 0 && (cmp(found.from, to) < 0 || (sp.marker.inclusiveLeft && marker.inclusiveRight)))
        return true;
    }
  }

  // A visual line is a line as drawn on the screen. Folding, for
  // example, can cause multiple logical lines to appear on the same
  // visual line. This finds the start of the visual line that the
  // given line is part of (usually that is the line itself).
  function visualLine(line) {
    var merged;
    while (merged = collapsedSpanAtStart(line))
      line = merged.find(-1, true).line;
    return line;
  }

  // Returns an array of logical lines that continue the visual line
  // started by the argument, or undefined if there are no such lines.
  function visualLineContinued(line) {
    var merged, lines;
    while (merged = collapsedSpanAtEnd(line)) {
      line = merged.find(1, true).line;
      (lines || (lines = [])).push(line);
    }
    return lines;
  }

  // Get the line number of the start of the visual line that the
  // given line number is part of.
  function visualLineNo(doc, lineN) {
    var line = getLine(doc, lineN), vis = visualLine(line);
    if (line == vis) return lineN;
    return lineNo(vis);
  }
  // Get the line number of the start of the next visual line after
  // the given line.
  function visualLineEndNo(doc, lineN) {
    if (lineN > doc.lastLine()) return lineN;
    var line = getLine(doc, lineN), merged;
    if (!lineIsHidden(doc, line)) return lineN;
    while (merged = collapsedSpanAtEnd(line))
      line = merged.find(1, true).line;
    return lineNo(line) + 1;
  }

  // Compute whether a line is hidden. Lines count as hidden when they
  // are part of a visual line that starts with another line, or when
  // they are entirely covered by collapsed, non-widget span.
  function lineIsHidden(doc, line) {
    var sps = sawCollapsedSpans && line.markedSpans;
    if (sps) for (var sp, i = 0; i < sps.length; ++i) {
      sp = sps[i];
      if (!sp.marker.collapsed) continue;
      if (sp.from == null) return true;
      if (sp.marker.widgetNode) continue;
      if (sp.from == 0 && sp.marker.inclusiveLeft && lineIsHiddenInner(doc, line, sp))
        return true;
    }
  }
  function lineIsHiddenInner(doc, line, span) {
    if (span.to == null) {
      var end = span.marker.find(1, true);
      return lineIsHiddenInner(doc, end.line, getMarkedSpanFor(end.line.markedSpans, span.marker));
    }
    if (span.marker.inclusiveRight && span.to == line.text.length)
      return true;
    for (var sp, i = 0; i < line.markedSpans.length; ++i) {
      sp = line.markedSpans[i];
      if (sp.marker.collapsed && !sp.marker.widgetNode && sp.from == span.to &&
          (sp.to == null || sp.to != span.from) &&
          (sp.marker.inclusiveLeft || span.marker.inclusiveRight) &&
          lineIsHiddenInner(doc, line, sp)) return true;
    }
  }

  // LINE WIDGETS

  // Line widgets are block elements displayed above or below a line.

  var LineWidget = CodeMirror.LineWidget = function(doc, node, options) {
    if (options) for (var opt in options) if (options.hasOwnProperty(opt))
      this[opt] = options[opt];
    this.doc = doc;
    this.node = node;
  };
  eventMixin(LineWidget);

  function adjustScrollWhenAboveVisible(cm, line, diff) {
    if (heightAtLine(line) < ((cm.curOp && cm.curOp.scrollTop) || cm.doc.scrollTop))
      addToScrollPos(cm, null, diff);
  }

  LineWidget.prototype.clear = function() {
    var cm = this.doc.cm, ws = this.line.widgets, line = this.line, no = lineNo(line);
    if (no == null || !ws) return;
    for (var i = 0; i < ws.length; ++i) if (ws[i] == this) ws.splice(i--, 1);
    if (!ws.length) line.widgets = null;
    var height = widgetHeight(this);
    updateLineHeight(line, Math.max(0, line.height - height));
    if (cm) runInOp(cm, function() {
      adjustScrollWhenAboveVisible(cm, line, -height);
      regLineChange(cm, no, "widget");
    });
  };
  LineWidget.prototype.changed = function() {
    var oldH = this.height, cm = this.doc.cm, line = this.line;
    this.height = null;
    var diff = widgetHeight(this) - oldH;
    if (!diff) return;
    updateLineHeight(line, line.height + diff);
    if (cm) runInOp(cm, function() {
      cm.curOp.forceUpdate = true;
      adjustScrollWhenAboveVisible(cm, line, diff);
    });
  };

  function widgetHeight(widget) {
    if (widget.height != null) return widget.height;
    var cm = widget.doc.cm;
    if (!cm) return 0;
    if (!contains(document.body, widget.node)) {
      var parentStyle = "position: relative;";
      if (widget.coverGutter)
        parentStyle += "margin-left: -" + cm.display.gutters.offsetWidth + "px;";
      if (widget.noHScroll)
        parentStyle += "width: " + cm.display.wrapper.clientWidth + "px;";
      removeChildrenAndAdd(cm.display.measure, elt("div", [widget.node], null, parentStyle));
    }
    return widget.height = widget.node.offsetHeight;
  }

  function addLineWidget(doc, handle, node, options) {
    var widget = new LineWidget(doc, node, options);
    var cm = doc.cm;
    if (cm && widget.noHScroll) cm.display.alignWidgets = true;
    changeLine(doc, handle, "widget", function(line) {
      var widgets = line.widgets || (line.widgets = []);
      if (widget.insertAt == null) widgets.push(widget);
      else widgets.splice(Math.min(widgets.length - 1, Math.max(0, widget.insertAt)), 0, widget);
      widget.line = line;
      if (cm && !lineIsHidden(doc, line)) {
        var aboveVisible = heightAtLine(line) < doc.scrollTop;
        updateLineHeight(line, line.height + widgetHeight(widget));
        if (aboveVisible) addToScrollPos(cm, null, widget.height);
        cm.curOp.forceUpdate = true;
      }
      return true;
    });
    return widget;
  }

  // LINE DATA STRUCTURE

  // Line objects. These hold state related to a line, including
  // highlighting info (the styles array).
  var Line = CodeMirror.Line = function(text, markedSpans, estimateHeight) {
    this.text = text;
    attachMarkedSpans(this, markedSpans);
    this.height = estimateHeight ? estimateHeight(this) : 1;
  };
  eventMixin(Line);
  Line.prototype.lineNo = function() { return lineNo(this); };

  // Change the content (text, markers) of a line. Automatically
  // invalidates cached information and tries to re-estimate the
  // line's height.
  function updateLine(line, text, markedSpans, estimateHeight) {
    line.text = text;
    if (line.stateAfter) line.stateAfter = null;
    if (line.styles) line.styles = null;
    if (line.order != null) line.order = null;
    detachMarkedSpans(line);
    attachMarkedSpans(line, markedSpans);
    var estHeight = estimateHeight ? estimateHeight(line) : 1;
    if (estHeight != line.height) updateLineHeight(line, estHeight);
  }

  // Detach a line from the document tree and its markers.
  function cleanUpLine(line) {
    line.parent = null;
    detachMarkedSpans(line);
  }

  function extractLineClasses(type, output) {
    if (type) for (;;) {
      var lineClass = type.match(/(?:^|\s+)line-(background-)?(\S+)/);
      if (!lineClass) break;
      type = type.slice(0, lineClass.index) + type.slice(lineClass.index + lineClass[0].length);
      var prop = lineClass[1] ? "bgClass" : "textClass";
      if (output[prop] == null)
        output[prop] = lineClass[2];
      else if (!(new RegExp("(?:^|\s)" + lineClass[2] + "(?:$|\s)")).test(output[prop]))
        output[prop] += " " + lineClass[2];
    }
    return type;
  }

  function callBlankLine(mode, state) {
    if (mode.blankLine) return mode.blankLine(state);
    if (!mode.innerMode) return;
    var inner = CodeMirror.innerMode(mode, state);
    if (inner.mode.blankLine) return inner.mode.blankLine(inner.state);
  }

  function readToken(mode, stream, state, inner) {
    for (var i = 0; i < 10; i++) {
      if (inner) inner[0] = CodeMirror.innerMode(mode, state).mode;
      var style = mode.token(stream, state);
      if (stream.pos > stream.start) return style;
    }
    throw new Error("Mode " + mode.name + " failed to advance stream.");
  }

  // Utility for getTokenAt and getLineTokens
  function takeToken(cm, pos, precise, asArray) {
    function getObj(copy) {
      return {start: stream.start, end: stream.pos,
              string: stream.current(),
              type: style || null,
              state: copy ? copyState(doc.mode, state) : state};
    }

    var doc = cm.doc, mode = doc.mode, style;
    pos = clipPos(doc, pos);
    var line = getLine(doc, pos.line), state = getStateBefore(cm, pos.line, precise);
    var stream = new StringStream(line.text, cm.options.tabSize), tokens;
    if (asArray) tokens = [];
    while ((asArray || stream.pos < pos.ch) && !stream.eol()) {
      stream.start = stream.pos;
      style = readToken(mode, stream, state);
      if (asArray) tokens.push(getObj(true));
    }
    return asArray ? tokens : getObj();
  }

  // Run the given mode's parser over a line, calling f for each token.
  function runMode(cm, text, mode, state, f, lineClasses, forceToEnd) {
    var flattenSpans = mode.flattenSpans;
    if (flattenSpans == null) flattenSpans = cm.options.flattenSpans;
    var curStart = 0, curStyle = null;
    var stream = new StringStream(text, cm.options.tabSize), style;
    var inner = cm.options.addModeClass && [null];
    if (text == "") extractLineClasses(callBlankLine(mode, state), lineClasses);
    while (!stream.eol()) {
      if (stream.pos > cm.options.maxHighlightLength) {
        flattenSpans = false;
        if (forceToEnd) processLine(cm, text, state, stream.pos);
        stream.pos = text.length;
        style = null;
      } else {
        style = extractLineClasses(readToken(mode, stream, state, inner), lineClasses);
      }
      if (inner) {
        var mName = inner[0].name;
        if (mName) style = "m-" + (style ? mName + " " + style : mName);
      }
      if (!flattenSpans || curStyle != style) {
        while (curStart < stream.start) {
          curStart = Math.min(stream.start, curStart + 50000);
          f(curStart, curStyle);
        }
        curStyle = style;
      }
      stream.start = stream.pos;
    }
    while (curStart < stream.pos) {
      // Webkit seems to refuse to render text nodes longer than 57444 characters
      var pos = Math.min(stream.pos, curStart + 50000);
      f(pos, curStyle);
      curStart = pos;
    }
  }

  // Compute a style array (an array starting with a mode generation
  // -- for invalidation -- followed by pairs of end positions and
  // style strings), which is used to highlight the tokens on the
  // line.
  function highlightLine(cm, line, state, forceToEnd) {
    // A styles array always starts with a number identifying the
    // mode/overlays that it is based on (for easy invalidation).
    var st = [cm.state.modeGen], lineClasses = {};
    // Compute the base array of styles
    runMode(cm, line.text, cm.doc.mode, state, function(end, style) {
      st.push(end, style);
    }, lineClasses, forceToEnd);

    // Run overlays, adjust style array.
    for (var o = 0; o < cm.state.overlays.length; ++o) {
      var overlay = cm.state.overlays[o], i = 1, at = 0;
      runMode(cm, line.text, overlay.mode, true, function(end, style) {
        var start = i;
        // Ensure there's a token end at the current position, and that i points at it
        while (at < end) {
          var i_end = st[i];
          if (i_end > end)
            st.splice(i, 1, end, st[i+1], i_end);
          i += 2;
          at = Math.min(end, i_end);
        }
        if (!style) return;
        if (overlay.opaque) {
          st.splice(start, i - start, end, "cm-overlay " + style);
          i = start + 2;
        } else {
          for (; start < i; start += 2) {
            var cur = st[start+1];
            st[start+1] = (cur ? cur + " " : "") + "cm-overlay " + style;
          }
        }
      }, lineClasses);
    }

    return {styles: st, classes: lineClasses.bgClass || lineClasses.textClass ? lineClasses : null};
  }

  function getLineStyles(cm, line, updateFrontier) {
    if (!line.styles || line.styles[0] != cm.state.modeGen) {
      var result = highlightLine(cm, line, line.stateAfter = getStateBefore(cm, lineNo(line)));
      line.styles = result.styles;
      if (result.classes) line.styleClasses = result.classes;
      else if (line.styleClasses) line.styleClasses = null;
      if (updateFrontier === cm.doc.frontier) cm.doc.frontier++;
    }
    return line.styles;
  }

  // Lightweight form of highlight -- proceed over this line and
  // update state, but don't save a style array. Used for lines that
  // aren't currently visible.
  function processLine(cm, text, state, startAt) {
    var mode = cm.doc.mode;
    var stream = new StringStream(text, cm.options.tabSize);
    stream.start = stream.pos = startAt || 0;
    if (text == "") callBlankLine(mode, state);
    while (!stream.eol() && stream.pos <= cm.options.maxHighlightLength) {
      readToken(mode, stream, state);
      stream.start = stream.pos;
    }
  }

  // Convert a style as returned by a mode (either null, or a string
  // containing one or more styles) to a CSS style. This is cached,
  // and also looks for line-wide styles.
  var styleToClassCache = {}, styleToClassCacheWithMode = {};
  function interpretTokenStyle(style, options) {
    if (!style || /^\s*$/.test(style)) return null;
    var cache = options.addModeClass ? styleToClassCacheWithMode : styleToClassCache;
    return cache[style] ||
      (cache[style] = style.replace(/\S+/g, "cm-$&"));
  }

  // Render the DOM representation of the text of a line. Also builds
  // up a 'line map', which points at the DOM nodes that represent
  // specific stretches of text, and is used by the measuring code.
  // The returned object contains the DOM node, this map, and
  // information about line-wide styles that were set by the mode.
  function buildLineContent(cm, lineView) {
    // The padding-right forces the element to have a 'border', which
    // is needed on Webkit to be able to get line-level bounding
    // rectangles for it (in measureChar).
    var content = elt("span", null, null, webkit ? "padding-right: .1px" : null);
    var builder = {pre: elt("pre", [content], "CodeMirror-line"), content: content,
                   col: 0, pos: 0, cm: cm,
                   splitSpaces: (ie || webkit) && cm.getOption("lineWrapping")};
    lineView.measure = {};

    // Iterate over the logical lines that make up this visual line.
    for (var i = 0; i <= (lineView.rest ? lineView.rest.length : 0); i++) {
      var line = i ? lineView.rest[i - 1] : lineView.line, order;
      builder.pos = 0;
      builder.addToken = buildToken;
      // Optionally wire in some hacks into the token-rendering
      // algorithm, to deal with browser quirks.
      if (hasBadBidiRects(cm.display.measure) && (order = getOrder(line)))
        builder.addToken = buildTokenBadBidi(builder.addToken, order);
      builder.map = [];
      var allowFrontierUpdate = lineView != cm.display.externalMeasured && lineNo(line);
      insertLineContent(line, builder, getLineStyles(cm, line, allowFrontierUpdate));
      if (line.styleClasses) {
        if (line.styleClasses.bgClass)
          builder.bgClass = joinClasses(line.styleClasses.bgClass, builder.bgClass || "");
        if (line.styleClasses.textClass)
          builder.textClass = joinClasses(line.styleClasses.textClass, builder.textClass || "");
      }

      // Ensure at least a single node is present, for measuring.
      if (builder.map.length == 0)
        builder.map.push(0, 0, builder.content.appendChild(zeroWidthElement(cm.display.measure)));

      // Store the map and a cache object for the current logical line
      if (i == 0) {
        lineView.measure.map = builder.map;
        lineView.measure.cache = {};
      } else {
        (lineView.measure.maps || (lineView.measure.maps = [])).push(builder.map);
        (lineView.measure.caches || (lineView.measure.caches = [])).push({});
      }
    }

    // See issue #2901
    if (webkit && /\bcm-tab\b/.test(builder.content.lastChild.className))
      builder.content.className = "cm-tab-wrap-hack";

    signal(cm, "renderLine", cm, lineView.line, builder.pre);
    if (builder.pre.className)
      builder.textClass = joinClasses(builder.pre.className, builder.textClass || "");

    return builder;
  }

  function defaultSpecialCharPlaceholder(ch) {
    var token = elt("span", "\u2022", "cm-invalidchar");
    token.title = "\\u" + ch.charCodeAt(0).toString(16);
    token.setAttribute("aria-label", token.title);
    return token;
  }

  // Build up the DOM representation for a single token, and add it to
  // the line map. Takes care to render special characters separately.
  function buildToken(builder, text, style, startStyle, endStyle, title, css) {
    if (!text) return;
    var displayText = builder.splitSpaces ? text.replace(/ {3,}/g, splitSpaces) : text;
    var special = builder.cm.state.specialChars, mustWrap = false;
    if (!special.test(text)) {
      builder.col += text.length;
      var content = document.createTextNode(displayText);
      builder.map.push(builder.pos, builder.pos + text.length, content);
      if (ie && ie_version < 9) mustWrap = true;
      builder.pos += text.length;
    } else {
      var content = document.createDocumentFragment(), pos = 0;
      while (true) {
        special.lastIndex = pos;
        var m = special.exec(text);
        var skipped = m ? m.index - pos : text.length - pos;
        if (skipped) {
          var txt = document.createTextNode(displayText.slice(pos, pos + skipped));
          if (ie && ie_version < 9) content.appendChild(elt("span", [txt]));
          else content.appendChild(txt);
          builder.map.push(builder.pos, builder.pos + skipped, txt);
          builder.col += skipped;
          builder.pos += skipped;
        }
        if (!m) break;
        pos += skipped + 1;
        if (m[0] == "\t") {
          var tabSize = builder.cm.options.tabSize, tabWidth = tabSize - builder.col % tabSize;
          var txt = content.appendChild(elt("span", spaceStr(tabWidth), "cm-tab"));
          txt.setAttribute("role", "presentation");
          txt.setAttribute("cm-text", "\t");
          builder.col += tabWidth;
        } else if (m[0] == "\r" || m[0] == "\n") {
          var txt = content.appendChild(elt("span", m[0] == "\r" ? "␍" : "␤", "cm-invalidchar"));
          txt.setAttribute("cm-text", m[0]);
          builder.col += 1;
        } else {
          var txt = builder.cm.options.specialCharPlaceholder(m[0]);
          txt.setAttribute("cm-text", m[0]);
          if (ie && ie_version < 9) content.appendChild(elt("span", [txt]));
          else content.appendChild(txt);
          builder.col += 1;
        }
        builder.map.push(builder.pos, builder.pos + 1, txt);
        builder.pos++;
      }
    }
    if (style || startStyle || endStyle || mustWrap || css) {
      var fullStyle = style || "";
      if (startStyle) fullStyle += startStyle;
      if (endStyle) fullStyle += endStyle;
      var token = elt("span", [content], fullStyle, css);
      if (title) token.title = title;
      return builder.content.appendChild(token);
    }
    builder.content.appendChild(content);
  }

  function splitSpaces(old) {
    var out = " ";
    for (var i = 0; i < old.length - 2; ++i) out += i % 2 ? " " : "\u00a0";
    out += " ";
    return out;
  }

  // Work around nonsense dimensions being reported for stretches of
  // right-to-left text.
  function buildTokenBadBidi(inner, order) {
    return function(builder, text, style, startStyle, endStyle, title, css) {
      style = style ? style + " cm-force-border" : "cm-force-border";
      var start = builder.pos, end = start + text.length;
      for (;;) {
        // Find the part that overlaps with the start of this text
        for (var i = 0; i < order.length; i++) {
          var part = order[i];
          if (part.to > start && part.from <= start) break;
        }
        if (part.to >= end) return inner(builder, text, style, startStyle, endStyle, title, css);
        inner(builder, text.slice(0, part.to - start), style, startStyle, null, title, css);
        startStyle = null;
        text = text.slice(part.to - start);
        start = part.to;
      }
    };
  }

  function buildCollapsedSpan(builder, size, marker, ignoreWidget) {
    var widget = !ignoreWidget && marker.widgetNode;
    if (widget) builder.map.push(builder.pos, builder.pos + size, widget);
    if (!ignoreWidget && builder.cm.display.input.needsContentAttribute) {
      if (!widget)
        widget = builder.content.appendChild(document.createElement("span"));
      widget.setAttribute("cm-marker", marker.id);
    }
    if (widget) {
      builder.cm.display.input.setUneditable(widget);
      builder.content.appendChild(widget);
    }
    builder.pos += size;
  }

  // Outputs a number of spans to make up a line, taking highlighting
  // and marked text into account.
  function insertLineContent(line, builder, styles) {
    var spans = line.markedSpans, allText = line.text, at = 0;
    if (!spans) {
      for (var i = 1; i < styles.length; i+=2)
        builder.addToken(builder, allText.slice(at, at = styles[i]), interpretTokenStyle(styles[i+1], builder.cm.options));
      return;
    }

    var len = allText.length, pos = 0, i = 1, text = "", style, css;
    var nextChange = 0, spanStyle, spanEndStyle, spanStartStyle, title, collapsed;
    for (;;) {
      if (nextChange == pos) { // Update current marker set
        spanStyle = spanEndStyle = spanStartStyle = title = css = "";
        collapsed = null; nextChange = Infinity;
        var foundBookmarks = [];
        for (var j = 0; j < spans.length; ++j) {
          var sp = spans[j], m = sp.marker;
          if (m.type == "bookmark" && sp.from == pos && m.widgetNode) {
            foundBookmarks.push(m);
          } else if (sp.from <= pos && (sp.to == null || sp.to > pos || m.collapsed && sp.to == pos && sp.from == pos)) {
            if (sp.to != null && sp.to != pos && nextChange > sp.to) {
              nextChange = sp.to;
              spanEndStyle = "";
            }
            if (m.className) spanStyle += " " + m.className;
            if (m.css) css = m.css;
            if (m.startStyle && sp.from == pos) spanStartStyle += " " + m.startStyle;
            if (m.endStyle && sp.to == nextChange) spanEndStyle += " " + m.endStyle;
            if (m.title && !title) title = m.title;
            if (m.collapsed && (!collapsed || compareCollapsedMarkers(collapsed.marker, m) < 0))
              collapsed = sp;
          } else if (sp.from > pos && nextChange > sp.from) {
            nextChange = sp.from;
          }
        }
        if (collapsed && (collapsed.from || 0) == pos) {
          buildCollapsedSpan(builder, (collapsed.to == null ? len + 1 : collapsed.to) - pos,
                             collapsed.marker, collapsed.from == null);
          if (collapsed.to == null) return;
          if (collapsed.to == pos) collapsed = false;
        }
        if (!collapsed && foundBookmarks.length) for (var j = 0; j < foundBookmarks.length; ++j)
          buildCollapsedSpan(builder, 0, foundBookmarks[j]);
      }
      if (pos >= len) break;

      var upto = Math.min(len, nextChange);
      while (true) {
        if (text) {
          var end = pos + text.length;
          if (!collapsed) {
            var tokenText = end > upto ? text.slice(0, upto - pos) : text;
            builder.addToken(builder, tokenText, style ? style + spanStyle : spanStyle,
                             spanStartStyle, pos + tokenText.length == nextChange ? spanEndStyle : "", title, css);
          }
          if (end >= upto) {text = text.slice(upto - pos); pos = upto; break;}
          pos = end;
          spanStartStyle = "";
        }
        text = allText.slice(at, at = styles[i++]);
        style = interpretTokenStyle(styles[i++], builder.cm.options);
      }
    }
  }

  // DOCUMENT DATA STRUCTURE

  // By default, updates that start and end at the beginning of a line
  // are treated specially, in order to make the association of line
  // widgets and marker elements with the text behave more intuitive.
  function isWholeLineUpdate(doc, change) {
    return change.from.ch == 0 && change.to.ch == 0 && lst(change.text) == "" &&
      (!doc.cm || doc.cm.options.wholeLineUpdateBefore);
  }

  // Perform a change on the document data structure.
  function updateDoc(doc, change, markedSpans, estimateHeight) {
    function spansFor(n) {return markedSpans ? markedSpans[n] : null;}
    function update(line, text, spans) {
      updateLine(line, text, spans, estimateHeight);
      signalLater(line, "change", line, change);
    }
    function linesFor(start, end) {
      for (var i = start, result = []; i < end; ++i)
        result.push(new Line(text[i], spansFor(i), estimateHeight));
      return result;
    }

    var from = change.from, to = change.to, text = change.text;
    var firstLine = getLine(doc, from.line), lastLine = getLine(doc, to.line);
    var lastText = lst(text), lastSpans = spansFor(text.length - 1), nlines = to.line - from.line;

    // Adjust the line structure
    if (change.full) {
      doc.insert(0, linesFor(0, text.length));
      doc.remove(text.length, doc.size - text.length);
    } else if (isWholeLineUpdate(doc, change)) {
      // This is a whole-line replace. Treated specially to make
      // sure line objects move the way they are supposed to.
      var added = linesFor(0, text.length - 1);
      update(lastLine, lastLine.text, lastSpans);
      if (nlines) doc.remove(from.line, nlines);
      if (added.length) doc.insert(from.line, added);
    } else if (firstLine == lastLine) {
      if (text.length == 1) {
        update(firstLine, firstLine.text.slice(0, from.ch) + lastText + firstLine.text.slice(to.ch), lastSpans);
      } else {
        var added = linesFor(1, text.length - 1);
        added.push(new Line(lastText + firstLine.text.slice(to.ch), lastSpans, estimateHeight));
        update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0));
        doc.insert(from.line + 1, added);
      }
    } else if (text.length == 1) {
      update(firstLine, firstLine.text.slice(0, from.ch) + text[0] + lastLine.text.slice(to.ch), spansFor(0));
      doc.remove(from.line + 1, nlines);
    } else {
      update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0));
      update(lastLine, lastText + lastLine.text.slice(to.ch), lastSpans);
      var added = linesFor(1, text.length - 1);
      if (nlines > 1) doc.remove(from.line + 1, nlines - 1);
      doc.insert(from.line + 1, added);
    }

    signalLater(doc, "change", doc, change);
  }

  // The document is represented as a BTree consisting of leaves, with
  // chunk of lines in them, and branches, with up to ten leaves or
  // other branch nodes below them. The top node is always a branch
  // node, and is the document object itself (meaning it has
  // additional methods and properties).
  //
  // All nodes have parent links. The tree is used both to go from
  // line numbers to line objects, and to go from objects to numbers.
  // It also indexes by height, and is used to convert between height
  // and line object, and to find the total height of the document.
  //
  // See also http://marijnhaverbeke.nl/blog/codemirror-line-tree.html

  function LeafChunk(lines) {
    this.lines = lines;
    this.parent = null;
    for (var i = 0, height = 0; i < lines.length; ++i) {
      lines[i].parent = this;
      height += lines[i].height;
    }
    this.height = height;
  }

  LeafChunk.prototype = {
    chunkSize: function() { return this.lines.length; },
    // Remove the n lines at offset 'at'.
    removeInner: function(at, n) {
      for (var i = at, e = at + n; i < e; ++i) {
        var line = this.lines[i];
        this.height -= line.height;
        cleanUpLine(line);
        signalLater(line, "delete");
      }
      this.lines.splice(at, n);
    },
    // Helper used to collapse a small branch into a single leaf.
    collapse: function(lines) {
      lines.push.apply(lines, this.lines);
    },
    // Insert the given array of lines at offset 'at', count them as
    // having the given height.
    insertInner: function(at, lines, height) {
      this.height += height;
      this.lines = this.lines.slice(0, at).concat(lines).concat(this.lines.slice(at));
      for (var i = 0; i < lines.length; ++i) lines[i].parent = this;
    },
    // Used to iterate over a part of the tree.
    iterN: function(at, n, op) {
      for (var e = at + n; at < e; ++at)
        if (op(this.lines[at])) return true;
    }
  };

  function BranchChunk(children) {
    this.children = children;
    var size = 0, height = 0;
    for (var i = 0; i < children.length; ++i) {
      var ch = children[i];
      size += ch.chunkSize(); height += ch.height;
      ch.parent = this;
    }
    this.size = size;
    this.height = height;
    this.parent = null;
  }

  BranchChunk.prototype = {
    chunkSize: function() { return this.size; },
    removeInner: function(at, n) {
      this.size -= n;
      for (var i = 0; i < this.children.length; ++i) {
        var child = this.children[i], sz = child.chunkSize();
        if (at < sz) {
          var rm = Math.min(n, sz - at), oldHeight = child.height;
          child.removeInner(at, rm);
          this.height -= oldHeight - child.height;
          if (sz == rm) { this.children.splice(i--, 1); child.parent = null; }
          if ((n -= rm) == 0) break;
          at = 0;
        } else at -= sz;
      }
      // If the result is smaller than 25 lines, ensure that it is a
      // single leaf node.
      if (this.size - n < 25 &&
          (this.children.length > 1 || !(this.children[0] instanceof LeafChunk))) {
        var lines = [];
        this.collapse(lines);
        this.children = [new LeafChunk(lines)];
        this.children[0].parent = this;
      }
    },
    collapse: function(lines) {
      for (var i = 0; i < this.children.length; ++i) this.children[i].collapse(lines);
    },
    insertInner: function(at, lines, height) {
      this.size += lines.length;
      this.height += height;
      for (var i = 0; i < this.children.length; ++i) {
        var child = this.children[i], sz = child.chunkSize();
        if (at <= sz) {
          child.insertInner(at, lines, height);
          if (child.lines && child.lines.length > 50) {
            while (child.lines.length > 50) {
              var spilled = child.lines.splice(child.lines.length - 25, 25);
              var newleaf = new LeafChunk(spilled);
              child.height -= newleaf.height;
              this.children.splice(i + 1, 0, newleaf);
              newleaf.parent = this;
            }
            this.maybeSpill();
          }
          break;
        }
        at -= sz;
      }
    },
    // When a node has grown, check whether it should be split.
    maybeSpill: function() {
      if (this.children.length <= 10) return;
      var me = this;
      do {
        var spilled = me.children.splice(me.children.length - 5, 5);
        var sibling = new BranchChunk(spilled);
        if (!me.parent) { // Become the parent node
          var copy = new BranchChunk(me.children);
          copy.parent = me;
          me.children = [copy, sibling];
          me = copy;
        } else {
          me.size -= sibling.size;
          me.height -= sibling.height;
          var myIndex = indexOf(me.parent.children, me);
          me.parent.children.splice(myIndex + 1, 0, sibling);
        }
        sibling.parent = me.parent;
      } while (me.children.length > 10);
      me.parent.maybeSpill();
    },
    iterN: function(at, n, op) {
      for (var i = 0; i < this.children.length; ++i) {
        var child = this.children[i], sz = child.chunkSize();
        if (at < sz) {
          var used = Math.min(n, sz - at);
          if (child.iterN(at, used, op)) return true;
          if ((n -= used) == 0) break;
          at = 0;
        } else at -= sz;
      }
    }
  };

  var nextDocId = 0;
  var Doc = CodeMirror.Doc = function(text, mode, firstLine, lineSep) {
    if (!(this instanceof Doc)) return new Doc(text, mode, firstLine, lineSep);
    if (firstLine == null) firstLine = 0;

    BranchChunk.call(this, [new LeafChunk([new Line("", null)])]);
    this.first = firstLine;
    this.scrollTop = this.scrollLeft = 0;
    this.cantEdit = false;
    this.cleanGeneration = 1;
    this.frontier = firstLine;
    var start = Pos(firstLine, 0);
    this.sel = simpleSelection(start);
    this.history = new History(null);
    this.id = ++nextDocId;
    this.modeOption = mode;
    this.lineSep = lineSep;

    if (typeof text == "string") text = this.splitLines(text);
    updateDoc(this, {from: start, to: start, text: text});
    setSelection(this, simpleSelection(start), sel_dontScroll);
  };

  Doc.prototype = createObj(BranchChunk.prototype, {
    constructor: Doc,
    // Iterate over the document. Supports two forms -- with only one
    // argument, it calls that for each line in the document. With
    // three, it iterates over the range given by the first two (with
    // the second being non-inclusive).
    iter: function(from, to, op) {
      if (op) this.iterN(from - this.first, to - from, op);
      else this.iterN(this.first, this.first + this.size, from);
    },

    // Non-public interface for adding and removing lines.
    insert: function(at, lines) {
      var height = 0;
      for (var i = 0; i < lines.length; ++i) height += lines[i].height;
      this.insertInner(at - this.first, lines, height);
    },
    remove: function(at, n) { this.removeInner(at - this.first, n); },

    // From here, the methods are part of the public interface. Most
    // are also available from CodeMirror (editor) instances.

    getValue: function(lineSep) {
      var lines = getLines(this, this.first, this.first + this.size);
      if (lineSep === false) return lines;
      return lines.join(lineSep || this.lineSeparator());
    },
    setValue: docMethodOp(function(code) {
      var top = Pos(this.first, 0), last = this.first + this.size - 1;
      makeChange(this, {from: top, to: Pos(last, getLine(this, last).text.length),
                        text: this.splitLines(code), origin: "setValue", full: true}, true);
      setSelection(this, simpleSelection(top));
    }),
    replaceRange: function(code, from, to, origin) {
      from = clipPos(this, from);
      to = to ? clipPos(this, to) : from;
      replaceRange(this, code, from, to, origin);
    },
    getRange: function(from, to, lineSep) {
      var lines = getBetween(this, clipPos(this, from), clipPos(this, to));
      if (lineSep === false) return lines;
      return lines.join(lineSep || this.lineSeparator());
    },

    getLine: function(line) {var l = this.getLineHandle(line); return l && l.text;},

    getLineHandle: function(line) {if (isLine(this, line)) return getLine(this, line);},
    getLineNumber: function(line) {return lineNo(line);},

    getLineHandleVisualStart: function(line) {
      if (typeof line == "number") line = getLine(this, line);
      return visualLine(line);
    },

    lineCount: function() {return this.size;},
    firstLine: function() {return this.first;},
    lastLine: function() {return this.first + this.size - 1;},

    clipPos: function(pos) {return clipPos(this, pos);},

    getCursor: function(start) {
      var range = this.sel.primary(), pos;
      if (start == null || start == "head") pos = range.head;
      else if (start == "anchor") pos = range.anchor;
      else if (start == "end" || start == "to" || start === false) pos = range.to();
      else pos = range.from();
      return pos;
    },
    listSelections: function() { return this.sel.ranges; },
    somethingSelected: function() {return this.sel.somethingSelected();},

    setCursor: docMethodOp(function(line, ch, options) {
      setSimpleSelection(this, clipPos(this, typeof line == "number" ? Pos(line, ch || 0) : line), null, options);
    }),
    setSelection: docMethodOp(function(anchor, head, options) {
      setSimpleSelection(this, clipPos(this, anchor), clipPos(this, head || anchor), options);
    }),
    extendSelection: docMethodOp(function(head, other, options) {
      extendSelection(this, clipPos(this, head), other && clipPos(this, other), options);
    }),
    extendSelections: docMethodOp(function(heads, options) {
      extendSelections(this, clipPosArray(this, heads, options));
    }),
    extendSelectionsBy: docMethodOp(function(f, options) {
      extendSelections(this, map(this.sel.ranges, f), options);
    }),
    setSelections: docMethodOp(function(ranges, primary, options) {
      if (!ranges.length) return;
      for (var i = 0, out = []; i < ranges.length; i++)
        out[i] = new Range(clipPos(this, ranges[i].anchor),
                           clipPos(this, ranges[i].head));
      if (primary == null) primary = Math.min(ranges.length - 1, this.sel.primIndex);
      setSelection(this, normalizeSelection(out, primary), options);
    }),
    addSelection: docMethodOp(function(anchor, head, options) {
      var ranges = this.sel.ranges.slice(0);
      ranges.push(new Range(clipPos(this, anchor), clipPos(this, head || anchor)));
      setSelection(this, normalizeSelection(ranges, ranges.length - 1), options);
    }),

    getSelection: function(lineSep) {
      var ranges = this.sel.ranges, lines;
      for (var i = 0; i < ranges.length; i++) {
        var sel = getBetween(this, ranges[i].from(), ranges[i].to());
        lines = lines ? lines.concat(sel) : sel;
      }
      if (lineSep === false) return lines;
      else return lines.join(lineSep || this.lineSeparator());
    },
    getSelections: function(lineSep) {
      var parts = [], ranges = this.sel.ranges;
      for (var i = 0; i < ranges.length; i++) {
        var sel = getBetween(this, ranges[i].from(), ranges[i].to());
        if (lineSep !== false) sel = sel.join(lineSep || this.lineSeparator());
        parts[i] = sel;
      }
      return parts;
    },
    replaceSelection: function(code, collapse, origin) {
      var dup = [];
      for (var i = 0; i < this.sel.ranges.length; i++)
        dup[i] = code;
      this.replaceSelections(dup, collapse, origin || "+input");
    },
    replaceSelections: docMethodOp(function(code, collapse, origin) {
      var changes = [], sel = this.sel;
      for (var i = 0; i < sel.ranges.length; i++) {
        var range = sel.ranges[i];
        changes[i] = {from: range.from(), to: range.to(), text: this.splitLines(code[i]), origin: origin};
      }
      var newSel = collapse && collapse != "end" && computeReplacedSel(this, changes, collapse);
      for (var i = changes.length - 1; i >= 0; i--)
        makeChange(this, changes[i]);
      if (newSel) setSelectionReplaceHistory(this, newSel);
      else if (this.cm) ensureCursorVisible(this.cm);
    }),
    undo: docMethodOp(function() {makeChangeFromHistory(this, "undo");}),
    redo: docMethodOp(function() {makeChangeFromHistory(this, "redo");}),
    undoSelection: docMethodOp(function() {makeChangeFromHistory(this, "undo", true);}),
    redoSelection: docMethodOp(function() {makeChangeFromHistory(this, "redo", true);}),

    setExtending: function(val) {this.extend = val;},
    getExtending: function() {return this.extend;},

    historySize: function() {
      var hist = this.history, done = 0, undone = 0;
      for (var i = 0; i < hist.done.length; i++) if (!hist.done[i].ranges) ++done;
      for (var i = 0; i < hist.undone.length; i++) if (!hist.undone[i].ranges) ++undone;
      return {undo: done, redo: undone};
    },
    clearHistory: function() {this.history = new History(this.history.maxGeneration);},

    markClean: function() {
      this.cleanGeneration = this.changeGeneration(true);
    },
    changeGeneration: function(forceSplit) {
      if (forceSplit)
        this.history.lastOp = this.history.lastSelOp = this.history.lastOrigin = null;
      return this.history.generation;
    },
    isClean: function (gen) {
      return this.history.generation == (gen || this.cleanGeneration);
    },

    getHistory: function() {
      return {done: copyHistoryArray(this.history.done),
              undone: copyHistoryArray(this.history.undone)};
    },
    setHistory: function(histData) {
      var hist = this.history = new History(this.history.maxGeneration);
      hist.done = copyHistoryArray(histData.done.slice(0), null, true);
      hist.undone = copyHistoryArray(histData.undone.slice(0), null, true);
    },

    addLineClass: docMethodOp(function(handle, where, cls) {
      return changeLine(this, handle, where == "gutter" ? "gutter" : "class", function(line) {
        var prop = where == "text" ? "textClass"
                 : where == "background" ? "bgClass"
                 : where == "gutter" ? "gutterClass" : "wrapClass";
        if (!line[prop]) line[prop] = cls;
        else if (classTest(cls).test(line[prop])) return false;
        else line[prop] += " " + cls;
        return true;
      });
    }),
    removeLineClass: docMethodOp(function(handle, where, cls) {
      return changeLine(this, handle, where == "gutter" ? "gutter" : "class", function(line) {
        var prop = where == "text" ? "textClass"
                 : where == "background" ? "bgClass"
                 : where == "gutter" ? "gutterClass" : "wrapClass";
        var cur = line[prop];
        if (!cur) return false;
        else if (cls == null) line[prop] = null;
        else {
          var found = cur.match(classTest(cls));
          if (!found) return false;
          var end = found.index + found[0].length;
          line[prop] = cur.slice(0, found.index) + (!found.index || end == cur.length ? "" : " ") + cur.slice(end) || null;
        }
        return true;
      });
    }),

    addLineWidget: docMethodOp(function(handle, node, options) {
      return addLineWidget(this, handle, node, options);
    }),
    removeLineWidget: function(widget) { widget.clear(); },

    markText: function(from, to, options) {
      return markText(this, clipPos(this, from), clipPos(this, to), options, "range");
    },
    setBookmark: function(pos, options) {
      var realOpts = {replacedWith: options && (options.nodeType == null ? options.widget : options),
                      insertLeft: options && options.insertLeft,
                      clearWhenEmpty: false, shared: options && options.shared,
                      handleMouseEvents: options && options.handleMouseEvents};
      pos = clipPos(this, pos);
      return markText(this, pos, pos, realOpts, "bookmark");
    },
    findMarksAt: function(pos) {
      pos = clipPos(this, pos);
      var markers = [], spans = getLine(this, pos.line).markedSpans;
      if (spans) for (var i = 0; i < spans.length; ++i) {
        var span = spans[i];
        if ((span.from == null || span.from <= pos.ch) &&
            (span.to == null || span.to >= pos.ch))
          markers.push(span.marker.parent || span.marker);
      }
      return markers;
    },
    findMarks: function(from, to, filter) {
      from = clipPos(this, from); to = clipPos(this, to);
      var found = [], lineNo = from.line;
      this.iter(from.line, to.line + 1, function(line) {
        var spans = line.markedSpans;
        if (spans) for (var i = 0; i < spans.length; i++) {
          var span = spans[i];
          if (!(lineNo == from.line && from.ch > span.to ||
                span.from == null && lineNo != from.line||
                lineNo == to.line && span.from > to.ch) &&
              (!filter || filter(span.marker)))
            found.push(span.marker.parent || span.marker);
        }
        ++lineNo;
      });
      return found;
    },
    getAllMarks: function() {
      var markers = [];
      this.iter(function(line) {
        var sps = line.markedSpans;
        if (sps) for (var i = 0; i < sps.length; ++i)
          if (sps[i].from != null) markers.push(sps[i].marker);
      });
      return markers;
    },

    posFromIndex: function(off) {
      var ch, lineNo = this.first;
      this.iter(function(line) {
        var sz = line.text.length + 1;
        if (sz > off) { ch = off; return true; }
        off -= sz;
        ++lineNo;
      });
      return clipPos(this, Pos(lineNo, ch));
    },
    indexFromPos: function (coords) {
      coords = clipPos(this, coords);
      var index = coords.ch;
      if (coords.line < this.first || coords.ch < 0) return 0;
      this.iter(this.first, coords.line, function (line) {
        index += line.text.length + 1;
      });
      return index;
    },

    copy: function(copyHistory) {
      var doc = new Doc(getLines(this, this.first, this.first + this.size),
                        this.modeOption, this.first, this.lineSep);
      doc.scrollTop = this.scrollTop; doc.scrollLeft = this.scrollLeft;
      doc.sel = this.sel;
      doc.extend = false;
      if (copyHistory) {
        doc.history.undoDepth = this.history.undoDepth;
        doc.setHistory(this.getHistory());
      }
      return doc;
    },

    linkedDoc: function(options) {
      if (!options) options = {};
      var from = this.first, to = this.first + this.size;
      if (options.from != null && options.from > from) from = options.from;
      if (options.to != null && options.to < to) to = options.to;
      var copy = new Doc(getLines(this, from, to), options.mode || this.modeOption, from, this.lineSep);
      if (options.sharedHist) copy.history = this.history;
      (this.linked || (this.linked = [])).push({doc: copy, sharedHist: options.sharedHist});
      copy.linked = [{doc: this, isParent: true, sharedHist: options.sharedHist}];
      copySharedMarkers(copy, findSharedMarkers(this));
      return copy;
    },
    unlinkDoc: function(other) {
      if (other instanceof CodeMirror) other = other.doc;
      if (this.linked) for (var i = 0; i < this.linked.length; ++i) {
        var link = this.linked[i];
        if (link.doc != other) continue;
        this.linked.splice(i, 1);
        other.unlinkDoc(this);
        detachSharedMarkers(findSharedMarkers(this));
        break;
      }
      // If the histories were shared, split them again
      if (other.history == this.history) {
        var splitIds = [other.id];
        linkedDocs(other, function(doc) {splitIds.push(doc.id);}, true);
        other.history = new History(null);
        other.history.done = copyHistoryArray(this.history.done, splitIds);
        other.history.undone = copyHistoryArray(this.history.undone, splitIds);
      }
    },
    iterLinkedDocs: function(f) {linkedDocs(this, f);},

    getMode: function() {return this.mode;},
    getEditor: function() {return this.cm;},

    splitLines: function(str) {
      if (this.lineSep) return str.split(this.lineSep);
      return splitLinesAuto(str);
    },
    lineSeparator: function() { return this.lineSep || "\n"; }
  });

  // Public alias.
  Doc.prototype.eachLine = Doc.prototype.iter;

  // Set up methods on CodeMirror's prototype to redirect to the editor's document.
  var dontDelegate = "iter insert remove copy getEditor constructor".split(" ");
  for (var prop in Doc.prototype) if (Doc.prototype.hasOwnProperty(prop) && indexOf(dontDelegate, prop) < 0)
    CodeMirror.prototype[prop] = (function(method) {
      return function() {return method.apply(this.doc, arguments);};
    })(Doc.prototype[prop]);

  eventMixin(Doc);

  // Call f for all linked documents.
  function linkedDocs(doc, f, sharedHistOnly) {
    function propagate(doc, skip, sharedHist) {
      if (doc.linked) for (var i = 0; i < doc.linked.length; ++i) {
        var rel = doc.linked[i];
        if (rel.doc == skip) continue;
        var shared = sharedHist && rel.sharedHist;
        if (sharedHistOnly && !shared) continue;
        f(rel.doc, shared);
        propagate(rel.doc, doc, shared);
      }
    }
    propagate(doc, null, true);
  }

  // Attach a document to an editor.
  function attachDoc(cm, doc) {
    if (doc.cm) throw new Error("This document is already in use.");
    cm.doc = doc;
    doc.cm = cm;
    estimateLineHeights(cm);
    loadMode(cm);
    if (!cm.options.lineWrapping) findMaxLine(cm);
    cm.options.mode = doc.modeOption;
    regChange(cm);
  }

  // LINE UTILITIES

  // Find the line object corresponding to the given line number.
  function getLine(doc, n) {
    n -= doc.first;
    if (n < 0 || n >= doc.size) throw new Error("There is no line " + (n + doc.first) + " in the document.");
    for (var chunk = doc; !chunk.lines;) {
      for (var i = 0;; ++i) {
        var child = chunk.children[i], sz = child.chunkSize();
        if (n < sz) { chunk = child; break; }
        n -= sz;
      }
    }
    return chunk.lines[n];
  }

  // Get the part of a document between two positions, as an array of
  // strings.
  function getBetween(doc, start, end) {
    var out = [], n = start.line;
    doc.iter(start.line, end.line + 1, function(line) {
      var text = line.text;
      if (n == end.line) text = text.slice(0, end.ch);
      if (n == start.line) text = text.slice(start.ch);
      out.push(text);
      ++n;
    });
    return out;
  }
  // Get the lines between from and to, as array of strings.
  function getLines(doc, from, to) {
    var out = [];
    doc.iter(from, to, function(line) { out.push(line.text); });
    return out;
  }

  // Update the height of a line, propagating the height change
  // upwards to parent nodes.
  function updateLineHeight(line, height) {
    var diff = height - line.height;
    if (diff) for (var n = line; n; n = n.parent) n.height += diff;
  }

  // Given a line object, find its line number by walking up through
  // its parent links.
  function lineNo(line) {
    if (line.parent == null) return null;
    var cur = line.parent, no = indexOf(cur.lines, line);
    for (var chunk = cur.parent; chunk; cur = chunk, chunk = chunk.parent) {
      for (var i = 0;; ++i) {
        if (chunk.children[i] == cur) break;
        no += chunk.children[i].chunkSize();
      }
    }
    return no + cur.first;
  }

  // Find the line at the given vertical position, using the height
  // information in the document tree.
  function lineAtHeight(chunk, h) {
    var n = chunk.first;
    outer: do {
      for (var i = 0; i < chunk.children.length; ++i) {
        var child = chunk.children[i], ch = child.height;
        if (h < ch) { chunk = child; continue outer; }
        h -= ch;
        n += child.chunkSize();
      }
      return n;
    } while (!chunk.lines);
    for (var i = 0; i < chunk.lines.length; ++i) {
      var line = chunk.lines[i], lh = line.height;
      if (h < lh) break;
      h -= lh;
    }
    return n + i;
  }


  // Find the height above the given line.
  function heightAtLine(lineObj) {
    lineObj = visualLine(lineObj);

    var h = 0, chunk = lineObj.parent;
    for (var i = 0; i < chunk.lines.length; ++i) {
      var line = chunk.lines[i];
      if (line == lineObj) break;
      else h += line.height;
    }
    for (var p = chunk.parent; p; chunk = p, p = chunk.parent) {
      for (var i = 0; i < p.children.length; ++i) {
        var cur = p.children[i];
        if (cur == chunk) break;
        else h += cur.height;
      }
    }
    return h;
  }

  // Get the bidi ordering for the given line (and cache it). Returns
  // false for lines that are fully left-to-right, and an array of
  // BidiSpan objects otherwise.
  function getOrder(line) {
    var order = line.order;
    if (order == null) order = line.order = bidiOrdering(line.text);
    return order;
  }

  // HISTORY

  function History(startGen) {
    // Arrays of change events and selections. Doing something adds an
    // event to done and clears undo. Undoing moves events from done
    // to undone, redoing moves them in the other direction.
    this.done = []; this.undone = [];
    this.undoDepth = Infinity;
    // Used to track when changes can be merged into a single undo
    // event
    this.lastModTime = this.lastSelTime = 0;
    this.lastOp = this.lastSelOp = null;
    this.lastOrigin = this.lastSelOrigin = null;
    // Used by the isClean() method
    this.generation = this.maxGeneration = startGen || 1;
  }

  // Create a history change event from an updateDoc-style change
  // object.
  function historyChangeFromChange(doc, change) {
    var histChange = {from: copyPos(change.from), to: changeEnd(change), text: getBetween(doc, change.from, change.to)};
    attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1);
    linkedDocs(doc, function(doc) {attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1);}, true);
    return histChange;
  }

  // Pop all selection events off the end of a history array. Stop at
  // a change event.
  function clearSelectionEvents(array) {
    while (array.length) {
      var last = lst(array);
      if (last.ranges) array.pop();
      else break;
    }
  }

  // Find the top change event in the history. Pop off selection
  // events that are in the way.
  function lastChangeEvent(hist, force) {
    if (force) {
      clearSelectionEvents(hist.done);
      return lst(hist.done);
    } else if (hist.done.length && !lst(hist.done).ranges) {
      return lst(hist.done);
    } else if (hist.done.length > 1 && !hist.done[hist.done.length - 2].ranges) {
      hist.done.pop();
      return lst(hist.done);
    }
  }

  // Register a change in the history. Merges changes that are within
  // a single operation, ore are close together with an origin that
  // allows merging (starting with "+") into a single event.
  function addChangeToHistory(doc, change, selAfter, opId) {
    var hist = doc.history;
    hist.undone.length = 0;
    var time = +new Date, cur;

    if ((hist.lastOp == opId ||
         hist.lastOrigin == change.origin && change.origin &&
         ((change.origin.charAt(0) == "+" && doc.cm && hist.lastModTime > time - doc.cm.options.historyEventDelay) ||
          change.origin.charAt(0) == "*")) &&
        (cur = lastChangeEvent(hist, hist.lastOp == opId))) {
      // Merge this change into the last event
      var last = lst(cur.changes);
      if (cmp(change.from, change.to) == 0 && cmp(change.from, last.to) == 0) {
        // Optimized case for simple insertion -- don't want to add
        // new changesets for every character typed
        last.to = changeEnd(change);
      } else {
        // Add new sub-event
        cur.changes.push(historyChangeFromChange(doc, change));
      }
    } else {
      // Can not be merged, start a new event.
      var before = lst(hist.done);
      if (!before || !before.ranges)
        pushSelectionToHistory(doc.sel, hist.done);
      cur = {changes: [historyChangeFromChange(doc, change)],
             generation: hist.generation};
      hist.done.push(cur);
      while (hist.done.length > hist.undoDepth) {
        hist.done.shift();
        if (!hist.done[0].ranges) hist.done.shift();
      }
    }
    hist.done.push(selAfter);
    hist.generation = ++hist.maxGeneration;
    hist.lastModTime = hist.lastSelTime = time;
    hist.lastOp = hist.lastSelOp = opId;
    hist.lastOrigin = hist.lastSelOrigin = change.origin;

    if (!last) signal(doc, "historyAdded");
  }

  function selectionEventCanBeMerged(doc, origin, prev, sel) {
    var ch = origin.charAt(0);
    return ch == "*" ||
      ch == "+" &&
      prev.ranges.length == sel.ranges.length &&
      prev.somethingSelected() == sel.somethingSelected() &&
      new Date - doc.history.lastSelTime <= (doc.cm ? doc.cm.options.historyEventDelay : 500);
  }

  // Called whenever the selection changes, sets the new selection as
  // the pending selection in the history, and pushes the old pending
  // selection into the 'done' array when it was significantly
  // different (in number of selected ranges, emptiness, or time).
  function addSelectionToHistory(doc, sel, opId, options) {
    var hist = doc.history, origin = options && options.origin;

    // A new event is started when the previous origin does not match
    // the current, or the origins don't allow matching. Origins
    // starting with * are always merged, those starting with + are
    // merged when similar and close together in time.
    if (opId == hist.lastSelOp ||
        (origin && hist.lastSelOrigin == origin &&
         (hist.lastModTime == hist.lastSelTime && hist.lastOrigin == origin ||
          selectionEventCanBeMerged(doc, origin, lst(hist.done), sel))))
      hist.done[hist.done.length - 1] = sel;
    else
      pushSelectionToHistory(sel, hist.done);

    hist.lastSelTime = +new Date;
    hist.lastSelOrigin = origin;
    hist.lastSelOp = opId;
    if (options && options.clearRedo !== false)
      clearSelectionEvents(hist.undone);
  }

  function pushSelectionToHistory(sel, dest) {
    var top = lst(dest);
    if (!(top && top.ranges && top.equals(sel)))
      dest.push(sel);
  }

  // Used to store marked span information in the history.
  function attachLocalSpans(doc, change, from, to) {
    var existing = change["spans_" + doc.id], n = 0;
    doc.iter(Math.max(doc.first, from), Math.min(doc.first + doc.size, to), function(line) {
      if (line.markedSpans)
        (existing || (existing = change["spans_" + doc.id] = {}))[n] = line.markedSpans;
      ++n;
    });
  }

  // When un/re-doing restores text containing marked spans, those
  // that have been explicitly cleared should not be restored.
  function removeClearedSpans(spans) {
    if (!spans) return null;
    for (var i = 0, out; i < spans.length; ++i) {
      if (spans[i].marker.explicitlyCleared) { if (!out) out = spans.slice(0, i); }
      else if (out) out.push(spans[i]);
    }
    return !out ? spans : out.length ? out : null;
  }

  // Retrieve and filter the old marked spans stored in a change event.
  function getOldSpans(doc, change) {
    var found = change["spans_" + doc.id];
    if (!found) return null;
    for (var i = 0, nw = []; i < change.text.length; ++i)
      nw.push(removeClearedSpans(found[i]));
    return nw;
  }

  // Used both to provide a JSON-safe object in .getHistory, and, when
  // detaching a document, to split the history in two
  function copyHistoryArray(events, newGroup, instantiateSel) {
    for (var i = 0, copy = []; i < events.length; ++i) {
      var event = events[i];
      if (event.ranges) {
        copy.push(instantiateSel ? Selection.prototype.deepCopy.call(event) : event);
        continue;
      }
      var changes = event.changes, newChanges = [];
      copy.push({changes: newChanges});
      for (var j = 0; j < changes.length; ++j) {
        var change = changes[j], m;
        newChanges.push({from: change.from, to: change.to, text: change.text});
        if (newGroup) for (var prop in change) if (m = prop.match(/^spans_(\d+)$/)) {
          if (indexOf(newGroup, Number(m[1])) > -1) {
            lst(newChanges)[prop] = change[prop];
            delete change[prop];
          }
        }
      }
    }
    return copy;
  }

  // Rebasing/resetting history to deal with externally-sourced changes

  function rebaseHistSelSingle(pos, from, to, diff) {
    if (to < pos.line) {
      pos.line += diff;
    } else if (from < pos.line) {
      pos.line = from;
      pos.ch = 0;
    }
  }

  // Tries to rebase an array of history events given a change in the
  // document. If the change touches the same lines as the event, the
  // event, and everything 'behind' it, is discarded. If the change is
  // before the event, the event's positions are updated. Uses a
  // copy-on-write scheme for the positions, to avoid having to
  // reallocate them all on every rebase, but also avoid problems with
  // shared position objects being unsafely updated.
  function rebaseHistArray(array, from, to, diff) {
    for (var i = 0; i < array.length; ++i) {
      var sub = array[i], ok = true;
      if (sub.ranges) {
        if (!sub.copied) { sub = array[i] = sub.deepCopy(); sub.copied = true; }
        for (var j = 0; j < sub.ranges.length; j++) {
          rebaseHistSelSingle(sub.ranges[j].anchor, from, to, diff);
          rebaseHistSelSingle(sub.ranges[j].head, from, to, diff);
        }
        continue;
      }
      for (var j = 0; j < sub.changes.length; ++j) {
        var cur = sub.changes[j];
        if (to < cur.from.line) {
          cur.from = Pos(cur.from.line + diff, cur.from.ch);
          cur.to = Pos(cur.to.line + diff, cur.to.ch);
        } else if (from <= cur.to.line) {
          ok = false;
          break;
        }
      }
      if (!ok) {
        array.splice(0, i + 1);
        i = 0;
      }
    }
  }

  function rebaseHist(hist, change) {
    var from = change.from.line, to = change.to.line, diff = change.text.length - (to - from) - 1;
    rebaseHistArray(hist.done, from, to, diff);
    rebaseHistArray(hist.undone, from, to, diff);
  }

  // EVENT UTILITIES

  // Due to the fact that we still support jurassic IE versions, some
  // compatibility wrappers are needed.

  var e_preventDefault = CodeMirror.e_preventDefault = function(e) {
    if (e.preventDefault) e.preventDefault();
    else e.returnValue = false;
  };
  var e_stopPropagation = CodeMirror.e_stopPropagation = function(e) {
    if (e.stopPropagation) e.stopPropagation();
    else e.cancelBubble = true;
  };
  function e_defaultPrevented(e) {
    return e.defaultPrevented != null ? e.defaultPrevented : e.returnValue == false;
  }
  var e_stop = CodeMirror.e_stop = function(e) {e_preventDefault(e); e_stopPropagation(e);};

  function e_target(e) {return e.target || e.srcElement;}
  function e_button(e) {
    var b = e.which;
    if (b == null) {
      if (e.button & 1) b = 1;
      else if (e.button & 2) b = 3;
      else if (e.button & 4) b = 2;
    }
    if (mac && e.ctrlKey && b == 1) b = 3;
    return b;
  }

  // EVENT HANDLING

  // Lightweight event framework. on/off also work on DOM nodes,
  // registering native DOM handlers.

  var on = CodeMirror.on = function(emitter, type, f) {
    if (emitter.addEventListener)
      emitter.addEventListener(type, f, false);
    else if (emitter.attachEvent)
      emitter.attachEvent("on" + type, f);
    else {
      var map = emitter._handlers || (emitter._handlers = {});
      var arr = map[type] || (map[type] = []);
      arr.push(f);
    }
  };

  var off = CodeMirror.off = function(emitter, type, f) {
    if (emitter.removeEventListener)
      emitter.removeEventListener(type, f, false);
    else if (emitter.detachEvent)
      emitter.detachEvent("on" + type, f);
    else {
      var arr = emitter._handlers && emitter._handlers[type];
      if (!arr) return;
      for (var i = 0; i < arr.length; ++i)
        if (arr[i] == f) { arr.splice(i, 1); break; }
    }
  };

  var signal = CodeMirror.signal = function(emitter, type /*, values...*/) {
    var arr = emitter._handlers && emitter._handlers[type];
    if (!arr) return;
    var args = Array.prototype.slice.call(arguments, 2);
    for (var i = 0; i < arr.length; ++i) arr[i].apply(null, args);
  };

  var orphanDelayedCallbacks = null;

  // Often, we want to signal events at a point where we are in the
  // middle of some work, but don't want the handler to start calling
  // other methods on the editor, which might be in an inconsistent
  // state or simply not expect any other events to happen.
  // signalLater looks whether there are any handlers, and schedules
  // them to be executed when the last operation ends, or, if no
  // operation is active, when a timeout fires.
  function signalLater(emitter, type /*, values...*/) {
    var arr = emitter._handlers && emitter._handlers[type];
    if (!arr) return;
    var args = Array.prototype.slice.call(arguments, 2), list;
    if (operationGroup) {
      list = operationGroup.delayedCallbacks;
    } else if (orphanDelayedCallbacks) {
      list = orphanDelayedCallbacks;
    } else {
      list = orphanDelayedCallbacks = [];
      setTimeout(fireOrphanDelayed, 0);
    }
    function bnd(f) {return function(){f.apply(null, args);};};
    for (var i = 0; i < arr.length; ++i)
      list.push(bnd(arr[i]));
  }

  function fireOrphanDelayed() {
    var delayed = orphanDelayedCallbacks;
    orphanDelayedCallbacks = null;
    for (var i = 0; i < delayed.length; ++i) delayed[i]();
  }

  // The DOM events that CodeMirror handles can be overridden by
  // registering a (non-DOM) handler on the editor for the event name,
  // and preventDefault-ing the event in that handler.
  function signalDOMEvent(cm, e, override) {
    if (typeof e == "string")
      e = {type: e, preventDefault: function() { this.defaultPrevented = true; }};
    signal(cm, override || e.type, cm, e);
    return e_defaultPrevented(e) || e.codemirrorIgnore;
  }

  function signalCursorActivity(cm) {
    var arr = cm._handlers && cm._handlers.cursorActivity;
    if (!arr) return;
    var set = cm.curOp.cursorActivityHandlers || (cm.curOp.cursorActivityHandlers = []);
    for (var i = 0; i < arr.length; ++i) if (indexOf(set, arr[i]) == -1)
      set.push(arr[i]);
  }

  function hasHandler(emitter, type) {
    var arr = emitter._handlers && emitter._handlers[type];
    return arr && arr.length > 0;
  }

  // Add on and off methods to a constructor's prototype, to make
  // registering events on such objects more convenient.
  function eventMixin(ctor) {
    ctor.prototype.on = function(type, f) {on(this, type, f);};
    ctor.prototype.off = function(type, f) {off(this, type, f);};
  }

  // MISC UTILITIES

  // Number of pixels added to scroller and sizer to hide scrollbar
  var scrollerGap = 30;

  // Returned or thrown by various protocols to signal 'I'm not
  // handling this'.
  var Pass = CodeMirror.Pass = {toString: function(){return "CodeMirror.Pass";}};

  // Reused option objects for setSelection & friends
  var sel_dontScroll = {scroll: false}, sel_mouse = {origin: "*mouse"}, sel_move = {origin: "+move"};

  function Delayed() {this.id = null;}
  Delayed.prototype.set = function(ms, f) {
    clearTimeout(this.id);
    this.id = setTimeout(f, ms);
  };

  // Counts the column offset in a string, taking tabs into account.
  // Used mostly to find indentation.
  var countColumn = CodeMirror.countColumn = function(string, end, tabSize, startIndex, startValue) {
    if (end == null) {
      end = string.search(/[^\s\u00a0]/);
      if (end == -1) end = string.length;
    }
    for (var i = startIndex || 0, n = startValue || 0;;) {
      var nextTab = string.indexOf("\t", i);
      if (nextTab < 0 || nextTab >= end)
        return n + (end - i);
      n += nextTab - i;
      n += tabSize - (n % tabSize);
      i = nextTab + 1;
    }
  };

  // The inverse of countColumn -- find the offset that corresponds to
  // a particular column.
  function findColumn(string, goal, tabSize) {
    for (var pos = 0, col = 0;;) {
      var nextTab = string.indexOf("\t", pos);
      if (nextTab == -1) nextTab = string.length;
      var skipped = nextTab - pos;
      if (nextTab == string.length || col + skipped >= goal)
        return pos + Math.min(skipped, goal - col);
      col += nextTab - pos;
      col += tabSize - (col % tabSize);
      pos = nextTab + 1;
      if (col >= goal) return pos;
    }
  }

  var spaceStrs = [""];
  function spaceStr(n) {
    while (spaceStrs.length <= n)
      spaceStrs.push(lst(spaceStrs) + " ");
    return spaceStrs[n];
  }

  function lst(arr) { return arr[arr.length-1]; }

  var selectInput = function(node) { node.select(); };
  if (ios) // Mobile Safari apparently has a bug where select() is broken.
    selectInput = function(node) { node.selectionStart = 0; node.selectionEnd = node.value.length; };
  else if (ie) // Suppress mysterious IE10 errors
    selectInput = function(node) { try { node.select(); } catch(_e) {} };

  function indexOf(array, elt) {
    for (var i = 0; i < array.length; ++i)
      if (array[i] == elt) return i;
    return -1;
  }
  function map(array, f) {
    var out = [];
    for (var i = 0; i < array.length; i++) out[i] = f(array[i], i);
    return out;
  }

  function nothing() {}

  function createObj(base, props) {
    var inst;
    if (Object.create) {
      inst = Object.create(base);
    } else {
      nothing.prototype = base;
      inst = new nothing();
    }
    if (props) copyObj(props, inst);
    return inst;
  };

  function copyObj(obj, target, overwrite) {
    if (!target) target = {};
    for (var prop in obj)
      if (obj.hasOwnProperty(prop) && (overwrite !== false || !target.hasOwnProperty(prop)))
        target[prop] = obj[prop];
    return target;
  }

  function bind(f) {
    var args = Array.prototype.slice.call(arguments, 1);
    return function(){return f.apply(null, args);};
  }

  var nonASCIISingleCaseWordChar = /[\u00df\u0587\u0590-\u05f4\u0600-\u06ff\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc\uac00-\ud7af]/;
  var isWordCharBasic = CodeMirror.isWordChar = function(ch) {
    return /\w/.test(ch) || ch > "\x80" &&
      (ch.toUpperCase() != ch.toLowerCase() || nonASCIISingleCaseWordChar.test(ch));
  };
  function isWordChar(ch, helper) {
    if (!helper) return isWordCharBasic(ch);
    if (helper.source.indexOf("\\w") > -1 && isWordCharBasic(ch)) return true;
    return helper.test(ch);
  }

  function isEmpty(obj) {
    for (var n in obj) if (obj.hasOwnProperty(n) && obj[n]) return false;
    return true;
  }

  // Extending unicode characters. A series of a non-extending char +
  // any number of extending chars is treated as a single unit as far
  // as editing and measuring is concerned. This is not fully correct,
  // since some scripts/fonts/browsers also treat other configurations
  // of code points as a group.
  var extendingChars = /[\u0300-\u036f\u0483-\u0489\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u065e\u0670\u06d6-\u06dc\u06de-\u06e4\u06e7\u06e8\u06ea-\u06ed\u0711\u0730-\u074a\u07a6-\u07b0\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0900-\u0902\u093c\u0941-\u0948\u094d\u0951-\u0955\u0962\u0963\u0981\u09bc\u09be\u09c1-\u09c4\u09cd\u09d7\u09e2\u09e3\u0a01\u0a02\u0a3c\u0a41\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a70\u0a71\u0a75\u0a81\u0a82\u0abc\u0ac1-\u0ac5\u0ac7\u0ac8\u0acd\u0ae2\u0ae3\u0b01\u0b3c\u0b3e\u0b3f\u0b41-\u0b44\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b82\u0bbe\u0bc0\u0bcd\u0bd7\u0c3e-\u0c40\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0cbc\u0cbf\u0cc2\u0cc6\u0ccc\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0d3e\u0d41-\u0d44\u0d4d\u0d57\u0d62\u0d63\u0dca\u0dcf\u0dd2-\u0dd4\u0dd6\u0ddf\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0f18\u0f19\u0f35\u0f37\u0f39\u0f71-\u0f7e\u0f80-\u0f84\u0f86\u0f87\u0f90-\u0f97\u0f99-\u0fbc\u0fc6\u102d-\u1030\u1032-\u1037\u1039\u103a\u103d\u103e\u1058\u1059\u105e-\u1060\u1071-\u1074\u1082\u1085\u1086\u108d\u109d\u135f\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b7-\u17bd\u17c6\u17c9-\u17d3\u17dd\u180b-\u180d\u18a9\u1920-\u1922\u1927\u1928\u1932\u1939-\u193b\u1a17\u1a18\u1a56\u1a58-\u1a5e\u1a60\u1a62\u1a65-\u1a6c\u1a73-\u1a7c\u1a7f\u1b00-\u1b03\u1b34\u1b36-\u1b3a\u1b3c\u1b42\u1b6b-\u1b73\u1b80\u1b81\u1ba2-\u1ba5\u1ba8\u1ba9\u1c2c-\u1c33\u1c36\u1c37\u1cd0-\u1cd2\u1cd4-\u1ce0\u1ce2-\u1ce8\u1ced\u1dc0-\u1de6\u1dfd-\u1dff\u200c\u200d\u20d0-\u20f0\u2cef-\u2cf1\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua66f-\ua672\ua67c\ua67d\ua6f0\ua6f1\ua802\ua806\ua80b\ua825\ua826\ua8c4\ua8e0-\ua8f1\ua926-\ua92d\ua947-\ua951\ua980-\ua982\ua9b3\ua9b6-\ua9b9\ua9bc\uaa29-\uaa2e\uaa31\uaa32\uaa35\uaa36\uaa43\uaa4c\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uabe5\uabe8\uabed\udc00-\udfff\ufb1e\ufe00-\ufe0f\ufe20-\ufe26\uff9e\uff9f]/;
  function isExtendingChar(ch) { return ch.charCodeAt(0) >= 768 && extendingChars.test(ch); }

  // DOM UTILITIES

  function elt(tag, content, className, style) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (style) e.style.cssText = style;
    if (typeof content == "string") e.appendChild(document.createTextNode(content));
    else if (content) for (var i = 0; i < content.length; ++i) e.appendChild(content[i]);
    return e;
  }

  var range;
  if (document.createRange) range = function(node, start, end, endNode) {
    var r = document.createRange();
    r.setEnd(endNode || node, end);
    r.setStart(node, start);
    return r;
  };
  else range = function(node, start, end) {
    var r = document.body.createTextRange();
    try { r.moveToElementText(node.parentNode); }
    catch(e) { return r; }
    r.collapse(true);
    r.moveEnd("character", end);
    r.moveStart("character", start);
    return r;
  };

  function removeChildren(e) {
    for (var count = e.childNodes.length; count > 0; --count)
      e.removeChild(e.firstChild);
    return e;
  }

  function removeChildrenAndAdd(parent, e) {
    return removeChildren(parent).appendChild(e);
  }

  var contains = CodeMirror.contains = function(parent, child) {
    if (child.nodeType == 3) // Android browser always returns false when child is a textnode
      child = child.parentNode;
    if (parent.contains)
      return parent.contains(child);
    do {
      if (child.nodeType == 11) child = child.host;
      if (child == parent) return true;
    } while (child = child.parentNode);
  };

  function activeElt() {
    var activeElement = document.activeElement;
    while (activeElement && activeElement.root && activeElement.root.activeElement)
      activeElement = activeElement.root.activeElement;
    return activeElement;
  }
  // Older versions of IE throws unspecified error when touching
  // document.activeElement in some cases (during loading, in iframe)
  if (ie && ie_version < 11) activeElt = function() {
    try { return document.activeElement; }
    catch(e) { return document.body; }
  };

  function classTest(cls) { return new RegExp("(^|\\s)" + cls + "(?:$|\\s)\\s*"); }
  var rmClass = CodeMirror.rmClass = function(node, cls) {
    var current = node.className;
    var match = classTest(cls).exec(current);
    if (match) {
      var after = current.slice(match.index + match[0].length);
      node.className = current.slice(0, match.index) + (after ? match[1] + after : "");
    }
  };
  var addClass = CodeMirror.addClass = function(node, cls) {
    var current = node.className;
    if (!classTest(cls).test(current)) node.className += (current ? " " : "") + cls;
  };
  function joinClasses(a, b) {
    var as = a.split(" ");
    for (var i = 0; i < as.length; i++)
      if (as[i] && !classTest(as[i]).test(b)) b += " " + as[i];
    return b;
  }

  // WINDOW-WIDE EVENTS

  // These must be handled carefully, because naively registering a
  // handler for each editor will cause the editors to never be
  // garbage collected.

  function forEachCodeMirror(f) {
    if (!document.body.getElementsByClassName) return;
    var byClass = document.body.getElementsByClassName("CodeMirror");
    for (var i = 0; i < byClass.length; i++) {
      var cm = byClass[i].CodeMirror;
      if (cm) f(cm);
    }
  }

  var globalsRegistered = false;
  function ensureGlobalHandlers() {
    if (globalsRegistered) return;
    registerGlobalHandlers();
    globalsRegistered = true;
  }
  function registerGlobalHandlers() {
    // When the window resizes, we need to refresh active editors.
    var resizeTimer;
    on(window, "resize", function() {
      if (resizeTimer == null) resizeTimer = setTimeout(function() {
        resizeTimer = null;
        forEachCodeMirror(onResize);
      }, 100);
    });
    // When the window loses focus, we want to show the editor as blurred
    on(window, "blur", function() {
      forEachCodeMirror(onBlur);
    });
  }

  // FEATURE DETECTION

  // Detect drag-and-drop
  var dragAndDrop = function() {
    // There is *some* kind of drag-and-drop support in IE6-8, but I
    // couldn't get it to work yet.
    if (ie && ie_version < 9) return false;
    var div = elt('div');
    return "draggable" in div || "dragDrop" in div;
  }();

  var zwspSupported;
  function zeroWidthElement(measure) {
    if (zwspSupported == null) {
      var test = elt("span", "\u200b");
      removeChildrenAndAdd(measure, elt("span", [test, document.createTextNode("x")]));
      if (measure.firstChild.offsetHeight != 0)
        zwspSupported = test.offsetWidth <= 1 && test.offsetHeight > 2 && !(ie && ie_version < 8);
    }
    var node = zwspSupported ? elt("span", "\u200b") :
      elt("span", "\u00a0", null, "display: inline-block; width: 1px; margin-right: -1px");
    node.setAttribute("cm-text", "");
    return node;
  }

  // Feature-detect IE's crummy client rect reporting for bidi text
  var badBidiRects;
  function hasBadBidiRects(measure) {
    if (badBidiRects != null) return badBidiRects;
    var txt = removeChildrenAndAdd(measure, document.createTextNode("A\u062eA"));
    var r0 = range(txt, 0, 1).getBoundingClientRect();
    if (!r0 || r0.left == r0.right) return false; // Safari returns null in some cases (#2780)
    var r1 = range(txt, 1, 2).getBoundingClientRect();
    return badBidiRects = (r1.right - r0.right < 3);
  }

  // See if "".split is the broken IE version, if so, provide an
  // alternative way to split lines.
  var splitLinesAuto = CodeMirror.splitLines = "\n\nb".split(/\n/).length != 3 ? function(string) {
    var pos = 0, result = [], l = string.length;
    while (pos <= l) {
      var nl = string.indexOf("\n", pos);
      if (nl == -1) nl = string.length;
      var line = string.slice(pos, string.charAt(nl - 1) == "\r" ? nl - 1 : nl);
      var rt = line.indexOf("\r");
      if (rt != -1) {
        result.push(line.slice(0, rt));
        pos += rt + 1;
      } else {
        result.push(line);
        pos = nl + 1;
      }
    }
    return result;
  } : function(string){return string.split(/\r\n?|\n/);};

  var hasSelection = window.getSelection ? function(te) {
    try { return te.selectionStart != te.selectionEnd; }
    catch(e) { return false; }
  } : function(te) {
    try {var range = te.ownerDocument.selection.createRange();}
    catch(e) {}
    if (!range || range.parentElement() != te) return false;
    return range.compareEndPoints("StartToEnd", range) != 0;
  };

  var hasCopyEvent = (function() {
    var e = elt("div");
    if ("oncopy" in e) return true;
    e.setAttribute("oncopy", "return;");
    return typeof e.oncopy == "function";
  })();

  var badZoomedRects = null;
  function hasBadZoomedRects(measure) {
    if (badZoomedRects != null) return badZoomedRects;
    var node = removeChildrenAndAdd(measure, elt("span", "x"));
    var normal = node.getBoundingClientRect();
    var fromRange = range(node, 0, 1).getBoundingClientRect();
    return badZoomedRects = Math.abs(normal.left - fromRange.left) > 1;
  }

  // KEY NAMES

  var keyNames = {3: "Enter", 8: "Backspace", 9: "Tab", 13: "Enter", 16: "Shift", 17: "Ctrl", 18: "Alt",
                  19: "Pause", 20: "CapsLock", 27: "Esc", 32: "Space", 33: "PageUp", 34: "PageDown", 35: "End",
                  36: "Home", 37: "Left", 38: "Up", 39: "Right", 40: "Down", 44: "PrintScrn", 45: "Insert",
                  46: "Delete", 59: ";", 61: "=", 91: "Mod", 92: "Mod", 93: "Mod", 107: "=", 109: "-", 127: "Delete",
                  173: "-", 186: ";", 187: "=", 188: ",", 189: "-", 190: ".", 191: "/", 192: "`", 219: "[", 220: "\\",
                  221: "]", 222: "'", 63232: "Up", 63233: "Down", 63234: "Left", 63235: "Right", 63272: "Delete",
                  63273: "Home", 63275: "End", 63276: "PageUp", 63277: "PageDown", 63302: "Insert"};
  CodeMirror.keyNames = keyNames;
  (function() {
    // Number keys
    for (var i = 0; i < 10; i++) keyNames[i + 48] = keyNames[i + 96] = String(i);
    // Alphabetic keys
    for (var i = 65; i <= 90; i++) keyNames[i] = String.fromCharCode(i);
    // Function keys
    for (var i = 1; i <= 12; i++) keyNames[i + 111] = keyNames[i + 63235] = "F" + i;
  })();

  // BIDI HELPERS

  function iterateBidiSections(order, from, to, f) {
    if (!order) return f(from, to, "ltr");
    var found = false;
    for (var i = 0; i < order.length; ++i) {
      var part = order[i];
      if (part.from < to && part.to > from || from == to && part.to == from) {
        f(Math.max(part.from, from), Math.min(part.to, to), part.level == 1 ? "rtl" : "ltr");
        found = true;
      }
    }
    if (!found) f(from, to, "ltr");
  }

  function bidiLeft(part) { return part.level % 2 ? part.to : part.from; }
  function bidiRight(part) { return part.level % 2 ? part.from : part.to; }

  function lineLeft(line) { var order = getOrder(line); return order ? bidiLeft(order[0]) : 0; }
  function lineRight(line) {
    var order = getOrder(line);
    if (!order) return line.text.length;
    return bidiRight(lst(order));
  }

  function lineStart(cm, lineN) {
    var line = getLine(cm.doc, lineN);
    var visual = visualLine(line);
    if (visual != line) lineN = lineNo(visual);
    var order = getOrder(visual);
    var ch = !order ? 0 : order[0].level % 2 ? lineRight(visual) : lineLeft(visual);
    return Pos(lineN, ch);
  }
  function lineEnd(cm, lineN) {
    var merged, line = getLine(cm.doc, lineN);
    while (merged = collapsedSpanAtEnd(line)) {
      line = merged.find(1, true).line;
      lineN = null;
    }
    var order = getOrder(line);
    var ch = !order ? line.text.length : order[0].level % 2 ? lineLeft(line) : lineRight(line);
    return Pos(lineN == null ? lineNo(line) : lineN, ch);
  }
  function lineStartSmart(cm, pos) {
    var start = lineStart(cm, pos.line);
    var line = getLine(cm.doc, start.line);
    var order = getOrder(line);
    if (!order || order[0].level == 0) {
      var firstNonWS = Math.max(0, line.text.search(/\S/));
      var inWS = pos.line == start.line && pos.ch <= firstNonWS && pos.ch;
      return Pos(start.line, inWS ? 0 : firstNonWS);
    }
    return start;
  }

  function compareBidiLevel(order, a, b) {
    var linedir = order[0].level;
    if (a == linedir) return true;
    if (b == linedir) return false;
    return a < b;
  }
  var bidiOther;
  function getBidiPartAt(order, pos) {
    bidiOther = null;
    for (var i = 0, found; i < order.length; ++i) {
      var cur = order[i];
      if (cur.from < pos && cur.to > pos) return i;
      if ((cur.from == pos || cur.to == pos)) {
        if (found == null) {
          found = i;
        } else if (compareBidiLevel(order, cur.level, order[found].level)) {
          if (cur.from != cur.to) bidiOther = found;
          return i;
        } else {
          if (cur.from != cur.to) bidiOther = i;
          return found;
        }
      }
    }
    return found;
  }

  function moveInLine(line, pos, dir, byUnit) {
    if (!byUnit) return pos + dir;
    do pos += dir;
    while (pos > 0 && isExtendingChar(line.text.charAt(pos)));
    return pos;
  }

  // This is needed in order to move 'visually' through bi-directional
  // text -- i.e., pressing left should make the cursor go left, even
  // when in RTL text. The tricky part is the 'jumps', where RTL and
  // LTR text touch each other. This often requires the cursor offset
  // to move more than one unit, in order to visually move one unit.
  function moveVisually(line, start, dir, byUnit) {
    var bidi = getOrder(line);
    if (!bidi) return moveLogically(line, start, dir, byUnit);
    var pos = getBidiPartAt(bidi, start), part = bidi[pos];
    var target = moveInLine(line, start, part.level % 2 ? -dir : dir, byUnit);

    for (;;) {
      if (target > part.from && target < part.to) return target;
      if (target == part.from || target == part.to) {
        if (getBidiPartAt(bidi, target) == pos) return target;
        part = bidi[pos += dir];
        return (dir > 0) == part.level % 2 ? part.to : part.from;
      } else {
        part = bidi[pos += dir];
        if (!part) return null;
        if ((dir > 0) == part.level % 2)
          target = moveInLine(line, part.to, -1, byUnit);
        else
          target = moveInLine(line, part.from, 1, byUnit);
      }
    }
  }

  function moveLogically(line, start, dir, byUnit) {
    var target = start + dir;
    if (byUnit) while (target > 0 && isExtendingChar(line.text.charAt(target))) target += dir;
    return target < 0 || target > line.text.length ? null : target;
  }

  // Bidirectional ordering algorithm
  // See http://unicode.org/reports/tr9/tr9-13.html for the algorithm
  // that this (partially) implements.

  // One-char codes used for character types:
  // L (L):   Left-to-Right
  // R (R):   Right-to-Left
  // r (AL):  Right-to-Left Arabic
  // 1 (EN):  European Number
  // + (ES):  European Number Separator
  // % (ET):  European Number Terminator
  // n (AN):  Arabic Number
  // , (CS):  Common Number Separator
  // m (NSM): Non-Spacing Mark
  // b (BN):  Boundary Neutral
  // s (B):   Paragraph Separator
  // t (S):   Segment Separator
  // w (WS):  Whitespace
  // N (ON):  Other Neutrals

  // Returns null if characters are ordered as they appear
  // (left-to-right), or an array of sections ({from, to, level}
  // objects) in the order in which they occur visually.
  var bidiOrdering = (function() {
    // Character types for codepoints 0 to 0xff
    var lowTypes = "bbbbbbbbbtstwsbbbbbbbbbbbbbbssstwNN%%%NNNNNN,N,N1111111111NNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNbbbbbbsbbbbbbbbbbbbbbbbbbbbbbbbbb,N%%%%NNNNLNNNNN%%11NLNNN1LNNNNNLLLLLLLLLLLLLLLLLLLLLLLNLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLN";
    // Character types for codepoints 0x600 to 0x6ff
    var arabicTypes = "rrrrrrrrrrrr,rNNmmmmmmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmmmmmmmmrrrrrrrnnnnnnnnnn%nnrrrmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmmmmmmmmmmmmmNmmmm";
    function charType(code) {
      if (code <= 0xf7) return lowTypes.charAt(code);
      else if (0x590 <= code && code <= 0x5f4) return "R";
      else if (0x600 <= code && code <= 0x6ed) return arabicTypes.charAt(code - 0x600);
      else if (0x6ee <= code && code <= 0x8ac) return "r";
      else if (0x2000 <= code && code <= 0x200b) return "w";
      else if (code == 0x200c) return "b";
      else return "L";
    }

    var bidiRE = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
    var isNeutral = /[stwN]/, isStrong = /[LRr]/, countsAsLeft = /[Lb1n]/, countsAsNum = /[1n]/;
    // Browsers seem to always treat the boundaries of block elements as being L.
    var outerType = "L";

    function BidiSpan(level, from, to) {
      this.level = level;
      this.from = from; this.to = to;
    }

    return function(str) {
      if (!bidiRE.test(str)) return false;
      var len = str.length, types = [];
      for (var i = 0, type; i < len; ++i)
        types.push(type = charType(str.charCodeAt(i)));

      // W1. Examine each non-spacing mark (NSM) in the level run, and
      // change the type of the NSM to the type of the previous
      // character. If the NSM is at the start of the level run, it will
      // get the type of sor.
      for (var i = 0, prev = outerType; i < len; ++i) {
        var type = types[i];
        if (type == "m") types[i] = prev;
        else prev = type;
      }

      // W2. Search backwards from each instance of a European number
      // until the first strong type (R, L, AL, or sor) is found. If an
      // AL is found, change the type of the European number to Arabic
      // number.
      // W3. Change all ALs to R.
      for (var i = 0, cur = outerType; i < len; ++i) {
        var type = types[i];
        if (type == "1" && cur == "r") types[i] = "n";
        else if (isStrong.test(type)) { cur = type; if (type == "r") types[i] = "R"; }
      }

      // W4. A single European separator between two European numbers
      // changes to a European number. A single common separator between
      // two numbers of the same type changes to that type.
      for (var i = 1, prev = types[0]; i < len - 1; ++i) {
        var type = types[i];
        if (type == "+" && prev == "1" && types[i+1] == "1") types[i] = "1";
        else if (type == "," && prev == types[i+1] &&
                 (prev == "1" || prev == "n")) types[i] = prev;
        prev = type;
      }

      // W5. A sequence of European terminators adjacent to European
      // numbers changes to all European numbers.
      // W6. Otherwise, separators and terminators change to Other
      // Neutral.
      for (var i = 0; i < len; ++i) {
        var type = types[i];
        if (type == ",") types[i] = "N";
        else if (type == "%") {
          for (var end = i + 1; end < len && types[end] == "%"; ++end) {}
          var replace = (i && types[i-1] == "!") || (end < len && types[end] == "1") ? "1" : "N";
          for (var j = i; j < end; ++j) types[j] = replace;
          i = end - 1;
        }
      }

      // W7. Search backwards from each instance of a European number
      // until the first strong type (R, L, or sor) is found. If an L is
      // found, then change the type of the European number to L.
      for (var i = 0, cur = outerType; i < len; ++i) {
        var type = types[i];
        if (cur == "L" && type == "1") types[i] = "L";
        else if (isStrong.test(type)) cur = type;
      }

      // N1. A sequence of neutrals takes the direction of the
      // surrounding strong text if the text on both sides has the same
      // direction. European and Arabic numbers act as if they were R in
      // terms of their influence on neutrals. Start-of-level-run (sor)
      // and end-of-level-run (eor) are used at level run boundaries.
      // N2. Any remaining neutrals take the embedding direction.
      for (var i = 0; i < len; ++i) {
        if (isNeutral.test(types[i])) {
          for (var end = i + 1; end < len && isNeutral.test(types[end]); ++end) {}
          var before = (i ? types[i-1] : outerType) == "L";
          var after = (end < len ? types[end] : outerType) == "L";
          var replace = before || after ? "L" : "R";
          for (var j = i; j < end; ++j) types[j] = replace;
          i = end - 1;
        }
      }

      // Here we depart from the documented algorithm, in order to avoid
      // building up an actual levels array. Since there are only three
      // levels (0, 1, 2) in an implementation that doesn't take
      // explicit embedding into account, we can build up the order on
      // the fly, without following the level-based algorithm.
      var order = [], m;
      for (var i = 0; i < len;) {
        if (countsAsLeft.test(types[i])) {
          var start = i;
          for (++i; i < len && countsAsLeft.test(types[i]); ++i) {}
          order.push(new BidiSpan(0, start, i));
        } else {
          var pos = i, at = order.length;
          for (++i; i < len && types[i] != "L"; ++i) {}
          for (var j = pos; j < i;) {
            if (countsAsNum.test(types[j])) {
              if (pos < j) order.splice(at, 0, new BidiSpan(1, pos, j));
              var nstart = j;
              for (++j; j < i && countsAsNum.test(types[j]); ++j) {}
              order.splice(at, 0, new BidiSpan(2, nstart, j));
              pos = j;
            } else ++j;
          }
          if (pos < i) order.splice(at, 0, new BidiSpan(1, pos, i));
        }
      }
      if (order[0].level == 1 && (m = str.match(/^\s+/))) {
        order[0].from = m[0].length;
        order.unshift(new BidiSpan(0, 0, m[0].length));
      }
      if (lst(order).level == 1 && (m = str.match(/\s+$/))) {
        lst(order).to -= m[0].length;
        order.push(new BidiSpan(0, len - m[0].length, len));
      }
      if (order[0].level == 2)
        order.unshift(new BidiSpan(1, order[0].to, order[0].to));
      if (order[0].level != lst(order).level)
        order.push(new BidiSpan(order[0].level, len, len));

      return order;
    };
  })();

  // THE END

  CodeMirror.version = "5.5.0";

  return CodeMirror;
});

},{}],9:[function(require,module,exports){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

// TODO actually recognize syntax of TypeScript constructs

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.defineMode("javascript", function(config, parserConfig) {
  var indentUnit = config.indentUnit;
  var statementIndent = parserConfig.statementIndent;
  var jsonldMode = parserConfig.jsonld;
  var jsonMode = parserConfig.json || jsonldMode;
  var isTS = parserConfig.typescript;
  var wordRE = parserConfig.wordCharacters || /[\w$\xa1-\uffff]/;

  // Tokenizer

  var keywords = function(){
    function kw(type) {return {type: type, style: "keyword"};}
    var A = kw("keyword a"), B = kw("keyword b"), C = kw("keyword c");
    var operator = kw("operator"), atom = {type: "atom", style: "atom"};

    var jsKeywords = {
      "if": kw("if"), "while": A, "with": A, "else": B, "do": B, "try": B, "finally": B,
      "return": C, "break": C, "continue": C, "new": C, "delete": C, "throw": C, "debugger": C,
      "var": kw("var"), "const": kw("var"), "let": kw("var"),
      "function": kw("function"), "catch": kw("catch"),
      "for": kw("for"), "switch": kw("switch"), "case": kw("case"), "default": kw("default"),
      "in": operator, "typeof": operator, "instanceof": operator,
      "true": atom, "false": atom, "null": atom, "undefined": atom, "NaN": atom, "Infinity": atom,
      "this": kw("this"), "module": kw("module"), "class": kw("class"), "super": kw("atom"),
      "yield": C, "export": kw("export"), "import": kw("import"), "extends": C
    };

    // Extend the 'normal' keywords with the TypeScript language extensions
    if (isTS) {
      var type = {type: "variable", style: "variable-3"};
      var tsKeywords = {
        // object-like things
        "interface": kw("interface"),
        "extends": kw("extends"),
        "constructor": kw("constructor"),

        // scope modifiers
        "public": kw("public"),
        "private": kw("private"),
        "protected": kw("protected"),
        "static": kw("static"),

        // types
        "string": type, "number": type, "bool": type, "any": type
      };

      for (var attr in tsKeywords) {
        jsKeywords[attr] = tsKeywords[attr];
      }
    }

    return jsKeywords;
  }();

  var isOperatorChar = /[+\-*&%=<>!?|~^]/;
  var isJsonldKeyword = /^@(context|id|value|language|type|container|list|set|reverse|index|base|vocab|graph)"/;

  function readRegexp(stream) {
    var escaped = false, next, inSet = false;
    while ((next = stream.next()) != null) {
      if (!escaped) {
        if (next == "/" && !inSet) return;
        if (next == "[") inSet = true;
        else if (inSet && next == "]") inSet = false;
      }
      escaped = !escaped && next == "\\";
    }
  }

  // Used as scratch variables to communicate multiple values without
  // consing up tons of objects.
  var type, content;
  function ret(tp, style, cont) {
    type = tp; content = cont;
    return style;
  }
  function tokenBase(stream, state) {
    var ch = stream.next();
    if (ch == '"' || ch == "'") {
      state.tokenize = tokenString(ch);
      return state.tokenize(stream, state);
    } else if (ch == "." && stream.match(/^\d+(?:[eE][+\-]?\d+)?/)) {
      return ret("number", "number");
    } else if (ch == "." && stream.match("..")) {
      return ret("spread", "meta");
    } else if (/[\[\]{}\(\),;\:\.]/.test(ch)) {
      return ret(ch);
    } else if (ch == "=" && stream.eat(">")) {
      return ret("=>", "operator");
    } else if (ch == "0" && stream.eat(/x/i)) {
      stream.eatWhile(/[\da-f]/i);
      return ret("number", "number");
    } else if (/\d/.test(ch)) {
      stream.match(/^\d*(?:\.\d*)?(?:[eE][+\-]?\d+)?/);
      return ret("number", "number");
    } else if (ch == "/") {
      if (stream.eat("*")) {
        state.tokenize = tokenComment;
        return tokenComment(stream, state);
      } else if (stream.eat("/")) {
        stream.skipToEnd();
        return ret("comment", "comment");
      } else if (state.lastType == "operator" || state.lastType == "keyword c" ||
               state.lastType == "sof" || /^[\[{}\(,;:]$/.test(state.lastType)) {
        readRegexp(stream);
        stream.match(/^\b(([gimyu])(?![gimyu]*\2))+\b/);
        return ret("regexp", "string-2");
      } else {
        stream.eatWhile(isOperatorChar);
        return ret("operator", "operator", stream.current());
      }
    } else if (ch == "`") {
      state.tokenize = tokenQuasi;
      return tokenQuasi(stream, state);
    } else if (ch == "#") {
      stream.skipToEnd();
      return ret("error", "error");
    } else if (isOperatorChar.test(ch)) {
      stream.eatWhile(isOperatorChar);
      return ret("operator", "operator", stream.current());
    } else if (wordRE.test(ch)) {
      stream.eatWhile(wordRE);
      var word = stream.current(), known = keywords.propertyIsEnumerable(word) && keywords[word];
      return (known && state.lastType != ".") ? ret(known.type, known.style, word) :
                     ret("variable", "variable", word);
    }
  }

  function tokenString(quote) {
    return function(stream, state) {
      var escaped = false, next;
      if (jsonldMode && stream.peek() == "@" && stream.match(isJsonldKeyword)){
        state.tokenize = tokenBase;
        return ret("jsonld-keyword", "meta");
      }
      while ((next = stream.next()) != null) {
        if (next == quote && !escaped) break;
        escaped = !escaped && next == "\\";
      }
      if (!escaped) state.tokenize = tokenBase;
      return ret("string", "string");
    };
  }

  function tokenComment(stream, state) {
    var maybeEnd = false, ch;
    while (ch = stream.next()) {
      if (ch == "/" && maybeEnd) {
        state.tokenize = tokenBase;
        break;
      }
      maybeEnd = (ch == "*");
    }
    return ret("comment", "comment");
  }

  function tokenQuasi(stream, state) {
    var escaped = false, next;
    while ((next = stream.next()) != null) {
      if (!escaped && (next == "`" || next == "$" && stream.eat("{"))) {
        state.tokenize = tokenBase;
        break;
      }
      escaped = !escaped && next == "\\";
    }
    return ret("quasi", "string-2", stream.current());
  }

  var brackets = "([{}])";
  // This is a crude lookahead trick to try and notice that we're
  // parsing the argument patterns for a fat-arrow function before we
  // actually hit the arrow token. It only works if the arrow is on
  // the same line as the arguments and there's no strange noise
  // (comments) in between. Fallback is to only notice when we hit the
  // arrow, and not declare the arguments as locals for the arrow
  // body.
  function findFatArrow(stream, state) {
    if (state.fatArrowAt) state.fatArrowAt = null;
    var arrow = stream.string.indexOf("=>", stream.start);
    if (arrow < 0) return;

    var depth = 0, sawSomething = false;
    for (var pos = arrow - 1; pos >= 0; --pos) {
      var ch = stream.string.charAt(pos);
      var bracket = brackets.indexOf(ch);
      if (bracket >= 0 && bracket < 3) {
        if (!depth) { ++pos; break; }
        if (--depth == 0) break;
      } else if (bracket >= 3 && bracket < 6) {
        ++depth;
      } else if (wordRE.test(ch)) {
        sawSomething = true;
      } else if (/["'\/]/.test(ch)) {
        return;
      } else if (sawSomething && !depth) {
        ++pos;
        break;
      }
    }
    if (sawSomething && !depth) state.fatArrowAt = pos;
  }

  // Parser

  var atomicTypes = {"atom": true, "number": true, "variable": true, "string": true, "regexp": true, "this": true, "jsonld-keyword": true};

  function JSLexical(indented, column, type, align, prev, info) {
    this.indented = indented;
    this.column = column;
    this.type = type;
    this.prev = prev;
    this.info = info;
    if (align != null) this.align = align;
  }

  function inScope(state, varname) {
    for (var v = state.localVars; v; v = v.next)
      if (v.name == varname) return true;
    for (var cx = state.context; cx; cx = cx.prev) {
      for (var v = cx.vars; v; v = v.next)
        if (v.name == varname) return true;
    }
  }

  function parseJS(state, style, type, content, stream) {
    var cc = state.cc;
    // Communicate our context to the combinators.
    // (Less wasteful than consing up a hundred closures on every call.)
    cx.state = state; cx.stream = stream; cx.marked = null, cx.cc = cc; cx.style = style;

    if (!state.lexical.hasOwnProperty("align"))
      state.lexical.align = true;

    while(true) {
      var combinator = cc.length ? cc.pop() : jsonMode ? expression : statement;
      if (combinator(type, content)) {
        while(cc.length && cc[cc.length - 1].lex)
          cc.pop()();
        if (cx.marked) return cx.marked;
        if (type == "variable" && inScope(state, content)) return "variable-2";
        return style;
      }
    }
  }

  // Combinator utils

  var cx = {state: null, column: null, marked: null, cc: null};
  function pass() {
    for (var i = arguments.length - 1; i >= 0; i--) cx.cc.push(arguments[i]);
  }
  function cont() {
    pass.apply(null, arguments);
    return true;
  }
  function register(varname) {
    function inList(list) {
      for (var v = list; v; v = v.next)
        if (v.name == varname) return true;
      return false;
    }
    var state = cx.state;
    if (state.context) {
      cx.marked = "def";
      if (inList(state.localVars)) return;
      state.localVars = {name: varname, next: state.localVars};
    } else {
      if (inList(state.globalVars)) return;
      if (parserConfig.globalVars)
        state.globalVars = {name: varname, next: state.globalVars};
    }
  }

  // Combinators

  var defaultVars = {name: "this", next: {name: "arguments"}};
  function pushcontext() {
    cx.state.context = {prev: cx.state.context, vars: cx.state.localVars};
    cx.state.localVars = defaultVars;
  }
  function popcontext() {
    cx.state.localVars = cx.state.context.vars;
    cx.state.context = cx.state.context.prev;
  }
  function pushlex(type, info) {
    var result = function() {
      var state = cx.state, indent = state.indented;
      if (state.lexical.type == "stat") indent = state.lexical.indented;
      else for (var outer = state.lexical; outer && outer.type == ")" && outer.align; outer = outer.prev)
        indent = outer.indented;
      state.lexical = new JSLexical(indent, cx.stream.column(), type, null, state.lexical, info);
    };
    result.lex = true;
    return result;
  }
  function poplex() {
    var state = cx.state;
    if (state.lexical.prev) {
      if (state.lexical.type == ")")
        state.indented = state.lexical.indented;
      state.lexical = state.lexical.prev;
    }
  }
  poplex.lex = true;

  function expect(wanted) {
    function exp(type) {
      if (type == wanted) return cont();
      else if (wanted == ";") return pass();
      else return cont(exp);
    };
    return exp;
  }

  function statement(type, value) {
    if (type == "var") return cont(pushlex("vardef", value.length), vardef, expect(";"), poplex);
    if (type == "keyword a") return cont(pushlex("form"), expression, statement, poplex);
    if (type == "keyword b") return cont(pushlex("form"), statement, poplex);
    if (type == "{") return cont(pushlex("}"), block, poplex);
    if (type == ";") return cont();
    if (type == "if") {
      if (cx.state.lexical.info == "else" && cx.state.cc[cx.state.cc.length - 1] == poplex)
        cx.state.cc.pop()();
      return cont(pushlex("form"), expression, statement, poplex, maybeelse);
    }
    if (type == "function") return cont(functiondef);
    if (type == "for") return cont(pushlex("form"), forspec, statement, poplex);
    if (type == "variable") return cont(pushlex("stat"), maybelabel);
    if (type == "switch") return cont(pushlex("form"), expression, pushlex("}", "switch"), expect("{"),
                                      block, poplex, poplex);
    if (type == "case") return cont(expression, expect(":"));
    if (type == "default") return cont(expect(":"));
    if (type == "catch") return cont(pushlex("form"), pushcontext, expect("("), funarg, expect(")"),
                                     statement, poplex, popcontext);
    if (type == "module") return cont(pushlex("form"), pushcontext, afterModule, popcontext, poplex);
    if (type == "class") return cont(pushlex("form"), className, poplex);
    if (type == "export") return cont(pushlex("form"), afterExport, poplex);
    if (type == "import") return cont(pushlex("form"), afterImport, poplex);
    return pass(pushlex("stat"), expression, expect(";"), poplex);
  }
  function expression(type) {
    return expressionInner(type, false);
  }
  function expressionNoComma(type) {
    return expressionInner(type, true);
  }
  function expressionInner(type, noComma) {
    if (cx.state.fatArrowAt == cx.stream.start) {
      var body = noComma ? arrowBodyNoComma : arrowBody;
      if (type == "(") return cont(pushcontext, pushlex(")"), commasep(pattern, ")"), poplex, expect("=>"), body, popcontext);
      else if (type == "variable") return pass(pushcontext, pattern, expect("=>"), body, popcontext);
    }

    var maybeop = noComma ? maybeoperatorNoComma : maybeoperatorComma;
    if (atomicTypes.hasOwnProperty(type)) return cont(maybeop);
    if (type == "function") return cont(functiondef, maybeop);
    if (type == "keyword c") return cont(noComma ? maybeexpressionNoComma : maybeexpression);
    if (type == "(") return cont(pushlex(")"), maybeexpression, comprehension, expect(")"), poplex, maybeop);
    if (type == "operator" || type == "spread") return cont(noComma ? expressionNoComma : expression);
    if (type == "[") return cont(pushlex("]"), arrayLiteral, poplex, maybeop);
    if (type == "{") return contCommasep(objprop, "}", null, maybeop);
    if (type == "quasi") { return pass(quasi, maybeop); }
    return cont();
  }
  function maybeexpression(type) {
    if (type.match(/[;\}\)\],]/)) return pass();
    return pass(expression);
  }
  function maybeexpressionNoComma(type) {
    if (type.match(/[;\}\)\],]/)) return pass();
    return pass(expressionNoComma);
  }

  function maybeoperatorComma(type, value) {
    if (type == ",") return cont(expression);
    return maybeoperatorNoComma(type, value, false);
  }
  function maybeoperatorNoComma(type, value, noComma) {
    var me = noComma == false ? maybeoperatorComma : maybeoperatorNoComma;
    var expr = noComma == false ? expression : expressionNoComma;
    if (type == "=>") return cont(pushcontext, noComma ? arrowBodyNoComma : arrowBody, popcontext);
    if (type == "operator") {
      if (/\+\+|--/.test(value)) return cont(me);
      if (value == "?") return cont(expression, expect(":"), expr);
      return cont(expr);
    }
    if (type == "quasi") { return pass(quasi, me); }
    if (type == ";") return;
    if (type == "(") return contCommasep(expressionNoComma, ")", "call", me);
    if (type == ".") return cont(property, me);
    if (type == "[") return cont(pushlex("]"), maybeexpression, expect("]"), poplex, me);
  }
  function quasi(type, value) {
    if (type != "quasi") return pass();
    if (value.slice(value.length - 2) != "${") return cont(quasi);
    return cont(expression, continueQuasi);
  }
  function continueQuasi(type) {
    if (type == "}") {
      cx.marked = "string-2";
      cx.state.tokenize = tokenQuasi;
      return cont(quasi);
    }
  }
  function arrowBody(type) {
    findFatArrow(cx.stream, cx.state);
    return pass(type == "{" ? statement : expression);
  }
  function arrowBodyNoComma(type) {
    findFatArrow(cx.stream, cx.state);
    return pass(type == "{" ? statement : expressionNoComma);
  }
  function maybelabel(type) {
    if (type == ":") return cont(poplex, statement);
    return pass(maybeoperatorComma, expect(";"), poplex);
  }
  function property(type) {
    if (type == "variable") {cx.marked = "property"; return cont();}
  }
  function objprop(type, value) {
    if (type == "variable" || cx.style == "keyword") {
      cx.marked = "property";
      if (value == "get" || value == "set") return cont(getterSetter);
      return cont(afterprop);
    } else if (type == "number" || type == "string") {
      cx.marked = jsonldMode ? "property" : (cx.style + " property");
      return cont(afterprop);
    } else if (type == "jsonld-keyword") {
      return cont(afterprop);
    } else if (type == "[") {
      return cont(expression, expect("]"), afterprop);
    }
  }
  function getterSetter(type) {
    if (type != "variable") return pass(afterprop);
    cx.marked = "property";
    return cont(functiondef);
  }
  function afterprop(type) {
    if (type == ":") return cont(expressionNoComma);
    if (type == "(") return pass(functiondef);
  }
  function commasep(what, end) {
    function proceed(type) {
      if (type == ",") {
        var lex = cx.state.lexical;
        if (lex.info == "call") lex.pos = (lex.pos || 0) + 1;
        return cont(what, proceed);
      }
      if (type == end) return cont();
      return cont(expect(end));
    }
    return function(type) {
      if (type == end) return cont();
      return pass(what, proceed);
    };
  }
  function contCommasep(what, end, info) {
    for (var i = 3; i < arguments.length; i++)
      cx.cc.push(arguments[i]);
    return cont(pushlex(end, info), commasep(what, end), poplex);
  }
  function block(type) {
    if (type == "}") return cont();
    return pass(statement, block);
  }
  function maybetype(type) {
    if (isTS && type == ":") return cont(typedef);
  }
  function maybedefault(_, value) {
    if (value == "=") return cont(expressionNoComma);
  }
  function typedef(type) {
    if (type == "variable") {cx.marked = "variable-3"; return cont();}
  }
  function vardef() {
    return pass(pattern, maybetype, maybeAssign, vardefCont);
  }
  function pattern(type, value) {
    if (type == "variable") { register(value); return cont(); }
    if (type == "[") return contCommasep(pattern, "]");
    if (type == "{") return contCommasep(proppattern, "}");
  }
  function proppattern(type, value) {
    if (type == "variable" && !cx.stream.match(/^\s*:/, false)) {
      register(value);
      return cont(maybeAssign);
    }
    if (type == "variable") cx.marked = "property";
    return cont(expect(":"), pattern, maybeAssign);
  }
  function maybeAssign(_type, value) {
    if (value == "=") return cont(expressionNoComma);
  }
  function vardefCont(type) {
    if (type == ",") return cont(vardef);
  }
  function maybeelse(type, value) {
    if (type == "keyword b" && value == "else") return cont(pushlex("form", "else"), statement, poplex);
  }
  function forspec(type) {
    if (type == "(") return cont(pushlex(")"), forspec1, expect(")"), poplex);
  }
  function forspec1(type) {
    if (type == "var") return cont(vardef, expect(";"), forspec2);
    if (type == ";") return cont(forspec2);
    if (type == "variable") return cont(formaybeinof);
    return pass(expression, expect(";"), forspec2);
  }
  function formaybeinof(_type, value) {
    if (value == "in" || value == "of") { cx.marked = "keyword"; return cont(expression); }
    return cont(maybeoperatorComma, forspec2);
  }
  function forspec2(type, value) {
    if (type == ";") return cont(forspec3);
    if (value == "in" || value == "of") { cx.marked = "keyword"; return cont(expression); }
    return pass(expression, expect(";"), forspec3);
  }
  function forspec3(type) {
    if (type != ")") cont(expression);
  }
  function functiondef(type, value) {
    if (value == "*") {cx.marked = "keyword"; return cont(functiondef);}
    if (type == "variable") {register(value); return cont(functiondef);}
    if (type == "(") return cont(pushcontext, pushlex(")"), commasep(funarg, ")"), poplex, statement, popcontext);
  }
  function funarg(type) {
    if (type == "spread") return cont(funarg);
    return pass(pattern, maybetype, maybedefault);
  }
  function className(type, value) {
    if (type == "variable") {register(value); return cont(classNameAfter);}
  }
  function classNameAfter(type, value) {
    if (value == "extends") return cont(expression, classNameAfter);
    if (type == "{") return cont(pushlex("}"), classBody, poplex);
  }
  function classBody(type, value) {
    if (type == "variable" || cx.style == "keyword") {
      if (value == "static") {
        cx.marked = "keyword";
        return cont(classBody);
      }
      cx.marked = "property";
      if (value == "get" || value == "set") return cont(classGetterSetter, functiondef, classBody);
      return cont(functiondef, classBody);
    }
    if (value == "*") {
      cx.marked = "keyword";
      return cont(classBody);
    }
    if (type == ";") return cont(classBody);
    if (type == "}") return cont();
  }
  function classGetterSetter(type) {
    if (type != "variable") return pass();
    cx.marked = "property";
    return cont();
  }
  function afterModule(type, value) {
    if (type == "string") return cont(statement);
    if (type == "variable") { register(value); return cont(maybeFrom); }
  }
  function afterExport(_type, value) {
    if (value == "*") { cx.marked = "keyword"; return cont(maybeFrom, expect(";")); }
    if (value == "default") { cx.marked = "keyword"; return cont(expression, expect(";")); }
    return pass(statement);
  }
  function afterImport(type) {
    if (type == "string") return cont();
    return pass(importSpec, maybeFrom);
  }
  function importSpec(type, value) {
    if (type == "{") return contCommasep(importSpec, "}");
    if (type == "variable") register(value);
    if (value == "*") cx.marked = "keyword";
    return cont(maybeAs);
  }
  function maybeAs(_type, value) {
    if (value == "as") { cx.marked = "keyword"; return cont(importSpec); }
  }
  function maybeFrom(_type, value) {
    if (value == "from") { cx.marked = "keyword"; return cont(expression); }
  }
  function arrayLiteral(type) {
    if (type == "]") return cont();
    return pass(expressionNoComma, maybeArrayComprehension);
  }
  function maybeArrayComprehension(type) {
    if (type == "for") return pass(comprehension, expect("]"));
    if (type == ",") return cont(commasep(maybeexpressionNoComma, "]"));
    return pass(commasep(expressionNoComma, "]"));
  }
  function comprehension(type) {
    if (type == "for") return cont(forspec, comprehension);
    if (type == "if") return cont(expression, comprehension);
  }

  function isContinuedStatement(state, textAfter) {
    return state.lastType == "operator" || state.lastType == "," ||
      isOperatorChar.test(textAfter.charAt(0)) ||
      /[,.]/.test(textAfter.charAt(0));
  }

  // Interface

  return {
    startState: function(basecolumn) {
      var state = {
        tokenize: tokenBase,
        lastType: "sof",
        cc: [],
        lexical: new JSLexical((basecolumn || 0) - indentUnit, 0, "block", false),
        localVars: parserConfig.localVars,
        context: parserConfig.localVars && {vars: parserConfig.localVars},
        indented: 0
      };
      if (parserConfig.globalVars && typeof parserConfig.globalVars == "object")
        state.globalVars = parserConfig.globalVars;
      return state;
    },

    token: function(stream, state) {
      if (stream.sol()) {
        if (!state.lexical.hasOwnProperty("align"))
          state.lexical.align = false;
        state.indented = stream.indentation();
        findFatArrow(stream, state);
      }
      if (state.tokenize != tokenComment && stream.eatSpace()) return null;
      var style = state.tokenize(stream, state);
      if (type == "comment") return style;
      state.lastType = type == "operator" && (content == "++" || content == "--") ? "incdec" : type;
      return parseJS(state, style, type, content, stream);
    },

    indent: function(state, textAfter) {
      if (state.tokenize == tokenComment) return CodeMirror.Pass;
      if (state.tokenize != tokenBase) return 0;
      var firstChar = textAfter && textAfter.charAt(0), lexical = state.lexical;
      // Kludge to prevent 'maybelse' from blocking lexical scope pops
      if (!/^\s*else\b/.test(textAfter)) for (var i = state.cc.length - 1; i >= 0; --i) {
        var c = state.cc[i];
        if (c == poplex) lexical = lexical.prev;
        else if (c != maybeelse) break;
      }
      if (lexical.type == "stat" && firstChar == "}") lexical = lexical.prev;
      if (statementIndent && lexical.type == ")" && lexical.prev.type == "stat")
        lexical = lexical.prev;
      var type = lexical.type, closing = firstChar == type;

      if (type == "vardef") return lexical.indented + (state.lastType == "operator" || state.lastType == "," ? lexical.info + 1 : 0);
      else if (type == "form" && firstChar == "{") return lexical.indented;
      else if (type == "form") return lexical.indented + indentUnit;
      else if (type == "stat")
        return lexical.indented + (isContinuedStatement(state, textAfter) ? statementIndent || indentUnit : 0);
      else if (lexical.info == "switch" && !closing && parserConfig.doubleIndentSwitch != false)
        return lexical.indented + (/^(?:case|default)\b/.test(textAfter) ? indentUnit : 2 * indentUnit);
      else if (lexical.align) return lexical.column + (closing ? 0 : 1);
      else return lexical.indented + (closing ? 0 : indentUnit);
    },

    electricInput: /^\s*(?:case .*?:|default:|\{|\})$/,
    blockCommentStart: jsonMode ? null : "/*",
    blockCommentEnd: jsonMode ? null : "*/",
    lineComment: jsonMode ? null : "//",
    fold: "brace",
    closeBrackets: "()[]{}''\"\"``",

    helperType: jsonMode ? "json" : "javascript",
    jsonldMode: jsonldMode,
    jsonMode: jsonMode
  };
});

CodeMirror.registerHelper("wordChars", "javascript", /[\w$]/);

CodeMirror.defineMIME("text/javascript", "javascript");
CodeMirror.defineMIME("text/ecmascript", "javascript");
CodeMirror.defineMIME("application/javascript", "javascript");
CodeMirror.defineMIME("application/x-javascript", "javascript");
CodeMirror.defineMIME("application/ecmascript", "javascript");
CodeMirror.defineMIME("application/json", {name: "javascript", json: true});
CodeMirror.defineMIME("application/x-json", {name: "javascript", json: true});
CodeMirror.defineMIME("application/ld+json", {name: "javascript", jsonld: true});
CodeMirror.defineMIME("text/typescript", { name: "javascript", typescript: true });
CodeMirror.defineMIME("application/typescript", { name: "javascript", typescript: true });

});

},{"../../lib/codemirror":8}],10:[function(require,module,exports){
/* mousetrap v1.6.5 craig.is/killing/mice */
(function(q,u,c){function v(a,b,g){a.addEventListener?a.addEventListener(b,g,!1):a.attachEvent("on"+b,g)}function z(a){if("keypress"==a.type){var b=String.fromCharCode(a.which);a.shiftKey||(b=b.toLowerCase());return b}return n[a.which]?n[a.which]:r[a.which]?r[a.which]:String.fromCharCode(a.which).toLowerCase()}function F(a){var b=[];a.shiftKey&&b.push("shift");a.altKey&&b.push("alt");a.ctrlKey&&b.push("ctrl");a.metaKey&&b.push("meta");return b}function w(a){return"shift"==a||"ctrl"==a||"alt"==a||
"meta"==a}function A(a,b){var g,d=[];var e=a;"+"===e?e=["+"]:(e=e.replace(/\+{2}/g,"+plus"),e=e.split("+"));for(g=0;g<e.length;++g){var m=e[g];B[m]&&(m=B[m]);b&&"keypress"!=b&&C[m]&&(m=C[m],d.push("shift"));w(m)&&d.push(m)}e=m;g=b;if(!g){if(!p){p={};for(var c in n)95<c&&112>c||n.hasOwnProperty(c)&&(p[n[c]]=c)}g=p[e]?"keydown":"keypress"}"keypress"==g&&d.length&&(g="keydown");return{key:m,modifiers:d,action:g}}function D(a,b){return null===a||a===u?!1:a===b?!0:D(a.parentNode,b)}function d(a){function b(a){a=
a||{};var b=!1,l;for(l in p)a[l]?b=!0:p[l]=0;b||(x=!1)}function g(a,b,t,f,g,d){var l,E=[],h=t.type;if(!k._callbacks[a])return[];"keyup"==h&&w(a)&&(b=[a]);for(l=0;l<k._callbacks[a].length;++l){var c=k._callbacks[a][l];if((f||!c.seq||p[c.seq]==c.level)&&h==c.action){var e;(e="keypress"==h&&!t.metaKey&&!t.ctrlKey)||(e=c.modifiers,e=b.sort().join(",")===e.sort().join(","));e&&(e=f&&c.seq==f&&c.level==d,(!f&&c.combo==g||e)&&k._callbacks[a].splice(l,1),E.push(c))}}return E}function c(a,b,c,f){k.stopCallback(b,
b.target||b.srcElement,c,f)||!1!==a(b,c)||(b.preventDefault?b.preventDefault():b.returnValue=!1,b.stopPropagation?b.stopPropagation():b.cancelBubble=!0)}function e(a){"number"!==typeof a.which&&(a.which=a.keyCode);var b=z(a);b&&("keyup"==a.type&&y===b?y=!1:k.handleKey(b,F(a),a))}function m(a,g,t,f){function h(c){return function(){x=c;++p[a];clearTimeout(q);q=setTimeout(b,1E3)}}function l(g){c(t,g,a);"keyup"!==f&&(y=z(g));setTimeout(b,10)}for(var d=p[a]=0;d<g.length;++d){var e=d+1===g.length?l:h(f||
A(g[d+1]).action);n(g[d],e,f,a,d)}}function n(a,b,c,f,d){k._directMap[a+":"+c]=b;a=a.replace(/\s+/g," ");var e=a.split(" ");1<e.length?m(a,e,b,c):(c=A(a,c),k._callbacks[c.key]=k._callbacks[c.key]||[],g(c.key,c.modifiers,{type:c.action},f,a,d),k._callbacks[c.key][f?"unshift":"push"]({callback:b,modifiers:c.modifiers,action:c.action,seq:f,level:d,combo:a}))}var k=this;a=a||u;if(!(k instanceof d))return new d(a);k.target=a;k._callbacks={};k._directMap={};var p={},q,y=!1,r=!1,x=!1;k._handleKey=function(a,
d,e){var f=g(a,d,e),h;d={};var k=0,l=!1;for(h=0;h<f.length;++h)f[h].seq&&(k=Math.max(k,f[h].level));for(h=0;h<f.length;++h)f[h].seq?f[h].level==k&&(l=!0,d[f[h].seq]=1,c(f[h].callback,e,f[h].combo,f[h].seq)):l||c(f[h].callback,e,f[h].combo);f="keypress"==e.type&&r;e.type!=x||w(a)||f||b(d);r=l&&"keydown"==e.type};k._bindMultiple=function(a,b,c){for(var d=0;d<a.length;++d)n(a[d],b,c)};v(a,"keypress",e);v(a,"keydown",e);v(a,"keyup",e)}if(q){var n={8:"backspace",9:"tab",13:"enter",16:"shift",17:"ctrl",
18:"alt",20:"capslock",27:"esc",32:"space",33:"pageup",34:"pagedown",35:"end",36:"home",37:"left",38:"up",39:"right",40:"down",45:"ins",46:"del",91:"meta",93:"meta",224:"meta"},r={106:"*",107:"+",109:"-",110:".",111:"/",186:";",187:"=",188:",",189:"-",190:".",191:"/",192:"`",219:"[",220:"\\",221:"]",222:"'"},C={"~":"`","!":"1","@":"2","#":"3",$:"4","%":"5","^":"6","&":"7","*":"8","(":"9",")":"0",_:"-","+":"=",":":";",'"':"'","<":",",">":".","?":"/","|":"\\"},B={option:"alt",command:"meta","return":"enter",
escape:"esc",plus:"+",mod:/Mac|iPod|iPhone|iPad/.test(navigator.platform)?"meta":"ctrl"},p;for(c=1;20>c;++c)n[111+c]="f"+c;for(c=0;9>=c;++c)n[c+96]=c.toString();d.prototype.bind=function(a,b,c){a=a instanceof Array?a:[a];this._bindMultiple.call(this,a,b,c);return this};d.prototype.unbind=function(a,b){return this.bind.call(this,a,function(){},b)};d.prototype.trigger=function(a,b){if(this._directMap[a+":"+b])this._directMap[a+":"+b]({},a);return this};d.prototype.reset=function(){this._callbacks={};
this._directMap={};return this};d.prototype.stopCallback=function(a,b){if(-1<(" "+b.className+" ").indexOf(" mousetrap ")||D(b,this.target))return!1;if("composedPath"in a&&"function"===typeof a.composedPath){var c=a.composedPath()[0];c!==a.target&&(b=c)}return"INPUT"==b.tagName||"SELECT"==b.tagName||"TEXTAREA"==b.tagName||b.isContentEditable};d.prototype.handleKey=function(){return this._handleKey.apply(this,arguments)};d.addKeycodes=function(a){for(var b in a)a.hasOwnProperty(b)&&(n[b]=a[b]);p=null};
d.init=function(){var a=d(u),b;for(b in a)"_"!==b.charAt(0)&&(d[b]=function(b){return function(){return a[b].apply(a,arguments)}}(b))};d.init();q.Mousetrap=d;"undefined"!==typeof module&&module.exports&&(module.exports=d);"function"===typeof define&&define.amd&&define(function(){return d})}})("undefined"!==typeof window?window:null,"undefined"!==typeof window?document:null);

},{}],11:[function(require,module,exports){
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["tweakpane"] = factory();
	else
		root["Tweakpane"] = factory();
})(typeof self !== 'undefined' ? self : this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/main/js/index.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./node_modules/css-loader/lib/css-base.js":
/*!*************************************************!*\
  !*** ./node_modules/css-loader/lib/css-base.js ***!
  \*************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
// css base code, injected by the css-loader
module.exports = function(useSourceMap) {
	var list = [];

	// return the list of modules as css string
	list.toString = function toString() {
		return this.map(function (item) {
			var content = cssWithMappingToString(item, useSourceMap);
			if(item[2]) {
				return "@media " + item[2] + "{" + content + "}";
			} else {
				return content;
			}
		}).join("");
	};

	// import a list of modules into the list
	list.i = function(modules, mediaQuery) {
		if(typeof modules === "string")
			modules = [[null, modules, ""]];
		var alreadyImportedModules = {};
		for(var i = 0; i < this.length; i++) {
			var id = this[i][0];
			if(typeof id === "number")
				alreadyImportedModules[id] = true;
		}
		for(i = 0; i < modules.length; i++) {
			var item = modules[i];
			// skip already imported module
			// this implementation is not 100% perfect for weird media query combinations
			//  when a module is imported multiple times with different media queries.
			//  I hope this will never occur (Hey this way we have smaller bundles)
			if(typeof item[0] !== "number" || !alreadyImportedModules[item[0]]) {
				if(mediaQuery && !item[2]) {
					item[2] = mediaQuery;
				} else if(mediaQuery) {
					item[2] = "(" + item[2] + ") and (" + mediaQuery + ")";
				}
				list.push(item);
			}
		}
	};
	return list;
};

function cssWithMappingToString(item, useSourceMap) {
	var content = item[1] || '';
	var cssMapping = item[3];
	if (!cssMapping) {
		return content;
	}

	if (useSourceMap && typeof btoa === 'function') {
		var sourceMapping = toComment(cssMapping);
		var sourceURLs = cssMapping.sources.map(function (source) {
			return '/*# sourceURL=' + cssMapping.sourceRoot + source + ' */'
		});

		return [content].concat(sourceURLs).concat([sourceMapping]).join('\n');
	}

	return [content].join('\n');
}

// Adapted from convert-source-map (MIT)
function toComment(sourceMap) {
	// eslint-disable-next-line no-undef
	var base64 = btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap))));
	var data = 'sourceMappingURL=data:application/json;charset=utf-8;base64,' + base64;

	return '/*# ' + data + ' */';
}


/***/ }),

/***/ "./node_modules/process/browser.js":
/*!*****************************************!*\
  !*** ./node_modules/process/browser.js ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports) {

// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };


/***/ }),

/***/ "./src/main/js/api/button.ts":
/*!***********************************!*\
  !*** ./src/main/js/api/button.ts ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ButtonApi = void 0;
var ButtonApi = /** @class */ (function () {
    /**
     * @hidden
     */
    function ButtonApi(buttonController) {
        this.controller = buttonController;
    }
    Object.defineProperty(ButtonApi.prototype, "hidden", {
        get: function () {
            return this.controller.viewModel.hidden;
        },
        set: function (hidden) {
            this.controller.viewModel.hidden = hidden;
        },
        enumerable: false,
        configurable: true
    });
    ButtonApi.prototype.dispose = function () {
        this.controller.viewModel.dispose();
    };
    ButtonApi.prototype.on = function (eventName, handler) {
        var emitter = this.controller.button.emitter;
        emitter.on(eventName, handler.bind(this));
        return this;
    };
    return ButtonApi;
}());
exports.ButtonApi = ButtonApi;


/***/ }),

/***/ "./src/main/js/api/event-handler-adapters.ts":
/*!***************************************************!*\
  !*** ./src/main/js/api/event-handler-adapters.ts ***!
  \***************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.folder = exports.monitor = exports.input = void 0;
/**
 * @hidden
 */
function input(_a) {
    var binding = _a.binding, eventName = _a.eventName, handler = _a.handler;
    if (eventName === 'change') {
        var emitter = binding.emitter;
        emitter.on('change', function (ev) {
            handler(ev.sender.getValueToWrite(ev.rawValue));
        });
    }
}
exports.input = input;
/**
 * @hidden
 */
function monitor(_a) {
    var binding = _a.binding, eventName = _a.eventName, handler = _a.handler;
    if (eventName === 'update') {
        var emitter = binding.emitter;
        emitter.on('update', function (ev) {
            handler(ev.sender.target.read());
        });
    }
}
exports.monitor = monitor;
/**
 * @hidden
 */
function folder(_a) {
    var eventName = _a.eventName, folder = _a.folder, handler = _a.handler, uiContainer = _a.uiContainer;
    if (eventName === 'change') {
        var emitter = uiContainer.emitter;
        emitter.on('inputchange', function (ev) {
            // TODO: Find more type-safe way
            handler(ev.inputBinding.getValueToWrite(ev.value));
        });
    }
    if (eventName === 'update') {
        var emitter = uiContainer.emitter;
        emitter.on('monitorupdate', function (ev) {
            handler(ev.monitorBinding.target.read());
        });
    }
    if (eventName === 'fold') {
        uiContainer.emitter.on('itemfold', function (ev) {
            handler(ev.expanded);
        });
        folder === null || folder === void 0 ? void 0 : folder.emitter.on('change', function (ev) {
            if (ev.propertyName !== 'expanded') {
                return;
            }
            handler(ev.sender.expanded);
        });
    }
}
exports.folder = folder;


/***/ }),

/***/ "./src/main/js/api/folder.ts":
/*!***********************************!*\
  !*** ./src/main/js/api/folder.ts ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FolderApi = void 0;
var InputBindingControllerCreators = __webpack_require__(/*! ../controller/binding-creators/input */ "./src/main/js/controller/binding-creators/input.ts");
var MonitorBindingControllerCreators = __webpack_require__(/*! ../controller/binding-creators/monitor */ "./src/main/js/controller/binding-creators/monitor.ts");
var button_1 = __webpack_require__(/*! ../controller/button */ "./src/main/js/controller/button.ts");
var folder_1 = __webpack_require__(/*! ../controller/folder */ "./src/main/js/controller/folder.ts");
var separator_1 = __webpack_require__(/*! ../controller/separator */ "./src/main/js/controller/separator.ts");
var target_1 = __webpack_require__(/*! ../model/target */ "./src/main/js/model/target.ts");
var view_model_1 = __webpack_require__(/*! ../model/view-model */ "./src/main/js/model/view-model.ts");
var button_2 = __webpack_require__(/*! ./button */ "./src/main/js/api/button.ts");
var EventHandlerAdapters = __webpack_require__(/*! ./event-handler-adapters */ "./src/main/js/api/event-handler-adapters.ts");
var input_binding_1 = __webpack_require__(/*! ./input-binding */ "./src/main/js/api/input-binding.ts");
var monitor_binding_1 = __webpack_require__(/*! ./monitor-binding */ "./src/main/js/api/monitor-binding.ts");
var separator_2 = __webpack_require__(/*! ./separator */ "./src/main/js/api/separator.ts");
var FolderApi = /** @class */ (function () {
    /**
     * @hidden
     */
    function FolderApi(folderController) {
        this.controller = folderController;
    }
    Object.defineProperty(FolderApi.prototype, "expanded", {
        get: function () {
            return this.controller.folder.expanded;
        },
        set: function (expanded) {
            this.controller.folder.expanded = expanded;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FolderApi.prototype, "hidden", {
        get: function () {
            return this.controller.viewModel.hidden;
        },
        set: function (hidden) {
            this.controller.viewModel.hidden = hidden;
        },
        enumerable: false,
        configurable: true
    });
    FolderApi.prototype.dispose = function () {
        this.controller.viewModel.dispose();
    };
    FolderApi.prototype.addInput = function (object, key, opt_params) {
        var params = opt_params || {};
        var uc = InputBindingControllerCreators.create(this.controller.document, new target_1.Target(object, key, params.presetKey), params);
        this.controller.uiContainer.add(uc, params.index);
        return new input_binding_1.InputBindingApi(uc);
    };
    FolderApi.prototype.addMonitor = function (object, key, opt_params) {
        var params = opt_params || {};
        var uc = MonitorBindingControllerCreators.create(this.controller.document, new target_1.Target(object, key), params);
        this.controller.uiContainer.add(uc, params.index);
        return new monitor_binding_1.MonitorBindingApi(uc);
    };
    FolderApi.prototype.addFolder = function (params) {
        var uc = new folder_1.FolderController(this.controller.document, __assign(__assign({}, params), { viewModel: new view_model_1.ViewModel() }));
        this.controller.uiContainer.add(uc, params.index);
        return new FolderApi(uc);
    };
    FolderApi.prototype.addButton = function (params) {
        var uc = new button_1.ButtonController(this.controller.document, __assign(__assign({}, params), { viewModel: new view_model_1.ViewModel() }));
        this.controller.uiContainer.add(uc, params.index);
        return new button_2.ButtonApi(uc);
    };
    FolderApi.prototype.addSeparator = function (opt_params) {
        var params = opt_params || {};
        var uc = new separator_1.SeparatorController(this.controller.document, {
            viewModel: new view_model_1.ViewModel(),
        });
        this.controller.uiContainer.add(uc, params.index);
        return new separator_2.SeparatorApi(uc);
    };
    FolderApi.prototype.on = function (eventName, handler) {
        EventHandlerAdapters.folder({
            eventName: eventName,
            folder: this.controller.folder,
            handler: handler.bind(this),
            uiContainer: this.controller.uiContainer,
        });
        return this;
    };
    return FolderApi;
}());
exports.FolderApi = FolderApi;


/***/ }),

/***/ "./src/main/js/api/input-binding.ts":
/*!******************************************!*\
  !*** ./src/main/js/api/input-binding.ts ***!
  \******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.InputBindingApi = void 0;
var HandlerAdapters = __webpack_require__(/*! ./event-handler-adapters */ "./src/main/js/api/event-handler-adapters.ts");
/**
 * The API for the input binding between the parameter and the pane.
 * @param In The type inner Tweakpane.
 * @param Out The type outer Tweakpane (= parameter object).
 */
var InputBindingApi = /** @class */ (function () {
    /**
     * @hidden
     */
    function InputBindingApi(bindingController) {
        this.controller = bindingController;
    }
    Object.defineProperty(InputBindingApi.prototype, "hidden", {
        get: function () {
            return this.controller.viewModel.hidden;
        },
        set: function (hidden) {
            this.controller.viewModel.hidden = hidden;
        },
        enumerable: false,
        configurable: true
    });
    InputBindingApi.prototype.dispose = function () {
        this.controller.viewModel.dispose();
    };
    InputBindingApi.prototype.on = function (eventName, handler) {
        HandlerAdapters.input({
            binding: this.controller.binding,
            eventName: eventName,
            handler: handler.bind(this),
        });
        return this;
    };
    InputBindingApi.prototype.refresh = function () {
        this.controller.binding.read();
    };
    return InputBindingApi;
}());
exports.InputBindingApi = InputBindingApi;


/***/ }),

/***/ "./src/main/js/api/monitor-binding.ts":
/*!********************************************!*\
  !*** ./src/main/js/api/monitor-binding.ts ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitorBindingApi = void 0;
var EventHandlerAdapters = __webpack_require__(/*! ./event-handler-adapters */ "./src/main/js/api/event-handler-adapters.ts");
/**
 * The API for the monitor binding between the parameter and the pane.
 */
var MonitorBindingApi = /** @class */ (function () {
    /**
     * @hidden
     */
    function MonitorBindingApi(bindingController) {
        this.controller = bindingController;
    }
    Object.defineProperty(MonitorBindingApi.prototype, "hidden", {
        get: function () {
            return this.controller.viewModel.hidden;
        },
        set: function (hidden) {
            this.controller.viewModel.hidden = hidden;
        },
        enumerable: false,
        configurable: true
    });
    MonitorBindingApi.prototype.dispose = function () {
        this.controller.viewModel.dispose();
    };
    MonitorBindingApi.prototype.on = function (eventName, handler) {
        EventHandlerAdapters.monitor({
            binding: this.controller.binding,
            eventName: eventName,
            handler: handler.bind(this),
        });
        return this;
    };
    MonitorBindingApi.prototype.refresh = function () {
        this.controller.binding.read();
    };
    return MonitorBindingApi;
}());
exports.MonitorBindingApi = MonitorBindingApi;


/***/ }),

/***/ "./src/main/js/api/preset.ts":
/*!***********************************!*\
  !*** ./src/main/js/api/preset.ts ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.importJson = exports.exportJson = void 0;
/**
 * @hidden
 */
function exportJson(targets) {
    return targets.reduce(function (result, target) {
        var _a;
        return Object.assign(result, (_a = {},
            _a[target.presetKey] = target.read(),
            _a));
    }, {});
}
exports.exportJson = exportJson;
/**
 * @hidden
 */
function importJson(targets, preset) {
    targets.forEach(function (target) {
        var value = preset[target.presetKey];
        if (value !== undefined) {
            target.write(value);
        }
    });
}
exports.importJson = importJson;


/***/ }),

/***/ "./src/main/js/api/root.ts":
/*!*********************************!*\
  !*** ./src/main/js/api/root.ts ***!
  \*********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RootApi = void 0;
var InputBindingControllerCreators = __webpack_require__(/*! ../controller/binding-creators/input */ "./src/main/js/controller/binding-creators/input.ts");
var MonitorBindingControllerCreators = __webpack_require__(/*! ../controller/binding-creators/monitor */ "./src/main/js/controller/binding-creators/monitor.ts");
var button_1 = __webpack_require__(/*! ../controller/button */ "./src/main/js/controller/button.ts");
var folder_1 = __webpack_require__(/*! ../controller/folder */ "./src/main/js/controller/folder.ts");
var input_binding_1 = __webpack_require__(/*! ../controller/input-binding */ "./src/main/js/controller/input-binding.ts");
var monitor_binding_1 = __webpack_require__(/*! ../controller/monitor-binding */ "./src/main/js/controller/monitor-binding.ts");
var separator_1 = __webpack_require__(/*! ../controller/separator */ "./src/main/js/controller/separator.ts");
var UiUtil = __webpack_require__(/*! ../controller/ui-util */ "./src/main/js/controller/ui-util.ts");
var target_1 = __webpack_require__(/*! ../model/target */ "./src/main/js/model/target.ts");
var view_model_1 = __webpack_require__(/*! ../model/view-model */ "./src/main/js/model/view-model.ts");
var button_2 = __webpack_require__(/*! ./button */ "./src/main/js/api/button.ts");
var EventHandlerAdapters = __webpack_require__(/*! ./event-handler-adapters */ "./src/main/js/api/event-handler-adapters.ts");
var folder_2 = __webpack_require__(/*! ./folder */ "./src/main/js/api/folder.ts");
var input_binding_2 = __webpack_require__(/*! ./input-binding */ "./src/main/js/api/input-binding.ts");
var monitor_binding_2 = __webpack_require__(/*! ./monitor-binding */ "./src/main/js/api/monitor-binding.ts");
var Preset = __webpack_require__(/*! ./preset */ "./src/main/js/api/preset.ts");
var separator_2 = __webpack_require__(/*! ./separator */ "./src/main/js/api/separator.ts");
/**
 * The Tweakpane interface.
 *
 * ```
 * new Tweakpane(options: TweakpaneConfig): RootApi
 * ```
 *
 * See [[TweakpaneConfig]] interface for available options.
 */
var RootApi = /** @class */ (function () {
    /**
     * @hidden
     */
    function RootApi(rootController) {
        this.controller = rootController;
    }
    Object.defineProperty(RootApi.prototype, "element", {
        get: function () {
            return this.controller.view.element;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RootApi.prototype, "expanded", {
        get: function () {
            var folder = this.controller.folder;
            return folder ? folder.expanded : true;
        },
        set: function (expanded) {
            var folder = this.controller.folder;
            if (folder) {
                folder.expanded = expanded;
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RootApi.prototype, "hidden", {
        get: function () {
            return this.controller.viewModel.hidden;
        },
        set: function (hidden) {
            this.controller.viewModel.hidden = hidden;
        },
        enumerable: false,
        configurable: true
    });
    RootApi.prototype.dispose = function () {
        this.controller.viewModel.dispose();
    };
    RootApi.prototype.addInput = function (object, key, opt_params) {
        var params = opt_params || {};
        var uc = InputBindingControllerCreators.create(this.controller.document, new target_1.Target(object, key, params.presetKey), params);
        this.controller.uiContainer.add(uc, params.index);
        return new input_binding_2.InputBindingApi(uc);
    };
    RootApi.prototype.addMonitor = function (object, key, opt_params) {
        var params = opt_params || {};
        var uc = MonitorBindingControllerCreators.create(this.controller.document, new target_1.Target(object, key), params);
        this.controller.uiContainer.add(uc, params.index);
        return new monitor_binding_2.MonitorBindingApi(uc);
    };
    RootApi.prototype.addButton = function (params) {
        var uc = new button_1.ButtonController(this.controller.document, __assign(__assign({}, params), { viewModel: new view_model_1.ViewModel() }));
        this.controller.uiContainer.add(uc, params.index);
        return new button_2.ButtonApi(uc);
    };
    RootApi.prototype.addFolder = function (params) {
        var uc = new folder_1.FolderController(this.controller.document, __assign(__assign({}, params), { viewModel: new view_model_1.ViewModel() }));
        this.controller.uiContainer.add(uc, params.index);
        return new folder_2.FolderApi(uc);
    };
    RootApi.prototype.addSeparator = function (opt_params) {
        var params = opt_params || {};
        var uc = new separator_1.SeparatorController(this.controller.document, {
            viewModel: new view_model_1.ViewModel(),
        });
        this.controller.uiContainer.add(uc, params.index);
        return new separator_2.SeparatorApi(uc);
    };
    /**
     * Import a preset of all inputs.
     * @param preset The preset object to import.
     */
    RootApi.prototype.importPreset = function (preset) {
        var targets = UiUtil.findControllers(this.controller.uiContainer.items, input_binding_1.InputBindingController).map(function (ibc) {
            return ibc.binding.target;
        });
        Preset.importJson(targets, preset);
        this.refresh();
    };
    /**
     * Export a preset of all inputs.
     * @return The exported preset object.
     */
    RootApi.prototype.exportPreset = function () {
        var targets = UiUtil.findControllers(this.controller.uiContainer.items, input_binding_1.InputBindingController).map(function (ibc) {
            return ibc.binding.target;
        });
        return Preset.exportJson(targets);
    };
    /**
     * Adds a global event listener. It handles all events of child inputs/monitors.
     * @param eventName The event name to listen.
     * @return The API object itself.
     */
    RootApi.prototype.on = function (eventName, handler) {
        EventHandlerAdapters.folder({
            eventName: eventName,
            folder: this.controller.folder,
            handler: handler.bind(this),
            uiContainer: this.controller.uiContainer,
        });
        return this;
    };
    /**
     * Refreshes all bindings of the pane.
     */
    RootApi.prototype.refresh = function () {
        // Force-read all input bindings
        UiUtil.findControllers(this.controller.uiContainer.items, input_binding_1.InputBindingController).forEach(function (ibc) {
            ibc.binding.read();
        });
        // Force-read all monitor bindings
        UiUtil.findControllers(this.controller.uiContainer.items, monitor_binding_1.MonitorBindingController).forEach(function (mbc) {
            mbc.binding.read();
        });
    };
    return RootApi;
}());
exports.RootApi = RootApi;


/***/ }),

/***/ "./src/main/js/api/separator.ts":
/*!**************************************!*\
  !*** ./src/main/js/api/separator.ts ***!
  \**************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.SeparatorApi = void 0;
var SeparatorApi = /** @class */ (function () {
    /**
     * @hidden
     */
    function SeparatorApi(controller) {
        this.controller = controller;
    }
    Object.defineProperty(SeparatorApi.prototype, "hidden", {
        get: function () {
            return this.controller.viewModel.hidden;
        },
        set: function (hidden) {
            this.controller.viewModel.hidden = hidden;
        },
        enumerable: false,
        configurable: true
    });
    SeparatorApi.prototype.dispose = function () {
        this.controller.viewModel.dispose();
    };
    return SeparatorApi;
}());
exports.SeparatorApi = SeparatorApi;


/***/ }),

/***/ "./src/main/js/binding/input.ts":
/*!**************************************!*\
  !*** ./src/main/js/binding/input.ts ***!
  \**************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.InputBinding = void 0;
var emitter_1 = __webpack_require__(/*! ../misc/emitter */ "./src/main/js/misc/emitter.ts");
/**
 * @hidden
 */
var InputBinding = /** @class */ (function () {
    function InputBinding(config) {
        this.onValueChange_ = this.onValueChange_.bind(this);
        this.reader_ = config.reader;
        this.writer_ = config.writer;
        this.emitter = new emitter_1.Emitter();
        this.value = config.value;
        this.value.emitter.on('change', this.onValueChange_);
        this.target = config.target;
        this.read();
    }
    InputBinding.prototype.read = function () {
        var targetValue = this.target.read();
        if (targetValue !== undefined) {
            this.value.rawValue = this.reader_(targetValue);
        }
    };
    InputBinding.prototype.getValueToWrite = function (rawValue) {
        return this.writer_(rawValue);
    };
    InputBinding.prototype.write_ = function (rawValue) {
        this.target.write(this.getValueToWrite(rawValue));
    };
    InputBinding.prototype.onValueChange_ = function (ev) {
        this.write_(ev.rawValue);
        this.emitter.emit('change', {
            rawValue: ev.rawValue,
            sender: this,
        });
    };
    return InputBinding;
}());
exports.InputBinding = InputBinding;


/***/ }),

/***/ "./src/main/js/binding/monitor.ts":
/*!****************************************!*\
  !*** ./src/main/js/binding/monitor.ts ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitorBinding = void 0;
var emitter_1 = __webpack_require__(/*! ../misc/emitter */ "./src/main/js/misc/emitter.ts");
/**
 * @hidden
 */
var MonitorBinding = /** @class */ (function () {
    function MonitorBinding(config) {
        this.onTick_ = this.onTick_.bind(this);
        this.onValueUpdate_ = this.onValueUpdate_.bind(this);
        this.reader_ = config.reader;
        this.target = config.target;
        this.emitter = new emitter_1.Emitter();
        this.value = config.value;
        this.value.emitter.on('update', this.onValueUpdate_);
        this.ticker = config.ticker;
        this.ticker.emitter.on('tick', this.onTick_);
        this.read();
    }
    MonitorBinding.prototype.dispose = function () {
        this.ticker.disposable.dispose();
    };
    MonitorBinding.prototype.read = function () {
        var targetValue = this.target.read();
        if (targetValue !== undefined) {
            this.value.append(this.reader_(targetValue));
        }
    };
    MonitorBinding.prototype.onTick_ = function (_) {
        this.read();
    };
    MonitorBinding.prototype.onValueUpdate_ = function (ev) {
        this.emitter.emit('update', {
            rawValue: ev.rawValue,
            sender: this,
        });
    };
    return MonitorBinding;
}());
exports.MonitorBinding = MonitorBinding;


/***/ }),

/***/ "./src/main/js/constraint/composite.ts":
/*!*********************************************!*\
  !*** ./src/main/js/constraint/composite.ts ***!
  \*********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.CompositeConstraint = void 0;
/**
 * @hidden
 */
var CompositeConstraint = /** @class */ (function () {
    function CompositeConstraint(config) {
        this.constraints_ = config.constraints;
    }
    Object.defineProperty(CompositeConstraint.prototype, "constraints", {
        get: function () {
            return this.constraints_;
        },
        enumerable: false,
        configurable: true
    });
    CompositeConstraint.prototype.constrain = function (value) {
        return this.constraints_.reduce(function (result, c) {
            return c.constrain(result);
        }, value);
    };
    return CompositeConstraint;
}());
exports.CompositeConstraint = CompositeConstraint;


/***/ }),

/***/ "./src/main/js/constraint/list.ts":
/*!****************************************!*\
  !*** ./src/main/js/constraint/list.ts ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ListConstraint = void 0;
/**
 * @hidden
 */
var ListConstraint = /** @class */ (function () {
    function ListConstraint(config) {
        this.opts_ = config.options;
    }
    Object.defineProperty(ListConstraint.prototype, "options", {
        get: function () {
            return this.opts_;
        },
        enumerable: false,
        configurable: true
    });
    ListConstraint.prototype.constrain = function (value) {
        var opts = this.opts_;
        if (opts.length === 0) {
            return value;
        }
        var matched = opts.filter(function (item) {
            return item.value === value;
        }).length > 0;
        return matched ? value : opts[0].value;
    };
    return ListConstraint;
}());
exports.ListConstraint = ListConstraint;


/***/ }),

/***/ "./src/main/js/constraint/point-2d.ts":
/*!********************************************!*\
  !*** ./src/main/js/constraint/point-2d.ts ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Point2dConstraint = void 0;
var point_2d_1 = __webpack_require__(/*! ../model/point-2d */ "./src/main/js/model/point-2d.ts");
/**
 * @hidden
 */
var Point2dConstraint = /** @class */ (function () {
    function Point2dConstraint(config) {
        this.xConstraint = config.x;
        this.yConstraint = config.y;
    }
    Point2dConstraint.prototype.constrain = function (value) {
        return new point_2d_1.Point2d(this.xConstraint ? this.xConstraint.constrain(value.x) : value.x, this.yConstraint ? this.yConstraint.constrain(value.y) : value.y);
    };
    return Point2dConstraint;
}());
exports.Point2dConstraint = Point2dConstraint;


/***/ }),

/***/ "./src/main/js/constraint/range.ts":
/*!*****************************************!*\
  !*** ./src/main/js/constraint/range.ts ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.RangeConstraint = void 0;
var type_util_1 = __webpack_require__(/*! ../misc/type-util */ "./src/main/js/misc/type-util.ts");
/**
 * @hidden
 */
var RangeConstraint = /** @class */ (function () {
    function RangeConstraint(config) {
        this.maxValue = config.max;
        this.minValue = config.min;
    }
    RangeConstraint.prototype.constrain = function (value) {
        var result = value;
        if (!type_util_1.TypeUtil.isEmpty(this.minValue)) {
            result = Math.max(result, this.minValue);
        }
        if (!type_util_1.TypeUtil.isEmpty(this.maxValue)) {
            result = Math.min(result, this.maxValue);
        }
        return result;
    };
    return RangeConstraint;
}());
exports.RangeConstraint = RangeConstraint;


/***/ }),

/***/ "./src/main/js/constraint/step.ts":
/*!****************************************!*\
  !*** ./src/main/js/constraint/step.ts ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.StepConstraint = void 0;
/**
 * @hidden
 */
var StepConstraint = /** @class */ (function () {
    function StepConstraint(config) {
        this.step = config.step;
    }
    StepConstraint.prototype.constrain = function (value) {
        var r = value < 0
            ? -Math.round(-value / this.step)
            : Math.round(value / this.step);
        return r * this.step;
    };
    return StepConstraint;
}());
exports.StepConstraint = StepConstraint;


/***/ }),

/***/ "./src/main/js/constraint/util.ts":
/*!****************************************!*\
  !*** ./src/main/js/constraint/util.ts ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstraintUtil = void 0;
var composite_1 = __webpack_require__(/*! ./composite */ "./src/main/js/constraint/composite.ts");
/**
 * @hidden
 */
exports.ConstraintUtil = {
    findConstraint: function (c, constraintClass) {
        if (c instanceof constraintClass) {
            return c;
        }
        if (c instanceof composite_1.CompositeConstraint) {
            var result = c.constraints.reduce(function (tmpResult, sc) {
                if (tmpResult) {
                    return tmpResult;
                }
                return sc instanceof constraintClass ? sc : null;
            }, null);
            if (result) {
                return result;
            }
        }
        return null;
    },
};


/***/ }),

/***/ "./src/main/js/controller/binding-creators/boolean-input.ts":
/*!******************************************************************!*\
  !*** ./src/main/js/controller/binding-creators/boolean-input.ts ***!
  \******************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.create = void 0;
var input_1 = __webpack_require__(/*! ../../binding/input */ "./src/main/js/binding/input.ts");
var composite_1 = __webpack_require__(/*! ../../constraint/composite */ "./src/main/js/constraint/composite.ts");
var list_1 = __webpack_require__(/*! ../../constraint/list */ "./src/main/js/constraint/list.ts");
var util_1 = __webpack_require__(/*! ../../constraint/util */ "./src/main/js/constraint/util.ts");
var BooleanConverter = __webpack_require__(/*! ../../converter/boolean */ "./src/main/js/converter/boolean.ts");
var input_value_1 = __webpack_require__(/*! ../../model/input-value */ "./src/main/js/model/input-value.ts");
var view_model_1 = __webpack_require__(/*! ../../model/view-model */ "./src/main/js/model/view-model.ts");
var input_binding_1 = __webpack_require__(/*! ../input-binding */ "./src/main/js/controller/input-binding.ts");
var checkbox_1 = __webpack_require__(/*! ../input/checkbox */ "./src/main/js/controller/input/checkbox.ts");
var list_2 = __webpack_require__(/*! ../input/list */ "./src/main/js/controller/input/list.ts");
var UiUtil = __webpack_require__(/*! ../ui-util */ "./src/main/js/controller/ui-util.ts");
function createConstraint(params) {
    var constraints = [];
    if ('options' in params && params.options !== undefined) {
        constraints.push(new list_1.ListConstraint({
            options: UiUtil.normalizeInputParamsOptions(params.options, BooleanConverter.fromMixed),
        }));
    }
    return new composite_1.CompositeConstraint({
        constraints: constraints,
    });
}
function createController(document, value) {
    var c = value.constraint;
    if (c && util_1.ConstraintUtil.findConstraint(c, list_1.ListConstraint)) {
        return new list_2.ListInputController(document, {
            viewModel: new view_model_1.ViewModel(),
            stringifyValue: BooleanConverter.toString,
            value: value,
        });
    }
    return new checkbox_1.CheckboxInputController(document, {
        viewModel: new view_model_1.ViewModel(),
        value: value,
    });
}
/**
 * @hidden
 */
function create(document, target, params) {
    var initialValue = target.read();
    if (typeof initialValue !== 'boolean') {
        return null;
    }
    var value = new input_value_1.InputValue(false, createConstraint(params));
    var binding = new input_1.InputBinding({
        reader: BooleanConverter.fromMixed,
        target: target,
        value: value,
        writer: function (v) { return v; },
    });
    return new input_binding_1.InputBindingController(document, {
        binding: binding,
        controller: createController(document, value),
        label: params.label || target.key,
    });
}
exports.create = create;


/***/ }),

/***/ "./src/main/js/controller/binding-creators/boolean-monitor.ts":
/*!********************************************************************!*\
  !*** ./src/main/js/controller/binding-creators/boolean-monitor.ts ***!
  \********************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.create = void 0;
var monitor_1 = __webpack_require__(/*! ../../binding/monitor */ "./src/main/js/binding/monitor.ts");
var BooleanConverter = __webpack_require__(/*! ../../converter/boolean */ "./src/main/js/converter/boolean.ts");
var boolean_1 = __webpack_require__(/*! ../../formatter/boolean */ "./src/main/js/formatter/boolean.ts");
var constants_1 = __webpack_require__(/*! ../../misc/constants */ "./src/main/js/misc/constants.ts");
var interval_1 = __webpack_require__(/*! ../../misc/ticker/interval */ "./src/main/js/misc/ticker/interval.ts");
var type_util_1 = __webpack_require__(/*! ../../misc/type-util */ "./src/main/js/misc/type-util.ts");
var monitor_value_1 = __webpack_require__(/*! ../../model/monitor-value */ "./src/main/js/model/monitor-value.ts");
var view_model_1 = __webpack_require__(/*! ../../model/view-model */ "./src/main/js/model/view-model.ts");
var monitor_binding_1 = __webpack_require__(/*! ../monitor-binding */ "./src/main/js/controller/monitor-binding.ts");
var multi_log_1 = __webpack_require__(/*! ../monitor/multi-log */ "./src/main/js/controller/monitor/multi-log.ts");
var single_log_1 = __webpack_require__(/*! ../monitor/single-log */ "./src/main/js/controller/monitor/single-log.ts");
/**
 * @hidden
 */
function create(document, target, params) {
    var initialValue = target.read();
    if (typeof initialValue !== 'boolean') {
        return null;
    }
    var value = new monitor_value_1.MonitorValue(type_util_1.TypeUtil.getOrDefault(params.count, 1));
    var controller = value.totalCount === 1
        ? new single_log_1.SingleLogMonitorController(document, {
            viewModel: new view_model_1.ViewModel(),
            formatter: new boolean_1.BooleanFormatter(),
            value: value,
        })
        : new multi_log_1.MultiLogMonitorController(document, {
            viewModel: new view_model_1.ViewModel(),
            formatter: new boolean_1.BooleanFormatter(),
            value: value,
        });
    var ticker = new interval_1.IntervalTicker(document, type_util_1.TypeUtil.getOrDefault(params.interval, constants_1.Constants.monitorDefaultInterval));
    return new monitor_binding_1.MonitorBindingController(document, {
        binding: new monitor_1.MonitorBinding({
            reader: BooleanConverter.fromMixed,
            target: target,
            ticker: ticker,
            value: value,
        }),
        controller: controller,
        label: params.label || target.key,
    });
}
exports.create = create;


/***/ }),

/***/ "./src/main/js/controller/binding-creators/color-input.ts":
/*!****************************************************************!*\
  !*** ./src/main/js/controller/binding-creators/color-input.ts ***!
  \****************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.createWithObject = exports.createWithNumber = exports.createWithString = void 0;
var input_1 = __webpack_require__(/*! ../../binding/input */ "./src/main/js/binding/input.ts");
var ColorConverter = __webpack_require__(/*! ../../converter/color */ "./src/main/js/converter/color.ts");
var color_1 = __webpack_require__(/*! ../../formatter/color */ "./src/main/js/formatter/color.ts");
var color_2 = __webpack_require__(/*! ../../model/color */ "./src/main/js/model/color.ts");
var input_value_1 = __webpack_require__(/*! ../../model/input-value */ "./src/main/js/model/input-value.ts");
var view_model_1 = __webpack_require__(/*! ../../model/view-model */ "./src/main/js/model/view-model.ts");
var NumberColorParser = __webpack_require__(/*! ../../parser/number-color */ "./src/main/js/parser/number-color.ts");
var StringColorParser = __webpack_require__(/*! ../../parser/string-color */ "./src/main/js/parser/string-color.ts");
var input_binding_1 = __webpack_require__(/*! ../input-binding */ "./src/main/js/controller/input-binding.ts");
var color_swatch_text_1 = __webpack_require__(/*! ../input/color-swatch-text */ "./src/main/js/controller/input/color-swatch-text.ts");
/**
 * @hidden
 */
function createWithString(document, target, params) {
    var initialValue = target.read();
    if (typeof initialValue !== 'string') {
        return null;
    }
    var notation = StringColorParser.getNotation(initialValue);
    if (!notation) {
        return null;
    }
    var converter = ColorConverter.fromString;
    var color = converter(initialValue);
    var value = new input_value_1.InputValue(color);
    var writer = ColorConverter.getStringifier(notation);
    return new input_binding_1.InputBindingController(document, {
        binding: new input_1.InputBinding({
            reader: converter,
            target: target,
            value: value,
            writer: writer,
        }),
        controller: new color_swatch_text_1.ColorSwatchTextInputController(document, {
            formatter: new color_1.ColorFormatter(writer),
            parser: StringColorParser.CompositeParser,
            supportsAlpha: StringColorParser.hasAlphaComponent(notation),
            value: value,
            viewModel: new view_model_1.ViewModel(),
        }),
        label: params.label || target.key,
    });
}
exports.createWithString = createWithString;
/**
 * @hidden
 */
function createWithNumber(document, target, params) {
    var initialValue = target.read();
    if (typeof initialValue !== 'number') {
        return null;
    }
    if (!('input' in params)) {
        return null;
    }
    if (params.input !== 'color' &&
        params.input !== 'color.rgb' &&
        params.input !== 'color.rgba') {
        return null;
    }
    var supportsAlpha = params.input === 'color.rgba';
    var parser = supportsAlpha
        ? NumberColorParser.RgbaParser
        : NumberColorParser.RgbParser;
    var color = parser(initialValue);
    if (!color) {
        return null;
    }
    var formatter = supportsAlpha
        ? new color_1.ColorFormatter(ColorConverter.toHexRgbaString)
        : new color_1.ColorFormatter(ColorConverter.toHexRgbString);
    var reader = supportsAlpha
        ? ColorConverter.fromNumberToRgba
        : ColorConverter.fromNumberToRgb;
    var writer = supportsAlpha
        ? ColorConverter.toRgbaNumber
        : ColorConverter.toRgbNumber;
    var value = new input_value_1.InputValue(color);
    return new input_binding_1.InputBindingController(document, {
        binding: new input_1.InputBinding({
            reader: reader,
            target: target,
            value: value,
            writer: writer,
        }),
        controller: new color_swatch_text_1.ColorSwatchTextInputController(document, {
            formatter: formatter,
            parser: StringColorParser.CompositeParser,
            supportsAlpha: supportsAlpha,
            value: value,
            viewModel: new view_model_1.ViewModel(),
        }),
        label: params.label || target.key,
    });
}
exports.createWithNumber = createWithNumber;
/**
 * @hidden
 */
function createWithObject(document, target, params) {
    var initialValue = target.read();
    if (!color_2.Color.isColorObject(initialValue)) {
        return null;
    }
    var color = color_2.Color.fromObject(initialValue);
    var supportsAlpha = color_2.Color.isRgbaColorObject(initialValue);
    var formatter = supportsAlpha
        ? new color_1.ColorFormatter(ColorConverter.toHexRgbaString)
        : new color_1.ColorFormatter(ColorConverter.toHexRgbString);
    var value = new input_value_1.InputValue(color);
    return new input_binding_1.InputBindingController(document, {
        binding: new input_1.InputBinding({
            reader: ColorConverter.fromObject,
            target: target,
            value: value,
            writer: color_2.Color.toRgbaObject,
        }),
        controller: new color_swatch_text_1.ColorSwatchTextInputController(document, {
            viewModel: new view_model_1.ViewModel(),
            formatter: formatter,
            parser: StringColorParser.CompositeParser,
            supportsAlpha: supportsAlpha,
            value: value,
        }),
        label: params.label || target.key,
    });
}
exports.createWithObject = createWithObject;


/***/ }),

/***/ "./src/main/js/controller/binding-creators/input.ts":
/*!**********************************************************!*\
  !*** ./src/main/js/controller/binding-creators/input.ts ***!
  \**********************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.create = void 0;
var pane_error_1 = __webpack_require__(/*! ../../misc/pane-error */ "./src/main/js/misc/pane-error.ts");
var type_util_1 = __webpack_require__(/*! ../../misc/type-util */ "./src/main/js/misc/type-util.ts");
var BooleanInputBindingControllerCreators = __webpack_require__(/*! ./boolean-input */ "./src/main/js/controller/binding-creators/boolean-input.ts");
var ColorInputBindingControllerCreators = __webpack_require__(/*! ./color-input */ "./src/main/js/controller/binding-creators/color-input.ts");
var NumberInputBindingControllerCreators = __webpack_require__(/*! ./number-input */ "./src/main/js/controller/binding-creators/number-input.ts");
var Point2dInputBindingControllerCreators = __webpack_require__(/*! ./point-2d-input */ "./src/main/js/controller/binding-creators/point-2d-input.ts");
var StringInputBindingControllerCreators = __webpack_require__(/*! ./string-input */ "./src/main/js/controller/binding-creators/string-input.ts");
/**
 * @hidden
 */
function create(document, target, params) {
    var initialValue = target.read();
    if (type_util_1.TypeUtil.isEmpty(initialValue)) {
        throw new pane_error_1.PaneError({
            context: {
                key: target.key,
            },
            type: 'emptyvalue',
        });
    }
    var bc = [
        BooleanInputBindingControllerCreators.create,
        ColorInputBindingControllerCreators.createWithNumber,
        ColorInputBindingControllerCreators.createWithObject,
        ColorInputBindingControllerCreators.createWithString,
        NumberInputBindingControllerCreators.create,
        StringInputBindingControllerCreators.create,
        Point2dInputBindingControllerCreators.create,
    ].reduce(function (result, createBindingController) {
        return result || createBindingController(document, target, params);
    }, null);
    if (bc) {
        return bc;
    }
    throw new pane_error_1.PaneError({
        context: {
            key: target.key,
        },
        type: 'nomatchingcontroller',
    });
}
exports.create = create;


/***/ }),

/***/ "./src/main/js/controller/binding-creators/monitor.ts":
/*!************************************************************!*\
  !*** ./src/main/js/controller/binding-creators/monitor.ts ***!
  \************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.create = void 0;
var pane_error_1 = __webpack_require__(/*! ../../misc/pane-error */ "./src/main/js/misc/pane-error.ts");
var type_util_1 = __webpack_require__(/*! ../../misc/type-util */ "./src/main/js/misc/type-util.ts");
var BooleanMonitorBindingControllerCreators = __webpack_require__(/*! ./boolean-monitor */ "./src/main/js/controller/binding-creators/boolean-monitor.ts");
var NumberMonitorBindingControllerCreators = __webpack_require__(/*! ./number-monitor */ "./src/main/js/controller/binding-creators/number-monitor.ts");
var StringMonitorBindingControllerCreators = __webpack_require__(/*! ./string-monitor */ "./src/main/js/controller/binding-creators/string-monitor.ts");
/**
 * @hidden
 */
function create(document, target, params) {
    var initialValue = target.read();
    if (type_util_1.TypeUtil.isEmpty(initialValue)) {
        throw new pane_error_1.PaneError({
            context: {
                key: target.key,
            },
            type: 'emptyvalue',
        });
    }
    var bc = [
        NumberMonitorBindingControllerCreators.create,
        StringMonitorBindingControllerCreators.create,
        BooleanMonitorBindingControllerCreators.create,
    ].reduce(function (result, createBindingController) {
        return result || createBindingController(document, target, params);
    }, null);
    if (bc) {
        return bc;
    }
    throw new pane_error_1.PaneError({
        context: {
            key: target.key,
        },
        type: 'nomatchingcontroller',
    });
}
exports.create = create;


/***/ }),

/***/ "./src/main/js/controller/binding-creators/number-input.ts":
/*!*****************************************************************!*\
  !*** ./src/main/js/controller/binding-creators/number-input.ts ***!
  \*****************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.create = void 0;
var input_1 = __webpack_require__(/*! ../../binding/input */ "./src/main/js/binding/input.ts");
var composite_1 = __webpack_require__(/*! ../../constraint/composite */ "./src/main/js/constraint/composite.ts");
var list_1 = __webpack_require__(/*! ../../constraint/list */ "./src/main/js/constraint/list.ts");
var range_1 = __webpack_require__(/*! ../../constraint/range */ "./src/main/js/constraint/range.ts");
var step_1 = __webpack_require__(/*! ../../constraint/step */ "./src/main/js/constraint/step.ts");
var util_1 = __webpack_require__(/*! ../../constraint/util */ "./src/main/js/constraint/util.ts");
var NumberConverter = __webpack_require__(/*! ../../converter/number */ "./src/main/js/converter/number.ts");
var number_1 = __webpack_require__(/*! ../../formatter/number */ "./src/main/js/formatter/number.ts");
var type_util_1 = __webpack_require__(/*! ../../misc/type-util */ "./src/main/js/misc/type-util.ts");
var input_value_1 = __webpack_require__(/*! ../../model/input-value */ "./src/main/js/model/input-value.ts");
var view_model_1 = __webpack_require__(/*! ../../model/view-model */ "./src/main/js/model/view-model.ts");
var string_number_1 = __webpack_require__(/*! ../../parser/string-number */ "./src/main/js/parser/string-number.ts");
var input_binding_1 = __webpack_require__(/*! ../input-binding */ "./src/main/js/controller/input-binding.ts");
var list_2 = __webpack_require__(/*! ../input/list */ "./src/main/js/controller/input/list.ts");
var number_text_1 = __webpack_require__(/*! ../input/number-text */ "./src/main/js/controller/input/number-text.ts");
var slider_text_1 = __webpack_require__(/*! ../input/slider-text */ "./src/main/js/controller/input/slider-text.ts");
var UiUtil = __webpack_require__(/*! ../ui-util */ "./src/main/js/controller/ui-util.ts");
function createConstraint(params) {
    var constraints = [];
    if ('step' in params && !type_util_1.TypeUtil.isEmpty(params.step)) {
        constraints.push(new step_1.StepConstraint({
            step: params.step,
        }));
    }
    if (('max' in params && !type_util_1.TypeUtil.isEmpty(params.max)) ||
        ('min' in params && !type_util_1.TypeUtil.isEmpty(params.min))) {
        constraints.push(new range_1.RangeConstraint({
            max: params.max,
            min: params.min,
        }));
    }
    if ('options' in params && params.options !== undefined) {
        constraints.push(new list_1.ListConstraint({
            options: UiUtil.normalizeInputParamsOptions(params.options, NumberConverter.fromMixed),
        }));
    }
    return new composite_1.CompositeConstraint({
        constraints: constraints,
    });
}
function createController(document, value) {
    var c = value.constraint;
    if (c && util_1.ConstraintUtil.findConstraint(c, list_1.ListConstraint)) {
        return new list_2.ListInputController(document, {
            stringifyValue: NumberConverter.toString,
            value: value,
            viewModel: new view_model_1.ViewModel(),
        });
    }
    if (c && util_1.ConstraintUtil.findConstraint(c, range_1.RangeConstraint)) {
        return new slider_text_1.SliderTextInputController(document, {
            formatter: new number_1.NumberFormatter(UiUtil.getSuitableDecimalDigits(value.constraint, value.rawValue)),
            parser: string_number_1.StringNumberParser,
            value: value,
            viewModel: new view_model_1.ViewModel(),
        });
    }
    return new number_text_1.NumberTextInputController(document, {
        formatter: new number_1.NumberFormatter(UiUtil.getSuitableDecimalDigits(value.constraint, value.rawValue)),
        parser: string_number_1.StringNumberParser,
        value: value,
        viewModel: new view_model_1.ViewModel(),
    });
}
/**
 * @hidden
 */
function create(document, target, params) {
    var initialValue = target.read();
    if (typeof initialValue !== 'number') {
        return null;
    }
    var value = new input_value_1.InputValue(0, createConstraint(params));
    var binding = new input_1.InputBinding({
        reader: NumberConverter.fromMixed,
        target: target,
        value: value,
        writer: function (v) { return v; },
    });
    var controller = createController(document, value);
    return new input_binding_1.InputBindingController(document, {
        binding: binding,
        controller: controller,
        label: params.label || target.key,
    });
}
exports.create = create;


/***/ }),

/***/ "./src/main/js/controller/binding-creators/number-monitor.ts":
/*!*******************************************************************!*\
  !*** ./src/main/js/controller/binding-creators/number-monitor.ts ***!
  \*******************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.create = void 0;
var monitor_1 = __webpack_require__(/*! ../../binding/monitor */ "./src/main/js/binding/monitor.ts");
var NumberConverter = __webpack_require__(/*! ../../converter/number */ "./src/main/js/converter/number.ts");
var number_1 = __webpack_require__(/*! ../../formatter/number */ "./src/main/js/formatter/number.ts");
var constants_1 = __webpack_require__(/*! ../../misc/constants */ "./src/main/js/misc/constants.ts");
var interval_1 = __webpack_require__(/*! ../../misc/ticker/interval */ "./src/main/js/misc/ticker/interval.ts");
var type_util_1 = __webpack_require__(/*! ../../misc/type-util */ "./src/main/js/misc/type-util.ts");
var monitor_value_1 = __webpack_require__(/*! ../../model/monitor-value */ "./src/main/js/model/monitor-value.ts");
var view_model_1 = __webpack_require__(/*! ../../model/view-model */ "./src/main/js/model/view-model.ts");
var monitor_binding_1 = __webpack_require__(/*! ../monitor-binding */ "./src/main/js/controller/monitor-binding.ts");
var graph_1 = __webpack_require__(/*! ../monitor/graph */ "./src/main/js/controller/monitor/graph.ts");
var multi_log_1 = __webpack_require__(/*! ../monitor/multi-log */ "./src/main/js/controller/monitor/multi-log.ts");
var single_log_1 = __webpack_require__(/*! ../monitor/single-log */ "./src/main/js/controller/monitor/single-log.ts");
function createFormatter() {
    // TODO: formatter precision
    return new number_1.NumberFormatter(2);
}
function createTextMonitor(document, target, params) {
    var value = new monitor_value_1.MonitorValue(type_util_1.TypeUtil.getOrDefault(params.count, 1));
    var controller = value.totalCount === 1
        ? new single_log_1.SingleLogMonitorController(document, {
            formatter: createFormatter(),
            value: value,
            viewModel: new view_model_1.ViewModel(),
        })
        : new multi_log_1.MultiLogMonitorController(document, {
            formatter: createFormatter(),
            value: value,
            viewModel: new view_model_1.ViewModel(),
        });
    var ticker = new interval_1.IntervalTicker(document, type_util_1.TypeUtil.getOrDefault(params.interval, constants_1.Constants.monitorDefaultInterval));
    return new monitor_binding_1.MonitorBindingController(document, {
        binding: new monitor_1.MonitorBinding({
            reader: NumberConverter.fromMixed,
            target: target,
            ticker: ticker,
            value: value,
        }),
        controller: controller,
        label: params.label || target.key,
    });
}
function createGraphMonitor(document, target, params) {
    var value = new monitor_value_1.MonitorValue(type_util_1.TypeUtil.getOrDefault(params.count, 64));
    var ticker = new interval_1.IntervalTicker(document, type_util_1.TypeUtil.getOrDefault(params.interval, constants_1.Constants.monitorDefaultInterval));
    var controller = new graph_1.GraphMonitorController(document, {
        formatter: createFormatter(),
        maxValue: type_util_1.TypeUtil.getOrDefault('max' in params ? params.max : null, 100),
        minValue: type_util_1.TypeUtil.getOrDefault('min' in params ? params.min : null, 0),
        value: value,
        viewModel: new view_model_1.ViewModel(),
    });
    return new monitor_binding_1.MonitorBindingController(document, {
        binding: new monitor_1.MonitorBinding({
            reader: NumberConverter.fromMixed,
            target: target,
            ticker: ticker,
            value: value,
        }),
        controller: controller,
        label: params.label || target.key,
    });
}
function create(document, target, params) {
    var initialValue = target.read();
    if (typeof initialValue !== 'number') {
        return null;
    }
    if ('view' in params && params.view === 'graph') {
        return createGraphMonitor(document, target, params);
    }
    return createTextMonitor(document, target, params);
}
exports.create = create;


/***/ }),

/***/ "./src/main/js/controller/binding-creators/point-2d-input.ts":
/*!*******************************************************************!*\
  !*** ./src/main/js/controller/binding-creators/point-2d-input.ts ***!
  \*******************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.create = void 0;
var input_1 = __webpack_require__(/*! ../../binding/input */ "./src/main/js/binding/input.ts");
var composite_1 = __webpack_require__(/*! ../../constraint/composite */ "./src/main/js/constraint/composite.ts");
var point_2d_1 = __webpack_require__(/*! ../../constraint/point-2d */ "./src/main/js/constraint/point-2d.ts");
var range_1 = __webpack_require__(/*! ../../constraint/range */ "./src/main/js/constraint/range.ts");
var step_1 = __webpack_require__(/*! ../../constraint/step */ "./src/main/js/constraint/step.ts");
var Point2dConverter = __webpack_require__(/*! ../../converter/point-2d */ "./src/main/js/converter/point-2d.ts");
var number_1 = __webpack_require__(/*! ../../formatter/number */ "./src/main/js/formatter/number.ts");
var pane_error_1 = __webpack_require__(/*! ../../misc/pane-error */ "./src/main/js/misc/pane-error.ts");
var type_util_1 = __webpack_require__(/*! ../../misc/type-util */ "./src/main/js/misc/type-util.ts");
var input_value_1 = __webpack_require__(/*! ../../model/input-value */ "./src/main/js/model/input-value.ts");
var view_model_1 = __webpack_require__(/*! ../../model/view-model */ "./src/main/js/model/view-model.ts");
var any_point_2d_1 = __webpack_require__(/*! ../../parser/any-point-2d */ "./src/main/js/parser/any-point-2d.ts");
var string_number_1 = __webpack_require__(/*! ../../parser/string-number */ "./src/main/js/parser/string-number.ts");
var input_binding_1 = __webpack_require__(/*! ../input-binding */ "./src/main/js/controller/input-binding.ts");
var point_2d_pad_text_1 = __webpack_require__(/*! ../input/point-2d-pad-text */ "./src/main/js/controller/input/point-2d-pad-text.ts");
var UiUtil = __webpack_require__(/*! ../ui-util */ "./src/main/js/controller/ui-util.ts");
function createDimensionConstraint(params) {
    if (!params) {
        return undefined;
    }
    var constraints = [];
    if (!type_util_1.TypeUtil.isEmpty(params.step)) {
        constraints.push(new step_1.StepConstraint({
            step: params.step,
        }));
    }
    if (!type_util_1.TypeUtil.isEmpty(params.max) || !type_util_1.TypeUtil.isEmpty(params.min)) {
        constraints.push(new range_1.RangeConstraint({
            max: params.max,
            min: params.min,
        }));
    }
    return new composite_1.CompositeConstraint({
        constraints: constraints,
    });
}
function createConstraint(params) {
    return new point_2d_1.Point2dConstraint({
        x: createDimensionConstraint('x' in params ? params.x : undefined),
        y: createDimensionConstraint('y' in params ? params.y : undefined),
    });
}
function createController(document, value, invertsY) {
    var c = value.constraint;
    if (!(c instanceof point_2d_1.Point2dConstraint)) {
        throw pane_error_1.PaneError.shouldNeverHappen();
    }
    return new point_2d_pad_text_1.Point2dPadTextInputController(document, {
        invertsY: invertsY,
        parser: string_number_1.StringNumberParser,
        value: value,
        viewModel: new view_model_1.ViewModel(),
        xFormatter: new number_1.NumberFormatter(UiUtil.getSuitableDecimalDigits(c.xConstraint, value.rawValue.x)),
        yFormatter: new number_1.NumberFormatter(UiUtil.getSuitableDecimalDigits(c.yConstraint, value.rawValue.y)),
    });
}
/**
 * @hidden
 */
function create(document, target, params) {
    var initialValue = target.read();
    var p = any_point_2d_1.AnyPoint2dParser(initialValue);
    if (!p) {
        return null;
    }
    var value = new input_value_1.InputValue(p, createConstraint(params));
    var binding = new input_1.InputBinding({
        reader: Point2dConverter.fromMixed,
        target: target,
        value: value,
        writer: function (v) { return v.toObject(); },
    });
    var yParams = 'y' in params ? params.y : undefined;
    var invertsY = yParams ? !!yParams.inverted : false;
    var controller = createController(document, value, invertsY);
    return new input_binding_1.InputBindingController(document, {
        binding: binding,
        controller: controller,
        label: params.label || target.key,
    });
}
exports.create = create;


/***/ }),

/***/ "./src/main/js/controller/binding-creators/string-input.ts":
/*!*****************************************************************!*\
  !*** ./src/main/js/controller/binding-creators/string-input.ts ***!
  \*****************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.create = void 0;
var input_1 = __webpack_require__(/*! ../../binding/input */ "./src/main/js/binding/input.ts");
var composite_1 = __webpack_require__(/*! ../../constraint/composite */ "./src/main/js/constraint/composite.ts");
var list_1 = __webpack_require__(/*! ../../constraint/list */ "./src/main/js/constraint/list.ts");
var util_1 = __webpack_require__(/*! ../../constraint/util */ "./src/main/js/constraint/util.ts");
var StringConverter = __webpack_require__(/*! ../../converter/string */ "./src/main/js/converter/string.ts");
var string_1 = __webpack_require__(/*! ../../formatter/string */ "./src/main/js/formatter/string.ts");
var input_value_1 = __webpack_require__(/*! ../../model/input-value */ "./src/main/js/model/input-value.ts");
var view_model_1 = __webpack_require__(/*! ../../model/view-model */ "./src/main/js/model/view-model.ts");
var input_binding_1 = __webpack_require__(/*! ../input-binding */ "./src/main/js/controller/input-binding.ts");
var list_2 = __webpack_require__(/*! ../input/list */ "./src/main/js/controller/input/list.ts");
var text_1 = __webpack_require__(/*! ../input/text */ "./src/main/js/controller/input/text.ts");
var UiUtil = __webpack_require__(/*! ../ui-util */ "./src/main/js/controller/ui-util.ts");
function createConstraint(params) {
    var constraints = [];
    if ('options' in params && params.options !== undefined) {
        constraints.push(new list_1.ListConstraint({
            options: UiUtil.normalizeInputParamsOptions(params.options, StringConverter.fromMixed),
        }));
    }
    return new composite_1.CompositeConstraint({
        constraints: constraints,
    });
}
function createController(document, value) {
    var c = value.constraint;
    if (c && util_1.ConstraintUtil.findConstraint(c, list_1.ListConstraint)) {
        return new list_2.ListInputController(document, {
            stringifyValue: StringConverter.toString,
            value: value,
            viewModel: new view_model_1.ViewModel(),
        });
    }
    return new text_1.TextInputController(document, {
        formatter: new string_1.StringFormatter(),
        parser: StringConverter.toString,
        value: value,
        viewModel: new view_model_1.ViewModel(),
    });
}
/**
 * @hidden
 */
function create(document, target, params) {
    var initialValue = target.read();
    if (typeof initialValue !== 'string') {
        return null;
    }
    var value = new input_value_1.InputValue('', createConstraint(params));
    var binding = new input_1.InputBinding({
        reader: StringConverter.fromMixed,
        target: target,
        value: value,
        writer: function (v) { return v; },
    });
    var controller = createController(document, value);
    return new input_binding_1.InputBindingController(document, {
        binding: binding,
        controller: controller,
        label: params.label || target.key,
    });
}
exports.create = create;


/***/ }),

/***/ "./src/main/js/controller/binding-creators/string-monitor.ts":
/*!*******************************************************************!*\
  !*** ./src/main/js/controller/binding-creators/string-monitor.ts ***!
  \*******************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.create = void 0;
var monitor_1 = __webpack_require__(/*! ../../binding/monitor */ "./src/main/js/binding/monitor.ts");
var StringConverter = __webpack_require__(/*! ../../converter/string */ "./src/main/js/converter/string.ts");
var string_1 = __webpack_require__(/*! ../../formatter/string */ "./src/main/js/formatter/string.ts");
var constants_1 = __webpack_require__(/*! ../../misc/constants */ "./src/main/js/misc/constants.ts");
var interval_1 = __webpack_require__(/*! ../../misc/ticker/interval */ "./src/main/js/misc/ticker/interval.ts");
var type_util_1 = __webpack_require__(/*! ../../misc/type-util */ "./src/main/js/misc/type-util.ts");
var monitor_value_1 = __webpack_require__(/*! ../../model/monitor-value */ "./src/main/js/model/monitor-value.ts");
var view_model_1 = __webpack_require__(/*! ../../model/view-model */ "./src/main/js/model/view-model.ts");
var monitor_binding_1 = __webpack_require__(/*! ../monitor-binding */ "./src/main/js/controller/monitor-binding.ts");
var multi_log_1 = __webpack_require__(/*! ../monitor/multi-log */ "./src/main/js/controller/monitor/multi-log.ts");
var single_log_1 = __webpack_require__(/*! ../monitor/single-log */ "./src/main/js/controller/monitor/single-log.ts");
/**
 * @hidden
 */
function create(document, target, params) {
    var initialValue = target.read();
    if (typeof initialValue !== 'string') {
        return null;
    }
    var value = new monitor_value_1.MonitorValue(type_util_1.TypeUtil.getOrDefault(params.count, 1));
    var multiline = value.totalCount > 1 || ('multiline' in params && params.multiline);
    var controller = multiline
        ? new multi_log_1.MultiLogMonitorController(document, {
            formatter: new string_1.StringFormatter(),
            value: value,
            viewModel: new view_model_1.ViewModel(),
        })
        : new single_log_1.SingleLogMonitorController(document, {
            formatter: new string_1.StringFormatter(),
            value: value,
            viewModel: new view_model_1.ViewModel(),
        });
    var ticker = new interval_1.IntervalTicker(document, type_util_1.TypeUtil.getOrDefault(params.interval, constants_1.Constants.monitorDefaultInterval));
    return new monitor_binding_1.MonitorBindingController(document, {
        binding: new monitor_1.MonitorBinding({
            reader: StringConverter.fromMixed,
            target: target,
            ticker: ticker,
            value: value,
        }),
        controller: controller,
        label: params.label || target.key,
    });
}
exports.create = create;


/***/ }),

/***/ "./src/main/js/controller/button.ts":
/*!******************************************!*\
  !*** ./src/main/js/controller/button.ts ***!
  \******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ButtonController = void 0;
var button_1 = __webpack_require__(/*! ../model/button */ "./src/main/js/model/button.ts");
var button_2 = __webpack_require__(/*! ../view/button */ "./src/main/js/view/button.ts");
/**
 * @hidden
 */
var ButtonController = /** @class */ (function () {
    function ButtonController(document, config) {
        this.onButtonClick_ = this.onButtonClick_.bind(this);
        this.button = new button_1.Button(config.title);
        this.viewModel = config.viewModel;
        this.view = new button_2.ButtonView(document, {
            button: this.button,
            model: this.viewModel,
        });
        this.view.buttonElement.addEventListener('click', this.onButtonClick_);
    }
    ButtonController.prototype.onButtonClick_ = function () {
        this.button.click();
    };
    return ButtonController;
}());
exports.ButtonController = ButtonController;


/***/ }),

/***/ "./src/main/js/controller/container-util.ts":
/*!**************************************************!*\
  !*** ./src/main/js/controller/container-util.ts ***!
  \**************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.computeExpandedFolderHeight = exports.updateAllItemsPositions = void 0;
var DomUtil = __webpack_require__(/*! ../misc/dom-util */ "./src/main/js/misc/dom-util.ts");
function updateAllItemsPositions(uiContainer) {
    var visibleItems = uiContainer.items.filter(function (uc) { return !uc.viewModel.hidden; });
    var firstVisibleItem = visibleItems[0];
    var lastVisibleItem = visibleItems[visibleItems.length - 1];
    uiContainer.items.forEach(function (uc) {
        var ps = [];
        if (uc === firstVisibleItem) {
            ps.push('first');
        }
        if (uc === lastVisibleItem) {
            ps.push('last');
        }
        uc.viewModel.positions = ps;
    });
}
exports.updateAllItemsPositions = updateAllItemsPositions;
/**
 * @hidden
 */
function computeExpandedFolderHeight(folder, containerElement) {
    var height = 0;
    DomUtil.disableTransitionTemporarily(containerElement, function () {
        // Expand folder temporarily
        folder.expandedHeight = null;
        folder.temporaryExpanded = true;
        DomUtil.forceReflow(containerElement);
        // Compute height
        height = containerElement.clientHeight;
        // Restore expanded
        folder.temporaryExpanded = null;
        DomUtil.forceReflow(containerElement);
    });
    return height;
}
exports.computeExpandedFolderHeight = computeExpandedFolderHeight;


/***/ }),

/***/ "./src/main/js/controller/folder.ts":
/*!******************************************!*\
  !*** ./src/main/js/controller/folder.ts ***!
  \******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.FolderController = void 0;
var DomUtil = __webpack_require__(/*! ../misc/dom-util */ "./src/main/js/misc/dom-util.ts");
var type_util_1 = __webpack_require__(/*! ../misc/type-util */ "./src/main/js/misc/type-util.ts");
var folder_1 = __webpack_require__(/*! ../model/folder */ "./src/main/js/model/folder.ts");
var ui_container_1 = __webpack_require__(/*! ../model/ui-container */ "./src/main/js/model/ui-container.ts");
var folder_2 = __webpack_require__(/*! ../view/folder */ "./src/main/js/view/folder.ts");
var ContainerUtil = __webpack_require__(/*! ./container-util */ "./src/main/js/controller/container-util.ts");
/**
 * @hidden
 */
var FolderController = /** @class */ (function () {
    function FolderController(document, config) {
        this.onContainerTransitionEnd_ = this.onContainerTransitionEnd_.bind(this);
        this.onFolderBeforeChange_ = this.onFolderBeforeChange_.bind(this);
        this.onTitleClick_ = this.onTitleClick_.bind(this);
        this.onUiContainerAdd_ = this.onUiContainerAdd_.bind(this);
        this.onUiContainerItemLayout_ = this.onUiContainerItemLayout_.bind(this);
        this.onUiContainerRemove_ = this.onUiContainerRemove_.bind(this);
        this.viewModel = config.viewModel;
        this.folder = new folder_1.Folder(config.title, type_util_1.TypeUtil.getOrDefault(config.expanded, true));
        this.folder.emitter.on('beforechange', this.onFolderBeforeChange_);
        this.ucList_ = new ui_container_1.UiContainer();
        this.ucList_.emitter.on('add', this.onUiContainerAdd_);
        this.ucList_.emitter.on('itemlayout', this.onUiContainerItemLayout_);
        this.ucList_.emitter.on('remove', this.onUiContainerRemove_);
        this.doc_ = document;
        this.view = new folder_2.FolderView(this.doc_, {
            folder: this.folder,
            model: this.viewModel,
        });
        this.view.titleElement.addEventListener('click', this.onTitleClick_);
        this.view.containerElement.addEventListener('transitionend', this.onContainerTransitionEnd_);
    }
    Object.defineProperty(FolderController.prototype, "document", {
        get: function () {
            return this.doc_;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FolderController.prototype, "uiContainer", {
        get: function () {
            return this.ucList_;
        },
        enumerable: false,
        configurable: true
    });
    FolderController.prototype.onFolderBeforeChange_ = function (ev) {
        if (ev.propertyName !== 'expanded') {
            return;
        }
        if (type_util_1.TypeUtil.isEmpty(this.folder.expandedHeight)) {
            this.folder.expandedHeight = ContainerUtil.computeExpandedFolderHeight(this.folder, this.view.containerElement);
        }
        this.folder.shouldFixHeight = true;
        DomUtil.forceReflow(this.view.containerElement);
    };
    FolderController.prototype.onTitleClick_ = function () {
        this.folder.expanded = !this.folder.expanded;
    };
    FolderController.prototype.applyUiContainerChange_ = function () {
        ContainerUtil.updateAllItemsPositions(this.uiContainer);
    };
    FolderController.prototype.onUiContainerAdd_ = function (ev) {
        DomUtil.insertElementAt(this.view.containerElement, ev.uiController.view.element, ev.index);
        this.applyUiContainerChange_();
    };
    FolderController.prototype.onUiContainerRemove_ = function (_) {
        this.applyUiContainerChange_();
    };
    FolderController.prototype.onUiContainerItemLayout_ = function (_) {
        this.applyUiContainerChange_();
    };
    FolderController.prototype.onContainerTransitionEnd_ = function (ev) {
        if (ev.propertyName !== 'height') {
            return;
        }
        this.folder.shouldFixHeight = false;
        this.folder.expandedHeight = null;
    };
    return FolderController;
}());
exports.FolderController = FolderController;


/***/ }),

/***/ "./src/main/js/controller/input-binding.ts":
/*!*************************************************!*\
  !*** ./src/main/js/controller/input-binding.ts ***!
  \*************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.InputBindingController = void 0;
var labeled_1 = __webpack_require__(/*! ../view/labeled */ "./src/main/js/view/labeled.ts");
/**
 * @hidden
 */
var InputBindingController = /** @class */ (function () {
    function InputBindingController(document, config) {
        this.binding = config.binding;
        this.controller = config.controller;
        this.view = new labeled_1.LabeledView(document, {
            model: this.controller.viewModel,
            label: config.label,
            view: this.controller.view,
        });
    }
    Object.defineProperty(InputBindingController.prototype, "viewModel", {
        get: function () {
            return this.controller.viewModel;
        },
        enumerable: false,
        configurable: true
    });
    return InputBindingController;
}());
exports.InputBindingController = InputBindingController;


/***/ }),

/***/ "./src/main/js/controller/input/a-palette.ts":
/*!***************************************************!*\
  !*** ./src/main/js/controller/input/a-palette.ts ***!
  \***************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.APaletteInputController = void 0;
var pointer_handler_1 = __webpack_require__(/*! ../../misc/pointer-handler */ "./src/main/js/misc/pointer-handler.ts");
var color_1 = __webpack_require__(/*! ../../model/color */ "./src/main/js/model/color.ts");
var a_palette_1 = __webpack_require__(/*! ../../view/input/a-palette */ "./src/main/js/view/input/a-palette.ts");
var UiUtil = __webpack_require__(/*! ../ui-util */ "./src/main/js/controller/ui-util.ts");
/**
 * @hidden
 */
var APaletteInputController = /** @class */ (function () {
    function APaletteInputController(document, config) {
        this.onKeyDown_ = this.onKeyDown_.bind(this);
        this.onPointerDown_ = this.onPointerDown_.bind(this);
        this.onPointerMove_ = this.onPointerMove_.bind(this);
        this.onPointerUp_ = this.onPointerUp_.bind(this);
        this.value = config.value;
        this.viewModel = config.viewModel;
        this.view = new a_palette_1.APaletteInputView(document, {
            model: this.viewModel,
            value: this.value,
        });
        this.ptHandler_ = new pointer_handler_1.PointerHandler(document, this.view.element);
        this.ptHandler_.emitter.on('down', this.onPointerDown_);
        this.ptHandler_.emitter.on('move', this.onPointerMove_);
        this.ptHandler_.emitter.on('up', this.onPointerUp_);
        this.view.element.addEventListener('keydown', this.onKeyDown_);
    }
    APaletteInputController.prototype.handlePointerEvent_ = function (d) {
        var alpha = d.px;
        var c = this.value.rawValue;
        var _a = c.getComponents('hsv'), h = _a[0], s = _a[1], v = _a[2];
        this.value.rawValue = new color_1.Color([h, s, v, alpha], 'hsv');
        this.view.update();
    };
    APaletteInputController.prototype.onPointerDown_ = function (ev) {
        this.handlePointerEvent_(ev.data);
    };
    APaletteInputController.prototype.onPointerMove_ = function (ev) {
        this.handlePointerEvent_(ev.data);
    };
    APaletteInputController.prototype.onPointerUp_ = function (ev) {
        this.handlePointerEvent_(ev.data);
    };
    APaletteInputController.prototype.onKeyDown_ = function (ev) {
        var step = UiUtil.getStepForKey(UiUtil.getBaseStepForColor(true), UiUtil.getHorizontalStepKeys(ev));
        var c = this.value.rawValue;
        var _a = c.getComponents('hsv'), h = _a[0], s = _a[1], v = _a[2], a = _a[3];
        this.value.rawValue = new color_1.Color([h, s, v, a + step], 'hsv');
    };
    return APaletteInputController;
}());
exports.APaletteInputController = APaletteInputController;


/***/ }),

/***/ "./src/main/js/controller/input/checkbox.ts":
/*!**************************************************!*\
  !*** ./src/main/js/controller/input/checkbox.ts ***!
  \**************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckboxInputController = void 0;
var type_util_1 = __webpack_require__(/*! ../../misc/type-util */ "./src/main/js/misc/type-util.ts");
var checkbox_1 = __webpack_require__(/*! ../../view/input/checkbox */ "./src/main/js/view/input/checkbox.ts");
/**
 * @hidden
 */
var CheckboxInputController = /** @class */ (function () {
    function CheckboxInputController(document, config) {
        this.onInputChange_ = this.onInputChange_.bind(this);
        this.value = config.value;
        this.viewModel = config.viewModel;
        this.view = new checkbox_1.CheckboxInputView(document, {
            model: this.viewModel,
            value: this.value,
        });
        this.view.inputElement.addEventListener('change', this.onInputChange_);
    }
    CheckboxInputController.prototype.onInputChange_ = function (e) {
        var inputElem = type_util_1.TypeUtil.forceCast(e.currentTarget);
        this.value.rawValue = inputElem.checked;
        this.view.update();
    };
    return CheckboxInputController;
}());
exports.CheckboxInputController = CheckboxInputController;


/***/ }),

/***/ "./src/main/js/controller/input/color-component-texts.ts":
/*!***************************************************************!*\
  !*** ./src/main/js/controller/input/color-component-texts.ts ***!
  \***************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ColorComponentTextsInputController = void 0;
var type_util_1 = __webpack_require__(/*! ../../misc/type-util */ "./src/main/js/misc/type-util.ts");
var color_1 = __webpack_require__(/*! ../../model/color */ "./src/main/js/model/color.ts");
var color_component_texts_1 = __webpack_require__(/*! ../../view/input/color-component-texts */ "./src/main/js/view/input/color-component-texts.ts");
var UiUtil = __webpack_require__(/*! ../ui-util */ "./src/main/js/controller/ui-util.ts");
/**
 * @hidden
 */
var ColorComponentTextsInputController = /** @class */ (function () {
    function ColorComponentTextsInputController(document, config) {
        var _this = this;
        this.onModeSelectChange_ = this.onModeSelectChange_.bind(this);
        this.onInputChange_ = this.onInputChange_.bind(this);
        this.onInputKeyDown_ = this.onInputKeyDown_.bind(this);
        this.parser_ = config.parser;
        this.pickedColor = config.pickedColor;
        this.viewModel = config.viewModel;
        this.view = new color_component_texts_1.ColorComponentTextsInputView(document, {
            model: this.viewModel,
            pickedColor: this.pickedColor,
        });
        this.view.inputElements.forEach(function (inputElem) {
            inputElem.addEventListener('change', _this.onInputChange_);
            inputElem.addEventListener('keydown', _this.onInputKeyDown_);
        });
        this.view.modeSelectElement.addEventListener('change', this.onModeSelectChange_);
    }
    Object.defineProperty(ColorComponentTextsInputController.prototype, "value", {
        get: function () {
            return this.pickedColor.value;
        },
        enumerable: false,
        configurable: true
    });
    ColorComponentTextsInputController.prototype.findIndexOfInputElem_ = function (inputElem) {
        var inputElems = this.view.inputElements;
        for (var i = 0; i < inputElems.length; i++) {
            if (inputElems[i] === inputElem) {
                return i;
            }
        }
        return null;
    };
    ColorComponentTextsInputController.prototype.updateComponent_ = function (index, newValue) {
        var mode = this.pickedColor.mode;
        var comps = this.value.rawValue.getComponents(mode);
        var newComps = comps.map(function (comp, i) {
            return i === index ? newValue : comp;
        });
        this.value.rawValue = new color_1.Color(newComps, mode);
        this.view.update();
    };
    ColorComponentTextsInputController.prototype.onInputChange_ = function (e) {
        var inputElem = type_util_1.TypeUtil.forceCast(e.currentTarget);
        var parsedValue = this.parser_(inputElem.value);
        if (type_util_1.TypeUtil.isEmpty(parsedValue)) {
            return;
        }
        var compIndex = this.findIndexOfInputElem_(inputElem);
        if (type_util_1.TypeUtil.isEmpty(compIndex)) {
            return;
        }
        this.updateComponent_(compIndex, parsedValue);
    };
    ColorComponentTextsInputController.prototype.onInputKeyDown_ = function (e) {
        var compIndex = this.findIndexOfInputElem_(e.currentTarget);
        var step = UiUtil.getStepForKey(UiUtil.getBaseStepForColor(compIndex === 3), UiUtil.getVerticalStepKeys(e));
        if (step === 0) {
            return;
        }
        var inputElem = type_util_1.TypeUtil.forceCast(e.currentTarget);
        var parsedValue = this.parser_(inputElem.value);
        if (type_util_1.TypeUtil.isEmpty(parsedValue)) {
            return;
        }
        if (type_util_1.TypeUtil.isEmpty(compIndex)) {
            return;
        }
        this.updateComponent_(compIndex, parsedValue + step);
    };
    ColorComponentTextsInputController.prototype.onModeSelectChange_ = function (ev) {
        var selectElem = ev.currentTarget;
        this.pickedColor.mode = selectElem.value;
    };
    return ColorComponentTextsInputController;
}());
exports.ColorComponentTextsInputController = ColorComponentTextsInputController;


/***/ }),

/***/ "./src/main/js/controller/input/color-picker.ts":
/*!******************************************************!*\
  !*** ./src/main/js/controller/input/color-picker.ts ***!
  \******************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ColorPickerInputController = void 0;
var number_1 = __webpack_require__(/*! ../../formatter/number */ "./src/main/js/formatter/number.ts");
var type_util_1 = __webpack_require__(/*! ../../misc/type-util */ "./src/main/js/misc/type-util.ts");
var color_1 = __webpack_require__(/*! ../../model/color */ "./src/main/js/model/color.ts");
var foldable_1 = __webpack_require__(/*! ../../model/foldable */ "./src/main/js/model/foldable.ts");
var input_value_1 = __webpack_require__(/*! ../../model/input-value */ "./src/main/js/model/input-value.ts");
var ModelSync = __webpack_require__(/*! ../../model/model-sync */ "./src/main/js/model/model-sync.ts");
var string_number_1 = __webpack_require__(/*! ../../parser/string-number */ "./src/main/js/parser/string-number.ts");
var color_picker_1 = __webpack_require__(/*! ../../view/input/color-picker */ "./src/main/js/view/input/color-picker.ts");
var a_palette_1 = __webpack_require__(/*! ./a-palette */ "./src/main/js/controller/input/a-palette.ts");
var color_component_texts_1 = __webpack_require__(/*! ./color-component-texts */ "./src/main/js/controller/input/color-component-texts.ts");
var h_palette_1 = __webpack_require__(/*! ./h-palette */ "./src/main/js/controller/input/h-palette.ts");
var number_text_1 = __webpack_require__(/*! ./number-text */ "./src/main/js/controller/input/number-text.ts");
var sv_palette_1 = __webpack_require__(/*! ./sv-palette */ "./src/main/js/controller/input/sv-palette.ts");
/**
 * @hidden
 */
var ColorPickerInputController = /** @class */ (function () {
    function ColorPickerInputController(document, config) {
        var _this = this;
        this.onFocusableElementBlur_ = this.onFocusableElementBlur_.bind(this);
        this.onKeyDown_ = this.onKeyDown_.bind(this);
        this.pickedColor = config.pickedColor;
        this.foldable = new foldable_1.Foldable();
        this.viewModel = config.viewModel;
        this.hPaletteIc_ = new h_palette_1.HPaletteInputController(document, {
            value: this.pickedColor.value,
            viewModel: this.viewModel,
        });
        this.svPaletteIc_ = new sv_palette_1.SvPaletteInputController(document, {
            value: this.pickedColor.value,
            viewModel: this.viewModel,
        });
        this.alphaIcs_ = config.supportsAlpha
            ? {
                palette: new a_palette_1.APaletteInputController(document, {
                    value: this.pickedColor.value,
                    viewModel: this.viewModel,
                }),
                text: new number_text_1.NumberTextInputController(document, {
                    formatter: new number_1.NumberFormatter(2),
                    parser: string_number_1.StringNumberParser,
                    step: 0.1,
                    value: new input_value_1.InputValue(0),
                    viewModel: this.viewModel,
                }),
            }
            : null;
        if (this.alphaIcs_) {
            ModelSync.connect({
                primary: {
                    apply: function (from, to) {
                        to.rawValue = from.value.rawValue.getComponents()[3];
                    },
                    emitter: function (m) { return m.value.emitter; },
                    value: this.pickedColor,
                },
                secondary: {
                    apply: function (from, to) {
                        var comps = to.value.rawValue.getComponents();
                        comps[3] = from.rawValue;
                        to.value.rawValue = new color_1.Color(comps, to.value.rawValue.mode);
                    },
                    emitter: function (m) { return m.emitter; },
                    value: this.alphaIcs_.text.value,
                },
            });
        }
        this.compTextsIc_ = new color_component_texts_1.ColorComponentTextsInputController(document, {
            parser: string_number_1.StringNumberParser,
            pickedColor: this.pickedColor,
            viewModel: this.viewModel,
        });
        this.view = new color_picker_1.ColorPickerInputView(document, {
            alphaInputViews: this.alphaIcs_
                ? {
                    palette: this.alphaIcs_.palette.view,
                    text: this.alphaIcs_.text.view,
                }
                : null,
            componentTextsView: this.compTextsIc_.view,
            foldable: this.foldable,
            hPaletteInputView: this.hPaletteIc_.view,
            model: this.viewModel,
            pickedColor: this.pickedColor,
            supportsAlpha: config.supportsAlpha,
            svPaletteInputView: this.svPaletteIc_.view,
        });
        this.view.element.addEventListener('keydown', this.onKeyDown_);
        this.view.allFocusableElements.forEach(function (elem) {
            elem.addEventListener('blur', _this.onFocusableElementBlur_);
        });
    }
    Object.defineProperty(ColorPickerInputController.prototype, "value", {
        get: function () {
            return this.pickedColor.value;
        },
        enumerable: false,
        configurable: true
    });
    ColorPickerInputController.prototype.onFocusableElementBlur_ = function (e) {
        var elem = this.view.element;
        var nextTarget = type_util_1.TypeUtil.forceCast(e.relatedTarget);
        if (!nextTarget || !elem.contains(nextTarget)) {
            this.foldable.expanded = false;
        }
    };
    ColorPickerInputController.prototype.onKeyDown_ = function (ev) {
        if (ev.keyCode === 27) {
            this.foldable.expanded = false;
        }
    };
    return ColorPickerInputController;
}());
exports.ColorPickerInputController = ColorPickerInputController;


/***/ }),

/***/ "./src/main/js/controller/input/color-swatch-text.ts":
/*!***********************************************************!*\
  !*** ./src/main/js/controller/input/color-swatch-text.ts ***!
  \***********************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ColorSwatchTextInputController = void 0;
var color_swatch_text_1 = __webpack_require__(/*! ../../view/input/color-swatch-text */ "./src/main/js/view/input/color-swatch-text.ts");
var color_swatch_1 = __webpack_require__(/*! ../input/color-swatch */ "./src/main/js/controller/input/color-swatch.ts");
var text_1 = __webpack_require__(/*! ./text */ "./src/main/js/controller/input/text.ts");
/**
 * @hidden
 */
var ColorSwatchTextInputController = /** @class */ (function () {
    function ColorSwatchTextInputController(document, config) {
        this.value = config.value;
        this.viewModel = config.viewModel;
        this.swatchIc_ = new color_swatch_1.ColorSwatchInputController(document, {
            supportsAlpha: config.supportsAlpha,
            value: this.value,
            viewModel: this.viewModel,
        });
        this.textIc_ = new text_1.TextInputController(document, {
            formatter: config.formatter,
            parser: config.parser,
            value: this.value,
            viewModel: this.viewModel,
        });
        this.view = new color_swatch_text_1.ColorSwatchTextInputView(document, {
            swatchInputView: this.swatchIc_.view,
            textInputView: this.textIc_.view,
            model: this.viewModel,
        });
    }
    return ColorSwatchTextInputController;
}());
exports.ColorSwatchTextInputController = ColorSwatchTextInputController;


/***/ }),

/***/ "./src/main/js/controller/input/color-swatch.ts":
/*!******************************************************!*\
  !*** ./src/main/js/controller/input/color-swatch.ts ***!
  \******************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ColorSwatchInputController = void 0;
var type_util_1 = __webpack_require__(/*! ../../misc/type-util */ "./src/main/js/misc/type-util.ts");
var picked_color_1 = __webpack_require__(/*! ../../model/picked-color */ "./src/main/js/model/picked-color.ts");
var color_swatch_1 = __webpack_require__(/*! ../../view/input/color-swatch */ "./src/main/js/view/input/color-swatch.ts");
var color_picker_1 = __webpack_require__(/*! ./color-picker */ "./src/main/js/controller/input/color-picker.ts");
/**
 * @hidden
 */
var ColorSwatchInputController = /** @class */ (function () {
    function ColorSwatchInputController(document, config) {
        this.onButtonBlur_ = this.onButtonBlur_.bind(this);
        this.onButtonClick_ = this.onButtonClick_.bind(this);
        this.value = config.value;
        this.viewModel = config.viewModel;
        this.pickerIc_ = new color_picker_1.ColorPickerInputController(document, {
            pickedColor: new picked_color_1.PickedColor(this.value),
            supportsAlpha: config.supportsAlpha,
            viewModel: this.viewModel,
        });
        this.view = new color_swatch_1.ColorSwatchInputView(document, {
            model: this.viewModel,
            pickerInputView: this.pickerIc_.view,
            value: this.value,
        });
        this.view.buttonElement.addEventListener('blur', this.onButtonBlur_);
        this.view.buttonElement.addEventListener('click', this.onButtonClick_);
    }
    ColorSwatchInputController.prototype.onButtonBlur_ = function (e) {
        var elem = this.view.element;
        var nextTarget = type_util_1.TypeUtil.forceCast(e.relatedTarget);
        if (!nextTarget || !elem.contains(nextTarget)) {
            this.pickerIc_.foldable.expanded = false;
        }
    };
    ColorSwatchInputController.prototype.onButtonClick_ = function () {
        this.pickerIc_.foldable.expanded = !this.pickerIc_.foldable.expanded;
        if (this.pickerIc_.foldable.expanded) {
            this.pickerIc_.view.allFocusableElements[0].focus();
        }
    };
    return ColorSwatchInputController;
}());
exports.ColorSwatchInputController = ColorSwatchInputController;


/***/ }),

/***/ "./src/main/js/controller/input/h-palette.ts":
/*!***************************************************!*\
  !*** ./src/main/js/controller/input/h-palette.ts ***!
  \***************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.HPaletteInputController = void 0;
var number_util_1 = __webpack_require__(/*! ../../misc/number-util */ "./src/main/js/misc/number-util.ts");
var pointer_handler_1 = __webpack_require__(/*! ../../misc/pointer-handler */ "./src/main/js/misc/pointer-handler.ts");
var color_1 = __webpack_require__(/*! ../../model/color */ "./src/main/js/model/color.ts");
var h_palette_1 = __webpack_require__(/*! ../../view/input/h-palette */ "./src/main/js/view/input/h-palette.ts");
var UiUtil = __webpack_require__(/*! ../ui-util */ "./src/main/js/controller/ui-util.ts");
/**
 * @hidden
 */
var HPaletteInputController = /** @class */ (function () {
    function HPaletteInputController(document, config) {
        this.onKeyDown_ = this.onKeyDown_.bind(this);
        this.onPointerDown_ = this.onPointerDown_.bind(this);
        this.onPointerMove_ = this.onPointerMove_.bind(this);
        this.onPointerUp_ = this.onPointerUp_.bind(this);
        this.value = config.value;
        this.viewModel = config.viewModel;
        this.view = new h_palette_1.HPaletteInputView(document, {
            model: this.viewModel,
            value: this.value,
        });
        this.ptHandler_ = new pointer_handler_1.PointerHandler(document, this.view.element);
        this.ptHandler_.emitter.on('down', this.onPointerDown_);
        this.ptHandler_.emitter.on('move', this.onPointerMove_);
        this.ptHandler_.emitter.on('up', this.onPointerUp_);
        this.view.element.addEventListener('keydown', this.onKeyDown_);
    }
    HPaletteInputController.prototype.handlePointerEvent_ = function (d) {
        var hue = number_util_1.NumberUtil.map(d.px, 0, 1, 0, 360);
        var c = this.value.rawValue;
        var _a = c.getComponents('hsv'), s = _a[1], v = _a[2], a = _a[3];
        this.value.rawValue = new color_1.Color([hue, s, v, a], 'hsv');
        this.view.update();
    };
    HPaletteInputController.prototype.onPointerDown_ = function (ev) {
        this.handlePointerEvent_(ev.data);
    };
    HPaletteInputController.prototype.onPointerMove_ = function (ev) {
        this.handlePointerEvent_(ev.data);
    };
    HPaletteInputController.prototype.onPointerUp_ = function (ev) {
        this.handlePointerEvent_(ev.data);
    };
    HPaletteInputController.prototype.onKeyDown_ = function (ev) {
        var step = UiUtil.getStepForKey(UiUtil.getBaseStepForColor(false), UiUtil.getHorizontalStepKeys(ev));
        var c = this.value.rawValue;
        var _a = c.getComponents('hsv'), h = _a[0], s = _a[1], v = _a[2], a = _a[3];
        this.value.rawValue = new color_1.Color([h + step, s, v, a], 'hsv');
    };
    return HPaletteInputController;
}());
exports.HPaletteInputController = HPaletteInputController;


/***/ }),

/***/ "./src/main/js/controller/input/list.ts":
/*!**********************************************!*\
  !*** ./src/main/js/controller/input/list.ts ***!
  \**********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ListInputController = void 0;
var list_1 = __webpack_require__(/*! ../../constraint/list */ "./src/main/js/constraint/list.ts");
var util_1 = __webpack_require__(/*! ../../constraint/util */ "./src/main/js/constraint/util.ts");
var type_util_1 = __webpack_require__(/*! ../../misc/type-util */ "./src/main/js/misc/type-util.ts");
var list_2 = __webpack_require__(/*! ../../view/input/list */ "./src/main/js/view/input/list.ts");
function findListItems(value) {
    var c = value.constraint
        ? util_1.ConstraintUtil.findConstraint(value.constraint, list_1.ListConstraint)
        : null;
    if (!c) {
        return null;
    }
    return c.options;
}
/**
 * @hidden
 */
var ListInputController = /** @class */ (function () {
    function ListInputController(document, config) {
        this.onSelectChange_ = this.onSelectChange_.bind(this);
        this.value_ = config.value;
        this.listItems_ = findListItems(this.value_) || [];
        this.viewModel = config.viewModel;
        this.view_ = new list_2.ListInputView(document, {
            model: this.viewModel,
            options: this.listItems_,
            stringifyValue: config.stringifyValue,
            value: this.value_,
        });
        this.view_.selectElement.addEventListener('change', this.onSelectChange_);
    }
    Object.defineProperty(ListInputController.prototype, "value", {
        get: function () {
            return this.value_;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ListInputController.prototype, "view", {
        get: function () {
            return this.view_;
        },
        enumerable: false,
        configurable: true
    });
    ListInputController.prototype.onSelectChange_ = function (e) {
        var selectElem = type_util_1.TypeUtil.forceCast(e.currentTarget);
        var optElem = selectElem.selectedOptions.item(0);
        if (!optElem) {
            return;
        }
        var itemIndex = Number(optElem.dataset.index);
        this.value_.rawValue = this.listItems_[itemIndex].value;
        this.view_.update();
    };
    return ListInputController;
}());
exports.ListInputController = ListInputController;


/***/ }),

/***/ "./src/main/js/controller/input/number-text.ts":
/*!*****************************************************!*\
  !*** ./src/main/js/controller/input/number-text.ts ***!
  \*****************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NumberTextInputController = void 0;
var type_util_1 = __webpack_require__(/*! ../../misc/type-util */ "./src/main/js/misc/type-util.ts");
var UiUtil = __webpack_require__(/*! ../ui-util */ "./src/main/js/controller/ui-util.ts");
var text_1 = __webpack_require__(/*! ./text */ "./src/main/js/controller/input/text.ts");
/**
 * @hidden
 */
var NumberTextInputController = /** @class */ (function (_super) {
    __extends(NumberTextInputController, _super);
    function NumberTextInputController(document, config) {
        var _this = _super.call(this, document, config) || this;
        _this.onInputKeyDown_ = _this.onInputKeyDown_.bind(_this);
        _this.step_ = type_util_1.TypeUtil.getOrDefault(config.step, UiUtil.getStepForTextInput(_this.value.constraint));
        _this.view.inputElement.addEventListener('keydown', _this.onInputKeyDown_);
        return _this;
    }
    NumberTextInputController.prototype.onInputKeyDown_ = function (e) {
        var step = UiUtil.getStepForKey(this.step_, UiUtil.getVerticalStepKeys(e));
        if (step !== 0) {
            this.value.rawValue += step;
            this.view.update();
        }
    };
    return NumberTextInputController;
}(text_1.TextInputController));
exports.NumberTextInputController = NumberTextInputController;


/***/ }),

/***/ "./src/main/js/controller/input/point-2d-pad-text.ts":
/*!***********************************************************!*\
  !*** ./src/main/js/controller/input/point-2d-pad-text.ts ***!
  \***********************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Point2dPadTextInputController = void 0;
var type_util_1 = __webpack_require__(/*! ../../misc/type-util */ "./src/main/js/misc/type-util.ts");
var point_2d_pad_text_1 = __webpack_require__(/*! ../../view/input/point-2d-pad-text */ "./src/main/js/view/input/point-2d-pad-text.ts");
var point_2d_pad_1 = __webpack_require__(/*! ./point-2d-pad */ "./src/main/js/controller/input/point-2d-pad.ts");
var point_2d_text_1 = __webpack_require__(/*! ./point-2d-text */ "./src/main/js/controller/input/point-2d-text.ts");
/**
 * @hidden
 */
var Point2dPadTextInputController = /** @class */ (function () {
    function Point2dPadTextInputController(document, config) {
        this.onPadButtonBlur_ = this.onPadButtonBlur_.bind(this);
        this.onPadButtonClick_ = this.onPadButtonClick_.bind(this);
        this.value = config.value;
        this.viewModel = config.viewModel;
        this.padIc_ = new point_2d_pad_1.Point2dPadInputController(document, {
            invertsY: config.invertsY,
            value: this.value,
            viewModel: this.viewModel,
        });
        this.textIc_ = new point_2d_text_1.Point2dTextInputController(document, {
            parser: config.parser,
            value: this.value,
            viewModel: this.viewModel,
            xFormatter: config.xFormatter,
            yFormatter: config.yFormatter,
        });
        this.view = new point_2d_pad_text_1.Point2dPadTextInputView(document, {
            model: this.viewModel,
            padInputView: this.padIc_.view,
            textInputView: this.textIc_.view,
        });
        this.view.padButtonElement.addEventListener('blur', this.onPadButtonBlur_);
        this.view.padButtonElement.addEventListener('click', this.onPadButtonClick_);
    }
    Point2dPadTextInputController.prototype.onPadButtonBlur_ = function (e) {
        var elem = this.view.element;
        var nextTarget = type_util_1.TypeUtil.forceCast(e.relatedTarget);
        if (!nextTarget || !elem.contains(nextTarget)) {
            this.padIc_.foldable.expanded = false;
        }
    };
    Point2dPadTextInputController.prototype.onPadButtonClick_ = function () {
        this.padIc_.foldable.expanded = !this.padIc_.foldable.expanded;
        if (this.padIc_.foldable.expanded) {
            this.padIc_.view.allFocusableElements[0].focus();
        }
    };
    return Point2dPadTextInputController;
}());
exports.Point2dPadTextInputController = Point2dPadTextInputController;


/***/ }),

/***/ "./src/main/js/controller/input/point-2d-pad.ts":
/*!******************************************************!*\
  !*** ./src/main/js/controller/input/point-2d-pad.ts ***!
  \******************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Point2dPadInputController = void 0;
var point_2d_1 = __webpack_require__(/*! ../../constraint/point-2d */ "./src/main/js/constraint/point-2d.ts");
var number_util_1 = __webpack_require__(/*! ../../misc/number-util */ "./src/main/js/misc/number-util.ts");
var pointer_handler_1 = __webpack_require__(/*! ../../misc/pointer-handler */ "./src/main/js/misc/pointer-handler.ts");
var type_util_1 = __webpack_require__(/*! ../../misc/type-util */ "./src/main/js/misc/type-util.ts");
var foldable_1 = __webpack_require__(/*! ../../model/foldable */ "./src/main/js/model/foldable.ts");
var point_2d_2 = __webpack_require__(/*! ../../model/point-2d */ "./src/main/js/model/point-2d.ts");
var point_2d_pad_1 = __webpack_require__(/*! ../../view/input/point-2d-pad */ "./src/main/js/view/input/point-2d-pad.ts");
var UiUtil = __webpack_require__(/*! ../ui-util */ "./src/main/js/controller/ui-util.ts");
/**
 * @hidden
 */
var Point2dPadInputController = /** @class */ (function () {
    function Point2dPadInputController(document, config) {
        var _this = this;
        this.onFocusableElementBlur_ = this.onFocusableElementBlur_.bind(this);
        this.onKeyDown_ = this.onKeyDown_.bind(this);
        this.onPadKeyDown_ = this.onPadKeyDown_.bind(this);
        this.onPointerDown_ = this.onPointerDown_.bind(this);
        this.onPointerMove_ = this.onPointerMove_.bind(this);
        this.onPointerUp_ = this.onPointerUp_.bind(this);
        this.value = config.value;
        this.foldable = new foldable_1.Foldable();
        this.maxValue_ = UiUtil.getSuitableMaxValueForPoint2dPad(this.value.constraint, this.value.rawValue);
        this.invertsY_ = config.invertsY;
        var c = this.value.constraint;
        this.xStep_ = UiUtil.getStepForTextInput(c instanceof point_2d_1.Point2dConstraint ? c.xConstraint : undefined);
        this.yStep_ = UiUtil.getStepForTextInput(c instanceof point_2d_1.Point2dConstraint ? c.yConstraint : undefined);
        this.viewModel = config.viewModel;
        this.view = new point_2d_pad_1.Point2dPadInputView(document, {
            foldable: this.foldable,
            invertsY: this.invertsY_,
            maxValue: this.maxValue_,
            model: this.viewModel,
            value: this.value,
        });
        this.ptHandler_ = new pointer_handler_1.PointerHandler(document, this.view.padElement);
        this.ptHandler_.emitter.on('down', this.onPointerDown_);
        this.ptHandler_.emitter.on('move', this.onPointerMove_);
        this.ptHandler_.emitter.on('up', this.onPointerUp_);
        this.view.padElement.addEventListener('keydown', this.onPadKeyDown_);
        this.view.element.addEventListener('keydown', this.onKeyDown_);
        this.view.allFocusableElements.forEach(function (elem) {
            elem.addEventListener('blur', _this.onFocusableElementBlur_);
        });
    }
    Point2dPadInputController.prototype.handlePointerEvent_ = function (d) {
        var max = this.maxValue_;
        var px = number_util_1.NumberUtil.map(d.px, 0, 1, -max, +max);
        var py = number_util_1.NumberUtil.map(this.invertsY_ ? 1 - d.py : d.py, 0, 1, -max, +max);
        this.value.rawValue = new point_2d_2.Point2d(px, py);
        this.view.update();
    };
    Point2dPadInputController.prototype.onPointerDown_ = function (ev) {
        this.handlePointerEvent_(ev.data);
    };
    Point2dPadInputController.prototype.onPointerMove_ = function (ev) {
        this.handlePointerEvent_(ev.data);
    };
    Point2dPadInputController.prototype.onPointerUp_ = function (ev) {
        this.handlePointerEvent_(ev.data);
    };
    Point2dPadInputController.prototype.onPadKeyDown_ = function (ev) {
        if (UiUtil.isArrowKey(ev.keyCode)) {
            ev.preventDefault();
        }
        this.value.rawValue = new point_2d_2.Point2d(this.value.rawValue.x +
            UiUtil.getStepForKey(this.xStep_, UiUtil.getHorizontalStepKeys(ev)), this.value.rawValue.y +
            UiUtil.getStepForKey(this.yStep_, UiUtil.getVerticalStepKeys(ev)) *
                (this.invertsY_ ? 1 : -1));
    };
    Point2dPadInputController.prototype.onFocusableElementBlur_ = function (e) {
        var elem = this.view.element;
        var nextTarget = type_util_1.TypeUtil.forceCast(e.relatedTarget);
        if (!nextTarget || !elem.contains(nextTarget)) {
            this.foldable.expanded = false;
        }
    };
    Point2dPadInputController.prototype.onKeyDown_ = function (ev) {
        if (ev.keyCode === 27) {
            this.foldable.expanded = false;
        }
    };
    return Point2dPadInputController;
}());
exports.Point2dPadInputController = Point2dPadInputController;


/***/ }),

/***/ "./src/main/js/controller/input/point-2d-text.ts":
/*!*******************************************************!*\
  !*** ./src/main/js/controller/input/point-2d-text.ts ***!
  \*******************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Point2dTextInputController = void 0;
var point_2d_1 = __webpack_require__(/*! ../../constraint/point-2d */ "./src/main/js/constraint/point-2d.ts");
var type_util_1 = __webpack_require__(/*! ../../misc/type-util */ "./src/main/js/misc/type-util.ts");
var point_2d_2 = __webpack_require__(/*! ../../model/point-2d */ "./src/main/js/model/point-2d.ts");
var point_2d_text_1 = __webpack_require__(/*! ../../view/input/point-2d-text */ "./src/main/js/view/input/point-2d-text.ts");
var UiUtil = __webpack_require__(/*! ../ui-util */ "./src/main/js/controller/ui-util.ts");
/**
 * @hidden
 */
var Point2dTextInputController = /** @class */ (function () {
    function Point2dTextInputController(document, config) {
        var _this = this;
        this.onInputChange_ = this.onInputChange_.bind(this);
        this.onInputKeyDown_ = this.onInputKeyDown_.bind(this);
        this.parser_ = config.parser;
        this.value = config.value;
        var c = this.value.constraint;
        this.xStep_ = UiUtil.getStepForTextInput(c instanceof point_2d_1.Point2dConstraint ? c.xConstraint : undefined);
        this.yStep_ = UiUtil.getStepForTextInput(c instanceof point_2d_1.Point2dConstraint ? c.yConstraint : undefined);
        this.viewModel = config.viewModel;
        this.view = new point_2d_text_1.Point2dTextInputView(document, {
            model: this.viewModel,
            value: this.value,
            xFormatter: config.xFormatter,
            yFormatter: config.yFormatter,
        });
        this.view.inputElements.forEach(function (inputElem) {
            inputElem.addEventListener('change', _this.onInputChange_);
            inputElem.addEventListener('keydown', _this.onInputKeyDown_);
        });
    }
    Point2dTextInputController.prototype.findIndexOfInputElem_ = function (inputElem) {
        var inputElems = this.view.inputElements;
        for (var i = 0; i < inputElems.length; i++) {
            if (inputElems[i] === inputElem) {
                return i;
            }
        }
        return null;
    };
    Point2dTextInputController.prototype.updateComponent_ = function (index, newValue) {
        var comps = this.value.rawValue.getComponents();
        var newComps = comps.map(function (comp, i) {
            return i === index ? newValue : comp;
        });
        this.value.rawValue = new point_2d_2.Point2d(newComps[0], newComps[1]);
        this.view.update();
    };
    Point2dTextInputController.prototype.onInputChange_ = function (e) {
        var inputElem = type_util_1.TypeUtil.forceCast(e.currentTarget);
        var parsedValue = this.parser_(inputElem.value);
        if (type_util_1.TypeUtil.isEmpty(parsedValue)) {
            return;
        }
        var compIndex = this.findIndexOfInputElem_(inputElem);
        if (type_util_1.TypeUtil.isEmpty(compIndex)) {
            return;
        }
        this.updateComponent_(compIndex, parsedValue);
    };
    Point2dTextInputController.prototype.onInputKeyDown_ = function (e) {
        var inputElem = type_util_1.TypeUtil.forceCast(e.currentTarget);
        var parsedValue = this.parser_(inputElem.value);
        if (type_util_1.TypeUtil.isEmpty(parsedValue)) {
            return;
        }
        var compIndex = this.findIndexOfInputElem_(inputElem);
        if (type_util_1.TypeUtil.isEmpty(compIndex)) {
            return;
        }
        var step = UiUtil.getStepForKey(compIndex === 0 ? this.xStep_ : this.yStep_, UiUtil.getVerticalStepKeys(e));
        if (step === 0) {
            return;
        }
        this.updateComponent_(compIndex, parsedValue + step);
    };
    return Point2dTextInputController;
}());
exports.Point2dTextInputController = Point2dTextInputController;


/***/ }),

/***/ "./src/main/js/controller/input/slider-text.ts":
/*!*****************************************************!*\
  !*** ./src/main/js/controller/input/slider-text.ts ***!
  \*****************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.SliderTextInputController = void 0;
var slider_text_1 = __webpack_require__(/*! ../../view/input/slider-text */ "./src/main/js/view/input/slider-text.ts");
var number_text_1 = __webpack_require__(/*! ./number-text */ "./src/main/js/controller/input/number-text.ts");
var slider_1 = __webpack_require__(/*! ./slider */ "./src/main/js/controller/input/slider.ts");
/**
 * @hidden
 */
var SliderTextInputController = /** @class */ (function () {
    function SliderTextInputController(document, config) {
        this.value_ = config.value;
        this.viewModel = config.viewModel;
        this.sliderIc_ = new slider_1.SliderInputController(document, {
            value: config.value,
            viewModel: this.viewModel,
        });
        this.textIc_ = new number_text_1.NumberTextInputController(document, {
            formatter: config.formatter,
            parser: config.parser,
            value: config.value,
            viewModel: this.viewModel,
        });
        this.view_ = new slider_text_1.SliderTextInputView(document, {
            model: this.viewModel,
            sliderInputView: this.sliderIc_.view,
            textInputView: this.textIc_.view,
        });
    }
    Object.defineProperty(SliderTextInputController.prototype, "value", {
        get: function () {
            return this.value_;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SliderTextInputController.prototype, "view", {
        get: function () {
            return this.view_;
        },
        enumerable: false,
        configurable: true
    });
    return SliderTextInputController;
}());
exports.SliderTextInputController = SliderTextInputController;


/***/ }),

/***/ "./src/main/js/controller/input/slider.ts":
/*!************************************************!*\
  !*** ./src/main/js/controller/input/slider.ts ***!
  \************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.SliderInputController = void 0;
var range_1 = __webpack_require__(/*! ../../constraint/range */ "./src/main/js/constraint/range.ts");
var util_1 = __webpack_require__(/*! ../../constraint/util */ "./src/main/js/constraint/util.ts");
var number_util_1 = __webpack_require__(/*! ../../misc/number-util */ "./src/main/js/misc/number-util.ts");
var pointer_handler_1 = __webpack_require__(/*! ../../misc/pointer-handler */ "./src/main/js/misc/pointer-handler.ts");
var type_util_1 = __webpack_require__(/*! ../../misc/type-util */ "./src/main/js/misc/type-util.ts");
var slider_1 = __webpack_require__(/*! ../../view/input/slider */ "./src/main/js/view/input/slider.ts");
var UiUtil = __webpack_require__(/*! ../ui-util */ "./src/main/js/controller/ui-util.ts");
function findRange(value) {
    var c = value.constraint
        ? util_1.ConstraintUtil.findConstraint(value.constraint, range_1.RangeConstraint)
        : null;
    if (!c) {
        return [undefined, undefined];
    }
    return [c.minValue, c.maxValue];
}
function estimateSuitableRange(value) {
    var _a = findRange(value), min = _a[0], max = _a[1];
    return [
        type_util_1.TypeUtil.getOrDefault(min, 0),
        type_util_1.TypeUtil.getOrDefault(max, 100),
    ];
}
/**
 * @hidden
 */
var SliderInputController = /** @class */ (function () {
    function SliderInputController(document, config) {
        this.onKeyDown_ = this.onKeyDown_.bind(this);
        this.onPointerDown_ = this.onPointerDown_.bind(this);
        this.onPointerMove_ = this.onPointerMove_.bind(this);
        this.onPointerUp_ = this.onPointerUp_.bind(this);
        this.value = config.value;
        this.step_ = UiUtil.getStepForTextInput(this.value.constraint);
        var _a = estimateSuitableRange(this.value), min = _a[0], max = _a[1];
        this.minValue_ = min;
        this.maxValue_ = max;
        this.viewModel = config.viewModel;
        this.view = new slider_1.SliderInputView(document, {
            maxValue: this.maxValue_,
            minValue: this.minValue_,
            model: this.viewModel,
            value: this.value,
        });
        this.ptHandler_ = new pointer_handler_1.PointerHandler(document, this.view.outerElement);
        this.ptHandler_.emitter.on('down', this.onPointerDown_);
        this.ptHandler_.emitter.on('move', this.onPointerMove_);
        this.ptHandler_.emitter.on('up', this.onPointerUp_);
        this.view.outerElement.addEventListener('keydown', this.onKeyDown_);
    }
    SliderInputController.prototype.handlePointerEvent_ = function (d) {
        this.value.rawValue = number_util_1.NumberUtil.map(d.px, 0, 1, this.minValue_, this.maxValue_);
    };
    SliderInputController.prototype.onPointerDown_ = function (ev) {
        this.handlePointerEvent_(ev.data);
    };
    SliderInputController.prototype.onPointerMove_ = function (ev) {
        this.handlePointerEvent_(ev.data);
    };
    SliderInputController.prototype.onPointerUp_ = function (ev) {
        this.handlePointerEvent_(ev.data);
    };
    SliderInputController.prototype.onKeyDown_ = function (ev) {
        this.value.rawValue += UiUtil.getStepForKey(this.step_, UiUtil.getHorizontalStepKeys(ev));
    };
    return SliderInputController;
}());
exports.SliderInputController = SliderInputController;


/***/ }),

/***/ "./src/main/js/controller/input/sv-palette.ts":
/*!****************************************************!*\
  !*** ./src/main/js/controller/input/sv-palette.ts ***!
  \****************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.SvPaletteInputController = void 0;
var number_util_1 = __webpack_require__(/*! ../../misc/number-util */ "./src/main/js/misc/number-util.ts");
var pointer_handler_1 = __webpack_require__(/*! ../../misc/pointer-handler */ "./src/main/js/misc/pointer-handler.ts");
var color_1 = __webpack_require__(/*! ../../model/color */ "./src/main/js/model/color.ts");
var sv_palette_1 = __webpack_require__(/*! ../../view/input/sv-palette */ "./src/main/js/view/input/sv-palette.ts");
var UiUtil = __webpack_require__(/*! ../ui-util */ "./src/main/js/controller/ui-util.ts");
/**
 * @hidden
 */
var SvPaletteInputController = /** @class */ (function () {
    function SvPaletteInputController(document, config) {
        this.onKeyDown_ = this.onKeyDown_.bind(this);
        this.onPointerDown_ = this.onPointerDown_.bind(this);
        this.onPointerMove_ = this.onPointerMove_.bind(this);
        this.onPointerUp_ = this.onPointerUp_.bind(this);
        this.value = config.value;
        this.viewModel = config.viewModel;
        this.view = new sv_palette_1.SvPaletteInputView(document, {
            model: this.viewModel,
            value: this.value,
        });
        this.ptHandler_ = new pointer_handler_1.PointerHandler(document, this.view.element);
        this.ptHandler_.emitter.on('down', this.onPointerDown_);
        this.ptHandler_.emitter.on('move', this.onPointerMove_);
        this.ptHandler_.emitter.on('up', this.onPointerUp_);
        this.view.element.addEventListener('keydown', this.onKeyDown_);
    }
    SvPaletteInputController.prototype.handlePointerEvent_ = function (d) {
        var saturation = number_util_1.NumberUtil.map(d.px, 0, 1, 0, 100);
        var value = number_util_1.NumberUtil.map(d.py, 0, 1, 100, 0);
        var _a = this.value.rawValue.getComponents('hsv'), h = _a[0], a = _a[3];
        this.value.rawValue = new color_1.Color([h, saturation, value, a], 'hsv');
        this.view.update();
    };
    SvPaletteInputController.prototype.onPointerDown_ = function (ev) {
        this.handlePointerEvent_(ev.data);
    };
    SvPaletteInputController.prototype.onPointerMove_ = function (ev) {
        this.handlePointerEvent_(ev.data);
    };
    SvPaletteInputController.prototype.onPointerUp_ = function (ev) {
        this.handlePointerEvent_(ev.data);
    };
    SvPaletteInputController.prototype.onKeyDown_ = function (ev) {
        if (UiUtil.isArrowKey(ev.keyCode)) {
            ev.preventDefault();
        }
        var _a = this.value.rawValue.getComponents('hsv'), h = _a[0], s = _a[1], v = _a[2], a = _a[3];
        var baseStep = UiUtil.getBaseStepForColor(false);
        this.value.rawValue = new color_1.Color([
            h,
            s + UiUtil.getStepForKey(baseStep, UiUtil.getHorizontalStepKeys(ev)),
            v + UiUtil.getStepForKey(baseStep, UiUtil.getVerticalStepKeys(ev)),
            a,
        ], 'hsv');
    };
    return SvPaletteInputController;
}());
exports.SvPaletteInputController = SvPaletteInputController;


/***/ }),

/***/ "./src/main/js/controller/input/text.ts":
/*!**********************************************!*\
  !*** ./src/main/js/controller/input/text.ts ***!
  \**********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.TextInputController = void 0;
var type_util_1 = __webpack_require__(/*! ../../misc/type-util */ "./src/main/js/misc/type-util.ts");
var text_1 = __webpack_require__(/*! ../../view/input/text */ "./src/main/js/view/input/text.ts");
/**
 * @hidden
 */
var TextInputController = /** @class */ (function () {
    function TextInputController(document, config) {
        this.onInputChange_ = this.onInputChange_.bind(this);
        this.parser_ = config.parser;
        this.value = config.value;
        this.viewModel = config.viewModel;
        this.view = new text_1.TextInputView(document, {
            formatter: config.formatter,
            model: this.viewModel,
            value: this.value,
        });
        this.view.inputElement.addEventListener('change', this.onInputChange_);
    }
    TextInputController.prototype.onInputChange_ = function (e) {
        var inputElem = type_util_1.TypeUtil.forceCast(e.currentTarget);
        var value = inputElem.value;
        var parsedValue = this.parser_(value);
        if (!type_util_1.TypeUtil.isEmpty(parsedValue)) {
            this.value.rawValue = parsedValue;
        }
        this.view.update();
    };
    return TextInputController;
}());
exports.TextInputController = TextInputController;


/***/ }),

/***/ "./src/main/js/controller/monitor-binding.ts":
/*!***************************************************!*\
  !*** ./src/main/js/controller/monitor-binding.ts ***!
  \***************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitorBindingController = void 0;
var labeled_1 = __webpack_require__(/*! ../view/labeled */ "./src/main/js/view/labeled.ts");
/**
 * @hidden
 */
var MonitorBindingController = /** @class */ (function () {
    function MonitorBindingController(document, config) {
        var _this = this;
        this.binding = config.binding;
        this.controller = config.controller;
        this.view = new labeled_1.LabeledView(document, {
            label: config.label,
            model: this.viewModel,
            view: this.controller.view,
        });
        this.viewModel.emitter.on('dispose', function () {
            _this.binding.dispose();
        });
    }
    Object.defineProperty(MonitorBindingController.prototype, "viewModel", {
        get: function () {
            return this.controller.viewModel;
        },
        enumerable: false,
        configurable: true
    });
    return MonitorBindingController;
}());
exports.MonitorBindingController = MonitorBindingController;


/***/ }),

/***/ "./src/main/js/controller/monitor/graph.ts":
/*!*************************************************!*\
  !*** ./src/main/js/controller/monitor/graph.ts ***!
  \*************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphMonitorController = void 0;
var number_util_1 = __webpack_require__(/*! ../../misc/number-util */ "./src/main/js/misc/number-util.ts");
var graph_cursor_1 = __webpack_require__(/*! ../../model/graph-cursor */ "./src/main/js/model/graph-cursor.ts");
var graph_1 = __webpack_require__(/*! ../../view/monitor/graph */ "./src/main/js/view/monitor/graph.ts");
/**
 * @hidden
 */
var GraphMonitorController = /** @class */ (function () {
    function GraphMonitorController(document, config) {
        this.onGraphMouseLeave_ = this.onGraphMouseLeave_.bind(this);
        this.onGraphMouseMove_ = this.onGraphMouseMove_.bind(this);
        this.value = config.value;
        this.cursor_ = new graph_cursor_1.GraphCursor();
        this.viewModel = config.viewModel;
        this.view = new graph_1.GraphMonitorView(document, {
            cursor: this.cursor_,
            formatter: config.formatter,
            maxValue: config.maxValue,
            minValue: config.minValue,
            model: this.viewModel,
            value: this.value,
        });
        this.view.graphElement.addEventListener('mouseleave', this.onGraphMouseLeave_);
        this.view.graphElement.addEventListener('mousemove', this.onGraphMouseMove_);
    }
    GraphMonitorController.prototype.onGraphMouseLeave_ = function () {
        this.cursor_.index = -1;
    };
    GraphMonitorController.prototype.onGraphMouseMove_ = function (e) {
        var bounds = this.view.graphElement.getBoundingClientRect();
        var x = e.offsetX;
        this.cursor_.index = Math.floor(number_util_1.NumberUtil.map(x, 0, bounds.width, 0, this.value.totalCount));
    };
    return GraphMonitorController;
}());
exports.GraphMonitorController = GraphMonitorController;


/***/ }),

/***/ "./src/main/js/controller/monitor/multi-log.ts":
/*!*****************************************************!*\
  !*** ./src/main/js/controller/monitor/multi-log.ts ***!
  \*****************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiLogMonitorController = void 0;
var multi_log_1 = __webpack_require__(/*! ../../view/monitor/multi-log */ "./src/main/js/view/monitor/multi-log.ts");
/**
 * @hidden
 */
var MultiLogMonitorController = /** @class */ (function () {
    function MultiLogMonitorController(document, config) {
        this.value = config.value;
        this.viewModel = config.viewModel;
        this.view = new multi_log_1.MultiLogMonitorView(document, {
            formatter: config.formatter,
            model: this.viewModel,
            value: this.value,
        });
    }
    return MultiLogMonitorController;
}());
exports.MultiLogMonitorController = MultiLogMonitorController;


/***/ }),

/***/ "./src/main/js/controller/monitor/single-log.ts":
/*!******************************************************!*\
  !*** ./src/main/js/controller/monitor/single-log.ts ***!
  \******************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.SingleLogMonitorController = void 0;
var single_log_1 = __webpack_require__(/*! ../../view/monitor/single-log */ "./src/main/js/view/monitor/single-log.ts");
/**
 * @hidden
 */
var SingleLogMonitorController = /** @class */ (function () {
    function SingleLogMonitorController(document, config) {
        this.value = config.value;
        this.viewModel = config.viewModel;
        this.view = new single_log_1.SingleLogMonitorView(document, {
            formatter: config.formatter,
            model: this.viewModel,
            value: this.value,
        });
    }
    return SingleLogMonitorController;
}());
exports.SingleLogMonitorController = SingleLogMonitorController;


/***/ }),

/***/ "./src/main/js/controller/root.ts":
/*!****************************************!*\
  !*** ./src/main/js/controller/root.ts ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.RootController = void 0;
var DomUtil = __webpack_require__(/*! ../misc/dom-util */ "./src/main/js/misc/dom-util.ts");
var type_util_1 = __webpack_require__(/*! ../misc/type-util */ "./src/main/js/misc/type-util.ts");
var folder_1 = __webpack_require__(/*! ../model/folder */ "./src/main/js/model/folder.ts");
var ui_container_1 = __webpack_require__(/*! ../model/ui-container */ "./src/main/js/model/ui-container.ts");
var root_1 = __webpack_require__(/*! ../view/root */ "./src/main/js/view/root.ts");
var ContainerUtil = __webpack_require__(/*! ./container-util */ "./src/main/js/controller/container-util.ts");
function createFolder(config) {
    if (!config.title) {
        return null;
    }
    return new folder_1.Folder(config.title, type_util_1.TypeUtil.getOrDefault(config.expanded, true));
}
/**
 * @hidden
 */
var RootController = /** @class */ (function () {
    function RootController(document, config) {
        this.onContainerTransitionEnd_ = this.onContainerTransitionEnd_.bind(this);
        this.onFolderBeforeChange_ = this.onFolderBeforeChange_.bind(this);
        this.onTitleClick_ = this.onTitleClick_.bind(this);
        this.onUiContainerAdd_ = this.onUiContainerAdd_.bind(this);
        this.onUiContainerItemLayout_ = this.onUiContainerItemLayout_.bind(this);
        this.onUiContainerRemove_ = this.onUiContainerRemove_.bind(this);
        this.folder = createFolder(config);
        if (this.folder) {
            this.folder.emitter.on('beforechange', this.onFolderBeforeChange_);
        }
        this.ucList_ = new ui_container_1.UiContainer();
        this.ucList_.emitter.on('add', this.onUiContainerAdd_);
        this.ucList_.emitter.on('itemlayout', this.onUiContainerItemLayout_);
        this.ucList_.emitter.on('remove', this.onUiContainerRemove_);
        this.doc_ = document;
        this.viewModel = config.viewModel;
        this.view = new root_1.RootView(this.doc_, {
            folder: this.folder,
            model: this.viewModel,
        });
        if (this.view.titleElement) {
            this.view.titleElement.addEventListener('click', this.onTitleClick_);
        }
        this.view.containerElement.addEventListener('transitionend', this.onContainerTransitionEnd_);
    }
    Object.defineProperty(RootController.prototype, "document", {
        get: function () {
            return this.doc_;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RootController.prototype, "uiContainer", {
        get: function () {
            return this.ucList_;
        },
        enumerable: false,
        configurable: true
    });
    RootController.prototype.onFolderBeforeChange_ = function (ev) {
        if (ev.propertyName !== 'expanded') {
            return;
        }
        var folder = this.folder;
        if (!folder) {
            return;
        }
        if (type_util_1.TypeUtil.isEmpty(folder.expandedHeight)) {
            folder.expandedHeight = ContainerUtil.computeExpandedFolderHeight(folder, this.view.containerElement);
        }
        folder.shouldFixHeight = true;
        DomUtil.forceReflow(this.view.containerElement);
    };
    RootController.prototype.applyUiContainerChange_ = function () {
        ContainerUtil.updateAllItemsPositions(this.uiContainer);
    };
    RootController.prototype.onUiContainerAdd_ = function (ev) {
        DomUtil.insertElementAt(this.view.containerElement, ev.uiController.view.element, ev.index);
        this.applyUiContainerChange_();
    };
    RootController.prototype.onUiContainerRemove_ = function (_) {
        this.applyUiContainerChange_();
    };
    RootController.prototype.onUiContainerItemLayout_ = function (_) {
        this.applyUiContainerChange_();
    };
    RootController.prototype.onTitleClick_ = function () {
        if (this.folder) {
            this.folder.expanded = !this.folder.expanded;
        }
    };
    RootController.prototype.onContainerTransitionEnd_ = function (ev) {
        if (ev.propertyName !== 'height') {
            return;
        }
        if (this.folder) {
            this.folder.shouldFixHeight = false;
            this.folder.expandedHeight = null;
        }
    };
    return RootController;
}());
exports.RootController = RootController;


/***/ }),

/***/ "./src/main/js/controller/separator.ts":
/*!*********************************************!*\
  !*** ./src/main/js/controller/separator.ts ***!
  \*********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.SeparatorController = void 0;
var separator_1 = __webpack_require__(/*! ../view/separator */ "./src/main/js/view/separator.ts");
/**
 * @hidden
 */
var SeparatorController = /** @class */ (function () {
    function SeparatorController(document, config) {
        this.viewModel = config.viewModel;
        this.view = new separator_1.SeparatorView(document, {
            model: this.viewModel,
        });
    }
    return SeparatorController;
}());
exports.SeparatorController = SeparatorController;


/***/ }),

/***/ "./src/main/js/controller/ui-util.ts":
/*!*******************************************!*\
  !*** ./src/main/js/controller/ui-util.ts ***!
  \*******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.getBaseStepForColor = exports.getSuitableMaxValueForPoint2dPad = exports.getSuitableDecimalDigits = exports.isArrowKey = exports.isVerticalArrowKey = exports.getHorizontalStepKeys = exports.getVerticalStepKeys = exports.getStepForKey = exports.getStepForTextInput = exports.findControllers = exports.normalizeInputParamsOptions = void 0;
var point_2d_1 = __webpack_require__(/*! ../constraint/point-2d */ "./src/main/js/constraint/point-2d.ts");
var range_1 = __webpack_require__(/*! ../constraint/range */ "./src/main/js/constraint/range.ts");
var step_1 = __webpack_require__(/*! ../constraint/step */ "./src/main/js/constraint/step.ts");
var util_1 = __webpack_require__(/*! ../constraint/util */ "./src/main/js/constraint/util.ts");
var number_util_1 = __webpack_require__(/*! ../misc/number-util */ "./src/main/js/misc/number-util.ts");
var type_util_1 = __webpack_require__(/*! ../misc/type-util */ "./src/main/js/misc/type-util.ts");
var folder_1 = __webpack_require__(/*! ./folder */ "./src/main/js/controller/folder.ts");
/**
 * @hidden
 */
function normalizeInputParamsOptions(options, convert) {
    if (Array.isArray(options)) {
        return options.map(function (item) {
            return {
                text: item.text,
                value: convert(item.value),
            };
        });
    }
    var textToValueMap = options;
    var texts = Object.keys(textToValueMap);
    return texts.reduce(function (result, text) {
        return result.concat({
            text: text,
            value: convert(textToValueMap[text]),
        });
    }, []);
}
exports.normalizeInputParamsOptions = normalizeInputParamsOptions;
/**
 * @hidden
 */
function findControllers(uiControllers, controllerClass) {
    return uiControllers.reduce(function (results, uc) {
        if (uc instanceof folder_1.FolderController) {
            // eslint-disable-next-line no-use-before-define
            results.push.apply(results, findControllers(uc.uiContainer.items, controllerClass));
        }
        if (uc instanceof controllerClass) {
            results.push(uc);
        }
        return results;
    }, []);
}
exports.findControllers = findControllers;
function findStep(constraint) {
    var c = constraint
        ? util_1.ConstraintUtil.findConstraint(constraint, step_1.StepConstraint)
        : null;
    if (!c) {
        return null;
    }
    return c.step;
}
/**
 * @hidden
 */
function getStepForTextInput(constraint) {
    var step = findStep(constraint);
    return type_util_1.TypeUtil.getOrDefault(step, 1);
}
exports.getStepForTextInput = getStepForTextInput;
/**
 * @hidden
 */
function getStepForKey(baseStep, keys) {
    var step = baseStep * (keys.altKey ? 0.1 : 1) * (keys.shiftKey ? 10 : 1);
    if (keys.upKey) {
        return +step;
    }
    else if (keys.downKey) {
        return -step;
    }
    return 0;
}
exports.getStepForKey = getStepForKey;
/**
 * @hidden
 */
function getVerticalStepKeys(ev) {
    return {
        altKey: ev.altKey,
        downKey: ev.keyCode === 40,
        shiftKey: ev.shiftKey,
        upKey: ev.keyCode === 38,
    };
}
exports.getVerticalStepKeys = getVerticalStepKeys;
/**
 * @hidden
 */
function getHorizontalStepKeys(ev) {
    return {
        altKey: ev.altKey,
        downKey: ev.keyCode === 37,
        shiftKey: ev.shiftKey,
        upKey: ev.keyCode === 39,
    };
}
exports.getHorizontalStepKeys = getHorizontalStepKeys;
/**
 * @hidden
 */
function isVerticalArrowKey(keyCode) {
    return keyCode === 38 || keyCode === 40;
}
exports.isVerticalArrowKey = isVerticalArrowKey;
/**
 * @hidden
 */
function isArrowKey(keyCode) {
    return isVerticalArrowKey(keyCode) || keyCode === 37 || keyCode === 39;
}
exports.isArrowKey = isArrowKey;
/**
 * @hidden
 */
function getSuitableDecimalDigits(constraint, rawValue) {
    var sc = constraint && util_1.ConstraintUtil.findConstraint(constraint, step_1.StepConstraint);
    if (sc) {
        return number_util_1.NumberUtil.getDecimalDigits(sc.step);
    }
    return Math.max(number_util_1.NumberUtil.getDecimalDigits(rawValue), 2);
}
exports.getSuitableDecimalDigits = getSuitableDecimalDigits;
/**
 * @hidden
 */
function getSuitableMaxDimensionValue(constraint, rawValue) {
    var rc = constraint && util_1.ConstraintUtil.findConstraint(constraint, range_1.RangeConstraint);
    if (rc) {
        return Math.max(Math.abs(rc.minValue || 0), Math.abs(rc.maxValue || 0));
    }
    var step = getStepForTextInput(constraint);
    return Math.max(Math.abs(step) * 10, Math.abs(rawValue) * 10);
}
/**
 * @hidden
 */
function getSuitableMaxValueForPoint2dPad(constraint, rawValue) {
    var xc = constraint instanceof point_2d_1.Point2dConstraint
        ? constraint.xConstraint
        : undefined;
    var yc = constraint instanceof point_2d_1.Point2dConstraint
        ? constraint.yConstraint
        : undefined;
    var xr = getSuitableMaxDimensionValue(xc, rawValue.x);
    var yr = getSuitableMaxDimensionValue(yc, rawValue.y);
    return Math.max(xr, yr);
}
exports.getSuitableMaxValueForPoint2dPad = getSuitableMaxValueForPoint2dPad;
/**
 * @hidden
 */
function getBaseStepForColor(forAlpha) {
    return forAlpha ? 0.1 : 1;
}
exports.getBaseStepForColor = getBaseStepForColor;


/***/ }),

/***/ "./src/main/js/converter/boolean.ts":
/*!******************************************!*\
  !*** ./src/main/js/converter/boolean.ts ***!
  \******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.toString = exports.fromMixed = void 0;
/**
 * @hidden
 */
function fromMixed(value) {
    if (value === 'false') {
        return false;
    }
    return !!value;
}
exports.fromMixed = fromMixed;
/**
 * @hidden
 */
function toString(value) {
    return String(value);
}
exports.toString = toString;


/***/ }),

/***/ "./src/main/js/converter/color.ts":
/*!****************************************!*\
  !*** ./src/main/js/converter/color.ts ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.toRgbaNumber = exports.toRgbNumber = exports.getStringifier = exports.toFunctionalHslaString = exports.toFunctionalHslString = exports.toFunctionalRgbaString = exports.toFunctionalRgbString = exports.toHexRgbaString = exports.toHexRgbString = exports.fromNumberToRgba = exports.fromNumberToRgb = exports.fromObject = exports.fromString = void 0;
var number_1 = __webpack_require__(/*! ../formatter/number */ "./src/main/js/formatter/number.ts");
var ColorModel = __webpack_require__(/*! ../misc/color-model */ "./src/main/js/misc/color-model.ts");
var number_util_1 = __webpack_require__(/*! ../misc/number-util */ "./src/main/js/misc/number-util.ts");
var color_1 = __webpack_require__(/*! ../model/color */ "./src/main/js/model/color.ts");
var NumberColorParser = __webpack_require__(/*! ../parser/number-color */ "./src/main/js/parser/number-color.ts");
var StringColorParser = __webpack_require__(/*! ../parser/string-color */ "./src/main/js/parser/string-color.ts");
function createEmptyColor() {
    return new color_1.Color([0, 0, 0], 'rgb');
}
/**
 * @hidden
 */
function fromString(value) {
    if (typeof value === 'string') {
        var cv = StringColorParser.CompositeParser(value);
        if (cv) {
            return cv;
        }
    }
    return createEmptyColor();
}
exports.fromString = fromString;
/**
 * @hidden
 */
function fromObject(value) {
    if (color_1.Color.isColorObject(value)) {
        return color_1.Color.fromObject(value);
    }
    return createEmptyColor();
}
exports.fromObject = fromObject;
/**
 * @hidden
 */
function fromNumberToRgb(value) {
    if (typeof value === 'number') {
        var cv = NumberColorParser.RgbParser(value);
        if (cv) {
            return cv;
        }
    }
    return createEmptyColor();
}
exports.fromNumberToRgb = fromNumberToRgb;
/**
 * @hidden
 */
function fromNumberToRgba(value) {
    if (typeof value === 'number') {
        var cv = NumberColorParser.RgbaParser(value);
        if (cv) {
            return cv;
        }
    }
    return createEmptyColor();
}
exports.fromNumberToRgba = fromNumberToRgba;
function zerofill(comp) {
    var hex = number_util_1.NumberUtil.constrain(Math.floor(comp), 0, 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
}
/**
 * @hidden
 */
function toHexRgbString(value) {
    var hexes = ColorModel.withoutAlpha(value.getComponents('rgb'))
        .map(zerofill)
        .join('');
    return "#" + hexes;
}
exports.toHexRgbString = toHexRgbString;
/**
 * @hidden
 */
function toHexRgbaString(value) {
    var rgbaComps = value.getComponents('rgb');
    var hexes = [rgbaComps[0], rgbaComps[1], rgbaComps[2], rgbaComps[3] * 255]
        .map(zerofill)
        .join('');
    return "#" + hexes;
}
exports.toHexRgbaString = toHexRgbaString;
/**
 * @hidden
 */
function toFunctionalRgbString(value) {
    var formatter = new number_1.NumberFormatter(0);
    var comps = ColorModel.withoutAlpha(value.getComponents('rgb')).map(function (comp) { return formatter.format(comp); });
    return "rgb(" + comps.join(', ') + ")";
}
exports.toFunctionalRgbString = toFunctionalRgbString;
/**
 * @hidden
 */
function toFunctionalRgbaString(value) {
    var aFormatter = new number_1.NumberFormatter(2);
    var rgbFormatter = new number_1.NumberFormatter(0);
    var comps = value.getComponents('rgb').map(function (comp, index) {
        var formatter = index === 3 ? aFormatter : rgbFormatter;
        return formatter.format(comp);
    });
    return "rgba(" + comps.join(', ') + ")";
}
exports.toFunctionalRgbaString = toFunctionalRgbaString;
/**
 * @hidden
 */
function toFunctionalHslString(value) {
    var formatter = new number_1.NumberFormatter(0);
    var comps = ColorModel.withoutAlpha(value.getComponents('hsl')).map(function (comp) { return formatter.format(comp); });
    return "hsl(" + comps.join(', ') + ")";
}
exports.toFunctionalHslString = toFunctionalHslString;
/**
 * @hidden
 */
function toFunctionalHslaString(value) {
    var aFormatter = new number_1.NumberFormatter(2);
    var hslFormatter = new number_1.NumberFormatter(0);
    var comps = value.getComponents('hsl').map(function (comp, index) {
        var formatter = index === 3 ? aFormatter : hslFormatter;
        return formatter.format(comp);
    });
    return "hsla(" + comps.join(', ') + ")";
}
exports.toFunctionalHslaString = toFunctionalHslaString;
var NOTATION_TO_STRINGIFIER_MAP = {
    'func.hsl': toFunctionalHslString,
    'func.hsla': toFunctionalHslaString,
    'func.rgb': toFunctionalRgbString,
    'func.rgba': toFunctionalRgbaString,
    'hex.rgb': toHexRgbString,
    'hex.rgba': toHexRgbaString,
};
function getStringifier(notation) {
    return NOTATION_TO_STRINGIFIER_MAP[notation];
}
exports.getStringifier = getStringifier;
/**
 * @hidden
 */
function toRgbNumber(value) {
    return ColorModel.withoutAlpha(value.getComponents('rgb')).reduce(function (result, comp) {
        return (result << 8) | (Math.floor(comp) & 0xff);
    }, 0);
}
exports.toRgbNumber = toRgbNumber;
/**
 * @hidden
 */
function toRgbaNumber(value) {
    return value.getComponents('rgb').reduce(function (result, comp, index) {
        var hex = Math.floor(index === 3 ? comp * 255 : comp) & 0xff;
        return (result << 8) | hex;
    }, 0);
}
exports.toRgbaNumber = toRgbaNumber;


/***/ }),

/***/ "./src/main/js/converter/number.ts":
/*!*****************************************!*\
  !*** ./src/main/js/converter/number.ts ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.toString = exports.fromMixed = void 0;
var type_util_1 = __webpack_require__(/*! ../misc/type-util */ "./src/main/js/misc/type-util.ts");
var string_number_1 = __webpack_require__(/*! ../parser/string-number */ "./src/main/js/parser/string-number.ts");
/**
 * @hidden
 */
function fromMixed(value) {
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'string') {
        var pv = string_number_1.StringNumberParser(value);
        if (!type_util_1.TypeUtil.isEmpty(pv)) {
            return pv;
        }
    }
    return 0;
}
exports.fromMixed = fromMixed;
/**
 * @hidden
 */
function toString(value) {
    return String(value);
}
exports.toString = toString;


/***/ }),

/***/ "./src/main/js/converter/point-2d.ts":
/*!*******************************************!*\
  !*** ./src/main/js/converter/point-2d.ts ***!
  \*******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.fromMixed = void 0;
var point_2d_1 = __webpack_require__(/*! ../model/point-2d */ "./src/main/js/model/point-2d.ts");
var any_point_2d_1 = __webpack_require__(/*! ../parser/any-point-2d */ "./src/main/js/parser/any-point-2d.ts");
/**
 * @hidden
 */
function fromMixed(value) {
    return any_point_2d_1.AnyPoint2dParser(value) || new point_2d_1.Point2d();
}
exports.fromMixed = fromMixed;


/***/ }),

/***/ "./src/main/js/converter/string.ts":
/*!*****************************************!*\
  !*** ./src/main/js/converter/string.ts ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.toString = exports.fromMixed = void 0;
/**
 * @hidden
 */
function fromMixed(value) {
    return String(value);
}
exports.fromMixed = fromMixed;
/**
 * @hidden
 */
function toString(value) {
    return value;
}
exports.toString = toString;


/***/ }),

/***/ "./src/main/js/formatter/boolean.ts":
/*!******************************************!*\
  !*** ./src/main/js/formatter/boolean.ts ***!
  \******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.BooleanFormatter = void 0;
var BooleanConverter = __webpack_require__(/*! ../converter/boolean */ "./src/main/js/converter/boolean.ts");
/**
 * @hidden
 */
var BooleanFormatter = /** @class */ (function () {
    function BooleanFormatter() {
    }
    BooleanFormatter.prototype.format = function (value) {
        return BooleanConverter.toString(value);
    };
    return BooleanFormatter;
}());
exports.BooleanFormatter = BooleanFormatter;


/***/ }),

/***/ "./src/main/js/formatter/color.ts":
/*!****************************************!*\
  !*** ./src/main/js/formatter/color.ts ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ColorFormatter = void 0;
/**
 * @hidden
 */
var ColorFormatter = /** @class */ (function () {
    function ColorFormatter(stringifier) {
        this.stringifier_ = stringifier;
    }
    ColorFormatter.prototype.format = function (value) {
        return this.stringifier_(value);
    };
    return ColorFormatter;
}());
exports.ColorFormatter = ColorFormatter;


/***/ }),

/***/ "./src/main/js/formatter/number.ts":
/*!*****************************************!*\
  !*** ./src/main/js/formatter/number.ts ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.NumberFormatter = void 0;
/**
 * @hidden
 */
var NumberFormatter = /** @class */ (function () {
    function NumberFormatter(digits) {
        this.digits_ = digits;
    }
    Object.defineProperty(NumberFormatter.prototype, "digits", {
        get: function () {
            return this.digits_;
        },
        enumerable: false,
        configurable: true
    });
    NumberFormatter.prototype.format = function (value) {
        return value.toFixed(Math.max(Math.min(this.digits_, 20), 0));
    };
    return NumberFormatter;
}());
exports.NumberFormatter = NumberFormatter;


/***/ }),

/***/ "./src/main/js/formatter/string.ts":
/*!*****************************************!*\
  !*** ./src/main/js/formatter/string.ts ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.StringFormatter = void 0;
/**
 * @hidden
 */
var StringFormatter = /** @class */ (function () {
    function StringFormatter() {
    }
    StringFormatter.prototype.format = function (value) {
        return value;
    };
    return StringFormatter;
}());
exports.StringFormatter = StringFormatter;


/***/ }),

/***/ "./src/main/js/index.ts":
/*!******************************!*\
  !*** ./src/main/js/index.ts ***!
  \******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Style = __webpack_require__(/*! ../sass/bundle.scss */ "./src/main/sass/bundle.scss");
var tweakpane_without_style_1 = __webpack_require__(/*! ./tweakpane-without-style */ "./src/main/js/tweakpane-without-style.ts");
function embedDefaultStyleIfNeeded(document) {
    var MARKER = 'tweakpane';
    if (document.querySelector("style[data-for=" + MARKER + "]")) {
        return;
    }
    var styleElem = document.createElement('style');
    styleElem.dataset.for = MARKER;
    styleElem.textContent = Style.toString();
    if (document.head) {
        document.head.appendChild(styleElem);
    }
}
// tslint:disable-next-line: no-default-export
var Tweakpane = /** @class */ (function (_super) {
    __extends(Tweakpane, _super);
    function Tweakpane(opt_config) {
        var _this = _super.call(this, opt_config) || this;
        embedDefaultStyleIfNeeded(_this.document);
        return _this;
    }
    return Tweakpane;
}(tweakpane_without_style_1.TweakpaneWithoutStyle));
exports.default = Tweakpane;


/***/ }),

/***/ "./src/main/js/misc/class-name.ts":
/*!****************************************!*\
  !*** ./src/main/js/misc/class-name.ts ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassName = void 0;
var PREFIX = 'tp';
var TYPE_TO_POSTFIX_MAP = {
    '': 'v',
    input: 'iv',
    monitor: 'mv',
};
function ClassName(viewName, opt_viewType) {
    var viewType = opt_viewType || '';
    var postfix = TYPE_TO_POSTFIX_MAP[viewType];
    return function (opt_elementName, opt_modifier) {
        return [
            PREFIX,
            '-',
            viewName,
            postfix,
            opt_elementName ? "_" + opt_elementName : '',
            opt_modifier ? "-" + opt_modifier : '',
        ].join('');
    };
}
exports.ClassName = ClassName;


/***/ }),

/***/ "./src/main/js/misc/color-model.ts":
/*!*****************************************!*\
  !*** ./src/main/js/misc/color-model.ts ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.convertMode = exports.withAlpha = exports.withoutAlpha = exports.opaque = void 0;
var number_util_1 = __webpack_require__(/*! ./number-util */ "./src/main/js/misc/number-util.ts");
function rgbToHsl(r, g, b) {
    var rp = number_util_1.NumberUtil.constrain(r / 255, 0, 1);
    var gp = number_util_1.NumberUtil.constrain(g / 255, 0, 1);
    var bp = number_util_1.NumberUtil.constrain(b / 255, 0, 1);
    var cmax = Math.max(rp, gp, bp);
    var cmin = Math.min(rp, gp, bp);
    var c = cmax - cmin;
    var h = 0;
    var s = 0;
    var l = (cmin + cmax) / 2;
    if (c !== 0) {
        s = l > 0.5 ? c / (2 - cmin - cmax) : c / (cmax + cmin);
        if (rp === cmax) {
            h = (gp - bp) / c;
        }
        else if (gp === cmax) {
            h = 2 + (bp - rp) / c;
        }
        else {
            h = 4 + (rp - gp) / c;
        }
        h = h / 6 + (h < 0 ? 1 : 0);
    }
    return [h * 360, s * 100, l * 100];
}
function hslToRgb(h, s, l) {
    var _a, _b, _c, _d, _e, _f;
    var hp = ((h % 360) + 360) % 360;
    var sp = number_util_1.NumberUtil.constrain(s / 100, 0, 1);
    var lp = number_util_1.NumberUtil.constrain(l / 100, 0, 1);
    var c = (1 - Math.abs(2 * lp - 1)) * sp;
    var x = c * (1 - Math.abs(((hp / 60) % 2) - 1));
    var m = lp - c / 2;
    var rp, gp, bp;
    if (hp >= 0 && hp < 60) {
        _a = [c, x, 0], rp = _a[0], gp = _a[1], bp = _a[2];
    }
    else if (hp >= 60 && hp < 120) {
        _b = [x, c, 0], rp = _b[0], gp = _b[1], bp = _b[2];
    }
    else if (hp >= 120 && hp < 180) {
        _c = [0, c, x], rp = _c[0], gp = _c[1], bp = _c[2];
    }
    else if (hp >= 180 && hp < 240) {
        _d = [0, x, c], rp = _d[0], gp = _d[1], bp = _d[2];
    }
    else if (hp >= 240 && hp < 300) {
        _e = [x, 0, c], rp = _e[0], gp = _e[1], bp = _e[2];
    }
    else {
        _f = [c, 0, x], rp = _f[0], gp = _f[1], bp = _f[2];
    }
    return [(rp + m) * 255, (gp + m) * 255, (bp + m) * 255];
}
function rgbToHsv(r, g, b) {
    var rp = number_util_1.NumberUtil.constrain(r / 255, 0, 1);
    var gp = number_util_1.NumberUtil.constrain(g / 255, 0, 1);
    var bp = number_util_1.NumberUtil.constrain(b / 255, 0, 1);
    var cmax = Math.max(rp, gp, bp);
    var cmin = Math.min(rp, gp, bp);
    var d = cmax - cmin;
    var h;
    if (d === 0) {
        h = 0;
    }
    else if (cmax === rp) {
        h = 60 * (((((gp - bp) / d) % 6) + 6) % 6);
    }
    else if (cmax === gp) {
        h = 60 * ((bp - rp) / d + 2);
    }
    else {
        h = 60 * ((rp - gp) / d + 4);
    }
    var s = cmax === 0 ? 0 : d / cmax;
    var v = cmax;
    return [h, s * 100, v * 100];
}
function hsvToRgb(h, s, v) {
    var _a, _b, _c, _d, _e, _f;
    var hp = number_util_1.NumberUtil.loop(h, 360);
    var sp = number_util_1.NumberUtil.constrain(s / 100, 0, 1);
    var vp = number_util_1.NumberUtil.constrain(v / 100, 0, 1);
    var c = vp * sp;
    var x = c * (1 - Math.abs(((hp / 60) % 2) - 1));
    var m = vp - c;
    var rp, gp, bp;
    if (hp >= 0 && hp < 60) {
        _a = [c, x, 0], rp = _a[0], gp = _a[1], bp = _a[2];
    }
    else if (hp >= 60 && hp < 120) {
        _b = [x, c, 0], rp = _b[0], gp = _b[1], bp = _b[2];
    }
    else if (hp >= 120 && hp < 180) {
        _c = [0, c, x], rp = _c[0], gp = _c[1], bp = _c[2];
    }
    else if (hp >= 180 && hp < 240) {
        _d = [0, x, c], rp = _d[0], gp = _d[1], bp = _d[2];
    }
    else if (hp >= 240 && hp < 300) {
        _e = [x, 0, c], rp = _e[0], gp = _e[1], bp = _e[2];
    }
    else {
        _f = [c, 0, x], rp = _f[0], gp = _f[1], bp = _f[2];
    }
    return [(rp + m) * 255, (gp + m) * 255, (bp + m) * 255];
}
/**
 * @hidden
 */
function opaque(comps) {
    return [comps[0], comps[1], comps[2], 1];
}
exports.opaque = opaque;
/**
 * @hidden
 */
function withoutAlpha(comps) {
    return [comps[0], comps[1], comps[2]];
}
exports.withoutAlpha = withoutAlpha;
/**
 * @hidden
 */
function withAlpha(comps, alpha) {
    return [comps[0], comps[1], comps[2], alpha];
}
exports.withAlpha = withAlpha;
var MODE_CONVERTER_MAP = {
    hsl: {
        hsl: function (h, s, l) { return [h, s, l]; },
        hsv: function (h, s, l) {
            var _a = hslToRgb(h, s, l), r = _a[0], g = _a[1], b = _a[2];
            return rgbToHsv(r, g, b);
        },
        rgb: hslToRgb,
    },
    hsv: {
        hsl: function (h, s, v) {
            var _a = hsvToRgb(h, s, v), r = _a[0], g = _a[1], b = _a[2];
            return rgbToHsl(r, g, b);
        },
        hsv: function (h, s, v) { return [h, s, v]; },
        rgb: hsvToRgb,
    },
    rgb: {
        hsl: rgbToHsl,
        hsv: rgbToHsv,
        rgb: function (r, g, b) { return [r, g, b]; },
    },
};
/**
 * @hidden
 */
function convertMode(components, fromMode, toMode) {
    var _a;
    return (_a = MODE_CONVERTER_MAP[fromMode])[toMode].apply(_a, components);
}
exports.convertMode = convertMode;


/***/ }),

/***/ "./src/main/js/misc/constants.ts":
/*!***************************************!*\
  !*** ./src/main/js/misc/constants.ts ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Constants = void 0;
exports.Constants = {
    monitorDefaultInterval: 200,
};


/***/ }),

/***/ "./src/main/js/misc/disposing-util.ts":
/*!********************************************!*\
  !*** ./src/main/js/misc/disposing-util.ts ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.disposeElement = void 0;
function disposeElement(elem) {
    if (elem && elem.parentElement) {
        elem.parentElement.removeChild(elem);
    }
    return null;
}
exports.disposeElement = disposeElement;


/***/ }),

/***/ "./src/main/js/misc/dom-util.ts":
/*!**************************************!*\
  !*** ./src/main/js/misc/dom-util.ts ***!
  \**************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(process) {
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexOfChildElement = exports.removeElement = exports.insertElementAt = exports.createSvgIconElement = exports.getCanvasContext = exports.getWindowDocument = exports.supportsTouch = exports.disableTransitionTemporarily = exports.forceReflow = exports.SVG_NS = void 0;
var type_util_1 = __webpack_require__(/*! ./type-util */ "./src/main/js/misc/type-util.ts");
exports.SVG_NS = 'http://www.w3.org/2000/svg';
function forceReflow(element) {
    // tslint:disable-next-line:no-unused-expression
    element.offsetHeight;
}
exports.forceReflow = forceReflow;
function disableTransitionTemporarily(element, callback) {
    var t = element.style.transition;
    element.style.transition = 'none';
    callback();
    element.style.transition = t;
}
exports.disableTransitionTemporarily = disableTransitionTemporarily;
function supportsTouch(document) {
    return document.ontouchstart !== undefined;
}
exports.supportsTouch = supportsTouch;
function getWindowDocument() {
    // tslint:disable-next-line:function-constructor
    var globalObj = type_util_1.TypeUtil.forceCast(new Function('return this')());
    return globalObj.document;
}
exports.getWindowDocument = getWindowDocument;
function isBrowser() {
    // Webpack defines process.browser = true;
    // https://github.com/webpack/node-libs-browser
    // https://github.com/defunctzombie/node-process
    return !!process.browser;
}
function getCanvasContext(canvasElement) {
    // HTMLCanvasElement.prototype.getContext is not defined on testing environment
    return isBrowser() ? canvasElement.getContext('2d') : null;
}
exports.getCanvasContext = getCanvasContext;
// tslint:disable: max-line-length
var ICON_ID_TO_INNER_HTML_MAP = {
    p2dpad: '<path d="M8 2V14" stroke="currentColor" stroke-width="1.5"/><path d="M2 8H14" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="2" fill="currentColor"/>',
};
function createSvgIconElement(document, iconId) {
    var elem = document.createElementNS(exports.SVG_NS, 'svg');
    elem.innerHTML = ICON_ID_TO_INNER_HTML_MAP[iconId];
    return elem;
}
exports.createSvgIconElement = createSvgIconElement;
function insertElementAt(parentElement, element, index) {
    parentElement.insertBefore(element, parentElement.children[index]);
}
exports.insertElementAt = insertElementAt;
function removeElement(element) {
    if (element.parentElement) {
        element.parentElement.removeChild(element);
    }
}
exports.removeElement = removeElement;
function indexOfChildElement(element) {
    var parentElem = element.parentElement;
    if (!parentElem) {
        return -1;
    }
    var children = Array.prototype.slice.call(parentElem.children);
    return children.indexOf(element);
}
exports.indexOfChildElement = indexOfChildElement;

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../../../../node_modules/process/browser.js */ "./node_modules/process/browser.js")))

/***/ }),

/***/ "./src/main/js/misc/emitter.ts":
/*!*************************************!*\
  !*** ./src/main/js/misc/emitter.ts ***!
  \*************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Emitter = void 0;
/**
 * @hidden
 */
var Emitter = /** @class */ (function () {
    function Emitter() {
        this.observers_ = {};
    }
    Emitter.prototype.on = function (eventName, handler) {
        var observers = this.observers_[eventName];
        if (!observers) {
            observers = this.observers_[eventName] = [];
        }
        observers.push({
            handler: handler,
        });
        return this;
    };
    Emitter.prototype.off = function (eventName, handler) {
        var observers = this.observers_[eventName];
        if (observers) {
            this.observers_[eventName] = observers.filter(function (observer) {
                return observer.handler !== handler;
            });
        }
        return this;
    };
    Emitter.prototype.emit = function (eventName, event) {
        var observers = this.observers_[eventName];
        if (!observers) {
            return;
        }
        observers.forEach(function (observer) {
            observer.handler(event);
        });
    };
    return Emitter;
}());
exports.Emitter = Emitter;


/***/ }),

/***/ "./src/main/js/misc/number-util.ts":
/*!*****************************************!*\
  !*** ./src/main/js/misc/number-util.ts ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.NumberUtil = void 0;
exports.NumberUtil = {
    map: function (value, start1, end1, start2, end2) {
        var p = (value - start1) / (end1 - start1);
        return start2 + p * (end2 - start2);
    },
    getDecimalDigits: function (value) {
        var text = String(value.toFixed(10));
        var frac = text.split('.')[1];
        return frac.replace(/0+$/, '').length;
    },
    constrain: function (value, min, max) {
        return Math.min(Math.max(value, min), max);
    },
    loop: function (value, max) {
        return ((value % max) + max) % max;
    },
};


/***/ }),

/***/ "./src/main/js/misc/pane-error.ts":
/*!****************************************!*\
  !*** ./src/main/js/misc/pane-error.ts ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.PaneError = void 0;
function createMessage(config) {
    if (config.type === 'alreadydisposed') {
        return 'View has been already disposed';
    }
    if (config.type === 'emptyvalue') {
        return "Value is empty for " + config.context.key;
    }
    if (config.type === 'invalidparams') {
        return "Invalid parameters for " + config.context.name;
    }
    if (config.type === 'nomatchingcontroller') {
        return "No matching controller for " + config.context.key;
    }
    if (config.type === 'shouldneverhappen') {
        return 'This error should never happen';
    }
    return 'Unexpected error';
}
var PaneError = /** @class */ (function () {
    function PaneError(config) {
        this.message = createMessage(config);
        this.name = this.constructor.name;
        this.stack = new Error(this.message).stack;
        this.type = config.type;
    }
    PaneError.alreadyDisposed = function () {
        return new PaneError({ type: 'alreadydisposed' });
    };
    PaneError.shouldNeverHappen = function () {
        return new PaneError({ type: 'shouldneverhappen' });
    };
    return PaneError;
}());
exports.PaneError = PaneError;
PaneError.prototype = Object.create(Error.prototype);
PaneError.prototype.constructor = PaneError;


/***/ }),

/***/ "./src/main/js/misc/pointer-handler.ts":
/*!*********************************************!*\
  !*** ./src/main/js/misc/pointer-handler.ts ***!
  \*********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.PointerHandler = void 0;
var DomUtil = __webpack_require__(/*! ./dom-util */ "./src/main/js/misc/dom-util.ts");
var emitter_1 = __webpack_require__(/*! ./emitter */ "./src/main/js/misc/emitter.ts");
/**
 * A utility class to handle both mouse and touch events.
 * @hidden
 */
var PointerHandler = /** @class */ (function () {
    function PointerHandler(document, element) {
        this.onDocumentMouseMove_ = this.onDocumentMouseMove_.bind(this);
        this.onDocumentMouseUp_ = this.onDocumentMouseUp_.bind(this);
        this.onMouseDown_ = this.onMouseDown_.bind(this);
        this.onTouchMove_ = this.onTouchMove_.bind(this);
        this.onTouchStart_ = this.onTouchStart_.bind(this);
        this.document = document;
        this.element = element;
        this.emitter = new emitter_1.Emitter();
        this.pressed_ = false;
        if (DomUtil.supportsTouch(this.document)) {
            element.addEventListener('touchstart', this.onTouchStart_);
            element.addEventListener('touchmove', this.onTouchMove_);
        }
        else {
            element.addEventListener('mousedown', this.onMouseDown_);
            this.document.addEventListener('mousemove', this.onDocumentMouseMove_);
            this.document.addEventListener('mouseup', this.onDocumentMouseUp_);
        }
    }
    PointerHandler.prototype.computePosition_ = function (offsetX, offsetY) {
        var rect = this.element.getBoundingClientRect();
        return {
            px: offsetX / rect.width,
            py: offsetY / rect.height,
        };
    };
    PointerHandler.prototype.onMouseDown_ = function (e) {
        var _a;
        // Prevent native text selection
        e.preventDefault();
        (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.focus();
        this.pressed_ = true;
        this.emitter.emit('down', {
            data: this.computePosition_(e.offsetX, e.offsetY),
            sender: this,
        });
    };
    PointerHandler.prototype.onDocumentMouseMove_ = function (e) {
        if (!this.pressed_) {
            return;
        }
        var win = this.document.defaultView;
        var rect = this.element.getBoundingClientRect();
        this.emitter.emit('move', {
            data: this.computePosition_(e.pageX - (((win && win.scrollX) || 0) + rect.left), e.pageY - (((win && win.scrollY) || 0) + rect.top)),
            sender: this,
        });
    };
    PointerHandler.prototype.onDocumentMouseUp_ = function (e) {
        if (!this.pressed_) {
            return;
        }
        this.pressed_ = false;
        var win = this.document.defaultView;
        var rect = this.element.getBoundingClientRect();
        this.emitter.emit('up', {
            data: this.computePosition_(e.pageX - (((win && win.scrollX) || 0) + rect.left), e.pageY - (((win && win.scrollY) || 0) + rect.top)),
            sender: this,
        });
    };
    PointerHandler.prototype.onTouchStart_ = function (e) {
        // Prevent native page scroll
        e.preventDefault();
        var touch = e.targetTouches[0];
        var rect = this.element.getBoundingClientRect();
        this.emitter.emit('down', {
            data: this.computePosition_(touch.clientX - rect.left, touch.clientY - rect.top),
            sender: this,
        });
    };
    PointerHandler.prototype.onTouchMove_ = function (e) {
        var touch = e.targetTouches[0];
        var rect = this.element.getBoundingClientRect();
        this.emitter.emit('move', {
            data: this.computePosition_(touch.clientX - rect.left, touch.clientY - rect.top),
            sender: this,
        });
    };
    return PointerHandler;
}());
exports.PointerHandler = PointerHandler;


/***/ }),

/***/ "./src/main/js/misc/ticker/interval.ts":
/*!*********************************************!*\
  !*** ./src/main/js/misc/ticker/interval.ts ***!
  \*********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.IntervalTicker = void 0;
var disposable_1 = __webpack_require__(/*! ../../model/disposable */ "./src/main/js/model/disposable.ts");
var emitter_1 = __webpack_require__(/*! ../emitter */ "./src/main/js/misc/emitter.ts");
/**
 * @hidden
 */
var IntervalTicker = /** @class */ (function () {
    function IntervalTicker(document, interval) {
        var _this = this;
        this.onTick_ = this.onTick_.bind(this);
        this.onWindowBlur_ = this.onWindowBlur_.bind(this);
        this.onWindowFocus_ = this.onWindowFocus_.bind(this);
        this.active_ = true;
        this.doc_ = document;
        this.emitter = new emitter_1.Emitter();
        if (interval <= 0) {
            this.id_ = null;
        }
        else {
            var win = this.doc_.defaultView;
            if (win) {
                this.id_ = win.setInterval(function () {
                    if (!_this.active_) {
                        return;
                    }
                    _this.onTick_();
                }, interval);
            }
        }
        // TODO: Stop on blur?
        // const win = document.defaultView;
        // if (win) {
        //   win.addEventListener('blur', this.onWindowBlur_);
        //   win.addEventListener('focus', this.onWindowFocus_);
        // }
        this.disposable = new disposable_1.Disposable();
        this.disposable.emitter.on('dispose', function () {
            if (_this.id_ !== null) {
                var win = _this.doc_.defaultView;
                if (win) {
                    win.clearInterval(_this.id_);
                }
            }
            _this.id_ = null;
        });
    }
    IntervalTicker.prototype.onTick_ = function () {
        this.emitter.emit('tick', {
            sender: this,
        });
    };
    IntervalTicker.prototype.onWindowBlur_ = function () {
        this.active_ = false;
    };
    IntervalTicker.prototype.onWindowFocus_ = function () {
        this.active_ = true;
    };
    return IntervalTicker;
}());
exports.IntervalTicker = IntervalTicker;


/***/ }),

/***/ "./src/main/js/misc/type-util.ts":
/*!***************************************!*\
  !*** ./src/main/js/misc/type-util.ts ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeUtil = void 0;
exports.TypeUtil = {
    forceCast: function (v) {
        return v;
    },
    isEmpty: function (value) {
        return value === null || value === undefined;
    },
    getOrDefault: function (value, defaultValue) {
        return !exports.TypeUtil.isEmpty(value) ? value : defaultValue;
    },
    deepEqualsArray: function (a1, a2) {
        if (a1.length !== a2.length) {
            return false;
        }
        for (var i = 0; i < a1.length; i++) {
            if (a1[i] !== a2[i]) {
                return false;
            }
        }
        return true;
    },
};


/***/ }),

/***/ "./src/main/js/model/button.ts":
/*!*************************************!*\
  !*** ./src/main/js/model/button.ts ***!
  \*************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = void 0;
var emitter_1 = __webpack_require__(/*! ../misc/emitter */ "./src/main/js/misc/emitter.ts");
/**
 * @hidden
 */
var Button = /** @class */ (function () {
    function Button(title) {
        this.emitter = new emitter_1.Emitter();
        this.title = title;
    }
    Button.prototype.click = function () {
        this.emitter.emit('click', {
            sender: this,
        });
    };
    return Button;
}());
exports.Button = Button;


/***/ }),

/***/ "./src/main/js/model/color.ts":
/*!************************************!*\
  !*** ./src/main/js/model/color.ts ***!
  \************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Color = void 0;
var ColorModel = __webpack_require__(/*! ../misc/color-model */ "./src/main/js/misc/color-model.ts");
var number_util_1 = __webpack_require__(/*! ../misc/number-util */ "./src/main/js/misc/number-util.ts");
var type_util_1 = __webpack_require__(/*! ../misc/type-util */ "./src/main/js/misc/type-util.ts");
var CONSTRAINT_MAP = {
    hsl: function (comps) {
        return [
            number_util_1.NumberUtil.loop(comps[0], 360),
            number_util_1.NumberUtil.constrain(comps[1], 0, 100),
            number_util_1.NumberUtil.constrain(comps[2], 0, 100),
            number_util_1.NumberUtil.constrain(type_util_1.TypeUtil.getOrDefault(comps[3], 1), 0, 1),
        ];
    },
    hsv: function (comps) {
        return [
            number_util_1.NumberUtil.loop(comps[0], 360),
            number_util_1.NumberUtil.constrain(comps[1], 0, 100),
            number_util_1.NumberUtil.constrain(comps[2], 0, 100),
            number_util_1.NumberUtil.constrain(type_util_1.TypeUtil.getOrDefault(comps[3], 1), 0, 1),
        ];
    },
    rgb: function (comps) {
        return [
            number_util_1.NumberUtil.constrain(comps[0], 0, 255),
            number_util_1.NumberUtil.constrain(comps[1], 0, 255),
            number_util_1.NumberUtil.constrain(comps[2], 0, 255),
            number_util_1.NumberUtil.constrain(type_util_1.TypeUtil.getOrDefault(comps[3], 1), 0, 1),
        ];
    },
};
function isRgbColorComponent(obj, key) {
    if (typeof obj !== 'object' || type_util_1.TypeUtil.isEmpty(obj)) {
        return false;
    }
    return key in obj && typeof obj[key] === 'number';
}
/**
 * @hidden
 */
var Color = /** @class */ (function () {
    function Color(comps, mode) {
        this.mode_ = mode;
        this.comps_ = CONSTRAINT_MAP[mode](comps);
    }
    Color.fromObject = function (obj) {
        var comps = 'a' in obj ? [obj.r, obj.g, obj.b, obj.a] : [obj.r, obj.g, obj.b];
        return new Color(comps, 'rgb');
    };
    Color.toRgbaObject = function (color) {
        return color.toRgbaObject();
    };
    Color.isRgbColorObject = function (obj) {
        return (isRgbColorComponent(obj, 'r') &&
            isRgbColorComponent(obj, 'g') &&
            isRgbColorComponent(obj, 'b'));
    };
    Color.isRgbaColorObject = function (obj) {
        return this.isRgbColorObject(obj) && isRgbColorComponent(obj, 'a');
    };
    Color.isColorObject = function (obj) {
        return this.isRgbColorObject(obj);
    };
    Object.defineProperty(Color.prototype, "mode", {
        get: function () {
            return this.mode_;
        },
        enumerable: false,
        configurable: true
    });
    Color.prototype.getComponents = function (opt_mode) {
        return ColorModel.withAlpha(ColorModel.convertMode(ColorModel.withoutAlpha(this.comps_), this.mode_, opt_mode || this.mode_), this.comps_[3]);
    };
    Color.prototype.toRgbaObject = function () {
        var rgbComps = this.getComponents('rgb');
        // tslint:disable:object-literal-sort-keys
        return {
            r: rgbComps[0],
            g: rgbComps[1],
            b: rgbComps[2],
            a: rgbComps[3],
        };
        // tslint:enable:object-literal-sort-keys
    };
    return Color;
}());
exports.Color = Color;


/***/ }),

/***/ "./src/main/js/model/disposable.ts":
/*!*****************************************!*\
  !*** ./src/main/js/model/disposable.ts ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Disposable = void 0;
var emitter_1 = __webpack_require__(/*! ../misc/emitter */ "./src/main/js/misc/emitter.ts");
/**
 * @hidden
 */
var Disposable = /** @class */ (function () {
    function Disposable() {
        this.emitter = new emitter_1.Emitter();
        this.disposed_ = false;
    }
    Object.defineProperty(Disposable.prototype, "disposed", {
        get: function () {
            return this.disposed_;
        },
        enumerable: false,
        configurable: true
    });
    Disposable.prototype.dispose = function () {
        if (this.disposed_) {
            return false;
        }
        this.disposed_ = true;
        this.emitter.emit('dispose', {
            sender: this,
        });
        return true;
    };
    return Disposable;
}());
exports.Disposable = Disposable;


/***/ }),

/***/ "./src/main/js/model/foldable.ts":
/*!***************************************!*\
  !*** ./src/main/js/model/foldable.ts ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Foldable = void 0;
var emitter_1 = __webpack_require__(/*! ../misc/emitter */ "./src/main/js/misc/emitter.ts");
/**
 * @hidden
 */
var Foldable = /** @class */ (function () {
    function Foldable() {
        this.emitter = new emitter_1.Emitter();
        this.expanded_ = false;
    }
    Object.defineProperty(Foldable.prototype, "expanded", {
        get: function () {
            return this.expanded_;
        },
        set: function (expanded) {
            var changed = this.expanded_ !== expanded;
            if (changed) {
                this.expanded_ = expanded;
                this.emitter.emit('change', {
                    sender: this,
                });
            }
        },
        enumerable: false,
        configurable: true
    });
    return Foldable;
}());
exports.Foldable = Foldable;


/***/ }),

/***/ "./src/main/js/model/folder.ts":
/*!*************************************!*\
  !*** ./src/main/js/model/folder.ts ***!
  \*************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Folder = void 0;
var emitter_1 = __webpack_require__(/*! ../misc/emitter */ "./src/main/js/misc/emitter.ts");
var type_util_1 = __webpack_require__(/*! ../misc/type-util */ "./src/main/js/misc/type-util.ts");
/**
 * @hidden
 */
var Folder = /** @class */ (function () {
    function Folder(title, expanded) {
        this.emitter = new emitter_1.Emitter();
        this.expanded_ = expanded;
        this.expandedHeight_ = null;
        this.temporaryExpanded_ = null;
        this.shouldFixHeight_ = false;
        this.title = title;
    }
    Object.defineProperty(Folder.prototype, "expanded", {
        get: function () {
            return this.expanded_;
        },
        set: function (expanded) {
            var changed = this.expanded_ !== expanded;
            if (!changed) {
                return;
            }
            this.emitter.emit('beforechange', {
                propertyName: 'expanded',
                sender: this,
            });
            this.expanded_ = expanded;
            this.emitter.emit('change', {
                propertyName: 'expanded',
                sender: this,
            });
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Folder.prototype, "temporaryExpanded", {
        get: function () {
            return this.temporaryExpanded_;
        },
        set: function (expanded) {
            var changed = this.temporaryExpanded_ !== expanded;
            if (!changed) {
                return;
            }
            this.emitter.emit('beforechange', {
                propertyName: 'temporaryExpanded',
                sender: this,
            });
            this.temporaryExpanded_ = expanded;
            this.emitter.emit('change', {
                propertyName: 'temporaryExpanded',
                sender: this,
            });
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Folder.prototype, "expandedHeight", {
        get: function () {
            return this.expandedHeight_;
        },
        set: function (expandedHeight) {
            var changed = this.expandedHeight_ !== expandedHeight;
            if (!changed) {
                return;
            }
            this.emitter.emit('beforechange', {
                propertyName: 'expandedHeight',
                sender: this,
            });
            this.expandedHeight_ = expandedHeight;
            this.emitter.emit('change', {
                propertyName: 'expandedHeight',
                sender: this,
            });
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Folder.prototype, "shouldFixHeight", {
        get: function () {
            return this.shouldFixHeight_;
        },
        set: function (shouldFixHeight) {
            var changed = this.shouldFixHeight_ !== shouldFixHeight;
            if (!changed) {
                return;
            }
            this.emitter.emit('beforechange', {
                propertyName: 'shouldFixHeight',
                sender: this,
            });
            this.shouldFixHeight_ = shouldFixHeight;
            this.emitter.emit('change', {
                propertyName: 'shouldFixHeight',
                sender: this,
            });
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Folder.prototype, "styleExpanded", {
        get: function () {
            return type_util_1.TypeUtil.getOrDefault(this.temporaryExpanded, this.expanded);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Folder.prototype, "styleHeight", {
        get: function () {
            if (!this.styleExpanded) {
                return '0';
            }
            if (this.shouldFixHeight && !type_util_1.TypeUtil.isEmpty(this.expandedHeight)) {
                return this.expandedHeight + "px";
            }
            return 'auto';
        },
        enumerable: false,
        configurable: true
    });
    return Folder;
}());
exports.Folder = Folder;


/***/ }),

/***/ "./src/main/js/model/graph-cursor.ts":
/*!*******************************************!*\
  !*** ./src/main/js/model/graph-cursor.ts ***!
  \*******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphCursor = void 0;
var emitter_1 = __webpack_require__(/*! ../misc/emitter */ "./src/main/js/misc/emitter.ts");
/**
 * @hidden
 */
var GraphCursor = /** @class */ (function () {
    function GraphCursor() {
        this.emitter = new emitter_1.Emitter();
        this.index_ = -1;
    }
    Object.defineProperty(GraphCursor.prototype, "index", {
        get: function () {
            return this.index_;
        },
        set: function (index) {
            var changed = this.index_ !== index;
            if (changed) {
                this.index_ = index;
                this.emitter.emit('change', {
                    index: index,
                    sender: this,
                });
            }
        },
        enumerable: false,
        configurable: true
    });
    return GraphCursor;
}());
exports.GraphCursor = GraphCursor;


/***/ }),

/***/ "./src/main/js/model/input-value.ts":
/*!******************************************!*\
  !*** ./src/main/js/model/input-value.ts ***!
  \******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.InputValue = void 0;
var emitter_1 = __webpack_require__(/*! ../misc/emitter */ "./src/main/js/misc/emitter.ts");
/**
 * @hidden
 */
var InputValue = /** @class */ (function () {
    function InputValue(initialValue, constraint) {
        this.constraint_ = constraint;
        this.emitter = new emitter_1.Emitter();
        this.rawValue_ = initialValue;
    }
    InputValue.equalsValue = function (v1, v2) {
        return v1 === v2;
    };
    Object.defineProperty(InputValue.prototype, "constraint", {
        get: function () {
            return this.constraint_;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(InputValue.prototype, "rawValue", {
        get: function () {
            return this.rawValue_;
        },
        set: function (rawValue) {
            var constrainedValue = this.constraint_
                ? this.constraint_.constrain(rawValue)
                : rawValue;
            var changed = !InputValue.equalsValue(this.rawValue_, constrainedValue);
            if (changed) {
                this.rawValue_ = constrainedValue;
                this.emitter.emit('change', {
                    rawValue: constrainedValue,
                    sender: this,
                });
            }
        },
        enumerable: false,
        configurable: true
    });
    return InputValue;
}());
exports.InputValue = InputValue;


/***/ }),

/***/ "./src/main/js/model/list.ts":
/*!***********************************!*\
  !*** ./src/main/js/model/list.ts ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.List = void 0;
var emitter_1 = __webpack_require__(/*! ../misc/emitter */ "./src/main/js/misc/emitter.ts");
/**
 * @hidden
 */
var List = /** @class */ (function () {
    function List() {
        this.emitter = new emitter_1.Emitter();
        this.items_ = [];
    }
    Object.defineProperty(List.prototype, "items", {
        get: function () {
            return this.items_;
        },
        enumerable: false,
        configurable: true
    });
    List.prototype.add = function (item, opt_index) {
        var index = opt_index !== undefined ? opt_index : this.items_.length;
        this.items_.splice(index, 0, item);
        this.emitter.emit('add', {
            index: index,
            item: item,
            sender: this,
        });
    };
    List.prototype.remove = function (item) {
        var index = this.items_.indexOf(item);
        if (index < 0) {
            return;
        }
        this.items_.splice(index, 1);
        this.emitter.emit('remove', {
            sender: this,
        });
    };
    return List;
}());
exports.List = List;


/***/ }),

/***/ "./src/main/js/model/model-sync.ts":
/*!*****************************************!*\
  !*** ./src/main/js/model/model-sync.ts ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.connect = void 0;
/**
 * @hidden
 */
function connect(_a) {
    var primary = _a.primary, secondary = _a.secondary;
    primary.emitter(primary.value).on('change', function () {
        primary.apply(primary.value, secondary.value);
    });
    secondary.emitter(secondary.value).on('change', function () {
        secondary.apply(secondary.value, primary.value);
    });
    primary.apply(primary.value, secondary.value);
}
exports.connect = connect;


/***/ }),

/***/ "./src/main/js/model/monitor-value.ts":
/*!********************************************!*\
  !*** ./src/main/js/model/monitor-value.ts ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitorValue = void 0;
var emitter_1 = __webpack_require__(/*! ../misc/emitter */ "./src/main/js/misc/emitter.ts");
/**
 * @hidden
 */
var MonitorValue = /** @class */ (function () {
    function MonitorValue(totalCount) {
        this.emitter = new emitter_1.Emitter();
        this.rawValues_ = [];
        this.totalCount_ = totalCount;
    }
    Object.defineProperty(MonitorValue.prototype, "rawValues", {
        get: function () {
            return this.rawValues_;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MonitorValue.prototype, "totalCount", {
        get: function () {
            return this.totalCount_;
        },
        enumerable: false,
        configurable: true
    });
    MonitorValue.prototype.append = function (rawValue) {
        this.rawValues_.push(rawValue);
        if (this.rawValues_.length > this.totalCount_) {
            this.rawValues_.splice(0, this.rawValues_.length - this.totalCount_);
        }
        this.emitter.emit('update', {
            rawValue: rawValue,
            sender: this,
        });
    };
    return MonitorValue;
}());
exports.MonitorValue = MonitorValue;


/***/ }),

/***/ "./src/main/js/model/picked-color.ts":
/*!*******************************************!*\
  !*** ./src/main/js/model/picked-color.ts ***!
  \*******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.PickedColor = void 0;
var emitter_1 = __webpack_require__(/*! ../misc/emitter */ "./src/main/js/misc/emitter.ts");
var PickedColor = /** @class */ (function () {
    function PickedColor(value) {
        this.onValueChange_ = this.onValueChange_.bind(this);
        this.mode_ = 'rgb';
        this.value = value;
        this.value.emitter.on('change', this.onValueChange_);
        this.emitter = new emitter_1.Emitter();
    }
    Object.defineProperty(PickedColor.prototype, "mode", {
        get: function () {
            return this.mode_;
        },
        set: function (mode) {
            if (this.mode_ === mode) {
                return;
            }
            this.mode_ = mode;
            this.emitter.emit('change', {
                propertyName: 'mode',
                sender: this,
            });
        },
        enumerable: false,
        configurable: true
    });
    PickedColor.prototype.onValueChange_ = function () {
        this.emitter.emit('change', {
            propertyName: 'value',
            sender: this,
        });
    };
    return PickedColor;
}());
exports.PickedColor = PickedColor;


/***/ }),

/***/ "./src/main/js/model/point-2d.ts":
/*!***************************************!*\
  !*** ./src/main/js/model/point-2d.ts ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Point2d = void 0;
var Point2d = /** @class */ (function () {
    function Point2d(x, y) {
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        this.x = x;
        this.y = y;
    }
    Point2d.prototype.getComponents = function () {
        return [this.x, this.y];
    };
    Point2d.prototype.toObject = function () {
        return {
            x: this.x,
            y: this.y,
        };
    };
    return Point2d;
}());
exports.Point2d = Point2d;


/***/ }),

/***/ "./src/main/js/model/target.ts":
/*!*************************************!*\
  !*** ./src/main/js/model/target.ts ***!
  \*************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Target = void 0;
var type_util_1 = __webpack_require__(/*! ../misc/type-util */ "./src/main/js/misc/type-util.ts");
/**
 * @hidden
 */
var Target = /** @class */ (function () {
    function Target(object, key, opt_id) {
        this.obj_ = object;
        this.key_ = key;
        this.presetKey_ = type_util_1.TypeUtil.getOrDefault(opt_id, key);
    }
    Object.defineProperty(Target.prototype, "key", {
        get: function () {
            return this.key_;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Target.prototype, "presetKey", {
        get: function () {
            return this.presetKey_;
        },
        enumerable: false,
        configurable: true
    });
    Target.prototype.read = function () {
        return this.obj_[this.key_];
    };
    Target.prototype.write = function (value) {
        this.obj_[this.key_] = value;
    };
    return Target;
}());
exports.Target = Target;


/***/ }),

/***/ "./src/main/js/model/ui-container.ts":
/*!*******************************************!*\
  !*** ./src/main/js/model/ui-container.ts ***!
  \*******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.UiContainer = void 0;
var folder_1 = __webpack_require__(/*! ../controller/folder */ "./src/main/js/controller/folder.ts");
var input_binding_1 = __webpack_require__(/*! ../controller/input-binding */ "./src/main/js/controller/input-binding.ts");
var monitor_binding_1 = __webpack_require__(/*! ../controller/monitor-binding */ "./src/main/js/controller/monitor-binding.ts");
var emitter_1 = __webpack_require__(/*! ../misc/emitter */ "./src/main/js/misc/emitter.ts");
var list_1 = __webpack_require__(/*! ./list */ "./src/main/js/model/list.ts");
/**
 * @hidden
 */
var UiContainer = /** @class */ (function () {
    function UiContainer() {
        this.onItemFolderFold_ = this.onItemFolderFold_.bind(this);
        this.onListItemLayout_ = this.onListItemLayout_.bind(this);
        this.onSubitemLayout_ = this.onSubitemLayout_.bind(this);
        this.onSubitemFolderFold_ = this.onSubitemFolderFold_.bind(this);
        this.onSubitemInputChange_ = this.onSubitemInputChange_.bind(this);
        this.onSubitemMonitorUpdate_ = this.onSubitemMonitorUpdate_.bind(this);
        this.onItemInputChange_ = this.onItemInputChange_.bind(this);
        this.onListAdd_ = this.onListAdd_.bind(this);
        this.onListItemDispose_ = this.onListItemDispose_.bind(this);
        this.onListRemove_ = this.onListRemove_.bind(this);
        this.onItemMonitorUpdate_ = this.onItemMonitorUpdate_.bind(this);
        this.ucList_ = new list_1.List();
        this.emitter = new emitter_1.Emitter();
        this.ucList_.emitter.on('add', this.onListAdd_);
        this.ucList_.emitter.on('remove', this.onListRemove_);
    }
    Object.defineProperty(UiContainer.prototype, "items", {
        get: function () {
            return this.ucList_.items;
        },
        enumerable: false,
        configurable: true
    });
    UiContainer.prototype.add = function (uc, opt_index) {
        this.ucList_.add(uc, opt_index);
    };
    UiContainer.prototype.onListAdd_ = function (ev) {
        var uc = ev.item;
        this.emitter.emit('add', {
            index: ev.index,
            sender: this,
            uiController: uc,
        });
        uc.viewModel.emitter.on('dispose', this.onListItemDispose_);
        uc.viewModel.emitter.on('change', this.onListItemLayout_);
        if (uc instanceof input_binding_1.InputBindingController) {
            var emitter = uc.binding.emitter;
            // TODO: Find more type-safe way
            emitter.on('change', this.onItemInputChange_);
        }
        else if (uc instanceof monitor_binding_1.MonitorBindingController) {
            var emitter = uc.binding.emitter;
            // TODO: Find more type-safe way
            emitter.on('update', this.onItemMonitorUpdate_);
        }
        else if (uc instanceof folder_1.FolderController) {
            uc.folder.emitter.on('change', this.onItemFolderFold_);
            var emitter = uc.uiContainer.emitter;
            emitter.on('itemfold', this.onSubitemFolderFold_);
            emitter.on('itemlayout', this.onSubitemLayout_);
            emitter.on('inputchange', this.onSubitemInputChange_);
            emitter.on('monitorupdate', this.onSubitemMonitorUpdate_);
        }
    };
    UiContainer.prototype.onListRemove_ = function (_) {
        this.emitter.emit('remove', {
            sender: this,
        });
    };
    UiContainer.prototype.onListItemLayout_ = function (ev) {
        if (ev.propertyName === 'hidden' || ev.propertyName === 'positions') {
            this.emitter.emit('itemlayout', {
                sender: this,
            });
        }
    };
    UiContainer.prototype.onListItemDispose_ = function (_) {
        var _this = this;
        var disposedUcs = this.ucList_.items.filter(function (uc) {
            return uc.viewModel.disposed;
        });
        disposedUcs.forEach(function (uc) {
            _this.ucList_.remove(uc);
        });
    };
    UiContainer.prototype.onItemInputChange_ = function (ev) {
        this.emitter.emit('inputchange', {
            inputBinding: ev.sender,
            sender: this,
            value: ev.rawValue,
        });
    };
    UiContainer.prototype.onItemMonitorUpdate_ = function (ev) {
        this.emitter.emit('monitorupdate', {
            monitorBinding: ev.sender,
            sender: this,
            value: ev.rawValue,
        });
    };
    UiContainer.prototype.onItemFolderFold_ = function (ev) {
        if (ev.propertyName !== 'expanded') {
            return;
        }
        this.emitter.emit('itemfold', {
            expanded: ev.sender.expanded,
            sender: this,
        });
    };
    UiContainer.prototype.onSubitemLayout_ = function (_) {
        this.emitter.emit('itemlayout', {
            sender: this,
        });
    };
    UiContainer.prototype.onSubitemInputChange_ = function (ev) {
        this.emitter.emit('inputchange', {
            inputBinding: ev.inputBinding,
            sender: this,
            value: ev.value,
        });
    };
    UiContainer.prototype.onSubitemMonitorUpdate_ = function (ev) {
        this.emitter.emit('monitorupdate', {
            monitorBinding: ev.monitorBinding,
            sender: this,
            value: ev.value,
        });
    };
    UiContainer.prototype.onSubitemFolderFold_ = function (ev) {
        this.emitter.emit('itemfold', {
            expanded: ev.expanded,
            sender: this,
        });
    };
    return UiContainer;
}());
exports.UiContainer = UiContainer;


/***/ }),

/***/ "./src/main/js/model/view-model.ts":
/*!*****************************************!*\
  !*** ./src/main/js/model/view-model.ts ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ViewModel = void 0;
var emitter_1 = __webpack_require__(/*! ../misc/emitter */ "./src/main/js/misc/emitter.ts");
var type_util_1 = __webpack_require__(/*! ../misc/type-util */ "./src/main/js/misc/type-util.ts");
var disposable_1 = __webpack_require__(/*! ./disposable */ "./src/main/js/model/disposable.ts");
var ViewModel = /** @class */ (function () {
    function ViewModel() {
        this.onDispose_ = this.onDispose_.bind(this);
        this.emitter = new emitter_1.Emitter();
        this.positions_ = [];
        this.hidden_ = false;
        this.disposable_ = new disposable_1.Disposable();
        this.disposable_.emitter.on('dispose', this.onDispose_);
    }
    Object.defineProperty(ViewModel.prototype, "hidden", {
        get: function () {
            return this.hidden_;
        },
        set: function (hidden) {
            if (this.hidden_ === hidden) {
                return;
            }
            this.hidden_ = hidden;
            this.emitter.emit('change', {
                propertyName: 'hidden',
                sender: this,
            });
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ViewModel.prototype, "positions", {
        get: function () {
            return this.positions_;
        },
        set: function (positions) {
            if (type_util_1.TypeUtil.deepEqualsArray(positions, this.positions_)) {
                return;
            }
            this.positions_ = positions;
            this.emitter.emit('change', {
                propertyName: 'positions',
                sender: this,
            });
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ViewModel.prototype, "disposed", {
        get: function () {
            return this.disposable_.disposed;
        },
        enumerable: false,
        configurable: true
    });
    ViewModel.prototype.dispose = function () {
        this.disposable_.dispose();
    };
    ViewModel.prototype.onDispose_ = function () {
        this.emitter.emit('dispose', {
            sender: this,
        });
    };
    return ViewModel;
}());
exports.ViewModel = ViewModel;


/***/ }),

/***/ "./src/main/js/model/view-positions.ts":
/*!*********************************************!*\
  !*** ./src/main/js/model/view-positions.ts ***!
  \*********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.getAll = void 0;
function getAll() {
    return ['first', 'last'];
}
exports.getAll = getAll;


/***/ }),

/***/ "./src/main/js/parser/any-point-2d.ts":
/*!********************************************!*\
  !*** ./src/main/js/parser/any-point-2d.ts ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.AnyPoint2dParser = void 0;
var type_util_1 = __webpack_require__(/*! ../misc/type-util */ "./src/main/js/misc/type-util.ts");
var point_2d_1 = __webpack_require__(/*! ../model/point-2d */ "./src/main/js/model/point-2d.ts");
/**
 * @hidden
 */
exports.AnyPoint2dParser = function (obj) {
    if (type_util_1.TypeUtil.isEmpty(obj)) {
        return null;
    }
    var x = obj.x;
    var y = obj.y;
    if (typeof x !== 'number' || typeof y !== 'number') {
        return null;
    }
    return new point_2d_1.Point2d(x, y);
};


/***/ }),

/***/ "./src/main/js/parser/number-color.ts":
/*!********************************************!*\
  !*** ./src/main/js/parser/number-color.ts ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.RgbaParser = exports.RgbParser = void 0;
var number_util_1 = __webpack_require__(/*! ../misc/number-util */ "./src/main/js/misc/number-util.ts");
var color_1 = __webpack_require__(/*! ../model/color */ "./src/main/js/model/color.ts");
/**
 * @hidden
 */
exports.RgbParser = function (num) {
    return new color_1.Color([(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff], 'rgb');
};
/**
 * @hidden
 */
exports.RgbaParser = function (num) {
    return new color_1.Color([
        (num >> 24) & 0xff,
        (num >> 16) & 0xff,
        (num >> 8) & 0xff,
        number_util_1.NumberUtil.map(num & 0xff, 0, 255, 0, 1),
    ], 'rgb');
};


/***/ }),

/***/ "./src/main/js/parser/string-color.ts":
/*!********************************************!*\
  !*** ./src/main/js/parser/string-color.ts ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.hasAlphaComponent = exports.CompositeParser = exports.getNotation = void 0;
var number_util_1 = __webpack_require__(/*! ../misc/number-util */ "./src/main/js/misc/number-util.ts");
var color_1 = __webpack_require__(/*! ../model/color */ "./src/main/js/model/color.ts");
function parseCssNumberOrPercentage(text, maxValue) {
    var m = text.match(/^(.+)%$/);
    if (!m) {
        return Math.min(parseFloat(text), maxValue);
    }
    return Math.min(parseFloat(m[1]) * 0.01 * maxValue, maxValue);
}
var ANGLE_TO_DEG_MAP = {
    deg: function (angle) { return angle; },
    grad: function (angle) { return (angle * 360) / 400; },
    rad: function (angle) { return (angle * 360) / (2 * Math.PI); },
    turn: function (angle) { return angle * 360; },
};
function parseCssNumberOrAngle(text) {
    var m = text.match(/^([0-9.]+?)(deg|grad|rad|turn)$/);
    if (!m) {
        return parseFloat(text);
    }
    var angle = parseFloat(m[1]);
    var unit = m[2];
    return ANGLE_TO_DEG_MAP[unit](angle);
}
var NOTATION_TO_PARSER_MAP = {
    'func.rgb': function (text) {
        var m = text.match(/^rgb\(\s*([0-9A-Fa-f.]+%?)\s*,\s*([0-9A-Fa-f.]+%?)\s*,\s*([0-9A-Fa-f.]+%?)\s*\)$/);
        if (!m) {
            return null;
        }
        var comps = [
            parseCssNumberOrPercentage(m[1], 255),
            parseCssNumberOrPercentage(m[2], 255),
            parseCssNumberOrPercentage(m[3], 255),
        ];
        if (isNaN(comps[0]) || isNaN(comps[1]) || isNaN(comps[2])) {
            return null;
        }
        return new color_1.Color(comps, 'rgb');
    },
    'func.rgba': function (text) {
        var m = text.match(/^rgba\(\s*([0-9A-Fa-f.]+%?)\s*,\s*([0-9A-Fa-f.]+%?)\s*,\s*([0-9A-Fa-f.]+%?)\s*,\s*([0-9A-Fa-f.]+%?)\s*\)$/);
        if (!m) {
            return null;
        }
        var comps = [
            parseCssNumberOrPercentage(m[1], 255),
            parseCssNumberOrPercentage(m[2], 255),
            parseCssNumberOrPercentage(m[3], 255),
            parseCssNumberOrPercentage(m[4], 1),
        ];
        if (isNaN(comps[0]) ||
            isNaN(comps[1]) ||
            isNaN(comps[2]) ||
            isNaN(comps[3])) {
            return null;
        }
        return new color_1.Color(comps, 'rgb');
    },
    'func.hsl': function (text) {
        var m = text.match(/^hsl\(\s*([0-9A-Fa-f.]+(?:deg|grad|rad|turn)?)\s*,\s*([0-9A-Fa-f.]+%?)\s*,\s*([0-9A-Fa-f.]+%?)\s*\)$/);
        if (!m) {
            return null;
        }
        var comps = [
            parseCssNumberOrAngle(m[1]),
            parseCssNumberOrPercentage(m[2], 100),
            parseCssNumberOrPercentage(m[3], 100),
        ];
        if (isNaN(comps[0]) || isNaN(comps[1]) || isNaN(comps[2])) {
            return null;
        }
        return new color_1.Color(comps, 'hsl');
    },
    'func.hsla': function (text) {
        var m = text.match(/^hsla\(\s*([0-9A-Fa-f.]+(?:deg|grad|rad|turn)?)\s*,\s*([0-9A-Fa-f.]+%?)\s*,\s*([0-9A-Fa-f.]+%?)\s*,\s*([0-9A-Fa-f.]+%?)\s*\)$/);
        if (!m) {
            return null;
        }
        var comps = [
            parseCssNumberOrAngle(m[1]),
            parseCssNumberOrPercentage(m[2], 100),
            parseCssNumberOrPercentage(m[3], 100),
            parseCssNumberOrPercentage(m[4], 1),
        ];
        if (isNaN(comps[0]) ||
            isNaN(comps[1]) ||
            isNaN(comps[2]) ||
            isNaN(comps[3])) {
            return null;
        }
        return new color_1.Color(comps, 'hsl');
    },
    'hex.rgb': function (text) {
        var mRrggbb = text.match(/^#?([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])$/);
        if (mRrggbb) {
            return new color_1.Color([
                parseInt(mRrggbb[1] + mRrggbb[1], 16),
                parseInt(mRrggbb[2] + mRrggbb[2], 16),
                parseInt(mRrggbb[3] + mRrggbb[3], 16),
            ], 'rgb');
        }
        var mRgb = text.match(/^#?([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/);
        if (mRgb) {
            return new color_1.Color([parseInt(mRgb[1], 16), parseInt(mRgb[2], 16), parseInt(mRgb[3], 16)], 'rgb');
        }
        return null;
    },
    'hex.rgba': function (text) {
        var mRrggbb = text.match(/^#?([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])$/);
        if (mRrggbb) {
            return new color_1.Color([
                parseInt(mRrggbb[1] + mRrggbb[1], 16),
                parseInt(mRrggbb[2] + mRrggbb[2], 16),
                parseInt(mRrggbb[3] + mRrggbb[3], 16),
                number_util_1.NumberUtil.map(parseInt(mRrggbb[4] + mRrggbb[4], 16), 0, 255, 0, 1),
            ], 'rgb');
        }
        var mRgb = text.match(/^#?([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/);
        if (mRgb) {
            return new color_1.Color([
                parseInt(mRgb[1], 16),
                parseInt(mRgb[2], 16),
                parseInt(mRgb[3], 16),
                number_util_1.NumberUtil.map(parseInt(mRgb[4], 16), 0, 255, 0, 1),
            ], 'rgb');
        }
        return null;
    },
};
/**
 * @hidden
 */
function getNotation(text) {
    var notations = Object.keys(NOTATION_TO_PARSER_MAP);
    return notations.reduce(function (result, notation) {
        if (result) {
            return result;
        }
        var subparser = NOTATION_TO_PARSER_MAP[notation];
        return subparser(text) ? notation : null;
    }, null);
}
exports.getNotation = getNotation;
/**
 * @hidden
 */
exports.CompositeParser = function (text) {
    var notation = getNotation(text);
    return notation ? NOTATION_TO_PARSER_MAP[notation](text) : null;
};
function hasAlphaComponent(notation) {
    return (notation === 'func.hsla' ||
        notation === 'func.rgba' ||
        notation === 'hex.rgba');
}
exports.hasAlphaComponent = hasAlphaComponent;


/***/ }),

/***/ "./src/main/js/parser/string-number.ts":
/*!*********************************************!*\
  !*** ./src/main/js/parser/string-number.ts ***!
  \*********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.StringNumberParser = void 0;
/**
 * @hidden
 */
exports.StringNumberParser = function (text) {
    var num = parseFloat(text);
    if (isNaN(num)) {
        return null;
    }
    return num;
};


/***/ }),

/***/ "./src/main/js/tweakpane-without-style.ts":
/*!************************************************!*\
  !*** ./src/main/js/tweakpane-without-style.ts ***!
  \************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TweakpaneWithoutStyle = void 0;
var root_1 = __webpack_require__(/*! ./api/root */ "./src/main/js/api/root.ts");
var root_2 = __webpack_require__(/*! ./controller/root */ "./src/main/js/controller/root.ts");
var class_name_1 = __webpack_require__(/*! ./misc/class-name */ "./src/main/js/misc/class-name.ts");
var DomUtil = __webpack_require__(/*! ./misc/dom-util */ "./src/main/js/misc/dom-util.ts");
var pane_error_1 = __webpack_require__(/*! ./misc/pane-error */ "./src/main/js/misc/pane-error.ts");
var type_util_1 = __webpack_require__(/*! ./misc/type-util */ "./src/main/js/misc/type-util.ts");
var view_model_1 = __webpack_require__(/*! ./model/view-model */ "./src/main/js/model/view-model.ts");
function createDefaultWrapperElement(document) {
    var elem = document.createElement('div');
    elem.classList.add(class_name_1.ClassName('dfw')());
    if (document.body) {
        document.body.appendChild(elem);
    }
    return elem;
}
var TweakpaneWithoutStyle = /** @class */ (function (_super) {
    __extends(TweakpaneWithoutStyle, _super);
    function TweakpaneWithoutStyle(opt_config) {
        var _this = this;
        var config = opt_config || {};
        var document = type_util_1.TypeUtil.getOrDefault(config.document, DomUtil.getWindowDocument());
        var rootController = new root_2.RootController(document, {
            viewModel: new view_model_1.ViewModel(),
            title: config.title,
        });
        _this = _super.call(this, rootController) || this;
        _this.containerElem_ =
            config.container || createDefaultWrapperElement(document);
        _this.containerElem_.appendChild(_this.element);
        _this.doc_ = document;
        _this.usesDefaultWrapper_ = !config.container;
        return _this;
    }
    TweakpaneWithoutStyle.prototype.dispose = function () {
        var containerElem = this.containerElem_;
        if (!containerElem) {
            throw pane_error_1.PaneError.alreadyDisposed();
        }
        if (this.usesDefaultWrapper_) {
            var parentElem = containerElem.parentElement;
            if (parentElem) {
                parentElem.removeChild(containerElem);
            }
        }
        this.containerElem_ = null;
        this.doc_ = null;
        _super.prototype.dispose.call(this);
    };
    Object.defineProperty(TweakpaneWithoutStyle.prototype, "document", {
        get: function () {
            if (!this.doc_) {
                throw pane_error_1.PaneError.alreadyDisposed();
            }
            return this.doc_;
        },
        enumerable: false,
        configurable: true
    });
    return TweakpaneWithoutStyle;
}(root_1.RootApi));
exports.TweakpaneWithoutStyle = TweakpaneWithoutStyle;


/***/ }),

/***/ "./src/main/js/view/button.ts":
/*!************************************!*\
  !*** ./src/main/js/view/button.ts ***!
  \************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ButtonView = void 0;
var class_name_1 = __webpack_require__(/*! ../misc/class-name */ "./src/main/js/misc/class-name.ts");
var DisposingUtil = __webpack_require__(/*! ../misc/disposing-util */ "./src/main/js/misc/disposing-util.ts");
var pane_error_1 = __webpack_require__(/*! ../misc/pane-error */ "./src/main/js/misc/pane-error.ts");
var view_1 = __webpack_require__(/*! ./view */ "./src/main/js/view/view.ts");
var className = class_name_1.ClassName('btn');
/**
 * @hidden
 */
var ButtonView = /** @class */ (function (_super) {
    __extends(ButtonView, _super);
    function ButtonView(document, config) {
        var _this = _super.call(this, document, config) || this;
        _this.button = config.button;
        _this.element.classList.add(className());
        var buttonElem = document.createElement('button');
        buttonElem.classList.add(className('b'));
        buttonElem.textContent = _this.button.title;
        _this.element.appendChild(buttonElem);
        _this.buttonElem_ = buttonElem;
        config.model.emitter.on('dispose', function () {
            _this.buttonElem_ = DisposingUtil.disposeElement(_this.buttonElem_);
        });
        return _this;
    }
    Object.defineProperty(ButtonView.prototype, "buttonElement", {
        get: function () {
            if (!this.buttonElem_) {
                throw pane_error_1.PaneError.alreadyDisposed();
            }
            return this.buttonElem_;
        },
        enumerable: false,
        configurable: true
    });
    return ButtonView;
}(view_1.View));
exports.ButtonView = ButtonView;


/***/ }),

/***/ "./src/main/js/view/folder.ts":
/*!************************************!*\
  !*** ./src/main/js/view/folder.ts ***!
  \************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FolderView = void 0;
var class_name_1 = __webpack_require__(/*! ../misc/class-name */ "./src/main/js/misc/class-name.ts");
var DisposingUtil = __webpack_require__(/*! ../misc/disposing-util */ "./src/main/js/misc/disposing-util.ts");
var pane_error_1 = __webpack_require__(/*! ../misc/pane-error */ "./src/main/js/misc/pane-error.ts");
var view_1 = __webpack_require__(/*! ./view */ "./src/main/js/view/view.ts");
var className = class_name_1.ClassName('fld');
/**
 * @hidden
 */
var FolderView = /** @class */ (function (_super) {
    __extends(FolderView, _super);
    function FolderView(document, config) {
        var _this = _super.call(this, document, config) || this;
        _this.onFolderChange_ = _this.onFolderChange_.bind(_this);
        _this.folder_ = config.folder;
        _this.folder_.emitter.on('change', _this.onFolderChange_);
        _this.element.classList.add(className());
        var titleElem = document.createElement('button');
        titleElem.classList.add(className('t'));
        titleElem.textContent = _this.folder_.title;
        _this.element.appendChild(titleElem);
        _this.titleElem_ = titleElem;
        var markElem = document.createElement('div');
        markElem.classList.add(className('m'));
        _this.titleElem_.appendChild(markElem);
        var containerElem = document.createElement('div');
        containerElem.classList.add(className('c'));
        _this.element.appendChild(containerElem);
        _this.containerElem_ = containerElem;
        _this.applyModel_();
        config.model.emitter.on('dispose', function () {
            _this.containerElem_ = DisposingUtil.disposeElement(_this.containerElem_);
            _this.titleElem_ = DisposingUtil.disposeElement(_this.titleElem_);
        });
        return _this;
    }
    Object.defineProperty(FolderView.prototype, "titleElement", {
        get: function () {
            if (!this.titleElem_) {
                throw pane_error_1.PaneError.alreadyDisposed();
            }
            return this.titleElem_;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FolderView.prototype, "containerElement", {
        get: function () {
            if (!this.containerElem_) {
                throw pane_error_1.PaneError.alreadyDisposed();
            }
            return this.containerElem_;
        },
        enumerable: false,
        configurable: true
    });
    FolderView.prototype.applyModel_ = function () {
        var containerElem = this.containerElem_;
        if (!containerElem) {
            throw pane_error_1.PaneError.alreadyDisposed();
        }
        var expanded = this.folder_.styleExpanded;
        var expandedClass = className(undefined, 'expanded');
        if (expanded) {
            this.element.classList.add(expandedClass);
        }
        else {
            this.element.classList.remove(expandedClass);
        }
        containerElem.style.height = this.folder_.styleHeight;
    };
    FolderView.prototype.onFolderChange_ = function () {
        this.applyModel_();
    };
    return FolderView;
}(view_1.View));
exports.FolderView = FolderView;


/***/ }),

/***/ "./src/main/js/view/input/a-palette.ts":
/*!*********************************************!*\
  !*** ./src/main/js/view/input/a-palette.ts ***!
  \*********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.APaletteInputView = void 0;
var ColorConverter = __webpack_require__(/*! ../../converter/color */ "./src/main/js/converter/color.ts");
var class_name_1 = __webpack_require__(/*! ../../misc/class-name */ "./src/main/js/misc/class-name.ts");
var ColorModel = __webpack_require__(/*! ../../misc/color-model */ "./src/main/js/misc/color-model.ts");
var DisposingUtil = __webpack_require__(/*! ../../misc/disposing-util */ "./src/main/js/misc/disposing-util.ts");
var DomUtil = __webpack_require__(/*! ../../misc/dom-util */ "./src/main/js/misc/dom-util.ts");
var number_util_1 = __webpack_require__(/*! ../../misc/number-util */ "./src/main/js/misc/number-util.ts");
var pane_error_1 = __webpack_require__(/*! ../../misc/pane-error */ "./src/main/js/misc/pane-error.ts");
var color_1 = __webpack_require__(/*! ../../model/color */ "./src/main/js/model/color.ts");
var view_1 = __webpack_require__(/*! ../view */ "./src/main/js/view/view.ts");
var className = class_name_1.ClassName('apl', 'input');
/**
 * @hidden
 */
var APaletteInputView = /** @class */ (function (_super) {
    __extends(APaletteInputView, _super);
    function APaletteInputView(document, config) {
        var _this = _super.call(this, document, config) || this;
        _this.onValueChange_ = _this.onValueChange_.bind(_this);
        _this.value = config.value;
        _this.value.emitter.on('change', _this.onValueChange_);
        _this.element.classList.add(className());
        _this.element.tabIndex = 0;
        var canvasElem = document.createElement('canvas');
        canvasElem.classList.add(className('c'));
        _this.element.appendChild(canvasElem);
        _this.canvasElem_ = canvasElem;
        var markerElem = document.createElement('div');
        markerElem.classList.add(className('m'));
        _this.element.appendChild(markerElem);
        _this.markerElem_ = markerElem;
        var previewElem = document.createElement('div');
        previewElem.classList.add(className('p'));
        _this.markerElem_.appendChild(previewElem);
        _this.previewElem_ = previewElem;
        _this.update();
        config.model.emitter.on('dispose', function () {
            _this.canvasElem_ = DisposingUtil.disposeElement(_this.canvasElem_);
            _this.markerElem_ = DisposingUtil.disposeElement(_this.markerElem_);
        });
        return _this;
    }
    Object.defineProperty(APaletteInputView.prototype, "canvasElement", {
        get: function () {
            if (!this.canvasElem_) {
                throw pane_error_1.PaneError.alreadyDisposed();
            }
            return this.canvasElem_;
        },
        enumerable: false,
        configurable: true
    });
    APaletteInputView.prototype.update = function () {
        if (!this.markerElem_ || !this.previewElem_) {
            throw pane_error_1.PaneError.alreadyDisposed();
        }
        var ctx = DomUtil.getCanvasContext(this.canvasElement);
        if (!ctx) {
            return;
        }
        var width = this.canvasElement.width;
        var height = this.canvasElement.height;
        ctx.clearRect(0, 0, width, height);
        var c = this.value.rawValue;
        var hsvComps = c.getComponents('hsv');
        var cellCount = 64;
        var cw = Math.ceil(width / cellCount);
        for (var ix = 0; ix < cellCount; ix++) {
            var alpha = number_util_1.NumberUtil.map(ix, 0, cellCount - 1, 0, 1);
            ctx.fillStyle = ColorConverter.toFunctionalRgbaString(new color_1.Color(ColorModel.withAlpha(ColorModel.withoutAlpha(hsvComps), alpha), 'hsv'));
            var x = Math.floor(number_util_1.NumberUtil.map(ix, 0, cellCount - 1, 0, width - cw));
            var nx = ix < cellCount - 1
                ? Math.floor(number_util_1.NumberUtil.map(ix + 1, 0, cellCount - 1, 0, width - cw))
                : width;
            ctx.fillRect(x, 0, nx - x, height);
        }
        this.previewElem_.style.backgroundColor = ColorConverter.toFunctionalRgbaString(c);
        var left = number_util_1.NumberUtil.map(hsvComps[3], 0, 1, 0, 100);
        this.markerElem_.style.left = left + "%";
    };
    APaletteInputView.prototype.onValueChange_ = function () {
        this.update();
    };
    return APaletteInputView;
}(view_1.View));
exports.APaletteInputView = APaletteInputView;


/***/ }),

/***/ "./src/main/js/view/input/checkbox.ts":
/*!********************************************!*\
  !*** ./src/main/js/view/input/checkbox.ts ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckboxInputView = void 0;
var class_name_1 = __webpack_require__(/*! ../../misc/class-name */ "./src/main/js/misc/class-name.ts");
var DisposingUtil = __webpack_require__(/*! ../../misc/disposing-util */ "./src/main/js/misc/disposing-util.ts");
var pane_error_1 = __webpack_require__(/*! ../../misc/pane-error */ "./src/main/js/misc/pane-error.ts");
var view_1 = __webpack_require__(/*! ../view */ "./src/main/js/view/view.ts");
var className = class_name_1.ClassName('ckb', 'input');
/**
 * @hidden
 */
var CheckboxInputView = /** @class */ (function (_super) {
    __extends(CheckboxInputView, _super);
    function CheckboxInputView(document, config) {
        var _this = _super.call(this, document, config) || this;
        _this.onValueChange_ = _this.onValueChange_.bind(_this);
        _this.element.classList.add(className());
        var labelElem = document.createElement('label');
        labelElem.classList.add(className('l'));
        _this.element.appendChild(labelElem);
        var inputElem = document.createElement('input');
        inputElem.classList.add(className('i'));
        inputElem.type = 'checkbox';
        labelElem.appendChild(inputElem);
        _this.inputElem_ = inputElem;
        var markElem = document.createElement('div');
        markElem.classList.add(className('m'));
        labelElem.appendChild(markElem);
        config.value.emitter.on('change', _this.onValueChange_);
        _this.value = config.value;
        _this.update();
        config.model.emitter.on('dispose', function () {
            _this.inputElem_ = DisposingUtil.disposeElement(_this.inputElem_);
        });
        return _this;
    }
    Object.defineProperty(CheckboxInputView.prototype, "inputElement", {
        get: function () {
            if (!this.inputElem_) {
                throw pane_error_1.PaneError.alreadyDisposed();
            }
            return this.inputElem_;
        },
        enumerable: false,
        configurable: true
    });
    CheckboxInputView.prototype.update = function () {
        if (!this.inputElem_) {
            throw pane_error_1.PaneError.alreadyDisposed();
        }
        this.inputElem_.checked = this.value.rawValue;
    };
    CheckboxInputView.prototype.onValueChange_ = function () {
        this.update();
    };
    return CheckboxInputView;
}(view_1.View));
exports.CheckboxInputView = CheckboxInputView;


/***/ }),

/***/ "./src/main/js/view/input/color-component-texts.ts":
/*!*********************************************************!*\
  !*** ./src/main/js/view/input/color-component-texts.ts ***!
  \*********************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColorComponentTextsInputView = void 0;
var number_1 = __webpack_require__(/*! ../../formatter/number */ "./src/main/js/formatter/number.ts");
var class_name_1 = __webpack_require__(/*! ../../misc/class-name */ "./src/main/js/misc/class-name.ts");
var DisposingUtil = __webpack_require__(/*! ../../misc/disposing-util */ "./src/main/js/misc/disposing-util.ts");
var pane_error_1 = __webpack_require__(/*! ../../misc/pane-error */ "./src/main/js/misc/pane-error.ts");
var view_1 = __webpack_require__(/*! ../view */ "./src/main/js/view/view.ts");
var className = class_name_1.ClassName('cctxts', 'input');
var FORMATTER = new number_1.NumberFormatter(0);
function createModeSelectElement(document) {
    var selectElem = document.createElement('select');
    var items = [
        { text: 'RGB', value: 'rgb' },
        { text: 'HSL', value: 'hsl' },
        { text: 'HSV', value: 'hsv' },
    ];
    selectElem.appendChild(items.reduce(function (frag, item) {
        var optElem = document.createElement('option');
        optElem.textContent = item.text;
        optElem.value = item.value;
        frag.appendChild(optElem);
        return frag;
    }, document.createDocumentFragment()));
    return selectElem;
}
/**
 * @hidden
 */
var ColorComponentTextsInputView = /** @class */ (function (_super) {
    __extends(ColorComponentTextsInputView, _super);
    function ColorComponentTextsInputView(document, config) {
        var _this = _super.call(this, document, config) || this;
        _this.onValueChange_ = _this.onValueChange_.bind(_this);
        _this.element.classList.add(className());
        var modeElem = document.createElement('div');
        modeElem.classList.add(className('m'));
        _this.modeSelectElement = createModeSelectElement(document);
        _this.modeSelectElement.classList.add(className('ms'));
        modeElem.appendChild(_this.modeSelectElement);
        var modeMarkerElem = document.createElement('div');
        modeMarkerElem.classList.add(className('mm'));
        modeElem.appendChild(modeMarkerElem);
        _this.element.appendChild(modeElem);
        var wrapperElem = document.createElement('div');
        wrapperElem.classList.add(className('w'));
        _this.element.appendChild(wrapperElem);
        var inputElems = [0, 1, 2].map(function () {
            var inputElem = document.createElement('input');
            inputElem.classList.add(className('i'));
            inputElem.type = 'text';
            return inputElem;
        });
        inputElems.forEach(function (elem) {
            wrapperElem.appendChild(elem);
        });
        _this.inputElems_ = [inputElems[0], inputElems[1], inputElems[2]];
        _this.pickedColor = config.pickedColor;
        _this.pickedColor.emitter.on('change', _this.onValueChange_);
        _this.update();
        config.model.emitter.on('dispose', function () {
            if (_this.inputElems_) {
                _this.inputElems_.forEach(function (elem) {
                    DisposingUtil.disposeElement(elem);
                });
                _this.inputElems_ = null;
            }
        });
        return _this;
    }
    Object.defineProperty(ColorComponentTextsInputView.prototype, "inputElements", {
        get: function () {
            if (!this.inputElems_) {
                throw pane_error_1.PaneError.alreadyDisposed();
            }
            return this.inputElems_;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ColorComponentTextsInputView.prototype, "value", {
        get: function () {
            return this.pickedColor.value;
        },
        enumerable: false,
        configurable: true
    });
    ColorComponentTextsInputView.prototype.update = function () {
        var inputElems = this.inputElems_;
        if (!inputElems) {
            throw pane_error_1.PaneError.alreadyDisposed();
        }
        var comps = this.pickedColor.value.rawValue.getComponents(this.pickedColor.mode);
        comps.forEach(function (comp, index) {
            var inputElem = inputElems[index];
            if (!inputElem) {
                return;
            }
            inputElem.value = FORMATTER.format(comp);
        });
    };
    ColorComponentTextsInputView.prototype.onValueChange_ = function () {
        this.update();
    };
    return ColorComponentTextsInputView;
}(view_1.View));
exports.ColorComponentTextsInputView = ColorComponentTextsInputView;


/***/ }),

/***/ "./src/main/js/view/input/color-picker.ts":
/*!************************************************!*\
  !*** ./src/main/js/view/input/color-picker.ts ***!
  \************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColorPickerInputView = void 0;
var class_name_1 = __webpack_require__(/*! ../../misc/class-name */ "./src/main/js/misc/class-name.ts");
var type_util_1 = __webpack_require__(/*! ../../misc/type-util */ "./src/main/js/misc/type-util.ts");
var view_1 = __webpack_require__(/*! ../view */ "./src/main/js/view/view.ts");
var className = class_name_1.ClassName('clp', 'input');
/**
 * @hidden
 */
var ColorPickerInputView = /** @class */ (function (_super) {
    __extends(ColorPickerInputView, _super);
    function ColorPickerInputView(document, config) {
        var _this = _super.call(this, document, config) || this;
        _this.onFoldableChange_ = _this.onFoldableChange_.bind(_this);
        _this.onValueChange_ = _this.onValueChange_.bind(_this);
        _this.pickedColor = config.pickedColor;
        _this.pickedColor.value.emitter.on('change', _this.onValueChange_);
        _this.foldable = config.foldable;
        _this.foldable.emitter.on('change', _this.onFoldableChange_);
        _this.element.classList.add(className());
        var hsvElem = document.createElement('div');
        hsvElem.classList.add(className('hsv'));
        var svElem = document.createElement('div');
        svElem.classList.add(className('sv'));
        _this.svPaletteView_ = config.svPaletteInputView;
        svElem.appendChild(_this.svPaletteView_.element);
        hsvElem.appendChild(svElem);
        var hElem = document.createElement('div');
        hElem.classList.add(className('h'));
        _this.hPaletteView_ = config.hPaletteInputView;
        hElem.appendChild(_this.hPaletteView_.element);
        hsvElem.appendChild(hElem);
        _this.element.appendChild(hsvElem);
        var rgbElem = document.createElement('div');
        rgbElem.classList.add(className('rgb'));
        _this.compTextsView_ = config.componentTextsView;
        rgbElem.appendChild(_this.compTextsView_.element);
        _this.element.appendChild(rgbElem);
        if (config.alphaInputViews) {
            _this.alphaViews_ = {
                palette: config.alphaInputViews.palette,
                text: config.alphaInputViews.text,
            };
            var aElem = document.createElement('div');
            aElem.classList.add(className('a'));
            var apElem = document.createElement('div');
            apElem.classList.add(className('ap'));
            apElem.appendChild(_this.alphaViews_.palette.element);
            aElem.appendChild(apElem);
            var atElem = document.createElement('div');
            atElem.classList.add(className('at'));
            atElem.appendChild(_this.alphaViews_.text.element);
            aElem.appendChild(atElem);
            _this.element.appendChild(aElem);
        }
        _this.update();
        return _this;
    }
    Object.defineProperty(ColorPickerInputView.prototype, "allFocusableElements", {
        get: function () {
            var elems = __spreadArrays([
                this.svPaletteView_.element,
                this.hPaletteView_.element
            ], this.compTextsView_.inputElements);
            if (this.alphaViews_) {
                elems.push(this.alphaViews_.palette.element, this.alphaViews_.text.inputElement);
            }
            return type_util_1.TypeUtil.forceCast(elems);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ColorPickerInputView.prototype, "value", {
        get: function () {
            return this.pickedColor.value;
        },
        enumerable: false,
        configurable: true
    });
    ColorPickerInputView.prototype.update = function () {
        if (this.foldable.expanded) {
            this.element.classList.add(className(undefined, 'expanded'));
        }
        else {
            this.element.classList.remove(className(undefined, 'expanded'));
        }
    };
    ColorPickerInputView.prototype.onValueChange_ = function () {
        this.update();
    };
    ColorPickerInputView.prototype.onFoldableChange_ = function () {
        this.update();
    };
    return ColorPickerInputView;
}(view_1.View));
exports.ColorPickerInputView = ColorPickerInputView;


/***/ }),

/***/ "./src/main/js/view/input/color-swatch-text.ts":
/*!*****************************************************!*\
  !*** ./src/main/js/view/input/color-swatch-text.ts ***!
  \*****************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColorSwatchTextInputView = void 0;
var class_name_1 = __webpack_require__(/*! ../../misc/class-name */ "./src/main/js/misc/class-name.ts");
var view_1 = __webpack_require__(/*! ../view */ "./src/main/js/view/view.ts");
var className = class_name_1.ClassName('cswtxt', 'input');
/**
 * @hidden
 */
var ColorSwatchTextInputView = /** @class */ (function (_super) {
    __extends(ColorSwatchTextInputView, _super);
    function ColorSwatchTextInputView(document, config) {
        var _this = _super.call(this, document, config) || this;
        _this.element.classList.add(className());
        var swatchElem = document.createElement('div');
        swatchElem.classList.add(className('s'));
        _this.swatchInputView_ = config.swatchInputView;
        swatchElem.appendChild(_this.swatchInputView_.element);
        _this.element.appendChild(swatchElem);
        var textElem = document.createElement('div');
        textElem.classList.add(className('t'));
        _this.textInputView = config.textInputView;
        textElem.appendChild(_this.textInputView.element);
        _this.element.appendChild(textElem);
        return _this;
    }
    Object.defineProperty(ColorSwatchTextInputView.prototype, "value", {
        get: function () {
            return this.textInputView.value;
        },
        enumerable: false,
        configurable: true
    });
    ColorSwatchTextInputView.prototype.update = function () {
        this.swatchInputView_.update();
        this.textInputView.update();
    };
    return ColorSwatchTextInputView;
}(view_1.View));
exports.ColorSwatchTextInputView = ColorSwatchTextInputView;


/***/ }),

/***/ "./src/main/js/view/input/color-swatch.ts":
/*!************************************************!*\
  !*** ./src/main/js/view/input/color-swatch.ts ***!
  \************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColorSwatchInputView = void 0;
var ColorConverter = __webpack_require__(/*! ../../converter/color */ "./src/main/js/converter/color.ts");
var class_name_1 = __webpack_require__(/*! ../../misc/class-name */ "./src/main/js/misc/class-name.ts");
var DisposingUtil = __webpack_require__(/*! ../../misc/disposing-util */ "./src/main/js/misc/disposing-util.ts");
var pane_error_1 = __webpack_require__(/*! ../../misc/pane-error */ "./src/main/js/misc/pane-error.ts");
var view_1 = __webpack_require__(/*! ../view */ "./src/main/js/view/view.ts");
var className = class_name_1.ClassName('csw', 'input');
/**
 * @hidden
 */
var ColorSwatchInputView = /** @class */ (function (_super) {
    __extends(ColorSwatchInputView, _super);
    function ColorSwatchInputView(document, config) {
        var _this = _super.call(this, document, config) || this;
        if (_this.element === null) {
            throw pane_error_1.PaneError.alreadyDisposed();
        }
        _this.onValueChange_ = _this.onValueChange_.bind(_this);
        config.value.emitter.on('change', _this.onValueChange_);
        _this.value = config.value;
        _this.element.classList.add(className());
        var swatchElem = document.createElement('div');
        swatchElem.classList.add(className('sw'));
        _this.element.appendChild(swatchElem);
        _this.swatchElem_ = swatchElem;
        var buttonElem = document.createElement('button');
        buttonElem.classList.add(className('b'));
        _this.element.appendChild(buttonElem);
        _this.buttonElem_ = buttonElem;
        var pickerElem = document.createElement('div');
        pickerElem.classList.add(className('p'));
        _this.pickerView_ = config.pickerInputView;
        pickerElem.appendChild(_this.pickerView_.element);
        _this.element.appendChild(pickerElem);
        _this.update();
        config.model.emitter.on('dispose', function () {
            _this.buttonElem_ = DisposingUtil.disposeElement(_this.buttonElem_);
            _this.swatchElem_ = DisposingUtil.disposeElement(_this.swatchElem_);
        });
        return _this;
    }
    Object.defineProperty(ColorSwatchInputView.prototype, "buttonElement", {
        get: function () {
            if (this.buttonElem_ === null) {
                throw pane_error_1.PaneError.alreadyDisposed();
            }
            return this.buttonElem_;
        },
        enumerable: false,
        configurable: true
    });
    ColorSwatchInputView.prototype.update = function () {
        if (!this.swatchElem_) {
            throw pane_error_1.PaneError.alreadyDisposed();
        }
        var value = this.value.rawValue;
        this.swatchElem_.style.backgroundColor = ColorConverter.toHexRgbaString(value);
    };
    ColorSwatchInputView.prototype.onValueChange_ = function () {
        this.update();
    };
    return ColorSwatchInputView;
}(view_1.View));
exports.ColorSwatchInputView = ColorSwatchInputView;


/***/ }),

/***/ "./src/main/js/view/input/h-palette.ts":
/*!*********************************************!*\
  !*** ./src/main/js/view/input/h-palette.ts ***!
  \*********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HPaletteInputView = void 0;
var ColorConverter = __webpack_require__(/*! ../../converter/color */ "./src/main/js/converter/color.ts");
var class_name_1 = __webpack_require__(/*! ../../misc/class-name */ "./src/main/js/misc/class-name.ts");
var DisposingUtil = __webpack_require__(/*! ../../misc/disposing-util */ "./src/main/js/misc/disposing-util.ts");
var DomUtil = __webpack_require__(/*! ../../misc/dom-util */ "./src/main/js/misc/dom-util.ts");
var number_util_1 = __webpack_require__(/*! ../../misc/number-util */ "./src/main/js/misc/number-util.ts");
var pane_error_1 = __webpack_require__(/*! ../../misc/pane-error */ "./src/main/js/misc/pane-error.ts");
var color_1 = __webpack_require__(/*! ../../model/color */ "./src/main/js/model/color.ts");
var view_1 = __webpack_require__(/*! ../view */ "./src/main/js/view/view.ts");
var className = class_name_1.ClassName('hpl', 'input');
/**
 * @hidden
 */
var HPaletteInputView = /** @class */ (function (_super) {
    __extends(HPaletteInputView, _super);
    function HPaletteInputView(document, config) {
        var _this = _super.call(this, document, config) || this;
        _this.onValueChange_ = _this.onValueChange_.bind(_this);
        _this.value = config.value;
        _this.value.emitter.on('change', _this.onValueChange_);
        _this.element.classList.add(className());
        _this.element.tabIndex = 0;
        var canvasElem = document.createElement('canvas');
        canvasElem.classList.add(className('c'));
        _this.element.appendChild(canvasElem);
        _this.canvasElem_ = canvasElem;
        var markerElem = document.createElement('div');
        markerElem.classList.add(className('m'));
        _this.element.appendChild(markerElem);
        _this.markerElem_ = markerElem;
        _this.update();
        config.model.emitter.on('dispose', function () {
            _this.canvasElem_ = DisposingUtil.disposeElement(_this.canvasElem_);
            _this.markerElem_ = DisposingUtil.disposeElement(_this.markerElem_);
        });
        return _this;
    }
    Object.defineProperty(HPaletteInputView.prototype, "canvasElement", {
        get: function () {
            if (!this.canvasElem_) {
                throw pane_error_1.PaneError.alreadyDisposed();
            }
            return this.canvasElem_;
        },
        enumerable: false,
        configurable: true
    });
    HPaletteInputView.prototype.update = function () {
        if (!this.markerElem_) {
            throw pane_error_1.PaneError.alreadyDisposed();
        }
        var ctx = DomUtil.getCanvasContext(this.canvasElement);
        if (!ctx) {
            return;
        }
        var width = this.canvasElement.width;
        var height = this.canvasElement.height;
        var cellCount = 64;
        var cw = Math.ceil(width / cellCount);
        for (var ix = 0; ix < cellCount; ix++) {
            var hue = number_util_1.NumberUtil.map(ix, 0, cellCount - 1, 0, 360);
            ctx.fillStyle = ColorConverter.toFunctionalRgbString(new color_1.Color([hue, 100, 100], 'hsv'));
            var x = Math.floor(number_util_1.NumberUtil.map(ix, 0, cellCount - 1, 0, width - cw));
            ctx.fillRect(x, 0, cw, height);
        }
        var c = this.value.rawValue;
        var h = c.getComponents('hsv')[0];
        this.markerElem_.style.backgroundColor = ColorConverter.toFunctionalRgbString(new color_1.Color([h, 100, 100], 'hsv'));
        var left = number_util_1.NumberUtil.map(h, 0, 360, 0, 100);
        this.markerElem_.style.left = left + "%";
    };
    HPaletteInputView.prototype.onValueChange_ = function () {
        this.update();
    };
    return HPaletteInputView;
}(view_1.View));
exports.HPaletteInputView = HPaletteInputView;


/***/ }),

/***/ "./src/main/js/view/input/list.ts":
/*!****************************************!*\
  !*** ./src/main/js/view/input/list.ts ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListInputView = void 0;
var class_name_1 = __webpack_require__(/*! ../../misc/class-name */ "./src/main/js/misc/class-name.ts");
var DisposingUtil = __webpack_require__(/*! ../../misc/disposing-util */ "./src/main/js/misc/disposing-util.ts");
var pane_error_1 = __webpack_require__(/*! ../../misc/pane-error */ "./src/main/js/misc/pane-error.ts");
var view_1 = __webpack_require__(/*! ../view */ "./src/main/js/view/view.ts");
var className = class_name_1.ClassName('lst', 'input');
/**
 * @hidden
 */
var ListInputView = /** @class */ (function (_super) {
    __extends(ListInputView, _super);
    function ListInputView(document, config) {
        var _this = _super.call(this, document, config) || this;
        _this.onValueChange_ = _this.onValueChange_.bind(_this);
        _this.element.classList.add(className());
        _this.stringifyValue_ = config.stringifyValue;
        var selectElem = document.createElement('select');
        selectElem.classList.add(className('s'));
        config.options.forEach(function (item, index) {
            var optionElem = document.createElement('option');
            optionElem.dataset.index = String(index);
            optionElem.textContent = item.text;
            optionElem.value = _this.stringifyValue_(item.value);
            selectElem.appendChild(optionElem);
        });
        _this.element.appendChild(selectElem);
        _this.selectElem_ = selectElem;
        var markElem = document.createElement('div');
        markElem.classList.add(className('m'));
        _this.element.appendChild(markElem);
        config.value.emitter.on('change', _this.onValueChange_);
        _this.value = config.value;
        _this.update();
        config.model.emitter.on('dispose', function () {
            _this.selectElem_ = DisposingUtil.disposeElement(_this.selectElem_);
        });
        return _this;
    }
    Object.defineProperty(ListInputView.prototype, "selectElement", {
        get: function () {
            if (!this.selectElem_) {
                throw pane_error_1.PaneError.alreadyDisposed();
            }
            return this.selectElem_;
        },
        enumerable: false,
        configurable: true
    });
    ListInputView.prototype.update = function () {
        if (!this.selectElem_) {
            throw pane_error_1.PaneError.alreadyDisposed();
        }
        this.selectElem_.value = this.stringifyValue_(this.value.rawValue);
    };
    ListInputView.prototype.onValueChange_ = function () {
        this.update();
    };
    return ListInputView;
}(view_1.View));
exports.ListInputView = ListInputView;


/***/ }),

/***/ "./src/main/js/view/input/point-2d-pad-text.ts":
/*!*****************************************************!*\
  !*** ./src/main/js/view/input/point-2d-pad-text.ts ***!
  \*****************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Point2dPadTextInputView = void 0;
var class_name_1 = __webpack_require__(/*! ../../misc/class-name */ "./src/main/js/misc/class-name.ts");
var DomUtil = __webpack_require__(/*! ../../misc/dom-util */ "./src/main/js/misc/dom-util.ts");
var view_1 = __webpack_require__(/*! ../view */ "./src/main/js/view/view.ts");
var className = class_name_1.ClassName('p2dpadtxt', 'input');
/**
 * @hidden
 */
var Point2dPadTextInputView = /** @class */ (function (_super) {
    __extends(Point2dPadTextInputView, _super);
    function Point2dPadTextInputView(document, config) {
        var _this = _super.call(this, document, config) || this;
        _this.element.classList.add(className());
        var padWrapperElem = document.createElement('div');
        padWrapperElem.classList.add(className('w'));
        _this.element.appendChild(padWrapperElem);
        var buttonElem = document.createElement('button');
        buttonElem.classList.add(className('b'));
        buttonElem.appendChild(DomUtil.createSvgIconElement(document, 'p2dpad'));
        padWrapperElem.appendChild(buttonElem);
        _this.padButtonElem_ = buttonElem;
        var padElem = document.createElement('div');
        padElem.classList.add(className('p'));
        padWrapperElem.appendChild(padElem);
        _this.padInputView_ = config.padInputView;
        padElem.appendChild(_this.padInputView_.element);
        var textElem = document.createElement('div');
        textElem.classList.add(className('t'));
        _this.textInputView_ = config.textInputView;
        textElem.appendChild(_this.textInputView_.element);
        _this.element.appendChild(textElem);
        return _this;
    }
    Object.defineProperty(Point2dPadTextInputView.prototype, "value", {
        get: function () {
            return this.textInputView_.value;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Point2dPadTextInputView.prototype, "padButtonElement", {
        get: function () {
            return this.padButtonElem_;
        },
        enumerable: false,
        configurable: true
    });
    Point2dPadTextInputView.prototype.update = function () {
        this.padInputView_.update();
        this.textInputView_.update();
    };
    return Point2dPadTextInputView;
}(view_1.View));
exports.Point2dPadTextInputView = Point2dPadTextInputView;


/***/ }),

/***/ "./src/main/js/view/input/point-2d-pad.ts":
/*!************************************************!*\
  !*** ./src/main/js/view/input/point-2d-pad.ts ***!
  \************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Point2dPadInputView = void 0;
var class_name_1 = __webpack_require__(/*! ../../misc/class-name */ "./src/main/js/misc/class-name.ts");
var DisposingUtil = __webpack_require__(/*! ../../misc/disposing-util */ "./src/main/js/misc/disposing-util.ts");
var DomUtil = __webpack_require__(/*! ../../misc/dom-util */ "./src/main/js/misc/dom-util.ts");
var number_util_1 = __webpack_require__(/*! ../../misc/number-util */ "./src/main/js/misc/number-util.ts");
var pane_error_1 = __webpack_require__(/*! ../../misc/pane-error */ "./src/main/js/misc/pane-error.ts");
var view_1 = __webpack_require__(/*! ../view */ "./src/main/js/view/view.ts");
var SVG_NS = DomUtil.SVG_NS;
var className = class_name_1.ClassName('p2dpad', 'input');
/**
 * @hidden
 */
var Point2dPadInputView = /** @class */ (function (_super) {
    __extends(Point2dPadInputView, _super);
    function Point2dPadInputView(document, config) {
        var _this = _super.call(this, document, config) || this;
        _this.onFoldableChange_ = _this.onFoldableChange_.bind(_this);
        _this.onValueChange_ = _this.onValueChange_.bind(_this);
        _this.foldable = config.foldable;
        _this.foldable.emitter.on('change', _this.onFoldableChange_);
        _this.invertsY_ = config.invertsY;
        _this.maxValue_ = config.maxValue;
        _this.element.classList.add(className());
        var padElem = document.createElement('div');
        padElem.tabIndex = 0;
        padElem.classList.add(className('p'));
        _this.element.appendChild(padElem);
        _this.padElem_ = padElem;
        var svgElem = document.createElementNS(SVG_NS, 'svg');
        svgElem.classList.add(className('g'));
        _this.padElem_.appendChild(svgElem);
        _this.svgElem_ = svgElem;
        var xAxisElem = document.createElementNS(SVG_NS, 'line');
        xAxisElem.classList.add(className('ax'));
        xAxisElem.setAttributeNS(null, 'x1', '0');
        xAxisElem.setAttributeNS(null, 'y1', '50%');
        xAxisElem.setAttributeNS(null, 'x2', '100%');
        xAxisElem.setAttributeNS(null, 'y2', '50%');
        _this.svgElem_.appendChild(xAxisElem);
        var yAxisElem = document.createElementNS(SVG_NS, 'line');
        yAxisElem.classList.add(className('ax'));
        yAxisElem.setAttributeNS(null, 'x1', '50%');
        yAxisElem.setAttributeNS(null, 'y1', '0');
        yAxisElem.setAttributeNS(null, 'x2', '50%');
        yAxisElem.setAttributeNS(null, 'y2', '100%');
        _this.svgElem_.appendChild(yAxisElem);
        var lineElem = document.createElementNS(SVG_NS, 'line');
        lineElem.classList.add(className('l'));
        lineElem.setAttributeNS(null, 'x1', '50%');
        lineElem.setAttributeNS(null, 'y1', '50%');
        _this.svgElem_.appendChild(lineElem);
        _this.lineElem_ = lineElem;
        var markerElem = document.createElementNS(SVG_NS, 'circle');
        markerElem.classList.add(className('m'));
        markerElem.setAttributeNS(null, 'r', '2px');
        _this.svgElem_.appendChild(markerElem);
        _this.markerElem_ = markerElem;
        config.value.emitter.on('change', _this.onValueChange_);
        _this.value = config.value;
        _this.update();
        config.model.emitter.on('dispose', function () {
            _this.padElem_ = DisposingUtil.disposeElement(_this.padElem_);
        });
        return _this;
    }
    Object.defineProperty(Point2dPadInputView.prototype, "padElement", {
        get: function () {
            if (!this.padElem_) {
                throw pane_error_1.PaneError.alreadyDisposed();
            }
            return this.padElem_;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Point2dPadInputView.prototype, "allFocusableElements", {
        get: function () {
            if (!this.padElem_) {
                throw pane_error_1.PaneError.alreadyDisposed();
            }
            return [this.padElem_];
        },
        enumerable: false,
        configurable: true
    });
    Point2dPadInputView.prototype.update = function () {
        if (this.foldable.expanded) {
            this.element.classList.add(className(undefined, 'expanded'));
        }
        else {
            this.element.classList.remove(className(undefined, 'expanded'));
        }
        var lineElem = this.lineElem_;
        var markerElem = this.markerElem_;
        if (!lineElem || !markerElem) {
            throw pane_error_1.PaneError.alreadyDisposed();
        }
        var _a = this.value.rawValue.getComponents(), x = _a[0], y = _a[1];
        var max = this.maxValue_;
        var px = number_util_1.NumberUtil.map(x, -max, +max, 0, 100);
        var py = number_util_1.NumberUtil.map(y, -max, +max, 0, 100);
        var ipy = this.invertsY_ ? 100 - py : py;
        lineElem.setAttributeNS(null, 'x2', px + "%");
        lineElem.setAttributeNS(null, 'y2', ipy + "%");
        markerElem.setAttributeNS(null, 'cx', px + "%");
        markerElem.setAttributeNS(null, 'cy', ipy + "%");
    };
    Point2dPadInputView.prototype.onValueChange_ = function () {
        this.update();
    };
    Point2dPadInputView.prototype.onFoldableChange_ = function () {
        this.update();
    };
    return Point2dPadInputView;
}(view_1.View));
exports.Point2dPadInputView = Point2dPadInputView;


/***/ }),

/***/ "./src/main/js/view/input/point-2d-text.ts":
/*!*************************************************!*\
  !*** ./src/main/js/view/input/point-2d-text.ts ***!
  \*************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Point2dTextInputView = void 0;
var class_name_1 = __webpack_require__(/*! ../../misc/class-name */ "./src/main/js/misc/class-name.ts");
var DisposingUtil = __webpack_require__(/*! ../../misc/disposing-util */ "./src/main/js/misc/disposing-util.ts");
var pane_error_1 = __webpack_require__(/*! ../../misc/pane-error */ "./src/main/js/misc/pane-error.ts");
var view_1 = __webpack_require__(/*! ../view */ "./src/main/js/view/view.ts");
var COMPONENT_LABELS = ['X', 'Y'];
var className = class_name_1.ClassName('p2dtxt', 'input');
/**
 * @hidden
 */
var Point2dTextInputView = /** @class */ (function (_super) {
    __extends(Point2dTextInputView, _super);
    function Point2dTextInputView(document, config) {
        var _this = _super.call(this, document, config) || this;
        _this.onValueChange_ = _this.onValueChange_.bind(_this);
        _this.formatters_ = [config.xFormatter, config.yFormatter];
        _this.element.classList.add(className());
        var inputElems = COMPONENT_LABELS.map(function () {
            var inputElem = document.createElement('input');
            inputElem.classList.add(className('i'));
            inputElem.type = 'text';
            return inputElem;
        });
        COMPONENT_LABELS.forEach(function (_, index) {
            var elem = document.createElement('div');
            elem.classList.add(className('w'));
            elem.appendChild(inputElems[index]);
            _this.element.appendChild(elem);
        });
        _this.inputElems_ = [inputElems[0], inputElems[1]];
        config.value.emitter.on('change', _this.onValueChange_);
        _this.value = config.value;
        _this.update();
        config.model.emitter.on('dispose', function () {
            if (_this.inputElems_) {
                _this.inputElems_.forEach(function (elem) {
                    DisposingUtil.disposeElement(elem);
                });
                _this.inputElems_ = null;
            }
        });
        return _this;
    }
    Object.defineProperty(Point2dTextInputView.prototype, "inputElements", {
        get: function () {
            if (!this.inputElems_) {
                throw pane_error_1.PaneError.alreadyDisposed();
            }
            return this.inputElems_;
        },
        enumerable: false,
        configurable: true
    });
    Point2dTextInputView.prototype.update = function () {
        var _this = this;
        var inputElems = this.inputElems_;
        if (!inputElems) {
            throw pane_error_1.PaneError.alreadyDisposed();
        }
        var xyComps = this.value.rawValue.getComponents();
        xyComps.forEach(function (comp, index) {
            var inputElem = inputElems[index];
            inputElem.value = _this.formatters_[index].format(comp);
        });
    };
    Point2dTextInputView.prototype.onValueChange_ = function () {
        this.update();
    };
    return Point2dTextInputView;
}(view_1.View));
exports.Point2dTextInputView = Point2dTextInputView;


/***/ }),

/***/ "./src/main/js/view/input/slider-text.ts":
/*!***********************************************!*\
  !*** ./src/main/js/view/input/slider-text.ts ***!
  \***********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SliderTextInputView = void 0;
var class_name_1 = __webpack_require__(/*! ../../misc/class-name */ "./src/main/js/misc/class-name.ts");
var view_1 = __webpack_require__(/*! ../view */ "./src/main/js/view/view.ts");
var className = class_name_1.ClassName('sldtxt', 'input');
/**
 * @hidden
 */
var SliderTextInputView = /** @class */ (function (_super) {
    __extends(SliderTextInputView, _super);
    function SliderTextInputView(document, config) {
        var _this = _super.call(this, document, config) || this;
        _this.element.classList.add(className());
        var sliderElem = document.createElement('div');
        sliderElem.classList.add(className('s'));
        _this.sliderInputView_ = config.sliderInputView;
        sliderElem.appendChild(_this.sliderInputView_.element);
        _this.element.appendChild(sliderElem);
        var textElem = document.createElement('div');
        textElem.classList.add(className('t'));
        _this.textInputView_ = config.textInputView;
        textElem.appendChild(_this.textInputView_.element);
        _this.element.appendChild(textElem);
        return _this;
    }
    Object.defineProperty(SliderTextInputView.prototype, "value", {
        get: function () {
            return this.sliderInputView_.value;
        },
        enumerable: false,
        configurable: true
    });
    SliderTextInputView.prototype.update = function () {
        this.sliderInputView_.update();
        this.textInputView_.update();
    };
    return SliderTextInputView;
}(view_1.View));
exports.SliderTextInputView = SliderTextInputView;


/***/ }),

/***/ "./src/main/js/view/input/slider.ts":
/*!******************************************!*\
  !*** ./src/main/js/view/input/slider.ts ***!
  \******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SliderInputView = void 0;
var class_name_1 = __webpack_require__(/*! ../../misc/class-name */ "./src/main/js/misc/class-name.ts");
var DisposingUtil = __webpack_require__(/*! ../../misc/disposing-util */ "./src/main/js/misc/disposing-util.ts");
var number_util_1 = __webpack_require__(/*! ../../misc/number-util */ "./src/main/js/misc/number-util.ts");
var pane_error_1 = __webpack_require__(/*! ../../misc/pane-error */ "./src/main/js/misc/pane-error.ts");
var view_1 = __webpack_require__(/*! ../view */ "./src/main/js/view/view.ts");
var className = class_name_1.ClassName('sld', 'input');
/**
 * @hidden
 */
var SliderInputView = /** @class */ (function (_super) {
    __extends(SliderInputView, _super);
    function SliderInputView(document, config) {
        var _this = _super.call(this, document, config) || this;
        _this.onValueChange_ = _this.onValueChange_.bind(_this);
        _this.minValue_ = config.minValue;
        _this.maxValue_ = config.maxValue;
        _this.element.classList.add(className());
        var outerElem = document.createElement('div');
        outerElem.classList.add(className('o'));
        outerElem.tabIndex = 0;
        _this.element.appendChild(outerElem);
        _this.outerElem_ = outerElem;
        var innerElem = document.createElement('div');
        innerElem.classList.add(className('i'));
        _this.outerElem_.appendChild(innerElem);
        _this.innerElem_ = innerElem;
        config.value.emitter.on('change', _this.onValueChange_);
        _this.value = config.value;
        _this.update();
        config.model.emitter.on('dispose', function () {
            _this.innerElem_ = DisposingUtil.disposeElement(_this.innerElem_);
            _this.outerElem_ = DisposingUtil.disposeElement(_this.outerElem_);
        });
        return _this;
    }
    Object.defineProperty(SliderInputView.prototype, "outerElement", {
        get: function () {
            if (!this.outerElem_) {
                throw pane_error_1.PaneError.alreadyDisposed();
            }
            return this.outerElem_;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SliderInputView.prototype, "innerElement", {
        get: function () {
            if (!this.innerElem_) {
                throw pane_error_1.PaneError.alreadyDisposed();
            }
            return this.innerElem_;
        },
        enumerable: false,
        configurable: true
    });
    SliderInputView.prototype.update = function () {
        if (!this.innerElem_) {
            throw pane_error_1.PaneError.alreadyDisposed();
        }
        var p = number_util_1.NumberUtil.constrain(number_util_1.NumberUtil.map(this.value.rawValue, this.minValue_, this.maxValue_, 0, 100), 0, 100);
        this.innerElem_.style.width = p + "%";
    };
    SliderInputView.prototype.onValueChange_ = function () {
        this.update();
    };
    return SliderInputView;
}(view_1.View));
exports.SliderInputView = SliderInputView;


/***/ }),

/***/ "./src/main/js/view/input/sv-palette.ts":
/*!**********************************************!*\
  !*** ./src/main/js/view/input/sv-palette.ts ***!
  \**********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SvPaletteInputView = void 0;
var ColorConverter = __webpack_require__(/*! ../../converter/color */ "./src/main/js/converter/color.ts");
var class_name_1 = __webpack_require__(/*! ../../misc/class-name */ "./src/main/js/misc/class-name.ts");
var DisposingUtil = __webpack_require__(/*! ../../misc/disposing-util */ "./src/main/js/misc/disposing-util.ts");
var DomUtil = __webpack_require__(/*! ../../misc/dom-util */ "./src/main/js/misc/dom-util.ts");
var number_util_1 = __webpack_require__(/*! ../../misc/number-util */ "./src/main/js/misc/number-util.ts");
var pane_error_1 = __webpack_require__(/*! ../../misc/pane-error */ "./src/main/js/misc/pane-error.ts");
var color_1 = __webpack_require__(/*! ../../model/color */ "./src/main/js/model/color.ts");
var view_1 = __webpack_require__(/*! ../view */ "./src/main/js/view/view.ts");
var className = class_name_1.ClassName('svp', 'input');
/**
 * @hidden
 */
var SvPaletteInputView = /** @class */ (function (_super) {
    __extends(SvPaletteInputView, _super);
    function SvPaletteInputView(document, config) {
        var _this = _super.call(this, document, config) || this;
        _this.onValueChange_ = _this.onValueChange_.bind(_this);
        _this.value = config.value;
        _this.value.emitter.on('change', _this.onValueChange_);
        _this.element.classList.add(className());
        _this.element.tabIndex = 0;
        var canvasElem = document.createElement('canvas');
        canvasElem.classList.add(className('c'));
        _this.element.appendChild(canvasElem);
        _this.canvasElem_ = canvasElem;
        var markerElem = document.createElement('div');
        markerElem.classList.add(className('m'));
        _this.element.appendChild(markerElem);
        _this.markerElem_ = markerElem;
        _this.update();
        config.model.emitter.on('dispose', function () {
            _this.canvasElem_ = DisposingUtil.disposeElement(_this.canvasElem_);
            _this.markerElem_ = DisposingUtil.disposeElement(_this.markerElem_);
        });
        return _this;
    }
    Object.defineProperty(SvPaletteInputView.prototype, "canvasElement", {
        get: function () {
            if (!this.canvasElem_) {
                throw pane_error_1.PaneError.alreadyDisposed();
            }
            return this.canvasElem_;
        },
        enumerable: false,
        configurable: true
    });
    SvPaletteInputView.prototype.update = function () {
        if (!this.markerElem_) {
            throw pane_error_1.PaneError.alreadyDisposed();
        }
        var ctx = DomUtil.getCanvasContext(this.canvasElement);
        if (!ctx) {
            return;
        }
        var c = this.value.rawValue;
        var hsvComps = c.getComponents('hsv');
        var width = this.canvasElement.width;
        var height = this.canvasElement.height;
        var cellCount = 64;
        var cw = Math.ceil(width / cellCount);
        var ch = Math.ceil(height / cellCount);
        for (var iy = 0; iy < cellCount; iy++) {
            for (var ix = 0; ix < cellCount; ix++) {
                var s = number_util_1.NumberUtil.map(ix, 0, cellCount - 1, 0, 100);
                var v = number_util_1.NumberUtil.map(iy, 0, cellCount - 1, 100, 0);
                ctx.fillStyle = ColorConverter.toFunctionalRgbString(new color_1.Color([hsvComps[0], s, v], 'hsv'));
                var x = Math.floor(number_util_1.NumberUtil.map(ix, 0, cellCount - 1, 0, width - cw));
                var y = Math.floor(number_util_1.NumberUtil.map(iy, 0, cellCount - 1, 0, height - ch));
                ctx.fillRect(x, y, cw, ch);
            }
        }
        var left = number_util_1.NumberUtil.map(hsvComps[1], 0, 100, 0, 100);
        this.markerElem_.style.left = left + "%";
        var top = number_util_1.NumberUtil.map(hsvComps[2], 0, 100, 100, 0);
        this.markerElem_.style.top = top + "%";
    };
    SvPaletteInputView.prototype.onValueChange_ = function () {
        this.update();
    };
    return SvPaletteInputView;
}(view_1.View));
exports.SvPaletteInputView = SvPaletteInputView;


/***/ }),

/***/ "./src/main/js/view/input/text.ts":
/*!****************************************!*\
  !*** ./src/main/js/view/input/text.ts ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextInputView = void 0;
var class_name_1 = __webpack_require__(/*! ../../misc/class-name */ "./src/main/js/misc/class-name.ts");
var DisposingUtil = __webpack_require__(/*! ../../misc/disposing-util */ "./src/main/js/misc/disposing-util.ts");
var pane_error_1 = __webpack_require__(/*! ../../misc/pane-error */ "./src/main/js/misc/pane-error.ts");
var view_1 = __webpack_require__(/*! ../view */ "./src/main/js/view/view.ts");
var className = class_name_1.ClassName('txt', 'input');
/**
 * @hidden
 */
var TextInputView = /** @class */ (function (_super) {
    __extends(TextInputView, _super);
    function TextInputView(document, config) {
        var _this = _super.call(this, document, config) || this;
        _this.onValueChange_ = _this.onValueChange_.bind(_this);
        _this.formatter_ = config.formatter;
        _this.element.classList.add(className());
        var inputElem = document.createElement('input');
        inputElem.classList.add(className('i'));
        inputElem.type = 'text';
        _this.element.appendChild(inputElem);
        _this.inputElem_ = inputElem;
        config.value.emitter.on('change', _this.onValueChange_);
        _this.value = config.value;
        _this.update();
        config.model.emitter.on('dispose', function () {
            _this.inputElem_ = DisposingUtil.disposeElement(_this.inputElem_);
        });
        return _this;
    }
    Object.defineProperty(TextInputView.prototype, "inputElement", {
        get: function () {
            if (!this.inputElem_) {
                throw pane_error_1.PaneError.alreadyDisposed();
            }
            return this.inputElem_;
        },
        enumerable: false,
        configurable: true
    });
    TextInputView.prototype.update = function () {
        if (!this.inputElem_) {
            throw pane_error_1.PaneError.alreadyDisposed();
        }
        this.inputElem_.value = this.formatter_.format(this.value.rawValue);
    };
    TextInputView.prototype.onValueChange_ = function () {
        this.update();
    };
    return TextInputView;
}(view_1.View));
exports.TextInputView = TextInputView;


/***/ }),

/***/ "./src/main/js/view/labeled.ts":
/*!*************************************!*\
  !*** ./src/main/js/view/labeled.ts ***!
  \*************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LabeledView = void 0;
var class_name_1 = __webpack_require__(/*! ../misc/class-name */ "./src/main/js/misc/class-name.ts");
var view_1 = __webpack_require__(/*! ./view */ "./src/main/js/view/view.ts");
var className = class_name_1.ClassName('lbl');
function createLabelNode(document, label) {
    var frag = document.createDocumentFragment();
    var lineNodes = label.split('\n').map(function (line) {
        return document.createTextNode(line);
    });
    lineNodes.forEach(function (lineNode, index) {
        if (index > 0) {
            frag.appendChild(document.createElement('br'));
        }
        frag.appendChild(lineNode);
    });
    return frag;
}
/**
 * @hidden
 */
var LabeledView = /** @class */ (function (_super) {
    __extends(LabeledView, _super);
    function LabeledView(document, config) {
        var _this = _super.call(this, document, config) || this;
        _this.label = config.label;
        _this.element.classList.add(className());
        var labelElem = document.createElement('div');
        labelElem.classList.add(className('l'));
        labelElem.appendChild(createLabelNode(document, _this.label));
        _this.element.appendChild(labelElem);
        var viewElem = document.createElement('div');
        viewElem.classList.add(className('v'));
        viewElem.appendChild(config.view.element);
        _this.element.appendChild(viewElem);
        return _this;
    }
    return LabeledView;
}(view_1.View));
exports.LabeledView = LabeledView;


/***/ }),

/***/ "./src/main/js/view/monitor/graph.ts":
/*!*******************************************!*\
  !*** ./src/main/js/view/monitor/graph.ts ***!
  \*******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphMonitorView = void 0;
var class_name_1 = __webpack_require__(/*! ../../misc/class-name */ "./src/main/js/misc/class-name.ts");
var DisposingUtil = __webpack_require__(/*! ../../misc/disposing-util */ "./src/main/js/misc/disposing-util.ts");
var DomUtil = __webpack_require__(/*! ../../misc/dom-util */ "./src/main/js/misc/dom-util.ts");
var number_util_1 = __webpack_require__(/*! ../../misc/number-util */ "./src/main/js/misc/number-util.ts");
var pane_error_1 = __webpack_require__(/*! ../../misc/pane-error */ "./src/main/js/misc/pane-error.ts");
var view_1 = __webpack_require__(/*! ../view */ "./src/main/js/view/view.ts");
var SVG_NS = DomUtil.SVG_NS;
var className = class_name_1.ClassName('grp', 'monitor');
/**
 * @hidden
 */
var GraphMonitorView = /** @class */ (function (_super) {
    __extends(GraphMonitorView, _super);
    function GraphMonitorView(document, config) {
        var _this = _super.call(this, document, config) || this;
        _this.onCursorChange_ = _this.onCursorChange_.bind(_this);
        _this.onValueUpdate_ = _this.onValueUpdate_.bind(_this);
        _this.element.classList.add(className());
        _this.formatter_ = config.formatter;
        _this.minValue_ = config.minValue;
        _this.maxValue_ = config.maxValue;
        _this.cursor_ = config.cursor;
        _this.cursor_.emitter.on('change', _this.onCursorChange_);
        var svgElem = document.createElementNS(SVG_NS, 'svg');
        svgElem.classList.add(className('g'));
        _this.element.appendChild(svgElem);
        _this.svgElem_ = svgElem;
        var lineElem = document.createElementNS(SVG_NS, 'polyline');
        _this.svgElem_.appendChild(lineElem);
        _this.lineElem_ = lineElem;
        var tooltipElem = document.createElement('div');
        tooltipElem.classList.add(className('t'));
        _this.element.appendChild(tooltipElem);
        _this.tooltipElem_ = tooltipElem;
        config.value.emitter.on('update', _this.onValueUpdate_);
        _this.value = config.value;
        _this.update();
        config.model.emitter.on('dispose', function () {
            _this.lineElem_ = DisposingUtil.disposeElement(_this.lineElem_);
            _this.svgElem_ = DisposingUtil.disposeElement(_this.svgElem_);
            _this.tooltipElem_ = DisposingUtil.disposeElement(_this.tooltipElem_);
        });
        return _this;
    }
    Object.defineProperty(GraphMonitorView.prototype, "graphElement", {
        get: function () {
            if (!this.svgElem_) {
                throw pane_error_1.PaneError.alreadyDisposed();
            }
            return this.svgElem_;
        },
        enumerable: false,
        configurable: true
    });
    GraphMonitorView.prototype.update = function () {
        var tooltipElem = this.tooltipElem_;
        if (!this.lineElem_ || !this.svgElem_ || !tooltipElem) {
            throw pane_error_1.PaneError.alreadyDisposed();
        }
        var bounds = this.svgElem_.getBoundingClientRect();
        // Graph
        var maxIndex = this.value.totalCount - 1;
        var min = this.minValue_;
        var max = this.maxValue_;
        this.lineElem_.setAttributeNS(null, 'points', this.value.rawValues
            .map(function (v, index) {
            var x = number_util_1.NumberUtil.map(index, 0, maxIndex, 0, bounds.width);
            var y = number_util_1.NumberUtil.map(v, min, max, bounds.height, 0);
            return [x, y].join(',');
        })
            .join(' '));
        // Cursor
        var value = this.value.rawValues[this.cursor_.index];
        if (value === undefined) {
            tooltipElem.classList.remove(className('t', 'valid'));
            return;
        }
        tooltipElem.classList.add(className('t', 'valid'));
        var tx = number_util_1.NumberUtil.map(this.cursor_.index, 0, maxIndex, 0, bounds.width);
        var ty = number_util_1.NumberUtil.map(value, min, max, bounds.height, 0);
        tooltipElem.style.left = tx + "px";
        tooltipElem.style.top = ty + "px";
        tooltipElem.textContent = "" + this.formatter_.format(value);
    };
    GraphMonitorView.prototype.onValueUpdate_ = function () {
        this.update();
    };
    GraphMonitorView.prototype.onCursorChange_ = function () {
        this.update();
    };
    return GraphMonitorView;
}(view_1.View));
exports.GraphMonitorView = GraphMonitorView;


/***/ }),

/***/ "./src/main/js/view/monitor/multi-log.ts":
/*!***********************************************!*\
  !*** ./src/main/js/view/monitor/multi-log.ts ***!
  \***********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiLogMonitorView = void 0;
var class_name_1 = __webpack_require__(/*! ../../misc/class-name */ "./src/main/js/misc/class-name.ts");
var DisposingUtil = __webpack_require__(/*! ../../misc/disposing-util */ "./src/main/js/misc/disposing-util.ts");
var pane_error_1 = __webpack_require__(/*! ../../misc/pane-error */ "./src/main/js/misc/pane-error.ts");
var view_1 = __webpack_require__(/*! ../view */ "./src/main/js/view/view.ts");
var className = class_name_1.ClassName('mll', 'monitor');
/**
 * @hidden
 */
var MultiLogMonitorView = /** @class */ (function (_super) {
    __extends(MultiLogMonitorView, _super);
    function MultiLogMonitorView(document, config) {
        var _this = _super.call(this, document, config) || this;
        _this.onValueUpdate_ = _this.onValueUpdate_.bind(_this);
        _this.formatter_ = config.formatter;
        _this.element.classList.add(className());
        var textareaElem = document.createElement('textarea');
        textareaElem.classList.add(className('i'));
        textareaElem.readOnly = true;
        _this.element.appendChild(textareaElem);
        _this.textareaElem_ = textareaElem;
        config.value.emitter.on('update', _this.onValueUpdate_);
        _this.value = config.value;
        _this.update();
        config.model.emitter.on('dispose', function () {
            _this.textareaElem_ = DisposingUtil.disposeElement(_this.textareaElem_);
        });
        return _this;
    }
    MultiLogMonitorView.prototype.update = function () {
        var _this = this;
        var elem = this.textareaElem_;
        if (!elem) {
            throw pane_error_1.PaneError.alreadyDisposed();
        }
        var shouldScroll = elem.scrollTop === elem.scrollHeight - elem.clientHeight;
        elem.textContent = this.value.rawValues
            .map(function (value) {
            return _this.formatter_.format(value);
        })
            .join('\n');
        if (shouldScroll) {
            elem.scrollTop = elem.scrollHeight;
        }
    };
    MultiLogMonitorView.prototype.onValueUpdate_ = function () {
        this.update();
    };
    return MultiLogMonitorView;
}(view_1.View));
exports.MultiLogMonitorView = MultiLogMonitorView;


/***/ }),

/***/ "./src/main/js/view/monitor/single-log.ts":
/*!************************************************!*\
  !*** ./src/main/js/view/monitor/single-log.ts ***!
  \************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SingleLogMonitorView = void 0;
var class_name_1 = __webpack_require__(/*! ../../misc/class-name */ "./src/main/js/misc/class-name.ts");
var DisposingUtil = __webpack_require__(/*! ../../misc/disposing-util */ "./src/main/js/misc/disposing-util.ts");
var pane_error_1 = __webpack_require__(/*! ../../misc/pane-error */ "./src/main/js/misc/pane-error.ts");
var view_1 = __webpack_require__(/*! ../view */ "./src/main/js/view/view.ts");
var className = class_name_1.ClassName('sgl', 'monitor');
/**
 * @hidden
 */
var SingleLogMonitorView = /** @class */ (function (_super) {
    __extends(SingleLogMonitorView, _super);
    function SingleLogMonitorView(document, config) {
        var _this = _super.call(this, document, config) || this;
        _this.onValueUpdate_ = _this.onValueUpdate_.bind(_this);
        _this.formatter_ = config.formatter;
        _this.element.classList.add(className());
        var inputElem = document.createElement('input');
        inputElem.classList.add(className('i'));
        inputElem.readOnly = true;
        inputElem.type = 'text';
        _this.element.appendChild(inputElem);
        _this.inputElem_ = inputElem;
        config.value.emitter.on('update', _this.onValueUpdate_);
        _this.value = config.value;
        _this.update();
        config.model.emitter.on('dispose', function () {
            _this.inputElem_ = DisposingUtil.disposeElement(_this.inputElem_);
        });
        return _this;
    }
    SingleLogMonitorView.prototype.update = function () {
        if (!this.inputElem_) {
            throw pane_error_1.PaneError.alreadyDisposed();
        }
        var values = this.value.rawValues;
        this.inputElem_.value =
            values.length > 0
                ? this.formatter_.format(values[values.length - 1])
                : '';
    };
    SingleLogMonitorView.prototype.onValueUpdate_ = function () {
        this.update();
    };
    return SingleLogMonitorView;
}(view_1.View));
exports.SingleLogMonitorView = SingleLogMonitorView;


/***/ }),

/***/ "./src/main/js/view/root.ts":
/*!**********************************!*\
  !*** ./src/main/js/view/root.ts ***!
  \**********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RootView = void 0;
var class_name_1 = __webpack_require__(/*! ../misc/class-name */ "./src/main/js/misc/class-name.ts");
var DisposingUtil = __webpack_require__(/*! ../misc/disposing-util */ "./src/main/js/misc/disposing-util.ts");
var pane_error_1 = __webpack_require__(/*! ../misc/pane-error */ "./src/main/js/misc/pane-error.ts");
var view_1 = __webpack_require__(/*! ./view */ "./src/main/js/view/view.ts");
var className = class_name_1.ClassName('rot');
/**
 * @hidden
 */
var RootView = /** @class */ (function (_super) {
    __extends(RootView, _super);
    function RootView(document, config) {
        var _this = _super.call(this, document, config) || this;
        _this.onFolderChange_ = _this.onFolderChange_.bind(_this);
        _this.folder_ = config.folder;
        if (_this.folder_) {
            _this.folder_.emitter.on('change', _this.onFolderChange_);
        }
        _this.element.classList.add(className());
        var folder = _this.folder_;
        if (folder) {
            var titleElem = document.createElement('button');
            titleElem.classList.add(className('t'));
            titleElem.textContent = folder.title;
            _this.element.appendChild(titleElem);
            var markElem = document.createElement('div');
            markElem.classList.add(className('m'));
            titleElem.appendChild(markElem);
            _this.titleElem_ = titleElem;
        }
        var containerElem = document.createElement('div');
        containerElem.classList.add(className('c'));
        _this.element.appendChild(containerElem);
        _this.containerElem_ = containerElem;
        _this.applyModel_();
        config.model.emitter.on('dispose', function () {
            _this.containerElem_ = DisposingUtil.disposeElement(_this.containerElem_);
            _this.folder_ = null;
            _this.titleElem_ = DisposingUtil.disposeElement(_this.titleElem_);
        });
        return _this;
    }
    Object.defineProperty(RootView.prototype, "titleElement", {
        get: function () {
            return this.titleElem_;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RootView.prototype, "containerElement", {
        get: function () {
            if (!this.containerElem_) {
                throw pane_error_1.PaneError.alreadyDisposed();
            }
            return this.containerElem_;
        },
        enumerable: false,
        configurable: true
    });
    RootView.prototype.applyModel_ = function () {
        var containerElem = this.containerElem_;
        if (!containerElem) {
            throw pane_error_1.PaneError.alreadyDisposed();
        }
        var expanded = this.folder_ ? this.folder_.styleExpanded : true;
        var expandedClass = className(undefined, 'expanded');
        if (expanded) {
            this.element.classList.add(expandedClass);
        }
        else {
            this.element.classList.remove(expandedClass);
        }
        containerElem.style.height = this.folder_
            ? this.folder_.styleHeight
            : 'auto';
    };
    RootView.prototype.onFolderChange_ = function () {
        this.applyModel_();
    };
    return RootView;
}(view_1.View));
exports.RootView = RootView;


/***/ }),

/***/ "./src/main/js/view/separator.ts":
/*!***************************************!*\
  !*** ./src/main/js/view/separator.ts ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeparatorView = void 0;
var class_name_1 = __webpack_require__(/*! ../misc/class-name */ "./src/main/js/misc/class-name.ts");
var view_1 = __webpack_require__(/*! ./view */ "./src/main/js/view/view.ts");
var className = class_name_1.ClassName('spt');
/**
 * @hidden
 */
var SeparatorView = /** @class */ (function (_super) {
    __extends(SeparatorView, _super);
    function SeparatorView(document, config) {
        var _this = _super.call(this, document, config) || this;
        _this.element.classList.add(className());
        var hrElem = document.createElement('hr');
        hrElem.classList.add(className('r'));
        _this.element.appendChild(hrElem);
        return _this;
    }
    return SeparatorView;
}(view_1.View));
exports.SeparatorView = SeparatorView;


/***/ }),

/***/ "./src/main/js/view/view.ts":
/*!**********************************!*\
  !*** ./src/main/js/view/view.ts ***!
  \**********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.View = void 0;
var class_name_1 = __webpack_require__(/*! ../misc/class-name */ "./src/main/js/misc/class-name.ts");
var DisposingUtil = __webpack_require__(/*! ../misc/disposing-util */ "./src/main/js/misc/disposing-util.ts");
var pane_error_1 = __webpack_require__(/*! ../misc/pane-error */ "./src/main/js/misc/pane-error.ts");
var ViewPositions = __webpack_require__(/*! ../model/view-positions */ "./src/main/js/model/view-positions.ts");
var className = class_name_1.ClassName('');
/**
 * @hidden
 */
var View = /** @class */ (function () {
    function View(document, config) {
        this.onChange_ = this.onChange_.bind(this);
        this.onDispose_ = this.onDispose_.bind(this);
        this.model_ = config.model;
        this.model_.emitter.on('change', this.onChange_);
        this.model_.emitter.on('dispose', this.onDispose_);
        this.doc_ = document;
        this.elem_ = this.doc_.createElement('div');
        this.elem_.classList.add(className());
    }
    Object.defineProperty(View.prototype, "document", {
        get: function () {
            if (!this.doc_) {
                throw pane_error_1.PaneError.alreadyDisposed();
            }
            return this.doc_;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(View.prototype, "element", {
        get: function () {
            if (!this.elem_) {
                throw pane_error_1.PaneError.alreadyDisposed();
            }
            return this.elem_;
        },
        enumerable: false,
        configurable: true
    });
    View.prototype.onDispose_ = function () {
        this.doc_ = null;
        this.elem_ = DisposingUtil.disposeElement(this.elem_);
    };
    View.prototype.onChange_ = function (ev) {
        var elem = this.elem_;
        if (!elem) {
            throw pane_error_1.PaneError.alreadyDisposed();
        }
        if (ev.propertyName === 'hidden') {
            var hiddenClass = className(undefined, 'hidden');
            if (this.model_.hidden) {
                elem.classList.add(hiddenClass);
            }
            else {
                elem.classList.remove(hiddenClass);
            }
        }
        else if (ev.propertyName === 'positions') {
            ViewPositions.getAll().forEach(function (pos) {
                elem.classList.remove(className(undefined, pos));
            });
            this.model_.positions.forEach(function (pos) {
                elem.classList.add(className(undefined, pos));
            });
        }
    };
    return View;
}());
exports.View = View;


/***/ }),

/***/ "./src/main/sass/bundle.scss":
/*!***********************************!*\
  !*** ./src/main/sass/bundle.scss ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(/*! ../../../node_modules/css-loader/lib/css-base.js */ "./node_modules/css-loader/lib/css-base.js")(false);
// imports


// module
exports.push([module.i, ".tp-fldv_t,.tp-rotv_t{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-color:transparent;border-width:0;font-family:inherit;font-size:inherit;font-weight:inherit;margin:0;outline:none;padding:0;background-color:var(--folder-background-color);color:var(--folder-foreground-color);cursor:pointer;display:block;height:24px;line-height:24px;overflow:hidden;padding-left:30px;position:relative;text-align:left;text-overflow:ellipsis;white-space:nowrap;width:100%;transition:border-radius .2s ease-in-out .2s}.tp-fldv_t:hover,.tp-rotv_t:hover{background-color:var(--folder-background-color-hover)}.tp-fldv_t:focus,.tp-rotv_t:focus{background-color:var(--folder-background-color-focus)}.tp-fldv_t:active,.tp-rotv_t:active{background-color:var(--folder-background-color-active)}.tp-fldv_m,.tp-rotv_m{background:linear-gradient(to left, var(--folder-foreground-color), var(--folder-foreground-color) 2px, transparent 2px, transparent 4px, var(--folder-foreground-color) 4px);border-radius:2px;bottom:0;content:'';display:block;height:6px;left:12px;margin:auto;position:absolute;top:0;transform:rotate(90deg);transition:transform .2s ease-in-out;width:6px}.tp-fldv.tp-fldv-expanded>.tp-fldv_t>.tp-fldv_m,.tp-rotv.tp-rotv-expanded .tp-rotv_m{transform:none}.tp-fldv_c,.tp-rotv_c{box-sizing:border-box;height:0;opacity:0;overflow:hidden;padding-bottom:0;padding-top:0;position:relative;transition:height .2s ease-in-out,opacity .2s linear,padding .2s ease-in-out}.tp-fldv_c>.tp-fldv.tp-v-first,.tp-rotv_c>.tp-fldv.tp-v-first{margin-top:-4px}.tp-fldv_c>.tp-fldv.tp-v-last,.tp-rotv_c>.tp-fldv.tp-v-last{margin-bottom:-4px}.tp-fldv_c>*:not(.tp-v-first),.tp-rotv_c>*:not(.tp-v-first){margin-top:4px}.tp-fldv_c>.tp-fldv:not(.tp-v-hidden)+.tp-fldv,.tp-rotv_c>.tp-fldv:not(.tp-v-hidden)+.tp-fldv{margin-top:0}.tp-fldv_c>.tp-sptv:not(.tp-v-hidden)+.tp-sptv,.tp-rotv_c>.tp-sptv:not(.tp-v-hidden)+.tp-sptv{margin-top:0}.tp-fldv.tp-fldv-expanded>.tp-fldv_c,.tp-rotv.tp-rotv-expanded .tp-rotv_c{opacity:1;padding-bottom:4px;padding-top:4px;transform:none;overflow:visible;transition:height .2s ease-in-out,opacity .2s linear .2s,padding .2s ease-in-out}.tp-btnv{padding:0 4px}.tp-btnv_b{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-color:transparent;border-width:0;font-family:inherit;font-size:inherit;font-weight:inherit;margin:0;outline:none;padding:0;background-color:var(--button-background-color);border-radius:2px;color:var(--button-foreground-color);cursor:pointer;display:block;font-weight:bold;height:20px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%}.tp-btnv_b:hover{background-color:var(--button-background-color-hover)}.tp-btnv_b:focus{background-color:var(--button-background-color-focus)}.tp-btnv_b:active{background-color:var(--button-background-color-active)}.tp-dfwv{position:absolute;top:8px;right:8px;width:256px}.tp-fldv.tp-fldv-expanded .tp-fldv_t{transition:border-radius 0s}.tp-fldv_c{border-left:var(--folder-background-color) solid 4px}.tp-fldv_t:hover+.tp-fldv_c{border-left-color:var(--folder-background-color-hover)}.tp-fldv_t:focus+.tp-fldv_c{border-left-color:var(--folder-background-color-focus)}.tp-fldv_t:active+.tp-fldv_c{border-left-color:var(--folder-background-color-active)}.tp-fldv_c>.tp-fldv{margin-left:4px}.tp-fldv_c>.tp-fldv>.tp-fldv_t{border-top-left-radius:2px;border-bottom-left-radius:2px}.tp-fldv_c>.tp-fldv.tp-fldv-expanded>.tp-fldv_t{border-bottom-left-radius:0}.tp-fldv_c .tp-fldv>.tp-fldv_c{border-bottom-left-radius:2px}.tp-ckbiv_l{display:block;position:relative}.tp-ckbiv_i{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-color:transparent;border-width:0;font-family:inherit;font-size:inherit;font-weight:inherit;margin:0;outline:none;padding:0;background:red;left:0;opacity:0;position:absolute;top:0}.tp-ckbiv_m{background-color:var(--input-background-color);border-radius:2px;cursor:pointer;display:block;height:20px;position:relative;width:20px}.tp-ckbiv_m::before{background-color:var(--input-foreground-color);border-radius:2px;bottom:4px;content:'';display:block;left:4px;opacity:0;position:absolute;right:4px;top:4px}.tp-ckbiv_i:hover+.tp-ckbiv_m{background-color:var(--input-background-color-hover)}.tp-ckbiv_i:focus+.tp-ckbiv_m{background-color:var(--input-background-color-focus)}.tp-ckbiv_i:active+.tp-ckbiv_m{background-color:var(--input-background-color-active)}.tp-ckbiv_i:checked+.tp-ckbiv_m::before{opacity:1}.tp-cctxtsiv{display:flex;width:100%}.tp-cctxtsiv_m{margin-right:4px;position:relative}.tp-cctxtsiv_ms{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-color:transparent;border-width:0;font-family:inherit;font-size:inherit;font-weight:inherit;margin:0;outline:none;padding:0;border-radius:2px;color:var(--label-foreground-color);cursor:pointer;height:20px;line-height:20px;padding:0 18px 0 4px}.tp-cctxtsiv_ms:hover{background-color:var(--input-background-color-hover)}.tp-cctxtsiv_ms:focus{background-color:var(--input-background-color-focus)}.tp-cctxtsiv_ms:active{background-color:var(--input-background-color-active)}.tp-cctxtsiv_mm{border-color:var(--label-foreground-color) transparent transparent;border-style:solid;border-width:3px;box-sizing:border-box;height:6px;pointer-events:none;width:6px;bottom:0;margin:auto;position:absolute;right:6px;top:3px}.tp-cctxtsiv_w{display:flex;flex:1}.tp-cctxtsiv_i{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-color:transparent;border-width:0;font-family:inherit;font-size:inherit;font-weight:inherit;margin:0;outline:none;padding:0;background-color:var(--input-background-color);border-radius:2px;box-sizing:border-box;color:var(--input-foreground-color);font-family:inherit;height:20px;line-height:20px;min-width:0;width:100%;border-radius:0;flex:1;padding:0 4px}.tp-cctxtsiv_i:hover{background-color:var(--input-background-color-hover)}.tp-cctxtsiv_i:focus{background-color:var(--input-background-color-focus)}.tp-cctxtsiv_i:active{background-color:var(--input-background-color-active)}.tp-cctxtsiv_i:first-child{border-bottom-left-radius:2px;border-top-left-radius:2px}.tp-cctxtsiv_i:last-child{border-bottom-right-radius:2px;border-top-right-radius:2px}.tp-cctxtsiv_i+.tp-cctxtsiv_i{margin-left:1px}.tp-clpiv{background-color:var(--base-background-color);border-radius:6px;box-shadow:0 2px 4px var(--base-shadow-color);display:none;padding:4px;position:relative;visibility:hidden;z-index:1000}.tp-clpiv.tp-clpiv-expanded{display:block;visibility:visible}.tp-clpiv_h,.tp-clpiv_ap{margin-left:6px;margin-right:6px}.tp-clpiv_h{margin-top:4px}.tp-clpiv_rgb{display:flex;margin-top:4px;width:100%}.tp-clpiv_a{display:flex;margin-top:4px;padding-top:8px;position:relative}.tp-clpiv_a:before{background-color:var(--separator-color);content:'';height:4px;left:-4px;position:absolute;right:-4px;top:0}.tp-clpiv_ap{flex:3}.tp-clpiv_at{flex:1}.tp-svpiv{border-radius:2px;outline:none;overflow:hidden;position:relative}.tp-svpiv_c{cursor:crosshair;display:block;height:80px;width:100%}.tp-svpiv_m{border-radius:100%;border:rgba(255,255,255,0.75) solid 2px;box-sizing:border-box;-webkit-filter:drop-shadow(0 0 1px rgba(0,0,0,0.3));filter:drop-shadow(0 0 1px rgba(0,0,0,0.3));height:12px;margin-left:-6px;margin-top:-6px;pointer-events:none;position:absolute;width:12px}.tp-svpiv:focus .tp-svpiv_m{border-color:#fff}.tp-hpliv{cursor:pointer;height:20px;outline:none;position:relative}.tp-hpliv_c{border-radius:2px;display:block;height:4px;left:0;margin-top:-2px;position:absolute;top:50%;width:100%}.tp-hpliv_m{border-radius:2px;border:rgba(255,255,255,0.75) solid 2px;box-shadow:0 0 2px rgba(0,0,0,0.1);box-sizing:border-box;height:12px;left:50%;margin-left:-6px;margin-top:-6px;pointer-events:none;position:absolute;top:50%;width:12px}.tp-hpliv:focus .tp-hpliv_m{border-color:#fff}.tp-apliv{cursor:pointer;height:20px;outline:none;position:relative}.tp-apliv_c{background-image:linear-gradient(to top right, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%),linear-gradient(to top right, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%);background-size:4px 4px;background-position:0 0,2px 2px;background-color:#fff;border-radius:2px;display:block;height:4px;left:0;margin-top:-2px;position:absolute;top:50%;width:100%}.tp-apliv_m{background-image:linear-gradient(to top right, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%),linear-gradient(to top right, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%);background-size:12px 12px;background-position:0 0,6px 6px;background-color:#fff;border-radius:2px;box-shadow:0 0 2px rgba(0,0,0,0.1);height:12px;left:50%;margin-left:-6px;margin-top:-6px;overflow:hidden;pointer-events:none;position:absolute;top:50%;width:12px}.tp-apliv_p{border-radius:2px;border:rgba(255,255,255,0.75) solid 2px;box-sizing:border-box;bottom:0;left:0;position:absolute;right:0;top:0}.tp-apliv:focus .tp-apliv_p{border-color:#fff}.tp-lstiv{display:block;padding:0;position:relative}.tp-lstiv_s{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-color:transparent;border-width:0;font-family:inherit;font-size:inherit;font-weight:inherit;margin:0;outline:none;padding:0;background-color:var(--button-background-color);border-radius:2px;color:var(--button-foreground-color);cursor:pointer;display:block;height:20px;line-height:20px;padding:0 4px;width:100%}.tp-lstiv_s:hover{background-color:var(--button-background-color-hover)}.tp-lstiv_s:focus{background-color:var(--button-background-color-focus)}.tp-lstiv_s:active{background-color:var(--button-background-color-active)}.tp-lstiv_m{border-color:var(--button-foreground-color) transparent transparent;border-style:solid;border-width:3px;box-sizing:border-box;height:6px;pointer-events:none;width:6px;bottom:0;margin:auto;position:absolute;right:6px;top:3px}.tp-p2dpadiv{background-color:var(--base-background-color);border-radius:6px;box-shadow:0 2px 4px var(--base-shadow-color);display:none;padding:4px 4px 4px 28px;position:relative;visibility:hidden;z-index:1000}.tp-p2dpadiv.tp-p2dpadiv-expanded{display:block;visibility:visible}.tp-p2dpadiv_p{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-color:transparent;border-width:0;font-family:inherit;font-size:inherit;font-weight:inherit;margin:0;outline:none;padding:0;background-color:var(--input-background-color);border-radius:2px;box-sizing:border-box;color:var(--input-foreground-color);font-family:inherit;height:20px;line-height:20px;min-width:0;width:100%;cursor:crosshair;height:0;overflow:hidden;padding-bottom:100%;position:relative}.tp-p2dpadiv_p:hover{background-color:var(--input-background-color-hover)}.tp-p2dpadiv_p:focus{background-color:var(--input-background-color-focus)}.tp-p2dpadiv_p:active{background-color:var(--input-background-color-active)}.tp-p2dpadiv_g{display:block;height:100%;left:0;pointer-events:none;position:absolute;top:0;width:100%}.tp-p2dpadiv_ax{stroke:var(--input-guide-color)}.tp-p2dpadiv_l{stroke:var(--input-foreground-color);stroke-linecap:round;stroke-dasharray:1px 3px}.tp-p2dpadiv_m{fill:var(--input-foreground-color)}.tp-p2dpadtxtiv{display:flex;position:relative}.tp-p2dpadtxtiv_b{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-color:transparent;border-width:0;font-family:inherit;font-size:inherit;font-weight:inherit;margin:0;outline:none;padding:0;background-color:var(--button-background-color);border-radius:2px;color:var(--button-foreground-color);cursor:pointer;display:block;font-weight:bold;height:20px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;height:20px;position:relative;width:20px}.tp-p2dpadtxtiv_b:hover{background-color:var(--button-background-color-hover)}.tp-p2dpadtxtiv_b:focus{background-color:var(--button-background-color-focus)}.tp-p2dpadtxtiv_b:active{background-color:var(--button-background-color-active)}.tp-p2dpadtxtiv_b svg{display:block;height:16px;left:50%;margin-left:-8px;margin-top:-8px;position:absolute;top:50%;width:16px}.tp-p2dpadtxtiv_p{left:-4px;position:absolute;right:-4px;top:20px}.tp-p2dpadtxtiv_t{margin-left:4px}.tp-p2dtxtiv{display:flex}.tp-p2dtxtiv_w{align-items:center;display:flex}.tp-p2dtxtiv_w:nth-child(1){margin-right:1px}.tp-p2dtxtiv_w:nth-child(2){margin-left:1px}.tp-p2dtxtiv_i{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-color:transparent;border-width:0;font-family:inherit;font-size:inherit;font-weight:inherit;margin:0;outline:none;padding:0;background-color:var(--input-background-color);border-radius:2px;box-sizing:border-box;color:var(--input-foreground-color);font-family:inherit;height:20px;line-height:20px;min-width:0;width:100%;padding:0 4px;width:100%}.tp-p2dtxtiv_i:hover{background-color:var(--input-background-color-hover)}.tp-p2dtxtiv_i:focus{background-color:var(--input-background-color-focus)}.tp-p2dtxtiv_i:active{background-color:var(--input-background-color-active)}.tp-p2dtxtiv_w:nth-child(1) .tp-p2dtxtiv_i{border-top-right-radius:0;border-bottom-right-radius:0}.tp-p2dtxtiv_w:nth-child(2) .tp-p2dtxtiv_i{border-top-left-radius:0;border-bottom-left-radius:0}.tp-sldiv{display:block;padding:0}.tp-sldiv_o{box-sizing:border-box;cursor:pointer;height:20px;margin:0 6px;outline:none;position:relative}.tp-sldiv_o::before{background-color:var(--input-background-color);border-radius:1px;bottom:0;content:'';display:block;height:2px;left:0;margin:auto;position:absolute;right:0;top:0}.tp-sldiv_i{height:100%;left:0;position:absolute;top:0}.tp-sldiv_i::before{background-color:var(--button-background-color);border-radius:2px;bottom:0;content:'';display:block;height:12px;margin:auto;position:absolute;right:-6px;top:0;width:12px}.tp-sldiv_o:hover .tp-sldiv_i::before{background-color:var(--button-background-color-hover)}.tp-sldiv_o:focus .tp-sldiv_i::before{background-color:var(--button-background-color-focus)}.tp-sldiv_o:active .tp-sldiv_i::before{background-color:var(--button-background-color-active)}.tp-txtiv{display:block;padding:0}.tp-txtiv_i{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-color:transparent;border-width:0;font-family:inherit;font-size:inherit;font-weight:inherit;margin:0;outline:none;padding:0;background-color:var(--input-background-color);border-radius:2px;box-sizing:border-box;color:var(--input-foreground-color);font-family:inherit;height:20px;line-height:20px;min-width:0;width:100%;padding:0 4px}.tp-txtiv_i:hover{background-color:var(--input-background-color-hover)}.tp-txtiv_i:focus{background-color:var(--input-background-color-focus)}.tp-txtiv_i:active{background-color:var(--input-background-color-active)}.tp-cswiv{background-image:linear-gradient(to top right, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%),linear-gradient(to top right, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%);background-size:10px 10px;background-position:0 0,5px 5px;background-color:#fff;border-radius:2px}.tp-cswiv_sw{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-color:transparent;border-width:0;font-family:inherit;font-size:inherit;font-weight:inherit;margin:0;outline:none;padding:0;background-color:var(--input-background-color);border-radius:2px;box-sizing:border-box;color:var(--input-foreground-color);font-family:inherit;height:20px;line-height:20px;min-width:0;width:100%}.tp-cswiv_sw:hover{background-color:var(--input-background-color-hover)}.tp-cswiv_sw:focus{background-color:var(--input-background-color-focus)}.tp-cswiv_sw:active{background-color:var(--input-background-color-active)}.tp-cswiv_b{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-color:transparent;border-width:0;cursor:pointer;display:block;height:20px;left:0;margin:0;outline:none;padding:0;position:absolute;top:0;width:20px}.tp-cswiv_b:focus::after{border:rgba(255,255,255,0.75) solid 2px;border-radius:2px;bottom:0;content:'';display:block;left:0;position:absolute;right:0;top:0}.tp-cswiv_p{left:-4px;position:absolute;right:-4px;top:20px}.tp-cswtxtiv{display:flex;position:relative}.tp-cswtxtiv_s{flex-grow:0;flex-shrink:0;width:20px}.tp-cswtxtiv_t{flex:1;margin-left:4px}.tp-sldtxtiv{display:flex}.tp-sldtxtiv_s{flex:2}.tp-sldtxtiv_t{flex:1;margin-left:4px}.tp-lblv{align-items:center;display:flex;padding-left:4px;padding-right:4px}.tp-lblv_l{color:var(--label-foreground-color);flex:1;-webkit-hyphens:auto;-ms-hyphens:auto;hyphens:auto;padding-left:4px;padding-right:16px}.tp-lblv_v{align-self:flex-start;flex-grow:0;flex-shrink:0;width:160px}.tp-grpmv{display:block;padding:0;position:relative}.tp-grpmv_g{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-color:transparent;border-width:0;font-family:inherit;font-size:inherit;font-weight:inherit;margin:0;outline:none;padding:0;background-color:var(--monitor-background-color);border-radius:2px;box-sizing:border-box;color:var(--monitor-foreground-color);height:20px;width:100%;display:block;height:60px}.tp-grpmv_g polyline{fill:none;stroke:var(--monitor-foreground-color);stroke-linejoin:round}.tp-grpmv_t{color:var(--monitor-foreground-color);font-size:0.9em;left:0;pointer-events:none;position:absolute;text-indent:4px;top:0;visibility:hidden}.tp-grpmv_t.tp-grpmv_t-valid{visibility:visible}.tp-grpmv_t::before{background-color:var(--monitor-foreground-color);border-radius:100%;content:'';display:block;height:4px;left:-2px;position:absolute;top:-2px;width:4px}.tp-sglmv_i{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-color:transparent;border-width:0;font-family:inherit;font-size:inherit;font-weight:inherit;margin:0;outline:none;padding:0;background-color:var(--monitor-background-color);border-radius:2px;box-sizing:border-box;color:var(--monitor-foreground-color);height:20px;width:100%;padding:0 4px}.tp-mllmv_i{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-color:transparent;border-width:0;font-family:inherit;font-size:inherit;font-weight:inherit;margin:0;outline:none;padding:0;background-color:var(--monitor-background-color);border-radius:2px;box-sizing:border-box;color:var(--monitor-foreground-color);height:20px;width:100%;display:block;height:60px;line-height:20px;padding:0 4px;resize:none;white-space:pre}.tp-cswmv_sw{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-color:transparent;border-width:0;font-family:inherit;font-size:inherit;font-weight:inherit;margin:0;outline:none;padding:0;background-color:var(--monitor-background-color);border-radius:2px;box-sizing:border-box;color:var(--monitor-foreground-color);height:20px;width:100%}.tp-rotv{--font-family: var(--tp-font-family, Roboto Mono,Source Code Pro,Menlo,Courier,monospace);--base-background-color: var(--tp-base-background-color, #2f3137);--base-shadow-color: var(--tp-base-shadow-color, rgba(0,0,0,0.2));--button-background-color: var(--tp-button-background-color, #adafb8);--button-background-color-active: var(--tp-button-background-color-active, #d6d7db);--button-background-color-focus: var(--tp-button-background-color-focus, #c8cad0);--button-background-color-hover: var(--tp-button-background-color-hover, #bbbcc4);--button-foreground-color: var(--tp-button-foreground-color, #2f3137);--folder-background-color: var(--tp-folder-background-color, rgba(200,202,208,0.1));--folder-background-color-active: var(--tp-folder-background-color-active, rgba(200,202,208,0.25));--folder-background-color-focus: var(--tp-folder-background-color-focus, rgba(200,202,208,0.2));--folder-background-color-hover: var(--tp-folder-background-color-hover, rgba(200,202,208,0.15));--folder-foreground-color: var(--tp-folder-foreground-color, #c8cad0);--input-background-color: var(--tp-input-background-color, rgba(200,202,208,0.15));--input-background-color-active: var(--tp-input-background-color-active, rgba(200,202,208,0.35));--input-background-color-focus: var(--tp-input-background-color-focus, rgba(200,202,208,0.25));--input-background-color-hover: var(--tp-input-background-color-hover, rgba(200,202,208,0.15));--input-foreground-color: var(--tp-input-foreground-color, #c8cad0);--input-guide-color: var(--tp-input-guide-color, rgba(47,49,55,0.5));--label-foreground-color: var(--tp-label-foreground-color, rgba(200,202,208,0.8));--monitor-background-color: var(--tp-monitor-background-color, rgba(24,24,27,0.5));--monitor-foreground-color: var(--tp-monitor-foreground-color, rgba(200,202,208,0.7));--separator-color: var(--tp-separator-color, rgba(24,24,27,0.3));background-color:var(--base-background-color);border-radius:6px;box-shadow:0 2px 4px var(--base-shadow-color);font-family:var(--font-family);font-size:11px;font-weight:500;text-align:left}.tp-rotv_t{border-bottom-left-radius:6px;border-bottom-right-radius:6px;border-top-left-radius:6px;border-top-right-radius:6px}.tp-rotv.tp-rotv-expanded .tp-rotv_t{border-bottom-left-radius:0;border-bottom-right-radius:0}.tp-rotv_m{transition:none}.tp-rotv_c>.tp-fldv:last-child>.tp-fldv_c{border-bottom-left-radius:6px;border-bottom-right-radius:6px}.tp-rotv_c>.tp-fldv:last-child:not(.tp-fldv-expanded)>.tp-fldv_t{border-bottom-left-radius:6px;border-bottom-right-radius:6px}.tp-rotv_c>.tp-fldv:first-child>.tp-fldv_t{border-top-left-radius:6px;border-top-right-radius:6px}.tp-sptv_r{background-color:var(--separator-color);border-width:0;display:block;height:4px;margin:0;width:100%}.tp-v.tp-v-hidden{display:none}\n", ""]);

// exports


/***/ })

/******/ })["default"];
});
},{}],12:[function(require,module,exports){
module.exports = `mat1 = Material( 'phong', Vec3(.05), Vec3(1), Vec3(3), 64, Vec3( 0,4,4 ) )
 
m = march(
  StairsUnion(
    PolarRepeat(
      PolarRepeat(
        Torus82().material( mat1 ),
        20,
        2.75
      ).rotate(90, 1,0,0 ),
      25,
      2
    ),
    Plane( Vec3(0,.5,0) )
      .material( mat1 )
      .texture('noise', { strength:.15, scale:20 }),
    .25
  )
)
.fog( .15, Vec3(0) )
.light( Light( Vec3(0,.65,0), Vec3(1), .25 ) )
.render()
.camera( 0, 0, 10 )`

},{}],13:[function(require,module,exports){
module.exports=`/* __--__--__--__--__--__--__--____
Audio-Reactive Visuals

marching.js will perform an FFT analysis
of any sound/music fed to the browser. When
you first start the FFT, you'll be asked to
choose an audio device to listen to. You can
later change this in Chrome by clicking on
the camera icon in the browser window's location
bar.

By using software like SoundFlower or JACK you
can virtually route audio from your favorite music 
software into marching.js... or you can simply use a 
microphone / standard audio input.
__--__--__--__--__--__--__--____ */

// create a scene to play with
march(
  si = StairsIntersection(
    Sphere(2).material( 'white' ),
    repeat = Repeat(
      sphere = Sphere(.125),
      Vec3(.5)
    ),
    .125
  )
).render( 4, true )
 
// start our FFT
FFT.start()
 
// animate
onframe = time => {
  si.rotate( time * 15 )
  
  // our FFT object has low,mid, and high
  // properties that we can assign to elements
  // of our ray marching scene
  repeat.distance.x = FFT.low
  repeat.distance.y = FFT.mid
  repeat.distance.z = FFT.high
  sphere.radius = FFT.mid * FFT.high
}

si.d = 4
si.c = .5

/* __--__--__--__--__--__--__--____
increasing the window size (how many samples 
of audio the FFT looks at) will result in
less hectic animations. The window size must
be a power of 2; doubling and halving it is
an easy way to experiment with different sizes.
__--__--__--__--__--__--__--____ */

// run multiple times for greater effect
FFT.windowSize *= 2

/* __--__--__--__--__--__--__--____
One fun combinator use with the FFT is
Switch, which enables you to alternate
between two geometries depending on whether
or not an input exceeds a certain threshold.
__--__--__--__--__--__--__--____ */

// super-simple Switch example
march(
  s = Switch(
    Sphere(),
    Box()
  )
).render( 3, true )
 
// the threshold property is unhelpfully
// named 'c' for now...
onframe = t => s.c = t/2 % 1  


// extending our first example with Switch...
march(
  si = StairsIntersection(
    swt = Switch( 
      s = Sphere(2).material('red'),
      b = Box(1.75).material('white')
    ),
    repeat = Repeat(
      sphere = Sphere(.125),
      Vec3(.25)
    ),
    .125/2
  ),
  Plane( Vec3(0,1,0), 1.35 )
)
.fog(.25, Vec3(0) )
.render( 4, true )
 
onframe = t => {
  si.rotate( t * 15 )
  // try scaling the FFT results
  // by different values to control
  // the switch effect
  swt.c = FFT.low * 1
  
  repeat.distance.x = FFT.mid * FFT.low
  fft = (FFT.low + FFT.mid + FFT.high)
  
  // scale both our sphere and our box on every
  // frame, since we don't know which will be active
  s.radius = fft
  b.size = fft * .75
  
  sphere.radius = FFT.high / 2 
}`

},{}],14:[function(require,module,exports){
module.exports=`/* __--__--__--__--__--__--__--____

Note: this tutorial is only for people
who know GLSL and want to incorporate
their own shader code into marching.js

If you know some GLSL, it's not too
hard to add your own forms to
marching.js. The process consists of:

1. Defining all the interactive
properties of your form.

2. Defining a shader function that
will create your form when the proper
arguments are passed. This function
will only be added to the shader once.

3. Defining a call to your shader
function that passes the correct
arguments; this function call will
be inserted into the shader wherever
an instance of your form is placed
in the scene graph.

** __--__--__--__--__--__--__--__*/

spongeDesc = {
  // 'parameters' define our points of interaction.
  // types are float, int, vec2, vec3, and vec4
  parameters:[
    { name:'frequency', type:'float', default:5 }
  ],
 
  // this is the primary signed distance function
  // used by your form. The first argument should 
  // always be a point you're testing, subsequent
  // arguments are your parameters.
  glslify:
   \`float sineSponge( vec3 p, float frequency ) {
      p *= frequency;
      return (sin(p.x) + sin(p.y) + sin( p.z )) / 3. / frequency;
    }\`,
 
  // this is a function that will insert code calling
  // to your distance function wherever your form is
  // placed in a graph. It is passed the name of
  // the point (of type vec3) that is being sampled
  // by the ray marcher. Following passing 
  // the point, you will pass each of the input parameters
  // to your signed distance function (in this case, only frequency)
  primitiveString( pName ) { 
    return \`sineSponge( \${pName}, \${this.frequency.emit()} )\`
  }  
}
 
// create and store resulting constructor in a global variable
Sponge = Marching.primitives.create( 'Sponge', spongeDesc )
 
march( 
  obj = RoundDifference( 
    Sphere(2).material('glue'),
    s = Sponge( 5 ).material('glue'),
    .125   
  )
)
.light(
  Light( Vec3(0,5,5), Vec3(1), .5 )
)
.background( Vec3(.125) )
.render(3,true).camera(0,0,5)
 
onframe = t => {
  obj.rotate( t*10 )
  s.frequency = 10 + sin(t/2) * 5
}`

},{}],15:[function(require,module,exports){
module.exports = `/* __--__--__--__--__--__--__--__--
                                    
"constructive solid geometry (CSG)"
is the name given to techniques for
combining various geometries in
different ways. in this tutorial, 
we'll re-create the example shown 
on the wikipedia page for CSG:

https://bit.ly/2Fs2GV6
                                   
our first step will be to create
a rounded box, by taking the 
intersection of a box and a sphere.
we'll go ahead and render it to see
what it looks like.

** __--__--__--__--__--__--__--__*/

roundedSphere = Intersection(
  Box( .775 ).material( 'red' ),
  Sphere( 1 ).material( 'blue' )
)
 
march( roundedSphere ).render()

/* __--__--__--__--__--__--__--__--

it's a little tricky to get a feel
for it viewing it straight on, so
let's rotate it along two axes.

** __--__--__--__--__--__--__--__*/

roundedSphere = Intersection(
  Box( .775 ).material( 'red' ),
  Sphere( 1 ).material( 'blue' )
)
 
// rotate() takes an angle followed by
// x,y, and z axis for rotation
roundedSphere.rotate( 45, 1,1,0 )
 
march( roundedSphere ).render()

/* __--__--__--__--__--__--__--__--

great. next we want to make a cross
that we'll subtract from our rounded
sphere. We can do this by combining
three cylinders. We'll rotate one
on the z-axis and one on the x-axis.
The Union2 operator is a shortcut
to combine as many objects as we
want (regular Union only lets us
combine two).

** __--__--__--__--__--__--__--__*/

crossRadius = .5
crossHeight = 1
dimensions = Vec2(crossRadius, crossHeight )
 
cross = Union2(
  Cylinder( dimensions ).material( 'green' ),
  Cylinder( dimensions )
    .material( 'green' )
    .rotate( 270, 0,0,1 ),
  Cylinder( dimensions )
    .material( 'green' )
    .rotate( 270, 1,0,0 )
)
 
march( cross ).render()

/* __--__--__--__--__--__--__--__--

OK, now we put it all together by
subtracting the cross from our 
rounded sphere. we will animate the
rotation of ourfinal geometry to 
get a good view from a bunch of 
angles. 

** __--__--__--__--__--__--__--__*/

roundedSphere = Intersection(
  Box( .775 ).material( 'red' ),
  Sphere( 1 ).material( 'blue' )
)
 
crossRadius = .5
crossHeight = 1
dimensions = Vec2(crossRadius, crossHeight )
  
cross = Union2(
  Cylinder( dimensions ).material( 'green' ),
  Cylinder( dimensions )
    .material( 'green' )
    .rotate( 270, 0,0,1 ),
  Cylinder( dimensions )
    .material( 'green' )
    .rotate( 270, 1,0,0 )
)
 
march(
  obj = Difference(
    roundedSphere,
    cross
  ).rotate( 45, 1,.5,0 )
)
.render( 3, true )
 
callbacks.push( t => obj.rotate( t * 25 ) )`

},{}],16:[function(require,module,exports){
module.exports = `v3 = Vec3, v2 = Vec2

mat1 = Material( 'phong', .05, 1, .5 )

// Torus: Vec2 radius(outer,inner)
torus = Torus( v2(.5,.1) )
  .move( -2.25,1.5  )
  .rotate( 90, 1,0,0 )
  .material( mat1 )
  
// Torus82: Vec2 radius
torus82 = Torus82()
  .move( -.75,1.5,0 )
  .rotate( 90, 1,0,0 )
  .material( mat1 )
  
// Torus88: Vec2 radius
torus88 = Torus88()
  .move( .6,1.5,0 )
  .rotate( 90, 1,0,0 )
  .material( mat1 )
  
// Sphere: float radius
sphere  = Sphere(.65)
  .move( 2.25,1.5,0 )
  .material( mat1 )
 
// Box: Vec3 size
box = Box( .5 )
  .move( -2,0,0 )
  .material( mat1 )
 
// Cylinder: Vec2( radius, height )
cylinder = Cylinder( v2(.35,.5) )
  .move( -.75,0,0 )
  .material( mat1 )
 
// Cone: Vec3 dimensions
cone = Cone( v3(.1, .075, .925) )
  .move( .6,.45,0 )
  .material( mat1 )
 
// Octahedron: float size
octahedron = Octahedron( .65 )
  .move(2.25,0,0)
  .material( mat1 )
 
// HexPrism: Vec2 size(radius, depth)
hexPrism = HexPrism( v2(.6,.45) )
  .move( -2,-1.5,0 )
  .material( mat1 )
 
// TriPrism: Vec2 size(radius, depth)
triPrism = TriPrism( v2(.85,.3) )
  .move( -.5,-1.75,0 )
  .material( mat1 )
 
// RoundBox: Vec3 size, roundness
roundBox = RoundBox( v3(.45), .15 )
  .move( 1.15,-1.5,0 )
  .material( mat1 )
 
// Capsule: Vec3 start, Vec3 end, float radius
capsule = Capsule( v3( 0, -.55, 0), v3(0,.4,0), .25 )
  .move( 2.5,-1.5, 0 )
  .material( mat1 )
 
mat = Material( 'phong', v3(0), v3(.1), v3(.25) )
// Plane: Vec3 normal, float distance
plane = Plane( v3(0,0,1), 1).material( mat )
 
march(
  torus, torus82, torus88, sphere,
  box, cylinder, cone, capsule,
  octahedron, hexPrism, triPrism, roundBox,
  plane
)
.light( 
  Light( Vec3(2,0,5), Vec3(1), .2 )
) 
.render()
.camera( 0,0, 6 )`

},{}],17:[function(require,module,exports){
module.exports = `march(
  Repeat(
    StairsDifference(
      Sphere(2),
      Repeat( Sphere( .1 ), .25 ),
      .25,
      10
    ),
    6
  ).translate( 0,-1.5 ),
  Plane().texture( 'cellular', { strength:-.5, scale:10 })
)
.fog( .1, Vec3(0,0,.25) )
.background( Vec3(0,0,.25) )
.render()

/* __--__--__--__--__--__--__--____
                                    
select code and hit ctrl+enter to  
execute. alt+enter (option+enter on 
a mac) executes a block of code.   
ctrl+shift+g toggles hiding         
the gui/code. try the other demos  
using the menu in the upper right 
corner. when you're ready to start 
coding go through the tutorials     
found in the same menu. Click on   
the help link for a reference.       
                                   
For a nice intro on ray marching and
signed distance functions,which are
the techniques used by marching.js, 
see:                               
                                    
https://bit.ly/2qRMrpe             
                                    
Finally, if you'd prefer to work   
outside of the browser, try the     
Atom plugin for marching.js:       
                                    
https://atom.io/packages/atom-marching
                                    
** __--__--__--__--__--__--__--__*/`

},{}],18:[function(require,module,exports){
module.exports=`mat1 = Material( 'phong', Vec3(.0),Vec3(.5),Vec3(1), 32, Vec3(0,.25,1) )
tex  = Texture(  'cellular', { strength:.15, scale:20 })  
 
march(
  Julia(1.5)
    .material( mat1 )
    .texture( tex )
    .bump( tex, .05 )
)
.light( 
  Light( Vec3(5,5,8), Vec3(1), .025 ) 
)
.fog( 1, Vec3(0) )
.render()
.camera(0,0,1.75)
`

},{}],19:[function(require,module,exports){
module.exports =`/* __--__--__--__--__--__--__--__--
                                    
By default, marching.js uses a
lighting system consisting of a
skydome(fill), a single front light,
and a back light. This lighting
system includes ambient occlusion
and basic shadows, as taken from
this demo by Inigo Quilez:

https://www.shadertoy.com/view/Xds3zN

However, each Material in marching.js
can uses its own lighting algorithm.
In the example below, the left sphere and
the ground plane use the default lighting
algorithm while the right sphere uses
the normal for each pixel to determine 
its color.

** __--__--__--__--__--__--__--__*/

march(
  Sphere( 1 ).translate(-1.25),
  Sphere( 1 )
    .translate(1,0,0)
    .material( 'normal' ),
  Plane()
)
.render()

/* __--__--__--__--__--__--__--__--

For most shapes, the third values
passed to constructors will determine
the material used by the shape. In 
the last example we saw that there is
a "preset" to use normals for lighting;
there are also presets for common 
colors.

** __--__--__--__--__--__--__--__*/

march(
  Sphere( 1 )
  	.translate( -1.25 )
  	.material( 'green' ),
  Sphere( 1 )
  	.translate(1)
  	.material( 'red' ),
  Plane().material( 'yellow' )
)
.render()

/* __--__--__--__--__--__--__--__--

Note that each geomety's color is
determined by both properties of its
material and the lights in the scene.
For example, we could change the scene
above to use magenta light, our green
sphere will essentially show up as
black (magenta light contains no green).

** __--__--__--__--__--__--__--__*/

march(
  Sphere( 1 )
  	.translate( -1.25 )
  	.material( 'green' ),
  Sphere( 1 )
  	.translate(1)
  	.material( 'red' ),
  Plane().material( 'yellow' )
)
.light( Light( Vec3(2,2,3), Vec3(1,0,1) ) )
.render()

/* __--__--__--__--__--__--__--__--

To really get full control over our
lighting, we'll want to avoid the 
default lighting scheme, which has
some properties baked in, and 
customize everything by hand. The
example below uses the Phong
lighting model, with an additioanl
Fresnel effect added. We'll also
use a simple white light positioned
to the upper left of the scene's
center.

** __--__--__--__--__--__--__--__*/

mat1 = Material( 'phong', Vec3(.05), Vec3(.5), Vec3(1), 8 )
march(
  Sphere( 1 ).material( mat1 ),
  Plane().material( mat1 )
)
.light( Light( Vec3(2,2,3), Vec3(1) ) )
.render()

/* __--__--__--__--__--__--__--__--

In the example above, our material
uses the 'phong' lighting model, has
a ambient RGB coefficient of .05,
diffuse RGB coefficient of .5,
specular RGB coefficients of 1. The
last number determines the diffuseness
of the specular highlights, with lower
numbers yielding more diffuse highlights.

We can add a final Vec3 to control
the Fresnel effect on the material,
which can create a halo effect around
a geometry. The three parameters for
the Fresnel effect are bias, scale, 
and power.

** __--__--__--__--__--__--__--__*/

mat1 = Material( 'phong', Vec3(.05), Vec3(.5), Vec3(1), 8, Vec3(1,50,5) )
mat2 = Material( 'phong', Vec3(.05), Vec3(.5), Vec3(1), 8 )
march(
  Sphere( 1 ).material( mat1 ),
  Plane().material( mat2 )
)
.light( Light( Vec3(2,2,3), Vec3(1) ) )
.render()

/* __--__--__--__--__--__--__--__--

We can have lots of lights! However,
this will increase rendering time,
so tread carefully if you're doing
realtime work.

** __--__--__--__--__--__--__--__*/

mat1 = Material( 'phong', Vec3(.05), Vec3(.5), Vec3(1), 8, Vec3(1,50,5) )
mat2 = Material( 'phong', Vec3(.05), Vec3(.5), Vec3(1), 8 )
march(
  Sphere( 1 ).material( mat1 ),
  Plane().material( mat2 )
)
.light( 
  Light( Vec3(2,2,3), Vec3(1) ),
  Light( Vec3(-2,2,3), Vec3(1,0,0) ),
  Light( Vec3(0,0,-3), Vec3(0,0,1) ),  
)
.render()

/* __--__--__--__--__--__--__--__--

Two other elements that affect 
lighting in marching.js are fog and
shadows. The fog() method accepts
two arguments, a color for the fog
and an intensity coefficient. For
typical fog effects, set the fog
color to be the same as the background
color for the scene.

** __--__--__--__--__--__--__--__*/

march(
  Sphere()
  	.translate(-1.25,0,0)
  	.material( 'green' ),
  Sphere()
  	.translate(1)
  	.material( 'red' ),
  Plane().material( 'yellow' )
)
.background( Vec3(0,0,.5) )
.fog( .125, Vec3(0,0,.5) )
.render()

/* __--__--__--__--__--__--__--__--

The effect is especially easy to see
on fields of repeated geoemtries. Run
the code below, and then uncomment
the fog and run it again.

** __--__--__--__--__--__--__--__*/

mat1 = Material( 'phong', Vec3(.05), Vec3(.5), Vec3(1), 8, Vec3(1,4,1) )
march(
  Repeat(
    Sphere( .25 ).material( mat1 ),
    Vec3( .75)
  )
)
.light( 
  Light( Vec3(2,2,3), Vec3(1) ),
  Light( Vec3(-2,2,3), Vec3(1,0,0) ),
)
.background( Vec3(0) )
//.fog( .5, Vec3(0) )
.render()

/* __--__--__--__--__--__--__--__--

Last but not least, we can change 
the softness of shadows in our scene
by adjusting a shadow coefficient.
Lower values (such as 2) yield soft,
diffuse shadows while high values
(like 16 or 32) yield shadows with
hard edges. You can also pass a value
of 0 to remove shadows from a scene.
Experiment with passing different
values to the shadow method below.

** __--__--__--__--__--__--__--__*/

mat1 = Material( 'phong', Vec3(.05), Vec3(.5), Vec3(1), 8, Vec3(0,1,2) )
march(
  Box( .75 )
  	.translate( 0,.25,1 )
    .material( mat1 ),
  Plane().material( mat1 )
)
.light( Light( Vec3(-1,2,2), Vec3(1) ) )
.shadow(2)
.render()`

},{}],20:[function(require,module,exports){
module.exports = `/* __--__--__--__--__--__--__--____
Live Coding

There are a couple of techniques 
that can make live coding a bit 
easier in marching.js. First, if
you're doing any audio-reactive
visuals, be sure to check out the
audio / FFT tutorial.

You'll notice that many demos
and tutorials use a pattern where
we name objects in our graph for
subsequent manipulations. This is
an important step to get used to
when you're setting up your graph.
__--__--__--__--__--__--__--____ */

march(
  rpt = Repeat(
    Sphere(.125),
    Vec3(.5)
  )
).render( 3, true )

// now we can change the distance later...
rpt.distance.x = 1

/* __--__--__--__--__--__--__--____
Easy enough. However, a problem occurs
if you then re-execute your calls
to march / render... the repeat distance
is reset to the the value in its
constructor. During live coding
performances you often want to 
maintain state (as much as possible)
while making changes to the graph, so
that abrupt changes don't occur.

If you run the line:

Marching.useProxies = true

...a new behavior is enabled. When
you create an object in
the global namespace, a 'proxy' is
created. IF you reassign a new
object to this proxy, the proxy
will copy all the properties of
the previous object to the new one.
This enables you to re-execute
the graph while maintaining state,
and makes it much easier to acheive
continuity when live coding. Try running
the code below:
__--__--__--__--__--__--__--____ */

// run this line by itself before
// executing other code
Marching.useProxies = true

march(
  rpt2 = Repeat(
    Sphere(.125),
    Vec3(.5)
  )
).render( 3, true )

rpt2.distance.x = 1

// if you re-execute the graph
// now, you'll notice the distance.x
// value is maintained. This only
// works because we enabled proxies
// and assigned our Repeat object
// to the same global variable.

/* __--__--__--__--__--__--__--____
Another useful technique, that relies
on assigning names to objects, is
to "fade", or transition gradually,
to a new state in objects. 
__--__--__--__--__--__--__--____ */

march( s = Sphere(0) ).render( 3, true )
fade( 's','radius', 2, 10 )

/* __--__--__--__--__--__--__--____
In the example above, we give the 
name of the object we want to manipulate,
the name of the property, the value
we want to transition to, and the
length in seconds of the transition.
There is quadratic easing on the fade.

By using dot notation in the property
string, we can fade individual vector
members.
__--__--__--__--__--__--__--____ */


march( b = Box() ).render( 3, true )
fade( 'b','size.x', 2, 10 )

/* __--__--__--__--__--__--__--____
it's also worth noting we can
fade a whole vector by simply
leaving out the dot notation. The
example below fades the size on
the x,y,and z axis in one line of
code. Note we have to use a new name
to avoid the proxy effect!
__--__--__--__--__--__--__--____ */

march( b2 = Box() ).render( 3, true )
fade( 'b2','size', 1.5, 10 )

/* __--__--__--__--__--__--__--____
We can use the same vector shortcut when 
manipulate animation at the frame level.
__--__--__--__--__--__--__--____ */

march(
  rpt2 = Repeat(
    b3 = Box(),
    Vec3(1)
  )
)
.fog( .25, Vec3(0) )
.render( 3, true )
 
onframe = t => {
  // manipulate one vector member
  rpt2.distance.x = .5 + Math.sin( t/3 ) * .125
  
  // manipulate entire vector at once
  b3.size = .1 + Math.cos( t/2 ) * .075
}

/* __--__--__--__--__--__--__--____
Hopefully this is enough to get you
started live coding. Between the use of
onframe, fade, the fft, and proxies, there's
a number of tools to get started.
__--__--__--__--__--__--__--____ */`

},{}],21:[function(require,module,exports){
module.exports = `mat1 = Material( 'phong', Vec3(.0),Vec3(.5),Vec3(1), 32, Vec3(0) )
 
march(
  Mandelbulb( 6.5 )
    .rotate( 270, 1,0,0 )
  	.translate( 0,0,.5 )
    .material( mat1 ),
 
  Plane( Vec3(0,0,1), .5 ).material( 'white glow')
)
.light( 
  Light( Vec3(-3,2,4), Vec3(1), .25 ),
  Light( Vec3(0,0,4), Vec3(1), .95 )
)
.render()
.camera( 0,0,3 )`

},{}],22:[function(require,module,exports){
module.exports = `/* __--__--__--__--__--__--__--____
                                    
Marching.js wraps the mergepass lib
for performing post-processing:     
                                    
https://tinyurl.com/y4zxayey       
                                    
There's a bunch of presets that make
fun effects. These effects are called
"post" processing because they are
applied to the marching.js scene after
it has been rendered... think of them
as filters in Photoshop.          
                                   
All post-proccessing effects are  
applied through the .post() method.
                                  
** __--__--__--__--__--__--__--__*/

// simple but fun---godrays

march(
  i = Intersection(
    Box(1.5),
    Repeat( Sphere(.125), .5 )
  )
)
.post( rays = Godrays() )
.render('med')
 
onframe = t => i.rotate( t*10, 1,.5,.25 )

// try below one line at a time
rays.color = [1,0,1]
rays.decay = 1.01
// change z position of rays to put
// them in the box
rays.threshold = .25


// __--__--__--__--__--__--__--____
// ok, let's try and example based
// on simulating a depth-of-field effect.
// this will blur areas out of focus.

march(
  Repeat(
    Box().texture('dots').scale(.25),
    1.5
  )
)
.post( f = Focus() )
.fog( .15, Vec3(0) )
.render('med')
 
onframe = t => camera.pos.z = t/3

// change depth target
f.depth = .15
// change width of focus
f.radius = .05


// __--__--__--__--__--__--__--____
// last but not least, let's combine
// a bunch of options. look in the reference
// for more post-processing effects to layer!

march(
  ri = RoundIntersection(
    s = Sphere(2).material('green').texture('dots', { scale:75 }),
    r = Repeat(
      Box().scale(.1).material('green').texture('dots', { scale:10 }),
      .5
    )
  )
)
.post(
  bloom = Bloom(.25,8),
  g = Godrays(),
  Edge()
)
.render('med')
  
z = 0
onframe = t => {
  z += abs( sin(t/2) * .02 )
  r.translate( 0,0,z )
  ri.rotate( t*15,1,.5,.25 )
}
 
g.decay = 1.01`

},{}],23:[function(require,module,exports){
module.exports = `/* Marching.js lets you define your own
procedural textures; this is a very
similar process to defining your own
GLSL geometries, covered in another
tutorial. You give your texture a name,
define a set of parameters you would
like to expose for control, and then
write a snippet of GLSL that generates
a color based on the current pixel position
and the values of the various parameters
you defined.

Below is the 'dots' texture included 
in Marching.js in use; we'll be
extending it to enable some different
control parameters to get a feel for the
process of defining a texture.*/

march( s = Sphere(1.5).texture('dots') )
.fog( .15, Vec3(0))
.render( 3, true )
 
onframe = t => s.rotate(t*10, 1,0,0 )

/* Below is the code for 'dots', renamed
to 'dots2', and put into action. One
important aspect to notice is that the
'name' property of the definition must 
match the name of the GLSL function that
you define.*/

def = {
  // define the name for our texture
  name:'dots2',
  // define parameters for interaction
  parameters: [
    { name:'scale', type:'float', default:5 },
    { name:'color', type:'vec3', default:[1,1,1] }
  ],
  // define our GLSL function, which must output a
  // RGB color in a vec3, and must be named the same
  // as our definition's 'name' property.
  glsl:\`          
    vec3 dots2( vec3 pos, float count, vec3 color ) {
      vec3 tex;
      tex = vec3( color - smoothstep(0.3, 0.32, length(fract(pos*(round(count/2.)+.5)) -.5 )) );
      return tex;
    }\` 
}
 
// To create a function, call Texture.create
// and pass a defintion.
 
Texture.create( def )
 
// use it
march( s = Sphere(1.5).texture('dots2') )
.fog( .15, Vec3(0))
.render( 3, true )

// That should look the same as the original
// texture in this tutorial. Let's add a couple
// new parameters: the first will control the
// base radius of our circles, while the second
// will control the softness of the circle edges.
// Larger values for softness will generate
// larger circles with soft edges. Both these
// parameters will be used in the call to 
// smoothstep in our GLSL code.

def =  {
  name:'dots2',
  parameters: [
    { name:'scale', type:'float', default:10 },
    { name:'radius', type:'float', default:.35 },    
    { name:'spread', type:'float', default:.02 },    
    { name:'color', type:'vec3', default:[1,1,1] }
  ],
  glsl:\`vec3 dots2( vec3 pos, float scale, float radius, float spread, vec3 color ) {
    vec3 tex;
    tex = vec3( color - smoothstep(radius, radius+spread, length(fract(pos*(round(scale/2.)+.5)) -.5 )) );
    return tex;
  }\` ,
}
 
Texture.create( def )
 
march( s = Sphere(1.5).texture('dots2', { radius:.05 }) ).render(5, true)
 
// animate our parameters
onframe = t => {
  s.rotate(t*10,1,0,0)
  s.texture.color.x = sin(t)
  s.texture.color.y = cos(t/3)
  s.texture.spread = t % .5
  s.texture.scale = t % 10
}`

},{}],24:[function(require,module,exports){
module.exports = `// because, like, marching.js, snare drums, marching...
 
const grey = Material( 'phong', Vec3(0), Vec3(3), Vec3(2), 32, Vec3(0,0,2) ),
      white = Material( 'phong', Vec3(0), Vec3(50), Vec3(1), 8, Vec3(0,50,2) ),
      a = .45, b = .25 // for side bands on drum
 
stick = ()=> {
  return Union(
    Groove(
      Cylinder( Vec2(.2,2.5), Vec3(.5,4.5,-.5) )
        .move( .5,4.5,-.5 )
        .material( grey ),
      Capsule( Vec3(.5, 2,-.5), Vec3(.5,2.25,-.5), 1 ).material( grey ),
      .08
    ),
    Capsule( Vec3(.5, 2,-.5), Vec3(.5,2.25,-.5), .175 ).material( grey )
  )
}
 
stickL = stick()
  .rotate( 300, 0,0,1 )
  .move( -1.5,.25, 0 )
 
stickR = stick()
  .rotate( 300, 0,.75,.5 )
  .move( -2.05,.0, -.5 )
 
drum = RoundUnion(
  Union2(
    ChamferDifference(
      Cylinder( Vec2(2.25, .45) ).material( grey ),
      Cylinder( Vec2(2,.4) ).material( grey ),
      .1
    ),
    Cylinder( Vec2(2,.3) ).material( white )
  ),
  PolarRepeat(
    Quad( Vec3(0,-a,-b), Vec3(0,-a,0), Vec3(0,a,b), Vec3(0,a,0) ).material( grey ),
    15,
    2.25
  ),
  .05
)
 
march(
  drum.rotate( 60, 1,1,0 ),
  stickL,
  stickR
)
.background(Vec3(0))
.shadow(.75)
.light( Light( Vec3(2,5,8), Vec3(1), .125 ) )
.render()
.camera( 0,0,7 )`

},{}],25:[function(require,module,exports){
module.exports = `// a 3D superformula essentially two 2D supershapes,
// first six coefficients govern one, second
// six coefficients govern the other.

mat1 = Material( 'phong', Vec3(.0),Vec3(0),Vec3(1), 16, Vec3(0,.25,4) )
 
m = march(
  s = SuperFormula(
    1, 1, 16, 1, 1, 1,
    1, 1, 16, 1, 1, 1
  )
  .translate( 0, .5, .85 )
  .material( mat1 )
  .texture( 'truchet', { color:.125, scale:30 } ),
 
  Plane( Vec3(0,1,0), 1 ).material( Material('phong', Vec3(.15), Vec3(1) ) )
)
.light( 
  Light( Vec3(0,5,0), Vec3(.25,.25,.5), .5 ),
  Light( Vec3(3,3,0), Vec3(.5), .5 )
)
.fog( .25, Vec3(0) )
.render( 2, true )
.camera( 0,0,5 )
 
onframe = time => {
  t = 12
  s.n1_1 = Math.PI + Math.sin( time )
  s.n1_2 = Math.PI + Math.cos( time )
  s.m_1 = Math.sin( time / 2 ) * t
  s.m_2 = Math.cos( time / 2 ) * t
  s.rotate( time * 10, 0,1,0 )
}

// thanks to https://github.com/Softwave/glsl-superformula`

},{}],26:[function(require,module,exports){
module.exports =`// In this demo the important point 
// to note is that transformations can be applied to
// most functions, not just geometries. Here, a
// rotation is applied to a Union while translation
// is applied to the domain created by Repeat().
//
// Note that the quality argument in the call to
// .render() is set quite low; if you have
// a nice graphics card try raising this
// value to obtain prettier results.
 
march(
  rpt = Repeat(
    union = Union2(
      cyl = Cylinder(Vec2(1,1.5))
        .texture('dots', {scale:2}),
      cyl2 = Cylinder(Vec2(.95,1.5))
        .rotate(90,0,0,1)    
        .texture('stripes', {scale:1}),
      cyl3 = Cylinder(Vec2(.95,1.5))
        .rotate(90,1,0,0)
        .texture('checkers', {scale:5})
    )
    .scale(.15),
    .75
  )
)
.fog( .5, Vec3( 0 ) )
.render( 2,true )
  
onframe = time => {
  union.rotate( time*65,1,.5,.5 )
  rpt.translate( 0,0,time/3 )
}`

},{}],27:[function(require,module,exports){
module.exports =`zigzag = Box(.5)
  .move( -2,1.25 )
  .texture(
    'zigzag', 
    { scale:5 }
  )
 
dots = Box(.5)
  .move( -0,1.25 )
  .texture(
    'dots', 
    { 
      scale:10, 
      color:[1,0,0]
    }
  )
 
noise = Box(.5)
  .move( 2,1.25 )
  .texture(
    'noise', 
    { 
      wrap:true, 
      scale:20, 
      color:[1,0,0]
    }
)
 
truchet = Box(.5)
  .move( -2,-.15 )
  .texture(
    'truchet', 
    { 
      scale:20, 
      color:[0,1,1] 
    }
)
 
stripes = Box(.5)
  .move( -0,-.15)
  .texture(
    'stripes', 
    { 
      scale:10, 
      color:[1,0,0]
    }
)
 
checkers = Box(.5)
  .move( 2, -.15 )
  .texture(
    'checkers', 
    { 
      scale:20, 
      color1:[0,1,1], 
      color2:[1,0,0] 
    }
  )
 
cellular = Box(.5)
  .move( -2, -1.55 )
  .texture(
    'cellular', 
    { 
      scale:10, 
      strength:1 
    }
)

rainbows = Box(.5)
  .move( -0,-1.55)
  .texture(
    'rainbow', 
    { 
      scale:4
    }
)
 
voronoi = Box(.5)
  .move( 2,-1.55 )
  .texture(
    'voronoi', 
    { 
      wrap:true, 
      scale:10, 
      mode:2 
    }
)
 
bg = Plane( Vec3(0,0,1), .5 ).material('white glow')
 
march( 
  zigzag, dots, noise, 
  truchet, stripes, cellular, 
  checkers, rainbows, voronoi, bg
)
.render()`

},{}],28:[function(require,module,exports){
module.exports = `/* __--__--__--__--__--__--__--__--
                                    
let's start by making a simple     
scene with one sphere.  highlight   
the lines below and hit ctrl+enter 
to run them. make sure not to high- 
light these instructions. you can  
also hit alt+enter (option in macOS)
to run an entire block at once. use
ctrl+. (period) to clear graphics.  
                                   
** __--__--__--__--__--__--__--__*/

sphere1 = Sphere()
 
march( sphere1 )
  .render( 2, true )

/* __--__--__--__--__--__--__--__--
                                    
the march() method accepts an array
of objects that can be geometric    
primitives or transformations. we  
can now change the radius of our    
sphere:                            
                                    
** __--__--__--__--__--__--__--__*/

sphere1.radius = 1.25

/* __--__--__--__--__--__--__--__--
                                    
or change its position...        
                                   
** __--__--__--__--__--__--__--__*/

sphere1.move( .5, -.5 )

/* __--__--__--__--__--__--__--__--
                                    
note that we can only make these   
changes after the initial render if 
a value of true is passed to our   
render function as its second       
parameter. Depending on the        
computer you use, you probably will 
want to turn the resolution down   
(the first arg) when animating the  
scene. If no value or a value of   
false is passed as the second       
argument, marching.js will create a
static image at maximum quality.   
                                    
we can also register a onframe function 
to change properties over time. this  
runs once per video frame, and is  
passed the current time. here we'll 
use the time to change the sphere's
position.                           
                                   
** __--__--__--__--__--__--__--__*/

onframe = time => {
  sphere1.move( 
    Math.sin( time/2 ) * 2,
    null,
    Math.sin( time ) * 4
  )
}

/* __--__--__--__--__--__--__--__--
                                    
this library uses signed distance  
functions (SDFs) to render geometry 
and perform transformations. You   
can do fun stuff with SDFs. Below   
we'll render a box, but subtract a 
sphere from its center.             
                                   
** __--__--__--__--__--__--__--__*/

march( 
  Difference( 
    Box(), Sphere( 1.35 ) 
  )
)
.render()

/* __--__--__--__--__--__--__--__--
                                    
we can animate this as well. we'll 
turn down the quality first...      
try turning it back up and see if  
your computer can handle it.        
                                   
** __--__--__--__--__--__--__--__*/

sphere2 = Sphere( 1.35 )
box1 = Box()
 
march(
  Difference( box1, sphere2 )
)
.render( 3, true )
 
onframe = time => sphere2.radius = 1.25 + Math.sin( time ) * .1


/* __--__--__--__--__--__--__--__--
                                    
One fun transform we can do is to  
repeat a shape throughout our scene,
We can define how coarse/fine these
repetitions are.                    
                                   
** __--__--__--__--__--__--__--__*/

march(  
  Repeat( 
    Sphere( .25 ),
    1
  ) 
) 
.render()

/* __--__--__--__--__--__--__--__--
                                    
The vector we pass as the second   
argument to repeat determines the   
spacing; higher numbers yield fewer
repeats. What if we want to take two
shapes and repeat them? In order to
do that we need to create a union.  
                                   
** __--__--__--__--__--__--__--__*/

sphere3 = Sphere( .35 )
box3 = Box( Vec3( .35 ) ) 
sphereBox = RoundUnion( sphere3, box3, .9 )
 
march(  
  Repeat( sphereBox, 2 )
) 
.render( 3, true )
 
onframe = time => sphere3.radius = Math.sin( time ) * .75

/* __--__--__--__--__--__--__--__--
                                    
Hopefully your computer can handle 
that, but if not, you can always    
lower the resolution further or    
shrink your browser window. Lowering
your monitor resolution while doing
realtime experiments or performances
will also help (especially with    
hidpi or "retina" displays). in     
addition to improving efficiency,  
we can also change the performance  
of our raymarcher to get fun glitch
effects.                            
                                   
** __--__--__--__--__--__--__--__*/`


/*
march(  
  Sphere( Noise() )
)
// halve the resolution
.resolution(.5)
// only take one sample per ray
.steps(1)
// how far do our rays go?
.farPlane(10)
// ignore quality parameter in favor
// of the other settings we've defined
// and animate
.render(null, true)*/

},{}],29:[function(require,module,exports){
module.exports =`Material.default = Material.grey

m = march(
  StairsUnion(
    Repeat(
      t = Twist(
        PolarRepeat(
          Cylinder( Vec2(.025,2.75) ),
          10,
          .25
        ).rotate( 270, 1,0,0 ),
        Vec3(0)
      ),
      Vec3(2.5,0,0)
    ),
    Plane(),
    .35
  )
)
.light( Light( Vec3(.4), Vec3(.5) ) )
.background( Vec3(.5,.6,.7) )
.render(3, true )
.camera( 2, 0, 6 )
 
onframe = time => {
  t.amount = Math.sin(time/4)*5
}`

},{}],30:[function(require,module,exports){
const CodeMirror = require( 'codemirror' )

require( '../node_modules/codemirror/mode/javascript/javascript.js' )
require( '../node_modules/codemirror/addon/edit/matchbrackets.js' )
require( '../node_modules/codemirror/addon/edit/closebrackets.js' )
require( '../node_modules/codemirror/addon/hint/show-hint.js' )
require( '../node_modules/codemirror/addon/hint/javascript-hint.js' )
require( '../node_modules/codemirror/addon/display/fullscreen.js' )
require( '../node_modules/codemirror/addon/selection/active-line.js' )
require( '../node_modules/codemirror/addon/display/panel.js' )
require( '../node_modules/mousetrap/mousetrap.min.js' )

const Tweakpane = require('tweakpane')

const demos = {
  introduction: require( './demos/intro.js' ),
  ['textured transformations']: require('./demos/texture_transforms.js'),
  ['the superformula']: require('./demos/superformula.js' ),
  ['mandelbulb fractal']: require( './demos/mandelbulb.js' ),
  ['julia fractal']: require( './demos/julia.js' ),
  ['alien portal']: require( './demos/alien_portal.js' ),
  ['snare and sticks']: require( './demos/snare.js' ),
  //['kaleidoscopic fractals']: require( './demos/kifs.js' ),
  //['alien portal #2']: require( './demos/portal2.js' ),
  ['twist deformation']: require( './demos/twist.js' ),
  ['geometry catalog']: require( './demos/geometries.js' ),
  ['textures catalog']: require( './demos/textures.js' ),
}

const tutorials = {
  ['start here']: require( './demos/tutorial_1.js' ),
  ['constructive solid geometry']: require( './demos/csg.js' ),
  ['lighting and materials']: require( './demos/lighting.js' ),
  ['post-processing effects']: require( './demos/postprocessing.js' ),
  ['audio input / fft']: require( './demos/audio.js' ),
  ['live coding']: require( './demos/livecoding.js' ),
  ['defining your own GLSL shapes']: require( './demos/constructors.js' ),
  ['defining procedural textures']: require( './demos/procedural_textures.js' )
}

Math.export = ()=> {
  const arr = Object.getOwnPropertyNames( Math )
  arr.forEach( el => window[el] = Math[el] )
}

window.onload = function() {
  const ta = document.querySelector( '#cm' )

  const SDF = window.Marching

  SDF.init( document.querySelector('canvas') )
  SDF.export( window )
  SDF.keys = {
    w:0,
    a:0,
    s:0,
    d:0,
    alt:0
  }

  Math.export()
  SDF.useProxies = false

  let hidden = false
  let fontSize = .95
  SDF.cameraEnabled = false

  //document.querySelector('#cameratoggle').onclick = e => {
  //  SDF.cameraEnabled = e.target.checked
  //}

  CodeMirror.keyMap.playground =  {
    fallthrough:'default',

    'Ctrl-Enter'( cm ) {
      try {
        const selectedCode = getSelectionCodeColumn( cm, false )

        flash( cm, selectedCode.selection )

        const code = selectedCode.code

        const func = new Function( code )
        
        if( SDF.useProxies === true ) {
          const preWindowMembers = Object.keys( window )
          func()
          const postWindowMembers = Object.keys( window )

          if( preWindowMembers.length !== postWindowMembers.length ) {
            createProxies( preWindowMembers, postWindowMembers, window )
          }
        }else{
          func()
        }
      } catch (e) {
        console.log( e )
      }
    },
    'Shift-Ctrl-H'() { 
      toggleGUI() 
    },
    'Shift-Ctrl-G'() { 
      toggleGUI() 
    },
    'Shift-Ctrl-C'() { 
      toggleCamera() 
    },
    'Alt-W'( cm ) {
      SDF.keys.w = 1
    },
    'Alt-A'( cm ) {
      SDF.keys.a = 1
    },
    'Alt-S'( cm ) {
      SDF.keys.s = 1
    },
    'Alt-D'( cm ) {
      SDF.keys.d = 1
    },
    'Alt-Enter'( cm ) {
      try {
        var selectedCode = getSelectionCodeColumn( cm, true )

        flash( cm, selectedCode.selection )

        var code = selectedCode.code

        var func = new Function( code )

        if( SDF.useProxies === true ) {
          const preWindowMembers = Object.keys( window )
          func()
          const postWindowMembers = Object.keys( window )

          if( preWindowMembers.length !== postWindowMembers.length ) {
            createProxies( preWindowMembers, postWindowMembers, window )
          }
        }else{
          func()
        }
      } catch (e) {
        console.log( e )
      }
    },
    'Ctrl-.'( cm ) {
      SDF.clear() 
      guis.forEach( g => { if( g.containerElem_ !== null ) { g.dispose() } } )
      guis.length = 0
      proxies.length = 0
    },
    "Shift-Ctrl-=": function(cm) {
      fontSize += .1
      document.querySelector('.CodeMirror-lines').style.fontSize= fontSize + 'em'
      cm.refresh()
    },
    
    "Shift-Ctrl--": function(cm) {
      fontSize -= .1
      document.querySelector('.CodeMirror-lines').style.fontSize = fontSize + 'em'
      cm.refresh()
    }
  }

  const toggleToolbar = function() {
    if( hidden === false ) {
      document.querySelector('select').style.display = 'none'
      document.querySelector('#help').style.display = 'none'
      document.querySelector('#source').style.display = 'none'
    }else{
      document.querySelector('select').style.display = 'inline-block'
      document.querySelector('#help').style.display = 'inline-block'
      document.querySelector('#source').style.display = 'inline-block'
    }
  }

  const toggleGUI = function() {
    if( hidden === false ) {
      cm.getWrapperElement().style.display = 'none'
      toggleToolbar() 
    }else{
      cm.getWrapperElement().style.display = 'block'
      toggleToolbar()
    }

    hidden = !hidden
  }

  const toggleCamera = function() {
    Marching.cameraEnabled = !Marching.cameraEnabled
    //document.querySelector('#cameratoggle').checked = Marching.cameraEnabled
    toggleGUI()
    Marching.camera.on()
  }

  // have to bind to window for when editor is hidden
  Mousetrap.bind('ctrl+shift+g', toggleGUI )
  Mousetrap.bind('ctrl+shift+c', e => {
    toggleCamera()
  })

  delete CodeMirror.keyMap.default[ 'Ctrl-H' ]

  const cm = CodeMirror( document.body, { 
    value:demos.introduction,
    mode:'javascript',
    fullScreen:true,
    keyMap:'playground',
    styleActiveLine:true,
    autofocus:true,
    matchBrackets:true,
    autoCloseBrackets:true,

  })
  cm.setOption('fullScreen', true )

  cm.on('keyup', (cm, event) => {
    if( SDF.cameraEnabled ) {
      const code = event.key//.code.slice(3).toLowerCase()
      SDF.keys[ code ] = 0
    }else if( event.key === 'Alt' ) {
      for( let key in SDF.keys ) {
        SDF.keys[ key ] = 0
      }
    } 
  })

  cm.on('keydown', (cm,event) => {
    if( SDF.cameraEnabled ) {
      SDF.keys[ event.key ] = 1
      event.codemirrorIgnore = 1
      event.preventDefault()
    }
  })

  delete CodeMirror.keyMap.default[ 'Ctrl-H' ]

  window.addEventListener( 'keydown', e => {
    if( e.key === 'h' && e.ctrlKey === true ) {
      toggleGUI()
    }else if( e.key === '.' && e.ctrlKey === true && e.shiftKey === true ) {
      SDF.pause()
    }else if( SDF.cameraEnabled ) {
      SDF.keys[ e.key ] = 1
    }
  })
  window.addEventListener( 'keyup', e => {
    if( SDF.cameraEnabled ) {
      SDF.keys[ e.key ] = 0
    }
  })

  const sel = document.querySelector('select')
  const demoGroup = document.createElement('optgroup')
  demoGroup.setAttribute( 'label', '----- demos -----' )
  const tutorialGroup = document.createElement('optgroup')
  tutorialGroup.setAttribute( 'label', '----- tutorials -----' )

  for( let key in demos ) {
    const opt = document.createElement( 'option' )
    opt.innerText = key

    demoGroup.appendChild( opt )
  }
  sel.appendChild( demoGroup )

  for( let key in tutorials ) {
    const opt = document.createElement( 'option' )
    opt.innerText = key

    tutorialGroup.appendChild( opt )
  }
  sel.appendChild( tutorialGroup )

  sel.onchange = e => {
    let isDemo = true
    code = demos[ e.target.selectedOptions[0].innerText ]
    if( code === undefined ) {
      isDemo = false
      code = tutorials[ e.target.selectedOptions[0].innerText ]
    }

    SDF.clear()
    if( isDemo === true ) {
      eval( code )
    }

    cm.setValue( code )
  }

  var getSelectionCodeColumn = function( cm, findBlock ) {
    var pos = cm.getCursor(), 
      text = null

    if( !findBlock ) {
      text = cm.getDoc().getSelection()

      if ( text === "") {
        text = cm.getLine( pos.line )
      }else{
        pos = { start: cm.getCursor('start'), end: cm.getCursor('end') }
        //pos = null
      }
    }else{
      var startline = pos.line, 
        endline = pos.line,
        pos1, pos2, sel

      while ( startline > 0 && cm.getLine( startline ) !== "" ) { startline-- }
      while ( endline < cm.lineCount() && cm.getLine( endline ) !== "" ) { endline++ }

      pos1 = { line: startline, ch: 0 }
      pos2 = { line: endline, ch: 0 }

      text = cm.getRange( pos1, pos2 )

      pos = { start: pos1, end: pos2 }
    }

    if( pos.start === undefined ) {
      var lineNumber = pos.line,
        start = 0,
        end = text.length

      pos = { start:{ line:lineNumber, ch:start }, end:{ line:lineNumber, ch: end } }
    }

    return { selection: pos, code: text }
  }

  const flash = function(cm, pos) {
    let sel
    const cb = function() { sel.clear() }

    if (pos !== null) {
      if( pos.start ) { // if called from a findBlock keymap
        sel = cm.markText( pos.start, pos.end, { className:"CodeMirror-highlight" } );
      }else{ // called with single line
        sel = cm.markText( { line: pos.line, ch:0 }, { line: pos.line, ch:null }, { className: "CodeMirror-highlight" } )
      }
    }else{ // called with selected block
      sel = cm.markText( cm.getCursor(true), cm.getCursor(false), { className: "CodeMirror-highlight" } );
    }

    window.setTimeout( cb, 250 )
  
  }

  window.use = function( lib ) {
    if( lib === 'hydra' ) {
      const hydrascript = document.createElement( 'script' )
      hydrascript.src = 'https://cdn.jsdelivr.net/npm/hydra-synth@1.3.0/dist/hydra-synth.js'
      document.querySelector( 'head' ).appendChild( hydrascript )

      hydrascript.onload = function() {
        const Hydrasynth = Hydra

        window.Hydra = function( w=500,h=500 ) {
          const canvas = document.createElement('canvas')
          canvas.width  = w
          canvas.height = h
          const hydra   = new Hydrasynth({ canvas })
          return hydra
        }
      } 
    }
  }

  const ease = t => t < .5 ? 2*t*t : -1+(4-2*t)*t

  window.fade = ( objname, propname, target, seconds ) => {
    const split = propname.indexOf('.') === -1 ? null : propname.split('.')
    const startValue = [], diff = []
    const inc  = 1 / ( seconds * 60 )   
    const isVec = split === null && window[ objname ][ propname ].type.indexOf( 'vec' ) !== -1

    let vecCount = isVec === true ? parseInt( window[ objname ][ propname ].type.slice(3) ) : null
    let t = 0

    if( isVec ) {
      startValue[0] = window[ objname ][ propname ].x 
      startValue[1] = window[ objname ][ propname ].y
      if( vecCount > 2 ) startValue[2] = window[ objname ][ propname ].z

      diff[0] = target - startValue[0] 
      diff[1] = target - startValue[1]
      if( vecCount > 2 ) diff[2] = target - startValue[2]
    }else{
      if( split === null ) { 
        startValue[0] = window[ objname ][ propname ].value 
      }else{
        let obj = window[ objname ]
        for( let i = 0; i < split.length; i++ ) {
          //split.forEach( (v,i) => obj = isVec ? : obj[ v ] )
          obj = obj[ split[ i ] ] 
        }
        startValue[0] = obj 
      }

      diff[ 0 ] = target - startValue[ 0 ]
    }

    const fnc = () => {
      let obj = null
      const easeValue = ease( t )
      if( split === null ) {
        if( isVec === false ) {
          window[ objname ][ propname ]   = startValue[0] + easeValue * diff[0]
        }else{
          window[ objname ][ propname ].x = startValue[0] + easeValue * diff[0]
          window[ objname ][ propname ].y = startValue[1] + easeValue * diff[1]

          if( vecCount > 2 ) {
            window[ objname ][ propname ].z = startValue[2] + easeValue * diff[2]
          }
        }
      }else{
        obj = window[ objname ]
        for( let i = 0; i < split.length - 1; i++ ) {
          //split.forEach( (v,i) => obj = isVec ? : obj[ v ] )
          obj = obj[ split[ i ] ] 
        }
        obj[ split[ split.length - 1 ] ]= startValue[0] + easeValue * diff[0]
      }
      t += inc
      if( t >= 1 ) {
        if( split !== null ) {
          obj[ split[ split.length - 1 ] ] = target 
        }else{
          window[ objname ][ propname ] = target
        }

        fnc.cancel()
      }
    }
    
    callbacks.push( fnc )
    
    fnc.cancel = ()=> {
      const idx = callbacks.indexOf( fnc )
      callbacks.splice( idx, 1 )
    }
    
    return fnc
  }

  const proxies = []

  const createProxies = function( pre, post, proxiedObj ) {
    const newProps = post.filter( prop => pre.indexOf( prop ) === -1 )

    for( let prop of newProps ) {
      let obj = proxiedObj[ prop ]
      if( obj.params !== undefined ) {
        Object.defineProperty( proxiedObj, prop, {
          get() { return obj },
          set(value) {

            if( obj !== undefined && value !== undefined) {
              
              for( let param of obj.params ) {
                if( param.name !== 'material' ) {
                  value[ param.name ] = obj[ param.name ].value
                }
              }
            }

            obj = value
          }
        })

        proxies.push( prop )
      }
    }
  }

  let guielement = null
  const guis = []

  const processParams = function( obj, pane, params ) {
    params.forEach( param => {
      if( param.type === 'float' ) { 
        const guiparam = {
          get [param.name]() { return obj[ param.name ].value.x },
          set [param.name](v){ obj[ param.name ].value.x = v; obj[ param.name ].dirty = true }
        }
        const min = param.min || 0, max = param.max || 3, step = param.step
        pane.addInput( guiparam, param.name, { min, max, step })
      }else if( param.type === 'vec3' ) {
        if( param.name.search( 'color' ) === -1 ) {
          const guiparam = {
            [param.name]:{
              get x() { return obj[ param.name ].value.x },
              set x(v){ obj[ param.name ].value.x = v; obj[ param.name ].dirty = true },
              get y() { return obj[ param.name ].value.y },
              set y(v){ obj[ param.name ].value.y = v; obj[ param.name ].dirty = true },
              get z() { return obj[ param.name ].value.z },
              set z(v){ obj[ param.name ].value.z = v; obj[ param.name ].dirty = true }
            }
          }
          const min = param.min || 0, max = param.max || 3, step = param.step
          pane.addInput( guiparam[ param.name ], 'x', { min, max, label:param.name + ' X' })
          pane.addInput( guiparam[ param.name ], 'y', { min, max, label:param.name + ' Y' })
          pane.addInput( guiparam[ param.name ], 'z', { min, max, label:param.name + ' Z' })
        }else{
          const guiparam = { [param.name]:{r:0,g:0,b:0} }
          pane.addInput( guiparam, param.name, { input:'color' })
            .on( 'change', v => {
              const rgb = v.toRgbObject()
              obj[ param.name ].value.x = rgb.r / 255 
              obj[ param.name ].value.y = rgb.g / 255
              obj[ param.name ].value.z = rgb.b / 255
              obj[ param.name ].dirty = true
            }) 
        }
      }
    })
  }

  const guiForObject = function( ) {
    const obj = this

    const pane = new Tweakpane({ container: document.querySelector('#menu'), title:this.name })
    guis.push( pane )

    const params = obj.params || obj.parameters
    processParams( obj, pane, params )

    const transform = {
      get tx() { return obj.transform.translation.x },
      set tx(v){ obj.transform.translation.x = v },
      get ty() { return obj.transform.translation.y },
      set ty(v){ obj.transform.translation.y = v },
      get tz() { return obj.transform.translation.z },
      set tz(v){ obj.transform.translation.z = v },
      get rx() { return obj.transform.rotation.axis.x },
      set rx(v){ obj.transform.rotation.axis.x = v },
      get ry() { return obj.transform.rotation.axis.y },
      set ry(v){ obj.transform.rotation.axis.y = v },
      get rz() { return obj.transform.rotation.axis.z },
      set rz(v){ obj.transform.rotation.axis.z = v },
      get ra() { return obj.transform.rotation.angle },
      set ra(v){ obj.transform.rotation.angle = v },
      get scale() { return obj.transform.scale },
      set scale(v){ obj.transform.scale = v },
    }

    const transformFolder = pane.addFolder({ title:'Transform' })
    transformFolder.addInput( transform, 'tx', { label:'Translate X', min:-5, max:5 })
    transformFolder.addInput( transform, 'ty', { label:'Translate y', min:-5, max:5 })
    transformFolder.addInput( transform, 'tz', { label:'Translate z', min:-5, max:5 })
    transformFolder.addInput( transform, 'rx', { label:'Rotation Axis X', min:0, max:1 })
    transformFolder.addInput( transform, 'ry', { label:'Rotation Axis Y', min:0, max:1 })
    transformFolder.addInput( transform, 'rz', { label:'Rotation Axis Z', min:0, max:1 })
    transformFolder.addInput( transform, 'ra', { label:'Rotation Angle', min:-360, max:360 })
    transformFolder.addInput( transform, 'scale', { label:'Scale', min:0.001, max:5, presetKey:'transformScale' })

    if( this.__textureObj !== undefined ) {
      const textureFolder = pane.addFolder({ title:'Texture' })
      processParams( this.__textureObj.__target, textureFolder, this.__textureObj.parameters )   
    }

    this.__gui = pane
    this.__gui.__target = obj
    this.gui.applyPreset = p => applyPreset.call( this, p )
    this.gui.export = pane.exportPreset.bind( pane )

    return this
  }

  const applyPreset = function( presetObj ){
    const keys = Object.keys( presetObj ),
          transformStartIdx = keys.indexOf('tx'),
          textureStartIdx = transformStartIdx + 8
    
    for( let i = 0; i < transformStartIdx; i++ ) {
      const key = keys[ i ]
      this[ key ].value.x = presetObj[ key ]
    }

    this.transform.translation.x = presetObj.tx
    this.transform.translation.y = presetObj.ty
    this.transform.translation.z = presetObj.tz
    this.transform.rotation.x = presetObj.rx
    this.transform.rotation.y = presetObj.ry
    this.transform.rotation.z = presetObj.rz
    this.transform.rotation.angle = presetObj.ra
    this.transform.scale = presetObj.transformScale

    if( this.__textureObj !== undefined ) {
      for( let i = textureStartIdx; i < keys.length; i++ ) {
        const key = keys[ i ]
        this.__textureObj.__target[ key ].value.x = presetObj[ key ]
        this.__textureObj.__target[ key ].dirty = true 
      }
    }

    this.__gui.dispose()
    guiForObject.call( this )

  }

  window.gui = function() {
    if( guielement !== null ) {
      guielement.dispose()
    }
    const scene = Marching.scene

    
    guielement = pane
  }

  const _____s = SDF.Sphere()
  _____s.__proto__.__proto__.gui = guiForObject

  eval( demos.introduction )

}

},{"../node_modules/codemirror/addon/display/fullscreen.js":1,"../node_modules/codemirror/addon/display/panel.js":2,"../node_modules/codemirror/addon/edit/closebrackets.js":3,"../node_modules/codemirror/addon/edit/matchbrackets.js":4,"../node_modules/codemirror/addon/hint/javascript-hint.js":5,"../node_modules/codemirror/addon/hint/show-hint.js":6,"../node_modules/codemirror/addon/selection/active-line.js":7,"../node_modules/codemirror/mode/javascript/javascript.js":9,"../node_modules/mousetrap/mousetrap.min.js":10,"./demos/alien_portal.js":12,"./demos/audio.js":13,"./demos/constructors.js":14,"./demos/csg.js":15,"./demos/geometries.js":16,"./demos/intro.js":17,"./demos/julia.js":18,"./demos/lighting.js":19,"./demos/livecoding.js":20,"./demos/mandelbulb.js":21,"./demos/postprocessing.js":22,"./demos/procedural_textures.js":23,"./demos/snare.js":24,"./demos/superformula.js":25,"./demos/texture_transforms.js":26,"./demos/textures.js":27,"./demos/tutorial_1.js":28,"./demos/twist.js":29,"codemirror":8,"tweakpane":11}]},{},[30]);
