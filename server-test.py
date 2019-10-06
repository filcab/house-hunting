#!/usr/bin/env python

import sys

if sys.version_info[0] == 2:
    # Sorry, still support Python2, for out-of-the-box macOS
    import CGIHTTPServer
    handler_class = CGIHTTPServer.CGIHTTPRequestHandler
    server_class = CGIHTTPServer.BaseHTTPServer.HTTPServer
    test = CGIHTTPServer.test
else:
    import http.server
    handler_class = http.server.CGIHTTPRequestHandler
    server_class = http.server.ThreadingHTTPServer
    test = http.server.test


handler_class.cgi_directories.append('/dynamic')
test(HandlerClass=handler_class, ServerClass=server_class)
