---
id: 268
module: bits-math
patterns: [expected sum minus actual sum, XOR with the indices]
signature: "def missingNumber(self, nums: List[int]) -> int"
---

## Task

`nums` holds `n` different numbers, all between 0 and `n`. That range has `n + 1` numbers, so exactly one of them is missing from `nums`. Return it.

Aim for O(n) time and O(1) extra memory.

## Constraints

- `1 <= len(nums) <= 100_000`, and `n` is `len(nums)`
- `0 <= nums[i] <= n`
- The numbers in `nums` are all different

```json examples
[
  {"args": [[1, 4, 0, 2]], "out": 3, "why": "There are 4 numbers, so the range is 0 to 4, and 3 is the one that isn't there."},
  {"args": [[2, 0]], "out": 1, "why": "The range is 0 to 2, and 1 is missing."},
  {"args": [[0]], "out": 1, "why": "The range is 0 to 1. 0 is present, so the missing number is 1, the largest in the range."}
]
```

```json edge
[
  {"name": "zero is missing", "args": [[2, 3, 1]], "out": 0},
  {"name": "the largest is missing", "args": [[3, 0, 2, 1]], "out": 4},
  {"name": "one number, zero missing", "args": [[1]], "out": 0},
  {"name": "already sorted", "args": [[0, 1, 2, 4, 5]], "out": 3}
]
```

```python oracle
class Solution:
    def missingNumber(self, nums: List[int]) -> int:
        present = set(nums)
        for x in range(len(nums) + 1):
            if x not in present:
                return x
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 5) if size == "small" else rng.randint(6, 60)
    missing = rng.randint(0, n)
    nums = [x for x in range(n + 1) if x != missing]
    rng.shuffle(nums)
    return [nums]
```

```python perf
def perf(rng):
    # 100,000 numbers in random order; the missing one is near the top of the range.
    n = 100_000
    missing = rng.randint(n - 1000, n)
    nums = [x for x in range(n + 1) if x != missing]
    rng.shuffle(nums)
    return [nums]
```

## Hints

1. You know exactly which numbers should be there: 0 to n. What's their sum?
2. 0 + 1 + … + n = n(n + 1) / 2. Subtract the sum of `nums`, and what's left is the missing number.
3. Another way: XOR every number from 0 to n together with every number in `nums`. Each number that's present appears twice and cancels out.

## Solution

```python solution time="n" space="1"
class Solution:
    def missingNumber(self, nums: List[int]) -> int:
        n = len(nums)
        return n * (n + 1) // 2 - sum(nums)  # the full range's sum, minus what's there
```

The numbers 0 to n add up to n(n + 1) / 2: pair the smallest with the largest, the second smallest with the second largest, and so on, and every pair adds up to n. `nums` has every one of them except the missing one, so the difference between the two sums is exactly the missing number. One pass to add up `nums`: O(n) time, O(1) space.

Python's integers never overflow. In languages with fixed-size integers, the sum of a large range can overflow, which is one reason the XOR version below is popular.

## Alternatives

### Sort and look for the gap

```python alt time="n log n" space="n"
class Solution:
    def missingNumber(self, nums: List[int]) -> int:
        nums = sorted(nums)
        for i, x in enumerate(nums):
            if x != i:
                return i  # position i should hold i
        return len(nums)  # every position matched, so n is the missing one
```

After sorting, position i holds i until the gap. If there's no gap, the missing number is n. Simple, but the sort costs O(n log n) and the sorted copy O(n) memory.

### XOR with the indices

```python alt time="n" space="1"
class Solution:
    def missingNumber(self, nums: List[int]) -> int:
        result = len(nums)  # n itself has no index, so start with it
        for i, x in enumerate(nums):
            result ^= i ^ x  # each index 0..n-1 and each present number
        return result
```

The indices 0 to n − 1 plus the starting `n` cover the whole range once, and `nums` covers it again except for the missing number. Everything present appears twice and cancels, as in [[p:136]], so only the missing number is left. No large sums, so nothing could overflow in any language.

## Wrong answers

### Adds up the wrong range

```python wrong fails="example" test="Example 1"
class Solution:
    def missingNumber(self, nums: List[int]) -> int:
        n = len(nums)
        return n * (n - 1) // 2 - sum(nums)  # the sum of 0 to n - 1
```

`n * (n - 1) // 2` is the sum of 0 to n − 1, one number short of the range. The result is off by n, and can even be negative: for Example 1 it's 6 − 7 = −1. The range 0 to n has n + 1 numbers and sums to `n * (n + 1) // 2`.

### Never considers the largest number

```python wrong fails="example" test="Example 3"
class Solution:
    def missingNumber(self, nums: List[int]) -> int:
        nums = sorted(nums)
        for i, x in enumerate(nums):
            if x != i:
                return i
```

When n itself is the missing number, there's no gap: every position i holds i. The loop finishes without returning, and the function returns `None`. Example 3 is the smallest such case. The sorted version needs a final `return len(nums)`.

### Checks each candidate with `in`

```python wrong fails="perf"
class Solution:
    def missingNumber(self, nums: List[int]) -> int:
        for x in range(len(nums) + 1):
            if x not in nums:  # scans the list each time
                return x
```

Correct, but `in` on a list looks through the elements one by one. With 100,000 numbers and the missing one near the end of the range, that's billions of comparisons. Putting the numbers in a set first would make each check O(1), at the cost of O(n) memory.
