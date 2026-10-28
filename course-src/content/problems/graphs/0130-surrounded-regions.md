---
id: 130
module: graphs
patterns: [search from the border, mark what's safe, in-place]
signature: "def solve(self, board: List[List[str]]) -> None"
adapter: in-place
inplace: 0
---

## Task

A board holds `"X"` and `"O"` cells. A region is a group of `"O"` cells connected horizontally or vertically. A region is *captured* when none of its cells is on the edge of the board: then all its cells become `"X"`. Regions that reach the edge stay as they are.

Change `board` in place so that every captured region is filled with `"X"`. The function returns nothing; the test checks the board afterwards.

## Constraints

- `1 <= rows, columns <= 500`
- Every cell is `"X"` or `"O"`

```json examples
[
  {"args": [[["X", "X", "X", "X"], ["X", "O", "O", "X"], ["X", "X", "X", "X"]]], "out": [["X", "X", "X", "X"], ["X", "X", "X", "X"], ["X", "X", "X", "X"]], "why": "The two O cells are enclosed by X on all sides, so they're captured."},
  {"args": [[["X", "O", "X"], ["X", "O", "X"], ["X", "X", "X"]]], "out": [["X", "O", "X"], ["X", "O", "X"], ["X", "X", "X"]], "why": "The middle O connects to the O on the top edge, so their region reaches the border and survives."},
  {"args": [[["X", "X", "X", "X", "X"], ["X", "O", "X", "O", "X"], ["X", "X", "O", "X", "X"], ["X", "X", "X", "X", "X"]]], "out": [["X", "X", "X", "X", "X"], ["X", "X", "X", "X", "X"], ["X", "X", "X", "X", "X"], ["X", "X", "X", "X", "X"]], "why": "Three single-cell regions that touch only at corners. None reaches the edge, so all three are captured."}
]
```

```json edge
[
  {"name": "a single O", "args": [[["O"]]], "out": [["O"]]},
  {"name": "one O in the middle", "args": [[["X", "X", "X"], ["X", "O", "X"], ["X", "X", "X"]]], "out": [["X", "X", "X"], ["X", "X", "X"], ["X", "X", "X"]]},
  {"name": "a ring of O around an X", "args": [[["O", "O", "O"], ["O", "X", "O"], ["O", "O", "O"]]], "out": [["O", "O", "O"], ["O", "X", "O"], ["O", "O", "O"]]},
  {"name": "a winding path to the edge", "args": [[["X", "X", "X", "X"], ["X", "O", "O", "X"], ["X", "O", "X", "X"], ["X", "O", "X", "X"]]], "out": [["X", "X", "X", "X"], ["X", "O", "O", "X"], ["X", "O", "X", "X"], ["X", "O", "X", "X"]]},
  {"name": "an enclosed ring", "args": [[["X", "X", "X", "X", "X", "X"], ["X", "O", "O", "O", "O", "X"], ["X", "O", "X", "X", "O", "X"], ["X", "O", "O", "O", "O", "X"], ["X", "X", "X", "X", "X", "X"]]], "out": [["X", "X", "X", "X", "X", "X"], ["X", "X", "X", "X", "X", "X"], ["X", "X", "X", "X", "X", "X"], ["X", "X", "X", "X", "X", "X"], ["X", "X", "X", "X", "X", "X"]]}
]
```

```python oracle
class Solution:
    def solve(self, board: List[List[str]]) -> None:
        rows, cols = len(board), len(board[0])
        seen = set()
        for r in range(rows):
            for c in range(cols):
                if board[r][c] != "O" or (r, c) in seen:
                    continue
                region, stack, edge = [], [(r, c)], False  # collect one whole region
                seen.add((r, c))
                while stack:
                    i, j = stack.pop()
                    region.append((i, j))
                    edge |= i in (0, rows - 1) or j in (0, cols - 1)
                    for ni, nj in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                        if 0 <= ni < rows and 0 <= nj < cols and board[ni][nj] == "O" and (ni, nj) not in seen:
                            seen.add((ni, nj))
                            stack.append((ni, nj))
                if not edge:
                    for i, j in region:
                        board[i][j] = "X"
```

```python gen
def gen(rng, size):
    rows = rng.randint(1, 4) if size == "small" else rng.randint(4, 12)
    cols = rng.randint(1, 4) if size == "small" else rng.randint(4, 12)
    o = rng.choice([0.3, 0.5, 0.7])
    return [[["O" if rng.random() < o else "X" for _ in range(cols)] for _ in range(rows)]]
```

```python perf
def perf(rng):
    # 500 × 500: a border of X around one huge region of O, with a few X scattered inside.
    n = 500
    board = [["X" if r in (0, n - 1) or c in (0, n - 1) or rng.random() < 0.05 else "O" for c in range(n)] for r in range(n)]
    return [board]
```

## Hints

1. A region survives exactly when it touches the edge. Finding the survivors is easier than finding the captured regions.
2. Start a search from every `"O"` on the edge and mark every `"O"` it reaches as safe, for example by changing it to a temporary letter such as `"S"`.
3. Then sweep the board once: any `"O"` left unmarked is captured and becomes `"X"`, and every `"S"` turns back into `"O"`.

## Solution

```python solution time="m·n" space="m·n"
class Solution:
    def solve(self, board: List[List[str]]) -> None:
        rows, cols = len(board), len(board[0])
        queue = deque()
        for r in range(rows):
            for c in range(cols):
                if (r in (0, rows - 1) or c in (0, cols - 1)) and board[r][c] == "O":
                    board[r][c] = "S"  # safe: on the edge
                    queue.append((r, c))
        while queue:  # everything connected to an edge O is safe too
            r, c = queue.popleft()
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < rows and 0 <= nc < cols and board[nr][nc] == "O":
                    board[nr][nc] = "S"
                    queue.append((nr, nc))
        for r in range(rows):
            for c in range(cols):
                if board[r][c] == "O":
                    board[r][c] = "X"  # never reached from the edge: captured
                elif board[r][c] == "S":
                    board[r][c] = "O"
```

Instead of checking each region for an edge cell, the search starts from the edge: every `"O"` reachable from an edge `"O"` belongs to a surviving region, and nothing else does. A temporary mark, `"S"`, records that without any extra memory, and a final sweep captures the rest and restores the marks.

Every cell is queued at most once, so the time is O(m·n). The queue can hold O(m·n) cells.

## Alternatives

### Collect each region, then decide

```python alt time="m·n" space="m·n"
class Solution:
    def solve(self, board: List[List[str]]) -> None:
        rows, cols = len(board), len(board[0])
        seen = set()
        for r in range(rows):
            for c in range(cols):
                if board[r][c] != "O" or (r, c) in seen:
                    continue
                region, queue, edge = [], deque([(r, c)]), False
                seen.add((r, c))
                while queue:
                    i, j = queue.popleft()
                    region.append((i, j))
                    edge |= i in (0, rows - 1) or j in (0, cols - 1)
                    for ni, nj in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                        if 0 <= ni < rows and 0 <= nj < cols and board[ni][nj] == "O" and (ni, nj) not in seen:
                            seen.add((ni, nj))
                            queue.append((ni, nj))
                if not edge:  # the whole region is enclosed: capture it
                    for i, j in region:
                        board[i][j] = "X"
```

Searching each region once, remembering whether any of its cells is on the edge, is just as fast: the shared `seen` set keeps every cell in a single search. It's more code, but it's the direct way to say what the task asks.

## Wrong answers

### Spares only the edge cells themselves

```python wrong fails="example" test="Example 2"
class Solution:
    def solve(self, board: List[List[str]]) -> None:
        rows, cols = len(board), len(board[0])
        for r in range(1, rows - 1):
            for c in range(1, cols - 1):
                if board[r][c] == "O":
                    board[r][c] = "X"  # every inner O, even one connected to the edge
```

Being off the edge isn't enough to be captured: an inner `"O"` survives when its region reaches the edge through other `"O"` cells. In Example 2, the middle `"O"` is connected to one on the top edge, so it must stay.

### Searches from every O to look for the edge

```python wrong fails="perf"
class Solution:
    def solve(self, board: List[List[str]]) -> None:
        rows, cols = len(board), len(board[0])
        captured = []
        for r in range(rows):
            for c in range(cols):
                if board[r][c] != "O":
                    continue
                seen, queue, edge = {(r, c)}, deque([(r, c)]), False  # a new search for every O
                while queue and not edge:
                    i, j = queue.popleft()
                    edge = i in (0, rows - 1) or j in (0, cols - 1)
                    for ni, nj in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                        if 0 <= ni < rows and 0 <= nj < cols and board[ni][nj] == "O" and (ni, nj) not in seen:
                            seen.add((ni, nj))
                            queue.append((ni, nj))
                if not edge:
                    captured.append((r, c))
        for r, c in captured:
            board[r][c] = "X"
```

Checking each `"O"` on its own gives the right board, but every cell repeats the search of its region. Deep inside a region of 200,000 cells, each search has to cover a large part of it before reaching the edge. Searching from the edge once, or once per region, makes each cell part of a single search.
