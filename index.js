let audioFile;
let audioContext;
const bufferSize = 2048;
let currentFFT = [];
let greatCircles = [];

function randomInRange(min, max)
{
    return Math.random() < 0.5 ? ((1-Math.random()) * (max-min) + min) : (Math.random() * (max-min) + min);
}

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

    }, 1000 / 60);

}

function updateGeo() {
    // let averageMagnitude = 0;
    // for(var i = 0; i < currentFFT.length; i++)
    // {
    //     averageMagnitude += Math.sqrt(currentFFT[i].re**2 + currentFFT[i].im**2);
    // }
    // averageMagnitude /= currentFFT.length;
    // averageMagnitude /= 2;
    // mesh.scale.setScalar(averageMagnitude);
    const time = Date.now() * 0.0005;
    const breathingRadius = 1 + 0.05 * Math.sin(time);
    for (let i = 0; i < greatCircles.length; i++)
    {
        const { circle, originalPoints, angleX, angleY } = greatCircles[i];
        const positions = circle.geometry.attributes.position.array;

        const axisX = new THREE.Vector3(1, 0, 0);
        const axisY = new THREE.Vector3(0, 1, 0);
        const quaternionX = new THREE.Quaternion().setFromAxisAngle(axisX, angleX);
        const quaternionY = new THREE.Quaternion().setFromAxisAngle(axisY, angleY);

        for (let j = 0; j < bufferSize; j++) {
            let idx = j % 100;
            const amplitude = Math.sqrt(currentFFT[idx].re**2 + currentFFT[idx].im**2) / 255 * (-1) ** j;
            const index = j * 3;

            const x = originalPoints[index] * breathingRadius * (1 + amplitude);
            const y = originalPoints[index + 1] * breathingRadius * (1 + amplitude);
            const z = originalPoints[index + 2] * breathingRadius * (1 + amplitude);

            const point = new THREE.Vector3(x, y, z);
            point.applyQuaternion(quaternionX);
            point.applyQuaternion(quaternionY);

            positions[index] = point.x;
            positions[index + 1] = point.y;
            positions[index + 2] = point.z;
        }
        circle.geometry.attributes.position.needsUpdate = true;
    }
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
const far = 200;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.z = 2;
const scene = new THREE.Scene();

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.008;

function createGreatCircle(numPoints, radius, angleX, angleY) 
{
    const points = [];
    const colors = [];

    for (let i = 0; i < numPoints; i++) {
        const theta = (i / numPoints) * Math.PI * 2;
        const x = radius * Math.cos(theta);
        const y = radius * Math.sin(theta);
        points.push(new THREE.Vector3(x, y, 0));

        const color = new THREE.Color();
        color.setHSL(i / numPoints, 1.0, 0.5);
        colors.push(color);  
    }

    const axisX = new THREE.Vector3(1, 0, 0);
    const quaternionX = new THREE.Quaternion().setFromAxisAngle(axisX, angleX);
    
    const axisY = new THREE.Vector3(0, 1, 0);
    const quaternionY = new THREE.Quaternion().setFromAxisAngle(axisY, angleY);

    points.forEach(point => {
        point.applyQuaternion(quaternionX);
        point.applyQuaternion(quaternionY);
    });
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const colorArray = new Float32Array(numPoints * 3);
    colors.forEach((color, index) => {
        colorArray[index * 3] = color.r;
        colorArray[index * 3 + 1] = color.g;
        colorArray[index * 3 + 2] = color.b;
    });
    
    geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    const material = new THREE.PointsMaterial({
        size: 0.001,
        vertexColors: true,
        sizeAttenuation: true
    });

    const pointCloud = new THREE.Points(geometry, material);
    scene.add(pointCloud);

    return pointCloud;
}

for (let i = 0; i < 100; i++) {
    const angleX = randomInRange(0, 2 * Math.PI);
    const angleY = randomInRange(0, 2 * Math.PI);
    const circle = createGreatCircle(bufferSize, 1, angleX, angleY);

    greatCircles.push({
        circle: circle,
        originalPoints: circle.geometry.attributes.position.array.slice(),
        angleX: angleX,
        angleY: angleY
    });

    scene.add(circle);
}
    
function animate(t = 0){
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    controls.update();
}

animate();