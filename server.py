import http.server
import socket
import os

PORT = 8080

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

class DualStackServer(http.server.ThreadingHTTPServer):
    def server_bind(self):
        # Enable IPv4 + IPv6 dual stack if available
        try:
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        except Exception:
            pass
        super().server_bind()

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    try:
        # Try IPv6 dual-stack
        server_address = ("::", PORT)
        DualStackServer.address_family = socket.AF_INET6
        httpd = DualStackServer(server_address, NoCacheHandler)
    except Exception:
        # Fallback to IPv4
        server_address = ("0.0.0.0", PORT)
        DualStackServer.address_family = socket.AF_INET
        httpd = DualStackServer(server_address, NoCacheHandler)

    print(f"Dual-stack No-Cache Server running on port {PORT}...")
    httpd.serve_forever()
