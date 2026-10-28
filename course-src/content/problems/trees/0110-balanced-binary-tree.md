---
id: 110
module: trees
patterns: [post-order, height or a failure marker]
signature: "def isBalanced(self, root: Optional[TreeNode]) -> bool"
no_slow_wrong: the top-down check is O(n log n) on balanced trees and stops early on unbalanced ones, so no natural approach is too slow
---

## Task

You get the root of a binary tree. It is *height-balanced* if, at **every** node, the heights of the left and right subtrees differ by at most 1. Return `True` if the tree is height-balanced and `False` otherwise. An empty tree is balanced.

Height here is the number of nodes on the longest downward path; an empty subtree has height 0.

## Constraints

- The tree has between `0` and `150_000` nodes
- `-10**4 <= node.val <= 10**4`

```json examples
[
  {"args": [[1, 2, 3, 4, null, null, 5]], "out": true, "why": "Each subtree's two sides differ by at most one level, at every node."},
  {"args": [[1, 2, null, 3]], "out": false, "why": "At the root, the left side is 2 levels deep and the right side is empty."},
  {"args": [[]], "out": true, "why": "An empty tree has nothing out of balance."}
]
```

```json edge
[
  {"name": "one node", "args": [[4]], "out": true},
  {"name": "two nodes", "args": [[4, 5]], "out": true},
  {"name": "full tree", "args": [[1, 2, 3, 4, 5, 6, 7]], "out": true},
  {"name": "balanced at the root only", "args": [[1, 2, 3, 4, null, 5, 6, 7]], "out": false},
  {"name": "a chain of three", "args": [[1, null, 2, null, 3]], "out": false},
  {"name": "heights differ by exactly one everywhere", "args": [[1, 2, 3, 4, 5, 6, null, 7]], "out": true}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(0, 8) if size == "small" else rng.randint(20, 120)
    if size == "medium" and rng.random() < 0.5:
        return [[rng.randint(-100, 100) for _ in range(n)]]  # a complete tree: balanced
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
    # A complete tree of 131,071 nodes: balanced, so every node has to be checked.
    return [[rng.randint(-10**4, 10**4) for _ in range(2**17 - 1)]]
```

## Hints

1. "Balanced at every node" means you need the height of every subtree. Computing heights separately at each node repeats a lot of work.
2. Compute heights bottom-up, once each, and check the balance at each node as you go.
3. When a subtree turns out to be unbalanced, the whole tree is. Return a special value (like -1) instead of a height to pass that news up.

## Solution

```python solution time="n" space="h"
class Solution:
    def isBalanced(self, root: Optional[TreeNode]) -> bool:
        def height(node):  # the height, or -1 if this subtree is unbalanced somewhere
            if node is None:
                return 0
            left = height(node.left)
            if left < 0:
                return -1
            right = height(node.right)
            if right < 0 or abs(left - right) > 1:
                return -1
            return 1 + max(left, right)

        return height(root) >= 0
```

The walk is post-order: a node can only judge its own balance after both subtrees have reported their heights. Each call returns its height when its subtree is balanced, and -1 as soon as anything below it isn't; -1 can't be a real height, so it works as a signal that travels straight up and stops further work.

Every node is visited at most once: O(n) time and O(h) stack. Checking only the root's two heights is the classic mistake, since an imbalance deep in the tree can hide under a root whose sides have similar heights.

## Alternatives

### Compare heights at every node, top-down

```python alt time="n log n" space="h" oracle
class Solution:
    def isBalanced(self, root: Optional[TreeNode]) -> bool:
        def height(node):
            return 0 if node is None else 1 + max(height(node.left), height(node.right))

        if root is None:
            return True
        return (abs(height(root.left) - height(root.right)) <= 1
                and self.isBalanced(root.left) and self.isBalanced(root.right))
```

The definition, directly: check this node, then check both children. Heights get recomputed by every ancestor, but in a balanced tree there are only O(log n) ancestors, so it costs O(n log n). In an unbalanced tree it returns `False` early. It passes comfortably here, and it's a fine first answer before you optimise.

## Wrong answers

### Checks the root only

```python wrong fails="edge" test="balanced at the root only"
class Solution:
    def isBalanced(self, root: Optional[TreeNode]) -> bool:
        def height(node):
            return 0 if node is None else 1 + max(height(node.left), height(node.right))

        return root is None or abs(height(root.left) - height(root.right)) <= 1  # deeper nodes are never checked
```

Similar heights at the root don't mean every node is balanced. In the failing tree, the root's sides have heights 3 and 2, but node 2 has a left side 2 levels deep and no right side at all.

### Allows no difference at all

```python wrong fails="example" test="Example 1"
class Solution:
    def isBalanced(self, root: Optional[TreeNode]) -> bool:
        def height(node):
            if node is None:
                return 0
            left, right = height(node.left), height(node.right)
            if left < 0 or right < 0 or abs(left - right) >= 1:  # a difference of 1 is allowed
                return -1
            return 1 + max(left, right)

        return height(root) >= 0
```

A difference of exactly 1 is still balanced. With `>= 1`, only perfectly full trees pass, so a node with one leaf child already counts as unbalanced.
