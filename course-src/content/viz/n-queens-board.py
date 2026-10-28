def first_solution(n):
    queens = []  # queens[r] = the column of the queen in row r
    cols, diag, anti = set(), set(), set()

    def place(r):
        if r == n:
            return True                       # @ A queen in every row, none attacking another: a solution.
        for c in range(n):
            if c in cols or r - c in diag or r + c in anti:
                continue                      # @ ({r}, {c}) is attacked by a queen above: skip it.
            queens.append(c)                  # @ ({r}, {c}) is safe: place a queen there.
            cols.add(c)
            diag.add(r - c)
            anti.add(r + c)                   # @ Its column and both diagonals are now attacked.
            if place(r + 1):
                return True
            queens.pop()                      # @ Nothing in row {r + 1} worked, so take back the queen at ({r}, {c}).
            cols.remove(c)
            diag.remove(r - c)
            anti.remove(r + c)
        return False                          # @ {'No square of row ' + str(r) + ' leads to a solution: back up to row ' + str(r - 1) + '.' if r else 'No square of row 0 leads to a solution, so there is none for this n.'}

    place(0)
    return queens
