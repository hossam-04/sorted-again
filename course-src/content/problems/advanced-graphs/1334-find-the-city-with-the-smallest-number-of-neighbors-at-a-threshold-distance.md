---
id: 1334
module: advanced-graphs
patterns: [Floyd–Warshall, all-pairs shortest paths]
signature: "def findTheCity(self, n: int, edges: List[List[int]], distanceThreshold: int) -> int"
---

## Task

There are `n` cities, numbered 0 to `n - 1`, and two-way roads `[a, b, length]`. For each city, count the other cities you can reach by roads whose total length is at most `distanceThreshold`.

Return the city with the **fewest** such reachable cities. If several cities tie, return the one with the **largest** number.

## Constraints

- `2 <= n <= 100`
- `0 <= len(edges) <= n * (n - 1) / 2`, with no road listed twice
- `1 <= length, distanceThreshold <= 10**4`

```json examples
[
  {"args": [4, [[0, 1, 2], [1, 2, 2], [2, 3, 5]], 4], "out": 3, "why": "City 3's only road is 5 long, more than the threshold, so it reaches no other city. Every other city reaches two."},
  {"args": [3, [[0, 1, 1], [1, 2, 1]], 1], "out": 2, "why": "Cities 0 and 2 each reach one other city, city 1 reaches two. The tie between 0 and 2 goes to the larger number."},
  {"args": [4, [[0, 1, 3], [1, 2, 3], [0, 2, 9], [2, 3, 1]], 6], "out": 3, "why": "The road from 0 to 2 is 9 long, but going through 1 takes only 6. Cities 0 and 3 each reach two others; the larger number wins."}
]
```

```json edge
[
  {"name": "two cities, one road", "args": [2, [[0, 1, 5]], 5], "out": 1},
  {"name": "every road too long", "args": [3, [[0, 1, 7]], 3], "out": 2},
  {"name": "an isolated city", "args": [3, [[0, 1, 1]], 5], "out": 2},
  {"name": "a shortcut through two cities", "args": [4, [[0, 3, 10], [0, 1, 1], [1, 2, 1], [2, 3, 1]], 3], "out": 3},
  {"name": "no roads at all", "args": [4, [], 100], "out": 3},
  {"name": "the smallest count is unique", "args": [4, [[0, 1, 1], [1, 2, 1], [2, 3, 1]], 1], "out": 3},
  {"name": "a route with two stops", "args": [4, [[0, 1, 3], [2, 3, 1], [1, 3, 3]], 9], "out": 3}
]
```

```python oracle
class Solution:
    def findTheCity(self, n: int, edges: List[List[int]], distanceThreshold: int) -> int:
        adj = [[] for _ in range(n)]
        for a, b, w in edges:
            adj[a].append((b, w))
            adj[b].append((a, w))
        best, answer = None, -1
        for start in range(n):
            dist = {start: 0}
            heap = [(0, start)]
            while heap:
                d, u = heappop(heap)
                if d > dist[u]:
                    continue
                for v, w in adj[u]:
                    if d + w < dist.get(v, inf):
                        dist[v] = d + w
                        heappush(heap, (d + w, v))
            count = sum(1 for v, d in dist.items() if v != start and d <= distanceThreshold)
            if best is None or count <= best:
                best, answer = count, start
        return answer
```

```python gen
def gen(rng, size):
    n = rng.randint(2, 6) if size == "small" else rng.randint(10, 40)
    pairs = [(a, b) for a in range(n) for b in range(a + 1, n)]
    rng.shuffle(pairs)
    hi = 10 if size == "small" else 100
    edges = [[a, b, rng.randint(1, hi)] if rng.random() < 0.5 else [b, a, rng.randint(1, hi)] for a, b in pairs[:rng.randint(0, len(pairs))]]
    return [n, edges, rng.randint(1, hi * 2)]
```

```python perf
def perf(rng):
    # 100 cities, every pair joined by a road.
    n = 100
    edges = [[a, b, rng.randint(1, 10**4)] for a in range(n) for b in range(a + 1, n)]
    return [n, edges, 2_000]
```

## Hints

1. Every city needs its distances to every other city: all-pairs shortest paths. With at most 100 cities, an O(n³) method is fine.
2. **Floyd–Warshall**: start with the road lengths (infinity where there's no road), then allow each city k in turn as a stop in the middle: `d[i][j] = min(d[i][j], d[i][k] + d[k][j])`.
3. The loop over k must be the **outermost** one. Then count, for each city, the others within the threshold, and keep the city with the smallest count, preferring larger numbers on ties.

## Solution

```python solution time="n³" space="n²"
class Solution:
    def findTheCity(self, n: int, edges: List[List[int]], distanceThreshold: int) -> int:
        d = [[inf] * n for _ in range(n)]
        for i in range(n):
            d[i][i] = 0
        for a, b, w in edges:
            d[a][b] = d[b][a] = min(d[a][b], w)
        for k in range(n):  # allow city k as a stop in the middle
            through = d[k]
            for i in range(n):
                dik = d[i][k]
                if dik < inf:
                    d[i] = [x if x <= dik + y else dik + y for x, y in zip(d[i], through)]
        best, answer = n + 1, -1
        for i in range(n):
            count = sum(1 for j in range(n) if j != i and d[i][j] <= distanceThreshold)
            if count <= best:  # <= so a later (larger) city wins ties
                best, answer = count, i
        return answer
```

After round k of the outer loop, `d[i][j]` is the shortest route from i to j whose stops in the middle are all among cities 0 to k. Round k only has to ask whether passing through k helps: going to k and on from k, both using earlier stops only, which round k − 1 already knows. After all n rounds every city is allowed, so the distances are final.

That's n rounds of n² updates, O(n³) = a million steps for 100 cities. Each row is updated with one list comprehension, which keeps it fast in Python. Scanning the cities in increasing order with `<=` makes the last city with the smallest count win, which is the largest number among the ties.

## Alternatives

### Dijkstra from every city

```python alt time="n · e log n" space="n + e"
class Solution:
    def findTheCity(self, n: int, edges: List[List[int]], distanceThreshold: int) -> int:
        adj = [[] for _ in range(n)]
        for a, b, w in edges:
            adj[a].append((b, w))
            adj[b].append((a, w))
        best, answer = n + 1, -1
        for start in range(n):
            dist = {start: 0}
            heap = [(0, start)]
            while heap:
                d, u = heappop(heap)
                if d > dist[u] or d > distanceThreshold:  # nothing further can be within reach
                    continue
                for v, w in adj[u]:
                    if d + w < dist.get(v, inf):
                        dist[v] = d + w
                        heappush(heap, (d + w, v))
            count = sum(1 for v, d in dist.items() if v != start and d <= distanceThreshold)
            if count <= best:
                best, answer = count, start
        return answer
```

Run [[p:743]]'s Dijkstra from each city, stopping early once distances pass the threshold. On sparse road networks this beats Floyd–Warshall; on a complete graph of 100 cities it does a similar amount of work. Floyd–Warshall's advantages are its four lines of logic, and that it also copes with negative road lengths, as long as there's no negative cycle.

## Wrong answers

### Puts the middle city in the innermost loop

```python wrong fails="edge" test="a route with two stops"
class Solution:
    def findTheCity(self, n: int, edges: List[List[int]], distanceThreshold: int) -> int:
        d = [[inf] * n for _ in range(n)]
        for i in range(n):
            d[i][i] = 0
        for a, b, w in edges:
            d[a][b] = d[b][a] = min(d[a][b], w)
        for i in range(n):
            for j in range(n):
                for k in range(n):  # k innermost: d[i][k] and d[k][j] may not be final yet
                    d[i][j] = min(d[i][j], d[i][k] + d[k][j])
        best, answer = n + 1, -1
        for i in range(n):
            count = sum(1 for j in range(n) if j != i and d[i][j] <= distanceThreshold)
            if count <= best:
                best, answer = count, i
        return answer
```

The three loops look interchangeable, but they aren't. Floyd–Warshall's guarantee comes from finishing every pair for stop k before moving to k + 1. With k innermost, `d[i][j]` is settled once, using distances that may themselves still be too long. With roads 0–1, 1–3 and 3–2, the route from 0 to 2 has two stops in the middle, and when `d[0][2]` is settled, `d[0][3]` isn't known yet, so city 0 seems to reach only two cities. Keep k outermost.

### Breaks ties towards the smaller number

```python wrong fails="example" test="Example 2"
class Solution:
    def findTheCity(self, n: int, edges: List[List[int]], distanceThreshold: int) -> int:
        d = [[inf] * n for _ in range(n)]
        for i in range(n):
            d[i][i] = 0
        for a, b, w in edges:
            d[a][b] = d[b][a] = min(d[a][b], w)
        for k in range(n):
            for i in range(n):
                for j in range(n):
                    d[i][j] = min(d[i][j], d[i][k] + d[k][j])
        counts = [sum(1 for j in range(n) if j != i and d[i][j] <= distanceThreshold) for i in range(n)]
        return counts.index(min(counts))  # the first city with the smallest count
```

`index` finds the first city with the smallest count, and the task wants the last. In Example 2, cities 0 and 2 tie and this returns 0. Scan with `<=`, or scan from the largest number down.

### Relaxes every road n times from every city

```python wrong fails="perf"
class Solution:
    def findTheCity(self, n: int, edges: List[List[int]], distanceThreshold: int) -> int:
        best, answer = n + 1, -1
        for start in range(n):
            dist = [inf] * n
            dist[start] = 0
            for _ in range(n - 1):  # Bellman-Ford: every road, n - 1 times
                for a, b, w in edges:
                    if dist[a] + w < dist[b]:
                        dist[b] = dist[a] + w
                    if dist[b] + w < dist[a]:
                        dist[a] = dist[b] + w
            count = sum(1 for j in range(n) if j != start and dist[j] <= distanceThreshold)
            if count <= best:
                best, answer = count, start
        return answer
```

Bellman-Ford from every city is correct, but each run relaxes all 4,950 roads 99 times. Repeated for 100 cities, that's about 50 million relaxations, each doing two comparisons. Floyd–Warshall does a million simpler steps for all cities at once.
