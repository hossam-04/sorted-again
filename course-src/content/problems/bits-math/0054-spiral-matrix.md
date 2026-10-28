---
id: 54
module: bits-math
patterns: [shrinking boundaries, simulation]
signature: "def spiralOrder(self, matrix: List[List[int]]) -> List[int]"
---

## Task

Return every number of `matrix`, a grid of m rows and n columns, in spiral order. Start at the top-left corner, go right along the top row, down the right column, left along the bottom row and up the left column, then keep going inwards in the same way until every cell has been visited exactly once.

## Constraints

- `1 <= m, n <= 700`
- `-100 <= matrix[i][j] <= 100`

```json examples
[
  {"args": [[[1, 2, 3], [4, 5, 6]]], "out": [1, 2, 3, 6, 5, 4], "why": "Right along the top row, down to 6 (the only cell left in the right column), then left along the bottom row."},
  {"args": [[[1, 2], [3, 4], [5, 6], [7, 8]]], "out": [1, 2, 4, 6, 8, 7, 5, 3], "why": "A tall, narrow grid: the outer ring holds every cell, so one lap is the whole spiral."},
  {"args": [[[2, 4, 6], [8, 10, 12], [14, 16, 18]]], "out": [2, 4, 6, 12, 18, 16, 14, 8, 10], "why": "One lap around the outside, then the centre cell comes last."}
]
```

```json edge
[
  {"name": "a single row", "args": [[[5, -1, 3]]], "out": [5, -1, 3]},
  {"name": "a single column", "args": [[[5], [-1], [3]]], "out": [5, -1, 3]},
  {"name": "one cell", "args": [[[9]]], "out": [9]},
  {"name": "two rings", "args": [[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]], "out": [1, 2, 3, 4, 8, 12, 16, 15, 14, 13, 9, 5, 6, 7, 11, 10]},
  {"name": "a middle row is left over", "args": [[[1, 2, 3, 4, 5], [6, 7, 8, 9, 10], [11, 12, 13, 14, 15]]], "out": [1, 2, 3, 4, 5, 10, 15, 14, 13, 12, 11, 6, 7, 8, 9]},
  {"name": "a middle column is left over", "args": [[[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12], [13, 14, 15]]], "out": [1, 2, 3, 6, 9, 12, 15, 14, 13, 10, 7, 4, 5, 8, 11]}
]
```

```python gen
def gen(rng, size):
    m = rng.randint(1, 3) if size == "small" else rng.randint(2, 8)
    n = rng.randint(1, 3) if size == "small" else rng.randint(2, 8)
    return [[[rng.randint(-9, 9) for _ in range(n)] for _ in range(m)]]
```

```python perf
def perf(rng):
    # A 700 × 700 grid.
    return [[[rng.randint(-100, 100) for _ in range(700)] for _ in range(700)]]
```

## Hints

1. Keep four boundaries: the top and bottom rows and the left and right columns that haven't been used up yet.
2. Each lap goes along the top row, then moves the top boundary down; down the right column, then moves the right boundary in; and the same for the bottom row and the left column.
3. The area left can run out in the middle of a lap. If only a single row or column remained, check before walking back along the bottom row or up the left column, or you'll visit its cells twice.

## Solution

```python solution time="m·n" space="1"
class Solution:
    def spiralOrder(self, matrix: List[List[int]]) -> List[int]:
        out = []
        top, bottom = 0, len(matrix) - 1
        left, right = 0, len(matrix[0]) - 1
        while top <= bottom and left <= right:
            for c in range(left, right + 1):  # along the top row
                out.append(matrix[top][c])
            top += 1
            for r in range(top, bottom + 1):  # down the right column
                out.append(matrix[r][right])
            right -= 1
            if top <= bottom:  # is there still a bottom row?
                for c in range(right, left - 1, -1):
                    out.append(matrix[bottom][c])
                bottom -= 1
            if left <= right:  # is there still a left column?
                for r in range(bottom, top - 1, -1):
                    out.append(matrix[r][left])
                left += 1
        return out
```

The unvisited cells always form a rectangle, described by four boundaries. Walking one side of it uses up that side, so the matching boundary moves inwards by one, and the next side starts where the last one ended.

The two `if` checks matter when the rectangle is a single row or column. After the top row is walked, a one-row rectangle is empty, and walking "back along the bottom row" would visit the same cells again. Checking the boundaries before the third and fourth sides prevents that. Every cell is visited once: O(m·n) time, and O(1) space apart from the output.

## Alternatives

### Walk, and turn right at walls

```python alt time="m·n" space="m·n" oracle
class Solution:
    def spiralOrder(self, matrix: List[List[int]]) -> List[int]:
        rows, cols = len(matrix), len(matrix[0])
        seen = [[False] * cols for _ in range(rows)]
        moves = [(0, 1), (1, 0), (0, -1), (-1, 0)]  # right, down, left, up
        out, r, c, d = [], 0, 0, 0
        for _ in range(rows * cols):
            out.append(matrix[r][c])
            seen[r][c] = True
            nr, nc = r + moves[d][0], c + moves[d][1]
            if not (0 <= nr < rows and 0 <= nc < cols) or seen[nr][nc]:
                d = (d + 1) % 4  # a wall or a visited cell: turn right
                nr, nc = r + moves[d][0], c + moves[d][1]
            r, c = nr, nc
        return out
```

Simulate someone walking the spiral: keep going in the same direction, and turn right when the next cell is outside the grid or already visited. There's no case analysis for thin grids, at the cost of an m × n grid of visited marks.

## Wrong answers

### Walks back without checking

```python wrong fails="edge" test="a single row"
class Solution:
    def spiralOrder(self, matrix: List[List[int]]) -> List[int]:
        out = []
        top, bottom = 0, len(matrix) - 1
        left, right = 0, len(matrix[0]) - 1
        while top <= bottom and left <= right:
            for c in range(left, right + 1):
                out.append(matrix[top][c])
            top += 1
            for r in range(top, bottom + 1):
                out.append(matrix[r][right])
            right -= 1
            for c in range(right, left - 1, -1):  # even if no bottom row is left
                out.append(matrix[bottom][c])
            bottom -= 1
            for r in range(bottom, top - 1, -1):  # even if no left column is left
                out.append(matrix[r][left])
            left += 1
        return out
```

All three examples come out right, which makes this bug easy to miss. With a single row, `[5, -1, 3]`, the top row uses up every cell, but the loop still walks "back along the bottom row", which is the same row, and adds −1 and 5 again. Check `top <= bottom` and `left <= right` before the third and fourth sides.

### Peels the top row and turns the rest

```python wrong fails="perf"
class Solution:
    def spiralOrder(self, matrix: List[List[int]]) -> List[int]:
        out = []
        while matrix:
            out += matrix.pop(0)  # take the top row
            matrix = [list(row) for row in zip(*matrix)][::-1]  # turn the rest a quarter counterclockwise
        return out
```

A famous one-liner: take the top row, turn what's left so that its right column becomes the new top row, and repeat. It's correct, but every turn copies the whole remaining grid. A 700 × 700 grid takes about 1,400 turns of up to 490,000 cells each, hundreds of millions of copies, while the spiral itself visits each cell once.
