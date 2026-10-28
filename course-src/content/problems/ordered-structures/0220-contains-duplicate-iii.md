---
id: 220
module: ordered-structures
patterns: [buckets of width t + 1, sliding window]
signature: "def containsNearbyAlmostDuplicate(self, nums: List[int], indexDiff: int, valueDiff: int) -> bool"
---

## Task

Return `True` if `nums` has two different positions `i` and `j` that are close in both senses: at most `indexDiff` apart, `abs(i - j) <= indexDiff`, and holding values at most `valueDiff` apart, `abs(nums[i] - nums[j]) <= valueDiff`. Otherwise return `False`.

## Constraints

- `2 <= len(nums) <= 100_000`
- `-10**9 <= nums[i] <= 10**9`
- `1 <= indexDiff <= len(nums)`
- `0 <= valueDiff <= 10**9`

```json examples
[
  {"args": [[8, 20, 13, 26], 2, 5], "out": true, "why": "8 and 13 are two positions apart and differ by 5."},
  {"args": [[4, 30, 60, 3], 2, 1], "out": false, "why": "4 and 3 differ by only 1, but they're three positions apart. No other pair is close in value."},
  {"args": [[-7, 15, -4], 3, 3], "out": true, "why": "Negative numbers work the same way: -7 and -4 differ by exactly 3."}
]
```

```json edge
[
  {"name": "equal neighbours", "args": [[5, 5], 1, 0], "out": true},
  {"name": "no repeats when valueDiff is 0", "args": [[1, 2, 3, 4], 3, 0], "out": false},
  {"name": "close values in neighbouring buckets", "args": [[7, 8], 1, 3], "out": true},
  {"name": "neighbouring buckets, too far apart", "args": [[4, 11], 1, 3], "out": false},
  {"name": "either side of zero", "args": [[-3, 3], 1, 3], "out": false},
  {"name": "the window has moved on", "args": [[1, 50, 60, 1], 2, 0], "out": false},
  {"name": "extremes", "args": [[1000000000, -1000000000, 1000000000], 2, 0], "out": true},
  {"name": "the full range", "args": [[-1000000000, 1000000000], 1, 1000000000], "out": false}
]
```

```python oracle
class Solution:
    def containsNearbyAlmostDuplicate(self, nums: List[int], indexDiff: int, valueDiff: int) -> bool:
        for i in range(len(nums)):
            for j in range(i + 1, min(len(nums), i + indexDiff + 1)):
                if abs(nums[i] - nums[j]) <= valueDiff:
                    return True
        return False
```

```python gen
def gen(rng, size):
    if size == "small":
        n = rng.randint(2, 8)
        nums = [rng.randint(-10, 10) for _ in range(n)]
        return [nums, rng.randint(1, n), rng.randint(0, 4)]
    n = rng.randint(20, 300)
    spread = rng.choice([100, 10_000, 10**9])
    nums = [rng.randint(-spread, spread) for _ in range(n)]
    return [nums, rng.randint(1, n), rng.choice([0, 1, rng.randint(0, spread // 50)])]
```

```python perf
def perf(rng):
    # 100,000 different multiples of 1,000 and valueDiff 999: no pair is close, so everything must be checked,
    # with a window of 1,000 positions.
    nums = [1000 * x for x in rng.sample(range(-10**6, 10**6), 100_000)]
    return [nums, 1_000, 999]
```

## Hints

1. Comparing each number with the `indexDiff` before it is O(n · indexDiff). Keep only the last `indexDiff` numbers as a window, and look for a close value among them quickly.
2. Cut the number line into buckets of width `w = valueDiff + 1`, with `x` going to bucket `x // w`. Two numbers in the same bucket differ by at most `valueDiff`, so if the window ever has two numbers in one bucket, the answer is `True`.
3. So each bucket holds at most one number of the window: a dict from bucket to number. For a new number, check its own bucket and the two neighbouring buckets (only those can hold a close value), then add it, and remove the number that just left the window.

## Solution

```python solution time="n" space="k"
class Solution:
    def containsNearbyAlmostDuplicate(self, nums: List[int], indexDiff: int, valueDiff: int) -> bool:
        w = valueDiff + 1  # bucket width: numbers in one bucket differ by at most valueDiff
        bucket = {}        # bucket number -> the window's number in it (never more than one)
        for i, x in enumerate(nums):
            b = x // w     # floor division, so negative numbers get their own buckets
            if b in bucket:
                return True
            if b - 1 in bucket and x - bucket[b - 1] <= valueDiff:
                return True
            if b + 1 in bucket and bucket[b + 1] - x <= valueDiff:
                return True
            bucket[b] = x
            if i >= indexDiff:  # the number indexDiff positions back leaves the window
                del bucket[nums[i - indexDiff] // w]
        return False
```

Buckets of width `valueDiff + 1` turn "is there a value within `valueDiff`?" into a few dict lookups. Two numbers in the same bucket are always close enough, so a window that's still searching never has two numbers in one bucket, and the dict can map each bucket to a single number. A close value can also sit in a neighbouring bucket, so those two get an explicit check; any bucket further away is more than `valueDiff` away.

The dict only ever holds the last `indexDiff` numbers: each number is added once and deleted once, and the delete always finds its bucket because that bucket held only that number. O(n) time and O(indexDiff) space. Python's `//` rounds down, even for negative numbers, so −3 and 3 land in different buckets, as they should.

## Alternatives

### A sorted window with bisect

```python alt time="n · k" space="k"
class Solution:
    def containsNearbyAlmostDuplicate(self, nums: List[int], indexDiff: int, valueDiff: int) -> bool:
        window = []  # the last indexDiff numbers, sorted
        for i, x in enumerate(nums):
            j = bisect_left(window, x - valueDiff)  # the smallest number that's at least x - valueDiff
            if j < len(window) and window[j] <= x + valueDiff:
                return True
            insort(window, x)
            if i >= indexDiff:
                del window[bisect_left(window, nums[i - indexDiff])]
        return False
```

The textbook answer uses an ordered set: find the smallest number at least `x − valueDiff`, and check that it's at most `x + valueDiff`. A sorted list with `bisect` does the search in O(log k), but inserting and deleting shift part of the list, so a window of k numbers costs O(k) per step, as block moves. That's fine for this test's window of 1,000, and slower than buckets as the window grows.

## Wrong answers

### Checks only the number's own bucket

```python wrong fails="example" test="Example 1"
class Solution:
    def containsNearbyAlmostDuplicate(self, nums: List[int], indexDiff: int, valueDiff: int) -> bool:
        w = valueDiff + 1
        bucket = {}
        for i, x in enumerate(nums):
            b = x // w
            if b in bucket:  # close values in the next bucket over are missed
                return True
            bucket[b] = x
            if i >= indexDiff:
                del bucket[nums[i - indexDiff] // w]
        return False
```

Two close numbers don't have to share a bucket: one can sit near the top of a bucket and the other near the bottom of the next. In Example 1, with buckets of width 6, 8 is in bucket 1 and 13 in bucket 2, so their difference of 5 goes unnoticed. Check the neighbouring buckets as well.

### Never removes numbers that leave the window

```python wrong fails="example" test="Example 2"
class Solution:
    def containsNearbyAlmostDuplicate(self, nums: List[int], indexDiff: int, valueDiff: int) -> bool:
        w = valueDiff + 1
        bucket = {}
        for x in nums:
            b = x // w
            if b in bucket:
                return True
            if b - 1 in bucket and x - bucket[b - 1] <= valueDiff:
                return True
            if b + 1 in bucket and bucket[b + 1] - x <= valueDiff:
                return True
            bucket[b] = x  # stays forever, however far back it is
        return False
```

The buckets handle the values, but the positions matter too: a number more than `indexDiff` back must not count. In Example 2, 4 is still in the dict when 3 arrives three positions later, and the answer comes out `True`. Delete the number that leaves the window at each step.

### Rounds negative buckets towards zero

```python wrong fails="edge" test="either side of zero"
class Solution:
    def containsNearbyAlmostDuplicate(self, nums: List[int], indexDiff: int, valueDiff: int) -> bool:
        w = valueDiff + 1
        bucket = {}
        for i, x in enumerate(nums):
            b = int(x / w)  # -3 / 4 rounds to 0, the same bucket as 3
            if b in bucket:
                return True
            if b - 1 in bucket and x - bucket[b - 1] <= valueDiff:
                return True
            if b + 1 in bucket and bucket[b + 1] - x <= valueDiff:
                return True
            bucket[b] = x
            if i >= indexDiff:
                del bucket[int(nums[i - indexDiff] / w)]
        return False
```

`int(x / w)` rounds towards zero, so bucket 0 covers −3 to 3 when `w` is 4: twice as wide as the others. −3 and 3 differ by 6 but share it, and the function answers `True`. Python's `x // w` rounds down, which keeps every bucket the same width. (In Java or C++, this is the bug to watch for, since their division rounds towards zero.)

### Compares each number with the whole window

```python wrong fails="perf"
class Solution:
    def containsNearbyAlmostDuplicate(self, nums: List[int], indexDiff: int, valueDiff: int) -> bool:
        for i in range(len(nums)):
            for j in range(i + 1, min(len(nums), i + indexDiff + 1)):  # up to indexDiff comparisons each
                if abs(nums[i] - nums[j]) <= valueDiff:
                    return True
        return False
```

Correct, but O(n · indexDiff). The test has no close pair, so nothing stops it early: 100,000 numbers times a window of 1,000 is 100 million comparisons. Buckets need three lookups per number.
