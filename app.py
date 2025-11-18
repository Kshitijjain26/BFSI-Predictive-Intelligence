# app.py
import sys
import os

# Fix import path to avoid naming conflict with this file
_current_dir = os.path.dirname(os.path.abspath(__file__))
if _current_dir not in sys.path:
    sys.path.insert(0, _current_dir)

# Import after path is set
import uvicorn

# Import the app using importlib to avoid the naming conflict
import importlib.util
import types

# Create app package module first
if "app" not in sys.modules:
    app_pkg = types.ModuleType("app")
    app_pkg.__path__ = [os.path.join(_current_dir, "app")]
    sys.modules["app"] = app_pkg

# First, load chatbot_wrapper module
_chatbot_path = os.path.join(_current_dir, "app", "chatbot_wrapper.py")
chatbot_spec = importlib.util.spec_from_file_location("app.chatbot_wrapper", _chatbot_path)
chatbot_module = importlib.util.module_from_spec(chatbot_spec)
chatbot_module.__package__ = "app"
chatbot_module.__name__ = "app.chatbot_wrapper"
sys.modules["app.chatbot_wrapper"] = chatbot_module
chatbot_spec.loader.exec_module(chatbot_module)

# Now load main module
_app_main_path = os.path.join(_current_dir, "app", "main.py")
spec = importlib.util.spec_from_file_location("app.main", _app_main_path)
app_main_module = importlib.util.module_from_spec(spec)
app_main_module.__package__ = "app"
app_main_module.__name__ = "app.main"
sys.modules["app.main"] = app_main_module
spec.loader.exec_module(app_main_module)
app = app_main_module.app

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

