'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Float } from '@react-three/drei';
import { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';

// Performance detector
function usePerformanceLevel() {
  const [level, setLevel] = useState<'high' | 'medium' | 'low'>('high');
  
  useEffect(() => {
    // Simple performance detection based on device capabilities
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const hasLowRAM = (navigator as any).deviceMemory && (navigator as any).deviceMemory < 4;
    
    if (isMobile || hasLowRAM) {
      setLevel('low');
    } else if (hasLowRAM) {
      setLevel('medium');
    }
  }, []);
  
  return level;
}

// Animated sphere with brand colors - now with orbital motion
function AnimatedSphere({ position, color, scale = 1, speed = 1, orbit = false }: { 
  position: [number, number, number]; 
  color: string; 
  scale?: number;
  speed?: number;
  orbit?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (orbit && groupRef.current) {
      // Orbital motion around center
      groupRef.current.rotation.y = time * speed * 0.3;
      groupRef.current.rotation.x = Math.sin(time * speed * 0.2) * 0.3;
    }
    
    if (meshRef.current) {
      // Rotation
      meshRef.current.rotation.x += 0.01 * speed;
      meshRef.current.rotation.y += 0.015 * speed;
      
      // Floating motion
      if (!orbit) {
        meshRef.current.position.y = position[1] + Math.sin(time * speed) * 0.5;
        meshRef.current.position.x = position[0] + Math.cos(time * speed * 0.7) * 0.3;
        meshRef.current.position.z = position[2] + Math.sin(time * speed * 0.5) * 0.3;
      }
    }
  });

  const sphere = (
    <Sphere ref={meshRef} args={[1, 64, 64]} position={orbit ? [3, 0, 0] : position} scale={scale}>
      <MeshDistortMaterial
        color={color}
        attach="material"
        distort={0.5}
        speed={3 * speed}
        roughness={0.2}
        metalness={0.9}
      />
    </Sphere>
  );

  return orbit ? (
    <group ref={groupRef}>
      <Float speed={speed * 2} rotationIntensity={0.8} floatIntensity={0.8}>
        {sphere}
      </Float>
    </group>
  ) : (
    <Float speed={speed * 2} rotationIntensity={0.8} floatIntensity={0.8}>
      {sphere}
    </Float>
  );
}

// Particle system for added motion
function Particles({ count = 1000 }: { count?: number }) {
  const particlesRef = useRef<THREE.Points>(null);
  
  const particlesGeometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    // Brand colors
    const blueColor = new THREE.Color('#007FFF');
    const goldColor = new THREE.Color('#D4AF37');
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      
      // Mix of blue and gold particles
      const color = Math.random() > 0.5 ? blueColor : goldColor;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    
    return { positions, colors };
  }, [count]);
  
  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.1;
      particlesRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.5;
      particlesRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.15) * 0.3;
    }
  });
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particlesGeometry.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={particlesGeometry.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

// Frame limiter for better performance on low-end devices
function FrameLimiter({ fps = 30 }: { fps?: number }) {
  const { gl, invalidate } = useThree();
  
  useEffect(() => {
    let lastTime = performance.now();
    const interval = 1000 / fps;
    
    const animate = () => {
      requestAnimationFrame(animate);
      const now = performance.now();
      const delta = now - lastTime;
      
      if (delta > interval) {
        lastTime = now - (delta % interval);
        invalidate();
      }
    };
    
    gl.setAnimationLoop(null);
    animate();
    
    return () => {
      gl.setAnimationLoop(null);
    };
  }, [gl, fps, invalidate]);
  
  return null;
}

// Rotating ring/torus - multiple rings
function AnimatedTorus() {
  const torus1Ref = useRef<THREE.Mesh>(null);
  const torus2Ref = useRef<THREE.Mesh>(null);
  const torus3Ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (torus1Ref.current) {
      torus1Ref.current.rotation.x = time * 0.5;
      torus1Ref.current.rotation.y = time * 0.3;
    }
    
    if (torus2Ref.current) {
      torus2Ref.current.rotation.x = time * -0.4;
      torus2Ref.current.rotation.z = time * 0.3;
    }
    
    if (torus3Ref.current) {
      torus3Ref.current.rotation.y = time * 0.6;
      torus3Ref.current.rotation.z = time * -0.2;
    }
  });
  
  return (
    <>
      <mesh ref={torus1Ref} position={[0, 0, -5]}>
        <torusGeometry args={[3, 0.3, 16, 100]} />
        <meshStandardMaterial
          color="#007FFF"
          transparent
          opacity={0.25}
          roughness={0.1}
          metalness={0.9}
          wireframe
        />
      </mesh>
      <mesh ref={torus2Ref} position={[2, 1, -6]}>
        <torusGeometry args={[2, 0.2, 16, 100]} />
        <meshStandardMaterial
          color="#D4AF37"
          transparent
          opacity={0.2}
          roughness={0.1}
          metalness={0.9}
          wireframe
        />
      </mesh>
      <mesh ref={torus3Ref} position={[-2, -1, -7]}>
        <torusGeometry args={[1.5, 0.15, 16, 100]} />
        <meshStandardMaterial
          color="#0088FF"
          transparent
          opacity={0.2}
          roughness={0.1}
          metalness={0.9}
          wireframe
        />
      </mesh>
    </>
  );
}

// Moving cubes with trails
function MovingCubes() {
  const cube1Ref = useRef<THREE.Mesh>(null);
  const cube2Ref = useRef<THREE.Mesh>(null);
  const cube3Ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (cube1Ref.current) {
      cube1Ref.current.position.x = Math.sin(time * 0.5) * 4;
      cube1Ref.current.position.y = Math.cos(time * 0.7) * 2;
      cube1Ref.current.position.z = Math.sin(time * 0.3) * 3 - 4;
      cube1Ref.current.rotation.x = time;
      cube1Ref.current.rotation.y = time * 0.7;
    }
    
    if (cube2Ref.current) {
      cube2Ref.current.position.x = Math.cos(time * 0.6) * 3;
      cube2Ref.current.position.y = Math.sin(time * 0.8) * 2.5;
      cube2Ref.current.position.z = Math.cos(time * 0.4) * 2 - 5;
      cube2Ref.current.rotation.x = -time * 0.5;
      cube2Ref.current.rotation.z = time * 0.8;
    }
    
    if (cube3Ref.current) {
      cube3Ref.current.position.x = Math.sin(time * 0.4) * 3.5;
      cube3Ref.current.position.y = Math.cos(time * 0.5) * 1.5;
      cube3Ref.current.position.z = Math.sin(time * 0.6) * 2.5 - 6;
      cube3Ref.current.rotation.y = time * 1.2;
      cube3Ref.current.rotation.z = time * 0.4;
    }
  });
  
  return (
    <>
      <mesh ref={cube1Ref}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial
          color="#007FFF"
          transparent
          opacity={0.4}
          roughness={0.3}
          metalness={0.8}
          wireframe
        />
      </mesh>
      <mesh ref={cube2Ref}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial
          color="#D4AF37"
          transparent
          opacity={0.4}
          roughness={0.3}
          metalness={0.8}
          wireframe
        />
      </mesh>
      <mesh ref={cube3Ref}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial
          color="#0088FF"
          transparent
          opacity={0.4}
          roughness={0.3}
          metalness={0.8}
          wireframe
        />
      </mesh>
    </>
  );
}

// Main scene component
function Scene({ performanceLevel }: { performanceLevel: 'high' | 'medium' | 'low' }) {
  const particleCount = performanceLevel === 'high' ? 1000 : performanceLevel === 'medium' ? 500 : 300;
  const showTorus = performanceLevel !== 'low';
  const sphereCount = performanceLevel === 'high' ? 4 : performanceLevel === 'medium' ? 3 : 2;
  
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#D4AF37" />
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#007FFF" />
      
      {/* Animated spheres with brand colors */}
      <AnimatedSphere position={[-3, 0, -2]} color="#007FFF" scale={1.5} speed={1} />
      <AnimatedSphere position={[3, -1, -3]} color="#D4AF37" scale={1.2} speed={0.8} />
      {sphereCount >= 3 && <AnimatedSphere position={[0, 2, -4]} color="#0066CC" scale={0.8} speed={1.2} />}
      {sphereCount >= 4 && <AnimatedSphere position={[-2, -2, -5]} color="#FFD700" scale={1} speed={0.9} />}
      
      {/* Rotating torus */}
      {showTorus && <AnimatedTorus />}
      
      {/* Particle system */}
      <Particles count={particleCount} />
      
      {/* Frame limiter for low-end devices */}
      {performanceLevel === 'low' && <FrameLimiter fps={30} />}
    </>
  );
}

// Main component export
export default function AnimatedBackground3D() {
  const performanceLevel = usePerformanceLevel();
  
  return (
    <div className="fixed inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 75 }}
        gl={{ 
          alpha: true, 
          antialias: performanceLevel === 'high',
          powerPreference: 'high-performance',
        }}
        dpr={performanceLevel === 'high' ? [1, 2] : 1}
        frameloop={performanceLevel === 'low' ? 'demand' : 'always'}
      >
        <Scene performanceLevel={performanceLevel} />
        {/* Subtle orbit controls for interactivity */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={1}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}
