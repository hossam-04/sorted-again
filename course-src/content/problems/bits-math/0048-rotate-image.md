---
id: 48
module: bits-math
patterns: [transpose then mirror, in-place]
signature: "def rotate(self, matrix: List[List[int]]) -> None"
adapter: in-place
inplace: 0
no_slow_wrong: every approach moves each cell a constant number of times, so there's no natural slower way
---

## Task

`matrix` is a square grid of numbers, n rows by n columns. Turn it a quarter turn clockwise, **in place**: change `matrix` itself instead of building a new grid. The function returns nothing; the test checks `matrix` afterwards.

After the turn, the top row holds what was the left column, read from the bottom up.

## Constraints

- `1 <= n <= 500`
- `-1000 <= matrix[i][j] <= 1000`

```json examples
[
  {"args": [[[1, 2], [3, 4]]], "out": [[3, 1], [4, 2]], "why": "The left column, read from the bottom up, is 3, 1, and it becomes the top row."},
  {"args": [[[1, 0, 0], [1, 0, 0], [1, 1, 1]]], "out": [[1, 1, 1], [1, 0, 0], [1, 0, 0]], "why": "The L made of 1s turns a quarter to the right."},
  {"args": [[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]], "out": [[13, 9, 5, 1], [14, 10, 6, 2], [15, 11, 7, 3], [16, 12, 8, 4]], "why": "Both the outer ring of 12 cells and the 2 × 2 block in the middle turn."}
]
```

```json edge
[
  {"name": "one cell", "args": [[[7]]], "out": [[7]]},
  {"name": "negative numbers", "args": [[[-1, -2], [-3, -4]]], "out": [[-3, -1], [-4, -2]]},
  {"name": "an odd size: the centre stays put", "args": [[[1, 2, 3, 4, 5], [6, 7, 8, 9, 10], [11, 12, 13, 14, 15], [16, 17, 18, 19, 20], [21, 22, 23, 24, 25]]], "out": [[21, 16, 11, 6, 1], [22, 17, 12, 7, 2], [23, 18, 13, 8, 3], [24, 19, 14, 9, 4], [25, 20, 15, 10, 5]]}
]
```

```python oracle
class Solution:
    def rotate(self, matrix: List[List[int]]) -> None:
        n = len(matrix)
        turned = [[matrix[n - 1 - j][i] for j in range(n)] for i in range(n)]  # row i is column i, bottom up
        for i in range(n):
            matrix[i][:] = turned[i]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 3) if size == "small" else rng.randint(4, 9)
    return [[[rng.randint(-9, 9) for _ in range(n)] for _ in range(n)]]
```

```python perf
def perf(rng):
    # A 500 × 500 grid.
    n = 500
    return [[[rng.randint(-1000, 1000) for _ in range(n)] for _ in range(n)]]
```

## Hints

1. Where does the cell in row i, column j end up? Follow a few cells of a 3 × 3 grid.
2. It ends up in row j, column n − 1 − i. Swapping rows with columns (the *transpose*) already moves it to row j, column i. What's left is a mirror image.
3. Transpose by swapping `matrix[i][j]` with `matrix[j][i]` for `j > i` only, then reverse every row.

## Solution

```python solution time="n²" space="1"
class Solution:
    def rotate(self, matrix: List[List[int]]) -> None:
        n = len(matrix)
        for i in range(n):
            for j in range(i + 1, n):  # above the diagonal only, so each pair swaps once
                matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
        for row in matrix:
            row.reverse()  # mirror left to right
```

A quarter turn clockwise sends row i, column j to row j, column n − 1 − i. That's two simpler moves in a row: the transpose swaps rows and columns, which takes the cell to row j, column i, and reversing each row then takes column i to column n − 1 − i. Both moves work in place: the transpose swaps pairs across the diagonal, and `reverse` swaps a row's ends towards the middle.

The inner loop starts at `i + 1`, so every pair is swapped exactly once; the diagonal stays where it is. Each cell moves twice: O(n²) time and O(1) extra space.

## Alternatives

### Build the turned grid, then copy it in

```python alt time="n²" space="n²"
class Solution:
    def rotate(self, matrix: List[List[int]]) -> None:
        matrix[:] = [list(row) for row in zip(*matrix[::-1])]  # replace the contents, not the name
```

`matrix[::-1]` puts the rows in reverse order, and `zip(*...)` reads them column by column, which gives exactly the turned rows. The slice assignment `matrix[:] =` replaces the contents of the caller's list, so the change is visible outside. It needs O(n²) extra memory for the new rows, which an interviewer asking for "in place" won't accept.

### Four cells at a time, ring by ring

```python alt time="n²" space="1"
class Solution:
    def rotate(self, matrix: List[List[int]]) -> None:
        n = len(matrix)
        for i in range(n // 2):  # ring i, from the outside in
            for j in range(i, n - 1 - i):
                top = matrix[i][j]
                matrix[i][j] = matrix[n - 1 - j][i]                  # left moves to top
                matrix[n - 1 - j][i] = matrix[n - 1 - i][n - 1 - j]  # bottom moves to left
                matrix[n - 1 - i][n - 1 - j] = matrix[j][n - 1 - i]  # right moves to bottom
                matrix[j][n - 1 - i] = top                           # top moves to right
```

A quarter turn moves cells in cycles of four: one on each side of a ring. Each cycle is rotated with a single temporary variable. Every cell moves only once, but the index arithmetic is easy to get wrong, which is why the transpose-and-mirror version is popular.

## Wrong answers

### Builds a new grid and rebinds the name

```python wrong fails="example" test="Example 1"
class Solution:
    def rotate(self, matrix: List[List[int]]) -> None:
        matrix = [list(row) for row in zip(*matrix[::-1])]  # a new list; the caller's grid is untouched
```

The turned grid is right, but `matrix = ...` only points the local name at a new list. The caller still holds the original grid, which hasn't changed at all. To change the caller's grid, modify it: assign to `matrix[:]` or to its cells.

### Transposes with a full double loop

```python wrong fails="example" test="Example 1"
class Solution:
    def rotate(self, matrix: List[List[int]]) -> None:
        n = len(matrix)
        for i in range(n):
            for j in range(n):  # each pair is visited twice: (i, j) and later (j, i)
                matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
        for row in matrix:
            row.reverse()
```

Visiting every (i, j) swaps each pair twice, once from each side of the diagonal, and the second swap undoes the first. The "transpose" leaves the grid unchanged, so only the mirror happens: `[[2, 1], [4, 3]]` for Example 1. Let the inner loop start at `i + 1`.

### Turns the wrong way

```python wrong fails="example" test="Example 1"
class Solution:
    def rotate(self, matrix: List[List[int]]) -> None:
        n = len(matrix)
        for i in range(n):
            for j in range(i + 1, n):
                matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
        matrix.reverse()  # reverses the order of the rows, a top-to-bottom mirror
```

After a transpose, mirroring top to bottom (reversing the order of the rows) turns the grid counterclockwise. A clockwise turn needs the left-to-right mirror: reverse each row. Checking one corner by hand catches this: after a clockwise turn, the top-left cell holds what was in the bottom-left.
