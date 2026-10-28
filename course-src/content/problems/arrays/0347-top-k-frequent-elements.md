---
id: 347
module: arrays
patterns: [frequency count, bucket sort, heap]
signature: "def topKFrequent(self, nums: List[int], k: int) -> List[int]"
compare: unordered
---

## Task

You get a list of integers `nums` and an integer `k`. Return the `k` values that occur most often in `nums`, in any order.

The answer is guaranteed to be unique: the `k`-th most frequent value always occurs strictly more often than the next one, so there is never a tie at the cutoff. Ties among the values you return are fine.

## Constraints

- `1 <= len(nums) <= 100_000`
- `-10**4 <= nums[i] <= 10**4`
- `1 <= k <=` the number of distinct values in `nums`
- The answer is unique

```json examples
[
  {"args": [[4, 4, 1, 4, 1, 9], 1], "out": [4], "why": "4 appears three times, more than any other value."},
  {"args": [[7, 3, 3, 7, 5, 3, 7, 3], 2], "out": [3, 7], "why": "3 appears four times and 7 three times; 5 appears only once."},
  {"args": [[-2, 0, -2, 0, 8], 2], "out": [-2, 0], "why": "-2 and 0 tie with two each, and both are in the answer, so the tie doesn't matter."}
]
```

```json edge
[
  {"name": "one value", "args": [[5], 1], "out": [5]},
  {"name": "k is every distinct value", "args": [[1, 2, 2, 3, 3, 3], 3], "out": [1, 2, 3]},
  {"name": "all values equally frequent", "args": [[6, 7, 8], 3], "out": [6, 7, 8]},
  {"name": "negative values", "args": [[-1, -1, -2], 1], "out": [-1]},
  {"name": "most frequent comes last", "args": [[1, 2, 3, 9, 9], 1], "out": [9]},
  {"name": "zero is a value", "args": [[0, 0, 5], 1], "out": [0]},
  {"name": "one value fills the list", "args": [[2, 2, 2, 2], 1], "out": [2]},
  {"name": "large counts", "args": [[0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 3], 2], "out": [0, 1]}
]
```

```python gen
def gen(rng, size):
    d = rng.randint(1, 5) if size == "small" else rng.randint(5, 60)
    values = rng.sample(range(-30, 31) if size == "small" else range(-10**4, 10**4 + 1), d)
    counts = sorted((rng.randint(1, 4 if size == "small" else 12) for _ in range(d)), reverse=True)
    cut = [i + 1 for i in range(d) if i + 1 == d or counts[i] > counts[i + 1]]
    k = rng.choice(cut)  # a k where the cutoff is clear
    nums = [v for v, c in zip(values, counts) for _ in range(c)]
    rng.shuffle(nums)
    return [nums, k]
```

```python perf
def perf(rng):
    # 100,000 values using all 20,001 possible numbers. The 100 most frequent are clearly ahead.
    values = list(range(-10**4, 10**4 + 1))
    rng.shuffle(values)
    nums = []
    for rank, v in enumerate(values):
        nums += [v] * (200 - rank if rank < 100 else rng.randint(1, 3))
    nums = nums[:100_000]
    rng.shuffle(nums)
    return [nums, 100]
```

## Hints

1. Start by counting how often each value appears.
2. Sorting the distinct values by count works in O(n log n). Can you avoid the full sort?
3. A value's count is between 1 and n. Put each value into a bucket indexed by its count, then read the buckets from the highest count down until you have k values.

## Solution

```python solution time="n" space="n"
class Solution:
    def topKFrequent(self, nums: List[int], k: int) -> List[int]:
        counts = Counter(nums)
        buckets = [[] for _ in range(len(nums) + 1)]  # buckets[c] = values that appear c times
        for value, c in counts.items():
            buckets[c].append(value)
        out = []
        for c in range(len(nums), 0, -1):
            out.extend(buckets[c])
            if len(out) >= k:
                return out[:k]
        return out
```

Counting takes one pass. A count is never more than n, so a list of n + 1 buckets can hold every value at the index of its count. Reading the buckets from the top visits values in order of decreasing frequency without comparing any counts, which is why this beats sorting: it's bucket sort with the counts as keys.

Every step is linear: counting is O(n), filling buckets is O(number of distinct values), and the final scan touches each bucket once. Because the cutoff is guaranteed to be clear, `out[:k]` never has to choose between tied values.

## Alternatives

### Sort the distinct values by count

```python alt time="n log n" space="n" oracle
class Solution:
    def topKFrequent(self, nums: List[int], k: int) -> List[int]:
        counts = Counter(nums)
        return sorted(counts, key=counts.get, reverse=True)[:k]
```

Clear and short. Sorting the d distinct values costs O(d log d), which is O(n log n) in the worst case. `Counter(nums).most_common(k)` does the same job and returns `(value, count)` pairs.

### Keep a heap of size k

```python alt time="n log k" space="n"
class Solution:
    def topKFrequent(self, nums: List[int], k: int) -> List[int]:
        counts = Counter(nums)
        return heapq.nlargest(k, counts, key=counts.get)
```

`heapq.nlargest` keeps the k best values seen so far in a min-heap, so each distinct value costs O(log k). This is the answer to reach for when k is much smaller than n, or when the values arrive as a stream.

## Wrong answers

### Sorts the counts the wrong way

```python wrong fails="example" test="Example 1"
class Solution:
    def topKFrequent(self, nums: List[int], k: int) -> List[int]:
        counts = Counter(nums)
        return sorted(counts, key=counts.get)[:k]  # ascending: the least frequent come first
```

`sorted` puts small counts first, so the slice takes the k *least* frequent values. It needs `reverse=True`, or take the slice from the end.

### Makes one bucket too few

```python wrong fails="edge" test="one value" how="error"
class Solution:
    def topKFrequent(self, nums: List[int], k: int) -> List[int]:
        counts = Counter(nums)
        buckets = [[] for _ in range(len(nums))]  # indices 0..n-1, but a count can be n
        for value, c in counts.items():
            buckets[c].append(value)
        out = []
        for c in range(len(nums) - 1, 0, -1):
            out.extend(buckets[c])
        return out[:k]
```

Counts run from 1 to n, so the bucket list needs n + 1 slots. When one value fills the whole list its count is n, and `buckets[n]` raises `IndexError`. It's the classic off-by-one of counting arrays.

### Counts each value with list.count

```python wrong fails="perf"
class Solution:
    def topKFrequent(self, nums: List[int], k: int) -> List[int]:
        return sorted(set(nums), key=nums.count, reverse=True)[:k]  # one full scan per distinct value
```

One line, and it looks efficient. But `nums.count` scans the whole list, and `sorted` calls it once for every distinct value: up to 20,001 scans of 100,000 numbers.
