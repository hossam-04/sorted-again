---
id: 45
module: greedy
patterns: [breadth-first levels on an array, farthest reach per jump]
signature: "def jump(self, nums: List[int]) -> int"
no_slow_wrong: the natural slower approach, the fewest jumps for every index, is shown as a slow alternative
---

## Task

You stand on the first element of `nums`. From index i you may jump forward by any number of steps from 1 up to `nums[i]`. Return the smallest number of jumps that gets you to the last index. The tests always make the last index reachable.

## Constraints

- `1 <= len(nums) <= 100_000`
- `0 <= nums[i] <= 1000`

```json examples
[
  {"args": [[2, 4, 1, 1, 1, 1]], "out": 2, "why": "Jump 1 step to index 1, whose 4 reaches the last index: 2 jumps. Jumping as far as possible first, to index 2, would take 4."},
  {"args": [[1, 1, 1, 1]], "out": 3, "why": "Every jump moves one step, so three jumps cover the three steps."},
  {"args": [[0]], "out": 0, "why": "You start on the last index, so no jump is needed."}
]
```

```json edge
[
  {"name": "one jump reaches the end", "args": [[5, 1, 1, 1, 1, 1]], "out": 1},
  {"name": "two elements", "args": [[1, 2]], "out": 1},
  {"name": "zeros to jump over", "args": [[3, 0, 0, 1, 2]], "out": 2},
  {"name": "the best second jump comes from the middle", "args": [[1, 3, 1, 1, 1, 2, 1]], "out": 4}
]
```

```python oracle
class Solution:
    def jump(self, nums: List[int]) -> int:
        n = len(nums)
        fewest = [inf] * n  # fewest jumps to reach each index
        fewest[0] = 0
        for i in range(n):
            for j in range(i + 1, min(n, i + nums[i] + 1)):
                fewest[j] = min(fewest[j], fewest[i] + 1)
        return fewest[-1]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 6) if size == "small" else rng.randint(6, 40)
    while True:  # the last index must be reachable
        nums = [rng.choice([0, 1, 1, 2, 3]) for _ in range(n)]
        reach = 0
        for i, jump in enumerate(nums):
            if i > reach:
                break
            reach = max(reach, i + jump)
        else:
            return [nums]
```

```python perf
def perf(rng):
    # 100,000 elements with jumps of up to 1,000.
    return [[rng.randint(1, 1000) for _ in range(100_000)]]
```

## Hints

1. Group the indices by the number of jumps needed to reach them: index 0 needs 0, the indices it can reach need 1, and so on. Each group is a contiguous range, like the levels of a breadth-first search.
2. While scanning the current range, track the farthest index reachable with one more jump. That's where the next range ends.
3. When the scan reaches the end of the current range, you must jump again: count it and move the range's end to the farthest point found. Stop before the last index, since no jump is made from there.

## Solution

```python solution time="n" space="1"
class Solution:
    def jump(self, nums: List[int]) -> int:
        jumps = end = farthest = 0  # [.., end] is reachable with `jumps` jumps
        for i in range(len(nums) - 1):  # no jump is needed from the last index
            farthest = max(farthest, i + nums[i])
            if i == end:  # every index reachable with `jumps` jumps has been looked at
                jumps += 1
                end = farthest
        return jumps
```

This is breadth-first search without a queue. The indices reachable with exactly k jumps form a range, and scanning that range finds how far k + 1 jumps can get. Reaching the end of the range is the moment the next jump must be made, and its new range ends at the farthest point seen.

The loop stops before the last index: once you're there, no more jumps are needed, and counting one at that point would be one too many. One pass: O(n) time, O(1) space.

## Alternatives

### Fewest jumps for every index

```python alt time="n · k" space="n" slow
class Solution:
    def jump(self, nums: List[int]) -> int:
        n = len(nums)
        fewest = [inf] * n
        fewest[0] = 0
        for i in range(n):
            for j in range(i + 1, min(n, i + nums[i] + 1)):  # every index one jump away
                fewest[j] = min(fewest[j], fewest[i] + 1)
        return fewest[-1]
```

Dynamic programming over indices: the fewest jumps to reach j is one more than the fewest to reach some index that can jump to j. It's easy to trust, but each index updates up to k others, where k is the longest jump: with jumps of up to 1,000 over 100,000 elements, that's tens of millions of updates.

## Wrong answers

### Always jumps as far as possible

```python wrong fails="example" test="Example 1"
class Solution:
    def jump(self, nums: List[int]) -> int:
        i = jumps = 0
        while i < len(nums) - 1:
            i += nums[i]  # the longest jump from here
            jumps += 1
        return jumps
```

The longest jump can land on a short one, while a shorter jump might land on a long one. From index 0 of Example 1, jumping 2 lands on a 1, and three more jumps follow; jumping 1 lands on the 4, which finishes in one more. The right choice is the jump whose *landing spot* reaches farthest.

### Counts a jump from the last index

```python wrong fails="example" test="Example 1"
class Solution:
    def jump(self, nums: List[int]) -> int:
        jumps = end = farthest = 0
        for i in range(len(nums)):  # includes the last index
            farthest = max(farthest, i + nums[i])
            if i == end:
                jumps += 1
                end = farthest
        return jumps
```

When a range happens to end exactly at the last index, scanning that index triggers one more jump, though you've already arrived. In Example 1 the second jump's range ends at index 5, the last one, and the answer comes out as 3. Loop up to the second-to-last index.
