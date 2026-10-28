---
id: 128
module: arrays
patterns: [hash set, start of a run]
signature: "def longestConsecutive(self, nums: List[int]) -> int"
---

## Task

You get a list of integers `nums` in no particular order. A *run* is a set of consecutive integers `x, x + 1, ..., x + k - 1` that all appear somewhere in `nums`; where they appear doesn't matter.

Return the length of the longest run. Repeated values count once. An empty list has no run, so return 0.

Aim for O(n) time, which rules out sorting.

## Constraints

- `0 <= len(nums) <= 100_000`
- `-10**9 <= nums[i] <= 10**9`

```json examples
[
  {"args": [[10, 5, 12, 3, 11, 4, 13]], "out": 4, "why": "10, 11, 12 and 13 are all present. 3, 4, 5 is a shorter run."},
  {"args": [[7, 7, 8, 8, 9]], "out": 3, "why": "Repeated values don't make a run longer: the run is 7, 8, 9."},
  {"args": [[]], "out": 0, "why": "No numbers, so no run."}
]
```

```json edge
[
  {"name": "one number", "args": [[42]], "out": 1},
  {"name": "no neighbours at all", "args": [[1, 3, 5, 7]], "out": 1},
  {"name": "all equal", "args": [[6, 6, 6]], "out": 1},
  {"name": "negative run", "args": [[-3, -1, -2, 5]], "out": 3},
  {"name": "run across zero", "args": [[1, -1, 0]], "out": 3},
  {"name": "run in reverse order", "args": [[9, 8, 7, 6, 5, 4, 3, 2, 1]], "out": 9},
  {"name": "longer run comes second", "args": [[1, 2, 10, 11, 12, 13]], "out": 4},
  {"name": "extreme values", "args": [[1000000000, 999999999, -1000000000]], "out": 2}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(0, 9) if size == "small" else rng.randint(20, 300)
    spread = max(3, n * 2) if rng.random() < 0.7 else 10**9
    nums = [rng.randint(-spread, spread) for _ in range(n)]
    if n and rng.random() < 0.5:  # plant a run
        start = rng.randint(-spread, spread)
        nums += list(range(start, start + rng.randint(1, max(1, n // 2))))
        rng.shuffle(nums)
    return [nums]
```

```python perf
def perf(rng):
    # One run of 100,000 consecutive numbers, shuffled. Counting up from every number costs n²/2 steps.
    start = rng.randint(-10**9, 10**9 - 100_000)
    nums = list(range(start, start + 100_000))
    rng.shuffle(nums)
    return [nums]
```

## Hints

1. Put the numbers in a set, so "is x present?" takes O(1).
2. From any number you could count upward while `x + 1` is present, but doing that from every number repeats the same work many times.
3. Only start counting at a number `x` whose `x - 1` is *not* present: that's the beginning of a run. Each run is then walked exactly once.

## Solution

```python solution time="n" space="n"
class Solution:
    def longestConsecutive(self, nums: List[int]) -> int:
        present = set(nums)
        best = 0
        for x in present:
            if x - 1 in present:
                continue  # x is inside a run; that run is counted from its start
            length = 1
            while x + length in present:
                length += 1
            best = max(best, length)
        return best
```

The set answers "is this number here?" in O(1) and removes duplicates for free. The loop only counts from numbers that start a run (their predecessor is missing), and from there it walks up to the run's end.

Every number belongs to exactly one run, and each run is walked once, from its start. So the `while` loop runs n times in total across the whole `for` loop, even though it sits inside it. With the set's O(n) construction, the whole thing is O(n) time and O(n) space.

## Alternatives

### Sort, then scan

```python alt time="n log n" space="n" oracle
class Solution:
    def longestConsecutive(self, nums: List[int]) -> int:
        if not nums:
            return 0
        xs = sorted(set(nums))
        best = cur = 1
        for a, b in zip(xs, xs[1:]):
            cur = cur + 1 if b == a + 1 else 1
            best = max(best, cur)
        return best
```

After sorting the distinct values, every run is a stretch of neighbours that differ by 1. It's simple and fast in practice, but the sort makes it O(n log n), which the task asks you to avoid.

## Wrong answers

### Sorts but forgets duplicates

```python wrong fails="example" test="Example 2"
class Solution:
    def longestConsecutive(self, nums: List[int]) -> int:
        if not nums:
            return 0
        xs = sorted(nums)  # duplicates stay in the list
        best = cur = 1
        for a, b in zip(xs, xs[1:]):
            cur = cur + 1 if b == a + 1 else 1  # a repeated value resets the run
            best = max(best, cur)
        return best
```

In `[7, 7, 8, 8, 9]` the sorted list has `7, 7` next to each other. They don't differ by 1, so the run resets and the answer comes out as 2. Remove duplicates first, or skip equal neighbours.

### Assumes the list is not empty

```python wrong fails="example" test="Example 3" how="error"
class Solution:
    def longestConsecutive(self, nums: List[int]) -> int:
        xs = sorted(set(nums))
        best = cur = 1
        prev = xs[0]  # IndexError when nums is empty
        for x in xs[1:]:
            cur = cur + 1 if x == prev + 1 else 1
            best = max(best, cur)
            prev = x
        return best
```

The run-counting is right, but `xs[0]` fails on an empty list. Check the empty case first, or start `best` at 0 and let the loop handle everything.

### Counts up from every number

```python wrong fails="perf"
class Solution:
    def longestConsecutive(self, nums: List[int]) -> int:
        present = set(nums)
        best = 0
        for x in present:
            length = 1
            while x + length in present:  # also counts from the middle of every run
                length += 1
            best = max(best, length)
        return best
```

This is the solution without the `x - 1` check. Each number counts to the end of its run, so a run of length k costs about k²/2 steps. For one run of 100,000 numbers that is 5 billion set lookups.

## Notes

A union-find (disjoint set) can also solve this in near-linear time by joining each `x` with `x + 1`; it's covered in the graphs module. The set solution is simpler and is what interviewers expect.
