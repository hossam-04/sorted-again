from collections import deque


def take_courses(n, prereqs):
    unlocks = [[] for _ in range(n)]
    waiting = [0] * n
    for a, b in prereqs:
        unlocks[b].append(a)              # @ Course {a} needs course {b} first.
        waiting[a] += 1
    queue = deque(c for c in range(n) if waiting[c] == 0)  # @ Courses with nothing to wait for go in the queue: {list(queue)}.
    order = []
    while queue:
        c = queue.popleft()               # @ Take course {c}: everything it needs is done.
        order.append(c)
        for nxt in unlocks[c]:
            waiting[nxt] -= 1             # @ Course {nxt} needed {c}; now it waits for {waiting[nxt]} more.
            if waiting[nxt] == 0:
                queue.append(nxt)         # @ Course {nxt} has nothing left to wait for, so it joins the queue.
    return order                          # @ {'All ' + str(n) + ' courses are in a valid order.' if len(order) == n else 'Some courses never became ready: they are on a cycle.'}
