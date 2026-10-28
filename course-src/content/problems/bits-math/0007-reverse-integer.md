---
id: 7
module: bits-math
patterns: [digit by digit, overflow check]
signature: "def reverse(self, x: int) -> int"
perf_repeat: 10000
no_slow_wrong: a number in this range has at most 10 digits, so there's no slow way to reverse it
---

## Task

Reverse the decimal digits of `x` and keep its sign: 4096 becomes 6904, and −45 becomes −54. Zeros that would lead the result disappear, so 1200 becomes 21.

The result must fit in a signed 32-bit integer, from −2³¹ to 2³¹ − 1. If the reversed number doesn't, return 0.

For the classic version of this exercise, pretend you're on a machine that can't hold numbers outside that range at all, so you have to detect the overflow *before* it would happen. Python can't overflow, so the tests can't tell the difference, but that's the version interviewers ask about.

## Constraints

- `-2**31 <= x <= 2**31 - 1`

```json examples
[
  {"args": [4096], "out": 6904, "why": "The same digits in reverse order."},
  {"args": [-350], "out": -53, "why": "The sign stays in front, and the 0 that would lead the result disappears."},
  {"args": [1999999999], "out": 0, "why": "Reversed, it would be 9,999,999,991, far more than 2³¹ − 1 = 2,147,483,647."}
]
```

```json edge
[
  {"name": "zero", "args": [0], "out": 0},
  {"name": "a single negative digit", "args": [-7], "out": -7},
  {"name": "trailing zeros", "args": [1000], "out": 1},
  {"name": "just fits", "args": [1463847412], "out": 2147483641},
  {"name": "just too large", "args": [1563847412], "out": 0},
  {"name": "negative, just fits", "args": [-1463847412], "out": -2147483641},
  {"name": "negative, just too small", "args": [-1563847412], "out": 0},
  {"name": "the smallest 32-bit number", "args": [-2147483648], "out": 0}
]
```

```python oracle
class Solution:
    def reverse(self, x: int) -> int:
        r = int(str(abs(x))[::-1])
        r = r if x >= 0 else -r
        return r if -2**31 <= r <= 2**31 - 1 else 0
```

```python gen
def gen(rng, size):
    if size == "small":
        return [rng.randint(-200, 200)]
    while True:
        kind = rng.random()
        if kind < 0.4:
            x = rng.randint(-2**31, 2**31 - 1)
        elif kind < 0.7:
            x = rng.randint(-10**6, 10**6)
        else:  # numbers whose reversal lands near the 32-bit limit
            x = int(str(rng.randint(2_000_000_000, 2_200_000_000))[::-1]) * rng.choice([1, -1])
        if -2**31 <= x <= 2**31 - 1:
            return [x]
```

```python perf
def perf(rng):
    # A ten-digit number whose reversal only just fits, reversed 10,000 times.
    return [-1463847412]
```

## Hints

1. Take digits off the end with `% 10` and `// 10`, and build the result with `result * 10 + digit`.
2. Careful: Python's `//` and `%` round towards minus infinity, so on negative numbers they don't behave like C's. `-7 // 10` is −1, not 0. Work with `abs(x)` and put the sign back at the end.
3. Before computing `result * 10 + digit`, check that it won't pass the limit: up to 2³¹ − 1 for a positive result, and 2³¹ (with the minus sign added later) for a negative one.

## Solution

```python solution time="1" space="1"
class Solution:
    def reverse(self, x: int) -> int:
        limit = 2**31 - 1 if x >= 0 else 2**31  # the largest size allowed for this sign
        n, result = abs(x), 0
        while n:
            n, digit = divmod(n, 10)  # take the last digit off
            if result > (limit - digit) // 10:  # result * 10 + digit would pass the limit
                return 0
            result = result * 10 + digit
        return result if x >= 0 else -result
```

The loop moves digits from the end of `n` to the end of `result`, so they come out in reverse order, and leading zeros vanish on their own: `0 * 10 + 0` is still 0.

The check comes *before* the multiplication. `result * 10 + digit > limit` is the same as `result > (limit − digit) / 10`, and for whole numbers the rounded-down division gives the same answer, so the comparison never computes anything larger than the limit. The two signs have different limits, 2³¹ − 1 and 2³¹, which is why the limit depends on the sign of `x`. At most 10 digits: O(1).

## Alternatives

### Reverse the string

```python alt time="1" space="1"
class Solution:
    def reverse(self, x: int) -> int:
        result = int(str(abs(x))[::-1])  # int() drops the leading zeros
        if result > (2**31 - 1 if x >= 0 else 2**31):
            return 0
        return result if x >= 0 else -result
```

Turning the digits into a string and back is the most Pythonic way. It builds the full reversed number first and checks it afterwards, which is fine in Python but is exactly what the no-overflow version avoids.

## Wrong answers

### Never checks the range

```python wrong fails="example" test="Example 3"
class Solution:
    def reverse(self, x: int) -> int:
        result = int(str(abs(x))[::-1])
        return result if x >= 0 else -result
```

Reversing the digits is the easy part. Python never overflows, so this happily returns 9,999,999,991 for Example 3, but the task asks for 0 whenever the result leaves the 32-bit range.

### Reverses the sign along with the digits

```python wrong fails="example" how="error" test="Example 2"
class Solution:
    def reverse(self, x: int) -> int:
        result = int(str(x)[::-1])  # for -350 that's int("053-")
        return result if -2**31 <= result <= 2**31 - 1 else 0
```

`str(-350)[::-1]` is `"053-"`: the minus sign ends up at the back, and `int` raises a `ValueError`. Reverse the digits of `abs(x)` and put the sign back afterwards.

### Divides a negative number the C way

```python wrong fails="example" how="timeout" test="Example 2"
class Solution:
    def reverse(self, x: int) -> int:
        result = 0
        while x != 0:
            result = result * 10 + x % 10  # in Python, -350 % 10 is 0, but -35 % 10 is 5
            x //= 10                        # and -1 // 10 is -1, forever
        if not -2**31 <= result <= 2**31 - 1:
            return 0
        return result
```

This loop is correct in C, Java or JavaScript, where integer division rounds towards zero. Python's `//` rounds towards minus infinity, so dividing a negative number never reaches 0: once `x` is −1, `-1 // 10` is −1 again and the loop runs forever. `%` is affected too: `-35 % 10` is 5, not −5. Work with `abs(x)`, or use `math.fmod` and `int(x / 10)` if you really need C's behaviour.
