---
id: 121
module: sliding-window
patterns: [running minimum, one pass]
signature: "def maxProfit(self, prices: List[int]) -> int"
---

## Task

You get a list `prices`, where `prices[i]` is the price of a share on day `i`. You may buy one share on one day and sell it on a **later** day.

Return the largest profit you can make (sell price minus buy price). If no trade makes money, return 0, which means not trading at all.

## Constraints

- `1 <= len(prices) <= 100_000`
- `0 <= prices[i] <= 10_000`

```json examples
[
  {"args": [[9, 2, 6, 1, 4, 8]], "out": 7, "why": "Buy at 1 on day 3 and sell at 8 on day 5. Buying at 2 earlier would only make 6."},
  {"args": [[10, 8, 8, 3]], "out": 0, "why": "The price never rises, so the best choice is not to trade."},
  {"args": [[5, 12, 1, 7]], "out": 7, "why": "The lowest price, 1, comes too late: buying at 5 and selling at 12 beats buying at 1 and selling at 7."}
]
```

```json edge
[
  {"name": "one day", "args": [[5]], "out": 0},
  {"name": "two days, rising", "args": [[1, 2]], "out": 1},
  {"name": "two days, falling", "args": [[2, 1]], "out": 0},
  {"name": "all equal", "args": [[4, 4, 4]], "out": 0},
  {"name": "sell on the last day", "args": [[3, 1, 2, 9]], "out": 8},
  {"name": "buy on the first day", "args": [[1, 5, 3, 2]], "out": 4},
  {"name": "zero prices", "args": [[0, 0, 6]], "out": 6},
  {"name": "extreme prices", "args": [[10000, 0, 10000]], "out": 10000},
  {"name": "new low after the best pair", "args": [[7, 9, 1, 2]], "out": 2}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 8) if size == "small" else rng.randint(20, 300)
    hi = 20 if size == "small" else 10_000
    return [[rng.randint(0, hi) for _ in range(n)]]
```

```python perf
def perf(rng):
    # 100,000 prices on a gentle downward drift with noise, so profits are small and come late.
    prices, p = [], 9_000
    for _ in range(100_000):
        p = min(10_000, max(0, p + rng.randint(-60, 58)))
        prices.append(p)
    return [prices]
```

## Hints

1. For a sell day `j`, the best buy day is the cheapest day before `j`.
2. Walk the days once and keep the lowest price seen so far.
3. On each day, the profit from selling today is `price - lowest so far`. Keep the largest such profit.

## Solution

```python solution time="n" space="1"
class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        lowest = prices[0]
        best = 0
        for p in prices:
            lowest = min(lowest, p)    # cheapest day up to and including today
            best = max(best, p - lowest)
        return best
```

If you sell on day `j`, you should have bought at the lowest price among days `0..j`. `lowest` holds exactly that minimum as the loop moves forward, so `p - lowest` is the best profit for selling today, and the largest of those is the answer.

Updating `lowest` before computing the profit allows buying and selling on the same day, which gives a profit of 0 and never beats a real trade, so it's harmless. One pass gives O(n) time with two variables of extra space.

This is a sliding window in disguise: the left end (buy day) only moves when a cheaper day appears, and the right end (sell day) moves every step.

## Alternatives

### Try every pair of days

```python alt time="n²" space="1" slow oracle
class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        best = 0
        for i in range(len(prices)):
            for j in range(i + 1, len(prices)):
                best = max(best, prices[j] - prices[i])
        return best
```

The definition written out: every buy day with every later sell day. Correct, but about 5 billion pairs for 100,000 days.

### Best run of daily changes

```python alt time="n" space="1"
class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        best = cur = 0
        for a, b in zip(prices, prices[1:]):
            cur = max(0, cur + b - a)  # best profit for a trade that sells today
            best = max(best, cur)
        return best
```

A profit from day i to day j is the sum of the daily changes in between, so the question becomes "which stretch of daily changes has the largest sum?" That's Kadane's algorithm for the maximum subarray, which comes back in the greedy module.

## Wrong answers

### Subtracts the minimum from the maximum

```python wrong fails="example" test="Example 1"
class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        return max(prices) - min(prices)  # ignores which day comes first
```

The highest price might come before the lowest one, and you can't sell before you buy. In Example 1 this returns 9 - 1 = 8, but the 9 is on day 0, before the 1.

### Resets the high price at every new low

```python wrong fails="example" test="Example 3"
class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        lo = hi = prices[0]
        for p in prices[1:]:
            if p < lo:
                lo = hi = p  # forgets the profit found before this low
            elif p > hi:
                hi = p
        return hi - lo
```

Tracking a low and a high works until a new low appears after the best pair: resetting both throws the earlier profit away. In Example 3 it drops the 5 → 12 trade when the price hits 1, then reports 7 - 1 = 6. Keep the best profit in its own variable.

### Looks for the highest later price from scratch

```python wrong fails="perf"
class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        best = 0
        for i in range(len(prices) - 1):
            best = max(best, max(prices[i + 1:]) - prices[i])  # copies and scans the rest of the list
        return best
```

The idea is right (the best sell day after day i), but `max(prices[i + 1:])` copies and scans the rest of the list for every day. That is O(n²) work, the same as trying every pair. Scanning from the right while keeping the highest price seen so far would make it O(n).
