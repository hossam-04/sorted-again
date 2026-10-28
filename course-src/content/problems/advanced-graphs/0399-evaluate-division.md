---
id: 399
module: advanced-graphs
patterns: [weighted union-find, ratios to a root]
signature: "def calcEquation(self, equations: List[List[str]], values: List[float], queries: List[List[str]]) -> List[float]"
compare: float
---

## Task

Each equation `[a, b]` with value `values[i]` says that `a / b = values[i]`, where `a` and `b` are variables named by short strings. The equations never contradict each other, and every value is positive.

For each query `[c, d]`, return `c / d` if the equations determine it, or `-1.0` if they don't, which includes any query mentioning a variable that appears in no equation (even `x / x` for such an x). Answers within 10⁻⁵ of the exact values are accepted.

## Constraints

- `1 <= len(equations) == len(values) <= 10_000`
- `1 <= len(queries) <= 10_000`
- Variable names are 1 to 5 lowercase letters and digits
- `0.0 < values[i] <= 20.0`

```json examples
[
  {"args": [[["x", "y"], ["y", "z"]], [4.0, 0.5], [["x", "z"], ["z", "x"], ["y", "y"], ["x", "w"]]], "out": [2.0, 0.5, 1.0, -1.0], "why": "x/z = (x/y) × (y/z) = 4 × 0.5 = 2, and z/x is its inverse. w appears in no equation, so x/w can't be determined."},
  {"args": [[["p", "q"], ["r", "s"]], [3.0, 2.0], [["p", "s"], ["q", "p"], ["s", "s"]]], "out": [-1.0, 0.33333, 1.0], "why": "No chain of equations links p to s. q/p is the inverse of p/q = 3."},
  {"args": [[["a", "b"], ["c", "b"]], [6.0, 3.0], [["a", "c"], ["c", "a"]]], "out": [2.0, 0.5], "why": "a/c = (a/b) ÷ (c/b) = 6 ÷ 3: a chain can use an equation backwards."}
]
```

```json edge
[
  {"name": "an unknown variable over itself", "args": [[["a", "b"]], [2.0], [["z", "z"]]], "out": [-1.0]},
  {"name": "one equation both ways", "args": [[["k", "m"]], [5.0], [["k", "m"], ["m", "k"]]], "out": [5.0, 0.2]},
  {"name": "a long chain", "args": [[["a1", "a2"], ["a2", "a3"], ["a3", "a4"], ["a4", "a5"], ["a5", "a6"]], [2.0, 2.0, 2.0, 2.0, 2.0], [["a1", "a6"], ["a6", "a1"]]], "out": [32.0, 0.03125]},
  {"name": "a value below one", "args": [[["u", "v"]], [0.25], [["v", "u"]]], "out": [4.0]},
  {"name": "longer names", "args": [[["ab", "cd1"], ["cd1", "e9"]], [1.5, 2.0], [["e9", "ab"]]], "out": [0.33333]},
  {"name": "two groups joined later", "args": [[["a", "b"], ["c", "d"], ["b", "c"]], [2.0, 5.0, 3.0], [["a", "d"], ["d", "a"]]], "out": [30.0, 0.03333]},
  {"name": "one variable on the left twice", "args": [[["a", "b"], ["a", "c"]], [2.0, 3.0], [["b", "c"]]], "out": [1.5]}
]
```

```python oracle
class Solution:
    def calcEquation(self, equations: List[List[str]], values: List[float], queries: List[List[str]]) -> List[float]:
        adj = defaultdict(list)
        for (a, b), v in zip(equations, values):
            adj[a].append((b, v))
            adj[b].append((a, 1 / v))
        out = []
        for c, d in queries:
            if c not in adj or d not in adj:
                out.append(-1.0)
                continue
            ratio = {c: 1.0}  # ratio[x] = c / x
            todo = [c]
            for x in todo:
                for y, v in adj[x]:
                    if y not in ratio:
                        ratio[y] = ratio[x] * v
                        todo.append(y)
            out.append(ratio.get(d, -1.0))
        return out
```

```python gen
def gen(rng, size):
    names = [f"v{i}" for i in range(rng.randint(2, 6) if size == "small" else rng.randint(10, 60))]
    worth = {x: rng.choice([0.5, 1.0, 2.0, 3.0, 4.0]) for x in names}  # a hidden value for each variable
    equations, values = [], []
    for _ in range(rng.randint(1, 5) if size == "small" else rng.randint(5, 80)):
        a, b = rng.sample(names, 2)
        equations.append([a, b])
        values.append(worth[a] / worth[b])
    pool = names + ["zz"]
    queries = [[rng.choice(pool), rng.choice(pool)] for _ in range(rng.randint(1, 6) if size == "small" else rng.randint(10, 60))]
    return [equations, values, queries]
```

```python perf
def perf(rng):
    # 10,000 variables in one long chain, with ratios close to 1, and 10,000 queries between random pairs.
    names = [f"n{i}" for i in range(10_001)]
    equations = [[names[i], names[i + 1]] for i in range(10_000)]
    values = [rng.uniform(0.95, 1.05) for _ in range(10_000)]
    queries = [[rng.choice(names), rng.choice(names)] for _ in range(10_000)]
    return [equations, values, queries]
```

## Hints

1. Think of a graph: an equation `a / b = v` is an edge from a to b with weight v, and from b to a with weight 1 / v. A query asks for the product of the weights along any path from c to d.
2. One search per query works, but long chains and many queries make it slow. Variables connected by equations form groups, and within a group every variable can be expressed relative to one representative.
3. Use a **weighted union-find**: each variable stores its parent and the ratio `x / parent`. `find(x)` returns the root and `x / root`, multiplying ratios along the way (and compressing the path). Then `c / d = (c / root) / (d / root)` when c and d share a root.

## Solution

```python solution time="(e + q) α(n)" space="n"
class Solution:
    def calcEquation(self, equations: List[List[str]], values: List[float], queries: List[List[str]]) -> List[float]:
        parent, ratio = {}, {}  # ratio[x] = x / parent[x]

        def find(x):  # returns (root, x / root), and points x straight at its root
            path = []
            while parent[x] != x:
                path.append(x)
                x = parent[x]
            root, product = x, 1.0
            for y in reversed(path):  # nearest to the root first
                product *= ratio[y]
                parent[y], ratio[y] = root, product
            return root, (ratio[path[0]] if path else 1.0)

        for (a, b), v in zip(equations, values):
            for x in (a, b):
                if x not in parent:
                    parent[x], ratio[x] = x, 1.0
            ra, a_over_ra = find(a)
            rb, b_over_rb = find(b)
            if ra != rb:  # hang a's root under b's root: ra / rb = (a / b) * (b / rb) / (a / ra)
                parent[ra], ratio[ra] = rb, v * b_over_rb / a_over_ra
        out = []
        for c, d in queries:
            if c not in parent or d not in parent:
                out.append(-1.0)
                continue
            rc, c_over = find(c)
            rd, d_over = find(d)
            out.append(c_over / d_over if rc == rd else -1.0)
        return out
```

Union-find from [[m:graphs]] keeps groups; here each link also carries a number, the ratio of a variable to its parent. Multiplying the ratios up the path gives `x / root`, and two variables with the same root divide through it: `c / d = (c / root) ÷ (d / root)`. Path compression points every variable it passes straight at the root, with its ratio to the root, so later finds are short.

Joining two groups needs the ratio between their roots. From `a / b = v`, `a / ra` and `b / rb`, it follows that `ra / rb = v × (b / rb) ÷ (a / ra)`. Each equation and each query costs nearly O(1) amortised. The same trick, with sums instead of products, handles equations like `x − y = 5`.

## Alternatives

### One search per group

```python alt time="n + e + q" space="n + e"
class Solution:
    def calcEquation(self, equations: List[List[str]], values: List[float], queries: List[List[str]]) -> List[float]:
        adj = defaultdict(list)
        for (a, b), v in zip(equations, values):
            adj[a].append((b, v))
            adj[b].append((a, 1 / v))
        group, worth = {}, {}  # worth[x] = x / (the first variable of x's group)
        for start in adj:
            if start in group:
                continue
            group[start], worth[start] = start, 1.0
            todo = [start]
            for x in todo:
                for y, v in adj[x]:  # x / y = v, so y / start = (x / start) / v
                    if y not in group:
                        group[y], worth[y] = start, worth[x] / v
                        todo.append(y)
        out = []
        for c, d in queries:
            if c in group and d in group and group[c] == group[d]:
                out.append(worth[c] / worth[d])
            else:
                out.append(-1.0)
        return out
```

The graph view without repeating work: one search per *group* of connected variables, giving each variable its value relative to the group's first variable. Then every query is a single division, or -1 when the two variables are in different groups. It's O(n + e + q) for n variables, e equations and q queries, and works whenever all the equations come before all the queries; union-find also handles equations and queries mixed together.

## Wrong answers

### Answers x / x with 1 even for unknown x

```python wrong fails="edge" test="an unknown variable over itself"
class Solution:
    def calcEquation(self, equations: List[List[str]], values: List[float], queries: List[List[str]]) -> List[float]:
        adj = defaultdict(list)
        for (a, b), v in zip(equations, values):
            adj[a].append((b, v))
            adj[b].append((a, 1 / v))
        out = []
        for c, d in queries:
            if c == d:
                out.append(1.0)  # even when c appears in no equation
                continue
            ratio, todo = {c: 1.0}, [c]
            for x in todo:
                for y, v in adj[x]:
                    if y not in ratio:
                        ratio[y] = ratio[x] * v
                        todo.append(y)
            out.append(ratio.get(d, -1.0))
        return out
```

Algebra says x / x = 1, but the task says a variable that appears in no equation is unknown, and any query mentioning it gets -1. Check that both variables have been seen before answering.

### Uses each equation in one direction only

```python wrong fails="example" test="Example 1"
class Solution:
    def calcEquation(self, equations: List[List[str]], values: List[float], queries: List[List[str]]) -> List[float]:
        adj = defaultdict(list)
        seen = set()
        for (a, b), v in zip(equations, values):
            adj[a].append((b, v))  # no edge from b back to a
            seen.update((a, b))
        out = []
        for c, d in queries:
            if c not in seen or d not in seen:
                out.append(-1.0)
                continue
            ratio, todo = {c: 1.0}, [c]
            for x in todo:
                for y, v in adj[x]:
                    if y not in ratio:
                        ratio[y] = ratio[x] * v
                        todo.append(y)
            out.append(ratio.get(d, -1.0))
        return out
```

`a / b = v` also says `b / a = 1 / v`. Without the reverse edges, a chain can only follow equations forwards, so in Example 1, z/x can't be found from x/y and y/z, and comes out as -1.

### Joins the variables instead of their roots

```python wrong fails="edge" test="one variable on the left twice"
class Solution:
    def calcEquation(self, equations: List[List[str]], values: List[float], queries: List[List[str]]) -> List[float]:
        parent, ratio = {}, {}

        def find(x):
            product = 1.0
            while parent[x] != x:
                product *= ratio[x]
                x = parent[x]
            return x, product

        for (a, b), v in zip(equations, values):
            for x in (a, b):
                if x not in parent:
                    parent[x], ratio[x] = x, 1.0
            parent[a], ratio[a] = b, v  # overwrites a's old link: its group may fall apart
        out = []
        for c, d in queries:
            if c not in parent or d not in parent:
                out.append(-1.0)
                continue
            rc, c_over = find(c)
            rd, d_over = find(d)
            out.append(c_over / d_over if rc == rd else -1.0)
        return out
```

Pointing `a` straight at `b` throws away whatever `a` was already linked to. That goes unnoticed while every variable on the left is new, as in all three examples, but with `a / b = 2` and then `a / c = 3`, the second link replaces the first, b and c end up in different groups, and b / c comes out as -1 instead of 1.5. Union-find must join the *roots* of the two groups, with the ratio between the roots worked out from the equation.

### Searches the graph for every query

```python wrong fails="perf"
class Solution:
    def calcEquation(self, equations: List[List[str]], values: List[float], queries: List[List[str]]) -> List[float]:
        adj = defaultdict(list)
        for (a, b), v in zip(equations, values):
            adj[a].append((b, v))
            adj[b].append((a, 1 / v))
        out = []
        for c, d in queries:
            if c not in adj or d not in adj:
                out.append(-1.0)
                continue
            ratio = {c: 1.0}  # ratio[x] = c / x
            queue = deque([c])
            while queue and d not in ratio:
                x = queue.popleft()
                for y, v in adj[x]:
                    if y not in ratio:
                        ratio[y] = ratio[x] * v
                        queue.append(y)
            out.append(ratio.get(d, -1.0))
        return out
```

The graph view, done directly: a breadth-first search from c, multiplying ratios along the way, until d is reached. For LeetCode's 20 equations it's the simplest answer. In the test, though, the variables form one chain of 10,000, and each of the 10,000 queries searches thousands of them: tens of millions of steps. Union-find, or one search per group, does that work once.
