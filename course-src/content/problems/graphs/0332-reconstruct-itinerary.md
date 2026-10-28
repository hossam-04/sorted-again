---
id: 332
module: graphs
patterns: [Eulerian path, Hierholzer's algorithm, smallest choice first]
signature: "def findItinerary(self, tickets: List[List[str]]) -> List[str]"
---

## Task

A traveller's plane tickets have been shuffled. Each ticket is a pair `[from, to]` of three-letter airport codes. The traveller started at `"JFK"` and used every ticket exactly once.

Return the trip: the airports in the order they were visited. If several trips use every ticket, return the one that comes first alphabetically when compared airport by airport. At least one trip always exists.

## Constraints

- `1 <= len(tickets) <= 15_000`
- Every code is three uppercase letters, and no ticket goes from an airport to itself
- The same ticket can appear more than once

```json examples
[
  {"args": [[["JFK", "BOS"], ["BOS", "ORD"], ["ORD", "DEN"]]], "out": ["JFK", "BOS", "ORD", "DEN"], "why": "Each airport has one way out, so the trip just follows the chain of tickets."},
  {"args": [[["JFK", "ANC"], ["JFK", "SEA"], ["SEA", "JFK"]]], "out": ["JFK", "SEA", "JFK", "ANC"], "why": "ANC comes first alphabetically, but flying there first would end the trip with two tickets unused. The smallest trip that uses every ticket starts with SEA."},
  {"args": [[["JFK", "MIA"], ["MIA", "JFK"], ["JFK", "MIA"]]], "out": ["JFK", "MIA", "JFK", "MIA"], "why": "The same ticket appears twice: there are two separate flights from JFK to MIA."}
]
```

```json edge
[
  {"name": "a single ticket", "args": [[["JFK", "SFO"]]], "out": ["JFK", "SFO"]},
  {"name": "there and back", "args": [[["JFK", "BOS"], ["BOS", "JFK"]]], "out": ["JFK", "BOS", "JFK"]},
  {"name": "two loops through JFK", "args": [[["JFK", "AUS"], ["AUS", "JFK"], ["JFK", "BOS"], ["BOS", "JFK"]]], "out": ["JFK", "AUS", "JFK", "BOS", "JFK"]},
  {"name": "the dead end must come last", "args": [[["JFK", "KUL"], ["JFK", "NRT"], ["NRT", "JFK"]]], "out": ["JFK", "NRT", "JFK", "KUL"]},
  {"name": "the smallest choice works every time", "args": [[["JFK", "LHR"], ["LHR", "CDG"], ["CDG", "JFK"], ["JFK", "CDG"], ["CDG", "LHR"]]], "out": ["JFK", "CDG", "JFK", "LHR", "CDG", "LHR"]}
]
```

```python oracle
class Solution:
    def findItinerary(self, tickets: List[List[str]]) -> List[str]:
        tickets = sorted(tickets)
        used = [False] * len(tickets)
        route = ["JFK"]

        def backtrack():  # try tickets in alphabetical order; the first complete trip is the smallest
            if len(route) == len(tickets) + 1:
                return True
            for i, (a, b) in enumerate(tickets):
                if not used[i] and a == route[-1] and (i == 0 or used[i - 1] or tickets[i - 1] != tickets[i]):
                    used[i] = True
                    route.append(b)
                    if backtrack():
                        return True
                    route.pop()
                    used[i] = False
            return False

        backtrack()
        return route
```

```python gen
def gen(rng, size):
    airports = ["JFK", "ATL", "BOS", "CDG"] if size == "small" else ["JFK", "ATL", "BOS", "CDG", "DEN", "EWR"]
    length = rng.randint(1, 4) if size == "small" else rng.randint(5, 10)
    here, tickets = "JFK", []
    for _ in range(length):  # a random walk from JFK guarantees a valid trip
        there = rng.choice([a for a in airports if a != here])
        tickets.append([here, there])
        here = there
    rng.shuffle(tickets)
    return [tickets]
```

```python perf
def perf(rng):
    import itertools
    # 2,000 round trips JFK -> P -> JFK, plus one long chain of 10,000 tickets starting at JFK. The chain's
    # first airport is the smallest code, so it's tempting from JFK, but it must be flown last.
    codes = ["".join(c) for c in itertools.product("ABCDEFGHIJKLMNOPQRSTUVWXYZ", repeat=3) if "".join(c) != "JFK"]
    chain, petals = codes[:10_000], codes[10_000:12_000]
    tickets = [["JFK", chain[0]]] + [[chain[i], chain[i + 1]] for i in range(len(chain) - 1)]
    for p in petals:
        tickets += [["JFK", p], [p, "JFK"]]
    rng.shuffle(tickets)
    return [tickets]
```

## Hints

1. Airports are nodes and tickets are directed edges; the trip uses every edge exactly once. That's an *Eulerian path*.
2. Always flying to the alphabetically smallest destination fails when that destination is a dead end you reach too early. But a dead end can only be the *last* stop of the trip.
3. Hierholzer's algorithm: keep flying (smallest destination first) until you're stuck. The airport where you get stuck goes at the *end* of the route; then back up and continue from the previous airport. Build the route backwards and reverse it.

## Solution

```python solution time="E log E" space="E"
class Solution:
    def findItinerary(self, tickets: List[List[str]]) -> List[str]:
        flights = defaultdict(list)
        for a, b in sorted(tickets, reverse=True):
            flights[a].append(b)  # reverse order, so pop() gives the smallest destination
        route, stack = [], ["JFK"]
        while stack:
            if flights[stack[-1]]:
                stack.append(flights[stack[-1]].pop())  # fly on, smallest destination first
            else:
                route.append(stack.pop())  # stuck here: this airport comes as late as possible
        return route[::-1]
```

The walk takes the smallest ticket out of the current airport until it reaches an airport with no tickets left. That airport must be where the trip ends (or where some remaining loop later rejoins it), so it's appended to the route, and the walk backs up to the previous airport to fly its remaining tickets. Airports are added to the route in reverse order of the final trip, so the route is reversed at the end.

Choosing the smallest destination at each step and only committing airports once they're stuck yields the alphabetically smallest trip. Sorting costs O(E log E), and the walk handles each ticket once. The explicit stack avoids recursion, which would be one level per ticket.

## Alternatives

### Recursive Hierholzer

```python alt time="E log E" space="E"
class Solution:
    def findItinerary(self, tickets: List[List[str]]) -> List[str]:
        flights = defaultdict(list)
        for a, b in sorted(tickets, reverse=True):
            flights[a].append(b)
        route = []

        def visit(airport):
            while flights[airport]:
                visit(flights[airport].pop())
            route.append(airport)  # appended once every ticket out of it is used

        visit("JFK")
        return route[::-1]
```

The same algorithm written recursively is shorter. Its recursion is as deep as the longest run of tickets before the first dead end, which here can be 10,000 calls: fine on this page, but beyond plain Python's default limit of 1,000.

## Wrong answers

### Always flies to the smallest destination

```python wrong fails="example" test="Example 2"
class Solution:
    def findItinerary(self, tickets: List[List[str]]) -> List[str]:
        flights = defaultdict(list)
        for a, b in sorted(tickets):
            flights[a].append(b)
        route = ["JFK"]
        while flights[route[-1]]:
            route.append(flights[route[-1]].pop(0))  # smallest first, never reconsidered
        return route
```

Flying to the smallest destination at every step can walk into the trip's final airport too early. In Example 2 it flies JFK → ANC and gets stuck there with two tickets left. The answer must use every ticket; Hierholzer's algorithm places such dead ends at the end of the route.

### Forgets to reverse the route

```python wrong fails="example" test="Example 1"
class Solution:
    def findItinerary(self, tickets: List[List[str]]) -> List[str]:
        flights = defaultdict(list)
        for a, b in sorted(tickets, reverse=True):
            flights[a].append(b)
        route, stack = [], ["JFK"]
        while stack:
            if flights[stack[-1]]:
                stack.append(flights[stack[-1]].pop())
            else:
                route.append(stack.pop())
        return route  # built from the last airport to the first
```

Airports join the route when the walk gets stuck there, and the very first one stuck is the end of the trip. The route comes out backwards; reverse it.

### Backtracks over every choice

```python wrong fails="perf"
class Solution:
    def findItinerary(self, tickets: List[List[str]]) -> List[str]:
        flights = defaultdict(list)
        for a, b in sorted(tickets):
            flights[a].append(b)
        route = ["JFK"]

        def backtrack():
            if len(route) == len(tickets) + 1:
                return True
            here = route[-1]
            for i in range(len(flights[here])):
                there = flights[here].pop(i)  # try the i-th smallest destination
                route.append(there)
                if backtrack():
                    return True
                route.pop()
                flights[here].insert(i, there)  # undo, and try the next one
            return False

        backtrack()
        return route
```

Trying the destinations in order and backing up from dead ends finds the right trip, but it can redo enormous amounts of work. In the test, every return to JFK first tries the chain of 10,000 tickets, which only ends in failure after its last airport: 2,000 times 10,000 steps. Hierholzer's algorithm never undoes a flight.
