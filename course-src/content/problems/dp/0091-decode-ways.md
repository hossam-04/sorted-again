---
id: 91
module: dp
patterns: [one or two digits at a time, counting]
signature: "def numDecodings(self, s: str) -> int"
---

## Task

A message of capital letters was encoded with A = 1, B = 2, …, Z = 26 and the numbers written one after another, with no separators. You get the digits, `s`. Return the number of ways to read them back as letters.

Each letter uses one or two digits. A code can't start with 0: `"06"` is not F, and a lone `"0"` is no letter at all.

## Constraints

- `1 <= len(s) <= 100`
- `s` contains only digits, possibly with leading zeros
- The answer fits in a 32-bit integer

```json examples
[
  {"args": ["123"], "out": 3, "why": "1 2 3 (ABC), 12 3 (LC) and 1 23 (AW)."},
  {"args": ["205"], "out": 1, "why": "The 0 has to pair with the 2 before it: 20 5 (TE). 2 05 isn't allowed, since 05 starts with a zero."},
  {"args": ["30"], "out": 0, "why": "30 is too large to be a letter, and 0 can't stand alone, so the digits can't be read at all."}
]
```

```json edge
[
  {"name": "a single zero", "args": ["0"], "out": 0},
  {"name": "ten", "args": ["10"], "out": 1},
  {"name": "all ones", "args": ["1111"], "out": 5},
  {"name": "twenty-sixes", "args": ["2626"], "out": 4},
  {"name": "two zeros in a row", "args": ["100"], "out": 0},
  {"name": "just over z", "args": ["27"], "out": 1},
  {"name": "a zero in the middle", "args": ["1201234"], "out": 3}
]
```

```python oracle
class Solution:
    def numDecodings(self, s: str) -> int:
        def readings(rest):  # split the rest into valid codes in every possible way
            if not rest:
                return 1
            total = 0
            for size in (1, 2):
                piece = rest[:size]
                if len(piece) == size and piece[0] != "0" and int(piece) <= 26:
                    total += readings(rest[size:])
            return total

        return readings(s)
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 6) if size == "small" else rng.randint(6, 12)
    return ["".join(rng.choice("0112223456") for _ in range(n))]
```

```python perf
def perf(rng):
    # 45 ones: 1,836,311,903 ways to read them.
    return ["1" * 45]
```

## Hints

1. Look at the end of the string. The last letter used either the last digit alone or the last two digits.
2. So the number of ways to read the first i digits is the ways for the first i − 1 (if digit i alone is a letter, 1 to 9) plus the ways for the first i − 2 (if the last two digits form 10 to 26).
3. Start from the empty prefix, which has exactly one reading, and keep only the last two counts.

## Solution

```python solution time="n" space="1"
class Solution:
    def numDecodings(self, s: str) -> int:
        two_back, one_back = 1, (0 if s[0] == "0" else 1)  # ways to read s[:0] and s[:1]
        for i in range(2, len(s) + 1):
            cur = 0
            if s[i - 1] != "0":
                cur += one_back  # the last letter is the single digit s[i - 1]
            if 10 <= int(s[i - 2:i]) <= 26:
                cur += two_back  # the last letter is the two digits s[i - 2:i]
            two_back, one_back = one_back, cur
        return one_back
```

Every reading of the first i digits ends with a one-digit letter or a two-digit letter, so its count is the sum of two earlier counts, each included only when that last piece is valid: a single digit from 1 to 9, or two digits from 10 to 26. The empty prefix has exactly one reading (read nothing), which makes the two-digit case work for the first pair. One pass, O(1) space.

## Alternatives

### Top-down with a cache

```python alt time="n" space="n"
class Solution:
    def numDecodings(self, s: str) -> int:
        @cache
        def ways(i):  # ways to read s[i:]
            if i == len(s):
                return 1
            if s[i] == "0":
                return 0  # no letter starts with 0
            total = ways(i + 1)
            if i + 1 < len(s) and int(s[i:i + 2]) <= 26:
                total += ways(i + 2)
            return total

        return ways(0)
```

The same recurrence read from the front: the first letter takes one digit or two, and the rest is a smaller problem. The cache makes each suffix count once.

## Wrong answers

### Reads a lone 0 as a letter

```python wrong fails="example" test="Example 2"
class Solution:
    def numDecodings(self, s: str) -> int:
        two_back, one_back = 1, 1
        for i in range(2, len(s) + 1):
            cur = one_back  # every single digit counted, 0 included
            if 10 <= int(s[i - 2:i]) <= 26:
                cur += two_back
            two_back, one_back = one_back, cur
        return one_back
```

There's no letter for 0, so a 0 can only be read as the second digit of 10 or 20. Counting it alone adds readings that don't exist: "205" becomes 2 instead of 1.

### Accepts two-digit codes that start with 0

```python wrong fails="example" test="Example 2"
class Solution:
    def numDecodings(self, s: str) -> int:
        two_back, one_back = 1, (0 if s[0] == "0" else 1)
        for i in range(2, len(s) + 1):
            cur = 0
            if s[i - 1] != "0":
                cur += one_back
            if int(s[i - 2:i]) <= 26:  # "05" passes, as 5
                cur += two_back
            two_back, one_back = one_back, cur
        return one_back
```

`int("05")` is 5, which is at most 26, but "05" isn't a valid code: codes don't have leading zeros. The check has to be 10 to 26, not just "at most 26".

### Plain recursion

```python wrong fails="perf"
class Solution:
    def numDecodings(self, s: str) -> int:
        def ways(i):
            if i == len(s):
                return 1
            if s[i] == "0":
                return 0
            total = ways(i + 1)
            if i + 1 < len(s) and int(s[i:i + 2]) <= 26:
                total += ways(i + 2)  # recomputed every time it's reached
            return total

        return ways(0)
```

The recursion is correct, but without remembering results it explores every reading one by one: a string of 45 ones has over 1.8 billion readings, and the calls grow just as fast. Cache `ways`, or count from the bottom up.
