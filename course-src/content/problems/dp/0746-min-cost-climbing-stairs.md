---
id: 746
module: dp
patterns: [cheapest way to reach each step]
signature: "def minCostClimbingStairs(self, cost: List[int]) -> int"
---

## Task

You stand at the bottom of a staircase and may start on step 0 or step 1. From step i you move up 1 or 2 steps, and leaving step i costs `cost[i]`. The top is just past the last step, at position `len(cost)`.

Return the smallest total cost to reach the top.

## Constraints

- `2 <= len(cost) <= 20_000`
- `0 <= cost[i] <= 999`

```json examples
[
  {"args": [[5, 10, 2, 8]], "out": 7, "why": "Start on step 0 (pay 5), jump to step 2 (pay 2), then jump past the last step to the top: 5 + 2 = 7."},
  {"args": [[10, 1, 10, 1, 10]], "out": 2, "why": "Start on step 1, jump to step 3 and from there to the top, paying 1 + 1 and skipping every 10."},
  {"args": [[3, 9]], "out": 3, "why": "From step 0, a jump of 2 reaches the top: pay 3. Starting on step 1 would cost 9."}
]
```

```json edge
[
  {"name": "free steps", "args": [[0, 0]], "out": 0},
  {"name": "cheap steps two apart", "args": [[1, 100, 1, 100, 1]], "out": 3},
  {"name": "mixed costs", "args": [[7, 3, 2, 9, 1]], "out": 6}
]
```

```python oracle
class Solution:
    def minCostClimbingStairs(self, cost: List[int]) -> int:
        n, best = len(cost), inf
        for start in (0, 1):  # try every sequence of moves
            for moves in itertools.product((1, 2), repeat=n):
                pos, total = start, 0
                for m in moves:
                    if pos >= n:
                        break
                    total += cost[pos]
                    pos += m
                if pos >= n:
                    best = min(best, total)
        return best
```

```python gen
def gen(rng, size):
    n = rng.randint(2, 6) if size == "small" else rng.randint(6, 12)
    return [[rng.randint(0, 20) for _ in range(n)]]
```

```python perf
def perf(rng):
    # 20,000 steps.
    return [[rng.randint(0, 999) for _ in range(20_000)]]
```

## Hints

1. Let best[i] be the cheapest way to *arrive* at position i. You can start at 0 or 1 for free, so best[0] = best[1] = 0.
2. You arrive at i from i − 1 (paying `cost[i − 1]`) or from i − 2 (paying `cost[i − 2]`), so best[i] is the smaller of those two totals.
3. The answer is best[len(cost)], the top. Only the last two values are ever needed.

## Solution

```python solution time="n" space="1"
class Solution:
    def minCostClimbingStairs(self, cost: List[int]) -> int:
        two_back, one_back = 0, 0  # cheapest way to arrive at positions i - 2 and i - 1
        for i in range(2, len(cost) + 1):  # up to len(cost): the top
            two_back, one_back = one_back, min(one_back + cost[i - 1], two_back + cost[i - 2])
        return one_back
```

To arrive at position i, the last move came from i − 1 or i − 2, and leaving that step cost its price. So the cheapest arrival at i is the smaller of the cheapest arrival at i − 1 plus `cost[i − 1]` and the cheapest arrival at i − 2 plus `cost[i − 2]`. Starting on step 0 or 1 is free, so both begin at 0, and the answer is the value for position `len(cost)`. One pass, two variables.

## Alternatives

### Top-down with a cache

```python alt time="n" space="n"
class Solution:
    def minCostClimbingStairs(self, cost: List[int]) -> int:
        n = len(cost)

        @cache
        def from_step(i):  # cheapest cost to reach the top, standing on step i
            if i >= n:
                return 0
            return cost[i] + min(from_step(i + 1), from_step(i + 2))

        return min(from_step(0), from_step(1))
```

The same idea from the other end: the cost from step i is its own price plus the cheaper of the two places you can move to. The recursion is as deep as the staircase is long, which is fine at 20,000 steps here; a bottom-up loop has no such limit.

## Wrong answers

### Plain recursion

```python wrong fails="perf"
class Solution:
    def minCostClimbingStairs(self, cost: List[int]) -> int:
        n = len(cost)

        def from_step(i):
            if i >= n:
                return 0
            return cost[i] + min(from_step(i + 1), from_step(i + 2))  # no memory of earlier answers

        return min(from_step(0), from_step(1))
```

Each call makes two more, and the same steps are solved again and again: the number of calls grows like the Fibonacci numbers, far beyond anything that finishes for 20,000 steps. Cache the results, or build them from the bottom.

### Always starts on step 0

```python wrong fails="example" test="Example 2"
class Solution:
    def minCostClimbingStairs(self, cost: List[int]) -> int:
        n = len(cost)
        best = [0] * (n + 1)
        best[1] = cost[0]  # as if step 1 could only be reached from step 0
        for i in range(2, n + 1):
            best[i] = min(best[i - 1] + cost[i - 1], best[i - 2] + cost[i - 2])
        return best[n]
```

Starting on step 1 is free too. Here reaching step 1 costs `cost[0]`, so every route through step 1 is overcharged: Example 2 pays 10 to get to step 1 before it can hop along the cheap steps.

### Stops at the last step instead of the top

```python wrong fails="example" test="Example 1"
class Solution:
    def minCostClimbingStairs(self, cost: List[int]) -> int:
        n = len(cost)
        best = [0] * n
        for i in range(2, n):  # stops at the last step: the top is one place further
            best[i] = min(best[i - 1] + cost[i - 1], best[i - 2] + cost[i - 2])
        return best[n - 1] + cost[n - 1]
```

The top is *past* the last step, at position `len(cost)`. Ending on the last step and then leaving it forces you to pay for it, but the last step can be skipped by jumping from the one before. Make the table one longer and return its last entry.
