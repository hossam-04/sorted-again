---
id: 493
module: range-queries
patterns: [merge sort with a counting pass, Fenwick tree over ranks]
signature: "def reversePairs(self, nums: List[int]) -> int"
---

## Task

A **reverse pair** is a pair of positions `i < j` where `nums[i] > 2 * nums[j]`: an earlier number that's more than twice a later one. Return how many reverse pairs `nums` has.

## Constraints

- `1 <= len(nums) <= 50_000`
- `-2**31 <= nums[i] <= 2**31 - 1`

```json examples
[
  {"args": [[9, 4, 1, 3]], "out": 4, "why": "9 is more than twice 4, 1 and 3. 4 is more than twice 1, but not twice 3."},
  {"args": [[2, 1, 1]], "out": 0, "why": "More than twice, not at least twice: 2 is exactly twice 1, so it doesn't count."},
  {"args": [[-5, -3, 7, -1]], "out": 2, "why": "Twice a negative number is smaller still: -5 > 2 × (-3) = -6 counts, and so does 7 > -2."}
]
```

```json edge
[
  {"name": "one number", "args": [[1]], "out": 0},
  {"name": "halving each time", "args": [[8, 4, 2, 1]], "out": 3},
  {"name": "extremes", "args": [[2147483647, -2147483648]], "out": 1},
  {"name": "all equal", "args": [[3, 3, 3]], "out": 0},
  {"name": "zeros", "args": [[0, 0]], "out": 0},
  {"name": "a zero after a positive", "args": [[1, 0]], "out": 1}
]
```

```python oracle
class Solution:
    def reversePairs(self, nums: List[int]) -> int:
        return sum(1 for i in range(len(nums)) for j in range(i + 1, len(nums)) if nums[i] > 2 * nums[j])
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 8) if size == "small" else rng.randint(20, 300)
    hi = rng.choice([4, 10]) if size == "small" else rng.choice([50, 2**31 - 1])
    return [[rng.randint(-hi - 1, hi) for _ in range(n)]]
```

```python perf
def perf(rng):
    # 50,000 numbers across the whole 32-bit range.
    return [[rng.randint(-2**31, 2**31 - 1) for _ in range(50_000)]]
```

## Hints

1. Comparing every pair is O(n²). Split the list in half: a reverse pair lies inside the left half, inside the right half, or crosses from left to right.
2. Pairs inside each half can be counted recursively. For the crossing pairs, positions no longer matter, only values, so you may sort each half first.
3. With both halves sorted, walk the left half in order with a pointer `j` into the right half that only moves forward: for each left number v, advance `j` while `v > 2 * right[j]`. Then `j` right-half numbers pair with v. Merge the halves afterwards, as in merge sort.

## Solution

```python solution time="n log n" space="n"
class Solution:
    def reversePairs(self, nums: List[int]) -> int:
        def sort(a):  # returns a sorted, and the number of reverse pairs inside a
            if len(a) <= 1:
                return a, 0
            mid = len(a) // 2
            left, pairs_left = sort(a[:mid])
            right, pairs_right = sort(a[mid:])
            count, j = pairs_left + pairs_right, 0
            for v in left:  # left is sorted, so j only moves forward
                while j < len(right) and v > 2 * right[j]:
                    j += 1
                count += j  # right[:j] are all less than half of v
            return sorted(left + right), count  # two sorted runs: sorted merges them in O(n)

        return sort(nums)[1]
```

Every pair `i < j` is counted exactly once, at the level of the recursion where i and j fall into different halves. At that level the order within each half doesn't matter, only which half a number came from, so both halves can be sorted. Then the condition `v > 2 * right[j]` is monotone: if v pairs with `right[j]`, every larger v does too, which is why one forward-moving pointer counts all crossing pairs in O(n).

The counting pass and the merge are separate: counting needs the "twice" comparison, while merging needs the plain one. `sorted` on two concatenated sorted runs is a single merge in O(n) (Timsort finds the two runs), so each level costs O(n) and there are log n levels.

## Alternatives

### A Fenwick tree over ranks

```python alt time="n log n" space="n"
class Solution:
    def reversePairs(self, nums: List[int]) -> int:
        values = sorted(set(nums))  # each distinct value gets a rank, from 1
        tree = [0] * (len(values) + 1)
        total = 0
        for seen, x in enumerate(nums):  # seen = how many numbers came before x
            p = bisect_right(values, 2 * x)  # earlier values <= 2x have ranks 1 .. p
            at_most = 0
            while p > 0:
                at_most += tree[p]
                p -= p & -p
            total += seen - at_most  # the earlier numbers greater than 2x
            p = bisect_left(values, x) + 1
            while p <= len(values):
                tree[p] += 1
                p += p & -p
        return total
```

Scan from the left and count, for each number x, the earlier numbers greater than `2 * x`. The values span 2³² possibilities, so they're replaced by their **ranks** among the distinct values (coordinate compression), and `bisect_right` finds how many ranks are at most `2 * x`, even though `2 * x` itself may not be in the list. A Fenwick tree over ranks counts the earlier numbers up to that rank.

## Wrong answers

### Counts ordinary inversions

```python wrong fails="example" test="Example 1"
class Solution:
    def reversePairs(self, nums: List[int]) -> int:
        def sort(a):
            if len(a) <= 1:
                return a, 0
            mid = len(a) // 2
            left, x = sort(a[:mid])
            right, y = sort(a[mid:])
            count, j = x + y, 0
            for v in left:
                while j < len(right) and v > right[j]:  # forgot the "twice"
                    j += 1
                count += j
            return sorted(left + right), count

        return sort(nums)[1]
```

This is the classic inversion count: pairs where the earlier number is simply larger. A reverse pair needs it to be more than twice as large. In Example 1, 4 and 3 form an inversion but not a reverse pair, so the count comes out as 5.

### Counts "at least twice"

```python wrong fails="example" test="Example 2"
class Solution:
    def reversePairs(self, nums: List[int]) -> int:
        def sort(a):
            if len(a) <= 1:
                return a, 0
            mid = len(a) // 2
            left, x = sort(a[:mid])
            right, y = sort(a[mid:])
            count, j = x + y, 0
            for v in left:
                while j < len(right) and v >= 2 * right[j]:  # equal to twice also counted
                    j += 1
                count += j
            return sorted(left + right), count

        return sort(nums)[1]
```

The condition is strict. With `>=`, a number that's exactly twice a later one counts: in Example 2, 2 and each of the 1s make 2 pairs instead of 0.

### Counts while merging

```python wrong fails="example" test="Example 1"
class Solution:
    def reversePairs(self, nums: List[int]) -> int:
        def sort(a):
            if len(a) <= 1:
                return a, 0
            mid = len(a) // 2
            left, x = sort(a[:mid])
            right, y = sort(a[mid:])
            count, merged, i, j = x + y, [], 0, 0
            while i < len(left) and j < len(right):
                if left[i] <= right[j]:
                    merged.append(left[i])
                    i += 1
                else:
                    if left[i] > 2 * right[j]:  # only checks the left number that happens to be next
                        count += len(left) - i
                    merged.append(right[j])
                    j += 1
            return merged + left[i:] + right[j:], count

        return sort(nums)[1]
```

Folding the count into the merge only compares each right-half number with the left-half number that's next in the merge order, the smallest one larger than it. If that one isn't more than twice as large, a bigger left number still might be, and it's never checked. In Example 1, the pair of 9 and 3 is missed. Count in a separate pass, then merge.

### Compares every pair

```python wrong fails="perf"
class Solution:
    def reversePairs(self, nums: List[int]) -> int:
        count = 0
        for i in range(len(nums)):
            for j in range(i + 1, len(nums)):  # every pair
                if nums[i] > 2 * nums[j]:
                    count += 1
        return count
```

Correct, and O(n²): 50,000 numbers make 1.25 billion comparisons. Divide and conquer counts each crossing group of pairs in one linear pass.
