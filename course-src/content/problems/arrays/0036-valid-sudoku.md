---
id: 36
module: arrays
patterns: [hash set per unit, box index]
signature: "def isValidSudoku(self, board: List[List[str]]) -> bool"
perf_repeat: 2000
no_slow_wrong: the board is always 9 × 9, so every approach does a constant amount of work
---

## Task

You get a 9 × 9 Sudoku grid `board` as a list of 9 rows. Each cell is a string: a digit from `"1"` to `"9"`, or `"."` for an empty cell.

Return `True` if the filled cells break none of Sudoku's rules: no digit appears twice in the same row, in the same column, or in the same 3 × 3 box (the nine boxes that tile the grid). Otherwise return `False`.

Only check the digits that are there. You don't need to decide whether the puzzle can be completed.

## Constraints

- `board` has 9 rows of 9 cells
- Every cell is `"1"` to `"9"` or `"."`

```json examples
[
  {"args": [[[".", ".", ".", ".", ".", ".", ".", ".", "4"], ["4", "6", "5", "3", "7", ".", ".", ".", "."], [".", ".", "2", ".", ".", ".", ".", ".", "3"], [".", ".", "4", ".", ".", ".", "5", "9", "."], [".", "5", ".", "8", ".", ".", ".", ".", "."], [".", "2", ".", "6", "9", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", "4", ".", "."], [".", ".", ".", ".", "6", ".", ".", ".", "."], [".", ".", ".", ".", ".", "3", ".", "1", "."]]], "out": true, "why": "No digit repeats in any row, column or 3 × 3 box. The empty cells don't matter."},
  {"args": [[["2", ".", ".", ".", ".", ".", ".", ".", "4"], ["4", "6", "5", "3", "7", ".", ".", ".", "."], [".", ".", "2", ".", ".", ".", ".", ".", "3"], [".", ".", "4", ".", ".", ".", "5", "9", "."], [".", "5", ".", "8", ".", ".", ".", ".", "."], [".", "2", ".", "6", "9", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", "4", ".", "."], [".", ".", ".", ".", "6", ".", ".", ".", "."], [".", ".", ".", ".", ".", "3", ".", "1", "."]]], "out": false, "why": "The 2 at row 0, column 0 (counting from 0) repeats a 2 in the same 3 × 3 box, though its row and column are fine."},
  {"args": [[[".", ".", ".", "6", ".", ".", ".", ".", "4"], ["4", "6", "5", "3", "7", ".", ".", ".", "."], [".", ".", "2", ".", ".", ".", ".", ".", "3"], [".", ".", "4", ".", ".", ".", "5", "9", "."], [".", "5", ".", "8", ".", ".", ".", ".", "."], [".", "2", ".", "6", "9", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", "4", ".", "."], [".", ".", ".", ".", "6", ".", ".", ".", "."], [".", ".", ".", ".", ".", "3", ".", "1", "."]]], "out": false, "why": "The 6 at row 0, column 3 repeats a 6 further along column 3."}
]
```

```json edge
[
  {"name": "empty board", "args": [[[".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."]]], "out": true},
  {"name": "a single digit", "args": [[[".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", "7", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."]]], "out": true},
  {"name": "duplicate in a row", "args": [[[".", ".", ".", "4", ".", ".", ".", ".", "4"], ["4", "6", "5", "3", "7", ".", ".", ".", "."], [".", ".", "2", ".", ".", ".", ".", ".", "3"], [".", ".", "4", ".", ".", ".", "5", "9", "."], [".", "5", ".", "8", ".", ".", ".", ".", "."], [".", "2", ".", "6", "9", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", "4", ".", "."], [".", ".", ".", ".", "6", ".", ".", ".", "."], [".", ".", ".", ".", ".", "3", ".", "1", "."]]], "out": false},
  {"name": "duplicate in the middle box", "args": [[["7", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", "2", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", "2", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."]]], "out": false},
  {"name": "duplicate in the bottom-right box", "args": [[[".", ".", ".", ".", ".", ".", ".", ".", "."], [".", "3", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", "5", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", "5", "."]]], "out": false},
  {"name": "same digit spread across boxes", "args": [[["5", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", "9", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", "5", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", "9", "."], [".", ".", "9", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "5"]]], "out": true},
  {"name": "one digit in the top-middle and middle-left boxes", "args": [[[".", ".", ".", ".", "4", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], ["4", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "."], [".", ".", ".", ".", ".", ".", ".", ".", "9"]]], "out": true},
  {"name": "a full valid board", "args": [[["6", "7", "2", "1", "8", "5", "9", "3", "4"], ["8", "1", "5", "3", "9", "4", "6", "7", "2"], ["9", "3", "4", "7", "6", "2", "8", "1", "5"], ["2", "8", "7", "9", "5", "1", "4", "6", "3"], ["5", "9", "1", "6", "4", "3", "2", "8", "7"], ["4", "6", "3", "8", "2", "7", "5", "9", "1"], ["7", "5", "8", "4", "1", "9", "3", "2", "6"], ["3", "2", "6", "5", "7", "8", "1", "4", "9"], ["1", "4", "9", "2", "3", "6", "7", "5", "8"]]], "out": true}
]
```

```python gen
def gen(rng, size):
    base = [[(3 * (r % 3) + r // 3 + c) % 9 + 1 for c in range(9)] for r in range(9)]
    digits = rng.sample(range(1, 10), 9)
    bands, stacks = rng.sample(range(3), 3), rng.sample(range(3), 3)
    rows = [b * 3 + r for b in bands for r in rng.sample(range(3), 3)]
    cols = [s * 3 + c for s in stacks for c in rng.sample(range(3), 3)]
    full = [[str(digits[base[r][c] - 1]) for c in cols] for r in rows]
    keep = rng.randint(3, 25) if size == "small" else rng.randint(25, 81)
    board = [["."] * 9 for _ in range(9)]
    for k in rng.sample(range(81), keep):
        board[k // 9][k % 9] = full[k // 9][k % 9]
    if rng.random() < 0.5:  # change one cell; often that breaks a rule
        k = rng.randrange(81)
        board[k // 9][k % 9] = str(rng.randint(1, 9))
    return [board]
```

```python perf
def perf(rng):
    # A completely filled valid board: every rule has to be checked for every cell. It is run 2,000 times.
    base = [[(3 * (r % 3) + r // 3 + c) % 9 + 1 for c in range(9)] for r in range(9)]
    digits = rng.sample(range(1, 10), 9)
    return [[[str(digits[v - 1]) for v in row] for row in base]]
```

## Hints

1. A digit breaks a rule when it has already been seen in the same row, the same column or the same box.
2. Keep one set of seen digits for each row, each column and each box: 27 sets in all.
3. The box of cell `(r, c)` can be numbered `(r // 3) * 3 + c // 3`, which gives 0 to 8.

## Solution

```python solution time="1" space="1"
class Solution:
    def isValidSudoku(self, board: List[List[str]]) -> bool:
        rows = [set() for _ in range(9)]
        cols = [set() for _ in range(9)]
        boxes = [set() for _ in range(9)]
        for r in range(9):
            for c in range(9):
                v = board[r][c]
                if v == ".":
                    continue
                b = (r // 3) * 3 + c // 3
                if v in rows[r] or v in cols[c] or v in boxes[b]:
                    return False
                rows[r].add(v)
                cols[c].add(v)
                boxes[b].add(v)
        return True
```

Every filled cell belongs to exactly one row, one column and one box. Walking the grid once and recording each digit in the three sets it belongs to means a repeat is caught the moment the second copy appears.

The only subtle part is the box number. `r // 3` says which band of three rows the cell is in and `c // 3` which stack of three columns. `(r // 3) * 3 + c // 3` combines them into a unique number from 0 to 8, the same way you'd number seats by row and column.

The board is always 9 × 9, so the work is constant: O(1) time and space. For an n × n Sudoku the same code is O(n²).

## Alternatives

### Check each row, column and box on its own

```python alt time="1" space="1" oracle
class Solution:
    def isValidSudoku(self, board: List[List[str]]) -> bool:
        def ok(cells):
            digits = [v for v in cells if v != "."]
            return len(digits) == len(set(digits))

        rows = board
        cols = [[board[r][c] for r in range(9)] for c in range(9)]
        boxes = [[board[r][c] for r in range(br, br + 3) for c in range(bc, bc + 3)]
                 for br in (0, 3, 6) for bc in (0, 3, 6)]
        return all(ok(unit) for unit in rows + cols + boxes)
```

Build all 27 units as lists, then check that no unit repeats a digit. It reads cleanly and is easy to convince yourself of, at the cost of a second pass and some temporary lists.

## Wrong answers

### Forgets the boxes

```python wrong fails="example" test="Example 2"
class Solution:
    def isValidSudoku(self, board: List[List[str]]) -> bool:
        for i in range(9):
            row = [v for v in board[i] if v != "."]
            col = [board[r][i] for r in range(9) if board[r][i] != "."]
            if len(row) != len(set(row)) or len(col) != len(set(col)):
                return False
        return True  # never looks at the 3 × 3 boxes
```

Rows and columns are only two of the three rules. A digit can repeat inside a box while sitting in different rows and columns, as in Example 2.

### Numbers the boxes by adding

```python wrong fails="edge" test="one digit in the top-middle and middle-left boxes"
class Solution:
    def isValidSudoku(self, board: List[List[str]]) -> bool:
        seen = set()
        for r in range(9):
            for c in range(9):
                v = board[r][c]
                if v == ".":
                    continue
                b = r // 3 + c // 3  # boxes (0, 1) and (1, 0) both get number 1
                for key in (("row", r, v), ("col", c, v), ("box", b, v)):
                    if key in seen:
                        return False
                    seen.add(key)
        return True
```

`r // 3 + c // 3` gives only 5 different numbers for 9 boxes, so different boxes share a number. A 4 in the top-middle box and a 4 in the middle-left box then look like a repeat. Multiply one part by 3 to keep the numbers apart.

### Treats empty cells as a digit

```python wrong fails="example" test="Example 1"
class Solution:
    def isValidSudoku(self, board: List[List[str]]) -> bool:
        seen = set()
        for r in range(9):
            for c in range(9):
                v = board[r][c]  # "." is checked like any digit
                b = (r // 3) * 3 + c // 3
                for key in (("row", r, v), ("col", c, v), ("box", b, v)):
                    if key in seen:
                        return False
                    seen.add(key)
        return True
```

Two empty cells in one row look like a repeated `"."`, so almost every real puzzle is rejected. Skip the dots first.
