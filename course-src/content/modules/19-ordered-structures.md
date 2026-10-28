---
id: ordered-structures
part: advanced
title: Ordered data structures
kicker: the missing balanced tree · bisect and sorted lists · blocks · lazy deletion · buckets · O(1) caches
summary: "Many Hard problems need a collection that stays sorted while items come and go. Java and C++ have a balanced search tree built in; Python doesn't. This module covers what to use instead: sorted lists with bisect, heaps that delete lazily, buckets that turn 'is anything close?' into a lookup, and ordered dicts that make an LFU cache O(1)."
---

## What Python doesn't have

A **balanced binary search tree** (a red-black or AVL tree) keeps its keys sorted while you add and remove them, and answers every ordered question in O(log n): the smallest and largest key, the **floor** (the largest key at most x) and the **ceiling** (the smallest key at least x), and, with a little extra bookkeeping, the k-th smallest key. Java calls it `TreeMap`, C++ `std::set`.

Python's standard library has no such tree. What it has instead, and what this module builds on:

| You need | Use | Cost |
|---|---|---|
| Floor, ceiling, rank in sorted data | a sorted list and `bisect` | `O(log n)` |
| Insert into or delete from that list | `insort`, `del` | `O(n)`, as one block move |
| The smallest or largest, with arbitrary removals | a heap with lazy deletion | `O(log n)` amortised |
| "Is any value within t of x?" | buckets of width t + 1 | `O(1)` |
| Order of use, for caches | `OrderedDict` | `O(1)` |

Outside the standard library, the `sortedcontainers` package provides `SortedList`, `SortedDict` and `SortedSet` with O(log n) operations. LeetCode preinstalls it, so `from sortedcontainers import SortedList` works there. It isn't available on this page, and in an interview it's worth saying what it does and how you'd manage without it, which is what this module is about.

## Sorted lists with bisect

`bisect_left(a, x)` is the first index whose item is at least x, and `bisect_right(a, x)` the first index whose item is greater than x. Everything ordered follows from those two:

- the **ceiling** of x is `a[bisect_left(a, x)]`, if that index exists;
- the **floor** of x is `a[bisect_right(a, x) - 1]`, if that index is at least 0;
- the number of items below x is `bisect_left(a, x)`, its **rank**.

```python run title=Floor_ceiling_and_rank
from bisect import bisect_left, bisect_right, insort

prices = [12, 20, 20, 35, 41, 58]

def floor(a, x):  # the largest item <= x, or None
    i = bisect_right(a, x)
    return a[i - 1] if i > 0 else None

def ceiling(a, x):  # the smallest item >= x, or None
    i = bisect_left(a, x)
    return a[i] if i < len(a) else None

for x in (20, 30, 5, 60):
    print(f"x={x:>2}  floor={floor(prices, x)}  ceiling={ceiling(prices, x)}  items below={bisect_left(prices, x)}")

insort(prices, 30)  # finds the place in O(log n), then shifts the larger items one step right
print(prices)
```

The catch is `insort` and `del`: the search is O(log n), but making room shifts every later item. That's O(n), yet it's a single `memmove` of pointers, so in practice a list of 100,000 items takes tens of thousands of inserts comfortably. [[p:729]] keeps booked events this way, and [[p:352]] keeps merged intervals.

:::gotcha bisect compares whole items
A list of tuples is sorted tuple by tuple, so `bisect_left(events, (start,))` finds the first event starting at `start` or later: a one-item tuple sorts before every longer tuple with the same first item. Since Python 3.10 the functions also take `key=`, but the key is applied to the list's items only, not to `x`: `bisect_left(events, start, key=lambda e: e[0])`. Keeping parallel lists, one per field, is often simpler.
:::

## When the list gets long: blocks

Shifting a million pointers on every insert is too slow. The fix that `sortedcontainers` uses is to split the sorted list into **blocks** of at most a few thousand items, plus a small list of each block's largest item. Finding the block is one `bisect`; inserting into it shifts at most a block's worth of items; a block that grows too big is split in two.

```python run title=A_sorted_list_made_of_blocks
from bisect import bisect_left, insort
import random, time


class BlockList:
    """Sorted, like sortedcontainers.SortedList: a list of short sorted blocks."""

    def __init__(self, size=500):
        self.size = size
        self.blocks = []  # sorted blocks; each block's items are at most the next block's
        self.maxes = []   # the largest item of each block, for bisect

    def add(self, x):
        if not self.blocks:
            self.blocks, self.maxes = [[x]], [x]
            return
        i = min(bisect_left(self.maxes, x), len(self.blocks) - 1)
        block = self.blocks[i]
        insort(block, x)
        self.maxes[i] = block[-1]
        if len(block) > 2 * self.size:  # split a block that grew too big
            self.blocks[i:i + 1] = [block[:self.size], block[self.size:]]
            self.maxes[i:i + 1] = [block[self.size - 1], block[-1]]

    def remove(self, x):  # x must be present
        i = bisect_left(self.maxes, x)
        block = self.blocks[i]
        del block[bisect_left(block, x)]
        if block:
            self.maxes[i] = block[-1]
        else:
            del self.blocks[i], self.maxes[i]

    def kth(self, k):  # the k-th smallest, from 0
        for block in self.blocks:
            if k < len(block):
                return block[k]
            k -= len(block)
        raise IndexError(k)


random.seed(1)
nums = [random.randint(0, 10**9) for _ in range(60_000)]

start = time.perf_counter()
plain = []
for x in nums:
    insort(plain, x)
print(f"one long list: {time.perf_counter() - start:.2f} s")

start = time.perf_counter()
blocks = BlockList()
for x in nums:
    blocks.add(x)
print(f"blocks:        {time.perf_counter() - start:.2f} s")

blocks.remove(nums[0])
plain.remove(nums[0])
print("same median:", blocks.kth(len(plain) // 2) == plain[len(plain) // 2])
```

Each operation now costs O(log n + B) for blocks of size B, and B in the hundreds or thousands makes that fast in practice. The k-th smallest walks the blocks, O(n / B); `sortedcontainers` adds a tree of block sizes to make it O(log n).

## Heaps with lazy deletion

A heap removes its smallest item in O(log n), but removing any *other* item means finding it first, O(n). **Lazy deletion** sidesteps that: leave the item where it is, record that it's gone, and throw it away only when it reaches the top. Every item is pushed once and popped at most once, so the cost stays O(log n) per operation, amortised.

:::viz lazy-window-min
:::

There are two ways to know an entry is gone:

- **A counter of pending removals**, keyed by value, as in the visualizer. [[p:480]] does this with two heaps, to keep a sliding window's median.
- **A check against the source of truth.** In [[p:2034]], each heap entry carries its timestamp, and the entry is out of date if the dict now holds a different price for that timestamp. No counter needed.

:::gotcha `len(heap)` counts the dead too
With lazy deletion, the heap's length includes entries that are already gone. Anything that depends on how many live items there are, such as keeping two heaps balanced for a median, needs its own counters. And clean the top *before* reading it: the answer must never come from a dead entry.
:::

A heap can fill up with dead entries when removals far outnumber pops. If memory matters, rebuild it from the live items whenever the dead ones outnumber them: O(n) now and then, which keeps the amortised cost the same.

## Buckets: "is anything close?" as a lookup

"Is there a value within t of x?" sounds like it needs ordering, but buckets answer it with hashing. Cut the number line into buckets of width t + 1, so that x goes to bucket `x // (t + 1)`:

- two values in the **same** bucket differ by at most t, so finding one there settles the question;
- a close value can also be in one of the **two neighbouring** buckets, so check those;
- anything further away is more than t away.

So each bucket needs to hold only one value: the moment a second one arrives, you've found your pair. [[p:220]] adds a sliding window on top: delete a value's bucket when it leaves the window.

:::gotcha Rounding towards zero merges two buckets
Python's `//` rounds down, so −3 // 4 is −1 and 3 // 4 is 0: different buckets, as they should be. `int(x / w)` rounds towards zero, which sends both to bucket 0 and makes that bucket twice as wide as the rest. Java's and C++'s `/` round towards zero too, which is why their versions of this trick need a correction for negative numbers.
:::

## O(1) caches with ordered dicts

An `OrderedDict` is a dict plus a doubly linked list of its keys: `move_to_end(key)` and `popitem(last=False)` are both O(1). That's an LRU cache in a few lines ([[p:146]]).

An **LFU** cache evicts the key used *least often*, and among those the least recently used one ([[p:460]]). Group the keys by use count, with one `OrderedDict` per count to keep each group in order of last use. A use moves a key from group c to group c + 1, and the victim is the first key of the smallest non-empty group. Tracking that smallest count is the subtle part: it only changes when a use empties the smallest group (it goes up by one) or a new key arrives (it drops to 1).

:::gotcha A plain dict is a poor queue
Dicts remember insertion order too, so `next(iter(d))` gives the oldest key. But each deletion leaves a hole that iteration has to step over, and repeatedly deleting the oldest key makes every `next(iter(d))` scan past all the earlier holes. `OrderedDict.popitem(last=False)` doesn't have that problem.
:::

```python run title=Oldest_key_first
from collections import OrderedDict
import time

n = 20_000
d = {i: None for i in range(n)}
start = time.perf_counter()
for i in range(n, 2 * n):
    del d[next(iter(d))]  # remove the oldest key, then add a new one
    d[i] = None
print(f"dict:        {time.perf_counter() - start:.3f} s")

od = OrderedDict((i, None) for i in range(n))
start = time.perf_counter()
for i in range(n, 2 * n):
    od.popitem(last=False)
    od[i] = None
print(f"OrderedDict: {time.perf_counter() - start:.3f} s")
```

## Intervals as an ordered set

A set of numbers that arrives in order-free pieces is often best stored as disjoint intervals sorted by start ([[p:352]]). A new number can only touch the interval just before it and the interval just after it, which `bisect` finds; then it either falls inside one, joins one, bridges both, or starts its own interval. The same idea, with ranges instead of single numbers, handles "add this range, remove that range, is this point covered?" questions.

## Complexity

| Structure | Insert | Delete | Min or max | Floor or ceiling | k-th smallest |
|---|---|---|---|---|---|
| Sorted list with `bisect` | `O(n)` block move | `O(n)` block move | `O(1)` | `O(log n)` | `O(1)` |
| Blocks of size B | `O(log n + B)` | `O(log n + B)` | `O(1)` | `O(log n)` | `O(n / B)` |
| Heap with lazy deletion | `O(log n)` | `O(log n)` amortised | `O(log n)` amortised | no | no |
| Balanced BST, `SortedList` | `O(log n)` | `O(log n)` | `O(log n)` | `O(log n)` | `O(log n)` |
| Buckets of width t + 1 | `O(1)` | `O(1)` | no | within t only | no |

:::interview
If a problem needs a `TreeMap`, say so, then say what you'll use in Python: `SortedList` if the judge allows it, otherwise a sorted list with `bisect` and an honest word about the O(n) insert, or a heap with lazy deletion when you only need the minimum or maximum. Interviewers mostly want to hear that you know which operations you need and what each choice costs. Lazy deletion is also the standard follow-up to "how would you delete from a heap?".
:::

:::work
Databases keep their indexes in B-trees, which are exactly sorted blocks with an index on top, sized to a disk page. Redis keeps sorted sets in skip lists, another ordered structure with O(log n) operations. Caches choose between LRU and LFU eviction (Redis offers both, approximating use counts with small probabilistic counters), and time-ordered queues of timers and retries are heaps whose cancelled entries are deleted lazily.
:::

## Quick check

:::quiz
? You need the floor of x (the largest item at most x) in a sorted list `a`. Which index holds it?
- [x] `bisect_right(a, x) - 1`, if it's at least 0
- [ ] `bisect_left(a, x)`
- [ ] `bisect_left(a, x) - 1`, always
> `bisect_right` skips past every item equal to x, so the item just before that position is the largest one at most x. `bisect_left(a, x) - 1` misses x itself when it's in the list.

? Why is `insort` fast in practice, even though it's O(n)?
- [ ] It's actually O(log n)
- [x] The shift is one block move of pointers in memory, much cheaper per item than Python-level work
- [ ] Python lists are linked lists
> Finding the place is O(log n). Shifting the later items is O(n), but it's a single `memmove`, so tens of thousands of inserts into a list of that size are quick.

? A heap uses lazy deletion. What must be true before you read its top?
- [ ] Nothing: the top is always valid
- [x] Every dead entry has been popped off the top
- [ ] The heap has been rebuilt from scratch
> Dead entries stay inside the heap, which is fine, but one of them can reach the top. Pop dead entries off the top until a live one is there, then read it.

? You look for two values within t of each other using buckets. How wide is each bucket, and which buckets do you check?
- [ ] Width t; only the value's own bucket
- [x] Width t + 1; the value's own bucket and the two next to it
- [ ] Width 2t; every bucket
> Values in one bucket of width t + 1 differ by at most t. A close value can also be in a neighbouring bucket, so those two need a check; anything further is too far.

? In an LFU cache, when does the smallest use count change?
- [ ] After every call
- [x] When a use empties the smallest group (it goes up by one), or when a new key arrives (it becomes 1)
- [ ] Only when a key is evicted
> A use moves a key from count c to c + 1. Only if that empties the smallest group does the minimum change, and then the key that just moved is in the next group up. A new key always has count 1.
:::
