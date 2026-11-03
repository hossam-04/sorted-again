---
id: advanced-dp
part: advanced
title: Advanced dynamic programming
kicker: choosing the state · DP on trees · bitmask DP · states as a graph · DP with binary search · digit DP
summary: "Every dynamic program answers the same question: what is the least you need to remember about the past to decide the future? This module covers the states that come up in Hard problems: a few numbers per tree node, a set of items as a bitmask, a position plus a set, a sorted prefix found by binary search, and the digits of a number built from the left."
---

## Choosing the state

[[m:dp]] built tables over positions, lengths and amounts. Harder problems need the same idea with a less obvious state. The test is always the same: two partial solutions that agree on the state must be interchangeable for the future. Everything the future depends on has to be in the state, and nothing else, because the state count is the cost.

| Problem shape | State | Count |
|---|---|---|
| choices on a tree, parent and child interact | (node, a few flags about the node) | `O(n)` |
| choose a subset of up to ~20 items | the subset, as a bitmask | `O(2ⁿ)` |
| visit every node of a small graph | (current node, visited set) | `O(n · 2ⁿ)` |
| weighted intervals | a prefix of the intervals sorted by end | `O(n)`, plus binary search |
| count numbers up to N with a digit property | (position, still equal to N's prefix?, property so far) | `O(digits × …)` |

## DP on trees

On a tree, a node's subtree is a natural subproblem: solve the children first (post-order), then combine. The question is what each child must report so that its parent can decide. For [[p:337]], where linked nodes can't both be taken, two numbers suffice: the child's best with it taken, and with it skipped.

:::viz tree-robber
:::

Some problems need more numbers per node. In [[p:968]] a camera watches its node, parent and children, so whether a node is *watched* matters as well as whether it has a camera: three states per node (camera here, watched by a child, waiting for the parent). The trick is to name situations the *parent* cares about, and make sure every subtree below is fully solved in each.

```python run title=Tree_DP_with_pairs
class Node:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def best(node):  # (taken, skipped)
    if node is None:
        return 0, 0
    lt, ls = best(node.left)
    rt, rs = best(node.right)
    return node.val + ls + rs, max(lt, ls) + max(rt, rs)

tree = Node(3, Node(7, Node(2), Node(5)), Node(1))
print(best(tree), "->", max(best(tree)))
```

## Bitmask DP

When the state is "which items have been used" and there are at most about 20 items, store the set as an integer whose bit i says whether item i is in it. Then:

- `mask >> i & 1` tests membership, and `mask | 1 << i` adds item i;
- `range(1 << n)` visits every subset, each one after all of its own subsets (they're smaller numbers), which is exactly the order a DP needs;
- a table of 2ⁿ entries indexed by mask holds the answers.

[[p:698]] fills groups one at a time, so the only thing that matters about a partial solution is the set of numbers used: their sum says how full the current group is. That's 2¹⁶ = 65,536 states instead of k¹⁶ assignments.

```python run title=Subsets_as_bitmasks
items = ["a", "b", "c"]
for mask in range(1 << len(items)):
    chosen = [x for i, x in enumerate(items) if mask >> i & 1]
    print(f"{mask:03b} -> {chosen}")

# bitmask DP: can these numbers be split into groups of 6?
nums, target = [5, 1, 4, 2, 3, 3], 6
fill = [-1] * (1 << len(nums))  # how full the current group is, after using the numbers in mask
fill[0] = 0
for mask in range(1 << len(nums)):
    if fill[mask] < 0:
        continue
    for i, x in enumerate(nums):
        if not mask >> i & 1 and fill[mask] + x <= target:
            fill[mask | 1 << i] = (fill[mask] + x) % target
print("splits evenly:", fill[-1] == 0)
```

## States as a graph

Sometimes the DP is clearest as a shortest path over states. In [[p:847]] a walk may revisit nodes, so the state is (current node, set of nodes visited), and every move costs 1: a breadth-first search over at most n · 2ⁿ states finds the shortest walk. This is the travelling-salesman DP, explored in order of distance instead of in order of masks. When moves cost different amounts, the same states work with Dijkstra's algorithm.

:::key DP and shortest paths are the same idea
A DP table is a shortest (or longest) path in a graph whose nodes are states and whose edges are choices. When the states can be ordered so every edge goes forward, as with masks that only grow, a loop fills the table. When they can't, as with walks that revisit nodes, a BFS or Dijkstra finds the order for you.
:::

## DP with binary search

In weighted interval scheduling ([[p:1235]]), sorting jobs by end time makes "the jobs that finish before this one starts" a *prefix* of the sorted list. The DP is the take-or-skip of [[p:198]], and the only hard part, finding where that prefix ends, is a `bisect` on the end times. Many DPs over sorted items work the same way: the transition needs "the last item compatible with this one", and binary search finds it in O(log n) instead of a scan.

## Digit DP

To count the numbers from 0 to N with some property (no repeated digits, digit sum 10, a certain count of 1s), build the numbers digit by digit from the left. The state is:

- the **position**;
- whether the digits so far **equal N's prefix** (*tight*): if so, the next digit can't exceed N's next digit; otherwise anything from 0 to 9 is allowed;
- whatever the property needs, such as the digit sum so far or a mask of digits used.

[[p:233]] counts the digit 1 across 0 to N, which needs each state to return two numbers: how many ways it can be completed, and how many 1s those completions contain.

```python run title=Digit_DP:_numbers_up_to_N_with_digit_sum_10
from functools import cache

def count_digit_sum(n, s):
    digits = list(map(int, str(n)))

    @cache
    def go(pos, tight, total):
        if total > s:
            return 0
        if pos == len(digits):
            return 1 if total == s else 0
        top = digits[pos] if tight else 9
        return sum(go(pos + 1, tight and d == top, total + d) for d in range(top + 1))

    return go(0, True, 0)

print(count_digit_sum(100, 10))       # 19, 28, ..., 91: 9 numbers
print(count_digit_sum(10**12, 10))    # far too many numbers to try one by one
```

## Memoisation or tabulation?

Both work for every problem here. Memoised recursion (`@cache`) is quick to write and only visits reachable states, which suits digit DP and trees. But recursion depth follows the structure: a tree that's a chain of 10,000 nodes means 10,000 nested calls, and deeper inputs need an explicit stack. Tabulation, a loop over states in a valid order, has no depth limit and is usually faster in Python, which suits bitmasks and sorted prefixes.

## Complexity

| Technique | States | Work per state | Typical limit |
|---|---|---|---|
| Tree DP | `n` nodes × a few flags | children | `n` up to 10⁵ |
| Bitmask DP over subsets | `2ⁿ` | `n` | `n` up to about 20 |
| (node, visited set) | `n · 2ⁿ` | `n` | `n` up to about 12–16 |
| Sorted intervals with bisect | `n` | `log n` | `n` up to 10⁵ |
| Digit DP | digits × 2 × property | 10 | N up to 10¹⁸ and beyond |

:::interview
Start by saying the state and why it's enough: "for each node, the best with it taken and without", or "the set of numbers used, because their sum fixes the current group's fill". Then the transition, then the count of states times the work per state. Small constraints are hints: n ≤ 16 or 20 means bitmasks; "count numbers up to 10¹⁸" means digit DP; a tree with "can't pick adjacent nodes" means a pair per node.
:::

:::work
These states turn up in production as planning and counting problems: bitmask DP schedules small sets of resources and solves route planning for a handful of stops, tree DP aggregates over org charts and file systems (sizes, permissions, costs), and digit DP-style counting appears in analytics over ID ranges. More often, the lesson that carries over is the habit of asking "what's the smallest state that captures the past?", which is how caches, incremental builds and stream processors keep their bookkeeping small.
:::

## Quick check

:::quiz
? In [[p:337]], what does each node report to its parent?
- [ ] Only its best total
- [x] Its best total with the node taken, and with it skipped
- [ ] The values of its grandchildren
> The parent needs to know what each child is worth if the child is skipped (when the parent is taken) and its best either way (when the parent isn't).

? Why does iterating masks with `for mask in range(1 << n)` give a valid DP order?
- [ ] It doesn't; masks must be sorted by popcount
- [x] A mask is processed after all its subsets, because removing a bit makes a smaller number
- [ ] Because Python's range is lazy
> Transitions add an item, which only makes the mask larger, so every state's predecessors are done before it's reached.

? A problem allows revisiting nodes on a walk through a 12-node graph. What's the state?
- [ ] The current node only
- [ ] The set of visited nodes only
- [x] The current node and the set of visited nodes
> Where you are decides the next moves; what you've visited decides how much is left. Both are needed, and nothing else is.

? In a digit DP for numbers from 0 to N, what does the "tight" flag record?
- [x] Whether the digits chosen so far equal N's prefix, which limits the next digit
- [ ] Whether the number has leading zeros
- [ ] Whether the property has been satisfied
> While tight, the next digit can't exceed N's digit at that position; once a smaller digit is chosen, every later digit is free.

? Weighted interval scheduling sorts jobs by end time. What does that make easy?
- [ ] Choosing the most profitable job first
- [x] Finding the jobs compatible with a given job: they're a prefix, found by binary search on end times
- [ ] Merging overlapping jobs
> Every job that ends by the current start comes before it in end-time order, so one `bisect` gives the whole compatible set.
:::
