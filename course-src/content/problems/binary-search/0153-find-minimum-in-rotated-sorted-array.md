---
id: 153
module: binary-search
patterns: [binary search, rotated order]
signature: "def findMin(self, nums: List[int]) -> int"
perf_repeat: 50000
---

## Task

Take a list of distinct integers sorted from smallest to largest, cut it into two pieces at some position, and swap the pieces: `[1, 2, 3, 4, 5]` might become `[4, 5, 1, 2, 3]`. That's `nums`. The cut may also be at the very start, which leaves the list fully sorted.

Return the smallest value in `nums`. Aim for O(log n) time.

## Constraints

- `1 <= len(nums) <= 100_000`
- `-10**9 <= nums[i] <= 10**9`, all different
- `nums` is a sorted list that was rotated (possibly by zero positions)

```json examples
[
  {"args": [[15, 18, 22, 3, 7, 9]], "out": 3, "why": "The list was cut before 3: the values climb to 22, drop to 3, and climb again."},
  {"args": [[6, 1, 2, 4, 5]], "out": 1, "why": "The drop comes right after the first value."},
  {"args": [[2, 4, 6, 8]], "out": 2, "why": "No rotation: the smallest value is still first."}
]
```

```json edge
[
  {"name": "one value", "args": [[5]], "out": 5},
  {"name": "two values, rotated", "args": [[2, 1]], "out": 1},
  {"name": "two values, sorted", "args": [[1, 2]], "out": 1},
  {"name": "the middle is the minimum", "args": [[4, 5, 1, 2, 3]], "out": 1},
  {"name": "minimum at the end", "args": [[2, 3, 4, 5, 1]], "out": 1},
  {"name": "negative values", "args": [[-1, 5, 9, -8, -4]], "out": -8},
  {"name": "extreme values", "args": [[1000000000, -1000000000]], "out": -1000000000}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 8) if size == "small" else rng.randint(20, 300)
    values = sorted(rng.sample(range(-50, 51) if size == "small" else range(-10**6, 10**6), n))
    cut = rng.randrange(n)
    return [values[cut:] + values[:cut]]
```

```python perf
def perf(rng):
    # 100,000 values, rotated so the minimum sits near the end. The search runs 50,000 times on the same list.
    values = sorted(rng.sample(range(-10**9, 10**9), 100_000))
    cut = 99_000
    return [values[cut:] + values[:cut]]
```

## Hints

1. Compare the middle value with the last value. If the middle is bigger, the drop (and the minimum) must be to the right of the middle.
2. If the middle is smaller than the last value, everything from the middle to the end is sorted, so the minimum is the middle or something to its left.
3. Keep the minimum inside `lo..hi`: move `lo` to `mid + 1` in the first case and `hi` to `mid` (not `mid - 1`) in the second. Stop when `lo == hi`.

## Solution

```python solution time="log n" space="1"
class Solution:
    def findMin(self, nums: List[int]) -> int:
        lo, hi = 0, len(nums) - 1  # the minimum is always in nums[lo..hi]
        while lo < hi:
            mid = (lo + hi) // 2
            if nums[mid] > nums[hi]:
                lo = mid + 1  # the drop is after mid, so mid isn't the minimum
            else:
                hi = mid  # mid..hi is sorted; mid may itself be the minimum
        return nums[lo]
```

A rotated list climbs, drops once, and climbs again; the minimum is right after the drop (or at the start, if there's no drop). Compare `nums[mid]` with `nums[hi]`. If `nums[mid] > nums[hi]`, the values fall somewhere between them, so the drop and the minimum are strictly to the right of `mid`. Otherwise `nums[mid..hi]` climbs without a drop, so nothing after `mid` is smaller than `nums[mid]`; the minimum is at `mid` or to its left, which is why `hi` becomes `mid`, not `mid - 1`.

Both updates shrink the range, and the minimum never leaves it, so when `lo == hi` it's the answer. That takes O(log n) steps and no extra space.

## Alternatives

### Use min()

```python alt time="n" space="1" slow oracle
class Solution:
    def findMin(self, nums: List[int]) -> int:
        return min(nums)
```

Correct for any list, and fast once: `min` runs in C. But it looks at all n values, and the performance test asks 50,000 times on a list of 100,000.

### Find the drop by comparing with the first value

```python alt time="log n" space="1"
class Solution:
    def findMin(self, nums: List[int]) -> int:
        if nums[0] <= nums[-1]:
            return nums[0]  # not rotated
        lo, hi = 0, len(nums) - 1
        while lo < hi:
            mid = (lo + hi) // 2
            if nums[mid] >= nums[0]:
                lo = mid + 1  # still in the first, higher piece
            else:
                hi = mid
        return nums[lo]
```

Every value in the first piece is at least `nums[0]`, and every value in the second piece is smaller. Searching for the first value below `nums[0]` finds the start of the second piece. The unrotated list needs its own check, because then there is no second piece.

## Wrong answers

### Compares the middle with the first value of the range

```python wrong fails="example" test="Example 1"
class Solution:
    def findMin(self, nums: List[int]) -> int:
        lo, hi = 0, len(nums) - 1
        while lo < hi:
            mid = (lo + hi) // 2
            if nums[mid] >= nums[lo]:  # true in an unrotated list too, which sends the search right
                lo = mid + 1
            else:
                hi = mid
        return nums[lo]
```

"The left part is sorted" doesn't tell you where the minimum is: a sorted stretch can also *contain* the minimum. In Example 1 the search narrows to `[3, 7, 9]`, which is sorted, so this version moves right past the 3 and ends on 9. Comparing with `nums[hi]` gives a test that decides the direction correctly.

### Moves hi past the middle

```python wrong fails="edge" test="the middle is the minimum"
class Solution:
    def findMin(self, nums: List[int]) -> int:
        lo, hi = 0, len(nums) - 1
        while lo <= hi:
            mid = (lo + hi) // 2
            if nums[mid] > nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1  # drops mid, which may be the minimum
        return nums[lo]
```

When `nums[mid]` is not bigger than `nums[hi]`, `mid` itself might be the minimum. Setting `hi = mid - 1` throws it away. In `[4, 5, 1, 2, 3]` the first middle is the 1, and the search never sees it again.

### Sorts a copy

```python wrong fails="perf"
class Solution:
    def findMin(self, nums: List[int]) -> int:
        return sorted(nums)[0]  # O(n log n) to find one value
```

Sorting finds the minimum, but it does far more work than needed, and it repeats it for every call: 50,000 sorts of 100,000 values.
