---
id: 1642
module: greedy-heaps
patterns: [ladders on the largest climbs, min-heap of commitments]
signature: "def furthestBuilding(self, heights: List[int], bricks: int, ladders: int) -> int"
---

## Task

You walk along a row of buildings, `heights`, starting on building 0 and moving to the next building each step. Stepping down or across is free. Stepping **up** by `d` costs either `d` bricks or one ladder, whichever you choose; bricks and ladders are used up.

With `bricks` bricks and `ladders` ladders, return the index of the furthest building you can reach, choosing for each climb how to pay for it.

## Constraints

- `1 <= len(heights) <= 100_000`
- `1 <= heights[i] <= 10**6`
- `0 <= bricks <= 10**9`
- `0 <= ladders <= len(heights)`

```json examples
[
  {"args": [[1, 3, 10, 12], 4, 1], "out": 3, "why": "The climbs are 2, 7 and 2. The ladder goes on the 7, and the 4 bricks pay for both climbs of 2."},
  {"args": [[1, 6, 7, 8], 5, 1], "out": 3, "why": "The climbs are 5, 1 and 1. Spending the 5 bricks on the first climb would leave one ladder for two climbs. Use the ladder on the 5 instead."},
  {"args": [[10, 7, 9, 4, 6], 3, 0], "out": 3, "why": "Going down is free. The climbs of 2 cost 2 bricks each, and after the first one only 1 brick is left, so the walk ends at building 3."}
]
```

```json edge
[
  {"name": "one building", "args": [[5], 0, 0], "out": 0},
  {"name": "only going down", "args": [[9, 7, 3], 0, 0], "out": 2},
  {"name": "flat", "args": [[4, 4, 4], 0, 0], "out": 2},
  {"name": "ladders for everything", "args": [[1, 100, 200, 300], 0, 3], "out": 3},
  {"name": "one brick short", "args": [[1, 2, 3], 1, 0], "out": 1},
  {"name": "a huge climb", "args": [[1, 1000000], 999999, 0], "out": 1},
  {"name": "equal climbs", "args": [[1, 2, 3, 4, 5], 2, 1], "out": 3},
  {"name": "a big climb at the end", "args": [[1, 2, 3, 50], 2, 1], "out": 3}
]
```

```python oracle
class Solution:
    def furthestBuilding(self, heights: List[int], bricks: int, ladders: int) -> int:
        climbs = []
        for i in range(1, len(heights)):
            d = heights[i] - heights[i - 1]
            if d > 0:
                climbs.append(d)
                paid = sum(sorted(climbs)[:max(0, len(climbs) - ladders)])  # ladders take the biggest climbs
                if paid > bricks:
                    return i - 1
        return len(heights) - 1
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 8) if size == "small" else rng.randint(20, 300)
    hi = 10 if size == "small" else rng.choice([50, 10**6])
    heights = [rng.randint(1, hi) for _ in range(n)]
    return [heights, rng.randint(0, hi * n // 4), rng.randint(0, n // 3)]
```

```python perf
def perf(rng):
    # 100,000 buildings that drift up and down by up to 100 at a time, 1,000 ladders, and enough bricks
    # for about two thirds of the walk.
    heights, h = [], 500_000
    for _ in range(100_000):
        h = min(10**6, max(1, h + rng.randint(-100, 100)))
        heights.append(h)
    return [heights, 1_600_000, 1_000]
```

## Hints

1. A ladder is worth the same whatever climb it covers, so ladders should go on the biggest climbs. But you don't know which climbs are the biggest until you've seen them.
2. Decide tentatively: give every climb a ladder while you have them. When you run out, the smallest climb that has a ladder should switch to bricks.
3. Keep the climbs that currently have ladders in a min-heap. Push each new climb; if the heap holds more than `ladders` climbs, pop the smallest and pay for it with bricks. When the bricks run out, you're stuck on the current building.

## Solution

```python solution time="n log L" space="L"
class Solution:
    def furthestBuilding(self, heights: List[int], bricks: int, ladders: int) -> int:
        laddered = []  # the climbs that currently get a ladder: always the largest ones so far
        for i in range(1, len(heights)):
            climb = heights[i] - heights[i - 1]
            if climb <= 0:
                continue
            heappush(laddered, climb)
            if len(laddered) > ladders:
                bricks -= heappop(laddered)  # the smallest of them gets bricks instead
                if bricks < 0:
                    return i - 1
        return len(heights) - 1
```

Whatever stretch of the walk you complete, it's best to put the ladders on its largest climbs and pay bricks for the rest: swapping a ladder from a small climb to a bigger one never costs more bricks. The heap keeps exactly that assignment up to date. It holds the climbs that have ladders, and when a new climb arrives and there's one climb too many, the smallest of them is moved to bricks.

So the bricks spent are always the least possible for the stretch so far, and the walk stops only when even that is more than you have. With L ladders, the heap never holds more than L + 1 climbs: O(n log L) time and O(L) space.

## Alternatives

### Binary search on the answer

```python alt time="n log² n" space="n"
class Solution:
    def furthestBuilding(self, heights: List[int], bricks: int, ladders: int) -> int:
        def can_reach(j):  # can the walk get as far as building j?
            climbs = sorted(max(0, heights[i] - heights[i - 1]) for i in range(1, j + 1))
            return sum(climbs[:max(0, len(climbs) - ladders)]) <= bricks  # ladders on the largest climbs

        lo, hi = 0, len(heights) - 1
        while lo < hi:
            mid = (lo + hi + 1) // 2
            if can_reach(mid):
                lo = mid
            else:
                hi = mid - 1
        return lo
```

If you can reach building j, you can reach every building before it, so "can I reach j?" switches from yes to no exactly once, and binary search finds the switch. Checking one j sorts its climbs and gives ladders to the largest: O(n log n) per check, O(n log² n) in all. It's slower than the heap and doesn't work for a stream of buildings, but it's a good fallback when the incremental idea doesn't come.

## Wrong answers

### Uses ladders on the first climbs

```python wrong fails="example" test="Example 1"
class Solution:
    def furthestBuilding(self, heights: List[int], bricks: int, ladders: int) -> int:
        for i in range(1, len(heights)):
            climb = heights[i] - heights[i - 1]
            if climb <= 0:
                continue
            if ladders > 0:
                ladders -= 1  # spent on whatever climb comes first
            elif bricks >= climb:
                bricks -= climb
            else:
                return i - 1
        return len(heights) - 1
```

Using a ladder as soon as a climb appears wastes it on whatever comes first. In Example 1 it goes on the climb of 2, and the 4 bricks can't pay for the climb of 7 that follows. Ladders belong on the biggest climbs, and you only know which those are in hindsight.

### Uses bricks first, ladders when bricks run short

```python wrong fails="example" test="Example 2"
class Solution:
    def furthestBuilding(self, heights: List[int], bricks: int, ladders: int) -> int:
        for i in range(1, len(heights)):
            climb = heights[i] - heights[i - 1]
            if climb <= 0:
                continue
            if bricks >= climb:
                bricks -= climb  # spends bricks on a climb a ladder should take
            elif ladders > 0:
                ladders -= 1
            else:
                return i - 1
        return len(heights) - 1
```

Saving ladders for later sounds sensible, but bricks spent early may be bricks a later climb needed. In Example 2 the first climb of 5 uses every brick, and the one ladder covers just one of the two climbs of 1 that follow. The choice has to be revisable, which is what the heap gives.

### Re-sorts the climbs at every building

```python wrong fails="perf"
class Solution:
    def furthestBuilding(self, heights: List[int], bricks: int, ladders: int) -> int:
        climbs = []
        for i in range(1, len(heights)):
            d = heights[i] - heights[i - 1]
            if d > 0:
                climbs.append(d)
                climbs.sort()  # all the climbs so far, sorted again
                if sum(climbs[:max(0, len(climbs) - ladders)]) > bricks:
                    return i - 1
        return len(heights) - 1
```

This makes the right decision at every building: ladders on the largest climbs so far, bricks for the rest. But it sorts and sums every climb again each time, O(n) per building at least. The test walks over 30,000 climbs before stopping, which makes about a billion steps. The heap changes only what one new climb changes.
