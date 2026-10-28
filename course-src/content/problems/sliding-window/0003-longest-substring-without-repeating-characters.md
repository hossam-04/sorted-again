---
id: 3
module: sliding-window
patterns: [variable window, last-seen index]
signature: "def lengthOfLongestSubstring(self, s: str) -> int"
---

## Task

You get a string `s`. Find the longest stretch of consecutive characters in which no character appears twice, and return its length.

Every character counts, including spaces, digits and symbols. An empty string has no characters, so the answer is 0.

## Constraints

- `0 <= len(s) <= 100_000`
- `s` may contain any characters, including spaces and letters from any alphabet

```json examples
[
  {"args": ["go to bed"], "out": 6, "why": "\"to bed\" has six different characters, counting the space. Any longer stretch repeats o or the space."},
  {"args": ["dvdf"], "out": 3, "why": "After the second d, the window keeps v and goes on: \"vdf\"."},
  {"args": [""], "out": 0, "why": "An empty string has no characters."}
]
```

```json edge
[
  {"name": "one character", "args": ["x"], "out": 1},
  {"name": "all the same", "args": ["aaaa"], "out": 1},
  {"name": "all different", "args": ["abcdef"], "out": 6},
  {"name": "repeat jumps back", "args": ["abba"], "out": 2},
  {"name": "repeat far behind", "args": ["tmmzuxt"], "out": 5},
  {"name": "digits and symbols", "args": ["12!1@"], "out": 4},
  {"name": "spaces count", "args": ["a b c"], "out": 3},
  {"name": "longest at the end", "args": ["aab"], "out": 2},
  {"name": "other alphabets", "args": ["日本日本語"], "out": 3}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(0, 9) if size == "small" else rng.randint(20, 300)
    alphabet = rng.choice(("ab", "abc", "abcd ", "xyz!1")) if size == "small" else "abcdefghijklmnopqrstuvwxyz 0123"
    return ["".join(rng.choice(alphabet) for _ in range(n))]
```

```python perf
def perf(rng):
    # 20,000 different characters repeated five times in the same order: every window of 20,000 is all
    # different, so a check that walks forward from every start does 20,000 steps each time.
    chars = [chr(c) for c in rng.sample(range(0x4E00, 0x9FFF), 20_000)]
    return ["".join(chars) * 5]
```

## Hints

1. Keep a window `s[left..right]` with no repeats. Grow it by moving `right` one character at a time.
2. When the new character already appears in the window, the window must start after that earlier copy.
3. Remember the last position of each character in a dict. Jump `left` past the earlier copy, but never move `left` backwards.

## Solution

```python solution time="n" space="k"
class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        last = {}  # character -> last index where it appeared
        left = best = 0
        for right, c in enumerate(s):
            if c in last and last[c] >= left:  # the earlier copy is inside the window
                left = last[c] + 1
            last[c] = right
            best = max(best, right - left + 1)
        return best
```

The window `s[left..right]` never contains a repeat. When `c` arrives and its previous copy sits inside the window, the shortest fix is to start the window just after that copy, so `left` jumps there in one step. The condition `last[c] >= left` matters: a copy *before* the window is irrelevant, and jumping to it would move `left` backwards and let a repeat back in (try `"abba"`).

Each character is handled once with O(1) dict work, so the time is O(n). The dict holds one entry per distinct character, k of them, which is O(k) space.

## Alternatives

### Walk forward from every start

```python alt time="n·k" space="k" slow oracle
class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        best = 0
        for i in range(len(s)):
            seen = set()
            for c in s[i:]:
                if c in seen:
                    break
                seen.add(c)
            best = max(best, len(seen))
        return best
```

From each start, extend until the first repeat. With a small alphabet the walks are short, but when long stretches have no repeats each start walks a long way: up to 20,000 steps per start on the performance test.

### A set window that shrinks one step at a time

```python alt time="n" space="k"
class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        window = set()
        left = best = 0
        for right, c in enumerate(s):
            while c in window:
                window.remove(s[left])
                left += 1
            window.add(c)
            best = max(best, right - left + 1)
        return best
```

Instead of jumping, `left` steps forward and removes characters until the repeat is gone. Each character enters and leaves the set at most once, so it is still O(n). It's the general shape of a variable-size window, and easier to adapt to other conditions.

## Wrong answers

### Lets the left end move backwards

```python wrong fails="edge" test="repeat jumps back"
class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        last = {}
        left = best = 0
        for right, c in enumerate(s):
            if c in last:
                left = last[c] + 1  # may be smaller than left already is
            last[c] = right
            best = max(best, right - left + 1)
        return best
```

In `"abba"`, the second `b` moves `left` to 2. Then the last `a` finds its old copy at index 0 and sets `left` back to 1, so the window `"bba"` counts as valid. `left` must only ever move forward: use `max(left, last[c] + 1)` or check that the copy is inside the window.

### Starts over at every repeat

```python wrong fails="example" test="Example 1"
class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        seen, best = set(), 0
        for c in s:
            if c in seen:
                seen = set()  # also throws away the characters after the earlier copy
            seen.add(c)
            best = max(best, len(seen))
        return best
```

When a repeat appears, only the part of the window up to the earlier copy has to go. In `"go to bed"` the second `o` should keep the `t` just before it; starting over loses it, and the answer comes out as 5 instead of 6.

### Rebuilds a set to check the window

```python wrong fails="perf"
class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        left = best = 0
        for right in range(len(s)):
            while len(set(s[left:right + 1])) < right - left + 1:  # copies and hashes the whole window every time
                left += 1
            best = max(best, right - left + 1)
        return best
```

The window logic is right, but each check copies the window and builds a set from it. When windows are 20,000 characters long, that's 20,000 steps for every character of `s`.

## Notes

On LeetCode, `s` only contains printable ASCII characters, so no window is longer than 95 and even slow solutions pass. Here the performance test uses 20,000 different characters to make the difference between O(n) and O(n·k) visible.
