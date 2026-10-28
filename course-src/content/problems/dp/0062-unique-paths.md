---
id: 62
module: dp
patterns: [grid DP, paths from above and from the left]
signature: "def uniquePaths(self, m: int, n: int) -> int"
---

## Task

A robot stands in the top left cell of a grid with `m` rows and `n` columns. It can only move one cell down or one cell right at a time. Return the number of different paths to the bottom right cell.

## Constraints

- `1 <= m, n <= 100`
- The answer is at most `2 * 10**9`

```json examples
[
  {"args": [2, 3], "out": 3, "why": "Right-right-down, right-down-right and down-right-right."},
  {"args": [3, 3], "out": 6, "why": "Every path makes 2 moves down and 2 right, in any order: 6 orders."},
  {"args": [1, 5], "out": 1, "why": "A single row: the only path goes straight right."}
]
```

```json edge
[
  {"name": "a single column", "args": [5, 1], "out": 1},
  {"name": "a single cell", "args": [1, 1], "out": 1},
  {"name": "a 4 by 4 grid", "args": [4, 4], "out": 20},
  {"name": "a 10 by 10 grid", "args": [10, 10], "out": 48620}
]
```

```python oracle
class Solution:
    def uniquePaths(self, m: int, n: int) -> int:
        return math.comb(m + n - 2, m - 1)  # choose which of the moves go down
```

```python gen
def gen(rng, size):
    return [rng.randint(1, 4), rng.randint(1, 4)] if size == "small" else [rng.randint(4, 12), rng.randint(4, 12)]
```

```python perf
def perf(rng):
    # A 17 by 17 grid: 601,080,390 paths.
    return [17, 17]
```

## Hints

1. The robot reaches a cell from the cell above it or from the cell to its left, so the paths to a cell are the paths to those two added together.
2. Every cell in the top row or the left column has exactly one path.
3. Fill the grid row by row. Each row only needs the row above it, and even a single row can be updated in place, left to right.

## Solution

```python solution time="m·n" space="n"
class Solution:
    def uniquePaths(self, m: int, n: int) -> int:
        row = [1] * n  # paths to each cell of the top row
        for _ in range(1, m):
            for c in range(1, n):
                row[c] += row[c - 1]  # from above (the old row[c]) plus from the left (the new row[c - 1])
        return row[n - 1]
```

Paths to a cell end with a move down or a move right, and those two groups don't overlap, so paths(r, c) = paths(r − 1, c) + paths(r, c − 1). Updating one row in place works because, when `row[c]` is updated, it still holds the value from the row above, and `row[c − 1]` already holds the current row's value. O(m·n) time, O(n) space.

## Alternatives

### Count the orders directly

```python alt time="m + n" space="1"
class Solution:
    def uniquePaths(self, m: int, n: int) -> int:
        return comb(m + n - 2, m - 1)  # which of the m + n - 2 moves are the m - 1 downward ones
```

Every path is a sequence of m − 1 moves down and n − 1 moves right, in some order. Choosing positions for the downward moves among all m + n − 2 moves gives the count directly, as a binomial coefficient.

## Wrong answers

### Plain recursion

```python wrong fails="perf"
class Solution:
    def uniquePaths(self, m: int, n: int) -> int:
        if m == 1 or n == 1:
            return 1
        return self.uniquePaths(m - 1, n) + self.uniquePaths(m, n - 1)  # no memory of earlier cells
```

The recurrence is right, but the recursion visits each path separately: every path ends in its own call that returns 1, so a 17 by 17 grid, with 601 million paths, takes about 1.2 billion calls. Remembering each cell's count, or filling a table, makes it m·n steps.

### Counts the moves, not the cells

```python wrong fails="example" test="Example 1"
class Solution:
    def uniquePaths(self, m: int, n: int) -> int:
        return comb(m + n, m)  # as if there were m moves down and n moves right
```

From the top left corner to the bottom right there are only m − 1 moves down and n − 1 moves right: the robot starts in the first row and column. Counting m and n moves gives 10 paths for a 2 by 3 grid instead of 3.

### Leaves the first row at zero

```python wrong fails="example" test="Example 1"
class Solution:
    def uniquePaths(self, m: int, n: int) -> int:
        grid = [[0] * n for _ in range(m)]
        grid[0][0] = 1
        for r in range(1, m):
            for c in range(1, n):  # never fills row 0 or column 0
                grid[r][c] = grid[r - 1][c] + grid[r][c - 1]
        return grid[m - 1][n - 1]
```

Starting both loops at 1 skips the top row and the left column, which should all hold 1: there's exactly one way to reach each of them. Left at 0, they make every other count 0 too.
