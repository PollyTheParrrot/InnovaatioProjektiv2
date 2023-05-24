import * as THREE from 'three'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GUI } from 'dat.gui'

const scene = new THREE.Scene()
scene.add(new THREE.AxesHelper(5))

const light = new THREE.PointLight()
light.position.set(2.5, 7.5, 15)
scene.add(light)

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
)
camera.position.y = 1
camera.position.z = 2

const raycaster = new THREE.Raycaster()
const renderer = new THREE.WebGLRenderer()
const mouse = new THREE.Vector2()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const menuPanel = document.getElementById('menuPanel') as HTMLDivElement
const startButton = document.getElementById('startButton') as HTMLInputElement
startButton.addEventListener(
    'click',
    function () {
        controls.lock()
    },
    false
)
raycaster.setFromCamera(mouse, camera)
const intersects = raycaster.intersectObjects(sceneMeshes, false)

const controls = new PointerLockControls(camera, renderer.domElement)
//controls.addEventListener('change', () => console.log("Controls Change"))
controls.addEventListener('lock', () => (menuPanel.style.display = 'none'))
controls.addEventListener('unlock', () => (menuPanel.style.display = 'block'))

const planeGeometry = new THREE.PlaneGeometry(100, 100, 50, 50)
const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: false,
})
const plane = new THREE.Mesh(planeGeometry, material)
plane.rotateX(-Math.PI / 2)
scene.add(plane)

const cubes: THREE.Mesh[] = []
for (let i = 0; i < 100; i++) {
    const geo = new THREE.BoxGeometry(
        Math.random() * 4,
        Math.random() * 16,
        Math.random() * 4
    )
    const mat = new THREE.MeshBasicMaterial({ wireframe: false })
    switch (i % 3) {
        case 0:
            mat.color = new THREE.Color(0xff0000)
            break
        case 1:
            mat.color = new THREE.Color(0xffff00)
            break
        case 2:
            mat.color = new THREE.Color(0x0000ff)
            break
    }
    const cube = new THREE.Mesh(geo, mat)
    cubes.push(cube)
}
cubes.forEach((c) => {
    c.position.x = Math.random() * 100 - 50
    c.position.z = Math.random() * 100 - 50
    c.geometry.computeBoundingBox()
    c.position.y =
        ((c.geometry.boundingBox as THREE.Box3).max.y -
            (c.geometry.boundingBox as THREE.Box3).min.y) /
        2
    scene.add(c)
})

let mixer: THREE.AnimationMixer
let modelReady = false
const animationActions: THREE.AnimationAction[] = []
let activeAction: THREE.AnimationAction
let lastAction: THREE.AnimationAction
const fbxLoader: FBXLoader = new FBXLoader()


function onDoubleClick(event: MouseEvent) {
    mouse.set(
        (event.clientX / renderer.domElement.clientWidth) * 2 - 1,
        -(event.clientY / renderer.domElement.clientHeight) * 2 + 1
    )
    raycaster.setFromCamera(mouse, camera)

    const intersects = raycaster.intersectObjects(sceneMeshes, false)

    if (intersects.length > 0) {
        const n = new THREE.Vector3()
        n.copy((intersects[0].face as THREE.Face).normal)
        n.transformDirection(intersects[0].object.matrixWorld)

        // const cube = new THREE.Mesh(boxGeometry, material)
        const cube = new THREE.Mesh(coneGeometry, material)

        cube.lookAt(n)
        cube.rotateX(Math.PI / 2)
        cube.position.copy(intersects[0].point)
        cube.position.addScaledVector(n, 0.1)

        scene.add(cube)
        sceneMeshes.push(cube)
    }
}

fbxLoader.load(
    'models/XBot.fbx',
    (object) => {
        object.scale.set(0.01, 0.01, 0.01)
        mixer = new THREE.AnimationMixer(object)

        const animationAction = mixer.clipAction((object as THREE.Object3D).animations[0])
        animationActions.push(animationAction)
        animationsFolder.add(animations, 'default')
        activeAction = animationActions[0]

        scene.add(object)

        //add an animation from another file
        fbxLoader.load(
            'models/XBot@ShootingGun.fbx',
            (object) => {
                console.log('loaded ShootingGun')

                const animationAction = mixer.clipAction(
                    (object as THREE.Object3D).animations[0]
                )
                animationActions.push(animationAction)
                animationsFolder.add(animations, 'shoot')
                console.log(animationActions);
                modelReady = true

            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
            },
            (error) => {
                console.log(error)
            }
        )
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
    },
    (error) => {
        console.log(error)
    }
)



const objLoader = new OBJLoader()
objLoader.load(
    'models/LampPoleThreeJS.obj',
    (object) => {
        // (object.children[0] as THREE.Mesh).material = material
        // object.traverse(function (child) {
        //     if ((child as THREE.Mesh).isMesh) {
        //         (child as THREE.Mesh).material = material
        //     }
        // })
        object.position.set(2,0,0);
        scene.add(object)
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
    },
    (error) => {
        console.log(error)
    }
)

const onKeyDown = function (event: KeyboardEvent) {
    switch (event.code) {
        case 'KeyW':
            controls.moveForward(0.25)
            break
        case 'KeyA':
            controls.moveRight(-0.25)
            break
        case 'KeyS':
            controls.moveForward(-0.25)
            break
        case 'KeyD':
            controls.moveRight(0.25)
            break
        case 'KeyY':
            setAction(animationActions[1])
            break
    }
}
document.addEventListener('keydown', onKeyDown, false)

window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    render()
}

const stats = new Stats()
document.body.appendChild(stats.dom)

const animations = {
    default: function () {
        setAction(animationActions[0])
    },
    shoot: function () {
        setAction(animationActions[1])
    },
    bellydance: function () {
        setAction(animationActions[2])
    },
    goofyrunning: function () {
        setAction(animationActions[3])
    },
}

const setAction = (toAction: THREE.AnimationAction) => {
    if (toAction != activeAction) {
        lastAction = activeAction
        activeAction = toAction
        //lastAction.stop()
        lastAction.fadeOut(1)
        activeAction.reset()
        activeAction.fadeIn(1)
        activeAction.play()
    }
}
const clock: THREE.Clock = new THREE.Clock()
const gui = new GUI()
const animationsFolder = gui.addFolder('Animations')
animationsFolder.open()

function animate() {
    requestAnimationFrame(animate)

    //controls.update()
    if (modelReady) mixer.update(clock.getDelta())

    render()

    stats.update()
}

function render() {
    renderer.render(scene, camera)
}

animate()