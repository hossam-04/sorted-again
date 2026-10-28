---
id: 459
module: string-matching
patterns: [prefix function, period from the longest border]
signature: "def repeatedSubstringPattern(self, s: str) -> bool"
no_slow_wrong: a block's length must divide len(s), and no length up to 100,000 has more than 128 divisors, so even checking every possible block is fast
---

## Task

Return `True` if `s` can be built by writing some shorter string two or more times in a row, and `False` otherwise.

## Constraints

- `1 <= len(s) <= 100_000`
- Only the letters `a` to `z`

```json examples
[
  {"args": ["xyzxyzxyz"], "out": true, "why": "Three copies of xyz."},
  {"args": ["aab"], "out": false, "why": "A block would have to divide the length, 3, so it could only be one letter, and the letters aren't all the same."},
  {"args": ["aaaa"], "out": true, "why": "a written four times, or aa written twice."}
]
```

```json edge
[
  {"name": "one letter", "args": ["z"], "out": false},
  {"name": "two equal letters", "args": ["zz"], "out": true},
  {"name": "two different letters", "args": ["zy"], "out": false},
  {"name": "almost repeating", "args": ["abababa"], "out": false},
  {"name": "a long block twice", "args": ["abcdefgabcdefg"], "out": true},
  {"name": "a period that doesn't divide the length", "args": ["abcabca"], "out": false}
]
```

```python oracle
class Solution:
    def repeatedSubstringPattern(self, s: str) -> bool:
        n = len(s)
        return any(n % d == 0 and s[:d] * (n // d) == s for d in range(1, n // 2 + 1))
```

```python gen
def gen(rng, size):
    letters = "ab" if rng.random() < 0.6 else "abc"
    if rng.random() < 0.5:
        block = "".join(rng.choice(letters) for _ in range(rng.randint(1, 4 if size == "small" else 30)))
        s = block * rng.randint(1, 4 if size == "small" else 10)
        if rng.random() < 0.3 and len(s) > 1:  # spoil it slightly
            i = rng.randrange(len(s))
            s = s[:i] + rng.choice(letters) + s[i + 1:]
        return [s]
    return ["".join(rng.choice(letters) for _ in range(rng.randint(1, 8 if size == "small" else 300)))]
```

```python perf
def perf(rng):
    # 99,000 letters made of a block of 990, plus a one-letter change at the very end.
    block = "".join(rng.choice("ab") for _ in range(990))
    s = block * 100
    return [s[:-1] + ("a" if s[-1] == "b" else "b")]
```

## Hints

1. If `s` is k copies of a block of length p, then p divides n = `len(s)`, and `s` without its first p letters equals `s` without its last p letters: shifting by p lines the copies up.
2. A string that matches itself shifted by p has a **border** of length n − p: a proper prefix that's also a suffix. The longest border gives the smallest such shift.
3. Compute the prefix function. With b = the longest border of the whole string, the smallest period is p = n − b. The answer is yes exactly when b > 0 and p divides n.

## Solution

```python solution time="n" space="n"
class Solution:
    def repeatedSubstringPattern(self, s: str) -> bool:
        n = len(s)
        pi = [0] * n  # pi[i]: the longest proper border of s[:i + 1]
        k = 0
        for i in range(1, n):
            while k and s[i] != s[k]:
                k = pi[k - 1]
            if s[i] == s[k]:
                k += 1
            pi[i] = k
        border = pi[-1]
        period = n - border  # the smallest shift that lines s up with itself
        return border > 0 and n % period == 0
```

A border of length b means the string matches itself shifted by n − b, so n − b is a **period**: every letter equals the letter n − b positions later. The longest border gives the shortest period p. If p divides n, the string is exactly n / p copies of its first p letters. If p doesn't divide n, no block works: any block would also be a period, and a classic result about periods (Fine and Wilf's theorem) says it would then have to be a multiple of p and divide n, which the shortest period already fails.

The prefix function takes O(n) time and space. The `border > 0` check excludes the trivial "block" that's the whole string.

## Alternatives

### Look for s inside s + s

```python alt time="n" space="n"
class Solution:
    def repeatedSubstringPattern(self, s: str) -> bool:
        return s in (s + s)[1:-1]  # s occurs at some shift strictly between 0 and len(s)
```

`s + s` contains `s` at every shift that's a period of `s`. Cutting off the first and last letter removes the two trivial occurrences, at shifts 0 and n, so `s` is found exactly when some shift strictly in between works, and the smallest such shift turns out to divide n. Python's substring search does the work in C. It's a famous one-liner, and worth knowing why it's right.

### Try every divisor

```python alt time="n · d(n)" space="n"
class Solution:
    def repeatedSubstringPattern(self, s: str) -> bool:
        n = len(s)
        for p in range(1, n // 2 + 1):
            if n % p == 0 and s[:p] * (n // p) == s:
                return True
        return False
```

A block's length must divide n, so try each divisor p up to n / 2, building the repetition and comparing. With d(n) divisors that's O(n · d(n)), and d(n) is small: at most 128 for n up to 100,000. Simple and quick.

## Wrong answers

### Only checks for two halves

```python wrong fails="example" test="Example 1"
class Solution:
    def repeatedSubstringPattern(self, s: str) -> bool:
        half = len(s) // 2
        return len(s) % 2 == 0 and s[:half] == s[half:]  # only two copies
```

Two copies is just one case. In Example 1 the block `xyz` appears three times, and an odd length can't even be split in half.

### Allows a single copy

```python wrong fails="example" test="Example 2"
class Solution:
    def repeatedSubstringPattern(self, s: str) -> bool:
        n = len(s)
        return any(n % p == 0 and s[:p] * (n // p) == s for p in range(1, n + 1))  # p = n always works
```

Every string is one copy of itself, so letting the block be the whole string makes every answer `True`. The block must be shorter: two or more copies.

### Trusts any border

```python wrong fails="edge" test="almost repeating"
class Solution:
    def repeatedSubstringPattern(self, s: str) -> bool:
        n = len(s)
        pi = [0] * n
        k = 0
        for i in range(1, n):
            while k and s[i] != s[k]:
                k = pi[k - 1]
            if s[i] == s[k]:
                k += 1
            pi[i] = k
        return pi[-1] > 0  # a border alone isn't enough
```

A border says the string repeats with some period, but not that the period divides the length. `abababa` has the border `ababa`, so its period is 2, and 7 letters can't be whole copies of a 2-letter block. Check that n − border divides n.
