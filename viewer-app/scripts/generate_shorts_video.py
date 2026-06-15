#!/usr/bin/env python3
import os
import sys
import json
import urllib.request
import subprocess
import re
import math
import random

import asyncio

# Reconfigure stdout/stderr to UTF-8 to prevent cp949 encoding errors on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Self-installing packages
def ensure_packages():
    required_packages = ["edge-tts", "moviepy", "pillow", "numpy"]
    for pkg in required_packages:
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
async def generate_scene_tts(text, dest_path):
    communicate = edge_tts.Communicate(text, "ko-KR-SunHiNeural")
    await communicate.save(dest_path)

async def generate_all_sentences_tts(sentences, temp_dir):
    tasks = []
    temp_audio_paths = []
    for idx, sentence in enumerate(sentences):
        txt_clean = re.sub(r'\[.*?\]', '', sentence)
        txt_clean = re.sub(r'\(.*?\)', '', txt_clean).strip()
        if not txt_clean:
            txt_clean = "계속해서 확인해 보시죠"
        sub_audio_path = os.path.join(temp_dir, f"tts_{idx}.mp3")
        temp_audio_paths.append(sub_audio_path)
        tasks.append(generate_scene_tts(txt_clean, sub_audio_path))
    await asyncio.gather(*tasks)
    return temp_audio_paths

from PIL import Image, ImageOps, ImageDraw, ImageFont

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

def split_into_sentences(text):
    # Clean the script text and split by common sentence delimiters, or newline
    # Also ignore long URL strings to avoid pronouncing them
    cleaned_text = re.sub(r'https?://\S+', '', text).strip()
    raw_sentences = re.split(r'(?<=[.?!])\s*|\n+', cleaned_text)
    sentences = [s.strip() for s in raw_sentences if s.strip()]
    return sentences

try:
    from moviepy.editor import ImageClip, AudioFileClip, CompositeVideoClip, concatenate_audioclips
except ImportError:
    try:
        from moviepy import ImageClip, AudioFileClip, CompositeVideoClip, concatenate_audioclips
    except ImportError:
        from moviepy.video.VideoClip import ImageClip
        from moviepy.audio.io.AudioFileClip import AudioFileClip
        from moviepy.video.compositing.CompositeVideoClip import CompositeVideoClip
        from moviepy.audio.AudioClip import concatenate_audioclips

def download_image(url, dest_path):
    print(f"📥 Downloading image from {url}...")
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response, open(dest_path, 'wb') as out_file:
            out_file.write(response.read())
        print("✅ Image downloaded successfully.")
        return True
    except Exception as e:
        print(f"❌ Failed to download image: {e}")
        return False

def make_portrait_image(src_path, dest_path, target_width=1080, target_height=1920):
    """
    Open the product image, pad/resize it to fit a 9:16 portrait video format,
    and save it with a dark blurred background or solid color.
    """
    try:
        img = Image.open(src_path)
        
        # Create a solid dark background (e.g., dark charcoal color)
        bg = Image.new("RGB", (target_width, target_height), (18, 18, 18))
        
        # Calculate aspect ratio to fit the image inside target_width and target_height
        img.thumbnail((target_width - 80, target_height - 400), Image.Resampling.LANCZOS)
        
        # Center the product image on the portrait background
        offset = ((target_width - img.width) // 2, (target_height - img.height) // 2)
        bg.paste(img, offset)
        
        bg.save(dest_path)
        print("✅ Portrait background image processed.")
        return True
    except Exception as e:
        print(f"❌ Image processing error: {e}")
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_shorts_video.py <data_json_path>")
        sys.exit(1)
        
    json_path = sys.argv[1]
    if not os.path.exists(json_path):
        print(f"❌ JSON file not found: {json_path}")
        sys.exit(1)
        
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"❌ JSON parse error: {e}")
        sys.exit(1)
        
    script_text = data.get("script", "")
    image_url = data.get("image", "")
    output_path = data.get("output_path", "")
    template_style = data.get("template_style", "classic")
    
    if not script_text or not image_url or not output_path:
        print("❌ Missing required fields in input JSON (script, image, output_path).")
        sys.exit(1)
        
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    try:
        timestamp_id = int(os.path.basename(output_path).split('_')[-1].split('.')[0]) if '_' in os.path.basename(output_path) else random.randint(1000, 9999)
    except ValueError:
        import time
        timestamp_id = int(time.time())
        
    temp_dir = os.path.join(os.path.dirname(output_path), f"temp_{timestamp_id}")
    os.makedirs(temp_dir, exist_ok=True)
    
    raw_img_path = os.path.join(temp_dir, "raw_product.jpg")
    portrait_img_path = os.path.join(temp_dir, "portrait_product.jpg")
    
    # Pre-render visual template frame overlay
    template_frame_path = os.path.join(temp_dir, "template_frame.png")
    frame_img = create_template_frame_image(template_style)
    frame_img.save(template_frame_path, "PNG")
    
    # 1. Download image
    if not download_image(image_url, raw_img_path):
        # use fallback dummy image if download fails
        print("⚠️ Image download failed. Using a placeholder image.")
        try:
            placeholder = Image.new("RGB", (300, 300), (0, 210, 255))
            placeholder.save(raw_img_path)
        except Exception:
            pass
            
    # 2. Resize and pad image to 1080x1920 portrait format
    make_portrait_image(raw_img_path, portrait_img_path)
    
    # 3. Split into sentences and generate TTS + subtitles
    sentences = split_into_sentences(script_text)
    if not sentences:
        sentences = [script_text]

    print(f"🗣️ Found {len(sentences)} sentences. Generating individual TTS and subtitles...")
    
    # Concurrently generate neural TTS using edge-tts
    try:
        temp_audio_paths = asyncio.run(generate_all_sentences_tts(sentences, temp_dir))
    except Exception as e:
        print(f"❌ edge-tts synthesis failed: {e}")
        sys.exit(1)
        
    audio_clips = []
    subtitle_clips = []
    temp_paths = [template_frame_path, raw_img_path, portrait_img_path]
    temp_paths.extend(temp_audio_paths)
    
    video = None
    final_audio = None
    portrait_clip = None
    
    try:
        current_time = 0.0
        for idx, sentence in enumerate(sentences):
            sub_audio_path = temp_audio_paths[idx]
            
            # Load as AudioFileClip to get its duration
            raw_audio_clip = AudioFileClip(sub_audio_path)
            
            # Apply Jump Cut (Silence Removal) technology to trim quiet spaces
            audio_clip = trim_audio_silence(raw_audio_clip)
            duration = audio_clip.duration
            audio_clips.append(audio_clip)
            
            # Generate subtitle image
            sub_png_path = os.path.join(temp_dir, f"sub_{idx}.png")
            sub_image = create_subtitle_image(
                sentence, 
                font_path=PRETENDARD_FONT_FILE,
                template_style=template_style,
                is_hook=(idx == 0) # Scale up opening hook
            )
            sub_image.save(sub_png_path, "PNG")
            temp_paths.append(sub_png_path)
            
            # Subtitle Clip
            sub_clip = ImageClip(sub_png_path)
            
            # Set duration
            if hasattr(sub_clip, "with_duration"):
                sub_clip = sub_clip.with_duration(duration)
            else:
                sub_clip = sub_clip.set_duration(duration)
            
            # Set start time
            if hasattr(sub_clip, "with_start"):
                sub_clip = sub_clip.with_start(current_time)
            else:
                sub_clip = sub_clip.set_start(current_time)
                
            subtitle_clips.append(sub_clip)
            current_time += duration
            
        if not audio_clips:
            raise Exception("No audio clips generated.")
            
        # Concatenate audio tracks
        final_audio = concatenate_audioclips(audio_clips)
        total_duration = final_audio.duration
        
        # 4. Synthesize final video slideshow
        print(f"🎬 Rendering final slideshow video (Duration: {total_duration:.2f}s)...")
        portrait_clip = ImageClip(portrait_img_path)
        
        # Set background duration
        if hasattr(portrait_clip, "with_duration"):
            portrait_clip = portrait_clip.with_duration(total_duration)
        else:
            portrait_clip = portrait_clip.set_duration(total_duration)
            
        # Layers overlay
        composite_layers = [portrait_clip]
        
        # Add template overlay layer if template is not classic
        if template_style.lower() != "classic" and os.path.exists(template_frame_path):
            frame_clip = ImageClip(template_frame_path)
            if hasattr(frame_clip, "with_duration"):
                frame_clip = frame_clip.with_duration(total_duration)
            else:
                frame_clip = frame_clip.set_duration(total_duration)
            composite_layers.append(frame_clip)
            
        composite_layers.extend(subtitle_clips)
        
        # Combine portrait image, template frame, and subtitle layers
        video_track = CompositeVideoClip(composite_layers)
        
        # Attach audio track
        if hasattr(video_track, "with_audio"):
            video = video_track.with_audio(final_audio)
        else:
            video = video_track.set_audio(final_audio)
            
        # H.264 CPU encoding with acceleration
        video.write_videofile(
            output_path, 
            fps=24, 
            codec="libx264", 
            audio_codec="aac", 
            temp_audiofile=os.path.join(temp_dir, "temp-audio-render.m4a"),
            remove_temp=True,
            preset="ultrafast",
            threads=os.cpu_count() or 4
        )
        print(f"🎉 Video successfully generated at: {output_path}")
        
    except Exception as e:
        print(f"❌ Video rendering failed: {e}")
        sys.exit(1)
        
    finally:
        # Close all clips
        if video:
            try:
                video.close()
            except Exception: pass
        if final_audio:
            try:
                final_audio.close()
            except Exception: pass
        if portrait_clip:
            try:
                portrait_clip.close()
            except Exception: pass
        for ac in audio_clips:
            try:
                ac.close()
            except Exception: pass
        for sc in subtitle_clips:
            try:
                sc.close()
            except Exception: pass
            
        # Cleanup temporary files and directory
        for p in temp_paths:
            try:
                if os.path.exists(p):
                    os.remove(p)
            except Exception:
                pass
        try:
            if os.path.exists(temp_dir):
                import shutil
                shutil.rmtree(temp_dir)
        except Exception:
            pass

if __name__ == "__main__":
    main()
