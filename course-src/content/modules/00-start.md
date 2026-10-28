---
id: start
title: Start here
kicker: how the course works · the Python environment · interview prep or work · a warm-up quiz that finds your weak spots
summary: "This course is for people who learned data structures and algorithms once and want them back, for interviews, for work, or both. Everything runs in your browser: read a short lesson, step through a visualizer, then solve problems in Python and check them against hidden tests. Start with the warm-up quiz at the bottom of this page to see which modules need the most attention."
---

## How the course works

The course has 19 core modules, from this one to the [[m:playbook]], which cover the NeetCode 150 problems. After them, an **advanced part** of 8 modules goes further: ordered structures, greedy algorithms with heaps, Fenwick and segment trees, binary lifting, string matching, advanced graphs and dynamic programming, and number theory, with 42 harder problems. Each topic module has two parts.

**The lesson** explains the ideas, with:

- **Runnable examples.** Every Python block marked *Example code* can be edited and run. The output underneath was computed when the course was built, so you can read it before Python has loaded. **Reset** puts the original code back.
- **Visualizers.** Step through an algorithm line by line and watch its data change. Use the buttons, or click the visualizer and press ← and → to step and Space to play or pause. **Edit input** traces the algorithm again on your own input.
- **Gotchas**, the mistakes that catch out experienced people too; **Interview angle** and **On the job** notes; a complexity table; and a short quiz. **Mark as finished** at the end of the lesson updates your progress.

**The problems** follow the lesson. Each one has a task in the course's own words, constraints and worked examples, and an editor with starter code:

- **Run** tries your code on the visible examples and shows what it printed.
- **Check** runs everything: the examples, hidden edge cases, randomised tests compared against a reference solution, and one large performance test with a time limit. When a test fails, you see the input, the expected output, your output and where they differ. Code that runs too long is stopped, so an endless loop costs you nothing but a few seconds.
- **Hints** appear one at a time.
- **Solutions** show the reference solution with its time and space complexity, and the alternatives from brute force to the best one. **Run Check** on any of them shows how it does on the same tests.
- **Wrong answers** are the mistakes people really make on that problem, each one runnable, with the test it fails and why.
- **Open on LeetCode** links to the original, in case you want to submit there. LeetCode's Premium problems have their own versions here, marked as such.

Problems are marked **solved** when Check accepts your code. Your drafts, solved problems, finished modules and quiz scores are saved in this browser. The home page has a **progress code**: copy it to move your progress to another browser or device, and paste it there.

Besides the modules, the sidebar has the **patterns cheat sheet**, a **complexity reference** for Python's built-ins and the classic algorithms, and a **playground** for any Python you like.

## The Python environment

The code runs in your browser in real Python, CPython compiled to WebAssembly by the Pyodide project. Nothing is sent to a server. The first run takes a few seconds while Python loads; after that it's quick.

Problems use LeetCode's format: a `class Solution` with a method, and the same method names, so code written here can be pasted into LeetCode as it is. Like LeetCode, the problems preload the names you'd usually import:

- `List`, `Optional`, `Dict` and the rest of `typing`;
- `deque`, `Counter`, `defaultdict` and the rest of `collections`;
- the `heapq` and `bisect` functions, everything in `itertools`, and `cache`, `lru_cache` and `reduce` from `functools`;
- `inf`, `gcd`, `sqrt`, `isqrt`, `ceil`, `floor`, `log2` and other common names from `math`;
- the modules themselves, such as `collections`, `heapq`, `math`, `re` and `random`;
- `ListNode` and `TreeNode` for the linked-list and tree problems.

The **recursion limit** is 100,000 here, against 1,000 in a plain Python install (LeetCode raises it too). [[m:recursion]] explains the one exception: recursion that passes through a built-in such as `max(...)` over a generator can only go about 100 levels deep in Safari.

**Keyboard shortcuts:** Ctrl+Enter (⌘+Enter on a Mac) runs the code in an editor, and Ctrl+Shift+Enter (⌘+Shift+Enter) runs Check.

## Two ways to use the course

**For interviews:**

1. Take the warm-up quiz below. It points you to the modules where you missed questions.
2. Do the problems marked **B75** first, the Blind 75 list, which covers every pattern. Then work through the rest of the 150.
3. Give each problem 20 to 30 minutes before opening a hint. Say your plan out loud as you would in an interview, and state the complexity before you check.
4. After solving a problem, read the alternatives and the wrong answers. That's where most of the learning is.
5. Read the [[m:playbook]] before your interviews, and come back to problems you found hard after a few days.
6. If you're aiming at companies that ask Hard problems, continue with the advanced part, starting from [[m:ordered-structures]]. Each of its modules says which core modules it builds on.

**For work:** read the lessons for the ideas: complexity, hash maps, heaps, graphs, dynamic programming. The *On the job* notes connect them to real systems. Try two or three problems per module to make sure the ideas stick, and keep the cheat sheet and the complexity reference at hand.

## Warm-up quiz

One question per module. When you finish, the quiz lists the modules where you missed something; start there.

:::quiz
? (big-o) A function runs a loop over n items, and inside it another loop over the same n items. How does its running time grow?
- [ ] Like n
- [ ] Like n log n
- [x] Like n²
> The inner loop runs n times for each of the n outer iterations. [[m:big-o]] covers how to count steps like this.

? (arrays) What's the usual O(n) way to check whether a list contains a duplicate?
- [ ] Compare every pair of elements
- [x] Add the elements to a set, and stop when one is already there
- [ ] Sort the list and binary search for each element
> A set answers "seen before?" in O(1) on average, so one pass is enough. Comparing every pair is O(n²), and sorting first is O(n log n).

? (two-pointers) The list is sorted, and you need two numbers that add up to a target, with O(1) extra memory. What works?
- [x] A pointer at each end: move the left one right if the sum is too small, the right one left if it's too big
- [ ] A dictionary from each number to its index
- [ ] Try every pair
> Sorting makes the move obvious at every step, and each pointer moves at most n times. A dictionary also works, but it uses O(n) memory.

? (sliding-window) A sliding window finds the longest substring without a repeated character in O(n). Why is it O(n) and not O(n²)?
- [ ] Because strings are short
- [x] Each pointer only moves forward, so every character enters and leaves the window at most once
- [ ] Because the window has a fixed size
> The left pointer never moves back, so the total work over the whole scan is at most 2n steps.

? (stacks) For each day, you want the number of days until a warmer temperature. Which tool gives O(n)?
- [ ] A heap of temperatures
- [x] A stack of the days still waiting for a warmer one, kept in decreasing order of temperature
- [ ] Sorting the temperatures
> This is the monotonic stack: each new day resolves every cooler day waiting on top of the stack, and each day is pushed and popped once.

? (binary-search) Bananas must be eaten within h hours at a fixed speed. How can binary search find the slowest speed that works?
- [ ] It can't: the piles aren't sorted
- [x] Search over the speeds, since any speed above one that works also works
- [ ] Sort the piles, then binary search for h
> Binary search needs a yes/no question whose answer switches only once, not a sorted array. "Can I finish at speed k?" is false and then true as k grows.

? (linked-lists) How do you find out whether a linked list has a cycle, using O(1) memory?
- [ ] Count the nodes until you reach None
- [ ] Store every visited node in a set
- [x] Move one pointer one step at a time and another two steps at a time; they meet if there's a cycle
> The fast pointer gains one step per move, so inside a cycle it must catch up. The set also works, but takes O(n) memory.

? (recursion) Why is plain recursive Fibonacci so slow?
- [ ] Recursion is slow in Python
- [x] It computes the same smaller values again and again, an exponential number of calls
- [ ] Adding large numbers is slow
> `fib(n)` calls `fib(n − 1)` and `fib(n − 2)`, which call the same values again, and the tree of calls doubles at every level. A cache makes it O(n).

? (trees) Which traversal of a binary search tree visits the values in sorted order?
- [ ] Preorder
- [x] Inorder
- [ ] Level order
> Inorder visits the left subtree, then the node, then the right subtree, which is exactly the BST order: smaller on the left, larger on the right.

? (tries) Which question does a trie answer faster than a hash set of words?
- [ ] Is this exact word present?
- [x] Which stored words start with this prefix?
- [ ] How many words are stored?
> A hash set needs the whole word. A trie follows the prefix one letter at a time, and everything below that point shares the prefix.

? (heaps) What's an efficient way to find the k largest of n numbers?
- [ ] Sort everything: O(n log n)
- [x] Keep a min-heap of size k, replacing its smallest when a bigger number arrives: O(n log k)
- [ ] Use a max-heap of all n numbers and never pop
> The heap's top is the smallest of the k best so far, the one to beat. With k much smaller than n, O(n log k) beats a full sort.

? (backtracking) How many subsets does a set of n elements have?
- [ ] n²
- [x] 2ⁿ
- [ ] n!
> Each element is either in or out: two choices, n times. That's why listing all subsets takes exponential time, whatever the algorithm.

? (graphs) Which algorithm finds the fewest steps between two cells of a grid when every step costs the same?
- [x] Breadth-first search
- [ ] Depth-first search
- [ ] Sorting the cells by distance
> BFS explores in rings of increasing distance, so the first time it reaches a cell, it got there in the fewest steps. DFS can wander far before finding a short path.

? (intervals) To merge overlapping meetings, what's the first step?
- [x] Sort them by start time
- [ ] Sort them by length
- [ ] Put them in a hash map by end time
> Sorted by start, every meeting that overlaps the current merged block comes right after it, so one pass merges everything.

? (greedy) Coins are worth 1, 3 and 4. Does "always take the largest coin that fits" use the fewest coins for 6?
- [ ] Yes, greedy is always optimal for coins
- [x] No: it takes 4 + 1 + 1, but 3 + 3 uses only two coins
- [ ] It depends on the order of the coins
> Greedy works for some coin systems, such as 1, 2, 5, but not for all. When a greedy choice can rule out the best answer, dynamic programming is the safe tool.

? (dp) Which property makes a problem a good fit for dynamic programming?
- [ ] The input is sorted
- [x] It breaks into smaller versions of itself, and the same ones come up again and again
- [ ] It needs a graph
> Dynamic programming solves each subproblem once and reuses the answer. Without repeated subproblems there's nothing to save.

? (bits-math) What is `x ^ x` for any integer x?
- [x] 0
- [ ] x
- [ ] 2x
> XOR sets the bits where the two numbers differ, and a number doesn't differ from itself. That's why XOR-ing a list cancels every pair.
:::
