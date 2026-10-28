---
id: 10
module: dp
patterns: [two-string table, star means zero or more]
signature: "def isMatch(self, s: str, p: str) -> bool"
---

## Task

Decide whether the pattern `p` matches the **whole** string `s`. The pattern has letters, which match themselves, and two special characters:

- `.` matches any single letter;
- `*` matches zero or more copies of the character right before it, so `a*` matches `""`, `"a"`, `"aa"`, … and `.*` matches any string.

## Constraints

- `1 <= len(s), len(p) <= 30`
- `s` holds lowercase letters; `p` holds lowercase letters, `.` and `*`
- Every `*` follows a letter or a `.`

```json examples
[
  {"args": ["xxy", "x*y"], "out": true, "why": "x* takes both x's, then y matches y."},
  {"args": ["abc", "a.c"], "out": true, "why": "The dot stands for the b."},
  {"args": ["ab", "a"], "out": false, "why": "The pattern has to match the whole string, and nothing in it accounts for the b."}
]
```

```json edge
[
  {"name": "a star that takes one copy fewer", "args": ["aaa", "a*a"], "out": true},
  {"name": "a wrong last letter", "args": ["ab", ".*c"], "out": false},
  {"name": "zero copies", "args": ["b", "a*b"], "out": true},
  {"name": "every star used", "args": ["abc", "a*b*c*"], "out": true},
  {"name": "stars that take nothing", "args": ["mm", "m*m*m"], "out": true},
  {"name": "only stars of another letter", "args": ["abcd", "d*"], "out": false},
  {"name": "a single dot", "args": ["x", "."], "out": true}
]
```

```python oracle
class Solution:
    def isMatch(self, s: str, p: str) -> bool:
        return re.fullmatch(p, s) is not None  # Python's own regular expressions agree on . and *
```

```python gen
def gen(rng, size):
    s = "".join(rng.choice("ab") for _ in range(rng.randint(1, 4 if size == "small" else 8)))
    p = ""
    for _ in range(rng.randint(1, 4 if size == "small" else 7)):
        p += rng.choice("ab.")
        if rng.random() < 0.4:
            p += "*"
    return [s, p]
```

```python perf
def perf(rng):
    # 30 a's against a*a*...a*b (14 stars): every way of sharing out the a's is tried before the b fails.
    return ["a" * 30, "a*" * 14 + "b"]
```

## Hints

1. Let `match[i][j]` mean "`s[i:]` matches `p[j:]`". The answer is `match[0][0]`, and two empty suffixes match.
2. If `p[j + 1]` is not a star, then `p[j]` must match `s[i]` (equal letters, or a dot) and the rest must match: `match[i + 1][j + 1]`.
3. If `p[j + 1]` is a star, either skip `p[j]*` entirely (`match[i][j + 2]`, zero copies), or, if `p[j]` matches `s[i]`, use it for one letter and stay on the same star (`match[i + 1][j]`). Fill the table from the ends backwards.

## Solution

```python solution time="n·m" space="n·m"
class Solution:
    def isMatch(self, s: str, p: str) -> bool:
        n, m = len(s), len(p)
        match = [[False] * (m + 1) for _ in range(n + 1)]  # match[i][j]: does p[j:] match s[i:]?
        match[n][m] = True  # empty pattern, empty string
        for i in range(n, -1, -1):
            for j in range(m - 1, -1, -1):
                first = i < n and p[j] in (s[i], ".")  # does p[j] match the next letter of s?
                if j + 1 < m and p[j + 1] == "*":
                    match[i][j] = match[i][j + 2] or (first and match[i + 1][j])  # zero copies, or one more
                else:
                    match[i][j] = first and match[i + 1][j + 1]
        return match[0][0]
```

Each pair of positions asks whether the rest of the pattern matches the rest of the string. A plain letter or dot must match one letter and pass the rest on. A starred character offers two moves: give up on it (zero copies), or let it eat one matching letter while staying on the same star, which is how a star takes any number of copies.

The table runs from the ends backwards, so every cell it reads is already filled. The last row, with the string used up, is still worth filling: patterns like `a*b*` match the empty string. O(n·m) time and space.

## Alternatives

### Top-down with a cache

```python alt time="n·m" space="n·m"
class Solution:
    def isMatch(self, s: str, p: str) -> bool:
        @cache
        def match(i, j):  # does p[j:] match s[i:]?
            if j == len(p):
                return i == len(s)
            first = i < len(s) and p[j] in (s[i], ".")
            if j + 1 < len(p) and p[j + 1] == "*":
                return match(i, j + 2) or (first and match(i + 1, j))
            return first and match(i + 1, j + 1)

        return match(0, 0)
```

The recursion follows the same two choices for a star. Without the cache it can explode, as the last wrong answer shows; with it, each (i, j) pair is decided once.

## Wrong answers

### Treats `*` like a file-name wildcard

```python wrong fails="edge" test="zero copies"
class Solution:
    def isMatch(self, s: str, p: str) -> bool:
        import fnmatch
        return fnmatch.fnmatchcase(s, p.replace(".", "?"))  # in a glob, * alone matches any text
```

In shell wildcards, `*` matches any text on its own, and the letter in front of it is just a letter. Here `*` belongs to the character before it: `a*` is "some number of a's", possibly none. So `a*b` matches `b`, but the glob `a*b` needs an a first.

### Makes a star take at least one copy

```python wrong fails="edge" test="zero copies"
class Solution:
    def isMatch(self, s: str, p: str) -> bool:
        n, m = len(s), len(p)
        match = [[False] * (m + 1) for _ in range(n + 1)]
        match[n][m] = True
        for i in range(n, -1, -1):
            for j in range(m - 1, -1, -1):
                first = i < n and p[j] in (s[i], ".")
                if j + 1 < m and p[j + 1] == "*":
                    match[i][j] = first and (match[i + 1][j] or match[i + 1][j + 2])  # one or more, never zero
                else:
                    match[i][j] = first and match[i + 1][j + 1]
        return match[0][0]
```

`x*` can match zero x's, and that case is easy to lose: here every starred character must match at least one letter. `a*b` then fails on `b`, though skipping `a*` entirely is allowed. Keep the `match[i][j + 2]` option, which needs no letter at all.

### Plain recursion

```python wrong fails="perf"
class Solution:
    def isMatch(self, s: str, p: str) -> bool:
        def match(i, j):
            if j == len(p):
                return i == len(s)
            first = i < len(s) and p[j] in (s[i], ".")
            if j + 1 < len(p) and p[j + 1] == "*":
                return match(i, j + 2) or (first and match(i + 1, j))  # both branches, every time
            return first and match(i + 1, j + 1)

        return match(0, 0)
```

The logic is right, but each star can take any number of letters, and the recursion tries every way to share 30 a's among 14 stars before discovering that the final b can't match. That's billions of attempts. There are only 31 × 31 (i, j) pairs; remember them.
