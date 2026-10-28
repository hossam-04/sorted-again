---
id: 125
module: two-pointers
patterns: [converging pointers, skip non-alphanumerics]
signature: "def isPalindrome(self, s: str) -> bool"
---

## Task

You get a string `s` of printable ASCII characters. Ignore every character that is not a letter or a digit, and treat uppercase and lowercase letters as the same. Return `True` if the characters that remain read the same from left to right as from right to left, and `False` otherwise.

If nothing remains, return `True`: an empty string reads the same both ways.

## Constraints

- `1 <= len(s) <= 1_000_000`
- `s` contains printable ASCII characters only

```json examples
[
  {"args": ["Step on no pets!"], "out": true, "why": "Keeping letters only gives \"steponnopets\", which is the same reversed."},
  {"args": ["Code, then nap."], "out": false, "why": "The cleaned string \"codethennap\" starts with c but ends with p."},
  {"args": ["?! ."], "out": true, "why": "No letters or digits remain, and an empty string is a palindrome."}
]
```

```json edge
[
  {"name": "one character", "args": ["x"], "out": true},
  {"name": "a letter and a digit", "args": ["0P"], "out": false},
  {"name": "case differs", "args": ["AbBa"], "out": true},
  {"name": "digits count", "args": ["1a2"], "out": false},
  {"name": "a digit palindrome", "args": ["12:21"], "out": true},
  {"name": "only symbols and spaces", "args": [" .,;: "], "out": true},
  {"name": "two different letters", "args": ["ab"], "out": false},
  {"name": "symbols at both ends", "args": ["!!racecar!!?"], "out": true},
  {"name": "mismatch in the middle", "args": ["abcxba"], "out": false}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 12) if size == "small" else rng.randint(20, 300)
    alnum = "abcAB019"
    junk = " ,.!?:-'"
    if rng.random() < 0.5:
        half = [rng.choice(alnum) for _ in range(n // 2)]
        core = half + ([rng.choice(alnum)] if n % 2 else []) + half[::-1]
        core = [c.swapcase() if rng.random() < 0.3 else c for c in core]
    else:
        core = [rng.choice(alnum) for _ in range(n)]
    out = []
    for c in core:
        while rng.random() < 0.25:
            out.append(rng.choice(junk))
        out.append(c)
    return ["".join(out)]
```

```python perf
def perf(rng):
    # A long palindrome with mixed case and symbols, so every pair has to be compared.
    alnum = "abcdefghijklmnopqrstuvwxyz0123456789"
    half = [rng.choice(alnum) for _ in range(300_000)]
    out = []
    for c in half + half[::-1]:
        if rng.random() < 0.3:
            out.append(rng.choice(" ,.!?"))
        out.append(c.upper() if rng.random() < 0.5 else c)
    return ["".join(out)]
```

## Hints

1. Compare characters from both ends and move inward.
2. `ch.isalnum()` tells you whether to look at a character at all, and `ch.lower()` makes the comparison ignore case.
3. Before comparing, move each pointer past any symbols. Stop when the pointers meet.

## Solution

```python solution time="n" space="1"
class Solution:
    def isPalindrome(self, s: str) -> bool:
        l, r = 0, len(s) - 1
        while l < r:
            if not s[l].isalnum():
                l += 1
            elif not s[r].isalnum():
                r -= 1
            elif s[l].lower() != s[r].lower():
                return False
            else:
                l += 1
                r -= 1
        return True
```

Both pointers skip anything that is not a letter or digit. When both stand on a letter or digit, they hold mirror positions of the cleaned string, so they must match once case is ignored. Every step moves at least one pointer, so the loop runs at most n times, and the only extra memory is two indices.

## Alternatives

### Clean the string, then compare it with its reverse

```python alt time="n" space="n" oracle
class Solution:
    def isPalindrome(self, s: str) -> bool:
        cleaned = [c.lower() for c in s if c.isalnum()]
        return cleaned == cleaned[::-1]
```

The most readable version, and fast in practice because the reversing and comparing happen in C. It builds a cleaned copy, so it uses O(n) extra memory. If the interviewer asks for O(1) extra space, switch to the two pointers.

## Wrong answers

### Ignores the case rule

```python wrong fails="example" test="Example 1"
class Solution:
    def isPalindrome(self, s: str) -> bool:
        l, r = 0, len(s) - 1
        while l < r:
            if not s[l].isalnum():
                l += 1
            elif not s[r].isalnum():
                r -= 1
            elif s[l] != s[r]:  # "S" and "s" count as different here
                return False
            else:
                l += 1
                r -= 1
        return True
```

Uppercase and lowercase letters must count as equal. In "Step on no pets!" the first letter is S and the last is s, so this version says no.

### Keeps only letters

```python wrong fails="edge" test="a letter and a digit"
class Solution:
    def isPalindrome(self, s: str) -> bool:
        cleaned = [c.lower() for c in s if c.isalpha()]  # drops the digits
        return cleaned == cleaned[::-1]
```

Digits count too. `isalpha()` throws them away, so "0P" shrinks to "p" and looks like a palindrome.

### Checks the pairs with recursion

```python wrong fails="perf" how="error"
class Solution:
    def isPalindrome(self, s: str) -> bool:
        t = [c.lower() for c in s if c.isalnum()]

        def check(l, r):
            if l >= r:
                return True
            return t[l] == t[r] and check(l + 1, r - 1)  # one nested call per pair

        return check(0, len(t) - 1)
```

The logic is right and it passes every small test. But it makes one nested call per pair of characters, and the performance test has about 300,000 pairs. Python stops runaway recursion with a `RecursionError` long before that (here at 100,000 calls; plain Python stops at 1,000). Loops have no such limit.

## Notes

The same two-pointer walk works on any sequence, not only strings: a linked list copied into an array, a list of tokens, a row of a grid. A common follow-up is "valid palindrome if you may delete at most one character": when the pointers find a mismatch, check whether skipping the left character or the right one leaves a palindrome.
