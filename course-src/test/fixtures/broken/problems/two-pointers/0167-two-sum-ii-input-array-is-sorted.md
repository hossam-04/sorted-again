---
id: 167
module: two-pointers
patterns: [converging pointers, sorted input]
signature: "def twoSum(self, numbers: List[int], target: int) -> List[int]"
compare: exact
---

## Task

You get a list of integers `numbers`, sorted from smallest to largest, and an integer `target`. Exactly one pair of entries at two different positions adds up to `target`.

Return the two positions as `[i, j]` with `i < j`, **counting from 1**. Use only a constant amount of extra memory.

## Constraints

- `2 <= len(numbers) <= 100_000`
- `-10**9 <= numbers[i], target <= 10**9`, and `numbers` is sorted in ascending order
- Exactly one valid pair exists

```json examples
[
  {"args": [[1, 3, 4, 6, 8, 11], 10], "out": [3, 4], "why": "4 + 6 = 10, and 4 and 6 sit at positions 3 and 4."},
  {"args": [[-4, -1, 0, 2, 7], -5], "out": [1, 2], "why": "Negative numbers work the same way."},
  {"args": [[5, 5], 10], "out": [1, 2], "why": "Equal values are fine as long as they are at two different positions."}
]
```

```json edge
[
  {"name": "two elements", "args": [[-1, 1], 0], "out": [1, 2]},
  {"name": "pair at the very start", "args": [[1, 2, 7, 20], 3], "out": [1, 2]},
  {"name": "pair at the very end", "args": [[-8, 0, 3, 9, 12], 21], "out": [4, 5]},
  {"name": "first and last", "args": [[2, 4, 5, 9], 11], "out": [1, 4]},
  {"name": "duplicates that are not the answer", "args": [[3, 3, 4, 5], 9], "out": [3, 4]},
  {"name": "the same value twice", "args": [[1, 6, 6, 10], 12], "out": [2, 3]},
  {"name": "zeros", "args": [[-3, 0, 0, 5], 0], "out": [2, 3]},
  {"name": "extreme values", "args": [[-1000000000, -1, 999999999, 1000000000], 0], "out": [1, 4]}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(2, 8) if size == "small" else rng.randint(20, 300)
    lo, hi = (-50, 50) if size == "small" else (-10**6, 10**6)
    while True:
        nums = sorted(rng.randint(lo, hi) for _ in range(n))
        i, j = sorted(rng.sample(range(n), 2))
        target = nums[i] + nums[j]
        pairs = sum(1 for a in range(n) for b in range(a + 1, n) if nums[a] + nums[b] == target)
        if pairs == 1:
            return [nums, target]
```

```python perf
def perf(rng):
    # Every number is a multiple of 4 except two that are 1 mod 4, so only those two can sum to 2 mod 4.
    # They sit near the middle, which makes the brute force scan about n * n / 4 pairs.
    n = 100_000
    xs = [4 * x for x in rng.sample(range(-250_000_000, 250_000_000), n - 2)]
    a = 4 * rng.randint(-1000, 0) + 1
    b = 4 * rng.randint(0, 1000) + 1
    return [sorted(xs + [a, b]), a + b]
```

## Hints

1. The list is sorted. Compare the smallest and the largest number first.
2. If `numbers[l] + numbers[r]` is too small, `numbers[l]` can't be in the answer: even the largest partner falls short.
3. Move one pointer per step. The loop ends after at most n − 1 steps.

## Solution

```python solution time="n" space="1"
class Solution:
    def twoSum(self, numbers: List[int], target: int) -> List[int]:
        l, r = 0, len(numbers) - 1
        while l < r:
            s = numbers[l] + numbers[r]
            if s == target:
                return [l + 1, r + 1]
            if s < target:
                l += 1
            else:
                r -= 1
        return []
```

Each comparison rules out one number for good. When the sum is too small, the left number plus the largest remaining number still falls short, so the left number is useless. When it is too big, the right number is useless for the same reason. The pointers meet after at most n − 1 moves, and only two indices are stored.

## Alternatives

### Check every pair

```python alt time="n²" space="1" slow oracle
class Solution:
    def twoSum(self, numbers: List[int], target: int) -> List[int]:
        for i in range(len(numbers)):
            for j in range(i + 1, len(numbers)):
                if numbers[i] + numbers[j] == target:
                    return [i + 1, j + 1]
        return []
```

Correct, and the right first idea to say out loud. It ignores the sorting, so it tries about n²/2 pairs.

### Binary search for the partner

```python alt time="n log n" space="1"
class Solution:
    def twoSum(self, numbers: List[int], target: int) -> List[int]:
        for i, x in enumerate(numbers):
            j = bisect_left(numbers, target - x, i + 1)
            if j < len(numbers) and numbers[j] == target - x:
                return [i + 1, j + 1]
        return []
```

For each number, binary-search the rest of the list for its partner. It uses the sorting, but each search costs O(log n).

### Hash map of positions

```python alt time="n" space="n"
class Solution:
    def twoSum(self, numbers: List[int], target: int) -> List[int]:
        seen = {}
        for j, x in enumerate(numbers):
            if target - x in seen:
                return [seen[target - x] + 1, j + 1]
            seen[x] = j
        return []
```

The unsorted Two Sum approach. It is O(n) time too, but it breaks the constant-memory rule, and an interviewer will ask why you ignored the sorting.

## Wrong answers

### Returns 0-based positions

```python wrong fails="example" test="Example 1"
class Solution:
    def twoSum(self, numbers: List[int], target: int) -> List[int]:
        l, r = 0, len(numbers) - 1
        while l < r:
            s = numbers[l] + numbers[r]
            if s == target:
                return [l, r]  # positions here count from 1
            if s < target:
                l += 1
            else:
                r -= 1
        return []
```

The task counts positions from 1. Python indexes from 0, so every answer comes out one too small.

### Checks every pair

```python wrong fails="perf"
class Solution:
    def twoSum(self, numbers: List[int], target: int) -> List[int]:
        for i in range(len(numbers)):
            for j in range(i + 1, len(numbers)):
                if numbers[i] + numbers[j] == target:
                    return [i + 1, j + 1]
        return []
```

Correct on every small test. On 100,000 numbers with the pair near the middle, it tries about 2.5 × 10⁹ pairs.

### Moves the wrong pointer

```python wrong fails="edge"
class Solution:
    def twoSum(self, numbers: List[int], target: int) -> List[int]:
        l, r = 0, len(numbers) - 1
        while l < r:
            s = numbers[l] + numbers[r]
            if s == target:
                return [l + 1, r + 1]
            if s < target:
                r -= 1  # a small sum needs a bigger number, which means moving l
            else:
                l += 1
        return []
```

When the sum is too small, the fix is a bigger number, which means moving `l` right. Moving `r` left makes the sum smaller still, so the pointers walk past the answer.
