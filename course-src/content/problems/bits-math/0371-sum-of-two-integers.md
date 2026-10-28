---
id: 371
module: bits-math
patterns: [XOR adds, AND carries, 32-bit mask]
signature: "def getSum(self, a: int, b: int) -> int"
perf_repeat: 2000
no_slow_wrong: one addition needs at most 32 rounds of carries, so there's no natural approach that's correct but too slow
---

## Task

Return `a + b` without using the operators `+` or `-`, or anything else that adds for you, such as `sum`. Build the addition from bit operations.

## Constraints

- `-1000 <= a, b <= 1000`

```json examples
[
  {"args": [4, 9], "out": 13, "why": "Two positive numbers: 100 + 1001 = 1101 in binary."},
  {"args": [-8, 5], "out": -3, "why": "A negative and a positive number whose sum is negative."},
  {"args": [-5, -7], "out": -12, "why": "Two negative numbers."}
]
```

```json edge
[
  {"name": "a negative number, positive sum", "args": [7, -3], "out": 4},
  {"name": "opposites", "args": [-1, 1], "out": 0},
  {"name": "zero and a negative number", "args": [0, -4], "out": -4},
  {"name": "both at the top", "args": [1000, 1000], "out": 2000},
  {"name": "both at the bottom", "args": [-1000, -1000], "out": -2000},
  {"name": "zeros", "args": [0, 0], "out": 0}
]
```

```python oracle
class Solution:
    def getSum(self, a: int, b: int) -> int:
        return a + b
```

```python gen
def gen(rng, size):
    hi = 10 if size == "small" else 1000
    return [rng.randint(-hi, hi), rng.randint(-hi, hi)]
```

```python perf
def perf(rng):
    # -1 + 1: in 32 bits, the carry ripples through every position. Computed 2,000 times.
    return [-1, 1]
```

## Hints

1. Adding two bits while ignoring the carry is XOR: 0 + 1 gives 1, and 1 + 1 gives 0 (carry 1).
2. A carry appears wherever both bits are 1, which is `a & b`, and it belongs one place to the left: `(a & b) << 1`. Add the carries to the XOR in the same way, and repeat until there are no carries left.
3. Python's integers have no fixed width, and a negative number behaves as if it had infinitely many 1 bits on its left, so a carry can travel forever. Keep 32 bits with `& 0xFFFFFFFF`, and turn a final 32-bit pattern with its top bit set back into a negative number.

## Solution

```python solution time="1" space="1"
class Solution:
    def getSum(self, a: int, b: int) -> int:
        mask = 0xFFFFFFFF  # keep 32 bits, like a machine integer
        a, b = a & mask, b & mask
        while b:
            # the sum without carries, and the carries moved to where they're added
            a, b = (a ^ b) & mask, ((a & b) << 1) & mask
        # a 32-bit pattern with the top bit set stands for a negative number
        return a if a < 0x80000000 else ~(a ^ mask)
```

XOR adds bit by bit and ignores carries. The carries come from the positions where both bits are 1, `a & b`, and each one is added one place further left, so the true sum is `(a ^ b)` plus `(a & b) << 1`. That's another addition, done the same way. Every round pushes the carries at least one place left, so after at most 32 rounds there are none, and the XOR alone is the sum.

Python makes one part harder than usual. A negative number such as −3 behaves as if it had infinitely many 1 bits on the left. A carry that runs into those bits never stops: it just keeps moving left. So both numbers are cut to 32 bits with the mask, which makes the arithmetic wrap around like a machine's. The result is a 32-bit pattern in two's complement: if bit 31 is set, the pattern stands for a negative number. `a ^ mask` flips its 32 bits, and `~` then flips every bit, including the infinitely many above, which turns the pattern back into Python's negative number, still without a minus sign. At most 32 rounds: O(1).

## Alternatives

### Bit by bit, like a hardware adder

```python alt time="1" space="1"
class Solution:
    def getSum(self, a: int, b: int) -> int:
        mask = 0xFFFFFFFF
        a, b = a & mask, b & mask
        result = carry = 0
        for i in range(32):
            x, y = (a >> i) & 1, (b >> i) & 1
            result |= (x ^ y ^ carry) << i         # the sum bit at position i
            carry = (x & y) | (carry & (x ^ y))  # carry out of position i
        return result if result < 0x80000000 else ~(result ^ mask)
```

A ripple-carry adder, the circuit inside a processor, works one position at a time: the sum bit is the XOR of the two bits and the incoming carry, and a carry goes out when at least two of the three are 1. This version does exactly that for 32 positions.

## Wrong answers

### Carries without a mask

```python wrong fails="edge" how="timeout" test="a negative number, positive sum"
class Solution:
    def getSum(self, a: int, b: int) -> int:
        while b:
            a, b = a ^ b, (a & b) << 1  # with negative numbers, b can keep growing forever
        return a
```

This is the usual answer in languages with 32-bit integers, where carries fall off the top. Python's integers have no top. For 7 + (−3), the carry reaches the infinitely many 1 bits of −3 and keeps moving left, one place per round, without ever becoming 0, so the loop never ends. With some signs it does stop, which is why Examples 2 and 3 pass. Cut the numbers to 32 bits with a mask so the carries can fall off.

### Masks, but never converts back

```python wrong fails="example" test="Example 2"
class Solution:
    def getSum(self, a: int, b: int) -> int:
        mask = 0xFFFFFFFF
        a, b = a & mask, b & mask
        while b:
            a, b = (a ^ b) & mask, ((a & b) << 1) & mask
        return a  # still a 32-bit pattern
```

The masked loop computes the right 32 bits, but a negative result comes back as its raw pattern. For −8 + 5 that's 4,294,967,293, the 32-bit pattern of −3. When bit 31 is set, convert the pattern back to a negative number.
