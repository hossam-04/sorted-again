---
id: 190
module: bits-math
patterns: [shift out, shift in]
signature: "def reverseBits(self, n: int) -> int"
perf_repeat: 20000
no_slow_wrong: every approach handles a fixed 32 bits, so none of them is too slow
---

## Task

Treat `n` as a 32-bit number, leading zeros included, and reverse the order of its 32 bits: bit 0 trades places with bit 31, bit 1 with bit 30, and so on. Return the number those reversed bits make.

## Constraints

- `0 <= n <= 2**32 - 1`

```json examples
[
  {"args": [1], "out": 2147483648, "why": "1 is 31 zeros followed by a single 1. Reversed, the 1 comes first: 2³¹ = 2,147,483,648."},
  {"args": [6], "out": 1610612736, "why": "6 is 29 zeros, then 110. Reversed, that's 011 followed by 29 zeros."},
  {"args": [240], "out": 251658240, "why": "240 is 11110000 in its lowest eight bits. Reversed, the four 1 bits move to bits 24 to 27."}
]
```

```json edge
[
  {"name": "zero", "args": [0], "out": 0},
  {"name": "only the top bit", "args": [2147483648], "out": 1},
  {"name": "every bit set", "args": [4294967295], "out": 4294967295},
  {"name": "the same both ways", "args": [2147483649], "out": 2147483649},
  {"name": "alternating bits", "args": [2863311530], "out": 1431655765}
]
```

```python oracle
class Solution:
    def reverseBits(self, n: int) -> int:
        bits = [(n >> i) & 1 for i in range(32)]  # bit 0 first
        return sum(bit << (31 - i) for i, bit in enumerate(bits))  # bit i moves to position 31 - i
```

```python gen
def gen(rng, size):
    if size == "small":
        return [rng.randint(0, 16)]
    return [rng.choice([rng.getrandbits(32), 2 ** rng.randint(0, 31), rng.getrandbits(rng.randint(1, 32))])]
```

```python perf
def perf(rng):
    # A random 32-bit number, reversed 20,000 times.
    return [rng.getrandbits(32)]
```

## Hints

1. The leading zeros count: reversed, 1 becomes 2³¹, not 1.
2. Take bits off the right end of `n` with `n & 1` and `n >>= 1`, and push each one onto the right end of the result with `result << 1`.
3. Do that exactly 32 times, even after `n` reaches 0: the remaining zeros still have to shift the result into place.

## Solution

```python solution time="1" space="1"
class Solution:
    def reverseBits(self, n: int) -> int:
        result = 0
        for _ in range(32):
            result = (result << 1) | (n & 1)  # append n's lowest bit to the result
            n >>= 1                           # and drop it from n
        return result
```

The loop moves bits from one end of `n` to the other end of `result`, like moving a stack of plates one at a time: the bit that leaves `n` first ends up deepest in `result`, which is the most significant position after all 32 shifts. Bit 0 of `n` is shifted 31 more times and lands in position 31, bit 1 in position 30, and so on.

The loop must run all 32 times. Stopping when `n` is 0 would skip the shifts that account for its leading zeros. 32 steps: O(1) time and space.

## Alternatives

### Format, reverse, parse

```python alt time="1" space="1"
class Solution:
    def reverseBits(self, n: int) -> int:
        return int(f"{n:032b}"[::-1], 2)  # 32 binary digits, leading zeros included
```

`032b` formats `n` in binary, padded to 32 digits with leading zeros, and `int(..., 2)` reads the reversed string back. Short and clear; the bit loop is what interviewers usually want to see.

### Swap halves, then quarters, then smaller blocks

```python alt time="1" space="1"
class Solution:
    def reverseBits(self, n: int) -> int:
        n = (n >> 16) | ((n << 16) & 0xFFFFFFFF)             # swap the two 16-bit halves
        n = ((n & 0xFF00FF00) >> 8) | ((n & 0x00FF00FF) << 8)  # swap bytes within each half
        n = ((n & 0xF0F0F0F0) >> 4) | ((n & 0x0F0F0F0F) << 4)  # swap 4-bit groups
        n = ((n & 0xCCCCCCCC) >> 2) | ((n & 0x33333333) << 2)  # swap pairs
        n = ((n & 0xAAAAAAAA) >> 1) | ((n & 0x55555555) << 1)  # swap neighbouring bits
        return n
```

Reversing a block is the same as swapping its two halves and reversing each half. Doing that level by level, with masks that pick out every other block, takes 5 steps for 32 bits. It's how low-level libraries do it, and the answer to the follow-up "what if this is called millions of times?"

## Wrong answers

### Reverses only the digits `bin` shows

```python wrong fails="example" test="Example 1"
class Solution:
    def reverseBits(self, n: int) -> int:
        return int(bin(n)[2:][::-1], 2)  # bin(1) is '0b1': no leading zeros
```

`bin` leaves out leading zeros, so it reverses a shorter string, and the bits land in the wrong positions. For 1 it reverses `"1"` and returns 1 instead of 2,147,483,648. Pad to 32 digits first, with `format(n, "032b")`.

### Shifts once too often

```python wrong fails="example" test="Example 1"
class Solution:
    def reverseBits(self, n: int) -> int:
        result = 0
        for _ in range(32):
            result |= n & 1
            result <<= 1  # shifts after the last bit too
            n >>= 1
        return result
```

Shifting after adding each bit makes 32 shifts for 32 bits, one more than needed, so every bit lands one place too high and the result is twice the right answer: 2³² for Example 1, which doesn't even fit in 32 bits. Shift first, then add the bit.
