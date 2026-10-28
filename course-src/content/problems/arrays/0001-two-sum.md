---
id: 1
module: arrays
patterns: [complement lookup, hash map]
signature: "def twoSum(self, nums: List[int], target: int) -> List[int]"
compare: unordered
---

## Task

You get a list of integers `nums` and an integer `target`. Exactly one pair of entries, at two different positions, adds up to `target`.

Return the two positions (counting from 0) as a list of two integers. Either order is fine. You can't use one position twice, even if `nums[i] + nums[i] == target`.

## Constraints

- `2 <= len(nums) <= 100_000`
- `-10**9 <= nums[i], target <= 10**9`
- Exactly one valid pair exists

```json examples
[
  {"args": [[8, 1, 5, 12], 6], "out": [1, 2], "why": "1 + 5 = 6, and they sit at positions 1 and 2."},
  {"args": [[-3, 4, 10, 7], 7], "out": [0, 2], "why": "-3 + 10 = 7: a negative number can be part of the pair."},
  {"args": [[6, 2, 6], 12], "out": [0, 2], "why": "The value 6 appears twice, and the answer uses both copies."}
]
```

```json edge
[
  {"name": "two elements", "args": [[5, -5], 0], "out": [0, 1]},
  {"name": "pair at the end", "args": [[1, 2, 3, 40, 50], 90], "out": [3, 4]},
  {"name": "first and last", "args": [[11, 3, 4, 20], 31], "out": [0, 3]},
  {"name": "zero target", "args": [[-6, 2, 6, 9], 0], "out": [0, 2]},
  {"name": "half the target appears once", "args": [[5, 4, 6, 1], 10], "out": [1, 2]},
  {"name": "duplicates that are not the answer", "args": [[2, 2, 9, 4], 13], "out": [2, 3]},
  {"name": "only negatives", "args": [[-1, -2, -3, -4, -5], -8], "out": [2, 4]},
  {"name": "extreme values", "args": [[1000000000, 7, -999999999, 3], 1], "out": [0, 2]}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(2, 8) if size == "small" else rng.randint(20, 300)
    lo, hi = (-20, 20) if size == "small" else (-10**6, 10**6)
    while True:
        nums = [rng.randint(lo, hi) for _ in range(n)]
        i, j = rng.sample(range(n), 2)
        target = nums[i] + nums[j]
        pairs = sum(1 for a in range(n) for b in range(a + 1, n) if nums[a] + nums[b] == target)
        if pairs == 1:
            return [nums, target]
```

```python perf
def perf(rng):
    # All values are multiples of 4 except two that are 1 mod 4. The target is 2 mod 4, so only those two
    # can make it, and they sit at the very end: a pair-by-pair search has to look at nearly every pair.
    n = 100_000
    nums = [4 * x for x in rng.sample(range(-200_000_000, 200_000_000), n - 2)]
    a, b = 4 * rng.randint(-1000, 1000) + 1, 4 * rng.randint(-1000, 1000) + 1
    return [nums + [a, b], a + b]
```

## Hints

1. For each value `x`, the only partner that works is `target - x`.
2. Instead of searching the list for that partner, remember the values you have already passed in a dict.
3. Walk the list once. At each position, look up `target - x` among the values before it, then store `x` with its position.

## Solution

```python solution time="n" space="n"
class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}  # value -> position, for every value before i
        for i, x in enumerate(nums):
            if target - x in seen:
                return [seen[target - x], i]
            seen[x] = i
        return []
```

`seen` holds every value to the left of `i` with its position. When the loop reaches the second number of the pair, the first one is already in `seen`, so the lookup finds it. Checking before storing `x` makes it impossible to pair a position with itself, and a value that appears twice still works: the first copy is stored, and the second copy finds it.

Each lookup and insert in a dict takes O(1) on average, so one pass costs O(n) time. The dict can hold up to n entries.

## Alternatives

### Try every pair

```python alt time="n²" space="1" slow oracle
class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        for i in range(len(nums)):
            for j in range(i + 1, len(nums)):
                if nums[i] + nums[j] == target:
                    return [i, j]
        return []
```

Correct and uses no extra memory, but it checks up to n(n-1)/2 pairs: about 5 billion on the performance test.

### Sort positions by value, then use two pointers

```python alt time="n log n" space="n"
class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        order = sorted(range(len(nums)), key=lambda k: nums[k])
        l, r = 0, len(order) - 1
        while l < r:
            s = nums[order[l]] + nums[order[r]]
            if s == target:
                return [order[l], order[r]]
            if s < target:
                l += 1
            else:
                r -= 1
        return []
```

Sorting lets you use the converging walk from [[p:167]]. The trick is to sort the *positions*, so the answer can still name the original ones. It costs O(n log n) for the sort.

## Wrong answers

### Sorts the numbers and loses the positions

```python wrong fails="example" test="Example 1"
class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        nums = sorted(nums)
        l, r = 0, len(nums) - 1
        while l < r:
            s = nums[l] + nums[r]
            if s == target:
                return [l, r]  # positions in the sorted copy, not in the input
            if s < target:
                l += 1
            else:
                r -= 1
        return []
```

The two-pointer walk finds the right values, but `l` and `r` index the sorted copy. In `[8, 1, 5, 12]` the pair 1 + 5 sits at positions 0 and 1 after sorting and at 1 and 2 in the input.

### Can pair a number with itself

```python wrong fails="edge" test="half the target appears once"
class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        index = {x: i for i, x in enumerate(nums)}
        for i, x in enumerate(nums):
            if target - x in index:  # finds x itself when x is half the target
                return [i, index[target - x]]
        return []
```

Building the whole dict first means every value is in it, including `x` itself. With target 10 and a single 5, the lookup for `10 - 5` finds that same 5 and returns `[0, 0]`. Checking `index[target - x] != i` or filling the dict as you go fixes it.

### Searches the rest of the list for the partner

```python wrong fails="perf"
class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        for i, x in enumerate(nums):
            if target - x in nums[i + 1:]:  # copies the rest of the list, then scans it
                return [i, nums.index(target - x, i + 1)]
        return []
```

It reads like one loop, but `nums[i + 1:]` copies the rest of the list and `in` scans it. That's O(n) work per position and O(n²) overall, the same as trying every pair.

## Notes

If the input were sorted, two pointers would find the pair with O(1) extra space; that's [[p:167]]. In an interview, say why you check `seen` before storing `x`: it is what stops the same position being used twice.
