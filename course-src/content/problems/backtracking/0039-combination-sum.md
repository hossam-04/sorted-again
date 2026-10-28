---
id: 39
module: backtracking
patterns: [backtracking, reuse allowed, pruning with sorted input]
signature: "def combinationSum(self, candidates: List[int], target: int) -> List[List[int]]"
compare: unordered-deep
---

## Task

You get a list of different positive integers, `candidates`, and a positive `target`. Return every combination of candidates that adds up to `target`. A candidate may be used any number of times.

Two combinations are the same if they use each number the same number of times, whatever the order, and each should be listed once. The combinations can come in any order, and so can the numbers inside each one.

## Constraints

- `1 <= len(candidates) <= 39`
- `2 <= candidates[i] <= 40`, all different
- `1 <= target <= 40`

```json examples
[
  {"args": [[3, 4, 5], 8], "out": [[3, 5], [4, 4]], "why": "4 can be used twice. 3 + 5 works too, but 3 + 3 leaves 2, which no candidate fills."},
  {"args": [[6, 2, 4], 8], "out": [[2, 2, 2, 2], [2, 2, 4], [2, 6], [4, 4]], "why": "Candidates can repeat, so 2 + 2 + 2 + 2 counts. The order of the candidates in the input doesn't matter."},
  {"args": [[5, 10], 3], "out": [], "why": "Every candidate is larger than the target, so no combination exists."}
]
```

```json edge
[
  {"name": "one candidate that fits", "args": [[7], 21], "out": [[7, 7, 7]]},
  {"name": "one candidate that doesn't", "args": [[4], 10], "out": []},
  {"name": "the target is a candidate", "args": [[3, 9], 9], "out": [[3, 3, 3], [9]]},
  {"name": "many ways", "args": [[2, 3], 12], "out": [[2, 2, 2, 2, 2, 2], [2, 2, 2, 3, 3], [3, 3, 3, 3]]},
  {"name": "target 1", "args": [[2, 3], 1], "out": []},
  {"name": "unsorted candidates", "args": [[5, 3, 2], 10], "out": [[2, 2, 2, 2, 2], [2, 2, 3, 3], [2, 3, 5], [5, 5]]}
]
```

```python oracle
class Solution:
    def combinationSum(self, candidates: List[int], target: int) -> List[List[int]]:
        out = []

        def go(i, remaining, chosen):  # use candidates[i] exactly k times, for every possible k
            if i == len(candidates):
                if remaining == 0:
                    out.append(chosen)
                return
            c = candidates[i]
            for k in range(remaining // c + 1):
                go(i + 1, remaining - k * c, chosen + [c] * k)

        go(0, target, [])
        return out
```

```python gen
def gen(rng, size):
    if size == "small":
        return [rng.sample(range(2, 9), rng.randint(1, 3)), rng.randint(1, 12)]
    return [rng.sample(range(2, 16), rng.randint(3, 6)), rng.randint(8, 25)]
```

```python perf
def perf(rng):
    # Every number from 2 to 40, target 40: 6,153 combinations.
    candidates = list(range(2, 41))
    rng.shuffle(candidates)
    return [candidates, 40]
```

## Hints

1. Build combinations one number at a time, keeping track of how much of the target is left. A combination is complete when nothing is left.
2. To avoid listing the same combination in several orders, only ever add candidates in one fixed order: after using `candidates[j]`, the next number may be `candidates[j]` again or a later candidate, never an earlier one.
3. Sort the candidates first. Then, as soon as a candidate is larger than what's left, every later one is too, and the loop can stop.

## Solution

```python solution time="n^(t/m)" space="t/m"
class Solution:
    def combinationSum(self, candidates: List[int], target: int) -> List[List[int]]:
        candidates = sorted(candidates)
        out, path = [], []

        def backtrack(start, remaining):
            if remaining == 0:
                out.append(path[:])
                return
            for j in range(start, len(candidates)):
                c = candidates[j]
                if c > remaining:
                    break  # sorted: every later candidate is too big as well
                path.append(c)
                backtrack(j, remaining - c)  # j, not j + 1: the same candidate may be used again
                path.pop()

        backtrack(0, target)
        return out
```

Each combination is built in non-decreasing order of position: the loop starts at `start`, and the recursive call passes `j`, so the same candidate may follow itself but nothing earlier may come back. That gives every combination exactly one way to be built, so there are no duplicates to remove.

Sorting lets the loop `break` at the first candidate that's too large, which cuts off whole subtrees instead of exploring them and failing one by one. The search tree has a depth of at most t/m, where t is the target and m the smallest candidate, and up to n branches per node, hence the bound; in practice the time is close to the size of the answer.

## Alternatives

### Use it again, or move on

```python alt time="n^(t/m)" space="t/m"
class Solution:
    def combinationSum(self, candidates: List[int], target: int) -> List[List[int]]:
        out, path = [], []

        def backtrack(i, remaining):
            if remaining == 0:
                out.append(path[:])
                return
            if i == len(candidates) or remaining < 0:
                return
            path.append(candidates[i])
            backtrack(i, remaining - candidates[i])  # use candidates[i] (again)
            path.pop()
            backtrack(i + 1, remaining)  # done with candidates[i]: move on

        backtrack(0, target)
        return out
```

The include-or-skip shape of [[p:78]], with one change: after taking a candidate, stay on the same index so it can be taken again. Skipping moves on for good, which is what keeps the combinations unique.

## Wrong answers

### Lists the same combination in several orders

```python wrong fails="example" test="Example 1"
class Solution:
    def combinationSum(self, candidates: List[int], target: int) -> List[List[int]]:
        out, path = [], []

        def backtrack(remaining):
            if remaining == 0:
                out.append(path[:])
                return
            for c in candidates:  # every candidate at every step
                if c <= remaining:
                    path.append(c)
                    backtrack(remaining - c)
                    path.pop()

        backtrack(target)
        return out
```

Trying every candidate at every step builds 3 + 5 and 5 + 3 as two different paths, so the same combination appears twice. Order the choices: pass a start index so a path never goes back to an earlier candidate.

### Uses each candidate only once

```python wrong fails="example" test="Example 1"
class Solution:
    def combinationSum(self, candidates: List[int], target: int) -> List[List[int]]:
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
                path.append(c)
                backtrack(j + 1, remaining - c)  # moves past c, so c can't be used again
                path.pop()

        backtrack(0, target)
        return out
```

Passing `j + 1` forbids using a candidate twice, so 4 + 4 is never found. That's the rule of [[p:40]], not this problem. Pass `j` to allow the same candidate again.

### Builds every order, then removes duplicates

```python wrong fails="perf"
class Solution:
    def combinationSum(self, candidates: List[int], target: int) -> List[List[int]]:
        found, path = set(), []

        def backtrack(remaining):
            if remaining == 0:
                found.add(tuple(sorted(path)))  # sorting merges the different orders
                return
            for c in candidates:
                if c <= remaining:
                    path.append(c)
                    backtrack(remaining - c)
                    path.pop()

        backtrack(target)
        return [list(t) for t in found]
```

The duplicates are gone, so the answer is right, but the search still walks every order of every combination. With every number from 2 to 40 and a target of 40, there are about 63 million ordered ways against 6,153 combinations. Prevent duplicates while building instead of removing them afterwards.
