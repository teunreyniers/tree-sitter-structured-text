# tree-sitter-structured-text

A [tree-sitter](https://tree-sitter.github.io/tree-sitter/) grammar for **IEC 61131-3 Structured Text (ST)**, the textual PLC programming language used by CODESYS, TwinCAT, Siemens SCL and other automation toolchains.

Recognised file extensions: `.st`, `.iec`, `.scl`

## Features

**Program organization units**

- `FUNCTION_BLOCK` / `END_FUNCTION_BLOCK`
- `FUNCTION` / `END_FUNCTION`, with optional return type
- `PROGRAM` / `END_PROGRAM`
- `TEST_FUNCTION_BLOCK` / `END_TEST_FUNCTION_BLOCK`, as used by ST unit-test frameworks
- `TYPE` / `END_TYPE` with `STRUCT` definitions, including per-field initial values

**Variable sections**

`VAR`, `VAR_INPUT`, `VAR_OUTPUT`, `VAR_IN_OUT`, `VAR_TEMP`, `VAR_STATIC`, `VAR_GLOBAL`, `VAR_EXTERNAL` — each terminated by `END_VAR`, with optional initial values.

Any section may carry the qualifiers `CONSTANT`, `RETAIN`, `NON_RETAIN` and `PERSISTENT`, alone or combined (`VAR RETAIN PERSISTENT`).

**Types**

- Simple type names
- Multi-dimensional `ARRAY [1..10, 0..3] OF <type>`, including nested arrays, identifier bounds and arithmetic bounds such as `[0..MAX_DEVICES - 1]`

**Statements**

- Assignment (`:=`), including qualified targets such as `motor.speed`
- The `;` after a compound statement is optional, so `END_IF` may close a statement on its own; simple statements still require it
- `IF` / `ELSIF` / `ELSE` / `END_IF`
- `CASE` / `OF` / `ELSE` / `END_CASE`, with single labels, comma-separated labels and `1..5` ranges
- `FOR` / `TO` / `BY` / `DO` / `END_FOR`, with an optional `BY` step and arbitrary expressions as bounds
- `WHILE` / `DO` / `END_WHILE`
- `REPEAT` / `UNTIL` / `END_REPEAT`
- `EXIT` and `CONTINUE`
- `RETURN`, with an optional value
- Function block invocation with positional, named (`in := x`) and output (`out => y`, `NOT out => y`) parameters. Output parameters may target a qualified name or an array element (`out => module.state`), and the parameter list may carry a trailing comma

**Expressions**

- Arithmetic `+ - * / MOD **` with IEC precedence (`**` right-associative)
- Comparison `< <= > >=` and equality `= <>`
- Boolean `AND`, `OR`, `XOR`, `NOT`, and unary `-`
- Parenthesized expressions, function calls, qualified identifiers
- Array subscripting `buffer[i]`, as an assignment target or an operand, including `m[i, j]` and `m[i][j]`
- Single-bit access `input.0`, as an assignment target or an operand
- Type conversions such as `INT_TO_REAL(x)`, parsed as ordinary function calls

**Literals**

- Integers, including based literals `2#1010`, `8#777`, `16#FF` and `_` digit separators
- Floats with exponents
- Strings `'text'` and `"wide text"`, including the `$` escape and the empty string
- `TRUE` / `FALSE` (also `true`/`false` and `True`/`False`)
- Typed literals `DINT#0`, `WORD#16#FFF0`, `REAL#0.0`, `BOOL#TRUE`
- Duration literals `T#1d2h3m4s500ms` (also `TIME#`, `LT#`, `LTIME#`), down to millisecond resolution
- `D#2026-07-31`, `TOD#12:30:00.5` and `DT#2026-07-31-12:30:00`, and their `DATE#` / `TIME_OF_DAY#` / `DATE_AND_TIME#` long forms

**Other**

- Line comments `// ...` and block comments `(* ... *)`, in any position including immediately before `END_VAR`
- Pragmas / attributes `{ ... }` before variable declarations and struct fields
- Syntax highlighting queries in [`queries/highlights.scm`](queries/highlights.scm)

## Installation

**Node.js**

```sh
npm install tree-sitter-structured-text
```

The package is ESM-only:

```js
import Parser from 'tree-sitter';
import StructuredText from 'tree-sitter-structured-text';

const parser = new Parser();
parser.setLanguage(StructuredText);

const tree = parser.parse('x := 1 + 2;');
```

**Rust**

```sh
cargo add tree-sitter-structured-text
```

```rust
let mut parser = tree_sitter::Parser::new();
parser.set_language(&tree_sitter_structured_text::LANGUAGE.into())?;
```

**Python**

```sh
pip install tree-sitter-structured-text
```

```python
import tree_sitter
import tree_sitter_structured_text

language = tree_sitter.Language(tree_sitter_structured_text.language())
parser = tree_sitter.Parser(language)
```

**Go**

```sh
go get github.com/teunreyniers/tree-sitter-structured-text
```

Bindings for C and Swift are also generated under [`bindings/`](bindings/).

## Development

Requires [`tree-sitter-cli`](https://github.com/tree-sitter/tree-sitter) (installed as a dev dependency).

```sh
npm install                  # install dependencies
npx tree-sitter generate     # regenerate src/parser.c from grammar.js
npx tree-sitter test         # run the corpus tests in test/corpus/
npm test                     # run the Node binding tests
npm start                    # build the WASM parser and open the playground
```

Corpus tests live in [`test/corpus/`](test/corpus/). Add a case there for every grammar change — each file groups related constructs (expressions, statements, declarations, literals).

Always re-run `tree-sitter generate` after editing `grammar.js`; the generated `src/parser.c` is committed.

## Known limitations

The grammar covers the subset of IEC 61131-3 needed for everyday ST code. Not yet supported:

- Member access after a subscript, e.g. `items[i].value` (`obj.items[i]` does parse)
- OOP extensions: `CLASS`, `INTERFACE`, `METHOD`, `PROPERTY`, `EXTENDS`, `IMPLEMENTS`
- `ACTION`, `CONFIGURATION`, `RESOURCE`, `TASK`, `VAR_ACCESS`
- Direct hardware addressing such as `%IX0.0` and `AT` declarations
- Sized `STRING[80]` declarations
- Enumerations and subrange type definitions (only `STRUCT` is parsed under `TYPE`)

Four parsing caveats worth knowing:

- Keywords are case-insensitive only in their all-lowercase and all-uppercase forms. `IF` and `if` parse; `If` does not.
- `MOD` is recognised in uppercase only.
- Statement bodies cannot be empty. `IF c THEN END_IF;` and `WHILE c DO END_WHILE;` do not parse — write a bare `;` inside.
- The section qualifiers are reserved: a variable named exactly `CONSTANT`, `RETAIN`, `NON_RETAIN` or `PERSISTENT` does not parse. Names that merely start with one, such as `retain_count`, are fine.

Contributions closing any of these gaps are welcome — add corpus tests alongside the grammar change.

## License

[MIT](LICENSE) © Teun Reyniers

This grammar describes the *syntax* of IEC 61131-3 Structured Text, which is not itself copyrightable. It is an independent work and is not derived from, endorsed by, or affiliated with the IEC or any PLC vendor.
