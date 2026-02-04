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
    source: ($) => $.block,

    block: ($) => repeat1(choice(seq($._statement, ";"), $.noop)),

    // Expression
    _expression: ($) =>
      choice(
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
        $.true,
        $.false
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
        seq(optional("NOT"), $.identifier, "=>", $.identifier)
      ),

    true: (_) => choice("TRUE", "true", "True"),
    false: (_) => choice("FALSE", "false", "False"),

    parenthesized_expression: ($) =>
      prec(PREC.parenthesized_expression, seq("(", $._expression, ")")),

    unary_expression: ($) => choice(prec(PREC.unary, seq("-", $._expression))),

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

    string_literal: ($) => seq("'", /.*/, "'"),

    noop: (_) => SEMICOLON,

    _statement: ($) =>
      choice(
        $.case_statement,
        $.if_statement,
        $.assignment,
        $.fb_invocation,
        $.return
      ),

    return: ($) => seq("RETURN", optional($._expression)),

    fb_invocation: ($) =>
      seq(
        $.identifier,
        "(",
        seq(optional($.param_assignment), repeat(seq(",", $.param_assignment))),
        ")"
      ),

    // Variables
    identifier: (_) => /[_a-zA-Z][_a-zA-Z0-9]*/,

    // Assignments
    assignment: ($) =>
      seq(
        field("identifier", $.identifier),
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

    // http://stackoverflow.com/questions/13014947/regex-to-match-a-c-style-multiline-comment/36328890#36328890
    comment: ($) =>
      token(
        choice(seq("//", /.*/), seq("(*", /[^*]*\*+([^/*][^*]*\*+)*/, ")"))
      ),
  },
});
