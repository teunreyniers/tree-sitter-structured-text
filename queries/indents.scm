; Indentation for IEC 61131-3 Structured Text.
;
; Written for nvim-treesitter's indent module, whose captures are:
;
;   @indent.begin   open a region; every line inside it gains one level
;   @indent.branch  the line the node *starts on* loses one level
;   @indent.end     the node closes a region (used when the cursor sits on a
;                   blank line: the anchor becomes the new line, not this node)
;   @indent.dedent  every line inside the node except its first loses one level
;   @indent.align   align to a delimiter column
;   @indent.auto    fall back to 'autoindent' (copy the previous line)
;   @indent.ignore  force column 0
;   @indent.zero    force column 0 for this line
;
; Helix uses a different, smaller set — @indent, @outdent and @extend — and no
; @indent.end/@indent.auto equivalent. Its engine also walks the tree differently
; (it anchors on the node under the cursor rather than the first node of the
; line), so a file that satisfies both editors ends up satisfying neither well.
; Helix support belongs in a separate queries/indents.scm shipped under a Helix
; runtime directory, not in here.
;
; This query must stay in lockstep with the st-fmt formatter: the query runs
; while you type, the formatter runs on save, and if they disagree every save
; undoes the typing. Indent step is 4 spaces (`shiftwidth`). The authority is
; st-fmt's fixtures under `tests/fixtures/`, which is where each rule is pinned;
; STYLE.md is the prose summary and can lag behind them.
;
; The model, in one sentence: CONTAINERS STAY FLAT, LEAF CONTENTS INDENT.
;
; Control flow opens a region, so its body moves in a level. A program
; organization unit does not: `VAR`, the statement body and `METHOD` all sit at
; the POU's own column, and only the variable declarations, struct fields and
; statements inside them move in. That is what keeps deeply nested ST from
; marching off the right margin, and it is why `function_block_declaration`,
; `method_declaration`, `class_declaration`, `interface_declaration`,
; `type_declaration`, `configuration_declaration` and `resource_declaration`
; appear nowhere below. Their absence is the rule.
;
; `PROPERTY` and `ACTION` are the formatter's two stated exceptions and do have
; regions here — see the "POU members that indent" section.
;
; Two grammar facts shape everything here:
;
;   1. Keyword tokens are aliased to LOWERCASE regardless of how the source
;      spells them, so `END_IF`, `End_If` and `end_if` all match `"end_if"`.
;      Never write an uppercase literal in this file.
;   2. `comment` is an `extra`, so it can appear as a child of almost any node.
;      Nothing below depends on a child's position; every pattern names the
;      node or token it wants.
;
; A third fact shapes the ERROR section at the bottom: every body in this
; grammar is `optional($.block)`, so `IF c THEN END_IF` parses fine with no body
; node at all, and no rule here may assume a body exists.


; ---------------------------------------------------------------------------
; Regions: control flow
; ---------------------------------------------------------------------------
;
; The whole statement is captured, not its `block`. A `block` starts on the same
; line as its own first statement, and @indent.begin deliberately skips a node
; that starts on the line being indented — so capturing the block would indent
; every line of the body except the first. Capturing the statement puts the
; region opener on the `IF` line, where it belongs.
;
; These also cover the `elsif_clause` and `else_clause` bodies: those clauses
; are children of `if_statement`, which is still an ancestor of their contents,
; so the one level it contributes is the one level they need.

[
  (if_statement)
  (for_statement)
  (while_statement)
  (repeat_statement)
  (case_statement)
] @indent.begin

; A CASE branch body sits two levels in from `CASE`: one from `case_statement`
; above, one from here. `case_item` starts on its own label line, which
; @indent.begin skips, so the label itself keeps the single level that puts it
; between `CASE` and its body.
;
; `indent.immediate` is required because a branch body is optional: a label with
; nothing under it yet starts and ends on the same line, and @indent.begin
; normally ignores such a node. Without it, <CR> after `1:` would land on the
; label's own column instead of opening the branch.
;
; `case_body` is deliberately not captured — it is a container holding the
; items, and capturing it would add a third level.
((case_item) @indent.begin
  (#set! indent.immediate 1))


; ---------------------------------------------------------------------------
; Regions: declarations
; ---------------------------------------------------------------------------
;
; Every variable section indents its declarations one level. The section
; keyword and `END_VAR` stay at the POU's column.

[
  (var)
  (var_input)
  (var_output)
  (var_in_out)
  (var_temp)
  (var_static)
  (var_global)
  (var_external)
  (var_inst)
] @indent.begin

; `x : REAL;` moves in from `STRUCT`; `END_STRUCT` comes back out. The
; enclosing `type_definition` and `type_declaration` contribute nothing, so
; `Point : STRUCT`, `END_STRUCT` and `END_TYPE` all share the `TYPE` column.
(struct_definition) @indent.begin

; An enumeration written one member per line.
(enum_definition) @indent.begin


; ---------------------------------------------------------------------------
; Regions: the two POU members that do indent
; ---------------------------------------------------------------------------
;
; A `METHOD` is a unit of its own and stays flat like the POU around it. A
; `PROPERTY` is not — it wraps its accessors rather than being a unit — and an
; `ACTION` body is a fragment of the enclosing POU, where the indentation is
; what shows where that POU resumes. Both therefore indent their contents:
;
;   PROPERTY Speed : REAL
;       GET
;           VAR
;               x : INT;
;           END_VAR
;
;           Speed := 1.0;
;       END_GET
;   END_PROPERTY
;
; That is three separate regions stacking — `property_declaration` puts `GET` at
; one level, `get_accessor` puts the accessor's contents at two, and the `var`
; section puts its declarations at three — so all three are captured, and each
; terminator branches back out below.

(property_declaration) @indent.begin

[
  (get_accessor)
  (set_accessor)
] @indent.begin

(action_declaration) @indent.begin


; ---------------------------------------------------------------------------
; Regions: broken argument lists and initializers
; ---------------------------------------------------------------------------
;
; st-fmt breaks these with a hanging indent — one item per line at one level,
; trailing comma, closing delimiter on its own line at the opening line's
; column — never aligned to the delimiter column. @indent.begin reproduces a
; hanging indent exactly; @indent.align would reproduce the aligned form the
; formatter never emits, so it is not used anywhere in this file.
;
; A list that fits on one line starts and ends on the same row, and
; @indent.begin ignores such nodes, so `fbShort(a := 1, b := 2);` is untouched.

[
  (function_call)
  (fb_invocation)
  (array_initializer)
  (structure_initializer)
] @indent.begin

; A broken operator chain leads with its operator, indented one level from the
; statement that owns it. The assignment is the region, so the continuation
; lines of `bReady := a\n    AND b\n    AND c;` all land one level in.
;
; When the right-hand side is itself a broken call, the call and the assignment
; start on the same row and the engine only counts one level per row, so
; `x := f(\n    a,\n);` still indents its arguments by exactly one.
(assignment) @indent.begin


; ---------------------------------------------------------------------------
; Branches: lines that step back out without closing the region
; ---------------------------------------------------------------------------
;
; @indent.branch fires only when the captured node *starts* on the line being
; indented, which is what distinguishes "this line is the ELSE" from "this line
; is inside the ELSE".

; `IF`'s ELSE is a real node; `CASE`'s is a bare token under the `else` field.
; They need separate patterns.
[
  (elsif_clause)
  (else_clause)
] @indent.branch

(case_statement
  "else" @indent.branch)

; `UNTIL` closes the loop body and returns to the `REPEAT` column, but
; `END_REPEAT` is what closes the region.
(repeat_statement
  "until" @indent.branch)

; The trailing keyword of a control statement drops to its own line exactly when
; the condition wraps, and then sits at the statement's own column. On the
; common single-line form the keyword shares the `IF`/`FOR`/`WHILE`/`CASE` line,
; which is never the line these patterns fire on, so they cost nothing there.
(if_statement
  "then" @indent.branch)

(elsif_clause
  "then" @indent.branch)

(for_statement
  "do" @indent.branch)

(while_statement
  "do" @indent.branch)

(case_statement
  "of" @indent.branch)

; Closing delimiters of the broken lists above. Scoped to their parent so that
; an ordinary `)` — a parenthesized expression, a task parameter list — is left
; alone.
(function_call
  ")" @indent.branch)

(fb_invocation
  ")" @indent.branch)

(structure_initializer
  ")" @indent.branch)

(enum_definition
  ")" @indent.branch)

(array_initializer
  "]" @indent.branch)


; ---------------------------------------------------------------------------
; Region ends
; ---------------------------------------------------------------------------
;
; Two different jobs, hence two capture lists.
;
; @indent.end marks a token as closing something. It is consulted only when the
; line being indented is blank: the engine would otherwise anchor on the last
; node of the previous line, and after `END_IF` that node still has the
; `if_statement` as its parent, so the new line would be pulled back inside the
; body it just left. Every terminator gets this, including the POU ones, because
; the question it answers ("did the previous line close something?") is
; independent of whether the region was indented.

[
  "end_if"
  "end_case"
  "end_for"
  "end_while"
  "end_repeat"
  "end_var"
  "end_struct"
  "end_type"
  "end_method"
  "end_property"
  "end_get"
  "end_set"
  "end_action"
  "end_class"
  "end_interface"
  "end_function"
  "end_function_block"
  "end_test_function_block"
  "end_program"
  "end_configuration"
  "end_resource"
] @indent.end

; @indent.branch is what actually pulls the terminator's own line back out, and
; only the terminators of regions opened above may have it. `END_TYPE`,
; `END_METHOD`, `END_FUNCTION_BLOCK` and the rest close containers that were
; never indented; giving them a branch would subtract a level that was never
; added and push the line to a negative column.

[
  "end_if"
  "end_case"
  "end_for"
  "end_while"
  "end_repeat"
  "end_var"
  "end_struct"
  "end_property"
  "end_get"
  "end_set"
  "end_action"
] @indent.branch


; ---------------------------------------------------------------------------
; Unparseable and free-form regions
; ---------------------------------------------------------------------------
;
; A block comment is copied byte for byte by the formatter — PLC headers are
; full of ASCII tables and diagrams whose interior layout is the author's. Fall
; back to 'autoindent' inside one rather than imposing a column.
(comment) @indent.auto

; A block that has not been terminated yet is the state this query spends most
; of its life in, and it is the state the grammar handles worst. At the top level
; the parser recovers by inserting a MISSING terminator, so `IF x THEN` on its
; own still yields a real `if_statement` and everything above applies. Inside a
; POU it does not: an unterminated `IF` or `VAR` collapses the whole file into
; one flat ERROR node whose children are bare keyword tokens, with no
; `if_statement` and no `var` left to match.
;
; What survives is the opening keyword, so match that. A capture on a leaf can
; only ever be reached through the blank-line path — the engine anchors a blank
; line on the last node of the line above — which is exactly the moment that
; matters: <CR> pressed straight after typing `THEN`, `DO`, `OF` or `VAR`.
; `indent.immediate` is needed because a keyword token starts and ends on one
; line.
;
; Note what this cannot do. Once a statement has been typed inside the broken
; region, the line below it anchors on that statement's `;`, whose only ancestor
; is the ERROR node, and no structure remains to say how deep it was. Those
; lines fall back to column 0 until the terminator is typed. `(ERROR)
; @indent.auto` would paper over that by copying the previous line, but it
; returns before any accumulated indent is used, so it would also cancel the
; rules below — and measured over the corpus it lands on the formatter's column
; less often than these do (70% against 77% of body lines).

((ERROR
  [
    "then"
    "do"
    "of"
    "repeat"
    "else"
    "struct"
    "get"
    "set"
  ] @indent.begin)
  (#set! indent.immediate 1))

((ERROR
  [
    "var"
    "var_input"
    "var_output"
    "var_in_out"
    "var_temp"
    "var_static"
    "var_global"
    "var_external"
    "var_inst"
  ] @indent.begin)
  (#set! indent.immediate 1))
