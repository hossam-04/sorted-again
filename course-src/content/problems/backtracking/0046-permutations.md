---
id: 46
module: backtracking
patterns: [backtracking, used markers, permutations]
signature: "def permute(self, nums: List[int]) -> List[List[int]]"
compare: unordered
---

## Task

You get a list of different integers, `nums`. Return every way to arrange all of them in a row: every *permutation*. The permutations can come in any order.

## Constraints

- `1 <= len(nums) <= 8`
- `-10 <= nums[i] <= 10`, all different

```json examples
[
  {"args": [[4, 7]], "out": [[4, 7], [7, 4]], "why": "Two numbers can stand in two orders."},
  {"args": [[3, 1, 2]], "out": [[3, 1, 2], [3, 2, 1], [1, 3, 2], [1, 2, 3], [2, 3, 1], [2, 1, 3]], "why": "Any of the 3 numbers can go first, then either of the other 2, then the last one: 3 × 2 × 1 = 6 orders."},
  {"args": [[-5]], "out": [[-5]], "why": "A single number has exactly one arrangement."}
]
```

```json edge
[
  {"name": "four numbers", "args": [[1, 2, 3, 4]], "out": [[1, 2, 3, 4], [1, 2, 4, 3], [1, 3, 2, 4], [1, 3, 4, 2], [1, 4, 2, 3], [1, 4, 3, 2], [2, 1, 3, 4], [2, 1, 4, 3], [2, 3, 1, 4], [2, 3, 4, 1], [2, 4, 1, 3], [2, 4, 3, 1], [3, 1, 2, 4], [3, 1, 4, 2], [3, 2, 1, 4], [3, 2, 4, 1], [3, 4, 1, 2], [3, 4, 2, 1], [4, 1, 2, 3], [4, 1, 3, 2], [4, 2, 1, 3], [4, 2, 3, 1], [4, 3, 1, 2], [4, 3, 2, 1]]},
  {"name": "negative numbers", "args": [[-1, -2]], "out": [[-1, -2], [-2, -1]]},
  {"name": "zero in the middle", "args": [[5, 0, -5]], "out": [[5, 0, -5], [5, -5, 0], [0, 5, -5], [0, -5, 5], [-5, 5, 0], [-5, 0, 5]]}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 4) if size == "small" else rng.randint(4, 6)
    return [rng.sample(range(-10, 11), n)]
```

```python perf
def perf(rng):
    # 8 numbers: 40,320 permutations.
    return [rng.sample(range(-10, 11), 8)]
```

## Hints

1. Fill the positions one at a time. For the first position you can use any number; for each later one, any number not used yet.
2. Keep a list of which numbers are already in the current arrangement, so each level knows what's left to choose from.
3. Choose, explore, un-choose: mark a number as used, append it, recurse, then pop it and unmark it before trying the next number.

## Solution

```python solution time="n · n!" space="n"
class Solution:
    def permute(self, nums: List[int]) -> List[List[int]]:
        out, path = [], []
        used = [False] * len(nums)  # used[i]: is nums[i] in path already?

        def backtrack():
            if len(path) == len(nums):
                out.append(path[:])
                return
            for i, x in enumerate(nums):
                if not used[i]:
                    used[i] = True
                    path.append(x)
                    backtrack()
                    path.pop()
                    used[i] = False  # undo both changes before trying the next number

        backtrack()
        return out
```

Unlike subsets and combinations, a permutation can use the numbers in any order, so every level loops over *all* the numbers and skips the ones already in the path. The `used` list makes that check O(1). Undoing both the `path` and the `used` mark after each recursive call restores the state for the next choice.

There are n! permutations and each copy costs n, so the time is O(n · n!), the size of the answer. The recursion is n deep.

## Alternatives

### Swap numbers into place

```python alt time="n · n!" space="n"
class Solution:
    def permute(self, nums: List[int]) -> List[List[int]]:
        nums = list(nums)
        out = []

        def backtrack(i):  # nums[:i] is fixed; arrange nums[i:]
            if i == len(nums):
                out.append(nums[:])
                return
            for j in range(i, len(nums)):
                nums[i], nums[j] = nums[j], nums[i]  # choose nums[j] for position i
                backtrack(i + 1)
                nums[i], nums[j] = nums[j], nums[i]  # swap back

        backtrack(0)
        return out
```

The list itself holds the arrangement: positions before `i` are decided, and the numbers from `i` on are exactly the unused ones. Swapping each of them into position `i` in turn, and back afterwards, needs no `used` list and no `path`.

### `itertools.permutations`

```python alt time="n · n!" space="n · n!" oracle
class Solution:
    def permute(self, nums: List[int]) -> List[List[int]]:
        return [list(p) for p in permutations(nums)]
```

The library generates them for you, which is what you'd write at work. In an interview, it's usually the backtracking they want to see.

## Wrong answers

### Forgets to unmark a number

```python wrong fails="example" test="Example 1"
class Solution:
    def permute(self, nums: List[int]) -> List[List[int]]:
        out, path = [], []
        used = [False] * len(nums)

        def backtrack():
            if len(path) == len(nums):
                out.append(path[:])
                return
            for i, x in enumerate(nums):
                if not used[i]:
                    used[i] = True
                    path.append(x)
                    backtrack()
                    path.pop()  # but used[i] stays True

        backtrack()
        return out
```

Popping the number off `path` undoes only half of the choice. With `used[i]` still `True`, no later branch can use that number again, so after the first full arrangement every other branch is a dead end. Undo every change a choice made.

### Only moves forward through the list

```python wrong fails="example" test="Example 1"
class Solution:
    def permute(self, nums: List[int]) -> List[List[int]]:
        out, path = [], []

        def backtrack(start):
            if len(path) == len(nums):
                out.append(path[:])
                return
            for j in range(start, len(nums)):  # never looks back at earlier numbers
                path.append(nums[j])
                backtrack(j + 1)
                path.pop()

        backtrack(0)
        return out
```

Starting each loop after the last number taken is right for subsets and combinations, where order doesn't matter. A permutation must be able to put a later number first, so this finds only the original order. Loop over all numbers and skip the used ones.

### Tries every sequence, then keeps the valid ones

```python wrong fails="perf"
class Solution:
    def permute(self, nums: List[int]) -> List[List[int]]:
        n = len(nums)
        return [list(seq) for seq in product(nums, repeat=n) if len(set(seq)) == n]  # nⁿ sequences
```

Every sequence of n numbers with repeats allowed, filtered down to those without a repeat, does contain every permutation. But there are nⁿ sequences: for 8 numbers, 16.8 million of them for 40,320 permutations. Backtracking never builds a sequence with a repeat in the first place.
