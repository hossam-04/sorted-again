---
id: 698
module: advanced-dp
patterns: [bitmask DP over subsets, filling one bucket at a time]
signature: "def canPartitionKSubsets(self, nums: List[int], k: int) -> bool"
---

## Task

Return `True` if `nums` can be split into exactly `k` groups (every number in exactly one group, no group empty) whose sums are all equal, and `False` otherwise.

## Constraints

- `1 <= k <= len(nums) <= 16`
- `1 <= nums[i] <= 10**4`
- No value appears more than 4 times

```json examples
[
  {"args": [[5, 1, 4, 2, 3, 3], 3], "out": true, "why": "The total is 18, so each group needs 6: {5, 1}, {4, 2} and {3, 3}."},
  {"args": [[2, 2, 2, 2, 3, 3], 2], "out": true, "why": "Two groups of 2 + 2 + 3. Putting both 3s in the same group first would make it impossible."},
  {"args": [[1, 1, 1, 7], 2], "out": false, "why": "Each group would need 5, but 7 alone is more than that."}
]
```

```json edge
[
  {"name": "one group", "args": [[4, 5, 6], 1], "out": true},
  {"name": "every number on its own", "args": [[3, 3, 3, 3], 4], "out": true},
  {"name": "a total that doesn't divide", "args": [[1, 2, 3, 5], 2], "out": false},
  {"name": "the right total, no partition", "args": [[2, 2, 2, 5, 5], 2], "out": false},
  {"name": "pairs", "args": [[1, 1, 1, 1, 2, 2, 2, 2], 4], "out": true},
  {"name": "sixteen numbers", "args": [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], 4], "out": true}
]
```

```python oracle
class Solution:
    def canPartitionKSubsets(self, nums: List[int], k: int) -> bool:
        total = sum(nums)
        if total % k:
            return False
        target = total // k
        nums = sorted(nums, reverse=True)
        buckets = [0] * k

        def place(i):
            if i == len(nums):
                return True
            tried = set()
            for b in range(k):
                if buckets[b] + nums[i] <= target and buckets[b] not in tried:
                    tried.add(buckets[b])
                    buckets[b] += nums[i]
                    if place(i + 1):
                        return True
                    buckets[b] -= nums[i]
            return False

        return place(0)
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 6) if size == "small" else rng.randint(6, 12)
    k = rng.randint(1, n)
    nums = []
    while len(nums) < n:
        v = rng.randint(1, 10 if size == "small" else 50)
        if nums.count(v) < 4:
            nums.append(v)
    if rng.random() < 0.5:  # nudge the total to a multiple of k, so the hard case comes up often
        nums[-1] += (-sum(nums)) % k
    return [nums, k]
```

```python perf
def perf(rng):
    # Sixteen numbers whose total divides by 4, but which can't be split: every attempt has to fail.
    return [[28, 27, 14, 11, 23, 4, 21, 6, 31, 1, 14, 44, 17, 4, 20, 31], 4]
```

## Hints

1. The total must divide by k, and each group then needs `target = total // k`. Trying every assignment of numbers to groups is k¹⁶, about 4 billion for k = 4, and most of those assignments are the same partition with the groups renamed.
2. Fill the groups one at a time instead. Then the only thing that matters about a partial solution is *which* numbers are used: their sum says how many groups are full and how far the current one is filled. With 16 numbers, the used set is a 16-bit mask: 65,536 states.
3. Let `fill[mask]` be the current group's fill after using exactly the numbers in `mask`, or -1 if that set can't be reached. From each reachable mask, try adding each unused number that fits in the current group (`fill + x <= target`). The answer is whether the full mask is reachable.

## Solution

```python solution time="2^n · n" space="2^n"
class Solution:
    def canPartitionKSubsets(self, nums: List[int], k: int) -> bool:
        total = sum(nums)
        if total % k:
            return False
        target = total // k
        nums = sorted(nums)
        if nums[-1] > target:
            return False
        n = len(nums)
        fill = [-1] * (1 << n)  # fill[mask]: how full the current group is, using the numbers in mask
        fill[0] = 0
        for mask in range(1 << n):  # every subset after its own subsets: they're smaller numbers
            f = fill[mask]
            if f < 0:
                continue  # this set of numbers can't be arranged into full groups plus one partial one
            for i, x in enumerate(nums):
                if f + x > target:
                    break  # sorted: every later number is too big as well
                if not mask >> i & 1:
                    fill[mask | 1 << i] = (f + x) % target  # a full group starts the next one at 0
        return fill[-1] == 0
```

Filling groups one after another removes the "which group?" choice: each new number goes into the current group, which must not overflow, and when it's exactly full, the next group starts. After that, a partial solution is described by its set of used numbers alone, because their sum fixes how many groups are full and how full the current one is. So the state space is the 2ⁿ subsets, a **bitmask DP**.

Masks are processed in increasing order, and adding a number always makes the mask larger, so every state is complete before it's used. Sorting lets the inner loop stop at the first number that doesn't fit. That's O(2ⁿ · n) time and O(2ⁿ) memory: about a million steps for 16 numbers, whatever k is.

## Alternatives

### Backtracking with pruning

```python alt time="k^n" space="n"
class Solution:
    def canPartitionKSubsets(self, nums: List[int], k: int) -> bool:
        total = sum(nums)
        if total % k:
            return False
        target = total // k
        nums = sorted(nums, reverse=True)  # big numbers first: dead ends show up sooner
        buckets = [0] * k

        def place(i):
            if i == len(nums):
                return True
            tried = set()
            for b in range(k):
                if buckets[b] + nums[i] <= target and buckets[b] not in tried:
                    tried.add(buckets[b])  # two groups with the same fill are interchangeable
                    buckets[b] += nums[i]
                    if place(i + 1):
                        return True
                    buckets[b] -= nums[i]
            return False

        return place(0)
```

Assign numbers to groups one by one, largest first, and never try two groups with the same current fill for the same number: those choices lead to the same partitions with the groups renamed. On most inputs this is fast, but its worst case is still exponential in a way the bitmask DP's isn't. It's the answer most people write, and the pruning is what makes it pass.

## Wrong answers

### Only checks the total

```python wrong fails="example" test="Example 3"
class Solution:
    def canPartitionKSubsets(self, nums: List[int], k: int) -> bool:
        return sum(nums) % k == 0  # necessary, not sufficient
```

A total that divides by k is necessary, but the numbers also have to fit. In Example 3 the total is 10, so each group needs 5, and the 7 can't go anywhere.

### Places each number in the first group with room

```python wrong fails="example" test="Example 2"
class Solution:
    def canPartitionKSubsets(self, nums: List[int], k: int) -> bool:
        total = sum(nums)
        if total % k:
            return False
        target = total // k
        buckets = [0] * k
        for x in sorted(nums, reverse=True):
            for b in range(k):
                if buckets[b] + x <= target:  # the first group it fits in, never reconsidered
                    buckets[b] += x
                    break
            else:
                return False
        return True
```

Largest first into the first group with room sounds like bin packing's sensible greedy, but it never undoes a choice. In Example 2 both 3s go into the first group (3 + 3 = 6 ≤ 7), and the four 2s can't make up the rest: no group has room for the last 2. The right answer needs one 3 in each group.

### Tries every assignment without pruning

```python wrong fails="perf"
class Solution:
    def canPartitionKSubsets(self, nums: List[int], k: int) -> bool:
        total = sum(nums)
        if total % k:
            return False
        target = total // k
        buckets = [0] * k

        def place(i):
            if i == len(nums):
                return True
            for b in range(k):  # every group, even ones that look exactly alike
                if buckets[b] + nums[i] <= target:
                    buckets[b] += nums[i]
                    if place(i + 1):
                        return True
                    buckets[b] -= nums[i]
            return False

        return place(0)
```

Correct, since it tries everything, and fast when a partition exists early. When none exists it explores every arrangement, including all renamings of the groups: on the test's sixteen numbers that's about 25 million calls before it can say no. The bitmask DP looks at each of the 65,536 sets of numbers at most once.
