---
id: 136
module: bits-math
patterns: [XOR cancels pairs]
signature: "def singleNumber(self, nums: List[int]) -> int"
---

## Task

In `nums`, every number appears exactly twice except one, which appears once. Return that number.

Aim for O(n) time and O(1) extra memory, so no set or dictionary of the numbers seen so far.

## Constraints

- `1 <= len(nums) <= 100_000`
- `-30_000 <= nums[i] <= 30_000`
- Exactly one number appears once; every other number appears exactly twice

```json examples
[
  {"args": [[7, 3, 7]], "out": 3, "why": "7 appears twice and 3 appears once."},
  {"args": [[5, -2, 9, -2, 9]], "out": 5, "why": "-2 and 9 each appear twice, which leaves 5. Negative numbers are no different."},
  {"args": [[0, 8, 8]], "out": 0, "why": "The number that appears once can be 0."}
]
```

```json edge
[
  {"name": "the single number is the largest", "args": [[3, 10, 1, 3, 1]], "out": 10},
  {"name": "the single number is the smallest", "args": [[3, 1, 3, -8, 1]], "out": -8},
  {"name": "only one number", "args": [[42]], "out": 42},
  {"name": "pairs side by side", "args": [[4, 4, 9, 9, -7]], "out": -7},
  {"name": "extreme values", "args": [[30000, -30000, 30000]], "out": -30000}
]
```

```python oracle
class Solution:
    def singleNumber(self, nums: List[int]) -> int:
        counts = Counter(nums)
        return next(x for x, c in counts.items() if c == 1)
```

```python gen
def gen(rng, size):
    k = rng.randint(0, 3) if size == "small" else rng.randint(4, 30)
    hi = 5 if size == "small" else 30_000
    values = rng.sample(range(-hi, hi + 1), k + 1)  # distinct; values[0] is the single one
    nums = values[1:] * 2 + [values[0]]
    rng.shuffle(nums)
    return [nums]
```

```python perf
def perf(rng):
    # 49,999 pairs, then the single number at the very end.
    values = rng.sample(range(-30_000, 30_001), 50_000)
    nums = values[1:] * 2
    rng.shuffle(nums)
    return [nums + [values[0]]]
```

## Hints

1. What is `x ^ x`? What is `x ^ 0`?
2. XOR doesn't care about order: `a ^ b ^ a` equals `a ^ a ^ b`. So you can imagine each pair standing side by side.
3. XOR all the numbers together. Every pair cancels to 0, and what's left is the number without a partner.

## Solution

```python solution time="n" space="1"
class Solution:
    def singleNumber(self, nums: List[int]) -> int:
        result = 0
        for x in nums:
            result ^= x  # a pair cancels out: x ^ x == 0
        return result
```

XOR compares numbers bit by bit: a result bit is 1 where the two bits differ. So `x ^ x` is 0, `x ^ 0` is `x`, and the order of the operations doesn't matter. XOR-ing the whole list therefore gives the same result as XOR-ing the pairs first, each to 0, and then the single number with all those zeros: the single number itself.

Negative numbers work too. Python's integers have no fixed width, but a negative number behaves as if it had infinitely many 1 bits on the left (two's complement), and XOR treats those bits like any others. One pass with one variable: O(n) time, O(1) space.

## Alternatives

### Toggle membership in a set

```python alt time="n" space="n"
class Solution:
    def singleNumber(self, nums: List[int]) -> int:
        unpaired = set()
        for x in nums:
            if x in unpaired:
                unpaired.remove(x)  # its partner showed up
            else:
                unpaired.add(x)
        return unpaired.pop()
```

Keep the numbers still waiting for their partner. At the end only one is left. Easy to explain, but it uses O(n) memory, which the task asks to avoid.

### Sum of the distinct numbers, twice

```python alt time="n" space="n"
class Solution:
    def singleNumber(self, nums: List[int]) -> int:
        return 2 * sum(set(nums)) - sum(nums)
```

If every number appeared twice, the total would be twice the sum of the distinct numbers. The difference is exactly the number that's missing its partner. Short, but the set takes O(n) memory.

## Wrong answers

### Starts from the first number

```python wrong fails="example" test="Example 1"
class Solution:
    def singleNumber(self, nums: List[int]) -> int:
        result = nums[0]
        for x in nums:  # nums[0] is XOR-ed in a second time here
            result ^= x
        return result
```

Starting from `nums[0]` and then XOR-ing every number, including `nums[0]` again, cancels the first number out of the result. In Example 1 it returns `7 ^ 3 = 4`. Start from 0, which changes nothing, or loop over `nums[1:]`.

### Sorts and compares pairs, but misses the last one

```python wrong fails="edge" test="the single number is the largest"
class Solution:
    def singleNumber(self, nums: List[int]) -> int:
        nums = sorted(nums)
        for i in range(0, len(nums) - 1, 2):
            if nums[i] != nums[i + 1]:
                return nums[i]  # this one has no partner
```

After sorting, partners sit next to each other, so the first pair that doesn't match starts with the single number. But if the single number is the largest, it ends up alone at the end, the loop never reaches it, and the function returns `None`. Add `return nums[-1]` after the loop. Sorting also costs O(n log n).

### Counts every number in the list

```python wrong fails="perf"
class Solution:
    def singleNumber(self, nums: List[int]) -> int:
        for x in nums:
            if nums.count(x) == 1:  # scans the whole list, for every number
                return x
```

Correct, but `count` walks the whole list each time. With the single number at the end of 99,999 numbers, that's about 10 billion comparisons.
