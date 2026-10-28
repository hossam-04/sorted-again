---
id: 424
module: sliding-window
patterns: [variable window, window length minus top count]
signature: "def characterReplacement(self, s: str, k: int) -> int"
---

## Task

You get a string `s` of uppercase letters and an integer `k`. You may change up to `k` characters of `s`, each into any uppercase letter.

Return the length of the longest stretch of consecutive characters that can be made all the same letter with at most `k` changes.

## Constraints

- `1 <= len(s) <= 100_000`
- `s` contains only the letters `A` to `Z`
- `0 <= k <= len(s)`

```json examples
[
  {"args": ["XYYXYZY", 1], "out": 4, "why": "Change the X in \"YYXY\" to Y: four Ys in a row. Any longer stretch needs two changes."},
  {"args": ["BAAAB", 2], "out": 5, "why": "Changing both Bs turns the whole string into AAAAA."},
  {"args": ["QWER", 0], "out": 1, "why": "With no changes allowed, the answer is the longest run that already exists."}
]
```

```json edge
[
  {"name": "one character", "args": ["Z", 0], "out": 1},
  {"name": "k covers everything", "args": ["ABCD", 4], "out": 4},
  {"name": "k larger than needed", "args": ["AAAA", 2], "out": 4},
  {"name": "no changes allowed", "args": ["ABBBC", 0], "out": 3},
  {"name": "best run at the end", "args": ["ABCDDDD", 1], "out": 5},
  {"name": "alternating letters", "args": ["ABABABAB", 2], "out": 5},
  {"name": "window must slide", "args": ["AABCDEFAAA", 2], "out": 5},
  {"name": "the best letter is not the most common", "args": ["AXAXAXAXCCC", 0], "out": 3},
  {"name": "run in the middle", "args": ["BAAAAB", 0], "out": 4}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 9) if size == "small" else rng.randint(20, 300)
    letters = rng.choice(("AB", "ABC", "AXY")) if size == "small" else "ABCDE"
    s = "".join(rng.choice(letters) for _ in range(n))
    return [s, rng.randint(0, min(n, 3) if size == "small" else n // 4)]
```

```python perf
def perf(rng):
    # 100,000 letters with k = 30,000: the best windows are tens of thousands of letters long.
    s = "".join(rng.choice("AABBC") for _ in range(100_000))
    return [s, 30_000]
```

## Hints

1. A window can be made into one letter if (window length) − (count of its most common letter) ≤ k: you change everything else.
2. Grow the window to the right one letter at a time, keeping letter counts in a dict.
3. When the condition breaks, move the left end forward (and lower that letter's count) until it holds again. The longest valid window is the answer.

## Solution

```python solution time="n" space="1"
class Solution:
    def characterReplacement(self, s: str, k: int) -> int:
        count = defaultdict(int)
        left = best = 0
        for right, c in enumerate(s):
            count[c] += 1
            while (right - left + 1) - max(count.values()) > k:  # more than k letters would need changing
                count[s[left]] -= 1
                left += 1
            best = max(best, right - left + 1)
        return best
```

The cheapest way to make a window one letter is to keep its most common letter and change the rest, so a window works exactly when `length - top count <= k`. The loop keeps the window valid: after each new letter on the right, it drops letters on the left until the condition holds. Every valid window ending at `right` is at most as long as this one, so the largest window seen is the answer.

There are only 26 letters, so `max(count.values())` costs O(26) = O(1), and each letter enters and leaves the window once: O(n) time and O(1) space.

## Alternatives

### Try every start

```python alt time="n²" space="1" slow oracle
class Solution:
    def characterReplacement(self, s: str, k: int) -> int:
        best = 0
        for i in range(len(s)):
            count = defaultdict(int)
            top = 0
            for j in range(i, len(s)):
                count[s[j]] += 1
                top = max(top, count[s[j]])
                if j - i + 1 - top > k:
                    break
                best = max(best, j - i + 1)
        return best
```

Extend from each start until the window needs more than k changes. Correct, but with large k every start walks a long way.

### Never shrink the window

```python alt time="n" space="1"
class Solution:
    def characterReplacement(self, s: str, k: int) -> int:
        count = defaultdict(int)
        left = top = 0
        for right, c in enumerate(s):
            count[c] += 1
            top = max(top, count[c])  # the highest count ever seen, never lowered
            if right - left + 1 - top > k:
                count[s[left]] -= 1
                left += 1
        return len(s) - left
```

A famous trick: once a window of length L works, only longer windows matter, so the window just slides (one step left for each step right) whenever it's too big. `top` may then be stale, but a stale `top` can only keep the window at its current length, never make it wrongly longer. The answer is the final window length. Every step is O(1), with no `max` over the counts.

## Wrong answers

### Uses the count of the newest letter

```python wrong fails="example" test="Example 1"
class Solution:
    def characterReplacement(self, s: str, k: int) -> int:
        count = defaultdict(int)
        left = best = 0
        for right, c in enumerate(s):
            count[c] += 1
            while (right - left + 1) - count[c] > k:  # c may not be the window's most common letter
                count[s[left]] -= 1
                left += 1
            best = max(best, right - left + 1)
        return best
```

The letter you keep should be the window's most common one, not the one that just arrived. When an X arrives in a window full of Ys, this version thinks every Y would need changing and shrinks the window far too much.

### Picks the most common letter of the whole string

```python wrong fails="edge" test="the best letter is not the most common"
class Solution:
    def characterReplacement(self, s: str, k: int) -> int:
        target = Counter(s).most_common(1)[0][0]  # the best run may use another letter
        left = others = best = 0
        for right, c in enumerate(s):
            if c != target:
                others += 1
            while others > k:
                if s[left] != target:
                    others -= 1
                left += 1
            best = max(best, right - left + 1)
        return best
```

The letter that's most common overall isn't necessarily the one with the best stretch. In `"AXAXAXAXCCC"` with no changes allowed, A appears most often, but the longest run is `CCC`. Each window has to be judged by its own most common letter.

### Recounts the whole window every time

```python wrong fails="perf"
class Solution:
    def characterReplacement(self, s: str, k: int) -> int:
        left = best = 0
        for right in range(len(s)):
            while True:
                window = s[left : right + 1]
                if len(window) - max(Counter(window).values()) <= k:  # counts the whole window again
                    break
                left += 1
            best = max(best, right - left + 1)
        return best
```

The window moves correctly, but each check copies and counts the entire window. With k = 30,000 the windows are tens of thousands of letters long, so every step does that much work again.
