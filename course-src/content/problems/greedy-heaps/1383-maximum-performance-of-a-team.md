---
id: 1383
module: greedy-heaps
patterns: [fix the minimum, keep the best k with a heap]
signature: "def maxPerformance(self, n: int, speed: List[int], efficiency: List[int], k: int) -> int"
---

## Task

Engineer i has a speed `speed[i]` and an efficiency `efficiency[i]`. A team's **performance** is the sum of its members' speeds times the smallest efficiency among them.

Choose a team of at least one and at most `k` of the `n` engineers with the largest performance. The performance can be huge, so return it **modulo 1,000,000,007**: find the largest value first, then take its remainder.

## Constraints

- `1 <= k <= n <= 100_000`
- `len(speed) == len(efficiency) == n`
- `1 <= speed[i] <= 10**5`
- `1 <= efficiency[i] <= 10**8`

```json examples
[
  {"args": [4, [4, 9, 2, 7], [8, 3, 10, 6], 2], "out": 66, "why": "The engineers with speeds 4 and 7 make 11 × 6 = 66: the team's efficiency is its least efficient member's, 6. Adding the fast engineer with efficiency 3 would drag that down."},
  {"args": [3, [5, 5, 5], [1, 2, 3], 3], "out": 20, "why": "A bigger team isn't always better: two engineers score 10 × 2 = 20, and adding the third would make it 15 × 1."},
  {"args": [2, [10, 1], [10, 1], 2], "out": 100, "why": "At most k means fewer is fine: the first engineer alone scores 100."}
]
```

```json edge
[
  {"name": "one engineer", "args": [1, [7], [3], 1], "out": 21},
  {"name": "k = 1", "args": [3, [1, 100, 3], [100, 1, 50], 1], "out": 150},
  {"name": "equal efficiencies", "args": [3, [3, 1, 2], [5, 5, 5], 2], "out": 25},
  {"name": "the remainder isn't what's maximised", "args": [2, [11, 10], [90909092, 100000000], 1], "out": 5},
  {"name": "the largest values", "args": [3, [100000, 100000, 100000], [100000000, 100000000, 100000000], 3], "out": 999790007},
  {"name": "the slowest engineer is the most efficient", "args": [3, [1, 6, 6], [9, 2, 2], 3], "out": 26}
]
```

```python oracle
class Solution:
    def maxPerformance(self, n: int, speed: List[int], efficiency: List[int], k: int) -> int:
        best = 0
        for i in range(n):  # engineer i has the team's smallest efficiency
            others = sorted((speed[j] for j in range(n) if j != i and (efficiency[j], j) > (efficiency[i], i)), reverse=True)
            best = max(best, (speed[i] + sum(others[:k - 1])) * efficiency[i])
        return best % 1_000_000_007
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 6) if size == "small" else rng.randint(20, 300)
    s_hi = 10 if size == "small" else 10**5
    e_hi = 10 if size == "small" else rng.choice([100, 10**8])
    speed = [rng.randint(1, s_hi) for _ in range(n)]
    efficiency = [rng.randint(1, e_hi) for _ in range(n)]
    return [n, speed, efficiency, rng.randint(1, n)]
```

```python perf
def perf(rng):
    # 100,000 engineers and teams of up to 50,000.
    n = 100_000
    return [n, [rng.randint(1, 10**5) for _ in range(n)], [rng.randint(1, 10**8) for _ in range(n)], 50_000]
```

## Hints

1. The team's efficiency is set by one member, its least efficient. Try each engineer in that role: then the rest of the team must come from the engineers at least as efficient.
2. With the minimum efficiency fixed, performance grows with the speed sum, so take the fastest k − 1 of those more efficient engineers.
3. Go through the engineers from most to least efficient. Everyone seen so far is at least as efficient as the current one, so keep the k fastest of them in a min-heap of speeds, along with their sum.

## Solution

```python solution time="n log n" space="n"
class Solution:
    def maxPerformance(self, n: int, speed: List[int], efficiency: List[int], k: int) -> int:
        team = []  # speeds of the fastest engineers seen so far, at most k (a min-heap)
        total = best = 0
        for e, s in sorted(zip(efficiency, speed), reverse=True):  # most efficient first
            heappush(team, s)
            total += s
            if len(team) > k:
                total -= heappop(team)  # drop the slowest
            best = max(best, total * e)  # e is the smallest efficiency in this team
        return best % 1_000_000_007
```

Sorting by efficiency, most efficient first, makes the current engineer's efficiency the minimum of everyone seen so far. The best team with that minimum takes the current engineer and the fastest others, and the heap of the k fastest speeds seen holds exactly that. If the current engineer isn't among the k fastest, the heap's team doesn't include them, but its efficiency is then at least `e`, so `total * e` still describes a team that exists and doesn't overstate it.

Every team at most k strong is considered through its least efficient member, so the maximum is right. The modulo is taken once, at the end: Python's integers are exact, so the comparison uses the true values. Sorting and the heap make it O(n log n).

## Alternatives

### Fix the minimum, then sort the rest

```python alt time="n² log n" space="n" slow
class Solution:
    def maxPerformance(self, n: int, speed: List[int], efficiency: List[int], k: int) -> int:
        best = 0
        for i in range(n):  # engineer i is the least efficient member
            others = sorted((speed[j] for j in range(n) if j != i and (efficiency[j], j) > (efficiency[i], i)), reverse=True)
            best = max(best, (speed[i] + sum(others[:k - 1])) * efficiency[i])
        return best % 1_000_000_007
```

The direct version of the first two hints: for each engineer as the least efficient member, gather everyone more efficient, sort their speeds and take the k − 1 fastest. Ties in efficiency are broken by index, so every team is counted with exactly one least efficient member. It's O(n² log n), fine for a few hundred engineers and far too slow for 100,000. Processing in efficiency order lets the heap carry the sorted speeds from one engineer to the next.

## Wrong answers

### Compares the remainders

```python wrong fails="edge" test="the remainder isn't what's maximised"
class Solution:
    def maxPerformance(self, n: int, speed: List[int], efficiency: List[int], k: int) -> int:
        team = []
        total = best = 0
        for e, s in sorted(zip(efficiency, speed), reverse=True):
            heappush(team, s)
            total += s
            if len(team) > k:
                total -= heappop(team)
            best = max(best, total * e % 1_000_000_007)  # compares remainders, not performances
        return best
```

The task asks for the largest performance, then its remainder. Taking remainders first changes which team looks best: 11 × 90,909,092 = 1,000,000,012 is the larger performance, but its remainder is 5, while 10 × 100,000,000 leaves 1,000,000,000. In languages with fixed-size integers you need the modulo to avoid overflow, but you still compare before reducing; in Python, simply compare first.

### Only counts full teams

```python wrong fails="example" test="Example 2"
class Solution:
    def maxPerformance(self, n: int, speed: List[int], efficiency: List[int], k: int) -> int:
        team = []
        total = best = 0
        for e, s in sorted(zip(efficiency, speed), reverse=True):
            heappush(team, s)
            total += s
            if len(team) > k:
                total -= heappop(team)
            if len(team) == k:  # ignores smaller teams
                best = max(best, total * e)
        return best % 1_000_000_007
```

"At most k" includes smaller teams, and they can win, since every extra member may lower the efficiency. In Example 2 the best team has two of the three engineers, but this only scores teams of three and returns 15.

### Picks the fastest engineers

```python wrong fails="example" test="Example 1"
class Solution:
    def maxPerformance(self, n: int, speed: List[int], efficiency: List[int], k: int) -> int:
        fastest = sorted(zip(speed, efficiency), reverse=True)[:k]  # the k fastest, whatever their efficiency
        best = total = 0
        low = float("inf")
        for s, e in fastest:
            total += s
            low = min(low, e)
            best = max(best, total * low)
        return best % 1_000_000_007
```

Speed alone can't pick the team, because one slow-but-efficient member can matter more than a fast one with low efficiency. In Example 1 the fastest pair is 9 and 7, whose team efficiency is only 3: 16 × 3 = 48, while 4 and 7 make 66. The efficiency has to be fixed first.

### Adds up the k fastest again for every engineer

```python wrong fails="perf"
class Solution:
    def maxPerformance(self, n: int, speed: List[int], efficiency: List[int], k: int) -> int:
        seen = []  # speeds of everyone at least as efficient, sorted
        best = 0
        for e, s in sorted(zip(efficiency, speed), reverse=True):
            insort(seen, s)
            best = max(best, sum(seen[-k:]) * e)  # re-adds up to k speeds every time
        return best % 1_000_000_007
```

The order and the choice of team are right, but the sum of the k fastest is rebuilt from scratch for every engineer. With teams of up to 50,000 and 100,000 engineers, that's billions of additions. The heap changes the sum by one speed in, at most one out.
