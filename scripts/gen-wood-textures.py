#!/usr/bin/env python3
"""
Generator tekstur drewna (albedo + normal + roughness) — realistyczne słoje bez pobierania zewnętrznych zasobów.
Kolory kalibrowane na zdjęciach Dampol (galeria): sosna kasetonu-deski (zdjęcie 163), winchester lamel, dąb podłogi.

Uruchom: python3 scripts/gen-wood-textures.py  → public/textures/wood/*.jpg
Tekstura: włókna wzdłuż osi Y (pion), kafelkowalna w obu kierunkach.
"""
import os
import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'textures', 'wood')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)
N = 1024


def tile_noise(n, freq, seed):
    """Kafelkowalny szum wartości (interpolacja kosinusowa na siatce okresowej)."""
    r = np.random.default_rng(seed)
    g = r.random((freq, freq))
    x = np.linspace(0, freq, n, endpoint=False)
    xi = x.astype(int)
    xf = x - xi
    xf = (1 - np.cos(xf * np.pi)) / 2
    x0, x1 = xi % freq, (xi + 1) % freq
    a = g[np.ix_(x0, x0)]
    b = g[np.ix_(x0, x1)]
    c = g[np.ix_(x1, x0)]
    d = g[np.ix_(x1, x1)]
    fy = xf[:, None]
    fx = xf[None, :]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def fbm(n, base, octaves, seed, gain=0.5):
    out = np.zeros((n, n))
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        out += amp * tile_noise(n, base * 2 ** o, seed + o)
        tot += amp
        amp *= gain
    return out / tot


def wood(n, rings, ring_sharp, warp, fiber, knots, seed):
    """Wartość 0..1 (1 = ciemne): słoje przyrostów rocznych jak w desce z tarcicy stycznej.
    Drewno wczesne jasne i szerokie, późne ciemne i wąskie (piłokształtny przebieg), łuki z niskoczęstotliwościowego
    zaburzenia wzdłuż włókien, nieregularny rozstaw słojów, drobne włókna i sęki."""
    y, x = np.mgrid[0:n, 0:n] / n
    # łuki „katedralne”: zaburzenie poprzeczne zależne głównie od y (wolno zmienne), plus drobniejsze
    r = np.random.default_rng(seed)
    # łagodne łuki wzdłuż włókien: 1–3 okresy na długości (kafelkowalne), amplituda zmienna w poprzek
    ph = r.random(3) * 2 * np.pi
    arch = 0.55 * np.sin(2 * np.pi * y + ph[0]) + 0.3 * np.sin(4 * np.pi * y + ph[1]) + 0.15 * np.sin(6 * np.pi * y + ph[2])
    amp = 0.6 + 0.8 * (fbm(n, 2, 2, seed + 1) - 0.5)
    irregular = fbm(n, 3, 3, seed + 2) - 0.5
    # zmienny rozstaw słojów (lata wąskie i szerokie): skumulowana gęstość wzdłuż x (kafelkowalna)
    dens = 1 + 0.9 * (np.interp(np.linspace(0, 1, n, endpoint=False), np.linspace(0, 1, 9), np.r_[r.random(8), 0][:9] * 0 + np.r_[r.random(8), 0][:9]) - 0.5)
    dens = dens / dens.mean()
    xc = np.cumsum(dens) / n
    t = xc[None, :] * rings + warp * arch * amp * 3 + irregular * 1.6
    f = t - np.floor(t)
    # szerokość drewna późnego zmienna między słojami
    lw = ring_sharp * (0.6 + 0.8 * (fbm(n, 4, 2, seed + 7)))
    late = np.clip((f - (1 - lw)) / lw, 0, 1) ** 1.3
    late = np.where(f > 0.985, (1 - f) / 0.015 * late, late)
    # włókna: wydłużony szum wzdłuż Y (pory, rysy)
    fib = tile_noise(n, 512, seed + 9)
    fib = np.array(Image.fromarray((fib * 255).astype(np.uint8)).resize((n // 48, n), Image.BILINEAR).resize((n, n), Image.BILINEAR)) / 255.0
    tone = fbm(n, 2, 3, seed + 3) - 0.5
    v = 0.5 * late + fiber * (fib - 0.5) + 0.3 * tone
    for _ in range(knots):
        cx, cy = rng.random(), rng.random()
        rx, ry = 0.010 + 0.014 * rng.random(), 0.018 + 0.03 * rng.random()
        dx = np.minimum(np.abs(x - cx), 1 - np.abs(x - cx)) / rx
        dy = np.minimum(np.abs(y - cy), 1 - np.abs(y - cy)) / ry
        d = np.sqrt(dx ** 2 + dy ** 2)
        v += 0.6 * np.exp(-d ** 2 * 3) + 0.1 * np.cos(d * 10) * np.exp(-d * 1.2)
    v = (v - np.percentile(v, 1)) / (np.percentile(v, 99.5) - np.percentile(v, 1))
    return np.clip(v, 0, 1)


def colorize(v, light, dark):
    light = np.array(light, float)
    dark = np.array(dark, float)
    return dark[None, None, :] * v[..., None] + light[None, None, :] * (1 - v[..., None])


def normal_from_height(h, strength):
    gy, gx = np.gradient(h)
    nx, ny, nz = -gx * strength, -gy * strength, np.ones_like(h)
    l = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
    n = np.stack([nx / l, ny / l, nz / l], -1)
    return ((n * 0.5 + 0.5) * 255).astype(np.uint8)


def save(name, v, light, dark, rough_base, rough_var, nstrength, boards=None):
    rgb = colorize(v, light, dark)
    h = 1 - v
    rough = rough_base + rough_var * (v - 0.5)
    if boards:
        # pasy desek w poprzek tekstury (fuga cieniowa) — wysokość deski w pikselach
        pitch, gap = boards
        yy = np.arange(N) % pitch
        groove = (yy < gap)[:, None] * np.ones((1, N))
        edge = np.clip(1 - np.minimum(yy, pitch - yy) / 6.0, 0, 1)[:, None] * np.ones((1, N))
        rgb = rgb * (1 - 0.25 * edge[..., None]) * (1 - 0.75 * groove[..., None])
        h = h - 0.8 * groove - 0.15 * edge
        rough = rough + 0.1 * groove
    Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).save(os.path.join(OUT, name + '_diff.jpg'), quality=90)
    Image.fromarray(normal_from_height(h, nstrength)).save(os.path.join(OUT, name + '_nor.jpg'), quality=92)
    Image.fromarray((np.clip(rough, 0, 1) * 255).astype(np.uint8)).save(os.path.join(OUT, name + '_rough.jpg'), quality=90)
    print('ok', name)


# sosna — kaseton-deska (zdjęcie 163: na słońcu sRGB ≈ 230/152/72 → albedo nieco ciemniej), wyraźne słoje, sęki
save('pine', wood(N, 26, 0.28, 0.35, 0.16, 3, 11), light=(214, 140, 66), dark=(176, 104, 46), rough_base=0.62, rough_var=0.18, nstrength=2.2)
# winchester — nadruk na blasze lamel (ciepły brąz, drobniejszy rysunek, mniej sęków)
save('winchester', wood(N, 34, 0.35, 0.25, 0.14, 1, 23), light=(168, 112, 66), dark=(98, 60, 34), rough_base=0.55, rough_var=0.1, nstrength=1.0)
# dąb brązowy — podłoga PVC Tarkett Activia Latur 3 (deski ~ 180 mm na teksturze 1 m → pitch 184 px)
save('floor_oak', wood(N, 30, 0.4, 0.3, 0.16, 2, 37), light=(150, 108, 74), dark=(92, 62, 40), rough_base=0.5, rough_var=0.12, nstrength=1.2, boards=(184, 3))


# trawa (trawnik/sztuczna trawa jak na zdjęciach 163, 090, 054): zieleń z plamami jasności i drobnymi źdźbłami
def grass():
    n = N
    base = fbm(n, 4, 5, 101)
    blades = tile_noise(n, 512, 103)
    blades = np.array(Image.fromarray((blades * 255).astype(np.uint8)).resize((n, n // 6), Image.BILINEAR).resize((n, n), Image.BILINEAR)) / 255.0
    fine = tile_noise(n, 1024, 105) if False else rng.random((n, n))
    v = 0.5 * base + 0.3 * blades + 0.2 * fine
    v = (v - v.min()) / (v.max() - v.min())
    light = np.array((112, 150, 44), float)
    dark = np.array((44, 82, 18), float)
    dry = np.array((150, 150, 80), float)
    rgb = dark * (1 - v[..., None]) + light * v[..., None]
    patch = fbm(n, 2, 3, 107)[..., None]
    rgb = rgb * (1 - 0.18 * np.clip(patch - 0.55, 0, 1) * 4) + dry * 0.18 * np.clip(patch - 0.55, 0, 1) * 4
    Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).save(os.path.join(OUT, '..', 'pbr', 'grass_diff.jpg'), quality=88)
    Image.fromarray(normal_from_height(v, 3.0)).save(os.path.join(OUT, '..', 'pbr', 'grass_nor.jpg'), quality=90)
    print('ok grass')


grass()


# kaseton-deska (zdjęcie 163): taca z dekorem desek poziomych — 8 desek po 130 mm na kafel 1,04 × 1,04 m,
# włókna poziome, każda deska z innym fragmentem rysunku i odcieniem, fuga 2 mm z cieniem pod krawędzią deski
def board_cassette(name, light, dark, seed):
    n = N
    rows = 8
    pitch = n // rows
    big = wood(n, 30, 0.3, 0.12, 0.18, 6, seed)  # włókna wzdłuż Y, łagodne łuki
    out = np.zeros((n, n, 3))
    h = np.zeros((n, n))
    r = np.random.default_rng(seed)
    for k in range(rows):
        # inny fragment rysunku dla każdej deski: przesunięcie i transpozycja (włókna poziomo)
        shift = r.integers(0, n)
        src = np.roll(big, shift, axis=1).T[:pitch, :] if k % 2 == 0 else np.roll(big, shift, axis=0).T[pitch:2 * pitch, :]
        tone = 1 + (r.random() - 0.5) * 0.16
        rgb = colorize(src, light, dark) * tone
        out[k * pitch:(k + 1) * pitch] = rgb
        h[k * pitch:(k + 1) * pitch] = 1 - src * 0.3
    yy = np.arange(n) % pitch
    groove = (yy < 2)[:, None]
    shadow = np.clip(1 - (yy - 2) / 10.0, 0, 1)[:, None] * (yy >= 2)[:, None]  # cień pod krawędzią deski powyżej
    out = out * (1 - 0.8 * groove[..., None]) * (1 - 0.22 * shadow[..., None])
    h = h - 1.0 * groove - 0.2 * shadow
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(os.path.join(OUT, name + '_diff.jpg'), quality=90)
    Image.fromarray(normal_from_height(h, 2.5)).save(os.path.join(OUT, name + '_nor.jpg'), quality=92)
    rough = np.clip(0.6 + 0.15 * (h - h.mean()) + 0.2 * groove, 0, 1)
    Image.fromarray((rough * 255).astype(np.uint8)).save(os.path.join(OUT, name + '_rough.jpg'), quality=90)
    print('ok', name)


board_cassette('pine_boards', light=(214, 140, 66), dark=(176, 104, 46), seed=61)
board_cassette('winchester_boards', light=(168, 112, 66), dark=(110, 70, 40), seed=67)
