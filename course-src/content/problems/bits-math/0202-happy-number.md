---
id: 202
module: bits-math
patterns: [cycle detection, sum of digit squares]
signature: "def isHappy(self, n: int) -> bool"
perf_repeat: 2000
no_slow_wrong: every number reaches 1 or a loop within a couple of dozen steps, so no correct approach is slow
---

## Task

Start from `n` and keep replacing the number with the sum of the squares of its digits. For example, 7 → 49 (7²) → 97 (4² + 9²) → 130 → 10 → 1. A number is *happy* if this process reaches 1. If it doesn't, it goes round a loop of numbers forever.

Return whether `n` is happy.

## Constraints

- `1 <= n <= 2**31 - 1`

```json examples
[
  {"args": [23], "out": true, "why": "23 → 4 + 9 = 13 → 1 + 9 = 10 → 1."},
  {"args": [4], "out": false, "why": "4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4: back where it started, so it loops forever without reaching 1."},
  {"args": [100], "out": true, "why": "1² + 0² + 0² = 1 straight away."}
]
```

```json edge
[
  {"name": "one", "args": [1], "out": true},
  {"name": "seven", "args": [7], "out": true},
  {"name": "unhappy, and never back to the start", "args": [11], "out": false},
  {"name": "seven ones", "args": [1111111], "out": true},
  {"name": "the largest input", "args": [2147483647], "out": false},
  {"name": "a billion", "args": [1000000000], "out": true}
]
```

```python oracle
class Solution:
    def isHappy(self, n: int) -> bool:
        history = []
        while n not in history:  # follow the sequence until some number comes round again
            history.append(n)
            n = sum(int(d) ** 2 for d in str(n))
        return n == 1  # 1 leads to 1, so a happy number repeats at 1
```

```python gen
def gen(rng, size):
    if size == "small":
        return [rng.randint(1, 100)]
    return [rng.choice([rng.randint(1, 10**6), rng.randint(1, 2**31 - 1)])]
```

```python perf
def perf(rng):
    # The largest input: 11 steps until a number repeats. Checked 2,000 times.
    return [2**31 - 1]
```

## Hints

1. Follow the process by hand from 4. What happens?
2. If the process never reaches 1, some number must come round again: after the first step every number is small (10 digits give at most 10 × 81 = 810), so there are only so many numbers to visit. Once a number repeats, everything after it repeats too.
3. Keep a set of the numbers seen so far, and stop when you reach 1 or meet a number you've already seen.

## Solution

```python solution time="log n" space="log n"
class Solution:
    def isHappy(self, n: int) -> bool:
        def next_number(x):  # the sum of the squares of x's digits
            total = 0
            while x:
                x, digit = divmod(x, 10)
                total += digit * digit
            return total

        seen = set()
        while n != 1 and n not in seen:
            seen.add(n)
            n = next_number(n)
        return n == 1
```

The sequence either reaches 1 or repeats a number, and a repeat means a loop: every number has exactly one successor, so once a number comes round again, the same numbers follow it as before, forever. The set notices the repeat.

It always ends quickly. A number with d digits leads to at most 81·d, so after one step from a 10-digit number everything is at most 810, and from then on the numbers stay small. In fact every unhappy number ends up in the same loop, the one through 4 from Example 2. The first step costs O(log n), one operation per digit; after that only a bounded number of small steps remain.

## Alternatives

### A slow and a fast walker

```python alt time="log n" space="1"
class Solution:
    def isHappy(self, n: int) -> bool:
        def next_number(x):
            total = 0
            while x:
                x, digit = divmod(x, 10)
                total += digit * digit
            return total

        slow, fast = n, next_number(n)
        while fast != 1 and slow != fast:
            slow = next_number(slow)                # one step
            fast = next_number(next_number(fast))   # two steps
        return fast == 1
```

The numbers form a chain where every number points to the next one, just like a linked list. Floyd's cycle detection from [[p:141]] works unchanged: the fast walker either reaches 1 (which leads only to itself) or catches up with the slow one inside the loop. No set needed: O(1) memory.

## Wrong answers

### Never checks for a loop

```python wrong fails="example" how="timeout" test="Example 2"
class Solution:
    def isHappy(self, n: int) -> bool:
        while n != 1:  # for an unhappy number, this never ends
            n = sum(int(d) ** 2 for d in str(n))
        return True
```

For a happy number this works. For an unhappy one, the numbers go round the loop forever and the function never returns. "Not happy" means "loops", so the loop has to be detected.

### Stops at a single digit

```python wrong fails="edge" test="seven"
class Solution:
    def isHappy(self, n: int) -> bool:
        while n >= 10:
            n = sum(int(d) ** 2 for d in str(n))
        return n == 1  # assumes only 1 is a happy single digit
```

Stopping at a single digit sounds safe, but 7 is happy too: 7 → 49 → 97 → 130 → 10 → 1. This returns `False` for 7, and for every number that passes through 7 on the way, such as 1,111,111. Detect the loop instead of guessing where it ends.

### Waits for the start to come back

```python wrong fails="edge" how="timeout" test="unhappy, and never back to the start"
class Solution:
    def isHappy(self, n: int) -> bool:
        start = n
        while n != 1:
            n = sum(int(d) ** 2 for d in str(n))
            if n == start:  # a loop is assumed to come back to n itself
                return False
        return True
```

A loop doesn't have to include the starting number. 11 goes to 2 and then to 4, and the loop runs through 4, 16, 37, 58, 89, 145, 42 and 20, but never through 11 or 2 again. So this check never fires and the function runs forever. It passes Example 2 only because 4 happens to be in the loop. Remember every number seen, not just the first.
