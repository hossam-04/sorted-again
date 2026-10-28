---
id: 567
module: sliding-window
patterns: [fixed window, letter counts]
signature: "def checkInclusion(self, s1: str, s2: str) -> bool"
---

## Task

You get two strings of lowercase letters, `s1` and `s2`. Return `True` if some stretch of consecutive characters in `s2` is a rearrangement of `s1`: it has exactly the same letters, each the same number of times. Otherwise return `False`.

The stretch has to be contiguous in `s2`. Letters scattered across `s2` don't count.

## Constraints

- `1 <= len(s1) <= 10_000`
- `1 <= len(s2) <= 100_000`
- Both strings contain only the letters `a` to `z`

```json examples
[
  {"args": ["cat", "actor"], "out": true, "why": "The first three letters of \"actor\" are \"act\", a rearrangement of \"cat\"."},
  {"args": ["abc", "cbxab"], "out": false, "why": "s2 has an a, a b and a c, but every stretch of three letters also contains the x."},
  {"args": ["aab", "abba"], "out": false, "why": "Both stretches of three letters have one a and two b's, but s1 needs two a's and one b."}
]
```

```json edge
[
  {"name": "s1 longer than s2", "args": ["abcd", "abc"], "out": false},
  {"name": "equal strings", "args": ["same", "same"], "out": true},
  {"name": "one letter, present", "args": ["z", "abcz"], "out": true},
  {"name": "one letter, missing", "args": ["z", "abc"], "out": false},
  {"name": "match at the start", "args": ["ab", "bacd"], "out": true},
  {"name": "match at the end", "args": ["xyz", "aaaazyx"], "out": true},
  {"name": "repeated letter needed twice", "args": ["aa", "aba"], "out": false},
  {"name": "one-letter s1 inside a run", "args": ["aaa", "baaab"], "out": true}
]
```

```python gen
def gen(rng, size):
    letters = "abc" if size == "small" else "abcde"
    k = rng.randint(1, 4) if size == "small" else rng.randint(2, 10)
    n = rng.randint(1, 10) if size == "small" else rng.randint(20, 300)
    s1 = [rng.choice(letters) for _ in range(k)]
    s2 = [rng.choice(letters) for _ in range(n)]
    if rng.random() < 0.4 and n >= k:  # plant a rearrangement of s1
        i = rng.randint(0, n - k)
        rng.shuffle(s1)
        s2[i : i + k] = s1
    return ["".join(s1), "".join(s2)]
```

```python perf
def perf(rng):
    # s1 has 5,000 letters, including one z. s2 has no z except in a rearrangement of s1 at the very end,
    # so every one of the 95,000 earlier windows has to be checked and rejected.
    s1 = [rng.choice("abcdefghijklmnopqrstuvwxy") for _ in range(4_999)] + ["z"]
    tail = s1[:]
    rng.shuffle(tail)
    head = [rng.choice("abcdefghijklmnopqrstuvwxy") for _ in range(95_000)]
    return ["".join(s1), "".join(head + tail)]
```

## Hints

1. A rearrangement of `s1` is any string with the same letter counts, and it has the same length as `s1`.
2. So only the windows of `s2` with length `len(s1)` matter. Compare each window's letter counts with `s1`'s.
3. Slide the window one step at a time: add the letter entering on the right and remove the one leaving on the left, instead of recounting.

## Solution

```python solution time="n" space="1"
class Solution:
    def checkInclusion(self, s1: str, s2: str) -> bool:
        k = len(s1)
        if k > len(s2):
            return False
        need, have = [0] * 26, [0] * 26
        for c in s1:
            need[ord(c) - ord("a")] += 1
        for c in s2[:k]:
            have[ord(c) - ord("a")] += 1
        if have == need:
            return True
        for i in range(k, len(s2)):
            have[ord(s2[i]) - ord("a")] += 1      # the letter entering on the right
            have[ord(s2[i - k]) - ord("a")] -= 1  # the letter leaving on the left
            if have == need:
                return True
        return False
```

Every rearrangement of `s1` has length k and the same 26 letter counts, so it's enough to check each window of length k in `s2`. Moving the window one step changes exactly two counts, which keeps the update O(1) instead of recounting k letters.

Comparing two lists of 26 counts is O(26), a constant, so the whole scan is O(n) for `len(s2) = n`. Note the check after the loop's update covers the last window; forgetting it is a classic bug.

## Alternatives

### Count every window from scratch

```python alt time="n·k" space="1" slow oracle
class Solution:
    def checkInclusion(self, s1: str, s2: str) -> bool:
        need, k = Counter(s1), len(s1)
        return any(Counter(s2[i : i + k]) == need for i in range(len(s2) - k + 1))
```

Correct and short, but each window is counted from scratch: k work for each of about n windows.

### Track how many letters already match

```python alt time="n" space="1"
class Solution:
    def checkInclusion(self, s1: str, s2: str) -> bool:
        k = len(s1)
        if k > len(s2):
            return False
        need, have = [0] * 26, [0] * 26
        for c in s1:
            need[ord(c) - ord("a")] += 1
        for c in s2[:k]:
            have[ord(c) - ord("a")] += 1
        matches = sum(need[i] == have[i] for i in range(26))  # letters whose counts agree
        for i in range(k, len(s2)):
            if matches == 26:
                return True
            for j, step in ((ord(s2[i]) - ord("a"), 1), (ord(s2[i - k]) - ord("a"), -1)):
                matches -= have[j] == need[j]
                have[j] += step
                matches += have[j] == need[j]
        return matches == 26
```

Instead of comparing all 26 counts each step, keep the number of letters whose counts agree and update it as the two changed counts move. Each step is truly O(1). It matters when the alphabet is large; with 26 letters the simpler comparison is just as fast in practice.

## Wrong answers

### Compares sets of letters

```python wrong fails="example" test="Example 3"
class Solution:
    def checkInclusion(self, s1: str, s2: str) -> bool:
        k, target = len(s1), set(s1)
        return any(set(s2[i : i + k]) == target for i in range(len(s2) - k + 1))  # ignores counts
```

A set only knows which letters appear. `"abb"` and `"aab"` have the same set, but they aren't rearrangements of each other.

### Never checks the last window

```python wrong fails="edge" test="equal strings"
class Solution:
    def checkInclusion(self, s1: str, s2: str) -> bool:
        need, k = Counter(s1), len(s1)
        window = Counter(s2[:k])
        for i in range(k, len(s2)):
            if window == need:
                return True
            window[s2[i]] += 1
            window[s2[i - k]] -= 1
        return False  # the window built in the last step is never compared
```

The comparison happens before each slide, so the window that the final slide produces is never checked. When `s1` and `s2` are equal, the only window is that last one. Check once more after the loop, or compare after sliding.

### Sorts every window

```python wrong fails="perf"
class Solution:
    def checkInclusion(self, s1: str, s2: str) -> bool:
        k, target = len(s1), sorted(s1)
        for i in range(len(s2) - k + 1):
            if sorted(s2[i : i + k]) == target:  # sorts k letters for every window
                return True
        return False
```

Sorting is a fine way to compare two strings once, but here it runs for every window: about 95,000 sorts of 5,000 letters each. Sliding counts update in O(1) per step.
