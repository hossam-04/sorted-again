---
id: 355
module: heaps
patterns: [merging sorted lists with a heap, hash map of sets]
kind: design
class: Twitter
---

## Task

Build a class `Twitter` for a tiny social network where users post short messages (tweets), follow each other and read a news feed:

- `Twitter()` starts with no users, tweets or follows.
- `postTweet(userId, tweetId)` records that `userId` posted the tweet `tweetId`. Every call uses a new `tweetId`.
- `getNewsFeed(userId)` returns the ids of the 10 most recent tweets posted by `userId` or by anyone `userId` follows, newest first (all of them if there are fewer than 10).
- `follow(followerId, followeeId)` makes `followerId` follow `followeeId`. Following someone again changes nothing.
- `unfollow(followerId, followeeId)` stops that. Unfollowing someone you don't follow changes nothing.

"Most recent" means most recently posted, whatever the ids are. Users never follow or unfollow themselves. Tests list the method names called in order, their arguments, and what each call returns.

## Constraints

- `1 <= userId, followerId, followeeId <= 500`
- `0 <= tweetId <= 10**5`, all different
- At most `40_000` calls in total

```python starter
class Twitter:
    def __init__(self):
        pass

    def postTweet(self, userId: int, tweetId: int) -> None:
        pass

    def getNewsFeed(self, userId: int) -> List[int]:
        pass

    def follow(self, followerId: int, followeeId: int) -> None:
        pass

    def unfollow(self, followerId: int, followeeId: int) -> None:
        pass
```

```json examples
[
  {"ops": ["Twitter", "postTweet", "postTweet", "getNewsFeed", "follow", "getNewsFeed"], "args": [[], [1, 101], [2, 202], [1], [1, 2], [1]], "out": [null, null, null, [101], null, [202, 101]], "why": "User 1 sees only their own tweet until they follow user 2. Then 202, the newer tweet, comes first."},
  {"ops": ["Twitter", "postTweet", "postTweet", "postTweet", "postTweet", "postTweet", "postTweet", "postTweet", "postTweet", "postTweet", "postTweet", "postTweet", "getNewsFeed"], "args": [[], [4, 30], [4, 10], [4, 50], [4, 20], [4, 40], [4, 60], [4, 70], [4, 15], [4, 25], [4, 35], [4, 45], [4]], "out": [null, null, null, null, null, null, null, null, null, null, null, null, [45, 35, 25, 15, 70, 60, 40, 20, 50, 10]], "why": "Only the ten most recent tweets appear, newest first. The order is by posting time, not by id, so the one left out is the first tweet, 30."},
  {"ops": ["Twitter", "postTweet", "follow", "postTweet", "postTweet", "getNewsFeed", "unfollow", "getNewsFeed"], "args": [[], [3, 30], [3, 4], [4, 40], [3, 31], [3], [3, 4], [3]], "out": [null, null, null, null, null, [31, 40, 30], null, [31, 30]], "why": "User 3's feed mixes their own tweets with user 4's, by time. After unfollowing user 4, user 4's tweet leaves the feed."}
]
```

```json edge
[
  {"name": "an empty feed", "ops": ["Twitter", "getNewsFeed"], "args": [[], [7]], "out": [null, []]},
  {"name": "following twice, unfollowing once", "ops": ["Twitter", "postTweet", "follow", "follow", "unfollow", "getNewsFeed"], "args": [[], [2, 9], [1, 2], [1, 2], [1, 2], [1]], "out": [null, null, null, null, null, []]},
  {"name": "unfollowing someone not followed", "ops": ["Twitter", "postTweet", "unfollow", "getNewsFeed"], "args": [[], [1, 3], [1, 2], [1]], "out": [null, null, null, [3]]},
  {"name": "tweets from before the follow", "ops": ["Twitter", "postTweet", "postTweet", "follow", "getNewsFeed"], "args": [[], [5, 1], [5, 2], [6, 5], [6]], "out": [null, null, null, null, [2, 1]]},
  {"name": "following is one-way", "ops": ["Twitter", "follow", "postTweet", "getNewsFeed", "getNewsFeed"], "args": [[], [1, 2], [1, 8], [2], [1]], "out": [null, null, null, [], [8]]},
  {"name": "a tweet id of 0", "ops": ["Twitter", "postTweet", "getNewsFeed"], "args": [[], [1, 0], [1]], "out": [null, null, [0]]},
  {"name": "ten from three users", "ops": ["Twitter", "follow", "follow", "postTweet", "postTweet", "postTweet", "postTweet", "postTweet", "postTweet", "postTweet", "postTweet", "postTweet", "postTweet", "postTweet", "postTweet", "getNewsFeed"], "args": [[], [1, 2], [1, 3], [1, 1], [2, 2], [3, 3], [1, 4], [2, 5], [3, 6], [1, 7], [2, 8], [3, 9], [1, 10], [2, 11], [3, 12], [1]], "out": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [12, 11, 10, 9, 8, 7, 6, 5, 4, 3]]}
]
```

```python oracle
class Twitter:
    def __init__(self):
        self.posts = []  # (userId, tweetId), oldest first
        self.follows = set()  # (followerId, followeeId)

    def postTweet(self, userId: int, tweetId: int) -> None:
        self.posts.append((userId, tweetId))

    def getNewsFeed(self, userId: int) -> List[int]:
        mine = [t for u, t in self.posts if u == userId or (userId, u) in self.follows]
        return mine[::-1][:10]

    def follow(self, followerId: int, followeeId: int) -> None:
        self.follows.add((followerId, followeeId))

    def unfollow(self, followerId: int, followeeId: int) -> None:
        self.follows.discard((followerId, followeeId))
```

```python gen
def gen(rng, size):
    users = list(range(1, 4)) if size == "small" else list(range(1, 7))
    calls = rng.randint(1, 12) if size == "small" else rng.randint(20, 300)
    ids = rng.sample(range(10**5 + 1), calls)
    ops, args = ["Twitter"], [[]]
    for i in range(calls):
        r, u = rng.random(), rng.choice(users)
        if r < 0.4:
            ops.append("postTweet")
            args.append([u, ids[i]])
        elif r < 0.7:
            ops.append("getNewsFeed")
            args.append([u])
        else:
            ops.append("follow" if r < 0.85 else "unfollow")
            args.append([u, rng.choice([v for v in users if v != u])])
    return {"ops": ops, "args": args}
```

```python perf
def perf(rng):
    # User 1 follows user 2, who tweeted 10 times at the start. User 100 follows 30 busy users who then
    # post 15,000 tweets. Then both read their feeds 7,500 times each.
    ops, args = ["Twitter"], [[]]
    for t in range(10):
        ops.append("postTweet")
        args.append([2, t])
    ops.append("follow")
    args.append([1, 2])
    for u in range(3, 33):
        ops.append("follow")
        args.append([100, u])
    for t in range(10, 15_010):
        ops.append("postTweet")
        args.append([rng.randint(3, 32), t])
    for i in range(15_000):
        ops.append("getNewsFeed")
        args.append([1 if i % 2 else 100])
    return {"ops": ops, "args": args}
```

## Hints

1. Number every tweet with a counter that goes up on each post, so you can tell which tweet is newer. Store each user's tweets in their own list, oldest first.
2. A feed merges several lists that are each already in time order: the user's own and those of everyone they follow. You only need the 10 newest tweets of the merge.
3. Merge with a max-heap: push each followed user's newest tweet, then pop the newest of all and push that user's next older tweet. Stop after 10 pops.

## Solution

```python solution time="f" space="total tweets"
class Twitter:
    def __init__(self):
        self.time = 0
        self.tweets = defaultdict(list)  # userId -> [(time, tweetId)], oldest first
        self.follows = defaultdict(set)  # userId -> the users they follow

    def postTweet(self, userId: int, tweetId: int) -> None:
        self.tweets[userId].append((self.time, tweetId))
        self.time += 1

    def getNewsFeed(self, userId: int) -> List[int]:
        heap = []  # one entry per user: their newest tweet not yet taken, as (-time, tweetId, user, index)
        for u in self.follows[userId] | {userId}:
            if self.tweets[u]:
                i = len(self.tweets[u]) - 1
                t, tweetId = self.tweets[u][i]
                heap.append((-t, tweetId, u, i))
        heapify(heap)
        feed = []
        while heap and len(feed) < 10:
            _, tweetId, u, i = heappop(heap)  # the newest tweet of all
            feed.append(tweetId)
            if i > 0:  # that user's next older tweet takes its place
                t, older = self.tweets[u][i - 1]
                heappush(heap, (-t, older, u, i - 1))
        return feed

    def follow(self, followerId: int, followeeId: int) -> None:
        self.follows[followerId].add(followeeId)

    def unfollow(self, followerId: int, followeeId: int) -> None:
        self.follows[followerId].discard(followeeId)
```

Each user's tweets form a list sorted by time, so a feed is a merge of sorted lists, and only its first 10 items are needed. The heap holds one candidate per user, their newest tweet not yet taken; popping gives the newest tweet overall, and that user's next older tweet takes its place. That's the same k-way merge as [[p:23]], stopped after 10 items.

With f the number of users followed, a feed costs O(f) to build the heap plus 10 pops and pushes of O(log f) each, so O(f). Posting, following and unfollowing are O(1). Sets make following twice harmless, and `discard`, unlike `remove`, ignores a user who isn't followed.

## Alternatives

### Let `heapq.merge` do the merging

```python alt time="f" space="total tweets"
class Twitter:
    def __init__(self):
        self.time = 0
        self.tweets = defaultdict(list)
        self.follows = defaultdict(set)

    def postTweet(self, userId: int, tweetId: int) -> None:
        self.tweets[userId].append((self.time, tweetId))
        self.time += 1

    def getNewsFeed(self, userId: int) -> List[int]:
        streams = [reversed(self.tweets[u]) for u in self.follows[userId] | {userId}]  # each newest first
        newest = merge(*streams, reverse=True)  # lazy: it only reads as far as we take
        return [tweetId for _, tweetId in islice(newest, 10)]

    def follow(self, followerId: int, followeeId: int) -> None:
        self.follows[followerId].add(followeeId)

    def unfollow(self, followerId: int, followeeId: int) -> None:
        self.follows[followerId].discard(followeeId)
```

`heapq.merge` merges already sorted inputs with the same heap technique, and it's lazy: `islice` takes 10 items, so only about 10 tweets are read past the first one of each stream. With `reverse=True`, every stream must run newest first, which `reversed` gives without copying.

## Wrong answers

### Leaves out the user's own tweets

```python wrong fails="example" test="Example 1"
class Twitter:
    def __init__(self):
        self.time = 0
        self.tweets = defaultdict(list)
        self.follows = defaultdict(set)

    def postTweet(self, userId: int, tweetId: int) -> None:
        self.tweets[userId].append((self.time, tweetId))
        self.time += 1

    def getNewsFeed(self, userId: int) -> List[int]:
        heap = []
        for u in self.follows[userId]:  # only the people followed, not the user
            if self.tweets[u]:
                i = len(self.tweets[u]) - 1
                t, tweetId = self.tweets[u][i]
                heap.append((-t, tweetId, u, i))
        heapify(heap)
        feed = []
        while heap and len(feed) < 10:
            _, tweetId, u, i = heappop(heap)
            feed.append(tweetId)
            if i > 0:
                t, older = self.tweets[u][i - 1]
                heappush(heap, (-t, older, u, i - 1))
        return feed

    def follow(self, followerId: int, followeeId: int) -> None:
        self.follows[followerId].add(followeeId)

    def unfollow(self, followerId: int, followeeId: int) -> None:
        self.follows[followerId].discard(followeeId)
```

A user's feed includes their own tweets, but users don't follow themselves, so the loop has to add them explicitly. Here user 1's first feed is empty instead of `[101]`.

### Fails when unfollowing someone not followed

```python wrong fails="edge" test="unfollowing someone not followed" how="error"
class Twitter:
    def __init__(self):
        self.time = 0
        self.tweets = defaultdict(list)
        self.follows = defaultdict(set)

    def postTweet(self, userId: int, tweetId: int) -> None:
        self.tweets[userId].append((self.time, tweetId))
        self.time += 1

    def getNewsFeed(self, userId: int) -> List[int]:
        heap = []
        for u in self.follows[userId] | {userId}:
            if self.tweets[u]:
                i = len(self.tweets[u]) - 1
                t, tweetId = self.tweets[u][i]
                heap.append((-t, tweetId, u, i))
        heapify(heap)
        feed = []
        while heap and len(feed) < 10:
            _, tweetId, u, i = heappop(heap)
            feed.append(tweetId)
            if i > 0:
                t, older = self.tweets[u][i - 1]
                heappush(heap, (-t, older, u, i - 1))
        return feed

    def follow(self, followerId: int, followeeId: int) -> None:
        self.follows[followerId].add(followeeId)

    def unfollow(self, followerId: int, followeeId: int) -> None:
        self.follows[followerId].remove(followeeId)  # raises KeyError if not followed
```

`set.remove` raises `KeyError` when the item isn't in the set, but unfollowing someone you don't follow should do nothing. `set.discard` removes the item if it's there and quietly does nothing otherwise.

### Shows every tweet, not just ten

```python wrong fails="example" test="Example 2"
class Twitter:
    def __init__(self):
        self.time = 0
        self.tweets = defaultdict(list)
        self.follows = defaultdict(set)

    def postTweet(self, userId: int, tweetId: int) -> None:
        self.tweets[userId].append((self.time, tweetId))
        self.time += 1

    def getNewsFeed(self, userId: int) -> List[int]:
        heap = []
        for u in self.follows[userId] | {userId}:
            if self.tweets[u]:
                i = len(self.tweets[u]) - 1
                t, tweetId = self.tweets[u][i]
                heap.append((-t, tweetId, u, i))
        heapify(heap)
        feed = []
        while heap:  # no limit of 10
            _, tweetId, u, i = heappop(heap)
            feed.append(tweetId)
            if i > 0:
                t, older = self.tweets[u][i - 1]
                heappush(heap, (-t, older, u, i - 1))
        return feed

    def follow(self, followerId: int, followeeId: int) -> None:
        self.follows[followerId].add(followeeId)

    def unfollow(self, followerId: int, followeeId: int) -> None:
        self.follows[followerId].discard(followeeId)
```

The feed shows at most 10 tweets. Without the limit, this one returns all 11 of user 4's tweets in Example 2. Besides being wrong, merging everything does far more work than the 10 pops a feed needs.

### Sorts every followed tweet for each feed

```python wrong fails="perf"
class Twitter:
    def __init__(self):
        self.time = 0
        self.tweets = defaultdict(list)
        self.follows = defaultdict(set)

    def postTweet(self, userId: int, tweetId: int) -> None:
        self.tweets[userId].append((self.time, tweetId))
        self.time += 1

    def getNewsFeed(self, userId: int) -> List[int]:
        everything = []
        for u in self.follows[userId] | {userId}:
            everything += self.tweets[u]  # every tweet of every followed user
        everything.sort(reverse=True)
        return [tweetId for _, tweetId in everything[:10]]

    def follow(self, followerId: int, followeeId: int) -> None:
        self.follows[followerId].add(followeeId)

    def unfollow(self, followerId: int, followeeId: int) -> None:
        self.follows[followerId].discard(followeeId)
```

Gathering every tweet and sorting gives the right feed, but it costs time in proportion to all the tweets of everyone followed, to show just 10 of them. In the performance test, user 100 follows people with 15,000 tweets between them and reads the feed 7,500 times. The heap merge stops after 10 tweets.
