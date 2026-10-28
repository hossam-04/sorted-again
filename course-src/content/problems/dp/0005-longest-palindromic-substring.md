---
id: 5
module: dp
patterns: [expand around each centre, palindromes]
signature: "def longestPalindrome(self, s: str) -> str"
compare: validator
---

## Task

Return the longest substring of `s` that is a palindrome: a run of consecutive characters that reads the same forwards and backwards. If several are equally long, return any of them.

## Constraints

- `1 <= len(s) <= 1000`
- Only letters and digits

```json examples
[
  {"args": ["racecars"], "out": "racecar", "why": "racecar reads the same both ways and no longer palindrome fits in the string."},
  {"args": ["abccbaxyx"], "out": "abccba", "why": "An even-length palindrome: its centre is between the two c's. xyx is a palindrome too, but shorter."},
  {"args": ["xyz"], "out": "x", "why": "No two letters match, so the longest palindromes are single letters; any of them is accepted."}
]
```

```json edge
[
  {"name": "a single character", "args": ["q"], "out": "q"},
  {"name": "all the same", "args": ["aaaa"], "out": "aaaa"},
  {"name": "two candidates", "args": ["noonmadam"], "out": "madam"},
  {"name": "a palindrome in the middle", "args": ["abcdcbx"], "out": "bcdcb"},
  {"name": "a reversed copy that isn't a palindrome", "args": ["xabcyzcbax"], "out": "x"}
]
```

```python validator
def check(data, got):
    s = data[0]
    best = 0
    for center in range(2 * len(s) - 1):  # the true longest length, by expanding around every centre
        lo, hi = center // 2, (center + 1) // 2
        while lo >= 0 and hi < len(s) and s[lo] == s[hi]:
            lo, hi = lo - 1, hi + 1
        best = max(best, hi - lo - 1)
    if not isinstance(got, str):
        return False, "Return the palindrome itself, as a string."
    if got not in s:
        return False, "The answer must be a substring of s: consecutive characters."
    if got != got[::-1]:
        return False, f"{got!r} doesn't read the same backwards."
    if len(got) != best:
        return False, f"{got!r} has {len(got)} characters, but a palindrome of {best} exists."
    return True, ""
```

```python oracle
class Solution:
    def longestPalindrome(self, s: str) -> str:
        best = ""
        for i in range(len(s)):  # every substring
            for j in range(i + 1, len(s) + 1):
                t = s[i:j]
                if t == t[::-1] and len(t) > len(best):
                    best = t
        return best
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 6) if size == "small" else rng.randint(6, 30)
    return ["".join(rng.choice("ab" if size == "small" else "abc") for _ in range(n))]
```

```python perf
def perf(rng):
    # 1,000 copies of the same letter: every substring is a palindrome.
    return ["a" * 1000]
```

## Hints

1. Every palindrome has a centre: a single character for odd lengths, or the gap between two equal characters for even lengths.
2. From each centre, grow outwards while the characters on both sides match. That finds the longest palindrome with that centre.
3. There are 2n − 1 centres, and each expansion costs at most O(n): O(n²) overall, with no extra memory.

## Solution

```python solution time="n²" space="1"
class Solution:
    def longestPalindrome(self, s: str) -> str:
        best_lo, best_hi = 0, 0  # the best palindrome found is s[best_lo:best_hi]
        for center in range(2 * len(s) - 1):  # n letters and n - 1 gaps between them
            lo, hi = center // 2, (center + 1) // 2  # lo == hi for a letter, hi == lo + 1 for a gap
            while lo >= 0 and hi < len(s) and s[lo] == s[hi]:
                lo, hi = lo - 1, hi + 1  # grow while both ends match
            if hi - lo - 1 > best_hi - best_lo:
                best_lo, best_hi = lo + 1, hi
        return s[best_lo:best_hi]
```

Each centre produces a whole family of palindromes, nested inside each other, and growing outwards finds the largest one at once. Counting the gaps between letters as centres covers the even lengths. With 2n − 1 centres and expansions of up to n/2 steps each, the worst case is O(n²), reached when every substring is a palindrome; usually expansions stop after a step or two.

## Alternatives

### A table of palindromic substrings

```python alt time="n²" space="n²"
class Solution:
    def longestPalindrome(self, s: str) -> str:
        n = len(s)
        pal = [[False] * n for _ in range(n)]  # pal[i][j]: is s[i..j] a palindrome?
        best = (0, 0)
        for i in range(n - 1, -1, -1):
            for j in range(i, n):
                if s[i] == s[j] and (j - i < 2 or pal[i + 1][j - 1]):
                    pal[i][j] = True
                    if j - i > best[1] - best[0]:
                        best = (i, j)
        return s[best[0]:best[1] + 1]
```

A substring is a palindrome when its two end characters match and the part between them is a palindrome. Filling that table from the shortest substrings up is the classic dynamic program. It's also O(n²) in time, but it needs an n × n table.

## Wrong answers

### Only looks at odd lengths

```python wrong fails="example" test="Example 2"
class Solution:
    def longestPalindrome(self, s: str) -> str:
        best = s[0]
        for c in range(len(s)):  # centres on letters only
            lo, hi = c, c
            while lo >= 0 and hi < len(s) and s[lo] == s[hi]:
                lo, hi = lo - 1, hi + 1
            if hi - lo - 1 > len(best):
                best = s[lo + 1:hi]
        return best
```

Expanding only around single letters finds palindromes of odd length. An even palindrome like `abccba` has its centre *between* two letters, so it's never found. Include the n − 1 gaps as centres too.

### Matches the string against its reverse

```python wrong fails="edge" test="a reversed copy that isn't a palindrome"
class Solution:
    def longestPalindrome(self, s: str) -> str:
        r = s[::-1]
        best = ""
        for i in range(len(s)):  # the longest common substring of s and its reverse
            for j in range(i + 1, len(s) + 1):
                if j - i > len(best) and s[i:j] in r:
                    best = s[i:j]
        return best
```

A palindrome appears in both `s` and its reverse, but so does any substring whose mirror image also occurs somewhere else. In `xabcyzcbax`, `xabc` is in the reverse because `cbax` is in the string, yet it isn't a palindrome. The common substring must also sit at mirrored positions.

### Checks every substring letter by letter

```python wrong fails="perf"
class Solution:
    def longestPalindrome(self, s: str) -> str:
        def is_pal(i, j):
            while i < j:
                if s[i] != s[j]:
                    return False
                i, j = i + 1, j - 1
            return True

        best = ""
        for i in range(len(s)):
            for j in range(i, len(s)):  # every substring, checked from both ends
                if is_pal(i, j) and j - i + 1 > len(best):
                    best = s[i:j + 1]
        return best
```

Checking each substring from both ends is correct, but there are about n²/2 substrings and each check can take n/2 steps: when every substring is a palindrome, as in the test's 1,000 a's, that's about 80 million steps. Expanding from centres reuses each smaller palindrome to build the next.
