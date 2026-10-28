---
id: 11
module: two-pointers
patterns: [converging pointers, move the shorter side]
signature: "def maxArea(self, height: List[int]) -> int"
---

## Task

You get a list `height` of non-negative integers. Picture a vertical line at each position `i`, `height[i]` units tall. Any two lines, together with the ground between them, form a container, and water in it rises only as high as the shorter of the two lines.

Return the most water one container can hold: the distance between its two lines times the height of the shorter one.

## Constraints

- `2 <= len(height) <= 100_000`
- `0 <= height[i] <= 10_000`

```json examples
[
  {"args": [[2, 5, 4, 3, 6, 1]], "out": 15, "why": "The lines at positions 1 and 4 are 3 apart, and the shorter one is 5 tall: 3 × 5 = 15."},
  {"args": [[4, 4]], "out": 4, "why": "Two lines 1 apart, both 4 tall."},
  {"args": [[3, 0, 0, 3]], "out": 9, "why": "The outer lines are 3 apart and 3 tall. The lines of height 0 in between do not matter."}
]
```

```json edge
[
  {"name": "a line of height zero", "args": [[0, 7]], "out": 0},
  {"name": "all zeros", "args": [[0, 0, 0]], "out": 0},
  {"name": "decreasing heights", "args": [[6, 5, 4, 3, 2, 1]], "out": 9},
  {"name": "tall lines far apart", "args": [[10, 1, 1, 1, 10]], "out": 40},
  {"name": "the best pair is inside", "args": [[1, 9, 9, 1]], "out": 9},
  {"name": "all equal", "args": [[5, 5, 5, 5]], "out": 15},
  {"name": "largest values", "args": [[10000, 1, 10000]], "out": 20000}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(2, 9) if size == "small" else rng.randint(30, 400)
    top = 10 if size == "small" else 10_000
    return [[rng.randint(0, top) for _ in range(n)]]
```

```python perf
def perf(rng):
    return [[rng.randint(0, 10_000) for _ in range(100_000)]]
```

## Hints

1. Start with the widest container: the first and the last line.
2. Moving either pointer inward makes the container narrower. Which move could possibly find a taller container?
3. The shorter line limits the height. Keeping it and moving the taller line can never help, so move the shorter one.

## Solution

```python solution time="n" space="1"
class Solution:
    def maxArea(self, height: List[int]) -> int:
        l, r = 0, len(height) - 1
        best = 0
        while l < r:
            best = max(best, (r - l) * min(height[l], height[r]))
            if height[l] < height[r]:
                l += 1
            else:
                r -= 1
        return best
```

Start with the widest pair. Suppose the left line is the shorter one. Every other container that uses it pairs it with a line closer than `r`, so it is narrower, and its height is still capped by the same short line. None of them can beat the current area, so the left line can be dropped for good. The same argument applies to the right line when it is the shorter one. Each step drops one line, so there are at most n − 1 steps.

## Alternatives

### Check every pair

```python alt time="n²" space="1" slow oracle
class Solution:
    def maxArea(self, height: List[int]) -> int:
        best = 0
        for i in range(len(height)):
            for j in range(i + 1, len(height)):
                best = max(best, (j - i) * min(height[i], height[j]))
        return best
```

Correct and easy to trust, but it looks at about n²/2 pairs: 5 × 10⁹ for 100,000 lines.

### Tallest lines first

```python alt time="n log n" space="n"
class Solution:
    def maxArea(self, height: List[int]) -> int:
        order = sorted(range(len(height)), key=lambda i: -height[i])
        lo = hi = order[0]
        best = 0
        for i in order[1:]:
            # every line seen so far is at least as tall as this one
            best = max(best, height[i] * max(i - lo, hi - i))
            lo, hi = min(lo, i), max(hi, i)
        return best
```

Process the lines from tallest to shortest. When line `i` comes up, every line already seen is at least as tall, so a container made of `i` and one of them is exactly `height[i]` tall. The best partner is the seen line farthest away, which is either the leftmost or the rightmost one seen so far. This is a nice argument, but the sort makes it O(n log n), and the two-pointer version is shorter.

## Wrong answers

### Moves the taller line

```python wrong fails="example" test="Example 1"
class Solution:
    def maxArea(self, height: List[int]) -> int:
        l, r = 0, len(height) - 1
        best = 0
        while l < r:
            best = max(best, (r - l) * min(height[l], height[r]))
            if height[l] > height[r]:  # backwards: this drops the taller line
                l += 1
            else:
                r -= 1
        return best
```

The shorter line is the one that can't be part of a bigger container. Dropping the taller line instead loses good pairs: in Example 1 the pointers walk past the lines of height 5 and 6 without ever pairing them.

### Moves both pointers each step

```python wrong fails="edge" test="decreasing heights"
class Solution:
    def maxArea(self, height: List[int]) -> int:
        l, r = 0, len(height) - 1
        best = 0
        while l < r:
            best = max(best, (r - l) * min(height[l], height[r]))
            l += 1  # only one of the two lines can be ruled out
            r -= 1
        return best
```

Each comparison rules out only the shorter line. Moving both pointers also discards the taller line, which may belong to the best pair. With heights `[6, 5, 4, 3, 2, 1]` the best pair is the first and fourth lines, which this loop never pairs.

### Checks every pair

```python wrong fails="perf"
class Solution:
    def maxArea(self, height: List[int]) -> int:
        best = 0
        n = len(height)
        for i in range(n):
            for j in range(i + 1, n):
                area = (j - i) * min(height[i], height[j])
                if area > best:
                    best = area
        return best
```

Right answers, but O(n²): about 5 × 10⁹ pairs on the performance test.

## Notes

The "rule out the shorter side" argument is the whole interview answer, so practise saying it in one sentence before you write code. Trapping Rain Water ([[p:42]]) looks similar but asks a different question: it sums water over every position instead of picking one container.
