#!/usr/bin/env python3
"""Generate MacCleanTool app icon - modern, clean design."""
import struct, zlib, math, os

def write_png(width, height, get_pixel):
    def chunk(name, data):
        c = name + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))  # RGBA
    raw = b''
    for y in range(height):
        raw += b'\x00'
        for x in range(width):
            r, g, b, a = get_pixel(x, y, width, height)
            raw += bytes([r, g, b, a])
    idat = chunk(b'IDAT', zlib.compress(raw, 6))
    iend = chunk(b'IEND', b'')
    return sig + ihdr + idat + iend

def lerp(a, b, t): return a + (b - a) * t
def clamp(v, lo=0.0, hi=1.0): return max(lo, min(hi, v))
def sdf_circle(px, py, cx, cy, r): return math.sqrt((px-cx)**2 + (py-cy)**2) - r
def sdf_line(px, py, ax, ay, bx, by, w):
    dx, dy = bx-ax, by-ay
    l2 = dx*dx + dy*dy
    t = clamp(((px-ax)*dx + (py-ay)*dy) / l2)
    nx, ny = ax + t*dx - px, ay + t*dy - py
    return math.sqrt(nx*nx + ny*ny) - w

def smoothstep(edge0, edge1, x):
    t = clamp((x - edge0) / (edge1 - edge0))
    return t * t * (3 - 2 * t)

def aa(sdf, aa_px=1.5):
    """Alpha from signed distance field."""
    return clamp((-sdf + aa_px/2) / aa_px)

def blend_over(fg, bg):
    """Alpha-composite fg (r,g,b,a 0..1) over bg (r,g,b,a 0..1)."""
    a = fg[3] + bg[3] * (1 - fg[3])
    if a < 1e-6: return (0,0,0,0)
    r = (fg[0]*fg[3] + bg[0]*bg[3]*(1-fg[3])) / a
    g = (fg[1]*fg[3] + bg[1]*bg[3]*(1-fg[3])) / a
    b = (fg[2]*fg[3] + bg[2]*bg[3]*(1-fg[3])) / a
    return (r, g, b, a)

def get_pixel(x, y, W, H):
    S = W  # square
    px = x / S  # 0..1
    py = y / S  # 0..1

    # --- Background rounded rect ---
    cx, cy = 0.5, 0.5
    pad = 0.5  # half-size
    corner = 0.22

    def sdf_rrect(px, py, cx, cy, hw, hh, r):
        qx = abs(px - cx) - hw + r
        qy = abs(py - cy) - hh + r
        return math.sqrt(max(qx,0)**2 + max(qy,0)**2) + min(max(qx,qy),0) - r

    d_bg = sdf_rrect(px, py, cx, cy, pad, pad, corner)
    bg_alpha = aa(d_bg, 1.5/S)
    if bg_alpha < 1e-4:
        return (0, 0, 0, 0)

    # --- Gradient: deep navy-to-indigo-blue ---
    # top: #1a1f3c (26,31,60) → bottom: #3b5bdb (59,91,219)
    t_grad = py
    gr = lerp(22, 55, t_grad)
    gg = lerp(32, 85, t_grad)
    gb = lerp(68, 210, t_grad)

    # Inner glow (soft radial highlight top-left)
    glow_dist = math.sqrt((px - 0.38)**2 + (py - 0.28)**2)
    glow = 0.18 * math.exp(-glow_dist**2 / (2 * 0.18**2))
    gr = clamp(gr/255 + glow, 0, 1)
    gg = clamp(gg/255 + glow * 0.9, 0, 1)
    gb = clamp(gb/255 + glow * 0.5, 0, 1)

    # Accumulate layers as (r,g,b,a) 0..1
    result = (gr, gg, gb, 1.0)

    # =====================
    # ICON: Modern broom / sweep symbol
    # =====================

    def draw_layer(sdf_val, color_rgb, softness=1.8/S):
        alpha = aa(sdf_val, softness)
        if alpha < 1e-4: return result
        r, g, b = color_rgb
        fg = (r, g, b, alpha)
        return blend_over(fg, result)

    # White/silver color for elements
    W_col = (0.96, 0.97, 1.0)
    # Light blue tint
    L_col = (0.72, 0.85, 1.0)

    # --- Handle: thick rounded rod, diagonal ---
    # from (0.64, 0.14) to (0.52, 0.56)
    h_ax, h_ay = 0.63, 0.15
    h_bx, h_by = 0.51, 0.57
    handle_w = 0.022
    d_handle = sdf_line(px, py, h_ax, h_ay, h_bx, h_by, handle_w)
    result = draw_layer(d_handle, W_col, 1.5/S)

    # Handle center shine
    handle_inner_w = 0.009
    d_handle_shine = sdf_line(px, py,
        h_ax - 0.008, h_ay + 0.008,
        h_bx - 0.008, h_by + 0.008,
        handle_inner_w)
    result = draw_layer(d_handle_shine, (1.0, 1.0, 1.0), 1.5/S)

    # --- Broom head: rounded trapezoid ---
    # Centered at (0.41, 0.68), rotated -25 deg
    hcx, hcy = 0.41, 0.685
    angle = math.radians(-28)
    cos_a, sin_a = math.cos(angle), math.sin(angle)
    ru =  (px - hcx) * cos_a + (py - hcy) * sin_a
    rv = -(px - hcx) * sin_a + (py - hcy) * cos_a

    # Wide flat pill
    hw_head, hh_head, hr_head = 0.195, 0.058, 0.045
    qx = abs(ru) - hw_head + hr_head
    qy = abs(rv) - hh_head + hr_head
    d_head = math.sqrt(max(qx,0)**2 + max(qy,0)**2) + min(max(qx,qy),0) - hr_head
    result = draw_layer(d_head, L_col, 1.5/S)

    # Head top-edge highlight stripe
    stripe_top = rv + hh_head - 0.008
    stripe_bot = rv + hh_head - 0.022
    in_head_hull = d_head < 0
    if in_head_hull and stripe_bot < 0 < stripe_top:
        stripe_alpha = clamp((stripe_top) / 0.008) * clamp((-d_head) / 0.01) * 0.55
        fg = (1.0, 1.0, 1.0, stripe_alpha)
        result = blend_over(fg, result)

    # --- Bristles: 9 small rounded rods pointing "down" from head ---
    n_bristles = 9
    b_angle = math.radians(-28 + 90)  # perpendicular to head
    bc, bs = math.cos(b_angle), math.sin(b_angle)
    bristle_w = 0.010
    bristle_len = 0.085

    for i in range(n_bristles):
        t_b = (i / (n_bristles - 1)) - 0.5  # -0.5..0.5
        # start at edge of head, going outward
        ox = hcx + t_b * (hw_head * 1.6) * cos_a - hh_head * sin_a
        oy = hcy + t_b * (hw_head * 1.6) * sin_a + hh_head * cos_a
        ex = ox + bristle_len * bc
        ey = oy + bristle_len * bs

        d_br = sdf_line(px, py, ox, oy, ex, ey, bristle_w)
        # Taper: bristles get slightly transparent at tip
        # Compute t along bristle
        bdx, bdy = ex - ox, ey - oy
        bl2 = bdx*bdx + bdy*bdy
        bt = clamp(((px-ox)*bdx + (py-oy)*bdy) / bl2)
        taper = 1.0 - bt * 0.45
        alpha = aa(d_br, 1.5/S) * taper
        if alpha > 1e-4:
            fg = (0.9, 0.95, 1.0, alpha)
            result = blend_over(fg, result)

    # --- Sparkle stars (4-point) ---
    def draw_sparkle(scx, scy, size, color):
        nonlocal result
        # 4-point star via two rectangles
        arm_w = size * 0.18
        arm_l = size * 0.5
        # horizontal arm
        dh = sdf_line(px, py, scx - arm_l, scy, scx + arm_l, scy, arm_w)
        # vertical arm
        dv = sdf_line(px, py, scx, scy - arm_l, scx, scy + arm_l, arm_w)
        d_star = min(dh, dv)
        # Center glow circle
        d_center = sdf_circle(px, py, scx, scy, size * 0.15)
        d_star = min(d_star, d_center)
        alpha = aa(d_star, 1.0/S)
        # Outer glow
        glow_r = size * 0.8
        glow_f = math.exp(-((px-scx)**2 + (py-scy)**2) / (2*(glow_r*0.4)**2)) * 0.3
        if alpha > 1e-4 or glow_f > 0.01:
            cr, cg, cb = color
            # glow
            fg = (cr, cg, cb, glow_f * (1-alpha))
            result = blend_over(fg, result)
            # solid
            fg = (cr, cg, cb, alpha)
            result = blend_over(fg, result)

    draw_sparkle(0.74, 0.36, 0.065, (1.0, 0.95, 0.7))
    draw_sparkle(0.26, 0.44, 0.048, (0.85, 0.92, 1.0))
    draw_sparkle(0.71, 0.65, 0.040, (1.0, 0.95, 0.7))
    draw_sparkle(0.30, 0.22, 0.032, (0.85, 0.92, 1.0))

    # --- Subtle rim light on bg edge ---
    rim = aa(d_bg + 0.012, 0.012)  # just inside edge
    if rim > 1e-4:
        rim_fg = (0.6, 0.75, 1.0, rim * 0.18)
        result = blend_over(rim_fg, result)

    # Apply bg_alpha
    r2, g2, b2, a2 = result
    final_a = a2 * bg_alpha
    return (
        int(clamp(r2) * 255),
        int(clamp(g2) * 255),
        int(clamp(b2) * 255),
        int(clamp(final_a) * 255),
    )

def main():
    out_dir = os.path.dirname(os.path.abspath(__file__))
    size = 1024
    print(f"Generating {size}x{size} icon...")
    png_data = write_png(size, size, get_pixel)
    out_path = os.path.join(out_dir, "icon.png")
    with open(out_path, 'wb') as f:
        f.write(png_data)
    print(f"Saved: {out_path}")

if __name__ == '__main__':
    main()
