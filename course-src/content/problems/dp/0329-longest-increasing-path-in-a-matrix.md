---
id: 329
module: dp
patterns: [DP over cells in sorted order, DFS with memo]
signature: "def longestIncreasingPath(self, matrix: List[List[int]]) -> int"
---

## Task

From any cell of `matrix` you may move up, down, left or right to a cell with a **strictly larger** value. Return the number of cells on the longest path you can make.

## Constraints

- `1 <= rows, columns <= 150`
- `0 <= matrix[r][c] <= 2**31 - 1`

```json examples
[
  {"args": [[[1, 2], [4, 3]]], "out": 4, "why": "1 → 2 → 3 → 4 goes right, down, then left."},
  {"args": [[[5, 5], [5, 5]]], "out": 1, "why": "Equal values don't count as larger, so no move is possible."},
  {"args": [[[3, 1], [4, 9]]], "out": 4, "why": "1 → 3 → 4 → 9 uses every cell."}
]
```

```json edge
[
  {"name": "a single cell", "args": [[[7]]], "out": 1},
  {"name": "one row", "args": [[[1, 2, 3, 4, 5]]], "out": 5},
  {"name": "a spiral", "args": [[[9, 8, 7], [4, 5, 6], [3, 2, 1]]], "out": 9},
  {"name": "ties along the way", "args": [[[1, 1, 2], [3, 2, 2]]], "out": 3}
]
```

```python oracle
class Solution:
    def longestIncreasingPath(self, matrix: List[List[int]]) -> int:
        rows, cols = len(matrix), len(matrix[0])
        best = 1
        stack = [((r, c), 1) for r in range(rows) for c in range(cols)]  # every path, extended one cell at a time
        while stack:
            (r, c), length = stack.pop()
            best = max(best, length)
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < rows and 0 <= nc < cols and matrix[nr][nc] > matrix[r][c]:
                    stack.append(((nr, nc), length + 1))
        return best
```

```python gen
def gen(rng, size):
    rows = rng.randint(1, 3) if size == "small" else rng.randint(3, 5)
    cols = rng.randint(1, 3) if size == "small" else rng.randint(3, 5)
    return [[[rng.randint(0, 9) for _ in range(cols)] for _ in range(rows)]]
```

```python perf
def perf(rng):
    # 150 × 150, numbered along a snake: the whole grid is one increasing path of 22,500 cells.
    n = 150
    return [[[r * n + (c if r % 2 == 0 else n - 1 - c) for c in range(n)] for r in range(n)]]
```

## Hints

1. Moves only go to larger values, so a path can never come back to a cell: there are no cycles, and the longest path *starting* at a cell is well defined.
2. The longest path starting at a cell is 1 plus the longest path starting at its best larger neighbour. Each cell's answer depends only on cells with larger values.
3. So compute the answers in decreasing order of value: sort the cells, largest first, and every neighbour you need is already done. (Or use a DFS with a cache.)

## Solution

```python solution time="m·n log(m·n)" space="m·n"
class Solution:
    def longestIncreasingPath(self, matrix: List[List[int]]) -> int:
        rows, cols = len(matrix), len(matrix[0])
        longest = [[1] * cols for _ in range(rows)]  # the longest path starting at each cell
        cells = sorted(((matrix[r][c], r, c) for r in range(rows) for c in range(cols)), reverse=True)
        for value, r, c in cells:  # largest first: every larger neighbour is already finished
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < rows and 0 <= nc < cols and matrix[nr][nc] > value:
                    longest[r][c] = max(longest[r][c], longest[nr][nc] + 1)
        return max(max(row) for row in longest)
```

Because moves only go uphill, the grid is a directed acyclic graph, and the longest path from a cell continues through one of its larger neighbours. Processing cells from the largest value down guarantees that every larger neighbour already has its final answer: sorting by value is a topological order. Sorting costs O(mn log(mn)), and the pass itself is O(mn). No recursion is needed, which matters when one path snakes through all 22,500 cells.

## Alternatives

### DFS with a cache

```python alt time="m·n" space="m·n"
class Solution:
    def longestIncreasingPath(self, matrix: List[List[int]]) -> int:
        rows, cols = len(matrix), len(matrix[0])

        @cache
        def longest(r, c):  # the longest path starting at (r, c)
            best = 1
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < rows and 0 <= nc < cols and matrix[nr][nc] > matrix[r][c]:
                    best = max(best, 1 + longest(nr, nc))
            return best

        return max(longest(r, c) for r in range(rows) for c in range(cols))
```

The classic answer: explore uphill with a depth-first search, and cache each cell's result so it's computed once. The recursion can be as deep as the longest path, 22,500 cells here: fine on this page, but it would need `sys.setrecursionlimit` in plain Python.

## Wrong answers

### Only moves right and down

```python wrong fails="example" test="Example 1"
class Solution:
    def longestIncreasingPath(self, matrix: List[List[int]]) -> int:
        rows, cols = len(matrix), len(matrix[0])
        longest = [[1] * cols for _ in range(rows)]
        for r in range(rows - 1, -1, -1):
            for c in range(cols - 1, -1, -1):
                for nr, nc in ((r + 1, c), (r, c + 1)):  # as in a grid-path problem
                    if nr < rows and nc < cols and matrix[nr][nc] > matrix[r][c]:
                        longest[r][c] = max(longest[r][c], longest[nr][nc] + 1)
        return max(max(row) for row in longest)
```

Limiting moves to right and down makes the table easy to fill in row order, but paths here can go in all four directions. In Example 1 the path 1 → 2 → 3 → 4 needs a step to the left at the end.

### Allows moves to equal values

```python wrong fails="example" test="Example 2"
class Solution:
    def longestIncreasingPath(self, matrix: List[List[int]]) -> int:
        rows, cols = len(matrix), len(matrix[0])
        longest = [[1] * cols for _ in range(rows)]
        cells = sorted(((matrix[r][c], r, c) for r in range(rows) for c in range(cols)), reverse=True)
        for value, r, c in cells:
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < rows and 0 <= nc < cols and matrix[nr][nc] >= value:  # equal counts too
                    longest[r][c] = max(longest[r][c], longest[nr][nc] + 1)
        return max(max(row) for row in longest)
```

The path must be strictly increasing, so a 5 can't follow a 5. Allowing equal steps makes paths that the task forbids, and with ties the order of the cells changes the result: the all-5 grid comes out longer than 1.

### Searches from every cell without remembering

```python wrong fails="perf"
class Solution:
    def longestIncreasingPath(self, matrix: List[List[int]]) -> int:
        rows, cols = len(matrix), len(matrix[0])

        def longest(r, c):  # recomputed for every path that passes through (r, c)
            best = 1
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < rows and 0 <= nc < cols and matrix[nr][nc] > matrix[r][c]:
                    best = max(best, 1 + longest(nr, nc))
            return best

        return max(longest(r, c) for r in range(rows) for c in range(cols))
```

Without a cache, the search from every cell walks its whole path again. In the test, the path from the k-th cell of the snake covers all the cells after it: about 250 million steps for the 22,500 starting cells. Each cell's answer is the same every time it's needed, so compute it once.
