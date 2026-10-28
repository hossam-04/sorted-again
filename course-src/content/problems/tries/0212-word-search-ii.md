---
id: 212
module: tries
patterns: [trie, grid backtracking, pruning]
signature: "def findWords(self, board: List[List[str]], words: List[str]) -> List[str]"
compare: unordered
no_slow_wrong: the natural slower approach, a separate search for every word, is shown as a slow alternative
---

## Task

You get a grid of letters `board` and a list of distinct `words`. A word can be *traced* on the board by starting at any cell and moving to a horizontally or vertically adjacent cell for each next letter, never using the same cell twice within one word.

Return every word from `words` that can be traced on the board, each once, in any order.

## Constraints

- `1 <= rows, columns <= 12`
- `1 <= len(words) <= 15_000`, all different
- `1 <= len(word) <= 10`
- Only the letters `a` to `z`

```json examples
[
  {"args": [[["c", "a", "t"], ["x", "r", "s"], ["d", "o", "g"]], ["cat", "cart", "dog", "god", "dot", "cars"]], "out": ["cat", "dog", "god", "cars"], "why": "cars goes c → a → r → s. cart and dot can't be traced: the r and the o have no t next to them."},
  {"args": [[["a", "a"], ["a", "a"]], ["aaaaa", "aaaa"]], "out": ["aaaa"], "why": "Each cell can be used once per word, so four cells can't spell five letters."},
  {"args": [[["z"]], ["z", "zz"]], "out": ["z"], "why": "A one-cell board can only spell one-letter words."}
]
```

```json edge
[
  {"name": "no word fits", "args": [[["a", "b"], ["c", "d"]], ["e", "ad"]], "out": []},
  {"name": "longer than the board", "args": [[["a", "b"], ["c", "d"]], ["abdca"]], "out": []},
  {"name": "words sharing a prefix", "args": [[["o", "a", "k"], ["x", "t", "e"]], ["oat", "oak", "oath"]], "out": ["oat", "oak"]},
  {"name": "found twice on the board", "args": [[["b", "o", "b"]], ["bo", "ob"]], "out": ["bo", "ob"]},
  {"name": "needs backtracking", "args": [[["a", "b", "c"], ["a", "e", "d"], ["a", "f", "g"]], ["abcdefg", "aaa"]], "out": ["abcdefg", "aaa"]},
  {"name": "one row", "args": [[["s", "e", "e", "d"]], ["seed", "dees", "sede"]], "out": ["seed", "dees"]}
]
```

```python gen
def gen(rng, size):
    rows = rng.randint(1, 3) if size == "small" else rng.randint(3, 6)
    cols = rng.randint(1, 3) if size == "small" else rng.randint(3, 6)
    letters = "ab" if size == "small" else "abcd"
    board = [[rng.choice(letters) for _ in range(cols)] for _ in range(rows)]
    words = set()
    for _ in range(rng.randint(1, 5) if size == "small" else rng.randint(10, 60)):
        words.add("".join(rng.choice(letters) for _ in range(rng.randint(1, 5))))
    return [board, sorted(words)]
```

```python perf
# A 12 × 12 board that is mostly "a", and 10,000 words that all start with "aaaa". Every word's own
# search walks the same thousands of "a"-paths again; a trie walks them once for all words.
def perf(rng):
    cells = ["a"] * 120 + [rng.choice("bcdefghijk") for _ in range(24)]
    rng.shuffle(cells)
    board = [cells[r * 12 : (r + 1) * 12] for r in range(12)]
    words = set()
    while len(words) < 10_000:
        words.add("aaaa" + "".join(rng.choice("bcdefghijk") for _ in range(4)))
    return [board, sorted(words)]
```

## Hints

1. Searching for each word separately repeats a lot of work: words with the same beginning explore the same paths again and again.
2. Put all the words in a trie. Then one depth-first search from each cell can look for every word at once, following the board and the trie together.
3. Stop a path as soon as its letters aren't a prefix in the trie. When a path completes a word, record it and remove it from the trie, so it isn't reported twice and dead branches get pruned.

## Solution

```python solution time="m·n · 4·3^(L-1)" space="total letters"
class Solution:
    def findWords(self, board: List[List[str]], words: List[str]) -> List[str]:
        root = {}
        for w in words:  # a trie of nested dicts; "$" holds the word that ends at a node
            node = root
            for ch in w:
                node = node.setdefault(ch, {})
            node["$"] = w

        rows, cols = len(board), len(board[0])
        found = []

        def dfs(r, c, parent):
            ch = board[r][c]
            node = parent[ch]
            if "$" in node:
                found.append(node.pop("$"))  # report each word once
            board[r][c] = "#"  # mark the cell as used for this path
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < rows and 0 <= nc < cols and board[nr][nc] in node:
                    dfs(nr, nc, node)
            board[r][c] = ch  # unmark on the way back
            if not node:
                del parent[ch]  # nothing left to find below: prune the branch

        for r in range(rows):
            for c in range(cols):
                if board[r][c] in root:
                    dfs(r, c, root)
        return found
```

The trie turns "is this path still the beginning of some word?" into a single dict lookup, so a path stops as soon as no word can continue it, and words that share a prefix share the work of exploring it. Marking a cell with `#` during the path stops it from being reused, and restoring the letter on the way back is the backtracking step.

Two prunings keep the search small: a found word's marker is removed, so it's reported once; and a trie branch with nothing left below is deleted, so later searches don't even enter it. The worst case explores, from each of the m·n cells, up to 4·3^(L−1) paths of length L, but the trie cuts almost all of them short.

## Alternatives

### Search for each word separately

```python alt time="w · m·n · 3^L" space="L" slow oracle
class Solution:
    def findWords(self, board: List[List[str]], words: List[str]) -> List[str]:
        rows, cols = len(board), len(board[0])

        def trace(w, i, r, c):
            if board[r][c] != w[i]:
                return False
            if i == len(w) - 1:
                return True
            saved, board[r][c] = board[r][c], "#"
            ok = any(trace(w, i + 1, nr, nc) for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1))
                     if 0 <= nr < rows and 0 <= nc < cols)
            board[r][c] = saved
            return ok

        return [w for w in words if any(trace(w, 0, r, c) for r in range(rows) for c in range(cols))]
```

This is the single-word search ([[m:backtracking]] covers it in detail) run once per word. It's correct and easy to trust, but every word repeats the exploration of the board, including all the prefixes it shares with other words.

## Wrong answers

### Lets a path reuse a cell

```python wrong fails="example" test="Example 2"
class Solution:
    def findWords(self, board: List[List[str]], words: List[str]) -> List[str]:
        root = {}
        for w in words:
            node = root
            for ch in w:
                node = node.setdefault(ch, {})
            node["$"] = w
        rows, cols = len(board), len(board[0])
        found = set()

        def dfs(r, c, node):
            node = node.get(board[r][c])
            if node is None:
                return
            if "$" in node:
                found.add(node["$"])
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):  # may step back onto a cell already used
                if 0 <= nr < rows and 0 <= nc < cols:
                    dfs(nr, nc, node)

        for r in range(rows):
            for c in range(cols):
                dfs(r, c, root)
        return list(found)
```

Without marking cells as used, a path can bounce between two cells, so "aaaaa" fits on four cells of `a`. Mark the cell before exploring its neighbours and restore it afterwards.

### Reports a word every time it's found

```python wrong fails="example" test="Example 2"
class Solution:
    def findWords(self, board: List[List[str]], words: List[str]) -> List[str]:
        root = {}
        for w in words:
            node = root
            for ch in w:
                node = node.setdefault(ch, {})
            node["$"] = w
        rows, cols = len(board), len(board[0])
        found = []

        def dfs(r, c, node):
            ch = board[r][c]
            node = node.get(ch)
            if node is None:
                return
            if "$" in node:
                found.append(node["$"])  # the marker stays, so the word is reported again
            board[r][c] = "#"
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < rows and 0 <= nc < cols:
                    dfs(nr, nc, node)
            board[r][c] = ch

        for r in range(rows):
            for c in range(cols):
                dfs(r, c, root)
        return found
```

A word can often be traced in more than one way: in Example 2, "aaaa" can start from any of the four cells and go either way round. The answer lists each word once, so either remove the word's marker when it's found or collect results in a set.
