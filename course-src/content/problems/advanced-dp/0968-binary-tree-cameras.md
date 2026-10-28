---
id: 968
module: advanced-dp
patterns: [tree DP with three states, greedy from the leaves]
signature: "def minCameraCover(self, root: Optional[TreeNode]) -> int"
perf_repeat: 20
---

## Task

You may install cameras on the nodes of a binary tree. A camera watches its own node, its parent and its children. Return the smallest number of cameras that watch every node.

Tests give the tree in level order; every node's value is 0 and means nothing.

## Constraints

- The tree has between `1` and `1_000` nodes
- Every `node.val` is `0`

```json examples
[
  {"args": [[0, 0, 0]], "out": 1, "why": "One camera on the root watches it and both children."},
  {"args": [[0, 0, null, 0, null, 0]], "out": 2, "why": "A chain of four nodes: one camera watches at most three of them, so two are needed, for example on the second and the fourth."},
  {"args": [[0, 0, 0, 0, 0, 0, 0]], "out": 2, "why": "Cameras on the two middle nodes watch the root above them and all four leaves below."}
]
```

```json edge
[
  {"name": "one node", "args": [[0]], "out": 1},
  {"name": "two nodes", "args": [[0, 0]], "out": 1},
  {"name": "a chain of seven", "args": [[0, 0, null, 0, null, 0, null, 0, null, 0, null, 0]], "out": 3},
  {"name": "a full tree of fifteen", "args": [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], "out": 5},
  {"name": "a long arm and a short one", "args": [[0, 0, 0, 0, null, null, null, 0]], "out": 2}
]
```

```python oracle
class Solution:
    def minCameraCover(self, root: Optional[TreeNode]) -> int:
        nodes, near = [], {}
        stack = [(root, None)]
        while stack:
            node, parent = stack.pop()
            nodes.append(node)
            near[node] = {node} | ({parent} if parent else set())
            if parent:
                near[parent].add(node)
            for child in (node.left, node.right):
                if child:
                    stack.append((child, node))
        for count in range(1, len(nodes) + 1):  # the smallest number of cameras that works
            for chosen in combinations(nodes, count):
                watched = set().union(*(near[c] for c in chosen))
                if len(watched) == len(nodes):
                    return count
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 6) if size == "small" else rng.randint(7, 12)
    kids = {0: [None, None]}
    for v in range(1, n):
        while True:
            p, side = rng.randrange(v), rng.randrange(2)
            if kids[p][side] is None:
                kids[p][side] = v
                kids[v] = [None, None]
                break
    level, queue, head = [], [0], 0
    while head < len(queue):
        v = queue[head]
        head += 1
        level.append(None if v is None else 0)
        if v is not None:
            queue += kids[v]
    while level[-1] is None:
        level.pop()
    return [level]
```

```python perf
def perf(rng):
    # A random tree of 1,000 nodes, solved 20 times.
    kids = {0: [None, None]}
    for v in range(1, 1_000):
        while True:
            p, side = rng.randrange(v), rng.randrange(2)
            if kids[p][side] is None:
                kids[p][side] = v
                kids[v] = [None, None]
                break
    level, queue, head = [], [0], 0
    while head < len(queue):
        v = queue[head]
        head += 1
        level.append(None if v is None else 0)
        if v is not None:
            queue += kids[v]
    while level[-1] is None:
        level.pop()
    return [level]
```

## Hints

1. Decide bottom-up. For a node, what matters to its parent is one of three situations: the node has a camera; it has no camera but a child's camera watches it; or it's not watched yet and needs its parent's camera. Everything below it must be watched in all three.
2. Compute, for each node, the fewest cameras in its subtree for each of the three situations, from its children's three numbers. An empty child counts as watched, with no camera and no cost.
3. A camera at the node lets each child be in any situation. Being watched by a child needs at least one child with a camera, and the others watched. Waiting for the parent needs both children watched without cameras of their own. The root can't wait for a parent.

## Solution

```python solution time="n" space="h"
class Solution:
    def minCameraCover(self, root: Optional[TreeNode]) -> int:
        def visit(node):  # (camera here, watched by a child, waiting for the parent)
            if node is None:
                return inf, 0, inf  # nothing can be installed here, and nothing needs watching
            l_cam, l_watched, l_waiting = visit(node.left)
            r_cam, r_watched, r_waiting = visit(node.right)
            camera = 1 + min(l_cam, l_watched, l_waiting) + min(r_cam, r_watched, r_waiting)
            watched = min(l_cam + min(r_cam, r_watched), r_cam + min(l_cam, l_watched))
            waiting = l_watched + r_watched  # no camera below, but both children watched
            return camera, watched, waiting

        camera, watched, _ = visit(root)
        return min(camera, watched)
```

One decision at a node affects its parent and its children, so the state has to say more than "camera or not": whether the node is already watched matters too. Three numbers per node carry exactly what the parent needs. With a camera here, each child may be in any situation, including waiting, since this camera watches it. Watched by a child means at least one child has a camera, and any child without one must already be watched. Waiting means no camera at the node or its children, with both children watched from below.

An empty child is "watched, at no cost" and can't hold a camera, so leaves come out as 1, impossible, 0. The root has no parent to wait for, so the answer is the smaller of its first two numbers. One post-order pass: O(n).

## Alternatives

### Greedy from the leaves

```python alt time="n" space="h"
class Solution:
    def minCameraCover(self, root: Optional[TreeNode]) -> int:
        cameras = 0

        def state(node):  # 0: needs watching, 1: has a camera, 2: watched without a camera
            nonlocal cameras
            if node is None:
                return 2
            left, right = state(node.left), state(node.right)
            if left == 0 or right == 0:  # a child needs watching: only a camera here can do it
                cameras += 1
                return 1
            if left == 1 or right == 1:
                return 2
            return 0

        root_state = state(root)  # first: state() adds to cameras as it goes
        return cameras + (root_state == 0)  # the root has no parent to put a camera on
```

The well-known greedy: never put a camera on a leaf, because its parent watches everything the leaf would, and more. Working upwards, place a camera exactly when a child still needs watching. Proving it optimal takes an exchange argument; the DP needs none, which is why it's the safer thing to derive in an interview.

## Wrong answers

### Puts a camera on every leaf

```python wrong fails="example" test="Example 1"
class Solution:
    def minCameraCover(self, root: Optional[TreeNode]) -> int:
        leaves, stack = 0, [root]
        while stack:
            node = stack.pop()
            if not node.left and not node.right:
                leaves += 1  # a camera on every leaf
            stack += [c for c in (node.left, node.right) if c]
        return leaves
```

Cameras on the leaves watch the leaves and their parents, but a camera one level up watches the same leaves and more. In Example 1, two leaf cameras do what one root camera does.

### Forgets that the root may still need watching

```python wrong fails="example" test="Example 2"
class Solution:
    def minCameraCover(self, root: Optional[TreeNode]) -> int:
        cameras = 0

        def state(node):
            nonlocal cameras
            if node is None:
                return 2
            left, right = state(node.left), state(node.right)
            if left == 0 or right == 0:
                cameras += 1
                return 1
            if left == 1 or right == 1:
                return 2
            return 0

        state(root)
        return cameras  # the root's own state is ignored
```

The greedy leaves a node unwatched when its children are watched without cameras, trusting its parent to handle it. The root has no parent: in Example 2, the camera on the third node watches everything except the root, and this answers 1 instead of 2.

### Tries every set of cameras

```python wrong fails="perf"
class Solution:
    def minCameraCover(self, root: Optional[TreeNode]) -> int:
        nodes, near = [], {}
        stack = [(root, None)]
        while stack:
            node, parent = stack.pop()
            nodes.append(node)
            near[node] = {node} | ({parent} if parent else set())
            if parent:
                near[parent].add(node)
            for child in (node.left, node.right):
                if child:
                    stack.append((child, node))
        for count in range(1, len(nodes) + 1):  # smallest sets first
            for chosen in combinations(nodes, count):
                if len(set().union(*(near[c] for c in chosen))) == len(nodes):
                    return count
```

Correct, and fine for a dozen nodes. With 1,000 nodes, a few hundred cameras are needed, and the number of sets of that size is astronomical. The DP looks at each node once.
