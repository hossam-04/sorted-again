---
id: 695
module: graphs
patterns: [grid as a graph, flood fill, component size]
signature: "def maxAreaOfIsland(self, grid: List[List[int]]) -> int"
---

## Task

A map is a grid of `1` (land) and `0` (water) cells. An *island* is a group of land cells connected horizontally or vertically, and its *area* is the number of cells in it.

Return the area of the largest island, or 0 if there's no land.

## Constraints

- `1 <= rows, columns <= 500`
- Every cell is `0` or `1`

```json examples
[
  {"args": [[[1, 1, 0], [1, 0, 0], [0, 0, 1]]], "out": 3, "why": "The island at the top left has 3 cells; the one at the bottom right has 1."},
  {"args": [[[0, 0, 0]]], "out": 0, "why": "No land at all, so the largest area is 0."},
  {"args": [[[1, 0, 1], [0, 1, 0], [1, 0, 1]]], "out": 1, "why": "Cells touching only at corners are separate islands, so every island here has area 1."}
]
```

```json edge
[
  {"name": "all land", "args": [[[1, 1, 1], [1, 1, 1]]], "out": 6},
  {"name": "one land cell", "args": [[[1]]], "out": 1},
  {"name": "the larger island comes second", "args": [[[1, 1, 0, 1, 1], [0, 1, 0, 0, 1], [0, 1, 1, 0, 1]]], "out": 5},
  {"name": "diagonal neighbours", "args": [[[0, 1], [1, 0]]], "out": 1}
]
```

```python oracle
class Solution:
    def maxAreaOfIsland(self, grid: List[List[int]]) -> int:
        rows, cols = len(grid), len(grid[0])
        parent = {(r, c): (r, c) for r in range(rows) for c in range(cols) if grid[r][c] == 1}

        def find(x):
            while parent[x] != x:
                x = parent[x]
            return x

        for r, c in list(parent):
            for nr, nc in ((r + 1, c), (r, c + 1)):
                if (nr, nc) in parent:
                    parent[find((r, c))] = find((nr, nc))
        return max(Counter(find(x) for x in parent).values(), default=0)
```

```python gen
def gen(rng, size):
    rows = rng.randint(1, 4) if size == "small" else rng.randint(5, 14)
    cols = rng.randint(1, 4) if size == "small" else rng.randint(5, 14)
    land = rng.choice([0.3, 0.5, 0.7])
    return [[[1 if rng.random() < land else 0 for _ in range(cols)] for _ in range(rows)]]
```

```python perf
def perf(rng):
    # 500 × 500 with 60% land: one huge island and thousands of small ones.
    return [[[1 if rng.random() < 0.6 else 0 for _ in range(500)] for _ in range(500)]]
```

## Hints

1. This is [[p:200]] with one more number to track: instead of counting islands, measure each one.
2. When a search starts at a new island, count the cells it visits. That count is the island's area.
3. Mark cells as visited for good, across all searches, so every cell is measured once. Keep the largest area seen.

## Solution

```python solution time="m·n" space="m·n"
class Solution:
    def maxAreaOfIsland(self, grid: List[List[int]]) -> int:
        rows, cols = len(grid), len(grid[0])
        best = 0
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] != 1:
                    continue
                grid[r][c] = 0  # mark when queued
                queue, area = deque([(r, c)]), 0
                while queue:
                    i, j = queue.popleft()
                    area += 1  # count each cell as it leaves the queue
                    for ni, nj in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                        if 0 <= ni < rows and 0 <= nj < cols and grid[ni][nj] == 1:
                            grid[ni][nj] = 0
                            queue.append((ni, nj))
                best = max(best, area)
        return best
```

Each breadth-first search covers exactly one island and counts its cells as they come out of the queue. Because visited land is turned into water, every cell belongs to exactly one search, and the whole scan is O(m·n). The answer is the largest count.

## Alternatives

### Union-find with component sizes

```python alt time="m·n · α(m·n)" space="m·n"
class Solution:
    def maxAreaOfIsland(self, grid: List[List[int]]) -> int:
        rows, cols = len(grid), len(grid[0])
        parent = list(range(rows * cols))  # cell (r, c) is number r * cols + c
        size = [1] * (rows * cols)

        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]  # path halving
                x = parent[x]
            return x

        best = 0
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] != 1:
                    continue
                best = max(best, 1)
                for nr, nc in ((r - 1, c), (r, c - 1)):  # neighbours already scanned
                    if nr >= 0 and nc >= 0 and grid[nr][nc] == 1:
                        a, b = find(r * cols + c), find(nr * cols + nc)
                        if a != b:
                            if size[a] < size[b]:
                                a, b = b, a
                            parent[b] = a  # attach the smaller group under the larger
                            size[a] += size[b]
                            best = max(best, size[a])
        return best
```

Joining each land cell with its land neighbours above and to the left builds the islands as groups, and the group sizes are the areas. Union-find gets a full section in the lesson; here it shows that the same answer can come from merging instead of searching.

## Wrong answers

### Keeps counting across islands

```python wrong fails="example" test="Example 1"
class Solution:
    def maxAreaOfIsland(self, grid: List[List[int]]) -> int:
        rows, cols = len(grid), len(grid[0])
        best = area = 0  # area is never reset
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] != 1:
                    continue
                grid[r][c] = 0
                queue = deque([(r, c)])
                while queue:
                    i, j = queue.popleft()
                    area += 1
                    for ni, nj in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                        if 0 <= ni < rows and 0 <= nj < cols and grid[ni][nj] == 1:
                            grid[ni][nj] = 0
                            queue.append((ni, nj))
                best = max(best, area)
        return best
```

The count starts at 0 once, before the scan, so the second island's cells are added to the first island's total, and the answer becomes the amount of land in the whole grid. Reset the area at the start of every search.

### Measures every cell's island from scratch

```python wrong fails="perf"
class Solution:
    def maxAreaOfIsland(self, grid: List[List[int]]) -> int:
        rows, cols = len(grid), len(grid[0])
        best = 0
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] != 1:
                    continue
                seen = {(r, c)}  # a fresh set for every land cell
                queue = deque([(r, c)])
                while queue:
                    i, j = queue.popleft()
                    for ni, nj in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                        if 0 <= ni < rows and 0 <= nj < cols and grid[ni][nj] == 1 and (ni, nj) not in seen:
                            seen.add((ni, nj))
                            queue.append((ni, nj))
                best = max(best, len(seen))
        return best
```

Every land cell measures its whole island again, so an island of k cells costs k searches of k cells: O(k²). The largest island in the test has over 100,000 cells. Mark cells as visited for the whole scan, so each island is measured once.
