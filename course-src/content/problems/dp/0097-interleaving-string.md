---
id: 97
module: dp
patterns: [two-string table, which string supplies the next letter]
signature: "def isInterleave(self, s1: str, s2: str, s3: str) -> bool"
---

## Task

Return `True` if `s3` can be formed by *interleaving* `s1` and `s2`: taking all their letters and merging them into one string, while keeping each string's letters in their original order.

## Constraints

- `0 <= len(s1), len(s2) <= 100`
- `0 <= len(s3) <= 200`
- Only the letters `a` to `z`

```json examples
[
  {"args": ["ab", "cd", "acbd"], "out": true, "why": "a from s1, c from s2, b from s1, d from s2: both strings stay in order."},
  {"args": ["ab", "cd", "adbc"], "out": false, "why": "The letters are right, but d comes before c, which breaks the order of s2."},
  {"args": ["x", "", "x"], "out": true, "why": "With s2 empty, s3 just has to be s1."}
]
```

```json edge
[
  {"name": "a shared letter must come from the second string", "args": ["aab", "aac", "aaacab"], "out": true},
  {"name": "starting with the second string", "args": ["aa", "ab", "abaa"], "out": true},
  {"name": "pairs of letters", "args": ["abc", "abc", "aabbcc"], "out": true},
  {"name": "wrong length", "args": ["", "", "a"], "out": false},
  {"name": "mirror images", "args": ["ab", "ba", "abba"], "out": true}
]
```

```python oracle
class Solution:
    def isInterleave(self, s1: str, s2: str, s3: str) -> bool:
        if len(s1) + len(s2) != len(s3):
            return False
        for picks in itertools.combinations(range(len(s3)), len(s1)):  # which positions of s3 come from s1
            chosen = set(picks)
            if "".join(s3[i] for i in picks) == s1 and "".join(s3[i] for i in range(len(s3)) if i not in chosen) == s2:
                return True
        return False
```

```python gen
def gen(rng, size):
    n, m = (rng.randint(0, 3), rng.randint(0, 3)) if size == "small" else (rng.randint(2, 6), rng.randint(2, 6))
    s1 = "".join(rng.choice("ab") for _ in range(n))
    s2 = "".join(rng.choice("ab") for _ in range(m))
    if rng.random() < 0.6:  # a real interleaving
        order = [1] * n + [2] * m
        rng.shuffle(order)
        i = j = 0
        s3 = ""
        for o in order:
            if o == 1:
                s3, i = s3 + s1[i], i + 1
            else:
                s3, j = s3 + s2[j], j + 1
    else:
        s3 = "".join(rng.choice("ab") for _ in range(n + m + rng.choice([0, 0, 1])))
    return [s1, s2, s3]
```

```python perf
def perf(rng):
    # Two strings of 100 a's, and 199 a's followed by a b: the b never fits, and every split of the a's
    # looks fine until the end.
    return ["a" * 100, "a" * 100, "a" * 199 + "b"]
```

## Hints

1. After using i letters of `s1` and j letters of `s2`, you've built the first i + j letters of `s3`. The next letter has to come from `s1[i]` or from `s2[j]`.
2. So the state is the pair (i, j). Let `ok[i][j]` say whether `s3[:i + j]` is an interleaving of `s1[:i]` and `s2[:j]`.
3. `ok[i][j]` is true if `ok[i − 1][j]` is and `s1[i − 1]` equals `s3[i + j − 1]`, or if `ok[i][j − 1]` is and `s2[j − 1]` equals it. Check the lengths first.

## Solution

```python solution time="n·m" space="m"
class Solution:
    def isInterleave(self, s1: str, s2: str, s3: str) -> bool:
        n, m = len(s1), len(s2)
        if n + m != len(s3):
            return False
        ok = [False] * (m + 1)  # one row of the table: ok[j] for the current i
        for i in range(n + 1):
            for j in range(m + 1):
                if i == 0 and j == 0:
                    ok[j] = True  # nothing used, nothing built
                else:
                    from_s1 = i > 0 and ok[j] and s1[i - 1] == s3[i + j - 1]  # ok[j] still holds row i - 1
                    from_s2 = j > 0 and ok[j - 1] and s2[j - 1] == s3[i + j - 1]
                    ok[j] = from_s1 or from_s2
        return ok[m]
```

Whatever interleaving builds `s3`, its last letter comes from the end of `s1` or the end of `s2`, and removing it leaves a smaller interleaving. That gives one table cell per pair (i, j), filled from the cell above (the last letter came from `s1`) or the cell to the left (it came from `s2`). One row is enough: when cell j is computed, `ok[j]` still holds the previous row's value, and `ok[j − 1]` the current row's. O(n·m) time and O(m) space, which is LeetCode's follow-up.

## Alternatives

### Top-down with a cache

```python alt time="n·m" space="n·m"
class Solution:
    def isInterleave(self, s1: str, s2: str, s3: str) -> bool:
        if len(s1) + len(s2) != len(s3):
            return False

        @cache
        def can(i, j):  # can s3[i + j:] be built from s1[i:] and s2[j:]?
            if i == len(s1) and j == len(s2):
                return True
            k = i + j
            return (i < len(s1) and s1[i] == s3[k] and can(i + 1, j)) or (j < len(s2) and s2[j] == s3[k] and can(i, j + 1))

        return can(0, 0)
```

The same states, explored from the front: take the next letter from whichever string matches, and remember each (i, j) that has been decided.

## Wrong answers

### Only checks the letters

```python wrong fails="example" test="Example 2"
class Solution:
    def isInterleave(self, s1: str, s2: str, s3: str) -> bool:
        return Counter(s1) + Counter(s2) == Counter(s3)  # the right letters, in any order
```

Having the right letters isn't enough; each string's letters must also stay in order. In Example 2 the counts match, but `s3` has d before c.

### Takes from the first string whenever it can

```python wrong fails="edge" test="a shared letter must come from the second string"
class Solution:
    def isInterleave(self, s1: str, s2: str, s3: str) -> bool:
        if len(s1) + len(s2) != len(s3):
            return False
        i = j = 0
        for ch in s3:
            if i < len(s1) and s1[i] == ch:  # prefers s1, never reconsiders
                i += 1
            elif j < len(s2) and s2[j] == ch:
                j += 1
            else:
                return False
        return True
```

When both strings offer the same letter, the choice matters. Here `aab` takes the first two a's of `aaacab`, so `aac` can supply only one a before the c, and when the c comes, neither string has it next. Taking the second a from `aac` instead works. Every pair (i, j) must be considered, not just one greedy path.

### Plain recursion

```python wrong fails="perf"
class Solution:
    def isInterleave(self, s1: str, s2: str, s3: str) -> bool:
        if len(s1) + len(s2) != len(s3):
            return False

        def can(i, j):
            if i == len(s1) and j == len(s2):
                return True
            k = i + j
            return (i < len(s1) and s1[i] == s3[k] and can(i + 1, j)) or (j < len(s2) and s2[j] == s3[k] and can(i, j + 1))

        return can(0, 0)
```

When both strings are full of the same letter, both branches match at every step, and the recursion explores every way to split the a's between them: astronomically many, all failing only at the final b. There are only 101 × 101 different (i, j) states, so remembering them makes it fast.
