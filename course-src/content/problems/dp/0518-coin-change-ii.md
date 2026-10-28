---
id: 518
module: dp
patterns: [unbounded knapsack, counting combinations, loop order]
signature: "def change(self, amount: int, coins: List[int]) -> int"
---

## Task

You have coins of the values in `coins`, as many of each as you like. Return the number of different *combinations* of coins that add up to `amount`. A combination doesn't depend on order: 1 + 2 and 2 + 1 are the same.

## Constraints

- `1 <= len(coins) <= 300`, all different
- `1 <= coins[i] <= 5000`
- `0 <= amount <= 5000`

```json examples
[
  {"args": [4, [1, 2, 3]], "out": 4, "why": "1+1+1+1, 1+1+2, 2+2 and 1+3."},
  {"args": [3, [5]], "out": 0, "why": "The only coin is larger than the amount."},
  {"args": [0, [7]], "out": 1, "why": "There's exactly one way to pay nothing: use no coins."}
]
```

```json edge
[
  {"name": "four coin values", "args": [10, [2, 5, 3, 6]], "out": 5},
  {"name": "even coins, odd amount", "args": [7, [2, 4]], "out": 0},
  {"name": "two coins", "args": [12, [1, 6]], "out": 3},
  {"name": "making change for a dollar", "args": [100, [1, 5, 10, 25, 50]], "out": 292}
]
```

```python oracle
class Solution:
    def change(self, amount: int, coins: List[int]) -> int:
        def ways(i, left):  # use coins[i] some number of times, then move on
            if i == len(coins):
                return 1 if left == 0 else 0
            return sum(ways(i + 1, left - k * coins[i]) for k in range(left // coins[i] + 1))

        return ways(0, amount)
```

```python gen
def gen(rng, size):
    coins = rng.sample(range(1, 8 if size == "small" else 15), rng.randint(1, 3 if size == "small" else 4))
    return [rng.randint(0, 10 if size == "small" else 25), coins]
```

```python perf
def perf(rng):
    # An amount of 5,000 and 50 coin values.
    return [5000, rng.sample(range(1, 500), 50)]
```

## Hints

1. Let ways[a] be the number of combinations that pay a. ways[0] = 1: the empty combination.
2. To count combinations rather than orderings, decide the coins one value at a time: first everything that uses only the first coin, then allow the second, and so on.
3. For each coin c, go through the amounts from c upwards and add `ways[a − c]` to `ways[a]`. Going upwards lets the same coin be used again.

## Solution

```python solution time="amount · k" space="amount"
class Solution:
    def change(self, amount: int, coins: List[int]) -> int:
        ways = [1] + [0] * amount  # ways[a]: combinations of the coins seen so far that pay a
        for c in coins:  # coins in the outer loop: each combination is built in one order only
            for a in range(c, amount + 1):  # upwards: c may be used again
                ways[a] += ways[a - c]
        return ways[amount]
```

With the coins in the outer loop, a combination is always built in the same order of coin values, so it's counted exactly once. While processing coin c, `ways[a − c]` already includes combinations that use c, because the loop goes upwards: that's what lets each coin be used any number of times, the **unbounded knapsack**. With k coin values: O(amount · k) time.

The loop order is the whole difference from counting orderings: with the amounts outside and the coins inside, 1 + 2 and 2 + 1 would be counted separately.

## Alternatives

### Top-down: use this coin, or move on

```python alt time="amount · k" space="amount · k"
class Solution:
    def change(self, amount: int, coins: List[int]) -> int:
        @cache
        def ways(i, left):  # combinations of coins[i:] that pay `left`
            if left == 0:
                return 1
            if i == len(coins) or left < 0:
                return 0
            return ways(i, left - coins[i]) + ways(i + 1, left)  # use coins[i] again, or never again

        return ways(0, amount)
```

The same counting as a recursion with two choices: use the current coin once more, or move on to the next coin for good. Moving on is what keeps orderings from being counted twice.

## Wrong answers

### Counts orderings instead of combinations

```python wrong fails="example" test="Example 1"
class Solution:
    def change(self, amount: int, coins: List[int]) -> int:
        ways = [1] + [0] * amount
        for a in range(1, amount + 1):  # amounts outside, coins inside
            for c in coins:
                if c <= a:
                    ways[a] += ways[a - c]
        return ways[amount]
```

With the amounts in the outer loop, `ways[a]` counts every sequence of coins that ends with any coin c, so 1 + 3 and 3 + 1 are counted separately: Example 1 gives 7 instead of 4. That's the right answer to a different question, the number of orderings. Put the coins in the outer loop.

### Forgets the empty combination

```python wrong fails="example" test="Example 1"
class Solution:
    def change(self, amount: int, coins: List[int]) -> int:
        ways = [0] * (amount + 1)  # ways[0] should be 1
        for c in coins:
            for a in range(c, amount + 1):
                ways[a] += ways[a - c]
        return ways[amount]
```

Every count is built from `ways[0]`, the single way to pay nothing. Starting it at 0 makes every entry 0. It's a base case that looks unimportant and carries the whole table.

### Plain recursion

```python wrong fails="perf"
class Solution:
    def change(self, amount: int, coins: List[int]) -> int:
        def ways(i, left):
            if left == 0:
                return 1
            if i == len(coins) or left < 0:
                return 0
            return ways(i, left - coins[i]) + ways(i + 1, left)  # no memory of earlier answers

        return ways(0, amount)
```

The recursion is right, but it enumerates every combination one call at a time, and with 50 coin values and an amount of 5,000 there are astronomically many. There are only k × amount different (coin, amount) questions, so remembering their answers keeps it fast.
