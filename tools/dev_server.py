from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def main():
    project_root = Path(__file__).resolve().parent.parent
    os.chdir(project_root)

    port = 8000
    server = ThreadingHTTPServer(("127.0.0.1", port), NoCacheHandler)

    print("Cartella servita:")
    print(project_root)
    print()
    print(f"Server senza cache attivo su http://localhost:{port}")
    print("Premi CTRL+C per chiudere.")
    print()

    server.serve_forever()


if __name__ == "__main__":
    main()