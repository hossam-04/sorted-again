class Node:
    def __init__(self, val):
        self.val, self.left, self.right = val, None, None


def build(values):  # level order, None for a missing node (untraced)
    if not values or values[0] is None:
        return None
    root = Node(values[0])
    queue, i = [root], 1
    for node in queue:
        for side in ("left", "right"):
            if i < len(values) and values[i] is not None:
                child = Node(values[i])
                setattr(node, side, child)
                queue.append(child)
            i += 1
    return root


def rob_tree(values):
    root = build(values)
    pair = {}                                  # node -> (best with it taken, best with it skipped)

    def visit(node):
        if node is None:
            return 0, 0
        left_take, left_skip = visit(node.left)
        right_take, right_skip = visit(node.right)
        take = node.val + left_skip + right_skip           # @ Take {node.val}: its children must be skipped, so add their skip numbers: {node.val} + {left_skip} + {right_skip} = {take}.
        skip = max(left_take, left_skip) + max(right_take, right_skip)  # @ Skip {node.val}: each child gives its better number: {max(left_take, left_skip)} + {max(right_take, right_skip)} = {skip}.
        pair[node] = (take, skip)
        return take, skip

    take, skip = visit(root)
    return max(take, skip)                     # @ At the root, taking gives {take} and skipping gives {skip}: the answer is {max(take, skip)}.
