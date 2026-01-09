let frameData, decalOrder, zip, originalFileName, outputURL;

async function convertVideoToDecal(videoBlob, frameRate, isPNG, jpgQuality, differenceThreshold, checkCount, width, height) {
    showLoadProgress("Grabbing video frames");
    const frames = await getVideoFrames(videoBlob, frameRate);
    console.log(frames);
    //const frameCount = frames.length;

    setLoadProgress(0, true);
    setLoaderText("Removing duplicate frames");
    const {keptIndicies, frameOrder} = await filterReusedFrames(frames, differenceThreshold, checkCount);
    console.log(frameOrder);
    console.log(keptIndicies);

    setLoadProgress(0, true);
    setLoaderText("Saving images");
    await getVideoImages(frames, keptIndicies, videoBlob, isPNG, jpgQuality, width, height);

    setLoadProgress(0, true);
    setLoaderText("Calculating frame lengths");
    await calculateFrameLengths(frameOrder);

    hideLoadProgress();

    frameData = frames;
    decalOrder = frameOrder;
}

async function loadRiq(file, frameRate) {
    showLoadProgress("Opening RIQ");
    const buffer = await new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.readAsArrayBuffer(file);
    });
    originalFileName = file.name

    zip = await JSZip.loadAsync(buffer);
    console.log(zip);

    setLoadProgress(0, true);
    setLoaderText("Adding images");
    addSprites(isPNG)

    setLoadProgress(0, true);
    setLoaderText("Charting");
    await addEntities(frameRate, isPNG);

    setLoadProgress(0, true);
    setLoaderText("Preparing download");
    const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
    });
    const filename = `${originalFileName.substring(0, originalFileName.length - 4)}_modified.riq`;

    if (outputURL) {URL.revokeObjectURL(outputURL);}
    outputURL = URL.createObjectURL(zipBlob);

    riqOutput.href = outputURL;
    riqOutput.download = filename;

    hideLoadProgress();
}

async function getVideoFrames(videoBlob, frameRate) {
    const frames = new Map();
    const videoElement = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", {willReadFrequently: true});
    ctx.imageSmoothingEnabled = false;
    videoElement.src = URL.createObjectURL(videoBlob);

    await waitForEvent(videoElement, "loadedmetadata");

    const duration = videoElement.duration;
    const dt = 1/frameRate;
    const w = 64;
    const h = 64;
    let index = 0;
    canvas.width = w;
    canvas.height =  h;

    for (let time = dt/2; time < duration; time += dt) {
        await seekTo(videoElement, time);

        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(videoElement, 0, 0, w, h);
        
        frames.set(index, {
            index: index,
            time: time,
            data: ctx.getImageData(0, 0, w, h).data,
        });
        index++;
        setLoadProgress(time/duration);
    }
    URL.revokeObjectURL(videoElement.src)
    return frames
}

function filterReusedFrames(frames, differenceThreshold, checkCount) {
    const indicies = [...frames.keys()].sort((a, b) => a - b);
    const frameOrder = [indicies[0]];
    const keptIndicies = [indicies[0]];
    for (let i = 1; i < indicies.length; i++) {
        const index = indicies[i];
        const curi = frames.get(index);
        let reused = false;
        //console.log(`starting from ${Math.max(0, keep.length - checkCount)}`);
        for (let j = Math.max(0, keptIndicies.length - checkCount); j < keptIndicies.length; j++) {
            const jndex = keptIndicies[j];
            const curj = frames.get(jndex);
            if (differenceScoreWithin(curi.data, curj.data, differenceThreshold)) {
                //console.log(`frame ${index} is the same as frame ${jndex}`);
                reused = true;
                frameOrder.push(jndex);
                break;
            }
        }
        if (!reused) {
            keptIndicies.push(index);
            frameOrder.push(index);
        }
        setLoadProgress(i / indicies.length);
    }
    return {keptIndicies, frameOrder};
}

async function getVideoImages(frames, keptIndicies, videoBlob, isPNG, jpgQuality, width, height) {
    const videoElement = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", {willReadFrequently: true});
    const fileType = isPNG ? "image/png" : "image/jpeg";
    videoElement.src = URL.createObjectURL(videoBlob);

    await waitForEvent(videoElement, "loadedmetadata");

    const w = width;
    const h = height;
    canvas.width = w;
    canvas.height =  h;

    let n = 0;
    for (const index of keptIndicies) {
        const frame = frames.get(index);
        await seekTo(videoElement, frame.time)

        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(videoElement, 0, 0, w, h);

        frame.image = canvas.toDataURL(fileType, isPNG ? 1 : jpgQuality)

        n++;
        setLoadProgress(n / keptIndicies.length);
    }

    URL.revokeObjectURL(videoElement.src)
}

function calculateFrameLengths(frameOrder) {
    const final = [{index: 0, length: 1}];
    for (let i = 1; i < frameOrder.length; i++) {
        if (frameOrder[i] == frameOrder[i - 1]) {
            final[final.length - 1].length++;
        } else {
            final.push({index: frameOrder[i], length: 1});
        }
        setLoadProgress(i / frameOrder.length);
    }
    frameOrder.length = 0;
    frameOrder.push(...final);
}

function waitForEvent(target, name) {
  return new Promise((resolve, reject) => {
    const onError = () => cleanup(() => reject(target.error || new Error("video error")));
    const onEvt = () => cleanup(resolve);
    const cleanup = (done) => {
      target.removeEventListener(name, onEvt);
      target.removeEventListener("error", onError);
      done();
    };
    target.addEventListener(name, onEvt, { once: true });
    target.addEventListener("error", onError, { once: true });
  });
}

function addSprites(isPNG) {
    let maxId = 0;
    let frameCount = 0;
    for (const [id, frame] of frameData) {
        if (!frame.image) continue;
        frameCount++;
        if (id > maxId) maxId = id;
    }
    const digits = String(maxId).length

    let i = 0;
    for (const [id, frame] of frameData) {
        const image = frame.image;
        if (!image) continue;

        frame.path = `Resources/Sprites/${fileNameInput.value}_${String(id).padStart(digits, "0")}${isPNG ? ".png" : ".jpeg"}`;
        const base64 = image.substring(image.indexOf('base64,') + 'base64,'.length);
        zip.file(frame.path, base64, {base64: true});
        i++;
        setLoadProgress(i/frameCount);
    }
}

/*
{
    "type":"riq__Entity",
    "version":1,
    "datamodel":"vfx/display decal",
    "beat":0.0,
    "length":1.0,
    "dynamicData":{
        "track":1.0,
        "sprite":"filename",
        "filter":1,
        "ease":0,
        "layer":0,
        "displayLayer":1,
        "sticky":false,
        "sX":0.0,
        "sY":0.0,
        "sZ":0.0,
        "sWidth":1.0,
        "sHeight":1.0,
        "sRot":0.0,
        "sColor":{
            "r":1.0,
            "g":1.0,
            "b":1.0,
            "a":1.0
        },
        "eX":0.0,
        "eY":0.0,
        "eZ":0.0,
        "eWidth":1.0,
        "eHeight":1.0,
        "eRot":0.0,
        "eColor":{
            "r":1.0,
            "g":1.0,
            "b":1.0,
            "a":1.0
        }
    }
}
*/
async function addEntities(frameRate, isPNG) {
    const jsonStringBOM = await zip.files["remix.json"].async("string");
    const jsonString = jsonStringBOM.replace(/^\uFEFF/, '');
    const remix = JSON.parse(jsonString);

    console.log(remix);
    let currentBeat = parseFloat(beatInput.value);
    let bpm = getTempo(currentBeat, remix);
    let bpf = bpm / (frameRate * 60); //beats per frame
    let isOverride = overrideLength.checked;

    if (isOverride) {
        let frames = 0;
        for (decal of decalOrder) {
            const length = decal.length;
            frames += length;
        }

        const beats = parseFloat(lengthInput.value);

        bpf = beats/frames;
    }

    let i = 0;
    for (const decal of decalOrder) {
        const index = decal.index;
        const length = decal.length;
        const frame = frameData.get(index);

        let framesLeft = length 

        //tempo adjustment
        if (!isOverride) {
            tempoChanges = remix["tempoChanges"];
            for (const tc of tempoChanges) {
                const tcBeat = tc["beat"];
                if (tcBeat <= currentBeat) continue;

                const beatsToTc = tcBeat - currentBeat;
                const framesToTc = beatsToTc / bpf;

                if (framesToTc > framesLeft) break;

                const tcBpm = tc["dynamicData"]["tempo"];

                addEntity(currentBeat, beatsToTc, remix, frame);
                framesLeft -= framesToTc;
                currentBeat = tcBeat;

                bpm = tcBpm;
                bpf = bpm / (frameRate * 60); //beats per frame
            }
        }

        const remainingBeats = framesLeft * bpf;

        addEntity(currentBeat, remainingBeats, remix, frame)

        currentBeat += remainingBeats;

        i++;
        setLoadProgress(i/decalOrder.length)
    }

    const endString = JSON.stringify(remix);
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const jsonBytes = new TextEncoder().encode(endString);

    const data = new Uint8Array(bom.length + jsonBytes.length);
    data.set(bom, 0);
    data.set(jsonBytes, bom.length);

    zip.file("remix.json", data, {binary: true});
}

function addEntity(beat, length, remix, frame) {
    const entity = {
        "type": "riq__Entity",
        "version": 1,
        "datamodel": "vfx/display decal",
        "beat": beat,
        "length": length,
        "dynamicData": {
            "track": parseInt(trackInput.value) - 1,
            "sprite": frame.path.substring("Resources/Sprites/".length, frame.path.length - (isPNG ? ".png" : ".jpeg").length),
            "filter": 1,
            "ease": 0,
            "layer": 0,
            "displayLayer": 1,
            "sticky": false,
            "sX": 0.0,
            "sY": 0.0,
            "sZ": 0.0,
            "sWidth": 1.0,
            "sHeight": 1.0,
            "sRot": 0.0,
            "sColor": {
                "r": 1.0,
                "g": 1.0,
                "b": 1.0,
                "a": 1.0
            },
            "eX": 0.0,
            "eY": 0.0,
            "eZ": 0.0,
            "eWidth": 1.0,
            "eHeight": 1.0,
            "eRot": 0.0,
            "eColor": {
                "r": 1.0,
                "g": 1.0,
                "b": 1.0,
                "a": 1.0
            }
        }
    };

    remix["entities"].push(entity);
}

function getTempo(beat, remix) {
    const tempoChanges = remix["tempoChanges"];

    let tempo = remix["tempoChanges"][0]["dynamicData"]["tempo"];
    let changeBeat = 0;
    for (tc of tempoChanges) {
        if (tc["beat"] > beat) break;
        tempo = tc["dynamicData"]["tempo"];
        changeBeat = tc["beat"];
    }

    return tempo;
}

async function seekTo(video, t) {
  const target = Math.min(t, video.duration || t);
  if (Math.abs(video.currentTime - target) < 1e-4) return;
  video.currentTime = target;
  await waitForEvent(video, "seeked");
}
