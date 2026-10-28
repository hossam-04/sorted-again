def largest_rectangle(heights):
    stack = []                                  # @ stack holds (start, height) runs. Heights rise from bottom to top.
    best = 0
    for i, h in enumerate(heights + [0]):       # @ {('Bar ' + str(i) + ' has height ' + str(h) + '.') if i < len(heights) else 'An extra bar of height 0 at the end flushes the stack.'}
        start = i
        while stack and stack[-1][1] > h:       # @ {('The top run, height ' + str(stack[-1][1]) + ', is taller than ' + str(h) + ', so its rectangle ends here.') if stack and stack[-1][1] > h else 'Nothing on the stack is taller than ' + str(h) + '.'}
            j, height = stack.pop()             # @ Pop the run of height {height} that started at {j}.
            best = max(best, height * (i - j))  # @ Its rectangle is {height} × {i - j} = {height * (i - j)}. Best so far: {best}.
            start = j                           # @ The new bar can reach back to position {j}, under every bar it popped.
        stack.append((start, h))                # @ Push height {h}, starting at position {start}.
    return best                                 # @ The largest rectangle has area {best}.
