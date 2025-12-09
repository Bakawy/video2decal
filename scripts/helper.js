function mid(a, b, c) {
    return Math.max(a, Math.min(b, c))
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function convertGifToVideo(gif) {
    return new Promise((resolve, reject) => {

    showLoadProgress();
    const fileReader = new FileReader();
    //const gifReader = new GifReader(gifData);

    fileReader.onload = function(e) {
        const buffer = e.target.result;
        const gifData = new Uint8Array(buffer);
        //console.log(gifData);

        const gifReader = new GifReader(gifData);
        console.log(gifReader);
        console.log(gifReader.frameInfo(0))
        const frameCount = gifReader.numFrames();
        const width = gifReader.width;
        const height = gifReader.height;
        let duration = 0;

        const frames = [];
        for (i = 0; i < frameCount; i++) {
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
            mimeType: 'video/webm;codecs=vp9'
        });

        const chunks = [];
        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            console.log(blob);
            hideLoadProgress();
            resolve(blob)
            //console.log(new File([blob], gif.name.slice(0, gif.name.length - 5) + ".webm", { type: blob.type }));
            //return new File([blob], gif.name, { type: blob.type });
            // from here you can createObjectURL(blob) or download it
        }; 

        playFramesWithDelays(frames, ctx, canvas, recorder, duration);
        console.log(frames);
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