import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GUI } from 'dat.gui'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import TWEEN from '@tweenjs/tween.js'
import { io } from 'socket.io-client'

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
)

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const spotLight = new THREE.SpotLight()
spotLight.position.y = 3
spotLight.position.z = 4
spotLight.position.x = 1
spotLight.penumbra = 0.7
spotLight.intensity = 0.7
spotLight.castShadow = true;
spotLight.shadow.mapSize.width = 1024;
spotLight.shadow.mapSize.height = 1024;
scene.add(spotLight)

const spotLightHelper = new THREE.SpotLightHelper(spotLight)
scene.add(spotLightHelper)
const ambientLight = new THREE.AmbientLight(0xffffdf, 0.5)
scene.add(ambientLight)


const controls = new OrbitControls(camera, renderer.domElement)

const planeGeometry = new THREE.PlaneGeometry(20, 20)
const plane = new THREE.Mesh(planeGeometry, new THREE.MeshPhongMaterial())
plane.rotateX(-Math.PI / 2)
plane.position.y = -0.5
plane.receiveShadow = true
scene.add(plane)



let mixer: THREE.AnimationMixer
let modelReady = false
const animationActions: THREE.AnimationAction[] = []
let activeAction: THREE.AnimationAction
let lastAction: THREE.AnimationAction
const fbxLoader = new FBXLoader()

fbxLoader.load(
    'models/XBot.fbx',
    (object) => {
        object.traverse(function (child) {
            if ((child as THREE.Mesh).isMesh) {
                // (child as THREE.Mesh).material = material             
                if ((child as THREE.Mesh).material) {
                    ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).transparent = false                    
                }
            }
        })
        object.scale.set(.01, .01, .01)
        object.position.y = -0.55
        object.position.z = -5

        mixer = new THREE.AnimationMixer(object)

        const animationAction = mixer.clipAction(
            (object as THREE.Object3D).animations[0]
        )
        animationActions.push(animationAction)
        
        activeAction = animationActions[0]
        


        object.traverse(function(node){
            node.castShadow = true
        });
        object.castShadow = true
        scene.add(object)
        fbxLoader.load(
            'models/XBot@RumbaDancing.fbx',
            (object) => {
                console.log('loaded Samba Dance')
                ;(
                    object as THREE.Object3D
                ).animations[0].tracks.shift() 
                const animationAction = mixer.clipAction(
                    (object as THREE.Object3D).animations[0]
                )
                animationActions.push(animationAction)
                console.log(animationActions)


                modelReady = true
                setAction(animationActions[1])
            },
            (xhr) => {
                console.log(
                    (xhr.loaded / xhr.total) * 100 + '% loaded'
                )
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


const charGeo = new THREE.BoxGeometry()
const material = new THREE.MeshNormalMaterial()
//const material = new THREE.MeshBasicMaterial({ color: 0xfaff00})

const myObject3D = new THREE.Object3D()
myObject3D.position.x = Math.random() * 4 - 2
myObject3D.position.z = Math.random() * 4 - 2

// const gridHelper = new THREE.GridHelper(10, 10)
// gridHelper.position.y = -0.5
// scene.add(gridHelper)

camera.position.z = 4

window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    render()
}

let myId = ''
let timestamp = 0
const clientCubes: { [id: string]: THREE.Mesh } = {}
const socket = io()
socket.on('connect', function () {
    console.log('connect')
})
socket.on('disconnect', function (message: any) {
    console.log('disconnect ' + message)
})
socket.on('id', (id: any) => {
    myId = id
    setInterval(() => {
        socket.emit('update', {
            t: Date.now(),
            p: myObject3D.position,
            r: myObject3D.rotation,
        })
    }, 50)
})
socket.on('clients', (clients: any) => {
    let pingStatsHtml = 'Socket Ping Stats<br/><br/>'
    Object.keys(clients).forEach((p) => {
        timestamp = Date.now()
        pingStatsHtml += p + ' ' + (timestamp - clients[p].t) + 'ms<br/>'
        if (!clientCubes[p]) {

            clientCubes[p] = new THREE.Mesh(charGeo, material)
            clientCubes[p].name = p
            clientCubes[p].castShadow = true;
            scene.add(clientCubes[p])
        } else {
            if (clients[p].p) {
                new TWEEN.Tween(clientCubes[p].position)
                    .to(
                        {
                            x: clients[p].p.x,
                            y: clients[p].p.y,
                            z: clients[p].p.z,
                        },
                        50
                    )
                    .start()
            }
            if (clients[p].r) {
                new TWEEN.Tween(clientCubes[p].rotation)
                    .to(
                        {
                            x: clients[p].r._x,
                            y: clients[p].r._y,
                            z: clients[p].r._z,
                        },
                        50
                    )
                    .start()
            }
        }
    })
    ;(document.getElementById('pingStats') as HTMLDivElement).innerHTML =
        pingStatsHtml
})
socket.on('removeClient', (id: string) => {
    scene.remove(scene.getObjectByName(id) as THREE.Object3D)
})

const stats = new Stats()
document.body.appendChild(stats.dom)


const onKeyDown = function (event: KeyboardEvent) {
    switch (event.code) {
        case 'KeyY':
            setAction(animationActions[1])
            break
    }
}
document.addEventListener('keydown', onKeyDown, false)

const setAction = (toAction: THREE.AnimationAction) => {
    if (toAction != activeAction) {
        lastAction = activeAction
        activeAction = toAction
        lastAction.stop()
        lastAction.fadeOut(1)
        activeAction.reset()
        activeAction.fadeIn(1)
        activeAction.play()
    }
}


const gui = new GUI()
const cubeFolder = gui.addFolder('Cube')
const cubePositionFolder = cubeFolder.addFolder('Position')
cubePositionFolder.add(myObject3D.position, 'x', -5, 5)
cubePositionFolder.add(myObject3D.position, 'z', -5, 5)
cubePositionFolder.open()
const cubeRotationFolder = cubeFolder.addFolder('Rotation')
cubeRotationFolder.add(myObject3D.rotation, 'x', 0, Math.PI * 2, 0.01)
cubeRotationFolder.add(myObject3D.rotation, 'y', 0, Math.PI * 2, 0.01)
cubeRotationFolder.add(myObject3D.rotation, 'z', 0, Math.PI * 2, 0.01)
cubeRotationFolder.open()
cubeFolder.open()


const clock: THREE.Clock = new THREE.Clock()
const animate = function () {
    requestAnimationFrame(animate)
    spotLightHelper.update()
    controls.update()
    TWEEN.update()
    if (modelReady) mixer.update(clock.getDelta())
    if (clientCubes[myId]) {
        camera.lookAt(clientCubes[myId].position)
    }
    render()
    stats.update()
}

const render = function () {
    renderer.render(scene, camera)
}

animate()