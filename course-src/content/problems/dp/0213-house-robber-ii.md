---
id: 213
module: dp
patterns: [break the circle into two lines, take or skip]
signature: "def rob(self, nums: List[int]) -> int"
---

## Task

This time the houses stand in a **circle**: house i holds `nums[i]`, and the first and last houses are neighbours too. You can never take from two neighbouring houses. Return the largest total you can take.

## Constraints

- `1 <= len(nums) <= 20_000`
- `0 <= nums[i] <= 1000`

```json examples
[
  {"args": [[3, 5, 3]], "out": 5, "why": "The two 3s are neighbours across the circle, so you can't take both. The 5 alone is best."},
  {"args": [[2, 4, 8, 3]], "out": 10, "why": "2 + 8 = 10. The first house and the third aren't neighbours, even in a circle."},
  {"args": [[1, 3, 1, 3, 100]], "out": 103, "why": "Taking 100 rules out its neighbours, the first house and the 3 before it: 3 + 100 = 103."}
]
```

```json edge
[
  {"name": "a single house", "args": [[9]], "out": 9},
  {"name": "two houses", "args": [[4, 4]], "out": 4},
  {"name": "rich houses at both ends", "args": [[6, 1, 1, 6]], "out": 7},
  {"name": "five houses", "args": [[5, 1, 1, 5, 1]], "out": 10}
]
```

```python oracle
class Solution:
    def rob(self, nums: List[int]) -> int:
        n, best = len(nums), 0
        for mask in range(1 << n):  # every set of houses with no two neighbours, around the circle
            if mask & (mask >> 1):
                continue
            if n > 1 and mask & 1 and mask >> (n - 1) & 1:
                continue
            best = max(best, sum(x for i, x in enumerate(nums) if mask >> i & 1))
        return best
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 6) if size == "small" else rng.randint(6, 14)
    return [[rng.randint(0, 20) for _ in range(n)]]
```

```python perf
def perf(rng):
    # 20,000 houses.
    return [[rng.randint(0, 1000) for _ in range(20_000)]]
```

## Hints

1. Without the circle, this is [[p:198]]. What does the circle change? Only that the first and the last house can't both be taken.
2. So any plan skips the first house or skips the last house (or both).
3. Solve the straight row twice, once without the first house and once without the last, and take the better result. Watch out for a single house.

## Solution

```python solution time="n" space="1"
class Solution:
    def rob(self, nums: List[int]) -> int:
        def line(houses):  # House Robber on a straight row
            two_back, one_back = 0, 0
            for x in houses:
                two_back, one_back = one_back, max(one_back, two_back + x)
            return one_back

        if len(nums) == 1:
            return nums[0]  # both slices below would be empty
        return max(line(nums[1:]), line(nums[:-1]))  # skip the first house, or skip the last
```

The circle adds a single constraint: the first and last houses can't both be taken. Every valid plan skips at least one of them, so it's a valid plan either for the row without the first house or for the row without the last. Solving both rows and taking the better answer covers every case, and each row is the straight [[p:198]]. A single house is the one case where both rows are empty. O(n) time.

## Alternatives

### Track whether the first house was taken

```python alt time="n" space="1"
class Solution:
    def rob(self, nums: List[int]) -> int:
        if len(nums) == 1:
            return nums[0]
        best = 0
        for take_first in (False, True):
            two_back, one_back = 0, nums[0] if take_first else 0
            for i in range(1, len(nums)):
                if i == len(nums) - 1 and take_first:
                    break  # the last house is the first house's neighbour
                two_back, one_back = one_back, max(one_back, two_back + nums[i])
            best = max(best, one_back)
        return best
```

The same split, done in place: run the straight robber twice, once where house 0 is taken (so the last house is off-limits) and once where it isn't.

## Wrong answers

### Ignores the circle

```python wrong fails="example" test="Example 1"
class Solution:
    def rob(self, nums: List[int]) -> int:
        two_back, one_back = 0, 0
        for x in nums:  # as if the houses stood in a row
            two_back, one_back = one_back, max(one_back, two_back + x)
        return one_back
```

On a straight row, the first and last houses can both be taken, but here they're neighbours. In Example 1 this takes both 3s for 6.

### Forgets a single house

```python wrong fails="edge" test="a single house"
class Solution:
    def rob(self, nums: List[int]) -> int:
        def line(houses):
            two_back, one_back = 0, 0
            for x in houses:
                two_back, one_back = one_back, max(one_back, two_back + x)
            return one_back

        return max(line(nums[1:]), line(nums[:-1]))  # with one house, both slices are empty
```

With a single house, "skip the first" and "skip the last" both skip the only house, and the answer comes out as 0. A lone house has no neighbours at all, so it can be taken: handle that case first.

### Plain recursion

```python wrong fails="perf"
class Solution:
    def rob(self, nums: List[int]) -> int:
        def best(i, end):  # the best total from houses i..end-1
            if i >= end:
                return 0
            return max(best(i + 1, end), nums[i] + best(i + 2, end))  # no memory of earlier answers

        if len(nums) == 1:
            return nums[0]
        return max(best(1, len(nums)), best(0, len(nums) - 1))
```

The split into two rows is right, but each row is solved by recursion that recomputes the same suffixes over and over: the number of calls grows exponentially. Remember the results, or compute them in one pass.
