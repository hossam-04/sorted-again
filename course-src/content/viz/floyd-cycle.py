class Node:
    def __init__(self, val, next=None):
        self.val, self.next = val, next


def build(values, pos):
    nodes = [Node(v) for v in values]
    for a, b in zip(nodes, nodes[1:]):
        a.next = b
    if nodes and 0 <= pos < len(nodes):
        nodes[-1].next = nodes[pos]  # the last node points back to position pos
    return nodes[0] if nodes else None


def has_cycle(values, pos):
    head = build(values, pos)       # @ {('The last node points back to position ' + str(pos) + ', so there is a cycle to find.') if 0 <= pos < len(values) else 'The last node points to None: there is no cycle.'}
    slow = fast = head              # @ Both pointers start at the head.
    while fast and fast.next:       # @ {'fast can take two more steps.' if fast and fast.next else 'fast has reached the end of the list.'}
        slow = slow.next            # @ slow takes one step, to {slow.val}.
        fast = fast.next.next       # @ fast takes two steps, to {fast.val if fast else 'the end'}.
        if slow is fast:            # @ {'slow and fast stand on the same node: they met.' if slow is fast else 'Different nodes. Inside a cycle, fast gains one node on slow every round.'}
            return True             # @ They met, so the list has a cycle.
    return False                    # @ fast ran off the end, so there is no cycle.
