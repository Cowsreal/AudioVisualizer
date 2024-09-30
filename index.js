let audioFile;
let audioContext;
const bufferSize = 2048;
let currentFFT = [];


document.getElementById('audioForm').addEventListener('submit', function(event)
{
    event.preventDefault();
    audioFile = document.getElementById('audioUpload').files[0];

    if (audioFile) {
        processAudioFile();
    }
});

// FFT, Danielson Lanczos
function fft(x) 
{
    const N = x.length;
    let ans = new Array(N);

    //Base Case
    if(N <= 1)
    {
        return x;
    }
    const even = fft(x.filter((_, i) => i % 2 === 0));
    const odd = fft(x.filter((_, i) => i % 2 === 1));

    for(let k = 0; k < N / 2; k++)
    {
        const angle = (-2 * Math.PI * k) / N;
        const W = math.complex(Math.cos(angle), Math.sin(angle));
        
        ans[k] = math.multiply(W, odd[k]);
        ans[k] = math.add(even[k], ans[k]);
        ans[k + N / 2] = math.multiply(W, odd[k]);
        ans[k + N / 2] = math.subtract(even[k], ans[k + N / 2]);
    }
    return ans;
}

function processAudioFile()
{
    if(!audioFile)
    {
        return;
    }

    audioContext = new AudioContext();
    const reader = new FileReader();

    reader.onload = function(event)
    {
        const arrayBuffer = event.target.result
        audioContext.decodeAudioData(arrayBuffer, function(buffer)
        {
            processAudioData(buffer);
        }, function(e)
        {
            console.log("Did not retrieve file succesfully.");
        });
    }
    reader.readAsArrayBuffer(audioFile);
}

function processAudioData(buffer)
{

    var sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = buffer;
    sourceNode.connect(audioContext.destination);
    sourceNode.start();

    setInterval(() => 
    {
        const currTime = audioContext.currentTime;
        const sampleIndex = Math.floor(currTime * buffer.sampleRate);

        const segmentStart = sampleIndex % (buffer.length - bufferSize);
        const segment = buffer.getChannelData(0).slice(segmentStart, segmentStart + bufferSize);
        currentFFT = fft(segment);

        updateGeo();

    }, 1000 / 30);

}

function updateGeo() {
    let averageMagnitude = 0;
    for(var i = 0; i < currentFFT.length; i++)
    {
        averageMagnitude += Math.sqrt(currentFFT[i].re**2 + currentFFT[i].im**2);
    }
    averageMagnitude /= currentFFT.length;
    averageMagnitude = Math.log(averageMagnitude);
    mesh.scale.setScalar(averageMagnitude);
}


import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js"

const width = window.innerWidth;
const height = window.innerHeight;
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);
const fov = 75;
const aspect = width / height;
const near = 0.1;
const far = 10;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.z = 2;
const scene = new THREE.Scene();

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.03;

const geo = new THREE.IcosahedronGeometry(1.0, 2);
const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    flatShading: true
});
const mesh = new THREE.Mesh(geo, mat);
scene.add(mesh);

const wireMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true
})

const wireMesh = new THREE.Mesh(geo, wireMat);
wireMesh.scale.setScalar(1.001);
mesh.add(wireMesh);


const hemiLight = new THREE.HemisphereLight(0x0099ff, 0xaa5500);
scene.add(hemiLight);

function animate(t = 0){
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    controls.update();
}

animate();