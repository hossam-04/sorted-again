---
id: 261
title: Is It a Tree?
own: true
module: graphs
patterns: [union-find, tree = connected and no cycle]
signature: "def validTree(self, n: int, edges: List[List[int]]) -> bool"
lc_skip: Premium on LeetCode, so there are no published outputs to replay
---

## Task

A network has `n` computers, numbered 0 to `n − 1`, and a list of cables `[a, b]`, each connecting two computers both ways. The network is a *tree* if every computer can reach every other one, and there's exactly one route between any two of them: it's connected, and no cables form a loop.

Return `True` if the network is a tree, and `False` otherwise.

## Constraints

- `1 <= n <= 200_000`
- `0 <= len(edges) <= 200_000`
- `0 <= a, b < n`, `a != b`, and no cable appears twice

```json examples
[
  {"args": [4, [[0, 1], [1, 2], [1, 3]]], "out": true, "why": "Three cables connect all four computers, without a loop."},
  {"args": [4, [[0, 1], [1, 2], [2, 3], [3, 1]]], "out": false, "why": "Every computer is connected, but 1, 2 and 3 form a loop, so there are two routes between any two of them."},
  {"args": [4, [[0, 1], [2, 3]]], "out": false, "why": "There's no loop, but 0 and 1 can't reach 2 and 3: the network is in two pieces."}
]
```

```json edge
[
  {"name": "a single computer", "args": [1, []], "out": true},
  {"name": "two computers, no cable", "args": [2, []], "out": false},
  {"name": "two computers, one cable", "args": [2, [[0, 1]]], "out": true},
  {"name": "the right number of cables, but a loop", "args": [4, [[0, 1], [1, 2], [2, 0]]], "out": false},
  {"name": "a long chain", "args": [5, [[3, 4], [2, 3], [1, 2], [0, 1]]], "out": true}
]
```

```python oracle
class Solution:
    def validTree(self, n: int, edges: List[List[int]]) -> bool:
        adj = defaultdict(set)
        for a, b in edges:
            adj[a].add(b)
            adj[b].add(a)
        seen, stack = {0}, [0]  # connected?
        while stack:
            for nb in adj[stack.pop()]:
                if nb not in seen:
                    seen.add(nb)
                    stack.append(nb)
        if len(seen) != n:
            return False
        for a, b in edges:  # no loop: removing any cable must disconnect its ends
            adj[a].discard(b)
            adj[b].discard(a)
            reach, stack = {a}, [a]
            while stack:
                for nb in adj[stack.pop()]:
                    if nb not in reach:
                        reach.add(nb)
                        stack.append(nb)
            adj[a].add(b)
            adj[b].add(a)
            if b in reach:
                return False
        return True
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 5) if size == "small" else rng.randint(5, 20)
    edges = set()
    for v in range(1, n):  # usually start from a random tree...
        if rng.random() < 0.85:
            edges.add((rng.randrange(v), v))
    if n > 2 and rng.random() < 0.5:  # ...and sometimes add a loop
        a, b = rng.sample(range(n), 2)
        if (a, b) not in edges and (b, a) not in edges:
            edges.add((a, b))
    edges = [list(e) for e in edges]
    rng.shuffle(edges)
    return [n, edges]
```

```python perf
def perf(rng):
    # A random tree of 200,000 computers.
    n = 200_000
    edges = [[rng.randrange(v), v] for v in range(1, n)]
    rng.shuffle(edges)
    return [n, edges]
```

## Hints

1. A tree on n nodes always has exactly n − 1 edges. Fewer means it can't be connected; more means there's a loop.
2. With exactly n − 1 edges, being connected and having no loop come together: check either one.
3. Add the cables to a union-find one by one. If a cable connects two computers already in the same group, it closes a loop.

## Solution

```python solution time="n · α(n)" space="n"
class Solution:
    def validTree(self, n: int, edges: List[List[int]]) -> bool:
        if len(edges) != n - 1:
            return False  # a tree has exactly n - 1 edges
        parent, size = list(range(n)), [1] * n

        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x

        for a, b in edges:
            ra, rb = find(a), find(b)
            if ra == rb:
                return False  # a and b were already connected: this cable closes a loop
            if size[ra] < size[rb]:
                ra, rb = rb, ra
            parent[rb] = ra
            size[ra] += size[rb]
        return True  # n - 1 edges and no loop: connected as well
```

A graph with n nodes and n − 1 edges is connected exactly when it has no loop, so after the edge count, one property is enough. Union-find checks for loops: every cable must join two different groups. If all n − 1 cables do, they merge n singletons into a single group, so the network is also connected.

## Alternatives

### Search once, from computer 0

```python alt time="n" space="n"
class Solution:
    def validTree(self, n: int, edges: List[List[int]]) -> bool:
        if len(edges) != n - 1:
            return False
        adj = [[] for _ in range(n)]
        for a, b in edges:
            adj[a].append(b)
            adj[b].append(a)
        seen, stack = [False] * n, [0]
        seen[0] = True
        while stack:
            for nb in adj[stack.pop()]:
                if not seen[nb]:
                    seen[nb] = True
                    stack.append(nb)
        return all(seen)  # n - 1 edges and connected: a tree
```

With the edge count checked, it's enough to confirm that one search from computer 0 reaches everyone.

## Wrong answers

### Only counts the cables

```python wrong fails="edge" test="the right number of cables, but a loop"
class Solution:
    def validTree(self, n: int, edges: List[List[int]]) -> bool:
        return len(edges) == n - 1  # necessary, but not enough
```

Every tree has n − 1 edges, but not every graph with n − 1 edges is a tree: three cables can form a loop between computers 0, 1 and 2 and leave computer 3 cut off. The count rules out most graphs; connectivity or the absence of loops must still be checked.

### Mistakes the way back for a loop

```python wrong fails="example" test="Example 1"
class Solution:
    def validTree(self, n: int, edges: List[List[int]]) -> bool:
        adj = [[] for _ in range(n)]
        for a, b in edges:
            adj[a].append(b)
            adj[b].append(a)
        seen = set()

        def dfs(u):
            if u in seen:
                return False  # also reached by stepping straight back to where we came from
            seen.add(u)
            return all(dfs(v) for v in adj[u])

        return dfs(0) and len(seen) == n
```

Cables work both ways, so from computer 1 the search can step straight back to computer 0, which it came from, and that looks like a loop. In an undirected graph, a search must skip the edge back to its parent; only reaching an already-visited node any *other* way means a loop.

### Searches the network before adding each cable

```python wrong fails="perf"
class Solution:
    def validTree(self, n: int, edges: List[List[int]]) -> bool:
        if len(edges) != n - 1:
            return False
        adj = [[] for _ in range(n)]
        for a, b in edges:
            reach, stack = {a}, [a]  # can a already reach b?
            while stack:
                for nb in adj[stack.pop()]:
                    if nb not in reach:
                        reach.add(nb)
                        stack.append(nb)
            if b in reach:
                return False
            adj[a].append(b)
            adj[b].append(a)
        return True
```

Searching before each cable detects loops correctly, but each search can cover everything added so far, O(n²) in total: billions of steps for 200,000 computers. Union-find answers the same question in nearly O(1).
