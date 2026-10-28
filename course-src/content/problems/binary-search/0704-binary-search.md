---
id: 704
module: binary-search
patterns: [binary search, closed interval]
signature: "def search(self, nums: List[int], target: int) -> int"
perf_repeat: 50000
---

## Task

You get a list of distinct integers `nums`, sorted from smallest to largest, and an integer `target`. Return the position of `target` in `nums` (counting from 0), or `-1` if it isn't there.

Your solution should take O(log n) time: it may only look at a few dozen entries, even when the list holds 100,000.

## Constraints

- `1 <= len(nums) <= 100_000`
- `-10**9 <= nums[i], target <= 10**9`
- `nums` is sorted in increasing order, with no repeats

```json examples
[
  {"args": [[2, 5, 8, 12, 16, 23, 38, 56], 23], "out": 5, "why": "23 sits at position 5."},
  {"args": [[2, 5, 8, 12, 16], 13], "out": -1, "why": "13 would fall between 12 and 16, but it isn't in the list."},
  {"args": [[7], 7], "out": 0, "why": "A list of one value: the target is at position 0."}
]
```

```json edge
[
  {"name": "target is the first value", "args": [[1, 3, 5, 7], 1], "out": 0},
  {"name": "target is the last value", "args": [[1, 3, 5, 7], 7], "out": 3},
  {"name": "smaller than everything", "args": [[4, 9, 13], -2], "out": -1},
  {"name": "larger than everything", "args": [[4, 9, 13], 20], "out": -1},
  {"name": "one value, missing", "args": [[7], 8], "out": -1},
  {"name": "two values", "args": [[10, 20], 20], "out": 1},
  {"name": "negative values", "args": [[-30, -12, -5, 0], -12], "out": 1},
  {"name": "extreme values", "args": [[-1000000000, 0, 1000000000], 1000000000], "out": 2}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 8) if size == "small" else rng.randint(20, 300)
    nums = sorted(rng.sample(range(-50, 51) if size == "small" else range(-10**6, 10**6), n))
    target = rng.choice(nums) if rng.random() < 0.6 else rng.randint(nums[0] - 3, nums[-1] + 3)
    return [nums, target]
```

```python perf
def perf(rng):
    # 100,000 sorted values and a target near the end. The search runs 50,000 times on the same list:
    # 50,000 binary searches take a fraction of a second; 50,000 scans of the list take billions of steps.
    nums = sorted(rng.sample(range(-10**9, 10**9), 100_000))
    return [nums, nums[-7]]
```

## Hints

1. Compare `target` with the middle value. Whichever way it goes, half of the list can't contain the target.
2. Keep two positions `lo` and `hi` that bracket the part of the list where the target could still be. Each step moves one of them past the middle.
3. With `lo` and `hi` both inclusive, loop `while lo <= hi`, and move to `mid + 1` or `mid - 1` so the range always shrinks.

## Solution

```python solution time="log n" space="1"
class Solution:
    def search(self, nums: List[int], target: int) -> int:
        lo, hi = 0, len(nums) - 1  # the target, if present, is in nums[lo..hi]
        while lo <= hi:
            mid = (lo + hi) // 2
            if nums[mid] == target:
                return mid
            if nums[mid] < target:
                lo = mid + 1  # nums[lo..mid] are all too small
            else:
                hi = mid - 1  # nums[mid..hi] are all too big
        return -1
```

The loop keeps one promise: if the target is in the list, it's somewhere in `nums[lo..hi]`. Comparing with the middle value rules out half of that range, because the list is sorted: if `nums[mid]` is too small, so is everything to its left. The new bounds skip `mid` itself, which was just checked, so the range shrinks every round.

When `lo` passes `hi`, the range is empty and the target isn't there. Each round halves the range, so a list of 100,000 values needs at most 17 rounds: O(log n) time and O(1) space.

## Alternatives

### Check every position

```python alt time="n" space="1" slow oracle
class Solution:
    def search(self, nums: List[int], target: int) -> int:
        for i, x in enumerate(nums):
            if x == target:
                return i
        return -1
```

It works on any list, sorted or not, and it's fine for one search. It ignores the sorted order, though, so each search may look at all n values.

### Use the bisect module

```python alt time="log n" space="1"
class Solution:
    def search(self, nums: List[int], target: int) -> int:
        i = bisect_left(nums, target)  # first position whose value is >= target
        return i if i < len(nums) and nums[i] == target else -1
```

`bisect_left` returns where the target would be inserted to keep the list sorted, which is its position if it's present. It runs in C, so it's the fastest choice in Python. Interviewers usually want to see the loop written out at least once.

## Wrong answers

### Stops one step too early

```python wrong fails="example" test="Example 3"
class Solution:
    def search(self, nums: List[int], target: int) -> int:
        lo, hi = 0, len(nums) - 1
        while lo < hi:  # with hi inclusive, lo == hi still leaves one value unchecked
            mid = (lo + hi) // 2
            if nums[mid] == target:
                return mid
            if nums[mid] < target:
                lo = mid + 1
            else:
                hi = mid - 1
        return -1
```

With an inclusive `hi`, the range `lo..hi` still holds one value when `lo == hi`. Looping only `while lo < hi` gives up without checking it, so a one-value list never finds its target. The loop condition has to match how the bounds are defined.

### Moves lo to mid instead of past it

```python wrong fails="example" test="Example 2" how="timeout"
class Solution:
    def search(self, nums: List[int], target: int) -> int:
        lo, hi = 0, len(nums) - 1
        while lo <= hi:
            mid = (lo + hi) // 2
            if nums[mid] == target:
                return mid
            if nums[mid] < target:
                lo = mid  # mid was already checked; when hi - lo <= 1 this changes nothing
            else:
                hi = mid - 1
        return -1
```

When `lo` and `hi` are next to each other, `mid` equals `lo`, so `lo = mid` leaves the range exactly as it was and the loop never ends. Every update must exclude `mid`, which was just checked, so the range always shrinks.

### Scans the list with index()

```python wrong fails="perf"
class Solution:
    def search(self, nums: List[int], target: int) -> int:
        return nums.index(target) if target in nums else -1  # two linear scans
```

`in` and `index` both walk the list from the start, so each search is O(n), twice. That's fine once, but the performance test searches 50,000 times, and a search near the end of 100,000 values costs about 200,000 comparisons each time.

## Notes

In languages with fixed-size integers, `(lo + hi) // 2` can overflow when `lo + hi` exceeds the integer range, so you'll often see `lo + (hi - lo) // 2`. Python's integers never overflow, so both forms are safe here, but the second is a good habit when you switch languages.
