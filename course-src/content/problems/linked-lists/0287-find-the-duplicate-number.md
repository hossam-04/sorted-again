---
id: 287
module: linked-lists
patterns: [index as pointer, Floyd's cycle detection]
signature: "def findDuplicate(self, nums: List[int]) -> int"
no_mutation: [nums]
---

## Task

You get a list `nums` of `n + 1` integers, each between 1 and `n`. Exactly one value appears more than once (it may appear many times); every other value appears at most once. Return the repeated value.

Don't change `nums`, and use only O(1) extra memory.

## Constraints

- `1 <= n <= 100_000`, and `len(nums) == n + 1`
- `1 <= nums[i] <= n`
- Exactly one value is repeated, possibly several times

```json examples
[
  {"args": [[2, 4, 1, 3, 4]], "out": 4, "why": "Five numbers between 1 and 4: 4 appears twice."},
  {"args": [[5, 1, 5, 2, 5, 3]], "out": 5, "why": "The repeated value can appear more than twice."},
  {"args": [[1, 1]], "out": 1, "why": "The smallest case: n = 1, so both entries are 1."}
]
```

```json edge
[
  {"name": "the duplicate is n", "args": [[1, 3, 2, 3]], "out": 3},
  {"name": "the duplicate is 1", "args": [[1, 2, 3, 1]], "out": 1},
  {"name": "duplicates side by side", "args": [[2, 2, 1, 3]], "out": 2},
  {"name": "only one value", "args": [[2, 2, 2]], "out": 2},
  {"name": "duplicate at both ends", "args": [[3, 1, 2, 4, 3]], "out": 3},
  {"name": "missing values", "args": [[4, 4, 4, 1, 4]], "out": 4}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 6) if size == "small" else rng.randint(20, 300)
    dup = rng.randint(1, n)
    others = [v for v in range(1, n + 1) if v != dup]
    rng.shuffle(others)
    copies = rng.randint(2, n + 1)
    nums = [dup] * copies + others[: n + 1 - copies]  # other values appear at most once
    rng.shuffle(nums)
    return [nums]
```

```python perf
def perf(rng):
    # n = 100,000. Both copies of the duplicate come last, so a search that checks values in order finds it late.
    n = 100_000
    dup = rng.randint(1, n)
    others = [v for v in range(1, n + 1) if v != dup]
    rng.shuffle(others)
    return [others + [dup, dup]]
```

## Hints

1. Treat each value as a pointer: from position `i`, go to position `nums[i]`. Starting at position 0, you follow a path through the list.
2. Position 0 is never pointed to (values start at 1), and the duplicate value is pointed to by two positions. So the path must run into a cycle, and the duplicate is where the cycle begins.
3. Use Floyd's algorithm: slow and fast pointers to find a meeting point inside the cycle, then a second walk from the start to find the cycle's entrance.

## Solution

```python solution time="n" space="1"
class Solution:
    def findDuplicate(self, nums: List[int]) -> int:
        slow = fast = nums[0]
        while True:  # phase 1: meet somewhere inside the cycle
            slow = nums[slow]
            fast = nums[nums[fast]]
            if slow == fast:
                break
        slow = nums[0]  # phase 2: walk from the start and from the meeting point
        while slow != fast:
            slow = nums[slow]
            fast = nums[fast]
        return slow  # the entrance of the cycle is the repeated value
```

Read `nums` as a linked list where index `i` points to index `nums[i]`. There are n + 1 indices but only values 1..n, so following the pointers from index 0 can't go on forever without repeating: it enters a cycle. The duplicate value d is pointed to by two different indices, one on the path into the cycle and one inside it, which makes d the cycle's entrance.

Phase 1 is the cycle detection from [[p:141]]. Phase 2 uses a property of Floyd's algorithm: a pointer starting from the beginning and one starting from the meeting point, both moving one step at a time, meet exactly at the entrance. The list is only read, never changed, and the work is O(n) with O(1) memory.

## Alternatives

### Remember what you've seen

```python alt time="n" space="n" oracle
class Solution:
    def findDuplicate(self, nums: List[int]) -> int:
        seen = set()
        for x in nums:
            if x in seen:
                return x
            seen.add(x)
```

The simplest correct answer, in one pass. It uses O(n) memory, which the task rules out, but it's a good way to start in an interview before improving it.

### Binary search on the value range

```python alt time="n log n" space="1"
class Solution:
    def findDuplicate(self, nums: List[int]) -> int:
        lo, hi = 1, len(nums) - 1
        while lo < hi:
            mid = (lo + hi) // 2
            if sum(x <= mid for x in nums) > mid:  # too many values in 1..mid: the duplicate is there
                hi = mid
            else:
                lo = mid + 1
        return lo
```

Count how many values are at most `mid`. Without a duplicate in 1..mid there could be at most `mid` of them, so more than `mid` means the duplicate is in that range. That's a search on the answer, with an O(n) count per step: O(n log n) time and O(1) memory, without the cycle insight.

## Wrong answers

### Sorts the list to find neighbours

```python wrong fails="example" test="Example 1" how="error"
class Solution:
    def findDuplicate(self, nums: List[int]) -> int:
        nums.sort()  # changes the caller's list
        for a, b in zip(nums, nums[1:]):
            if a == b:
                return a
```

After sorting, the duplicate sits next to itself, and the answer is right. But `nums.sort()` rearranges the caller's list, which the task forbids. The checker compares the list before and after the call.

### Uses the sum formula

```python wrong fails="example" test="Example 2"
class Solution:
    def findDuplicate(self, nums: List[int]) -> int:
        n = len(nums) - 1
        return sum(nums) - n * (n + 1) // 2  # assumes every value 1..n appears and one appears twice
```

If every value from 1 to n appeared once and the duplicate exactly twice, the extra amount would be the duplicate. But the duplicate may appear more than twice, and then some values are missing. In Example 2, the sum is off by a mix of extra 5s and missing values.

### Counts every value

```python wrong fails="perf"
class Solution:
    def findDuplicate(self, nums: List[int]) -> int:
        for x in nums:
            if nums.count(x) > 1:  # a full scan for every element
                return x
```

It doesn't change the list and uses no extra memory, so it satisfies the rules. But `count` scans the whole list for every element: O(n²), about 10 billion comparisons when the duplicate comes late.
