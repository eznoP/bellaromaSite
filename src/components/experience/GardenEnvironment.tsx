"use client";

import { RoundedBox } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  InstancedMesh,
  Object3D,
} from "three";

type Position = [number, number, number];

const steppingStones = [
  { x: 0.02, z: 2.36, width: 0.78, depth: 0.48, rotation: -0.04 },
  { x: -0.04, z: 3.22, width: 0.72, depth: 0.5, rotation: 0.07 },
  { x: 0.05, z: 4.12, width: 0.82, depth: 0.53, rotation: -0.08 },
  { x: -0.03, z: 5.06, width: 0.77, depth: 0.5, rotation: 0.04 },
  { x: 0.04, z: 6.04, width: 0.84, depth: 0.55, rotation: -0.035 },
  { x: -0.02, z: 7.08, width: 0.8, depth: 0.52, rotation: 0.055 },
  { x: 0.03, z: 8.18, width: 0.88, depth: 0.58, rotation: -0.025 },
];

function noise(index: number) {
  const value = Math.sin(index * 91.173 + 17.31) * 43758.5453;
  return value - Math.floor(value);
}

function createGrassTuftGeometry() {
  const geometry = new BufferGeometry();
  const positions: number[] = [];

  for (let blade = 0; blade < 3; blade += 1) {
    const angle = (blade / 3) * Math.PI;
    const halfWidth = 0.042;
    const height = 0.3 + blade * 0.028;
    const rightX = Math.cos(angle) * halfWidth;
    const rightZ = Math.sin(angle) * halfWidth;
    const tipX = Math.cos(angle + Math.PI / 2) * 0.025;
    const tipZ = Math.sin(angle + Math.PI / 2) * 0.025;

    positions.push(
      -rightX, 0, -rightZ,
      rightX, 0, rightZ,
      tipX, height, tipZ,
    );
  }

  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function GrassField({ mobile }: { mobile: boolean }) {
  const mesh = useRef<InstancedMesh>(null);
  const { invalidate } = useThree();
  const geometry = useMemo(() => createGrassTuftGeometry(), []);
  const instances = useMemo(() => {
    const amount = mobile ? 230 : 620;
    const result: Array<{
      x: number;
      z: number;
      scale: number;
      rotation: number;
      color: string;
    }> = [];
    const palette = ["#5f7958", "#6f865f", "#7f956e", "#526d50"];

    for (let index = 0; result.length < amount && index < amount * 8; index += 1) {
      const x = (noise(index * 7 + 2) - 0.5) * 25;
      const z = -4 + noise(index * 7 + 3) * 27;
      const insideHouse = Math.abs(x) < 3.75 && z > -2.4 && z < 2.25;
      const insidePath = Math.abs(x) < 1.15 && z > 1.55 && z < 9.1;
      const heroClearance = x < -5.4 && z < 5.8;
      if (insideHouse || insidePath || heroClearance) continue;

      result.push({
        x,
        z,
        scale: 0.58 + noise(index * 7 + 4) * 0.72,
        rotation: noise(index * 7 + 5) * Math.PI,
        color: palette[Math.floor(noise(index * 7 + 6) * palette.length)],
      });
    }
    return result;
  }, [mobile]);

  useLayoutEffect(() => {
    if (!mesh.current) return;
    const dummy = new Object3D();
    const color = new Color();

    instances.forEach((tuft, index) => {
      dummy.position.set(tuft.x, 0.012, tuft.z);
      dummy.rotation.set(0, tuft.rotation, 0);
      dummy.scale.set(
        0.82 + noise(index + 2400) * 0.36,
        tuft.scale,
        0.82 + noise(index + 2600) * 0.3,
      );
      dummy.updateMatrix();
      mesh.current?.setMatrixAt(index, dummy.matrix);
      mesh.current?.setColorAt(index, color.set(tuft.color));
    });

    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
    invalidate();
  }, [instances, invalidate]);

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, undefined, instances.length]}
      receiveShadow
    >
      <meshStandardMaterial
        color="#708967"
        emissive="#1d2d1d"
        emissiveIntensity={0.055}
        roughness={1}
        side={DoubleSide}
        vertexColors
      />
    </instancedMesh>
  );
}

function GardenTree({
  position,
  scale = 1,
  woodMap,
  warm = false,
}: {
  position: Position;
  scale?: number;
  woodMap: CanvasTexture;
  warm?: boolean;
}) {
  const leaves = warm
    ? ["#5f7653", "#70845d", "#7f9169"]
    : ["#4f6b4c", "#607b56", "#718b63"];
  const clusters: Array<[number, number, number, number, number]> = [
    [-0.5, 2.5, 0.05, 0.9, 0.75],
    [0.44, 2.55, 0.12, 0.94, 0.78],
    [0, 3.03, -0.08, 1.08, 0.88],
    [-0.7, 3.0, -0.15, 0.76, 0.7],
    [0.72, 3.08, -0.1, 0.79, 0.72],
    [-0.28, 3.57, 0.02, 0.75, 0.68],
    [0.34, 3.6, -0.14, 0.7, 0.65],
  ];

  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.24, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.17, 0.3, 2.48, 24]} />
        <meshStandardMaterial map={woodMap} color="#725f4c" roughness={0.96} />
      </mesh>
      {[-0.38, 0, 0.38].map((rotation) => (
        <mesh
          position={[Math.sin(rotation) * 0.18, 0.17, Math.cos(rotation) * 0.13]}
          rotation={[0, rotation, Math.sin(rotation) * 0.18]}
          scale={[1, 0.72, 1]}
          castShadow
          receiveShadow
          key={rotation}
        >
          <sphereGeometry args={[0.31, 20, 12]} />
          <meshStandardMaterial map={woodMap} color="#695642" roughness={1} />
        </mesh>
      ))}
      {clusters.map(([x, y, z, radius, yScale], index) => (
        <mesh
          position={[x, y, z]}
          scale={[1.08, yScale, 1]}
          castShadow
          receiveShadow
          key={`${x}-${y}`}
        >
          <sphereGeometry args={[radius, 22, 16]} />
          <meshStandardMaterial color={leaves[index % leaves.length]} roughness={0.97} />
        </mesh>
      ))}
    </group>
  );
}

function Hydrangea({
  position,
  scale = 1,
  bloom = "#dfb8b1",
}: {
  position: Position;
  scale?: number;
  bloom?: string;
}) {
  const flowers: Position[] = [
    [-0.4, 0.78, 0.04],
    [0, 0.96, 0],
    [0.4, 0.78, 0.08],
    [-0.12, 0.67, 0.32],
    [0.24, 0.69, -0.28],
  ];

  return (
    <group position={position} scale={scale}>
      {[-0.36, 0, 0.36].map((x, index) => (
        <mesh
          position={[x, 0.36 + index * 0.035, index % 2 ? 0.08 : -0.04]}
          scale={[1, 0.82, 1]}
          castShadow
          receiveShadow
          key={x}
        >
          <sphereGeometry args={[0.48, 18, 12]} />
          <meshStandardMaterial color={index === 1 ? "#557451" : "#67835d"} roughness={1} />
        </mesh>
      ))}
      {flowers.map(([x, y, z], clusterIndex) => (
        <group position={[x, y, z]} key={`${x}-${z}`}>
          {Array.from({ length: 7 }, (_, flowerIndex) => {
            const angle = (flowerIndex / 7) * Math.PI * 2;
            const radius = flowerIndex === 0 ? 0 : 0.125;
            return (
              <mesh
                position={[Math.cos(angle) * radius, flowerIndex === 0 ? 0.055 : 0, Math.sin(angle) * radius]}
                castShadow
                key={flowerIndex}
              >
                <sphereGeometry args={[0.09 + (clusterIndex % 2) * 0.01, 12, 9]} />
                <meshStandardMaterial color={bloom} roughness={0.9} />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}

function PathLantern({ position }: { position: Position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.36, 0]} castShadow>
        <cylinderGeometry args={[0.032, 0.05, 0.72, 14]} />
        <meshStandardMaterial color="#344238" metalness={0.28} roughness={0.66} />
      </mesh>
      <RoundedBox args={[0.21, 0.27, 0.21]} position={[0, 0.79, 0]} radius={0.025} smoothness={3} castShadow>
        <meshStandardMaterial
          color="#e7d8be"
          emissive="#e7ad62"
          emissiveIntensity={0.42}
          metalness={0.04}
          roughness={0.52}
        />
      </RoundedBox>
      <mesh position={[0, 0.97, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.17, 0.12, 4]} />
        <meshStandardMaterial color="#344238" metalness={0.25} roughness={0.68} />
      </mesh>
    </group>
  );
}

function GardenBench({ position }: { position: Position }) {
  const woodColor = "#8f7255";
  const metalColor = "#344238";

  return (
    <group position={position} rotation={[0, -Math.PI / 2, 0]}>
      {[0.38, 0.6, 0.82].map((y) => (
        <RoundedBox args={[2.05, 0.13, 0.11]} position={[0, y, 0.2]} radius={0.028} smoothness={3} castShadow receiveShadow key={y}>
          <meshStandardMaterial color={woodColor} roughness={0.86} />
        </RoundedBox>
      ))}
      {[-0.19, 0.02, 0.23].map((z) => (
        <RoundedBox args={[2.08, 0.12, 0.18]} position={[0, 0.43, z]} radius={0.03} smoothness={3} castShadow receiveShadow key={z}>
          <meshStandardMaterial color="#987a5b" roughness={0.86} />
        </RoundedBox>
      ))}
      {[-0.82, 0.82].map((x) => (
        <group position={[x, 0, 0]} key={x}>
          <mesh position={[0, 0.25, -0.16]} castShadow receiveShadow>
            <boxGeometry args={[0.09, 0.5, 0.09]} />
            <meshStandardMaterial color={metalColor} metalness={0.25} roughness={0.68} />
          </mesh>
          <mesh position={[0, 0.47, 0.2]} castShadow receiveShadow>
            <boxGeometry args={[0.09, 0.92, 0.09]} />
            <meshStandardMaterial color={metalColor} metalness={0.25} roughness={0.68} />
          </mesh>
          <RoundedBox args={[0.09, 0.09, 0.62]} position={[0, 0.59, -0.01]} radius={0.025} smoothness={3} castShadow>
            <meshStandardMaterial color={metalColor} metalness={0.25} roughness={0.68} />
          </RoundedBox>
        </group>
      ))}
    </group>
  );
}

export function WindowPlanter({ x }: { x: number }) {
  const leaves = [-0.5, -0.28, 0, 0.28, 0.5];
  return (
    <group position={[x, -0.88, 1.98]}>
      <RoundedBox args={[1.28, 0.28, 0.34]} radius={0.05} smoothness={3} castShadow receiveShadow>
        <meshStandardMaterial color="#765e48" roughness={0.93} />
      </RoundedBox>
      {leaves.map((leafX, index) => (
        <group position={[leafX, 0.25 + (index % 2) * 0.05, 0]} key={leafX}>
          <mesh rotation={[0, 0, index % 2 ? 0.45 : -0.45]} scale={[0.65, 1, 0.38]} castShadow>
            <sphereGeometry args={[0.18, 14, 10]} />
            <meshStandardMaterial color={index % 2 ? "#6f8865" : "#557451"} roughness={1} />
          </mesh>
          <mesh position={[0, 0.2, 0.03]} castShadow>
            <sphereGeometry args={[0.09, 12, 9]} />
            <meshStandardMaterial color={index % 2 ? "#ead9b6" : "#dfb8b1"} roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function GardenEnvironment({
  groundMap,
  woodMap,
  houseX,
  mobile,
}: {
  groundMap: CanvasTexture;
  woodMap: CanvasTexture;
  houseX: number;
  mobile: boolean;
}) {
  return (
    <group position={[houseX, -2.17, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial
          map={groundMap}
          bumpMap={groundMap}
          bumpScale={0.035}
          color="#78906d"
          roughness={1}
        />
      </mesh>

      <GrassField mobile={mobile} />

      {steppingStones.map((stone, index) => (
        <mesh
          position={[stone.x, 0.045 + (index % 2) * 0.006, stone.z]}
          rotation={[0, stone.rotation, 0]}
          scale={[stone.width, 1, stone.depth]}
          receiveShadow
          castShadow
          key={stone.z}
        >
          <cylinderGeometry args={[1, 1.04, 0.09, 12]} />
          <meshStandardMaterial color={index % 2 ? "#b7aa99" : "#c4b7a4"} roughness={0.98} />
        </mesh>
      ))}

      <GardenTree position={[-4.65, 0, -0.65]} scale={0.86} woodMap={woodMap} />
      <GardenTree position={[5.15, 0, 0.45]} scale={1.02} woodMap={woodMap} warm />
      {!mobile && (
        <GardenTree position={[7.7, 0, 9.8]} scale={1.18} woodMap={woodMap} />
      )}

      <Hydrangea position={[-3.88, 0, 1.28]} scale={0.82} bloom="#d9b4ad" />
      <Hydrangea position={[3.9, 0, 1.18]} scale={0.86} bloom="#ead9b6" />
      <Hydrangea position={[-4.25, 0, 3.12]} scale={0.66} bloom="#c7b8d2" />
      <Hydrangea position={[4.55, 0, 3.4]} scale={0.7} bloom="#d8c1d7" />

      <PathLantern position={[-1.38, 0, 3.18]} />
      <PathLantern position={[1.42, 0, 4.36]} />
      <PathLantern position={[-1.48, 0, 5.72]} />
      <PathLantern position={[1.55, 0, 7.18]} />

      {!mobile && <GardenBench position={[-4.72, 0, 5.35]} />}

      <mesh position={[-10, -3.1, 14]} scale={[2.7, 0.8, 2]} receiveShadow>
        <sphereGeometry args={[3.8, 28, 18]} />
        <meshStandardMaterial color="#6d865f" roughness={1} />
      </mesh>
      <mesh position={[10.5, -3.15, 14.5]} scale={[2.8, 0.82, 2.1]} receiveShadow>
        <sphereGeometry args={[3.9, 28, 18]} />
        <meshStandardMaterial color="#748c67" roughness={1} />
      </mesh>
    </group>
  );
}
