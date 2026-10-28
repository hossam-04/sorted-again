---
id: 131
module: backtracking
patterns: [backtracking, cut positions, pruning]
signature: "def partition(self, s: str) -> List[List[str]]"
compare: unordered
---

## Task

Cut the string `s` into pieces so that every piece is a palindrome: it reads the same forwards and backwards. Return every way to do it. Each way is a list of the pieces in their original order; the ways themselves can come in any order.

## Constraints

- `1 <= len(s) <= 22`
- Only the letters `a` to `z`
- The answer has at most `20_000` ways

```json examples
[
  {"args": ["noon"], "out": [["n", "o", "o", "n"], ["n", "oo", "n"], ["noon"]], "why": "Single letters are always palindromes, so cutting between every letter always works. oo and noon are longer palindromes."},
  {"args": ["abc"], "out": [["a", "b", "c"]], "why": "No piece longer than one letter reads the same backwards, so the only way is letter by letter."},
  {"args": ["aaa"], "out": [["a", "a", "a"], ["a", "aa"], ["aa", "a"], ["aaa"]], "why": "Every piece of aaa is a palindrome, so all 4 ways of cutting it count, and a + aa differs from aa + a."}
]
```

```json edge
[
  {"name": "one letter", "args": ["z"], "out": [["z"]]},
  {"name": "two different letters", "args": ["ab"], "out": [["a", "b"]]},
  {"name": "two equal letters", "args": ["bb"], "out": [["b", "b"], ["bb"]]},
  {"name": "a palindrome inside", "args": ["xabay"], "out": [["x", "a", "b", "a", "y"], ["x", "aba", "y"]]},
  {"name": "same ends, not a palindrome", "args": ["abca"], "out": [["a", "b", "c", "a"]]},
  {"name": "nested palindromes", "args": ["racecar"], "out": [["r", "a", "c", "e", "c", "a", "r"], ["r", "a", "cec", "a", "r"], ["r", "aceca", "r"], ["racecar"]]}
]
```

```python oracle
class Solution:
    def partition(self, s: str) -> List[List[str]]:
        out = []
        for cuts in product([False, True], repeat=len(s) - 1):  # cut after letter i or not
            pieces, start = [], 0
            for i, cut in enumerate(cuts, start=1):
                if cut:
                    pieces.append(s[start:i])
                    start = i
            pieces.append(s[start:])
            if all(p == p[::-1] for p in pieces):
                out.append(pieces)
        return out
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 5) if size == "small" else rng.randint(5, 10)
    letters = "ab" if size == "small" else "abc"
    return ["".join(rng.choice(letters) for _ in range(n))]
```

```python perf
def perf(rng):
    # 22 different letters: only one way to cut, among 2²¹ sets of cut positions.
    letters = list("abcdefghijklmnopqrstuv")
    rng.shuffle(letters)
    return ["".join(letters)]
```

## Hints

1. Decide the pieces from left to right: the first piece is `s[0:end]` for some `end`, and the rest of the string is a smaller version of the same problem.
2. Only continue with a first piece that is a palindrome. That check prunes every branch that could never lead to an answer.
3. Backtrack on the start position: for each `end` after `start`, if `s[start:end]` is a palindrome, append it, solve from `end`, then pop it. When `start` reaches the end of the string, record the pieces.

## Solution

```python solution time="n · 2^n" space="n"
class Solution:
    def partition(self, s: str) -> List[List[str]]:
        out, path = [], []

        def backtrack(start):  # cut s[start:] into palindromes
            if start == len(s):
                out.append(path[:])
                return
            for end in range(start + 1, len(s) + 1):
                piece = s[start:end]
                if piece == piece[::-1]:  # prune: only palindromes go on
                    path.append(piece)
                    backtrack(end)
                    path.pop()

        backtrack(0)
        return out
```

Every way of cutting is a sequence of choices of where the next piece ends. The palindrome check happens as soon as a piece is chosen, so a branch that starts with a non-palindrome is dropped immediately, together with everything that would have followed it. On a string of all-different letters, that leaves exactly one path.

A string of one repeated letter has 2ⁿ⁻¹ answers, each up to n pieces long, so the worst case is O(n · 2ⁿ), the size of the output. The recursion is at most n deep.

## Alternatives

### Precompute which pieces are palindromes

```python alt time="n · 2^n" space="n²"
class Solution:
    def partition(self, s: str) -> List[List[str]]:
        n = len(s)
        pal = [[False] * n for _ in range(n)]  # pal[i][j]: is s[i:j + 1] a palindrome?
        for i in range(n - 1, -1, -1):
            for j in range(i, n):
                pal[i][j] = s[i] == s[j] and (j - i < 2 or pal[i + 1][j - 1])
        out, path = [], []

        def backtrack(start):
            if start == n:
                out.append(path[:])
                return
            for end in range(start, n):
                if pal[start][end]:
                    path.append(s[start:end + 1])
                    backtrack(end + 1)
                    path.pop()

        backtrack(0)
        return out
```

A piece is a palindrome when its two end letters match and the piece between them is a palindrome. Filling that table once, from the shortest pieces up, makes every later check O(1) instead of O(n). It's a small [[m:dp]] table inside a backtracking search.

## Wrong answers

### Never lets a piece reach the end

```python wrong fails="example" test="Example 1"
class Solution:
    def partition(self, s: str) -> List[List[str]]:
        out, path = [], []

        def backtrack(start):
            if start == len(s):
                out.append(path[:])
                return
            for end in range(start + 1, len(s)):  # should be len(s) + 1
                piece = s[start:end]
                if piece == piece[::-1]:
                    path.append(piece)
                    backtrack(end)
                    path.pop()

        backtrack(0)
        return out
```

`range` stops *before* its end value, so `end` never equals `len(s)` and the last piece of the string is never taken. No path ever reaches the end, and the answer is empty. A slice `s[start:end]` needs `end` to go up to `len(s)` to include the last letter.

### Checks only the two end letters

```python wrong fails="edge" test="same ends, not a palindrome"
class Solution:
    def partition(self, s: str) -> List[List[str]]:
        out, path = [], []

        def backtrack(start):
            if start == len(s):
                out.append(path[:])
                return
            for end in range(start + 1, len(s) + 1):
                piece = s[start:end]
                if piece[0] == piece[-1]:  # matching ends don't make a palindrome
                    path.append(piece)
                    backtrack(end)
                    path.pop()

        backtrack(0)
        return out
```

Matching first and last letters is necessary for a palindrome, but not enough: "abca" starts and ends with a but reads "acba" backwards. Compare the whole piece with its reverse, or check the letters pairwise from both ends.

### Tries every set of cuts, then filters

```python wrong fails="perf"
class Solution:
    def partition(self, s: str) -> List[List[str]]:
        out = []
        for mask in range(1 << (len(s) - 1)):  # bit i set: cut after letter i
            pieces, start = [], 0
            for i in range(1, len(s)):
                if mask >> (i - 1) & 1:
                    pieces.append(s[start:i])
                    start = i
            pieces.append(s[start:])
            if all(p == p[::-1] for p in pieces):
                out.append(pieces)
        return out
```

Every set of cut positions is checked, so nothing is missed, but a string of n letters has 2ⁿ⁻¹ of them however few are valid. For 22 different letters that's about 2 million candidate cuttings for a single answer. Backtracking drops a cutting at its first bad piece.
