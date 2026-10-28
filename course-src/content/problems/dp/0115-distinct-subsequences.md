---
id: 115
module: dp
patterns: [two-string table, counting, backwards update]
signature: "def numDistinct(self, s: str, t: str) -> int"
---

## Task

Count the ways to pick letters of `s`, keeping their order, that spell exactly `t`. Two ways are different if they pick a different set of positions in `s`.

## Constraints

- `1 <= len(s), len(t) <= 1000`
- Only English letters
- The count can be very large; Python's integers have no limit

```json examples
[
  {"args": ["sees", "se"], "out": 2, "why": "The first s can pair with either e. The last s has no e after it."},
  {"args": ["abc", "abcd"], "out": 0, "why": "t is longer than s, so it can't be picked from it."},
  {"args": ["aaa", "a"], "out": 3, "why": "Any one of the three a's spells t."}
]
```

```json edge
[
  {"name": "letters spread out", "args": ["banana", "ban"], "out": 3},
  {"name": "the whole string", "args": ["xyz", "xyz"], "out": 1},
  {"name": "overlapping choices", "args": ["abab", "ab"], "out": 3},
  {"name": "a repeated letter in t", "args": ["ccc", "cc"], "out": 3}
]
```

```python oracle
class Solution:
    def numDistinct(self, s: str, t: str) -> int:
        return sum(1 for picks in itertools.combinations(range(len(s)), len(t))
                   if all(s[i] == ch for i, ch in zip(picks, t)))
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 6) if size == "small" else rng.randint(6, 12)
    m = rng.randint(1, 3) if size == "small" else rng.randint(2, 4)
    return ["".join(rng.choice("ab") for _ in range(n)), "".join(rng.choice("ab") for _ in range(m))]
```

```python perf
def perf(rng):
    # s of 1,000 letters and t of 100, both from a and b.
    return ["".join(rng.choice("ab") for _ in range(1000)), "".join(rng.choice("ab") for _ in range(100))]
```

## Hints

1. Let `ways[i][j]` be the number of ways to spell `t[:j]` using letters from `s[:i]`. Spelling the empty string has exactly one way.
2. Letter `s[i − 1]` is either not used, which leaves `ways[i − 1][j]`, or, when it equals `t[j − 1]`, used as that last letter, which adds `ways[i − 1][j − 1]`.
3. One row is enough if, for each letter of `s`, you update j from the largest down, so every entry still holds the previous row's value when it's read.

## Solution

```python solution time="n·m" space="m"
class Solution:
    def numDistinct(self, s: str, t: str) -> int:
        ways = [1] + [0] * len(t)  # ways[j]: ways to spell t[:j] with the letters of s seen so far
        for ch in s:
            for j in range(len(t), 0, -1):  # downwards: ways[j - 1] doesn't include ch yet
                if t[j - 1] == ch:
                    ways[j] += ways[j - 1]  # use ch as the j-th letter of t
        return ways[len(t)]
```

Each new letter of `s` either isn't used, so every count stays as it is, or ends one more way of spelling some prefix of `t`: when it equals `t[j − 1]`, every way of spelling `t[:j − 1]` with earlier letters can be extended by it. Updating j from high to low makes sure the new letter is used at most once per spelling, the same reason the 0/1 knapsack loops downwards. O(n·m) time, O(m) space.

## Alternatives

### The full table

```python alt time="n·m" space="n·m"
class Solution:
    def numDistinct(self, s: str, t: str) -> int:
        n, m = len(s), len(t)
        ways = [[0] * (m + 1) for _ in range(n + 1)]
        for i in range(n + 1):
            ways[i][0] = 1  # the empty prefix of t: one way, use nothing
        for i in range(1, n + 1):
            for j in range(1, m + 1):
                ways[i][j] = ways[i - 1][j]  # skip s[i - 1]
                if s[i - 1] == t[j - 1]:
                    ways[i][j] += ways[i - 1][j - 1]  # or use it
        return ways[n][m]
```

The two-dimensional version of the same recurrence, easier to check against the hints. The first column is all ones, because the empty string can always be spelled.

## Wrong answers

### Counts t as a substring

```python wrong fails="example" test="Example 1"
class Solution:
    def numDistinct(self, s: str, t: str) -> int:
        return sum(1 for i in range(len(s) - len(t) + 1) if s[i:i + len(t)] == t)  # consecutive letters only
```

The letters don't have to be next to each other. Counting occurrences of `t` as a block finds `se` once in `sees`, but the first s also pairs with the second e.

### Updates the row in the wrong direction

```python wrong fails="edge" test="a repeated letter in t"
class Solution:
    def numDistinct(self, s: str, t: str) -> int:
        ways = [1] + [0] * len(t)
        for ch in s:
            for j in range(1, len(t) + 1):  # upwards: ways[j - 1] may already include ch
                if t[j - 1] == ch:
                    ways[j] += ways[j - 1]
        return ways[len(t)]
```

Going upwards, the count for `t[:1]` is updated first and then immediately reused for `t[:2]`, as if the same letter of `s` could serve as both the first and the second letter of `t`. When `t` repeats a letter, as in `cc`, that overcounts: `ccc` gives 6 instead of 3.

### Plain recursion

```python wrong fails="perf"
class Solution:
    def numDistinct(self, s: str, t: str) -> int:
        def ways(i, j):  # ways to spell t[j:] from s[i:]
            if j == len(t):
                return 1
            if i == len(s):
                return 0
            total = ways(i + 1, j)  # skip s[i]
            if s[i] == t[j]:
                total += ways(i + 1, j + 1)  # use s[i]
            return total

        return ways(0, 0)
```

The recursion counts every way one by one, and with letters drawn from only a and b there are astronomically many. There are only n × m different (i, j) questions; remembering their answers is what the table does.
