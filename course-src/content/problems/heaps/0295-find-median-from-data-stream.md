---
id: 295
module: heaps
patterns: [two heaps, running median]
kind: design
class: MedianFinder
compare: float
---

## Task

Build a class `MedianFinder` that receives numbers one at a time and can report their median at any moment:

- `MedianFinder()` starts empty.
- `addNum(num)` adds the integer `num`.
- `findMedian()` returns the median of all numbers added so far: the middle number once they're sorted, or the mean of the two middle numbers when there's an even count. It's only called after at least one `addNum`.

Answers within 10⁻⁵ of the exact median are accepted. Tests list the method names called in order, their arguments, and what each call returns.

## Constraints

- `-10**5 <= num <= 10**5`
- At most `100_000` calls in total

```python starter
class MedianFinder:
    def __init__(self):
        pass

    def addNum(self, num: int) -> None:
        pass

    def findMedian(self) -> float:
        pass
```

```json examples
[
  {"ops": ["MedianFinder", "addNum", "addNum", "addNum", "findMedian", "addNum", "findMedian"], "args": [[], [5], [15], [1], [], [4], []], "out": [null, null, null, null, 5.0, null, 4.5], "why": "Sorted, 5, 15 and 1 are 1 5 15, with 5 in the middle. After adding 4 there are two middle numbers, 4 and 5, so the median is their mean, 4.5."},
  {"ops": ["MedianFinder", "addNum", "findMedian", "addNum", "findMedian", "addNum", "findMedian"], "args": [[], [-2], [], [-8], [], [10], []], "out": [null, null, -2.0, null, -5.0, null, -2.0], "why": "The median can be asked for after every number. Halfway between -8 and -2 is -5."},
  {"ops": ["MedianFinder", "addNum", "addNum", "addNum", "addNum", "findMedian"], "args": [[], [4], [4], [4], [1], []], "out": [null, null, null, null, null, 4.0], "why": "Repeated numbers count each time: of 1 4 4 4, the two middle numbers are both 4."}
]
```

```json edge
[
  {"name": "one number", "ops": ["MedianFinder", "addNum", "findMedian"], "args": [[], [7], []], "out": [null, null, 7.0]},
  {"name": "two numbers with an odd sum", "ops": ["MedianFinder", "addNum", "addNum", "findMedian"], "args": [[], [10], [3], []], "out": [null, null, null, 6.5]},
  {"name": "increasing input", "ops": ["MedianFinder", "addNum", "addNum", "addNum", "addNum", "addNum", "addNum", "findMedian"], "args": [[], [1], [2], [3], [4], [5], [6], []], "out": [null, null, null, null, null, null, null, 3.5]},
  {"name": "decreasing input", "ops": ["MedianFinder", "addNum", "addNum", "addNum", "addNum", "findMedian", "addNum", "findMedian"], "args": [[], [9], [7], [5], [3], [], [1], []], "out": [null, null, null, null, null, 6.0, null, 5.0]},
  {"name": "zeros and negatives", "ops": ["MedianFinder", "addNum", "addNum", "addNum", "findMedian"], "args": [[], [0], [-1], [0], []], "out": [null, null, null, null, 0.0]},
  {"name": "extremes", "ops": ["MedianFinder", "addNum", "addNum", "findMedian", "addNum", "findMedian"], "args": [[], [100000], [-100000], [], [100000], []], "out": [null, null, null, 0.0, null, 100000.0]},
  {"name": "asked twice in a row", "ops": ["MedianFinder", "addNum", "addNum", "findMedian", "findMedian"], "args": [[], [2], [8], [], []], "out": [null, null, null, 5.0, 5.0]}
]
```

```python oracle
class MedianFinder:
    def __init__(self):
        self.nums = []

    def addNum(self, num: int) -> None:
        self.nums.append(num)

    def findMedian(self) -> float:
        s = sorted(self.nums)
        n = len(s)
        return float(s[n // 2]) if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2
```

```python gen
def gen(rng, size):
    calls = rng.randint(1, 10) if size == "small" else rng.randint(20, 300)
    hi = 5 if size == "small" else 100_000
    ops, args = ["MedianFinder", "addNum"], [[], [rng.randint(-hi, hi)]]
    for _ in range(calls):
        if rng.random() < 0.6:
            ops.append("addNum")
            args.append([rng.randint(-hi, hi)])
        else:
            ops.append("findMedian")
            args.append([])
    return {"ops": ops, "args": args}
```

```python perf
def perf(rng):
    # 50,000 numbers, then the median asked for 50,000 times.
    ops, args = ["MedianFinder"], [[]]
    for _ in range(50_000):
        ops.append("addNum")
        args.append([rng.randint(-100_000, 100_000)])
    for _ in range(50_000):
        ops.append("findMedian")
        args.append([])
    return {"ops": ops, "args": args}
```

## Hints

1. Keeping every number in a sorted list makes the median easy to read, but each insertion shifts part of the list. All you ever need is the middle.
2. Split the numbers into a lower half and an upper half. If you can see the largest number of the lower half and the smallest of the upper half, the median is one of them, or their mean.
3. Keep the lower half in a max-heap (push negatives) and the upper half in a min-heap, with equal sizes or the lower half one larger. Add each number to the half it belongs in, then move one top across if the sizes drift apart.

## Solution

```python solution time="log n" space="n"
class MedianFinder:
    def __init__(self):
        self.low = []   # the smaller half, as a max-heap (values stored negated)
        self.high = []  # the larger half, as a min-heap

    def addNum(self, num: int) -> None:
        if not self.low or num <= -self.low[0]:
            heappush(self.low, -num)
        else:
            heappush(self.high, num)
        # keep the sizes equal, or the lower half one larger
        if len(self.low) > len(self.high) + 1:
            heappush(self.high, -heappop(self.low))
        elif len(self.high) > len(self.low):
            heappush(self.low, -heappop(self.high))

    def findMedian(self) -> float:
        if len(self.low) > len(self.high):
            return float(-self.low[0])
        return (-self.low[0] + self.high[0]) / 2
```

The two heaps hold the lower and upper halves of the numbers, with two rules: every number in `low` is at most every number in `high`, and `low` has the same size as `high` or one more. Then the middle of the sorted order sits at the tops: with an odd count it's the largest of `low`, and with an even count it's halfway between the two tops.

A new number goes into the half where it belongs, by comparing it with the largest of `low`. That keeps the first rule. If the sizes then drift apart, moving one top to the other heap restores the second rule without breaking the first, since the top of `low` is at most everything in `high`, and the other way round. Each add is a few O(log n) heap operations; `findMedian` just reads the tops in O(1).

## Alternatives

### A sorted list

```python alt time="n" space="n"
class MedianFinder:
    def __init__(self):
        self.nums = []  # always sorted

    def addNum(self, num: int) -> None:
        insort(self.nums, num)

    def findMedian(self) -> float:
        n = len(self.nums)
        if n % 2:
            return float(self.nums[n // 2])
        return (self.nums[n // 2 - 1] + self.nums[n // 2]) / 2
```

Inserting into a sorted list keeps the median one index away. Each insertion is a binary search plus an O(n) shift, which is a fast block move in practice, so this is a perfectly good answer for tens of thousands of numbers. The two heaps stay at O(log n) per add however long the stream gets.

If all the numbers fall in a small range, say 0 to 100, there's an even simpler way: count how many times each value appears, and find the middle by walking the 101 counts.

## Wrong answers

### Rounds the mean down

```python wrong fails="example" test="Example 1"
class MedianFinder:
    def __init__(self):
        self.low = []
        self.high = []

    def addNum(self, num: int) -> None:
        if not self.low or num <= -self.low[0]:
            heappush(self.low, -num)
        else:
            heappush(self.high, num)
        if len(self.low) > len(self.high) + 1:
            heappush(self.high, -heappop(self.low))
        elif len(self.high) > len(self.low):
            heappush(self.low, -heappop(self.high))

    def findMedian(self) -> float:
        if len(self.low) > len(self.high):
            return -self.low[0]
        return (-self.low[0] + self.high[0]) // 2  # integer division
```

`//` divides and rounds down, so the mean of 4 and 5 comes out as 4 instead of 4.5. Use `/`, which always gives a float in Python 3.

### Balances the sizes but not the order

```python wrong fails="example" test="Example 2"
class MedianFinder:
    def __init__(self):
        self.low = []
        self.high = []

    def addNum(self, num: int) -> None:
        if len(self.low) == len(self.high):
            heappush(self.low, -num)  # the sizes stay balanced, but the halves can overlap
        else:
            heappush(self.high, num)

    def findMedian(self) -> float:
        if len(self.low) > len(self.high):
            return float(-self.low[0])
        return (-self.low[0] + self.high[0]) / 2
```

Alternating between the heaps keeps the sizes right, but it ignores the values: 10 lands in the "lower" half even though it's the largest number so far. In Example 2 the last median comes out as 10 instead of −2. A new number must go to the half where it belongs, and only then may one top move across to fix the sizes.

### Sorts the numbers for every median

```python wrong fails="perf"
class MedianFinder:
    def __init__(self):
        self.nums = []

    def addNum(self, num: int) -> None:
        self.nums.append(num)

    def findMedian(self) -> float:
        s = sorted(self.nums)  # a full sort on every call
        n = len(s)
        return float(s[n // 2]) if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2
```

Sorting on demand is correct, and fine if the median is asked for once. Here it's asked for 50,000 times, and each call sorts all 50,000 numbers from scratch. The two heaps keep the median ready at all times.
