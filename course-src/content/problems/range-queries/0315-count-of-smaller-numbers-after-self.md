---
id: 315
module: range-queries
patterns: [Fenwick tree over values, scan from the right]
signature: "def countSmaller(self, nums: List[int]) -> List[int]"
---

## Task

Return a list `counts` where `counts[i]` is how many numbers to the right of position `i` are **strictly smaller** than `nums[i]`.

## Constraints

- `1 <= len(nums) <= 100_000`
- `-10**4 <= nums[i] <= 10**4`

```json examples
[
  {"args": [[7, 3, 9, 3, 1]], "out": [3, 1, 2, 1, 0], "why": "7 has 3, 3 and 1 after it. The first 3 counts only the 1: the later 3 is equal, not smaller."},
  {"args": [[1, 2, 3, 4]], "out": [0, 0, 0, 0], "why": "In ascending order, nothing after a number is smaller."},
  {"args": [[-2, 5, -7, 0]], "out": [1, 2, 0, 0], "why": "Negative numbers count like any others: after 5 come -7 and 0."}
]
```

```json edge
[
  {"name": "one number", "args": [[3]], "out": [0]},
  {"name": "all equal", "args": [[4, 4, 4]], "out": [0, 0, 0]},
  {"name": "descending", "args": [[5, 4, 3, 2, 1]], "out": [4, 3, 2, 1, 0]},
  {"name": "extremes", "args": [[10000, -10000]], "out": [1, 0]},
  {"name": "repeats and negatives", "args": [[-1, -1, -2]], "out": [1, 1, 0]},
  {"name": "zeros", "args": [[0, 0, -1]], "out": [1, 1, 0]}
]
```

```python oracle
class Solution:
    def countSmaller(self, nums: List[int]) -> List[int]:
        return [sum(1 for y in nums[i + 1:] if y < x) for i, x in enumerate(nums)]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 8) if size == "small" else rng.randint(20, 300)
    hi = 5 if size == "small" else rng.choice([20, 10**4])
    return [[rng.randint(-hi, hi) for _ in range(n)]]
```

```python perf
def perf(rng):
    # 50,000 numbers across the whole range.
    return [[rng.randint(-10**4, 10**4) for _ in range(50_000)]]
```

## Hints

1. Walk from the right end. Then "the numbers to the right of i" are exactly the numbers already seen, and the question becomes: how many of the numbers seen so far are below `nums[i]`?
2. Keep a count for every possible value. The answer for `nums[i]` is the sum of the counts of all smaller values: a prefix sum over values, while counts keep changing.
3. A Fenwick tree over values does both in O(log m), for m possible values. Values can be negative, so shift each one by a constant to land on positions 1 and up.

## Solution

```python solution time="n log m" space="m"
class Solution:
    def countSmaller(self, nums: List[int]) -> List[int]:
        offset = 10**4 + 1          # value v is stored at position v + offset, which is at least 1
        size = 2 * 10**4 + 1
        tree = [0] * (size + 1)     # Fenwick tree: how many numbers seen so far have each value
        out = [0] * len(nums)
        for i in range(len(nums) - 1, -1, -1):  # from the right: the tree holds the numbers after i
            p = nums[i] + offset - 1  # values below nums[i] sit at positions 1 .. p
            seen = 0
            while p > 0:
                seen += tree[p]
                p -= p & -p
            out[i] = seen
            p = nums[i] + offset      # then count nums[i] itself
            while p <= size:
                tree[p] += 1
                p += p & -p
        return out
```

Scanning from the right turns "smaller numbers after me" into "smaller numbers seen so far". The Fenwick tree is indexed by value, and holds how many times each value has been seen. The count of smaller values is a prefix sum up to the position just below `nums[i]`, and adding `nums[i]` is a point update, both in O(log m) for the m = 20,001 possible values.

Shifting by `10**4 + 1` maps the smallest value to position 1, since a Fenwick tree can't use position 0. When values are spread over a huge range, sort the distinct values first and use their ranks as positions instead (*coordinate compression*); here the range is small enough to use directly.

## Alternatives

### Merge sort that counts

```python alt time="n log n" space="n"
class Solution:
    def countSmaller(self, nums: List[int]) -> List[int]:
        counts = [0] * len(nums)
        order = list(range(len(nums)))  # positions, to be sorted by value

        def sort(lo, hi):  # sorts order[lo:hi] by value, counting smaller numbers that jump over from the right
            if hi - lo <= 1:
                return
            mid = (lo + hi) // 2
            sort(lo, mid)
            sort(mid, hi)
            merged, j = [], mid
            for i in range(lo, mid):
                while j < hi and nums[order[j]] < nums[order[i]]:
                    merged.append(order[j])
                    j += 1
                counts[order[i]] += j - mid  # right-half numbers smaller than this one
                merged.append(order[i])
            merged.extend(order[j:hi])
            order[lo:hi] = merged

        sort(0, len(nums))
        return counts
```

Merge sort sees every pair once, at the merge where their halves meet. A right-half number that's smaller than a left-half number gets merged before it, so when a left-half number is placed, `j - mid` right-half numbers have jumped ahead of it: those are smaller numbers to its right. Sorting positions instead of values remembers whose count to raise. O(n log n), and independent of the range of values.

## Wrong answers

### Counts equal numbers too

```python wrong fails="example" test="Example 1"
class Solution:
    def countSmaller(self, nums: List[int]) -> List[int]:
        offset, size = 10**4 + 1, 2 * 10**4 + 1
        tree = [0] * (size + 1)
        out = [0] * len(nums)
        for i in range(len(nums) - 1, -1, -1):
            p = nums[i] + offset  # includes nums[i]'s own position: equal values are counted
            seen = 0
            while p > 0:
                seen += tree[p]
                p -= p & -p
            out[i] = seen
            p = nums[i] + offset
            while p <= size:
                tree[p] += 1
                p += p & -p
        return out
```

The prefix must stop just below `nums[i]`. Summing up to its own position counts the equal values to the right as well: in Example 1 the first 3 gets 2 instead of 1, because of the second 3.

### Indexes the tree by the raw value

```python wrong fails="example" test="Example 3" how="timeout"
class Solution:
    def countSmaller(self, nums: List[int]) -> List[int]:
        size = 10**4
        tree = [0] * (size + 1)
        out = [0] * len(nums)
        for i in range(len(nums) - 1, -1, -1):
            p = nums[i] - 1
            seen = 0
            while p > 0:
                seen += tree[p]
                p -= p & -p
            out[i] = seen
            p = nums[i]  # negative values, and 0, have no position of their own
            while p <= size:
                tree[p] += 1
                p += p & -p
        return out
```

With only positive values this works, which is why Examples 1 and 2 pass. A negative position doesn't raise an error in Python, it quietly counts from the end of the list, and then `p += p & -p` climbs to 0, where the lowest set bit is 0 and `p` never moves again. Shift values so the smallest lands on position 1.

### Compares every pair

```python wrong fails="perf"
class Solution:
    def countSmaller(self, nums: List[int]) -> List[int]:
        out = []
        for i, x in enumerate(nums):
            out.append(sum(1 for y in nums[i + 1:] if y < x))  # everything to the right, every time
        return out
```

Correct and direct, but O(n²): 50,000 numbers make over a billion comparisons. Scanning from the right with a Fenwick tree, or counting inside a merge sort, gets it down to O(n log n).
