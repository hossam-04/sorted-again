---
id: 846
module: greedy
patterns: [smallest card first, counting]
signature: "def isNStraightHand(self, hand: List[int], groupSize: int) -> bool"
---

## Task

You hold some cards, each with a number, in `hand`. Can you split them into groups of exactly `groupSize` cards, where each group is a run of consecutive numbers, like 4, 5, 6? Every card must be in exactly one group. Return `True` or `False`.

## Constraints

- `1 <= len(hand) <= 100_000`
- `0 <= hand[i] <= 10**9`
- `1 <= groupSize <= len(hand)`

```json examples
[
  {"args": [[5, 1, 3, 2, 4, 6], 3], "out": true, "why": "1 2 3 and 4 5 6."},
  {"args": [[1, 2, 2, 3, 3, 4], 3], "out": true, "why": "The smallest card, 1, has to start a group: 1 2 3. What's left, 2 3 4, is a run too."},
  {"args": [[1, 2, 3, 3, 4, 6], 3], "out": false, "why": "1 must start a group, and it has to be 1 2 3. The rest, 3 4 6, has a gap."}
]
```

```json edge
[
  {"name": "groups of one", "args": [[7, 7], 1], "out": true},
  {"name": "not a multiple of the group size", "args": [[1, 2, 3, 4], 3], "out": false},
  {"name": "several identical groups", "args": [[2, 2, 3, 3, 4, 4], 3], "out": true},
  {"name": "huge numbers", "args": [[1000000000, 999999999], 2], "out": true},
  {"name": "a gap in a pair", "args": [[1, 3], 2], "out": false}
]
```

```python oracle
class Solution:
    def isNStraightHand(self, hand: List[int], groupSize: int) -> bool:
        cards = sorted(hand)
        while cards:  # take the smallest card's run out of the sorted list
            first = cards[0]
            for x in range(first, first + groupSize):
                if x not in cards:
                    return False
                cards.remove(x)
        return True
```

```python gen
def gen(rng, size):
    k = rng.randint(1, 3) if size == "small" else rng.randint(2, 4)
    groups = rng.randint(1, 3) if size == "small" else rng.randint(2, 6)
    hand = []
    for _ in range(groups):  # build valid groups...
        s = rng.randint(0, 8)
        hand += list(range(s, s + k))
    if rng.random() < 0.5 and hand:  # ...and sometimes spoil one card
        hand[rng.randrange(len(hand))] += rng.choice([-1, 1, 2])
    rng.shuffle(hand)
    return [hand, k]
```

```python perf
def perf(rng):
    # 20,000 copies each of 1, 2, 3, 4 and 5, shuffled: 100,000 cards that form 20,000 runs of five.
    hand = [v for v in range(1, 6) for _ in range(20_000)]
    rng.shuffle(hand)
    return [hand, 5]
```

## Hints

1. Look at the smallest card. It can't be in the middle or at the end of a run, since no smaller card exists, so it must *start* one.
2. That group is forced: the smallest card and the next `groupSize − 1` numbers. Remove them and repeat with the new smallest card.
3. Count the cards with a `Counter`. Go through the distinct numbers in increasing order; if number x is still present c times, the next `groupSize` numbers must each be present at least c times, and you use them up.

## Solution

```python solution time="n log n" space="n"
class Solution:
    def isNStraightHand(self, hand: List[int], groupSize: int) -> bool:
        if len(hand) % groupSize:
            return False
        count = Counter(hand)
        for x in sorted(count):  # the smallest remaining number must start its groups
            c = count[x]
            if c == 0:
                continue  # already used up by earlier groups
            for y in range(x, x + groupSize):  # c groups start at x, so they need c of each number
                if count[y] < c:
                    return False
                count[y] -= c
        return True
```

The smallest card left must start a group, and that group is completely determined. If there are c copies of the smallest number, all c of them start groups, so each of the next numbers is needed c times at once. Handling the copies together means each distinct number is processed once, and the groups' work adds up to n. Sorting the distinct numbers dominates: O(n log n).

## Alternatives

### A min-heap of the distinct numbers

```python alt time="n log n" space="n"
class Solution:
    def isNStraightHand(self, hand: List[int], groupSize: int) -> bool:
        if len(hand) % groupSize:
            return False
        count = Counter(hand)
        heap = list(count)
        heapify(heap)
        while heap:
            first = heap[0]  # the smallest number with cards left
            for x in range(first, first + groupSize):
                if count[x] == 0:
                    return False
                count[x] -= 1
                if count[x] == 0:
                    if x != heap[0]:
                        return False  # x ran out while a smaller number still has cards: they can never be grouped
                    heappop(heap)
        return True
```

This version builds one group at a time from the smallest number left. A number may only run out when it's the smallest one still present; if a larger number runs out first, the smaller cards left behind can't all finish their runs.

## Wrong answers

### Sorts and cuts into chunks

```python wrong fails="example" test="Example 2"
class Solution:
    def isNStraightHand(self, hand: List[int], groupSize: int) -> bool:
        cards = sorted(hand)
        if len(cards) % groupSize:
            return False
        for i in range(0, len(cards), groupSize):  # consecutive positions, not consecutive numbers
            chunk = cards[i:i + groupSize]
            if any(chunk[j + 1] != chunk[j] + 1 for j in range(groupSize - 1)):
                return False
        return True
```

Cutting the sorted hand into consecutive chunks ignores duplicates: 1 2 2 3 3 4 becomes 1 2 2 and 3 3 4, neither a run, though 1 2 3 and 2 3 4 work. Groups must be built from the numbers, not from positions.

### Starts groups in no particular order

```python wrong fails="example" test="Example 1"
class Solution:
    def isNStraightHand(self, hand: List[int], groupSize: int) -> bool:
        count = Counter(hand)
        for x in count:  # insertion order, not increasing order
            c = count[x]
            if c == 0:
                continue
            for y in range(x, x + groupSize):
                if count[y] < c:
                    return False
                count[y] -= c
        return True
```

The counting step is only safe for the *smallest* number left, which is sure to start a group. Taking the numbers in the order they first appear, Example 1 tries to start a group at 5, needing 5 6 7, and fails on the missing 7. Go through the numbers in increasing order.

### Scans forward for each next card

```python wrong fails="perf"
class Solution:
    def isNStraightHand(self, hand: List[int], groupSize: int) -> bool:
        cards = sorted(hand)
        used = [False] * len(cards)
        for i in range(len(cards)):
            if used[i]:
                continue
            used[i] = True  # cards[i] starts a group
            need, j = cards[i] + 1, i + 1
            for _ in range(groupSize - 1):
                while j < len(cards) and (used[j] or cards[j] != need):  # walk past everything else
                    j += 1
                if j == len(cards):
                    return False
                used[j] = True
                need += 1
        return True
```

The smallest-first rule is right, but each group searches the sorted list from its first card for the next number it needs, stepping over every other card on the way. With 20,000 copies of each of 1 to 5, each group walks past tens of thousands of cards to find its 2, its 3, its 4 and its 5: over a billion steps in all. Counting the cards finds each number in O(1).
