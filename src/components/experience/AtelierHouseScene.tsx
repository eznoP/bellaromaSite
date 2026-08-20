"use client";

import { ContactShadows, RoundedBox } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  CatmullRomCurve3,
  DoubleSide,
  Group,
  MathUtils,
  PointLight,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  Vector3,
} from "three";

type ProgressRef = { current: { value: number } };
type InvalidateRef = { current: (() => void) | null };
type PatternKind = "linen" | "roof" | "wood" | "ground";

const ROOF_RISE = 1.7;
const ROOF_HALF_WIDTH = 3.35;
const ROOF_PITCH = Math.atan(ROOF_RISE / ROOF_HALF_WIDTH);
const ROOF_SLOPE_LENGTH = Math.hypot(ROOF_HALF_WIDTH, ROOF_RISE);

const steppingStones = [
  { z: 2.25, width: 1.34, rotation: -0.04 },
  { z: 3.2, width: 1.48, rotation: 0.035 },
  { z: 4.25, width: 1.62, rotation: -0.025 },
  { z: 5.42, width: 1.8, rotation: 0.04 },
  { z: 6.72, width: 2.02, rotation: -0.03 },
];

function range(value: number, start: number, end: number) {
  const normalized = MathUtils.clamp((value - start) / (end - start), 0, 1);
  return normalized * normalized * (3 - 2 * normalized);
}

function seededNoise(index: number) {
  const value = Math.sin(index * 91.173 + 17.31) * 43758.5453;
  return value - Math.floor(value);
}

function createPatternTexture(kind: PatternKind) {
  const size = 256;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = size;
  canvas.height = size;

  if (!context) throw new Error("Nao foi possivel criar as texturas da casa.");

  context.fillStyle = kind === "ground" ? "#edf0e8" : "#f5f2ed";
  context.fillRect(0, 0, size, size);

  if (kind === "linen") {
    context.lineWidth = 1;
    for (let index = 0; index < 96; index += 1) {
      const position = seededNoise(index) * size;
      context.strokeStyle = `rgba(73, 66, 58, ${0.025 + seededNoise(index + 100) * 0.04})`;
      context.beginPath();
      context.moveTo(position, 0);
      context.lineTo(position + seededNoise(index + 200) * 3, size);
      context.stroke();
    }
    for (let y = 5; y < size; y += 7) {
      context.strokeStyle = "rgba(255, 255, 255, 0.16)";
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(size, y + 1);
      context.stroke();
    }
  }

  if (kind === "roof") {
    context.lineWidth = 2;
    for (let row = 0; row < 8; row += 1) {
      const y = row * 32;
      context.strokeStyle = "rgba(45, 55, 47, 0.2)";
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(size, y);
      context.stroke();

      const offset = row % 2 === 0 ? 0 : 24;
      for (let x = offset; x < size; x += 48) {
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x, y + 32);
        context.stroke();
      }
    }
    context.strokeStyle = "rgba(255, 255, 255, 0.13)";
    context.lineWidth = 1;
    for (let y = 4; y < size; y += 32) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(size, y);
      context.stroke();
    }
  }

  if (kind === "wood") {
    context.lineWidth = 1;
    for (let index = 0; index < 72; index += 1) {
      const x = seededNoise(index) * size;
      const bend = (seededNoise(index + 80) - 0.5) * 10;
      context.strokeStyle = `rgba(58, 48, 39, ${0.035 + seededNoise(index + 160) * 0.07})`;
      context.beginPath();
      context.moveTo(x, 0);
      context.bezierCurveTo(x + bend, 70, x - bend, 180, x + bend * 0.35, size);
      context.stroke();
    }
  }

  if (kind === "ground") {
    context.lineWidth = 1;
    for (let index = 0; index < 180; index += 1) {
      const x = seededNoise(index) * size;
      const y = seededNoise(index + 240) * size;
      const length = 2 + seededNoise(index + 480) * 6;
      context.strokeStyle = `rgba(47, 66, 48, ${0.04 + seededNoise(index + 720) * 0.08})`;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + length * 0.3, y - length);
      context.stroke();
    }
  }

  const texture = new CanvasTexture(canvas);
  const repeat = kind === "ground" ? 12 : kind === "roof" ? 4 : 3;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function createSkyTexture() {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = 512;
  canvas.height = 512;

  if (!context) throw new Error("Nao foi possivel criar o fundo do ceu.");

  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#6f9fbd");
  gradient.addColorStop(0.52, "#9fc4d6");
  gradient.addColorStop(1, "#cfddd9");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < 110; index += 1) {
    const x = seededNoise(index + 900) * canvas.width;
    const width = 0.4 + seededNoise(index + 1100) * 1.2;
    context.strokeStyle = `rgba(255, 255, 255, ${0.012 + seededNoise(index + 1300) * 0.025})`;
    context.lineWidth = width;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + seededNoise(index + 1500) * 4, canvas.height);
    context.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function Window({ x }: { x: number }) {
  return (
    <group position={[x, 0.05, 1.735]}>
      <RoundedBox args={[1.4, 1.58, 0.1]} radius={0.035} smoothness={3} castShadow>
        <meshStandardMaterial color="#344238" roughness={0.78} />
      </RoundedBox>
      <RoundedBox
        args={[1.1, 1.28, 0.045]}
        position={[0, 0, 0.075]}
        radius={0.025}
        smoothness={3}
      >
        <meshStandardMaterial
          color="#afcad0"
          emissive="#7f9fa3"
          emissiveIntensity={0.09}
          metalness={0.06}
          roughness={0.32}
        />
      </RoundedBox>
      <mesh position={[0, 0, 0.115]}>
        <boxGeometry args={[0.065, 1.26, 0.04]} />
        <meshStandardMaterial color="#fdf6ed" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.115]}>
        <boxGeometry args={[1.08, 0.065, 0.04]} />
        <meshStandardMaterial color="#fdf6ed" roughness={0.9} />
      </mesh>
      <RoundedBox
        args={[1.5, 0.11, 0.24]}
        position={[0, 0.83, 0.025]}
        radius={0.025}
        smoothness={3}
        castShadow
      >
        <meshStandardMaterial color="#596d5b" roughness={0.86} />
      </RoundedBox>
      <mesh position={[0, -0.82, 0.04]} castShadow>
        <boxGeometry args={[1.52, 0.12, 0.34]} />
        <meshStandardMaterial color="#596d5b" roughness={0.86} />
      </mesh>
    </group>
  );
}

function Spool({
  position,
  scale = 1,
  threadColor = "#dccfc0",
}: {
  position: [number, number, number];
  scale?: number;
  threadColor?: string;
}) {
  return (
    <group position={position} rotation={[Math.PI / 2, 0, 0]} scale={scale}>
      <mesh castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.52, 20]} />
        <meshStandardMaterial color={threadColor} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.32, 0.08, 20]} />
        <meshStandardMaterial color="#344238" roughness={0.82} />
      </mesh>
      <mesh position={[0, -0.3, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.32, 0.08, 20]} />
        <meshStandardMaterial color="#344238" roughness={0.82} />
      </mesh>
    </group>
  );
}

function GardenPlant({
  position,
  scale = 1,
  bloom = "#f1cbbf",
  detailed = true,
}: {
  position: [number, number, number];
  scale?: number;
  bloom?: string;
  detailed?: boolean;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.27, 0.35, 0.44, 12]} />
        <meshStandardMaterial color="#b99578" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.43, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.28, 0.045, 8, 20]} />
        <meshStandardMaterial color="#a27f65" roughness={0.94} />
      </mesh>
      {detailed && (
        <>
          <mesh position={[-0.08, 0.7, 0]} rotation={[0, 0, -0.2]}>
            <cylinderGeometry args={[0.025, 0.03, 0.62, 8]} />
            <meshStandardMaterial color="#526b52" roughness={1} />
          </mesh>
          <mesh position={[0.11, 0.72, -0.02]} rotation={[0, 0, 0.26]}>
            <cylinderGeometry args={[0.022, 0.028, 0.58, 8]} />
            <meshStandardMaterial color="#526b52" roughness={1} />
          </mesh>
        </>
      )}
      <mesh
        position={[-0.2, 0.72, 0.01]}
        rotation={[0, 0, -0.65]}
        scale={[0.55, 1, 0.35]}
      >
        <sphereGeometry args={[0.27, 12, 8]} />
        <meshStandardMaterial color="#5d7759" roughness={0.95} />
      </mesh>
      <mesh
        position={[0.2, 0.77, 0.02]}
        rotation={[0, 0, 0.7]}
        scale={[0.52, 1, 0.34]}
      >
        <sphereGeometry args={[0.29, 12, 8]} />
        <meshStandardMaterial color="#778873" roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.0, -0.02]}>
        <sphereGeometry args={[0.13, 12, 8]} />
        <meshStandardMaterial color={bloom} roughness={0.88} />
      </mesh>
      {detailed && (
        <>
          <mesh position={[-0.12, 0.96, 0.02]}>
            <sphereGeometry args={[0.09, 10, 8]} />
            <meshStandardMaterial color={bloom} roughness={0.88} />
          </mesh>
          <mesh position={[0.12, 0.96, 0.01]}>
            <sphereGeometry args={[0.09, 10, 8]} />
            <meshStandardMaterial color={bloom} roughness={0.88} />
          </mesh>
        </>
      )}
    </group>
  );
}

function Shrub({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[-0.26, 0.34, 0]}>
        <dodecahedronGeometry args={[0.46, 0]} />
        <meshStandardMaterial color="#6f8768" roughness={1} flatShading />
      </mesh>
      <mesh position={[0.25, 0.3, 0.05]}>
        <dodecahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial color="#84987a" roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 0.62, -0.04]}>
        <dodecahedronGeometry args={[0.38, 0]} />
        <meshStandardMaterial color="#5d7759" roughness={1} flatShading />
      </mesh>
    </group>
  );
}

function ShelfBoard({
  woodMap,
  x,
  y,
  width,
}: {
  woodMap: CanvasTexture;
  x: number;
  y: number;
  width: number;
}) {
  return (
    <group position={[x, y, -1.42]}>
      <RoundedBox
        args={[width, 0.045, 0.26]}
        radius={0.02}
        smoothness={3}
        castShadow
      >
        <meshStandardMaterial map={woodMap} color="#8d7a63" roughness={0.88} />
      </RoundedBox>
      <mesh position={[-width / 2 + 0.09, -0.16, 0.02]} castShadow>
        <boxGeometry args={[0.03, 0.33, 0.2]} />
        <meshStandardMaterial color="#344238" roughness={0.86} />
      </mesh>
      <mesh position={[width / 2 - 0.09, -0.16, 0.02]} castShadow>
        <boxGeometry args={[0.03, 0.33, 0.2]} />
        <meshStandardMaterial color="#344238" roughness={0.86} />
      </mesh>
    </group>
  );
}

function FoldedStack({
  position,
}: {
  position: [number, number, number];
}) {
  return (
    <group position={position}>
      <RoundedBox args={[0.6, 0.055, 0.42]} radius={0.02} smoothness={3} castShadow>
        <meshStandardMaterial color="#fdf6ed" roughness={0.96} />
      </RoundedBox>
      <RoundedBox
        args={[0.5, 0.055, 0.34]}
        position={[0, 0.06, 0]}
        rotation={[0, 0.05, 0]}
        radius={0.02}
        smoothness={3}
      >
        <meshStandardMaterial color="#dccfc0" roughness={0.96} />
      </RoundedBox>
      <RoundedBox
        args={[0.4, 0.05, 0.27]}
        position={[0, 0.115, 0]}
        rotation={[0, -0.07, 0]}
        radius={0.02}
        smoothness={3}
      >
        <meshStandardMaterial color="#a1bc98" roughness={0.96} />
      </RoundedBox>
    </group>
  );
}

function RolledMat({
  position,
}: {
  position: [number, number, number];
}) {
  return (
    <group position={position}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.085, 0.085, 0.54, 14]} />
        <meshStandardMaterial color="#c9b8a4" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0, -0.27]}>
        <cylinderGeometry args={[0.085, 0.085, 0.022, 14]} />
        <meshStandardMaterial color="#dccfc0" roughness={0.98} />
      </mesh>
      <mesh position={[0, 0, 0.27]}>
        <cylinderGeometry args={[0.085, 0.085, 0.022, 14]} />
        <meshStandardMaterial color="#dccfc0" roughness={0.98} />
      </mesh>
    </group>
  );
}

function Soap({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position} rotation={[0, 0.6, 0]} castShadow>
      <cylinderGeometry args={[0.085, 0.075, 0.075, 16]} />
      <meshStandardMaterial color={color} roughness={0.92} />
    </mesh>
  );
}

function Bottle({
  position,
}: {
  position: [number, number, number];
}) {
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.105, 0.115, 0.3, 16]} />
        <meshStandardMaterial color="#e9ece2" roughness={0.42} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.09, 12]} />
        <meshStandardMaterial color="#e9ece2" roughness={0.42} />
      </mesh>
      <mesh position={[0, 0.245, 0]} castShadow>
        <cylinderGeometry args={[0.056, 0.056, 0.035, 12]} />
        <meshStandardMaterial color="#5d6e5e" roughness={0.9} />
      </mesh>
    </group>
  );
}

export function AtelierHouseScene({
  progress,
  invalidateRef,
}: {
  progress: ProgressRef;
  invalidateRef: InvalidateRef;
}) {
  const house = useRef<Group>(null);
  const door = useRef<Group>(null);
  const interiorLight = useRef<PointLight>(null);
  const { camera, invalidate, size } = useThree();

  const textures = useMemo(
    () => ({
      wall: createPatternTexture("linen"),
      roof: createPatternTexture("roof"),
      wood: createPatternTexture("wood"),
      ground: createPatternTexture("ground"),
      sky: createSkyTexture(),
    }),
    [],
  );

  const gableShape = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(-3.1, 2);
    shape.lineTo(0, 3.7);
    shape.lineTo(3.1, 2);
    shape.closePath();
    return shape;
  }, []);

  const threadCurve = useMemo(
    () =>
      new CatmullRomCurve3([
        new Vector3(-3.62, -2.0, 1.45),
        new Vector3(-3.18, -1.99, 1.9),
        new Vector3(-2.55, -1.985, 2.08),
        new Vector3(-2.05, -1.98, 1.86),
        new Vector3(-1.58, -1.975, 1.96),
      ]),
    [],
  );

  useEffect(() => {
    invalidateRef.current = invalidate;
    return () => {
      invalidateRef.current = null;
    };
  }, [invalidate, invalidateRef]);

  useEffect(
    () => () => {
      Object.values(textures).forEach((texture) => texture.dispose());
    },
    [textures],
  );

  useFrame(() => {
    const staticOpen = progress.current.value < 0;
    const value = staticOpen ? 0 : MathUtils.clamp(progress.current.value, 0, 1);
    const aspect = size.width / Math.max(size.height, 1);
    const mobile = size.width < 720;
    const portrait = !mobile && aspect < 0.9;
    const houseX = mobile ? 0 : portrait ? 1.3 : 1.65;
    const firstApproach = range(value, 0.1, 0.34);
    const doorApproach = range(value, 0.28, 0.64);
    const passage = range(value, 0.62, 0.93);
    const lateralApproach = range(value, 0.08, 0.42);
    const verticalApproach = range(value, 0.16, 0.48);
    const startZ = mobile ? 21.5 : portrait ? 19 : 13.8;
    const middleZ = mobile ? 15 : portrait ? 13.3 : 9.1;
    const startingTargetY = mobile ? 2.25 : portrait ? 2.8 : 0.9;
    const approachTargetY = MathUtils.lerp(startingTargetY, 0.05, verticalApproach);

    let cameraZ = MathUtils.lerp(startZ, middleZ, firstApproach);
    cameraZ = MathUtils.lerp(cameraZ, 4.5, doorApproach);
    cameraZ = MathUtils.lerp(cameraZ, 0.25, passage);

    camera.position.set(
      mobile ? 0 : MathUtils.lerp(0, houseX, lateralApproach),
      MathUtils.lerp(0.72, -0.08, passage),
      cameraZ,
    );
    camera.lookAt(
      mobile ? 0 : MathUtils.lerp(0, houseX, lateralApproach),
      MathUtils.lerp(approachTargetY, -0.12, passage),
      MathUtils.lerp(0, -1.55, passage),
    );

    if (house.current) {
      house.current.position.x = houseX;
      house.current.rotation.y = MathUtils.lerp(-0.04, 0, firstApproach);
    }

    if (door.current) {
      door.current.rotation.y = staticOpen
        ? Math.PI * 0.49
        : range(value, 0.36, 0.61) * Math.PI * 0.49;
    }

    if (interiorLight.current) {
      interiorLight.current.intensity = staticOpen
        ? 2.2
        : MathUtils.lerp(0.45, 2.55, range(value, 0.38, 0.76));
    }
  });

  const aspect = size.width / Math.max(size.height, 1);
  const mobile = size.width < 720;
  const portrait = !mobile && aspect < 0.9;
  const houseX = mobile ? 0 : portrait ? 1.3 : 1.65;

  return (
    <>
      <primitive attach="background" object={textures.sky} />
      <fog attach="fog" args={["#bfd3d9", 16, 46]} />
      <hemisphereLight args={["#d9e8f6", "#71745d", 0.95]} />
      <ambientLight intensity={0.28} color="#fff7e9" />
      <directionalLight
        castShadow={!mobile}
        color="#ffe8c4"
        intensity={2.35}
        position={[-6, 9, 8]}
        shadow-mapSize={[512, 512]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-4}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-normalBias={0.035}
      />
      <pointLight
        ref={interiorLight}
        color="#ffc47e"
        intensity={0.45}
        position={[houseX, 0.2, -0.45]}
        distance={7}
        decay={2}
      />

      <group ref={house} position={[houseX, -0.15, 0]}>
        <mesh position={[-2.075, -0.5, 1.61]} castShadow receiveShadow>
          <boxGeometry args={[2.05, 3, 0.2]} />
          <meshStandardMaterial
            map={textures.wall}
            color="#dccfc0"
            roughness={0.94}
          />
        </mesh>
        <mesh position={[2.075, -0.5, 1.61]} castShadow receiveShadow>
          <boxGeometry args={[2.05, 3, 0.2]} />
          <meshStandardMaterial
            map={textures.wall}
            color="#dccfc0"
            roughness={0.94}
          />
        </mesh>
        <mesh position={[0, 1.5, 1.61]} castShadow receiveShadow>
          <boxGeometry args={[6.2, 1, 0.2]} />
          <meshStandardMaterial
            map={textures.wall}
            color="#dccfc0"
            roughness={0.94}
          />
        </mesh>
        <mesh position={[-3.0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 4, 3.4]} />
          <meshStandardMaterial
            map={textures.wall}
            color="#d3c4b4"
            roughness={0.96}
          />
        </mesh>
        <mesh position={[3.0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 4, 3.4]} />
          <meshStandardMaterial
            map={textures.wall}
            color="#d3c4b4"
            roughness={0.96}
          />
        </mesh>
        <mesh position={[0, 0, -1.6]} castShadow receiveShadow>
          <boxGeometry args={[6, 4, 0.2]} />
          <meshStandardMaterial
            map={textures.wall}
            color="#f0e7da"
            roughness={0.95}
          />
        </mesh>

        <mesh position={[0, 0, 1.715]} castShadow receiveShadow>
          <shapeGeometry args={[gableShape]} />
          <meshStandardMaterial
            map={textures.wall}
            color="#d5c6b6"
            roughness={0.95}
            side={DoubleSide}
          />
        </mesh>
        <mesh position={[0, 0, -1.715]} rotation={[0, Math.PI, 0]} receiveShadow>
          <shapeGeometry args={[gableShape]} />
          <meshStandardMaterial
            map={textures.wall}
            color="#d5c6b6"
            roughness={0.95}
            side={DoubleSide}
          />
        </mesh>

        {[-3.03, 3.03].map((x) => (
          <RoundedBox
            args={[0.16, 4.04, 0.16]}
            position={[x, 0, 1.765]}
            radius={0.025}
            smoothness={3}
            castShadow
            key={x}
          >
            <meshStandardMaterial color="#b9aa98" roughness={0.94} />
          </RoundedBox>
        ))}
        <RoundedBox
          args={[6.2, 0.14, 0.18]}
          position={[0, -1.98, 1.76]}
          radius={0.025}
          smoothness={3}
          castShadow
        >
          <meshStandardMaterial color="#927e68" roughness={0.9} />
        </RoundedBox>
        <mesh position={[0, 2.04, 1.77]} castShadow>
          <boxGeometry args={[6.12, 0.1, 0.15]} />
          <meshStandardMaterial color="#b9aa98" roughness={0.94} />
        </mesh>

        <group position={[0, 2.67, 1.81]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.31, 0.31, 0.07, 28]} />
            <meshStandardMaterial color="#4d604f" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0, 0.055]}>
            <torusGeometry args={[0.255, 0.038, 10, 32]} />
            <meshStandardMaterial color="#d8cab9" roughness={0.92} />
          </mesh>
          {[-0.09, 0, 0.09].map((y) => (
            <mesh position={[0, y, 0.07]} key={y}>
              <boxGeometry args={[0.3, 0.028, 0.025]} />
              <meshStandardMaterial color="#c6b6a4" roughness={0.94} />
            </mesh>
          ))}
        </group>

        <mesh
          position={[-1.675, 2.85, 0]}
          rotation={[0, 0, ROOF_PITCH]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[ROOF_SLOPE_LENGTH, 0.16, 4.05]} />
          <meshStandardMaterial
            map={textures.roof}
            color="#778873"
            roughness={0.88}
          />
        </mesh>
        <mesh
          position={[1.675, 2.85, 0]}
          rotation={[0, 0, -ROOF_PITCH]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[ROOF_SLOPE_LENGTH, 0.16, 4.05]} />
          <meshStandardMaterial
            map={textures.roof}
            color="#778873"
            roughness={0.88}
          />
        </mesh>
        <mesh position={[0, 3.72, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 4.16, 16]} />
          <meshStandardMaterial color="#596d5b" roughness={0.9} />
        </mesh>
        <mesh
          position={[-1.675, 2.85, 2.045]}
          rotation={[0, 0, ROOF_PITCH]}
          castShadow
        >
          <boxGeometry args={[ROOF_SLOPE_LENGTH, 0.1, 0.12]} />
          <meshStandardMaterial color="#4d604f" roughness={0.9} />
        </mesh>
        <mesh
          position={[1.675, 2.85, 2.045]}
          rotation={[0, 0, -ROOF_PITCH]}
          castShadow
        >
          <boxGeometry args={[ROOF_SLOPE_LENGTH, 0.1, 0.12]} />
          <meshStandardMaterial color="#4d604f" roughness={0.9} />
        </mesh>
        <mesh position={[-3.34, 2.0, 0]} castShadow>
          <boxGeometry args={[0.12, 0.2, 4.1]} />
          <meshStandardMaterial color="#4d604f" roughness={0.9} />
        </mesh>
        <mesh position={[3.34, 2.0, 0]} castShadow>
          <boxGeometry args={[0.12, 0.2, 4.1]} />
          <meshStandardMaterial color="#4d604f" roughness={0.9} />
        </mesh>
        {[-3.39, 3.39].map((x) => (
          <mesh position={[x, 1.93, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow key={x}>
            <cylinderGeometry args={[0.075, 0.075, 4.14, 12]} />
            <meshStandardMaterial color="#536653" roughness={0.82} metalness={0.08} />
          </mesh>
        ))}
        <mesh position={[3.34, -0.02, 1.79]} castShadow>
          <cylinderGeometry args={[0.065, 0.065, 3.82, 12]} />
          <meshStandardMaterial color="#536653" roughness={0.82} metalness={0.08} />
        </mesh>
        <mesh position={[3.34, -1.9, 1.96]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.065, 0.065, 0.36, 12]} />
          <meshStandardMaterial color="#536653" roughness={0.82} metalness={0.08} />
        </mesh>

        <mesh position={[2.05, 3.31, -0.36]} castShadow receiveShadow>
          <boxGeometry args={[0.58, 1.72, 0.66]} />
          <meshStandardMaterial color="#435146" roughness={0.96} />
        </mesh>
        {[2.82, 3.22, 3.62].map((y) => (
          <mesh position={[2.05, y, -0.025]} key={y}>
            <boxGeometry args={[0.54, 0.025, 0.025]} />
            <meshStandardMaterial color="#6d7a6c" roughness={1} />
          </mesh>
        ))}
        {!mobile && (
          <>
            <mesh position={[1.91, 3.02, -0.01]}>
              <boxGeometry args={[0.025, 0.35, 0.025]} />
              <meshStandardMaterial color="#6d7a6c" roughness={1} />
            </mesh>
            <mesh position={[2.19, 3.42, -0.01]}>
              <boxGeometry args={[0.025, 0.35, 0.025]} />
              <meshStandardMaterial color="#6d7a6c" roughness={1} />
            </mesh>
            <mesh position={[2.05, 4.08, -0.005]}>
              <boxGeometry args={[0.46, 0.1, 0.035]} />
              <meshStandardMaterial color="#243028" roughness={1} />
            </mesh>
          </>
        )}
        <mesh position={[2.05, 4.19, -0.36]} castShadow>
          <boxGeometry args={[0.74, 0.12, 0.82]} />
          <meshStandardMaterial color="#344238" roughness={0.92} />
        </mesh>
        <mesh
          position={[2.05, 2.66, -0.36]}
          rotation={[0, 0, -ROOF_PITCH]}
          receiveShadow
        >
          <boxGeometry args={[0.92, 0.06, 0.94]} />
          <meshStandardMaterial color="#7c887c" metalness={0.22} roughness={0.58} />
        </mesh>

        <Window x={-2.05} />
        <Window x={2.05} />

        <mesh position={[-1.08, -0.43, 1.78]} castShadow>
          <boxGeometry args={[0.14, 3.02, 0.16]} />
          <meshStandardMaterial map={textures.wood} color="#344238" roughness={0.85} />
        </mesh>
        <mesh position={[1.08, -0.43, 1.78]} castShadow>
          <boxGeometry args={[0.14, 3.02, 0.16]} />
          <meshStandardMaterial map={textures.wood} color="#344238" roughness={0.85} />
        </mesh>
        <mesh position={[0, 1.08, 1.78]} castShadow>
          <boxGeometry args={[2.3, 0.14, 0.16]} />
          <meshStandardMaterial map={textures.wood} color="#344238" roughness={0.85} />
        </mesh>
        <RoundedBox
          args={[2.3, 0.1, 0.38]}
          position={[0, -1.87, 1.72]}
          radius={0.025}
          smoothness={3}
          receiveShadow
        >
          <meshStandardMaterial color="#9c8a76" roughness={0.9} />
        </RoundedBox>

        {[0.55, -0.42, -1.38].map((y) => (
          <mesh position={[-1.0, y, 1.91]} castShadow key={y}>
            <cylinderGeometry args={[0.035, 0.035, 0.18, 12]} />
            <meshStandardMaterial color="#9b805d" metalness={0.34} roughness={0.48} />
          </mesh>
        ))}

        <group ref={door} position={[-1.0, -0.41, 1.825]}>
          <RoundedBox
            args={[1.96, 2.82, 0.12]}
            position={[0.98, 0, 0]}
            radius={0.045}
            smoothness={4}
            castShadow
          >
            <meshStandardMaterial
              map={textures.wood}
              color="#778873"
              roughness={0.8}
            />
          </RoundedBox>
          <RoundedBox
            args={[1.5, 0.8, 0.045]}
            position={[0.98, 0.63, 0.085]}
            radius={0.025}
            smoothness={3}
          >
            <meshStandardMaterial color="#657762" roughness={0.88} />
          </RoundedBox>
          <RoundedBox
            args={[1.5, 0.8, 0.045]}
            position={[0.98, -0.63, 0.085]}
            radius={0.025}
            smoothness={3}
          >
            <meshStandardMaterial color="#657762" roughness={0.88} />
          </RoundedBox>
          <mesh position={[1.7, -0.02, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 0.025, 18]} />
            <meshStandardMaterial color="#8e7352" metalness={0.38} roughness={0.42} />
          </mesh>
          <mesh position={[1.7, -0.02, 0.135]} castShadow>
            <sphereGeometry args={[0.085, 18, 18]} />
            <meshStandardMaterial color="#d8b98f" metalness={0.5} roughness={0.32} />
          </mesh>
          <mesh position={[1.7, -0.24, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.025, 12]} />
            <meshStandardMaterial color="#243028" metalness={0.18} roughness={0.55} />
          </mesh>
          <mesh position={[1.7, -0.285, 0.12]}>
            <boxGeometry args={[0.026, 0.075, 0.025]} />
            <meshStandardMaterial color="#243028" metalness={0.18} roughness={0.55} />
          </mesh>
        </group>

        <mesh position={[0, -1.96, 0]} receiveShadow castShadow>
          <boxGeometry args={[6.28, 0.18, 3.55]} />
          <meshStandardMaterial color="#9a8b78" roughness={0.96} />
        </mesh>
        <mesh position={[0, -1.84, -0.02]} receiveShadow>
          <boxGeometry args={[5.78, 0.08, 3.16]} />
          <meshStandardMaterial
            map={textures.wood}
            color="#c4aa8c"
            roughness={0.88}
          />
        </mesh>
        <RoundedBox
          args={[1.52, 0.035, 2.35]}
          position={[0, -1.785, -0.15]}
          radius={0.05}
          smoothness={3}
          receiveShadow
        >
          <meshStandardMaterial color="#a1bc98" roughness={0.96} />
        </RoundedBox>

        <ShelfBoard woodMap={textures.wood} x={-1.75} y={0.78} width={2.0} />
        <ShelfBoard woodMap={textures.wood} x={1.7} y={1.38} width={2.2} />
        <Bottle position={[-2.05, 0.83, -1.31]} />
        <Soap position={[-1.45, 0.83, -1.32]} color="#d9a98f" />
        <Soap position={[-1.08, 0.83, -1.29]} color="#a1bc98" />
        <FoldedStack position={[1.05, 1.43, -1.32]} />
        <Spool position={[1.62, 1.43, -1.3]} scale={0.5} threadColor="#a1bc98" />
        <RolledMat position={[2.25, 1.43, -1.33]} />
        <RoundedBox
          args={[1.18, 1.18, 0.05]}
          position={[0, 0.03, -1.475]}
          radius={0.06}
          smoothness={3}
        >
          <meshStandardMaterial color="#778873" roughness={0.94} />
        </RoundedBox>
        <mesh position={[0, 0.03, -1.44]}>
          <torusGeometry args={[0.33, 0.025, 10, 36]} />
          <meshStandardMaterial color="#fdf6ed" roughness={0.9} />
        </mesh>

        <mesh position={[0.78, 1.35, 1.76]}>
          <sphereGeometry args={[0.12, 16, 12]} />
          <meshStandardMaterial
            color="#f7d39e"
            emissive="#ffbd69"
            emissiveIntensity={1.25}
            roughness={0.45}
          />
        </mesh>
        <mesh position={[0.78, 1.54, 1.72]} castShadow>
          <cylinderGeometry args={[0.11, 0.17, 0.18, 12]} />
          <meshStandardMaterial color="#344238" roughness={0.84} />
        </mesh>

        {steppingStones.map((stone) => (
          <RoundedBox
            args={[stone.width, 0.045, 0.68]}
            position={[0, -2.0, stone.z]}
            rotation={[0, stone.rotation, 0]}
            radius={0.06}
            smoothness={3}
            receiveShadow
            key={stone.z}
          >
            <meshStandardMaterial color="#d4c7b7" roughness={0.98} />
          </RoundedBox>
        ))}

        <GardenPlant position={[-3.58, -2.02, 1.15]} scale={0.95} detailed={!mobile} />
        <GardenPlant
          position={[3.58, -2.02, 1.0]}
          scale={0.88}
          bloom="#f4e2bb"
          detailed={!mobile}
        />
        <Shrub position={[-4.25, -2.02, 2.4]} scale={1.05} />
        <Shrub position={[4.15, -2.02, 2.6]} scale={0.9} />
        <Shrub position={[3.95, -2.02, -0.2]} scale={0.72} />

        <Spool position={[-3.65, -1.69, 1.45]} threadColor="#d7b6a5" />
        <mesh receiveShadow>
          <tubeGeometry args={[threadCurve, 56, 0.024, 6, false]} />
          <meshStandardMaterial color="#465648" roughness={0.74} />
        </mesh>
      </group>

      <mesh position={[houseX, -2.17, 1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 28]} />
        <meshStandardMaterial
          map={textures.ground}
          color="#a1bc98"
          roughness={1}
        />
      </mesh>
      <ContactShadows
        position={[houseX, -2.13, 0.2]}
        opacity={0.22}
        scale={15}
        blur={2.8}
        far={8}
        resolution={256}
        frames={1}
      />
    </>
  );
}
