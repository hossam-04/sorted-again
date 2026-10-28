---
id: 1392
module: string-matching
patterns: [prefix function, longest border]
signature: "def longestPrefix(self, s: str) -> str"
---

## Task

A **border** of `s` is a string that is both a prefix and a suffix of `s`, but not the whole of `s`. They may overlap: `aaa` has the border `aa`.

Return the longest border of `s` that isn't empty, or `""` if there is none. (LeetCode calls a border a "happy prefix".)

## Constraints

- `1 <= len(s) <= 100_000`
- Only the letters `a` to `z`

```json examples
[
  {"args": ["abcxabc"], "out": "abc", "why": "abc starts the string and ends it."},
  {"args": ["aaaa"], "out": "aaa", "why": "A border can overlap itself: aaa is the first three letters and the last three."},
  {"args": ["abcd"], "out": "", "why": "No prefix is also a suffix, so the answer is empty."}
]
```

```json edge
[
  {"name": "one letter", "args": ["a"], "out": ""},
  {"name": "two equal letters", "args": ["zz"], "out": "z"},
  {"name": "a border inside a border", "args": ["abacaba"], "out": "aba"},
  {"name": "a run, then a different letter", "args": ["aaab"], "out": ""},
  {"name": "almost a border", "args": ["abcab"], "out": "ab"},
  {"name": "a short border after a long run", "args": ["aabaaab"], "out": "aab"}
]
```

```python oracle
class Solution:
    def longestPrefix(self, s: str) -> str:
        for k in range(len(s) - 1, 0, -1):
            if s[:k] == s[-k:]:
                return s[:k]
        return ""
```

```python gen
def gen(rng, size):
    letters = "ab" if rng.random() < 0.7 else "abc"
    if rng.random() < 0.5:
        block = "".join(rng.choice(letters) for _ in range(rng.randint(1, 4 if size == "small" else 40)))
        middle = "".join(rng.choice(letters) for _ in range(rng.randint(0, 4 if size == "small" else 100)))
        return [block + middle + block]
    return ["".join(rng.choice(letters) for _ in range(rng.randint(1, 8 if size == "small" else 300)))]
```

```python perf
def perf(rng):
    # 99,999 a's and then a b: every prefix of a's almost matches a suffix, but no border exists.
    return ["a" * 99_999 + "b"]
```

## Hints

1. Checking every length from the longest down works, but each comparison can cost O(n), and on strings like `aaa…ab` almost every one does.
2. This is exactly what the KMP **prefix function** computes: `pi[i]` is the length of the longest border of `s[:i + 1]`. The answer is `s[:pi[-1]]`.
3. Build `pi` left to right. To extend the border of `s[:i]` by one letter, try the longest border first; if the next letter doesn't match, fall back to the border *of that border*, `pi[k - 1]`, and keep falling back until it matches or nothing is left.

## Solution

```python solution time="n" space="n"
class Solution:
    def longestPrefix(self, s: str) -> str:
        pi = [0] * len(s)  # pi[i]: the longest border of s[:i + 1]
        k = 0
        for i in range(1, len(s)):
            while k and s[i] != s[k]:
                k = pi[k - 1]  # the next shorter border that might extend
            if s[i] == s[k]:
                k += 1
            pi[i] = k
        return s[:pi[-1]]
```

Every border of `s[:i + 1]`, minus its last letter, is a border of `s[:i]`. So to find the longest border ending at i, try the borders of `s[:i]` from the longest down and take the first whose next letter is `s[i]`. The borders of a string are the longest one, the longest border of that, and so on, which is why falling back means `k = pi[k - 1]`.

`k` grows by at most one per step and every fall back shrinks it, so the falls back can't add up to more than n in total: O(n) time and O(n) space.

## Alternatives

### The Z-function

```python alt time="n" space="n"
class Solution:
    def longestPrefix(self, s: str) -> str:
        n = len(s)
        z = [0] * n  # z[i]: how far s[i:] matches the start of s
        l = r = 0
        for i in range(1, n):
            if i < r:
                z[i] = min(r - i, z[i - l])
            while i + z[i] < n and s[z[i]] == s[i + z[i]]:
                z[i] += 1
            if i + z[i] > r:
                l, r = i, i + z[i]
            if i + z[i] == n:  # the suffix starting at i matches a prefix: a border
                return s[i:]
        return ""
```

A suffix starting at position i is a border exactly when it matches the start of the string all the way to the end: `i + z[i] == n`. Scanning i from left to right, the first such suffix is the longest. The Z-function is the other linear-time tool for "how much of the string's own start appears here?", and either works for this problem.

## Wrong answers

### Allows the whole string

```python wrong fails="example" test="Example 1"
class Solution:
    def longestPrefix(self, s: str) -> str:
        for k in range(len(s), 0, -1):  # starts with the whole string, which always matches itself
            if s[:k] == s[-k:]:
                return s[:k]
        return ""
```

The whole string is trivially a prefix and a suffix of itself, which is why a border has to be shorter. Starting at `len(s)` returns `s` itself every time: `abcxabc` instead of `abc`.

### Falls back only once

```python wrong fails="edge" test="a run, then a different letter"
class Solution:
    def longestPrefix(self, s: str) -> str:
        pi = [0] * len(s)
        k = 0
        for i in range(1, len(s)):
            if k and s[i] != s[k]:  # one step back, then gives up
                k = pi[k - 1]
            if s[i] == s[k]:
                k += 1
            pi[i] = k
        return s[:pi[-1]]
```

After a mismatch, the next shorter border may not match either, so the fall back has to repeat. With a single `if`, a stale length survives: for `aaab`, the border `aa` fails on the `b`, one step back leaves `a`, which doesn't match `b` either, but the length 1 is recorded anyway and the answer comes out as `a`. Use `while`.

### Compares every length letter by letter

```python wrong fails="perf"
class Solution:
    def longestPrefix(self, s: str) -> str:
        n = len(s)
        for k in range(n - 1, 0, -1):
            i = 0
            while i < k and s[i] == s[n - k + i]:  # walks the whole candidate before failing
                i += 1
            if i == k:
                return s[:k]
        return ""
```

Correct, and on most strings the first letter or two rule a length out. In the test, though, prefix and suffix agree until the final `b` for every length, so each check walks almost the whole candidate: about 5 billion comparisons. The prefix function reuses each comparison instead of repeating it.
