---
id: 40
module: backtracking
patterns: [backtracking, each item once, sort then skip duplicates]
signature: "def combinationSum2(self, candidates: List[int], target: int) -> List[List[int]]"
compare: unordered-deep
---

## Task

You get a list of positive integers, `candidates`, which may contain repeated values, and a positive `target`. Return every distinct combination of candidates that adds up to `target`, where each item of the list may be used at most once.

Two combinations are the same if they hold the same numbers, each the same number of times, and each should be listed once. The combinations can come in any order, and so can the numbers inside each one.

## Constraints

- `1 <= len(candidates) <= 100`
- `1 <= candidates[i] <= 50`
- `1 <= target <= 30`

```json examples
[
  {"args": [[3, 1, 3, 5, 2], 6], "out": [[1, 5], [1, 2, 3], [3, 3]], "why": "There are two 3s, so 3 + 3 is allowed. 1 + 2 + 3 is listed once, even though it could use either 3."},
  {"args": [[4, 4, 4], 8], "out": [[4, 4]], "why": "Each 4 can be used once. Picking a different pair of 4s gives the same combination."},
  {"args": [[6, 7], 5], "out": [], "why": "Both candidates are larger than the target."}
]
```

```json edge
[
  {"name": "the whole list", "args": [[1, 2, 3], 6], "out": [[1, 2, 3]]},
  {"name": "a single candidate", "args": [[5], 5], "out": [[5]]},
  {"name": "only ones", "args": [[1, 1, 1, 1], 2], "out": [[1, 1]]},
  {"name": "a candidate too large to use", "args": [[20, 1, 2], 3], "out": [[1, 2]]}
]
```

```python oracle
class Solution:
    def combinationSum2(self, candidates: List[int], target: int) -> List[List[int]]:
        counts = sorted(Counter(candidates).items())
        out = []

        def go(i, remaining, chosen):  # use value i between 0 and its count times
            if remaining == 0:
                out.append(chosen)
                return
            if i == len(counts):
                return
            value, k = counts[i]
            for times in range(min(k, remaining // value) + 1):
                go(i + 1, remaining - times * value, chosen + [value] * times)

        go(0, target, [])
        return out
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 5) if size == "small" else rng.randint(5, 12)
    hi = 4 if size == "small" else 8
    return [[rng.randint(1, hi) for _ in range(n)], rng.randint(1, 10 if size == "small" else 20)]
```

```python perf
def perf(rng):
    # Twenty each of 1, 2 and 3, plus 40 larger values, with target 30.
    candidates = [1] * 20 + [2] * 20 + [3] * 20 + [rng.randint(4, 50) for _ in range(40)]
    rng.shuffle(candidates)
    return [candidates, 30]
```

## Hints

1. This is [[p:39]] with two changes: each item can be used once, and the list can hold equal values.
2. Using each item once means the recursive call moves past the item it just used: `j + 1` instead of `j`.
3. Equal values would build the same combinations again. Sort, and within one loop skip a value equal to the one before it: `j > start and candidates[j] == candidates[j - 1]`.

## Solution

```python solution time="2^n" space="n"
class Solution:
    def combinationSum2(self, candidates: List[int], target: int) -> List[List[int]]:
        candidates = sorted(candidates)
        out, path = [], []

        def backtrack(start, remaining):
            if remaining == 0:
                out.append(path[:])
                return
            for j in range(start, len(candidates)):
                c = candidates[j]
                if c > remaining:
                    break  # sorted: the rest are too big as well
                if j > start and c == candidates[j - 1]:
                    continue  # the same value in the same position: same combinations again
                path.append(c)
                backtrack(j + 1, remaining - c)  # j + 1: each item at most once
                path.pop()

        backtrack(0, target)
        return out
```

Three details make this work. Passing `j + 1` uses each item at most once. Skipping a value equal to the previous one *within the same loop* prevents duplicate combinations, while still letting a deeper level take a second copy, which is how `[3, 3]` is built. And with the list sorted, the loop stops at the first value larger than what's left.

The worst case explores subsets of the list, O(2ⁿ), but the target limits the depth, and the skip and the `break` cut most branches.

## Alternatives

### Choose how many copies of each value

```python alt time="2^n" space="n"
class Solution:
    def combinationSum2(self, candidates: List[int], target: int) -> List[List[int]]:
        counts = sorted(Counter(candidates).items())  # (value, how many copies)
        out, path = [], []

        def backtrack(i, remaining):
            if remaining == 0:
                out.append(path[:])
                return
            if i == len(counts) or counts[i][0] > remaining:
                return
            value, k = counts[i]
            backtrack(i + 1, remaining)  # no copies of this value
            used = 0
            while used < k and value * (used + 1) <= remaining:  # 1, 2, ... copies
                used += 1
                path.append(value)
                backtrack(i + 1, remaining - value * used)
            del path[len(path) - used:]

        backtrack(0, target)
        return out
```

Grouping equal values turns the problem into choosing a count for each distinct value, which can't produce a duplicate. It's the same idea as the counting alternative of [[p:90]].

## Wrong answers

### Uses the same item again

```python wrong fails="example" test="Example 1"
class Solution:
    def combinationSum2(self, candidates: List[int], target: int) -> List[List[int]]:
        candidates = sorted(candidates)
        out, path = [], []

        def backtrack(start, remaining):
            if remaining == 0:
                out.append(path[:])
                return
            for j in range(start, len(candidates)):
                c = candidates[j]
                if c > remaining:
                    break
                if j > start and c == candidates[j - 1]:
                    continue
                path.append(c)
                backtrack(j, remaining - c)  # j: the same item may be picked again
                path.pop()

        backtrack(0, target)
        return out
```

Passing `j` lets the next level pick the same item again, which is [[p:39]]'s rule. Here it produces combinations like 1 + 1 + 1 + 3 from a list with a single 1. Pass `j + 1`.

### Skips repeats at every depth

```python wrong fails="example" test="Example 1"
class Solution:
    def combinationSum2(self, candidates: List[int], target: int) -> List[List[int]]:
        candidates = sorted(candidates)
        out, path = [], []

        def backtrack(start, remaining):
            if remaining == 0:
                out.append(path[:])
                return
            for j in range(start, len(candidates)):
                c = candidates[j]
                if c > remaining:
                    break
                if j > 0 and c == candidates[j - 1]:  # should be j > start
                    continue
                path.append(c)
                backtrack(j + 1, remaining - c)
                path.pop()

        backtrack(0, target)
        return out
```

With `j > 0`, the second 3 is skipped even when it's the first choice of a deeper loop, so 3 + 3 is never built. A repeat should be skipped only when an equal value was already tried at the same level: `j > start`.

### Removes duplicates at the end

```python wrong fails="perf"
class Solution:
    def combinationSum2(self, candidates: List[int], target: int) -> List[List[int]]:
        candidates = sorted(candidates)
        found, path = set(), []

        def backtrack(start, remaining):
            if remaining == 0:
                found.add(tuple(path))  # the same combination arrives here many times
                return
            for j in range(start, len(candidates)):
                if candidates[j] > remaining:
                    break
                path.append(candidates[j])
                backtrack(j + 1, remaining - candidates[j])
                path.pop()

        backtrack(0, target)
        return [list(t) for t in found]
```

The set removes the duplicates, so the answer is right. But the search still builds every way of choosing *which* copies to use: with twenty 1s, twenty 2s and twenty 3s, a combination such as ten 1s and ten 2s can be picked in about 34 billion ways. Skipping equal values within a loop builds each combination once.
