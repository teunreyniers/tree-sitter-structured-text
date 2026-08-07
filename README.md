# tree-sitter-structured-text

A [tree-sitter](https://tree-sitter.github.io/tree-sitter/) grammar for **IEC 61131-3 Structured Text (ST)**, the textual PLC programming language used by CODESYS, TwinCAT, Siemens SCL and other automation toolchains.

Recognised file extensions: `.st`, `.iec`, `.scl`

## Features

**Program organization units**

- `FUNCTION_BLOCK` / `END_FUNCTION_BLOCK`, with `EXTENDS` and `IMPLEMENTS`
- `FUNCTION` / `END_FUNCTION`, with optional return type
- `PROGRAM` / `END_PROGRAM`
- `CLASS` / `END_CLASS` and `INTERFACE` / `END_INTERFACE`
- `TEST_FUNCTION_BLOCK` / `END_TEST_FUNCTION_BLOCK`, as used by ST unit-test frameworks
- `TYPE` / `END_TYPE` holding one or more definitions: `STRUCT`, enumerations, aliases, subranges and array types, each with optional initial values

**Object orientation**

- `METHOD` / `END_METHOD`, `PROPERTY` with `GET` / `SET`, and `ACTION` / `END_ACTION`, written inside their POU or exported one per file
- Access specifiers `PUBLIC`, `PRIVATE`, `PROTECTED`, `INTERNAL`, `FINAL`, `ABSTRACT`
- `THIS^` and `SUPER^`, including `SUPER^()` to call the base implementation

**Variable sections**

`VAR`, `VAR_INPUT`, `VAR_OUTPUT`, `VAR_IN_OUT`, `VAR_TEMP`, `VAR_STATIC`, `VAR_GLOBAL`, `VAR_EXTERNAL`, `VAR_INST` — each terminated by `END_VAR`, with optional initial values. A `VAR_GLOBAL` list may stand alone as a whole file.

Any section may carry the qualifiers `CONSTANT`, `RETAIN`, `NON_RETAIN` and `PERSISTENT`, alone or combined (`VAR RETAIN PERSISTENT`).

Declarations may be located with `AT %IX0.0`, and initialised with an array initialiser `[1, 2, 3]` (including the `10(0)` repetition form) or a structure initialiser `(x := 1, y := 2)`.

**Types**

- Simple and namespaced type names (`CmpApp.EVTPARAM_CmpApp`)
- Multi-dimensional `ARRAY [1..10, 0..3] OF <type>`, including nested arrays, identifier bounds and arithmetic bounds such as `[0..MAX_DEVICES - 1]`
- Sized `STRING[80]` / `WSTRING(80)` and subranges `INT (0..100)`
- `POINTER TO` and `REFERENCE TO`

**Configuration**

`CONFIGURATION` / `END_CONFIGURATION`, `RESOURCE … ON … END_RESOURCE`, `TASK` with its parameter list, and `PROGRAM … WITH … : …` instance declarations.

**Statements**

- Assignment (`:=`) and reference assignment (`REF=`), including qualified targets such as `motor.speed`
- The `;` after a compound statement is optional, so `END_IF` may close a statement on its own; simple statements still require it
- Every statement body may be empty, so half-written code such as `IF c THEN END_IF` still parses
- `IF` / `ELSIF` / `ELSE` / `END_IF`
- `CASE` / `OF` / `ELSE` / `END_CASE`, with single labels, comma-separated labels and `1..5` ranges. Labels may be integers, negative integers, enumerators (`Color.Red`), booleans or typed literals
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
- Namespaced and method calls, `FPU.IsRealNumber(x)` and `fb.Run(x := 1)`
- Array subscripting `buffer[i]`, as an assignment target or an operand, including `m[i, j]`, `m[i][j]` and member access after a subscript (`items[i].value`)
- Dereferencing `p^`, including `p^^`, `p^.field` and `items[i]^`
- Single-bit access `input.0`, as an assignment target or an operand
- Direct hardware addresses `%IX0.0`, `%MW100`, `%I*`, as an assignment target or an operand
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

- Keywords in any mix of cases: `IF`, `if` and `If` are all the same word
- Line comments `// ...` and block comments `(* ... *)`, in any position including immediately before `END_VAR`
- Pragmas / attributes `{ ... }` before variable declarations, struct fields, and whole declarations
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

The grammar covers IEC 61131-3 Structured Text as written by CODESYS, TwinCAT and similar toolchains. Not supported:

- Sequential Function Chart bodies (`STEP`, `TRANSITION`) — a different POU body language rather than an ST extension
- `VAR_ACCESS` declarations
- Ladder, Function Block Diagram and Instruction List

Three parsing caveats worth knowing:

- A POU must be terminated. Some exporters emit a declaration-only file that ends after the last `END_VAR` with no `END_FUNCTION_BLOCK`; that is treated as malformed, because making the terminator optional is ambiguous when several POUs share a file.
- A keyword wins only where it is actually expected, so `SET` or `TASK` may be used as a variable name outside a property or a resource. The section qualifiers are the exception: a variable named exactly `CONSTANT`, `RETAIN`, `NON_RETAIN` or `PERSISTENT` does not parse, because that is where the qualifier belongs. Names that merely start with a keyword, such as `retain_count` or `Supervisor`, are always fine.
- A function result cannot be subscripted directly (`f(a)[1]`), matching what vendors accept.

Contributions closing any of these gaps are welcome — add corpus tests alongside the grammar change.

## License

[MIT](LICENSE) © Teun Reyniers

This grammar describes the *syntax* of IEC 61131-3 Structured Text, which is not itself copyrightable. It is an independent work and is not derived from, endorsed by, or affiliated with the IEC or any PLC vendor.
