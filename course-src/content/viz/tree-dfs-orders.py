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


def traverse(level, order):
    root = build(level)
    out, path = [], []                       # @ out collects the nodes in {order}-order; path is the chain of calls in progress.

    def visit(node):
        if node is None:
            return                           # @ An empty subtree: nothing to do.
        path.append(node)                    # @ Enter {node.val}. Calls in progress: {[n.val for n in path]}.
        if order == "pre":
            out.append(node)                 # @ Pre-order writes {node.val} before its subtrees.
        visit(node.left)                     # @ Back at {node.val}: its left subtree is finished.
        if order == "in":
            out.append(node)                 # @ In-order writes {node.val} between its subtrees.
        visit(node.right)                    # @ Back at {node.val}: its right subtree is finished.
        if order == "post":
            out.append(node)                 # @ Post-order writes {node.val} after both subtrees.
        path.pop()                           # @ Leave {node.val}.

    visit(root)
    return [n.val for n in out]              # @ {order}-order: {[n.val for n in out]}.
