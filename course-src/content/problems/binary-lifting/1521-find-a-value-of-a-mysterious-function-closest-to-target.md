---
id: 1521
module: binary-lifting
patterns: [few distinct ANDs per end, sparse table of ANDs]
signature: "def closestToTarget(self, arr: List[int], target: int) -> int"
---

## Task

For a subarray `arr[l..r]` (consecutive elements, at least one), take the bitwise AND of all its elements: `arr[l] & arr[l + 1] & ... & arr[r]`. Return the smallest possible value of `abs(AND - target)` over all subarrays.

(LeetCode calls this AND the "mysterious function".)

## Constraints

- `1 <= len(arr) <= 100_000`
- `1 <= arr[i] <= 10**6`
- `0 <= target <= 10**7`

```json examples
[
  {"args": [[13, 7, 12], 5], "out": 0, "why": "13 AND 7 is exactly 5: 1101 & 0111 = 0101."},
  {"args": [[6, 10, 14], 3], "out": 1, "why": "No subarray's AND is 3. The closest is 2, from 6 AND 10 (or all three)."},
  {"args": [[8, 9, 10], 20], "out": 10, "why": "An AND is never larger than its smallest element, so nothing gets above 10, and 20 - 10 = 10."}
]
```

```json edge
[
  {"name": "one number", "args": [[5], 5], "out": 0},
  {"name": "target 0", "args": [[3, 4], 0], "out": 0},
  {"name": "only the whole array hits it", "args": [[14, 13, 11], 8], "out": 0},
  {"name": "a large gap", "args": [[1000000], 10000000], "out": 9000000},
  {"name": "powers of two", "args": [[1, 2, 4, 8], 3], "out": 1},
  {"name": "all equal", "args": [[6, 6, 6], 7], "out": 1}
]
```

```python oracle
class Solution:
    def closestToTarget(self, arr: List[int], target: int) -> int:
        best = abs(arr[0] - target)
        for l in range(len(arr)):
            value = arr[l]
            for r in range(l, len(arr)):
                value &= arr[r]
                best = min(best, abs(value - target))
        return best
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 6) if size == "small" else rng.randint(20, 300)
    hi = 15 if size == "small" else rng.choice([255, 10**6])
    arr = [rng.randint(1, hi) for _ in range(n)]
    return [arr, rng.randint(0, hi + 3)]
```

```python perf
def perf(rng):
    # 50,000 numbers that share their top bits, so ANDs fall slowly, and a target in the middle.
    arr = [(1 << 19) | (1 << 18) | rng.randint(0, 200_000) for _ in range(50_000)]
    return [arr, 600_000]
```

## Hints

1. Fix the right end r. As the left end moves further left, the AND can only lose bits, never gain them. How many different values can it take?
2. Each new value has fewer set bits than the one before, and a number up to 10⁶ has at most 20 bits, so the ANDs of all subarrays ending at r take at most about 21 distinct values.
3. Keep that set as you move r to the right: the new set is every old value ANDed with `arr[r]`, plus `arr[r]` itself. Check each value against the target.

## Solution

```python solution time="n log V" space="log V"
class Solution:
    def closestToTarget(self, arr: List[int], target: int) -> int:
        best = abs(arr[0] - target)
        ands = set()  # the ANDs of all subarrays ending at the current position
        for x in arr:
            ands = {a & x for a in ands}
            ands.add(x)
            best = min(best, min(abs(a - target) for a in ands))
        return best
```

There are about n²/2 subarrays, but far fewer distinct ANDs. Ending at a fixed position, extending the subarray to the left can only clear bits, so every *new* value has at least one bit fewer than the previous one. With numbers below 2²⁰, a chain of strictly shrinking bit sets has at most 21 members, and the set never holds more.

Each step rebuilds the set from the previous one: an old subarray extended by `x`, or `x` alone. That's O(n log V) time for values up to V, with only O(log V) values kept at a time. The same trick works for OR (values can only gain bits) and for GCD (each change at least halves the value).

## Alternatives

### A sparse table and two pointers

```python alt time="n log n" space="n log n"
class Solution:
    def closestToTarget(self, arr: List[int], target: int) -> int:
        n = len(arr)
        table = [arr]  # table[j][i]: the AND of arr[i .. i + 2**j - 1]
        while (1 << len(table)) <= n:
            prev, half = table[-1], 1 << (len(table) - 1)
            table.append([prev[i] & prev[i + half] for i in range(len(prev) - half)])

        def range_and(l, r):  # two power-of-two windows that cover l .. r, overlapping in the middle
            j = (r - l + 1).bit_length() - 1
            return table[j][l] & table[j][r - (1 << j) + 1]

        best, r = abs(arr[0] - target), 0
        for l in range(n):
            r = max(r, l)
            while r + 1 < n and range_and(l, r + 1) >= target:  # extend while still at least target
                r += 1
            best = min(best, abs(range_and(l, r) - target))
            if r + 1 < n:  # the first AND below the target
                best = min(best, abs(range_and(l, r + 1) - target))
        return best
```

A **sparse table** stores the AND of every window whose length is a power of two. AND is *idempotent* (`x & x == x`), so overlapping windows don't spoil the answer: any range is covered by two windows of the same power-of-two length, one from each end, and a range AND takes O(1).

For a fixed left end the AND falls as the right end grows, so the best right end is either the last one where the AND is still at least the target, or the one just after. Moving the left end right can only raise the AND, so that boundary never moves backwards: two pointers make about 2n range queries in all.

## Wrong answers

### Looks only at single numbers

```python wrong fails="example" test="Example 1"
class Solution:
    def closestToTarget(self, arr: List[int], target: int) -> int:
        return min(abs(x - target) for x in arr)  # subarrays of length one only
```

A single number is one kind of subarray, but ANDing more numbers can land closer to the target. In Example 1, no single number is 5, but 13 AND 7 is.

### Looks only at subarrays that start at the beginning

```python wrong fails="example" test="Example 3"
class Solution:
    def closestToTarget(self, arr: List[int], target: int) -> int:
        best, value = abs(arr[0] - target), arr[0]
        for x in arr:
            value &= x  # the AND of arr[0 .. r]
            best = min(best, abs(value - target))
        return best
```

Every subarray here starts at index 0, so in Example 3 the best it can do is 8 = 8 & 9 & 10, missing the 10 standing on its own at the end. Subarrays can start anywhere.

### Keeps every AND, repeats included

```python wrong fails="perf"
class Solution:
    def closestToTarget(self, arr: List[int], target: int) -> int:
        best = abs(arr[0] - target)
        ands = []  # one entry per subarray ending here, so it grows by one each step
        for x in arr:
            ands = [a & x for a in ands] + [x]
            best = min(best, min(abs(a - target) for a in ands))
        return best
```

The right idea with the wrong container: a list keeps one AND per subarray, n of them by the end, even though only about 20 are different. That's O(n²) work, over a billion operations for 50,000 numbers. A set removes the repeats as they appear.
