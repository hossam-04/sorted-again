def spiral(matrix):
    order = []  # (row, column) of each cell, in spiral order
    top, bottom = 0, len(matrix) - 1
    left, right = 0, len(matrix[0]) - 1
    while top <= bottom and left <= right:
        for c in range(left, right + 1):
            order.append((top, c))     # @ Along the top row, left to right: {matrix[top][c]}.
        top += 1                       # @ That row is used up, so the top boundary moves down to row {top}.
        for r in range(top, bottom + 1):
            order.append((r, right))   # @ Down the right column: {matrix[r][right]}.
        right -= 1                     # @ The right boundary moves in to column {right}.
        if top <= bottom:  # @ {('A bottom row remains.' if left <= right else 'Rows remain, but no columns do, so there is nothing to walk back along.') if top <= bottom else 'No rows remain, so there is no bottom row to walk back along.'}
            for c in range(right, left - 1, -1):
                order.append((bottom, c))  # @ Back along the bottom row: {matrix[bottom][c]}.
            bottom -= 1                # @ The bottom boundary moves up to row {bottom}.
        if left <= right:  # @ {('A left column remains.' if top <= bottom else 'Columns remain, but no rows do, so there is nothing to walk up.') if left <= right else 'No columns remain, so there is no left column to walk up.'}
            for r in range(bottom, top - 1, -1):
                order.append((r, left))    # @ Up the left column: {matrix[r][left]}.
            left += 1                  # @ The left boundary moves in to column {left}.
    return [matrix[r][c] for r, c in order]  # @ Every cell visited once: {len(order)} numbers in spiral order.
