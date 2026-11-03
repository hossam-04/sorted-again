---
id: trees
title: Trees and binary search trees
kicker: DFS orders · BFS levels · information up and down · the BST invariant
summary: "A binary tree is a recursive structure, so most tree problems are a short recursive function plus one decision: what to pass down to the children, and what to return up to the parent. Binary search trees add an ordering that turns searches into a single walk from the root."
---

## The vocabulary

A **binary tree** is either empty or a node holding a value and two subtrees, *left* and *right*, which are binary trees themselves. LeetCode-style problems give you the root:

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
```

A node without children is a **leaf**. A node's **depth** is how many steps it is from the root; a tree's **height** is the number of nodes on its longest root-to-leaf path. A tree with n nodes can be as short as about log₂ n levels (balanced) or as tall as n (a chain), and that difference decides how deep recursion goes.

Tests in this course, like LeetCode's, write a tree as a **level-order list**: the root, then each level left to right, with `null` for a missing child. `[1, 2, 3, null, 4]` is a root 1 with children 2 and 3, where 2 has no left child and a right child 4.

## Depth-first: three orders

The definition is recursive, so the natural walk is too: visit the node, its left subtree and its right subtree. The three classic orders differ only in *when* the node itself is handled:

- **pre-order**: node, left, right (copying a tree, serialising it);
- **in-order**: left, node, right (a BST's values in sorted order);
- **post-order**: left, right, node (anything that needs the children's answers first).

:::viz tree-dfs-orders
:::

Use "Edit input" to switch `order` to `pre` or `post` and watch the output change while the walk itself stays the same.

:::gotcha None children
Every leaf has two `None` children, and every recursive tree function receives them. Make the empty tree a base case (`if node is None: return ...`) before touching `node.val`. Most tree bugs are a missing `None` check, which shows up as `AttributeError: 'NoneType' object has no attribute 'val'`.
:::

The same walk without recursion keeps the pending nodes on an explicit stack. Push the right child before the left one so the left is visited first:

```python run title=Pre-order_with_an_explicit_stack
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

root = TreeNode(8, TreeNode(4, TreeNode(2), TreeNode(6)), TreeNode(12, None, TreeNode(14)))

def preorder(root):
    out, stack = [], [root] if root else []
    while stack:
        node = stack.pop()
        out.append(node.val)
        for child in (node.right, node.left):  # right first, so left comes off the stack first
            if child:
                stack.append(child)
    return out

print(preorder(root))
```

:::gotcha Recursion depth on skewed trees
A recursive walk is as deep as the tree is tall. A balanced tree of a million nodes is about 20 levels deep, but a chain of 50,000 nodes needs 50,000 nested calls: fine on this page (100,000 allowed) and on LeetCode, but past a plain Python's 1,000. When inputs can be skewed, use an explicit stack or a queue.
:::

## Breadth-first: level by level

A **queue** visits nodes in order of their distance from the root. To keep levels apart, process the queue in rounds: at the start of a round it holds exactly one level ([[p:102]]).

:::viz tree-bfs-levels
:::

Many problems are this walk with a small twist: the last node of each level is what you see from the right ([[p:199]]), the number of rounds is the depth ([[p:104]]), and the first leaf you meet is the closest one.

## Information that flows up

Post-order functions compute something for each subtree and **return it to the parent**. Height is the basic example: 1 + the larger child height. Many harder problems are height plus one extra thing tracked on the side:

- [[p:543]] is the longest path between two nodes. At each node, the longest path that turns there is `height(left) + height(right)`, so keep a running best while returning heights.
- [[p:110]] needs every node's two heights to differ by at most 1: return the height, or −1 to signal "already unbalanced".
- [[p:124]] is the same shape as the diameter, with sums instead of counts and negative branches dropped.

```python run title=Height_and_diameter_in_one_walk
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def height_and_diameter(root):
    best = 0
    def height(node):
        nonlocal best
        if node is None:
            return 0
        left, right = height(node.left), height(node.right)
        best = max(best, left + right)  # the longest path that turns at this node
        return 1 + max(left, right)     # what the parent needs
    return height(root), best

root = TreeNode(1, TreeNode(2, TreeNode(3, TreeNode(5)), TreeNode(4, None, TreeNode(6))))
print(height_and_diameter(root))  # the longest path, 5-3-2-4-6, doesn't use the root
```

The pattern to remember: **return what the parent needs, and record what the whole problem needs**. They're often different, and mixing them up is the usual bug.

[[p:226]] and [[p:100]] are the simplest instances: mirror both subtrees and swap them; two trees are the same when their roots match and both pairs of subtrees are the same.

## Information that flows down

Sometimes a node's answer depends on its *ancestors*. Then pass that context down as an argument. [[p:1448]] carries "the largest value on the path so far" to each child; a node is good if it's at least that large.

## Binary search trees

A **binary search tree** keeps an ordering: at every node, everything in the left subtree is smaller and everything in the right subtree is larger. That makes each comparison discard a whole subtree, just like binary search discards half an array:

:::viz bst-search-insert
:::

Search, insert and delete walk one path, so they cost O(h): O(log n) when the tree is balanced, O(n) when it degenerates into a chain (which is why real libraries use self-balancing trees such as red-black or AVL trees).

Three facts power most BST problems:

1. **In-order is sorted.** An in-order walk lists the values in increasing order. [[p:230]] stops after the k-th value.
2. **Comparisons tell you which side.** [[p:235]] walks down from the root while both nodes are on the same side; the first node where they split is the answer.
3. **Every node has a range.** Going left lowers the upper bound to the parent's value; going right raises the lower bound. [[p:98]] checks every node against its range.

:::gotcha Comparing only with the parent
`node.left.val < node.val < node.right.val` at every node is *not* enough. A node deep in the left subtree must be smaller than every ancestor it sits to the left of, not just its parent. Pass down the allowed range (starting from −∞ and +∞) or check that the in-order walk is strictly increasing.
:::

```python run title=Validating_with_bounds_vs_parents
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def parents_only(node):
    if node is None:
        return True
    if node.left and node.left.val >= node.val or node.right and node.right.val <= node.val:
        return False
    return parents_only(node.left) and parents_only(node.right)

def with_bounds(node, low=float("-inf"), high=float("inf")):
    if node is None:
        return True
    return low < node.val < high and with_bounds(node.left, low, node.val) and with_bounds(node.right, node.val, high)

tricky = TreeNode(10, TreeNode(5, None, TreeNode(12)), TreeNode(15))  # 12 is in 10's left subtree
print("parents only:", parents_only(tricky))
print("with bounds: ", with_bounds(tricky))
```

## Building and storing trees

A single traversal doesn't determine a tree, but two do. [[p:105]] rebuilds a tree from its pre-order and in-order lists: the first pre-order value is the root, and its position in the in-order list splits the rest into the left and right subtrees.

To store a tree as text ([[p:297]]), write it in pre-order with a marker for every missing child. With the markers, the string determines the tree completely, and rebuilding reads the tokens back in the same order. The same encoding answers [[p:572]]: one tree is a subtree of another exactly when its encoding appears inside the other's.

```python run title=A_round_trip_through_a_string
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def serialize(node):
    return "#" if node is None else f"{node.val},{serialize(node.left)},{serialize(node.right)}"

def deserialize(text):
    tokens = iter(text.split(","))
    def build():
        token = next(tokens)
        if token == "#":
            return None
        return TreeNode(int(token), build(), build())  # left subtree first, as written
    return build()

root = TreeNode(1, TreeNode(2), TreeNode(3, TreeNode(4)))
text = serialize(root)
print(text)
print(serialize(deserialize(text)) == text)
```

## Complexity

| Task | Time | Extra space |
|---|---|---|
| Any full traversal (DFS or BFS) | `O(n)` | `O(h)` for DFS, `O(w)` for BFS |
| Height, diameter, balance, max path sum | `O(n)` | `O(h)` |
| Search, insert, delete in a BST | `O(h)`: `O(log n)` balanced, `O(n)` worst | `O(1)` iterative |
| k-th smallest in a BST | `O(h + k)` | `O(h)` |
| Rebuild from pre-order and in-order | `O(n)` with an index map | `O(n)` |
| Serialize and deserialize | `O(n)` | `O(n)` |

Here h is the height and w the largest number of nodes on one level.

:::interview
For each tree question, say what your recursive function returns for a subtree ("the height", "the best path that ends at this node going down") and what you track globally. Mention the base case for `None`, and the depth concern for skewed inputs. For BST questions, say which invariant you rely on: "in-order is sorted" or "each node has a valid range".
:::

:::work
Trees are everywhere: file systems, the DOM of every web page, JSON and XML documents, ASTs in compilers and linters, and indexes in databases (B-trees, a wide cousin of BSTs). The DFS and BFS patterns here are what you'd write to search a directory tree, render a nested menu, or find the depth of a comment thread.
:::

## Quick check

:::quiz
? Which traversal lists a binary search tree's values in increasing order?
- [ ] Pre-order
- [x] In-order
- [ ] Post-order
> In-order visits the left subtree (all smaller), then the node, then the right subtree (all larger), so it produces the values in sorted order.

? Why is post-order the natural choice for computing a tree's height?
- [x] A node's height depends on its children's heights, which post-order computes first
- [ ] Post-order uses less memory
- [ ] Pre-order can't visit every node
> Post-order handles both subtrees before the node itself, so the children's answers are ready when the node needs them.

? In a breadth-first walk, how do you know where one level ends?
- [ ] Count the nodes until the next None
- [x] At the start of each round, the queue holds exactly one level; process `len(queue)` nodes
- [ ] Compare depths with the previous node
> Each round removes the current level and adds the next one. Freezing the count at the start of the round separates them.

? The tree 10 → left 5 → right 12 has every parent and child in BST order. Is it a valid BST?
- [ ] Yes
- [x] No, because 12 is in 10's left subtree but larger than 10
- [ ] It depends on the right subtree
> The BST rule covers whole subtrees. 12 is fine as 5's right child, but everything left of 10 must be smaller than 10.

? A recursive DFS on a tree of 50,000 nodes. When can it exceed plain Python's default recursion limit of 1,000?
- [ ] Always, because it has 50,000 nodes
- [x] When the tree is tall, for example a chain, since depth equals the tree's height
- [ ] Never, because Python reuses frames
> The recursion depth follows the height, not the node count. A balanced tree of 50,000 nodes is about 16 levels deep; a chain is 50,000.
:::
