"use client";

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

// World Y the lawn actually sits at. The house's foundation slab in
// AtelierHouseScene is tuned to land exactly here too, so the plinth reads
// as planted in the ground instead of hovering a hair above it.
const GROUND_Y = -2.2;

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

  for (let blade = 0; blade < 4; blade += 1) {
    const angle = (blade / 4) * Math.PI * 1.15;
    const halfWidth = 0.038;
    const height = 0.27 + blade * 0.035;
    const bend = 0.05 + blade * 0.01;
    const rightX = Math.cos(angle) * halfWidth;
    const rightZ = Math.sin(angle) * halfWidth;
    const tipX = Math.cos(angle + Math.PI / 2) * bend;
    const tipZ = Math.sin(angle + Math.PI / 2) * bend;

    positions.push(-rightX, 0, -rightZ, rightX, 0, rightZ, tipX, height, tipZ);
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
    const amount = mobile ? 260 : 720;
    const result: { x: number; z: number; scale: number; rotation: number; color: string }[] = [];
    const palette = ["#5f7958", "#6f865f", "#7f956e", "#526d50", "#8a9d6f"];

    for (let index = 0; result.length < amount && index < amount * 8; index += 1) {
      const x = (noise(index * 7 + 2) - 0.5) * 27;
      const z = -4 + noise(index * 7 + 3) * 29;
      const insideHouse = Math.abs(x) < 3.75 && z > -2.4 && z < 2.25;
      const insidePath = Math.abs(x) < 1.15 && z > 1.55 && z < 9.1;
      const heroClearance = x < -5.4 && z < 5.8;
      if (insideHouse || insidePath || heroClearance) continue;

      result.push({
        x,
        z,
        scale: 0.56 + noise(index * 7 + 4) * 0.76,
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
    <instancedMesh ref={mesh} args={[geometry, undefined, instances.length]} receiveShadow>
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

const TREE_CANOPY_CLUSTERS: [number, number, number, number, number][] = [
  [-0.5, 2.5, 0.05, 0.9, 0.75],
  [0.44, 2.55, 0.12, 0.94, 0.78],
  [0, 3.03, -0.08, 1.08, 0.88],
  [-0.7, 3.0, -0.15, 0.76, 0.7],
  [0.72, 3.08, -0.1, 0.79, 0.72],
  [-0.28, 3.57, 0.02, 0.75, 0.68],
  [0.34, 3.6, -0.14, 0.7, 0.65],
];

function GardenTree({
  position,
  scale = 1,
  woodMap,
  warm = false,
  seed = 0,
}: {
  position: Position;
  scale?: number;
  woodMap: CanvasTexture;
  warm?: boolean;
  seed?: number;
}) {
  const leaves = warm
    ? ["#63794f", "#75895a", "#899a5f"]
    : ["#4f6b4c", "#607b56", "#718b63"];

  // Every tree reuses the same base silhouette, but each gets its own light
  // jitter (position, radius, rotation) derived from a per-instance seed so
  // no two trees in the garden read as the exact same stamped asset.
  const jitter = useMemo(() => {
    const rand = (offset: number) => noise(seed * 97 + offset);
    return TREE_CANOPY_CLUSTERS.map((cluster, index) => {
      const n1 = rand(index * 4 + 1);
      const n2 = rand(index * 4 + 2);
      const n3 = rand(index * 4 + 3);
      const n4 = rand(index * 4 + 4);
      return {
        x: cluster[0] + (n1 - 0.5) * 0.22,
        y: cluster[1] + (n2 - 0.5) * 0.16,
        z: cluster[2] + (n3 - 0.5) * 0.22,
        radius: cluster[3] * (0.92 + n4 * 0.16),
        yScale: cluster[4] * (0.94 + n1 * 0.12),
        rotation: (n2 - 0.5) * 0.6,
      };
    });
  }, [seed]);

  const leanX = (noise(seed * 53 + 11) - 0.5) * 0.05;
  const leanZ = (noise(seed * 53 + 23) - 0.5) * 0.05;

  return (
    <group position={position} scale={scale} rotation={[0, noise(seed * 31 + 7) * Math.PI * 2, 0]}>
      <mesh position={[0, 1.24, 0]} rotation={[leanZ, 0, leanX]} castShadow receiveShadow>
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
      {jitter.map((cluster, index) => (
        <mesh
          position={[cluster.x, cluster.y, cluster.z]}
          rotation={[0, cluster.rotation, 0]}
          scale={[1.08, cluster.yScale, 1]}
          castShadow
          receiveShadow
          key={`${TREE_CANOPY_CLUSTERS[index][0]}-${TREE_CANOPY_CLUSTERS[index][1]}`}
        >
          <sphereGeometry args={[cluster.radius, 22, 16]} />
          <meshStandardMaterial color={leaves[index % leaves.length]} roughness={0.97} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * A small, believable blossom: five outward-tilted petals around a raised
 * center, built from flattened spheres rather than the single stretched ball
 * the old garden used. Cheap (one draw call's worth of primitives) but reads
 * as an actual flower instead of a smear of geometry.
 */
function Blossom({
  position,
  scale = 1,
  petalColor,
  centerColor = "#f4d58d",
  petals = 5,
}: {
  position: Position;
  scale?: number;
  petalColor: string;
  centerColor?: string;
  petals?: number;
}) {
  return (
    <group position={position} scale={scale}>
      {Array.from({ length: petals }, (_, index) => {
        const angle = (index / petals) * Math.PI * 2;
        return (
          <mesh
            position={[Math.cos(angle) * 0.055, 0.014, Math.sin(angle) * 0.055]}
            rotation={[0.55, angle, 0]}
            scale={[0.05, 0.022, 0.085]}
            castShadow
            key={index}
          >
            <sphereGeometry args={[1, 8, 6]} />
            <meshStandardMaterial color={petalColor} roughness={0.82} side={DoubleSide} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.026, 0]} castShadow>
        <sphereGeometry args={[0.03, 10, 8]} />
        <meshStandardMaterial
          color={centerColor}
          roughness={0.7}
          emissive={centerColor}
          emissiveIntensity={0.12}
        />
      </mesh>
    </group>
  );
}

function FlowerStem({
  position,
  height = 0.22,
  bloomColor,
  leanSeed = 0,
}: {
  position: Position;
  height?: number;
  bloomColor: string;
  leanSeed?: number;
}) {
  const lean = (noise(leanSeed + 1) - 0.5) * 0.16;
  return (
    <group position={position} rotation={[0, noise(leanSeed + 2) * Math.PI, 0]}>
      <mesh position={[0, height / 2, 0]} rotation={[0, 0, lean]} castShadow>
        <cylinderGeometry args={[0.006, 0.008, height, 5]} />
        <meshStandardMaterial color="#5f7952" roughness={0.9} />
      </mesh>
      <mesh
        position={[Math.sin(lean) * 0.03, height * 0.55, 0]}
        rotation={[0.3, 0, lean + 0.5]}
        scale={[0.6, 0.24, 1]}
        castShadow
      >
        <sphereGeometry args={[0.05, 8, 6]} />
        <meshStandardMaterial color="#68855a" roughness={0.94} side={DoubleSide} />
      </mesh>
      <Blossom
        position={[Math.sin(lean) * height * 0.55, height, Math.cos(lean) * 0.01]}
        scale={0.85 + noise(leanSeed + 3) * 0.3}
        petalColor={bloomColor}
      />
    </group>
  );
}

/**
 * A low mounded flowerbed: foliage base plus a handful of proper Blossom
 * heads, used both as a standalone garden bush and as foundation planting
 * hugging the house base.
 */
function FlowerClump({
  position,
  scale = 1,
  bloom = "#dfb8b1",
  seed = 0,
}: {
  position: Position;
  scale?: number;
  bloom?: string;
  seed?: number;
}) {
  const blooms: Position[] = [
    [-0.22, 0.34, 0.02],
    [0.05, 0.4, -0.05],
    [0.24, 0.32, 0.08],
    [-0.08, 0.29, 0.24],
    [0.14, 0.3, -0.22],
    [-0.26, 0.27, -0.15],
  ];

  return (
    <group position={position} scale={scale}>
      {[-0.18, 0, 0.18].map((x, index) => (
        <mesh
          position={[x, 0.2 + index * 0.02, index % 2 ? 0.04 : -0.03]}
          scale={[1, 0.8, 1]}
          castShadow
          receiveShadow
          key={x}
        >
          <sphereGeometry args={[0.26, 16, 12]} />
          <meshStandardMaterial color={index === 1 ? "#557451" : "#67835d"} roughness={1} />
        </mesh>
      ))}
      {blooms.map((position, index) => (
        <Blossom
          key={`${position[0]}-${position[2]}`}
          position={position}
          scale={0.8 + noise(seed * 41 + index) * 0.35}
          petalColor={bloom}
        />
      ))}
    </group>
  );
}

/**
 * Window box planter: a tapered terracotta pot (a real pot silhouette, not a
 * rounded cube) trailing proper flowers instead of two stretched spheres.
 */
export function WindowPlanter({ x }: { x: number }) {
  const flowers: { offset: number; bloom: string }[] = [
    { offset: -0.5, bloom: "#d9a3a0" },
    { offset: -0.24, bloom: "#ead9b6" },
    { offset: 0, bloom: "#c7b8d2" },
    { offset: 0.24, bloom: "#d9a3a0" },
    { offset: 0.5, bloom: "#ead9b6" },
  ];

  return (
    <group position={[x, -0.88, 1.98]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.6, 0.5, 0.28, 16]} />
        <meshStandardMaterial color="#8a5f43" roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.63, 0.6, 0.05, 16]} />
        <meshStandardMaterial color="#765138" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.13, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.02, 16]} />
        <meshStandardMaterial color="#3c3126" roughness={1} />
      </mesh>
      {flowers.map((flower, index) => (
        <FlowerStem
          key={flower.offset}
          position={[flower.offset, 0.13, 0]}
          height={0.17 + noise(index + x * 13) * 0.06}
          bloomColor={flower.bloom}
          leanSeed={index + x * 31}
        />
      ))}
    </group>
  );
}

function GardenBench({ position, woodMap }: { position: Position; woodMap: CanvasTexture }) {
  return (
    <group position={position} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 0.36, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.05, 0.4]} />
        <meshStandardMaterial map={woodMap} color="#8d7a63" roughness={0.88} />
      </mesh>
      <mesh position={[0, 0.55, -0.16]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.4, 0.05]} />
        <meshStandardMaterial map={woodMap} color="#8d7a63" roughness={0.88} />
      </mesh>
      {[-0.46, 0.46].map((x) =>
        [-0.16, 0.16].map((z) => (
          <mesh position={[x, 0.18, z]} castShadow key={`${x}-${z}`}>
            <boxGeometry args={[0.05, 0.36, 0.05]} />
            <meshStandardMaterial color="#344238" roughness={0.9} />
          </mesh>
        )),
      )}
    </group>
  );
}

function PathLantern({ position }: { position: Position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.045, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.09, 0.1, 0.09, 16]} />
        <meshStandardMaterial color="#243028" metalness={0.32} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.038, 0.72, 10]} />
        <meshStandardMaterial color="#243028" metalness={0.32} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.82, 0]} castShadow>
        <boxGeometry args={[0.16, 0.22, 0.16]} />
        <meshPhysicalMaterial
          color="#ffd9a0"
          emissive="#ffb765"
          emissiveIntensity={0.9}
          roughness={0.25}
          transmission={0.35}
          envMapIntensity={1.2}
        />
      </mesh>
      <mesh position={[0, 0.955, 0]} castShadow>
        <coneGeometry args={[0.13, 0.14, 4]} />
        <meshStandardMaterial color="#243028" roughness={0.7} />
      </mesh>
      <pointLight position={[0, 0.82, 0]} color="#ffb765" intensity={0.55} distance={2.6} decay={2} />
    </group>
  );
}

/**
 * Foundation planting: a mulch bed hugging the house's footprint so the
 * platform reads as grown into the garden rather than a box set down on top
 * of it. Also the last line of defense against any hairline seam between
 * the plinth and the lawn plane.
 */
function FoundationBed({ mobile }: { mobile: boolean }) {
  const edge: { x: number; z: number; rotationY?: number }[] = [
    { x: -3.35, z: 1.05 },
    { x: -3.35, z: -0.6 },
    { x: 3.35, z: 1.05 },
    { x: 3.35, z: -0.6 },
    { x: -1.9, z: 1.98, rotationY: Math.PI / 2 },
    { x: 1.9, z: 1.98, rotationY: Math.PI / 2 },
  ];

  return (
    <group>
      <mesh position={[0, 0.008, 0.3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6.9, 4.1]} />
        <meshStandardMaterial color="#4a3a2c" roughness={1} />
      </mesh>
      {edge.map((spot, index) => (
        <FlowerClump
          key={`${spot.x}-${spot.z}`}
          position={[spot.x, 0.01, spot.z]}
          scale={0.42}
          seed={index + 9}
          bloom={["#d9a3a0", "#ead9b6", "#c7b8d2"][index % 3]}
        />
      ))}
      {!mobile && (
        <>
          <FlowerClump position={[-2.55, 0.01, 1.75]} scale={0.36} seed={21} bloom="#d8c1d7" />
          <FlowerClump position={[2.55, 0.01, 1.75]} scale={0.36} seed={22} bloom="#d9a3a0" />
        </>
      )}
      <PathLantern position={[-1.55, 0.006, 2.6]} />
      <PathLantern position={[1.55, 0.006, 2.6]} />
    </group>
  );
}

/**
 * Soft, low silhouettes scattered far around the lawn — a distant hedgerow
 * and a couple of rolling rises — so the horizon reads as open countryside
 * meeting the sky instead of lawn ending in empty fog.
 */
function MeadowHorizon({ mobile }: { mobile: boolean }) {
  const clumps = useMemo(() => {
    const count = mobile ? 10 : 18;
    return Array.from({ length: count }, (_, index) => {
      const angle = (index / count) * Math.PI * 2 + noise(index + 400) * 0.4;
      const radius = 24 + noise(index + 500) * 14;
      return {
        x: Math.sin(angle) * radius,
        z: -6 + Math.cos(angle) * radius * 0.6,
        scale: 1.1 + noise(index + 600) * 1.6,
        tone: noise(index + 700) > 0.5 ? "#7d9268" : "#69805a",
      };
    });
  }, [mobile]);

  const hills = useMemo(
    () => [
      { x: -20, z: -18, radius: 16, tone: "#93a97c" },
      { x: 16, z: -22, radius: 20, tone: "#8ba171" },
      { x: 0, z: -30, radius: 24, tone: "#9cb086" },
      { x: -32, z: 4, radius: 18, tone: "#8ba171" },
      { x: 34, z: 8, radius: 20, tone: "#93a97c" },
    ],
    [],
  );

  return (
    <group>
      {hills.map((hill, index) => (
        <mesh position={[hill.x, -0.42, hill.z]} scale={[1, 0.4, 1]} receiveShadow key={index}>
          <sphereGeometry args={[hill.radius, 20, 12]} />
          <meshStandardMaterial color={hill.tone} roughness={1} />
        </mesh>
      ))}
      {clumps.map((clump, index) => (
        <group position={[clump.x, 0, clump.z]} scale={clump.scale} key={index}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.14, 1, 8]} />
            <meshStandardMaterial color="#5f4c3a" roughness={1} />
          </mesh>
          <mesh position={[0, 1.15, 0]} scale={[1, 0.85, 1]} castShadow>
            <sphereGeometry args={[0.62, 12, 9]} />
            <meshStandardMaterial color={clump.tone} roughness={1} />
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
    <group position={[houseX, GROUND_Y, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial map={groundMap} bumpMap={groundMap} bumpScale={0.035} color="#78906d" roughness={1} />
      </mesh>

      <GrassField mobile={mobile} />
      <FoundationBed mobile={mobile} />
      <MeadowHorizon mobile={mobile} />

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

      <GardenTree position={[-4.65, 0, -0.65]} scale={0.86} woodMap={woodMap} seed={1} />
      <GardenTree position={[5.15, 0, 0.45]} scale={1.02} woodMap={woodMap} warm seed={2} />
      {!mobile && <GardenTree position={[7.7, 0, 9.8]} scale={1.18} woodMap={woodMap} seed={3} />}

      <FlowerClump position={[-3.88, 0, 1.28]} scale={0.82} seed={4} bloom="#d9b4ad" />
      <FlowerClump position={[3.9, 0, 1.18]} scale={0.86} seed={5} bloom="#ead9b6" />
      <FlowerClump position={[-4.25, 0, 3.12]} scale={0.66} seed={6} bloom="#c7b8d2" />
      <FlowerClump position={[4.55, 0, 3.4]} scale={0.7} seed={7} bloom="#d8c1d7" />

      {!mobile && <GardenBench position={[3.2, 0.006, 4.6]} woodMap={woodMap} />}
    </group>
  );
}
