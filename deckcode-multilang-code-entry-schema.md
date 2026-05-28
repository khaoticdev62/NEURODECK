# DeckCode Multi-Language Code Entry Mapping Schema

**Version:** 1.0  
**Target:** Steam Deck coding profile  
**Purpose:** Add language-aware code entry to the DeckCode Steam Deck controller profile.

This schema sits on top of the coding controller profile. The controller still uses the same physical grammar:

| Input | Role |
|---|---|
| Right trackpad | Precision pointer, caret placement, UI clicking. |
| Left trackpad | 16-slot language command palette. |
| L4 | Ctrl/navigation layer. |
| L5 | Symbol and syntax entry layer. |
| R4 | Selection and multi-cursor layer. |
| R5 | Language-aware prediction and AI layer. |
| LT | Selection/scope axis. |
| RT | Accept/execute axis. |
| A/B/X/Y | Confirm, cancel, quick fix, search/symbol picker. |

The difference is that the left trackpad and symbol layer become **language-aware**. Pressing the same physical command can emit different syntax depending on whether the active file is Python, TypeScript, Rust, Go, SQL, Bash, Markdown, and so on.

---

## 1. Core Design Rule

Do not map the Steam Deck to raw characters only. Map it to **semantic code entries**.

Bad:

```text
L5 + B = {
```

Better:

```text
L5 + B = insert braces pair
current language decides formatting, cursor placement, indentation, and snippet behavior
```

This lets the same controller muscle memory work across many languages.

---

## 2. Universal Physical Grammar

### 2.1 Symbol Layer

| Binding | Semantic Action | Default Text |
|---|---|---|
| L5 + A | Insert parentheses pair | `()` |
| L5 + B | Insert braces pair | `{}` |
| L5 + X | Insert brackets pair | `[]` |
| L5 + Y | Insert quotes pair | `""` |
| L5 + R2 soft | Insert single quotes pair | `''` |
| L5 + R2 full | Insert template/backtick pair | `` ` ` `` |
| L5 + D-pad Left | Insert `<` | `<` |
| L5 + D-pad Right | Insert `>` | `>` |
| L5 + D-pad Up | Insert pipe / OR | `|` |
| L5 + D-pad Down | Insert backtick / escape syntax | `` ` `` |
| L5 + LB | Toggle comment | Language-specific |
| L5 + RB | Insert statement end | Language-specific |

### 2.2 Entry Commit Layer

| Binding | Action |
|---|---|
| RT soft | Accept completion or current snippet placeholder. |
| RT full | Commit current line, execute safe prediction, or open confirmation. |
| A | Confirm / enter. |
| B | Escape / cancel. |
| X | Quick fix or expand snippet. |
| Y | Symbol search, docs, or file search. |

---

## 3. Left Trackpad Language Palette

The left trackpad is a 16-slot language-aware command menu. Touch previews. Click executes. Hold pins open.

| Slot | Label | Semantic Entry |
|---:|---|---|
| 0 | Function | `entry.function` |
| 1 | Class/Type | `entry.type` |
| 2 | Condition | `entry.if_else` |
| 3 | Loop | `entry.loop` |
| 4 | Try/Catch | `entry.error_block` |
| 5 | Import | `entry.import` |
| 6 | Print/Log | `entry.log` |
| 7 | Return | `entry.return` |
| 8 | Test | `entry.test` |
| 9 | Doc | `entry.doc_comment` |
| 10 | Async | `entry.async` |
| 11 | Data | `entry.data_literal` |
| 12 | Interface | `entry.interface_or_protocol` |
| 13 | Module | `entry.module_package` |
| 14 | AI Fill | `ai.generate_from_context` |
| 15 | Lang Menu | `language.switch_or_settings` |

---

## 4. Language Detection

Priority order:

1. Editor language ID.
2. File extension.
3. Shebang.
4. Nearest project config.
5. Project files.
6. Manual override.

Manual override binding:

```text
Menu hold + Left Trackpad Slot 15
```

Fallback:

```text
plain_text
```

If language detection is uncertain, the profile uses universal safe actions only.

---

## 5. Language Packs

Each language pack must define:

```json
{
  "language_id": "python",
  "extensions": [".py"],
  "comment": "#",
  "statement_end": "",
  "symbol_overrides": {},
  "snippets": {
    "entry.function": {
      "template": "def ${name}(${params}):\n    ${cursor}"
    }
  },
  "prediction_rules": []
}
```

Every pack must support all 14 core semantic entries from the left trackpad language palette.

---

# 6. Included Language Pack Matrix

| Language | Extensions | Comment | Statement End |
|---|---|---|---|
| Python | `.py`, `.pyw` | `#` | none |
| JavaScript | `.js`, `.mjs`, `.cjs`, `.jsx` | `//` | `;` |
| TypeScript | `.ts`, `.tsx` | `//` | `;` |
| Go | `.go` | `//` | none |
| Rust | `.rs` | `//` | none |
| C# | `.cs` | `//` | `;` |
| Java | `.java` | `//` | `;` |
| C/C++ | `.cpp`, `.cc`, `.cxx`, `.hpp`, `.h` | `//` | `;` |
| HTML | `.html`, `.htm` | `<!-- -->` | none |
| CSS/SCSS | `.css`, `.scss`, `.sass` | `/* */` | none |
| SQL | `.sql` | `--` | `;` |
| Bash/Zsh | `.sh`, `.bash`, `.zsh` | `#` | none |
| JSON/YAML | `.json`, `.jsonc`, `.yaml`, `.yml` | contextual | none |
| PHP | `.php` | `//` | `;` |
| Ruby | `.rb` | `#` | none |
| Markdown/MDX | `.md`, `.mdx` | `<!-- -->` | none |

---

# 7. Example: Same Controller Action, Different Code

## Slot 0: Function

### Python

```python
def ${name}(${params}):
    ${cursor}
```

### TypeScript

```ts
function ${name}(${params}): ${ReturnType} {
  ${cursor}
}
```

### Go

```go
func ${name}(${params}) ${ReturnType} {
    ${cursor}
}
```

### Rust

```rust
fn ${name}(${params}) -> ${ReturnType} {
    ${cursor}
}
```

### Bash

```bash
${name}() {
  ${cursor}
}
```

---

## Slot 4: Error Block

### Python

```python
try:
    ${cursor}
except ${Exception} as e:
    print(e)
```

### JavaScript / TypeScript

```ts
try {
  ${cursor}
} catch (error) {
  console.error(error);
}
```

### Go

```go
if err != nil {
    return ${zero}, err
}
```

### Rust

```rust
match ${result} {
    Ok(value) => value,
    Err(err) => return Err(err),
}
```

### SQL

```sql
BEGIN;
${cursor}
ROLLBACK;
```

---

## Slot 8: Test

### Python

```python
def test_${behavior}():
    ${cursor}
```

### TypeScript

```ts
test("${behavior}", () => {
  ${cursor}
});
```

### Go

```go
func Test${Behavior}(t *testing.T) {
    ${cursor}
}
```

### Rust

```rust
#[test]
fn ${behavior}() {
    ${cursor}
}
```

### C#

```csharp
[Fact]
public void ${Behavior}()
{
    ${cursor}
}
```

---

# 8. Prediction Rules

Prediction should assist, not hijack. The user stays in control.

## Global Prediction Examples

| Context | Suggested Actions |
|---|---|
| Completion menu visible | Accept completion, next suggestion, show docs. |
| Cursor on diagnostic | Quick fix, explain error, AI fix. |
| Selection exists | Refactor, extract function, explain selection, generate tests. |
| Terminal prompt ready | History match, explain command, safe rerun. |
| Dirty Git tree + tests green | Stage, generate commit message, commit with review. |
| Test failed | Open failure, rerun nearest test, AI fix test. |

## Language-Specific Examples

| Language | Context | Prediction |
|---|---|---|
| Python | Cursor after `:` | Indent block, return, log. |
| Go | Previous token is `err` | Insert `if err != nil`. |
| Rust | Result-like expression | Insert `?`, match block, explain borrow error. |
| SQL | Current line starts with `SELECT` | Add WHERE, JOIN, ORDER BY. |
| Bash | Command contains `rm` or `sudo` | Require confirmation. |
| TypeScript | Missing import diagnostic | Add import, organize imports, AI fix. |

---

# 9. Safety Classes

| Safety Class | Can Execute Directly? | Examples |
|---|---:|---|
| Safe | Yes | Insert function, add import, accept completion. |
| Preview Required | No | AI patch, bulk replace, generated refactor. |
| Confirm Required | No | Delete file, discard Git changes, push, destructive shell command, DB mutation. |

Hard rule:

```text
RT soft never executes destructive actions.
RT full only executes safe actions directly.
Unsafe predictions open preview/confirmation.
```

---

# 10. Acceptance Tests

- Every language pack defines all 14 palette entries.
- Every non-system controller input remains mapped through the base DeckCode profile.
- Language override changes snippet output without changing physical muscle memory.
- Symbol insertion respects language comment style and statement endings.
- SQL, Bash, Git, and shell-destructive actions require confirmation.
- AI-generated code always opens preview before apply.
- Right trackpad remains available as precision pointer/caret control in every language mode.
- Left trackpad command hub can be pinned, previewed, canceled, and executed.
- No language pack can override Steam/QAM/power/volume.

---

# 11. Companion Files

- `deckcode-multilang-code-entry.profile.json` — full machine-readable multi-language profile.
- `deckcode-multilang-code-entry.schema.json` — validation schema for profile files.
