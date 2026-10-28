---
id: 2846
module: binary-lifting
patterns: [LCA by binary lifting, counts from the root]
signature: "def minOperationsQueries(self, n: int, edges: List[List[int]], queries: List[List[int]]) -> List[int]"
---

## Task

A tree has `n` nodes, numbered 0 to `n - 1`, and edges `[u, v, w]`, each with a weight `w` from 1 to 26. Each query `[a, b]` asks: how many edges on the path between a and b would you have to re-weight so that every edge on that path has the same weight? (You may give an edge any weight; queries don't change the tree.)

Return the answers to all queries, in order.

## Constraints

- `1 <= n <= 10_000`
- `len(edges) == n - 1`, and the edges form a tree
- `1 <= w <= 26`
- `1 <= len(queries) <= 20_000`, `0 <= a, b < n`

```json examples
[
  {"args": [5, [[0, 1, 3], [1, 2, 3], [1, 3, 5], [3, 4, 3]], [[2, 4], [0, 3], [2, 2]]], "out": [1, 1, 0], "why": "The path from 2 to 4 has weights 3, 5, 3: changing the 5 makes them equal. The path from a node to itself has no edges at all."},
  {"args": [4, [[0, 1, 2], [0, 2, 2], [0, 3, 7]], [[1, 2], [1, 3], [3, 0]]], "out": [0, 1, 0], "why": "1 to 2 goes through the centre over two edges of weight 2. 1 to 3 has one 2 and one 7, so one change is needed. 3 to 0 is a single edge."},
  {"args": [6, [[0, 1, 1], [1, 2, 2], [2, 3, 1], [3, 4, 2], [4, 5, 1]], [[0, 5], [1, 4]]], "out": [2, 1], "why": "Along 0 to 5 the weights alternate 1, 2, 1, 2, 1: keep the three 1s and change both 2s."}
]
```

```json edge
[
  {"name": "one node", "args": [1, [], [[0, 0]]], "out": [0]},
  {"name": "two nodes", "args": [2, [[0, 1, 26]], [[1, 0], [0, 0]]], "out": [0, 0]},
  {"name": "all weights different", "args": [4, [[0, 1, 1], [1, 2, 2], [2, 3, 3]], [[0, 3]]], "out": [2]},
  {"name": "one end is an ancestor", "args": [4, [[0, 1, 4], [1, 2, 4], [2, 3, 9]], [[3, 1]]], "out": [1]},
  {"name": "edges listed child first", "args": [3, [[2, 0, 5], [1, 2, 5]], [[1, 0]]], "out": [0]},
  {"name": "a tie for the most common", "args": [5, [[0, 1, 1], [1, 2, 1], [2, 3, 2], [3, 4, 2]], [[0, 4]]], "out": [2]}
]
```

```python oracle
class Solution:
    def minOperationsQueries(self, n: int, edges: List[List[int]], queries: List[List[int]]) -> List[int]:
        adj = [[] for _ in range(n)]
        for u, v, w in edges:
            adj[u].append((v, w))
            adj[v].append((u, w))
        out = []
        for a, b in queries:
            seen = {a: []}  # node -> weights on the path from a
            todo = [a]
            for u in todo:
                for v, w in adj[u]:
                    if v not in seen:
                        seen[v] = seen[u] + [w]
                        todo.append(v)
            path = seen[b]
            out.append(len(path) - (max(Counter(path).values()) if path else 0))
        return out
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 7) if size == "small" else rng.randint(20, 200)
    labels = list(range(n))
    rng.shuffle(labels)
    top = rng.choice([3, 26])
    edges = []
    for i in range(1, n):
        u, v = labels[i], labels[rng.randrange(i)]
        edges.append([u, v, rng.randint(1, top)] if rng.random() < 0.5 else [v, u, rng.randint(1, top)])
    queries = [[rng.randrange(n), rng.randrange(n)] for _ in range(rng.randint(1, 6) if size == "small" else rng.randint(20, 100))]
    return [n, edges, queries]
```

```python perf
def perf(rng):
    # 10,000 nodes: a path of 9,800 with 200 more hanging off it. 20,000 queries between the two ends of
    # the path, so every path is over 9,000 edges long.
    n, spine = 10_000, 9_800
    edges = [[i - 1, i, rng.randint(1, 26)] for i in range(1, spine)]
    edges += [[rng.randrange(i), i, rng.randint(1, 26)] for i in range(spine, n)]
    queries = [[rng.randrange(200), rng.randrange(9_600, spine)] for _ in range(20_000)]
    return [n, edges, queries]
```

## Hints

1. For one path, the answer is its number of edges minus how many of them share the most common weight. With only 26 weights, it's enough to know how many edges of each weight the path has.
2. Root the tree at 0 and store, for every node, how many edges of each weight lie between it and the root. The path from a to b goes up to their lowest common ancestor c and down again, so its counts are `count[a][w] + count[b][w] - 2 * count[c][w]`.
3. Many queries need many LCAs. Binary lifting answers each in O(log n): bring both nodes to the same depth, then jump both up by the largest powers of two that keep them apart; their parent is the LCA.

## Solution

```python solution time="(n + q) log n" space="n log n"
class Solution:
    def minOperationsQueries(self, n: int, edges: List[List[int]], queries: List[List[int]]) -> List[int]:
        adj = [[] for _ in range(n)]
        for u, v, w in edges:
            adj[u].append((v, w))
            adj[v].append((u, w))
        parent, depth = [-1] * n, [0] * n
        count = [None] * n  # count[v][w]: edges of weight w between the root and v
        count[0] = [0] * 27
        order = [0]
        for u in order:  # breadth-first from the root; the list grows as we go
            for v, w in adj[u]:
                if v != parent[u]:
                    parent[v], depth[v] = u, depth[u] + 1
                    count[v] = count[u][:]
                    count[v][w] += 1
                    order.append(v)

        up = [parent]  # up[j][v]: the ancestor 2**j steps above v, or -1
        for _ in range(max(1, n.bit_length()) - 1):
            prev = up[-1]
            up.append([-1 if a == -1 else prev[a] for a in prev])

        def lca(a, b):
            if depth[a] < depth[b]:
                a, b = b, a
            diff, j = depth[a] - depth[b], 0
            while diff:  # lift a to b's depth
                if diff & 1:
                    a = up[j][a]
                diff >>= 1
                j += 1
            if a == b:
                return a
            for j in range(len(up) - 1, -1, -1):  # the largest jumps that keep them apart
                if up[j][a] != up[j][b]:
                    a, b = up[j][a], up[j][b]
            return parent[a]

        out = []
        for a, b in queries:
            c = lca(a, b)
            ca, cb, cc = count[a], count[b], count[c]
            length = depth[a] + depth[b] - 2 * depth[c]
            out.append(length - max(ca[w] + cb[w] - 2 * cc[w] for w in range(1, 27)))
        return out
```

Two ideas combine. Counts from the root make any path's counts a little arithmetic: the edges from a and from b up to the root include the shared part above the LCA twice, so subtracting the LCA's counts twice leaves exactly the path. And binary lifting finds the LCA quickly: after lifting the deeper node to the same depth, both nodes jump up together by the largest power of two that keeps them on different nodes; when no jump is possible, they're just below the LCA.

Preparing takes O(n · 26) for the counts and O(n log n) for the table. Each query is O(log n) for the LCA plus 26 subtractions, so 20,000 queries take a fraction of a second.

## Alternatives

### An Euler tour and a sparse table

```python alt time="n log n + q" space="n log n"
class Solution:
    def minOperationsQueries(self, n: int, edges: List[List[int]], queries: List[List[int]]) -> List[int]:
        adj = [[] for _ in range(n)]
        for u, v, w in edges:
            adj[u].append((v, w))
            adj[v].append((u, w))
        depth, count, first = [0] * n, [None] * n, [0] * n
        count[0] = [0] * 27
        tour = [0]  # the nodes in the order a depth-first walk passes them, returns included
        stack = [(0, -1, iter(adj[0]))]
        while stack:
            u, p, rest = stack[-1]
            for v, w in rest:
                if v != p:
                    depth[v] = depth[u] + 1
                    count[v] = count[u][:]
                    count[v][w] += 1
                    first[v] = len(tour)
                    tour.append(v)
                    stack.append((v, u, iter(adj[v])))
                    break
            else:  # every neighbour done: walk back up to the parent
                stack.pop()
                if stack:
                    tour.append(stack[-1][0])

        table = [tour]  # table[j][i]: the shallowest node among tour[i : i + 2**j]
        while (1 << len(table)) <= len(tour):
            prev, half = table[-1], 1 << (len(table) - 1)
            table.append([a if depth[a] <= depth[b] else b for a, b in zip(prev, prev[half:])])

        out = []
        for a, b in queries:
            l, r = sorted((first[a], first[b]))
            j = (r - l + 1).bit_length() - 1
            x, y = table[j][l], table[j][r - (1 << j) + 1]
            c = x if depth[x] <= depth[y] else y  # the LCA: the shallowest node the walk passes between a and b
            length = depth[a] + depth[b] - 2 * depth[c]
            out.append(length - max(count[a][w] + count[b][w] - 2 * count[c][w] for w in range(1, 27)))
        return out
```

Walk the tree depth-first and write down every node the walk passes, including each return to a parent: the **Euler tour**, 2n − 1 entries long. Between the first visits of a and b, the walk goes up from a to the LCA and down to b, so the shallowest node in that stretch is the LCA. A sparse table over the tour, comparing by depth, finds it in O(1) per query. It's the other classic way to answer many LCA queries, and it needs no jumping at all.

## Wrong answers

### Counts nodes instead of edges

```python wrong fails="example" test="Example 1"
class Solution:
    def minOperationsQueries(self, n: int, edges: List[List[int]], queries: List[List[int]]) -> List[int]:
        adj = [[] for _ in range(n)]
        for u, v, w in edges:
            adj[u].append((v, w))
            adj[v].append((u, w))
        out = []
        for a, b in queries:
            seen, todo = {a: []}, [a]
            for u in todo:
                for v, w in adj[u]:
                    if v not in seen:
                        seen[v] = seen[u] + [w]
                        todo.append(v)
            path = seen[b]
            nodes = len(path) + 1  # the path's nodes, one more than its edges
            out.append(nodes - (max(Counter(path).values()) if path else 0))
        return out
```

A path with k edges has k + 1 nodes, and only the edges have weights. Using the node count makes every answer one too big: Example 1's first path needs 1 change, not 2.

### Subtracts the ancestor's counts once

```python wrong fails="example" test="Example 1"
class Solution:
    def minOperationsQueries(self, n: int, edges: List[List[int]], queries: List[List[int]]) -> List[int]:
        adj = [[] for _ in range(n)]
        for u, v, w in edges:
            adj[u].append((v, w))
            adj[v].append((u, w))
        parent, depth, count = [-1] * n, [0] * n, [None] * n
        count[0] = [0] * 27
        order = [0]
        for u in order:
            for v, w in adj[u]:
                if v != parent[u]:
                    parent[v], depth[v] = u, depth[u] + 1
                    count[v] = count[u][:]
                    count[v][w] += 1
                    order.append(v)
        out = []
        for a, b in queries:
            x, y = a, b
            while depth[x] > depth[y]:
                x = parent[x]
            while depth[y] > depth[x]:
                y = parent[y]
            while x != y:
                x, y = parent[x], parent[y]
            length = depth[a] + depth[b] - 2 * depth[x]
            out.append(length - max(count[a][w] + count[b][w] - count[x][w] for w in range(1, 27)))  # once, not twice
        return out
```

The counts from a and from b both include the edges above the LCA, so that part has to be removed twice. Removing it once leaves the shared edges counted, which inflates the most common weight: in Example 1, the path from 2 to 4 seems to have three edges of weight 3, and the answer drops to 0.

### Keeps the tree's most common weight

```python wrong fails="example" test="Example 2"
class Solution:
    def minOperationsQueries(self, n: int, edges: List[List[int]], queries: List[List[int]]) -> List[int]:
        favourite = Counter(w for _, _, w in edges).most_common(1)[0][0] if edges else 1
        adj = [[] for _ in range(n)]
        for u, v, w in edges:
            adj[u].append((v, w))
            adj[v].append((u, w))
        out = []
        for a, b in queries:
            seen, todo = {a: []}, [a]
            for u in todo:
                for v, w in adj[u]:
                    if v not in seen:
                        seen[v] = seen[u] + [w]
                        todo.append(v)
            path = seen[b]
            out.append(len(path) - path.count(favourite))  # one weight for every path
        return out
```

Each query is independent, so each path should keep its own most common weight. Choosing one weight for the whole tree works when every path agrees with it, as in Example 1, but in Example 2 the single edge of weight 7 gets changed to 2, an operation that wasn't needed.

### Climbs the path one edge at a time

```python wrong fails="perf"
class Solution:
    def minOperationsQueries(self, n: int, edges: List[List[int]], queries: List[List[int]]) -> List[int]:
        adj = [[] for _ in range(n)]
        for u, v, w in edges:
            adj[u].append((v, w))
            adj[v].append((u, w))
        parent, weight, depth = [-1] * n, [0] * n, [0] * n
        order = [0]
        for u in order:
            for v, w in adj[u]:
                if v != parent[u]:
                    parent[v], weight[v], depth[v] = u, w, depth[u] + 1
                    order.append(v)
        out = []
        for a, b in queries:
            seen = Counter()
            while a != b:  # climb from the deeper end, counting each edge's weight
                if depth[a] < depth[b]:
                    a, b = b, a
                seen[weight[a]] += 1
                a = parent[a]
            out.append(sum(seen.values()) - max(seen.values(), default=0))
        return out
```

Correct, and it needs no table at all. But every query walks its whole path, and in the test the paths run along a spine of 9,800 nodes: 20,000 queries of over 9,000 edges each come to nearly 200 million steps. Counts from the root and a lifted LCA make each query independent of the path's length.
