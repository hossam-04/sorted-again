---
id: 78
module: backtracking
patterns: [backtracking, include or skip, choose explore un-choose]
signature: "def subsets(self, nums: List[int]) -> List[List[int]]"
compare: unordered-deep
no_slow_wrong: every correct approach has to list all 2ⁿ subsets, so there's no natural approach that's much slower than the answer itself
---

## Task

You get a list of different integers, `nums`. Return every subset of it: every list you can make by keeping some of the numbers (possibly none, possibly all) and dropping the rest. Include each subset once. The subsets can come in any order, and so can the numbers inside each one.

## Constraints

- `1 <= len(nums) <= 15`
- `-20 <= nums[i] <= 20`, all different

```json examples
[
  {"args": [[4, 7]], "out": [[], [4], [7], [4, 7]], "why": "Each number is either in a subset or not: 2 × 2 = 4 subsets, counting the empty one."},
  {"args": [[5, -1, 2]], "out": [[], [5], [-1], [2], [5, -1], [5, 2], [-1, 2], [5, -1, 2]], "why": "Three numbers give 2³ = 8 subsets. Neither the order of the subsets nor the order inside each one matters."},
  {"args": [[9]], "out": [[], [9]], "why": "Even a single number has two subsets: the empty one, and the number itself."}
]
```

```json edge
[
  {"name": "four numbers", "args": [[1, 2, 3, 4]], "out": [[], [1], [2], [3], [4], [1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4], [1, 2, 3], [1, 2, 4], [1, 3, 4], [2, 3, 4], [1, 2, 3, 4]]},
  {"name": "negative numbers", "args": [[-3, -2]], "out": [[], [-3], [-2], [-3, -2]]},
  {"name": "zero is a number too", "args": [[0, 6]], "out": [[], [0], [6], [0, 6]]}
]
```

```python oracle
class Solution:
    def subsets(self, nums: List[int]) -> List[List[int]]:
        return [list(c) for k in range(len(nums) + 1) for c in itertools.combinations(nums, k)]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 4) if size == "small" else rng.randint(5, 8)
    return [rng.sample(range(-20, 21), n)]
```

```python perf
def perf(rng):
    # 15 numbers: 32,768 subsets.
    return [rng.sample(range(-20, 21), 15)]
```

## Hints

1. Every subset comes from one decision per number: take it or leave it.
2. Make those decisions one number at a time, recursively. When every number has been decided, the numbers taken form one subset.
3. Keep the current choice in a list `path`: append a number, explore, then pop it and explore again without it. Record a *copy* of `path` at the end of each branch, since `path` keeps changing.

## Solution

```python solution time="n · 2^n" space="n"
class Solution:
    def subsets(self, nums: List[int]) -> List[List[int]]:
        out, path = [], []

        def backtrack(i):  # decide about nums[i], then the numbers after it
            if i == len(nums):
                out.append(path[:])  # a copy: path keeps changing
                return
            path.append(nums[i])  # choose: take nums[i]
            backtrack(i + 1)      # explore
            path.pop()            # un-choose
            backtrack(i + 1)      # explore without nums[i]

        backtrack(0)
        return out
```

This is the backtracking template at its plainest. At each level the function makes one decision, whether to take `nums[i]`, by changing `path`; it explores everything that follows from that choice; then it undoes the change before trying the other option. Every root-to-leaf path through these decisions is one subset, and the leaves are where they get recorded.

There are 2ⁿ leaves and each copy costs up to n, so the time is O(n · 2ⁿ), which is also the size of the answer. Apart from the output, the recursion uses O(n) space: the depth and `path`.

## Alternatives

### Grow subsets from a start index

```python alt time="n · 2^n" space="n"
class Solution:
    def subsets(self, nums: List[int]) -> List[List[int]]:
        out, path = [], []

        def backtrack(start):
            out.append(path[:])  # every node of this tree is a subset
            for j in range(start, len(nums)):
                path.append(nums[j])
                backtrack(j + 1)  # only later numbers, so each subset is built once
                path.pop()

        backtrack(0)
        return out
```

Here each call records the current subset, then tries to extend it with each number that comes *after* the last one taken. Only moving forward means every subset is built in exactly one order, so there are no duplicates. This loop-from-start shape is the one that combination problems use.

### Build the list without recursion

```python alt time="n · 2^n" space="n · 2^n"
class Solution:
    def subsets(self, nums: List[int]) -> List[List[int]]:
        out = [[]]
        for x in nums:
            out += [s + [x] for s in out]  # every subset so far, with and without x
        return out
```

The subsets of the first k numbers, plus a copy of each with the next number added, are the subsets of the first k + 1 numbers. The list doubles with every number.

## Wrong answers

### Records `path` itself, not a copy

```python wrong fails="example" test="Example 1"
class Solution:
    def subsets(self, nums: List[int]) -> List[List[int]]:
        out, path = [], []

        def backtrack(i):
            if i == len(nums):
                out.append(path)  # the same list object every time
                return
            path.append(nums[i])
            backtrack(i + 1)
            path.pop()
            backtrack(i + 1)

        backtrack(0)
        return out
```

`out.append(path)` stores a reference to the one `path` list, not its current contents. Every entry of `out` is that same list, and by the end the backtracking has emptied it, so the answer is `[[], [], [], []]`. Append `path[:]` or `list(path)` to keep a snapshot.

### Forgets the empty subset

```python wrong fails="example" test="Example 1"
class Solution:
    def subsets(self, nums: List[int]) -> List[List[int]]:
        out, path = [], []

        def backtrack(start):
            for j in range(start, len(nums)):
                path.append(nums[j])
                out.append(path[:])  # records each subset as it grows, but never the empty one
                backtrack(j + 1)
                path.pop()

        backtrack(0)
        return out
```

Recording right after each append catches every non-empty subset, but the empty subset never has an append. Record at the start of each call instead, which covers the empty `path` of the first call.

### Revisits earlier numbers

```python wrong fails="example" test="Example 1"
class Solution:
    def subsets(self, nums: List[int]) -> List[List[int]]:
        out, path = [], []

        def backtrack():
            out.append(path[:])
            for x in nums:  # starts from the beginning every time
                if x not in path:
                    path.append(x)
                    backtrack()
                    path.pop()

        backtrack()
        return out
```

Looping over all the numbers at every level builds each subset in every possible order: `[4, 7]` and `[7, 4]` are the same subset, but both are listed. Start each loop after the last number taken, so a subset can only be built in increasing position order.
