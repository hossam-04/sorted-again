---
id: 239
module: sliding-window
patterns: [monotonic deque, fixed window]
signature: "def maxSlidingWindow(self, nums: List[int], k: int) -> List[int]"
---

## Task

You get a list of integers `nums` and a window size `k`. Slide a window covering `k` consecutive entries from the left end of `nums` to the right end, one position at a time.

Return a list with the largest value inside the window at each position, from left to right. There are `len(nums) - k + 1` window positions.

## Constraints

- `1 <= len(nums) <= 100_000`
- `-10_000 <= nums[i] <= 10_000`
- `1 <= k <= len(nums)`

```json examples
[
  {"args": [[1, 3, 2, 5, 4, 8], 2], "out": [3, 3, 5, 5, 8], "why": "The windows are (1, 3), (3, 2), (2, 5), (5, 4) and (4, 8)."},
  {"args": [[5, 3, 1, 2, 9, 0], 3], "out": [5, 3, 9, 9], "why": "Once 5 leaves the window, the maximum drops to 3. A running maximum can't go back down; the window's can."},
  {"args": [[7, 7, 7], 3], "out": [7], "why": "The window covers the whole list, so there is one position."}
]
```

```json edge
[
  {"name": "window of one", "args": [[3, -1, 2], 1], "out": [3, -1, 2]},
  {"name": "window is the whole list", "args": [[2, 9, 4], 3], "out": [9]},
  {"name": "decreasing", "args": [[9, 7, 5, 3, 1], 2], "out": [9, 7, 5, 3]},
  {"name": "increasing", "args": [[1, 3, 5, 7], 3], "out": [5, 7]},
  {"name": "all equal", "args": [[4, 4, 4, 4], 2], "out": [4, 4, 4]},
  {"name": "only negatives", "args": [[-5, -2, -8, -1], 2], "out": [-2, -2, -1]},
  {"name": "the maximum leaves", "args": [[10, 1, 2, 3, 4], 3], "out": [10, 3, 4]},
  {"name": "single value", "args": [[6], 1], "out": [6]},
  {"name": "extreme values", "args": [[-10000, 10000, -10000], 2], "out": [10000, 10000]}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 9) if size == "small" else rng.randint(20, 300)
    hi = 10 if size == "small" else 10_000
    nums = [rng.randint(-hi, hi) for _ in range(n)]
    return [nums, rng.randint(1, n)]
```

```python perf
def perf(rng):
    # 100,000 values with a window of 50,000: rescanning each window costs about 2.5 billion steps.
    return [[rng.randint(-10_000, 10_000) for _ in range(100_000)], 50_000]
```

## Hints

1. Rescanning every window costs O(k) per position. You need the maximum without looking at the whole window again.
2. If a newer value is at least as large as an older one, the older one can never be a window's maximum again: it leaves the window first.
3. Keep a deque of indices whose values are decreasing from front to back. Pop smaller values from the back before adding a new index, and pop the front when it slides out of the window. The front is the maximum.

## Solution

```python solution time="n" space="k"
class Solution:
    def maxSlidingWindow(self, nums: List[int], k: int) -> List[int]:
        dq = deque()  # indices; their values decrease from front to back
        out = []
        for i, x in enumerate(nums):
            while dq and nums[dq[-1]] <= x:
                dq.pop()  # dominated: x is newer and at least as big
            dq.append(i)
            if dq[0] <= i - k:
                dq.popleft()  # the front index has slid out of the window
            if i >= k - 1:
                out.append(nums[dq[0]])
        return out
```

The deque holds only the indices that could still become a window's maximum. An index is useless once a newer index holds a value at least as large, because the newer one stays in the window longer. Removing those from the back keeps the values in decreasing order, so the front is always the largest value in the window.

The front can be stale, though: its index may have slid out of the window. Checking `dq[0] <= i - k` removes it. Indices are stored instead of values for exactly this reason: you can tell when they leave.

Each index is appended once and popped at most once, so the total work is O(n) even though there's a loop inside the loop. The deque never holds more than k indices.

## Alternatives

### Scan every window

```python alt time="n·k" space="1" slow oracle
class Solution:
    def maxSlidingWindow(self, nums: List[int], k: int) -> List[int]:
        return [max(nums[i : i + k]) for i in range(len(nums) - k + 1)]
```

One line, and correct. But each window is copied and scanned, so the total is about (n − k + 1) · k steps: 2.5 billion on the performance test.

### A heap with lazy deletion

```python alt time="n log n" space="n"
class Solution:
    def maxSlidingWindow(self, nums: List[int], k: int) -> List[int]:
        heap, out = [], []
        for i, x in enumerate(nums):
            heapq.heappush(heap, (-x, i))  # a max-heap via negated values
            while heap[0][1] <= i - k:     # discard tops that have left the window
                heapq.heappop(heap)
            if i >= k - 1:
                out.append(-heap[0][0])
        return out
```

A heap always knows its maximum. Instead of deleting values when they leave the window (which a heap can't do cheaply), it lets them stay and throws them away only when they reach the top. Each push and pop costs O(log n), so it's slower than the deque, but it's a useful pattern when a monotonic deque doesn't fit.

## Wrong answers

### Starts recording one window late

```python wrong fails="example" test="Example 1"
class Solution:
    def maxSlidingWindow(self, nums: List[int], k: int) -> List[int]:
        dq, out = deque(), []
        for i, x in enumerate(nums):
            while dq and nums[dq[-1]] <= x:
                dq.pop()
            dq.append(i)
            if dq[0] <= i - k:
                dq.popleft()
            if i >= k:  # the first full window ends at index k - 1
                out.append(nums[dq[0]])
        return out
```

The first window covers indices 0 to k − 1, so it's complete at `i == k - 1`. Starting at `i == k` skips it, and the answer has one value too few.

### Never drops indices that left the window

```python wrong fails="example" test="Example 2"
class Solution:
    def maxSlidingWindow(self, nums: List[int], k: int) -> List[int]:
        dq, out = deque(), []
        for i, x in enumerate(nums):
            while dq and nums[dq[-1]] <= x:
                dq.pop()
            dq.append(i)
            if i >= k - 1:
                out.append(nums[dq[0]])  # dq[0] may be outside the window
        return out
```

Popping smaller values keeps the deque decreasing, but a large value at the front stays there after it leaves the window. In Example 2, the 5 keeps being reported after the window has moved past it.

### Uses sorted window copies

```python wrong fails="perf"
class Solution:
    def maxSlidingWindow(self, nums: List[int], k: int) -> List[int]:
        out = []
        for i in range(len(nums) - k + 1):
            out.append(sorted(nums[i : i + k])[-1])  # sorts k values to find one maximum
        return out
```

Sorting gives the maximum, but it does far more work than needed (O(k log k) per window) and it repeats that work for every window. Even a plain `max` per window is O(n·k); the deque reuses what earlier windows already learned.
