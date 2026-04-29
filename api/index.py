import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))

from mangum import Mangum
from main import app

handler = Mangum(app, lifespan="off")
