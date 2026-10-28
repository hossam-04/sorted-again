---
id: 215
module: heaps
patterns: [size-k min-heap, quickselect, top k]
signature: "def findKthLargest(self, nums: List[int], k: int) -> int"
---

## Task

Return the k-th largest number in `nums`: the number at position k when the list is ordered from largest to smallest, with repeated numbers counted separately. Try to do better than sorting the whole list.

## Constraints

- `1 <= k <= len(nums) <= 100_000`
- `-10**4 <= nums[i] <= 10**4`

```json examples
[
  {"args": [[7, 1, 9, 4, 6], 2], "out": 7, "why": "From largest to smallest the numbers are 9, 7, 6, 4, 1, so the second largest is 7."},
  {"args": [[5, 8, 8, 2], 2], "out": 8, "why": "Repeated numbers count separately: both 8s come before 5, so the second largest is 8, not 5."},
  {"args": [[-3, -1, -2], 3], "out": -3, "why": "When k is the length of the list, the answer is the smallest number."}
]
```

```json edge
[
  {"name": "one number", "args": [[42], 1], "out": 42},
  {"name": "all equal", "args": [[3, 3, 3, 3], 3], "out": 3},
  {"name": "k = 1", "args": [[2, 11, 5], 1], "out": 11},
  {"name": "ascending input", "args": [[1, 2, 3, 4, 5, 6], 4], "out": 3},
  {"name": "descending input", "args": [[6, 5, 4, 3, 2, 1], 2], "out": 5},
  {"name": "around zero", "args": [[0, -5, 5, -10, 10], 3], "out": 0}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 7) if size == "small" else rng.randint(10, 400)
    hi = 5 if size == "small" else 10_000
    return [[rng.randint(-hi, hi) for _ in range(n)], rng.randint(1, n)]
```

```python perf
def perf(rng):
    # 100,000 numbers, and k = 50,000: the median.
    return [[rng.randint(-10_000, 10_000) for _ in range(100_000)], 50_000]
```

## Hints

1. Sorting works in O(n log n). But you only need one position: can you avoid putting all the other numbers in order?
2. Keep a min-heap of the k largest numbers seen so far. Its top is the smallest of them, which is the k-th largest.
3. Heapify the first k numbers. For each later number, if it's larger than the top, replace the top with it. (Quickselect is another way: split the list around a pivot and continue in one part only, O(n) on average.)

## Solution

```python solution time="n log k" space="k"
class Solution:
    def findKthLargest(self, nums: List[int], k: int) -> int:
        heap = nums[:k]
        heapify(heap)  # the k largest so far; the smallest of them is on top
        for x in nums[k:]:
            if x > heap[0]:
                heapreplace(heap, x)  # x enters the top k, and the old k-th largest leaves
        return heap[0]
```

The heap holds the k largest numbers seen so far, with the smallest of them on top. A new number only matters if it's larger than that top: then it enters the top k and the top leaves, which `heapreplace` does in one O(log k) step. After the scan, the heap holds the k largest numbers overall, and its top is the k-th largest.

That's O(n log k) time with only k numbers stored, which beats sorting when k is small. Repeated numbers need no special care: each copy is a separate item in the heap.

## Alternatives

### Sort

```python alt time="n log n" space="n" oracle
class Solution:
    def findKthLargest(self, nums: List[int], k: int) -> int:
        return sorted(nums, reverse=True)[k - 1]
```

The obvious answer, and in Python often the fastest in practice, since sorting runs in C. It does more work than needed, O(n log n), and interviewers usually ask for something better.

### Quickselect

```python alt time="n" space="n"
class Solution:
    def findKthLargest(self, nums: List[int], k: int) -> int:
        while True:
            pivot = random.choice(nums)
            larger = [x for x in nums if x > pivot]
            if k <= len(larger):
                nums = larger  # the answer is among the larger numbers
                continue
            equal = nums.count(pivot)
            if k <= len(larger) + equal:
                return pivot  # the answer is the pivot itself
            k -= len(larger) + equal  # skip the larger numbers and the pivot's copies
            nums = [x for x in nums if x < pivot]
```

Quickselect is quicksort that follows only one side. Split the numbers around a random pivot into larger, equal and smaller ones: counting tells you which group holds the k-th largest, and the others are dropped. Each round keeps, on average, a constant fraction of the list, so the total is O(n) on average. A random pivot makes the O(n²) worst case vanishingly unlikely, and grouping the copies of the pivot keeps lists full of repeats from slowing it down.

### Count each value

```python alt time="n + r" space="r"
class Solution:
    def findKthLargest(self, nums: List[int], k: int) -> int:
        count = Counter(nums)
        for v in range(max(nums), min(nums) - 1, -1):  # from the largest value down
            k -= count[v]
            if k <= 0:
                return v
```

The values lie in a small range (r is at most 20,001 here), so counting each value and walking down from the largest finds the answer in O(n + r) time. It only works because the range is small.

## Wrong answers

### Finds the k-th smallest

```python wrong fails="example" test="Example 1"
class Solution:
    def findKthLargest(self, nums: List[int], k: int) -> int:
        return sorted(nums)[k - 1]  # ascending order, so this is the k-th smallest
```

`sorted` orders from smallest to largest, so position k − 1 holds the k-th *smallest* number. In Example 1 that's 4 instead of 7. Use `sorted(nums)[-k]`, or sort with `reverse=True`.

### Drops repeated numbers

```python wrong fails="example" test="Example 2"
class Solution:
    def findKthLargest(self, nums: List[int], k: int) -> int:
        return sorted(set(nums), reverse=True)[k - 1]  # a set keeps one copy of each number
```

The k-th largest counts repeats: in 8, 8, 5, 2 the second largest is 8. A set merges the two 8s, so the second largest becomes 5. Keep every copy.

### Removes the largest k − 1 times

```python wrong fails="perf"
class Solution:
    def findKthLargest(self, nums: List[int], k: int) -> int:
        nums = list(nums)
        for _ in range(k - 1):
            nums.remove(max(nums))  # two full scans of the list per round
        return max(nums)
```

Removing the largest number k − 1 times leaves the k-th largest on top, so this is correct. But each round scans the list twice, once for `max` and once for `remove`: O(n·k). For the median of 100,000 numbers that's billions of steps.
