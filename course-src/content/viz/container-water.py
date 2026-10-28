def max_area(height):
    l, r = 0, len(height) - 1                     # @ Start with the widest container: the first and the last line.
    best = 0                                       # @ Nothing measured yet, so the best is 0.
    while l < r:                                   # @ {('Lines ' + str(l) + ' and ' + str(r) + ' are still apart.') if l < r else 'The pointers met, so every pair worth trying has been measured.'}
        area = (r - l) * min(height[l], height[r])  # @ Width {r - l} times the shorter line, {min(height[l], height[r])}, holds {area}.
        best = max(best, area)                     # @ The best so far is {best}.
        if height[l] < height[r]:                  # @ {('The left line, ' + str(height[l]) + ', is the shorter one.') if height[l] < height[r] else ('The right line, ' + str(height[r]) + ', is not taller than the left one.')}
            l += 1                                 # @ Any other container with that left line is narrower and no taller, so drop it.
        else:
            r -= 1                                 # @ Any other container with that right line is narrower and no taller, so drop it.
    return best                                    # @ The largest container holds {best}.
