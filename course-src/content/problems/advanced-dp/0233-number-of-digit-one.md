---
id: 233
module: advanced-dp
patterns: [digit DP, counting by position]
signature: "def countDigitOne(self, n: int) -> int"
perf_repeat: 500
---

## Task

Write down every whole number from 0 to `n`. Return how many times the digit 1 appears in total: 11 counts twice, 101 twice, 111 three times.

## Constraints

- `0 <= n <= 10**9`

```json examples
[
  {"args": [12], "out": 5, "why": "1, 10 and 12 have one 1 each, and 11 has two: 5 in all."},
  {"args": [9], "out": 1, "why": "Only the number 1 itself."},
  {"args": [100], "out": 21, "why": "1, then 11 in 10 to 19 (11 has two), one each in 21, 31, …, 91, and one in 100."}
]
```

```json edge
[
  {"name": "zero", "args": [0], "out": 0},
  {"name": "one", "args": [1], "out": 1},
  {"name": "just below a power of ten", "args": [999], "out": 300},
  {"name": "a power of ten", "args": [1000], "out": 301},
  {"name": "all ones", "args": [1111], "out": 448},
  {"name": "a six-digit number", "args": [123456], "out": 93553}
]
```

```python oracle
class Solution:
    def countDigitOne(self, n: int) -> int:
        ones, p = 0, 1
        while p <= n:
            high, cur, low = n // (p * 10), n // p % 10, n % p
            ones += high * p + (p if cur > 1 else low + 1 if cur == 1 else 0)
            p *= 10
        return ones
```

```python gen
def gen(rng, size):
    if size == "small":
        return [rng.randint(0, 150)]
    return [rng.choice([rng.randint(0, 10**4), rng.randint(0, 50_000), int("1" * rng.randint(1, 5))])]
```

```python perf
def perf(rng):
    # 999,999,999, asked 500 times.
    return [999_999_999]
```

## Hints

1. Counting by trying every number up to a billion is far too slow. Instead, think about one digit position at a time, or about building the numbers digit by digit.
2. A **digit DP** builds the numbers from 0 to n from the most significant digit down. The state is the position and whether the digits so far are equal to n's (*tight*), which limits the next digit to n's digit; otherwise it can be anything from 0 to 9.
3. For each state, return two numbers: how many ways the remaining positions can be filled, and how many 1s those fillings contain in total. Placing a 1 adds one per way of filling the rest.

## Solution

```python solution time="log n" space="log n"
class Solution:
    def countDigitOne(self, n: int) -> int:
        digits = list(map(int, str(n)))

        @cache
        def fill(pos, tight):  # (how many ways to fill positions pos.., how many 1s they contain)
            if pos == len(digits):
                return 1, 0
            ways = ones = 0
            top = digits[pos] if tight else 9
            for d in range(top + 1):
                w, o = fill(pos + 1, tight and d == top)
                ways += w
                ones += o + (w if d == 1 else 0)  # a 1 here appears once in each of the w fillings
            return ways, ones

        return fill(0, True)[1]
```

Every number from 0 to n is a string of `len(digits)` digits, padded with leading zeros, which add no 1s. Build them left to right: while the prefix equals n's prefix, the next digit can't exceed n's next digit; once it's smaller, every later digit is free. So the state is just `(position, tight)`, two booleans' worth per position, and each state returns how many completions it has and how many 1s they contain.

There are at most 2 × 10 states, each trying up to 10 digits: O(log n) time. The same skeleton counts numbers up to n with any digit property: no repeated digits, digits summing to s, divisible by 7. Add whatever the property needs to the state.

## Alternatives

### Count each position directly

```python alt time="log n" space="1"
class Solution:
    def countDigitOne(self, n: int) -> int:
        ones, p = 0, 1  # p: the place value being counted, 1, 10, 100, ...
        while p <= n:
            high, cur, low = n // (p * 10), n // p % 10, n % p
            ones += high * p  # every full cycle of 10p numbers has p ones in this place
            if cur > 1:
                ones += p      # the current cycle has passed its run of ones
            elif cur == 1:
                ones += low + 1  # the current cycle is part-way through its run of ones
            p *= 10
        return ones
```

For the place with value p, the digit there cycles through 0 to 9 every 10p numbers, and is 1 for p numbers in each cycle. Count the full cycles below n, then the partial one, where the digit of n in that place says whether the run of ones is finished, under way or not started. It's the clever formula, and the digit DP is the systematic way to get there.

## Wrong answers

### Counts numbers that contain a 1

```python wrong fails="example" test="Example 1"
class Solution:
    def countDigitOne(self, n: int) -> int:
        digits = list(map(int, str(n)))

        @cache
        def count(pos, tight, has_one):  # how many numbers contain at least one 1
            if pos == len(digits):
                return 1 if has_one else 0
            top = digits[pos] if tight else 9
            return sum(count(pos + 1, tight and d == top, has_one or d == 1) for d in range(top + 1))

        return count(0, True, False)
```

A digit DP, but for a different question: how many numbers contain at least one 1. 11 has two ones and counts once here, so Example 1 gives 4 instead of 5. Count the 1s themselves, which means carrying the number of completions along with the count.

### Stops one short of n

```python wrong fails="example" test="Example 1"
class Solution:
    def countDigitOne(self, n: int) -> int:
        ones, p = 0, 1
        m = n - 1  # counts the numbers below n, not up to n
        while p <= m:
            high, cur, low = m // (p * 10), m // p % 10, m % p
            ones += high * p + (p if cur > 1 else low + 1 if cur == 1 else 0)
            p *= 10
        return ones
```

The range includes n itself. Counting up to n − 1 loses n's own ones whenever it has any: in Example 1, the 1 in 12. "From 0 to n" ranges are inclusive at both ends, which is why the digit DP starts tight on n's own digits.

### Counts the ones in every number

```python wrong fails="perf"
class Solution:
    def countDigitOne(self, n: int) -> int:
        return sum(str(x).count("1") for x in range(n + 1))  # a billion numbers
```

The definition, typed in. It's fine up to a million or so, but n can be a billion, and the test asks 500 times. Counting by position handles a billion in about ten steps.
