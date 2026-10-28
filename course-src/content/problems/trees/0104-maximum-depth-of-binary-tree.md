---
id: 104
module: trees
patterns: [post-order, return height upward]
signature: "def maxDepth(self, root: Optional[TreeNode]) -> int"
no_slow_wrong: every reasonable approach visits each node once; there is no natural slower way to measure depth
---

## Task

You get the root of a binary tree. Return its depth: the number of nodes on the longest path from the root down to a leaf. An empty tree has depth 0, and a single node has depth 1.

Tests write the tree in level order, with `null` for missing children.

## Constraints

- The tree has between `0` and `50_000` nodes
- `-100 <= node.val <= 100`

```json examples
[
  {"args": [[8, 3, 10, 1, 6, null, 14, null, null, 4, 7, 13]], "out": 4, "why": "Two paths have four nodes, for example 8 → 3 → 6 → 4."},
  {"args": [[2, null, 3, null, 4]], "out": 3, "why": "A chain of three nodes, all to the right."},
  {"args": [[]], "out": 0, "why": "An empty tree has no nodes at all."}
]
```

```json edge
[
  {"name": "one node", "args": [[5]], "out": 1},
  {"name": "left chain", "args": [[1, 2, null, 3, null, 4]], "out": 4},
  {"name": "full tree", "args": [[1, 2, 3, 4, 5, 6, 7]], "out": 3},
  {"name": "deepest leaf on the right", "args": [[1, 2, 3, null, null, null, 4, null, 5]], "out": 4},
  {"name": "zigzag", "args": [[1, 2, null, null, 3, 4]], "out": 4}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(0, 8) if size == "small" else rng.randint(20, 300)
    return [tree_level(rng, [rng.randint(-100, 100) for _ in range(n)])]


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
    # A chain of 50,000 nodes, each the right child of the one before: depth 50,000.
    level = []
    for _ in range(50_000):
        level += [rng.randint(-100, 100), None]
    return [level[:-1]]
```

## Hints

1. The depth of a tree is 1 (for the root) plus the depth of its deeper subtree.
2. That's a recursive definition with an obvious base case: an empty tree has depth 0.
3. Without recursion: count the levels of a breadth-first walk, or keep `(node, depth)` pairs on a stack.

## Solution

```python solution time="n" space="h"
class Solution:
    def maxDepth(self, root: Optional[TreeNode]) -> int:
        if root is None:
            return 0
        return 1 + max(self.maxDepth(root.left), self.maxDepth(root.right))
```

A tree's longest root-to-leaf path goes through the root and then down whichever subtree is deeper, so its depth is one more than the larger of the two subtree depths. Each call answers that question for its own subtree and passes the answer up: the post-order "return information upward" pattern.

Every node is visited once: O(n) time. The recursion goes as deep as the tree, h, so it uses O(h) stack: 50,000 frames for the chain in the performance test, which is fine here (this page allows 100,000) but past a default Python's limit of 1,000.

## Alternatives

### Count levels breadth-first

```python alt time="n" space="w" oracle
class Solution:
    def maxDepth(self, root: Optional[TreeNode]) -> int:
        depth, level = 0, [root] if root else []
        while level:
            depth += 1
            level = [child for node in level for child in (node.left, node.right) if child]
        return depth
```

Walk the tree one level at a time and count the levels. It never recurses, so any shape of tree is safe, and the memory is one level, w nodes.

### Depth-first with an explicit stack

```python alt time="n" space="h"
class Solution:
    def maxDepth(self, root: Optional[TreeNode]) -> int:
        best, stack = 0, [(root, 1)] if root else []
        while stack:
            node, depth = stack.pop()
            best = max(best, depth)
            for child in (node.left, node.right):
                if child:
                    stack.append((child, depth + 1))
        return best
```

The recursion's information, which node and how deep, carried on a stack you manage yourself. This is how to convert any recursive tree walk when the depth might be too large for the call stack.

## Wrong answers

### Counts edges instead of nodes

```python wrong fails="example" test="Example 1"
class Solution:
    def maxDepth(self, root: Optional[TreeNode]) -> int:
        if root is None:
            return 0
        if root.left is None and root.right is None:
            return 0  # a leaf should count as 1
        return 1 + max(self.maxDepth(root.left), self.maxDepth(root.right))
```

Depth here counts nodes, so a single node has depth 1. Returning 0 for a leaf counts edges instead, and every answer comes out one too small. Some problems do define depth in edges, so read the definition each time.

### Follows the left children only

```python wrong fails="example" test="Example 1"
class Solution:
    def maxDepth(self, root: Optional[TreeNode]) -> int:
        depth = 0
        while root:
            depth += 1
            root = root.left  # the deepest leaf may be anywhere
        return depth
```

Walking down the left edge measures one path, not the longest one. In Example 1 the left edge 8 → 3 → 1 has three nodes, but the deepest leaves are elsewhere. Every subtree has to be considered.
