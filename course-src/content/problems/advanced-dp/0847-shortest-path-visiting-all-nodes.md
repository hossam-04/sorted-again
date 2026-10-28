---
id: 847
module: advanced-dp
patterns: [BFS over (node, visited set), bitmask states]
signature: "def shortestPathLength(self, graph: List[List[int]]) -> int"
perf_repeat: 3
---

## Task

An undirected, connected graph has `n` nodes, numbered 0 to `n - 1`; `graph[i]` lists the neighbours of node i. Return the length (number of edges) of the shortest walk that visits every node. The walk may start and end anywhere, and may reuse nodes and edges as often as it likes.

## Constraints

- `1 <= n <= 12`
- `graph[i]` doesn't contain i, and if j is in `graph[i]`, then i is in `graph[j]`
- The graph is connected

```json examples
[
  {"args": [[[1], [0, 2], [1, 3], [2]]], "out": 3, "why": "A path of four nodes: start at one end and walk to the other, 3 edges."},
  {"args": [[[1, 2, 3, 4], [0], [0], [0], [0]]], "out": 6, "why": "A star: from one leaf, every other leaf needs a trip through the centre and back. 1 → 0 → 2 → 0 → 3 → 0 → 4 is 6 edges; nodes may be reused."},
  {"args": [[[1, 2], [0, 2], [0, 1, 3], [2]]], "out": 3, "why": "0 → 1 → 2 → 3 visits every node once: no walk can be shorter than 3 edges for 4 nodes."}
]
```

```json edge
[
  {"name": "one node", "args": [[[]]], "out": 0},
  {"name": "two nodes", "args": [[[1], [0]]], "out": 1},
  {"name": "a cycle", "args": [[[1, 4], [0, 2], [1, 3], [2, 4], [3, 0]]], "out": 4},
  {"name": "every node linked", "args": [[[1, 2, 3], [0, 2, 3], [0, 1, 3], [0, 1, 2]]], "out": 3},
  {"name": "a centre with two arms", "args": [[[1, 3], [0, 2], [1], [0, 4], [3]]], "out": 4},
  {"name": "two leaves on one side", "args": [[[1], [0, 2, 3], [1], [1]]], "out": 4}
]
```

```python oracle
class Solution:
    def shortestPathLength(self, graph: List[List[int]]) -> int:
        n = len(graph)
        dist = [[inf] * n for _ in range(n)]
        for u in range(n):
            dist[u][u] = 0
            for v in graph[u]:
                dist[u][v] = 1
        for k in range(n):
            for i in range(n):
                for j in range(n):
                    dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])
        return min((sum(dist[a][b] for a, b in zip(order, order[1:])) for order in permutations(range(n))), default=0)
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 5) if size == "small" else rng.randint(5, 7)
    edges = {tuple(sorted((v, rng.randrange(v)))) for v in range(1, n)}  # connected
    for _ in range(rng.randint(0, n)):
        if n > 1:
            a, b = rng.sample(range(n), 2)
            edges.add(tuple(sorted((a, b))))
    graph = [[] for _ in range(n)]
    for a, b in sorted(edges):
        graph[a].append(b)
        graph[b].append(a)
    return [graph]
```

```python perf
def perf(rng):
    # Twelve nodes: a cycle with a few chords, solved 3 times.
    n = 12
    edges = {tuple(sorted((i, (i + 1) % n))) for i in range(n)} | {(0, 6), (3, 9)}
    graph = [[] for _ in range(n)]
    for a, b in sorted(edges):
        graph[a].append(b)
        graph[b].append(a)
    return [graph]
```

## Hints

1. Walks may revisit nodes, so "which node am I at" isn't enough to describe progress; what matters is also *which nodes have been visited*. With at most 12 nodes, that set fits in a 12-bit mask.
2. The state (node, mask) has at most 12 × 4,096 values, and every move costs 1. A breadth-first search over these states finds the fewest moves to any state whose mask has every bit set.
3. The walk can start anywhere, so start the search from all n states `(i, 1 << i)` at once, each at distance 0.

## Solution

```python solution time="2^n · n²" space="2^n · n"
class Solution:
    def shortestPathLength(self, graph: List[List[int]]) -> int:
        n = len(graph)
        everything = (1 << n) - 1
        seen = [[False] * (1 << n) for _ in range(n)]  # seen[node][mask]
        queue = deque()
        for i in range(n):  # every node can be the start
            seen[i][1 << i] = True
            queue.append((i, 1 << i, 0))
        while queue:
            node, mask, steps = queue.popleft()
            if mask == everything:
                return steps
            for nxt in graph[node]:
                m = mask | 1 << nxt
                if not seen[nxt][m]:
                    seen[nxt][m] = True
                    queue.append((nxt, m, steps + 1))
```

A walk is described completely, for the future, by where it is and which nodes it has seen: two walks that agree on both can continue in exactly the same ways. So those pairs are the states of a new graph, with a move for every edge, and the shortest walk is a breadth-first search over them, started from every node at once. The first state reached with all bits set gives the answer.

There are n · 2ⁿ states, each with up to n moves, so at most about 590,000 steps for 12 nodes. It's a DP over subsets in the shape of a BFS: the same states as the travelling salesman's bitmask DP, explored in order of distance.

## Alternatives

### Distances first, then a DP over subsets

```python alt time="2^n · n²" space="2^n · n"
class Solution:
    def shortestPathLength(self, graph: List[List[int]]) -> int:
        n = len(graph)
        dist = [[inf] * n for _ in range(n)]
        for u in range(n):  # shortest distances between every pair, by BFS
            dist[u][u] = 0
            queue = deque([u])
            while queue:
                x = queue.popleft()
                for y in graph[x]:
                    if dist[u][y] == inf:
                        dist[u][y] = dist[u][x] + 1
                        queue.append(y)
        best = [[inf] * n for _ in range(1 << n)]  # best[mask][v]: shortest walk visiting mask, ending at v
        for v in range(n):
            best[1 << v][v] = 0
        for mask in range(1 << n):
            for v in range(n):
                cur = best[mask][v]
                if cur == inf:
                    continue
                for w in range(n):
                    if not mask >> w & 1 and cur + dist[v][w] < best[mask | 1 << w][w]:
                        best[mask | 1 << w][w] = cur + dist[v][w]
        return min(best[(1 << n) - 1])
```

The travelling-salesman formulation: first the shortest distance between every pair of nodes, then a DP over (set of nodes visited, node last visited) that only ever jumps to a *new* node, along a shortest path. Revisits happen inside those jumps. It's the same number of states, and it works for weighted graphs too, where the BFS would need Dijkstra.

## Wrong answers

### Never revisits a node

```python wrong fails="example" test="Example 2"
class Solution:
    def shortestPathLength(self, graph: List[List[int]]) -> int:
        n = len(graph)

        def walk(node, seen):  # extends the path only to new nodes
            if len(seen) == n:
                return 0
            return min((1 + walk(nxt, seen | {nxt}) for nxt in graph[node] if nxt not in seen), default=inf)

        best = min(walk(i, {i}) for i in range(n))
        return best if best < inf else -1
```

The shortest walk can need to pass through a node twice. In the star of Example 2 there's no path that visits every node once, because every route between leaves goes through the centre, so this finds nothing at all. The state has to allow revisits; only the *set* of visited nodes needs to be remembered.

### Starts only from node 0

```python wrong fails="example" test="Example 2"
class Solution:
    def shortestPathLength(self, graph: List[List[int]]) -> int:
        n = len(graph)
        everything = (1 << n) - 1
        seen = {(0, 1)}
        queue = deque([(0, 1, 0)])  # only one start
        while queue:
            node, mask, steps = queue.popleft()
            if mask == everything:
                return steps
            for nxt in graph[node]:
                m = mask | 1 << nxt
                if (nxt, m) not in seen:
                    seen.add((nxt, m))
                    queue.append((nxt, m, steps + 1))
```

The walk may start anywhere, and where it starts matters. In Example 2, node 0 is the centre of the star: starting there means returning to it after every leaf but the last, 7 edges, while starting at a leaf saves one. Start the search from every node.

### Tries every order of the nodes

```python wrong fails="perf"
class Solution:
    def shortestPathLength(self, graph: List[List[int]]) -> int:
        n = len(graph)
        dist = [[inf] * n for _ in range(n)]
        for u in range(n):
            dist[u][u] = 0
            for v in graph[u]:
                dist[u][v] = 1
        for k in range(n):
            for i in range(n):
                for j in range(n):
                    dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])
        return min(sum(dist[a][b] for a, b in zip(order, order[1:])) for order in permutations(range(n)))
```

Correct: some order of first visits is optimal, and shortest paths connect them. But 12 nodes have 12! ≈ 479 million orders, each summed over 11 distances. The bitmask states share all the work between orders that have visited the same set.
