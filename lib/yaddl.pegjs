/* Initializations */
{
  function CreateDefinition(def) {
    ["type", "name", "configs", "options", "comment", "comments", "params", "inherits", "assoc"].forEach(function (item) {
      if(def[item] == null) {
        delete def[item];
      }
    });
    return def;
  }

  function start(first, tail) {
    var list = first[1] != null ? [first[1]] : [];
    for (var i = 0; i < tail.length; i++) {
      list = list.concat(tail[i][1][0]);
      if (tail[i][1][1] != null) {
        list.push(tail[i][1][1]);
      }
    }
    return nest(list);
  }

  function nest(list) {
    var root = { children: [] };
    var current = root;
    var stack = [current];
    var last = {};
    var stack_last = [root, last];

    var float = false;

    list.forEach(function(item) {
      if (item == "FLOAT") {
        // Next item is floating, indentation level doesnt matter, used for comments
        float = true;
      }
      else if (item == "INDENT") {
        last.children = last.children || [];
        stack.push(current);
        stack_last.push(last);
        current = last;
      }
      else if (item == "DEDENT") {
        current = stack.pop();
        last = stack_last.pop();
      }
      else {
        if (float) {
          if (item && last) {
            last.children = last.children || [];
            last.children.push(item);
          }
          float = false;
        }
        else {
          current.children.push(item);
          if (item) {
            last = item;
          }
        }
      }
    });

    return root.children;
  };

  var depths = [0];

  function indent(s) {
    var depth = s.length;

    if (depth == depths[0]) return [];

    if (depth > depths[0]) {
      depths.unshift(depth);
      return ["INDENT"];
    }

    var dents = [];
    while (depth < depths[0]) {
      depths.shift();
      dents.push("DEDENT");
    }

    if (depth != depths[0]) dents.push("BADDENT");

    return dents;
  }
}

start   = first:line tail:(newline line)* newline? { return start(first, tail); }
line    = comment:comment { return [['FLOAT'], comment]; } / blank { return [''] } / depth:(indent) s:expression &[\r\n] { return [depth, s]; }
blank   = " "* &[\r\n]
indent  = s:" "* { return indent(s); }
expression = commentBlock / options / codeBlock / schema / definition / configBlock
text    = _text:[^\r\n]* { return (_text || []).join(""); }
comment = " "* comment:commentBlock { return comment; }
newline = [\r\n] / !.

assoc = $(assoc:[!&%^=?~.*+-]+)
name  = $(low:[a-z_] name:[A-Za-z0-9_.]*)
class = $(cap:[A-Z] name:[A-Za-z0-9_.]*)
configs = configs:("<" configs:([,| ]* configs:$(![,|>] !(" "+ [,|>]) .)+ ([,| ]*) {return configs; })* rest:($(![>] .)+)*  ">" { return configs.concat(rest); })+ { return configs.concat.apply([], configs); }

configBlock
  = configs:configs
  {
    return CreateDefinition({
      definition: "config",
      configs: configs
    });
  }

schema
  = configs:configs? name:&("$" [a-zA-Z_.0-9$]*) value:$(SimpleStatement)
  {
    return CreateDefinition({
      definition: "statement",
      configs: configs,
      name: name,
      code: value
    });
  }

codeBlock
  = configs:configs? &"{" code:$(SimpleBlock)
  {
    return CreateDefinition({
      definition: "code",
      configs: configs,
      code: code
    });
  }

commentBlock
  = configs:configs? comment:$(Comment)
  {
    return CreateDefinition({
      definition: "comment",
      configs: configs,
      comment: comment
    });
  }

definition
  = def:mixin / type / index / attribute / model

options "options"
  = configs:configs? _options:json comment:comment? &[\r\n]
  {
    if (_options == {}) return false;
    return CreateDefinition({
      definition: "options",
      configs: configs,
      options: _options,
      comment: comment
    });
  }

index "index"
  = configs:configs? name:name? params:params _options:json? comment:comment?
  {
    return CreateDefinition({
      definition: "index",
      name: name,
      configs: configs,
      params: params,
      options: _options,
      comment: comment
    });
  }

mixin "mixin"
  = configs:configs? "@" model:class params:params? _options:json? comment:comment?
  {
    return CreateDefinition({
      definition: "mixin",
      configs: configs,
      type: "@" + model,
      params: params,
      options: _options,
      comment: comment
    });
  }

model "model"
  = configs:configs? assoc:assoc? type:class inherits:(":" inherits:class { return inherits; })? params:params? _options:json? comment:comment?
  {
    return CreateDefinition({
      definition: "definition",
      configs: configs,
      assoc: assoc,
      type: type,
      inherits: inherits,
      params: params,
      options: _options,
      comment: comment
    });
  }

type "model attribute"
  = configs:configs? assoc:assoc? name:name ":" type_assoc:assoc? type:class inherits:(":" inherits:class { return inherits; })? params:params? _options:json? comment:comment?
  {
    return CreateDefinition({
      definition: "definition",
      configs: configs,
      assoc: assoc,
      name: name,
      type_assoc: type_assoc,
      type: type,
      inherits: inherits,
      params: params,
      options: _options,
      comment: comment
    });
  }

attribute "attribute"
  = configs:configs? assoc:assoc? name:name params:params? _options:json? comment:comment?
  {
    return CreateDefinition({
      definition: "definition",
      configs: configs,
      assoc: assoc,
      name: name,
      params: params,
      options: _options,
      comment: comment
    });
  }

json = " "* !("{" ws "}") &"{" json:object { return json; }

RawBlock "code block"
  = $("{" code:Code "}")
Code
  = $((![{}] .)+ / "{" Code "}")*

params
  = "(" [ \r\n]* param:definition params:([, \r\n]+ params:definition { return params; })* comment:([ \r\n] comment:comment? { return comment; })* ")"
  { return comment ? [param].concat(params, comment) : [param].concat(params); }

many_params
  = param:model params:many_params?
  { return param ? params.slice().concat(param) : params; }


SimpleBlock "block"
  = $("{" code:Code "}")

Code
  = $((![{}] SourceCharacter)+ / "{" Code "}")*

SimpleParams "params"
  = $("(" code:Params ")")

Params
  = $((![()] SourceCharacter)+ / "(" Params ")")*

SimpleArray "array"
  = $("(" code:Array ")")
  Array
  = $((![\[\]] SourceCharacter)+ / "[" Array "]")*


SimpleStatement
  = $(((![{}()\[\],\r\n] !Comment SourceCharacter)+ / SimpleBlock / SimpleArray / SimpleParams ))*

SourceCharacter
  = .

WhiteSpace "whitespace"
  = "\t"
  / "\v"
  / "\f"
  / " "
  / "\u00A0"
  / "\uFEFF"

LineTerminator
  = [\n\r\u2028\u2029]

LineTerminatorSequence "end of line"
  = "\n"
  / "\r\n"
  / "\r"
  / "\u2028"
  / "\u2029"

Comment "comment"
  = MultiLineComment
  / SingleLineComment

MultiLineComment
  = "/*" (!"*/" SourceCharacter)* "*/"

MultiLineCommentNoLineTerminator
  = "/*" (!("*/" / &LineTerminator) SourceCharacter)* "*/"

SingleLineComment
  = ("//" / "#") (!(&LineTerminator) SourceCharacter)*

/* Skipped */

__
  = (WhiteSpace / LineTerminatorSequence / Comment)*

_
  = (WhiteSpace / MultiLineCommentNoLineTerminator)*

/* Automatic Semicolon Insertion */

EOS
  = __ ";"
  / _ SingleLineComment? LineTerminatorSequence
  / _ &"}"
  / __ EOF

EOF
  = !.

/*
Arguments
  = "(" __ args:(ArgumentList __)? ")" {
      return optionalList(extractOptional(args, 0));
    }

ArgumentList
  = first:AssignmentExpression rest:(__ "," __ AssignmentExpression)* {
      return buildList(first, rest, 3);
    }
*/







/*
 * JSON Grammar
 * ============
 *
 * Based on the grammar from RFC 7159 [1].
 *
 * Note that JSON is also specified in ECMA-262 [2], ECMA-404 [3], and on the
 * JSON website [4] (somewhat informally). The RFC seems the most authoritative
 * source, which is confirmed e.g. by [5].
 *
 * [1] http://tools.ietf.org/html/rfc7159
 * [2] http://www.ecma-international.org/publications/standards/Ecma-262.htm
 * [3] http://www.ecma-international.org/publications/standards/Ecma-404.htm
 * [4] http://json.org/
 * [5] https://www.tbray.org/ongoing/When/201x/2014/03/05/RFC7159-JSON
 */

/* ----- 2. JSON Grammar ----- */

JSON_text
  = _ value:value _ { return value; }

begin_array     = ws "[" ws
begin_object    = ws "{" ws
end_array       = ws "]" ws
end_object      = ws "}"
name_separator  = ws ":" ws
value_separator = ws "," ws

ws "whitespace" = __

/* ----- 3. Values ----- */

value
  = false
  / null
  / true
  / object
  / array
  / number
  / string
  / statement

false = "false" { return false; }
null  = "null"  { return null;  }
true  = "true"  { return true;  }

/* ----- 4. Objects ----- */

object
  = begin_object
    members:members
    end_object
    { return members !== null ? members: {}; }

member
  = name:(string / symbol) name_separator value:value {
      return { name: name, value: value };
    }

members
  = (
      first:member
      rest:(value_separator m:member { return m; })*
      {
        var result = {}, i;

        result[first.name] = first.value;

        for (i = 0; i < rest.length; i++) {
          result[rest[i].name] = rest[i].value;
        }

        return result;
      }
    )?

/* ----- 5. Arrays ----- */

array
  = begin_array
    values:values
    end_array
    { return values !== null ? values : []; }

values
  = (
      first:value
      rest:(value_separator v:value { return v; })*
      { return [first].concat(rest); }
    )?

/* ----- 6. Numbers ----- */

number "number"
  = minus? int frac? exp? { return parseFloat(text()); }

decimal_point = "."
digit1_9      = [1-9]
e             = [eE]
exp           = e (minus / plus)? DIGIT+
frac          = decimal_point DIGIT+
int           = zero / (digit1_9 DIGIT*)
minus         = "-"
plus          = "+"
zero          = "0"

/* ----- 7. Strings ----- */

string "string"
  = quotation_mark chars:char* quotation_mark { return chars.join(""); }
  / single_quotation_mark chars:single_char* single_quotation_mark { return chars.join(""); }

symbol "symbol"
  = chars:[a-zA-Z0-9._$]+ { return chars.join("") }
statement
  = code:SimpleStatement { return { "@": code }; }
  //= code:([^,};\r\n]* / code) { return { "@": code }; }
  //= statement:$(symbol) { return { "@": statement }; }

char
  = unescaped
  / escape
    sequence:(
        '"'
      / "\\"
      / "/"
      / "b" { return "\b"; }
      / "f" { return "\f"; }
      / "n" { return "\n"; }
      / "r" { return "\r"; }
      / "t" { return "\t"; }
      / "u" digits:$(HEXDIG HEXDIG HEXDIG HEXDIG) {
          return String.fromCharCode(parseInt(digits, 16));
        }
    )
    { return sequence; }

single_char
  = unescaped
  / escape
    sequence:(
        "'"
      / "\\"
      / "/"
      / "b" { return "\b"; }
      / "f" { return "\f"; }
      / "n" { return "\n"; }
      / "r" { return "\r"; }
      / "t" { return "\t"; }
      / "u" digits:$(HEXDIG HEXDIG HEXDIG HEXDIG) {
          return String.fromCharCode(parseInt(digits, 16));
        }
    )
    { return sequence; }

escape         = "\\"
quotation_mark = '"'
single_quotation_mark = "'"
unescaped      = [\x20-\x21\x23-\x5B\x5D-\u10FFFF]

/* ----- Core ABNF Rules ----- */

/* See RFC 4234, Appendix B (http://tools.ietf.org/html/rfc4627). */
DIGIT  = [0-9]
HEXDIG = [0-9a-f]i