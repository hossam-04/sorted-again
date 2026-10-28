---
id: 19
module: linked-lists
patterns: [gap between two pointers, dummy head]
signature: "def removeNthFromEnd(self, head: Optional[ListNode], n: int) -> Optional[ListNode]"
---

## Task

You get the head of a linked list and an integer `n`. Remove the `n`-th node counting from the end of the list (the last node is number 1), and return the head of the resulting list.

`n` is always between 1 and the length of the list. Try to do it in a single pass over the list.

## Constraints

- The list has between `1` and `100_000` nodes
- `0 <= node.val <= 1000`
- `1 <= n <=` the length of the list

```json examples
[
  {"args": [[5, 10, 15, 20, 25], 4], "out": [5, 15, 20, 25], "why": "Counting from the end, 25 is first, 20 second, 15 third and 10 fourth, so 10 is removed."},
  {"args": [[8, 9], 2], "out": [9], "why": "The second node from the end of a two-node list is the head itself."},
  {"args": [[3, 6, 9], 1], "out": [3, 6], "why": "n = 1 removes the last node."}
]
```

```json edge
[
  {"name": "the only node", "args": [[7], 1], "out": []},
  {"name": "the head of a longer list", "args": [[1, 2, 3, 4], 4], "out": [2, 3, 4]},
  {"name": "the middle node", "args": [[1, 2, 3, 4, 5], 3], "out": [1, 2, 4, 5]},
  {"name": "second to last", "args": [[1, 2, 3], 2], "out": [1, 3]},
  {"name": "repeated values", "args": [[4, 4, 4], 2], "out": [4, 4]},
  {"name": "largest values", "args": [[1000, 0, 1000], 1], "out": [1000, 0]}
]
```

```python gen
def gen(rng, size):
    length = rng.randint(1, 8) if size == "small" else rng.randint(20, 300)
    vals = [rng.randint(0, 20 if size == "small" else 1000) for _ in range(length)]
    return [vals, rng.randint(1, length)]
```

```python perf
def perf(rng):
    # 100,000 nodes, removing the second to last: anything that rescans the rest of the list from each node is slow.
    return [[rng.randint(0, 1000) for _ in range(100_000)], 2]
```

## Hints

1. The n-th node from the end is the (length − n + 1)-th from the start. Two passes work: one to count, one to remove.
2. For one pass, start a second pointer n steps behind the first. When the first reaches the end, the second is just before the node to remove.
3. Start both pointers at a dummy node placed before the head. Then removing the head itself needs no special case.

## Solution

```python solution time="L" space="1"
class Solution:
    def removeNthFromEnd(self, head: Optional[ListNode], n: int) -> Optional[ListNode]:
        dummy = ListNode(0, head)
        lead = trail = dummy
        for _ in range(n):  # put a gap of n nodes between lead and trail
            lead = lead.next
        while lead.next:  # move both until lead is the last node
            lead, trail = lead.next, trail.next
        trail.next = trail.next.next  # trail is just before the node to remove
        return dummy.next
```

Keep two pointers exactly n nodes apart. When `lead` stands on the last node, `trail` is n nodes behind it, which is the node just before the n-th from the end, the one whose `next` has to skip over the removed node.

Starting both at a dummy node in front of the head means `trail` can stand *before* the head when the head is the node to remove, and `dummy.next` is the right answer in every case. One pass over a list of length L: O(L) time and O(1) space.

## Alternatives

### Count first, then walk to the node

```python alt time="L" space="1" oracle
class Solution:
    def removeNthFromEnd(self, head: Optional[ListNode], n: int) -> Optional[ListNode]:
        length, node = 0, head
        while node:
            length += 1
            node = node.next
        dummy = ListNode(0, head)
        prev = dummy
        for _ in range(length - n):  # stop just before the node to remove
            prev = prev.next
        prev.next = prev.next.next
        return dummy.next
```

Two passes: count the nodes, then walk to the one before the target. It's just as fast in big-O terms, and many interviewers accept it before asking for the one-pass version.

## Wrong answers

### No dummy node

```python wrong fails="example" test="Example 2" how="error"
class Solution:
    def removeNthFromEnd(self, head: Optional[ListNode], n: int) -> Optional[ListNode]:
        lead = trail = head
        for _ in range(n):
            lead = lead.next
        while lead.next:  # lead is None when the head is the node to remove
            lead, trail = lead.next, trail.next
        trail.next = trail.next.next
        return head
```

Starting at `head` works until the node to remove *is* the head. Then `lead` runs off the end during the gap, `lead.next` raises `AttributeError`, and even if it didn't, there's no node before the head to relink. A dummy node in front of the head gives every node a predecessor.

### Makes the gap one node too short

```python wrong fails="example" test="Example 1"
class Solution:
    def removeNthFromEnd(self, head: Optional[ListNode], n: int) -> Optional[ListNode]:
        dummy = ListNode(0, head)
        lead = trail = dummy
        for _ in range(n - 1):  # one step short
            lead = lead.next
        while lead.next:
            lead, trail = lead.next, trail.next
        trail.next = trail.next.next
        return dummy.next
```

With a gap of n − 1, `trail` ends up one node further along, so the node after the right one is removed. Trace a small case by hand to check gap sizes; it's the fastest way to catch this off-by-one.

### Measures the rest of the list from every node

```python wrong fails="perf"
class Solution:
    def removeNthFromEnd(self, head: Optional[ListNode], n: int) -> Optional[ListNode]:
        dummy = ListNode(0, head)
        prev = dummy
        while prev.next:
            remaining, probe = 0, prev.next
            while probe:  # counts the nodes from here to the end, again and again
                remaining += 1
                probe = probe.next
            if remaining == n:
                prev.next = prev.next.next
                break
            prev = prev.next
        return dummy.next
```

Checking "is this node n from the end?" by counting to the end works, but it recounts the rest of the list at every node. Near the end of a 100,000-node list, that adds up to about 5 billion steps.
