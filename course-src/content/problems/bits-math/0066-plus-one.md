---
id: 66
module: bits-math
patterns: [carry from the right]
signature: "def plusOne(self, digits: List[int]) -> List[int]"
---

## Task

`digits` holds the decimal digits of a whole number, most significant digit first, with no leading zeros (the number 0 is `[0]`). Add 1 to the number and return its digits in the same form.

## Constraints

- `1 <= len(digits) <= 10_000`
- `0 <= digits[i] <= 9`
- No leading zeros, except for the number 0 itself

```json examples
[
  {"args": [[2, 5, 9]], "out": [2, 6, 0], "why": "259 + 1 = 260: the 9 becomes 0 and carries 1 into the 5."},
  {"args": [[9, 9]], "out": [1, 0, 0], "why": "99 + 1 = 100: the carry runs through every digit, and the result needs one more digit."},
  {"args": [[7]], "out": [8], "why": "No carry at all."}
]
```

```json edge
[
  {"name": "zero", "args": [[0]], "out": [1]},
  {"name": "a nine that isn't last", "args": [[1, 9, 3]], "out": [1, 9, 4]},
  {"name": "nines after a smaller digit", "args": [[3, 9, 9, 9]], "out": [4, 0, 0, 0]},
  {"name": "twelve nines", "args": [[9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9]], "out": [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
  {"name": "ends in zero", "args": [[1, 0]], "out": [1, 1]}
]
```

```python oracle
class Solution:
    def plusOne(self, digits: List[int]) -> List[int]:
        value = 0
        for d in digits:  # build the number itself; Python's integers can be as long as needed
            value = value * 10 + d
        value += 1
        out = []
        while value:
            value, d = divmod(value, 10)
            out.append(d)
        return out[::-1]
```

```python gen
def gen(rng, size):
    if size == "small" and rng.random() < 0.1:
        return [[0]]
    n = rng.randint(1, 3) if size == "small" else rng.randint(4, 30)
    digits = [rng.randint(1, 9)] + [rng.randint(0, 9) for _ in range(n - 1)]
    k = rng.randint(0, n)  # make the last k digits 9s, so the carry has to travel
    for i in range(n - k, n):
        digits[i] = 9
    return [digits]
```

```python perf
def perf(rng):
    # 10,000 digits: a 1 and then 9,999 nines, so the carry runs almost all the way.
    return [[1] + [9] * 9999]
```

## Hints

1. Adding 1 only changes the last digit, unless that digit is 9.
2. A 9 becomes 0 and passes a carry of 1 to the digit on its left, which may be a 9 as well.
3. Walk from the right: turn 9s into 0s until you meet a digit below 9, add 1 to it and stop. If every digit was 9, the answer is a 1 followed by zeros, one digit longer.

## Solution

```python solution time="n" space="1"
class Solution:
    def plusOne(self, digits: List[int]) -> List[int]:
        for i in range(len(digits) - 1, -1, -1):
            if digits[i] < 9:
                digits[i] += 1  # the carry stops here
                return digits
            digits[i] = 0  # 9 + 1 = 10: write 0, carry 1 to the left
        return [1] + digits  # every digit was 9, so the number grows by one digit
```

This is addition as taught in school, with the second number being 1. Walking from the right, a 9 plus a carry becomes 0 and passes the carry on, and the first digit below 9 absorbs it, after which nothing to its left changes. If the carry gets past the leftmost digit, every digit was 9, and the answer is 1 followed by all those zeros.

Most of the time the loop stops at the last digit. In the worst case, a run of 9s, it walks the whole list: O(n) time. Only the all-9s case builds a new list.

## Alternatives

### A general carry loop

```python alt time="n" space="n"
class Solution:
    def plusOne(self, digits: List[int]) -> List[int]:
        out, carry = [], 1  # adding 1 is the same as starting with a carry of 1
        for d in reversed(digits):
            carry, d = divmod(d + carry, 10)
            out.append(d)
        if carry:
            out.append(carry)
        return out[::-1]
```

The same addition written the general way, which also works for adding any two digit lists: each position adds the digits and the carry, keeps the last digit and carries the rest. It always walks every digit and builds a new list, even when the carry stops right away.

## Wrong answers

### Adds 1 without carrying

```python wrong fails="example" test="Example 1"
class Solution:
    def plusOne(self, digits: List[int]) -> List[int]:
        digits[-1] += 1  # a 9 becomes 10, which isn't a digit
        return digits
```

Adding 1 to the last digit is right only when it isn't 9. For 259 this returns `[2, 5, 10]`. A digit that reaches 10 must become 0 and carry 1 to the left.

### Forgets the new first digit

```python wrong fails="example" test="Example 2"
class Solution:
    def plusOne(self, digits: List[int]) -> List[int]:
        for i in range(len(digits) - 1, -1, -1):
            if digits[i] < 9:
                digits[i] += 1
                return digits
            digits[i] = 0
        return digits  # every digit was 9, but the carry is dropped
```

When every digit is 9, the carry passes the leftmost digit and the result needs one more digit. Returning the list as it is turns 99 into `[0, 0]`.

### Converts to an integer and back

```python wrong fails="perf" how="error"
class Solution:
    def plusOne(self, digits: List[int]) -> List[int]:
        number = int("".join(map(str, digits))) + 1  # fails above 4,300 digits
        return [int(d) for d in str(number)]
```

Short, and accepted on LeetCode, where the number has at most 100 digits. Here it can have 10,000, and Python refuses to convert a string of more than 4,300 digits to an integer: it raises a `ValueError`. The limit protects servers from very slow conversions of huge numbers, and it can be raised with `sys.set_int_max_str_digits`. Working on the digits directly needs no conversion at all.
