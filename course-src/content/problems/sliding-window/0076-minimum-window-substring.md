---
id: 76
module: sliding-window
patterns: [variable window, missing count]
signature: "def minWindow(self, s: str, t: str) -> str"
---

## Task

You get two strings, `s` and `t`, made of upper- and lowercase letters. Find the shortest stretch of consecutive characters in `s` that contains every character of `t`, counting repeats: if `t` has two `a`s, the stretch needs at least two `a`s. Upper and lower case are different letters.

Return that stretch. If no stretch of `s` contains all of `t`, return the empty string `""`. The tests are built so that the shortest stretch is unique.

## Constraints

- `1 <= len(s), len(t) <= 100_000`
- `s` and `t` contain only the letters `a`–`z` and `A`–`Z`
- The answer is unique

```json examples
[
  {"args": ["XAYBZXCAB", "ABC"], "out": "CAB", "why": "\"CAB\" at the end has an A, a B and a C, and no shorter stretch does."},
  {"args": ["aaab", "aab"], "out": "aab", "why": "t needs two a's and a b, so the stretch must keep both a's."},
  {"args": ["hello", "xyz"], "out": "", "why": "s has no x, y or z at all."}
]
```

```json edge
[
  {"name": "t equals s", "args": ["abc", "abc"], "out": "abc"},
  {"name": "t longer than s", "args": ["ab", "abc"], "out": ""},
  {"name": "one letter", "args": ["bab", "a"], "out": "a"},
  {"name": "case matters", "args": ["aA", "A"], "out": "A"},
  {"name": "repeated letter in t", "args": ["abba", "bb"], "out": "bb"},
  {"name": "answer at the start", "args": ["abxyz", "ba"], "out": "ab"},
  {"name": "answer is all of s", "args": ["abcdef", "fa"], "out": "abcdef"},
  {"name": "many spare copies", "args": ["aaaaaaaaab", "aab"], "out": "aab"}
]
```

```python gen
from collections import Counter


def gen(rng, size):
    letters = "abc" if size == "small" else "abcdefAB"
    while True:
        n = rng.randint(1, 10) if size == "small" else rng.randint(20, 300)
        m = rng.randint(1, 4) if size == "small" else rng.randint(1, 8)
        s = "".join(rng.choice(letters) for _ in range(n))
        t = "".join(rng.choice(letters) for _ in range(m))
        if _shortest_windows(s, t) <= 1:  # keep the promise that the answer is unique
            return [s, t]


def _shortest_windows(s, t):
    """How many windows of the shortest covering length there are (0 if none covers t)."""
    need, best = Counter(t), None
    have, left = Counter(), 0
    for right, c in enumerate(s):
        have[c] += 1
        while all(have[x] >= k for x, k in need.items()):
            best = right - left + 1 if best is None else min(best, right - left + 1)
            have[s[left]] -= 1
            left += 1
    if best is None:
        return 0
    return sum(all(s[i : i + best].count(x) >= k for x, k in need.items()) for i in range(len(s) - best + 1))
```

```python perf
def perf(rng):
    # 100,000 lowercase filler letters. t is 3,000 capital letters, and s holds exactly those capitals,
    # spread over positions 60,000 to 90,000, so the only shortest window is about 30,000 letters long.
    t = [rng.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ") for _ in range(3_000)]
    s = [rng.choice("abcdefghijklmnopqrstuvwx") for _ in range(100_000)]
    spots = sorted(rng.sample(range(60_000, 90_000), 3_000))
    shuffled = t[:]
    rng.shuffle(shuffled)
    for pos, c in zip(spots, shuffled):
        s[pos] = c
    return ["".join(s), "".join(t)]
```

## Hints

1. Grow a window to the right until it contains all of `t`. Then shrink it from the left as far as possible while it still does.
2. Keep a count of how many more of each letter the window needs, and a single number `missing`: how many letters of `t` aren't covered yet. The window is valid exactly when `missing == 0`.
3. Every time the window is valid and as small as it can get from the left, compare it with the best so far, then give up its leftmost needed letter and keep growing.

## Solution

```python solution time="n + m" space="k"
class Solution:
    def minWindow(self, s: str, t: str) -> str:
        need = Counter(t)  # how many more of each letter the window needs; below 0 means spare copies
        missing = len(t)   # letters of t the window doesn't cover yet
        left = 0
        best_start, best_len = 0, len(s) + 1
        for right, c in enumerate(s):
            if need[c] > 0:
                missing -= 1
            need[c] -= 1
            if missing == 0:  # the window s[left..right] covers t
                while need[s[left]] < 0:  # spare letter: dropping it keeps the window valid
                    need[s[left]] += 1
                    left += 1
                if right - left + 1 < best_len:
                    best_start, best_len = left, right - left + 1
                need[s[left]] += 1  # give up the first needed letter and look for the next window
                missing += 1
                left += 1
        return s[best_start : best_start + best_len] if best_len <= len(s) else ""
```

`need[c]` says how many more copies of `c` the window still needs; a negative value means the window holds spares. `missing` counts the letters of `t` still uncovered, so the window covers `t` exactly when `missing == 0`.

When that happens, letters on the left with a negative `need` are spares, and dropping them keeps the window valid, so the loop shrinks to the shortest valid window ending at `right`. After recording it, the window deliberately gives up its leftmost needed letter, because any later answer must start further right.

Both ends only move forward, so each character is added and removed at most once: O(n + m) time for `len(s) = n` and `len(t) = m`. The counter holds at most k distinct letters (52 here).

## Alternatives

### Grow a window from every start

```python alt time="n²" space="k" slow oracle
class Solution:
    def minWindow(self, s: str, t: str) -> str:
        need, best = Counter(t), ""
        for i in range(len(s)):
            have = Counter()
            for j in range(i, len(s)):
                have[s[j]] += 1
                if all(have[c] >= k for c, k in need.items()):
                    if not best or j - i + 1 < len(best):
                        best = s[i : j + 1]
                    break
        return best
```

For each start, extend until the window covers `t`. It's easy to trust, but it walks most of `s` from every start, and it checks every letter of `t` at each step.

## Wrong answers

### Ignores repeated letters in t

```python wrong fails="example" test="Example 2"
class Solution:
    def minWindow(self, s: str, t: str) -> str:
        need, best = set(t), ""  # a set keeps one copy of each letter
        for i in range(len(s)):
            for j in range(i, len(s)):
                if need <= set(s[i : j + 1]):
                    if not best or j - i + 1 < len(best):
                        best = s[i : j + 1]
                    break
        return best
```

With `t = "aab"` the window needs two a's, but a set of `t` is just `{a, b}`, so `"ab"` looks good enough. Count letters with a `Counter` instead.

### Records the window after shrinking it

```python wrong fails="example" test="Example 1"
class Solution:
    def minWindow(self, s: str, t: str) -> str:
        need, have = Counter(t), Counter()
        covered, required = 0, len(need)
        left, best = 0, None
        for right, c in enumerate(s):
            have[c] += 1
            if c in need and have[c] == need[c]:
                covered += 1
            while covered == required:
                have[s[left]] -= 1
                if s[left] in need and have[s[left]] < need[s[left]]:
                    covered -= 1
                left += 1
                if best is None or right - left + 1 < len(best):  # this window may no longer cover t
                    best = s[left : right + 1]
        return best or ""
```

The loop records the window *after* removing a letter, and that removal can break it. In Example 1 it records `"AB"` right after dropping the C it needed. Record first, then shrink: that ordering is the classic trap of variable windows.

### Recounts the window at every step

```python wrong fails="perf"
class Solution:
    def minWindow(self, s: str, t: str) -> str:
        need, best = Counter(t), ""
        left = 0
        for right in range(len(s)):
            while Counter(s[left : right + 1]) >= need:  # counts the whole window again
                if not best or right - left + 1 < len(best):
                    best = s[left : right + 1]
                left += 1
        return best
```

The window moves correctly, but each check builds a fresh `Counter` of the window. The window grows to tens of thousands of letters before it first covers `t`, so the counting adds up to billions of steps.
