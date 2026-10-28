---
id: 55
module: greedy
patterns: [farthest reach, one pass]
signature: "def canJump(self, nums: List[int]) -> bool"
---

## Task

You stand on the first element of `nums`. From index i you may jump forward by any number of steps from 0 up to `nums[i]`. Return `True` if you can reach the last index.

## Constraints

- `1 <= len(nums) <= 100_000`
- `0 <= nums[i] <= 100_000`

```json examples
[
  {"args": [[1, 2, 0, 1, 0]], "out": true, "why": "Jump 1 to index 1, then 2 to index 3, then 1 to the end. The 0 at index 2 is simply jumped over."},
  {"args": [[2, 1, 0, 3]], "out": false, "why": "Every route lands on index 2 at best, and its jump length is 0, so index 3 stays out of reach."},
  {"args": [[0]], "out": true, "why": "With a single element you're already standing on the last index."}
]
```

```json edge
[
  {"name": "stuck at the start", "args": [[0, 1]], "out": false},
  {"name": "one big jump", "args": [[5, 0, 0, 0, 0]], "out": true},
  {"name": "one step at a time", "args": [[1, 1, 1, 1]], "out": true},
  {"name": "all zeros", "args": [[0, 0, 0]], "out": false},
  {"name": "a long jump that falls one short", "args": [[3, 0, 0, 0, 1]], "out": false},
  {"name": "the longest jump lands on a zero", "args": [[2, 3, 0, 0, 1]], "out": true}
]
```

```python oracle
class Solution:
    def canJump(self, nums: List[int]) -> bool:
        reachable = [False] * len(nums)
        reachable[0] = True
        for i in range(len(nums)):  # mark everything each reachable index can jump to
            if reachable[i]:
                for j in range(i + 1, min(len(nums), i + nums[i] + 1)):
                    reachable[j] = True
        return reachable[-1]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 6) if size == "small" else rng.randint(6, 40)
    return [[rng.choice([0, 0, 1, 1, 2, 3]) for _ in range(n)]]
```

```python perf
def perf(rng):
    # 100,000 elements with long jumps, but zeros near the end leave the last index out of reach.
    n = 100_000
    nums = [rng.randint(50_000, 100_000) for _ in range(n)]
    for i in range(n):
        nums[i] = min(nums[i], n - 2 - i) if i < n - 1 else 0  # nobody can jump past index n - 2
    return [nums]
```

## Hints

1. You don't need to know *how* to get somewhere, only how far you can get.
2. Walk from left to right, keeping the farthest index reachable so far. Every index up to that point is reachable too, since you could always jump shorter.
3. If you ever stand at an index beyond the farthest reachable one, you're stuck. Otherwise extend the reach with `i + nums[i]`.

## Solution

```python solution time="n" space="1"
class Solution:
    def canJump(self, nums: List[int]) -> bool:
        reach = 0  # the farthest index reachable so far
        for i, jump in enumerate(nums):
            if i > reach:
                return False  # this index can't be reached, so nothing after it can
            reach = max(reach, i + jump)
        return True
```

Reachable indices always form a prefix: if you can get to index r, you can get to every index before it, by jumping a little shorter somewhere. So a single number, the end of that prefix, describes everything reachable. Each index that's inside the prefix may push its end further. If the scan meets an index past the end, there's a gap that no jump crosses. One pass: O(n) time, O(1) space.

## Alternatives

### Walk backwards from the goal

```python alt time="n" space="1"
class Solution:
    def canJump(self, nums: List[int]) -> bool:
        goal = len(nums) - 1  # the leftmost index known to reach the end
        for i in range(len(nums) - 2, -1, -1):
            if i + nums[i] >= goal:
                goal = i  # from i you can jump to something that reaches the end
        return goal == 0
```

Going right to left, keep the leftmost index from which the end is known to be reachable. An index that can jump to it becomes the new goal. The answer is whether the goal reaches the start.

## Wrong answers

### Always jumps as far as possible

```python wrong fails="edge" test="the longest jump lands on a zero"
class Solution:
    def canJump(self, nums: List[int]) -> bool:
        i = 0
        while i < len(nums) - 1:
            if nums[i] == 0:
                return False  # stuck here
            i += nums[i]  # the longest jump, every time
        return True
```

The longest jump isn't always the best one: it can land on a 0 that a shorter jump would have avoided. From index 0 of `[2, 3, 0, 0, 1]`, jumping 2 lands on a 0 and gets stuck, while jumping 1 reaches the 3, which gets to the end. Keeping the farthest reach considers every jump length at once.

### Gives up at the first zero

```python wrong fails="example" test="Example 1"
class Solution:
    def canJump(self, nums: List[int]) -> bool:
        return len(nums) == 1 or 0 not in nums[:-1]  # a zero anywhere before the end means "stuck"
```

A 0 only traps you if you have to land on it. In Example 1 the 0 at index 2 can be jumped over from index 1. Only a 0 that no earlier index can get past blocks the way.

### Marks every index each jump can reach

```python wrong fails="perf"
class Solution:
    def canJump(self, nums: List[int]) -> bool:
        reachable = [False] * len(nums)
        reachable[0] = True
        for i in range(len(nums)):
            if reachable[i]:
                for j in range(i + 1, min(len(nums), i + nums[i] + 1)):  # every landing spot
                    reachable[j] = True
        return reachable[-1]
```

Marking every landing spot of every jump is correct, but a jump of length k costs k steps. With 100,000 elements and jumps of tens of thousands, that's billions of marks. Since reachable indices always form a prefix, one number, the farthest reach, says the same thing.
