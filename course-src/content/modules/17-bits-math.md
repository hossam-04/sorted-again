---
id: bits-math
title: Bit manipulation and math
kicker: binary · two's complement and Python's integers · single-bit tricks · XOR · digits · matrices
summary: "Some problems are about numbers themselves: their bits, their digits, or a grid of them. The tricks are small and reusable, like clearing the lowest 1 bit, cancelling pairs with XOR or walking a matrix ring by ring. Python adds a twist of its own: its integers never overflow, which changes how several classic answers have to be written."
---

## Binary in a nutshell

A number is stored as bits, its digits in base 2: bit i is worth 2ⁱ, so 1101 is 8 + 4 + 0 + 1 = 13. Python reads and writes binary directly: `0b1101` is 13, `bin(13)` is `'0b1101'`, `format(13, "08b")` pads it to `'00001101'`, and `int("1101", 2)` parses it back.

Six operators work on bits:

| Operator | Meaning | Example (`a = 1100`, `b = 1010`) |
|---|---|---|
| `a & b` | AND: 1 where both bits are 1 | `1000` |
| `a \| b` | OR: 1 where either bit is 1 | `1110` |
| `a ^ b` | XOR: 1 where the bits differ | `0110` |
| `~a` | NOT: flips every bit | `-13` in Python (see below) |
| `a << k` | shifts left: multiplies by 2ᵏ | `a << 1` is `11000` |
| `a >> k` | shifts right: divides by 2ᵏ, rounding down | `a >> 2` is `11` |

```python run title=The_bit_operators
a, b = 0b1100, 0b1010
print(f"a      = {a:05b}  ({a})")
print(f"b      = {b:05b}  ({b})")
print(f"a & b  = {a & b:05b}  both bits are 1")
print(f"a | b  = {a | b:05b}  either bit is 1")
print(f"a ^ b  = {a ^ b:05b}  the bits differ")
print(f"a << 1 = {a << 1:05b}  times 2")
print(f"a >> 2 = {a >> 2:05b}  divided by 4")
```

## Two's complement and Python's integers

Machines store integers in a fixed number of bits, usually 32 or 64. Negative numbers use **two's complement**: the top bit counts as −2³¹ instead of +2³¹, so 32 bits hold −2³¹ to 2³¹ − 1, and −x is `~x + 1` (flip every bit, add one). Arithmetic that leaves the range **overflows**: the extra bits fall off the top and the result wraps around.

Python's integers have no fixed size. They grow as needed, so they never overflow, and a negative number behaves as if it had *infinitely many* 1 bits on its left. Bit operations still follow two's-complement rules, but some of the output looks surprising:

```python run title=Negative_numbers_and_masks
x = -6
print(bin(x))                    # a minus sign and the size, not the stored bits
print(format(x & 0xFF, "08b"))   # the low 8 bits of -6 in two's complement
print(x & 0xFFFFFFFF)            # the same 32 bits read as an unsigned number
print(~5, -5 - 1)                # ~x is always -x - 1
print(-7 >> 1)                   # shifting right rounds down, towards minus infinity

def to_signed32(u):              # read a 32-bit pattern as a signed number
    return u - 2**32 if u >= 2**31 else u

print(to_signed32(0xFFFFFFFA))
```

:::gotcha Overflow: Python integers vs 32-bit answers
Many exercises come from languages where integers are 32 bits. Python never overflows, so code that relies on overflow behaves differently:

- If a problem says "return 0 when the result doesn't fit in 32 bits", Python won't notice on its own. Check the range explicitly, as in [[p:7]].
- If a loop counts on bits falling off the top, it may never end in Python, because a negative number's 1 bits go on forever. Keep 32 bits with a mask, `& 0xFFFFFFFF`, and convert the final pattern back to a signed number, as in [[p:371]].
- Unsigned 32-bit answers, like [[p:190]], need the full 32 positions, leading zeros included: `format(n, "032b")`, not `bin(n)`.
:::

## Single-bit tricks

A handful of one-liners cover most bit problems:

| Goal | Code |
|---|---|
| Test bit i | `(n >> i) & 1` |
| Set bit i | `n \| (1 << i)` |
| Clear bit i | `n & ~(1 << i)` |
| Flip bit i | `n ^ (1 << i)` |
| Clear the lowest 1 bit | `n & (n - 1)` |
| Keep only the lowest 1 bit | `n & -n` |
| Is n a power of two? | `n > 0 and n & (n - 1) == 0` |

The most useful one is `n & (n - 1)`. Subtracting 1 turns the lowest 1 bit into 0 and every 0 below it into 1, and the AND keeps only what the two numbers share, so exactly that lowest 1 bit disappears. Repeating it until n is 0 counts the 1 bits, one round per bit ([[p:191]]):

:::viz bits-kernighan
:::

```python run title=Single_bits
n = 0b10110100
for name, value in [("n", n), ("n - 1", n - 1), ("n & (n - 1)", n & (n - 1)), ("n & -n", n & -n)]:
    print(f"{name:12} {value:08b}")
print("powers of two below 70:", [k for k in range(1, 70) if k & (k - 1) == 0])
```

Bits also make small dynamic programs. In [[p:338]], `i >> 1` is `i` without its last bit, a smaller number whose count is already known, so `count[i] = count[i >> 1] + (i & 1)` fills the whole table in one pass. In [[p:190]], bits move one at a time from the low end of one number to the low end of another, and after 32 moves the order is reversed.

## XOR

XOR has three properties that make it a tool of its own:

- `x ^ x == 0`: a number cancels itself.
- `x ^ 0 == x`: zero changes nothing.
- The order doesn't matter: `a ^ b ^ a == a ^ a ^ b == b`.

So XOR-ing a list in which every value appears twice gives 0, and if one value has no partner, that value is what's left ([[p:136]]). [[p:268]] uses the same idea: XOR all the numbers 0 to n with all the numbers present, and only the missing one has no partner.

```python run title=Pairs_cancel
from functools import reduce
from operator import xor

print(reduce(xor, [6, 3, 9, 3, 6]))  # 9 has no partner

nums = [3, 0, 4, 1]                  # 0 to 4, with one number missing
print(reduce(xor, range(len(nums) + 1)) ^ reduce(xor, nums))
```

XOR is also addition without carries: 1 + 1 gives 0 in that bit. The carries are `a & b`, moved one place left. So `a + b` equals `(a ^ b) + ((a & b) << 1)`, and repeating that until there are no carries left adds two numbers with bit operations alone, which is how [[p:371]] works, and how adder circuits work in hardware.

## Digits

Decimal digits come off the end of a number with `divmod(n, 10)`: the quotient is the number without its last digit, and the remainder is that digit. [[p:7]] builds the reversed number with `result * 10 + digit`, and [[p:202]] adds up the squares of the digits.

:::gotcha Floor division of negative numbers
Python's `//` rounds towards minus infinity, and `%` follows it, so the remainder has the sign of the divisor. In C, Java and JavaScript, integer division rounds towards zero. Digit loops written for those languages break on negative numbers in Python, and can even run forever: `-1 // 10` is −1, not 0. Work with `abs(n)` and put the sign back afterwards.
:::

```python run title=Dividing_negative_numbers
import math

for x in (17, -17):
    print(f"{x:>3} // 10 = {x // 10:>2}    {x:>3} % 10 = {x % 10}")
print("rounded towards zero, as in C:", int(-17 / 10), math.fmod(-17, 10))
```

When numbers get too long for a machine word, they're kept as lists or strings of digits, and the arithmetic is the one from school. [[p:66]] carries from the right: a 9 becomes 0 and passes 1 on. [[p:43]] multiplies digit by digit, and digit i of one number times digit j of the other lands in place `i + j + 1` of the product.

[[p:202]] has a different twist: the sequence of digit sums either reaches 1 or repeats a number, and a repeat means a loop. That's cycle detection, so the tools from linked lists apply: a set of the numbers seen, or the slow and fast walkers of [[p:141]].

## Matrices

Grid exercises are mostly about index arithmetic. Work out where a cell goes, check it on a corner, and the code follows.

- **Rotation** ([[p:48]]). A quarter turn clockwise sends row i, column j to row j, column n − 1 − i. That's a transpose (swap `[i][j]` with `[j][i]`) followed by reversing every row, and both steps work in place.
- **Spiral order** ([[p:54]]). Keep the unvisited part as a rectangle with four boundaries, walk one side at a time and move that boundary inwards. When the rectangle shrinks to a single row or column, check before walking back:

:::viz spiral-walk
:::

- **Marking in place** ([[p:73]]). Instead of extra sets for the rows and columns to clear, store the marks in the grid itself, in its first row and first column, and clear those last. Clearing as you scan fails, because a new 0 looks just like an original one.

When a grid problem builds a new grid, remember the aliasing trap from [[m:arrays]]: `[[0] * n] * m` repeats one row m times. Use `[[0] * n for _ in range(m)]`.

## Counting with a hash map

Geometry exercises often come down to counting. In [[p:2013]], the points are kept in a dictionary from point to number of copies, so a square can be checked with a few lookups. A corner in the query's own column fixes the side length, the two possible squares lie on either side of that column, and multiplying the numbers of copies counts every combination at once.

## Complexity

| Problem | Technique | Time |
|---|---|---|
| Count the 1 bits of n | clear the lowest 1 bit, k times | `O(1)` for 32 bits |
| Count the bits of 0 to n | `count[i >> 1] + (i & 1)` | `O(n)` |
| Single or missing number | XOR everything together | `O(n)` |
| Add without `+` | XOR plus carries, 32-bit mask | `O(1)` for 32 bits |
| Reverse an integer or its bits | digit by digit, bit by bit | `O(1)` for fixed sizes |
| Rotate an n × n matrix | transpose, then mirror | `O(n^2)` |
| Spiral order, set matrix zeroes | boundaries, markers in the grid | `O(m · n)` |
| Multiply two numbers as strings | grade-school multiplication | `O(n · m)` |
| Happy number | cycle detection | `O(log n)` |

:::interview
In Python, say out loud that integers don't overflow, then show you know what would happen in a 32-bit language: mention the mask, or the explicit range check. Knowing `bin`, `int(s, 2)`, `format(n, "032b")` and `n.bit_count()` saves time, but expect to write the bit loop anyway. For matrix questions, trace a 3 × 3 example by hand, check where a corner ends up, and ask whether the change must be in place.
:::

:::work
Bits are everywhere in systems code: Unix file permissions (`rwx` is three bits per user class), feature flags and option sets packed into one integer (Python's `enum.Flag`), IP subnet masks, colours packed as RGBA into 32 bits, checksums and hashes, and bitmap indexes in databases. Fixed-width overflow is a real source of bugs, from date counters to financial totals, so the 32-bit habits from this module pay off whenever Python talks to C, a database column or a binary file format. Matrix walks show up in image processing (rotating a photo is [[p:48]]) and in anything with a grid, from spreadsheets to game boards.
:::

## Quick check

:::quiz
? What does `n & (n - 1)` do?
- [ ] Doubles n
- [x] Clears the lowest 1 bit of n
- [ ] Keeps only the lowest 1 bit of n
> Subtracting 1 flips the lowest 1 bit and the zeros below it; the AND removes exactly that bit. `n & -n` is the one that keeps only the lowest 1 bit.

? Why does XOR-ing every number in a list find the one without a partner?
- [ ] XOR sorts the numbers
- [x] `x ^ x` is 0 and the order doesn't matter, so the pairs cancel and only the single number is left
- [ ] XOR adds the numbers up
> Each pair cancels to 0 wherever its two copies are, and `x ^ 0` is `x`.

? In Python, what is `-17 // 10`?
- [ ] −1
- [x] −2
- [ ] 1
> Python rounds down, towards minus infinity: −1.7 becomes −2. C and Java round towards zero and give −1, which is why digit loops need `abs()` in Python.

? Why does the bit-by-bit addition loop for `a + b` need a mask in Python?
- [ ] Because XOR is slow on large numbers
- [x] Negative numbers have infinitely many 1 bits, so a carry can keep moving left forever
- [ ] Because Python doesn't have a `<<` operator
> On a 32-bit machine, carries fall off the top. In Python there's no top, so `& 0xFFFFFFFF` is needed to make them fall off.

? How do you rotate a square matrix a quarter turn clockwise in place?
- [x] Transpose it, then reverse every row
- [ ] Reverse every row, then reverse every column
- [ ] Transpose it twice
> Transposing sends `[i][j]` to `[j][i]`, and reversing the rows then sends column i to column n − 1 − i, which together is the clockwise turn. Reversing rows and then columns gives a half turn.
:::
