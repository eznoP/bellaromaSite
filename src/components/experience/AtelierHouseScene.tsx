"use client";

import { ContactShadows, Environment, Lightformer, RoundedBox } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Bloom, BrightnessContrast, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  DoubleSide,
  Group,
  MathUtils,
  PointLight,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
} from "three";
import { GardenEnvironment, WindowPlanter } from "./GardenEnvironment";

type ProgressRef = { current: { value: number } };
type InvalidateRef = { current: (() => void) | null };
type PatternKind = "linen" | "roof" | "wood" | "ground";

const ROOF_RISE = 1.7;
const ROOF_HALF_WIDTH = 3.35;
const ROOF_PITCH = Math.atan(ROOF_RISE / ROOF_HALF_WIDTH);
const ROOF_SLOPE_LENGTH = Math.hypot(ROOF_HALF_WIDTH, ROOF_RISE);

function range(value: number, start: number, end: number) {
  const normalized = MathUtils.clamp((value - start) / (end - start), 0, 1);
  return normalized * normalized * (3 - 2 * normalized);
}

function seededNoise(index: number) {
  const value = Math.sin(index * 91.173 + 17.31) * 43758.5453;
  return value - Math.floor(value);
}

function createPatternTexture(kind: PatternKind, anisotropy: number) {
  const size = kind === "ground" ? 1024 : 512;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = size;
  canvas.height = size;

  if (!context) throw new Error("Nao foi possivel criar as texturas da casa.");

  context.fillStyle = kind === "ground" ? "#8fa57f" : "#f5f2ed";
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
    for (let index = 0; index < 1800; index += 1) {
      const x = seededNoise(index) * size;
      const y = seededNoise(index + 240) * size;
      const radius = 0.5 + seededNoise(index + 480) * 2.8;
      context.fillStyle = index % 3 === 0
        ? `rgba(42, 69, 43, ${0.08 + seededNoise(index + 720) * 0.13})`
        : `rgba(220, 226, 196, ${0.035 + seededNoise(index + 720) * 0.08})`;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
    context.lineWidth = 1;
    for (let index = 0; index < 900; index += 1) {
      const x = seededNoise(index + 1900) * size;
      const y = seededNoise(index + 2400) * size;
      const length = 3 + seededNoise(index + 2900) * 10;
      context.strokeStyle = `rgba(38, 73, 40, ${0.08 + seededNoise(index + 3400) * 0.16})`;
      context.beginPath();
      context.moveTo(x, y);
      context.quadraticCurveTo(x + length * 0.35, y - length * 0.55, x + length * 0.12, y - length);
      context.stroke();
    }
  }

  const texture = new CanvasTexture(canvas);
  const repeat = kind === "ground" ? 34 : kind === "roof" ? 4 : 3;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  return texture;
}

function createSkyTexture(anisotropy: number) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = 1024;
  canvas.height = 1024;

  if (!context) throw new Error("Nao foi possivel criar o fundo do ceu.");

  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#537fa3");
  gradient.addColorStop(0.45, "#8fbdd2");
  gradient.addColorStop(0.78, "#dce4d0");
  gradient.addColorStop(1, "#f4ead8");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Distant prairie: a soft, layered horizon of rolling fields so the sky
  // doesn't just end in empty gradient — it reads as open countryside
  // meeting the house's own garden.
  const horizonY = canvas.height * 0.755;
  const farHills = [
    { y: horizonY - 34, tone: "rgba(191, 205, 170, 0.85)", amplitude: 20, frequency: 3.2 },
    { y: horizonY - 14, tone: "rgba(163, 187, 143, 0.9)", amplitude: 26, frequency: 2.4 },
    { y: horizonY + 6, tone: "rgba(139, 166, 116, 0.95)", amplitude: 22, frequency: 4.1 },
  ];
  farHills.forEach((layer, layerIndex) => {
    context.fillStyle = layer.tone;
    context.beginPath();
    context.moveTo(0, canvas.height);
    context.lineTo(0, layer.y);
    for (let x = 0; x <= canvas.width; x += 16) {
      const t = x / canvas.width;
      const wobble =
        Math.sin(t * Math.PI * layer.frequency + layerIndex * 2.1) * layer.amplitude +
        Math.sin(t * Math.PI * layer.frequency * 2.7 + layerIndex) * layer.amplitude * 0.35;
      context.lineTo(x, layer.y + wobble);
    }
    context.lineTo(canvas.width, canvas.height);
    context.closePath();
    context.fill();
  });

  const sun = context.createRadialGradient(760, 205, 6, 760, 205, 200);
  sun.addColorStop(0, "rgba(255, 240, 200, 0.95)");
  sun.addColorStop(0.18, "rgba(255, 216, 158, 0.4)");
  sun.addColorStop(1, "rgba(255, 216, 158, 0)");
  context.fillStyle = sun;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let cloud = 0; cloud < 22; cloud += 1) {
    const centerX = seededNoise(cloud + 5000) * canvas.width;
    const centerY = 170 + seededNoise(cloud + 5100) * 420;
    const cloudWidth = 70 + seededNoise(cloud + 5200) * 150;
    const cloudGradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, cloudWidth);
    cloudGradient.addColorStop(0, "rgba(255,255,255,0.15)");
    cloudGradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = cloudGradient;
    context.fillRect(centerX - cloudWidth, centerY - cloudWidth, cloudWidth * 2, cloudWidth * 2);
  }

  for (let index = 0; index < 220; index += 1) {
    const x = seededNoise(index + 900) * canvas.width;
    const width = 0.4 + seededNoise(index + 1100) * 1.4;
    context.strokeStyle = `rgba(255, 255, 255, ${0.012 + seededNoise(index + 1300) * 0.025})`;
    context.lineWidth = width;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + seededNoise(index + 1500) * 4, canvas.height);
    context.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  return texture;
}

function Window({ x }: { x: number }) {
  return (
    <group position={[x, 0.05, 1.735]}>
      {/* Outer casing board, sits closer to the wall than the sash so the
          window reads as trimmed-out rather than punched flat into the wall. */}
      {[
        { args: [1.66, 0.115, 0.06] as const, position: [0, 0.85, -0.035] as const },
        { args: [1.66, 0.115, 0.06] as const, position: [0, -0.85, -0.035] as const },
        { args: [0.115, 1.62, 0.06] as const, position: [-0.77, 0, -0.035] as const },
        { args: [0.115, 1.62, 0.06] as const, position: [0.77, 0, -0.035] as const },
      ].map((strip, index) => (
        <mesh position={strip.position} castShadow receiveShadow key={index}>
          <boxGeometry args={strip.args} />
          <meshStandardMaterial color="#f1e6d2" roughness={0.82} envMapIntensity={0.6} />
        </mesh>
      ))}
      <mesh castShadow>
        <boxGeometry args={[1.4, 1.58, 0.1]} />
        <meshStandardMaterial color="#344238" roughness={0.78} />
      </mesh>
      <mesh position={[0, 0, 0.075]}>
        <boxGeometry args={[1.1, 1.28, 0.045]} />
        <meshPhysicalMaterial
          color="#c3d8db"
          emissive="#8fb0b4"
          emissiveIntensity={0.07}
          metalness={0.02}
          roughness={0.09}
          envMapIntensity={1.6}
          clearcoat={0.6}
          clearcoatRoughness={0.2}
        />
      </mesh>
      <mesh position={[0, 0, 0.115]}>
        <boxGeometry args={[0.065, 1.26, 0.04]} />
        <meshStandardMaterial color="#fdf6ed" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.115]}>
        <boxGeometry args={[1.08, 0.065, 0.04]} />
        <meshStandardMaterial color="#fdf6ed" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.83, 0.025]} castShadow>
        <boxGeometry args={[1.5, 0.11, 0.24]} />
        <meshStandardMaterial color="#596d5b" roughness={0.86} />
      </mesh>
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
    <group position={position} scale={scale}>
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
      <mesh castShadow>
        <boxGeometry args={[width, 0.045, 0.26]} />
        <meshStandardMaterial map={woodMap} color="#8d7a63" roughness={0.88} />
      </mesh>
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
      <mesh position={[-0.27, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.085, 0.085, 0.022, 14]} />
        <meshStandardMaterial color="#dccfc0" roughness={0.98} />
      </mesh>
      <mesh position={[0.27, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
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
  const { camera, gl, invalidate, size } = useThree();
  const anisotropy = Math.max(1, Math.min(8, gl.capabilities.getMaxAnisotropy()));

  const textures = useMemo(
    () => ({
      wall: createPatternTexture("linen", anisotropy),
      roof: createPatternTexture("roof", anisotropy),
      wood: createPatternTexture("wood", anisotropy),
      ground: createPatternTexture("ground", anisotropy),
      sky: createSkyTexture(anisotropy),
    }),
    [anisotropy],
  );

  const gableShape = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(-3.1, 2);
    shape.lineTo(0, 3.7);
    shape.lineTo(3.1, 2);
    shape.closePath();
    return shape;
  }, []);

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
    const firstApproach = range(value, 0.08, 0.32);
    const doorApproach = range(value, 0.25, 0.61);
    const passage = range(value, 0.56, 0.82);
    const lateralApproach = range(value, 0.08, 0.42);
    const verticalApproach = range(value, 0.16, 0.48);
    const startZ = mobile ? 22.5 : portrait ? 20 : 15.4;
    const middleZ = mobile ? 15.6 : portrait ? 13.8 : 9.8;
    const startingTargetY = mobile ? 2.25 : portrait ? 2.8 : 0.9;
    const approachTargetY = MathUtils.lerp(startingTargetY, 0.05, verticalApproach);

    let cameraZ = MathUtils.lerp(startZ, middleZ, firstApproach);
    cameraZ = MathUtils.lerp(cameraZ, 4.8, doorApproach);
    cameraZ = MathUtils.lerp(cameraZ, 1.24, passage);

    camera.position.set(
      mobile ? 0 : MathUtils.lerp(0, houseX, lateralApproach),
      MathUtils.lerp(0.88, 0.18, passage),
      cameraZ,
    );
    camera.lookAt(
      mobile ? 0 : MathUtils.lerp(0, houseX, lateralApproach),
      MathUtils.lerp(approachTargetY, 0.08, passage),
      MathUtils.lerp(0, -1.34, passage),
    );

    if (house.current) {
      house.current.position.x = houseX;
      house.current.rotation.y = MathUtils.lerp(-0.04, 0, firstApproach);
    }

    if (door.current) {
      door.current.rotation.y = staticOpen
        ? Math.PI * 0.49
        : range(value, 0.31, 0.56) * Math.PI * 0.49;
    }

    if (interiorLight.current) {
      interiorLight.current.intensity = staticOpen
        ? 2.2
        : MathUtils.lerp(0.5, 3.1, range(value, 0.34, 0.74));
    }
  });

  const aspect = size.width / Math.max(size.height, 1);
  const mobile = size.width < 720;
  const portrait = !mobile && aspect < 0.9;
  const houseX = mobile ? 0 : portrait ? 1.3 : 1.65;

  return (
    <>
      <primitive attach="background" object={textures.sky} />
      <fog attach="fog" args={["#d9dfc7", 20, 52]} />
      <hemisphereLight args={["#dcecf4", "#56664f", 0.95]} />
      <ambientLight intensity={0.19} color="#fff3df" />
      <directionalLight
        castShadow
        color="#ffdca0"
        intensity={3.1}
        position={[-8, 12, 9]}
        shadow-mapSize={mobile ? [1024, 1024] : [2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6.5}
        shadow-camera-bottom={-4.5}
        shadow-camera-near={1}
        shadow-camera-far={26}
        shadow-bias={-0.00014}
        shadow-normalBias={0.016}
      />
      <directionalLight color="#8fb3c7" intensity={0.58} position={[8, 5, -7]} />
      {/* Low, warm front fill: keeps the house face and open doorway
          readable during the close-up passage instead of falling into flat
          silhouette against the key light. */}
      <directionalLight color="#ffe9c9" intensity={0.24} position={[0, 1.6, 12]} />
      <pointLight
        ref={interiorLight}
        color="#ffc06f"
        intensity={0.45}
        position={[houseX, 0.3, -1.15]}
        distance={8}
        decay={2}
      />
      <pointLight
        color="#ffd9a0"
        intensity={0.4}
        position={[houseX - 1.75, 1.1, -1.15]}
        distance={3.6}
        decay={2}
      />

      {/* Procedural studio environment: adds soft, brand-toned reflections to
          glass and metal without depending on an external HDRI file. */}
      <Environment resolution={256} background={false}>
        <Lightformer
          form="rect"
          intensity={2.2}
          color="#fff3df"
          position={[-6, 6, 6]}
          scale={[8, 5, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.1}
          color="#bcd6dd"
          position={[7, 3, -4]}
          scale={[6, 4, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="ring"
          intensity={0.8}
          color="#fdf6ed"
          position={[0, 4, 10]}
          scale={[5, 5, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={0.5}
          color="#4d604f"
          position={[0, -4, 2]}
          scale={[10, 4, 1]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      </Environment>

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
          <boxGeometry args={[6.2, 4, 0.2]} />
          <meshStandardMaterial map={textures.wall} color="#eee3d6" roughness={0.95} />
        </mesh>
        {/* Interior lining: a thin, warmer-toned skin on the inside face of
            the back wall so the shop reads as its own lit space through the
            door and windows, not just the exterior siding seen from behind. */}
        <mesh position={[0, 0.35, -1.495]} receiveShadow>
          <boxGeometry args={[5.9, 3.3, 0.02]} />
          <meshStandardMaterial map={textures.wall} color="#f6ecdd" roughness={0.92} />
        </mesh>

        {/* Corner boards: a thin trim strip where the front wall meets each
            side wall. Small detail, but it's what keeps flat facades from
            reading as a single flat-shaded box from the hero angle. */}
        {[-3.12, 3.12].map((x) => (
          <mesh position={[x, 0, 1.72]} castShadow receiveShadow key={x}>
            <boxGeometry args={[0.17, 4.08, 0.17]} />
            <meshStandardMaterial color="#f1e6d2" roughness={0.85} envMapIntensity={0.6} />
          </mesh>
        ))}

        <group position={[0, 0.02, -1.47]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.62, 2.18, 0.12]} />
            <meshStandardMaterial map={textures.wood} color="#4f6252" roughness={0.83} />
          </mesh>
          {/* Round gable window: a true disc rather than a heavily rounded
              box, so it reads as a deliberate porthole shape instead of a
              rectangle that lost its corners. */}
          <mesh position={[0, 0, 0.075]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
            <cylinderGeometry args={[0.69, 0.69, 0.075, 40]} />
            <meshStandardMaterial map={textures.wall} color="#c8b79f" roughness={0.96} />
          </mesh>
          <mesh position={[0, 0.05, 0.13]} castShadow>
            <torusGeometry args={[0.48, 0.045, 16, 64]} />
            <meshStandardMaterial map={textures.wood} color="#9c7751" roughness={0.82} />
          </mesh>
          <mesh position={[0, 0.05, 0.142]}>
            <circleGeometry args={[0.43, 48]} />
            <meshStandardMaterial color="#7f9476" roughness={0.96} />
          </mesh>
          {Array.from({ length: 7 }, (_, index) => {
            const angle = (index / 7) * Math.PI * 2;
            return (
              <mesh
                position={[Math.cos(angle) * 0.24, 0.05 + Math.sin(angle) * 0.24, 0.17]}
                rotation={[0, 0, angle]}
                scale={[0.75, 1.2, 0.55]}
                key={index}
              >
                <sphereGeometry args={[0.07, 14, 10]} />
                <meshStandardMaterial color={index % 2 ? "#e6d6bb" : "#d5b8ae"} roughness={0.92} />
              </mesh>
            );
          })}
        </group>

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
          <mesh position={[x, 0, 1.765]} castShadow key={x}>
            <boxGeometry args={[0.16, 4.04, 0.16]} />
            <meshStandardMaterial color="#b9aa98" roughness={0.94} />
          </mesh>
        ))}
        <mesh position={[0, -1.98, 1.76]} castShadow>
          <boxGeometry args={[6.2, 0.14, 0.18]} />
          <meshStandardMaterial color="#927e68" roughness={0.9} />
        </mesh>
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
            color="#5c6f5c"
            roughness={0.42}
            metalness={0.22}
            envMapIntensity={1.1}
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
            color="#5c6f5c"
            roughness={0.42}
            metalness={0.22}
            envMapIntensity={1.1}
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
        <WindowPlanter x={-2.05} />
        <WindowPlanter x={2.05} />

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
        <mesh position={[0, -1.87, 1.72]} receiveShadow>
          <boxGeometry args={[2.3, 0.1, 0.38]} />
          <meshStandardMaterial color="#9c8a76" roughness={0.9} />
        </mesh>

        {[0.55, -0.42, -1.38].map((y) => (
          <mesh position={[-1.0, y, 1.91]} castShadow key={y}>
            <cylinderGeometry args={[0.035, 0.035, 0.18, 12]} />
            <meshStandardMaterial color="#9b805d" metalness={0.34} roughness={0.48} />
          </mesh>
        ))}

        {/* Static door casing — sits outside the door's own group so it
            doesn't swing open with the door leaf. */}
        {[
          { args: [2.22, 0.13, 0.07] as const, position: [-0.02, 1.065, 1.7] as const },
          { args: [0.13, 2.95, 0.07] as const, position: [-1.065, -0.35, 1.7] as const },
          { args: [0.13, 2.95, 0.07] as const, position: [1.025, -0.35, 1.7] as const },
        ].map((strip, index) => (
          <mesh position={strip.position} castShadow receiveShadow key={index}>
            <boxGeometry args={strip.args} />
            <meshStandardMaterial color="#f1e6d2" roughness={0.82} envMapIntensity={0.6} />
          </mesh>
        ))}

        <group ref={door} position={[-1.0, -0.41, 1.825]}>
          <mesh position={[0.98, 0, 0]} castShadow>
            <boxGeometry args={[1.96, 2.82, 0.12]} />
            <meshStandardMaterial
              map={textures.wood}
              color="#778873"
              roughness={0.8}
            />
          </mesh>
          <mesh position={[0.98, 0.63, 0.085]}>
            <boxGeometry args={[1.5, 0.8, 0.045]} />
            <meshStandardMaterial color="#657762" roughness={0.88} />
          </mesh>
          <mesh position={[0.98, -0.63, 0.085]}>
            <boxGeometry args={[1.5, 0.8, 0.045]} />
            <meshStandardMaterial color="#657762" roughness={0.88} />
          </mesh>
          <mesh position={[1.7, -0.02, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 0.025, 18]} />
            <meshStandardMaterial
              color="#a3805a"
              metalness={0.82}
              roughness={0.24}
              envMapIntensity={1.5}
            />
          </mesh>
          <mesh position={[1.7, -0.02, 0.135]} castShadow>
            <sphereGeometry args={[0.085, 18, 18]} />
            <meshStandardMaterial
              color="#e2c398"
              metalness={0.88}
              roughness={0.18}
              envMapIntensity={1.6}
            />
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
        <ShelfBoard woodMap={textures.wood} x={-1.75} y={0.05} width={2.0} />
        <Bottle position={[-2.05, 0.98, -1.31]} />
        <Soap position={[-1.45, 0.86, -1.32]} color="#d9a98f" />
        <Soap position={[-1.08, 0.86, -1.29]} color="#a1bc98" />
        <FoldedStack position={[1.05, 1.43, -1.32]} />
        <Spool position={[1.68, 1.59, -1.3]} scale={0.5} threadColor="#a1bc98" />
        <RolledMat position={[2.28, 1.5, -1.31]} />
        {/* Thread-spool display row on the lower shelf: the kind of small,
            repeated retail product grouping that reads as an actual sewing
            atelier catalog rather than a couple of lonely props. */}
        {[
          { x: -2.55, color: "#c98f7a" },
          { x: -2.25, color: "#a1bc98" },
          { x: -1.95, color: "#e6d6bb" },
          { x: -1.65, color: "#8fa3b8" },
          { x: -1.35, color: "#d5b8ae" },
        ].map((spool) => (
          <Spool
            key={spool.x}
            position={[spool.x, 0.19, -1.3]}
            scale={0.42}
            threadColor={spool.color}
          />
        ))}
        <FoldedStack position={[-0.95, 0.13, -1.3]} />
        <RoundedBox
          args={[0.88, 0.88, 0.05]}
          position={[2.08, 0.18, -1.475]}
          radius={0.06}
          smoothness={3}
        >
          <meshStandardMaterial color="#778873" roughness={0.94} />
        </RoundedBox>
        <mesh position={[2.08, 0.18, -1.44]}>
          <torusGeometry args={[0.25, 0.022, 10, 36]} />
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

        {/* Porch string lights: a light catenary swag under the eave — a
            small, warm, low-cost detail that does a lot for "cozy". */}
        {Array.from({ length: 13 }, (_, index) => {
          const t = index / 12;
          const x = MathUtils.lerp(-2.75, 2.75, t);
          const sag = Math.sin(t * Math.PI) * 0.22;
          return (
            <mesh position={[x, 1.92 - sag, 1.88]} key={index}>
              <sphereGeometry args={[0.028, 8, 8]} />
              <meshStandardMaterial
                color="#ffe3ad"
                emissive="#ffc372"
                emissiveIntensity={1.4}
                roughness={0.4}
              />
            </mesh>
          );
        })}

      </group>

      <GardenEnvironment
        groundMap={textures.ground}
        woodMap={textures.wood}
        houseX={houseX}
        mobile={mobile}
      />

      {/* Soft ambient-occlusion-style contact shadow, sitting right at lawn
          level (the same GROUND_Y the garden's ground plane and the house's
          foundation slab both resolve to) so the platform reads as fused
          into the yard instead of floating a hair above it. */}
      <ContactShadows
        position={[houseX, -2.198, 0.4]}
        opacity={0.55}
        scale={22}
        blur={2.4}
        far={4.5}
        resolution={mobile ? 512 : 1024}
        color="#182619"
        frames={1}
      />

      {!mobile && (
        <EffectComposer enableNormalPass={false} multisampling={4}>
          <Bloom
            mipmapBlur
            luminanceThreshold={0.72}
            luminanceSmoothing={0.25}
            intensity={0.5}
            radius={0.55}
          />
          <BrightnessContrast brightness={0.015} contrast={0.07} />
          <Vignette eskil={false} offset={0.25} darkness={0.55} />
        </EffectComposer>
      )}
    </>
  );
}
