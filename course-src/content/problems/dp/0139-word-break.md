---
id: 139
module: dp
patterns: [can each prefix be split?, dictionary lookups]
signature: "def wordBreak(self, s: str, wordDict: List[str]) -> bool"
---

## Task

Return `True` if the string `s` can be cut into pieces that are all words from `wordDict`. Each word may be used any number of times.

## Constraints

- `1 <= len(s) <= 300`
- `1 <= len(wordDict) <= 1000`, all different
- `1 <= len(word) <= 20`
- Only the letters `a` to `z`

```json examples
[
  {"args": ["bedbath", ["bed", "bath", "be", "dbath"]], "out": true, "why": "bed + bath works, and so does be + dbath."},
  {"args": ["sunfloweroil", ["sun", "flower", "oil", "sunflower"]], "out": true, "why": "sunflower + oil, or sun + flower + oil."},
  {"args": ["helloworld", ["hello", "wor"]], "out": false, "why": "After hello and wor, the letters ld are left over, and no word fits them."}
]
```

```json edge
[
  {"name": "the longest first word is a trap", "args": ["abcd", ["ab", "abc", "cd"]], "out": true},
  {"name": "a word used three times", "args": ["aaa", ["a"]], "out": true},
  {"name": "the word is longer than the string", "args": ["ab", ["abc"]], "out": false},
  {"name": "a decoy word", "args": ["catdog", ["cat", "dog", "cd"]], "out": true},
  {"name": "a one-letter string", "args": ["x", ["x"]], "out": true}
]
```

```python oracle
class Solution:
    def wordBreak(self, s: str, wordDict: List[str]) -> bool:
        words = set(wordDict)
        for cuts in itertools.product([False, True], repeat=len(s) - 1):  # cut after letter i or not
            pieces, start = [], 0
            for i, cut in enumerate(cuts, start=1):
                if cut:
                    pieces.append(s[start:i])
                    start = i
            pieces.append(s[start:])
            if all(p in words for p in pieces):
                return True
        return False
```

```python gen
def gen(rng, size):
    letters = "ab"
    words = sorted({"".join(rng.choice(letters) for _ in range(rng.randint(1, 3))) for _ in range(rng.randint(1, 4))})
    n = rng.randint(1, 6) if size == "small" else rng.randint(6, 12)
    if rng.random() < 0.5:  # often a string built from the words
        s = ""
        while len(s) < n:
            s += rng.choice(words)
    else:
        s = "".join(rng.choice(letters) for _ in range(n))
    return [s, words]
```

```python perf
def perf(rng):
    # 299 a's and a final b, with the words a, aa, aaa, ... up to ten a's: countless ways to split the a's,
    # and none of them handles the b.
    return ["a" * 299 + "b", ["a" * k for k in range(1, 11)]]
```

## Hints

1. Ask about prefixes: can the first i letters be split into words? The empty prefix can.
2. The first i letters can be split if some word ends exactly at position i, and the letters before that word can be split as well.
3. Fill a table `ok[i]` for i from 0 to n, checking only the words that fit. Each prefix is decided once, no matter how many ways lead to it.

## Solution

```python solution time="n · L²" space="n"
class Solution:
    def wordBreak(self, s: str, wordDict: List[str]) -> bool:
        words = set(wordDict)
        longest = max(map(len, words))
        ok = [True] + [False] * len(s)  # ok[i]: can s[:i] be split into words?
        for i in range(1, len(s) + 1):
            for j in range(max(0, i - longest), i):  # the last word is s[j:i]
                if ok[j] and s[j:i] in words:
                    ok[i] = True
                    break
        return ok[len(s)]
```

Every split of `s[:i]` ends with a word `s[j:i]`, and what comes before it, `s[:j]`, must be splittable too. So `ok[i]` follows from the earlier entries, and filling them in order means each prefix is decided exactly once, however many splits lead to it. Only words up to the longest dictionary word can end at i, so with L the longest word length, each position looks at L candidates, each a slice and a set lookup of up to L letters: O(n · L²).

## Alternatives

### Top-down with a cache

```python alt time="n · L²" space="n"
class Solution:
    def wordBreak(self, s: str, wordDict: List[str]) -> bool:
        words = set(wordDict)
        longest = max(map(len, words))

        @cache
        def can(i):  # can s[i:] be split into words?
            if i == len(s):
                return True
            for j in range(i + 1, min(len(s), i + longest) + 1):
                if s[i:j] in words and can(j):
                    return True
            return False

        return can(0)
```

The same idea from the front: try each word that starts here, and ask the same question about what's left. The cache remembers each suffix's answer, so the work is the same as the table's.

## Wrong answers

### Takes the longest word that fits

```python wrong fails="edge" test="the longest first word is a trap"
class Solution:
    def wordBreak(self, s: str, wordDict: List[str]) -> bool:
        i = 0
        while i < len(s):
            match = max((w for w in wordDict if s.startswith(w, i)), key=len, default=None)  # longest first
            if match is None:
                return False
            i += len(match)
        return True
```

Committing to the longest matching word can lead into a dead end that a shorter word avoids. In `abcd`, taking `abc` leaves `d`, which no word fits, while `ab` + `cd` works. Every word that fits has to be considered.

### Uses each word only once

```python wrong fails="edge" test="a word used three times"
class Solution:
    def wordBreak(self, s: str, wordDict: List[str]) -> bool:
        def can(rest, available):
            if not rest:
                return True
            return any(rest.startswith(w) and can(rest[len(w):], available - {w}) for w in available)  # removes w

        return can(s, frozenset(wordDict))
```

Words can be reused: `aaa` is `a` three times. Removing a word once it's used makes this impossible, and it also makes the search exponential in the size of the dictionary.

### Plain recursion

```python wrong fails="perf"
class Solution:
    def wordBreak(self, s: str, wordDict: List[str]) -> bool:
        words = set(wordDict)

        def can(i):
            if i == len(s):
                return True
            for j in range(i + 1, len(s) + 1):
                if s[i:j] in words and can(j):  # the same suffix is re-examined for every route to it
                    return True
            return False

        return can(0)
```

Without remembering answers, every way of splitting the a's is explored, and each one fails only at the final b. With words of one to ten a's, there are more than 10⁸⁰ such splits. Remembering which suffixes are hopeless makes each one cost a single check.
