let audioFile;

document.getElementById('audioForm').addEventListener('submit', function(event)
{
    event.preventDefault();
    audioFile = document.getElementById(audioUpload).files[0];
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
        const W = new Complex(Math.cos(angle), Math.sin(angle));

        ans[k] = even[k].add(W.multiply(odd[k]));
        ans[k + N / 2] = even[k].subtract(W.multiply(odd[k]));
    }
    return ans;
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