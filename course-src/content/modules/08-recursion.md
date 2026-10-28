---
id: recursion
title: Recursion
kicker: the call stack · recursion trees · memoisation · divide and conquer
summary: A recursive function solves a problem by trusting itself with smaller copies of it. Learn to see the tree of calls it creates, because that tree's size is the running time, and memoisation or halving is how you shrink it.
---

## A function that calls itself

A recursive function has two parts:

- a **base case** that it answers directly, and
- a **recursive case** that reduces the problem to a smaller one and calls itself on that.

Every call gets its own *frame* on the **call stack**: its own local variables and the place to continue when the inner call returns. The stack grows while calls nest and shrinks as they return, last in, first out, just like the stacks of module 05.

```python run title=Watching_the_call_stack
def factorial(n, depth=0):
    print("  " * depth + f"factorial({n}) starts")
    if n <= 1:
        result = 1  # base case
    else:
        result = n * factorial(n - 1, depth + 1)  # recursive case: a smaller copy
    print("  " * depth + f"factorial({n}) returns {result}")
    return result

factorial(4)
```

The trick to *writing* recursion is to stop tracing it. Assume the recursive call already works for the smaller input (it will, once the base case and the reduction are right), and only ask: how do I build my answer from that smaller answer? That habit is sometimes called the *leap of faith*.

## Recursion trees

When a function calls itself more than once, the calls form a tree. The plain Fibonacci definition, `fib(n) = fib(n - 1) + fib(n - 2)`, makes two calls per call:

:::viz fib-call-tree
:::

The work is the number of nodes in that tree, and the tree is huge: `fib(n)` makes about 1.6ⁿ calls, because the same values are recomputed over and over. `fib(3)` appears twice in the tree for `fib(5)`, `fib(2)` three times. For n = 40 that's hundreds of millions of calls for a number you could compute by hand.

A rough way to estimate any recursion's cost: **(number of calls) × (work per call)**, where the number of calls is about branching factorᵈᵉᵖᵗʰ when nothing is reused.

## Memoisation

If a function's answer depends only on its arguments, you can store each answer the first time you compute it and look it up afterwards. That's *memoisation*. Fibonacci then needs only one real computation per distinct n:

:::viz fib-memo-tree
:::

In Python, `functools.cache` adds the memo for you. Here are the call counts side by side:

```python run title=Counting_calls_with_and_without_a_memo
from functools import cache

calls = 0
def fib_plain(n):
    global calls
    calls += 1
    return n if n < 2 else fib_plain(n - 1) + fib_plain(n - 2)

@cache
def fib_memo(n):
    return n if n < 2 else fib_memo(n - 1) + fib_memo(n - 2)

for n in [10, 20, 25]:
    calls = 0
    value = fib_plain(n)
    print(f"fib({n}) = {value}: {calls:,} calls without a memo")
fib_memo(25)
print("with @cache:", fib_memo.cache_info())
```

With a memo, the cost becomes **(number of distinct arguments) × (work per call)**. Fibonacci drops from exponential to O(n). That formula is the bridge to dynamic programming in module 17, which is mostly memoisation written as a loop.

:::gotcha A mutable default argument as the memo
You'll see `def fib(n, memo={}):` in tutorials. It works because Python creates the default dict once and shares it between all calls, which is the same trap as in module 02: the memo silently survives between unrelated uses, and if the function's meaning depends on other inputs, stale answers leak in. Prefer `@cache` on a nested function, or create the dict in the caller and pass it down.
:::

## Divide and conquer

Recursion also shrinks problems by **halving** them. Computing xⁿ with n multiplications is slow, but xⁿ = (x^(n/2))², so one recursive call on half the exponent plus one squaring does the job ([[p:50]]):

:::viz power-halving
:::

The tree is a single path of about log₂ n calls. The important detail is calling the function *once* and squaring the result: writing `power(x, n // 2) * power(x, n // 2)` would make two calls per level and bring the cost back up to O(n). Merge sort and quicksort, binary search, and many tree algorithms are divide and conquer too: split, solve the parts, combine.

## Generating things

Recursion is the natural way to generate every combination, arrangement or valid string: each call makes one choice and recurses on the rest. To list all subsets, each element is either in or out:

```python run title=All_subsets_by_choosing_in_or_out
def subsets(items):
    out, chosen = [], []

    def choose(i):
        if i == len(items):
            out.append(chosen.copy())  # copy: chosen keeps changing after this
            return
        choose(i + 1)              # leave items[i] out
        chosen.append(items[i])    # put items[i] in
        choose(i + 1)
        chosen.pop()               # undo, so the caller sees chosen unchanged

    choose(0)
    return out

print(subsets(["a", "b", "c"]))
```

Notice the pattern: make a choice, recurse, **undo the choice**. That's *backtracking*, the subject of module 13. When some choices can't lead anywhere, skip them early; [[p:22]] only adds `)` when it closes an open bracket, so it never builds an invalid prefix.

## How deep can recursion go?

Every nested call adds a frame, and Python limits how many: 1,000 by default. Hit the limit and Python raises `RecursionError`:

```python run title=Hitting_the_recursion_limit error
import sys
sys.setrecursionlimit(100)  # lower than usual, to hit the limit quickly

def total(nums):
    if not nums:
        return 0
    return nums[0] + total(nums[1:])  # one frame per element

print(total(list(range(50))))
print(total(list(range(500))))  # needs 500 nested calls
```

You can raise the limit with `sys.setrecursionlimit` (LeetCode raises it for you, and this page allows 100,000), but each frame uses memory, and very deep recursion can crash a program outright. The robust fix is to turn the recursion into a loop, often with an explicit stack that holds what the call stack used to:

```python run title=The_same_sum_with_a_loop
def total(nums):
    result = 0
    for x in nums:
        result += x
    return result

def depth_first_sum(tree):
    """Sum a nested list without recursion: the stack holds lists still to visit."""
    result, stack = 0, [tree]
    while stack:
        node = stack.pop()
        for x in node:
            if isinstance(x, list):
                stack.append(x)
            else:
                result += x
    return result

print(total(list(range(100_000))))
print(depth_first_sum([1, [2, [3, [4]], 5], [6]]))
```

:::gotcha Recursion through built-in functions, in this page
Python runs ordinary recursive calls without growing the browser's own stack, so plain recursion can go 100,000 deep here. Recursion that passes *through* a built-in function is different: `max(dfs(c) for c in children)`, `sum(...)` over a generator, `map(dfs, ...)` or `sorted(key=dfs)` all use the browser's stack, which allows only about 100 levels in Safari. Write those as loops (`best = max(best, dfs(c))`) when the recursion can get deep. `@cache` is fine: this page's version is written in Python.
:::

## Complexity

| Recursion | Calls | Total cost |
|---|---|---|
| One call, input shrinks by 1 (factorial, sum of a list) | `O(n)` | `O(n)` × work per call |
| One call, input halves (binary search, fast power) | `O(log n)` | `O(log n)` |
| Two calls, input shrinks by 1 (plain Fibonacci) | about `O(1.6^n)` | exponential |
| Same, with a memo | `O(n)` distinct calls | `O(n)` |
| Two calls on halves, linear combine (merge sort) | `O(n)` | `O(n log n)` |
| Every subset of n items | `O(2^n)` | `O(n·2^n)` to write them out |

The stack depth is a separate cost: it's the longest path in the call tree, which is O(n) for the shrink-by-one patterns and O(log n) for halving.

:::interview
State the base case and the recursive case before writing code, and say what the recursive call returns ("`dfs(node)` returns the height of the subtree at node"). Then estimate the tree: how many calls, how much work each. If the same arguments repeat, say "I'll memoise this" and give the new cost: distinct states times work per state.
:::

:::work
Recursion fits data that is recursive itself: directory trees, JSON documents, ASTs in compilers and linters, nested comments, organisation charts. In production code, keep depth in mind (a deeply nested input can exhaust the stack) and reach for an explicit stack when inputs come from users. `functools.cache` is also a quick win for expensive pure functions outside of recursion.
:::

## Quick check

:::quiz
? Roughly how many calls does the plain recursive `fib(30)` make?
- [ ] About 30
- [ ] About 900
- [x] About 2.7 million
> Each call makes two more until the base cases, and values are recomputed again and again. The count grows by a factor of about 1.6 per step of n.

? With `@cache`, how many distinct calls does `fib(30)` need?
- [x] 31
- [ ] 60
- [ ] About 1.6³⁰
> Each value fib(0) … fib(30) is computed once. Every other call is a lookup.

? Why does fast power compute `half = power(x, n // 2)` once and return `half * half`?
- [ ] Because Python can't call a function twice on one line
- [x] Two separate calls would double the work at every level and bring the cost back to O(n)
- [ ] To avoid a RecursionError
> One call per level gives about log₂ n calls in total. Two calls per level form a full binary tree with about n leaves.

? What does "make a choice, recurse, undo the choice" describe?
- [ ] Memoisation
- [x] Backtracking
- [ ] Divide and conquer
> Backtracking explores every sequence of choices with one shared, mutable path, undoing each choice when its branch is done.

? A recursive tree walk does `return 1 + max(depth(c) for c in node.children)`. On this page, why might it crash on a very deep tree when a loop wouldn't?
- [ ] Generators are slower than lists
- [x] Recursion through `max()` over a generator uses the browser's small native stack
- [ ] `max` can't take a generator
> Plain Python calls don't grow the browser's stack, but each level of recursion through a built-in like `max()` does. Writing the loop out (`best = max(best, depth(c))`) keeps the recursion plain.
:::
