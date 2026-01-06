// Requires JSZip loaded in your environment (e.g., via <script> or bundler)
// This is "basic JS" meant to show the flow: read zip from <input type="file">,
// open it, add/remove files, then generate a new zip and trigger download.

async function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error);
    r.onload = () => resolve(r.result);
    r.readAsArrayBuffer(file);
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  // You can append to DOM for Safari compatibility
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Example: wire this to your <input type="file" id="zipInput" accept=".zip" />
const zipInput = document.getElementById("zipInput");

// Keep a reference to the currently loaded zip (optional)
let currentZip = null;

zipInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // 1) Read selected .zip file
  const buf = await readFileAsArrayBuffer(file);

  // 2) Load/open zip
  const zip = await JSZip.loadAsync(buf);
  currentZip = zip;

  // --- Inspect entries (optional) ---
  // zip.forEach((relativePath, entry) => console.log(relativePath, entry.dir ? "[dir]" : "[file]"));

  // 3) Add files/folders
  // Add a text file
  zip.file("added/hello.txt", "Hello from JSZip!\n");

  // Add JSON (stringify yourself)
  zip.file("added/data.json", JSON.stringify({ when: new Date().toISOString() }, null, 2));

  // Add a Blob (e.g., pretend we made a file in the browser)
  const notesBlob = new Blob(["Some notes...\n"], { type: "text/plain" });
  zip.file("added/notes.txt", notesBlob);

  // Add a folder explicitly (optional; JSZip creates folders implicitly by path)
  zip.folder("assets/");

  // 4) Remove files/folders
  // Remove a single file (must match path inside zip)
  zip.remove("old/unused.txt");

  // Remove an entire folder (everything under that path)
  zip.remove("tmp/");

  // 5) Read an existing file from the zip (optional)
  // const readmeText = await zip.file("README.md")?.async("string");
  // console.log("README:", readmeText);

  // 6) Generate new zip and download
  const outBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }, // 1 (fast) .. 9 (best)
  });

  const outName = file.name.replace(/\.zip$/i, "") + "-modified.zip";
  downloadBlob(outBlob, outName);

  // Optional: reset input so selecting same file again triggers change
  e.target.value = "";
});

// Optional helpers if you want to manipulate currentZip from elsewhere:

async function addTextFile(path, contents) {
  if (!currentZip) throw new Error("No zip loaded yet.");
  currentZip.file(path, contents);
}

function removePath(path) {
  if (!currentZip) throw new Error("No zip loaded yet.");
  currentZip.remove(path);
}

async function downloadCurrentZip(filename = "download.zip") {
  if (!currentZip) throw new Error("No zip loaded yet.");
  const blob = await currentZip.generateAsync({ type: "blob", compression: "DEFLATE" });
  downloadBlob(blob, filename);
}
