; Types
(type_name) @type

; Functions
(function_call name: (identifier) @function.call)
(function_declaration name: (identifier) @function)
(function_block_declaration name: (identifier) @function)
(program_declaration name: (identifier) @function)
(test_function_block_declaration name: (identifier) @function)
(method_declaration name: (identifier) @function)

; The called member of a namespaced or method call, e.g. `FPU.IsRealNumber(x)`
; or `fb.Run(x)`.
(function_call name: (qualified_identifier (identifier) @function.call .))
(fb_invocation (qualified_identifier (identifier) @function.call .))

; Type conversion, e.g. UDINT_TO_TIME(x)
((function_call name: (identifier) @function.builtin)
  (#match? @function.builtin "^[A-Z][A-Z0-9_]*_TO_[A-Z][A-Z0-9_]*$"))

; Variables
(identifier) @variable
(qualified_identifier) @variable

[
  (this)
  (super)
] @variable.builtin

; Enumeration members
(enum_member name: (identifier) @constant)

; Parameters
(param_assignment (identifier) @variable.parameter)

; Literals
[
  (integer_literal)
  (float_literal)
  (time_literal)
  (date_literal)
  (time_of_day_literal)
  (date_and_time_literal)
] @number

(bit_selector) @number

(string_literal) @string

(typed_literal (literal_type) @type.builtin)

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
  "test_function_block"
  "end_test_function_block"
  "method"
  "end_method"
  "extends"
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
  "retain"
  "non_retain"
  "persistent"
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
  "for"
  "to"
  "by"
  "do"
  "end_for"
  "while"
  "end_while"
  "repeat"
  "until"
  "end_repeat"
  "exit"
  "continue"
] @keyword.repeat

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
  "^"
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
  "["
  "]"
] @punctuation.bracket

(pragma) @attribute

[
  ".."
] @punctuation.special
