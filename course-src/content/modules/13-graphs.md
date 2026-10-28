---
id: graphs
title: Graphs
kicker: representations · BFS · DFS · grids · topological sort · union-find · shortest paths · spanning trees · Euler paths
summary: "A graph is nodes joined by edges: road maps, course prerequisites, friendships, the cells of a grid. Most graph problems are one of a few classic algorithms in disguise, and the skill is recognising which: breadth-first search for fewest steps, depth-first search to explore, Dijkstra when edges have weights, union-find when only the groups matter."
---

## Representations

A **graph** is a set of nodes (also called vertices) and edges between them. Edges can be **directed**, one-way like a prerequisite, or **undirected**, two-way like a friendship, and they can carry **weights**: a cost, a time, a distance. V and E stand for the numbers of nodes and edges.

Problems hand you graphs in several shapes:

- an **edge list**, such as `[[0, 1], [1, 2]]`;
- an **adjacency list**: for every node, the list of its neighbours;
- an **adjacency matrix**, where `m[a][b]` says whether there's an edge, or what it weighs;
- an **implicit graph**, where you work out the neighbours when you need them: the four cells around a grid cell, or the words one letter away from a word.

The first step is almost always to turn the input into adjacency lists. They take O(V + E) memory, and give a node's neighbours in O(1).

```python run title=From_edges_to_adjacency_lists
from collections import defaultdict

edges = [[0, 1], [0, 2], [1, 2], [2, 3]]

undirected = defaultdict(list)
for a, b in edges:
    undirected[a].append(b)  # both directions
    undirected[b].append(a)

directed = defaultdict(list)
for a, b in edges:
    directed[a].append(b)  # one direction only

print("undirected:", dict(undirected))
print("directed:  ", dict(directed))

weighted = defaultdict(list)
for a, b, w in [["A", "B", 5], ["A", "C", 2], ["C", "B", 1]]:
    weighted[a].append((b, w))  # (neighbour, weight)
print("weighted:  ", dict(weighted))
```

With `defaultdict(list)`, a node with no outgoing edges isn't in the dict until you look it up. When every node matters, for example to count groups, create a list for each of the n nodes up front: `[[] for _ in range(n)]`.

## Breadth-first search

Breadth-first search (BFS) explores in rings: the start, then every node one edge away, then two edges away, and so on. A **queue** gives exactly that order. In a graph without weights, the first time BFS reaches a node is along a path with the fewest edges, so BFS *is* the shortest-path algorithm for unweighted graphs. [[p:127]] runs it on an implicit graph of words.

```python run title=Shortest_path_with_BFS
from collections import deque

graph = {"home": ["park", "shop"], "park": ["home", "lake"], "shop": ["home", "lake", "school"],
         "lake": ["park", "shop", "school"], "school": ["shop", "lake"]}

def shortest_path(graph, start, goal):
    parent = {start: None}  # where each node was reached from; also the visited set
    queue = deque([start])
    while queue:
        node = queue.popleft()
        if node == goal:
            path = []
            while node is not None:  # walk the parents back to the start
                path.append(node)
                node = parent[node]
            return path[::-1]
        for nb in graph[node]:
            if nb not in parent:
                parent[nb] = node  # mark when queued
                queue.append(nb)
    return None

print(shortest_path(graph, "home", "school"))
print(shortest_path(graph, "park", "school"))
```

:::gotcha Mark nodes when they enter the queue
Mark a node as visited when you *add* it to the queue, not when you take it out. Marking on the way out lets every neighbour that reaches the node before it's processed add it again: on a dense graph the queue fills up with duplicates, and if distances are written when nodes are queued, a later duplicate can overwrite a node's distance with a larger one.
:::

**Multi-source BFS** starts with several nodes in the queue, all at distance 0. Then every node is reached at its distance from the *nearest* source, in a single pass: [[p:994]] spreads the rot from every rotten orange at once, and [[p:286]] measures distances from every gate.

:::viz grid-bfs-multisource
:::

Use "Edit input" to add walls or gates: one search gives every room its distance to the closest gate.

## Depth-first search

Depth-first search (DFS) follows one path as far as it goes before backing up, like the backtracking of [[m:backtracking]] without the un-choosing. It can be written recursively or with an explicit stack, and it's the natural way to explore everything reachable, count connected groups and detect cycles.

Cycle detection depends on the kind of graph:

- **Undirected:** reaching an already-visited node means a cycle, except for the node you just came from: every edge leads straight back to it ([[p:261]]).
- **Directed:** a cycle means reaching a node that's still *on the current path*. A node that was finished earlier and is reached again along another route is fine. That takes three states: unvisited, on the path, finished ([[p:207]]).

```python run title=Cycles_in_directed_graphs
def has_cycle(graph):
    state = {}  # missing = unvisited, 1 = on the current path, 2 = finished

    def visit(node):
        state[node] = 1
        for nxt in graph.get(node, []):
            if state.get(nxt) == 1:
                return True  # back to a node on the current path
            if nxt not in state and visit(nxt):
                return True
        state[node] = 2  # every path from here is explored
        return False

    return any(node not in state and visit(node) for node in graph)

diamond = {"a": ["b", "c"], "b": ["d"], "c": ["d"]}  # d is reached twice, but that's no cycle
loop = {"a": ["b"], "b": ["c"], "c": ["a"]}
print("diamond:", has_cycle(diamond))
print("loop:   ", has_cycle(loop))
```

:::gotcha Recursion depth on big graphs
A recursive DFS goes one call deeper for every node on its current path. On a 100 × 100 grid that can be 10,000 nested calls, and plain Python stops at 1,000 with a `RecursionError`. `sys.setrecursionlimit` raises the limit, and this page allows 100,000, but one snake-shaped island on a 500 × 500 grid needs even more. For large inputs, use a queue or an explicit stack: they never run out of depth. [[p:200]] shows the recursive version failing.
:::

## Grids

A grid is a graph in disguise: every cell is a node, joined to the cells above, below, left and right (sometimes diagonally as well: read the problem). There's no need to build adjacency lists. Generate a cell's neighbours when you need them, and check the bounds:

```python
for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
    if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == "1":
        ...
```

Three patterns cover most grid problems:

- **Count or measure regions.** Start a search from every unvisited cell of interest; each search covers one whole region ([[p:200]], [[p:695]]). Overwriting visited cells in the grid itself saves a separate `seen` set.
- **Search from the border, or from the goal.** When the direct search would repeat itself, turn the question around. [[p:417]] walks uphill from each ocean instead of downhill from every cell, and [[p:130]] marks what the border can reach and captures the rest.
- **Start from several cells at once**, with multi-source BFS ([[p:994]], [[p:286]]).

## Topological sort

A **topological order** of a directed graph lists its nodes so that every edge points forward, like courses listed after their prerequisites. One exists exactly when the graph has no cycle: when it's a **DAG**, a directed acyclic graph.

**Kahn's algorithm** counts each node's incoming edges, starts a queue with the nodes that have none, and repeatedly takes a ready node, lowering the counts of the nodes it points to. Nodes that never become ready sit on a cycle. [[p:207]] only asks whether an order exists, [[p:210]] wants the order itself, and [[p:269]] first has to work out the edges from a sorted list of words.

:::viz kahn-topo
:::

DFS gives a topological order too: a node finishes only after everything reachable from it, so the reversed finishing order points every edge forward.

## Union-find

Some questions are only about groups: are these two nodes connected, how many separate groups are there, does this new edge close a cycle? **Union-find**, also called a disjoint-set union, answers them without any searching. Each group is a tree of parent pointers whose root represents the group:

- `find(x)` walks up from x to its root;
- `union(a, b)` hangs one root under the other.

Two refinements make both operations nearly O(1). **Union by size** hangs the smaller tree under the larger one, so the trees stay shallow. **Path compression** points the nodes on a find path closer to the root; the *path halving* used here points each node at its grandparent.

:::viz union-find
:::

```python run title=A_reusable_union_find
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.size = [1] * n
        self.groups = n

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]  # path halving
            x = self.parent[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False  # already connected: this edge would close a cycle
        if self.size[ra] < self.size[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra  # union by size
        self.size[ra] += self.size[rb]
        self.groups -= 1
        return True

uf = UnionFind(6)
for a, b in [(0, 1), (2, 3), (1, 3), (0, 2), (4, 5)]:
    print(f"union({a}, {b}) -> {uf.union(a, b)}")
print("groups:", uf.groups, "| 3 and 0 connected:", uf.find(3) == uf.find(0))
```

Union-find is behind [[p:684]], [[p:323]] and [[p:261]], and behind Kruskal's algorithm below. Unlike a search, it keeps working as edges arrive one at a time.

## Shortest paths

The right algorithm depends on the weights:

- **No weights**, or all the same: BFS, O(V + E).
- **Weights that are never negative:** **Dijkstra's algorithm**. A min-heap holds (distance, node) entries, and the first entry popped for a node gives its final distance, because every other route would continue from a node that is at least as far away. O(E log E) with a heap.
- **Negative weights, or a limit on the number of edges:** **Bellman-Ford**, which relaxes every edge in rounds. After round i, every shortest path with at most i edges is known. O(V · E).

:::viz dijkstra
:::

:::gotcha Stale entries and negative weights
`heapq` can't lower a value that's already in the heap, so Dijkstra pushes a new entry whenever it finds a better distance, and the old entry stays behind. Skip any popped entry whose node is already settled, or the node is processed again for nothing. And Dijkstra assumes no weight is negative: once a node is settled it's never revisited, so a negative edge found later can't fix its distance. Use Bellman-Ford when weights can be negative.
:::

```python run title=Why_Dijkstra_needs_non_negative_weights
from heapq import heappush, heappop

graph = {"S": [("A", 2), ("B", 5)], "A": [("C", 4)], "B": [("A", -4)], "C": []}

def dijkstra(graph, start):
    dist, done, heap = {start: 0}, set(), [(0, start)]
    while heap:
        d, u = heappop(heap)
        if u in done:
            continue
        done.add(u)
        for v, w in graph[u]:
            if v not in done and d + w < dist.get(v, float("inf")):
                dist[v] = d + w
                heappush(heap, (dist[v], v))
    return dist

def bellman_ford(graph, start):
    dist = {node: float("inf") for node in graph}
    dist[start] = 0
    for _ in range(len(graph) - 1):  # V - 1 rounds of relaxing every edge
        for u in graph:
            for v, w in graph[u]:
                dist[v] = min(dist[v], dist[u] + w)
    return dist

print("Dijkstra:    ", dijkstra(graph, "S"))
print("Bellman-Ford:", bellman_ford(graph, "S"))
```

Dijkstra settles A at 2 before it ever looks at the edge B → A, which would bring A down to 1. Bellman-Ford keeps relaxing every edge and gets it right.

[[p:743]] is plain Dijkstra. [[p:787]] limits the number of flights, which Dijkstra can't account for, so it runs exactly k + 1 rounds of Bellman-Ford. [[p:778]] measures a path by its highest point instead of its total, and Dijkstra works unchanged with `max` in place of `+`.

## Minimum spanning trees

A **spanning tree** connects all the nodes of a connected, undirected graph using V − 1 edges, and a **minimum spanning tree** (MST) does it with the smallest total weight. The two classic algorithms are both greedy, and both rest on the same fact: when the nodes are split into two sides, the cheapest edge between the sides is always safe to take.

- **Prim's algorithm** grows a single tree from a start node, always adding the cheapest edge from the tree to a node outside it. With a heap it takes O(E log V); on a dense graph, an array of each outside node's best connection makes it O(V²).
- **Kruskal's algorithm** sorts all the edges and keeps each one that joins two different groups, tracked with union-find: O(E log E).

[[p:1584]] has an edge between every pair of points, so the array version of Prim's algorithm is the one to use.

## Euler paths

An **Euler path** uses every *edge* exactly once (unlike most paths, which are about visiting nodes). In a directed graph, one exists when the edges are all connected and every node has as many edges in as out, except possibly a start node with one extra edge out and an end node with one extra edge in.

**Hierholzer's algorithm** finds it in O(E): follow unused edges until you get stuck, add the node where you're stuck to the route, then back up and continue from the previous node. The route comes out in reverse. [[p:332]] adds a twist: among all the valid trips, it wants the alphabetically smallest, which comes from always taking the smallest unused ticket first.

## Complexity

| Task | Algorithm | Time |
|---|---|---|
| Visit everything reachable | BFS or DFS | `O(V + E)` |
| Shortest paths, no weights | BFS | `O(V + E)` |
| Shortest paths, weights ≥ 0 | Dijkstra with a heap | `O(E log E)` |
| Shortest paths, negative weights or at most k edges | Bellman-Ford | `O(V · E)`, or `O(k · E)` |
| Topological order, directed cycles | Kahn's algorithm or DFS | `O(V + E)` |
| Groups as edges arrive | union-find | `O(α(V))` per operation |
| Minimum spanning tree | Kruskal, or Prim with a heap | `O(E log E)` |
| Minimum spanning tree, dense graph | Prim with an array | `O(V²)` |
| Euler path | Hierholzer | `O(E)`, plus sorting when order matters |

On an m × n grid, V = m·n and E is about 4·m·n. α is the inverse Ackermann function, which is at most 4 for any graph that fits in a computer.

:::interview
Before writing code, say what the nodes and the edges are, whether edges are directed or weighted, and how large V and E can be. That usually picks the algorithm: BFS for fewest steps, Dijkstra for weighted shortest paths, topological sort for "in what order", union-find for "are these connected". Mention that you mark nodes when they're queued, and on big grids, that a queue or an explicit stack avoids recursion limits.
:::

:::work
Graphs model road networks (route planners run descendants of Dijkstra's algorithm), build systems and package managers (dependencies installed in topological order, with circular dependencies reported as cycles), social and computer networks (groups and reachability), and schedulers that respect prerequisites. A garbage collector's "mark" phase is a graph search over objects. Libraries such as networkx implement all of these, and knowing the algorithms tells you which one to call and how long it will take.
:::

## Quick check

:::quiz
? Breadth-first search from S first reaches node X after 3 edges. What does that tell you?
- [x] The shortest path from S to X has 3 edges
- [ ] X has 3 neighbours
- [ ] Every path from S to X has 3 edges
> BFS reaches nodes in order of distance, so the first time it gets to X is along a path with the fewest edges.

? Why mark a node as visited when it enters the queue, rather than when it leaves?
- [ ] It makes the search depth-first
- [x] So that a node can only be added to the queue once
- [ ] Because nodes leave the queue in random order
> Marking on the way in stops every other neighbour from queuing the same node again before it's processed.

? A depth-first search of a directed graph reaches a node that is already finished. Is that a cycle?
- [ ] Yes, any revisit is a cycle
- [x] No: a cycle means reaching a node that's still on the current path
- [ ] Only if the node has no outgoing edges
> A finished node reached along a second route, as in a diamond shape, is not a cycle. Only an edge back to a node on the current path closes one.

? Which algorithm finds shortest paths when some edge weights are negative?
- [ ] Dijkstra's algorithm with a heap
- [ ] Breadth-first search
- [x] Bellman-Ford
> Dijkstra never revisits a settled node, so a negative edge found later can't correct it. Bellman-Ford keeps relaxing every edge.

? What do union by size and path compression do for union-find?
- [ ] They let it find shortest paths
- [x] They keep the trees shallow, so each operation takes nearly O(1)
- [ ] They sort the groups
> Hanging smaller trees under larger ones, and pointing nodes closer to their root during finds, keeps every path short.
:::
