/**
 * @file IEC 61131-3 Structured Text grammar for tree-sitter
 * @author Teun Reyniers <teun.reyniers@hotmail.be>
 * @license MIT
 * @see {@link https://en.wikipedia.org/wiki/IEC_61131-3}
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  or: 0,
  xor: 1,
  and: 2,

  equality: 10,
  compare: 11,

  add: 20,
  multiply: 21,
  power: 22,

  unary: 30,

  parenthesized_expression: 40,
};

const SEMICOLON = ";";

// Elementary types that may prefix a typed literal, e.g. `WORD#16#FFF0`.
// TIME/LTIME and the date types are handled by their own literal rules.
const ELEMENTARY_TYPES = [
  "BOOL",
  "BYTE",
  "WORD",
  "DWORD",
  "LWORD",
  "SINT",
  "INT",
  "DINT",
  "LINT",
  "USINT",
  "UINT",
  "UDINT",
  "ULINT",
  "REAL",
  "LREAL",
  "STRING",
  "WSTRING",
  "CHAR",
  "WCHAR",
];

/**
 * A keyword in any mix of cases. `IF`, `if` and `If` are all the same word to
 * an ST compiler. The token is aliased to the lower case spelling so that
 * queries can name it without caring how it was written, and given an explicit
 * precedence so it outranks `identifier`, which matches the same text.
 * @param {string} keyword
 */
function caseInsensitive(keyword) {
  const pattern = keyword
    .split("")
    .map((c) => (/[a-z]/.test(c) ? `[${c}${c.toUpperCase()}]` : c))
    .join("");
  return alias(token(prec(1, new RegExp(pattern))), keyword);
}

/**
 * A literal token prefix in either case, e.g. `bothCases("dt")` matches
 * `dt` and `DT` but not `Dt`. Mixed case is not used in practice.
 * @param {string} keyword
 */
function bothCases(keyword) {
  return choice(keyword.toLowerCase(), keyword.toUpperCase());
}

/**
 * Comma separated parameter list allowing a trailing comma.
 * @param {any} param
 */
function parameterList(param) {
  return optional(seq(param, repeat(seq(",", param)), optional(",")));
}

/**
 * One or more comma separated items, allowing a trailing comma.
 * @param {any} item
 */
function commaSep1(item) {
  return seq(item, repeat(seq(",", item)), optional(","));
}

/**
 * A `VAR…END_VAR` section with an optional qualifier.
 * @param {any} $
 * @param {string} keyword
 */
function varSection($, keyword) {
  return seq(
    caseInsensitive(keyword),
    optional(field("qualifier", $.var_qualifier)),
    repeat($.variable_declaration),
    caseInsensitive("end_var")
  );
}

export default grammar({
  name: "structured_text",

  // A leading pragma cannot be attributed to a declaration or to a statement
  // list until the token after it is seen, so the two readings of `source` stay
  // live until then.
  conflicts: ($) => [[$.block], [$._top_level_declaration, $.block]],

  // Keyword extraction. Without it a keyword token can win the lexer race
  // against a longer identifier that merely starts with it, turning
  // `Supervisor.Restart` into `SUPER` followed by `visor`.
  word: ($) => $.identifier,

  extras: ($) => [/\s/, $.comment],

  rules: {
    source: ($) => choice(
      repeat1($._top_level_declaration),
      $.block
    ),

    // A file holds either declarations or a bare statement list. Vendors export
    // one POU per file, so a lone `METHOD`, a global variable list, or a leading
    // pragma are all whole files in practice.
    _top_level_declaration: ($) =>
      choice(
        $.function_block_declaration,
        $.test_function_block_declaration,
        $.function_declaration,
        $.program_declaration,
        $.class_declaration,
        $.interface_declaration,
        $._pou_member,
        $.type_declaration,
        $.configuration_declaration,
        // Only a global variable list stands alone as a file. Admitting every
        // section here would let a bare `VAR` open one, which collides with
        // `var` used as an ordinary identifier.
        $.var_global,
        $.pragma
      ),

    // A simple statement is always terminated by `;`. After a compound
    // statement the terminator is optional, which is what most vendors accept
    // and what the sources in the wild rely on (`END_IF` on its own line).
    block: ($) =>
      repeat1(
        choice(
          seq($._simple_statement, SEMICOLON),
          $._terminated_compound_statement,
          $.noop,
          $.pragma
        )
      ),

    _terminated_compound_statement: ($) =>
      prec.right(seq($._compound_statement, optional(SEMICOLON))),

    // Program organization units
    function_block_declaration: ($) =>
      seq(
        caseInsensitive("function_block"),
        optional(field("access", $.access_specifier)),
        field("name", $.identifier),
        optional($.extends_clause),
        optional($.implements_clause),
        repeat(field("var_section", $._var_section)),
        field("body", optional($.block)),
        repeat(field("member", $._pou_member)),
        caseInsensitive("end_function_block")
      ),

    // Unit-test POU as used by ST test frameworks. Body is identical to a
    // regular function block.
    test_function_block_declaration: ($) =>
      seq(
        caseInsensitive("test_function_block"),
        field("name", $.identifier),
        optional($.extends_clause),
        optional($.implements_clause),
        repeat(field("var_section", $._var_section)),
        field("body", optional($.block)),
        repeat(field("member", $._pou_member)),
        caseInsensitive("end_test_function_block")
      ),

    // Methods, properties and actions may be written inside the POU they
    // belong to, or exported one per file.
    _pou_member: ($) =>
      choice(
        $.method_declaration,
        $.property_declaration,
        $.action_declaration
      ),

    // A single base for a class, several for an interface.
    extends_clause: ($) =>
      seq(
        caseInsensitive("extends"),
        field("base", $.identifier),
        repeat(seq(",", field("base", $.identifier)))
      ),

    implements_clause: ($) =>
      seq(
        caseInsensitive("implements"),
        field("interface", $.identifier),
        repeat(seq(",", field("interface", $.identifier)))
      ),

    access_specifier: (_) =>
      repeat1(
        choice(
          caseInsensitive("public"),
          caseInsensitive("private"),
          caseInsensitive("protected"),
          caseInsensitive("internal"),
          caseInsensitive("final"),
          caseInsensitive("abstract")
        )
      ),

    // A class carries no body of its own; the work lives in its methods.
    class_declaration: ($) =>
      seq(
        caseInsensitive("class"),
        optional(field("access", $.access_specifier)),
        field("name", $.identifier),
        optional($.extends_clause),
        optional($.implements_clause),
        repeat(field("var_section", $._var_section)),
        repeat(field("member", $._pou_member)),
        caseInsensitive("end_class")
      ),

    interface_declaration: ($) =>
      seq(
        caseInsensitive("interface"),
        field("name", $.identifier),
        optional($.extends_clause),
        repeat(
          field("member", choice($.method_declaration, $.property_declaration))
        ),
        caseInsensitive("end_interface")
      ),

    // A method exported as its own file has no `END_METHOD`: the body simply
    // runs to the end of the file. Written inside a POU the terminator is
    // present, and the following member or `END_FUNCTION_BLOCK` closes it
    // either way.
    method_declaration: ($) =>
      prec.right(
        seq(
          caseInsensitive("method"),
          optional(field("access", $.access_specifier)),
          field("name", $.identifier),
          optional(seq(":", field("return_type", $.type_name))),
          repeat(field("var_section", $._var_section)),
          field("body", optional($.block)),
          optional(caseInsensitive("end_method"))
        )
      ),

    property_declaration: ($) =>
      seq(
        caseInsensitive("property"),
        optional(field("access", $.access_specifier)),
        field("name", $.identifier),
        optional(seq(":", field("type", $.type_name))),
        repeat(field("accessor", choice($.get_accessor, $.set_accessor))),
        caseInsensitive("end_property")
      ),

    get_accessor: ($) =>
      seq(
        caseInsensitive("get"),
        repeat(field("var_section", $._var_section)),
        field("body", optional($.block)),
        caseInsensitive("end_get")
      ),

    set_accessor: ($) =>
      seq(
        caseInsensitive("set"),
        repeat(field("var_section", $._var_section)),
        field("body", optional($.block)),
        caseInsensitive("end_set")
      ),

    action_declaration: ($) =>
      seq(
        caseInsensitive("action"),
        field("name", $.identifier),
        optional(":"),
        repeat(field("var_section", $._var_section)),
        field("body", optional($.block)),
        caseInsensitive("end_action")
      ),

    // Deployment elements: which programs run on which resource, driven by
    // which task.
    configuration_declaration: ($) =>
      seq(
        caseInsensitive("configuration"),
        field("name", $.identifier),
        repeat(
          choice($._var_section, $.resource_declaration, $._resource_member)
        ),
        caseInsensitive("end_configuration")
      ),

    resource_declaration: ($) =>
      seq(
        caseInsensitive("resource"),
        field("name", $.identifier),
        caseInsensitive("on"),
        field("type", $.identifier),
        repeat(choice($._var_section, $._resource_member)),
        caseInsensitive("end_resource")
      ),

    _resource_member: ($) =>
      choice($.task_declaration, $.program_configuration),

    task_declaration: ($) =>
      seq(
        caseInsensitive("task"),
        field("name", $.identifier),
        "(",
        parameterList($.task_parameter),
        ")",
        ";"
      ),

    // `INTERVAL := t#20ms`, `PRIORITY := 1`, `SINGLE := Trigger`.
    task_parameter: ($) =>
      seq(field("name", $.identifier), ":=", field("value", $._expression)),

    program_configuration: ($) =>
      seq(
        caseInsensitive("program"),
        field("name", $.identifier),
        optional(seq(caseInsensitive("with"), field("task", $.identifier))),
        ":",
        field("type", $.identifier),
        optional(seq("(", parameterList($.param_assignment), ")")),
        ";"
      ),

    function_declaration: ($) =>
      seq(
        caseInsensitive("function"),
        field("name", $.identifier),
        optional(seq(":", field("return_type", $.type_name))),
        repeat(field("var_section", $._var_section)),
        field("body", optional($.block)),
        caseInsensitive("end_function")
      ),

    program_declaration: ($) =>
      seq(
        caseInsensitive("program"),
        field("name", $.identifier),
        repeat(field("var_section", $._var_section)),
        field("body", optional($.block)),
        repeat(field("member", $._pou_member)),
        caseInsensitive("end_program")
      ),

    // One `TYPE … END_TYPE` block may define several types.
    type_declaration: ($) =>
      seq(
        caseInsensitive("type"),
        repeat1($.type_definition),
        caseInsensitive("end_type")
      ),

    // A struct, an enumeration, or an alias for any other type — which covers
    // the subrange (`INT (0..100)`) and array (`ARRAY[0..9] OF INT`) forms.
    type_definition: ($) =>
      seq(
        field("name", $.identifier),
        ":",
        field(
          "definition",
          choice($.struct_definition, $.enum_definition, $.type_name)
        ),
        optional(seq(":=", field("initial_value", $._initial_value))),
        // Vendors terminate the definition with `;` after an enumeration or an
        // alias but not always after `END_STRUCT`.
        optional(";")
      ),

    enum_definition: ($) => seq("(", commaSep1($.enum_member), ")"),

    enum_member: ($) =>
      seq(
        field("name", $.identifier),
        optional(seq(":=", field("value", $._expression)))
      ),

    struct_definition: ($) =>
      seq(
        caseInsensitive("struct"),
        repeat($.struct_field),
        caseInsensitive("end_struct")
      ),

    struct_field: ($) =>
      seq(
        repeat($.pragma),
        field("name", $.identifier),
        optional(seq(caseInsensitive("at"), field("location", $.direct_address))),
        ":",
        field("type", $.type_name),
        optional(seq(":=", field("initial_value", $._initial_value))),
        ";"
      ),

    pragma: ($) => seq("{", optional(/[^\}]*/), "}"),

    _var_section: ($) =>
      choice(
        $.var_input,
        $.var_output,
        $.var_in_out,
        $.var,
        $.var_temp,
        $.var_static,
        $.var_global,
        $.var_external,
        $.var_inst
      ),

    // CONSTANT / RETAIN / NON_RETAIN / PERSISTENT may follow any section
    // keyword, and may be combined (`VAR RETAIN PERSISTENT`).
    var_qualifier: (_) =>
      repeat1(
        choice(
          caseInsensitive("constant"),
          caseInsensitive("retain"),
          caseInsensitive("non_retain"),
          caseInsensitive("persistent")
        )
      ),

    var_input: ($) => varSection($, "var_input"),
    var_output: ($) => varSection($, "var_output"),
    var_in_out: ($) => varSection($, "var_in_out"),
    var: ($) => varSection($, "var"),
    var_temp: ($) => varSection($, "var_temp"),
    var_static: ($) => varSection($, "var_static"),
    var_global: ($) => varSection($, "var_global"),
    var_external: ($) => varSection($, "var_external"),
    var_inst: ($) => varSection($, "var_inst"),

    // Comments are `extras`, so they must not be listed here: a comment
    // between the last declaration and END_VAR would otherwise be shifted
    // into a declaration that can never be completed.
    variable_declaration: ($) =>
      seq(
        repeat($.pragma),
        field("name", $.identifier),
        optional(seq(caseInsensitive("at"), field("location", $.direct_address))),
        ":",
        field("type", $.type_name),
        optional(seq(":=", field("initial_value", $._initial_value))),
        ";"
      ),

    // A variable may be initialised with a plain expression, an array
    // initialiser or a structure initialiser.
    _initial_value: ($) =>
      choice($._expression, $.array_initializer, $.structure_initializer),

    // `[1, 2, 3]`, including the `n(value)` repetition form.
    array_initializer: ($) => seq("[", commaSep1($._array_initializer_item), "]"),

    _array_initializer_item: ($) =>
      choice($.array_initializer_repetition, $._initial_value),

    array_initializer_repetition: ($) =>
      seq(
        field("count", $.integer_literal),
        "(",
        commaSep1($._array_initializer_item),
        ")"
      ),

    // `(a := 1, b := 2)`. Every element is named, which is what separates this
    // from a parenthesized expression.
    structure_initializer: ($) =>
      seq("(", commaSep1($.structure_element_initializer), ")"),

    structure_element_initializer: ($) =>
      seq(
        field("name", $.identifier),
        ":=",
        field("value", $._initial_value)
      ),

    type_name: ($) => choice(
      $.array_type,
      $.sized_type,
      $.pointer_type,
      $.reference_type,
      $.qualified_type_name,
      $.identifier
    ),

    pointer_type: ($) =>
      seq(
        caseInsensitive("pointer"),
        caseInsensitive("to"),
        field("type", $.type_name)
      ),

    reference_type: ($) =>
      seq(
        caseInsensitive("reference"),
        caseInsensitive("to"),
        field("type", $.type_name)
      ),

    // A type may be namespaced, e.g. `CmpApp.EVTPARAM_CmpApp`. Kept separate
    // from `qualified_identifier`, whose base admits indexing and dereferences
    // that have no meaning in a type position.
    qualified_type_name: ($) =>
      seq($.identifier, repeat1(seq(".", $.identifier))),

    // `STRING[512]`, `WSTRING(80)` and the subrange form `INT (0..100)`, which
    // share a shape. Modelled as a sized identifier rather than a STRING
    // keyword so that a bare `STRING` stays an ordinary identifier.
    sized_type: ($) =>
      seq(
        field("name", $.identifier),
        choice(
          seq("[", field("size", $._array_bound), "]"),
          seq("(", field("size", choice($._array_bound, $.array_range)), ")")
        )
      ),

    array_type: ($) =>
      seq(
        caseInsensitive("array"),
        "[",
        field("range", $.array_range),
        repeat(seq(",", field("range", $.array_range))),
        "]",
        caseInsensitive("of"),
        field("element_type", $.type_name)
      ),

    array_range: ($) =>
      seq(
        field("start", $._array_bound),
        "..",
        field("end", $._array_bound)
      ),

    // Bounds are a restricted expression rather than `_expression`: a float
    // is never a valid bound, and admitting `float_literal` here would make
    // the lexer read the `0.` of `0..MAX` as a float.
    _array_bound: ($) =>
      choice(
        $.integer_literal,
        $.identifier,
        $.qualified_identifier,
        $.array_bound_expression
      ),

    array_bound_expression: ($) =>
      choice(
        prec.left(
          PREC.add,
          seq(
            field("left", $._array_bound),
            field("operator", choice("+", "-")),
            field("right", $._array_bound)
          )
        ),
        prec.left(
          PREC.multiply,
          seq(
            field("left", $._array_bound),
            field("operator", choice("*", "/", caseInsensitive("mod"))),
            field("right", $._array_bound)
          )
        ),
        prec(PREC.unary, seq("-", field("operand", $._array_bound))),
        prec(PREC.parenthesized_expression, seq("(", $._array_bound, ")"))
      ),

    // Expression
    _expression: ($) =>
      choice(
        $.qualified_identifier,
        $.identifier,
        $.deref_expression,
        $.unary_expression,
        $.binary_operator,
        $.boolean_operator,
        $.comparison_operator,
        $.equality_operator,
        $.parenthesized_expression,
        $.function_call,
        $.index_expression,
        $.direct_address,
        $.float_literal,
        $.integer_literal,
        $.string_literal,
        $.time_literal,
        $.date_literal,
        $.time_of_day_literal,
        $.date_and_time_literal,
        $.typed_literal,
        $.true,
        $.false
      ),

    function_call: ($) =>
      seq(
        field("name", $._callable),
        "(",
        parameterList($.param_assignment),
        ")"
      ),

    // A call target may be namespaced (`FPU.IsRealNumber`), a method on an
    // instance (`fb.Run`), or the base implementation (`SUPER^`).
    _callable: ($) =>
      choice($.identifier, $.qualified_identifier, $.deref_expression),

    param_assignment: ($) =>
      choice(
        seq(optional(seq($.identifier, ":=")), $._expression),
        seq(
          optional(caseInsensitive("not")),
          $.identifier,
          "=>",
          field("target", $._variable)
        )
      ),

    true: (_) => choice("TRUE", "true", "True"),
    false: (_) => choice("FALSE", "false", "False"),

    parenthesized_expression: ($) =>
      prec(PREC.parenthesized_expression, seq("(", $._expression, ")")),

    unary_expression: ($) => choice(prec(PREC.unary, seq("-", $._expression)), prec(PREC.unary, seq(caseInsensitive("not"), $._expression))),

    // Typed literal, e.g. `WORD#16#FFF0`, `DINT#0`, `REAL#0.0`.
    // The `#` is part of the prefix token so that it always outranks
    // `identifier`, which would otherwise win the longest-match tie.
    typed_literal: ($) =>
      seq(
        field("type", $.literal_type),
        field(
          "value",
          choice(
            $.float_literal,
            $.integer_literal,
            $.string_literal,
            $.true,
            $.false
          )
        )
      ),

    literal_type: (_) =>
      token(
        seq(
          choice(...ELEMENTARY_TYPES.map((type) => bothCases(type))),
          "#"
        )
      ),

    binary_operator: ($) =>
      choice(
        prec.left(
          PREC.add,
          seq(
            field("left", $._expression),
            field("operator", choice("+", "-")),
            field("right", $._expression)
          )
        ),
        prec.left(
          PREC.multiply,
          seq(
            field("left", $._expression),
            field("operator", choice("*", "/", caseInsensitive("mod"))),
            field("right", $._expression)
          )
        ),
        prec.right(
          PREC.power,
          seq(
            field("left", $._expression),
            field("operator", "**"),
            field("right", $._expression)
          )
        )
      ),

    comparison_operator: ($) =>
      prec.left(
        PREC.compare,
        seq(
          field("left", $._expression),
          field("operator", choice("<", "<=", ">=", ">")),
          field("right", $._expression)
        )
      ),

    equality_operator: ($) =>
      prec.left(
        PREC.equality,
        seq(
          field("left", $._expression),
          field("operator", choice("=", "<>")),
          field("right", $._expression)
        )
      ),

    boolean_operator: ($) =>
      choice(
        prec.left(
          PREC.and,
          seq(
            field("left", $._expression),
            field("operator", caseInsensitive("and")),
            field("right", $._expression)
          )
        ),
        prec.left(
          PREC.or,
          seq(
            field("left", $._expression),
            field("operator", caseInsensitive("or")),
            field("right", $._expression)
          )
        ),
        prec.left(
          PREC.xor,
          seq(
            field("left", $._expression),
            field("operator", caseInsensitive("xor")),
            field("right", $._expression)
          )
        )
      ),

    integer_literal: (_) =>
      token(
        choice(
          seq(choice("2#"), repeat1(/_?[0-1]+/)),
          seq(choice("8#"), repeat1(/_?[0-7]+/)),
          seq(repeat1(/[0-9]+_?/)),
          seq(choice("16#"), repeat1(/_?[A-Fa-f0-9]+/))
        )
      ),

    float_literal: (_) => {
      const digits = repeat1(/[0-9]+_?/);
      const exponent = seq(/[eE][\+-]?/, digits);

      return token(
        seq(
          choice(
            seq(digits, ".", optional(digits), optional(exponent)),
            seq(optional(digits), ".", digits, optional(exponent)),
            seq(digits, exponent)
          ),
          optional(choice(/[Ll]/, /[jJ]/))
        )
      );
    },

    // Single quoted STRING and double quoted WSTRING, both allowing the IEC
    // `$` escape. Must be a single token so that `extras` cannot be inserted
    // between the quotes.
    string_literal: (_) =>
      token(
        choice(
          seq("'", repeat(choice(/[^'$]/, seq("$", /./))), "'"),
          seq('"', repeat(choice(/[^"$]/, seq("$", /./))), '"')
        )
      ),

    date_literal: (_) => {
      const digits = repeat1(/[0-9]/);

      return token(
        seq(
          seq(choice(bothCases("date"), bothCases("d")), "#"),
          digits,
          "-",
          digits,
          "-",
          digits
        )
      );
    },

    time_of_day_literal: (_) => {
      const digits = repeat1(/[0-9]/);

      return token(
        seq(
          seq(choice(bothCases("time_of_day"), bothCases("tod")), "#"),
          digits,
          ":",
          digits,
          ":",
          digits,
          optional(seq(".", digits))
        )
      );
    },

    date_and_time_literal: (_) => {
      const digits = repeat1(/[0-9]/);

      return token(
        seq(
          seq(choice(bothCases("date_and_time"), bothCases("dt")), "#"),
          digits,
          "-",
          digits,
          "-",
          digits,
          "-",
          digits,
          ":",
          digits,
          ":",
          digits,
          optional(seq(".", digits))
        )
      );
    },

    time_literal: (_) => {
      const digits = repeat1(/[0-9]/);
      const decimal_digits = seq(digits, optional(seq(".", digits)));

      return token(
        seq(
          seq(
            choice(
              bothCases("ltime"),
              bothCases("time"),
              bothCases("lt"),
              bothCases("t")
            ),
            "#"
          ),
          choice(
            // Milliseconds as smallest unit
            seq(decimal_digits, /[mM][sS]/),
            // Seconds + milliseconds as smallest unit
            seq(digits, /[sS]/, decimal_digits, /[mM][sS]/),
            // Seconds as smallest unit
            seq(decimal_digits, /[sS]/),
            // Minutes + seconds + milliseconds as smallest unit
            seq(digits, /[mM]/, digits, /[sS]/, decimal_digits, /[mM][sS]/),
            // Minutes + seconds as smallest unit
            seq(digits, /[mM]/, decimal_digits, /[sS]/),
            // Minutes as smallest unit
            seq(decimal_digits, /[mM]/),
            // Hours + minutes + seconds + milliseconds as smallest unit
            seq(digits, /[hH]/, digits, /[mM]/, digits, /[sS]/, decimal_digits, /[mM][sS]/),
            // Hours + minutes + seconds as smallest unit
            seq(digits, /[hH]/, digits, /[mM]/, decimal_digits, /[sS]/),
            // Hours + minutes as smallest unit
            seq(digits, /[hH]/, decimal_digits, /[mM]/),
            // Hours as smallest unit
            seq(decimal_digits, /[hH]/),
            // Days + hours + minutes + seconds + milliseconds as smallest unit
            seq(digits, /[dD]/, digits, /[hH]/, digits, /[mM]/, digits, /[sS]/, decimal_digits, /[mM][sS]/),
            // Days + hours + minutes + seconds as smallest unit
            seq(digits, /[dD]/, digits, /[hH]/, digits, /[mM]/, decimal_digits, /[sS]/),
            // Days + hours + minutes as smallest unit
            seq(digits, /[dD]/, digits, /[hH]/, decimal_digits, /[mM]/),
            // Days + hours as smallest unit
            seq(digits, /[dD]/, decimal_digits, /[hH]/),
            // Days as smallest unit
            seq(decimal_digits, /[dD]/)
          )
        )
      );
    },

    noop: (_) => SEMICOLON,

    _compound_statement: ($) =>
      choice(
        $.case_statement,
        $.if_statement,
        $.for_statement,
        $.while_statement,
        $.repeat_statement
      ),

    _simple_statement: ($) =>
      choice(
        $.assignment,
        $.fb_invocation,
        $.return,
        $.exit,
        $.continue
      ),

    return: ($) => seq(caseInsensitive("return"), optional($._expression)),

    exit: (_) => caseInsensitive("exit"),

    continue: (_) => caseInsensitive("continue"),

    fb_invocation: ($) =>
      seq($._callable, "(", parameterList($.param_assignment), ")"),

    // Variables
    identifier: (_) => /[_a-zA-Z][_a-zA-Z0-9]*/,

    // Anything that can be read from or assigned to.
    _variable: ($) =>
      choice(
        $.identifier,
        $.qualified_identifier,
        $.index_expression,
        $.deref_expression,
        $.direct_address
      ),

    // A member may be an integer to address a single bit, e.g. `input.0`.
    // The base is not restricted to a plain identifier: `messages[i].step` and
    // `THIS^.state` both start a member chain.
    qualified_identifier: ($) =>
      seq(
        choice($.identifier, $.index_expression, $.deref_expression),
        repeat1(seq(".", choice($.identifier, $.bit_selector)))
      ),

    // `p^`, `THIS^`, `SUPER^`, and chains such as `p^^` or `arr[i]^`.
    deref_expression: ($) =>
      prec.left(
        seq(
          field(
            "operand",
            choice(
              $.this,
              $.super,
              $.identifier,
              $.qualified_identifier,
              $.index_expression,
              $.deref_expression
            )
          ),
          "^"
        )
      ),

    this: (_) => caseInsensitive("this"),

    super: (_) => caseInsensitive("super"),

    bit_selector: (_) => /[0-9]+/,

    // A hardware location: `%IX0.0`, `%QW12`, `%MD100`. The size prefix is
    // optional and `*` stands in for a location assigned by the compiler.
    direct_address: (_) =>
      token(/%[IQMiqm]([XBWDLxbwdl])?([0-9]+(\.[0-9]+)*|\*)/),

    index_expression: ($) =>
      seq(
        field("array", $._variable),
        "[",
        field("index", $._expression),
        repeat(seq(",", field("index", $._expression))),
        "]"
      ),

    // Assignments. `REF=` binds a reference to a variable rather than copying
    // a value into it.
    assignment: ($) =>
      seq(
        field("identifier", $._variable),
        choice(":=", caseInsensitive("ref=")),
        field("expression", $._expression)
      ),

    // If statements
    if_statement: ($) =>
      seq(
        caseInsensitive("if"),
        field("condition", $._expression),
        caseInsensitive("then"),
        field("consequence", optional($.block)),
        repeat(field("alternative", $.elsif_clause)),
        optional(field("alternative", $.else_clause)),
        caseInsensitive("end_if")
      ),

    elsif_clause: ($) =>
      seq(
        caseInsensitive("elsif"),
        field("condition", $._expression),
        caseInsensitive("then"),
        field("consequence", optional($.block))
      ),

    else_clause: ($) =>
      seq(caseInsensitive("else"), field("body", optional($.block))),

    // Case
    case_statement: ($) =>
      seq(
        caseInsensitive("case"),
        field("value", $._expression),
        caseInsensitive("of"),
        field("body", $.case_body),
        optional(field("else", seq(caseInsensitive("else"), optional($.block)))),
        caseInsensitive("end_case")
      ),

    case_body: ($) => repeat1($.case_item),

    case_item: ($) =>
      prec.right(
        seq(field("label", $.case_label), ":", field("body", optional($.block)))
      ),

    case_label: ($) =>
      seq(
        choice($.case_label_single, $.case_label_range),
        repeat(seq(",", choice($.case_label_single, $.case_label_range)))
      ),

    case_label_single: ($) => $._case_label_value,
    case_label_range: ($) =>
      seq($._case_label_value, "..", $._case_label_value),

    // A label is a compile time constant: a literal, an enumerator (possibly
    // qualified, e.g. `Color.Red`), or a boolean.
    _case_label_value: ($) =>
      choice(
        $.integer_literal,
        $.negative_integer,
        $.identifier,
        $.qualified_identifier,
        $.typed_literal,
        $.true,
        $.false
      ),

    negative_integer: ($) => seq("-", $.integer_literal),

    // Loops
    for_statement: ($) =>
      seq(
        caseInsensitive("for"),
        field("variable", $._variable),
        ":=",
        field("start", $._expression),
        caseInsensitive("to"),
        field("end", $._expression),
        optional(seq(caseInsensitive("by"), field("by", $._expression))),
        caseInsensitive("do"),
        field("body", optional($.block)),
        caseInsensitive("end_for")
      ),

    while_statement: ($) =>
      seq(
        caseInsensitive("while"),
        field("condition", $._expression),
        caseInsensitive("do"),
        field("body", optional($.block)),
        caseInsensitive("end_while")
      ),

    repeat_statement: ($) =>
      seq(
        caseInsensitive("repeat"),
        field("body", optional($.block)),
        caseInsensitive("until"),
        field("condition", $._expression),
        caseInsensitive("end_repeat")
      ),

    comment: ($) =>
      token(
        choice(
          seq("//", /.*/),
          seq("(*", repeat(choice(/[^*]/, seq("*", /[^)]/))), "*)")
        )
      ),
  },
});
