---
id: 84
module: stacks
patterns: [monotonic stack, sentinel]
signature: "def largestRectangleArea(self, heights: List[int]) -> int"
---

## Task

You get a list `heights` describing a bar chart: bar `i` is 1 unit wide and `heights[i]` units tall, and the bars stand side by side with no gaps.

Return the area of the largest rectangle that fits entirely inside the bars. The rectangle must sit on the baseline and span whole bars, so its height is limited by the shortest bar it covers.

## Constraints

- `1 <= len(heights) <= 100_000`
- `0 <= heights[i] <= 10_000`

```json examples
[
  {"args": [[3, 1, 4, 4, 2]], "out": 8, "why": "The two bars of height 4 make a rectangle 4 tall and 2 wide. Nothing else beats 8."},
  {"args": [[1, 2, 3, 4, 5]], "out": 9, "why": "The last three bars support a rectangle 3 tall and 3 wide."},
  {"args": [[6]], "out": 6, "why": "A single bar is a rectangle by itself."}
]
```

```json edge
[
  {"name": "zeros", "args": [[0, 0]], "out": 0},
  {"name": "a zero splits the bars", "args": [[3, 3, 0, 2, 2, 2, 2]], "out": 8},
  {"name": "decreasing heights", "args": [[5, 4, 3, 2, 1]], "out": 9},
  {"name": "the shortest bar spans everything", "args": [[5, 4, 4, 5]], "out": 16},
  {"name": "all equal", "args": [[7, 7, 7]], "out": 21},
  {"name": "a valley", "args": [[6, 1, 6]], "out": 6},
  {"name": "a peak", "args": [[1, 3, 6, 3, 1]], "out": 9},
  {"name": "low bar between two high ones", "args": [[2, 1, 2]], "out": 3},
  {"name": "extreme heights", "args": [[10000, 10000]], "out": 20000}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 9) if size == "small" else rng.randint(20, 300)
    hi = rng.choice((3, 8)) if size == "small" else rng.choice((10, 10_000))
    return [[rng.randint(0, hi) for _ in range(n)]]
```

```python perf
def perf(rng):
    # 100,000 slowly rising bars (about one unit every 10 bars), so from any bar the bars to its right
    # are at least as tall: growing a rectangle outward from each bar runs to the end every time.
    return [[min(10_000, i // 10 + rng.randint(0, 1)) for i in range(100_000)]]
```

## Hints

1. The best rectangle has the height of some bar, and stretches left and right until it meets a shorter bar. So the question for each bar is: how far can it extend?
2. Keep a stack of bars whose heights increase from bottom to top. A bar's right limit is found the moment a shorter bar arrives and pops it.
3. When you pop a bar, the rectangle with its height spans from where that bar's run started up to the current position. A bar of height 0 added at the end pops everything that's left.

## Solution

```python solution time="n" space="n"
class Solution:
    def largestRectangleArea(self, heights: List[int]) -> int:
        stack = []  # (start index, height); heights increase from bottom to top
        best = 0
        for i, h in enumerate(heights + [0]):  # the final 0 is shorter than everything and empties the stack
            start = i
            while stack and stack[-1][1] > h:
                j, height = stack.pop()
                best = max(best, height * (i - j))  # height fits from j up to i - 1
                start = j  # the shorter new bar can reach back to where the popped run started
            stack.append((start, h))
        return best
```

Each stack entry is a height together with the leftmost position from which a rectangle of that height can start. Heights increase up the stack, so every entry's rectangle can still grow to the right. When a shorter bar arrives at position `i`, taller entries can't grow past it: each is popped, and its rectangle spans exactly positions `start` to `i - 1`.

The new, shorter bar can extend back over every bar it popped (they were all taller), so it inherits the start of the last one. The extra bar of height 0 at the end is a *sentinel*: it's shorter than everything, so it flushes the stack and nothing needs special handling after the loop.

Every bar is pushed once and popped once: O(n) time, and O(n) space for the stack.

## Alternatives

### Every pair of edges

```python alt time="n²" space="1" slow oracle
class Solution:
    def largestRectangleArea(self, heights: List[int]) -> int:
        best = 0
        for i in range(len(heights)):
            low = heights[i]
            for j in range(i, len(heights)):
                low = min(low, heights[j])  # the shortest bar between i and j
                best = max(best, low * (j - i + 1))
        return best
```

For each left edge, move the right edge outward while tracking the shortest bar in between. It's simple and correct, but it looks at every pair of edges: 5 billion pairs for 100,000 bars.

### Nearest shorter bar on each side

```python alt time="n" space="n"
class Solution:
    def largestRectangleArea(self, heights: List[int]) -> int:
        n = len(heights)
        left, right = [-1] * n, [n] * n  # index of the nearest shorter bar on each side
        stack = []
        for i in range(n):
            while stack and heights[stack[-1]] >= heights[i]:
                stack.pop()
            left[i] = stack[-1] if stack else -1
            stack.append(i)
        stack = []
        for i in range(n - 1, -1, -1):
            while stack and heights[stack[-1]] >= heights[i]:
                stack.pop()
            right[i] = stack[-1] if stack else n
            stack.append(i)
        return max(heights[i] * (right[i] - left[i] - 1) for i in range(n))
```

The same idea in two plain passes: find each bar's nearest shorter neighbour on the left and on the right, and the rectangle with that bar's height lies strictly between them. It's longer than the one-pass version, but each step is easy to check, which makes it a good way to build up to the solution in an interview.

## Wrong answers

### Forgets the bars left on the stack

```python wrong fails="example" test="Example 2"
class Solution:
    def largestRectangleArea(self, heights: List[int]) -> int:
        stack, best = [], 0
        for i, h in enumerate(heights):  # no sentinel at the end
            start = i
            while stack and stack[-1][1] > h:
                j, height = stack.pop()
                best = max(best, height * (i - j))
                start = j
            stack.append((start, h))
        return best  # bars still on the stack were never measured
```

Rectangles are only measured when a shorter bar pops them. Bars that never meet a shorter bar, like every bar of a rising histogram, stay on the stack and are never counted. Append a 0 to the heights, or empty the stack after the loop.

### Measures the width from the popped bar itself

```python wrong fails="edge" test="decreasing heights"
class Solution:
    def largestRectangleArea(self, heights: List[int]) -> int:
        stack, best = [], 0  # indices
        for i, h in enumerate(heights + [0]):
            while stack and heights[stack[-1]] > h:
                j = stack.pop()
                best = max(best, heights[j] * (i - j))  # ignores taller bars to the left of j
            stack.append(i)
        return best
```

A popped bar's rectangle can also extend to the left, over taller bars that were popped earlier. Starting the width at `j` itself forgets them: in `[5, 4, 3, 2, 1]`, the rectangle of height 3 spans three bars, but this counts only one. The width should start just after the entry below `j` in the stack, or at the start position the entry carries.

### Grows outward from every bar

```python wrong fails="perf"
class Solution:
    def largestRectangleArea(self, heights: List[int]) -> int:
        best, n = 0, len(heights)
        for i, h in enumerate(heights):
            l = i
            while l > 0 and heights[l - 1] >= h:  # walks left over taller bars
                l -= 1
            r = i
            while r < n - 1 and heights[r + 1] >= h:  # walks right over taller bars
                r += 1
            best = max(best, h * (r - l + 1))
        return best
```

The rectangle for each bar is computed correctly, and on random data the walks are short. But on rising bars every walk to the right goes to the end of the list: O(n²) steps. The stack finds every bar's limits in one pass.
