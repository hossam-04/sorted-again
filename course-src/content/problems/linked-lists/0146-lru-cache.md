---
id: 146
module: linked-lists
patterns: [hash map plus doubly linked list, recency order]
kind: design
class: LRUCache
---

## Task

Build a class `LRUCache`: a key-value cache with a fixed capacity that, when full, throws out the **least recently used** key.

- `LRUCache(capacity)` creates an empty cache that holds at most `capacity` keys.
- `get(key)` returns the value stored for `key`, or -1 if the key isn't in the cache. A successful `get` counts as a use of that key.
- `put(key, value)` stores `value` for `key` (replacing any old value), which also counts as a use. If this adds a new key to a full cache, first remove the key whose last use is the oldest.

Both methods must run in O(1) average time. Tests list the method names called in order, their arguments, and what each call returns (`None` for the constructor and `put`).

## Constraints

- `1 <= capacity <= 100_000`
- `0 <= key <= 10**6`, `0 <= value <= 10**6`
- At most `200_000` calls in total

```python starter
class LRUCache:
    def __init__(self, capacity: int):
        pass

    def get(self, key: int) -> int:
        pass

    def put(self, key: int, value: int) -> None:
        pass
```

```json examples
[
  {"ops": ["LRUCache", "put", "put", "get", "put", "get", "get"], "args": [[2], [1, 10], [2, 20], [1], [3, 30], [2], [3]], "out": [null, null, null, 10, null, -1, 30], "why": "Reading key 1 makes key 2 the least recently used, so adding key 3 evicts key 2."},
  {"ops": ["LRUCache", "put", "put", "put", "put", "get", "get"], "args": [[2], [1, 1], [2, 2], [1, 5], [3, 3], [1], [2]], "out": [null, null, null, null, null, 5, -1], "why": "Updating key 1 is a use too, so key 2 is the one evicted when key 3 arrives."},
  {"ops": ["LRUCache", "put", "get", "put", "get", "get"], "args": [[1], [7, 70], [7], [8, 80], [7], [8]], "out": [null, null, 70, null, -1, 80], "why": "With room for one key, every new key replaces the previous one."}
]
```

```json edge
[
  {"name": "get on an empty cache", "ops": ["LRUCache", "get"], "args": [[3], [1]], "out": [null, -1]},
  {"name": "a key that was never stored", "ops": ["LRUCache", "put", "get"], "args": [[2], [1, 1], [9]], "out": [null, null, -1]},
  {"name": "capacity to spare", "ops": ["LRUCache", "put", "put", "get", "get"], "args": [[5], [1, 1], [2, 2], [1], [2]], "out": [null, null, null, 1, 2]},
  {"name": "the same key over and over", "ops": ["LRUCache", "put", "put", "put", "get"], "args": [[1], [4, 1], [4, 2], [4, 3], [4]], "out": [null, null, null, null, 3]},
  {"name": "eviction after several reads", "ops": ["LRUCache", "put", "put", "put", "get", "get", "put", "get", "get", "get"], "args": [[3], [1, 1], [2, 2], [3, 3], [1], [2], [4, 4], [3], [1], [2]], "out": [null, null, null, null, 1, 2, null, -1, 1, 2]},
  {"name": "a stored value of zero", "ops": ["LRUCache", "put", "get"], "args": [[1], [0, 0], [0]], "out": [null, null, 0]},
  {"name": "a failed get changes nothing", "ops": ["LRUCache", "put", "put", "get", "put", "get", "get"], "args": [[2], [1, 1], [2, 2], [5], [3, 3], [1], [2]], "out": [null, null, null, -1, null, -1, 2]}
]
```

```python gen
def gen(rng, size):
    capacity = rng.randint(1, 3) if size == "small" else rng.randint(2, 20)
    calls = rng.randint(1, 10) if size == "small" else rng.randint(20, 300)
    keys = range(0, 5) if size == "small" else range(0, 40)
    ops, args = ["LRUCache"], [[capacity]]
    for _ in range(calls):
        if rng.random() < 0.5:
            ops.append("put")
            args.append([rng.choice(keys), rng.randint(0, 100)])
        else:
            ops.append("get")
            args.append([rng.choice(keys)])
    return {"ops": ops, "args": args}
```

```python perf
def perf(rng):
    # Capacity 50,000: fill the cache, then 50,000 rounds of reading an old key and adding a new one,
    # so every round ends in an eviction.
    ops, args = ["LRUCache"], [[50_000]]
    for k in range(50_000):
        ops.append("put")
        args.append([k, k])
    for k in range(50_000, 100_000):
        ops += ["get", "put"]
        args += [[rng.randint(k - 50_000, k - 1)], [k, k]]
    return {"ops": ops, "args": args}
```

## Hints

1. A dict finds a key's value in O(1). The hard part is knowing which key was used least recently, and updating that order in O(1).
2. Keep the keys in a doubly linked list ordered by last use, newest at one end. Moving a node to that end, or removing the node at the other end, takes O(1) if you can reach the node directly.
3. So make the dict map each key to its *node* in the list. Two dummy nodes at the ends of the list remove the special cases.

## Solution

```python solution time="1" space="capacity"
class Node:
    def __init__(self, key=0, value=0):
        self.key, self.value = key, value
        self.prev = self.next = None


class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.nodes = {}  # key -> node in the recency list
        self.oldest, self.newest = Node(), Node()  # dummy ends: real nodes sit between them
        self.oldest.next, self.newest.prev = self.newest, self.oldest

    def _unlink(self, node):
        node.prev.next, node.next.prev = node.next, node.prev

    def _append(self, node):  # insert just before the newest end
        node.prev, node.next = self.newest.prev, self.newest
        self.newest.prev.next = node
        self.newest.prev = node

    def get(self, key: int) -> int:
        node = self.nodes.get(key)
        if node is None:
            return -1
        self._unlink(node)  # used now: move to the newest end
        self._append(node)
        return node.value

    def put(self, key: int, value: int) -> None:
        if key in self.nodes:
            self._unlink(self.nodes[key])
        elif len(self.nodes) == self.capacity:
            lru = self.oldest.next  # the least recently used key
            self._unlink(lru)
            del self.nodes[lru.key]
        node = Node(key, value)
        self.nodes[key] = node
        self._append(node)
```

Two structures work together. The dict finds the node for a key in O(1). The doubly linked list keeps every key in order of last use: the oldest just after the `oldest` dummy, the newest just before the `newest` dummy. Because each node knows both neighbours, it can be unlinked from the middle in O(1), and the dummies mean there's always a neighbour, so no `None` checks are needed.

Every use moves a key's node to the newest end. When a new key arrives in a full cache, the least recently used key is simply `oldest.next`. Nodes store their own key so the dict entry can be deleted at eviction time. Each operation touches a constant number of pointers: O(1) per call, and O(capacity) memory.

## Alternatives

### OrderedDict

```python alt time="1" space="capacity" oracle
class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.data = OrderedDict()  # oldest first

    def get(self, key: int) -> int:
        if key not in self.data:
            return -1
        self.data.move_to_end(key)
        return self.data[key]

    def put(self, key: int, value: int) -> None:
        if key in self.data:
            self.data.move_to_end(key)
        self.data[key] = value
        if len(self.data) > self.capacity:
            self.data.popitem(last=False)  # drop the oldest
```

`collections.OrderedDict` is a dict plus a doubly linked list of its keys, built in. `move_to_end` and `popitem(last=False)` are the two list operations an LRU cache needs. In real code this is the answer; in an interview, expect to be asked to build the linked list yourself.

## Wrong answers

### Reading doesn't count as a use

```python wrong fails="example" test="Example 1"
class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.data = OrderedDict()

    def get(self, key: int) -> int:
        return self.data.get(key, -1)  # never moves the key to the newest end

    def put(self, key: int, value: int) -> None:
        if key in self.data:
            self.data.move_to_end(key)
        self.data[key] = value
        if len(self.data) > self.capacity:
            self.data.popitem(last=False)
```

Without refreshing on `get`, the order only reflects writes, so the cache evicts the least recently *written* key. In Example 1, key 1 was just read, but it was written first, so it's thrown out instead of key 2.

### Updating a value doesn't count as a use

```python wrong fails="example" test="Example 2"
class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.data = OrderedDict()

    def get(self, key: int) -> int:
        if key not in self.data:
            return -1
        self.data.move_to_end(key)
        return self.data[key]

    def put(self, key: int, value: int) -> None:
        self.data[key] = value  # an existing key keeps its old place in the order
        if len(self.data) > self.capacity:
            self.data.popitem(last=False)
```

Assigning to an existing key of an `OrderedDict` changes its value but not its position. Key 1 is updated, stays the oldest, and is evicted when key 3 arrives, even though it was used more recently than key 2.

### Searches for the oldest key at every eviction

```python wrong fails="perf"
class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.values = {}
        self.last_used = {}  # key -> time of its last use
        self.clock = 0

    def get(self, key: int) -> int:
        if key not in self.values:
            return -1
        self.clock += 1
        self.last_used[key] = self.clock
        return self.values[key]

    def put(self, key: int, value: int) -> None:
        self.clock += 1
        if key not in self.values and len(self.values) == self.capacity:
            oldest = min(self.last_used, key=self.last_used.get)  # scans every key in the cache
            del self.values[oldest], self.last_used[oldest]
        self.values[key] = value
        self.last_used[key] = self.clock
```

Timestamps record recency correctly, but finding the smallest one scans every key: O(capacity) per eviction. With a capacity of 50,000 and 50,000 evictions, that's 2.5 billion comparisons. The linked list keeps the oldest key at a known place instead.
