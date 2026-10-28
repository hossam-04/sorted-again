---
id: 417
module: graphs
patterns: [reverse the direction, multi-source search, set intersection]
signature: "def pacificAtlantic(self, heights: List[List[int]]) -> List[List[int]]"
compare: unordered
---

## Task

An island is a grid of land heights, `heights[r][c]`. The Pacific Ocean touches its top and left edges; the Atlantic touches its bottom and right edges. Rain on a cell flows to any neighbouring cell (up, down, left or right) whose height is less than or equal to the current one, and from a cell on an edge it flows into that edge's ocean.

Return the coordinates `[r, c]` of every cell from which rain can reach **both** oceans, in any order.

## Constraints

- `1 <= rows, columns <= 300`
- `0 <= heights[r][c] <= 10**5`

```json examples
[
  {"args": [[[1, 2, 3], [8, 9, 4], [7, 6, 5]]], "out": [[0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], "why": "The heights spiral up from 1 to 9. From the 9 in the middle, water can run down the spiral either way and reach both oceans. The 2 can drain only into the 1 or the Pacific, and the 1 has no lower neighbour, so neither reaches the Atlantic."},
  {"args": [[[5]]], "out": [[0, 0]], "why": "A single cell touches all four edges, so it drains into both oceans."},
  {"args": [[[2, 2], [2, 2]]], "out": [[0, 0], [0, 1], [1, 0], [1, 1]], "why": "Water flows between cells of equal height, so on flat ground every cell reaches both oceans."}
]
```

```json edge
[
  {"name": "a basin in the middle", "args": [[[3, 3, 3], [3, 1, 3], [3, 3, 3]]], "out": [[0, 0], [0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1], [2, 2]]},
  {"name": "one row", "args": [[[1, 2, 1]]], "out": [[0, 0], [0, 1], [0, 2]]},
  {"name": "one column", "args": [[[4], [1], [4]]], "out": [[0, 0], [1, 0], [2, 0]]},
  {"name": "two peaks", "args": [[[10, 1], [1, 10]]], "out": [[0, 0], [0, 1], [1, 0], [1, 1]]},
  {"name": "a peak in the middle", "args": [[[1, 1, 1], [1, 5, 1], [1, 1, 1]]], "out": [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]]}
]
```

```python oracle
class Solution:
    def pacificAtlantic(self, heights: List[List[int]]) -> List[List[int]]:
        rows, cols = len(heights), len(heights[0])
        out = []
        for r in range(rows):
            for c in range(cols):  # follow the rain from every cell
                seen, stack, pac, atl = {(r, c)}, [(r, c)], False, False
                while stack:
                    i, j = stack.pop()
                    pac |= i == 0 or j == 0
                    atl |= i == rows - 1 or j == cols - 1
                    for ni, nj in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                        if 0 <= ni < rows and 0 <= nj < cols and (ni, nj) not in seen and heights[ni][nj] <= heights[i][j]:
                            seen.add((ni, nj))
                            stack.append((ni, nj))
                if pac and atl:
                    out.append([r, c])
        return out
```

```python gen
def gen(rng, size):
    rows = rng.randint(1, 4) if size == "small" else rng.randint(4, 10)
    cols = rng.randint(1, 4) if size == "small" else rng.randint(4, 10)
    hi = rng.choice([2, 5, 20])
    return [[[rng.randint(0, hi) for _ in range(cols)] for _ in range(rows)]]
```

```python perf
def perf(rng):
    # 300 × 300 sloping down towards the top left: every cell drains to the Pacific, and only the
    # bottom row and right column reach the Atlantic.
    return [[[r + c for c in range(300)] for r in range(300)]]
```

## Hints

1. Following the rain from every cell repeats the same searches over and over. Turn the question around: which cells can each ocean be reached *from*?
2. Start at the cells next to the Pacific and walk "uphill", to neighbours at least as high. Every cell you reach can drain into the Pacific. That's one search with many starting cells.
3. Do the same from the Atlantic's edges. The answer is the cells reached by both searches.

## Solution

```python solution time="m·n" space="m·n"
class Solution:
    def pacificAtlantic(self, heights: List[List[int]]) -> List[List[int]]:
        rows, cols = len(heights), len(heights[0])

        def can_drain(starts):  # every cell whose rain can reach one of the start cells
            seen = set(starts)
            queue = deque(starts)
            while queue:
                r, c = queue.popleft()
                for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                    if (0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in seen
                            and heights[nr][nc] >= heights[r][c]):  # uphill: water could flow from there to here
                        seen.add((nr, nc))
                        queue.append((nr, nc))
            return seen

        pacific = can_drain([(0, c) for c in range(cols)] + [(r, 0) for r in range(1, rows)])
        atlantic = can_drain([(rows - 1, c) for c in range(cols)] + [(r, cols - 1) for r in range(rows - 1)])
        return [[r, c] for r, c in pacific & atlantic]
```

Water flows downhill from a cell to the ocean, so walking *uphill* from the ocean finds exactly the cells it can come from. The searches start from every edge cell of an ocean at once: a multi-source breadth-first search.

Each of the two searches visits every cell at most once, so the work is O(m·n), and the answer is the intersection of the two sets. Equal heights count as "uphill" here, because water flows between cells of equal height.

## Alternatives

### Depth-first search with a stack

```python alt time="m·n" space="m·n"
class Solution:
    def pacificAtlantic(self, heights: List[List[int]]) -> List[List[int]]:
        rows, cols = len(heights), len(heights[0])

        def can_drain(starts):
            seen, stack = set(starts), list(starts)
            while stack:
                r, c = stack.pop()
                for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                    if (0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in seen
                            and heights[nr][nc] >= heights[r][c]):
                        seen.add((nr, nc))
                        stack.append((nr, nc))
            return seen

        pacific = can_drain([(0, c) for c in range(cols)] + [(r, 0) for r in range(rows)])
        atlantic = can_drain([(rows - 1, c) for c in range(cols)] + [(r, cols - 1) for r in range(rows)])
        return [[r, c] for r, c in pacific & atlantic]
```

The order of the search doesn't matter, only the set of cells it reaches, so a stack works as well as a queue.

## Wrong answers

### Lets water flow only strictly downhill

```python wrong fails="example" test="Example 3"
class Solution:
    def pacificAtlantic(self, heights: List[List[int]]) -> List[List[int]]:
        rows, cols = len(heights), len(heights[0])

        def can_drain(starts):
            seen, queue = set(starts), deque(starts)
            while queue:
                r, c = queue.popleft()
                for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                    if (0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in seen
                            and heights[nr][nc] > heights[r][c]):  # equal heights are skipped
                        seen.add((nr, nc))
                        queue.append((nr, nc))
            return seen

        pacific = can_drain([(0, c) for c in range(cols)] + [(r, 0) for r in range(rows)])
        atlantic = can_drain([(rows - 1, c) for c in range(cols)] + [(r, cols - 1) for r in range(rows)])
        return [[r, c] for r, c in pacific & atlantic]
```

The task lets water flow to a neighbour of *equal* height too. With `>`, a flat area stops the search: on the all-2 grid, the top left cell is reached only from the Pacific and the bottom right only from the Atlantic. Walk to neighbours that are greater than *or equal*.

### Follows the rain from every cell

```python wrong fails="perf"
class Solution:
    def pacificAtlantic(self, heights: List[List[int]]) -> List[List[int]]:
        rows, cols = len(heights), len(heights[0])
        out = []
        for r in range(rows):
            for c in range(cols):  # a new search for every cell
                seen, queue, pac, atl = {(r, c)}, deque([(r, c)]), False, False
                while queue:
                    i, j = queue.popleft()
                    pac |= i == 0 or j == 0
                    atl |= i == rows - 1 or j == cols - 1
                    for ni, nj in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                        if (0 <= ni < rows and 0 <= nj < cols and (ni, nj) not in seen
                                and heights[ni][nj] <= heights[i][j]):
                            seen.add((ni, nj))
                            queue.append((ni, nj))
                if pac and atl:
                    out.append([r, c])
        return out
```

Tracing the rain from each cell is the direct reading of the task, and it's correct. But each search can cover a large part of the grid: on the 300 × 300 slope, the search from a cell explores the whole rectangle above and to its left, billions of steps in total. Two searches from the oceans visit each cell once.
