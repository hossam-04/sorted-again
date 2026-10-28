---
id: 4
module: binary-search
patterns: [binary search on a partition]
signature: "def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float"
compare: float
perf_repeat: 3000
---

## Task

You get two lists of integers, `nums1` and `nums2`, each sorted from smallest to largest. One of them may be empty, but not both.

Return the median of all their values together: put every value from both lists in one sorted sequence; if its length is odd, the median is the middle value, and if it's even, the median is the average of the two middle values. Return it as a float.

Aim for O(log(m + n)) time, where m and n are the lengths of the lists.

## Constraints

- `0 <= len(nums1), len(nums2) <= 100_000`, and `len(nums1) + len(nums2) >= 1`
- `-10**6 <= nums1[i], nums2[i] <= 10**6`
- Both lists are sorted in non-decreasing order

```json examples
[
  {"args": [[1, 4, 9], [2, 3]], "out": 3.0, "why": "Together: 1, 2, 3, 4, 9. The middle value is 3."},
  {"args": [[5, 6], [1, 2, 3, 10]], "out": 4.0, "why": "Together: 1, 2, 3, 5, 6, 10. The two middle values are 3 and 5, so the median is 4."},
  {"args": [[], [7]], "out": 7.0, "why": "One list is empty, so the median is the median of the other."}
]
```

```json edge
[
  {"name": "first list empty, even count", "args": [[], [4, 8]], "out": 6.0},
  {"name": "all values equal", "args": [[4, 4], [4, 4, 4]], "out": 4.0},
  {"name": "the first list is much longer", "args": [[1, 2, 3, 4, 5, 6], [7]], "out": 4.0},
  {"name": "half-way median", "args": [[1, 3], [6, 8]], "out": 4.5},
  {"name": "second list empty", "args": [[2], []], "out": 2.0},
  {"name": "nums1 entirely larger", "args": [[10, 11, 12], [1, 2, 3]], "out": 6.5},
  {"name": "negative values", "args": [[-5, -3], [-4]], "out": -4.0},
  {"name": "a value in both lists", "args": [[1, 2], [2, 3]], "out": 2.0},
  {"name": "extreme values", "args": [[1000000], [-1000000]], "out": 0.0}
]
```

```python gen
def gen(rng, size):
    while True:
        m = rng.randint(0, 5) if size == "small" else rng.randint(0, 150)
        n = rng.randint(0, 5) if size == "small" else rng.randint(0, 150)
        if m + n:
            break
    hi = 10 if size == "small" else 10**6
    return [sorted(rng.randint(-hi, hi) for _ in range(m)), sorted(rng.randint(-hi, hi) for _ in range(n))]
```

```python perf
def perf(rng):
    # Two sorted lists of 100,000 values each, asked 3,000 times. Merging costs 200,000 steps per call;
    # the partition search needs about 17.
    a = sorted(rng.randint(-10**6, 10**6) for _ in range(100_000))
    b = sorted(rng.randint(-10**6, 10**6) for _ in range(100_000))
    return [a, b]
```

## Hints

1. Merging the lists finds the median in O(m + n). To beat that, you can't look at most of the values.
2. The median splits all values into a left half and a right half of (almost) equal size. Choose how many values the left half takes from `nums1`; the size fixes how many it takes from `nums2`.
3. A split is right when the largest value on the left is at most the smallest value on the right, in both lists. Binary search the number taken from the shorter list.

## Solution

```python solution time="log(min(m, n))" space="1"
class Solution:
    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:
        a, b = (nums1, nums2) if len(nums1) <= len(nums2) else (nums2, nums1)  # search the shorter list
        m, n = len(a), len(b)
        half = (m + n + 1) // 2  # size of the left half
        lo, hi = 0, m
        while lo <= hi:
            i = (lo + hi) // 2  # values the left half takes from a
            j = half - i        # ... and from b
            a_left = a[i - 1] if i > 0 else -inf
            a_right = a[i] if i < m else inf
            b_left = b[j - 1] if j > 0 else -inf
            b_right = b[j] if j < n else inf
            if a_left <= b_right and b_left <= a_right:  # every left value <= every right value
                if (m + n) % 2:
                    return float(max(a_left, b_left))
                return (max(a_left, b_left) + min(a_right, b_right)) / 2
            if a_left > b_right:
                hi = i - 1  # took too many from a
            else:
                lo = i + 1  # took too few from a
        return 0.0  # not reached for valid input
```

Think of the median as a cut through the merged sequence: the left part holds `half` values, and everything on the left is at most everything on the right. The left part takes the first `i` values of `a` and the first `j = half - i` of `b`. Because both lists are sorted, the cut is valid exactly when `a[i-1] <= b[j]` and `b[j-1] <= a[i]`. The infinities stand in for "no value on that side".

If `a[i-1] > b[j]`, the left part took too many from `a`, so `i` must shrink; otherwise it must grow. That's a monotone condition, so binary search finds `i`. With the right cut, the median is the largest left value (odd total) or the average of the largest left and smallest right values (even total).

Searching the shorter list keeps `j` between 0 and n for every `i`, and the search takes O(log(min(m, n))) steps.

## Alternatives

### Merge until the middle

```python alt time="m + n" space="1" slow oracle
class Solution:
    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:
        total = len(nums1) + len(nums2)
        i = j = 0
        prev = cur = 0
        for _ in range(total // 2 + 1):  # walk the merged order up to the middle
            prev = cur
            if j >= len(nums2) or (i < len(nums1) and nums1[i] <= nums2[j]):
                cur = nums1[i]
                i += 1
            else:
                cur = nums2[j]
                j += 1
        return float(cur) if total % 2 else (prev + cur) / 2
```

The merge step of merge sort, stopped halfway: two pointers walk both lists in merged order, keeping the last two values seen. It's easy to trust and uses no extra memory, but it's O(m + n) per call.

## Wrong answers

### Searches the first list even when it's longer

```python wrong fails="edge" test="the first list is much longer"
class Solution:
    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:
        a, b = nums1, nums2  # no swap: a may be the longer list
        m, n = len(a), len(b)
        half = (m + n + 1) // 2
        lo, hi = 0, m
        while lo <= hi:
            i = (lo + hi) // 2
            j = half - i  # can fall outside 0..n when a is longer
            a_left = a[i - 1] if i > 0 else -inf
            a_right = a[i] if i < m else inf
            b_left = b[j - 1] if j > 0 else -inf
            b_right = b[j] if j < n else inf
            if a_left <= b_right and b_left <= a_right:
                if (m + n) % 2:
                    return float(max(a_left, b_left))
                return (max(a_left, b_left) + min(a_right, b_right)) / 2
            if a_left > b_right:
                hi = i - 1
            else:
                lo = i + 1
        return 0.0
```

The cut takes `j = half - i` values from `b`, and that only makes sense when `0 <= j <= n`. If `a` is the longer list, some values of `i` give a negative `j`, and `b[j - 1]` quietly reads from the end of `b`. With `[1, 2, 3, 4, 5, 6]` and `[7]`, a wrong cut passes the check and the answer comes out as 5.0. Searching the shorter list rules this out.

### Averages with integer division

```python wrong fails="edge" test="half-way median"
class Solution:
    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:
        merged = sorted(nums1 + nums2)
        k = len(merged)
        if k % 2:
            return float(merged[k // 2])
        return float((merged[k // 2 - 1] + merged[k // 2]) // 2)  # 9 // 2 is 4, not 4.5
```

The median of an even count is an average, and an average of two integers can end in .5. `//` rounds it down before the conversion to float can help. Use `/`.

### Sorts both lists together on every call

```python wrong fails="perf"
class Solution:
    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:
        merged = sorted(nums1 + nums2)  # copies and sorts 200,000 values
        k = len(merged)
        return float(merged[k // 2]) if k % 2 else (merged[k // 2 - 1] + merged[k // 2]) / 2
```

Correct, and quick for one call. But it copies and sorts every value each time, ignoring that the lists are already sorted. The performance test asks 3,000 times about lists of 100,000 values each.
