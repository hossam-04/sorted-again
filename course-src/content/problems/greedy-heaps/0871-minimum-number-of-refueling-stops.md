---
id: 871
module: greedy-heaps
patterns: [retroactive choice, max-heap of passed options]
signature: "def minRefuelStops(self, target: int, startFuel: int, stations: List[List[int]]) -> int"
---

## Task

A car drives east from position 0 to position `target`, using one unit of fuel per unit of distance. It starts with `startFuel` units in a tank with no size limit. Along the way, `stations[i] = [position, fuel]` describes a station at that position that can give `fuel` units, all at once, if the car stops there. The stations are sorted by position.

Return the fewest stops needed to reach `target`, or `-1` if it can't be reached. Arriving somewhere with exactly 0 fuel left still counts as arriving.

## Constraints

- `1 <= target, startFuel <= 10**9`
- `0 <= len(stations) <= 100_000`
- `0 < position < target`, with positions strictly increasing
- `1 <= fuel <= 10**9`

```json examples
[
  {"args": [50, 15, [[10, 5], [15, 30], [40, 10]]], "out": 2, "why": "Stopping at 15 for 30 units gets the car to 45, past the station at 40. Its 10 units cover the rest, for 2 stops. No single stop is enough."},
  {"args": [100, 25, [[20, 10], [25, 80]]], "out": 1, "why": "The tank lasts exactly to 25, where 80 more units cover the remaining 75. The station at 20 isn't needed."},
  {"args": [30, 5, [[5, 5], [10, 4]]], "out": -1, "why": "Even taking every station's fuel, 5 + 5 + 4 = 14 units fall short of 30."}
]
```

```json edge
[
  {"name": "no stops needed", "args": [10, 10, []], "out": 0},
  {"name": "no stations, not enough fuel", "args": [10, 9, []], "out": -1},
  {"name": "running dry at a station", "args": [20, 10, [[10, 10]]], "out": 1},
  {"name": "the biggest station comes first", "args": [100, 50, [[10, 60], [40, 5], [50, 5]]], "out": 1},
  {"name": "a station just out of reach", "args": [100, 9, [[10, 100]]], "out": -1},
  {"name": "every station needed", "args": [6, 1, [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1]]], "out": 5},
  {"name": "huge distances", "args": [1000000000, 1, [[1, 999999999]]], "out": 1}
]
```

```python oracle
class Solution:
    def minRefuelStops(self, target: int, startFuel: int, stations: List[List[int]]) -> int:
        reach = [startFuel] + [0] * len(stations)  # reach[t]: farthest position with t stops
        for i, (pos, fuel) in enumerate(stations):
            for t in range(i, -1, -1):
                if reach[t] >= pos:
                    reach[t + 1] = max(reach[t + 1], reach[t] + fuel)
        for t, r in enumerate(reach):
            if r >= target:
                return t
        return -1
```

```python gen
def gen(rng, size):
    n = rng.randint(0, 6) if size == "small" else rng.randint(20, 300)
    target = rng.randint(n + 1, 30 if size == "small" else 10**6)
    positions = sorted(rng.sample(range(1, target), min(n, target - 1)))
    hi = 10 if size == "small" else target // 4 + 1
    stations = [[p, rng.randint(1, hi)] for p in positions]
    return [target, rng.randint(1, hi * 2), stations]
```

```python perf
def perf(rng):
    # Enough fuel for 85% of the way and 100,000 small stations, evenly spaced: by the time the car needs
    # fuel it has passed 85,000 stations, and it then stops about 75,000 times.
    n, target = 100_000, 10**9
    stations = [[10_000 * (i + 1) - 1, rng.randint(1, 3_200)] for i in range(n)]
    return [target, 85 * target // 100, stations]
```

## Hints

1. Pretend the car can decide *later* whether it stopped at a station. Drive as far as the fuel goes, and remember the stations passed on the way.
2. When the fuel can't reach the next station (or the target), the car must have stopped somewhere already passed. Which one? The one with the most fuel: one stop gives the most range that way.
3. Keep the passed stations' fuel in a max-heap. Whenever the next point is out of reach, pop the largest and add it, counting a stop. If the heap is empty and the point is still out of reach, return -1.

## Solution

```python solution time="n log n" space="n"
class Solution:
    def minRefuelStops(self, target: int, startFuel: int, stations: List[List[int]]) -> int:
        passed = []  # fuel at the stations driven past without stopping, as a max-heap (negated)
        reach, stops = startFuel, 0  # how far the fuel taken so far gets the car
        for pos, fuel in stations + [[target, 0]]:
            while reach < pos and passed:
                reach -= heappop(passed)  # in hindsight, stop at the best station passed
                stops += 1
            if reach < pos:
                return -1
            heappush(passed, -fuel)
        return stops
```

The decision of where to stop is made **in hindsight**. The car drives past every station it can reach, collecting them as options, and only when the next point is out of reach does it commit to one of them. Taking the largest is safe: any plan that needs a stop at this point can use the largest passed station instead of the one it chose, and it reaches at least as far after every later stop.

Each station enters and leaves the heap at most once: O(n log n). The target is treated as one more point to reach, with no fuel to give.

## Alternatives

### Dynamic programming over the number of stops

```python alt time="n²" space="n" slow
class Solution:
    def minRefuelStops(self, target: int, startFuel: int, stations: List[List[int]]) -> int:
        reach = [startFuel] + [0] * len(stations)  # reach[t]: the farthest the car gets with t stops
        for i, (pos, fuel) in enumerate(stations):
            for t in range(i, -1, -1):  # downwards, so this station is used at most once
                if reach[t] >= pos:
                    reach[t + 1] = max(reach[t + 1], reach[t] + fuel)
        for t, r in enumerate(reach):
            if r >= target:
                return t
        return -1
```

`reach[t]` is the farthest position reachable with exactly t stops among the stations seen so far. Each station can extend any count t whose reach gets to it, into t + 1 stops. It's the 0/1 knapsack loop, running t downwards so a station isn't used twice. O(n²) is fine for LeetCode's 500 stations, and hopeless for 100,000.

## Wrong answers

### Stops at every station

```python wrong fails="example" test="Example 2"
class Solution:
    def minRefuelStops(self, target: int, startFuel: int, stations: List[List[int]]) -> int:
        reach, stops = startFuel, 0
        for pos, fuel in stations:
            if reach >= target:
                break
            if reach < pos:
                return -1
            reach += fuel  # takes every station it reaches
            stops += 1
        return stops if reach >= target else -1
```

Stopping wherever possible reaches the target if anything does, but it doesn't minimise the stops. In Example 2 it stops at 20 and at 25, though the stop at 25 alone is enough.

### Refuels at the most recent station

```python wrong fails="edge" test="the biggest station comes first"
class Solution:
    def minRefuelStops(self, target: int, startFuel: int, stations: List[List[int]]) -> int:
        passed = []  # a stack: the most recent station is on top
        reach, stops = startFuel, 0
        for pos, fuel in stations + [[target, 0]]:
            while reach < pos and passed:
                reach += passed.pop()  # the latest station, not the biggest
                stops += 1
            if reach < pos:
                return -1
            passed.append(fuel)
        return stops
```

Delaying the decision is right, but the choice has to be the station with the most fuel. Taking the latest one wastes stops on small stations: with 60 units at position 10 and 5 units at 40 and 50, this stops three times where one stop at 10 would do.

### Forgets that the target must be reached

```python wrong fails="example" test="Example 1"
class Solution:
    def minRefuelStops(self, target: int, startFuel: int, stations: List[List[int]]) -> int:
        passed = []
        reach, stops = startFuel, 0
        for pos, fuel in stations:  # the stretch to the target is never checked
            while reach < pos and passed:
                reach -= heappop(passed)
                stops += 1
            if reach < pos:
                return -1
            heappush(passed, -fuel)
        return stops
```

The loop makes sure each station can be reached, then stops. The last stretch, from the final station to the target, needs the same check. In Example 1 one stop gets the car past the station at 40, but it takes a second stop to cover the last 5 units, and this answers 1. Treat the target as one more point to reach.

### Scans for the biggest passed station each time

```python wrong fails="perf"
class Solution:
    def minRefuelStops(self, target: int, startFuel: int, stations: List[List[int]]) -> int:
        passed = []
        reach, stops = startFuel, 0
        for pos, fuel in stations + [[target, 0]]:
            while reach < pos and passed:
                best = max(passed)  # O(n) to find
                passed.remove(best)  # and O(n) to remove
                reach += best
                stops += 1
            if reach < pos:
                return -1
            passed.append(fuel)
        return stops
```

The right stations get chosen, but finding the largest in a plain list costs a scan each time. In the test the car stops about 75,000 times with tens of thousands of stations passed each time: over four billion items scanned. A heap finds and removes the largest in O(log n).
