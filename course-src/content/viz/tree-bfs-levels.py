from collections import deque


class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right


def build(level):
    """A tree from a level-order list with None for missing children."""
    nodes = [None if v is None else TreeNode(v) for v in level]
    kids = iter(nodes[1:])
    for node in nodes:
        if node:
            node.left, node.right = next(kids, None), next(kids, None)
    return nodes[0] if nodes else None


def level_order(level):
    root = build(level)
    out, queue = [], deque([root] if root else [])   # @ The queue starts with the root.
    while queue:                                     # @ {('The queue holds ' + str(len(queue)) + ' node(s): exactly the next level.') if queue else 'The queue is empty: every level is done.'}
        values = []
        for _ in range(len(queue)):
            node = queue.popleft()                   # @ Take {node.val} from the front of the queue.
            values.append(node.val)
            for child in (node.left, node.right):
                if child:
                    queue.append(child)              # @ Its child {child.val} joins the back of the queue.
        out.append(values)                           # @ Level {len(out) - 1} is done: {values}.
    return out                                       # @ All the levels: {out}.
