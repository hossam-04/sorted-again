---
id: 33
module: binary-search
patterns: [binary search, rotated order, sorted half]
signature: "def search(self, nums: List[int], target: int) -> int"
perf_repeat: 50000
---

## Task

`nums` is a list of distinct integers that was sorted from smallest to largest and then rotated: cut in two at some position, with the two pieces swapped. For example, `[1, 2, 3, 4, 5]` might become `[4, 5, 1, 2, 3]`. The cut may also be at the start, leaving the list sorted.

Return the position of `target` in `nums`, or `-1` if it isn't there. Aim for O(log n) time.

## Constraints

- `1 <= len(nums) <= 100_000`
- `-10**9 <= nums[i], target <= 10**9`, and the values of `nums` are all different
- `nums` is a sorted list that was rotated (possibly by zero positions)

```json examples
[
  {"args": [[15, 18, 22, 3, 7, 9], 7], "out": 4, "why": "7 sits at position 4, in the second piece."},
  {"args": [[15, 18, 22, 3, 7, 9], 10], "out": -1, "why": "10 would belong between 9 and 15, but it isn't in the list."},
  {"args": [[5, 1, 3], 5], "out": 0, "why": "The target is the first value, the largest one before the drop."}
]
```

```json edge
[
  {"name": "one value, present", "args": [[8], 8], "out": 0},
  {"name": "one value, missing", "args": [[8], 3], "out": -1},
  {"name": "not rotated", "args": [[1, 2, 3, 4, 5], 4], "out": 3},
  {"name": "two values, target second", "args": [[3, 1], 1], "out": 1},
  {"name": "two values, target first", "args": [[3, 1], 3], "out": 0},
  {"name": "target is the minimum", "args": [[15, 18, 22, 3, 7, 9], 3], "out": 3},
  {"name": "target is the maximum", "args": [[15, 18, 22, 3, 7, 9], 22], "out": 2},
  {"name": "target just before the drop", "args": [[6, 7, 1, 2, 3, 4, 5], 7], "out": 1},
  {"name": "smaller than everything", "args": [[6, 7, 1, 2], 0], "out": -1}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 8) if size == "small" else rng.randint(20, 300)
    values = sorted(rng.sample(range(-50, 51) if size == "small" else range(-10**6, 10**6), n))
    cut = rng.randrange(n)
    nums = values[cut:] + values[:cut]
    target = rng.choice(nums) if rng.random() < 0.6 else rng.randint(values[0] - 3, values[-1] + 3)
    return [nums, target]
```

```python perf
def perf(rng):
    # 100,000 rotated values and a target near the end of the list, searched 50,000 times.
    values = sorted(rng.sample(range(-10**9, 10**9), 100_000))
    nums = values[40_000:] + values[:40_000]
    return [nums, nums[-3]]
```

## Hints

1. Split a rotated list at any position and at least one of the two halves is sorted.
2. Find out which half is sorted by comparing `nums[lo]` with `nums[mid]`. A sorted half has its smallest value first and its largest last.
3. If the target lies within the sorted half's range, search there; otherwise it can only be in the other half.

## Solution

```python solution time="log n" space="1"
class Solution:
    def search(self, nums: List[int], target: int) -> int:
        lo, hi = 0, len(nums) - 1
        while lo <= hi:
            mid = (lo + hi) // 2
            if nums[mid] == target:
                return mid
            if nums[lo] <= nums[mid]:  # nums[lo..mid] is sorted
                if nums[lo] <= target < nums[mid]:
                    hi = mid - 1
                else:
                    lo = mid + 1
            else:  # nums[mid..hi] is sorted
                if nums[mid] < target <= nums[hi]:
                    lo = mid + 1
                else:
                    hi = mid - 1
        return -1
```

The list has at most one drop, so of the two halves around `mid`, one doesn't contain the drop and is sorted. If `nums[lo] <= nums[mid]`, the left half is the sorted one; otherwise the right half is. For the sorted half you can tell exactly whether the target is inside its range, because its ends are its minimum and maximum. If it is, search there; if not, the target can only be in the other half.

The `<=` in `nums[lo] <= nums[mid]` matters when `lo == mid` (two values left): then the "left half" is just one value, which counts as sorted. Each round discards half the range: O(log n) time, O(1) space.

## Alternatives

### Scan with index()

```python alt time="n" space="1" slow oracle
class Solution:
    def search(self, nums: List[int], target: int) -> int:
        return nums.index(target) if target in nums else -1
```

Correct and short, and fine for a single search. But it doesn't use the order at all, so it's O(n) per search.

### Find the rotation, then search the right piece

```python alt time="log n" space="1"
class Solution:
    def search(self, nums: List[int], target: int) -> int:
        lo, hi = 0, len(nums) - 1
        while lo < hi:  # find the index of the minimum
            mid = (lo + hi) // 2
            if nums[mid] > nums[hi]:
                lo = mid + 1
            else:
                hi = mid
        start = lo
        lo, hi = (start, len(nums) - 1) if nums[start] <= target <= nums[-1] else (0, start - 1)
        while lo <= hi:  # an ordinary binary search inside one sorted piece
            mid = (lo + hi) // 2
            if nums[mid] == target:
                return mid
            if nums[mid] < target:
                lo = mid + 1
            else:
                hi = mid - 1
        return -1
```

Two simpler searches instead of one clever one: first find where the sorted list starts ([[p:153]]), then do a plain binary search in whichever piece could hold the target. It's longer, but each part is easy to check, which is often worth more in an interview.

## Wrong answers

### Ignores the rotation

```python wrong fails="example" test="Example 1"
class Solution:
    def search(self, nums: List[int], target: int) -> int:
        lo, hi = 0, len(nums) - 1
        while lo <= hi:
            mid = (lo + hi) // 2
            if nums[mid] == target:
                return mid
            if nums[mid] < target:  # only true for a list that's sorted end to end
                lo = mid + 1
            else:
                hi = mid - 1
        return -1
```

A plain binary search assumes that everything right of a small value is larger. In `[15, 18, 22, 3, 7, 9]`, the middle value 22 is bigger than 7, so it searches left, but 7 is on the right, after the drop.

### Uses < to spot the sorted half

```python wrong fails="edge" test="two values, target second"
class Solution:
    def search(self, nums: List[int], target: int) -> int:
        lo, hi = 0, len(nums) - 1
        while lo <= hi:
            mid = (lo + hi) // 2
            if nums[mid] == target:
                return mid
            if nums[lo] < nums[mid]:  # false when lo == mid, so a one-value left half counts as unsorted
                if nums[lo] <= target < nums[mid]:
                    hi = mid - 1
                else:
                    lo = mid + 1
            else:
                if nums[mid] < target <= nums[hi]:
                    lo = mid + 1
                else:
                    hi = mid - 1
        return -1
```

With two values left, `mid == lo`, and the left half is the single value `nums[mid]`. A strict `<` says it isn't sorted, so the code assumes the right half `nums[mid..hi]` is, which it may not be. For `[3, 1]` and target 1, the range check `3 < 1 <= 1` fails and the search moves the wrong way.

### Rotates the list back first

```python wrong fails="perf"
class Solution:
    def search(self, nums: List[int], target: int) -> int:
        k = nums.index(min(nums))  # two full scans to find the rotation
        fixed = nums[k:] + nums[:k]  # and a full copy
        i = bisect_left(fixed, target)
        if i < len(fixed) and fixed[i] == target:
            return (i + k) % len(nums)
        return -1
```

Undoing the rotation makes the search simple, but finding the rotation with `min` and `index` and copying the list are all O(n). The binary search at the end can't make up for that, and the performance test repeats the call 50,000 times.
