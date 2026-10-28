from collections import deque


def nearest_gate(plan):
    rows, cols = len(plan), len(plan[0])
    dist = [[None] * cols for _ in range(rows)]
    queue = deque()
    for r in range(rows):
        for c in range(cols):
            if plan[r][c] == "#":
                dist[r][c] = "#"              # @ ({r}, {c}) is a wall: it will never be entered.
            elif plan[r][c] == "G":
                dist[r][c] = 0
                queue.append((r, c))          # @ Gate ({r}, {c}) starts in the queue, at distance 0.
    steps = ((1, 0), (-1, 0), (0, 1), (0, -1))
    while queue:
        r, c = queue.popleft()                # @ Take ({r}, {c}) from the front of the queue: distance {dist[r][c]}.
        for dr, dc in steps:
            nr, nc = r + dr, c + dc
            inside = 0 <= nr < rows and 0 <= nc < cols
            if inside and dist[nr][nc] is None:
                dist[nr][nc] = dist[r][c] + 1  # @ ({nr}, {nc}) is reached for the first time: distance {dist[nr][nc]}. It's marked now, as it joins the queue.
                queue.append((nr, nc))
    return dist                               # @ Every room the gates can reach has its distance to the nearest one.
