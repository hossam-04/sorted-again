---
id: 133
module: graphs
patterns: [old-to-new map, graph traversal, deep copy]
signature: "def cloneGraph(self, node: Optional['Node']) -> Optional['Node']"
adapter: graph
node: graph
---

## Task

Each node of a connected, undirected graph has a value `val` and a list `neighbors`:

```python
class Node:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []
```

The nodes' values are 1 to n, all different. You get the node with value 1 (or `None` for an empty graph). Return a *deep copy* of the graph: brand-new nodes with the same values, connected the same way, with each node's neighbours in the same order. No node of the copy may be a node of the original.

Tests write a graph as a list whose entry i lists the values of the neighbours of the node with value i + 1.

## Constraints

- `0 <= n <= 20_000`, at most `60_000` edges
- No edge connects a node to itself, and no edge appears twice

```json examples
[
  {"args": [[[2, 3], [1, 3], [1, 2]]], "out": [[2, 3], [1, 3], [1, 2]], "why": "Every node is connected to the other two. The copy has three new nodes connected the same way."},
  {"args": [[[2], [1, 3], [2]]], "out": [[2], [1, 3], [2]], "why": "A line of three nodes: the copy of node 2 must list the copies of nodes 1 and 3, in that order."},
  {"args": [[[2, 3, 4], [1], [1], [1]]], "out": [[2, 3, 4], [1], [1], [1]], "why": "A star: every copy of an outer node points back to the copy of node 1, not to node 1 itself."}
]
```

```json edge
[
  {"name": "an empty graph", "args": [[]], "out": []},
  {"name": "a single node", "args": [[[]]], "out": [[]]},
  {"name": "two nodes", "args": [[[2], [1]]], "out": [[2], [1]]},
  {"name": "a square with a diagonal", "args": [[[2, 4, 3], [1, 3], [2, 4, 1], [3, 1]]], "out": [[2, 4, 3], [1, 3], [2, 4, 1], [3, 1]]}
]
```

```python oracle
class Solution:
    def cloneGraph(self, node: Optional['Node']) -> Optional['Node']:
        if node is None:
            return None
        nodes, stack = {}, [node]  # collect every original node first
        while stack:
            cur = stack.pop()
            if cur.val not in nodes:
                nodes[cur.val] = cur
                stack.extend(cur.neighbors)
        copies = {v: Node(v) for v in nodes}
        for v, original in nodes.items():
            copies[v].neighbors = [copies[nb.val] for nb in original.neighbors]
        return copies[node.val]
```

```python gen
def gen(rng, size):
    n = rng.randint(0, 4) if size == "small" else rng.randint(5, 30)
    adj = [[] for _ in range(n)]
    for v in range(1, n):  # a random tree keeps the graph connected
        u = rng.randrange(v)
        adj[u].append(v + 1)
        adj[v].append(u + 1)
    for _ in range(n):  # then a few extra edges
        a, b = rng.randrange(n), rng.randrange(n)
        if a != b and b + 1 not in adj[a]:
            adj[a].append(b + 1)
            adj[b].append(a + 1)
    for nbrs in adj:
        rng.shuffle(nbrs)
    return [adj]
```

```python perf
def perf(rng):
    # 20,000 nodes: a long cycle plus 40,000 random extra edges.
    n = 20_000
    edges = {(v, (v + 1) % n) for v in range(n)}
    while len(edges) < 60_000:
        a, b = rng.randrange(n), rng.randrange(n)
        if a != b and (b, a) not in edges:
            edges.add((a, b))
    adj = [[] for _ in range(n)]
    for a, b in edges:
        adj[a].append(b + 1)
        adj[b].append(a + 1)
    return [adj]
```

## Hints

1. Copying a node means creating a new `Node` and filling its neighbour list with the *copies* of its neighbours. But a neighbour's copy may not exist yet, and the graph has cycles.
2. Keep a dict from each original node to its copy. It tells you whether a node has been copied already, and gives you the copy when you need to link to it.
3. Walk the graph with breadth-first search: create a node's copy when you first meet it, then, when you take a node out of the queue, append its neighbours' copies to its own copy's list.

## Solution

```python solution time="n + e" space="n"
class Solution:
    def cloneGraph(self, node: Optional['Node']) -> Optional['Node']:
        if node is None:
            return None
        copies = {node: Node(node.val)}  # original -> its copy; also the "visited" set
        queue = deque([node])
        while queue:
            cur = queue.popleft()
            for nb in cur.neighbors:
                if nb not in copies:
                    copies[nb] = Node(nb.val)  # first time we meet nb: copy it, and visit it later
                    queue.append(nb)
                copies[cur].neighbors.append(copies[nb])  # link copy to copy, never to an original
        return copies[node]
```

The dict does two jobs at once. It's the visited set of the search, so every node is copied once even though cycles lead back to it, and it's the lookup that turns "this original neighbour" into "its copy". Every node is queued once and every edge is followed twice (once from each end), so the time is O(n + e), where e is the number of edges.

## Alternatives

### Recursive depth-first copy

```python alt time="n + e" space="n"
class Solution:
    def cloneGraph(self, node: Optional['Node']) -> Optional['Node']:
        copies = {}

        def clone(n):
            if n in copies:
                return copies[n]
            copy = Node(n.val)
            copies[n] = copy  # register before recursing, so cycles find it
            for nb in n.neighbors:
                copy.neighbors.append(clone(nb))
            return copy

        return clone(node) if node else None
```

Registering the copy in the dict *before* copying the neighbours is what stops the recursion from going round a cycle forever. The recursion can be as deep as the graph has nodes: fine for 20,000 here, but a stack or queue is the safer habit.

## Wrong answers

### Shares the original neighbour lists

```python wrong fails="example" test="Example 1" how="error"
class Solution:
    def cloneGraph(self, node: Optional['Node']) -> Optional['Node']:
        if node is None:
            return None
        copies = {node: Node(node.val)}
        queue = deque([node])
        while queue:
            cur = queue.popleft()
            copies[cur].neighbors = cur.neighbors  # the copy now points at the original nodes
            for nb in cur.neighbors:
                if nb not in copies:
                    copies[nb] = Node(nb.val)
                    queue.append(nb)
        return copies[node]
```

The nodes are new, but each copy's `neighbors` *is* the original's list, so following any edge from the copy lands back in the original graph. A deep copy must link copies only to copies.

### Forgets which nodes are already copied

```python wrong fails="example" test="Example 1" how="error"
class Solution:
    def cloneGraph(self, node: Optional['Node']) -> Optional['Node']:
        if node is None:
            return None
        copy = Node(node.val)
        for nb in node.neighbors:
            copy.neighbors.append(self.cloneGraph(nb))  # no memory: goes round cycles forever
        return copy
```

Without remembering what's been copied, the copy of node 1 copies node 2, whose copy copies node 1 again, and so on: on any cycle the recursion never ends, until Python raises `RecursionError`. Keep a dict of copies and check it before copying.

### Looks up copies in a list

```python wrong fails="perf"
class Solution:
    def cloneGraph(self, node: Optional['Node']) -> Optional['Node']:
        if node is None:
            return None
        pairs = [(node, Node(node.val))]  # (original, copy), searched one by one

        def copy_of(n):
            for original, copy in pairs:
                if original is n:
                    return copy
            return None

        queue = deque([node])
        while queue:
            cur = queue.popleft()
            for nb in cur.neighbors:
                c = copy_of(nb)
                if c is None:
                    c = Node(nb.val)
                    pairs.append((nb, c))
                    queue.append(nb)
                copy_of(cur).neighbors.append(c)
        return copy_of(node)
```

The logic is right, but finding a copy scans the whole list of pairs, which grows to n entries. That's O(n) per edge, O(n · e) in all: with 20,000 nodes and 60,000 edges, billions of steps. A dict finds a copy in O(1).
