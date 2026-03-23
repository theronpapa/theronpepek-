import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Sky, Stars, PerspectiveCamera, Environment, Text, useHelper, Line } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { Target as TargetIcon, Crosshair, ShoppingCart, Shield, Zap, Target as TargetIcon2 } from 'lucide-react';

// --- Types ---
interface Gun {
  id: string;
  name: string;
  damage: number;
  fireRate: number; // ms between shots
  zoom: number; // FOV when scoped
  color: string;
  price: number;
  unlocked: boolean;
}

interface Enemy {
  id: string;
  position: [number, number, number];
  health: number;
  maxHealth: number;
  size: number;
  speed: number;
  angle: number;
}

interface BulletTracer {
  id: string;
  start: THREE.Vector3;
  end: THREE.Vector3;
  timestamp: number;
}

// --- Constants ---
const INITIAL_GUNS: Gun[] = [
  { id: 'glock', name: 'Glock-18', damage: 25, fireRate: 200, zoom: 45, color: '#2d3748', price: 0, unlocked: true },
  { id: 'p250', name: 'P250', damage: 35, fireRate: 250, zoom: 45, color: '#4a5568', price: 300, unlocked: false },
  { id: 'ak47', name: 'AK-47', damage: 45, fireRate: 100, zoom: 40, color: '#1a202c', price: 2700, unlocked: false },
  { id: 'm4a4', name: 'M4A4', damage: 40, fireRate: 90, zoom: 40, color: '#2d3748', price: 3100, unlocked: false },
  { id: 'awp', name: 'AWP', damage: 100, fireRate: 1500, zoom: 10, color: '#1a202c', price: 4750, unlocked: false },
  { id: 'negev', name: 'Negev', damage: 30, fireRate: 50, zoom: 45, color: '#4a5568', price: 1700, unlocked: false },
];

// --- 3D Components ---

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
      <planeGeometry args={[1000, 1000]} />
      <meshStandardMaterial color="#c0a080" roughness={0.9} />
    </mesh>
  );
}

function GunModel({ currentGun, isScoped }: { currentGun: Gun; isScoped: boolean }) {
  const group = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (group.current && !isScoped) {
      // Natural bobbing effect
      const t = state.clock.elapsedTime;
      group.current.position.y = -0.4 + Math.sin(t * 4) * 0.01;
      group.current.position.x = 0.5 + Math.cos(t * 2) * 0.01;
      // Slight sway based on mouse (simplified here)
    }
  });

  if (isScoped) return null;

  return (
    <group ref={group} position={[0.5, -0.4, -0.8]} rotation={[0, Math.PI, 0]}>
      {/* Main Body */}
      <mesh castShadow>
        <boxGeometry args={[0.1, 0.2, 0.6]} />
        <meshStandardMaterial color={currentGun.color} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Barrel */}
      <mesh position={[0, 0.05, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.4]} />
        <meshStandardMaterial color="#1a202c" />
      </mesh>
      {/* Handle */}
      <mesh position={[0, -0.15, -0.1]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.08, 0.2, 0.1]} />
        <meshStandardMaterial color="#2d3748" />
      </mesh>
    </group>
  );
}

function Map() {
  return (
    <group>
      <Ground />
      {/* Simple "Dust 2" style crates and walls */}
      <mesh position={[10, 0, 10]} castShadow receiveShadow>
        <boxGeometry args={[4, 4, 4]} />
        <meshStandardMaterial color="#d69e2e" />
      </mesh>
      <mesh position={[-15, 0, -5]} castShadow receiveShadow>
        <boxGeometry args={[6, 8, 2]} />
        <meshStandardMaterial color="#718096" />
      </mesh>
      <mesh position={[5, 0, -20]} castShadow receiveShadow>
        <boxGeometry args={[10, 4, 1]} />
        <meshStandardMaterial color="#718096" />
      </mesh>
      <mesh position={[-10, 0, 15]} castShadow receiveShadow>
        <boxGeometry args={[3, 3, 3]} />
        <meshStandardMaterial color="#d69e2e" />
      </mesh>
      {/* Pillars */}
      {[...Array(8)].map((_, i) => (
        <mesh key={i} position={[Math.cos(i) * 40, 5, Math.sin(i) * 40]} castShadow>
          <cylinderGeometry args={[2, 2, 20]} />
          <meshStandardMaterial color="#4a5568" />
        </mesh>
      ))}
    </group>
  );
}

function BulletTracerLine({ tracer }: { tracer: BulletTracer }) {
  const [opacity, setOpacity] = useState(1);

  useFrame(() => {
    const age = Date.now() - tracer.timestamp;
    const newOpacity = Math.max(0, 1 - age / 150);
    setOpacity(newOpacity);
  });

  if (opacity <= 0) return null;

  return (
    <Line
      points={[tracer.start, tracer.end]}
      color="#fbbf24"
      lineWidth={1}
      transparent
      opacity={opacity}
    />
  );
}

function EnemyTarget({ enemy }: { enemy: Enemy }) {
  const meshRef = useRef<THREE.Group>(null);
  const position = useRef(new THREE.Vector3(...enemy.position));
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      // Horizontal movement
      position.current.x += Math.cos(enemy.angle) * enemy.speed * delta;
      position.current.z += Math.sin(enemy.angle) * enemy.speed * delta;
      
      // Keep within bounds
      if (position.current.length() > 60) {
        position.current.setLength(60);
      }
      
      meshRef.current.position.copy(position.current);
      
      // Humanoid-like bobbing
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 3 + parseFloat(enemy.id)) * 0.2 + 1.5;
    }
  });

  return (
    <group position={enemy.position} ref={meshRef}>
      {/* Humanoid Shape */}
      <mesh name={`enemy-${enemy.id}`} castShadow position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.5, 1.5, 4, 8]} />
        <meshStandardMaterial 
          color={enemy.health < enemy.maxHealth ? "#f56565" : "#2d3748"} 
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.8, 0]} castShadow>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#e53e3e" />
      </mesh>
      
      {/* Health Bar */}
      <group position={[0, 2.5, 0]}>
        <mesh>
          <planeGeometry args={[1.5, 0.1]} />
          <meshBasicMaterial color="#000" transparent opacity={0.5} />
        </mesh>
        <mesh position={[-(0.75 - (enemy.health / enemy.maxHealth) * 0.75), 0, 0.01]}>
          <planeGeometry args={[(enemy.health / enemy.maxHealth) * 1.5, 0.1]} />
          <meshBasicMaterial color="#48bb78" />
        </mesh>
      </group>
    </group>
  );
}

function Player({ 
  currentGun, 
  onShoot, 
  isScoped 
}: { 
  currentGun: Gun; 
  onShoot: (hitId: string | null, hitPoint: THREE.Vector3, startPoint: THREE.Vector3) => void;
  isScoped: boolean;
}) {
  const { camera, raycaster, scene } = useThree();
  const lastShootTime = useRef(0);
  const moveState = useRef({ forward: false, backward: false, left: false, right: false, jump: false, shooting: false });
  const velocity = useRef(new THREE.Vector3());
  const canJump = useRef(true);

  const shoot = useCallback(() => {
    const now = Date.now();
    if (now - lastShootTime.current < currentGun.fireRate) return;
    lastShootTime.current = now;

    const center = new THREE.Vector2(0, 0);
    raycaster.setFromCamera(center, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    let hitId: string | null = null;
    let hitPoint = new THREE.Vector3().copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(100));
    
    for (const intersect of intersects) {
      if (intersect.object.name.startsWith('enemy-') || intersect.object.type === 'Mesh') {
        hitId = intersect.object.name.startsWith('enemy-') ? intersect.object.name.replace('enemy-', '') : null;
        hitPoint = intersect.point;
        break;
      }
    }
    
    // Start point is roughly where the gun is
    const startPoint = camera.position.clone();
    const offset = new THREE.Vector3(0.5, -0.4, -0.8).applyQuaternion(camera.quaternion);
    startPoint.add(offset);

    onShoot(hitId, hitPoint, startPoint);
  }, [camera, currentGun, raycaster, scene, onShoot]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': moveState.current.forward = true; break;
        case 'KeyS': moveState.current.backward = true; break;
        case 'KeyA': moveState.current.left = true; break;
        case 'KeyD': moveState.current.right = true; break;
        case 'Space': if (canJump.current) { velocity.current.y = 10; canJump.current = false; } break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': moveState.current.forward = false; break;
        case 'KeyS': moveState.current.backward = false; break;
        case 'KeyA': moveState.current.left = false; break;
        case 'KeyD': moveState.current.right = false; break;
      }
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) moveState.current.shooting = true;
    };
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) moveState.current.shooting = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [shoot]);

  useFrame((state, delta) => {
    // Shooting Logic (Automatic)
    if (moveState.current.shooting) {
      shoot();
    }

    // Movement Logic
    const speed = 15;
    const direction = new THREE.Vector3();
    const frontVector = new THREE.Vector3(0, 0, Number(moveState.current.backward) - Number(moveState.current.forward));
    const sideVector = new THREE.Vector3(Number(moveState.current.left) - Number(moveState.current.right), 0, 0);
    
    direction.subVectors(frontVector, sideVector).normalize().multiplyScalar(speed).applyQuaternion(camera.quaternion);
    
    velocity.current.x = direction.x;
    velocity.current.z = direction.z;
    velocity.current.y -= 30 * delta; // Gravity

    camera.position.x += velocity.current.x * delta;
    camera.position.z += velocity.current.z * delta;
    camera.position.y += velocity.current.y * delta;

    if (camera.position.y < 2) {
      camera.position.y = 2;
      velocity.current.y = 0;
      canJump.current = true;
    }

    // Smooth FOV transition for scoping
    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFOV = isScoped ? currentGun.zoom : 90; // CSGO FOV is usually higher
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, 0.2);
      camera.updateProjectionMatrix();
    }
  });

  return (
    <>
      <PointerLockControls />
      <PerspectiveCamera makeDefault position={[0, 2, 0]} fov={90} />
      <GunModel currentGun={currentGun} isScoped={isScoped} />
    </>
  );
}

// --- Main App ---

export default function App() {
  const [score, setScore] = useState(0);
  const [money, setMoney] = useState(16000); // CSGO Max Money
  const [guns, setGuns] = useState<Gun[]>(INITIAL_GUNS);
  const [activeGunIndex, setActiveGunIndex] = useState(0);
  const [isScoped, setIsScoped] = useState(false);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [tracers, setTracers] = useState<BulletTracer[]>([]);
  const [showShop, setShowShop] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [killFeed, setKillFeed] = useState<string[]>([]);

  const currentGun = guns[activeGunIndex];

  // Spawn enemies
  useEffect(() => {
    if (!gameStarted) return;
    
    const spawn = () => {
      setEnemies(prev => {
        if (prev.length >= 10) return prev;
        const id = Math.random().toString();
        const angle = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * 30;
        return [...prev, {
          id,
          position: [Math.cos(angle) * dist, 0, Math.sin(angle) * dist],
          health: 100,
          maxHealth: 100,
          size: 1,
          speed: 2 + Math.random() * 4,
          angle: Math.random() * Math.PI * 2
        }];
      });
    };

    const interval = setInterval(spawn, 3000);
    return () => clearInterval(interval);
  }, [gameStarted]);

  const handleShoot = (hitId: string | null, hitPoint: THREE.Vector3, startPoint: THREE.Vector3) => {
    // Add tracer
    const newTracer: BulletTracer = {
      id: Math.random().toString(),
      start: startPoint,
      end: hitPoint,
      timestamp: Date.now()
    };
    setTracers(prev => [...prev, newTracer]);
    
    // Clean up old tracers
    setTimeout(() => {
      setTracers(prev => prev.filter(t => t.id !== newTracer.id));
    }, 200);

    if (hitId) {
      setEnemies(prev => prev.map(e => {
        if (e.id === hitId) {
          const newHealth = e.health - currentGun.damage;
          if (newHealth <= 0) {
            setScore(s => s + 300); // CSGO Kill Reward
            setMoney(m => Math.min(16000, m + 300));
            setKillFeed(prev => [...prev.slice(-4), `YOU killed BOT_${hitId.slice(2, 5)} with ${currentGun.name}`]);
            return null;
          }
          return { ...e, health: newHealth };
        }
        return e;
      }).filter(Boolean) as Enemy[]);
    }
  };

  const buyGun = (index: number) => {
    const gun = guns[index];
    if (gun.unlocked) {
      setActiveGunIndex(index);
      setShowShop(false);
      return;
    }
    
    if (money >= gun.price) {
      setMoney(m => m - gun.price);
      setGuns(prev => prev.map((g, i) => i === index ? { ...g, unlocked: true } : g));
      setActiveGunIndex(index);
      setShowShop(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyB') setShowShop(s => !s);
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') setIsScoped(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') setIsScoped(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  if (!gameStarted) {
    return (
      <div className="h-screen w-screen bg-neutral-950 flex flex-col items-center justify-center text-white font-sans p-4 overflow-hidden">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <h1 className="text-8xl font-black italic tracking-tighter mb-2 text-white drop-shadow-2xl">
            GLOBAL OFFENSIVE
          </h1>
          <p className="text-orange-500 font-bold tracking-[0.5em] mb-12 uppercase">Haoqian Edition</p>
          
          <button 
            onClick={() => setGameStarted(true)}
            className="px-20 py-6 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-sm text-2xl transition-all hover:skew-x-[-10deg] active:scale-95 shadow-xl"
          >
            PLAY NOW
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-neutral-900 overflow-hidden relative font-sans select-none">
      <Canvas shadows dpr={[1, 2]}>
        <Sky sunPosition={[100, 20, 100]} turbidity={0.1} rayleigh={0.5} />
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[50, 50, 50]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize={[1024, 1024]}
        />
        
        <Map />
        
        <Suspense fallback={null}>
          {enemies.map(enemy => (
            <EnemyTarget key={enemy.id} enemy={enemy} />
          ))}
          {tracers.map(tracer => (
            <BulletTracerLine key={tracer.id} tracer={tracer} />
          ))}
        </Suspense>
        
        <Player 
          currentGun={currentGun} 
          onShoot={handleShoot} 
          isScoped={isScoped} 
        />
      </Canvas>

      {/* CSGO Kill Feed */}
      <div className="absolute top-10 right-10 flex flex-col items-end gap-2 pointer-events-none">
        {killFeed.map((msg, i) => (
          <motion.div 
            key={i}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-black/60 px-4 py-1 text-[10px] font-bold text-white border-r-4 border-orange-500"
          >
            {msg}
          </motion.div>
        ))}
      </div>

      {/* CSGO Crosshair */}
      {!isScoped && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-4 bg-green-400" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[2px] w-4 bg-green-400" />
          </div>
        </div>
      )}

      {/* CSGO Scope */}
      {isScoped && (
        <div 
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle, transparent 30%, black 30.5%, black 100%)'
          }}
        >
          <div className="w-full h-[1px] bg-black/50 absolute" />
          <div className="h-full w-[1px] bg-black/50 absolute" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-[10px] text-white/50 font-mono tracking-widest">
            {currentGun.id === 'awp' ? 'AWP SCOPE' : 'ADS'}
          </div>
        </div>
      )}

      {/* CSGO HUD - Bottom Left (Health/Armor) */}
      <div className="absolute bottom-10 left-10 flex items-end gap-8 pointer-events-none">
        <div className="flex items-center gap-4">
          <div className="text-neutral-500 font-bold text-xs uppercase">Health</div>
          <div className="text-6xl font-black text-white">100</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-neutral-500 font-bold text-xs uppercase">Armor</div>
          <div className="text-6xl font-black text-white">100</div>
        </div>
      </div>

      {/* CSGO HUD - Bottom Right (Ammo/Money) */}
      <div className="absolute bottom-10 right-10 text-right pointer-events-none">
        <div className="text-green-500 text-4xl font-mono font-bold mb-4">${money}</div>
        <div className="flex items-end justify-end gap-4">
          <div className="text-6xl font-black text-white">∞</div>
          <div className="text-neutral-500 font-bold text-xs uppercase mb-2">Ammo</div>
        </div>
      </div>

      {/* Shop Menu */}
      <AnimatePresence>
        {showShop && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 p-10"
          >
            <div className="bg-neutral-900 w-full max-w-4xl p-10 rounded-sm border border-white/10">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-4xl font-black italic text-white">BUY MENU</h2>
                <div className="text-green-500 text-3xl font-mono font-bold">${money}</div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {guns.map((gun, idx) => (
                  <button
                    key={gun.id}
                    onClick={() => buyGun(idx)}
                    disabled={!gun.unlocked && money < gun.price}
                    className={`p-6 border transition-all text-left flex flex-col justify-between h-40 ${
                      activeGunIndex === idx 
                        ? 'bg-orange-600 border-orange-400 text-white' 
                        : 'bg-neutral-800 border-white/5 text-neutral-400 hover:border-orange-500/50'
                    } ${!gun.unlocked && money < gun.price ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
                  >
                    <div>
                      <div className="text-xs font-bold uppercase opacity-50 mb-1">{gun.id}</div>
                      <div className="text-xl font-black italic">{gun.name}</div>
                    </div>
                    <div className="text-right font-mono font-bold">
                      {gun.unlocked ? 'OWNED' : `$${gun.price}`}
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="mt-10 text-center text-neutral-500 text-xs uppercase tracking-widest">
                Press <span className="text-white">B</span> to close
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tactical Overlay */}
      <div className="absolute top-10 left-10 pointer-events-none">
        <div className="bg-black/40 px-4 py-2 border-l-2 border-orange-500">
          <div className="text-[10px] text-neutral-500 uppercase font-bold">Map</div>
          <div className="text-white font-black italic">DE_HAOQIAN</div>
        </div>
      </div>
    </div>
  );
}

