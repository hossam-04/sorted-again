---
id: 323
title: Count the Groups
own: true
module: graphs
patterns: [union-find, connected components]
signature: "def countComponents(self, n: int, edges: List[List[int]]) -> int"
lc_skip: Premium on LeetCode, so there are no published outputs to replay
---

## Task

There are `n` people, numbered 0 to `n − 1`, and a list of pairs `[a, b]` of people who know each other. Two people are in the same *group* if they're connected by a chain of acquaintances, so every person belongs to exactly one group, even someone who knows nobody.

Return the number of groups.

## Constraints

- `1 <= n <= 200_000`
- `0 <= len(edges) <= 200_000`
- `0 <= a, b < n`, `a != b`, and no pair appears twice

```json examples
[
  {"args": [6, [[0, 3], [3, 5], [1, 2]]], "out": 3, "why": "0, 3 and 5 are connected through 3; 1 and 2 know each other; 4 knows nobody and forms a group of one."},
  {"args": [4, [[0, 1], [2, 3], [1, 2]]], "out": 1, "why": "The first two pairs make two groups, and the third pair joins them into one."},
  {"args": [3, []], "out": 3, "why": "With no pairs at all, everyone is a group of their own."}
]
```

```json edge
[
  {"name": "one person", "args": [1, []], "out": 1},
  {"name": "a triangle and someone alone", "args": [4, [[0, 1], [1, 2], [2, 0]]], "out": 2},
  {"name": "a chain listed backwards", "args": [6, [[5, 4], [4, 3], [3, 2], [2, 1], [1, 0]]], "out": 1},
  {"name": "a star", "args": [5, [[0, 1], [0, 2], [0, 3], [0, 4]]], "out": 1}
]
```

```python oracle
class Solution:
    def countComponents(self, n: int, edges: List[List[int]]) -> int:
        adj = defaultdict(list)
        for a, b in edges:
            adj[a].append(b)
            adj[b].append(a)
        seen, groups = set(), 0
        for start in range(n):  # a search from every person not yet reached
            if start in seen:
                continue
            groups += 1
            seen.add(start)
            stack = [start]
            while stack:
                for nb in adj[stack.pop()]:
                    if nb not in seen:
                        seen.add(nb)
                        stack.append(nb)
        return groups
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 6) if size == "small" else rng.randint(6, 25)
    pairs = set()
    for _ in range(rng.randint(0, n) if size == "small" else rng.randint(0, 2 * n)):
        a, b = rng.randrange(n), rng.randrange(n)
        if a != b and (b, a) not in pairs:
            pairs.add((a, b))
    return [n, [list(p) for p in pairs]]
```

```python perf
def perf(rng):
    # 200,000 people and 150,000 random pairs.
    n = 200_000
    pairs = set()
    while len(pairs) < 150_000:
        a, b = rng.randrange(n), rng.randrange(n)
        if a != b and (b, a) not in pairs:
            pairs.add((a, b))
    return [n, [list(p) for p in pairs]]
```

## Hints

1. Start by counting everyone as their own group: n groups. Each pair either joins two different groups into one, or connects two people who are already in the same group.
2. So the answer is n minus the number of pairs that actually join two groups.
3. Union-find answers "same group already?" and joins groups in nearly O(1) each.

## Solution

```python solution time="(n + e) · α(n)" space="n"
class Solution:
    def countComponents(self, n: int, edges: List[List[int]]) -> int:
        parent, size = list(range(n)), [1] * n

        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]  # path halving
                x = parent[x]
            return x

        groups = n  # everyone alone to start with
        for a, b in edges:
            ra, rb = find(a), find(b)
            if ra != rb:
                if size[ra] < size[rb]:
                    ra, rb = rb, ra
                parent[rb] = ra  # union by size
                size[ra] += size[rb]
                groups -= 1  # two groups became one
        return groups
```

Every pair that connects two different groups merges them, so the count drops by one; a pair inside a group changes nothing. Counting the successful merges avoids a final pass over everyone. With union by size and path halving, each pair costs nearly O(1).

## Alternatives

### Search from everyone not yet reached

```python alt time="n + e" space="n + e"
class Solution:
    def countComponents(self, n: int, edges: List[List[int]]) -> int:
        adj = [[] for _ in range(n)]
        for a, b in edges:
            adj[a].append(b)
            adj[b].append(a)
        seen, groups = [False] * n, 0
        for start in range(n):
            if seen[start]:
                continue
            groups += 1  # a person no earlier search reached: a new group
            seen[start] = True
            stack = [start]
            while stack:
                for nb in adj[stack.pop()]:
                    if not seen[nb]:
                        seen[nb] = True
                        stack.append(nb)
        return groups
```

The same idea as counting islands in [[p:200]]: each search covers one whole group, and the number of searches is the number of groups. It needs the adjacency lists in memory, which union-find doesn't.

## Wrong answers

### Forgets people who know nobody

```python wrong fails="example" test="Example 1"
class Solution:
    def countComponents(self, n: int, edges: List[List[int]]) -> int:
        parent = {}

        def find(x):
            parent.setdefault(x, x)
            while parent[x] != x:
                x = parent[x]
            return x

        for a, b in edges:
            parent[find(a)] = find(b)
        return len({find(x) for x in parent})  # only people who appear in some pair
```

People who appear in no pair are never added to `parent`, so they're never counted, though each one is a group of their own. In Example 1, person 4 is missing from the count. Start from all n people.

### Counts the parents left over, not the roots

```python wrong fails="example" test="Example 1"
class Solution:
    def countComponents(self, n: int, edges: List[List[int]]) -> int:
        parent = list(range(n))

        def find(x):
            while parent[x] != x:
                x = parent[x]
            return x

        for a, b in edges:
            parent[find(a)] = find(b)
        return len(set(parent))  # parent values, not group roots
```

After the merges, `parent[x]` is only the next step up from x, not necessarily the root of its group. In Example 1, 0 points to 3 while 3 points to 5, so both 3 and 5 are counted, though 0, 3 and 5 are one group. Count `find(x)` for every x, or count successful merges.

### Relabels a whole group on every merge

```python wrong fails="perf"
class Solution:
    def countComponents(self, n: int, edges: List[List[int]]) -> int:
        group = list(range(n))  # group[x] = a label shared by everyone in x's group
        for a, b in edges:
            ga, gb = group[a], group[b]
            if ga != gb:
                for x in range(n):  # relabel everyone in b's group: a full scan
                    if group[x] == gb:
                        group[x] = ga
        return len(set(group))
```

Keeping one label per group makes the "same group?" check O(1), but every merge scans all n people to relabel one group. With 200,000 people and about 150,000 merges, that's tens of billions of steps. Union-find makes merging cheap too.
