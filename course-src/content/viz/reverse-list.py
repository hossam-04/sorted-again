class Node:
    def __init__(self, val, next=None):
        self.val, self.next = val, next


def build(values):
    head = None
    for v in reversed(values):
        head = Node(v, head)
    return head


def reverse_list(values):
    head = build(values)            # @ The list starts as {' → '.join(map(str, values))}.
    prev, cur = None, head          # @ prev is the reversed part, empty so far. cur is the first node still to move.
    while cur:                      # @ {('cur is ' + str(cur.val) + ': move it to the front of the reversed part.') if cur else 'cur has run off the end: every node has moved.'}
        nxt = cur.next              # @ Save the rest of the list first: nxt = {nxt.val if nxt else 'None'}.
        cur.next = prev             # @ Point {cur.val} back at {prev.val if prev else 'None'}. Only nxt still reaches the rest of the list.
        prev = cur                  # @ The reversed part now starts at {prev.val}.
        cur = nxt                   # @ Move on to {cur.val if cur else 'None'}.
    return prev                     # @ prev is the new head: {' → '.join([str(n.val) for n in reach(prev)])}.
