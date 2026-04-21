import http.server
import socketserver
import os
import sys

PORT = 3000

class MyHttpRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Strip queries and fragments
        url_path = self.path.split('?')[0].split('#')[0]
        
        # Rewrite extensionless paths to .html internally
        if url_path != '/' and len(url_path.split('.')) == 1:
            possible_file = url_path.lstrip('/') + '.html'
            if os.path.exists(possible_file):
                # We modify the path so the base class serves the html file
                # But we retain queries and hashes on the original self.path
                self.path = '/' + possible_file + (self.path[len(url_path):] if len(self.path) > len(url_path) else "")
                
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

# Bind to 127.0.0.1 explicitly to avoid "Cannot GET /" misconfigurations on some setups
with socketserver.TCPServer(("127.0.0.1", PORT), MyHttpRequestHandler) as httpd:
    print("Server running on http://localhost:" + str(PORT))
    sys.stdout.flush()
    httpd.serve_forever()
