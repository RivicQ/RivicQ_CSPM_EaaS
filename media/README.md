# Demo Media

This directory contains demo GIFs and videos showcasing CryptoBOM SaaS.

## 📹 Available Demos

### 30-Second CBOM Scan Demo
- **`demo-cbom-scan-30s.mp4`** - Quick 30-second demo of CBOM scanning activities
- Shows: Asset Discovery → Analysis → Compliance → Report Generation

### Additional Demos
- `demo-dashboard.gif` - Dashboard walkthrough
- `demo-quickstart.gif` - Quick start guide  
- `demo-compliance.gif` - Compliance scanning demo
- `demo-quantum.mp4` - Quantum integration demo (Enterprise)

## 🎬 Demo Content (30 seconds)

1. **0-5s**: Start scanner with `python examples/scan.py`
2. **5-12s**: Kubernetes cluster scan discovers TLS certificates, database encryption
3. **12-18s**: Algorithm analysis identifies RSA-4096 as quantum vulnerable
4. **18-24s**: NIST compliance scan shows 85% score
5. **24-30s**: CBOM report generated with recommendations

## 🎬 Creating Demos

### Using FFmpeg (30-second clip)
```bash
# Record 30-second screen capture
ffmpeg -f x11grab -t 30 -r 30 -s 1920x1080 -i :0.0 demo-cbom-scan-30s.mp4

# Or create optimized GIF
ffmpeg -i demo-cbom-scan-30s.mp4 -vf "fps=15,scale=800:-1" -t 30 demo-cbom-scan-30s.gif

# Compress for web
ffmpeg -i input.mp4 -c:v libx264 -crf 28 -preset fast demo-optimized.mp4
```

### Using OBS Studio
1. Install OBS Studio
2. Configure: Window Capture → Terminal/App
3. Set recording to 30 seconds
4. Start recording and run: `python examples/scan.py`
5. Save as `demo-cbom-scan-30s.mp4`

### Recommended Tools
- **OBS**: https://obsproject.com
- **LiceCAP**: https://licecap.en.softonic.com (GIF capture)
- **asciinema**: https://asciinema.org (terminal recording)

## 📤 Sharing Demos

Share demos via:
- GitHub Releases: https://github.com/RivicQ/RivicQ_CSPM_EaaS/releases
- Documentation: https://docs.rivicq.de
- YouTube: https://youtube.com/@rivicq

## 🔗 Links

- **Live Demo**: https://demo.rivicq.de
- **Documentation**: https://docs.rivicq.de
- **GitHub**: https://github.com/RivicQ/RivicQ_CSPM_EaaS

---

**© 2026 RivicQ GmbH. All Rights Reserved.**
*German Engineering Excellence in Quantum-Safe Cryptography*
