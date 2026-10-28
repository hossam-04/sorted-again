---
id: 210
module: graphs
patterns: [topological sort, Kahn's algorithm]
signature: "def findOrder(self, numCourses: int, prerequisites: List[List[int]]) -> List[int]"
compare: validator
---

## Task

There are `numCourses` courses, numbered 0 to `numCourses − 1`, and each pair `[a, b]` in `prerequisites` means course `b` must be finished before course `a`.

Return an order in which all the courses can be taken: a list of every course exactly once, where each course comes after all of its prerequisites. If several orders work, return any of them. If no order works, return an empty list.

## Constraints

- `1 <= numCourses <= 100_000`
- `0 <= len(prerequisites) <= 200_000`
- `0 <= a, b < numCourses`, `a != b`, and no pair appears twice

```json examples
[
  {"args": [3, [[1, 0], [2, 1]]], "out": [0, 1, 2], "why": "Each course needs the one before it, so there's only one possible order."},
  {"args": [4, [[2, 0], [2, 1], [3, 2], [3, 1]]], "out": [0, 1, 2, 3], "why": "0 and 1 can come in either order, but both before 2, and 3 comes last. Any valid order is accepted."},
  {"args": [3, [[0, 1], [1, 2], [2, 0]]], "out": [], "why": "The three courses form a cycle, so there's no valid order: the answer is an empty list."}
]
```

```json edge
[
  {"name": "no prerequisites", "args": [2, []], "out": [0, 1]},
  {"name": "two separate chains", "args": [4, [[1, 0], [3, 2]]], "out": [0, 2, 1, 3]},
  {"name": "two courses that need each other", "args": [3, [[1, 2], [2, 1]]], "out": []},
  {"name": "a cycle among some of the courses", "args": [5, [[1, 0], [3, 4], [4, 3]]], "out": []},
  {"name": "one course needs all the others", "args": [5, [[4, 0], [4, 1], [4, 2], [4, 3]]], "out": [0, 1, 2, 3, 4]}
]
```

```python validator
def check(data, got):
    n, pairs = data
    unlocks, waiting = [[] for _ in range(n)], [0] * n
    for a, b in pairs:
        unlocks[b].append(a)
        waiting[a] += 1
    queue = [c for c in range(n) if waiting[c] == 0]
    for c in queue:  # Kahn's algorithm, to learn whether an order exists at all
        for nxt in unlocks[c]:
            waiting[nxt] -= 1
            if waiting[nxt] == 0:
                queue.append(nxt)
    possible = len(queue) == n
    if not isinstance(got, list):
        return False, "Return a list of course numbers."
    if not possible:
        return (got == [], "These courses contain a cycle, so the answer must be an empty list.")
    if sorted(got) != list(range(n)):
        return False, f"An order must list each of the {n} courses exactly once."
    pos = {c: i for i, c in enumerate(got)}
    for a, b in pairs:
        if pos[b] > pos[a]:
            return False, f"Course {a} comes before its prerequisite {b}."
    return True, ""
```

```python oracle
class Solution:
    def findOrder(self, numCourses: int, prerequisites: List[List[int]]) -> List[int]:
        order = []
        while len(order) < numCourses:  # repeatedly take the smallest course whose prerequisites are done
            done = set(order)
            ready = [c for c in range(numCourses) if c not in done and all(b in done for a, b in prerequisites if a == c)]
            if not ready:
                return []
            order.append(ready[0])
        return order
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 5) if size == "small" else rng.randint(5, 15)
    pairs = set()
    for _ in range(rng.randint(0, n + 2) if size == "small" else rng.randint(n, 3 * n)):
        a, b = rng.randrange(n), rng.randrange(n)
        if a != b and (rng.random() < 0.15 or a > b):
            pairs.add((a, b))
    return [n, [list(p) for p in sorted(pairs)]]
```

```python perf
def perf(rng):
    # 100,000 courses: a chain through all of them plus 100,000 more forward prerequisites.
    n = 100_000
    pairs = {(i + 1, i) for i in range(n - 1)}
    while len(pairs) < 200_000:
        a, b = rng.randrange(n), rng.randrange(n)
        if a > b:
            pairs.add((a, b))
    pairs = [list(p) for p in pairs]
    rng.shuffle(pairs)
    return [n, pairs]
```

## Hints

1. This is [[p:207]], but instead of only deciding whether an order exists, write the order down.
2. In Kahn's algorithm, the order in which courses leave the queue is already a valid order: a course enters the queue only after all its prerequisites have left it.
3. If the order ends up shorter than `numCourses`, some courses were never freed because they're on a cycle: return `[]`.

## Solution

```python solution time="V + E" space="V + E"
class Solution:
    def findOrder(self, numCourses: int, prerequisites: List[List[int]]) -> List[int]:
        unlocks = [[] for _ in range(numCourses)]
        waiting = [0] * numCourses
        for a, b in prerequisites:
            unlocks[b].append(a)
            waiting[a] += 1
        queue = deque(c for c in range(numCourses) if waiting[c] == 0)
        order = []
        while queue:
            c = queue.popleft()
            order.append(c)  # all of c's prerequisites are already in the order
            for nxt in unlocks[c]:
                waiting[nxt] -= 1
                if waiting[nxt] == 0:
                    queue.append(nxt)
        return order if len(order) == numCourses else []
```

Kahn's algorithm produces a topological order directly: a course is appended only once every course it depends on has been appended. Courses caught in a cycle never become ready, so the order comes out short exactly when no valid order exists. The time is O(V + E).

## Alternatives

### Depth-first search, reversed post-order

```python alt time="V + E" space="V + E"
class Solution:
    def findOrder(self, numCourses: int, prerequisites: List[List[int]]) -> List[int]:
        unlocks = [[] for _ in range(numCourses)]
        for a, b in prerequisites:
            unlocks[b].append(a)
        state, finished = [0] * numCourses, []  # 0 new, 1 on the path, 2 done
        for start in range(numCourses):
            if state[start]:
                continue
            state[start] = 1
            stack = [(start, iter(unlocks[start]))]
            while stack:
                node, nxt = stack[-1]
                child = next(nxt, None)
                if child is None:
                    state[node] = 2
                    finished.append(node)  # finishes after everything that depends on it
                    stack.pop()
                elif state[child] == 1:
                    return []  # a cycle
                elif state[child] == 0:
                    state[child] = 1
                    stack.append((child, iter(unlocks[child])))
        return finished[::-1]
```

A depth-first search finishes a course only after every course that depends on it has finished. So the finishing order runs from the last courses to the first, and reversing it gives a valid order.

## Wrong answers

### Forgets to reverse the finishing order

```python wrong fails="example" test="Example 1"
class Solution:
    def findOrder(self, numCourses: int, prerequisites: List[List[int]]) -> List[int]:
        unlocks = [[] for _ in range(numCourses)]
        for a, b in prerequisites:
            unlocks[b].append(a)
        state, finished = [0] * numCourses, []
        for start in range(numCourses):
            if state[start]:
                continue
            state[start] = 1
            stack = [(start, iter(unlocks[start]))]
            while stack:
                node, nxt = stack[-1]
                child = next(nxt, None)
                if child is None:
                    state[node] = 2
                    finished.append(node)
                    stack.pop()
                elif state[child] == 1:
                    return []
                elif state[child] == 0:
                    state[child] = 1
                    stack.append((child, iter(unlocks[child])))
        return finished  # last courses first
```

In a depth-first search, a course finishes after all the courses that depend on it, so the finishing order is a valid order *backwards*. Reverse it before returning.

### Returns a partial order when there's a cycle

```python wrong fails="edge" test="two courses that need each other"
class Solution:
    def findOrder(self, numCourses: int, prerequisites: List[List[int]]) -> List[int]:
        unlocks = [[] for _ in range(numCourses)]
        waiting = [0] * numCourses
        for a, b in prerequisites:
            unlocks[b].append(a)
            waiting[a] += 1
        queue = deque(c for c in range(numCourses) if waiting[c] == 0)
        order = []
        while queue:
            c = queue.popleft()
            order.append(c)
            for nxt in unlocks[c]:
                waiting[nxt] -= 1
                if waiting[nxt] == 0:
                    queue.append(nxt)
        return order  # may be missing the courses on a cycle
```

When some courses form a cycle, Kahn's algorithm still orders all the others, and returns them: with courses 1 and 2 needing each other, it returns `[0]`. But the task asks for an order of *every* course, or `[]` if there isn't one. Check that the order has all `numCourses` courses.

### Searches all the courses for the next one to take

```python wrong fails="perf"
class Solution:
    def findOrder(self, numCourses: int, prerequisites: List[List[int]]) -> List[int]:
        waiting = [0] * numCourses
        unlocks = [[] for _ in range(numCourses)]
        for a, b in prerequisites:
            unlocks[b].append(a)
            waiting[a] += 1
        taken, order = [False] * numCourses, []
        for _ in range(numCourses):
            ready = next((c for c in range(numCourses) if not taken[c] and waiting[c] == 0), None)  # a full scan
            if ready is None:
                return []
            taken[ready] = True
            order.append(ready)
            for nxt in unlocks[ready]:
                waiting[nxt] -= 1
        return order
```

Scanning every course to find the next one that's ready gives a valid order, but costs O(V) per course, O(V²) in total: billions of checks for 100,000 courses. The queue of Kahn's algorithm hands over each ready course in O(1).
