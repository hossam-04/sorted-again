---
id: 1851
module: intervals
patterns: [offline queries, sort and sweep, min-heap with lazy removal]
signature: "def minInterval(self, intervals: List[List[int]], queries: List[int]) -> List[int]"
---

## Task

You get a list of intervals `[left, right]`, which include both ends, and a list of `queries`. The *size* of an interval is the number of whole numbers in it, `right − left + 1`.

For each query `q`, find the smallest interval that contains it, `left <= q <= right`, and answer with its size, or `-1` if no interval contains `q`. Return the answers in the same order as the queries.

## Constraints

- `1 <= len(intervals), len(queries) <= 50_000`
- `1 <= left <= right <= 10**7`, `1 <= q <= 10**7`

```json examples
[
  {"args": [[[1, 3], [2, 8], [5, 6]], [2, 6, 9]], "out": [3, 2, -1], "why": "2 is in [1, 3] (size 3) and [2, 8] (size 7): the smaller is 3. 6 is in [2, 8] and [5, 6]: 2. No interval reaches 9."},
  {"args": [[[4, 4], [1, 10]], [4, 5, 4]], "out": [1, 10, 1], "why": "The single point [4, 4] has size 1. Answers follow the order of the queries, even when a query repeats."},
  {"args": [[[10, 20]], [5, 25, 15]], "out": [-1, -1, 11], "why": "5 and 25 are outside [10, 20]; 15 is inside, and the interval has 11 numbers."}
]
```

```json edge
[
  {"name": "a single point", "args": [[[7, 7]], [7]], "out": [1]},
  {"name": "on both ends", "args": [[[1, 5], [5, 9]], [5, 1, 9]], "out": [5, 5, 5]},
  {"name": "nested intervals", "args": [[[1, 100], [40, 60], [45, 55], [48, 52]], [50, 41, 99, 101]], "out": [5, 21, 100, -1]},
  {"name": "a gap between intervals", "args": [[[3, 4], [1, 2]], [2, 3, 5]], "out": [2, 2, -1]}
]
```

```python oracle
class Solution:
    def minInterval(self, intervals: List[List[int]], queries: List[int]) -> List[int]:
        out = []
        for q in queries:  # check every interval for every query
            sizes = [r - l + 1 for l, r in intervals if l <= q <= r]
            out.append(min(sizes) if sizes else -1)
        return out
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 4) if size == "small" else rng.randint(4, 15)
    hi = 15 if size == "small" else 60
    intervals = []
    for _ in range(n):
        left = rng.randint(1, hi)
        intervals.append([left, rng.randint(left, min(hi, left + hi // 3))])
    queries = [rng.randint(1, hi) for _ in range(rng.randint(1, 5) if size == "small" else rng.randint(4, 15))]
    return [intervals, queries]
```

```python perf
def perf(rng):
    # 50,000 intervals and 50,000 queries spread over 1 to 10 million.
    intervals = []
    for _ in range(50_000):
        left = rng.randint(1, 10**7)
        intervals.append([left, min(10**7, left + rng.randint(0, 10**5))])
    return [intervals, [rng.randint(1, 10**7) for _ in range(50_000)]]
```

## Hints

1. Answering each query on its own means looking at every interval: O(n·q). The queries don't have to be answered in the order they're given, as long as each answer goes to the right place.
2. Sort the queries (remembering their positions) and the intervals by left end. Sweeping the queries from small to large, the intervals that have *started* only ever grow.
3. Keep those started intervals in a min-heap by size. Before answering a query, pop intervals from the top that end before it; the top is then the smallest interval containing the query.

## Solution

```python solution time="(n + q) log n" space="n + q"
class Solution:
    def minInterval(self, intervals: List[List[int]], queries: List[int]) -> List[int]:
        intervals = sorted(intervals)  # by left end
        answers = [-1] * len(queries)
        heap, i = [], 0  # (size, right) of every interval that has started
        for q, pos in sorted((q, pos) for pos, q in enumerate(queries)):
            while i < len(intervals) and intervals[i][0] <= q:
                left, right = intervals[i]
                heappush(heap, (right - left + 1, right))
                i += 1
            while heap and heap[0][1] < q:  # the smallest one ended before q: it's useless from now on
                heappop(heap)
            if heap:
                answers[pos] = heap[0][0]
        return answers
```

The queries are answered **offline**: in an order that suits the algorithm, with each answer written back to its query's position. Taking the queries in increasing order, every interval whose left end is at most the query goes into the heap once and for all.

The heap may also hold intervals that ended before the query, but those are only removed when they reach the top. That's enough: an interval that ended before this query ends before every later query too, so popping it is always safe, and anything still at the top after the pops contains the query. Every interval is pushed and popped at most once: O((n + q) log n) after sorting.

## Alternatives

### Smallest intervals first, filling each query's answer once

```python alt time="n log n + q log q + n · α(q)" space="q"
class Solution:
    def minInterval(self, intervals: List[List[int]], queries: List[int]) -> List[int]:
        values = sorted(set(queries))
        nxt = list(range(len(values) + 1))  # nxt[k]: the first unanswered value at index k or later

        def find(k):
            while nxt[k] != k:
                nxt[k] = nxt[nxt[k]]
                k = nxt[k]
            return k

        best = {}
        for left, right in sorted(intervals, key=lambda iv: iv[1] - iv[0]):  # smallest first
            k = find(bisect_left(values, left))
            while k < len(values) and values[k] <= right:
                best[values[k]] = right - left + 1  # the first interval to reach a value is the smallest
                nxt[k] = k + 1  # mark it answered
                k = find(k + 1)
        return [best.get(q, -1) for q in queries]
```

Taking intervals from smallest to largest, the first interval that covers a query value gives its answer, and that value never needs looking at again. A union-find over the sorted query values skips straight past the answered ones, so each value is filled in once.

## Wrong answers

### Returns the answers in sorted order

```python wrong fails="example" test="Example 2"
class Solution:
    def minInterval(self, intervals: List[List[int]], queries: List[int]) -> List[int]:
        intervals = sorted(intervals)
        answers, heap, i = [], [], 0
        for q in sorted(queries):  # the original positions are lost
            while i < len(intervals) and intervals[i][0] <= q:
                left, right = intervals[i]
                heappush(heap, (right - left + 1, right))
                i += 1
            while heap and heap[0][1] < q:
                heappop(heap)
            answers.append(heap[0][0] if heap else -1)
        return answers
```

Sorting the queries is what makes the sweep work, but the answers must come back in the original order. In Example 2, the queries 4, 5, 4 are answered as 4, 4, 5, so the result reads `[1, 1, 10]` instead of `[1, 10, 1]`. Sort pairs of (query, position) and write each answer to its position.

### Measures size without the + 1

```python wrong fails="example" test="Example 1"
class Solution:
    def minInterval(self, intervals: List[List[int]], queries: List[int]) -> List[int]:
        intervals = sorted(intervals)
        answers = [-1] * len(queries)
        heap, i = [], 0
        for q, pos in sorted((q, pos) for pos, q in enumerate(queries)):
            while i < len(intervals) and intervals[i][0] <= q:
                left, right = intervals[i]
                heappush(heap, (right - left, right))  # the length, not the number of points
                i += 1
            while heap and heap[0][1] < q:
                heappop(heap)
            if heap:
                answers[pos] = heap[0][0]
        return answers
```

The intervals include both ends, so `[1, 3]` holds 1, 2 and 3: size 3, not 2. `right − left` is the length on a number line; the size here counts whole numbers, `right − left + 1`.

### Never drops intervals that have ended

```python wrong fails="example" test="Example 1"
class Solution:
    def minInterval(self, intervals: List[List[int]], queries: List[int]) -> List[int]:
        intervals = sorted(intervals)
        answers = [-1] * len(queries)
        heap, i = [], 0
        for q, pos in sorted((q, pos) for pos, q in enumerate(queries)):
            while i < len(intervals) and intervals[i][0] <= q:
                left, right = intervals[i]
                heappush(heap, (right - left + 1, right))
                i += 1
            if heap:  # the top may have ended long ago
                answers[pos] = heap[0][0]
        return answers
```

An interval that started before a query may also have ended before it. Without popping those, the small `[5, 6]` stays on top of the heap and answers the query 9, which nothing contains. Pop from the top while its right end is smaller than the query.

### Checks every interval for every query

```python wrong fails="perf"
class Solution:
    def minInterval(self, intervals: List[List[int]], queries: List[int]) -> List[int]:
        answers = []
        for q in queries:
            best = -1
            for left, right in intervals:  # all n intervals, q times
                if left <= q <= right and (best == -1 or right - left + 1 < best):
                    best = right - left + 1
            answers.append(best)
        return answers
```

Scanning all intervals for each query is the definition, and it's correct, but with 50,000 of each it's 2.5 billion checks. Sorting both lists lets one sweep handle every query.
