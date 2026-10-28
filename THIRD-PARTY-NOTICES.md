# Third-party notices

Sorted Again is built on the work below. Each keeps its own license.

## Bundled into `dsa-course.html`

**Pyodide 314.0.7**, CPython compiled to WebAssembly, so the page runs Python with no server.
- License: [Mozilla Public License 2.0](https://github.com/pyodide/pyodide/blob/main/LICENSE). Source: https://github.com/pyodide/pyodide
- The page embeds `pyodide.js`, `pyodide.asm.mjs`, `pyodide.asm.wasm` and `python_stdlib.zip` from the `pyodide` npm package. `course-src/tools/pyodide-embed.mjs` applies two small patches to the loader and the module glue so they run from a single file. That script is the source of the modified files, and the patched files remain under MPL-2.0.
- Pyodide contains **CPython**, under the [Python Software Foundation License Version 2](https://docs.python.org/3/license.html), Copyright (c) 2001 Python Software Foundation; All Rights Reserved. It is compiled with **Emscripten**, whose runtime is under the [MIT License](https://github.com/emscripten-core/emscripten/blob/main/LICENSE).

**CodeMirror 5.65.18** stylesheet (`lib/codemirror.css`).
- License: [MIT](https://github.com/codemirror/codemirror5/blob/master/LICENSE), Copyright (C) 2017 by Marijn Haverbeke and others.

## Loaded by the page at run time

- **CodeMirror 5.65.18** scripts, from cdnjs.cloudflare.com. [MIT](https://github.com/codemirror/codemirror5/blob/master/LICENSE).
- **IBM Plex Sans, IBM Plex Sans Condensed and IBM Plex Mono** fonts, from Google Fonts. [SIL Open Font License 1.1](https://github.com/IBM/plex/blob/master/LICENSE.txt).

## Used only to build and test (not shipped)

- **marked** ([MIT](https://github.com/markedjs/marked/blob/master/LICENSE.md)), Markdown to HTML.
- **yaml** ([ISC](https://github.com/eemeli/yaml/blob/main/LICENSE)), problem front matter.
- **playwright-core** ([Apache-2.0](https://github.com/microsoft/playwright/blob/main/LICENSE)), end-to-end tests.

## LeetCode

Problems link to LeetCode for reference. The problem descriptions, examples and tests in this course are original and are not LeetCode's. LeetCode data fetched by `course-src/tools/leetcode.mjs` to check the reference solutions stays in the gitignored `course-src/cache/` and is not published. LeetCode is a trademark of its owner, which is not affiliated with this project.
