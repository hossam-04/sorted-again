---
id: 543
module: trees
patterns: [post-order, height plus a running best]
signature: "def diameterOfBinaryTree(self, root: Optional[TreeNode]) -> int"
---

## Task

You get the root of a non-empty binary tree. Return its diameter: the number of **edges** on the longest path between any two nodes. The path may pass through the root or not, and it never visits a node twice.

## Constraints

- The tree has between `1` and `20_000` nodes
- `-100 <= node.val <= 100`

```json examples
[
  {"args": [[10, 4, 15, 2, 6, null, 20]], "out": 4, "why": "The path 2 → 4 → 10 → 15 → 20 has four edges."},
  {"args": [[1, 2, null, 3, 4, 5, null, null, 6]], "out": 4, "why": "The longest path, 5 → 3 → 2 → 4 → 6, doesn't pass through the root."},
  {"args": [[7]], "out": 0, "why": "A single node: the longest path has no edges."}
]
```

```json edge
[
  {"name": "two nodes", "args": [[1, null, 2]], "out": 1},
  {"name": "a chain", "args": [[1, 2, null, 3, null, 4, null, 5]], "out": 4},
  {"name": "full tree", "args": [[1, 2, 3, 4, 5, 6, 7]], "out": 4},
  {"name": "longest path below the root", "args": [[1, 2, 3, 4, 5, null, null, 6, null, null, 7, 8, null, null, 9]], "out": 6},
  {"name": "negative values", "args": [[-1, -2, -3]], "out": 2}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 8) if size == "small" else rng.randint(20, 300)
    return [tree_level(rng, [rng.randint(-100, 100) for _ in range(n)])]


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
    # A chain of 20,000 nodes, each the right child of the one before.
    level = []
    for _ in range(20_000):
        level += [rng.randint(-100, 100), None]
    return [level[:-1]]
```

## Hints

1. Every path has a highest node. At that node, the path goes down into the left subtree and down into the right one.
2. The longest path that turns at X goes as deep as possible on both sides. If height counts the nodes on the deepest downward path, that path has height(X.left) + height(X.right) edges.
3. Compute heights bottom-up in one walk, and at every node update a running best with left height + right height.

## Solution

```python solution time="n" space="h"
class Solution:
    def diameterOfBinaryTree(self, root: Optional[TreeNode]) -> int:
        best = 0

        def height(node):  # nodes on the deepest downward path from node
            nonlocal best
            if node is None:
                return 0
            left, right = height(node.left), height(node.right)
            best = max(best, left + right)  # the longest path whose highest node is this one
            return 1 + max(left, right)

        height(root)
        return best
```

Any path has a single highest node, where it turns from going up to going down. The longest path that turns at a node X goes as deep as possible on both sides, and its number of edges is exactly `height(X.left) + height(X.right)`, where height counts the nodes on the deepest downward path (0 for an empty subtree).

So one post-order walk does everything: each call returns its subtree's height to its parent, and on the way it updates `best` with the path that turns at its own node. The answer is the best over all nodes. Each node is visited once: O(n) time, O(h) stack.

## Alternatives

### Recompute heights at every node

```python alt time="n²" space="h" slow oracle
class Solution:
    def diameterOfBinaryTree(self, root: Optional[TreeNode]) -> int:
        def height(node):
            return 0 if node is None else 1 + max(height(node.left), height(node.right))

        def best(node):
            if node is None:
                return 0
            through = height(node.left) + height(node.right)  # walks both subtrees again
            return max(through, best(node.left), best(node.right))

        return best(root)
```

The same idea written top-down: at each node, measure both subtrees from scratch. It's correct, but every node's height is recomputed by all of its ancestors, which is O(n²) on a long chain.

## Wrong answers

### Only considers paths through the root

```python wrong fails="example" test="Example 2"
class Solution:
    def diameterOfBinaryTree(self, root: Optional[TreeNode]) -> int:
        def height(node):
            return 0 if node is None else 1 + max(height(node.left), height(node.right))

        return height(root.left) + height(root.right)  # the longest path may turn lower down
```

The longest path doesn't have to pass through the root. In Example 2, the root has one short left branch, while the best path turns at node 2. Every node is a possible turning point.

### Counts nodes instead of edges

```python wrong fails="example" test="Example 1"
class Solution:
    def diameterOfBinaryTree(self, root: Optional[TreeNode]) -> int:
        best = 0

        def height(node):
            nonlocal best
            if node is None:
                return 0
            left, right = height(node.left), height(node.right)
            best = max(best, left + right + 1)  # counts the nodes on the path
            return 1 + max(left, right)

        height(root)
        return best
```

A path with k nodes has k − 1 edges, and the task asks for edges. Adding 1 for the turning node counts nodes instead, so every answer is one too big.

### Measures each node's subtrees from scratch

```python wrong fails="perf"
class Solution:
    def diameterOfBinaryTree(self, root: Optional[TreeNode]) -> int:
        def height(node):
            return 0 if node is None else 1 + max(height(node.left), height(node.right))

        best, stack = 0, [root]
        while stack:
            node = stack.pop()
            best = max(best, height(node.left) + height(node.right))  # a full walk below every node
            stack += [c for c in (node.left, node.right) if c]
        return best
```

Checking every node as a turning point is right, but measuring its subtrees with a fresh walk each time repeats the same work over and over. On a chain of 20,000 nodes, the walks add up to 200 million steps. Return heights upward instead, so each is computed once.
