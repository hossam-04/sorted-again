---
id: binary-lifting
part: advanced
title: Binary lifting and sparse tables
kicker: doubling · jump tables · k-th ancestors · LCA · sums along a path · functional graphs · sparse tables
summary: "Precompute jumps of 1, 2, 4, 8, … steps, and any number of steps becomes a handful of jumps. That one idea answers ancestor and lowest-common-ancestor queries on trees in O(log n), follows a ball passed ten billion times, and, turned sideways, gives sparse tables: range minimums and ANDs in O(1)."
---

## Doubling

Suppose every item has exactly one "next" item: a tree node's parent, the player you pass to, the station after this one. Walking k steps one at a time costs O(k). **Binary lifting** precomputes where you land after 1, 2, 4, 8, … steps, from every item. Since any k is a sum of powers of two (its binary digits), k steps become at most log₂ k jumps.

The table is built row by row, and each row comes from the previous one: a jump of 2^j is a jump of 2^(j−1) followed by another.

```python run title=A_jump_table
parent = [-1, 0, 0, 1, 1, 3, 5, 6]  # node 0 is the root

up = [parent]  # up[j][v]: where 2**j steps up from v lands, or -1 past the root
for _ in range((len(parent) - 1).bit_length() - 1):
    prev = up[-1]
    up.append([-1 if a == -1 else prev[a] for a in prev])

for j, row in enumerate(up):
    print(f"jump {2 ** j}: {row}")

def kth_ancestor(v, k):
    j = 0
    while k and v != -1:
        if k & 1:          # this power of two is part of k
            v = up[j][v]
        k >>= 1
        j += 1
    return v

print("5 steps above node 7:", kth_ancestor(7, 5))  # 5 = 4 + 1
```

The table takes O(n log n) time and memory to build, and every query is O(log k) after that. [[p:1483]] is exactly this.

:::viz lifting-table
:::

:::gotcha Mark "past the end", and keep it marked
The root has no parent. Using -1 for "past the root" and keeping -1 under further jumps lets a query that goes too far come back as -1 without any extra checks. Making the root its own parent is tempting, because jumps then never leave the table, but then a walk past the root silently stops there. Either keep -1, or compare k with the node's depth first.
:::

## Lowest common ancestors

The **lowest common ancestor** (LCA) of two tree nodes is the deepest node that has both below it. For a single query, one walk over the tree is enough ([[p:236]]): record parents, collect the ancestors of one node, and climb from the other until you meet one. For many queries on the same tree, binary lifting answers each in O(log n):

1. Lift the deeper node until both are at the same depth: jump by the binary digits of the depth difference.
2. If they're now the same node, that's the answer.
3. Otherwise, for j from the largest jump down to 1, jump both nodes by 2^j *if that keeps them apart*. They end just below the LCA, so the answer is their parent.

```python run title=LCA_by_binary_lifting
parent = [-1, 0, 0, 1, 1, 2, 2, 3, 3, 6]
depth = [0] * len(parent)
for v in range(1, len(parent)):  # parents come before children here
    depth[v] = depth[parent[v]] + 1

up = [parent]
for _ in range(len(parent).bit_length() - 1):
    prev = up[-1]
    up.append([-1 if a == -1 else prev[a] for a in prev])

def lca(a, b):
    if depth[a] < depth[b]:
        a, b = b, a
    diff, j = depth[a] - depth[b], 0
    while diff:  # step 1: lift a to b's depth
        if diff & 1:
            a = up[j][a]
        diff >>= 1
        j += 1
    if a == b:
        return a
    for j in range(len(up) - 1, -1, -1):  # step 3: the largest jumps that keep them apart
        if up[j][a] != up[j][b]:
            a, b = up[j][a], up[j][b]
    return parent[a]

print(lca(7, 8), lca(7, 4), lca(9, 4), lca(5, 5))
```

Step 3 works because "the ancestor 2^j up differs" is true for small jumps and false for big ones, with the switch exactly at the LCA. Trying the jumps from the biggest down finds the highest point below the switch, like reading off the binary digits of a distance.

## Carrying data along the jumps

A jump can carry more than a destination. Store, for every jump, a summary of the steps it covers, and combine summaries as you jump:

- **Sums.** [[p:2836]] needs the sum of everyone who holds a ball over k passes. Each jump stores the sum of its 2^j receivers; two jumps combine by adding.
- **Minimums and maximums**, such as the lightest edge on a path, combine with `min` and `max`.
- **Counts from the root.** For paths in a tree, it's often simpler to store a running total from the root at every node. The path from a to b is "a up to the LCA, then down to b", so its total is `total[a] + total[b] − 2 × total[lca]`. [[p:2846]] keeps one such count per edge weight.

## Functional graphs

When every item has exactly one "next", as in [[p:2836]], the picture is a **functional graph**: from any start, the path eventually enters a loop and goes round it forever. Binary lifting doesn't care about that shape, since it just follows "next" pointers. The shape suggests an alternative: walk until something repeats, then handle the remaining steps as whole trips around the loop plus a remainder, which is the cycle detection of [[m:linked-lists]] used for counting.

## Sparse tables

Turn the idea sideways. Instead of "where do 2^j steps from i land", store "the minimum of the 2^j numbers starting at i". Each row comes from the previous one again: a window of 2^j is two windows of 2^(j−1).

For a range [l, r], take the largest power of two that fits, 2^j, and cover the range with **two windows of that length**: one starting at l, one ending at r. They overlap in the middle, which doesn't matter for minimum, maximum, GCD, AND and OR, because combining a value with itself changes nothing (these operations are *idempotent*). So every range query is O(1), after an O(n log n) build.

```python run title=A_sparse_table_for_range_minimum
nums = [5, 2, 8, 6, 3, 9, 1, 7, 4]

table = [nums]  # table[j][i]: the minimum of nums[i : i + 2**j]
while (1 << len(table)) <= len(nums):
    prev, half = table[-1], 1 << (len(table) - 1)
    table.append([min(prev[i], prev[i + half]) for i in range(len(prev) - half)])

def range_min(l, r):  # both ends included
    j = (r - l + 1).bit_length() - 1  # the largest power of two that fits
    return min(table[j][l], table[j][r - (1 << j) + 1])  # two windows, overlapping

for l, r in [(0, 8), (1, 4), (3, 3), (4, 7)]:
    print(f"min of nums[{l}..{r}] = {range_min(l, r)}")
```

Sparse tables don't support updates, which is the job of the segment trees in [[m:range-queries]]. And sums are not idempotent: two overlapping windows would count the middle twice, so sums need disjoint pieces, O(log n) of them, or plain prefix sums. [[p:1521]] uses a sparse table of ANDs, though there a simpler fact also works: the ANDs of all subarrays ending at one position take only about 20 distinct values.

## Complexity

| Structure | Build | Query | Memory |
|---|---|---|---|
| Jump table (k-th ancestor, k steps ahead) | `O(n log n)` | `O(log k)` | `O(n log n)` |
| LCA by binary lifting | `O(n log n)` | `O(log n)` | `O(n log n)` |
| LCA, one query, by walking | none | `O(n)` | `O(n)` |
| Sparse table (min, max, GCD, AND, OR) | `O(n log n)` | `O(1)` | `O(n log n)` |
| Sparse table for sums | `O(n log n)` | `O(log n)` | `O(n log n)` |

:::interview
"Binary lifting" is the phrase to say when a problem asks for many ancestor or path queries on a fixed tree, or for "where are you after k steps" with a huge k. Sketch the table, say it's O(n log n) to build and O(log n) per query, and mention the alternative for a single query: one O(n) walk. For static range minimums, a sparse table's O(1) query is the standard answer; if the array can change, switch to a segment tree.
:::

:::work
Jump tables appear wherever the same "next" step is followed many times: skip lists add express lanes over a linked list, which is doubling done probabilistically; version-control systems answer "which commit do these two branches share?", an LCA query on the commit graph; and filesystems and package managers resolve deep ancestry the same way. Sparse tables are the static cousin of database summary indexes: precompute aggregates at several scales, then combine a couple of them per query.
:::

## Quick check

:::quiz
? How is row j of a jump table built from row j − 1?
- [ ] By following one more parent from each entry of row j − 1
- [x] By jumping twice with row j − 1: `up[j][v] = up[j-1][up[j-1][v]]`
- [ ] By doubling every entry of row j − 1
> A jump of 2^j steps is two jumps of 2^(j−1). Following just one more parent would give j + 1 steps, not 2^j.

? You need the ancestor 13 steps above a node. Which jumps do you make?
- [ ] 13 jumps of 1
- [x] Jumps of 8, 4 and 1, the set bits of 13
- [ ] Jumps of 16 and then 3 back down
> 13 is 1101 in binary, so it's 8 + 4 + 1. Jumps can be made in any order, since they all follow the same pointers.

? In the LCA algorithm, after both nodes are at the same depth and different, why jump both by 2^j only when their ancestors differ?
- [x] Equal ancestors could be the LCA or above it; keeping them different stops just below the LCA, whose parent is the answer
- [ ] Because jumping past the root would crash
- [ ] Because the table only stores jumps that keep nodes apart
> If the ancestors 2^j up are equal, that jump might overshoot the LCA. Taking only the jumps that keep the nodes apart lands both just below it.

? Why does a sparse table answer a range *minimum* in O(1) but not a range *sum*?
- [ ] Sums need more memory
- [x] Two overlapping windows count the middle twice, which is harmless for a minimum but wrong for a sum
- [ ] Sums can be negative
> The two windows cover the range with some overlap. min(x, x) = x, but x + x ≠ x, so sums need disjoint pieces.

? The path from a to b in a rooted tree has `total[v]` = sum of the weights from the root to v. What is the path's sum?
- [ ] `total[a] + total[b]`
- [ ] `total[a] - total[b]`
- [x] `total[a] + total[b] - 2 * total[lca(a, b)]`
> Both totals include the part from the root to the LCA, which isn't on the path, so it's subtracted twice.
:::
