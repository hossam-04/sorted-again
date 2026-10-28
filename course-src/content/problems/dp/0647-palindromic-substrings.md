---
id: 647
module: dp
patterns: [expand around each centre, count palindromes]
signature: "def countSubstrings(self, s: str) -> int"
---

## Task

Count the substrings of `s` that are palindromes. Substrings at different positions count separately, even when they spell the same text.

## Constraints

- `1 <= len(s) <= 1000`
- Only the letters `a` to `z`

```json examples
[
  {"args": ["abba"], "out": 6, "why": "Four single letters, plus bb and abba."},
  {"args": ["xyz"], "out": 3, "why": "Only the three single letters."},
  {"args": ["aaaa"], "out": 10, "why": "Every substring is a palindrome: 4 of length 1, 3 of length 2, 2 of length 3 and 1 of length 4."}
]
```

```json edge
[
  {"name": "a single letter", "args": ["z"], "out": 1},
  {"name": "an odd palindrome", "args": ["abcba"], "out": 7},
  {"name": "palindromes inside palindromes", "args": ["aabaa"], "out": 9}
]
```

```python oracle
class Solution:
    def countSubstrings(self, s: str) -> int:
        return sum(1 for i in range(len(s)) for j in range(i + 1, len(s) + 1) if s[i:j] == s[i:j][::-1])
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 6) if size == "small" else rng.randint(6, 40)
    return ["".join(rng.choice("ab" if size == "small" else "abc") for _ in range(n))]
```

```python perf
def perf(rng):
    # 1,000 copies of one letter: all 500,500 substrings are palindromes.
    return ["a" * 1000]
```

## Hints

1. Every palindrome has a centre: a letter (odd length) or the gap between two letters (even length).
2. From each centre, grow outwards one letter on each side at a time. Every step that still matches is one more palindrome.
3. Add up the steps over all 2n − 1 centres.

## Solution

```python solution time="n²" space="1"
class Solution:
    def countSubstrings(self, s: str) -> int:
        count = 0
        for center in range(2 * len(s) - 1):  # letters and the gaps between them
            lo, hi = center // 2, (center + 1) // 2
            while lo >= 0 and hi < len(s) and s[lo] == s[hi]:
                count += 1  # s[lo..hi] is a palindrome
                lo, hi = lo - 1, hi + 1
        return count
```

The palindromes with a given centre are nested: each one is the previous one with a matching letter added on both sides, so growing from the centre finds all of them, one per step, and stops at the first mismatch. Each palindrome is counted exactly once, from its own centre. The work is the number of palindromes plus the number of centres: O(n²) at worst, for a string of one repeated letter.

## Alternatives

### Fill a table of palindromes

```python alt time="n²" space="n²"
class Solution:
    def countSubstrings(self, s: str) -> int:
        n = len(s)
        pal = [[False] * n for _ in range(n)]
        count = 0
        for i in range(n - 1, -1, -1):
            for j in range(i, n):
                if s[i] == s[j] and (j - i < 2 or pal[i + 1][j - 1]):  # matching ends around a palindrome
                    pal[i][j] = True
                    count += 1
        return count
```

The dynamic-programming version: s[i..j] is a palindrome when its ends match and s[i+1..j−1] is one. It visits every pair (i, j) whatever the string looks like, so it's O(n²) even when there are few palindromes.

## Wrong answers

### Counts each different palindrome once

```python wrong fails="example" test="Example 1"
class Solution:
    def countSubstrings(self, s: str) -> int:
        found = set()
        for center in range(2 * len(s) - 1):
            lo, hi = center // 2, (center + 1) // 2
            while lo >= 0 and hi < len(s) and s[lo] == s[hi]:
                found.add(s[lo:hi + 1])  # the same text at another position isn't counted again
                lo, hi = lo - 1, hi + 1
        return len(found)
```

The task counts substrings by position: the two b's of `abba` are two different substrings, and so are its two a's. A set of strings merges them, so Example 1 gives 4 instead of 6, and `aaaa` gives 4 instead of 10.

### Only looks at odd lengths

```python wrong fails="example" test="Example 1"
class Solution:
    def countSubstrings(self, s: str) -> int:
        count = 0
        for c in range(len(s)):  # centres on letters only
            lo, hi = c, c
            while lo >= 0 and hi < len(s) and s[lo] == s[hi]:
                count += 1
                lo, hi = lo - 1, hi + 1
        return count
```

Palindromes of even length, like `bb` and `abba`, are centred between two letters. Without those n − 1 centres, Example 1 counts 4 instead of 6.

### Checks every substring letter by letter

```python wrong fails="perf"
class Solution:
    def countSubstrings(self, s: str) -> int:
        count = 0
        for i in range(len(s)):
            for j in range(i, len(s)):
                a, b = i, j
                while a < b and s[a] == s[b]:  # check this substring from both ends
                    a, b = a + 1, b - 1
                count += a >= b
        return count
```

Each check is right, but there are about 500,000 substrings in 1,000 letters, and when they're all palindromes each check walks halfway through: over 80 million steps. Growing from the centres counts each palindrome with a single step.
