---
id: 17
module: backtracking
patterns: [backtracking, one choice per position]
signature: "def letterCombinations(self, digits: str) -> List[str]"
compare: unordered
no_slow_wrong: the answer itself has up to 4ⁿ strings and every approach builds each of them, so there's no natural approach that's much slower
---

## Task

Old phone keypads put letters on the digit keys: 2 is `abc`, 3 is `def`, 4 is `ghi`, 5 is `jkl`, 6 is `mno`, 7 is `pqrs`, 8 is `tuv` and 9 is `wxyz`.

You get a string of digits from 2 to 9. Return every string you can make by choosing one letter for each digit, in the digits' order. The strings can come in any order. For an empty `digits`, return an empty list.

## Constraints

- `0 <= len(digits) <= 8`
- Each digit is between `2` and `9`

```json examples
[
  {"args": ["45"], "out": ["gj", "gk", "gl", "hj", "hk", "hl", "ij", "ik", "il"], "why": "4 offers g, h and i, and 5 offers j, k and l: 3 × 3 = 9 strings."},
  {"args": ["79"], "out": ["pw", "px", "py", "pz", "qw", "qx", "qy", "qz", "rw", "rx", "ry", "rz", "sw", "sx", "sy", "sz"], "why": "7 and 9 have four letters each, so there are 16 strings."},
  {"args": [""], "out": [], "why": "No digits means no strings at all: an empty list, not a list holding an empty string."}
]
```

```json edge
[
  {"name": "one digit", "args": ["8"], "out": ["t", "u", "v"]},
  {"name": "a repeated digit", "args": ["22"], "out": ["aa", "ab", "ac", "ba", "bb", "bc", "ca", "cb", "cc"]},
  {"name": "three digits", "args": ["234"], "out": ["adg", "adh", "adi", "aeg", "aeh", "aei", "afg", "afh", "afi", "bdg", "bdh", "bdi", "beg", "beh", "bei", "bfg", "bfh", "bfi", "cdg", "cdh", "cdi", "ceg", "ceh", "cei", "cfg", "cfh", "cfi"]},
  {"name": "a key with four letters", "args": ["7"], "out": ["p", "q", "r", "s"]}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(0, 3) if size == "small" else rng.randint(3, 5)
    return ["".join(rng.choice("23456789") for _ in range(n))]
```

```python perf
def perf(rng):
    # 8 digits with four letters each: 65,536 strings.
    return ["".join(rng.choice("79") for _ in range(8))]
```

## Hints

1. Each position of the answer string is one independent choice: a letter from that digit's key.
2. Fill the positions from left to right: for each letter of the current digit, append it, fill the rest, then remove it.
3. When the string has one letter per digit, record it. Handle the empty input before starting: with no digits, there's nothing to choose and the answer is `[]`.

## Solution

```python solution time="n · 4^n" space="n"
class Solution:
    def letterCombinations(self, digits: str) -> List[str]:
        if not digits:
            return []
        keys = {"2": "abc", "3": "def", "4": "ghi", "5": "jkl", "6": "mno", "7": "pqrs", "8": "tuv", "9": "wxyz"}
        out, path = [], []

        def backtrack(i):  # choose a letter for digits[i]
            if i == len(digits):
                out.append("".join(path))
                return
            for letter in keys[digits[i]]:
                path.append(letter)
                backtrack(i + 1)
                path.pop()

        backtrack(0)
        return out
```

Every answer string is one path through a tree whose levels are the digits and whose branches are each key's letters. The search walks every path and records it at the bottom. No branch is ever a dead end, so there's nothing to prune: the work is exactly the size of the answer, up to 4ⁿ strings of length n.

## Alternatives

### Grow the strings one digit at a time

```python alt time="n · 4^n" space="n · 4^n"
class Solution:
    def letterCombinations(self, digits: str) -> List[str]:
        if not digits:
            return []
        keys = {"2": "abc", "3": "def", "4": "ghi", "5": "jkl", "6": "mno", "7": "pqrs", "8": "tuv", "9": "wxyz"}
        out = [""]
        for d in digits:
            out = [s + letter for s in out for letter in keys[d]]  # extend every string by every letter
        return out
```

The strings for the first k digits, each extended by every letter of the next digit, are the strings for k + 1 digits. This builds level by level instead of path by path.

### `itertools.product`

```python alt time="n · 4^n" space="n · 4^n" oracle
class Solution:
    def letterCombinations(self, digits: str) -> List[str]:
        keys = {"2": "abc", "3": "def", "4": "ghi", "5": "jkl", "6": "mno", "7": "pqrs", "8": "tuv", "9": "wxyz"}
        if not digits:
            return []
        return ["".join(p) for p in product(*(keys[d] for d in digits))]
```

The answer is the Cartesian product of the keys' letters, which `itertools.product` produces directly.

## Wrong answers

### Returns `[""]` for no digits

```python wrong fails="example" test="Example 3"
class Solution:
    def letterCombinations(self, digits: str) -> List[str]:
        keys = {"2": "abc", "3": "def", "4": "ghi", "5": "jkl", "6": "mno", "7": "pqrs", "8": "tuv", "9": "wxyz"}
        out = [""]
        for d in digits:
            out = [s + letter for s in out for letter in keys[d]]
        return out  # [""] when digits is empty
```

Starting from `[""]` is what makes the level-by-level build work, but when there are no digits that starting value is returned as it is. The task asks for an empty list. Check for empty input first.

### Gives every key three letters

```python wrong fails="example" test="Example 2"
class Solution:
    def letterCombinations(self, digits: str) -> List[str]:
        if not digits:
            return []
        keys = {"2": "abc", "3": "def", "4": "ghi", "5": "jkl", "6": "mno", "7": "pqr", "8": "stu", "9": "vwx"}
        out, path = [], []

        def backtrack(i):
            if i == len(digits):
                out.append("".join(path))
                return
            for letter in keys[digits[i]]:
                path.append(letter)
                backtrack(i + 1)
                path.pop()

        backtrack(0)
        return out
```

The search is right, but the table assumes three letters per key. 7 has four (`pqrs`) and so does 9 (`wxyz`), and every key after 7 is shifted. With "79" this gives 9 strings instead of 16. Lookup tables are worth checking letter by letter.
