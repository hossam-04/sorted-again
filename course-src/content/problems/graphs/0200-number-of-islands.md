---
id: 200
module: graphs
patterns: [grid as a graph, flood fill, breadth-first search]
signature: "def numIslands(self, grid: List[List[str]]) -> int"
---

## Task

A map is a grid of `"1"` (land) and `"0"` (water) cells. An *island* is a group of land cells connected horizontally or vertically; cells that touch only at a corner are not connected. Everything outside the grid is water.

Return the number of islands.

## Constraints

- `1 <= rows, columns <= 500`
- Every cell is `"0"` or `"1"`

```json examples
[
  {"args": [[["1", "1", "0", "0"], ["0", "1", "0", "1"], ["1", "0", "0", "1"]]], "out": 3, "why": "Three islands: the top left one, the two cells on the right, and the single cell at the bottom left, which touches the first island only at a corner."},
  {"args": [[["0", "0"], ["0", "0"]]], "out": 0, "why": "No land, no islands."},
  {"args": [[["1", "1", "1"], ["1", "0", "1"], ["1", "1", "1"]]], "out": 1, "why": "The land forms a ring around a water cell, but it's one connected island."}
]
```

```json edge
[
  {"name": "one land cell", "args": [[["1"]]], "out": 1},
  {"name": "one water cell", "args": [[["0"]]], "out": 0},
  {"name": "a checkerboard", "args": [[["1", "0", "1"], ["0", "1", "0"], ["1", "0", "1"]]], "out": 5},
  {"name": "one row", "args": [[["1", "0", "1", "1", "0", "1"]]], "out": 3},
  {"name": "one column", "args": [[["1"], ["0"], ["1"], ["1"]]], "out": 2},
  {"name": "all land", "args": [[["1", "1", "1", "1"], ["1", "1", "1", "1"], ["1", "1", "1", "1"]]], "out": 1},
  {"name": "a lake inside an island", "args": [[["1", "1", "1", "0", "0"], ["1", "0", "1", "0", "0"], ["1", "1", "1", "0", "0"], ["0", "0", "0", "1", "1"]]], "out": 2}
]
```

```python oracle
class Solution:
    def numIslands(self, grid: List[List[str]]) -> int:
        # union-find over the land cells: an independent way to count connected groups
        rows, cols = len(grid), len(grid[0])
        parent = {(r, c): (r, c) for r in range(rows) for c in range(cols) if grid[r][c] == "1"}

        def find(x):
            while parent[x] != x:
                x = parent[x]
            return x

        for r, c in list(parent):
            for nr, nc in ((r + 1, c), (r, c + 1)):
                if (nr, nc) in parent:
                    parent[find((r, c))] = find((nr, nc))
        return len({find(x) for x in parent})
```

```python gen
def gen(rng, size):
    rows = rng.randint(1, 4) if size == "small" else rng.randint(5, 14)
    cols = rng.randint(1, 4) if size == "small" else rng.randint(5, 14)
    land = rng.choice([0.3, 0.5, 0.7])
    return [[["1" if rng.random() < land else "0" for _ in range(cols)] for _ in range(rows)]]
```

```python perf
def perf(rng):
    # 500 × 500: a snake-shaped island of about 113,000 cells filling the top 450 rows, then small islands.
    n = 500
    grid = [["1"] * n if r % 2 == 0 else ["0"] * n for r in range(450)]
    for r in range(1, 450, 2):
        grid[r][n - 1 if r % 4 == 1 else 0] = "1"  # join each pair of rows at alternating ends
    grid[449] = ["0"] * n
    for _ in range(450, n):
        grid.append(["1" if rng.random() < 0.4 else "0" for _ in range(n)])
    return [grid]
```

## Hints

1. Think of every land cell as a node of a graph, with an edge to each land cell above, below, left and right of it. An island is a connected component of that graph.
2. Scan the grid. Each time you find land that no earlier search has reached, that's a new island: count it, then visit its whole island so none of its cells is counted again.
3. Visit an island with a breadth-first search from that cell, using a queue and marking each cell as soon as it joins the queue. Overwriting visited land with `"0"` is an easy way to mark it.

## Solution

```python solution time="m·n" space="m·n"
class Solution:
    def numIslands(self, grid: List[List[str]]) -> int:
        rows, cols = len(grid), len(grid[0])
        count = 0
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] != "1":
                    continue
                count += 1  # land no earlier search reached: a new island
                grid[r][c] = "0"  # mark cells when they join the queue
                queue = deque([(r, c)])
                while queue:
                    i, j = queue.popleft()
                    for ni, nj in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                        if 0 <= ni < rows and 0 <= nj < cols and grid[ni][nj] == "1":
                            grid[ni][nj] = "0"
                            queue.append((ni, nj))
        return count
```

Each search starts at an unvisited land cell and *sinks* its whole island by turning it into water, so the scan can never count that island again. The number of searches started is the number of islands.

Marking a cell when it enters the queue, not when it leaves, means no cell is ever queued twice. Every cell is looked at a constant number of times, so the time is O(m·n). The queue can hold O(m·n) cells in the worst case. If the input must stay unchanged, keep a separate `seen` set instead of overwriting it.

## Alternatives

### Depth-first search with an explicit stack

```python alt time="m·n" space="m·n"
class Solution:
    def numIslands(self, grid: List[List[str]]) -> int:
        rows, cols = len(grid), len(grid[0])
        count = 0
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == "1":
                    count += 1
                    grid[r][c] = "0"
                    stack = [(r, c)]
                    while stack:
                        i, j = stack.pop()  # a stack instead of a queue: depth-first order
                        for ni, nj in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                            if 0 <= ni < rows and 0 <= nj < cols and grid[ni][nj] == "1":
                                grid[ni][nj] = "0"
                                stack.append((ni, nj))
        return count
```

Swapping the queue for a list used as a stack changes the order the cells are visited in, but for counting islands the order doesn't matter. Either way, an explicit container never runs into Python's recursion limit.

## Wrong answers

### Connects cells at the corners

```python wrong fails="example" test="Example 1"
class Solution:
    def numIslands(self, grid: List[List[str]]) -> int:
        rows, cols = len(grid), len(grid[0])
        count = 0
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == "1":
                    count += 1
                    grid[r][c] = "0"
                    queue = deque([(r, c)])
                    while queue:
                        i, j = queue.popleft()
                        for di in (-1, 0, 1):
                            for dj in (-1, 0, 1):  # all eight neighbours, diagonals included
                                ni, nj = i + di, j + dj
                                if 0 <= ni < rows and 0 <= nj < cols and grid[ni][nj] == "1":
                                    grid[ni][nj] = "0"
                                    queue.append((ni, nj))
        return count
```

Looping over all eight neighbours joins cells that touch only at a corner. In Example 1 the bottom left cell merges into the first island, giving 2 islands instead of 3. Only the four cells sharing a side are neighbours here.

### Checks the edge of the grid one cell too late

```python wrong fails="example" test="Example 1" how="error"
class Solution:
    def numIslands(self, grid: List[List[str]]) -> int:
        rows, cols = len(grid), len(grid[0])
        count = 0
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == "1":
                    count += 1
                    grid[r][c] = "0"
                    queue = deque([(r, c)])
                    while queue:
                        i, j = queue.popleft()
                        for ni, nj in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                            if 0 <= ni <= rows and 0 <= nj <= cols and grid[ni][nj] == "1":  # <= lets ni reach rows
                                grid[ni][nj] = "0"
                                queue.append((ni, nj))
        return count
```

Valid rows run from 0 to `rows - 1`. With `<=`, the neighbour below a cell in the last row passes the check, and `grid[rows]` raises `IndexError`. Bounds checks on a grid are `0 <= i < rows`.

### Recursive depth-first search

```python wrong fails="perf" how="error"
class Solution:
    def numIslands(self, grid: List[List[str]]) -> int:
        rows, cols = len(grid), len(grid[0])

        def sink(r, c):  # one nested call per cell of the island
            if 0 <= r < rows and 0 <= c < cols and grid[r][c] == "1":
                grid[r][c] = "0"
                sink(r + 1, c)
                sink(r - 1, c)
                sink(r, c + 1)
                sink(r, c - 1)

        count = 0
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == "1":
                    count += 1
                    sink(r, c)
        return count
```

This is the classic solution and it's correct, but a recursive search goes one call deeper for every cell along its path. On the 500 × 500 test, one snake-shaped island needs over 100,000 nested calls, more than this page allows, and far more than plain Python's default limit of 1,000. Python raises `RecursionError`. With an explicit queue or stack, the depth problem disappears.
