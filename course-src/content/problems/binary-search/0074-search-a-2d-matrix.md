---
id: 74
module: binary-search
patterns: [binary search, flat index]
signature: "def searchMatrix(self, matrix: List[List[int]], target: int) -> bool"
perf_repeat: 20000
---

## Task

You get a grid of integers `matrix` with `m` rows and `n` columns. Each row is sorted from smallest to largest, and the first value of every row is larger than the last value of the row above it. Read row by row, the whole grid is one sorted sequence.

Return `True` if `target` appears in the grid, and `False` otherwise. Aim for O(log(m·n)) time.

## Constraints

- `1 <= m, n <= 300`
- `-10**6 <= matrix[i][j], target <= 10**6`
- Rows are sorted, and each row starts above the previous row's last value

```json examples
[
  {"args": [[[2, 4, 7], [9, 12, 15], [20, 21, 30]], 12], "out": true, "why": "12 is in the middle row."},
  {"args": [[[2, 4, 7], [9, 12, 15], [20, 21, 30]], 16], "out": false, "why": "16 would sit between 15 and 20, but neither row has it."},
  {"args": [[[1], [4], [9]], 9], "out": true, "why": "A grid can have one column: read top to bottom, it's still sorted."}
]
```

```json edge
[
  {"name": "the first value", "args": [[[2, 4, 7], [9, 12, 15], [20, 21, 30]], 2], "out": true},
  {"name": "the last value", "args": [[[2, 4, 7], [9, 12, 15], [20, 21, 30]], 30], "out": true},
  {"name": "smaller than everything", "args": [[[2, 4, 7], [9, 12, 15], [20, 21, 30]], 1], "out": false},
  {"name": "larger than everything", "args": [[[2, 4, 7], [9, 12, 15], [20, 21, 30]], 31], "out": false},
  {"name": "between two rows", "args": [[[2, 4, 7], [9, 12, 15], [20, 21, 30]], 8], "out": false},
  {"name": "one row", "args": [[[1, 3, 5, 7]], 5], "out": true},
  {"name": "one cell, missing", "args": [[[6]], 5], "out": false},
  {"name": "negative values", "args": [[[-8, -5], [-2, 0]], -5], "out": true},
  {"name": "wider than tall", "args": [[[1, 2, 3], [4, 5, 6]], 5], "out": true}
]
```

```python gen
def gen(rng, size):
    m = rng.randint(1, 3) if size == "small" else rng.randint(2, 15)
    n = rng.randint(1, 3) if size == "small" else rng.randint(2, 15)
    values = sorted(rng.sample(range(-60, 61) if size == "small" else range(-10**6, 10**6), m * n))
    matrix = [values[r * n : (r + 1) * n] for r in range(m)]
    target = rng.choice(values) if rng.random() < 0.5 else rng.randint(values[0] - 2, values[-1] + 2)
    return [matrix, target]
```

```python perf
def perf(rng):
    # A 300 × 300 grid (90,000 values) searched 20,000 times for a value near the end.
    values = sorted(rng.sample(range(-10**6, 10**6), 90_000))
    matrix = [values[r * 300 : (r + 1) * 300] for r in range(300)]
    return [matrix, values[-5]]
```

## Hints

1. Read row by row, the grid is a single sorted list of m·n values. Binary search that list.
2. You don't need to build the list. Position `k` in it is row `k // n`, column `k % n`, where n is the number of columns.
3. Search positions 0 to m·n − 1 exactly as in an ordinary binary search, converting `mid` to a row and column each time.

## Solution

```python solution time="log(m·n)" space="1"
class Solution:
    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:
        m, n = len(matrix), len(matrix[0])
        lo, hi = 0, m * n - 1  # positions in the grid read row by row
        while lo <= hi:
            mid = (lo + hi) // 2
            value = matrix[mid // n][mid % n]  # n columns per row
            if value == target:
                return True
            if value < target:
                lo = mid + 1
            else:
                hi = mid - 1
        return False
```

Because each row starts after the previous one ends, reading the grid row by row gives one sorted sequence of m·n values. Position `k` of that sequence is in row `k // n` and column `k % n`: every row holds n values. With that conversion, an ordinary binary search over positions 0 to m·n − 1 works unchanged.

Each round halves the range, so the search takes O(log(m·n)) time and no extra space. Building the flat list first would cost O(m·n) and defeat the purpose.

## Alternatives

### Check every cell

```python alt time="m·n" space="1" slow oracle
class Solution:
    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:
        return any(target in row for row in matrix)
```

It's short and correct, and it would work on any grid. It ignores the order, though, so it scans up to m·n values per search.

### Find the row, then search inside it

```python alt time="log m + log n" space="m"
class Solution:
    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:
        firsts = [row[0] for row in matrix]
        r = bisect_right(firsts, target) - 1  # the last row starting at or below target
        if r < 0:
            return False
        c = bisect_left(matrix[r], target)
        return c < len(matrix[r]) and matrix[r][c] == target
```

Two binary searches: one over the first values of the rows, one inside the chosen row. Same O(log(m·n)) as the flat search, since log m + log n = log(m·n). This version builds a list of the first values (O(m) per call); a hand-written search over rows would avoid that.

## Wrong answers

### Picks the first row that starts above the target

```python wrong fails="example" test="Example 1"
class Solution:
    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:
        firsts = [row[0] for row in matrix]
        r = bisect_left(firsts, target)  # first row whose first value is >= target
        if r == len(matrix):
            return False
        c = bisect_left(matrix[r], target)
        return c < len(matrix[r]) and matrix[r][c] == target
```

The target belongs to the *last* row that starts at or below it, not the first row that starts at or above it. For 12, this picks the row starting with 20 instead of the row starting with 9. Off-by-one-row mistakes like this are why the flat-index search is easier to get right.

### Divides by the number of rows

```python wrong fails="example" test="Example 3" how="error"
class Solution:
    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:
        m, n = len(matrix), len(matrix[0])
        lo, hi = 0, m * n - 1
        while lo <= hi:
            mid = (lo + hi) // 2
            value = matrix[mid // m][mid % m]  # should divide by n, the row length
            if value == target:
                return True
            if value < target:
                lo = mid + 1
            else:
                hi = mid - 1
        return False
```

Converting a flat position needs the length of a row, which is the number of columns. On square grids m equals n and the bug hides; on a grid with 3 rows and 1 column it computes column indices up to 2 and runs off the end of a row.

### Flattens the grid for every search

```python wrong fails="perf"
class Solution:
    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:
        flat = [x for row in matrix for x in row]  # copies all m·n values each call
        i = bisect_left(flat, target)
        return i < len(flat) and flat[i] == target
```

The binary search is fine, but building the flat list costs O(m·n) every time. The performance test searches a 300 × 300 grid 20,000 times, which means copying 1.8 billion values. Convert positions on the fly instead.
