---
id: 102
module: trees
patterns: [breadth-first search, level by level]
signature: "def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]"
---

## Task

You get the root of a binary tree. Return its values level by level: a list with one inner list per level, from the root's level down, and within each level the values from left to right. An empty tree gives an empty list.

## Constraints

- The tree has between `0` and `30_000` nodes
- `-1000 <= node.val <= 1000`

```json examples
[
  {"args": [[8, 4, 12, 2, 6, 10, 14]], "out": [[8], [4, 12], [2, 6, 10, 14]], "why": "Three full levels, each read left to right."},
  {"args": [[1, 2, null, 3, null, 4]], "out": [[1], [2], [3], [4]], "why": "A chain has one node per level."},
  {"args": [[5, null, 9, 7]], "out": [[5], [9], [7]], "why": "9 is the root's right child and 7 is 9's left child."}
]
```

```json edge
[
  {"name": "empty tree", "args": [[]], "out": []},
  {"name": "one node", "args": [[0]], "out": [[0]]},
  {"name": "gaps in a level", "args": [[1, 2, 3, null, 4, 5]], "out": [[1], [2, 3], [4, 5]]},
  {"name": "negative values", "args": [[-1, -2, -3]], "out": [[-1], [-2, -3]]},
  {"name": "only right children", "args": [[1, null, 2, null, 3]], "out": [[1], [2], [3]]}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(0, 8) if size == "small" else rng.randint(20, 300)
    return [tree_level(rng, [rng.randint(-1000, 1000) for _ in range(n)])]


def tree_level(rng, vals):
    """A random binary tree holding vals, written level by level with None for missing children."""
    if not vals:
        return []
    kids = [[None, None] for _ in vals]
    free = [(0, 0), (0, 1)]
    for i in range(1, len(vals)):
        k = rng.randrange(len(free))
        parent, side = free[k]
        free[k] = free[-1]
        free.pop()
        kids[parent][side] = i
        free += [(i, 0), (i, 1)]
    out, queue, head = [], [0], 0
    while head < len(queue):
        i = queue[head]
        head += 1
        if i is None:
            out.append(None)
        else:
            out.append(vals[i])
            queue += kids[i]
    while out[-1] is None:
        out.pop()
    return out
```

```python perf
def perf(rng):
    # A chain of 30,000 nodes: 30,000 levels of one node each.
    level = []
    for _ in range(30_000):
        level += [rng.randint(-1000, 1000), None]
    return [level[:-1]]
```

## Hints

1. Visit nodes in order of their distance from the root: a queue does that (first in, first out).
2. To know where one level ends, process the queue in rounds: at the start of a round, the queue holds exactly the current level.
3. In each round, take `len(queue)` nodes off the front, record their values, and add their children to the back.

## Solution

```python solution time="n" space="w"
class Solution:
    def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:
        out, queue = [], deque([root] if root else [])
        while queue:
            level = []
            for _ in range(len(queue)):  # exactly the nodes of this level
                node = queue.popleft()
                level.append(node.val)
                if node.left:
                    queue.append(node.left)
                if node.right:
                    queue.append(node.right)
            out.append(level)
        return out
```

Breadth-first search visits nodes in order of distance from the root. At the start of each round, the queue contains exactly one level, left to right, because the previous round added children in left-to-right order. `range(len(queue))` is computed once at the start of the round, so the children added during the round wait for the next one.

`deque.popleft` is O(1), unlike `list.pop(0)`. Each node is added and removed once: O(n) time. The queue holds at most one level plus part of the next, O(w) for the widest level w.

## Alternatives

### Depth-first, with the depth as a list index

```python alt time="n" space="h" oracle
class Solution:
    def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:
        out, stack = [], [(root, 0)] if root else []
        while stack:
            node, depth = stack.pop()
            if depth == len(out):
                out.append([])
            out[depth].append(node.val)
            for child in (node.right, node.left):  # push right first so left is visited first
                if child:
                    stack.append((child, depth + 1))
        return out
```

Any traversal that visits each level's nodes from left to right works, if it knows each node's depth. Here a pre-order walk carries the depth and appends to `out[depth]`. It's a useful trick when a recursive walk is more natural than a queue.

## Wrong answers

### Adds the right child first

```python wrong fails="example" test="Example 1"
class Solution:
    def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:
        out, queue = [], deque([root] if root else [])
        while queue:
            level = []
            for _ in range(len(queue)):
                node = queue.popleft()
                level.append(node.val)
                if node.right:  # right before left: every level comes out reversed
                    queue.append(node.right)
                if node.left:
                    queue.append(node.left)
            out.append(level)
        return out
```

The queue keeps the order in which children are added. Adding the right child before the left one reverses every level below the root. (That reversal is exactly what a right-to-left traversal would want.)

### Puts missing children in the queue

```python wrong fails="example" test="Example 1" how="error"
class Solution:
    def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:
        out, queue = [], deque([root] if root else [])
        while queue:
            level = []
            for _ in range(len(queue)):
                node = queue.popleft()
                level.append(node.val)  # node may be None
                queue.append(node.left)
                queue.append(node.right)
            out.append(level)
        return out
```

Every leaf has two missing children, and here they go into the queue as `None`. On the next round `None.val` raises `AttributeError`. Check for a child before adding it, or skip `None` when taking nodes out.

### Collects each level with a fresh walk

```python wrong fails="perf"
class Solution:
    def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:
        out, depth = [], 0
        while True:
            level, stack = [], [(root, 0)] if root else []
            while stack:  # walks down to `depth` again, from the root
                node, d = stack.pop()
                if d == depth:
                    level.append(node.val)
                    continue
                for child in (node.right, node.left):
                    if child:
                        stack.append((child, d + 1))
            if not level:
                return out
            out.append(level)
            depth += 1
```

Fetching each level with its own walk from the root is correct, but level d costs a walk through all the levels above it. For a tall tree that's O(n·h): on a chain of 30,000 nodes, about 450 million steps. One breadth-first pass produces all the levels together.
