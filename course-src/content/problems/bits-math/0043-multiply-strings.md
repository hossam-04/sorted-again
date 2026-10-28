---
id: 43
module: bits-math
patterns: [grade-school multiplication, digit positions]
signature: "def multiply(self, num1: str, num2: str) -> str"
no_slow_wrong: digit-by-digit multiplication is already the natural approach, and building the rows separately is only a constant factor slower
---

## Task

`num1` and `num2` are whole numbers written as strings of decimal digits. Return their product, also as a string.

Don't turn a whole input into an integer with `int()` or anything similar: multiply digit by digit, as on paper. Converting a single digit is fine.

## Constraints

- `1 <= len(num1), len(num2) <= 500`
- Both strings hold only digits
- No leading zeros, except for the number 0 itself, `"0"`

```json examples
[
  {"args": ["25", "4"], "out": "100", "why": "4 × 5 = 20 leaves 0 and carries 2; 4 × 2 + 2 = 10 leaves 0 and carries 1 into a new digit."},
  {"args": ["99", "99"], "out": "9801", "why": "The product of a 2-digit and a 2-digit number has at most 4 digits, and here it uses all of them."},
  {"args": ["0", "381"], "out": "0", "why": "Anything times 0 is 0, written as a single \"0\"."}
]
```

```json edge
[
  {"name": "times one", "args": ["1", "8765"], "out": "8765"},
  {"name": "zero times zero", "args": ["0", "0"], "out": "0"},
  {"name": "zero second", "args": ["4321", "0"], "out": "0"},
  {"name": "all nines", "args": ["999", "999"], "out": "998001"},
  {"name": "a power of ten", "args": ["1000", "50"], "out": "50000"},
  {"name": "long times short", "args": ["123456789", "8"], "out": "987654312"},
  {"name": "no carry into the extra digit", "args": ["50", "20"], "out": "1000"}
]
```

```python oracle
class Solution:
    def multiply(self, num1: str, num2: str) -> str:
        return str(int(num1) * int(num2))  # exactly what the task forbids, which makes it a good check
```

```python gen
def gen(rng, size):
    def number(k):
        if k == 0:
            return "0"
        pool = "9" if rng.random() < 0.2 else "0123456789"  # all nines make long carries
        return rng.choice("123456789" if pool != "9" else "9") + "".join(rng.choice(pool) for _ in range(k - 1))
    if size == "small":
        return [number(rng.randint(0, 2)), number(rng.randint(0, 2))]
    return [number(rng.randint(1, 25)), number(rng.randint(1, 25))]
```

```python perf
def perf(rng):
    # Two random 500-digit numbers.
    def number(k):
        return rng.choice("123456789") + "".join(rng.choice("0123456789") for _ in range(k - 1))
    return [number(500), number(500)]
```

## Hints

1. Multiply as on paper: every digit of one number times every digit of the other, each product added in at the right place.
2. The product of an n-digit and an m-digit number has at most n + m digits. Counting from the left, digit i of `num1` times digit j of `num2` lands at position i + j + 1 of those n + m places.
3. Add each digit product into its place, keep the last digit there and carry the rest one place to the left. At the end, drop the leading zeros, but return `"0"` if nothing is left.

## Solution

```python solution time="n·m" space="n + m"
class Solution:
    def multiply(self, num1: str, num2: str) -> str:
        if num1 == "0" or num2 == "0":
            return "0"
        n, m = len(num1), len(num2)
        result = [0] * (n + m)  # the product has at most n + m digits
        for i in range(n - 1, -1, -1):
            for j in range(m - 1, -1, -1):
                total = result[i + j + 1] + int(num1[i]) * int(num2[j])
                result[i + j + 1] = total % 10  # keep one digit here
                result[i + j] += total // 10    # carry the rest one place left
        return "".join(map(str, result)).lstrip("0")
```

Digit i of `num1`, counted from the left, is worth 10 to the power n − 1 − i, and digit j of `num2` is worth 10 to the power m − 1 − j. Their product is worth 10 to the sum of those two powers, and in a list of n + m places whose last place holds the ones, that power of ten sits at index i + j + 1. So every pair of digits knows exactly where its product goes.

Each step adds a product into its place, leaves one digit there and pushes the carry one place left, where a later step picks it up. Because the loops run from the right, every place has collected all its carries by the time it's finally written. The first place stays 0 when the product has fewer than n + m digits, which is why leading zeros are stripped at the end; the zero check at the top keeps a product of 0 from being stripped to an empty string. n · m digit products: O(n·m) time, O(n + m) space.

## Alternatives

### One row per digit, then add the rows

```python alt time="n·m" space="n + m"
class Solution:
    def multiply(self, num1: str, num2: str) -> str:
        a = [int(ch) for ch in reversed(num1)]  # least significant digit first
        total = [0] * (len(num1) + len(num2))
        for shift, ch in enumerate(reversed(num2)):
            d, carry = int(ch), 0
            for k, x in enumerate(a):  # add num1 × d, shifted by `shift` places
                carry, total[shift + k] = divmod(total[shift + k] + x * d + carry, 10)
            k = shift + len(a)
            while carry:  # the carry out of the row
                carry, total[k] = divmod(total[k] + carry, 10)
                k += 1
        digits = "".join(map(str, reversed(total))).lstrip("0")
        return digits or "0"
```

This is long multiplication exactly as written on paper: one row for each digit of `num2`, shifted one place further left each time, added into a running total. Storing the digits least significant first makes the shifts simple indices. It's the same O(n·m) work as the solution, organised row by row.

## Wrong answers

### Keeps the leading zero

```python wrong fails="edge" test="times one"
class Solution:
    def multiply(self, num1: str, num2: str) -> str:
        if num1 == "0" or num2 == "0":
            return "0"
        n, m = len(num1), len(num2)
        result = [0] * (n + m)
        for i in range(n - 1, -1, -1):
            for j in range(m - 1, -1, -1):
                total = result[i + j + 1] + int(num1[i]) * int(num2[j])
                result[i + j + 1] = total % 10
                result[i + j] += total // 10
        return "".join(map(str, result))  # the first place may still be 0
```

The list has room for n + m digits, but the product often needs one fewer, and then the first place stays 0. All three examples happen to fill every place, but "1" × "8765" comes out as `"08765"`. Strip leading zeros before returning.

### Strips every zero, even the answer 0

```python wrong fails="example" test="Example 3"
class Solution:
    def multiply(self, num1: str, num2: str) -> str:
        n, m = len(num1), len(num2)
        result = [0] * (n + m)
        for i in range(n - 1, -1, -1):
            for j in range(m - 1, -1, -1):
                total = result[i + j + 1] + int(num1[i]) * int(num2[j])
                result[i + j + 1] = total % 10
                result[i + j] += total // 10
        return "".join(map(str, result)).lstrip("0")  # "000..." becomes ""
```

When the product is 0, every place is 0, and stripping the leading zeros leaves an empty string instead of `"0"`. Handle a zero factor first, or return `"0"` when nothing is left after stripping.

### Never carries

```python wrong fails="example" test="Example 1"
class Solution:
    def multiply(self, num1: str, num2: str) -> str:
        if num1 == "0" or num2 == "0":
            return "0"
        n, m = len(num1), len(num2)
        result = [0] * (n + m)
        for i in range(n):
            for j in range(m):
                result[i + j + 1] += int(num1[i]) * int(num2[j])  # places can hold 81 or more
        return "".join(map(str, result)).lstrip("0")
```

The products land in the right places, but a place can collect much more than 9: in Example 1, the last place gets 20. Writing each place out as-is glues multi-digit numbers together, so "25" × "4" gives `"820"`. Each place has to keep one digit and carry the rest to the left.
