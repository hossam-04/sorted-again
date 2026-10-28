---
id: 853
module: stacks
patterns: [sort by position, stack of arrival times]
signature: "def carFleet(self, target: int, position: List[int], speed: List[int]) -> int"
---

## Task

Cars drive along a one-lane road towards the mile marker `target`. Car `i` starts at mile `position[i]` and drives at `speed[i]` miles per hour. No two cars start at the same mile.

Cars can't overtake. When a faster car catches up with a slower one, it slows down and the two drive together from then on, as one *fleet* moving at the slower speed. A car that catches a fleet exactly at `target` also joins it.

Return the number of fleets that arrive at `target`. A single car driving alone counts as a fleet.

## Constraints

- `1 <= len(position) == len(speed) <= 100_000`
- `0 < target <= 10**6`
- `0 <= position[i] < target`, and all positions are different
- `0 < speed[i] <= 10**6`

```json examples
[
  {"args": [20, [2, 10, 16], [4, 2, 1]], "out": 2, "why": "The car at 16 arrives alone after 4 hours. The car from 2 would need 4.5 hours, but it catches the car from 10 (5 hours) and arrives with it."},
  {"args": [10, [0, 4, 8], [1, 1, 1]], "out": 3, "why": "Equal speeds never close a gap, so each car is its own fleet."},
  {"args": [12, [0, 6], [6, 1]], "out": 1, "why": "The fast car catches the slow one and finishes in its fleet."}
]
```

```json edge
[
  {"name": "one car", "args": [5, [1], [9]], "out": 1},
  {"name": "catches up exactly at the target", "args": [10, [0, 5], [2, 1]], "out": 1},
  {"name": "cars listed out of order", "args": [100, [30, 90, 60], [5, 1, 3]], "out": 3},
  {"name": "a fast car at the back", "args": [10, [0, 1, 2, 3], [10, 1, 1, 1]], "out": 3},
  {"name": "fractional times", "args": [13, [1, 4], [3, 2]], "out": 1},
  {"name": "joins a fleet led by a slower car", "args": [100, [90, 80, 70], [1, 4, 3]], "out": 1},
  {"name": "extreme values", "args": [1000000, [0, 999999], [1000000, 1]], "out": 1}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 7) if size == "small" else rng.randint(20, 300)
    target = rng.randint(n + 1, 30 if size == "small" else 10**6)
    position = rng.sample(range(target), n)
    speed = [rng.randint(1, 6 if size == "small" else 1000) for _ in range(n)]
    return [target, position, speed]
```

```python perf
def perf(rng):
    # 100,000 cars at random positions and speeds.
    target = 10**6
    position = rng.sample(range(target), 100_000)
    speed = [rng.randint(1, 10**6) for _ in range(100_000)]
    return [target, position, speed]
```

## Hints

1. The car closest to the target is never slowed down by anyone. Work from the front of the road backwards.
2. Compute each car's arrival time if it drove alone: `(target - position) / speed`.
3. Going from front to back, a car that would arrive no later than the fleet ahead of it catches that fleet and joins it. A car that would arrive later starts a new fleet, which becomes the one to catch.

## Solution

```python solution time="n log n" space="n"
class Solution:
    def carFleet(self, target: int, position: List[int], speed: List[int]) -> int:
        fleets = []  # arrival time of each fleet, from the front of the road backwards
        for p, s in sorted(zip(position, speed), reverse=True):
            t = (target - p) / s
            if not fleets or t > fleets[-1]:
                fleets.append(t)  # can't catch the fleet ahead: a new fleet
            # otherwise it catches the fleet ahead and arrives with it
        return len(fleets)
```

Sort the cars from the one closest to the target to the one farthest away. The fleet just ahead of a car arrives at the time stored on top of the stack. If the car, driving alone, would arrive at or before that time, it must catch that fleet on the way (or exactly at the target) and is held to its arrival time, so it adds nothing. If it would arrive later, it never catches anyone and becomes a new fleet that cars behind it may catch.

The stack's times strictly increase, and only its top is ever compared, so a single variable would do; the stack makes the fleets visible. Sorting costs O(n log n), and the pass is O(n).

## Alternatives

### Exact arithmetic with fractions

```python alt time="n log n" space="n" oracle
from fractions import Fraction


class Solution:
    def carFleet(self, target: int, position: List[int], speed: List[int]) -> int:
        slowest, fleets = None, 0
        for p, s in sorted(zip(position, speed), reverse=True):
            t = Fraction(target - p, s)  # exact, no rounding at all
            if slowest is None or t > slowest:
                fleets += 1
                slowest = t
        return fleets
```

Arrival times are fractions, and comparing floats can be risky when two times are almost equal. With these limits, distinct times always differ by more than float rounding can blur, so the float version is safe, but `fractions.Fraction` makes that question disappear.

## Wrong answers

### Forgets to sort by position

```python wrong fails="example" test="Example 2"
class Solution:
    def carFleet(self, target: int, position: List[int], speed: List[int]) -> int:
        fleets = []
        for p, s in zip(position, speed):  # input order, not road order
            t = (target - p) / s
            if not fleets or t > fleets[-1]:
                fleets.append(t)
        return len(fleets)
```

The comparison only makes sense when the previous car is the one directly ahead on the road. The input lists cars in any order. In Example 2 the cars come from the back, so every later car seems to "catch" the slow one at the front.

### Compares with the car ahead instead of the fleet ahead

```python wrong fails="edge" test="joins a fleet led by a slower car"
class Solution:
    def carFleet(self, target: int, position: List[int], speed: List[int]) -> int:
        cars = sorted(zip(position, speed), reverse=True)
        times = [(target - p) / s for p, s in cars]
        fleets = 1
        for i in range(1, len(times)):
            if times[i] > times[i - 1]:  # the car ahead may already be slowed down by its fleet
                fleets += 1
        return fleets
```

The car ahead might have joined a slower fleet, so its own driving-alone time understates when it really arrives. With cars at 90 (10 hours), 80 (5 hours) and 70 (10 hours), the car from 80 is held to 10 hours, so the car from 70 catches the same fleet. Compare with the fleet's time, which is what the stack's top holds.

### Rescans every car ahead

```python wrong fails="perf"
class Solution:
    def carFleet(self, target: int, position: List[int], speed: List[int]) -> int:
        cars = sorted(zip(position, speed), reverse=True)
        times = [(target - p) / s for p, s in cars]
        fleets = 0
        for i, t in enumerate(times):
            if i == 0 or t > max(times[:i]):  # copies and scans every car ahead, for every car
                fleets += 1
        return fleets
```

The rule is right: a car starts a new fleet exactly when it would arrive later than every car ahead of it. But recomputing that maximum from scratch for each car is O(n²). The latest arrival time ahead only ever grows, so one running value (the stack's top) is enough.
