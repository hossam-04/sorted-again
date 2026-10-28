---
id: 1569
module: number-theory
patterns: [counting interleavings with binomial coefficients, recursion on subtrees]
signature: "def numOfWays(self, nums: List[int]) -> int"
no_slow_wrong: the counting recursion is already O(n²) at worst; the only slower approach, trying all n! orders, can't even finish the edge cases
---

## Task

`nums` is an ordering of the numbers 1 to n. Inserting them one by one, in that order, into an empty binary search tree builds a particular tree. Return how many **other** orderings of `nums` build exactly the same tree, **modulo 1,000,000,007**.

## Constraints

- `1 <= len(nums) <= 1000`
- `nums` contains each number from 1 to `len(nums)` exactly once

```json examples
[
  {"args": [[2, 3, 1]], "out": 1, "why": "2 must come first, as the root; 1 and 3 can follow in either order. The only other ordering is [2, 1, 3]."},
  {"args": [[4, 2, 6, 1, 3, 5, 7]], "out": 79, "why": "The left subtree's numbers (1, 2, 3) and the right's (5, 6, 7) can interleave in C(6, 3) = 20 ways, and each subtree has 2 orders of its own: 20 × 2 × 2 = 80, minus the original."},
  {"args": [[1, 2, 3, 4]], "out": 0, "why": "Each number is the right child of the one before, so every number must come in exactly this order."}
]
```

```json edge
[
  {"name": "one number", "args": [[1]], "out": 0},
  {"name": "two numbers", "args": [[2, 1]], "out": 0},
  {"name": "one subtree of three", "args": [[1, 3, 2, 4]], "out": 1},
  {"name": "a count far above the modulus", "args": [[20, 10, 14, 13, 23, 12, 29, 8, 22, 1, 11, 9, 2, 3, 5, 27, 4, 21, 16, 24, 6, 7, 19, 17, 26, 30, 25, 18, 28, 15]], "out": 899175953}
]
```

```python oracle
class Solution:
    def numOfWays(self, nums: List[int]) -> int:
        def shape(order):  # the tree as nested tuples (value, left, right)
            def insert(tree, x):
                if tree is None:
                    return (x, None, None)
                v, l, r = tree
                return (v, insert(l, x), r) if x < v else (v, l, insert(r, x))
            tree = None
            for x in order:
                tree = insert(tree, x)
            return tree
        target = shape(nums)
        return (sum(1 for p in permutations(nums) if shape(p) == target) - 1) % 1_000_000_007
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 5) if size == "small" else rng.randint(5, 7)
    nums = list(range(1, n + 1))
    rng.shuffle(nums)
    return [nums]
```

```python perf
def perf(rng):
    # A random ordering of 1,000 numbers.
    nums = list(range(1, 1001))
    rng.shuffle(nums)
    return [nums]
```

## Hints

1. The first number is the root, whatever else happens. The rest split into the numbers smaller than the root, which build the left subtree, and the larger ones, which build the right.
2. Within each side, the relative order must build that side's subtree, and the two sides don't affect each other. So any valid order of the left side can be **interleaved** with any valid order of the right side.
3. Interleaving a sequence of L items with one of R items, keeping each one's own order, can be done in C(L + R, L) ways. So `ways(nums) = C(L + R, L) × ways(left) × ways(right)`. Subtract 1 for the original ordering, and take the remainder.

## Solution

```python solution time="n²" space="n"
class Solution:
    def numOfWays(self, nums: List[int]) -> int:
        mod = 1_000_000_007

        def ways(seq):  # orderings of seq that build the same tree as seq
            if len(seq) <= 2:
                return 1
            root = seq[0]
            left = [x for x in seq if x < root]   # in their original relative order
            right = [x for x in seq if x > root]
            return comb(len(left) + len(right), len(left)) * ways(left) * ways(right) % mod

        return (ways(nums) - 1) % mod
```

An ordering builds the same tree exactly when the root comes first and each side, on its own, is in an ordering that builds that side's subtree. The positions of the left side's numbers among the other n − 1 can be any of the C(n − 1, L) choices, and the two sides' own orders are counted recursively. That gives the product, and the original ordering is subtracted at the end.

Splitting the lists is O(n) per node, so O(n²) for a tree that's a single chain, and less for a balanced one. `math.comb` computes exact binomial coefficients, which Python can afford; the product is reduced at every level to keep the numbers small.

## Alternatives

### Binomials from Pascal's triangle, modulo p

```python alt time="n²" space="n²"
class Solution:
    def numOfWays(self, nums: List[int]) -> int:
        mod = 1_000_000_007
        n = len(nums)
        pascal = [[1] * (i + 1) for i in range(n)]  # pascal[i][j] = C(i, j) mod p
        for i in range(2, n):
            for j in range(1, i):
                pascal[i][j] = (pascal[i - 1][j - 1] + pascal[i - 1][j]) % mod

        def ways(seq):
            if len(seq) <= 2:
                return 1
            left = [x for x in seq if x < seq[0]]
            right = [x for x in seq if x > seq[0]]
            return pascal[len(seq) - 1][len(left)] * ways(left) * ways(right) % mod

        return (ways(nums) - 1) % mod
```

In languages without big integers, binomial coefficients modulo p come from Pascal's triangle, `C(i, j) = C(i − 1, j − 1) + C(i − 1, j)`, reduced as it's built: O(n²) additions for every coefficient up to n. For a single large binomial, factorials and modular inverses are faster (see the lesson); for all of them at once, the triangle is simplest.

## Wrong answers

### Counts the original ordering too

```python wrong fails="example" test="Example 1"
class Solution:
    def numOfWays(self, nums: List[int]) -> int:
        mod = 1_000_000_007

        def ways(seq):
            if len(seq) <= 2:
                return 1
            left = [x for x in seq if x < seq[0]]
            right = [x for x in seq if x > seq[0]]
            return comb(len(seq) - 1, len(left)) * ways(left) * ways(right) % mod

        return ways(nums)  # includes nums itself
```

The task asks for *other* orderings, so the given one must be taken away. Example 1 has two orderings that build the tree, and only one of them is new.

### Ignores how the two sides interleave

```python wrong fails="example" test="Example 1"
class Solution:
    def numOfWays(self, nums: List[int]) -> int:
        mod = 1_000_000_007

        def ways(seq):
            if len(seq) <= 2:
                return 1
            left = [x for x in seq if x < seq[0]]
            right = [x for x in seq if x > seq[0]]
            return ways(left) * ways(right) % mod  # forgot C(len - 1, len(left))

        return (ways(nums) - 1) % mod
```

Multiplying the two sides' counts treats the left side as coming entirely before the right. But the sides can be shuffled together in any way that keeps each one's order: in Example 1, 1 and 3 can come in either order after 2. That's the binomial factor.

### Forgets the remainder

```python wrong fails="edge" test="a count far above the modulus"
class Solution:
    def numOfWays(self, nums: List[int]) -> int:
        def ways(seq):
            if len(seq) <= 2:
                return 1
            left = [x for x in seq if x < seq[0]]
            right = [x for x in seq if x > seq[0]]
            return comb(len(seq) - 1, len(left)) * ways(left) * ways(right)

        return ways(nums) - 1  # exact, but not reduced
```

Python computes the exact count without complaint, but the task asks for its remainder. With 30 numbers the count is already about 4.5 × 10¹⁸, and with 1,000 it has hundreds of digits. Reduce modulo 10⁹ + 7.
