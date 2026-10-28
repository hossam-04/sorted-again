---
id: 1235
module: advanced-dp
patterns: [weighted interval scheduling, DP plus binary search]
signature: "def jobScheduling(self, startTime: List[int], endTime: List[int], profit: List[int]) -> int"
---

## Task

Job i runs from `startTime[i]` to `endTime[i]` and earns `profit[i]`. You can work on one job at a time, so the jobs you choose must not overlap, although one job may start at the very moment another ends.

Return the largest total profit you can earn.

## Constraints

- `1 <= len(startTime) == len(endTime) == len(profit) <= 50_000`
- `1 <= startTime[i] < endTime[i] <= 10**9`
- `1 <= profit[i] <= 10**4`

```json examples
[
  {"args": [[1, 2, 4, 6], [3, 5, 6, 9], [20, 30, 25, 40]], "out": 85, "why": "1–3, 4–6 and 6–9 fit together (6–9 starts the moment 4–6 ends): 20 + 25 + 40 = 85."},
  {"args": [[1, 5, 1], [10, 10, 5], [60, 35, 30]], "out": 65, "why": "The most profitable job, 1–10, blocks both others, which together earn more: 30 + 35."},
  {"args": [[3], [4], [7]], "out": 7, "why": "A single job."}
]
```

```json edge
[
  {"name": "all overlapping", "args": [[1, 1, 1], [5, 5, 5], [3, 9, 4]], "out": 9},
  {"name": "a chain of touching jobs", "args": [[1, 2, 3], [2, 3, 4], [1, 1, 1]], "out": 3},
  {"name": "listed out of order", "args": [[5, 1], [7, 4], [10, 10]], "out": 20},
  {"name": "huge times", "args": [[1, 999999999], [999999999, 1000000000], [10000, 10000]], "out": 20000},
  {"name": "one long job against many short ones", "args": [[1, 1, 2, 3], [4, 2, 3, 4], [5, 2, 2, 2]], "out": 6}
]
```

```python oracle
class Solution:
    def jobScheduling(self, startTime: List[int], endTime: List[int], profit: List[int]) -> int:
        jobs = sorted(zip(endTime, startTime, profit))
        best = [0] * (len(jobs) + 1)  # best[i]: the most from the first i jobs by end time
        for i, (end, start, gain) in enumerate(jobs, 1):
            prev = max((j for j in range(i - 1, 0, -1) if jobs[j - 1][0] <= start), default=0)
            best[i] = max(best[i - 1], best[prev] + gain)
        return best[-1]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 6) if size == "small" else rng.randint(20, 300)
    hi = 12 if size == "small" else rng.choice([100, 10**9])
    starts, ends = [], []
    for _ in range(n):
        s = rng.randint(1, hi - 1)
        starts.append(s)
        ends.append(rng.randint(s + 1, min(hi, s + max(2, hi // 5))))
    return [starts, ends, [rng.randint(1, 50 if size == "small" else 10**4) for _ in range(n)]]
```

```python perf
def perf(rng):
    # 50,000 long jobs at random times: each one overlaps thousands of others.
    starts, ends = [], []
    for _ in range(50_000):
        s = rng.randint(1, 5 * 10**8)
        starts.append(s)
        ends.append(s + rng.randint(1, 5 * 10**8))
    return [starts, ends, [rng.randint(1, 10**4) for _ in range(50_000)]]
```

## Hints

1. Sort the jobs by end time. For the i-th job, either it isn't used, and the best is the same as for the first i − 1 jobs, or it is, and the rest of the plan uses only jobs that end by its start.
2. Those compatible jobs form a prefix of the sorted order: all jobs whose end is at most the start. So `best[i] = max(best[i - 1], profit + best[p])`, where p counts the jobs ending by this job's start.
3. Find p with `bisect_right` on the sorted end times, using the start time: `bisect_right` includes jobs ending exactly when this one starts.

## Solution

```python solution time="n log n" space="n"
class Solution:
    def jobScheduling(self, startTime: List[int], endTime: List[int], profit: List[int]) -> int:
        jobs = sorted(zip(endTime, startTime, profit))  # by end time
        ends = [end for end, _, _ in jobs]
        best = [0] * (len(jobs) + 1)  # best[i]: the most profit using only the first i jobs
        for i, (end, start, gain) in enumerate(jobs, 1):
            p = bisect_right(ends, start, 0, i - 1)  # how many earlier jobs end by this job's start
            best[i] = max(best[i - 1], best[p] + gain)
        return best[-1]
```

This is **weighted interval scheduling**, the version of [[p:435]] where each interval has a value, so greedy no longer works: a long, valuable job can beat several short ones or lose to them. The DP over jobs sorted by end time has two choices per job, skip it or take it with the best plan among jobs that finish before it starts, and sorting by end time makes those jobs a prefix.

`bisect_right` on the end times finds the prefix's length in O(log n); because it stops after equal values, a job ending exactly at the start counts as compatible. Sorting plus n binary searches: O(n log n).

## Alternatives

### Sweep with a heap of finished jobs

```python alt time="n log n" space="n"
class Solution:
    def jobScheduling(self, startTime: List[int], endTime: List[int], profit: List[int]) -> int:
        running = []  # (end, best total ending with that job), as a min-heap by end
        best_done = 0  # the best total among jobs that have ended by now
        for start, end, gain in sorted(zip(startTime, endTime, profit)):  # by start time
            while running and running[0][0] <= start:  # jobs finished by this start
                best_done = max(best_done, heappop(running)[1])
            heappush(running, (end, best_done + gain))
        return max([best_done] + [total for _, total in running])
```

The same recurrence, from the other side: go through jobs by start time, and keep the jobs that might still be running in a min-heap by end time. Before each start, every job that has ended leaves the heap and offers its total to `best_done`, the best plan you can continue from. It needs no binary search, and works when jobs arrive as a stream sorted by start.

## Wrong answers

### Treats touching jobs as overlapping

```python wrong fails="example" test="Example 1"
class Solution:
    def jobScheduling(self, startTime: List[int], endTime: List[int], profit: List[int]) -> int:
        jobs = sorted(zip(endTime, startTime, profit))
        ends = [end for end, _, _ in jobs]
        best = [0] * (len(jobs) + 1)
        for i, (end, start, gain) in enumerate(jobs, 1):
            p = bisect_left(ends, start, 0, i - 1)  # leaves out jobs ending exactly at start
            best[i] = max(best[i - 1], best[p] + gain)
        return best[-1]
```

A job may start the moment another ends. `bisect_left` stops *before* end times equal to the start, so those jobs don't count as compatible: in Example 1, 6–9 can't follow 4–6, and the best plan drops to 30 + 40 = 70.

### Takes the most profitable jobs first

```python wrong fails="example" test="Example 1"
class Solution:
    def jobScheduling(self, startTime: List[int], endTime: List[int], profit: List[int]) -> int:
        chosen, total = [], 0
        for gain, start, end in sorted(zip(profit, startTime, endTime), reverse=True):
            if all(end <= s or e <= start for s, e in chosen):  # fits with everything chosen so far
                chosen.append((start, end))
                total += gain
        return total
```

Greedy by profit can't tell that a valuable job may block more than it's worth. In Example 1 it takes 6–9 (40) and then 2–5 (30), after which nothing else fits: 70, while 1–3, 4–6 and 6–9 earn 85. In Example 2 the job worth 60 blocks two jobs worth 65. Weighing "take it" against "skip it" for every job is what the DP adds.

### Searches all earlier jobs for the last compatible one

```python wrong fails="perf"
class Solution:
    def jobScheduling(self, startTime: List[int], endTime: List[int], profit: List[int]) -> int:
        jobs = sorted(zip(endTime, startTime, profit))
        best = [0] * (len(jobs) + 1)
        for i, (end, start, gain) in enumerate(jobs, 1):
            p = i - 1
            while p > 0 and jobs[p - 1][0] > start:  # walks back one job at a time
                p -= 1
            best[i] = max(best[i - 1], best[p] + gain)
        return best[-1]
```

The recurrence is right, but finding the compatible prefix walks backwards one job at a time, past every job that ends after this one starts. In the test the jobs are long and each overlaps thousands of others, so the walks add up to hundreds of millions of steps. The end times are sorted, so binary search can jump straight to the boundary.
