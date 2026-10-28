---
id: 312
module: dp
patterns: [interval DP, the last one to go]
signature: "def maxCoins(self, nums: List[int]) -> int"
---

## Task

Balloons stand in a row, and balloon i shows the number `nums[i]`. When you burst a balloon, you earn its number times the numbers of its current left and right neighbours; a missing neighbour counts as 1. The burst balloon disappears, so its neighbours become adjacent.

Burst every balloon, in any order. Return the most coins you can earn.

## Constraints

- `1 <= len(nums) <= 150`
- `0 <= nums[i] <= 100`

```json examples
[
  {"args": [[2, 4, 3]], "out": 33, "why": "Burst 4 first (2 × 4 × 3 = 24), then 2 (1 × 2 × 3 = 6), then 3 (1 × 3 × 1 = 3): 33."},
  {"args": [[1, 1]], "out": 2, "why": "Whichever goes first earns 1 × 1 × 1, and then the other earns 1 more."},
  {"args": [[7]], "out": 7, "why": "A single balloon has no neighbours: 1 × 7 × 1."}
]
```

```json edge
[
  {"name": "a zero in the middle", "args": [[3, 0, 2]], "out": 9},
  {"name": "four balloons", "args": [[5, 1, 2, 8]], "out": 138},
  {"name": "two equal balloons", "args": [[9, 9]], "out": 90},
  {"name": "increasing numbers", "args": [[1, 2, 3, 4, 5]], "out": 110}
]
```

```python oracle
class Solution:
    def maxCoins(self, nums: List[int]) -> int:
        best = 0
        for order in itertools.permutations(range(len(nums))):  # every order of bursting
            alive, total = list(range(len(nums))), 0
            for k in order:
                i = alive.index(k)
                left = nums[alive[i - 1]] if i > 0 else 1
                right = nums[alive[i + 1]] if i + 1 < len(alive) else 1
                total += left * nums[k] * right
                alive.pop(i)
            best = max(best, total)
        return best
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 4) if size == "small" else rng.randint(4, 6)
    return [[rng.randint(0, 9) for _ in range(n)]]
```

```python perf
def perf(rng):
    # 120 balloons.
    return [[rng.randint(0, 100) for _ in range(120)]]
```

## Hints

1. Choosing which balloon to burst *first* is hard to split into subproblems: afterwards its neighbours touch, and both sides interact.
2. Choose which balloon to burst *last* instead. If k is the last one between two walls l and r, it earns `nums[l] × nums[k] × nums[r]`, and the balloons on each side of k are burst independently, with k as a wall.
3. Add a 1 at both ends as permanent walls, and let `best[l][r]` be the most coins from the balloons strictly between l and r. Fill it for short gaps first.

## Solution

```python solution time="n³" space="n²"
class Solution:
    def maxCoins(self, nums: List[int]) -> int:
        vals = [1] + nums + [1]  # permanent walls at both ends
        n = len(vals)
        best = [[0] * n for _ in range(n)]  # best[l][r]: most coins from the balloons strictly between l and r
        for gap in range(2, n):  # short intervals first
            for l in range(n - gap):
                r = l + gap
                best[l][r] = max(best[l][k] + vals[l] * vals[k] * vals[r] + best[k][r]  # k goes last
                                 for k in range(l + 1, r))
        return best[0][n - 1]
```

This is **interval DP**: the state is a range of the row, and the answer for a range is built from smaller ranges. The trick is choosing the *last* balloon to burst in the range. While the others are burst, that balloon stays put and separates the left part from the right, so the two sides never interact and can be solved separately. When it finally goes, its neighbours are the two walls of the range.

Short ranges are filled first, so `best[l][k]` and `best[k][r]` are ready when needed. There are O(n²) ranges with up to n choices each: O(n³).

## Alternatives

### Top-down over ranges

```python alt time="n³" space="n²"
class Solution:
    def maxCoins(self, nums: List[int]) -> int:
        vals = [1] + nums + [1]

        @cache
        def best(l, r):  # most coins from the balloons strictly between l and r
            top = 0
            for k in range(l + 1, r):  # k is the last balloon to go
                top = max(top, best(l, k) + vals[l] * vals[k] * vals[r] + best(k, r))
            return top

        return best(0, len(vals) - 1)
```

The same recurrence as a cached recursion. The recursion depth is at most the number of balloons.

## Wrong answers

### Bursts the smallest balloon first

```python wrong fails="example" test="Example 1"
class Solution:
    def maxCoins(self, nums: List[int]) -> int:
        balloons, total = list(nums), 0
        while balloons:
            i = balloons.index(min(balloons))  # the smallest balloon goes first
            left = balloons[i - 1] if i > 0 else 1
            right = balloons[i + 1] if i + 1 < len(balloons) else 1
            total += left * balloons[i] * right
            balloons.pop(i)
        return total
```

Getting rid of small balloons early keeps large ones as neighbours, which sounds good, but it isn't always best. In Example 1, bursting the 2 first earns only 8, while bursting the 4 first, between 2 and 3, earns 24. The order matters in ways a simple rule can't see.

### Uses the original neighbours

```python wrong fails="example" test="Example 1"
class Solution:
    def maxCoins(self, nums: List[int]) -> int:
        vals = [1] + nums + [1]
        return sum(vals[i - 1] * vals[i] * vals[i + 1] for i in range(1, len(vals) - 1))  # neighbours never change
```

Each burst changes the neighbours of the balloons around it, so coins can't be computed from the original row. Here every balloon is paid with its starting neighbours, as if none had disappeared: 44 for Example 1, an amount no order can reach.

### Tries every order

```python wrong fails="perf"
class Solution:
    def maxCoins(self, nums: List[int]) -> int:
        def best(balloons):  # the most coins from what's left
            if not balloons:
                return 0
            top = 0
            for i in range(len(balloons)):  # burst each one next, in turn
                left = balloons[i - 1] if i > 0 else 1
                right = balloons[i + 1] if i + 1 < len(balloons) else 1
                top = max(top, left * balloons[i] * right + best(balloons[:i] + balloons[i + 1:]))
            return top

        return best(list(nums))
```

Trying every order is correct, but 120 balloons have 120! orders, a number with 199 digits. Choosing the last balloon of each range reduces the problem to n² ranges.
