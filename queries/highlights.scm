
[
  (integer_literal)
  (float_literal)
] @number

(identifier) @variable

[
  (true)
  (false)
] @constant.builtin

(comment) @comment



[
  ";"
  ","
  ":"
] @punctuation.delimiter

[
  "-"
  "+"
  "*"
  "**"
  "/"
  "MOD"
  "<"
  "<="
  ":="
  "="
  "NOT"
  "<>"
  "=>"
  ">"
  ">="
  "xor"
  "and"
  "or"
] @operator

[
  "("
  ")"
]  @punctuation.bracket

[
  "if"
  "then"
  "elsif"
  "else"
  "end_if"
  "case"
  "of"
  "end_case"
] @keyword

(function_call name: (identifier) @function)