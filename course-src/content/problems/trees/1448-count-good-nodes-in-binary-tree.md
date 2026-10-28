---
id: 1448
module: trees
patterns: [pass state down, running maximum]
signature: "def goodNodes(self, root: TreeNode) -> int"
---

## Task

You get the root of a non-empty binary tree. Call a node *good* if no node on the path from the root down to it (including the root) has a larger value. The root is always good.

Return the number of good nodes.

## Constraints

- The tree has between `1` and `30_000` nodes
- `-10**4 <= node.val <= 10**4`

```json examples
[
  {"args": [[5, 3, 8, 6, 9, 7, 1]], "out": 4, "why": "5, 8, 6 and 9 are good: 6 and 9 sit under 3, but nothing on their paths is bigger than them. 3, 7 and 1 each have a bigger node above them."},
  {"args": [[2, 2, 2]], "out": 3, "why": "Equal values don't make a node bad: all three are good."},
  {"args": [[4, 1, null, 3, 5]], "out": 2, "why": "4 is the root, and 5 is the largest on its path 4 → 1 → 5. 1 and 3 are smaller than 4."}
]
```

```json edge
[
  {"name": "one node", "args": [[-7]], "out": 1},
  {"name": "values only fall", "args": [[5, 4, null, 3, null, 2]], "out": 1},
  {"name": "values only rise", "args": [[1, null, 2, null, 3]], "out": 3},
  {"name": "negative values", "args": [[-1, -5, -3, null, -1]], "out": 2},
  {"name": "a high node shadows a deep one", "args": [[3, 9, null, 4, null, 10]], "out": 3}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 8) if size == "small" else rng.randint(20, 300)
    return [tree_level(rng, [rng.randint(-5, 5) if size == "small" else rng.randint(-10**4, 10**4) for _ in range(n)])]


def tree_level(rng, vals):
    """A random binary tree holding vals, written level by level with None for missing children."""
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
    # A chain of 30,000 nodes with slowly rising values: long root-to-node paths everywhere.
    level = []
    for i in range(30_000):
        level += [i // 3 - 5_000 + rng.randint(-2, 2), None]
    return [level[:-1]]
```

## Hints

1. Whether a node is good depends only on the largest value on its path from the root.
2. Pass that maximum down as you walk the tree, instead of looking back up the path from every node.
3. At each node: it's good if its value is at least the maximum so far; then pass `max(maximum, value)` to its children.

## Solution

```python solution time="n" space="h"
class Solution:
    def goodNodes(self, root: TreeNode) -> int:
        good, stack = 0, [(root, root.val)]  # (node, largest value on the path above it)
        while stack:
            node, highest = stack.pop()
            if node.val >= highest:
                good += 1
            highest = max(highest, node.val)
            for child in (node.left, node.right):
                if child:
                    stack.append((child, highest))
        return good
```

A node is good exactly when its value is at least the largest value on the path above it. That maximum is easy to carry *down* the tree: each child's path maximum is the parent's path maximum, updated with the parent's value. So every node needs only O(1) work, with the state handed to it by its parent.

The explicit stack makes this a depth-first walk without recursion, so a chain of 30,000 nodes is no problem. Each node is visited once: O(n) time and O(h) memory.

## Alternatives

### Recursion with the maximum as a parameter

```python alt time="n" space="h" oracle
class Solution:
    def goodNodes(self, root: TreeNode) -> int:
        def count(node, highest):
            if node is None:
                return 0
            here = 1 if node.val >= highest else 0
            highest = max(highest, node.val)
            return here + count(node.left, highest) + count(node.right, highest)

        return count(root, root.val)
```

The same idea written recursively: the path maximum travels down as an argument, and the counts travel back up as return values. It's the most natural way to write it; the stack version above just avoids deep recursion.

## Wrong answers

### Compares with the parent only

```python wrong fails="example" test="Example 3"
class Solution:
    def goodNodes(self, root: TreeNode) -> int:
        good, stack = 1, [root]
        while stack:
            node = stack.pop()
            for child in (node.left, node.right):
                if child:
                    if child.val >= node.val:  # the whole path matters, not just the parent
                        good += 1
                    stack.append(child)
        return good
```

Being at least as large as your parent isn't enough: an ancestor further up may be larger still. In Example 3, node 3 is larger than its parent 1 but smaller than the root 4.

### Uses a strict comparison

```python wrong fails="example" test="Example 2"
class Solution:
    def goodNodes(self, root: TreeNode) -> int:
        good, stack = 0, [(root, float("-inf"))]
        while stack:
            node, highest = stack.pop()
            if node.val > highest:  # an equal value is still good
                good += 1
            highest = max(highest, node.val)
            for child in (node.left, node.right):
                if child:
                    stack.append((child, highest))
        return good
```

A node is bad only if some node on its path is *greater*. Ties are fine, so the test must be `>=`. With `>`, the three 2s of Example 2 count as one good node.

### Walks back up the path from every node

```python wrong fails="perf"
class Solution:
    def goodNodes(self, root: TreeNode) -> int:
        parent, order, stack = {root: None}, [], [root]
        while stack:
            node = stack.pop()
            order.append(node)
            for child in (node.left, node.right):
                if child:
                    parent[child] = node
                    stack.append(child)
        good = 0
        for node in order:
            up, ok = parent[node], True
            while up:  # rescans the whole path above every node
                if up.val > node.val:
                    ok = False
                    break
                up = parent[up]
            good += ok
        return good
```

Checking each node against its ancestors one by one gives the right count, but the paths overlap and are scanned again and again. On a chain of 30,000 rising values every node scans its whole path: about 450 million steps.
