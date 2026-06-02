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
from PIL import Image, ImageDraw, ImageFont, ImageDraw, ImageFont

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
    required = ["edge-tts", "moviepy", "pillow"]
    for pkg in required:
        try:
            if pkg == "edge-tts":
                import edge_tts
            elif pkg == "moviepy":
                import moviepy
            elif pkg == "pillow":
                import PIL
        except ImportError:
            print(f"📦 Installing required package: {pkg}...")
            try:
                subprocess.run([sys.executable, "-m", "pip", "install", pkg], check=True)
            except Exception as e:
                print(f"❌ Failed to install {pkg}: {e}")
                sys.exit(1)

ensure_packages()

import edge_tts
from PIL import ImageDraw, ImageFont

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
PRETENDARD_FONT_FILE = os.path.join(FONT_PATH, "Pretendard-ExtraBold.ttf")

def download_font(dest_path):
    font_url = "https://github.com/orioncactus/pretendard/raw/main/packages/pretendard/dist/public/static/Alternative/Pretendard-ExtraBold.ttf"
    if os.path.exists(dest_path):
        return True
    print(f"📥 Downloading Pretendard Font from {font_url}...")
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

def trim_audio_silence(audio_clip, threshold=0.015):
    """
    Detect silence at start and end of audio clip using numpy array,
    and return a subclip with silence trimmed.
    """
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
        
        # Pad slightly to avoid clicking
        start_time = max(0, start_time - 0.05)
        end_time = min(audio_clip.duration, end_time + 0.05)
        
        if end_time - start_time > 0.1:
            print(f"✂️ Trimmed audio silence from {audio_clip.duration:.2f}s to {end_time - start_time:.2f}s (Start: {start_time:.2f}s, End: {end_time:.2f}s)")
            return audio_clip.subclip(start_time, end_time)
    except Exception as e:
        print(f"⚠️ Audio trim failed: {e}. Keeping original audio.")
    return audio_clip

def create_template_frame_image(template_style, width=1080, height=1920):
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    style = template_style.lower()
    if style == "minimal":
        # Draw thin subtle borders at top and bottom
        draw.line([(80, 120), (width - 80, 120)], fill=(255, 255, 255, 60), width=2)
        draw.line([(80, height - 120), (width - 80, height - 120)], fill=(255, 255, 255, 60), width=2)
    elif style == "greenline":
        # Neon green horizontal lines at very edge
        draw.rectangle([0, 0, width, 6], fill=(57, 255, 20, 255))
        draw.rectangle([0, height - 6, width, height], fill=(57, 255, 20, 255))
    elif style == "vibrant":
        # Soft purple-pink gradient glowing vertical bars on sides
        # Left side glow
        for x in range(20):
            alpha = int(140 * (1 - x / 20.0))
            draw.line([(x, 0), (x, height)], fill=(123, 89, 182, alpha))
        # Right side glow
        for x in range(20):
            alpha = int(140 * (1 - x / 20.0))
            draw.line([(width - x, 0), (width - x, height)], fill=(255, 105, 180, alpha))
        
        # Top subtle dark banner
        draw.rectangle([0, 140, width, 220], fill=(0, 0, 0, 140))
        # Accent glow line at banner bottom
        draw.line([(0, 220), (width, 220)], fill=(255, 105, 180, 180), width=2)
    return img

def create_subtitle_image(text, width=1080, height=1920, font_path=None, font_size=55, template_style="classic", is_hook=False):
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    style = template_style.lower()
    
    # Scale up font size for opening hook to increase retention
    if is_hook:
        font_size = int(font_size * 1.25)
        
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

    # Split text into lines for mobile readability
    words = text.split()
    lines = []
    current_line = ""
    for word in words:
        test_line = current_line + " " + word if current_line else word
        if len(test_line) > 13: # Keep lines short for vertical layout
            lines.append(current_line)
            current_line = word
        else:
            current_line = test_line
    if current_line:
        lines.append(current_line)
        
    y_center = int(height * 0.75) # Position at bottom 75%
    
    line_heights = []
    for line in lines:
        try:
            bbox = draw.textbbox((0, 0), line, font=font)
            line_w = bbox[2] - bbox[0]
            line_h = bbox[3] - bbox[1]
        except AttributeError:
            line_w, line_h = draw.textsize(line, font=font)
        line_heights.append((line, line_w, line_h))
        
    total_height = sum([lh[2] for lh in line_heights]) + (len(lines) - 1) * 15
    current_y = y_center - (total_height // 2)
    
    for line, line_w, line_h in line_heights:
        x = (width - line_w) // 2
        
        # Background pill coordinates
        padding_x = 26
        padding_y = 12
        box_coords = [
            x - padding_x, 
            current_y - padding_y, 
            x + line_w + padding_x, 
            current_y + line_h + padding_y
        ]
        
        if is_hook:
            # Highlight orange/red background for the opening hook
            draw.rounded_rectangle(box_coords, radius=14, fill=(255, 69, 0, 205))
        elif style == "minimal":
            # Transparent dark capsule
            draw.rounded_rectangle(box_coords, radius=14, fill=(18, 18, 18, 100))
        elif style == "greenline":
            # Dark green capsule with neon green border
            draw.rounded_rectangle(box_coords, radius=14, fill=(10, 25, 10, 190), outline=(57, 255, 20, 255), width=2)
        elif style == "vibrant":
            # Soft black background box
            draw.rounded_rectangle(box_coords, radius=14, fill=(0, 0, 0, 60))
        else: # classic
            draw.rounded_rectangle(box_coords, radius=14, fill=(0, 0, 0, 150))
        
        # Color highlight rules (Yellow/Green/Peach for hook terms)
        text_color = (255, 255, 255, 255) # White
        highlight_keywords = ["!", "?", "대박", "필수", "금지", "주의", "꿀팁", "비밀", "공개", "방법", "멈추세요", "후회", "실수", "무료", "최저가", "할인", "추천"]
        has_highlight = any(hk in line for hk in highlight_keywords)
        
        if is_hook:
            text_color = (255, 255, 255, 255)
        elif has_highlight:
            if style == "greenline":
                text_color = (57, 255, 20, 255) # Neon Green
            elif style == "vibrant":
                text_color = (255, 127, 80, 255) # Peach Orange
            else:
                text_color = (255, 223, 0, 255) # Yellow
            
        draw.text((x, current_y), line, font=font, fill=text_color)
        current_y += line_h + 15
        
    return img

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

# Scrape stock images from Unsplash search results
def scrape_unsplash_images(keywords, max_images=5):
    print(f"🔍 Searching Unsplash for keywords: {keywords}")
    image_urls = []
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    }
    
    for kw in keywords:
        if not kw.strip():
            continue
        try:
            query = urllib.parse.quote(kw.strip())
            url = f"https://unsplash.com/s/photos/{query}"
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as response:
                html = response.read().decode('utf-8', errors='ignore')
                matches = re.findall(r'https://images\.unsplash\.com/photo-[a-zA-Z0-9\-_]+', html)
                seen = set()
                kw_count = 0
                for m in matches:
                    if m not in seen and 'profile' not in m and 'placeholder' not in m:
                        seen.add(m)
                        image_urls.append(m)
                        kw_count += 1
                        if kw_count >= 3:  # get up to 3 images per keyword
                            break
                        if len(image_urls) >= max_images:
                            break
        except Exception as e:
            print(f"⚠️ Unsplash scrape failed for '{kw}': {e}")
        if len(image_urls) >= max_images:
            break
            
    # Deduplicate total
    image_urls = list(dict.fromkeys(image_urls))
    return image_urls[:max_images]

# Search Pexels Videos API
def search_pexels_videos(query, api_key, limit=5):
    if not api_key:
        return []
    print(f"🔍 Searching Pexels Videos for: '{query}'")
    try:
        url = f"https://api.pexels.com/videos/search?query={urllib.parse.quote(query)}&per_page={limit}"
        req = urllib.request.Request(url)
        req.add_header("Authorization", api_key)
        req.add_header("User-Agent", "Mozilla/5.0")
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            video_urls = []
            for v in data.get("videos", []):
                files = v.get("video_files", [])
                if not files:
                    continue
                mp4_files = [f for f in files if f.get("link") and f.get("file_type") == "video/mp4"]
                if not mp4_files:
                    continue
                
                # Sort files to favor medium/low resolution vertical video to optimize download/render speed
                def score_file(f):
                    w = f.get("width") or 0
                    h = f.get("height") or 0
                    is_vertical = w < h
                    size_diff = abs(w - 720) + abs(h - 1280) if is_vertical else abs(w - 1280) + abs(h - 720)
                    vertical_bonus = 0 if is_vertical else 20000
                    uhd_penalty = 10000 if f.get("quality") == "uhd" else 0
                    return vertical_bonus + size_diff + uhd_penalty

                mp4_files.sort(key=score_file)
                video_urls.append(mp4_files[0]["link"])
            return video_urls
    except Exception as e:
        print(f"⚠️ Pexels video search failed for '{query}': {e}")
        return []

# Search Pixabay Videos API
def search_pixabay_videos(query, api_key, limit=5):
    if not api_key:
        return []
    print(f"🔍 Searching Pixabay Videos for: '{query}'")
    try:
        url = f"https://pixabay.com/api/videos/?key={api_key}&q={urllib.parse.quote(query)}&per_page={limit}"
        req = urllib.request.Request(url)
        req.add_header("User-Agent", "Mozilla/5.0")
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            video_urls = []
            for hit in data.get("hits", []):
                videos_dict = hit.get("videos", {})
                for quality in ["medium", "small", "tiny"]:
                    video_url = videos_dict.get(quality, {}).get("url")
                    if video_url:
                        video_urls.append(video_url)
                        break
            return video_urls
    except Exception as e:
        print(f"⚠️ Pixabay video search failed for '{query}': {e}")
        return []

# Search Pixabay Images API
def search_pixabay_images(query, api_key, limit=5):
    if not api_key:
        return []
    print(f"🔍 Searching Pixabay Images for: '{query}'")
    try:
        url = f"https://pixabay.com/api/?key={api_key}&q={urllib.parse.quote(query)}&per_page={limit}&image_type=photo"
        req = urllib.request.Request(url)
        req.add_header("User-Agent", "Mozilla/5.0")
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            return [hit.get("largeImageURL") or hit.get("webformatURL") for hit in data.get("hits", []) if hit.get("webformatURL")]
    except Exception as e:
        print(f"⚠️ Pixabay image search failed for '{query}': {e}")
        return []

# Download file with custom headers to prevent blocks
def download_file(url, dest_path, headers=None):
    if headers is None:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as response, open(dest_path, 'wb') as f:
        f.write(response.read())

# Crop and Resize Image to 9:16 Portrait
def crop_and_format_image(local_path, dest_path, target_width=1080, target_height=1920):
    try:
        img = Image.open(local_path)
        w, h = img.size
        target_aspect = target_width / target_height
        current_aspect = w / h
        
        if current_aspect > target_aspect:
            # Too wide, crop horizontally
            new_w = int(h * target_aspect)
            left = (w - new_w) // 2
            top = 0
            right = left + new_w
            bottom = h
        else:
            # Too tall, crop vertically
            new_h = int(w / target_aspect)
            left = 0
            top = (h - new_h) // 2
            right = w
            bottom = top + new_h
            
        img_cropped = img.crop((left, top, right, bottom))
        img_resized = img_cropped.resize((target_width, target_height), Image.Resampling.LANCZOS)
        if img_resized.mode != 'RGB':
            img_resized = img_resized.convert('RGB')
        img_resized.save(dest_path, "JPEG", quality=90)
        return True
    except Exception as e:
        print(f"⚠️ Failed to crop and format image: {e}")
        return False

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

# Scene-by-scene TTS Generator
async def generate_scene_tts(text, voice_gender, dest_path):
    voice = "ko-KR-SunHiNeural"
    if voice_gender.lower() == "male":
        voice = "ko-KR-InJoonNeural"
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(dest_path)

async def generate_all_scenes_tts(scenes, voice_gender, temp_dir):
    tasks = []
    print(f"🗣️ Concurrently generating neural TTS for {len(scenes)} scenes...")
    for idx, scene in enumerate(scenes):
        txt = scene.get("narration") or scene.get("caption") or "상세 정보"
        # Clean bracket expressions and directives
        txt_clean = re.sub(r'\[.*?\]', '', txt)
        txt_clean = re.sub(r'\(.*?\)', '', txt_clean).strip()
        if not txt_clean:
            txt_clean = "계속해서 확인해 보시죠"
        
        dest_path = os.path.join(temp_dir, f"scene_{idx}_audio.mp3")
        scene["audio_path"] = dest_path
        tasks.append(generate_scene_tts(txt_clean, voice_gender, dest_path))
    await asyncio.gather(*tasks)

def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_stock_shorts.py <config_json_path>")
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
        
    voice = config.get("voice", "female")
    output_path = config.get("output_path", "")
    image_source_mode = config.get("image_source_mode", "stock_only")
    direct_image_url = config.get("direct_image_url", "")
    direct_image_path = config.get("direct_image_path", "")
    keyword = config.get("keyword", "")
    scenes = config.get("scenes", [])
    pexels_api_key = config.get("pexels_api_key", "")
    pixabay_api_key = config.get("pixabay_api_key", "")
    template_style = config.get("template_style", "classic")
    
    if not output_path or not scenes:
        print("❌ Missing required configuration fields (output_path, scenes).")
        sys.exit(1)
        
    # Setup directories
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    try:
        timestamp_id = int(os.path.basename(output_path).split('_')[-1].split('.')[0]) if '_' in os.path.basename(output_path) else random.randint(1000, 9999)
    except ValueError:
        import time
        timestamp_id = int(time.time())
    temp_dir = os.path.join(os.path.dirname(output_path), f"temp_{timestamp_id}")
    os.makedirs(temp_dir, exist_ok=True)
    
    # Pre-render visual template frame overlay
    template_frame_path = os.path.join(temp_dir, "template_frame.png")
    frame_img = create_template_frame_image(template_style)
    frame_img.save(template_frame_path, "PNG")
    
    # 1. Run Async Neural TTS generation for all scenes concurrently
    try:
        asyncio.run(generate_all_scenes_tts(scenes, voice, temp_dir))
    except Exception as e:
        print(f"❌ TTS synthesis failed: {e}")
        sys.exit(1)
        
    # 2. Gather unique assets and build clips scene-by-scene
    print("🎬 Downloading B-roll assets and assembling clips...")
    
    used_urls = set()
    collected_assets_metadata = []
    scene_clips = []
    
    # Track temporary file paths for cleanup
    temp_paths = [template_frame_path]
    
    try:
        for idx, scene in enumerate(scenes):
            audio_path = scene.get("audio_path")
            if not audio_path or not os.path.exists(audio_path):
                print(f"⚠️ Audio file missing for Scene {idx+1}. Skipping.")
                continue
                
            raw_audio_clip = AudioFileClip(audio_path)
            # Apply Jump Cut (Silence Removal) technology to trim quiet spaces
            audio_clip = trim_audio_silence(raw_audio_clip)
            duration = audio_clip.duration
            print(f"\n--- Scene {idx+1} (Duration: {duration:.2f}s) ---")
            
            # Use 1:1 pacing (1 clip per scene) instead of splitting to optimize API downloads & render speed
            slot_duration = duration
            
            # Get video search keywords and image search keywords
            video_kws = scene.get("videoSearchKeywords", [])
            if not isinstance(video_kws, list):
                video_kws = [video_kws] if video_kws else []
            if not video_kws:
                legacy_kw = scene.get("imageKeyword", "").strip()
                video_kws = [legacy_kw] if legacy_kw else [keyword or "abstract"]

            image_kws = scene.get("imageSearchKeywords", [])
            if not isinstance(image_kws, list):
                image_kws = [image_kws] if image_kws else []
            if not image_kws:
                legacy_kw = scene.get("imageKeyword", "").strip()
                image_kws = [legacy_kw] if legacy_kw else [keyword or "abstract"]
                
            clip_added = False
            formatted_media_clip = None
            
            # Check for direct image override logic (e.g. show product cover image)
            is_direct_override = (
                image_source_mode == "direct" and 
                (direct_image_path or direct_image_url) and 
                (idx == 0 or idx % 5 == 0)
            )
            
            if is_direct_override:
                print(f"Using direct local product image upload/URL.")
                target_source = direct_image_path if (direct_image_path and os.path.exists(direct_image_path)) else direct_image_url
                dest_jpg = os.path.join(temp_dir, f"direct_scene_{idx}.jpg")
                
                if os.path.exists(target_source):
                    if crop_and_format_image(target_source, dest_jpg):
                        img_clip = set_clip_duration(ImageClip(dest_jpg), slot_duration)
                        try:
                            img_clip = img_clip.resize(lambda t: 1.0 + 0.04 * t)
                        except Exception as zoom_err:
                            print(f"⚠️ Zoom effect failed: {zoom_err}")
                        formatted_media_clip = img_clip
                        temp_paths.append(dest_jpg)
                        collected_assets_metadata.append({"url": "local_upload", "type": "image", "keyword": "direct_upload"})
                        clip_added = True
                elif target_source.startswith("http"):
                    try:
                        download_file(target_source, dest_jpg)
                        if crop_and_format_image(dest_jpg, dest_jpg):
                            img_clip = set_clip_duration(ImageClip(dest_jpg), slot_duration)
                            try:
                                img_clip = img_clip.resize(lambda t: 1.0 + 0.04 * t)
                            except Exception as zoom_err:
                                print(f"⚠️ Zoom effect failed: {zoom_err}")
                            formatted_media_clip = img_clip
                            temp_paths.append(dest_jpg)
                            collected_assets_metadata.append({"url": target_source, "type": "image", "keyword": "direct_url"})
                            clip_added = True
                    except Exception as e:
                        print(f"⚠️ Failed to download direct image URL: {e}")
            
            # Prioritize Pexels/Pixabay stock videos
            if not clip_added:
                for video_kw in video_kws:
                    if not video_kw.strip():
                        continue
                    video_pool = []
                    if pexels_api_key:
                        video_pool.extend(search_pexels_videos(video_kw, pexels_api_key))
                    if pixabay_api_key:
                        video_pool.extend(search_pixabay_videos(video_kw, pixabay_api_key))
                        
                    # Filter already used
                    video_pool = [v for v in video_pool if v not in used_urls]
                    
                    if video_pool:
                        selected_video_url = video_pool[0]
                        print(f"Downloading unique stock video for '{video_kw}': {selected_video_url}")
                        temp_mp4 = os.path.join(temp_dir, f"video_s{idx}.mp4")
                        
                        try:
                            download_file(selected_video_url, temp_mp4)
                            raw_video_clip = VideoFileClip(temp_mp4)
                            raw_video_clip = raw_video_clip.without_audio()
                            if raw_video_clip.duration < slot_duration:
                                loops_needed = int(math.ceil(slot_duration / raw_video_clip.duration))
                                timed_clip = concatenate_videoclips([raw_video_clip] * loops_needed).subclip(0, slot_duration)
                            else:
                                timed_clip = raw_video_clip.subclip(0, slot_duration)
                                
                            formatted_media_clip = crop_and_resize_video(timed_clip)
                            used_urls.add(selected_video_url)
                            temp_paths.append(temp_mp4)
                            collected_assets_metadata.append({"scene_idx": idx, "url": selected_video_url, "type": "video", "keyword": video_kw})
                            clip_added = True
                            break
                        except Exception as e:
                            print(f"⚠️ Video processing failed for {selected_video_url}: {e}")
                            
            # Fallback to Unsplash / Pixabay stock images
            if not clip_added:
                for image_kw in image_kws:
                    if not image_kw.strip():
                        continue
                    image_pool = []
                    image_pool.extend(scrape_unsplash_images([image_kw], max_images=5))
                    if pixabay_api_key:
                        image_pool.extend(search_pixabay_images(image_kw, pixabay_api_key))
                        
                    # Filter already used
                    image_pool = [img for img in image_pool if img not in used_urls]
                    
                    if image_pool:
                        selected_image_url = image_pool[0]
                        print(f"Downloading unique stock image for '{image_kw}': {selected_image_url}")
                        temp_jpg = os.path.join(temp_dir, f"img_s{idx}.jpg")
                        
                        try:
                            download_url = selected_image_url
                            if "unsplash.com" in download_url:
                                download_url = download_url + "?w=1080&h=1920&q=85&auto=format&fit=crop"
                                
                            download_file(download_url, temp_jpg)
                            if crop_and_format_image(temp_jpg, temp_jpg):
                                img_clip = set_clip_duration(ImageClip(temp_jpg), slot_duration)
                                try:
                                    if idx % 2 == 0:
                                        img_clip = img_clip.resize(lambda t: 1.0 + 0.04 * t)
                                    else:
                                        img_clip = img_clip.resize(lambda t: 1.04 - 0.04 * t)
                                except Exception as zoom_err:
                                    print(f"⚠️ Zoom effect failed: {zoom_err}")
                                    
                                formatted_media_clip = img_clip
                                used_urls.add(selected_image_url)
                                temp_paths.append(temp_jpg)
                                collected_assets_metadata.append({"scene_idx": idx, "url": selected_image_url, "type": "image", "keyword": image_kw})
                                clip_added = True
                                break
                            else:
                                raise Exception("Image cropping failed")
                        except Exception as e:
                            print(f"⚠️ Image processing failed for {selected_image_url}: {e}")
                    
            # If still empty, use general fallback Unsplash placeholders
            if not clip_added:
                print("⚠️ No unique search images found. Using fallback category placeholders...")
                placeholder_pool = [
                    f"https://images.unsplash.com/photo-{img_id}" for img_id in [
                        "1504674900247-0877df9cc836", "1512917774080-9991f1c4c750", 
                        "1526738549149-8e07eca6c147", "1518770660439-4636190af475",
                        "1498050108023-c5249f4df085", "1488590528505-98d2b5aba04b"
                    ]
                ]
                image_pool = [p for p in placeholder_pool if p not in used_urls]
                if not image_pool:
                    image_pool = placeholder_pool
                    
                selected_image_url = image_pool[0]
                print(f"Downloading unique stock image: {selected_image_url}")
                temp_jpg = os.path.join(temp_dir, f"img_s{idx}.jpg")
                
                try:
                    download_url = selected_image_url
                    if "unsplash.com" in download_url:
                        download_url = download_url + "?w=1080&h=1920&q=85&auto=format&fit=crop"
                        
                    download_file(download_url, temp_jpg)
                    if crop_and_format_image(temp_jpg, temp_jpg):
                        img_clip = set_clip_duration(ImageClip(temp_jpg), slot_duration)
                        try:
                            if idx % 2 == 0:
                                img_clip = img_clip.resize(lambda t: 1.0 + 0.04 * t)
                            else:
                                img_clip = img_clip.resize(lambda t: 1.04 - 0.04 * t)
                        except Exception as zoom_err:
                            print(f"⚠️ Zoom effect failed: {zoom_err}")
                            
                        formatted_media_clip = img_clip
                        used_urls.add(selected_image_url)
                        temp_paths.append(temp_jpg)
                        collected_assets_metadata.append({"scene_idx": idx, "url": selected_image_url, "type": "image", "keyword": "fallback"})
                        clip_added = True
                    else:
                        raise Exception("Image cropping failed")
                except Exception as e:
                    print(f"⚠️ Fallback image processing failed for {selected_image_url}: {e}")
                    
            # Ultimate fallback clip (black clip or static placeholder) in case everything failed
            if not clip_added:
                print("⚠️ Ultimate fallback clip generated (black screen).")
                dummy_jpg = os.path.join(temp_dir, f"dummy_s{idx}.jpg")
                img = Image.new("RGB", (1080, 1920), (18, 18, 18))
                img.save(dummy_jpg)
                img_clip = set_clip_duration(ImageClip(dummy_jpg), slot_duration)
                formatted_media_clip = img_clip
                temp_paths.append(dummy_jpg)
                collected_assets_metadata.append({"scene_idx": idx, "url": "ultimate_fallback", "type": "image", "keyword": "fallback"})

            # PIL Subtitle Rendering and Overlaying with Template Style
            caption_text = scene.get("caption") or scene.get("narration") or ""
            composite_layers = [formatted_media_clip]
            
            # Add template overlay layer if template is not classic
            if template_style.lower() != "classic" and os.path.exists(template_frame_path):
                frame_clip = ImageClip(template_frame_path)
                frame_clip = set_clip_duration(frame_clip, duration)
                composite_layers.append(frame_clip)
                
            if caption_text:
                try:
                    sub_img_path = os.path.join(temp_dir, f"subtitle_s{idx}.png")
                    sub_image = create_subtitle_image(
                        caption_text, 
                        font_path=PRETENDARD_FONT_FILE, 
                        template_style=template_style,
                        is_hook=(idx == 0) # Scale up opening hook
                    )
                    sub_image.save(sub_img_path, "PNG")
                    
                    sub_clip = ImageClip(sub_img_path)
                    sub_clip = set_clip_duration(sub_clip, duration)
                    composite_layers.append(sub_clip)
                    temp_paths.append(sub_img_path)
                except Exception as sub_err:
                    print(f"⚠️ Subtitle creation failed for Scene {idx+1}: {sub_err}")
            
            # Composite original video/image with the subtitle & template overlays
            scene_video_track = CompositeVideoClip(composite_layers)

            # Overlay the scene audio track
            scene_full_clip = set_clip_audio(scene_video_track, audio_clip)
            scene_clips.append(scene_full_clip)
            
        if not scene_clips:
            print("❌ No scenes rendered successfully.")
            sys.exit(1)
            
        # 3. Concatenate all scene clips into the final video
        print("\n🎬 Joining all scene videos into final production...")
        final_video = concatenate_videoclips(scene_clips, method="compose")
        
        # Render the final mp4 file
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
        
        # Close all open moviepy handles
        final_video.close()
        for c in scene_clips:
            c.close()
            
        print(f"\n🎉 Story-based Shorts video successfully created at: {output_path}")
        print(f"__ASSETS__:{json.dumps(collected_assets_metadata)}")
        
        # Cleanup temporary files
        for p in temp_paths:
            try:
                os.remove(p)
            except Exception:
                pass
        for scene in scenes:
            ap = scene.get("audio_path")
            if ap and os.path.exists(ap):
                try:
                    os.remove(ap)
                except Exception:
                    pass
        try:
            os.rmdir(temp_dir)
        except Exception:
            pass
            
    except Exception as e:
        print(f"❌ Video compilation failure: {e}")
        # Make sure we clean up what we can
        for scene in scenes:
            ap = scene.get("audio_path")
            if ap and os.path.exists(ap):
                try:
                    os.remove(ap)
                except Exception:
                    pass
        sys.exit(1)

if __name__ == "__main__":
    main()
