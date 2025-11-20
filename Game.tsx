import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Button } from './ui/button';
import { LogOut, Copy, Check } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface GameProps {
  username: string;
  roomCode: string;
  isHost: boolean;
  onLeave: () => void;
}

interface Player {
  username: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  health: number;
  mode: 'flying' | 'parachuting' | 'ground';
}

export function Game({ username, roomCode, isHost, onLeave }: GameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerPlaneRef = useRef<THREE.Group | null>(null);
  const playerCharacterRef = useRef<THREE.Group | null>(null);
  const parachuteRef = useRef<THREE.Group | null>(null);
  const playersRef = useRef<Map<string, { plane?: THREE.Group; character?: THREE.Group; parachute?: THREE.Group }>>(new Map());
  const bulletsRef = useRef<THREE.Group[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const playerIdRef = useRef<string>(Math.random().toString(36).substring(7));
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [copied, setCopied] = useState(false);
  const [playerMode, setPlayerMode] = useState<'flying' | 'parachuting' | 'ground'>('flying');
  const [showControls, setShowControls] = useState(true);
  const animationFrameRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);

  // Player state
  const velocityRef = useRef(new THREE.Vector3(0, 0, 0));
  const rotationSpeedRef = useRef({ pitch: 0, yaw: 0, roll: 0 });
  const parachuteVelocityRef = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 100, 500);
    sceneRef.current = scene;

    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, -15);
    cameraRef.current = camera;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Add ground plane
    const groundGeometry = new THREE.PlaneGeometry(1000, 1000, 50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a7c59,
      roughness: 0.8,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -20;
    ground.receiveShadow = true;
    scene.add(ground);

    // Add clouds
    for (let i = 0; i < 30; i++) {
      const cloudGeometry = new THREE.SphereGeometry(5, 8, 8);
      const cloudMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.7,
      });
      const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
      cloud.position.set(
        Math.random() * 400 - 200,
        Math.random() * 50 + 20,
        Math.random() * 400 - 200
      );
      cloud.scale.set(
        Math.random() * 2 + 1,
        Math.random() * 0.5 + 0.5,
        Math.random() * 2 + 1
      );
      scene.add(cloud);
    }

    // Create player plane
    const playerPlane = createPlane(0xff3333);
    playerPlane.position.set(0, 50, 0);
    scene.add(playerPlane);
    playerPlaneRef.current = playerPlane;

    // Create player character (hidden initially)
    const playerCharacter = createCharacter(0xff3333);
    playerCharacter.visible = false;
    scene.add(playerCharacter);
    playerCharacterRef.current = playerCharacter;

    // Create parachute (hidden initially)
    const parachute = createParachute();
    parachute.visible = false;
    scene.add(parachute);
    parachuteRef.current = parachute;

    // Handle window resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (e.key === ' ') {
        e.preventDefault();
        shoot();
      }
      if (e.key === 'f' && playerMode === 'flying') {
        e.preventDefault();
        jumpOut();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      if (!cameraRef.current || !rendererRef.current || !sceneRef.current) return;

      // Update based on mode
      if (playerMode === 'flying' && playerPlaneRef.current) {
        updatePlayerMovement();
        updateCamera(playerPlaneRef.current);
      } else if (playerMode === 'parachuting' && playerCharacterRef.current && parachuteRef.current) {
        updateParachuting();
        updateCamera(playerCharacterRef.current);
      } else if (playerMode === 'ground' && playerCharacterRef.current) {
        updateGroundMovement();
        updateCamera(playerCharacterRef.current);
      }

      // Update bullets
      updateBullets();

      rendererRef.current.render(sceneRef.current, cameraRef.current);

      // Send position updates (throttled)
      const now = Date.now();
      if (now - lastUpdateRef.current > 50) {
        sendPlayerUpdate();
        lastUpdateRef.current = now;
      }
    };
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, []);

  // Poll for other players
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-472de917/get-players?roomCode=${roomCode}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setPlayers(data.players || {});
          updateOtherPlayers(data.players || {});
        }
      } catch (err) {
        console.error('Error fetching players:', err);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [roomCode]);

  const createPlane = (color: number) => {
    const planeGroup = new THREE.Group();

    // Main fuselage - more detailed with segments
    const fuselageGeometry = new THREE.CylinderGeometry(0.6, 0.45, 5, 32);
    const fuselageMaterial = new THREE.MeshStandardMaterial({ 
      color,
      metalness: 0.8,
      roughness: 0.3,
      envMapIntensity: 1,
    });
    const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
    fuselage.rotation.z = Math.PI / 2;
    fuselage.castShadow = true;
    planeGroup.add(fuselage);

    // Fuselage panels (detail lines)
    for (let i = 0; i < 8; i++) {
      const panelGeometry = new THREE.TorusGeometry(0.61, 0.02, 8, 32);
      const panelMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x222222,
        metalness: 0.5,
      });
      const panel = new THREE.Mesh(panelGeometry, panelMaterial);
      panel.rotation.y = Math.PI / 2;
      panel.position.x = -2 + (i * 0.6);
      planeGroup.add(panel);
    }

    // Advanced cockpit canopy with frame
    const cockpitGeometry = new THREE.SphereGeometry(0.7, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2.2);
    const cockpitMaterial = new THREE.MeshPhysicalMaterial({ 
      color: 0x88ccff,
      transparent: true,
      opacity: 0.4,
      metalness: 0.1,
      roughness: 0.1,
      transmission: 0.9,
      thickness: 0.5,
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.rotation.z = -Math.PI / 2;
    cockpit.position.x = 1.2;
    cockpit.position.y = 0.4;
    cockpit.castShadow = true;
    planeGroup.add(cockpit);

    // Cockpit frame
    const frameGeometry = new THREE.TorusGeometry(0.7, 0.04, 8, 32, Math.PI);
    const frameMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x111111,
      metalness: 0.9,
      roughness: 0.2,
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.rotation.z = Math.PI / 2;
    frame.rotation.y = Math.PI / 2;
    frame.position.x = 1.2;
    frame.position.y = 0.4;
    planeGroup.add(frame);

    // Main Wings - swept back design
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(2, 0);
    wingShape.lineTo(7, -1.5);
    wingShape.lineTo(6.5, -2);
    wingShape.lineTo(1.5, -0.5);
    wingShape.lineTo(0, -0.2);
    
    const extrudeSettings = {
      steps: 1,
      depth: 0.2,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 3,
    };
    
    const wingGeometry = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    const wingMaterial = new THREE.MeshStandardMaterial({ 
      color,
      metalness: 0.8,
      roughness: 0.3,
    });
    
    // Right wing
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.position.set(0, 0, 0.1);
    rightWing.rotation.x = Math.PI / 2;
    rightWing.rotation.z = Math.PI;
    rightWing.castShadow = true;
    planeGroup.add(rightWing);
    
    // Left wing
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(0, 0, -0.1);
    leftWing.rotation.x = -Math.PI / 2;
    leftWing.castShadow = true;
    planeGroup.add(leftWing);

    // Wing fuel tanks
    const tankGeometry = new THREE.CapsuleGeometry(0.25, 1.5, 8, 16);
    const tankMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x666666,
      metalness: 0.9,
      roughness: 0.2,
    });
    
    const rightTank = new THREE.Mesh(tankGeometry, tankMaterial);
    rightTank.rotation.z = Math.PI / 2;
    rightTank.rotation.x = -0.1;
    rightTank.position.set(0, -0.4, 3.5);
    rightTank.castShadow = true;
    planeGroup.add(rightTank);
    
    const leftTank = new THREE.Mesh(tankGeometry, tankMaterial);
    leftTank.rotation.z = Math.PI / 2;
    leftTank.rotation.x = 0.1;
    leftTank.position.set(0, -0.4, -3.5);
    leftTank.castShadow = true;
    planeGroup.add(leftTank);

    // Wing tip lights
    const lightGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    
    const redLight = new THREE.Mesh(lightGeometry, new THREE.MeshStandardMaterial({ 
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 2,
    }));
    redLight.position.set(0, 0, -5.5);
    planeGroup.add(redLight);
    
    const greenLight = new THREE.Mesh(lightGeometry, new THREE.MeshStandardMaterial({ 
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 2,
    }));
    greenLight.position.set(0, 0, 5.5);
    planeGroup.add(greenLight);

    // Ailerons (wing control surfaces)
    const aileronGeometry = new THREE.BoxGeometry(1.8, 0.08, 0.6);
    const aileronMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      metalness: 0.6,
    });
    
    const rightAileron = new THREE.Mesh(aileronGeometry, aileronMaterial);
    rightAileron.position.set(-0.5, 0, 5);
    rightAileron.castShadow = true;
    planeGroup.add(rightAileron);
    
    const leftAileron = new THREE.Mesh(aileronGeometry, aileronMaterial);
    leftAileron.position.set(-0.5, 0, -5);
    leftAileron.castShadow = true;
    planeGroup.add(leftAileron);

    // Horizontal tail stabilizers
    const tailWingGeometry = new THREE.BoxGeometry(3.5, 0.12, 1.5);
    const tailWings = new THREE.Mesh(tailWingGeometry, wingMaterial);
    tailWings.position.set(-2.2, 0.1, 0);
    tailWings.castShadow = true;
    planeGroup.add(tailWings);

    // Elevators (tail control surfaces)
    const elevatorGeometry = new THREE.BoxGeometry(1.2, 0.08, 0.5);
    const rightElevator = new THREE.Mesh(elevatorGeometry, aileronMaterial);
    rightElevator.position.set(-2.8, 0.1, 0.5);
    rightElevator.castShadow = true;
    planeGroup.add(rightElevator);
    
    const leftElevator = new THREE.Mesh(elevatorGeometry, aileronMaterial);
    leftElevator.position.set(-2.8, 0.1, -0.5);
    leftElevator.castShadow = true;
    planeGroup.add(leftElevator);

    // Vertical stabilizer (tail fin) - larger and more realistic
    const finGeometry = new THREE.BoxGeometry(0.15, 2.5, 2);
    const fin = new THREE.Mesh(finGeometry, wingMaterial);
    fin.position.set(-2.2, 1.15, 0);
    fin.castShadow = true;
    planeGroup.add(fin);

    // Rudder
    const rudderGeometry = new THREE.BoxGeometry(0.12, 0.8, 0.6);
    const rudder = new THREE.Mesh(rudderGeometry, aileronMaterial);
    rudder.position.set(-2.8, 1.6, 0);
    rudder.castShadow = true;
    planeGroup.add(rudder);

    // Nose cone - streamlined
    const noseGeometry = new THREE.ConeGeometry(0.45, 1.2, 32);
    const nose = new THREE.Mesh(noseGeometry, fuselageMaterial);
    nose.rotation.z = -Math.PI / 2;
    nose.position.x = 3.1;
    nose.castShadow = true;
    planeGroup.add(nose);

    // Engine cowling
    const cowlingGeometry = new THREE.CylinderGeometry(0.65, 0.6, 1.5, 32);
    const cowlingMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a,
      metalness: 0.9,
      roughness: 0.3,
    });
    const cowling = new THREE.Mesh(cowlingGeometry, cowlingMaterial);
    cowling.rotation.z = Math.PI / 2;
    cowling.position.x = 2;
    cowling.castShadow = true;
    planeGroup.add(cowling);

    // Engine cooling vents
    for (let i = 0; i < 6; i++) {
      const ventGeometry = new THREE.BoxGeometry(0.15, 0.03, 0.5);
      const vent = new THREE.Mesh(ventGeometry, new THREE.MeshStandardMaterial({ color: 0x000000 }));
      vent.position.set(2.5, Math.cos((i / 6) * Math.PI * 2) * 0.5, Math.sin((i / 6) * Math.PI * 2) * 0.5);
      vent.rotation.y = (i / 6) * Math.PI * 2;
      planeGroup.add(vent);
    }

    // Propeller hub
    const propHubGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const propHub = new THREE.Mesh(propHubGeometry, new THREE.MeshStandardMaterial({ 
      color: 0x111111,
      metalness: 1,
      roughness: 0.2,
    }));
    propHub.position.x = 3.3;
    propHub.castShadow = true;
    planeGroup.add(propHub);

    // Advanced propeller blades
    const propellerGroup = new THREE.Group();
    
    for (let i = 0; i < 3; i++) {
      const bladeShape = new THREE.Shape();
      bladeShape.moveTo(0, 0);
      bladeShape.quadraticCurveTo(0.4, 0.05, 0.8, 0.08);
      bladeShape.quadraticCurveTo(1.2, 0.08, 1.5, 0.05);
      bladeShape.lineTo(1.5, -0.05);
      bladeShape.quadraticCurveTo(1.2, -0.08, 0.8, -0.08);
      bladeShape.quadraticCurveTo(0.4, -0.05, 0, 0);
      
      const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, {
        steps: 1,
        depth: 0.08,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
      });
      
      const bladeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2a2a2a,
        metalness: 0.9,
        roughness: 0.2,
      });
      
      const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
      blade.rotation.z = (i * Math.PI * 2) / 3;
      blade.rotation.x = Math.PI / 12; // Pitch angle
      blade.castShadow = true;
      propellerGroup.add(blade);
    }
    
    propellerGroup.position.x = 3.35;
    planeGroup.add(propellerGroup);
    
    // Store propeller for animation
    (planeGroup as any).propeller = propellerGroup;

    // Exhaust pipes
    const exhaustGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.4, 8);
    const exhaustMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a,
      metalness: 0.8,
      emissive: 0x331100,
      emissiveIntensity: 0.3,
    });
    
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const exhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
      exhaust.position.set(
        1.3,
        Math.cos(angle) * 0.55,
        Math.sin(angle) * 0.55
      );
      exhaust.rotation.z = Math.PI / 2;
      exhaust.castShadow = true;
      planeGroup.add(exhaust);
    }

    // Landing gear - more detailed
    const gearStrutGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8);
    const gearMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      metalness: 0.8,
    });
    
    // Main landing gear
    const mainGearStrut1 = new THREE.Mesh(gearStrutGeometry, gearMaterial);
    mainGearStrut1.position.set(0.8, -0.3, 1.2);
    mainGearStrut1.rotation.z = 0.3;
    mainGearStrut1.castShadow = true;
    planeGroup.add(mainGearStrut1);
    
    const mainGearStrut2 = new THREE.Mesh(gearStrutGeometry, gearMaterial);
    mainGearStrut2.position.set(0.8, -0.3, -1.2);
    mainGearStrut2.rotation.z = 0.3;
    mainGearStrut2.castShadow = true;
    planeGroup.add(mainGearStrut2);

    // Wheels with tires
    const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.25, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a,
      metalness: 0.3,
      roughness: 0.8,
    });
    
    const tireGeometry = new THREE.TorusGeometry(0.3, 0.12, 8, 16);
    const tireMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x0a0a0a,
      roughness: 0.9,
    });
    
    // Right main wheel
    const wheel1 = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel1.rotation.x = Math.PI / 2;
    wheel1.position.set(0.5, -0.8, 1.2);
    wheel1.castShadow = true;
    planeGroup.add(wheel1);
    
    const tire1 = new THREE.Mesh(tireGeometry, tireMaterial);
    tire1.rotation.x = Math.PI / 2;
    tire1.position.set(0.5, -0.8, 1.2);
    tire1.castShadow = true;
    planeGroup.add(tire1);
    
    // Left main wheel
    const wheel2 = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel2.rotation.x = Math.PI / 2;
    wheel2.position.set(0.5, -0.8, -1.2);
    wheel2.castShadow = true;
    planeGroup.add(wheel2);
    
    const tire2 = new THREE.Mesh(tireGeometry, tireMaterial);
    tire2.rotation.x = Math.PI / 2;
    tire2.position.set(0.5, -0.8, -1.2);
    tire2.castShadow = true;
    planeGroup.add(tire2);
    
    // Tail wheel
    const tailWheelGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.15, 16);
    const wheel3 = new THREE.Mesh(tailWheelGeometry, wheelMaterial);
    wheel3.rotation.x = Math.PI / 2;
    wheel3.position.set(-2, -0.6, 0);
    wheel3.castShadow = true;
    planeGroup.add(wheel3);

    // Tail wheel strut
    const tailStrutGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8);
    const tailStrut = new THREE.Mesh(tailStrutGeometry, gearMaterial);
    tailStrut.position.set(-2, -0.4, 0);
    tailStrut.castShadow = true;
    planeGroup.add(tailStrut);

    // Racing stripes / decals
    const stripeGeometry = new THREE.BoxGeometry(4, 0.02, 0.3);
    const stripeMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      metalness: 0.8,
      roughness: 0.3,
    });
    
    const stripe1 = new THREE.Mesh(stripeGeometry, stripeMaterial);
    stripe1.position.set(0.5, 0.62, 0);
    stripe1.castShadow = true;
    planeGroup.add(stripe1);

    // Antenna
    const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8);
    const antenna = new THREE.Mesh(antennaGeometry, new THREE.MeshStandardMaterial({ color: 0x333333 }));
    antenna.position.set(-0.5, 0.65, 0);
    planeGroup.add(antenna);

    return planeGroup;
  };

  const createCharacter = (color: number) => {
    const characterGroup = new THREE.Group();

    // Body
    const bodyGeometry = new THREE.CapsuleGeometry(0.3, 0.8, 8, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    characterGroup.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.8;
    head.castShadow = true;
    characterGroup.add(head);

    // Arms
    const armGeometry = new THREE.CapsuleGeometry(0.1, 0.6, 8, 16);
    const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
    leftArm.position.set(0, 0.2, 0.4);
    leftArm.rotation.z = Math.PI / 6;
    leftArm.castShadow = true;
    characterGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
    rightArm.position.set(0, 0.2, -0.4);
    rightArm.rotation.z = -Math.PI / 6;
    rightArm.castShadow = true;
    characterGroup.add(rightArm);

    // Legs
    const legGeometry = new THREE.CapsuleGeometry(0.12, 0.7, 8, 16);
    const leftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    leftLeg.position.set(0, -0.9, 0.15);
    leftLeg.castShadow = true;
    characterGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    rightLeg.position.set(0, -0.9, -0.15);
    rightLeg.castShadow = true;
    characterGroup.add(rightLeg);

    return characterGroup;
  };

  const createParachute = () => {
    const parachuteGroup = new THREE.Group();

    // Canopy
    const canopyGeometry = new THREE.SphereGeometry(3, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const canopyMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6b6b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
    canopy.rotation.x = Math.PI;
    canopy.position.y = 3;
    canopy.castShadow = true;
    parachuteGroup.add(canopy);

    // Lines connecting to character
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(2, 3, 2),
    ];
    
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const linePoints = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(Math.cos(angle) * 2.5, 3, Math.sin(angle) * 2.5),
      ];
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
      const line = new THREE.Line(lineGeometry, lineMaterial);
      parachuteGroup.add(line);
    }

    return parachuteGroup;
  };

  const updatePlayerMovement = () => {
    if (!playerPlaneRef.current) return;

    // Animate propeller
    if ((playerPlaneRef.current as any).propeller) {
      (playerPlaneRef.current as any).propeller.rotation.x += 0.5;
    }

    const keys = keysRef.current;
    const speed = 0.3;
    const rotationSpeed = 0.03;

    // Yaw (left/right) - now controlled by W/S
    if (keys.has('w') || keys.has('arrowup')) {
      rotationSpeedRef.current.yaw = Math.min(rotationSpeedRef.current.yaw + 0.002, 0.05);
    } else if (keys.has('s') || keys.has('arrowdown')) {
      rotationSpeedRef.current.yaw = Math.max(rotationSpeedRef.current.yaw - 0.002, -0.05);
    } else {
      rotationSpeedRef.current.yaw *= 0.95;
    }

    // Pitch (up/down) - now controlled by A/D
    if (keys.has('a') || keys.has('arrowleft')) {
      rotationSpeedRef.current.pitch = Math.min(rotationSpeedRef.current.pitch + 0.002, 0.05);
    } else if (keys.has('d') || keys.has('arrowright')) {
      rotationSpeedRef.current.pitch = Math.max(rotationSpeedRef.current.pitch - 0.002, -0.05);
    } else {
      rotationSpeedRef.current.pitch *= 0.95;
    }

    // Roll
    if (keys.has('q')) {
      rotationSpeedRef.current.roll = Math.min(rotationSpeedRef.current.roll + 0.002, 0.05);
    } else if (keys.has('e')) {
      rotationSpeedRef.current.roll = Math.max(rotationSpeedRef.current.roll - 0.002, -0.05);
    } else {
      rotationSpeedRef.current.roll *= 0.95;
    }

    // Apply rotations
    playerPlaneRef.current.rotateX(rotationSpeedRef.current.pitch);
    playerPlaneRef.current.rotateY(rotationSpeedRef.current.yaw);
    playerPlaneRef.current.rotateZ(rotationSpeedRef.current.roll);

    // Move forward
    const forward = new THREE.Vector3(1, 0, 0);
    forward.applyQuaternion(playerPlaneRef.current.quaternion);
    playerPlaneRef.current.position.add(forward.multiplyScalar(speed));

    // Prevent going too low
    if (playerPlaneRef.current.position.y < -15) {
      playerPlaneRef.current.position.y = -15;
    }
  };

  const jumpOut = () => {
    if (!playerPlaneRef.current || !playerCharacterRef.current || !parachuteRef.current) return;

    setPlayerMode('parachuting');
    
    // Hide plane, show character and parachute
    playerPlaneRef.current.visible = false;
    playerCharacterRef.current.visible = true;
    parachuteRef.current.visible = true;

    // Set character position to plane position
    playerCharacterRef.current.position.copy(playerPlaneRef.current.position);
    parachuteRef.current.position.copy(playerPlaneRef.current.position);

    // Initial velocity
    parachuteVelocityRef.current.set(0, -0.1, 0);
  };

  const updateParachuting = () => {
    if (!playerCharacterRef.current || !parachuteRef.current) return;

    const keys = keysRef.current;

    // Horizontal movement
    const moveSpeed = 0.15;
    if (keys.has('w') || keys.has('arrowup')) {
      parachuteVelocityRef.current.x += 0.01;
    }
    if (keys.has('s') || keys.has('arrowdown')) {
      parachuteVelocityRef.current.x -= 0.01;
    }
    if (keys.has('a') || keys.has('arrowleft')) {
      parachuteVelocityRef.current.z += 0.01;
    }
    if (keys.has('d') || keys.has('arrowright')) {
      parachuteVelocityRef.current.z -= 0.01;
    }

    // Apply gravity with parachute resistance
    parachuteVelocityRef.current.y -= 0.005;
    parachuteVelocityRef.current.y = Math.max(parachuteVelocityRef.current.y, -0.3);

    // Apply drag
    parachuteVelocityRef.current.x *= 0.98;
    parachuteVelocityRef.current.z *= 0.98;

    // Update positions
    playerCharacterRef.current.position.add(parachuteVelocityRef.current);
    parachuteRef.current.position.copy(playerCharacterRef.current.position);

    // Gentle swaying animation
    parachuteRef.current.rotation.z = Math.sin(Date.now() * 0.002) * 0.1;
    parachuteRef.current.rotation.x = Math.cos(Date.now() * 0.003) * 0.1;

    // Check if landed
    if (playerCharacterRef.current.position.y <= -18.5) {
      playerCharacterRef.current.position.y = -18.5;
      parachuteRef.current.visible = false;
      setPlayerMode('ground');
    }
  };

  const updateGroundMovement = () => {
    if (!playerCharacterRef.current) return;

    const keys = keysRef.current;
    const moveSpeed = 0.2;

    // Movement on ground
    if (keys.has('w') || keys.has('arrowup')) {
      playerCharacterRef.current.position.x += moveSpeed;
    }
    if (keys.has('s') || keys.has('arrowdown')) {
      playerCharacterRef.current.position.x -= moveSpeed;
    }
    if (keys.has('a') || keys.has('arrowleft')) {
      playerCharacterRef.current.position.z += moveSpeed;
    }
    if (keys.has('d') || keys.has('arrowright')) {
      playerCharacterRef.current.position.z -= moveSpeed;
    }

    // Keep on ground
    playerCharacterRef.current.position.y = -18.5;
  };

  const updateCamera = (target: THREE.Group) => {
    if (!cameraRef.current) return;

    let offset = new THREE.Vector3(0, 5, -15);
    
    if (playerMode === 'flying') {
      offset = new THREE.Vector3(0, 5, -15);
      offset.applyQuaternion(target.quaternion);
    } else if (playerMode === 'parachuting') {
      offset = new THREE.Vector3(-10, 5, 0);
    } else if (playerMode === 'ground') {
      offset = new THREE.Vector3(-8, 3, 0);
    }

    const targetCameraPos = new THREE.Vector3();
    targetCameraPos.copy(target.position).add(offset);
    
    cameraRef.current.position.lerp(targetCameraPos, 0.1);
    cameraRef.current.lookAt(target.position);
  };

  const shoot = () => {
    if (!playerPlaneRef.current || !sceneRef.current || playerMode !== 'flying') return;

    const bulletGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

    bullet.position.copy(playerPlaneRef.current.position);
    const forward = new THREE.Vector3(1, 0, 0);
    forward.applyQuaternion(playerPlaneRef.current.quaternion);
    
    (bullet as any).velocity = forward.multiplyScalar(2);
    (bullet as any).life = 100;

    sceneRef.current.add(bullet);
    bulletsRef.current.push(bullet as any);
  };

  const updateBullets = () => {
    if (!sceneRef.current) return;

    bulletsRef.current = bulletsRef.current.filter((bullet) => {
      (bullet as any).life--;
      bullet.position.add((bullet as any).velocity);

      if ((bullet as any).life <= 0) {
        sceneRef.current?.remove(bullet);
        return false;
      }
      return true;
    });
  };

  const updateOtherPlayers = (playersData: Record<string, Player>) => {
    if (!sceneRef.current) return;

    // Remove players that left
    playersRef.current.forEach((playerObjects, id) => {
      if (!playersData[id] && id !== playerIdRef.current) {
        if (playerObjects.plane) sceneRef.current?.remove(playerObjects.plane);
        if (playerObjects.character) sceneRef.current?.remove(playerObjects.character);
        if (playerObjects.parachute) sceneRef.current?.remove(playerObjects.parachute);
        playersRef.current.delete(id);
      }
    });

    // Update or add players
    Object.entries(playersData).forEach(([id, playerData]) => {
      if (id === playerIdRef.current) return;

      let playerObjects = playersRef.current.get(id);
      if (!playerObjects) {
        playerObjects = {
          plane: createPlane(0x3333ff),
          character: createCharacter(0x3333ff),
          parachute: createParachute(),
        };
        sceneRef.current?.add(playerObjects.plane!);
        sceneRef.current?.add(playerObjects.character!);
        sceneRef.current?.add(playerObjects.parachute!);
        playerObjects.character!.visible = false;
        playerObjects.parachute!.visible = false;
        playersRef.current.set(id, playerObjects);
      }

      const pos = new THREE.Vector3(playerData.position.x, playerData.position.y, playerData.position.z);

      // Show/hide based on mode
      if (playerData.mode === 'flying') {
        if (playerObjects.plane) {
          playerObjects.plane.visible = true;
          playerObjects.plane.position.lerp(pos, 0.3);
          playerObjects.plane.rotation.set(playerData.rotation.x, playerData.rotation.y, playerData.rotation.z);
          
          // Animate propeller
          if ((playerObjects.plane as any).propeller) {
            (playerObjects.plane as any).propeller.rotation.x += 0.5;
          }
        }
        if (playerObjects.character) playerObjects.character.visible = false;
        if (playerObjects.parachute) playerObjects.parachute.visible = false;
      } else if (playerData.mode === 'parachuting') {
        if (playerObjects.plane) playerObjects.plane.visible = false;
        if (playerObjects.character) {
          playerObjects.character.visible = true;
          playerObjects.character.position.lerp(pos, 0.3);
        }
        if (playerObjects.parachute) {
          playerObjects.parachute.visible = true;
          playerObjects.parachute.position.lerp(pos, 0.3);
        }
      } else if (playerData.mode === 'ground') {
        if (playerObjects.plane) playerObjects.plane.visible = false;
        if (playerObjects.character) {
          playerObjects.character.visible = true;
          playerObjects.character.position.lerp(pos, 0.3);
        }
        if (playerObjects.parachute) playerObjects.parachute.visible = false;
      }
    });
  };

  const sendPlayerUpdate = async () => {
    const currentPos = playerMode === 'flying' ? playerPlaneRef.current?.position : playerCharacterRef.current?.position;
    const currentRot = playerMode === 'flying' ? playerPlaneRef.current?.rotation : playerCharacterRef.current?.rotation;
    
    if (!currentPos || !currentRot) return;

    const playerData: Player = {
      username,
      position: {
        x: currentPos.x,
        y: currentPos.y,
        z: currentPos.z,
      },
      rotation: {
        x: currentRot.x,
        y: currentRot.y,
        z: currentRot.z,
      },
      health: 100,
      mode: playerMode,
    };

    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-472de917/update-player`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            roomCode,
            playerId: playerIdRef.current,
            playerData,
          }),
        }
      );
    } catch (err) {
      console.error('Error updating player:', err);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = async () => {
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-472de917/leave-room`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            roomCode,
            playerId: playerIdRef.current,
          }),
        }
      );
    } catch (err) {
      console.error('Error leaving room:', err);
    }
    onLeave();
  };

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="text-white">
            <h1 className="text-3xl mb-1">jarzd.io</h1>
            <p className="text-sm opacity-80">Room: {roomCode}</p>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleCopyCode}
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy Code'}
            </Button>
            <Button
              onClick={handleLeave}
              variant="destructive"
              className="bg-red-500/80 hover:bg-red-600/80"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Leave
            </Button>
          </div>
        </div>
      </div>

      {/* Players list */}
      <div className="absolute top-24 left-4 bg-black/50 backdrop-blur-sm p-4 rounded-lg text-white min-w-[200px]">
        <h3 className="mb-2">Players ({Object.keys(players).length})</h3>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>{username} (You)</span>
          </div>
          {Object.entries(players).map(([id, player]) => {
            if (id === playerIdRef.current) return null;
            return (
              <div key={id} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>{player.username}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm p-4 rounded-lg text-white text-sm">
        <div className="flex items-center justify-between mb-2">
          <h3>Controls</h3>
          <Button
            onClick={() => setShowControls(!showControls)}
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-white hover:bg-white/20"
          >
            {showControls ? 'Hide' : 'Show'}
          </Button>
        </div>
        {showControls && (
          <>
            {playerMode === 'flying' && (
              <div className="space-y-1">
                <p><span className="opacity-70">W/S or ↑/↓:</span> Yaw (Turn)</p>
                <p><span className="opacity-70">A/D or ←/→:</span> Pitch (Up/Down)</p>
                <p><span className="opacity-70">Q/E:</span> Roll</p>
                <p><span className="opacity-70">SPACE:</span> Shoot</p>
                <p><span className="opacity-70">F:</span> Jump Out</p>
              </div>
            )}
            {playerMode === 'parachuting' && (
              <div className="space-y-1">
                <p><span className="opacity-70">WASD/Arrows:</span> Steer</p>
                <p className="text-yellow-400">Parachuting...</p>
              </div>
            )}
            {playerMode === 'ground' && (
              <div className="space-y-1">
                <p><span className="opacity-70">WASD/Arrows:</span> Move</p>
                <p className="text-green-400">On Ground</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}