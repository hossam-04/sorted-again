---
id: 1143
module: dp
patterns: [two-string table, match or skip]
signature: "def longestCommonSubsequence(self, text1: str, text2: str) -> int"
---

## Task

A *subsequence* of a string keeps some of its characters, in order, and drops the rest. Return the length of the longest string that is a subsequence of both `text1` and `text2`.

## Constraints

- `1 <= len(text1), len(text2) <= 1000`
- Only the letters `a` to `z`

```json examples
[
  {"args": ["stone", "longest"], "out": 3, "why": "o, n and e appear in this order in both words."},
  {"args": ["abcbdab", "bdcaba"], "out": 4, "why": "bcba (or bdab, or bcab) is a subsequence of both, and nothing longer is."},
  {"args": ["xyz", "abc"], "out": 0, "why": "The two strings share no letter at all."}
]
```

```json edge
[
  {"name": "a single matching letter", "args": ["a", "a"], "out": 1},
  {"name": "repeated letters", "args": ["aaaa", "aa"], "out": 2},
  {"name": "one string reversed", "args": ["pqrst", "tsrqp"], "out": 1},
  {"name": "two real words", "args": ["dynamic", "programming"], "out": 3}
]
```

```python oracle
class Solution:
    def longestCommonSubsequence(self, text1: str, text2: str) -> int:
        a, b = (text1, text2) if len(text1) <= len(text2) else (text2, text1)
        for k in range(len(a), 0, -1):  # the longest subsequence of the shorter string that the other contains
            for picks in itertools.combinations(range(len(a)), k):
                it = iter(b)
                if all(a[i] in it for i in picks):
                    return k
        return 0
```

```python gen
def gen(rng, size):
    n, m = (rng.randint(1, 5), rng.randint(1, 5)) if size == "small" else (rng.randint(5, 10), rng.randint(5, 10))
    letters = "abc" if size == "small" else "abcd"
    return ["".join(rng.choice(letters) for _ in range(n)), "".join(rng.choice(letters) for _ in range(m))]
```

```python perf
def perf(rng):
    # Two random strings of 400 letters.
    return ["".join(rng.choice("abcdefgh") for _ in range(400)), "".join(rng.choice("abcdefgh") for _ in range(400))]
```

## Hints

1. Compare the strings from the end. If their last letters match, that letter can end a common subsequence, and the rest is the same question on both strings without their last letter.
2. If they don't match, one of the two last letters isn't used: the answer is the better of dropping the last letter of `text1` or the last letter of `text2`.
3. Fill a table `L[i][j]`, the answer for the first i letters of `text1` and the first j of `text2`, with a row and column of zeros for empty prefixes.

## Solution

```python solution time="n·m" space="n·m"
class Solution:
    def longestCommonSubsequence(self, text1: str, text2: str) -> int:
        n, m = len(text1), len(text2)
        L = [[0] * (m + 1) for _ in range(n + 1)]  # L[i][j]: answer for text1[:i] and text2[:j]
        for i in range(1, n + 1):
            for j in range(1, m + 1):
                if text1[i - 1] == text2[j - 1]:
                    L[i][j] = L[i - 1][j - 1] + 1  # use the matching letters
                else:
                    L[i][j] = max(L[i - 1][j], L[i][j - 1])  # drop one of the two last letters
        return L[n][m]
```

Each cell asks about two prefixes. If their last letters match, matching them is always safe: any common subsequence that doesn't use the pair can be changed to use it without getting shorter. Otherwise at least one of the two letters is unused, and the cell takes the better of the two ways to drop one.

The extra row and column of zeros stand for empty prefixes, which keeps the indices simple: `L` has n + 1 rows and m + 1 columns, and letter i − 1 of `text1` belongs to row i. The table fills in O(n·m) time; keeping only two rows would cut the memory to O(m).

## Alternatives

### Two rows instead of a table

```python alt time="n·m" space="m"
class Solution:
    def longestCommonSubsequence(self, text1: str, text2: str) -> int:
        prev = [0] * (len(text2) + 1)
        for a in text1:
            cur = [0]
            for j, b in enumerate(text2, start=1):
                cur.append(prev[j - 1] + 1 if a == b else max(prev[j], cur[j - 1]))
            prev = cur
        return prev[-1]
```

Each row of the table only reads the row above it, so two rows are enough. The answer is the last entry of the last row.

## Wrong answers

### Finds the longest common substring

```python wrong fails="example" test="Example 1"
class Solution:
    def longestCommonSubsequence(self, text1: str, text2: str) -> int:
        n, m = len(text1), len(text2)
        L = [[0] * (m + 1) for _ in range(n + 1)]
        best = 0
        for i in range(1, n + 1):
            for j in range(1, m + 1):
                if text1[i - 1] == text2[j - 1]:
                    L[i][j] = L[i - 1][j - 1] + 1
                    best = max(best, L[i][j])  # and a mismatch resets the run to 0
        return best
```

This is the table for the longest common *substring*, where the letters must be consecutive: a mismatch resets the count instead of carrying the best so far. In Example 1 the letters o, n, e are spread out in `longest`, so the best consecutive match is only `on`.

### Matches greedily from the left

```python wrong fails="example" test="Example 1"
class Solution:
    def longestCommonSubsequence(self, text1: str, text2: str) -> int:
        j = count = 0
        for a in text1:
            k = text2.find(a, j)  # match each letter at the first chance
            if k != -1:
                count += 1
                j = k + 1
        return count
```

Matching each letter as early as possible can use up letters that a better subsequence needed. In Example 1, matching the s and the t of `stone` jumps to the end of `longest`, so o, n and e can't be matched after them: 2 instead of 3. Every pair of prefixes has to be considered, which is what the table does.

### Plain recursion

```python wrong fails="perf"
class Solution:
    def longestCommonSubsequence(self, text1: str, text2: str) -> int:
        def L(i, j):  # the answer for text1[i:] and text2[j:]
            if i == len(text1) or j == len(text2):
                return 0
            if text1[i] == text2[j]:
                return 1 + L(i + 1, j + 1)
            return max(L(i + 1, j), L(i, j + 1))  # both branches reach the same (i + 1, j + 1) and more
        return L(0, 0)
```

The recurrence is right, but the two branches overlap: both lead to the same smaller pairs of suffixes, again and again. The number of calls grows exponentially, while there are only n × m different pairs to solve. A table, or a cache, solves each pair once.
