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


def search_then_insert(level, target):
    root = build(level)
    node, parent, path = root, None, []   # @ Start at the root{', ' + str(root.val) if root else ''}.
    while node:
        path.append(node)
        if target == node.val:
            return "found"                # @ {target} is already in the tree.
        parent = node
        if target < node.val:
            node = node.left              # @ {target} < {parent.val}: everything larger is on the right, so go left.
        else:
            node = node.right             # @ {target} > {parent.val}: everything smaller is on the left, so go right.
    new = TreeNode(target)                # @ The search fell off the tree, so {target} isn't in it. A new node goes exactly where it ended.
    if parent is None:
        root = new
    elif target < parent.val:
        parent.left = new                 # @ {target} becomes the left child of {parent.val}.
    else:
        parent.right = new                # @ {target} becomes the right child of {parent.val}.
    return "inserted"                     # @ Still a BST: at every node, smaller values are on the left and larger ones on the right.
