"use client";

import { RoundedBox } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { CanvasTexture, Color, InstancedMesh, Object3D } from "three";

type Position = [number, number, number];

const stones = [
  { z: 2.3, width: 1.32, rotation: -0.04 },
  { z: 3.2, width: 1.46, rotation: 0.035 },
  { z: 4.2, width: 1.58, rotation: -0.025 },
  { z: 5.35, width: 1.74, rotation: 0.04 },
  { z: 6.62, width: 1.94, rotation: -0.03 },
  { z: 8.02, width: 2.08, rotation: 0.025 },
];

function noise(index: number) {
  const value = Math.sin(index * 91.173 + 17.31) * 43758.5453;
  return value - Math.floor(value);
}

function GrassField({ mobile }: { mobile: boolean }) {
  const mesh = useRef<InstancedMesh>(null);
  const { invalidate } = useThree();
  const instances = useMemo(() => {
    const amount = mobile ? 300 : 1050;
    const result: Array<{
      x: number;
      z: number;
      scale: number;
      rotation: number;
      color: string;
    }> = [];
    const palette = ["#5f7c58", "#6f8a63", "#7f976f", "#526f50"];

    for (let index = 0; result.length < amount && index < amount * 5; index += 1) {
      const x = (noise(index * 7 + 2) - 0.5) * 25;
      const z = -5 + noise(index * 7 + 3) * 28;
      const insideHouse = Math.abs(x) < 3.65 && z > -2.35 && z < 2.15;
      const insidePath = Math.abs(x) < 1.24 + z * 0.035 && z > 1.4 && z < 9.2;
      if (insideHouse || insidePath) continue;

      result.push({
        x,
        z,
        scale: 0.58 + noise(index * 7 + 4) * 1.08,
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

    instances.forEach((blade, index) => {
      dummy.position.set(blade.x, 0.14 * blade.scale, blade.z);
      dummy.rotation.set(0, blade.rotation, (noise(index + 2100) - 0.5) * 0.16);
      dummy.scale.set(0.72 + noise(index + 2500) * 0.55, blade.scale, 0.72);
      dummy.updateMatrix();
      mesh.current?.setMatrixAt(index, dummy.matrix);
      mesh.current?.setColorAt(index, color.set(blade.color));
    });

    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    invalidate();
  }, [instances, invalidate]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, instances.length]}>
      <coneGeometry args={[0.027, 0.28, 3, 1]} />
      <meshStandardMaterial roughness={1} vertexColors />
    </instancedMesh>
  );
}

function GardenTree({
  position,
  scale = 1,
  warm = false,
}: {
  position: Position;
  scale?: number;
  warm?: boolean;
}) {
  const leaves = warm
    ? ["#55704f", "#6f855d", "#7e9169"]
    : ["#496848", "#5d7b55", "#718b63"];
  const clusters: Array<[number, number, number, number]> = [
    [-0.48, 2.36, 0.04, 0.82],
    [0.42, 2.52, 0.12, 0.9],
    [0, 3.0, -0.08, 1.03],
    [-0.68, 2.92, -0.2, 0.7],
    [0.68, 3.06, -0.12, 0.74],
    [-0.22, 3.52, 0.02, 0.68],
    [0.28, 3.64, -0.18, 0.62],
  ];

  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.15, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.3, 2.3, 12]} />
        <meshStandardMaterial color="#665443" roughness={0.98} />
      </mesh>
      <mesh position={[-0.22, 2.05, 0]} rotation={[0, 0, -0.55]} castShadow>
        <cylinderGeometry args={[0.08, 0.13, 1.18, 10]} />
        <meshStandardMaterial color="#665443" roughness={0.98} />
      </mesh>
      <mesh position={[0.28, 2.22, -0.04]} rotation={[0, 0, 0.62]} castShadow>
        <cylinderGeometry args={[0.07, 0.12, 1.1, 10]} />
        <meshStandardMaterial color="#665443" roughness={0.98} />
      </mesh>
      {clusters.map(([x, y, z, radius], index) => (
        <mesh position={[x, y, z]} scale={[1.08, 0.84, 1]} castShadow receiveShadow key={`${x}-${y}`}>
          <icosahedronGeometry args={[radius, 1]} />
          <meshStandardMaterial color={leaves[index % leaves.length]} roughness={1} flatShading />
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
    [-0.42, 0.84, 0.04],
    [0, 1.02, 0],
    [0.4, 0.82, 0.08],
    [-0.12, 0.7, 0.34],
    [0.24, 0.72, -0.3],
  ];

  return (
    <group position={position} scale={scale}>
      {[-0.38, 0, 0.38].map((x, index) => (
        <mesh position={[x, 0.38 + index * 0.04, index % 2 ? 0.08 : -0.04]} scale={[1, 0.85, 1]} castShadow key={x}>
          <icosahedronGeometry args={[0.48, 1]} />
          <meshStandardMaterial color={index === 1 ? "#557451" : "#67835d"} roughness={1} flatShading />
        </mesh>
      ))}
      {flowers.map(([x, y, z], clusterIndex) => (
        <group position={[x, y, z]} key={`${x}-${z}`}>
          {Array.from({ length: 7 }, (_, flowerIndex) => {
            const angle = (flowerIndex / 7) * Math.PI * 2;
            const radius = flowerIndex === 0 ? 0 : 0.13;
            return (
              <mesh
                position={[Math.cos(angle) * radius, flowerIndex === 0 ? 0.06 : 0, Math.sin(angle) * radius]}
                key={flowerIndex}
              >
                <sphereGeometry args={[0.095 + (clusterIndex % 2) * 0.012, 10, 8]} />
                <meshStandardMaterial color={bloom} roughness={0.9} />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}

function PathLantern({ position, light = false }: { position: Position; light?: boolean }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.055, 0.84, 10]} />
        <meshStandardMaterial color="#344238" metalness={0.38} roughness={0.6} />
      </mesh>
      <RoundedBox args={[0.24, 0.3, 0.24]} position={[0, 0.92, 0]} radius={0.035} smoothness={3} castShadow>
        <meshStandardMaterial
          color="#ead8b9"
          emissive="#ffc77c"
          emissiveIntensity={1.8}
          metalness={0.08}
          roughness={0.32}
        />
      </RoundedBox>
      <mesh position={[0, 1.1, 0]} castShadow>
        <coneGeometry args={[0.2, 0.13, 4]} />
        <meshStandardMaterial color="#344238" metalness={0.32} roughness={0.64} />
      </mesh>
      {light && <pointLight color="#ffc77c" intensity={0.55} distance={3.2} decay={2} position={[0, 0.95, 0]} />}
    </group>
  );
}

function GardenBench({ position }: { position: Position }) {
  return (
    <group position={position} rotation={[0, 0.22, 0]}>
      {[0.42, 0.68, 0.94].map((y) => (
        <RoundedBox args={[2.1, 0.14, 0.12]} position={[0, y, 0.16]} radius={0.035} smoothness={3} castShadow key={y}>
          <meshStandardMaterial color="#8b7056" roughness={0.9} />
        </RoundedBox>
      ))}
      <RoundedBox args={[2.15, 0.16, 0.58]} position={[0, 0.45, -0.14]} radius={0.045} smoothness={3} castShadow>
        <meshStandardMaterial color="#92775d" roughness={0.9} />
      </RoundedBox>
      {[-0.8, 0.8].map((x) => (
        <group position={[x, 0, 0]} key={x}>
          <mesh position={[0, 0.26, -0.12]} castShadow>
            <boxGeometry args={[0.1, 0.52, 0.1]} />
            <meshStandardMaterial color="#344238" metalness={0.35} roughness={0.62} />
          </mesh>
          <mesh position={[0, 0.52, 0.18]} castShadow>
            <boxGeometry args={[0.1, 0.96, 0.1]} />
            <meshStandardMaterial color="#344238" metalness={0.35} roughness={0.62} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function WindowPlanter({ x }: { x: number }) {
  const leaves = [-0.5, -0.28, 0, 0.28, 0.5];
  return (
    <group position={[x, -0.88, 1.98]}>
      <RoundedBox args={[1.28, 0.28, 0.34]} radius={0.05} smoothness={3} castShadow>
        <meshStandardMaterial color="#765e48" roughness={0.93} />
      </RoundedBox>
      {leaves.map((leafX, index) => (
        <group position={[leafX, 0.25 + (index % 2) * 0.05, 0]} key={leafX}>
          <mesh rotation={[0, 0, index % 2 ? 0.45 : -0.45]} scale={[0.65, 1, 0.38]}>
            <sphereGeometry args={[0.18, 12, 8]} />
            <meshStandardMaterial color={index % 2 ? "#6f8865" : "#557451"} roughness={1} />
          </mesh>
          <mesh position={[0, 0.2, 0.03]}>
            <sphereGeometry args={[0.09, 10, 8]} />
            <meshStandardMaterial color={index % 2 ? "#ead9b6" : "#dfb8b1"} roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function GardenEnvironment({
  groundMap,
  houseX,
  mobile,
}: {
  groundMap: CanvasTexture;
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
          bumpScale={0.045}
          color="#76936a"
          roughness={1}
        />
      </mesh>

      <GrassField mobile={mobile} />

      {stones.map((stone) => (
        <RoundedBox
          args={[stone.width, 0.1, 0.7]}
          position={[0, 0.06, stone.z]}
          rotation={[0, stone.rotation, 0]}
          radius={0.08}
          smoothness={4}
          receiveShadow
          castShadow
          key={stone.z}
        >
          <meshStandardMaterial color="#d5c7b4" roughness={0.98} />
        </RoundedBox>
      ))}

      <GardenTree position={[-5.5, 0, 1.25]} scale={0.92} />
      <GardenTree position={[5.6, 0, 1.7]} scale={1.03} warm />
      {!mobile && (
        <>
          <GardenTree position={[-7.3, 0, 8.8]} scale={1.3} warm />
          <GardenTree position={[7.4, 0, 9.8]} scale={1.22} />
        </>
      )}

      <Hydrangea position={[-3.75, 0, 1.2]} scale={0.86} bloom="#d9b4ad" />
      <Hydrangea position={[3.82, 0, 1.05]} scale={0.9} bloom="#ead9b6" />
      <Hydrangea position={[-4.4, 0, 3.0]} scale={0.72} bloom="#c7b8d2" />
      <Hydrangea position={[4.45, 0, 3.25]} scale={0.76} bloom="#d8c1d7" />

      <PathLantern position={[-1.48, 0, 3.0]} light={!mobile} />
      <PathLantern position={[1.5, 0, 4.15]} />
      <PathLantern position={[-1.68, 0, 5.35]} />
      <PathLantern position={[1.85, 0, 6.65]} light={!mobile} />

      {!mobile && <GardenBench position={[-4.9, 0, 4.5]} />}

      <mesh position={[-9, -2.9, 13]} scale={[2.4, 0.85, 1.8]} receiveShadow>
        <sphereGeometry args={[3.6, 24, 16]} />
        <meshStandardMaterial color="#69845e" roughness={1} />
      </mesh>
      <mesh position={[9.5, -3.1, 14]} scale={[2.7, 0.85, 2]} receiveShadow>
        <sphereGeometry args={[3.8, 24, 16]} />
        <meshStandardMaterial color="#718a65" roughness={1} />
      </mesh>
    </group>
  );
}
