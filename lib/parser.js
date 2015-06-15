var path = require('path');
var fs = require('fs');
var PEG = require("pegjs");
var extend = require("util")._extend;

var lang = fs.readFileSync(path.resolve(
                __dirname,
                'yaddl.pegjs')).toString();

var beaut = fs.readFileSync(path.resolve(
                __dirname,
                'beautify.pegjs')).toString();
var parser = PEG.buildParser(lang);

var beautify_parser = PEG.buildParser(beaut);

var YAML = require('yamljs');
var inflection = require('./inflection');

var config = {
  names: {
    modelSchema: function (model) {
      return inflection.singularize(inflection.camelize(model, false)) + "Schema";
    },
    modelCollection: function (model) {
      return inflection.tableize(model);
    },
    refOneAttribute: function (model) {
      return inflection.singularize(inflection.camelize(inflection.underscore(model), true)) + "Id";
    },
    refManyAttribute: function (model) {
      return inflection.singularize(inflection.camelize(inflection.underscore(model), true)) + "Ids";
    },
    hasOneAttribute: function (model) {
      return inflection.singularize(inflection.camelize(inflection.underscore(model), true)) + "Id";
    },
    hasManyAttribute: function (model) {
      return inflection.singularize(inflection.camelize(inflection.underscore(model), true)) + "Ids";
    },
    containsOneAttribute: function (model) {
      return inflection.singularize(inflection.camelize(inflection.underscore(model), true));
    },
    containsManyAttribute: function (model) {
      return inflection.pluralize(inflection.camelize(inflection.underscore(model), true));
    }
  },
  resolveType: function (name) {
    var types = {
      "Number": /^count|count$|^nr|nr$|^total[A-Z]|total$/i,
      "Boolean": /^is[A-Z]/,
      "Date": /date$|^date|time$|at$/i,
      "ObjectId": /ids?$|ref$/i
    };
    for(var type in types) {
      if (types.hasOwnProperty(type) && types[type] && types[type].test(name)) return type;
    }
    return "String";
  },
  types: {
    "String": "String",
    "Number": "Number",
    "Object": "Object",
    "Array": "Array",
    "Buffer": "Buffer",
    "Mixed": "Schema.Types.Mixed",
    "Schema.Types.Mixed": "Schema.Types.Mixed",
    "ObjectId": "Schema.Types.ObjectId",
    "Schema.Types.ObjectId": "Schema.Types.ObjectId",
    "Boolean": "Boolean",
    "Date": "Date"
  },
  inverseRefModes: {
    "subRefOne": "containsMany",
    "subRefMany": "containsOne",
    "refOne": "hasMany",
    "refMany": "hasOne",
    "hasOne": "refMany",
    "hasMany": "refOne",
    "containsOne": "refMany",
    "containsMany": "refOne"
  },
  expandType: function (type) {
    // expand type to literal representation
    if (type["@"]) {
      return type;
    }
    return { "@": config.types[type] || config.names.modelSchema(type) };
  }
}

function parse(list) {
  var hash = {};
  var current = hash;
  var stack = [current];
  var last = {};
  up = hash;
  list.forEach(function (item) {
    if (item === "DEDENT") {
      current = stack.pop();
    }
    if (item === "INDENT") {
      stack.push(current);
      current = last;
    }
    if (item && item !== "INDENT" && item !== "DEDENT" && item !== "BLANK") {
      current[item] = {};
      last = current[item];
    }
  });
  return hash;
}

if (!String.prototype.includes) {
  String.prototype.includes = function() {'use strict';
    return String.prototype.indexOf.apply(this, arguments) !== -1;
  };
}
if (!Array.prototype.includes) {
  Array.prototype.includes = function() {'use strict';
    return Array.prototype.indexOf.apply(this, arguments) !== -1;
  };
}
if (!Object.assign) {
  Object.defineProperty(Object, 'assign', {
    enumerable: false,
    configurable: true,
    writable: true,
    value: function(target) {
      'use strict';
      if (target === undefined || target === null) {
        throw new TypeError('Cannot convert first argument to object');
      }

      var to = Object(target);
      for (var i = 1; i < arguments.length; i++) {
        var nextSource = arguments[i];
        if (nextSource === undefined || nextSource === null) {
          continue;
        }
        nextSource = Object(nextSource);

        var keysArray = Object.keys(Object(nextSource));
        for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
          var nextKey = keysArray[nextIndex];
          var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
          if (desc !== undefined && desc.enumerable) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
      return to;
    }
  });
}
// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
if (!Object.keys) {
  Object.keys = (function() {
    'use strict';
    var hasOwnProperty = Object.prototype.hasOwnProperty,
        hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString'),
        dontEnums = [
          'toString',
          'toLocaleString',
          'valueOf',
          'hasOwnProperty',
          'isPrototypeOf',
          'propertyIsEnumerable',
          'constructor'
        ],
        dontEnumsLength = dontEnums.length;

    return function(obj) {
      if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
        throw new TypeError('Object.keys called on non-object');
      }

      var result = [], prop, i;

      for (prop in obj) {
        if (hasOwnProperty.call(obj, prop)) {
          result.push(prop);
        }
      }

      if (hasDontEnumBug) {
        for (i = 0; i < dontEnumsLength; i++) {
          if (hasOwnProperty.call(obj, dontEnums[i])) {
            result.push(dontEnums[i]);
          }
        }
      }
      return result;
    };
  }());
}

Object.getKeyByValue = function(object, value) {
  for( var prop in object ) {
    if( object.hasOwnProperty( prop ) ) {
      if( object[ prop ] === value )
        return prop;
    }
  }
};

function parseYaddl(doc, _config) {
  if (!_config) {
    _config = config;
  }
  var raw = parser.parse(doc);
  var orm = {};

  var models = {};

  var readModel = function (model, parent, models) {
    var _model = {};

    if (model.configs && model.configs.indexOf("mongoose") == -1) {
      return;
    }

    if (model.definition == "code") {
      if (parent) {
        parent["$code"] = parent["$code"] || [];
        if (!parent["$code"].includes(model.code)) {
          parent["$code"].push(model.code);
        }
      }
    }
    if (model.definition == "comment") {
      if (parent) {
        parent["$code"] = parent["$code"] || [];
        parent["$code"].push(model.comment);
      }
    }
    if (model.definition == "config") {
      if (model.children) {
        readChildren(model.children, parent, models, false);
      }
    }
    if (model.definition == "statement") {
      if (parent) {
        parent["$code"] = parent["$code"] || [];
        if (!parent["$code"].includes(model.code)) {
          parent["$code"].push(model.code);
        }
      }
    }
    if (model.definition == "options") {
      if (parent && model.options && Object.keys(model.options).length > 0) {
        parent["$options"] = parent["$options"] || {};
        extend(parent["$options"], model.options);
      }
    }
    if (model.definition == "index") {
      readChildren(model.params, parent, models, false);
    }
    if (model.definition == "mixin") {
      if (parent) {
        parent["$includes"] = parent["$includes"] || [];
        parent["$includes"].push(model.type);
        parent = null;
      }
    }
    if (model.definition == "definition" || model.definition == "mixin") {

      model.assoc = model.assoc || "";

      model.refMode = "refOne";
      if (model.assoc.includes("*")) {
        model.refMode = "hasMany";
      }
      if (model.assoc.includes("+")) {
        model.refMode = "hasOne";
      }
      if (model.assoc.includes("+") && model.assoc.includes("*")) {
        model.refMode = "refMany";
      }
      if (model.assoc.includes(".")) {
        model.refMode = "containsOne";
      }
      if (model.assoc.includes(".") && model.assoc.includes("*")) {
        model.refMode = "containsMany";
      }

      model.type = model.type ? model.type : _config.resolveType(model.name);

      var _model = { };

      // Built-in types, always use contains
      if (_config.types[model.type["@"] || model.type]) {
        if (model.refMode.indexOf("One")>0) model.refMode = "containsOne";
        if (model.refMode.indexOf("Many")>0) model.refMode = "containsMany";
      } else {
        models[model.type] = models[model.type["@"] || model.type] || {};
        _model = models[model.type];
      }

      var inverseModel = { type: Object.getKeyByValue(models, parent), options: model.options };

      if (model.originalName !== false && model.name) {
        model.originalName = model.name;
      } else {
        model.originalName = false;
      }

      inverseModel.type = inverseModel.type ? inverseModel.type : _config.resolveType(inverseModel.name || model.name);

      inverseModel.refMode = _config.inverseRefModes[model.refMode];

      inverseModel.name = model.originalName ? model.originalName : _config.names[inverseModel.refMode + "Attribute"](inverseModel.type["@"] || inverseModel.type);

      var _inverseModel = { };


      // Built-in types, always use contains
      if (_config.types[inverseModel.type["@"] || inverseModel.type]) {
        if (inverseModel.refMode.indexOf("One")>0) inverseModel.refMode = "containsOne";
        if (inverseModel.refMode.indexOf("Many")>0) inverseModel.refMode = "containsMany";
      } else {
        models[inverseModel.type] = models[inverseModel.type] || {};
        _inverseModel = models[inverseModel.type];
      }

      model.name = model.name ? model.name : _config.names[model.refMode + "Attribute"](model.type["@"] || model.type);

      if (parent) {

        var item = Object.assign({ type: model.type }, model.options);
        var inverse = Object.assign({ type: inverseModel.type }, inverseModel.options);

        inverseModel.name = inverseModel.name ? inverseModel.name : _config.names[inverseModel.refMode + "Attribute"](inverseModel.type["@"] || inverseModel.type);

        if (model.refMode == "hasMany" || model.refMode == "refMany" || model.refMode == "hasOne" || model.refMode == "refOne") {
          item.ref = item.type["@"] || item.type;
          item.type = "ObjectId";
        }

        if (inverseModel.refMode == "hasMany" || inverseModel.refMode == "refMany" || inverseModel.refMode == "hasOne" || inverseModel.refMode == "refOne") {
          inverse.ref = inverse.type["@"] || inverse.type;
          inverse.type = "ObjectId";
        }

        item.type = _config.expandType(item.type);
        inverse.type = _config.expandType(inverse.type);

        if (Object.keys(item).length == 1) {
          item = item.type;
        }

        if (Object.keys(inverse).length == 1) {
          inverse = inverse.type;
        }

        if (_config.types[model.type] || _config.types[inverseModel.type]) {
          inverse = null;
        }

        if (model.refMode == "containsMany" || model.refMode == "refMany") {
          parent[model.name] = [item];
          //if (inverse) _model[inverseModel.name] = inverse;
        }
        else if (model.refMode == "refOne" || model.refMode == "containsOne") {
          parent[model.name] = item;
          //if (inverse) _model[inverseModel.name] = [inverse];
        }
        else if (model.refMode == "hasOne") {
          parent[model.name] = item;
          if (inverse) {
            _model[inverseModel.name] = [inverse];
          }
          else {
            parent[model.name] = item;
          }
        }
        else if (model.refMode == "hasMany") {
          if (inverse) {
            _model[inverseModel.name] = inverse;
          }
          else {
            parent[model.name] = [item];
          }
        } else {
        }

      }
      if (model.params) {
        readChildren(model.params, _model, models, true);
      }
      if (model.children) {
        readChildren(model.children, _model, models);
      }
    }

    return _model;
  };

  var readChildren = function (children, parent, models, primary) {
    var comments = [];

    children.forEach(function(child) {
      if (typeof child == "object") {
        child.comments = child.comments ? child.comments.concat(comments) : comments;
        readModel(child, parent, models);
      }
      else if (child != "") {
        comments.push(child);
      } else {
        comments = [];
      }
    });
  };

  readChildren(raw, null, models);
  return models;
}

module.exports = {
  parse: parseYaddl,
  beautify: function (data) {
    return beautify_parser.parse(data);
  }
};
