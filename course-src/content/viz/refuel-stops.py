from heapq import heappop, heappush


def min_stops(target, start_fuel, stations):
    passed = []          # fuel of the stations driven past, as a max-heap (stored negated)
    reach = start_fuel   # how far the fuel taken so far gets the car
    stops = 0
    for pos, fuel in stations:
        while reach < pos and passed:
            reach -= heappop(passed)
            stops += 1                   # @ The car can't get to {pos}. In hindsight it stopped at the best station passed: now it reaches {reach}, after {stops} stop{'' if stops == 1 else 's'}.
        if reach < pos:
            return -1                    # @ Every station passed has been used, and {pos} is still out of reach.
        heappush(passed, -fuel)          # @ The car gets to {pos} and drives on. Its {fuel} units are kept as an option, in case they're needed later.
    while reach < target and passed:
        reach -= heappop(passed)
        stops += 1                       # @ The target, {target}, is out of reach, so the best remaining station is used: the car now reaches {reach}.
    return stops if reach >= target else -1  # @ {('The target is reached with ' + str(stops) + ' stop' + ('' if stops == 1 else 's') + '.') if reach >= target else 'The target is out of reach.'}
