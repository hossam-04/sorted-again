---
id: 1584
module: graphs
patterns: [minimum spanning tree, Prim's algorithm on a dense graph]
signature: "def minCostConnectPoints(self, points: List[List[int]]) -> int"
---

## Task

You get points on a grid as `[x, y]` pairs. Connecting two points costs their *Manhattan distance*, |x₁ − x₂| + |y₁ − y₂|. Return the smallest total cost of connections such that every point can reach every other point through them.

## Constraints

- `1 <= len(points) <= 1_000`
- `-10**6 <= x, y <= 10**6`, and all points are different

```json examples
[
  {"args": [[[0, 0], [1, 1], [3, 0]]], "out": 5, "why": "Connect (0, 0) to (1, 1) for 2, then (1, 1) to (3, 0) for 3: 5 in all. Any other pair of connections costs more."},
  {"args": [[[0, 0]]], "out": 0, "why": "A single point needs no connections."},
  {"args": [[[0, 0], [0, 5], [5, 0], [5, 5], [2, 2]]], "out": 19, "why": "Connect the middle point (2, 2) to (0, 0) for 4 and to (0, 5) and (5, 0) for 5 each. (5, 5) is 6 from the middle but only 5 from (0, 5), so it joins there: 4 + 5 + 5 + 5 = 19."}
]
```

```json edge
[
  {"name": "two points", "args": [[[-3, -3], [3, 3]]], "out": 12},
  {"name": "points on a line", "args": [[[0, 0], [10, 0], [20, 0], [30, 0]]], "out": 30},
  {"name": "a unit square", "args": [[[0, 0], [1, 0], [0, 1], [1, 1]]], "out": 3},
  {"name": "far apart", "args": [[[-1000000, -1000000], [1000000, 1000000], [1000000, -1000000]]], "out": 4000000},
  {"name": "a tight cluster and a far point", "args": [[[0, 0], [1, 0], [0, 1], [100, 100]]], "out": 201},
  {"name": "two clusters far apart", "args": [[[0, 0], [1, 0], [100, 0], [101, 0]]], "out": 101}
]
```

```python oracle
class Solution:
    def minCostConnectPoints(self, points: List[List[int]]) -> int:
        n = len(points)
        edges = sorted((abs(a[0] - b[0]) + abs(a[1] - b[1]), i, j)
                       for i, a in enumerate(points) for j, b in enumerate(points) if i < j)
        group = list(range(n))  # Kruskal's algorithm with simple relabelling
        total = 0
        for cost, i, j in edges:
            if group[i] != group[j]:
                old, new = group[j], group[i]
                group = [new if g == old else g for g in group]
                total += cost
        return total
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 5) if size == "small" else rng.randint(5, 40)
    hi = 5 if size == "small" else 1000
    points = set()
    while len(points) < n:
        points.add((rng.randint(-hi, hi), rng.randint(-hi, hi)))
    return [[list(p) for p in points]]
```

```python perf
def perf(rng):
    # 1,000 points: about 500,000 possible connections.
    points = set()
    while len(points) < 1_000:
        points.add((rng.randint(-10**6, 10**6), rng.randint(-10**6, 10**6)))
    return [[list(p) for p in points]]
```

## Hints

1. Points are nodes, and every pair of points is an edge weighted by its distance. The cheapest set of edges that connects everything is a *minimum spanning tree*: n − 1 edges, never a cycle.
2. Prim's algorithm grows the tree from one point: repeatedly add the cheapest edge from a point in the tree to a point outside it.
3. Keep, for every point outside the tree, the cheapest edge to the tree found so far. After adding a point, update those values with its edges. With every pair being an edge, a plain list beats a heap: each step is one scan.

## Solution

```python solution time="n²" space="n"
class Solution:
    def minCostConnectPoints(self, points: List[List[int]]) -> int:
        n = len(points)
        cost = [inf] * n  # cost[j]: the cheapest edge from point j to the tree so far
        cost[0] = 0
        in_tree = [False] * n
        total = 0
        for _ in range(n):
            # the point outside the tree that's cheapest to connect
            i = min((c, j) for j, c in enumerate(cost) if not in_tree[j])[1]
            in_tree[i] = True
            total += cost[i]
            x, y = points[i]
            for j in range(n):  # the new point may offer cheaper edges
                if not in_tree[j]:
                    d = abs(points[j][0] - x) + abs(points[j][1] - y)
                    if d < cost[j]:
                        cost[j] = d
        return total
```

**Prim's algorithm** grows the tree one point at a time, always adding the point outside the tree with the cheapest connection to it. That choice is safe: the cheapest edge crossing between the tree and the rest always belongs to some minimum spanning tree. The `cost` list remembers each outside point's best connection, so after adding a point only its own edges need checking.

Every pair of points is an edge, so the graph is *dense*: about n²/2 edges. Then n steps of two O(n) scans, O(n²) in total, is as good as it gets: a heap would only add a log factor on top.

## Alternatives

### Kruskal's algorithm with union-find

```python alt time="n² log n" space="n²"
class Solution:
    def minCostConnectPoints(self, points: List[List[int]]) -> int:
        n = len(points)
        edges = sorted((abs(a[0] - b[0]) + abs(a[1] - b[1]), i, j)
                       for i, a in enumerate(points) for j, b in enumerate(points) if i < j)
        parent = list(range(n))

        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x

        total, used = 0, 0
        for cost, i, j in edges:  # cheapest edges first
            ri, rj = find(i), find(j)
            if ri != rj:  # skip edges inside a group: they would close a cycle
                parent[ri] = rj
                total += cost
                used += 1
                if used == n - 1:
                    break
        return total
```

**Kruskal's algorithm** takes the edges from cheapest to most expensive and keeps each one that joins two different groups. It's the natural choice when the edges are given as a list. Here it has to create and sort all n²/2 edges first, which is slower and uses far more memory than Prim's.

## Wrong answers

### Adds the n − 1 cheapest edges

```python wrong fails="edge" test="a tight cluster and a far point"
class Solution:
    def minCostConnectPoints(self, points: List[List[int]]) -> int:
        n = len(points)
        edges = sorted(abs(a[0] - b[0]) + abs(a[1] - b[1])
                       for i, a in enumerate(points) for j, b in enumerate(points) if i < j)
        return sum(edges[:n - 1])  # no check for cycles
```

Taking the n − 1 cheapest edges ignores whether they connect anything new. With three points close together and one far away, the three cheapest edges form a triangle among the close points and the far point is never connected, so the sum is far too small. Kruskal's algorithm skips every edge whose ends are already connected.

### Joins each point to its nearest neighbour

```python wrong fails="edge" test="two clusters far apart"
class Solution:
    def minCostConnectPoints(self, points: List[List[int]]) -> int:
        total = 0
        for i, (x, y) in enumerate(points[1:], start=1):
            total += min(abs(x - a) + abs(y - b) for j, (a, b) in enumerate(points) if j != i)  # nearest other point
        return total
```

Connecting every point (except one) to its nearest neighbour gives n − 1 edges, but nothing makes them connect everything. With two pairs of points far apart, each point's nearest neighbour is its partner, so the two pairs are never joined, and a pair can even be counted twice. Edges must be chosen so that each one connects something new.

### Scans every tree-to-outside pair at each step

```python wrong fails="perf"
class Solution:
    def minCostConnectPoints(self, points: List[List[int]]) -> int:
        n = len(points)
        in_tree, outside, total = [0], set(range(1, n)), 0
        while outside:
            best = None
            for i in in_tree:  # every edge between the tree and the rest, each step
                for j in outside:
                    d = abs(points[i][0] - points[j][0]) + abs(points[i][1] - points[j][1])
                    if best is None or d < best[0]:
                        best = (d, j)
            total += best[0]
            in_tree.append(best[1])
            outside.remove(best[1])
        return total
```

This is Prim's rule applied literally: at each step, find the cheapest edge leaving the tree. But looking at every tree-to-outside pair again at every step costs O(n²) per step and O(n³) overall, about 167 million distance computations for 1,000 points. Remembering each outside point's best edge makes each step O(n).
