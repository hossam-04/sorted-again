---
id: 309
module: dp
patterns: [state machine DP, holding, resting, cooling down]
signature: "def maxProfit(self, prices: List[int]) -> int"
---

## Task

`prices[i]` is a stock's price on day i. You may buy and sell as many times as you like, but you hold at most one share at a time: you must sell before buying again. After you sell, you can't buy on the next day (a one-day cooldown). Return the largest total profit.

## Constraints

- `1 <= len(prices) <= 5000`
- `0 <= prices[i] <= 1000`

```json examples
[
  {"args": [[1, 4, 2, 7]], "out": 6, "why": "Buy at 1 and sell at 7. Selling at 4 first would force a cooldown on the day the price is 2, and buying back at 7 earns nothing."},
  {"args": [[2, 1, 4, 5, 2, 9, 7]], "out": 10, "why": "Buy at 1 and sell at 4 (profit 3), cool down on the day the price is 5, then buy at 2 and sell at 9 (profit 7): 10. Selling at 5 instead would put the cooldown on the day the price is 2."},
  {"args": [[5, 4, 3, 2]], "out": 0, "why": "The price only falls, so the best plan is not to trade."}
]
```

```json edge
[
  {"name": "a single day", "args": [[6]], "out": 0},
  {"name": "a flat price", "args": [[3, 3, 3]], "out": 0},
  {"name": "two days", "args": [[1, 5]], "out": 4},
  {"name": "skip the first sale", "args": [[1, 2, 4, 1, 7]], "out": 7},
  {"name": "two trades", "args": [[1, 3, 2, 8, 4, 9]], "out": 8}
]
```

```python oracle
class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        best = 0
        for actions in itertools.product("bsr", repeat=len(prices)):  # buy, sell or rest each day
            holding, cool, profit, ok = False, False, 0, True
            for p, a in zip(prices, actions):
                if a == "b":
                    if holding or cool:
                        ok = False
                        break
                    holding, profit = True, profit - p
                    cool = False
                elif a == "s":
                    if not holding:
                        ok = False
                        break
                    holding, cool, profit = False, True, profit + p
                else:
                    cool = False
            if ok and not holding:
                best = max(best, profit)
        return best
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 5) if size == "small" else rng.randint(5, 8)
    return [[rng.randint(0, 10) for _ in range(n)]]
```

```python perf
def perf(rng):
    # 5,000 days of prices.
    return [[rng.randint(0, 1000) for _ in range(5000)]]
```

## Hints

1. On any day you're in one of three situations: holding a share, just sold (and so cooling down), or free to buy.
2. Track the best profit possible in each of those three states at the end of each day, and work out each one from the previous day's values.
3. Holding today: you held yesterday, or you were free yesterday and bought today. Just sold: you held yesterday and sold today. Free: you were free yesterday, or you sold yesterday and are cooling down.

## Solution

```python solution time="n" space="1"
class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        hold, sold, free = -inf, 0, 0  # best profit at the end of the day in each state
        for p in prices:
            hold, sold, free = (
                max(hold, free - p),  # keep holding, or buy today (only from "free")
                hold + p,  # sell the share held until today
                max(free, sold),  # rest; yesterday's sale finishes its cooldown today
            )
        return max(sold, free)  # end without a share
```

This is a **state machine**: each day moves between three states, and the rules decide which moves are allowed. The cooldown is built in: buying is only possible from `free`, and `sold` only reaches `free` after one more day. Updating all three states from the previous day's values (the tuple assignment reads the old values) keeps the transitions honest. O(n) time and O(1) space.

## Alternatives

### Top-down over days and states

```python alt time="n" space="n"
class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        @cache
        def best(i, holding):  # the best profit from day i on
            if i >= len(prices):
                return 0
            rest = best(i + 1, holding)
            if holding:
                return max(rest, prices[i] + best(i + 2, False))  # selling skips the cooldown day
            return max(rest, -prices[i] + best(i + 1, True))

        return best(0, False)
```

The same choices as a recursion: on each day, do nothing or make the allowed move. Selling jumps two days ahead, which is the cooldown. With 5,000 days the recursion is at most 5,000 calls deep.

## Wrong answers

### Ignores the cooldown

```python wrong fails="example" test="Example 1"
class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        return sum(max(0, b - a) for a, b in zip(prices, prices[1:]))  # every rise, back to back
```

Without the cooldown, the best plan is to collect every price rise, selling and buying back on the same day. The cooldown forbids exactly that: in Example 1, earning the rise from 1 to 4 and the rise from 2 to 7 would need a purchase the day after a sale.

### Plain recursion

```python wrong fails="perf"
class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        def best(i, holding):
            if i >= len(prices):
                return 0
            rest = best(i + 1, holding)
            if holding:
                return max(rest, prices[i] + best(i + 2, False))
            return max(rest, -prices[i] + best(i + 1, True))  # recomputed from scratch every time

        return best(0, False)
```

The recursion explores every buy-and-sell plan separately, and there are exponentially many. There are only two states per day, so remembering each (day, holding) answer makes it linear.
