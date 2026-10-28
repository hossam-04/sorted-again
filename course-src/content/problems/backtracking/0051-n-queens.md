---
id: 51
module: backtracking
patterns: [backtracking, constraint sets, pruning]
signature: "def solveNQueens(self, n: int) -> List[List[str]]"
compare: unordered
---

## Task

Place `n` chess queens on an `n × n` board so that no two of them attack each other. A queen attacks every square in its row, its column and both of its diagonals.

Return every solution, in any order. Write each solution as a list of `n` strings, one per row from top to bottom, where `"Q"` is a queen and `"."` an empty square.

## Constraints

- `1 <= n <= 10`

```json examples
[
  {"args": [5], "out": [["Q....", "..Q..", "....Q", ".Q...", "...Q."], ["Q....", "...Q.", ".Q...", "....Q", "..Q.."], [".Q...", "...Q.", "Q....", "..Q..", "....Q"], [".Q...", "....Q", "..Q..", "Q....", "...Q."], ["..Q..", "Q....", "...Q.", ".Q...", "....Q"], ["..Q..", "....Q", ".Q...", "...Q.", "Q...."], ["...Q.", "Q....", "..Q..", "....Q", ".Q..."], ["...Q.", ".Q...", "....Q", "..Q..", "Q...."], ["....Q", ".Q...", "...Q.", "Q....", "..Q.."], ["....Q", "..Q..", "Q....", "...Q.", ".Q..."]], "why": "Five queens fit in 10 ways. Every solution has exactly one queen per row and per column, since two in a row or column would attack each other."},
  {"args": [3], "out": [], "why": "On a 3 × 3 board three queens can't avoid each other: once two are placed in different rows and columns, every square left in the third row is attacked."},
  {"args": [6], "out": [[".Q....", "...Q..", ".....Q", "Q.....", "..Q...", "....Q."], ["..Q...", ".....Q", ".Q....", "....Q.", "Q.....", "...Q.."], ["...Q..", "Q.....", "....Q.", ".Q....", ".....Q", "..Q..."], ["....Q.", "..Q...", "Q.....", ".....Q", "...Q..", ".Q...."]], "why": "Six queens fit in only 4 ways, fewer than five queens do. Each solution's mirror image is also a solution."}
]
```

```json edge
[
  {"name": "a single square", "args": [1], "out": [["Q"]]},
  {"name": "too small", "args": [2], "out": []},
  {"name": "the smallest board with two solutions", "args": [4], "out": [[".Q..", "...Q", "Q...", "..Q."], ["..Q.", "Q...", "...Q", ".Q.."]]}
]
```

```python oracle
class Solution:
    def solveNQueens(self, n: int) -> List[List[str]]:
        out = []
        for cols in permutations(range(n)):  # one queen per row and column
            if all(abs(cols[i] - cols[j]) != j - i for i in range(n) for j in range(i + 1, n)):
                out.append(["." * c + "Q" + "." * (n - c - 1) for c in cols])
        return out
```

```python gen
def gen(rng, size):
    return [rng.randint(1, 5) if size == "small" else rng.randint(5, 8)]
```

```python perf
def perf(rng):
    # A 10 × 10 board: 724 solutions.
    return [10]
```

## Hints

1. Two queens in the same row attack each other, so every solution has exactly one queen per row. Place them row by row.
2. For each row, try every column, and skip the squares already attacked by queens in earlier rows. When a row has no safe square left, back up.
3. Checking a square quickly: on one diagonal, `row − column` is the same for every square; on the other, `row + column` is. Keep three sets, of used columns, used `row − column` values and used `row + column` values.

## Solution

```python solution time="n!" space="n"
class Solution:
    def solveNQueens(self, n: int) -> List[List[str]]:
        out = []
        queens = []  # queens[r] = the column of the queen in row r
        cols, diag, anti = set(), set(), set()  # attacked columns and diagonals

        def place(r):
            if r == n:
                out.append(["." * c + "Q" + "." * (n - c - 1) for c in queens])
                return
            for c in range(n):
                if c in cols or r - c in diag or r + c in anti:
                    continue  # attacked: prune this branch
                queens.append(c)
                cols.add(c)
                diag.add(r - c)
                anti.add(r + c)
                place(r + 1)
                queens.pop()
                cols.remove(c)
                diag.remove(r - c)
                anti.remove(r + c)

        place(0)
        return out
```

Placing one queen per row removes row conflicts by construction. The three sets answer "is this square attacked?" in O(1): a column, a top-left-to-bottom-right diagonal (constant `r − c`) or a top-right-to-bottom-left one (constant `r + c`). Each placement adds to all three sets and each removal undoes all three: choose, explore, un-choose.

The first row has n choices, the second at most n − 1 safe columns, and so on, so the search is bounded by O(n!), and the attack checks prune far below that: a 10 × 10 board needs about 35,000 placements to find all 724 solutions.

## Alternatives

### Check against each earlier queen

```python alt time="n · n!" space="n"
class Solution:
    def solveNQueens(self, n: int) -> List[List[str]]:
        out, queens = [], []

        def safe(r, c):
            for qr, qc in enumerate(queens):
                if qc == c or abs(qc - c) == r - qr:  # same column, or same diagonal
                    return False
            return True

        def place(r):
            if r == n:
                out.append(["." * c + "Q" + "." * (n - c - 1) for c in queens])
                return
            for c in range(n):
                if safe(r, c):
                    queens.append(c)
                    place(r + 1)
                    queens.pop()

        place(0)
        return out
```

Without the sets, each square is checked against every queen already placed: same column, or a diagonal, where the column distance equals the row distance. It's simpler to write and only a factor of n slower per check.

## Wrong answers

### Checks only one diagonal direction

```python wrong fails="example" test="Example 1"
class Solution:
    def solveNQueens(self, n: int) -> List[List[str]]:
        out, queens = [], []
        cols, diag = set(), set()  # the r + c diagonals are never checked

        def place(r):
            if r == n:
                out.append(["." * c + "Q" + "." * (n - c - 1) for c in queens])
                return
            for c in range(n):
                if c in cols or r - c in diag:
                    continue
                queens.append(c)
                cols.add(c)
                diag.add(r - c)
                place(r + 1)
                queens.pop()
                cols.remove(c)
                diag.remove(r - c)

        place(0)
        return out
```

A queen attacks along both diagonals. Tracking only `r − c` misses the diagonals that run from top right to bottom left, so boards with two queens on such a diagonal are accepted. Keep a set for `r + c` too.

### Writes rows one square too long

```python wrong fails="example" test="Example 1"
class Solution:
    def solveNQueens(self, n: int) -> List[List[str]]:
        out, queens = [], []
        cols, diag, anti = set(), set(), set()

        def place(r):
            if r == n:
                out.append(["." * c + "Q" + "." * (n - c) for c in queens])  # n + 1 characters
                return
            for c in range(n):
                if c in cols or r - c in diag or r + c in anti:
                    continue
                queens.append(c)
                cols.add(c)
                diag.add(r - c)
                anti.add(r + c)
                place(r + 1)
                queens.pop()
                cols.remove(c)
                diag.remove(r - c)
                anti.remove(r + c)

        place(0)
        return out
```

The search is right, but the row strings are wrong: c dots, a Q and n − c dots make n + 1 characters. After the queen there are `n - c - 1` squares left.

### Tries every column order, then checks the diagonals

```python wrong fails="perf"
class Solution:
    def solveNQueens(self, n: int) -> List[List[str]]:
        out = []
        for cols in permutations(range(n)):  # n! complete boards, checked only at the end
            if all(abs(cols[i] - cols[j]) != j - i for i in range(n) for j in range(i + 1, n)):
                out.append(["." * c + "Q" + "." * (n - c - 1) for c in cols])
        return out
```

Every permutation of columns already avoids row and column attacks, so checking the diagonals of each one finds every solution. But it builds all n! complete boards, 3.6 million for n = 10, even though most go wrong in their first rows. Backtracking abandons a board at its first attacked square.
