---
id: 2013
module: bits-math
patterns: [count copies, fix one side, axis-aligned squares]
kind: design
class: DetectSquares
---

## Task

Build a class `DetectSquares` that stores points and counts squares:

- `DetectSquares()` starts with no points.
- `add(point)` stores the point `[x, y]`. The same point can be added more than once, and every copy counts separately.
- `count(point)` returns the number of ways to choose three stored points that form, together with the query point `[x, y]`, the four corners of a square with sides parallel to the axes and an area greater than 0. Choosing different copies of a point counts as a different way. The query point itself isn't stored.

Tests list the method names called in order, their arguments, and what each call returns.

## Constraints

- `0 <= x, y <= 1000`
- At most `3_000` calls in total

```python starter
class DetectSquares:
    def __init__(self):
        pass

    def add(self, point: List[int]) -> None:
        pass

    def count(self, point: List[int]) -> int:
        pass
```

```json examples
[
  {"ops": ["DetectSquares", "add", "add", "add", "count", "count"], "args": [[], [[1, 1]], [[1, 4]], [[4, 1]], [[4, 4]], [[4, 5]]], "out": [null, null, null, null, 1, 0], "why": "With the query (4, 4), the stored points (1, 1), (1, 4) and (4, 1) are the corners of a 3 × 3 square. For (4, 5) there's no square: no stored point is the same distance from it horizontally and vertically."},
  {"ops": ["DetectSquares", "add", "add", "add", "add", "count"], "args": [[], [[0, 0]], [[0, 2]], [[2, 0]], [[0, 2]], [[2, 2]]], "out": [null, null, null, null, null, 2], "why": "(0, 2) was added twice, so there are two ways to pick the square's top-left corner."},
  {"ops": ["DetectSquares", "add", "add", "add", "add", "add", "count"], "args": [[], [[2, 0]], [[0, 0]], [[0, 2]], [[4, 0]], [[4, 2]], [[2, 2]]], "out": [null, null, null, null, null, null, 2], "why": "The query is a corner of two squares, one on each side of the line x = 2. Both share the corner (2, 0)."}
]
```

```json edge
[
  {"name": "no points", "ops": ["DetectSquares", "count"], "args": [[], [[3, 3]]], "out": [null, 0]},
  {"name": "a square needs an area", "ops": ["DetectSquares", "add", "add", "count"], "args": [[], [[5, 5]], [[5, 5]], [[5, 5]]], "out": [null, null, null, 0]},
  {"name": "a rectangle isn't a square", "ops": ["DetectSquares", "add", "add", "add", "count"], "args": [[], [[0, 0]], [[0, 3]], [[2, 0]], [[2, 3]]], "out": [null, null, null, null, 0]},
  {"name": "the query matches a stored point", "ops": ["DetectSquares", "add", "add", "add", "add", "count"], "args": [[], [[1, 1]], [[1, 2]], [[2, 1]], [[2, 2]], [[2, 2]]], "out": [null, null, null, null, null, 1]},
  {"name": "many copies", "ops": ["DetectSquares", "add", "add", "add", "add", "add", "add", "add", "count"], "args": [[], [[0, 0]], [[0, 0]], [[0, 1]], [[0, 1]], [[0, 1]], [[1, 0]], [[1, 0]], [[1, 1]]], "out": [null, null, null, null, null, null, null, null, 12]},
  {"name": "corners at the edge of the range", "ops": ["DetectSquares", "add", "add", "add", "count", "count"], "args": [[], [[0, 0]], [[0, 1000]], [[1000, 0]], [[1000, 1000]], [[0, 0]]], "out": [null, null, null, null, 1, 0]},
  {"name": "squares of different sizes", "ops": ["DetectSquares", "add", "add", "add", "add", "add", "add", "count"], "args": [[], [[0, 1]], [[1, 0]], [[1, 1]], [[0, 3]], [[3, 0]], [[3, 3]], [[0, 0]]], "out": [null, null, null, null, null, null, null, 2]}
]
```

```python gen
def gen(rng, size):
    calls = rng.randint(1, 10) if size == "small" else rng.randint(20, 120)
    hi = 3 if size == "small" else 6
    ops, args = ["DetectSquares"], [[]]
    for _ in range(calls):
        ops.append("add" if rng.random() < 0.6 else "count")
        args.append([[rng.randint(0, hi), rng.randint(0, hi)]])
    return {"ops": ops, "args": args}
```

```python perf
def perf(rng):
    # 2,000 points in a 20 × 20 corner of the grid, then 1,000 queries in the same corner.
    ops = ["DetectSquares"] + ["add"] * 2000 + ["count"] * 1000
    args = [[]] + [[[rng.randint(0, 19), rng.randint(0, 19)]] for _ in range(3000)]
    return {"ops": ops, "args": args}
```

## Hints

1. Keep a count of the copies of each point: a dictionary from `(x, y)` to how many times it was added.
2. A square with the query `(qx, qy)` as a corner has another corner straight above or below it, at `(qx, y)`. That fixes the side length, `d = y − qy`, and the square lies either to the left or to the right of the line x = qx.
3. For each stored `y` in the query's column other than `qy`, add `copies(qx, y) × copies(qx + d, qy) × copies(qx + d, y)`, and the same with `qx − d`.

## Solution

```python solution time="n" space="n"
class DetectSquares:
    def __init__(self):
        self.copies = Counter()             # (x, y) -> how many times it was added
        self.column = defaultdict(Counter)  # x -> the y values stored at that x, with their counts

    def add(self, point: List[int]) -> None:
        x, y = point
        self.copies[(x, y)] += 1
        self.column[x][y] += 1

    def count(self, point: List[int]) -> int:
        qx, qy = point
        total = 0
        for y, n in self.column[qx].items():  # a corner straight above or below the query
            d = y - qy
            if d == 0:
                continue  # the same point: no area
            for x in (qx - d, qx + d):  # the square lies on one side or the other
                total += n * self.copies[(x, qy)] * self.copies[(x, y)]
        return total
```

A square with sides parallel to the axes is fixed by any two neighbouring corners and the side the square lies on. So fix the corner in the query's own column: each stored point `(qx, y)` gives a side length `d = y − qy`, and the two remaining corners are `(qx ± d, qy)` and `(qx ± d, y)`, one choice of sign for each side. Multiplying the numbers of copies counts every combination of copies once.

`add` is O(1). `count` looks only at the points in the query's column, at most one entry per distinct y, so its cost is O(n) in the worst case but usually far less. A `Counter` returns 0 for a missing point without storing anything, which keeps the lookups simple.

## Alternatives

### Every stored point as the opposite corner

```python alt time="n" space="n" oracle
class DetectSquares:
    def __init__(self):
        self.copies = Counter()

    def add(self, point: List[int]) -> None:
        self.copies[tuple(point)] += 1

    def count(self, point: List[int]) -> int:
        qx, qy = point
        total = 0
        for (x, y), n in self.copies.items():  # try each distinct point as the diagonal corner
            if abs(x - qx) == abs(y - qy) != 0:  # same distance both ways, and not zero
                total += n * self.copies[(x, qy)] * self.copies[(qx, y)]
        return total
```

The corner diagonally opposite the query decides the whole square, as long as it's the same distance away horizontally and vertically. This scans every distinct stored point instead of one column, which is simpler but slower when there are many points.

## Wrong answers

### Ignores copies

```python wrong fails="example" test="Example 2"
class DetectSquares:
    def __init__(self):
        self.points = set()  # a second copy of a point disappears

    def add(self, point: List[int]) -> None:
        self.points.add(tuple(point))

    def count(self, point: List[int]) -> int:
        qx, qy = point
        total = 0
        for x, y in self.points:
            if abs(x - qx) == abs(y - qy) != 0 and (x, qy) in self.points and (qx, y) in self.points:
                total += 1
        return total
```

A set keeps only one copy of each point, but every copy counts as a different choice. In Example 2, (0, 2) was added twice, so there are two squares to count, not one. Store how many copies each point has.

### Checks only one side of the column

```python wrong fails="example" test="Example 3"
class DetectSquares:
    def __init__(self):
        self.copies = Counter()
        self.column = defaultdict(Counter)

    def add(self, point: List[int]) -> None:
        x, y = point
        self.copies[(x, y)] += 1
        self.column[x][y] += 1

    def count(self, point: List[int]) -> int:
        qx, qy = point
        total = 0
        for y, n in self.column[qx].items():
            d = y - qy
            if d != 0:
                x = qx + d  # only one of the two possible squares
                total += n * self.copies[(x, qy)] * self.copies[(x, y)]
        return total
```

Two corners in the same column are shared by two squares, one on each side of it. Looking only at `qx + d` finds one of them, and which one depends on whether the stored point is above or below the query. In Example 3 it finds the square on the left and misses the one on the right.

### Lets a corner coincide with the query

```python wrong fails="edge" test="a square needs an area"
class DetectSquares:
    def __init__(self):
        self.copies = Counter()
        self.column = defaultdict(Counter)

    def add(self, point: List[int]) -> None:
        x, y = point
        self.copies[(x, y)] += 1
        self.column[x][y] += 1

    def count(self, point: List[int]) -> int:
        qx, qy = point
        total = 0
        for y, n in self.column[qx].items():
            d = y - qy  # 0 when the stored point is the query point itself
            for x in (qx - d, qx + d):
                total += n * self.copies[(x, qy)] * self.copies[(x, y)]
        return total
```

When a stored point sits exactly on the query, the side length is 0 and all four "corners" are the same point. That isn't a square: it has no area. Here two copies of (5, 5) produce 16 such "squares". Skip `d == 0`.

### Counts rectangles too

```python wrong fails="edge" test="a rectangle isn't a square"
class DetectSquares:
    def __init__(self):
        self.copies = Counter()

    def add(self, point: List[int]) -> None:
        self.copies[tuple(point)] += 1

    def count(self, point: List[int]) -> int:
        qx, qy = point
        total = 0
        for (x, y), n in self.copies.items():
            if x != qx and y != qy:  # any diagonal corner, even when the sides differ
                total += n * self.copies[(x, qy)] * self.copies[(qx, y)]
        return total
```

The diagonal corner must be the same distance away in both directions. Accepting any point that differs in both x and y also counts rectangles, like the 2 × 3 one in this test. Check `abs(x − qx) == abs(y − qy)`.

### Searches the whole list for every corner

```python wrong fails="perf"
class DetectSquares:
    def __init__(self):
        self.points = []  # every copy, in the order added

    def add(self, point: List[int]) -> None:
        self.points.append(tuple(point))

    def count(self, point: List[int]) -> int:
        qx, qy = point
        total = 0
        for x, y in self.points:  # each copy as the opposite corner
            if abs(x - qx) == abs(y - qy) != 0:
                total += self.points.count((x, qy)) * self.points.count((qx, y))  # two full scans
        return total
```

The logic is right, and keeping every copy in a list even handles duplicates. But each candidate corner triggers two scans of the whole list. With 2,000 points crowded into a small area, about 125 of them lie on a diagonal of each query, and 1,000 queries add up to about 500 million comparisons. Counting copies in a dictionary turns each scan into one lookup.
