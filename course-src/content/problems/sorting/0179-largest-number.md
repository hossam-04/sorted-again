---
id: 179
module: sorting
patterns: [custom comparison, cmp_to_key, exchange argument]
signature: "def largestNumber(self, nums: List[int]) -> str"
---

## Task

You get a list of non-negative whole numbers. Arrange them in a row, written side by side, so that together they form the **largest possible number**, and return that number as a string.

The answer can be far too long for any integer type, which is why it's a string. It must not have leading zeros: if every number is 0, the answer is `"0"`.

## Constraints

- `1 <= len(nums) <= 10_000`
- `0 <= nums[i] <= 10**9`

```json examples
[
  {"args": [[50, 2, 1, 9]], "out": "95021", "why": "9 goes first, then 50, 2 and 1. Sorting the numbers by size would put 50 before 9 and give 50921, which is smaller."},
  {"args": [[12, 121]], "out": "12121", "why": "12 followed by 121 gives 12121, while 121 followed by 12 gives 12112. Comparing the strings \"12\" and \"121\" alone gets this wrong."},
  {"args": [[0, 0, 0]], "out": "0", "why": "Written side by side they make 000, which is the number 0."}
]
```

```json edge
[
  {"name": "a single zero", "args": [[0]], "out": "0"},
  {"name": "zero and a digit", "args": [[0, 5]], "out": "50"},
  {"name": "a prefix that should go first", "args": [[8, 89]], "out": "898"},
  {"name": "a prefix that should go last", "args": [[824, 8247]], "out": "8248247"},
  {"name": "the same digit repeated", "args": [[111, 11, 1]], "out": "111111"},
  {"name": "the largest value", "args": [[1000000000, 9]], "out": "91000000000"},
  {"name": "one number", "args": [[407]], "out": "407"}
]
```

```python oracle
from itertools import permutations

class Solution:
    def largestNumber(self, nums: List[int]) -> str:
        best = max("".join(map(str, p)) for p in permutations(nums))  # same length, so string order is number order
        return best.lstrip("0") or "0"
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 4) if size == "small" else rng.randint(5, 7)
    # Numbers that share prefixes are where the ordering gets tricky.
    pool = [0, 1, 3, 9, 10, 12, 121, 3, 30, 34, 303, 330, 8, 89, 824, 8247, 99, 909, 1000000000]
    return [[rng.choice(pool) if rng.random() < 0.7 else rng.randint(0, 999) for _ in range(n)]]
```

```python perf
def perf(rng):
    # 10,000 numbers, many of them sharing their first digits.
    return [[rng.choice([rng.randint(0, 99), rng.randint(0, 10**9)]) for _ in range(10_000)]]
```

## Hints

1. Comparing the numbers by size doesn't work, and neither does comparing them as strings: think about `12` and `121`.
2. For two numbers `a` and `b`, the only question is which goes first. Compare the strings `a + b` and `b + a`.
3. That comparison is consistent, so you can sort with it: `functools.cmp_to_key` turns a comparison function into a key. Then handle the all-zeros case.

## Solution

```python solution time="n log n" space="n"
from functools import cmp_to_key

class Solution:
    def largestNumber(self, nums: List[int]) -> str:
        def first(a, b):  # negative when a should come before b
            if a + b > b + a:
                return -1
            return 1 if a + b < b + a else 0
        digits = sorted(map(str, nums), key=cmp_to_key(first))
        return "".join(digits).lstrip("0") or "0"
```

If two neighbours `a` and `b` in the answer had `b + a > a + b`, swapping them would make the whole number larger, because the digits before and after them don't change. So in the best arrangement, every neighbouring pair is in "`a + b` ≥ `b + a`" order, and sorting by that comparison produces it. This rule is transitive, so the comparison is a proper ordering and the sort is valid.

The sort makes O(n log n) comparisons. Each joins two strings of at most 10 digits, so that's a constant amount of work. If the largest number is 0, every number is 0, and the answer is `"0"`, not a row of zeros.

## Alternatives

### Repeat each string to compare it with a plain key

```python alt time="n log n" space="n"
class Solution:
    def largestNumber(self, nums: List[int]) -> str:
        digits = sorted(map(str, nums), key=lambda s: s * 20, reverse=True)
        return "".join(digits).lstrip("0") or "0"
```

Comparing `a + b` with `b + a` gives the same answer as comparing `a` repeated forever with `b` repeated forever. Two such repetitions that agree on their first `len(a) + len(b)` characters agree everywhere. Every number here has at most 10 digits, so 20 copies are enough to decide. The result is an ordinary key, which is faster than `cmp_to_key`, but it depends on that bound and needs the argument to be trusted.

## Wrong answers

### Sorts the strings from largest to smallest

```python wrong fails="example" test="Example 2"
class Solution:
    def largestNumber(self, nums: List[int]) -> str:
        digits = sorted(map(str, nums), reverse=True)
        return "".join(digits).lstrip("0") or "0"
```

String order gets most cases right: `"9"` comes before `"50"`. It fails when one number is a prefix of the other. `"121" > "12"`, so 121 goes first and gives 12112, but 12 first gives 12121. Only comparing both concatenations settles which order is better.

### Keeps the leading zeros

```python wrong fails="example" test="Example 3"
from functools import cmp_to_key

class Solution:
    def largestNumber(self, nums: List[int]) -> str:
        def first(a, b):
            if a + b > b + a:
                return -1
            return 1 if a + b < b + a else 0
        return "".join(sorted(map(str, nums), key=cmp_to_key(first)))  # "000" for [0, 0, 0]
```

The order is right, but when every number is 0, the result is `"000"`, which isn't how the number 0 is written. A zero can only lead when everything is zero, so stripping the leading zeros, or checking whether the first digit is `"0"`, fixes it.

### Picks the best remaining number again and again

```python wrong fails="perf"
class Solution:
    def largestNumber(self, nums: List[int]) -> str:
        left, out = list(map(str, nums)), []
        while left:
            best = 0
            for i in range(1, len(left)):  # scan everything that's left
                if left[i] + left[best] > left[best] + left[i]:
                    best = i
            out.append(left.pop(best))
        return "".join(out).lstrip("0") or "0"
```

It uses the right comparison, as a selection sort: find the number that should go first, take it, repeat. Each choice scans all the remaining numbers, so 10,000 numbers take about 50 million string comparisons, each joining two pairs of strings. A sort gets the same order with about 130,000.
