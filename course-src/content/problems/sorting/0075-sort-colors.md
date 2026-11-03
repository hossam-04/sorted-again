---
id: 75
module: sorting
patterns: [three-way partition, Dutch national flag, counting sort]
signature: "def sortColors(self, nums: List[int]) -> None"
adapter: in-place
inplace: 0
---

## Task

A list holds only the values `0`, `1` and `2`, standing for three colours. Rearrange it **in place** so that all the 0s come first, then all the 1s, then all the 2s. Don't use Python's `sort` or `sorted`.

The function returns nothing: the checker reads `nums` after your function has run. Try to do it in one pass over the list, with O(1) extra memory.

## Constraints

- `1 <= len(nums) <= 100_000`
- every `nums[i]` is `0`, `1` or `2`

```json examples
[
  {"args": [[1, 2, 0, 1, 0]], "out": [0, 0, 1, 1, 2], "why": "Two 0s, two 1s and one 2, in that order."},
  {"args": [[2, 2, 1]], "out": [1, 2, 2], "why": "No 0s at all: the 1 moves to the front."},
  {"args": [[0, 1, 2, 0]], "out": [0, 0, 1, 2], "why": "Only the last 0 is out of place."}
]
```

```json edge
[
  {"name": "a single value", "args": [[1]], "out": [1]},
  {"name": "two values out of order", "args": [[1, 0]], "out": [0, 1]},
  {"name": "twos at both ends", "args": [[2, 1, 2]], "out": [1, 2, 2]},
  {"name": "all the same colour", "args": [[2, 2, 2, 2]], "out": [2, 2, 2, 2]},
  {"name": "sorted backwards", "args": [[2, 2, 1, 1, 0, 0]], "out": [0, 0, 1, 1, 2, 2]},
  {"name": "only 0s and 2s", "args": [[2, 0, 2, 0, 0]], "out": [0, 0, 0, 2, 2]}
]
```

```python oracle
class Solution:
    def sortColors(self, nums: List[int]) -> None:
        nums[:] = sorted(nums)
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 8) if size == "small" else rng.randint(8, 200)
    colours = rng.choice([[0, 1, 2], [0, 2], [1, 2], [0, 1]])
    return [[rng.choice(colours) for _ in range(n)]]
```

```python perf
def perf(rng):
    # 100,000 colours in random order.
    return [[rng.randint(0, 2) for _ in range(100_000)]]
```

## Hints

1. Counting how many 0s, 1s and 2s there are, then writing them back, takes two passes. One pass is possible too.
2. Keep three regions: 0s at the front, 2s at the back, and 1s in between, with the unexamined values between the 1s and the 2s.
3. Use three pointers: `lo` (where the next 0 goes), `mid` (the value being examined) and `hi` (where the next 2 goes). After swapping a value in from `hi`, don't move `mid`: the value it got hasn't been examined yet.

## Solution

```python solution time="n" space="1"
class Solution:
    def sortColors(self, nums: List[int]) -> None:
        lo, mid, hi = 0, 0, len(nums) - 1
        while mid <= hi:  # nums[mid..hi] is still unexamined
            if nums[mid] == 0:
                nums[lo], nums[mid] = nums[mid], nums[lo]
                lo += 1
                mid += 1
            elif nums[mid] == 1:
                mid += 1
            else:
                nums[mid], nums[hi] = nums[hi], nums[mid]
                hi -= 1  # mid stays: the value that came from hi is unexamined
```

This is the three-way partition from quicksort, with 1 as the pivot. The invariant is that `nums[:lo]` holds 0s, `nums[lo:mid]` holds 1s, `nums[hi + 1:]` holds 2s, and `nums[mid:hi + 1]` hasn't been looked at yet. Each step shrinks the unexamined part by one, so the loop runs at most n times.

A 0 swaps with the first 1 (or with itself), and both pointers move on. A 2 swaps with whatever sits at `hi`, which hasn't been examined, so `mid` must look at it next.

## Alternatives

### Count, then write the colours back

```python alt time="n" space="1"
class Solution:
    def sortColors(self, nums: List[int]) -> None:
        count = [0, 0, 0]
        for x in nums:
            count[x] += 1
        i = 0
        for colour in range(3):
            for _ in range(count[colour]):
                nums[i] = colour
                i += 1
```

Counting sort with three possible values. It's two passes instead of one, and just as fast in practice. It's the right idea when the values are known and few. With objects that carry other data alongside their colour, though, it would rebuild the values instead of moving the objects.

## Wrong answers

### Moves on after swapping with the end

```python wrong fails="example" test="Example 3"
class Solution:
    def sortColors(self, nums: List[int]) -> None:
        lo, mid, hi = 0, 0, len(nums) - 1
        while mid <= hi:
            if nums[mid] == 0:
                nums[lo], nums[mid] = nums[mid], nums[lo]
                lo += 1
                mid += 1
            elif nums[mid] == 1:
                mid += 1
            else:
                nums[mid], nums[hi] = nums[hi], nums[mid]
                hi -= 1
                mid += 1  # skips the value that just came from hi
```

The value swapped in from `hi` hasn't been examined, and it can be a 0 or a 2 that's now in the wrong region. In Example 3, the 2 at position 2 swaps with the 0 at the end, and `mid` moves straight past that 0, which stays in the middle: `[0, 1, 0, 2]`.

### Stops one value early

```python wrong fails="example" test="Example 3"
class Solution:
    def sortColors(self, nums: List[int]) -> None:
        lo, mid, hi = 0, 0, len(nums) - 1
        while mid < hi:  # the value at hi is never examined
            if nums[mid] == 0:
                nums[lo], nums[mid] = nums[mid], nums[lo]
                lo += 1
                mid += 1
            elif nums[mid] == 1:
                mid += 1
            else:
                nums[mid], nums[hi] = nums[hi], nums[mid]
                hi -= 1
```

`hi` points at the last *unexamined* value, not past it, so the loop must still run when `mid == hi`. With `<`, the last unexamined value is never looked at. In Example 3, the 2 swaps with the 0 at the end, which then sits at `mid == hi`, so the loop stops and leaves `[0, 1, 0, 2]`.

### Bubble sort

```python wrong fails="perf"
class Solution:
    def sortColors(self, nums: List[int]) -> None:
        n = len(nums)
        for i in range(n):
            swapped = False
            for j in range(n - 1 - i):
                if nums[j] > nums[j + 1]:
                    nums[j], nums[j + 1] = nums[j + 1], nums[j]
                    swapped = True
            if not swapped:
                break
```

It's correct, but it ignores that there are only three values. Swapping neighbours fixes one out-of-order pair at a time, and 100,000 random colours have about 1.7 billion such pairs. The three-way partition puts each value in its region with at most one swap.
