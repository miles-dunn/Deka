"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const vertexShader = `
  uniform float time;
  uniform float intensity;
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    vPosition = position;
    
    vec3 pos = position;
    pos.y += sin(pos.x * 10.0 + time) * 0.1 * intensity;
    pos.x += cos(pos.y * 8.0 + time * 1.5) * 0.05 * intensity;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform float time;
  uniform float intensity;
  uniform vec3 color1;
  uniform vec3 color2;
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    vec2 uv = vUv;
    
    float noise = sin(uv.x * 20.0 + time) * cos(uv.y * 15.0 + time * 0.8);
    noise += sin(uv.x * 35.0 - time * 2.0) * cos(uv.y * 25.0 + time * 1.2) * 0.5;
    
    vec3 color = mix(color1, color2, noise * 0.5 + 0.5);
    color = mix(color, vec3(1.0), pow(abs(noise), 2.0) * intensity);
    
    float glow = 1.0 - length(uv - 0.5) * 2.0;
    glow = pow(glow, 2.0);
    
    gl_FragColor = vec4(color * glow, glow * 0.8);
  }
`;

export function ShaderPlane({
  position,
  color1 = "#47643f",
  color2 = "#dfe7d8"
}: {
  position: [number, number, number];
  color1?: string;
  color2?: string;
}) {
  const mesh = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      intensity: { value: 1.0 },
      color1: { value: new THREE.Color(color1) },
      color2: { value: new THREE.Color(color2) }
    }),
    [color1, color2]
  );

  useFrame((state) => {
    if (!mesh.current) return;
    uniforms.time.value = state.clock.elapsedTime;
    uniforms.intensity.value = 1.0 + Math.sin(state.clock.elapsedTime * 2) * 0.25;
  });

  return (
    <mesh ref={mesh} position={position}>
      <planeGeometry args={[7.2, 4.2, 48, 48]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function EnergyRing({
  radius = 1,
  position = [0, 0, 0]
}: {
  radius?: number;
  position?: [number, number, number];
}) {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!mesh.current) return;
    mesh.current.rotation.z = state.clock.elapsedTime * 0.35;
    const material = mesh.current.material as THREE.MeshBasicMaterial;
    material.opacity = 0.35 + Math.sin(state.clock.elapsedTime * 2.3) * 0.18;
  });

  return (
    <mesh ref={mesh} position={position}>
      <ringGeometry args={[radius * 0.8, radius, 64]} />
      <meshBasicMaterial color="#7ea06e" transparent opacity={0.4} side={THREE.DoubleSide} />
    </mesh>
  );
}

type BackgroundPaperShadersProps = {
  className?: string;
};

export default function BackgroundPaperShaders({ className }: BackgroundPaperShadersProps) {
  return (
    <div className={className ?? ""}>
      <Canvas
        camera={{ position: [0, 0, 3], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.2} />
        <ShaderPlane position={[0, 0, 0]} color1="#2f4a2b" color2="#d7e3ce" />
        <ShaderPlane position={[0, -0.8, -0.2]} color1="#1f2f1c" color2="#8ea97f" />
        <EnergyRing radius={1.45} position={[1.8, -0.2, 0.3]} />
      </Canvas>
    </div>
  );
}
