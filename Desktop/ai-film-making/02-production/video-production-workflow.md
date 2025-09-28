# VIDEO PRODUCTION WORKFLOW
## Runway ML & Luma Dream Machine Integration

---

## PRODUCTION OVERVIEW

### Workflow Pipeline:
1. **Runway ML** - Primary video generation, VFX, upscaling
2. **Luma Dream Machine** - High-fidelity scene generation and complex camera movements
3. **Integration Strategy** - Combine both tools for optimal results

### Technical Specifications:
- **Resolution:** 4K (3840x2160) final output
- **Frame Rate:** 24fps (cinematic standard)
- **Aspect Ratio:** 16:9 (2.39:1 for cinematic bars in post)
- **Duration per clip:** 5-15 seconds (typical AI generation limits)
- **Total clips needed:** ~30-40 clips for 4:30 film

---

## RUNWAY ML PRODUCTION PLAN

### Tool Selection by Shot Type:

#### Text-to-Video Generation
**Use for:** Establishing shots, atmospheric scenes, symbolic imagery

**Example Prompts:**
```
Shot 1 - Apartment Establishing:
"Cozy artist apartment interior, golden sunlight streaming through windows, art supplies scattered, paintbrushes and canvases everywhere, warm lighting, cinematic shot, 24fps"

Shot 7 - Tech Facility Exterior:
"Modern futuristic medical building exterior, sleek glass architecture, cool blue lighting, imposing structure, wide establishing shot, sci-fi aesthetic, professional cinematography"

Shot 11 - Night Apartment:
"Same artist apartment at night, warm interior lighting, cozy atmosphere, intimate mood, soft golden lights, evening ambiance, cinematic interior shot"
```

#### Image-to-Video Animation
**Use for:** Character shots, detailed scenes, specific compositions

**Process:**
1. Import OpenArt-generated character and location concepts
2. Add camera movements and life to still images
3. Control timing and pacing precisely

**Example Applications:**
```
Shot 2 - Elena Painting:
- Import: Close-up of Elena's hands painting
- Animation: Subtle brush movement, paint application
- Camera: Slight push-in, shallow focus shift
- Duration: 8 seconds

Shot 9 - Dr. Chen Presentation:
- Import: Dr. Chen with holographic display
- Animation: Hologram rotation, gesturing
- Camera: Subtle pan and tilt
- Duration: 12 seconds
```

#### Video-to-Video Transformation
**Use for:** Style transfer, atmosphere enhancement, color grading

**Applications:**
- Convert rough video to cinematic style
- Enhance lighting and color temperature
- Add weather effects (rain for storm scene)
- Smooth out AI-generated artifacts

### Runway ML Shot List:

#### SEQUENCE 1: Artist's World (Shots 1-4)
1. **Shot 1** - Text-to-video: Apartment establishing shot
2. **Shot 2** - Image-to-video: Elena's hands painting (OpenArt import)
3. **Shot 3** - Image-to-video: Elena at easel (OpenArt import)
4. **Shot 4** - Text-to-video: Maria entering with tablet

#### SEQUENCE 2: Technology Dilemma (Shots 5-10)
5. **Shot 5** - Image-to-video: Mother-daughter conversation
6. **Shot 6** - Image-to-video: Elena's reaction close-up
7. **Shot 7** - Text-to-video: Tech facility exterior
8. **Shot 8** - Text-to-video: Sterile consultation room
9. **Shot 9** - Image-to-video: Dr. Chen with holograms
10. **Shot 10** - Image-to-video: Elena skeptical

---

## LUMA DREAM MACHINE PRODUCTION PLAN

### Optimal Use Cases for Luma:
- **Complex camera movements** (dolly, crane, orbiting shots)
- **High-fidelity character performances** with emotion
- **Seamless scene transitions**
- **Dynamic lighting changes**
- **Atmospheric effects** (particles, smoke, weather)

### Luma Dream Machine Shot List:

#### SEQUENCE 3: Night Reflection (Shots 11-15)
11. **Shot 11** - Complex dolly shot through apartment at night
12. **Shot 12** - Intimate bedroom scene with subtle character movement
13. **Shot 13** - Extreme macro of phone interaction
14. **Shot 14** - Close-up performance capture of Elena speaking
15. **Shot 15** - Lightning effect with character reaction

#### SEQUENCE 4: Resolution (Shots 16-24)
16. **Shot 16** - Slow push-in on empty wheelchair
17. **Shot 17** - Following Maria as she searches (tracking shot)
18. **Shot 18** - Complex reveal shot: interior to balcony
19. **Shot 19** - Extreme close-up painting detail with movement
20. **Shot 20** - Character performance: Elena peaceful painting
21. **Shot 21** - Emotional two-shot with natural movement
22. **Shot 22** - Intimate embrace with gentle camera movement
23. **Shot 23** - Final brush stroke with shallow focus shift
24. **Shot 24** - Wide final shot with golden hour atmosphere

### Luma Prompt Engineering:

#### Character Performance Prompts:
```
"Elderly Hispanic woman with silver hair, gentle expression, painting on balcony in golden morning light, peaceful and serene, subtle natural movements, cinematic lighting, 4K quality"

"Middle-aged professional woman searching frantically through apartment, concerned expression, natural lighting, realistic movement, emotional performance, handheld camera feel"

"Wise elderly woman recording voice message on phone, intimate close-up, blue screen glow on face, emotional expression, subtle trembling hands, dramatic lighting"
```

#### Camera Movement Prompts:
```
"Slow dolly shot through cozy artist apartment at night, warm interior lighting, smooth camera movement, revealing living space, intimate atmosphere"

"Crane shot revealing elderly woman painting on balcony, starting close and pulling back wide, golden hour lighting, smooth cinematic movement"

"Push-in close-up on empty wheelchair in morning sunlight, emotional reveal, dramatic lighting, shallow depth of field"
```

---

## PRODUCTION SCHEDULE

### Phase 1: Asset Preparation (Days 1-2)
- Import all OpenArt concept images
- Organize by sequence and shot number
- Prepare text prompts for each generation
- Set up project folders and naming conventions

### Phase 2: Primary Generation (Days 3-5)
- Generate Runway ML shots (simpler, faster generations)
- Generate Luma shots (complex, longer processing)
- Review and iterate on key emotional moments
- Create backup variations for important shots

### Phase 3: Quality Control & Enhancement (Days 6-7)
- Review all generated clips
- Use Runway's video-to-video for enhancement
- Color correction and consistency checks
- Generate additional coverage if needed

---

## TECHNICAL SPECIFICATIONS

### Runway ML Settings:
- **Resolution:** 1280x768 (upscale in post)
- **Duration:** 4-16 seconds per generation
- **Motion:** 1-10 (conservative for realistic movement)
- **Seed:** Document for consistency
- **Creativity:** 3-7 (balanced realism)

### Luma Dream Machine Settings:
- **Resolution:** 1080p (native output)
- **Duration:** 5 seconds (standard)
- **Camera Control:** Enabled for complex movements
- **Character Consistency:** Use reference images
- **Lighting:** Match time of day and mood

### File Management:
```
02-production/
├── runway-clips/
│   ├── seq1-shot01-apartment-establishing.mp4
│   ├── seq1-shot02-hands-painting.mp4
│   └── ...
├── luma-clips/
│   ├── seq3-shot14-elena-recording.mp4
│   ├── seq4-shot18-balcony-reveal.mp4
│   └── ...
├── references/
│   ├── openart-imports/
│   └── style-references/
└── iterations/
    ├── v1/
    ├── v2/
    └── final/
```

---

## QUALITY ASSURANCE CHECKLIST

### Visual Consistency:
- [ ] Character appearance matches across shots
- [ ] Lighting continuity maintained
- [ ] Color temperature progression (warm→cool→warm→golden)
- [ ] Set/location consistency
- [ ] Props and costumes match

### Technical Quality:
- [ ] Resolution meets 4K upscaling requirements
- [ ] Frame rate consistent at 24fps
- [ ] No visible AI artifacts or glitches
- [ ] Smooth camera movements
- [ ] Clean audio sync points (if applicable)

### Narrative Flow:
- [ ] Shot sequence matches storyboard
- [ ] Emotional beats properly emphasized
- [ ] Pacing allows for dialogue and voiceover
- [ ] Visual metaphors clearly communicated
- [ ] Character arcs visually supported

---

## BACKUP & CONTINGENCY PLANS

### Alternative Generations:
- Generate 2-3 versions of key emotional shots
- Create simpler backup versions for problematic clips
- Document settings that produce best results
- Keep reference images for re-generation if needed

### Common Issues & Solutions:

#### Character Inconsistency:
- **Problem:** Different actors/appearances
- **Solution:** Use consistent reference images, seed numbers
- **Backup:** Use video-to-video transformation for consistency

#### Unrealistic Movement:
- **Problem:** AI-generated motion looks artificial
- **Solution:** Lower motion settings, use shorter clips
- **Backup:** Static shots with subtle camera movement

#### Lighting Mismatches:
- **Problem:** Inconsistent lighting between shots
- **Solution:** Color correction in post-production
- **Backup:** Re-generate with specific lighting prompts

#### Technical Limitations:
- **Problem:** Cannot achieve desired shot
- **Solution:** Break into multiple clips, composite in post
- **Backup:** Modify storyboard to match AI capabilities

---

## POST-GENERATION WORKFLOW

### Immediate Steps:
1. Download and backup all clips
2. Organize by sequence and shot number
3. Create proxy files for editing
4. Log any issues or needed re-generations

### Quality Enhancement:
1. **Topaz Video AI** upscaling (covered in post-production)
2. **Color grading** for consistency
3. **Stabilization** if needed
4. **Noise reduction** for clean output

### Integration Preparation:
1. Create edit-ready proxies
2. Generate audio sync markers
3. Prepare for Descript import
4. Document clip metadata and timecodes

This production workflow ensures systematic creation of high-quality video content using both Runway ML and Luma Dream Machine, maximizing the strengths of each platform while maintaining consistency and professional results.