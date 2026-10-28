from heapq import heappop, heappush
from math import inf


def shortest_times(graph, start):
    dist = {start: 0}
    done = set()
    heap = [(0, start)]
    while heap:
        d, u = heappop(heap)              # @ The earliest entry in the heap: {u} at {d}.
        if u in done:
            continue                      # @ A stale entry: {u} was already settled at {dist[u]}.
        done.add(u)                       # @ {u} is settled: no route can reach it sooner than {d}.
        for v, w in graph[u]:
            if v not in done and d + w < dist.get(v, inf):
                dist[v] = d + w           # @ Through {u}, {v} takes {d} + {w} = {dist[v]}: better than any route known before.
                heappush(heap, (dist[v], v))
    return dist                           # @ Every node is settled with its shortest time from {start}.
