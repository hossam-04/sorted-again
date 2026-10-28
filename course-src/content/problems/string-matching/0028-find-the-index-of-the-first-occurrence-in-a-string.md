---
id: 28
module: string-matching
patterns: [KMP prefix function, linear-time matching]
signature: "def strStr(self, haystack: str, needle: str) -> int"
---

## Task

Return the index of the first place where `needle` occurs in `haystack`, or `-1` if it doesn't occur at all.

Python's `haystack.find(needle)` does exactly this. The point of the exercise is to write a matcher yourself that stays linear even on the worst inputs.

## Constraints

- `1 <= len(haystack), len(needle) <= 100_000`
- Only the letters `a` to `z`

```json examples
[
  {"args": ["abxabcabcaby", "abcaby"], "out": 6, "why": "An attempt at index 3 matches abcab and then fails on the y. The needle starts at index 6."},
  {"args": ["aab", "ab"], "out": 1, "why": "After aa fails, matching must restart at the second a, not after it."},
  {"args": ["hello", "lol"], "out": -1, "why": "lol never appears."}
]
```

```json edge
[
  {"name": "the whole haystack", "args": ["abc", "abc"], "out": 0},
  {"name": "a needle longer than the haystack", "args": ["ab", "abc"], "out": -1},
  {"name": "a match at the very end", "args": ["xxxy", "xy"], "out": 2},
  {"name": "single letters", "args": ["a", "a"], "out": 0},
  {"name": "overlapping occurrences", "args": ["aaaa", "aa"], "out": 0},
  {"name": "a repeated prefix", "args": ["aaaab", "aab"], "out": 2}
]
```

```python oracle
class Solution:
    def strStr(self, haystack: str, needle: str) -> int:
        return haystack.find(needle)
```

```python gen
def gen(rng, size):
    letters = "ab" if rng.random() < 0.7 else "abc"
    n = rng.randint(1, 8) if size == "small" else rng.randint(20, 300)
    haystack = "".join(rng.choice(letters) for _ in range(n))
    if rng.random() < 0.5 and n > 1:
        i = rng.randrange(n)
        needle = haystack[i:i + rng.randint(1, min(6, n - i))]
    else:
        needle = "".join(rng.choice(letters) for _ in range(rng.randint(1, 5)))
    return [haystack, needle]
```

```python perf
def perf(rng):
    # 99,999 a's and a b, searched for 49,999 a's and a b: every position matches almost to the end.
    return ["a" * 99_999 + "b", "a" * 49_999 + "b"]
```

## Hints

1. Comparing the needle at every position costs O(n · m) on inputs like "aaaa…ab". The waste: after a mismatch, the characters just compared are forgotten, though you know exactly what they were.
2. After matching the first j characters of the needle and failing, the next possible start keeps as many characters as the longest proper prefix of `needle[:j]` that's also its suffix. Precompute that length for every j: the **prefix function**.
3. Scan the haystack once with a pointer `j` into the needle. On a mismatch, fall back to `j = pi[j - 1]` (repeatedly) instead of restarting; on a match, advance `j`. When `j` reaches the needle's length, you've found it.

## Solution

```python solution time="n + m" space="m"
class Solution:
    def strStr(self, haystack: str, needle: str) -> int:
        m = len(needle)
        pi = [0] * m  # pi[i]: the longest proper prefix of needle[:i + 1] that is also its suffix
        k = 0
        for i in range(1, m):
            while k and needle[i] != needle[k]:
                k = pi[k - 1]  # try the next shorter border
            if needle[i] == needle[k]:
                k += 1
            pi[i] = k
        j = 0  # how much of the needle matches the text just before this point
        for i, ch in enumerate(haystack):
            while j and ch != needle[j]:
                j = pi[j - 1]
            if ch == needle[j]:
                j += 1
            if j == m:
                return i - m + 1
        return -1
```

This is the **Knuth–Morris–Pratt** algorithm. The prefix function `pi` records, for each prefix of the needle, its longest *border*: a proper prefix that's also a suffix. When the text stops matching after j characters, those j characters are known, and the longest border of `needle[:j]` is the longest piece that could still be the start of a match, so the scan continues from there without moving backwards in the text.

Each step of the scan either advances `j` or makes it smaller, and it can't shrink more than it has grown, so the scan is O(n) and the table O(m). The prefix function is computed by the same procedure, matching the needle against itself.

## Alternatives

### The Z-function

```python alt time="n + m" space="n + m"
class Solution:
    def strStr(self, haystack: str, needle: str) -> int:
        t = needle + "#" + haystack  # "#" appears in neither string
        z = [0] * len(t)  # z[i]: how many characters from i match the start of t
        l = r = 0  # the rightmost window [l, r) known to match a prefix
        for i in range(1, len(t)):
            if i < r:
                z[i] = min(r - i, z[i - l])  # reuse what the window already says
            while i + z[i] < len(t) and t[z[i]] == t[i + z[i]]:
                z[i] += 1
            if i + z[i] > r:
                l, r = i, i + z[i]
            if z[i] == len(needle):
                return i - len(needle) - 1
        return -1
```

The **Z-function** of a string gives, for every position, how long the substring starting there matches the string's own beginning. Put the needle in front of the haystack with a separator: a position in the haystack part whose Z-value equals the needle's length is a match. The window `[l, r)` of the furthest match found so far lets each new value start from what's already known, which makes the whole computation O(n + m).

### A rolling hash

```python alt time="n + m" space="1"
class Solution:
    def strStr(self, haystack: str, needle: str) -> int:
        n, m = len(haystack), len(needle)
        if m > n:
            return -1
        base, mod = 131, (1 << 61) - 1
        target = window = 0
        for i in range(m):
            target = (target * base + ord(needle[i])) % mod
            window = (window * base + ord(haystack[i])) % mod
        top = pow(base, m - 1, mod)  # the weight of the character leaving the window
        for i in range(n - m + 1):
            if window == target and haystack[i:i + m] == needle:  # confirm, in case of a collision
                return i
            if i + m < n:
                window = ((window - ord(haystack[i]) * top) * base + ord(haystack[i + m])) % mod
        return -1
```

**Rabin–Karp** treats each window of m characters as a number in base 131 and updates it in O(1) as the window slides: remove the leaving character's contribution, shift, add the new one. Equal windows have equal hashes; different ones collide only rarely with a modulus near 2⁶¹, and every hash match is confirmed by a direct comparison. Expected O(n + m), and it extends easily to many needles of the same length.

## Wrong answers

### Restarts after the mismatched character

```python wrong fails="example" test="Example 1"
class Solution:
    def strStr(self, haystack: str, needle: str) -> int:
        j = 0
        for i, ch in enumerate(haystack):
            if ch == needle[j]:
                j += 1
                if j == len(needle):
                    return i - j + 1
            else:
                j = 1 if ch == needle[0] else 0  # starts over from here, forgetting what matched
        return -1
```

After a mismatch, a match could already have begun inside the characters just compared. Restarting from the current character skips those starts: in Example 1, the text from index 3 reads `abcab`, whose last two letters begin the real match at 6, and this loses them. That's exactly what the prefix function remembers.

### Falls back to the wrong border

```python wrong fails="example" test="Example 1"
class Solution:
    def strStr(self, haystack: str, needle: str) -> int:
        m = len(needle)
        pi = [0] * m
        k = 0
        for i in range(1, m):
            while k and needle[i] != needle[k]:
                k = pi[k - 1]
            if needle[i] == needle[k]:
                k += 1
            pi[i] = k
        j = 0
        for i, ch in enumerate(haystack):
            while j and ch != needle[j]:
                j = pi[j]  # should be pi[j - 1]: the border of the j characters that matched
            if ch == needle[j]:
                j += 1
            if j == m:
                return i - m + 1
        return -1
```

`pi[j]` describes the first j + 1 characters of the needle, but only j of them matched. Using it falls back too little or too much: in Example 1, after `abcab` matches and the `y` fails, it falls back to nothing instead of keeping `ab`, and the match at 6 is never found.

### Returns the last occurrence

```python wrong fails="edge" test="overlapping occurrences"
class Solution:
    def strStr(self, haystack: str, needle: str) -> int:
        return haystack.rfind(needle)  # searches from the right
```

`rfind` returns the last match, which is the same as the first whenever there's only one. With `aaaa` and `aa` the needle occurs three times, and the answer is the first, 0, not 2.

### Compares the needle at every position

```python wrong fails="perf"
class Solution:
    def strStr(self, haystack: str, needle: str) -> int:
        n, m = len(haystack), len(needle)
        for i in range(n - m + 1):
            j = 0
            while j < m and haystack[i + j] == needle[j]:  # starts from scratch at every position
                j += 1
            if j == m:
                return i
        return -1
```

The direct method, and on ordinary text it's fast, because most attempts fail at the first character. In the test every attempt matches 49,999 characters before failing, so 50,000 attempts make 2.5 billion comparisons. KMP never compares a text character more than a couple of times.
