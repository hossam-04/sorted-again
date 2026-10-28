def lcs(a, b):
    L = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]  # row 0 and column 0: empty prefixes
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            if a[i - 1] == b[j - 1]:
                L[i][j] = L[i - 1][j - 1] + 1  # @ {a[i - 1]} matches {b[j - 1]}: one more than the diagonal, {L[i - 1][j - 1]} + 1 = {L[i][j]}.
            else:
                L[i][j] = max(L[i - 1][j], L[i][j - 1])  # @ {a[i - 1]} and {b[j - 1]} differ: drop one of them, and keep the better result, {L[i][j]}.
    return L[len(a)][len(b)]                   # @ The bottom right cell is the answer: {L[len(a)][len(b)]}.
