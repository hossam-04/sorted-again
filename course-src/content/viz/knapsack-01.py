def knapsack(weights, values, capacity):
    n = len(weights)
    best = [[0] * (capacity + 1) for _ in range(n + 1)]  # best[i][c]: most value from the first i items within capacity c
    for i in range(1, n + 1):
        w, v = weights[i - 1], values[i - 1]
        for c in range(capacity + 1):
            best[i][c] = best[i - 1][c]        # @ Leave item {i} out: as good as the row above, {best[i][c]}.
            if w <= c and best[i - 1][c - w] + v > best[i][c]:
                best[i][c] = best[i - 1][c - w] + v  # @ Put item {i} in (weight {w}, value {v}): the best for capacity {c - w} without it, {best[i - 1][c - w]}, plus {v} = {best[i][c]}. Better.
    return best[n][capacity]                   # @ The most value that fits in capacity {capacity} is {best[n][capacity]}.
