---
id: 338
module: bits-math
patterns: [DP over bits, drop the last bit]
signature: "def countBits(self, n: int) -> List[int]"
no_slow_wrong: counting every number's bits from scratch is only a log factor slower and still fast at these sizes, so it's shown as an alternative
---

## Task

Return a list `ans` of length `n + 1` in which `ans[i]` is the number of 1 bits in the binary form of `i`, for every `i` from 0 to `n`.

Aim for O(n) time: reuse the counts you've already computed instead of counting each number from scratch.

## Constraints

- `0 <= n <= 100_000`

```json examples
[
  {"args": [4], "out": [0, 1, 1, 2, 1], "why": "In binary, 0 to 4 are 0, 1, 10, 11 and 100."},
  {"args": [7], "out": [0, 1, 1, 2, 1, 2, 2, 3], "why": "7 is 111, the first number with three 1 bits."},
  {"args": [0], "out": [0], "why": "Only the number 0, which has no 1 bits."}
]
```

```json edge
[
  {"name": "one", "args": [1], "out": [0, 1]},
  {"name": "just below a power of two", "args": [15], "out": [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4]},
  {"name": "a power of two", "args": [16], "out": [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4, 1]}
]
```

```python oracle
class Solution:
    def countBits(self, n: int) -> List[int]:
        return [bin(i).count("1") for i in range(n + 1)]
```

```python gen
def gen(rng, size):
    return [rng.randint(0, 20) if size == "small" else rng.randint(100, 3000)]
```

```python perf
def perf(rng):
    # Every number up to 100,000.
    return [100_000]
```

## Hints

1. Write 0 to 8 in binary. How does the binary form of `i` compare with the binary form of `i // 2`?
2. `i >> 1` is `i` with its last bit removed. It's smaller than `i`, so its count is already in the list.
3. `ans[i] = ans[i >> 1] + (i & 1)`: the count without the last bit, plus the last bit.

## Solution

```python solution time="n" space="1"
class Solution:
    def countBits(self, n: int) -> List[int]:
        ans = [0] * (n + 1)
        for i in range(1, n + 1):
            ans[i] = ans[i >> 1] + (i & 1)  # i without its last bit, plus that bit
        return ans
```

Shifting right by one drops the last bit: 13 is 1101, and `13 >> 1` is 110, which is 6. So 13 has the 1 bits of 6 plus its own last bit. Since `i >> 1` is smaller than `i`, its count is already filled in when the loop reaches `i`, which makes this a tiny dynamic program: each answer is built from an earlier one in O(1).

O(n) time. Apart from the list being returned, the extra space is O(1).

## Alternatives

### Count each number from scratch

```python alt time="n log n" space="1"
class Solution:
    def countBits(self, n: int) -> List[int]:
        ans = []
        for i in range(n + 1):
            count, x = 0, i
            while x:
                x &= x - 1  # clear the lowest 1 bit
                count += 1
            ans.append(count)
        return ans
```

Counting every number on its own takes up to log n steps per number, so O(n log n) in total. That's fine at these sizes, but it ignores the work already done for smaller numbers, which is what the O(n) version exploits.

### Clear the lowest 1 bit

```python alt time="n" space="1"
class Solution:
    def countBits(self, n: int) -> List[int]:
        ans = [0] * (n + 1)
        for i in range(1, n + 1):
            ans[i] = ans[i & (i - 1)] + 1  # i with its lowest 1 bit cleared has one 1 bit fewer
        return ans
```

`i & (i - 1)` removes exactly one 1 bit from `i` and gives a smaller number, so the same idea works with a different smaller number.

## Wrong answers

### Forgets the last bit

```python wrong fails="example" test="Example 1"
class Solution:
    def countBits(self, n: int) -> List[int]:
        ans = [0] * (n + 1)
        for i in range(1, n + 1):
            ans[i] = ans[i >> 1] + 1  # assumes the dropped bit was a 1
        return ans
```

The bit dropped by `i >> 1` is 1 only for odd numbers. For 2, which is 10 in binary, this adds 1 to the count of 1 and gets 2 instead of 1. Add `i & 1`, the bit that was actually dropped.

### Stops before n

```python wrong fails="example" test="Example 1"
class Solution:
    def countBits(self, n: int) -> List[int]:
        ans = [0] * n
        for i in range(1, n):
            ans[i] = ans[i >> 1] + (i & 1)
        return ans
```

The range 0 to n includes both ends, so there are `n + 1` numbers. This list has only `n` entries, so the count for `n` itself is missing, and for `n = 0` the list is empty.
