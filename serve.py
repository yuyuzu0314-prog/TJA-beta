#!/usr/bin/env python3
"""TJAPlayer3 Web 用のかんたんローカルサーバ。  使い方:  python3 serve.py   →  http://localhost:8000"""
import http.server, socketserver, sys, os, webbrowser, mimetypes
mimetypes.add_type('image/webp', '.webp'); mimetypes.add_type('audio/ogg', '.ogg'); mimetypes.add_type('font/ttf', '.ttf')
mimetypes.add_type('text/javascript', '.js')
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()
    def log_message(self, *a): pass
os.chdir(os.path.dirname(os.path.abspath(__file__)))
socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(('127.0.0.1', PORT), H) as s:
    url = f'http://localhost:{PORT}/'
    print('起動しました →', url, '  (止めるときは Ctrl+C)')
    try: webbrowser.open(url)
    except Exception: pass
    s.serve_forever()
