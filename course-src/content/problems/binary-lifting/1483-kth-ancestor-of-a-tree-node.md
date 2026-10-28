---
id: 1483
module: binary-lifting
patterns: [binary lifting, jump tables]
kind: design
class: TreeAncestor
---

## Task

A rooted tree has `n` nodes numbered 0 to `n - 1`, given as a list `parent`: `parent[i]` is the parent of node i, and the root, node 0, has `parent[0] = -1`. Parents aren't necessarily numbered lower than their children.

Build a class `TreeAncestor`:

- `TreeAncestor(n, parent)` stores the tree.
- `getKthAncestor(node, k)` returns the node k steps up from `node`: its parent for k = 1, its grandparent for k = 2, and so on. If the walk would go past the root, return -1.

Tests list the method names called in order, their arguments, and what each call returns (`None` for the constructor).

## Constraints

- `1 <= k <= n <= 50_000`
- `parent[0] == -1`, and `0 <= parent[i] < n` for every other node; the parents form a tree
- `0 <= node < n`
- At most `50_000` calls to `getKthAncestor`

```python starter
class TreeAncestor:
    def __init__(self, n: int, parent: List[int]):
        pass

    def getKthAncestor(self, node: int, k: int) -> int:
        pass
```

```json examples
[
  {"ops": ["TreeAncestor", "getKthAncestor", "getKthAncestor", "getKthAncestor", "getKthAncestor", "getKthAncestor"], "args": [[6, [-1, 0, 1, 1, 3, 4]], [5, 1], [5, 3], [5, 4], [5, 5], [2, 2]], "out": [null, 4, 1, 0, -1, 0], "why": "Going up from node 5 the nodes are 4, 3, 1 and then the root, 0. There's no fifth ancestor. Node 2 hangs off node 1, so two steps up is the root."},
  {"ops": ["TreeAncestor", "getKthAncestor", "getKthAncestor", "getKthAncestor"], "args": [[5, [-1, 0, 0, 0, 0]], [3, 1], [3, 2], [0, 1]], "out": [null, 0, -1, -1], "why": "In a star every node's parent is the root, and the root has no parent at all."},
  {"ops": ["TreeAncestor", "getKthAncestor", "getKthAncestor"], "args": [[4, [-1, 2, 3, 0]], [1, 3], [1, 2]], "out": [null, 0, 3], "why": "Parents can be numbered higher than their children: 1's parent is 2, whose parent is 3, whose parent is the root."}
]
```

```json edge
[
  {"name": "one node", "ops": ["TreeAncestor", "getKthAncestor"], "args": [[1, [-1]], [0, 1]], "out": [null, -1]},
  {"name": "a chain", "ops": ["TreeAncestor", "getKthAncestor", "getKthAncestor"], "args": [[8, [-1, 0, 1, 2, 3, 4, 5, 6]], [7, 7], [7, 4]], "out": [null, 0, 3]},
  {"name": "k is a power of two", "ops": ["TreeAncestor", "getKthAncestor"], "args": [[9, [-1, 0, 1, 2, 3, 4, 5, 6, 7]], [8, 8]], "out": [null, 0]},
  {"name": "one step past the root", "ops": ["TreeAncestor", "getKthAncestor"], "args": [[8, [-1, 0, 1, 2, 3, 4, 5, 6]], [7, 8]], "out": [null, -1]},
  {"name": "k far past the root", "ops": ["TreeAncestor", "getKthAncestor"], "args": [[3, [-1, 0, 1]], [1, 3]], "out": [null, -1]},
  {"name": "every bit of k set", "ops": ["TreeAncestor", "getKthAncestor"], "args": [[16, [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]], [15, 15]], "out": [null, 0]}
]
```

```python oracle
class TreeAncestor:
    def __init__(self, n: int, parent: List[int]):
        self.parent = parent

    def getKthAncestor(self, node: int, k: int) -> int:
        for _ in range(k):
            node = self.parent[node]
            if node == -1:
                return -1
        return node
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 8) if size == "small" else rng.randint(20, 300)
    labels = [0] + rng.sample(range(1, n), n - 1)  # node numbers, the root first
    parent = [-1] * n
    for i in range(1, n):  # each node hangs off an earlier one, so the parents form a tree
        parent[labels[i]] = labels[rng.randrange(i)]
    calls = rng.randint(1, 6) if size == "small" else rng.randint(20, 200)
    ops, args = ["TreeAncestor"], [[n, parent]]
    for _ in range(calls):
        ops.append("getKthAncestor")
        args.append([rng.randrange(n), rng.randint(1, n)])
    return {"ops": ops, "args": args}
```

```python perf
def perf(rng):
    # 50,000 nodes: a chain of 40,000 with 10,000 more hanging off it at random, and 50,000 queries that
    # go thousands of steps up.
    n = 50_000
    parent = [-1] + [i - 1 if i < 40_000 else rng.randrange(i) for i in range(1, n)]
    ops, args = ["TreeAncestor"], [[n, parent]]
    for _ in range(50_000):
        ops.append("getKthAncestor")
        args.append([rng.randrange(n), rng.randint(1, n)])
    return {"ops": ops, "args": args}
```

## Hints

1. Walking up one parent at a time costs O(k) per query. Precompute bigger jumps: if you know every node's ancestor 2^j steps up for every j, any k is a sum of powers of two.
2. Build the table level by level: the ancestor 2^j steps up is the ancestor 2^(j−1) steps up *of* the ancestor 2^(j−1) steps up. Past the root, use -1, and keep it -1.
3. To answer a query, go through the bits of k: for every bit j that's set, jump 2^j steps using row j of the table. If you land on -1, stop.

## Solution

```python solution time="log n" space="n log n"
class TreeAncestor:
    def __init__(self, n: int, parent: List[int]):
        self.up = [parent]  # up[j][v]: the ancestor 2**j steps above v, or -1
        for _ in range(max(1, n.bit_length()) - 1):
            prev = self.up[-1]
            self.up.append([-1 if a == -1 else prev[a] for a in prev])  # two jumps of half the size

    def getKthAncestor(self, node: int, k: int) -> int:
        if k >> len(self.up):
            return -1  # more steps than the tree can have
        j = 0
        while k and node != -1:
            if k & 1:
                node = self.up[j][node]
            k >>= 1
            j += 1
        return node
```

This is **binary lifting**. Row j of the table says where a jump of 2^j steps lands from every node, and each row is built from the one before: two jumps of 2^(j−1) make one of 2^j. With log₂ n rows, every k up to n is a sum of jumps the table knows, one per set bit of k, so a query takes O(log n) steps.

-1 marks "past the root" and stays -1 under further jumps, which handles queries that go too far without any depth bookkeeping. The table uses O(n log n) memory: 16 rows of 50,000 entries here. Each row is one list comprehension over the previous row, so the build is fast in Python too.

## Alternatives

### Depth-first order and binary search

```python alt time="log n" space="n"
class TreeAncestor:
    def __init__(self, n: int, parent: List[int]):
        children = [[] for _ in range(n)]
        for v in range(1, n):
            children[parent[v]].append(v)
        self.depth, self.enter = [0] * n, [0] * n
        self.at_depth = []  # for each depth: (entry time, node) of the nodes there, in entry order
        clock, stack = 0, [0]
        while stack:  # iterative depth-first search, recording entry times
            v = stack.pop()
            self.enter[v] = clock
            clock += 1
            d = self.depth[v]
            if d == len(self.at_depth):
                self.at_depth.append([])
            self.at_depth[d].append((self.enter[v], v))
            for c in children[v]:
                self.depth[c] = d + 1
                stack.append(c)

    def getKthAncestor(self, node: int, k: int) -> int:
        d = self.depth[node] - k
        if d < 0:
            return -1
        row = self.at_depth[d]  # the ancestor is the last node at depth d entered before node
        i = bisect_right(row, (self.enter[node], node)) - 1
        return row[i][1]
```

In a depth-first search, a node's ancestor at depth d is the last node at depth d entered before it: every node at that depth entered later, or earlier but finished, lies in a different branch. Lists of the nodes at each depth, in entry order, turn a query into one binary search. O(n) memory instead of O(n log n), at the cost of a trickier argument.

## Wrong answers

### Stops at the root instead of going past it

```python wrong fails="example" test="Example 1"
class TreeAncestor:
    def __init__(self, n: int, parent: List[int]):
        root_safe = [p if p != -1 else 0 for p in parent]  # the root's parent becomes the root itself
        self.up = [root_safe]
        for _ in range(max(1, n.bit_length()) - 1):
            prev = self.up[-1]
            self.up.append([prev[a] for a in prev])

    def getKthAncestor(self, node: int, k: int) -> int:
        j = 0
        while k:
            if k & 1:
                node = self.up[j][node]
            k >>= 1
            j += 1
        return node
```

Making the root its own parent is a common shortcut, and it does keep jumps from running off the table. But then a walk past the root just stays there: in Example 1, the fifth ancestor of node 5 comes out as 0 instead of -1. Either keep -1, or compare k with the node's depth first.

### Builds each row from the parents again

```python wrong fails="example" test="Example 1"
class TreeAncestor:
    def __init__(self, n: int, parent: List[int]):
        self.up = [parent]
        for _ in range(max(1, n.bit_length()) - 1):
            prev = self.up[-1]
            self.up.append([-1 if a == -1 else parent[a] for a in prev])  # one more step, not twice as many

    def getKthAncestor(self, node: int, k: int) -> int:
        j = 0
        while k and node != -1:
            if k & 1:
                node = self.up[j][node]
            k >>= 1
            j += 1
        return node
```

Following one parent from the previous row makes row j the ancestor j + 1 steps up, not 2^j. The rows for 1 and 2 steps happen to be right, so small k works, but in Example 1, 4 = 2² steps up from node 5 uses the row that only goes 3 steps, and answers 1 instead of 0. Row j must combine two jumps of row j − 1.

### Walks up one parent at a time

```python wrong fails="perf"
class TreeAncestor:
    def __init__(self, n: int, parent: List[int]):
        self.parent = parent

    def getKthAncestor(self, node: int, k: int) -> int:
        for _ in range(k):  # k steps, one by one
            node = self.parent[node]
            if node == -1:
                return -1
        return node
```

Correct, and fine for small k. The test tree is mostly one long chain, so queries walk thousands of steps: 50,000 of them add up to over 700 million steps. The table makes each query about 16 jumps.
