def rooms_needed(meetings):
    events = []
    for i, (start, end) in enumerate(meetings):
        events.append((start, 1, i))   # meeting i starts: one more room in use
        events.append((end, -1, i))    # meeting i ends: its room is free again
    events.sort()                      # @ Every start and end, in time order. At equal times an end (-1) sorts before a start (+1), so back-to-back meetings can share a room.
    in_use = most = 0
    for time, change, i in events:
        in_use += change               # @ {'At ' + str(time) + ', meeting ' + str(i) + (' starts' if change == 1 else ' ends') + ': ' + str(in_use) + (' room' if in_use == 1 else ' rooms') + ' in use.'}
        most = max(most, in_use)
    return most                        # @ At the busiest moment, {most} room{'s were' if most != 1 else ' was'} in use: that's how many are needed.
