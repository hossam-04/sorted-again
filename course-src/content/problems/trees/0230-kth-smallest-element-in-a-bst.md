---
id: 230
module: trees
patterns: [in-order traversal, stop early]
signature: "def kthSmallest(self, root: Optional[TreeNode], k: int) -> int"
no_slow_wrong: collecting every value and sorting is only a log factor slower, which still passes; there is no natural approach that is too slow
---

## Task

You get the root of a binary search tree with `n` nodes and an integer `k` between 1 and `n`. Return the `k`-th smallest value in the tree, counting from 1.

## Constraints

- `1 <= k <= n <= 100_000`
- `0 <= node.val <= 10**6`, all values distinct

```json examples
[
  {"args": [[8, 4, 12, 2, 6, 10, 14], 5], "out": 10, "why": "In increasing order the values are 2, 4, 6, 8, 10, 12, 14; the fifth is 10."},
  {"args": [[8, 4, 12, 2, 6, 10, 14], 1], "out": 2, "why": "The smallest value is the leftmost node."},
  {"args": [[3, 1, null, null, 2], 3], "out": 3, "why": "The values in order are 1, 2, 3."}
]
```

```json edge
[
  {"name": "one node", "args": [[5], 1], "out": 5},
  {"name": "k is the largest", "args": [[8, 4, 12, 2, 6, 10, 14], 7], "out": 14},
  {"name": "right chain", "args": [[1, null, 2, null, 3, null, 4], 3], "out": 3},
  {"name": "left chain", "args": [[4, 3, null, 2, null, 1], 2], "out": 2},
  {"name": "zero and large values", "args": [[5000, 0, 10000], 2], "out": 5000}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 8) if size == "small" else rng.randint(20, 300)
    vals = rng.sample(range(0, 30) if size == "small" else range(0, 10**6), n)
    return [bst_level(vals), rng.randint(1, n)]


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
    # A random BST of 100,000 values, asking for the middle one.
    vals = rng.sample(range(0, 10**6), 100_000)
    return [bst_level(vals), 50_000]


def bst_level(vals):
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

## Hints

1. An in-order walk (left subtree, node, right subtree) visits a BST's values in increasing order.
2. So the k-th node visited in order is the answer. You don't need to visit the rest.
3. Write the in-order walk with an explicit stack: go left as far as possible, pop a node (that's the next value in order), then continue from its right child.

## Solution

```python solution time="h + k" space="h"
class Solution:
    def kthSmallest(self, root: Optional[TreeNode], k: int) -> int:
        stack, node = [], root
        while True:
            while node:  # the smallest value not yet visited is down the left edge
                stack.append(node)
                node = node.left
            node = stack.pop()  # the next value in increasing order
            k -= 1
            if k == 0:
                return node.val
            node = node.right
```

In a BST, everything in a node's left subtree is smaller and everything in its right subtree is larger, so visiting left subtree, node, right subtree lists the values in increasing order. The stack replaces the recursion: it holds the nodes whose left side is being explored, and popping one means its whole left subtree is done.

The walk stops as soon as it has produced k values. It goes down at most h levels to reach the smallest value and then makes k steps, each with O(1) amortised work: O(h + k) time, O(h) memory.

## Alternatives

### Collect everything in order, then index

```python alt time="n" space="n" oracle
class Solution:
    def kthSmallest(self, root: Optional[TreeNode], k: int) -> int:
        vals = []

        def inorder(node):
            if node:
                inorder(node.left)
                vals.append(node.val)
                inorder(node.right)

        inorder(root)
        return vals[k - 1]
```

The simplest correct version: build the whole sorted list and pick element k − 1. It always does O(n) work even when k is 1, but for one query that's perfectly acceptable. (Sorting the values instead of walking in order would also work, in O(n log n).)

## Wrong answers

### Indexes from 0

```python wrong fails="example" test="Example 1"
class Solution:
    def kthSmallest(self, root: Optional[TreeNode], k: int) -> int:
        vals = []

        def inorder(node):
            if node:
                inorder(node.left)
                vals.append(node.val)
                inorder(node.right)

        inorder(root)
        return vals[k]  # k counts from 1
```

`k` counts from 1, Python lists from 0. `vals[k]` returns the (k + 1)-th smallest value, and for k = n it raises `IndexError`.

### Visits the node before its left subtree

```python wrong fails="example" test="Example 1"
class Solution:
    def kthSmallest(self, root: Optional[TreeNode], k: int) -> int:
        vals = []

        def walk(node):
            if node:
                vals.append(node.val)  # pre-order: not sorted
                walk(node.left)
                walk(node.right)

        walk(root)
        return vals[k - 1]
```

Only the in-order walk lists a BST's values in sorted order. Pre-order puts each node before its left subtree, so the list starts with the root, which is usually not the smallest value.

## Notes

A common follow-up: what if the tree changes often and you're asked for the k-th smallest many times? Store in every node the size of its subtree. Then you can walk down from the root and decide at each node whether the answer is on the left, here, or on the right, in O(h) per query.
