---
id: 1368
module: advanced-graphs
patterns: [0-1 BFS, a deque instead of a heap]
signature: "def minCost(self, grid: List[List[int]]) -> int"
no_slow_wrong: with at most 10,000 cells even Dijkstra's algorithm with a heap is fast; 0-1 BFS only saves the log factor
---

## Task

Every cell of an `m × n` grid holds a sign pointing to a neighbour: 1 means right, 2 left, 3 down and 4 up. Standing on a cell, you may only move where its sign points, which may be off the grid.

You start in the top left cell and want to reach the bottom right one. You may change the sign of any cell, at a cost of 1 per cell changed. Return the smallest total cost that makes the bottom right cell reachable by following signs.

## Constraints

- `1 <= m, n <= 100`
- Every cell holds 1, 2, 3 or 4

```json examples
[
  {"args": [[[1, 1, 3], [2, 2, 2]]], "out": 0, "why": "Following the signs from the top left: right, right, then down to the target. Nothing needs changing."},
  {"args": [[[2, 2], [1, 1]]], "out": 1, "why": "The first sign points off the grid. Changing it to point down is enough: from there the sign already points right, to the target."},
  {"args": [[[4, 4, 4], [4, 4, 4], [4, 4, 4]]], "out": 4, "why": "Every sign points up, so each of the four moves to the far corner needs a changed sign."}
]
```

```json edge
[
  {"name": "one cell", "args": [[[3]]], "out": 0},
  {"name": "one row, pointing the wrong way", "args": [[[2, 2, 2]]], "out": 2},
  {"name": "one column", "args": [[[3], [3], [4]]], "out": 0},
  {"name": "a loop of signs", "args": [[[1, 3, 2], [4, 2, 2]]], "out": 1},
  {"name": "the target's own sign doesn't matter", "args": [[[1, 3], [2, 4]]], "out": 0}
]
```

```python oracle
class Solution:
    def minCost(self, grid: List[List[int]]) -> int:
        m, n = len(grid), len(grid[0])
        moves = {1: (0, 1), 2: (0, -1), 3: (1, 0), 4: (-1, 0)}
        dist = {(0, 0): 0}
        heap = [(0, 0, 0)]
        while heap:
            d, r, c = heappop(heap)
            if d > dist[(r, c)]:
                continue
            for sign, (dr, dc) in moves.items():
                nr, nc = r + dr, c + dc
                if 0 <= nr < m and 0 <= nc < n:
                    nd = d + (grid[r][c] != sign)
                    if nd < dist.get((nr, nc), inf):
                        dist[(nr, nc)] = nd
                        heappush(heap, (nd, nr, nc))
        return dist[(m - 1, n - 1)]
```

```python gen
def gen(rng, size):
    m = rng.randint(1, 4) if size == "small" else rng.randint(5, 30)
    n = rng.randint(1, 4) if size == "small" else rng.randint(5, 30)
    return [[[rng.randint(1, 4) for _ in range(n)] for _ in range(m)]]
```

```python perf
def perf(rng):
    # A 100 × 100 grid of random signs.
    return [[[rng.randint(1, 4) for _ in range(100)] for _ in range(100)]]
```

## Hints

1. Make every cell a node with four edges, one to each neighbour. The edge the sign points along is free; the other three cost 1, since using them means changing the sign. The answer is a shortest path.
2. Dijkstra's algorithm works, but edges that cost only 0 or 1 allow something simpler: a **0-1 BFS**.
3. Use a deque. When a free edge improves a cell, push it on the *front*; when a cost-1 edge does, push it on the *back*. Cells then leave the deque in order of cost, like a breadth-first search over costs.

## Solution

```python solution time="m·n" space="m·n"
class Solution:
    def minCost(self, grid: List[List[int]]) -> int:
        m, n = len(grid), len(grid[0])
        moves = ((0, 1), (0, -1), (1, 0), (-1, 0))  # signs 1, 2, 3, 4
        dist = [[inf] * n for _ in range(m)]
        dist[0][0] = 0
        todo = deque([(0, 0)])
        while todo:
            r, c = todo.popleft()
            d = dist[r][c]
            for sign, (dr, dc) in enumerate(moves, 1):
                nr, nc = r + dr, c + dc
                if 0 <= nr < m and 0 <= nc < n:
                    cost = 0 if grid[r][c] == sign else 1
                    if d + cost < dist[nr][nc]:
                        dist[nr][nc] = d + cost
                        if cost:
                            todo.append((nr, nc))  # one more change: the back of the queue
                        else:
                            todo.appendleft((nr, nc))  # same cost: the front
        return dist[m - 1][n - 1]
```

Dijkstra's algorithm needs a heap because costs can be anything. With costs of only 0 and 1, the queue never holds more than two different costs at once, d and d + 1, so a deque keeps them in order: same-cost cells go to the front, next-cost cells to the back. Cells come out in order of cost, just as they would from a heap, and each improvement is O(1) instead of O(log n).

A cell can be pushed more than once if a cheaper route is found later; the extra copies are harmless, because their stored cost no longer improves anything. Every cell has four edges, so the whole search is O(m·n).

## Alternatives

### Dijkstra's algorithm

```python alt time="m·n log(m·n)" space="m·n"
class Solution:
    def minCost(self, grid: List[List[int]]) -> int:
        m, n = len(grid), len(grid[0])
        moves = ((0, 1), (0, -1), (1, 0), (-1, 0))
        dist = [[inf] * n for _ in range(m)]
        dist[0][0] = 0
        heap = [(0, 0, 0)]
        while heap:
            d, r, c = heappop(heap)
            if d > dist[r][c]:
                continue  # an outdated entry
            for sign, (dr, dc) in enumerate(moves, 1):
                nr, nc = r + dr, c + dc
                if 0 <= nr < m and 0 <= nc < n:
                    nd = d + (grid[r][c] != sign)
                    if nd < dist[nr][nc]:
                        dist[nr][nc] = nd
                        heappush(heap, (nd, nr, nc))
        return dist[m - 1][n - 1]
```

The general tool for non-negative edge costs, from [[m:graphs]]. It's correct here and fast enough, just with a log factor that the 0-1 BFS doesn't need. If the costs were 0, 1 and 2, a deque would no longer do, but a heap still would.

## Wrong answers

### Counts moves, not changed signs

```python wrong fails="example" test="Example 1"
class Solution:
    def minCost(self, grid: List[List[int]]) -> int:
        m, n = len(grid), len(grid[0])
        dist = {(0, 0): 0}
        todo = deque([(0, 0)])
        while todo:
            r, c = todo.popleft()
            for dr, dc in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                nr, nc = r + dr, c + dc
                if 0 <= nr < m and 0 <= nc < n and (nr, nc) not in dist:
                    dist[(nr, nc)] = dist[(r, c)] + 1  # every move costs 1, signs ignored
                    todo.append((nr, nc))
        return dist[(m - 1, n - 1)]
```

A plain breadth-first search finds the route with the fewest moves, but the cost is in changed signs, and moving the way a sign already points is free. In Example 1 the route takes 3 moves and changes nothing, so the answer is 0, not 3.

### Treats free moves like paid ones in the queue

```python wrong fails="example" test="Example 2"
class Solution:
    def minCost(self, grid: List[List[int]]) -> int:
        m, n = len(grid), len(grid[0])
        moves = ((0, 1), (0, -1), (1, 0), (-1, 0))
        dist = [[inf] * n for _ in range(m)]
        dist[0][0] = 0
        todo = deque([(0, 0)])
        while todo:
            r, c = todo.popleft()
            for sign, (dr, dc) in enumerate(moves, 1):
                nr, nc = r + dr, c + dc
                if 0 <= nr < m and 0 <= nc < n and dist[nr][nc] == inf:  # first time reached is final
                    dist[nr][nc] = dist[r][c] + (grid[r][c] != sign)
                    todo.append((nr, nc))  # always to the back
        return dist[m - 1][n - 1]
```

A breadth-first search fixes a cell's cost the first time it's reached, which is right only when every edge costs the same. In Example 2 the first sign points off the grid, so each of its neighbours costs one change to reach. The search reaches the target first from the top right, with another paid move, and fixes its cost at 2; the free move from the bottom left, which would make it 1, arrives too late. Putting free moves at the front of the deque is exactly what prevents this.
