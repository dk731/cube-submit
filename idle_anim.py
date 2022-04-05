# This script will be triggered between executing jobs
from ledcd import CubeDrawer as cd
from random import random
import colorsys
import time

MAX_POINTS_AMOUNT = 25


class Point:
    def __init__(self):
        self.pos = [random() * 15 for _ in range(3)]
        self.color = colorsys.hsv_to_rgb(random(), 1, 1)
        self.size = random() * 0.5 + 1.5
        self.drawer = cd.get_obj()

    def draw(self):
        self.drawer.set_color(self.color)
        self.drawer.filled_sphere(self.pos, self.size)


drawer = cd.get_obj()

drawer.set_fps(20)

points_list = []

drawer.clear()

drawer.show()

while True:
    drawer.clear()
    points_list.append(Point())
    if len(points_list) > MAX_POINTS_AMOUNT:
        points_list.pop(0)

    for point in points_list:
        point.draw()

    drawer.show()

input()
