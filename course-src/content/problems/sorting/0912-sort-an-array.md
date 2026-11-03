---
id: 912
module: sorting
patterns: [merge sort, quicksort with a random pivot, heap sort]
signature: "def sortArray(self, nums: List[int]) -> List[int]"
---

## Task

Sort a list of whole numbers from smallest to largest and return it, **without** Python's `sort` or `sorted`. Write the sort yourself: it has to run in O(n log n) time.

The list may hold duplicates and negative numbers, and it may come already sorted, or sorted backwards.

## Constraints

- `1 <= len(nums) <= 50_000`
- `-5 * 10**4 <= nums[i] <= 5 * 10**4`

```json examples
[
  {"args": [[9, -3, 5, 0, 5]], "out": [-3, 0, 5, 5, 9], "why": "Negative numbers come first, and both 5s stay in the result."},
  {"args": [[4, 3, 2, 1]], "out": [1, 2, 3, 4], "why": "Input sorted backwards is the worst case for a quicksort that always takes the last item as its pivot."},
  {"args": [[8, 8, 1, 8]], "out": [1, 8, 8, 8], "why": "Many equal values: a sort must not lose or duplicate any of them."}
]
```

```json edge
[
  {"name": "a single number", "args": [[42]], "out": [42]},
  {"name": "already sorted", "args": [[-2, 0, 3, 7, 11]], "out": [-2, 0, 3, 7, 11]},
  {"name": "all equal", "args": [[6, 6, 6, 6, 6]], "out": [6, 6, 6, 6, 6]},
  {"name": "two numbers out of order", "args": [[1, -1]], "out": [-1, 1]},
  {"name": "the extreme values", "args": [[50000, -50000, 0, 50000]], "out": [-50000, 0, 50000, 50000]},
  {"name": "odd length", "args": [[3, 1, 2, 5, 4, 0, 6]], "out": [0, 1, 2, 3, 4, 5, 6]}
]
```

```python oracle
class Solution:
    def sortArray(self, nums: List[int]) -> List[int]:
        return sorted(nums)
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 8) if size == "small" else rng.randint(8, 200)
    hi = 10 if size == "small" else 5 * 10**4
    nums = [rng.randint(-hi, hi) for _ in range(n)]
    shape = rng.random()
    if shape < 0.15:
        nums.sort()
    elif shape < 0.3:
        nums.sort(reverse=True)
    return [nums]
```

```python perf
def perf(rng):
    # 50,000 numbers sorted backwards: quadratic sorts, and quicksorts with a fixed pivot, take billions of steps.
    return [sorted((rng.randint(-5 * 10**4, 5 * 10**4) for _ in range(50_000)), reverse=True)]
```

## Hints

1. Merge sort is the safest O(n log n) sort to write: it doesn't depend on the input's order at all.
2. Sort each half of the list, then merge the two sorted halves by repeatedly taking the smaller of their front items.
3. When one half runs out during the merge, the rest of the other half is already sorted: add it as it is.

## Solution

```python solution time="n log n" space="n"
class Solution:
    def sortArray(self, nums: List[int]) -> List[int]:
        if len(nums) <= 1:
            return nums
        mid = len(nums) // 2
        left, right = self.sortArray(nums[:mid]), self.sortArray(nums[mid:])
        merged, i, j = [], 0, 0
        while i < len(left) and j < len(right):
            if left[i] <= right[j]:
                merged.append(left[i])
                i += 1
            else:
                merged.append(right[j])
                j += 1
        merged.extend(left[i:])  # at most one of these two is non-empty
        merged.extend(right[j:])
        return merged
```

Merge sort splits the list in half until the pieces have one item, which is sorted already, and then merges sorted pieces back together. The halves always have equal sizes, so there are about log₂ n levels of merging, and each level handles all n items once: O(n log n) on every input, sorted, reversed or random.

Each merge builds a new list, so the extra memory is O(n). The recursion is only log₂ n deep, about 16 levels for 50,000 numbers.

## Alternatives

### Quicksort with a random pivot and a three-way partition

```python alt time="n log n" space="log n"
import random

class Solution:
    def sortArray(self, nums: List[int]) -> List[int]:
        def sort(lo, hi):
            while lo < hi:
                pivot = nums[random.randint(lo, hi)]
                lt, i, gt = lo, lo, hi  # [lo, lt) < pivot, [lt, i) == pivot, (gt, hi] > pivot
                while i <= gt:
                    if nums[i] < pivot:
                        nums[lt], nums[i] = nums[i], nums[lt]
                        lt += 1
                        i += 1
                    elif nums[i] > pivot:
                        nums[i], nums[gt] = nums[gt], nums[i]
                        gt -= 1
                    else:
                        i += 1
                if lt - lo < hi - gt:  # recurse on the smaller side, loop on the other
                    sort(lo, lt - 1)
                    lo = gt + 1
                else:
                    sort(gt + 1, hi)
                    hi = lt - 1
        sort(0, len(nums) - 1)
        return nums
```

A random pivot makes the bad splits of a fixed pivot vanishingly unlikely, whatever order the input has. The three-way partition puts every copy of the pivot in its final place at once, so a list of equal values takes one pass instead of n. Recursing on the smaller side keeps the stack at O(log n). The time is O(n log n) on average, and the sort works in place.

### Heap sort

```python alt time="n log n" space="1"
class Solution:
    def sortArray(self, nums: List[int]) -> List[int]:
        def sift_down(i, n):  # restore the max-heap below position i, using positions 0..n-1
            while 2 * i + 1 < n:
                c = 2 * i + 1
                if c + 1 < n and nums[c + 1] > nums[c]:
                    c += 1
                if nums[i] >= nums[c]:
                    return
                nums[i], nums[c] = nums[c], nums[i]
                i = c

        n = len(nums)
        for i in range(n // 2 - 1, -1, -1):  # build a max-heap in O(n)
            sift_down(i, n)
        for end in range(n - 1, 0, -1):
            nums[0], nums[end] = nums[end], nums[0]  # the largest left goes to the end
            sift_down(0, end)
        return nums
```

Build a max-heap inside the list, then swap the largest item to the end and sift the new root down, n times. It's O(n log n) in the worst case with O(1) extra memory, which neither of the others gives. It's not stable, but for plain numbers that doesn't matter.

### Counting sort

```python alt time="n + k" space="k"
class Solution:
    def sortArray(self, nums: List[int]) -> List[int]:
        lo = min(nums)
        count = [0] * (max(nums) - lo + 1)
        for x in nums:
            count[x - lo] += 1
        out = []
        for v, c in enumerate(count):
            out.extend([v + lo] * c)
        return out
```

The values lie in a range of k = 100,001 whole numbers, so they can be counted instead of compared: O(n + k) time and O(k) memory. That beats O(n log n) here, because k is close to n. With values up to 10⁹, the count array wouldn't fit.

## Wrong answers

### Forgets what's left after the merge

```python wrong fails="example" test="Example 1"
class Solution:
    def sortArray(self, nums: List[int]) -> List[int]:
        if len(nums) <= 1:
            return nums
        mid = len(nums) // 2
        left, right = self.sortArray(nums[:mid]), self.sortArray(nums[mid:])
        merged, i, j = [], 0, 0
        while i < len(left) and j < len(right):
            if left[i] <= right[j]:
                merged.append(left[i])
                i += 1
            else:
                merged.append(right[j])
                j += 1
        return merged  # the rest of one half is lost
```

The loop stops as soon as one half is used up, and the other half still holds its largest items. They're already sorted, so they just need adding at the end. Without them, items disappear from every merge.

### Quicksort that always takes the last item as its pivot

```python wrong fails="perf"
class Solution:
    def sortArray(self, nums: List[int]) -> List[int]:
        def sort(lo, hi):
            if lo >= hi:
                return
            pivot, i = nums[hi], lo
            for j in range(lo, hi):
                if nums[j] < pivot:
                    nums[i], nums[j] = nums[j], nums[i]
                    i += 1
            nums[i], nums[hi] = nums[hi], nums[i]
            sort(lo, i - 1)
            sort(i + 1, hi)
        sort(0, len(nums) - 1)
        return nums
```

It sorts every small test correctly. But on the performance test, sorted backwards, the last item is always the smallest left, so each partition only removes the pivot itself. That's about n²/2 = 1.25 billion comparisons and 50,000 levels of recursion. A random pivot fixes both.

### Insertion sort

```python wrong fails="perf"
class Solution:
    def sortArray(self, nums: List[int]) -> List[int]:
        for i in range(1, len(nums)):
            x, j = nums[i], i
            while j > 0 and nums[j - 1] > x:
                nums[j] = nums[j - 1]
                j -= 1
            nums[j] = x
        return nums
```

Insertion sort is correct, and fast when the input is nearly sorted. Input sorted backwards is its worst case: every number moves past all the numbers before it, about 1.25 billion moves for 50,000 numbers. It's O(n²), and the task needs O(n log n).
