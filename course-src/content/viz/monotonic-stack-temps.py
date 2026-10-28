def daily_temperatures(temps):
    answer = [0] * len(temps)                     # @ Every day starts with answer 0: no warmer day found yet.
    waiting = []                                  # @ waiting is a stack of days that are still looking for a warmer day.
    for i, t in enumerate(temps):                 # @ Day {i} is {t}°.
        while waiting and temps[waiting[-1]] < t: # @ {('Day ' + str(waiting[-1]) + ' (' + str(temps[waiting[-1]]) + '°) is colder than today, so today is its answer.') if waiting and temps[waiting[-1]] < t else 'No waiting day is colder than ' + str(t) + '°.'}
            j = waiting.pop()                     # @ Take day {j} off the stack.
            answer[j] = i - j                     # @ Day {j} waited {i - j} day(s) for something warmer.
        waiting.append(i)                         # @ Day {i} starts waiting. The stack's temperatures never rise towards the top.
    return answer                                 # @ Days still on the stack never got warmer, so their answer stays 0.
