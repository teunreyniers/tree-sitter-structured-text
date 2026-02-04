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

/**
 * @param {string} keyword
 * @param {boolean} aliasAsWord
 */
function caseInsensitive(keyword, aliasAsWord = true) {
  return alias(choice(keyword, keyword.toUpperCase()), keyword);
}

export default grammar({
  name: "structured_text",

  conflicts: ($) => [[$.block]],

  extras: ($) => [/\s/, $.comment],

  rules: {
    source: ($) => choice(
      repeat1(choice($.function_block_declaration, $.function_declaration, $.program_declaration, $.type_declaration)),
      $.block
    ),

    block: ($) => repeat1(choice(seq($._statement, ";"), $.noop, $.pragma)),

    // Program organization units
    function_block_declaration: ($) =>
      seq(
        caseInsensitive("function_block"),
        field("name", $.identifier),
        repeat(field("var_section", $._var_section)),
        field("body", optional($.block)),
        caseInsensitive("end_function_block")
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
        caseInsensitive("end_program")
      ),

    type_declaration: ($) =>
      seq(
        caseInsensitive("type"),
        field("name", $.identifier),
        ":",
        field("definition", $.struct_definition),
        caseInsensitive("end_type")
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
        ":",
        field("type", $.type_name),
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
        $.var_constant
      ),

    var_input: ($) =>
      seq(
        caseInsensitive("var_input"),
        repeat($.variable_declaration),
        caseInsensitive("end_var")
      ),

    var_output: ($) =>
      seq(
        caseInsensitive("var_output"),
        repeat($.variable_declaration),
        caseInsensitive("end_var")
      ),

    var_in_out: ($) =>
      seq(
        caseInsensitive("var_in_out"),
        repeat($.variable_declaration),
        caseInsensitive("end_var")
      ),

    var: ($) =>
      seq(
        caseInsensitive("var"),
        repeat($.variable_declaration),
        caseInsensitive("end_var")
      ),

    var_temp: ($) =>
      seq(
        caseInsensitive("var_temp"),
        repeat($.variable_declaration),
        caseInsensitive("end_var")
      ),

    var_static: ($) =>
      seq(
        caseInsensitive("var_static"),
        repeat($.variable_declaration),
        caseInsensitive("end_var")
      ),

    var_global: ($) =>
      seq(
        caseInsensitive("var_global"),
        repeat($.variable_declaration),
        caseInsensitive("end_var")
      ),

    var_external: ($) =>
      seq(
        caseInsensitive("var_external"),
        repeat($.variable_declaration),
        caseInsensitive("end_var")
      ),

    var_constant: ($) =>
      seq(
        caseInsensitive("var"),
        caseInsensitive("constant"),
        repeat($.variable_declaration),
        caseInsensitive("end_var")
      ),

    variable_declaration: ($) =>
      seq(
        repeat(choice($.comment, $.pragma)),
        field("name", $.identifier),
        ":",
        field("type", $.type_name),
        optional(seq(":=", field("initial_value", $._expression))),
        ";"
      ),

    type_name: ($) => choice(
      $.array_type,
      $.identifier
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
        field("start", choice($.integer_literal, $.identifier)),
        "..",
        field("end", choice($.integer_literal, $.identifier))
      ),

    // Expression
    _expression: ($) =>
      choice(
        $.qualified_identifier,
        $.identifier,
        $.unary_expression,
        $.binary_operator,
        $.boolean_operator,
        $.comparison_operator,
        $.equality_operator,
        $.parenthesized_expression,
        $.function_call,
        $.float_literal,
        $.integer_literal,
        $.time_literal,
        $.true,
        $.false,
        $.type_conversion
      ),

    function_call: ($) =>
      seq(
        field("name", $.identifier),
        "(",
        seq(optional($.param_assignment), repeat(seq(",", $.param_assignment))),
        ")"
      ),

    param_assignment: ($) =>
      choice(
        seq(optional(seq($.identifier, ":=")), $._expression),
        seq(optional(caseInsensitive("not")), $.identifier, "=>", $.identifier)
      ),

    true: (_) => choice("TRUE", "true", "True"),
    false: (_) => choice("FALSE", "false", "False"),

    parenthesized_expression: ($) =>
      prec(PREC.parenthesized_expression, seq("(", $._expression, ")")),

    unary_expression: ($) => choice(prec(PREC.unary, seq("-", $._expression)), prec(PREC.unary, seq(caseInsensitive("not"), $._expression))),

    type_conversion: ($) =>
      seq(
        field("type", $.conversion_type),
        "(",
        field("value", $._expression),
        ")"
      ),

    conversion_type: (_) => token(/[A-Z_]+_TO_[A-Z_]+/),

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
            field("operator", choice("*", "/", "MOD")),
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

    string_literal: ($) => seq("'", /[^']*/, "'"),

    time_literal: (_) => {
      const digits = repeat1(/[0-9]/);
      const decimal_digits = seq(digits, optional(seq(".", digits)));
      
      return token(
        seq(
          /[tT]#/,
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

    _statement: ($) =>
      choice(
        $.case_statement,
        $.if_statement,
        $.assignment,
        $.fb_invocation,
        $.return
      ),

    return: ($) => seq(caseInsensitive("return"), optional($._expression)),

    fb_invocation: ($) =>
      seq(
        $.identifier,
        "(",
        seq(optional($.param_assignment), repeat(seq(",", $.param_assignment))),
        ")"
      ),

    // Variables
    identifier: (_) => /[_a-zA-Z][_a-zA-Z0-9]*/,

    qualified_identifier: ($) =>
      seq($.identifier, repeat1(seq(".", $.identifier))),

    // Assignments
    assignment: ($) =>
      seq(
        field("identifier", choice($.identifier, $.qualified_identifier)),
        ":=",
        field("expression", $._expression)
      ),

    // If statements
    if_statement: ($) =>
      seq(
        caseInsensitive("if"),
        field("condition", $._expression),
        caseInsensitive("then"),
        field("consequence", $.block),
        repeat(field("alternative", $.elsif_clause)),
        optional(field("alternative", $.else_clause)),
        caseInsensitive("end_if")
      ),

    elsif_clause: ($) =>
      seq(
        caseInsensitive("elsif"),
        field("condition", $._expression),
        caseInsensitive("then"),
        field("consequence", $.block)
      ),

    else_clause: ($) => seq(caseInsensitive("else"), field("body", $.block)),

    // Case
    case_statement: ($) =>
      seq(
        caseInsensitive("case"),
        field("value", $._expression),
        caseInsensitive("of"),
        field("body", $.case_body),
        optional(field("else", seq(caseInsensitive("else"), $.block))),
        caseInsensitive("end_case")
      ),

    case_body: ($) => repeat1($.case_item),

    case_item: ($) =>
      prec.right(
        seq(field("label", $.case_label), ":", field("body", $.block))
      ),

    case_label: ($) =>
      seq(
        choice($.case_label_single, $.case_label_range),
        repeat(seq(",", choice($.case_label_single, $.case_label_range)))
      ),

    case_label_single: ($) => choice($.integer_literal, $.identifier),
    case_label_range: ($) =>
      seq(
        choice($.integer_literal, $.identifier),
        "..",
        choice($.integer_literal, $.identifier)
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
