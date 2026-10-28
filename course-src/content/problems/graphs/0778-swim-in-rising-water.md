---
id: 778
module: graphs
patterns: [minimax path, Dijkstra's algorithm with max instead of sum]
signature: "def swimInWater(self, grid: List[List[int]]) -> int"
---

## Task

An `n × n` grid holds land elevations; the values are 0 to n² − 1, each exactly once. Rain starts falling, and at time `t` the water stands at level `t` everywhere. You can swim from a cell to a cell above, below, left or right of it when both cells' elevations are at most `t`, and swimming takes no time at all.

You start at the top left cell. Return the earliest time `t` at which you can reach the bottom right cell.

## Constraints

- `1 <= n <= 200`
- The values are `0, 1, ..., n² − 1` in some order

```json examples
[
  {"args": [[[0, 1], [2, 3]]], "out": 3, "why": "The bottom right cell itself has elevation 3, so you can't swim into it before time 3, whichever way you come."},
  {"args": [[[0, 1, 2], [7, 8, 3], [6, 5, 4]]], "out": 4, "why": "The way around the edge, 0 → 1 → 2 → 3 → 4, never goes above 4. Any way through the middle needs 8."},
  {"args": [[[3, 0], [1, 2]]], "out": 3, "why": "You start on a cell of elevation 3, so you can't leave it before time 3."}
]
```

```json edge
[
  {"name": "a single cell", "args": [[[0]]], "out": 0},
  {"name": "the low way round", "args": [[[0, 3], [2, 1]]], "out": 2},
  {"name": "down the side and along the bottom", "args": [[[0, 8, 7], [1, 5, 6], [2, 3, 4]]], "out": 4},
  {"name": "the start is the highest cell", "args": [[[8, 0, 1], [7, 2, 3], [6, 5, 4]]], "out": 8}
]
```

```python oracle
class Solution:
    def swimInWater(self, grid: List[List[int]]) -> int:
        n = len(grid)
        for t in range(n * n):  # the first water level at which a path exists
            if grid[0][0] > t:
                continue
            seen, stack = {(0, 0)}, [(0, 0)]
            while stack:
                r, c = stack.pop()
                for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                    if 0 <= nr < n and 0 <= nc < n and (nr, nc) not in seen and grid[nr][nc] <= t:
                        seen.add((nr, nc))
                        stack.append((nr, nc))
            if (n - 1, n - 1) in seen:
                return t
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 3) if size == "small" else rng.randint(3, 8)
    values = list(range(n * n))
    rng.shuffle(values)
    return [[values[r * n:(r + 1) * n] for r in range(n)]]
```

```python perf
def perf(rng):
    # 200 × 200, numbered along a snake: row 0 left to right, row 1 right to left, and so on. The bottom
    # right cell comes late in the snake, so the water has to rise to 39,800.
    n = 200
    grid = [[0] * n for _ in range(n)]
    for r in range(n):
        for i in range(n):
            grid[r][i if r % 2 == 0 else n - 1 - i] = r * n + i
    return [grid]
```

## Hints

1. A path is possible at time t exactly when every cell on it has elevation at most t. So you want the path whose *highest* cell is as low as possible.
2. That's a shortest-path problem where a path's "length" is its maximum elevation instead of the sum of its steps. Dijkstra's algorithm works the same way with `max` in place of `+`.
3. Keep a min-heap of (highest elevation so far, cell), starting with the start cell's own elevation. Pop the lowest; the first time you pop the bottom right cell, its value is the answer.

## Solution

```python solution time="n² log n" space="n²"
class Solution:
    def swimInWater(self, grid: List[List[int]]) -> int:
        n = len(grid)
        heap = [(grid[0][0], 0, 0)]  # (the highest elevation on the way here, row, column)
        seen = {(0, 0)}
        while heap:
            level, r, c = heappop(heap)
            if (r, c) == (n - 1, n - 1):
                return level  # popped in order of level: this is the lowest possible
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < n and 0 <= nc < n and (nr, nc) not in seen:
                    seen.add((nr, nc))
                    heappush(heap, (max(level, grid[nr][nc]), nr, nc))
```

The heap always expands the reachable cell with the lowest water level needed to get there, exactly like Dijkstra's algorithm expands the nearest node. Taking `max` along a path never decreases, just as adding non-negative weights never does, so the first time a cell comes out of the heap its level is the lowest possible. A cell's level is known as soon as it's pushed here, because it only depends on the level of the cell it was reached from and its own elevation, so cells can be marked when they're pushed.

There are n² cells and each is pushed once, so the time is O(n² log n).

## Alternatives

### Binary search on the time

```python alt time="n² log n" space="n²"
class Solution:
    def swimInWater(self, grid: List[List[int]]) -> int:
        n = len(grid)

        def can_reach(t):
            if grid[0][0] > t:
                return False
            seen, stack = {(0, 0)}, [(0, 0)]
            while stack:
                r, c = stack.pop()
                if (r, c) == (n - 1, n - 1):
                    return True
                for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                    if 0 <= nr < n and 0 <= nc < n and (nr, nc) not in seen and grid[nr][nc] <= t:
                        seen.add((nr, nc))
                        stack.append((nr, nc))
            return False

        lo, hi = 0, n * n - 1
        while lo < hi:  # the smallest t that works
            mid = (lo + hi) // 2
            if can_reach(mid):
                hi = mid
            else:
                lo = mid + 1
        return lo
```

"Can I get there at time t?" is false up to the answer and true from then on, so binary search on t finds the answer with about 2·log₂ n searches of the grid. It's the "search over the answer" idea from [[m:binary-search]].

## Wrong answers

### Counts the moves

```python wrong fails="example" test="Example 1"
class Solution:
    def swimInWater(self, grid: List[List[int]]) -> int:
        n = len(grid)
        queue, seen = deque([(0, 0, 0)]), {(0, 0)}
        while queue:
            r, c, moves = queue.popleft()
            if (r, c) == (n - 1, n - 1):
                return moves  # the length of the shortest path, not the water level
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < n and 0 <= nc < n and (nr, nc) not in seen:
                    seen.add((nr, nc))
                    queue.append((nr, nc, moves + 1))
```

Swimming takes no time; what you wait for is the water. The number of moves on a path has nothing to do with the answer: in Example 1 the bottom right cell is two moves away but needs the water at level 3. The cost of a path is its highest elevation.

### Forgets the starting cell

```python wrong fails="example" test="Example 3"
class Solution:
    def swimInWater(self, grid: List[List[int]]) -> int:
        n = len(grid)
        heap, seen = [(0, 0, 0)], {(0, 0)}  # starts at level 0, whatever the start's elevation
        while heap:
            level, r, c = heappop(heap)
            if (r, c) == (n - 1, n - 1):
                return level
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < n and 0 <= nc < n and (nr, nc) not in seen:
                    seen.add((nr, nc))
                    heappush(heap, (max(level, grid[nr][nc]), nr, nc))
```

You also have to be able to leave the starting cell, so its elevation counts like every other cell on the path. In Example 3 the start is at elevation 3, and the answer can't be lower than that. Start the heap with `grid[0][0]`.

### Tries every water level in turn

```python wrong fails="perf"
class Solution:
    def swimInWater(self, grid: List[List[int]]) -> int:
        n = len(grid)
        for t in range(n * n):  # level 0, 1, 2, ...: a whole search for each
            if grid[0][0] > t:
                continue
            seen, stack = {(0, 0)}, [(0, 0)]
            while stack:
                r, c = stack.pop()
                for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                    if 0 <= nr < n and 0 <= nc < n and (nr, nc) not in seen and grid[nr][nc] <= t:
                        seen.add((nr, nc))
                        stack.append((nr, nc))
            if (n - 1, n - 1) in seen:
                return t
```

Checking each level from 0 upwards is correct, but in the test the elevations run along a snake: the answer is 39,800, and the search at level t covers t cells, about 800 million steps in all. Binary search needs about 16 checks; Dijkstra's algorithm needs one pass.
