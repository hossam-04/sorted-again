---
id: 286
title: Distance to the Nearest Gate
own: true
module: graphs
patterns: [multi-source breadth-first search, distance fill, in-place]
signature: "def wallsAndGates(self, rooms: List[List[int]]) -> None"
adapter: in-place
inplace: 0
lc_skip: Premium on LeetCode, so there are no published outputs to replay
---

## Task

A building plan is a grid, `rooms`, where each cell is:

- `-1`, a wall;
- `0`, a gate;
- `2147483647` (that's 2³¹ − 1, standing for "infinity"), an empty room.

People move between cells up, down, left and right, but never through walls. Change `rooms` in place so that every empty room holds the number of steps to its **nearest gate**. A room that can't reach any gate keeps the value `2147483647`. Walls and gates stay as they are.

## Constraints

- `1 <= rows, columns <= 500`
- Every cell is `-1`, `0` or `2147483647`

```json examples
[
  {"args": [[[2147483647, -1, 0], [2147483647, 2147483647, 2147483647], [0, -1, 2147483647]]], "out": [[2, -1, 0], [1, 2, 1], [0, -1, 2]], "why": "Each room counts the steps to whichever gate is closer: the middle room is 2 steps from both gates, the room above the bottom left gate is 1 step from it."},
  {"args": [[[0, 2147483647, 2147483647, 2147483647]]], "out": [[0, 1, 2, 3]], "why": "In a corridor, the distance grows by one with each room."},
  {"args": [[[2147483647, -1, 2147483647], [-1, -1, -1], [2147483647, -1, 0]]], "out": [[2147483647, -1, 2147483647], [-1, -1, -1], [2147483647, -1, 0]], "why": "Walls cut the three other rooms off from the only gate, so they keep the value 2147483647."}
]
```

```json edge
[
  {"name": "a single gate", "args": [[[0]]], "out": [[0]]},
  {"name": "a single wall", "args": [[[-1]]], "out": [[-1]]},
  {"name": "a room and no gate", "args": [[[2147483647]]], "out": [[2147483647]]},
  {"name": "two gates side by side", "args": [[[0, 2147483647], [2147483647, 0]]], "out": [[0, 1], [1, 0]]},
  {"name": "a gate in the middle", "args": [[[2147483647, 2147483647, 2147483647], [2147483647, 0, 2147483647], [2147483647, 2147483647, 2147483647]]], "out": [[2, 1, 2], [1, 0, 1], [2, 1, 2]]}
]
```

```python oracle
class Solution:
    def wallsAndGates(self, rooms: List[List[int]]) -> None:
        rows, cols = len(rooms), len(rooms[0])
        gates = [(r, c) for r in range(rows) for c in range(cols) if rooms[r][c] == 0]
        best = {}
        for gate in gates:  # a full search from every gate, keeping the smallest distance
            dist, queue = {gate: 0}, deque([gate])
            while queue:
                r, c = queue.popleft()
                for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                    if 0 <= nr < rows and 0 <= nc < cols and rooms[nr][nc] != -1 and (nr, nc) not in dist:
                        dist[(nr, nc)] = dist[(r, c)] + 1
                        queue.append((nr, nc))
            for cell, d in dist.items():
                best[cell] = min(best.get(cell, d), d)
        for (r, c), d in best.items():
            if rooms[r][c] != 0:
                rooms[r][c] = d
```

```python gen
def gen(rng, size):
    rows = rng.randint(1, 4) if size == "small" else rng.randint(4, 12)
    cols = rng.randint(1, 4) if size == "small" else rng.randint(4, 12)
    return [[[rng.choice([2147483647] * 6 + [-1, -1, 0]) for _ in range(cols)] for _ in range(rows)]]
```

```python perf
def perf(rng):
    # 500 × 500 with 10% walls and 1,000 gates.
    rooms = [[-1 if rng.random() < 0.1 else 2147483647 for _ in range(500)] for _ in range(500)]
    for _ in range(1_000):
        rooms[rng.randrange(500)][rng.randrange(500)] = 0
    return [rooms]
```

## Hints

1. Searching from every room for the nearest gate repeats a lot of work. Turn it around: let the gates find the rooms.
2. A breadth-first search from one gate finds each room's distance to *that* gate. Starting it from all the gates at once finds each room's distance to the nearest one.
3. Put every gate in the queue first. When the search reaches an empty room for the first time, its distance is one more than the cell it came from; rooms already filled in have been reached by a nearer gate and are skipped.

## Solution

```python solution time="m·n" space="m·n"
class Solution:
    def wallsAndGates(self, rooms: List[List[int]]) -> None:
        rows, cols = len(rooms), len(rooms[0])
        empty = 2147483647
        queue = deque((r, c) for r in range(rows) for c in range(cols) if rooms[r][c] == 0)  # every gate at once
        while queue:
            r, c = queue.popleft()
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < rows and 0 <= nc < cols and rooms[nr][nc] == empty:
                    rooms[nr][nc] = rooms[r][c] + 1  # first visit: this is the nearest gate's distance
                    queue.append((nr, nc))
```

A breadth-first search reaches cells in order of distance from its starting points. With every gate as a starting point, the first time the search reaches a room is along the shortest path from *any* gate, so the distance written then is final. The value doubles as the visited mark: only rooms still holding 2147483647 are entered, and walls never are.

Every cell enters the queue at most once, so the time is O(m·n) no matter how many gates there are.

## Alternatives

### Track the distance in the queue

```python alt time="m·n" space="m·n"
class Solution:
    def wallsAndGates(self, rooms: List[List[int]]) -> None:
        rows, cols = len(rooms), len(rooms[0])
        queue = deque((r, c, 0) for r in range(rows) for c in range(cols) if rooms[r][c] == 0)
        seen = {(r, c) for r, c, _ in queue}
        while queue:
            r, c, d = queue.popleft()
            if rooms[r][c] != 0:
                rooms[r][c] = d
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < rows and 0 <= nc < cols and rooms[nr][nc] != -1 and (nr, nc) not in seen:
                    seen.add((nr, nc))
                    queue.append((nr, nc, d + 1))
```

Carrying each cell's distance in the queue and using a separate `seen` set works too. It spends more memory than reading the distance from the grid itself, but it's the same search.

## Wrong answers

### Walks through walls

```python wrong fails="example" test="Example 3"
class Solution:
    def wallsAndGates(self, rooms: List[List[int]]) -> None:
        rows, cols = len(rooms), len(rooms[0])
        queue = deque((r, c) for r in range(rows) for c in range(cols) if rooms[r][c] == 0)
        dist = {cell: 0 for cell in queue}
        while queue:
            r, c = queue.popleft()
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in dist:  # walls aren't checked
                    dist[(nr, nc)] = dist[(r, c)] + 1
                    queue.append((nr, nc))
        for (r, c), d in dist.items():
            if rooms[r][c] == 2147483647:
                rooms[r][c] = d
```

The search must not step onto walls: a path through a wall doesn't exist. Here the walls are treated as ordinary cells to pass through, so rooms behind them get distances. Skip any cell that holds `-1`.

### Searches from each gate separately

```python wrong fails="perf"
class Solution:
    def wallsAndGates(self, rooms: List[List[int]]) -> None:
        rows, cols = len(rooms), len(rooms[0])
        gates = [(r, c) for r in range(rows) for c in range(cols) if rooms[r][c] == 0]
        for gate in gates:  # a full search from every gate
            dist, queue = {gate: 0}, deque([gate])
            while queue:
                r, c = queue.popleft()
                for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                    if 0 <= nr < rows and 0 <= nc < cols and rooms[nr][nc] != -1 and (nr, nc) not in dist:
                        dist[(nr, nc)] = dist[(r, c)] + 1
                        queue.append((nr, nc))
                        rooms[nr][nc] = min(rooms[nr][nc], dist[(nr, nc)])
```

One search per gate, keeping the smallest distance, gives the right answer. But each search covers the whole building, so with g gates the work is O(g·m·n): 1,000 gates on a 500 × 500 plan means hundreds of millions of steps. One search started from all the gates together does it in a single pass.
