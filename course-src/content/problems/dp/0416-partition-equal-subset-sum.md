---
id: 416
module: dp
patterns: [0/1 knapsack, reachable sums, backwards loop]
signature: "def canPartition(self, nums: List[int]) -> bool"
---

## Task

Can the numbers in `nums` be split into two groups with equal sums? Every number goes into exactly one group. Return `True` or `False`.

## Constraints

- `1 <= len(nums) <= 200`
- `1 <= nums[i] <= 100`

```json examples
[
  {"args": [[3, 1, 4, 2]], "out": true, "why": "The total is 10, and 3 + 2 = 1 + 4 = 5."},
  {"args": [[2, 3, 7]], "out": false, "why": "The total is 12, so each group needs 6, but no subset adds up to 6: the sums available are 2, 3, 5, 7, 9, 10 and 12."},
  {"args": [[5, 5]], "out": true, "why": "One 5 in each group."}
]
```

```json edge
[
  {"name": "a single number", "args": [[1]], "out": false},
  {"name": "an odd total", "args": [[1, 2, 5]], "out": false},
  {"name": "all equal", "args": [[2, 2, 2, 2]], "out": true},
  {"name": "one big number against many small ones", "args": [[1, 1, 1, 1, 1, 1, 6]], "out": true},
  {"name": "two large numbers", "args": [[100, 99, 1]], "out": true}
]
```

```python oracle
class Solution:
    def canPartition(self, nums: List[int]) -> bool:
        total = sum(nums)
        return total % 2 == 0 and any(
            sum(group) == total // 2 for k in range(len(nums) + 1) for group in itertools.combinations(nums, k))
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 6) if size == "small" else rng.randint(6, 14)
    return [[rng.randint(1, 10 if size == "small" else 30) for _ in range(n)]]
```

```python perf
def perf(rng):
    # 100 even numbers whose total is 2 more than a multiple of 4: half the total is odd, and even
    # numbers can't add up to an odd number, so no split works and every subset has to be ruled out.
    nums = [2 * rng.randint(1, 50) for _ in range(100)]
    if sum(nums) % 4 == 0:
        nums[0] = nums[0] + 2 if nums[0] < 100 else nums[0] - 2
    return [nums]
```

## Hints

1. Two equal groups each sum to half the total. So the total must be even, and the question becomes: does some subset add up to exactly `total / 2`?
2. Keep the set of sums that some subset of the numbers seen so far can reach, starting from {0}. Each new number x adds `s + x` for every reachable sum s.
3. As a table: `can[s]` for s from 0 to the target. Update it for each number with s going **downwards**, so that `can[s − x]` still refers to sums made without x and each number is used at most once.

## Solution

```python solution time="n · total" space="total"
class Solution:
    def canPartition(self, nums: List[int]) -> bool:
        total = sum(nums)
        if total % 2:
            return False
        target = total // 2
        can = [True] + [False] * target  # can[s]: some subset of the numbers so far adds up to s
        for x in nums:
            for s in range(target, x - 1, -1):  # downwards: can[s - x] doesn't include x yet
                if can[s - x]:
                    can[s] = True
        return can[target]
```

This is the **0/1 knapsack** shape: each number is either in the first group or not, and the table records which sums are reachable. Processing the numbers one at a time, a sum is reachable with x if it was reachable without x, or if `s − x` was.

The direction of the inner loop matters. Going down, `can[s − x]` hasn't been updated in this round, so it describes subsets *without* x, and each number is used at most once. Going up would let x build on sums that already include x, as if it could be used again. With the target at most 10,000, that's O(n · total) simple steps.

## Alternatives

### A set of reachable sums

```python alt time="n · total" space="total"
class Solution:
    def canPartition(self, nums: List[int]) -> bool:
        total = sum(nums)
        if total % 2:
            return False
        reachable = {0}
        for x in nums:
            reachable |= {s + x for s in reachable if s + x <= total // 2}  # built from the old set only
        return total // 2 in reachable
```

The same idea with a set. The new sums are computed from the old set before it's updated, so each number is used once without thinking about loop direction.

### A bit set

```python alt time="n · total / w" space="total / w"
class Solution:
    def canPartition(self, nums: List[int]) -> bool:
        total = sum(nums)
        if total % 2:
            return False
        bits = 1  # bit s is set when the sum s is reachable
        for x in nums:
            bits |= bits << x  # every reachable sum, shifted by x
        return bool(bits >> (total // 2) & 1)
```

One Python integer can serve as the whole table: bit s means "sum s is reachable", and shifting by x adds x to every reachable sum at once. It's the same algorithm, but each shift and `|` runs in C over a whole machine word of sums at a time: w sums per step, where w is 30 for CPython's integers.

## Wrong answers

### Loops the sums upwards

```python wrong fails="example" test="Example 2"
class Solution:
    def canPartition(self, nums: List[int]) -> bool:
        total = sum(nums)
        if total % 2:
            return False
        target = total // 2
        can = [True] + [False] * target
        for x in nums:
            for s in range(x, target + 1):  # upwards: can[s - x] may already include x
                if can[s - x]:
                    can[s] = True
        return can[target]
```

Going up, `can[2]` set by x = 2 immediately makes `can[4]` and then `can[6]` true in the same round, as if 2 could be used three times. In Example 2 that "finds" 2 + 2 + 2 = 6. This is the **unbounded** knapsack loop, right for [[p:518]] but wrong when each item can be used once.

### Only checks that the total is even

```python wrong fails="example" test="Example 2"
class Solution:
    def canPartition(self, nums: List[int]) -> bool:
        return sum(nums) % 2 == 0  # necessary, but not enough
```

An even total is needed, but the numbers must also be able to make half of it. In Example 2 the total is 12, yet no subset adds up to 6.

### Tries every subset

```python wrong fails="perf"
class Solution:
    def canPartition(self, nums: List[int]) -> bool:
        total = sum(nums)
        if total % 2:
            return False

        def can(i, remaining):  # can nums[i:] make exactly `remaining`?
            if remaining == 0:
                return True
            if i == len(nums) or remaining < 0:
                return False
            return can(i + 1, remaining - nums[i]) or can(i + 1, remaining)  # take it or leave it

        return can(0, total // 2)
```

Taking or leaving each number explores up to 2ⁿ subsets: with 100 numbers and no valid split, the search can't stop early. The table needs only one entry per possible sum, at most 10,000.
