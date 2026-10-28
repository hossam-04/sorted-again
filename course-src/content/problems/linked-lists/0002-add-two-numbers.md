---
id: 2
module: linked-lists
patterns: [digit-by-digit addition, carry]
signature: "def addTwoNumbers(self, l1: Optional[ListNode], l2: Optional[ListNode]) -> Optional[ListNode]"
---

## Task

Two non-negative integers are stored as linked lists of digits, **least significant digit first**: the number 723 is the list `3 → 2 → 7`. You get the heads of two such lists, `l1` and `l2`.

Return their sum as a linked list in the same format. Neither number has leading zeros, except the number 0 itself (a single node holding 0).

## Constraints

- Each list has between `1` and `50_000` nodes
- `0 <= node.val <= 9`
- No leading zeros, except for the number 0

```json examples
[
  {"args": [[5, 6], [7]], "out": [2, 7], "why": "65 + 7 = 72, which is stored as 2 → 7."},
  {"args": [[9, 9, 9], [1]], "out": [0, 0, 0, 1], "why": "999 + 1 = 1000: the carry ripples through every digit and adds a new one at the end."},
  {"args": [[0], [3, 4]], "out": [3, 4], "why": "0 + 43 = 43."}
]
```

```json edge
[
  {"name": "both zero", "args": [[0], [0]], "out": [0]},
  {"name": "single digits with a carry", "args": [[5], [5]], "out": [0, 1]},
  {"name": "different lengths", "args": [[1, 2, 3, 4], [5]], "out": [6, 2, 3, 4]},
  {"name": "carry into a longer list", "args": [[9, 9], [1, 0, 0, 1]], "out": [0, 0, 1, 1]},
  {"name": "no carries at all", "args": [[1, 2], [3, 4]], "out": [4, 6]},
  {"name": "all nines", "args": [[9, 9, 9, 9], [9, 9, 9, 9]], "out": [8, 9, 9, 9, 1]}
]
```

```python gen
def gen(rng, size):
    def number(digits):
        if digits == 1:
            return [rng.randint(0, 9)]
        return [rng.randint(0, 9) for _ in range(digits - 1)] + [rng.randint(1, 9)]  # no leading zero
    a = rng.randint(1, 6) if size == "small" else rng.randint(20, 300)
    b = rng.randint(1, 6) if size == "small" else rng.randint(20, 300)
    return [number(a), number(b)]
```

```python perf
def perf(rng):
    # Two numbers with 50,000 digits each.
    a = [rng.randint(0, 9) for _ in range(49_999)] + [rng.randint(1, 9)]
    b = [rng.randint(0, 9) for _ in range(49_999)] + [rng.randint(1, 9)]
    return [a, b]
```

## Hints

1. Add the way you learned on paper, from the least significant digit, which is conveniently the head of each list.
2. At each position, add the two digits (0 for a list that has run out) plus the carry. The new digit is `total % 10` and the new carry is `total // 10`.
3. Keep going while either list has digits *or* there's a carry left over.

## Solution

```python solution time="max(m, n)" space="1"
class Solution:
    def addTwoNumbers(self, l1: Optional[ListNode], l2: Optional[ListNode]) -> Optional[ListNode]:
        dummy = tail = ListNode()
        carry = 0
        while l1 or l2 or carry:
            total = carry
            if l1:
                total += l1.val
                l1 = l1.next
            if l2:
                total += l2.val
                l2 = l2.next
            carry, digit = divmod(total, 10)
            tail.next = ListNode(digit)
            tail = tail.next
        return dummy.next
```

The lists already start at the ones digit, which is where column addition starts. Each step adds one column: the two digits (a list that has run out contributes 0) plus the carry from the previous column. `divmod(total, 10)` splits the total into the next carry and this column's digit. The total is at most 9 + 9 + 1 = 19, so the carry is always 0 or 1.

The loop also runs when only `carry` is left, which adds the extra leading digit for sums like 999 + 1. One pass over the longer list: O(max(m, n)) time, and no extra space besides the result.

## Alternatives

### Pad the shorter list conceptually, with recursion

```python alt time="max(m, n)" space="max(m, n)" oracle
class Solution:
    def addTwoNumbers(self, l1: Optional[ListNode], l2: Optional[ListNode]) -> Optional[ListNode]:
        def add(a, b, carry):
            if not a and not b and not carry:
                return None
            total = carry + (a.val if a else 0) + (b.val if b else 0)
            return ListNode(total % 10, add(a.next if a else None, b.next if b else None, total // 10))
        return add(l1, l2, 0)
```

The same column addition, written as "this column's digit, followed by the sum of the rest". It's compact, but each digit adds a nested call, so a 50,000-digit number needs a call stack 50,000 deep, far past plain Python's default limit of 1,000.

## Wrong answers

### Forgets the last carry

```python wrong fails="example" test="Example 2"
class Solution:
    def addTwoNumbers(self, l1: Optional[ListNode], l2: Optional[ListNode]) -> Optional[ListNode]:
        dummy = tail = ListNode()
        carry = 0
        while l1 or l2:  # stops even if a carry is still pending
            total = carry
            if l1:
                total += l1.val
                l1 = l1.next
            if l2:
                total += l2.val
                l2 = l2.next
            carry, digit = divmod(total, 10)
            tail.next = ListNode(digit)
            tail = tail.next
        return dummy.next
```

When the last column produces a carry, the sum has one more digit than either input. The loop ends as soon as both lists run out, so 999 + 1 comes out as 000.

### Converts the lists to Python integers

```python wrong fails="perf" how="error"
class Solution:
    def addTwoNumbers(self, l1: Optional[ListNode], l2: Optional[ListNode]) -> Optional[ListNode]:
        def to_int(node):
            digits = []
            while node:
                digits.append(str(node.val))
                node = node.next
            return int("".join(reversed(digits)))  # fails for very long numbers
        total = str(to_int(l1) + to_int(l2))
        head = None
        for ch in total:  # most significant first, so prepending reverses it
            head = ListNode(int(ch), head)
        return head
```

Python integers have no size limit, so this looks safe. But to guard against very slow conversions of huge numbers, Python 3.11+ refuses to turn a string of more than 4,300 digits into an `int` and raises `ValueError`. The 50,000-digit performance test hits that limit. The interviewer's point stands too: in most languages these numbers don't fit in any integer type.
