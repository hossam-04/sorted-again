import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'lib'))
import harness  # noqa: E402
import stepper  # noqa: E402

TWO_SUM = {
    'id': 167, 'kind': 'function', 'method': 'twoSum',
    'params': [{'name': 'numbers', 'conv': 'any'}, {'name': 'target', 'conv': 'any'}], 'ret': 'any', 'compare': 'exact',
    'examples': [{'args': [[1, 3, 4, 6, 8, 11], 10], 'out': [3, 4]}],
}
TWO_SUM_CODE = '''class Solution:
    def twoSum(self, numbers, target):
        l, r = 0, len(numbers) - 1
        while l < r:
            s = numbers[l] + numbers[r]
            if s == target:
                return [l + 1, r + 1]
            if s < target:
                l += 1
            else:
                r -= 1
        return []
'''

DEPTH = {'id': 104, 'kind': 'function', 'method': 'maxDepth', 'params': [{'name': 'root', 'conv': 'TreeNode'}], 'ret': 'any', 'compare': 'exact'}
DEPTH_CODE = '''class Solution:
    def maxDepth(self, root):
        def depth(node):
            if node is None:
                return 0
            return 1 + max(depth(node.left), depth(node.right))
        return depth(root)
'''

STACK = {'id': 155, 'kind': 'design', 'class': 'MinStack', 'compare': 'exact'}
STACK_CODE = '''class MinStack:
    def __init__(self):
        self.items = []

    def push(self, val):
        self.items.append(val)

    def getMin(self):
        return min(self.items)
'''


def step(spec, code, **kw):
    return stepper.step({'problem': spec, 'code': code, **kw}, None, harness)


class Stepper(unittest.TestCase):
    def test_lines_variables_and_the_result(self):
        out = step(TWO_SUM, TWO_SUM_CODE, test=TWO_SUM['examples'][0])
        self.assertEqual(out['status'], 'ok')
        steps = out['steps']
        self.assertEqual(steps[0]['line'], 3)  # the first line of twoSum, about to run
        self.assertEqual(steps[0]['fn'], 'twoSum')
        self.assertEqual(dict(steps[0]['vars']), {'numbers': '[1, 3, 4, 6, 8, 11]', 'target': '10'})  # no self
        later = dict(steps[2]['vars'])
        self.assertEqual((later['l'], later['r']), ('0', '5'))
        ret = [s for s in steps if s['event'] == 'return']
        self.assertEqual(ret[-1]['ret'], '[3, 4]')
        self.assertEqual(out['result']['status'], 'pass')
        self.assertEqual(out['result']['got_text'], '[3, 4]')
        self.assertIn('numbers = [1, 3, 4, 6, 8, 11]', out['input'])
        self.assertFalse(out['truncated'])

    def test_recursion_depth_stack_and_no_functions_in_variables(self):
        out = step(DEPTH, DEPTH_CODE, data=[[3, 9, 20, None, None, 15, 7]], expected=3)
        deepest = max(s['depth'] for s in out['steps'])
        self.assertEqual(deepest, 5)  # maxDepth, then depth() 4 levels down to a missing child of a leaf
        s = next(s for s in out['steps'] if s['depth'] == 3)
        self.assertEqual(s['stack'], ['maxDepth', 'depth', 'depth'])
        self.assertNotIn('depth', dict(out['steps'][-1]['vars']))
        node = next(dict(s['vars'])['node'] for s in out['steps'] if s['fn'] == 'depth' and dict(s['vars']).get('node') != 'None')
        self.assertEqual(node, 'TreeNode(3)')
        self.assertEqual(out['result']['status'], 'pass')

    def test_design_classes_show_self_attributes(self):
        out = step(STACK, STACK_CODE, data={'ops': ['MinStack', 'push', 'push', 'getMin'], 'args': [[], [5], [2], []]},
                   expected=[None, None, None, 2])
        push = [s for s in out['steps'] if s['fn'] == 'push' and s['event'] == 'line']
        self.assertEqual(dict(push[-1]['vars'])['self.items'], '[5]')  # before the second append runs
        self.assertNotIn('self', dict(push[-1]['vars']))
        self.assertEqual(out['result']['status'], 'pass')

    def test_a_wrong_answer_and_an_error(self):
        wrong = step(TWO_SUM, TWO_SUM_CODE.replace('return [l + 1, r + 1]', 'return [l, r]'), test=TWO_SUM['examples'][0])
        self.assertEqual(wrong['result']['status'], 'fail')
        self.assertEqual((wrong['result']['expected_text'], wrong['result']['got_text']), ('[3, 4]', '[2, 3]'))
        boom = step(TWO_SUM, TWO_SUM_CODE.replace('s = numbers[l] + numbers[r]', 's = numbers[l] + numbers[r + 1]'), test=TWO_SUM['examples'][0])
        self.assertEqual(boom['result']['status'], 'error')
        self.assertEqual(boom['result']['error']['type'], 'IndexError')
        self.assertEqual(boom['steps'][-1]['event'], 'exception')
        self.assertIn('IndexError', boom['steps'][-1]['exc'])

    def test_printed_output_is_tracked_per_step(self):
        code = TWO_SUM_CODE.replace('            s = numbers[l] + numbers[r]\n', '            s = numbers[l] + numbers[r]\n            print(l, r, s)\n')
        out = step(TWO_SUM, code, test=TWO_SUM['examples'][0])
        self.assertTrue(out['stdout'].startswith('0 5 12\n'))
        offsets = [s['out'] for s in out['steps']]
        self.assertEqual(offsets, sorted(offsets))
        self.assertEqual(offsets[0], 0)

    def test_long_runs_stop_recording_but_still_finish(self):
        code = '''class Solution:
    def twoSum(self, numbers, target):
        total = 0
        for i in range(100_000):
            total += i
        return [total % 7, 1]
'''
        out = step(TWO_SUM, code, test=TWO_SUM['examples'][0], max_steps=50)
        self.assertTrue(out['truncated'])
        self.assertEqual(len(out['steps']), 50)
        self.assertEqual(out['result']['got_text'], f'[{sum(range(100_000)) % 7}, 1]')

    def test_code_that_does_not_compile(self):
        out = step(TWO_SUM, 'class Solution:\n    def twoSum(self, numbers, target)\n        return []\n', test=TWO_SUM['examples'][0])
        self.assertEqual(out['status'], 'compile_error')
        self.assertEqual(out['error']['type'], 'SyntaxError')


if __name__ == '__main__':
    unittest.main()
