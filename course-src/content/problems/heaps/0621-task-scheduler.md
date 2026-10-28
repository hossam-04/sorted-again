---
id: 621
module: heaps
patterns: [greedy with a max-heap, counting]
signature: "def leastInterval(self, tasks: List[str], n: int) -> int"
---

## Task

A machine runs jobs, one per time unit. Each job has a type, written as an uppercase letter, and `tasks` lists every job to run; you may run them in any order. Between two jobs of the same type there must be at least `n` other time units, which can be jobs of other types or idle units where the machine does nothing.

Return the smallest number of time units needed to run every job, idle units included.

## Constraints

- `1 <= len(tasks) <= 100_000`
- Each task is an uppercase letter `A` to `Z`
- `0 <= n <= 1_000`

```json examples
[
  {"args": [["X", "X", "X", "Y"], 2], "out": 7, "why": "X needs two units between its runs: X Y idle X idle idle X takes 7 units."},
  {"args": [["P", "Q", "R", "P", "Q", "R"], 1], "out": 6, "why": "P Q R P Q R never runs a type twice in a row, so no idle time is needed: the answer is the number of jobs."},
  {"args": [["M", "M", "M"], 0], "out": 3, "why": "With n = 0 the same type can run back to back."}
]
```

```json edge
[
  {"name": "one job", "args": [["Q"], 5], "out": 1},
  {"name": "two types tie for most", "args": [["A", "A", "B", "B"], 3], "out": 6},
  {"name": "a long wait", "args": [["Z", "Z"], 100], "out": 102},
  {"name": "other jobs fill every gap", "args": [["A", "A", "A", "B", "C", "D", "E", "F", "G"], 2], "out": 9},
  {"name": "every type once", "args": [["K", "L", "M", "N"], 50], "out": 4},
  {"name": "no idle units after the last job", "args": [["A", "A", "B"], 2], "out": 4}
]
```

```python oracle
class Solution:
    def leastInterval(self, tasks: List[str], n: int) -> int:
        # Breadth-first search over (jobs left, units until runnable) for each type: the first state with
        # no jobs left is reached in the fewest time units.
        start = tuple(sorted((c, 0) for c in Counter(tasks).values()))
        seen, frontier, time = {start}, [start], 0
        while True:
            nxt = []
            for state in frontier:
                if all(c == 0 for c, _ in state):
                    return time
                cooled = [(c, max(0, w - 1)) for c, w in state]
                moves = [tuple(sorted(cooled))]  # stay idle
                for i, (c, w) in enumerate(state):
                    if c and not w:  # run one job of this type
                        after = list(cooled)
                        after[i] = (c - 1, n)
                        moves.append(tuple(sorted(after)))
                for m in moves:
                    if m not in seen:
                        seen.add(m)
                        nxt.append(m)
            frontier, time = nxt, time + 1
```

```python gen
def gen(rng, size):
    letters = "ABC" if size == "small" else "ABCDE"
    m = rng.randint(1, 6) if size == "small" else rng.randint(6, 12)
    n = rng.randint(0, 3) if size == "small" else rng.randint(0, 5)
    return [[rng.choice(letters) for _ in range(m)], n]
```

```python perf
def perf(rng):
    # 20,000 jobs of type A and 2,000 each of B, C, D and E, with n = 1,000: about 20 million time units.
    tasks = ["A"] * 20_000 + [c for c in "BCDE" for _ in range(2_000)]
    rng.shuffle(tasks)
    return [tasks, 1_000]
```

## Hints

1. Only the number of jobs of each type matters, not their order in `tasks`.
2. A greedy choice works: whenever the machine is free, run the type with the most jobs left among those allowed to run. A max-heap of remaining counts finds it quickly.
3. Think in rounds of n + 1 units. In each round, run one job of each of the (up to) n + 1 types with the most jobs left; no type repeats within a round, so no rule is broken. A round takes n + 1 units, except the last one, which needs no idle units after its jobs.

## Solution

```python solution time="m" space="1"
class Solution:
    def leastInterval(self, tasks: List[str], n: int) -> int:
        heap = [-c for c in Counter(tasks).values()]  # jobs left per type, as a max-heap
        heapify(heap)
        time = 0
        while heap:
            ran = []
            for _ in range(n + 1):  # one round: n + 1 units, each type at most once
                if not heap:
                    break
                ran.append(heappop(heap) + 1)  # run one job of the type with the most left
            for c in ran:
                if c:  # this type still has jobs (counts are negative)
                    heappush(heap, c)
            time += n + 1 if heap else len(ran)  # a full round, or the last one without idle units at its end
        return time
```

The type with the most jobs left is the hardest to fit, so it should run as early as possible: each round takes the up to n + 1 types with the most jobs left and runs one job of each. Within a round no type repeats, and a type's next job is in a later round, at least n + 1 units later. If fewer than n + 1 types have jobs left, the rest of the round is idle, except in the last round, where nothing has to wait.

Here m is the number of jobs. Every round runs at least one job, so there are at most m rounds, and each heap operation works on at most 26 counts. That's O(m) time, with O(1) extra space for the 26 counts.

## Alternatives

### Count the most frequent type

```python alt time="m" space="1"
class Solution:
    def leastInterval(self, tasks: List[str], n: int) -> int:
        counts = Counter(tasks).values()
        most = max(counts)
        tied = sum(1 for c in counts if c == most)  # the types that share the largest count
        return max(len(tasks), (most - 1) * (n + 1) + tied)
```

Let `most` be the largest count. The type with that count needs `most − 1` gaps between its jobs, so lay out `most − 1` blocks of n + 1 units, each starting with that type, then a last block holding only the types tied at `most`. Every other job fits into the blocks' free slots. If they don't all fit, there's no idle time at all, and the answer is simply the number of jobs. That's what the outer `max` covers.

## Wrong answers

### Forgets that the gaps can overflow

```python wrong fails="example" test="Example 2"
class Solution:
    def leastInterval(self, tasks: List[str], n: int) -> int:
        counts = Counter(tasks).values()
        most = max(counts)
        tied = sum(1 for c in counts if c == most)
        return (most - 1) * (n + 1) + tied  # too small when no idle time is needed at all
```

The block formula counts the layout built around the most frequent type, assuming everything else fits into its gaps. In Example 2 there are more jobs than slots, so the formula gives 5 for 6 jobs, which is impossible. The answer is never less than `len(tasks)`.

### Ignores ties for the largest count

```python wrong fails="edge" test="two types tie for most"
class Solution:
    def leastInterval(self, tasks: List[str], n: int) -> int:
        most = max(Counter(tasks).values())
        return max(len(tasks), (most - 1) * (n + 1) + 1)  # as if only one type had the largest count
```

When several types share the largest count, each of them has a job in the last block. With A A B B and n = 3, the schedule is A B idle idle A B: 6 units, not 5. Count the types tied at the top.

### Simulates every time unit

```python wrong fails="perf"
class Solution:
    def leastInterval(self, tasks: List[str], n: int) -> int:
        left = Counter(tasks)
        ready = {t: 0 for t in left}  # the first time each type may run again
        time = 0
        while left:
            free = [t for t in left if ready[t] <= time]
            if free:  # run the free type with the most jobs left
                t = max(free, key=lambda t: left[t])
                left[t] -= 1
                if not left[t]:
                    del left[t]
                ready[t] = time + n + 1
            time += 1  # one unit passes, busy or idle
        return time
```

This greedy is correct, but it steps through every time unit one at a time, idle ones included. With 20,000 jobs of one type and n = 1,000, the schedule is about 20 million units long. Rounds of n + 1 units, or the counting formula, skip over the idle time.
