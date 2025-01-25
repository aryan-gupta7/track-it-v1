import psutil
import win32gui
import win32process
import json
from datetime import datetime
import time
import os

class ActivityTracker:
    def __init__(self):
        self.data_file = "activity_data.json"
        self.current_window = None
        self.session_start = None
        self.usage_data = self.load_existing_data()

    def load_existing_data(self):
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r') as f:
                    return json.load(f)
            except json.JSONDecodeError:
                return {}
        return {}

    def save_data(self):
        with open(self.data_file, 'w') as f:
            json.dump(self.usage_data, f, indent=4)

    def get_active_window_info(self):
        try:
            window = win32gui.GetForegroundWindow()
            _, pid = win32process.GetWindowThreadProcessId(window)
            process = psutil.Process(pid)
            
            return {
                'window_title': win32gui.GetWindowText(window),
                'app_name': process.name(),
                'app_path': process.exe(),
                'pid': pid,
                'cpu_percent': process.cpu_percent(),
                'memory_percent': process.memory_percent()
            }
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return None

    def update_session(self, window_info):
        if window_info is None:
            return

        app_name = window_info['app_name']
        
        # Initialize app data if it doesn't exist
        if app_name not in self.usage_data:
            self.usage_data[app_name] = {
                'total_sessions': 0,
                'total_time': 0,
                'sessions': [],
                'last_path': window_info['app_path'],
                'window_titles': [],
                'avg_cpu_usage': 0,
                'avg_memory_usage': 0
            }

        # Update window titles - check if title not already in list
        if window_info['window_title'] not in self.usage_data[app_name]['window_titles']:
            self.usage_data[app_name]['window_titles'].append(window_info['window_title'])
        
        # Handle session tracking
        if self.current_window != app_name:
            # End previous session if exists
            if self.current_window and self.session_start:
                end_time = datetime.now().isoformat()
                session_duration = (datetime.now() - 
                    datetime.fromisoformat(self.session_start)).total_seconds()
                
                self.usage_data[self.current_window]['sessions'].append({
                    'start_time': self.session_start,
                    'end_time': end_time,
                    'duration': session_duration
                })
                self.usage_data[self.current_window]['total_time'] += session_duration

            # Start new session
            self.current_window = app_name
            self.session_start = datetime.now().isoformat()
            self.usage_data[app_name]['total_sessions'] += 1

        # Update resource usage metrics
        self.usage_data[app_name]['avg_cpu_usage'] = (
            (self.usage_data[app_name]['avg_cpu_usage'] + 
             window_info['cpu_percent']) / 2
        )
        self.usage_data[app_name]['avg_memory_usage'] = (
            (self.usage_data[app_name]['avg_memory_usage'] + 
             window_info['memory_percent']) / 2
        )

    def run(self):
        try:
            while True:
                window_info = self.get_active_window_info()
                self.update_session(window_info)
                self.save_data()
                time.sleep(1)  # Update every second
        except KeyboardInterrupt:
            # Ensure the last session is properly closed
            if self.current_window and self.session_start:
                self.update_session(self.get_active_window_info())
                self.save_data()

if __name__ == "__main__":
    tracker = ActivityTracker()
    tracker.run()
