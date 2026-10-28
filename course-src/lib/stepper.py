"""Step through a learner's own solution on one test: each line it is about to run, with its variables.

The page's "Step through" panel replays these steps next to the editor, like Python Tutor. Only lines of the
learner's file are recorded; the harness, the prelude and built-ins run untraced. After max_steps the
recording stops and the code runs to the end untraced, so the result is always the real one."""
import io
import reprlib
import sys
import types
from contextlib import redirect_stderr, redirect_stdout

FILENAME = 'solution.py'
MAX_STEPS = 1000
_FUNCS = (types.FunctionType, types.BuiltinFunctionType, types.MethodType, types.BuiltinMethodType, type, types.ModuleType)
_SHOW = reprlib.Repr(maxlevel=3, maxtuple=8, maxlist=12, maxarray=8, maxdict=8, maxset=8, maxfrozenset=8, maxdeque=12,
                     maxstring=60, maxlong=40, maxother=80, fillvalue='…')


def show(v):
    try:
        return _SHOW.repr(v)
    except Exception:  # noqa: BLE001  a learner's __repr__ may raise
        return f'<{type(v).__name__}>'


def _ours(frame):
    """A frame running a named function of the learner's file (not a generator expression or lambda)."""
    return frame.f_code.co_filename == FILENAME and not frame.f_code.co_name.startswith('<')


def _variables(frame):
    out = []
    for name, value in frame.f_locals.items():
        if name.startswith('__') or isinstance(value, _FUNCS):
            continue
        if name == 'self' and type(value).__module__ == 'solution' and hasattr(value, '__dict__'):
            out.extend([f'self.{k}', show(v)] for k, v in vars(value).items() if not isinstance(v, _FUNCS))
            continue
        out.append([name, show(value)])
    return out


def _stack(frame):
    names = []
    while frame is not None:
        if _ours(frame):
            names.append(frame.f_code.co_name)
        frame = frame.f_back
    return names[::-1]


def step(payload, emit, harness):
    spec, code = payload['problem'], payload['code']
    limit = payload.get('max_steps', MAX_STEPS)
    problem = harness.Problem(spec)
    ns, err = problem.load(code, FILENAME)
    if err:
        return {'status': 'compile_error', 'error': err}
    if 'test' in payload:
        data, expected = problem.data_of(payload['test']), problem.expected_of(payload['test'])
    else:
        data, expected = payload['data'], payload.get('expected')

    steps, sink = [], io.StringIO()
    state = {'truncated': False}
    raised = set()  # frames whose last event was an exception: their 'return' only unwinds

    def record(frame, event, **extra):
        if len(steps) >= limit:
            state['truncated'] = True
            sys.settrace(None)
            return False
        stack = _stack(frame)
        steps.append({'line': frame.f_lineno, 'event': event, 'fn': frame.f_code.co_name, 'depth': len(stack),
                      'stack': stack, 'vars': _variables(frame), 'out': sink.tell(), **extra})
        return True

    def local(frame, event, arg):
        if state['truncated']:
            return None
        if event == 'line':
            raised.discard(id(frame))
            ok = record(frame, 'line')
        elif event == 'return':
            if id(frame) in raised:  # unwinding after an exception that was already recorded
                raised.discard(id(frame))
                return local
            ok = record(frame, 'return', ret=show(arg))
        elif event == 'exception':
            raised.add(id(frame))
            exc_type, exc, _ = arg
            ok = record(frame, 'exception', exc=f'{exc_type.__name__}: {exc}' if str(exc) else exc_type.__name__)
        else:
            ok = True
        return local if ok else None

    def global_trace(frame, event, arg):
        return local if _ours(frame) and not state['truncated'] else None

    owned = []
    result = {}
    try:
        with redirect_stdout(sink), redirect_stderr(sink):
            sys.settrace(global_trace)
            try:
                got = problem.call(ns, data, 1, owned)
            finally:
                sys.settrace(None)
        if expected is None and problem.kind != 'codec':
            result = {'status': 'done', 'got_text': harness.pylit(got), 'message': ''}  # nothing to compare with
        else:
            ok, msg = problem.compare(expected, got, data)
            result = {'status': 'pass' if ok else 'fail', 'got_text': harness.pylit(got), 'message': msg if not ok else ''}
    except BaseException as e:  # noqa: BLE001  learner code may raise anything
        result = {'status': 'error', 'error': harness.error_info(e, code, FILENAME)}
        harness.release(e)
    harness.dispose(owned)
    if expected is not None:
        result['expected_text'] = harness.pylit(expected)
    text = sink.getvalue()
    return {'status': 'ok', 'steps': steps, 'truncated': state['truncated'], 'result': result,
            'stdout': text[:20000], 'input': problem.describe_input(data)}
