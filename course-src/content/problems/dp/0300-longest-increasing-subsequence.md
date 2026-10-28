---
id: 300
module: dp
patterns: [smallest tail for each length, binary search]
signature: "def lengthOfLIS(self, nums: List[int]) -> int"
---

## Task

A *subsequence* keeps some elements of `nums`, in their original order, and drops the rest. Return the length of the longest subsequence that is **strictly** increasing.

## Constraints

- `1 <= len(nums) <= 10_000`
- `-10**4 <= nums[i] <= 10**4`

```json examples
[
  {"args": [[3, 1, 4, 1, 5, 9, 2, 6]], "out": 4, "why": "1, 4, 5, 9 (or 1, 4, 5, 6, or 3, 4, 5, 9) has length 4, and no increasing subsequence is longer."},
  {"args": [[5, 4, 3]], "out": 1, "why": "Every pair goes down, so the longest increasing subsequence is a single number."},
  {"args": [[2, 2, 3]], "out": 2, "why": "Strictly increasing: 2, 2 doesn't count, so the best is 2, 3."}
]
```

```json edge
[
  {"name": "one number", "args": [[7]], "out": 1},
  {"name": "already sorted", "args": [[1, 2, 3, 4]], "out": 4},
  {"name": "zigzag", "args": [[0, 8, 4, 12, 2, 10, 6, 14]], "out": 4},
  {"name": "negative numbers", "args": [[-1, -2, 0, -3, 1]], "out": 3}
]
```

```python oracle
class Solution:
    def lengthOfLIS(self, nums: List[int]) -> int:
        best = 0
        for mask in range(1, 1 << len(nums)):  # every subsequence
            seq = [x for i, x in enumerate(nums) if mask >> i & 1]
            if all(a < b for a, b in zip(seq, seq[1:])):
                best = max(best, len(seq))
        return best
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 6) if size == "small" else rng.randint(6, 14)
    hi = 5 if size == "small" else 20
    return [[rng.randint(-hi, hi) for _ in range(n)]]
```

```python perf
def perf(rng):
    # 10,000 random numbers.
    return [[rng.randint(-10**4, 10**4) for _ in range(10_000)]]
```

## Hints

1. Let best[i] be the length of the longest increasing subsequence that *ends* at index i. It's 1 plus the largest best[j] over earlier j with `nums[j] < nums[i]`. That's O(n²).
2. To do better, keep, for each length k, the smallest number that can end an increasing subsequence of length k. A smaller ending leaves more room for what comes next.
3. Those smallest endings are always sorted. For each number, binary-search the first ending that's ≥ it: replace it with the number, or append the number if there's none. The answer is how many endings there are.

## Solution

```python solution time="n log n" space="n"
class Solution:
    def lengthOfLIS(self, nums: List[int]) -> int:
        tails = []  # tails[k]: the smallest number that ends an increasing subsequence of length k + 1
        for x in nums:
            k = bisect_left(tails, x)  # the first ending that's >= x
            if k == len(tails):
                tails.append(x)  # x extends the longest subsequence so far
            else:
                tails[k] = x  # x ends a subsequence of length k + 1 with a smaller number
        return len(tails)
```

`tails` holds one number per length: the smallest possible last element of an increasing subsequence of that length. It's always sorted, because a subsequence of length k + 1 contains one of length k that ends with something smaller.

For each number x, the subsequences it can extend are those ending below x. `bisect_left` finds the first ending that's at least x: x can extend the subsequence one shorter, giving one of that length with a smaller or equal ending, so x replaces it. If every ending is below x, x makes a new, longer subsequence. `tails` doesn't hold an actual subsequence, only the best endings, but its length is the answer. That's O(n log n). This is sometimes called *patience sorting*, after a card game that builds piles the same way.

## Alternatives

### The O(n²) table

```python alt time="n²" space="n" slow
class Solution:
    def lengthOfLIS(self, nums: List[int]) -> int:
        best = [1] * len(nums)  # best[i]: the longest increasing subsequence ending at i
        for i in range(len(nums)):
            for j in range(i):
                if nums[j] < nums[i]:
                    best[i] = max(best[i], best[j] + 1)
        return max(best)
```

The classic dynamic program: the longest increasing subsequence ending at i extends the best one ending at some earlier, smaller number. It's easy to trust and fine for a few thousand numbers, but with 10,000 it compares 50 million pairs.

## Wrong answers

### Allows equal neighbours

```python wrong fails="example" test="Example 3"
class Solution:
    def lengthOfLIS(self, nums: List[int]) -> int:
        tails = []
        for x in nums:
            k = bisect_right(tails, x)  # an equal ending is treated as smaller than x
            if k == len(tails):
                tails.append(x)
            else:
                tails[k] = x
        return len(tails)
```

`bisect_right` puts x after endings *equal* to it, so x extends a subsequence that ends with the same value: that's a non-decreasing subsequence. The task wants strictly increasing, so `2, 2, 3` must give 2, not 3. Use `bisect_left`.

### Looks for the longest increasing run

```python wrong fails="example" test="Example 1"
class Solution:
    def lengthOfLIS(self, nums: List[int]) -> int:
        best = run = 1
        for a, b in zip(nums, nums[1:]):
            run = run + 1 if b > a else 1  # consecutive elements only
            best = max(best, run)
        return best
```

A subsequence can skip elements; a run can't. In Example 1 the longest run going up is 1, 5, 9, of length 3, while skipping lets 1, 4, 5, 9 reach 4.

### Tries every subsequence

```python wrong fails="perf"
class Solution:
    def lengthOfLIS(self, nums: List[int]) -> int:
        def longest(i, prev):  # the best from index i on, given the last number taken
            if i == len(nums):
                return 0
            skip = longest(i + 1, prev)
            if nums[i] > prev:
                return max(skip, 1 + longest(i + 1, nums[i]))  # take nums[i]
            return skip

        return longest(0, -inf)
```

Deciding "take or skip" for every element explores every subsequence, and there are 2ⁿ of them. Even cached on (index, last value), it would need a table of n × n states. Keeping the smallest ending for each length makes the whole search a single pass.
