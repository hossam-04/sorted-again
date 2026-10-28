---
id: 70
module: dp
patterns: [counting paths, Fibonacci recurrence]
signature: "def climbStairs(self, n: int) -> int"
---

## Task

A staircase has `n` steps. Each move climbs either 1 step or 2 steps. In how many different orders of moves can you reach the top? Two orders are different if the sequence of 1s and 2s differs.

## Constraints

- `1 <= n <= 45`

```json examples
[
  {"args": [4], "out": 5, "why": "1+1+1+1, 1+1+2, 1+2+1, 2+1+1 and 2+2: five orders."},
  {"args": [1], "out": 1, "why": "One step, one way to climb it."},
  {"args": [5], "out": 8, "why": "The last move is a 1 (from step 4, 5 ways) or a 2 (from step 3, 3 ways): 5 + 3 = 8."}
]
```

```json edge
[
  {"name": "two steps", "args": [2], "out": 2},
  {"name": "ten steps", "args": [10], "out": 89},
  {"name": "twenty steps", "args": [20], "out": 10946}
]
```

```python oracle
class Solution:
    def climbStairs(self, n: int) -> int:
        count = 0
        for twos in range(n // 2 + 1):  # choose where the 2s go among all the moves
            moves = n - twos
            count += math.comb(moves, twos)
        return count
```

```python gen
def gen(rng, size):
    return [rng.randint(1, 8) if size == "small" else rng.randint(8, 30)]
```

```python perf
def perf(rng):
    # The largest staircase.
    return [45]
```

## Hints

1. Think about the *last* move. To land on step n, you came from step n − 1 with a 1, or from step n − 2 with a 2.
2. So the number of ways to reach step n is the ways to reach n − 1 plus the ways to reach n − 2.
3. Compute the counts from the bottom up, keeping only the last two: there's one way to reach step 0 (do nothing) and one way to reach step 1.

## Solution

```python solution time="n" space="1"
class Solution:
    def climbStairs(self, n: int) -> int:
        prev, cur = 1, 1  # ways to reach step 0 and step 1
        for _ in range(n - 1):
            prev, cur = cur, prev + cur  # ways(i) = ways(i - 1) + ways(i - 2)
        return cur
```

Every way to reach step i ends with a 1 from step i − 1 or a 2 from step i − 2, and those two groups never overlap, so ways(i) = ways(i − 1) + ways(i − 2). That's the Fibonacci recurrence. Building it from the bottom and keeping just the last two values takes O(n) time and O(1) space.

## Alternatives

### Top-down with a cache

```python alt time="n" space="n"
class Solution:
    def climbStairs(self, n: int) -> int:
        @cache
        def ways(i):  # ways to climb i steps
            if i <= 1:
                return 1
            return ways(i - 1) + ways(i - 2)

        return ways(n)
```

The recurrence written directly as a recursive function, with `@cache` remembering each answer. Without the cache, the same subproblems would be solved over and over; with it, each of the n values is computed once.

## Wrong answers

### Plain recursion

```python wrong fails="perf"
class Solution:
    def climbStairs(self, n: int) -> int:
        if n <= 1:
            return 1
        return self.climbStairs(n - 1) + self.climbStairs(n - 2)  # recomputes the same values again and again
```

The recurrence is right, but every call makes two more, and they keep solving the same subproblems: computing ways(45) this way makes over a billion calls. Remember each answer, or build them from the bottom.

### Starts the sequence one place off

```python wrong fails="example" test="Example 1"
class Solution:
    def climbStairs(self, n: int) -> int:
        a, b = 0, 1  # the Fibonacci numbers F(0), F(1)
        for _ in range(n - 1):
            a, b = b, a + b
        return b  # F(n), but the answer is F(n + 1)
```

The counts follow the Fibonacci numbers, shifted by one: 1, 1, 2, 3, 5, … for 0, 1, 2, 3, 4 steps. Starting from F(0) = 0 instead of "one way to climb zero steps" gives 3 for four steps instead of 5. Base cases need checking against small inputs.

### Counts how many 1s and 2s, not their order

```python wrong fails="example" test="Example 1"
class Solution:
    def climbStairs(self, n: int) -> int:
        return n // 2 + 1  # the number of possible counts of 2-steps
```

This counts the possible *mixes*, from no 2s up to n // 2 of them, but the same mix can be climbed in different orders: 1+1+2, 1+2+1 and 2+1+1 are three ways. The task counts orders.
