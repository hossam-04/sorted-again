---
id: 480
module: ordered-structures
patterns: [two heaps with lazy deletion, sliding window]
signature: "def medianSlidingWindow(self, nums: List[int], k: int) -> List[float]"
compare: float
---

## Task

A window of `k` consecutive numbers slides along `nums`, one position at a time, from the start of the list to its end. Return the median of every window, in order: the middle number once the window is sorted, or the mean of the two middle numbers when `k` is even.

Answers within 10⁻⁵ of the exact medians are accepted.

## Constraints

- `1 <= k <= len(nums) <= 100_000`
- `-2**31 <= nums[i] <= 2**31 - 1`

```json examples
[
  {"args": [[5, 2, 8, 1, 9, 3], 3], "out": [5.0, 2.0, 8.0, 3.0], "why": "Sorted, the four windows are 2 5 8, 1 2 8, 1 8 9 and 1 3 9: the middle numbers are 5, 2, 8 and 3."},
  {"args": [[4, 9, 6, 6], 2], "out": [6.5, 7.5, 6.0], "why": "With an even k, the median is the mean of the two middle numbers, which can end in .5."},
  {"args": [[-3, -3, 7, -3], 4], "out": [-3.0], "why": "A single window. Repeats count separately: sorted, -3 -3 -3 7 has two middle numbers that are both -3."}
]
```

```json edge
[
  {"name": "windows of one", "args": [[7, -2, 5], 1], "out": [7.0, -2.0, 5.0]},
  {"name": "the whole list as one window", "args": [[1, 2, 3, 4, 5], 5], "out": [3.0]},
  {"name": "the largest numbers", "args": [[2147483647, 2147483647], 2], "out": [2147483647.0]},
  {"name": "both extremes", "args": [[-2147483648, 2147483647], 2], "out": [-0.5]},
  {"name": "all equal", "args": [[6, 6, 6, 6], 3], "out": [6.0, 6.0]},
  {"name": "a value leaves and comes back", "args": [[1, 5, 1, 5, 1], 2], "out": [3.0, 3.0, 3.0, 3.0]},
  {"name": "the leaving number is the median", "args": [[1, 3, 5, 2, 4], 3], "out": [3.0, 3.0, 4.0]}
]
```

```python oracle
class Solution:
    def medianSlidingWindow(self, nums: List[int], k: int) -> List[float]:
        out = []
        for i in range(len(nums) - k + 1):
            w = sorted(nums[i:i + k])
            out.append(float(w[k // 2]) if k % 2 else (w[k // 2 - 1] + w[k // 2]) / 2)
        return out
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 8) if size == "small" else rng.randint(20, 300)
    hi = rng.choice([3, 10]) if size == "small" else rng.choice([5, 1000, 2**31 - 1])
    nums = [rng.randint(-hi, hi) for _ in range(n)]
    return [nums, rng.randint(1, n)]
```

```python perf
def perf(rng):
    # 40,000 numbers with a window of 10,000: re-sorting each of the 30,001 windows is far too much work.
    return [[rng.randint(-2**31, 2**31 - 1) for _ in range(40_000)], 10_000]
```

## Hints

1. For a single, growing list of numbers, [[p:295]] keeps the median at the top of two heaps. A window also has to *remove* the number that slides out, and heaps can't remove from the middle.
2. Remove lazily: remember that the leaving number is gone (a counter of pending removals), and only pop it when it reaches the top of its heap. Keep your own count of how many *live* numbers each heap holds.
3. Keep the lower half in a max-heap and the upper half in a min-heap, with the lower half's live count equal to the upper half's, or one more. After each removal and insertion, move one top across if those counts drift apart, and clean the tops so they're always live.

## Solution

```python solution time="n log n" space="n"
class Solution:
    def medianSlidingWindow(self, nums: List[int], k: int) -> List[float]:
        low, high = [], []         # the lower half (a max-heap, negated) and the upper half (a min-heap)
        low_size = high_size = 0   # live numbers in each heap
        gone = Counter()           # value -> copies removed from the window but still in a heap

        def prune(heap, sign):  # pop removed numbers off the top, so the top is always live
            while heap and gone[sign * heap[0]]:
                gone[sign * heap[0]] -= 1
                heappop(heap)

        def rebalance():
            nonlocal low_size, high_size
            if low_size > high_size + 1:
                heappush(high, -heappop(low))
                low_size, high_size = low_size - 1, high_size + 1
                prune(low, -1)
            elif low_size < high_size:
                heappush(low, -heappop(high))
                low_size, high_size = low_size + 1, high_size - 1
                prune(high, 1)

        def add(x):
            nonlocal low_size, high_size
            if not low or x <= -low[0]:
                heappush(low, -x)
                low_size += 1
            else:
                heappush(high, x)
                high_size += 1
            rebalance()

        def remove(x):
            nonlocal low_size, high_size
            gone[x] += 1
            if x <= -low[0]:  # x belongs to the lower half
                low_size -= 1
                if x == -low[0]:
                    prune(low, -1)
            else:
                high_size -= 1
                if x == high[0]:
                    prune(high, 1)
            rebalance()

        def median():
            return float(-low[0]) if k % 2 else (-low[0] + high[0]) / 2

        for x in nums[:k]:
            add(x)
        out = [median()]
        for i in range(k, len(nums)):
            add(nums[i])
            remove(nums[i - k])
            out.append(median())
        return out
```

This is [[p:295]]'s two heaps, plus removal. A heap can only remove its top, so a number leaving the window is recorded in `gone` and stays in its heap until it surfaces. `low_size` and `high_size` count only the live numbers, and those counts, not the heap lengths, decide when to move a top across. After every change the tops are pruned, so the median is always read from live numbers.

A removed number belongs to the lower half if it's at most the lower top: equal values are interchangeable, so which copy goes doesn't matter. Each number is pushed and popped a bounded number of times, so the whole slide is O(n log n). The heaps can hold numbers that already left, which is why the space is O(n) rather than O(k).

## Alternatives

### A sorted window with bisect

```python alt time="n · k" space="k"
class Solution:
    def medianSlidingWindow(self, nums: List[int], k: int) -> List[float]:
        window = sorted(nums[:k])
        out = []
        for i in range(k, len(nums) + 1):
            out.append(float(window[k // 2]) if k % 2 else (window[k // 2 - 1] + window[k // 2]) / 2)
            if i == len(nums):
                break
            del window[bisect_left(window, nums[i - k])]  # the number sliding out
            insort(window, nums[i])                      # the number sliding in
        return out
```

Keep the window sorted: then the median is just the middle entry. Finding a number's place is O(log k), but deleting and inserting shift part of the list, O(k) per step. Those shifts are block moves, so for windows of thousands this is quick and much simpler. With LeetCode's `SortedList` each step would be O(log k).

## Wrong answers

### Rounds the even median down

```python wrong fails="example" test="Example 2"
class Solution:
    def medianSlidingWindow(self, nums: List[int], k: int) -> List[float]:
        window = sorted(nums[:k])
        out = []
        for i in range(k, len(nums) + 1):
            out.append(window[k // 2] if k % 2 else (window[k // 2 - 1] + window[k // 2]) // 2)  # // rounds down
            if i == len(nums):
                break
            del window[bisect_left(window, nums[i - k])]
            insort(window, nums[i])
        return out
```

`//` is floor division, so the mean of 4 and 9 comes out as 6 instead of 6.5. Use `/` for the mean of the two middle numbers.

### Never removes the number that slides out

```python wrong fails="example" test="Example 1"
class Solution:
    def medianSlidingWindow(self, nums: List[int], k: int) -> List[float]:
        low, high = [], []
        out = []
        for i, x in enumerate(nums):
            if not low or x <= -low[0]:
                heappush(low, -x)
            else:
                heappush(high, x)
            if len(low) > len(high) + 1:
                heappush(high, -heappop(low))
            elif len(low) < len(high):
                heappush(low, -heappop(high))
            if i >= k - 1:  # the heaps hold everything so far, not just the window
                out.append(float(-low[0]) if (i + 1) % 2 else (-low[0] + high[0]) / 2)
        return out
```

These are the running-median heaps of [[p:295]], unchanged: they keep every number seen so far. The first window's median is right, but from then on it's the median of a growing prefix. In Example 1 the second answer is the median of 5 2 8 1, which is 3.5, instead of 2.

### Sorts every window again

```python wrong fails="perf"
class Solution:
    def medianSlidingWindow(self, nums: List[int], k: int) -> List[float]:
        out = []
        for i in range(len(nums) - k + 1):
            w = sorted(nums[i:i + k])  # O(k log k) for every window
            out.append(float(w[k // 2]) if k % 2 else (w[k // 2 - 1] + w[k // 2]) / 2)
        return out
```

Correct, and the clearest statement of the task. But consecutive windows share all but one number, and this throws that away: 30,001 windows of 10,000 numbers each are sorted from scratch. Either kind of incremental window does one removal and one insertion per step.
