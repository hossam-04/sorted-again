---
id: 198
module: dp
patterns: [take or skip, best total so far]
signature: "def rob(self, nums: List[int]) -> int"
---

## Task

Houses stand in a row, and house i holds `nums[i]` in cash. You may take the cash from any houses you like, except that you can never take from two houses that are next to each other. Return the largest total you can take.

## Constraints

- `1 <= len(nums) <= 20_000`
- `0 <= nums[i] <= 400`

```json examples
[
  {"args": [[2, 1, 1, 9]], "out": 11, "why": "Take the first and the last house: 2 + 9 = 11. Taking every other house from the second, 1 + 9, gives only 10."},
  {"args": [[5, 3, 4, 11, 2]], "out": 16, "why": "5 + 11 = 16 beats 5 + 4 + 2 = 11 and 3 + 11 = 14."},
  {"args": [[4]], "out": 4, "why": "A single house: take it."}
]
```

```json edge
[
  {"name": "nothing to take", "args": [[0, 0, 0]], "out": 0},
  {"name": "two houses", "args": [[6, 1]], "out": 6},
  {"name": "a gap of two", "args": [[1, 6, 1, 1, 6]], "out": 12},
  {"name": "skipping two in a row pays", "args": [[3, 2, 5, 10, 7]], "out": 15}
]
```

```python oracle
class Solution:
    def rob(self, nums: List[int]) -> int:
        best = 0
        for mask in range(1 << len(nums)):  # every set of houses
            if mask & (mask >> 1) == 0:  # no two neighbours
                best = max(best, sum(x for i, x in enumerate(nums) if mask >> i & 1))
        return best
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 6) if size == "small" else rng.randint(6, 14)
    return [[rng.randint(0, 20) for _ in range(n)]]
```

```python perf
def perf(rng):
    # 20,000 houses.
    return [[rng.randint(0, 400) for _ in range(20_000)]]
```

## Hints

1. Decide house by house. For house i, you either skip it, or take it and then must have skipped house i − 1.
2. Let best[i] be the largest total from the first i houses. Then best[i] is the larger of best[i − 1] (skip house i) and best[i − 2] + `nums[i]` (take it).
3. Each value only needs the two before it, so two variables are enough.

## Solution

```python solution time="n" space="1"
class Solution:
    def rob(self, nums: List[int]) -> int:
        two_back, one_back = 0, 0  # the best totals from the houses up to i - 2 and up to i - 1
        for x in nums:
            two_back, one_back = one_back, max(one_back, two_back + x)  # skip this house, or take it
        return one_back
```

Every plan for the first i houses either skips house i, and is then a plan for the first i − 1 houses, or takes it, and then must skip house i − 1, which leaves a plan for the first i − 2. The best total is the better of the two. This "take it or skip it" choice is the heart of many dynamic programs. One pass, O(1) space.

## Alternatives

### A full table

```python alt time="n" space="n"
class Solution:
    def rob(self, nums: List[int]) -> int:
        n = len(nums)
        best = [0] * (n + 1)  # best[i]: the best total from the first i houses
        best[1] = nums[0]
        for i in range(2, n + 1):
            best[i] = max(best[i - 1], best[i - 2] + nums[i - 1])
        return best[n]
```

The same recurrence with every value kept. It uses O(n) memory, but the table makes the subproblems easy to see, and it's the first step before noticing that only two entries are ever read.

## Wrong answers

### Takes every other house

```python wrong fails="example" test="Example 1"
class Solution:
    def rob(self, nums: List[int]) -> int:
        return max(sum(nums[0::2]), sum(nums[1::2]))  # even positions or odd positions
```

Taking houses 0, 2, 4, … or 1, 3, 5, … never takes neighbours, but it never skips two houses in a row either, and sometimes that's what pays. In Example 1, the first and the last house are three apart, so they're not in the same group.

### Takes the richest houses first

```python wrong fails="edge" test="skipping two in a row pays"
class Solution:
    def rob(self, nums: List[int]) -> int:
        taken = set()
        for i in sorted(range(len(nums)), key=lambda i: -nums[i]):  # richest first
            if i - 1 not in taken and i + 1 not in taken:
                taken.add(i)
        return sum(nums[i] for i in taken)
```

Grabbing the richest house first looks sensible, but it can block two neighbours that are worth more together. In `[3, 2, 5, 10, 7]`, taking the 10 first rules out both the 5 and the 7, and the total ends at 10 + 3 = 13, while 3 + 5 + 7 = 15.

### Plain recursion

```python wrong fails="perf"
class Solution:
    def rob(self, nums: List[int]) -> int:
        def best(i):  # the best total from house i onwards
            if i >= len(nums):
                return 0
            return max(best(i + 1), nums[i] + best(i + 2))  # solves the same suffixes again and again

        return best(0)
```

The recurrence is right, but without remembering answers, best(i + 2) is computed both directly and again inside best(i + 1), and the repetition compounds at every level: the number of calls grows exponentially. Cache the results, or build them from the end.
