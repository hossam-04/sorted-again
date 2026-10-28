---
id: 1046
module: heaps
patterns: [max-heap by negation, simulation]
signature: "def lastStoneWeight(self, stones: List[int]) -> int"
no_slow_wrong: the natural slower approach, sorting before every round, is shown as a slow alternative
---

## Task

You get a list of positive integers, `stones`. While at least two numbers are left, take out the two largest, x ≤ y:

- if they're equal, both are gone;
- otherwise put back their difference, y − x.

Return the number that's left at the end, or 0 if none is.

## Constraints

- `1 <= len(stones) <= 100_000`
- `1 <= stones[i] <= 10**6`

```json examples
[
  {"args": [[3, 9, 4]], "out": 2, "why": "9 and 4 leave 5. Then 5 and 3 leave 2, and a single number remains."},
  {"args": [[5, 5, 5, 5]], "out": 0, "why": "Equal numbers cancel completely: the first two 5s leave nothing, and so do the last two."},
  {"args": [[10, 1, 1, 1]], "out": 7, "why": "10 and 1 leave 9, which then meets the next 1, and so on: the big number shrinks by one each round."}
]
```

```json edge
[
  {"name": "one number", "args": [[6]], "out": 6},
  {"name": "two equal numbers", "args": [[4, 4]], "out": 0},
  {"name": "two different numbers", "args": [[2, 9]], "out": 7},
  {"name": "the difference is used again", "args": [[7, 3, 3, 2]], "out": 1},
  {"name": "all ones", "args": [[1, 1, 1]], "out": 1},
  {"name": "large numbers", "args": [[1000000, 999999, 1]], "out": 0}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 6) if size == "small" else rng.randint(10, 300)
    hi = 10 if size == "small" else 1000
    return [[rng.randint(1, hi) for _ in range(n)]]
```

```python perf
def perf(rng):
    # 100,000 numbers up to a million.
    return [[rng.randint(1, 10**6) for _ in range(100_000)]]
```

## Hints

1. Every round needs the two largest numbers, and the list keeps changing. Sorting again before every round works, but it's slow for long lists.
2. A heap gives you the largest number in O(log n) and takes new numbers in O(log n). Python's `heapq` is a min-heap, though: it pops the smallest.
3. Store the negatives: the largest number has the smallest negative, so it comes out first. Remember to flip the sign back when you read a value.

## Solution

```python solution time="n log n" space="n"
class Solution:
    def lastStoneWeight(self, stones: List[int]) -> int:
        heap = [-s for s in stones]  # heapq is a min-heap, so store negatives to pop the largest first
        heapify(heap)
        while len(heap) > 1:
            y = -heappop(heap)  # the largest
            x = -heappop(heap)  # the second largest
            if y != x:
                heappush(heap, -(y - x))
        return -heap[0] if heap else 0
```

The process always needs the current largest numbers, and it adds a new one each round: that's exactly what a max-heap is for. `heapq` only has a min-heap, so the heap holds `-s` for every number s. The smallest of the negatives belongs to the largest number, so `-heappop(heap)` returns the largest.

`heapify` builds the heap in O(n). Each round removes at least one number, so there are fewer than n rounds, each with up to three heap operations of O(log n): O(n log n) in total.

## Alternatives

### Sort before every round

```python alt time="n²" space="n" slow oracle
class Solution:
    def lastStoneWeight(self, stones: List[int]) -> int:
        stones = list(stones)
        while len(stones) > 1:
            stones.sort()
            y, x = stones.pop(), stones.pop()  # the two largest are at the end
            if y != x:
                stones.append(y - x)
        return stones[0] if stones else 0
```

The direct simulation: sort, take the two largest from the end, put the difference back. It's easy to trust, and fine for a few dozen numbers, but every round sorts the whole list again. The list is almost sorted each time, which Python's sort handles in about O(n), so the loop is O(n²): with 100,000 numbers, billions of steps.

### Python 3.14's max-heap functions

```python alt time="n log n" space="n"
class Solution:
    def lastStoneWeight(self, stones: List[int]) -> int:
        heap = list(stones)
        heapify_max(heap)  # new in Python 3.14: max-heap versions of the heapq functions
        while len(heap) > 1:
            y = heappop_max(heap)
            x = heappop_max(heap)
            if y != x:
                heappush_max(heap, y - x)
        return heap[0] if heap else 0
```

Python 3.14 added `heapify_max`, `heappush_max`, `heappop_max` and friends, so no negation is needed. This page runs Python 3.14, but older versions don't have these functions, so negation is still the version that runs everywhere.

## Wrong answers

### Pops the two smallest

```python wrong fails="example" test="Example 1"
class Solution:
    def lastStoneWeight(self, stones: List[int]) -> int:
        heap = list(stones)
        heapify(heap)  # a min-heap: it pops the smallest, not the largest
        while len(heap) > 1:
            y = heappop(heap)
            x = heappop(heap)
            if y != x:
                heappush(heap, abs(y - x))
        return heap[0] if heap else 0
```

`heapq` always pops the *smallest* item, so this pairs up the two smallest numbers instead. With 3, 9 and 4 it combines 3 and 4 first and ends with 8, not 2. Push the negatives to get a max-heap.

### Forgets to flip the sign back

```python wrong fails="example" test="Example 1"
class Solution:
    def lastStoneWeight(self, stones: List[int]) -> int:
        heap = [-s for s in stones]
        heapify(heap)
        while len(heap) > 1:
            y = -heappop(heap)
            x = -heappop(heap)
            if y != x:
                heappush(heap, -(y - x))
        return heap[0] if heap else 0  # still negated
```

The rounds are right, but the heap stores negatives, so `heap[0]` is −2, not 2. Every value read from a negated heap needs its sign flipped, including the last one.
