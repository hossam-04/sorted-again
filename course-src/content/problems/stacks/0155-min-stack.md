---
id: 155
module: stacks
patterns: [stack of pairs, running minimum]
kind: design
class: MinStack
---

## Task

Build a class `MinStack`: a stack of integers that can also report its smallest value at any moment. It has these methods:

- `MinStack()` creates an empty stack.
- `push(val)` puts `val` on top.
- `pop()` removes the top value.
- `top()` returns the top value without removing it.
- `getMin()` returns the smallest value currently in the stack.

Every method must run in O(1) time. `pop`, `top` and `getMin` are only called when the stack isn't empty.

Tests are written as two lists: the method names called in order, and the arguments of each call. The expected output lists what each call returns, with `None` for methods that return nothing.

## Constraints

- `-2**31 <= val <= 2**31 - 1`
- At most `100_000` method calls in total
- `pop`, `top` and `getMin` are never called on an empty stack

```python starter
class MinStack:
    def __init__(self):
        pass

    def push(self, val: int) -> None:
        pass

    def pop(self) -> None:
        pass

    def top(self) -> int:
        pass

    def getMin(self) -> int:
        pass
```

```json examples
[
  {"ops": ["MinStack", "push", "push", "getMin", "push", "getMin", "pop", "getMin", "top"], "args": [[], [5], [7], [], [3], [], [], [], []], "out": [null, null, null, 5, null, 3, null, 5, 7], "why": "After 3 is popped, the minimum goes back to 5: the stack has to remember earlier minimums."},
  {"ops": ["MinStack", "push", "push", "push", "pop", "getMin", "pop", "getMin"], "args": [[], [2], [1], [1], [], [], [], []], "out": [null, null, null, null, null, 1, null, 2], "why": "The minimum 1 is pushed twice. Popping one copy leaves the other, so the minimum is still 1."},
  {"ops": ["MinStack", "push", "push", "top", "getMin"], "args": [[], [-4], [-9], [], []], "out": [null, null, null, -9, -9], "why": "Negative values work like any other: -9 is both the top and the minimum."}
]
```

```json edge
[
  {"name": "one value", "ops": ["MinStack", "push", "top", "getMin"], "args": [[], [7], [], []], "out": [null, null, 7, 7]},
  {"name": "increasing pushes", "ops": ["MinStack", "push", "push", "push", "getMin", "pop", "pop", "getMin"], "args": [[], [1], [2], [3], [], [], [], []], "out": [null, null, null, null, 1, null, null, 1]},
  {"name": "decreasing pushes", "ops": ["MinStack", "push", "push", "push", "getMin", "pop", "getMin", "pop", "getMin"], "args": [[], [3], [2], [1], [], [], [], [], []], "out": [null, null, null, null, 1, null, 2, null, 3]},
  {"name": "push after emptying", "ops": ["MinStack", "push", "pop", "push", "getMin"], "args": [[], [5], [], [8], []], "out": [null, null, null, null, 8]},
  {"name": "equal values", "ops": ["MinStack", "push", "push", "pop", "getMin", "top"], "args": [[], [4], [4], [], [], []], "out": [null, null, null, null, 4, 4]},
  {"name": "extreme values", "ops": ["MinStack", "push", "push", "getMin", "pop", "getMin"], "args": [[], [2147483647], [-2147483648], [], [], []], "out": [null, null, null, -2147483648, null, 2147483647]}
]
```

```python gen
def gen(rng, size):
    calls = rng.randint(1, 10) if size == "small" else rng.randint(20, 300)
    hi = 5 if size == "small" else 1000
    ops, args, depth = ["MinStack"], [[]], 0
    for _ in range(calls):
        choice = rng.choice(["push", "push", "pop", "top", "getMin"]) if depth else "push"
        ops.append(choice)
        if choice == "push":
            args.append([rng.randint(-hi, hi)])
            depth += 1
        else:
            args.append([])
            depth -= choice == "pop"
    return {"ops": ops, "args": args}
```

```python perf
def perf(rng):
    # 50,000 pushes, then 50,000 calls that alternate getMin and top on a full stack.
    ops = ["MinStack"] + ["push"] * 50_000 + ["getMin", "top"] * 25_000
    args = [[]] + [[rng.randint(-10**9, 10**9)] for _ in range(50_000)] + [[]] * 50_000
    return {"ops": ops, "args": args}
```

## Hints

1. Keeping one "current minimum" variable fails as soon as the minimum is popped: what was the minimum before it?
2. The minimum of the stack depends only on the values below the top, and those don't change until they're popped.
3. So store, next to each value, the minimum of the stack at the moment it was pushed. The top pair always knows the current minimum.

## Solution

```python solution time="1" space="n"
class MinStack:
    def __init__(self):
        self.items = []  # (value, minimum of the stack up to and including this value)

    def push(self, val: int) -> None:
        low = min(val, self.items[-1][1]) if self.items else val
        self.items.append((val, low))

    def pop(self) -> None:
        self.items.pop()

    def top(self) -> int:
        return self.items[-1][0]

    def getMin(self) -> int:
        return self.items[-1][1]
```

Each entry stores its value together with the minimum of everything at or below it. The values below an entry can't change while the entry is in the stack, so that stored minimum stays correct until the entry is popped. After a pop, the new top's stored minimum is again exactly the minimum of what remains: the earlier minimum comes back for free.

Every method does a constant amount of work: O(1) time each. The stack stores two numbers per value, which is O(n) space.

## Alternatives

### Scan for the minimum

```python alt time="n" space="n" slow oracle
class MinStack:
    def __init__(self):
        self.items = []

    def push(self, val: int) -> None:
        self.items.append(val)

    def pop(self) -> None:
        self.items.pop()

    def top(self) -> int:
        return self.items[-1]

    def getMin(self) -> int:
        return min(self.items)  # O(n) per call
```

Obviously correct, and fine when `getMin` is rare. But every `getMin` scans the whole stack, so 25,000 calls on a stack of 50,000 values do over a billion comparisons.

### A second stack of minimums

```python alt time="1" space="n"
class MinStack:
    def __init__(self):
        self.items = []
        self.mins = []  # the minimum so far, pushed only when it changes or repeats

    def push(self, val: int) -> None:
        self.items.append(val)
        if not self.mins or val <= self.mins[-1]:
            self.mins.append(val)

    def pop(self) -> None:
        if self.items.pop() == self.mins[-1]:
            self.mins.pop()

    def top(self) -> int:
        return self.items[-1]

    def getMin(self) -> int:
        return self.mins[-1]
```

Store minimums in their own stack, but only when a new value is at most the current minimum. It saves memory when the minimum rarely changes. The `<=` matters: a repeated minimum must be pushed again, or popping one copy would forget the other.

## Wrong answers

### Remembers only one minimum

```python wrong fails="example" test="Example 1"
class MinStack:
    def __init__(self):
        self.items = []
        self.low = None

    def push(self, val: int) -> None:
        self.items.append(val)
        if self.low is None or val < self.low:
            self.low = val

    def pop(self) -> None:
        self.items.pop()  # if the minimum leaves, self.low is now wrong

    def top(self) -> int:
        return self.items[-1]

    def getMin(self) -> int:
        return self.low
```

A single variable can move down but not back up. When the minimum is popped, there's no record of what the minimum was before it, so `getMin` keeps returning a value that's no longer in the stack.

### Skips repeated minimums

```python wrong fails="example" test="Example 2"
class MinStack:
    def __init__(self):
        self.items = []
        self.mins = []

    def push(self, val: int) -> None:
        self.items.append(val)
        if not self.mins or val < self.mins[-1]:  # a second copy of the minimum is not recorded
            self.mins.append(val)

    def pop(self) -> None:
        if self.items.pop() == self.mins[-1]:
            self.mins.pop()

    def top(self) -> int:
        return self.items[-1]

    def getMin(self) -> int:
        return self.mins[-1]
```

With `<` instead of `<=`, pushing 1 twice records it once. Popping either copy then removes the 1 from `mins`, even though another 1 is still in the stack.

### Sorts a copy to find the minimum

```python wrong fails="perf"
class MinStack:
    def __init__(self):
        self.items = []

    def push(self, val: int) -> None:
        self.items.append(val)

    def pop(self) -> None:
        self.items.pop()

    def top(self) -> int:
        return self.items[-1]

    def getMin(self) -> int:
        return sorted(self.items)[0]  # sorts the whole stack on every call
```

Correct answers, but each `getMin` sorts a copy of the stack: O(n log n) per call instead of O(1). With 25,000 calls on 50,000 values it never finishes in time.
