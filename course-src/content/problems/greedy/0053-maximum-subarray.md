---
id: 53
module: greedy
patterns: [Kadane's algorithm, drop a negative prefix]
signature: "def maxSubArray(self, nums: List[int]) -> int"
---

## Task

Return the largest sum of a *subarray* of `nums`: a run of one or more consecutive elements.

## Constraints

- `1 <= len(nums) <= 100_000`
- `-10**4 <= nums[i] <= 10**4`

```json examples
[
  {"args": [[2, -3, 4, -1, 3, -6, 1]], "out": 6, "why": "The best run is 4, -1, 3: the -1 costs less than the 3 after it adds."},
  {"args": [[-4, -2, -7]], "out": -2, "why": "Every number is negative. A subarray can't be empty, so the best is the single largest number."},
  {"args": [[3, -10, 4]], "out": 4, "why": "3 + (-10) + 4 = -3: the -10 costs more than the 3 gains, so it's better to start fresh at 4."}
]
```

```json edge
[
  {"name": "a single negative number", "args": [[-5]], "out": -5},
  {"name": "all positive", "args": [[1, 2, 3]], "out": 6},
  {"name": "zeros", "args": [[0, 0]], "out": 0},
  {"name": "a zero between negatives", "args": [[-1, 0, -2]], "out": 0},
  {"name": "a deep dip, then a long run", "args": [[8, -20, 5, 5, -1, 6]], "out": 15}
]
```

```python oracle
class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        return max(sum(nums[i:j]) for i in range(len(nums)) for j in range(i + 1, len(nums) + 1))
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 6) if size == "small" else rng.randint(6, 40)
    hi = 10 if size == "small" else 100
    return [[rng.randint(-hi, hi) for _ in range(n)]]
```

```python perf
def perf(rng):
    # 100,000 numbers between -10,000 and 10,000.
    return [[rng.randint(-10**4, 10**4) for _ in range(100_000)]]
```

## Hints

1. Think about the best subarray that *ends* at index i. It either is `nums[i]` alone or extends the best subarray ending at i − 1.
2. Extending is worth it exactly when the best sum ending at i − 1 is positive. A negative running sum only drags down whatever comes next, so drop it and start again at `nums[i]`.
3. Keep that running sum and the best value seen so far, in one pass. Start both at `nums[0]`, not at 0, so that an all-negative array works.

## Solution

```python solution time="n" space="1"
class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        best = cur = nums[0]  # not 0: the answer may be negative
        for x in nums[1:]:
            cur = max(x, cur + x)  # extend the run, or start a new one at x
            best = max(best, cur)
        return best
```

This is **Kadane's algorithm**. `cur` is the best sum of a subarray ending at the current element. A run whose sum is negative can only make every extension worse, so the moment `cur + x` is less than `x` alone, the run is dropped and a new one starts at `x`. The best subarray ends somewhere, so the best of all the `cur` values is the answer. One pass: O(n) time, O(1) space.

## Alternatives

### Prefix sums: subtract the smallest earlier prefix

```python alt time="n" space="1"
class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        best = nums[0]
        prefix, lowest = 0, 0  # sum so far, and the smallest prefix sum before it
        for x in nums:
            prefix += x
            best = max(best, prefix - lowest)  # the best subarray ending here
            lowest = min(lowest, prefix)
        return best
```

The sum of a subarray is a difference of two prefix sums. For each end, the best start is the one with the smallest earlier prefix, so tracking that minimum gives the same O(n) pass from another angle.

### Divide and conquer

```python alt time="n log n" space="log n"
class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        def best(lo, hi):  # the answer for nums[lo:hi]
            if hi - lo == 1:
                return nums[lo]
            mid = (lo + hi) // 2
            left_run, run = -inf, 0  # the best run that ends just before mid
            for i in range(mid - 1, lo - 1, -1):
                run += nums[i]
                if run > left_run:
                    left_run = run
            right_run, run = -inf, 0  # the best run that starts at mid
            for i in range(mid, hi):
                run += nums[i]
                if run > right_run:
                    right_run = run
            return max(best(lo, mid), best(mid, hi), left_run + right_run)  # left half, right half, or across

        return best(0, len(nums))
```

The best subarray lies in the left half, in the right half, or across the middle. The crossing case is the best run ending at the middle plus the best run starting there, found with two scans. It's O(n log n), slower than Kadane's algorithm, but it's the follow-up LeetCode suggests and a good example of divide and conquer.

## Wrong answers

### Starts the best sum at 0

```python wrong fails="example" test="Example 2"
class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        best = cur = 0  # pretends an empty subarray, with sum 0, is allowed
        for x in nums:
            cur = max(0, cur + x)
            best = max(best, cur)
        return best
```

Starting at 0 quietly allows the empty subarray. When every number is negative, nothing beats 0, and the function returns 0, which isn't the sum of any real subarray. Start with the first element.

### Adds up all the positive numbers

```python wrong fails="example" test="Example 1"
class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        positives = [x for x in nums if x > 0]
        return sum(positives) if positives else max(nums)  # but the numbers must be consecutive
```

Skipping the negatives isn't allowed: a subarray is consecutive, so taking 2 and 4 means taking the -3 between them too. In Example 1 this adds up 2 + 4 + 3 + 1 = 10, which no subarray reaches.

### Tries every subarray

```python wrong fails="perf"
class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        best = nums[0]
        for i in range(len(nums)):
            total = 0
            for j in range(i, len(nums)):  # every subarray starting at i
                total += nums[j]
                best = max(best, total)
        return best
```

Keeping a running total per start makes each subarray O(1), but there are still n(n + 1)/2 subarrays: 5 billion for 100,000 numbers. Kadane's algorithm keeps only the best run ending at each position.
