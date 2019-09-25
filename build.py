#!/usr/bin/env python3

import subprocess


def run(*args, **kwargs):
    print(' '.join(list(args)))
    subprocess.check_call(list(args), **kwargs)

# Pass --remove-console if we don't want to print as we progress
run('babel-minify', 'bookmarklet.js', '-o', 'b.js')
