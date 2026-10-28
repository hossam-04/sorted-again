---
id: 217
module: arrays
patterns: [hash set, seen before]
signature: "def containsDuplicate(self, nums: List[int]) -> bool"
---

## Task

You get a list of integers `nums`. Return `True` if some value appears at least twice, and `False` if every value is different.

## Constraints

- `1 <= len(nums) <= 100_000`
- `-10**9 <= nums[i] <= 10**9`

```json examples
[
  {"args": [[4, 7, 7, 1]], "out": true, "why": "7 appears twice."},
  {"args": [[10, -3, 8, 0]], "out": false, "why": "All four values are different."},
  {"args": [[5]], "out": false, "why": "A single value can't repeat."}
]
```

```json edge
[
  {"name": "duplicates far apart", "args": [[9, 1, 2, 9]], "out": true},
  {"name": "negative duplicates", "args": [[-1, -2, -1]], "out": true},
  {"name": "zero twice", "args": [[0, 0]], "out": true},
  {"name": "all equal", "args": [[3, 3, 3, 3]], "out": true},
  {"name": "two different values", "args": [[1, 2]], "out": false},
  {"name": "extreme values", "args": [[1000000000, -1000000000]], "out": false},
  {"name": "duplicate at the very end", "args": [[1, 2, 3, 4, 5, 6, 1]], "out": true}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 8) if size == "small" else rng.randint(20, 300)
    if rng.random() < 0.5:
        pool = range(-10 * n - 10, 10 * n + 10)
        return [rng.sample(pool, n)]  # all distinct
    lo, hi = (-5, 5) if size == "small" else (-n, n)
    return [[rng.randint(lo, hi) for _ in range(n)]]
```

```python perf
def perf(rng):
    # 100,000 distinct values: no duplicate, so nothing can stop early.
    return [rng.sample(range(-10**9, 10**9), 100_000)]
```

## Hints

1. For each value you only need to know one thing: have I seen it before?
2. A `set` answers "is x in here?" in O(1) on average. A list needs O(n).
3. Add values to a set one by one, and return `True` the moment a value is already there.

## Solution

```python solution time="n" space="n"
class Solution:
    def containsDuplicate(self, nums: List[int]) -> bool:
        seen = set()
        for x in nums:
            if x in seen:
                return True
            seen.add(x)
        return False
```

A set remembers every value seen so far, and checking membership takes O(1) on average. One pass is enough, and it can stop at the first repeat. In the worst case (no duplicates) the set holds all n values.

## Alternatives

### Compare every pair

```python alt time="n²" space="1" slow oracle
class Solution:
    def containsDuplicate(self, nums: List[int]) -> bool:
        for i in range(len(nums)):
            for j in range(i + 1, len(nums)):
                if nums[i] == nums[j]:
                    return True
        return False
```

No extra memory, but about n²/2 comparisons.

### Sort, then compare neighbours

```python alt time="n log n" space="n"
class Solution:
    def containsDuplicate(self, nums: List[int]) -> bool:
        s = sorted(nums)
        return any(a == b for a, b in zip(s, s[1:]))
```

After sorting, equal values sit next to each other. This is a good answer when memory is tight: sort in place with `nums.sort()` and the extra space drops to O(1), at the price of changing the caller's list.

### Compare the set's size

```python alt time="n" space="n"
class Solution:
    def containsDuplicate(self, nums: List[int]) -> bool:
        return len(set(nums)) < len(nums)
```

The same idea in one line: duplicates collapse in a set, so the set is smaller. It always builds the whole set, so it can't stop early, but it runs in C and is very fast in practice.

## Wrong answers

### Compares neighbours without sorting

```python wrong fails="edge" test="duplicates far apart"
class Solution:
    def containsDuplicate(self, nums: List[int]) -> bool:
        for i in range(len(nums) - 1):
            if nums[i] == nums[i + 1]:  # only works if the list is sorted
                return True
        return False
```

Comparing neighbours only finds duplicates that happen to sit next to each other. It passes all three examples, but `[9, 1, 2, 9]` has its copies far apart. This is why Check runs hidden tests.

### Returns after the first value

```python wrong fails="example" test="Example 1"
class Solution:
    def containsDuplicate(self, nums: List[int]) -> bool:
        seen = set()
        for x in nums:
            if x in seen:
                return True
            seen.add(x)
            return False  # indented one level too deep: the loop never gets past the first value
```

The final `return False` belongs after the loop. Indented inside it, the function gives up after looking at one value.

### Counts every value

```python wrong fails="perf"
class Solution:
    def containsDuplicate(self, nums: List[int]) -> bool:
        for x in nums:
            if nums.count(x) > 1:  # count() scans the whole list every time
                return True
        return False
```

It reads like one pass, but `nums.count(x)` scans the whole list, so the loop is O(n²): 10¹⁰ comparisons for 100,000 values. Hidden loops inside built-in calls are a classic source of slow code.
