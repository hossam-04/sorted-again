---
id: 743
module: graphs
patterns: [Dijkstra's algorithm, shortest paths with weights]
signature: "def networkDelayTime(self, times: List[List[int]], n: int, k: int) -> int"
---

## Task

A network has `n` nodes, numbered 1 to `n`. Each entry `[u, v, w]` of `times` is a one-way link: a signal sent from `u` arrives at `v` after `w` time units. A signal starts at node `k` at time 0 and spreads along every link.

Return the time at which the last node receives the signal, or `-1` if some node never receives it.

## Constraints

- `1 <= k <= n <= 20_000`
- `0 <= len(times) <= 100_000`
- `1 <= u, v <= n`, `u != v`, `0 <= w <= 100`, and no link `(u, v)` appears twice

```json examples
[
  {"args": [[[1, 2, 4], [1, 3, 1], [3, 2, 1]], 3, 1], "out": 2, "why": "The direct link to node 2 takes 4, but going through node 3 takes 1 + 1 = 2. The last node to hear the signal does so at time 2."},
  {"args": [[[1, 2, 1]], 3, 1], "out": -1, "why": "No link leads to node 3, so it never receives the signal."},
  {"args": [[[2, 1, 5]], 2, 2], "out": 5, "why": "The signal starts at node 2 and reaches node 1 after 5 time units."}
]
```

```json edge
[
  {"name": "a single node", "args": [[], 1, 1], "out": 0},
  {"name": "links that take no time", "args": [[[1, 2, 0], [2, 3, 0]], 3, 1], "out": 0},
  {"name": "a cycle", "args": [[[1, 2, 3], [2, 3, 3], [3, 1, 3]], 3, 2], "out": 6},
  {"name": "a detour is faster", "args": [[[1, 2, 10], [1, 3, 1], [3, 4, 1], [4, 2, 1]], 4, 1], "out": 3},
  {"name": "a link pointing the wrong way", "args": [[[2, 1, 1]], 2, 1], "out": -1}
]
```

```python oracle
class Solution:
    def networkDelayTime(self, times: List[List[int]], n: int, k: int) -> int:
        dist = [inf] * (n + 1)  # Bellman-Ford: relax every link until nothing improves
        dist[k] = 0
        for _ in range(n - 1):
            changed = False
            for u, v, w in times:
                if dist[u] + w < dist[v]:
                    dist[v] = dist[u] + w
                    changed = True
            if not changed:
                break
        worst = max(dist[1:])
        return -1 if worst == inf else worst
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 5) if size == "small" else rng.randint(5, 20)
    links = set()
    for _ in range(rng.randint(0, 2 * n) if size == "small" else rng.randint(n, 4 * n)):
        u, v = rng.randint(1, n), rng.randint(1, n)
        if u != v:
            links.add((u, v))
    return [[[u, v, rng.randint(0, 10)] for u, v in links], n, rng.randint(1, n)]
```

```python perf
def perf(rng):
    # A chain 1 -> 2 -> ... -> 20,000 of links taking 1 each, listed last link first, plus 80,001 links
    # that lead backwards. The last node hears the signal at time 19,999.
    n = 20_000
    times = [[v, v + 1, 1] for v in range(n - 1, 0, -1)]
    back = set()
    while len(back) < 80_001:
        u, v = rng.randint(2, n), rng.randint(1, n - 1)
        if u > v:
            back.add((u, v))
    return [times + [[u, v, rng.randint(0, 100)] for u, v in back], n, 1]
```

## Hints

1. Each node receives the signal at its shortest travel time from `k`, and the answer is the largest of those times. So you need shortest paths with weights.
2. Breadth-first search finds shortest paths only when every link costs the same. With weights, a node first reached along a short chain of links may be reached sooner along a longer chain of cheaper ones.
3. Dijkstra's algorithm: keep a min-heap of (time, node). Pop the earliest; the first time a node is popped, its time is final. Then push each neighbour with the time through this node. Skip nodes that come out of the heap again later.

## Solution

```python solution time="E log E" space="V + E"
class Solution:
    def networkDelayTime(self, times: List[List[int]], n: int, k: int) -> int:
        links = defaultdict(list)
        for u, v, w in times:
            links[u].append((v, w))
        arrival = {}  # node -> final arrival time
        heap = [(0, k)]
        while heap:
            t, u = heappop(heap)
            if u in arrival:
                continue  # a stale entry: u was already reached earlier
            arrival[u] = t  # the earliest entry for u is its true arrival time
            for v, w in links[u]:
                if v not in arrival:
                    heappush(heap, (t + w, v))
        return max(arrival.values()) if len(arrival) == n else -1
```

**Dijkstra's algorithm** settles nodes in order of arrival time. Whenever the earliest entry in the heap belongs to a node that isn't settled yet, no other route can reach that node sooner: any other route would leave the settled part of the network later, and link times are never negative. So the node's time is final.

A node can be pushed several times, once per incoming link that improves its time, so the heap may hold *stale* entries for nodes that are already settled; they're skipped when popped. With E links that's O(E log E) time. If some node was never settled, it never received the signal.

## Alternatives

### Bellman-Ford

```python alt time="V · E" space="V" slow
class Solution:
    def networkDelayTime(self, times: List[List[int]], n: int, k: int) -> int:
        dist = [inf] * (n + 1)
        dist[k] = 0
        for _ in range(n - 1):  # a shortest path has at most n - 1 links
            changed = False
            for u, v, w in times:
                if dist[u] + w < dist[v]:
                    dist[v] = dist[u] + w
                    changed = True
            if not changed:
                break  # nothing improved: every time is final
        worst = max(dist[1:])
        return -1 if worst == inf else worst
```

Bellman-Ford relaxes every link, again and again, until no time improves; after i rounds, every shortest path of up to i links is found. It's simpler than Dijkstra's algorithm and also works with negative weights, but its worst case is O(V·E): on the test's long chain, listed last link first, each round gets the signal just one link further. [[p:787]] uses a limited number of its rounds to count stops.

## Wrong answers

### Settles a node as soon as it's reached

```python wrong fails="example" test="Example 1"
class Solution:
    def networkDelayTime(self, times: List[List[int]], n: int, k: int) -> int:
        links = defaultdict(list)
        for u, v, w in times:
            links[u].append((v, w))
        arrival = {k: 0}
        heap = [(0, k)]
        while heap:
            t, u = heappop(heap)
            for v, w in links[u]:
                if v not in arrival:
                    arrival[v] = t + w  # final already, before cheaper routes are known
                    heappush(heap, (t + w, v))
        return max(arrival.values()) if len(arrival) == n else -1
```

Fixing a node's time when it's first *pushed* is the breadth-first search habit, and it's wrong with weights. Node 2 is first reached by the direct link at time 4, and that time is kept, though the route through node 3 arrives at 2. A time is final only when the node is *popped* as the earliest entry.

### Ignores nodes that are never reached

```python wrong fails="example" test="Example 2"
class Solution:
    def networkDelayTime(self, times: List[List[int]], n: int, k: int) -> int:
        links = defaultdict(list)
        for u, v, w in times:
            links[u].append((v, w))
        arrival, heap = {}, [(0, k)]
        while heap:
            t, u = heappop(heap)
            if u in arrival:
                continue
            arrival[u] = t
            for v, w in links[u]:
                if v not in arrival:
                    heappush(heap, (t + w, v))
        return max(arrival.values())  # but some node may never have been reached
```

The largest arrival time among the nodes that were reached isn't the answer when some node was never reached: in Example 2, node 3 never gets the signal, so the answer is −1, not 1. Check that all `n` nodes were settled.

### Scans every node to find the next one

```python wrong fails="perf"
class Solution:
    def networkDelayTime(self, times: List[List[int]], n: int, k: int) -> int:
        links = defaultdict(list)
        for u, v, w in times:
            links[u].append((v, w))
        dist = [inf] * (n + 1)
        dist[k] = 0
        settled = [False] * (n + 1)
        for _ in range(n):
            u = min((d, v) for v, d in enumerate(dist) if v and not settled[v])[1]  # a full scan
            if dist[u] == inf:
                return -1
            settled[u] = True
            for v, w in links[u]:
                dist[v] = min(dist[v], dist[u] + w)
        return max(dist[1:])
```

This is Dijkstra's algorithm without a heap: it finds the next node by scanning all of them. That's O(V) per node, O(V²) in all, which is fine for dense graphs but too slow here: 20,000 nodes make 400 million comparisons. The heap finds the next node in O(log E).
