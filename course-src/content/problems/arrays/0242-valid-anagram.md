---
id: 242
module: arrays
patterns: [frequency count, hash map]
signature: "def isAnagram(self, s: str, t: str) -> bool"
---

## Task

You get two strings, `s` and `t`, made of lowercase English letters. Return `True` if `t` is a rearrangement of `s`: it uses exactly the same letters, each one exactly as many times as `s` does. Otherwise return `False`.

The order of the letters doesn't matter, only how many of each there are.

## Constraints

- `1 <= len(s), len(t) <= 100_000`
- `s` and `t` contain only the letters `a` to `z`

```json examples
[
  {"args": ["listen", "silent"], "out": true, "why": "Both use e, i, l, n, s and t once each."},
  {"args": ["sees", "seas"], "out": false, "why": "Same length, but t has an a and only one e."},
  {"args": ["aab", "abb"], "out": false, "why": "Both use only a and b, but in different amounts."}
]
```

```json edge
[
  {"name": "single equal letters", "args": ["z", "z"], "out": true},
  {"name": "single different letters", "args": ["a", "b"], "out": false},
  {"name": "t is shorter", "args": ["abc", "ab"], "out": false},
  {"name": "t is longer", "args": ["abc", "abcd"], "out": false},
  {"name": "identical strings", "args": ["level", "level"], "out": true},
  {"name": "one repeated letter", "args": ["aaaa", "aaaa"], "out": true},
  {"name": "counts differ by one", "args": ["aaab", "aabb"], "out": false},
  {"name": "t is s reversed", "args": ["stressed", "desserts"], "out": true},
  {"name": "all 26 letters", "args": ["abcdefghijklmnopqrstuvwxyz", "zyxwvutsrqponmlkjihgfedcba"], "out": true}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 8) if size == "small" else rng.randint(20, 300)
    letters = "abc" if size == "small" else "abcdefghij"
    s = [rng.choice(letters) for _ in range(n)]
    t = s[:]
    rng.shuffle(t)
    roll = rng.random()
    if roll < 0.2:
        t[rng.randrange(n)] = rng.choice(letters)  # often changes one count
    elif roll < 0.3:
        t.append(rng.choice(letters))
    elif roll < 0.4 and n > 1:
        t.pop()
    return ["".join(s), "".join(t)]
```

```python perf
def perf(rng):
    # 100,000 letters, and t holds the same letters sorted from z to a: an anagram, so nothing can stop early,
    # and a search for a letter of s in t usually has to pass most of t first.
    s = [rng.choice("abcdefghijklmnopqrstuvwxyz") for _ in range(100_000)]
    return ["".join(s), "".join(sorted(s, reverse=True))]
```

## Hints

1. Two strings are anagrams exactly when every letter appears the same number of times in both.
2. Count the letters of each string in a dict (or a `Counter`), then compare the two counts.
3. If the lengths differ, you can answer `False` before counting anything.

## Solution

```python solution time="n" space="1"
class Solution:
    def isAnagram(self, s: str, t: str) -> bool:
        if len(s) != len(t):
            return False
        return Counter(s) == Counter(t)
```

`Counter(s)` maps each letter to how many times it appears, in one pass over the string. Two strings are anagrams exactly when those maps are equal, so comparing them answers the question. Building each counter is O(n), and comparing them looks at each distinct letter once.

The extra space is O(1) because there are at most 26 distinct letters, however long the strings get. With arbitrary Unicode text the counters could grow to O(n), and the same code still works.

## Alternatives

### Remove letters one at a time

```python alt time="n²" space="n" slow
class Solution:
    def isAnagram(self, s: str, t: str) -> bool:
        rest = list(t)
        for c in s:
            if c not in rest:
                return False
            rest.remove(c)  # scans the list to find c
        return not rest
```

This is what you'd do with paper letter tiles: cross off each letter of `s` from `t`. Each `remove` scans the list, so the total is O(n²).

### Sort both strings

```python alt time="n log n" space="n" oracle
class Solution:
    def isAnagram(self, s: str, t: str) -> bool:
        return sorted(s) == sorted(t)
```

Sorting puts the letters of each string in a fixed order, so anagrams become identical lists. It's short and fast in practice, but sorting costs O(n log n) and builds two new lists.

## Wrong answers

### Compares the sets of letters

```python wrong fails="example" test="Example 3"
class Solution:
    def isAnagram(self, s: str, t: str) -> bool:
        return set(s) == set(t)  # a set forgets how many times each letter appears
```

A set keeps each letter once, so it can't tell `"aab"` from `"abb"`. Anagrams need the same counts, not just the same letters.

### Never checks that every letter was used

```python wrong fails="edge" test="t is shorter"
class Solution:
    def isAnagram(self, s: str, t: str) -> bool:
        counts = Counter(s)
        for c in t:
            if counts[c] == 0:
                return False
            counts[c] -= 1
        return True  # letters of s that t never used are still counted
```

The loop catches letters that `t` has too many of, but not letters it is missing. When `t` is shorter than `s`, the loop ends happily and leftovers in `counts` go unnoticed. A length check at the start fixes it.

### Counts every letter from scratch

```python wrong fails="perf"
class Solution:
    def isAnagram(self, s: str, t: str) -> bool:
        if len(s) != len(t):
            return False
        for c in s:
            if s.count(c) != t.count(c):  # two full scans for every letter of s
                return False
        return True
```

The logic is right, but `s.count(c)` and `t.count(c)` each scan a whole string, and the loop does that for every one of the n letters. That is O(n²): about 20 billion character comparisons on the performance test.

## Notes

If the input can be any Unicode text, the counting solution still works unchanged; only the "O(1) space" claim turns into O(k) for k distinct characters. A fixed array of 26 counters (`ord(c) - ord('a')`) is a common interview variant when the alphabet is known.
