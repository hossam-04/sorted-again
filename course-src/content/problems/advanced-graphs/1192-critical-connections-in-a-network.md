---
id: 1192
module: advanced-graphs
patterns: [bridges, Tarjan's low-link values, iterative DFS]
signature: "def criticalConnections(self, n: int, connections: List[List[int]]) -> List[List[int]]"
compare: unordered-deep
---

## Task

`n` servers, numbered 0 to `n - 1`, are linked by two-way connections `[a, b]`, and every server can reach every other. A connection is **critical** if removing it leaves some servers unable to reach others.

Return all critical connections, in any order, each written in either direction.

## Constraints

- `2 <= n <= 100_000`
- `n - 1 <= len(connections) <= 100_000`
- `a != b`, no connection is listed twice, and the network is connected

```json examples
[
  {"args": [5, [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4]]], "out": [[2, 3], [3, 4]], "why": "0, 1 and 2 form a loop, so any one of those links can be lost. The links to 3 and to 4 are the only way to reach them."},
  {"args": [4, [[0, 1], [1, 2], [2, 3], [3, 0]]], "out": [], "why": "A single loop: removing any one link leaves the others connected."},
  {"args": [6, [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3], [2, 3]]], "out": [[2, 3]], "why": "Two triangles, joined by one link: that link is critical, nothing else is."}
]
```

```json edge
[
  {"name": "two servers", "args": [2, [[1, 0]]], "out": [[1, 0]]},
  {"name": "a path", "args": [4, [[0, 1], [1, 2], [2, 3]]], "out": [[0, 1], [1, 2], [2, 3]]},
  {"name": "a star", "args": [4, [[0, 1], [0, 2], [0, 3]]], "out": [[0, 1], [0, 2], [0, 3]]},
  {"name": "two loops sharing a server", "args": [5, [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 2]]], "out": []},
  {"name": "a bridge between two squares", "args": [8, [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [3, 4]]], "out": [[3, 4]]}
]
```

```python oracle
class Solution:
    def criticalConnections(self, n: int, connections: List[List[int]]) -> List[List[int]]:
        out = []
        for skip in range(len(connections)):
            adj = [[] for _ in range(n)]
            for i, (a, b) in enumerate(connections):
                if i != skip:
                    adj[a].append(b)
                    adj[b].append(a)
            seen, todo = {0}, [0]
            for u in todo:
                for v in adj[u]:
                    if v not in seen:
                        seen.add(v)
                        todo.append(v)
            if len(seen) < n:
                out.append(connections[skip])
        return out
```

```python gen
def gen(rng, size):
    n = rng.randint(2, 6) if size == "small" else rng.randint(10, 40)
    edges = {tuple(sorted((v, rng.randrange(v)))) for v in range(1, n)}  # a random tree: connected
    for _ in range(rng.randint(0, n)):  # plus a few extra links
        a, b = rng.sample(range(n), 2)
        edges.add(tuple(sorted((a, b))))
    conns = [list(e) if rng.random() < 0.5 else [e[1], e[0]] for e in edges]
    rng.shuffle(conns)
    return [n, conns]
```

```python perf
def perf(rng):
    # 60,000 servers: a random tree, plus 20,000 extra links that put part of it on loops.
    n = 60_000
    edges = {(rng.randrange(v), v) for v in range(1, n)}
    while len(edges) < n - 1 + 20_000:
        a, b = rng.sample(range(n), 2)
        if (a, b) not in edges and (b, a) not in edges:
            edges.add((a, b))
    conns = [list(e) for e in edges]
    rng.shuffle(conns)
    return [n, conns]
```

## Hints

1. Removing each connection and checking whether everything is still connected is O(e · (n + e)): far too slow for 100,000 connections. A depth-first search can find every critical connection (every **bridge**) in one pass.
2. In a depth-first search, give each server its discovery time. For each server u, let `low[u]` be the earliest discovery time reachable from u's part of the search tree using at most one link that goes *back* to an earlier server.
3. A tree link from u to its child v is a bridge exactly when `low[v] > disc[u]`: nothing under v can get back to u or above without that link. Skip the link you arrived by when computing `low`, and use an explicit stack; recursion can be 100,000 calls deep.

## Solution

```python solution time="n + e" space="n + e"
class Solution:
    def criticalConnections(self, n: int, connections: List[List[int]]) -> List[List[int]]:
        adj = [[] for _ in range(n)]
        for i, (a, b) in enumerate(connections):
            adj[a].append((b, i))
            adj[b].append((a, i))
        disc = [-1] * n  # discovery time
        low = [0] * n    # the earliest discovery time reachable from u's subtree with one back link
        bridges, clock = [], 0
        disc[0] = low[0] = clock
        clock += 1
        stack = [(0, -1, 0)]  # server, the link used to reach it, the next neighbour to look at
        while stack:
            u, came_by, k = stack[-1]
            if k < len(adj[u]):
                stack[-1] = (u, came_by, k + 1)
                v, link = adj[u][k]
                if link == came_by:
                    continue  # the way we came in doesn't count as a way back
                if disc[v] == -1:  # a tree link: go deeper
                    disc[v] = low[v] = clock
                    clock += 1
                    stack.append((v, link, 0))
                else:  # a link back to a server already discovered
                    low[u] = min(low[u], disc[v])
            else:  # u is finished: report to its parent
                stack.pop()
                if stack:
                    p = stack[-1][0]
                    low[p] = min(low[p], low[u])
                    if low[u] > disc[p]:
                        bridges.append([p, u])
        return bridges
```

This is **Tarjan's bridge-finding** algorithm. A depth-first search turns the network into a tree of the links it followed, plus links that jump back to servers discovered earlier. A tree link from p to its child u can be removed safely only if something below u has another way back up, which `low[u]` measures: the earliest server reachable from u's subtree through one back link. If `low[u] > disc[p]`, nothing below u reaches p or above, so the link is a bridge.

The stack holds each server with the index of the next neighbour to look at, which replaces recursion; a server is "finished" when all its neighbours are done, and only then passes its `low` to its parent. Skipping the link we arrived by, by its index, stops that link from looking like a way back. Every server and link is handled once: O(n + e).

## Alternatives

### Recursive Tarjan

```python alt time="n + e" space="n + e"
class Solution:
    def criticalConnections(self, n: int, connections: List[List[int]]) -> List[List[int]]:
        adj = [[] for _ in range(n)]
        for a, b in connections:
            adj[a].append(b)
            adj[b].append(a)
        disc, low = [-1] * n, [0] * n
        bridges, clock = [], [0]

        def dfs(u, parent):
            disc[u] = low[u] = clock[0]
            clock[0] += 1
            for v in adj[u]:
                if v == parent:
                    continue
                if disc[v] == -1:
                    dfs(v, u)
                    low[u] = min(low[u], low[v])
                    if low[v] > disc[u]:
                        bridges.append([u, v])
                else:
                    low[u] = min(low[u], disc[v])

        dfs(0, -1)
        return bridges
```

The textbook form, and easier to read. It goes one call deeper per server on the current path, which is fine for this test's random tree, but a network that's one long chain of 100,000 servers would pass this page's recursion limit. Skipping the parent by server number is safe here because no connection is listed twice; with parallel links, skip by link index as the solution does.

## Wrong answers

### Uses the test for critical servers

```python wrong fails="example" test="Example 1"
class Solution:
    def criticalConnections(self, n: int, connections: List[List[int]]) -> List[List[int]]:
        adj = [[] for _ in range(n)]
        for a, b in connections:
            adj[a].append(b)
            adj[b].append(a)
        disc, low = [-1] * n, [0] * n
        bridges, clock = [], [0]

        def dfs(u, parent):
            disc[u] = low[u] = clock[0]
            clock[0] += 1
            for v in adj[u]:
                if v == parent:
                    continue
                if disc[v] == -1:
                    dfs(v, u)
                    low[u] = min(low[u], low[v])
                    if low[v] >= disc[u]:  # the articulation-point test, not the bridge test
                        bridges.append([u, v])
                else:
                    low[u] = min(low[u], disc[v])

        dfs(0, -1)
        return bridges
```

`low[v] >= disc[u]` is the test for a critical *server* (an articulation point): it allows the subtree to reach u itself. For a critical *link*, reaching u is enough to survive, so the test is strict. With `>=`, the first link of the loop in Example 1 is reported, since its subtree gets back to server 0 exactly.

### Counts the arrival link as a way back

```python wrong fails="example" test="Example 1"
class Solution:
    def criticalConnections(self, n: int, connections: List[List[int]]) -> List[List[int]]:
        adj = [[] for _ in range(n)]
        for a, b in connections:
            adj[a].append(b)
            adj[b].append(a)
        disc, low = [-1] * n, [0] * n
        bridges, clock = [], [0]

        def dfs(u):
            disc[u] = low[u] = clock[0]
            clock[0] += 1
            for v in adj[u]:
                if disc[v] == -1:
                    dfs(v)
                    low[u] = min(low[u], low[v])
                    if low[v] > disc[u]:
                        bridges.append([u, v])
                else:  # includes the parent, through the very link that might be a bridge
                    low[u] = min(low[u], disc[v])

        dfs(0)
        return bridges
```

Every child can see its parent through the link it was discovered by, so without skipping that link, `low[v]` is never above `disc[u]` and no bridge is ever found: Example 1 returns an empty list. The way in must not count as a way back.

### Removes each link and checks connectivity

```python wrong fails="perf"
class Solution:
    def criticalConnections(self, n: int, connections: List[List[int]]) -> List[List[int]]:
        out = []
        for skip in range(len(connections)):  # one full search per link
            adj = [[] for _ in range(n)]
            for i, (a, b) in enumerate(connections):
                if i != skip:
                    adj[a].append(b)
                    adj[b].append(a)
            seen, todo = {0}, [0]
            for u in todo:
                for v in adj[u]:
                    if v not in seen:
                        seen.add(v)
                        todo.append(v)
            if len(seen) < n:
                out.append(connections[skip])
        return out
```

The definition, tested directly: remove a link, see whether everything is still reachable. It's correct and O(e · (n + e)): with 80,000 links in the test, that's 80,000 searches over the whole network. Low-link values find every bridge in one search.
