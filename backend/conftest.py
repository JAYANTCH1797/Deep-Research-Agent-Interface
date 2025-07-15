import os
import sys
 
# Ensure tests can import modules from the backend package
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "backend"))) 