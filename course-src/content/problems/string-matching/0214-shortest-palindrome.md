---
id: 214
module: string-matching
patterns: [longest palindromic prefix, prefix function on s + separator + reversed s]
signature: "def shortestPalindrome(self, s: str) -> str"
---

## Task

You may add letters to the **front** of `s`, and nowhere else. Return the shortest palindrome you can make that way.

## Constraints

- `0 <= len(s) <= 50_000`
- Only the letters `a` to `z`

```json examples
[
  {"args": ["abacd"], "out": "dcabacd", "why": "aba is the longest start of s that's already a palindrome. Mirroring the rest, cd, in front gives dc + abacd."},
  {"args": ["racecar"], "out": "racecar", "why": "Already a palindrome: nothing to add."},
  {"args": ["xyz"], "out": "zyxyz", "why": "Only x on its own reads the same backwards, so yz is mirrored in front."}
]
```

```json edge
[
  {"name": "empty", "args": [""], "out": ""},
  {"name": "one letter", "args": ["q"], "out": "q"},
  {"name": "all the same", "args": ["bbbb"], "out": "bbbb"},
  {"name": "a palindrome plus one letter", "args": ["abaa"], "out": "aabaa"},
  {"name": "two letters", "args": ["ab"], "out": "bab"},
  {"name": "the longest palindromic start overlaps a shorter one", "args": ["aabaac"], "out": "caabaac"}
]
```

```python oracle
class Solution:
    def shortestPalindrome(self, s: str) -> str:
        for k in range(len(s), -1, -1):
            if s[:k] == s[:k][::-1]:
                return s[k:][::-1] + s
        return s
```

```python gen
def gen(rng, size):
    letters = "ab" if rng.random() < 0.7 else "abc"
    n = rng.randint(0, 8) if size == "small" else rng.randint(20, 300)
    if rng.random() < 0.4 and n:
        half = "".join(rng.choice(letters) for _ in range(rng.randint(1, max(1, n // 2))))
        tail = "".join(rng.choice(letters) for _ in range(rng.randint(0, 4)))
        return [half + half[::-1][rng.randint(0, 1):] + tail]
    return ["".join(rng.choice(letters) for _ in range(n))]
```

```python perf
def perf(rng):
    # 24,999 a's, then "bc", then 25,000 a's: the palindromic start is short, but many longer starts
    # look like palindromes until the middle.
    return ["a" * 24_999 + "bc" + "a" * 25_000]
```

## Hints

1. Whatever you add in front, the original `s` sits at the end of the result. The answer is shortest when the part of `s` you *don't* need to mirror is longest: the longest prefix of `s` that's already a palindrome. Mirror the rest in front.
2. A prefix of `s` is a palindrome exactly when it equals the same-length suffix of `reversed(s)`. So you want the longest prefix of `s` that's also a suffix of `reversed(s)`.
3. That's a border question. Compute the prefix function of `s + "#" + reversed(s)`; the separator stops a border from running past the middle. Its last value is the length of the longest palindromic prefix.

## Solution

```python solution time="n" space="n"
class Solution:
    def shortestPalindrome(self, s: str) -> str:
        t = s + "#" + s[::-1]  # "#" isn't a letter, so no border can cross the middle
        pi = [0] * len(t)
        k = 0
        for i in range(1, len(t)):
            while k and t[i] != t[k]:
                k = pi[k - 1]
            if t[i] == t[k]:
                k += 1
            pi[i] = k
        keep = pi[-1] if t else 0  # the length of the longest palindromic prefix of s
        return s[keep:][::-1] + s
```

The longest border of `s + "#" + reversed(s)` is a prefix of `s` that equals a suffix of `reversed(s)`, which is the same as saying it reads the same backwards. Because `#` appears only once, the border can't be longer than `s`. Everything after that palindromic prefix is mirrored in front, and the result is a palindrome: the mirror, the palindrome, and the part being mirrored.

Nothing shorter is possible, because any palindrome built by adding letters in front has `s` at its end, and what's left of `s` after the added letters' mirror image must be a palindromic prefix. One prefix function over 2n + 1 letters: O(n) time and space.

## Alternatives

### A rolling hash in both directions

```python alt time="n" space="n"
class Solution:
    def shortestPalindrome(self, s: str) -> str:
        base, mod = 131, (1 << 61) - 1
        forward = backward = 0
        power, keep = 1, 0
        for i, ch in enumerate(s):
            forward = (forward * base + ord(ch)) % mod   # the hash of s[:i + 1], read forwards
            backward = (backward + ord(ch) * power) % mod  # the hash of s[:i + 1], read backwards
            power = power * base % mod
            if forward == backward:
                keep = i + 1  # probably a palindrome; confirmed below
        while s[:keep] != s[:keep][::-1]:  # rule out a hash collision
            keep -= 1
        return s[keep:][::-1] + s
```

Keep two hashes of the prefix: one reading it forwards and one reading it backwards, both updatable in O(1) per letter. When they agree, the prefix is almost certainly a palindrome, and the last such prefix is the longest. A final direct check guards against the rare collision. Expected O(n), and a good example of hashing a string in both directions.

## Wrong answers

### Mirrors the whole string

```python wrong fails="example" test="Example 1"
class Solution:
    def shortestPalindrome(self, s: str) -> str:
        return s[::-1] + s  # always a palindrome, rarely the shortest
```

Reversing everything in front always makes a palindrome, but it ignores the part of `s` that's already one. In Example 1 that gives `dcabaabacd`, three letters longer than needed.

### Keeps only the first letter

```python wrong fails="example" test="Example 1"
class Solution:
    def shortestPalindrome(self, s: str) -> str:
        return s[1:][::-1] + s  # assumes only s[0] is a palindromic start
```

A single letter is always a palindrome, so this is valid but usually too long: it mirrors `bacd` in Example 1, while `aba` could have stayed in the middle unmirrored. Find the *longest* palindromic prefix.

### Checks every prefix from the longest down

```python wrong fails="perf"
class Solution:
    def shortestPalindrome(self, s: str) -> str:
        for k in range(len(s), 0, -1):
            i, j = 0, k - 1
            while i < j and s[i] == s[j]:  # two pointers, from both ends of the prefix
                i, j = i + 1, j - 1
            if i >= j:
                return s[k:][::-1] + s
        return s
```

Correct, and quick when a long prefix is a palindrome. In the test the answer is the first 24,999 letters, and every longer prefix matches from both ends almost to the middle before failing: about 300 million comparisons. The prefix function finds the length in one pass.
