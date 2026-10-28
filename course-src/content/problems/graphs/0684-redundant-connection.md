---
id: 684
module: graphs
patterns: [union-find, cycle detection in an undirected graph]
signature: "def findRedundantConnection(self, edges: List[List[int]]) -> List[int]"
---

## Task

A tree with n nodes, labelled 1 to n, had one extra edge added between two of its nodes. You get all n edges, in order, as pairs `[a, b]` with `a < b`.

Return an edge that can be removed so that the rest is a tree again. If there are several such edges, return the one that appears **last** in the list.

## Constraints

- `3 <= n <= 100_000`
- `1 <= a < b <= n`, and no edge appears twice
- The graph is connected

```json examples
[
  {"args": [[[1, 2], [2, 3], [1, 3]]], "out": [1, 3], "why": "The three edges form a triangle. Removing any one of them leaves a tree, and [1, 3] comes last."},
  {"args": [[[1, 2], [2, 3], [3, 4], [2, 4], [4, 5]]], "out": [2, 4], "why": "The cycle is 2 – 3 – 4. Of its three edges, [2, 4] appears last; removing [4, 5] instead would cut node 5 off."},
  {"args": [[[1, 4], [3, 4], [1, 3], [1, 2], [4, 5]]], "out": [1, 3], "why": "The answer is the last edge on the cycle 1 – 4 – 3, not the last edge overall: [1, 2] and [4, 5] are needed to keep 2 and 5 connected."}
]
```

```json edge
[
  {"name": "a long cycle", "args": [[[1, 2], [2, 3], [3, 4], [4, 5], [1, 5]]], "out": [1, 5]},
  {"name": "the cycle closes early", "args": [[[1, 2], [1, 3], [2, 3], [3, 4], [4, 5]]], "out": [2, 3]},
  {"name": "edges in a scrambled order", "args": [[[2, 3], [1, 2], [1, 3]]], "out": [1, 3]}
]
```

```python oracle
class Solution:
    def findRedundantConnection(self, edges: List[List[int]]) -> List[int]:
        n = len(edges)

        def connected_without(skip):  # is the graph still connected with edge `skip` removed?
            adj = defaultdict(list)
            for i, (a, b) in enumerate(edges):
                if i != skip:
                    adj[a].append(b)
                    adj[b].append(a)
            seen, stack = {1}, [1]
            while stack:
                for nb in adj[stack.pop()]:
                    if nb not in seen:
                        seen.add(nb)
                        stack.append(nb)
            return len(seen) == n

        for i in range(n - 1, -1, -1):  # try removing edges from the last one back
            if connected_without(i):
                return edges[i]
```

```python gen
def gen(rng, size):
    n = rng.randint(3, 5) if size == "small" else rng.randint(6, 20)
    edges = set()
    for v in range(2, n + 1):  # a random tree
        u = rng.randint(1, v - 1)
        edges.add((u, v))
    while len(edges) < n:  # one extra edge
        a, b = sorted(rng.sample(range(1, n + 1), 2))
        edges.add((a, b))
    edges = [list(e) for e in edges]
    rng.shuffle(edges)
    return [edges]
```

```python perf
def perf(rng):
    # 100,000 nodes: node 1 joined to every other node, then the extra edge [2, 3].
    n = 100_000
    return [[[1, v] for v in range(2, n + 1)] + [[2, 3]]]
```

## Hints

1. Add the edges one at a time. While the graph is still a forest, each edge either joins two separate trees or connects two nodes that are already connected; in the second case, it closes a cycle.
2. The first edge that closes a cycle is the answer: every other edge of that cycle came earlier in the list, so it's the last one of the cycle.
3. Answer "are a and b already connected?" quickly with **union-find**: each group of connected nodes has a representative, and two nodes are connected exactly when their representatives are the same.

## Solution

```python solution time="n · α(n)" space="n"
class Solution:
    def findRedundantConnection(self, edges: List[List[int]]) -> List[int]:
        parent = list(range(len(edges) + 1))  # node -> parent in its group's tree; roots point to themselves
        size = [1] * (len(edges) + 1)

        def find(x):  # the root of x's group
            while parent[x] != x:
                parent[x] = parent[parent[x]]  # path halving: point x at its grandparent
                x = parent[x]
            return x

        for a, b in edges:
            ra, rb = find(a), find(b)
            if ra == rb:
                return [a, b]  # a and b are already connected: this edge closes a cycle
            if size[ra] < size[rb]:
                ra, rb = rb, ra
            parent[rb] = ra  # union by size: hang the smaller tree under the larger
            size[ra] += size[rb]
```

Union-find keeps the nodes in groups, each stored as a tree whose root represents the group. `find` walks up to the root, and an edge between two nodes with the same root would join a group to itself, which is exactly an edge that closes a cycle.

Two tricks keep the trees flat. **Union by size** always hangs the smaller tree under the larger one, so no tree gets taller than log n. **Path compression**, here path halving, shortcuts the nodes it walks past, so later finds are faster still. Together they make each operation run in O(α(n)), where α is the inverse Ackermann function, at most 4 for any realistic n.

## Alternatives

### Check each edge with a graph search

```python alt time="n²" space="n" slow
class Solution:
    def findRedundantConnection(self, edges: List[List[int]]) -> List[int]:
        adj = defaultdict(list)
        for a, b in edges:
            seen, stack = {a}, [a]  # can a already reach b without this edge?
            while stack:
                for nb in adj[stack.pop()]:
                    if nb not in seen:
                        seen.add(nb)
                        stack.append(nb)
            if b in seen:
                return [a, b]
            adj[a].append(b)
            adj[b].append(a)
```

Before adding each edge, search the graph so far to see whether its two ends are already connected. That's correct and easy to trust, but every search can cover the whole graph: O(n²) in total, far too slow for 100,000 edges.

## Wrong answers

### Compares parents instead of roots

```python wrong fails="example" test="Example 3"
class Solution:
    def findRedundantConnection(self, edges: List[List[int]]) -> List[int]:
        parent = list(range(len(edges) + 1))
        for a, b in edges:
            if parent[a] == parent[b]:  # the direct parents, not the groups' roots
                return [a, b]
            parent[b] = parent[a]  # moves b alone, not b's whole group
```

A node's direct parent says nothing about its group: two nodes in the same group can have different parents, and relabelling only `b` leaves the rest of its group behind. In Example 3 the groups fall apart and the cycle is never detected, so the function returns `None`. Follow parents up to the root with `find`, and join roots, not nodes.

### Union-find without balancing or compression

```python wrong fails="perf"
class Solution:
    def findRedundantConnection(self, edges: List[List[int]]) -> List[int]:
        parent = list(range(len(edges) + 1))

        def find(x):
            while parent[x] != x:  # walks the whole path, every time
                x = parent[x]
            return x

        for a, b in edges:
            ra, rb = find(a), find(b)
            if ra == rb:
                return [a, b]
            parent[ra] = rb  # always hangs a's tree under b's root, however tall it is
```

The logic is right, but nothing stops the trees from growing into long chains. In the test, every edge `[1, v]` hangs the tree containing node 1 under the new node v, so the chain above node 1 grows by one each time and every `find(1)` walks all of it: O(n²) steps. Union by size or path compression, ideally both, keeps the trees flat.
