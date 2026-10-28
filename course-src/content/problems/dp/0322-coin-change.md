---
id: 322
module: dp
patterns: [fewest items for every amount, unbounded choices]
signature: "def coinChange(self, coins: List[int], amount: int) -> int"
---

## Task

You have coins of the values in `coins`, as many of each as you like. Return the fewest coins that add up to exactly `amount`, or `-1` if no combination does.

## Constraints

- `1 <= len(coins) <= 12`
- `1 <= coins[i] <= 2**31 - 1`
- `0 <= amount <= 10**4`

```json examples
[
  {"args": [[1, 3, 4], 6], "out": 2, "why": "3 + 3 uses two coins. Taking the largest coin first, 4 + 1 + 1, would use three."},
  {"args": [[5, 10], 3], "out": -1, "why": "Every coin is larger than 3, so no combination works."},
  {"args": [[2, 5], 0], "out": 0, "why": "An amount of 0 needs no coins at all."}
]
```

```json edge
[
  {"name": "one coin type", "args": [[7], 14], "out": 2},
  {"name": "an amount the coin doesn't divide", "args": [[4], 6], "out": -1},
  {"name": "everyday coins", "args": [[1, 5, 10, 25], 30], "out": 2},
  {"name": "no combination of two coins", "args": [[4, 6], 9], "out": -1},
  {"name": "close but not exact", "args": [[3, 7], 11], "out": -1}
]
```

```python oracle
class Solution:
    def coinChange(self, coins: List[int], amount: int) -> int:
        frontier, seen, count = {0}, {0}, 0  # breadth-first: totals reachable with `count` coins
        while frontier:
            if amount in frontier:
                return count
            frontier = {t + c for t in frontier for c in coins if t + c <= amount} - seen
            seen |= frontier
            count += 1
        return -1
```

```python gen
def gen(rng, size):
    coins = rng.sample(range(1, 10 if size == "small" else 25), rng.randint(1, 3 if size == "small" else 5))
    return [coins, rng.randint(0, 12 if size == "small" else 30)]
```

```python perf
def perf(rng):
    # 12 coin values between 50 and 500, and an amount of 10,000.
    return [rng.sample(range(50, 501), 12), 10_000]
```

## Hints

1. Taking the largest coin first can fail: with coins 1, 3 and 4, it pays 6 as 4 + 1 + 1 instead of 3 + 3. You need to consider every coin as the last one.
2. Let fewest[a] be the fewest coins for amount a. If the last coin is c, the rest is a best way to pay a − c, so fewest[a] = 1 + the smallest fewest[a − c] over all coins c ≤ a.
3. Fill the table from 0 up to `amount`, with fewest[0] = 0 and "impossible" (infinity) for amounts that can't be paid.

## Solution

```python solution time="amount · k" space="amount"
class Solution:
    def coinChange(self, coins: List[int], amount: int) -> int:
        fewest = [0] + [inf] * amount  # fewest[a]: fewest coins that pay exactly a
        for a in range(1, amount + 1):
            for c in coins:
                if c <= a and fewest[a - c] + 1 < fewest[a]:
                    fewest[a] = fewest[a - c] + 1  # pay a - c the best way, then add coin c
        return fewest[amount] if fewest[amount] != inf else -1
```

Whatever the best way to pay an amount is, it has a last coin c, and removing it leaves a best way to pay `a − c` (otherwise there'd be a better way to pay a). So trying every coin as the last one and looking up the smaller amounts gives the answer, as long as those smaller amounts are filled in first. With k coin values, that's O(amount · k) time and an O(amount) table. Infinity marks amounts that can't be paid, and it stays infinity through `+ 1`.

## Alternatives

### Breadth-first search over amounts

```python alt time="amount · k" space="amount"
class Solution:
    def coinChange(self, coins: List[int], amount: int) -> int:
        seen = {0}
        frontier, count = [0], 0
        while frontier:
            if amount in seen:
                return count
            nxt = []
            for total in frontier:
                for c in coins:
                    if total + c <= amount and total + c not in seen:
                        seen.add(total + c)
                        nxt.append(total + c)
            frontier, count = nxt, count + 1
        return -1
```

Every amount is a node, and adding a coin is an edge. The fewest coins is the shortest path from 0 to `amount`, which breadth-first search finds level by level. It can stop early, as soon as the amount is reached.

## Wrong answers

### Takes the largest coin first

```python wrong fails="example" test="Example 1"
class Solution:
    def coinChange(self, coins: List[int], amount: int) -> int:
        count = 0
        for c in sorted(coins, reverse=True):  # as many of the largest coin as fit, then the next
            count += amount // c
            amount %= c
        return count if amount == 0 else -1
```

Greedy change works for everyday coins, but not in general. With coins 1, 3 and 4, taking a 4 first leaves 2, which costs two more coins: 3 coins instead of 2. And when greedy gets stuck, it reports −1 even if some other combination works.

### Returns infinity for impossible amounts

```python wrong fails="example" test="Example 2"
class Solution:
    def coinChange(self, coins: List[int], amount: int) -> int:
        fewest = [0] + [inf] * amount
        for a in range(1, amount + 1):
            for c in coins:
                if c <= a:
                    fewest[a] = min(fewest[a], fewest[a - c] + 1)
        return fewest[amount]  # inf when the amount can't be paid
```

The table is right, but an impossible amount stays at infinity, and that's what gets returned. The task wants −1 for "impossible". Convert at the end.

### Plain recursion

```python wrong fails="perf"
class Solution:
    def coinChange(self, coins: List[int], amount: int) -> int:
        def fewest(a):
            if a == 0:
                return 0
            best = inf
            for c in coins:
                if c <= a:
                    best = min(best, fewest(a - c) + 1)  # recomputed for every route that reaches a - c
            return best

        result = fewest(amount)
        return result if result != inf else -1
```

The recursion tries every coin as the last one, which is right, but it solves the same smaller amounts again and again, once for every order of coins that leads there. With 12 coin values and an amount of 10,000, the number of calls is astronomical. Cache `fewest`, or fill the table bottom-up.
