---
id: 98
module: trees
patterns: [pass bounds down, BST invariant]
signature: "def isValidBST(self, root: Optional[TreeNode]) -> bool"
---

## Task

You get the root of a non-empty binary tree. Return `True` if it is a valid binary search tree, and `False` otherwise.

A valid binary search tree satisfies, at **every** node: all values in the left subtree are strictly smaller than the node's value, and all values in the right subtree are strictly larger. (So no value may appear twice.)

## Constraints

- The tree has between `1` and `30_000` nodes
- `-2**31 <= node.val <= 2**31 - 1`

```json examples
[
  {"args": [[10, 5, 15, 3, 7, 12, 20]], "out": true, "why": "Every left subtree holds smaller values and every right subtree larger ones."},
  {"args": [[10, 5, 15, 3, 12]], "out": false, "why": "12 is a fine right child of 5, but it sits in 10's left subtree and is larger than 10."},
  {"args": [[7, 7]], "out": false, "why": "The left subtree must be strictly smaller, so a repeated value isn't allowed."}
]
```

```json edge
[
  {"name": "one node", "args": [[0]], "out": true},
  {"name": "extreme values", "args": [[-2147483648, null, 2147483647]], "out": true},
  {"name": "increasing chain", "args": [[1, null, 2, null, 3]], "out": true},
  {"name": "right subtree too small", "args": [[10, 5, 15, null, null, 6, 20]], "out": false},
  {"name": "equal value on the right", "args": [[3, null, 3]], "out": false},
  {"name": "negative values", "args": [[-5, -10, 0]], "out": true}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 8) if size == "small" else rng.randint(20, 300)
    vals = rng.sample(range(-20, 21) if size == "small" else range(-10**6, 10**6), n)
    level = bst_level(vals)
    if rng.random() < 0.5:  # break it: change one value
        k = rng.choice([i for i, v in enumerate(level) if v is not None])
        level[k] = rng.choice(vals) if rng.random() < 0.3 else level[k] + rng.randint(-30, 30)
    return [level]


def bst_level(vals):
    """Insert vals into a BST in this order and write it level by level."""
    kids = {vals[0]: [None, None]}
    for v in vals[1:]:
        cur = vals[0]
        while True:
            side = 0 if v < cur else 1
            if kids[cur][side] is None:
                kids[cur][side] = v
                kids[v] = [None, None]
                break
            cur = kids[cur][side]
    out, queue, head = [], [vals[0]], 0
    while head < len(queue):
        v = queue[head]
        head += 1
        if v is None:
            out.append(None)
        else:
            out.append(v)
            queue += kids[v]
    while out[-1] is None:
        out.pop()
    return out
```

```python perf
def perf(rng):
    # A valid BST that is a chain of 30,000 increasing values: every node has to be checked.
    level, v = [], -10**9
    for _ in range(30_000):
        v += rng.randint(1, 1000)
        level += [v, None]
    return [level[:-1]]
```

## Hints

1. Checking each node against its children isn't enough: a node deep in the left subtree must also be smaller than every ancestor it sits to the left of.
2. Every node has an allowed range of values, set by its ancestors. The root's range is unbounded.
3. Going left from a node with value v, the upper bound becomes v; going right, the lower bound becomes v. Check each node against its range.

## Solution

```python solution time="n" space="h"
class Solution:
    def isValidBST(self, root: Optional[TreeNode]) -> bool:
        stack = [(root, -inf, inf)]  # node, and the open interval its value must lie in
        while stack:
            node, low, high = stack.pop()
            if node is None:
                continue
            if not low < node.val < high:
                return False
            stack.append((node.left, low, node.val))   # everything on the left: below this value
            stack.append((node.right, node.val, high))  # everything on the right: above it
        return True
```

The BST rule is about whole subtrees, so every node inherits constraints from all of its ancestors. They combine into a single open interval: going left from a node narrows the upper bound to that node's value, going right narrows the lower bound. The tree is valid exactly when every node lies strictly inside its interval.

The bounds start at −∞ and +∞ (`math.inf`, available here as `inf`), so the extreme values ±2³¹ are handled without special cases. Each node is checked once: O(n) time, O(h) memory for the stack.

## Alternatives

### In-order values must strictly increase

```python alt time="n" space="h" oracle
class Solution:
    def isValidBST(self, root: Optional[TreeNode]) -> bool:
        prev, stack, node = -inf, [], root
        while stack or node:
            while node:  # go as far left as possible
                stack.append(node)
                node = node.left
            node = stack.pop()
            if node.val <= prev:  # in-order must be strictly increasing
                return False
            prev, node = node.val, node.right
        return True
```

An in-order walk (left subtree, node, right subtree) visits a valid BST's values in increasing order, and only a valid BST does that. So walk in order and check each value against the previous one. It's a neat equivalent condition, and the iterative in-order walk is worth knowing on its own.

## Wrong answers

### Compares each node with its children only

```python wrong fails="example" test="Example 2"
class Solution:
    def isValidBST(self, root: Optional[TreeNode]) -> bool:
        if root is None:
            return True
        if root.left and root.left.val >= root.val:
            return False
        if root.right and root.right.val <= root.val:  # only the parent is checked, not the ancestors
            return False
        return self.isValidBST(root.left) and self.isValidBST(root.right)
```

Every parent-child pair can be in order while the tree as a whole isn't. In Example 2, 12 is a valid right child of 5, but it's inside 10's left subtree and larger than 10. The constraints from all ancestors have to be passed down.

### Uses the 32-bit limits as the starting bounds

```python wrong fails="edge" test="extreme values"
class Solution:
    def isValidBST(self, root: Optional[TreeNode]) -> bool:
        def ok(node, low, high):
            if node is None:
                return True
            if not low < node.val < high:  # -2**31 itself is not inside (-2**31, ...)
                return False
            return ok(node.left, low, node.val) and ok(node.right, node.val, high)

        return ok(root, -2**31, 2**31 - 1)
```

The bounds are open intervals, so a starting bound of −2³¹ rejects a node whose value *is* −2³¹, even though that's allowed. Use infinities (or `None` for "no bound") so every legal value fits.

### Checks every node against its whole subtrees

```python wrong fails="perf"
class Solution:
    def isValidBST(self, root: Optional[TreeNode]) -> bool:
        def values(node):
            out, stack = [], [node]
            while stack:
                n = stack.pop()
                if n:
                    out.append(n.val)
                    stack += [n.left, n.right]
            return out

        stack = [root]
        while stack:
            node = stack.pop()
            if node is None:
                continue
            if node.left and max(values(node.left)) >= node.val:  # walks the whole subtree again
                return False
            if node.right and min(values(node.right)) <= node.val:
                return False
            stack += [node.left, node.right]
        return True
```

Comparing each node with the largest value on its left and the smallest on its right is exactly the definition, so the answers are right. But collecting a whole subtree at every node repeats the same work: on a chain of 30,000 nodes, about 450 million steps.
