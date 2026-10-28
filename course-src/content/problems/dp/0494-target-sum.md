---
id: 494
module: dp
patterns: [counting by reachable sums, signs as choices]
signature: "def findTargetSumWays(self, nums: List[int], target: int) -> int"
---

## Task

Put a `+` or a `-` in front of every number in `nums` and add them all up. Return the number of ways to choose the signs so that the result equals `target`.

## Constraints

- `1 <= len(nums) <= 30`
- `0 <= nums[i] <= 1000`, and `sum(nums) <= 1000`
- `-1000 <= target <= 1000`

```json examples
[
  {"args": [[2, 1, 1], 2], "out": 2, "why": "+2 + 1 − 1 and +2 − 1 + 1 both make 2."},
  {"args": [[3], -3], "out": 1, "why": "Only −3."},
  {"args": [[0, 0, 1], 1], "out": 4, "why": "The 1 must be positive, and each 0 can take either sign: 2 × 2 = 4 ways."}
]
```

```json edge
[
  {"name": "out of reach", "args": [[1, 2, 3], 7], "out": 0},
  {"name": "balancing to zero", "args": [[5, 5, 5, 5], 0], "out": 6},
  {"name": "six ones", "args": [[1, 1, 1, 1, 1, 1], 2], "out": 15},
  {"name": "the wrong parity", "args": [[2, 4], 1], "out": 0},
  {"name": "a single number can't vanish", "args": [[7], 0], "out": 0}
]
```

```python oracle
class Solution:
    def findTargetSumWays(self, nums: List[int], target: int) -> int:
        return sum(1 for signs in itertools.product((1, -1), repeat=len(nums))
                   if sum(s * x for s, x in zip(signs, nums)) == target)
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 5) if size == "small" else rng.randint(5, 12)
    nums = [rng.randint(0, 5) for _ in range(n)]
    return [nums, rng.randint(-sum(nums) - 1, sum(nums) + 1)]
```

```python perf
def perf(rng):
    # 30 numbers adding up to at most 1,000: over a billion ways to choose the signs.
    nums = [rng.randint(0, 33) for _ in range(30)]
    return [nums, rng.choice([0, 1, 2, 3])]
```

## Hints

1. Trying all 2ⁿ sign choices is too many, but the running total can only take a limited number of values: between −sum and +sum.
2. Process the numbers one at a time, keeping a count of how many sign choices reach each possible total so far.
3. A dict from total to count works well: each number turns every total t into t + x and t − x, adding the counts.

## Solution

```python solution time="n · sum" space="sum"
class Solution:
    def findTargetSumWays(self, nums: List[int], target: int) -> int:
        ways = {0: 1}  # running total -> number of sign choices that reach it
        for x in nums:
            nxt = defaultdict(int)
            for total, count in ways.items():
                nxt[total + x] += count  # +x
                nxt[total - x] += count  # -x
            ways = nxt
        return ways.get(target, 0)
```

Many different sign choices lead to the same running total, and from then on they behave identically, so they can be counted together. After processing i numbers, `ways` maps each reachable total to how many choices reach it, and there are at most 2·sum + 1 totals. Each number updates them all: O(n · sum) time.

A zero works out naturally: +0 and −0 lead to the same total, so its count doubles, as it should, since the two signs are different choices.

## Alternatives

### Turn it into a subset count

```python alt time="n · sum" space="sum"
class Solution:
    def findTargetSumWays(self, nums: List[int], target: int) -> int:
        total = sum(nums)
        if (total + target) % 2 or abs(target) > total:
            return 0
        goal = (total + target) // 2  # the numbers with a + sign must add up to this
        count = [1] + [0] * goal
        for x in nums:
            for s in range(goal, x - 1, -1):  # 0/1 knapsack: each number once
                count[s] += count[s - x]
        return count[goal]
```

If P is the sum of the numbers with a + sign, the rest add up to total − P, and the result is P − (total − P) = 2P − total. So the result equals the target exactly when P = (total + target) / 2. Counting subsets with that sum is the 0/1 knapsack of [[p:416]], counting instead of checking.

## Wrong answers

### Counts subsets that reach the target

```python wrong fails="example" test="Example 2"
class Solution:
    def findTargetSumWays(self, nums: List[int], target: int) -> int:
        ways = {0: 1}
        for x in nums:
            nxt = defaultdict(int)
            for total, count in ways.items():
                nxt[total + x] += count  # take x
                nxt[total] += count  # leave x out: but every number must be added or subtracted
            ways = nxt
        return ways.get(target, 0)
```

Leaving a number out isn't an option: each one gets a + or a −. This counts the subsets that add up to the target, a different question: in Example 2 no subset of `[3]` adds up to −3, yet −3 is a valid choice of sign.

### Records which totals are reachable, not how often

```python wrong fails="example" test="Example 1"
class Solution:
    def findTargetSumWays(self, nums: List[int], target: int) -> int:
        reachable = {0}
        for x in nums:
            reachable = {t + x for t in reachable} | {t - x for t in reachable}  # one entry per total
        return 1 if target in reachable else 0
```

A set remembers that a total can be reached, but not in how many ways. Different sign choices that land on the same total collapse into one entry, so the answer is never more than 1. Keep a count per total.

### Tries every choice of signs

```python wrong fails="perf"
class Solution:
    def findTargetSumWays(self, nums: List[int], target: int) -> int:
        def count(i, total):
            if i == len(nums):
                return 1 if total == target else 0
            return count(i + 1, total + nums[i]) + count(i + 1, total - nums[i])  # both signs, every time

        return count(0, 0)
```

Branching on both signs for every number visits all 2ⁿ choices: for 30 numbers, over a billion. Choices that reach the same total at the same index have the same future, so counting them together, by total, is enough.
