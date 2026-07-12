#!/usr/bin/env python3
"""Generate pixel-art cat icon PNGs for Coding Kitty."""
import struct, zlib, os, sys

def write_png(path, width, height, pixels):
    """pixels: flat list of (r,g,b,a) tuples, row-major."""
    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(c[4:]) & 0xffffffff)

    rows = []
    for y in range(height):
        row = bytearray([0])  # filter type none
        for x in range(width):
            r, g, b, a = pixels[y * width + x]
            row += bytearray([r, g, b, a])
        rows.append(bytes(row))

    idat = zlib.compress(b''.join(rows), 9)

    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)))
        f.write(chunk(b'IDAT', idat))
        f.write(chunk(b'IEND', b''))


def make_cat_icon(size):
    """Draw a pixel-art cat at given size. Returns flat pixel list."""
    pixels = [(0, 0, 0, 0)] * (size * size)

    def set_pixel(x, y, color):
        if 0 <= x < size and 0 <= y < size:
            pixels[y * size + x] = color

    def fill_rect(x, y, w, h, color):
        for dy in range(h):
            for dx in range(w):
                set_pixel(x + dx, y + dy, color)

    # Scale factor: design on 16x16 grid, scale up
    s = size // 16

    # Colors
    ORANGE   = (235, 140, 52, 255)   # main fur
    DARK_ORG = (190, 100, 30, 255)   # stripes / ears inner
    WHITE    = (255, 248, 235, 255)  # belly / muzzle
    PINK     = (255, 180, 180, 255)  # nose / ear inner
    BLACK    = (40,  30,  20, 255)   # outline / pupils
    EYE_GRN  = (80, 200, 120, 255)   # iris
    EYE_WHT  = (240, 240, 240, 255)  # eye white

    # 16x16 cat design (1=orange, 2=dark, 3=white, 4=pink, 5=black, 6=eye-white, 7=eye-green)
    # Row 0-1: ears
    # Row 2-9: head
    # Row 10-15: body
    design = [
        "5100000000000015",  # 0 ears
        "5110000000000115",  # 1
        "5111000000001115",  # 2
        "5111100000011115",  # 3
        "5111111111111115",  # 4 top of head
        "5111116711671115",  # 5 eyes row 1
        "5111167771677115",  # 6 eyes row 2 (iris)
        "5111116711671115",  # 7 eyes row 3
        "5111133333331115",  # 8 muzzle top
        "5111134443311115",  # 9 muzzle/nose
        "0551111133111550",  # 10 chin
        "0055511111155500",  # 11 body top
        "0005511111115500",  # 12 body
        "0005511331115500",  # 13 belly
        "0005511331115500",  # 14 belly
        "0000551111550000",  # 15 paws
    ]

    color_map = {
        '0': (0, 0, 0, 0),
        '1': ORANGE,
        '2': DARK_ORG,
        '3': WHITE,
        '4': PINK,
        '5': BLACK,
        '6': EYE_WHT,
        '7': EYE_GRN,
    }

    for row_idx, row in enumerate(design):
        for col_idx, ch in enumerate(row[:16]):
            color = color_map.get(ch, (0, 0, 0, 0))
            fill_rect(col_idx * s, row_idx * s, s, s, color)

    # Add stripe detail on forehead (rows 4-5, cols 6-9)
    stripe_y = 4 * s
    for i in range(3):
        fill_rect((6 + i * s // s) * s, stripe_y, s // 2 if s > 2 else 1, s, DARK_ORG)

    return pixels


def make_tray_icon(size=22):
    """22x22 template tray icon: simple black cat silhouette."""
    pixels = [(0, 0, 0, 0)] * (size * size)

    def fill_rect(x, y, w, h, color):
        for dy in range(h):
            for dx in range(w):
                px = x + dx
                py = y + dy
                if 0 <= px < size and 0 <= py < size:
                    pixels[py * size + px] = color

    BLACK = (0, 0, 0, 255)

    # Tiny cat silhouette at 22x22
    # ears
    fill_rect(3, 0, 3, 4, BLACK)
    fill_rect(16, 0, 3, 4, BLACK)
    # head
    fill_rect(3, 3, 16, 10, BLACK)
    # body
    fill_rect(5, 12, 12, 8, BLACK)
    # tail
    fill_rect(17, 14, 2, 6, BLACK)
    fill_rect(17, 13, 4, 2, BLACK)

    return pixels


if __name__ == '__main__':
    out_dir = sys.argv[1] if len(sys.argv) > 1 else '.'
    os.makedirs(out_dir, exist_ok=True)

    # Main icon at multiple sizes for iconset
    for sz in [16, 32, 64, 128, 256, 512]:
        px = make_cat_icon(sz)
        write_png(os.path.join(out_dir, f'icon_{sz}x{sz}.png'), sz, sz, px)
        print(f'  icon_{sz}x{sz}.png')

    # 512@2x = 1024
    px = make_cat_icon(1024)
    write_png(os.path.join(out_dir, 'icon_512x512@2x.png'), 1024, 1024, px)
    print('  icon_512x512@2x.png')

    # Tray icon
    px = make_tray_icon(22)
    write_png(os.path.join(out_dir, 'tray-icon-Template.png'), 22, 22, px)
    print('  tray-icon-Template.png')

    # @2x tray
    px = make_tray_icon(44)
    write_png(os.path.join(out_dir, 'tray-icon-Template@2x.png'), 44, 44, px)
    print('  tray-icon-Template@2x.png')

    print('Done.')
