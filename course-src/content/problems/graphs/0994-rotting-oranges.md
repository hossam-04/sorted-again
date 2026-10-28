---
id: 994
module: graphs
patterns: [multi-source breadth-first search, levels as time]
signature: "def orangesRotting(self, grid: List[List[int]]) -> int"
---

## Task

A crate is a grid where each cell is `0` (empty), `1` (a fresh orange) or `2` (a rotten orange). Every minute, each rotten orange makes the fresh oranges directly above, below, left and right of it rotten too.

Return the number of minutes until no fresh orange is left, or `-1` if some fresh orange can never rot. If there are no fresh oranges to begin with, the answer is 0.

## Constraints

- `1 <= rows, columns <= 500`
- Every cell is `0`, `1` or `2`

```json examples
[
  {"args": [[[2, 1, 1, 1]]], "out": 3, "why": "The rot moves one orange further along the row each minute: 3 minutes for 3 fresh oranges."},
  {"args": [[[2, 1, 1], [1, 1, 1], [1, 1, 2]]], "out": 2, "why": "Both rotten oranges spread at the same time, from opposite corners, so every orange has rotted after 2 minutes. One corner alone would need 3."},
  {"args": [[[2, 1, 0], [0, 1, 1], [1, 0, 2]]], "out": -1, "why": "The orange at the bottom left has empty cells above it and to its right, so the rot can never reach it."}
]
```

```json edge
[
  {"name": "no oranges", "args": [[[0]]], "out": 0},
  {"name": "only a rotten orange", "args": [[[2]]], "out": 0},
  {"name": "only a fresh orange", "args": [[[1]]], "out": -1},
  {"name": "rotten in the middle", "args": [[[1, 1, 1], [1, 2, 1], [1, 1, 1]]], "out": 2},
  {"name": "an empty cell in the way", "args": [[[2, 0, 1]]], "out": -1},
  {"name": "spreading both ways", "args": [[[0, 1, 2, 1, 0]]], "out": 1},
  {"name": "fresh oranges cut off", "args": [[[1, 0, 2], [0, 0, 0], [2, 0, 1]]], "out": -1}
]
```

```python oracle
class Solution:
    def orangesRotting(self, grid: List[List[int]]) -> int:
        rows, cols = len(grid), len(grid[0])
        minutes = 0
        while True:  # simulate minute by minute
            rotting = [(r, c) for r in range(rows) for c in range(cols) if grid[r][c] == 1 and any(
                0 <= r + dr < rows and 0 <= c + dc < cols and grid[r + dr][c + dc] == 2
                for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
            if not rotting:
                break
            for r, c in rotting:
                grid[r][c] = 2
            minutes += 1
        return -1 if any(1 in row for row in grid) else minutes
```

```python gen
def gen(rng, size):
    rows = rng.randint(1, 4) if size == "small" else rng.randint(4, 12)
    cols = rng.randint(1, 4) if size == "small" else rng.randint(4, 12)
    return [[[rng.choice([0, 1, 1, 1, 2]) if rng.random() < 0.9 else 0 for _ in range(cols)] for _ in range(rows)]]
```

```python perf
def perf(rng):
    # 500 × 500 fresh oranges with a single rotten one in the corner: 998 minutes.
    grid = [[1] * 500 for _ in range(500)]
    grid[0][0] = 2
    return [grid]
```

## Hints

1. The rot spreads like a wave: after k minutes, exactly the fresh oranges within k steps of some rotten orange have rotted.
2. That's breadth-first search, but starting from *all* the rotten oranges at once: put every one of them in the queue before starting.
3. Process the queue one level at a time; each level is one minute. Count the fresh oranges first, so at the end you know whether any were never reached.

## Solution

```python solution time="m·n" space="m·n"
class Solution:
    def orangesRotting(self, grid: List[List[int]]) -> int:
        rows, cols = len(grid), len(grid[0])
        queue = deque((r, c) for r in range(rows) for c in range(cols) if grid[r][c] == 2)  # all sources at once
        fresh = sum(row.count(1) for row in grid)
        minutes = 0
        while queue and fresh:
            for _ in range(len(queue)):  # one level of the search = one minute
                r, c = queue.popleft()
                for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                    if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                        grid[nr][nc] = 2  # mark when queued
                        fresh -= 1
                        queue.append((nr, nc))
            minutes += 1
        return -1 if fresh else minutes
```

Starting the search from every rotten orange at once is a **multi-source breadth-first search**. It's like adding one imaginary source connected to all of them: each fresh orange is reached at its distance from the *nearest* rotten one, which is exactly the minute it rots.

Each round of the `for` loop empties exactly one level of the queue, so the number of rounds is the number of minutes. The loop also stops as soon as nothing fresh is left, so a final round that rots nothing is never counted. Every cell is queued at most once: O(m·n).

## Alternatives

### Store each cell's minute in the queue

```python alt time="m·n" space="m·n"
class Solution:
    def orangesRotting(self, grid: List[List[int]]) -> int:
        rows, cols = len(grid), len(grid[0])
        queue = deque((r, c, 0) for r in range(rows) for c in range(cols) if grid[r][c] == 2)
        minutes = 0
        while queue:
            r, c, t = queue.popleft()
            minutes = t  # the queue comes out in order of time, so the last value is the largest
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                    grid[nr][nc] = 2
                    queue.append((nr, nc, t + 1))
        return -1 if any(1 in row for row in grid) else minutes
```

Instead of processing level by level, each queue entry carries the minute its orange rotted. Breadth-first search takes cells out in order of distance, so the time of the last cell taken out is the answer.

## Wrong answers

### Spreads from one rotten orange at a time

```python wrong fails="example" test="Example 2"
class Solution:
    def orangesRotting(self, grid: List[List[int]]) -> int:
        rows, cols = len(grid), len(grid[0])
        minutes = 0
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] != 2:
                    continue
                queue = deque([(r, c, 0)])  # a separate search for this rotten orange only
                while queue:
                    i, j, t = queue.popleft()
                    minutes = max(minutes, t)
                    for ni, nj in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                        if 0 <= ni < rows and 0 <= nj < cols and grid[ni][nj] == 1:
                            grid[ni][nj] = 2
                            queue.append((ni, nj, t + 1))
        return -1 if any(1 in row for row in grid) else minutes
```

The first rotten orange's search rots everything it can reach, timing it as if that orange were the only source. In Example 2 the corner at the top left rots the oranges near the bottom right after 3 minutes, though the other rotten orange gets there in 1. All sources must spread together: put them all in the queue before the search starts.

### Counts one minute too many

```python wrong fails="example" test="Example 1"
class Solution:
    def orangesRotting(self, grid: List[List[int]]) -> int:
        rows, cols = len(grid), len(grid[0])
        queue = deque((r, c) for r in range(rows) for c in range(cols) if grid[r][c] == 2)
        fresh = sum(row.count(1) for row in grid)
        minutes = 0
        while queue:  # keeps going after the last orange has rotted
            for _ in range(len(queue)):
                r, c = queue.popleft()
                for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                    if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                        grid[nr][nc] = 2
                        fresh -= 1
                        queue.append((nr, nc))
            minutes += 1
        return -1 if fresh else minutes
```

The last oranges to rot are still in the queue when the final minute ends. Processing them takes one more round, which rots nothing but still adds a minute: 4 instead of 3 in Example 1. Stop when no fresh orange is left, or subtract the empty last round.

### Re-scans the whole crate every minute

```python wrong fails="perf"
class Solution:
    def orangesRotting(self, grid: List[List[int]]) -> int:
        rows, cols = len(grid), len(grid[0])
        minutes = 0
        while True:
            rotting = [(r, c) for r in range(rows) for c in range(cols) if grid[r][c] == 1 and any(
                0 <= r + dr < rows and 0 <= c + dc < cols and grid[r + dr][c + dc] == 2
                for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)))]  # look at every cell, every minute
            if not rotting:
                break
            for r, c in rotting:
                grid[r][c] = 2
            minutes += 1
        return -1 if any(1 in row for row in grid) else minutes
```

Simulating the crate minute by minute follows the story exactly, but each minute looks at all m·n cells, even though only the cells next to the newly rotten ones can change. With one rotten corner in a 500 × 500 crate, that's 998 full scans of 250,000 cells. The queue only ever touches the cells on the edge of the rot.
