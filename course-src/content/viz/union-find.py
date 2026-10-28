def count_groups(n, pairs):
    parent = list(range(n))
    size = [1] * n

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]  # @ Path halving: {x} now points to its grandparent, {parent[x]}, so later finds from {x} take fewer steps.
            x = parent[x]
        return x                           # @ {x} is the root of its group.

    groups = n
    for a, b in pairs:
        ra, rb = find(a), find(b)          # @ {a} is in the group of {ra}, and {b} in the group of {rb}.
        if ra == rb:
            continue                       # @ {a} and {b} are in the same group already: nothing changes.
        if size[ra] < size[rb]:
            ra, rb = rb, ra
        parent[rb] = ra                    # @ Hang the tree of {rb} (size {size[rb]}) under {ra} (size {size[ra]}): the smaller under the larger.
        size[ra] += size[rb]
        groups -= 1                        # @ Two groups became one: {groups} left.
    return groups
