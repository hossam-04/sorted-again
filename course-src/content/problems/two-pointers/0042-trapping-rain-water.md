---
id: 42
module: two-pointers
patterns: [two pointers with running maxima]
signature: "def trap(self, height: List[int]) -> int"
---

## Task

You get a list `height` of non-negative integers: a row of bars, each 1 unit wide, where bar `i` is `height[i]` units tall. Rain fills every dip it can. Above bar `i`, water rises to the lower of two walls: the tallest bar at or to the left of `i`, and the tallest bar at or to the right of `i`. The water held above bar `i` is that level minus `height[i]`.

Return the total amount of water held above all the bars.

## Constraints

- `1 <= len(height) <= 100_000`
- `0 <= height[i] <= 100_000`

```json examples
[
  {"args": [[3, 0, 2, 0, 4]], "out": 7, "why": "The walls are 3 on the left and 4 on the right, so the water level is 3: 3 + 1 + 3 = 7 units above the three middle bars."},
  {"args": [[1, 2, 3]], "out": 0, "why": "The bars only rise, so no bar has a taller wall on its left."},
  {"args": [[5, 1, 3, 1, 5]], "out": 10, "why": "Water rises to 5 everywhere in between: 4 + 2 + 4 = 10."}
]
```

```json edge
[
  {"name": "one bar", "args": [[4]], "out": 0},
  {"name": "two bars", "args": [[2, 3]], "out": 0},
  {"name": "a single valley", "args": [[4, 0, 4]], "out": 4},
  {"name": "flat", "args": [[2, 2, 2]], "out": 0},
  {"name": "only falling", "args": [[5, 4, 3, 2]], "out": 0},
  {"name": "tall bar in the middle", "args": [[1, 0, 6, 0, 1]], "out": 2},
  {"name": "all zeros", "args": [[0, 0, 0, 0]], "out": 0},
  {"name": "lower wall on the right", "args": [[6, 0, 0, 2]], "out": 4}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 10) if size == "small" else rng.randint(30, 300)
    top = 6 if size == "small" else 50
    return [[rng.randint(0, top) for _ in range(n)]]
```

```python perf
def perf(rng):
    return [[rng.randint(0, 100_000) for _ in range(100_000)]]
```

## Hints

1. For one bar, the water above it is `min(tallest on the left, tallest on the right) - height[i]`. Write that first, even if it is slow.
2. You don't need both maxima exactly. If the tallest bar seen from the left is lower than the one seen from the right, the left one decides the level.
3. Keep a pointer and a running maximum on each side. Always settle the side with the lower bar, add its water, and move that pointer inward.

## Solution

```python solution time="n" space="1"
class Solution:
    def trap(self, height: List[int]) -> int:
        l, r = 0, len(height) - 1
        left_max = right_max = 0
        water = 0
        while l < r:
            if height[l] < height[r]:
                left_max = max(left_max, height[l])
                water += left_max - height[l]
                l += 1
            else:
                right_max = max(right_max, height[r])
                water += right_max - height[r]
                r -= 1
        return water
```

The level above a bar is set by the lower of its two walls. When `height[l] < height[r]`, the right side already has a bar at least as tall as everything on the left so far, so the left wall decides the level at `l`: it is `left_max`, and the water there is `left_max - height[l]`. The right side works the same way. Each step settles one bar for good, so the walk is O(n) with a few variables of memory.

## Alternatives

### Scan both sides for every bar

```python alt time="n²" space="1" slow oracle
class Solution:
    def trap(self, height: List[int]) -> int:
        water = 0
        for i in range(len(height)):
            level = min(max(height[: i + 1]), max(height[i:]))
            water += level - height[i]
        return water
```

The definition taken literally. Each bar scans the whole list again, so it is O(n²).

### Precompute both maxima

```python alt time="n" space="n"
class Solution:
    def trap(self, height: List[int]) -> int:
        n = len(height)
        left = [0] * n
        right = [0] * n
        best = 0
        for i in range(n):
            best = max(best, height[i])
            left[i] = best
        best = 0
        for i in range(n - 1, -1, -1):
            best = max(best, height[i])
            right[i] = best
        return sum(min(left[i], right[i]) - height[i] for i in range(n))
```

Two passes store the tallest bar so far from each side, and a third adds up the water. It is O(n) and easy to explain, at the cost of two extra lists. The two-pointer version removes them by noticing that only the lower side matters at each step.

### Monotonic stack

```python alt time="n" space="n"
class Solution:
    def trap(self, height: List[int]) -> int:
        stack = []  # indices of bars, heights decreasing
        water = 0
        for i, h in enumerate(height):
            while stack and height[stack[-1]] < h:
                bottom = stack.pop()
                if not stack:
                    break
                left = stack[-1]
                width = i - left - 1
                water += width * (min(height[left], h) - height[bottom])
            stack.append(i)
        return water
```

This fills water layer by layer: when a taller bar arrives, it closes off pools above the shorter bars on the stack. It is a good preview of the stacks module, where the same "pop while smaller" loop appears again.

## Wrong answers

### Lets the water go below the bar

```python wrong fails="example" test="Example 2"
class Solution:
    def trap(self, height: List[int]) -> int:
        water = 0
        for i in range(1, len(height) - 1):
            level = min(max(height[:i]), max(height[i + 1:]))  # walls that leave out bar i
            water += level - height[i]  # negative when bar i is taller than a wall
        return water
```

When the walls leave out the bar itself, a bar taller than one of its walls gets negative water, which lowers the total. In `[1, 2, 3]`, the middle bar adds 1 − 2 = −1.

### Only looks at the neighbours

```python wrong fails="example" test="Example 1"
class Solution:
    def trap(self, height: List[int]) -> int:
        water = 0
        for i in range(1, len(height) - 1):
            level = min(height[i - 1], height[i + 1])  # the walls can be farther away
            water += max(0, level - height[i])
        return water
```

The walls are the tallest bars anywhere on each side, not the two next to it. In `[3, 0, 2, 0, 4]`, the bar of height 2 holds 1 unit because of the 3 and the 4 further out, which this version never sees.

### Rescans both sides for every bar

```python wrong fails="perf"
class Solution:
    def trap(self, height: List[int]) -> int:
        water = 0
        for i in range(len(height)):
            left = right = 0
            for j in range(i + 1):
                left = max(left, height[j])
            for j in range(i, len(height)):
                right = max(right, height[j])
            water += min(left, right) - height[i]
        return water
```

Correct, but each bar rescans the list: about 10¹⁰ steps for 100,000 bars.

## Notes

If you can only remember one version, remember the prefix and suffix maxima: it is easy to derive and to explain. Then offer the two-pointer version as the space optimisation. Compare it with Container With Most Water ([[p:11]]): there you pick the single best pair of lines, here every bar collects its own water.
