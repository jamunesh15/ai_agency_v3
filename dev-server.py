# Dev-only server: same as `python -m http.server` but sends
# no-store headers so browsers never cache pages between edits.
# Not part of the site. Run: python dev-server.py
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    print('serving on http://localhost:8899 (no-cache)')
    ThreadingHTTPServer(('', 8899), NoCacheHandler).serve_forever()
