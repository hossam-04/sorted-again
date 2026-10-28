---
id: 207
module: graphs
patterns: [topological sort, Kahn's algorithm, cycle detection in a directed graph]
signature: "def canFinish(self, numCourses: int, prerequisites: List[List[int]]) -> bool"
---

## Task

There are `numCourses` courses, numbered 0 to `numCourses − 1`. Each pair `[a, b]` in `prerequisites` means course `b` must be finished before course `a` can be taken.

Return `True` if it's possible to finish every course, and `False` otherwise.

## Constraints

- `1 <= numCourses <= 100_000`
- `0 <= len(prerequisites) <= 200_000`
- `0 <= a, b < numCourses`, `a != b`, and no pair appears twice

```json examples
[
  {"args": [3, [[1, 0], [2, 1]]], "out": true, "why": "Take course 0, then 1, then 2."},
  {"args": [3, [[0, 1], [1, 2], [2, 0]]], "out": false, "why": "0 needs 1, 1 needs 2 and 2 needs 0: they form a cycle, so none of them can ever be taken first."},
  {"args": [4, [[2, 0], [2, 1], [3, 2], [3, 1]]], "out": true, "why": "Course 3 can be reached from course 1 along two routes, but that's not a cycle: take 0 and 1, then 2, then 3."}
]
```

```json edge
[
  {"name": "no prerequisites", "args": [5, []], "out": true},
  {"name": "a single course", "args": [1, []], "out": true},
  {"name": "two courses that need each other", "args": [3, [[1, 2], [2, 1]]], "out": false},
  {"name": "a cycle away from course 0", "args": [5, [[1, 0], [3, 4], [4, 3]]], "out": false},
  {"name": "a long chain", "args": [6, [[1, 0], [2, 1], [3, 2], [4, 3], [5, 4]]], "out": true},
  {"name": "one course needed by all others", "args": [5, [[1, 0], [2, 0], [3, 0], [4, 0]]], "out": true}
]
```

```python oracle
class Solution:
    def canFinish(self, numCourses: int, prerequisites: List[List[int]]) -> bool:
        done = set()
        while len(done) < numCourses:  # repeatedly take any course whose prerequisites are all done
            ready = [c for c in range(numCourses) if c not in done and all(b in done for a, b in prerequisites if a == c)]
            if not ready:
                return False
            done.update(ready)
        return True
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 5) if size == "small" else rng.randint(5, 15)
    pairs = set()
    for _ in range(rng.randint(0, n + 2) if size == "small" else rng.randint(n, 3 * n)):
        a, b = rng.randrange(n), rng.randrange(n)
        if a != b and (rng.random() < 0.15 or a > b):  # mostly forward, sometimes backward
            pairs.add((a, b))
    return [n, [list(p) for p in sorted(pairs)]]
```

```python perf
def perf(rng):
    # 100,000 courses: a chain through all of them plus 100,000 more forward prerequisites. No cycle.
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

1. Draw each pair `[a, b]` as an arrow b → a. All courses can be finished exactly when this directed graph has no cycle.
2. A course with no remaining prerequisites can be taken right away. Taking it may free the courses that were waiting for it.
3. Count each course's prerequisites (its *in-degree*), start a queue with the courses at 0, and repeatedly take one, decreasing the count of each course that depends on it. If every course gets taken, there's no cycle.

## Solution

```python solution time="V + E" space="V + E"
class Solution:
    def canFinish(self, numCourses: int, prerequisites: List[List[int]]) -> bool:
        unlocks = [[] for _ in range(numCourses)]  # b -> the courses that need b
        waiting = [0] * numCourses  # how many prerequisites each course still waits for
        for a, b in prerequisites:
            unlocks[b].append(a)
            waiting[a] += 1
        queue = deque(c for c in range(numCourses) if waiting[c] == 0)
        taken = 0
        while queue:
            c = queue.popleft()
            taken += 1
            for nxt in unlocks[c]:
                waiting[nxt] -= 1
                if waiting[nxt] == 0:  # its last prerequisite is done
                    queue.append(nxt)
        return taken == numCourses  # courses on a cycle never reach 0
```

This is **Kahn's algorithm** for topological sorting. Courses with nothing left to wait for go in the queue; taking one lowers the count of everything that depends on it. A course on a cycle always waits for another course on the same cycle, so its count never reaches 0 and it's never taken: if fewer than `numCourses` courses get taken, there's a cycle.

Every course is queued at most once and every prerequisite is looked at twice, so the time is O(V + E) for V courses and E prerequisites.

## Alternatives

### Depth-first search with three colours

```python alt time="V + E" space="V + E"
class Solution:
    def canFinish(self, numCourses: int, prerequisites: List[List[int]]) -> bool:
        unlocks = [[] for _ in range(numCourses)]
        for a, b in prerequisites:
            unlocks[b].append(a)
        state = [0] * numCourses  # 0 = not visited, 1 = on the current path, 2 = finished
        for start in range(numCourses):
            if state[start]:
                continue
            state[start] = 1
            stack = [(start, iter(unlocks[start]))]
            while stack:
                node, nxt = stack[-1]
                child = next(nxt, None)
                if child is None:
                    state[node] = 2  # every path from node is explored
                    stack.pop()
                elif state[child] == 1:
                    return False  # back to a course on the current path: a cycle
                elif state[child] == 0:
                    state[child] = 1
                    stack.append((child, iter(unlocks[child])))
        return True
```

A depth-first search finds a cycle when it reaches a node that is still *on the current path*. Reaching a node that is already finished is fine: it just means two routes lead there. That's why it needs three states, not just "visited". The explicit stack of iterators replaces recursion, which would be 100,000 calls deep on a long chain.

## Wrong answers

### Treats any revisit as a cycle

```python wrong fails="example" test="Example 3"
class Solution:
    def canFinish(self, numCourses: int, prerequisites: List[List[int]]) -> bool:
        unlocks = [[] for _ in range(numCourses)]
        for a, b in prerequisites:
            unlocks[b].append(a)
        visited = set()

        def dfs(c):
            if c in visited:
                return False  # but a finished course reached a second way isn't a cycle
            visited.add(c)
            return all(dfs(nxt) for nxt in unlocks[c])

        return all(c in visited or dfs(c) for c in range(numCourses))
```

With a single "visited" state, the search can't tell a cycle from a second route to a course it has already finished. In Example 3, course 3 is reached from both 1 and 2, which looks like a cycle here. A cycle means coming back to a course *on the current path*: track that separately, or count prerequisites with Kahn's algorithm.

### Only looks for two courses that need each other

```python wrong fails="example" test="Example 2"
class Solution:
    def canFinish(self, numCourses: int, prerequisites: List[List[int]]) -> bool:
        pairs = {(a, b) for a, b in prerequisites}
        return not any((b, a) in pairs for a, b in pairs)  # finds only cycles of length 2
```

Two courses requiring each other is the shortest cycle, but a cycle can be any length: 0 needs 1, 1 needs 2, 2 needs 0. Checking pairs misses it. Look for cycles of any length with a graph search.

### Searches all the courses for the next one to take

```python wrong fails="perf"
class Solution:
    def canFinish(self, numCourses: int, prerequisites: List[List[int]]) -> bool:
        waiting = [0] * numCourses
        unlocks = [[] for _ in range(numCourses)]
        for a, b in prerequisites:
            unlocks[b].append(a)
            waiting[a] += 1
        taken = [False] * numCourses
        for _ in range(numCourses):
            ready = next((c for c in range(numCourses) if not taken[c] and waiting[c] == 0), None)  # a full scan
            if ready is None:
                return False
            taken[ready] = True
            for nxt in unlocks[ready]:
                waiting[nxt] -= 1
        return True
```

This takes courses in a valid order and is correct, but finding each next course scans all of them: O(V²) in total. With 100,000 courses that's billions of checks. Keep the courses that become ready in a queue instead.
