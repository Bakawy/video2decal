function mid(a, b, c) {
    return Math.max(a, Math.min(b, c))
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function convertGifToVideo(gif) {
    return new Promise((resolve, reject) => {

    showLoadProgress("Converting GIF to MP4");
    const fileReader = new FileReader();
    //const gifReader = new GifReader(gifData);

    fileReader.onload = function(e) {
        const buffer = e.target.result;
        const gifData = new Uint8Array(buffer);
        //console.log(gifData);

        const gifReader = new GifReader(gifData);
        //console.log(gifReader);
        //console.log(gifReader.frameInfo(0))
        const frameCount = gifReader.numFrames();
        const width = gifReader.width;
        const height = gifReader.height;
        let duration = 0;

        const frames = [];
        for (let i = 0; i < frameCount; i++) {
            const info = gifReader.frameInfo(i);

            const pixels = new Uint8ClampedArray(width * height * 4);
            gifReader.decodeAndBlitFrameRGBA(i, pixels);

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext('2d');
            canvas.width = width;
            canvas.height = height;
            const imageData = new ImageData(pixels, width, height)
            ctx.putImageData(imageData, 0, 0)

            //document.querySelector("header").appendChild(canvas);
            frames.push({
                canvas: canvas,
                delayMs: info.delay * 10,
            })
            duration += frames[frames.length-1].delayMs;
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;

        const stream = canvas.captureStream();
        const recorder = new MediaRecorder(stream, {
            mimeType: 'video/mp4;codecs=vp9'
        });

        const chunks = [];
        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/mp4' });
            //console.log(blob);
            hideLoadProgress();
            resolve(blob)
            //console.log(new File([blob], gif.name.slice(0, gif.name.length - 5) + ".webm", { type: blob.type }));
            //return new File([blob], gif.name, { type: blob.type });
            // from here you can createObjectURL(blob) or download it
        }; 

        playFramesWithDelays(frames, ctx, canvas, recorder, duration);
        //console.log(frames);
    }

    fileReader.readAsArrayBuffer(gif)

    });
}

async function playFramesWithDelays(frames, ctx, mainCanvas, recorder, duration) {
    recorder.start();

    let time = 0;
    let prevFrame = null;
    let prevImageData = null;

    for (const f of frames) {
        if (prevFrame) {
            switch (prevFrame.disposal) {
            case 2:
                ctx.clearRect(prevFrame.x, prevFrame.y, prevFrame.width, prevFrame.height);
                break;

            case 3:
                if (prevImageData) {
                ctx.putImageData(prevImageData, 0, 0);
                } else {
                // ctx.clearRect(prevFrame.x, prevFrame.y, prevFrame.width, prevFrame.height); clear or do nothing idk
                }
                break;
            }
        }
        if (f.disposal === 3) {
            prevImageData = ctx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
        }

        ctx.drawImage(f.canvas, f.x ?? 0, f.y ?? 0);

        await sleep(f.delayMs);
        time += f.delayMs; 
        setLoadProgress(time/duration);
        prevFrame = f;
    }


  recorder.stop();
}

function easeInOutQuad(t) {
        t /= 0.5;
        if (t < 1) return 0.5 * t * t;
        t--;
        return -0.5 * (t * (t - 2) - 1);
}

function getFrameRate(video) {
    return new Promise((resolve) => {
    //resolve(60);
    const readChunk = (chunkSize, offset) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target.error) {
            reject(event.target.error)
          }
          resolve(new Uint8Array(event.target.result))
        }
        reader.readAsArrayBuffer(video.slice(offset, offset + chunkSize))
      })

    mediaInfo
        .analyzeData(video.size, readChunk)
        .then((result) => {
            //console.log(result);
            //console.log(result.media.track[0].FrameRate);
            resolve(result.media.track[0].FrameRate);
        })
    });
}

function getVideoFrame(file, frame) {
    return new Promise((resolve) => {

    const videoElement = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    videoElement.src = URL.createObjectURL(file);

    videoElement.onloadedmetadata = function() {
        //console.log(`${frame} / ${videoFrameRate} + 0.5/${videoFrameRate} = ${frame/videoFrameRate + 0.5/videoFrameRate}`);
        videoElement.currentTime = Math.min(frame/videoFrameRate + 0.5/videoFrameRate, videoElement.duration);//Math.min(frame/videoFrameRate + 0.5/videoFrameRate, videoElement.duration);
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
    }

    videoElement.onseeked = function() {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        //document.body.appendChild(canvas);
        //console.log(canvas);
        URL.revokeObjectURL(videoElement.src);
        resolve(canvas.toDataURL("image/png"))
    }

    });
}

function calculateDifferenceScore(data1, data2) {
    const tolerence = 2;
    if (data1.length !== data2.length) {
        throw new Error('Image data sizes do not match.');
    }

    let totalDifference = 0;
    for (let i = 0; i < data1.length; i += 4) {
        const rDiff = Math.max(0, Math.abs(data1[i] - data2[i]) - tolerence);
        const gDiff = Math.max(0, Math.abs(data1[i + 1] - data2[i + 1]) - tolerence);
        const bDiff = Math.max(0, Math.abs(data1[i + 2] - data2[i + 2]) - tolerence);
        const aDiff = Math.max(0, Math.abs(data1[i + 3] - data2[i + 3]) - tolerence);
        totalDifference += rDiff + gDiff + bDiff + aDiff;
    }

    // Normalize by the total number of pixels
    const maxDifference = data1.length * 255;
    return totalDifference / maxDifference;
}

function differenceScoreWithin(data1, data2, threshold) {
    const tolerence = 2;
    if (data1.length !== data2.length) {
        throw new Error('Image data sizes do not match.');
    }
    let totalDifference = 0
    let maxDifference = data1.length * 255 * threshold
    for (let i = 0; i < data1.length; i += 4) {
        const rDiff = Math.max(0, Math.abs(data1[i] - data2[i]) - tolerence);
        const gDiff = Math.max(0, Math.abs(data1[i + 1] - data2[i + 1]) - tolerence);
        const bDiff = Math.max(0, Math.abs(data1[i + 2] - data2[i + 2]) - tolerence);
        const aDiff = Math.max(0, Math.abs(data1[i + 3] - data2[i + 3]) - tolerence);
        totalDifference += rDiff + gDiff + bDiff + aDiff;
        if (totalDifference > maxDifference) return false;
    }

    return true;
}

function validateNumberInput(e) {
  const input = e.target;
  //if (!(input instanceof HTMLInputElement) || input.type !== "number") return;

  let value = Number(input.value === "" ? NaN : input.value);

  if (!Number.isFinite(value)) {
    const ph = Number(input.placeholder);
    value = Number.isFinite(ph) ? ph : 0;
  }

  const min = Number.isFinite(input.minAsNumber) ? input.minAsNumber : -Infinity;
  const max = Number.isFinite(input.maxAsNumber) ? input.maxAsNumber : Infinity;

  value = Math.min(Math.max(value, min), max);
    if (input.step === "1") value = Math.round(value);

  input.value = String(value);
  input.placeholder = input.value;
}

function interpolate(a, b, t, easing) {
    return ease(t, easing) * (b - a) +  a;
}

function ease(num, func) {
    num = Math.min(Math.max(0, num), 1);
    const pi = Math.PI, c1 = 1.70158, c2 = c1 * 1.525, c3 = c1 + 1, c4 = (2 * pi) / 3, c5 = (2 * pi) / 4.5;

    switch (func) {
        case 0: // Linear
            return num;
        case 1: // Instant
            return 1;
        case 2: // EaseInQuad
            return num * num;
        case 3: // EaseOutQuad
            return 1 - (1 - num) * (1 - num);
        case 4: // EaseInOutQuad
            return num < 0.5 ? 2 * num * num : 1 - Math.pow(-2 * num + 2, 2) / 2;
        case 5: // EaseInCubic
            return num * num * num;
        case 6: // EaseOutCubic
            return 1 - Math.pow(1 - num, 3);
        case 7: // EaseInOutCubic
            return num < 0.5 ? 4 * num * num * num : 1 - Math.pow(-2 * num + 2, 3) / 2;
        case 8: // EaseInQuart
            return num * num * num * num;
        case 9: // EaseOutQuart
            return 1 - Math.pow(1 - num, 4);
        case 10: // EaseInOutQuart
            return num < 0.5 ? 8 * Math.pow(num, 4) : 1 - Math.pow(-2 * num + 2, 4) / 2;
        case 11: // EaseInQuint
            return num * num * num * num * num;
        case 12: // EaseOutQuint
            return 1 - Math.pow(1 - num, 5);
        case 13: // EaseInOutQuint
            return num < 0.5 ? 16 * Math.pow(num, 5) : 1 - Math.pow(-2 * num + 2, 5) / 2;
        case 14: // EaseInSine
            return 1 - Math.cos((num * pi) / 2);
        case 15: // EaseOutSine
            return Math.sin((num * pi) / 2);
        case 16: // EaseInOutSine
            return -(Math.cos(pi * num) - 1) / 2;
        case 17: // EaseInExpo
            return num === 0 ? 0 : Math.pow(2, 10 * num - 10);
        case 18: // EaseOutExpo
            return num === 1 ? 1 : 1 - Math.pow(2, -10 * num);
        case 19: // EaseInOutExpo
            if (num === 0) return 0;
            if (num === 1) return 1;
            return num < 0.5
                ? Math.pow(2, 20 * num - 10) / 2
                : (2 - Math.pow(2, -20 * num + 10)) / 2;
        case 20: // EaseInCirc
            return 1 - Math.sqrt(1 - num * num);
        case 21: // EaseOutCirc
            return Math.sqrt(1 - Math.pow(num - 1, 2));
        case 22: // EaseInOutCirc
            return num < 0.5
                ? (1 - Math.sqrt(1 - Math.pow(2 * num, 2))) / 2
                : (Math.sqrt(1 - Math.pow(-2 * num + 2, 2)) + 1) / 2;
        case 23: // EaseInBounce
            return 1 - ease(1 - num, 24);
        case 24: // EaseOutBounce
            if (num < 1 / 2.75) {
                return 7.5625 * num * num;
            } else if (num < 2 / 2.75) {
                return 7.5625 * (num -= 1.5 / 2.75) * num + 0.75;
            } else if (num < 2.5 / 2.75) {
                return 7.5625 * (num -= 2.25 / 2.75) * num + 0.9375;
            } else {
                return 7.5625 * (num -= 2.625 / 2.75) * num + 0.984375;
            }
        case 25: // EaseInOutBounce
            return num < 0.5
                ? (1 - ease(1 - 2 * num, 24)) / 2   // use EaseOutBounce
                : (1 + ease(2 * num - 1, 24)) / 2;  // use EaseOutBounce
        case 26: // EaseInBack
            return c3 * num * num * num - c1 * num * num;
        case 27: // EaseOutBack
            return 1 + c3 * Math.pow(num - 1, 3) + c1 * Math.pow(num - 1, 2);
        case 28: // EaseInOutBack
            return num < 0.5
                ? (Math.pow(2 * num, 2) * ((c2 + 1) * 2 * num - c2)) / 2
                : (Math.pow(2 * num - 2, 2) * ((c2 + 1) * (num * 2 - 2) + c2) + 2) / 2;
        case 29: // EaseInElastic
            if (num === 0) return 0;
            if (num === 1) return 1;
            return -Math.pow(2, 10 * num - 10) * Math.sin((num * 10 - 10.75) * c4);
        case 30: // EaseOutElastic
            if (num === 0) return 0;
            if (num === 1) return 1;
            return Math.pow(2, -10 * num) * Math.sin((num * 10 - 0.75) * c4) + 1;
        case 31: // EaseInOutElastic
            if (num === 0) return 0;
            if (num === 1) return 1;
            if (num < 0.5) {
                return -0.5 * Math.pow(2, 20 * num - 10) * Math.sin((20 * num - 11.125) * c5);
            } else {
                return Math.pow(2, -20 * num + 10) * Math.sin((20 * num - 11.125) * c5) * 0.5 + 1;
            }
        case 32: // Spring
            return Math.sin(num * pi * (0.2 + 2.5 * num * num * num)) * Math.pow(1 - num, 2.2) + num;
        case 33: // EaseOutInQuad
            return num < 0.5
                ? ease(num * 2, 3) / 2
                : 0.5 + ease((num - 0.5) * 2, 2) / 2;
        case 34: // EaseOutInCubic
            return num < 0.5
                ? ease(num * 2, 6) / 2
                : 0.5 + ease((num - 0.5) * 2, 5) / 2;
        case 35: // EaseOutInQuart
            return num < 0.5
                ? ease(num * 2, 9) / 2
                : 0.5 + ease((num - 0.5) * 2, 8) / 2;
        case 36: // EaseOutInQuint
            return num < 0.5
                ? ease(num * 2, 12) / 2
                : 0.5 + ease((num - 0.5) * 2, 11) / 2;
        case 37: // EaseOutInSine
            return num < 0.5
                ? ease(num * 2, 15) / 2
                : 0.5 + ease((num - 0.5) * 2, 14) / 2;
        case 38: // EaseOutInExpo
            return num < 0.5
                ? ease(num * 2, 18) / 2
                : 0.5 + ease((num - 0.5) * 2, 17) / 2;
        case 39: // EaseOutInCirc
            return num < 0.5
                ? ease(num * 2, 21) / 2
                : 0.5 + ease((num - 0.5) * 2, 20) / 2;
        case 40: // EaseOutInBounce
            return num < 0.5
                ? ease(num * 2, 24) / 2
                : 0.5 + ease((num - 0.5) * 2, 23) / 2;
        case 41: // EaseOutInBack
            return num < 0.5
                ? ease(num * 2, 27) / 2
                : 0.5 + ease((num - 0.5) * 2, 26) / 2;
        case 42: // EaseOutInElastic
            return num < 0.5
                ? ease(num * 2, 30) / 2
                : 0.5 + ease((num - 0.5) * 2, 29) / 2;
        default:
            return num;
    }
}

function hexToRGBA(hex) {
    hex = hex.replace(/[^0-9a-f]/gi, "");
    hex = (hex + "FFFFFFFF").slice(0, 8);

    if (hex.length !== 8) {
        throw new Error("Expected RRGGBBAA");
    }

    return [
        parseInt(hex.slice(0, 2), 16), // R
        parseInt(hex.slice(2, 4), 16), // G
        parseInt(hex.slice(4, 6), 16), // B
        parseInt(hex.slice(6, 8), 16), // A
    ];
}