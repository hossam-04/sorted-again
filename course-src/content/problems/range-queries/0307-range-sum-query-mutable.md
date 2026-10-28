---
id: 307
module: range-queries
patterns: [Fenwick tree, point update and range sum]
kind: design
class: NumArray
---

## Task

Build a class `NumArray` over a list of integers that supports changing numbers and asking for the sum of any stretch of them:

- `NumArray(nums)` stores the list.
- `update(index, val)` sets `nums[index]` to `val`.
- `sumRange(left, right)` returns `nums[left] + nums[left + 1] + ... + nums[right]`, both ends included.

Tests list the method names called in order, their arguments, and what each call returns (`None` for the constructor and `update`).

## Constraints

- `1 <= len(nums) <= 100_000`
- `-100 <= nums[i], val <= 100`
- `0 <= index < len(nums)`, `0 <= left <= right < len(nums)`
- At most `100_000` calls to `update` and `sumRange`

```python starter
class NumArray:
    def __init__(self, nums: List[int]):
        pass

    def update(self, index: int, val: int) -> None:
        pass

    def sumRange(self, left: int, right: int) -> int:
        pass
```

```json examples
[
  {"ops": ["NumArray", "sumRange", "update", "sumRange", "sumRange"], "args": [[[2, -1, 4, 0, 7]], [1, 3], [2, 10], [1, 3], [0, 4]], "out": [null, 3, null, 9, 18], "why": "-1 + 4 + 0 = 3. After nums[2] becomes 10, the same stretch sums to -1 + 10 + 0 = 9, and the whole list to 18."},
  {"ops": ["NumArray", "sumRange", "update", "sumRange"], "args": [[[5]], [0, 0], [0, -3], [0, 0]], "out": [null, 5, null, -3], "why": "An update replaces the number; it doesn't add to it."},
  {"ops": ["NumArray", "update", "update", "sumRange", "sumRange"], "args": [[[1, 1, 1, 1, 1, 1]], [0, 4], [5, 4], [0, 5], [1, 4]], "out": [null, null, null, 12, 4], "why": "Updates at both ends change the full sum, but not the middle four."}
]
```

```json edge
[
  {"name": "the same value again", "ops": ["NumArray", "update", "sumRange"], "args": [[[3, 3]], [1, 3], [0, 1]], "out": [null, null, 6]},
  {"name": "one index updated twice", "ops": ["NumArray", "update", "update", "sumRange"], "args": [[[0, 0, 0]], [1, 5], [1, 2], [0, 2]], "out": [null, null, null, 2]},
  {"name": "negative numbers", "ops": ["NumArray", "sumRange", "sumRange"], "args": [[[-100, -100, 100]], [0, 1], [1, 2]], "out": [null, -200, 0]},
  {"name": "the last index", "ops": ["NumArray", "sumRange", "update", "sumRange"], "args": [[[1, 2, 3, 4]], [3, 3], [3, 0], [0, 3]], "out": [null, 4, null, 6]},
  {"name": "a stretch of one", "ops": ["NumArray", "sumRange"], "args": [[[8, 9]], [1, 1]], "out": [null, 9]},
  {"name": "a power-of-two length", "ops": ["NumArray", "update", "sumRange", "sumRange"], "args": [[[1, 2, 3, 4, 5, 6, 7, 8]], [7, 0], [4, 7], [0, 7]], "out": [null, null, 18, 28]}
]
```

```python oracle
class NumArray:
    def __init__(self, nums: List[int]):
        self.nums = list(nums)

    def update(self, index: int, val: int) -> None:
        self.nums[index] = val

    def sumRange(self, left: int, right: int) -> int:
        return sum(self.nums[left:right + 1])
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 6) if size == "small" else rng.randint(20, 300)
    nums = [rng.randint(-100, 100) for _ in range(n)]
    calls = rng.randint(1, 8) if size == "small" else rng.randint(20, 300)
    ops, args = ["NumArray"], [[nums]]
    for _ in range(calls):
        if rng.random() < 0.5:
            ops.append("update")
            args.append([rng.randrange(n), rng.randint(-100, 100)])
        else:
            l = rng.randrange(n)
            ops.append("sumRange")
            args.append([l, rng.randint(l, n - 1)])
    return {"ops": ops, "args": args}
```

```python perf
def perf(rng):
    # 100,000 numbers, then 30,000 updates and 30,000 sums of random stretches, alternating.
    n = 100_000
    ops, args = ["NumArray"], [[[rng.randint(-100, 100) for _ in range(n)]]]
    for _ in range(30_000):
        l = rng.randrange(n)
        ops += ["update", "sumRange"]
        args += [[rng.randrange(n), rng.randint(-100, 100)], [l, rng.randint(l, n - 1)]]
    return {"ops": ops, "args": args}
```

## Hints

1. Prefix sums answer a range sum in O(1), but one update changes every prefix sum after it: O(n). Summing the range directly is the opposite trade. You want both operations in O(log n).
2. A **Fenwick tree** (binary indexed tree) stores, at position i (counting from 1), the sum of the `i & -i` numbers ending at i. Any prefix is the sum of O(log n) of these blocks, found by repeatedly removing the lowest set bit: `i -= i & -i`.
3. An update to number i changes exactly the blocks that contain it, found by repeatedly adding the lowest set bit: `i += i & -i`. Turn `update(index, val)` into a change by `val - nums[index]`, and remember the current value.

## Solution

```python solution time="log n" space="n"
class NumArray:
    def __init__(self, nums: List[int]):
        self.nums = list(nums)  # current values, to turn an update into a change
        self.n = len(nums)
        self.tree = [0] * (self.n + 1)  # tree[i] covers the i & -i numbers ending at position i (from 1)
        for i, x in enumerate(nums, 1):  # O(n) build: each block passes its total up to the next block
            self.tree[i] += x
            parent = i + (i & -i)
            if parent <= self.n:
                self.tree[parent] += self.tree[i]

    def _prefix(self, i):  # the sum of the first i numbers
        total = 0
        while i > 0:
            total += self.tree[i]
            i -= i & -i  # drop the lowest set bit: the next block to the left
        return total

    def update(self, index: int, val: int) -> None:
        change = val - self.nums[index]
        self.nums[index] = val
        i = index + 1
        while i <= self.n:
            self.tree[i] += change
            i += i & -i  # the next block that also contains this position

    def sumRange(self, left: int, right: int) -> int:
        return self._prefix(right + 1) - self._prefix(left)
```

Write a position i in binary. `i & -i` is its lowest set bit, and `tree[i]` holds the sum of that many numbers ending at i: position 12 (binary 1100) covers 4 numbers, 9 to 12. The prefix of 13 numbers is then blocks 13, 12 and 8: one per set bit of 13, peeled off from the bottom. That's why a prefix sum takes O(log n) steps.

An update has to fix every block containing the position. Those are found by adding the lowest set bit instead, climbing to ever larger blocks, again O(log n) of them. A range sum is the difference of two prefixes. The build runs in O(n) by passing each block's total to the next larger block that contains it, instead of n separate updates.

## Alternatives

### A segment tree

```python alt time="log n" space="n"
class NumArray:
    def __init__(self, nums: List[int]):
        self.n = n = len(nums)
        self.t = [0] * n + list(nums)  # leaves at n .. 2n - 1; node i covers its children 2i and 2i + 1
        for i in range(n - 1, 0, -1):
            self.t[i] = self.t[2 * i] + self.t[2 * i + 1]

    def update(self, index: int, val: int) -> None:
        i = index + self.n
        self.t[i] = val
        while i > 1:  # fix every node above the leaf
            i //= 2
            self.t[i] = self.t[2 * i] + self.t[2 * i + 1]

    def sumRange(self, left: int, right: int) -> int:
        total = 0
        l, r = left + self.n, right + self.n + 1  # the half-open leaf range [l, r)
        while l < r:
            if l & 1:  # l is a right child: take it alone, and move past it
                total += self.t[l]
                l += 1
            if r & 1:  # r - 1 is a left child whose parent reaches past r: take it alone
                r -= 1
                total += self.t[r]
            l //= 2
            r //= 2
        return total
```

A segment tree stores the sum of every node's two children, with the numbers as leaves. This compact form keeps it in a list of size 2n, like a heap: node i's children are 2i and 2i + 1. An update fixes the leaf and every node above it; a range sum climbs from both ends, taking a node whole whenever the range covers it but not its parent. Both are O(log n). Unlike a Fenwick tree, a segment tree also handles minimum, maximum and anything else that combines two halves, which is why it's the more general tool.

### Blocks of about √n numbers

```python alt time="√n" space="n"
class NumArray:
    def __init__(self, nums: List[int]):
        self.nums = list(nums)
        self.size = max(1, int(len(nums) ** 0.5))
        self.blocks = [sum(self.nums[i:i + self.size]) for i in range(0, len(nums), self.size)]

    def update(self, index: int, val: int) -> None:
        self.blocks[index // self.size] += val - self.nums[index]
        self.nums[index] = val

    def sumRange(self, left: int, right: int) -> int:
        b, e = left // self.size, right // self.size
        if b == e:
            return sum(self.nums[left:right + 1])
        return (sum(self.nums[left:(b + 1) * self.size])  # the end of the first block
                + sum(self.blocks[b + 1:e])               # whole blocks in between
                + sum(self.nums[e * self.size:right + 1]))  # the start of the last block
```

Cut the list into blocks of about √n numbers and keep each block's sum. An update fixes one number and one block sum, O(1). A range sum adds the two partial blocks at its ends and the whole blocks between them, O(√n). It's simpler than either tree and quick here, because Python's `sum` does the adding in C.

## Wrong answers

### Adds the new value instead of setting it

```python wrong fails="example" test="Example 1"
class NumArray:
    def __init__(self, nums: List[int]):
        self.n = len(nums)
        self.tree = [0] * (self.n + 1)
        for i, x in enumerate(nums):
            self._add(i + 1, x)

    def _add(self, i, change):
        while i <= self.n:
            self.tree[i] += change
            i += i & -i

    def _prefix(self, i):
        total = 0
        while i > 0:
            total += self.tree[i]
            i -= i & -i
        return total

    def update(self, index: int, val: int) -> None:
        self._add(index + 1, val)  # adds val on top of the old number

    def sumRange(self, left: int, right: int) -> int:
        return self._prefix(right + 1) - self._prefix(left)
```

A Fenwick tree stores sums, so it can only be told how much a number *changes*. Passing the new value adds it to the old one: in Example 1, nums[2] becomes 4 + 10 = 14 instead of 10. Keep the current values and add `val - nums[index]`.

### Counts positions from 0

```python wrong fails="example" test="Example 1" how="timeout"
class NumArray:
    def __init__(self, nums: List[int]):
        self.n = len(nums)
        self.tree = [0] * self.n
        self.nums = [0] * self.n
        for i, x in enumerate(nums):
            self.update(i, x)

    def update(self, index: int, val: int) -> None:
        change = val - self.nums[index]
        self.nums[index] = val
        i = index  # positions from 0: 0 & -0 is 0, so i never moves
        while i < self.n:
            self.tree[i] += change
            i += i & -i

    def sumRange(self, left: int, right: int) -> int:
        def prefix(i):
            total = 0
            while i >= 0:
                total += self.tree[i]
                i -= i & -i
            return total
        return prefix(right) - prefix(left - 1)
```

Fenwick trees count positions from 1 because the lowest set bit of 0 is 0: `i += i & -i` leaves `i` at 0 forever. The constructor's very first update never ends. Shift every index by one when it enters the tree.

### Leaves out the right end

```python wrong fails="example" test="Example 1"
class NumArray:
    def __init__(self, nums: List[int]):
        self.nums = list(nums)

    def update(self, index: int, val: int) -> None:
        self.nums[index] = val

    def sumRange(self, left: int, right: int) -> int:
        return sum(self.nums[left:right])  # a slice stops before right
```

Both ends are included, and a Python slice stops before its end. In Example 1, the first two sums happen to be right because `nums[3]` is 0, but the full sum misses the 7 at the end. Slice up to `right + 1`.

### Rebuilds the prefix sums after every update

```python wrong fails="perf"
class NumArray:
    def __init__(self, nums: List[int]):
        self.nums = list(nums)
        self.prefix = [0, *accumulate(self.nums)]

    def update(self, index: int, val: int) -> None:
        self.nums[index] = val
        self.prefix = [0, *accumulate(self.nums)]  # O(n) for every update

    def sumRange(self, left: int, right: int) -> int:
        return self.prefix[right + 1] - self.prefix[left]
```

Sums are O(1), but every update rebuilds all 100,000 prefix sums: 30,000 updates make 3 billion additions. The trees spread the work so that both operations cost O(log n).
