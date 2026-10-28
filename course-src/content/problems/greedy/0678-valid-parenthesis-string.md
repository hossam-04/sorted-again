---
id: 678
module: greedy
patterns: [range of possible open counts]
signature: "def checkValidString(self, s: str) -> bool"
---

## Task

A string `s` holds `(`, `)` and `*`. Each `*` can stand for `(`, for `)`, or for nothing at all. Return `True` if some choice for the stars makes the parentheses balanced: every `(` is closed by a later `)`, and every `)` closes an earlier `(`.

## Constraints

- `1 <= len(s) <= 100_000`
- Every character is `(`, `)` or `*`

```json examples
[
  {"args": ["(*()"], "out": true, "why": "Reading the star as ) gives ()(), which is balanced."},
  {"args": ["**)))"], "out": false, "why": "Two stars can open at most two parentheses, but there are three to close."},
  {"args": ["*("], "out": false, "why": "The ( at the end has nothing after it to close it, whatever the star becomes."}
]
```

```json edge
[
  {"name": "a single star", "args": ["*"], "out": true},
  {"name": "stars close the opens", "args": ["(((***"], "out": true},
  {"name": "a close before anything", "args": [")*"], "out": false},
  {"name": "a star in the middle", "args": ["((*)"], "out": true},
  {"name": "two groups", "args": ["(*)(*)"], "out": true},
  {"name": "the counts match but the order doesn't", "args": ["*)("], "out": false},
  {"name": "a star too late to help", "args": ["())*"], "out": false}
]
```

```python oracle
class Solution:
    def checkValidString(self, s: str) -> bool:
        stars = [i for i, ch in enumerate(s) if ch == "*"]
        for choice in itertools.product("()", repeat=len(stars)):  # try every reading of the stars
            for drop in itertools.product([False, True], repeat=len(stars)):
                t = list(s)
                for i, ch, gone in zip(stars, choice, drop):
                    t[i] = "" if gone else ch
                depth, ok = 0, True
                for ch in "".join(t):
                    depth += 1 if ch == "(" else -1
                    if depth < 0:
                        ok = False
                        break
                if ok and depth == 0:
                    return True
        return False
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 6) if size == "small" else rng.randint(6, 9)
    return ["".join(rng.choice("((**))") for _ in range(n))]
```

```python perf
def perf(rng):
    # 2,000 opens, 1,000 stars and 4,000 closes: impossible, but every reading of the stars looks fine
    # until the closes run out of partners.
    return ["(" * 2_000 + "*" * 1_000 + ")" * 4_000]
```

## Hints

1. Without stars you'd keep one number: how many `(` are still open. With stars, that number isn't fixed: each star could add one, remove one or change nothing.
2. Keep the *range* of possible open counts instead: the lowest and the highest. A `(` raises both, a `)` lowers both, a `*` lowers the low end and raises the high end.
3. If the high end drops below 0, even reading every star as `(` can't keep up: fail. The low end can't go below 0, so clamp it there. At the end, the string can be balanced if 0 is within the range.

## Solution

```python solution time="n" space="1"
class Solution:
    def checkValidString(self, s: str) -> bool:
        lo = hi = 0  # the smallest and largest possible number of open parentheses
        for ch in s:
            if ch == "(":
                lo, hi = lo + 1, hi + 1
            elif ch == ")":
                lo, hi = lo - 1, hi - 1
            else:  # a star: ")" lowers the count, "(" raises it, nothing keeps it
                lo, hi = lo - 1, hi + 1
            if hi < 0:
                return False  # too many ) even if every star were (
            lo = max(lo, 0)  # a negative count is never a valid reading, so drop those choices
        return lo == 0
```

Every way of reading the stars gives one open count at each position, and the possible counts always form a contiguous range, since each star moves a reading by at most one step in either direction. So two numbers, the smallest and the largest possible count, describe all readings at once.

Readings whose count would go negative are invalid, so they're dropped by clamping the low end at 0. If even the largest count goes negative, every reading has failed. At the end, some reading must have exactly 0 open parentheses: that's possible when the low end is 0. One pass: O(n) time, O(1) space.

## Alternatives

### Two passes, one from each end

```python alt time="n" space="1"
class Solution:
    def checkValidString(self, s: str) -> bool:
        balance = 0
        for ch in s:  # left to right, every star as "(": can every ")" be matched?
            balance += -1 if ch == ")" else 1
            if balance < 0:
                return False
        balance = 0
        for ch in reversed(s):  # right to left, every star as ")": can every "(" be matched?
            balance += -1 if ch == "(" else 1
            if balance < 0:
                return False
        return True
```

Reading every star as `(` gives the most help to closing parentheses; if a `)` is still unmatched, nothing works. Symmetrically, reading every star as `)` and scanning from the right checks every `(`. Passing both checks is enough for a valid reading to exist.

## Wrong answers

### Ignores the stars

```python wrong fails="example" test="Example 1"
class Solution:
    def checkValidString(self, s: str) -> bool:
        depth = 0
        for ch in s:
            if ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1  # stars are skipped, as if they were always empty
                if depth < 0:
                    return False
        return depth == 0
```

Treating every star as empty is only one of three choices. In Example 1 the star has to be a `)` for the string to balance.

### Only compares the counts

```python wrong fails="example" test="Example 3"
class Solution:
    def checkValidString(self, s: str) -> bool:
        opens, closes, stars = s.count("("), s.count(")"), s.count("*")
        return opens <= closes + stars and closes <= opens + stars  # but order matters too
```

Having enough stars to cover the difference in counts says nothing about the order. In `*(`, one star could close the single `(`, but the `(` comes last, so nothing after it can close it.

### Lets the low end go negative

```python wrong fails="example" test="Example 3"
class Solution:
    def checkValidString(self, s: str) -> bool:
        lo = hi = 0
        for ch in s:
            if ch == "(":
                lo, hi = lo + 1, hi + 1
            elif ch == ")":
                lo, hi = lo - 1, hi - 1
            else:
                lo, hi = lo - 1, hi + 1
            if hi < 0:
                return False
        return lo <= 0 <= hi  # lo was never clamped at 0
```

Without clamping, the low end keeps counting readings that already went negative, which are invalid. In `*(`, the star read as `)` would close a parenthesis that doesn't exist, yet it lets the low end reach 0 at the end. Clamp the low end at 0 after every step.

### Tries every reading of the stars

```python wrong fails="perf"
class Solution:
    def checkValidString(self, s: str) -> bool:
        def ok(i, depth):  # can s[i:] be read so that everything balances?
            if depth < 0:
                return False
            if i == len(s):
                return depth == 0
            if s[i] == "(":
                return ok(i + 1, depth + 1)
            if s[i] == ")":
                return ok(i + 1, depth - 1)
            return ok(i + 1, depth + 1) or ok(i + 1, depth - 1) or ok(i + 1, depth)  # three readings

        return ok(0, 0)
```

Exploring all three readings of each star is correct, and it stops early when the count goes negative. But a string with k stars has up to 3^k readings: in the test, a thousand stars can all be read many ways before any problem shows up. The range of open counts covers every reading at once.
