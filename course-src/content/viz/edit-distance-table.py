def edit_distance(a, b):
    D = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(len(a) + 1):
        D[i][0] = i                            # @ Turning {repr(a[:i])} into nothing takes {i} deletion{'s' if i != 1 else ''}.
    for j in range(len(b) + 1):
        D[0][j] = j                            # @ Turning nothing into {repr(b[:j])} takes {j} insertion{'s' if j != 1 else ''}.
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            if a[i - 1] == b[j - 1]:
                D[i][j] = D[i - 1][j - 1]      # @ {a[i - 1]} = {b[j - 1]}: keep it, free. Same cost as the diagonal: {D[i][j]}.
            else:
                D[i][j] = 1 + min(D[i - 1][j - 1], D[i - 1][j], D[i][j - 1])  # @ {a[i - 1]} ≠ {b[j - 1]}: 1 + the cheapest of replace ({D[i - 1][j - 1]}), delete ({D[i - 1][j]}) or insert ({D[i][j - 1]}) = {D[i][j]}.
    return D[len(a)][len(b)]                   # @ {repr(a)} becomes {repr(b)} in {D[len(a)][len(b)]} edit{'s' if D[len(a)][len(b)] != 1 else ''}.
