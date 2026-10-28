---
id: 152
module: dp
patterns: [track the largest and the smallest, sign flips]
signature: "def maxProduct(self, nums: List[int]) -> int"
---

## Task

Return the largest product of a *subarray* of `nums`: a run of one or more consecutive elements.

## Constraints

- `1 <= len(nums) <= 20_000`
- `-10 <= nums[i] <= 10`
- The product of any subarray fits in a 32-bit integer

```json examples
[
  {"args": [[3, -1, 4]], "out": 4, "why": "The -1 makes every run that crosses it negative, so the best is a single number: 4."},
  {"args": [[-2, 3, -4]], "out": 24, "why": "Two negatives cancel: -2 × 3 × -4 = 24."},
  {"args": [[0, -3, 0]], "out": 0, "why": "Every run either holds a zero or is just -3, so the best product is 0."}
]
```

```json edge
[
  {"name": "a single negative number", "args": [[-5]], "out": -5},
  {"name": "drop the first number", "args": [[2, -5, -2, -4, 3]], "out": 24},
  {"name": "two negatives", "args": [[-1, -1]], "out": 1},
  {"name": "a zero in front", "args": [[0, 2]], "out": 2},
  {"name": "negatives split by a zero", "args": [[-3, 0, -2]], "out": 0}
]
```

```python oracle
class Solution:
    def maxProduct(self, nums: List[int]) -> int:
        return max(prod(nums[i:j]) for i in range(len(nums)) for j in range(i + 1, len(nums) + 1))
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 6) if size == "small" else rng.randint(6, 25)
    return [[rng.choice([-3, -2, -1, 0, 1, 2, 3]) for _ in range(n)]]
```

```python perf
def perf(rng):
    # 20,000 numbers, mostly 1 and -1, with 25 twos and minus twos: products stay below 2^31.
    nums = [rng.choice([-1, 1]) for _ in range(20_000)]
    for i in rng.sample(range(20_000), 25):
        nums[i] = rng.choice([-2, 2])
    return [nums]
```

## Hints

1. With sums, a negative run is never worth extending. With products it might be: a very negative product times a negative number becomes very positive.
2. So for each position, track two things: the largest and the smallest product of a run ending there.
3. The new largest and smallest come from the current number alone, or the current number times the previous largest or smallest. A negative number swaps their roles.

## Solution

```python solution time="n" space="1"
class Solution:
    def maxProduct(self, nums: List[int]) -> int:
        best = hi = lo = nums[0]  # hi, lo: largest and smallest product of a run ending here
        for x in nums[1:]:
            candidates = (x, hi * x, lo * x)  # start fresh, or extend either run
            hi, lo = max(candidates), min(candidates)
            best = max(best, hi)
        return best
```

A run ending at x is either x alone or a run ending at the previous element, extended by x. Multiplying by x keeps the order of products when x is positive and reverses it when x is negative, so the new largest product comes from the previous largest *or* the previous smallest. Keeping both covers every case, and a zero resets both to 0, which the "x alone" candidate then restarts from. One pass, O(1) space.

## Alternatives

### Products from both ends

```python alt time="n" space="1"
class Solution:
    def maxProduct(self, nums: List[int]) -> int:
        best = max(nums)
        for seq in (nums, nums[::-1]):
            product = 1
            for x in seq:
                product *= x  # the product of the run since the last zero
                best = max(best, product)
                if product == 0:
                    product = 1  # a zero splits the array: start over after it
        return best
```

Between two zeros, the best run is either the whole stretch (if it has an even number of negatives) or the stretch minus everything up to the first negative, or from the last negative on. Running products from the left and from the right see exactly those runs.

## Wrong answers

### Tracks only the largest product

```python wrong fails="example" test="Example 2"
class Solution:
    def maxProduct(self, nums: List[int]) -> int:
        best = cur = nums[0]
        for x in nums[1:]:
            cur = max(x, cur * x)  # Kadane's rule, which drops the most negative run
            best = max(best, cur)
        return best
```

Kadane's algorithm for sums throws a run away when extending it doesn't help, but a very negative product can turn into the best one after the next negative number. In Example 2, −2 × 3 = −6 is dropped, so −6 × −4 = 24 is never seen. Keep the smallest product as well.

### Starts the best at 0

```python wrong fails="edge" test="a single negative number"
class Solution:
    def maxProduct(self, nums: List[int]) -> int:
        best, hi, lo = 0, 1, 1  # 0 and 1 aren't products of any run yet
        for x in nums:
            candidates = (x, hi * x, lo * x)
            hi, lo = max(candidates), min(candidates)
            best = max(best, hi)
        return best
```

Starting the best at 0 pretends there's always a run with product 0. When the array is a single negative number, the answer is that number, but this returns 0. Start everything at the first element.

### Tries every subarray

```python wrong fails="perf"
class Solution:
    def maxProduct(self, nums: List[int]) -> int:
        best = nums[0]
        for i in range(len(nums)):
            product = 1
            for j in range(i, len(nums)):  # every run starting at i
                product *= nums[j]
                best = max(best, product)
        return best
```

Keeping a running product makes each run O(1), but there are still n(n + 1)/2 runs: 200 million for 20,000 numbers. Tracking the largest and smallest product ending at each position covers all of them in one pass.
