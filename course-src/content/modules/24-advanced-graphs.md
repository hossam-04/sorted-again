---
id: advanced-graphs
part: advanced
title: Advanced graphs
kicker: all-pairs shortest paths · 0-1 BFS · weighted union-find · functional graphs · bridges · strongly connected components
summary: "The core graphs module covered searching, Dijkstra, topological order and union-find. This one adds the tools for the questions after that: distances between every pair, shortest paths when edges cost 0 or 1, groups with ratios between their members, graphs where every node has one way out, the links whose loss splits a network, and the parts of a directed graph where everything reaches everything."
---

## Distances between every pair: Floyd–Warshall

[[m:graphs]] found shortest paths from one start. When you need them between *every* pair of nodes and the graph is small, **Floyd–Warshall** is four lines. Start with the edge lengths (infinity where there's no edge, 0 on the diagonal), then let each node k in turn serve as a stop in the middle:

```python run title=Floyd–Warshall
from math import inf

n = 4
edges = [(0, 1, 3), (1, 2, 3), (0, 2, 9), (2, 3, 1)]
d = [[0 if i == j else inf for j in range(n)] for i in range(n)]
for a, b, w in edges:
    d[a][b] = d[b][a] = min(d[a][b], w)

for k in range(n):  # k must be the outermost loop
    for i in range(n):
        for j in range(n):
            d[i][j] = min(d[i][j], d[i][k] + d[k][j])

for row in d:
    print(row)
```

After round k, `d[i][j]` is the shortest route whose middle stops are all among nodes 0 to k. That's why k has to be the outer loop: round k relies on round k − 1 being finished for every pair. O(n³) time, which is fine up to a few hundred nodes ([[p:1334]]). It also works with negative edge lengths, and a negative number on the diagonal afterwards reveals a negative cycle.

## When edges cost 0 or 1: 0-1 BFS

If every edge costs either 0 or 1, Dijkstra's heap can be replaced by a **deque**. A node reached by a free edge goes to the *front* (same cost as the current node), and one reached by a cost-1 edge goes to the *back*. The deque never holds more than two costs at once, d and d + 1, so nodes still come out in order of cost, and each step is O(1) instead of O(log n).

This fits problems where "following the rules" is free and "breaking a rule" costs one: changing a sign in a grid ([[p:1368]]), removing an obstacle, or switching lines on a transport map.

```python run title=0-1_BFS
from collections import deque
from math import inf

# edges: (to, cost) with cost 0 or 1
graph = {"A": [("B", 1), ("C", 0)], "B": [("D", 1)], "C": [("B", 0), ("D", 1)], "D": []}  # B is free by way of C
dist = {node: inf for node in graph}
dist["A"] = 0
todo = deque(["A"])
while todo:
    u = todo.popleft()
    for v, cost in graph[u]:
        if dist[u] + cost < dist[v]:
            dist[v] = dist[u] + cost
            (todo.append if cost else todo.appendleft)(v)  # cost 1 to the back, cost 0 to the front
print(dist)
```

## Weighted union-find

Union-find keeps groups. A **weighted** union-find also keeps, for each member, a number relating it to its parent: a ratio, an offset, a parity. Finding the root multiplies (or adds) those numbers along the path, so every member knows its relation to the root, and two members of the same group relate through it.

[[p:399]] stores `x / parent[x]`: from equations like `a / b = 2`, it answers `c / d` for any two variables in the same group. The only subtle step is joining two groups: the ratio between their *roots* follows from the equation and the two members' ratios to their roots. The same pattern answers "is this set of equations consistent?" and "are these two people on the same team or opposite teams?".

## Graphs with one way out: functional graphs

When every node has at most one outgoing edge, the graph is a **functional graph**. From any start there are no choices: the path stops at a node with no edge, or it reaches a cycle and goes round forever. Each piece looks like the letter ρ: a tail leading into a loop.

That shape makes cycles easy to find in O(n): walk from each unvisited node, stamping nodes with a shared clock, and stop at the first node already stamped. If the stamp is from *this* walk, the walk closed a cycle, and the difference of the stamps is its length ([[p:2360]]). If the stamp is from an earlier walk, this one just joined a path explored before. The same graphs appeared in [[m:binary-lifting]], where jumps of 2^j steps handle "where am I after k steps" for huge k.

## Bridges and articulation points

A **bridge** is an edge whose removal disconnects the graph; an **articulation point** is such a node. Both come from one depth-first search with **low-link values**:

- `disc[u]` is the time u is discovered;
- `low[u]` is the earliest discovery time reachable from u's subtree of the search, using at most one edge that jumps back to an earlier node (never the edge u was reached by).

A tree edge from u to its child v is a bridge exactly when `low[v] > disc[u]`: nothing below v can reach u or anything earlier without it. For articulation points the test is `low[v] >= disc[u]` (reaching u itself doesn't help when u is the one removed), plus a special rule for the root: it's an articulation point if it has two or more children in the search tree.

:::viz tarjan-bridges
:::

:::gotcha Skip the edge you arrived by, not the node
The edge from the parent always leads back to the parent, which would make every `low[v]` at most `disc[u]` and hide every bridge. Skip that edge. If the graph can have two edges between the same pair of nodes, skip by edge index rather than by "the neighbour is my parent", because the second edge is a genuine way back.
:::

Searches like this are naturally recursive, and a long chain of 100,000 nodes means 100,000 nested calls. [[p:1192]] keeps an explicit stack of `(node, edge it came by, next neighbour index)`, which turns the recursion into a loop.

## Strongly connected components

In a directed graph, a **strongly connected component** (SCC) is a largest set of nodes that can all reach each other. Collapsing each SCC to a single node leaves a DAG, the **condensation**, which is often what the problem really needs: cycles of mutual dependency become single units that can be ordered topologically.

**Kosaraju's algorithm** finds them with two searches: first record nodes in order of *finishing* time on the original graph, then search the **reversed** graph in reverse finishing order. Each search in the second pass collects exactly one component, because it can't escape into components that finished later.

```python run title=Strongly_connected_components
graph = {0: [1], 1: [2], 2: [0, 3], 3: [4], 4: [5], 5: [3], 6: [5, 7], 7: [6]}

order, seen = [], set()
for s in graph:  # pass 1: finishing order, with an explicit stack
    if s in seen:
        continue
    seen.add(s)
    stack = [(s, iter(graph[s]))]
    while stack:
        u, rest = stack[-1]
        v = next(rest, None)
        if v is None:
            order.append(u)  # u is finished
            stack.pop()
        elif v not in seen:
            seen.add(v)
            stack.append((v, iter(graph[v])))

reverse = {u: [] for u in graph}
for u, vs in graph.items():
    for v in vs:
        reverse[v].append(u)

components, placed = [], set()
for s in reversed(order):  # pass 2: on the reversed graph, latest finisher first
    if s in placed:
        continue
    placed.add(s)
    group, todo = [], [s]
    while todo:
        u = todo.pop()
        group.append(u)
        for v in reverse[u]:
            if v not in placed:
                placed.add(v)
                todo.append(v)
    components.append(sorted(group))
print(components)
```

Tarjan's SCC algorithm does the same in one pass with low-link values, much like the bridge search. Either way it's O(V + E). SCCs are the tool for "which of these modules depend on each other in a cycle?", 2-SAT, and any problem that needs a cyclic graph turned into a DAG first.

## Complexity

| Algorithm | Finds | Time |
|---|---|---|
| Floyd–Warshall | shortest paths between all pairs | `O(V³)` |
| Dijkstra from every node | the same, on sparse graphs | `O(V · E log V)` |
| 0-1 BFS | shortest paths with edge costs 0 or 1 | `O(V + E)` |
| Weighted union-find | relations within groups | nearly `O(1)` per operation |
| Walks with timestamps | cycles in a functional graph | `O(V)` |
| Tarjan's low-link | bridges and articulation points | `O(V + E)` |
| Kosaraju or Tarjan | strongly connected components | `O(V + E)` |

:::interview
Match the question to the tool out loud: "all pairs and n is 100, so Floyd–Warshall"; "costs are 0 or 1, so a deque instead of a heap"; "every node has one outgoing edge, so the components are tails into cycles". For bridges, state the condition `low[v] > disc[u]` and explain it in one sentence; interviewers care more about that than about the bookkeeping. Mention recursion depth and offer an explicit stack for large inputs.
:::

:::work
These algorithms show up in infrastructure: bridges and articulation points are single points of failure in a network, and finding them is how redundancy is planned. Build systems and package managers condense dependency cycles into SCCs before ordering the rest. Routing tables are all-pairs shortest paths, computed with variants of Dijkstra or Bellman-Ford, and currency exchange is weighted union-find's cousin: ratios along paths, where a cycle whose product exceeds 1 is an arbitrage.
:::

## Quick check

:::quiz
? Why must the middle node k be the outermost loop in Floyd–Warshall?
- [ ] It's faster that way
- [x] Round k uses distances through nodes 0 to k − 1, which must be final for every pair before k is added
- [ ] Any loop order works; it's only a convention
> The algorithm's guarantee is built round by round. With k inside, a distance is settled while the distances it depends on may still be too long.

? In a 0-1 BFS, where does a node reached by a free edge go?
- [x] To the front of the deque, with the same cost as the current node
- [ ] To the back of the deque
- [ ] Into a separate heap
> Same cost means it should be processed before anything costing one more, so it goes in front of them.

? A walk in a functional graph reaches a node that already has a timestamp. When has it found a new cycle?
- [ ] Always
- [x] Only when the stamp is from the current walk
- [ ] Only when the node has no outgoing edge
> A stamp from an earlier walk means this walk merged into a path already explored; any cycle there was counted then.

? A tree edge from u to its child v is a bridge when…
- [ ] `low[v] >= disc[u]`
- [x] `low[v] > disc[u]`
- [ ] `disc[v] > disc[u]`
> Nothing below v reaches u or earlier without this edge. With `>=`, reaching u itself would count as cut off, which is the test for articulation points.

? What does collapsing each strongly connected component to one node produce?
- [ ] A tree
- [x] A directed acyclic graph
- [ ] An undirected graph
> Any cycle among components would merge them into one component, so the condensation has no cycles and can be ordered topologically.
:::
