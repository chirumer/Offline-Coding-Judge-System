import tkinter as tk
import multiprocessing

class BorderlessWindow(tk.Tk):
    def __init__(self, close_event):
        super().__init__()
        self.overrideredirect(True)
        self.wm_attributes('-topmost', 1)
        self.frame = tk.Frame(self, bg='white')
        self.frame.pack(fill=tk.BOTH, expand=True)
        self.frame.bind('<ButtonPress-1>', self.start_move)
        self.frame.bind('<B1-Motion>', self.on_move)
        self.close_event = close_event
        self.monitor_close_event()

    def start_move(self, event):
        self.x = event.x
        self.y = event.y

    def on_move(self, event):
        deltax = event.x - self.x
        deltay = event.y - self.y
        x = self.winfo_x() + deltax
        y = self.winfo_y() + deltay
        self.geometry(f'+{x}+{y}')

    def monitor_close_event(self):
        if not self.close_event.is_set():
            self.after(100, self.monitor_close_event)
        else:
            self.destroy()

def run_borderless_window(close_event):
    app = BorderlessWindow(close_event)
    app.geometry("400x300")
    app.mainloop()

if __name__ == "__main__":
    close_event = multiprocessing.Event()
    window_process = multiprocessing.Process(target=run_borderless_window, args=(close_event,))
    window_process.start()

    try:
        for i in range(100):
            import time
            time.sleep(1)
            print(f"Main program computation step: {i}")

            if i == 10:
                print('close')
                close_event.set()

        window_process.join()

    except KeyboardInterrupt:
        pass