---
id: stacks
title: Stacks and monotonic stacks
kicker: last in, first out · matching · evaluation · next greater element
summary: A stack answers one question in O(1), "what's the most recent thing still open?". That one question solves bracket matching and expression evaluation, and a stack kept in sorted order finds every element's next greater neighbour in a single pass.
---

## Last in, first out

A stack lets you add an item on top (*push*), look at the top (*peek*) and remove the top (*pop*). The item you get back is always the one added most recently. In Python, a plain list is a fine stack: `append` and `pop` work at the end of the list in O(1), and `stack[-1]` peeks.

```python run title=A_list_as_a_stack
stack = []
for word in ["first", "second", "third"]:
    stack.append(word)
    print("push", word, "->", stack)
print("top is", stack[-1])
while stack:
    print("pop", stack.pop(), "->", stack)
```

The question to ask about a problem is: **does the most recent unfinished thing decide what happens next?** If it does, a stack is usually the answer. You've used one implicitly in every recursive function: the call stack holds the calls that are still waiting for a result, and the most recent call finishes first.

## Matching brackets

Brackets are the textbook case. A closing bracket must match the most recently opened bracket that is still open, which is the top of the stack. [[p:20]] pushes each opener and, at each closer, checks and pops the top:

```python run title=Bracket_matching
def balanced(s):
    partner = {")": "(", "]": "[", "}": "{"}
    stack = []
    for c in s:
        if c in partner:
            if not stack or stack.pop() != partner[c]:
                return False
        else:
            stack.append(c)
    return not stack

for s in ["{[()()]}", "[(])", "((", ")("]:
    print(s, balanced(s))
```

Notice the three ways to fail: a closer of the wrong type, a closer with nothing open (empty stack), and openers still left when the input ends. Forgetting the last one is the most common bug.

## Remembering a minimum

A stack can carry extra information about everything below each item, because nothing below an item changes while the item is on the stack. [[p:155]] stores each value with the minimum of the stack at the moment it was pushed. The top pair then always knows the current minimum, and popping restores the previous minimum automatically.

```python run title=A_stack_that_knows_its_minimum
stack = []  # (value, minimum so far)
for v in [5, 7, 3, 3, 8]:
    stack.append((v, min(v, stack[-1][1]) if stack else v))
print("min:", stack[-1][1])
while stack:
    v, low = stack.pop()
    print(f"popped {v}; min is now {stack[-1][1] if stack else None}")
```

## Evaluating expressions

In *reverse Polish notation* every operator follows its two operands: `3 4 + 2 *` means (3 + 4) × 2. Reading left to right, numbers wait on a stack until an operator needs them, and an operator always uses the two most recent waiting values. That's [[p:150]]. Pop the right operand first: for `-` and `/` the order matters.

Calculators and compilers turn ordinary infix expressions into this form first, because evaluating it needs nothing but a stack.

:::gotcha Python's // is not truncation
`//` rounds towards negative infinity, so `-7 // 2` is `-4`. Many languages (and many problem statements) truncate towards zero, which gives `-3`. Use `int(a / b)` for truncation (exact for values below 2⁵³), or work with absolute values and fix the sign.
:::

```python run title=Two_kinds_of_integer_division
for a, b in [(7, 2), (-7, 2), (7, -2), (-7, -2)]:
    print(f"{a:>3} / {b:>2}:  // gives {a // b:>2},  int(a / b) gives {int(a / b):>2}")
```

## Monotonic stacks: the next greater element

Here's a question that looks like it needs O(n²): for every element, find the first element after it that is larger. [[p:739]] asks exactly that, phrased as "how many days until a warmer day?".

Turn it around. Instead of each day searching forward, let each new day answer the earlier days that are still waiting. Keep the waiting days on a stack. When a warmer day arrives, every waiting day that is colder has found its answer, and those are exactly the days at the top of the stack: anything colder lower down would already have been answered by a day in between. So pop while the top is colder, then push today.

The stack's temperatures never increase from bottom to top. That's why it's called a **monotonic stack**: its contents stay sorted, and each new element pops whatever breaks the order.

:::viz monotonic-stack-temps
:::

Each day is pushed once and popped at most once, so all the `while` loops together do n pops: O(n) overall. The general pattern finds the next greater element for any list:

```python run title=Next_greater_element
def next_greater(nums):
    out = [None] * len(nums)
    stack = []  # indices still waiting; their values never rise towards the top
    for i, x in enumerate(nums):
        while stack and nums[stack[-1]] < x:
            out[stack.pop()] = x
        stack.append(i)
    return out

print(next_greater([2, 7, 3, 5, 4, 6, 8]))
print(next_greater([9, 8, 7]))
```

Flip `<` to `>` for the next *smaller* element, scan from the right for the *previous* greater element, and use `<=` instead of `<` when equal values should count.

:::gotcha Strict or not: < versus <=
Whether the comparison is strict decides how equal values behave. With `<`, an equal value doesn't pop, so "the next warmer day" ignores days of the same temperature. With `<=`, equal values pop each other. Decide which one the problem wants before writing the loop, and test it with repeated values.
:::

## Sorting first: car fleets

[[p:853]] mixes sorting with a stack. Cars can't pass each other on a one-lane road, so a car is only ever slowed down by the fleet directly ahead. Sort the cars from front to back and compute each car's arrival time if it drove alone. A car that would arrive no later than the fleet ahead catches it and joins; a car that would arrive later starts a new fleet. The stack holds the fleets' arrival times, and the answer is its size.

## The largest rectangle in a histogram

[[p:84]] is the hardest problem here and the clearest example of what a monotonic stack buys you. The largest rectangle has the height of some bar and extends sideways until a shorter bar blocks it. A stack of bars with rising heights keeps every rectangle that can still grow to the right. When a shorter bar arrives, each taller bar on the stack has met its right limit: pop it and measure its rectangle.

:::viz histogram-stack
:::

Appending a bar of height 0 at the end is a **sentinel**: it's shorter than every bar, so it pops everything still on the stack and no cleanup code is needed after the loop. Forgetting the leftovers is the classic bug: a rising histogram never pops anything during the loop.

## Complexity

| Operation or task | Cost |
|---|---|
| push, pop, peek on a list | `O(1)` |
| Check brackets | `O(n)` time, `O(n)` space |
| Min stack, every operation | `O(1)` |
| Evaluate reverse Polish notation | `O(n)` |
| Next greater element for every item | `O(n)` instead of `O(n^2)` |
| Car fleets | `O(n log n)` for the sort |
| Largest rectangle in a histogram | `O(n)` instead of `O(n^2)` |

:::interview
When you use a monotonic stack, say what the stack contains and which order it keeps ("indices of days still waiting, with temperatures that never rise towards the top"). Then explain the O(n) bound: each element is pushed once and popped once. Those two sentences are most of what an interviewer wants to hear.
:::

:::work
Stacks are everywhere: undo history in editors, the browser's back button, parsers for JSON and HTML, and the call stack that shows up in every traceback you read. Monotonic stacks show up in data work when you need "the next time this value was exceeded", such as the next price above today's or the next time a metric broke its previous high.
:::

## Quick check

:::quiz
? Which of these strings does the bracket checker reject only because of the final "is anything left open?" check?
- [ ] `"(]"`
- [x] `"(()"`
- [ ] `")("`
> In `"(()"` every closer matches, so the loop never fails. One `(` is still on the stack at the end, and only the final check catches it.

? In reverse Polish notation, what does `["9", "3", "-"]` evaluate to?
- [x] 6
- [ ] -6
- [ ] It depends on the stack
> The operator applies to the two values before it, in order: 9 − 3. On the stack, 3 is on top, so it's popped first as the right operand.

? What is `int(-7 / 2)` in Python, and what is `-7 // 2`?
- [ ] Both are -4
- [x] -3 and -4
- [ ] -4 and -3
> `int()` drops the fractional part of -3.5, giving -3 (truncation towards zero). `//` rounds down to -4.

? Why is the daily-temperatures stack solution O(n) even though it has a `while` inside a `for`?
- [ ] The `while` loop runs at most twice per day
- [x] Each day is pushed once and popped at most once, so the pops add up to at most n
- [ ] The stack never holds more than 2 days
> Count the work per element instead of per loop: one push and at most one pop each. That's at most 2n stack operations in total.

? In the histogram problem, why append a bar of height 0 at the end?
- [ ] To make the answer at least 0
- [x] It's shorter than every bar, so it pops and measures everything still on the stack
- [ ] It handles the case of an empty list
> Bars only get measured when a shorter bar pops them. Bars at the end of a rising histogram are never popped during the loop; the 0-height sentinel forces them out.
:::
