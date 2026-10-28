---
id: 90
module: backtracking
patterns: [backtracking, sort then skip duplicates]
signature: "def subsetsWithDup(self, nums: List[int]) -> List[List[int]]"
compare: unordered-deep
---

## Task

Like [[p:78]], but `nums` may contain repeated numbers. Return every *distinct* subset: two subsets that hold the same numbers, each the same number of times, count as one and should be listed once. The subsets can come in any order, and so can the numbers inside each one.

## Constraints

- `1 <= len(nums) <= 22`
- `-10 <= nums[i] <= 10`
- The answer has at most `20_000` subsets

```json examples
[
  {"args": [[3, 3]], "out": [[], [3], [3, 3]], "why": "Taking the first 3 or the second gives the same subset, [3], so it's listed once."},
  {"args": [[1, 5, 1]], "out": [[], [1], [1, 1], [5], [1, 5], [1, 1, 5]], "why": "A subset can hold zero, one or two 1s, with or without the 5: 3 × 2 = 6 distinct subsets."},
  {"args": [[4, 2]], "out": [[], [2], [4], [2, 4]], "why": "With no repeated numbers, these are just the ordinary subsets."}
]
```

```json edge
[
  {"name": "all the same", "args": [[7, 7, 7]], "out": [[], [7], [7, 7], [7, 7, 7]]},
  {"name": "two pairs", "args": [[2, 1, 2, 1]], "out": [[], [1], [1, 1], [1, 1, 2], [1, 1, 2, 2], [1, 2], [1, 2, 2], [2], [2, 2]]},
  {"name": "negatives with a repeat", "args": [[-1, -1, 0]], "out": [[], [-1], [-1, -1], [-1, -1, 0], [-1, 0], [0]]},
  {"name": "a single number", "args": [[8]], "out": [[], [8]]}
]
```

```python oracle
class Solution:
    def subsetsWithDup(self, nums: List[int]) -> List[List[int]]:
        seen = {tuple(sorted(c)) for k in range(len(nums) + 1) for c in itertools.combinations(nums, k)}
        return [list(t) for t in seen]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 5) if size == "small" else rng.randint(5, 10)
    hi = 2 if size == "small" else 4
    return [[rng.randint(-hi, hi) for _ in range(n)]]
```

```python perf
def perf(rng):
    # Eleven 1s and eleven 2s: 22 numbers, but only 12 × 12 = 144 distinct subsets.
    nums = [1] * 11 + [2] * 11
    rng.shuffle(nums)
    return [nums]
```

## Hints

1. Sort the numbers first, so equal numbers sit next to each other.
2. Use the loop-from-start shape of subsets: each call records the current subset, then tries extending it with each later number.
3. Within one loop, extending the same subset with two equal numbers gives the same results twice. Skip a number if it equals the one just before it *in this loop*: `j > start and nums[j] == nums[j - 1]`.

## Solution

```python solution time="n · 2^n" space="n"
class Solution:
    def subsetsWithDup(self, nums: List[int]) -> List[List[int]]:
        nums = sorted(nums)  # equal numbers side by side
        out, path = [], []

        def backtrack(start):
            out.append(path[:])
            for j in range(start, len(nums)):
                if j > start and nums[j] == nums[j - 1]:
                    continue  # this value was already tried in this position
                path.append(nums[j])
                backtrack(j + 1)
                path.pop()

        backtrack(0)
        return out
```

Each loop chooses the *next* number of the subset. If two choices in the same loop are equal, they lead to exactly the same subsets, so only the first of them is tried. Choosing the same value again one level deeper is still allowed (that's how `[1, 1]` gets built), which is why the test is `j > start` and not `j > 0`: only repeats *within* the loop are skipped.

The duplicates are never generated, so there's nothing to filter afterwards. The worst case, with all numbers different, is the O(n · 2ⁿ) of ordinary subsets.

## Alternatives

### Choose how many copies of each value

```python alt time="n · 2^n" space="n"
class Solution:
    def subsetsWithDup(self, nums: List[int]) -> List[List[int]]:
        counts = sorted(Counter(nums).items())  # (value, how many times it appears)
        out, path = [], []

        def backtrack(i):
            if i == len(counts):
                out.append(path[:])
                return
            value, k = counts[i]
            backtrack(i + 1)  # no copies of this value
            for _ in range(k):  # then 1, 2, ..., k copies
                path.append(value)
                backtrack(i + 1)
            del path[len(path) - k:]

        backtrack(0)
        return out
```

A distinct subset is decided by how many copies of each value it holds, from 0 up to the count. Deciding per distinct value instead of per position never produces a duplicate in the first place.

## Wrong answers

### Skips repeats at every depth

```python wrong fails="example" test="Example 1"
class Solution:
    def subsetsWithDup(self, nums: List[int]) -> List[List[int]]:
        nums = sorted(nums)
        out, path = [], []

        def backtrack(start):
            out.append(path[:])
            for j in range(start, len(nums)):
                if j > 0 and nums[j] == nums[j - 1]:  # should be j > start
                    continue
                path.append(nums[j])
                backtrack(j + 1)
                path.pop()

        backtrack(0)
        return out
```

With `j > 0`, a repeated number is skipped even when it starts its own loop, one level deeper, so a subset can never hold two equal numbers: `[3, 3]` is missing. Skip only when the previous equal number was already tried in the *same* loop: `j > start`.

### Doesn't sort first

```python wrong fails="example" test="Example 2"
class Solution:
    def subsetsWithDup(self, nums: List[int]) -> List[List[int]]:
        out, path = [], []

        def backtrack(start):
            out.append(path[:])
            for j in range(start, len(nums)):
                if j > start and nums[j] == nums[j - 1]:  # only catches repeats that are side by side
                    continue
                path.append(nums[j])
                backtrack(j + 1)
                path.pop()

        backtrack(0)
        return out
```

The skip compares each number with its neighbour, which only works if equal numbers are neighbours. In 1, 5, 1 the two 1s are apart, so `[1]` and `[1, 5]` are each built twice. Sort first.

### Generates every subset, then removes duplicates

```python wrong fails="perf"
class Solution:
    def subsetsWithDup(self, nums: List[int]) -> List[List[int]]:
        seen = set()
        for k in range(len(nums) + 1):
            for c in combinations(nums, k):  # all 2ⁿ position subsets
                seen.add(tuple(sorted(c)))
        return [list(t) for t in seen]
```

This gives the right answer, but it builds all 2ⁿ subsets of positions before merging the equal ones. Eleven 1s and eleven 2s have only 144 distinct subsets, yet 2²² ≈ 4 million position subsets. Skipping duplicates while building does work in proportion to the answer.
