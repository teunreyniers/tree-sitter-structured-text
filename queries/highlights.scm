; Types
(type_name) @type

; Functions
(function_call name: (identifier) @function.call)
(function_declaration name: (identifier) @function)
(function_block_declaration name: (identifier) @function)
(program_declaration name: (identifier) @function)

; Type conversion
(conversion_type) @function.builtin

; Variables
(identifier) @variable
(qualified_identifier) @variable

; Parameters
(param_assignment (identifier) @variable.parameter)

; Literals
[
  (integer_literal)
  (float_literal)
  (time_literal)
] @number

[
  (true)
  (false)
  "TRUE"
  "True"
  "FALSE"
  "False"
] @constant.builtin

; Comments
(comment) @comment

; Keywords
[
  "function_block"
  "end_function_block"
  "function"
  "end_function"
  "program"
  "end_program"
  "type"
  "end_type"
  "struct"
  "end_struct"
] @keyword

[
  "var_input"
  "var_output"
  "var_in_out"
  "var"
  "var_temp"
  "var_static"
  "var_global"
  "var_external"
  "constant"
  "end_var"
] @keyword

[
  "if"
  "then"
  "elsif"
  "else"
  "end_if"
  "case"
  "of"
  "end_case"
] @keyword.conditional

[
  "return"
] @keyword.return

; Operators
[
  ":="
] @operator

[
  "-"
  "+"
  "*"
  "**"
  "/"
  "MOD"
] @operator

[
  "<"
  "<="
  "="
  "<>"
  ">"
  ">="
] @operator

[
  "and"
  "or"
  "xor"
  "not"
] @keyword.operator

[
  "=>"
] @operator

; Punctuation
[
  ";"
  ","
  ":"
] @punctuation.delimiter

[
  "("
  ")"
] @punctuation.bracket

(pragma) @attribute

[
  ".."
] @punctuation.special
