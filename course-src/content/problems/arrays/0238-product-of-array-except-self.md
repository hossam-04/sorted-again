---
id: 238
module: arrays
patterns: [prefix products, suffix products]
signature: "def productExceptSelf(self, nums: List[int]) -> List[int]"
---

## Task

You get a list of integers `nums`. Return a new list `answer` of the same length, where `answer[i]` is the product of every entry of `nums` except the one at position `i`.

Don't use division, and aim for O(n) time. The test data keeps every product of a prefix or a suffix of `nums` within a 32-bit signed integer, as it would be in languages with fixed-size integers.

## Constraints

- `2 <= len(nums) <= 100_000`
- `-30 <= nums[i] <= 30`
- Every prefix product and suffix product fits in a 32-bit signed integer

```json examples
[
  {"args": [[2, 5, 3]], "out": [15, 6, 10], "why": "Position 0 multiplies 5 × 3, position 1 multiplies 2 × 3, and position 2 multiplies 2 × 5."},
  {"args": [[4, 0, -2, 1]], "out": [0, -8, 0, 0], "why": "Every product that includes the 0 is 0. Only position 1 skips it: 4 × -2 × 1 = -8."},
  {"args": [[-1, -1]], "out": [-1, -1], "why": "With two entries, each answer is just the other entry."}
]
```

```json edge
[
  {"name": "two elements", "args": [[7, -3]], "out": [-3, 7]},
  {"name": "zero at the start", "args": [[0, 2, 3]], "out": [6, 0, 0]},
  {"name": "zero at the end", "args": [[5, 2, 0]], "out": [0, 0, 10]},
  {"name": "two zeros", "args": [[0, 3, 0, 2]], "out": [0, 0, 0, 0]},
  {"name": "all ones", "args": [[1, 1, 1, 1]], "out": [1, 1, 1, 1]},
  {"name": "all negative", "args": [[-2, -3, -4]], "out": [12, 8, 6]},
  {"name": "largest values", "args": [[30, 30, 30, 30, 30, 30]], "out": [24300000, 24300000, 24300000, 24300000, 24300000, 24300000]},
  {"name": "smallest values", "args": [[-30, -30, -30]], "out": [900, 900, 900]}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(2, 8) if size == "small" else rng.randint(20, 300)
    while True:
        nums = []
        for _ in range(n):
            r = rng.random()
            nums.append(0 if r < 0.08 else rng.choice((1, -1)) if r < 0.75 else rng.randint(-5, 5))
        p, ok = 1, True
        for x in nums:  # keep every prefix product within 32 bits (suffixes have the same factors)
            p *= x
            ok = ok and abs(p) < 2**31
        if ok and all(abs(v) < 2**31 for v in _suffixes(nums)):
            return [nums]


def _suffixes(nums):
    p = 1
    for x in reversed(nums):
        p *= x
        yield p
```

```python perf
def perf(rng):
    # 100,000 values, mostly 1 and -1 with a few 2s and 3s so the products stay within 32 bits.
    nums = [rng.choice((1, -1)) for _ in range(100_000)]
    for i in rng.sample(range(100_000), 22):
        nums[i] = 2
    for i in rng.sample(range(100_000), 4):
        nums[i] = 3
    return [nums]
```

## Hints

1. The product of everything except `nums[i]` is (the product of everything left of `i`) × (the product of everything right of `i`).
2. You can compute all the "left" products in one pass from the start, and all the "right" products in one pass from the end.
3. To save memory, write the left products into the answer list, then sweep from the right with a single running product and multiply it in.

## Solution

```python solution time="n" space="1"
class Solution:
    def productExceptSelf(self, nums: List[int]) -> List[int]:
        n = len(nums)
        answer = [1] * n
        left = 1
        for i in range(n):
            answer[i] = left   # product of nums[0..i-1]
            left *= nums[i]
        right = 1
        for i in range(n - 1, -1, -1):
            answer[i] *= right  # times the product of nums[i+1..n-1]
            right *= nums[i]
        return answer
```

After the first loop, `answer[i]` holds the product of everything strictly left of `i`: the running product `left` is stored *before* `nums[i]` is folded in. The second loop does the same from the right, so each position ends up with left part × right part, which skips exactly `nums[i]`.

Zeros need no special case: a zero simply makes every product that contains it zero, and the position of the zero gets the product of everything else.

Two passes give O(n) time. Apart from the answer itself (which the task asks for), the extra memory is two numbers, so the extra space is O(1).

## Alternatives

### Multiply everything else, for every position

```python alt time="n²" space="1" slow oracle
class Solution:
    def productExceptSelf(self, nums: List[int]) -> List[int]:
        answer = []
        for i in range(len(nums)):
            p = 1
            for j in range(len(nums)):
                if j != i:
                    p *= nums[j]
            answer.append(p)
        return answer
```

The definition turned into code. It's correct, but it does n − 1 multiplications for each of the n positions.

### Separate prefix and suffix lists

```python alt time="n" space="n"
class Solution:
    def productExceptSelf(self, nums: List[int]) -> List[int]:
        n = len(nums)
        prefix = [1] * (n + 1)  # prefix[i] = product of nums[0..i-1]
        for i in range(n):
            prefix[i + 1] = prefix[i] * nums[i]
        suffix = [1] * (n + 1)  # suffix[i] = product of nums[i..n-1]
        for i in range(n - 1, -1, -1):
            suffix[i] = suffix[i + 1] * nums[i]
        return [prefix[i] * suffix[i + 1] for i in range(n)]
```

The same idea with both halves stored in their own lists. It's easier to check by hand, and it's a good first version to write in an interview before folding one list into the answer. It uses O(n) extra memory.

## Wrong answers

### Includes nums[i] in the right-hand product

```python wrong fails="example" test="Example 1"
class Solution:
    def productExceptSelf(self, nums: List[int]) -> List[int]:
        n = len(nums)
        answer = [1] * n
        left = 1
        for i in range(n):
            answer[i] = left
            left *= nums[i]
        right = 1
        for i in range(n - 1, -1, -1):
            right *= nums[i]  # folds nums[i] in before using it
            answer[i] *= right
        return answer
```

The two lines of the second loop are swapped. `right` now includes `nums[i]` when it is multiplied into `answer[i]`, so every answer is multiplied by its own value. The order "use, then update" is the whole trick.

### Divides the total product

```python wrong fails="example" test="Example 2" how="error"
class Solution:
    def productExceptSelf(self, nums: List[int]) -> List[int]:
        total = 1
        for x in nums:
            total *= x
        return [total // x for x in nums]  # breaks as soon as a value is 0
```

Besides breaking the "no division" rule, it fails on zeros: `total // 0` raises `ZeroDivisionError`. Patching it needs separate cases for one zero and for two or more zeros, which is why prefix and suffix products are the cleaner answer.

### Builds a fresh list for every position

```python wrong fails="perf"
class Solution:
    def productExceptSelf(self, nums: List[int]) -> List[int]:
        return [math.prod(nums[:i] + nums[i + 1:]) for i in range(len(nums))]  # copies and multiplies n - 1 values each time
```

Short and correct, but each position copies the other n − 1 values into a new list and multiplies them all: O(n²) work and a lot of copying. On 100,000 values that is 10 billion multiplications.
