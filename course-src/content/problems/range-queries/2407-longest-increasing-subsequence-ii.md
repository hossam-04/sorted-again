---
id: 2407
module: range-queries
patterns: [segment tree over values, range maximum for DP]
signature: "def lengthOfLIS(self, nums: List[int], k: int) -> int"
---

## Task

Return the length of the longest subsequence of `nums` (some elements, kept in their original order) that is **strictly increasing**, and where each element is at most `k` larger than the one before it.

## Constraints

- `1 <= len(nums) <= 100_000`
- `1 <= nums[i], k <= 100_000`

```json examples
[
  {"args": [[3, 1, 4, 8, 9, 10], 2], "out": 3, "why": "8, 9, 10 rises by at most 2 at each step. 3, 4, 8, 9, 10 is longer, but the jump from 4 to 8 is too big."},
  {"args": [[5, 5, 6, 6, 7], 2], "out": 3, "why": "Strictly increasing: a repeated number can't follow itself, so 5, 6, 7 is the longest."},
  {"args": [[10, 13, 7, 10], 3], "out": 2, "why": "A step of exactly k is allowed: 10 to 13 works, and so does 7 to 10."}
]
```

```json edge
[
  {"name": "one number", "args": [[7], 1], "out": 1},
  {"name": "all equal", "args": [[4, 4, 4], 5], "out": 1},
  {"name": "descending", "args": [[5, 4, 3], 2], "out": 1},
  {"name": "a huge step", "args": [[1, 100000], 100000], "out": 2},
  {"name": "a later, smaller start wins", "args": [[9, 1, 2, 3], 1], "out": 3},
  {"name": "the limit splits a run", "args": [[1, 2, 5, 6], 2], "out": 2}
]
```

```python oracle
class Solution:
    def lengthOfLIS(self, nums: List[int], k: int) -> int:
        best = [1] * len(nums)
        for i in range(len(nums)):
            for j in range(i):
                if 0 < nums[i] - nums[j] <= k:
                    best[i] = max(best[i], best[j] + 1)
        return max(best)
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 8) if size == "small" else rng.randint(20, 300)
    hi = 10 if size == "small" else rng.choice([30, 1000, 100_000])
    nums = [rng.randint(1, hi) for _ in range(n)]
    return [nums, rng.randint(1, max(1, hi // rng.choice([1, 3, 10])))]
```

```python perf
def perf(rng):
    # 30,000 numbers up to 100,000, with steps of up to 50,000.
    return [[rng.randint(1, 100_000) for _ in range(30_000)], 50_000]
```

## Hints

1. Let `best[v]` be the length of the longest valid subsequence found so far that ends with the value v. A new number x can extend any subsequence ending in a value from `x - k` to `x - 1`.
2. So x's length is 1 plus the **maximum** of `best` over a range of values. Then `best[x]` gets that length. A range maximum with point updates is a segment tree's job.
3. Build a segment tree over the values 1 to `max(nums)`, storing `best`. For each x in order: query the maximum over `[x - k, x - 1]`, add 1, and write it at position x.

## Solution

```python solution time="n log m" space="m"
class Solution:
    def lengthOfLIS(self, nums: List[int], k: int) -> int:
        size = max(nums) + 1
        tree = [0] * (2 * size)  # leaf size + v: the longest subsequence so far ending in value v
        answer = 0
        for x in nums:
            l, r = max(0, x - k) + size, x + size  # the leaves for values x - k .. x - 1, half-open
            longest = 0
            while l < r:  # range maximum, climbing from both ends
                if l & 1:
                    if tree[l] > longest:
                        longest = tree[l]
                    l += 1
                if r & 1:
                    r -= 1
                    if tree[r] > longest:
                        longest = tree[r]
                l //= 2
                r //= 2
            length = longest + 1
            answer = max(answer, length)
            i = x + size
            if length > tree[i]:
                tree[i] = length
                i //= 2
                while i and tree[i] < length:  # raise the maximum above the leaf
                    tree[i] = length
                    i //= 2
        return answer
```

This is the classic LIS dynamic program with a twist: the predecessor of x must be a value from `x - k` to `x - 1`. Indexing the DP by **value** instead of by position turns "the best predecessor" into a range maximum over values, which a segment tree answers in O(log m) for m possible values. Numbers are processed in their original order, so the tree only ever holds subsequences made of earlier numbers.

The range ends at `x - 1`, which makes the subsequence strictly increasing, and starts at `x - k`, which allows a step of exactly k. Updating stops early once an ancestor already holds a length at least as large, since maxima above it can't change. O(n log m) time and O(m) space.

## Alternatives

### The quadratic DP

```python alt time="n²" space="n" slow
class Solution:
    def lengthOfLIS(self, nums: List[int], k: int) -> int:
        best = [1] * len(nums)  # best[i]: the longest valid subsequence ending at position i
        for i in range(len(nums)):
            for j in range(i):
                if 0 < nums[i] - nums[j] <= k:
                    best[i] = max(best[i], best[j] + 1)
        return max(best)
```

For every number, look at every earlier number that could come right before it. This is the textbook O(n²) LIS with one extra condition, easy to trust and fine for a few thousand numbers. The segment tree replaces the inner loop with one range query.

## Wrong answers

### Ignores the limit on each step

```python wrong fails="example" test="Example 1"
class Solution:
    def lengthOfLIS(self, nums: List[int], k: int) -> int:
        tails = []  # the patience-sorting LIS: no limit on steps
        for x in nums:
            i = bisect_left(tails, x)
            if i == len(tails):
                tails.append(x)
            else:
                tails[i] = x
        return len(tails)
```

This is the ordinary longest increasing subsequence from [[p:300]], with no limit on how far each step rises. In Example 1 it finds 3, 4, 8, 9, 10, whose jump from 4 to 8 is more than k = 2.

### Lets a number follow an equal one

```python wrong fails="example" test="Example 2"
class Solution:
    def lengthOfLIS(self, nums: List[int], k: int) -> int:
        size = max(nums) + 1
        tree = [0] * (2 * size)
        answer = 0
        for x in nums:
            l, r = max(0, x - k) + size, x + 1 + size  # includes value x itself
            longest = 0
            while l < r:
                if l & 1:
                    longest = max(longest, tree[l])
                    l += 1
                if r & 1:
                    r -= 1
                    longest = max(longest, tree[r])
                l //= 2
                r //= 2
            length = longest + 1
            answer = max(answer, length)
            i = x + size
            tree[i] = max(tree[i], length)
            i //= 2
            while i:
                tree[i] = max(tree[2 * i], tree[2 * i + 1])
                i //= 2
        return answer
```

Including value x in the range lets a subsequence ending in x be extended by another x, which makes it non-decreasing rather than increasing. In Example 2 this counts all five numbers. The range must stop at `x - 1`.

### Scans the k values below each number

```python wrong fails="perf"
class Solution:
    def lengthOfLIS(self, nums: List[int], k: int) -> int:
        best = {}  # value -> the longest subsequence ending in it
        for x in nums:
            longest = 0
            for v in range(max(1, x - k), x):  # up to k lookups per number
                longest = max(longest, best.get(v, 0))
            best[x] = longest + 1
        return max(best.values())
```

The DP by value is right, but the range maximum is a loop over up to k values: O(n · k). With steps of up to 50,000 and 30,000 numbers, that's over a billion lookups. The segment tree answers each range in about 2 log m steps.
