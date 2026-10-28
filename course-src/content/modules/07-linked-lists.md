---
id: linked-lists
title: Linked lists
kicker: nodes and pointers · dummy heads · reversal · fast and slow pointers
summary: A linked list trades the array's instant indexing for cheap rewiring. Most problems come down to a handful of pointer moves done in the right order, plus a few tricks worth memorising, like the dummy head and the fast and slow pointers.
---

## Nodes and pointers

A linked list is a chain of small objects. Each *node* holds a value and a reference to the next node; the last node's `next` is `None`. LeetCode-style problems give you only the first node, `head`, and use this class:

```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
```

There is no index. To reach the 1,000th node you follow 999 links, so access by position is O(n). What you gain is cheap rewiring: once you hold a node, inserting after it or removing its successor is O(1), with no shifting of other elements. Python's `list` is an array, so in Python you'll meet linked lists mostly in interviews and in structures built from them, such as LRU caches, queues and adjacency lists.

```python run title=Building_and_walking_a_list
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def from_values(values):
    dummy = tail = ListNode()  # a placeholder in front of the real first node
    for v in values:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next

def to_values(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out

head = from_values([3, 1, 4, 1, 5])
print(to_values(head))
head.next = head.next.next  # remove the second node in O(1)
print(to_values(head))
```

## The dummy head

Many list operations need "the node before" the one you're changing. The first node has no node before it, which usually means a special case. A **dummy node** placed in front of the head removes it: now every real node has a predecessor, and the answer is `dummy.next` at the end, even if the original head was removed or replaced.

You'll see it in [[p:21]] (merge two sorted lists by appending to `tail`), [[p:19]] (remove the n-th node from the end, which might be the head), [[p:2]] (build a result digit by digit) and [[p:25]].

## Reversal: three pointers

Reversing a list in place ([[p:206]]) is the move every other technique builds on. Walk the list once and point each node back at its predecessor. The order of the four assignments matters: save `cur.next` *before* overwriting it, or the rest of the list is lost.

:::viz reverse-list
:::

Reversal can also be written recursively: reverse everything after the head, then hang the head on the end. It's elegant, but it makes one nested call per node.

:::gotcha Recursion depth on long lists
A recursive walk uses one stack frame per node. Plain Python stops at 1,000 frames by default, and LeetCode's lists can have thousands of nodes. This page allows 100,000, so recursion works here for the course's sizes, but in production code or other judges, loop over long lists.
:::

```python run title=Recursion_on_a_long_list error
import sys
sys.setrecursionlimit(1000)  # what a plain Python install allows

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def length(node):
    return 0 if node is None else 1 + length(node.next)

head = None
for v in range(5000):
    head = ListNode(v, head)
print(length(head))  # 5,000 nested calls: more than the limit allows
```

## Fast and slow pointers

Two pointers that move at different speeds answer questions about a list's shape without knowing its length.

- **The middle.** Move `slow` one step and `fast` two steps at a time. When `fast` reaches the end, `slow` is in the middle. [[p:143]] uses this to split a list in half.
- **Cycles.** In a list with a cycle, `fast` never reaches the end; once both pointers are inside the cycle, `fast` gains one node per step and must land on `slow`. That's Floyd's algorithm, used in [[p:141]].

:::viz floyd-cycle
:::

```python run title=Finding_the_middle
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def middle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow.val

for n in [1, 2, 5, 6]:
    head = None
    for v in range(n, 0, -1):
        head = ListNode(v, head)
    print(f"{n} nodes: middle is {middle(head)}")
```

For even lengths this returns the second of the two middle nodes; stopping the loop when `fast.next.next` is `None` instead gives the first. [[p:287]] applies Floyd's algorithm to an *array*, by reading each value as a pointer to an index; the start of the cycle is the duplicate value.

:::gotcha Read-only means read-only
Some problems, like finding the duplicate in [[p:287]], forbid changing the input. Sorting it in place, or marking visited entries by negating them, gives the right answer but breaks the contract, and the caller's data with it. When a problem says "don't modify", the checker here compares the input before and after.
:::

## Gaps, splits and merges

A fixed **gap** between two pointers finds positions measured from the end: start `lead` n steps ahead of `trail`, then move both until `lead` hits the end. `trail` is then n nodes from the end, in one pass ([[p:19]]).

Bigger rearrangements are usually three simple steps in a row. [[p:143]] asks for the order first, last, second, second-to-last…: find the middle, reverse the second half, then merge the halves by alternating nodes. Each step is a pattern you already know, and doing them one after another keeps the whole thing O(n) with O(1) extra space.

[[p:25]] reverses the list in groups of k: count k nodes ahead (a short final group stays as it is), reverse that stretch with the three-pointer loop, and stitch it between the group before and the group after.

## Copying and adding

[[p:138]] copies a list whose nodes also have a `random` pointer into any node. A `random` target may not have been copied yet when you reach it, so copy in two passes: first create every copy and record `original → copy` in a dict, then wire up `next` and `random` through the dict. Node objects work as dict keys because they hash by identity.

[[p:2]] adds two numbers stored as digit lists, least significant digit first. That's grade-school column addition: add two digits and the carry, write `total % 10`, carry `total // 10`, and keep going while either list or the carry remains.

## An LRU cache: a dict plus a doubly linked list

[[p:146]] needs `get` and `put` in O(1), plus "throw out the least recently used key". A dict gives O(1) lookup but no order. A **doubly linked list** of keys in order of last use gives O(1) reordering, as long as you can jump straight to a node: so the dict maps each key to its *node*. Using a key moves its node to the newest end; evicting removes the node at the oldest end. Two dummy nodes at the ends make every unlink and insert the same four pointer updates.

Python's `collections.OrderedDict` is exactly this pair of structures, already built:

```python run title=An_LRU_cache_with_OrderedDict
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.capacity, self.data = capacity, OrderedDict()

    def get(self, key):
        if key not in self.data:
            return -1
        self.data.move_to_end(key)  # now the most recently used
        return self.data[key]

    def put(self, key, value):
        if key in self.data:
            self.data.move_to_end(key)
        self.data[key] = value
        if len(self.data) > self.capacity:
            print("evict", self.data.popitem(last=False))  # the least recently used

cache = LRUCache(2)
cache.put("a", 1)
cache.put("b", 2)
cache.get("a")
cache.put("c", 3)
print(list(cache.data))
```

## Merging k lists with a heap

[[p:23]] merges k sorted lists. The next node is always the smallest of the k current fronts, and a min-heap finds it in O(log k). Pop the smallest, append it to the result, and push its successor.

:::gotcha heapq can't compare ListNodes
`heapq` compares tuples item by item. Push `(val, node)` and two equal values make it compare the nodes, which raises `TypeError` because `ListNode` doesn't define `<`. Put a unique tiebreaker in the middle: `(val, i, node)` with the list's index, or a running counter.
:::

```python run title=A_tiebreaker_for_the_heap
import heapq
from itertools import count

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

a, b = ListNode(1), ListNode(1)
heap = []
try:
    heapq.heappush(heap, (a.val, a))
    heapq.heappush(heap, (b.val, b))  # equal values: heapq compares the nodes
except TypeError as e:
    print("TypeError:", e)

tick = count()
heap = []
for node in (a, b):
    heapq.heappush(heap, (node.val, next(tick), node))  # the counter breaks every tie
print([entry[:2] for entry in heap])
```

## Complexity

| Operation | Linked list | Python list (array) |
|---|---|---|
| Access by position | `O(n)` | `O(1)` |
| Insert or delete after a node you hold | `O(1)` | `O(n)` to shift the rest |
| Insert or delete at the front | `O(1)` | `O(n)` |
| Find a value | `O(n)` | `O(n)` |
| Reverse in place | `O(n)` time, `O(1)` space | `O(n)` |

| Problem | Approach | Cost |
|---|---|---|
| Middle of a list, or a cycle | fast and slow pointers | `O(n)` time, `O(1)` space |
| n-th node from the end | two pointers with a gap | `O(n)`, one pass |
| Copy with random pointers | dict from original to copy | `O(n)` time and space |
| LRU cache | dict plus doubly linked list | `O(1)` per operation |
| Merge k sorted lists, N nodes | min-heap of fronts | `O(N log k)` |

:::interview
Draw the nodes and arrows before you write pointer code, and narrate each reassignment ("save next, point back, advance"). Say up front whether you'll use a dummy head; it shows you've thought about the head being removed. For cycle and middle questions, mention that the fast and slow pointers need O(1) memory where a set would need O(n).
:::

:::work
You'll rarely write a linked list by hand in Python, but the ideas are everywhere: `collections.deque` is a linked structure of blocks, `OrderedDict` and `functools.lru_cache` keep recency with linked lists, and memory allocators, schedulers and undo stacks chain records together. Floyd's algorithm also detects loops in sequences generated by a function, such as cycles in pseudo-random number generators.
:::

## Quick check

:::quiz
? In the reversal loop, why must `nxt = cur.next` come before `cur.next = prev`?
- [ ] It's faster that way
- [x] After `cur.next = prev`, nothing points to the rest of the list any more
- [ ] Python requires reading before writing
> `cur.next` is the only reference to the rest of the list. Overwriting it first would lose those nodes; saving it in `nxt` keeps them reachable.

? What problem does a dummy head node solve?
- [x] Operations at the first node no longer need special cases, because every real node has a predecessor
- [ ] It makes the list doubly linked
- [ ] It speeds up access by index
> Removing or replacing the head would otherwise need separate code. With a dummy in front, the head is just another node with a predecessor, and `dummy.next` is always the answer.

? Why does the fast pointer in Floyd's algorithm always meet the slow one inside a cycle?
- [ ] Because the cycle has an even length
- [x] Each step closes the gap between them by exactly one node, so the gap reaches zero instead of jumping over it
- [ ] Because the fast pointer stops when it reaches the end
> Fast moves two, slow moves one, so the distance from fast to slow (going around the cycle) shrinks by one every step until it's zero.

? An LRU cache stores each key's node in a dict. What does that buy you?
- [ ] Sorting keys by value
- [x] Jumping straight to a key's node in the linked list, so it can be moved or removed in O(1)
- [ ] Avoiding the linked list altogether
> The list keeps the recency order, but finding a node by walking the list would be O(n). The dict makes "find this key's node" O(1).

? Why push `(val, i, node)` onto the heap instead of `(val, node)` when merging k lists?
- [ ] To sort the lists by index
- [x] When two values tie, heapq compares the next item, and ListNode objects can't be compared
- [ ] Because heapq needs exactly three items
> Tuples compare item by item. A unique middle item settles every tie before the comparison reaches the nodes.
:::
