---
id: 2286
module: range-queries
patterns: [segment tree with max and sum, descending the tree]
kind: design
class: BookMyShow
---

## Task

A concert hall has `n` rows, numbered from 0, each with `m` seats, numbered from 0. Seats are always handed out from the lowest free seat of a row, so each row's free seats are the last ones. Build a class `BookMyShow` that books seats for groups:

- `BookMyShow(n, m)` starts with every seat free.
- `gather(k, maxRow)`: a group of `k` people wants to sit **together in one row**, in a row numbered at most `maxRow`. Choose the lowest such row with at least `k` free seats, book its first `k` free seats and return `[row, first seat]`. If no row qualifies, book nothing and return `[]`.
- `scatter(k, maxRow)`: a group of `k` people is happy to sit anywhere in rows 0 to `maxRow`. If those rows have at least `k` free seats in total, book the `k` lowest free seats (lowest row first, then lowest seat) and return `True`. Otherwise book nothing and return `False`.

Tests list the method names called in order, their arguments, and what each call returns (`None` for the constructor).

## Constraints

- `1 <= n <= 50_000`
- `1 <= m, k <= 10**9`
- `0 <= maxRow < n`
- At most `50_000` calls to `gather` and `scatter` in total

```python starter
class BookMyShow:
    def __init__(self, n: int, m: int):
        pass

    def gather(self, k: int, maxRow: int) -> List[int]:
        pass

    def scatter(self, k: int, maxRow: int) -> bool:
        pass
```

```json examples
[
  {"ops": ["BookMyShow", "gather", "gather", "gather", "scatter", "gather", "gather"], "args": [[3, 4], [3, 1], [2, 1], [2, 0], [3, 1], [1, 1], [4, 2]], "out": [null, [0, 0], [1, 0], [], true, [], [2, 0]], "why": "The first group sits at the start of row 0. The pair can't sit together in row 0's last seat, so it goes to row 1, and a pair limited to row 0 doesn't fit. Three scattered people fill the rest of rows 0 and 1, so after that only row 2 has room."},
  {"ops": ["BookMyShow", "scatter", "scatter", "gather"], "args": [[2, 3], [4, 1], [3, 1], [2, 1]], "out": [null, true, false, [1, 1]], "why": "The first scatter fills row 0 and one seat of row 1. The second can't seat all three people, so it books nobody, and the pair still finds two seats together in row 1."},
  {"ops": ["BookMyShow", "gather", "gather", "gather"], "args": [[4, 10], [6, 3], [5, 3], [4, 3]], "out": [null, [0, 0], [1, 0], [0, 6]], "why": "Each group takes the lowest row with room for it, even when a later row has more space: the third group fits in the last 4 seats of row 0."}
]
```

```json edge
[
  {"name": "one row, one seat", "ops": ["BookMyShow", "gather", "gather", "scatter"], "args": [[1, 1], [1, 0], [1, 0], [1, 0]], "out": [null, [0, 0], [], false]},
  {"name": "a group bigger than a row", "ops": ["BookMyShow", "gather", "scatter"], "args": [[2, 3], [4, 1], [4, 1]], "out": [null, [], true]},
  {"name": "scatter fills every seat", "ops": ["BookMyShow", "scatter", "scatter"], "args": [[2, 2], [4, 1], [1, 1]], "out": [null, true, false]},
  {"name": "maxRow limits scatter", "ops": ["BookMyShow", "scatter", "scatter", "gather", "gather"], "args": [[3, 2], [3, 0], [2, 0], [2, 0], [2, 1]], "out": [null, false, true, [], [1, 0]]},
  {"name": "huge rows", "ops": ["BookMyShow", "gather", "scatter", "gather"], "args": [[2, 1000000000], [1000000000, 1], [999999999, 1], [1, 1]], "out": [null, [0, 0], true, [1, 999999999]]},
  {"name": "a full row is skipped", "ops": ["BookMyShow", "gather", "gather"], "args": [[3, 5], [5, 2], [1, 2]], "out": [null, [0, 0], [1, 0]]},
  {"name": "scatter after gathers left gaps", "ops": ["BookMyShow", "gather", "gather", "scatter", "gather"], "args": [[3, 5], [4, 2], [3, 2], [3, 2], [3, 2]], "out": [null, [0, 0], [1, 0], true, [2, 0]]}
]
```

```python oracle
class BookMyShow:
    def __init__(self, n: int, m: int):
        self.m = m
        self.used = [0] * n

    def gather(self, k: int, maxRow: int) -> List[int]:
        for r in range(maxRow + 1):
            if self.m - self.used[r] >= k:
                seat = self.used[r]
                self.used[r] += k
                return [r, seat]
        return []

    def scatter(self, k: int, maxRow: int) -> bool:
        if sum(self.m - u for u in self.used[:maxRow + 1]) < k:
            return False
        r = 0
        while k:
            take = min(self.m - self.used[r], k)
            self.used[r] += take
            k -= take
            r += 1
        return True
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 4) if size == "small" else rng.randint(5, 60)
    m = rng.randint(1, 5) if size == "small" else rng.choice([10, 1000])
    calls = rng.randint(1, 8) if size == "small" else rng.randint(20, 300)
    ops, args = ["BookMyShow"], [[n, m]]
    for _ in range(calls):
        ops.append(rng.choice(["gather", "scatter"]))
        args.append([rng.randint(1, m + 1 if size == "small" else m), rng.randrange(n)])
    return {"ops": ops, "args": args}
```

```python perf
def perf(rng):
    # 30,000 rows of 1,000 seats. Big groups take most of a row each, so every gather has to look past the
    # rows filled before it; one call in ten is a small scatter.
    n = 30_000
    ops, args = ["BookMyShow"], [[n, 1_000]]
    for _ in range(29_999):
        if rng.random() < 0.9:
            ops.append("gather")
            args.append([rng.randint(990, 1_000), n - 1])
        else:
            ops.append("scatter")
            args.append([rng.randint(1, 30), n - 1])
    return {"ops": ops, "args": args}
```

## Hints

1. Each row is described by one number, its free seats. `gather` needs "the lowest row up to `maxRow` with at least k free seats"; `scatter` needs "the total free seats in rows 0 to `maxRow`". Scanning rows answers both in O(n), which is too slow for 50,000 calls.
2. A segment tree over the rows can store, for every node, both the **largest** number of free seats below it and the **sum** of them. The sum answers `scatter`'s question with a range query.
3. For `gather`, walk down from the root: go left whenever the left child's maximum is at least k, otherwise right. You arrive at the lowest row with enough room in O(log n); then check it against `maxRow`. For `scatter`, fill rows from the lowest one that isn't full yet, and remember where that is so full rows are never visited again.

## Solution

```python solution time="log n" space="n"
class BookMyShow:
    def __init__(self, n: int, m: int):
        self.m = m
        self.size = 1
        while self.size < n:
            self.size *= 2
        self.most = [0] * (2 * self.size)  # the most free seats in any one row below each node
        self.free = [0] * (2 * self.size)  # the total free seats below each node
        for r in range(n):
            self.most[self.size + r] = self.free[self.size + r] = m
        for i in range(self.size - 1, 0, -1):
            self.most[i] = max(self.most[2 * i], self.most[2 * i + 1])
            self.free[i] = self.free[2 * i] + self.free[2 * i + 1]
        self.first = 0  # every row before this one is full

    def _set(self, row, seats):  # row now has `seats` free seats
        i = self.size + row
        self.most[i] = self.free[i] = seats
        i //= 2
        while i:
            self.most[i] = max(self.most[2 * i], self.most[2 * i + 1])
            self.free[i] = self.free[2 * i] + self.free[2 * i + 1]
            i //= 2

    def _free_up_to(self, row):  # total free seats in rows 0 .. row
        total = 0
        l, r = self.size, self.size + row + 1
        while l < r:
            if l & 1:
                total += self.free[l]
                l += 1
            if r & 1:
                r -= 1
                total += self.free[r]
            l //= 2
            r //= 2
        return total

    def gather(self, k: int, maxRow: int) -> List[int]:
        if self.most[1] < k:
            return []
        i = 1
        while i < self.size:  # descend towards the lowest row with room for k
            i = 2 * i if self.most[2 * i] >= k else 2 * i + 1
        row = i - self.size
        if row > maxRow:
            return []
        seats = self.free[i]
        self._set(row, seats - k)
        return [row, self.m - seats]

    def scatter(self, k: int, maxRow: int) -> bool:
        if self._free_up_to(maxRow) < k:
            return False
        while k:
            seats = self.free[self.size + self.first]
            take = min(seats, k)
            if take:
                self._set(self.first, seats - take)
                k -= take
            if take == seats:  # this row is now full
                self.first += 1
        return True
```

The tree keeps two numbers per node, the maximum and the sum of free seats over its rows, and every change to a row fixes both along the path to the root. `gather` uses the maximum to **descend**: at each node, if the left half has a row with room for k, the lowest such row is there; otherwise it's in the right half. That finds the lowest qualifying row in the whole hall, and if even that one is past `maxRow`, no row qualifies.

`scatter` checks the sum over rows 0 to `maxRow` with an ordinary range query, then books from the lowest row that isn't full. The pointer `first` only moves forward, past rows that are full and stay full, so across all calls each row is skipped at most once. Every call is O(log n), amortised.

## Alternatives

### Blocks of rows

```python alt time="√n" space="n"
class BookMyShow:
    def __init__(self, n: int, m: int):
        self.m = m
        self.free = [m] * n
        self.size = max(1, int(n ** 0.5))
        self.block_most = [m] * ((n + self.size - 1) // self.size)  # the most free seats in each block
        self.block_free = [m * len(range(b, min(n, b + self.size))) for b in range(0, n, self.size)]
        self.first = 0

    def _set(self, row, seats):
        b = row // self.size
        self.block_free[b] += seats - self.free[row]
        self.free[row] = seats
        self.block_most[b] = max(self.free[b * self.size:(b + 1) * self.size])

    def gather(self, k: int, maxRow: int) -> List[int]:
        for b in range(self.first // self.size, len(self.block_most)):  # rows before first are full
            if self.block_most[b] >= k:  # the first block with a row that fits
                for row in range(b * self.size, min(len(self.free), (b + 1) * self.size)):
                    if self.free[row] >= k:
                        if row > maxRow:
                            return []
                        seats = self.free[row]
                        self._set(row, seats - k)
                        return [row, self.m - seats]
        return []

    def scatter(self, k: int, maxRow: int) -> bool:
        last = maxRow // self.size
        total = sum(self.block_free[:last]) + sum(self.free[last * self.size:maxRow + 1])
        if total < k:
            return False
        while k:
            seats = self.free[self.first]
            take = min(seats, k)
            if take:
                self._set(self.first, seats - take)
                k -= take
            if take == seats:
                self.first += 1
        return True
```

Group the rows into blocks of about √n, and keep each block's maximum and total. `gather` skips whole blocks until one has a row that fits, then looks inside it; `scatter` adds whole blocks plus a partial one. Both are O(√n) per call: a few hundred steps, much simpler than the tree, and about as fast here because `max` and `sum` over a block run in C.

## Wrong answers

### Lets a gathered group spread over two rows

```python wrong fails="example" test="Example 1"
class BookMyShow:
    def __init__(self, n: int, m: int):
        self.m = m
        self.used = [0] * n

    def gather(self, k: int, maxRow: int) -> List[int]:
        if sum(self.m - u for u in self.used[:maxRow + 1]) < k:  # counts seats in any rows
            return []
        r = 0
        while self.used[r] == self.m:
            r += 1
        start = [r, self.used[r]]
        while k:
            take = min(self.m - self.used[r], k)
            self.used[r] += take
            k -= take
            r += 1
        return start

    def scatter(self, k: int, maxRow: int) -> bool:
        if sum(self.m - u for u in self.used[:maxRow + 1]) < k:
            return False
        r = 0
        while k:
            take = min(self.m - self.used[r], k)
            self.used[r] += take
            k -= take
            r += 1
        return True
```

`gather` and `scatter` differ in one way: a gathered group must fit in a single row. Treating it like a scatter seats the pair in Example 1 across row 0's last seat and row 1's first, and returns `[0, 3]` instead of `[1, 0]`.

### Books part of a scatter that doesn't fit

```python wrong fails="example" test="Example 2"
class BookMyShow:
    def __init__(self, n: int, m: int):
        self.m = m
        self.used = [0] * n

    def gather(self, k: int, maxRow: int) -> List[int]:
        for r in range(maxRow + 1):
            if self.m - self.used[r] >= k:
                seat = self.used[r]
                self.used[r] += k
                return [r, seat]
        return []

    def scatter(self, k: int, maxRow: int) -> bool:
        for r in range(maxRow + 1):  # books as it goes, before knowing whether everyone fits
            take = min(self.m - self.used[r], k)
            self.used[r] += take
            k -= take
        return k == 0
```

A scatter that can't seat everyone must book nobody. This one books seats as it goes and only then finds out there weren't enough: in Example 2 the failed scatter still takes row 1's last two seats, and the pair after it finds no room. Check the total first.

### Picks the row with the most free seats

```python wrong fails="example" test="Example 3"
class BookMyShow:
    def __init__(self, n: int, m: int):
        self.m = m
        self.used = [0] * n

    def gather(self, k: int, maxRow: int) -> List[int]:
        rows = range(maxRow + 1)
        r = max(rows, key=lambda x: self.m - self.used[x])  # the roomiest row, not the lowest
        if self.m - self.used[r] < k:
            return []
        seat = self.used[r]
        self.used[r] += k
        return [r, seat]

    def scatter(self, k: int, maxRow: int) -> bool:
        if sum(self.m - u for u in self.used[:maxRow + 1]) < k:
            return False
        r = 0
        while k:
            take = min(self.m - self.used[r], k)
            self.used[r] += take
            k -= take
            r += 1
        return True
```

The task asks for the lowest row that fits, not the emptiest one. In Example 3 the third group fits in row 0's last 4 seats, but this puts it at the start of row 2.

### Scans the rows on every call

```python wrong fails="perf"
class BookMyShow:
    def __init__(self, n: int, m: int):
        self.m = m
        self.used = [0] * n

    def gather(self, k: int, maxRow: int) -> List[int]:
        for r in range(maxRow + 1):  # past every full row, every time
            if self.m - self.used[r] >= k:
                seat = self.used[r]
                self.used[r] += k
                return [r, seat]
        return []

    def scatter(self, k: int, maxRow: int) -> bool:
        if sum(self.m - u for u in self.used[:maxRow + 1]) < k:
            return False
        r = 0
        while k:
            take = min(self.m - self.used[r], k)
            self.used[r] += take
            k -= take
            r += 1
        return True
```

Correct, and fine for a small hall. In the test, each big group takes most of a row, so every `gather` walks past all the rows filled before it: about 450 million steps over 30,000 calls. The tree finds the row by descending in about 16 steps.
