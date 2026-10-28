---
id: 2836
module: binary-lifting
patterns: [binary lifting with sums, a functional graph]
signature: "def getMaxFunctionValue(self, receiver: List[int], k: int) -> int"
---

## Task

`n` players, numbered 0 to `n - 1`, pass a ball: whoever has it always passes to `receiver[i]` (possibly themselves). A game picks a starting player x, who holds the ball first, and then the ball is passed exactly `k` times.

The game's score is the sum of the numbers of everyone who held the ball, counted once per time they held it: x, plus the `k` receivers. Return the highest score over all choices of x.

## Constraints

- `1 <= len(receiver) <= 100_000`
- `0 <= receiver[i] < len(receiver)`
- `1 <= k <= 10**10`

```json examples
[
  {"args": [[1, 2, 0, 0], 2], "out": 4, "why": "Starting at 3, the ball goes to 0 and then 1: 3 + 0 + 1 = 4. Every start inside the loop 0 → 1 → 2 scores only 3."},
  {"args": [[0, 0], 5], "out": 1, "why": "Player 0 keeps passing to themselves, adding 0 every time. Starting at 1 adds 1 once."},
  {"args": [[1, 0, 1], 3], "out": 4, "why": "From 2 the ball goes to 1, then bounces between 0 and 1: 2 + 1 + 0 + 1 = 4."}
]
```

```json edge
[
  {"name": "one player", "args": [[0], 10], "out": 0},
  {"name": "a huge k", "args": [[1, 0], 10000000000], "out": 5000000001},
  {"name": "one pass", "args": [[2, 2, 0], 1], "out": 3},
  {"name": "everyone keeps the ball", "args": [[0, 1, 2], 3], "out": 8},
  {"name": "a long tail into a short loop", "args": [[1, 2, 3, 4, 4], 3], "out": 16}
]
```

```python oracle
class Solution:
    def getMaxFunctionValue(self, receiver: List[int], k: int) -> int:
        best = 0
        for x in range(len(receiver)):
            seen, walk = {}, []
            while x not in seen and len(walk) <= k:
                seen[x] = len(walk)
                walk.append(x)
                x = receiver[x]
            prefix = [0]
            for v in walk:
                prefix.append(prefix[-1] + v)
            if len(walk) > k:
                best = max(best, prefix[k + 1])
                continue
            start = seen[x]
            cycle_len, cycle_sum = len(walk) - start, prefix[-1] - prefix[start]
            full, rest = divmod(k + 1 - start, cycle_len)
            best = max(best, prefix[start] + full * cycle_sum + prefix[start + rest] - prefix[start])
        return best
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 6) if size == "small" else rng.randint(20, 300)
    receiver = [rng.randrange(n) for _ in range(n)]
    k = rng.randint(1, 12) if size == "small" else rng.choice([rng.randint(1, 50), rng.randint(1, 10**10)])
    return [receiver, k]
```

```python perf
def perf(rng):
    # 20,000 players passing around one big loop, and k just under ten billion.
    n = 20_000
    order = list(range(n))
    rng.shuffle(order)
    receiver = [0] * n
    for i in range(n):
        receiver[order[i]] = order[(i + 1) % n]
    return [receiver, 10**10 - 1]
```

## Hints

1. Simulating k passes is hopeless when k is ten billion. But every player always passes to the same receiver, so the ball's path from a player is fixed: it can be precomputed in jumps.
2. For every player x and every j, record where the ball is after 2^j passes from x, and the sum of the receivers along the way. Two jumps of 2^j make a jump of 2^(j+1): the second one starts where the first ends.
3. Write k in binary and, for each set bit, add that jump's sum and move. You can do this for all starting players at once, level by level, keeping only the current level of the table.

## Solution

```python solution time="n log k" space="n"
class Solution:
    def getMaxFunctionValue(self, receiver: List[int], k: int) -> int:
        n = len(receiver)
        nxt = receiver[:]      # nxt[x]: where the ball is after 2**j passes from x
        gain = receiver[:]     # gain[x]: the sum of the receivers during those passes
        at = list(range(n))    # for each starting player: where the ball is so far
        score = list(range(n))  # and the score so far, starting with their own number
        while k:
            if k & 1:  # this bit of k: every start takes a jump of 2**j
                score = [s + gain[a] for s, a in zip(score, at)]
                at = [nxt[a] for a in at]
            k >>= 1
            if k:  # double the jump size: two jumps of 2**j in a row
                gain = [g + gain[x] for g, x in zip(gain, nxt)]
                nxt = [nxt[x] for x in nxt]
        return max(score)
```

This is binary lifting with a sum carried along. A jump of 2^(j+1) passes from x is a jump of 2^j to `nxt[x]`, then another from there, so its sum is `gain[x] + gain[nxt[x]]`. Writing k in binary breaks the k passes into at most 34 jumps (2³⁴ > 10¹⁰), and since the jumps follow each other, their order doesn't matter: smallest first works.

Instead of storing all 34 levels and then answering for each start, the code moves every start forward together, one level at a time, and keeps only the current level. Each level is a few list comprehensions over n players: O(n log k) time and O(n) memory. Python's integers don't overflow, so scores beyond 10¹⁵ need no special care.

## Alternatives

### The full jump table, one start at a time

```python alt time="n log k" space="n log k"
class Solution:
    def getMaxFunctionValue(self, receiver: List[int], k: int) -> int:
        n = len(receiver)
        nxt, gain = [receiver[:]], [receiver[:]]  # level j: jumps of 2**j passes
        for _ in range(k.bit_length() - 1):
            last_n, last_g = nxt[-1], gain[-1]
            gain.append([last_g[x] + last_g[last_n[x]] for x in range(n)])
            nxt.append([last_n[last_n[x]] for x in range(n)])
        best = 0
        for x in range(n):
            score, at = x, x
            for j in range(k.bit_length()):
                if k >> j & 1:
                    score += gain[j][at]
                    at = nxt[j][at]
            best = max(best, score)
        return best
```

The textbook layout: build every level of the table first, then answer each start by walking the bits of k. It's the same O(n log k) time, but keeps all levels in memory, and the inner loop runs in Python for every start, which makes it slower than moving all starts together.

## Wrong answers

### Leaves out the starting player

```python wrong fails="example" test="Example 1"
class Solution:
    def getMaxFunctionValue(self, receiver: List[int], k: int) -> int:
        n = len(receiver)
        nxt, gain = receiver[:], receiver[:]
        at, score = list(range(n)), [0] * n  # should start at each player's own number
        while k:
            if k & 1:
                score = [s + gain[a] for s, a in zip(score, at)]
                at = [nxt[a] for a in at]
            k >>= 1
            if k:
                gain = [g + gain[x] for g, x in zip(gain, nxt)]
                nxt = [nxt[x] for x in nxt]
        return max(score)
```

The starter holds the ball before any pass, so their number counts too. Without it, Example 1's best score is 3 instead of 4: starting at 3 earns its own 3.

### Builds 32 levels

```python wrong fails="edge" test="a huge k"
class Solution:
    def getMaxFunctionValue(self, receiver: List[int], k: int) -> int:
        n = len(receiver)
        nxt, gain = [receiver[:]], [receiver[:]]
        for _ in range(31):  # enough for k below 2**32, but k can reach 10**10
            last_n, last_g = nxt[-1], gain[-1]
            gain.append([last_g[x] + last_g[last_n[x]] for x in range(n)])
            nxt.append([last_n[last_n[x]] for x in range(n)])
        best = 0
        for x in range(n):
            score, at = x, x
            for j in range(32):
                if k >> j & 1:
                    score += gain[j][at]
                    at = nxt[j][at]
            best = max(best, score)
        return best
```

A table sized for 32-bit numbers ignores every bit of k above bit 31. Ten billion needs 34 bits, so the jumps cover only part of the passes and the score comes out far too small. Size the table from `k.bit_length()`.

### Simulates every pass

```python wrong fails="edge" test="a huge k" how="timeout"
class Solution:
    def getMaxFunctionValue(self, receiver: List[int], k: int) -> int:
        best = 0
        for x in range(len(receiver)):
            score, at = x, x
            for _ in range(k):  # up to ten billion passes
                at = receiver[at]
                score += at
            best = max(best, score)
        return best
```

Exactly the game as described, and fine for small k. With k = 10¹⁰, even two players mean twenty billion steps, so this never finishes the edge case.

### Walks from every player until the ball comes back

```python wrong fails="perf"
class Solution:
    def getMaxFunctionValue(self, receiver: List[int], k: int) -> int:
        best = 0
        for x in range(len(receiver)):
            seen, walk = {}, []
            while x not in seen and len(walk) <= k:  # until the ball returns to someone
                seen[x] = len(walk)
                walk.append(x)
                x = receiver[x]
            prefix = [0]
            for v in walk:
                prefix.append(prefix[-1] + v)
            if len(walk) > k:
                best = max(best, prefix[k + 1])
                continue
            start = seen[x]
            cycle_len, cycle_sum = len(walk) - start, prefix[-1] - prefix[start]
            full, rest = divmod(k + 1 - start, cycle_len)
            best = max(best, prefix[start] + full * cycle_sum + prefix[start + rest] - prefix[start])
        return best
```

A smarter simulation: the ball's path always ends in a loop, so walk until a player repeats, then count whole trips around the loop with one multiplication. That's correct, and fast when loops are short. In the test all 20,000 players form one loop, so every start walks all of it: 400 million steps.
