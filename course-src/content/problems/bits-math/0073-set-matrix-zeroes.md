---
id: 73
module: bits-math
patterns: [first row and column as markers, in-place]
signature: "def setZeroes(self, matrix: List[List[int]]) -> None"
adapter: in-place
inplace: 0
---

## Task

Wherever `matrix` holds a 0, set that cell's whole row and whole column to 0. Only the zeros that were there at the start count: a cell that becomes 0 along the way doesn't spread any further.

Change `matrix` in place; the function returns nothing, and the test checks `matrix` afterwards. Aim for O(1) extra memory: no copy of the grid, and no lists or sets of the rows and columns to clear.

## Constraints

- `1 <= m, n <= 500` for a grid of m rows and n columns
- `-2**31 <= matrix[i][j] <= 2**31 - 1`

```json examples
[
  {"args": [[[5, 1, 7], [2, 0, 6]]], "out": [[5, 0, 7], [0, 0, 0]], "why": "The 0 in row 1, column 1 clears that row and that column. Everything else stays."},
  {"args": [[[1, 2, 3], [4, 0, 6], [7, 8, 0]]], "out": [[1, 0, 0], [0, 0, 0], [0, 0, 0]], "why": "Two zeros clear rows 1 and 2 and columns 1 and 2. Only the top-left cell survives."},
  {"args": [[[3, 8], [9, 1]]], "out": [[3, 8], [9, 1]], "why": "No zeros, so nothing changes."}
]
```

```json edge
[
  {"name": "a zero in the top-left corner", "args": [[[0, 2, 3], [4, 5, 6], [7, 8, 9]]], "out": [[0, 0, 0], [0, 5, 6], [0, 8, 9]]},
  {"name": "a zero in the first row, not the first column", "args": [[[7, 0, 9], [1, 2, 3], [4, 5, 6]]], "out": [[0, 0, 0], [1, 0, 3], [4, 0, 6]]},
  {"name": "a zero in the first column, not the first row", "args": [[[1, 2], [0, 4], [5, 6]]], "out": [[0, 2], [0, 0], [0, 6]]},
  {"name": "one cell", "args": [[[0]]], "out": [[0]]},
  {"name": "one row", "args": [[[1, 0, 2, 0, 3]]], "out": [[0, 0, 0, 0, 0]]},
  {"name": "one column", "args": [[[4], [0], [5]]], "out": [[0], [0], [0]]},
  {"name": "a zero in the bottom-right corner", "args": [[[1, 2, 3], [4, 5, 6], [7, 8, 0]]], "out": [[1, 2, 0], [4, 5, 0], [0, 0, 0]]},
  {"name": "extreme values", "args": [[[-2147483648, 2147483647], [0, 5]]], "out": [[0, 2147483647], [0, 0]]}
]
```

```python gen
def gen(rng, size):
    m = rng.randint(1, 3) if size == "small" else rng.randint(2, 7)
    n = rng.randint(1, 3) if size == "small" else rng.randint(2, 7)
    p = rng.choice([0.1, 0.2, 0.4])
    return [[[0 if rng.random() < p else (rng.randint(-5, 5) or 1) for _ in range(n)] for _ in range(m)]]
```

```python perf
def perf(rng):
    # 500 × 500, with half of the cells 0.
    n = 500
    return [[[0 if rng.random() < 0.5 else rng.randint(1, 9) for _ in range(n)] for _ in range(n)]]
```

## Hints

1. Clearing as you scan doesn't work: a cell you've just set to 0 looks exactly like an original zero, and it would clear its own row and column too. First record what to clear, then clear it.
2. A set of rows and a set of columns take O(m + n) memory. To get down to O(1), keep those marks inside the grid: in its first row and first column.
3. The first row and column are themselves a row and a column that may need clearing, and the corner `matrix[0][0]` can't mark both of them. Remember separately whether column 0 had a zero, and clear the first row and column last, after the rest of the grid has read its marks.

## Solution

```python solution time="m·n" space="1"
class Solution:
    def setZeroes(self, matrix: List[List[int]]) -> None:
        rows, cols = len(matrix), len(matrix[0])
        first_col_zero = any(matrix[r][0] == 0 for r in range(rows))  # column 0 gets its own flag
        for r in range(rows):
            for c in range(1, cols):
                if matrix[r][c] == 0:
                    matrix[r][0] = 0  # mark row r
                    matrix[0][c] = 0  # mark column c
        for r in range(1, rows):  # clear everything outside the first row and column
            for c in range(1, cols):
                if matrix[r][0] == 0 or matrix[0][c] == 0:
                    matrix[r][c] = 0
        if matrix[0][0] == 0:  # the corner marks the first row
            for c in range(cols):
                matrix[0][c] = 0
        if first_col_zero:  # and the flag marks the first column
            for r in range(rows):
                matrix[r][0] = 0
```

The first row and column serve as the "to clear" lists: a 0 at (r, c) is recorded by zeroing the first cell of row r and the first cell of column c. Writing a 0 there never loses information, because those cells are in a row and a column that will be cleared anyway.

Two details make it work. The corner `matrix[0][0]` sits in both the first row and the first column, so it can only mark one of them: here it marks the first row, and a separate flag remembers whether the first column held a 0. And the marks must be read before they're overwritten, so the inner cells are cleared first, then the first row, and the first column last. Three passes over the grid: O(m·n) time, O(1) extra space.

## Alternatives

### Sets of rows and columns

```python alt time="m·n" space="m + n" oracle
class Solution:
    def setZeroes(self, matrix: List[List[int]]) -> None:
        zero_rows, zero_cols = set(), set()
        for r, row in enumerate(matrix):
            for c, x in enumerate(row):
                if x == 0:
                    zero_rows.add(r)
                    zero_cols.add(c)
        for r, row in enumerate(matrix):
            for c in range(len(row)):
                if r in zero_rows or c in zero_cols:
                    row[c] = 0
```

Record the rows and columns that contain a zero, then clear them in a second pass. This is the clearest version and the one to start with in an interview; the O(1) version above stores the same two sets inside the grid.

## Wrong answers

### Clears as it scans

```python wrong fails="example" test="Example 1"
class Solution:
    def setZeroes(self, matrix: List[List[int]]) -> None:
        rows, cols = len(matrix), len(matrix[0])
        for r in range(rows):
            for c in range(cols):
                if matrix[r][c] == 0:  # can't tell an original 0 from one set a moment ago
                    for k in range(cols):
                        matrix[r][k] = 0
                    for k in range(rows):
                        matrix[k][c] = 0
```

After the 0 in Example 1 clears row 1, the scan reaches the cell to its right, which is now 0, and treats it as an original zero: it clears column 2 as well, wiping out the 7. Zeros keep spreading. Find all the original zeros first, then clear.

### Clears the first row before reading the marks

```python wrong fails="edge" test="a zero in the top-left corner"
class Solution:
    def setZeroes(self, matrix: List[List[int]]) -> None:
        rows, cols = len(matrix), len(matrix[0])
        first_col_zero = any(matrix[r][0] == 0 for r in range(rows))
        for r in range(rows):
            for c in range(1, cols):
                if matrix[r][c] == 0:
                    matrix[r][0] = 0
                    matrix[0][c] = 0
        if matrix[0][0] == 0:  # too early: the first row still holds the column marks
            for c in range(cols):
                matrix[0][c] = 0
        if first_col_zero:
            for r in range(rows):
                matrix[r][0] = 0
        for r in range(1, rows):
            for c in range(1, cols):
                if matrix[r][0] == 0 or matrix[0][c] == 0:
                    matrix[r][c] = 0
```

The first row holds the marks for the columns. Clearing it before the rest of the grid has been processed turns every column mark on, so every column gets cleared. With a 0 in the top-left corner, the whole grid becomes 0, though only the first row and column should. Clear the inner cells first and the first row and column last.

### Lets the corner mark both the first row and the first column

```python wrong fails="edge" test="a zero in the first row, not the first column"
class Solution:
    def setZeroes(self, matrix: List[List[int]]) -> None:
        rows, cols = len(matrix), len(matrix[0])
        for r in range(rows):
            for c in range(cols):
                if matrix[r][c] == 0:
                    matrix[r][0] = 0
                    matrix[0][c] = 0
        for r in range(1, rows):
            for c in range(1, cols):
                if matrix[r][0] == 0 or matrix[0][c] == 0:
                    matrix[r][c] = 0
        if matrix[0][0] == 0:  # can't tell whether the first row or the first column had the 0
            for c in range(cols):
                matrix[0][c] = 0
            for r in range(rows):
                matrix[r][0] = 0
```

A 0 anywhere in the first row sets the corner, and so does a 0 anywhere in the first column, so afterwards the corner can't say which one it was. Here the 0 in the first row also clears the first column, which had no zero. Keep a separate flag for one of the two.

### Marks cells with a placeholder, one row and column at a time

```python wrong fails="perf"
class Solution:
    def setZeroes(self, matrix: List[List[int]]) -> None:
        rows, cols = len(matrix), len(matrix[0])
        for r in range(rows):
            for c in range(cols):
                if matrix[r][c] == 0:  # an original zero
                    for k in range(cols):
                        if matrix[r][k] != 0:
                            matrix[r][k] = None  # "will be 0", without looking like an original zero
                    for k in range(rows):
                        if matrix[k][c] != 0:
                            matrix[k][c] = None
        for r in range(rows):
            for c in range(cols):
                if matrix[r][c] is None:
                    matrix[r][c] = 0
```

A placeholder that isn't 0 fixes the spreading problem, so this is correct. But every original zero walks its whole row and column, O(m + n) work per zero. With 125,000 zeros in a 500 × 500 grid, that's over 100 million steps, where marking each row and column once needs only a few passes over the grid.
