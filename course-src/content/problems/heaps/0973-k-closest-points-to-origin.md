---
id: 973
module: heaps
patterns: [size-k max-heap, top k, squared distances]
signature: "def kClosest(self, points: List[List[int]], k: int) -> List[List[int]]"
compare: unordered
---

## Task

You get points on a grid as `[x, y]` pairs and a number k. Return the k points nearest to the origin, (0, 0), in any order. Distance is the ordinary straight-line distance, √(x² + y²).

The tests always have exactly one right set of points: the k-th and (k + 1)-th nearest points are never at the same distance. The same point may appear more than once in the list; each copy counts as a separate point.

## Constraints

- `1 <= k <= len(points) <= 100_000`
- `-10**4 <= x, y <= 10**4`

```json examples
[
  {"args": [[[2, 2], [-1, 0], [3, -4], [0, 5]], 2], "out": [[-1, 0], [2, 2]], "why": "The squared distances are 8, 1, 25 and 25, so the two nearest are (-1, 0) and (2, 2). The tie at 25 doesn't matter: neither of those points is chosen."},
  {"args": [[[0, 5], [3, 3], [4, -4]], 1], "out": [[3, 3]], "why": "(3, 3) is nearest, with squared distance 18 against 25 and 32, even though 3 + 3 is more than 0 + 5: distance is measured in a straight line."},
  {"args": [[[1, 1], [-1, -1], [6, 0]], 3], "out": [[1, 1], [-1, -1], [6, 0]], "why": "When k is the number of points, every point is in the answer."}
]
```

```json edge
[
  {"name": "the origin itself", "args": [[[1, 0], [0, 0]], 1], "out": [[0, 0]]},
  {"name": "one point", "args": [[[7, -7]], 1], "out": [[7, -7]]},
  {"name": "ties inside the answer", "args": [[[3, 4], [-3, -4], [5, 0], [6, 0]], 3], "out": [[3, 4], [-3, -4], [5, 0]]},
  {"name": "the same point twice", "args": [[[2, 1], [2, 1], [9, 9]], 2], "out": [[2, 1], [2, 1]]},
  {"name": "large coordinates", "args": [[[10000, 10000], [-10000, 9999]], 1], "out": [[-10000, 9999]]},
  {"name": "only negative coordinates", "args": [[[-2, -3], [-1, -5], [-4, 0]], 2], "out": [[-2, -3], [-4, 0]]}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 6) if size == "small" else rng.randint(10, 200)
    hi = 5 if size == "small" else 1000
    while True:  # the k nearest must be unambiguous
        points = [[rng.randint(-hi, hi), rng.randint(-hi, hi)] for _ in range(n)]
        k = rng.randint(1, n)
        d = sorted(x * x + y * y for x, y in points)
        if k == n or d[k - 1] != d[k]:
            return [points, k]
```

```python perf
def perf(rng):
    # 100,000 points, k = 50,000.
    points = [[rng.randint(-10_000, 10_000), rng.randint(-10_000, 10_000)] for _ in range(100_000)]
    return [points, 50_000]
```

## Hints

1. Comparing squared distances, x² + y², gives the same order as comparing distances, and needs no square roots.
2. Sorting all the points by distance works in O(n log n). With a heap you can instead keep just the k nearest points seen so far.
3. Keep those k points in a max-heap by distance (push negated distances), so the farthest of them is on top. A new point that's nearer than the top replaces it.

## Solution

```python solution time="n log k" space="k"
class Solution:
    def kClosest(self, points: List[List[int]], k: int) -> List[List[int]]:
        heap = []  # the k nearest so far, as (-squared distance, x, y): the farthest of them is on top
        for x, y in points:
            d = x * x + y * y
            if len(heap) < k:
                heappush(heap, (-d, x, y))
            elif d < -heap[0][0]:
                heapreplace(heap, (-d, x, y))  # nearer than the farthest kept point: swap them
        return [[x, y] for _, x, y in heap]
```

The heap holds the k nearest points seen so far. To decide whether a new point belongs, it only needs to be compared with the *farthest* of them, so that one should be on top: a max-heap by distance, made from `heapq` by pushing negated distances. If the new point is nearer, `heapreplace` pops the farthest and pushes the new one in a single step.

Squared distances keep everything in exact integers, and the tuples compare by distance first. Each point costs at most one O(log k) heap operation, so the whole scan is O(n log k), and only k points are stored. When k is close to n, simply sorting is just as good.

## Alternatives

### Sort by distance

```python alt time="n log n" space="n" oracle
class Solution:
    def kClosest(self, points: List[List[int]], k: int) -> List[List[int]]:
        return sorted(points, key=lambda p: p[0] * p[0] + p[1] * p[1])[:k]
```

Sort everything by squared distance and keep the first k. It's one line and fast in practice, O(n log n). The heap version wins when k is much smaller than n, or when the points arrive one at a time and you can't keep them all.

### `heapq.nsmallest`

```python alt time="n log k" space="k"
class Solution:
    def kClosest(self, points: List[List[int]], k: int) -> List[List[int]]:
        return nsmallest(k, points, key=lambda p: p[0] * p[0] + p[1] * p[1])
```

`heapq.nsmallest` runs the same size-k heap internally and returns the k smallest items by the key. It's the idiomatic one-liner when you don't need to write the heap yourself.

## Wrong answers

### Keeps the k farthest points

```python wrong fails="example" test="Example 1"
class Solution:
    def kClosest(self, points: List[List[int]], k: int) -> List[List[int]]:
        heap = []
        for x, y in points:
            heappush(heap, (x * x + y * y, x, y))
            if len(heap) > k:
                heappop(heap)  # removes the nearest point, not the farthest
        return [[x, y] for _, x, y in heap]
```

With a min-heap by distance, the top is the *nearest* point, so trimming the heap throws away the points you want. In Example 1 it ends with (3, −4) and (0, 5), the two farthest. To keep the k smallest, the heap's top must be the largest of them: negate the distances.

### Measures distance in blocks

```python wrong fails="example" test="Example 2"
class Solution:
    def kClosest(self, points: List[List[int]], k: int) -> List[List[int]]:
        return sorted(points, key=lambda p: abs(p[0]) + abs(p[1]))[:k]  # not the straight-line distance
```

|x| + |y| is the distance along grid lines, which orders points differently from the straight line. (0, 5) is 5 blocks away and (3, 3) is 6, but (3, 3) is nearer in a straight line: √18 against √25. Compare x² + y².

### Finds the nearest point k times

```python wrong fails="perf"
class Solution:
    def kClosest(self, points: List[List[int]], k: int) -> List[List[int]]:
        points = list(points)
        out = []
        for _ in range(k):  # each round scans every remaining point
            best = min(points, key=lambda p: p[0] * p[0] + p[1] * p[1])
            points.remove(best)
            out.append(best)
        return out
```

Picking the nearest remaining point k times is correct, but each pick scans the whole list, and so does each `remove`. With 100,000 points and k = 50,000 that's billions of steps. Sort once, or keep a heap.
