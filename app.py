import os
import platform
import subprocess
import threading
import http.server
import socketserver
import tkinter as tk
from tkinter import messagebox
import webbrowser  # Import the webbrowser library

# Define the port for the HTTP server
PORT = 8000

class App:
    def __init__(self, root):
        self.root = root
        self.root.title("TrackIt")
        
        self.tracking = False
        self.server_thread = None
        self.server = None

        # Start/Stop Tracking Button
        self.track_button = tk.Button(root, text="Start Tracking", command=self.toggle_tracking)
        self.track_button.pack(pady=20)

        # Show Dashboard Button
        self.db_button = tk.Button(root, text="Show Dashboard", command=self.toggle_server)
        self.db_button.pack(pady=20)

    def toggle_tracking(self):
        if self.tracking:
            self.stop_tracking()
        else:
            self.start_tracking()

    def start_tracking(self):
        self.tracking = True
        self.track_button.config(text="Stop Tracking")
        
        # Run the Windows tracking script directly
        script = "getusage_win.py"

        # Start the tracking script in a new thread
        threading.Thread(target=self.run_script, args=(script,), daemon=True).start()

    def stop_tracking(self):
        self.tracking = False
        self.track_button.config(text="Start Tracking")
        # You may want to implement a way to stop the tracking script here

    def run_script(self, script):
        subprocess.run(["python", script])

    def toggle_server(self):
        if self.server_thread and self.server_thread.is_alive():
            self.stop_server()
        else:
            self.start_server()

    def start_server(self):
        self.server_thread = threading.Thread(target=self.run_server, daemon=True)
        self.server_thread.start()
        self.db_button.config(text="Stop Showing Dashboard")
        # Open the dashboard in the web browser
        webbrowser.open("http://localhost:8000/analysis.html")

    def stop_server(self):
        if self.server:
            self.server.shutdown()
            self.server.server_close()
            self.server = None
        self.db_button.config(text="Show Dashboard")

    def run_server(self):
        handler = http.server.SimpleHTTPRequestHandler
        os.chdir(os.path.dirname(os.path.abspath(__file__)))  # Change to the directory of the script
        self.server = socketserver.TCPServer(("", PORT), handler)
        self.server.serve_forever()

if __name__ == "__main__":
    root = tk.Tk()
    app = App(root)
    root.mainloop()
