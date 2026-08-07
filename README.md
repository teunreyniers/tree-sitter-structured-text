# tree-sitter-structured-text

A [tree-sitter](https://tree-sitter.github.io/tree-sitter/) grammar for **IEC 61131-3 Structured Text (ST)**, the textual PLC programming language used by CODESYS, TwinCAT, Siemens SCL and other automation toolchains.

Recognised file extensions: `.st`, `.iec`, `.scl`

## Features

**Program organization units**

- `FUNCTION_BLOCK` / `END_FUNCTION_BLOCK`
- `FUNCTION` / `END_FUNCTION`, with optional return type
- `PROGRAM` / `END_PROGRAM`
- `TYPE` / `END_TYPE` with `STRUCT` definitions

**Variable sections**

`VAR`, `VAR CONSTANT`, `VAR_INPUT`, `VAR_OUTPUT`, `VAR_IN_OUT`, `VAR_TEMP`, `VAR_STATIC`, `VAR_GLOBAL`, `VAR_EXTERNAL` — each terminated by `END_VAR`, with optional initial values.

**Types**

- Simple type names
- Multi-dimensional `ARRAY [1..10, 0..3] OF <type>`, including nested arrays and identifier bounds

**Statements**

- Assignment (`:=`), including qualified targets such as `motor.speed`
- `IF` / `ELSIF` / `ELSE` / `END_IF`
- `CASE` / `OF` / `ELSE` / `END_CASE`, with single labels, comma-separated labels and `1..5` ranges
- `RETURN`, with an optional value
- Function block invocation with positional, named (`in := x`) and output (`out => y`, `NOT out => y`) parameters

**Expressions**

- Arithmetic `+ - * / MOD **` with IEC precedence (`**` right-associative)
- Comparison `< <= > >=` and equality `= <>`
- Boolean `AND`, `OR`, `XOR`, `NOT`, and unary `-`
- Parenthesized expressions, function calls, qualified identifiers
- Type conversions matching `<TYPE>_TO_<TYPE>` (e.g. `INT_TO_REAL(x)`)

**Literals**

- Integers, including based literals `2#1010`, `8#777`, `16#FF` and `_` digit separators
- Floats with exponents
- `TRUE` / `FALSE` (also `true`/`false` and `True`/`False`)
- Duration literals `T#1d2h3m4s500ms`, down to millisecond resolution

**Other**

- Line comments `// ...` and block comments `(* ... *)`
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

- Loops: `FOR`, `WHILE`, `REPEAT`, `EXIT`, `CONTINUE`
- String literals in expressions (the `string_literal` rule exists but is not yet reachable) and `STRING` / `WSTRING` handling
- Array subscripting in expressions, e.g. `buffer[i] := 0;`
- OOP extensions: `CLASS`, `INTERFACE`, `METHOD`, `PROPERTY`, `EXTENDS`, `IMPLEMENTS`
- `ACTION`, `CONFIGURATION`, `RESOURCE`, `TASK`, `VAR_ACCESS`
- Direct hardware addressing such as `%IX0.0` and `AT` declarations
- Typed literals (`INT#16`, `REAL#1.0`) and `DATE` / `TIME_OF_DAY` / `DATE_AND_TIME` literals
- Enumerations and subrange type definitions (only `STRUCT` is parsed under `TYPE`)

Two parsing caveats worth knowing:

- Keywords are case-insensitive only in their all-lowercase and all-uppercase forms. `IF` and `if` parse; `If` does not.
- `MOD` is recognised in uppercase only.

Contributions closing any of these gaps are welcome — add corpus tests alongside the grammar change.

## License

[MIT](LICENSE) © Teun Reyniers

This grammar describes the *syntax* of IEC 61131-3 Structured Text, which is not itself copyrightable. It is an independent work and is not derived from, endorsed by, or affiliated with the IEC or any PLC vendor.
