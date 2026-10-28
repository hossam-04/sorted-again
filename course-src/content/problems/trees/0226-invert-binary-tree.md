---
id: 226
module: trees
patterns: [recursive DFS, swap children]
signature: "def invertTree(self, root: Optional[TreeNode]) -> Optional[TreeNode]"
no_slow_wrong: every reasonable approach visits each node once; there is no natural slower way to mirror a tree
---

## Task

You get the root of a binary tree (or `None` for an empty tree). Turn the tree into its mirror image: at every node, the left subtree and the right subtree trade places. Return the root.

Tests write a tree as a list in *level order*: the root, then each level from left to right, with `null` for a missing child. Trailing `null`s are left out, so `[1, 2]` is a root 1 with a left child 2.

## Constraints

- The tree has between `0` and `150_000` nodes
- `-100 <= node.val <= 100`

```json examples
[
  {"args": [[5, 3, 8, 1, 4, 7, 9]], "out": [5, 8, 3, 9, 7, 4, 1], "why": "Every level reads right to left now: 3 and 8 swap, and so do the grandchildren."},
  {"args": [[6, 2]], "out": [6, null, 2], "why": "A left child becomes a right child."},
  {"args": [[1, 2, null, 3]], "out": [1, null, 2, null, 3], "why": "A chain leaning left becomes a chain leaning right."}
]
```

```json edge
[
  {"name": "empty tree", "args": [[]], "out": []},
  {"name": "one node", "args": [[7]], "out": [7]},
  {"name": "right chain", "args": [[1, null, 2, null, 3]], "out": [1, 2, null, 3]},
  {"name": "negative values", "args": [[-1, -2, -3, -4]], "out": [-1, -3, -2, null, null, null, -4]},
  {"name": "uneven tree", "args": [[10, 5, 20, null, 7, 15]], "out": [10, 20, 5, null, 15, 7]}
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
    # A complete tree of 131,071 nodes (17 levels).
    return [[rng.randint(-100, 100) for _ in range(2**17 - 1)]]
```

## Hints

1. The mirror of a tree is: the same root, with the mirror of the right subtree on the left and the mirror of the left subtree on the right.
2. That's already a recursive definition. The base case is the empty tree, which is its own mirror.
3. Mirror both subtrees first (or swap first and then recurse; both work), but make sure you don't use a child after you've overwritten it.

## Solution

```python solution time="n" space="h"
class Solution:
    def invertTree(self, root: Optional[TreeNode]) -> Optional[TreeNode]:
        if root is None:
            return None
        root.left, root.right = self.invertTree(root.right), self.invertTree(root.left)
        return root
```

The mirror of a tree swaps its two subtrees and mirrors each of them. The tuple assignment evaluates both recursive calls *before* assigning anything, so `root.left` is still the original left subtree when it's passed to the second call. Empty subtrees return `None`, which ends the recursion.

Each node is visited once: O(n) time. The recursion is as deep as the tree is tall, h, so the stack uses O(h) space: O(log n) for a balanced tree, O(n) for a chain.

## Alternatives

### Breadth-first with a queue

```python alt time="n" space="w" oracle
class Solution:
    def invertTree(self, root: Optional[TreeNode]) -> Optional[TreeNode]:
        queue = deque([root] if root else [])
        while queue:
            node = queue.popleft()
            node.left, node.right = node.right, node.left  # order of visits doesn't matter
            for child in (node.left, node.right):
                if child:
                    queue.append(child)
        return root
```

Every node's children must be swapped, and it doesn't matter in which order the nodes are visited. A queue visits them level by level without any recursion, so a very deep tree can't overflow the stack. The queue holds at most one level, w nodes.

## Wrong answers

### Swaps the root's children only

```python wrong fails="example" test="Example 1"
class Solution:
    def invertTree(self, root: Optional[TreeNode]) -> Optional[TreeNode]:
        if root:
            root.left, root.right = root.right, root.left  # the subtrees themselves stay unmirrored
        return root
```

Swapping the root's two children moves whole subtrees to the other side, but inside them nothing changes, so the lower levels still read left to right. Every node needs the swap.

### Overwrites the left child before using it

```python wrong fails="example" test="Example 1"
class Solution:
    def invertTree(self, root: Optional[TreeNode]) -> Optional[TreeNode]:
        if root is None:
            return None
        root.left = self.invertTree(root.right)
        root.right = self.invertTree(root.left)  # root.left was just replaced
        return root
```

After the first line, `root.left` already holds the mirrored right subtree, so the second line mirrors that again instead of the original left subtree. The original left subtree is lost. Evaluate both calls before assigning, as the tuple assignment does, or save one child in a variable first.
