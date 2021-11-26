# This script will be triggered between executing jobs
from ledcd import CubeDrawer as cd

drawer = cd.get_obj()

drawer.clear()

drawer.show()

input()
