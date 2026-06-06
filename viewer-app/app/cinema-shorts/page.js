'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Film, Sparkles, Loader2, Play, Save, FolderOpen, 
  Download, Image as ImageIcon, Video, Volume2, Settings, 
  HelpCircle, Trash2, Check, AlertCircle, Plus, Eye, ChevronDown, ChevronUp, Upload
} from 'lucide-react';
import Link from 'next/link';

export default function CinemaShortsPage() {
  const [title, setTitle] = useState('시네마틱 에이전트의 모험');
  const [purpose, setPurpose] = useState('감성');
  const [atmosphere, setAtmosphere] = useState('시네마틱');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [length, setLength] = useState('30초');
  const [platform, setPlatform] = useState('YouTube Shorts');
  
  // Advanced Settings
  const [stylePreset, setStylePreset] = useState('감성 광고형');
  const [colorPreset, setColorPreset] = useState('따뜻한 필름톤');
  const [transitionEffect, setTransitionEffect] = useState('페이드');
  const [captionStyle, setCaptionStyle] = useState('minimal');
  const [captionPosition, setCaptionPosition] = useState('bottom');
  const [voice, setVoice] = useState('female');
  const [bgmStyle, setBgmStyle] = useState('감성 피아노');
  const [bgmVolume, setBgmVolume] = useState(15);
  
  // BGM Upload state
  const [bgmBase64, setBgmBase64] = useState('');
  const [bgmFileName, setBgmFileName] = useState('');
  
  // Raw script paste input state
  const [rawScriptText, setRawScriptText] = useState('');

  // Project List / Loading Modal state
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [projectsList, setProjectsList] = useState([]);
  const [projectId, setProjectId] = useState('');

  // 4 Cuts State
  const initialCuts = Array.from({ length: 4 }, (_, i) => ({
    cutIndex: i + 1,
    subtitle: `시네마틱 4컷 쇼츠의 ${i + 1}번째 장면 자막입니다.`,
    description: `장면 ${i + 1}에 어울리는 극적인 연출과 시각적 요소 묘사.`,
    prompt: `Cinematic vertical photo, photorealistic, 8k, dramatic lighting, scene ${i + 1}`,
    cameraMovement: 'zoom in',
    duration: 5,
    keywords: `장면${i + 1}`,
    uploadedBase64: '',
    previewUrl: '',
    uploadedFileName: '',
    isVideo: false,
    image_path: '',
    video_path: ''
  }));

  const [cuts, setCuts] = useState(initialCuts);
  const [activePreviewCut, setActivePreviewCut] = useState(0); // 0 to 3
  const [expandedCutIndex, setExpandedCutIndex] = useState(0); // 0 to 3 for accordion

  // Status & Progress states
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(''); // 'image', 'script', 'video', 'saving'
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [renderedVideoUrl, setRenderedVideoUrl] = useState('');

  // YouTube Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [ytTitle, setYtTitle] = useState('');
  const [ytDesc, setYtDesc] = useState('');

  useEffect(() => {
    if (renderedVideoUrl) {
      setYtTitle(`${title} #Shorts`);
      const descText = cuts.map(c => c.subtitle).join('\n') + '\n\n#AI #시네마틱 #쇼츠 #자동생성';
      setYtDesc(descText);
      setUploadSuccess('');
      setUploadError('');
    }
  }, [renderedVideoUrl, title]);

  const handleYoutubeUpload = async () => {
    if (!renderedVideoUrl || uploading) return;
    setUploading(true);
    setUploadSuccess('');
    setUploadError('');
    try {
      const res = await fetch('/api/youtube/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: renderedVideoUrl,
          title: ytTitle,
          description: ytDesc
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUploadSuccess(data.message || '유튜브 업로드 성공!');
      } else {
        throw new Error(data.error || '유튜브 업로드 중 알 수 없는 에러가 발생했습니다.');
      }
    } catch (err) {
      console.error(err);
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Load projects list
  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/cinema-shorts/projects');
      const data = await res.json();
      if (data.success) {
        setProjectsList(data.projects || []);
      }
    } catch (e) {
      console.error('Failed to fetch projects', e);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Save Project
  const handleSaveProject = async () => {
    setLoading(true);
    setLoadingStep('saving');
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const payload = {
        id: projectId,
        title,
        purpose,
        atmosphere,
        aspectRatio,
        length,
        platform,
        stylePreset,
        colorPreset,
        transitionEffect,
        captionStyle,
        captionPosition,
        voice,
        bgmStyle,
        bgmVolume,
        bgmFileName,
        cuts: cuts.map(c => ({
          ...c,
          // exclude local file previews to keep JSON payload small, but preserve base64 if needed
          previewUrl: ''
        }))
      };

      const res = await fetch('/api/cinema-shorts/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setProjectId(data.id);
        setSuccessMsg('프로젝트가 안전하게 서버에 저장되었습니다!');
        fetchProjects();
      } else {
        setErrorMsg(data.error || '프로젝트 저장 실패');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('네트워크 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  // Load Selected Project
  const handleLoadProject = async (id) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/cinema-shorts/projects?id=${id}`);
      const data = await res.json();
      if (data.success && data.project) {
        const proj = data.project;
        setProjectId(proj.id || '');
        setTitle(proj.title || '');
        setPurpose(proj.purpose || '감성');
        setAtmosphere(proj.atmosphere || '시네마틱');
        setAspectRatio(proj.aspectRatio || '9:16');
        setLength(proj.length || '30초');
        setPlatform(proj.platform || 'YouTube Shorts');
        setStylePreset(proj.stylePreset || '감성 광고형');
        setColorPreset(proj.colorPreset || '따뜻한 필름톤');
        setTransitionEffect(proj.transitionEffect || '페이드');
        setCaptionStyle(proj.captionStyle || 'minimal');
        setCaptionPosition(proj.captionPosition || 'bottom');
        setVoice(proj.voice || 'female');
        setBgmStyle(proj.bgmStyle || '감성 피아노');
        setBgmVolume(proj.bgmVolume !== undefined ? proj.bgmVolume : 15);
        setBgmFileName(proj.bgmFileName || '');
        
        // Restore cuts data
        if (proj.cuts && proj.cuts.length === 4) {
          const restoredCuts = proj.cuts.map((c, i) => ({
            ...initialCuts[i],
            ...c,
            // If it has local save paths, build previews if possible or set path
            previewUrl: c.image_path || c.video_path || c.previewUrl || ''
          }));
          setCuts(restoredCuts);
        }
        setSuccessMsg('프로젝트를 불러왔습니다.');
        setShowLoadModal(false);
      } else {
        setErrorMsg(data.error || '프로젝트 로드 실패');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('프로젝트 로딩 중 네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Delete Project
  const handleDeleteProject = async (e, id) => {
    e.stopPropagation();
    if (!confirm('정말 이 프로젝트를 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/cinema-shorts/projects?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchProjects();
        if (projectId === id) {
          setProjectId('');
        }
      }
    } catch (e) {
      console.error('Delete project failed', e);
    }
  };

  // Handle Cut File Upload
  const handleCutFileChange = (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      const previewUrl = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video/');

      const newCuts = [...cuts];
      newCuts[index].uploadedBase64 = base64;
      newCuts[index].previewUrl = previewUrl;
      newCuts[index].uploadedFileName = file.name;
      newCuts[index].isVideo = isVideo;
      
      // Clear paths as new file is uploaded
      newCuts[index].image_path = '';
      newCuts[index].video_path = '';
      
      setCuts(newCuts);
      setActivePreviewCut(index);
    };
    reader.readAsDataURL(file);
  };

  // Handle BGM Upload
  const handleBgmFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setBgmBase64(reader.result);
      setBgmFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  // AI Image Generation for a single cut
  const handleGenerateImage = async (index) => {
    setLoading(true);
    setLoadingStep(`image-${index}`);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const activeCut = cuts[index];
      
      // build context of other cuts to provide consistency
      const otherCutsContext = cuts
        .filter((_, idx) => idx !== index)
        .map((c, idx) => `Cut ${c.cutIndex}: 자막="${c.subtitle}", 묘사="${c.description}"`)
        .join(' | ');

      const payload = {
        prompt: activeCut.prompt,
        atmosphere,
        stylePreset,
        colorPreset,
        cutIndex: index + 1,
        allCutsContext: otherCutsContext,
        title
      };

      const res = await fetch('/api/cinema-shorts/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success && data.imageUrl) {
        const newCuts = [...cuts];
        newCuts[index].image_path = data.imageUrl;
        newCuts[index].previewUrl = data.imageUrl;
        newCuts[index].isVideo = false;
        newCuts[index].uploadedBase64 = ''; // generated replaces manual upload
        
        // update prompt to the enhanced one
        if (data.enhancedPrompt) {
          newCuts[index].prompt = data.enhancedPrompt;
        }

        setCuts(newCuts);
        setActivePreviewCut(index);
        setSuccessMsg(`Cut ${index + 1} AI 이미지가 생성되어 연결되었습니다!`);
      } else {
        setErrorMsg(data.error || '이미지 생성 실패');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('AI 이미지 생성 호출 중 네트워크 에러가 발생했습니다.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  // Generate All AI Images consecutively
  const handleGenerateAllImages = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    for (let i = 0; i < 4; i++) {
      if (!cuts[i].previewUrl || cuts[i].uploadedBase64 || cuts[i].image_path) {
        // If image is already set or uploaded, maybe skip? Let's generate for any cut that has no uploaded files or empty path
        if (cuts[i].image_path || cuts[i].uploadedBase64) {
          continue; // skip custom uploads
        }
      }
      await handleGenerateImage(i);
    }
  };
  // Raw Script Parser handler
  const handleParseRawScript = async () => {
    if (!rawScriptText.trim()) {
      setErrorMsg('파싱할 대본 텍스트를 입력해 주세요.');
      return;
    }
    setLoading(true);
    setLoadingStep('script');
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/cinema-shorts/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: rawScriptText })
      });
      const data = await res.json();
      if (data.success && data.cuts) {
        if (data.title) setTitle(data.title);
        if (data.purpose) setPurpose(data.purpose);
        if (data.atmosphere) setAtmosphere(data.atmosphere);
        if (data.stylePreset) setStylePreset(data.stylePreset);
        
        if (data.musicStyleRecommendation) {
          const recommended = data.musicStyleRecommendation.toLowerCase();
          if (recommended.includes('피아노') || recommended.includes('piano') || recommended.includes('감성')) {
            setBgmStyle('감성 피아노');
          } else if (recommended.includes('앰비언트') || recommended.includes('ambient') || recommended.includes('시네마틱') || recommended.includes('드론')) {
            setBgmStyle('시네마틱 앰비언트');
          } else if (recommended.includes('신스') || recommended.includes('synth') || recommended.includes('몽환')) {
            setBgmStyle('몽환적인 신스');
          } else if (recommended.includes('광고') || recommended.includes('ad') || recommended.includes('빠른')) {
            setBgmStyle('빠른 템포 광고 음악');
          } else if (recommended.includes('어두운') || recommended.includes('dark') || recommended.includes('저음') || recommended.includes('불안한')) {
            setBgmStyle('어두운 저음 중심');
          } else if (recommended.includes('밝은') || recommended.includes('브이로그') || recommended.includes('vlog')) {
            setBgmStyle('밝은 브이로그');
          } else {
            setBgmStyle('시네마틱 앰비언트');
          }
        }
        
        const parsedCuts = cuts.map((c, i) => {
          const parsed = data.cuts[i] || {};
          return {
            ...c,
            subtitle: parsed.subtitle || '',
            description: parsed.description || '',
            prompt: parsed.prompt || '',
            cameraMovement: parsed.cameraMovement || 'zoom in',
            duration: parsed.duration || 5,
            keywords: parsed.keywords || '',
            previewUrl: '',
            uploadedBase64: '',
            uploadedFileName: '',
            image_path: '',
            video_path: '',
            isVideo: false
          };
        });
        setCuts(parsedCuts);
        setSuccessMsg('⚡ 대본 파싱 및 4컷 정보가 일괄 자동 입력되었습니다! 아래 설정을 확인하고 [⚡ 원클릭 초고속 쇼츠 제작] 또는 개별 작업을 시작해 보세요.');
        setExpandedCutIndex(0); // Open first cut edit accordion
      } else {
        setErrorMsg(data.error || '대본 파싱에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('대본 파싱 중 네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  // AI Script Auto-Generation / Completion
  const handleComplementScript = async () => {
    setLoading(true);
    setLoadingStep('script');
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const payload = {
        title,
        purpose,
        atmosphere,
        stylePreset,
        cuts: cuts.map(c => ({
          subtitle: c.subtitle,
          description: c.description,
          prompt: c.prompt,
          cameraMovement: c.cameraMovement,
          keywords: c.keywords
        }))
      };

      const res = await fetch('/api/cinema-shorts/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success && data.cuts) {
        const newCuts = cuts.map((c, i) => {
          const gen = data.cuts[i];
          return {
            ...c,
            subtitle: gen.subtitle || c.subtitle,
            description: gen.description || c.description,
            prompt: gen.prompt || c.prompt,
            cameraMovement: gen.cameraMovement || c.cameraMovement,
            keywords: gen.keywords || c.keywords
          };
        });
        setCuts(newCuts);
        if (data.musicStyleRecommendation) {
          setSuccessMsg(`AI가 대본 및 연출 구성을 보완했습니다. (음악 추천: ${data.musicStyleRecommendation})`);
        } else {
          setSuccessMsg(`AI가 대본 및 연출 구성을 완성했습니다!`);
        }
      } else {
        setErrorMsg(data.error || '대본 생성 실패');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('대본 생성 호출 중 네트워크 에러가 발생했습니다.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  // Render Video
  const handleRenderVideo = async () => {
    setLoading(true);
    setLoadingStep('video');
    setErrorMsg('');
    setRenderedVideoUrl('');
    setSuccessMsg('');
    
    // Validate that cuts have images or media
    const missingMedia = cuts.some(c => !c.previewUrl);
    if (missingMedia) {
      setErrorMsg('영상 렌더링 전에 4개 컷 모두 이미지 업로드 또는 [AI 이미지 생성]이 완료되어야 합니다.');
      setLoading(false);
      setLoadingStep('');
      return;
    }

    try {
      const payload = {
        title,
        purpose,
        atmosphere,
        stylePreset,
        colorPreset,
        captionStyle,
        captionPosition,
        transitionEffect,
        bgmStyle,
        bgmVolume,
        bgmBase64,
        bgmFileName,
        voice,
        cuts: cuts.map(c => ({
          subtitle: c.subtitle,
          camera_movement: c.cameraMovement,
          duration: c.duration,
          highlight_keywords: c.keywords,
          uploadedBase64: c.uploadedBase64,
          image_path: c.image_path,
          video_path: c.video_path
        }))
      };

      const res = await fetch('/api/cinema-shorts/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success && data.videoUrl) {
        setRenderedVideoUrl(data.videoUrl);
        setSuccessMsg('🎉 4컷 시네마틱 쇼츠 비디오 렌더링에 성공했습니다!');
      } else {
        setErrorMsg(data.error || '비디오 렌더링 중 에러가 발생했습니다. 로그를 확인해 주세요.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('비디오 렌더링 서버 통신 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  // One-Click Auto Generation (자막 보완 -> 이미지 생성 -> 비디오 렌더링)
  const handleOneClickAutoGenerate = async () => {
    setLoading(true);
    setErrorMsg('');
    setRenderedVideoUrl('');
    setSuccessMsg('');
    
    let currentCuts = [...cuts];
    
    try {
      // Step 1: AI Script Complement
      setLoadingStep('one-click-script');
      console.log("[One-Click] Step 1: Complementing Script...");
      const scriptPayload = {
        title,
        purpose,
        atmosphere,
        stylePreset,
        cuts: currentCuts.map(c => ({
          subtitle: c.subtitle,
          description: c.description,
          prompt: c.prompt,
          cameraMovement: c.cameraMovement,
          keywords: c.keywords
        }))
      };

      const scriptRes = await fetch('/api/cinema-shorts/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scriptPayload)
      });
      const scriptData = await scriptRes.json();
      
      if (!scriptData.success) {
        throw new Error(scriptData.error || '대본 보완 단계에서 오류가 발생했습니다.');
      }
      
      // Merge AI completions
      currentCuts = currentCuts.map((c, i) => {
        const gen = scriptData.cuts[i];
        return {
          ...c,
          subtitle: gen.subtitle || c.subtitle,
          description: gen.description || c.description,
          prompt: gen.prompt || c.prompt,
          cameraMovement: gen.cameraMovement || c.cameraMovement,
          keywords: gen.keywords || c.keywords
        };
      });
      setCuts(currentCuts);
      
      // Step 2: AI Image Generation for any cuts without custom uploads or existing paths
      console.log("[One-Click] Step 2: Generating missing AI images...");
      for (let i = 0; i < 4; i++) {
        const cut = currentCuts[i];
        if (cut.uploadedBase64 || cut.video_path || (cut.image_path && cut.previewUrl)) {
          // Skip if already has custom upload or existing generated image
          continue;
        }
        
        setLoadingStep(`one-click-image-${i}`);
        console.log(`[One-Click] Generating image for Cut ${i + 1}...`);
        
        const otherCutsContext = currentCuts
          .filter((_, idx) => idx !== i)
          .map(c => `Cut ${c.cutIndex}: 자막="${c.subtitle}", 묘사="${c.description}"`)
          .join(' | ');

        const imgPayload = {
          prompt: cut.prompt,
          atmosphere,
          stylePreset,
          colorPreset,
          cutIndex: i + 1,
          allCutsContext: otherCutsContext,
          title
        };

        const imgRes = await fetch('/api/cinema-shorts/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(imgPayload)
        });
        const imgData = await imgRes.json();
        
        if (!imgData.success) {
          throw new Error(`Cut ${i + 1} 이미지 생성 중 오류: ${imgData.error || '알 수 없음'}`);
        }
        
        currentCuts[i].image_path = imgData.imageUrl;
        currentCuts[i].previewUrl = imgData.imageUrl;
        currentCuts[i].isVideo = false;
        currentCuts[i].uploadedBase64 = '';
        if (imgData.enhancedPrompt) {
          currentCuts[i].prompt = imgData.enhancedPrompt;
        }
        
        setCuts([...currentCuts]);
        setActivePreviewCut(i);
      }
      
      // Step 3: Final Video Composition
      setLoadingStep('one-click-video');
      console.log("[One-Click] Step 3: Compiling final video...");
      
      const videoPayload = {
        title,
        purpose,
        atmosphere,
        stylePreset,
        colorPreset,
        captionStyle,
        captionPosition,
        transitionEffect,
        bgmStyle,
        bgmVolume,
        bgmBase64,
        bgmFileName,
        voice,
        cuts: currentCuts.map(c => ({
          subtitle: c.subtitle,
          camera_movement: c.cameraMovement,
          duration: c.duration,
          highlight_keywords: c.keywords,
          uploadedBase64: c.uploadedBase64,
          image_path: c.image_path,
          video_path: c.video_path
        }))
      };

      const videoRes = await fetch('/api/cinema-shorts/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videoPayload)
      });
      const videoData = await videoRes.json();
      
      if (!videoData.success) {
        throw new Error(videoData.error || '최종 비디오 합성 중 오류가 발생했습니다.');
      }
      
      setRenderedVideoUrl(videoData.videoUrl);
      setSuccessMsg('🎉 원클릭 쇼츠 제작에 성공했습니다! 아래에서 영상을 재생하거나 다운로드할 수 있습니다.');
      
    } catch (e) {
      console.error('[One-Click Auto Gen Error]', e);
      setErrorMsg(e.message || '원클릭 쇼츠 제작 도중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  // Calculate total duration
  const totalDuration = cuts.reduce((acc, cut) => acc + parseFloat(cut.duration || 4), 0);

  // Subtitle Preview Class/Style Generator
  const getSubtitlePreviewStyles = () => {
    let baseStyles = {
      position: 'absolute',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '85%',
      zIndex: 10,
      textAlign: 'center',
      fontWeight: 'bold',
      lineHeight: '1.6',
      pointerEvents: 'none'
    };

    // Position
    if (captionPosition === 'top') {
      baseStyles.top = '15%';
    } else if (captionPosition === 'center') {
      baseStyles.top = '50%';
      baseStyles.transform = 'translate(-50%, -50%)';
    } else {
      baseStyles.top = '78%';
    }

    // Styling
    switch (captionStyle) {
      case 'minimal':
        return {
          ...baseStyles,
          fontSize: '0.85rem',
          color: '#ffffff',
          backgroundColor: 'rgba(18, 18, 18, 0.65)',
          padding: '0.5rem 0.8rem',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.08)'
        };
      case 'hooking':
        return {
          ...baseStyles,
          fontSize: '1rem',
          color: '#ffdf00',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          padding: '0.6rem 1rem',
          borderRadius: '14px',
          textShadow: '2px 2px 0px #000000',
          border: '2px solid #ffdf00'
        };
      case 'news':
        return {
          ...baseStyles,
          fontSize: '0.85rem',
          color: '#ffffff',
          backgroundColor: 'rgba(15, 32, 67, 0.95)',
          padding: '0.5rem 0.8rem',
          borderRadius: '0px',
          borderLeft: '4px solid #38bdf8'
        };
      case 'essay':
        return {
          ...baseStyles,
          fontSize: '0.85rem',
          color: '#f5f0eb',
          backgroundColor: 'rgba(40, 35, 30, 0.7)',
          padding: '0.5rem 0.8rem',
          borderRadius: '8px',
          fontFamily: 'serif',
          fontStyle: 'italic'
        };
      case 'copy':
        return {
          ...baseStyles,
          fontSize: '0.9rem',
          color: '#ffffff',
          backgroundColor: 'rgba(210, 32, 32, 0.9)',
          padding: '0.6rem 0.8rem',
          borderRadius: '6px',
          boxShadow: '0 0 10px rgba(210, 32, 32, 0.4)'
        };
      default:
        return baseStyles;
    }
  };

  return (
    <div className="container" style={{ padding: '2rem', maxWidth: '1350px' }}>
      
      {/* Header */}
      <header className="header" style={{ marginBottom: '2rem', borderBottom: 'none', paddingBottom: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', width: 'fit-content' }} className="btn-secondary btn">
            <ArrowLeft size={16} /> 대시보드로 돌아가기
          </Link>
          <h1 className="title gradient-text" style={{ fontSize: '2.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Film size={30} color="#fb7185" style={{ filter: 'drop-shadow(0 0 8px rgba(251,113,133,0.4))' }} />
            <span>AI 4컷 시네마틱 쇼츠 제작기</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
            4컷 구성의 설명과 AI 이미지 생성, 나레이션 자막, 고급 트랜지션, BGM 합성을 통한 고화질 9:16 모바일 숏폼 영상 제작 워크플로우
          </p>
        </div>
      </header>

      {/* Messages */}
      {errorMsg && (
        <div className="error-message-box" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="glass-panel" style={{ padding: '1rem', borderLeft: '4px solid #10b981', background: 'rgba(16,185,129,0.05)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 500 }}>
          <Check size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 420px', gap: '2rem' }}>
        
        {/* Left Column: Form Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Section: Raw Script Paste & Auto-Fill */}
          <div className="glass-panel" style={{ padding: '2rem', border: '1px solid rgba(251,113,133,0.3)', background: 'rgba(255,255,255,0.01)' }}>
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem 0', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} color="#fb7185" style={{ filter: 'drop-shadow(0 0 8px rgba(251,113,133,0.4))' }} />
              <span>⚡ 자유 서식 대본 붙여넣기 (일괄 자동 입력)</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 1.25rem 0', lineHeight: '1.6' }}>
              메모장이나 ChatGPT 등에서 복사한 자유로운 서식의 대본을 통째로 입력해 보세요. AI가 제목, 스타일, BGM 분위기, 그리고 4개 컷의 상세 설정(자막, 이미지 프롬프트, 카메라 무빙, 재생 초)을 파싱하여 아래의 워크스페이스에 즉시 일괄 적용합니다.
            </p>
            <textarea
              value={rawScriptText}
              onChange={(e) => setRawScriptText(e.target.value)}
              placeholder={`여기에 대본을 통째로 붙여넣어 주세요.
              
(예시)
제목: 절대 저 문을 열지 마세요
영상 스타일: 공포, 미스터리
음악: 저음 드론 사운드 + 불안한 앰비언트
길이: 30초

CUT 1
설명: 평범한 사무실 복도처럼 보이지만 이상할 정도로 사람이 없다.
AI 이미지 프롬프트: endless yellow office corridor, liminal space, backrooms style, 9:16
자막: 그곳은 평범한 사무실처럼 보였다.
카메라: 천천히 전진
길이: 7초`}
              style={{ 
                width: '100%', 
                height: '180px', 
                padding: '0.75rem', 
                background: 'rgba(0,0,0,0.4)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px', 
                color: '#fff', 
                fontSize: '0.85rem', 
                fontFamily: 'monospace',
                resize: 'vertical', 
                outline: 'none',
                marginBottom: '1rem',
                lineHeight: '1.6'
              }}
            />
            <button
              onClick={handleParseRawScript}
              disabled={loading || !rawScriptText.trim()}
              className="btn"
              style={{ 
                width: '100%', 
                padding: '0.8rem', 
                fontWeight: 750, 
                background: 'linear-gradient(135deg, #fb7185 0%, #f43f5e 100%)', 
                border: 'none', 
                color: '#fff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(244,63,94,0.25)'
              }}
            >
              {loading && loadingStep === 'script' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>대본 분석 및 일괄 입력 중...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>⚡ 대본 파싱 및 4컷 일괄 적용</span>
                </>
              )}
            </button>
          </div>

          {/* Section 1: Basic Info & Project Controls */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings size={20} color="#fb7185" />
                <span>[1단계] 영상 프로젝트 설정</span>
              </h2>
              
              {/* Project Load / Save Controls */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => { setShowLoadModal(true); fetchProjects(); }}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                >
                  <FolderOpen size={14} />
                  <span>불러오기</span>
                </button>
                <button 
                  onClick={handleSaveProject}
                  disabled={loading}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                >
                  {loading && loadingStep === 'saving' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>저장</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>영상 프로젝트 제목</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  style={{ width: '100%', padding: '0.65rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>영상 목적</label>
                  <select 
                    value={purpose} 
                    onChange={(e) => setPurpose(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', background: '#1c1917', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none' }}
                  >
                    {['감성', '정보', '광고', '제품소개', '스토리', '브랜딩', '기타'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>전체 분위기</label>
                  <select 
                    value={atmosphere} 
                    onChange={(e) => setAtmosphere(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', background: '#1c1917', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none' }}
                  >
                    {['시네마틱', '감성적', '고급스러움', '다크', '밝음', '몽환적', '미니멀', '강렬함'].map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', gridColumn: 'span 2' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>비율</label>
                  <input type="text" value={aspectRatio} disabled style={{ width: '100%', padding: '0.65rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-secondary)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>영상 길이</label>
                  <select 
                    value={length} 
                    onChange={(e) => setLength(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', background: '#1c1917', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none' }}
                  >
                    {['15초', '30초', '45초', '60초'].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>타겟 플랫폼</label>
                  <select 
                    value={platform} 
                    onChange={(e) => setPlatform(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', background: '#1c1917', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none' }}
                  >
                    {['YouTube Shorts', 'Instagram Reels', 'TikTok'].map(plat => (
                      <option key={plat} value={plat}>{plat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: 4 Cuts Config Accordion */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Film size={20} color="#fb7185" />
              <span>[2단계] 4컷별 시나리오 & 에셋 구성</span>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {cuts.map((cut, index) => {
                const isExpanded = expandedCutIndex === index;
                return (
                  <div 
                    key={cut.cutIndex} 
                    className="glass-panel" 
                    style={{ 
                      borderRadius: '12px', 
                      border: isExpanded ? '1px solid rgba(251,113,133,0.3)' : '1px solid var(--border-color)',
                      background: isExpanded ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.1)',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Header trigger */}
                    <div 
                      onClick={() => setExpandedCutIndex(isExpanded ? null : index)}
                      style={{ 
                        padding: '1rem 1.25rem', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ 
                          background: isExpanded ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.06)',
                          color: '#fff',
                          width: '26px',
                          height: '26px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          fontSize: '0.8rem',
                          fontWeight: 'bold'
                        }}>
                          {cut.cutIndex}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 650, fontSize: '0.9rem', color: '#fff' }}>Cut {cut.cutIndex} 설정</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {cut.subtitle ? cut.subtitle.slice(0, 30) + (cut.subtitle.length > 30 ? '...' : '') : '자막 비어 있음'}
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setActivePreviewCut(index); }}
                          className="btn"
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', background: activePreviewCut === index ? 'rgba(251,113,133,0.2)' : 'transparent', color: activePreviewCut === index ? '#fb7185' : 'var(--text-secondary)', border: activePreviewCut === index ? '1px solid #fb7185' : '1px solid transparent', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                        >
                          <Eye size={12} />
                          <span>미리보기 활성</span>
                        </button>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>

                    {/* Expandable panel body */}
                    {isExpanded && (
                      <div style={{ padding: '0 1.25rem 1.25rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem' }}>
                        
                        {/* Cut File Media Upload & Info */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem', marginBottom: '1.25rem' }}>
                          
                          {/* Left: media file pick */}
                          <div>
                            <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                              이미지 또는 짧은 영상 업로드
                            </span>
                            <div 
                              style={{ 
                                border: '1px dashed var(--border-color)', 
                                borderRadius: '8px', 
                                padding: '1rem', 
                                textAlign: 'center',
                                background: 'rgba(0,0,0,0.2)',
                                position: 'relative',
                                minHeight: '110px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center'
                              }}
                            >
                              {cut.previewUrl ? (
                                <div style={{ position: 'relative', width: '100%', height: '80px' }}>
                                  {cut.isVideo ? (
                                    <video src={cut.previewUrl} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} muted />
                                  ) : (
                                    <img src={cut.previewUrl} alt={`Cut ${cut.cutIndex}`} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} />
                                  )}
                                  <button
                                    onClick={() => {
                                      const newCuts = [...cuts];
                                      newCuts[index].uploadedBase64 = '';
                                      newCuts[index].previewUrl = '';
                                      newCuts[index].uploadedFileName = '';
                                      newCuts[index].image_path = '';
                                      newCuts[index].video_path = '';
                                      setCuts(newCuts);
                                    }}
                                    style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.7rem' }}
                                  >
                                    ×
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <ImageIcon size={22} color="var(--text-secondary)" style={{ marginBottom: '0.25rem' }} />
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>파일을 끌어다 놓거나 클릭</span>
                                </>
                              )}
                              <input 
                                type="file" 
                                accept="image/*,video/*"
                                onChange={(e) => handleCutFileChange(e, index)}
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                              />
                            </div>
                            {cut.uploadedFileName && (
                              <span style={{ display: 'block', fontSize: '0.7rem', color: '#38bdf8', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                업로드됨: {cut.uploadedFileName}
                              </span>
                            )}
                          </div>

                          {/* Right: Prompt and AI Gen trigger */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>AI 이미지 생성 프롬프트</label>
                              <button
                                type="button"
                                onClick={() => handleGenerateImage(index)}
                                disabled={loading}
                                className="btn"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.25rem 0.5rem', fontSize: '0.7rem', background: 'var(--accent-gradient)', color: '#fff', border: 'none', borderRadius: '4px' }}
                              >
                                {loading && loadingStep === `image-${index}` ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                                <span>AI 단일 생성</span>
                              </button>
                            </div>
                            <textarea 
                              value={cut.prompt}
                              onChange={(e) => {
                                const newCuts = [...cuts];
                                newCuts[index].prompt = e.target.value;
                                setCuts(newCuts);
                              }}
                              placeholder="AI로 이미지를 생성할 상세 프롬프트를 한글 또는 영어로 적어주세요..."
                              style={{ width: '100%', height: '70px', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.8rem', resize: 'none', outline: 'none' }}
                            />
                            {cut.image_path && (
                              <span style={{ display: 'block', fontSize: '0.7rem', color: '#10b981', marginTop: '0.25rem' }}>
                                AI 이미지 생성완료
                              </span>
                            )}
                          </div>

                        </div>

                        {/* Cut Description & Subtitle */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>자막/나레이션 문장</label>
                            <input 
                              type="text" 
                              value={cut.subtitle}
                              onChange={(e) => {
                                const newCuts = [...cuts];
                                newCuts[index].subtitle = e.target.value;
                                setCuts(newCuts);
                              }}
                              style={{ width: '100%', padding: '0.65rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>화면 연출 지시</label>
                            <input 
                              type="text" 
                              value={cut.description}
                              onChange={(e) => {
                                const newCuts = [...cuts];
                                newCuts[index].description = e.target.value;
                                setCuts(newCuts);
                              }}
                              style={{ width: '100%', padding: '0.65rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                            />
                          </div>
                        </div>

                        {/* Motion, Duration, Keyword */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '1rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>카메라 움직임</label>
                            <select 
                              value={cut.cameraMovement}
                              onChange={(e) => {
                                const newCuts = [...cuts];
                                newCuts[index].cameraMovement = e.target.value;
                                setCuts(newCuts);
                              }}
                              style={{ width: '100%', padding: '0.65rem', background: '#1c1917', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                            >
                              <option value="zoom in">줌인 (Zoom In)</option>
                              <option value="zoom out">줌아웃 (Zoom Out)</option>
                              <option value="panning">패닝 (Panning)</option>
                              <option value="shaking">흔들림 (Shaking)</option>
                              <option value="fixed">고정 (Fixed)</option>
                              <option value="slow motion">슬로우모션 (Slow Motion)</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>길이 (초)</label>
                            <input 
                              type="number" 
                              min="1"
                              max="20"
                              value={cut.duration}
                              onChange={(e) => {
                                const newCuts = [...cuts];
                                newCuts[index].duration = parseInt(e.target.value) || 4;
                                setCuts(newCuts);
                              }}
                              style={{ width: '100%', padding: '0.65rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>강조 키워드</label>
                            <input 
                              type="text" 
                              value={cut.keywords}
                              onChange={(e) => {
                                const newCuts = [...cuts];
                                newCuts[index].keywords = e.target.value;
                                setCuts(newCuts);
                              }}
                              style={{ width: '100%', padding: '0.65rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                            />
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Advanced Visual / Caption / BGM Settings */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Volume2 size={20} color="#fb7185" />
              <span>[3단계] 고품질 렌더링 & 스타일 고급 설정</span>
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              
              {/* Visual Styles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', margin: 0, color: '#fff' }}>화면 비주얼 스타일</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>영상 스타일 프리셋</label>
                    <select 
                      value={stylePreset} 
                      onChange={(e) => setStylePreset(e.target.value)}
                      style={{ width: '100%', padding: '0.65rem', background: '#1c1917', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                    >
                      {['감성 광고형', '영화 예고편형', '제품 홍보형', '자기계발 쇼츠형', '정보 전달형', '다크 시네마틱형', '미니멀 브랜드형'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>색감 프리셋</label>
                    <select 
                      value={colorPreset} 
                      onChange={(e) => setColorPreset(e.target.value)}
                      style={{ width: '100%', padding: '0.65rem', background: '#1c1917', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                    >
                      <option value="none">원본 (변형 없음)</option>
                      <option value="warm">따뜻한 필름톤</option>
                      <option value="cool">차가운 블루톤</option>
                      <option value="black">고급 블랙톤</option>
                      <option value="daylight">자연광 톤</option>
                      <option value="vintage">빈티지 톤</option>
                      <option value="vivid">선명한 SNS 톤</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>자막 스타일 프리셋</label>
                    <select 
                      value={captionStyle} 
                      onChange={(e) => setCaptionStyle(e.target.value)}
                      style={{ width: '100%', padding: '0.65rem', background: '#1c1917', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                    >
                      <option value="minimal">미니멀 (기본)</option>
                      <option value="hooking">강한 후킹형</option>
                      <option value="essay">감성 에세이형</option>
                      <option value="copy">광고 카피형</option>
                      <option value="news">뉴스형</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>자막 표시 위치</label>
                    <select 
                      value={captionPosition} 
                      onChange={(e) => setCaptionPosition(e.target.value)}
                      style={{ width: '100%', padding: '0.65rem', background: '#1c1917', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                    >
                      <option value="bottom">하단 (기본)</option>
                      <option value="center">중앙</option>
                      <option value="top">상단</option>
                    </select>
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>장면 전환 효과</label>
                    <select 
                      value={transitionEffect} 
                      onChange={(e) => setTransitionEffect(e.target.value)}
                      style={{ width: '100%', padding: '0.65rem', background: '#1c1917', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                    >
                      {['페이드', '줌 전환', '글리치', '슬라이드', '컷 전환', '시네마틱 블러'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Audio & Voices */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', margin: 0, color: '#fff' }}>사운드 & 나레이션 성우</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>AI 나레이션 성우 선택</label>
                    <select 
                      value={voice} 
                      onChange={(e) => setVoice(e.target.value)}
                      style={{ width: '100%', padding: '0.65rem', background: '#1c1917', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                    >
                      <option value="female">여성 성우 (선희 - 차분하고 신뢰성 높음)</option>
                      <option value="male">남성 성우 (인준 - 묵직하고 신뢰감 있는 정보 전달)</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>BGM 분위기 선택</label>
                      <select 
                        value={bgmStyle} 
                        disabled={bgmFileName !== ''}
                        onChange={(e) => setBgmStyle(e.target.value)}
                        style={{ width: '100%', padding: '0.65rem', background: bgmFileName ? 'rgba(255,255,255,0.02)' : '#1c1917', border: '1px solid var(--border-color)', borderRadius: '8px', color: bgmFileName ? 'var(--text-secondary)' : '#fff', fontSize: '0.85rem', outline: 'none' }}
                      >
                        {['감성 피아노', '시네마틱 앰비언트', '몽환적인 신스', '빠른 템포 광고 음악', '어두운 저음 중심', '밝은 브이로그'].map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>직접 BGM 업로드</label>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ width: '100%', padding: '0.65rem', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {bgmFileName ? bgmFileName : '오디오 선택'}
                        </button>
                        <input 
                          type="file" 
                          accept="audio/*" 
                          onChange={handleBgmFileChange}
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                        />
                      </div>
                      {bgmFileName && (
                        <button 
                          onClick={() => { setBgmFileName(''); setBgmBase64(''); }} 
                          style={{ border: 'none', background: 'transparent', color: '#ef4444', fontSize: '0.7rem', padding: '0.2rem 0', cursor: 'pointer' }}
                        >
                          업로드 취소
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      <span>BGM 볼륨량 (자동 볼륨 다킹 기본 적용)</span>
                      <span style={{ color: '#fb7185', fontWeight: 'bold' }}>{bgmVolume}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={bgmVolume} 
                      onChange={(e) => setBgmVolume(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: '#fb7185' }}
                    />
                  </div>

                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Right Column: Realtime preview & Compiling controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '2rem', height: 'fit-content' }}>
          
          {/* Mobile Preview Frame */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', margin: '0 0 1rem 0', color: '#fff', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Eye size={18} color="#fb7185" />
              <span>실시간 컷 자막/비주얼 미리보기</span>
            </h3>

            {/* Simulated Smartphone Screen */}
            <div 
              style={{ 
                width: '280px', 
                height: '497px', // 9:16 ratio
                border: '12px solid #1c1917',
                borderRadius: '36px',
                background: '#000000',
                position: 'relative',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {/* Dynamic cut background media */}
              {cuts[activePreviewCut]?.previewUrl ? (
                cuts[activePreviewCut].isVideo ? (
                  <video 
                    src={cuts[activePreviewCut].previewUrl} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    autoPlay 
                    loop 
                    muted 
                  />
                ) : (
                  <img 
                    src={cuts[activePreviewCut].previewUrl} 
                    alt="Preview" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                )
              ) : (
                <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1.5rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <ImageIcon size={32} color="rgba(255,255,255,0.15)" />
                  <span>Cut {activePreviewCut + 1} 미디어 없음</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>이미지를 업로드하거나 AI 이미지 생성을 클릭해 주세요.</span>
                </div>
              )}

              {/* Subtitle text overlay */}
              {cuts[activePreviewCut]?.subtitle && (
                <div style={getSubtitlePreviewStyles()}>
                  {cuts[activePreviewCut].subtitle}
                </div>
              )}

              {/* Overlay header info tag */}
              <div style={{ position: 'absolute', top: '15px', left: '15px', display: 'flex', gap: '0.4rem', zIndex: 11 }}>
                <span style={{ fontSize: '0.65rem', background: 'rgba(251,113,133,0.9)', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '20px', fontWeight: 'bold' }}>
                  CUT {activePreviewCut + 1}/4
                </span>
                <span style={{ fontSize: '0.65rem', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '20px' }}>
                  {cuts[activePreviewCut]?.duration}s
                </span>
              </div>
            </div>

            {/* Cut frame navigator selectors */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', width: '100%' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActivePreviewCut(i)}
                  className="btn"
                  style={{
                    flex: 1,
                    padding: '0.4rem',
                    fontSize: '0.75rem',
                    background: activePreviewCut === i ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '6px'
                  }}
                >
                  컷 {i + 1}
                </button>
              ))}
            </div>
            
            {/* Meta status panel */}
            <div style={{ width: '100%', marginTop: '1.25rem', padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <div><strong>⏱ 전체 예상 길이:</strong> <span style={{ color: '#fff' }}>{totalDuration}초</span></div>
              <div><strong>🎵 배경음악:</strong> <span style={{ color: '#fff' }}>{bgmFileName ? bgmFileName : bgmStyle}</span></div>
              <div><strong>🗣 성우 목소리:</strong> <span style={{ color: '#fff' }}>{voice === 'female' ? '여성 선희' : '남성 인준'}</span></div>
            </div>
          </div>

          {/* Action triggers box */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button 
              onClick={handleOneClickAutoGenerate}
              disabled={loading}
              className="btn"
              style={{ width: '100%', padding: '1rem', fontWeight: 800, fontSize: '0.95rem', background: 'linear-gradient(135deg, #a78bfa 0%, #fb7185 100%)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 0 20px rgba(251,113,133,0.3)', marginBottom: '0.25rem' }}
            >
              {loading && loadingStep.startsWith('one-click') ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>원클릭 제작 진행 중...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>⚡ 원클릭 초고속 쇼츠 제작</span>
                </>
              )}
            </button>

            <button 
              onClick={handleComplementScript}
              disabled={loading}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '0.8rem', fontWeight: 650, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            >
              {loading && loadingStep === 'script' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} color="#fb7185" />}
              <span>✨ 자막 & 연출 AI 자동 완성</span>
            </button>

            <button 
              onClick={handleGenerateAllImages}
              disabled={loading}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '0.8rem', fontWeight: 650, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            >
              {loading && loadingStep.startsWith('image-') ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} color="#38bdf8" />}
              <span>🎨 없는 이미지 AI 일괄 생성</span>
            </button>

            <button 
              onClick={handleRenderVideo}
              disabled={loading}
              className="btn"
              style={{ width: '100%', padding: '1rem', fontWeight: 700, fontSize: '0.95rem', background: 'var(--accent-gradient)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 0 20px rgba(251,113,133,0.3)' }}
            >
              {loading && loadingStep === 'video' ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>숏폼 비디오 합성 및 제작 중...</span>
                </>
              ) : (
                <>
                  <Film size={18} />
                  <span>🎬 최종 숏폼 영상 자동 합성</span>
                </>
              )}
            </button>

            {renderedVideoUrl && (
              <div style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', width: '100%' }}>
                <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>영상이 완성되었습니다!</span>
                <video src={renderedVideoUrl} controls style={{ width: '100%', borderRadius: '12px', background: '#000' }} />
                <a 
                  href={renderedVideoUrl} 
                  download={`4cut_cinema_shorts_${Date.now()}.mp4`}
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', textDecoration: 'none' }}
                >
                  <Download size={14} />
                  <span>mp4 파일 즉시 다운로드</span>
                </a>

                {/* YouTube Shorts upload integration */}
                <div style={{ width: '100%', marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fb7185', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    <Upload size={14} />
                    <span>원클릭 유튜브 쇼츠 업로드</span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'left', width: '100%' }}>유튜브 동영상 제목</label>
                    <input 
                      type="text" 
                      value={ytTitle}
                      onChange={(e) => setYtTitle(e.target.value)}
                      style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.8rem', width: '100%' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'left', width: '100%' }}>유튜브 설명 (Description)</label>
                    <textarea 
                      rows={3}
                      value={ytDesc}
                      onChange={(e) => setYtDesc(e.target.value)}
                      style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.8rem', resize: 'none', width: '100%' }}
                    />
                  </div>

                  {uploadSuccess && (
                    <div style={{ fontSize: '0.75rem', color: '#10b981', background: 'rgba(16,185,129,0.08)', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(16,185,129,0.2)', width: '100%' }}>
                      {uploadSuccess}
                    </div>
                  )}

                  {uploadError && (
                    <div style={{ fontSize: '0.75rem', color: '#ef4444', background: 'rgba(239,68,68,0.08)', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.2)', width: '100%' }}>
                      {uploadError}
                    </div>
                  )}

                  <button
                    onClick={handleYoutubeUpload}
                    disabled={uploading}
                    className="btn"
                    style={{ width: '100%', padding: '0.6rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: 'linear-gradient(135deg, #f87171 0%, #fb7185 100%)' }}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="animate-spin" size={14} />
                        <span>업로드 진행 중...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        <span>유튜브 쇼츠로 직접 업로드</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Projects List 불러오기 Modal */}
      {showLoadModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '500px', padding: '2rem', background: '#1c1917', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0, color: '#fff' }}>저장된 시네마틱 쇼츠 프로젝트</h3>
              <button 
                onClick={() => setShowLoadModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.5rem' }}>
              {projectsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  저장된 프로젝트가 없습니다.
                </div>
              ) : (
                projectsList.map(proj => (
                  <div 
                    key={proj.id}
                    onClick={() => handleLoadProject(proj.id)}
                    style={{ 
                      padding: '1rem', 
                      background: 'rgba(255,255,255,0.03)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '8px', 
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  >
                    <div>
                      <div style={{ fontWeight: 650, color: '#fff', fontSize: '0.95rem' }}>{proj.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        분위기: {proj.atmosphere} | 수정일: {new Date(proj.updatedAt).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => handleDeleteProject(e, proj.id)}
                      className="btn"
                      style={{ padding: '0.4rem', border: 'none', background: 'transparent', color: 'var(--text-secondary)' }}
                      title="프로젝트 삭제"
                    >
                      <Trash2 size={15} color="#ef4444" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button 
                onClick={() => setShowLoadModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Render Steps overlay during active rendering/loading */}
      {loading && (loadingStep === 'video' || loadingStep === 'script' || loadingStep === 'saving' || loadingStep.startsWith('one-click')) && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 101, gap: '1.25rem' }}>
          <Loader2 className="animate-spin" size={50} color="#fb7185" />
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: '#fff', fontSize: '1.2rem', margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>
              {loadingStep === 'video' ? '🎬 시네마틱 4컷 비디오 합성 중...' : 
               loadingStep === 'script' ? '✨ AI 대본/자막 생성 보완 중...' : 
               loadingStep === 'saving' ? '💾 프로젝트 안전 저장 중...' :
               loadingStep === 'one-click-script' ? '✨ 1단계: AI 자막 및 대본 보완 중...' :
               loadingStep.startsWith('one-click-image-') ? `🎨 2단계: AI 이미지 생성 중 (Cut ${parseInt(loadingStep.split('-')[3]) + 1}/4)...` :
               loadingStep === 'one-click-video' ? '🎬 3단계: 최종 시네마틱 숏폼 합성 중...' :
               '⚡ 원클릭 초고속 쇼츠 제작 진행 중...'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto', lineHeight: '1.6' }}>
              {loadingStep === 'video' ? 'TTS 음성을 합성하고 고품질 4컷 비디오 트랙과 BGM을 렌더링하고 있습니다. 잠시만 기다려주세요 (약 30초~1분 소요)...' : 
               loadingStep === 'script' ? 'Gemini AI 비주얼 디렉터가 최적의 문장과 연출을 창작 중입니다.' :
               loadingStep === 'saving' ? '작업 세션을 서버 안전 저장소에 기록 중입니다.' :
               loadingStep === 'one-click-script' ? 'Gemini AI 디렉터가 4개 컷의 서사와 목적에 알맞은 후킹 자막과 연출을 창작하고 있습니다.' :
               loadingStep.startsWith('one-click-image-') ? 'Sana AI 화가가 영상 연출 설명과 전체 분위기 맥락에 알맞은 고화질 세로형(9:16) 컷 이미지를 그리고 있습니다.' :
               loadingStep === 'one-click-video' ? '성우 목소리 TTS와 프리셋 BGM 오디오, 색감 보정 및 카메라 무빙 효과를 합성하여 MP4 비디오를 렌더링 중입니다. 약 30초~1분 소요됩니다.' :
               '잠시만 기다려 주세요...'}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
