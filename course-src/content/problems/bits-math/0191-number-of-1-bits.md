---
id: 191
module: bits-math
patterns: [n & (n - 1), shift and test]
signature: "def hammingWeight(self, n: int) -> int"
perf_repeat: 20000
no_slow_wrong: every approach looks at no more than 32 bits, so none of them is too slow
---

## Task

Return how many bits are 1 in the binary form of `n`. This count is also called the population count, or the Hamming weight.

## Constraints

- `0 <= n <= 2**32 - 1`

```json examples
[
  {"args": [13], "out": 3, "why": "13 is 1101 in binary: three 1 bits."},
  {"args": [96], "out": 2, "why": "96 is 1100000 in binary: two 1 bits."},
  {"args": [255], "out": 8, "why": "255 is 11111111: the lowest eight bits are all 1."}
]
```

```json edge
[
  {"name": "zero", "args": [0], "out": 0},
  {"name": "only the top bit", "args": [2147483648], "out": 1},
  {"name": "every bit set", "args": [4294967295], "out": 32},
  {"name": "alternating bits", "args": [2863311530], "out": 16},
  {"name": "one", "args": [1], "out": 1}
]
```

```python oracle
class Solution:
    def hammingWeight(self, n: int) -> int:
        return bin(n).count("1")
```

```python gen
def gen(rng, size):
    if size == "small":
        return [rng.randint(0, 16)]
    return [rng.choice([rng.getrandbits(32), rng.getrandbits(rng.randint(1, 32)), 2 ** rng.randint(0, 31)])]
```

```python perf
def perf(rng):
    # All 32 bits set, counted 20,000 times.
    return [2**32 - 1]
```

## Hints

1. `n & 1` is the lowest bit of n, and `n >> 1` drops that bit. That's enough for a loop over all the bits.
2. For something neater: what does subtracting 1 do to the lowest 1 bit of n, and to the 0 bits below it?
3. `n & (n - 1)` is n with its lowest 1 bit cleared. Count how many times you can do that before n reaches 0.

## Solution

```python solution time="1" space="1"
class Solution:
    def hammingWeight(self, n: int) -> int:
        count = 0
        while n:
            n &= n - 1  # clear the lowest 1 bit
            count += 1
        return count
```

Subtracting 1 turns the lowest 1 bit of n into 0 and every 0 below it into 1, while the bits above stay the same. For example, 1100 − 1 = 1011. AND-ing the two keeps only the bits that are 1 in both: everything above is kept, and the lowest 1 bit is gone (1100 & 1011 = 1000). So each round removes exactly one 1 bit, and the loop runs once per 1 bit. This trick is usually credited to Brian Kernighan.

With at most 32 bits, that's at most 32 rounds: O(1) time and space for these inputs, or O(k) for k one bits in general.

## Alternatives

### Test the bits one at a time

```python alt time="1" space="1"
class Solution:
    def hammingWeight(self, n: int) -> int:
        count = 0
        while n:
            count += n & 1  # the lowest bit
            n >>= 1         # drop it
        return count
```

Look at the lowest bit, then shift it away. The loop runs once per bit up to the highest 1, so up to 32 times even when n has few 1 bits.

### Ask Python

```python alt time="1" space="1"
class Solution:
    def hammingWeight(self, n: int) -> int:
        return n.bit_count()  # Python 3.10 and later; bin(n).count("1") also works
```

Python's integers can count their own bits. In an interview, mention it, then show one of the loops, which is what the question is really about.

## Wrong answers

### Checks only 31 bits

```python wrong fails="edge" test="only the top bit"
class Solution:
    def hammingWeight(self, n: int) -> int:
        count = 0
        for i in range(31):  # as if the top bit were a sign bit
            count += (n >> i) & 1
        return count
```

Here n can use all 32 bits, but the loop stops at bit 30. So 2,147,483,648, which is 1 followed by 31 zeros, reports no 1 bits at all. A fixed loop needs `range(32)`; `while n` avoids choosing a width.

### Stops one bit early

```python wrong fails="example" test="Example 1"
class Solution:
    def hammingWeight(self, n: int) -> int:
        count = 0
        while n > 1:  # stops while one bit is still left
            count += n & 1
            n >>= 1
        return count
```

When n gets down to 1, that remaining 1 is the highest bit of the original number, and it still has to be counted. For 13 (1101) this counts the two lower 1 bits and stops before the last one, returning 2. The loop must run `while n`, that is, while n is not 0.
