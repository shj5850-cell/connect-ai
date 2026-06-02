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
from PIL import Image

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
try:
    from moviepy.editor import ImageClip, AudioFileClip, VideoFileClip, concatenate_videoclips
except ImportError:
    try:
        from moviepy import ImageClip, AudioFileClip, VideoFileClip, concatenate_videoclips
    except ImportError:
        from moviepy.video.VideoClip import ImageClip
        from moviepy.video.io.VideoFileClip import VideoFileClip
        from moviepy.audio.io.AudioFileClip import AudioFileClip
        from moviepy.video.compositing.concatenate import concatenate_videoclips

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
                # Prefer vertical video if available
                vertical = [f for f in files if f.get("width", 0) < f.get("height", 0) and f.get("link")]
                if vertical:
                    video_urls.append(vertical[0]["link"])
                else:
                    # Otherwise take any mp4 file link
                    mp4_files = [f for f in files if f.get("link") and f.get("file_type") == "video/mp4"]
                    if mp4_files:
                        video_urls.append(mp4_files[0]["link"])
                    elif files:
                        video_urls.append(files[0]["link"])
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
    
    if not output_path or not scenes:
        print("❌ Missing required configuration fields (output_path, scenes).")
        sys.exit(1)
        
    # Setup directories
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    timestamp_id = int(os.path.basename(output_path).split('_')[-1].split('.')[0]) if '_' in os.path.basename(output_path) else random.randint(1000, 9999)
    temp_dir = os.path.join(os.path.dirname(output_path), f"temp_{timestamp_id}")
    os.makedirs(temp_dir, exist_ok=True)
    
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
    temp_paths = []
    
    try:
        for idx, scene in enumerate(scenes):
            audio_path = scene.get("audio_path")
            if not audio_path or not os.path.exists(audio_path):
                print(f"⚠️ Audio file missing for Scene {idx+1}. Skipping.")
                continue
                
            audio_clip = AudioFileClip(audio_path)
            duration = audio_clip.duration
            print(f"\n--- Scene {idx+1} (Duration: {duration:.2f}s) ---")
            
            # Calculate slot clips (max 2 seconds per clip)
            # Slot duration d <= 2.0s
            num_slots = max(1, int(math.ceil(duration / 2.0)))
            slot_duration = duration / num_slots
            print(f"Splitting scene into {num_slots} slots of {slot_duration:.2f}s each to enforce 2s pacing.")
            
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
                
            slot_clips = []
            
            for slot_idx in range(num_slots):
                clip_added = False
                
                # Check for direct image override logic (e.g. show product cover image)
                # We place the direct image in Scene 1 Slot 0, and transition slots (e.g. Slot 0 of Scene 5, Scene 10, Scene 15)
                is_direct_override = (
                    image_source_mode == "direct" and 
                    (direct_image_path or direct_image_url) and 
                    (idx == 0 or idx % 5 == 0) and 
                    slot_idx == 0
                )
                
                if is_direct_override:
                    print(f"Slot {slot_idx}: Using direct local product image upload/URL.")
                    target_source = direct_image_path if (direct_image_path and os.path.exists(direct_image_path)) else direct_image_url
                    dest_jpg = os.path.join(temp_dir, f"direct_scene_{idx}_slot_{slot_idx}.jpg")
                    
                    if os.path.exists(target_source):
                        if crop_and_format_image(target_source, dest_jpg):
                            img_clip = set_clip_duration(ImageClip(dest_jpg), slot_duration)
                            # Ken Burns effect
                            try:
                                img_clip = img_clip.resize(lambda t: 1.0 + 0.04 * t)
                            except Exception as zoom_err:
                                print(f"⚠️ Zoom effect failed: {zoom_err}")
                            slot_clips.append(img_clip)
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
                                slot_clips.append(img_clip)
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
                            print(f"Slot {slot_idx}: Downloading unique stock video for '{video_kw}': {selected_video_url}")
                            temp_mp4 = os.path.join(temp_dir, f"video_s{idx}_p{slot_idx}.mp4")
                            
                            try:
                                download_file(selected_video_url, temp_mp4)
                                raw_video_clip = VideoFileClip(temp_mp4)
                                
                                # Trim video clip to match slot duration
                                # Strip original audio
                                raw_video_clip = raw_video_clip.without_audio()
                                if raw_video_clip.duration < slot_duration:
                                    loops_needed = int(math.ceil(slot_duration / raw_video_clip.duration))
                                    timed_clip = concatenate_videoclips([raw_video_clip] * loops_needed).subclip(0, slot_duration)
                                else:
                                    timed_clip = raw_video_clip.subclip(0, slot_duration)
                                    
                                # Fit-crop to 9:16 portrait
                                formatted_video_clip = crop_and_resize_video(timed_clip)
                                slot_clips.append(formatted_video_clip)
                                
                                used_urls.add(selected_video_url)
                                temp_paths.append(temp_mp4)
                                collected_assets_metadata.append({"scene_idx": idx, "slot_idx": slot_idx, "url": selected_video_url, "type": "video", "keyword": video_kw})
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
                            print(f"Slot {slot_idx}: Downloading unique stock image for '{image_kw}': {selected_image_url}")
                            temp_jpg = os.path.join(temp_dir, f"img_s{idx}_p{slot_idx}.jpg")
                            
                            try:
                                # Append Unsplash resizing parameters for high-res fitting
                                download_url = selected_image_url
                                if "unsplash.com" in download_url:
                                    download_url = download_url + "?w=1080&h=1920&q=85&auto=format&fit=crop"
                                    
                                download_file(download_url, temp_jpg)
                                if crop_and_format_image(temp_jpg, temp_jpg):
                                    img_clip = set_clip_duration(ImageClip(temp_jpg), slot_duration)
                                    
                                    # Alternating Ken Burns zoom-in / zoom-out transitions
                                    try:
                                        if (idx + slot_idx) % 2 == 0:
                                            img_clip = img_clip.resize(lambda t: 1.0 + 0.04 * t)
                                        else:
                                            img_clip = img_clip.resize(lambda t: 1.04 - 0.04 * t)
                                    except Exception as zoom_err:
                                        print(f"⚠️ Zoom effect failed: {zoom_err}")
                                        
                                    slot_clips.append(img_clip)
                                    used_urls.add(selected_image_url)
                                    temp_paths.append(temp_jpg)
                                    collected_assets_metadata.append({"scene_idx": idx, "slot_idx": slot_idx, "url": selected_image_url, "type": "image", "keyword": image_kw})
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
                    print(f"Slot {slot_idx}: Downloading unique stock image: {selected_image_url}")
                    temp_jpg = os.path.join(temp_dir, f"img_s{idx}_p{slot_idx}.jpg")
                    
                    try:
                        # Append Unsplash resizing parameters for high-res fitting
                        download_url = selected_image_url
                        if "unsplash.com" in download_url:
                            download_url = download_url + "?w=1080&h=1920&q=85&auto=format&fit=crop"
                            
                        download_file(download_url, temp_jpg)
                        if crop_and_format_image(temp_jpg, temp_jpg):
                            img_clip = set_clip_duration(ImageClip(temp_jpg), slot_duration)
                            
                            # Alternating Ken Burns zoom-in / zoom-out transitions
                            try:
                                    if (idx + slot_idx) % 2 == 0:
                                        img_clip = img_clip.resize(lambda t: 1.0 + 0.04 * t)
                                    else:
                                        img_clip = img_clip.resize(lambda t: 1.04 - 0.04 * t)
                            except Exception as zoom_err:
                                print(f"⚠️ Zoom effect failed: {zoom_err}")
                                
                            slot_clips.append(img_clip)
                            used_urls.add(selected_image_url)
                            temp_paths.append(temp_jpg)
                            collected_assets_metadata.append({"scene_idx": idx, "slot_idx": slot_idx, "url": selected_image_url, "type": "image", "keyword": "fallback"})
                            clip_added = True
                        else:
                            raise Exception("Image cropping failed")
                    except Exception as e:
                        print(f"⚠️ Fallback image processing failed for {selected_image_url}: {e}")
                        
                # Ultimate fallback clip (black clip or static placeholder) in case everything failed
                if not clip_added:
                    print("⚠️ Ultimate fallback clip generated (black screen).")
                    dummy_jpg = os.path.join(temp_dir, f"dummy_s{idx}_p{slot_idx}.jpg")
                    img = Image.new("RGB", (1080, 1920), (18, 18, 18))
                    img.save(dummy_jpg)
                    img_clip = set_clip_duration(ImageClip(dummy_jpg), slot_duration)
                    slot_clips.append(img_clip)
                    temp_paths.append(dummy_jpg)
                    collected_assets_metadata.append({"scene_idx": idx, "slot_idx": slot_idx, "url": "ultimate_fallback", "type": "image", "keyword": "fallback"})
            
            # Concatenate all slot clips for this scene
            scene_video_track = concatenate_videoclips(slot_clips, method="compose")
            
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
            remove_temp=True
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
