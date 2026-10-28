def find_bridges(graph, start):
    disc, low, bridges = {}, {}, []
    clock = [0]

    def dfs(u, parent):
        disc[u] = low[u] = clock[0]        # @ Discover {u} at time {disc[u]}. For now, the earliest it can reach is itself.
        clock[0] += 1
        for v in graph[u]:
            if v == parent:
                continue
            if v in disc:
                low[u] = min(low[u], disc[v])  # @ {u}–{v} leads back to {v}, discovered at time {disc[v]}: low[{u}] is now {low[u]}.
            else:
                dfs(v, u)
                low[u] = min(low[u], low[v])   # @ Back from {v}: its subtree reaches back to time {low[v]}, so low[{u}] = {low[u]}.
                if low[v] > disc[u]:
                    bridges.append(u + v)      # @ Nothing below {v} reaches {u} or earlier (low {low[v]} > disc {disc[u]}): {u}–{v} is a bridge.

    dfs(start, None)
    return bridges                            # @ The bridges: {', '.join(b[0] + '–' + b[1] for b in bridges) or 'none'}.
