#!/usr/bin/env python3
import os
import sys
import json
import asyncio
import urllib.request
import urllib.parse
import re
import subprocess
import math
import ssl
import random
from PIL import Image, ImageOps, ImageDraw, ImageFont, ImageEnhance

# Ignore SSL verification for scraping/downloading files safely
try:
    ssl._create_default_https_context = ssl._create_unverified_context
except AttributeError:
    pass

# Reconfigure stdout/stderr to UTF-8 to prevent encoding errors on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Ensure required packages are present
def ensure_packages():
    required = ["edge-tts", "moviepy", "pillow", "numpy"]
    for pkg in required:
        try:
            if pkg == "edge-tts":
                import edge_tts
            elif pkg == "moviepy":
                import moviepy
            elif pkg == "pillow":
                import PIL
            elif pkg == "numpy":
                import numpy
        except ImportError:
            print(f"📦 Installing required package: {pkg}...")
            try:
                subprocess.run([sys.executable, "-m", "pip", "install", pkg], check=True)
            except Exception as e:
                print(f"❌ Failed to install {pkg}: {e}")
                sys.exit(1)

ensure_packages()

import edge_tts
import numpy as np

try:
    from moviepy.editor import ImageClip, AudioFileClip, VideoFileClip, concatenate_videoclips, CompositeVideoClip
except ImportError:
    try:
        from moviepy import ImageClip, AudioFileClip, VideoFileClip, concatenate_videoclips, CompositeVideoClip
    except ImportError:
        from moviepy.video.VideoClip import ImageClip
        from moviepy.video.io.VideoFileClip import VideoFileClip
        from moviepy.audio.io.AudioFileClip import AudioFileClip
        from moviepy.video.compositing.concatenate import concatenate_videoclips
        from moviepy.video.compositing.CompositeVideoClip import CompositeVideoClip

# Font cache directory
FONT_PATH = os.path.join(os.environ.get("USERPROFILE") or os.environ.get("HOME") or ".", ".connect-ai-fonts")
os.makedirs(FONT_PATH, exist_ok=True)
PRETENDARD_FONT_FILE = os.path.join(FONT_PATH, "NanumGothic-Bold.ttf")

def download_font(dest_path):
    font_url = "https://github.com/google/fonts/raw/main/ofl/nanumgothic/NanumGothic-Bold.ttf"
    if os.path.exists(dest_path):
        return True
    print(f"📥 Downloading NanumGothic Font from {font_url}...")
    try:
        req = urllib.request.Request(font_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as response, open(dest_path, 'wb') as f:
            f.write(response.read())
        print("✅ Font downloaded successfully.")
        return True
    except Exception as e:
        print(f"⚠️ Failed to download font: {e}")
        return False

# Trigger font download
download_font(PRETENDARD_FONT_FILE)

def get_font_file(font_name):
    font_urls = {
        "Pretendard-Bold": "https://github.com/orioncactus/pretendard/raw/main/packages/pretendard/dist/public/static/Alternative/Pretendard-Bold.ttf",
        "GmarketSansMedium": "https://github.com/leeduyoung/leeduyoung.github.io/raw/master/fonts/GmarketSansMedium.ttf",
        "EstablishRoomNo707": "https://github.com/google/fonts/raw/main/ofl/nanumgothic/NanumGothic-Bold.ttf", # fallback NanumGothic
        "TmonMonsori": "https://github.com/google/fonts/raw/main/ofl/nanumgothic/NanumGothic-Bold.ttf", # fallback NanumGothic
        "BaminJua": "https://github.com/google/fonts/raw/main/ofl/jua/Jua-Regular.ttf", # Google Jua font
        "NanumGothic-Bold": "https://github.com/google/fonts/raw/main/ofl/nanumgothic/NanumGothic-Bold.ttf"
    }
    
    url = font_urls.get(font_name, font_urls["NanumGothic-Bold"])
    filename = f"{font_name}.ttf"
    dest_path = os.path.join(FONT_PATH, filename)
    
    if os.path.exists(dest_path):
        return dest_path
        
    print(f"📥 Downloading font '{font_name}' from: {url}")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as response, open(dest_path, 'wb') as f:
            f.write(response.read())
        print(f"✅ Font {font_name} downloaded successfully.")
        return dest_path
    except Exception as e:
        print(f"⚠️ Failed to download font {font_name}: {e}. Falling back to default NanumGothic-Bold.")
        return os.path.join(FONT_PATH, "NanumGothic-Bold.ttf")

# Compatibility helpers for MoviePy v2.x changes
def subclip_clip_compat(clip, start_time, end_time):
    if hasattr(clip, "subclipped"):
        return clip.subclipped(start_time, end_time)
    if hasattr(clip, "subclip"):
        return clip.subclip(start_time, end_time)
    return clip

def resize_clip_compat(clip, size_func_or_tuple):
    if hasattr(clip, "resized"):
        return clip.resized(size_func_or_tuple)
    if hasattr(clip, "resize"):
        return clip.resize(size_func_or_tuple)
    return clip

def fl_clip_compat(clip, filter_func):
    if hasattr(clip, "transform"):
        return clip.transform(filter_func, keep_duration=True)
    if hasattr(clip, "fl"):
        return clip.fl(filter_func, keep_duration=True)
    return clip

# Safe helper to set clip duration across all MoviePy versions
def set_clip_duration(clip, duration):
    if hasattr(clip, "with_duration"):
        return clip.with_duration(duration)
    else:
        return clip.set_duration(duration)

# Safe helper to set clip audio across all MoviePy versions
def set_clip_audio(clip, audio):
    if hasattr(clip, "with_audio"):
        return clip.with_audio(audio)
    else:
        return clip.set_audio(audio)

# Safe helper to resize clip across all MoviePy versions
def safe_resize_clip(clip, size):
    try:
        if hasattr(clip, "resized"):
            return clip.resized(size)
        if hasattr(clip, "resize"):
            return clip.resize(size)
    except Exception:
        pass
    try:
        from moviepy.video.fx.all import resize
        return resize(clip, newsize=size)
    except Exception:
        try:
            import moviepy.video.fx.all as vfx
            return clip.fx(vfx.resize, size)
        except Exception as e:
            print(f"⚠️ Resize failed: {e}")
            return clip

# Crop and Resize Video Clip to 9:16 Portrait
def crop_and_resize_video(clip, target_width=1080, target_height=1920):
    w, h = clip.size
    target_aspect = target_width / target_height
    current_aspect = w / h
    
    if current_aspect > target_aspect:
        # Too wide, crop horizontally
        new_w = int(h * target_aspect)
        x1 = (w - new_w) // 2
        x2 = x1 + new_w
        y1 = 0
        y2 = h
    else:
        # Too tall, crop vertically
        new_h = int(w / target_aspect)
        y1 = (h - new_h) // 2
        y2 = y1 + new_h
        x1 = 0
        x2 = w
        
    try:
        cropped_clip = clip.crop(x1=x1, y1=y1, x2=x2, y2=y2)
    except Exception as e:
        print(f"⚠️ Moviepy clip.crop failed: {e}. Trying alternative crop...")
        try:
            from moviepy.video.fx.all import crop
            cropped_clip = crop(clip, x1=x1, y1=y1, x2=x2, y2=y2)
        except Exception as e2:
            print(f"⚠️ Both crop methods failed: {e2}. Resizing directly without crop...")
            return safe_resize_clip(clip, (target_width, target_height))
            
    return safe_resize_clip(cropped_clip, (target_width, target_height))

# Apply color preset to PIL Image
def apply_color_preset(img, preset):
    preset = preset.lower()
    if preset == 'warm':
        r, g, b = img.split()
        r = r.point(lambda i: min(255, int(i * 1.12)))
        b = b.point(lambda i: int(i * 0.88))
        img = Image.merge('RGB', (r, g, b))
    elif preset == 'cool':
        r, g, b = img.split()
        r = r.point(lambda i: int(i * 0.88))
        b = b.point(lambda i: min(255, int(i * 1.15)))
        img = Image.merge('RGB', (r, g, b))
    elif preset == 'black':
        img = img.convert('L').convert('RGB')
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.4)
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(0.95)
    elif preset == 'daylight':
        enh = ImageEnhance.Brightness(img)
        img = enh.enhance(1.15)
        enh = ImageEnhance.Color(img)
        img = enh.enhance(1.1)
    elif preset == 'vintage':
        img = img.convert('L').convert('RGB')
        sepia = Image.new("RGB", img.size, (230, 210, 180))
        img = Image.blend(img, sepia, 0.2)
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(0.9)
    elif preset == 'vivid':
        enh = ImageEnhance.Color(img)
        img = enh.enhance(1.4)
        enh = ImageEnhance.Contrast(img)
        img = enh.enhance(1.1)
    return img

# Download file with custom headers to prevent blocks
def download_file(url, dest_path, headers=None):
    if headers is None:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as response, open(dest_path, 'wb') as f:
        f.write(response.read())

# Crop and Format Image to 9:16 Portrait with Color Preset applied
def crop_and_format_image(local_path, dest_path, color_preset='none', target_width=1080, target_height=1920, pad=False):
    try:
        img = Image.open(local_path)
        if img.mode != 'RGB':
            img = img.convert('RGB')
            
        w, h = img.size
        
        if pad:
            # Pad image inside background
            bg = Image.new("RGB", (target_width, target_height), (18, 18, 18))
            img.thumbnail((target_width - 80, target_height - 400), Image.Resampling.LANCZOS)
            offset = ((target_width - img.width) // 2, (target_height - img.height) // 2)
            bg.paste(img, offset)
            img_final = bg
        else:
            # Center crop
            target_aspect = target_width / target_height
            current_aspect = w / h
            
            if current_aspect > target_aspect:
                new_w = int(h * target_aspect)
                left = (w - new_w) // 2
                top = 0
                right = left + new_w
                bottom = h
            else:
                new_h = int(w / target_aspect)
                left = 0
                top = (h - new_h) // 2
                right = w
                bottom = top + new_h
                
            img_cropped = img.crop((left, top, right, bottom))
            img_final = img_cropped.resize((target_width, target_height), Image.Resampling.LANCZOS)
            
        # Apply color preset
        if color_preset and color_preset != 'none':
            img_final = apply_color_preset(img_final, color_preset)
            
        img_final.save(dest_path, "JPEG", quality=92)
        return True
    except Exception as e:
        print(f"⚠️ Failed to crop and format image: {e}")
        return False

# PIL Subtitle image creation based on styles
def create_subtitle_image(text, width=1080, height=1920, font_path=None, font_size=55, caption_style="minimal", is_hook=False, position="bottom"):
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    style = caption_style.lower()
    
    # Customize font size for hook or style
    if is_hook or style == "hooking":
        font_size = int(font_size * 1.2)
        
    # Load font
    font = None
    if font_path and os.path.exists(font_path):
        try:
            font = ImageFont.truetype(font_path, font_size)
        except Exception as e:
            print(f"⚠️ Font load error: {e}")
    if font is None:
        try:
            for f_name in ["C:/Windows/Fonts/malgunbd.ttf", "C:/Windows/Fonts/malgun.ttf", "arial.ttf"]:
                if os.path.exists(f_name):
                    font = ImageFont.truetype(f_name, font_size)
                    break
        except Exception:
            pass
    if font is None:
        font = ImageFont.load_default()

    # Split text into lines
    words = text.split()
    lines = []
    current_line = ""
    for word in words:
        test_line = current_line + " " + word if current_line else word
        # Keep lines short (12-14 chars) for mobile portrait
        if len(test_line) > 13:
            lines.append(current_line)
            current_line = word
        else:
            current_line = test_line
    if current_line:
        lines.append(current_line)
        
    # Position mapping
    y_center = int(height * 0.78) # default bottom
    if position == "top":
        y_center = int(height * 0.18)
    elif position == "center":
        y_center = int(height * 0.5)
    
    line_heights = []
    for line in lines:
        try:
            bbox = draw.textbbox((0, 0), line, font=font)
            line_w = bbox[2] - bbox[0]
            line_h = bbox[3] - bbox[1]
        except AttributeError:
            line_w, line_h = draw.textsize(line, font=font)
        line_heights.append((line, line_w, line_h))
        
    total_height = sum([lh[2] for lh in line_heights]) + (len(lines) - 1) * 40
    current_y = y_center - (total_height // 2)
    
    for line, line_w, line_h in line_heights:
        x = (width - line_w) // 2
        padding_x = 28
        padding_y = 14
        box_coords = [
            x - padding_x, 
            current_y - padding_y, 
            x + line_w + padding_x, 
            current_y + line_h + padding_y
        ]
        
        # Color & Background styling based on preset
        text_color = (255, 255, 255, 255)
        outline_color = None
        outline_width = 0
        
        if style == "minimal":
            # Transparent dark rounded capsule
            draw.rounded_rectangle(box_coords, radius=12, fill=(18, 18, 18, 120))
        elif style == "hooking":
            # Vivid yellow text with thick black outline
            text_color = (255, 223, 0, 255)
            outline_color = (0, 0, 0, 255)
            outline_width = 5
            # Semi-transparent dark backing
            draw.rounded_rectangle(box_coords, radius=16, fill=(0, 0, 0, 160))
        elif style == "news":
            # Classic white text on solid rectangular blue bar
            draw.rectangle(box_coords, fill=(15, 32, 67, 240))
            text_color = (255, 255, 255, 255)
        elif style == "essay":
            # Soft gray-white text on warm brownish-dark capsule
            draw.rounded_rectangle(box_coords, radius=10, fill=(40, 35, 30, 140))
            text_color = (245, 240, 235, 255)
        elif style == "copy":
            # Red/White impact advertisement style
            draw.rounded_rectangle(box_coords, radius=8, fill=(210, 32, 32, 230))
            text_color = (255, 255, 255, 255)
        else: # default classic
            draw.rounded_rectangle(box_coords, radius=14, fill=(0, 0, 0, 150))
            
        # Draw outline if defined
        if outline_color and outline_width > 0:
            for dx in range(-outline_width, outline_width+1):
                for dy in range(-outline_width, outline_width+1):
                    if dx*dx + dy*dy <= outline_width*outline_width:
                        draw.text((x+dx, current_y+dy), line, font=font, fill=outline_color)
                        
        draw.text((x, current_y), line, font=font, fill=text_color)
        current_y += line_h + 40
        
    return img

# Edge TTS generator
async def generate_tts(text, voice_gender, dest_path):
    voice = "ko-KR-SunHiNeural"
    if voice_gender.lower() == "male":
        voice = "ko-KR-InJoonNeural"
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(dest_path)

# Download BGM tracks if not exists locally
def ensure_bgm(style_name, temp_dir):
    bgm_presets = {
        "piano": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        "ambient": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        "synth": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
        "upbeat": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
        "dark": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
        "vlog": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    }
    
    style_key = "piano"
    style_lower = style_name.lower()
    if "피아노" in style_lower or "piano" in style_lower or "감성" in style_lower:
        style_key = "piano"
    elif "앰비언트" in style_lower or "ambient" in style_lower:
        style_key = "ambient"
    elif "신스" in style_lower or "synth" in style_lower or "몽환" in style_lower:
        style_key = "synth"
    elif "광고" in style_lower or "ad" in style_lower or "upbeat" in style_lower:
        style_key = "upbeat"
    elif "어두운" in style_lower or "dark" in style_lower or "저음" in style_lower:
        style_key = "dark"
    elif "브이로그" in style_lower or "vlog" in style_lower or "밝은" in style_lower:
        style_key = "vlog"
        
    url = bgm_presets.get(style_key, bgm_presets["piano"])
    dest_file = os.path.join(temp_dir, f"bgm_{style_key}.mp3")
    
    if os.path.exists(dest_file):
        return dest_file
        
    print(f"🎵 BGM Cache Miss. Downloading BGM preset '{style_key}' from: {url}")
    try:
        download_file(url, dest_file)
        return dest_file
    except Exception as e:
        print(f"⚠️ Failed to download BGM: {e}. Video will render without background music.")
        return None

# Trim quiet spaces from audio
def trim_audio_silence(audio_clip, threshold=0.015):
    try:
        import numpy as np
        fps = 8000
        arr = audio_clip.to_soundarray(fps=fps)
        if len(arr) == 0:
            return audio_clip
            
        abs_arr = np.abs(arr)
        if len(abs_arr.shape) > 1:
            volume = np.mean(abs_arr, axis=1)
        else:
            volume = abs_arr
            
        above_threshold = np.where(volume > threshold)[0]
        if len(above_threshold) == 0:
            return audio_clip
            
        start_idx = above_threshold[0]
        end_idx = above_threshold[-1]
        
        start_time = start_idx / fps
        end_time = end_idx / fps
        
        start_time = max(0, start_time - 0.05)
        end_time = min(audio_clip.duration, end_time + 0.05)
        
        if end_time - start_time > 0.1:
            return subclip_clip_compat(audio_clip, start_time, end_time)
    except Exception as e:
        print(f"⚠️ Audio trim failed: {e}")
    return audio_clip

# Create cinematic panning effect by slicing a moving window
def make_panning_clip(img_path, duration, target_w=1080, target_h=1920):
    try:
        img = Image.open(img_path)
        # resize to 15% larger for panning room
        large_w = int(target_w * 1.15)
        large_h = int(target_h * 1.15)
        img_large = img.resize((large_w, large_h), Image.Resampling.LANCZOS)
        
        temp_large_path = img_path + "_large.jpg"
        img_large.save(temp_large_path, "JPEG", quality=90)
        
        clip = ImageClip(temp_large_path)
        clip = set_clip_duration(clip, duration)
        
        # Crop window moving left-to-right & top-to-bottom over time
        dw = large_w - target_w
        dh = large_h - target_h
        
        def pan_frame(get_frame, t):
            frame = get_frame(t)
            progress = t / duration if duration > 0 else 0
            x_offset = int(dw * progress)
            y_offset = int(dh * progress)
            return frame[y_offset : y_offset + target_h, x_offset : x_offset + target_w]
            
        pan_clip = fl_clip_compat(clip, pan_frame)
        return pan_clip, [temp_large_path]
    except Exception as e:
        print(f"⚠️ Panning failed: {e}. Falling back to static image.")
        clip = ImageClip(img_path)
        return set_clip_duration(clip, duration), []

# Create shaking effect by translating the clip slightly
def make_shaking_clip(img_path, duration, target_w=1080, target_h=1920):
    try:
        img = Image.open(img_path)
        # Pad slightly to avoid black borders when shaking
        large_w = target_w + 30
        large_h = target_h + 30
        img_large = img.resize((large_w, large_h), Image.Resampling.LANCZOS)
        
        temp_shaking_path = img_path + "_shaking.jpg"
        img_large.save(temp_shaking_path, "JPEG", quality=90)
        
        clip = ImageClip(temp_shaking_path)
        clip = set_clip_duration(clip, duration)
        
        def shake_frame(get_frame, t):
            frame = get_frame(t)
            # Add random micro offsets
            dx = random.randint(0, 30)
            dy = random.randint(0, 30)
            return frame[dy : dy + target_h, dx : dx + target_w]
            
        shake_clip = fl_clip_compat(clip, shake_frame)
        return shake_clip, [temp_shaking_path]
    except Exception as e:
        print(f"⚠️ Shaking failed: {e}.")
        clip = ImageClip(img_path)
        return set_clip_duration(clip, duration), []

# Template border overlay frame
def create_template_frame_image(template_style, width=1080, height=1920):
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    style = template_style.lower()
    if style == "minimal":
        draw.line([(80, 120), (width - 80, 120)], fill=(255, 255, 255, 60), width=2)
        draw.line([(80, height - 120), (width - 80, height - 120)], fill=(255, 255, 255, 60), width=2)
    elif style == "greenline":
        draw.rectangle([0, 0, width, 8], fill=(57, 255, 20, 255))
        draw.rectangle([0, height - 8, width, height], fill=(57, 255, 20, 255))
    elif style == "vibrant":
        # Purple-pink side glow
        for x in range(24):
            alpha = int(120 * (1 - x / 24.0))
            draw.line([(x, 0), (x, height)], fill=(138, 43, 226, alpha))
            draw.line([(width - x, 0), (width - x, height)], fill=(255, 20, 147, alpha))
        
        # Subtle horizontal banner line
        draw.rectangle([0, 150, width, 210], fill=(0, 0, 0, 120))
        draw.line([(0, 210), (width, 210)], fill=(255, 20, 147, 160), width=2)
    return img

async def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_cinema_shorts.py <config_json_path>")
        sys.exit(1)
        
    config_path = sys.argv[1]
    if not os.path.exists(config_path):
        print(f"❌ Config file not found: {config_path}")
        sys.exit(1)
        
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
    except Exception as e:
        print(f"❌ JSON parsing error: {e}")
        sys.exit(1)
        
    cuts = config.get("cuts", [])
    bgm_style = config.get("bgm_style", "piano")
    bgm_volume = float(config.get("bgm_volume", 15)) / 100.0
    bgm_upload_path = config.get("bgm_upload_path", "")
    output_path = config.get("output_path", "")
    template_style = config.get("template_style", "classic")
    color_preset = config.get("color_preset", "none")
    caption_style = config.get("caption_style", "minimal")
    caption_position = config.get("caption_position", "bottom")
    transition_effect = config.get("transition_effect", "fade")
    voice = config.get("voice", "female")
    font_name = config.get("font_name", "NanumGothic-Bold")
    active_font_path = get_font_file(font_name)
    
    if not output_path or not cuts:
        print("❌ Missing required config fields (output_path, cuts).")
        sys.exit(1)
        
    # Setup folders
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    try:
        timestamp_id = int(os.path.basename(output_path).split('_')[-1].split('.')[0]) if '_' in os.path.basename(output_path) else random.randint(10000, 99999)
    except ValueError:
        import time
        timestamp_id = int(time.time())
        
    temp_dir = os.path.join(os.path.dirname(output_path), f"temp_cinema_{timestamp_id}")
    os.makedirs(temp_dir, exist_ok=True)
    
    # Pre-render template frame
    template_frame_path = os.path.join(temp_dir, "template_frame.png")
    frame_img = create_template_frame_image(template_style)
    frame_img.save(template_frame_path, "PNG")
    
    temp_paths = [template_frame_path]
    scene_clips = []
    
    try:
        # 1. Generate TTS Narrations concurrently
        print("🗣️ Synthesizing Voice TTS...")
        tts_tasks = []
        for idx, cut in enumerate(cuts):
            sub = cut.get("subtitle", "").strip()
            tts_path = os.path.join(temp_dir, f"cut_{idx}_tts.mp3")
            cut["tts_path"] = tts_path
            
            if sub:
                # Clean brackets and directives
                sub_clean = re.sub(r'\[.*?\]', '', sub)
                sub_clean = re.sub(r'\(.*?\)', '', sub_clean).strip()
                tts_tasks.append(generate_tts(sub_clean, voice, tts_path))
            else:
                # Dummy task
                async def dummy_save():
                    pass
                tts_tasks.append(dummy_save())
                cut["tts_path"] = None
                
        await asyncio.gather(*tts_tasks)
        
        # 2. Process each cut
        print("🎬 Processing cut assets...")
        for idx, cut in enumerate(cuts):
            print(f"   Cut {idx+1}/4 processing...")
            img_path = cut.get("image_path", "")
            video_path = cut.get("video_path", "")
            subtitle = cut.get("subtitle", "")
            cam_move = cut.get("camera_movement", "fixed").lower()
            duration = float(cut.get("duration", 4.0))
            
            # Check TTS duration to make sure narration is not truncated
            tts_file = cut.get("tts_path")
            audio_clip = None
            if tts_file and os.path.exists(tts_file) and os.path.getsize(tts_file) > 0:
                try:
                    raw_audio = AudioFileClip(tts_file)
                    audio_clip = trim_audio_silence(raw_audio)
                    if audio_clip.duration > duration:
                        duration = audio_clip.duration + 0.4 # Pad slightly
                        print(f"      Extended Cut {idx+1} duration to {duration:.2f}s to fit TTS.")
                except Exception as tts_err:
                    print(f"      ⚠️ TTS audio load error: {tts_err}")
            
            # Create base media clip (image or video)
            formatted_media_clip = None
            
            if video_path and os.path.exists(video_path):
                print(f"      Loading video asset: {video_path}")
                try:
                    raw_v_clip = VideoFileClip(video_path).without_audio()
                    # Trim or loop video
                    if raw_v_clip.duration < duration:
                        loops = int(math.ceil(duration / raw_v_clip.duration))
                        raw_v_clip = concatenate_videoclips([raw_v_clip] * loops)
                    v_clip = subclip_clip_compat(raw_v_clip, 0, duration)
                    formatted_media_clip = crop_and_resize_video(v_clip)
                    
                    if "slow" in cam_move:
                        # Slow motion (0.5x speed)
                        try:
                            if hasattr(formatted_media_clip, "fx"):
                                import moviepy.video.fx.all as vfx
                                formatted_media_clip = formatted_media_clip.fx(vfx.speedx, 0.5)
                            else:
                                formatted_media_clip = formatted_media_clip.speedx(0.5)
                            formatted_media_clip = set_clip_duration(formatted_media_clip, duration)
                        except Exception as e:
                            print(f"      ⚠️ Slow motion effect failed: {e}")
                except Exception as e:
                    print(f"      ⚠️ Video processing failed: {e}. Falling back to image placeholder.")
                    video_path = ""
                    
            if not video_path or not os.path.exists(video_path):
                # Process image
                print(f"      Loading image asset: {img_path}")
                dest_formatted_jpg = os.path.join(temp_dir, f"formatted_cut_{idx}.jpg")
                
                if not img_path or not os.path.exists(img_path):
                    # Placeholder image
                    img = Image.new("RGB", (1080, 1920), (28, 28, 35))
                    draw = ImageDraw.Draw(img)
                    draw.text((350, 960), f"Cut {idx+1} Image Placeholder", fill=(255, 255, 255))
                    img.save(dest_formatted_jpg)
                    img_path = dest_formatted_jpg
                else:
                    crop_and_format_image(img_path, dest_formatted_jpg, color_preset=color_preset)
                    
                temp_paths.append(dest_formatted_jpg)
                
                # Apply camera movement to image
                if cam_move == "zoom in":
                    img_clip = ImageClip(dest_formatted_jpg)
                    img_clip = set_clip_duration(img_clip, duration)
                    try:
                        img_clip = resize_clip_compat(img_clip, lambda t: 1.0 + 0.05 * t)
                    except Exception as z_err:
                        print(f"      ⚠️ Zoom In resize failed: {z_err}")
                    formatted_media_clip = img_clip
                elif cam_move == "zoom out":
                    img_clip = ImageClip(dest_formatted_jpg)
                    img_clip = set_clip_duration(img_clip, duration)
                    try:
                        img_clip = resize_clip_compat(img_clip, lambda t: 1.05 - 0.05 * t)
                    except Exception as z_err:
                        print(f"      ⚠️ Zoom Out resize failed: {z_err}")
                    formatted_media_clip = img_clip
                elif cam_move == "panning":
                    formatted_media_clip, cleanups = make_panning_clip(dest_formatted_jpg, duration)
                    temp_paths.extend(cleanups)
                elif cam_move == "shaking":
                    formatted_media_clip, cleanups = make_shaking_clip(dest_formatted_jpg, duration)
                    temp_paths.extend(cleanups)
                else: # fixed / slow motion fallback
                    img_clip = ImageClip(dest_formatted_jpg)
                    formatted_media_clip = set_clip_duration(img_clip, duration)
            
            # Combine overlays
            composite_layers = [formatted_media_clip]
            
            # Add Border template overlay
            if template_style.lower() != "classic" and os.path.exists(template_frame_path):
                frame_clip = ImageClip(template_frame_path)
                frame_clip = set_clip_duration(frame_clip, duration)
                composite_layers.append(frame_clip)
                
            # Add Styled Subtitle Overlay
            if subtitle.strip():
                sub_png = os.path.join(temp_dir, f"sub_overlay_{idx}.png")
                sub_img = create_subtitle_image(
                    subtitle, 
                    font_path=active_font_path,
                    caption_style=caption_style,
                    is_hook=(idx == 0),
                    position=caption_position
                )
                sub_img.save(sub_png, "PNG")
                temp_paths.append(sub_png)
                
                sub_clip = ImageClip(sub_png)
                sub_clip = set_clip_duration(sub_clip, duration)
                composite_layers.append(sub_clip)
                
            # Render composite cut track
            cut_video = CompositeVideoClip(composite_layers)
            
            # Attach TTS audio
            if audio_clip:
                cut_video = set_clip_audio(cut_video, audio_clip)
                
            scene_clips.append(cut_video)
            
        if not scene_clips:
            raise Exception("No scenes rendered.")
            
        # 3. Concatenate cuts with transitions
        print("🎬 Compiling Cut Sections...")
        final_video = None
        
        # Apply transitions
        if transition_effect.lower() == "fade" and len(scene_clips) > 1:
            # MoviePy crossfade handles cross-fading
            # We can apply fadein and fadeout to scene clips
            fade_clips = []
            for i, clip in enumerate(scene_clips):
                if i > 0:
                    try:
                        # crossfadein shifts the start of the clip to overlap
                        clip = clip.crossfadein(1.0)
                    except Exception:
                        pass
                fade_clips.append(clip)
            final_video = concatenate_videoclips(fade_clips, method="compose")
        else:
            # Cut transition (direct join)
            final_video = concatenate_videoclips(scene_clips, method="compose")
            
        total_duration = final_video.duration
        print(f"🎬 Total Video Duration: {total_duration:.2f}s")
        
        # 4. Mix Background Music (BGM)
        bgm_track_path = None
        if bgm_upload_path and os.path.exists(bgm_upload_path):
            bgm_track_path = bgm_upload_path
        else:
            bgm_track_path = ensure_bgm(bgm_style, temp_dir)
            
        if bgm_track_path and os.path.exists(bgm_track_path):
            print(f"🎵 Mixing Background Music: {bgm_track_path} (Vol: {bgm_volume * 100:.0f}%)")
            try:
                bgm_audio = AudioFileClip(bgm_track_path)
                # Loop BGM if shorter than video
                if bgm_audio.duration < total_duration:
                    loops = int(math.ceil(total_duration / bgm_audio.duration))
                    # moviepy doesn't have loop natively on all versions, concatenate is safer
                    from moviepy.audio.AudioClip import concatenate_audioclips
                    bgm_audio = concatenate_audioclips([bgm_audio] * loops)
                    
                bgm_audio = subclip_clip_compat(bgm_audio, 0, total_duration)
                
                # Apply volume adjustment
                if hasattr(bgm_audio, "with_volume_scaled"):
                    bgm_audio = bgm_audio.with_volume_scaled(bgm_volume)
                elif hasattr(bgm_audio, "volumex"):
                    bgm_audio = bgm_audio.volumex(bgm_volume)
                else:
                    # Alternative volume scaling by multiplying array or using fx
                    try:
                        from moviepy.audio.fx.all import volumex
                        bgm_audio = volumex(bgm_audio, bgm_volume)
                    except Exception:
                        try:
                            bgm_audio = bgm_audio.multiply_volume(bgm_volume)
                        except Exception:
                            pass
                        
                # Merge TTS and BGM
                if final_video.audio:
                    from moviepy.audio.AudioClip import CompositeAudioClip
                    # Overlay TTS (100% volume) and BGM (low volume)
                    mixed_audio = CompositeAudioClip([final_video.audio, bgm_audio])
                    final_video = set_clip_audio(final_video, mixed_audio)
                else:
                    final_video = set_clip_audio(final_video, bgm_audio)
            except Exception as e:
                print(f"⚠️ BGM mixing failed: {e}. Continuing with narration audio only.")
                
        # 5. Render final output file
        print(f"🚀 Encoding final MP4 file: {output_path}...")
        final_video.write_videofile(
            output_path,
            fps=24,
            codec="libx264",
            audio_codec="aac",
            temp_audiofile=os.path.join(temp_dir, "temp-audio-render.m4a"),
            remove_temp=True,
            preset="ultrafast",
            threads=os.cpu_count() or 4
        )
        
        # Close clips
        final_video.close()
        for sc in scene_clips:
            sc.close()
            
        print(f"🎉 SUCCESS! Cinematic 4-Cut video generated at: {output_path}")
        
        # 6. Cleanup temp files
        for p in temp_paths:
            try:
                if os.path.exists(p):
                    os.remove(p)
            except Exception:
                pass
        for idx in range(len(cuts)):
            ap = cuts[idx].get("tts_path")
            if ap and os.path.exists(ap):
                try:
                    os.remove(ap)
                except Exception:
                    pass
        try:
            os.rmdir(temp_dir)
        except Exception:
            pass
            
    except Exception as render_err:
        print(f"❌ Video compilation crashed: {render_err}")
        # Cleanup temp directory
        for idx in range(len(cuts)):
            ap = cuts[idx].get("tts_path")
            if ap and os.path.exists(ap):
                try:
                    os.remove(ap)
                except Exception:
                    pass
        sys.exit(1)

if __name__ == "__main__":
    # Ensure event loop or execute async main
    import asyncio
    asyncio.run(main())
