---
id: 703
module: heaps
patterns: [size-k min-heap, top k]
kind: design
class: KthLargest
---

## Task

A game shows, after every new score, the score you'd need to reach the top k. Build a class `KthLargest` that keeps track of it:

- `KthLargest(k, nums)` starts with the scores in `nums`.
- `add(val)` adds the score `val` and returns the k-th largest score so far. Equal scores count separately: in 9, 7, 7, 3 the second and third largest are both 7.

`nums` may hold fewer than k scores, but never fewer than k − 1, so there are always at least k scores after an `add`. Tests list the method names called in order, their arguments, and what each call returns (`None` for the constructor).

## Constraints

- `0 <= len(nums) <= 50_000`
- `1 <= k <= len(nums) + 1`
- `-10**4 <= nums[i], val <= 10**4`
- At most `50_000` calls to `add`

```python starter
class KthLargest:
    def __init__(self, k: int, nums: List[int]):
        pass

    def add(self, val: int) -> int:
        pass
```

```json examples
[
  {"ops": ["KthLargest", "add", "add", "add", "add"], "args": [[2, [5, 1, 7]], [3], [8], [6], [2]], "out": [null, 5, 7, 7, 7], "why": "With 5, 1, 7 and 3, the second largest is 5. Adding 8 makes 7 the second largest, and the smaller scores after it change nothing."},
  {"ops": ["KthLargest", "add", "add", "add"], "args": [[3, [4, 9]], [1], [10], [4]], "out": [null, 1, 4, 4], "why": "There are three scores only after the first add, so the third largest is then the smallest, 1. Equal scores count separately: in 10, 9, 4, 4, 1 the third largest is 4."},
  {"ops": ["KthLargest", "add", "add", "add"], "args": [[1, []], [-5], [-9], [0]], "out": [null, -5, -5, 0], "why": "With k = 1 the answer is simply the largest score so far."}
]
```

```json edge
[
  {"name": "duplicates count separately", "ops": ["KthLargest", "add"], "args": [[2, [5, 5]], [1]], "out": [null, 5]},
  {"name": "every score equal", "ops": ["KthLargest", "add", "add"], "args": [[3, [2, 2, 2]], [2], [2]], "out": [null, 2, 2]},
  {"name": "k is the full count", "ops": ["KthLargest", "add", "add"], "args": [[4, [10, 20, 30]], [5], [25]], "out": [null, 5, 10]},
  {"name": "new scores below the answer", "ops": ["KthLargest", "add", "add", "add"], "args": [[2, [50, 40, 30]], [1], [2], [3]], "out": [null, 40, 40, 40]},
  {"name": "a score equal to the answer", "ops": ["KthLargest", "add", "add"], "args": [[2, [1, 2]], [1], [2]], "out": [null, 1, 2]},
  {"name": "negative and positive", "ops": ["KthLargest", "add", "add"], "args": [[3, [-1, 0, 1]], [-2], [2]], "out": [null, -1, 0]}
]
```

```python oracle
class KthLargest:
    def __init__(self, k: int, nums: List[int]):
        self.k, self.nums = k, list(nums)

    def add(self, val: int) -> int:
        self.nums.append(val)
        return sorted(self.nums, reverse=True)[self.k - 1]
```

```python gen
def gen(rng, size):
    n = rng.randint(0, 5) if size == "small" else rng.randint(0, 60)
    hi = 5 if size == "small" else 100
    nums = [rng.randint(-hi, hi) for _ in range(n)]
    ops, args = ["KthLargest"], [[rng.randint(1, n + 1), nums]]
    for _ in range(rng.randint(1, 8) if size == "small" else rng.randint(10, 200)):
        ops.append("add")
        args.append([rng.randint(-hi, hi)])
    return {"ops": ops, "args": args}
```

```python perf
def perf(rng):
    # 30,000 starting scores and k = 1,000, then 30,000 adds.
    nums = [rng.randint(-10_000, 10_000) for _ in range(30_000)]
    ops, args = ["KthLargest"], [[1_000, nums]]
    for _ in range(30_000):
        ops.append("add")
        args.append([rng.randint(-10_000, 10_000)])
    return {"ops": ops, "args": args}
```

## Hints

1. You don't need every score. A score outside the k largest can never become the answer again, because scores are only ever added.
2. Keep the k largest scores in a min-heap. Its top, `heap[0]`, is the smallest of them, which is exactly the k-th largest.
3. To add a score, push it, and if the heap now holds more than k scores, pop the smallest. The constructor can add each starting score the same way.

## Solution

```python solution time="log k" space="k"
class KthLargest:
    def __init__(self, k: int, nums: List[int]):
        self.k = k
        self.heap = []  # the k largest scores so far; heap[0] is the smallest of them
        for x in nums:
            self.add(x)

    def add(self, val: int) -> int:
        heappush(self.heap, val)
        if len(self.heap) > self.k:
            heappop(self.heap)  # this score has dropped out of the top k
        return self.heap[0]
```

Only the k largest scores can ever matter, so the heap keeps exactly those. A min-heap puts the smallest of them on top, and the smallest of the k largest is the k-th largest: the answer is always `heap[0]`.

Each `add` is a push and maybe a pop on a heap of at most k + 1 scores, so it costs O(log k). The constructor makes n such calls, O(n log k), and the heap never holds more than k + 1 scores. When the heap is already full, `heappushpop(self.heap, val)` does the push and the pop in one step.

## Alternatives

### Keep every score in a sorted list

```python alt time="n" space="n"
class KthLargest:
    def __init__(self, k: int, nums: List[int]):
        self.k = k
        self.scores = sorted(nums)

    def add(self, val: int) -> int:
        insort(self.scores, val)  # binary search for the spot, then shift the larger scores right
        return self.scores[-self.k]
```

With all scores sorted, the k-th largest is `scores[-k]`. Finding the spot for a new score is a binary search, but inserting it shifts every larger score one place: O(n) per add. The shift is a single fast block move, so this is quick for tens of thousands of scores. The heap stays at k scores however long the stream gets.

## Wrong answers

### Keeps every starting score

```python wrong fails="example" test="Example 1"
class KthLargest:
    def __init__(self, k: int, nums: List[int]):
        self.k = k
        self.heap = list(nums)
        heapify(self.heap)  # every starting score, not just the k largest

    def add(self, val: int) -> int:
        heappush(self.heap, val)
        if len(self.heap) > self.k:
            heappop(self.heap)
        return self.heap[0]
```

`add` removes at most one score, so if the constructor keeps more than k, the heap never shrinks back to k. With k = 2 and the scores 5, 1, 7, adding 3 leaves 3, 5, 7 in the heap, and its top, 3, is the third largest. Trim the heap to k scores in the constructor, or build it by calling `add` for each score.

### Never lets the heap grow

```python wrong fails="example" test="Example 2"
class KthLargest:
    def __init__(self, k: int, nums: List[int]):
        self.k = k
        self.heap = nlargest(k, nums)
        heapify(self.heap)

    def add(self, val: int) -> int:
        heappushpop(self.heap, val)  # keeps the size fixed, even when it's below k
        return self.heap[0]
```

`heappushpop` pushes and then pops, so the heap's size never changes. That's right once the heap holds k scores, but `nums` can start with only k − 1. In Example 2 the heap stays at 4 and 9, and the first answer is 4 instead of 1. Push without popping until the heap has k scores.

### Sorts every score on every add

```python wrong fails="perf"
class KthLargest:
    def __init__(self, k: int, nums: List[int]):
        self.k = k
        self.nums = list(nums)

    def add(self, val: int) -> int:
        self.nums.append(val)
        self.nums.sort()  # sorts all the scores again, every time
        return self.nums[-self.k]
```

This is correct, but every add sorts the whole list again. Even though the list is almost sorted, each sort still has to read every score, so 30,000 adds to 30,000 scores make about a billion comparisons. The heap keeps only the k scores that can still matter.
