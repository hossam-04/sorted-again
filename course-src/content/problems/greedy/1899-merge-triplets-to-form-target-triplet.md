---
id: 1899
module: greedy
patterns: [discard what can't be used, cover each target value]
signature: "def mergeTriplets(self, triplets: List[List[int]], target: List[int]) -> bool"
no_slow_wrong: one look at each triplet decides everything, and the natural slower ideas are wrong rather than slow
---

## Task

You get a list of `triplets`, each a list of three integers, and a `target` triplet. In one step you may pick two triplets i and j and replace triplet j with their element-wise maximum: `[max(a_i, a_j), max(b_i, b_j), max(c_i, c_j)]`.

Return `True` if, after any number of steps (possibly none), some triplet in the list equals `target`.

## Constraints

- `1 <= len(triplets) <= 100_000`
- `1 <=` every value `<= 1000`

```json examples
[
  {"args": [[[1, 4, 2], [3, 1, 2], [2, 2, 5]], [3, 4, 2]], "out": true, "why": "Merging [1, 4, 2] with [3, 1, 2] gives [3, 4, 2]. [2, 2, 5] can't be used: its 5 would push the third value past 2, and values never go down."},
  {"args": [[[5, 1, 1], [1, 5, 1]], [5, 5, 5]], "out": false, "why": "No triplet has a 5 in third place, and merging only ever takes maxima, so a third value of 5 can never appear."},
  {"args": [[[2, 3, 4]], [2, 3, 4]], "out": true, "why": "The target is already in the list: zero steps are allowed."}
]
```

```json edge
[
  {"name": "a value only in an unusable triplet", "args": [[[3, 9, 1], [1, 1, 1]], [3, 1, 1]], "out": false},
  {"name": "everything too small", "args": [[[1, 1, 1]], [2, 2, 2]], "out": false},
  {"name": "one value from each triplet", "args": [[[4, 1, 1], [1, 4, 1], [1, 1, 4]], [4, 4, 4]], "out": true}
]
```

```python oracle
class Solution:
    def mergeTriplets(self, triplets: List[List[int]], target: List[int]) -> bool:
        reachable = {tuple(t) for t in triplets}  # every triplet any sequence of merges can produce
        while True:
            new = {tuple(max(a, b) for a, b in zip(x, y)) for x in reachable for y in reachable} - reachable
            if not new:
                return tuple(target) in reachable
            reachable |= new
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 4) if size == "small" else rng.randint(4, 9)
    hi = 4 if size == "small" else 6
    target = [rng.randint(1, hi) for _ in range(3)]
    triplets = []
    for _ in range(n):
        t = [rng.randint(1, hi) for _ in range(3)]
        if rng.random() < 0.5:  # often aim close to the target
            t[rng.randrange(3)] = target[rng.randrange(3)]
        triplets.append(t)
    return [triplets, target]
```

```python perf
def perf(rng):
    # 100,000 random triplets.
    triplets = [[rng.randint(1, 1000) for _ in range(3)] for _ in range(100_000)]
    return [triplets, [rng.randint(500, 1000) for _ in range(3)]]
```

## Hints

1. Merging takes maxima, so values can only grow. A triplet with any value *above* the target's can never be part of a merge that ends at the target.
2. Every triplet that's at most the target in all three places is safe to merge: merging all of them gives the largest triplet you can reach without overshooting.
3. So the answer is yes exactly when, among the safe triplets, each of the three target values appears in its position in at least one of them.

## Solution

```python solution time="n" space="1"
class Solution:
    def mergeTriplets(self, triplets: List[List[int]], target: List[int]) -> bool:
        x, y, z = target
        found = [False, False, False]
        for a, b, c in triplets:
            if a <= x and b <= y and c <= z:  # safe: merging it can't overshoot the target
                found[0] |= a == x
                found[1] |= b == y
                found[2] |= c == z
        return all(found)
```

Merging is a running maximum, so once a value is too big it stays too big: triplets that exceed the target anywhere must never be used. Every other triplet is harmless to include, so the best you can do is merge all of them, and that merge equals the target exactly when each target value appears in its place among them. One pass: O(n) time, O(1) space.

## Alternatives

### Merge all the safe triplets

```python alt time="n" space="1"
class Solution:
    def mergeTriplets(self, triplets: List[List[int]], target: List[int]) -> bool:
        merged = [0, 0, 0]
        for t in triplets:
            if all(v <= goal for v, goal in zip(t, target)):
                merged = [max(m, v) for m, v in zip(merged, t)]  # merge every safe triplet
        return merged == target
```

The same idea, written as the merge itself: combine every triplet that doesn't overshoot, and compare the result with the target.

## Wrong answers

### Merges every triplet

```python wrong fails="example" test="Example 1"
class Solution:
    def mergeTriplets(self, triplets: List[List[int]], target: List[int]) -> bool:
        merged = [0, 0, 0]
        for t in triplets:
            merged = [max(m, v) for m, v in zip(merged, t)]  # including triplets that overshoot
        return merged == target
```

Merging everything lets triplets with a value above the target ruin the result: in Example 1, `[2, 2, 5]` pushes the third value to 5. Skip any triplet that's larger than the target in some position.

### Finds each value without checking the rest of its triplet

```python wrong fails="edge" test="a value only in an unusable triplet"
class Solution:
    def mergeTriplets(self, triplets: List[List[int]], target: List[int]) -> bool:
        return all(any(t[k] == target[k] for t in triplets) for k in range(3))  # any triplet, even one that overshoots
```

Finding each target value somewhere isn't enough: the triplet it's in must be usable. In `[[3, 9, 1], [1, 1, 1]]`, the 3 needed in first place only comes with a 9 in second place, which would overshoot the target `[3, 1, 1]`.

### Looks for the target itself

```python wrong fails="example" test="Example 1"
class Solution:
    def mergeTriplets(self, triplets: List[List[int]], target: List[int]) -> bool:
        return target in triplets  # forgets that merges can build it
```

The target doesn't have to be in the list already: merging can assemble it from pieces, as in Example 1, where no single triplet is `[3, 4, 2]`.
