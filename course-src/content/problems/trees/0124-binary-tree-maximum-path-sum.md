---
id: 124
module: trees
patterns: [post-order, best downward gain plus a running best]
signature: "def maxPathSum(self, root: Optional[TreeNode]) -> int"
no_slow_wrong: the natural slower approach, recomputing the gains at every node, is shown as a slow alternative
---

## Task

You get the root of a non-empty binary tree whose values may be negative. A *path* is a sequence of nodes where each consecutive pair is joined by an edge, and no node appears twice. It can start and end anywhere; it needn't pass through the root, but it must contain at least one node.

Return the largest possible sum of the values on a path.

## Constraints

- The tree has between `1` and `30_000` nodes
- `-1000 <= node.val <= 1000`

```json examples
[
  {"args": [[5, 4, 8, 11, null, 13, 4]], "out": 41, "why": "The path 11 → 4 → 5 → 8 → 13 adds up to 41."},
  {"args": [[-3]], "out": -3, "why": "A path needs at least one node, so the answer can be negative."},
  {"args": [[2, -1, -2]], "out": 2, "why": "Adding either child only lowers the sum, so the best path is the root alone."}
]
```

```json edge
[
  {"name": "all negative", "args": [[-5, -2, -7]], "out": -2},
  {"name": "best path avoids the root", "args": [[-10, 2, -20, 8, 9]], "out": 19},
  {"name": "a chain", "args": [[1, null, 2, null, 3]], "out": 6},
  {"name": "zeros", "args": [[0, 0, 0]], "out": 0},
  {"name": "one big negative in the middle", "args": [[10, -100, 10, 5, 5]], "out": 20}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 8) if size == "small" else rng.randint(20, 300)
    hi = 10 if size == "small" else 1000
    return [tree_level(rng, [rng.randint(-hi, hi) for _ in range(n)])]


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
    # A chain of 20,000 nodes with mixed signs.
    level = []
    for _ in range(20_000):
        level += [rng.randint(-1000, 1000), None]
    return [level[:-1]]
```

## Hints

1. Every path has one highest node. From there, it goes down at most one branch on each side.
2. For each node, compute its *gain*: the best sum of a path that starts at this node and goes straight down. A branch with a negative gain is better left out (count it as 0).
3. Walk post-order. At each node, the best path that turns there is `value + left gain + right gain`; update a running best with it, and return `value + max(left gain, right gain)` to the parent.

## Solution

```python solution time="n" space="h"
class Solution:
    def maxPathSum(self, root: Optional[TreeNode]) -> int:
        best = -inf

        def gain(node):  # best sum of a path going down from node (it may stop right at node)
            nonlocal best
            if node is None:
                return 0
            left = max(gain(node.left), 0)   # a negative branch is better skipped
            right = max(gain(node.right), 0)
            best = max(best, node.val + left + right)  # the best path that turns at this node
            return node.val + max(left, right)  # a path continuing up can use only one side

        gain(root)
        return best
```

Every path has a single highest node, where it comes up one branch and goes down the other. So the best path overall is the best, over all nodes, of "node value plus the best downward path on the left plus the best on the right". A downward path with a negative sum only hurts, so it's replaced by 0, which means stopping at the node.

The function returns only *one* side to its parent, because a path that continues upward through the parent can't use both of this node's branches. `best` starts at −∞, not 0, since the answer may be negative when every value is. One post-order walk: O(n) time and O(h) stack.

## Alternatives

### Recompute the best downward path at every node

```python alt time="n²" space="h" slow oracle
class Solution:
    def maxPathSum(self, root: Optional[TreeNode]) -> int:
        def down(node):  # best sum of a path going straight down from node
            if node is None:
                return 0
            return node.val + max(0, down(node.left), down(node.right))

        best, stack = -inf, [root]
        while stack:
            node = stack.pop()
            best = max(best, node.val + max(0, down(node.left)) + max(0, down(node.right)))
            stack += [c for c in (node.left, node.right) if c]
        return best
```

The same formula, top-down: at every node, compute the two downward gains from scratch. It's correct, but each gain is recomputed by every ancestor, which is O(n²) on a long chain.

## Wrong answers

### Starts the best at 0

```python wrong fails="example" test="Example 2"
class Solution:
    def maxPathSum(self, root: Optional[TreeNode]) -> int:
        best = 0  # an empty path isn't allowed

        def gain(node):
            nonlocal best
            if node is None:
                return 0
            left = max(gain(node.left), 0)
            right = max(gain(node.right), 0)
            best = max(best, node.val + left + right)
            return node.val + max(left, right)

        gain(root)
        return best
```

Starting at 0 quietly allows an empty path. When every value is negative, no real path reaches 0, so the function returns 0 instead of the largest single value. Start at −∞, or at the root's value.

### Keeps negative branches

```python wrong fails="example" test="Example 3"
class Solution:
    def maxPathSum(self, root: Optional[TreeNode]) -> int:
        best = -inf

        def gain(node):
            nonlocal best
            if node is None:
                return 0
            left, right = gain(node.left), gain(node.right)  # may be negative
            best = max(best, node.val + left + right)
            return node.val + max(left, right)

        gain(root)
        return best
```

A path may stop at any node, so a branch whose best sum is negative should be dropped. Here both branches are always added, so in Example 3 the path through the root is forced to include −1 and −2.
