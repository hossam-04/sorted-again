---
id: 739
module: stacks
patterns: [monotonic stack, next greater element]
signature: "def dailyTemperatures(self, temperatures: List[int]) -> List[int]"
---

## Task

You get a list `temperatures` with one reading per day. For each day, find how many days you have to wait until a **strictly warmer** day. If no later day is warmer, the answer for that day is 0.

Return the list of waiting times, one per day.

## Constraints

- `1 <= len(temperatures) <= 100_000`
- `30 <= temperatures[i] <= 100`

```json examples
[
  {"args": [[50, 40, 45, 60, 55]], "out": [3, 1, 1, 0, 0], "why": "Day 0 waits until day 3 (60). Day 1 (40) only waits one day for 45."},
  {"args": [[70, 70, 71]], "out": [2, 1, 0], "why": "An equal temperature isn't warmer, so day 0 waits two days for 71."},
  {"args": [[90, 80, 70]], "out": [0, 0, 0], "why": "It only gets colder, so no day has a warmer day ahead."}
]
```

```json edge
[
  {"name": "one day", "args": [[55]], "out": [0]},
  {"name": "warmer every day", "args": [[31, 32, 33, 34]], "out": [1, 1, 1, 0]},
  {"name": "warmer day at the very end", "args": [[60, 50, 50, 50, 61]], "out": [4, 3, 2, 1, 0]},
  {"name": "valleys", "args": [[40, 30, 40, 30, 50]], "out": [4, 1, 2, 1, 0]},
  {"name": "all equal", "args": [[33, 33, 33]], "out": [0, 0, 0]},
  {"name": "extremes", "args": [[30, 100, 30, 100]], "out": [1, 0, 1, 0]},
  {"name": "two days, colder", "args": [[45, 44]], "out": [0, 0]}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 9) if size == "small" else rng.randint(20, 300)
    lo, hi = (30, 36) if size == "small" else (30, 100)
    return [[rng.randint(lo, hi) for _ in range(n)]]
```

```python perf
def perf(rng):
    # 100,000 days, mostly at the maximum of 100: those days never get a warmer day,
    # so searching ahead from each day runs to the end of the list.
    return [[100 if rng.random() < 0.9 else rng.randint(30, 99) for _ in range(100_000)]]
```

## Hints

1. A day's answer is decided by the first warmer day after it. Searching forward from every day can cost O(n) each.
2. Turn it around: when a warm day arrives, it answers every earlier day that's still waiting and colder than it.
3. Keep a stack of days still waiting for an answer. Their temperatures never increase from bottom to top, so the warm day pops them from the top until the top is at least as warm.

## Solution

```python solution time="n" space="n"
class Solution:
    def dailyTemperatures(self, temperatures: List[int]) -> List[int]:
        answer = [0] * len(temperatures)
        waiting = []  # indices of days without a warmer day yet; temperatures never rise towards the top
        for i, t in enumerate(temperatures):
            while waiting and temperatures[waiting[-1]] < t:
                j = waiting.pop()
                answer[j] = i - j  # day i is the first warmer day after day j
            waiting.append(i)
        return answer
```

The stack holds the days still waiting for a warmer day, oldest at the bottom. When day i arrives, any waiting day that is colder has found its answer: day i is the first warmer day after it, because if an earlier day had been warmer it would already have popped it. Days that are not colder stay, and day i joins them on top.

That keeps the waiting temperatures non-increasing from bottom to top, so the colder days are always on top where the next day can reach them. Days left on the stack at the end never got a warmer day, and their answer stays 0.

Each day is pushed once and popped at most once: O(n) time, and O(n) space for the stack in the worst case (temperatures that never rise).

## Alternatives

### Search forward from every day

```python alt time="n²" space="1" slow oracle
class Solution:
    def dailyTemperatures(self, temperatures: List[int]) -> List[int]:
        n = len(temperatures)
        answer = [0] * n
        for i in range(n):
            for j in range(i + 1, n):
                if temperatures[j] > temperatures[i]:
                    answer[i] = j - i
                    break
        return answer
```

The direct approach. It's quick when warmer days come soon, but a day that never gets warmer scans to the end of the list, so many hot days make it O(n²).

### Jump ahead using answers already computed

```python alt time="n" space="1"
class Solution:
    def dailyTemperatures(self, temperatures: List[int]) -> List[int]:
        n = len(temperatures)
        answer = [0] * n
        for i in range(n - 2, -1, -1):
            j = i + 1
            while temperatures[j] <= temperatures[i]:
                if answer[j] == 0:  # nothing warmer after j, so nothing warmer after i either
                    j = n
                    break
                j += answer[j]     # skip straight to j's next warmer day
            if j < n:
                answer[i] = j - i
        return answer
```

Going from right to left, `answer[j]` lets you skip from day j to its next warmer day without looking at the days in between. This uses no extra space besides the answer, and the skips make it linear overall, though that's harder to see than with the stack.

## Wrong answers

### Treats an equal temperature as warmer

```python wrong fails="example" test="Example 2"
class Solution:
    def dailyTemperatures(self, temperatures: List[int]) -> List[int]:
        answer = [0] * len(temperatures)
        waiting = []
        for i, t in enumerate(temperatures):
            while waiting and temperatures[waiting[-1]] <= t:  # pops days that are just as warm
                j = waiting.pop()
                answer[j] = i - j
            waiting.append(i)
        return answer
```

The task asks for a strictly warmer day. With `<=`, the second 70 in Example 2 counts as warmer than the first, giving day 0 an answer of 1 instead of 2.

### Jumps without a stopping rule

```python wrong fails="example" test="Example 1" how="timeout"
class Solution:
    def dailyTemperatures(self, temperatures: List[int]) -> List[int]:
        n = len(temperatures)
        answer = [0] * n
        for i in range(n - 2, -1, -1):
            j = i + 1
            while j < n and temperatures[j] <= temperatures[i]:
                j += answer[j]  # when answer[j] is 0, j never moves
            if j < n:
                answer[i] = j - i
        return answer
```

The right-to-left jumping idea is sound, but `answer[j] == 0` means "no warmer day after j", and adding 0 leaves `j` where it is. The loop spins forever on the first such day. Handle the 0 case separately, as in the alternative above.

### Searches forward from every day with index()

```python wrong fails="perf"
class Solution:
    def dailyTemperatures(self, temperatures: List[int]) -> List[int]:
        n = len(temperatures)
        answer = [0] * n
        for i, t in enumerate(temperatures):
            later = temperatures[i + 1 :]  # copies the rest of the list for every day
            for k, u in enumerate(later):
                if u > t:
                    answer[i] = k + 1
                    break
        return answer
```

It finds each first warmer day correctly, but copying the rest of the list is O(n) for every day before the search even starts, and days that never warm up scan everything after them. On 100,000 mostly-hot days that's billions of steps.
