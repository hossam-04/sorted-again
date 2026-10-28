---
id: 2360
module: advanced-graphs
patterns: [functional graph, timestamps per walk]
signature: "def longestCycle(self, edges: List[int]) -> int"
---

## Task

A directed graph has `n` nodes, numbered 0 to `n - 1`, and every node has **at most one** outgoing edge: `edges[i]` is the node that i points to, or -1 if it points nowhere.

Return the length of the longest cycle in the graph, the number of nodes on it, or -1 if there is no cycle.

## Constraints

- `2 <= n <= 100_000`
- `-1 <= edges[i] < n`, and `edges[i] != i`

```json examples
[
  {"args": [[1, 2, 0, 1]], "out": 3, "why": "0 → 1 → 2 → 0 is a cycle of 3 nodes. Node 3 leads into it but isn't on it."},
  {"args": [[-1, 0, 1]], "out": -1, "why": "2 → 1 → 0, and 0 points nowhere: no cycle."},
  {"args": [[1, 0, 3, 4, 2, 4]], "out": 3, "why": "Two cycles: 0 ↔ 1 with 2 nodes and 2 → 3 → 4 → 2 with 3. Node 5 leads into the second one."}
]
```

```json edge
[
  {"name": "two nodes pointing at each other", "args": [[1, 0]], "out": 2},
  {"name": "two nodes, one edge", "args": [[1, -1]], "out": -1},
  {"name": "a long tail into a short cycle", "args": [[1, 2, 3, 4, 3]], "out": 2},
  {"name": "everything on one cycle", "args": [[1, 2, 3, 4, 0]], "out": 5},
  {"name": "two tails into the same cycle", "args": [[2, 2, 3, 4, 2]], "out": 3},
  {"name": "a later walk meets an earlier one", "args": [[1, -1, 1, 2]], "out": -1}
]
```

```python oracle
class Solution:
    def longestCycle(self, edges: List[int]) -> int:
        best = -1
        for start in range(len(edges)):
            seen = {}
            node, step = start, 0
            while node != -1 and node not in seen:
                seen[node] = step
                node, step = edges[node], step + 1
            if node != -1:
                best = max(best, step - seen[node])
        return best
```

```python gen
def gen(rng, size):
    n = rng.randint(2, 7) if size == "small" else rng.randint(20, 300)
    edges = []
    for i in range(n):
        if rng.random() < 0.2:
            edges.append(-1)
        else:
            j = rng.randrange(n - 1)
            edges.append(j if j < i else j + 1)  # any node but i itself
    return [edges]
```

```python perf
def perf(rng):
    # 100,000 nodes: one long cycle of 50,000, and 50,000 more on long tails leading into it.
    n, loop = 100_000, 50_000
    order = list(range(n))
    rng.shuffle(order)
    edges = [-1] * n
    for i in range(loop):
        edges[order[i]] = order[(i + 1) % loop]
    for i in range(loop, n):
        edges[order[i]] = order[i - 1] if i > loop and rng.random() < 0.99 else order[rng.randrange(loop)]
    return [edges]
```

## Hints

1. With at most one outgoing edge per node, a walk from any node has no choices: it follows the edges until it reaches a node with no edge, or revisits a node, which means it entered a cycle.
2. Walking from every node separately repeats a lot of work. Mark nodes as visited across all walks, so each node is walked through only once in total.
3. Give every node a timestamp when it's first visited, and remember when the current walk started. If a walk reaches a node with a timestamp from *this* walk, it closed a cycle whose length is the difference of the timestamps. A node from an earlier walk means no new cycle.

## Solution

```python solution time="n" space="n"
class Solution:
    def longestCycle(self, edges: List[int]) -> int:
        when = [0] * len(edges)  # when each node was first visited (0: not yet)
        clock, best = 1, -1
        for start in range(len(edges)):
            walk_began = clock
            node = start
            while node != -1 and when[node] == 0:
                when[node] = clock
                clock += 1
                node = edges[node]
            if node != -1 and when[node] >= walk_began:  # back to a node from this walk: a cycle
                best = max(best, clock - when[node])
        return best
```

A graph where every node has at most one outgoing edge is a **functional graph**: from any start there's only one way to go, and the path either stops or ends up going around a cycle forever. The walks share the timestamp clock, and a node is never walked through twice. When a walk stops at a node that already has a timestamp, there are two cases: the node was stamped during this walk, so the walk went around a cycle, and its length is the number of steps since that node; or it was stamped by an earlier walk, whose cycle (if any) was already counted.

Every node is stamped once and every edge followed once: O(n) time and memory, with no recursion.

## Alternatives

### Peel off the nodes that aren't on cycles

```python alt time="n" space="n"
class Solution:
    def longestCycle(self, edges: List[int]) -> int:
        n = len(edges)
        indegree = [0] * n
        for v in edges:
            if v != -1:
                indegree[v] += 1
        todo = [v for v in range(n) if indegree[v] == 0]
        removed = [False] * n
        for v in todo:  # nodes with nothing pointing at them can't be on a cycle
            removed[v] = True
            w = edges[v]
            if w != -1:
                indegree[w] -= 1
                if indegree[w] == 0:
                    todo.append(w)
        best = -1
        for v in range(n):  # what's left is cycles only
            if not removed[v]:
                length = 0
                while not removed[v]:
                    removed[v] = True
                    v = edges[v]
                    length += 1
                best = max(best, length)
        return best
```

Kahn's algorithm from [[m:graphs]], used backwards: repeatedly remove nodes that nothing points to. Tails get peeled away from their free end, and only the nodes on cycles survive, since each of them always has its predecessor on the cycle pointing at it. Walking each surviving cycle once gives the lengths.

## Wrong answers

### Counts the tail too

```python wrong fails="example" test="Example 1"
class Solution:
    def longestCycle(self, edges: List[int]) -> int:
        best = -1
        for start in range(len(edges)):
            seen = set()
            node = start
            while node != -1 and node not in seen:
                seen.add(node)
                node = edges[node]
            if node != -1:
                best = max(best, len(seen))  # every node walked through, tail included
        return best
```

A walk that ends in a cycle may have walked a tail first. Counting every node it saw includes that tail: from node 3 in Example 1, the walk sees 3, 1, 2 and 0 and reports 4, though only three of them are on the cycle. Remember the step at which each node was seen and subtract.

### Treats any earlier visit as a cycle

```python wrong fails="example" test="Example 2"
class Solution:
    def longestCycle(self, edges: List[int]) -> int:
        when = [0] * len(edges)
        clock, best = 1, -1
        for start in range(len(edges)):
            node = start
            while node != -1 and when[node] == 0:
                when[node] = clock
                clock += 1
                node = edges[node]
            if node != -1:  # also fires when node belongs to an earlier walk
                best = max(best, clock - when[node])
        return best
```

Sharing timestamps across walks is what makes the solution linear, but then a walk that runs into an *earlier* walk's nodes hasn't found a cycle: it just joined a path that was already explored. In Example 2, the walk from node 1 reaches node 0, stamped by the first walk, and reports a "cycle" in a graph that has none. Only a node stamped during the current walk closes a cycle.

### Walks from every node from scratch

```python wrong fails="perf"
class Solution:
    def longestCycle(self, edges: List[int]) -> int:
        best = -1
        for start in range(len(edges)):
            seen = {}  # forgotten after every walk
            node, step = start, 0
            while node != -1 and node not in seen:
                seen[node] = step
                node, step = edges[node], step + 1
            if node != -1:
                best = max(best, step - seen[node])
        return best
```

Correct: each walk finds the cycle at the end of its path. But every walk starts from nothing, so the cycle of 50,000 nodes in the test is walked around once from every one of the 100,000 starts: billions of steps. Keep the timestamps between walks.
