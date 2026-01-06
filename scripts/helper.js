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
        videoElement.currentTime = Math.min(frame/videoFrameRate + 0.5/videoFrameRate, videoElement.duration);
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