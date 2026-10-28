---
id: 79
module: backtracking
patterns: [grid backtracking, mark and unmark, pruning]
signature: "def exist(self, board: List[List[str]], word: str) -> bool"
---

## Task

You get a grid of letters, `board`, and a `word`. Return `True` if the word can be traced on the board: start at any cell and move to a horizontally or vertically adjacent cell for each next letter, using each cell at most once. Upper and lower case are different letters.

## Constraints

- `1 <= rows, columns <= 6`
- `1 <= len(word) <= 20`
- Only the letters `a` to `z` and `A` to `Z`

```json examples
[
  {"args": [[["c", "a", "t"], ["x", "r", "s"], ["d", "o", "g"]], "cars"], "out": true, "why": "c → a → r → s goes right, down, then right."},
  {"args": [[["c", "a", "t"], ["x", "r", "s"], ["d", "o", "g"]], "gods"], "out": false, "why": "g → o → d works, but the only cells next to that d are x and o: there's no s."},
  {"args": [[["a", "b"], ["c", "d"]], "abab"], "out": false, "why": "After a → b, the only a next to the b is the one already used, and a cell can't be used twice."}
]
```

```json edge
[
  {"name": "one cell", "args": [[["q"]], "q"], "out": true},
  {"name": "one cell, longer word", "args": [[["q"]], "qq"], "out": false},
  {"name": "longer than the board", "args": [[["a", "a"], ["a", "a"]], "aaaaa"], "out": false},
  {"name": "a dead end before the right path", "args": [[["a", "a", "c"], ["b", "x", "x"]], "aab"], "out": true},
  {"name": "upper and lower case differ", "args": [[["A", "b"]], "ab"], "out": false},
  {"name": "around the whole board", "args": [[["a", "b"], ["d", "c"]], "abcd"], "out": true}
]
```

```python oracle
class Solution:
    def exist(self, board: List[List[str]], word: str) -> bool:
        rows, cols = len(board), len(board[0])

        def trace(r, c, i, used):  # can word[i:] be traced starting at (r, c)?
            if not (0 <= r < rows and 0 <= c < cols) or (r, c) in used or board[r][c] != word[i]:
                return False
            if i == len(word) - 1:
                return True
            used = used | {(r, c)}
            return any(trace(r + dr, c + dc, i + 1, used) for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)))

        return any(trace(r, c, 0, frozenset()) for r in range(rows) for c in range(cols))
```

```python gen
def gen(rng, size):
    rows = rng.randint(1, 3) if size == "small" else rng.randint(2, 4)
    cols = rng.randint(1, 3) if size == "small" else rng.randint(2, 4)
    letters = "ab" if size == "small" else "abc"
    board = [[rng.choice(letters) for _ in range(cols)] for _ in range(rows)]
    if rng.random() < 0.5:  # often a word that really is on the board
        r, c = rng.randrange(rows), rng.randrange(cols)
        word, seen = board[r][c], {(r, c)}
        for _ in range(rng.randint(0, 5)):
            steps = [(r + dr, c + dc) for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1))
                     if 0 <= r + dr < rows and 0 <= c + dc < cols and (r + dr, c + dc) not in seen]
            if not steps:
                break
            r, c = rng.choice(steps)
            seen.add((r, c))
            word += board[r][c]
    else:
        word = "".join(rng.choice(letters) for _ in range(rng.randint(1, 6)))
    return [board, word]
```

```python perf
def perf(rng):
    # A 6 × 6 board of a's and a 20-letter word of a's that ends in b: every path of a's looks promising.
    return [[["a"] * 6 for _ in range(6)], "a" * 19 + "b"]
```

## Hints

1. Try every cell as a start. From a cell that matches the next letter, try its four neighbours for the letter after that: a depth-first search.
2. A cell may be used only once per path, so mark it while it's on the current path and unmark it when the search backs out of it. That's the backtracking.
3. Prune before searching: if the word needs more of some letter than the board has, the answer is `False` right away. And searching from the rarer end of the word (reversing it if needed) means fewer starting cells.

## Solution

```python solution time="m·n · 3^L" space="L"
class Solution:
    def exist(self, board: List[List[str]], word: str) -> bool:
        rows, cols = len(board), len(board[0])
        have = Counter(ch for row in board for ch in row)
        if any(have[ch] < k for ch, k in Counter(word).items()):
            return False  # some letter isn't on the board often enough
        if have[word[0]] > have[word[-1]]:
            word = word[::-1]  # start from the rarer end: fewer starting cells

        def dfs(r, c, i):  # can word[i:] be traced starting at (r, c)?
            if board[r][c] != word[i]:
                return False
            if i == len(word) - 1:
                return True
            board[r][c] = "#"  # mark: used on the current path
            found = False
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < rows and 0 <= nc < cols and dfs(nr, nc, i + 1):
                    found = True
                    break
            board[r][c] = word[i]  # unmark on the way back
            return found

        return any(dfs(r, c, 0) for r in range(rows) for c in range(cols))
```

The search walks the word letter by letter through the grid. Replacing a cell's letter with `#` while it's on the current path keeps the path from stepping on it again, and restoring the letter on the way back frees it for other paths: choose, explore, un-choose, with the grid itself holding the state.

From each start, every step has at most 3 new directions, so a word of length L costs up to O(m·n · 3^L) in the worst case. The two prunings at the top cost O(m·n + L) and remove the worst inputs: a board full of `a` with a word that ends in a missing letter would otherwise take about 120 million steps. Reading the word from either end gives the same answer, so starting from the rarer letter is free.

## Alternatives

### A set of visited cells

```python alt time="m·n · 3^L" space="L"
class Solution:
    def exist(self, board: List[List[str]], word: str) -> bool:
        rows, cols = len(board), len(board[0])
        have = Counter(ch for row in board for ch in row)
        if any(have[ch] < k for ch, k in Counter(word).items()):
            return False
        if have[word[0]] > have[word[-1]]:
            word = word[::-1]
        path = set()  # the cells on the current path

        def dfs(r, c, i):
            if i == len(word):
                return True
            if not (0 <= r < rows and 0 <= c < cols) or (r, c) in path or board[r][c] != word[i]:
                return False
            path.add((r, c))
            found = dfs(r + 1, c, i + 1) or dfs(r - 1, c, i + 1) or dfs(r, c + 1, i + 1) or dfs(r, c - 1, i + 1)
            path.remove((r, c))
            return found

        return any(dfs(r, c, 0) for r in range(rows) for c in range(cols))
```

Keeping the current path in a set leaves the board untouched, which is cleaner if the caller still needs it. It costs a little more per step than overwriting a cell.

## Wrong answers

### Lets a path reuse a cell

```python wrong fails="example" test="Example 3"
class Solution:
    def exist(self, board: List[List[str]], word: str) -> bool:
        rows, cols = len(board), len(board[0])

        def dfs(r, c, i):
            if board[r][c] != word[i]:
                return False
            if i == len(word) - 1:
                return True
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):  # may step back onto a used cell
                if 0 <= nr < rows and 0 <= nc < cols and dfs(nr, nc, i + 1):
                    return True
            return False

        return any(dfs(r, c, 0) for r in range(rows) for c in range(cols))
```

Without marking, a path can bounce between two cells: a → b → a → b spells "abab" on just two cells. Mark a cell before exploring its neighbours.

### Forgets to unmark

```python wrong fails="edge" test="a dead end before the right path"
class Solution:
    def exist(self, board: List[List[str]], word: str) -> bool:
        rows, cols = len(board), len(board[0])

        def dfs(r, c, i):
            if board[r][c] != word[i]:
                return False
            if i == len(word) - 1:
                return True
            board[r][c] = "#"  # marked, and never restored
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < rows and 0 <= nc < cols and dfs(nr, nc, i + 1):
                    return True
            return False

        return any(dfs(r, c, 0) for r in range(rows) for c in range(cols))
```

A failed path leaves its cells marked, so later paths can't use them. For "aab", the search from the first a tries the second a, finds no b next to it, and leaves both a's marked; the path that starts from the second a can then never begin. Restore the letter when backing out.

### Searches without pruning

```python wrong fails="perf"
class Solution:
    def exist(self, board: List[List[str]], word: str) -> bool:
        rows, cols = len(board), len(board[0])

        def dfs(r, c, i):
            if board[r][c] != word[i]:
                return False
            if i == len(word) - 1:
                return True
            board[r][c] = "#"
            found = False
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < rows and 0 <= nc < cols and dfs(nr, nc, i + 1):
                    found = True
                    break
            board[r][c] = word[i]
            return found

        return any(dfs(r, c, 0) for r in range(rows) for c in range(cols))
```

This search is correct, and fast on most boards. But on a board full of `a`, every path of a's matches the word until the very last letter, and with a 20-letter word the search makes about 120 million calls before giving up. Checking the letter counts first answers `False` immediately, since the board has no `b`.
