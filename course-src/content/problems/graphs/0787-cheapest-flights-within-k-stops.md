---
id: 787
module: graphs
patterns: [Bellman-Ford with a limited number of rounds, shortest paths with a constraint]
signature: "def findCheapestPrice(self, n: int, flights: List[List[int]], src: int, dst: int, k: int) -> int"
---

## Task

There are `n` cities, numbered 0 to `n − 1`. Each entry `[from, to, price]` of `flights` is a one-way flight. Return the cheapest total price to get from `src` to `dst` with **at most `k` stops** in between (so at most `k + 1` flights), or `-1` if there's no such route.

## Constraints

- `2 <= n <= 1_000`
- `0 <= len(flights) <= 20_000`
- `0 <= from, to < n`, `from != to`, `1 <= price <= 10_000`, and no flight `(from, to)` appears twice
- `0 <= src, dst, k < n`, `src != dst`

```json examples
[
  {"args": [4, [[0, 1, 100], [1, 3, 100], [0, 2, 50], [2, 3, 300], [0, 3, 500]], 0, 3, 1], "out": 200, "why": "0 → 1 → 3 costs 200 with one stop, cheaper than 0 → 2 → 3 for 350 or the direct flight for 500."},
  {"args": [4, [[0, 1, 100], [1, 3, 100], [0, 2, 50], [2, 3, 300], [0, 3, 500]], 0, 3, 0], "out": 500, "why": "With no stops allowed, only the direct flight counts."},
  {"args": [4, [[0, 1, 10], [1, 2, 10], [2, 3, 10], [0, 3, 100]], 0, 3, 1], "out": 100, "why": "The cheapest route, 0 → 1 → 2 → 3 for 30, needs two stops, one too many. The best route with at most one stop is the direct flight."}
]
```

```json edge
[
  {"name": "no route at all", "args": [3, [[0, 1, 5]], 0, 2, 1], "out": -1},
  {"name": "a single direct flight", "args": [2, [[0, 1, 7]], 0, 1, 0], "out": 7},
  {"name": "enough stops for the long way", "args": [5, [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1], [0, 4, 10]], 0, 4, 3], "out": 4},
  {"name": "a cycle along the way", "args": [3, [[0, 1, 2], [1, 0, 2], [1, 2, 2]], 0, 2, 5], "out": 4},
  {"name": "the cheaper route has too many stops", "args": [4, [[0, 1, 1], [0, 2, 5], [1, 2, 1], [2, 3, 1]], 0, 3, 1], "out": 6}
]
```

```python oracle
class Solution:
    def findCheapestPrice(self, n: int, flights: List[List[int]], src: int, dst: int, k: int) -> int:
        out = defaultdict(list)
        for a, b, p in flights:
            out[a].append((b, p))
        best = inf

        def explore(city, cost, flights_left):  # every route, up to k + 1 flights
            nonlocal best
            if city == dst:
                best = min(best, cost)
                return
            if flights_left == 0:
                return
            for nxt, p in out[city]:
                explore(nxt, cost + p, flights_left - 1)

        explore(src, 0, k + 1)
        return -1 if best == inf else best
```

```python gen
def gen(rng, size):
    n = rng.randint(2, 4) if size == "small" else rng.randint(4, 7)
    flights = {}
    for _ in range(rng.randint(1, 2 * n) if size == "small" else rng.randint(n, 3 * n)):
        a, b = rng.randrange(n), rng.randrange(n)
        if a != b:
            flights[(a, b)] = rng.randint(1, 20)
    src, dst = rng.sample(range(n), 2)
    return [n, [[a, b, p] for (a, b), p in flights.items()], src, dst, rng.randint(0, min(3, n - 1))]
```

```python perf
def perf(rng):
    # 1,000 cities and 20,000 random flights; up to 999 stops allowed.
    n = 1_000
    flights = {}
    while len(flights) < 20_000:
        a, b = rng.randrange(n), rng.randrange(n)
        if a != b:
            flights[(a, b)] = rng.randint(1, 10_000)
    return [n, [[a, b, p] for (a, b), p in flights.items()], 0, n - 1, n - 1]
```

## Hints

1. Plain Dijkstra finds the cheapest route, but that route may have too many stops. The limit is on the number of flights, so count flights.
2. Bellman-Ford works in rounds: after round i, it knows the cheapest price of every route with at most i flights. You need exactly k + 1 rounds.
3. In each round, compute the new prices from a *copy* of the previous round's prices. Updating in place could chain several flights within one round and sneak in extra stops.

## Solution

```python solution time="k · E" space="n"
class Solution:
    def findCheapestPrice(self, n: int, flights: List[List[int]], src: int, dst: int, k: int) -> int:
        price = [inf] * n  # price[c]: cheapest way to c using at most `round` flights
        price[src] = 0
        for _ in range(k + 1):  # k stops = k + 1 flights
            nxt = price[:]  # read last round's prices, write this round's
            changed = False
            for a, b, p in flights:
                if price[a] + p < nxt[b]:
                    nxt[b] = price[a] + p
                    changed = True
            price = nxt
            if not changed:
                break  # nothing improved: more rounds won't help
        return -1 if price[dst] == inf else price[dst]
```

Each round extends every known route by one more flight, and only by one: the prices it reads come from the *previous* round, never from updates made earlier in the same round. So after k + 1 rounds, `price[dst]` is the cheapest route with at most k + 1 flights. If a round changes nothing, later rounds can't either, so the loop stops early.

Each round looks at every flight once: O(k · E) in the worst case, with O(n) memory.

## Alternatives

### Breadth-first search by number of flights

```python alt time="k · E" space="n + E"
class Solution:
    def findCheapestPrice(self, n: int, flights: List[List[int]], src: int, dst: int, k: int) -> int:
        out = defaultdict(list)
        for a, b, p in flights:
            out[a].append((b, p))
        best = [inf] * n
        best[src] = 0
        level = {src: 0}  # cities reached with exactly this many flights, and their prices
        for _ in range(k + 1):
            nxt = {}
            for city, cost in level.items():
                for b, p in out[city]:
                    if cost + p < best[b] and cost + p < nxt.get(b, inf):
                        nxt[b] = cost + p  # only keep routes that beat everything found so far
            for b, cost in nxt.items():
                best[b] = min(best[b], cost)
            level = nxt
            if not level:
                break
        return -1 if best[dst] == inf else best[dst]
```

The same rounds, as a breadth-first search over the number of flights. A city is carried into the next level only when this route to it is cheaper than every route seen so far, since a more expensive route with more flights can never help.

## Wrong answers

### Updates prices in place

```python wrong fails="example" test="Example 2"
class Solution:
    def findCheapestPrice(self, n: int, flights: List[List[int]], src: int, dst: int, k: int) -> int:
        price = [inf] * n
        price[src] = 0
        for _ in range(k + 1):
            for a, b, p in flights:
                if price[a] + p < price[b]:
                    price[b] = price[a] + p  # may use a price set earlier in this same round
        return -1 if price[dst] == inf else price[dst]
```

Within one round, an update to city 1 is immediately used to update city 3, so a single round can add several flights. With k = 0 only the direct flight is allowed, but this finds 0 → 1 → 3 for 200 in its single round. Read from a copy of the previous round's prices.

### Ignores the limit on stops

```python wrong fails="example" test="Example 2"
class Solution:
    def findCheapestPrice(self, n: int, flights: List[List[int]], src: int, dst: int, k: int) -> int:
        out = defaultdict(list)
        for a, b, p in flights:
            out[a].append((b, p))
        done, heap = set(), [(0, src)]
        while heap:
            cost, city = heappop(heap)
            if city == dst:
                return cost  # the cheapest route, however many stops it has
            if city in done:
                continue
            done.add(city)
            for b, p in out[city]:
                heappush(heap, (cost + p, b))
        return -1
```

Dijkstra's algorithm finds the cheapest route overall, and here that route has one stop, more than the zero allowed. The stop limit changes the problem: the cheapest route to a city may not be the one to extend, because a pricier route with fewer stops can still reach `dst` in time.

### Allows one flight too few

```python wrong fails="example" test="Example 1"
class Solution:
    def findCheapestPrice(self, n: int, flights: List[List[int]], src: int, dst: int, k: int) -> int:
        price = [inf] * n
        price[src] = 0
        for _ in range(k):  # k rounds: only k flights
            nxt = price[:]
            for a, b, p in flights:
                if price[a] + p < nxt[b]:
                    nxt[b] = price[a] + p
            price = nxt
        return -1 if price[dst] == inf else price[dst]
```

k stops means k + 1 flights: a route with one stop uses two flights. With only k rounds, Example 1 can't find 0 → 1 → 3 and answers with the direct flight. Count flights, not stops.

### Tries every route

```python wrong fails="perf"
class Solution:
    def findCheapestPrice(self, n: int, flights: List[List[int]], src: int, dst: int, k: int) -> int:
        out = defaultdict(list)
        for a, b, p in flights:
            out[a].append((b, p))
        best = inf

        def explore(city, cost, flights_left):
            nonlocal best
            if city == dst:
                best = min(best, cost)
                return
            if flights_left == 0 or cost >= best:
                return
            for nxt, p in out[city]:  # every route with few enough flights
                explore(nxt, cost + p, flights_left - 1)

        explore(src, 0, k + 1)
        return -1 if best == inf else best
```

Exploring every route with at most k + 1 flights is correct, and cutting off routes that already cost more than the best one found helps a little. But the number of routes grows exponentially with the number of flights: with 20 flights out of each city and up to 999 stops, there's no end in sight. Bellman-Ford keeps one price per city per round.
